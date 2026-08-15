//! The realtime socket, end to end: a real WebSocket client against a real server, with the
//! events written to a real PostgreSQL outbox.
//!
//! The property under test is the one the design exists for: an event is durable *before* it
//! is fanned out, so a client that was not connected - or was connected and missed it - still
//! gets it. Everything here goes through the same `room_events` table the HTTP write path
//! commits to, in the same transaction as the message itself.

use std::sync::Arc;

use ed25519_dalek::SigningKey;
use futures_util::{SinkExt, StreamExt};
use time::OffsetDateTime;
use tokio_tungstenite::tungstenite;
use tradingroom_api::auth::token::{self, AccessClaims};
use tradingroom_api::db::Db;
use tradingroom_api::http::{ACCESS_COOKIE, AppState, router};
use tradingroom_api::limits;
use uuid::{Uuid, uuid};

const ACME_ROOM: Uuid = uuid!("a0000003-0000-4000-8000-000000000001");
const ACME_EVENTS_CHANNEL: Uuid = uuid!("a0000004-0000-4000-8000-000000000002");
const ACME_MEMBER: Uuid = uuid!("a0000001-0000-4000-8000-000000000003");
const BETA_ROOM: Uuid = uuid!("b0000003-0000-4000-8000-000000000001");
const TEST_WEB_ORIGIN: &str = "https://app.example.test";

/// Acme's `enterprises.id`. The cleanup below writes to FORCE-RLS tables, and the test role is
/// `NOBYPASSRLS` exactly like production - so a DELETE without a tenant GUC matches **zero
/// rows and reports success**. These cleanups were silently no-ops until they went through
/// `begin_tenant`.
const ACME_ENTERPRISE: Uuid = uuid!("a0000000-0000-4000-8000-000000000001");

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://tradingroom_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

struct Harness {
    address: String,
    db: Db,
    signing_key: SigningKey,
}

impl Harness {
    async fn start() -> Self {
        Self::start_with_relay(false).await
    }

    /// One server instance. With `relay`, it also runs the `LISTEN room_events` task, which is
    /// what makes an event written by a *different* instance reach this one's subscribers.
    async fn start_with_relay(relay: bool) -> Self {
        let signing_key = SigningKey::from_bytes(&[42u8; 32]);
        let state = Arc::new(AppState::new(
            Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
                .await
                .expect("connect"),
            signing_key.clone(),
            TEST_WEB_ORIGIN.into(),
        ));

        if relay {
            let _relay = tradingroom_api::realtime::relay::start(Arc::clone(&state))
                .await
                .expect("establish LISTEN before the relay-backed server starts");
            assert!(
                state.relay_is_ready(),
                "relay::start must not return before LISTEN is established"
            );
        }

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind");
        let address = listener.local_addr().expect("addr").to_string();

        tokio::spawn({
            let state = Arc::clone(&state);
            async move {
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
            db: Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
                .await
                .expect("connect"),
            signing_key,
        }
    }

    fn cookie_for(&self, user_id: Uuid, display_name: &str) -> String {
        let claims = AccessClaims::new(
            user_id,
            display_name.to_owned(),
            false,
            false,
            OffsetDateTime::now_utc().unix_timestamp(),
        );
        format!(
            "{ACCESS_COOKIE}={}",
            token::sign(&self.signing_key, &claims)
        )
    }

    /// Opens the room socket. Returns the error status when the upgrade is refused, which is
    /// itself a thing worth asserting - a rejected member should get an HTTP status, not a
    /// successful upgrade followed by a close.
    async fn connect(
        &self,
        room_id: Uuid,
        cookie: Option<&str>,
        after_seq: Option<i64>,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        u16,
    > {
        self.connect_with_browser_headers(
            room_id,
            cookie,
            after_seq,
            Some(TEST_WEB_ORIGIN),
            Some("same-origin"),
        )
        .await
    }

    async fn connect_with_browser_headers(
        &self,
        room_id: Uuid,
        cookie: Option<&str>,
        after_seq: Option<i64>,
        origin: Option<&str>,
        fetch_site: Option<&str>,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        u16,
    > {
        let query = after_seq.map_or_else(String::new, |seq| format!("?after_seq={seq}"));
        let url = format!("ws://{}/api/v1/rooms/{room_id}/events{query}", self.address);

        let mut request = tungstenite::client::IntoClientRequest::into_client_request(url.as_str())
            .expect("a valid ws url");
        if let Some(cookie) = cookie {
            request.headers_mut().insert(
                "cookie",
                tungstenite::http::HeaderValue::from_str(cookie).expect("a valid cookie"),
            );
        }
        if let Some(origin) = origin {
            request.headers_mut().insert(
                "origin",
                tungstenite::http::HeaderValue::from_str(origin).expect("a valid header value"),
            );
        }
        if let Some(fetch_site) = fetch_site {
            request.headers_mut().insert(
                "sec-fetch-site",
                tungstenite::http::HeaderValue::from_str(fetch_site).expect("a valid header value"),
            );
        }

        match tokio_tungstenite::connect_async(request).await {
            Ok((socket, _)) => Ok(socket),
            Err(tungstenite::Error::Http(response)) => Err(response.status().as_u16()),
            Err(other) => panic!("unexpected websocket failure: {other}"),
        }
    }

    async fn post_message(&self, cookie: &str, body: &str) -> serde_json::Value {
        let payload = serde_json::json!({ "body": body }).to_string();
        let raw = format!(
            "POST /api/v1/rooms/{ACME_ROOM}/channels/{ACME_EVENTS_CHANNEL}/messages \
             HTTP/1.1\r\nHost: localhost\r\nCookie: {cookie}\r\n\
             Origin: {TEST_WEB_ORIGIN}\r\nSec-Fetch-Site: same-origin\r\n\
             Content-Type: application/json\r\nContent-Length: {}\r\n\
             Connection: close\r\n\r\n{payload}",
            payload.len()
        );

        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let mut stream = tokio::net::TcpStream::connect(&self.address)
            .await
            .expect("connect");
        stream.write_all(raw.as_bytes()).await.expect("write");
        stream.flush().await.expect("flush");
        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.expect("read");

        let response = String::from_utf8_lossy(&response).into_owned();
        let json = response
            .split_once("\r\n\r\n")
            .map_or("", |(_, b)| b)
            .trim();
        serde_json::from_str(json).unwrap_or_else(|e| panic!("expected JSON, got {json:?} ({e})"))
    }
}

/// Reads frames until an `event` whose payload body matches arrives.
///
/// Scans rather than taking the first event: these tests share one room in a shared fixture
/// database and run concurrently, so another test's message can legitimately land in the
/// stream first. Replay returning it is correct behaviour, not a failure - what matters is
/// that *this* test's event is in there.
async fn wait_for_body(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    body: &str,
) -> serde_json::Value {
    tokio::time::timeout(tokio::time::Duration::from_secs(5), async {
        while let Some(Ok(frame)) = socket.next().await {
            let tungstenite::Message::Text(text) = frame else {
                continue;
            };
            let json: serde_json::Value = serde_json::from_str(&text).expect("a JSON frame");
            if json["notify"] == "event" && json["data"]["payload"]["body"] == body {
                return json;
            }
        }
        panic!("the socket closed before an event carrying {body:?} arrived");
    })
    .await
    .unwrap_or_else(|_| panic!("timed out waiting for an event carrying {body:?}"))
}

/// Reads frames until one matching `notify` arrives, or the deadline passes.
async fn wait_for(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    notify: &str,
) -> serde_json::Value {
    let deadline = tokio::time::Duration::from_secs(5);
    tokio::time::timeout(deadline, async {
        while let Some(Ok(frame)) = socket.next().await {
            let tungstenite::Message::Text(text) = frame else {
                continue;
            };
            let json: serde_json::Value = serde_json::from_str(&text).expect("a JSON frame");
            if json["notify"] == notify {
                return json;
            }
        }
        panic!("the socket closed before a {notify:?} notification arrived");
    })
    .await
    .unwrap_or_else(|_| panic!("timed out waiting for a {notify:?} notification"))
}

async fn cleanup(harness: &Harness, marker: &str) {
    let mut tx = harness
        .db
        .begin_tenant(tradingroom_api::db::TenantCtx::server(ACME_ENTERPRISE))
        .await
        .expect("a tenant transaction");

    // The event first: it references the message's payload but is deleted by room, and the
    // message row is what the FK cascade does not cover.
    sqlx::query("DELETE FROM room_events WHERE payload->>'body' = $1")
        .bind(marker)
        .execute(tx.raw_for_tests())
        .await
        .expect("clean up the event");
    sqlx::query("DELETE FROM messages WHERE body = $1")
        .bind(marker)
        .execute(tx.raw_for_tests())
        .await
        .expect("clean up the message");

    tx.commit().await.expect("commit the cleanup");
}

// ---------------------------------------------------------------- relay lifecycle

#[tokio::test]
async fn a_stopped_relay_cannot_leave_the_instance_marked_ready() {
    let state = Arc::new(AppState::new(
        Db::connect(&database_url(), 2, limits::DB_ACQUIRE_TIMEOUT)
            .await
            .expect("connect"),
        SigningKey::from_bytes(&[43u8; 32]),
        TEST_WEB_ORIGIN.into(),
    ));
    let relay = tradingroom_api::realtime::relay::start(Arc::clone(&state))
        .await
        .expect("establish LISTEN");
    assert!(state.relay_is_ready());

    relay.abort();
    let _ = relay.await;
    assert!(
        !state.relay_is_ready(),
        "task abort must drop relay readiness"
    );
    state.db.close().await;
}

// ---------------------------------------------------------------- admission

#[tokio::test]
async fn an_unauthenticated_socket_is_refused_before_the_upgrade() {
    // A refused upgrade must be an HTTP status. Upgrading and then closing gives a browser an
    // opaque failure with nothing to branch on.
    let harness = Harness::start().await;
    let status = harness
        .connect(ACME_ROOM, None, None)
        .await
        .expect_err("an unauthenticated socket must be refused");
    assert_eq!(status, 401);
}

#[tokio::test]
async fn the_room_socket_requires_the_exact_browser_origin() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");

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
        let status = harness
            .connect_with_browser_headers(ACME_ROOM, Some(&cookie), None, origin, fetch_site)
            .await
            .unwrap_err();
        assert_eq!(status, 403, "{label}");
    }

    // Non-browser clients may omit Fetch Metadata, but never Origin itself.
    let mut socket = harness
        .connect_with_browser_headers(ACME_ROOM, Some(&cookie), None, Some(TEST_WEB_ORIGIN), None)
        .await
        .expect("the exact origin passes");
    socket.close(None).await.expect("close");
}

#[tokio::test]
async fn a_socket_for_another_tenants_room_is_refused() {
    let harness = Harness::start().await;
    let acme = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let status = harness
        .connect(BETA_ROOM, Some(&acme), None)
        .await
        .expect_err("a cross-tenant socket must be refused");
    // 404, matching the HTTP API: the socket must not become an existence oracle either.
    assert_eq!(status, 404);
}

// ---------------------------------------------------------------- the push

#[tokio::test]
async fn a_message_posted_over_http_arrives_on_the_socket() {
    // The whole point: this replaces `invalidate('room:data')` every five seconds.
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");

    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    let ready = wait_for(&mut socket, "ready").await;
    let start_seq = ready["data"]["seq"].as_i64().expect("a starting sequence");

    let marker = format!("realtime probe {}", Uuid::new_v4());
    harness.post_message(&cookie, &marker).await;

    let event = wait_for_body(&mut socket, &marker).await;
    assert_eq!(event["data"]["type"], "message.created");
    assert!(
        event["data"]["seq"].as_i64().expect("a sequence") > start_seq,
        "the event must be newer than where the client started: {event}"
    );
    // A notification carries no `id`, so it can never be mistaken for a reply.
    assert!(event.get("id").is_none(), "{event}");

    cleanup(&harness, &marker).await;
}

/// The durability property. The client is not connected when the message is posted, and still
/// receives it - because the event was committed with the message, not published after it.
#[tokio::test]
async fn an_event_written_while_disconnected_is_replayed_on_reconnect() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");

    // Connect once, only to learn where we are.
    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    let seq = wait_for(&mut socket, "ready").await["data"]["seq"]
        .as_i64()
        .expect("a sequence");
    socket.close(None).await.ok();
    drop(socket);

    // Post while nobody is listening. In-memory fan-out reaches no one; the outbox is the
    // only reason this is not lost.
    let marker = format!("offline probe {}", Uuid::new_v4());
    harness.post_message(&cookie, &marker).await;

    // Reconnect with the cursor.
    let mut resumed = harness
        .connect(ACME_ROOM, Some(&cookie), Some(seq))
        .await
        .expect("the socket reopens");

    // The event must be in the replayed gap. It is not necessarily *first* - a concurrent
    // test may have written to the same room - and requiring that would be asserting test
    // scheduling rather than replay.
    let event = wait_for_body(&mut resumed, &marker).await;
    assert_eq!(event["data"]["type"], "message.created");

    cleanup(&harness, &marker).await;
}

#[tokio::test]
async fn a_fresh_client_is_not_sent_the_rooms_entire_history() {
    // Without a cursor the client starts at the head. Replaying everything as "what you
    // missed" would make every reconnect proportional to the room's age.
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");

    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");

    // The first frame must be `ready`, with no events before it.
    let first = tokio::time::timeout(tokio::time::Duration::from_secs(5), socket.next())
        .await
        .expect("a first frame")
        .expect("a frame")
        .expect("a valid frame");
    let tungstenite::Message::Text(text) = first else {
        panic!("expected a text frame");
    };
    let json: serde_json::Value = serde_json::from_str(&text).expect("JSON");
    assert_eq!(
        json["notify"], "ready",
        "a fresh client must not be sent history first: {json}"
    );
}

// ---------------------------------------------------------------- commands

#[tokio::test]
async fn a_ping_is_answered_with_a_correlated_reply() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    wait_for(&mut socket, "ready").await;

    socket
        .send(tungstenite::Message::Text(
            r#"{"id":"abc-123","cmd":"ping"}"#.into(),
        ))
        .await
        .expect("send");

    let reply = next_reply(&mut socket).await;
    assert_eq!(reply["id"], "abc-123", "the id must be echoed verbatim");
    assert_eq!(reply["ok"], true);
    assert_eq!(reply["data"]["pong"], true);
}

#[tokio::test]
async fn an_unknown_command_is_refused_without_closing_the_socket() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    wait_for(&mut socket, "ready").await;

    socket
        .send(tungstenite::Message::Text(
            r#"{"id":1,"cmd":"drop table messages"}"#.into(),
        ))
        .await
        .expect("send");

    let reply = next_reply(&mut socket).await;
    assert_eq!(reply["ok"], false);
    assert_eq!(reply["error"]["code"], "unknownCommand");

    // Still usable: one bad command must not cost the connection.
    socket
        .send(tungstenite::Message::Text(
            r#"{"id":2,"cmd":"ping"}"#.into(),
        ))
        .await
        .expect("send");
    assert_eq!(next_reply(&mut socket).await["id"], 2);
}

#[tokio::test]
async fn a_malformed_frame_is_answered_rather_than_ignored() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    wait_for(&mut socket, "ready").await;

    socket
        .send(tungstenite::Message::Text("not json at all".into()))
        .await
        .expect("send");

    let reply = next_reply(&mut socket).await;
    assert_eq!(reply["ok"], false);
    assert_eq!(reply["error"]["code"], "invalid");
    // No id was parseable, so none is echoed - but a reply still comes back rather than the
    // client being left waiting.
    assert!(reply["id"].is_null(), "{reply}");
}

#[tokio::test]
async fn resume_returns_the_gap_for_a_client_that_would_rather_not_reconnect() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let mut socket = harness
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    let seq = wait_for(&mut socket, "ready").await["data"]["seq"]
        .as_i64()
        .expect("a sequence");

    let marker = format!("resume probe {}", Uuid::new_v4());
    harness.post_message(&cookie, &marker).await;
    // Drain the live push so the reply below is unambiguous.
    wait_for_body(&mut socket, &marker).await;

    socket
        .send(tungstenite::Message::Text(
            serde_json::json!({ "id": 7, "cmd": "resume", "data": { "afterSeq": seq } })
                .to_string()
                .into(),
        ))
        .await
        .expect("send");

    let reply = next_reply(&mut socket).await;
    assert_eq!(reply["id"], 7);
    assert_eq!(reply["ok"], true);
    let events = reply["data"]["events"].as_array().expect("events");
    assert!(
        events
            .iter()
            .any(|event| event["payload"]["body"] == marker.as_str()),
        "resume must return the gap: {reply}"
    );

    cleanup(&harness, &marker).await;
}

/// Reads until a reply (something with `ok`) arrives, skipping notifications.
async fn next_reply(
    socket: &mut tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) -> serde_json::Value {
    tokio::time::timeout(tokio::time::Duration::from_secs(5), async {
        while let Some(Ok(frame)) = socket.next().await {
            let tungstenite::Message::Text(text) = frame else {
                continue;
            };
            let json: serde_json::Value = serde_json::from_str(&text).expect("JSON");
            if json.get("ok").is_some() {
                return json;
            }
        }
        panic!("the socket closed before a reply arrived");
    })
    .await
    .expect("timed out waiting for a reply")
}

// ---------------------------------------------------------------- cross-instance

/// Two independent server instances, each with its own `Hub`, exactly as two pods would be.
/// The event is written through instance A's HTTP API; the subscriber is on instance B.
///
/// Without the relay this cannot pass - B's in-memory hub never hears about A's write. It is
/// the only test here that proves the `LISTEN`/`NOTIFY` path rather than the in-process one.
#[tokio::test]
async fn an_event_written_on_one_instance_reaches_a_subscriber_on_another() {
    let writer = Harness::start_with_relay(true).await;
    let reader = Harness::start_with_relay(true).await;
    assert_ne!(
        writer.address, reader.address,
        "these must be two genuinely separate servers"
    );

    let cookie = reader.cookie_for(ACME_MEMBER, "Mia Member");

    // Subscribe on the reader.
    let mut socket = reader
        .connect(ACME_ROOM, Some(&cookie), None)
        .await
        .expect("the socket opens");
    wait_for(&mut socket, "ready").await;

    // Write on the writer. Its own hub fans out to nobody - the subscriber is elsewhere.
    let marker = format!("cross-instance probe {}", Uuid::new_v4());
    writer.post_message(&cookie, &marker).await;

    let event = wait_for_body(&mut socket, &marker).await;
    assert_eq!(event["data"]["type"], "message.created");
    assert!(
        event["data"]["seq"].as_i64().expect("a sequence") > 0,
        "the relay must deliver the real row, not a synthesised one: {event}"
    );

    cleanup(&writer, &marker).await;
}
