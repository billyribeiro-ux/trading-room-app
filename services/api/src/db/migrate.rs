//! Schema migrations with a fail-closed owner/runtime-role boundary.
//!
//! `migrations/0001_baseline.sql` is the imported, byte-pinned forensic baseline. Its
//! original `second-dump/db/RECREATE.sql` source does not belong to this monorepo's runtime
//! tree, so this crate verifies the embedded migration against [`BASELINE_SHA256`] without a
//! compile-time dependency on that external capture. The repository-level backend verifier
//! independently pins all four imported migrations and verifies the exact baseline lineage
//! recorded in `docs/reference/original-new-room-backend-forensics.md`.
//!
//! The pinned baseline contains legacy `IF NOT EXISTS` role creation with literal
//! `CHANGE_ME_*` passwords. Those branches are forensic evidence, not safe provisioning.
//! The preflight inside [`run`] therefore requires the owner and runtime roles to be
//! provisioned with their exact postures before any migration may execute.
//!
//! There is deliberately no baseline-adoption or migration-skip API. Table-name presence
//! cannot prove columns, types, constraints, indexes, functions, triggers, grants, ownership,
//! or row-level-security policy semantics. A database must either execute the immutable
//! migration chain or already carry SQLx's successful ledger entries from having executed it.
//! Recording an unexecuted migration as applied would manufacture evidence and is prohibited.

use sqlx::migrate::Migrator;
use sqlx::{PgConnection, PgPool};

/// The embedded migration set.
pub static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

/// The baseline's version number, as encoded in its filename.
pub const BASELINE_VERSION: i64 = 1;

/// sha256 of `migrations/0001_baseline.sql`.
///
/// `scripts/verify-backend.mjs` independently pins this value, all imported migration bytes,
/// and the forensic source-lineage record.
pub const BASELINE_SHA256: &str =
    "c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9";

/// The only authenticated identity permitted to execute this migration chain.
pub const EXPECTED_MIGRATOR_ROLE: &str = "ptr_clone";

/// The runtime login that must exist before the pinned baseline is allowed to run.
pub const EXPECTED_RUNTIME_ROLE: &str = "ptr_clone_app";

#[derive(Debug, thiserror::Error)]
pub enum MigrateError {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),

    /// Superusers can change both `session_user` and `current_user`. PostgreSQL's
    /// `system_user` retains the authentication-cycle identity, so all three are required.
    #[error(
        "migration preflight requires the authenticated identity, session_user, and \
         current_user to all be {expected}; \
         got session_user={session_role}, current_user={current_role}"
    )]
    UnexpectedMigratorIdentity {
        expected: String,
        session_role: String,
        current_role: String,
    },

    /// If this role is absent, migration 0001 would create it with a placeholder password.
    #[error(
        "migration preflight requires preprovisioned runtime role {role}; \
         run the role provisioner before migrations"
    )]
    RuntimeRoleMissing { role: String },

    /// Provisioning exists but does not satisfy the complete runtime-role boundary.
    #[error("migration preflight rejected runtime role {role}: {reason}")]
    UnsafeRuntimeRole { role: String, reason: &'static str },
}

/// Cluster-wide posture of the preprovisioned runtime login.
///
/// Every indirect membership path starts with a direct `pg_auth_members` edge, so a zero
/// direct-membership count closes both automatic inheritance and `SET ROLE` paths.
#[derive(Debug, Clone, PartialEq, Eq, sqlx::FromRow)]
struct RuntimeRolePosture {
    can_login: bool,
    is_superuser: bool,
    can_create_database: bool,
    can_create_role: bool,
    inherits: bool,
    can_replicate: bool,
    bypasses_rls: bool,
    membership_count: i64,
}

fn validate_migrator_identity(
    system_user: Option<&str>,
    session_role: &str,
    current_role: &str,
    expected: &str,
) -> Result<(), MigrateError> {
    let authenticated_as_expected = system_user
        .and_then(|identity| identity.split_once(':'))
        .is_some_and(|(method, identity)| !method.is_empty() && identity == expected);

    if authenticated_as_expected && session_role == expected && current_role == expected {
        return Ok(());
    }

    Err(MigrateError::UnexpectedMigratorIdentity {
        expected: expected.to_owned(),
        session_role: session_role.to_owned(),
        current_role: current_role.to_owned(),
    })
}

fn validate_runtime_role_posture(
    role: &str,
    posture: Option<&RuntimeRolePosture>,
) -> Result<(), MigrateError> {
    let posture = posture.ok_or_else(|| MigrateError::RuntimeRoleMissing {
        role: role.to_owned(),
    })?;
    let reject = |reason| MigrateError::UnsafeRuntimeRole {
        role: role.to_owned(),
        reason,
    };

    if !posture.can_login {
        return Err(reject("LOGIN is required"));
    }
    if posture.is_superuser {
        return Err(reject("SUPERUSER bypasses row-level security"));
    }
    if posture.can_create_database {
        return Err(reject("CREATEDB exceeds the runtime boundary"));
    }
    if posture.can_create_role {
        return Err(reject("CREATEROLE exceeds the runtime boundary"));
    }
    if posture.inherits {
        return Err(reject("INHERIT permits privilege expansion"));
    }
    if posture.can_replicate {
        return Err(reject("REPLICATION exceeds the runtime boundary"));
    }
    if posture.bypasses_rls {
        return Err(reject("BYPASSRLS disables row-level security"));
    }
    if posture.membership_count != 0 {
        return Err(reject("role memberships permit privilege expansion"));
    }

    Ok(())
}

async fn preflight_for_roles_on_connection(
    connection: &mut PgConnection,
    expected_migrator: &str,
    expected_runtime: &str,
) -> Result<(), MigrateError> {
    let (system_user, session_role, current_role): (Option<String>, String, String) =
        sqlx::query_as("SELECT system_user, session_user::text, current_user::text")
            .fetch_one(&mut *connection)
            .await?;
    validate_migrator_identity(
        system_user.as_deref(),
        &session_role,
        &current_role,
        expected_migrator,
    )?;

    let posture: Option<RuntimeRolePosture> = sqlx::query_as(
        "SELECT runtime_role.rolcanlogin AS can_login, \
                runtime_role.rolsuper AS is_superuser, \
                runtime_role.rolcreatedb AS can_create_database, \
                runtime_role.rolcreaterole AS can_create_role, \
                runtime_role.rolinherit AS inherits, \
                runtime_role.rolreplication AS can_replicate, \
                runtime_role.rolbypassrls AS bypasses_rls, \
                (SELECT count(*) \
                 FROM pg_catalog.pg_auth_members AS membership \
                 WHERE membership.member = runtime_role.oid)::bigint AS membership_count \
         FROM pg_catalog.pg_roles AS runtime_role \
         WHERE runtime_role.rolname = $1",
    )
    .bind(expected_runtime)
    .fetch_optional(&mut *connection)
    .await?;
    validate_runtime_role_posture(expected_runtime, posture.as_ref())?;

    Ok(())
}

/// Exercises the production preflight query with isolated, uniquely named role fixtures.
#[cfg(feature = "testing")]
#[doc(hidden)]
pub async fn preflight_for_tests(
    pool: &PgPool,
    expected_migrator: &str,
    expected_runtime: &str,
) -> Result<(), MigrateError> {
    let mut connection = pool.acquire().await?;
    preflight_for_roles_on_connection(&mut connection, expected_migrator, expected_runtime).await
}

/// Proves the migration identities and applies every pending migration on one connection.
///
/// The preflight is inside this function so no caller can execute [`MIGRATOR`] without it.
/// PostgreSQL 17's authentication-cycle `system_user`, `session_user`, and `current_user`
/// must all name the exact owner role, and the runtime role must have its complete restricted
/// posture. Only after those checks succeed does this function emit the preflight event and
/// hand that same connection to SQLx. Fresh databases then run `0001` like any other migration.
pub async fn run(pool: &PgPool) -> Result<(), MigrateError> {
    let mut connection = pool.acquire().await?;
    preflight_for_roles_on_connection(
        &mut connection,
        EXPECTED_MIGRATOR_ROLE,
        EXPECTED_RUNTIME_ROLE,
    )
    .await?;
    tracing::info!("migration identity and runtime-role preflight passed");
    MIGRATOR.run(&mut *connection).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sha2::{Digest, Sha256};

    type PostureMutation = (&'static str, fn(&mut RuntimeRolePosture));

    fn restricted_runtime_role() -> RuntimeRolePosture {
        RuntimeRolePosture {
            can_login: true,
            is_superuser: false,
            can_create_database: false,
            can_create_role: false,
            inherits: false,
            can_replicate: false,
            bypasses_rls: false,
            membership_count: 0,
        }
    }

    fn assert_runtime_role_rejected(posture: RuntimeRolePosture, expected_reason: &'static str) {
        match validate_runtime_role_posture(EXPECTED_RUNTIME_ROLE, Some(&posture)) {
            Err(MigrateError::UnsafeRuntimeRole { role, reason }) => {
                assert_eq!(role, EXPECTED_RUNTIME_ROLE);
                assert_eq!(reason, expected_reason);
            }
            other => panic!("expected an unsafe runtime-role error, got {other:?}"),
        }
    }

    /// Pins the embedded baseline's real bytes without requiring the original forensic
    /// repository to exist beside this workspace.
    #[test]
    fn the_embedded_baseline_matches_its_sha256_pin() {
        let baseline = include_bytes!("../../migrations/0001_baseline.sql");

        let digest = hex::encode(Sha256::digest(baseline));
        assert_eq!(
            digest, BASELINE_SHA256,
            "the embedded baseline's sha256 changed; historic migrations are immutable"
        );
    }

    #[test]
    fn the_pinned_baseline_contains_the_placeholder_role_creation_preflight_blocks() {
        let baseline = include_str!("../../migrations/0001_baseline.sql");

        for evidence in [
            "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ptr_clone')",
            "CREATE ROLE ptr_clone LOGIN PASSWORD 'CHANGE_ME_OWNER'",
            "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ptr_clone_app')",
            "CREATE ROLE ptr_clone_app LOGIN PASSWORD 'CHANGE_ME_APP'",
        ] {
            assert!(
                baseline.contains(evidence),
                "the pinned baseline no longer contains expected forensic evidence `{evidence}`"
            );
        }
    }

    #[test]
    fn migration_preflight_requires_exact_owner_identity() {
        validate_migrator_identity(
            Some("scram-sha-256:ptr_clone"),
            EXPECTED_MIGRATOR_ROLE,
            EXPECTED_MIGRATOR_ROLE,
            EXPECTED_MIGRATOR_ROLE,
        )
        .expect("the exact authenticated owner is accepted");

        for (system_user, session_role, current_role) in [
            (None, EXPECTED_MIGRATOR_ROLE, EXPECTED_MIGRATOR_ROLE),
            (
                Some("scram-sha-256:postgres"),
                EXPECTED_MIGRATOR_ROLE,
                EXPECTED_MIGRATOR_ROLE,
            ),
            (
                Some(":ptr_clone"),
                EXPECTED_MIGRATOR_ROLE,
                EXPECTED_MIGRATOR_ROLE,
            ),
            (
                Some("scram-sha-256:ptr_clone"),
                "postgres",
                EXPECTED_MIGRATOR_ROLE,
            ),
            (
                Some("scram-sha-256:ptr_clone"),
                EXPECTED_MIGRATOR_ROLE,
                "postgres",
            ),
        ] {
            match validate_migrator_identity(
                system_user,
                session_role,
                current_role,
                EXPECTED_MIGRATOR_ROLE,
            ) {
                Err(MigrateError::UnexpectedMigratorIdentity {
                    expected,
                    session_role: actual_session,
                    current_role: actual_current,
                }) => {
                    assert_eq!(expected, EXPECTED_MIGRATOR_ROLE);
                    assert_eq!(actual_session, session_role);
                    assert_eq!(actual_current, current_role);
                }
                other => panic!("expected a migrator-identity error, got {other:?}"),
            }
        }
    }

    #[test]
    fn migration_preflight_requires_a_complete_restricted_runtime_role() {
        validate_runtime_role_posture(EXPECTED_RUNTIME_ROLE, Some(&restricted_runtime_role()))
            .expect("the provisioned runtime role is accepted");

        match validate_runtime_role_posture(EXPECTED_RUNTIME_ROLE, None) {
            Err(MigrateError::RuntimeRoleMissing { role }) => {
                assert_eq!(role, EXPECTED_RUNTIME_ROLE);
            }
            other => panic!("expected a missing runtime-role error, got {other:?}"),
        }

        let cases: [PostureMutation; 8] = [
            ("LOGIN is required", |posture| posture.can_login = false),
            ("SUPERUSER bypasses row-level security", |posture| {
                posture.is_superuser = true
            }),
            ("CREATEDB exceeds the runtime boundary", |posture| {
                posture.can_create_database = true
            }),
            ("CREATEROLE exceeds the runtime boundary", |posture| {
                posture.can_create_role = true
            }),
            ("INHERIT permits privilege expansion", |posture| {
                posture.inherits = true
            }),
            ("REPLICATION exceeds the runtime boundary", |posture| {
                posture.can_replicate = true
            }),
            ("BYPASSRLS disables row-level security", |posture| {
                posture.bypasses_rls = true
            }),
            ("role memberships permit privilege expansion", |posture| {
                posture.membership_count = 1
            }),
        ];

        for (expected_reason, mutate) in cases {
            let mut posture = restricted_runtime_role();
            mutate(&mut posture);
            assert_runtime_role_rejected(posture, expected_reason);
        }
    }

    #[test]
    fn the_baseline_is_embedded_and_is_version_one() {
        let migration = MIGRATOR
            .iter()
            .find(|migration| migration.version == BASELINE_VERSION)
            .expect("the baseline must be embedded");
        assert_eq!(migration.version, BASELINE_VERSION);
        assert!(
            !migration.no_tx,
            "the baseline contains no CREATE INDEX CONCURRENTLY, so it must run in a \
             transaction; a partially-applied baseline is not something to invent"
        );
    }
}
