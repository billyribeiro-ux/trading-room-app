//! Cross-instance wakeup: `LISTEN room_events` → [`Hub::publish`].
//!
//! [`crate::realtime::hub`] fans out within one process. With several API instances a
//! subscriber on instance B would otherwise not see an event written on instance A until it
//! next resumed. This closes that.
//!
//! # Why a wakeup and not a transport
//!
//! The notification carries a **pointer** - `enterprise:room:seq` - and never the event. Two
//! consequences, both deliberate:
//!
//! * NOTIFY's 8 KB payload ceiling stops being a design constraint, because the payload is
//!   forty bytes regardless of how large the event is.
//! * `room_events` stays the single source of truth. The listener re-reads the row under the
//!   tenant GUC, so what it publishes is what is actually committed - a copy travelling in the
//!   payload could disagree with the table, and eventually would.
//!
//! # What losing a notification costs
//!
//! Latency, and nothing else. Every subscriber holds a `seq` cursor and every event is durable
//! before the NOTIFY fires, so a missed wakeup is caught by the client's next `resume` or
//! reconnect. That is what makes it safe to reconnect freely and drop anything it cannot parse.
//! Operationally, however, the task is required: startup waits for the first `LISTEN`, and a
//! later disconnect makes the instance unready until delivery is restored.
//!
//! # Ordering
//!
//! NOTIFY is delivered at COMMIT, so two concurrent writers can arrive out of `seq` order. The
//! hub does not reorder them and neither does this - a client applies events by `seq` and the
//! authoritative order is the one `replay` returns. Live delivery is an accelerator; it is
//! allowed to be approximate in a way the log is not.

use std::sync::Arc;
use std::time::Duration;

use sqlx::postgres::PgListener;
use uuid::Uuid;

use crate::db::repo::event;
use crate::db::{DbError, TenantCtx};
use crate::http::AppState;

/// How long to wait before reconnecting a dropped listener.
///
/// A listener holds a Postgres connection *outside* the sqlx pool, which is the scarcest
/// resource on managed Postgres, so a tight reconnect loop against a database that is down
/// would be an outage amplifier rather than a recovery.
const RECONNECT_DELAY: Duration = Duration::from_secs(2);

/// Clears readiness even if the relay future is aborted or panics. Explicit return paths also
/// clear it immediately; this guard covers the paths that ordinary control flow cannot observe.
struct ReadinessGuard(Arc<AppState>);

impl Drop for ReadinessGuard {
    fn drop(&mut self) {
        self.0.set_relay_ready(false);
    }
}

/// Establishes `LISTEN` and only then returns the long-running relay task.
///
/// The caller awaits this before binding its HTTP listener. Consequently a process cannot
/// advertise readiness—or accept production traffic—having never established cross-instance
/// realtime delivery.
///
/// # Errors
/// Returns the PostgreSQL connection or `LISTEN` error when the initial relay cannot be
/// established. Later disconnects are reflected in readiness while this task reconnects.
pub async fn start(state: Arc<AppState>) -> Result<tokio::task::JoinHandle<()>, DbError> {
    let listener = open_listener(&state).await?;
    let shutdown = state.shutdown.subscribe();
    state.set_relay_ready(true);
    tracing::info!(channel = event::NOTIFY_CHANNEL, "realtime relay listening");
    let readiness_guard = ReadinessGuard(Arc::clone(&state));

    Ok(tokio::spawn(async move {
        let _readiness_guard = readiness_guard;
        run_connected(state, listener, shutdown).await;
    }))
}

/// Runs until shutdown, reconnecting after any post-startup listener failure.
async fn run_connected(
    state: Arc<AppState>,
    mut listener: PgListener,
    mut shutdown: tokio::sync::broadcast::Receiver<()>,
) {
    loop {
        tokio::select! {
            biased;
            _ = shutdown.recv() => {
                state.set_relay_ready(false);
                tracing::info!("realtime relay stopping");
                return;
            }
            () = receive_until_failure(&state, &mut listener) => {}
        }

        // The old connection is already gone. Readiness must fall before the retry delay so a
        // load balancer cannot route requests here during the blind interval.
        state.set_relay_ready(false);

        loop {
            tokio::select! {
                _ = shutdown.recv() => {
                    tracing::info!("realtime relay stopping");
                    return;
                }
                () = tokio::time::sleep(RECONNECT_DELAY) => {}
            }

            let connection = tokio::select! {
                _ = shutdown.recv() => {
                    tracing::info!("realtime relay stopping");
                    return;
                }
                result = open_listener(&state) => result
            };

            match connection {
                Ok(reconnected) => {
                    listener = reconnected;
                    state.set_relay_ready(true);
                    tracing::info!(channel = event::NOTIFY_CHANNEL, "realtime relay listening");
                    break;
                }
                Err(error) => {
                    tracing::warn!(%error, "realtime relay could not reconnect");
                }
            }
        }
    }
}

async fn open_listener(state: &Arc<AppState>) -> Result<PgListener, DbError> {
    let mut listener = PgListener::connect_with(state.db.pool_for_listener())
        .await
        .map_err(DbError::from)?;
    listener
        .listen(event::NOTIFY_CHANNEL)
        .await
        .map_err(DbError::from)?;
    Ok(listener)
}

/// One established listener's lifetime. Returns when it fails, leaving reconnection to the
/// caller. Shutdown cancels this future from the surrounding `select!`.
async fn receive_until_failure(state: &Arc<AppState>, listener: &mut PgListener) {
    loop {
        match listener.recv().await {
            Ok(notification) => {
                let Some(pointer) = Pointer::parse(notification.payload()) else {
                    // Anything unparseable is another writer's problem, not ours. Dropping it
                    // costs latency for one event and never correctness. The raw payload is
                    // deliberately absent from the log: a compromised writer controls it and
                    // may put credentials or log-forging bytes there.
                    tracing::debug!("realtime relay ignored an unrecognised notification");
                    continue;
                };
                deliver(state, pointer).await;
            }
            Err(error) => {
                tracing::warn!(%error, "realtime relay lost its listener; reconnecting");
                return;
            }
        }
    }
}

/// `enterprise:room:seq` - a pointer into `room_events`, not the event.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Pointer {
    enterprise_id: Uuid,
    room_id: Uuid,
    seq: i64,
}

impl Pointer {
    fn parse(payload: &str) -> Option<Self> {
        let mut parts = payload.split(':');
        let pointer = Self {
            enterprise_id: parts.next()?.parse().ok()?,
            room_id: parts.next()?.parse().ok()?,
            seq: parts.next()?.parse().ok()?,
        };
        // A fourth field means this build and the writer disagree about the format. Refuse
        // rather than guess which three of four fields were meant.
        parts.next().is_none().then_some(pointer)
    }
}

async fn deliver(state: &Arc<AppState>, pointer: Pointer) {
    // A room nobody on this instance is watching needs no read at all. This is the common case
    // once there is more than one instance, and skipping it keeps the relay's database cost
    // proportional to what this process actually serves rather than to global write volume.
    if !state.hub.is_watched(pointer.room_id) {
        return;
    }

    // Server context: this task acts for the tenant, not for any member. The event's own
    // `scope` is what decides who actually receives it, applied per subscriber in
    // `realtime::serve`.
    let ctx = TenantCtx::server(pointer.enterprise_id);
    let mut tx = match state.db.begin_tenant(ctx).await {
        Ok(tx) => tx,
        Err(error) => {
            tracing::warn!(%error, "realtime relay could not open a tenant transaction");
            return;
        }
    };

    let found = event::by_seq(&mut tx, pointer.seq).await;
    // Committed rather than dropped: a rolled-back read-only transaction is harmless, but
    // leaving it to drop would return the connection to the pool having done an implicit
    // rollback, which shows up in `pg_stat_database` as a rollback per event forever.
    let _ = tx.commit().await;

    match found {
        Ok(Some(event)) => state.hub.publish(pointer.room_id, &event),
        // The row is gone - pruned, or the room was deleted. Nothing to deliver.
        Ok(None) => {}
        Err(error) => {
            tracing::warn!(%error, seq = pointer.seq, "realtime relay could not read an event");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ENTERPRISE: Uuid = uuid::uuid!("a0000000-0000-4000-8000-000000000001");
    const ROOM: Uuid = uuid::uuid!("a0000003-0000-4000-8000-000000000001");

    #[test]
    fn a_pointer_round_trips_through_the_notify_payload() {
        // The exact string `event::append` builds.
        let payload = format!("{ENTERPRISE}:{ROOM}:{}", 4_242);
        let parsed = Pointer::parse(&payload).expect("it parses");
        assert_eq!(parsed.enterprise_id, ENTERPRISE);
        assert_eq!(parsed.room_id, ROOM);
        assert_eq!(parsed.seq, 4_242);
    }

    #[test]
    fn the_payload_stays_far_inside_the_notify_ceiling() {
        // NOTIFY caps payloads at 8000 bytes. Two uuids and an integer is ~85, which is the
        // whole reason the event itself is not sent.
        let payload = format!("{ENTERPRISE}:{ROOM}:{}", i64::MAX);
        assert!(payload.len() < 100, "{} bytes: {payload}", payload.len());
    }

    #[test]
    fn a_malformed_pointer_is_refused_rather_than_guessed() {
        for bad in [
            "",
            "not-a-uuid:also-not:1",
            // Too few fields.
            &format!("{ENTERPRISE}:{ROOM}"),
            // Too many: this build and the writer disagree about the format, so refuse.
            &format!("{ENTERPRISE}:{ROOM}:1:extra"),
            // A sequence that is not a number.
            &format!("{ENTERPRISE}:{ROOM}:not-a-seq"),
        ] {
            assert!(Pointer::parse(bad).is_none(), "{bad:?} should not parse");
        }
    }

    #[test]
    fn a_negative_sequence_parses_but_simply_finds_nothing() {
        // `seq` is a BIGSERIAL starting at 1, so this can only come from a malformed writer.
        // It is not worth a special case: the lookup returns no row and nothing is published.
        let parsed = Pointer::parse(&format!("{ENTERPRISE}:{ROOM}:-1")).expect("it parses");
        assert_eq!(parsed.seq, -1);
    }
}
