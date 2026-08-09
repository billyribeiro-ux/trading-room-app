//! Turning a request into an identity, and an identity into a room membership.
//!
//! Two extractors, in a deliberate order.
//!
//! [`CurrentUser`] verifies the `__Host-tradingroom_access` cookie. Until this module existed the API
//! *minted* access tokens and nothing ever checked one - `auth::token::verify` had no caller
//! outside its own tests, so the cookie was decorative. That is the hole this closes.
//!
//! [`RoomMember`] resolves the caller's membership of the room named in the path, and does it
//! **once per request**. Resolving per handler would mean a handler that forgets is silently
//! unauthorized-by-omission, which is the failure mode this whole design exists to make
//! impossible: a handler cannot obtain the room's data without also obtaining the membership
//! that authorizes it, because the same extractor produces both.
//!
//! # Why membership resolution runs before the tenant transaction
//!
//! The tenant id lives in a tenant-scoped table, so it cannot be read from inside a
//! tenant-scoped transaction - the chicken-and-egg the schema's three `SECURITY DEFINER`
//! resolvers exist to break. `auth_resolve_membership` runs as the owner with a pinned
//! `search_path` on a plain pooled connection, before any `TenantTx` exists. Everything after
//! that point is inside the tenancy kernel.

use std::sync::Arc;

use axum::extract::{FromRequestParts, Path};
use axum::http::request::Parts;
use time::OffsetDateTime;
use uuid::Uuid;

use crate::capability::{
    Capabilities, Capability, EffectiveCapabilities, MemberFlags, MemberRole, RoleDefaults,
    RoomRestrictions,
};
use crate::db::TenantCtx;
use crate::error::ApiError;
use crate::http::{ACCESS_COOKIE, AppState, read_cookie};

/// A caller whose access token verified.
///
/// Holds only what the token asserts. Anything that must be *current* - whether the account
/// still exists, what its role in a room is - is read from the database, never from here.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CurrentUser {
    pub user_id: Uuid,
    pub display_name: String,
    /// From the token. Re-checked against `users` for admin-plane operations; carried here so
    /// an ordinary request needs no extra lookup.
    pub is_platform_admin: bool,
    pub is_guest: bool,
    /// This token's unique id. The handle a future revocation list will use.
    pub jti: Uuid,
}

impl FromRequestParts<Arc<AppState>> for CurrentUser {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let token = read_cookie(&parts.headers, ACCESS_COOKIE).ok_or(ApiError::Unauthorized)?;
        let now = OffsetDateTime::now_utc().unix_timestamp();

        let claims = crate::auth::token::verify(&state.verifying_key(), &token, now)
            // Every failure mode collapses to one refusal on the wire; the reason is logged.
            .inspect_err(|error| tracing::debug!(%error, "access token refused"))?;

        Ok(Self {
            user_id: claims.sub,
            display_name: claims.name,
            is_platform_admin: claims.adm,
            is_guest: claims.gst,
            jti: claims.jti,
        })
    }
}

/// Pulls `:room_id` out of the path.
///
/// Deserialised into a **map** rather than a `struct { room_id }` because routes below the
/// room carry further parameters (`/channels/{channel_id}/messages`), and axum's typed `Path`
/// binds *all* of them - a struct naming only `room_id` fails to extract on exactly the
/// nested routes this is most needed for.
async fn room_id_from_path(parts: &mut Parts, state: &Arc<AppState>) -> Result<Uuid, ApiError> {
    let Path(params) =
        Path::<std::collections::HashMap<String, String>>::from_request_parts(parts, state)
            .await
            .map_err(|_| ApiError::NotFound)?;

    params
        .get("room_id")
        .and_then(|value| value.parse().ok())
        .ok_or(ApiError::NotFound)
}

/// A verified caller, resolved against one room, with capabilities already suppressed.
///
/// Obtaining one of these is the authorization step. A handler that has a `RoomMember` has
/// already been established to be a member of that room; what it may *do* is then one
/// [`EffectiveCapabilities::require`] call away.
#[derive(Debug, Clone)]
pub struct RoomMember {
    pub user: CurrentUser,
    pub room_id: Uuid,
    pub enterprise_id: Uuid,
    /// `room_members.id`, not `users.id`. Most room tables reference this one.
    pub member_id: Uuid,
    pub capabilities: EffectiveCapabilities,
}

impl RoomMember {
    /// The tenant context for this member's own transactions.
    #[must_use]
    pub fn ctx(&self) -> TenantCtx {
        TenantCtx::member(self.enterprise_id, self.member_id)
    }

    /// Server context for the same tenant: the `private_messages` policy applies the tenant
    /// check only. Deliberately verbose to write, and greppable, because it widens what the
    /// database will return.
    #[must_use]
    pub fn server_ctx(&self) -> TenantCtx {
        TenantCtx::server(self.enterprise_id)
    }

    /// # Errors
    /// [`ApiError::Forbidden`] when the capability is absent or suppressed. The specific
    /// reason travels in the message because every one of them is actionable by the caller -
    /// "you are muted" and "your trial expired" are things a client should say out loud.
    pub fn require(&self, capability: Capability, now: OffsetDateTime) -> Result<(), ApiError> {
        self.capabilities
            .require(capability, now)
            .map_err(|denied| {
                tracing::debug!(
                    room_id = %self.room_id,
                    member_id = %self.member_id,
                    capability = capability.wire_name(),
                    %denied,
                    "capability refused"
                );
                ApiError::Denied(denied)
            })
    }
}

impl FromRequestParts<Arc<AppState>> for RoomMember {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<AppState>,
    ) -> Result<Self, Self::Rejection> {
        let user = CurrentUser::from_request_parts(parts, state).await?;
        let room_id = room_id_from_path(parts, state).await?;
        resolve(state, user, room_id).await
    }
}

/// Resolves a membership. Split out of the extractor so it can be called directly - the
/// WebSocket upgrade needs the same resolution but does not go through `FromRequestParts`.
///
/// # Errors
/// [`ApiError::NotFound`] when the caller is not a member. Deliberately **not** 403: telling
/// a stranger that a room exists but is closed to them is an existence oracle, and the schema
/// already takes that position by making an RLS miss and an absent row byte-identical.
pub async fn resolve(
    state: &Arc<AppState>,
    user: CurrentUser,
    room_id: Uuid,
) -> Result<RoomMember, ApiError> {
    let membership = state
        .db
        .resolve_membership(user.user_id, room_id)
        .await?
        .ok_or(ApiError::NotFound)?;

    let role = MemberRole::parse(&membership.member_role).ok_or_else(|| {
        // The CHECK constraint permits five values. A sixth means the database and this
        // build disagree about the role vocabulary, which is a deployment error, not a
        // permission question - and guessing a fallback role would be inventing authority.
        tracing::error!(
            room_id = %room_id,
            role = %membership.member_role,
            "room_members.role holds a value this build does not know; refusing to guess"
        );
        ApiError::internal(UnknownRole(membership.member_role.clone()))
    })?;

    // From here on everything is inside the tenancy kernel.
    let mut tx = state
        .db
        .begin_tenant(TenantCtx::member(
            membership.enterprise_id,
            membership.member_id,
        ))
        .await?;

    let profile = crate::db::repo::membership::load(&mut tx, membership.member_id, room_id).await?;
    tx.commit().await?;

    let defaults = RoleDefaults::from_room_config(&profile.room_config);
    let capabilities = EffectiveCapabilities::resolve(
        role,
        profile.stored,
        profile.flags,
        &defaults,
        profile.room,
    );

    Ok(RoomMember {
        user,
        room_id,
        enterprise_id: membership.enterprise_id,
        member_id: membership.member_id,
        capabilities,
    })
}

/// Only ever constructed to carry a role name into a log line.
#[derive(Debug, thiserror::Error)]
#[error("unknown room_members.role {0:?}")]
struct UnknownRole(String);

/// Everything the capability layer needs, read in one round trip.
pub struct MembershipProfile {
    pub stored: Capabilities,
    pub flags: MemberFlags,
    pub room: RoomRestrictions,
    pub room_config: serde_json::Value,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_member_context_carries_the_member_id_and_a_server_context_does_not() {
        let member = RoomMember {
            user: CurrentUser {
                user_id: Uuid::from_u128(1),
                display_name: "Ada".into(),
                is_platform_admin: false,
                is_guest: false,
                jti: Uuid::from_u128(2),
            },
            room_id: Uuid::from_u128(3),
            enterprise_id: Uuid::from_u128(4),
            member_id: Uuid::from_u128(5),
            capabilities: EffectiveCapabilities::resolve(
                MemberRole::Member,
                Capabilities::NONE,
                MemberFlags::default(),
                &RoleDefaults::COMPILED_IN,
                RoomRestrictions::default(),
            ),
        };

        assert_eq!(member.ctx().member_id, Some(Uuid::from_u128(5)));
        assert_eq!(member.ctx().enterprise_id, Uuid::from_u128(4));
        // Server context widens what `private_messages` returns, so it must be explicit.
        assert_eq!(member.server_ctx().member_id, None);
        assert_eq!(member.server_ctx().enterprise_id, Uuid::from_u128(4));
    }
}
