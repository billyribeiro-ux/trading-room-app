//! Session notes and their version history.
//!
//! `notes` and `note_versions` live together because a version is meaningless without the note
//! it belongs to - the repository is grouped by aggregate, not by table.
//!
//! # The authorization trap this module is shaped around
//!
//! A previous audit of the SvelteKit backend found `restoreNoteVersion` accepting a version id
//! without checking that the version belonged to the note, or the note to the caller's room.
//! RLS confines both to the caller's *tenant*, which is necessary and not sufficient: inside
//! one tenant, a member of room A could restore room B's note content.
//!
//! [`restore`] therefore resolves the version and the note **in a single statement joined on
//! `room_id`**, so there is no arrangement of ids that reaches an `UPDATE` without both
//! relationships holding. That is a stronger guarantee than checking them in sequence, where a
//! future edit can drop one check and leave the other looking like coverage.

use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: Uuid,
    pub name: String,
    pub content_html: Option<String>,
    pub is_welcome_mat: bool,
    pub position: Option<i32>,
    pub updated_by_id: Option<Uuid>,
    #[serde(with = "time::serde::rfc3339")]
    pub updated_at: OffsetDateTime,
}

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct NoteVersion {
    pub id: Uuid,
    pub note_id: Uuid,
    pub version: i32,
    pub content_html: Option<String>,
    pub updated_by_id: Option<Uuid>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// Every live note in the room, in tab order.
pub async fn list(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<Note>, DbError> {
    sqlx::query_as(
        "SELECT id, name, content_html, is_welcome_mat, position, updated_by_id, updated_at \
         FROM notes WHERE room_id = $1 AND deleted_at IS NULL \
         ORDER BY position ASC NULLS LAST, created_at ASC",
    )
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// Creates a note tab, appended after the last one.
///
/// `author` is a **`users.id`**, not a `room_members.id`: `notes_updated_by_fk`,
/// `notes_deleted_by_fk` and `note_versions_updated_by_fk` all reference `users`. The two are
/// both `Uuid`, so passing the wrong one compiles and fails at runtime as a foreign-key
/// violation - which is why every signature here names the parameter `author_user_id`.
pub async fn create(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    name: &str,
    author_user_id: Uuid,
) -> Result<Note, DbError> {
    /*
      THE ROOM ROW IS LOCKED FIRST, and it is the only thing that actually orders these.

      This used to be one statement with the comment *"`position` is computed in the statement
      rather than read and incremented, so two tabs created at once cannot both land on the same
      number"*. The premise is right and the conclusion is wrong, and the difference was measured on
      a throwaway PostgreSQL 16 rather than argued: four inserts released at the same clock instant
      produced `first@1, tab-1@2, tab-2@2, tab-3@2, tab-4@2` — two distinct positions for five rows.
      At `READ COMMITTED` each statement takes its own snapshot, and computing the maximum INSIDE the
      statement does not serialise anything; it only makes the window one statement wide.

      `FOR UPDATE` inside the same statement does not fix it either, and that was measured too: the
      same four inserts with the room row locked in a CTE produced the same two distinct positions.
      The lock is taken during a statement whose snapshot is already fixed, so the blocked writer
      resumes and still reads the maximum it read before.

      Taken as its OWN statement it does fix it, because the next statement takes a fresh snapshot
      after the lock is granted: seven simultaneous creates produced seven distinct positions. The
      lock is one row of `rooms`, held for the rest of a transaction that creates one note tab, and
      it serialises exactly the thing that has to be serialised — tab creation within one room.
    */
    sqlx::query("SELECT id FROM rooms WHERE id = $1 FOR UPDATE")
        .bind(room_id)
        .fetch_optional(tx.conn())
        .await
        .map_err(DbError::from)?
        .ok_or(DbError::NotFound)?;

    sqlx::query_as(
        "INSERT INTO notes (enterprise_id, room_id, name, position, updated_by_id) \
         VALUES ($1, $2, $3, \
                 (SELECT COALESCE(MAX(position), 0) + 1 FROM notes WHERE room_id = $2), $4) \
         RETURNING id, name, content_html, is_welcome_mat, position, updated_by_id, updated_at",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(name)
    .bind(author_user_id)
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

/// Saves new content and records the previous content as a version.
///
/// The version is written **before** the update, so the history holds what the note *was* -
/// recording it afterwards would store the new content twice and lose the state being replaced.
///
/// The note row is locked for the duration, which is what makes the version number safe:
/// `MAX(version) + 1` is a read-then-write, and two concurrent saves without the lock would
/// both compute the same number and one would violate the unique constraint - or worse, would
/// not, and the history would have two rows claiming the same revision.
pub async fn save(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    content_html: &str,
    author_user_id: Uuid,
    now: OffsetDateTime,
) -> Result<Note, DbError> {
    // Joined on `room_id`: a note id from another room of the same tenant is not found here,
    // rather than being updated.
    let existing: Option<(Uuid, Option<String>)> = sqlx::query_as(
        "SELECT id, content_html FROM notes \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL \
         FOR UPDATE",
    )
    .bind(note_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    let (_, previous) = existing.ok_or(DbError::NotFound)?;

    sqlx::query(
        "INSERT INTO note_versions (enterprise_id, note_id, content_html, updated_by_id, version) \
         SELECT n.enterprise_id, n.id, $2, $3, \
                (SELECT COALESCE(MAX(version), 0) + 1 FROM note_versions WHERE note_id = n.id) \
         FROM notes n WHERE n.id = $1",
    )
    .bind(note_id)
    .bind(previous)
    .bind(author_user_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    sqlx::query_as(
        "UPDATE notes SET content_html = $3, updated_by_id = $4, updated_at = $5 \
         WHERE id = $1 AND room_id = $2 \
         RETURNING id, name, content_html, is_welcome_mat, position, updated_by_id, updated_at",
    )
    .bind(note_id)
    .bind(room_id)
    .bind(content_html)
    .bind(author_user_id)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// The note's history, newest revision first.
///
/// Joined through `notes` on `room_id`, so a note id from another room yields nothing rather
/// than that room's history.
pub async fn versions(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    limit: i64,
) -> Result<Vec<NoteVersion>, DbError> {
    sqlx::query_as(
        "SELECT v.id, v.note_id, v.version, v.content_html, v.updated_by_id, v.created_at \
         FROM note_versions v \
         JOIN notes n ON n.id = v.note_id \
         WHERE v.note_id = $1 AND n.room_id = $2 \
         ORDER BY v.version DESC \
         LIMIT $3",
    )
    .bind(note_id)
    .bind(room_id)
    .bind(limit)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// Restores a stored version onto its note.
///
/// **The whole point of this function is the join.** The version, its note and the caller's
/// room are resolved in one statement, so `version_id` cannot name a version of some other
/// room's note. Checking the two relationships in sequence would work today and rot the first
/// time somebody edits one branch.
///
/// Restoring is itself a save: the content being replaced is recorded as a new version first,
/// so a restore can be undone.
pub async fn restore(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    version_id: Uuid,
    author_user_id: Uuid,
    now: OffsetDateTime,
) -> Result<Note, DbError> {
    let restored: Option<(Option<String>,)> = sqlx::query_as(
        "SELECT v.content_html \
         FROM note_versions v \
         JOIN notes n ON n.id = v.note_id \
         WHERE v.id = $1 AND v.note_id = $2 AND n.room_id = $3 AND n.deleted_at IS NULL",
    )
    .bind(version_id)
    .bind(note_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    let (content,) = restored.ok_or(DbError::NotFound)?;

    save(
        tx,
        room_id,
        note_id,
        content.as_deref().unwrap_or_default(),
        author_user_id,
        now,
    )
    .await
}

pub async fn rename(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    name: &str,
    now: OffsetDateTime,
) -> Result<Note, DbError> {
    sqlx::query_as(
        "UPDATE notes SET name = $3, updated_at = $4 \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL \
         RETURNING id, name, content_html, is_welcome_mat, position, updated_by_id, updated_at",
    )
    .bind(note_id)
    .bind(room_id)
    .bind(name)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Soft-deletes a note tab.
///
/// Soft, because `notes` carries `deleted_at`/`deleted_by_id` and the history in
/// `note_versions` would otherwise be orphaned - and because "who removed the trading plan"
/// is a question worth being able to answer.
pub async fn soft_delete(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    actor_user_id: Uuid,
    now: OffsetDateTime,
) -> Result<(), DbError> {
    let affected = sqlx::query(
        "UPDATE notes SET deleted_at = $3, deleted_by_id = $4 \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL",
    )
    .bind(note_id)
    .bind(room_id)
    .bind(now)
    .bind(actor_user_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?
    .rows_affected();

    // Zero rows is "no such note, in this room, still alive" - all three collapsed into 404,
    // and deliberately including the already-deleted case: a second delete is not an error
    // worth a different answer.
    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

/// Makes one note the room's welcome mat, clearing the flag from any other.
///
/// Both statements in the caller's transaction, so the room can never have two welcome mats -
/// or, if the clear succeeded and the set failed, none.
pub async fn set_welcome_mat(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    note_id: Uuid,
    now: OffsetDateTime,
) -> Result<Note, DbError> {
    sqlx::query(
        "UPDATE notes SET is_welcome_mat = false, updated_at = $2 \
         WHERE room_id = $1 AND is_welcome_mat AND id <> $3",
    )
    .bind(room_id)
    .bind(now)
    .bind(note_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    sqlx::query_as(
        "UPDATE notes SET is_welcome_mat = true, updated_at = $3 \
         WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL \
         RETURNING id, name, content_html, is_welcome_mat, position, updated_by_id, updated_at",
    )
    .bind(note_id)
    .bind(room_id)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}
