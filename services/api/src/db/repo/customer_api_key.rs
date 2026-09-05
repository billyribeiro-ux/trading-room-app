//! Canonical customer API-key metadata and exactly-once management mutations.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ManagedCustomerApiKey {
    pub id: String,
    pub revision: i64,
    pub last_four: String,
    pub restrictions: Value,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    pub last_used_at: Option<OffsetDateTime>,
}

#[derive(Debug, thiserror::Error)]
pub enum MutationError {
    #[error(transparent)]
    Database(#[from] DbError),
    #[error("the customer API key changed after it was read")]
    Conflict,
}

const SELECT: &str = "SELECT id, revision, last_four, restrictions, created_at, updated_at, \
    last_used_at FROM customer_api_keys";

pub async fn list(tx: &mut TenantTx<'_>) -> Result<Vec<ManagedCustomerApiKey>, DbError> {
    let query = format!("{SELECT} ORDER BY created_at, id");
    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

async fn read_one(tx: &mut TenantTx<'_>, key_id: &str) -> Result<ManagedCustomerApiKey, DbError> {
    let query = format!("{SELECT} WHERE id = $1");
    sqlx::query_as(sqlx::AssertSqlSafe(query))
        .bind(key_id)
        .fetch_optional(tx.conn())
        .await
        .map_err(DbError::from)?
        .ok_or(DbError::NotFound)
}

pub async fn lock_request(tx: &mut TenantTx<'_>, request_id: Uuid) -> Result<(), DbError> {
    let mut bytes = [0_u8; 8];
    bytes.copy_from_slice(&request_id.as_bytes()[..8]);
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(i64::from_be_bytes(bytes))
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
        "SELECT request_digest::text, response FROM customer_api_key_mutations \
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
        "INSERT INTO customer_api_key_mutations \
           (enterprise_id, request_id, actor_user_id, mutation_kind, request_digest, response, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .bind(actor_user_id)
    .bind(mutation_kind)
    .bind(request_digest)
    .bind(response)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

pub async fn create(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    secret_hash: &str,
    last_four: &str,
    now: OffsetDateTime,
) -> Result<ManagedCustomerApiKey, DbError> {
    sqlx::query_as(
        "INSERT INTO customer_api_keys \
           (enterprise_id, id, secret_hash, last_four, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $5) \
         RETURNING id, revision, last_four, restrictions, created_at, updated_at, last_used_at",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(key_id)
    .bind(secret_hash)
    .bind(last_four)
    .bind(now)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

async fn lock_revision(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    expected_revision: i64,
) -> Result<(), MutationError> {
    let revision: Option<i64> =
        sqlx::query_scalar("SELECT revision FROM customer_api_keys WHERE id = $1 FOR UPDATE")
            .bind(key_id)
            .fetch_optional(tx.conn())
            .await
            .map_err(DbError::from)?;
    let revision = revision.ok_or(DbError::NotFound)?;
    if revision != expected_revision {
        return Err(MutationError::Conflict);
    }
    Ok(())
}

pub async fn rotate(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    expected_revision: i64,
    secret_hash: &str,
    last_four: &str,
    now: OffsetDateTime,
) -> Result<(ManagedCustomerApiKey, bool), MutationError> {
    lock_revision(tx, key_id, expected_revision).await?;
    let changed = sqlx::query(
        "UPDATE customer_api_keys SET secret_hash = $2, last_four = $3, \
            revision = revision + 1, updated_at = $4 \
         WHERE id = $1 AND (secret_hash, last_four) IS DISTINCT FROM ($2, $3) ",
    )
    .bind(key_id)
    .bind(secret_hash)
    .bind(last_four)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected()
        == 1;
    Ok((read_one(tx, key_id).await?, changed))
}

pub async fn restrict(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    expected_revision: i64,
    restrictions: &Value,
    now: OffsetDateTime,
) -> Result<(ManagedCustomerApiKey, bool), MutationError> {
    lock_revision(tx, key_id, expected_revision).await?;
    let changed = sqlx::query(
        "UPDATE customer_api_keys SET restrictions = $2, revision = revision + 1, updated_at = $3 \
         WHERE id = $1 AND restrictions IS DISTINCT FROM $2",
    )
    .bind(key_id)
    .bind(restrictions)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected()
        == 1;
    Ok((read_one(tx, key_id).await?, changed))
}

pub async fn remove(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    expected_revision: i64,
) -> Result<bool, MutationError> {
    lock_revision(tx, key_id, expected_revision).await?;
    let changed = sqlx::query("DELETE FROM customer_api_keys WHERE id = $1")
        .bind(key_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?
        .rows_affected();
    if changed != 1 {
        return Err(DbError::NotFound.into());
    }
    Ok(true)
}
