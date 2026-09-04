//! The non-RLS identity tables.
//!
//! `users` carries no `enterprise_id` and no row-level security - identity is global, and
//! `SCHEMA-REFERENCE.md` §1.3 records that its isolation is "enforced in application code".
//! This module is that application code, kept to one file so the claim is reviewable rather
//! than spread across handlers.
//!
//! Everything here therefore takes an explicit `user_id` and scopes on it. There is no tenant
//! GUC to fall back on: get the `WHERE` wrong and the database will not save you, which is the
//! entire reason these queries do not live beside the room ones.

use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{Db, DbError};

/// Current, non-secret identity for an authenticated account bootstrap.
///
/// Deliberately excludes email, hashes, phone and provider ids. A signed access token proves who
/// the caller was when it was issued; this database read proves that identity still exists and
/// supplies mutable fields without trusting stale claims.
#[derive(Debug, Clone, PartialEq, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CurrentProfile {
    pub id: Uuid,
    pub display_name: String,
    pub is_platform_admin: bool,
    pub is_guest: bool,
    pub preferences: Value,
}

pub async fn current_profile(db: &Db, user_id: Uuid) -> Result<Option<CurrentProfile>, DbError> {
    sqlx::query_as(
        "SELECT id, display_name, is_platform_admin, is_guest, preferences \
         FROM users WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(db.identity_pool())
    .await
    .map_err(DbError::from)
}

/// Atomically changes the mutable profile fields owned by one authenticated identity.
///
/// The preferences object is shallow-merged in the same statement as the display name change.
/// Returning the row from that statement is the read-after-write guarantee: a successful HTTP
/// response can never contain a profile read before the committed mutation, and two tabs changing
/// distinct preference keys cannot erase one another.
pub async fn update_profile(
    db: &Db,
    user_id: Uuid,
    display_name: &str,
    preferences: &Value,
    now: OffsetDateTime,
) -> Result<CurrentProfile, DbError> {
    if !preferences.is_object() {
        return Err(DbError::CheckViolation {
            constraint: "users_preferences_object_check".into(),
        });
    }

    sqlx::query_as(
        "UPDATE users \
         SET display_name = $2, preferences = preferences || $3, updated_at = $4 \
         WHERE id = $1 AND is_guest = false \
         RETURNING id, display_name, is_platform_admin, is_guest, preferences",
    )
    .bind(user_id)
    .bind(display_name)
    .bind(sqlx::types::Json(preferences))
    .bind(now)
    .fetch_optional(db.identity_pool())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Replaces one key inside `users.preferences`.
///
/// `jsonb_set` rather than reading the object, editing it in Rust and writing it back: the
/// read-modify-write loses a concurrent change to a *different* key, which is exactly what two
/// browser tabs saving two settings produces. Merging in the database makes the update atomic
/// per key.
///
/// `users_preferences_object_check` requires the column to stay a JSON object; `jsonb_set` on a
/// non-object would violate it rather than silently replacing the lot.
pub async fn set_preference(
    db: &Db,
    user_id: Uuid,
    key: &str,
    value: &Value,
    now: OffsetDateTime,
) -> Result<Value, DbError> {
    // The key is a caller-supplied string, which is why it is *bound* as a text array element
    // rather than interpolated into the path. A key containing `,` or `}` would otherwise be
    // able to reshape the path expression.
    sqlx::query_scalar(
        "UPDATE users \
         SET preferences = jsonb_set(preferences, ARRAY[$2], $3, true), updated_at = $4 \
         WHERE id = $1 \
         RETURNING preferences",
    )
    .bind(user_id)
    .bind(key)
    .bind(sqlx::types::Json(value))
    .bind(now)
    .fetch_optional(db.identity_pool())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Merges a whole object of preferences in one statement.
///
/// `||` is a shallow merge: keys present in `patch` win, keys absent are untouched. That is the
/// behaviour a "save theme" action wants - it should not silently clear settings it does not
/// know about, which a full replace would.
pub async fn merge_preferences(
    db: &Db,
    user_id: Uuid,
    patch: &Value,
    now: OffsetDateTime,
) -> Result<Value, DbError> {
    if !patch.is_object() {
        return Err(DbError::CheckViolation {
            constraint: "users_preferences_object_check".into(),
        });
    }

    sqlx::query_scalar(
        "UPDATE users SET preferences = preferences || $2, updated_at = $3 \
         WHERE id = $1 \
         RETURNING preferences",
    )
    .bind(user_id)
    .bind(sqlx::types::Json(patch))
    .bind(now)
    .fetch_optional(db.identity_pool())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

pub async fn preferences(db: &Db, user_id: Uuid) -> Result<Value, DbError> {
    sqlx::query_scalar("SELECT preferences FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(db.identity_pool())
        .await
        .map_err(DbError::from)?
        .ok_or(DbError::NotFound)
}
