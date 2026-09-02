//! Polls and their responses.

use time::OffsetDateTime;
use uuid::Uuid;

use crate::db::{DbError, TenantTx};

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Poll {
    pub id: Uuid,
    pub question: String,
    pub choices: serde_json::Value,
    pub state: String,
    pub created_by_id: Uuid,
    #[serde(with = "time::serde::rfc3339::option")]
    pub closed_at: Option<OffsetDateTime>,
    #[serde(with = "time::serde::rfc3339")]
    pub created_at: OffsetDateTime,
}

/// A poll plus its tally. The tally is computed, never stored - a denormalised counter is a
/// second source of truth that drifts the first time a response is deleted.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PollResults {
    #[serde(flatten)]
    pub poll: Poll,
    /// One count per choice index, in choice order.
    pub tally: Vec<i64>,
    pub total: i64,
    /// What the asking member themselves chose, if anything.
    pub own_choice: Option<i32>,
}

pub async fn list(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<Poll>, DbError> {
    sqlx::query_as(
        "SELECT id, question, choices, state, created_by_id, closed_at, created_at \
         FROM polls WHERE room_id = $1 ORDER BY created_at DESC",
    )
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// `author_user_id` is a **`users.id`**: `polls_created_by_fk` references `users`, not
/// `room_members`. Both are `Uuid`, so the name is the only thing standing between a correct
/// call and a foreign-key violation at runtime.
pub async fn create(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    author_user_id: Uuid,
    question: &str,
    choices: &[String],
) -> Result<Poll, DbError> {
    sqlx::query_as(
        "INSERT INTO polls (enterprise_id, room_id, created_by_id, question, choices) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING id, question, choices, state, created_by_id, closed_at, created_at",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(author_user_id)
    .bind(question)
    .bind(sqlx::types::Json(choices))
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

pub async fn get(tx: &mut TenantTx<'_>, room_id: Uuid, poll_id: Uuid) -> Result<Poll, DbError> {
    sqlx::query_as(
        "SELECT id, question, choices, state, created_by_id, closed_at, created_at \
         FROM polls WHERE id = $1 AND room_id = $2",
    )
    .bind(poll_id)
    .bind(room_id)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

pub async fn delete(tx: &mut TenantTx<'_>, room_id: Uuid, poll_id: Uuid) -> Result<(), DbError> {
    let affected = sqlx::query("DELETE FROM polls WHERE id = $1 AND room_id = $2")
        .bind(poll_id)
        .bind(room_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?
        .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}

/// Closes a poll. Idempotent: closing a closed poll is not an error.
pub async fn close(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    poll_id: Uuid,
    now: OffsetDateTime,
) -> Result<Poll, DbError> {
    sqlx::query_as(
        "UPDATE polls SET state = 'closed', closed_at = COALESCE(closed_at, $3), updated_at = $3 \
         WHERE id = $1 AND room_id = $2 \
         RETURNING id, question, choices, state, created_by_id, closed_at, created_at",
    )
    .bind(poll_id)
    .bind(room_id)
    .bind(now)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?
    .ok_or(DbError::NotFound)
}

/// Records a member's answer, replacing any previous one.
///
/// Three things are enforced in the statement rather than around it:
///
/// * the poll must belong to this room - a poll id from another room is not found;
/// * the poll must be `active` - answering a closed poll is refused by the `WHERE`;
/// * `choice_index` must be a real index into `choices`, so a poll with three options cannot
///   accumulate votes for option 47.
///
/// One response per member is enforced by deleting first, in the same statement. The schema has
/// no unique constraint on `(poll_id, member_id)`, so this is the layer that decides a member
/// votes once - and it says so here rather than leaving the duplicate to be discovered in a tally.
///
/// # It was THREE statements until 2026-09-02, and the docblock said otherwise
///
/// The second bullet used to end *"not by a read-then-write that another request can slip
/// between"*, and that was exactly what this was: a `SELECT` to validate, a `DELETE`, and an
/// `INSERT`. Sharing a transaction does not close the window - at `READ COMMITTED` each statement
/// takes its own snapshot, so a presenter closing the poll between the first and the third
/// committed, and the vote landed on a closed poll anyway.
///
/// Proved on a throwaway PostgreSQL 16 rather than reasoned, because `sqlx::query` is not
/// compile-checked and this file's own comment had been wrong about it: with the poll closed one
/// second into the transaction, the old shape recorded **1** response and this one records **0**.
/// The happy path still records one and a re-vote still replaces rather than duplicates; an
/// out-of-range choice, a poll from another room and an unknown poll all insert nothing and leave
/// an existing vote untouched.
///
/// `FOR SHARE` on the poll row is the other half. Without it the `WHERE` is only as good as the
/// statement's snapshot, so a close committing microseconds earlier would still be missed; with it,
/// a concurrent `UPDATE polls SET state` waits for this vote instead of overtaking it. The row is
/// one line of a small table and the lock is held for the rest of one transaction.
pub async fn answer(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    poll_id: Uuid,
    member_id: Uuid,
    choice_index: i32,
) -> Result<(), DbError> {
    // One statement. `valid` is the validation, `cleared` the replace, and the `INSERT` runs only
    // for the rows `valid` yields - so all three either happen or none of them does, and there is
    // no snapshot between them for a concurrent close to arrive in.
    let recorded = sqlx::query(
        "WITH valid AS ( \
             SELECT 1 FROM polls \
             WHERE id = $2 AND room_id = $5 AND state = 'active' \
               AND $4 >= 0 AND $4 < jsonb_array_length(choices) \
             FOR SHARE \
         ), cleared AS ( \
             DELETE FROM poll_responses \
             WHERE poll_id = $2 AND member_id = $3 AND EXISTS (SELECT 1 FROM valid) \
         ) \
         INSERT INTO poll_responses (enterprise_id, poll_id, member_id, choice_index) \
         SELECT $1, $2, $3, $4 FROM valid",
    )
    .bind(enterprise_id)
    .bind(poll_id)
    .bind(member_id)
    .bind(choice_index)
    .bind(room_id)
    .execute(tx.conn())
    .await
    .map_err(DbError::from)?;

    // Zero rows means `valid` was empty: a poll from another room, a closed one, or a choice index
    // outside its options. The caller's `NotFound` is the same answer the three-statement version
    // gave, arrived at without a second round trip to ask for it.
    if recorded.rows_affected() == 0 {
        return Err(DbError::NotFound);
    }

    Ok(())
}

/// A poll with its tally.
pub async fn results(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    poll_id: Uuid,
    asking_member: Uuid,
) -> Result<PollResults, DbError> {
    let poll = get(tx, room_id, poll_id).await?;

    let counted: Vec<(i32, i64)> = sqlx::query_as(
        "SELECT choice_index, count(*) FROM poll_responses \
         WHERE poll_id = $1 GROUP BY choice_index",
    )
    .bind(poll_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)?;

    let own_choice: Option<i32> = sqlx::query_scalar(
        "SELECT choice_index FROM poll_responses WHERE poll_id = $1 AND member_id = $2",
    )
    .bind(poll_id)
    .bind(asking_member)
    .fetch_optional(tx.conn())
    .await
    .map_err(DbError::from)?;

    // A choice nobody picked must still appear as zero, so the client can render the bar
    // without inferring absent keys.
    let width = poll.choices.as_array().map_or(0, Vec::len);
    let mut tally = vec![0_i64; width];
    for (index, count) in counted {
        if let Some(slot) = usize::try_from(index).ok().and_then(|i| tally.get_mut(i)) {
            *slot = count;
        }
    }
    let total = tally.iter().sum();

    Ok(PollResults {
        poll,
        tally,
        total,
        own_choice,
    })
}

// ── Pre-Canned Polls ────────────────────────────────────────────────────────
//
// The reference's "Save To Canned" list: reusable poll templates a presenter composes once and
// sends repeatedly. One shared list per room, insertion-ordered, any staff member may add or
// remove any entry - `saved_polls` records why the table exists rather than a JSON column.
//
// Deliberately NOT a `Poll`: a template has no state, no close time, and no responses. Reusing
// that struct would mean four columns that are meaningless here and a `poll_responses` foreign
// key that could accrue votes against something never sent.

#[derive(Debug, Clone, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SavedPoll {
    pub id: Uuid,
    /// `q` on the wire: the shipped client stores `{q, choices}` and the room's own DTO already
    /// renames `question` to `q`, so the field keeps that name across the boundary.
    ///
    /// The three fields here are the whole contract. `PollPanel.svelte` reads exactly `poll.id`
    /// (the `{#each}` key and the delete argument), `poll.q` and `poll.choices`; `created_at`
    /// orders the list server-side and no client renders it, so it does not go on the wire.
    #[serde(rename = "q")]
    pub question: String,
    pub choices: serde_json::Value,
}

/// Insertion order, which is what the reference's array preserves. The `id` tiebreak keeps the
/// ordering total when two inserts land in the same microsecond - without it the list can
/// reorder between reads, and a client rendering by position would appear to shuffle itself.
pub async fn list_saved(tx: &mut TenantTx<'_>, room_id: Uuid) -> Result<Vec<SavedPoll>, DbError> {
    sqlx::query_as(
        "SELECT id, question, choices \
         FROM saved_polls WHERE room_id = $1 ORDER BY created_at ASC, id ASC",
    )
    .bind(room_id)
    .fetch_all(tx.conn())
    .await
    .map_err(DbError::from)
}

/// `author_user_id` is a **`users.id`**, matching [`create`] and `saved_polls_created_by_fk`.
pub async fn create_saved(
    tx: &mut TenantTx<'_>,
    enterprise_id: Uuid,
    room_id: Uuid,
    author_user_id: Uuid,
    question: &str,
    choices: &[String],
) -> Result<SavedPoll, DbError> {
    sqlx::query_as(
        "INSERT INTO saved_polls (enterprise_id, room_id, created_by_id, question, choices) \
         VALUES ($1, $2, $3, $4, $5) \
         RETURNING id, question, choices",
    )
    .bind(enterprise_id)
    .bind(room_id)
    .bind(author_user_id)
    .bind(question)
    .bind(sqlx::types::Json(choices))
    .fetch_one(tx.conn())
    .await
    .map_err(DbError::from)
}

/// Deletes by id, not by list position.
///
/// The reference splices an array index and rewrites the whole list, which loses a poll nobody
/// asked to remove when two presenters delete at once - each index is computed against a list the
/// other has already changed. Addressing the row by id makes concurrent deletes commute.
pub async fn delete_saved(
    tx: &mut TenantTx<'_>,
    room_id: Uuid,
    saved_poll_id: Uuid,
) -> Result<(), DbError> {
    let affected = sqlx::query("DELETE FROM saved_polls WHERE id = $1 AND room_id = $2")
        .bind(saved_poll_id)
        .bind(room_id)
        .execute(tx.conn())
        .await
        .map_err(DbError::from)?
        .rows_affected();

    (affected > 0).then_some(()).ok_or(DbError::NotFound)
}
