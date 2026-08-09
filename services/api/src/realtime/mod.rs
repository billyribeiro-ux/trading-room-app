//! Realtime: the WebSocket that replaces the five-second poll.
//!
//! The SvelteKit room called `invalidate('room:data')` every five seconds
//! (`src/routes/+page.svelte:3390-3421`), refetching the entire room whether or not anything
//! had changed. That is the thing being deleted.
//!
//! # The envelope is the SFU's, deliberately
//!
//! `tradingroom-media` already speaks a request/reply/notification envelope over WebSocket
//! (`services/media/src/server.rs:1440-1454`) that has been in use and under test:
//!
//! ```text
//! request       {id, cmd, data?}
//! reply         {id, ok, data|error{code,message}}
//! notification  {notify, data}          <- no `id`, so it can never be mistaken for a reply
//! ```
//!
//! Reusing it means a browser holds one mental model for both sockets, and the absent `id` on
//! a notification is a structural guarantee rather than a convention.
//!
//! # Ordered and resumable
//!
//! Every event carries a `seq` from `room_events`, written in the same transaction as the
//! mutation. A reconnecting client sends the last `seq` it applied and receives the gap; if
//! the gap is larger than [`MAX_REPLAY`] it is told to `resync` instead, because at that point
//! a full refetch is cheaper than the catch-up. Commands are never replayed - only events.
//!
//! # Backpressure
//!
//! A subscriber that falls behind is closed with 1013 and the reason `resync`, which is the
//! SFU's own slow-consumer policy (`services/media/src/server.rs:987-988`). Lag therefore
//! costs a reconnect, never a lost event: the client comes back with its cursor and the gap is
//! replayed from Postgres. This is the property that makes the in-memory broadcast channel
//! safe to be lossy - it is an accelerator, not the source of truth.

pub mod hub;
pub mod protocol;
pub mod relay;

use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use axum::response::Response;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;

use crate::auth::extract::RoomMember;
use crate::db::repo::event;
use crate::error::ApiError;
use crate::http::AppState;
use crate::realtime::protocol::{Notification, Reply, Request};

/// Most a client may catch up in one go.
///
/// Past this, replaying is slower than refetching, and holding a very long catch-up in memory
/// to serialise it is its own risk. The client is told to `resync`.
pub const MAX_REPLAY: i64 = 500;

/// Largest frame accepted from a client, matching the SFU's own cap.
pub const MAX_FRAME_BYTES: usize = 256 * 1024;

#[derive(Debug, Deserialize)]
pub struct ConnectQuery {
    /// The last `seq` this client applied. Absent means "start from now" - a fresh client is
    /// not sent the room's entire history as though it had missed it.
    pub after_seq: Option<i64>,
}

/// Upgrades to a WebSocket for one room.
///
/// The `RoomMember` extractor runs *before* the upgrade, so an unauthenticated or non-member
/// request is refused with an ordinary HTTP status rather than being upgraded and then closed -
/// which a browser reports as an opaque connection failure with no status to act on.
pub async fn connect(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    member: RoomMember,
    Query(query): Query<ConnectQuery>,
    upgrade: WebSocketUpgrade,
) -> Result<Response, ApiError> {
    if let Err(error) =
        crate::http::origin::require_exact_browser_origin(&headers, &state.trusted_web_origin)
    {
        tracing::warn!(reason = error.reason(), "refused realtime browser origin");
        return Err(ApiError::Forbidden);
    }

    let after_seq = query.after_seq;

    Ok(upgrade
        .max_message_size(MAX_FRAME_BYTES)
        .on_upgrade(move |socket| serve(socket, state, member, after_seq)))
}

async fn serve(
    socket: WebSocket,
    state: Arc<AppState>,
    member: RoomMember,
    after_seq: Option<i64>,
) {
    let room_id = member.room_id;
    let member_id = member.member_id;
    let role = member.capabilities.role;

    // Subscribed *before* the catch-up read, so an event committed between the two is
    // delivered by the live channel rather than falling into the gap between them.
    let mut events = state.hub.subscribe(room_id);

    // Incremented here and decremented on every return path below, so the gauge cannot drift
    // upward when a socket closes for an unusual reason. `Guard` rather than a decrement at
    // each `return` for exactly that reason - there are seven of them.
    let _open = SocketGuard::new(&state);

    let (mut sink, mut stream) = socket.split();

    // Catch up, or tell the client to start over.
    let start_at = match catch_up(&state, &member, after_seq).await {
        Ok(CatchUp::From(seq, missed)) => {
            for event in missed {
                if !event.reaches(role, member_id) {
                    continue;
                }
                if send(&mut sink, &Notification::event(&event)).await.is_err() {
                    return;
                }
            }
            seq
        }
        Ok(CatchUp::Resync) => {
            let _ = send(&mut sink, &Notification::resync()).await;
            0
        }
        Err(error) => {
            tracing::warn!(%error, %room_id, "could not prepare the realtime catch-up");
            let _ = sink.send(close_frame(1011, "unavailable")).await;
            return;
        }
    };

    if send(&mut sink, &Notification::ready(start_at))
        .await
        .is_err()
    {
        return;
    }

    let mut shutdown = state.shutdown.subscribe();

    loop {
        // `biased` with shutdown first, so a draining process stops accepting work rather
        // than racing a busy room for the chance to notice. The SFU's loop shape.
        tokio::select! {
            biased;

            _ = shutdown.recv() => {
                let _ = sink.send(close_frame(1001, "going away")).await;
                return;
            }

            received = events.recv() => match received {
                Ok(event) => {
                    if !event.reaches(role, member_id) {
                        continue;
                    }
                    if send(&mut sink, &Notification::event(&event)).await.is_err() {
                        return;
                    }
                }
                // Fell behind. Close rather than skip: the client reconnects with its cursor
                // and the gap is replayed from Postgres, so lag costs a reconnect and never
                // an event.
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    tracing::debug!(%room_id, %member_id, skipped, "subscriber lagged; asking it to resync");
                    let _ = send(&mut sink, &Notification::resync()).await;
                    let _ = sink.send(close_frame(1013, "resync")).await;
                    return;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => return,
            },

            incoming = stream.next() => match incoming {
                Some(Ok(Message::Text(text))) => {
                    let reply = handle(&state, &member, &text).await;
                    if send(&mut sink, &reply).await.is_err() {
                        return;
                    }
                }
                Some(Ok(Message::Ping(payload))) => {
                    if sink.send(Message::Pong(payload)).await.is_err() {
                        return;
                    }
                }
                Some(Ok(Message::Close(_))) | None => return,
                Some(Ok(_)) => {}
                Some(Err(_)) => return,
            },
        }
    }
}

enum CatchUp {
    /// Start from this sequence, having sent the listed events.
    From(i64, Vec<event::Event>),
    /// The gap is too large to replay; the client should refetch.
    Resync,
}

async fn catch_up(
    state: &Arc<AppState>,
    member: &RoomMember,
    after_seq: Option<i64>,
) -> Result<CatchUp, ApiError> {
    let mut tx = state.db.begin_tenant(member.ctx()).await?;

    let outcome = match after_seq {
        // A fresh client starts at the head, not at the beginning of time.
        None => CatchUp::From(
            event::latest_seq(&mut tx, member.room_id).await?,
            Vec::new(),
        ),
        Some(seq) => {
            // One more than the cap, purely to tell "exactly at the limit" from "beyond it".
            let missed = event::replay(&mut tx, member.room_id, seq, MAX_REPLAY + 1).await?;
            if missed.len() as i64 > MAX_REPLAY {
                CatchUp::Resync
            } else {
                let head = missed.last().map_or(seq, |event| event.seq);
                CatchUp::From(head, missed)
            }
        }
    };

    tx.commit().await?;
    Ok(outcome)
}

/// Handles one client command.
///
/// Commands are deliberately few: this socket exists to *push*. Mutations go through the HTTP
/// API, where the body limit, the timeout layer and the capability checks already live, and
/// duplicating them here would be two implementations of the same authorization.
async fn handle(state: &Arc<AppState>, member: &RoomMember, text: &str) -> Reply {
    let request: Request = match serde_json::from_str(text) {
        Ok(request) => request,
        Err(error) => {
            return Reply::error(None, "invalid", &format!("malformed request: {error}"));
        }
    };

    match request.cmd.as_str() {
        // A liveness probe the client can time, distinct from a protocol-level ping.
        "ping" => Reply::ok(request.id, serde_json::json!({ "pong": true })),

        // Explicit catch-up, for a client that would rather not reconnect.
        "resume" => {
            let after = request
                .data
                .as_ref()
                .and_then(|data| data.get("afterSeq"))
                .and_then(serde_json::Value::as_i64)
                .unwrap_or(0);

            match catch_up(state, member, Some(after)).await {
                Ok(CatchUp::From(seq, missed)) => {
                    let role = member.capabilities.role;
                    let visible: Vec<_> = missed
                        .into_iter()
                        .filter(|event| event.reaches(role, member.member_id))
                        .collect();
                    Reply::ok(
                        request.id,
                        serde_json::json!({ "seq": seq, "events": visible }),
                    )
                }
                Ok(CatchUp::Resync) => Reply::ok(
                    request.id,
                    serde_json::json!({ "resync": true, "reason": "gap too large" }),
                ),
                Err(error) => {
                    tracing::warn!(%error, "resume failed");
                    Reply::error(request.id, "unavailable", "could not resume")
                }
            }
        }

        other => Reply::error(
            request.id,
            "unknownCommand",
            &format!("this socket does not handle {other:?}"),
        ),
    }
}

async fn send<T: serde::Serialize>(
    sink: &mut futures_util::stream::SplitSink<WebSocket, Message>,
    value: &T,
) -> Result<(), ()> {
    let json = serde_json::to_string(value).map_err(|_| ())?;
    sink.send(Message::Text(json.into())).await.map_err(|_| ())
}

/// Keeps `websockets_open` honest.
///
/// A gauge decremented by hand at each exit is a gauge that drifts the first time somebody adds
/// an eighth `return`. `Drop` runs on all of them, including a panic.
struct SocketGuard<'a> {
    state: &'a Arc<AppState>,
}

impl<'a> SocketGuard<'a> {
    fn new(state: &'a Arc<AppState>) -> Self {
        state
            .metrics
            .websockets_open
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Self { state }
    }
}

impl Drop for SocketGuard<'_> {
    fn drop(&mut self) {
        self.state
            .metrics
            .websockets_open
            .fetch_sub(1, std::sync::atomic::Ordering::Relaxed);
    }
}

fn close_frame(code: u16, reason: &'static str) -> Message {
    Message::Close(Some(axum::extract::ws::CloseFrame {
        code,
        reason: reason.into(),
    }))
}
