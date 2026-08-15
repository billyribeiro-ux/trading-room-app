//! The migration chain must converge under repeated application on ONE cluster.
//!
//! ## The rule, stated once so it can be checked at a glance
//!
//! **A migration may mutate cluster-global state only if that mutation is convergent under
//! repeated application from version 1 on the same cluster.**
//!
//! PostgreSQL roles are cluster-global; the sqlx ledger in `_sqlx_migrations` is per-database. So a
//! migration that renames or drops a role changes the starting conditions of every *other* database
//! on that cluster — including databases that do not exist yet. `0005` mutates the runtime role and
//! is fine, because it is guarded, idempotent, and serialises itself under
//! `LOCK TABLE pg_catalog.pg_authid IN SHARE ROW EXCLUSIVE MODE`. Convergence, not abstinence, is
//! the property that matters — this suite must not be read as "migrations may never touch a role".
//!
//! ## Why this file exists
//!
//! `0009_rename_runtime_roles.sql` renamed `ptr_clone_app` to `tradingroom_app`. It was reviewed,
//! carried a fifty-five line header explaining itself, and shipped. It was also non-convergent:
//! `0001_baseline.sql` re-creates `ptr_clone_app` whenever it is absent, so the SECOND database
//! migrated on the same cluster reached `0009` with both names present, and `0009` refused by
//! design — `P0001 both ptr_clone_app and tradingroom_app exist`.
//!
//! Nothing caught it before it landed, and the reason is this file's whole purpose: **no test ever
//! applied the chain to a second database on one cluster.** Six tests in `migrations.rs` do so
//! incidentally, which is why CI eventually went red — but they surface it as a `P0001` thrown from
//! deep inside a migration, which reads like a database problem rather than a chain-shape problem.
//!
//! Worse than a red gate: on a cluster where `0009` had succeeded, the next database's `0001`
//! re-created `ptr_clone_app` through the baseline's forensic branch — a working TCP login whose
//! password `CHANGE_ME_APP` is committed at `0001_baseline.sql:26`, carrying DML on the tenant
//! tables. Separately, `db/mod.rs` pins `EXPECTED_RUNTIME_ROLE = "ptr_clone_app"` with no allowance
//! for the new name, and `main.rs` calls it at boot, so the API could not have started against a
//! cluster where the rename had succeeded. The migration could neither be deployed nor run twice.
//!
//! So the rule gets a test that names it. A rule with no test is a rule that gets re-broken, and the
//! next attempt to "finally finish the rename" will look every bit as reasonable as the last one.

use sqlx::{Connection, PgConnection, Row};
use tradingroom_api::db::migrate;

mod support;
use support::{Scratch, owner_url};

/// Every role name on the cluster, sorted. This is the cluster-global state at stake.
async fn cluster_role_names(connection: &mut PgConnection) -> Vec<String> {
    sqlx::query("SELECT rolname FROM pg_catalog.pg_roles ORDER BY rolname")
        .fetch_all(&mut *connection)
        .await
        .expect("the owner should be able to read pg_roles")
        .into_iter()
        .map(|row| row.get::<String, _>("rolname"))
        .collect()
}

/// The applied ledger of one database as `(version, success)` pairs, in order.
async fn ledger(pool: &sqlx::PgPool) -> Vec<(i64, bool)> {
    sqlx::query("SELECT version, success FROM _sqlx_migrations ORDER BY version")
        .fetch_all(pool)
        .await
        .expect("a migrated database should carry a ledger")
        .into_iter()
        .map(|row| (row.get::<i64, _>("version"), row.get::<bool, _>("success")))
        .collect()
}

#[tokio::test]
async fn the_chain_applies_to_a_second_database_on_the_same_cluster() {
    /*
       The negative control for this whole file. With `0009` present this passes on the first
       database and fails on the SECOND with `P0001 both ptr_clone_app and tradingroom_app exist` —
       which is exactly why testing against a single database missed it for that migration's life.
    */
    let first = Scratch::create().await;
    let first_pool = first.pool().await;
    migrate::run(&first_pool)
        .await
        .expect("the chain must apply to the first database on a clean cluster");
    let first_ledger = ledger(&first_pool).await;

    let second = Scratch::create().await;
    let second_pool = second.pool().await;
    let applied = migrate::run(&second_pool).await;

    let second_ledger = if applied.is_ok() {
        Some(ledger(&second_pool).await)
    } else {
        None
    };

    // Both databases are released before asserting, so a failure reports the defect rather than
    // leaving two scratch databases behind for `Scratch::sweep` to find later.
    first.finish(first_pool).await;
    second.finish(second_pool).await;

    applied.expect(
        "the chain must apply to a SECOND database on the same cluster. A failure here means a \
         migration mutated cluster-global state non-convergently: it destroyed a starting condition \
         that an earlier migration in the same chain restores. See this file's header.",
    );

    let second_ledger = second_ledger.expect("checked Ok above");
    assert!(
        !first_ledger.is_empty(),
        "an empty ledger would make every assertion here vacuously true"
    );
    assert_eq!(
        first_ledger, second_ledger,
        "both databases must reach an identical ledger; the chain must not depend on what the \
         cluster has already seen"
    );
    assert!(
        first_ledger.iter().all(|(_, success)| *success),
        "every applied migration must be recorded successful: {first_ledger:?}"
    );
}

#[tokio::test]
async fn no_migration_changes_the_clusters_global_role_names() {
    /*
       The rule stated directly. A chain that renames, creates or drops a cluster-global role
       changes the world for every other database on that cluster, including ones created later.
       `0001` creates the runtime role only when absent, so on a provisioned cluster a full run is a
       no-op on this set — that is what convergent looks like from the outside.

       Compares NAMES only, deliberately. `0005` legitimately ALTERs the runtime role's attributes,
       and asserting over the whole catalogue would forbid the hardening this suite exists to keep.
    */
    let mut owner = PgConnection::connect(&owner_url())
        .await
        .expect("the owner should be able to connect");
    let before = cluster_role_names(&mut owner).await;
    assert!(
        before.iter().any(|role| role == "ptr_clone_app"),
        "the runtime role must be provisioned before this test asserts anything; found {before:?}"
    );

    let scratch = Scratch::create().await;
    let pool = scratch.pool().await;
    let applied = migrate::run(&pool).await;
    let after = cluster_role_names(&mut owner).await;
    scratch.finish(pool).await;
    owner.close().await.ok();

    applied.expect("the chain must apply");
    assert_eq!(
        before, after,
        "a full migration run changed the cluster's role names. Roles are cluster-global while the \
         ledger is per-database, so this breaks every other database on the cluster — including \
         databases created later, which then start from a world the chain no longer expects."
    );
}

#[test]
fn the_runtime_role_preflight_resolves_exactly_one_name() {
    /*
       A source contract, guarding a real fail-open rather than a style preference.

       While `0009` existed, the preflight matched EITHER name —
       `WHERE rolname IN ($1, $2) ORDER BY (rolname = $2) DESC LIMIT 1` — so asking about role X
       returned role Y's posture whenever Y was present, and `validate_runtime_role_posture` then
       reported that posture under the name it had been asked about. The check whose entire job is to
       refuse an absent or unsafe runtime role answered `Ok` for a role that did not exist, which
       disarmed the fence against `0001`'s committed-password branch.

       Asserted on source text, following `migrations.rs`, which already pins this same module with
       `include_str!`. The defect is a SHAPE — a second bound name — and by the time it is observable
       at runtime the cluster must already be in the two-name state that a convergent chain can no
       longer produce. Text is the only place it is visible early enough to matter.
    */
    let source = include_str!("../src/db/migrate.rs");

    assert!(
        !source.contains("RENAMED_RUNTIME_ROLE"),
        "migrate.rs names a second runtime role again. That constant existed only to serve the 0009 \
         rename, which was backed out as non-convergent; reintroducing it reintroduces the preflight \
         fail-open this test describes."
    );
    assert!(
        !source.contains("ORDER BY (runtime_role.rolname = $2) DESC"),
        "the runtime-role preflight resolves two names again and returns whichever it prefers. It \
         must look up exactly the role it was asked about, so that an absent role is an error."
    );
}
