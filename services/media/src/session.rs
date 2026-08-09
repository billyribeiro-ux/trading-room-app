//! Per-peer session state: the transports, producers and consumers one connected peer owns.
//!
//! [`crate::router_registry`] answers "which router is this room on". This module answers "what
//! does this *peer* own on it", and it exists mainly to make two failure modes unrepresentable.
//!
//! **Leaks are expensive here, not merely untidy.** mediasoup exposes no public `close()` on any
//! entity - every one of `Worker`, `Router`, `WebRtcTransport`, `Producer` and `Consumer` is
//! `#[must_use = "... will be closed on drop ..."]` and closes only when its last clone is dropped.
//! So a handle stored in a map that nobody ever removes is not garbage-collected; it is a live
//! object on a worker thread. For a transport that is concrete: each `ListenInfo` binds one socket
//! out of the worker's `--rtcMinPort..--rtcMaxPort` slice, and this module asks for two (UDP + TCP)
//! per transport. A session that forgets to close therefore burns four ports permanently, and the
//! symptom lands on some unrelated participant minutes later as "transport creation failed" on a
//! service whose logs look perfectly healthy. That is why every handle lives inside one
//! `Mutex<Option<Open>>`: closing is a single `take()`, so it cannot half-happen, and the ordinary
//! `Drop` of the struct does exactly what an explicit `close()` does.
//!
//! **A room reference is part of that state.** The [`RoomHandle`] is stored in the same `Open`, and
//! it is declared *last* so Rust's field drop order releases it after the transports that were
//! built on its router. Dropping it is what decrements the registry's peer count and lets an
//! emptied room evict its router.
//!
//! # Transport parameters
//!
//! Sockets bind to the wildcard address of the announced address's family and advertise
//! `Config::announced_address`, which is the only arrangement that works behind NAT: the bindable
//! address on the host and the address peers must send RTP to are different machines' worth of
//! different. mediasoup permits exactly this and states the precondition we satisfy - "If you use
//! `0.0.0.0` or `::` into `listen_infos`, then you need to also provide `announced_address`"
//! (`mediasoup-0.24.3/src/router/webrtc_transport.rs:90-93`).
//!
//! The port each socket lands on comes from the worker's own slice of `Config`'s RTC range, and it
//! gets there *without* this module naming a range. `ListenInfo::port_range` is left `None`, which
//! `ToFbs` sends to the worker as the sentinel `PortRange { min: 0, max: 0 }`
//! (`mediasoup-0.24.3/src/data_structures.rs:26-31`), and the worker then allocates from the
//! `--rtcMinPort`/`--rtcMaxPort` it was spawned with (`mediasoup-0.24.3/src/worker.rs:366-367`) -
//! which `worker_pool::spawn_worker` sets to `Config::port_range_for(index)`
//! (`worker_pool.rs:100-105`). This is deliberate rather than incidental: a `Session` holds a
//! `Router`, and `Router::worker()` exposes no port range, so a session that named a range would
//! have to *guess* which worker its router landed on. A wrong guess is worse than no guess - it
//! would either bind outside the slice or collide with a neighbouring worker - so the slice keeps a
//! single source of truth (the worker's spawn arguments) and this module inherits it.
//! `transport_ports_come_from_the_workers_slice` pins that down against real workers.
//!
//! # Everything a peer can ask for is capped, and `produce` payloads are screened
//!
//! Every entity this module creates is worker-side state that survives until the session closes,
//! and every one of them is created by a client command - so transports, producers and consumers
//! each have a ceiling ([`MAX_TRANSPORTS_PER_SESSION`], [`MAX_PRODUCERS_PER_SESSION`],
//! [`MAX_CONSUMERS_PER_SESSION`]) claimed through the same [`Slot`] reservation, which counts the
//! window between the cap check and the worker's answer so concurrent commands cannot race past it.
//!
//! Separately, [`validate_produce_parameters`] refuses the two `rtpParameters` shapes that make
//! mediasoup **panic** instead of returning `ProduceError`. That distinction is what makes it this
//! module's problem rather than the crate's: a returned error is one refused command, whereas a
//! panic unwinds the whole task awaiting it - and for one of the two the panic does not even land
//! on the peer that caused it, but on every *other* peer that consumes the producer. See that
//! function for the two shapes, the exact `unwrap()` sites and the runtime reproduction.
//!
//! # Consumers are created paused
//!
//! [`Session::consume`] sets [`ConsumerOptions::paused`], and the peer must call
//! [`Session::resume_consumer`] once its local consumer exists. That is mediasoup's own
//! prescription - "When creating a consumer it's recommended to set `ConsumerOptions::paused` to
//! `true`, then transmit the consumer parameters to the consuming endpoint and, once the consuming
//! endpoint has created its local side consumer, unpause the server side consumer"
//! (`mediasoup-0.24.3/src/router/transport.rs:262-265`) - and it is also what the captured client
//! is written against. In `docs/source/main.d6d3c112b59b7d0d.js` at byte 1095040 the client does:
//!
//! ```js
//! const {id:_, kind:F, rtpParameters:S} = h,
//!       w = yield r.consumerTransport.consume({id:_, data:h, producerId:e, kind:F, rtpParameters:S, codecOptions:{}});
//! console.log("UNPAUSING...consumer");
//! r.socket.emit("cmd", {cmd:"resumeConsumer", id:_}, async B => {...});
//! ```
//!
//! It emits `resumeConsumer` unconditionally on every single consume, and the bundle contains no
//! `pauseConsumer` command and no client-side `consumer.resume()` anywhere. An unconditional resume
//! that the client never balances with a pause only makes sense against a server that created the
//! consumer paused; against a server that did not, it is a no-op and the first RTP packets are sent
//! before the receiver exists, which costs the viewer a keyframe wait. Honest gap: the server half
//! of that deployment is not in the dump, so this is inferred from the client's command set plus
//! mediasoup's documented ordering - it is not an observed server behaviour.
//!
//! # `can_consume` is checked first
//!
//! [`Router::can_consume`] is a pure local predicate (`router.rs:1447-1469` -> `ortc::can_consume`,
//! no worker round trip) and it is checked before every [`Session::consume`].
//!
//! One correction to the folklore reason, since it matters for what we tell the client: consuming
//! something undecodable does *not* silently produce a black frame at the mediasoup layer.
//! `ortc::get_consumer_rtp_parameters` intersects the producer's consumable codecs with the
//! client's advertised ones (`ortc.rs:774-787`) and returns
//! `ConsumerRtpParametersError::NoCompatibleMediaCodecs` when nothing survives (`ortc.rs:814-816`),
//! which surfaces as `ConsumeError::BadConsumerRtpParameters` (`router/transport.rs:658-664`).
//! `can_consume` applies the identical `match_codecs(.., strict)` test (`ortc.rs:728-742`), so the
//! two agree.
//!
//! The gate earns its place for three other reasons:
//!
//! * It collapses two different disasters into one typed refusal. `can_consume` also returns
//!   `false` - not an error - for a producer id this router has never heard of (`router.rs:1462`),
//!   because `get_producer` only searches the *calling router's* producers. Routers are rooms, so
//!   that is the check that stops a peer in room A from consuming a producer id it scraped from
//!   room B. `a_peer_cannot_consume_a_producer_from_another_room` covers it.
//! * It refuses *before* `consume_impl` allocates a `ConsumerId` and buffers worker messages
//!   against it (`router/transport.rs:682-685`).
//! * A late failure is one the captured client shape cannot represent at all: its only rejection
//!   path is `if ("error" == h) return void l();` (byte 1094980), and any other unexpected ack
//!   makes `transport.consume()` throw inside an un-awaited async callback, so the outer promise
//!   never settles and the tile stays blank forever. Deciding up front is what lets a client render
//!   an honest "cannot decode this stream" instead of hanging.

use crate::config::Config;
use crate::router_registry::RoomHandle;
use mediasoup::consumer::{Consumer, ConsumerId, ConsumerLayers, ConsumerOptions, ConsumerType};
use mediasoup::producer::{Producer, ProducerId, ProducerOptions};
use mediasoup::router::Router;
use mediasoup::transport::{ConsumeError, ProduceError, Transport, TransportId};
use mediasoup::types::data_structures::{
    AppData, DtlsParameters, IceCandidate, IceParameters, ListenInfo, Protocol,
};
use mediasoup::types::rtp_parameters::{
    MediaKind, RtpCapabilities, RtpCodecParametersParametersValue, RtpParameters,
};
use mediasoup::types::sctp_parameters::SctpParameters;
use mediasoup::webrtc_transport::{
    WebRtcTransport, WebRtcTransportListenInfos, WebRtcTransportOptions,
    WebRtcTransportRemoteParameters,
};
use mediasoup::worker::RequestError;
use serde::Serialize;
use std::collections::HashMap;
use std::fmt;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::sync::{Mutex, MutexGuard, PoisonError};
use thiserror::Error;

/// A peer needs two transports, one per direction - the captured client's `initTransports` creates
/// a send transport (only for producers) and a recv transport and nothing else
/// (`docs/source/main.d6d3c112b59b7d0d.js` bytes 1079380 and 1080880).
///
/// The cap is four rather than two to leave room for the one legitimate reason a peer asks again:
/// after a recv transport reaches `failed` the captured client discards it and builds a fresh one
/// (byte 1081900, the Firefox TURN-relay retry). The server cannot tell that the old one was
/// abandoned, so it keeps holding its ports until the session closes - a bounded leak by design,
/// where an uncapped session would let one looping client drain a whole worker's slice.
pub(crate) const MAX_TRANSPORTS_PER_SESSION: usize = 4;

/// UDP and TCP sockets one transport binds out of its worker's port slice - one `ListenInfo` each,
/// see [`Session::transport_options`]. Lives here because it is a fact about how this module builds
/// a transport, and `Config::max_peers` turns it into a connection ceiling.
pub(crate) const PORTS_PER_TRANSPORT: usize = 2;

/// Producers one session may own at once.
///
/// The captured client produces at most three at a time - microphone, webcam and screen share
/// (`docs/source/main.d6d3c112b59b7d0d.js` bytes 1083612, 1088520 and 1104332) - and its reconnect
/// path re-produces all three without first closing the old ones (byte 1118331), so a peer can
/// legitimately hold two generations at once. Sixteen is generous headroom on that; the point of
/// the number is only that there *is* one, because every producer is worker-side RTP state that
/// lives until the session closes.
const MAX_PRODUCERS_PER_SESSION: usize = 16;

/// Consumers one session may own at once.
///
/// A peer legitimately needs one per producer in its room, so this is the ceiling on room size that
/// this service enforces: [`MAX_PRODUCERS_PER_SESSION`] producers each, from sixteen other peers.
/// Honest note: nothing in the repo establishes a real room size (the app's roster is hardcoded to
/// the connected user alone, `src/routes/+page.server.ts:283`), so this is a policy ceiling picked
/// to be far above the captured UI's two webcam slots and its screen tabs, not a measured one.
const MAX_CONSUMERS_PER_SESSION: usize = 256;

/// Encodings one `produce` may carry.
///
/// Past 99, mediasoup builds every *consumer's* scalability mode as `format!("L{}T{}", n, ..)` and
/// `unwrap()`s the parse (`mediasoup-0.24.3/src/ortc.rs:899-906`), while the grammar it parses
/// against admits one or two digits only (`^[LS]([1-9][0-9]?)T([1-9][0-9]?)(_KEY)?`,
/// `scalability_modes.rs:170`). Runtime-checked against a real worker: 99 encodings consume
/// cleanly, 100 panic inside `Transport::consume` - i.e. on the *viewer's* task, not the
/// producer's. So this cap is not tuning, it is the boundary between a typed refusal for one peer
/// and an unwound task for every other peer in the room.
///
/// Sixteen rather than 99 because there is no legitimate client anywhere near it: the captured
/// client's widest encoding array is two (`QS`, byte 1071710), its VP9 path is a single encoding
/// (`XS`, byte 1071656), and browser simulcast tops out at three layers.
const MAX_ENCODINGS_PER_PRODUCER: usize = 16;

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("the session is closed")]
    Closed,
    #[error("a transport must produce, consume or both")]
    DirectionlessTransport,
    #[error("this session already has {MAX_TRANSPORTS_PER_SESSION} transports")]
    TooManyTransports,
    #[error("this session already has {MAX_PRODUCERS_PER_SESSION} producers")]
    TooManyProducers,
    #[error("this session already has {MAX_CONSUMERS_PER_SESSION} consumers")]
    TooManyConsumers,
    #[error(
        "rtpParameters carries {encodings} encodings, more than the {MAX_ENCODINGS_PER_PRODUCER} allowed"
    )]
    TooManyEncodings { encodings: usize },
    #[error(
        "the RTX codec with payload type {payload_type} has apt={apt}, which is not a media codec in the same rtpParameters"
    )]
    RtxAptIsNotAMediaCodec { payload_type: u8, apt: u32 },
    #[error("this session has no transport {0}")]
    UnknownTransport(TransportId),
    #[error("transport {transport_id} was not created to {wanted}")]
    WrongDirection {
        transport_id: TransportId,
        wanted: &'static str,
    },
    #[error("this session has no producer {0}")]
    UnknownProducer(ProducerId),
    #[error("this session has no consumer {0}")]
    UnknownConsumer(ConsumerId),
    #[error("failed to create a WebRTC transport: {0}")]
    TransportCreate(#[source] RequestError),
    #[error("failed to connect transport {transport_id}: {source}")]
    TransportConnect {
        transport_id: TransportId,
        #[source]
        source: RequestError,
    },
    #[error("failed to produce: {0}")]
    Produce(#[from] ProduceError),
    #[error(
        "producer {producer_id} is not in this room, or this peer's rtpCapabilities cannot decode it"
    )]
    CannotConsume { producer_id: ProducerId },
    #[error("failed to consume producer {producer_id}: {source}")]
    Consume {
        producer_id: ProducerId,
        #[source]
        source: ConsumeError,
    },
    #[error("failed to {action}: {source}")]
    Request {
        action: &'static str,
        #[source]
        source: RequestError,
    },
}

/// What a transport was created for. A send transport must refuse `consume` and a recv transport
/// must refuse `produce`: mediasoup itself allows both on any `WebRtcTransport`, so nothing below
/// this layer would catch a client that mixed them up, and the result is media that negotiates
/// cleanly and then flows down a path the peer is not listening on.
#[derive(Debug, Clone, Copy)]
struct Direction {
    producing: bool,
    consuming: bool,
}

struct TransportEntry {
    transport: WebRtcTransport,
    direction: Direction,
}

/// What a caller is about to do with a transport it has looked up. An enum rather than the verb
/// string alone so that adding a third use has to be handled here rather than silently falling into
/// whichever check the catch-all arm happened to be.
#[derive(Debug, Clone, Copy)]
enum Wanted {
    Connect,
    Produce,
    Consume,
}

impl Wanted {
    fn verb(self) -> &'static str {
        match self {
            Wanted::Connect => "be used",
            Wanted::Produce => "produce",
            Wanted::Consume => "consume",
        }
    }
}

/// One of the three capped things a session owns. An enum rather than three copies of the
/// reserve/release dance so a fourth cannot be added without deciding what its cap is.
#[derive(Debug, Clone, Copy)]
enum Resource {
    Transport = 0,
    Producer = 1,
    Consumer = 2,
}

impl Resource {
    fn too_many(self) -> SessionError {
        match self {
            Resource::Transport => SessionError::TooManyTransports,
            Resource::Producer => SessionError::TooManyProducers,
            Resource::Consumer => SessionError::TooManyConsumers,
        }
    }
}

/// Everything a session owns while it is open. Field order is drop order: consumers and producers
/// first, then the transports they were created on, then the room reference last.
struct Open {
    consumers: HashMap<ConsumerId, Consumer>,
    producers: HashMap<ProducerId, Producer>,
    transports: HashMap<TransportId, TransportEntry>,
    /// Entities whose worker round trip is still in flight, indexed by [`Resource`]. Creating one
    /// is not atomic - the cap check happens before the round trip and the insert after it - so
    /// without counting the gap, N concurrent creates all read "there is room" and then each add
    /// one, and the cap does nothing at exactly the moment it matters.
    reserved: [usize; 3],
    room: RoomHandle,
}

impl Open {
    /// Live entities of one kind, plus the ones still being created.
    fn in_use(&self, resource: Resource) -> usize {
        let live = match resource {
            Resource::Transport => self.transports.len(),
            Resource::Producer => self.producers.len(),
            Resource::Consumer => self.consumers.len(),
        };
        live + self.reserved[resource as usize]
    }

    fn cap(resource: Resource) -> usize {
        match resource {
            Resource::Transport => MAX_TRANSPORTS_PER_SESSION,
            Resource::Producer => MAX_PRODUCERS_PER_SESSION,
            Resource::Consumer => MAX_CONSUMERS_PER_SESSION,
        }
    }
}

/// A claim on one of the session's capped slots, held across the worker round trip.
///
/// RAII rather than a manual decrement for the reason [`RoomHandle`] is: a create that fails, or
/// whose future is dropped mid-flight because the peer's socket died, must give the slot back, and
/// those are exactly the paths an explicit release gets skipped on.
struct Slot<'a> {
    session: &'a Session,
    resource: Resource,
    held: bool,
}

impl Slot<'_> {
    /// The slot has become a real entity (or the whole `Open` was taken away by a close, which
    /// released every slot with it), so stop tracking it. Never takes the lock, so it is safe to
    /// call while one is held.
    fn release(&mut self) {
        self.held = false;
    }
}

impl Drop for Slot<'_> {
    fn drop(&mut self) {
        if !self.held {
            return;
        }
        let mut guard = self.session.locked();
        if let Some(open) = guard.as_mut() {
            let counter = &mut open.reserved[self.resource as usize];
            *counter = counter.saturating_sub(1);
        }
    }
}

/// One connected peer's media state.
///
/// Every method takes `&self` so the signalling task can share it (`Arc<Session>`) between its
/// reader and any spawned work, and dropping the last reference closes everything.
pub struct Session {
    /// Kept outside `Open` so logs and errors can still name the room after a close.
    room_id: String,
    announced_address: IpAddr,
    open: Mutex<Option<Open>>,
}

/// What the peer needs to build its side of a transport.
///
/// These are mediasoup's own types re-serialised verbatim, which is safe because they already
/// produce the camelCase shape mediasoup-client's `TransportOptions` expects - `r#type` renames to
/// `type`, `tcpType` is omitted when absent, and DTLS fingerprints come out as uppercase
/// colon-separated hex.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransportParameters {
    pub id: TransportId,
    pub ice_parameters: IceParameters,
    pub ice_candidates: Vec<IceCandidate>,
    pub dtls_parameters: DtlsParameters,
    /// Omitted rather than sent as `null`: SCTP is off (`WebRtcTransportOptions::new` leaves
    /// `enable_sctp` false), and the captured client spreads the whole recv ack straight into
    /// `device.createRecvTransport({...s, ...})` (byte 1081205), so a null key would land inside
    /// `TransportOptions` instead of being absent from it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sctp_parameters: Option<SctpParameters>,
}

/// What the peer needs to build its side of a consumer.
///
/// `id`, `kind` and `rtpParameters` are the three the captured client destructures (byte 1095040);
/// `type` and `producerPaused` are carried because a client that renders an honest "paused" state
/// needs them and they cost nothing.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsumerParameters {
    pub id: ConsumerId,
    pub producer_id: ProducerId,
    pub kind: MediaKind,
    pub rtp_parameters: RtpParameters,
    pub r#type: ConsumerType,
    pub producer_paused: bool,
}

impl Session {
    /// Starts a session for a peer that has already joined a room.
    pub fn new(room: RoomHandle, config: &Config) -> Self {
        Self {
            room_id: room.room_id().to_owned(),
            announced_address: config.announced_address,
            open: Mutex::new(Some(Open {
                consumers: HashMap::new(),
                producers: HashMap::new(),
                transports: HashMap::new(),
                reserved: [0; 3],
                room,
            })),
        }
    }

    #[must_use]
    pub fn room_id(&self) -> &str {
        &self.room_id
    }

    #[must_use]
    pub fn is_closed(&self) -> bool {
        self.locked().is_none()
    }

    /// Creates a WebRTC transport and returns what the peer needs to build its own side of it.
    ///
    /// `producing` / `consuming` are the direction the peer asked for; they are recorded and
    /// enforced by [`Session::produce`] and [`Session::consume`].
    pub async fn create_transport(
        &self,
        producing: bool,
        consuming: bool,
    ) -> Result<TransportParameters, SessionError> {
        if !producing && !consuming {
            return Err(SessionError::DirectionlessTransport);
        }

        // Phase 1 (locked, no await): claim a slot and find out which router to build on. The
        // claim owns the slot from here on, and is dropped before the lock is taken again, so its
        // own `Drop` can never re-enter the mutex it is protecting.
        let (mut slot, router) =
            self.reserve(Resource::Transport, |open| open.room.router().clone())?;

        // Phase 2 (unlocked): the worker round trip.
        let transport = router
            .create_webrtc_transport(self.transport_options())
            .await
            .map_err(SessionError::TransportCreate)?;

        let parameters = TransportParameters {
            id: transport.id(),
            ice_parameters: transport.ice_parameters().clone(),
            ice_candidates: transport.ice_candidates().clone(),
            // Owned, and read before `connect()` - which overwrites the local role with the one the
            // worker chose (`webrtc_transport.rs:1062`). The peer only ever sees this first value.
            dtls_parameters: transport.dtls_parameters(),
            sctp_parameters: transport.sctp_parameters(),
        };

        // Phase 3 (locked, no await): turn the claim into a transport. No `?` inside, so the guard
        // is always released before `slot` is touched.
        let stored = {
            let mut guard = self.locked();
            match guard.as_mut() {
                Some(open) => {
                    open.reserved[Resource::Transport as usize] -= 1;
                    open.transports.insert(
                        parameters.id,
                        TransportEntry {
                            transport,
                            direction: Direction {
                                producing,
                                consuming,
                            },
                        },
                    );
                    true
                }
                // The session closed while the round trip was in flight, taking every slot with it.
                // Leaving `transport` unmoved is the point: it is dropped on the way out of this
                // function - after the guard is released - so its ports go straight back to the
                // worker instead of being stranded in a map nobody will ever close.
                None => false,
            }
        };
        slot.release();
        if !stored {
            return Err(SessionError::Closed);
        }

        tracing::debug!(
            room = %self.room_id,
            transport = %parameters.id,
            producing,
            consuming,
            candidates = parameters.ice_candidates.len(),
            "webrtc transport created"
        );
        Ok(parameters)
    }

    /// Completes the DTLS handshake with the peer's parameters.
    ///
    /// The captured client sends this lazily from the transport's own `connect` event - on the
    /// first produce for the send transport and the first consume for the recv one (bytes 1080066
    /// and 1081451) - so it can arrive long after the transport was created, or never.
    pub async fn connect_transport(
        &self,
        transport_id: TransportId,
        dtls_parameters: DtlsParameters,
    ) -> Result<(), SessionError> {
        let transport = self.transport(transport_id, Wanted::Connect)?;

        transport
            .connect(WebRtcTransportRemoteParameters { dtls_parameters })
            .await
            .map_err(|source| SessionError::TransportConnect {
                transport_id,
                source,
            })?;

        tracing::debug!(room = %self.room_id, transport = %transport_id, "transport connected");
        Ok(())
    }

    /// Injects one of the peer's tracks into the room's router.
    ///
    /// `app_data` is the client's own tag for the track and is kept server side only - mediasoup's
    /// `AppData` is an `Arc<dyn Any>` and is never sent to the worker. The captured client uses it
    /// to distinguish a screen share from a webcam on the same `video` kind (`{share:true,
    /// screenName, isReconnect, prevMuserID}`, byte 1104332), which is exactly the sort of thing a
    /// room roster later needs to read back out of [`Session::producer_app_data`].
    ///
    /// `rtp_parameters` is checked by [`validate_produce_parameters`] first, because two shapes of
    /// it make mediasoup panic rather than return `ProduceError`.
    pub async fn produce(
        &self,
        transport_id: TransportId,
        kind: MediaKind,
        rtp_parameters: RtpParameters,
        app_data: serde_json::Value,
    ) -> Result<ProducerId, SessionError> {
        validate_produce_parameters(&rtp_parameters)?;
        let transport = self.transport(transport_id, Wanted::Produce)?;
        let (mut slot, ()) = self.reserve(Resource::Producer, |_| ())?;

        let mut options = ProducerOptions::new(kind, rtp_parameters);
        options.app_data = AppData::new(app_data);

        let producer = transport.produce(options).await?;
        let producer_id = producer.id();

        // As in `create_transport`: no `?` inside, so the guard is always released before `slot` is
        // touched, and a producer the session can no longer store is dropped - which closes it -
        // rather than stranded on the worker.
        let stored = {
            let mut guard = self.locked();
            match guard.as_mut() {
                Some(open) => {
                    open.reserved[Resource::Producer as usize] -= 1;
                    open.producers.insert(producer_id, producer);
                    true
                }
                None => false,
            }
        };
        slot.release();
        if !stored {
            return Err(SessionError::Closed);
        }

        tracing::debug!(
            room = %self.room_id,
            transport = %transport_id,
            producer = %producer_id,
            ?kind,
            "producer created"
        );
        Ok(producer_id)
    }

    /// Creates a **paused** consumer for `producer_id` and returns what the peer needs to build its
    /// own side. Call [`Session::resume_consumer`] once the peer confirms it has done so.
    ///
    /// `producer_id` may belong to any peer in the same room; it is `can_consume` that establishes
    /// that it belongs to *this room* at all.
    pub async fn consume(
        &self,
        transport_id: TransportId,
        producer_id: ProducerId,
        rtp_capabilities: RtpCapabilities,
    ) -> Result<ConsumerParameters, SessionError> {
        let transport = self.transport(transport_id, Wanted::Consume)?;

        let router = self.router()?;
        if !router.can_consume(&producer_id, &rtp_capabilities) {
            return Err(SessionError::CannotConsume { producer_id });
        }

        let (mut slot, ()) = self.reserve(Resource::Consumer, |_| ())?;

        let mut options = ConsumerOptions::new(producer_id, rtp_capabilities);
        options.paused = true;

        let consumer =
            transport
                .consume(options)
                .await
                .map_err(|source| SessionError::Consume {
                    producer_id,
                    source,
                })?;

        let parameters = ConsumerParameters {
            id: consumer.id(),
            producer_id: consumer.producer_id(),
            kind: consumer.kind(),
            rtp_parameters: consumer.rtp_parameters().clone(),
            r#type: consumer.r#type(),
            producer_paused: consumer.producer_paused(),
        };

        // As in `create_transport`: dropping the consumer here is the point, not a leak.
        let stored = {
            let mut guard = self.locked();
            match guard.as_mut() {
                Some(open) => {
                    open.reserved[Resource::Consumer as usize] -= 1;
                    open.consumers.insert(parameters.id, consumer);
                    true
                }
                None => false,
            }
        };
        slot.release();
        if !stored {
            return Err(SessionError::Closed);
        }

        tracing::debug!(
            room = %self.room_id,
            transport = %transport_id,
            consumer = %parameters.id,
            producer = %producer_id,
            "consumer created paused"
        );
        Ok(parameters)
    }

    /// Starts the flow of RTP for a consumer, once the peer has built its local side.
    pub async fn resume_consumer(&self, consumer_id: ConsumerId) -> Result<(), SessionError> {
        let consumer = self.consumer(consumer_id)?;
        consumer
            .resume()
            .await
            .map_err(|source| SessionError::Request {
                action: "resume a consumer",
                source,
            })
    }

    /// Restricts a consumer to a spatial/temporal layer of its producer.
    ///
    /// This is what makes several simultaneous screen shares affordable. A viewer watching one
    /// screen full-size and three others as background tabs does not need full resolution for the
    /// three: without layer control every consumer is forwarded the producer's top layer, so N
    /// shares cost N times the bandwidth and N times the decode, regardless of what the viewer is
    /// actually looking at.
    ///
    /// `spatial_layer` selects resolution, `temporal_layer` frame rate; `None` for the temporal
    /// layer leaves it at the producer's maximum (`consumer.rs:42-47`). The layers available depend
    /// on how the producer encoded: an `S3T3` SVC producer offers 3x3, a two-layer simulcast
    /// producer offers 2 spatial and no meaningful temporal choice, and a producer sent with no
    /// `encodings` at all has a single layer where every request collapses to 0.
    ///
    /// Asking for a layer above what the producer offers is not an error - mediasoup clamps to the
    /// highest available - so a client need not know the producer's encoding to ask for less.
    pub async fn set_consumer_preferred_layers(
        &self,
        consumer_id: ConsumerId,
        layers: ConsumerLayers,
    ) -> Result<(), SessionError> {
        let consumer = self.consumer(consumer_id)?;
        consumer
            .set_preferred_layers(layers)
            .await
            .map_err(|source| SessionError::Request {
                action: "set a consumer's preferred layers",
                source,
            })
    }

    /// Whether a consumer of this session is paused server side.
    ///
    /// Reads through a short-lived clone on purpose: a `Consumer` held any longer keeps its
    /// transport alive (`consumer.rs:746`), so an accessor that handed one out would let a caller
    /// pin a session's ports open by accident.
    pub fn consumer_paused(&self, consumer_id: ConsumerId) -> Result<bool, SessionError> {
        Ok(self.consumer(consumer_id)?.paused())
    }

    /// Whether a producer of this session is paused server side.
    pub fn producer_paused(&self, producer_id: ProducerId) -> Result<bool, SessionError> {
        Ok(self.producer(producer_id)?.paused())
    }

    /// Whether a producer of this session has been closed out from under it - by its transport
    /// going away, or by the room's router closing.
    pub fn producer_closed(&self, producer_id: ProducerId) -> Result<bool, SessionError> {
        Ok(self.producer(producer_id)?.closed())
    }

    /// Tears down a consumer. The captured client's `stopConsumer` (byte 1098174).
    pub fn close_consumer(&self, consumer_id: ConsumerId) -> Result<(), SessionError> {
        let removed = {
            let mut guard = self.locked();
            let open = guard.as_mut().ok_or(SessionError::Closed)?;
            open.consumers.remove(&consumer_id)
        };
        // Dropped outside the lock: closing runs mediasoup's `on_close` subscribers in place, and
        // those belong to signalling code that may well want to call back into this session.
        match removed {
            Some(consumer) => {
                drop(consumer);
                Ok(())
            }
            None => Err(SessionError::UnknownConsumer(consumer_id)),
        }
    }

    /// Tears down a producer. The captured client's `closeProducer` (bytes 1085952, 1090663,
    /// 1108608).
    pub fn close_producer(&self, producer_id: ProducerId) -> Result<(), SessionError> {
        let removed = {
            let mut guard = self.locked();
            let open = guard.as_mut().ok_or(SessionError::Closed)?;
            open.producers.remove(&producer_id)
        };
        match removed {
            Some(producer) => {
                drop(producer);
                Ok(())
            }
            None => Err(SessionError::UnknownProducer(producer_id)),
        }
    }

    /// Mutes a producer without tearing it down. The captured client uses this only for the
    /// microphone (bytes 1086296 and 1086681).
    pub async fn pause_producer(&self, producer_id: ProducerId) -> Result<(), SessionError> {
        let producer = self.producer(producer_id)?;
        producer
            .pause()
            .await
            .map_err(|source| SessionError::Request {
                action: "pause a producer",
                source,
            })
    }

    /// Unmutes a producer.
    pub async fn resume_producer(&self, producer_id: ProducerId) -> Result<(), SessionError> {
        let producer = self.producer(producer_id)?;
        producer
            .resume()
            .await
            .map_err(|source| SessionError::Request {
                action: "resume a producer",
                source,
            })
    }

    /// The `app_data` this session passed to [`Session::produce`].
    pub fn producer_app_data(
        &self,
        producer_id: ProducerId,
    ) -> Result<serde_json::Value, SessionError> {
        let producer = self.producer(producer_id)?;
        Ok(producer
            .app_data()
            .downcast_ref::<serde_json::Value>()
            .cloned()
            .unwrap_or(serde_json::Value::Null))
    }

    #[must_use]
    pub fn transport_ids(&self) -> Vec<TransportId> {
        self.locked()
            .as_ref()
            .map(|open| open.transports.keys().copied().collect())
            .unwrap_or_default()
    }

    #[must_use]
    pub fn producer_ids(&self) -> Vec<ProducerId> {
        self.locked()
            .as_ref()
            .map(|open| open.producers.keys().copied().collect())
            .unwrap_or_default()
    }

    #[must_use]
    pub fn consumer_ids(&self) -> Vec<ConsumerId> {
        self.locked()
            .as_ref()
            .map(|open| open.consumers.keys().copied().collect())
            .unwrap_or_default()
    }

    /// Closes every transport (and with them every producer and consumer on them) and releases this
    /// peer's reference to the room.
    ///
    /// Idempotent, and identical to what dropping the `Session` does - which is the point: a
    /// signalling task that returns early, is cancelled or panics still frees the ports.
    ///
    /// Returns whether this call was the one that closed it.
    pub fn close(&self) -> bool {
        let closing = {
            let mut guard = self.locked();
            guard.take()
        };

        // Outside the lock, for the same reason `close_consumer` drops outside it.
        match closing {
            Some(open) => {
                tracing::debug!(
                    room = %self.room_id,
                    transports = open.transports.len(),
                    producers = open.producers.len(),
                    consumers = open.consumers.len(),
                    "session closed"
                );
                drop(open);
                true
            }
            None => false,
        }
    }

    /// Two listen infos, so a peer whose network drops UDP still has a path. Ports are not named
    /// here - see the module docs for why the worker's own slice is the single source of truth.
    fn transport_options(&self) -> WebRtcTransportOptions {
        let listen_infos = WebRtcTransportListenInfos::new(self.listen_info(Protocol::Udp))
            .insert(self.listen_info(Protocol::Tcp));

        let mut options = WebRtcTransportOptions::new(listen_infos);
        // `new()` defaults `enable_tcp` to false, and these flags - not the listen infos - are what
        // decide which protocols become ICE candidates (`messages.rs:692-695`; the crate's own
        // `create_with_webrtc_server_succeeds` test sets `enable_udp = false` against UDP+TCP
        // listen infos and asserts exactly one TCP candidate comes back).
        options.enable_udp = true;
        options.enable_tcp = true;
        // TCP is the fallback, not the choice: it adds head-of-line blocking to a real-time stream.
        options.prefer_udp = true;
        options
    }

    fn listen_info(&self, protocol: Protocol) -> ListenInfo {
        ListenInfo {
            protocol,
            ip: wildcard_for(self.announced_address),
            announced_address: Some(self.announced_address.to_string()),
            // The wildcard bind would otherwise resolve to whatever the host's own address happens
            // to be and advertise it alongside the announced one - a candidate that is unroutable
            // from outside and only slows ICE down.
            expose_internal_ip: false,
            port: None,
            port_range: None,
            flags: None,
            send_buffer_size: None,
            recv_buffer_size: None,
        }
    }

    /// Claims one slot of `resource` and reads whatever else the caller needs from the same locked
    /// section, so the cap check and the read cannot be separated by a close.
    ///
    /// The returned [`Slot`] holds the claim until it is released or dropped; the lock is gone
    /// before it exists, so its `Drop` can never re-enter the mutex.
    fn reserve<T>(
        &self,
        resource: Resource,
        read: impl FnOnce(&Open) -> T,
    ) -> Result<(Slot<'_>, T), SessionError> {
        let read = {
            let mut guard = self.locked();
            let open = guard.as_mut().ok_or(SessionError::Closed)?;
            if open.in_use(resource) >= Open::cap(resource) {
                return Err(resource.too_many());
            }
            open.reserved[resource as usize] += 1;
            read(open)
        };
        Ok((
            Slot {
                session: self,
                resource,
                held: true,
            },
            read,
        ))
    }

    /// Looks a transport up and checks it was created for what the caller wants to do with it.
    fn transport(
        &self,
        transport_id: TransportId,
        wanted: Wanted,
    ) -> Result<WebRtcTransport, SessionError> {
        let guard = self.locked();
        let open = guard.as_ref().ok_or(SessionError::Closed)?;
        let entry = open
            .transports
            .get(&transport_id)
            .ok_or(SessionError::UnknownTransport(transport_id))?;

        let allowed = match wanted {
            Wanted::Connect => true,
            Wanted::Produce => entry.direction.producing,
            Wanted::Consume => entry.direction.consuming,
        };
        if !allowed {
            return Err(SessionError::WrongDirection {
                transport_id,
                wanted: wanted.verb(),
            });
        }
        Ok(entry.transport.clone())
    }

    fn producer(&self, producer_id: ProducerId) -> Result<Producer, SessionError> {
        let guard = self.locked();
        let open = guard.as_ref().ok_or(SessionError::Closed)?;
        open.producers
            .get(&producer_id)
            .cloned()
            .ok_or(SessionError::UnknownProducer(producer_id))
    }

    fn consumer(&self, consumer_id: ConsumerId) -> Result<Consumer, SessionError> {
        let guard = self.locked();
        let open = guard.as_ref().ok_or(SessionError::Closed)?;
        open.consumers
            .get(&consumer_id)
            .cloned()
            .ok_or(SessionError::UnknownConsumer(consumer_id))
    }

    fn router(&self) -> Result<Router, SessionError> {
        let guard = self.locked();
        let open = guard.as_ref().ok_or(SessionError::Closed)?;
        Ok(open.room.router().clone())
    }

    /// No `await` happens under this guard anywhere in the module, so a poisoned lock cannot mean a
    /// half-updated session - recovering beats poisoning a peer's whole connection because one
    /// unrelated task panicked. Same reasoning as `router_registry::RouterRegistry::rooms`.
    fn locked(&self) -> MutexGuard<'_, Option<Open>> {
        self.open.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

impl fmt::Debug for Session {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let guard = self.locked();
        let mut out = f.debug_struct("Session");
        out.field("room_id", &self.room_id);
        match guard.as_ref() {
            Some(open) => out
                .field("transports", &open.transports.len())
                .field("producers", &open.producers.len())
                .field("consumers", &open.consumers.len()),
            None => out.field("closed", &true),
        }
        .finish()
    }
}

/// Refuses the two `produce` payloads that make mediasoup **panic** instead of returning
/// [`ProduceError`].
///
/// mediasoup does validate `rtpParameters`, but only shallowly: `validate_rtp_codec_parameters`
/// checks that `apt` is a number and nothing else (`mediasoup-0.24.3/src/ortc.rs:218-234`). Two
/// shapes get past it and reach an `unwrap()`:
///
/// * **An RTX codec whose `apt` resolves to another RTX codec** (including itself).
///   `get_producer_rtp_parameters_mapping` fills its codec map from the non-RTX codecs only
///   (`ortc.rs:437-441`) and then resolves each RTX codec's `apt` against *all* of them
///   (`ortc.rs:477-487`), so the look-up at `ortc.rs:492` returns `None` and unwraps. The search
///   below is deliberately the same `find` - first codec whose payload type equals `apt` - because
///   anything looser would accept a payload type that mediasoup resolves to a different codec.
///   Runtime-reproduced against a real worker: `thread panicked at ortc.rs:492:86: called
///   Option::unwrap() on a None value`.
///
/// * **More than 99 encodings.** That one does not fail here at all - `produce` returns `Ok` - and
///   detonates later on whichever *other* peer consumes the producer, because building the
///   consumer's scalability mode does `format!("L{n}T{t}").parse().unwrap()` (`ortc.rs:899-906`)
///   against a grammar that admits at most two digits (`scalability_modes.rs:170`). Runtime-checked
///   at the boundary: 99 encodings consume cleanly, 100 panic inside `Transport::consume`. See
///   [`MAX_ENCODINGS_PER_PRODUCER`] for why the cap is well below 99.
///
/// Everything else stays mediasoup's job. An `apt` that is missing, is a string, or names no codec
/// at all is already a typed error (`RtpParametersError::InvalidAptParameter`,
/// `RtpParametersMappingError::MissingMediaCodecForRtx`), and duplicating those checks here would
/// mean two places to keep in step.
fn validate_produce_parameters(rtp_parameters: &RtpParameters) -> Result<(), SessionError> {
    if rtp_parameters.encodings.len() > MAX_ENCODINGS_PER_PRODUCER {
        return Err(SessionError::TooManyEncodings {
            encodings: rtp_parameters.encodings.len(),
        });
    }

    for codec in &rtp_parameters.codecs {
        if !codec.is_rtx() {
            continue;
        }
        let Some(RtpCodecParametersParametersValue::Number(apt)) = codec.parameters().get("apt")
        else {
            continue;
        };
        let resolves_to_rtx = rtp_parameters
            .codecs
            .iter()
            .find(|media_codec| u32::from(media_codec.payload_type()) == *apt)
            .is_some_and(|media_codec| media_codec.is_rtx());
        if resolves_to_rtx {
            return Err(SessionError::RtxAptIsNotAMediaCodec {
                payload_type: codec.payload_type(),
                apt: *apt,
            });
        }
    }

    Ok(())
}

/// The bindable wildcard of the announced address's family. Binding IPv4's `0.0.0.0` while
/// announcing an IPv6 address (or the reverse) creates a transport whose only candidate points at
/// a socket that does not exist.
fn wildcard_for(announced: IpAddr) -> IpAddr {
    match announced {
        IpAddr::V4(_) => IpAddr::V4(Ipv4Addr::UNSPECIFIED),
        IpAddr::V6(_) => IpAddr::V6(Ipv6Addr::UNSPECIFIED),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::router_registry::RouterRegistry;
    use crate::worker_pool::WorkerPool;
    use serde_json::json;
    use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
    use std::sync::Arc;
    use std::time::Duration;
    use tokio::sync::oneshot;
    use tokio::time::timeout;

    /// These tests are the first in the crate that make a worker actually *bind* UDP and TCP
    /// sockets, and `cargo test` runs them in parallel in one process. Two workers handed the same
    /// range would be racing for the same ports, so every call takes the next 200-port block and
    /// each test's workers get a range no other test can touch. 200 is the smallest block that
    /// satisfies `Config`'s 100-ports-per-worker floor at the two workers used below, and the base
    /// clears `worker_pool`'s tests (42000-42999) and `router_registry`'s (43000-43999).
    const PORT_BLOCK: u16 = 200;
    static NEXT_PORT_BLOCK: AtomicU16 = AtomicU16::new(0);

    fn test_config(workers: usize) -> Config {
        let min = 44000 + NEXT_PORT_BLOCK.fetch_add(1, Ordering::Relaxed) * PORT_BLOCK;
        Config {
            bind_address: "127.0.0.1:0".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: min,
            rtc_port_max: min + PORT_BLOCK - 1,
            workers,
            grant_public_key: None,
            allowed_origin: None,
        }
    }

    /// Real mediasoup workers throughout. A mocked router would happily "consume" a producer it had
    /// never heard of, which is precisely the bug these tests exist to catch.
    async fn harness(workers: usize) -> (RouterRegistry, Config) {
        let config = test_config(workers);
        let pool = WorkerPool::new(config.clone()).await.expect("pool starts");
        (RouterRegistry::new(pool), config)
    }

    async fn session(registry: &RouterRegistry, config: &Config, room: &str) -> Session {
        Session::new(registry.join(room).await.expect("peer joins"), config)
    }

    /// Built by parsing browser-shaped JSON rather than by constructing the Rust types directly, so
    /// the fixture also proves the shape a mediasoup-client `produce` request actually puts on the
    /// wire deserialises into what the router wants (`docs/source/main.d6d3c112b59b7d0d.js` byte
    /// 1080293: `{cmd:"produce", producerTransportId, kind, rtpParameters, appData}`).
    fn opus_send_parameters() -> RtpParameters {
        opus_send_parameters_nth(0)
    }

    /// The `n`th distinct producer payload. Both the `mid` and the SSRC have to differ: the worker
    /// refuses a second producer reusing either on the same transport ("MID already exists in RTP
    /// listener").
    fn opus_send_parameters_nth(index: usize) -> RtpParameters {
        serde_json::from_value(json!({
            "mid": index.to_string(),
            "codecs": [{
                "mimeType": "audio/opus",
                "payloadType": 111,
                "clockRate": 48000,
                "channels": 2,
                "parameters": { "minptime": 10, "useinbandfec": 1, "usedtx": 1 },
                "rtcpFeedback": [{ "type": "transport-cc" }]
            }],
            "headerExtensions": [],
            "encodings": [{ "ssrc": 22_222_222_u32 + index as u32, "dtx": true }],
            "rtcp": { "cname": "tradingroom-media-test", "reducedSize": true }
        }))
        .expect("browser-shaped rtpParameters parse")
    }

    /// A browser that can decode the room's Opus.
    fn opus_capabilities() -> RtpCapabilities {
        serde_json::from_value(json!({
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
        }))
        .expect("browser-shaped rtpCapabilities parse")
    }

    /// A `produce` payload whose RTX codec names *itself* in `apt`.
    ///
    /// mediasoup's own validation passes it - `validate_rtp_codec_parameters` only checks that
    /// `apt` is a number (`ortc.rs:218-234`) - and `get_producer_rtp_parameters_mapping` then
    /// resolves `apt` against *every* codec including RTX ones (`ortc.rs:477-487`) while the map it
    /// looks the answer up in was filled with the non-RTX ones only (`ortc.rs:439`), so the
    /// `unwrap()` at `ortc.rs:492` is reached with `None`.
    fn self_referential_rtx_parameters() -> RtpParameters {
        serde_json::from_value(json!({
            "mid": "0",
            "codecs": [
                {
                    "mimeType": "video/VP8",
                    "payloadType": 101,
                    "clockRate": 90000,
                    "parameters": {},
                    "rtcpFeedback": [{ "type": "nack" }]
                },
                {
                    "mimeType": "video/rtx",
                    "payloadType": 102,
                    "clockRate": 90000,
                    "parameters": { "apt": 102 },
                    "rtcpFeedback": []
                }
            ],
            "headerExtensions": [],
            "encodings": [{ "ssrc": 31_313_131 }],
            "rtcp": { "cname": "tradingroom-media-test", "reducedSize": true }
        }))
        .expect("browser-shaped rtpParameters parse")
    }

    /// A VP8 `produce` payload with `encodings` encodings and a well-formed RTX pairing.
    ///
    /// Past 99 encodings mediasoup builds the consumer's scalability mode as `format!("L{n}T{t}")`
    /// and `unwrap()`s the parse (`ortc.rs:899-906`), but its grammar admits only one or two digits
    /// (`^[LS]([1-9][0-9]?)T([1-9][0-9]?)(_KEY)?`, `scalability_modes.rs:170`) - so the panic lands
    /// on whoever *consumes* the producer, not on whoever created it.
    fn vp8_send_parameters_with_encodings(encodings: usize) -> RtpParameters {
        let encodings: Vec<_> = (0..encodings)
            .map(|index| json!({ "ssrc": 40_000_000_u32 + index as u32 }))
            .collect();
        serde_json::from_value(json!({
            "mid": "0",
            "codecs": [{
                "mimeType": "video/VP8",
                "payloadType": 101,
                "clockRate": 90000,
                "parameters": {},
                "rtcpFeedback": [{ "type": "nack" }]
            }],
            "headerExtensions": [],
            "encodings": encodings,
            "rtcp": { "cname": "tradingroom-media-test", "reducedSize": true }
        }))
        .expect("browser-shaped rtpParameters parse")
    }

    /// A browser that can decode the room's VP8.
    fn vp8_capabilities() -> RtpCapabilities {
        serde_json::from_value(json!({
            "codecs": [{
                "kind": "video",
                "mimeType": "video/VP8",
                "preferredPayloadType": 101,
                "clockRate": 90000,
                "parameters": {},
                "rtcpFeedback": [{ "type": "nack" }]
            }],
            "headerExtensions": []
        }))
        .expect("browser-shaped rtpCapabilities parse")
    }

    /// A browser with video only - it cannot decode an audio producer.
    fn video_only_capabilities() -> RtpCapabilities {
        serde_json::from_value(json!({
            "codecs": [{
                "kind": "video",
                "mimeType": "video/VP8",
                "preferredPayloadType": 101,
                "clockRate": 90000,
                "parameters": {},
                "rtcpFeedback": []
            }],
            "headerExtensions": []
        }))
        .expect("browser-shaped rtpCapabilities parse")
    }

    /// The shape a browser sends on the transport's `connect` event (byte 1080066). The fingerprint
    /// is a real sha-256 value's worth of bytes; the worker validates the format, not the identity.
    fn client_dtls_parameters() -> DtlsParameters {
        serde_json::from_value(json!({
            "role": "client",
            "fingerprints": [{
                "algorithm": "sha-256",
                "value": "FB:32:0E:C4:9B:0E:1F:57:39:2D:7A:5E:2C:8D:3B:11:4A:0C:6F:98:22:D4:71:E0:5B:A9:63:CD:17:84:F2:7C"
            }]
        }))
        .expect("browser-shaped dtlsParameters parse")
    }

    /// The headline: a producer created by one peer is consumable by a *different* peer, because
    /// the registry put both on one router.
    #[tokio::test]
    async fn produce_then_consume_across_two_sessions_in_one_room() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!({ "share": false }),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect("bob consumes alice");

        assert_eq!(consumer.producer_id, producer_id);
        assert_eq!(consumer.kind, MediaKind::Audio);
        assert_eq!(
            consumer.rtp_parameters.codecs.len(),
            1,
            "the consumer must carry the codec the two sides agreed on"
        );
        assert!(
            consumer
                .rtp_parameters
                .encodings
                .iter()
                .any(|e| e.ssrc.is_some()),
            "the consumer must carry an SSRC for the client to bind to"
        );
        assert!(!consumer.producer_paused);
        assert_eq!(alice.producer_ids(), vec![producer_id]);
        assert_eq!(bob.consumer_ids(), vec![consumer.id]);
        // The producer belongs to alice alone; bob holds only his consumer of it.
        assert!(bob.producer_ids().is_empty());
    }

    /// mediasoup's prescribed ordering, and the one the captured client's unconditional
    /// `resumeConsumer` (byte 1095244) is written against.
    #[tokio::test]
    async fn consumers_start_paused_and_resume_on_request() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect("bob consumes");

        assert!(
            bob.consumer_paused(consumer.id).expect("consumer is known"),
            "a consumer must not send RTP before the client has built its local side"
        );

        bob.resume_consumer(consumer.id).await.expect("resume");
        assert!(!bob.consumer_paused(consumer.id).expect("consumer is known"));
    }

    /// The `can_consume` gate, on the case it is really there for: a peer that cannot decode the
    /// stream is refused up front with a typed error instead of a late failure the client shape
    /// cannot represent.
    #[tokio::test]
    async fn a_peer_that_cannot_decode_the_producer_is_refused() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let error = bob
            .consume(recv.id, producer_id, video_only_capabilities())
            .await
            .expect_err("a video-only client cannot consume an audio producer");

        assert!(matches!(error, SessionError::CannotConsume { .. }));
        assert!(
            bob.consumer_ids().is_empty(),
            "a refused consume must not leave a consumer behind"
        );
    }

    /// Routers are rooms. `can_consume` searches only the calling router's producers
    /// (`router.rs:1450-1466`), so a producer id scraped from another room is refused - the same
    /// refusal as "cannot decode", which is correct: neither tells the caller anything about a room
    /// it is not in.
    #[tokio::test]
    async fn a_peer_cannot_consume_a_producer_from_another_room() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let eve = session(&registry, &config, "room-b").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = eve
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let error = eve
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect_err("a producer in another room must not be consumable");

        assert!(matches!(error, SessionError::CannotConsume { .. }));
        assert!(eve.consumer_ids().is_empty());
    }

    /// One network frame must not be able to abort the peer's signalling task.
    ///
    /// mediasoup reaches an `unwrap()` on `None` here rather than returning `ProduceError`
    /// (`ortc.rs:492`), and a panic inside `produce` unwinds the whole task that was awaiting it -
    /// so the reply the client is blocked on is never sent and everything else that task owned is
    /// abandoned mid-flight. Refused before the crate sees it, and refused as a *typed* error the
    /// client can act on.
    #[tokio::test]
    async fn a_produce_whose_rtx_apt_names_an_rtx_codec_is_refused_not_panicked_on() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let send = peer.create_transport(true, false).await.expect("transport");
        let error = peer
            .produce(
                send.id,
                MediaKind::Video,
                self_referential_rtx_parameters(),
                json!(null),
            )
            .await
            .expect_err("an RTX codec whose apt is not a media codec must be refused");

        assert!(matches!(
            error,
            SessionError::RtxAptIsNotAMediaCodec {
                payload_type: 102,
                apt: 102
            }
        ));
        assert!(
            peer.producer_ids().is_empty(),
            "a refused produce must not leave a producer behind"
        );

        // The session is still usable, which is the whole difference between a refusal and a panic.
        peer.produce(
            send.id,
            MediaKind::Video,
            vp8_send_parameters_with_encodings(1),
            json!(null),
        )
        .await
        .expect("a well-formed produce still works");
    }

    /// The same class of defect, but the panic lands on a *different* peer: an over-encoded
    /// producer is accepted by `produce` and then aborts the task of everyone who consumes it
    /// (`ortc.rs:899-906`). One presenter must not be able to take the room's viewers down, so the
    /// refusal has to happen where the encodings enter the service.
    #[tokio::test]
    async fn a_produce_with_more_encodings_than_mediasoup_can_describe_is_refused() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let error = alice
            .produce(
                send.id,
                MediaKind::Video,
                vp8_send_parameters_with_encodings(120),
                json!(null),
            )
            .await
            .expect_err("120 encodings must be refused at produce");
        assert!(matches!(
            error,
            SessionError::TooManyEncodings { encodings: 120 }
        ));
        assert!(alice.producer_ids().is_empty());

        // And the cap is not so tight that a real simulcast ladder cannot get through: the captured
        // client's widest encoding array is two (`QS`, byte 1071710).
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Video,
                vp8_send_parameters_with_encodings(MAX_ENCODINGS_PER_PRODUCER),
                json!(null),
            )
            .await
            .expect("the cap itself is producible");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, vp8_capabilities())
            .await
            .expect("a viewer consumes it without its task being unwound");
        assert_eq!(consumer.producer_id, producer_id);
    }

    /// The parameters the client actually builds its transport from.
    #[tokio::test]
    async fn a_created_transport_carries_the_announced_address_and_both_protocols() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let parameters = peer.create_transport(true, true).await.expect("transport");

        assert_eq!(parameters.ice_candidates.len(), 2, "one UDP and one TCP");
        for candidate in &parameters.ice_candidates {
            assert_eq!(
                candidate.address,
                config.announced_address.to_string(),
                "candidates must advertise the announced address, not the bind address"
            );
        }
        assert!(parameters
            .ice_candidates
            .iter()
            .any(|c| c.protocol == Protocol::Udp));
        assert!(parameters
            .ice_candidates
            .iter()
            .any(|c| c.protocol == Protocol::Tcp));
        assert!(!parameters.ice_parameters.username_fragment.is_empty());
        assert!(!parameters.ice_parameters.password.is_empty());
        assert!(!parameters.dtls_parameters.fingerprints.is_empty());
        assert!(
            parameters.sctp_parameters.is_none(),
            "SCTP is off, so the key must be absent from the ack rather than null"
        );

        // The client spreads the recv ack straight into `createRecvTransport` (byte 1081205), so
        // the serialised shape is the contract, not just the Rust types.
        let wire = serde_json::to_value(&parameters).expect("parameters serialise");
        let object = wire.as_object().expect("an object");
        assert!(object.contains_key("iceParameters"));
        assert!(object.contains_key("iceCandidates"));
        assert!(object.contains_key("dtlsParameters"));
        assert!(
            !object.contains_key("sctpParameters"),
            "an absent option must be omitted, not serialised as null"
        );
        assert_eq!(wire["iceCandidates"][0]["type"], "host");
    }

    /// The port slice is the scarce resource this module is careful with, so prove the transports
    /// really land inside the worker's own slice of `Config`'s range - and that two workers stay on
    /// their own slices. Rooms are handed to workers round robin from a cursor that starts at zero
    /// (`worker_pool.rs:84`), so the first room is on worker 0 and the second on worker 1.
    #[tokio::test]
    async fn transport_ports_come_from_the_workers_slice() {
        let (registry, config) = harness(2).await;

        let first = session(&registry, &config, "room-0").await;
        let second = session(&registry, &config, "room-1").await;

        for (worker_index, peer) in [(0_usize, &first), (1_usize, &second)] {
            let (min, max) = config.port_range_for(worker_index);
            let parameters = peer.create_transport(true, true).await.expect("transport");
            assert_eq!(parameters.ice_candidates.len(), 2);
            for candidate in &parameters.ice_candidates {
                assert!(
                    (min..=max).contains(&candidate.port),
                    "worker {worker_index} bound {} outside its slice {min}-{max}",
                    candidate.port
                );
            }
        }

        // And the two slices really are different, so the assertion above is not vacuous.
        assert_ne!(config.port_range_for(0), config.port_range_for(1));
    }

    /// The DTLS half of the handshake, with the exact JSON a browser sends.
    #[tokio::test]
    async fn connect_completes_the_handshake_with_browser_dtls_parameters() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let parameters = peer.create_transport(true, true).await.expect("transport");
        peer.connect_transport(parameters.id, client_dtls_parameters())
            .await
            .expect("the worker accepts browser-shaped dtlsParameters");
    }

    /// A send transport must refuse to consume and a recv transport must refuse to produce.
    /// mediasoup allows both on any `WebRtcTransport`, so this layer is the only thing that catches
    /// it - and the failure it prevents is media that negotiates cleanly and then flows down a path
    /// the peer is not listening on.
    #[tokio::test]
    async fn a_transport_refuses_the_direction_it_was_not_created_for() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");

        let error = bob
            .produce(
                recv.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect_err("a recv transport must not produce");
        assert!(matches!(
            error,
            SessionError::WrongDirection {
                wanted: "produce",
                ..
            }
        ));

        let error = alice
            .consume(send.id, producer_id, opus_capabilities())
            .await
            .expect_err("a send transport must not consume");
        assert!(matches!(
            error,
            SessionError::WrongDirection {
                wanted: "consume",
                ..
            }
        ));
    }

    /// A transport id from another peer is not a transport of *this* session.
    #[tokio::test]
    async fn a_session_only_knows_its_own_transports() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let alices = alice.create_transport(true, true).await.expect("transport");

        let error = bob
            .connect_transport(alices.id, client_dtls_parameters())
            .await
            .expect_err("bob must not be able to drive alice's transport");
        assert!(matches!(error, SessionError::UnknownTransport(id) if id == alices.id));
    }

    #[tokio::test]
    async fn a_directionless_transport_is_refused() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let error = peer
            .create_transport(false, false)
            .await
            .expect_err("a transport that neither produces nor consumes is a bug");
        assert!(matches!(error, SessionError::DirectionlessTransport));
        assert!(peer.transport_ids().is_empty());
    }

    /// An uncapped session lets one looping client drain a worker's whole port slice.
    #[tokio::test]
    async fn transports_per_session_are_capped() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        for _ in 0..MAX_TRANSPORTS_PER_SESSION {
            peer.create_transport(false, true)
                .await
                .expect("within the cap");
        }
        let error = peer
            .create_transport(false, true)
            .await
            .expect_err("past the cap");

        assert!(matches!(error, SessionError::TooManyTransports));
        assert_eq!(peer.transport_ids().len(), MAX_TRANSPORTS_PER_SESSION);
    }

    /// Transports were capped for exactly this reason and producers were not: a producer is
    /// worker-side RTP state that lives until the session closes, so an authenticated peer looping
    /// `produce` grows a worker without bound.
    #[tokio::test]
    async fn producers_per_session_are_capped() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let send = peer.create_transport(true, false).await.expect("transport");
        for index in 0..MAX_PRODUCERS_PER_SESSION {
            peer.produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters_nth(index),
                json!(null),
            )
            .await
            .expect("within the cap");
        }

        let error = peer
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters_nth(MAX_PRODUCERS_PER_SESSION),
                json!(null),
            )
            .await
            .expect_err("past the cap");
        assert!(matches!(error, SessionError::TooManyProducers));
        assert_eq!(peer.producer_ids().len(), MAX_PRODUCERS_PER_SESSION);

        // The cap is a ceiling on what is *held*, not a lifetime quota: closing one frees a slot.
        let released = peer.producer_ids()[0];
        peer.close_producer(released).expect("close");
        peer.produce(
            send.id,
            MediaKind::Audio,
            opus_send_parameters_nth(MAX_PRODUCERS_PER_SESSION + 1),
            json!(null),
        )
        .await
        .expect("a closed producer gives its slot back");
    }

    /// The same for consumers, which are the cheaper half of the pair to create in bulk - one
    /// producer consumed over and over is all a hostile peer needs.
    #[tokio::test]
    async fn consumers_per_session_are_capped() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        for _ in 0..MAX_CONSUMERS_PER_SESSION {
            bob.consume(recv.id, producer_id, opus_capabilities())
                .await
                .expect("within the cap");
        }

        let error = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect_err("past the cap");
        assert!(matches!(error, SessionError::TooManyConsumers));
        assert_eq!(bob.consumer_ids().len(), MAX_CONSUMERS_PER_SESSION);
    }

    /// The cap has to hold under concurrency too, or it does nothing at the one moment it matters.
    /// This is the producer twin of `concurrent_commands_on_a_shared_session_are_safe`.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_produces_respect_the_producer_cap() {
        let (registry, config) = harness(1).await;
        let peer = Arc::new(session(&registry, &config, "room-a").await);
        let send = peer.create_transport(true, false).await.expect("transport");

        let attempts: Vec<_> = (0..MAX_PRODUCERS_PER_SESSION * 2)
            .map(|index| {
                let peer = Arc::clone(&peer);
                tokio::spawn(async move {
                    peer.produce(
                        send.id,
                        MediaKind::Audio,
                        opus_send_parameters_nth(index),
                        json!(null),
                    )
                    .await
                    .is_ok()
                })
            })
            .collect();

        let mut created = 0;
        for attempt in attempts {
            if attempt.await.expect("task finishes") {
                created += 1;
            }
        }

        assert_eq!(created, MAX_PRODUCERS_PER_SESSION);
        assert_eq!(peer.producer_ids().len(), MAX_PRODUCERS_PER_SESSION);
    }

    /// Closing must really close - the transports, the producers and consumers on them, and the
    /// room reference. `on_close` fires from mediasoup's own `Drop`, so it only reports true if the
    /// last clone genuinely went away.
    #[tokio::test]
    async fn closing_a_session_closes_its_media_and_releases_the_room() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect("bob consumes");

        // Closure is observed with a `WeakProducer` and a close handler, never with a retained
        // `Producer`. A retained one owns `Arc<dyn Transport>` (`producer.rs:635`), so it would
        // hold open the transport, the router and the room - it would assert against the exact leak
        // this test exists to detect and always pass. `WeakProducer` explicitly "will not prevent
        // one from being destroyed" (`producer.rs:1145-1148`), and a `HandlerId` owns only the
        // subscription.
        let producer_closed = Arc::new(AtomicBool::new(false));
        let (weak_producer, _producer_handler) = {
            let handle = alice.producer(producer_id).expect("producer is known");
            let flag = Arc::clone(&producer_closed);
            (
                handle.downgrade(),
                handle.on_close(move || flag.store(true, Ordering::SeqCst)),
            )
        };
        // Bob learns of alice's producer closing through a worker notification
        // (`consumer.rs:869`), so this one is awaited rather than read synchronously.
        let (consumer_closed_tx, consumer_closed_rx) = oneshot::channel::<()>();
        let _consumer_handler = {
            let handle = bob.consumer(consumer.id).expect("consumer is known");
            handle.on_close(move || {
                let _ = consumer_closed_tx.send(());
            })
        };

        assert_eq!(registry.peer_count("room-a"), 2);
        assert!(alice.close(), "the first close is the one that closes");
        assert!(!alice.close(), "closing twice must be a no-op, not a panic");

        assert!(alice.is_closed());
        assert!(alice.transport_ids().is_empty());
        assert!(alice.producer_ids().is_empty());
        assert!(
            producer_closed.load(Ordering::SeqCst),
            "closing the session must close the transport, and with it its producers"
        );
        assert!(
            weak_producer.upgrade().is_none(),
            "the producer must be gone from the worker, not merely dropped from a map"
        );
        assert_eq!(
            registry.peer_count("room-a"),
            1,
            "closing must release the session's room reference"
        );
        assert_eq!(registry.room_count(), 1, "bob is still in the room");

        // Alice's producer is gone, so bob's consumer of it dies with it - mediasoup's own
        // producer-close propagation, not something this module has to arrange.
        timeout(Duration::from_secs(5), consumer_closed_rx)
            .await
            .expect("bob's consumer must close when alice's producer goes away")
            .expect("the close handler must fire, not be dropped unfired");

        bob.close();
        assert_eq!(registry.room_count(), 0, "the empty room must be evicted");
    }

    /// The same teardown, but reached by dropping the session rather than calling `close` - the
    /// path a cancelled or panicking signalling task actually takes.
    #[tokio::test]
    async fn dropping_a_session_releases_everything_close_would() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let transport = peer.create_transport(true, true).await.expect("transport");
        let producer_id = peer
            .produce(
                transport.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("peer produces");

        let closed = Arc::new(AtomicBool::new(false));
        let (weak_producer, _handler) = {
            let handle = peer.producer(producer_id).expect("producer is known");
            let flag = Arc::clone(&closed);
            (
                handle.downgrade(),
                handle.on_close(move || flag.store(true, Ordering::SeqCst)),
            )
        };

        assert_eq!(registry.peer_count("room-a"), 1);
        drop(peer);

        assert!(
            closed.load(Ordering::SeqCst),
            "dropping the session must close its media"
        );
        assert!(weak_producer.upgrade().is_none());
        assert_eq!(registry.room_count(), 0, "and release the room");
    }

    /// After a close every command is refused rather than panicking or silently succeeding - the
    /// state a client's in-flight message lands in when its own socket has just gone away.
    #[tokio::test]
    async fn a_closed_session_refuses_every_command() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let transport = peer.create_transport(true, true).await.expect("transport");
        let producer_id = peer
            .produce(
                transport.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("peer produces");
        peer.close();

        assert!(matches!(
            peer.create_transport(true, false).await,
            Err(SessionError::Closed)
        ));
        assert!(matches!(
            peer.connect_transport(transport.id, client_dtls_parameters())
                .await,
            Err(SessionError::Closed)
        ));
        assert!(matches!(
            peer.produce(
                transport.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null)
            )
            .await,
            Err(SessionError::Closed)
        ));
        assert!(matches!(
            peer.consume(transport.id, producer_id, opus_capabilities())
                .await,
            Err(SessionError::Closed)
        ));
        assert!(matches!(
            peer.close_producer(producer_id),
            Err(SessionError::Closed)
        ));
    }

    /// `app_data` is how a room roster later tells a screen share from a webcam on the same `video`
    /// kind (byte 1104332), so it has to survive the round trip through mediasoup's `Arc<dyn Any>`.
    #[tokio::test]
    async fn producer_app_data_survives_the_round_trip() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let transport = peer.create_transport(true, false).await.expect("transport");
        let app_data = json!({ "share": true, "screenName": "Chart 1", "isReconnect": false });
        let producer_id = peer
            .produce(
                transport.id,
                MediaKind::Audio,
                opus_send_parameters(),
                app_data.clone(),
            )
            .await
            .expect("peer produces");

        assert_eq!(
            peer.producer_app_data(producer_id).expect("producer known"),
            app_data
        );
    }

    /// Producer lifecycle: pause, resume, and an explicit close that really closes.
    #[tokio::test]
    async fn a_producer_can_be_paused_resumed_and_closed() {
        let (registry, config) = harness(1).await;
        let peer = session(&registry, &config, "room-a").await;

        let transport = peer.create_transport(true, false).await.expect("transport");
        let producer_id = peer
            .produce(
                transport.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("peer produces");

        assert!(!peer
            .producer_paused(producer_id)
            .expect("producer is known"));
        peer.pause_producer(producer_id).await.expect("pause");
        assert!(peer
            .producer_paused(producer_id)
            .expect("producer is known"));
        peer.resume_producer(producer_id).await.expect("resume");
        assert!(!peer
            .producer_paused(producer_id)
            .expect("producer is known"));

        let closed = Arc::new(AtomicBool::new(false));
        let (weak_producer, _handler) = {
            let handle = peer.producer(producer_id).expect("producer is known");
            let flag = Arc::clone(&closed);
            (
                handle.downgrade(),
                handle.on_close(move || flag.store(true, Ordering::SeqCst)),
            )
        };

        peer.close_producer(producer_id).expect("close");
        assert!(closed.load(Ordering::SeqCst));
        assert!(weak_producer.upgrade().is_none());
        assert!(peer.producer_ids().is_empty());
        assert!(matches!(
            peer.close_producer(producer_id),
            Err(SessionError::UnknownProducer(id)) if id == producer_id
        ));
    }

    /// Consumer teardown, the captured client's `stopConsumer` (byte 1098174).
    #[tokio::test]
    /// Layer control is what makes several simultaneous screens affordable, so this exercises the
    /// real call against a real worker rather than asserting the request was shaped correctly.
    ///
    /// An Opus producer has exactly one layer, and mediasoup clamps a request above what the
    /// producer offers instead of rejecting it - that clamping is the property a client depends on,
    /// because a viewer asking for "less" cannot know how the producer encoded.
    async fn a_consumers_preferred_layers_can_be_set_and_clamped() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-layers").await;
        let bob = session(&registry, &config, "room-layers").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect("bob consumes");

        bob.set_consumer_preferred_layers(
            consumer.id,
            ConsumerLayers {
                spatial_layer: 0,
                temporal_layer: None,
            },
        )
        .await
        .expect("the lowest layer is accepted");

        // Above what this producer offers. Clamped, not refused.
        bob.set_consumer_preferred_layers(
            consumer.id,
            ConsumerLayers {
                spatial_layer: 2,
                temporal_layer: Some(2),
            },
        )
        .await
        .expect("a layer above the producer's is clamped, not rejected");

        // A stale id must still be refused, so a client that raced a close cannot silently no-op.
        bob.close_consumer(consumer.id).expect("close");
        let error = bob
            .set_consumer_preferred_layers(
                consumer.id,
                ConsumerLayers {
                    spatial_layer: 0,
                    temporal_layer: None,
                },
            )
            .await
            .expect_err("a closed consumer is refused");
        assert!(
            matches!(error, SessionError::UnknownConsumer { .. }),
            "{error:?}"
        );
    }

    #[tokio::test]
    async fn a_consumer_can_be_closed_without_touching_the_producer() {
        let (registry, config) = harness(1).await;
        let alice = session(&registry, &config, "room-a").await;
        let bob = session(&registry, &config, "room-a").await;

        let send = alice
            .create_transport(true, false)
            .await
            .expect("send transport");
        let producer_id = alice
            .produce(
                send.id,
                MediaKind::Audio,
                opus_send_parameters(),
                json!(null),
            )
            .await
            .expect("alice produces");

        let recv = bob
            .create_transport(false, true)
            .await
            .expect("recv transport");
        let consumer = bob
            .consume(recv.id, producer_id, opus_capabilities())
            .await
            .expect("bob consumes");

        let closed = Arc::new(AtomicBool::new(false));
        let (weak_consumer, _handler) = {
            let handle = bob.consumer(consumer.id).expect("consumer is known");
            let flag = Arc::clone(&closed);
            (
                handle.downgrade(),
                handle.on_close(move || flag.store(true, Ordering::SeqCst)),
            )
        };

        bob.close_consumer(consumer.id).expect("close");
        assert!(closed.load(Ordering::SeqCst));
        assert!(weak_consumer.upgrade().is_none());
        assert!(bob.consumer_ids().is_empty());
        assert!(
            !alice
                .producer_closed(producer_id)
                .expect("producer is known"),
            "one viewer leaving must not take the stream down for everyone"
        );
        assert!(matches!(
            bob.close_consumer(consumer.id),
            Err(SessionError::UnknownConsumer(id)) if id == consumer.id
        ));
    }

    /// Sessions are shared across a signalling task's reader and its spawned work, so `Arc<Session>`
    /// has to be usable concurrently - and concurrent transport creation must respect the cap
    /// rather than racing past it.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_commands_on_a_shared_session_are_safe() {
        let (registry, config) = harness(1).await;
        let peer = Arc::new(session(&registry, &config, "room-a").await);

        let attempts: Vec<_> = (0..8)
            .map(|_| {
                let peer = Arc::clone(&peer);
                tokio::spawn(async move { peer.create_transport(false, true).await.is_ok() })
            })
            .collect();

        let mut created = 0;
        for attempt in attempts {
            if attempt.await.expect("task finishes") {
                created += 1;
            }
        }

        assert_eq!(created, MAX_TRANSPORTS_PER_SESSION);
        assert_eq!(peer.transport_ids().len(), MAX_TRANSPORTS_PER_SESSION);
    }
}
