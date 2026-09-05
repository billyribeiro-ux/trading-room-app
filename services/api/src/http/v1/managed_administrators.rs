//! Canonical account-administrator API.
//!
//! Credentials cross this boundary only on creation.  The stored/replayed response and audit row
//! contain identity ids and revisions, never a plaintext password or password hash.

use std::sync::Arc;

use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::CurrentUser;
use crate::db::TenantCtx;
use crate::db::repo::{managed_administrator as administrator, moderation, room};
use crate::error::ApiError;
use crate::http::AppState;
use crate::provision::MIN_PASSWORD_BYTES;

const DISPLAY_NAME_MAX_BYTES: usize = 160;

#[derive(Debug, Deserialize)]
pub struct AccountPath {
    pub enterprise_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct AdministratorPath {
    pub enterprise_id: Uuid,
    pub user_id: Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateAdministratorRequest {
    pub request_id: Uuid,
    pub display_name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NormalizedCreateDigest<'a> {
    request_id: Uuid,
    display_name: &'a str,
    email: &'a str,
    password_digest: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct DeleteAdministratorRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AdministratorMutationResponse {
    pub administrators: Vec<administrator::ManagedAdministrator>,
    pub removed_user_ids: Vec<Uuid>,
    pub changed: usize,
}

fn valid_email(value: &str) -> bool {
    if value.len() > 254 || value.bytes().any(|byte| byte.is_ascii_whitespace()) {
        return false;
    }
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && local.len() <= 64
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
}

fn normalized_name(value: &str) -> Result<String, ApiError> {
    let value = value.trim();
    if value.is_empty() || value.len() > DISPLAY_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "an administrator name must be 1 to {DISPLAY_NAME_MAX_BYTES} UTF-8 bytes"
        )));
    }
    Ok(value.to_owned())
}

fn digest<T: Serialize>(
    actor_user_id: Uuid,
    enterprise_id: Uuid,
    request: &T,
) -> Result<String, ApiError> {
    let encoded =
        serde_json::to_vec(&(actor_user_id, enterprise_id, request)).map_err(ApiError::internal)?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

async fn account_tx<'a>(
    state: &'a AppState,
    user: &CurrentUser,
    enterprise_id: Uuid,
) -> Result<crate::db::TenantTx<'a>, ApiError> {
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(enterprise_id))
        .await?;
    if !room::lock_account_admin(&mut tx, user.user_id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(tx)
}

async fn replay_or_none(
    tx: &mut crate::db::TenantTx<'_>,
    request_id: Uuid,
    request_digest: &str,
) -> Result<Option<AdministratorMutationResponse>, ApiError> {
    administrator::lock_request(tx, request_id).await?;
    let Some((stored_digest, stored_response)) = administrator::replay(tx, request_id).await?
    else {
        return Ok(None);
    };
    if stored_digest != request_digest {
        return Err(ApiError::Invalid(
            "requestId was already used for a different administrator mutation".into(),
        ));
    }
    Ok(Some(
        serde_json::from_value(stored_response).map_err(ApiError::internal)?,
    ))
}

fn mutation_error(error: administrator::MutationError) -> ApiError {
    match error {
        administrator::MutationError::Database(error) => error.into(),
        administrator::MutationError::IdentityConflict
        | administrator::MutationError::RevisionConflict => ApiError::Conflict,
    }
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
) -> Result<Json<Vec<administrator::ManagedAdministrator>>, ApiError> {
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    let rows = administrator::list(&mut tx, user.user_id).await?;
    tx.commit().await?;
    Ok(Json(rows))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
    payload: Result<Json<CreateAdministratorRequest>, JsonRejection>,
) -> Result<Json<AdministratorMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid administrator creation request".into()))?;
    let display_name = normalized_name(&request.display_name)?;
    let email = request.email.trim().to_lowercase();
    if !valid_email(&email) {
        return Err(ApiError::Invalid(
            "a valid email address is required".into(),
        ));
    }
    if request.password.len() < MIN_PASSWORD_BYTES {
        return Err(ApiError::Invalid(format!(
            "an administrator password must be at least {MIN_PASSWORD_BYTES} bytes"
        )));
    }
    let request_digest = digest(
        user.user_id,
        path.enterprise_id,
        &NormalizedCreateDigest {
            request_id: request.request_id,
            display_name: &display_name,
            email: &email,
            password_digest: hex::encode(Sha256::digest(request.password.as_bytes())),
        },
    )?;
    // Hashing happens before the database transaction so a deliberately expensive KDF does not
    // hold account locks or a pool connection.  Exact retries still converge because the request
    // digest fingerprints the plaintext while the random-salt hash never enters the ledger.
    let password_hash = crate::auth::password::hash_password(request.password).await?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let created =
        administrator::create(&mut tx, user.user_id, &email, &display_name, &password_hash)
            .await
            .map_err(mutation_error)?;
    let target_id = created.user_id;
    let target_revision = created.revision;
    let response = AdministratorMutationResponse {
        administrators: vec![created],
        removed_user_ids: Vec::new(),
        changed: 1,
    };
    let stored = serde_json::to_value(&response).map_err(ApiError::internal)?;
    administrator::record(
        &mut tx,
        request.request_id,
        user.user_id,
        "administrator.created",
        &request_digest,
        &stored,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: path.enterprise_id,
            room_id: None,
            actor_user_id: user.user_id,
            actor_name: &user.display_name,
            event_name: "account.administrator.created",
            event_detail: "account administrator created another account administrator",
            target_type: Some("administrator"),
            target_id: Some(target_id),
            metadata: serde_json::json!({
                "requestId": request.request_id,
                "revision": target_revision
            }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AdministratorPath>,
    payload: Result<Json<DeleteAdministratorRequest>, JsonRejection>,
) -> Result<Json<AdministratorMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid administrator deletion request".into()))?;
    if request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative".into(),
        ));
    }
    let request_digest = digest(user.user_id, path.enterprise_id, &(path.user_id, &request))?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    administrator::remove(
        &mut tx,
        user.user_id,
        path.user_id,
        request.expected_revision,
        now,
    )
    .await
    .map_err(mutation_error)?;
    let response = AdministratorMutationResponse {
        administrators: Vec::new(),
        removed_user_ids: vec![path.user_id],
        changed: 1,
    };
    let stored = serde_json::to_value(&response).map_err(ApiError::internal)?;
    administrator::record(
        &mut tx,
        request.request_id,
        user.user_id,
        "administrator.removed",
        &request_digest,
        &stored,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: path.enterprise_id,
            room_id: None,
            actor_user_id: user.user_id,
            actor_name: &user.display_name,
            event_name: "account.administrator.removed",
            event_detail: "account administrator removed an account administrator",
            target_type: Some("administrator"),
            target_id: Some(path.user_id),
            metadata: serde_json::json!({
                "requestId": request.request_id,
                "expectedRevision": request.expected_revision
            }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}
