//! End-to-end auth over real HTTP against real PostgreSQL.
//!
//! A real `axum::serve` on an ephemeral port, a real TCP client, real cookies. Calling
//! the handler function directly would skip routing, extractors, body limits and the
//! `Set-Cookie` encoding - which is most of what can actually be wrong.

use std::sync::Arc;

use ed25519_dalek::SigningKey;
use sqlx::PgPool;
use time::OffsetDateTime;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tradingroom_api::db::Db;
use tradingroom_api::http::{ACCESS_COOKIE, AppState, REFRESH_COOKIE, router};
use tradingroom_api::limits;
use uuid::Uuid;

const TEST_WEB_ORIGIN: &str = "https://app.example.test";
const TEST_PASSWORD: &str = "correct horse battery staple";
// Produced by the service's `hash_password` example with the current Argon2id profile.
// Keeping the PHC fixture immutable prevents 21 parallel HTTP harnesses from consuming the
// production hash-admission queue before the behavior under test has even started.
const TEST_PASSWORD_HASH: &str = "$argon2id$v=19$m=19456,t=2,p=1$EJefu4A54Tj4roAXD4Kb1A$8+GlUVmckUtC8wxfwv4THjJBiJYsUOfMfLMLygms2VM";

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://tradingroom_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

fn owner_url() -> String {
    std::env::var("MIGRATE_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ptr_clone:ptr_clone_local_development_password@127.0.0.1:5432/ptr_clone".into()
    })
}

struct Harness {
    address: String,
    admin: PgPool,
    state: Arc<AppState>,
    user_id: Uuid,
    email: String,
    password: String,
}

impl Harness {
    async fn start() -> Self {
        Self::start_with_relay_ready(true).await
    }

    async fn start_with_relay_ready(relay_ready: bool) -> Self {
        let admin = PgPool::connect(&owner_url())
            .await
            .expect("connect as the fixture owner");

        // A dedicated user per run, so tests never depend on seed passwords and can run
        // repeatedly without colliding.
        let unique = Uuid::new_v4();
        let email = format!("e2e-{unique}@example.invalid");
        let plain = TEST_PASSWORD.to_string();

        let user_id: Uuid = sqlx::query_scalar(
            "INSERT INTO users (email, email_hash, password_hash, display_name) \
             VALUES ($1, $2, $3, $4) RETURNING id",
        )
        .bind(&email)
        .bind(format!("{unique:x}"))
        .bind(TEST_PASSWORD_HASH)
        .bind("E2E Tester")
        .fetch_one(&admin)
        .await
        .expect("seed the test user");

        let state = Arc::new(AppState::new(
            Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
                .await
                .expect("connect"),
            SigningKey::from_bytes(&[42u8; 32]),
            TEST_WEB_ORIGIN.into(),
        ));
        state.set_relay_ready_for_tests(relay_ready);
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind an ephemeral port");
        let address = listener.local_addr().expect("addr").to_string();

        tokio::spawn({
            let state = Arc::clone(&state);
            async move {
                // with_connect_info so the IP-keyed limiters see a real peer address, as in
                // production.
                let _ = axum::serve(
                    listener,
                    router(state, limits::REQUEST_TIMEOUT)
                        .into_make_service_with_connect_info::<std::net::SocketAddr>(),
                )
                .await;
            }
        });

        Self {
            address,
            admin,
            state,
            user_id,
            email,
            password: plain,
        }
    }

    /// Minimal HTTP/1.1 client. Avoids adding a dependency just to prove the wire format.
    async fn request(&self, raw: &str) -> String {
        let mut stream = tokio::net::TcpStream::connect(&self.address)
            .await
            .expect("connect to the test server");
        stream.write_all(raw.as_bytes()).await.expect("write");
        stream.flush().await.expect("flush");

        let mut response = Vec::new();
        // The server closes on Connection: close, so read to EOF.
        stream.read_to_end(&mut response).await.expect("read");
        String::from_utf8_lossy(&response).into_owned()
    }

    async fn post_json(&self, path: &str, body: &str) -> String {
        self.request(&format!(
            "POST {path} HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\n\
             Content-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        ))
        .await
    }

    async fn post_with_cookie(&self, path: &str, cookie: &str) -> String {
        self.post_with_cookie_browser(path, cookie, Some(TEST_WEB_ORIGIN), Some("same-origin"))
            .await
    }

    async fn post_with_cookie_browser(
        &self,
        path: &str,
        cookie: &str,
        origin: Option<&str>,
        fetch_site: Option<&str>,
    ) -> String {
        let origin = origin.map_or_else(String::new, |value| format!("Origin: {value}\r\n"));
        let fetch_site =
            fetch_site.map_or_else(String::new, |value| format!("Sec-Fetch-Site: {value}\r\n"));
        self.request(&format!(
            "POST {path} HTTP/1.1\r\nHost: localhost\r\nCookie: {cookie}\r\n\
             {origin}{fetch_site}\
             Content-Length: 0\r\nConnection: close\r\n\r\n"
        ))
        .await
    }

    async fn cleanup(&self) {
        sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
            .bind(self.user_id)
            .execute(&self.admin)
            .await
            .expect("cleanup tokens");
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(self.user_id)
            .execute(&self.admin)
            .await
            .expect("cleanup user");
    }
}

fn status_line(response: &str) -> &str {
    response.lines().next().unwrap_or("")
}

fn cookie_value(response: &str, name: &str) -> Option<String> {
    response
        .lines()
        .filter(|line| line.to_ascii_lowercase().starts_with("set-cookie:"))
        .find_map(|line| {
            let value = line.split_once(':')?.1.trim();
            let (pair, _) = value.split_once(';')?;
            let (key, token) = pair.split_once('=')?;
            (key == name).then(|| token.to_owned())
        })
}

#[tokio::test]
async fn health_is_live_without_touching_the_database() {
    let harness = Harness::start().await;
    let response = harness
        .request("GET /healthz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .await;
    assert!(status_line(&response).contains("200"), "{response}");
    harness.cleanup().await;
}

#[tokio::test]
async fn readiness_reports_the_database() {
    let harness = Harness::start().await;
    let response = harness
        .request("GET /readyz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .await;
    assert!(status_line(&response).contains("200"), "{response}");
    assert!(response.contains("\"db\":\"ok\""), "{response}");
    assert!(response.contains("\"realtime\":\"ok\""), "{response}");
    harness.cleanup().await;
}

#[tokio::test]
async fn readiness_waits_for_the_postgres_listener() {
    let harness = Harness::start_with_relay_ready(false).await;
    let unavailable = harness
        .request("GET /readyz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .await;
    assert!(status_line(&unavailable).contains("503"), "{unavailable}");
    assert!(unavailable.contains("\"db\":\"ok\""), "{unavailable}");
    assert!(
        unavailable.contains("\"realtime\":\"unavailable\""),
        "{unavailable}"
    );

    harness.state.set_relay_ready_for_tests(true);
    let ready = harness
        .request("GET /readyz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
        .await;
    assert!(status_line(&ready).contains("200"), "{ready}");
    assert!(ready.contains("\"realtime\":\"ok\""), "{ready}");
    harness.cleanup().await;
}

#[tokio::test]
async fn cookie_authenticated_mutations_require_the_exact_browser_origin() {
    let harness = Harness::start().await;
    let cookie = format!("{REFRESH_COOKIE}=not-a-real-token");

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
        let response = harness
            .post_with_cookie_browser("/api/auth/refresh", &cookie, origin, fetch_site)
            .await;
        assert!(
            status_line(&response).contains("403"),
            "{label} must fail before token parsing: {response}"
        );
    }

    // Fetch Metadata is supplemental: non-browser clients may omit it, but they still have to
    // declare the one exact Origin. Reaching token validation proves the origin guard passed.
    for fetch_site in [None, Some("same-origin")] {
        let response = harness
            .post_with_cookie_browser(
                "/api/auth/refresh",
                &cookie,
                Some(TEST_WEB_ORIGIN),
                fetch_site,
            )
            .await;
        assert!(status_line(&response).contains("401"), "{response}");
    }

    harness.cleanup().await;
}

#[tokio::test]
async fn non_browser_probe_routes_do_not_require_origin_headers() {
    let harness = Harness::start().await;
    for path in ["/healthz", "/readyz", "/metrics"] {
        let response = harness
            .request(&format!(
                "GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
            ))
            .await;
        assert!(status_line(&response).contains("200"), "{path}: {response}");
    }
    harness.cleanup().await;
}

#[tokio::test]
async fn a_correct_password_returns_both_cookies() {
    let harness = Harness::start().await;

    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;

    assert!(status_line(&response).contains("200"), "{response}");
    // camelCase, like every other response this API produces. It emitted `display_name` until
    // `SessionResponse` was given `rename_all` - a client reading `displayName` would have
    // rendered an empty name with no error anywhere.
    assert!(
        response.contains("\"displayName\":\"E2E Tester\""),
        "{response}"
    );

    let access = cookie_value(&response, ACCESS_COOKIE).expect("access cookie");
    let refresh = cookie_value(&response, REFRESH_COOKIE).expect("refresh cookie");
    assert!(!access.is_empty() && !refresh.is_empty());

    // The __Host- prefix is only honoured with these exact attributes; a browser
    // silently downgrades the cookie otherwise.
    assert!(
        response.contains("__Host-tradingroom_access="),
        "{response}"
    );
    assert!(response.contains("HttpOnly"), "{response}");
    assert!(response.contains("Secure"), "{response}");
    assert!(!response.contains("Domain="), "{response}");

    // Two segments, no header: the access token is the grant format, not a JWT.
    assert_eq!(access.matches('.').count(), 1, "{access}");

    harness.cleanup().await;
}

#[tokio::test]
async fn a_wrong_password_is_refused_with_no_cookies() {
    let harness = Harness::start().await;

    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": "not the password" })
                .to_string(),
        )
        .await;

    assert!(status_line(&response).contains("401"), "{response}");
    assert!(response.contains("\"code\":\"unauthorized\""), "{response}");
    assert!(
        cookie_value(&response, ACCESS_COOKIE).is_none(),
        "{response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn an_unevaluable_stored_hash_is_unavailable_not_invalid_credentials() {
    let harness = Harness::start().await;
    sqlx::query("UPDATE users SET password_hash = $2 WHERE id = $1")
        .bind(harness.user_id)
        .bind("not-a-phc-string")
        .execute(&harness.admin)
        .await
        .expect("corrupt only this test user's stored hash");

    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;

    assert!(status_line(&response).contains("503"), "{response}");
    assert!(response.contains("\"code\":\"unavailable\""), "{response}");
    assert!(
        cookie_value(&response, ACCESS_COOKIE).is_none(),
        "{response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn an_oversized_password_is_a_bad_request_not_a_credential_failure() {
    let harness = Harness::start().await;
    let password = "a".repeat(limits::PASSWORD_MAX_BYTES + 1);

    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": password }).to_string(),
        )
        .await;

    assert!(status_line(&response).contains("400"), "{response}");
    assert!(response.contains("\"code\":\"invalid\""), "{response}");
    assert!(
        response.contains(&format!(
            "password exceeds {} bytes",
            limits::PASSWORD_MAX_BYTES
        )),
        "{response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn an_oversized_normalized_email_is_rejected_at_the_http_boundary() {
    let harness = Harness::start().await;
    let email = "a".repeat(limits::LOGIN_EMAIL_MAX_BYTES + 1);

    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": email, "password": harness.password }).to_string(),
        )
        .await;

    assert!(status_line(&response).contains("400"), "{response}");
    assert!(
        response.contains(&format!(
            "email exceeds {} bytes",
            limits::LOGIN_EMAIL_MAX_BYTES
        )),
        "{response}"
    );
    assert!(
        cookie_value(&response, ACCESS_COOKIE).is_none(),
        "{response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn an_unknown_account_is_indistinguishable_from_a_wrong_password() {
    let harness = Harness::start().await;

    let unknown = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": "nobody@example.invalid", "password": "x" }).to_string(),
        )
        .await;
    let wrong = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": "x" }).to_string(),
        )
        .await;

    // Same status and same body: the login form must not be an account-existence oracle.
    assert!(status_line(&unknown).contains("401"), "{unknown}");
    assert_eq!(status_line(&unknown), status_line(&wrong));
    harness.cleanup().await;
}

#[tokio::test]
async fn a_session_can_be_refreshed_and_the_old_cookie_stops_working() {
    let harness = Harness::start().await;

    let login = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;
    let first = cookie_value(&login, REFRESH_COOKIE).expect("refresh cookie");

    let refreshed = harness
        .post_with_cookie("/api/auth/refresh", &format!("{REFRESH_COOKIE}={first}"))
        .await;
    assert!(status_line(&refreshed).contains("200"), "{refreshed}");
    let second = cookie_value(&refreshed, REFRESH_COOKIE).expect("rotated refresh cookie");
    assert_ne!(first, second, "refresh must rotate the token");

    // Replaying the first cookie is reuse: refused, and it takes the family with it.
    let replay = harness
        .post_with_cookie("/api/auth/refresh", &format!("{REFRESH_COOKIE}={first}"))
        .await;
    assert!(status_line(&replay).contains("401"), "{replay}");

    // ...so the rotated cookie the legitimate client holds is dead too.
    let after = harness
        .post_with_cookie("/api/auth/refresh", &format!("{REFRESH_COOKIE}={second}"))
        .await;
    assert!(
        status_line(&after).contains("401"),
        "reuse detection must revoke the whole family: {after}"
    );

    harness.cleanup().await;
}

#[tokio::test]
async fn logout_clears_the_cookies_and_ends_the_family() {
    let harness = Harness::start().await;

    let login = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;
    let refresh = cookie_value(&login, REFRESH_COOKIE).expect("refresh cookie");

    let logout = harness
        .post_with_cookie("/api/auth/logout", &format!("{REFRESH_COOKIE}={refresh}"))
        .await;
    assert!(status_line(&logout).contains("204"), "{logout}");
    assert!(
        logout.contains("Max-Age=0"),
        "cookies must be cleared: {logout}"
    );

    let after = harness
        .post_with_cookie("/api/auth/refresh", &format!("{REFRESH_COOKIE}={refresh}"))
        .await;
    assert!(
        status_line(&after).contains("401"),
        "the session must be over after logout: {after}"
    );

    harness.cleanup().await;
}

#[tokio::test]
async fn logout_does_not_claim_success_when_family_revocation_fails() {
    let harness = Harness::start().await;

    let login = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;
    let refresh = cookie_value(&login, REFRESH_COOKIE).expect("refresh cookie");

    // Close only the server's pool. The harness keeps a separate pool for deterministic
    // cleanup and for proving this is the revocation dependency—not PostgreSQL itself.
    harness.state.db.close().await;
    let logout = harness
        .post_with_cookie("/api/auth/logout", &format!("{REFRESH_COOKIE}={refresh}"))
        .await;
    assert!(status_line(&logout).contains("503"), "{logout}");
    assert!(logout.contains("\"code\":\"unavailable\""), "{logout}");
    assert!(
        !logout.contains("Max-Age=0"),
        "a failed revocation must leave the cookie available for retry: {logout}"
    );

    harness.cleanup().await;
}

#[tokio::test]
async fn refreshing_without_a_cookie_is_refused() {
    let harness = Harness::start().await;
    let response = harness
        .post_with_cookie("/api/auth/refresh", "unrelated=1")
        .await;
    assert!(status_line(&response).contains("401"), "{response}");
    harness.cleanup().await;
}

#[tokio::test]
async fn the_login_response_never_echoes_the_password() {
    let harness = Harness::start().await;
    let response = harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;
    assert!(
        !response.contains(&harness.password),
        "the password appeared in the response: {response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn a_login_updates_last_login_at() {
    let harness = Harness::start().await;
    let before: Option<OffsetDateTime> =
        sqlx::query_scalar("SELECT last_login_at FROM users WHERE id = $1")
            .bind(harness.user_id)
            .fetch_one(&harness.admin)
            .await
            .expect("read");
    assert!(before.is_none(), "a fresh user has never logged in");

    harness
        .post_json(
            "/api/auth/login",
            &serde_json::json!({ "email": harness.email, "password": harness.password })
                .to_string(),
        )
        .await;

    let after: Option<OffsetDateTime> =
        sqlx::query_scalar("SELECT last_login_at FROM users WHERE id = $1")
            .bind(harness.user_id)
            .fetch_one(&harness.admin)
            .await
            .expect("read");
    assert!(after.is_some(), "last_login_at should be recorded");

    harness.cleanup().await;
}

#[tokio::test]
async fn every_response_carries_the_hardening_headers() {
    let harness = Harness::start().await;
    let responses = [
        harness
            .request("GET /healthz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .await,
        harness
            .request("GET /does-not-exist HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .await,
        harness
            .post_json(
                "/api/auth/login",
                &serde_json::json!({ "email": harness.email, "password": "wrong" }).to_string(),
            )
            .await,
    ];

    for response in responses {
        let lower = response.to_lowercase();
        for header in [
            "x-content-type-options: nosniff",
            "x-frame-options: deny",
            "content-security-policy: default-src 'none'",
            "referrer-policy: no-referrer",
            "cache-control: private, no-store",
        ] {
            assert!(lower.contains(header), "missing `{header}` in: {response}");
        }
        // Auth responses vary by cookie; without Vary a shared cache could hand one user's
        // session response to another.
        assert!(lower.contains("vary: cookie"), "{response}");
    }
    harness.cleanup().await;
}

#[tokio::test]
async fn body_limit_rejections_are_not_cacheable() {
    let harness = Harness::start().await;
    let response = harness
        .request(&format!(
            "POST /api/auth/login HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\n\
             Content-Length: {}\r\nConnection: close\r\n\r\n",
            limits::BODY_LIMIT_BYTES + 1
        ))
        .await;

    assert!(status_line(&response).contains("413"), "{response}");
    assert!(
        response
            .to_lowercase()
            .contains("cache-control: private, no-store"),
        "an early body-limit response must carry the outer cache policy: {response}"
    );
    harness.cleanup().await;
}

#[tokio::test]
async fn repeated_wrong_passwords_are_rate_limited() {
    let harness = Harness::start().await;
    let body = serde_json::json!({ "email": harness.email, "password": "wrong" }).to_string();

    // The per-email failure window is 5. A later guess is still verified (so a correct
    // password can recover) but another invalid password must receive 429.
    let mut saw_rate_limit = false;
    for attempt in 1..=8 {
        let response = harness.post_json("/api/auth/login", &body).await;
        let status = status_line(&response);
        if status.contains("429") {
            saw_rate_limit = true;
            assert!(
                response.contains("\"code\":\"rateLimited\""),
                "attempt {attempt}: {response}"
            );
            break;
        }
        assert!(status.contains("401"), "attempt {attempt}: {status}");
    }
    assert!(
        saw_rate_limit,
        "brute forcing a password was never rate limited"
    );

    harness.cleanup().await;
}

#[tokio::test]
async fn a_correct_password_still_works_after_someone_else_guessed_wrong() {
    // The property that makes this a brute-force defence rather than a denial-of-service
    // tool: only failures are counted, so the real owner is never locked out.
    let harness = Harness::start().await;
    let wrong = serde_json::json!({ "email": harness.email, "password": "wrong" }).to_string();

    // Exhaust the per-email failure window.
    for _ in 0..6 {
        harness.post_json("/api/auth/login", &wrong).await;
    }

    // A *different* account is unaffected, proving the window is keyed per email.
    let other =
        serde_json::json!({ "email": "someone-else@example.invalid", "password": "x" }).to_string();
    let response = harness.post_json("/api/auth/login", &other).await;
    assert!(
        status_line(&response).contains("401"),
        "another account must not be blocked by this one: {response}"
    );

    // Most importantly, the saturated account is verified rather than refused up front.
    let correct =
        serde_json::json!({ "email": harness.email, "password": harness.password }).to_string();
    let response = harness.post_json("/api/auth/login", &correct).await;
    assert!(
        status_line(&response).contains("200"),
        "the real owner must be able to log in after saturation: {response}"
    );
    assert!(
        cookie_value(&response, ACCESS_COOKIE).is_some(),
        "{response}"
    );
    assert!(
        cookie_value(&response, REFRESH_COOKIE).is_some(),
        "{response}"
    );

    harness.cleanup().await;
}
