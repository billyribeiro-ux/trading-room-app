//! Prometheus metrics.
//!
//! # Why this is hand-rolled rather than a client library
//!
//! The set below is small and fixed: RED counters per route class, pool saturation, and the
//! realtime gauges. A registry crate buys label management and a text encoder, and the label
//! management is precisely the part this service must *not* have - see below.
//!
//! # Labels come from a static lookup, never from input
//!
//! A Prometheus label set is a cardinality budget: every distinct combination allocates a
//! series that lives for the process's lifetime. Labelling by `room_id`, `user_id` or raw path
//! would let a caller mint unbounded series by varying a uuid - a memory leak with an HTTP
//! interface in front of it. So the route label is a **matched pattern** from a fixed list, and
//! anything unrecognised collapses to `other`.

use std::sync::atomic::{AtomicU64, Ordering};

use axum::extract::State;
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use std::sync::Arc;

use crate::http::AppState;

/// The route classes this service reports. Fixed at compile time, which is what bounds
/// cardinality: a request that matches none of these is counted as `other`.
const ROUTE_CLASSES: &[(&str, &str)] = &[
    ("/api/auth/login", "auth_login"),
    ("/api/auth/refresh", "auth_refresh"),
    ("/api/auth/logout", "auth_logout"),
    ("/api/v1/account", "account"),
    ("/api/v1/rooms", "rooms"),
    ("/healthz", "health"),
    ("/readyz", "ready"),
];

/// Classifies a path into one of [`ROUTE_CLASSES`].
///
/// Longest-prefix, so `/api/v1/rooms/{id}/messages` lands on `rooms` rather than on whichever
/// prefix happened to be listed first. The uuid in the middle never becomes a label.
#[must_use]
pub fn route_class(path: &str) -> &'static str {
    ROUTE_CLASSES
        .iter()
        .filter(|(prefix, _)| path.starts_with(prefix))
        .max_by_key(|(prefix, _)| prefix.len())
        .map_or("other", |(_, label)| *label)
}

/// Counters, one set per route class plus the shared gauges.
///
/// Plain atomics rather than a mutex-guarded map: every counter exists from startup because the
/// class list is fixed, so there is nothing to allocate on the request path and no lock for a
/// hot path to contend on.
#[derive(Debug, Default)]
pub struct Metrics {
    requests: Counters,
    errors: Counters,
    /// Total request duration in milliseconds, for a rate-of-sum average. Not a histogram:
    /// buckets are the thing most easily got wrong, and a mean plus the error rate answers the
    /// questions this service is actually asked.
    duration_ms: Counters,
    pub websockets_open: AtomicU64,
    pub events_published: AtomicU64,
}

#[derive(Debug, Default)]
struct Counters([AtomicU64; 8]);

impl Counters {
    fn slot(&self, class: &'static str) -> &AtomicU64 {
        let index = ROUTE_CLASSES
            .iter()
            .position(|(_, label)| *label == class)
            .unwrap_or(ROUTE_CLASSES.len());
        // The array is one longer than the class list; the extra slot is `other`.
        &self.0[index.min(self.0.len() - 1)]
    }

    fn add(&self, class: &'static str, amount: u64) {
        self.slot(class).fetch_add(amount, Ordering::Relaxed);
    }

    fn get(&self, class: &'static str) -> u64 {
        self.slot(class).load(Ordering::Relaxed)
    }
}

impl Metrics {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Records one finished request.
    pub fn record(&self, path: &str, status: u16, elapsed_ms: u64) {
        let class = route_class(path);
        self.requests.add(class, 1);
        self.duration_ms.add(class, elapsed_ms);
        // 5xx only. A 401 or a 404 is the service working correctly and must not page anybody.
        if status >= 500 {
            self.errors.add(class, 1);
        }
    }

    /// The Prometheus text exposition format.
    #[must_use]
    pub fn render(&self, pool_size: u32, pool_idle: usize, rooms_watched: usize) -> String {
        let mut out = String::with_capacity(2048);

        out.push_str("# HELP tradingroom_requests_total Requests by route class.\n");
        out.push_str("# TYPE tradingroom_requests_total counter\n");
        for (_, class) in ROUTE_CLASSES.iter().chain(std::iter::once(&("", "other"))) {
            out.push_str(&format!(
                "tradingroom_requests_total{{route=\"{class}\"}} {}\n",
                self.requests.get(class)
            ));
        }

        out.push_str("# HELP tradingroom_request_errors_total 5xx responses by route class.\n");
        out.push_str("# TYPE tradingroom_request_errors_total counter\n");
        for (_, class) in ROUTE_CLASSES.iter().chain(std::iter::once(&("", "other"))) {
            out.push_str(&format!(
                "tradingroom_request_errors_total{{route=\"{class}\"}} {}\n",
                self.errors.get(class)
            ));
        }

        out.push_str(
            "# HELP tradingroom_request_duration_ms_total Summed request duration by route class.\n",
        );
        out.push_str("# TYPE tradingroom_request_duration_ms_total counter\n");
        for (_, class) in ROUTE_CLASSES.iter().chain(std::iter::once(&("", "other"))) {
            out.push_str(&format!(
                "tradingroom_request_duration_ms_total{{route=\"{class}\"}} {}\n",
                self.duration_ms.get(class)
            ));
        }

        // Pool saturation is the metric that explains a latency spike nothing else accounts
        // for: `size - idle` climbing to `size` means requests are queueing on `acquire`.
        out.push_str("# HELP tradingroom_db_pool_connections Connections in the sqlx pool.\n");
        out.push_str("# TYPE tradingroom_db_pool_connections gauge\n");
        out.push_str(&format!("tradingroom_db_pool_connections {pool_size}\n"));
        out.push_str("# HELP tradingroom_db_pool_idle Idle connections in the sqlx pool.\n");
        out.push_str("# TYPE tradingroom_db_pool_idle gauge\n");
        out.push_str(&format!("tradingroom_db_pool_idle {pool_idle}\n"));

        out.push_str("# HELP tradingroom_websockets_open Live realtime sockets.\n");
        out.push_str("# TYPE tradingroom_websockets_open gauge\n");
        out.push_str(&format!(
            "tradingroom_websockets_open {}\n",
            self.websockets_open.load(Ordering::Relaxed)
        ));

        out.push_str("# HELP tradingroom_rooms_watched Rooms with at least one live socket.\n");
        out.push_str("# TYPE tradingroom_rooms_watched gauge\n");
        out.push_str(&format!("tradingroom_rooms_watched {rooms_watched}\n"));

        out.push_str("# HELP tradingroom_events_published_total Events fanned out to sockets.\n");
        out.push_str("# TYPE tradingroom_events_published_total counter\n");
        out.push_str(&format!(
            "tradingroom_events_published_total {}\n",
            self.events_published.load(Ordering::Relaxed)
        ));

        out
    }
}

/// `GET /metrics`.
///
/// Deliberately unauthenticated, and deliberately carrying nothing sensitive: no room ids, no
/// user ids, no paths. It is scraped by an agent on the same network, and putting a session in
/// front of it means every scraper needs a credential that then has to be rotated.
pub async fn metrics(State(state): State<Arc<AppState>>) -> Response {
    // Read from the hub rather than mirrored into `Metrics`: one source of truth, and the hub
    // is the thing that actually knows.
    state
        .metrics
        .events_published
        .store(state.hub.published(), std::sync::atomic::Ordering::Relaxed);

    let body = state.metrics.render(
        state.db.pool_size(),
        state.db.pool_idle(),
        state.hub.rooms_with_listeners(),
    );

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "text/plain; version=0.0.4")],
        body,
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_uuid_in_a_path_never_becomes_a_label() {
        // The whole point: an unbounded label set is a memory leak an attacker can drive.
        let class = route_class("/api/v1/rooms/00000000-0000-4000-8000-000000004242/messages");
        assert_eq!(class, "rooms");
        assert!(!class.contains('6'), "{class}");
    }

    #[test]
    fn the_longest_matching_prefix_wins() {
        // `/api/v1/rooms` and `/api/v1/account` are siblings; a shorter prefix must not shadow.
        assert_eq!(route_class("/api/v1/account/preferences"), "account");
        assert_eq!(route_class("/api/v1/rooms"), "rooms");
        assert_eq!(route_class("/api/auth/login"), "auth_login");
    }

    #[test]
    fn an_unknown_path_collapses_to_other_rather_than_allocating() {
        assert_eq!(route_class("/nonsense"), "other");
        assert_eq!(route_class("/api/v2/future"), "other");
        // Every class, plus `other`, must fit the fixed-size counter array.
        assert!(
            ROUTE_CLASSES.len() < 8,
            "Counters is [AtomicU64; 8]; widen it before adding a ninth class"
        );
    }

    #[test]
    fn only_server_errors_are_counted_as_errors() {
        let metrics = Metrics::new();
        metrics.record("/api/auth/login", 401, 5);
        metrics.record("/api/auth/login", 404, 5);
        metrics.record("/api/auth/login", 200, 5);
        assert_eq!(
            metrics.errors.get("auth_login"),
            0,
            "a 401 is not an outage"
        );

        metrics.record("/api/auth/login", 500, 5);
        assert_eq!(metrics.errors.get("auth_login"), 1);
        assert_eq!(metrics.requests.get("auth_login"), 4);
    }

    #[test]
    fn the_exposition_format_is_parseable_and_carries_no_identifiers() {
        let metrics = Metrics::new();
        metrics.record(
            "/api/v1/rooms/00000000-0000-4000-8000-000000004242",
            200,
            12,
        );
        let body = metrics.render(10, 7, 3);

        assert!(
            body.contains("tradingroom_requests_total{route=\"rooms\"} 1"),
            "{body}"
        );
        assert!(
            body.contains("tradingroom_db_pool_connections 10"),
            "{body}"
        );
        assert!(body.contains("tradingroom_db_pool_idle 7"), "{body}");
        assert!(body.contains("tradingroom_rooms_watched 3"), "{body}");
        // No uuid anywhere in the output.
        assert!(!body.contains("00000000"), "{body}");

        // Every metric declares HELP and TYPE before its samples, or a scraper rejects it.
        for line in body.lines().filter(|l| l.starts_with("tradingroom_")) {
            let name = line.split(['{', ' ']).next().expect("a metric name");
            assert!(
                body.contains(&format!("# TYPE {name} ")),
                "{name} has samples but no TYPE"
            );
        }
    }
}
