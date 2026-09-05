//! Canonical room settings through real Axum, PostgreSQL 17, forced RLS, and account locks.

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
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms/{room_id}/settings")
}

fn patch(revision: i64, base: Value, updates: Value) -> Value {
    json!({
        "requestId": Uuid::new_v4(),
        "expectedRevision": revision,
        "base": base,
        "updates": updates
    })
}

#[tokio::test]
async fn settings_reads_require_account_authority_and_hide_cross_tenant_existence() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mira Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let room_id = create_room(&harness, &owner, "Settings Read").await;
    let endpoint = path(room_id);

    let response = harness.get(&endpoint, Some(&owner)).await;
    assert_eq!(response.status, 200, "{:?}", response.body);
    assert_eq!(response.body["roomId"], room_id.to_string());
    assert_eq!(response.body["revision"], 0);
    assert_eq!(response.body["settings"], json!({}));
    assert_eq!(harness.get(&endpoint, Some(&member)).await.status, 404);
    assert_eq!(harness.get(&endpoint, Some(&beta)).await.status, 404);
    assert_eq!(harness.get(&endpoint, None).await.status, 401);

    harness
        .tenant_execute(
            "UPDATE rooms SET config = jsonb_set(config, '{settings}', '{\"invented\":true}'::jsonb) WHERE id = $1",
            |query| query.bind(room_id),
        )
        .await;
    assert_eq!(
        harness.get(&endpoint, Some(&owner)).await.status,
        500,
        "stored data outside the generated schema must fail closed"
    );
    harness
        .tenant_execute(
            "UPDATE rooms SET config = config - 'settings' WHERE id = $1",
            |query| query.bind(room_id),
        )
        .await;

    harness.drop_room(room_id).await;
}

#[tokio::test]
async fn settings_validation_is_exact_and_mutations_are_idempotent_and_audited_once() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Settings Mutation").await;
    let endpoint = path(room_id);
    let request_id = Uuid::new_v4();
    let request = json!({
        "requestId": request_id,
        "expectedRevision": 0,
        "base": { "customCSS": null, "isLocked": null },
        "updates": { "customCSS": "body { color: red; }", "isLocked": true }
    });

    let first = harness.patch_json(&endpoint, &owner, &request).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["revision"], 1);
    assert_eq!(first.body["settings"]["isLocked"], true);
    let replay = harness.patch_json(&endpoint, &owner, &request).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, first.body);
    assert_eq!(
        harness
            .scalar(
                "SELECT count(*) FROM audit_log WHERE room_id = $1 AND event_name = 'room.settings.updated'",
                &room_id.to_string(),
            )
            .await,
        1
    );

    let reused = json!({
        "requestId": request_id,
        "expectedRevision": 1,
        "base": { "isLocked": true },
        "updates": { "isLocked": false }
    });
    assert_eq!(
        harness.patch_json(&endpoint, &owner, &reused).await.status,
        400
    );
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &patch(1, json!({ "invented": null }), json!({ "invented": true })),
            )
            .await
            .status,
        400
    );
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &patch(1, json!({ "isLocked": true }), json!({ "isLocked": "yes" })),
            )
            .await
            .status,
        400
    );
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &json!({
                    "requestId": Uuid::new_v4(),
                    "expectedRevision": 1,
                    "base": { "isLocked": true },
                    "updates": { "isLocked": false },
                    "extra": true
                }),
            )
            .await
            .status,
        400
    );
    let bounded_value = "x".repeat(200 * 1024);
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &patch(
                    1,
                    json!({
                        "alertLabels": null,
                        "customCSS": null,
                        "ssoHost": null,
                        "webinarPW": null
                    }),
                    json!({
                        "alertLabels": bounded_value,
                        "customCSS": bounded_value,
                        "ssoHost": bounded_value,
                        "webinarPW": bounded_value
                    }),
                ),
            )
            .await
            .status,
        400,
        "a client-caused aggregate overflow must not become a 500"
    );

    harness.drop_room(room_id).await;
}

#[tokio::test]
async fn concurrent_distinct_fields_merge_but_same_field_edits_conflict() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Concurrent Settings").await;
    let endpoint = path(room_id);

    let left = patch(
        0,
        json!({ "customCSS": null }),
        json!({ "customCSS": "a{}" }),
    );
    let right = patch(0, json!({ "isLocked": null }), json!({ "isLocked": true }));
    let (left_response, right_response) = tokio::join!(
        harness.patch_json(&endpoint, &owner, &left),
        harness.patch_json(&endpoint, &owner, &right)
    );
    assert_eq!(left_response.status, 200, "{:?}", left_response.body);
    assert_eq!(right_response.status, 200, "{:?}", right_response.body);
    let merged = harness.get(&endpoint, Some(&owner)).await.ok();
    assert_eq!(merged["revision"], 2);
    assert_eq!(merged["settings"]["customCSS"], "a{}");
    assert_eq!(merged["settings"]["isLocked"], true);

    let first = patch(2, json!({ "isLocked": true }), json!({ "isLocked": false }));
    let second = patch(2, json!({ "isLocked": true }), json!({ "isLocked": null }));
    let (first_response, second_response) = tokio::join!(
        harness.patch_json(&endpoint, &owner, &first),
        harness.patch_json(&endpoint, &owner, &second)
    );
    let mut statuses = [first_response.status, second_response.status];
    statuses.sort_unstable();
    assert_eq!(statuses, [200, 409]);

    harness.drop_room(room_id).await;
}

#[tokio::test]
async fn room_name_is_trimmed_and_kept_in_step_with_the_settings_document() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let room_id = create_room(&harness, &owner, "Before").await;
    let endpoint = path(room_id);
    let response = harness
        .patch_json(
            &endpoint,
            &owner,
            &patch(0, json!({ "name": null }), json!({ "name": "  After  " })),
        )
        .await;
    assert_eq!(response.status, 200, "{:?}", response.body);
    assert_eq!(response.body["settings"]["name"], "After");
    assert_eq!(
        harness
            .patch_json(
                &endpoint,
                &owner,
                &patch(1, json!({ "name": "After" }), json!({ "name": null })),
            )
            .await
            .status,
        400,
        "the required canonical room title must not be deletable"
    );
    assert_eq!(
        harness
            .get(
                &format!("/api/v1/accounts/{ACME_ENTERPRISE}/rooms"),
                Some(&owner)
            )
            .await
            .body
            .as_array()
            .expect("rooms")
            .iter()
            .find(|room| room["id"] == room_id.to_string())
            .expect("renamed room")["name"],
        "After"
    );

    harness.drop_room(room_id).await;
}
