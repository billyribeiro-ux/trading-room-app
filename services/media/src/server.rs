//! The signalling surface: one HTTP health endpoint and one WebSocket per peer.
//!
//! Everything below this module is media plumbing that knows nothing about a socket -
//! [`crate::worker_pool`] owns processes, [`crate::router_registry`] owns rooms,
//! [`crate::session`] owns one peer's transports. This module is the only place those meet a
//! network connection, an untrusted byte and a shutdown signal.
//!
//! # The wire is ours
//!
//! The captured deployment speaks socket.io with a single `"cmd"` event and an ack callback
//! (`docs/source/main.d6d3c112b59b7d0d.js`, 20 `socket.emit("cmd", ...)` sites between bytes
//! 1075869 and 1108608). We write the SvelteKit client, so we are not obliged to reproduce that
//! transport - and the transport produces no user-visible artefact, unlike the codec order, which
//! we *are* obliged to reproduce and which lives in [`crate::codecs`]. So this is a plain axum
//! WebSocket carrying JSON.
//!
//! What we do keep from the capture is the *shape* of the conversation, because it is what the
//! mediasoup-client API forces on any client: a request/ack protocol where the client awaits every
//! reply (`transport.on('connect', (params, callback) => ...)` cannot proceed until the server
//! answers). Hence a request id on every frame.
//!
//! ## Envelope
//!
//! Three frame types, all `Message::Text` holding one JSON object. They are told apart by which
//! key is present, which is the only discriminator a client needs:
//!
//! ```json
//! // client -> server, a request. `data` may be omitted for commands that take no payload.
//! { "id": 7, "cmd": "produce", "data": { ... } }
//!
//! // server -> client, the reply to request 7. Exactly one of `data` / `error` is present.
//! { "id": 7, "ok": true,  "data": { ... } }
//! { "id": 7, "ok": false, "error": { "code": "unknownTransport", "message": "..." } }
//!
//! // server -> client, unsolicited. Never carries an `id`, so it can never be mistaken for a reply.
//! { "notify": "newProducer", "data": { ... } }
//! ```
//!
//! `id` is chosen by the client and echoed verbatim; the server never invents one. A frame the
//! server could not parse *at all* is answered with `{"id": null, "ok": false, ...}` rather than
//! silently dropped - a client that sent a malformed request would otherwise wait forever on a
//! promise nothing will ever resolve, which is exactly the hang the captured client suffers from on
//! a bad `consume` ack (byte 1094980: its only rejection path compares the whole ack to the literal
//! string `"error"`).
//!
//! ## Commands
//!
//! | `cmd`                      | `data` in                                              | `data` out                                    |
//! |----------------------------|--------------------------------------------------------|-----------------------------------------------|
//! | `getRouterRtpCapabilities` | -                                                      | `{ routerRtpCapabilities }`                   |
//! | `createWebRtcTransport`    | `{ producing, consuming }`                             | `{ id, iceParameters, iceCandidates, dtlsParameters }` |
//! | `connectTransport`         | `{ transportId, dtlsParameters }`                      | `{}`                                          |
//! | `produce`                  | `{ transportId, kind, rtpParameters, appData? }`       | `{ id }`                                      |
//! | `consume`                  | `{ transportId, producerId, rtpCapabilities }`         | `{ id, producerId, kind, rtpParameters, type, producerPaused }` |
//! | `resumeConsumer`           | `{ consumerId }`                                       | `{}`                                          |
//! | `closeConsumer`            | `{ consumerId }`                                       | `{}`                                          |
//! | `closeProducer`            | `{ producerId }`                                       | `{}`                                          |
//! | `pauseProducer`            | `{ producerId }`                                       | `{}`                                          |
//! | `resumeProducer`           | `{ producerId }`                                       | `{}`                                          |
//! | `getProducers`             | -                                                      | `{ producers: [...] }`                        |
//! | `close`                    | -                                                      | `{}`, then the socket closes                  |
//!
//! `getRouterRtpCapabilities` is named after the mediasoup-client option it feeds
//! (`device.load({ routerRtpCapabilities })`) rather than after the captured ack's `capabilities`
//! key (byte 1076868), because our client is the one reading it.
//!
//! Consumers are created **paused** by [`crate::session::Session::consume`] and only start flowing
//! on `resumeConsumer` - mediasoup's own prescription, and what the captured client's unconditional
//! `resumeConsumer` (byte 1095244) is written against.
//!
//! ## Notifications
//!
//! | `notify`          | when                                     | `data`                                                        |
//! |-------------------|------------------------------------------|---------------------------------------------------------------|
//! | `connected`       | immediately, before any command           | `{ peerId, room, userId, displayName, role }`                 |
//! | `newProducer`     | another peer in the room produced         | `{ producerId, peerId, userId, displayName, kind, appData }`  |
//! | `producerPaused`  | another peer paused one producer          | `{ producerId, peerId }`                                      |
//! | `producerResumed` | another peer resumed one producer         | `{ producerId, peerId }`                                      |
//! | `producerClosed`  | another peer closed one producer          | `{ producerId, peerId }`                                      |
//! | `peerClosed`      | another peer's socket went away           | `{ peerId, userId, producerIds }`                             |
//!
//! The captured client has *no* server-push handler at all - its media socket registers exactly
//! three listeners (`cmd`, `connect`, `disconnect`, bytes 1074672/1074851/1075778) and learns who is
//! producing from a **different** socket, the room/chat one, via `getSessionMediaState` (bytes
//! 1013700-1014900). We have one socket, so the SFU that already knows about a new producer tells
//! the room directly instead of routing that fact through a second server.
//!
//! **`newProducer` is at-least-once, and a client must dedupe by `producerId`.** A peer is put in the
//! room's fan-out list *before* it joins the room, so a producer that appears during its handshake is
//! queued rather than lost; the cost is that the same producer can arrive both as a push and in the
//! `getProducers` snapshot. Losing one is a permanently blank tile, so duplicating is the right side
//! to err on.
//!
//! A peer whose notification queue fills up ([`NOTIFICATION_BACKLOG`]) is dropped from the fan-out
//! and its socket closed. Dropping the *notification* instead would leave that peer permanently
//! missing a stream with no way to find out; forcing a reconnect makes it re-snapshot.
//!
//! # Admission: the grant is a query parameter on the upgrade
//!
//! `GET /ws?grant=<token>`, verified by [`crate::grant`] **before the upgrade is granted**. The
//! alternative - accept the socket and require a `hello` message first - was rejected:
//!
//! * An unauthenticated peer would get a real socket, a spawned task, a read buffer and a timer it
//!   can hold open until it expires. Refusing at the HTTP layer means an unauthenticated peer gets
//!   a 401 and nothing else: no task, no session, no room, no router. The test
//!   `an_unauthenticated_socket_is_refused_before_it_can_issue_a_command` asserts exactly that
//!   across eight ways of getting it wrong, including that no room was created on the way.
//! * The first-message design needs a whole second state machine - "socket open but not yet
//!   authenticated" - and every command handler then has to be trusted to check a flag. Here there
//!   is no such state to get wrong: reaching [`serve_peer`] *is* the proof of admission.
//!
//! The browser cannot set request headers on a WebSocket, so `Authorization:` was never available;
//! query parameter or `Sec-WebSocket-Protocol` smuggling are the only two options, and the latter
//! abuses a field with real meaning. The honest cost of a query parameter is that it lands in access
//! and proxy logs. That is bounded by the grant's own design - a single-use-shaped admission ticket
//! with a five-minute ceiling ([`crate::grant::MAX_GRANT_TTL_SECONDS`]) rather than a session token -
//! and by TLS on the signalling socket. (The app already puts its far longer-lived session id in a
//! URL path segment, `src/routes/+page.svelte:2223`, so this is not a new class of exposure.)
//!
//! No percent-encoding subtlety either: the grant's alphabet is base64url plus `.`
//! (`grant.rs` wire format), every character of which is URL-safe, so the token survives a query
//! string unescaped and round-trips byte for byte.
//!
//! **The room comes from the grant, never from the request.** `?room=` is read *only* in anonymous
//! development mode, where by definition nothing vouches for it. A peer holding a grant for room A
//! cannot reach room B by asking, and `the_room_comes_from_the_grant_not_the_query_string` pins that.
//!
//! Refusals are opaque on the wire - one 401 with one message for every reason - and detailed in the
//! log, because `grant.rs` asks for exactly that: telling a caller which check failed turns the
//! endpoint into an oracle for probing grants.
//!
//! ## The number of sockets is capped, not just what each one may take
//!
//! [`crate::session`] caps transports, producers and consumers per peer, which bounds what one
//! socket can take but says nothing about how many sockets there are - and a grant is deliberately
//! replayable, so a peer holding one can open as many as it likes. The scarce resource is the RTC
//! port range, so the ceiling is that range restated as a number of peers ([`Config::max_peers`]),
//! claimed by compare-and-swap at the upgrade and released when the peer's task ends. Past it the
//! answer is a 503 with `atCapacity`, which is a far better failure than admitting the peer and
//! having some *other* participant's transport fail minutes later on a service reporting itself
//! healthy.
//!
//! ## Anonymous development mode cannot produce
//!
//! [`crate::grant::Admitted::Anonymous`] carries no verified identity, room *or* role, and its
//! documentation is explicit that "a caller must not treat it as a presenter". So this module does
//! not: an anonymous peer may consume but every `produce` is refused with `forbidden`.
//!
//! That is a real limitation and worth stating plainly rather than quietly widening: developing the
//! *sending* half locally means minting real grants against a development keypair, which is the ten
//! lines of Node in the `grant` module docs. The alternative - letting an unauthenticated peer
//! broadcast because the server happens to be in development mode - is the silently-open-door that
//! `GrantConfigError::MissingPublicKey` exists to prevent, arriving through a different door.
//!
//! # Shutdown
//!
//! `WebSocketUpgrade::on_upgrade` spawns its callback on a task of its own and returns the 101
//! response immediately (`axum-0.8.9/src/extract/ws.rs:347-377`, a bare `tokio::spawn`). So axum's
//! own graceful shutdown -
//! which waits for in-flight *HTTP* connections - does not wait for a single WebSocket peer. Left at
//! that, SIGTERM would stop the listener and then drop the process on top of live rooms.
//!
//! So [`serve`] does it in four ordered steps, and the order is the whole point, because mediasoup
//! closes an entity only when its last clone drops and every layer holds the one below it:
//!
//! 1. the signal fires, and a broadcast tells every peer task to wind down;
//! 2. each peer sends a close frame, closes its [`crate::session::Session`] (transports, producers,
//!    consumers) and drops its `RoomHandle`;
//! 3. the last handle for a room leaves, so [`crate::router_registry`] evicts it and its `Router`
//!    closes - which is what finally releases the `Worker` clone the router was holding;
//! 4. only now can [`crate::worker_pool::WorkerPool::shutdown`] close the workers.
//!
//! Step 4 before step 3 would close nothing at all. `graceful_shutdown_closes_peers_rooms_and_workers`
//! runs the sequence against real workers and asserts the end state.
//!
//! # Honest gaps
//!
//! * **A producer that dies on its own is not announced.** `producerClosed` fires on an explicit
//!   `closeProducer` and `peerClosed` covers a socket going away, but a producer killed by its own
//!   transport failing while the socket stays up is announced by neither: [`Session`] keeps its
//!   `Producer` handles private and exposes no close hook, so there is nothing here to subscribe to.
//!   A viewer's consumer *is* still closed - mediasoup propagates that itself
//!   (`consumer.rs:869`, exercised by `session`'s `closing_a_session_closes_its_media_...`) - so the
//!   media stops; it is the roster entry that goes stale until the peer reconnects.
//! * **A peer whose worker dies is not told; it has to notice.** [`crate::router_registry`] stops
//!   the *room* from outliving a dead worker - the next joiner gets a fresh router - but a peer
//!   already holding a [`Session`] on the dead one keeps a perfectly healthy signalling socket while
//!   every transport behind it is gone. Its commands then fail one at a time
//!   (`getRouterRtpCapabilities` with `roomGone`, anything else with a transport error) rather than
//!   the server closing the socket and making it re-handshake. Closing them properly needs the
//!   registry to observe `Router::on_close` and reach back into this module's fan-out, which is a
//!   channel neither module has today; and no test could cover it either, because mediasoup 0.24.3
//!   exposes no way to close a `Worker` from outside the crate.
//! * **No CORS layer.** `/health` is therefore not readable from a browser page on another origin.
//!   Left out rather than made permissive because there is no evidence in the repo for which origins
//!   should be allowed, and `Access-Control-Allow-Origin: *` is a decision, not a default.
//! * **No active-speaker signal, no stats.** The captured app uses neither - `getStats`,
//!   `restartIce` and `replaceTrack` have zero occurrences in its own code - so there is nothing to
//!   match against.
//!
//!   `setPreferredLayers` IS implemented, and deliberately beyond the capture. The captured app
//!   never calls it, but the captured app also never had several screens running at once from one
//!   presenter; with N simultaneous shares every consumer is otherwise forwarded the producer's top
//!   layer, so a viewer pays full resolution and full decode for screens sitting in background
//!   tabs. `setMaxSpatialLayer` is not implemented: it is a client-side convenience in
//!   mediasoup-client that resolves to the same server call. The app's `presenterTalking` window events have no producer anywhere in the repo
//!   either, so the payload an active-speaker notification should carry is not established.
//! * **The captured `consume` request's `ip` field is not implemented.** It is read from
//!   `muser.mediaValue.serverIP` (byte 1094837), but whether it selects a media node, drives a
//!   pipe-to-router or is merely advisory is server-side behaviour, and no server source is in the
//!   dump. Guessing would be inventing a multi-node routing policy from one field name.

use crate::config::Config;
use crate::grant::{Admitted, GrantVerifier, MediaUserId, Role, UnixTime, MAX_ROOM_ID_BYTES};
use crate::router_registry::RouterRegistry;
use crate::session::{Session, SessionError};
use crate::worker_pool::WorkerPool;

use axum::extract::ws::{CloseFrame, Message, Utf8Bytes, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State};
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use axum::{Json, Router};
use futures_util::{SinkExt, StreamExt};
use mediasoup::consumer::{ConsumerId, ConsumerLayers};
use mediasoup::producer::ProducerId;
use mediasoup::transport::TransportId;
use mediasoup::types::data_structures::DtlsParameters;
use mediasoup::types::rtp_parameters::{MediaKind, RtpCapabilities, RtpParameters};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fmt;
use std::future::Future;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::time::Duration;
use thiserror::Error;
use tokio::net::TcpListener;
use tokio::sync::{broadcast, mpsc, Notify};
use tower_http::trace::TraceLayer;
use tracing::Instrument;
use uuid::Uuid;

/// The largest signalling frame a peer may send.
///
/// The biggest legitimate payload is a `consume` request carrying a browser's full
/// `rtpCapabilities`, which is a few kilobytes; 256 KiB is two orders of magnitude of headroom and
/// still refuses the 64 MiB tungstenite would otherwise buffer by default
/// (`tungstenite-0.29.0/src/protocol/mod.rs:101`, `max_message_size: Some(64 << 20)`) for an
/// authenticated but hostile peer.
const MAX_MESSAGE_BYTES: usize = 256 * 1024;

/// Maximum concurrent signalling sockets for one verified media identity.
///
/// Grants remain short-lived bearer credentials and may be retried after a network failure, but
/// replaying one grant must not let one account consume the SFU's entire global port budget. Four
/// concurrent devices/tabs is an explicit reviewed abuse-control policy, not a value recovered
/// from the legacy capture. A larger product allowance belongs in an authenticated entitlement
/// issued by the control plane, never in an unbounded SFU default.
const MAX_CONNECTIONS_PER_VERIFIED_USER: usize = 4;

/// Ceiling on one caption line.
///
/// A speech-recognition result is a sentence or two; the captured client emits at most every 500ms
/// (`isFinal || now - last >= 500`). This bounds what one presenter can fan out to the whole room on
/// every result, without being tight enough to truncate real speech.
const MAX_SPEECH_RECO_CHARS: usize = 2_000;

/// Notifications a peer may fall behind by before its socket is closed.
///
/// A room would have to churn 256 producers while one peer's socket is blocked to reach this. See
/// the module docs for why the peer is closed rather than the notification dropped.
const NOTIFICATION_BACKLOG: usize = 256;

/// How long [`serve`] waits for peers to close themselves after the shutdown signal.
const SHUTDOWN_DRAIN_TIMEOUT: Duration = Duration::from_secs(10);

/// RFC 6455 §7.4.1 "going away" - the server is shutting down, and the peer should reconnect
/// elsewhere rather than treat this as an error.
const CLOSE_GOING_AWAY: u16 = 1001;
/// RFC 6455 §7.4.1 "internal error".
const CLOSE_INTERNAL_ERROR: u16 = 1011;

/// One connected socket.
///
/// Deliberately not the user id: the same person in two browser tabs is two peers with two sets of
/// transports, and a roster keyed by user id would have them overwrite each other. `uid` travels
/// alongside as a label.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
pub struct PeerId(Uuid);

impl PeerId {
    fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl fmt::Display for PeerId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.0.fmt(f)
    }
}

/// Who a connected peer is, decided once at the upgrade and immutable afterwards.
///
/// `user_id`, `display_name` and `role` are `None` for an anonymous development peer and `Some` for
/// a peer that presented a verified grant. There is no third state: a peer that fails verification
/// never reaches this type.
#[derive(Debug, Clone)]
pub struct PeerIdentity {
    pub id: PeerId,
    pub room: String,
    pub user_id: Option<MediaUserId>,
    pub display_name: Option<String>,
    pub role: Option<Role>,
}

impl PeerIdentity {
    /// Whether this peer may create producers.
    ///
    /// `None` - an anonymous development peer - is not a presenter. See the module docs.
    #[must_use]
    pub fn may_produce(&self) -> bool {
        self.role.is_some_and(Role::can_produce)
    }
}

/// What `/health` answers.
///
/// `workerDeaths` is the field that earns this endpoint. A pool that is quietly replacing a worker
/// every few minutes serves every request perfectly - the replacement is in-place and rooms created
/// afterwards land on a live process ([`crate::worker_pool`]) - so latency, error rate and uptime
/// all look fine while every session that was on the dead worker was dropped. A monotonically
/// climbing count is the only externally visible symptom.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Health {
    pub status: &'static str,
    pub workers: usize,
    pub worker_deaths: usize,
    pub rooms: usize,
    pub peers: usize,
    /// `"require-grant"` or `"allow-anonymous"`, so an operator can see from outside whether
    /// admission is actually on.
    pub admission: &'static str,
}

/// One producer as the rest of the room sees it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProducerInfo {
    pub producer_id: ProducerId,
    pub peer_id: PeerId,
    pub user_id: Option<MediaUserId>,
    pub display_name: Option<String>,
    pub kind: MediaKind,
    /// The producing client's own tag - `{share, screenName, ...}` in the capture (byte 1104332) -
    /// echoed so a viewer can tell a screen share from a webcam on the same `video` kind.
    pub app_data: Value,
}

/// Fan-out state for one room. Distinct from [`RouterRegistry`]'s rooms on purpose: that one owns
/// the mediasoup `Router` and must evict at zero peers, this one owns only who to tell about what.
///
/// The peer labels a notification carries (`userId`, `displayName`) live on [`ProducerInfo`] rather
/// than beside the channel: a producer's owner has to stay describable for as long as the producer
/// is in the roster, which is not the same lifetime as the socket that made it.
#[derive(Default)]
struct RoomHub {
    peers: HashMap<PeerId, mpsc::Sender<Message>>,
    producers: HashMap<ProducerId, ProducerInfo>,
}

/// Everything the HTTP handlers share.
pub struct AppState {
    pool: Arc<WorkerPool>,
    registry: RouterRegistry,
    config: Config,
    verifier: Arc<GrantVerifier>,
    rooms: Mutex<HashMap<String, RoomHub>>,
    shutdown: broadcast::Sender<()>,
    live_connections: AtomicUsize,
    connections_by_user: Mutex<HashMap<MediaUserId, usize>>,
    drained: Notify,
}

impl AppState {
    #[must_use]
    pub fn new(
        pool: Arc<WorkerPool>,
        registry: RouterRegistry,
        config: Config,
        verifier: Arc<GrantVerifier>,
    ) -> Arc<Self> {
        let (shutdown, _) = broadcast::channel(1);
        Arc::new(Self {
            pool,
            registry,
            config,
            verifier,
            rooms: Mutex::new(HashMap::new()),
            shutdown,
            live_connections: AtomicUsize::new(0),
            connections_by_user: Mutex::new(HashMap::new()),
            drained: Notify::new(),
        })
    }

    #[must_use]
    pub fn health(&self) -> Health {
        Health {
            status: "ok",
            workers: self.pool.worker_count(),
            worker_deaths: self.pool.deaths(),
            rooms: self.registry.room_count(),
            peers: self.live_connections.load(Ordering::SeqCst),
            admission: if self.verifier.requires_grant() {
                "require-grant"
            } else {
                "allow-anonymous"
            },
        }
    }

    /// Peers currently holding a socket, including one still completing its handshake.
    #[must_use]
    pub fn peer_count(&self) -> usize {
        self.live_connections.load(Ordering::SeqCst)
    }

    /// Tells every peer task to wind down. Idempotent; safe with no peers connected.
    pub fn begin_shutdown(&self) {
        // `Err` only means nobody is listening, which is the empty-server case.
        let _ = self.shutdown.send(());
    }

    /// The critical sections under this lock are map operations with no `await` and nothing
    /// fallible, so a poisoned lock cannot mean a half-updated hub. Same reasoning as
    /// `router_registry::RouterRegistry::rooms`.
    fn hub(&self) -> MutexGuard<'_, HashMap<String, RoomHub>> {
        self.rooms.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// Subscribes a peer to its room's notifications. Called *before* the room is joined, so
    /// nothing raised during the handshake is missed.
    fn join_hub(&self, identity: &PeerIdentity) -> mpsc::Receiver<Message> {
        let (notifications, inbox) = mpsc::channel(NOTIFICATION_BACKLOG);
        self.hub()
            .entry(identity.room.clone())
            .or_default()
            .peers
            .insert(identity.id, notifications);
        inbox
    }

    /// Unsubscribes a peer and forgets its producers, returning them so the room can be told.
    fn leave_hub(&self, identity: &PeerIdentity) -> Vec<ProducerId> {
        let mut hub = self.hub();
        let Some(room) = hub.get_mut(&identity.room) else {
            return Vec::new();
        };

        room.peers.remove(&identity.id);
        let mine: Vec<ProducerId> = room
            .producers
            .iter()
            .filter(|(_, info)| info.peer_id == identity.id)
            .map(|(producer_id, _)| *producer_id)
            .collect();
        for producer_id in &mine {
            room.producers.remove(producer_id);
        }

        // Producers as well as peers, because the two can be out of step: `notify_room` drops a
        // peer that has fallen too far behind from `peers` while its `producers` stay until its own
        // task gets here. Evicting on an empty `peers` alone would then delete a *still-producing*
        // peer's roster entries on some unrelated peer's departure, and that peer's own teardown
        // would afterwards find nothing to announce - so its viewers would keep a tile for a stream
        // that no longer exists, with no `peerClosed` naming the producer ids to take it away.
        if room.peers.is_empty() && room.producers.is_empty() {
            hub.remove(&identity.room);
        }
        mine
    }

    fn record_producer(
        &self,
        identity: &PeerIdentity,
        producer_id: ProducerId,
        kind: MediaKind,
        app_data: Value,
    ) -> ProducerInfo {
        let info = ProducerInfo {
            producer_id,
            peer_id: identity.id,
            user_id: identity.user_id,
            display_name: identity.display_name.clone(),
            kind,
            app_data,
        };
        if let Some(room) = self.hub().get_mut(&identity.room) {
            room.producers.insert(producer_id, info.clone());
        }
        info
    }

    /// Forgets a producer, but only if this peer owns it - the ownership check that stops one peer
    /// erasing another's tile from the roster is here, not only in [`Session`].
    fn forget_producer(&self, identity: &PeerIdentity, producer_id: ProducerId) {
        if let Some(room) = self.hub().get_mut(&identity.room) {
            if room
                .producers
                .get(&producer_id)
                .is_some_and(|info| info.peer_id == identity.id)
            {
                room.producers.remove(&producer_id);
            }
        }
    }

    /// Every producer in the room except this peer's own. A peer consuming itself would be a loop.
    fn producers_visible_to(&self, identity: &PeerIdentity) -> Vec<ProducerInfo> {
        self.hub()
            .get(&identity.room)
            .map(|room| {
                room.producers
                    .values()
                    .filter(|info| info.peer_id != identity.id)
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Fans a notification out to a room, skipping `except`.
    ///
    /// A peer that cannot keep up is removed here; dropping its sender is what ends its read loop.
    fn notify_room(&self, room_id: &str, except: PeerId, notification: &Message) {
        let mut hub = self.hub();
        let Some(room) = hub.get_mut(room_id) else {
            return;
        };

        let mut evicted = Vec::new();
        for (peer_id, notifications) in &room.peers {
            if *peer_id == except {
                continue;
            }
            if let Err(error) = notifications.try_send(notification.clone()) {
                match error {
                    mpsc::error::TrySendError::Full(_) => tracing::warn!(
                        peer = %peer_id,
                        room = %room_id,
                        backlog = NOTIFICATION_BACKLOG,
                        "peer is too far behind on notifications; closing its socket so it re-snapshots"
                    ),
                    // Its task has already gone; `leave_hub` simply has not run yet.
                    mpsc::error::TrySendError::Closed(_) => {}
                }
                evicted.push(*peer_id);
            }
        }
        for peer_id in evicted {
            room.peers.remove(&peer_id);
        }
    }

    /// Waits for every peer task to finish, or gives up after `limit` and says so.
    async fn wait_until_drained(&self, limit: Duration) {
        let wait = async {
            loop {
                // Armed before the count is re-read, so a peer that finishes in the gap wakes this
                // rather than leaving it parked until the timeout.
                let notified = self.drained.notified();
                tokio::pin!(notified);
                notified.as_mut().enable();

                if self.live_connections.load(Ordering::SeqCst) == 0 {
                    return;
                }
                notified.await;
            }
        };

        if tokio::time::timeout(limit, wait).await.is_err() {
            tracing::warn!(
                peers = self.live_connections.load(Ordering::SeqCst),
                seconds = limit.as_secs(),
                "peers did not close within the shutdown grace period; closing workers anyway"
            );
        }
    }
}

impl fmt::Debug for AppState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let health = self.health();
        f.debug_struct("AppState")
            .field("workers", &health.workers)
            .field("worker_deaths", &health.worker_deaths)
            .field("rooms", &health.rooms)
            .field("peers", &health.peers)
            .field("admission", &health.admission)
            .finish()
    }
}

/// Counts one live peer for the whole life of its task, including on unwind.
///
/// RAII rather than a decrement at the end of [`serve_peer`], for the reason `RoomHandle` and
/// `TransportSlot` are: the paths that skip an explicit release - an early return, a cancelled
/// task, a panic - are exactly the paths that would leave shutdown waiting on a peer that is
/// already gone.
struct LiveConnection {
    state: Arc<AppState>,
    user_id: Option<MediaUserId>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ConnectionCapacity {
    Global,
    VerifiedUser,
}

impl LiveConnection {
    /// Claims one of [`Config::max_peers`] slots, or refuses because the SFU is full.
    ///
    /// Compare-and-swap rather than "read, decide, increment": the decision and the claim have to
    /// be one step, or N sockets arriving together all read "there is room" and the ceiling does
    /// nothing at exactly the moment it exists for.
    fn try_acquire(
        state: &Arc<AppState>,
        user_id: Option<MediaUserId>,
    ) -> Result<Self, ConnectionCapacity> {
        // Serialize the identity count with the global claim. No await occurs under this lock.
        // Anonymous development sockets have no verified identity and remain global-limit only.
        let mut by_user = state
            .connections_by_user
            .lock()
            .unwrap_or_else(PoisonError::into_inner);
        if user_id.is_some_and(|id| {
            by_user.get(&id).copied().unwrap_or_default() >= MAX_CONNECTIONS_PER_VERIFIED_USER
        }) {
            return Err(ConnectionCapacity::VerifiedUser);
        }

        let limit = state.config.max_peers();
        let mut live = state.live_connections.load(Ordering::SeqCst);
        loop {
            if live >= limit {
                return Err(ConnectionCapacity::Global);
            }
            match state.live_connections.compare_exchange_weak(
                live,
                live + 1,
                Ordering::SeqCst,
                Ordering::SeqCst,
            ) {
                Ok(_) => {
                    if let Some(id) = user_id {
                        *by_user.entry(id).or_default() += 1;
                    }
                    return Ok(Self {
                        state: Arc::clone(state),
                        user_id,
                    });
                }
                Err(actual) => live = actual,
            }
        }
    }
}

impl Drop for LiveConnection {
    fn drop(&mut self) {
        if let Some(id) = self.user_id {
            let mut by_user = self
                .state
                .connections_by_user
                .lock()
                .unwrap_or_else(PoisonError::into_inner);
            if let Some(count) = by_user.get_mut(&id) {
                *count -= 1;
                if *count == 0 {
                    by_user.remove(&id);
                }
            }
        }
        if self.state.live_connections.fetch_sub(1, Ordering::SeqCst) == 1 {
            self.state.drained.notify_waiters();
        }
    }
}

/// A peer's place in its room's fan-out list, released on drop.
///
/// RAII for the same reason [`LiveConnection`] is, and it is the *last* piece of per-peer state
/// that was not: the session's transports close from `Session`'s own `Drop` and the room reference
/// from `RoomHandle`'s, but leaving the hub was plain trailing statements at the end of
/// [`serve_peer`]. Anything that skipped them (an unwind out of a command, or a `return` added
/// later) stranded this peer's sender and every one of its [`ProducerInfo`]s in [`AppState::rooms`]
/// permanently: a ghost in every future joiner's `getProducers`, with a producer id that can never
/// be consumed because the mediasoup producer behind it died with the session.
///
/// Dropping it also sends `peerClosed`, because the notification and the removal are one fact about
/// the room and splitting them is what lets them get out of step.
struct HubMembership {
    state: Arc<AppState>,
    identity: PeerIdentity,
}

impl Drop for HubMembership {
    fn drop(&mut self) {
        // Forget the peer first so it is not told about its own departure, then tell everyone else.
        //
        // Sent unconditionally, including for a peer that produced nothing: `peerClosed` is a
        // roster fact, not only a media one, and a client that drew a tile the moment the peer
        // arrived needs the same event to take it away.
        let orphaned = self.state.leave_hub(&self.identity);
        self.state.notify_room(
            &self.identity.room,
            self.identity.id,
            &notification(
                "peerClosed",
                json!({
                    "peerId": self.identity.id,
                    "userId": self.identity.user_id,
                    "producerIds": orphaned,
                }),
            ),
        );
    }
}

/// The HTTP surface.
pub fn app(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health))
        // `any` rather than `get`: over HTTP/2 a WebSocket upgrade is a CONNECT, not a GET -
        // "For HTTP/1.1 requests, this extractor requires the request method to be `GET`; in later
        // versions, `CONNECT` is used instead. To support both, it should be used with `any`"
        // (`axum-0.8.9/src/extract/ws.rs:126-128`).
        .route("/ws", any(ws_upgrade))
        // Never use tower-http's default request span here: it records the full URI, and `/ws`
        // currently carries its short-lived bearer grant in the query string. Only a bounded
        // route label and the finite HTTP method are admitted to telemetry.
        .layer(
            TraceLayer::new_for_http().make_span_with(|request: &axum::http::Request<_>| {
                tracing::debug_span!(
                    "http.request",
                    method = %request.method(),
                    path = traced_path(request.uri().path())
                )
            }),
        )
        .with_state(state)
}

fn traced_path(path: &str) -> &'static str {
    match path {
        "/health" => "/health",
        "/ws" => "/ws",
        _ => "<unmatched>",
    }
}

/// Serves until `shutdown` completes, then closes peers, rooms and workers in that order.
///
/// See the module docs for why the order is not interchangeable.
pub async fn serve<F>(
    state: Arc<AppState>,
    listener: TcpListener,
    shutdown: F,
) -> std::io::Result<()>
where
    F: Future<Output = ()> + Send + 'static,
{
    let address = listener.local_addr()?;
    tracing::info!(
        %address,
        workers = state.pool.worker_count(),
        admission = state.health().admission,
        "media signalling server listening"
    );

    let signalled = Arc::clone(&state);
    let result = axum::serve(listener, app(Arc::clone(&state)))
        .with_graceful_shutdown(async move {
            shutdown.await;
            tracing::info!(
                peers = signalled.peer_count(),
                rooms = signalled.registry.room_count(),
                "shutdown signal received"
            );
            signalled.begin_shutdown();
        })
        .await;

    state.wait_until_drained(SHUTDOWN_DRAIN_TIMEOUT).await;
    // Only now: a worker whose router is still alive would not close, because every `Router` holds
    // a `Worker` clone.
    state.pool.shutdown().await;

    tracing::info!(
        rooms = state.registry.room_count(),
        "media signalling server stopped"
    );
    result
}

async fn health(State(state): State<Arc<AppState>>) -> Json<Health> {
    Json(state.health())
}

/// What a peer may put in the upgrade's query string.
#[derive(Debug, Deserialize)]
struct ConnectParams {
    /// The admission grant. Required unless this SFU is in anonymous development mode.
    grant: Option<String>,
    /// Read **only** in anonymous development mode. With a grant, the room is the grant's.
    room: Option<String>,
}

async fn ws_upgrade(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<ConnectParams>,
    upgrade: WebSocketUpgrade,
) -> Response {
    if let Err(error) = require_websocket_origin(&state, &headers) {
        tracing::warn!(reason = error.reason(), "refused websocket browser origin");
        return Refusal::Origin.into_response();
    }

    let identity = match admit(&state, params) {
        Ok(identity) => identity,
        Err(refusal) => return refusal.into_response(),
    };

    // Claimed here, before the 101, for the same reason the grant is checked here: a peer refused
    // at the HTTP layer gets no task, no session, no room and no ports. The claim is moved into the
    // callback, so it is released either by [`serve_peer`] finishing or - if the upgrade itself
    // fails and the callback is never run - by the closure being dropped.
    let live = match LiveConnection::try_acquire(&state, identity.user_id) {
        Ok(live) => live,
        Err(ConnectionCapacity::Global) => {
            tracing::warn!(
                reason = "global_connection_ceiling",
                peers = state.peer_count(),
                limit = state.config.max_peers(),
                "refused a peer: the server is at its connection ceiling"
            );
            return Refusal::AtCapacity.into_response();
        }
        Err(ConnectionCapacity::VerifiedUser) => {
            tracing::warn!(
                reason = "verified_user_connection_ceiling",
                limit = MAX_CONNECTIONS_PER_VERIFIED_USER,
                "refused a peer: the verified identity is at its connection ceiling"
            );
            return Refusal::AtCapacity.into_response();
        }
    };

    upgrade
        .max_message_size(MAX_MESSAGE_BYTES)
        // Hyper/tungstenite error display is not part of our stable logging contract. Keep it out
        // of telemetry so a future dependency cannot start echoing the grant-bearing request URI.
        .on_failed_upgrade(|_| tracing::warn!("websocket upgrade failed"))
        .on_upgrade(move |socket| connection(socket, state, identity, live))
}

/// Why a socket was not opened.
///
/// [`Refusal::Unauthorized`] carries no detail on purpose: `grant.rs` asks callers to "map the lot
/// to one opaque refusal on the wire", since naming the failed check makes this an oracle for
/// probing grants, and none of the detail is actionable by a legitimate client - whose only correct
/// response to any of them is to fetch a fresh grant from the app. The reason is logged instead.
enum Refusal {
    Origin,
    Unauthorized,
    BadRoom,
    /// Not opaque, unlike the others: this one is not a statement about the caller's grant, it is a
    /// statement about the server, and "come back in a moment" is the only refusal here a
    /// legitimate client can usefully act on.
    AtCapacity,
}

impl IntoResponse for Refusal {
    fn into_response(self) -> Response {
        match self {
            Refusal::Origin => (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": {
                        "code": "forbidden",
                        "message": "browser origin is not allowed",
                    }
                })),
            )
                .into_response(),
            Refusal::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": {
                        "code": "unauthorized",
                        "message": "a valid admission grant is required",
                    }
                })),
            )
                .into_response(),
            Refusal::BadRoom => (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "code": "badRoom",
                        "message": format!("?room= must be 1 to {MAX_ROOM_ID_BYTES} bytes"),
                    }
                })),
            )
                .into_response(),
            Refusal::AtCapacity => (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({
                    "error": {
                        "code": "atCapacity",
                        "message": "this media server is full; retry or use another one",
                    }
                })),
            )
                .into_response(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WebsocketOriginError {
    MissingConfiguration,
    Missing,
    Multiple,
    Mismatch,
    FetchSite,
}

impl WebsocketOriginError {
    const fn reason(self) -> &'static str {
        match self {
            Self::MissingConfiguration => "missing_allowed_origin_configuration",
            Self::Missing => "missing_origin",
            Self::Multiple => "multiple_origin_headers",
            Self::Mismatch => "origin_mismatch",
            Self::FetchSite => "fetch_site_not_same_origin",
        }
    }
}

/// Enforces the configured origin in every grant-enforcing deployment.
///
/// Anonymous local mode is deliberately explicit: without `MEDIA_ALLOWED_ORIGIN`, Origin is not
/// checked; with it, the exact same policy is applied. A grant-enforcing state that somehow
/// bypassed startup validation fails closed here rather than accepting every origin.
fn require_websocket_origin(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<(), WebsocketOriginError> {
    let allowed = match state.config.allowed_origin.as_deref() {
        Some(origin) => origin,
        None if state.verifier.requires_grant() => {
            return Err(WebsocketOriginError::MissingConfiguration);
        }
        None => return Ok(()),
    };

    let mut origins = headers.get_all(header::ORIGIN).iter();
    let origin = origins.next().ok_or(WebsocketOriginError::Missing)?;
    if origins.next().is_some() {
        return Err(WebsocketOriginError::Multiple);
    }
    if origin.as_bytes() != allowed.as_bytes() {
        return Err(WebsocketOriginError::Mismatch);
    }

    let mut fetch_sites = headers.get_all("sec-fetch-site").iter();
    match fetch_sites.next() {
        Some(site) if fetch_sites.next().is_some() || site.as_bytes() != b"same-origin" => {
            return Err(WebsocketOriginError::FetchSite);
        }
        Some(_) | None => {}
    }

    Ok(())
}

/// Turns whatever the peer presented into an identity, or into the reason it is refused.
fn admit(state: &AppState, params: ConnectParams) -> Result<PeerIdentity, Refusal> {
    let admitted = state
        .verifier
        .admit(params.grant.as_deref(), UnixTime::now())
        .map_err(|_| {
            // Never format parser errors here. Their text can contain attacker-controlled JSON
            // field names from the bearer token; one bounded static class is enough operationally.
            tracing::warn!(
                reason = "invalid_grant",
                "refused a peer at the websocket upgrade"
            );
            Refusal::Unauthorized
        })?;

    match admitted {
        Admitted::Verified(grant) => {
            if params.room.is_some() {
                // Not an error - an older client might still send it - but it is ignored, and a
                // silent difference between what a client asked for and what it got is worth a line.
                tracing::debug!(
                    room = %grant.room,
                    "ignoring the ?room= parameter; the room comes from the grant"
                );
            }
            Ok(PeerIdentity {
                id: PeerId::new(),
                room: grant.room,
                user_id: Some(grant.user),
                display_name: Some(grant.name),
                role: Some(grant.role),
            })
        }
        Admitted::Anonymous => {
            let room = params.room.unwrap_or_default();
            // The same structural bounds a grant's room id gets, because in this mode nobody else
            // is applying them and the id becomes a map key.
            if room.is_empty() || room.len() > MAX_ROOM_ID_BYTES {
                tracing::warn!(
                    bytes = room.len(),
                    "anonymous peer asked for a room id that is empty or over the limit"
                );
                return Err(Refusal::BadRoom);
            }

            Ok(PeerIdentity {
                id: PeerId::new(),
                room,
                user_id: None,
                display_name: None,
                role: None,
            })
        }
    }
}

/// Wraps the peer's whole life in one span, so every line a command logs - including the ones
/// [`Session`] and [`RouterRegistry`] emit underneath it - carries which peer and which room.
async fn connection(
    socket: WebSocket,
    state: Arc<AppState>,
    identity: PeerIdentity,
    live: LiveConnection,
) {
    let span = tracing::info_span!(
        "peer",
        peer = %identity.id,
        room = %identity.room,
        user = ?identity.user_id,
        role = ?identity.role,
    );
    serve_peer(socket, state, identity, live)
        .instrument(span)
        .await;
}

async fn serve_peer(
    socket: WebSocket,
    state: Arc<AppState>,
    identity: PeerIdentity,
    live: LiveConnection,
) {
    // Claimed at the upgrade (`ws_upgrade`) and released when this task ends, however it ends.
    let _live = live;
    let mut shutdown = state.shutdown.subscribe();
    let (mut outbound, mut inbound) = socket.split();

    // Subscribed before the room is joined: see the module docs on at-least-once delivery.
    let mut notifications = state.join_hub(&identity);
    // Declared before `session` so that drop order - reverse of declaration - closes the media
    // first and only then announces it, rather than telling the room a peer is gone while its
    // producers are still alive on the worker.
    let _membership = HubMembership {
        state: Arc::clone(&state),
        identity: identity.clone(),
    };

    let room = match state.registry.join(&identity.room).await {
        Ok(room) => room,
        Err(error) => {
            tracing::error!(%error, "could not give the peer a room");
            let _ = outbound
                .send(close_frame(
                    CLOSE_INTERNAL_ERROR,
                    "the room could not be created",
                ))
                .await;
            return;
        }
    };

    let session = Session::new(room, &state.config);
    tracing::info!("peer connected");

    let welcome = notification(
        "connected",
        json!({
            "peerId": identity.id,
            "room": identity.room,
            "userId": identity.user_id,
            "displayName": identity.display_name,
            "role": identity.role,
        }),
    );
    // Liveness. Every per-peer resource - the `max_peers` slot, the per-identity count, the room's
    // router, the RTC ports - is released when this task ends, and this task ends only when the
    // socket produces an event. A client that vanishes without a clean close produces none, so
    // without this arm the peer is held forever. See `Config::peer_silence_limit`.
    //
    // `interval_at` rather than `interval`: the first tick of a plain `interval` completes
    // immediately, which would put a ping on the wire in the same breath as the welcome frame.
    let mut heartbeat = tokio::time::interval_at(
        tokio::time::Instant::now() + state.config.peer_ping_interval,
        state.config.peer_ping_interval,
    );
    // A peer whose task was starved must not be closed for ticks it never got to see; skipping the
    // backlog keeps this a liveness probe rather than a scheduling penalty.
    heartbeat.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
    let mut last_heard = tokio::time::Instant::now();

    if outbound.send(welcome).await.is_ok() {
        loop {
            let event = tokio::select! {
                // Shutdown wins a tie: a peer that is mid-command when SIGTERM lands should be told
                // to go away rather than have one more transport built for it.
                biased;

                _ = shutdown.recv() => PeerEvent::ShuttingDown,

                // Above the traffic arms, and cheap enough that it costs them nothing: one tick
                // does at most one 2-byte frame, and a tick is consumed when it fires, so it
                // cannot preempt twice in a row.
                _ = heartbeat.tick() => PeerEvent::Heartbeat,

                // The other two share one arm, and an inner unbiased `select!`, on purpose. With
                // all three in one biased `select!` the notification arm outranks the inbound one,
                // so a room churning producers faster than this peer drains them would keep the
                // notification future permanently ready and the peer could never issue a command
                // again - starved by other people's traffic on its own socket. Both futures here
                // are cancel-safe (`Receiver::recv` and `StreamExt::next`), so losing the race
                // discards nothing.
                event = async {
                    tokio::select! {
                        queued = notifications.recv() => PeerEvent::Notification(queued),
                        frame = inbound.next() => PeerEvent::Frame(frame),
                    }
                } => event,
            };

            match event {
                PeerEvent::ShuttingDown => {
                    let _ = outbound
                        .send(close_frame(
                            CLOSE_GOING_AWAY,
                            "the media server is shutting down",
                        ))
                        .await;
                    break;
                }

                PeerEvent::Heartbeat => {
                    let silent_for = last_heard.elapsed();
                    if silent_for >= state.config.peer_silence_limit {
                        tracing::info!(
                            silent_for_secs = silent_for.as_secs(),
                            "peer stopped answering; closing its socket and releasing its slot"
                        );
                        // Sent on a socket that is probably already gone, so the result is
                        // deliberately ignored - the point of this branch is `break`, which drops
                        // the RAII guards. A well-behaved client sees 1001 and reconnects.
                        let _ = outbound
                            .send(close_frame(CLOSE_GOING_AWAY, "no response to heartbeat"))
                            .await;
                        break;
                    }
                    // An unanswered ping does NOT fail here: a write into a socket whose peer has
                    // silently gone succeeds into the kernel buffer for a long time. The pong
                    // deadline above is what detects the loss; this send only asks the question.
                    if outbound
                        .send(Message::Ping(Default::default()))
                        .await
                        .is_err()
                    {
                        break;
                    }
                }

                // The hub dropped our sender: we fell too far behind. Close so we reconnect.
                PeerEvent::Notification(None) => break,
                PeerEvent::Notification(Some(message)) => {
                    if outbound.send(message).await.is_err() {
                        break;
                    }
                }

                PeerEvent::Frame(None) => break,
                PeerEvent::Frame(Some(Err(error))) => {
                    tracing::debug!(%error, "websocket read failed");
                    break;
                }
                PeerEvent::Frame(Some(Ok(frame))) => {
                    // Any frame at all is proof of life, which is why this sits above the match
                    // rather than in the Pong arm: a peer sending commands is obviously present,
                    // and a peer that pings us is answering for itself.
                    last_heard = tokio::time::Instant::now();

                    match frame {
                        Message::Text(text) => {
                            let (reply, outcome) =
                                on_request(&state, &identity, &session, text.as_str()).await;
                            if outbound.send(reply).await.is_err() {
                                break;
                            }
                            if matches!(outcome, Outcome::Finished) {
                                let _ = outbound
                                    .send(close_frame(CLOSE_GOING_AWAY, "closed on request"))
                                    .await;
                                break;
                            }
                        }
                        Message::Binary(_) => {
                            let refusal = error_reply(
                                None,
                                "badEnvelope",
                                "this signalling channel carries JSON text frames only",
                            );
                            if outbound.send(refusal).await.is_err() {
                                break;
                            }
                        }
                        Message::Close(_) => break,
                        // "Ping messages will be automatically responded to by the server, so you
                        // do not have to worry about dealing with them yourself"
                        // (`axum-0.8.9/src/extract/ws.rs:781-782`).
                        Message::Ping(_) | Message::Pong(_) => {}
                    }
                }
            }
        }
    }

    // Teardown is `_membership`'s `Drop` and `session`'s, in that reverse-declaration order: the
    // media closes, then the room is told. Nothing is done by hand here, so an unwind out of a
    // command handler leaves exactly the same state a clean exit does.
    session.close();
    tracing::info!("peer disconnected");
}

/// What woke [`serve_peer`]'s loop.
enum PeerEvent {
    ShuttingDown,
    /// The liveness timer fired: ping the peer, or close it if it has gone silent.
    Heartbeat,
    Notification(Option<Message>),
    Frame(Option<Result<Message, axum::Error>>),
}

/// Whether the peer's socket should stay open after this reply.
enum Outcome {
    Continue,
    Finished,
}

/// A client request.
///
/// `id` is required. A frame without one cannot be answered in a way the client can correlate, so
/// it is refused rather than acted on - a command whose result the caller can never observe is
/// worse than no command.
#[derive(Debug, Deserialize)]
struct Request {
    id: u64,
    cmd: String,
    #[serde(default)]
    data: Value,
}

async fn on_request(
    state: &Arc<AppState>,
    identity: &PeerIdentity,
    session: &Session,
    text: &str,
) -> (Message, Outcome) {
    let request: Request = match serde_json::from_str(text) {
        Ok(request) => request,
        Err(error) => {
            tracing::warn!(%error, "unparseable request frame");
            return (
                error_reply(
                    None,
                    "badEnvelope",
                    &format!("a request must be {{id, cmd, data?}}: {error}"),
                ),
                Outcome::Continue,
            );
        }
    };

    // Handled here rather than in `dispatch` because it is the one command whose effect is on the
    // socket rather than on the session.
    if request.cmd == "close" {
        tracing::debug!("peer asked to close");
        return (ok_reply(request.id, json!({})), Outcome::Finished);
    }

    match dispatch(state, identity, session, &request.cmd, request.data).await {
        Ok(data) => (ok_reply(request.id, data), Outcome::Continue),
        Err(error) => {
            tracing::warn!(cmd = %request.cmd, code = error.code(), %error, "command refused");
            (
                error_reply(Some(request.id), error.code(), &error.to_string()),
                Outcome::Continue,
            )
        }
    }
}

async fn dispatch(
    state: &Arc<AppState>,
    identity: &PeerIdentity,
    session: &Session,
    command: &str,
    data: Value,
) -> Result<Value, CommandError> {
    match command {
        "getRouterRtpCapabilities" => {
            let router =
                state
                    .registry
                    .router(&identity.room)
                    .ok_or_else(|| CommandError::RoomGone {
                        room: identity.room.clone(),
                    })?;
            Ok(json!({ "routerRtpCapabilities": router.rtp_capabilities() }))
        }

        "createWebRtcTransport" => {
            let request: CreateTransport = parse(command, data)?;
            let parameters = session
                .create_transport(request.producing, request.consuming)
                .await?;
            Ok(serde_json::to_value(parameters)?)
        }

        "connectTransport" => {
            let request: ConnectTransport = parse(command, data)?;
            session
                .connect_transport(request.transport_id, request.dtls_parameters)
                .await?;
            Ok(json!({}))
        }

        "produce" => {
            let request: Produce = parse(command, data)?;
            // The role gate. Everything below this line trusts that only a presenter reaches it.
            if !identity.may_produce() {
                return Err(CommandError::NotAPresenter);
            }

            let producer_id = session
                .produce(
                    request.transport_id,
                    request.kind,
                    request.rtp_parameters,
                    request.app_data.clone(),
                )
                .await?;

            let info = state.record_producer(identity, producer_id, request.kind, request.app_data);
            state.notify_room(
                &identity.room,
                identity.id,
                &notification("newProducer", serde_json::to_value(&info)?),
            );
            tracing::info!(producer = %producer_id, kind = ?request.kind, "peer is producing");
            Ok(json!({ "id": producer_id }))
        }

        "consume" => {
            let request: Consume = parse(command, data)?;
            let parameters = session
                .consume(
                    request.transport_id,
                    request.producer_id,
                    request.rtp_capabilities,
                )
                .await?;
            Ok(serde_json::to_value(parameters)?)
        }

        "resumeConsumer" => {
            let request: ConsumerRef = parse(command, data)?;
            session.resume_consumer(request.consumer_id).await?;
            Ok(json!({}))
        }

        "sendSpeechReco" => {
            let request: SendSpeechReco = parse(command, data)?;

            // Captions are the speaker's words, and only a presenter holds the floor. A member
            // relaying text here would put arbitrary words on every viewer's screen attributed to
            // the room, so this carries the same gate as `produce`.
            if !identity.may_produce() {
                return Err(CommandError::NotAPresenter);
            }
            // A transcript line is small; anything larger is not speech. Bounded so one peer cannot
            // fan a megabyte out to the whole room on every result.
            if request.text.chars().count() > MAX_SPEECH_RECO_CHARS {
                return Err(CommandError::BadPayload {
                    command: command.to_string(),
                    message: format!("the caption text exceeds {MAX_SPEECH_RECO_CHARS} characters"),
                });
            }

            state.notify_room(
                &identity.room,
                identity.id,
                &notification(
                    "speechReco",
                    json!({
                        "text": request.text,
                        "isFinal": request.is_final,
                        "timestamp": request.timestamp,
                        "lang": request.lang,
                        // From the grant, never from the payload.
                        "peerId": identity.id,
                        "userId": identity.user_id,
                        "sender": identity.display_name,
                    }),
                ),
            );
            Ok(json!({}))
        }

        "setPreferredLayers" => {
            let request: SetPreferredLayers = parse(command, data)?;
            session
                .set_consumer_preferred_layers(
                    request.consumer_id,
                    ConsumerLayers {
                        spatial_layer: request.spatial_layer,
                        temporal_layer: request.temporal_layer,
                    },
                )
                .await?;
            Ok(json!({}))
        }

        "closeConsumer" => {
            let request: ConsumerRef = parse(command, data)?;
            session.close_consumer(request.consumer_id)?;
            Ok(json!({}))
        }

        "closeProducer" => {
            let request: ProducerRef = parse(command, data)?;
            session.close_producer(request.producer_id)?;
            state.forget_producer(identity, request.producer_id);
            state.notify_room(
                &identity.room,
                identity.id,
                &notification(
                    "producerClosed",
                    json!({ "producerId": request.producer_id, "peerId": identity.id }),
                ),
            );
            Ok(json!({}))
        }

        // Pause and resume are announced for the same reason `closeProducer` is: they change what
        // the *rest of the room* sees. In the capture the room learns a presenter has muted from a
        // second socket entirely - `startTalking` / `stopTalking` on the room server (bytes
        // 1013700-1014900), which is what drives the talking indicator - and we have one socket, so
        // if the SFU that just paused the producer does not say so, nothing does, and every viewer
        // keeps a live-looking tile for a stream that has stopped sending.
        "pauseProducer" => {
            let request: ProducerRef = parse(command, data)?;
            session.pause_producer(request.producer_id).await?;
            state.notify_room(
                &identity.room,
                identity.id,
                &notification(
                    "producerPaused",
                    json!({ "producerId": request.producer_id, "peerId": identity.id }),
                ),
            );
            Ok(json!({}))
        }

        "resumeProducer" => {
            let request: ProducerRef = parse(command, data)?;
            session.resume_producer(request.producer_id).await?;
            state.notify_room(
                &identity.room,
                identity.id,
                &notification(
                    "producerResumed",
                    json!({ "producerId": request.producer_id, "peerId": identity.id }),
                ),
            );
            Ok(json!({}))
        }

        "getProducers" => Ok(json!({ "producers": state.producers_visible_to(identity) })),

        unknown => Err(CommandError::UnknownCommand {
            command: unknown.to_owned(),
        }),
    }
}

fn parse<T: DeserializeOwned>(command: &str, data: Value) -> Result<T, CommandError> {
    serde_json::from_value(data).map_err(|error| CommandError::BadPayload {
        command: command.to_owned(),
        message: error.to_string(),
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateTransport {
    producing: bool,
    consuming: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConnectTransport {
    transport_id: TransportId,
    dtls_parameters: DtlsParameters,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Produce {
    transport_id: TransportId,
    kind: MediaKind,
    rtp_parameters: RtpParameters,
    /// Optional: the captured client sends one on every produce (bytes 1083612, 1088520, 1104332),
    /// but nothing here needs it, so a client that omits it gets `null` rather than a refusal.
    #[serde(default)]
    app_data: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Consume {
    transport_id: TransportId,
    producer_id: ProducerId,
    rtp_capabilities: RtpCapabilities,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ConsumerRef {
    consumer_id: ConsumerId,
}

/// `sendSpeechReco` payload - one closed-caption result from a speaker's browser.
///
/// Shape follows the captured client, which emits
/// `{text, isFinal, timestamp, lang, sender}` (bundle byte ~1111400). `sender` is NOT accepted from
/// the wire: it is filled in from the verified grant, because a peer that could name itself could
/// caption words as anybody in the room.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SendSpeechReco {
    text: String,
    is_final: bool,
    timestamp: i64,
    lang: String,
}

/// `setPreferredLayers` payload.
///
/// `temporalLayer` is optional because mediasoup treats its absence as "the producer's maximum"
/// rather than zero (`consumer.rs:42-47`), so a client that only cares about resolution can send
/// `spatialLayer` alone.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SetPreferredLayers {
    consumer_id: ConsumerId,
    spatial_layer: u8,
    #[serde(default)]
    temporal_layer: Option<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProducerRef {
    producer_id: ProducerId,
}

/// Why one command was refused.
///
/// Unlike a grant refusal these *are* sent to the client in full. They carry no secret and no
/// oracle - every one of them is a statement about the caller's own session - and our client needs
/// to tell "you cannot decode this stream" apart from "that transport is not yours".
#[derive(Debug, Error)]
enum CommandError {
    #[error("unknown command {command:?}")]
    UnknownCommand { command: String },
    #[error("the {command} payload is not valid: {message}")]
    BadPayload { command: String, message: String },
    #[error("this peer's role may not produce")]
    NotAPresenter,
    #[error("room {room} is no longer available")]
    RoomGone { room: String },
    #[error(transparent)]
    Session(#[from] SessionError),
    #[error("failed to serialise the reply: {0}")]
    Serialize(#[from] serde_json::Error),
}

impl CommandError {
    /// A stable machine-readable tag. The client branches on this, never on the message.
    fn code(&self) -> &'static str {
        match self {
            CommandError::UnknownCommand { .. } => "unknownCommand",
            CommandError::BadPayload { .. } => "badPayload",
            CommandError::NotAPresenter => "forbidden",
            CommandError::RoomGone { .. } => "roomGone",
            CommandError::Serialize(_) => "internal",
            CommandError::Session(error) => match error {
                SessionError::Closed => "sessionClosed",
                SessionError::DirectionlessTransport => "badPayload",
                SessionError::TooManyTransports => "tooManyTransports",
                SessionError::TooManyProducers => "tooManyProducers",
                SessionError::TooManyConsumers => "tooManyConsumers",
                // The caller's own payload is wrong, so this is the same class as `badPayload` -
                // but it has its own code because "your rtpParameters would crash the room" is a
                // different thing for a client to log than "your JSON was the wrong shape".
                SessionError::TooManyEncodings { .. }
                | SessionError::RtxAptIsNotAMediaCodec { .. } => "badRtpParameters",
                SessionError::UnknownTransport(_) => "unknownTransport",
                SessionError::WrongDirection { .. } => "wrongDirection",
                SessionError::UnknownProducer(_) => "unknownProducer",
                SessionError::UnknownConsumer(_) => "unknownConsumer",
                SessionError::TransportCreate(_) | SessionError::TransportConnect { .. } => {
                    "transportFailed"
                }
                SessionError::Produce(_) => "produceFailed",
                SessionError::CannotConsume { .. } => "cannotConsume",
                SessionError::Consume { .. } => "consumeFailed",
                SessionError::Request { .. } => "requestFailed",
            },
        }
    }
}

fn ok_reply(id: u64, data: Value) -> Message {
    text(&json!({ "id": id, "ok": true, "data": data }))
}

fn error_reply(id: Option<u64>, code: &str, message: &str) -> Message {
    text(&json!({
        "id": id,
        "ok": false,
        "error": { "code": code, "message": message },
    }))
}

fn notification(notify: &str, data: Value) -> Message {
    text(&json!({ "notify": notify, "data": data }))
}

/// `serde_json::to_string` on a `Value` cannot fail (no map with non-string keys, no non-finite
/// float can exist in a `Value` built here), but an `expect` on a signalling path is still a remote
/// panic if that ever stops being true, so it degrades to a frame the client can act on.
fn text(value: &Value) -> Message {
    match serde_json::to_string(value) {
        Ok(json) => Message::Text(Utf8Bytes::from(json)),
        Err(error) => {
            tracing::error!(%error, "could not serialise a signalling frame");
            Message::Text(Utf8Bytes::from_static(
                r#"{"id":null,"ok":false,"error":{"code":"internal","message":"the reply could not be serialised"}}"#,
            ))
        }
    }
}

fn close_frame(code: u16, reason: &'static str) -> Message {
    Message::Close(Some(CloseFrame {
        code,
        reason: Utf8Bytes::from_static(reason),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grant::{Admission, ClaimsV1, GRANT_VERSION_V1};
    use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
    use base64::Engine;
    use ed25519_dalek::{Signer, SigningKey};
    use std::net::{IpAddr, Ipv4Addr, SocketAddr};
    use std::sync::atomic::AtomicU16;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;
    use tokio::sync::oneshot;
    use tokio::task::JoinHandle;
    use tokio::time::timeout;
    use tokio_tungstenite::tungstenite::{Error as WsError, Message as WsMessage};
    use tokio_tungstenite::{connect_async, MaybeTlsStream, WebSocketStream};

    /// Every test in this module starts real mediasoup workers that really bind UDP and TCP
    /// sockets, and `cargo test` runs them in parallel in one process. Each harness therefore takes
    /// the next 200-port block. The base clears every other test module's range: `worker_pool`
    /// (42000-42999), `router_registry` (43000-43999) and `session` (44000 upwards in 200-port
    /// blocks).
    const PORT_BLOCK: u16 = 200;
    static NEXT_PORT_BLOCK: AtomicU16 = AtomicU16::new(0);

    /// Long enough that a loaded CI box does not fail on timing, short enough that a genuine hang
    /// fails the test instead of the suite's own timeout.
    const REPLY_TIMEOUT: Duration = Duration::from_secs(10);
    const TEST_WEB_ORIGIN: &str = "https://app.example.test";

    fn test_config() -> Config {
        test_config_with_ports(PORT_BLOCK)
    }

    /// `span` ports out of this harness's own 200-port block. Narrowing it is how the connection
    /// ceiling is made reachable in a test: it is derived from the range
    /// (`Config::max_peers`), so a 100-port range means 12 peers rather than 25.
    fn test_config_with_ports(span: u16) -> Config {
        assert!(span <= PORT_BLOCK, "a harness must stay inside its block");
        let min = 50000 + NEXT_PORT_BLOCK.fetch_add(1, Ordering::Relaxed) * PORT_BLOCK;
        Config {
            bind_address: "127.0.0.1:0".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: min,
            rtc_port_max: min + span - 1,
            workers: 1,
            grant_public_key: None,
            allowed_origin: Some("https://app.example.test".into()),
            peer_ping_interval: Duration::from_secs(20),
            peer_silence_limit: Duration::from_secs(60),
        }
    }

    /// The same fixed key `grant`'s own tests pin the wire format with. Ed25519 is deterministic, so
    /// a fixed key keeps these tests reproducible.
    fn signing_key() -> SigningKey {
        SigningKey::from_bytes(&[
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
            24, 25, 26, 27, 28, 29, 30, 31,
        ])
    }

    /// Mints a grant exactly the way the documented TypeScript signer does: base64url the claims,
    /// sign that segment's ASCII, base64url the signature, join with a dot.
    fn mint(key: &SigningKey, grant: &ClaimsV1) -> String {
        let payload =
            URL_SAFE_NO_PAD.encode(serde_json::to_vec(grant).expect("a grant serialises"));
        let signature = key.sign(payload.as_bytes());
        format!(
            "{payload}.{}",
            URL_SAFE_NO_PAD.encode(signature.to_bytes().as_slice())
        )
    }

    fn claims(room: &str, uid: i64, role: Role) -> ClaimsV1 {
        let now = UnixTime::now().as_secs();
        ClaimsV1 {
            v: GRANT_VERSION_V1,
            room: room.to_owned(),
            uid,
            name: format!("Peer {uid}"),
            role,
            iat: now,
            exp: now + 60,
        }
    }

    struct Harness {
        address: SocketAddr,
        state: Arc<AppState>,
        pool: Arc<WorkerPool>,
        key: SigningKey,
        stop: Option<oneshot::Sender<()>>,
        server: Option<JoinHandle<std::io::Result<()>>>,
    }

    impl Harness {
        /// A real listener, a real axum server, real mediasoup workers. Nothing here is mocked:
        /// a fake router would happily "consume" a producer it had never heard of, which is exactly
        /// what these tests exist to catch.
        async fn start(admission: Admission) -> Self {
            let mut config = test_config();
            if admission == Admission::AllowAnonymous {
                config.allowed_origin = None;
            }
            Self::start_with(admission, config).await
        }

        async fn start_with(admission: Admission, config: Config) -> Self {
            let key = signing_key();
            let verifier = match admission {
                Admission::RequireGrant => GrantVerifier::new(
                    Some(&STANDARD.encode(key.verifying_key().as_bytes())),
                    admission,
                ),
                Admission::AllowAnonymous => GrantVerifier::new(None, admission),
            }
            .expect("the verifier builds");

            let pool = WorkerPool::new(config.clone()).await.expect("pool starts");
            let registry = RouterRegistry::new(Arc::clone(&pool));
            let state = AppState::new(Arc::clone(&pool), registry, config, Arc::new(verifier));

            let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind");
            let address = listener.local_addr().expect("local address");

            let (stop, stopped) = oneshot::channel();
            let server = tokio::spawn(serve(Arc::clone(&state), listener, async move {
                let _ = stopped.await;
            }));

            Self {
                address,
                state,
                pool,
                key,
                stop: Some(stop),
                server: Some(server),
            }
        }

        async fn enforcing() -> Self {
            Self::start(Admission::RequireGrant).await
        }

        fn grant_for(&self, room: &str, uid: i64, role: Role) -> String {
            mint(&self.key, &claims(room, uid, role))
        }

        /// Opens an authenticated socket and swallows the `connected` notification.
        async fn peer(&self, room: &str, uid: i64, role: Role) -> Peer {
            let grant = self.grant_for(room, uid, role);
            let mut peer = self
                .connect(&format!("grant={grant}"))
                .await
                .expect("an authenticated peer connects");
            let welcome = peer.next_notification("connected").await;
            assert_eq!(welcome["data"]["room"], room);
            peer
        }

        async fn connect(&self, query: &str) -> Result<Peer, WsError> {
            self.connect_with_browser_headers(query, Some(TEST_WEB_ORIGIN), Some("same-origin"))
                .await
        }

        async fn connect_with_browser_headers(
            &self,
            query: &str,
            origin: Option<&str>,
            fetch_site: Option<&str>,
        ) -> Result<Peer, WsError> {
            use tokio_tungstenite::tungstenite::client::IntoClientRequest;

            let url = format!("ws://{}/ws?{query}", self.address);
            let mut request = url.as_str().into_client_request()?;
            if let Some(origin) = origin {
                request.headers_mut().insert(
                    "origin",
                    origin.parse().expect("a valid Origin header value"),
                );
            }
            if let Some(fetch_site) = fetch_site {
                request.headers_mut().insert(
                    "sec-fetch-site",
                    fetch_site
                        .parse()
                        .expect("a valid Sec-Fetch-Site header value"),
                );
            }
            let (socket, _) = connect_async(request).await?;
            Ok(Peer {
                socket,
                next_id: 1,
                pending: Vec::new(),
            })
        }

        /// A raw HTTP/1.1 GET. `Connection: close` makes the server close after the response, so
        /// `read_to_end` is a complete read with no chunked-encoding parsing to get wrong.
        async fn get(&self, path: &str) -> (u16, Value) {
            let mut stream = TcpStream::connect(self.address).await.expect("connect");
            stream
                .write_all(
                    format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
                        .as_bytes(),
                )
                .await
                .expect("write the request");

            let mut raw = Vec::new();
            stream.read_to_end(&mut raw).await.expect("read the reply");
            let response = String::from_utf8(raw).expect("an ASCII response");
            let (head, body) = response.split_once("\r\n\r\n").expect("headers then body");
            let status = head
                .split_whitespace()
                .nth(1)
                .and_then(|code| code.parse().ok())
                .expect("a status line");
            (status, serde_json::from_str(body).expect("a JSON body"))
        }

        /// Runs the real shutdown path and waits for the server future to return.
        async fn shutdown(&mut self) {
            if let Some(stop) = self.stop.take() {
                let _ = stop.send(());
            }
            if let Some(server) = self.server.take() {
                timeout(Duration::from_secs(30), server)
                    .await
                    .expect("the server shuts down")
                    .expect("the server task does not panic")
                    .expect("serve returns Ok");
            }
        }
    }

    impl Drop for Harness {
        fn drop(&mut self) {
            if let Some(stop) = self.stop.take() {
                let _ = stop.send(());
            }
            if let Some(server) = self.server.take() {
                server.abort();
            }
        }
    }

    struct Peer {
        socket: WebSocketStream<MaybeTlsStream<TcpStream>>,
        next_id: u64,
        /// Notifications that arrived while waiting for a reply.
        pending: Vec<Value>,
    }

    impl Peer {
        async fn read(&mut self) -> Value {
            loop {
                let frame = timeout(REPLY_TIMEOUT, self.socket.next())
                    .await
                    .expect("a frame arrives before the timeout")
                    .expect("the socket is still open")
                    .expect("a well-formed frame");
                match frame {
                    WsMessage::Text(text) => {
                        return serde_json::from_str(&text).expect("a JSON frame")
                    }
                    WsMessage::Ping(_) | WsMessage::Pong(_) => continue,
                    other => panic!("unexpected frame: {other:?}"),
                }
            }
        }

        /// Sends a command and returns its reply envelope, buffering any notification that
        /// overtakes it.
        async fn call(&mut self, cmd: &str, data: Value) -> Value {
            let id = self.next_id;
            self.next_id += 1;
            let request = json!({ "id": id, "cmd": cmd, "data": data });
            self.socket
                .send(WsMessage::text(request.to_string()))
                .await
                .expect("the request is sent");

            loop {
                let frame = self.read().await;
                if frame.get("id").and_then(Value::as_u64) == Some(id) {
                    return frame;
                }
                self.pending.push(frame);
            }
        }

        /// A command that must succeed; returns its `data`.
        async fn ok(&mut self, cmd: &str, data: Value) -> Value {
            let reply = self.call(cmd, data).await;
            assert_eq!(reply["ok"], json!(true), "{cmd} failed: {reply}");
            reply["data"].clone()
        }

        /// A command that must fail; returns its error code.
        async fn refused(&mut self, cmd: &str, data: Value) -> String {
            let reply = self.call(cmd, data).await;
            assert_eq!(reply["ok"], json!(false), "{cmd} unexpectedly succeeded");
            reply["error"]["code"]
                .as_str()
                .expect("an error code")
                .to_owned()
        }

        /// Waits for a notification by name, checking what has already been buffered first.
        async fn next_notification(&mut self, name: &str) -> Value {
            if let Some(index) = self
                .pending
                .iter()
                .position(|frame| frame["notify"] == json!(name))
            {
                return self.pending.remove(index);
            }
            loop {
                let frame = self.read().await;
                if frame["notify"] == json!(name) {
                    return frame;
                }
                self.pending.push(frame);
            }
        }
    }

    /// Browser-shaped `rtpParameters`, parsed from JSON rather than built from the Rust types so
    /// the fixture also proves a real mediasoup-client `produce` payload deserialises.
    ///
    /// MID `"0"`, which is correct for one producer on a transport and WRONG for a second — see
    /// [`opus_send_parameters_on_mid`].
    fn opus_send_parameters(ssrc: u32) -> Value {
        opus_send_parameters_on_mid(ssrc, "0")
    }

    /// The same fixture with the MID spelled out, for a transport that carries more than one
    /// producer over its lifetime.
    ///
    /// A MID identifies an m-line within a transport and is unique for as long as that transport
    /// lives. A real mediasoup-client takes it from the SDP m-line index, which only ever counts
    /// upward, so it never re-offers `"0"` on a transport that has already used it — not even after
    /// the first producer is closed.
    ///
    /// Reusing it here is not merely unrealistic, it races. `Producer` has no awaitable close in
    /// mediasoup 0.24 (there is no `pub fn close`); the worker-side `producer.close` is only issued
    /// from `Drop`, which *spawns* the request rather than awaiting it — see `router/producer.rs`
    /// in the crate. So `closeProducer` replies while the MID may still be registered in the
    /// transport's RTP listener, and the next `produce` on the same MID is rejected with
    /// "MID already exists in RTP listener". Giving the second producer its own MID matches what a
    /// browser does and removes the race rather than papering over it.
    fn opus_send_parameters_on_mid(ssrc: u32, mid: &str) -> Value {
        json!({
            "mid": mid,
            "codecs": [{
                "mimeType": "audio/opus",
                "payloadType": 111,
                "clockRate": 48000,
                "channels": 2,
                "parameters": { "minptime": 10, "useinbandfec": 1, "usedtx": 1 },
                "rtcpFeedback": [{ "type": "transport-cc" }]
            }],
            "headerExtensions": [],
            "encodings": [{ "ssrc": ssrc, "dtx": true }],
            "rtcp": { "cname": "tradingroom-media-server-test", "reducedSize": true }
        })
    }

    /// A peer identity with no socket behind it, for tests that drive [`AppState`]'s room hub
    /// directly.
    fn synthetic_identity(room: &str, uid: i64) -> PeerIdentity {
        PeerIdentity {
            id: PeerId::new(),
            room: room.to_owned(),
            user_id: Some(MediaUserId::Legacy(uid)),
            display_name: Some(format!("Peer {uid}")),
            role: Some(Role::Presenter),
        }
    }

    fn opus_capabilities() -> Value {
        json!({
            "codecs": [{
                "kind": "audio",
                "mimeType": "audio/opus",
                "preferredPayloadType": 100,
                "clockRate": 48000,
                "channels": 2,
                "parameters": {},
                "rtcpFeedback": [{ "type": "transport-cc" }]
            }],
            "headerExtensions": []
        })
    }

    // ------------------------------------------------------------------ /health

    /// The operator's only window onto a pool that is quietly replacing workers.
    #[tokio::test]
    async fn health_reports_the_pool_and_room_counts() {
        let mut harness = Harness::enforcing().await;

        let (status, body) = harness.get("/health").await;
        assert_eq!(status, 200);
        assert_eq!(body["status"], "ok");
        assert_eq!(body["workers"], 1);
        assert_eq!(body["workerDeaths"], 0);
        assert_eq!(body["rooms"], 0);
        assert_eq!(body["peers"], 0);
        assert_eq!(
            body["admission"], "require-grant",
            "an operator has to be able to see from outside whether admission is on"
        );

        // A live peer has to move the numbers, or the endpoint is decorative.
        let mut peer = harness.peer("trading-floor", 4242, Role::Presenter).await;
        peer.ok("getRouterRtpCapabilities", json!(null)).await;

        let (_, body) = harness.get("/health").await;
        assert_eq!(body["rooms"], 1);
        assert_eq!(body["peers"], 1);

        harness.shutdown().await;
    }

    // ------------------------------------------------------------------ admission

    #[test]
    fn request_trace_labels_cannot_contain_query_strings_or_grants() {
        let uri: axum::http::Uri = "/ws?grant=must-never-enter-telemetry".parse().unwrap();
        assert_eq!(traced_path(uri.path()), "/ws");
        assert_eq!(traced_path("/attacker/controlled/path"), "<unmatched>");
    }

    #[tokio::test]
    async fn an_enforcing_socket_requires_the_exact_browser_origin() {
        let mut harness = Harness::enforcing().await;
        let grant = harness.grant_for("trading-floor", 4242, Role::Presenter);
        let query = format!("grant={grant}");

        for (label, origin, fetch_site) in [
            ("missing", None, None),
            ("malformed", Some("not an origin"), None),
            (
                "sibling same-site",
                Some("https://sibling.example.test"),
                Some("same-site"),
            ),
            (
                "cross-site",
                Some("https://attacker.invalid"),
                Some("cross-site"),
            ),
            (
                "conflicting fetch metadata",
                Some(TEST_WEB_ORIGIN),
                Some("same-site"),
            ),
        ] {
            let error = harness
                .connect_with_browser_headers(&query, origin, fetch_site)
                .await
                .err()
                .unwrap_or_else(|| panic!("{label} must not open a socket"));
            match error {
                WsError::Http(response) => assert_eq!(response.status(), StatusCode::FORBIDDEN),
                other => panic!("{label} must fail at HTTP upgrade, got {other:?}"),
            }
        }

        // Fetch Metadata is supplemental for non-browser clients; the exact Origin is mandatory.
        let mut peer = harness
            .connect_with_browser_headers(&query, Some(TEST_WEB_ORIGIN), None)
            .await
            .expect("the exact origin passes");
        let welcome = peer.next_notification("connected").await;
        assert_eq!(welcome["data"]["room"], "trading-floor");

        harness.shutdown().await;
    }

    /// The headline security property: without a grant there is no socket, so there is no command
    /// to reject in the first place - and nothing is allocated on the way to finding that out.
    #[tokio::test]
    async fn an_unauthenticated_socket_is_refused_before_it_can_issue_a_command() {
        let mut harness = Harness::enforcing().await;

        let valid = harness.grant_for("trading-floor", 4242, Role::Presenter);
        let (payload, signature) = valid.split_once('.').expect("two segments");
        let expired = mint(
            &harness.key,
            &ClaimsV1 {
                iat: UnixTime::now().as_secs() - 600,
                exp: UnixTime::now().as_secs() - 540,
                ..claims("trading-floor", 4242, Role::Presenter)
            },
        );
        // A real signature over different claims: the "edit member into presenter" forgery.
        let forged = format!(
            "{}.{signature}",
            URL_SAFE_NO_PAD.encode(
                serde_json::to_vec(&claims("trading-floor", 1, Role::Presenter))
                    .expect("claims serialise")
            )
        );
        let other_key = SigningKey::from_bytes(&[9u8; 32]);
        let wrong_key = mint(&other_key, &claims("trading-floor", 4242, Role::Presenter));

        for (label, query) in [
            ("no grant at all", String::new()),
            ("an empty grant", "grant=".to_owned()),
            (
                "a grant that is not even a token",
                "grant=nonsense".to_owned(),
            ),
            ("an expired grant", format!("grant={expired}")),
            ("a tampered grant", format!("grant={forged}")),
            (
                "a grant signed by another key",
                format!("grant={wrong_key}"),
            ),
            ("only the payload half", format!("grant={payload}")),
            (
                "a room asked for without a grant",
                "room=trading-floor".to_owned(),
            ),
        ] {
            let error = harness
                .connect(&query)
                .await
                .err()
                .unwrap_or_else(|| panic!("{label} must not open a socket"));
            match error {
                WsError::Http(response) => assert_eq!(
                    response.status(),
                    StatusCode::UNAUTHORIZED,
                    "{label} must be refused with 401, not {:?}",
                    response.status()
                ),
                other => panic!("{label} must be refused at the HTTP layer, got {other:?}"),
            }
        }

        // Nothing was allocated on the way to refusing any of them: no room, no router, no session.
        let (_, body) = harness.get("/health").await;
        assert_eq!(body["rooms"], 0, "a refused peer must not create a room");
        assert_eq!(body["peers"], 0);
        assert_eq!(harness.state.registry.peer_count("trading-floor"), 0);

        // And the very same room is reachable with the very same key's real grant, so the refusals
        // above are about the grant rather than a broken endpoint.
        let mut peer = harness.peer("trading-floor", 4242, Role::Presenter).await;
        let transport = peer
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        assert!(transport["id"].is_string());
        assert_eq!(harness.state.registry.peer_count("trading-floor"), 1);

        harness.shutdown().await;
    }

    /// A grant is a statement about one room. Asking for another one in the query string must not
    /// change where the peer lands.
    #[tokio::test]
    async fn the_room_comes_from_the_grant_not_the_query_string() {
        let mut harness = Harness::enforcing().await;

        let grant = harness.grant_for("room-a", 4242, Role::Presenter);
        let mut peer = harness
            .connect(&format!("grant={grant}&room=room-b"))
            .await
            .expect("the socket opens");
        let welcome = peer.next_notification("connected").await;

        assert_eq!(welcome["data"]["room"], "room-a");
        assert_eq!(harness.state.registry.peer_count("room-a"), 1);
        assert_eq!(
            harness.state.registry.peer_count("room-b"),
            0,
            "the query string must not be able to move a peer between rooms"
        );

        harness.shutdown().await;
    }

    /// Anonymous development mode admits a peer with no grant - and, per `grant.rs`, must not treat
    /// it as a presenter.
    #[tokio::test]
    async fn anonymous_development_mode_admits_a_peer_that_may_receive_but_not_broadcast() {
        let mut harness = Harness::start(Admission::AllowAnonymous).await;

        let (_, body) = harness.get("/health").await;
        assert_eq!(body["admission"], "allow-anonymous");

        let mut peer = harness
            .connect_with_browser_headers("room=trading-floor", None, None)
            .await
            .expect("anonymous local mode explicitly permits a missing Origin");
        let welcome = peer.next_notification("connected").await;
        assert_eq!(welcome["data"]["room"], "trading-floor");
        assert_eq!(
            welcome["data"]["userId"],
            json!(null),
            "an anonymous peer must be labelled as carrying no identity, not given one"
        );
        assert_eq!(welcome["data"]["role"], json!(null));

        // It can build a receive path...
        let recv = peer
            .ok(
                "createWebRtcTransport",
                json!({ "producing": false, "consuming": true }),
            )
            .await;
        assert!(recv["id"].is_string());

        // ...but it cannot broadcast, because nothing vouches for it being allowed to.
        let send = peer
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        assert_eq!(
            peer.refused(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(11_111_111),
                })
            )
            .await,
            "forbidden"
        );

        harness.shutdown().await;
    }

    /// The role gate, on a peer whose grant really does verify: a member's `produce` is refused,
    /// and nothing is left behind for the room to see.
    #[tokio::test]
    async fn a_member_may_not_produce() {
        let mut harness = Harness::enforcing().await;
        let mut member = harness.peer("trading-floor", 900, Role::Member).await;

        let send = member
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        assert_eq!(
            member
                .refused(
                    "produce",
                    json!({
                        "transportId": send["id"],
                        "kind": "audio",
                        "rtpParameters": opus_send_parameters(22_222_222),
                        "appData": { "share": false },
                    })
                )
                .await,
            "forbidden"
        );

        let mut presenter = harness.peer("trading-floor", 4242, Role::Presenter).await;
        assert_eq!(
            presenter.ok("getProducers", json!(null)).await["producers"],
            json!([]),
            "a refused produce must not appear in the room's roster"
        );

        harness.shutdown().await;
    }

    // ------------------------------------------------------------------ the handshake

    /// The whole point of the service, end to end over a real socket: capabilities, transports,
    /// DTLS-free produce, the push that tells the other peer, then consume and resume.
    #[tokio::test]
    async fn two_peers_negotiate_produce_and_consume_over_the_socket() {
        let mut harness = Harness::enforcing().await;

        // Bob first, so he is subscribed before Alice produces and must receive the push.
        let mut bob = harness.peer("trading-floor", 900, Role::Member).await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;

        let capabilities = alice.ok("getRouterRtpCapabilities", json!(null)).await;
        let codecs = capabilities["routerRtpCapabilities"]["codecs"]
            .as_array()
            .expect("the router advertises codecs");
        let first_video = codecs
            .iter()
            .find(|codec| codec["kind"] == "video")
            .expect("the router advertises video");
        assert_eq!(
            first_video["mimeType"], "video/VP9",
            "the client reads the first video codec to choose SVC over simulcast"
        );

        let send = alice
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        assert!(send["iceCandidates"].as_array().expect("candidates").len() == 2);
        assert!(send["dtlsParameters"]["fingerprints"]
            .as_array()
            .is_some_and(|fingerprints| !fingerprints.is_empty()));
        assert!(
            send.get("sctpParameters").is_none(),
            "SCTP is off, so the key must be absent rather than null"
        );

        let produced = alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(33_333_333),
                    "appData": { "share": false, "screenName": "Chart 1" },
                }),
            )
            .await;
        let producer_id = produced["id"].as_str().expect("a producer id").to_owned();

        // The push Bob was subscribed for, carrying enough to label a tile without a second query.
        let announced = bob.next_notification("newProducer").await;
        assert_eq!(announced["data"]["producerId"], json!(producer_id));
        assert_eq!(announced["data"]["kind"], "audio");
        assert_eq!(announced["data"]["userId"], "legacy:4242");
        assert_eq!(announced["data"]["displayName"], "Peer 4242");
        assert_eq!(announced["data"]["appData"]["screenName"], "Chart 1");
        assert!(
            announced.get("id").is_none(),
            "a notification must not carry an id, or a client could mistake it for a reply"
        );

        let recv = bob
            .ok(
                "createWebRtcTransport",
                json!({ "producing": false, "consuming": true }),
            )
            .await;
        let consumer = bob
            .ok(
                "consume",
                json!({
                    "transportId": recv["id"],
                    "producerId": producer_id,
                    "rtpCapabilities": opus_capabilities(),
                }),
            )
            .await;

        assert_eq!(consumer["producerId"], json!(producer_id));
        assert_eq!(consumer["kind"], "audio");
        assert_eq!(consumer["producerPaused"], json!(false));
        assert_eq!(
            consumer["rtpParameters"]["codecs"]
                .as_array()
                .expect("codecs")
                .len(),
            1,
            "the consumer must carry the codec the two sides agreed on"
        );
        assert!(consumer["rtpParameters"]["encodings"][0]["ssrc"].is_number());

        bob.ok("resumeConsumer", json!({ "consumerId": consumer["id"] }))
            .await;

        // Alice must not be able to drive Bob's consumer.
        assert_eq!(
            alice
                .refused("resumeConsumer", json!({ "consumerId": consumer["id"] }))
                .await,
            "unknownConsumer"
        );

        harness.shutdown().await;
    }

    /// A peer that arrives after the fact has to be able to catch up, or every late joiner sees an
    /// empty room until somebody happens to start a new stream.
    #[tokio::test]
    async fn a_late_peer_gets_the_producers_it_missed_and_never_its_own() {
        let mut harness = Harness::enforcing().await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;

        let send = alice
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        let produced = alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(44_444_444),
                }),
            )
            .await;

        assert_eq!(
            alice.ok("getProducers", json!(null)).await["producers"],
            json!([]),
            "a peer must never be offered its own producer to consume"
        );

        let mut latecomer = harness.peer("trading-floor", 901, Role::Member).await;
        let producers = latecomer.ok("getProducers", json!(null)).await;
        let listed = producers["producers"].as_array().expect("a list");
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0]["producerId"], produced["id"]);
        assert_eq!(listed[0]["userId"], "legacy:4242");

        // A different room must not see it at all - rooms are routers, and the roster follows.
        let mut outsider = harness.peer("other-room", 902, Role::Member).await;
        assert_eq!(
            outsider.ok("getProducers", json!(null)).await["producers"],
            json!([])
        );

        harness.shutdown().await;
    }

    /// The teardown notifications a viewer needs, or a tile stays on screen forever showing a
    /// stream that no longer exists.
    #[tokio::test]
    async fn the_room_is_told_when_a_producer_and_then_a_peer_goes_away() {
        let mut harness = Harness::enforcing().await;
        let mut bob = harness.peer("trading-floor", 900, Role::Member).await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;

        let send = alice
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        let first = alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(55_555_555),
                }),
            )
            .await;
        bob.next_notification("newProducer").await;

        alice
            .ok("closeProducer", json!({ "producerId": first["id"] }))
            .await;
        let closed = bob.next_notification("producerClosed").await;
        assert_eq!(closed["data"]["producerId"], first["id"]);
        assert_eq!(
            bob.ok("getProducers", json!(null)).await["producers"],
            json!([]),
            "a closed producer must leave the roster too, not just fire a notification"
        );

        // A second producer, this time abandoned by dropping the socket rather than closing it.
        // Its own MID, because this transport has already carried one — a browser would do the
        // same, and reusing "0" races the asynchronous worker-side close of `first`.
        let second = alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters_on_mid(66_666_666, "1"),
                }),
            )
            .await;
        bob.next_notification("newProducer").await;
        drop(alice);

        let gone = bob.next_notification("peerClosed").await;
        assert_eq!(gone["data"]["userId"], "legacy:4242");
        assert_eq!(gone["data"]["producerIds"], json!([second["id"]]));
        assert_eq!(
            bob.ok("getProducers", json!(null)).await["producers"],
            json!([])
        );
        assert_eq!(harness.state.registry.peer_count("trading-floor"), 1);

        harness.shutdown().await;
    }

    /// Pause and resume change what the rest of the room sees, so - like `closeProducer` - the room
    /// has to be told. In the capture that fact travels on a *second* socket entirely
    /// (`startTalking`/`stopTalking`, bytes 1013700-1014900) and drives the talking indicator; with
    /// one socket, if the SFU does not say so nothing does, and every viewer keeps a live-looking
    /// tile for a stream that has stopped sending.
    /// Captions carry someone's words to every screen in the room, so the two things that must not
    /// be wrong are who may send them and whose name they arrive under.
    #[tokio::test]
    async fn captions_are_presenter_only_and_attributed_from_the_grant() {
        let harness = Harness::enforcing().await;
        let mut bob = harness.peer("trading-floor", 900, Role::Member).await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;

        // A member cannot caption: it would put arbitrary words on every viewer's screen.
        let refused = bob
            .refused(
                "sendSpeechReco",
                json!({ "text": "not mine to say", "isFinal": true, "timestamp": 1, "lang": "en-US" }),
            )
            .await;
        assert_eq!(refused, "forbidden");

        alice
            .ok(
                "sendSpeechReco",
                json!({
                    "text": "buy the dip",
                    "isFinal": true,
                    "timestamp": 1_785_500_000_i64,
                    "lang": "en-US",
                }),
            )
            .await;

        let relayed = bob.next_notification("speechReco").await;
        assert_eq!(relayed["data"]["text"], "buy the dip");
        assert_eq!(relayed["data"]["isFinal"], true);
        assert_eq!(relayed["data"]["lang"], "en-US");
        // Attribution comes from the verified grant, never the payload - a peer that could name
        // itself could caption words as anybody in the room.
        assert_eq!(relayed["data"]["userId"], "legacy:4242");

        // Oversized text is refused rather than fanned out to every peer.
        let too_long = "x".repeat(MAX_SPEECH_RECO_CHARS + 1);
        let rejected = alice
            .refused(
                "sendSpeechReco",
                json!({ "text": too_long, "isFinal": true, "timestamp": 2, "lang": "en-US" }),
            )
            .await;
        assert_eq!(rejected, "badPayload");
    }

    #[tokio::test]
    async fn pausing_and_resuming_a_producer_is_announced_to_the_room() {
        let mut harness = Harness::enforcing().await;
        let mut bob = harness.peer("trading-floor", 900, Role::Member).await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;

        let send = alice
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        let produced = alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(88_888_888),
                }),
            )
            .await;
        bob.next_notification("newProducer").await;

        alice
            .ok("pauseProducer", json!({ "producerId": produced["id"] }))
            .await;
        let paused = bob.next_notification("producerPaused").await;
        assert_eq!(paused["data"]["producerId"], produced["id"]);
        assert!(
            paused.get("id").is_none(),
            "a notification must not carry an id"
        );

        alice
            .ok("resumeProducer", json!({ "producerId": produced["id"] }))
            .await;
        let resumed = bob.next_notification("producerResumed").await;
        assert_eq!(resumed["data"]["producerId"], produced["id"]);

        // A pause is not a close: the producer stays in the roster, because the tile stays on
        // screen and only its state changed.
        let listed = bob.ok("getProducers", json!(null)).await;
        assert_eq!(listed["producers"].as_array().expect("a list").len(), 1);

        harness.shutdown().await;
    }

    /// The room hub and the sockets that populate it can be out of step, and the seam is
    /// [`AppState::notify_room`]: it drops a peer that has fallen too far behind from `peers` while
    /// that peer's `producers` stay until its own task tears down. Driven directly rather than
    /// through sockets, because filling a 256-deep notification queue over a real socket would test
    /// the timing rather than the bookkeeping.
    #[tokio::test]
    async fn a_lagging_peers_producers_outlive_its_eviction_from_the_fan_out() {
        let mut harness = Harness::enforcing().await;
        let state = Arc::clone(&harness.state);

        let lagging = synthetic_identity("trading-floor", 4242);
        let other = synthetic_identity("trading-floor", 900);
        let _lagging_inbox = state.join_hub(&lagging);
        let _other_inbox = state.join_hub(&other);

        let producer_id: ProducerId = "11111111-1111-4111-8111-111111111111"
            .parse()
            .expect("a producer id");
        state.record_producer(&lagging, producer_id, MediaKind::Audio, json!({}));

        // Exactly what `notify_room` does to a peer that cannot keep up: its sender goes, its
        // producers do not.
        state
            .hub()
            .get_mut("trading-floor")
            .expect("the room hub exists")
            .peers
            .remove(&lagging.id);

        // Now an unrelated peer departs, emptying `peers` while `producers` is not empty.
        assert!(state.leave_hub(&other).is_empty());
        assert!(
            state.hub().contains_key("trading-floor"),
            "the hub must not be deleted while a producer is still recorded in it - doing so \
             erases a still-producing peer from every future joiner's roster"
        );

        let newcomer = synthetic_identity("trading-floor", 901);
        let _newcomer_inbox = state.join_hub(&newcomer);
        assert_eq!(
            state
                .producers_visible_to(&newcomer)
                .into_iter()
                .map(|info| info.producer_id)
                .collect::<Vec<_>>(),
            vec![producer_id],
            "a late joiner must still see the producer of a peer that is on its way out"
        );

        // And the evicted peer's own teardown still has the producer ids to announce, so viewers
        // are told which tiles to take away rather than being left with them forever.
        assert_eq!(state.leave_hub(&lagging), vec![producer_id]);
        state.leave_hub(&newcomer);
        assert!(
            !state.hub().contains_key("trading-floor"),
            "an empty room must still be evicted once both are gone"
        );

        harness.shutdown().await;
    }

    // ------------------------------------------------------------------ capacity

    /// Per-session caps bound what one peer can take; nothing bounded how many peers there were,
    /// and a grant is replayable by design. The scarce resource is the RTC port range, so the
    /// ceiling is that range restated - and a peer past it must be refused at the door rather than
    /// admitted to fail some *other* participant's transport later.
    #[tokio::test]
    async fn peers_past_the_connection_ceiling_are_refused_at_the_upgrade() {
        // The narrowest range `Config::validate` accepts for one worker: 100 ports, 12 peers.
        let config = test_config_with_ports(100);
        let limit = config.max_peers();
        assert_eq!(limit, 12, "the ceiling must follow the port range");
        let mut harness = Harness::start_with(Admission::RequireGrant, config).await;

        let mut admitted = Vec::new();
        // User ids start at 1: a grant's `uid` must be a positive integer (`grant.rs:326`).
        for uid in 1..=limit as i64 {
            admitted.push(harness.peer("trading-floor", uid, Role::Member).await);
        }
        let (_, body) = harness.get("/health").await;
        assert_eq!(body["peers"], limit);

        let grant = harness.grant_for("trading-floor", 999, Role::Presenter);
        let error = harness
            .connect(&format!("grant={grant}"))
            .await
            .err()
            .expect("a peer past the ceiling must not get a socket");
        match error {
            WsError::Http(response) => assert_eq!(
                response.status(),
                StatusCode::SERVICE_UNAVAILABLE,
                "a full server is a 503, not a 401 - the grant is fine, the server is not"
            ),
            other => panic!("must be refused at the HTTP layer, got {other:?}"),
        }

        // A slot freed by a departure is reusable, so the ceiling is a ceiling and not a quota.
        drop(admitted.pop());
        for _ in 0..100 {
            if harness.state.peer_count() < limit {
                break;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        let mut replacement = harness.peer("trading-floor", 999, Role::Presenter).await;
        replacement
            .ok("getRouterRtpCapabilities", json!(null))
            .await;

        harness.shutdown().await;
    }

    /// A peer that stops answering must be closed, or every resource it holds is held forever.
    ///
    /// This is the exact shape measured in production on 2026-08-10: two sockets to the SFU, alive
    /// at the TCP layer with the client's stack still ACKing keepalives, and **zero application
    /// bytes in over two hours**. The room never emptied, `/health` reported two participants, and
    /// two of that user's four connection slots were held by sockets nobody was behind.
    ///
    /// The socket here is connected and then never polled again, which is what makes it a faithful
    /// reproduction: a tungstenite client answers pings only while its stream is being polled, so
    /// an unpolled socket is a peer whose TCP stack is fine and whose application is not - and
    /// nothing else in the server can tell the difference.
    #[tokio::test]
    async fn a_peer_that_stops_answering_is_closed_and_its_slot_released() {
        let mut config = test_config();
        config.peer_ping_interval = Duration::from_millis(50);
        config.peer_silence_limit = Duration::from_millis(200);
        let mut harness = Harness::start_with(Admission::RequireGrant, config).await;

        let grant = harness.grant_for("trading-floor", 4242, Role::Presenter);
        let held = harness
            .connect(&format!("grant={grant}"))
            .await
            .expect("the peer is admitted normally");
        assert_eq!(
            harness.state.peer_count(),
            1,
            "the peer must be counted while it is connected"
        );

        // Deliberately not polled: this is the ghost.
        for _ in 0..250 {
            if harness.state.peer_count() == 0 {
                break;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        assert_eq!(
            harness.state.peer_count(),
            0,
            "a peer silent past the limit must have its socket closed and its slot released"
        );

        drop(held);
        harness.shutdown().await;
    }

    /// The other half, and the more dangerous one to get wrong: the heartbeat must not evict a peer
    /// that IS answering. Closing live sockets every minute would be a worse defect than the leak,
    /// and it would look like an intermittent network fault rather than a server decision.
    ///
    /// Nothing here answers the ping deliberately - the client is simply *read*, and RFC 6455
    /// §5.5.2 auto-pong does the rest. That is the property the fix depends on: no client change.
    #[tokio::test]
    async fn a_peer_that_keeps_answering_is_never_evicted() {
        let mut config = test_config();
        config.peer_ping_interval = Duration::from_millis(50);
        config.peer_silence_limit = Duration::from_millis(200);
        let mut harness = Harness::start_with(Admission::RequireGrant, config).await;

        let grant = harness.grant_for("trading-floor", 7, Role::Presenter);
        let peer = harness
            .connect(&format!("grant={grant}"))
            .await
            .expect("the peer is admitted normally");

        // Keep the stream polled so tungstenite answers the pings, and hold it well past several
        // silence limits.
        let pump = tokio::spawn(async move {
            let mut peer = peer;
            while let Some(Ok(_)) = peer.socket.next().await {}
        });
        tokio::time::sleep(Duration::from_millis(1_000)).await;

        assert_eq!(
            harness.state.peer_count(),
            1,
            "a peer answering the heartbeat must still be connected after five silence limits"
        );

        pump.abort();
        harness.shutdown().await;
    }

    #[tokio::test]
    async fn replaying_one_identity_cannot_monopolize_the_server() {
        let config = test_config_with_ports(200);
        assert!(
            config.max_peers() > MAX_CONNECTIONS_PER_VERIFIED_USER,
            "the regression needs a global ceiling larger than the identity ceiling"
        );
        let mut harness = Harness::start_with(Admission::RequireGrant, config).await;
        let grant = harness.grant_for("trading-floor", 4242, Role::Member);

        let mut admitted = Vec::new();
        for _ in 0..MAX_CONNECTIONS_PER_VERIFIED_USER {
            admitted.push(
                harness
                    .connect(&format!("grant={grant}"))
                    .await
                    .expect("the reviewed per-identity allowance should be available"),
            );
        }

        let refusal = harness
            .connect(&format!("grant={grant}"))
            .await
            .err()
            .expect("another replay of the same verified identity must be refused");
        match refusal {
            WsError::Http(response) => {
                assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE)
            }
            other => panic!("must be refused before upgrade, got {other:?}"),
        }
        assert!(
            harness.state.peer_count() < harness.state.config.max_peers(),
            "the per-identity refusal must happen before global capacity is exhausted"
        );

        drop(admitted.pop());
        for _ in 0..100 {
            if harness.state.peer_count() < MAX_CONNECTIONS_PER_VERIFIED_USER {
                break;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        let mut replacement = harness
            .connect(&format!("grant={grant}"))
            .await
            .expect("a released identity slot must be reusable");
        replacement
            .ok("getRouterRtpCapabilities", json!(null))
            .await;

        harness.shutdown().await;
    }

    // ------------------------------------------------------------------ protocol errors

    /// A client that sends nonsense must get an answer it can correlate, or it waits on a promise
    /// nothing will ever resolve - the exact hang the captured client suffers on a bad ack.
    #[tokio::test]
    async fn malformed_and_unknown_requests_are_answered_rather_than_dropped() {
        let mut harness = Harness::enforcing().await;
        let mut peer = harness.peer("trading-floor", 4242, Role::Presenter).await;

        // Not JSON at all, and JSON without an id: both answerable only with a null id.
        for garbage in ["this is not json", r#"{"cmd":"produce"}"#] {
            peer.socket
                .send(WsMessage::text(garbage))
                .await
                .expect("sent");
            let reply = peer.read().await;
            assert_eq!(reply["ok"], json!(false));
            assert_eq!(reply["id"], json!(null));
            assert_eq!(reply["error"]["code"], "badEnvelope");
        }

        assert_eq!(
            peer.refused("summonTheKraken", json!({})).await,
            "unknownCommand"
        );
        assert_eq!(
            peer.refused("createWebRtcTransport", json!({ "producing": true }))
                .await,
            "badPayload",
            "a missing field must be named, not defaulted"
        );
        assert_eq!(
            peer.refused(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false, "forceTcp": true })
            )
            .await,
            "badPayload",
            "an unknown field must fail loudly rather than be silently ignored"
        );
        assert_eq!(
            peer.refused(
                "createWebRtcTransport",
                json!({ "producing": false, "consuming": false })
            )
            .await,
            "badPayload"
        );
        assert_eq!(
            peer.refused(
                "connectTransport",
                json!({
                    "transportId": "3755456e-3da7-4c4b-a089-44976c9d9870",
                    "dtlsParameters": { "role": "client", "fingerprints": [] },
                })
            )
            .await,
            "unknownTransport",
            "a transport id this session does not own must be refused, whoever owns it"
        );

        // The socket is still usable after all of that.
        peer.ok("getRouterRtpCapabilities", json!(null)).await;

        harness.shutdown().await;
    }

    /// `close` is a command like any other: it is acknowledged, and only then does the socket go.
    #[tokio::test]
    async fn the_close_command_acknowledges_before_the_socket_goes() {
        let mut harness = Harness::enforcing().await;
        let mut peer = harness.peer("trading-floor", 4242, Role::Presenter).await;
        peer.ok(
            "createWebRtcTransport",
            json!({ "producing": true, "consuming": true }),
        )
        .await;
        assert_eq!(harness.state.registry.peer_count("trading-floor"), 1);

        peer.ok("close", json!(null)).await;
        let farewell = timeout(REPLY_TIMEOUT, peer.socket.next())
            .await
            .expect("a close frame arrives")
            .expect("the socket is open")
            .expect("a well-formed frame");
        assert!(
            matches!(farewell, WsMessage::Close(_)),
            "got {farewell:?} instead of a close frame"
        );

        // The room has to be released, not merely the socket - otherwise the router leaks.
        for _ in 0..100 {
            if harness.state.registry.room_count() == 0 {
                break;
            }
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        assert_eq!(harness.state.registry.room_count(), 0);

        harness.shutdown().await;
    }

    // ------------------------------------------------------------------ shutdown

    /// SIGTERM with a live room. Peers must be told, rooms must be evicted, and the workers must
    /// actually close - which they only can once the routers holding them are gone.
    #[tokio::test]
    async fn graceful_shutdown_closes_peers_rooms_and_workers() {
        let mut harness = Harness::enforcing().await;
        let mut alice = harness.peer("trading-floor", 4242, Role::Presenter).await;
        let mut bob = harness.peer("trading-floor", 900, Role::Member).await;

        let send = alice
            .ok(
                "createWebRtcTransport",
                json!({ "producing": true, "consuming": false }),
            )
            .await;
        alice
            .ok(
                "produce",
                json!({
                    "transportId": send["id"],
                    "kind": "audio",
                    "rtpParameters": opus_send_parameters(77_777_777),
                }),
            )
            .await;
        bob.ok(
            "createWebRtcTransport",
            json!({ "producing": false, "consuming": true }),
        )
        .await;
        assert_eq!(harness.state.registry.room_count(), 1);

        harness.shutdown().await;

        // Every peer is told to go away with "going away", not dropped mid-frame.
        for (label, peer) in [("alice", &mut alice), ("bob", &mut bob)] {
            let mut saw_close = false;
            while let Ok(Some(frame)) = timeout(REPLY_TIMEOUT, peer.socket.next()).await {
                match frame {
                    Ok(WsMessage::Close(Some(frame))) => {
                        assert_eq!(u16::from(frame.code), CLOSE_GOING_AWAY);
                        saw_close = true;
                        break;
                    }
                    Ok(_) => continue,
                    Err(error) => panic!("{label} got {error} instead of a close frame"),
                }
            }
            assert!(
                saw_close,
                "{label} was never told the server was going away"
            );
        }

        assert_eq!(
            harness.state.registry.room_count(),
            0,
            "shutdown must evict the rooms, or their routers stay open on a worker"
        );
        assert_eq!(harness.state.peer_count(), 0);
        // The proof that step 4 really happened after step 3: the pool refuses new routers because
        // it has no workers left, not because it is merely marked closed.
        assert!(harness.pool.create_router().await.is_err());
    }
}
