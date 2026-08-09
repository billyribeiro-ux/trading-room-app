//! Minting a media grant for the SFU.

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Serialize;
use time::OffsetDateTime;

use crate::auth::extract::RoomMember;
use crate::auth::grant;
use crate::error::ApiError;
use crate::http::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrantResponse {
    /// The token to present to the SFU on connect.
    pub grant: String,
    /// Seconds. The client should fetch a new grant rather than cache this one.
    pub expires_in: i64,
}

/// Issues a short-lived grant admitting the caller to this room's media.
///
/// The room id in the grant comes from the resolved membership, never from the request, so a
/// caller cannot mint themselves into a room they are not a member of. The role is derived
/// from effective capabilities, so a muted or expired-trial presenter is admitted as a
/// listener - see [`crate::auth::grant`].
///
/// A `POST` rather than a `GET` because it mints a bearer credential: that keeps it out of
/// browser history, out of referrers and out of any intermediary's URL logging.
pub async fn mint_grant(
    State(state): State<Arc<AppState>>,
    member: RoomMember,
) -> Result<Json<GrantResponse>, ApiError> {
    let now = OffsetDateTime::now_utc();

    // Keyed by the member, not the IP: a grant is cheap to mint but is a broadcast admission
    // ticket, and a client looping on this endpoint is a bug worth bounding either way.
    if state
        .limiters
        .grant_member
        .check(&member.member_id.to_string())
        .is_err()
    {
        return Err(ApiError::RateLimited);
    }

    let token = grant::mint(&state.grant_key, &member, now);

    tracing::debug!(
        room_id = %member.room_id,
        member_id = %member.member_id,
        "minted a media grant"
    );

    Ok(Json(GrantResponse {
        grant: token,
        expires_in: grant::GRANT_TTL_SECONDS,
    }))
}
