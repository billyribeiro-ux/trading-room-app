//! Trade alerts: `postAlert` and `askQuestion`.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use rust_decimal::Decimal;
use serde::Deserialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::db::repo::{alert, event};
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Deserialize)]
pub struct AlertPath {
    pub room_id: Uuid,
    pub alert_id: Uuid,
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<alert::Alert>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let alerts = alert::list(&mut tx, member.room_id, limits::ALERT_PAGE_MAX).await?;
    tx.commit().await?;
    Ok(Json(alerts))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostRequest {
    pub body: String,
    /// `trade` or `non_trade`, per `alerts_kind_check`.
    #[serde(default = "default_kind")]
    pub alert_kind: String,
    #[serde(default)]
    pub dispatch: alert::Dispatch,
    /// `swing` or `day`, per `alerts_trade_style_check`.
    pub trade_style: Option<String>,
    /// `long` or `short`, per `alerts_direction_check`.
    pub direction: Option<String>,
    pub symbol: Option<String>,
    pub entry_price: Option<Decimal>,
    pub stop_price: Option<Decimal>,
    pub target_price: Option<Decimal>,
    pub legal_disclosure: Option<String>,
    #[serde(default, with = "time::serde::rfc3339::option")]
    pub scheduled_for: Option<OffsetDateTime>,
}

fn default_kind() -> String {
    "trade".to_owned()
}

/// `postAlert`.
///
/// The three CHECK value-sets are validated here as well as in the database. Not redundancy:
/// a CHECK violation arrives as SQLSTATE 23514 with a constraint name, which the error mapper
/// turns into a flat "invalid request" - checking first is what lets the caller be told
/// *which* field is wrong.
pub async fn post(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Json(request): Json<PostRequest>,
) -> Result<Json<alert::Alert>, ApiError> {
    // Posting an alert is a staff act: it is the room's trading signal, not chat.
    if !member.capabilities.role.is_staff() {
        return Err(ApiError::Forbidden);
    }

    let body = request.body.trim();
    if body.is_empty() {
        return Err(ApiError::Invalid("an alert cannot be empty".into()));
    }
    if body.len() > limits::ALERT_BODY_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "an alert may be at most {} bytes",
            limits::ALERT_BODY_MAX_BYTES
        )));
    }

    one_of(&request.alert_kind, &["trade", "non_trade"], "alertKind")?;
    optional_one_of(
        request.trade_style.as_deref(),
        &["swing", "day"],
        "tradeStyle",
    )?;
    optional_one_of(
        request.direction.as_deref(),
        &["long", "short"],
        "direction",
    )?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let posted = alert::create(
        &mut tx,
        alert::NewAlert {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            user_id: member.user.user_id,
            member_id: member.member_id,
            display_name: &member.user.display_name,
            body,
            alert_kind: &request.alert_kind,
            dispatch: request.dispatch,
            trade_style: request.trade_style.as_deref(),
            direction: request.direction.as_deref(),
            symbol: request.symbol.as_deref(),
            entry_price: request.entry_price,
            stop_price: request.stop_price,
            target_price: request.target_price,
            legal_disclosure: request.legal_disclosure.as_deref(),
            scheduled_for: request.scheduled_for,
        },
    )
    .await?;

    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "alert.posted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::to_value(&posted).unwrap_or_else(|_| serde_json::json!({})),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(posted))
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<AlertPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    if !member.capabilities.role.is_staff() {
        return Err(ApiError::Forbidden);
    }
    let now = OffsetDateTime::now_utc();

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    alert::soft_delete(
        &mut tx,
        member.room_id,
        path.alert_id,
        member.user.user_id,
        now,
    )
    .await?;
    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "alert.deleted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "id": path.alert_id }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub async fn questions(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<AlertPath>,
) -> Result<Json<Vec<alert::AlertQuestion>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let questions = alert::questions(&mut tx, member.room_id, path.alert_id).await?;
    tx.commit().await?;
    Ok(Json(questions))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AskRequest {
    pub body: String,
    /// Answering, rather than asking. Staff only - see below.
    #[serde(default)]
    pub is_answer: bool,
    pub parent_id: Option<Uuid>,
}

/// `askQuestion`.
pub async fn ask(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<AlertPath>,
    Json(request): Json<AskRequest>,
) -> Result<Json<alert::AlertQuestion>, ApiError> {
    let now = OffsetDateTime::now_utc();

    // Asking is posting: a muted member must not be able to route around the mute by asking
    // questions instead of sending messages.
    member.require(crate::capability::Capability::Post, now)?;

    // Marking something an *answer* flips `alerts.is_answered` and is presented differently in
    // the UI. A member claiming it would be putting words in the room's mouth.
    if request.is_answer && !member.capabilities.role.is_staff() {
        return Err(ApiError::Forbidden);
    }

    let body = request.body.trim();
    if body.is_empty() {
        return Err(ApiError::Invalid("a question cannot be empty".into()));
    }
    if body.len() > limits::MESSAGE_BODY_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a question may be at most {} bytes",
            limits::MESSAGE_BODY_MAX_BYTES
        )));
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let asked = alert::ask(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        path.alert_id,
        member.user.user_id,
        member.member_id,
        &member.user.display_name,
        body,
        request.is_answer,
        request.parent_id,
    )
    .await?;

    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: if request.is_answer {
                "alert.answered"
            } else {
                "alert.question"
            },
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::to_value(&asked).unwrap_or_else(|_| serde_json::json!({})),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(asked))
}

/// Validates one of the schema's CHECK value-sets, naming the field.
fn one_of(value: &str, allowed: &[&str], field: &str) -> Result<(), ApiError> {
    if allowed.contains(&value) {
        return Ok(());
    }
    Err(ApiError::Invalid(format!(
        "{field} must be one of {}",
        allowed.join(", ")
    )))
}

fn optional_one_of(value: Option<&str>, allowed: &[&str], field: &str) -> Result<(), ApiError> {
    match value {
        None => Ok(()),
        Some(value) => one_of(value, allowed, field),
    }
}
