//! Proves the seeded operator account can actually sign in.
//!
//! A credential documented in a README and never exercised is a credential that quietly stops
//! working. This runs the real login handler against the real hash in the fixture.

mod support;

use support::Harness;
use tradingroom_api::auth::password;

const SEEDED_EMAIL: &str = "platform-admin@tradingroom.test";
const SEEDED_PASSWORD: &str = "tradingroom-admin-2026";
const SEED_SQL: &str = include_str!("../fixtures/seed.sql");

fn seeded_password_hash() -> String {
    let row_marker = format!("'{SEEDED_EMAIL}',");
    let row = SEED_SQL
        .split_once(&row_marker)
        .expect("the documented fixture account must exist in seed.sql")
        .1;
    let hash_start = row
        .find("'$argon2id$")
        .expect("the documented fixture account must carry an Argon2id hash")
        + 1;
    let hash_end = row[hash_start..]
        .find('\'')
        .expect("the fixture password hash must be a quoted SQL value");

    row[hash_start..hash_start + hash_end].to_owned()
}

#[tokio::test]
async fn the_committed_seed_hash_matches_the_documented_password() {
    let verified = password::verify_password(SEEDED_PASSWORD.into(), Some(seeded_password_hash()))
        .await
        .expect("the fixture password hash must be a valid PHC string");

    assert!(
        verified,
        "the committed fixture hash must verify the documented development password"
    );
}

#[tokio::test]
async fn the_seeded_admin_can_log_in() {
    let h = Harness::start().await;

    let response = h
        .post_anonymous(
            "/api/auth/login",
            &serde_json::json!({ "email": SEEDED_EMAIL, "password": SEEDED_PASSWORD }),
        )
        .await;

    assert_eq!(
        response.status, 200,
        "the documented development credential must work: {:?}",
        response.body
    );
    assert_eq!(response.body["displayName"], "Test Platform Admin");
    assert_eq!(response.body["isPlatformAdmin"], true);
    assert!(
        response.body["expiresAt"].as_i64().is_some(),
        "a session must carry its expiry: {:?}",
        response.body
    );
}

#[tokio::test]
async fn the_wrong_password_is_refused() {
    // Guards against the fixture hash being replaced by something that accepts anything.
    let h = Harness::start().await;
    let response = h
        .post_anonymous(
            "/api/auth/login",
            &serde_json::json!({ "email": SEEDED_EMAIL, "password": "not-the-password" }),
        )
        .await;
    assert_eq!(response.status, 401, "{:?}", response.body);
}
