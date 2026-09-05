//! Account-administrator room membership API.
//!
//! This boundary intentionally does not use `RoomMember`: authority to administer an account is
//! independent of a role inside any one room. The explicit enterprise relation is locked in the
//! same transaction as every protected read/write, closing revocation races.

use std::collections::HashSet;
use std::sync::Arc;

use axum::Json;
use axum::body::Bytes;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, header};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::CurrentUser;
use crate::db::TenantCtx;
use crate::db::repo::{managed_membership as membership, moderation, room};
use crate::error::ApiError;
use crate::http::AppState;

const MAX_TARGETS: usize = 1_000;
const DISPLAY_NAME_MAX_BYTES: usize = 160;
const NOTE_MAX_CHARS: usize = 500;

#[derive(Debug, Deserialize)]
pub struct MembershipPath {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct InviteMemberRequest {
    pub request_id: Uuid,
    pub email: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct MemberTarget {
    pub member_id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum ManageOperation {
    SetRole {
        role: String,
    },
    SetMuted {
        muted: bool,
    },
    SetBanned {
        banned: bool,
    },
    SetTrial {
        trial: bool,
    },
    SetHideUserCount {
        hidden: bool,
    },
    SetHidePersonalInfo {
        hidden: bool,
    },
    SetArchiveAccess {
        allowed: bool,
    },
    SetPmRestricted {
        restricted: bool,
    },
    SetApproval {
        status: String,
    },
    SetMobileApp {
        allowed: bool,
    },
    SetFileAccess {
        allowed: bool,
    },
    SetNote {
        note: Option<String>,
    },
    SetPermissions {
        #[serde(rename = "publishMic")]
        publish_mic: bool,
        #[serde(rename = "publishScreen")]
        publish_screen: bool,
        #[serde(rename = "publishCam")]
        publish_cam: bool,
        #[serde(rename = "useAdminChat")]
        use_admin_chat: bool,
        #[serde(rename = "editNotes")]
        edit_notes: bool,
    },
    FreshenLogin,
    Rename {
        display_name: String,
    },
    SetPassword {
        password: String,
    },
    Remove,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ManageMembersRequest {
    pub request_id: Uuid,
    pub targets: Vec<MemberTarget>,
    #[serde(default)]
    pub all_rooms: bool,
    pub operation: ManageOperation,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct RoomControlRequest {
    pub request_id: Uuid,
    pub actor_member_id: Uuid,
    pub target: MemberTarget,
    pub operation: RoomControlOperation,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum RoomControlOperation {
    SetMuted {
        muted: bool,
    },
    SetBanned {
        banned: bool,
    },
    SetPermissions {
        #[serde(rename = "publishMic")]
        publish_mic: bool,
        #[serde(rename = "publishScreen")]
        publish_screen: bool,
        #[serde(rename = "publishCam")]
        publish_cam: bool,
        #[serde(rename = "useAdminChat")]
        use_admin_chat: bool,
        #[serde(rename = "editNotes")]
        edit_notes: bool,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct MembershipMutationResponse {
    pub members: Vec<membership::ManagedMember>,
    pub removed_member_ids: Vec<Uuid>,
    pub changed: usize,
}

fn digest<T: Serialize>(
    actor_user_id: Uuid,
    path: &MembershipPath,
    request: &T,
) -> Result<String, ApiError> {
    let encoded = serde_json::to_vec(&(actor_user_id, path.enterprise_id, path.room_id, request))
        .map_err(ApiError::internal)?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

fn valid_email(value: &str) -> bool {
    if value.len() > 254 || value.bytes().any(|byte| byte.is_ascii_whitespace()) {
        return false;
    }
    let Some((local, domain)) = value.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && local.len() <= 64
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
}

fn normalized_name(value: &str) -> Result<String, ApiError> {
    let value = value.trim();
    if value.is_empty() || value.len() > DISPLAY_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a member name must be 1 to {DISPLAY_NAME_MAX_BYTES} bytes"
        )));
    }
    Ok(value.to_owned())
}

fn validate_targets(request: &ManageMembersRequest) -> Result<(), ApiError> {
    if request.targets.is_empty() || request.targets.len() > MAX_TARGETS {
        return Err(ApiError::Invalid(format!(
            "targets must contain 1 to {MAX_TARGETS} members"
        )));
    }
    let mut ids = HashSet::with_capacity(request.targets.len());
    for target in &request.targets {
        if target.expected_revision < 0 {
            return Err(ApiError::Invalid(
                "expectedRevision must be non-negative".into(),
            ));
        }
        if !ids.insert(target.member_id) {
            return Err(ApiError::Invalid("duplicate member target".into()));
        }
    }
    Ok(())
}

async fn operation(request: &ManageOperation) -> Result<membership::Mutation, ApiError> {
    Ok(match request {
        ManageOperation::SetRole { role } => {
            if !matches!(role.as_str(), "presenter" | "moderator" | "member") {
                return Err(ApiError::Invalid("unknown managed member role".into()));
            }
            membership::Mutation::Role(role.clone())
        }
        ManageOperation::SetMuted { muted } => membership::Mutation::Muted(*muted),
        ManageOperation::SetBanned { banned } => membership::Mutation::Banned(*banned),
        ManageOperation::SetTrial { trial } => membership::Mutation::Trial(*trial),
        ManageOperation::SetHideUserCount { hidden } => {
            membership::Mutation::HideUserCount(*hidden)
        }
        ManageOperation::SetHidePersonalInfo { hidden } => {
            membership::Mutation::HidePersonalInfo(*hidden)
        }
        ManageOperation::SetArchiveAccess { allowed } => {
            membership::Mutation::ArchiveAccess(*allowed)
        }
        ManageOperation::SetPmRestricted { restricted } => {
            membership::Mutation::PmRestricted(*restricted)
        }
        ManageOperation::SetApproval { status } => {
            if !matches!(status.as_str(), "approved" | "pending") {
                return Err(ApiError::Invalid("unknown approval status".into()));
            }
            membership::Mutation::Approval(status.clone())
        }
        ManageOperation::SetMobileApp { allowed } => membership::Mutation::MobileApp(*allowed),
        ManageOperation::SetFileAccess { allowed } => membership::Mutation::FileAccess(*allowed),
        ManageOperation::SetNote { note } => {
            let note = note
                .as_deref()
                .map(str::trim)
                .filter(|note| !note.is_empty())
                .map(str::to_owned);
            if note
                .as_ref()
                .is_some_and(|note| note.chars().count() > NOTE_MAX_CHARS)
            {
                return Err(ApiError::Invalid(format!(
                    "a member note is at most {NOTE_MAX_CHARS} characters"
                )));
            }
            membership::Mutation::Note(note)
        }
        ManageOperation::SetPermissions {
            publish_mic,
            publish_screen,
            publish_cam,
            use_admin_chat,
            edit_notes,
        } => membership::Mutation::Permissions(membership::Permissions {
            publish_mic: *publish_mic,
            publish_screen: *publish_screen,
            publish_cam: *publish_cam,
            use_admin_chat: *use_admin_chat,
            edit_notes: *edit_notes,
        }),
        ManageOperation::FreshenLogin => membership::Mutation::FreshenLogin,
        ManageOperation::Rename { display_name } => {
            membership::Mutation::Rename(normalized_name(display_name)?)
        }
        ManageOperation::SetPassword { password } => {
            if password.len() < 10 {
                return Err(ApiError::Invalid(
                    "a password must be at least 10 characters".into(),
                ));
            }
            membership::Mutation::PasswordHash(
                crate::auth::password::hash_password(password.clone()).await?,
            )
        }
        ManageOperation::Remove => membership::Mutation::Remove,
    })
}

fn mutation_error(error: membership::MutationError) -> ApiError {
    match error {
        membership::MutationError::Database(error) => error.into(),
        membership::MutationError::Conflict => ApiError::Conflict,
        membership::MutationError::OwnerProtected => {
            ApiError::Invalid("an owner membership cannot be changed".into())
        }
    }
}

fn controller_bearer(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::AUTHORIZATION)?
        .to_str()
        .ok()?
        .strip_prefix("Bearer ")
        .filter(|value| !value.is_empty())
}

fn room_control_mutation(operation: &RoomControlOperation) -> membership::Mutation {
    match operation {
        RoomControlOperation::SetMuted { muted } => membership::Mutation::Muted(*muted),
        RoomControlOperation::SetBanned { banned } => membership::Mutation::Banned(*banned),
        RoomControlOperation::SetPermissions {
            publish_mic,
            publish_screen,
            publish_cam,
            use_admin_chat,
            edit_notes,
        } => membership::Mutation::Permissions(membership::Permissions {
            publish_mic: *publish_mic,
            publish_screen: *publish_screen,
            publish_cam: *publish_cam,
            use_admin_chat: *use_admin_chat,
            edit_notes: *edit_notes,
        }),
    }
}

async fn account_tx<'a>(
    state: &'a AppState,
    user: &CurrentUser,
    path: &MembershipPath,
) -> Result<crate::db::TenantTx<'a>, ApiError> {
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    if !room::lock_account_admin(&mut tx, user.user_id).await? {
        return Err(ApiError::NotFound);
    }
    if !membership::room_exists(&mut tx, path.room_id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(tx)
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<MembershipPath>,
) -> Result<Json<Vec<membership::ManagedMember>>, ApiError> {
    let mut tx = account_tx(&state, &user, &path).await?;
    let members = membership::list(&mut tx, path.room_id).await?;
    tx.commit().await?;
    Ok(Json(members))
}

pub async fn invite(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<MembershipPath>,
    payload: Result<Json<InviteMemberRequest>, JsonRejection>,
) -> Result<Json<MembershipMutationResponse>, ApiError> {
    let Json(mut request) =
        payload.map_err(|_| ApiError::Invalid("invalid member invitation request".into()))?;
    request.email = request.email.trim().to_lowercase();
    request.display_name = normalized_name(&request.display_name)?;
    if !valid_email(&request.email) {
        return Err(ApiError::Invalid(
            "a valid email address is required".into(),
        ));
    }
    let request_digest = digest(user.user_id, &path, &request)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, &path).await?;
    membership::lock_request(&mut tx, request.request_id).await?;
    if let Some((stored_digest, stored_response)) =
        membership::replay(&mut tx, request.request_id).await?
    {
        if stored_digest != request_digest {
            return Err(ApiError::Invalid(
                "requestId was already used for a different membership mutation".into(),
            ));
        }
        let response = serde_json::from_value(stored_response).map_err(ApiError::internal)?;
        tx.commit().await?;
        return Ok(Json(response));
    }

    let member = membership::invite(
        &mut tx,
        path.room_id,
        &request.email,
        &request.display_name,
        now,
    )
    .await?;
    let response = MembershipMutationResponse {
        members: vec![member.clone()],
        removed_member_ids: Vec::new(),
        changed: 1,
    };
    let stored_response = serde_json::to_value(&response).map_err(ApiError::internal)?;
    membership::record(
        &mut tx,
        request.request_id,
        user.user_id,
        &request_digest,
        &stored_response,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: path.enterprise_id,
            room_id: Some(path.room_id),
            actor_user_id: user.user_id,
            actor_name: &user.display_name,
            event_name: "room.members.invited",
            event_detail: "account administrator invited a room member",
            target_type: Some("member"),
            target_id: Some(member.id),
            metadata: serde_json::json!({ "requestId": request.request_id }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn manage(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<MembershipPath>,
    payload: Result<Json<ManageMembersRequest>, JsonRejection>,
) -> Result<Json<MembershipMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid membership mutation request".into()))?;
    validate_targets(&request)?;
    let request_digest = digest(user.user_id, &path, &request)?;
    let mutation = operation(&request.operation).await?;
    if request.all_rooms && !mutation.allows_all_rooms() {
        return Err(ApiError::Invalid(
            "that membership operation cannot apply to all rooms".into(),
        ));
    }
    if mutation.requires_one_target() && request.targets.len() != 1 {
        return Err(ApiError::Invalid(
            "that membership operation requires exactly one target".into(),
        ));
    }
    let targets = request
        .targets
        .iter()
        .map(|target| membership::Target {
            id: target.member_id,
            expected_revision: target.expected_revision,
        })
        .collect::<Vec<_>>();
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, &path).await?;
    membership::lock_request(&mut tx, request.request_id).await?;
    if let Some((stored_digest, stored_response)) =
        membership::replay(&mut tx, request.request_id).await?
    {
        if stored_digest != request_digest {
            return Err(ApiError::Invalid(
                "requestId was already used for a different membership mutation".into(),
            ));
        }
        let response = serde_json::from_value(stored_response).map_err(ApiError::internal)?;
        tx.commit().await?;
        return Ok(Json(response));
    }

    let (members, removed_member_ids, changed) = membership::mutate(
        &mut tx,
        path.room_id,
        &targets,
        request.all_rooms,
        &mutation,
        now,
    )
    .await
    .map_err(mutation_error)?;
    let response = MembershipMutationResponse {
        members,
        removed_member_ids,
        changed,
    };
    let stored_response = serde_json::to_value(&response).map_err(ApiError::internal)?;
    membership::record(
        &mut tx,
        request.request_id,
        user.user_id,
        &request_digest,
        &stored_response,
        now,
    )
    .await?;
    if response.changed > 0 {
        moderation::audit(
            &mut tx,
            moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: Some(path.room_id),
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: mutation.event_name(),
                event_detail: "account administrator changed room membership",
                target_type: Some("room"),
                target_id: Some(path.room_id),
                metadata: serde_json::json!({
                    "requestId": request.request_id,
                    "changed": response.changed,
                    "allRooms": request.all_rooms
                }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(response))
}

/// Service-authenticated mutation path for the live room's three durable membership controls.
/// The controller has already verified the room HMAC, but this service independently checks its
/// credential, the locked actor role, target scope, owner protection, revision, and replay ledger.
pub async fn room_control(
    State(state): State<Arc<AppState>>,
    Path(path): Path<MembershipPath>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<MembershipMutationResponse>, ApiError> {
    if !state.controller_is_authorized(controller_bearer(&headers)) {
        return Err(ApiError::Unauthorized);
    }
    let request: RoomControlRequest = serde_json::from_slice(&body)
        .map_err(|_| ApiError::Invalid("invalid room membership control request".into()))?;
    if request.target.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative".into(),
        ));
    }

    let now = OffsetDateTime::now_utc();
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(path.enterprise_id))
        .await?;
    if !membership::room_exists(&mut tx, path.room_id).await? {
        return Err(ApiError::NotFound);
    }
    membership::lock_request(&mut tx, request.request_id).await?;
    let pair = membership::lock_control_pair(
        &mut tx,
        path.room_id,
        &[request.actor_member_id, request.target.member_id],
    )
    .await?;
    let actor = pair
        .iter()
        .find(|member| member.id == request.actor_member_id)
        .ok_or(ApiError::Forbidden)?;
    let target = pair
        .iter()
        .find(|member| member.id == request.target.member_id)
        .ok_or(ApiError::NotFound)?;
    if actor.id == target.id {
        return Err(ApiError::Forbidden);
    }
    if actor.is_banned
        || actor.is_paused
        || actor.approval_status != "approved"
        || !matches!(actor.role.as_str(), "owner" | "presenter")
    {
        return Err(ApiError::Forbidden);
    }
    if target.role == "owner"
        && matches!(
            &request.operation,
            RoomControlOperation::SetMuted { .. } | RoomControlOperation::SetBanned { .. }
        )
    {
        return Err(ApiError::Forbidden);
    }

    let request_digest = digest(actor.user_id, &path, &request)?;
    if let Some((stored_digest, stored_response)) =
        membership::replay(&mut tx, request.request_id).await?
    {
        if stored_digest != request_digest {
            return Err(ApiError::Invalid(
                "requestId was already used for a different membership mutation".into(),
            ));
        }
        let response = serde_json::from_value(stored_response).map_err(ApiError::internal)?;
        tx.commit().await?;
        return Ok(Json(response));
    }
    if target.revision != request.target.expected_revision {
        return Err(ApiError::Conflict);
    }

    let mutation = room_control_mutation(&request.operation);
    let (members, removed_member_ids, changed) = membership::mutate(
        &mut tx,
        path.room_id,
        &[membership::Target {
            id: request.target.member_id,
            expected_revision: request.target.expected_revision,
        }],
        false,
        &mutation,
        now,
    )
    .await
    .map_err(mutation_error)?;
    let response = MembershipMutationResponse {
        members,
        removed_member_ids,
        changed,
    };
    let stored_response = serde_json::to_value(&response).map_err(ApiError::internal)?;
    membership::record(
        &mut tx,
        request.request_id,
        actor.user_id,
        &request_digest,
        &stored_response,
        now,
    )
    .await?;
    if changed > 0 {
        moderation::audit(
            &mut tx,
            moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: Some(path.room_id),
                actor_user_id: actor.user_id,
                actor_name: &actor.display_name,
                event_name: mutation.event_name(),
                event_detail: "live room presenter changed room membership",
                target_type: Some("member"),
                target_id: Some(target.id),
                metadata: serde_json::json!({ "requestId": request.request_id }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(response))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_validation_is_bounded_and_not_a_single_at_sign_check() {
        assert!(valid_email("member@example.test"));
        for invalid in [
            "",
            "member",
            "@example.test",
            "member@example",
            "member @example.test",
        ] {
            assert!(!valid_email(invalid), "accepted {invalid:?}");
        }
    }

    #[test]
    fn request_digest_binds_actor_tenant_room_and_body() {
        let path = MembershipPath {
            enterprise_id: Uuid::from_u128(1),
            room_id: Uuid::from_u128(2),
        };
        let request = InviteMemberRequest {
            request_id: Uuid::from_u128(3),
            email: "member@example.test".into(),
            display_name: "Member".into(),
        };
        let base = digest(Uuid::from_u128(4), &path, &request).unwrap();
        assert_ne!(base, digest(Uuid::from_u128(5), &path, &request).unwrap());
        assert_eq!(base.len(), 64);
    }

    #[tokio::test]
    async fn validation_refuses_uncaptured_roles_before_database_work() {
        let error = operation(&ManageOperation::SetRole {
            role: "owner".into(),
        })
        .await
        .unwrap_err();
        assert_eq!(error.code(), "invalid");
    }
}
