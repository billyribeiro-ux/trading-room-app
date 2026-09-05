//! Canonical membership through real Axum, PostgreSQL 17, forced RLS, and account locks.

mod support;

use serde_json::{Value, json};
use support::{ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, BETA_OWNER, Harness};
use uuid::Uuid;

async fn create_room(harness: &Harness, owner: &str, name: &str) -> Uuid {
    let body = harness
        .post_json(
            &format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms"),
            owner,
            &json!({ "requestId": Uuid::new_v4(), "name": name }),
        )
        .await
        .ok();
    body["id"].as_str().expect("room id").parse().unwrap()
}

fn path(room_id: Uuid) -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/members")
}

fn control_path(room_id: Uuid) -> String {
    format!("/internal/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/members")
}

fn manage(member_id: Uuid, revision: i64, operation: Value) -> Value {
    json!({
        "requestId": Uuid::new_v4(),
        "targets": [{ "memberId": member_id, "expectedRevision": revision }],
        "operation": operation
    })
}

#[tokio::test]
async fn membership_reads_are_account_authorized_and_cross_tenant_opaque() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let room_id = create_room(&harness, &owner, "Membership Read").await;
    let endpoint = path(room_id);

    let response = harness.get(&endpoint, Some(&owner)).await;
    assert_eq!(response.status, 200, "{:?}", response.body);
    let rows = response.body.as_array().expect("member array");
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0]["role"], "owner");
    assert_eq!(rows[0]["hasPassword"], true);
    assert!(rows[0].get("passwordHash").is_none());
    assert_eq!(harness.get(&endpoint, Some(&member)).await.status, 404);
    assert_eq!(harness.get(&endpoint, Some(&beta)).await.status, 404);
    assert_eq!(harness.get(&endpoint, None).await.status, 401);

    harness.drop_room(room_id).await;
}

#[tokio::test]
async fn invitations_are_exactly_once_and_never_expose_credentials() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Membership Invite").await;
    let endpoint = path(room_id);
    let request_id = Uuid::new_v4();
    let email = format!("invite.{}@example.test", Uuid::new_v4().simple());
    let request = json!({
        "requestId": request_id,
        "email": email,
        "displayName": "  Invited Member  "
    });

    let first = harness.post_json(&endpoint, &owner, &request).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["changed"], 1);
    assert_eq!(first.body["members"][0]["displayName"], "Invited Member");
    assert_eq!(first.body["members"][0]["hasPassword"], false);
    assert!(first.body["members"][0].get("passwordHash").is_none());

    let replay = harness.post_json(&endpoint, &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, first.body);
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.members.invited'",
                &room_id.to_string(),
            )
            .await,
        1
    );

    let reused = json!({
        "requestId": request_id,
        "email": format!("other.{}@example.test", Uuid::new_v4().simple()),
        "displayName": "Other"
    });
    assert_eq!(
        harness.post_json(&endpoint, &owner, &reused).await.status,
        400
    );
    let overposted = json!({
        "requestId": Uuid::new_v4(),
        "email": "overpost@example.test",
        "displayName": "Overpost",
        "role": "owner"
    });
    assert_eq!(
        harness
            .post_json(&endpoint, &owner, &overposted)
            .await
            .status,
        400
    );

    let invited_user: Uuid = first.body["members"][0]["userId"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    harness.drop_room(room_id).await;
    harness.drop_profile_identity(invited_user).await;
}

#[tokio::test]
async fn revisions_owner_protection_and_runtime_access_share_one_state_model() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Membership State").await;
    let endpoint = path(room_id);
    let email = format!("state.{}@example.test", Uuid::new_v4().simple());
    let invited = harness
        .post_json(
            &endpoint,
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "email": email, "displayName": "State Member" }),
        )
        .await
        .ok();
    let member = &invited["members"][0];
    let member_id: Uuid = member["id"].as_str().unwrap().parse().unwrap();
    let user_id: Uuid = member["userId"].as_str().unwrap().parse().unwrap();

    let promoted = harness
        .patch_json(
            &endpoint,
            &owner,
            &manage(
                member_id,
                0,
                json!({ "type": "setRole", "role": "presenter" }),
            ),
        )
        .await;
    assert_eq!(promoted.status, 200, "{:?}", promoted.body);
    assert_eq!(promoted.body["members"][0]["role"], "presenter");
    assert_eq!(promoted.body["members"][0]["revision"], 1);
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &manage(member_id, 0, json!({ "type": "setTrial", "trial": true })),
            )
            .await
            .status,
        409,
        "a stale row must not overwrite a newer role"
    );

    let pending = harness
        .patch_json(
            &endpoint,
            &owner,
            &manage(
                member_id,
                1,
                json!({ "type": "setApproval", "status": "pending" }),
            ),
        )
        .await;
    assert_eq!(pending.status, 200, "{:?}", pending.body);
    assert_eq!(pending.body["members"][0]["isPaused"], true);
    let member_cookie = harness.cookie_for(user_id, "State Member");
    assert_eq!(
        harness
            .get(&format!("/api/v1/rooms/{room_id}"), Some(&member_cookie))
            .await
            .status,
        404,
        "pending membership must not resolve into runtime authority"
    );

    let owner_row = harness.get(&endpoint, Some(&owner)).await.ok()[0].clone();
    let owner_id: Uuid = owner_row["id"].as_str().unwrap().parse().unwrap();
    let owner_revision = owner_row["revision"].as_i64().unwrap();
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &manage(owner_id, owner_revision, json!({ "type": "remove" })),
            )
            .await
            .status,
        400
    );

    harness.drop_room(room_id).await;
    harness.drop_profile_identity(user_id).await;
}

#[tokio::test]
async fn cross_room_bulk_targets_people_and_skips_an_owner_membership() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let first_room = create_room(&harness, &owner, "Bulk One").await;
    let second_room = create_room(&harness, &owner, "Bulk Two").await;
    let email = format!("bulk.{}@example.test", Uuid::new_v4().simple());
    let first_invite = harness
        .post_json(
            &path(first_room),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "email": email, "displayName": "Bulk Member" }),
        )
        .await
        .ok();
    let second_invite = harness
        .post_json(
            &path(second_room),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "email": email, "displayName": "Bulk Member" }),
        )
        .await
        .ok();
    let first = &first_invite["members"][0];
    let user_id: Uuid = first["userId"].as_str().unwrap().parse().unwrap();
    let response = harness
        .patch_json(
            &path(first_room),
            &owner,
            &json!({
                "requestId": Uuid::new_v4(),
                "targets": [{ "memberId": first["id"], "expectedRevision": 0 }],
                "allRooms": true,
                "operation": { "type": "setBanned", "banned": true }
            }),
        )
        .await;
    assert_eq!(response.status, 200, "{:?}", response.body);
    assert_eq!(response.body["changed"], 2);
    assert_eq!(response.body["members"].as_array().unwrap().len(), 2);
    assert!(
        response.body["members"]
            .as_array()
            .unwrap()
            .iter()
            .all(|row| row["isBanned"] == true)
    );
    assert_ne!(first["id"], second_invite["members"][0]["id"]);

    harness.drop_room(first_room).await;
    harness.drop_room(second_room).await;
    harness.drop_profile_identity(user_id).await;
}

#[tokio::test]
async fn live_room_controls_require_the_service_secret_and_reauthorize_locked_memberships() {
    const SECRET: &str = "controller-room-membership-test-secret-32-bytes";
    let harness = Harness::start_with_controller_secret(SECRET).await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Live Room Control").await;
    let invited = harness
        .post_json(
            &path(room_id),
            &owner,
            &json!({
                "requestId": Uuid::new_v4(),
                "email": format!("control.{}@example.test", Uuid::new_v4().simple()),
                "displayName": "Control Target"
            }),
        )
        .await
        .ok();
    let target = invited["members"][0].clone();
    let target_id: Uuid = target["id"].as_str().unwrap().parse().unwrap();
    let target_user_id: Uuid = target["userId"].as_str().unwrap().parse().unwrap();
    let rows = harness.get(&path(room_id), Some(&owner)).await.ok();
    let owner_member = rows
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["role"] == "owner")
        .unwrap();
    let owner_member_id: Uuid = owner_member["id"].as_str().unwrap().parse().unwrap();
    let request_id = Uuid::new_v4();
    let request = json!({
        "requestId": request_id,
        "actorMemberId": owner_member_id,
        "target": { "memberId": target_id, "expectedRevision": 0 },
        "operation": {
            "type": "setPermissions",
            "publishMic": true,
            "publishScreen": false,
            "publishCam": true,
            "useAdminChat": false,
            "editNotes": true
        }
    });
    assert_eq!(
        harness
            .post_bearer(
                &control_path(room_id),
                "wrong-secret-with-at-least-32-bytes",
                &request,
            )
            .await
            .status,
        401
    );
    let committed = harness
        .post_bearer(&control_path(room_id), SECRET, &request)
        .await;
    assert_eq!(committed.status, 200, "{:?}", committed.body);
    assert_eq!(committed.body["changed"], 1);
    assert_eq!(committed.body["members"][0]["canPublishMic"], true);
    assert_eq!(committed.body["members"][0]["revision"], 1);
    let replay = harness
        .post_bearer(&control_path(room_id), SECRET, &request)
        .await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, committed.body);
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.members.permissions-updated'",
                &room_id.to_string(),
            )
            .await,
        1
    );

    let owner_ban = json!({
        "requestId": Uuid::new_v4(),
        "actorMemberId": target_id,
        "target": { "memberId": owner_member_id, "expectedRevision": 0 },
        "operation": { "type": "setBanned", "banned": true }
    });
    assert_eq!(
        harness
            .post_bearer(&control_path(room_id), SECRET, &owner_ban)
            .await
            .status,
        403,
        "a member cannot become a presenter merely because the service credential is valid"
    );

    harness.drop_room(room_id).await;
    harness.drop_profile_identity(target_user_id).await;
}
