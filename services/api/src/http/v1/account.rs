//! `saveTheme` and `savePreference` - the two actions that touch `users`, not a room.
//!
//! These live outside `/rooms/{room_id}` on purpose. `users` has no `enterprise_id` and no RLS,
//! so it is not room-scoped data and a room-scoped route would imply an isolation that does not
//! exist here. They take [`CurrentUser`], not `RoomMember`: being signed in is the only
//! requirement, and a member of no room can still set their own theme.

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Deserialize;
use time::OffsetDateTime;

use crate::auth::extract::CurrentUser;
use crate::db::repo::identity;
use crate::error::ApiError;
use crate::http::AppState;
use crate::limits;

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
