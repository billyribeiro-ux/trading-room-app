//! Provisioning the first tenant.
//!
//! Each test runs against its own scratch database, because provisioning creates an
//! *enterprise* - the one thing that is not tenant-scoped, and so the one thing that cannot be
//! cleaned up behind an RLS policy.

mod support;

use sqlx::{PgPool, Row};
use tradingroom_api::provision::{self, MIN_PASSWORD_BYTES, ProvisionError};
use uuid::Uuid;

use support::Scratch;

/// A scratch database with the schema applied.
///
/// `Scratch::create` only creates the database; the DDL is a separate step, exactly as it is in
/// production where `migrate` is its own job.
async fn migrated() -> (Scratch, PgPool) {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;
    tradingroom_api::db::migrate::run(&pool)
        .await
        .expect("migrations should apply");
    (scratch, pool)
}

const NAME: &str = "Pro Trading Room";
const SLUG: &str = "protradingroom";
const ROOM: &str = "Main Room";
const EMAIL: &str = "owner@example.test";
const DISPLAY: &str = "Test Presenter";
/// Long enough to clear `MIN_PASSWORD_BYTES`, and obviously a fixture.
const PASSWORD: &str = "correct-horse-battery-staple";

async fn provisioned(pool: &PgPool) -> Uuid {
    provision::provision(pool, NAME, SLUG, ROOM, EMAIL, DISPLAY, PASSWORD.to_owned())
        .await
        .expect("provisioning should succeed")
}

#[tokio::test]
async fn it_creates_a_tenant_the_api_can_actually_serve() {
    let (_scratch, pool) = migrated().await;
    let room_id = provisioned(&pool).await;

    let row = sqlx::query(
        "SELECT r.name AS room_name, r.enterprise_id, e.slug, u.email::text AS email, \
                u.display_name, u.password_hash, u.email_hash, m.role, \
                account_member.role AS account_role, \
                (SELECT count(*) FROM room_state s \
                  WHERE s.room_id = r.id AND s.enterprise_id = r.enterprise_id) AS states \
         FROM rooms r \
         JOIN enterprises e ON e.id = r.enterprise_id \
         JOIN users u ON u.id = r.owner_id \
         JOIN enterprise_memberships account_member \
           ON account_member.enterprise_id = r.enterprise_id \
          AND account_member.user_id = u.id \
         JOIN room_members m ON m.room_id = r.id AND m.user_id = u.id \
         WHERE r.id = $1",
    )
    .bind(room_id)
    .fetch_one(&pool)
    .await
    .expect("the provisioned room should be fully joined up");

    assert_eq!(row.get::<String, _>("room_name"), ROOM);
    assert_eq!(row.get::<String, _>("slug"), SLUG);
    assert_eq!(row.get::<String, _>("email"), EMAIL);
    assert_eq!(row.get::<String, _>("display_name"), DISPLAY);
    // Owner, not member: the account has to be able to run the room it was created for.
    assert_eq!(row.get::<String, _>("role"), "owner");
    assert_eq!(row.get::<String, _>("account_role"), "owner");
    // Without this row `GET /rooms/{id}` has nothing to describe.
    assert_eq!(row.get::<i64, _>("states"), 1);

    // md5 of the lowercased address - the same digest the room application already computes for
    // gravatar (`src/lib/server/connection.ts`). Pinned to the literal value rather than
    // recomputed here, because asking Postgres for md5() and comparing it to Postgres's md5()
    // would assert nothing.
    assert_eq!(
        row.get::<String, _>("email_hash"),
        "f17712239715b86f1dfd9ba550b7f607",
        "email_hash must be md5(lower(email)) or every avatar breaks"
    );

    // argon2id specifically. `rooms_access_tiers_argon2id_check` mandates the algorithm for room
    // tiers, and user passwords use the same hasher rather than keeping two alive.
    let hash: String = row.get("password_hash");
    assert!(
        hash.starts_with("$argon2id$"),
        "expected an argon2id hash, got {hash}"
    );
}

#[tokio::test]
async fn changing_the_provisioned_owner_transfers_account_and_room_authority_atomically() {
    let (_scratch, pool) = migrated().await;
    let room_id = provisioned(&pool).await;

    provision::provision(
        &pool,
        NAME,
        SLUG,
        ROOM,
        "replacement-owner@example.test",
        "Replacement Owner",
        "replacement-owner-password".to_owned(),
    )
    .await
    .expect("owner transfer should converge");

    let owners: Vec<(String, String)> = sqlx::query_as(
        "SELECT users.email::text, membership.role \
         FROM enterprise_memberships AS membership \
         INNER JOIN users ON users.id = membership.user_id \
         WHERE membership.enterprise_id = (SELECT enterprise_id FROM rooms WHERE id = $1) \
         ORDER BY users.email",
    )
    .bind(room_id)
    .fetch_all(&pool)
    .await
    .expect("read account authority");
    assert_eq!(
        owners,
        [("replacement-owner@example.test".into(), "owner".into())],
        "the former user must not retain account authority"
    );

    let room_authority: Vec<(String, String, bool)> = sqlx::query_as(
        "SELECT users.email::text, member.role, rooms.owner_id = users.id \
         FROM room_members AS member \
         INNER JOIN users ON users.id = member.user_id \
         INNER JOIN rooms ON rooms.id = member.room_id \
         WHERE member.room_id = $1 \
         ORDER BY users.email",
    )
    .bind(room_id)
    .fetch_all(&pool)
    .await
    .expect("read room authority");
    assert_eq!(
        room_authority,
        [
            ("owner@example.test".into(), "member".into(), false),
            (
                "replacement-owner@example.test".into(),
                "owner".into(),
                true
            ),
        ]
    );
}

/// The password must verify against the API's own verifier, not merely be present.
///
/// This is the assertion that would have caught the scrypt/argon2id mismatch recorded in
/// `docs/CUTOVER-ROOM-TO-API.md` §2: a hash can be stored, well-formed and completely unusable
/// by the login path.
#[tokio::test]
async fn the_stored_password_verifies_against_the_login_path() {
    let (_scratch, pool) = migrated().await;
    provisioned(&pool).await;

    let stored: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE email = $1")
        .bind(EMAIL)
        .fetch_one(&pool)
        .await
        .expect("read the stored hash");

    assert!(
        tradingroom_api::auth::password::verify_password(PASSWORD.to_owned(), Some(stored.clone()))
            .await
            .expect("verification should not error"),
        "the provisioned password must verify"
    );

    assert!(
        !tradingroom_api::auth::password::verify_password(
            "wrong-password-entirely".into(),
            Some(stored)
        )
        .await
        .expect("verification should not error"),
        "a wrong password must not verify"
    );
}

/// Re-running converges instead of duplicating or failing.
///
/// An operator re-runs this - after a typo in the room name, after a password rotation, from a
/// deployment script that does not know whether it has run before. Every write is keyed on
/// something the schema already makes unique, so the second run must land on the same room.
#[tokio::test]
async fn re_running_converges_and_rotates_the_password() {
    let (_scratch, pool) = migrated().await;

    let first = provisioned(&pool).await;

    let second = provision::provision(
        &pool,
        NAME,
        SLUG,
        "Renamed Room",
        EMAIL,
        DISPLAY,
        "a-completely-different-password".to_owned(),
    )
    .await
    .expect("the second run should converge");

    assert_eq!(first, second, "re-running must address the same room");

    // Written out rather than built with `format!`: sqlx refuses a dynamically-assembled query
    // string, and it is right to - the audit it forces is the point.
    let counts: (i64, i64, i64) = sqlx::query_as(
        "SELECT (SELECT count(*) FROM enterprises), \
                (SELECT count(*) FROM rooms), \
                (SELECT count(*) FROM users)",
    )
    .fetch_one(&pool)
    .await
    .expect("count rows");
    assert_eq!(
        counts,
        (1, 1, 1),
        "re-running duplicated a row: (enterprises, rooms, users)"
    );

    let name: String = sqlx::query_scalar("SELECT name FROM rooms WHERE id = $1")
        .bind(first)
        .fetch_one(&pool)
        .await
        .expect("read the room name");
    assert_eq!(name, "Renamed Room", "the second run must update the name");

    let stored: String = sqlx::query_scalar("SELECT password_hash FROM users WHERE email = $1")
        .bind(EMAIL)
        .fetch_one(&pool)
        .await
        .expect("read the rotated hash");
    assert!(
        tradingroom_api::auth::password::verify_password(
            "a-completely-different-password".into(),
            Some(stored.clone())
        )
        .await
        .expect("verification should not error"),
        "the rotated password must verify"
    );
    assert!(
        !tradingroom_api::auth::password::verify_password(PASSWORD.to_owned(), Some(stored))
            .await
            .expect("verification should not error"),
        "the old password must stop working"
    );
}

/// Both validations are refused before anything is written.
///
/// A half-provisioned tenant is worse than none: the next run's upserts would converge onto it
/// and hide that the first failed.
#[tokio::test]
async fn a_weak_password_or_an_unusable_slug_writes_nothing() {
    let (_scratch, pool) = migrated().await;

    let short = "x".repeat(MIN_PASSWORD_BYTES - 1);
    let weak = provision::provision(&pool, NAME, SLUG, ROOM, EMAIL, DISPLAY, short).await;
    assert!(
        matches!(weak, Err(ProvisionError::WeakPassword)),
        "{weak:?}"
    );

    for slug in ["Pro Trading Room", "has space", "UPPER", "", "under_score"] {
        let bad =
            provision::provision(&pool, NAME, slug, ROOM, EMAIL, DISPLAY, PASSWORD.to_owned())
                .await;
        assert!(
            matches!(bad, Err(ProvisionError::BadSlug(_))),
            "slug {slug:?} should be refused, got {bad:?}"
        );
    }

    let enterprises: i64 = sqlx::query_scalar("SELECT count(*) FROM enterprises")
        .fetch_one(&pool)
        .await
        .expect("count enterprises");
    assert_eq!(enterprises, 0, "a refused run must write nothing");
}
