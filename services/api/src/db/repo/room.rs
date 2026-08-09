//! The room read model: overview, channels and a paginated message history.
//!
//! This replaces the SvelteKit `+page.server.ts` load, which fetched every message in the
//! room on every navigation and had no pagination at all.
//!
//! # Keyset, not OFFSET
//!
//! Pages seek on `(created_at, id)` descending, which is precisely the shape of
//! `messages_tenant_room_channel_created_idx`
//! (`(enterprise_id, room_id, channel_id, created_at DESC NULLS LAST, id DESC NULLS LAST)`).
//! The index was built for this access pattern; using `OFFSET` instead would make Postgres
//! walk and discard every skipped row, so the cost of a page would grow with its depth. A
//! keyset seek is flat.
//!
//! `id` is in the sort key as a tiebreaker, not decoration: `created_at` is a `timestamptz`
//! and two messages posted in the same microsecond would otherwise have no stable order,
//! which shows up as a row appearing on two consecutive pages or on neither.

use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};
use crate::limits;

/// Where the next page starts. Opaque to the client by construction - it is base64 of the
/// sort key, and the only supported thing to do with it is hand it back.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cursor {
    pub created_at: OffsetDateTime,
    pub id: Uuid,
}

impl Cursor {
    /// `<unix_nanos>:<uuid>`, base64url-nopad. Nanoseconds because `timestamptz` has
    /// microsecond resolution and a lossy round-trip would let a cursor land *between* two
    /// rows, silently skipping one.
    #[must_use]
    pub fn encode(&self) -> String {
        use base64::Engine;
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(format!(
            "{}:{}",
            self.created_at.unix_timestamp_nanos(),
            self.id
        ))
    }

    /// Returns `None` for anything malformed. A bad cursor is treated as "start at the
    /// beginning" by the caller rather than as an error: cursors outlive deploys and end up
    /// in bookmarks, and a 400 on a stale one is a worse experience than a first page.
    #[must_use]
    pub fn decode(encoded: &str) -> Option<Self> {
        use base64::Engine;
        let raw = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(encoded)
            .ok()?;
        let text = String::from_utf8(raw).ok()?;
        let (nanos, id) = text.split_once(':')?;
        Some(Self {
            created_at: OffsetDateTime::from_unix_timestamp_nanos(nanos.parse().ok()?).ok()?,
            id: id.parse().ok()?,
        })
    }
}

/// One page, plus where to continue.
///
/// `rename_all` is not decoration: every other response body in this API is camelCase, and
/// without it this one alone would emit `next_cursor`. A client reading `nextCursor` would
/// then get `undefined`, read that as "no more pages", and silently stop after the first -
/// which is exactly what happened before this attribute was added.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub items: Vec<T>,
    /// `None` means this was the last page. Present only when a further row was actually
    /// observed, never guessed from `items.len() == limit` - which is wrong exactly when the
    /// last page happens to be full.
    pub next_cursor: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub id: Uuid,
    pub name: String,
    pub display_name: String,
    pub channel_type: String,
    pub position: i32,
    pub is_archived: bool,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub user_id: Uuid,
    pub member_id: Uuid,
    pub display_name: String,
    pub body: String,
    pub is_presenter_message: bool,
    pub is_trial_author: bool,
    pub badges: serde_json::Value,
    pub bg_color: Option<String>,
    pub font_color: Option<String>,
    pub reply_to_id: Option<Uuid>,
    pub mentions: serde_json::Value,
    pub attachments: serde_json::Value,
    pub edited_at: Option<OffsetDateTime>,
    pub is_answered: bool,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    pub id: Uuid,
    pub name: String,
    pub room_type: String,
    pub state: String,
    pub auth_mode: String,
    pub max_capacity: i32,
    pub branding: serde_json::Value,
    pub roster_count: i32,
    pub is_recording: bool,
    pub global_mute_non_staff: bool,
}

/// The room itself, joined to its live state.
///
/// # Errors
/// [`DbError::NotFound`] when the room is absent *or* belongs to another tenant - the same
/// observation, deliberately indistinguishable.
pub async fn overview(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Overview, DbError> {
    sqlx::query_as(
        "SELECT r.id, r.name, r.room_type, r.state, r.auth_mode, r.max_capacity, r.branding, \
                COALESCE(s.roster_count, 0) AS roster_count, \
                COALESCE(s.is_recording, false) AS is_recording, \
                COALESCE(s.global_mute_non_staff, false) AS global_mute_non_staff \
         FROM rooms r \
         LEFT JOIN room_state s ON s.room_id = r.id \
         WHERE r.id = $1",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Every channel in the room, in display order.
///
/// Unbounded on purpose: `room_channels` is a handful of rows per room, ordered by a
/// `position` column the product controls. Paginating a navigation sidebar would be
/// ceremony, not safety.
pub async fn channels(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<Channel>, DbError> {
    sqlx::query_as(
        "SELECT id, name, display_name, channel_type, position, is_archived \
         FROM room_channels WHERE room_id = $1 \
         ORDER BY position ASC, name ASC",
    )
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// One page of a channel's history, newest first.
///
/// Soft-deleted rows are excluded here rather than filtered by the caller, so a deleted
/// message cannot reappear because one read path forgot the predicate.
pub async fn messages(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    channel_id: Uuid,
    after: Option<Cursor>,
    limit: i64,
) -> Result<Page<Message>, DbError> {
    let limit = limit.clamp(1, limits::MESSAGE_PAGE_MAX);

    // One extra row, purely to answer "is there another page?" without a second query and
    // without inferring it from a full page - which is wrong precisely when the final page
    // is exactly `limit` long.
    let probe = limit + 1;

    // The row-value comparison `(created_at, id) < ($3, $4)` is what lets Postgres seek
    // straight into `messages_tenant_room_channel_created_idx`. Written as two separate
    // `OR`-ed comparisons it would not.
    let rows: Vec<Message> = match after {
        Some(cursor) => {
            sqlx::query_as(
                "SELECT id, channel_id, user_id, member_id, display_name, body, \
                        is_presenter_message, is_trial_author, badges, bg_color, font_color, \
                        reply_to_id, mentions, attachments, edited_at, is_answered, created_at \
                 FROM messages \
                 WHERE room_id = $1 AND channel_id = $2 AND deleted_at IS NULL \
                   AND (created_at, id) < ($3, $4) \
                 ORDER BY created_at DESC, id DESC \
                 LIMIT $5",
            )
            .bind(room_id)
            .bind(channel_id)
            .bind(cursor.created_at)
            .bind(cursor.id)
            .bind(probe)
            .fetch_all(tx.conn())
            .await
        }
        None => {
            sqlx::query_as(
                "SELECT id, channel_id, user_id, member_id, display_name, body, \
                        is_presenter_message, is_trial_author, badges, bg_color, font_color, \
                        reply_to_id, mentions, attachments, edited_at, is_answered, created_at \
                 FROM messages \
                 WHERE room_id = $1 AND channel_id = $2 AND deleted_at IS NULL \
                 ORDER BY created_at DESC, id DESC \
                 LIMIT $3",
            )
            .bind(room_id)
            .bind(channel_id)
            .bind(probe)
            .fetch_all(tx.conn())
            .await
        }
    }
    .map_err(DbError::from)?;

    Ok(into_page(rows, limit))
}

/// Trims the probe row and derives the cursor from the last row actually returned.
fn into_page(mut rows: Vec<Message>, limit: i64) -> Page<Message> {
    let has_more = rows.len() as i64 > limit;
    if has_more {
        rows.truncate(limit as usize);
    }

    // Only when a further row was actually observed - never inferred from `len() == limit`,
    // which is wrong exactly when the last page happens to be full.
    let next_cursor = has_more.then_some(()).and_then(|()| {
        rows.last().map(|last| {
            Cursor {
                created_at: last.created_at,
                id: last.id,
            }
            .encode()
        })
    });

    Page {
        items: rows,
        next_cursor,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cursor() -> Cursor {
        Cursor {
            created_at: OffsetDateTime::from_unix_timestamp_nanos(1_753_920_000_123_456_000)
                .expect("a valid instant"),
            id: uuid::uuid!("00000000-0000-4000-8000-000000004242"),
        }
    }

    #[test]
    fn a_cursor_round_trips_exactly() {
        let original = cursor();
        let decoded = Cursor::decode(&original.encode()).expect("it decodes");
        assert_eq!(decoded, original);
        // Sub-second precision has to survive, or a cursor can land between two rows and
        // skip one. `timestamptz` is microsecond-resolution, so this is the boundary.
        assert_eq!(
            decoded.created_at.unix_timestamp_nanos(),
            original.created_at.unix_timestamp_nanos()
        );
    }

    #[test]
    fn the_cursor_is_opaque_and_carries_no_readable_id() {
        let encoded = cursor().encode();
        assert!(
            !encoded.contains("00000000"),
            "the uuid must not be legible in the cursor: {encoded}"
        );
        assert!(!encoded.contains('='), "padding would break a query string");
    }

    #[test]
    fn a_malformed_cursor_decodes_to_none_rather_than_panicking() {
        for bad in [
            "",
            "!!!!",
            "bm90LWEtY3Vyc29y", // valid base64, wrong shape
            &Cursor::decode("").map_or_else(|| "x".to_string(), |_| String::new()),
        ] {
            assert!(Cursor::decode(bad).is_none(), "{bad:?} should not decode");
        }
    }

    fn message(seconds: i64) -> Message {
        Message {
            id: Uuid::from_u128(seconds as u128),
            channel_id: Uuid::nil(),
            user_id: Uuid::nil(),
            member_id: Uuid::nil(),
            display_name: "Ada".into(),
            body: "hello".into(),
            is_presenter_message: false,
            is_trial_author: false,
            badges: serde_json::json!([]),
            bg_color: None,
            font_color: None,
            reply_to_id: None,
            mentions: serde_json::json!([]),
            attachments: serde_json::json!([]),
            edited_at: None,
            is_answered: false,
            created_at: OffsetDateTime::from_unix_timestamp(seconds).expect("valid"),
        }
    }

    #[test]
    fn a_full_final_page_does_not_advertise_another_one() {
        // The bug this exists to prevent: inferring "more" from `len() == limit` gives an
        // endless empty last page.
        let rows = vec![message(3), message(2)];
        let page = into_page(rows, 2);
        assert_eq!(page.items.len(), 2);
        assert!(
            page.next_cursor.is_none(),
            "exactly `limit` rows means the probe found nothing beyond them"
        );
    }

    #[test]
    fn an_over_full_page_is_trimmed_and_points_at_the_last_kept_row() {
        let rows = vec![message(3), message(2), message(1)];
        let page = into_page(rows, 2);
        assert_eq!(page.items.len(), 2, "the probe row is not returned");

        // The cursor must name the last row *kept*, not the probe row, or the next page
        // would skip one.
        let decoded =
            Cursor::decode(page.next_cursor.as_deref().expect("more to come")).expect("it decodes");
        assert_eq!(decoded.id, Uuid::from_u128(2));
    }

    #[test]
    fn an_empty_page_ends_the_walk() {
        let page = into_page(Vec::new(), 50);
        assert!(page.items.is_empty());
        assert!(page.next_cursor.is_none());
    }
}
