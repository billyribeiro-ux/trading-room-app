//! CLI for [`tradingroom_api::provision`].
//!
//! Thin on purpose: it reads the environment and calls the library, which is where the
//! transaction and the validation live. Same split as `migrate` - the part worth testing is
//! importable, and a binary's functions are not.
//!
//! ```text
//! PROVISION_ENTERPRISE_NAME="Pro Trading Room" \
//! PROVISION_ENTERPRISE_SLUG=protradingroom \
//! PROVISION_ROOM_NAME="Main Room" \
//! PROVISION_OWNER_EMAIL=owner@example.com \
//! PROVISION_OWNER_DISPLAY_NAME="Test Presenter" \
//! PROVISION_OWNER_PASSWORD=... \
//! MIGRATE_DATABASE_URL=postgres://... \
//! provision-room
//! ```
//!
//! The password is taken from the environment rather than an argument: an argument is visible in
//! `ps` to every user on the host, and lands in the shell history file.
//!
//! Idempotent. Re-running converges, and re-running with a different password rotates it - which
//! is the only password-changing path that exists today.

use std::time::Duration;

use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::EnvFilter;
use tradingroom_api::provision;

#[derive(Debug, thiserror::Error)]
enum CliError {
    #[error("set MIGRATE_DATABASE_URL to the owner's connection string")]
    NoDatabaseUrl,
    #[error("set {0}")]
    MissingEnv(&'static str),
    #[error(transparent)]
    Provision(#[from] provision::ProvisionError),
    #[error(transparent)]
    Connect(#[from] sqlx::Error),
}

/// Trimmed, because a trailing newline in a deployment variable is a typo rather than a value.
fn required(name: &'static str) -> Result<String, CliError> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or(CliError::MissingEnv(name))
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,sqlx=warn")),
        )
        .init();

    match run().await {
        Ok(room_id) => {
            // The one value the operator carries to the room application, on stdout by itself so
            // `TRADINGROOM_ROOM_ID=$(provision-room)` is not a trick.
            println!("{room_id}");
            std::process::ExitCode::SUCCESS
        }
        Err(error) => {
            tracing::error!(%error, "provisioning failed");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<uuid::Uuid, CliError> {
    let url = std::env::var("MIGRATE_DATABASE_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or(CliError::NoDatabaseUrl)?;

    let enterprise_name = required("PROVISION_ENTERPRISE_NAME")?;
    let enterprise_slug = required("PROVISION_ENTERPRISE_SLUG")?;
    let room_name = required("PROVISION_ROOM_NAME")?;
    let owner_email = required("PROVISION_OWNER_EMAIL")?;
    let owner_display_name = required("PROVISION_OWNER_DISPLAY_NAME")?;
    // Deliberately NOT trimmed: leading and trailing spaces are part of a password.
    let owner_password = std::env::var("PROVISION_OWNER_PASSWORD")
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or(CliError::MissingEnv("PROVISION_OWNER_PASSWORD"))?;

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(Duration::from_secs(10))
        .connect(&url)
        .await?;

    Ok(provision::provision(
        &pool,
        &enterprise_name,
        &enterprise_slug,
        &room_name,
        &owner_email,
        &owner_display_name,
        owner_password,
    )
    .await?)
}
