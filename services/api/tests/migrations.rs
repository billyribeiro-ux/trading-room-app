//! Migrations and the prohibition on baseline adoption, proven against PostgreSQL 17.
//!
//! Nothing here is mocked, and nothing here touches the seeded `ptr_clone` database:
//! each test creates its own scratch database, does its work, and drops it. That keeps
//! these tests hermetic and parallel-safe while still exercising the real DDL - the
//! baseline is 1960 lines of it, and the only honest way to know it applies is to apply it.
//!
//! These connect as the **owner** (`ptr_clone`), because that is who migrations run as: a
//! `FORCE ROW LEVEL SECURITY` table can only be altered by the role that owns it, and
//! `CREATE DATABASE` needs `CREATEDB`. The runtime role deliberately has neither.
//!
//! Run with:
//!   MIGRATE_DATABASE_URL='postgres://ptr_clone:<pw>@127.0.0.1:5432/ptr_clone' \
//!     cargo test --locked -p tradingroom-api --features testing --test migrations

use sqlx::postgres::PgPoolOptions;
use sqlx::{Executor, PgPool};
use std::process::Command;
use tradingroom_api::db::migrate::{self, BASELINE_VERSION, MigrateError};
use tradingroom_api::db::{Db, DbError};
use tradingroom_api::limits;
use uuid::Uuid;

mod support;
use support::{Scratch, owner_url, scratch_url};

const RUNTIME_HARDENING_SQL: &str =
    include_str!("../migrations/0005_harden_runtime_role_and_room_events_policy.sql");
const OBJECT_PRIVILEGE_HARDENING_SQL: &str =
    include_str!("../migrations/0006_restrict_runtime_object_privileges.sql");
const MIGRATE_BINARY_SOURCE: &str = include_str!("../src/bin/migrate.rs");
const MIGRATE_MODULE_SOURCE: &str = include_str!("../src/db/migrate.rs");

fn runtime_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://tradingroom_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

/// What `0001_baseline.sql` alone creates in `public`.
const BASELINE_PUBLIC_TABLES: i64 = 23;
/// ...and how many of those carry FORCE ROW LEVEL SECURITY.
const BASELINE_FORCE_RLS: i64 = 20;

/// What the **whole** migration set leaves behind: twelve tenant tables plus the two owner-only
/// Gate 3 conversion-ledger tables. Spelled as `BASELINE + n` rather than as a literal so a table
/// addition is a deliberate review point instead of a count somebody updates without reading.
const MIGRATED_PUBLIC_TABLES: i64 = BASELINE_PUBLIC_TABLES + 14;
/// The twelve request-path tables are FORCE RLS. The two conversion tables deliberately are not:
/// they are offline owner-only operational evidence and the runtime role receives no privilege.
const MIGRATED_FORCE_RLS: i64 = BASELINE_FORCE_RLS + 12;

async fn public_table_count(pool: &PgPool) -> i64 {
    sqlx::query_scalar(
        "SELECT count(*) FROM pg_tables \
         WHERE schemaname = 'public' AND tablename <> '_sqlx_migrations'",
    )
    .fetch_one(pool)
    .await
    .expect("count public tables")
}

async fn force_rls_count(pool: &PgPool) -> i64 {
    sqlx::query_scalar(
        "SELECT count(*) FROM pg_class c \
         JOIN pg_namespace n ON n.oid = c.relnamespace \
         WHERE n.nspname = 'public' AND c.relforcerowsecurity",
    )
    .fetch_one(pool)
    .await
    .expect("count FORCE RLS tables")
}

/// Whether a role exists at all.
///
/// `has_table_privilege` takes a role NAME and errors — it does not answer `false` — when no such
/// role exists. So every assertion below about what `ptr_clone_app` may not do stops being an
/// assertion the moment that role is retired, and starts being a panic.
///
/// `0010_retire_ptr_clone_app.sql` revokes every privilege the baseline role holds in the database
/// it runs on and deliberately does NOT drop the role, because a dropped cluster-global role is not
/// convergent — `migration_reappliability.rs` is where that was measured. So on an ordinary cluster
/// the role is still present here and the branch below is not taken.
///
/// It is taken on the end state the migration documents: once a cluster will take no further new
/// databases, an operator may finish the retirement with `DROP ROLE ptr_clone_app`. Guarding for
/// that is not speculative — it is the difference between this file asserting on that cluster and
/// panicking on it.
async fn role_exists(pool: &PgPool, role: &str) -> bool {
    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1)")
        .bind(role)
        .fetch_one(pool)
        .await
        .unwrap_or_else(|error| panic!("look up role {role}: {error}"))
}

/// `server_version_num` — 160013 for PostgreSQL 16.13, 170000 and up for 17.
///
/// Read rather than assumed because the privilege list below is not the same on both, and the
/// difference is not cosmetic: `has_table_privilege` RAISES on a privilege name the server does not
/// know, so a version-blind list turns one absent keyword into a panic that hides every other
/// assertion in this test.
async fn server_version_num(pool: &PgPool) -> i32 {
    sqlx::query_scalar("SELECT current_setting('server_version_num')::int")
        .fetch_one(pool)
        .await
        .expect("read server_version_num")
}

/// PostgreSQL 17 introduced the `MAINTAIN` privilege (VACUUM, ANALYZE, REINDEX, CLUSTER, REFRESH).
const MAINTAIN_MINIMUM_VERSION: i32 = 170_000;

/// Whether this server knows `MAINTAIN` at all, asserted rather than inferred from the version.
///
/// ── WHY BOTH HALVES ARE CHECKED ──────────────────────────────────────────────────────────────
///
/// `services/compose.yml` pins `postgres:17`, so `MAINTAIN` is a privilege the deployed server has
/// and `ptr_clone_app` must not hold it. A developer cluster may be older — this test first ran
/// against 16.13 on 2026-08-31 and died with *"unrecognized privilege type: MAINTAIN"*, taking the
/// other 21 privilege assertions with it.
///
/// Dropping the keyword on an old server would be a silent skip, and a silent skip on the privilege
/// with the widest blast radius is the shape this repository refuses. So the old branch asserts the
/// REASON it is skipping: that the server genuinely does not know the name. If a future PostgreSQL
/// renumbers or renames it, this fails on the mismatch instead of quietly stopping checking.
async fn maintain_is_supported(pool: &PgPool, role: &str, table: &str) -> bool {
    let supported = server_version_num(pool).await >= MAINTAIN_MINIMUM_VERSION;

    let probe: Result<bool, sqlx::Error> =
        sqlx::query_scalar("SELECT has_table_privilege($1, $2, 'MAINTAIN')")
            .bind(role)
            .bind(table)
            .fetch_one(pool)
            .await;

    match (supported, &probe) {
        (true, Ok(_)) => true,
        (false, Err(error)) => {
            let code = error
                .as_database_error()
                .and_then(|database_error| database_error.code())
                .map(|code| code.into_owned());
            assert_eq!(
                code.as_deref(),
                Some("22023"),
                "a server below {MAINTAIN_MINIMUM_VERSION} must reject MAINTAIN as an invalid \
                 parameter value; got {error}"
            );
            false
        }
        (true, Err(error)) => panic!(
            "this server reports {MAINTAIN_MINIMUM_VERSION}+ but does not know MAINTAIN: {error}"
        ),
        (false, Ok(_)) => panic!(
            "this server is below {MAINTAIN_MINIMUM_VERSION} and knows MAINTAIN anyway; the \
             version gate above is wrong and would skip a real privilege on some cluster"
        ),
    }
}

/// The role is a PARAMETER now, and that is the whole point of this file after `0010`.
///
/// Both helpers named `ptr_clone_app` in their SQL until 2026-08-31, from when it was the only role
/// with grants. `0009` mirrored the reviewed surface onto `tradingroom_app` and `0010` revoked the
/// baseline role's copy, so a hardcoded name now asks the wrong question twice over: it asserts the
/// runtime surface against a role that no longer has it, and never asserts it against the role that
/// does. Measured on a live cluster after the whole chain: `tradingroom_app` holds exactly
/// `enterprises.id: SELECT` at column scope, and `ptr_clone_app` holds none of the four privileges
/// on any column of the three tables below.
async fn has_table_privilege(pool: &PgPool, role: &str, table: &str, privilege: &str) -> bool {
    sqlx::query_scalar("SELECT has_table_privilege($1, $2, $3)")
        .bind(role)
        .bind(table)
        .bind(privilege)
        .fetch_one(pool)
        .await
        .unwrap_or_else(|error| panic!("inspect {privilege} on {table} for {role}: {error}"))
}

async fn has_column_privilege(
    pool: &PgPool,
    role: &str,
    table: &str,
    column: &str,
    privilege: &str,
) -> bool {
    sqlx::query_scalar("SELECT has_column_privilege($1, $2, $3, $4)")
        .bind(role)
        .bind(table)
        .bind(column)
        .bind(privilege)
        .fetch_one(pool)
        .await
        .unwrap_or_else(|error| {
            panic!("inspect {privilege} on {table}.{column} for {role}: {error}")
        })
}

fn assert_insufficient_privilege(error: sqlx::Error, operation: &str) {
    let code = error
        .as_database_error()
        .and_then(|database_error| database_error.code())
        .map(|code| code.into_owned());
    assert_eq!(
        code.as_deref(),
        Some("42501"),
        "{operation} must fail with insufficient_privilege, got {error}"
    );
}

#[test]
fn the_runtime_hardening_migration_is_explicit_and_fail_closed() {
    for required in [
        "ALTER ROLE ptr_clone_app WITH",
        "NOSUPERUSER",
        "NOCREATEDB",
        "NOCREATEROLE",
        "NOINHERIT",
        "NOREPLICATION",
        "NOBYPASSRLS",
        "LOCK TABLE pg_catalog.pg_authid IN SHARE ROW EXCLUSIVE MODE",
        "FROM pg_catalog.pg_auth_members AS membership",
        "TO ptr_clone_app",
        "USING (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)",
        "WITH CHECK (enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid)",
    ] {
        assert!(
            RUNTIME_HARDENING_SQL.contains(required),
            "hardening migration is missing `{required}`"
        );
    }

    assert!(
        !RUNTIME_HARDENING_SQL.contains("TO PUBLIC"),
        "the room_events policy must never target PUBLIC"
    );
    assert_eq!(
        RUNTIME_HARDENING_SQL
            .match_indices("CREATE POLICY room_events_tenant_isolation")
            .count(),
        1,
        "the migration must create one auditable replacement policy"
    );
}

#[test]
fn the_object_privilege_migration_is_explicit_and_column_scoped() {
    for required in [
        "REVOKE ALL PRIVILEGES ON TABLE public.enterprises FROM ptr_clone_app",
        "REVOKE ALL PRIVILEGES ON TABLE public.users FROM ptr_clone_app",
        "REVOKE ALL PRIVILEGES ON TABLE public.audit_log FROM ptr_clone_app",
        "GRANT SELECT (id)",
        "GRANT INSERT (",
        "GRANT UPDATE (",
        "ON TABLE public.audit_log TO ptr_clone_app",
    ] {
        assert!(
            OBJECT_PRIVILEGE_HARDENING_SQL.contains(required),
            "object-privilege migration is missing `{required}`"
        );
    }

    for forbidden in [
        "GRANT ALL",
        "GRANT DELETE",
        "GRANT SELECT ON TABLE public.users",
        "GRANT UPDATE ON TABLE public.users",
        "GRANT INSERT ON TABLE public.audit_log",
    ] {
        assert!(
            !OBJECT_PRIVILEGE_HARDENING_SQL.contains(forbidden),
            "object-privilege migration restored broad privilege `{forbidden}`"
        );
    }
}

#[test]
fn the_migration_boundary_preflights_and_exposes_no_adoption_path() {
    MIGRATE_BINARY_SOURCE
        .find("migrate::run(&pool).await?;")
        .expect("the migration binary must retain normal execution");
    assert!(
        !MIGRATE_BINARY_SOURCE.contains("migrate::preflight"),
        "the CLI must not own a separate, bypassable preflight"
    );

    let run_start = MIGRATE_MODULE_SOURCE
        .find("pub async fn run(pool: &PgPool)")
        .expect("the migration module must expose the guarded run boundary");
    let guarded_run = &MIGRATE_MODULE_SOURCE[run_start..];
    let preflight = guarded_run
        .find("preflight_for_roles_on_connection(")
        .expect("run must perform the connection-scoped preflight itself");
    let event = guarded_run
        .find("migration identity and runtime-role preflight passed")
        .expect("run must emit the successful preflight event");
    let execution = guarded_run
        .find("MIGRATOR.run(&mut *connection).await?;")
        .expect("run must execute SQLx migrations on the preflighted connection");

    assert_eq!(
        guarded_run
            .match_indices("preflight_for_roles_on_connection(")
            .count(),
        1,
        "run should have one unambiguous preflight"
    );
    assert!(
        preflight < event && event < execution,
        "run must preflight, emit success, and only then execute MIGRATOR on that connection"
    );

    for forbidden in ["--adopt", "Adoption", "migrate::adopt"] {
        assert!(
            !MIGRATE_BINARY_SOURCE.contains(forbidden),
            "the migration CLI restored forbidden adoption surface `{forbidden}`"
        );
    }
    for forbidden in ["pub async fn adopt", ".skip(", "Adoption"] {
        assert!(
            !MIGRATE_MODULE_SOURCE.contains(forbidden),
            "the migration module restored forbidden adoption primitive `{forbidden}`"
        );
    }
}

#[test]
fn the_migration_cli_rejects_the_removed_adoption_flag_before_connecting() {
    let output = Command::new(env!("CARGO_BIN_EXE_migrate"))
        .arg("--adopt")
        .env_remove("MIGRATE_DATABASE_URL")
        .env_remove("DATABASE_URL")
        .output()
        .expect("execute the migration binary");

    assert!(!output.status.success(), "a removed flag must fail closed");
    let stderr = String::from_utf8(output.stderr).expect("migration errors are UTF-8");
    assert!(
        stderr.contains("unrecognised argument \"--adopt\"; usage: migrate"),
        "the CLI must reject adoption explicitly: {stderr}"
    );
    assert!(
        !stderr.contains("MIGRATE_DATABASE_URL"),
        "argument rejection must happen before database configuration: {stderr}"
    );
}

#[tokio::test]
async fn run_rejects_a_non_owner_before_creating_the_migration_ledger() {
    let scratch = Scratch::create().await;
    let runtime_database_url = scratch_url(&runtime_url(), &scratch.name);
    let runtime = PgPool::connect(&runtime_database_url)
        .await
        .expect("connect the runtime identity to the empty scratch database");

    let error = migrate::run(&runtime)
        .await
        .expect_err("run itself must reject a non-owner identity");
    runtime.close().await;

    match error {
        MigrateError::UnexpectedMigratorIdentity {
            expected,
            session_role,
            current_role,
        } => {
            // The accepted MIGRATOR identities, exactly as `run`'s preflight announces them.
            // Bound to the allow-list rather than a literal: this line said only `ptr_clone` and
            // went red on the first live run after the owner cutover staged a second accepted
            // name — the very staleness the comment below records catching once already for the
            // runtime role. The two `preflight_for_tests` cases further down keep their literal,
            // correctly: they hand the preflight ONE owner name and assert it is echoed back.
            assert_eq!(expected, migrate::ACCEPTED_MIGRATOR_ROLES.join(" or "));
            // The connected identity is the RUNTIME role, whatever it is currently named. Bound to
            // the constant rather than a literal, because these two went stale the moment the
            // runtime role was cut over and asserted a role nothing connects as.
            assert_eq!(session_role, migrate::EXPECTED_RUNTIME_ROLE);
            assert_eq!(current_role, migrate::EXPECTED_RUNTIME_ROLE);
        }
        other => panic!("expected a migrator-identity rejection, got {other}"),
    }

    let owner = scratch.pool().await;
    let ledger: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations')::text")
            .fetch_one(&owner)
            .await
            .expect("inspect the empty scratch database as owner");
    assert!(
        ledger.is_none(),
        "identity rejection must happen before SQLx creates its ledger"
    );

    scratch.finish(owner).await;
}

#[cfg(feature = "testing")]
#[tokio::test]
async fn preflight_accepts_only_the_provisioned_owner_connection() {
    let owner = PgPool::connect(&owner_url())
        .await
        .expect("connect as migration owner");
    migrate::preflight_for_tests(&owner, "ptr_clone", "ptr_clone_app")
        .await
        .expect("the provisioned owner and runtime role must pass preflight");
    owner.close().await;

    let runtime = PgPool::connect(&runtime_url())
        .await
        .expect("connect as runtime role");
    let error = migrate::preflight_for_tests(&runtime, "ptr_clone", "ptr_clone_app")
        .await
        .expect_err("the runtime login must never migrate");
    runtime.close().await;

    match error {
        MigrateError::UnexpectedMigratorIdentity {
            expected,
            session_role,
            current_role,
        } => {
            assert_eq!(expected, "ptr_clone");
            // The connected identity is the RUNTIME role, whatever it is currently named. Bound to
            // the constant rather than a literal, because these two went stale the moment the
            // runtime role was cut over and asserted a role nothing connects as.
            assert_eq!(session_role, migrate::EXPECTED_RUNTIME_ROLE);
            assert_eq!(current_role, migrate::EXPECTED_RUNTIME_ROLE);
        }
        other => panic!("expected a migrator-identity rejection, got {other}"),
    }

    let role_switched = PgPoolOptions::new()
        .max_connections(1)
        .after_connect(|connection, _metadata| {
            Box::pin(async move {
                connection.execute("SET ROLE ptr_clone_app").await?;
                Ok(())
            })
        })
        .connect(&owner_url())
        .await
        .expect("connect as owner and select the runtime role");
    let error = migrate::preflight_for_tests(&role_switched, "ptr_clone", "ptr_clone_app")
        .await
        .expect_err("current_user must remain the authenticated migration owner");
    role_switched.close().await;

    match error {
        MigrateError::UnexpectedMigratorIdentity {
            expected,
            session_role,
            current_role,
        } => {
            assert_eq!(expected, "ptr_clone");
            assert_eq!(session_role, "ptr_clone");
            assert_eq!(current_role, "ptr_clone_app");
        }
        other => panic!("expected a current-role rejection, got {other}"),
    }
}

#[cfg(feature = "testing")]
#[tokio::test]
async fn preflight_uses_the_immutable_authentication_identity() {
    let session_switched = PgPoolOptions::new()
        .max_connections(1)
        .after_connect(|connection, _metadata| {
            Box::pin(async move {
                connection
                    .execute("SET SESSION AUTHORIZATION ptr_clone_app")
                    .await?;
                Ok(())
            })
        })
        .connect(&owner_url())
        .await
        .expect("authenticate as owner and replace both mutable SQL identities");

    let error = migrate::preflight_for_tests(&session_switched, "ptr_clone_app", "ptr_clone_app")
        .await
        .expect_err("system_user must expose the original authenticated owner");
    session_switched.close().await;

    match error {
        MigrateError::UnexpectedMigratorIdentity {
            expected,
            session_role,
            current_role,
        } => {
            assert_eq!(expected, "ptr_clone_app");
            // Literals on purpose, and NOT the runtime-role constant. This test drives
            // `SET SESSION AUTHORIZATION ptr_clone_app` explicitly and passes that same name to
            // `preflight_for_tests`, to prove `system_user` still reports the originally
            // authenticated owner after both mutable SQL identities have been replaced. The name is
            // the fixture here, not the deployment's runtime identity.
            assert_eq!(session_role, "ptr_clone_app");
            assert_eq!(current_role, "ptr_clone_app");
        }
        other => panic!("expected an authenticated-identity rejection, got {other}"),
    }
}

#[cfg(feature = "testing")]
#[tokio::test]
async fn preflight_rejects_absent_and_unsafe_isolated_runtime_roles() {
    let owner = PgPool::connect(&owner_url())
        .await
        .expect("connect as migration owner");
    let suffix = Uuid::new_v4().simple().to_string();
    let runtime_role = format!("preflight_runtime_{suffix}");
    let granted_role = format!("preflight_granted_{suffix}");

    let absent = migrate::preflight_for_tests(&owner, "ptr_clone", &runtime_role).await;

    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "CREATE ROLE \"{runtime_role}\" WITH LOGIN NOSUPERUSER NOCREATEDB \
             NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS"
        )))
        .await
        .expect("create an isolated unsafe role");
    let unsafe_posture = migrate::preflight_for_tests(&owner, "ptr_clone", &runtime_role).await;

    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "ALTER ROLE \"{runtime_role}\" NOINHERIT"
        )))
        .await
        .expect("make the isolated role restricted");
    let restricted = migrate::preflight_for_tests(&owner, "ptr_clone", &runtime_role).await;

    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "CREATE ROLE \"{granted_role}\" WITH NOLOGIN"
        )))
        .await
        .expect("create an isolated granted role");
    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "GRANT \"{granted_role}\" TO \"{runtime_role}\""
        )))
        .await
        .expect("grant the isolated membership");
    let membership = migrate::preflight_for_tests(&owner, "ptr_clone", &runtime_role).await;
    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "REVOKE \"{granted_role}\" FROM \"{runtime_role}\""
        )))
        .await
        .expect("revoke the isolated membership");

    owner
        .execute(sqlx::AssertSqlSafe(format!("DROP ROLE \"{runtime_role}\"")))
        .await
        .expect("drop the isolated role");
    owner
        .execute(sqlx::AssertSqlSafe(format!("DROP ROLE \"{granted_role}\"")))
        .await
        .expect("drop the isolated granted role");
    owner.close().await;

    restricted.expect("the complete isolated posture must pass");

    match absent {
        Err(MigrateError::RuntimeRoleMissing { role }) => assert_eq!(role, runtime_role),
        other => panic!("expected a missing-role rejection, got {other:?}"),
    }
    match unsafe_posture {
        Err(MigrateError::UnsafeRuntimeRole { role, reason }) => {
            assert_eq!(role, runtime_role);
            assert_eq!(reason, "INHERIT permits privilege expansion");
        }
        other => panic!("expected an unsafe-role rejection, got {other:?}"),
    }
    match membership {
        Err(MigrateError::UnsafeRuntimeRole { role, reason }) => {
            assert_eq!(role, runtime_role);
            assert_eq!(reason, "role memberships permit privilege expansion");
        }
        other => panic!("expected a membership rejection, got {other:?}"),
    }
}

/// `(success, execution_time)` for the baseline row, if it exists.
async fn ledger_row(pool: &PgPool) -> Option<(bool, i64)> {
    sqlx::query_as("SELECT success, execution_time FROM _sqlx_migrations WHERE version = $1")
        .bind(BASELINE_VERSION)
        .fetch_optional(pool)
        .await
        .expect("read the migration ledger")
}

/// Every room-scoped table pairs its tenant keys.
///
/// This is the invariant `saved_polls` and `room_events` both missed, and it is catalog-driven
/// rather than a list so a table added tomorrow is covered without anyone remembering to add it
/// here.
///
/// The failure it prevents is specific. With two INDEPENDENT foreign keys - `enterprise_id` to
/// `enterprises`, `room_id` to `rooms` - each is satisfiable alone, so a row may hold tenant A's
/// `enterprise_id` beside tenant B's `room_id`. RLS compares only `enterprise_id` against the
/// GUC, which such a row passes, so it reads back as tenant A's while pointing into tenant B's
/// room. Pairing the columns into one key makes the mismatch unrepresentable.
#[tokio::test]
async fn every_room_scoped_table_pairs_its_tenant_keys() {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;
    migrate::run(&pool).await.expect("migrations should apply");

    // A table is room-scoped if it carries both columns. Discovered, never listed.
    let room_scoped: Vec<String> = sqlx::query_scalar(
        "SELECT c.relname::text \
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace \
         WHERE n.nspname = 'public' AND c.relkind = 'r' \
           AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid \
                         AND a.attname = 'enterprise_id' AND NOT a.attisdropped) \
           AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid \
                         AND a.attname = 'room_id' AND NOT a.attisdropped) \
         ORDER BY c.relname",
    )
    .fetch_all(&pool)
    .await
    .expect("list the room-scoped tables");

    assert!(
        room_scoped.len() >= 18,
        "expected the full set of room-scoped tables, found {}: {room_scoped:?}",
        room_scoped.len()
    );

    for table in &room_scoped {
        let paired: bool = sqlx::query_scalar(
            "SELECT EXISTS ( \
               SELECT 1 FROM pg_constraint f \
               WHERE f.conrelid = $1::regclass AND f.contype = 'f' \
                 AND f.confrelid = 'public.rooms'::regclass \
                 AND array_length(f.conkey, 1) = 2 \
             )",
        )
        .bind(format!("public.{table}"))
        .fetch_one(&pool)
        .await
        .expect("inspect the room foreign key");

        assert!(
            paired,
            "{table} references rooms with a single-column key. Pair it: \
             FOREIGN KEY (enterprise_id, room_id) REFERENCES rooms(enterprise_id, id)"
        );
    }

    // A UNIQUE or PRIMARY KEY over `(enterprise_id, id)` is what lets a table be the TARGET of a
    // composite tenant key. `alert_media` is the one exception, and it is a faithful one: the
    // reference schema does not give it that constraint either - `second-dump/db/unique.tsv`
    // lists only `alert_media_alert_position_unique` and `alert_media_uploaded_file_unique`, and
    // nothing references alert_media by id.
    for table in room_scoped.iter().filter(|name| *name != "alert_media") {
        let has_tenant_key: bool = sqlx::query_scalar(
            "SELECT EXISTS ( \
               SELECT 1 FROM pg_constraint u \
               WHERE u.conrelid = $1::regclass AND u.contype IN ('u', 'p') \
                 AND u.conkey = ARRAY[ \
                       (SELECT attnum FROM pg_attribute \
                         WHERE attrelid = $1::regclass AND attname = 'enterprise_id'), \
                       (SELECT attnum FROM pg_attribute \
                         WHERE attrelid = $1::regclass AND attname = 'id')]::smallint[] \
             )",
        )
        .bind(format!("public.{table}"))
        .fetch_one(&pool)
        .await
        .expect("inspect the tenant unique key");

        assert!(
            has_tenant_key,
            "{table} is missing UNIQUE/PRIMARY KEY (enterprise_id, id), so nothing can reference it \
             tenant-safely"
        );
    }
}

/// A cross-tenant row is refused by the schema, not merely unreachable through the handlers.
///
/// The distinction matters: every handler today takes both ids from one resolved `RoomMember`, so
/// the mismatch cannot be produced through the API. This asserts the floor underneath that - the
/// day a background job, an import or a repair script writes the pair directly, the database is
/// what says no.
#[tokio::test]
async fn a_room_event_cannot_point_at_another_tenants_room() {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;
    migrate::run(&pool).await.expect("migrations should apply");

    let enterprise: uuid::Uuid =
        sqlx::query_scalar("INSERT INTO enterprises (name, slug) VALUES ('A', 'a') RETURNING id")
            .fetch_one(&pool)
            .await
            .expect("seed an enterprise");
    let other: uuid::Uuid =
        sqlx::query_scalar("INSERT INTO enterprises (name, slug) VALUES ('B', 'b') RETURNING id")
            .fetch_one(&pool)
            .await
            .expect("seed the other enterprise");

    let owner: uuid::Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('owner@example.test', 'h', 'Owner') RETURNING id",
    )
    .fetch_one(&pool)
    .await
    .expect("seed a user");

    let other_room: uuid::Uuid = sqlx::query_scalar(
        // The minimum `config` that satisfies the four `rooms_access_tiers_*` checks: they all
        // count matches against `config #> '{access,tiers}'`, and an absent key is NULL rather
        // than an empty array, which `rooms_access_tiers_array_check` coalesces to false.
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, 'brm', 'B room', '{\"access\":{\"tiers\":[]}}'::jsonb) RETURNING id",
    )
    .bind(other)
    .bind(owner)
    .fetch_one(&pool)
    .await
    .expect("seed the other tenant's room");

    // Enterprise A's id beside enterprise B's room. Each column alone is valid.
    let refused = sqlx::query(
        "INSERT INTO room_events (enterprise_id, room_id, type, scope, payload) \
         VALUES ($1, $2, 'probe', 'room', '{}'::jsonb)",
    )
    .bind(enterprise)
    .bind(other_room)
    .execute(&pool)
    .await;

    let error = refused.expect_err("a cross-tenant room event must be refused");
    let text = error.to_string();
    assert!(
        text.contains("room_events_tenant_room_fk"),
        "expected the paired key to refuse it, got: {text}"
    );
}

#[tokio::test]
async fn the_baseline_applies_cleanly_to_an_empty_database() {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;

    let ledger: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations')::text")
            .fetch_one(&pool)
            .await
            .expect("inspect the empty scratch database");
    assert!(
        ledger.is_none(),
        "the scratch database must begin without a migration ledger"
    );
    migrate::run(&pool)
        .await
        .expect("the baseline should apply");

    // `migrate::run` applies the whole set, so this is the post-migration shape: the 23 tables
    // pinned by the baseline plus twelve request-path additions and two owner-only conversion
    // ledgers. Migrations 0018 through 0021 add badge, administrator, customer API-key authority,
    // and the customer API visit ledger (including append-only mutation evidence);
    // 0014 and 0015 add room columns/indexes and a bounded function, not tables.
    assert_eq!(
        public_table_count(&pool).await,
        MIGRATED_PUBLIC_TABLES,
        "every migration must leave exactly the tables it claims"
    );
    assert_eq!(
        force_rls_count(&pool).await,
        MIGRATED_FORCE_RLS,
        "every tenant-scoped table must carry FORCE ROW LEVEL SECURITY; fewer means one of \
         them is not actually isolated"
    );

    let policy_roles: Vec<String> = sqlx::query_scalar(
        "SELECT policy_role::text \
         FROM pg_catalog.pg_policies, unnest(roles) AS policy_role \
         WHERE schemaname = 'public' \
           AND tablename = 'room_events' \
           AND policyname = 'room_events_tenant_isolation' \
         ORDER BY policy_role::text",
    )
    .fetch_all(&pool)
    .await
    .expect("read room_events policy roles");
    assert_eq!(
        policy_roles,
        // EXACTLY ONE name, and it is the runtime role.
        //
        // An earlier revision of this assertion expected BOTH names, because `0009` appended the
        // runtime role rather than retargeting, and the comment here argued that a policy which
        // stopped naming `ptr_clone_app` would "silently deny" it. That reasoning was backwards on
        // both counts. Denying the baseline role is the POINT — nothing connects as it after
        // cutover, and a role named by no policy reads zero rows under FORCE ROW LEVEL SECURITY,
        // which is the safe direction. And appending was not even convergent-neutral: it produced a
        // two-role tenant policy, which `postgres-release-attestation` rejects outright with
        // `room_events_policy_mismatch`.
        //
        // Retargeting is convergent because policies are PER-DATABASE: `0001` re-creates each one
        // naming the baseline role on every new database, and `0009` retargets it there too.
        [migrate::EXPECTED_RUNTIME_ROLE],
        "the outbox policy must apply to exactly the runtime roles, and no others"
    );

    let policy_shape: (String, String) = sqlx::query_as(
        "SELECT permissive, cmd \
         FROM pg_catalog.pg_policies \
         WHERE schemaname = 'public' \
           AND tablename = 'room_events' \
           AND policyname = 'room_events_tenant_isolation'",
    )
    .fetch_one(&pool)
    .await
    .expect("read room_events policy shape");
    assert_eq!(policy_shape, ("PERMISSIVE".into(), "ALL".into()));

    let room_events_rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity \
         FROM pg_catalog.pg_class \
         WHERE oid = 'public.room_events'::regclass",
    )
    .fetch_one(&pool)
    .await
    .expect("read room_events RLS flags");
    assert_eq!(
        room_events_rls,
        (true, true),
        "room_events must keep ENABLE and FORCE ROW LEVEL SECURITY"
    );

    let posture: (bool, bool, bool, bool, bool, bool, bool, i64) = sqlx::query_as(
        "SELECT runtime_role.rolcanlogin, runtime_role.rolsuper, runtime_role.rolcreatedb, \
                runtime_role.rolcreaterole, runtime_role.rolinherit, \
                runtime_role.rolreplication, runtime_role.rolbypassrls, \
                (SELECT count(*) \
                 FROM pg_catalog.pg_auth_members AS membership \
                 WHERE membership.member = runtime_role.oid)::bigint \
         FROM pg_catalog.pg_roles AS runtime_role \
         WHERE runtime_role.rolname = 'ptr_clone_app'",
    )
    .fetch_one(&pool)
    .await
    .expect("read runtime-role posture");
    assert_eq!(
        posture,
        (true, false, false, false, false, false, false, 0),
        "migrations must leave a restricted, membership-free runtime role"
    );

    // Applied for real, so the execution time is a genuine measurement, not the -1 marker.
    let (success, execution_time) = ledger_row(&pool).await.expect("the baseline is recorded");
    assert!(success);
    assert!(
        execution_time > 0,
        "a migration that actually ran must record its duration, got {execution_time}"
    );

    scratch.finish(pool).await;
}

#[tokio::test]
async fn room_lifecycle_columns_are_nullable_indexed_and_enterprise_idempotent() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let columns: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT column_name::text, is_nullable::text, data_type::text \
         FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = 'rooms' \
           AND column_name IN ('archived_at', 'creation_request_id') \
         ORDER BY column_name",
    )
    .fetch_all(&owner)
    .await
    .expect("inspect canonical room lifecycle columns");
    assert_eq!(
        columns,
        [
            (
                "archived_at".into(),
                "YES".into(),
                "timestamp with time zone".into(),
            ),
            ("creation_request_id".into(), "YES".into(), "uuid".into()),
        ]
    );

    let indexes: Vec<String> = sqlx::query_scalar(
        "SELECT indexname::text FROM pg_indexes \
         WHERE schemaname = 'public' AND tablename = 'rooms' \
           AND indexname IN (\
             'rooms_enterprise_creation_request_unique',\
             'rooms_enterprise_archived_name_idx'\
           ) ORDER BY indexname",
    )
    .fetch_all(&owner)
    .await
    .expect("inspect canonical room lifecycle indexes");
    assert_eq!(
        indexes,
        [
            "rooms_enterprise_archived_name_idx",
            "rooms_enterprise_creation_request_unique",
        ]
    );

    let enterprise: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Room Idempotency', 'room-idempotency') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create room-idempotency account");
    let user: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('room-idempotency@example.test', md5('room-idempotency@example.test'), 'Owner') \
         RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create room-idempotency owner");
    let request_id = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO rooms \
           (enterprise_id, owner_id, uuid_short, name, config, creation_request_id) \
         VALUES ($1, $2, 'idem-a', 'First', '{\"access\":{\"tiers\":[]}}'::jsonb, $3)",
    )
    .bind(enterprise)
    .bind(user)
    .bind(request_id)
    .execute(&owner)
    .await
    .expect("create the first room for an idempotency key");

    let duplicate = sqlx::query(
        "INSERT INTO rooms \
           (enterprise_id, owner_id, uuid_short, name, config, creation_request_id) \
         VALUES ($1, $2, 'idem-b', 'Duplicate', '{\"access\":{\"tiers\":[]}}'::jsonb, $3)",
    )
    .bind(enterprise)
    .bind(user)
    .bind(request_id)
    .execute(&owner)
    .await
    .expect_err("one enterprise creation request must identify only one room");
    assert_eq!(
        duplicate
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23505")
    );

    scratch.finish(owner).await;
}

#[tokio::test]
async fn room_settings_revision_and_mutation_ledger_are_bounded_append_only_and_tenant_hardened() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let revision: (String, String) = sqlx::query_as(
        "SELECT is_nullable::text, column_default::text \
         FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = 'rooms' \
           AND column_name = 'settings_revision'",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect canonical settings revision");
    assert_eq!(revision, ("NO".into(), "0".into()));

    let constraints: Vec<String> = sqlx::query_scalar(
        "SELECT conname::text FROM pg_constraint \
         WHERE conrelid IN ('public.rooms'::regclass, 'public.room_setting_mutations'::regclass) \
           AND conname IN (\
             'rooms_settings_revision_nonnegative', 'rooms_settings_object_check', \
             'room_setting_mutations_tenant_id_unique', 'room_setting_mutations_room_fk', \
             'room_setting_mutations_actor_fk', 'room_setting_mutations_digest_check', \
             'room_setting_mutations_revision_check'\
           ) ORDER BY conname",
    )
    .fetch_all(&owner)
    .await
    .expect("inspect settings constraints");
    assert_eq!(
        constraints.len(),
        7,
        "every settings invariant must be installed"
    );

    let rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
         WHERE oid = 'public.room_setting_mutations'::regclass",
    )
    .fetch_one(&owner)
    .await
    .expect("read settings-ledger RLS flags");
    assert_eq!(rls, (true, true));
    assert!(
        has_table_privilege(
            &owner,
            migrate::EXPECTED_RUNTIME_ROLE,
            "room_setting_mutations",
            "SELECT"
        )
        .await
    );
    assert!(
        has_table_privilege(
            &owner,
            migrate::EXPECTED_RUNTIME_ROLE,
            "room_setting_mutations",
            "INSERT"
        )
        .await
    );
    for privilege in ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"] {
        assert!(
            !has_table_privilege(
                &owner,
                migrate::EXPECTED_RUNTIME_ROLE,
                "room_setting_mutations",
                privilege
            )
            .await,
            "settings mutation evidence must not grant {privilege}"
        );
    }

    let enterprise: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Settings Ledger', 'settings-ledger') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create settings-ledger enterprise");
    let other_enterprise: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Other Settings', 'other-settings') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create other enterprise");
    let user: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('settings-ledger@example.test', md5('settings-ledger@example.test'), 'Owner') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create settings-ledger actor");
    let room: Uuid = sqlx::query_scalar(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, 'settings-ledger', 'Settings Ledger', '{\"access\":{\"tiers\":[]}}'::jsonb) \
         RETURNING id",
    )
    .bind(enterprise)
    .bind(user)
    .fetch_one(&owner)
    .await
    .expect("create settings-ledger room");
    let request_id = Uuid::new_v4();

    let runtime = PgPoolOptions::new()
        .max_connections(1)
        .connect(&scratch_url(&runtime_url(), &scratch.name))
        .await
        .expect("connect as runtime");
    let mut insert = runtime.begin().await.expect("begin runtime insert");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise.to_string())
        .execute(&mut *insert)
        .await
        .expect("set exact tenant");
    sqlx::query(
        "INSERT INTO room_setting_mutations \
           (enterprise_id, request_id, room_id, actor_user_id, request_digest, response_revision) \
         VALUES ($1, $2, $3, $4, repeat('a', 64), 0)",
    )
    .bind(enterprise)
    .bind(request_id)
    .bind(room)
    .bind(user)
    .execute(&mut *insert)
    .await
    .expect("runtime may append settings mutation evidence");
    insert.commit().await.expect("commit settings evidence");

    for statement in [
        "UPDATE room_setting_mutations SET response_revision = 1",
        "DELETE FROM room_setting_mutations",
    ] {
        let mut mutation = runtime.begin().await.expect("begin forbidden mutation");
        sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
            .bind(enterprise.to_string())
            .execute(&mut *mutation)
            .await
            .expect("set exact tenant");
        let error = sqlx::query(statement)
            .execute(&mut *mutation)
            .await
            .expect_err("settings evidence must be append-only");
        assert_eq!(
            error
                .as_database_error()
                .and_then(|database_error| database_error.code())
                .as_deref(),
            Some("42501")
        );
        mutation
            .rollback()
            .await
            .expect("rollback forbidden mutation");
    }

    let mut hidden = runtime.begin().await.expect("begin cross-tenant read");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(other_enterprise.to_string())
        .execute(&mut *hidden)
        .await
        .expect("set other tenant");
    let visible: i64 = sqlx::query_scalar("SELECT count(*) FROM room_setting_mutations")
        .fetch_one(&mut *hidden)
        .await
        .expect("RLS returns an empty cross-tenant projection");
    assert_eq!(visible, 0);
    hidden.rollback().await.expect("close cross-tenant read");

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn membership_authority_is_revisioned_append_only_and_preserves_a_room_owner() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let columns: Vec<String> = sqlx::query_scalar(
        "SELECT column_name::text FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = 'room_members' \
           AND column_name IN ('revision', 'is_banned', 'is_paused', 'hide_user_count', \
                               'admin_note', 'approval_status', 'has_mobile_app') \
         ORDER BY column_name",
    )
    .fetch_all(&owner)
    .await
    .expect("inspect membership columns");
    assert_eq!(
        columns.len(),
        7,
        "every managed membership field is installed"
    );

    let rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
         WHERE oid = 'public.membership_mutations'::regclass",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect membership ledger RLS");
    assert_eq!(rls, (true, true));
    for (privilege, expected) in [
        ("SELECT", true),
        ("INSERT", true),
        ("UPDATE", false),
        ("DELETE", false),
        ("TRUNCATE", false),
        ("REFERENCES", false),
        ("TRIGGER", false),
    ] {
        assert_eq!(
            has_table_privilege(
                &owner,
                migrate::EXPECTED_RUNTIME_ROLE,
                "membership_mutations",
                privilege,
            )
            .await,
            expected,
            "unexpected membership ledger {privilege} privilege"
        );
    }

    let enterprise: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Membership Guard', 'membership-guard') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create enterprise");
    let owner_user: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('membership-owner@example.test', md5('membership-owner@example.test'), 'Owner') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create owner");
    let member_user: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('membership-member@example.test', md5('membership-member@example.test'), 'Member') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create member");
    let room: Uuid = sqlx::query_scalar(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, 'member-guard', 'Membership Guard', '{\"access\":{\"tiers\":[]}}'::jsonb) \
         RETURNING id",
    )
    .bind(enterprise)
    .bind(owner_user)
    .fetch_one(&owner)
    .await
    .expect("create room");
    sqlx::query(
        "INSERT INTO room_members (enterprise_id, room_id, user_id, role) \
         VALUES ($1, $2, $3, 'owner'), ($1, $2, $4, 'member')",
    )
    .bind(enterprise)
    .bind(room)
    .bind(owner_user)
    .bind(member_user)
    .execute(&owner)
    .await
    .expect("create memberships");

    sqlx::query("UPDATE room_members SET approval_status = 'pending', is_paused = true WHERE user_id = $1 AND room_id = $2")
        .bind(member_user)
        .bind(room)
        .execute(&owner)
        .await
        .expect("pause member");
    let resolved: Option<Uuid> =
        sqlx::query_scalar("SELECT member_id FROM auth_resolve_membership($1, $2)")
            .bind(member_user)
            .bind(room)
            .fetch_optional(&owner)
            .await
            .expect("resolve paused member");
    assert!(resolved.is_none(), "a paused member must fail closed");

    let mut remove_owner = owner.begin().await.expect("begin owner removal");
    sqlx::query("DELETE FROM room_members WHERE user_id = $1 AND room_id = $2")
        .bind(owner_user)
        .bind(room)
        .execute(&mut *remove_owner)
        .await
        .expect("deferred trigger permits the statement");
    let error = remove_owner
        .commit()
        .await
        .expect_err("the final owner cannot be removed at commit");
    assert_eq!(
        error
            .as_database_error()
            .and_then(|database_error| database_error.code())
            .as_deref(),
        Some("23514")
    );

    scratch.finish(owner).await;
}

#[tokio::test]
async fn badge_authority_is_tenant_paired_referential_and_append_only() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let account_audit_is_nullable: bool = sqlx::query_scalar(
        "SELECT is_nullable = 'YES' FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'room_id'",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect audit_log.room_id nullability");
    assert!(
        account_audit_is_nullable,
        "enterprise-scoped badge events must not invent a room"
    );

    for table in ["enterprise_badges", "room_member_badges", "badge_mutations"] {
        let rls: (bool, bool) = sqlx::query_as(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
             WHERE oid = to_regclass('public.' || $1)",
        )
        .bind(table)
        .fetch_one(&owner)
        .await
        .unwrap_or_else(|error| panic!("inspect {table} RLS: {error}"));
        assert_eq!(rls, (true, true), "{table} must force tenant RLS");
    }
    for (table, privilege, expected) in [
        ("enterprise_badges", "SELECT", true),
        ("enterprise_badges", "INSERT", true),
        ("enterprise_badges", "UPDATE", true),
        ("enterprise_badges", "DELETE", true),
        ("room_member_badges", "SELECT", true),
        ("room_member_badges", "INSERT", true),
        ("room_member_badges", "UPDATE", false),
        ("room_member_badges", "DELETE", true),
        ("badge_mutations", "SELECT", true),
        ("badge_mutations", "INSERT", true),
        ("badge_mutations", "UPDATE", false),
        ("badge_mutations", "DELETE", false),
    ] {
        assert_eq!(
            has_table_privilege(&owner, migrate::EXPECTED_RUNTIME_ROLE, table, privilege,).await,
            expected,
            "unexpected {table} {privilege} privilege"
        );
    }

    let enterprise_a: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Badge Account A', $1) RETURNING id",
    )
    .bind(format!("badge-a-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise A");
    let enterprise_b: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Badge Account B', $1) RETURNING id",
    )
    .bind(format!("badge-b-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise B");
    let owner_a: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner A') RETURNING id",
    )
    .bind(format!("badge-a-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner A");
    let owner_b: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner B') RETURNING id",
    )
    .bind(format!("badge-b-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner B");
    sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'owner'), ($3, $4, 'owner')",
    )
    .bind(enterprise_a)
    .bind(owner_a)
    .bind(enterprise_b)
    .bind(owner_b)
    .execute(&owner)
    .await
    .expect("create owner memberships");
    let room_a: Uuid = sqlx::query_scalar(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, $3, 'Badge Room A', '{\"access\":{\"tiers\":[]}}'::jsonb) RETURNING id",
    )
    .bind(enterprise_a)
    .bind(owner_a)
    .bind(format!("ba-{}", &Uuid::new_v4().simple().to_string()[..12]))
    .fetch_one(&owner)
    .await
    .expect("create room A");
    let member_a: Uuid = sqlx::query_scalar(
        "INSERT INTO room_members (enterprise_id, room_id, user_id, role) \
         VALUES ($1, $2, $3, 'owner') RETURNING id",
    )
    .bind(enterprise_a)
    .bind(room_a)
    .bind(owner_a)
    .fetch_one(&owner)
    .await
    .expect("create room owner");
    let badge_a: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprise_badges (enterprise_id, label) VALUES ($1, 'Badge A') RETURNING id",
    )
    .bind(enterprise_a)
    .fetch_one(&owner)
    .await
    .expect("create badge A");
    let badge_b: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprise_badges (enterprise_id, label) VALUES ($1, 'Badge B') RETURNING id",
    )
    .bind(enterprise_b)
    .fetch_one(&owner)
    .await
    .expect("create badge B");

    let runtime_database_url = scratch_url(&runtime_url(), &scratch.name);
    let runtime = PgPool::connect(&runtime_database_url)
        .await
        .expect("connect runtime to scratch database");
    let mut tenant_a = runtime.begin().await.expect("begin tenant A");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *tenant_a)
        .await
        .expect("set tenant A");
    sqlx::query(
        "INSERT INTO room_member_badges \
         (enterprise_id, room_id, member_id, badge_id, assigned_by_user_id) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(enterprise_a)
    .bind(room_a)
    .bind(member_a)
    .bind(badge_a)
    .bind(owner_a)
    .execute(&mut *tenant_a)
    .await
    .expect("runtime inserts a fully tenant-paired assignment");
    let request_id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO badge_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'badge.created', repeat('a', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(request_id)
    .bind(owner_a)
    .execute(&mut *tenant_a)
    .await
    .expect("runtime appends badge mutation evidence");
    sqlx::query(
        "INSERT INTO audit_log \
         (enterprise_id, room_id, actor_user_id, actor_name, event_name, event_detail, \
          target_type, target_id, metadata) \
         VALUES ($1, NULL, $2, 'Owner A', 'badge.created', \
                 'account administrator created a badge definition', 'badge', $3, '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(owner_a)
    .bind(badge_a)
    .execute(&mut *tenant_a)
    .await
    .expect("runtime appends an enterprise-scoped audit without a fabricated room");
    tenant_a.commit().await.expect("commit tenant A writes");

    let account_audits: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM audit_log \
         WHERE enterprise_id = $1 AND room_id IS NULL AND event_name = 'badge.created'",
    )
    .bind(enterprise_a)
    .fetch_one(&owner)
    .await
    .expect("read enterprise-scoped audit as owner");
    assert_eq!(account_audits, 1);

    let mut forbidden = runtime.begin().await.expect("begin forbidden update");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *forbidden)
        .await
        .expect("set tenant A");
    let error = sqlx::query("UPDATE badge_mutations SET response = '{\"changed\":9}'::jsonb")
        .execute(&mut *forbidden)
        .await
        .expect_err("badge mutation evidence must be append-only");
    assert_insufficient_privilege(error, "update badge mutation evidence");
    forbidden
        .rollback()
        .await
        .expect("rollback forbidden update");

    let mut crossed = runtime
        .begin()
        .await
        .expect("begin cross-tenant badge attempt");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *crossed)
        .await
        .expect("set tenant A");
    let error = sqlx::query(
        "INSERT INTO room_member_badges \
         (enterprise_id, room_id, member_id, badge_id, assigned_by_user_id) \
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(enterprise_a)
    .bind(room_a)
    .bind(member_a)
    .bind(badge_b)
    .bind(owner_a)
    .execute(&mut *crossed)
    .await
    .expect_err("cross-tenant badge must be rejected");
    assert_eq!(
        error
            .as_database_error()
            .and_then(|database_error| database_error.code())
            .as_deref(),
        Some("23503"),
        "cross-tenant badge must fail its composite foreign key"
    );
    crossed.rollback().await.expect("rollback badge attempt");

    let mut crossed = runtime
        .begin()
        .await
        .expect("begin cross-tenant actor attempt");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *crossed)
        .await
        .expect("set tenant A");
    let error = sqlx::query(
        "INSERT INTO badge_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'badge.created', repeat('b', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(Uuid::new_v4())
    .bind(owner_b)
    .execute(&mut *crossed)
    .await
    .expect_err("cross-tenant actor must be rejected");
    assert_eq!(
        error
            .as_database_error()
            .and_then(|database_error| database_error.code())
            .as_deref(),
        Some("23503"),
        "cross-tenant actor must fail its composite foreign key"
    );
    crossed.rollback().await.expect("rollback actor attempt");

    let mut hidden = runtime.begin().await.expect("begin tenant B read");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_b.to_string())
        .execute(&mut *hidden)
        .await
        .expect("set tenant B");
    let visible: i64 = sqlx::query_scalar("SELECT count(*) FROM badge_mutations")
        .fetch_one(&mut *hidden)
        .await
        .expect("read tenant B ledger projection");
    assert_eq!(visible, 0, "tenant B must not see tenant A badge evidence");
    hidden.rollback().await.expect("close tenant B read");

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn administrator_authority_is_bounded_tenant_paired_and_append_only() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let revision_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name = 'enterprise_memberships' \
           AND column_name = 'revision' AND is_nullable = 'NO')",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect administrator revision");
    assert!(
        revision_exists,
        "administrator authority needs a non-null revision"
    );

    let rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
         WHERE oid = 'public.administrator_mutations'::regclass",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect administrator mutation RLS");
    assert_eq!(rls, (true, true));
    for (privilege, expected) in [
        ("SELECT", true),
        ("INSERT", true),
        ("UPDATE", false),
        ("DELETE", false),
        ("TRUNCATE", false),
        ("REFERENCES", false),
        ("TRIGGER", false),
    ] {
        assert_eq!(
            has_table_privilege(
                &owner,
                migrate::EXPECTED_RUNTIME_ROLE,
                "administrator_mutations",
                privilege,
            )
            .await,
            expected,
            "unexpected administrator mutation {privilege} privilege"
        );
    }
    for function in [
        "account_list_administrators(uuid)",
        "account_create_administrator(uuid,uuid)",
        "account_lock_administrator(uuid,uuid)",
        "account_delete_administrator(uuid,uuid)",
    ] {
        let privileges: (bool, bool) = sqlx::query_as(
            "SELECT has_function_privilege('public', 'public.' || $1, 'EXECUTE'), \
                    has_function_privilege($2, 'public.' || $1, 'EXECUTE')",
        )
        .bind(function)
        .bind(migrate::EXPECTED_RUNTIME_ROLE)
        .fetch_one(&owner)
        .await
        .unwrap_or_else(|error| panic!("inspect {function}: {error}"));
        assert_eq!(privileges, (false, true), "{function} must be runtime-only");
    }

    let enterprise_a: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Administrator A', $1) RETURNING id",
    )
    .bind(format!("administrator-a-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise A");
    let enterprise_b: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Administrator B', $1) RETURNING id",
    )
    .bind(format!("administrator-b-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise B");
    let owner_a: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner A') RETURNING id",
    )
    .bind(format!("administrator-owner-a-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner A");
    let owner_b: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner B') RETURNING id",
    )
    .bind(format!("administrator-owner-b-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner B");
    let target: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'New Admin') RETURNING id",
    )
    .bind(format!("administrator-target-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create target identity");
    sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'owner'), ($3, $4, 'owner')",
    )
    .bind(enterprise_a)
    .bind(owner_a)
    .bind(enterprise_b)
    .bind(owner_b)
    .execute(&owner)
    .await
    .expect("create owner memberships");

    let runtime_database_url = scratch_url(&runtime_url(), &scratch.name);
    let runtime = PgPool::connect(&runtime_database_url)
        .await
        .expect("connect runtime");
    let mut tenant_a = runtime.begin().await.expect("begin tenant A");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *tenant_a)
        .await
        .expect("set tenant A");

    let cross_tenant_revision: Option<i64> =
        sqlx::query_scalar("SELECT account_create_administrator($1, $2)")
            .bind(owner_a)
            .bind(owner_b)
            .fetch_one(&mut *tenant_a)
            .await
            .expect("cross-tenant identity is safely refused");
    assert!(
        cross_tenant_revision.is_none(),
        "an existing identity cannot be enrolled as an administrator"
    );
    let revision: Option<i64> = sqlx::query_scalar("SELECT account_create_administrator($1, $2)")
        .bind(owner_a)
        .bind(target)
        .fetch_one(&mut *tenant_a)
        .await
        .expect("create administrator through bounded function");
    assert_eq!(revision, Some(0));
    let listed: Vec<(Uuid, String)> =
        sqlx::query_as("SELECT user_id, email::text FROM account_list_administrators($1)")
            .bind(owner_a)
            .fetch_all(&mut *tenant_a)
            .await
            .expect("list administrators");
    assert_eq!(
        listed.len(),
        1,
        "the owner must not leak into the admin list"
    );
    assert_eq!(listed[0].0, target);
    let owner_revision: Option<i64> =
        sqlx::query_scalar("SELECT account_lock_administrator($1, $2)")
            .bind(owner_a)
            .bind(owner_a)
            .fetch_one(&mut *tenant_a)
            .await
            .expect("owner target is opaque");
    assert!(owner_revision.is_none());
    let owner_deleted: bool = sqlx::query_scalar("SELECT account_delete_administrator($1, $2)")
        .bind(owner_a)
        .bind(owner_a)
        .fetch_one(&mut *tenant_a)
        .await
        .expect("owner delete is bounded");
    assert!(
        !owner_deleted,
        "the admin delete capability cannot delete an owner"
    );

    sqlx::query(
        "INSERT INTO administrator_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'administrator.created', repeat('a', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(Uuid::new_v4())
    .bind(owner_a)
    .execute(&mut *tenant_a)
    .await
    .expect("append tenant-paired administrator evidence");
    let cross_actor = sqlx::query(
        "INSERT INTO administrator_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'administrator.created', repeat('b', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(Uuid::new_v4())
    .bind(owner_b)
    .execute(&mut *tenant_a)
    .await
    .expect_err("a cross-tenant actor must fail its composite foreign key");
    assert_eq!(
        cross_actor
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23503")
    );
    tenant_a.rollback().await.expect("rollback tenant probe");

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn customer_api_key_authority_is_secret_free_tenant_paired_and_append_only() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    for table in ["customer_api_keys", "customer_api_key_mutations"] {
        let rls: (bool, bool) = sqlx::query_as(
            "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
             WHERE oid = to_regclass('public.' || $1)",
        )
        .bind(table)
        .fetch_one(&owner)
        .await
        .unwrap_or_else(|error| panic!("inspect {table} RLS: {error}"));
        assert_eq!(rls, (true, true), "{table} must force tenant RLS");
    }
    for (table, privilege, expected) in [
        ("customer_api_keys", "SELECT", true),
        ("customer_api_keys", "INSERT", true),
        ("customer_api_keys", "UPDATE", true),
        ("customer_api_keys", "DELETE", true),
        ("customer_api_keys", "TRUNCATE", false),
        ("customer_api_keys", "REFERENCES", false),
        ("customer_api_keys", "TRIGGER", false),
        ("customer_api_key_mutations", "SELECT", true),
        ("customer_api_key_mutations", "INSERT", true),
        ("customer_api_key_mutations", "UPDATE", false),
        ("customer_api_key_mutations", "DELETE", false),
        ("customer_api_key_mutations", "TRUNCATE", false),
        ("customer_api_key_mutations", "REFERENCES", false),
        ("customer_api_key_mutations", "TRIGGER", false),
    ] {
        assert_eq!(
            has_table_privilege(&owner, migrate::EXPECTED_RUNTIME_ROLE, table, privilege,).await,
            expected,
            "unexpected {table} {privilege} privilege"
        );
    }

    let plaintext_columns: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM information_schema.columns \
         WHERE table_schema = 'public' AND table_name IN \
           ('customer_api_keys', 'customer_api_key_mutations') \
           AND column_name IN ('secret', 'api_secret', 'secret_ciphertext')",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect canonical key columns");
    assert_eq!(
        plaintext_columns, 0,
        "canonical storage must never hold a key secret"
    );

    let enterprise_a: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('API Key A', $1) RETURNING id",
    )
    .bind(format!("api-key-a-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise A");
    let enterprise_b: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('API Key B', $1) RETURNING id",
    )
    .bind(format!("api-key-b-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create enterprise B");
    let actor_a: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner A') RETURNING id",
    )
    .bind(format!("api-key-owner-a-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner A");
    let actor_b: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, md5($1), 'Owner B') RETURNING id",
    )
    .bind(format!("api-key-owner-b-{}@example.test", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create owner B");
    sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'owner'), ($3, $4, 'owner')",
    )
    .bind(enterprise_a)
    .bind(actor_a)
    .bind(enterprise_b)
    .bind(actor_b)
    .execute(&owner)
    .await
    .expect("create owner memberships");

    let runtime_database_url = scratch_url(&runtime_url(), &scratch.name);
    let runtime = PgPool::connect(&runtime_database_url)
        .await
        .expect("connect runtime");
    let mut tenant_a = runtime.begin().await.expect("begin tenant A");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *tenant_a)
        .await
        .expect("set tenant A");
    sqlx::query(
        "INSERT INTO customer_api_keys (enterprise_id, id, secret_hash, last_four) \
         VALUES ($1, '0123456789abcdef01234567', repeat('a', 64), 'cdef')",
    )
    .bind(enterprise_a)
    .execute(&mut *tenant_a)
    .await
    .expect("store verifier-only key metadata");
    tenant_a.commit().await.expect("commit key fixture");

    let mut malformed_probe = runtime.begin().await.expect("begin malformed probe");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *malformed_probe)
        .await
        .expect("set malformed-probe tenant");
    let malformed = sqlx::query(
        "UPDATE customer_api_keys SET restrictions = \
           '{\"ips\":[7],\"scopes\":[],\"sessions\":[]}'::jsonb \
         WHERE id = '0123456789abcdef01234567'",
    )
    .execute(&mut *malformed_probe)
    .await
    .expect_err("non-string restriction elements must fail at the database boundary");
    assert_eq!(
        malformed
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23514")
    );
    malformed_probe
        .rollback()
        .await
        .expect("rollback malformed probe");

    let mut tenant_a = runtime.begin().await.expect("resume tenant A");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *tenant_a)
        .await
        .expect("reset tenant A");
    sqlx::query(
        "INSERT INTO customer_api_key_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'customer-api-key.created', repeat('b', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(Uuid::new_v4())
    .bind(actor_a)
    .execute(&mut *tenant_a)
    .await
    .expect("append tenant-paired API-key evidence");
    tenant_a.commit().await.expect("commit mutation fixture");

    let mut cross_actor_probe = runtime.begin().await.expect("begin cross-actor probe");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *cross_actor_probe)
        .await
        .expect("set cross-actor tenant");
    let cross_actor = sqlx::query(
        "INSERT INTO customer_api_key_mutations \
         (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response) \
         VALUES ($1, $2, $3, 'customer-api-key.created', repeat('c', 64), '{}'::jsonb)",
    )
    .bind(enterprise_a)
    .bind(Uuid::new_v4())
    .bind(actor_b)
    .execute(&mut *cross_actor_probe)
    .await
    .expect_err("a cross-tenant actor must fail its composite foreign key");
    assert_eq!(
        cross_actor
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23503")
    );
    cross_actor_probe
        .rollback()
        .await
        .expect("rollback cross-actor probe");

    let mut append_only_probe = runtime.begin().await.expect("begin append-only probe");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *append_only_probe)
        .await
        .expect("set append-only tenant");
    let mutation_update =
        sqlx::query("UPDATE customer_api_key_mutations SET response = '{\"changed\":9}'::jsonb")
            .execute(&mut *append_only_probe)
            .await
            .expect_err("API-key mutation evidence must be append-only");
    assert_insufficient_privilege(mutation_update, "update API-key mutation evidence");
    append_only_probe
        .rollback()
        .await
        .expect("rollback append-only probe");

    let mut tenant_b = runtime.begin().await.expect("begin tenant B");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_b.to_string())
        .execute(&mut *tenant_b)
        .await
        .expect("set tenant B");
    let visible: (i64, i64) = sqlx::query_as(
        "SELECT (SELECT count(*) FROM customer_api_keys), \
                (SELECT count(*) FROM customer_api_key_mutations)",
    )
    .fetch_one(&mut *tenant_b)
    .await
    .expect("read tenant B projection");
    assert_eq!(visible, (0, 0), "tenant B must not see tenant A key state");
    tenant_b.rollback().await.expect("close tenant B read");

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn customer_api_key_execution_is_bounded_and_visit_history_is_tenant_paired() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let lookup_contract: (bool, Vec<String>, String, bool, i64) = sqlx::query_as(
        "SELECT routine.prosecdef, routine.proconfig, routine.provolatile::text, \
                has_function_privilege($1, routine.oid, 'EXECUTE'), \
                (SELECT count(*) FROM aclexplode(routine.proacl) acl WHERE acl.grantee = 0)::bigint \
           FROM pg_catalog.pg_proc AS routine \
          WHERE routine.oid = 'public.customer_api_key_auth_lookup(text)'::regprocedure",
    )
    .bind(migrate::EXPECTED_RUNTIME_ROLE)
    .fetch_one(&owner)
    .await
    .expect("inspect customer API-key authentication lookup");
    assert!(
        lookup_contract.0,
        "the pre-tenant lookup must be SECURITY DEFINER"
    );
    assert_eq!(lookup_contract.1, ["search_path=pg_catalog, public"]);
    assert_eq!(
        lookup_contract.2, "s",
        "the lookup must remain read-only STABLE"
    );
    assert!(
        lookup_contract.3,
        "the runtime role must execute the bounded lookup"
    );
    assert_eq!(lookup_contract.4, 0, "PUBLIC must not execute the lookup");

    let visit_rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
          WHERE oid = 'public.room_visit_sessions'::regclass",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect visit ledger RLS");
    assert_eq!(visit_rls, (true, true));
    for (privilege, expected) in [
        ("SELECT", true),
        ("INSERT", true),
        ("UPDATE", true),
        ("DELETE", false),
        ("TRUNCATE", false),
        ("REFERENCES", false),
        ("TRIGGER", false),
    ] {
        assert_eq!(
            has_table_privilege(
                &owner,
                migrate::EXPECTED_RUNTIME_ROLE,
                "room_visit_sessions",
                privilege,
            )
            .await,
            expected,
            "unexpected visit-ledger {privilege} privilege",
        );
    }

    let policy: (Vec<String>, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT roles::text[], qual, with_check FROM pg_catalog.pg_policies \
          WHERE schemaname = 'public' AND tablename = 'room_visit_sessions' \
            AND policyname = 'tenant_isolation'",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect visit-ledger tenant policy");
    assert_eq!(policy.0, [migrate::EXPECTED_RUNTIME_ROLE]);
    for expression in [policy.1, policy.2] {
        let expression = expression.expect("visit policy must constrain reads and writes");
        assert!(expression.contains("app.enterprise_id"), "{expression}");
        assert_ne!(expression.trim(), "true");
        assert_ne!(expression.trim(), "(true)");
    }

    let room_fk: String = sqlx::query_scalar(
        "SELECT pg_get_constraintdef(oid) FROM pg_catalog.pg_constraint \
          WHERE conrelid = 'public.room_visit_sessions'::regclass \
            AND conname = 'room_visit_sessions_room_tenant_fk'",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect visit room foreign key");
    assert!(
        room_fk.contains("FOREIGN KEY (enterprise_id, room_id)")
            && room_fk.contains("REFERENCES rooms(enterprise_id, id)"),
        "visit rows must be paired to a room in the same tenant: {room_fk}",
    );

    let launch_index: String = sqlx::query_scalar(
        "SELECT indexdef FROM pg_catalog.pg_indexes \
          WHERE schemaname = 'public' AND tablename = 'room_visit_sessions' \
            AND indexname = 'room_visit_sessions_launch_request_idx'",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect visit launch idempotency index");
    assert!(launch_index.contains("UNIQUE"), "{launch_index}");
    assert!(
        launch_index.contains("enterprise_id, launch_request_id"),
        "{launch_index}"
    );
    assert!(
        launch_index.contains("launch_request_id IS NOT NULL"),
        "{launch_index}"
    );
    let launch_columns: Vec<String> = sqlx::query_scalar(
        "SELECT attname::text FROM pg_catalog.pg_attribute \
          WHERE attrelid = 'public.room_visit_sessions'::regclass \
            AND attname = ANY(ARRAY['launch_request_id', 'user_agent', 'browser']) \
          ORDER BY attname",
    )
    .fetch_all(&owner)
    .await
    .expect("inspect canonical launch metadata columns");
    assert_eq!(
        launch_columns,
        ["browser", "launch_request_id", "user_agent"]
    );

    assert!(
        has_column_privilege(
            &owner,
            migrate::EXPECTED_RUNTIME_ROLE,
            "public.users",
            "last_login_at",
            "SELECT",
        )
        .await,
        "the users command needs exactly the canonical last-login column",
    );
    assert!(
        !has_table_privilege(
            &owner,
            migrate::EXPECTED_RUNTIME_ROLE,
            "public.users",
            "SELECT",
        )
        .await,
        "migration 0021 must not restore relation-wide identity reads",
    );

    let enterprise_id: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Stats API', $1) RETURNING id",
    )
    .bind(format!("stats-api-{}", Uuid::new_v4().simple()))
    .fetch_one(&owner)
    .await
    .expect("create lookup tenant");
    let key_id = Uuid::new_v4().simple().to_string()[..24].to_owned();
    sqlx::query(
        "INSERT INTO customer_api_keys (enterprise_id, id, secret_hash, last_four, restrictions) \
         VALUES ($1, $2, repeat('a', 64), 'aaaa', \
                 '{\"ips\":[],\"scopes\":[\"sessions/list\"],\"sessions\":[]}'::jsonb)",
    )
    .bind(enterprise_id)
    .bind(&key_id)
    .execute(&owner)
    .await
    .expect("create canonical lookup key");

    let runtime = PgPool::connect(&scratch_url(&runtime_url(), &scratch.name))
        .await
        .expect("connect runtime");
    let found: Option<(Uuid, String, serde_json::Value)> = sqlx::query_as(
        "SELECT enterprise_id, secret_hash, restrictions \
           FROM customer_api_key_auth_lookup($1)",
    )
    .bind(&key_id)
    .fetch_optional(&runtime)
    .await
    .expect("run bounded lookup without a tenant GUC");
    let found = found.expect("the exact key must resolve before tenant selection");
    assert_eq!(found.0, enterprise_id);
    assert_eq!(found.1, "a".repeat(64));
    assert_eq!(found.2["scopes"], serde_json::json!(["sessions/list"]));
    let missing: Option<Uuid> = sqlx::query_scalar(
        "SELECT enterprise_id FROM customer_api_key_auth_lookup('ffffffffffffffffffffffff')",
    )
    .fetch_optional(&runtime)
    .await
    .expect("unknown key is opaque");
    assert!(missing.is_none());

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn enterprise_memberships_are_explicit_bounded_and_tenant_hardened() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let enterprise_a: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Account A', 'account-a') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create account A");
    let enterprise_b: Uuid = sqlx::query_scalar(
        "INSERT INTO enterprises (name, slug) VALUES ('Account B', 'account-b') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create account B");
    let user_a: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('account-a@example.test', md5('account-a@example.test'), 'Owner A') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create owner A");
    let user_b: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) \
         VALUES ('account-b@example.test', md5('account-b@example.test'), 'Owner B') RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("create owner B");

    sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'owner'), ($3, $4, 'owner')",
    )
    .bind(enterprise_a)
    .bind(user_a)
    .bind(enterprise_b)
    .bind(user_b)
    .execute(&owner)
    .await
    .expect("create canonical owners");

    let invalid_role = sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'member')",
    )
    .bind(enterprise_a)
    .bind(user_b)
    .execute(&owner)
    .await
    .expect_err("room roles must not become account roles");
    assert_eq!(
        invalid_role
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23514")
    );

    let second_owner = sqlx::query(
        "INSERT INTO enterprise_memberships (enterprise_id, user_id, role) \
         VALUES ($1, $2, 'owner')",
    )
    .bind(enterprise_a)
    .bind(user_b)
    .execute(&owner)
    .await
    .expect_err("an enterprise must not have two owners");
    assert_eq!(
        second_owner
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23505")
    );

    let rls: (bool, bool) = sqlx::query_as(
        "SELECT relrowsecurity, relforcerowsecurity FROM pg_catalog.pg_class \
         WHERE oid = 'public.enterprise_memberships'::regclass",
    )
    .fetch_one(&owner)
    .await
    .expect("read enterprise membership RLS flags");
    assert_eq!(rls, (true, true));

    let policy: (Vec<String>, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT roles::text[], qual, with_check FROM pg_catalog.pg_policies \
         WHERE schemaname = 'public' AND tablename = 'enterprise_memberships' \
           AND policyname = 'enterprise_memberships_tenant_isolation'",
    )
    .fetch_one(&owner)
    .await
    .expect("read enterprise membership policy");
    assert_eq!(policy.0, [migrate::EXPECTED_RUNTIME_ROLE]);
    for expression in [policy.1, policy.2] {
        let expression = expression.expect("the tenant policy must constrain reads and writes");
        assert!(expression.contains("app.enterprise_id"), "{expression}");
        assert_ne!(expression.trim(), "true", "widened tenant policy");
        assert_ne!(expression.trim(), "(true)", "widened tenant policy");
    }

    let discovery_contract: (bool, Vec<String>, bool, i64) = sqlx::query_as(
        "SELECT routine.prosecdef, routine.proconfig, \
                has_function_privilege('tradingroom_app', routine.oid, 'EXECUTE'), \
                (SELECT count(*) FROM aclexplode(routine.proacl) acl WHERE acl.grantee = 0)::bigint \
         FROM pg_catalog.pg_proc AS routine \
         WHERE routine.oid = 'public.auth_list_enterprise_memberships(uuid)'::regprocedure",
    )
    .fetch_one(&owner)
    .await
    .expect("read account discovery resolver contract");
    assert!(
        discovery_contract.0,
        "account discovery must be SECURITY DEFINER"
    );
    assert_eq!(discovery_contract.1, ["search_path=pg_catalog, public"]);
    assert!(
        discovery_contract.2,
        "the runtime role must execute account discovery"
    );
    assert_eq!(
        discovery_contract.3, 0,
        "PUBLIC must not execute account discovery"
    );

    let function_contract: (bool, Vec<String>, bool, i64, String) = sqlx::query_as(
        "SELECT routine.prosecdef, routine.proconfig, \
                has_function_privilege('tradingroom_app', routine.oid, 'EXECUTE'), \
                (SELECT count(*) FROM aclexplode(routine.proacl) acl WHERE acl.grantee = 0)::bigint, \
                routine.provolatile::text \
         FROM pg_catalog.pg_proc AS routine \
         WHERE routine.oid = 'public.auth_lock_enterprise_admin(uuid)'::regprocedure",
    )
    .fetch_one(&owner)
    .await
    .expect("read transaction-scoped account resolver contract");
    assert!(
        function_contract.0,
        "transaction-scoped account authorization must be SECURITY DEFINER"
    );
    assert_eq!(
        function_contract.1,
        ["search_path=pg_catalog, public"],
        "the definer function must pin every resolved relation"
    );
    assert!(
        function_contract.2,
        "the runtime role must execute the transaction-scoped resolver"
    );
    assert_eq!(
        function_contract.3, 0,
        "PUBLIC must not execute the transaction-scoped definer function"
    );
    assert_eq!(
        function_contract.4, "v",
        "the lock-taking resolver must remain VOLATILE"
    );

    let runtime = PgPoolOptions::new()
        .max_connections(1)
        .connect(&scratch_url(&runtime_url(), &scratch.name))
        .await
        .expect("connect to the scratch database as runtime");
    let resolved: Vec<(Uuid, String, String)> = sqlx::query_as(
        "SELECT enterprise_id, enterprise_name, account_role \
         FROM auth_list_enterprise_memberships($1)",
    )
    .bind(user_a)
    .fetch_all(&runtime)
    .await
    .expect("resolve only owner A's accounts");
    assert_eq!(
        resolved,
        [(enterprise_a, "Account A".into(), "owner".into())]
    );

    let unlocked: bool = sqlx::query_scalar("SELECT auth_lock_enterprise_admin($1)")
        .bind(user_a)
        .fetch_one(&runtime)
        .await
        .expect("a missing tenant context must fail closed without raising");
    assert!(!unlocked);

    let mut runtime_tx = runtime
        .begin()
        .await
        .expect("begin tenant authorization probe");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_a.to_string())
        .execute(&mut *runtime_tx)
        .await
        .expect("set tenant context");
    let authorized: bool = sqlx::query_scalar("SELECT auth_lock_enterprise_admin($1)")
        .bind(user_a)
        .fetch_one(&mut *runtime_tx)
        .await
        .expect("lock matching account authority");
    assert!(authorized);
    let cross_tenant: bool = sqlx::query_scalar("SELECT auth_lock_enterprise_admin($1)")
        .bind(user_b)
        .fetch_one(&mut *runtime_tx)
        .await
        .expect("cross-tenant account authority must be indistinguishable from absence");
    assert!(!cross_tenant);

    let mut revocation = owner
        .begin()
        .await
        .expect("begin authority revocation probe");
    revocation
        .execute("SET LOCAL lock_timeout = '100ms'")
        .await
        .expect("bound lock wait");
    let blocked =
        sqlx::query("DELETE FROM enterprise_memberships WHERE enterprise_id = $1 AND user_id = $2")
            .bind(enterprise_a)
            .bind(user_a)
            .execute(&mut *revocation)
            .await
            .expect_err("the authorization row must remain locked through the tenant transaction");
    assert_eq!(
        blocked
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("55P03")
    );
    revocation
        .rollback()
        .await
        .expect("rollback timed-out revocation");
    runtime_tx
        .commit()
        .await
        .expect("commit authorization probe");

    let direct_read = sqlx::query_scalar::<_, i64>("SELECT count(*) FROM enterprise_memberships")
        .fetch_one(&runtime)
        .await
        .expect_err("the runtime role must not enumerate account authority directly");
    assert_eq!(
        direct_read
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("42501")
    );

    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn legacy_cutover_mapping_is_owner_only_unique_and_auditable() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    let enterprise_status_constraint: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pg_constraint \
         WHERE conname = 'enterprises_status_check' \
           AND conrelid = 'public.enterprises'::regclass)",
    )
    .fetch_one(&owner)
    .await
    .expect("inspect enterprise status constraint");
    assert!(enterprise_status_constraint);

    let run_id: Uuid = sqlx::query_scalar(
        "INSERT INTO legacy_cutover_runs \
           (source_system, source_fingerprint, scope, status, source_counts, target_counts) \
         VALUES ('controller-postgres', repeat('a', 64), 'profile', 'running', \
                 '{\"accounts\":1,\"users\":1}'::jsonb, '{}'::jsonb) \
         RETURNING id",
    )
    .fetch_one(&owner)
    .await
    .expect("start an auditable import run");

    let target = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO legacy_entity_mappings \
           (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest) \
         VALUES ('controller-postgres', repeat('a', 64), 'user', '42', $1, $2, repeat('b', 64))",
    )
    .bind(target)
    .bind(run_id)
    .execute(&owner)
    .await
    .expect("record one mapping");

    let duplicate_source = sqlx::query(
        "INSERT INTO legacy_entity_mappings \
           (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest) \
         VALUES ('controller-postgres', repeat('a', 64), 'user', '42', gen_random_uuid(), $1, repeat('c', 64))",
    )
    .bind(run_id)
    .execute(&owner)
    .await
    .expect_err("one legacy identity must never map to two targets");
    assert_eq!(
        duplicate_source
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23505")
    );

    let duplicate_target = sqlx::query(
        "INSERT INTO legacy_entity_mappings \
           (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest) \
         VALUES ('controller-postgres', repeat('a', 64), 'user', '43', $1, $2, repeat('c', 64))",
    )
    .bind(target)
    .bind(run_id)
    .execute(&owner)
    .await
    .expect_err("one target identity must never claim two legacy identities");
    assert_eq!(
        duplicate_target
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("23505")
    );

    for statement in [
        "INSERT INTO legacy_cutover_runs \
           (source_system, source_fingerprint, scope, status, source_counts, target_counts) \
         VALUES ('controller-postgres', repeat('x', 64), 'profile', 'running', '{}'::jsonb, '{}'::jsonb)",
        "UPDATE legacy_cutover_runs SET status = 'verified' WHERE id = '00000000-0000-0000-0000-000000000000'",
        "SELECT count(*) FROM legacy_entity_mappings",
    ] {
        let runtime = PgPoolOptions::new()
            .max_connections(1)
            .connect(&scratch_url(&runtime_url(), &scratch.name))
            .await
            .expect("connect as runtime");
        let error = sqlx::query(statement)
            .execute(&runtime)
            .await
            .expect_err("runtime must not read or mutate the offline conversion ledger");
        assert_eq!(
            error
                .as_database_error()
                .and_then(|database_error| database_error.code())
                .as_deref(),
            Some("42501")
        );
        runtime.close().await;
    }

    scratch.finish(owner).await;
}

#[tokio::test]
async fn runtime_object_privileges_match_the_current_api_sql_surface() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

    // ── WHOSE PRIVILEGES THIS TEST IS ABOUT, AND WHY THAT CHANGED ────────────────────────────
    //
    // Both. `0006_restrict_runtime_object_privileges.sql` cut `ptr_clone_app` down to a reviewed
    // column-scoped surface, and until 2026-08-31 this test asserted that surface against that role,
    // because it was the only role holding anything.
    //
    // `0009` mirrored every one of those grants at COLUMN precision onto `tradingroom_app` — the
    // role the API actually authenticates as, and the one this test's own name means by "runtime" —
    // and `0010_retire_ptr_clone_app.sql` then revoked the baseline role's copy. So the reviewed
    // surface moved, and asserting it against the old name would assert it of a role that no longer
    // has it while never checking the role that does.
    //
    // Two claims now, and the second is the retirement's own:
    //
    //   `tradingroom_app`  holds EXACTLY the reviewed surface
    //   `ptr_clone_app`    holds NOTHING — not a relation-wide privilege, not a column ACL
    //
    // Measured against a live cluster with the whole chain applied on 2026-08-31: `tradingroom_app`
    // holds `enterprises.id: SELECT` at column scope and nothing else on these three tables;
    // `ptr_clone_app` holds none of the four privileges on any of their columns.
    const RUNTIME_ROLE: &str = "tradingroom_app";
    const BASELINE_ROLE: &str = "ptr_clone_app";

    // The baseline role may also be GONE, and that is stronger still. `0010` leaves it in place —
    // dropping a cluster-global role is not convergent, see `migration_reappliability.rs` — but the
    // migration documents an operator `DROP ROLE` for a cluster that will take no further new
    // databases. `has_table_privilege` ERRORS on an unknown role rather than answering false, so the
    // baseline half is asked only when there is something to ask about.
    let baseline_present = role_exists(&owner, BASELINE_ROLE).await;
    assert!(
        role_exists(&owner, RUNTIME_ROLE).await,
        "the runtime role is absent; this database has no application identity at all, which \
         0009 provisions and 0010's interlock exists to protect"
    );

    // No relation-wide privilege may mask the reviewed column ACLs, for either role. DELETE,
    // TRUNCATE, TRIGGER and MAINTAIN have no column-scoped form and remain denied.
    //
    // MAINTAIN is checked only where the server has it — see `maintain_is_supported`, which asserts
    // the reason rather than skipping quietly. `services/compose.yml` pins `postgres:17`, so the
    // deployed server always takes the first branch; a 16.x developer cluster takes the second and
    // this test still checks the other seven.
    const RELATION_WIDE: [&str; 7] = [
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
    ];
    let maintain = maintain_is_supported(&owner, RUNTIME_ROLE, "public.enterprises").await;

    let roles: Vec<&str> = if baseline_present {
        vec![RUNTIME_ROLE, BASELINE_ROLE]
    } else {
        vec![RUNTIME_ROLE]
    };

    for role in &roles {
        for table in ["public.enterprises", "public.users", "public.audit_log"] {
            for privilege in RELATION_WIDE
                .iter()
                .copied()
                .chain(maintain.then_some("MAINTAIN"))
            {
                assert!(
                    !has_table_privilege(&owner, role, table, privilege).await,
                    "{role} unexpectedly has relation-wide {privilege} on {table}"
                );
            }
        }
    }

    let enterprise_columns = ["id", "name", "slug", "settings", "created_at", "updated_at"];
    let user_columns = [
        "id",
        "email",
        "email_hash",
        "password_hash",
        "display_name",
        "avatar_url",
        "phone",
        "discord_id",
        "is_platform_admin",
        "last_login_at",
        "created_at",
        "updated_at",
        "preferences",
        "is_guest",
        "guest_created_in_room_id",
    ];
    for column in enterprise_columns {
        for privilege in ["SELECT", "INSERT", "UPDATE", "REFERENCES"] {
            let expected = privilege == "SELECT" && column == "id";
            assert_eq!(
                has_column_privilege(
                    &owner,
                    RUNTIME_ROLE,
                    "public.enterprises",
                    column,
                    privilege
                )
                .await,
                expected,
                "unexpected {privilege} ACL on enterprises.{column} for {RUNTIME_ROLE}"
            );
            assert!(
                !baseline_present
                    || !has_column_privilege(
                        &owner,
                        BASELINE_ROLE,
                        "public.enterprises",
                        column,
                        privilege
                    )
                    .await,
                "{BASELINE_ROLE} still holds {privilege} on enterprises.{column} after 0010"
            );
        }
    }

    const USER_SELECT: &[&str] = &[
        "id",
        "email",
        "password_hash",
        "display_name",
        "is_platform_admin",
        "last_login_at",
        "preferences",
        "is_guest",
    ];
    const USER_INSERT: &[&str] = &[
        "email",
        "email_hash",
        "display_name",
        "is_guest",
        "guest_created_in_room_id",
    ];
    const USER_UPDATE: &[&str] = &[
        "password_hash",
        "display_name",
        "last_login_at",
        "updated_at",
        "preferences",
    ];

    for column in user_columns {
        for privilege in ["SELECT", "INSERT", "UPDATE", "REFERENCES"] {
            let expected = match privilege {
                "SELECT" => USER_SELECT.contains(&column),
                "INSERT" => USER_INSERT.contains(&column),
                "UPDATE" => USER_UPDATE.contains(&column),
                _ => false,
            };
            assert_eq!(
                has_column_privilege(&owner, RUNTIME_ROLE, "public.users", column, privilege).await,
                expected,
                "unexpected {privilege} ACL on users.{column} for {RUNTIME_ROLE}"
            );
            assert!(
                !baseline_present
                    || !has_column_privilege(
                        &owner,
                        BASELINE_ROLE,
                        "public.users",
                        column,
                        privilege
                    )
                    .await,
                "{BASELINE_ROLE} still holds {privilege} on users.{column} after 0010"
            );
        }
    }

    const AUDIT_INSERT: &[&str] = &[
        "enterprise_id",
        "room_id",
        "actor_user_id",
        "actor_name",
        "event_name",
        "event_detail",
        "target_type",
        "target_id",
        "metadata",
    ];

    let audit_columns = [
        "id",
        "enterprise_id",
        "room_id",
        "actor_user_id",
        "actor_name",
        "event_name",
        "event_detail",
        "target_type",
        "target_id",
        "metadata",
        "created_at",
        "updated_at",
    ];

    for column in audit_columns {
        for privilege in ["SELECT", "INSERT", "UPDATE", "REFERENCES"] {
            let expected = privilege == "INSERT" && AUDIT_INSERT.contains(&column);
            assert_eq!(
                has_column_privilege(&owner, RUNTIME_ROLE, "public.audit_log", column, privilege)
                    .await,
                expected,
                "unexpected {privilege} ACL on audit_log.{column} for {RUNTIME_ROLE}"
            );
            assert!(
                !baseline_present
                    || !has_column_privilege(
                        &owner,
                        BASELINE_ROLE,
                        "public.audit_log",
                        column,
                        privilege
                    )
                    .await,
                "{BASELINE_ROLE} still holds {privilege} on audit_log.{column} after 0010"
            );
        }
    }

    // Seed the smallest valid graph as the owner, then execute the reviewed SQL shape through a
    // real RUNTIME connection. `runtime_url()` has pointed at `tradingroom_app` since 2026-08-15;
    // the comment here still said `ptr_clone_app`, which is the kind of stale name that makes a
    // reader believe the wrong role is being exercised.
    let enterprise_id: Uuid =
        sqlx::query_scalar("INSERT INTO enterprises (name, slug) VALUES ($1, $2) RETURNING id")
            .bind("Privilege Fixture")
            .bind(format!("privilege-fixture-{}", Uuid::new_v4().simple()))
            .fetch_one(&owner)
            .await
            .expect("seed enterprise as owner");

    let owner_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(format!("owner-{}@example.invalid", Uuid::new_v4().simple()))
    .bind(Uuid::new_v4().simple().to_string())
    .bind("Privilege Owner")
    .fetch_one(&owner)
    .await
    .expect("seed owner identity");

    let room_id: Uuid = sqlx::query_scalar(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, $3, $4, $5) RETURNING id",
    )
    .bind(enterprise_id)
    .bind(owner_id)
    .bind(Uuid::new_v4().simple().to_string())
    .bind("Privilege Room")
    .bind(sqlx::types::Json(
        serde_json::json!({ "access": { "tiers": [] } }),
    ))
    .fetch_one(&owner)
    .await
    .expect("seed room as owner");

    let scratch_runtime_url = scratch_url(&runtime_url(), &scratch.name);
    let runtime = PgPool::connect(&scratch_runtime_url)
        .await
        .expect("connect to scratch database as the runtime role");
    let runtime_db = Db::connect(&scratch_runtime_url, 1, limits::DB_ACQUIRE_TIMEOUT)
        .await
        .expect("construct the runtime database boundary");
    runtime_db
        .assert_runtime_role_is_restricted()
        .await
        .expect("migration 0006 must satisfy the pre-bind ACL check");

    let ids: Vec<Uuid> = sqlx::query_scalar("SELECT id FROM enterprises")
        .fetch_all(&runtime)
        .await
        .expect("the retention job may enumerate enterprise ids");
    assert_eq!(ids, [enterprise_id]);

    let error = sqlx::query_scalar::<_, String>("SELECT name FROM enterprises LIMIT 1")
        .fetch_one(&runtime)
        .await
        .expect_err("enterprise metadata is outside the runtime SQL surface");
    assert_insufficient_privilege(error, "select enterprise metadata");

    let error = sqlx::query("UPDATE enterprises SET name = 'compromised' WHERE id = $1")
        .bind(enterprise_id)
        .execute(&runtime)
        .await
        .expect_err("the runtime role must not rewrite enterprises");
    assert_insufficient_privilege(error, "update enterprise");

    let identity: (Uuid, String, bool, bool) = sqlx::query_as(
        "SELECT id, display_name, is_platform_admin, is_guest FROM users WHERE id = $1",
    )
    .bind(owner_id)
    .fetch_one(&runtime)
    .await
    .expect("login/refresh identity projection remains readable");
    assert_eq!(identity, (owner_id, "Privilege Owner".into(), false, false));

    let guest_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name, is_guest, guest_created_in_room_id) \
         VALUES ($1, $2, $3, true, $4) RETURNING id",
    )
    .bind(format!("guest.{}@guests.invalid", Uuid::new_v4().simple()))
    .bind(Uuid::new_v4().simple().to_string())
    .bind("Privilege Guest")
    .bind(room_id)
    .fetch_one(&runtime)
    .await
    .expect("the runtime guest-identity insert remains permitted");

    sqlx::query(
        "UPDATE users SET preferences = jsonb_build_object('theme', 'dark'), updated_at = now() \
         WHERE id = $1",
    )
    .bind(guest_id)
    .execute(&runtime)
    .await
    .expect("the runtime preference update remains permitted");

    sqlx::query("UPDATE users SET display_name = 'Profile Owner' WHERE id = $1")
        .bind(owner_id)
        .execute(&runtime)
        .await
        .expect("the runtime profile display-name update remains permitted");

    let error = sqlx::query("UPDATE users SET is_platform_admin = true WHERE id = $1")
        .bind(guest_id)
        .execute(&runtime)
        .await
        .expect_err("the runtime role must not promote users");
    assert_insufficient_privilege(error, "promote user");

    let error = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(guest_id)
        .execute(&runtime)
        .await
        .expect_err("the runtime role must not delete identities");
    assert_insufficient_privilege(error, "delete user");

    let mut audit_insert = runtime.begin().await.expect("begin audit insert");
    sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
        .bind(enterprise_id.to_string())
        .execute(&mut *audit_insert)
        .await
        .expect("scope audit insert to its tenant");
    let inserted = sqlx::query(
        "INSERT INTO audit_log \
           (enterprise_id, room_id, actor_user_id, actor_name, event_name, event_detail, metadata) \
         VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb)",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(owner_id)
    .bind("Privilege Owner")
    .bind("privilege.proven")
    .bind("append-only audit insert")
    .execute(&mut *audit_insert)
    .await
    .expect("moderation may append audit evidence")
    .rows_affected();
    assert_eq!(inserted, 1);
    audit_insert.commit().await.expect("commit audit insert");

    for (statement, operation) in [
        ("SELECT event_name FROM audit_log LIMIT 1", "read audit log"),
        (
            "UPDATE audit_log SET event_detail = 'compromised'",
            "update audit log",
        ),
        ("DELETE FROM audit_log", "delete audit log"),
    ] {
        let mut transaction = runtime.begin().await.expect("begin denied audit operation");
        sqlx::query("SELECT set_config('app.enterprise_id', $1, true)")
            .bind(enterprise_id.to_string())
            .execute(&mut *transaction)
            .await
            .expect("scope denied audit operation to its tenant");
        let error = sqlx::query(statement)
            .execute(&mut *transaction)
            .await
            .expect_err("audit evidence is append-only for ptr_clone_app");
        assert_insufficient_privilege(error, operation);
        transaction.rollback().await.ok();
    }

    // The drift must be introduced on the role the API actually authenticates as, or the check
    // under test has nothing to detect. Named by the constant: granting to the baseline role would
    // leave the runtime role untouched and this test would assert its own no-op.
    // `AssertSqlSafe` because `execute` requires `'q: 'static` and this statement is built at
    // runtime from a compile-time constant - the same idiom `tests/support/mod.rs` uses for
    // `CREATE DATABASE`. No caller input reaches it.
    owner
        .execute(sqlx::AssertSqlSafe(format!(
            "GRANT UPDATE (is_platform_admin) ON TABLE public.users TO {}",
            migrate::EXPECTED_RUNTIME_ROLE
        )))
        .await
        .expect("reproduce post-migration ACL drift");
    match runtime_db
        .assert_runtime_role_is_restricted()
        .await
        .expect_err("pre-bind verification must reject an added privilege")
    {
        DbError::UnsafeRuntimeRole { role, reason } => {
            assert_eq!(role, migrate::EXPECTED_RUNTIME_ROLE);
            assert_eq!(
                reason,
                "object privileges do not match the reviewed runtime SQL surface"
            );
        }
        other => panic!("expected object-privilege drift rejection, got {other:?}"),
    }
    owner
        .execute("REVOKE UPDATE (is_platform_admin) ON TABLE public.users FROM ptr_clone_app")
        .await
        .expect("restore the migration 0006 ACL");

    drop(runtime_db);
    runtime.close().await;
    scratch.finish(owner).await;
}

#[tokio::test]
async fn an_existing_schema_without_a_ledger_is_not_silently_adopted() {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;

    migrate::run(&pool)
        .await
        .expect("create a schema with an authentic execution ledger");
    pool.execute("DROP TABLE _sqlx_migrations")
        .await
        .expect("reproduce an existing schema whose provenance ledger is absent");

    migrate::run(&pool).await.expect_err(
        "migration must execute the baseline and collide, never fabricate a ledger row",
    );

    let recorded: i64 =
        sqlx::query_scalar("SELECT count(*) FROM _sqlx_migrations WHERE version = $1 AND success")
            .bind(BASELINE_VERSION)
            .fetch_one(&pool)
            .await
            .expect("inspect the ledger created by the refused migration attempt");
    assert_eq!(
        recorded, 0,
        "an unexecuted baseline must never receive a successful ledger entry"
    );

    scratch.finish(pool).await;
}

/// `0002`'s CHECK, exercised against the real database rather than read.
///
/// A constraint that is syntactically valid but semantically inert is the failure this
/// guards: `rooms_capability_defaults_check` is jsonpath-counting, which is easy to write in
/// a way that quietly matches everything.
#[tokio::test]
async fn the_capability_defaults_check_accepts_valid_policy_and_refuses_the_rest() {
    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;
    migrate::run(&pool).await.expect("migrations apply");

    // `rooms` needs an enterprise and an owner, and `rooms_access_tiers_array_check` requires
    // `config.access.tiers` to be an array, so the fixture has to be real.
    let enterprise: Uuid =
        sqlx::query_scalar("INSERT INTO enterprises (name, slug) VALUES ($1, $2) RETURNING id")
            .bind("Check Fixture")
            .bind(format!("check-fixture-{}", Uuid::new_v4().simple()))
            .fetch_one(&pool)
            .await
            .expect("insert an enterprise");

    let owner: Uuid = sqlx::query_scalar(
        "INSERT INTO users (email, email_hash, display_name) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(format!("check-{}@example.com", Uuid::new_v4().simple()))
    .bind(Uuid::new_v4().to_string())
    .bind("Check Fixture")
    .fetch_one(&pool)
    .await
    .expect("insert a user");

    let insert_room = |config: serde_json::Value| {
        let pool = pool.clone();
        async move {
            sqlx::query(
                "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
                 VALUES ($1, $2, $3, $4, $5)",
            )
            .bind(enterprise)
            .bind(owner)
            .bind(Uuid::new_v4().simple().to_string())
            .bind("Check Fixture Room")
            .bind(sqlx::types::Json(config))
            .execute(&pool)
            .await
        }
    };

    // Accepted: no capabilities key at all (a room that predates 0002).
    insert_room(serde_json::json!({ "access": { "tiers": [] } }))
        .await
        .expect("a room with no capability policy is still valid");

    // Accepted: the policy this build ships.
    insert_room(serde_json::json!({
        "access": { "tiers": [] },
        "capabilities": tradingroom_api::capability::RoleDefaults::COMPILED_IN.to_config_json(),
    }))
    .await
    .expect("the shipped policy must satisfy its own CHECK");

    // Refused: an unknown capability name.
    let error = insert_room(serde_json::json!({
        "access": { "tiers": [] },
        "capabilities": { "member": ["post", "can_fly"] },
    }))
    .await
    .expect_err("an unknown capability name must be refused");
    assert!(
        error
            .to_string()
            .contains("rooms_capability_defaults_check"),
        "the wrong constraint refused it: {error}"
    );

    // Refused: a role whose value is not an array.
    let error = insert_room(serde_json::json!({
        "access": { "tiers": [] },
        "capabilities": { "member": "post" },
    }))
    .await
    .expect_err("a non-array role value must be refused");
    assert!(
        error
            .to_string()
            .contains("rooms_capability_defaults_check"),
        "the wrong constraint refused it: {error}"
    );

    // Refused: capabilities is not an object.
    let error = insert_room(serde_json::json!({
        "access": { "tiers": [] },
        "capabilities": ["post"],
    }))
    .await
    .expect_err("a non-object capabilities value must be refused");
    assert!(
        error
            .to_string()
            .contains("rooms_capability_defaults_check"),
        "the wrong constraint refused it: {error}"
    );

    scratch.finish(pool).await;
}
