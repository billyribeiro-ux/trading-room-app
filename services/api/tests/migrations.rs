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
        "postgres://ptr_clone_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

/// What `0001_baseline.sql` alone creates in `public`.
const BASELINE_PUBLIC_TABLES: i64 = 23;
/// ...and how many of those carry FORCE ROW LEVEL SECURITY.
const BASELINE_FORCE_RLS: i64 = 20;

/// What the **whole** migration set leaves behind: the baseline plus `room_events` from `0003`
/// and `saved_polls` from `0007`. Spelled as `BASELINE + n` rather than as a literal so that
/// adding a table without adding its RLS policy shows up here as an arithmetic mismatch rather
/// than as a number somebody updated by hand.
const MIGRATED_PUBLIC_TABLES: i64 = BASELINE_PUBLIC_TABLES + 2;
/// Both added tables are tenant-scoped, so both are FORCE RLS. The two constants move together;
/// a table added with an `enterprise_id` and no policy makes them disagree, which is the point.
const MIGRATED_FORCE_RLS: i64 = BASELINE_FORCE_RLS + 2;

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

async fn has_table_privilege(pool: &PgPool, table: &str, privilege: &str) -> bool {
    sqlx::query_scalar("SELECT has_table_privilege('ptr_clone_app', $1, $2)")
        .bind(table)
        .bind(privilege)
        .fetch_one(pool)
        .await
        .unwrap_or_else(|error| panic!("inspect {privilege} on {table}: {error}"))
}

async fn has_column_privilege(pool: &PgPool, table: &str, column: &str, privilege: &str) -> bool {
    sqlx::query_scalar("SELECT has_column_privilege('ptr_clone_app', $1, $2, $3)")
        .bind(table)
        .bind(column)
        .bind(privilege)
        .fetch_one(pool)
        .await
        .unwrap_or_else(|error| panic!("inspect {privilege} on {table}.{column}: {error}"))
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
            assert_eq!(expected, "ptr_clone");
            assert_eq!(session_role, "ptr_clone_app");
            assert_eq!(current_role, "ptr_clone_app");
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
            assert_eq!(session_role, "ptr_clone_app");
            assert_eq!(current_role, "ptr_clone_app");
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

    // `<table>_tenant_id_unique UNIQUE (enterprise_id, id)` is what lets a table be the TARGET of
    // a composite tenant key. `alert_media` is the one exception, and it is a faithful one: the
    // reference schema does not give it that constraint either - `second-dump/db/unique.tsv`
    // lists only `alert_media_alert_position_unique` and `alert_media_uploaded_file_unique`, and
    // nothing references alert_media by id.
    for table in room_scoped.iter().filter(|name| *name != "alert_media") {
        let has_tenant_key: bool = sqlx::query_scalar(
            "SELECT EXISTS ( \
               SELECT 1 FROM pg_constraint u \
               WHERE u.conrelid = $1::regclass AND u.contype = 'u' \
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
            "{table} is missing UNIQUE (enterprise_id, id), so nothing can reference it \
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

    // `migrate::run` applies the whole set, so this is the post-migration shape: the 23
    // tables the schema artifacts pin, plus `room_events` and `saved_polls`.
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
        ["ptr_clone_app"],
        "the outbox policy must apply only to the runtime role"
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
async fn runtime_object_privileges_match_the_current_api_sql_surface() {
    let scratch = Scratch::create().await;
    let owner = scratch.pool().await;
    migrate::run(&owner).await.expect("migrations apply");

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

    // No relation-wide privilege may mask the reviewed column ACLs. DELETE,
    // TRUNCATE, TRIGGER and MAINTAIN have no column-scoped form and remain denied.
    for table in ["public.enterprises", "public.users", "public.audit_log"] {
        for privilege in [
            "SELECT",
            "INSERT",
            "UPDATE",
            "DELETE",
            "TRUNCATE",
            "REFERENCES",
            "TRIGGER",
            "MAINTAIN",
        ] {
            assert!(
                !has_table_privilege(&owner, table, privilege).await,
                "ptr_clone_app unexpectedly has relation-wide {privilege} on {table}"
            );
        }
    }

    for column in enterprise_columns {
        for privilege in ["SELECT", "INSERT", "UPDATE", "REFERENCES"] {
            let expected = privilege == "SELECT" && column == "id";
            assert_eq!(
                has_column_privilege(&owner, "public.enterprises", column, privilege).await,
                expected,
                "unexpected {privilege} ACL on enterprises.{column}"
            );
        }
    }

    const USER_SELECT: &[&str] = &[
        "id",
        "email",
        "password_hash",
        "display_name",
        "is_platform_admin",
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
                has_column_privilege(&owner, "public.users", column, privilege).await,
                expected,
                "unexpected {privilege} ACL on users.{column}"
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

    for column in audit_columns {
        for privilege in ["SELECT", "INSERT", "UPDATE", "REFERENCES"] {
            let expected = privilege == "INSERT" && AUDIT_INSERT.contains(&column);
            assert_eq!(
                has_column_privilege(&owner, "public.audit_log", column, privilege).await,
                expected,
                "unexpected {privilege} ACL on audit_log.{column}"
            );
        }
    }

    // Seed the smallest valid graph as the owner, then execute the reviewed SQL
    // shape through a real ptr_clone_app connection.
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
        .expect("connect to scratch database as ptr_clone_app");
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

    owner
        .execute("GRANT UPDATE (is_platform_admin) ON TABLE public.users TO ptr_clone_app")
        .await
        .expect("reproduce post-migration ACL drift");
    match runtime_db
        .assert_runtime_role_is_restricted()
        .await
        .expect_err("pre-bind verification must reject an added privilege")
    {
        DbError::UnsafeRuntimeRole { role, reason } => {
            assert_eq!(role, "ptr_clone_app");
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
