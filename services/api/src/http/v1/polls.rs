//! Polls: `sendPoll`, `sendPollAnswer`, `pollDone`, and the Pre-Canned list.
//!
//! Creating, deleting and closing a poll are staff actions; answering one is what every member
//! may do. The schema has no `can_*` column for polls, so the requirement is the role - and
//! that is stated here once rather than re-derived per handler.
//!
//! ## Two different things called "poll"
//!
//! The reference keeps them apart and so does this module:
//!
//! * a **sent** poll is live - it has state, a close time, and responses. `sendPoll()` in the
//!   client, `create`/`close`/`remove` here.
//! * a **saved** poll is a template - "Save To Canned", reusable, never answered.
//!   `savePollToStorage()` in the client, `list_saved`/`create_saved`/`remove_saved` here.
//!
//! This file previously labelled `create` as `savePoll` and `remove` as `deleteSavedPoll`. Both
//! were wrong: they operate on `polls`, which is the sent kind.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::db::repo::{event, poll};
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Deserialize)]
pub struct PollPath {
    pub room_id: Uuid,
    pub poll_id: Uuid,
}

/// Running a poll is a staff action.
///
/// `room_members` has 16 `can_*` columns and none of them is about polls, so inventing a
/// capability would mean inventing a column. The role is the honest requirement, and
/// `is_staff` is the same predicate `global_mute_non_staff` uses.
fn require_staff(member: &RoomMember) -> Result<(), ApiError> {
    if member.capabilities.role.is_staff() {
        return Ok(());
    }
    Err(ApiError::Forbidden)
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<poll::Poll>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let polls = poll::list(&mut tx, member.room_id).await?;
    tx.commit().await?;
    Ok(Json(polls))
}

#[derive(Debug, Deserialize)]
pub struct CreateRequest {
    pub question: String,
    pub choices: Vec<String>,
}

/// `sendPoll` - puts a live poll in front of the room.
pub async fn create(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Json(request): Json<CreateRequest>,
) -> Result<Json<poll::Poll>, ApiError> {
    require_staff(&member)?;

    let question = request.question.trim();
    if question.is_empty() {
        return Err(ApiError::Invalid("a poll needs a question".into()));
    }
    // Two is the minimum that makes a poll a poll; the ceiling bounds the tally vector, which
    // is allocated from this length.
    if request.choices.len() < 2 || request.choices.len() > limits::POLL_MAX_CHOICES {
        return Err(ApiError::Invalid(format!(
            "a poll needs between 2 and {} choices",
            limits::POLL_MAX_CHOICES
        )));
    }
    if request
        .choices
        .iter()
        .any(|choice| choice.trim().is_empty())
    {
        return Err(ApiError::Invalid("a poll choice cannot be empty".into()));
    }

    let choices: Vec<String> = request
        .choices
        .iter()
        .map(|choice| choice.trim().to_owned())
        .collect();

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let created = poll::create(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        member.user.user_id,
        question,
        &choices,
    )
    .await?;
    let event = append(&member, &mut tx, "poll.created", &created).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(created))
}

/// Deletes a **sent** poll and its responses. Not the Pre-Canned list; see `remove_saved`.
pub async fn remove(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<PollPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    require_staff(&member)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    poll::delete(&mut tx, member.room_id, path.poll_id).await?;
    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "poll.deleted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "id": path.poll_id }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// `pollDone` - closes the poll to further answers.
pub async fn close(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<PollPath>,
) -> Result<Json<poll::Poll>, ApiError> {
    require_staff(&member)?;
    let now = OffsetDateTime::now_utc();

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let closed = poll::close(&mut tx, member.room_id, path.poll_id, now).await?;
    let event = append(&member, &mut tx, "poll.closed", &closed).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(closed))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerRequest {
    pub choice_index: i32,
}

/// `sendPollAnswer`.
///
/// The member id comes from the resolved membership, so a caller cannot answer as somebody
/// else. Whether the poll is open, whether it belongs to this room and whether the index is a
/// real choice are all decided inside `poll::answer`'s statement rather than here.
pub async fn answer(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<PollPath>,
    Json(request): Json<AnswerRequest>,
) -> Result<Json<poll::PollResults>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;

    poll::answer(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        path.poll_id,
        member.member_id,
        request.choice_index,
    )
    .await?;

    let results = poll::results(&mut tx, member.room_id, path.poll_id, member.member_id).await?;

    // Staff-scoped: a live tally shown to voters steers the vote. Whoever is running the poll
    // decides when to reveal it, and the answering member gets their own choice back in the
    // reply regardless.
    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "poll.answered",
            scope: event::Scope::Staff,
            audience_member_id: None,
            payload: serde_json::json!({
                "pollId": path.poll_id,
                "total": results.total,
                "tally": results.tally,
            }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(results))
}

/// The tally.
pub async fn results(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<PollPath>,
) -> Result<Json<poll::PollResults>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let results = poll::results(&mut tx, member.room_id, path.poll_id, member.member_id).await?;
    tx.commit().await?;
    Ok(Json(results))
}

async fn append(
    member: &RoomMember,
    tx: &mut crate::db::TenantTx<'_>,
    kind: &str,
    poll: &poll::Poll,
) -> Result<event::Event, ApiError> {
    Ok(event::append(
        tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind,
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::to_value(poll).unwrap_or_else(|_| serde_json::json!({})),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?)
}

// ── Pre-Canned Polls ────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SavedPollPath {
    pub room_id: Uuid,
    pub saved_poll_id: Uuid,
}

/// The Pre-Canned list. Staff-only, including the read - and that last part is a deliberate
/// tightening, not something the evidence forces.
///
/// The room hands `savedPolls: storedPolls` to **every** role from its page load, gated by
/// nothing, and only avoids showing them because a member never opens the poll panel. That means
/// a member's browser currently receives every unsent draft a presenter has written. Invisible is
/// not private, so this endpoint refuses them instead.
///
/// The consequence, for whoever rewires the room off `+page.server.ts`: a member must be given an
/// empty list rather than a call to this route, or their page load will 403.
pub async fn list_saved(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<poll::SavedPoll>>, ApiError> {
    require_staff(&member)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let saved = poll::list_saved(&mut tx, member.room_id).await?;
    tx.commit().await?;
    Ok(Json(saved))
}

/// `savePollToStorage` - "Save To Canned".
///
/// ## Why this does NOT validate like `create`
///
/// A saved poll is a draft, not a poll. The Pre-Canned tab is explicitly a scratchpad - "You can
/// store polls you use often here" - and `loadSavedPoll` puts the entry back in the compose box
/// to be finished before it is ever sent. Refusing a half-written draft would refuse the one
/// thing the feature is for, and `create` still holds the line at send time.
///
/// That is also what both existing implementations do, and this endpoint replaces them:
///
/// * the shipped client saves `{q: this.pollQuestion, choices: this.pollChoices.slice(0)}` with
///   no checks at all - `pollQuestion` is `null` until typed into, so a blank draft is storable;
/// * the room's `savePoll` action takes `String(data.get('q') ?? '')` and rejects only what is
///   not a JSON array of strings, so `''` and `[]` are both accepted today.
///
/// Nothing is trimmed for the same reason: neither of the above trims, `addChoice` pushes
/// `"" + pollChoice` verbatim, and Load hands the text straight back to the presenter. Trimming
/// would silently return something other than what they typed.
///
/// The one bound kept is the choice ceiling, which is not a product rule but a resource one -
/// the same limit `create` enforces, so a draft that could never be sent cannot be stored either.
pub async fn create_saved(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Json(request): Json<CreateRequest>,
) -> Result<Json<poll::SavedPoll>, ApiError> {
    require_staff(&member)?;

    if request.choices.len() > limits::POLL_MAX_CHOICES {
        return Err(ApiError::Invalid(format!(
            "a poll takes at most {} choices",
            limits::POLL_MAX_CHOICES
        )));
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let saved = poll::create_saved(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        member.user.user_id,
        &request.question,
        &request.choices,
    )
    .await?;
    tx.commit().await?;

    // No room event. A template is not visible to the room, and publishing one would tell every
    // connected member that a presenter is drafting something.
    Ok(Json(saved))
}

/// `deleteSavedPoll` - removes one entry from the Pre-Canned list.
pub async fn remove_saved(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<SavedPollPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    require_staff(&member)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    poll::delete_saved(&mut tx, member.room_id, path.saved_poll_id).await?;
    tx.commit().await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}
