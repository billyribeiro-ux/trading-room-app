//! HTTP surface.
//!
//! Router assembly and the auth endpoints. Cookies are `__Host-` prefixed, which pins
//! `Secure`, `Path=/` and *no* `Domain` - the strongest cookie the platform offers, and
//! the reason the API is mounted on the same origin as the app rather than on a
//! subdomain: a `Domain=`-scoped cookie is readable by every present and future
//! subdomain.

pub mod client_ip;
pub mod metrics;
pub(crate) mod origin;
pub mod ratelimit;
pub mod v1;

use std::net::SocketAddr;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use axum::extract::State;
use axum::http::{HeaderMap, Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use ed25519_dalek::SigningKey;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use crate::auth::{login, password, refresh, token};
use crate::db::Db;
use crate::error::ApiError;
use crate::limits;

/// `__Host-` requires Secure, Path=/ and no Domain. Browsers enforce that, so the prefix
/// is a guarantee rather than a convention.
pub const ACCESS_COOKIE: &str = "__Host-tradingroom_access";
pub const REFRESH_COOKIE: &str = "__Host-tradingroom_refresh";

pub struct AppState {
    pub db: Db,
    pub signing_key: SigningKey,
    /// Signs media grants. A *different* keypair from `signing_key`; see
    /// [`crate::auth::grant`] for why sharing one would remove the separation between the
    /// two token systems.
    pub grant_key: SigningKey,
    pub limiters: ratelimit::Limiters,
    /// How many reverse proxies sit in front of this process; see [`client_ip::resolve`].
    pub trusted_proxy_hops: usize,
    /// Exact canonical browser origin allowed to use ambient cookies.
    pub trusted_web_origin: String,
    /// Per-room realtime fan-out. An accelerator over `room_events`, never the source of
    /// truth - see [`crate::realtime::hub`].
    pub hub: crate::realtime::hub::Hub,
    /// Fires once, on shutdown, so live WebSockets close cleanly with 1001 rather than having
    /// their sockets torn out from under them.
    pub shutdown: tokio::sync::broadcast::Sender<()>,
    /// RED counters and gauges. Labels come from a static lookup, never from a path.
    pub metrics: metrics::Metrics,
    /// True only while this instance owns an established PostgreSQL `LISTEN` connection.
    /// Readiness includes it because a process without the relay silently misses live events
    /// written by every other API instance.
    relay_ready: AtomicBool,
}

impl AppState {
    /// The public half of [`Self::signing_key`], for verifying what this service minted.
    ///
    /// Derived on each call rather than stored: `VerifyingKey::from(&SigningKey)` is a
    /// scalar-basepoint multiplication, which is measured in microseconds and happens once
    /// per authenticated request - far cheaper than the risk of two fields drifting apart.
    #[must_use]
    pub fn verifying_key(&self) -> ed25519_dalek::VerifyingKey {
        self.signing_key.verifying_key()
    }

    /// Test and default construction. Zero proxy hops means `X-Forwarded-For` is ignored,
    /// which is the safe default for a directly-exposed listener.
    pub fn new(db: Db, signing_key: SigningKey, trusted_web_origin: String) -> Self {
        // Test construction derives a distinct grant key rather than reusing the access key,
        // so a test can never accidentally prove that sharing one works.
        let grant_key = SigningKey::from_bytes(&{
            let mut bytes = signing_key.to_bytes();
            bytes[0] ^= 0xff;
            bytes
        });
        Self::configured(db, signing_key, grant_key, 0, trusted_web_origin)
    }

    /// Production construction with both independently managed signing keys and the verified
    /// reverse-proxy topology.
    pub fn configured(
        db: Db,
        signing_key: SigningKey,
        grant_key: SigningKey,
        trusted_proxy_hops: usize,
        trusted_web_origin: String,
    ) -> Self {
        Self {
            db,
            signing_key,
            grant_key,
            limiters: ratelimit::Limiters::default(),
            trusted_proxy_hops,
            trusted_web_origin,
            hub: crate::realtime::hub::Hub::new(),
            shutdown: tokio::sync::broadcast::channel(1).0,
            metrics: metrics::Metrics::new(),
            relay_ready: AtomicBool::new(false),
        }
    }

    #[must_use]
    pub fn relay_is_ready(&self) -> bool {
        self.relay_ready.load(Ordering::Acquire)
    }

    pub(crate) fn set_relay_ready(&self, ready: bool) {
        self.relay_ready.store(ready, Ordering::Release);
    }

    /// Integration harnesses that intentionally do not consume a PostgreSQL connection for a
    /// relay may explicitly model it as ready. This capability does not exist in production
    /// builds, so runtime code cannot forge the signal.
    #[cfg(feature = "testing")]
    pub fn set_relay_ready_for_tests(&self, ready: bool) {
        self.set_relay_ready(ready);
    }
}

fn request_timeout_layer(timeout: Duration) -> tower_http::timeout::TimeoutLayer {
    tower_http::timeout::TimeoutLayer::with_status_code(StatusCode::GATEWAY_TIMEOUT, timeout)
}

pub fn router(state: Arc<AppState>, request_timeout: Duration) -> Router {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        // Unauthenticated on purpose: it carries no ids and no paths, and putting a session in
        // front of it means every scraper needs a credential to rotate.
        .route("/metrics", get(metrics::metrics))
        .route("/api/openapi.json", get(openapi))
        .route("/api/auth/login", post(login_handler))
        .route("/api/auth/refresh", post(refresh_handler))
        .route("/api/auth/logout", post(logout_handler))
        .merge(v1::router())
        // Outermost, so it also catches a panic raised inside another layer. Without it
        // a panicking handler drops the connection with no response at all, which a
        // client cannot distinguish from a network fault.
        .layer(tower_http::catch_panic::CatchPanicLayer::custom(
            |_: Box<dyn std::any::Any + Send>| {
                tracing::error!("handler panicked; returning 500");
                ApiError::Internal("handler panicked".into()).into_response()
            },
        ))
        .layer(axum::middleware::from_fn_with_state(
            Arc::clone(&state),
            observe,
        ))
        .layer(axum::middleware::from_fn_with_state(
            Arc::clone(&state),
            protect_cookie_authenticated_mutations,
        ))
        .layer(axum::middleware::from_fn(security_headers))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .layer(tower_http::limit::RequestBodyLimitLayer::new(
            limits::BODY_LIMIT_BYTES,
        ))
        // 504 rather than tower-http's default 408: the request did not time out on the
        // client's side, this service failed to produce a response in time. Proxies and
        // dashboards treat the two very differently.
        .layer(request_timeout_layer(request_timeout))
        // `Router::layer` runs bottom-to-top, so this final layer also marks responses
        // generated early by the timeout and body-limit layers as non-cacheable.
        .layer(axum::middleware::from_fn(cache_control))
        .with_state(state)
}

/// Rejects ambient-cookie state changes unless the browser proves the exact configured origin.
///
/// Read-only requests and requests without either authentication cookie pass untouched. That keeps
/// ordinary non-browser health/readiness/metrics probes working, and leaves login available before
/// a cookie exists. The room-events WebSocket is an authenticated GET and is checked separately in
/// its upgrade handler.
async fn protect_cookie_authenticated_mutations(
    State(state): State<Arc<AppState>>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    if is_unsafe(request.method())
        && has_auth_cookie(request.headers())
        && let Err(error) =
            origin::require_exact_browser_origin(request.headers(), &state.trusted_web_origin)
    {
        tracing::warn!(reason = error.reason(), "refused browser origin");
        return ApiError::Forbidden.into_response();
    }

    next.run(request).await
}

fn is_unsafe(method: &Method) -> bool {
    !matches!(method, &Method::GET | &Method::HEAD | &Method::OPTIONS)
}

fn has_auth_cookie(headers: &HeaderMap) -> bool {
    read_cookie(headers, ACCESS_COOKIE).is_some() || read_cookie(headers, REFRESH_COOKIE).is_some()
}

/// Counts every request into [`metrics::Metrics`].
///
/// Reads the *matched route pattern* where axum has one, not the raw URI - `MatchedPath` is
/// `/api/v1/rooms/{room_id}` rather than a path containing a uuid, which is what keeps the
/// label set bounded even as the room count grows.
async fn observe(
    State(state): State<Arc<AppState>>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    let path = request
        .extensions()
        .get::<axum::extract::MatchedPath>()
        .map_or_else(
            || request.uri().path().to_owned(),
            |matched| matched.as_str().to_owned(),
        );

    let started = std::time::Instant::now();
    let response = next.run(request).await;

    state.metrics.record(
        &path,
        response.status().as_u16(),
        // Saturating: a duration longer than u64 milliseconds is not a number anybody needs.
        u64::try_from(started.elapsed().as_millis()).unwrap_or(u64::MAX),
    );

    response
}

/// Headers that cost nothing and close off whole classes of client-side attack.
///
/// This service returns only JSON, so the browser should never be guessing content types
/// or rendering a response as a document.
async fn security_headers(
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();

    // Stops a JSON body being sniffed as HTML and executed.
    headers.insert(
        "x-content-type-options",
        header::HeaderValue::from_static("nosniff"),
    );
    // Nothing here is meant to be framed.
    headers.insert("x-frame-options", header::HeaderValue::from_static("DENY"));
    // A JSON API needs no ambient capability at all.
    headers.insert(
        "content-security-policy",
        header::HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'"),
    );
    // Auth responses vary by cookie; without this a shared cache could serve one user's
    // session response to another.
    headers.insert(
        header::VARY,
        header::HeaderValue::from_static("Cookie, Origin"),
    );
    headers.insert(
        header::REFERRER_POLICY,
        header::HeaderValue::from_static("no-referrer"),
    );
    response
}

/// Marks every response non-cacheable, including responses produced by outer guard layers.
async fn cache_control(request: axum::extract::Request, next: axum::middleware::Next) -> Response {
    let mut response = next.run(request).await;
    // Every response is tenant- and often session-specific. `no-store` forbids persistence;
    // `private` additionally prevents a shared intermediary from treating it as reusable.
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        header::HeaderValue::from_static("private, no-store"),
    );
    response
}

/// Liveness: answers if the process is alive. Deliberately touches nothing, because
/// restarting a healthy process when the database blinks helps nobody.
async fn healthz() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok" })))
}

/// Machine-readable public contract. It contains schemas and cookie names, never credentials or
/// deployment addresses, and is generated from the same Rust module the client snapshot pins.
async fn openapi() -> impl IntoResponse {
    (StatusCode::OK, Json(crate::openapi::document()))
}

/// Readiness: only true if this instance can serve both durable requests and cross-instance
/// realtime delivery.
async fn readyz(State(state): State<Arc<AppState>>) -> Response {
    if let Err(error) = state.db.ping(Duration::from_secs(2)).await {
        tracing::warn!(%error, "database readiness probe failed");
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({
                "db": "unavailable",
                "realtime": if state.relay_is_ready() { "ok" } else { "unavailable" }
            })),
        )
            .into_response();
    }

    // Read this after the asynchronous database probe. Reading it before `await` could return a
    // stale `true` even though the relay disconnected while PostgreSQL was being checked.
    if !state.relay_is_ready() {
        tracing::warn!("realtime relay readiness probe failed");
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "db": "ok", "realtime": "unavailable" })),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({ "db": "ok", "realtime": "ok" })),
    )
        .into_response()
}

/// The peer socket address, if the server was built with connect-info.
///
/// Deliberately infallible: extracting `ConnectInfo` directly would make every request
/// fail with 500 in a deployment that forgot `into_make_service_with_connect_info`, and
/// an availability outage is a worse failure than degraded IP attribution. When absent,
/// IP-keyed limits collapse to one shared bucket, which is loudly logged at startup.
pub struct ClientAddr(pub Option<SocketAddr>);

impl<S: Send + Sync> axum::extract::FromRequestParts<S> for ClientAddr {
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        Ok(Self(
            parts
                .extensions
                .get::<axum::extract::ConnectInfo<SocketAddr>>()
                .map(|axum::extract::ConnectInfo(addr)| *addr),
        ))
    }
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// The body of a successful login or refresh.
///
/// `rename_all` is load-bearing, not cosmetic: every other response this API produces is
/// camelCase, and without it this one alone emits `display_name`. A client reading
/// `displayName` gets `undefined` and renders an empty name with no error anywhere - the same
/// silent shape mismatch that made `Page<T>` stop after one page.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionResponse {
    pub user_id: uuid::Uuid,
    pub display_name: String,
    pub is_platform_admin: bool,
    pub expires_at: i64,
}

fn cookie(name: &str, value: &str, max_age: Duration, path: &str) -> String {
    format!(
        "{name}={value}; Max-Age={}; Path={path}; HttpOnly; Secure; SameSite={}",
        max_age.as_secs(),
        // The refresh token never authorizes resource endpoints. SameSite=Strict keeps it
        // off ordinary cross-site navigation while Path=/ preserves the enforced __Host-
        // prefix contract.
        if name == REFRESH_COOKIE {
            "Strict"
        } else {
            "Lax"
        }
    )
}

fn expired_cookie(name: &str, path: &str) -> String {
    format!("{name}=; Max-Age=0; Path={path}; HttpOnly; Secure; SameSite=Lax")
}

fn login_password_error(error: password::PasswordError) -> ApiError {
    match error {
        password::PasswordError::TooLong { max } => {
            ApiError::Invalid(format!("password exceeds {max} bytes"))
        }
        password::PasswordError::Busy
        | password::PasswordError::HashingFailed
        | password::PasswordError::MalformedHash => ApiError::Unavailable,
    }
}

pub(crate) fn read_cookie(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .filter_map(|pair| pair.trim().split_once('='))
        .find(|(key, _)| *key == name)
        .map(|(_, value)| value.to_owned())
}

pub(crate) fn issue_session(
    state: &AppState,
    user_id: uuid::Uuid,
    display_name: String,
    is_platform_admin: bool,
    is_guest: bool,
    refresh_token: &str,
    now: OffsetDateTime,
) -> Result<Response, ApiError> {
    let claims = token::AccessClaims::new(
        user_id,
        display_name.clone(),
        is_platform_admin,
        is_guest,
        now.unix_timestamp(),
    );
    let access = token::sign(&state.signing_key, &claims);

    let body = SessionResponse {
        user_id,
        display_name,
        is_platform_admin,
        expires_at: claims.exp,
    };

    let mut response = (StatusCode::OK, Json(body)).into_response();
    let headers = response.headers_mut();
    headers.append(
        header::SET_COOKIE,
        cookie(ACCESS_COOKIE, &access, limits::ACCESS_TOKEN_TTL, "/")
            .parse()
            .map_err(|_| ApiError::Internal("malformed cookie".into()))?,
    );
    headers.append(
        header::SET_COOKIE,
        cookie(
            REFRESH_COOKIE,
            refresh_token,
            limits::REFRESH_TOKEN_TTL,
            "/",
        )
        .parse()
        .map_err(|_| ApiError::Internal("malformed cookie".into()))?,
    );
    Ok(response)
}

async fn login_handler(
    State(state): State<Arc<AppState>>,
    ClientAddr(peer): ClientAddr,
    headers: HeaderMap,
    Json(request): Json<LoginRequest>,
) -> Result<Response, ApiError> {
    let now = OffsetDateTime::now_utc();
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|value| value.to_str().ok());
    let client_ip = client_ip::resolve(&headers, peer, state.trusted_proxy_hops);
    let ip_key = client_ip.map_or_else(|| "unknown".to_string(), |ip| ip.to_string());

    // Checked before any hashing: Argon2id is expensive by design, so an unlimited login
    // endpoint exhausts the hashing semaphore long before it exhausts the password space. It
    // also charges malformed/oversized attempts, which must not be a free bypass around the
    // per-client abuse budget.
    if state.limiters.login_ip.check(&ip_key).is_err() {
        return Err(ApiError::RateLimited);
    }
    // Normalize and bound once, before either the email limiter or PostgreSQL sees the value.
    // The database column is unbounded `citext`, so deferring this to SQL would leave both stores
    // attacker-controlled.
    let email_key = ratelimit::email_key(&request.email)
        .map_err(|error| ApiError::Invalid(error.to_string()))?;
    // A saturated failure window changes the response for another bad guess to 429, but does
    // not skip verification: the real owner must still be able to prove the correct password.
    // The IP limiter above keeps that bounded Argon2id work from becoming an unlimited CPU
    // surface.
    let failure_window_saturated = state.limiters.login_email.is_saturated(&email_key);

    let result = login::login(
        &state.db,
        &email_key,
        request.password,
        client_ip.map(Into::into),
        user_agent,
        now,
    )
    .await;

    match result {
        Ok(session) => {
            tracing::info!(user_id = %session.identity.user_id, "login succeeded");
            issue_session(
                &state,
                session.identity.user_id,
                session.identity.display_name,
                session.identity.is_platform_admin,
                session.identity.is_guest,
                &session.refresh.token,
                now,
            )
        }
        Err(login::LoginError::Unavailable) => {
            // Distinct from a credential failure on purpose: this is a 503 an operator
            // can alert on, not a 401 that blames the user for our outage.
            Err(ApiError::Unavailable)
        }
        Err(login::LoginError::Password(error)) => {
            // These mean the credential could not be evaluated. Reporting 401 would lie to the
            // user and charging the failure window would let an operational incident lock out
            // accounts. The details are static and contain neither the email nor hash material.
            if !matches!(error, password::PasswordError::TooLong { .. }) {
                tracing::warn!("login password verification unavailable");
            }
            Err(login_password_error(error))
        }
        Err(login::LoginError::InvalidCredentials) => {
            // Once saturated, keep the counter fixed and return 429 for continued bad guesses.
            // Before saturation, only a completed credential failure is charged.
            let rate_limited = failure_window_saturated
                || state
                    .limiters
                    .login_email
                    .record_failure(&email_key)
                    .is_err();
            // The email itself is never logged: it is personal data, and a failed-login
            // log is exactly where a credential-stuffing list would accumulate.
            tracing::info!(reason = "invalid credentials", "login refused");
            if rate_limited {
                Err(ApiError::RateLimited)
            } else {
                Err(ApiError::Unauthorized)
            }
        }
    }
}

async fn refresh_handler(
    State(state): State<Arc<AppState>>,
    ClientAddr(peer): ClientAddr,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let now = OffsetDateTime::now_utc();
    let client_ip = client_ip::resolve(&headers, peer, state.trusted_proxy_hops);
    let ip_key = client_ip.map_or_else(|| "unknown".to_string(), |ip| ip.to_string());
    if state.limiters.refresh_ip.check(&ip_key).is_err() {
        return Err(ApiError::RateLimited);
    }

    let presented = read_cookie(&headers, REFRESH_COOKIE).ok_or(ApiError::Unauthorized)?;
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|value| value.to_str().ok());

    let rotated = refresh::rotate(
        &state.db,
        &presented,
        client_ip.map(Into::into),
        user_agent,
        now,
    )
    .await
    .map_err(|(error, reason)| {
        tracing::info!(?reason, "refresh refused");
        ApiError::from(error)
    })?;

    // Re-read identity so a user disabled since login cannot keep refreshing forever.
    let row: Option<(String, bool, bool)> =
        sqlx::query_as("SELECT display_name, is_platform_admin, is_guest FROM users WHERE id = $1")
            .bind(rotated.user_id)
            .fetch_optional(state.db.identity().pool())
            .await
            .map_err(|e| ApiError::internal(crate::db::DbError::from(e)))?;

    let (display_name, is_platform_admin, is_guest) = row.ok_or(ApiError::Unauthorized)?;

    issue_session(
        &state,
        rotated.user_id,
        display_name,
        is_platform_admin,
        is_guest,
        &rotated.refresh.token,
        now,
    )
}

async fn logout_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let now = OffsetDateTime::now_utc();

    // Revoke the whole family, not just this token: "log out" must mean the session is
    // over, including any successor already minted on another tab.
    if let Some(presented) = read_cookie(&headers, REFRESH_COOKIE) {
        refresh::revoke_family_for_token(&state.db, &presented, now)
            .await
            .map_err(ApiError::from)?;
    }

    let mut response = StatusCode::NO_CONTENT.into_response();
    let response_headers = response.headers_mut();
    for (name, path) in [(ACCESS_COOKIE, "/"), (REFRESH_COOKIE, "/")] {
        response_headers.append(
            header::SET_COOKIE,
            expired_cookie(name, path)
                .parse()
                .map_err(|_| ApiError::Internal("malformed cookie".into()))?,
        );
    }
    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt as _;

    async fn delayed_response_with_timeout(configured: Duration) -> StatusCode {
        let app = Router::new()
            .route(
                "/slow",
                get(|| async {
                    tokio::time::sleep(Duration::from_millis(50)).await;
                    StatusCode::OK
                }),
            )
            .layer(request_timeout_layer(configured));

        let response = tokio::time::timeout(
            Duration::from_secs(3),
            app.oneshot(
                Request::builder()
                    .uri("/slow")
                    .body(Body::empty())
                    .expect("build request"),
            ),
        )
        .await
        .expect("the request must finish inside the test's outer safety deadline")
        .expect("the timeout layer returns a response rather than an error");

        response.status()
    }

    #[tokio::test]
    async fn configured_request_timeout_controls_the_deadline_and_gateway_status() {
        assert_eq!(
            delayed_response_with_timeout(Duration::from_millis(5)).await,
            StatusCode::GATEWAY_TIMEOUT
        );
        assert_eq!(
            delayed_response_with_timeout(Duration::from_secs(2)).await,
            StatusCode::OK
        );
    }

    #[test]
    fn cookies_carry_the_host_prefix_guarantees() {
        let value = cookie(ACCESS_COOKIE, "abc", Duration::from_secs(600), "/");
        // __Host- is only honoured with Secure, Path=/ and no Domain. Getting any of
        // these wrong silently downgrades the cookie to an ordinary one.
        assert!(value.starts_with("__Host-tradingroom_access="), "{value}");
        assert!(value.contains("Secure"), "{value}");
        assert!(value.contains("HttpOnly"), "{value}");
        assert!(value.contains("Path=/"), "{value}");
        assert!(!value.contains("Domain="), "{value}");
    }

    #[test]
    fn the_refresh_cookie_is_strict_and_meets_the_host_prefix_contract() {
        let value = cookie(REFRESH_COOKIE, "abc", Duration::from_secs(60), "/");
        assert!(value.contains("SameSite=Strict"), "{value}");
        assert!(value.contains("Path=/"), "{value}");
        assert!(!value.contains("Domain="), "{value}");
    }

    #[test]
    fn a_cookie_header_is_parsed_without_being_confused_by_neighbours() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::COOKIE,
            "other=1; __Host-tradingroom_refresh=wanted; another=2"
                .parse()
                .unwrap(),
        );
        assert_eq!(
            read_cookie(&headers, REFRESH_COOKIE),
            Some("wanted".to_string())
        );
        assert_eq!(read_cookie(&headers, ACCESS_COOKIE), None);
    }

    #[test]
    fn password_operational_failures_are_retryable_not_credential_refusals() {
        for error in [
            password::PasswordError::Busy,
            password::PasswordError::HashingFailed,
            password::PasswordError::MalformedHash,
        ] {
            let mapped = login_password_error(error);
            assert_eq!(mapped.status(), StatusCode::SERVICE_UNAVAILABLE);
            assert_eq!(mapped.code(), "unavailable");
        }

        let oversized = login_password_error(password::PasswordError::TooLong { max: 72 });
        assert_eq!(oversized.status(), StatusCode::BAD_REQUEST);
        assert_eq!(oversized.code(), "invalid");
    }
}
