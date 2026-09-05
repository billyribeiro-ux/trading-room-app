//! Canonical customer API-key management through real Axum, PostgreSQL, and tenant RLS.

mod support;

use serde_json::{Value, json};
use support::{ACME_ENTERPRISE, ACME_MEMBER, ACME_OWNER, BETA_OWNER, Harness};
use uuid::Uuid;

fn collection() -> String {
    format!("/api/v1/accounts/{ACME_ENTERPRISE}/customer-api-keys")
}

fn rotate_path(key_id: &str) -> String {
    format!("{}/{key_id}/rotate", collection())
}

fn restrictions_path(key_id: &str) -> String {
    format!("{}/{key_id}/restrictions", collection())
}

fn item_path(key_id: &str) -> String {
    format!("{}/{key_id}", collection())
}

fn verifier(seed: char) -> (String, String) {
    let hash = seed.to_string().repeat(64);
    let last_four = seed.to_string().repeat(4);
    (hash, last_four)
}

fn assert_secret_free(value: &Value) {
    let encoded = value.to_string().to_lowercase();
    for forbidden in ["secrethash", "secretciphertext", "apisecret", "plaintext"] {
        assert!(
            !encoded.contains(forbidden),
            "canonical response exposed forbidden credential material `{forbidden}`: {value}"
        );
    }
}

#[tokio::test]
async fn customer_api_key_lifecycle_is_authorized_revisioned_and_exactly_once() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let member = harness.cookie_for(ACME_MEMBER, "Mina Member");
    let beta = harness.cookie_for(BETA_OWNER, "Beta Owner");
    let endpoint = collection();

    assert_eq!(harness.get(&endpoint, None).await.status, 401);
    assert_eq!(harness.get(&endpoint, Some(&member)).await.status, 404);
    assert_eq!(harness.get(&endpoint, Some(&beta)).await.status, 404);

    let key_id = Uuid::new_v4().simple().to_string()[..24].to_owned();
    let request_id = Uuid::new_v4();
    let (secret_hash, last_four) = verifier('a');
    let create = json!({
        "requestId": request_id,
        "keyId": key_id,
        "secretHash": secret_hash,
        "lastFour": last_four
    });
    let first = harness.post_json(&endpoint, &owner, &create).await;
    assert_eq!(first.status, 200, "{:?}", first.body);
    assert_eq!(first.body["changed"], 1);
    assert_eq!(first.body["keys"][0]["id"], key_id);
    assert_eq!(first.body["keys"][0]["revision"], 0);
    assert_eq!(first.body["keys"][0]["lastFour"], "aaaa");
    assert_eq!(
        first.body["keys"][0]["restrictions"],
        json!({ "ips": [], "scopes": [], "sessions": [] })
    );
    assert_secret_free(&first.body);

    let replay = harness.post_json(&endpoint, &owner, &create).await;
    assert_eq!(replay.status, 200, "{:?}", replay.body);
    assert_eq!(replay.body, first.body);
    let mut mismatch = create.clone();
    mismatch["keyId"] = json!(Uuid::new_v4().simple().to_string()[..24].to_owned());
    assert_eq!(
        harness.post_json(&endpoint, &owner, &mismatch).await.status,
        400,
        "a request id cannot be replayed for another key"
    );

    let restricted = harness
        .put_json(
            &restrictions_path(&key_id),
            &owner,
            &json!({
                "requestId": Uuid::new_v4(),
                "expectedRevision": 0,
                "restrictions": {
                    "ips": ["192.168.1.1/24", "10.0.0.1", "10.0.0.1"],
                    "scopes": ["sessions/users", "sessions/list", "sessions/users"],
                    "sessions": ["1001", "1001"]
                }
            }),
        )
        .await;
    assert_eq!(restricted.status, 200, "{:?}", restricted.body);
    assert_eq!(restricted.body["keys"][0]["revision"], 1);
    assert_eq!(
        restricted.body["keys"][0]["restrictions"],
        json!({
            "ips": ["10.0.0.1", "192.168.1.1/24"],
            "scopes": ["sessions/list", "sessions/users"],
            "sessions": ["1001"]
        })
    );
    assert_secret_free(&restricted.body);

    let (rotated_hash, rotated_last_four) = verifier('b');
    let rotate_id = Uuid::new_v4();
    let rotate = json!({
        "requestId": rotate_id,
        "expectedRevision": 1,
        "secretHash": rotated_hash,
        "lastFour": rotated_last_four
    });
    let rotated = harness
        .post_json(&rotate_path(&key_id), &owner, &rotate)
        .await;
    assert_eq!(rotated.status, 200, "{:?}", rotated.body);
    assert_eq!(rotated.body["keys"][0]["revision"], 2);
    assert_eq!(rotated.body["keys"][0]["lastFour"], "bbbb");
    assert_secret_free(&rotated.body);
    assert_eq!(
        harness
            .post_json(&rotate_path(&key_id), &owner, &rotate)
            .await
            .body,
        rotated.body,
        "an uncertain rotation retry must return the committed response"
    );

    let listed = harness.get(&endpoint, Some(&owner)).await.ok();
    let row = listed
        .as_array()
        .unwrap()
        .iter()
        .find(|row| row["id"] == key_id)
        .expect("created key is listed");
    assert_eq!(row["revision"], 2);
    assert_eq!(row["lastFour"], "bbbb");
    assert_secret_free(&listed);

    assert_eq!(
        harness
            .delete_json(
                &item_path(&key_id),
                &owner,
                &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 1 })
            )
            .await
            .status,
        409,
        "a stale writer must not revoke a credential"
    );
    let delete = json!({ "requestId": Uuid::new_v4(), "expectedRevision": 2 });
    let removed = harness
        .delete_json(&item_path(&key_id), &owner, &delete)
        .await;
    assert_eq!(removed.status, 200, "{:?}", removed.body);
    assert_eq!(removed.body["removedKeyIds"], json!([key_id]));
    assert_secret_free(&removed.body);
    assert_eq!(
        harness
            .delete_json(&item_path(&key_id), &owner, &delete)
            .await
            .body,
        removed.body
    );
    assert!(
        harness
            .get(&endpoint, Some(&owner))
            .await
            .ok()
            .as_array()
            .unwrap()
            .iter()
            .all(|row| row["id"] != key_id)
    );
    assert_eq!(
        harness
            .tenant_admin_scalar_i32(
                "SELECT count(*)::integer FROM audit_log WHERE room_id IS NULL \
                 AND event_name LIKE 'customer-api-key.%' \
                 AND metadata->>'requestId' IN ($1, $2)",
                |query| query
                    .bind(request_id.to_string())
                    .bind(rotate_id.to_string()),
            )
            .await,
        2,
        "replays and refusals must not duplicate audit evidence"
    );
}

#[tokio::test]
async fn customer_api_key_inputs_and_room_restrictions_fail_closed() {
    let harness = Harness::start().await;
    let owner = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let endpoint = collection();
    let key_id = Uuid::new_v4().simple().to_string()[..24].to_owned();
    let (secret_hash, last_four) = verifier('c');

    for invalid in [
        json!({
            "requestId": Uuid::new_v4(), "keyId": "ABC", "secretHash": secret_hash.clone(),
            "lastFour": last_four.clone()
        }),
        json!({
            "requestId": Uuid::new_v4(), "keyId": key_id.clone(), "secretHash": "ABC",
            "lastFour": last_four.clone()
        }),
        json!({
            "requestId": Uuid::new_v4(), "keyId": key_id.clone(), "secretHash": secret_hash.clone(),
            "lastFour": last_four.clone(), "role": "owner"
        }),
    ] {
        assert_eq!(
            harness.post_json(&endpoint, &owner, &invalid).await.status,
            400
        );
    }

    let created = harness
        .post_json(
            &endpoint,
            &owner,
            &json!({
                "requestId": Uuid::new_v4(), "keyId": key_id.clone(),
                "secretHash": secret_hash, "lastFour": last_four
            }),
        )
        .await;
    assert_eq!(created.status, 200, "{:?}", created.body);
    for restrictions in [
        json!({ "ips": ["999.1.1.1"], "scopes": [], "sessions": [] }),
        json!({ "ips": [], "scopes": ["rooms:write"], "sessions": [] }),
        json!({ "ips": [], "scopes": [], "sessions": ["not-owned"] }),
        json!({ "ips": [], "scopes": [], "sessions": [], "owner": true }),
    ] {
        assert_eq!(
            harness
                .put_json(
                    &restrictions_path(&key_id),
                    &owner,
                    &json!({
                        "requestId": Uuid::new_v4(), "expectedRevision": 0,
                        "restrictions": restrictions
                    }),
                )
                .await
                .status,
            400
        );
    }
    let (next_hash, next_last_four) = verifier('d');
    assert_eq!(
        harness
            .post_json(
                &rotate_path(&key_id),
                &owner,
                &json!({
                    "requestId": Uuid::new_v4(), "expectedRevision": -1,
                    "secretHash": next_hash, "lastFour": next_last_four
                })
            )
            .await
            .status,
        400
    );
    harness
        .delete_json(
            &item_path(&key_id),
            &owner,
            &json!({ "requestId": Uuid::new_v4(), "expectedRevision": 0 }),
        )
        .await
        .ok();
}
