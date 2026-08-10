//! One mediasoup [`Router`] per room.
//!
//! A router is mediasoup's routing domain: a producer created on router A is invisible to a
//! consumer created on router B. So "everyone in the same room shares one router" is not a
//! performance choice, it is the definition of a room - two peers that land on different routers
//! see a working connection, a running transport and no media at all, which is the hardest class
//! of bug to diagnose after the fact. Every method here exists to protect that one invariant.
//!
//! The two ways to break it are both concurrency, not logic:
//!
//! * **The create race.** Creating a router is a round trip to a worker thread. If the map lock
//!   is released while that round trip is in flight, a second peer arriving in the same
//!   millisecond sees an empty map and creates a second router - and the two peers are silently
//!   deaf to each other. Holding the map lock across the round trip fixes it but serialises room
//!   creation for the entire service. Instead each room's slot holds a [`tokio::sync::OnceCell`]:
//!   the map lock is taken only to install the slot, and concurrent joiners for the *same* room
//!   park on that room's cell while every other room proceeds in parallel.
//!
//! * **The teardown race.** Routers are not free - each one costs its worker memory and RTP
//!   plumbing for as long as it lives, and mediasoup closes one only when the last clone is
//!   dropped ([`Router`] is `Arc`-backed and closes in `Drop`). A registry that inserts and never
//!   removes therefore leaks a worker-side object per room forever; it passes every test, and it
//!   shows up in production as a worker that slowly stops accepting rooms. So peers are
//!   reference-counted and the room is evicted at zero.
//!
//! * **The worker death.** A [`Router`] dies with the worker it was created on, and nothing tells
//!   this registry when that happens: [`crate::worker_pool`] replaces the dead worker so that
//!   *later* rooms land on a live one, but a room that was already on it holds a cell containing a
//!   closed router, and eviction is by peer count - which never reaches zero, because the peers
//!   holding that room open still have perfectly healthy signalling sockets. Left alone, the room
//!   hands that dead router to every future joiner for as long as one stranded peer stays
//!   connected, and each of them negotiates cleanly and carries no media. So [`RouterRegistry::join`]
//!   checks `Router::closed()` and re-arms the room's cell rather than trusting that a cell which
//!   was once initialised still holds something usable.
//!
//! Membership is an RAII [`RoomHandle`] rather than a `join`/`leave` pair on purpose. A peer's
//! reference is released by dropping the handle, so a signalling task that returns early, is
//! cancelled mid-connection or panics still releases it - the failure modes where an explicit
//! `leave()` is exactly what gets skipped. It also makes the "peer leaves before its own join
//! finished" ordering unrepresentable: the reference is taken before the router round trip starts
//! and can only be released by a handle that the round trip has not yet produced.
//!
//! Room ids are opaque strings and are *not* validated here. Deciding which room ids exist is an
//! admission question (see `config::Config::grant_public_key`); this type must be able to hold a
//! room for any id the admission layer has already blessed.
//!
//! # Honest gap
//!
//! The re-arm above cannot be tested end to end, because mediasoup 0.24.3 exposes no way to close a
//! `Router` or a `Worker` from outside the crate - every `close` is `pub(crate)`, `pub(super)` or
//! `#[cfg(test)]` (`router.rs:1721`, `worker.rs:757`), entities close only when their last clone
//! drops, and a `Router` holds a `Worker` clone so the worker cannot die under a live router.
//! `rearming_a_room_keeps_its_members_and_gives_the_next_joiner_a_fresh_router` therefore exercises
//! the mechanism - the cell swap, the peer count, the convergence of concurrent observers - against
//! real workers, and the `Router::closed()` trigger that fires it is verified only by reading.

use crate::worker_pool::{PoolError, WorkerPool};
use mediasoup::router::Router;
use std::collections::HashMap;
use std::fmt;
use std::ops::Deref;
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use thiserror::Error;
use tokio::sync::OnceCell;

#[derive(Debug, Error)]
pub enum RegistryError {
    #[error("room {room_id} could not be given a router: {source}")]
    RouterCreate {
        room_id: String,
        #[source]
        source: PoolError,
    },
    #[error("room {room_id} was given a router that was already closed")]
    RouterClosed { room_id: String },
}

/// How many times [`RouterRegistry::join`] will re-create a room's router before giving up.
///
/// One retry covers the case this exists for - the room's worker died some time before this peer
/// arrived - while a fresh router that is *also* closed means the pool is failing faster than a
/// joiner can be served, and looping on that would spin.
const REARM_ATTEMPTS: usize = 2;

struct Room {
    /// The router lives behind a cell so that the map lock is never held across the worker round
    /// trip that creates it. Everyone who arrives while it is empty waits on the cell and then
    /// receives the *same* router.
    router: Arc<OnceCell<Router>>,
    /// Live [`RoomHandle`]s (plus in-flight joins). The room is evicted at zero.
    peers: usize,
}

struct Inner {
    pool: Arc<WorkerPool>,
    rooms: Mutex<HashMap<String, Room>>,
}

/// A registry of rooms, cheap to clone (`Arc` inside) so signalling tasks can each hold one.
#[derive(Clone)]
pub struct RouterRegistry {
    inner: Arc<Inner>,
}

impl RouterRegistry {
    pub fn new(pool: Arc<WorkerPool>) -> Self {
        Self {
            inner: Arc::new(Inner {
                pool,
                rooms: Mutex::new(HashMap::new()),
            }),
        }
    }

    /// Joins `room_id`, creating its router on the next worker if this is the first peer.
    ///
    /// Every concurrent caller for the same `room_id` gets a clone of one router. The returned
    /// handle *is* the peer's membership: hold it for as long as the peer is connected, drop it to
    /// leave.
    pub async fn join(&self, room_id: &str) -> Result<RoomHandle, RegistryError> {
        // Phase 1 (locked, no await): claim a reference and find out which cell to wait on.
        let mut cell = {
            let mut rooms = self.rooms();
            match rooms.get_mut(room_id) {
                Some(room) => {
                    room.peers += 1;
                    Arc::clone(&room.router)
                }
                None => {
                    let cell = Arc::new(OnceCell::new());
                    rooms.insert(
                        room_id.to_owned(),
                        Room {
                            router: Arc::clone(&cell),
                            peers: 1,
                        },
                    );
                    cell
                }
            }
        };

        // The ticket owns that reference from here on, so a join that fails - or one whose future
        // is dropped mid-flight - releases it exactly the way a disconnect does. It also pins the
        // map entry: the room cannot be evicted and re-created under a different cell while this
        // join is still initialising, because eviction needs a peer count of zero.
        let ticket = PeerTicket {
            registry: self.clone(),
            room_id: room_id.to_owned(),
        };

        // Phase 2 (unlocked): exactly one caller runs this; the rest await its result.
        //
        // Then check the router is actually *alive*, which is not the same question as whether it
        // was created. A `Router` dies with its worker, and a worker death is invisible from here:
        // `worker_pool` replaces the dead worker so later rooms land on a live one, but a room that
        // was already on it keeps a cell holding a closed router. Nothing observes that close - the
        // registry evicts on peer count, and the peers holding this room open have live signalling
        // sockets, so the count never reaches zero on its own. Without this check the room would
        // hand that dead router to every future joiner for as long as one stranded peer stays
        // connected, and every one of them would negotiate cleanly and carry no media at all.
        for _ in 0..REARM_ATTEMPTS {
            let router = cell
                .get_or_try_init(|| async {
                    let router = self.inner.pool.create_router().await?;
                    tracing::info!(room = %room_id, router = %router.id(), "room router created");
                    Ok::<Router, PoolError>(router)
                })
                .await
                .map_err(|source| RegistryError::RouterCreate {
                    room_id: room_id.to_owned(),
                    source,
                })?
                .clone();

            if !router.closed() {
                return Ok(RoomHandle { router, ticket });
            }

            tracing::warn!(
                room = %room_id,
                router = %router.id(),
                "the room's router is closed - its worker died; re-creating it"
            );
            cell = self.rearm(room_id, &cell);
        }

        Err(RegistryError::RouterClosed {
            room_id: room_id.to_owned(),
        })
    }

    /// Replaces a room's router cell with an empty one, so the next `get_or_try_init` creates a
    /// fresh router on whichever worker the pool is handing out now.
    ///
    /// Returns the cell to use next, which is *not* necessarily a new one: if `dead` is no longer
    /// the room's cell then a concurrent joiner has already re-armed it, and both callers must end
    /// up on that one router rather than racing to create two - the same split-room failure the
    /// `OnceCell` exists to prevent, just reached by a different route.
    ///
    /// The map entry itself is deliberately left alone. Removing and reinserting it would reset
    /// `peers` to nothing while the tickets that were counted in it are still alive, so the room
    /// would be evicted out from under its own members.
    fn rearm(&self, room_id: &str, dead: &Arc<OnceCell<Router>>) -> Arc<OnceCell<Router>> {
        let mut rooms = self.rooms();
        // Our own ticket is holding the entry, so it is still here.
        let Some(room) = rooms.get_mut(room_id) else {
            return Arc::new(OnceCell::new());
        };
        if Arc::ptr_eq(&room.router, dead) {
            room.router = Arc::new(OnceCell::new());
        }
        Arc::clone(&room.router)
    }

    /// The router currently serving `room_id`, if the room exists and its router has finished
    /// being created.
    ///
    /// This is a read-only look-up for signalling code that already holds a [`RoomHandle`] for the
    /// room. It deliberately does *not* take a reference: a clone kept past the last peer's
    /// departure keeps a dead room's router alive on its worker, which is the leak this module
    /// exists to prevent.
    ///
    /// A closed router reads as absent, for the same reason [`RouterRegistry::join`] re-creates
    /// one: answering a peer with the capabilities of a router whose worker has died sends it off
    /// to build transports that can never carry media. "The room is gone, reconnect" is the honest
    /// answer, and it is the one the caller already has a code for.
    #[must_use]
    pub fn router(&self, room_id: &str) -> Option<Router> {
        self.rooms()
            .get(room_id)
            .and_then(|room| room.router.get())
            .filter(|router| !router.closed())
            .cloned()
    }

    /// Live rooms, including one whose router is still being created.
    #[must_use]
    pub fn room_count(&self) -> usize {
        self.rooms().len()
    }

    /// Peers holding a reference to `room_id`, counting joins still in flight. Zero means the room
    /// is not in the registry at all.
    #[must_use]
    pub fn peer_count(&self, room_id: &str) -> usize {
        self.rooms().get(room_id).map_or(0, |room| room.peers)
    }

    /// Drops one peer's reference, evicting the room - and with it the last registry-held clone of
    /// its router - when the count reaches zero.
    fn release(&self, room_id: &str) {
        let evicted = {
            let mut rooms = self.rooms();
            let Some(room) = rooms.get_mut(room_id) else {
                return;
            };
            room.peers = room.peers.saturating_sub(1);
            if room.peers == 0 {
                rooms.remove(room_id)
            } else {
                None
            }
        };

        // Dropped outside the lock on purpose: closing a router runs mediasoup's `on_close`
        // subscribers in place, and those belong to signalling code that may well want to look at
        // this registry.
        if evicted.is_some() {
            drop(evicted);
            tracing::info!(room = %room_id, "room emptied; router closed");
        }
    }

    /// The critical sections guarded by this lock are a handful of map operations with no `await`
    /// and nothing fallible inside them, so a poisoned lock cannot mean a half-updated map.
    /// Recovering beats poisoning every future join because one unrelated task panicked.
    fn rooms(&self) -> MutexGuard<'_, HashMap<String, Room>> {
        self.inner
            .rooms
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
    }
}

impl fmt::Debug for RouterRegistry {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RouterRegistry")
            .field("rooms", &self.room_count())
            .field("workers", &self.inner.pool.worker_count())
            .finish()
    }
}

/// One peer's reference to a room. Releases it on drop, including on unwind.
struct PeerTicket {
    registry: RouterRegistry,
    room_id: String,
}

impl Drop for PeerTicket {
    fn drop(&mut self) {
        self.registry.release(&self.room_id);
    }
}

/// A peer's membership of a room, and the router that peer must build its transports on.
///
/// Dropping this is how a peer leaves. Keep it alive for the whole signalling session: the router
/// is closed once the last handle for the room is gone, taking every transport, producer and
/// consumer on it with it.
pub struct RoomHandle {
    router: Router,
    ticket: PeerTicket,
}

impl RoomHandle {
    pub fn router(&self) -> &Router {
        &self.router
    }

    #[must_use]
    pub fn room_id(&self) -> &str {
        &self.ticket.room_id
    }
}

/// So a handle can be used wherever the router itself would be (`handle.create_webrtc_transport(..)`).
impl Deref for RoomHandle {
    type Target = Router;

    fn deref(&self) -> &Self::Target {
        &self.router
    }
}

impl fmt::Debug for RoomHandle {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RoomHandle")
            .field("room_id", &self.ticket.room_id)
            .field("router", &self.router.id())
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::atomic::{AtomicBool, Ordering};
    use tokio::sync::Barrier;

    /// A range of its own, so these tests never contend with the worker-pool tests' slice.
    fn test_config(workers: usize) -> Config {
        Config {
            bind_address: "127.0.0.1:0".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: 43000,
            rtc_port_max: 43999,
            workers,
            grant_public_key: None,
            allowed_origin: None,
            peer_ping_interval: std::time::Duration::from_secs(20),
            peer_silence_limit: std::time::Duration::from_secs(60),
        }
    }

    /// Real mediasoup workers: a registry that hands out the same router in a mock would prove
    /// nothing about whether mediasoup actually kept it alive.
    async fn registry(workers: usize) -> RouterRegistry {
        let pool = WorkerPool::new(test_config(workers))
            .await
            .expect("pool starts");
        RouterRegistry::new(pool)
    }

    /// The property the whole module exists for: same room id, same router. Different routers
    /// would leave the two peers connected and mutually invisible.
    #[tokio::test]
    async fn two_peers_in_one_room_share_one_router() {
        let registry = registry(2).await;

        let first = registry.join("room-a").await.expect("first peer joins");
        let second = registry.join("room-a").await.expect("second peer joins");

        assert_eq!(
            first.id(),
            second.id(),
            "peers in the same room must be on the same router or they cannot see each other"
        );
        assert_eq!(registry.room_count(), 1);
        assert_eq!(registry.peer_count("room-a"), 2);
    }

    /// Two workers, two rooms: routers must not be shared across rooms either.
    #[tokio::test]
    async fn different_rooms_get_different_routers() {
        let registry = registry(2).await;

        let a = registry.join("room-a").await.expect("room-a joins");
        let b = registry.join("room-b").await.expect("room-b joins");

        assert_ne!(a.id(), b.id());
        assert_eq!(registry.room_count(), 2);
        assert_eq!(registry.peer_count("room-a"), 1);
        assert_eq!(registry.peer_count("room-b"), 1);
    }

    /// The create race, run for real: 16 tasks on 4 threads released from a barrier at the same
    /// instant. A check-then-create registry produces several distinct router ids here.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_joins_of_one_room_create_exactly_one_router() {
        const PEERS: usize = 16;

        let registry = registry(2).await;
        let barrier = Arc::new(Barrier::new(PEERS));

        let joins: Vec<_> = (0..PEERS)
            .map(|_| {
                let registry = registry.clone();
                let barrier = Arc::clone(&barrier);
                tokio::spawn(async move {
                    barrier.wait().await;
                    registry.join("stampede").await.expect("peer joins")
                })
            })
            .collect();

        // Handles are held, not dropped: a router id read after eviction would prove nothing.
        let mut handles = Vec::with_capacity(PEERS);
        for join in joins {
            handles.push(join.await.expect("join task finishes"));
        }

        let first = handles[0].id();
        for handle in &handles {
            assert_eq!(
                handle.id(),
                first,
                "a concurrent join created a second router for the same room"
            );
        }
        assert_eq!(registry.room_count(), 1);
        assert_eq!(registry.peer_count("stampede"), PEERS);
    }

    /// Concurrent joins for *different* rooms must still be one router each - the fix for the
    /// same-room race must not accidentally collapse distinct rooms onto one router.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn concurrent_joins_of_distinct_rooms_get_a_router_each() {
        const ROOMS: usize = 8;

        let registry = registry(2).await;
        let barrier = Arc::new(Barrier::new(ROOMS));

        let joins: Vec<_> = (0..ROOMS)
            .map(|index| {
                let registry = registry.clone();
                let barrier = Arc::clone(&barrier);
                tokio::spawn(async move {
                    barrier.wait().await;
                    registry
                        .join(&format!("room-{index}"))
                        .await
                        .expect("peer joins")
                })
            })
            .collect();

        let mut handles = Vec::with_capacity(ROOMS);
        for join in joins {
            handles.push(join.await.expect("join task finishes"));
        }

        let mut ids: Vec<_> = handles.iter().map(|handle| handle.id()).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), ROOMS, "two rooms ended up sharing a router");
        assert_eq!(registry.room_count(), ROOMS);
    }

    /// The leak this module exists to prevent: the router must actually close, not merely be
    /// forgotten. `on_close` fires from mediasoup's own `Drop`, so it only reports true if the
    /// last clone really went away.
    #[tokio::test]
    async fn the_router_is_closed_when_the_last_peer_leaves() {
        let registry = registry(1).await;

        let first = registry.join("room-a").await.expect("first peer joins");
        let second = registry.join("room-a").await.expect("second peer joins");

        let closed = Arc::new(AtomicBool::new(false));
        // The subscription lives only as long as this handler id is retained.
        let _on_close = {
            let closed = Arc::clone(&closed);
            first.on_close(move || closed.store(true, Ordering::SeqCst))
        };

        drop(first);
        assert_eq!(registry.peer_count("room-a"), 1);
        assert_eq!(registry.room_count(), 1);
        assert!(
            !closed.load(Ordering::SeqCst),
            "the router must survive while a peer is still in the room"
        );
        assert!(registry.router("room-a").is_some());

        drop(second);
        assert_eq!(registry.room_count(), 0, "the empty room must be evicted");
        assert_eq!(registry.peer_count("room-a"), 0);
        assert!(registry.router("room-a").is_none());
        assert!(
            closed.load(Ordering::SeqCst),
            "the router must be closed once the last peer leaves, not just dropped from the map"
        );
    }

    /// Eviction has to remove the entry, not just zero a counter: the next peer must get a live
    /// router, and a different one.
    #[tokio::test]
    async fn rejoining_an_evicted_room_creates_a_fresh_router() {
        let registry = registry(1).await;

        let first = registry.join("room-a").await.expect("first peer joins");
        let first_id = first.id();
        drop(first);
        assert_eq!(registry.room_count(), 0);

        let second = registry.join("room-a").await.expect("peer rejoins");
        assert_ne!(
            second.id(),
            first_id,
            "the evicted router must not be handed out again"
        );
        assert!(!second.closed(), "the fresh router must be live");
        assert_eq!(registry.room_count(), 1);
    }

    /// A peer whose socket dies mid-handshake drops the `join` future before it resolves. The
    /// reference is claimed before the worker round trip starts, so if that path did not release
    /// it the room would sit at one phantom peer and never be evicted - a leak triggered by
    /// exactly the flaky clients an SFU sees most.
    ///
    /// Polled by hand rather than with a timeout so the cancellation lands deterministically
    /// between claiming the reference and the router arriving.
    #[tokio::test]
    async fn a_cancelled_join_leaves_no_room_behind() {
        let registry = registry(1).await;

        let mut join = Box::pin(registry.join("abandoned"));
        assert!(
            futures_util::poll!(join.as_mut()).is_pending(),
            "the first poll should claim the reference and then wait on the worker"
        );
        assert_eq!(
            registry.peer_count("abandoned"),
            1,
            "the in-flight join must hold the room open"
        );

        drop(join);
        assert_eq!(
            registry.room_count(),
            0,
            "a cancelled join must release its reference"
        );
    }

    /// Concurrent churn: peers arriving and leaving at the same time must never leave a room
    /// behind, and must never split the room across two routers while doing it.
    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn churn_leaves_no_room_behind() {
        let registry = registry(2).await;

        // One resident peer keeps the room alive across the churn, so every joiner must land on
        // the resident's router.
        let resident = registry.join("busy").await.expect("resident joins");
        let resident_id = resident.id();

        let churn: Vec<_> = (0..24)
            .map(|_| {
                let registry = registry.clone();
                tokio::spawn(async move {
                    let handle = registry.join("busy").await.expect("peer joins");
                    let id = handle.id();
                    drop(handle);
                    id
                })
            })
            .collect();

        for task in churn {
            assert_eq!(task.await.expect("churn task finishes"), resident_id);
        }

        assert_eq!(registry.peer_count("busy"), 1);
        assert!(!resident.closed());

        drop(resident);
        assert_eq!(registry.room_count(), 0);
    }

    /// What `join` does when it finds the room's router closed, minus the trigger it cannot
    /// produce (see the module's honest gap). The risk in re-arming is not creating the new router,
    /// it is the bookkeeping around it: the members already counted in the room must survive it,
    /// and two joiners that spot the same dead cell must converge on one replacement rather than
    /// splitting the room across two routers - the same failure the `OnceCell` exists to prevent.
    #[tokio::test]
    async fn rearming_a_room_keeps_its_members_and_gives_the_next_joiner_a_fresh_router() {
        let registry = registry(1).await;

        let resident = registry.join("room-a").await.expect("resident joins");
        let stale = {
            let rooms = registry.rooms();
            Arc::clone(&rooms.get("room-a").expect("the room exists").router)
        };
        assert_eq!(
            stale.get().map(Router::id),
            Some(resident.id()),
            "the room's cell must hold the router the resident was given"
        );

        let armed = registry.rearm("room-a", &stale);
        assert!(armed.get().is_none(), "the fresh cell must be empty");
        assert_eq!(
            registry.peer_count("room-a"),
            1,
            "re-arming must not disturb the members already counted in the room"
        );
        assert_eq!(registry.room_count(), 1);

        // A second observer of the *same* dead cell must be handed the replacement, not make its
        // own - otherwise a worker death splits the room in two.
        let converged = registry.rearm("room-a", &stale);
        assert!(
            Arc::ptr_eq(&armed, &converged),
            "a joiner that lost the re-arm race must end up on the winner's cell"
        );

        let newcomer = registry.join("room-a").await.expect("newcomer joins");
        assert_ne!(
            newcomer.id(),
            resident.id(),
            "the next joiner must get the replacement router, not the one that was re-armed away"
        );
        assert!(!newcomer.closed());
        assert_eq!(
            registry.router("room-a").map(|router| router.id()),
            Some(newcomer.id()),
            "look-up must follow the room to its new router"
        );
        assert_eq!(
            registry.peer_count("room-a"),
            2,
            "both the stranded resident and the newcomer hold the room"
        );

        // And the room still evicts correctly afterwards - the count was never corrupted.
        drop(newcomer);
        assert_eq!(registry.room_count(), 1);
        drop(resident);
        assert_eq!(registry.room_count(), 0);
    }

    /// A router handed out by the registry is a live mediasoup router with the negotiated codec
    /// set, not a placeholder.
    #[tokio::test]
    async fn a_joined_room_exposes_a_live_router() {
        let registry = registry(1).await;
        let handle = registry.join("room-a").await.expect("peer joins");

        assert_eq!(handle.room_id(), "room-a");
        assert!(!handle.closed());
        assert!(!handle.rtp_capabilities().codecs.is_empty());
        assert_eq!(
            registry.router("room-a").map(|router| router.id()),
            Some(handle.id()),
            "look-up must return the same router the peer was given"
        );
    }
}
