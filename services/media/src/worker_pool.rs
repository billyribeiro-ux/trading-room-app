//! A pool of mediasoup workers.
//!
//! In *this* crate a mediasoup worker is a C++ **thread inside this process**, not a child
//! process: "A worker represents a mediasoup C++ thread that runs on a single CPU core and
//! handles..." (`mediasoup-0.24.3/src/worker.rs:1`), spawned by `WorkerManager`
//! (`worker_manager.rs:52,92`) rather than by exec'ing a binary the way the Node implementation
//! does. The pool-sizing argument survives that correction unchanged - a worker thread still runs
//! on one core, so a single worker caps the whole SFU at one core's worth of media - but two
//! consequences of it do not, and they are worth stating rather than inheriting from the Node
//! mental model:
//!
//! * A worker death is *not* isolated from us by a process boundary. It is
//!   `Worker::on_dead`, "called when the worker thread unexpectedly dies" (`worker.rs:737-738`),
//!   and whatever killed the thread happened inside this address space.
//! * Nothing here can be verified by looking for child processes, and a worker cannot be killed
//!   from outside for testing. That is why this module has no test that exercises a real death -
//!   an honest gap, not an oversight.
//!
//! Death replacement is still the right design, for the reason it always was: when a worker dies
//! every router, transport, producer and consumer it owned dies with it, and mediasoup does not
//! resurrect them. A pool that only logs the death keeps handing out a dead handle to every
//! subsequent room, so the service looks up and serves nothing. This pool replaces the dead worker
//! in place, on its own port slice, so later rooms land on a live one; sessions that were on it are
//! lost and must reconnect, which the client already handles through its normal connect path, and
//! [`crate::router_registry`] is what stops the *rooms* that were on it from outliving it.

use crate::codecs::media_codecs;
use crate::config::Config;
use event_listener_primitives::HandlerId;
use mediasoup::prelude::*;
use mediasoup::worker::{WorkerLogLevel, WorkerSettings};
use mediasoup::worker_manager::WorkerManager;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, PoisonError};
use thiserror::Error;
use tokio::sync::{mpsc, RwLock};
use tokio::task::JoinHandle;

#[derive(Debug, Error)]
pub enum PoolError {
    #[error("failed to create a mediasoup worker: {0}")]
    WorkerCreate(String),
    #[error("failed to create a router: {0}")]
    RouterCreate(String),
    #[error("the worker pool has been shut down")]
    ShutDown,
}

struct Slot {
    worker: Worker,
    /// Retaining the handler keeps the death subscription alive; dropping it unsubscribes.
    _on_dead: HandlerId,
}

pub struct WorkerPool {
    manager: WorkerManager,
    config: Config,
    slots: RwLock<Vec<Slot>>,
    /// Round-robin cursor. Rooms are spread across workers rather than stacked on the first one,
    /// which is what keeps a busy room from starving every other room on the same core.
    cursor: AtomicUsize,
    deaths: AtomicUsize,
    /// The replacement task's handle, so [`WorkerPool::shutdown`] can stop it.
    ///
    /// It has to be retained: that task owns an `Arc<WorkerPool>` *and* the sending half of the
    /// death channel, so it holds itself alive and the pool with it - nothing that merely drops a
    /// pool handle can ever close the workers. Without this the only thing that closes them is the
    /// process exiting.
    replacer: Mutex<Option<JoinHandle<()>>>,
}

impl WorkerPool {
    pub async fn new(config: Config) -> Result<Arc<Self>, PoolError> {
        let manager = WorkerManager::new();
        let (death_tx, death_rx) = mpsc::unbounded_channel::<usize>();

        let mut slots = Vec::with_capacity(config.workers);
        for index in 0..config.workers {
            slots.push(spawn_worker(&manager, &config, index, death_tx.clone()).await?);
        }

        let pool = Arc::new(Self {
            manager,
            config,
            slots: RwLock::new(slots),
            cursor: AtomicUsize::new(0),
            deaths: AtomicUsize::new(0),
            replacer: Mutex::new(None),
        });

        let replacer = tokio::spawn(replace_dead_workers(Arc::clone(&pool), death_rx, death_tx));
        *pool.replacer.lock().unwrap_or_else(PoisonError::into_inner) = Some(replacer);
        Ok(pool)
    }

    pub fn worker_count(&self) -> usize {
        self.config.workers
    }

    /// How many workers have died since start. Surfaced on /health: a pool that is quietly
    /// replacing a worker every few minutes is failing even though every request looks fine.
    pub fn deaths(&self) -> usize {
        self.deaths.load(Ordering::Relaxed)
    }

    /// Creates a router on the next worker in rotation.
    pub async fn create_router(&self) -> Result<Router, PoolError> {
        // The worker is cloned out and the guard dropped *before* the round trip. `Worker` is
        // `Arc`-backed, so the clone costs nothing and keeps the worker alive on its own.
        //
        // Holding the read guard across the `await` instead would make room creation
        // self-throttling: tokio's `RwLock` is write-preferring, so one waiting writer - a worker
        // replacement, or `shutdown` - blocks every *subsequent* reader even though readers do not
        // conflict with each other. One dying worker would then stall room creation service-wide
        // until its replacement finished spawning.
        let worker = {
            let slots = self.slots.read().await;
            // After `shutdown` the pool is empty. Refusing here rather than indexing is not
            // defensive padding: `% slots.len()` on an empty pool is a division by zero, i.e. a
            // panic on a socket that arrives during shutdown.
            if slots.is_empty() {
                return Err(PoolError::ShutDown);
            }
            let index = self.cursor.fetch_add(1, Ordering::Relaxed) % slots.len();
            slots[index].worker.clone()
        };

        worker
            .create_router(RouterOptions::new(media_codecs()))
            .await
            .map_err(|error| PoolError::RouterCreate(error.to_string()))
    }

    /// Stops replacing dead workers and closes every worker in the pool.
    ///
    /// Order matters and is not interchangeable: the replacement task is aborted *first*, because
    /// dropping a worker fires the same `on_dead`/close path a crash does, and a pool that was
    /// still listening would answer its own shutdown by spawning fresh workers.
    ///
    /// A worker whose router is still alive does not close here - mediasoup closes an entity only
    /// when its last clone drops, and every `Router` holds a `Worker`. So a caller that wants the
    /// workers actually gone must close the rooms first; `server::serve` does exactly that.
    ///
    /// Idempotent.
    pub async fn shutdown(&self) {
        if let Some(replacer) = self
            .replacer
            .lock()
            .unwrap_or_else(PoisonError::into_inner)
            .take()
        {
            replacer.abort();
        }

        let mut slots = self.slots.write().await;
        let closed = slots.len();
        slots.clear();
        if closed > 0 {
            tracing::info!(workers = closed, "mediasoup workers closed");
        }
    }
}

async fn spawn_worker(
    manager: &WorkerManager,
    config: &Config,
    index: usize,
    death_tx: mpsc::UnboundedSender<usize>,
) -> Result<Slot, PoolError> {
    let (port_min, port_max) = config.port_range_for(index);

    let mut settings = WorkerSettings::default();
    settings.log_level = WorkerLogLevel::Warn;
    // Each worker owns a disjoint slice, so two workers can never contend for the same UDP port.
    settings.rtc_port_range = port_min..=port_max;

    let worker = manager
        .create_worker(settings)
        .await
        .map_err(|error| PoolError::WorkerCreate(error.to_string()))?;

    let on_dead = worker.on_dead(move |reason| {
        tracing::error!(worker = index, ?reason, "mediasoup worker died");
        // The receiver outlives the pool, so a send failure only means shutdown is in progress.
        let _ = death_tx.send(index);
    });

    tracing::info!(
        worker = index,
        port_min,
        port_max,
        "mediasoup worker started"
    );
    Ok(Slot {
        worker,
        _on_dead: on_dead,
    })
}

async fn replace_dead_workers(
    pool: Arc<WorkerPool>,
    mut deaths: mpsc::UnboundedReceiver<usize>,
    death_tx: mpsc::UnboundedSender<usize>,
) {
    while let Some(index) = deaths.recv().await {
        pool.deaths.fetch_add(1, Ordering::Relaxed);

        match spawn_worker(&pool.manager, &pool.config, index, death_tx.clone()).await {
            Ok(slot) => {
                let mut slots = pool.slots.write().await;
                if index < slots.len() {
                    slots[index] = slot;
                    tracing::warn!(worker = index, "replaced dead mediasoup worker");
                }
            }
            // Leaving the dead slot in place is deliberate: the pool keeps serving on its
            // remaining workers rather than panicking the whole service.
            Err(error) => tracing::error!(worker = index, %error, "could not replace dead worker"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mediasoup::types::rtp_parameters::{MimeTypeVideo, RtpCodecCapabilityFinalized};
    use std::net::{IpAddr, Ipv4Addr};
    use std::sync::atomic::AtomicBool;

    fn test_config(workers: usize) -> Config {
        Config {
            bind_address: "127.0.0.1:0".into(),
            announced_address: IpAddr::V4(Ipv4Addr::LOCALHOST),
            rtc_port_min: 42000,
            rtc_port_max: 42999,
            workers,
            grant_public_key: None,
            allowed_origin: None,
        }
    }

    #[tokio::test]
    async fn creates_the_configured_number_of_workers_and_routes_across_them() {
        let pool = WorkerPool::new(test_config(2)).await.expect("pool starts");
        assert_eq!(pool.worker_count(), 2);
        assert_eq!(pool.deaths(), 0);

        // Every router must come back live, and the cursor must keep moving rather than pinning
        // every room to worker 0.
        for _ in 0..4 {
            let router = pool.create_router().await.expect("router is created");
            assert!(!router.closed());
        }
        assert_eq!(pool.cursor.load(Ordering::Relaxed), 4);
    }

    #[tokio::test]
    async fn routers_advertise_the_codec_set_the_client_negotiates_against() {
        let pool = WorkerPool::new(test_config(1)).await.expect("pool starts");
        let router = pool.create_router().await.expect("router is created");

        let first_video = router
            .rtp_capabilities()
            .codecs
            .iter()
            .find_map(|codec| match codec {
                RtpCodecCapabilityFinalized::Video { mime_type, .. } => Some(*mime_type),
                RtpCodecCapabilityFinalized::Audio { .. } => None,
            })
            .expect("the router advertises video");

        assert_eq!(
            first_video,
            MimeTypeVideo::Vp9,
            "the client reads the first video codec to choose SVC over simulcast"
        );
    }

    /// Shutdown has to close the C++ worker threads, not merely stop handing them out. `on_close`
    /// fires from mediasoup's own `Drop`, so it only reports true if the last `Worker` clone really
    /// went away - which is the whole point, since the replacement task holds one forever.
    #[tokio::test]
    async fn shutdown_closes_every_worker_and_then_refuses_to_hand_out_routers() {
        let pool = WorkerPool::new(test_config(1)).await.expect("pool starts");

        let closed = Arc::new(AtomicBool::new(false));
        // The handler is registered through a router and the router is dropped at the end of this
        // block, so no `Worker` clone of ours outlives it. A retained clone would keep the worker
        // alive and make the assertion below vacuous; a `HandlerId` owns only the subscription.
        let _on_close = {
            let router = pool.create_router().await.expect("router is created");
            let flag = Arc::clone(&closed);
            router
                .worker()
                .on_close(move || flag.store(true, Ordering::SeqCst))
        };

        pool.shutdown().await;

        assert!(
            closed.load(Ordering::SeqCst),
            "shutdown must close the worker, not just drop it from the pool"
        );
        // A socket that arrives mid-shutdown must get a typed refusal, not a divide-by-zero panic.
        assert!(matches!(
            pool.create_router().await,
            Err(PoolError::ShutDown)
        ));
        assert_eq!(pool.deaths(), 0, "a deliberate close is not a death");

        pool.shutdown().await;
    }
}
