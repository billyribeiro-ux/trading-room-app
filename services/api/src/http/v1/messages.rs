//! Reading and posting chat messages.
//!
//! `sendMessage` was the busiest of the SvelteKit form actions. Two things it did not do,
//! which are the reason this module exists: it read the whole room's history with no
//! pagination, and it took the author's display name and presenter flag from the *request*.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;
use crate::db::repo::{event, message, room};
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    /// Opaque; the value from a previous page's `nextCursor`.
    pub cursor: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RoomChannelPath {
    pub room_id: Uuid,
    pub channel_id: Uuid,
}

/// One page of history, newest first.
///
/// An unparseable or stale `cursor` is treated as "from the beginning" rather than as a 400:
/// cursors end up in bookmarks and outlive deploys, and refusing one strands the client with
/// no way to recover but to guess.
pub async fn list(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<RoomChannelPath>,
    Query(query): Query<ListQuery>,
) -> Result<Json<room::Page<room::Message>>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::AccessArchives, now)?;

    let cursor = query.cursor.as_deref().and_then(room::Cursor::decode);
    let limit = query.limit.unwrap_or(limits::MESSAGE_PAGE_DEFAULT);

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    // The channel is re-read under the tenant GUC rather than trusted from the path: an id
    // from another tenant's room yields zero rows here, so it becomes a 404 instead of
    // reaching the message query as an accepted filter.
    message::assert_channel_in_room(&mut tx, path.channel_id, member.room_id).await?;
    let page = room::messages(&mut tx, member.room_id, path.channel_id, cursor, limit).await?;
    tx.commit().await?;

    Ok(Json(page))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendRequest {
    pub body: String,
    /// Present when this is a public reply to another message.
    pub reply_to_id: Option<Uuid>,
}

/// Posts a message.
///
/// Everything identifying the author - `user_id`, `member_id`, `display_name`, the presenter
/// flag, the trial flag - comes from the resolved membership, never from the request body.
/// The old action took `displayName` from the form, so a caller could post as anybody.
pub async fn send(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<RoomChannelPath>,
    Json(request): Json<SendRequest>,
) -> Result<Json<room::Message>, ApiError> {
    let now = OffsetDateTime::now_utc();

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

    // A reply is a different capability from a post, and the schema says so by giving
    // `can_public_reply` its own column.
    member.require(Capability::Post, now)?;
    if request.reply_to_id.is_some() {
        member.require(Capability::PublicReply, now)?;
    }

    // Charged after the capability checks, so a member who is muted or over their trial does
    // not also burn their posting quota being refused.
    if state
        .limiters
        .message_member
        .check(&member.member_id.to_string())
        .is_err()
    {
        return Err(ApiError::RateLimited);
    }

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    message::assert_channel_in_room(&mut tx, path.channel_id, member.room_id).await?;

    let posted = message::insert(
        &mut tx,
        message::NewMessage {
            room_id: member.room_id,
            channel_id: path.channel_id,
            enterprise_id: member.enterprise_id,
            user_id: member.user.user_id,
            member_id: member.member_id,
            display_name: &member.user.display_name,
            body,
            reply_to_id: request.reply_to_id,
            is_presenter_message: member.capabilities.role.is_staff(),
            is_trial_author: member.capabilities.flags().is_trial,
            now,
        },
    )
    .await?;

    // The outbox write, in the SAME transaction as the message. This is the entire point of
    // `room_events`: publishing after COMMIT leaves a window in which the message is durable
    // and its event is not, and a crash inside that window loses the notification silently.
    // Here the two commit together or neither does.
    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "message.created",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::to_value(&posted).unwrap_or_else(|_| serde_json::json!({})),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;

    tx.commit().await?;

    // Only *after* the commit, and deliberately not part of it: this is the in-process
    // accelerator. If it never happens - a crash here, or a subscriber on another instance -
    // the event is still durable and every client picks it up on its next resume. Fan-out
    // failing must not fail the write that already succeeded.
    state.hub.publish(member.room_id, &event);

    Ok(Json(posted))
}
