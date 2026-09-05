//! Account-administrator badge definition and assignment API.
//!
//! Definition writes and membership assignment writes share one replay ledger and one account
//! authority lock. Payloads are closed, bounded, normalized before hashing, and committed together
//! with the exact projection the controller applies.

use std::collections::HashSet;
use std::sync::Arc;

use axum::Json;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use base64::Engine;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::CurrentUser;
use crate::db::TenantCtx;
use crate::db::repo::{managed_badge as badge, managed_membership, moderation, room};
use crate::error::ApiError;
use crate::http::AppState;

const MAX_TARGETS: usize = 1_000;
const LABEL_MAX_BYTES: usize = 160;
const EMOJI_MAX_BYTES: usize = 128;
const IMAGE_MAX_BYTES: usize = 256 * 1_024;
const MAX_AUTO_ASSIGN_ROLES: usize = 32;

#[derive(Debug, Serialize, Deserialize)]
pub struct AccountPath {
    pub enterprise_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BadgePath {
    pub enterprise_id: Uuid,
    pub badge_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssignmentPath {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct BadgeFields {
    pub label: String,
    pub text_color: String,
    pub background_color: String,
    pub emoji: Option<String>,
    pub image_data_url: Option<String>,
    pub dark_theme_badge_id: Option<Uuid>,
    #[serde(default)]
    pub auto_assign_roles: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CreateBadgeRequest {
    pub request_id: Uuid,
    #[serde(flatten)]
    pub fields: BadgeFields,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UpdateBadgeRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
    #[serde(flatten)]
    pub fields: BadgeFields,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct DeleteBadgeRequest {
    pub request_id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct MemberTarget {
    pub member_id: Uuid,
    pub expected_revision: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
pub enum AssignmentOperation {
    SetBadge {
        #[serde(rename = "badgeId")]
        badge_id: Uuid,
        assigned: bool,
    },
    ClearBadges,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AssignBadgesRequest {
    pub request_id: Uuid,
    pub targets: Vec<MemberTarget>,
    #[serde(default)]
    pub all_rooms: bool,
    pub operation: AssignmentOperation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct BadgeMutationResponse {
    pub badges: Vec<badge::ManagedBadge>,
    pub members: Vec<managed_membership::ManagedMember>,
    pub removed_badge_ids: Vec<Uuid>,
    pub changed: usize,
}

fn digest<T: Serialize>(
    actor_user_id: Uuid,
    enterprise_id: Uuid,
    room_id: Option<Uuid>,
    request: &T,
) -> Result<String, ApiError> {
    let encoded = serde_json::to_vec(&(actor_user_id, enterprise_id, room_id, request))
        .map_err(ApiError::internal)?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

fn color(value: &str, transparent_allowed: bool) -> bool {
    (value.len() == 7
        && value.starts_with('#')
        && value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit))
        || (transparent_allowed && value == "rgba(1,0,0,0)")
}

fn normalized_optional(
    value: Option<String>,
    max_bytes: usize,
    name: &str,
) -> Result<Option<String>, ApiError> {
    let value = value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    if value.as_ref().is_some_and(|value| value.len() > max_bytes) {
        return Err(ApiError::Invalid(format!(
            "{name} exceeds {max_bytes} UTF-8 bytes"
        )));
    }
    Ok(value)
}

fn validate_image(value: Option<String>) -> Result<Option<String>, ApiError> {
    let Some(value) = normalized_optional(value, 360_000, "imageDataUrl")? else {
        return Ok(None);
    };
    let Some((header, encoded)) = value.split_once(',') else {
        return Err(ApiError::Invalid(
            "imageDataUrl must be a supported base64 image".into(),
        ));
    };
    if !matches!(
        header,
        "data:image/png;base64"
            | "data:image/jpeg;base64"
            | "data:image/gif;base64"
            | "data:image/webp;base64"
    ) {
        return Err(ApiError::Invalid(
            "imageDataUrl must be PNG, JPEG, GIF, or WebP".into(),
        ));
    }
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|_| ApiError::Invalid("imageDataUrl contains invalid base64".into()))?;
    if decoded.is_empty() || decoded.len() > IMAGE_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a badge image must contain 1 to {IMAGE_MAX_BYTES} bytes"
        )));
    }
    Ok(Some(value))
}

fn normalize_fields(fields: BadgeFields) -> Result<badge::BadgeInput, ApiError> {
    let label = fields.label.trim().to_owned();
    if label.len() > LABEL_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a badge label is at most {LABEL_MAX_BYTES} UTF-8 bytes"
        )));
    }
    if !color(&fields.text_color, false) || !color(&fields.background_color, true) {
        return Err(ApiError::Invalid(
            "badge colors must use the captured six-digit format".into(),
        ));
    }
    let emoji = normalized_optional(fields.emoji, EMOJI_MAX_BYTES, "emoji")?;
    let image_data_url = validate_image(fields.image_data_url)?;
    if label.is_empty() && image_data_url.is_none() {
        return Err(ApiError::Invalid(
            "a badge requires a label or image".into(),
        ));
    }
    if fields.auto_assign_roles.len() > MAX_AUTO_ASSIGN_ROLES {
        return Err(ApiError::Invalid(format!(
            "autoAssignRoles contains more than {MAX_AUTO_ASSIGN_ROLES} roles"
        )));
    }
    let mut seen = HashSet::with_capacity(fields.auto_assign_roles.len());
    let mut roles = Vec::with_capacity(fields.auto_assign_roles.len());
    for role in fields.auto_assign_roles {
        let role = role.trim().to_ascii_lowercase();
        if role.is_empty()
            || role.len() > 64
            || !role
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
        {
            return Err(ApiError::Invalid(
                "autoAssignRoles contains an invalid role slug".into(),
            ));
        }
        if seen.insert(role.clone()) {
            roles.push(role);
        }
    }
    roles.sort();
    Ok(badge::BadgeInput {
        label,
        text_color: fields.text_color,
        background_color: fields.background_color,
        emoji,
        image_data_url,
        dark_theme_badge_id: fields.dark_theme_badge_id,
        auto_assign_roles: roles,
    })
}

fn validate_targets(targets: &[MemberTarget]) -> Result<Vec<badge::Target>, ApiError> {
    if targets.is_empty() || targets.len() > MAX_TARGETS {
        return Err(ApiError::Invalid(format!(
            "targets must contain 1 to {MAX_TARGETS} members"
        )));
    }
    let mut seen = HashSet::with_capacity(targets.len());
    targets
        .iter()
        .map(|target| {
            if target.expected_revision < 0 {
                return Err(ApiError::Invalid(
                    "expectedRevision must be non-negative".into(),
                ));
            }
            if !seen.insert(target.member_id) {
                return Err(ApiError::Invalid("duplicate member target".into()));
            }
            Ok(badge::Target {
                id: target.member_id,
                expected_revision: target.expected_revision,
            })
        })
        .collect()
}

fn mutation_error(error: badge::MutationError) -> ApiError {
    match error {
        badge::MutationError::Database(error) => error.into(),
        badge::MutationError::Conflict => ApiError::Conflict,
    }
}

async fn account_tx<'a>(
    state: &'a AppState,
    user: &CurrentUser,
    enterprise_id: Uuid,
) -> Result<crate::db::TenantTx<'a>, ApiError> {
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(enterprise_id))
        .await?;
    if !room::lock_account_admin(&mut tx, user.user_id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(tx)
}

async fn replay_or_none(
    tx: &mut crate::db::TenantTx<'_>,
    request_id: Uuid,
    request_digest: &str,
) -> Result<Option<BadgeMutationResponse>, ApiError> {
    badge::lock_request(tx, request_id).await?;
    let Some((stored_digest, stored_response)) = badge::replay(tx, request_id).await? else {
        return Ok(None);
    };
    if stored_digest != request_digest {
        return Err(ApiError::Invalid(
            "requestId was already used for a different badge mutation".into(),
        ));
    }
    Ok(Some(
        serde_json::from_value(stored_response).map_err(ApiError::internal)?,
    ))
}

async fn store(
    tx: &mut crate::db::TenantTx<'_>,
    request_id: Uuid,
    actor_user_id: Uuid,
    mutation_kind: &str,
    request_digest: &str,
    response: &BadgeMutationResponse,
    now: OffsetDateTime,
) -> Result<(), ApiError> {
    let value = serde_json::to_value(response).map_err(ApiError::internal)?;
    badge::record(
        tx,
        request_id,
        actor_user_id,
        mutation_kind,
        request_digest,
        &value,
        now,
    )
    .await?;
    Ok(())
}

pub async fn list(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
) -> Result<Json<Vec<badge::ManagedBadge>>, ApiError> {
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    let badges = badge::list(&mut tx).await?;
    tx.commit().await?;
    Ok(Json(badges))
}

pub async fn create(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AccountPath>,
    payload: Result<Json<CreateBadgeRequest>, JsonRejection>,
) -> Result<Json<BadgeMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid badge creation request".into()))?;
    let request = CreateBadgeRequest {
        request_id: request.request_id,
        fields: BadgeFields::from(normalize_fields(request.fields)?),
    };
    let request_digest = digest(user.user_id, path.enterprise_id, None, &request)?;
    let input = normalize_fields(request.fields)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let created = badge::create(&mut tx, &input, now).await?;
    let created_id = created.id;
    let created_revision = created.revision;
    let response = BadgeMutationResponse {
        badges: vec![created],
        members: Vec::new(),
        removed_badge_ids: Vec::new(),
        changed: 1,
    };
    store(
        &mut tx,
        request.request_id,
        user.user_id,
        "badge.created",
        &request_digest,
        &response,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: path.enterprise_id,
            room_id: None,
            actor_user_id: user.user_id,
            actor_name: &user.display_name,
            event_name: "badge.created",
            event_detail: "account administrator created a badge definition",
            target_type: Some("badge"),
            target_id: Some(created_id),
            metadata: serde_json::json!({
                "requestId": request.request_id,
                "revision": created_revision
            }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn update(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<BadgePath>,
    payload: Result<Json<UpdateBadgeRequest>, JsonRejection>,
) -> Result<Json<BadgeMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid badge update request".into()))?;
    if request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative".into(),
        ));
    }
    let input = normalize_fields(request.fields.clone())?;
    let normalized = UpdateBadgeRequest {
        request_id: request.request_id,
        expected_revision: request.expected_revision,
        fields: BadgeFields::from(input.clone()),
    };
    let request_digest = digest(user.user_id, path.enterprise_id, None, &normalized)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let (updated, changed) = badge::update(
        &mut tx,
        path.badge_id,
        request.expected_revision,
        &input,
        now,
    )
    .await
    .map_err(mutation_error)?;
    let updated_id = updated.id;
    let updated_revision = updated.revision;
    let response = BadgeMutationResponse {
        badges: vec![updated],
        members: Vec::new(),
        removed_badge_ids: Vec::new(),
        changed: usize::from(changed),
    };
    store(
        &mut tx,
        request.request_id,
        user.user_id,
        "badge.updated",
        &request_digest,
        &response,
        now,
    )
    .await?;
    if changed {
        moderation::audit(
            &mut tx,
            moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: None,
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: "badge.updated",
                event_detail: "account administrator updated a badge definition",
                target_type: Some("badge"),
                target_id: Some(updated_id),
                metadata: serde_json::json!({
                    "requestId": request.request_id,
                    "revision": updated_revision
                }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn remove(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<BadgePath>,
    payload: Result<Json<DeleteBadgeRequest>, JsonRejection>,
) -> Result<Json<BadgeMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid badge deletion request".into()))?;
    if request.expected_revision < 0 {
        return Err(ApiError::Invalid(
            "expectedRevision must be non-negative".into(),
        ));
    }
    let request_digest = digest(user.user_id, path.enterprise_id, None, &request)?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let (badges, members, changed) =
        badge::delete(&mut tx, path.badge_id, request.expected_revision, now)
            .await
            .map_err(mutation_error)?;
    let response = BadgeMutationResponse {
        badges,
        members,
        removed_badge_ids: vec![path.badge_id],
        changed,
    };
    store(
        &mut tx,
        request.request_id,
        user.user_id,
        "badge.deleted",
        &request_digest,
        &response,
        now,
    )
    .await?;
    moderation::audit(
        &mut tx,
        moderation::AuditEntry {
            enterprise_id: path.enterprise_id,
            room_id: None,
            actor_user_id: user.user_id,
            actor_name: &user.display_name,
            event_name: "badge.deleted",
            event_detail: "account administrator deleted a badge definition",
            target_type: Some("badge"),
            target_id: Some(path.badge_id),
            metadata: serde_json::json!({
                "requestId": request.request_id,
                "expectedRevision": request.expected_revision,
                "changed": changed
            }),
        },
    )
    .await?;
    tx.commit().await?;
    Ok(Json(response))
}

pub async fn assign(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<AssignmentPath>,
    payload: Result<Json<AssignBadgesRequest>, JsonRejection>,
) -> Result<Json<BadgeMutationResponse>, ApiError> {
    let Json(request) =
        payload.map_err(|_| ApiError::Invalid("invalid badge assignment request".into()))?;
    let targets = validate_targets(&request.targets)?;
    let request_digest = digest(
        user.user_id,
        path.enterprise_id,
        Some(path.room_id),
        &request,
    )?;
    let now = OffsetDateTime::now_utc();
    let mut tx = account_tx(&state, &user, path.enterprise_id).await?;
    if !managed_membership::room_exists(&mut tx, path.room_id).await? {
        return Err(ApiError::NotFound);
    }
    if let Some(response) = replay_or_none(&mut tx, request.request_id, &request_digest).await? {
        tx.commit().await?;
        return Ok(Json(response));
    }
    let (members, changed) = match request.operation {
        AssignmentOperation::SetBadge { badge_id, assigned } => badge::set_assignment(
            &mut tx,
            path.room_id,
            &targets,
            request.all_rooms,
            badge::AssignmentChange {
                badge_id,
                assigned,
                actor_user_id: user.user_id,
                now,
            },
        )
        .await
        .map_err(mutation_error)?,
        AssignmentOperation::ClearBadges => {
            badge::clear_assignments(&mut tx, path.room_id, &targets, request.all_rooms, now)
                .await
                .map_err(mutation_error)?
        }
    };
    let response = BadgeMutationResponse {
        badges: Vec::new(),
        members,
        removed_badge_ids: Vec::new(),
        changed,
    };
    store(
        &mut tx,
        request.request_id,
        user.user_id,
        "room.members.badges-updated",
        &request_digest,
        &response,
        now,
    )
    .await?;
    if changed > 0 {
        moderation::audit(
            &mut tx,
            moderation::AuditEntry {
                enterprise_id: path.enterprise_id,
                room_id: Some(path.room_id),
                actor_user_id: user.user_id,
                actor_name: &user.display_name,
                event_name: "room.members.badges-updated",
                event_detail: "account administrator changed member badge assignments",
                target_type: Some("room"),
                target_id: Some(path.room_id),
                metadata: serde_json::json!({
                    "requestId": request.request_id,
                    "changed": changed,
                    "allRooms": request.all_rooms
                }),
            },
        )
        .await?;
    }
    tx.commit().await?;
    Ok(Json(response))
}

impl From<badge::BadgeInput> for BadgeFields {
    fn from(value: badge::BadgeInput) -> Self {
        Self {
            label: value.label,
            text_color: value.text_color,
            background_color: value.background_color,
            emoji: value.emoji,
            image_data_url: value.image_data_url,
            dark_theme_badge_id: value.dark_theme_badge_id,
            auto_assign_roles: value.auto_assign_roles,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalization_is_stable_and_rejects_unbounded_inputs() {
        let normalized = normalize_fields(BadgeFields {
            label: "  Pro  ".into(),
            text_color: "#FFFFFF".into(),
            background_color: "rgba(1,0,0,0)".into(),
            emoji: Some("  ⭐  ".into()),
            image_data_url: None,
            dark_theme_badge_id: None,
            auto_assign_roles: vec![" VIP ".into(), "vip".into(), "member-2".into()],
        })
        .unwrap();
        assert_eq!(normalized.label, "Pro");
        assert_eq!(normalized.auto_assign_roles, ["member-2", "vip"]);
        assert!(
            normalize_fields(BadgeFields {
                label: "".into(),
                text_color: "white".into(),
                background_color: "#000000".into(),
                emoji: None,
                image_data_url: None,
                dark_theme_badge_id: None,
                auto_assign_roles: Vec::new(),
            })
            .is_err()
        );
    }

    #[test]
    fn image_validation_decodes_the_payload_instead_of_trusting_its_prefix() {
        assert!(validate_image(Some("data:image/png;base64,YQ==".into())).is_ok());
        assert!(validate_image(Some("data:image/svg+xml;base64,YQ==".into())).is_err());
        assert!(validate_image(Some("data:image/png;base64,%%%".into())).is_err());
    }
}
