//! Moderation: message removal, timed mutes, personal mutes and reactions.
//!
//! Everything here writes `audit_log`, because every action in this module changes what
//! somebody else may do or removes something they said. "Who muted this member and when" is
//! not a question to answer by reading application logs that roll over in a week.

use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

/// One entry in the audit trail.
///
/// A struct rather than positional arguments because `actor_name` and `event_detail` are both
/// `&str` and `target_id` is one of several `Uuid`s - a transposition would compile and be
/// wrong in a table nobody reads until it matters.
pub struct AuditEntry<'a> {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub actor_user_id: Uuid,
    pub actor_name: &'a str,
    /// The machine-readable action, e.g. `message.deleted`.
    pub event_name: &'a str,
    /// Human-readable, `NOT NULL` in the schema - so it is a required argument here rather
    /// than an `Option` that would end up as an empty string.
    pub event_detail: &'a str,
    pub target_type: Option<&'a str>,
    pub target_id: Option<Uuid>,
    pub metadata: serde_json::Value,
}

/// Records a moderation action.
///
/// Takes the caller's transaction, so the record and the act it describes commit together. An
/// audit trail written afterwards is one that is missing exactly the entries that mattered -
/// the ones where something failed half way.
pub async fn audit(tx: &mut TenantTx<'_>, entry: AuditEntry<'_>) -> Result<(), DbError> {
    sqlx::query(
        "INSERT INTO audit_log \
           (enterprise_id, room_id, actor_user_id, actor_name, event_name, event_detail, \
            target_type, target_id, metadata) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    )
    .bind(entry.enterprise_id)
    .bind(entry.room_id)
    .bind(entry.actor_user_id)
    .bind(entry.actor_name)
    .bind(entry.event_name)
    .bind(entry.event_detail)
    .bind(entry.target_type)
    .bind(entry.target_id)
    .bind(sqlx::types::Json(entry.metadata))
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

/// Soft-deletes a message.
///
/// Returns the author's `member_id`, which the caller needs to decide whether this was a
/// self-delete (`can_delete_own_message`) or a moderator action - a distinction the capability
/// layer cannot make without knowing who wrote it.
pub async fn message_author(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    message_id: Uuid,
) -> Result<Uuid, DbError> {
    sqlx::query_scalar(
        "SELECT member_id FROM messages \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(message_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

pub async fn delete_message(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    message_id: Uuid,
    actor_user_id: Uuid,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE messages SET deleted_at = $3, deleted_by_id = $4, updated_at = $3 \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(message_id)
    .bind(room_id)
    .bind(now)
    .bind(actor_user_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

/// Edits a message body, but only the author's own.
///
/// `member_id = $3` is in the `WHERE`, not checked beforehand: an editor who is not the author
/// finds no row, so there is no window between the check and the write and no second code path
/// that could forget it.
pub async fn edit_own_message(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    message_id: Uuid,
    author_member_id: Uuid,
    body: &str,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE messages SET body = $4, edited_at = $5, updated_at = $5 \
         WHERE id = $1 AND room_id = $2 AND member_id = $3 AND deleted_at IS NULL",
    )
    .bind(message_id)
    .bind(room_id)
    .bind(author_member_id)
    .bind(body)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

/// Mutes a member until an instant, or indefinitely with `until = None`.
///
/// Scoped by `room_id` so a moderator cannot reach a membership in another room, even one
/// belonging to the same tenant.
pub async fn set_member_mute(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    member_id: Uuid,
    muted: bool,
    until: Option<OffsetDateTime>,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE room_members SET is_muted = $3, muted_until = $4, updated_at = $5 \
         WHERE id = $1 AND room_id = $2",
    )
    .bind(member_id)
    .bind(room_id)
    .bind(muted)
    .bind(until)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

/// A personal mute: one member choosing not to see another.
///
/// Distinct from `room_members.is_muted`, which is moderation. `mutes_no_self_check` already
/// forbids muting yourself, so that case surfaces as a CHECK violation rather than being
/// re-implemented here.
pub async fn mute_personally(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    member_id: Uuid,
    muted_member_id: Uuid,
) -> Result<(), DbError> {
    // The target must be in the same room. Without this, a member id from another room of the
    // same tenant would insert cleanly and silently.
    let present: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM room_members WHERE id = $1 AND room_id = $2")
            .bind(muted_member_id)
            .bind(room_id)
            .fetch_optional(tx.conn())
            .await
            .map_err(DbError::from)?;
    present.ok_or(DbError::NotFound)?;

    sqlx::query(
        "INSERT INTO mutes (enterprise_id, room_id, member_id, muted_member_id) \
         VALUES ($1, $2, $3, $4) \
         ON CONFLICT DO NOTHING",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(member_id)
    .bind(muted_member_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    Ok(())
}

pub async fn unmute_personally(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    member_id: Uuid,
    muted_member_id: Uuid,
) -> Result<(), DbError> {
    sqlx::query("DELETE FROM mutes WHERE room_id = $1 AND member_id = $2 AND muted_member_id = $3")
        .bind(room_id)
        .bind(member_id)
        .bind(muted_member_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;
    Ok(())
}

/// Everyone this member has personally muted.
pub async fn muted_by(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    member_id: Uuid,
) -> Result<Vec<Uuid>, DbError> {
    sqlx::query_scalar("SELECT muted_member_id FROM mutes WHERE room_id = $1 AND member_id = $2")
        .bind(room_id)
        .bind(member_id)
        .fetch_all(tx.conn())
        .await
        .map_err(DbError::from)
}

/// Adds a reaction. Idempotent - reacting twice with the same emoji is one reaction.
pub async fn react(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    message_id: Uuid,
    member_id: Uuid,
    emoji: &str,
) -> Result<(), DbError> {
    let present: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM messages WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(message_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;
    present.ok_or(DbError::NotFound)?;

    sqlx::query(
        "INSERT INTO message_reactions (enterprise_id, room_id, message_id, member_id, emoji) \
         VALUES ($1, $2, $3, $4, $5) \
         ON CONFLICT DO NOTHING",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(message_id)
    .bind(member_id)
    .bind(emoji)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    Ok(())
}

pub async fn unreact(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    message_id: Uuid,
    member_id: Uuid,
    emoji: &str,
) -> Result<(), DbError> {
    sqlx::query(
        "DELETE FROM message_reactions \
         WHERE room_id = $1 AND message_id = $2 AND member_id = $3 AND emoji = $4",
    )
    .bind(room_id)
    .bind(message_id)
    .bind(member_id)
    .bind(emoji)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    Ok(())
}

/// Renames a member **within one room**.
///
/// # The escalation this signature prevents
///
/// A previous audit found `editUsername` in the SvelteKit backend able to change another
/// user's name, and to change fields beyond the name. Two things stop that here:
///
/// * the `WHERE` names `id = $1 AND room_id = $2`, and the caller can only pass its **own**
///   `member_id` - the handler takes it from the resolved membership, not from the request;
/// * this writes `room_members.display_name`, which is a per-room label. `users.display_name`
///   is global identity and is not reachable from a room-scoped route at all.
pub async fn rename_member(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    member_id: Uuid,
    display_name: &str,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE room_members SET display_name = $3, updated_at = $4 \
         WHERE id = $1 AND room_id = $2",
    )
    .bind(member_id)
    .bind(room_id)
    .bind(display_name)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}
