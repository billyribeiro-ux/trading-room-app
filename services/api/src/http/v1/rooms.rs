//! Room overview and channel list.

use std::sync::Arc;

use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;
use crate::db::TenantCtx;
use crate::db::repo::room;
use crate::error::ApiError;
use crate::http::AppState;

/// What the caller may do, as the client needs to render it.
///
/// Sent as the *effective* set - suppressions already applied - so the UI never has to
/// reimplement the mute, trial and global-mute rules to decide whether to grey out a button.
/// Two implementations of the same policy is how a client ends up offering an action the
/// server then refuses.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MembershipView {
    pub member_id: uuid::Uuid,
    pub role: &'static str,
    pub capabilities: Vec<&'static str>,
    pub is_muted: bool,
    #[serde(with = "time::serde::rfc3339::option")]
    pub muted_until: Option<OffsetDateTime>,
    pub is_trial: bool,
    #[serde(with = "time::serde::rfc3339::option")]
    pub trial_expires_at: Option<OffsetDateTime>,
    pub hide_personal_info: bool,
}

impl MembershipView {
    fn of(member: &RoomMember, now: OffsetDateTime) -> Self {
        let flags = member.capabilities.flags();
        Self {
            member_id: member.member_id,
            role: member.capabilities.role.as_str(),
            capabilities: member
                .capabilities
                .effective(now)
                .iter()
                .map(Capability::wire_name)
                .collect(),
            is_muted: flags.muted_at(now),
            muted_until: flags.muted_until,
            is_trial: flags.is_trial,
            trial_expires_at: flags.trial_expires_at,
            hide_personal_info: flags.hide_personal_info,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverviewResponse {
    pub room: room::Overview,
    pub channels: Vec<room::Channel>,
    pub membership: MembershipView,
}

/// The room, its channels and the caller's own standing - one round trip.
///
/// Bundled because a client cannot usefully render any one of them alone, and three requests
/// would mean three membership resolutions for a single screen.
pub async fn overview(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<OverviewResponse>, ApiError> {
    let now = OffsetDateTime::now_utc();

    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let room = room::overview(&mut tx, member.room_id).await?;
    let channels = room::channels(&mut tx, member.room_id).await?;
    tx.commit().await?;

    Ok(Json(OverviewResponse {
        room,
        channels,
        membership: MembershipView::of(&member, now),
    }))
}

/// Every room the caller is a member of.
///
/// Takes [`CurrentUser`], not `RoomMember`: this is the call a client makes *before* it knows a
/// room id, so requiring one would be circular. It reveals only the caller's own memberships -
/// strictly less than they learn by opening any one of those rooms.
pub async fn mine(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
) -> Result<Json<Vec<crate::db::Membership>>, ApiError> {
    Ok(Json(state.db.list_memberships(user.user_id).await?))
}

pub async fn channels(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<Vec<room::Channel>>, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;
    let channels = room::channels(&mut tx, member.room_id).await?;
    tx.commit().await?;
    Ok(Json(channels))
}

#[derive(Debug, Deserialize)]
pub struct AccountPath {
    pub enterprise_id: uuid::Uuid,
}

#[derive(Debug, Deserialize)]
pub struct AccountRoomPath {
    pub enterprise_id: uuid::Uuid,
    pub room_id: uuid::Uuid,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateAccountRoomRequest {
    pub request_id: uuid::Uuid,
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ArchiveAccountRoomRequest {
    pub archived: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRoomSettingsResponse {
    pub room_id: uuid::Uuid,
    pub revision: i64,
    pub settings: Map<String, Value>,
}

impl From<room::SettingsSnapshot> for AccountRoomSettingsResponse {
    fn from(snapshot: room::SettingsSnapshot) -> Self {
        Self {
            room_id: snapshot.room_id,
            revision: snapshot.revision,
            settings: snapshot.settings,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PatchAccountRoomSettingsRequest {
    pub request_id: uuid::Uuid,
    pub expected_revision: i64,
    pub base: Map<String, Value>,
    pub updates: Map<String, Value>,
}

fn settings_mutation_error(error: room::SettingsMutationError) -> ApiError {
    match error {
        room::SettingsMutationError::Database(error) => error.into(),
        room::SettingsMutationError::RequestMismatch => {
            ApiError::Invalid("requestId was already used for a different settings mutation".into())
        }
        room::SettingsMutationError::Conflict => ApiError::Conflict,
        room::SettingsMutationError::Validation(error) => ApiError::Invalid(error.to_string()),
        invalid @ room::SettingsMutationError::InvalidStoredDocument => ApiError::internal(invalid),
    }
}

fn mutation_digest(
    actor_user_id: uuid::Uuid,
    room_id: uuid::Uuid,
    request: &PatchAccountRoomSettingsRequest,
) -> Result<String, ApiError> {
    let encoded =
        serde_json::to_vec(&(actor_user_id, room_id, request)).map_err(ApiError::internal)?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

async fn require_account_admin(
    tx: &mut crate::db::TenantTx<'_>,
    user_id: uuid::Uuid,
) -> Result<(), ApiError> {
    if !room::lock_account_admin(tx, user_id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(())
}

/// Canonical account room list. Account authority is locked and checked inside the same
/// server-context tenant transaction that RLS confines to this exact enterprise.
pub async fn account_rooms(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
    Path(path): Path<AccountPath>,
) -> Result<Json<Vec<room::AccountRoom>>, ApiError> {
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    require_account_admin(&mut tx, user.user_id).await?;
    let rooms = room::list_for_account(&mut tx).await?;
    tx.commit().await?;
    Ok(Json(rooms))
}

/// Creates one complete room. `requestId` makes an uncertain transport retry return the original
/// room; reusing it with another name or identity is rejected instead of silently changing data.
pub async fn create_account_room(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
    Path(path): Path<AccountPath>,
    payload: Result<Json<CreateAccountRoomRequest>, JsonRejection>,
) -> Result<Json<room::AccountRoom>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid room creation request".into()))?;
    let name = request.name.trim();
    if name.is_empty() || name.len() > crate::limits::ROOM_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a room name must be 1 to {} bytes",
            crate::limits::ROOM_NAME_MAX_BYTES
        )));
    }

    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    require_account_admin(&mut tx, user.user_id).await?;
    let outcome = room::create_for_account(
        &mut tx,
        user.user_id,
        request.request_id,
        name,
        OffsetDateTime::now_utc(),
    )
    .await?;
    if outcome.replayed && (outcome.stored_name != name || outcome.stored_owner_id != user.user_id)
    {
        return Err(ApiError::Invalid(
            "requestId was already used for a different room creation".into(),
        ));
    }
    if !outcome.replayed {
        crate::db::repo::moderation::audit(
            &mut tx,
            crate::db::repo::moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: outcome.room.id,
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: "room.created",
                event_detail: "account administrator created a room",
                target_type: Some("room"),
                target_id: Some(outcome.room.id),
                metadata: serde_json::json!({ "requestId": request.request_id }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(outcome.room))
}

/// Archives or restores one room using an absolute target state. Cross-tenant ids are indistinct
/// from absent ids under forced RLS and therefore return the same 404.
pub async fn set_account_room_archived(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
    Path(path): Path<AccountRoomPath>,
    payload: Result<Json<ArchiveAccountRoomRequest>, JsonRejection>,
) -> Result<Json<room::AccountRoom>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid room archive request".into()))?;
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    require_account_admin(&mut tx, user.user_id).await?;
    let outcome = room::set_archived(
        &mut tx,
        path.room_id,
        request.archived,
        OffsetDateTime::now_utc(),
    )
    .await?;
    if outcome.changed {
        crate::db::repo::moderation::audit(
            &mut tx,
            crate::db::repo::moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: path.room_id,
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: if request.archived {
                    "room.archived"
                } else {
                    "room.restored"
                },
                event_detail: if request.archived {
                    "account administrator archived a room"
                } else {
                    "account administrator restored a room"
                },
                target_type: Some("room"),
                target_id: Some(path.room_id),
                metadata: serde_json::json!({ "archived": request.archived }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(outcome.room))
}

/// Complete canonical settings for one administered room, with the revision required by writes.
pub async fn account_room_settings(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
    Path(path): Path<AccountRoomPath>,
) -> Result<Json<AccountRoomSettingsResponse>, ApiError> {
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    require_account_admin(&mut tx, user.user_id).await?;
    let snapshot = room::settings_for_account(&mut tx, path.room_id)
        .await
        .map_err(settings_mutation_error)?;
    tx.commit().await?;
    Ok(Json(snapshot.into()))
}

/// Atomically changes a set of room settings. Stale edits merge only when the same fields have
/// not changed, and a request id can be retried safely after an uncertain transport result.
pub async fn patch_account_room_settings(
    State(state): State<Arc<AppState>>,
    user: crate::auth::extract::CurrentUser,
    Path(path): Path<AccountRoomPath>,
    payload: Result<Json<PatchAccountRoomSettingsRequest>, JsonRejection>,
) -> Result<Json<AccountRoomSettingsResponse>, ApiError> {
    let Json(mut request) =
        payload.map_err(|_| ApiError::Invalid("invalid room settings request".into()))?;
    if request.expected_revision < 0 || request.updates.is_empty() {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative and updates must not be empty".into(),
        ));
    }
    if request.base.len() != request.updates.len()
        || request
            .base
            .keys()
            .any(|name| !request.updates.contains_key(name))
    {
        return Err(ApiError::Invalid(
            "base must contain exactly the fields named by updates".into(),
        ));
    }
    crate::room_settings::validate_patch(&request.base)
        .and_then(|()| crate::room_settings::validate_updates(&request.updates))
        .map_err(|error| ApiError::Invalid(error.to_string()))?;
    if let Some(Value::String(title)) = request.updates.get_mut("name") {
        *title = title.trim().to_owned();
    }
    let digest = mutation_digest(user.user_id, path.room_id, &request)?;
    let now = OffsetDateTime::now_utc();

    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    require_account_admin(&mut tx, user.user_id).await?;
    let outcome = room::patch_settings_for_account(
        &mut tx,
        user.user_id,
        path.room_id,
        request.request_id,
        &digest,
        request.expected_revision,
        &request.base,
        &request.updates,
        now,
    )
    .await
    .map_err(settings_mutation_error)?;
    if outcome.changed {
        crate::db::repo::moderation::audit(
            &mut tx,
            crate::db::repo::moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: path.room_id,
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: "room.settings.updated",
                event_detail: "account administrator updated room settings",
                target_type: Some("room"),
                target_id: Some(path.room_id),
                metadata: serde_json::json!({
                    "requestId": request.request_id,
                    "settingNames": request.updates.keys().collect::<Vec<_>>(),
                    "revision": outcome.snapshot.revision
                }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(outcome.snapshot.into()))
}
