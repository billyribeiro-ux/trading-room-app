//! Canonical customer API-key management. Plaintext secrets never cross this boundary.

use std::collections::BTreeSet;
use std::net::Ipv4Addr;
use std::str::FromStr;
use std::sync::Arc;

use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::CurrentUser;
use crate::db::repo::{customer_api_key as api_key, moderation, room};
use crate::db::{DbError, TenantCtx};
use crate::error::ApiError;
use crate::http::AppState;

const SCOPES: [&str; 11] = [
    "sessions/list",
    "sessions/users",
    "sessions/addUsers",
    "sessions/delUsers",
    "sessions/userstats",
    "sessions/chatlogs",
    "sessions/alertlogs",
    "sessions/deletedlogs",
    "sessions/archivedlogs",
    "sessions/recordings",
    "sessions/cloneSession",
];

#[derive(Debug, Deserialize)]
pub struct AccountPath {
    pub enterprise_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct KeyPath {
    pub enterprise_id: Uuid,
    pub key_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CustomerApiKeyRestrictions {
    pub ips: Vec<String>,
    pub scopes: Vec<String>,
    pub sessions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateCustomerApiKeyRequest {
    pub request_id: Uuid,
    pub key_id: String,
    pub secret_hash: String,
    pub last_four: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RotateCustomerApiKeyRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
    pub secret_hash: String,
    pub last_four: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RestrictCustomerApiKeyRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
    pub restrictions: CustomerApiKeyRestrictions,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct DeleteCustomerApiKeyRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CustomerApiKeyMutationResponse {
    pub keys: Vec<api_key::ManagedCustomerApiKey>,
    pub removed_key_ids: Vec<String>,
    pub changed: usize,
}

fn lower_hex(value: &str, expected_length: usize) -> bool {
    value.len() == expected_length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

pub(crate) fn valid_key_id(value: &str) -> bool {
    lower_hex(value, 24)
}

fn valid_hash(value: &str) -> bool {
    lower_hex(value, 64)
}

fn validate_verifier(key_id: &str, secret_hash: &str, last_four: &str) -> Result<(), ApiError> {
    if !valid_key_id(key_id) || !valid_hash(secret_hash) || !lower_hex(last_four, 4) {
        return Err(ApiError::Invalid(
            "invalid customer API-key verifier metadata".into(),
        ));
    }
    Ok(())
}

fn normalize_ip(value: &str) -> Result<String, ApiError> {
    let (address, prefix) = value
        .split_once('/')
        .map_or((value, None), |(address, prefix)| (address, Some(prefix)));
    let address = Ipv4Addr::from_str(address).map_err(|_| {
        ApiError::Invalid("an API-key IP restriction is not IPv4 or IPv4/CIDR".into())
    })?;
    let prefix = prefix
        .map(|value| value.parse::<u8>())
        .transpose()
        .map_err(|_| ApiError::Invalid("an API-key CIDR prefix is invalid".into()))?;
    if prefix.is_some_and(|value| value > 32) {
        return Err(ApiError::Invalid(
            "an API-key CIDR prefix exceeds 32".into(),
        ));
    }
    Ok(prefix.map_or_else(
        || address.to_string(),
        |prefix| format!("{address}/{prefix}"),
    ))
}

async fn normalize_restrictions(
    tx: &mut crate::db::TenantTx<'_>,
    input: CustomerApiKeyRestrictions,
) -> Result<CustomerApiKeyRestrictions, ApiError> {
    if input.ips.len() > 64 || input.scopes.len() > SCOPES.len() || input.sessions.len() > 256 {
        return Err(ApiError::Invalid(
            "customer API-key restrictions exceed their limits".into(),
        ));
    }
    let mut ips = BTreeSet::new();
    for value in input.ips {
        ips.insert(normalize_ip(value.trim())?);
    }
    let scopes = input.scopes.into_iter().collect::<BTreeSet<_>>();
    if scopes.iter().any(|scope| !SCOPES.contains(&scope.as_str())) {
        return Err(ApiError::Invalid(
            "an API-key command restriction is unknown".into(),
        ));
    }
    let sessions = input
        .sessions
        .into_iter()
        .map(|value| value.trim().to_owned())
        .collect::<BTreeSet<_>>();
    if sessions
        .iter()
        .any(|value| value.is_empty() || value.len() > 64)
    {
        return Err(ApiError::Invalid(
            "an API-key room restriction is invalid".into(),
        ));
    }
    if !sessions.is_empty() {
        let values = sessions.iter().cloned().collect::<Vec<_>>();
        let found: i64 =
            sqlx::query_scalar("SELECT count(*) FROM rooms WHERE uuid_short = ANY($1)")
                .bind(&values)
                .fetch_one(tx.conn())
                .await
                .map_err(DbError::from)?;
        if found != i64::try_from(values.len()).unwrap_or(i64::MAX) {
            return Err(ApiError::Invalid(
                "an API-key room restriction is not owned by this account".into(),
            ));
        }
    }
    Ok(CustomerApiKeyRestrictions {
        ips: ips.into_iter().collect(),
        scopes: scopes.into_iter().collect(),
        sessions: sessions.into_iter().collect(),
    })
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

fn request_digest<T: Serialize>(
    actor: Uuid,
    enterprise: Uuid,
    kind: &str,
    request: &T,
) -> Result<String, ApiError> {
    let bytes =
        serde_json::to_vec(&(actor, enterprise, kind, request)).map_err(ApiError::internal)?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

async fn replay(
    tx: &mut crate::db::TenantTx<'_>,
    request_id: Uuid,
    digest: &str,
) -> Result<Option<CustomerApiKeyMutationResponse>, ApiError> {
    api_key::lock_request(tx, request_id).await?;
    let Some((stored, response)) = api_key::replay(tx, request_id).await? else {
        return Ok(None);
    };
    if stored != digest {
        return Err(ApiError::Invalid(
            "requestId was already used for a different customer API-key mutation".into(),
        ));
    }
    Ok(Some(
        serde_json::from_value(response).map_err(ApiError::internal)?,
    ))
}

async fn finish(
    mut tx: crate::db::TenantTx<'_>,
    actor: &CurrentUser,
    request_id: Uuid,
    kind: &str,
    digest: &str,
    response: CustomerApiKeyMutationResponse,
    now: OffsetDateTime,
) -> Result<Json<CustomerApiKeyMutationResponse>, ApiError> {
    let enterprise_id = tx.ctx().enterprise_id;
    let stored = serde_json::to_value(&response).map_err(ApiError::internal)?;
    api_key::record(
        &mut tx,
        request_id,
        actor.user_id,
        kind,
        digest,
        &stored,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id,
            room_id: None,
            actor_user_id: actor.user_id,
            actor_name: &actor.display_name,
            event_name: kind,
            event_detail: "account administrator changed a customer API key",
            target_type: Some("customer-api-key"),
            // API-key ids are credentials and audit target ids are UUID-typed. The request UUID is
            // the stable non-secret correlation value; no key identifier enters the audit log.
            target_id: Some(request_id),
            metadata: serde_json::json!({ "requestId": request_id, "revision": response.keys.first().map(|key| key.revision) }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
) -> Result<Json<Vec<api_key::ManagedCustomerApiKey>>, ApiError> {
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    let rows = api_key::list(&mut tx).await?;
    tx.commit().await?;
    Ok(Json(rows))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
    payload: Result<Json<CreateCustomerApiKeyRequest>, JsonRejection>,
) -> Result<Json<CustomerApiKeyMutationResponse>, ApiError> {
    let Json(request) = payload
        .map_err(|_| ApiError::Invalid("invalid customer API-key creation request".into()))?;
    validate_verifier(&request.key_id, &request.secret_hash, &request.last_four)?;
    let digest = request_digest(user.user_id, path.enterprise_id, "create", &request)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay(&mut tx, request.request_id, &digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let key = api_key::create(
        &mut tx,
        &request.key_id,
        &request.secret_hash,
        &request.last_four,
        now,
    )
    .await
    .map_err(|error| match error {
        DbError::UniqueViolation { .. } => ApiError::Conflict,
        other => other.into(),
    })?;
    let response = CustomerApiKeyMutationResponse {
        keys: vec![key],
        removed_key_ids: Vec::new(),
        changed: 1,
    };
    finish(
        tx,
        &user,
        request.request_id,
        "customer-api-key.created",
        &digest,
        response,
        now,
    )
    .await
}

pub async fn rotate(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<KeyPath>,
    payload: Result<Json<RotateCustomerApiKeyRequest>, JsonRejection>,
) -> Result<Json<CustomerApiKeyMutationResponse>, ApiError> {
    let Json(request) = payload
        .map_err(|_| ApiError::Invalid("invalid customer API-key rotation request".into()))?;
    validate_verifier(&path.key_id, &request.secret_hash, &request.last_four)?;
    if request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative".into(),
        ));
    }
    let digest = request_digest(user.user_id, path.enterprise_id, &path.key_id, &request)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay(&mut tx, request.request_id, &digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let (key, changed) = api_key::rotate(
        &mut tx,
        &path.key_id,
        request.expected_revision,
        &request.secret_hash,
        &request.last_four,
        now,
    )
    .await
    .map_err(|error| match error {
        api_key::MutationError::Conflict => ApiError::Conflict,
        api_key::MutationError::Database(error) => error.into(),
    })?;
    let response = CustomerApiKeyMutationResponse {
        keys: vec![key],
        removed_key_ids: Vec::new(),
        changed: usize::from(changed),
    };
    finish(
        tx,
        &user,
        request.request_id,
        "customer-api-key.rotated",
        &digest,
        response,
        now,
    )
    .await
}

pub async fn restrict(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<KeyPath>,
    payload: Result<Json<RestrictCustomerApiKeyRequest>, JsonRejection>,
) -> Result<Json<CustomerApiKeyMutationResponse>, ApiError> {
    let Json(request) = payload
        .map_err(|_| ApiError::Invalid("invalid customer API-key restriction request".into()))?;
    if !valid_key_id(&path.key_id) || request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "invalid customer API-key restriction request".into(),
        ));
    }
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    let restrictions = normalize_restrictions(&mut tx, request.restrictions).await?;
    let normalized = RestrictCustomerApiKeyRequest {
        restrictions,
        ..request
    };
    let digest = request_digest(user.user_id, path.enterprise_id, &path.key_id, &normalized)?;
    let now = OffsetDateTime::now_utc();
    if let Some(response) = replay(&mut tx, normalized.request_id, &digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let stored = serde_json::to_value(&normalized.restrictions).map_err(ApiError::internal)?;
    let (key, changed) = api_key::restrict(
        &mut tx,
        &path.key_id,
        normalized.expected_revision,
        &stored,
        now,
    )
    .await
    .map_err(|error| match error {
        api_key::MutationError::Conflict => ApiError::Conflict,
        api_key::MutationError::Database(error) => error.into(),
    })?;
    let response = CustomerApiKeyMutationResponse {
        keys: vec![key],
        removed_key_ids: Vec::new(),
        changed: usize::from(changed),
    };
    finish(
        tx,
        &user,
        normalized.request_id,
        "customer-api-key.restricted",
        &digest,
        response,
        now,
    )
    .await
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<KeyPath>,
    payload: Result<Json<DeleteCustomerApiKeyRequest>, JsonRejection>,
) -> Result<Json<CustomerApiKeyMutationResponse>, ApiError> {
    let Json(request) = payload
        .map_err(|_| ApiError::Invalid("invalid customer API-key deletion request".into()))?;
    if !valid_key_id(&path.key_id) || request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "invalid customer API-key deletion request".into(),
        ));
    }
    let digest = request_digest(user.user_id, path.enterprise_id, &path.key_id, &request)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay(&mut tx, request.request_id, &digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    api_key::remove(&mut tx, &path.key_id, request.expected_revision)
        .await
        .map_err(|error| match error {
            api_key::MutationError::Conflict => ApiError::Conflict,
            api_key::MutationError::Database(error) => error.into(),
        })?;
    let response = CustomerApiKeyMutationResponse {
        keys: Vec::new(),
        removed_key_ids: vec![path.key_id.clone()],
        changed: 1,
    };
    finish(
        tx,
        &user,
        request.request_id,
        "customer-api-key.deleted",
        &digest,
        response,
        now,
    )
    .await
}
