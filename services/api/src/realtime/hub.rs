//! In-process fan-out: one broadcast channel per room.
//!
//! # This is an accelerator, not the source of truth
//!
//! `room_events` is the log; this is a way to avoid polling it. Every event delivered here has
//! already been committed, and every subscriber holds a `seq` cursor, so a message dropped by
//! this channel costs a reconnect and a replay - never an event. That is what lets the channel
//! be bounded and lossy instead of an unbounded queue that grows until the process dies.
//!
//! A slow subscriber therefore gets [`RecvError::Lagged`], which `realtime::serve` turns into
//! a 1013 close and a resync. The alternative - buffering without limit for a client that has
//! stopped reading - converts one stuck browser into a server-wide memory leak.
//!
//! # Cross-instance
//!
//! This channel is per process, so on its own a subscriber on instance B would not see an
//! event written on instance A. [`crate::realtime::relay`] closes that: every instance holds a
//! `LISTEN room_events` connection and calls [`Hub::publish`] when told an event exists. The
//! notification carries a *pointer*, not the event, so the row is always re-read from the log
//! rather than trusted from a copy.

use std::collections::HashMap;
use std::sync::{Mutex, PoisonError};

use tokio::sync::broadcast;
use uuid::Uuid;

use crate::db::repo::event::Event;

/// Events buffered per room before a slow subscriber is considered lagged.
///
/// Sized for a burst, not for an absent client: a browser that is merely busy for a moment
/// catches up from the buffer, and one that has genuinely stopped reading is cut loose quickly
/// rather than being carried.
const CHANNEL_CAPACITY: usize = 256;

/// Per-room broadcast channels, created on demand.
#[derive(Default)]
pub struct Hub {
    /// A `std::sync::Mutex`, and every critical section below is a handful of map operations
    /// with **no `.await`** - which is what makes that safe. `broadcast::Sender::send` is
    /// synchronous, so publishing does not need to hold the lock across a suspension point.
    rooms: Mutex<HashMap<Uuid, broadcast::Sender<Event>>>,
    /// Counted here rather than at the call sites, so a new publisher cannot forget to.
    published: std::sync::atomic::AtomicU64,
}

impl Hub {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Subscribes to a room, creating the channel if this is its first listener.
    pub fn subscribe(&self, room_id: Uuid) -> broadcast::Receiver<Event> {
        let mut rooms = self.rooms();
        rooms
            .entry(room_id)
            .or_insert_with(|| broadcast::channel(CHANNEL_CAPACITY).0)
            .subscribe()
    }

    /// Delivers an event to this instance's subscribers.
    ///
    /// A room with no listeners is not an error and not worth allocating a channel for - the
    /// event is already durable in `room_events`, which is what anyone who connects later
    /// will read.
    pub fn publish(&self, room_id: Uuid, event: &Event) {
        let mut rooms = self.rooms();
        let Some(sender) = rooms.get(&room_id) else {
            return;
        };

        // `Err` means every receiver has gone since the lookup. Not a failure: the room simply
        // has nobody in it.
        self.published
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);

        if sender.send(event.clone()).is_err() {
            // Reclaim the channel so an idle room does not hold one forever. Rooms are
            // long-lived and numerous, and this map would otherwise only ever grow.
            rooms.remove(&room_id);
        }
    }

    /// How many events this instance has fanned out. For `/metrics`.
    #[must_use]
    pub fn published(&self) -> u64 {
        self.published.load(std::sync::atomic::Ordering::Relaxed)
    }

    /// Whether this instance has a live channel for the room.
    ///
    /// Lets `realtime::relay` skip the database read for a room nobody here is watching -
    /// which, once there is more than one instance, is most of them. Without it the relay's
    /// query load would be proportional to global write volume rather than to what this
    /// process actually serves.
    #[must_use]
    pub fn is_watched(&self, room_id: Uuid) -> bool {
        self.rooms()
            .get(&room_id)
            .is_some_and(|sender| sender.receiver_count() > 0)
    }

    /// How many rooms currently have a channel. For `/metrics` and tests.
    #[must_use]
    pub fn rooms_with_listeners(&self) -> usize {
        self.rooms().len()
    }

    /// Recovering from a poisoned lock rather than propagating it: the only state behind this
    /// mutex is a map of channel handles, and no critical section can leave it half-updated
    /// because none of them can fail part way. Losing realtime for the whole process because
    /// one unrelated task panicked would be the worse outcome. Same reasoning as
    /// `tradingroom_media::router_registry::RouterRegistry::rooms`.
    fn rooms(&self) -> std::sync::MutexGuard<'_, HashMap<Uuid, broadcast::Sender<Event>>> {
        self.rooms.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::OffsetDateTime;

    const ROOM: Uuid = Uuid::from_u128(1);
    const OTHER_ROOM: Uuid = Uuid::from_u128(2);

    fn event(seq: i64) -> Event {
        Event {
            seq,
            id: Uuid::from_u128(seq as u128),
            kind: "message.created".into(),
            scope: "room".into(),
            audience_member_id: None,
            payload: serde_json::json!({}),
            origin_member_id: None,
            created_at: OffsetDateTime::UNIX_EPOCH,
        }
    }

    #[tokio::test]
    async fn a_subscriber_receives_what_is_published_to_its_room() {
        let hub = Hub::new();
        let mut events = hub.subscribe(ROOM);

        hub.publish(ROOM, &event(1));
        assert_eq!(events.recv().await.expect("delivered").seq, 1);
    }

    #[tokio::test]
    async fn rooms_do_not_leak_into_one_another() {
        let hub = Hub::new();
        let mut room = hub.subscribe(ROOM);
        let mut other = hub.subscribe(OTHER_ROOM);

        hub.publish(ROOM, &event(1));

        assert_eq!(room.recv().await.expect("delivered").seq, 1);
        // The other room must not see it. Tenancy is enforced in the database, but a
        // cross-room delivery here would leak inside a tenant as well.
        assert!(
            other.try_recv().is_err(),
            "an event reached a room it was not published to"
        );
    }

    #[tokio::test]
    async fn every_subscriber_to_a_room_gets_a_copy() {
        let hub = Hub::new();
        let mut first = hub.subscribe(ROOM);
        let mut second = hub.subscribe(ROOM);

        hub.publish(ROOM, &event(9));

        assert_eq!(first.recv().await.expect("first").seq, 9);
        assert_eq!(second.recv().await.expect("second").seq, 9);
    }

    #[tokio::test]
    async fn publishing_into_an_empty_room_is_a_no_op() {
        let hub = Hub::new();
        // No listeners, no channel. Must not panic and must not allocate one.
        hub.publish(ROOM, &event(1));
        assert_eq!(hub.rooms_with_listeners(), 0);
    }

    #[tokio::test]
    async fn a_room_whose_listeners_have_all_gone_is_reclaimed() {
        let hub = Hub::new();
        {
            let _subscriber = hub.subscribe(ROOM);
            assert_eq!(hub.rooms_with_listeners(), 1);
        }
        // The receiver is dropped; the next publish notices and reclaims the channel, so an
        // empty room does not hold one forever.
        hub.publish(ROOM, &event(1));
        assert_eq!(hub.rooms_with_listeners(), 0);
    }

    /// The property the whole design rests on: a subscriber that stops reading is told it
    /// lagged rather than being buffered without limit.
    #[tokio::test]
    async fn a_subscriber_that_stops_reading_lags_rather_than_growing_the_buffer() {
        let hub = Hub::new();
        let mut slow = hub.subscribe(ROOM);

        for seq in 0..(CHANNEL_CAPACITY as i64 + 10) {
            hub.publish(ROOM, &event(seq));
        }

        // Not a silent skip: an explicit Lagged, which `serve` turns into a 1013 close so the
        // client reconnects with its cursor and replays the gap from Postgres.
        assert!(
            matches!(
                slow.recv().await,
                Err(broadcast::error::RecvError::Lagged(_))
            ),
            "a slow subscriber must be told it lagged, not quietly given a partial stream"
        );
    }
}
