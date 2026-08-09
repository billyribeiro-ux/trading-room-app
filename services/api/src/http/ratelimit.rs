//! Rate limiting for the authentication endpoints.
//!
//! Argon2id makes each guess expensive for us as well as the attacker, so an unbounded
//! login endpoint is both a credential-stuffing surface and a CPU exhaustion vector: a few
//! hundred concurrent guesses would saturate the hashing semaphore and stall every real
//! login. Limiting the endpoint fixes both at once.
//!
//! Two limiters guard login and both must allow the request:
//!
//! * **per email**, counting *failures only*. After saturation the handler still verifies a
//!   bounded attempt, returns success for the correct password, and returns 429 for another
//!   invalid guess;
//! * **per client IP**, counting every attempt, to blunt spraying across many accounts.
//!
//! GCRA (`governor`'s algorithm) rather than a fixed window: a fixed window lets an
//! attacker spend a full quota in the last instant of one window and again in the first
//! instant of the next, doubling the burst exactly at the boundary.
//!
//! Keys are bounded and swept. An unbounded keyed limiter is itself a memory-exhaustion
//! primitive, since every distinct email an attacker submits would allocate a cell.

use std::collections::HashMap;
use std::hash::Hash;
use std::num::NonZeroU32;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use governor::clock::DefaultClock;
use governor::nanos::Nanos;
use governor::state::StateStore;
use governor::state::keyed::ShrinkableKeyedStateStore;
use governor::{Quota, RateLimiter};

use crate::limits;

/// Returned when a caller is over quota. A named type rather than `()` so the reason a
/// call failed is legible at the call site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
#[error("rate limit exceeded")]
pub struct RateLimited;

/// Governor state that can reserve a key without first changing its GCRA budget.
///
/// Governor's default keyed store inserts inside `check_key`. That is normally ideal, but it
/// leaves no atomic way to distinguish an existing key from an unseen key when the store is at
/// capacity. Reserving here, under the same operation lock used for GC and checking, makes the
/// key ceiling strict even when callers race.
struct BoundedStateStore<K> {
    state: Arc<Mutex<HashMap<K, Nanos>>>,
    capacity: usize,
}

impl<K> Clone for BoundedStateStore<K> {
    fn clone(&self) -> Self {
        Self {
            state: Arc::clone(&self.state),
            capacity: self.capacity,
        }
    }
}

impl<K: Eq + Hash + Clone> BoundedStateStore<K> {
    fn new(capacity: usize) -> Self {
        Self {
            state: Arc::new(Mutex::new(HashMap::new())),
            capacity,
        }
    }

    fn reserve(&self, key: &K) -> Reservation {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        if state.contains_key(key) {
            return Reservation::Existing;
        }
        if state.len() >= self.capacity {
            return Reservation::Saturated;
        }

        // Zero is indistinguishable from a fresh state to GCRA. `check_key` immediately
        // replaces it with the first theoretical-arrival timestamp while the operation lock
        // prevents GC from observing the reservation in between.
        state.insert(key.clone(), Nanos::default());
        Reservation::Inserted
    }

    fn len(&self) -> usize {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .len()
    }
}

impl<K: Eq + Hash + Clone> StateStore for BoundedStateStore<K> {
    type Key = K;

    fn measure_and_replace<T, F, E>(&self, key: &Self::Key, update: F) -> Result<T, E>
    where
        F: Fn(Option<Nanos>) -> Result<(T, Nanos), E>,
    {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let current = state
            .get(key)
            .copied()
            .expect("KeyedLimiter must reserve a key before asking governor to check it");

        match update(Some(current)) {
            Ok((outcome, replacement)) => {
                state.insert(key.clone(), replacement);
                Ok(outcome)
            }
            Err(error) => Err(error),
        }
    }
}

impl<K: Eq + Hash + Clone> ShrinkableKeyedStateStore<K> for BoundedStateStore<K> {
    fn retain_recent(&self, drop_below: Nanos) {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        state.retain(|_, value| *value > drop_below);
    }

    fn shrink_to_fit(&self) {
        self.state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .shrink_to_fit();
    }

    fn len(&self) -> usize {
        self.len()
    }

    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Reservation {
    Existing,
    Inserted,
    Saturated,
}

struct Maintenance {
    last_gc: Instant,
    /// Avoid an O(capacity) sweep for every rejected key during sustained saturation.
    swept_while_full: bool,
}

/// A keyed limiter with a bounded key space.
pub struct KeyedLimiter<K: Eq + Hash + Clone + Send + Sync + 'static> {
    inner: RateLimiter<K, BoundedStateStore<K>, DefaultClock>,
    store: BoundedStateStore<K>,
    /// Serializes reserve, GC and check into one atomic operation; never held across an await.
    maintenance: Mutex<Maintenance>,
    name: &'static str,
}

impl<K: Eq + Hash + Clone + Send + Sync + 'static> KeyedLimiter<K> {
    /// `per_minute` requests, with an equal burst allowance.
    pub fn per_minute(name: &'static str, per_minute: u32) -> Self {
        let quota = NonZeroU32::new(per_minute)
            .map_or_else(|| Quota::per_minute(NonZeroU32::MIN), Quota::per_minute);
        let store = BoundedStateStore::new(limits::RATE_LIMIT_MAX_KEYS);

        Self {
            inner: RateLimiter::new(quota, store.clone(), DefaultClock::default()),
            store,
            maintenance: Mutex::new(Maintenance {
                last_gc: Instant::now(),
                swept_while_full: false,
            }),
            name,
        }
    }

    /// Records one use of `key`.
    ///
    /// Sweeping happens here rather than on a timer so the limiter needs no background
    /// task and cannot outlive one.
    ///
    /// # Errors
    /// [`RateLimited`] when this key has spent its quota.
    pub fn check(&self, key: &K) -> Result<(), RateLimited> {
        let mut maintenance = self
            .maintenance
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        self.maybe_gc(&mut maintenance);

        match self.store.reserve(key) {
            Reservation::Existing => {}
            Reservation::Inserted => {
                if self.store.len() >= limits::RATE_LIMIT_MAX_KEYS {
                    // The next operation at capacity must perform one authoritative sweep
                    // before it decides that an unseen key cannot be admitted.
                    maintenance.swept_while_full = false;
                }
            }
            Reservation::Saturated => {
                tracing::warn!(
                    limiter = self.name,
                    keys = self.store.len(),
                    "rate limiter key space is saturated"
                );
                return Err(RateLimited);
            }
        }

        match self.inner.check_key(key) {
            Ok(()) => Ok(()),
            Err(_) => {
                // The key is deliberately absent: an email address is personal data and a
                // rate-limit log is exactly where a credential-stuffing list would
                // otherwise accumulate.
                tracing::warn!(limiter = self.name, "rate limit exceeded");
                Err(RateLimited)
            }
        }
    }

    fn maybe_gc(&self, maintenance: &mut Maintenance) {
        let full = self.store.len() >= limits::RATE_LIMIT_MAX_KEYS;
        if maintenance.last_gc.elapsed() < limits::RATE_LIMIT_GC_INTERVAL
            && (!full || maintenance.swept_while_full)
        {
            return;
        }

        // Drops cells that have fully replenished; they are indistinguishable from a key
        // that was never seen.
        self.inner.retain_recent();
        maintenance.last_gc = Instant::now();
        maintenance.swept_while_full = self.store.len() >= limits::RATE_LIMIT_MAX_KEYS;
    }

    #[cfg(test)]
    fn key_count(&self) -> usize {
        self.store.len()
    }
}

/// Counts *failures* per key inside a sliding window.
///
/// Separate from [`KeyedLimiter`] because governor's GCRA consumes quota on a successful
/// check, and that is the wrong shape for per-account protection: if every attempt were
/// charged, an attacker guessing at one account would exhaust its quota and lock out the
/// legitimate owner, turning a brute-force defence into a denial-of-service tool.
///
/// Here only failures are recorded. Saturation is advisory to the login handler: it must still
/// verify a bounded attempt so the correct password can succeed, while subsequent failures are
/// answered with 429 and do not grow the counter.
pub struct FailureWindow<K: Eq + Hash + Clone> {
    state: Mutex<FailureWindowState<K>>,
    threshold: u32,
    window: Duration,
    name: &'static str,
}

struct FailureWindowState<K> {
    entries: HashMap<K, (u32, Instant)>,
    maintenance: Maintenance,
}

impl<K: Eq + Hash + Clone> FailureWindow<K> {
    pub fn new(name: &'static str, threshold: u32, window: Duration) -> Self {
        Self {
            state: Mutex::new(FailureWindowState {
                entries: HashMap::new(),
                maintenance: Maintenance {
                    last_gc: Instant::now(),
                    swept_while_full: false,
                },
            }),
            threshold,
            window,
            name,
        }
    }

    /// True when this key has reached the recent-failure threshold. Consumes nothing.
    ///
    /// This does not mean a login may be skipped: the handler still verifies the password so
    /// the legitimate owner can succeed, then uses this state only to classify another failure.
    pub fn is_saturated(&self, key: &K) -> bool {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        if let Some((count, started)) = state.entries.get(key).copied() {
            if started.elapsed() < self.window {
                return count >= self.threshold;
            }

            // An expired entry is equivalent to an unseen key and immediately returns its
            // slot. Waiting for the periodic whole-map sweep would extend this key's window.
            state.entries.remove(key);
            return false;
        }

        self.maybe_gc(&mut state);
        let saturated = state.entries.len() >= limits::RATE_LIMIT_MAX_KEYS;
        if saturated {
            // At capacity an unseen address cannot be tracked, so treating it as available
            // would create an unlimited credential-stuffing bypass. The handler still performs
            // one bounded password verification, which preserves a legitimate owner's login.
            tracing::warn!(limiter = self.name, "failure window key space is saturated");
        }
        saturated
    }

    /// Records one failure against this key.
    ///
    /// # Errors
    /// [`RateLimited`] when an unseen key cannot be admitted without exceeding the hard key
    /// ceiling. Callers must classify that request as limited rather than silently failing open.
    pub fn record_failure(&self, key: &K) -> Result<(), RateLimited> {
        let mut state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);

        // Existing keys keep their normal behavior even when the map is at capacity. In
        // particular, a full map must not turn a key on its fifth failure into a permanent
        // four-failure entry that never reaches the threshold.
        if let Some(entry) = state.entries.get_mut(key) {
            if entry.1.elapsed() >= self.window {
                *entry = (1, Instant::now());
            } else {
                entry.0 = entry.0.saturating_add(1).min(self.threshold);
            }
            return Ok(());
        }

        // Bounded: an attacker submitting endless distinct addresses must not be able to
        // grow this map without limit. `maybe_gc` performs at most one authoritative full sweep
        // per saturation interval, avoiding an O(capacity) scan for every sprayed address.
        self.maybe_gc(&mut state);
        if state.entries.len() >= limits::RATE_LIMIT_MAX_KEYS {
            tracing::warn!(limiter = self.name, "failure window saturated; shedding");
            return Err(RateLimited);
        }

        state.entries.insert(key.clone(), (1, Instant::now()));
        if state.entries.len() >= limits::RATE_LIMIT_MAX_KEYS {
            // The first unseen key at capacity gets one fresh sweep before admission is denied.
            state.maintenance.swept_while_full = false;
        }
        Ok(())
    }

    fn maybe_gc(&self, state: &mut FailureWindowState<K>) {
        let full = state.entries.len() >= limits::RATE_LIMIT_MAX_KEYS;
        if state.maintenance.last_gc.elapsed() < limits::RATE_LIMIT_GC_INTERVAL
            && (!full || state.maintenance.swept_while_full)
        {
            return;
        }

        let window = self.window;
        state
            .entries
            .retain(|_, (_, started)| started.elapsed() < window);
        state.maintenance.last_gc = Instant::now();
        state.maintenance.swept_while_full = state.entries.len() >= limits::RATE_LIMIT_MAX_KEYS;
    }
}

/// Every limiter the HTTP layer owns.
pub struct Limiters {
    /// Counts failed logins only; the handler still verifies attempts after saturation.
    pub login_email: FailureWindow<String>,
    pub login_ip: KeyedLimiter<String>,
    pub refresh_ip: KeyedLimiter<String>,
    /// Keyed by `room_members.id`, not by IP: these are authenticated actions, and keying an
    /// authenticated endpoint by IP would let one office NAT throttle a whole floor.
    pub grant_member: KeyedLimiter<String>,
    pub message_member: KeyedLimiter<String>,
    /// Keyed by `users.id`: a join happens before a membership exists, so there is no member
    /// id to key on yet.
    pub join_user: KeyedLimiter<String>,
    /// Keyed by IP: a guest has no identity until this endpoint gives them one.
    pub guest_ip: KeyedLimiter<String>,
}

impl Default for Limiters {
    fn default() -> Self {
        Self {
            login_email: FailureWindow::new(
                "login_email",
                limits::LOGIN_FAILURES_PER_EMAIL_PER_MINUTE,
                Duration::from_secs(60),
            ),
            login_ip: KeyedLimiter::per_minute(
                "login_ip",
                limits::LOGIN_ATTEMPTS_PER_IP_PER_MINUTE,
            ),
            refresh_ip: KeyedLimiter::per_minute(
                "refresh_ip",
                limits::REFRESH_ATTEMPTS_PER_IP_PER_MINUTE,
            ),
            grant_member: KeyedLimiter::per_minute(
                "grant_member",
                limits::GRANTS_PER_MEMBER_PER_MINUTE,
            ),
            message_member: KeyedLimiter::per_minute(
                "message_member",
                limits::MESSAGES_PER_MEMBER_PER_MINUTE,
            ),
            join_user: KeyedLimiter::per_minute(
                "join_user",
                limits::JOIN_ATTEMPTS_PER_USER_PER_MINUTE,
            ),
            guest_ip: KeyedLimiter::per_minute("guest_ip", limits::GUESTS_PER_IP_PER_MINUTE),
        }
    }
}

/// Normalises an email into a limiter key.
///
/// Lowercased because `users.email` is `citext`: without this, `Alice@Example.COM` and
/// `alice@example.com` are one account but two rate-limit buckets, and an attacker gets a fresh
/// quota per capitalisation.
pub fn email_key(email: &str) -> Result<String, EmailKeyTooLong> {
    let normalized = email.trim().to_lowercase();
    if normalized.len() > limits::LOGIN_EMAIL_MAX_BYTES {
        return Err(EmailKeyTooLong {
            max: limits::LOGIN_EMAIL_MAX_BYTES,
        });
    }
    Ok(normalized)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
#[error("email exceeds {max} bytes")]
pub struct EmailKeyTooLong {
    pub max: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_key_is_refused_once_its_quota_is_spent() {
        let limiter = KeyedLimiter::per_minute("test", 3);
        let key = "someone".to_string();
        for attempt in 1..=3 {
            assert!(limiter.check(&key).is_ok(), "attempt {attempt} should pass");
        }
        assert!(limiter.check(&key).is_err(), "the fourth must be refused");
    }

    #[test]
    fn quotas_are_tracked_separately_per_key() {
        let limiter = KeyedLimiter::per_minute("test", 1);
        assert!(limiter.check(&"a".to_string()).is_ok());
        assert!(limiter.check(&"a".to_string()).is_err());
        // A different key must be unaffected, or one abusive account would lock out
        // everybody else.
        assert!(limiter.check(&"b".to_string()).is_ok());
    }

    #[test]
    fn email_keys_ignore_case_and_surrounding_space() {
        // `users.email` is citext, so these are one account and must be one bucket.
        assert_eq!(
            email_key("  Alice@Example.COM ").unwrap(),
            "alice@example.com"
        );
        assert_eq!(
            email_key("alice@example.com").unwrap(),
            email_key("ALICE@EXAMPLE.COM").unwrap()
        );
    }

    #[test]
    fn a_failure_window_saturates_its_counter_without_growing_it() {
        let window = FailureWindow::new("test", 3, Duration::from_secs(60));
        let victim = "victim@example.com".to_string();

        for _ in 0..10 {
            window.record_failure(&victim).unwrap();
        }
        assert!(window.is_saturated(&victim), "guessing should be throttled");
        assert!(!window.is_saturated(&"other@example.com".to_string()));
        let state = window.state.lock().unwrap();
        assert_eq!(state.entries.get(&victim).map(|entry| entry.0), Some(3));
    }

    #[test]
    fn an_email_key_is_bounded_after_unicode_normalization() {
        // U+0130 lowercases to `i` plus a combining dot, expanding from two to three UTF-8
        // bytes. The raw value fits, but the actual key does not.
        let oversized = "İ".repeat(limits::LOGIN_EMAIL_MAX_BYTES / 2);
        assert_eq!(oversized.len(), limits::LOGIN_EMAIL_MAX_BYTES);
        assert_eq!(
            email_key(&oversized),
            Err(EmailKeyTooLong {
                max: limits::LOGIN_EMAIL_MAX_BYTES
            })
        );
    }

    #[test]
    fn saturation_rejects_an_unseen_key_without_changing_existing_quotas() {
        let limiter = KeyedLimiter::per_minute("test", 2);

        for index in 0..limits::RATE_LIMIT_MAX_KEYS {
            assert!(limiter.check(&format!("key-{index}")).is_ok());
        }
        assert_eq!(limiter.key_count(), limits::RATE_LIMIT_MAX_KEYS);

        assert!(limiter.check(&"overflow".to_string()).is_err());
        assert_eq!(
            limiter.key_count(),
            limits::RATE_LIMIT_MAX_KEYS,
            "an unseen key must not be inserted after the capacity sweep"
        );

        let existing = "key-0".to_string();
        assert!(
            limiter.check(&existing).is_ok(),
            "an existing key keeps its second permitted request"
        );
        assert!(
            limiter.check(&existing).is_err(),
            "the existing key still reaches its own quota"
        );
    }

    #[test]
    fn failures_outside_the_window_stop_counting() {
        let window = FailureWindow::new("test", 2, Duration::from_millis(40));
        let key = "k".to_string();
        window.record_failure(&key).unwrap();
        window.record_failure(&key).unwrap();
        assert!(window.is_saturated(&key));

        std::thread::sleep(Duration::from_millis(60));
        assert!(
            !window.is_saturated(&key),
            "an old burst must not block someone forever"
        );
    }

    #[test]
    fn a_full_failure_window_fails_closed_for_unseen_keys_without_growing() {
        let window = FailureWindow::new("test", 3, Duration::from_secs(60));

        for index in 0..limits::RATE_LIMIT_MAX_KEYS {
            window.record_failure(&format!("key-{index}")).unwrap();
        }

        let unseen = "overflow".to_string();
        assert!(
            window.is_saturated(&unseen),
            "an address we cannot track must not receive an unlimited fresh quota"
        );
        assert_eq!(window.record_failure(&unseen), Err(RateLimited));

        let existing = "key-0".to_string();
        assert!(
            !window.is_saturated(&existing),
            "capacity must not make an existing unsaturated account look exhausted"
        );
        window.record_failure(&existing).unwrap();
        window.record_failure(&existing).unwrap();
        assert!(window.is_saturated(&existing));

        let state = window.state.lock().unwrap();
        assert_eq!(state.entries.len(), limits::RATE_LIMIT_MAX_KEYS);
        assert!(!state.entries.contains_key(&unseen));
    }

    #[test]
    fn a_zero_quota_is_clamped_rather_than_panicking() {
        // Misconfiguration should degrade to "extremely strict", never crash the process.
        let limiter = KeyedLimiter::per_minute("test", 0);
        assert!(limiter.check(&"k".to_string()).is_ok());
        assert!(limiter.check(&"k".to_string()).is_err());
    }
}
