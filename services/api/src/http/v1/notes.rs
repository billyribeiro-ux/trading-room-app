//! Session notes: the six `*SessionNoteTab` / note actions.
//!
//! All six sit behind [`Capability::EditNotes`] except the read, which is part of the room and
//! needs only membership.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use serde::Deserialize;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;
use crate::db::repo::{event, note};
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Deserialize)]
pub struct NotePath {
    pub room_id: Uuid,
    pub note_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct VersionPath {
    pub room_id: Uuid,
    pub note_id: Uuid,
    pub version_id: Uuid,
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<note::Note>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let notes = note::list(&mut tx, member.room_id).await?;
    tx.commit().await?;
    Ok(Json(notes))
}

#[derive(Debug, Deserialize)]
pub struct CreateRequest {
    pub name: String,
}

/// `newSessionNoteTab`.
pub async fn create(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Json(request): Json<CreateRequest>,
) -> Result<Json<note::Note>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;
    let name = validated_name(&request.name)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let created = note::create(
        &mut tx,
        member.enterprise_id,
        member.room_id,
        name,
        member.user.user_id,
    )
    .await?;
    let event = publish(&state, &member, &mut tx, "note.created", &created).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(created))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub content_html: String,
}

/// `saveSessionNote`.
pub async fn save(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<NotePath>,
    Json(request): Json<SaveRequest>,
) -> Result<Json<note::Note>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;

    if request.content_html.len() > limits::NOTE_BODY_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a note may be at most {} bytes",
            limits::NOTE_BODY_MAX_BYTES
        )));
    }

    // Sanitised before it is stored, not before it is rendered: the column then only ever holds
    // safe markup, so a reader written later inherits that without having to know.
    let content = crate::html::sanitise(&request.content_html);

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let saved = note::save(
        &mut tx,
        member.room_id,
        path.note_id,
        &content,
        member.user.user_id,
        now,
    )
    .await?;
    let event = publish(&state, &member, &mut tx, "note.saved", &saved).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(saved))
}

/// The note's revision history.
pub async fn versions(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<NotePath>,
) -> Result<Json<Vec<note::NoteVersion>>, ApiError> {
    let now = OffsetDateTime::now_utc();
    // History is not a public read: it is the content of every past revision, so it needs the
    // same capability as editing rather than mere membership.
    member.require(Capability::EditNotes, now)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let versions = note::versions(
        &mut tx,
        member.room_id,
        path.note_id,
        limits::NOTE_VERSION_PAGE_MAX,
    )
    .await?;
    tx.commit().await?;
    Ok(Json(versions))
}

/// `restoreNoteVersion`.
///
/// The version, its note and the room are resolved in one join inside `note::restore` - a
/// previous audit found this path accepting a version id belonging to another room's note.
pub async fn restore(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<VersionPath>,
) -> Result<Json<note::Note>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let restored = note::restore(
        &mut tx,
        member.room_id,
        path.note_id,
        path.version_id,
        member.user.user_id,
        now,
    )
    .await?;
    let event = publish(&state, &member, &mut tx, "note.saved", &restored).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(restored))
}

/// `renameSessionNoteTab`.
pub async fn rename(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<NotePath>,
    Json(request): Json<CreateRequest>,
) -> Result<Json<note::Note>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;
    let name = validated_name(&request.name)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let renamed = note::rename(&mut tx, member.room_id, path.note_id, name, now).await?;
    let event = publish(&state, &member, &mut tx, "note.renamed", &renamed).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(renamed))
}

/// `deleteSessionNoteTab`.
pub async fn remove(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<NotePath>,
) -> Result<axum::http::StatusCode, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    note::soft_delete(
        &mut tx,
        member.room_id,
        path.note_id,
        member.user.user_id,
        now,
    )
    .await?;
    let event = event::append(
        &mut tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind: "note.deleted",
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::json!({ "id": path.note_id }),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(axum::http::StatusCode::NO_CONTENT)
}

/// `setWelcomeMatNoteTab`.
pub async fn set_welcome_mat(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
    Path(path): Path<NotePath>,
) -> Result<Json<note::Note>, ApiError> {
    let now = OffsetDateTime::now_utc();
    member.require(Capability::EditNotes, now)?;

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let updated = note::set_welcome_mat(&mut tx, member.room_id, path.note_id, now).await?;
    let event = publish(&state, &member, &mut tx, "note.welcomeMat", &updated).await?;
    tx.commit().await?;
    state.hub.publish(member.room_id, &event);

    Ok(Json(updated))
}

fn validated_name(name: &str) -> Result<&str, ApiError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(ApiError::Invalid("a note needs a name".into()));
    }
    if trimmed.len() > limits::NOTE_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a note name may be at most {} bytes",
            limits::NOTE_NAME_MAX_BYTES
        )));
    }
    Ok(trimmed)
}

/// Appends the outbox event for a note change, inside the caller's transaction.
async fn publish(
    _state: &Arc<AppState>,
    member: &RoomMember,
    tx: &mut crate::db::TenantTx<'_>,
    kind: &str,
    note: &note::Note,
) -> Result<event::Event, ApiError> {
    Ok(event::append(
        tx,
        event::NewEvent {
            enterprise_id: member.enterprise_id,
            room_id: member.room_id,
            kind,
            scope: event::Scope::Room,
            audience_member_id: None,
            payload: serde_json::to_value(note).unwrap_or_else(|_| serde_json::json!({})),
            origin_member_id: Some(member.member_id),
        },
    )
    .await?)
}
