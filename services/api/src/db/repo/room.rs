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

/// Canonical room lifecycle data rendered by the account application.
///
/// This deliberately excludes `config`, branding, integrations, and member PII. Those belong to
/// later, separately authorized Gate 3 slices and must not hitchhike on a room-list response.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AccountRoom {
    pub id: Uuid,
    pub short_code: String,
    pub name: String,
    pub state: String,
    pub max_capacity: i32,
    pub member_count: i32,
    #[serde(with = "time::serde::rfc3339::option")]
    pub archived_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

#[derive(Debug)]
pub struct CreateRoomOutcome {
    pub room: AccountRoom,
    pub replayed: bool,
    pub stored_name: String,
    pub stored_owner_id: Uuid,
}

#[derive(Debug)]
pub struct UpdateRoomOutcome {
    pub room: AccountRoom,
    pub changed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsSnapshot {
    pub room_id: Uuid,
    pub revision: i64,
    pub settings: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug)]
pub struct SettingsMutationOutcome {
    pub snapshot: SettingsSnapshot,
    pub replayed: bool,
    pub changed: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum SettingsMutationError {
    #[error(transparent)]
    Database(#[from] DbError),
    #[error("the request id was already used for a different mutation")]
    RequestMismatch,
    #[error("room settings changed after the submitted base revision")]
    Conflict,
    #[error(transparent)]
    Validation(#[from] crate::room_settings::ValidationError),
    #[error("stored room settings document is invalid")]
    InvalidStoredDocument,
}

fn settings_from_value(
    room_id: Uuid,
    revision: i64,
    value: serde_json::Value,
) -> Result<SettingsSnapshot, SettingsMutationError> {
    let settings = value
        .as_object()
        .cloned()
        .ok_or(SettingsMutationError::InvalidStoredDocument)?;
    crate::room_settings::validate_document(&settings)
        .map_err(|_| SettingsMutationError::InvalidStoredDocument)?;
    Ok(SettingsSnapshot {
        room_id,
        revision,
        settings,
    })
}

/// Reads the complete admin settings document. The handler takes the account-admin lock first.
pub async fn settings_for_account(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
) -> Result<SettingsSnapshot, SettingsMutationError> {
    use sqlx::Row;
    let row = sqlx::query(
        "SELECT id, settings_revision, COALESCE(config -> 'settings', '{}'::jsonb) AS settings \
         FROM rooms WHERE id = $1",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)?;
    settings_from_value(
        row.get("id"),
        row.get("settings_revision"),
        row.get("settings"),
    )
}

/// Applies one or more setting changes atomically with field-aware optimistic concurrency.
///
/// A stale global revision is accepted only when every field in `base` still has the value the
/// caller read. Thus simultaneous edits to different fields merge, while two edits to the same
/// field produce an explicit conflict. The account-scoped request ledger makes retries converge.
#[allow(clippy::too_many_arguments)]
pub async fn patch_settings_for_account(
    tx: &mut TenantTx<'_>,
    actor_user_id: Uuid,
    room_id: Uuid,
    request_id: Uuid,
    request_digest: &str,
    expected_revision: i64,
    base: &serde_json::Map<String, serde_json::Value>,
    updates: &serde_json::Map<String, serde_json::Value>,
    now: OffsetDateTime,
) -> Result<SettingsMutationOutcome, SettingsMutationError> {
    use sqlx::Row;

    // Request ids are account-wide. Serializing on their hash closes the gap between the ledger
    // lookup and insert even when a buggy client reuses one against two different rooms at once.
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 754))")
        .bind(request_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?;

    let replay = sqlx::query(
        "SELECT room_id, request_digest FROM room_setting_mutations \
         WHERE enterprise_id = $1 AND request_id = $2",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;
    if let Some(replay) = replay {
        let stored_room_id: Uuid = replay.get("room_id");
        let stored_digest: String = replay.get("request_digest");
        if stored_room_id != room_id || stored_digest != request_digest {
            return Err(SettingsMutationError::RequestMismatch);
        }
        return Ok(SettingsMutationOutcome {
            snapshot: settings_for_account(tx, room_id).await?,
            replayed: true,
            changed: false,
        });
    }

    let row = sqlx::query(
        "SELECT settings_revision, COALESCE(config -> 'settings', '{}'::jsonb) AS settings \
         FROM rooms WHERE id = $1 FOR UPDATE",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)?;
    let revision: i64 = row.get("settings_revision");
    let current_value: serde_json::Value = row.get("settings");
    let mut current = current_value
        .as_object()
        .cloned()
        .ok_or(SettingsMutationError::InvalidStoredDocument)?;
    crate::room_settings::validate_document(&current)
        .map_err(|_| SettingsMutationError::InvalidStoredDocument)?;

    if revision != expected_revision {
        for (name, expected) in base {
            let actual = current.get(name).unwrap_or(&serde_json::Value::Null);
            if actual != expected {
                return Err(SettingsMutationError::Conflict);
            }
        }
    }

    let before = current.clone();
    crate::room_settings::apply_patch(&mut current, updates);
    crate::room_settings::validate_document(&current)?;
    let changed = current != before;
    let title = updates
        .get("name")
        .and_then(serde_json::Value::as_str)
        .map(str::trim);

    let resulting_revision = if changed {
        sqlx::query_scalar::<_, i64>(
            "UPDATE rooms \
             SET config = jsonb_set(config, '{settings}', $2, true), \
                 settings_revision = settings_revision + 1, \
                 name = COALESCE($3, name), updated_at = $4 \
             WHERE id = $1 RETURNING settings_revision",
        )
        .bind(room_id)
        .bind(serde_json::Value::Object(current.clone()))
        .bind(title)
        .bind(now)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)?
    } else {
        revision
    };

    sqlx::query(
        "INSERT INTO room_setting_mutations \
           (enterprise_id, request_id, room_id, actor_user_id, request_digest, response_revision, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(request_id)
    .bind(room_id)
    .bind(actor_user_id)
    .bind(request_digest)
    .bind(resulting_revision)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    Ok(SettingsMutationOutcome {
        snapshot: SettingsSnapshot {
            room_id,
            revision: resulting_revision,
            settings: current,
        },
        replayed: false,
        changed,
    })
}

/// Locks and validates the caller's account authority inside the tenant transaction.
///
/// The bounded `SECURITY DEFINER` function is necessary because request-time role discovery runs
/// before a tenant is known and the runtime role intentionally has no direct table privilege on
/// `enterprise_memberships`. Its `FOR SHARE` lock is held until this [`TenantTx`] ends, closing the
/// revocation race between authorization and the protected room operation.
pub async fn lock_account_admin(tx: &mut TenantTx<'_>, user_id: Uuid) -> Result<bool, DbError> {
    sqlx::query_scalar("SELECT auth_lock_enterprise_admin($1)")
        .bind(user_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)
}

/// Every room in the selected enterprise, including archived and zero-member rooms.
pub async fn list_for_account(tx: &mut TenantTx<'_>) -> Result<Vec<AccountRoom>, DbError> {
    sqlx::query_as(
        "SELECT r.id, r.uuid_short AS short_code, r.name, r.state, r.max_capacity, \
                count(m.id)::integer AS member_count, r.archived_at, r.created_at \
           FROM rooms r \
           LEFT JOIN room_members m ON m.room_id = r.id AND m.enterprise_id = r.enterprise_id \
         GROUP BY r.id \
         ORDER BY r.name ASC, r.id ASC",
    )
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

async fn account_room(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<AccountRoom, DbError> {
    sqlx::query_as(
        "SELECT r.id, r.uuid_short AS short_code, r.name, r.state, r.max_capacity, \
                count(m.id)::integer AS member_count, r.archived_at, r.created_at \
           FROM rooms r \
           LEFT JOIN room_members m ON m.room_id = r.id AND m.enterprise_id = r.enterprise_id \
         WHERE r.id = $1 \
         GROUP BY r.id",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Idempotently creates a room and its owner membership/state in one tenant transaction.
pub async fn create_for_account(
    tx: &mut TenantTx<'_>,
    owner_id: Uuid,
    request_id: Uuid,
    name: &str,
    now: OffsetDateTime,
) -> Result<CreateRoomOutcome, DbError> {
    let room_id = Uuid::new_v4();
    let short_code = room_id.simple().to_string()[..12].to_owned();
    let inserted = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO rooms \
           (id, enterprise_id, owner_id, uuid_short, name, config, creation_request_id, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, '{\"access\":{\"tiers\":[]}}'::jsonb, $6, $7, $7) \
         ON CONFLICT (enterprise_id, creation_request_id) \
           WHERE creation_request_id IS NOT NULL \
         DO NOTHING \
         RETURNING id",
    )
    .bind(room_id)
    .bind(tx.ctx().enterprise_id)
    .bind(owner_id)
    .bind(short_code)
    .bind(name)
    .bind(request_id)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    if inserted.is_none() {
        use sqlx::Row;
        // PostgreSQL waits for the winning insert before deciding the partial-unique conflict, so
        // this read sees a fully committed room graph even under simultaneous transport retries.
        let existing = sqlx::query(
            "SELECT id, name, owner_id FROM rooms \
             WHERE enterprise_id = $1 AND creation_request_id = $2",
        )
        .bind(tx.ctx().enterprise_id)
        .bind(request_id)
        .fetch_one(tx.conn())
        .await
        .map_err(DbError::from)?;
        let existing_room_id: Uuid = existing.get("id");
        return Ok(CreateRoomOutcome {
            room: account_room(tx, existing_room_id).await?,
            replayed: true,
            stored_name: existing.get("name"),
            stored_owner_id: existing.get("owner_id"),
        });
    }
    let owner_membership = sqlx::query(
        "INSERT INTO room_members \
           (enterprise_id, room_id, user_id, role, display_name, joined_at, created_at, updated_at) \
         SELECT $1, $2, user_row.id, 'owner', user_row.display_name, $3, $3, $3 \
           FROM users AS user_row WHERE user_row.id = $4",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(room_id)
    .bind(now)
    .bind(owner_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;
    if owner_membership.rows_affected() != 1 {
        return Err(DbError::NotFound);
    }

    sqlx::query(
        "INSERT INTO room_state (enterprise_id, room_id, created_at, updated_at) \
         VALUES ($1, $2, $3, $3)",
    )
    .bind(tx.ctx().enterprise_id)
    .bind(room_id)
    .bind(now)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    Ok(CreateRoomOutcome {
        room: account_room(tx, room_id).await?,
        replayed: false,
        stored_name: name.to_owned(),
        stored_owner_id: owner_id,
    })
}

/// Sets the requested archive state; repeated calls converge without restamping the timestamp.
pub async fn set_archived(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    archived: bool,
    now: OffsetDateTime,
) -> Result<UpdateRoomOutcome, DbError> {
    let current = sqlx::query_scalar::<_, Option<OffsetDateTime>>(
        "SELECT archived_at FROM rooms WHERE id = $1 FOR UPDATE",
    )
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)?;
    let changed = current.is_some() != archived;
    if changed {
        sqlx::query("UPDATE rooms SET archived_at = $2, updated_at = $3 WHERE id = $1")
            .bind(room_id)
            .bind(archived.then_some(now))
            .bind(now)
            .execute(tx.conn())
            .await
            .map_err(DbError::from)?;
    }
    Ok(UpdateRoomOutcome {
        room: account_room(tx, room_id).await?,
        changed,
    })
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
