//! Canonical badges through real Axum, PostgreSQL 17, forced RLS, and account locks.

mod support;

use serde_json::{Value, json};
use support::{ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, ACME_ROOM, BETA_OWNER, Harness};
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

fn badge_path() -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/badges")
}

fn badge_item_path(badge_id: Uuid) -> String {
    format!("{}/{badge_id}", badge_path())
}

fn assignment_path(room_id: Uuid) -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/badge-assignments")
}

fn membership_path(room_id: Uuid) -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/members")
}

fn create_request(request_id: Uuid, label: &str) -> Value {
    json!({
        "requestId": request_id,
        "label": label,
        "textColor": "#FFFFFF",
        "backgroundColor": "#112233",
        "emoji": " ⭐ ",
        "imageDataUrl": null,
        "darkThemeBadgeId": null,
        "autoAssignRoles": [" VIP ", "vip", "member-2"]
    })
}

#[tokio::test]
async fn badge_definitions_are_authorized_revisioned_bounded_and_exactly_once() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let endpoint = badge_path();

    assert_eq!(harness.get(&endpoint, Some(&member)).await.status, 404);
    assert_eq!(harness.get(&endpoint, Some(&beta)).await.status, 404);
    assert_eq!(harness.get(&endpoint, None).await.status, 401);

    let request_id = Uuid::new_v4();
    let request = create_request(request_id, "  Pro  ");
    let first = harness.post_json(&endpoint, &owner, &request).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["changed"], 1);
    assert_eq!(first.body["badges"][0]["label"], "Pro");
    assert_eq!(first.body["badges"][0]["emoji"], "⭐");
    assert_eq!(
        first.body["badges"][0]["autoAssignRoles"],
        json!(["member-2", "vip"])
    );
    let badge_id: Uuid = first.body["badges"][0]["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();

    let replay = harness.post_json(&endpoint, &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, first.body);
    assert_eq!(
        harness
            .post_json(&endpoint, &owner, &create_request(request_id, "Different"))
            .await
            .status,
        400
    );
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM audit_log \
                 WHERE room_id IS NULL AND event_name = 'badge.created' AND target_id = $1",
                |query| query.bind(badge_id),
            )
            .await,
        1,
        "replay and request-id mismatch must not duplicate the account audit"
    );
    assert_eq!(
        harness
            .post_json(
                &endpoint,
                &owner,
                &json!({
                    "requestId": Uuid::new_v4(), "label": "", "textColor": "#ffffff",
                    "backgroundColor": "#000000", "emoji": null,
                    "imageDataUrl": "data:image/svg+xml;base64,YQ==",
                    "darkThemeBadgeId": null, "autoAssignRoles": []
                }),
            )
            .await
            .status,
        400
    );

    let update = json!({
        "requestId": Uuid::new_v4(), "expectedRevision": 0,
        "label": "Elite", "textColor": "#abcdef", "backgroundColor": "rgba(1,0,0,0)",
        "emoji": null, "imageDataUrl": null, "darkThemeBadgeId": null,
        "autoAssignRoles": ["subscriber"]
    });
    let updated = harness
        .patch_json(&badge_item_path(badge_id), &owner, &update)
        .await;
    assert_eq!(updated.status, 200, "{:?}", updated.body);
    assert_eq!(updated.body["badges"][0]["revision"], 1);
    assert_eq!(updated.body["badges"][0]["label"], "Elite");
    assert_eq!(
        harness
            .patch_json(&badge_item_path(badge_id), &owner, &update)
            .await
            .status,
        200,
        "the identical request id replays even after the row revision advances"
    );
    let mut stale = update.clone();
    stale["requestId"] = json!(Uuid::new_v4());
    assert_eq!(
        harness
            .patch_json(&badge_item_path(badge_id), &owner, &stale)
            .await
            .status,
        409
    );
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM audit_log \
                 WHERE room_id IS NULL AND event_name = 'badge.updated' AND target_id = $1",
                |query| query.bind(badge_id),
            )
            .await,
        1,
        "only the committed definition update is audited"
    );

    let removed = harness
        .delete_json(
            &badge_item_path(badge_id),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 1 }),
        )
        .await;
    assert_eq!(removed.status, 200, "{:?}", removed.body);
    assert_eq!(removed.body["removedBadgeIds"], json!([badge_id]));
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM audit_log \
                 WHERE room_id IS NULL AND event_name = 'badge.deleted' AND target_id = $1",
                |query| query.bind(badge_id),
            )
            .await,
        1,
        "the account-scoped delete must commit one audit row"
    );

    let dark = harness
        .post_json(
            &endpoint,
            &owner,
            &create_request(Uuid::new_v4(), "Dark target"),
        )
        .await
        .ok();
    let dark_id: Uuid = dark["badges"][0]["id"].as_str().unwrap().parse().unwrap();
    let light = harness
        .post_json(
            &endpoint,
            &owner,
            &create_request(Uuid::new_v4(), "Light source"),
        )
        .await
        .ok();
    let light_id: Uuid = light["badges"][0]["id"].as_str().unwrap().parse().unwrap();
    let linked = harness
        .patch_json(
            &badge_item_path(light_id),
            &owner,
            &json!({
                "requestId": Uuid::new_v4(), "expectedRevision": 0,
                "label": "Light source", "textColor": "#ffffff", "backgroundColor": "#112233",
                "emoji": null, "imageDataUrl": null, "darkThemeBadgeId": dark_id,
                "autoAssignRoles": []
            }),
        )
        .await;
    assert_eq!(linked.status, 200, "{:?}", linked.body);
    let dark_removed = harness
        .delete_json(
            &badge_item_path(dark_id),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 0 }),
        )
        .await;
    assert_eq!(dark_removed.status, 200, "{:?}", dark_removed.body);
    assert_eq!(dark_removed.body["changed"], 2);
    assert_eq!(dark_removed.body["badges"][0]["id"], light_id.to_string());
    assert_eq!(dark_removed.body["badges"][0]["revision"], 2);
    assert_eq!(
        dark_removed.body["badges"][0]["darkThemeBadgeId"],
        Value::Null
    );
    harness
        .delete_json(
            &badge_item_path(light_id),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 2 }),
        )
        .await
        .ok();
}

#[tokio::test]
async fn assignments_cross_rooms_atomically_and_messages_keep_the_committed_snapshot() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let first_room = ACME_ROOM;
    let second_room = create_room(&harness, &owner, "Badge Two").await;
    let email = format!("badge.{}@example.test", Uuid::new_v4().simple());
    let first_invite = harness
        .post_json(
            &membership_path(first_room),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "email": email, "displayName": "Badge Member" }),
        )
        .await
        .ok();
    let second_invite = harness
        .post_json(
            &membership_path(second_room),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "email": email, "displayName": "Badge Member" }),
        )
        .await
        .ok();
    let first_member = &first_invite["members"][0];
    let first_member_id: Uuid = first_member["id"].as_str().unwrap().parse().unwrap();
    let user_id: Uuid = first_member["userId"].as_str().unwrap().parse().unwrap();
    let badge_response = harness
        .post_json(
            &badge_path(),
            &owner,
            &create_request(Uuid::new_v4(), "Cross-room"),
        )
        .await
        .ok();
    let badge_id: Uuid = badge_response["badges"][0]["id"]
        .as_str()
        .unwrap()
        .parse()
        .unwrap();
    let assignment_id = Uuid::new_v4();
    let assignment = json!({
        "requestId": assignment_id,
        "targets": [{ "memberId": first_member_id, "expectedRevision": 0 }],
        "allRooms": true,
        "operation": { "type": "setBadge", "badgeId": badge_id, "assigned": true }
    });
    let assigned = harness
        .post_json(&assignment_path(first_room), &owner, &assignment)
        .await;
    assert_eq!(assigned.status, 200, "{:?}", assigned.body);
    assert_eq!(assigned.body["changed"], 2);
    assert_eq!(assigned.body["members"].as_array().unwrap().len(), 2);
    assert!(
        assigned.body["members"]
            .as_array()
            .unwrap()
            .iter()
            .all(|member| member["badges"] == json!([badge_id.to_string()])
                && member["revision"] == 1)
    );
    let replay = harness
        .post_json(&assignment_path(first_room), &owner, &assignment)
        .await;
    assert_eq!(replay.body, assigned.body);

    let member_cookie = harness.cookie_for(user_id, "Badge Member");
    let channels = harness
        .get(
            &format!("/api/v1/rooms/{first_room}/channels"),
            Some(&member_cookie),
        )
        .await
        .ok();
    let channel_id = channels[0]["id"].as_str().unwrap();
    let message = harness
        .post_json(
            &format!("/api/v1/rooms/{first_room}/channels/{channel_id}/messages"),
            &member_cookie,
            &json!({ "body": "badge snapshot" }),
        )
        .await
        .ok();
    assert_eq!(message["badges"], json!([badge_id.to_string()]));

    let removed = harness
        .delete_json(
            &badge_item_path(badge_id),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 0 }),
        )
        .await;
    assert_eq!(removed.status, 200, "{:?}", removed.body);
    assert_eq!(removed.body["members"].as_array().unwrap().len(), 2);
    assert!(
        removed.body["members"]
            .as_array()
            .unwrap()
            .iter()
            .all(|member| member["badges"] == json!([]) && member["revision"] == 2)
    );
    let page = harness
        .get(
            &format!("/api/v1/rooms/{first_room}/channels/{channel_id}/messages"),
            Some(&member_cookie),
        )
        .await
        .ok();
    let historical = page["items"]
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == message["id"])
        .expect("created message remains in history");
    assert_eq!(historical["badges"], json!([badge_id.to_string()]));
    assert_ne!(first_member["id"], second_invite["members"][0]["id"]);

    harness.purge_message(message["id"].as_str().unwrap()).await;
    harness
        .patch_json(
            &membership_path(first_room),
            &owner,
            &json!({
                "requestId": Uuid::new_v4(),
                "targets": [{ "memberId": first_member_id, "expectedRevision": 2 }],
                "operation": { "type": "remove" }
            }),
        )
        .await
        .ok();
    harness.drop_room(second_room).await;
    harness.drop_profile_identity(user_id).await;
}
