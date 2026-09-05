//! Canonical account-administrator reads and exactly-once mutations.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::FromRow)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ManagedAdministrator {
    pub user_id: Uuid,
    pub revision: i64,
    pub display_name: String,
    pub email: String,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, thiserror::Error)]
pub enum MutationError {
    #[error(transparent)]
    Database(#[from] DbError),
    #[error("the identity already exists")]
    IdentityConflict,
    #[error("the administrator revision is stale")]
    RevisionConflict,
}

pub async fn list(
    tx: &mut TenantTx<'_>,
    actor_user_id: Uuid,
) -> Result<Vec<ManagedAdministrator>, DbError> {
    sqlx::query_as(
        "SELECT user_id, revision, display_name, email, created_at, updated_at \
           FROM account_list_administrators($1)",
    )
    .bind(actor_user_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn lock_request(tx: &mut TenantTx<'_>, request_id: Uuid) -> Result<(), DbError> {
    let key = i64::from_be_bytes(
        request_id.as_bytes()[..8]
            .try_into()
            .expect("eight UUID bytes"),
    );
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(key)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    Ok(())
}

pub async fn replay(
    tx: &mut TenantTx<'_>,
    request_id: Uuid,
) -> Result<Option<(String, Value)>, DbError> {
    sqlx::query_as(
        "SELECT request_digest::text, response FROM administrator_mutations \
         WHERE enterprise_id = $1 AND request_id = $2",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn record(
    tx: &mut TenantTx<'_>,
    request_id: Uuid,
    actor_user_id: Uuid,
    mutation_kind: &str,
    request_digest: &str,
    response: &Value,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO administrator_mutations \
           (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .bind(actor_user_id)
    .bind(mutation_kind)
    .bind(request_digest)
    .bind(sqlx::types::Json(response))
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

pub async fn create(
    tx: &mut TenantTx<'_>,
    actor_user_id: Uuid,
    email: &str,
    display_name: &str,
    password_hash: &str,
) -> Result<ManagedAdministrator, MutationError> {
    let user_id = match sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO users (email, email_hash, display_name, is_guest) \
         VALUES ($1, md5($1), $2, false) RETURNING id",
    )
    .bind(email)
    .bind(display_name)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
    {
        Ok(id) => id,
        Err(DbError::UniqueViolation { .. }) => return Err(MutationError::IdentityConflict),
        Err(error) => return Err(error.into()),
    };

    // `users` is deliberately column-privileged rather than relation-privileged.  Password hashes
    // are UPDATE-only, so the identity is inserted and completed inside this same transaction;
    // no passwordless intermediate state can commit.
    sqlx::query("UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1")
        .bind(user_id)
        .bind(password_hash)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;

    let revision: Option<i64> = sqlx::query_scalar("SELECT account_create_administrator($1, $2)")
        .bind(actor_user_id)
        .bind(user_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)?;
    revision.ok_or(DbError::NotFound)?;

    list(tx, actor_user_id)
        .await?
        .into_iter()
        .find(|administrator| administrator.user_id == user_id)
        .ok_or(DbError::NotFound.into())
}

pub async fn remove(
    tx: &mut TenantTx<'_>,
    actor_user_id: Uuid,
    target_user_id: Uuid,
    expected_revision: i64,
    now: OffsetDateTime,
) -> Result<(), MutationError> {
    let revision: Option<i64> = sqlx::query_scalar("SELECT account_lock_administrator($1, $2)")
        .bind(actor_user_id)
        .bind(target_user_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)?;
    let revision = revision.ok_or(DbError::NotFound)?;
    if revision != expected_revision {
        return Err(MutationError::RevisionConflict);
    }

    let deleted: bool = sqlx::query_scalar("SELECT account_delete_administrator($1, $2)")
        .bind(actor_user_id)
        .bind(target_user_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)?;
    if !deleted {
        return Err(DbError::NotFound.into());
    }

    // Membership revocation and refresh-token revocation commit atomically.  Existing access
    // tokens remain cryptographically valid for their short TTL but every account endpoint
    // re-locks the now-absent membership before reading or writing tenant state.
    sqlx::query(
        "UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2 \
         WHERE user_id = $1 AND revoked_at IS NULL",
    )
    .bind(target_user_id)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}
