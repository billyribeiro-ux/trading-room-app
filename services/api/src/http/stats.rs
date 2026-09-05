//! Legacy-compatible external statistics API backed only by canonical Rust authority.

use std::collections::{BTreeMap, BTreeSet};
use std::net::IpAddr;
use std::str::FromStr;
use std::sync::Arc;

use axum::Json;
use axum::Router;
use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::routing::{get, post};
use ipnetwork::IpNetwork;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use time::format_description::well_known::Rfc3339;
use time::{Date, OffsetDateTime, Time};
use uuid::Uuid;

use super::{AppState, ClientAddr, client_ip};
use crate::db::repo::{external_stats as stats, moderation};
use crate::db::{DbError, TenantCtx, TenantTx};
use crate::error::ApiError;
use crate::limits;

const MAX_RESULT_ROWS: usize = 10_000;
const MAX_BULK_USERS: usize = 500;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/stats/v1/sessions/list", get(list_sessions))
        .route("/stats/v1/sessions/users", get(list_users))
        .route("/stats/v1/sessions/userstats", get(user_stats))
        .route("/stats/v1/sessions/chatlogs", get(chat_logs))
        .route("/stats/v1/sessions/alertlogs", get(alert_logs))
        .route("/stats/v1/sessions/deletedlogs", get(deleted_logs))
        .route("/stats/v1/sessions/archivedlogs", get(archived_logs))
        .route("/stats/v1/sessions/recordings", get(recordings))
        // Compatibility requires this historical mutating GET. It remains explicitly scoped,
        // authenticated, rate-limited, audited, and non-cacheable.
        .route("/stats/v1/sessions/cloneSession", get(clone_session))
        .route("/stats/v1/sessions/addUsers", post(add_users))
        .route("/stats/v1/sessions/delUsers", post(delete_users))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CredentialsQuery {
    api_key: String,
    api_secret: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SessionQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UserStatsQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    from_date: Option<String>,
    to_date: Option<String>,
    is_mobile: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ChatQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    channel: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DateQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    from_date: Option<String>,
    to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DeletedQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    log_type: Option<String>,
    event_type: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ArchivedQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    log_type: Option<String>,
    channel: Option<String>,
    from_date: Option<String>,
    to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CloneQuery {
    api_key: String,
    api_secret: String,
    #[serde(rename = "sessionID")]
    session_id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AddUsersBody {
    users: Vec<AddUser>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct AddUser {
    email: String,
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DeleteUsersBody {
    del_users: Vec<String>,
}

#[derive(Debug)]
struct AuthorizedKey {
    key_id: String,
    enterprise_id: Uuid,
    restrictions: crate::http::v1::customer_api_keys::CustomerApiKeyRestrictions,
}

fn query<T>(query: Result<Query<T>, QueryRejection>) -> Result<T, ApiError> {
    query
        .map(|Query(value)| value)
        .map_err(|_| ApiError::Invalid("invalid customer API query".into()))
}

fn body<T>(body: Result<Json<T>, JsonRejection>) -> Result<T, ApiError> {
    body.map(|Json(value)| value)
        .map_err(|_| ApiError::Invalid("invalid customer API request body".into()))
}

async fn authorize(
    state: &AppState,
    headers: &HeaderMap,
    peer: Option<std::net::SocketAddr>,
    api_key: &str,
    api_secret: &str,
    command: &'static str,
) -> Result<AuthorizedKey, ApiError> {
    if !super::v1::customer_api_keys::valid_key_id(api_key)
        || api_secret.is_empty()
        || api_secret.len() > 1024
    {
        return Err(ApiError::Forbidden);
    }
    let limiter_key = format!(
        "{}:{command}",
        hex::encode(Sha256::digest(api_key.as_bytes()))
    );
    state
        .limiters
        .customer_api_command
        .check(&limiter_key)
        .map_err(|_| ApiError::RateLimited)?;

    let found = stats::authentication(&state.db, api_key).await?;
    let expected = found
        .as_ref()
        .and_then(|value| hex::decode(&value.secret_hash).ok())
        .filter(|value| value.len() == 32)
        .unwrap_or_else(|| vec![0; 32]);
    let actual = Sha256::digest(api_secret.as_bytes());
    if found.is_none() || !bool::from(actual.as_slice().ct_eq(&expected)) {
        return Err(ApiError::Forbidden);
    }
    let found = found.ok_or(ApiError::Forbidden)?;
    let restrictions: crate::http::v1::customer_api_keys::CustomerApiKeyRestrictions =
        serde_json::from_value(found.restrictions).map_err(ApiError::internal)?;
    let client = client_ip::resolve(headers, peer, state.trusted_proxy_hops);
    if !ip_allowed(&restrictions.ips, client) {
        return Err(ApiError::Forbidden);
    }
    if !restrictions.scopes.is_empty() && !restrictions.scopes.iter().any(|scope| scope == command)
    {
        return Err(ApiError::Forbidden);
    }
    Ok(AuthorizedKey {
        key_id: api_key.to_owned(),
        enterprise_id: found.enterprise_id,
        restrictions,
    })
}

fn ip_allowed(restrictions: &[String], client: Option<IpAddr>) -> bool {
    if restrictions.is_empty() {
        return true;
    }
    let Some(client) = client else { return false };
    restrictions.iter().any(|restriction| {
        IpNetwork::from_str(restriction)
            .map(|network| network.contains(client))
            .unwrap_or(false)
    })
}

fn session_allowed(key: &AuthorizedKey, session_id: &str) -> Result<(), ApiError> {
    if session_id.is_empty() || session_id.len() > 64 {
        return Err(ApiError::Invalid("invalid session".into()));
    }
    if !key.restrictions.sessions.is_empty()
        && !key
            .restrictions
            .sessions
            .iter()
            .any(|allowed| allowed == session_id)
    {
        return Err(ApiError::Forbidden);
    }
    Ok(())
}

async fn begin_session<'a>(
    state: &'a AppState,
    key: &AuthorizedKey,
    session_id: &str,
    now: OffsetDateTime,
) -> Result<(TenantTx<'a>, stats::StatsRoom), ApiError> {
    session_allowed(key, session_id)?;
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(key.enterprise_id))
        .await?;
    let room = stats::room(&mut tx, session_id)
        .await
        .map_err(invalid_session)?;
    stats::touch(&mut tx, &key.key_id, now).await?;
    Ok((tx, room))
}

fn invalid_session(error: DbError) -> ApiError {
    match error {
        DbError::NotFound => ApiError::Invalid("invalid session".into()),
        other => other.into(),
    }
}

fn dates(
    from: Option<&str>,
    to: Option<&str>,
) -> Result<(Option<OffsetDateTime>, Option<OffsetDateTime>), ApiError> {
    let from = from.map(|value| parse_date(value, false)).transpose()?;
    let to = to.map(|value| parse_date(value, true)).transpose()?;
    if from.zip(to).is_some_and(|(from, to)| from > to) {
        return Err(ApiError::Invalid("fromDate must not follow toDate".into()));
    }
    Ok((from, to))
}

fn parse_date(value: &str, end_of_day: bool) -> Result<OffsetDateTime, ApiError> {
    if let Ok(value) = OffsetDateTime::parse(value, &Rfc3339) {
        return Ok(value);
    }
    let date = Date::parse(
        value,
        time::macros::format_description!("[year]-[month]-[day]"),
    )
    .map_err(|_| ApiError::Invalid("invalid ISO date".into()))?;
    let time = if end_of_day {
        Time::from_hms_nano(23, 59, 59, 999_999_999).map_err(ApiError::internal)?
    } else {
        Time::MIDNIGHT
    };
    Ok(date.with_time(time).assume_utc())
}

fn bounded<T>(rows: Vec<T>) -> Result<Vec<T>, ApiError> {
    if rows.len() > MAX_RESULT_ROWS {
        return Err(ApiError::Invalid(
            "result exceeds 10000 rows; provide a narrower date range".into(),
        ));
    }
    Ok(rows)
}

#[derive(Serialize)]
struct Success<T> {
    success: bool,
    #[serde(flatten)]
    value: T,
}

#[derive(Serialize)]
struct SessionsValue {
    sessions: Vec<SessionResponse>,
}

#[derive(Serialize)]
struct SessionResponse {
    #[serde(rename = "_id")]
    id: String,
    uuid: Uuid,
    name: String,
    #[serde(rename = "currentState")]
    current_state: String,
    current_capacity: i32,
    current_max: i32,
    #[serde(rename = "modCount")]
    mod_count: i32,
    #[serde(rename = "recordedMaxCapacity")]
    recorded_max_capacity: i32,
    #[serde(with = "time::serde::rfc3339")]
    created: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    updated: OffsetDateTime,
    #[serde(rename = "s3Bucket")]
    s3_bucket: Option<String>,
    #[serde(rename = "s3BucketFolderPath")]
    s3_bucket_folder_path: Option<String>,
    #[serde(rename = "isMainRoom")]
    is_main_room: bool,
    #[serde(rename = "recPreviewLocation")]
    rec_preview_location: Option<String>,
    media: Vec<serde_json::Value>,
    recording: bool,
}

async fn list_sessions(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<CredentialsQuery>, QueryRejection>,
) -> Result<Json<Success<SessionsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/list",
    )
    .await?;
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(key.enterprise_id))
        .await?;
    stats::touch(&mut tx, &key.key_id, OffsetDateTime::now_utc()).await?;
    let allowed = key
        .restrictions
        .sessions
        .into_iter()
        .collect::<BTreeSet<_>>();
    let sessions = stats::sessions(&mut tx)
        .await?
        .into_iter()
        .filter(|room| allowed.is_empty() || allowed.contains(&room.short_code))
        .map(|room| SessionResponse {
            id: room.short_code,
            uuid: room.id,
            name: room.name,
            current_state: compatibility_session_state(&room.state).into(),
            current_capacity: room.current_capacity,
            current_max: room.current_max,
            mod_count: room.moderator_count,
            recorded_max_capacity: room.current_max,
            created: room.created_at,
            updated: room.updated_at,
            s3_bucket: None,
            s3_bucket_folder_path: None,
            is_main_room: true,
            rec_preview_location: None,
            media: Vec::new(),
            recording: room.is_recording,
        })
        .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: SessionsValue { sessions },
    }))
}

#[derive(Serialize)]
struct UsersValue {
    users: Vec<UserResponse>,
}

#[derive(Serialize)]
struct UserResponse {
    #[serde(rename = "_id")]
    id: Uuid,
    email: String,
    #[serde(rename = "userName")]
    user_name: String,
    role: i32,
    #[serde(rename = "lastLogin", with = "time::serde::rfc3339::option")]
    last_login: Option<OffsetDateTime>,
    name: String,
    #[serde(with = "time::serde::rfc3339")]
    created: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    updated: OffsetDateTime,
    #[serde(rename = "alerterAppFCMUserOff")]
    alerter_app_fcm_user_off: bool,
    #[serde(rename = "alerterAppTokens")]
    alerter_app_tokens: Vec<String>,
    #[serde(rename = "activeDateAPI", with = "time::serde::rfc3339::option")]
    active_date_api: Option<OffsetDateTime>,
    active: bool,
}

fn role_number(role: &str) -> i32 {
    match role {
        "owner" => 4,
        "moderator" => 3,
        "presenter" => 2,
        "limited_presenter" => 1,
        _ => 0,
    }
}

fn compatibility_session_state(state: &str) -> &'static str {
    if state == "open" {
        "active"
    } else {
        "inactive"
    }
}

async fn list_users(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<SessionQuery>, QueryRejection>,
) -> Result<Json<Success<UsersValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/users",
    )
    .await?;
    let now = OffsetDateTime::now_utc();
    let (mut tx, room) = begin_session(&state, &key, &query.session_id, now).await?;
    let users = stats::users(&mut tx, room.id)
        .await?
        .into_iter()
        .map(|user| UserResponse {
            id: user.id,
            email: user.email,
            user_name: user.user_name,
            role: role_number(&user.role),
            last_login: user.last_login,
            name: user.name,
            created: user.created_at,
            updated: user.updated_at,
            alerter_app_fcm_user_off: false,
            alerter_app_tokens: Vec::new(),
            active_date_api: user.active_date_api,
            active: user
                .active_date_api
                .is_some_and(|seen| seen >= now - time::Duration::days(1)),
        })
        .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: UsersValue { users },
    }))
}

#[derive(Serialize)]
struct UserStatsValue {
    userstats: Vec<UserStatResponse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserStatResponse {
    email: String,
    user_name: String,
    uuid: Uuid,
    ip: Option<String>,
    #[serde(with = "time::serde::rfc3339")]
    in_time: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339::option")]
    out_time: Option<OffsetDateTime>,
    duration: i64,
    is_mobile: bool,
}

async fn user_stats(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<UserStatsQuery>, QueryRejection>,
) -> Result<Json<Success<UserStatsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/userstats",
    )
    .await?;
    let now = OffsetDateTime::now_utc();
    let (from, to) = dates(query.from_date.as_deref(), query.to_date.as_deref())?;
    let (mut tx, room) = begin_session(&state, &key, &query.session_id, now).await?;
    let userstats = bounded(
        stats::visits(&mut tx, room.id, from, to, query.is_mobile.unwrap_or(false)).await?,
    )?
    .into_iter()
    .map(|visit| {
        let end = visit.exited_at.unwrap_or(now);
        let duration = (end - visit.entered_at).whole_milliseconds();
        UserStatResponse {
            email: visit.email,
            user_name: visit.user_name,
            uuid: visit.user_id,
            ip: visit.ip.map(|ip| ip.ip().to_string()),
            in_time: visit.entered_at,
            out_time: visit.exited_at,
            duration: i64::try_from(duration).unwrap_or(i64::MAX),
            is_mobile: visit.is_mobile,
        }
    })
    .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: UserStatsValue { userstats },
    }))
}

#[derive(Serialize)]
struct ChatLogsValue {
    chatlogs: Vec<ChatLogResponse>,
}

#[derive(Serialize)]
struct ChatLogResponse {
    #[serde(rename = "sessionID")]
    session_id: String,
    c: String,
    #[serde(with = "time::serde::rfc3339")]
    t: OffsetDateTime,
    u: String,
    m: String,
}

async fn chat_logs(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<ChatQuery>, QueryRejection>,
) -> Result<Json<Success<ChatLogsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/chatlogs",
    )
    .await?;
    let channel = query.channel.as_deref().unwrap_or("main").trim();
    if channel.is_empty() || channel.len() > 120 {
        return Err(ApiError::Invalid("invalid channel".into()));
    }
    let (from, to) = dates(query.from_date.as_deref(), query.to_date.as_deref())?;
    let (mut tx, room) =
        begin_session(&state, &key, &query.session_id, OffsetDateTime::now_utc()).await?;
    let chatlogs = bounded(stats::chat_logs(&mut tx, room.id, channel, from, to).await?)?
        .into_iter()
        .map(|row| ChatLogResponse {
            session_id: room.short_code.clone(),
            c: row.channel,
            t: row.at,
            u: row.user_email,
            m: row.message,
        })
        .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: ChatLogsValue { chatlogs },
    }))
}

#[derive(Serialize)]
struct AlertLogsValue {
    chatlogs: Vec<AlertLogResponse>,
}

#[derive(Serialize)]
struct AlertLogResponse {
    #[serde(rename = "sessionID")]
    session_id: String,
    #[serde(with = "time::serde::rfc3339")]
    t: OffsetDateTime,
    #[serde(rename = "alertType")]
    alert_type: String,
    message: String,
}

async fn alert_logs(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<DateQuery>, QueryRejection>,
) -> Result<Json<Success<AlertLogsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/alertlogs",
    )
    .await?;
    let (from, to) = dates(query.from_date.as_deref(), query.to_date.as_deref())?;
    let (mut tx, room) =
        begin_session(&state, &key, &query.session_id, OffsetDateTime::now_utc()).await?;
    let chatlogs = bounded(stats::alert_logs(&mut tx, room.id, from, to).await?)?
        .into_iter()
        .map(|row| AlertLogResponse {
            session_id: room.short_code.clone(),
            t: row.at,
            alert_type: row.alert_type,
            message: row.message,
        })
        .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: AlertLogsValue { chatlogs },
    }))
}

#[derive(Serialize)]
struct DeletedLogsValue {
    deletedlogs: Vec<DeletedLogResponse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeletedLogResponse {
    #[serde(rename = "sessionID")]
    session_id: String,
    log_type: String,
    event_type: String,
    #[serde(with = "time::serde::rfc3339")]
    time: OffsetDateTime,
    original_message: String,
}

async fn deleted_logs(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<DeletedQuery>, QueryRejection>,
) -> Result<Json<Success<DeletedLogsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/deletedlogs",
    )
    .await?;
    if query
        .log_type
        .as_deref()
        .is_some_and(|v| !matches!(v, "chat" | "alerts"))
        || query
            .event_type
            .as_deref()
            .is_some_and(|v| !matches!(v, "E" | "D"))
    {
        return Err(ApiError::Invalid("invalid deleted-log filter".into()));
    }
    let (from, to) = dates(query.from_date.as_deref(), query.to_date.as_deref())?;
    let (mut tx, room) =
        begin_session(&state, &key, &query.session_id, OffsetDateTime::now_utc()).await?;
    let deletedlogs = bounded(
        stats::deleted_logs(
            &mut tx,
            room.id,
            query.log_type.as_deref(),
            query.event_type.as_deref(),
            from,
            to,
        )
        .await?,
    )?
    .into_iter()
    .map(|row| DeletedLogResponse {
        session_id: room.short_code.clone(),
        log_type: row.log_type,
        event_type: row.event_type,
        time: row.at,
        original_message: row.original_message,
    })
    .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: DeletedLogsValue { deletedlogs },
    }))
}

#[derive(Serialize)]
struct ArchivedLogsValue {
    archivedlogs: Vec<ArchivedLogResponse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ArchivedLogResponse {
    #[serde(rename = "sessionID")]
    session_id: String,
    log_type: String,
    channel: String,
    #[serde(with = "time::serde::rfc3339")]
    updated: OffsetDateTime,
    content: String,
}

async fn archived_logs(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<ArchivedQuery>, QueryRejection>,
) -> Result<Json<Success<ArchivedLogsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/archivedlogs",
    )
    .await?;
    let log_type = query.log_type.as_deref().unwrap_or("chat");
    if !matches!(log_type, "chat" | "alerts") {
        return Err(ApiError::Invalid("invalid archived-log type".into()));
    }
    let channel = query.channel.as_deref().unwrap_or("main");
    if channel.is_empty() || channel.len() > 120 {
        return Err(ApiError::Invalid("invalid channel".into()));
    }
    let (from, to) = dates(query.from_date.as_deref(), query.to_date.as_deref())?;
    let (mut tx, room) =
        begin_session(&state, &key, &query.session_id, OffsetDateTime::now_utc()).await?;
    let archivedlogs =
        bounded(stats::archived_logs(&mut tx, room.id, log_type, channel, from, to).await?)?
            .into_iter()
            .map(|row| ArchivedLogResponse {
                session_id: room.short_code.clone(),
                log_type: row.log_type,
                channel: row.channel,
                updated: row.updated_at,
                content: row.content,
            })
            .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: ArchivedLogsValue { archivedlogs },
    }))
}

#[derive(Serialize)]
struct RecordingsValue {
    recordings: Vec<RecordingResponse>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RecordingResponse {
    #[serde(rename = "_id")]
    id: Uuid,
    #[serde(rename = "sessionID")]
    session_id: String,
    name: String,
    namemkv: String,
    content_type: String,
    #[serde(with = "time::serde::rfc3339")]
    created: OffsetDateTime,
    duration: i64,
    length: i64,
    fpath: String,
    #[serde(rename = "media_server")]
    media_server: Option<String>,
    #[serde(rename = "vidPath")]
    vid_path: Option<String>,
    ms: Option<String>,
    is_upload: bool,
}

async fn recordings(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<SessionQuery>, QueryRejection>,
) -> Result<Json<Success<RecordingsValue>>, ApiError> {
    let query = query(query_)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/recordings",
    )
    .await?;
    let now = OffsetDateTime::now_utc();
    let (mut tx, room) = begin_session(&state, &key, &query.session_id, now).await?;
    let recordings = bounded(stats::recordings(&mut tx, room.id, now).await?)?
        .into_iter()
        .map(|row| {
            let host = row
                .url
                .as_deref()
                .and_then(|value| url::Url::parse(value).ok())
                .and_then(|value| value.host_str().map(ToOwned::to_owned));
            RecordingResponse {
                id: row.id,
                session_id: room.short_code.clone(),
                namemkv: row.source_filename,
                name: row.filename,
                content_type: row
                    .mime_type
                    .unwrap_or_else(|| "application/octet-stream".into()),
                created: row.created_at,
                duration: row.duration_ms / 60_000,
                length: row.duration_ms,
                fpath: row.storage_key,
                media_server: host.clone(),
                vid_path: row.url,
                ms: host,
                is_upload: row.is_upload,
            }
        })
        .collect();
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: RecordingsValue { recordings },
    }))
}

#[derive(Serialize)]
struct AddUsersValue {
    added: usize,
    freshen: usize,
}

fn normalize_add_users(users: Vec<AddUser>) -> Result<Vec<(String, String)>, ApiError> {
    if users.is_empty() || users.len() > MAX_BULK_USERS {
        return Err(ApiError::Invalid("invalid users".into()));
    }
    let mut normalized = BTreeMap::new();
    for user in users {
        let email = user.email.trim().to_lowercase();
        let name = user.name.trim().to_owned();
        if email.len() > limits::LOGIN_EMAIL_MAX_BYTES
            || !email
                .split_once('@')
                .is_some_and(|(l, d)| !l.is_empty() && d.contains('.'))
            || name.is_empty()
            || name.len() > limits::DISPLAY_NAME_MAX_BYTES
        {
            return Err(ApiError::Invalid("invalid user".into()));
        }
        normalized.insert(email, name);
    }
    Ok(normalized.into_iter().collect())
}

async fn add_users(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<SessionQuery>, QueryRejection>,
    body_: Result<Json<AddUsersBody>, JsonRejection>,
) -> Result<Json<Success<AddUsersValue>>, ApiError> {
    let query = query(query_)?;
    let users = normalize_add_users(body(body_)?.users)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/addUsers",
    )
    .await?;
    let now = OffsetDateTime::now_utc();
    let (mut tx, room) = begin_session(&state, &key, &query.session_id, now).await?;
    let (added, freshen) = stats::add_users(&mut tx, room.id, &users, now).await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: key.enterprise_id,
            room_id: Some(room.id),
            actor_user_id: room.owner_id,
            actor_name: &room.owner_name,
            event_name: "customer-api.users-added",
            event_detail: "customer API key added or refreshed room members",
            target_type: Some("room"),
            target_id: Some(room.id),
            metadata: serde_json::json!({ "added": added, "freshened": freshen }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: AddUsersValue { added, freshen },
    }))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeleteUsersValue {
    deleted_users: Vec<String>,
}

fn normalize_delete_users(users: Vec<String>) -> Result<Vec<String>, ApiError> {
    if users.is_empty() || users.len() > MAX_BULK_USERS {
        return Err(ApiError::Invalid("no users provided for deletion".into()));
    }
    let users = users
        .into_iter()
        .map(|email| email.trim().to_lowercase())
        .collect::<BTreeSet<_>>();
    if users
        .iter()
        .any(|email| email.len() > limits::LOGIN_EMAIL_MAX_BYTES || !email.contains('@'))
    {
        return Err(ApiError::Invalid("invalid user email".into()));
    }
    Ok(users.into_iter().collect())
}

async fn delete_users(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<SessionQuery>, QueryRejection>,
    body_: Result<Json<DeleteUsersBody>, JsonRejection>,
) -> Result<Json<Success<DeleteUsersValue>>, ApiError> {
    let query = query(query_)?;
    let emails = normalize_delete_users(body(body_)?.del_users)?;
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/delUsers",
    )
    .await?;
    let (mut tx, room) =
        begin_session(&state, &key, &query.session_id, OffsetDateTime::now_utc()).await?;
    let deleted_users = stats::delete_users(&mut tx, room.id, &emails).await?;
    if !deleted_users.is_empty() {
        moderation::audit(
            &mut tx,
            moderation::AuditEntry {
                enterprise_id: key.enterprise_id,
                room_id: Some(room.id),
                actor_user_id: room.owner_id,
                actor_name: &room.owner_name,
                event_name: "customer-api.users-deleted",
                event_detail: "customer API key removed room members",
                target_type: Some("room"),
                target_id: Some(room.id),
                metadata: serde_json::json!({ "deleted": deleted_users.len() }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: DeleteUsersValue { deleted_users },
    }))
}

#[derive(Serialize)]
struct CloneValue {
    session: CloneResponse,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CloneResponse {
    #[serde(rename = "_id")]
    id: String,
    uuid: Uuid,
    name: String,
    is_cloned_room: bool,
    cloned_from: String,
    #[serde(rename = "ownerdID")]
    owner_id: Uuid,
    current_state: String,
    #[serde(with = "time::serde::rfc3339")]
    created: OffsetDateTime,
    #[serde(with = "time::serde::rfc3339")]
    updated: OffsetDateTime,
}

async fn clone_session(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    ClientAddr(peer): ClientAddr,
    query_: Result<Query<CloneQuery>, QueryRejection>,
) -> Result<Json<Success<CloneValue>>, ApiError> {
    let query = query(query_)?;
    let name = query.name.trim();
    if name.is_empty() || name.len() > limits::ROOM_NAME_MAX_BYTES {
        return Err(ApiError::Invalid("invalid clone name".into()));
    }
    let key = authorize(
        &state,
        &headers,
        peer,
        &query.api_key,
        &query.api_secret,
        "sessions/cloneSession",
    )
    .await?;
    let now = OffsetDateTime::now_utc();
    let (mut tx, source) = begin_session(&state, &key, &query.session_id, now).await?;
    let cloned = stats::clone_room(&mut tx, &source, name, now).await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: key.enterprise_id,
            room_id: Some(cloned.id),
            actor_user_id: source.owner_id,
            actor_name: &source.owner_name,
            event_name: "customer-api.room-cloned",
            event_detail: "customer API key cloned a room",
            target_type: Some("room"),
            target_id: Some(cloned.id),
            metadata: serde_json::json!({ "sourceRoomId": source.id }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(Success {
        success: true,
        value: CloneValue {
            session: CloneResponse {
                id: cloned.short_code,
                uuid: cloned.id,
                name: cloned.name,
                is_cloned_room: true,
                cloned_from: source.short_code,
                owner_id: source.owner_id,
                current_state: "inactive".into(),
                created: now,
                updated: now,
            },
        },
    }))
}
