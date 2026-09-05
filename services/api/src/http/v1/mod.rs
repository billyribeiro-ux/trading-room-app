//! Version 1 of the room API.
//!
//! Versioned in the path from the first endpoint, not retrofitted later. The SvelteKit form
//! actions this replaces had no version at all, so there was no way to change a response shape
//! without changing every caller at the same instant.
//!
//! Every route below `/rooms/{room_id}` takes a [`RoomMember`](crate::auth::extract::RoomMember),
//! which is the authorization step: a handler cannot reach the room's data without also holding
//! the membership that permits it, because one extractor produces both. What that membership
//! may *do* is then a single `require` call.
//!
//! `/account/*` is the exception, and deliberately so - it takes only
//! [`CurrentUser`](crate::auth::extract::CurrentUser), because `users` is global identity with
//! no `enterprise_id` and no RLS. Putting it under a room would imply an isolation that table
//! does not have.

pub mod account;
pub mod alerts;
pub mod join;
pub mod managed_badges;
pub mod managed_members;
pub mod media;
pub mod messages;
pub mod moderation;
pub mod notes;
pub mod polls;
pub mod rooms;

use std::sync::Arc;

use axum::Router;
use axum::routing::{delete, get, post, put};

use crate::http::AppState;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        // ---------------------------------------------------------------- the room
        .route("/api/v1/rooms", get(rooms::mine))
        .route(
            "/api/v1/accounts/{enterprise_id}/rooms",
            get(rooms::account_rooms).post(rooms::create_account_room),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}",
            axum::routing::patch(rooms::set_account_room_archived),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/settings",
            get(rooms::account_room_settings).patch(rooms::patch_account_room_settings),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/members",
            get(managed_members::list)
                .post(managed_members::invite)
                .patch(managed_members::manage),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/badges",
            get(managed_badges::list).post(managed_badges::create),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/badges/{badge_id}",
            axum::routing::patch(managed_badges::update).delete(managed_badges::remove),
        )
        .route(
            "/api/v1/accounts/{enterprise_id}/rooms/{room_id}/badge-assignments",
            post(managed_badges::assign),
        )
        .route(
            "/internal/v1/accounts/{enterprise_id}/rooms/{room_id}/members",
            axum::routing::post(managed_members::room_control),
        )
        .route("/api/v1/rooms/{room_id}", get(rooms::overview))
        // Creates a membership rather than requiring one, so it takes CurrentUser not RoomMember.
        .route("/api/v1/rooms/{room_id}/join", post(join::join_room))
        // Creates an account as well as a membership, so it takes no session at all.
        .route("/api/v1/rooms/{room_id}/guest", post(join::join_as_guest))
        .route("/api/v1/rooms/{room_id}/channels", get(rooms::channels))
        // The socket that replaces the five-second poll. `RoomMember` runs before the upgrade,
        // so a non-member is refused with an HTTP status rather than being upgraded and then
        // closed - which a browser reports as an opaque failure.
        .route(
            "/api/v1/rooms/{room_id}/events",
            get(crate::realtime::connect),
        )
        .route(
            "/api/v1/rooms/{room_id}/media-grant",
            post(media::mint_grant),
        )
        // ---------------------------------------------------------------- messages
        .route(
            "/api/v1/rooms/{room_id}/channels/{channel_id}/messages",
            get(messages::list).post(messages::send),
        )
        .route(
            "/api/v1/rooms/{room_id}/messages/{message_id}",
            delete(moderation::delete_message).patch(moderation::edit_message),
        )
        .route(
            "/api/v1/rooms/{room_id}/messages/{message_id}/reactions",
            post(moderation::react).delete(moderation::unreact),
        )
        // ---------------------------------------------------------------- notes
        .route(
            "/api/v1/rooms/{room_id}/notes",
            get(notes::list).post(notes::create),
        )
        .route(
            "/api/v1/rooms/{room_id}/notes/{note_id}",
            put(notes::save).patch(notes::rename).delete(notes::remove),
        )
        .route(
            "/api/v1/rooms/{room_id}/notes/{note_id}/versions",
            get(notes::versions),
        )
        .route(
            "/api/v1/rooms/{room_id}/notes/{note_id}/versions/{version_id}/restore",
            post(notes::restore),
        )
        .route(
            "/api/v1/rooms/{room_id}/notes/{note_id}/welcome-mat",
            put(notes::set_welcome_mat),
        )
        // ---------------------------------------------------------------- alerts
        .route(
            "/api/v1/rooms/{room_id}/alerts",
            get(alerts::list).post(alerts::post),
        )
        .route(
            "/api/v1/rooms/{room_id}/alerts/{alert_id}",
            delete(alerts::remove),
        )
        .route(
            "/api/v1/rooms/{room_id}/alerts/{alert_id}/questions",
            get(alerts::questions).post(alerts::ask),
        )
        // ---------------------------------------------------------------- polls
        .route(
            "/api/v1/rooms/{room_id}/polls",
            get(polls::list).post(polls::create),
        )
        .route(
            "/api/v1/rooms/{room_id}/polls/{poll_id}",
            get(polls::results).delete(polls::remove),
        )
        .route(
            "/api/v1/rooms/{room_id}/polls/{poll_id}/answer",
            post(polls::answer),
        )
        .route(
            "/api/v1/rooms/{room_id}/polls/{poll_id}/close",
            post(polls::close),
        )
        // The Pre-Canned list. A sibling of `/polls`, not a child: a template is not a poll in
        // some state, and nesting it under `{poll_id}` would imply it has one.
        .route(
            "/api/v1/rooms/{room_id}/saved-polls",
            get(polls::list_saved).post(polls::create_saved),
        )
        .route(
            "/api/v1/rooms/{room_id}/saved-polls/{saved_poll_id}",
            delete(polls::remove_saved),
        )
        // ---------------------------------------------------------------- membership
        .route(
            "/api/v1/rooms/{room_id}/me/display-name",
            put(moderation::rename_self),
        )
        .route(
            "/api/v1/rooms/{room_id}/me/muted",
            get(moderation::muted_list),
        )
        .route(
            "/api/v1/rooms/{room_id}/members/{member_id}/mute",
            post(moderation::mute_member).delete(moderation::unmute_member),
        )
        .route(
            "/api/v1/rooms/{room_id}/members/{member_id}/personal-mute",
            post(moderation::mute_personally).delete(moderation::unmute_personally),
        )
        // ---------------------------------------------------------------- account
        .route(
            "/api/v1/account",
            get(account::bootstrap).patch(account::update_profile),
        )
        .route(
            "/api/v1/account/preferences",
            get(account::preferences).patch(account::set_preference),
        )
        .route("/api/v1/account/theme", put(account::save_theme))
}
