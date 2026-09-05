//! Canonical data access for the legacy-compatible `/stats/v1` customer API.

use sqlx::FromRow;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::db::{Db, DbError, TenantTx};

#[derive(Debug, FromRow)]
pub struct KeyAuthentication {
    pub enterprise_id: Uuid,
    pub secret_hash: String,
    pub restrictions: serde_json::Value,
}

#[derive(Debug, FromRow)]
pub struct StatsRoom {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub owner_name: String,
    pub short_code: String,
    pub name: String,
}

#[derive(Debug, FromRow)]
pub struct SessionRow {
    pub id: Uuid,
    pub short_code: String,
    pub name: String,
    pub state: String,
    pub current_capacity: i32,
    pub current_max: i32,
    pub moderator_count: i32,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    pub is_recording: bool,
}

#[derive(Debug, FromRow)]
pub struct UserRow {
    pub id: Uuid,
    pub email: String,
    pub user_name: String,
    pub role: String,
    pub last_login: Option<OffsetDateTime>,
    pub name: String,
    pub created_at: OffsetDateTime,
    pub updated_at: OffsetDateTime,
    pub active_date_api: Option<OffsetDateTime>,
}

#[derive(Debug, FromRow)]
pub struct VisitRow {
    pub email: String,
    pub user_name: String,
    pub user_id: Uuid,
    pub ip: Option<ipnetwork::IpNetwork>,
    pub entered_at: OffsetDateTime,
    pub exited_at: Option<OffsetDateTime>,
    pub is_mobile: bool,
}

#[derive(Debug, FromRow)]
pub struct ChatRow {
    pub channel: String,
    pub at: OffsetDateTime,
    pub user_email: String,
    pub message: String,
}

#[derive(Debug, FromRow)]
pub struct AlertRow {
    pub at: OffsetDateTime,
    pub alert_type: String,
    pub message: String,
}

#[derive(Debug, FromRow)]
pub struct DeletedLogRow {
    pub log_type: String,
    pub event_type: String,
    pub at: OffsetDateTime,
    pub original_message: String,
}

#[derive(Debug, FromRow)]
pub struct ArchivedLogRow {
    pub log_type: String,
    pub channel: String,
    pub updated_at: OffsetDateTime,
    pub content: String,
}

#[derive(Debug, FromRow)]
pub struct RecordingRow {
    pub id: Uuid,
    pub filename: String,
    pub source_filename: String,
    pub mime_type: Option<String>,
    pub duration_ms: i64,
    pub storage_key: String,
    pub url: Option<String>,
    pub created_at: OffsetDateTime,
    pub is_upload: bool,
}

pub async fn authentication(db: &Db, key_id: &str) -> Result<Option<KeyAuthentication>, DbError> {
    sqlx::query_as(
        "SELECT enterprise_id, secret_hash, restrictions \
           FROM customer_api_key_auth_lookup($1)",
    )
    .bind(key_id)
    .fetch_optional(db.identity_pool())
    .await
    .map_err(DbError::from)
}

pub async fn touch(
    tx: &mut TenantTx<'_>,
    key_id: &str,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let changed = sqlx::query(
        "UPDATE customer_api_keys \
            SET last_used_at = GREATEST(COALESCE(last_used_at, $2), $2) \
          WHERE id = $1",
    )
    .bind(key_id)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    if changed.rows_affected() != 1 {
        return Err(DbError::NotFound);
    }
    Ok(())
}

pub async fn room(tx: &mut TenantTx<'_>, short_code: &str) -> Result<StatsRoom, DbError> {
    sqlx::query_as(
        "SELECT room.id, room.owner_id, owner.display_name AS owner_name, \
                room.uuid_short AS short_code, room.name \
           FROM rooms AS room INNER JOIN users AS owner ON owner.id = room.owner_id \
          WHERE room.uuid_short = $1",
    )
    .bind(short_code)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

pub async fn sessions(tx: &mut TenantTx<'_>) -> Result<Vec<SessionRow>, DbError> {
    sqlx::query_as(
        "SELECT room.id, room.uuid_short AS short_code, room.name, room.state, \
                COALESCE(state.roster_count, 0) AS current_capacity, room.max_capacity AS current_max, \
                count(member.id) FILTER (WHERE member.role IN ('owner', 'presenter', 'limited_presenter', 'moderator'))::integer AS moderator_count, \
                room.created_at, room.updated_at, COALESCE(state.is_recording, false) AS is_recording \
           FROM rooms AS room \
           LEFT JOIN room_state AS state ON state.room_id = room.id \
           LEFT JOIN room_members AS member ON member.room_id = room.id \
          GROUP BY room.id, state.roster_count, state.is_recording \
          ORDER BY room.created_at, room.id",
    )
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn users(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<UserRow>, DbError> {
    sqlx::query_as(
        "SELECT identity.id, identity.email::text AS email, lower(identity.email::text) AS user_name, \
                member.role, identity.last_login_at AS last_login, \
                COALESCE(member.display_name, identity.display_name) AS name, \
                member.created_at, member.updated_at, member.last_seen_at AS active_date_api \
           FROM room_members AS member \
           INNER JOIN users AS identity ON identity.id = member.user_id \
          WHERE member.room_id = $1 \
          ORDER BY lower(identity.email::text), identity.id",
    )
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn visits(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    from: Option<OffsetDateTime>,
    to: Option<OffsetDateTime>,
    mobile_only: bool,
) -> Result<Vec<VisitRow>, DbError> {
    sqlx::query_as(
        "SELECT email_snapshot AS email, display_name_snapshot AS user_name, user_id, ip, \
                entered_at, exited_at, is_mobile \
           FROM room_visit_sessions \
          WHERE room_id = $1 AND ($2::timestamptz IS NULL OR entered_at >= $2) \
            AND ($3::timestamptz IS NULL OR entered_at <= $3) \
            AND (NOT $4 OR is_mobile) \
          ORDER BY entered_at, id LIMIT 10001",
    )
    .bind(room_id)
    .bind(from)
    .bind(to)
    .bind(mobile_only)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn chat_logs(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    channel: &str,
    from: Option<OffsetDateTime>,
    to: Option<OffsetDateTime>,
) -> Result<Vec<ChatRow>, DbError> {
    sqlx::query_as(
        "SELECT channel.name AS channel, message.created_at AS at, \
                identity.email::text AS user_email, message.body AS message \
           FROM messages AS message \
           INNER JOIN room_channels AS channel ON channel.id = message.channel_id \
           INNER JOIN users AS identity ON identity.id = message.user_id \
          WHERE message.room_id = $1 AND channel.name = $2 AND message.deleted_at IS NULL \
            AND ($3::timestamptz IS NULL OR message.created_at >= $3) \
            AND ($4::timestamptz IS NULL OR message.created_at <= $4) \
          ORDER BY message.created_at, message.id LIMIT 10001",
    )
    .bind(room_id)
    .bind(channel)
    .bind(from)
    .bind(to)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn alert_logs(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    from: Option<OffsetDateTime>,
    to: Option<OffsetDateTime>,
) -> Result<Vec<AlertRow>, DbError> {
    sqlx::query_as(
        "SELECT created_at AS at, alert_kind AS alert_type, body AS message \
           FROM alerts WHERE room_id = $1 AND deleted_at IS NULL \
            AND ($2::timestamptz IS NULL OR created_at >= $2) \
            AND ($3::timestamptz IS NULL OR created_at <= $3) \
          ORDER BY created_at, id LIMIT 10001",
    )
    .bind(room_id)
    .bind(from)
    .bind(to)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn deleted_logs(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    log_type: Option<&str>,
    event_type: Option<&str>,
    from: Option<OffsetDateTime>,
    to: Option<OffsetDateTime>,
) -> Result<Vec<DeletedLogRow>, DbError> {
    sqlx::query_as(
        "SELECT * FROM ( \
           SELECT 'chat'::text AS log_type, \
                  CASE WHEN message.deleted_at IS NOT NULL THEN 'D' ELSE 'E' END::text AS event_type, \
                  COALESCE(message.deleted_at, message.edited_at) AS at, message.body AS original_message \
             FROM messages AS message \
            WHERE message.room_id = $1 AND (message.deleted_at IS NOT NULL OR message.edited_at IS NOT NULL) \
           UNION ALL \
           SELECT 'alerts'::text AS log_type, \
                  CASE WHEN alert.deleted_at IS NOT NULL THEN 'D' ELSE 'E' END::text AS event_type, \
                  COALESCE(alert.deleted_at, alert.edited_at) AS at, alert.body AS original_message \
             FROM alerts AS alert \
            WHERE alert.room_id = $1 AND (alert.deleted_at IS NOT NULL OR alert.edited_at IS NOT NULL) \
         ) AS event \
         WHERE ($2::text IS NULL OR event.log_type = $2) AND ($3::text IS NULL OR event.event_type = $3) \
           AND ($4::timestamptz IS NULL OR event.at >= $4) \
           AND ($5::timestamptz IS NULL OR event.at <= $5) \
         ORDER BY event.at, event.log_type LIMIT 10001",
    )
    .bind(room_id)
    .bind(log_type)
    .bind(event_type)
    .bind(from)
    .bind(to)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn archived_logs(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    log_type: &str,
    channel: &str,
    from: Option<OffsetDateTime>,
    to: Option<OffsetDateTime>,
) -> Result<Vec<ArchivedLogRow>, DbError> {
    sqlx::query_as(
        "SELECT * FROM ( \
           SELECT 'chat'::text AS log_type, room_channel.name AS channel, \
                  message.updated_at, message.body AS content \
             FROM messages AS message \
             INNER JOIN room_channels AS room_channel ON room_channel.id = message.channel_id \
            WHERE message.room_id = $1 \
           UNION ALL \
           SELECT 'alerts'::text AS log_type, ''::text AS channel, alert.updated_at, alert.body AS content \
             FROM alerts AS alert WHERE alert.room_id = $1 \
         ) AS archived \
         WHERE archived.log_type = $2 AND ($2 <> 'chat' OR archived.channel = $3) \
           AND ($4::timestamptz IS NULL OR archived.updated_at >= $4) \
           AND ($5::timestamptz IS NULL OR archived.updated_at <= $5) \
         ORDER BY archived.updated_at, archived.log_type LIMIT 10001",
    )
    .bind(room_id)
    .bind(log_type)
    .bind(channel)
    .bind(from)
    .bind(to)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn recordings(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    now: OffsetDateTime,
) -> Result<Vec<RecordingRow>, DbError> {
    sqlx::query_as(
        "SELECT id, filename, COALESCE(recording_source_filename, filename) AS source_filename, \
                mime_type, COALESCE(recording_duration_ms, 0) AS duration_ms, \
                storage_key, url, created_at, kind = 'recording_upload' AS is_upload \
           FROM files WHERE room_id = $1 AND status = 'ready' \
            AND kind IN ('recording', 'recording_upload') AND created_at >= $2 \
          ORDER BY created_at DESC, id DESC LIMIT 10001",
    )
    .bind(room_id)
    .bind(now - Duration::days(21))
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn add_users(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    users: &[(String, String)],
    now: OffsetDateTime,
) -> Result<(usize, usize), DbError> {
    let mut added = 0;
    let mut freshened = 0;
    for (email, name) in users {
        let inserted_user = sqlx::query_scalar::<_, Uuid>(
            "INSERT INTO users (email, email_hash, display_name) \
             VALUES ($1, md5(lower($1)), $2) \
             ON CONFLICT (email) DO NOTHING \
             RETURNING id",
        )
        .bind(email)
        .bind(name)
        .fetch_optional(tx.conn())
        .await
        .map_err(DbError::from)?;
        let user_id = if let Some(user_id) = inserted_user {
            user_id
        } else {
            sqlx::query_scalar::<_, Uuid>("SELECT id FROM users WHERE email = $1")
                .bind(email)
                .fetch_one(tx.conn())
                .await
                .map_err(DbError::from)?
        };
        let inserted = sqlx::query(
            "INSERT INTO room_members \
               (enterprise_id, room_id, user_id, role, display_name, invited_at, joined_at, last_seen_at, created_at, updated_at) \
             VALUES ($1, $2, $3, 'member', $4, $5, $5, $5, $5, $5) \
             ON CONFLICT (enterprise_id, room_id, user_id) DO NOTHING",
        )
        .bind(tx.ctx().enterprise_id)
        .bind(room_id)
        .bind(user_id)
        .bind(name)
        .bind(now)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
        if inserted.rows_affected() == 1 {
            added += 1;
        } else {
            sqlx::query(
                "UPDATE room_members SET last_seen_at = $2, updated_at = $2 \
                 WHERE room_id = $1 AND user_id = $3",
            )
            .bind(room_id)
            .bind(now)
            .bind(user_id)
            .execute(tx.conn())
            .await
            .map_err(DbError::from)?;
            freshened += 1;
        }
    }
    Ok((added, freshened))
}

pub async fn delete_users(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    emails: &[String],
) -> Result<Vec<String>, DbError> {
    sqlx::query_scalar(
        "DELETE FROM room_members AS member USING users AS identity \
          WHERE member.room_id = $1 AND member.user_id = identity.id AND member.role <> 'owner' \
            AND lower(identity.email::text) = ANY($2) \
          RETURNING lower(identity.email::text)",
    )
    .bind(room_id)
    .bind(emails)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn clone_room(
    tx: &mut TenantTx<'_>,
    source: &StatsRoom,
    name: &str,
    now: OffsetDateTime,
) -> Result<StatsRoom, DbError> {
    let created =
        super::room::create_for_account(tx, source.owner_id, Uuid::new_v4(), name, now).await?;
    sqlx::query(
        "UPDATE rooms AS target SET room_type = source.room_type, state = 'closed', \
                auth_mode = source.auth_mode, max_capacity = source.max_capacity, config = source.config, \
                branding = source.branding, integrations = source.integrations, settings_revision = 0, updated_at = $3 \
           FROM rooms AS source WHERE target.id = $1 AND source.id = $2",
    )
    .bind(created.room.id)
    .bind(source.id)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    sqlx::query(
        "INSERT INTO room_members \
           (enterprise_id, room_id, user_id, role, display_name, can_post, can_post_images, \
            can_edit_own_message, can_delete_own_message, can_public_reply, can_edit_notes, \
            can_edit_username, can_publish_mic, can_publish_cam, can_publish_screen, can_use_admin_chat, \
            can_use_group_chat, can_pm_users, can_pm_admins, can_access_files, can_access_archives, \
            is_muted, is_pm_restricted, is_trial, hide_personal_info, capabilities_overridden, \
            invited_at, joined_at, last_seen_at, created_at, updated_at, revision, is_banned, is_paused, \
            hide_user_count, admin_note, approval_status, has_mobile_app) \
         SELECT member.enterprise_id, $1, member.user_id, member.role, member.display_name, \
            member.can_post, member.can_post_images, member.can_edit_own_message, member.can_delete_own_message, \
            member.can_public_reply, member.can_edit_notes, member.can_edit_username, member.can_publish_mic, \
            member.can_publish_cam, member.can_publish_screen, member.can_use_admin_chat, member.can_use_group_chat, \
            member.can_pm_users, member.can_pm_admins, member.can_access_files, member.can_access_archives, \
            member.is_muted, member.is_pm_restricted, member.is_trial, member.hide_personal_info, \
            member.capabilities_overridden, $3, $3, member.last_seen_at, $3, $3, 0, false, false, \
            member.hide_user_count, member.admin_note, 'approved', member.has_mobile_app \
           FROM room_members AS member \
          WHERE member.room_id = $2 AND member.role IN ('presenter', 'limited_presenter', 'moderator') \
         ON CONFLICT (enterprise_id, room_id, user_id) DO NOTHING",
    )
    .bind(created.room.id)
    .bind(source.id)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    room(tx, &created.room.short_code).await
}
