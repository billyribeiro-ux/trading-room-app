//! Background jobs.
//!
//! Each one is a loop that wakes on an interval and shuts down with the process. They are
//! spawned after the database is proven reachable and before the listener binds, so a job that
//! cannot run says so at startup rather than failing silently for a week.

use std::sync::Arc;

use time::OffsetDateTime;

use crate::db::TenantCtx;
use crate::db::repo::event;
use crate::http::AppState;
use crate::limits;

/// Deletes `room_events` older than the retention window.
///
/// # Why this exists
///
/// The outbox is append-only and every mutation writes to it, so without a sweep it is the one
/// table in the schema that grows without bound. Retention is not a correctness property: a
/// client whose cursor falls off the end is told to `resync` and refetches, which is exactly
/// what `MAX_REPLAY` already does for a gap that is merely large.
///
/// # Why it runs per tenant
///
/// `room_events` is `FORCE ROW LEVEL SECURITY` and this process runs as `NOBYPASSRLS`, so a
/// `DELETE` with no GUC set matches **zero rows and reports success** - the sweep would appear
/// to work forever while deleting nothing. It therefore enumerates tenants and sweeps each
/// under its own `TenantCtx`, which is the only way this can actually do anything.
pub async fn prune_room_events(state: Arc<AppState>) {
    let mut shutdown = state.shutdown.subscribe();
    let mut ticker = tokio::time::interval(limits::EVENT_PRUNE_INTERVAL);
    // The first tick fires immediately; skip it so a restart loop cannot turn into a delete
    // storm against a database that is already struggling.
    ticker.tick().await;

    loop {
        tokio::select! {
            biased;
            _ = shutdown.recv() => {
                tracing::info!("event pruner stopping");
                return;
            }
            _ = ticker.tick() => {
                let before = OffsetDateTime::now_utc() - limits::EVENT_RETENTION;
                match sweep(&state, before).await {
                    Ok(0) => {}
                    Ok(removed) => tracing::info!(removed, "pruned expired room events"),
                    Err(error) => tracing::warn!(%error, "event prune failed; will retry"),
                }
            }
        }
    }
}

async fn sweep(state: &Arc<AppState>, before: OffsetDateTime) -> Result<u64, crate::db::DbError> {
    let tenants = state.db.enterprise_ids().await?;
    let mut removed = 0;

    for enterprise_id in tenants {
        let mut tx = state
            .db
            .begin_tenant(TenantCtx::server(enterprise_id))
            .await?;
        // One transaction per tenant rather than one for all of them: a long delete holding a
        // transaction open across every tenant is the kind of thing that trips
        // `idle_in_transaction_session_timeout` and takes the sweep down with it.
        let count = event::prune(&mut tx, before).await?;
        tx.commit().await?;
        removed += count;
    }

    Ok(removed)
}
