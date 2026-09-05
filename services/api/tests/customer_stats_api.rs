mod support;

use sha2::{Digest, Sha256};
use support::{ACME_ENTERPRISE, ACME_ROOM, Harness};
use time::OffsetDateTime;
use uuid::Uuid;

fn credential() -> (String, String, String) {
    let key = Uuid::new_v4().simple().to_string()[..24].to_owned();
    let secret = Uuid::new_v4().simple().to_string();
    let hash = hex::encode(Sha256::digest(secret.as_bytes()));
    (key, secret, hash)
}

async fn insert_key(harness: &Harness, key: &str, hash: &str, restrictions: serde_json::Value) {
    harness
        .tenant_execute(
            "INSERT INTO customer_api_keys \
               (enterprise_id, id, secret_hash, last_four, restrictions) \
             VALUES ($1, $2, $3, $4, $5)",
            |query| {
                query
                    .bind(ACME_ENTERPRISE)
                    .bind(key)
                    .bind(hash)
                    .bind(&hash[hash.len() - 4..])
                    .bind(restrictions)
            },
        )
        .await;
}

#[tokio::test]
async fn every_documented_stats_command_runs_through_canonical_key_authority() {
    let harness = Harness::start().await;
    let (key, secret, hash) = credential();
    insert_key(
        &harness,
        &key,
        &hash,
        serde_json::json!({ "ips": [], "scopes": [], "sessions": [] }),
    )
    .await;

    let visit_id = Uuid::new_v4();
    harness
        .tenant_execute(
            "INSERT INTO room_visit_sessions \
               (id, enterprise_id, room_id, user_id, email_snapshot, display_name_snapshot, ip, entered_at, exited_at, is_mobile) \
             SELECT $1, $2, $3, room_member.user_id, 'visitor@example.test', 'Visitor', \
                    '192.0.2.8'::inet, $4, $5, true \
              FROM room_members AS room_member \
              WHERE room_member.room_id = $3 AND room_member.role = 'owner' \
              ORDER BY room_member.id LIMIT 1",
            |query| {
                query
                    .bind(visit_id)
                    .bind(ACME_ENTERPRISE)
                    .bind(ACME_ROOM)
                    .bind(OffsetDateTime::now_utc() - time::Duration::minutes(5))
                    .bind(OffsetDateTime::now_utc())
            },
        )
        .await;

    let base = format!("apiKey={key}&apiSecret={secret}");
    let listed = harness
        .get(&format!("/stats/v1/sessions/list?{base}"), None)
        .await;
    assert_eq!(listed.status, 200, "{:?}", listed.body);
    let listed_room = listed.body["sessions"]
        .as_array()
        .and_then(|rooms| rooms.iter().find(|room| room["_id"] == "1001"))
        .expect("the canonical fixture room is listed");
    assert_eq!(listed_room["uuid"], ACME_ROOM.to_string());
    assert_eq!(listed_room["currentState"], "active");
    assert!(listed_room.get("current_capacity").is_some());
    assert!(listed_room.get("current_max").is_some());

    let users = harness
        .get(
            &format!("/stats/v1/sessions/users?{base}&sessionID=1001"),
            None,
        )
        .await;
    assert_eq!(users.status, 200, "{:?}", users.body);
    assert!(
        users.body["users"]
            .as_array()
            .is_some_and(|rows| !rows.is_empty())
    );

    let userstats = harness
        .get(
            &format!("/stats/v1/sessions/userstats?{base}&sessionID=1001&isMobile=true"),
            None,
        )
        .await;
    assert_eq!(userstats.status, 200, "{:?}", userstats.body);
    assert_eq!(userstats.body["userstats"][0]["ip"], "192.0.2.8");

    let recording_id = Uuid::new_v4();
    harness
        .tenant_execute(
            "INSERT INTO files \
               (id, enterprise_id, room_id, filename, mime_type, byte_size, storage_key, url, kind, \
                recording_duration_ms, recording_source_filename) \
             VALUES ($1, $2, $3, 'recording.mp4', 'video/mp4', 4242, 'recordings/test.mp4', \
                     'https://media.example.test/recordings/test.mp4', 'recording', 125000, 'recording.mkv')",
            |query| {
                query
                    .bind(recording_id)
                    .bind(ACME_ENTERPRISE)
                    .bind(ACME_ROOM)
            },
        )
        .await;

    for (command, field, extra) in [
        ("chatlogs", "chatlogs", "&channel=main"),
        ("alertlogs", "chatlogs", ""),
        ("deletedlogs", "deletedlogs", "&eventType=D"),
        ("archivedlogs", "archivedlogs", "&logType=chat&channel=main"),
        ("recordings", "recordings", ""),
    ] {
        let response = harness
            .get(
                &format!("/stats/v1/sessions/{command}?{base}&sessionID=1001{extra}"),
                None,
            )
            .await;
        assert_eq!(response.status, 200, "{command}: {:?}", response.body);
        assert!(
            response.body[field].is_array(),
            "{command}: {:?}",
            response.body
        );
        if command == "recordings" {
            let recording = &response.body[field][0];
            assert_eq!(recording["_id"], recording_id.to_string());
            assert_eq!(recording["name"], "recording.mp4");
            assert_eq!(recording["namemkv"], "recording.mkv");
            assert_eq!(recording["duration"], 2);
            assert_eq!(recording["length"], 125_000);
            assert_eq!(recording["media_server"], "media.example.test");
            assert!(recording.get("mediaServer").is_none());
        }
    }

    let unique = Uuid::new_v4().simple().to_string();
    let email = format!("stats-{unique}@example.test");
    let added = harness
        .post_anonymous(
            &format!("/stats/v1/sessions/addUsers?{base}&sessionID=1001"),
            &serde_json::json!({ "users": [{ "email": email, "name": "Stats User" }] }),
        )
        .await;
    assert_eq!(added.status, 200, "{:?}", added.body);
    assert_eq!(added.body["added"], 1);
    let added_user_id = harness
        .tenant_scalar(
            "SELECT identity.id FROM users AS identity \
             INNER JOIN room_members AS member ON member.user_id = identity.id \
             WHERE member.room_id = $1 AND identity.email = $2",
            |query| query.bind(ACME_ROOM).bind(email.clone()),
        )
        .await;
    let deleted = harness
        .post_anonymous(
            &format!("/stats/v1/sessions/delUsers?{base}&sessionID=1001"),
            &serde_json::json!({ "delUsers": [email.to_uppercase()] }),
        )
        .await;
    assert_eq!(deleted.status, 200, "{:?}", deleted.body);
    assert_eq!(deleted.body["deletedUsers"], serde_json::json!([email]));

    let clone = harness
        .get(
            &format!("/stats/v1/sessions/cloneSession?{base}&sessionID=1001&name=Stats%20Clone"),
            None,
        )
        .await;
    assert_eq!(clone.status, 200, "{:?}", clone.body);
    assert_eq!(clone.body["session"]["isClonedRoom"], true);
    let clone_id = clone.body["session"]["uuid"]
        .as_str()
        .and_then(|value| value.parse::<Uuid>().ok())
        .expect("clone UUID");

    let (_, wrong_secret, _) = credential();
    let invalid = harness
        .get(
            &format!(
                "/stats/v1/sessions/users?apiKey={key}&apiSecret={wrong_secret}&sessionID=1001"
            ),
            None,
        )
        .await;
    // `users` was already called for this key inside its one-second bucket. Both 403 and 429 are
    // fail-closed; independent credential opacity is asserted with the isolated keys below.
    assert!(matches!(invalid.status, 403 | 429));

    harness.drop_room(clone_id).await;
    harness.drop_profile_identity(added_user_id).await;
    harness
        .tenant_execute("DELETE FROM files WHERE id = $1", |query| {
            query.bind(recording_id)
        })
        .await;
    harness
        .tenant_admin_execute("DELETE FROM room_visit_sessions WHERE id = $1", |query| {
            query.bind(visit_id)
        })
        .await;
    harness
        .tenant_execute("DELETE FROM customer_api_keys WHERE id = $1", |query| {
            query.bind(key.clone())
        })
        .await;
}

#[tokio::test]
async fn stats_credentials_restrictions_shapes_and_rate_limits_fail_closed() {
    let harness = Harness::start().await;
    let (rate_key, rate_secret, rate_hash) = credential();
    insert_key(
        &harness,
        &rate_key,
        &rate_hash,
        serde_json::json!({ "ips": [], "scopes": [], "sessions": [] }),
    )
    .await;
    let path = format!("/stats/v1/sessions/list?apiKey={rate_key}&apiSecret={rate_secret}");
    assert_eq!(harness.get(&path, None).await.status, 200);
    assert_eq!(harness.get(&path, None).await.status, 429);

    let (scope_key, scope_secret, scope_hash) = credential();
    insert_key(
        &harness,
        &scope_key,
        &scope_hash,
        serde_json::json!({ "ips": [], "scopes": ["sessions/list"], "sessions": [] }),
    )
    .await;
    let scoped = harness
        .get(
            &format!("/stats/v1/sessions/users?apiKey={scope_key}&apiSecret={scope_secret}&sessionID=1001"),
            None,
        )
        .await;
    assert_eq!(scoped.status, 403, "{:?}", scoped.body);

    let (ip_key, ip_secret, ip_hash) = credential();
    insert_key(
        &harness,
        &ip_key,
        &ip_hash,
        serde_json::json!({ "ips": ["203.0.113.0/24"], "scopes": [], "sessions": [] }),
    )
    .await;
    let ip_denied = harness
        .get(
            &format!(
                "/stats/v1/sessions/recordings?apiKey={ip_key}&apiSecret={ip_secret}&sessionID=1001"
            ),
            None,
        )
        .await;
    assert_eq!(ip_denied.status, 403, "{:?}", ip_denied.body);

    let (secret_key, _, secret_hash) = credential();
    insert_key(
        &harness,
        &secret_key,
        &secret_hash,
        serde_json::json!({ "ips": [], "scopes": [], "sessions": [] }),
    )
    .await;
    let bad_secret = harness
        .get(
            &format!("/stats/v1/sessions/users?apiKey={secret_key}&apiSecret=wrong&sessionID=1001"),
            None,
        )
        .await;
    assert_eq!(bad_secret.status, 403, "{:?}", bad_secret.body);

    let malformed = harness
        .get(
            &format!("/stats/v1/sessions/alertlogs?apiKey={rate_key}&apiSecret={rate_secret}&sessionID=1001&extra=true"),
            None,
        )
        .await;
    assert_eq!(malformed.status, 400, "{:?}", malformed.body);

    for key in [&rate_key, &scope_key, &ip_key, &secret_key] {
        harness
            .tenant_execute("DELETE FROM customer_api_keys WHERE id = $1", |query| {
                query.bind(key.clone())
            })
            .await;
    }
}

#[tokio::test]
async fn distinct_customer_commands_can_touch_one_key_concurrently_without_losing_monotonicity() {
    let harness = Harness::start().await;
    let (key, secret, hash) = credential();
    insert_key(
        &harness,
        &key,
        &hash,
        serde_json::json!({ "ips": [], "scopes": [], "sessions": [] }),
    )
    .await;

    let list = format!("/stats/v1/sessions/list?apiKey={key}&apiSecret={secret}");
    let users = format!("/stats/v1/sessions/users?apiKey={key}&apiSecret={secret}&sessionID=1001");
    let (listed, users) = tokio::join!(harness.get(&list, None), harness.get(&users, None));
    assert_eq!(listed.status, 200, "{:?}", listed.body);
    assert_eq!(users.status, 200, "{:?}", users.body);

    harness
        .tenant_execute("DELETE FROM customer_api_keys WHERE id = $1", |query| {
            query.bind(key)
        })
        .await;
}
