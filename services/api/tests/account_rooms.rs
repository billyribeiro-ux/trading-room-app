//! Canonical account room lifecycle: real Axum, PostgreSQL, RLS, and audit transactions.

mod support;

use serde_json::json;
use support::{
    ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, ACME_ROOM, BETA_OWNER, BETA_ROOM, Harness,
};
use uuid::{Uuid, uuid};

const BETA_ENTERPRISE: Uuid = uuid!("b0000000-0000-4000-8000-000000000001");

#[tokio::test]
async fn room_list_requires_explicit_account_authority_and_never_crosses_tenants() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let path = format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms");

    let response = harness.get(&path, Some(&owner)).await;
    assert_eq!(response.status, 200, "{:?}", response.body);
    let rooms = response.body.as_array().expect("room array");
    assert!(rooms.iter().any(|room| room["id"] == ACME_ROOM.to_string()));
    assert!(
        !rooms
            .iter()
            .any(|room| room["id"].as_str() == Some(&BETA_ROOM.to_string()))
    );

    assert_eq!(harness.get(&path, Some(&member)).await.status, 404);
    assert_eq!(harness.get(&path, Some(&beta)).await.status, 404);
    assert_eq!(harness.get(&path, None).await.status, 401);
}

#[tokio::test]
async fn room_creation_is_atomic_idempotent_exact_and_audited_once() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let request_id = Uuid::new_v4();
    let path = format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms");
    let request = json!({ "requestId": request_id, "name": "  Authority Room  " });

    let first = harness.post_json(&path, &owner, &request).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    let room_id: Uuid = first.body["id"].as_str().expect("room id").parse().unwrap();
    assert_eq!(first.body["name"], "Authority Room");
    assert_eq!(first.body["state"], "open");
    assert_eq!(first.body["memberCount"], 1);
    assert_eq!(first.body["archivedAt"], serde_json::Value::Null);

    let replay = harness.post_json(&path, &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body["id"], first.body["id"]);
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.created'",
                &room_id.to_string(),
            )
            .await,
        1
    );

    assert_eq!(
        harness
            .post_json(
                &path,
                &owner,
                &json!({ "requestId": request_id, "name": "Different" }),
            )
            .await
            .status,
        400
    );
    assert_eq!(
        harness
            .post_json(
                &path,
                &owner,
                &json!({ "requestId": Uuid::new_v4(), "name": "Extra", "owner": true }),
            )
            .await
            .status,
        400
    );
    assert_eq!(
        harness
            .post_json(
                &path,
                &member,
                &json!({ "requestId": Uuid::new_v4(), "name": "Forbidden" }),
            )
            .await
            .status,
        404
    );

    let concurrent_request_id = Uuid::new_v4();
    let concurrent_request =
        json!({ "requestId": concurrent_request_id, "name": "Concurrent Retry" });
    let (concurrent_a, concurrent_b) = tokio::join!(
        harness.post_json(&path, &owner, &concurrent_request),
        harness.post_json(&path, &owner, &concurrent_request)
    );
    assert_eq!(concurrent_a.status, 200, "{:?}", concurrent_a.body);
    assert_eq!(concurrent_b.status, 200, "{:?}", concurrent_b.body);
    assert_eq!(concurrent_a.body["id"], concurrent_b.body["id"]);
    let concurrent_room_id: Uuid = concurrent_a.body["id"]
        .as_str()
        .expect("concurrent room id")
        .parse()
        .unwrap();
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.created'",
                &concurrent_room_id.to_string(),
            )
            .await,
        1
    );

    harness.drop_room(room_id).await;
    harness.drop_room(concurrent_room_id).await;
}

#[tokio::test]
async fn archive_uses_absolute_state_preserves_timestamp_and_refuses_cross_tenant_ids() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let created = harness
        .post_json(
            &format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms"),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "name": "Archive Contract" }),
        )
        .await
        .ok();
    let room_id: Uuid = created["id"].as_str().expect("room id").parse().unwrap();
    let path = format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}");

    let archived = harness
        .patch_json(&path, &owner, &json!({ "archived": true }))
        .await;
    assert_eq!(archived.status, 200, "{:?}", archived.body);
    let archived_at = archived.body["archivedAt"]
        .as_str()
        .expect("archive timestamp");
    let repeated = harness
        .patch_json(&path, &owner, &json!({ "archived": true }))
        .await;
    assert_eq!(repeated.body["archivedAt"], archived_at);

    let restored = harness
        .patch_json(&path, &owner, &json!({ "archived": false }))
        .await;
    assert_eq!(restored.status, 200, "{:?}", restored.body);
    assert_eq!(restored.body["archivedAt"], serde_json::Value::Null);
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name IN ('room.archived', 'room.restored')",
                &room_id.to_string(),
            )
            .await,
        2
    );

    assert_eq!(
        harness
            .patch_json(&path, &beta, &json!({ "archived": true }))
            .await
            .status,
        404
    );
    let beta_path = format!("/api/v1/accounts/{BETA_ENTERPRISE}/rooms/{room_id}");
    assert_eq!(
        harness
            .patch_json(&beta_path, &beta, &json!({ "archived": true }))
            .await
            .status,
        404
    );
    assert_eq!(
        harness
            .patch_json(
                &path,
                &owner,
                &json!({ "archived": true, "state": "closed" })
            )
            .await
            .status,
        400
    );

    harness.drop_room(room_id).await;
}
