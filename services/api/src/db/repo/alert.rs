//! Trade alerts and the questions asked against them.
//!
//! # Prices are `Decimal`, and that is not a violation of the money rule
//!
//! The house rule is money = `i64` cents. `entry_price`, `stop_price` and `target_price` are
//! `numeric(18,6)` in the pinned schema and are **quoted trade prices, not currency amounts**.
//! Three reasons `rust_decimal::Decimal` is right here:
//!
//! * the column type is fixed by a schema whose hash is pinned, and it must round-trip
//!   losslessly;
//! * these values are displayed and compared, never summed into a balance;
//! * the headroom argument fails anyway - 12 integer digits at scale 10⁻⁶ is ~10¹⁸, which
//!   brushes `i64::MAX` (9.22 × 10¹⁸) with no margin.

use rust_decimal::Decimal;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

/// The five dispatch channels, exactly as `alerts_dispatch_shape_check` requires: an object
/// with these five boolean keys and **nothing else**.
///
/// `deny_unknown_fields` restates the CHECK in Rust, so a typo is caught before the round trip
/// rather than as a 23514 from the database.
#[derive(Debug, Clone, Copy, Default, serde::Serialize, serde::Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Dispatch {
    #[serde(default)]
    pub sms: bool,
    #[serde(default)]
    pub email: bool,
    #[serde(default)]
    pub twitter: bool,
    #[serde(default)]
    pub push: bool,
    #[serde(default)]
    pub cross_post: bool,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: Uuid,
    pub user_id: Uuid,
    pub member_id: Uuid,
    pub display_name: String,
    pub body: String,
    pub alert_kind: String,
    pub is_answered: bool,
    pub dispatch: serde_json::Value,
    pub trade_style: Option<String>,
    pub direction: Option<String>,
    pub symbol: Option<String>,
    pub entry_price: Option<Decimal>,
    pub stop_price: Option<Decimal>,
    pub target_price: Option<Decimal>,
    pub legal_disclosure: Option<String>,
    #[serde(with = "time::serde::rfc3339::option")]
    pub scheduled_for: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

pub struct NewAlert<'a> {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub user_id: Uuid,
    pub member_id: Uuid,
    pub display_name: &'a str,
    pub body: &'a str,
    pub alert_kind: &'a str,
    pub dispatch: Dispatch,
    pub trade_style: Option<&'a str>,
    pub direction: Option<&'a str>,
    pub symbol: Option<&'a str>,
    pub entry_price: Option<Decimal>,
    pub stop_price: Option<Decimal>,
    pub target_price: Option<Decimal>,
    pub legal_disclosure: Option<&'a str>,
    pub scheduled_for: Option<OffsetDateTime>,
}

/// The `alerts` projection, written once so the SELECT and the INSERT's `RETURNING` cannot
/// drift into different column orders - which `sqlx::FromRow` would decode without complaint
/// and with the wrong values.
///
/// Interpolated into the statements below, so those need `AssertSqlSafe`. It is safe by
/// construction and not by review: this is a private `const` of literal column names, with no
/// path from any input to it.
const COLUMNS: &str = "id, user_id, member_id, display_name, body, alert_kind, is_answered, \
                       dispatch, trade_style, direction, symbol, entry_price, stop_price, \
                       target_price, legal_disclosure, scheduled_for, created_at";

pub async fn list(tx: &mut TenantTx<'_>, room_id: Uuid, limit: i64) -> Result<Vec<Alert>, DbError> {
    sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT {COLUMNS} FROM alerts \
         WHERE room_id = $1 AND deleted_at IS NULL \
         ORDER BY created_at DESC, id DESC LIMIT $2"
    )))
    .bind(room_id)
    .bind(limit)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn create(tx: &mut TenantTx<'_>, new: NewAlert<'_>) -> Result<Alert, DbError> {
    sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "INSERT INTO alerts \
           (enterprise_id, room_id, user_id, member_id, display_name, body, alert_kind, \
            dispatch, trade_style, direction, symbol, entry_price, stop_price, target_price, \
            legal_disclosure, scheduled_for) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) \
         RETURNING {COLUMNS}"
    )))
    .bind(new.enterprise_id)
    .bind(new.room_id)
    .bind(new.user_id)
    .bind(new.member_id)
    .bind(new.display_name)
    .bind(new.body)
    .bind(new.alert_kind)
    .bind(sqlx::types::Json(new.dispatch))
    .bind(new.trade_style)
    .bind(new.direction)
    .bind(new.symbol)
    .bind(new.entry_price)
    .bind(new.stop_price)
    .bind(new.target_price)
    .bind(new.legal_disclosure)
    .bind(new.scheduled_for)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn soft_delete(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    alert_id: Uuid,
    actor: Uuid,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE alerts SET deleted_at = $3, deleted_by_id = $4, updated_at = $3 \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(alert_id)
    .bind(room_id)
    .bind(now)
    .bind(actor)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AlertQuestion {
    pub id: Uuid,
    pub alert_id: Uuid,
    pub member_id: Uuid,
    pub display_name: String,
    pub body: String,
    pub is_answer: bool,
    pub parent_id: Option<Uuid>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// Asks a question against an alert, or answers one.
///
/// The alert is resolved through `room_id` in the same statement, so a question cannot be
/// attached to another room's alert.
#[allow(clippy::too_many_arguments)]
pub async fn ask(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    alert_id: Uuid,
    user_id: Uuid,
    member_id: Uuid,
    display_name: &str,
    body: &str,
    is_answer: bool,
    parent_id: Option<Uuid>,
) -> Result<AlertQuestion, DbError> {
    let belongs: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM alerts WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(alert_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;
    belongs.ok_or(DbError::NotFound)?;

    let question: AlertQuestion = sqlx::query_as(
        "INSERT INTO alert_questions \
           (enterprise_id, alert_id, user_id, member_id, display_name, body, is_answer, parent_id) \
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) \
         RETURNING id, alert_id, member_id, display_name, body, is_answer, parent_id, created_at",
    )
    .bind(enterprise_id)
    .bind(alert_id)
    .bind(user_id)
    .bind(member_id)
    .bind(display_name)
    .bind(body)
    .bind(is_answer)
    .bind(parent_id)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)?;

    // An answered alert is marked as such, so the roster can show it without counting rows.
    if is_answer {
        sqlx::query(
            "UPDATE alerts SET is_answered = true, updated_at = now() \
             WHERE id = $1 AND room_id = $2",
        )
        .bind(alert_id)
        .bind(room_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    }

    Ok(question)
}

pub async fn questions(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    alert_id: Uuid,
) -> Result<Vec<AlertQuestion>, DbError> {
    sqlx::query_as(
        "SELECT q.id, q.alert_id, q.member_id, q.display_name, q.body, q.is_answer, \
                q.parent_id, q.created_at \
         FROM alert_questions q \
         JOIN alerts a ON a.id = q.alert_id \
         WHERE q.alert_id = $1 AND a.room_id = $2 AND q.deleted_at IS NULL \
         ORDER BY q.created_at ASC",
    )
    .bind(alert_id)
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}
