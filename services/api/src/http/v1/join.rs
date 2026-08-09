//! Getting into a room: `open`, `password`, `invite`, and guests.
//!
//! These are the only room routes that do **not** take [`RoomMember`], because their whole
//! purpose is to create one. They take [`CurrentUser`] and locate the tenant through the
//! schema's `SECURITY DEFINER` resolvers first - the room row is tenant-scoped, so it cannot be
//! read without the GUC that reading it would provide.
//!
//! # Why the password is compared against the room, not the user
//!
//! `rooms.config.access.tiers[*].passwordHash` is a **room** credential: everybody entering
//! through a tier presents the same secret. It is Argon2id because
//! `rooms_access_tiers_argon2id_check` requires it - the schema refuses to store anything else -
//! and it is verified through the same `auth::password` path as a login, inside
//! `spawn_blocking`, so a room password is as expensive to guess as an account password.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path, State};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::auth::extract::CurrentUser;
use crate::auth::password;
use crate::db::TenantCtx;
use crate::db::repo::join;
use crate::error::ApiError;
use crate::http::AppState;

#[derive(Debug, Deserialize)]
pub struct RoomPath {
    pub room_id: Uuid,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinRequest {
    /// For an `auth_mode = 'password'` room.
    pub password: Option<String>,
    /// For an `auth_mode = 'invite'` room. The raw token; only its hash is ever stored.
    pub invite_token: Option<String>,
    /// Optional per-room label for the new membership.
    pub display_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinResponse {
    pub membership: join::JoinedMembership,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuestRequest {
    pub display_name: String,
}

/// Enters a room as a guest, with no account.
///
/// Only for a room whose `config.access.allowAnonymous` is true - the default is `false`, so a
/// room that has never been configured does not silently accept strangers.
///
/// A guest is a real `users` row with `is_guest` and **no password**, which
/// `users_guest_password_check` enforces. It therefore cannot be signed into later, and the
/// session it gets here is the only way to use it. That is deliberate: a guest is a visit, not
/// an account.
pub async fn join_as_guest(
    State(state): State<Arc<AppState>>,
    crate::http::ClientAddr(peer): crate::http::ClientAddr,
    headers: axum::http::HeaderMap,
    Path(path): Path<RoomPath>,
    Json(request): Json<GuestRequest>,
) -> Result<axum::response::Response, ApiError> {
    let now = OffsetDateTime::now_utc();

    // Keyed by IP, because a guest has no identity yet - this is the endpoint that *creates*
    // one, so it is the only place a caller can mint rows without already being somebody.
    let client_ip = crate::http::client_ip::resolve(&headers, peer, state.trusted_proxy_hops);
    let ip_key = client_ip.map_or_else(|| "unknown".to_string(), |ip| ip.to_string());
    if state.limiters.guest_ip.check(&ip_key).is_err() {
        return Err(ApiError::RateLimited);
    }

    let name = request.display_name.trim();
    if name.is_empty() || name.len() > crate::limits::DISPLAY_NAME_MAX_BYTES {
        return Err(ApiError::Invalid(format!(
            "a display name must be 1 to {} bytes",
            crate::limits::DISPLAY_NAME_MAX_BYTES
        )));
    }

    let (enterprise_id, room_state) = state
        .db
        .locate_room_tenant(path.room_id)
        .await?
        .ok_or(ApiError::NotFound)?;

    if room_state != "open" {
        return Err(ApiError::Invalid(format!("this room is {room_state}")));
    }

    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(enterprise_id))
        .await?;
    let entry = join::entry(&mut tx, enterprise_id, path.room_id).await?;

    // Checked before the row is created, so a refused guest leaves nothing behind.
    if !entry.access.allow_anonymous {
        tx.commit().await?;
        return Err(ApiError::Forbidden);
    }
    if entry.roster_count >= entry.max_capacity {
        tx.commit().await?;
        return Err(ApiError::Invalid("this room is full".into()));
    }
    tx.commit().await?;

    let user_id = join::create_guest(&state.db, name, path.room_id).await?;

    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(enterprise_id))
        .await?;
    // Created for its effect: the response carries a session, not the membership row, because
    // the client's next call is the room overview which returns it in full anyway.
    join::ensure_membership(
        &mut tx,
        join::NewMembership {
            enterprise_id,
            room_id: path.room_id,
            user_id,
            role: "member",
            is_trial: false,
            trial_expires_at: None,
            display_name: Some(name),
        },
    )
    .await?;
    tx.commit().await?;

    // A guest gets the same session machinery as anybody else - including a refresh family, so
    // the visit survives longer than one ten-minute access token.
    let refresh = crate::auth::refresh::issue_family(
        &state.db,
        user_id,
        client_ip.map(Into::into),
        None,
        now,
    )
    .await?;

    tracing::info!(room_id = %path.room_id, %user_id, "a guest entered a room");

    crate::http::issue_session(
        &state,
        user_id,
        name.to_owned(),
        false,
        true,
        &refresh.token,
        now,
    )
}

/// Joins the caller to a room.
///
/// Idempotent: an existing member is returned their membership unchanged rather than having
/// their role or trial clock reset. That matters because a client that retries a join on a
/// flaky connection must not downgrade somebody who is already inside.
pub async fn join_room(
    State(state): State<Arc<AppState>>,
    user: CurrentUser,
    Path(path): Path<RoomPath>,
    Json(request): Json<JoinRequest>,
) -> Result<Json<JoinResponse>, ApiError> {
    let now = OffsetDateTime::now_utc();

    // Rate-limited by user: a password room is a guessing target, and the Argon2id verify below
    // is deliberately expensive for us as well as for an attacker.
    if state
        .limiters
        .join_user
        .check(&user.user_id.to_string())
        .is_err()
    {
        return Err(ApiError::RateLimited);
    }

    // The chicken-and-egg: locate the tenant before any tenant-scoped read.
    let (enterprise_id, room_state) = state
        .db
        .locate_room_tenant(path.room_id)
        .await?
        .ok_or(ApiError::NotFound)?;

    // A closed or locked room refuses new entrants regardless of credential. Checked before the
    // password so a closed room is not also a password oracle.
    if room_state != "open" {
        return Err(ApiError::Invalid(format!("this room is {room_state}")));
    }

    let mut tx = state
        .db
        .begin_tenant(TenantCtx::server(enterprise_id))
        .await?;

    let entry = join::entry(&mut tx, enterprise_id, path.room_id).await?;

    // Capacity is a room setting; `roster_count` is maintained by the presence layer. A full
    // room refuses rather than silently over-filling.
    if entry.roster_count >= entry.max_capacity {
        tx.commit().await?;
        return Err(ApiError::Invalid("this room is full".into()));
    }

    let (role, is_trial, trial_expires_at) = match entry.auth_mode.as_str() {
        "open" => ("member".to_owned(), false, None),

        "password" => {
            let presented = request
                .password
                .clone()
                .ok_or_else(|| ApiError::Invalid("this room needs a password".into()))?;

            // Every tier is tried. They are room credentials, not per-user ones, so there is no
            // identifier to narrow by - and the count is capped at 10 by
            // `rooms_access_tiers_array_check`, which is what keeps this bounded.
            let mut matched = None;
            for tier in &entry.access.tiers {
                if password::verify_password(presented.clone(), Some(tier.password_hash.clone()))
                    .await?
                {
                    matched = Some(tier.clone());
                    break;
                }
            }

            let tier = matched.ok_or(ApiError::Unauthorized)?;
            let expiry = join::trial_expiry(&tier, now);
            (tier.role.clone(), tier.is_trial, expiry)
        }

        "invite" => {
            let token = request
                .invite_token
                .clone()
                .ok_or_else(|| ApiError::Invalid("this room needs an invite".into()))?;

            // Only the hash is stored, so only the hash is looked up. SHA-256 rather than
            // Argon2 because an invite token is generated with full entropy - there is nothing
            // to brute force, and the hash exists so a database dump is not a set of live
            // invitations.
            let token_hash = hex::encode(Sha256::digest(token.as_bytes()));

            let located = state
                .db
                .locate_invite_tenant(&token_hash)
                .await?
                .ok_or(ApiError::Unauthorized)?;

            // The invite must be for *this* room. Without this an invite to any room in the
            // tenant would open every room in it.
            if located.room_id != path.room_id || located.enterprise_id != enterprise_id {
                return Err(ApiError::Unauthorized);
            }

            let invite = join::invite(&mut tx, located.invite_id).await?;
            if !invite.is_redeemable(now) {
                return Err(ApiError::Unauthorized);
            }

            // Conditional UPDATE, so two people redeeming the last use cannot both win.
            join::consume_invite(&mut tx, located.invite_id, now)
                .await
                .map_err(|_| ApiError::Unauthorized)?;

            let expiry = invite
                .is_trial
                .then(|| now + time::Duration::days(crate::limits::INVITE_TRIAL_DAYS));
            (invite.role.clone(), invite.is_trial, expiry)
        }

        other => {
            // `rooms_auth_mode_check` permits exactly three values. A fourth means the database
            // and this build disagree, which is a deployment error - and guessing would be
            // inventing an admission policy.
            tracing::error!(room_id = %path.room_id, auth_mode = %other, "unknown rooms.auth_mode");
            return Err(ApiError::Internal("unknown room auth mode".into()));
        }
    };

    let membership = join::ensure_membership(
        &mut tx,
        join::NewMembership {
            enterprise_id,
            room_id: path.room_id,
            user_id: user.user_id,
            role: &role,
            is_trial,
            trial_expires_at,
            display_name: request
                .display_name
                .as_deref()
                .map(str::trim)
                .filter(|name| !name.is_empty()),
        },
    )
    .await?;

    tx.commit().await?;

    tracing::info!(
        room_id = %path.room_id,
        user_id = %user.user_id,
        mode = %entry.auth_mode,
        %role,
        "joined a room"
    );

    Ok(Json(JoinResponse { membership }))
}
