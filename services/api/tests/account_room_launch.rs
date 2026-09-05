//! Final Gate 3 launch authority: real TCP, cookie auth, PostgreSQL RLS, visit lifecycle, and
//! service-authenticated logout close.

mod support;

use serde_json::json;
use support::{ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, BETA_OWNER, Harness};
use uuid::{Uuid, uuid};

const CONTROLLER_SECRET: &str = "room-launch-controller-secret-32-bytes";
const BETA_ENTERPRISE: Uuid = uuid!("b0000000-0000-4000-8000-000000000001");

#[tokio::test]
async fn launch_is_current_idempotent_tenant_bound_and_closes_on_logout() {
    let harness = Harness::start_with_controller_secret(CONTROLLER_SECRET).await;
    let owner = harness.cookie_for(ACME_OWNER, "stale token name");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let created = harness
        .post_json(
            &format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms"),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "name": "Launch Contract" }),
        )
        .await
        .ok();
    let room_id: Uuid = created["id"].as_str().expect("room id").parse().unwrap();
    let short_code = created["shortCode"].as_str().expect("short code");
    let path = format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/launch");
    let request_id = Uuid::new_v4();
    let request = json!({ "requestId": request_id });

    assert_eq!(
        harness.post_json(&path, &member, &request).await.status,
        404
    );
    assert_eq!(harness.post_json(&path, &beta, &request).await.status, 404);
    assert_eq!(
        harness
            .post_json(
                &format!("/api/v1/accounts/{BETA_ENTERPRISE}/rooms/{room_id}/launch"),
                &beta,
                &request,
            )
            .await
            .status,
        404
    );
    assert_eq!(
        harness
            .post_json(
                &path,
                &owner,
                &json!({ "requestId": request_id, "extra": true })
            )
            .await
            .status,
        400
    );

    // Current room standing is re-read even for a valid account administrator. Build an isolated
    // admin/member pair because the database correctly forbids pausing the room owner.
    let paused_admin = harness
        .create_profile_identity("Paused Admin", &json!({}), false)
        .await;
    harness
        .tenant_admin_execute(
            "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) VALUES ($1, $2, 'admin')",
            |query| query.bind(ACME_ENTERPRISE).bind(paused_admin),
        )
        .await;
    harness
        .tenant_admin_execute(
            "INSERT INTO room_members (enterprise_id, room_id, user_id, role, is_paused, approval_status) \
             VALUES ($1, $2, $3, 'member', true, 'approved')",
            |query| query.bind(ACME_ENTERPRISE).bind(room_id).bind(paused_admin),
        )
        .await;
    let paused_admin_cookie = harness.cookie_for(paused_admin, "Paused Admin");
    assert_eq!(
        harness
            .post_json(&path, &paused_admin_cookie, &request)
            .await
            .status,
        403
    );

    let first = harness
        .post_json_with_user_agent(
            &path,
            &owner,
            &request,
            "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/17.0 Mobile/15 Safari/604.1",
        )
        .await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["roomId"], room_id.to_string());
    assert_eq!(first.body["shortCode"], short_code);
    assert_eq!(first.body["userId"], ACME_OWNER.to_string());
    assert_eq!(first.body["email"], "owner@acme.test");
    assert_eq!(first.body["displayName"], "Ada Owner");
    let visit_id = first.body["visitId"].as_str().expect("visit id");

    let replay = harness.post_json(&path, &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body["visitId"], visit_id);
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM room_visit_sessions WHERE room_id = $1 AND launch_request_id = $2",
                |query| query.bind(room_id).bind(request_id),
            )
            .await,
        1
    );
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM room_visit_sessions WHERE room_id = $1 AND browser = 'Safari' AND is_mobile AND ip = '127.0.0.1'::inet",
                |query| query.bind(room_id),
            )
            .await,
        1
    );
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.launched'",
                &room_id.to_string(),
            )
            .await,
        1
    );

    let guest_request_id = Uuid::new_v4();
    let guest_path =
        format!("/internal/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/visits/guest-launch");
    assert_eq!(
        harness
            .post_bearer(
                &guest_path,
                "wrong-controller-secret",
                &json!({
                    "requestId": guest_request_id,
                    "email": "guest@example.test",
                    "displayName": "Report Guest"
                }),
            )
            .await
            .status,
        401
    );
    let guest = harness
        .post_bearer(
            &guest_path,
            CONTROLLER_SECRET,
            &json!({
                "requestId": guest_request_id,
                "email": "guest@example.test",
                "displayName": "Report Guest"
            }),
        )
        .await;
    assert_eq!(guest.status, 200, "{:?}", guest.body);
    assert_eq!(guest.body["email"], "guest@example.test");
    assert_eq!(guest.body["displayName"], "Report Guest");
    let guest_user_id: Uuid = guest.body["userId"]
        .as_str()
        .expect("canonical guest id")
        .parse()
        .unwrap();
    let guest_replay = harness
        .post_bearer(
            &guest_path,
            CONTROLLER_SECRET,
            &json!({
                "requestId": guest_request_id,
                "email": "guest@example.test",
                "displayName": "Report Guest"
            }),
        )
        .await;
    assert_eq!(guest_replay.body["visitId"], guest.body["visitId"]);

    // A genuine second launch repairs the abandoned first row and opens exactly one successor.
    let second = harness
        .post_json(&path, &owner, &json!({ "requestId": Uuid::new_v4() }))
        .await;
    assert_eq!(second.status, 200, "{:?}", second.body);
    assert_ne!(second.body["visitId"], visit_id);
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM room_visit_sessions \
                  WHERE room_id = $1 AND user_id = $2 AND exited_at IS NULL",
                |query| query.bind(room_id).bind(ACME_OWNER),
            )
            .await,
        1
    );

    let close_path =
        format!("/internal/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/visits/close");
    assert_eq!(
        harness
            .post_bearer(
                &close_path,
                "wrong-controller-secret",
                &json!({ "userId": ACME_OWNER })
            )
            .await
            .status,
        401
    );
    let closed = harness
        .post_bearer(
            &close_path,
            CONTROLLER_SECRET,
            &json!({ "userId": ACME_OWNER }),
        )
        .await;
    assert_eq!(closed.status, 200, "{:?}", closed.body);
    assert_eq!(closed.body, json!({ "closed": true }));
    assert_eq!(
        harness
            .post_bearer(
                &close_path,
                CONTROLLER_SECRET,
                &json!({ "userId": ACME_OWNER }),
            )
            .await
            .body,
        json!({ "closed": false })
    );

    let guest_closed = harness
        .post_bearer(
            &close_path,
            CONTROLLER_SECRET,
            &json!({ "email": "guest@example.test" }),
        )
        .await;
    assert_eq!(guest_closed.status, 200, "{:?}", guest_closed.body);
    assert_eq!(guest_closed.body, json!({ "closed": true }));
    assert_eq!(
        harness
            .post_bearer(
                &close_path,
                CONTROLLER_SECRET,
                &json!({ "userId": ACME_OWNER, "email": "guest@example.test" }),
            )
            .await
            .status,
        400
    );

    harness.drop_room(room_id).await;
    harness.drop_profile_identity(guest_user_id).await;
    harness
        .tenant_admin_execute(
            "DELETE FROM enterprise_memberships WHERE enterprise_id = $1 AND user_id = $2",
            |query| query.bind(ACME_ENTERPRISE).bind(paused_admin),
        )
        .await;
    harness.drop_profile_identity(paused_admin).await;
}
