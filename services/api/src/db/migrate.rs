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

/// The login the application authenticates as at runtime.
///
/// `tradingroom_app` since 2026-08-15. It is created by
/// `0009_provision_tradingroom_app.sql`, which mirrors every grant and every RLS policy membership
/// from the baseline role, and by the role provisioner so that it exists before the API starts.
pub const EXPECTED_RUNTIME_ROLE: &str = "tradingroom_app";

/// The role `0001_baseline.sql` creates if it is absent — and the reason this preflight exists.
///
/// SEPARATE from [`EXPECTED_RUNTIME_ROLE`], and the split is the point. Until 2026-08-15 they were
/// one constant because they were one role, and conflating them is what made the previous rename
/// unlandable.
///
/// This one is a FENCE, not an identity: `0001` carries a forensic branch that creates
/// `ptr_clone_app` with the placeholder password committed at its line 26. That branch must never
/// run, so the role has to be properly provisioned before the chain does. The baseline is
/// byte-identical to the captured schema of the original system and therefore cannot be edited to
/// remove the branch — see `ops/naming-provenance.md`.
///
/// The application never authenticates as this role. `EXPECTED_RUNTIME_ROLE` is what it uses.
pub const BASELINE_PROVISIONED_ROLE: &str = "ptr_clone_app";

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

/// Whether this preflight may accept an ABSENT baseline role.
///
/// Two states of one database, and they want opposite answers from the same check.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum AbsentBaselineRole {
    /// Absence is a refusal. Everything except the one case below.
    Refuse,
    /// Absence is the intended end state, and refusing it would block every future deploy.
    Accept,
}

/// Decides whether `ptr_clone_app` may be absent, from whether `0001` has already been applied.
///
/// ── WHY THIS EXISTS, MEASURED RATHER THAN REASONED ──────────────────────────────────────────
///
/// [`BASELINE_PROVISIONED_ROLE`] is a FENCE, and the thing it fences is precise: `0001_baseline.sql`
/// carries a forensic branch that creates `ptr_clone_app` with the placeholder password committed at
/// its line 26. Requiring the role to exist *before the chain runs* keeps that branch unreachable.
///
/// That branch is only reachable while `0001` is PENDING. Once SQLx has recorded `0001` as applied,
/// it never executes again on that database, so on that database the fence is guarding a branch that
/// cannot run — and the requirement has no remaining subject.
///
/// It does, however, still have an effect, and on 2026-08-31 that effect was measured on a live
/// PostgreSQL 16.13 cluster. `migrations/0010_retire_ptr_clone_app.sql` strips every privilege the
/// baseline role holds, and its closing note documents the operator step that finishes the job on a
/// cluster which will take no further new databases:
///
/// ```text
/// DROP ROLE ptr_clone_app;   -- refuses, correctly, while any database still grants
/// ```
///
/// With the requirement unconditional, that step BRICKS THE DEPLOYMENT. The very next run of the
/// `migrate` binary against a database that had already applied the entire chain — the ordinary
/// shape of a deploy — exited 1:
///
/// ```text
/// migrate failed: migration preflight requires preprovisioned runtime role ptr_clone_app;
///                 run the role provisioner before migrations
/// ```
///
/// So the unconditional requirement and the retirement cannot both stand: it makes the documented
/// end state permanently un-deployable, and it does so for a database where the branch it guards is
/// already unreachable. This is that step's consumer — without it the step is not takeable, and
/// `0010` says so where it prescribes it.
///
/// ── WHY THIS IS NOT A WEAKENING ─────────────────────────────────────────────────────────────
///
/// The fence is untouched in every state where it can act. Absence is accepted on exactly one
/// condition — `0001` already recorded applied and successful — and in that state `0001` will not
/// run, so no placeholder password can be created. On a fresh database, on a database whose ledger
/// does not exist yet, and on a database where `0001` is recorded as FAILED and will therefore be
/// retried, this returns [`AbsentBaselineRole::Refuse`] and the preflight behaves exactly as before.
///
/// Presence is not weakened either, in either state: an existing baseline role is still put through
/// the complete posture check by [`validate_runtime_role_posture`]. A cluster that re-provisions the
/// role after retirement — which is what `docker/postgres/10-provision-roles.sh` does at cluster
/// init — is therefore still refused if it provisions it unsafely.
///
/// Fail-closed by construction: the only input that unlocks acceptance is positive evidence read
/// from the database's own ledger. Every failure to obtain that evidence lands on `false`.
const fn baseline_role_absence_policy(baseline_migration_applied: bool) -> AbsentBaselineRole {
    if baseline_migration_applied {
        AbsentBaselineRole::Accept
    } else {
        AbsentBaselineRole::Refuse
    }
}

/// Whether SQLx's ledger records [`BASELINE_VERSION`] as applied AND successful on this database.
///
/// Two queries rather than one, because a relation name is resolved at PARSE time: a single
/// `SELECT … FROM _sqlx_migrations WHERE to_regclass('_sqlx_migrations') IS NOT NULL` still fails
/// with `relation does not exist` on a fresh database, since the guard never gets to run.
///
/// `to_regclass` is unqualified on purpose, so it resolves through the same `search_path` SQLx
/// itself uses to create and read the table. A hardcoded `public.` would answer about a different
/// relation than the one the migrator is about to write to.
async fn baseline_migration_is_applied(
    connection: &mut PgConnection,
) -> Result<bool, MigrateError> {
    let ledger_exists: bool =
        sqlx::query_scalar("SELECT to_regclass('_sqlx_migrations') IS NOT NULL")
            .fetch_one(&mut *connection)
            .await?;

    if !ledger_exists {
        return Ok(false);
    }

    // `success` is load-bearing: a FAILED `0001` will be retried, so its forensic branch is
    // reachable again and the fence must stand.
    sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM _sqlx_migrations WHERE version = $1 AND success)",
    )
    .bind(BASELINE_VERSION)
    .fetch_one(&mut *connection)
    .await
    .map_err(MigrateError::from)
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
    absent_runtime_role: AbsentBaselineRole,
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

    // EXACTLY ONE NAME, and that is a security property rather than a simplification.
    //
    // This previously matched two names with `WHERE rolname IN ($1, $2) ORDER BY (rolname = $2)
    // DESC LIMIT 1`, to tolerate a cluster mid-rename. The effect was a FAIL-OPEN: asking about role
    // X returned role Y's posture whenever Y existed, and `validate_runtime_role_posture` then
    // reported that posture under the name it had been asked about. A preflight whose entire job is
    // to refuse an absent or unsafe role answered `Ok` for a role that did not exist — disarming the
    // fence against `0001`'s committed-password branch, which is the one thing it is here to stop.
    //
    // The rename that required the tolerance was withdrawn as non-convergent, so the tolerance goes
    // with it. `migration_reappliability.rs` asserts on this module's source text that a second
    // bound name never returns.
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

    // ABSENCE is the only case the caller can relax, and PRESENCE is never relaxed: a role that is
    // here still goes through the complete posture check below, in both policies. See
    // `baseline_role_absence_policy` for the whole argument and the run that established it.
    if posture.is_none() && absent_runtime_role == AbsentBaselineRole::Accept {
        tracing::info!(
            role = expected_runtime,
            "baseline role is absent and the baseline migration is already applied; \
             accepting the retired end state"
        );
        return Ok(());
    }

    validate_runtime_role_posture(expected_runtime, posture.as_ref())?;

    Ok(())
}

/// Exposes the ledger read that decides the baseline-role absence policy.
///
/// The policy function itself is a pure `const fn` with a unit test; this is the half that talks to
/// a database, and the half whose failure mode — answering `true` on a database that has NOT applied
/// `0001` — would silently disarm the fence.
#[cfg(feature = "testing")]
#[doc(hidden)]
pub async fn baseline_migration_is_applied_for_tests(pool: &PgPool) -> Result<bool, MigrateError> {
    let mut connection = pool.acquire().await?;
    baseline_migration_is_applied(&mut connection).await
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
    // `Refuse`, always. This entry point exists to exercise the fence with isolated role fixtures,
    // and the fixtures are named roles that no migration ledger knows about — so the retirement
    // relaxation must not reach them, or `preflight_rejects_absent_and_unsafe_isolated_runtime_roles`
    // would stop asserting the absent case on any database that has run its chain.
    preflight_for_roles_on_connection(
        &mut connection,
        expected_migrator,
        expected_runtime,
        AbsentBaselineRole::Refuse,
    )
    .await
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
    // BASELINE_PROVISIONED_ROLE, not EXPECTED_RUNTIME_ROLE, and the distinction is load-bearing.
    //
    // This preflight guards one thing: that `0001` never reaches its forensic branch and creates
    // `ptr_clone_app` with the placeholder password committed at its line 26. So it must check the
    // role `0001` would create — the baseline role.
    //
    // Checking the runtime role here would be a bootstrap deadlock: `tradingroom_app` is created BY
    // this chain, in `0009`, so on a fresh cluster it does not exist yet and the preflight would
    // refuse to run the migration that creates it. The runtime role's own posture is asserted twice
    // elsewhere — by `0009` when it provisions it, and by `assert_runtime_role_is_restricted` at
    // API startup.
    //
    // The absence policy is read from this database's own ledger rather than assumed, because
    // `0010_retire_ptr_clone_app.sql` prescribes dropping this very role once the cluster has
    // converged. See `baseline_role_absence_policy`.
    let absent_baseline_role =
        baseline_role_absence_policy(baseline_migration_is_applied(&mut connection).await?);
    preflight_for_roles_on_connection(
        &mut connection,
        EXPECTED_MIGRATOR_ROLE,
        BASELINE_PROVISIONED_ROLE,
        absent_baseline_role,
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

    /// The four states of the fence, all four asserted, because only one of them changed.
    ///
    /// `0010_retire_ptr_clone_app.sql` prescribes dropping `ptr_clone_app` once the cluster has
    /// converged, and an unconditional requirement then refuses every subsequent deploy — measured
    /// on a live cluster on 2026-08-31, `migrate` exiting 1 on a database that had applied the whole
    /// chain.
    ///
    /// The relaxation is one cell of this table. The other three are here so a later edit that
    /// widens it has to widen a stated assertion rather than a single boolean.
    #[test]
    fn the_baseline_role_may_be_absent_only_after_the_baseline_has_been_applied() {
        /*
          THE FENCE, unchanged. `0001` is still pending, so its forensic branch is still reachable
          and an absent role would be created with the placeholder password committed at its line 26.
        */
        assert_eq!(
            baseline_role_absence_policy(false),
            AbsentBaselineRole::Refuse,
            "a database that has not applied 0001 must still refuse an absent baseline role"
        );

        /*
          THE RELAXATION, and the whole of it. SQLx never re-executes a migration it has recorded as
          applied, so on this database the branch the fence guards cannot run.
        */
        assert_eq!(
            baseline_role_absence_policy(true),
            AbsentBaselineRole::Accept,
            "after 0001 is applied, an absent baseline role is 0010's intended end state"
        );

        /*
          PRESENCE is never relaxed, in either policy — the relaxation is reached only when the
          lookup returned None. This is the assertion that would go red if somebody moved the
          short-circuit above the posture check instead of beside it.
        */
        validate_runtime_role_posture(BASELINE_PROVISIONED_ROLE, Some(&restricted_runtime_role()))
            .expect("a restricted baseline role is accepted whatever the ledger says");

        let mut unsafe_posture = restricted_runtime_role();
        unsafe_posture.bypasses_rls = true;
        match validate_runtime_role_posture(BASELINE_PROVISIONED_ROLE, Some(&unsafe_posture)) {
            Err(MigrateError::UnsafeRuntimeRole { role, reason }) => {
                assert_eq!(role, BASELINE_PROVISIONED_ROLE);
                assert_eq!(reason, "BYPASSRLS disables row-level security");
            }
            other => {
                panic!("a re-provisioned unsafe baseline role must still be refused, got {other:?}")
            }
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
