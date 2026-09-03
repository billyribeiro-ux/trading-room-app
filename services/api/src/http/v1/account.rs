//! Account bootstrap and the actions that touch `users`, not a room.
//!
//! These live outside `/rooms/{room_id}` on purpose. `users` has no `enterprise_id` and no RLS,
//! so it is not room-scoped data and a room-scoped route would imply an isolation that does not
//! exist here. They take [`CurrentUser`], not `RoomMember`: being signed in is the only
//! requirement, and a member of no room can still set their own theme.

use std::collections::HashMap;
use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use crate::auth::extract::CurrentUser;
use crate::db::repo::identity;
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRoom {
    pub id: uuid::Uuid,
    pub name: String,
    pub state: String,
    pub member_id: uuid::Uuid,
    pub role: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub id: uuid::Uuid,
    pub name: String,
    pub slug: String,
    pub role: String,
    pub rooms: Vec<AccountRoom>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapResponse {
    pub user: identity::CurrentProfile,
    pub accounts: Vec<AccountSummary>,
}

/// Current identity, canonical enterprise authority, and the caller's rooms in two bounded
/// resolver queries plus one identity lookup. No token claim supplies mutable profile data and no
/// loop performs database I/O, so account size cannot create an N+1 query pattern.
pub async fn bootstrap(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
) -> Result<Json<BootstrapResponse>, ApiError> {
    let profile = identity::current_profile(&state.db, user.user_id)
        .await?
        .ok_or(ApiError::Unauthorized)?;
    let enterprise_memberships = state.db.list_enterprise_memberships(user.user_id).await?;
    let room_memberships = state.db.list_memberships(user.user_id).await?;

    let mut rooms_by_enterprise = HashMap::<uuid::Uuid, Vec<AccountRoom>>::new();
    for membership in room_memberships {
        rooms_by_enterprise
            .entry(membership.enterprise_id)
            .or_default()
            .push(AccountRoom {
                id: membership.room_id,
                name: membership.room_name,
                state: membership.room_state,
                member_id: membership.member_id,
                role: membership.member_role,
            });
    }

    let accounts = enterprise_memberships
        .into_iter()
        .map(|membership| AccountSummary {
            id: membership.enterprise_id,
            name: membership.enterprise_name,
            slug: membership.enterprise_slug,
            role: membership.account_role,
            rooms: rooms_by_enterprise
                .remove(&membership.enterprise_id)
                .unwrap_or_default(),
        })
        .collect();

    Ok(Json(BootstrapResponse {
        user: profile,
        accounts,
    }))
}

pub async fn preferences(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
) -> Result<Json<serde_json::Value>, ApiError> {
    Ok(Json(identity::preferences(&state.db, user.user_id).await?))
}

#[derive(Debug, Deserialize)]
pub struct PreferenceRequest {
    pub key: String,
    pub value: serde_json::Value,
}

/// `savePreference` - one key.
///
/// Merged in the database with `jsonb_set` rather than read-modify-written here, so two tabs
/// saving two different settings do not overwrite one another.
pub async fn set_preference(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Json(request): Json<PreferenceRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let key = request.key.trim();
    if key.is_empty() || key.len() > limits::PREFERENCE_KEY_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a preference key must be 1 to {} bytes",
            limits::PREFERENCE_KEY_MAX_BYTES
        )));
    }
    // Bounded because `preferences` is a jsonb column on a table with no RLS and no other
    // ceiling - without this it is an unbounded per-user store.
    if serde_json::to_string(&request.value).map_or(0, |s| s.len())
        > limits::PREFERENCE_VALUE_MAX_BYTES
    {
        return Err(ApiError::Invalid(format!(
            "a preference value may be at most {} bytes",
            limits::PREFERENCE_VALUE_MAX_BYTES
        )));
    }

    let updated = identity::set_preference(
        &state.db,
        user.user_id,
        key,
        &request.value,
        OffsetDateTime::now_utc(),
    )
    .await?;

    Ok(Json(updated))
}

/// `saveTheme` - several keys at once.
///
/// A shallow merge, so saving the theme cannot clear preferences the client did not send. A
/// full replace would silently drop every setting a slightly older client does not know about.
pub async fn save_theme(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Json(patch): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !patch.is_object() {
        return Err(ApiError::Invalid(
            "expected an object of preferences".into(),
        ));
    }
    if serde_json::to_string(&patch).map_or(0, |s| s.len()) > limits::PREFERENCE_VALUE_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "preferences may be at most {} bytes",
            limits::PREFERENCE_VALUE_MAX_BYTES
        )));
    }

    let updated =
        identity::merge_preferences(&state.db, user.user_id, &patch, OffsetDateTime::now_utc())
            .await?;

    Ok(Json(updated))
}
