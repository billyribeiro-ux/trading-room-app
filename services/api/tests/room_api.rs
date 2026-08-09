//! The v1 room API, end to end: real `axum::serve`, real TCP, real PostgreSQL, real RLS.
//!
//! These run against the committed two-tenant fixture (`api/fixtures/seed.sql`). The point of
//! two tenants is that the most important test here - `a_member_of_one_tenant_cannot_reach_the_other`
//! - cannot pass vacuously.
//!
//! Nothing is mocked. The access cookie is a genuine Ed25519 token minted with the same
//! function the login handler uses, so a break in signing, in the cookie encoding, in routing
//! or in the extractor all show up here rather than in production.

use std::sync::Arc;

use ed25519_dalek::SigningKey;
use time::OffsetDateTime;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tradingroom_api::auth::token::{self, AccessClaims};
use tradingroom_api::db::Db;
use tradingroom_api::http::{ACCESS_COOKIE, AppState, router};
use tradingroom_api::limits;
use uuid::{Uuid, uuid};

// The seeded fixture. `acme-trading` and `beta-trading`, each with one room.
const ACME_ROOM: Uuid = uuid!("a0000003-0000-4000-8000-000000000001");
const ACME_MAIN_CHANNEL: Uuid = uuid!("a0000004-0000-4000-8000-000000000001");
/// Writes go here, reads go to `main`. These tests share one fixture database and run
/// concurrently, so a test that appends to the channel another test is paging through makes
/// both flaky - which is exactly what happened before they were separated.
const ACME_WRITE_CHANNEL: Uuid = uuid!("a0000004-0000-4000-8000-000000000002");
const ACME_OWNER: Uuid = uuid!("a0000001-0000-4000-8000-000000000001");
const ACME_MEMBER: Uuid = uuid!("a0000001-0000-4000-8000-000000000003");
const BETA_ROOM: Uuid = uuid!("b0000003-0000-4000-8000-000000000001");
const BETA_OWNER: Uuid = uuid!("b0000001-0000-4000-8000-000000000001");
const TEST_WEB_ORIGIN: &str = "https://app.example.test";

/// Acme's `enterprises.id`. The cleanup below writes to FORCE-RLS tables, and the test role is
/// `NOBYPASSRLS` exactly like production - so a DELETE without a tenant GUC matches **zero
/// rows and reports success**. These cleanups were silently no-ops until they went through
/// `begin_tenant`.
const ACME_ENTERPRISE: Uuid = uuid!("a0000000-0000-4000-8000-000000000001");

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ptr_clone_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

struct Harness {
    address: String,
    db: Db,
    signing_key: SigningKey,
}

impl Harness {
    async fn start() -> Self {
        let signing_key = SigningKey::from_bytes(&[42u8; 32]);
        let state = Arc::new(AppState::new(
            Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
                .await
                .expect("connect"),
            signing_key.clone(),
            TEST_WEB_ORIGIN.into(),
        ));
        state.set_relay_ready_for_tests(true);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind an ephemeral port");
        let address = listener.local_addr().expect("addr").to_string();

        tokio::spawn(async move {
            let _ = axum::serve(
                listener,
                router(state, limits::REQUEST_TIMEOUT)
                    .into_make_service_with_connect_info::<std::net::SocketAddr>(),
            )
            .await;
        });

        Self {
            address,
            db: Db::connect(&database_url(), 5, limits::DB_ACQUIRE_TIMEOUT)
                .await
                .expect("connect"),
            signing_key,
        }
    }

    /// A genuine access cookie for a seeded user, minted with the production signer.
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

    async fn request(&self, raw: &str) -> String {
        let mut stream = tokio::net::TcpStream::connect(&self.address)
            .await
            .expect("connect to the test server");
        stream.write_all(raw.as_bytes()).await.expect("write");
        stream.flush().await.expect("flush");

        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.expect("read");
        String::from_utf8_lossy(&response).into_owned()
    }

    async fn get(&self, path: &str, cookie: Option<&str>) -> String {
        let cookie = cookie.map_or_else(String::new, |value| format!("Cookie: {value}\r\n"));
        self.request(&format!(
            "GET {path} HTTP/1.1\r\nHost: localhost\r\n{cookie}Connection: close\r\n\r\n"
        ))
        .await
    }

    async fn post(&self, path: &str, cookie: &str, body: &str) -> String {
        self.request(&format!(
            "POST {path} HTTP/1.1\r\nHost: localhost\r\nCookie: {cookie}\r\n\
             Origin: {TEST_WEB_ORIGIN}\r\nSec-Fetch-Site: same-origin\r\n\
             Content-Type: application/json\r\nContent-Length: {}\r\n\
             Connection: close\r\n\r\n{body}",
            body.len()
        ))
        .await
    }
}

fn status_line(response: &str) -> &str {
    response.lines().next().unwrap_or("")
}

/// The JSON body, after the blank line that ends the headers.
fn body(response: &str) -> serde_json::Value {
    let raw = response
        .split_once("\r\n\r\n")
        .map_or("", |(_, body)| body)
        .trim();
    serde_json::from_str(raw).unwrap_or_else(|error| {
        panic!("expected a JSON body, got {raw:?} ({error})");
    })
}

// ---------------------------------------------------------------- authentication

#[tokio::test]
async fn an_unauthenticated_request_is_refused() {
    // Until the extractor landed, the API minted access tokens and verified none of them.
    // This is the test that would have failed.
    let harness = Harness::start().await;
    let response = harness
        .get(&format!("/api/v1/rooms/{ACME_ROOM}"), None)
        .await;
    assert!(status_line(&response).contains("401"), "{response}");
}

#[tokio::test]
async fn a_forged_access_cookie_is_refused() {
    let harness = Harness::start().await;

    // Correctly shaped, signed with a different key. Only the signature check can catch it.
    let other = SigningKey::from_bytes(&[9u8; 32]);
    let claims = AccessClaims::new(
        ACME_OWNER,
        "Ada Owner".into(),
        // Claiming platform admin, for good measure.
        true,
        false,
        OffsetDateTime::now_utc().unix_timestamp(),
    );
    let cookie = format!("{ACCESS_COOKIE}={}", token::sign(&other, &claims));

    let response = harness
        .get(&format!("/api/v1/rooms/{ACME_ROOM}"), Some(&cookie))
        .await;
    assert!(status_line(&response).contains("401"), "{response}");
}

#[tokio::test]
async fn an_expired_access_cookie_is_refused() {
    let harness = Harness::start().await;
    let long_ago = OffsetDateTime::now_utc().unix_timestamp() - 86_400;
    let claims = AccessClaims::new(ACME_OWNER, "Ada Owner".into(), false, false, long_ago);
    let cookie = format!(
        "{ACCESS_COOKIE}={}",
        token::sign(&harness.signing_key, &claims)
    );

    let response = harness
        .get(&format!("/api/v1/rooms/{ACME_ROOM}"), Some(&cookie))
        .await;
    assert!(status_line(&response).contains("401"), "{response}");
}

// ---------------------------------------------------------------- tenancy

/// The load-bearing test. Both users are real, both rooms are real, and the only thing
/// standing between them is the tenancy kernel.
#[tokio::test]
async fn a_member_of_one_tenant_cannot_reach_the_other() {
    let harness = Harness::start().await;
    let acme = harness.cookie_for(ACME_OWNER, "Ada Owner");

    // Acme's owner, asking for Beta's room.
    let response = harness
        .get(&format!("/api/v1/rooms/{BETA_ROOM}"), Some(&acme))
        .await;

    // 404, not 403: telling a stranger the room exists but is closed to them is an existence
    // oracle, and the schema takes the same position by making an RLS miss and an absent row
    // indistinguishable.
    assert!(status_line(&response).contains("404"), "{response}");

    // And the same cookie works for their own room, so the refusal is about the tenant and
    // not about the credential.
    let ok = harness
        .get(&format!("/api/v1/rooms/{ACME_ROOM}"), Some(&acme))
        .await;
    assert!(status_line(&ok).contains("200"), "{ok}");
}

#[tokio::test]
async fn a_room_that_does_not_exist_and_one_that_is_not_yours_look_identical() {
    let harness = Harness::start().await;
    let acme = harness.cookie_for(ACME_OWNER, "Ada Owner");

    let absent = harness
        .get(&format!("/api/v1/rooms/{}", Uuid::new_v4()), Some(&acme))
        .await;
    let foreign = harness
        .get(&format!("/api/v1/rooms/{BETA_ROOM}"), Some(&acme))
        .await;

    assert_eq!(
        status_line(&absent),
        status_line(&foreign),
        "the two must be indistinguishable, or the API is an existence oracle"
    );
    assert_eq!(
        body(&absent)["error"]["code"],
        body(&foreign)["error"]["code"]
    );
}

#[tokio::test]
async fn each_tenants_owner_sees_only_their_own_room() {
    let harness = Harness::start().await;

    for (user, name, room) in [
        (ACME_OWNER, "Ada Owner", ACME_ROOM),
        (BETA_OWNER, "Ben Owner", BETA_ROOM),
    ] {
        let cookie = harness.cookie_for(user, name);
        let response = harness
            .get(&format!("/api/v1/rooms/{room}"), Some(&cookie))
            .await;
        assert!(status_line(&response).contains("200"), "{response}");
        assert_eq!(body(&response)["room"]["id"], room.to_string());
    }
}

// ---------------------------------------------------------------- the read model

#[tokio::test]
async fn the_overview_carries_the_room_its_channels_and_the_callers_own_standing() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let response = harness
        .get(&format!("/api/v1/rooms/{ACME_ROOM}"), Some(&cookie))
        .await;

    assert!(status_line(&response).contains("200"), "{response}");
    let json = body(&response);

    assert_eq!(json["room"]["id"], ACME_ROOM.to_string());
    assert!(
        json["channels"].as_array().expect("channels").len() >= 2,
        "the fixture room has several channels: {json}"
    );

    // The membership block exists so the client never has to reimplement the capability
    // rules to decide what to grey out.
    let membership = &json["membership"];
    assert_eq!(membership["role"], "owner");
    let capabilities = membership["capabilities"].as_array().expect("capabilities");
    assert!(
        capabilities.iter().any(|c| c == "post"),
        "an owner may post: {membership}"
    );
    assert_eq!(membership["isMuted"], false);
}

#[tokio::test]
async fn a_plain_member_gets_fewer_capabilities_than_the_owner() {
    let harness = Harness::start().await;

    let owner = body(
        &harness
            .get(
                &format!("/api/v1/rooms/{ACME_ROOM}"),
                Some(&harness.cookie_for(ACME_OWNER, "Ada Owner")),
            )
            .await,
    );
    let member = body(
        &harness
            .get(
                &format!("/api/v1/rooms/{ACME_ROOM}"),
                Some(&harness.cookie_for(ACME_MEMBER, "Mia Member")),
            )
            .await,
    );

    let owner_count = owner["membership"]["capabilities"]
        .as_array()
        .expect("owner capabilities")
        .len();
    let member_count = member["membership"]["capabilities"]
        .as_array()
        .expect("member capabilities")
        .len();

    assert_eq!(member["membership"]["role"], "member");
    assert!(
        member_count < owner_count,
        "a member ({member_count}) must not have as much as an owner ({owner_count})"
    );
    // The room's seeded policy grants a member exactly the column defaults.
    let names: Vec<_> = member["membership"]["capabilities"]
        .as_array()
        .expect("array")
        .iter()
        .filter_map(|v| v.as_str())
        .collect();
    assert!(names.contains(&"post"), "{names:?}");
    assert!(!names.contains(&"publish_screen"), "{names:?}");
}

// ---------------------------------------------------------------- pagination

/// Walks the whole history one small page at a time and checks the walk is exact: every
/// message seen once, in order, with no duplicate at a page boundary and no row skipped.
///
/// That boundary is precisely what a naive `OFFSET` or a cursor without the `id` tiebreaker
/// gets wrong, and it only shows up with a page size small enough to force several turns.
#[tokio::test]
async fn keyset_pagination_walks_the_history_without_gaps_or_duplicates() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{ACME_ROOM}/channels/{ACME_MAIN_CHANNEL}/messages");

    // Everything in one page, as the reference set.
    let all = body(
        &harness
            .get(&format!("{path}?limit=200"), Some(&cookie))
            .await,
    );
    let expected: Vec<String> = all["items"]
        .as_array()
        .expect("items")
        .iter()
        .map(|m| m["id"].as_str().expect("id").to_owned())
        .collect();
    assert!(
        expected.len() >= 3,
        "the fixture needs several messages to make paging meaningful: {}",
        expected.len()
    );
    assert!(
        all["nextCursor"].is_null(),
        "a single page covering everything must not advertise another"
    );

    // Now the same history, two at a time.
    let mut walked: Vec<String> = Vec::new();
    let mut cursor: Option<String> = None;
    for _ in 0..50 {
        let url = match &cursor {
            Some(c) => format!("{path}?limit=2&cursor={c}"),
            None => format!("{path}?limit=2"),
        };
        let page = body(&harness.get(&url, Some(&cookie)).await);
        let items = page["items"].as_array().expect("items");
        assert!(items.len() <= 2, "limit must be honoured: {page}");

        walked.extend(
            items
                .iter()
                .map(|m| m["id"].as_str().expect("id").to_owned()),
        );

        match page["nextCursor"].as_str() {
            Some(next) => cursor = Some(next.to_owned()),
            None => break,
        }
    }

    assert_eq!(
        walked, expected,
        "the paged walk must reproduce the single-page order exactly"
    );

    let unique: std::collections::HashSet<_> = walked.iter().collect();
    assert_eq!(unique.len(), walked.len(), "a message was returned twice");
}

#[tokio::test]
async fn an_unreadable_cursor_starts_from_the_beginning_rather_than_failing() {
    // Cursors end up in bookmarks and outlive deploys. A 400 strands the client.
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let path = format!("/api/v1/rooms/{ACME_ROOM}/channels/{ACME_MAIN_CHANNEL}/messages");

    let fresh = body(&harness.get(&format!("{path}?limit=2"), Some(&cookie)).await);
    let garbled = body(
        &harness
            .get(
                &format!("{path}?limit=2&cursor=!!!not-a-cursor"),
                Some(&cookie),
            )
            .await,
    );
    assert_eq!(fresh["items"], garbled["items"]);
}

#[tokio::test]
async fn a_channel_from_another_room_is_not_an_accepted_filter() {
    // Both ids come from the URL. RLS confines them to the tenant, but a channel belonging to
    // a *different room of the same tenant* would otherwise be accepted.
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_OWNER, "Ada Owner");

    let beta_channel = uuid!("b0000004-0000-4000-8000-000000000001");
    let response = harness
        .get(
            &format!("/api/v1/rooms/{ACME_ROOM}/channels/{beta_channel}/messages"),
            Some(&cookie),
        )
        .await;
    assert!(status_line(&response).contains("404"), "{response}");
}

// ---------------------------------------------------------------- writing

#[tokio::test]
async fn posting_a_message_takes_its_author_from_the_membership_not_the_request() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let path = format!("/api/v1/rooms/{ACME_ROOM}/channels/{ACME_WRITE_CHANNEL}/messages");
    let unique = format!("posted by the api {}", Uuid::new_v4());

    // The body carries a display name and a presenter claim. Both must be ignored - the old
    // SvelteKit action took `displayName` from the form, so a caller could post as anybody.
    let response = harness
        .post(
            &path,
            &cookie,
            &serde_json::json!({
                "body": unique,
                "displayName": "Ada Owner",
                "isPresenterMessage": true,
            })
            .to_string(),
        )
        .await;

    assert!(status_line(&response).contains("200"), "{response}");
    let posted = body(&response);
    assert_eq!(posted["body"], unique);
    assert_eq!(
        posted["displayName"], "Mia Member",
        "the display name must come from the verified session"
    );
    assert_eq!(
        posted["isPresenterMessage"], false,
        "a plain member is not staff, whatever the request claimed"
    );
    assert_eq!(posted["userId"], ACME_MEMBER.to_string());

    cleanup_message(&harness, posted["id"].as_str().expect("id")).await;
}

#[tokio::test]
async fn an_empty_or_oversized_message_is_refused() {
    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_MEMBER, "Mia Member");
    let path = format!("/api/v1/rooms/{ACME_ROOM}/channels/{ACME_WRITE_CHANNEL}/messages");

    for body_text in ["", "   "] {
        let response = harness
            .post(
                &path,
                &cookie,
                &serde_json::json!({ "body": body_text }).to_string(),
            )
            .await;
        assert!(status_line(&response).contains("400"), "{response}");
    }

    let huge = "x".repeat(5_000);
    let response = harness
        .post(
            &path,
            &cookie,
            &serde_json::json!({ "body": huge }).to_string(),
        )
        .await;
    assert!(status_line(&response).contains("400"), "{response}");
}

#[tokio::test]
async fn a_message_cannot_be_posted_into_another_tenants_room() {
    let harness = Harness::start().await;
    let acme = harness.cookie_for(ACME_OWNER, "Ada Owner");
    let beta_channel = uuid!("b0000004-0000-4000-8000-000000000001");

    let response = harness
        .post(
            &format!("/api/v1/rooms/{BETA_ROOM}/channels/{beta_channel}/messages"),
            &acme,
            &serde_json::json!({ "body": "should never land" }).to_string(),
        )
        .await;
    assert!(status_line(&response).contains("404"), "{response}");

    // And nothing was written.
    let leaked: i64 = sqlx::query_scalar("SELECT count(*) FROM messages WHERE body = $1")
        .bind("should never land")
        .fetch_one(harness.db.identity_pool_for_tests())
        .await
        .expect("count");
    assert_eq!(leaked, 0, "a cross-tenant write reached the database");
}

// ---------------------------------------------------------------- media grants

#[tokio::test]
async fn a_grant_is_minted_that_the_sfu_verifier_accepts() {
    use tradingroom_media::grant::{Admission, GrantVerifier, MediaUserId, UnixTime};

    let harness = Harness::start().await;
    let cookie = harness.cookie_for(ACME_OWNER, "Ada Owner");

    let response = harness
        .post(
            &format!("/api/v1/rooms/{ACME_ROOM}/media-grant"),
            &cookie,
            "{}",
        )
        .await;
    assert!(status_line(&response).contains("200"), "{response}");

    let json = body(&response);
    let token = json["grant"].as_str().expect("a grant");

    // `AppState::new` derives the grant key from the access key by flipping the first byte,
    // which is how a test proves the two are genuinely different keys.
    let mut bytes = harness.signing_key.to_bytes();
    bytes[0] ^= 0xff;
    let grant_key = SigningKey::from_bytes(&bytes);
    let public = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        grant_key.verifying_key().as_bytes(),
    );

    let verified = GrantVerifier::new(Some(&public), Admission::RequireGrant)
        .expect("verifier")
        .verify(
            token,
            UnixTime::from_secs(OffsetDateTime::now_utc().unix_timestamp()),
        )
        .expect("the SFU must accept a grant this API minted");

    assert_eq!(verified.v, 2);
    assert_eq!(verified.user, MediaUserId::User(ACME_OWNER));
    assert_eq!(
        verified.room,
        ACME_ROOM.to_string(),
        "the room comes from the membership, never from the request"
    );
}

#[tokio::test]
async fn a_grant_cannot_be_minted_for_a_room_the_caller_is_not_in() {
    let harness = Harness::start().await;
    let acme = harness.cookie_for(ACME_OWNER, "Ada Owner");

    let response = harness
        .post(
            &format!("/api/v1/rooms/{BETA_ROOM}/media-grant"),
            &acme,
            "{}",
        )
        .await;
    assert!(status_line(&response).contains("404"), "{response}");
}

/// Messages posted by these tests are real rows in the shared fixture database, so each one
/// is removed again. Deleted hard rather than soft: a soft delete would accumulate.
async fn cleanup_message(harness: &Harness, id: &str) {
    let id: Uuid = id.parse().expect("a uuid");
    let mut tx = harness
        .db
        .begin_tenant(tradingroom_api::db::TenantCtx::server(ACME_ENTERPRISE))
        .await
        .expect("a tenant transaction");

    sqlx::query("DELETE FROM room_events WHERE payload->>'id' = $1::text")
        .bind(id)
        .execute(tx.raw_for_tests())
        .await
        .ok();
    sqlx::query("DELETE FROM messages WHERE id = $1")
        .bind(id)
        .execute(tx.raw_for_tests())
        .await
        .expect("cleanup the posted message");

    tx.commit().await.expect("commit the cleanup");
}
