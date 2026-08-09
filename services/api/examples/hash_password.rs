//! Hashes a password with the service's own Argon2id parameters.
//!
//! There is no signup endpoint, so the first account has to be provisioned out of band.
//! Doing that with this tool rather than an ad-hoc script means the hash is produced by
//! exactly the same code path the login endpoint verifies against - including the
//! `$argon2id$` prefix that `rooms_access_tiers_argon2id_check` requires.
//!
//! Usage:
//!   cargo run -p tradingroom-api --example hash_password -- '<password>'

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let password = std::env::args()
        .nth(1)
        .ok_or("usage: cargo run -p tradingroom-api --example hash_password -- '<password>'")?;

    let hash = tradingroom_api::auth::password::hash_password(password).await?;
    // Printed alone so it can be piped straight into psql without extra parsing.
    println!("{hash}");
    Ok(())
}
