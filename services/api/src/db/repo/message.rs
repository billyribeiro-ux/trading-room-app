//! Writing messages, and the channel check every message path shares.

use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::repo::room::Message;
use crate::db::{DbError, TenantTx};

/// Confirms the channel really belongs to this room, under the tenant GUC.
///
/// Both ids arrive from the URL. RLS already confines the query to the caller's tenant, so a
/// channel id from another tenant returns zero rows - but a channel id from a *different room
/// of the same tenant* would not, and would otherwise be accepted as a filter. This is the
/// check that closes that, and it is a function rather than a copied predicate so no message
/// path can be written without it.
///
/// # Errors
/// [`DbError::NotFound`] - the same answer for "no such channel", "another room's channel"
/// and "another tenant's channel", deliberately indistinguishable.
pub async fn assert_channel_in_room(
    tx: &mut TenantTx<'_>,
    channel_id: Uuid,
    room_id: Uuid,
) -> Result<(), DbError> {
    let found: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM room_channels WHERE id = $1 AND room_id = $2")
            .bind(channel_id)
            .bind(room_id)
            .fetch_optional(tx.conn())
            .await
            .map_err(DbError::from)?;

    found.map(|_| ()).ok_or(DbError::NotFound)
}

/// Everything a new message needs. A struct rather than eleven positional arguments, because
/// `user_id` and `member_id` are both `Uuid` and transposing them is silent.
pub struct NewMessage<'a> {
    pub room_id: Uuid,
    pub channel_id: Uuid,
    pub enterprise_id: Uuid,
    pub user_id: Uuid,
    pub member_id: Uuid,
    pub display_name: &'a str,
    pub body: &'a str,
    pub reply_to_id: Option<Uuid>,
    pub is_presenter_message: bool,
    pub is_trial_author: bool,
    pub now: OffsetDateTime,
}

/// Inserts a message and returns it as the read model sees it.
///
/// `enterprise_id` is written explicitly even though the GUC already scopes the transaction:
/// the column is `NOT NULL` and RLS's `WITH CHECK` compares it against the GUC, so supplying
/// the wrong one raises SQLSTATE 42501 - which `DbError` maps to a 500, not a 403, because it
/// would mean *this code* composed a row for the wrong tenant.
///
/// `RETURNING` rather than a follow-up SELECT: one round trip, and the row cannot change
/// between write and read.
pub async fn insert(tx: &mut TenantTx<'_>, new: NewMessage<'_>) -> Result<Message, DbError> {
    sqlx::query_as(
        "INSERT INTO messages \
           (enterprise_id, room_id, channel_id, user_id, member_id, display_name, body, \
            reply_to_id, is_presenter_message, is_trial_author, badges, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, \
            COALESCE((SELECT jsonb_agg(rmb.badge_id::text ORDER BY rmb.badge_id) \
                FROM room_member_badges rmb \
                WHERE rmb.enterprise_id = $1 AND rmb.room_id = $2 AND rmb.member_id = $5), \
                '[]'::jsonb), $11, $11) \
         RETURNING id, channel_id, user_id, member_id, display_name, body, \
                   is_presenter_message, is_trial_author, badges, bg_color, font_color, \
                   reply_to_id, mentions, attachments, edited_at, is_answered, created_at",
    )
    .bind(new.enterprise_id)
    .bind(new.room_id)
    .bind(new.channel_id)
    .bind(new.user_id)
    .bind(new.member_id)
    .bind(new.display_name)
    .bind(new.body)
    .bind(new.reply_to_id)
    .bind(new.is_presenter_message)
    .bind(new.is_trial_author)
    .bind(new.now)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}
