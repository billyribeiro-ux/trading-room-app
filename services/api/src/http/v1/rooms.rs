//! Room overview and channel list.

use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde::Serialize;
use time::OffsetDateTime;

use crate::auth::extract::RoomMember;
use crate::capability::Capability;
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
