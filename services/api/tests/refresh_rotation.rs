//! Refresh-token rotation and family reuse detection, against real PostgreSQL.
//!
//! The behaviour under test is the one the schema asks for by carrying both `family_id`
//! and `revoked_at`. The test that matters is `reusing_a_rotated_token_kills_the_whole_family`:
//! it is the difference between "we rotate tokens" and "a stolen token is contained".

use sqlx::Row;
use time::OffsetDateTime;
use tradingroom_api::auth::refresh::{self, RejectionReason};
use tradingroom_api::db::Db;
use tradingroom_api::limits;
use uuid::{Uuid, uuid};

/// A seeded user in the acme tenant.
const USER: Uuid = uuid!("a0000001-0000-4000-8000-000000000003");

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://tradingroom_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

async fn db() -> Db {
    Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
        .await
        .expect("connect")
}

/// Removes every token this test family created, so repeated runs stay clean.
async fn cleanup(db: &Db, family_id: Uuid) {
    sqlx::query("DELETE FROM refresh_tokens WHERE family_id = $1")
        .bind(family_id)
        .execute(db.identity_pool_for_tests())
        .await
        .expect("cleanup");
}

async fn live_tokens_in_family(db: &Db, family_id: Uuid) -> i64 {
    sqlx::query(
        "SELECT count(*) AS n FROM refresh_tokens WHERE family_id = $1 AND revoked_at IS NULL",
    )
    .bind(family_id)
    .fetch_one(db.identity_pool_for_tests())
    .await
    .expect("count")
    .get::<i64, _>("n")
}

#[tokio::test]
async fn a_fresh_token_rotates_into_a_successor_in_the_same_family() {
    let db = db().await;
    let now = OffsetDateTime::now_utc();

    let issued = refresh::issue_family(&db, USER, None, Some("test-agent"), now)
        .await
        .expect("issue");
    assert_eq!(live_tokens_in_family(&db, issued.family_id).await, 1);

    let rotated = refresh::rotate(&db, &issued.token, None, Some("test-agent"), now)
        .await
        .expect("the freshly issued token should rotate");

    assert_eq!(rotated.user_id, USER);
    assert_eq!(
        rotated.refresh.family_id, issued.family_id,
        "rotation must stay inside the family, otherwise reuse detection has nothing to revoke"
    );
    assert_ne!(rotated.refresh.token, issued.token);
    // Exactly one live token: the successor. The presented one is now revoked.
    assert_eq!(live_tokens_in_family(&db, issued.family_id).await, 1);

    cleanup(&db, issued.family_id).await;
}

#[tokio::test]
async fn a_rotated_token_cannot_be_used_twice() {
    let db = db().await;
    let now = OffsetDateTime::now_utc();

    let issued = refresh::issue_family(&db, USER, None, None, now)
        .await
        .expect("issue");
    let _first = refresh::rotate(&db, &issued.token, None, None, now)
        .await
        .expect("first rotation succeeds");

    let (_error, reason) = refresh::rotate(&db, &issued.token, None, None, now)
        .await
        .expect_err("presenting the retired token again must fail");
    assert_eq!(reason, RejectionReason::Reused);

    cleanup(&db, issued.family_id).await;
}

#[tokio::test]
async fn reusing_a_rotated_token_kills_the_whole_family() {
    // The scenario: an attacker copies a refresh token. The victim's browser rotates
    // first, so the attacker presents a token that has already been retired. Detecting
    // that is only useful if it also invalidates the successor the *victim* now holds -
    // otherwise the attacker is locked out but a second stolen copy still works.
    let db = db().await;
    let now = OffsetDateTime::now_utc();

    let issued = refresh::issue_family(&db, USER, None, None, now)
        .await
        .expect("issue");
    let victim = refresh::rotate(&db, &issued.token, None, None, now)
        .await
        .expect("victim rotates normally");

    // The victim's current token is live at this point.
    assert_eq!(live_tokens_in_family(&db, issued.family_id).await, 1);

    // Attacker replays the stolen, already-rotated token.
    let (_error, reason) = refresh::rotate(&db, &issued.token, None, None, now)
        .await
        .expect_err("a replayed token must be refused");
    assert_eq!(reason, RejectionReason::Reused);

    // The entire family is now dead, including the token the victim was holding.
    assert_eq!(
        live_tokens_in_family(&db, issued.family_id).await,
        0,
        "reuse detection must revoke the whole family, not just the replayed token"
    );

    let (_error, reason) = refresh::rotate(&db, &victim.refresh.token, None, None, now)
        .await
        .expect_err("the victim's successor must also be dead");
    assert_eq!(reason, RejectionReason::Reused);

    cleanup(&db, issued.family_id).await;
}

#[tokio::test]
async fn an_unknown_token_is_refused_without_revealing_anything() {
    let db = db().await;
    let (error, reason) = refresh::rotate(
        &db,
        "a-token-that-was-never-issued",
        None,
        None,
        OffsetDateTime::now_utc(),
    )
    .await
    .expect_err("unknown tokens must be refused");

    assert_eq!(reason, RejectionReason::Unknown);
    // Identical wire code to every other rejection: no oracle.
    assert_eq!(error.code(), "unauthorized");
}

#[tokio::test]
async fn an_expired_token_is_refused() {
    let db = db().await;
    let now = OffsetDateTime::now_utc();

    let issued = refresh::issue_family(&db, USER, None, None, now)
        .await
        .expect("issue");

    // Ask for rotation from a point past the token's own expiry.
    let far_future = now + tradingroom_api::limits::REFRESH_TOKEN_TTL + time::Duration::seconds(1);
    let (_error, reason) = refresh::rotate(&db, &issued.token, None, None, far_future)
        .await
        .expect_err("an expired token must be refused");
    assert_eq!(reason, RejectionReason::Expired);

    cleanup(&db, issued.family_id).await;
}

#[tokio::test]
async fn the_raw_token_is_never_written_to_the_database() {
    let db = db().await;
    let now = OffsetDateTime::now_utc();
    let issued = refresh::issue_family(&db, USER, None, None, now)
        .await
        .expect("issue");

    // A database dump must not hand over live credentials.
    let found: i64 = sqlx::query("SELECT count(*) AS n FROM refresh_tokens WHERE token_hash = $1")
        .bind(&issued.token)
        .fetch_one(db.identity_pool_for_tests())
        .await
        .expect("query")
        .get("n");
    assert_eq!(found, 0, "the raw token was stored verbatim");

    let stored_is_a_hash: bool = sqlx::query(
        "SELECT token_hash ~ '^[0-9a-f]{64}$' AS ok FROM refresh_tokens WHERE family_id = $1",
    )
    .bind(issued.family_id)
    .fetch_one(db.identity_pool_for_tests())
    .await
    .expect("query")
    .get("ok");
    assert!(stored_is_a_hash, "token_hash should be sha256 hex");

    cleanup(&db, issued.family_id).await;
}
