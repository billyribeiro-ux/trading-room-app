//! Row-level security, proven against a real PostgreSQL 17 database.
//!
//! Nothing here is mocked. These tests connect as the real `ptr_clone_app` role, which is
//! `NOBYPASSRLS`, so every policy in the schema is genuinely in force. A mock would
//! cheerfully return whatever it was told to, which is precisely the failure these tests
//! exist to catch.
//!
//! The fixture is the seeded two-tenant database: `acme-trading` and `beta-trading`, each
//! with one room. If the tenancy kernel is wrong, one of them can see the other.
//!
//! Run with:
//!   DATABASE_URL='postgres://ptr_clone_app:<pw>@127.0.0.1:5432/ptr_clone' cargo test -p tradingroom-api

use sqlx::{PgPool, Row};
use tradingroom_api::db::{Db, DbError, TenantCtx};
use tradingroom_api::limits;
use uuid::{Uuid, uuid};

const ACME: Uuid = uuid!("a0000000-0000-4000-8000-000000000001");
const BETA: Uuid = uuid!("b0000000-0000-4000-8000-000000000001");
const ACME_ROOM: Uuid = uuid!("a0000003-0000-4000-8000-000000000001");
const ACME_MEMBER_USER: Uuid = uuid!("a0000001-0000-4000-8000-000000000003");

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ptr_clone_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

fn owner_url() -> String {
    std::env::var("MIGRATE_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ptr_clone:ptr_clone_local_development_password@127.0.0.1:5432/ptr_clone".into()
    })
}

async fn db() -> Db {
    Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
        .await
        .expect("the ptr_clone_app role should be able to connect")
}

/// A bare pool, bypassing the kernel entirely, so we can observe what the *database* does
/// rather than what our abstraction claims it does.
async fn raw_pool() -> PgPool {
    PgPool::connect(&database_url())
        .await
        .expect("raw connection for database-level assertions")
}

#[tokio::test]
async fn the_runtime_role_has_no_privilege_expansion_path() {
    // The database-level tests below prove the policies' behavior. This separately proves
    // the application refuses role drift before it serves traffic.
    db().await
        .assert_runtime_role_is_restricted()
        .await
        .expect("ptr_clone_app must have the complete restricted runtime posture");
}

#[tokio::test]
async fn an_owner_cannot_impersonate_the_runtime_role_with_session_authorization() {
    // One connection makes the session mutation and the posture check observe the same backend.
    // PostgreSQL allows the superuser owner to replace both mutable SQL identities; `system_user`
    // is the independent authentication-cycle evidence that must still expose the owner.
    let db = Db::connect(&owner_url(), 1, limits::DB_ACQUIRE_TIMEOUT)
        .await
        .expect("connect as the database owner");
    sqlx::query("SET SESSION AUTHORIZATION ptr_clone_app")
        .execute(db.identity_pool_for_tests())
        .await
        .expect("the owner may assume the runtime session identity");

    let (system_user, session_role, current_role): (Option<String>, String, String) =
        sqlx::query_as("SELECT system_user, session_user::text, current_user::text")
            .fetch_one(db.identity_pool_for_tests())
            .await
            .expect("inspect all three PostgreSQL identities");
    assert_eq!(session_role, "ptr_clone_app");
    assert_eq!(current_role, "ptr_clone_app");
    let (method, authenticated_identity) = system_user
        .as_deref()
        .and_then(|identity| identity.split_once(':'))
        .expect("password authentication must expose method:identity");
    assert!(!method.is_empty());
    assert_eq!(authenticated_identity, "ptr_clone");

    match db
        .assert_runtime_role_is_restricted()
        .await
        .expect_err("the immutable authenticated owner identity must be rejected")
    {
        DbError::UnsafeRuntimeRole { role, reason } => {
            assert_eq!(role, "ptr_clone_app");
            assert_eq!(
                reason,
                "authentication-cycle identity does not match runtime role"
            );
        }
        other => panic!("expected an authenticated-identity rejection, got {other:?}"),
    }

    db.close().await;
}

#[tokio::test]
async fn without_a_tenant_guc_every_scoped_table_is_empty() {
    let pool = raw_pool().await;

    // The fail-closed property, stated plainly. The owner sees these rows; we see none,
    // because `enterprise_id = NULL` is never true.
    for table in [
        "rooms",
        "room_members",
        "messages",
        "alerts",
        "notes",
        "polls",
        "private_messages",
        "room_events",
    ] {
        // sqlx 0.9 refuses non-'static SQL unless the caller vouches for it. `table`
        // comes from the hardcoded list above, never from input, so this is safe.
        let count: i64 =
            sqlx::query_scalar(sqlx::AssertSqlSafe(format!("SELECT count(*) FROM {table}")))
                .fetch_one(&pool)
                .await
                .unwrap_or_else(|e| {
                    panic!("querying {table} without a GUC should succeed, not error: {e}")
                });

        assert_eq!(
            count, 0,
            "{table} leaked {count} rows to a connection with no app.enterprise_id set"
        );
    }
}

#[tokio::test]
async fn a_tenant_transaction_sees_exactly_one_enterprise() {
    let db = db().await;

    let mut acme = db
        .begin_tenant(TenantCtx::server(ACME))
        .await
        .expect("acme tenant transaction");
    let acme_rooms: Vec<(Uuid, Uuid)> = sqlx::query_as("SELECT id, enterprise_id FROM rooms")
        .fetch_all(acme.raw_for_tests())
        .await
        .expect("acme should see its own rooms");

    assert!(
        !acme_rooms.is_empty(),
        "the acme tenant must see its own rooms, otherwise this test proves nothing"
    );
    assert!(
        acme_rooms.iter().all(|(_, ent)| *ent == ACME),
        "a tenant transaction returned rows belonging to another enterprise: {acme_rooms:?}"
    );
    acme.commit().await.unwrap();

    // And the other side of the fence: beta must not see acme's room.
    let mut beta = db
        .begin_tenant(TenantCtx::server(BETA))
        .await
        .expect("beta tenant transaction");
    let acme_visible_to_beta: i64 = sqlx::query_scalar("SELECT count(*) FROM rooms WHERE id = $1")
        .bind(ACME_ROOM)
        .fetch_one(beta.raw_for_tests())
        .await
        .unwrap();
    assert_eq!(
        acme_visible_to_beta, 0,
        "beta could see an acme room; tenant isolation is broken"
    );
    beta.commit().await.unwrap();
}

#[tokio::test]
async fn an_update_scoped_to_the_wrong_tenant_touches_nothing() {
    let db = db().await;

    let mut beta = db.begin_tenant(TenantCtx::server(BETA)).await.unwrap();
    let affected = sqlx::query("UPDATE rooms SET name = 'hijacked' WHERE id = $1")
        .bind(ACME_ROOM)
        .execute(beta.raw_for_tests())
        .await
        .expect("the statement itself is legal; it simply must not match")
        .rows_affected();

    assert_eq!(
        affected, 0,
        "an UPDATE from the wrong tenant modified {affected} row(s)"
    );
    // Rolled back regardless, so a failure here cannot corrupt the fixture.
    drop(beta);

    // Prove the row is untouched, from the owning tenant's side.
    let mut acme = db.begin_tenant(TenantCtx::server(ACME)).await.unwrap();
    let name: String = sqlx::query_scalar("SELECT name FROM rooms WHERE id = $1")
        .bind(ACME_ROOM)
        .fetch_one(acme.raw_for_tests())
        .await
        .unwrap();
    assert_ne!(name, "hijacked", "the cross-tenant UPDATE actually landed");
    acme.commit().await.unwrap();
}

#[tokio::test]
async fn inserting_a_row_for_another_tenant_is_refused_by_with_check() {
    let db = db().await;

    // Beta's transaction tries to write a row stamped with acme's enterprise_id. The
    // policy's WITH CHECK clause rejects it with SQLSTATE 42501.
    let mut beta = db.begin_tenant(TenantCtx::server(BETA)).await.unwrap();
    let result = sqlx::query(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, $3, $4, '{}'::jsonb)",
    )
    .bind(ACME)
    .bind(ACME_MEMBER_USER)
    .bind("xtenant")
    .bind("cross-tenant insert")
    .execute(beta.raw_for_tests())
    .await;

    let error = result.expect_err("writing another tenant's row must not succeed");
    let mapped = DbError::from(error);
    assert!(
        matches!(mapped, DbError::RlsRejected),
        "expected an RLS rejection, got: {mapped:?}"
    );
    // And it is classified as our bug, not the user's.
    assert_eq!(mapped.code(), "internal");
}

#[tokio::test]
async fn the_tenant_guc_does_not_survive_into_the_next_transaction() {
    let db = db().await;

    // Set a tenant, then let the transaction end and the connection return to the pool.
    let acme = db.begin_tenant(TenantCtx::server(ACME)).await.unwrap();
    acme.commit().await.unwrap();

    // A subsequent un-scoped query must see nothing. If `SET LOCAL` had been a plain
    // `SET`, the GUC would still be live on this pooled connection and this would leak.
    let pool = raw_pool().await;
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM rooms")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(
        count, 0,
        "a tenant GUC survived its transaction and leaked onto a pooled connection"
    );
}

#[tokio::test]
async fn the_security_definer_resolvers_work_before_any_guc_is_set() {
    // This is the chicken-and-egg the schema solves: the tenant id lives inside a
    // tenant-scoped table, so bootstrapping must not itself require the GUC.
    let db = db().await;

    let located = db
        .locate_room_tenant(ACME_ROOM)
        .await
        .expect("resolver query should succeed")
        .expect("the seeded acme room should be locatable with no GUC set");
    assert_eq!(located.0, ACME);
    assert_eq!(located.1, "open");

    let membership = db
        .resolve_membership(ACME_MEMBER_USER, ACME_ROOM)
        .await
        .expect("resolver query should succeed")
        .expect("the seeded member should resolve with no GUC set");
    assert_eq!(membership.enterprise_id, ACME);
    assert_eq!(membership.member_role, "member");
}

#[tokio::test]
async fn private_messages_require_the_member_guc_not_just_the_tenant() {
    let db = db().await;
    let pool = raw_pool().await;

    // Seed nothing; just assert the policy shape holds for whatever is there. Server
    // context (member_id = '') applies the tenant check only.
    let mut server = db.begin_tenant(TenantCtx::server(ACME)).await.unwrap();
    let as_server: i64 = sqlx::query_scalar("SELECT count(*) FROM private_messages")
        .fetch_one(server.raw_for_tests())
        .await
        .unwrap();
    server.commit().await.unwrap();

    // A member context can only ever see PMs they sent or received, so it can never
    // exceed the server-context count.
    let stranger = Uuid::new_v4();
    let mut as_member_tx = db
        .begin_tenant(TenantCtx::member(ACME, stranger))
        .await
        .unwrap();
    let as_member: i64 = sqlx::query_scalar("SELECT count(*) FROM private_messages")
        .fetch_one(as_member_tx.raw_for_tests())
        .await
        .unwrap();
    as_member_tx.commit().await.unwrap();

    assert_eq!(
        as_member, 0,
        "a member who is party to no conversation saw {as_member} private message(s)"
    );
    assert!(
        as_member <= as_server,
        "the participant policy is looser than the tenant policy"
    );

    // Sanity: with no GUC at all, still nothing.
    let unscoped: i64 = sqlx::query_scalar("SELECT count(*) FROM private_messages")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(unscoped, 0);
}

#[tokio::test]
async fn session_guards_are_applied_to_every_pooled_connection() {
    // statement_timeout and friends are set in after_connect rather than per query, so a
    // new query cannot opt out of them by forgetting.
    let db = db().await;
    let mut tx = db.begin_tenant(TenantCtx::server(ACME)).await.unwrap();

    let row = sqlx::query(
        "SELECT current_setting('statement_timeout') AS s, current_setting('lock_timeout') AS l",
    )
    .fetch_one(tx.raw_for_tests())
    .await
    .unwrap();

    assert_eq!(row.get::<String, _>("s"), "5s");
    assert_eq!(row.get::<String, _>("l"), "2s");
    tx.commit().await.unwrap();
}
