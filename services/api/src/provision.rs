//! Provisioning the first tenant.
//!
//! One enterprise, one room, one owner - step 1 of `docs/CUTOVER-ROOM-TO-API.md`. Before the room
//! application can talk to this API, an account has to exist here that its owner can log in as,
//! inside a room whose id becomes `TRADINGROOM_ROOM_ID`.
//!
//! Lives in the library rather than in `bin/provision-room.rs` for the same reason
//! [`crate::db::migrate`] does: a binary's functions cannot be imported by an integration test,
//! and the part worth testing is the transaction, not the environment parsing.
//!
//! # Why the owner connection
//!
//! `enterprises` has no `enterprise_id` of its own, and every other table's RLS policy compares
//! against `app.enterprise_id`. Creating the first enterprise is therefore not something the
//! restricted runtime role can do - by design, since a tenant that can create tenants is not
//! isolated. So this runs as the owner and is a separate job from the server.

use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::auth::password;

/// Minimum kept deliberately low - this is not a login form, it is an operator setting their own
/// password once. The API's own ceiling is what protects the hasher.
pub const MIN_PASSWORD_BYTES: usize = 12;

#[derive(Debug, thiserror::Error)]
pub enum ProvisionError {
    #[error("the owner password must be at least {MIN_PASSWORD_BYTES} bytes")]
    WeakPassword,
    #[error("the enterprise slug must be lowercase letters, digits and hyphens: got {0:?}")]
    BadSlug(String),
    #[error(transparent)]
    Password(#[from] password::PasswordError),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}

/// Creates or converges the tenant, returning the room id.
///
/// The two validations live here rather than in the CLI because they are rules about the data,
/// not about the environment: a caller reaching this function through any other route must not be
/// able to store a one-character password or a slug that cannot appear in a URL.
pub async fn provision(
    pool: &PgPool,
    enterprise_name: &str,
    enterprise_slug: &str,
    room_name: &str,
    owner_email: &str,
    owner_display_name: &str,
    owner_password: String,
) -> Result<Uuid, ProvisionError> {
    if owner_password.len() < MIN_PASSWORD_BYTES {
        return Err(ProvisionError::WeakPassword);
    }
    if enterprise_slug.is_empty()
        || !enterprise_slug
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(ProvisionError::BadSlug(enterprise_slug.to_owned()));
    }

    let owner_email = owner_email.trim().to_lowercase();
    let password_hash = password::hash_password(owner_password).await?;

    // One transaction: a half-provisioned tenant - an enterprise with no room, or a room with no
    // owner - is worse than none, because the second run's upserts would converge onto it and
    // hide that the first failed.
    let mut tx = pool.begin().await?;

    let enterprise_id: Uuid = sqlx::query(
        "INSERT INTO enterprises (name, slug) VALUES ($1, $2) \
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now() \
         RETURNING id",
    )
    .bind(enterprise_name)
    .bind(enterprise_slug)
    .fetch_one(&mut *tx)
    .await?
    .get("id");

    // `email_hash` is md5 of the lowercased address - the same digest the room application
    // already computes for gravatar (`src/lib/server/connection.ts`), verified against
    // `fixtures/seed.sql`: md5("owner@acme.test") is aa01a07b57da4db21fc9e43a13a26f0b.
    let owner_id: Uuid = sqlx::query(
        "INSERT INTO users (email, email_hash, password_hash, display_name) \
         VALUES ($1, md5($1), $2, $3) \
         ON CONFLICT (email) DO UPDATE \
           SET password_hash = EXCLUDED.password_hash, \
               display_name  = EXCLUDED.display_name, \
               updated_at    = now() \
         RETURNING id",
    )
    .bind(&owner_email)
    .bind(&password_hash)
    .bind(owner_display_name)
    .fetch_one(&mut *tx)
    .await?
    .get("id");

    // `uuid_short` is the room's public handle and is unique per enterprise. Derived from the
    // slug so a re-run addresses the same room instead of creating a second one.
    let uuid_short = enterprise_slug.chars().take(12).collect::<String>();

    // `config` carries only what the schema's CHECK constraints require: `access.tiers` must be
    // an array or `rooms_access_tiers_array_check` coalesces NULL to false. `capabilities` is
    // deliberately absent - `RoleDefaults::from_room_config` returns `COMPILED_IN` when it is
    // missing, so the room gets the API's own defaults rather than a copy of them frozen here.
    let room_id: Uuid = sqlx::query(
        "INSERT INTO rooms (enterprise_id, owner_id, uuid_short, name, config) \
         VALUES ($1, $2, $3, $4, '{\"access\":{\"tiers\":[]}}'::jsonb) \
         ON CONFLICT (enterprise_id, uuid_short) DO UPDATE \
           SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id, updated_at = now() \
         RETURNING id",
    )
    .bind(enterprise_id)
    .bind(owner_id)
    .bind(&uuid_short)
    .bind(room_name)
    .fetch_one(&mut *tx)
    .await?
    .get("id");

    sqlx::query(
        "INSERT INTO room_members (enterprise_id, room_id, user_id, role, display_name, joined_at) \
         VALUES ($1, $2, $3, 'owner', $4, now()) \
         ON CONFLICT (enterprise_id, room_id, user_id) DO UPDATE \
           SET role = 'owner', updated_at = now()",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(owner_id)
    .bind(owner_display_name)
    .execute(&mut *tx)
    .await?;

    // `room_state` is one row per room and the overview reads it, so a room without one is a
    // room the API cannot describe.
    sqlx::query(
        "INSERT INTO room_state (enterprise_id, room_id) VALUES ($1, $2) \
         ON CONFLICT (enterprise_id, room_id) DO NOTHING",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(room_id)
}
