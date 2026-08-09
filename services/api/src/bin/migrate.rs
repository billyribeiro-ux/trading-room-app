//! The migration binary.
//!
//! Deliberately a **separate binary** from the server. Migrations must run as the owner
//! (`ptr_clone`): a `FORCE ROW LEVEL SECURITY` table can only be altered by the role that
//! owns it. The server must *not* run as that role - it runs as the restricted,
//! membership-free `ptr_clone_app` role and refuses to boot otherwise
//! (`tradingroom_api::db::Db::assert_runtime_role_is_restricted`).
//!
//! Keeping them in one process would mean the server image carries an owner credential it
//! must never use. Two binaries makes the privilege split structural rather than a rule
//! somebody has to remember, and lets the deployment run migrations as a separate job.
//!
//! ```text
//! migrate # apply every pending migration
//! ```
//!
//! `MIGRATE_DATABASE_URL` is read in preference to `DATABASE_URL` so a deployment can hold
//! both credentials without the server ever seeing the owner's.
//! Before migration, the binary proves that this connection authenticated exactly as `ptr_clone`
//! and that the restricted `ptr_clone_app` login was safely preprovisioned. This
//! prevents the pinned baseline's legacy `CHANGE_ME_*` role-creation branches from running.
//! Baseline adoption is intentionally unsupported: only migrations that actually execute may
//! create successful SQLx ledger entries.

use sqlx::postgres::PgPoolOptions;
use std::time::Duration;

use tracing_subscriber::EnvFilter;
use tradingroom_api::db::migrate;

#[derive(Debug, thiserror::Error)]
enum MigrateCliError {
    #[error(
        "set MIGRATE_DATABASE_URL (preferred) or DATABASE_URL to the owner's connection string"
    )]
    NoDatabaseUrl,
    #[error("unrecognised argument {0:?}; usage: migrate")]
    BadArgument(String),
    #[error(transparent)]
    Connect(#[from] sqlx::Error),
    #[error(transparent)]
    Migrate(#[from] migrate::MigrateError),
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,sqlx=warn")),
        )
        .init();

    match run().await {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("migrate failed: {error}");
            tracing::error!(%error, "migrate failed");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<(), MigrateCliError> {
    if let Some(argument) = std::env::args().nth(1) {
        return Err(MigrateCliError::BadArgument(argument));
    }

    let url = std::env::var("MIGRATE_DATABASE_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or(MigrateCliError::NoDatabaseUrl)?;

    // One connection: migrations are serial by nature, and a wide pool here would only
    // compete with a running server for the same connection budget.
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&url)
        .await?;

    // `run` owns the identity/runtime-role preflight and migration execution on one connection;
    // keeping that boundary in the library makes it impossible for another caller to skip.
    migrate::run(&pool).await?;
    tracing::info!("migrations up to date");

    pool.close().await;
    Ok(())
}
