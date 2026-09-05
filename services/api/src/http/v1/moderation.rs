//! The `messageAction` family, plus `editUsername`.
//!
//! The old SvelteKit handler was one 200-line action switching on a code. Splitting it into
//! routes is not tidiness: each arm has a *different* authorization rule, and a single handler
//! is where one arm's check silently becomes the check for all of them.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;
use crate::db::repo::{event, moderation};
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Deserialize)]
pub struct MessagePath {
    pub room_id: Uuid,
    pub message_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct MemberPath {
    pub room_id: Uuid,
    pub member_id: Uuid,
}

/// Deletes a message.
///
/// Two different rules meet here, which is exactly why the author is read first: deleting your
/// own message needs `can_delete_own_message`; deleting anybody else's is a moderator act.
/// Collapsing them would either let a member delete the room's alerts or stop them retracting
/// their own typo.
pub async fn delete_message(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MessagePath>,
) -> Result<axum::http::StatusCode, ApiError> {
    let now = OffsetDateTime::now_utc();
    let mut tx = state.db.begin_tenant(member.ctx()).await?;

    let author = moderation::message_author(&mut tx, member.room_id, path.message_id).await?;
    let own = author == member.member_id;

    if own {
        member.require(Capability::DeleteOwnMessage, now)?;
    } else if !member.capabilities.role.is_staff() {
        return Err(ApiError::Forbidden);
    }

    moderation::delete_message(
        &mut tx,
        member.room_id,
        path.message_id,
        member.user.user_id,
        now,
    )
    .await?;

    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: member.enterprise_id,
            room_id: Some(member.room_id),
            actor_user_id: member.user.user_id,
            actor_name: &member.user.display_name,
            event_name: "message.deleted",
            event_detail: if own {
                "author deleted their own message"
            } else {
                "moderator deleted a message"
            },
            target_type: Some("message"),
            target_id: Some(path.message_id),
            metadata: serde_json::json!({ "authorMemberId": author, "own": own }),
        },
    )
    .await?;

    let deleted = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "message.deleted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "id": path.message_id }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &deleted);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct EditRequest {
    pub body: String,
}

/// Edits one's own message. There is no route for editing anybody else's, deliberately -
/// silently rewriting what someone said is not a moderation power this API grants.
pub async fn edit_message(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MessagePath>,
    Json(request): Json<EditRequest>,
) -> Result<axum::http::StatusCode, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditOwnMessage, now)?;

    let body = request.body.trim();
    if body.is_empty() {
        return Err(ApiError::Invalid("a message cannot be empty".into()));
    }
    if body.len() > limits::MESSAGE_BODY_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a message may be at most {} bytes",
            limits::MESSAGE_BODY_MAX_BYTES
        )));
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    // `member_id` is in the WHERE, so a message that is not this member's is simply not found.
    moderation::edit_own_message(
        &mut tx,
        member.room_id,
        path.message_id,
        member.member_id,
        body,
        now,
    )
    .await?;

    let edited = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "message.edited",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "id": path.message_id, "body": body }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &edited);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MuteRequest {
    /// Absent means indefinite. The old action's `mute24` is `hours: 24`.
    pub hours: Option<i64>,
}

/// `messageAction:mute24` and its siblings - a moderator silencing a member.
pub async fn mute_member(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MemberPath>,
    Json(request): Json<MuteRequest>,
) -> Result<axum::http::StatusCode, ApiError> {
    let now = OffsetDateTime::now_utc();
    require_moderator(&member)?;

    // A moderator muting themselves is almost certainly a mis-click, and it would take the
    // room's moderation offline. Refuse rather than obey.
    if path.member_id == member.member_id {
        return Err(ApiError::Invalid("you cannot mute yourself".into()));
    }

    let until = match request.hours {
        None => None,
        Some(hours) if (1..=limits::MAX_MUTE_HOURS).contains(&hours) => {
            Some(now + Duration::hours(hours))
        }
        Some(_) => {
            return Err(ApiError::Invalid(format!(
                "a timed mute must be between 1 and {} hours; omit it for an indefinite mute",
                limits::MAX_MUTE_HOURS
            )));
        }
    };

    apply_mute(&state, &member, path.member_id, true, until, now).await
}

pub async fn unmute_member(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MemberPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    require_moderator(&member)?;
    let now = OffsetDateTime::now_utc();
    apply_mute(&state, &member, path.member_id, false, None, now).await
}

async fn apply_mute(
    state: &Arc<AppState>,
    member: &RoomMember,
    target: Uuid,
    muted: bool,
    until: Option<OffsetDateTime>,
    now: OffsetDateTime,
) -> Result<axum::http::StatusCode, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;

    moderation::set_member_mute(&mut tx, member.room_id, target, muted, until, now).await?;

    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: member.enterprise_id,
            room_id: Some(member.room_id),
            actor_user_id: member.user.user_id,
            actor_name: &member.user.display_name,
            event_name: if muted {
                "member.muted"
            } else {
                "member.unmuted"
            },
            event_detail: if muted {
                "a moderator muted a member"
            } else {
                "a moderator unmuted a member"
            },
            target_type: Some("room_member"),
            target_id: Some(target),
            metadata: serde_json::json!({ "until": until.map(|u| u.unix_timestamp()) }),
        },
    )
    .await?;

    // Addressed to the muted member: the room does not need to be told who was silenced, but
    // the member does, or their next post fails with no explanation.
    let notice = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: if muted {
                "member.muted"
            } else {
                "member.unmuted"
            },
            scope: event::Scope::Member,
            audience_member_id: Some(target),
            payload: serde_json::json!({ "until": until.map(|u| u.unix_timestamp()) }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;

    tx.commit().await?;
    state.hub.publish(member.room_id, &notice);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// A personal mute - one member choosing not to see another. Not moderation, so it needs no
/// role: it changes nothing for anybody else.
pub async fn mute_personally(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MemberPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    moderation::mute_personally(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        member.member_id,
        path.member_id,
    )
    .await?;
    tx.commit().await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub async fn unmute_personally(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MemberPath>,
) -> Result<axum::http::StatusCode, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    moderation::unmute_personally(&mut tx, member.room_id, member.member_id, path.member_id)
        .await?;
    tx.commit().await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub async fn muted_list(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<Uuid>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let muted = moderation::muted_by(&mut tx, member.room_id, member.member_id).await?;
    tx.commit().await?;
    Ok(Json(muted))
}

#[derive(Debug, Deserialize)]
pub struct ReactRequest {
    pub emoji: String,
}

pub async fn react(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MessagePath>,
    Json(request): Json<ReactRequest>,
) -> Result<axum::http::StatusCode, ApiError> {
    let emoji = request.emoji.trim();
    // `message_reactions_emoji_not_empty` requires a non-empty string; the ceiling stops the
    // column being used as a text store, since any real emoji is a handful of bytes.
    if emoji.is_empty() || emoji.len() > limits::REACTION_MAX_BYTES {
        return Err(ApiError::Invalid("that is not an emoji".into()));
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    moderation::react(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        path.message_id,
        member.member_id,
        emoji,
    )
    .await?;

    let reacted = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "message.reacted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "messageId": path.message_id, "emoji": emoji }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &reacted);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub async fn unreact(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<MessagePath>,
    Json(request): Json<ReactRequest>,
) -> Result<axum::http::StatusCode, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    moderation::unreact(
        &mut tx,
        member.room_id,
        path.message_id,
        member.member_id,
        request.emoji.trim(),
    )
    .await?;
    tx.commit().await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRequest {
    pub display_name: String,
}

/// `editUsername`.
///
/// # The escalation this route does not have
///
/// A previous audit found the SvelteKit `editUsername` able to change *another* user's record.
/// There is no target in this route's path: the member id comes from the resolved membership,
/// so the only record reachable is the caller's own, in the room they are a member of. It
/// writes `room_members.display_name` - a per-room label - and cannot touch global identity in
/// `users` at all.
pub async fn rename_self(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Json(request): Json<RenameRequest>,
) -> Result<axum::http::StatusCode, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditUsername, now)?;

    let name = request.display_name.trim();
    if name.is_empty() {
        return Err(ApiError::Invalid("a display name cannot be empty".into()));
    }
    if name.len() > limits::DISPLAY_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a display name may be at most {} bytes",
            limits::DISPLAY_NAME_MAX_BYTES
        )));
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    moderation::rename_member(&mut tx, member.room_id, member.member_id, name, now).await?;

    let renamed = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "member.renamed",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "memberId": member.member_id, "displayName": name }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &renamed);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// Muting, unmuting and deleting others are owner/moderator acts.
///
/// Presenters are staff for the purpose of `global_mute_non_staff` - they may speak while the
/// room is muted - but that is not the same as being able to silence somebody else. Stated
/// once, here, rather than as `is_staff()` at four call sites that would each be a slightly
/// different rule.
fn require_moderator(member: &RoomMember) -> Result<(), ApiError> {
    use crate::capability::MemberRole;
    if matches!(
        member.capabilities.role,
        MemberRole::Owner | MemberRole::Moderator
    ) {
        return Ok(());
    }
    Err(ApiError::Forbidden)
}
