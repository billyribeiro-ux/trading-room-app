//! Shared harness for the HTTP integration tests.
//!
//! A real `axum::serve` on an ephemeral port and a real TCP client. Calling handler functions
//! directly would skip routing, the extractors, the body limit and the cookie encoding - which
//! is most of what can actually be wrong.
//!
//! `allow(dead_code)` because Rust compiles an integration test's shared module separately into
//! *each* test binary, so anything only `actions.rs` uses reads as unused while compiling
//! `login_probe.rs`. Narrowing it per item would mean annotating almost every line to silence a
//! warning about a file that is, in aggregate, entirely used.
#![allow(dead_code)]

use std::sync::Arc;

use ed25519_dalek::SigningKey;
use sqlx::{Connection, Executor, PgConnection, PgPool};
use time::OffsetDateTime;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tradingroom_api::auth::token::{self, AccessClaims};
use tradingroom_api::db::Db;
use tradingroom_api::http::{ACCESS_COOKIE, AppState, router};
use tradingroom_api::limits;
use uuid::{Uuid, uuid};

// The committed two-tenant fixture, `api/fixtures/seed.sql`.
pub const ACME_ROOM: Uuid = uuid!("a0000003-0000-4000-8000-000000000001");
/// Writes go here; `main` is left alone for the pagination tests, which page through it while
/// these run concurrently.
pub const ACME_WRITE_CHANNEL: Uuid = uuid!("a0000004-0000-4000-8000-000000000002");
pub const ACME_OWNER: Uuid = uuid!("a0000001-0000-4000-8000-000000000001");
pub const ACME_MODERATOR: Uuid = uuid!("a0000001-0000-4000-8000-000000000002");
pub const ACME_MEMBER: Uuid = uuid!("a0000001-0000-4000-8000-000000000003");
/// Exists only to be muted. Muting a member other tests post as makes both flaky, which is
/// precisely what happened before this account was seeded.
pub const ACME_TARGET: Uuid = uuid!("a0000001-0000-4000-8000-000000000005");
pub const BETA_ROOM: Uuid = uuid!("b0000003-0000-4000-8000-000000000001");
pub const BETA_OWNER: Uuid = uuid!("b0000001-0000-4000-8000-000000000001");
pub const TEST_WEB_ORIGIN: &str = "https://app.example.test";
/// Acme's `enterprises.id`. Needed because the helpers below read tenant-scoped tables, and
/// the test role is `NOBYPASSRLS` like production - without a GUC they see **zero rows**,
/// which is the tenancy kernel working exactly as designed rather than a missing fixture.
pub const ACME_ENTERPRISE: Uuid = uuid!("a0000000-0000-4000-8000-000000000001");

fn database_url() -> String {
    std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://tradingroom_app:ptr_app_local_dev@127.0.0.1:5432/ptr_clone".into()
    })
}

pub fn owner_url() -> String {
    std::env::var("MIGRATE_DATABASE_URL").unwrap_or_else(|_| {
        "postgres://ptr_clone:ptr_clone_local_development_password@127.0.0.1:5432/ptr_clone".into()
    })
}

/// A parsed HTTP response: the status and the JSON body, which is what every assertion wants.
pub struct Response {
    pub status: u16,
    pub body: serde_json::Value,
}

impl Response {
    /// The body, asserting a 2xx first so a failure reports the error rather than an unhelpful
    /// "expected object, got null" three lines later.
    pub fn ok(self) -> serde_json::Value {
        assert!(
            (200..300).contains(&self.status),
            "expected success, got {} with {:?}",
            self.status,
            self.body
        );
        self.body
    }
}

pub struct Harness {
    address: String,
    db: Db,
    admin: PgPool,
    signing_key: SigningKey,
}

impl Harness {
    pub async fn start() -> Self {
        let signing_key = SigningKey::from_bytes(&[42u8; 32]);
        let admin = PgPool::connect(&owner_url())
            .await
            .expect("connect as the fixture owner");
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
            admin,
            signing_key,
        }
    }

    /// A genuine access cookie, minted with the production signer.
    pub fn cookie_for(&self, user_id: Uuid, display_name: &str) -> String {
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

    pub fn message_path(&self) -> String {
        format!("/api/v1/rooms/{ACME_ROOM}/channels/{ACME_WRITE_CHANNEL}/messages")
    }

    async fn request(&self, raw: &str) -> Response {
        let mut stream = tokio::net::TcpStream::connect(&self.address)
            .await
            .expect("connect to the test server");
        stream.write_all(raw.as_bytes()).await.expect("write");
        stream.flush().await.expect("flush");

        let mut buffer = Vec::new();
        stream.read_to_end(&mut buffer).await.expect("read");
        let response = String::from_utf8_lossy(&buffer).into_owned();

        let status = response
            .split_whitespace()
            .nth(1)
            .and_then(|code| code.parse().ok())
            .unwrap_or_else(|| panic!("no status line in {response:?}"));

        let raw_body = response
            .split_once("\r\n\r\n")
            .map_or("", |(_, body)| body)
            .trim();
        // 204 has no body, and that is not a parse failure.
        let body = if raw_body.is_empty() {
            serde_json::Value::Null
        } else {
            serde_json::from_str(raw_body).unwrap_or(serde_json::Value::String(raw_body.into()))
        };

        Response { status, body }
    }

    pub async fn get(&self, path: &str, cookie: Option<&str>) -> Response {
        let cookie = cookie.map_or_else(String::new, |value| format!("Cookie: {value}\r\n"));
        self.request(&format!(
            "GET {path} HTTP/1.1\r\nHost: localhost\r\n{cookie}Connection: close\r\n\r\n"
        ))
        .await
    }

    async fn with_body(
        &self,
        method: &str,
        path: &str,
        cookie: &str,
        body: &serde_json::Value,
    ) -> Response {
        let payload = body.to_string();
        self.request(&format!(
            "{method} {path} HTTP/1.1\r\nHost: localhost\r\nCookie: {cookie}\r\n\
             Origin: {TEST_WEB_ORIGIN}\r\nSec-Fetch-Site: same-origin\r\n\
             Content-Type: application/json\r\nContent-Length: {}\r\n\
             Connection: close\r\n\r\n{payload}",
            payload.len()
        ))
        .await
    }

    pub async fn post_json(&self, path: &str, cookie: &str, body: &serde_json::Value) -> Response {
        self.with_body("POST", path, cookie, body).await
    }

    pub async fn put_json(&self, path: &str, cookie: &str, body: &serde_json::Value) -> Response {
        self.with_body("PUT", path, cookie, body).await
    }

    pub async fn patch_json(&self, path: &str, cookie: &str, body: &serde_json::Value) -> Response {
        self.with_body("PATCH", path, cookie, body).await
    }

    pub async fn delete(&self, path: &str, cookie: &str) -> Response {
        self.with_body("DELETE", path, cookie, &serde_json::json!({}))
            .await
    }

    /// A POST with no cookie, for the auth endpoints.
    pub async fn post_anonymous(&self, path: &str, body: &serde_json::Value) -> Response {
        let payload = body.to_string();
        self.request(&format!(
            "POST {path} HTTP/1.1\r\nHost: localhost\r\n\
             Content-Type: application/json\r\nContent-Length: {}\r\n\
             Connection: close\r\n\r\n{payload}",
            payload.len()
        ))
        .await
    }

    pub async fn post_message(&self, cookie: &str, body: &str) -> serde_json::Value {
        self.post_json(
            &self.message_path(),
            cookie,
            &serde_json::json!({ "body": body }),
        )
        .await
        .ok()
    }

    // ---------------------------------------------------------------- fixture helpers
    //
    // These read and repair the shared fixture directly. Every test that writes to it puts it
    // back, so the suite can run repeatedly without drifting.

    /// A tenant-scoped transaction for the fixture helpers.
    ///
    /// These read `room_members`, `messages` and `audit_log`, all of which are FORCE RLS. The
    /// test role is `NOBYPASSRLS` - the same role production uses - so a query without a GUC
    /// returns zero rows rather than an error. Going through `begin_tenant` is how a test gets
    /// to see the fixture at all, and is itself a small demonstration that the kernel works.
    async fn tenant_tx(&self) -> tradingroom_api::db::TenantTx<'static> {
        self.db
            .begin_tenant(tradingroom_api::db::TenantCtx::server(ACME_ENTERPRISE))
            .await
            .expect("a tenant transaction")
    }

    pub async fn member_id_of(&self, user_id: Uuid) -> Uuid {
        let mut tx = self.tenant_tx().await;
        let id =
            sqlx::query_scalar("SELECT id FROM room_members WHERE user_id = $1 AND room_id = $2")
                .bind(user_id)
                .bind(ACME_ROOM)
                .fetch_one(tx.raw_for_tests())
                .await
                .expect("the fixture has this membership");
        tx.commit().await.expect("commit");
        id
    }

    pub async fn display_name_of(&self, user_id: Uuid) -> Option<String> {
        let mut tx = self.tenant_tx().await;
        let name = sqlx::query_scalar(
            "SELECT display_name FROM room_members WHERE user_id = $1 AND room_id = $2",
        )
        .bind(user_id)
        .bind(ACME_ROOM)
        .fetch_one(tx.raw_for_tests())
        .await
        .expect("the fixture has this membership");
        tx.commit().await.expect("commit");
        name
    }

    /// The fixture seeds `room_members.display_name` as NULL, so restoring means clearing it.
    pub async fn reset_display_name(&self, user_id: Uuid) {
        let mut tx = self.tenant_tx().await;
        sqlx::query(
            "UPDATE room_members SET display_name = NULL WHERE user_id = $1 AND room_id = $2",
        )
        .bind(user_id)
        .bind(ACME_ROOM)
        .execute(tx.raw_for_tests())
        .await
        .expect("reset the display name");
        tx.commit().await.expect("commit");
    }

    /// Removes only the keys these tests add, leaving the seeded preferences intact.
    pub async fn reset_preferences(&self, user_id: Uuid) {
        sqlx::query("UPDATE users SET preferences = preferences - 'ptrTestKey' WHERE id = $1")
            .bind(user_id)
            .execute(self.db.identity_pool_for_tests())
            .await
            .expect("reset preferences");
    }

    /// Hard-deletes a message and its event. These are real rows in a shared fixture; a soft
    /// delete would accumulate.
    pub async fn purge_message(&self, id: &str) {
        let Ok(id) = id.parse::<Uuid>() else {
            return;
        };
        let mut tx = self.tenant_tx().await;
        sqlx::query("DELETE FROM room_events WHERE payload->>'id' = $1::text")
            .bind(id)
            .execute(tx.raw_for_tests())
            .await
            .ok();
        sqlx::query("DELETE FROM messages WHERE id = $1")
            .bind(id)
            .execute(tx.raw_for_tests())
            .await
            .expect("purge the message");
        tx.commit().await.expect("commit");
    }

    /// Runs a statement under Acme's tenant GUC, returning a `Uuid`.
    ///
    /// The bindings are applied by a closure because every one of these has a different arity
    /// and sqlx's builder is not object-safe; passing a `Vec` of erased values would need a
    /// wrapper enum for no benefit.
    pub async fn tenant_scalar<F>(&self, sql: &str, bind: F) -> Uuid
    where
        F: FnOnce(
            sqlx::query::QueryScalar<'_, sqlx::Postgres, Uuid, sqlx::postgres::PgArguments>,
        ) -> sqlx::query::QueryScalar<
            '_,
            sqlx::Postgres,
            Uuid,
            sqlx::postgres::PgArguments,
        >,
    {
        let mut tx = self.tenant_tx().await;
        let value = bind(sqlx::query_scalar(sqlx::AssertSqlSafe(sql.to_owned())))
            .fetch_one(tx.raw_for_tests())
            .await
            .expect("tenant scalar");
        tx.commit().await.expect("commit");
        value
    }

    pub async fn tenant_scalar_i32<F>(&self, sql: &str, bind: F) -> i32
    where
        F: FnOnce(
            sqlx::query::QueryScalar<'_, sqlx::Postgres, i32, sqlx::postgres::PgArguments>,
        )
            -> sqlx::query::QueryScalar<'_, sqlx::Postgres, i32, sqlx::postgres::PgArguments>,
    {
        let mut tx = self.tenant_tx().await;
        let value = bind(sqlx::query_scalar(sqlx::AssertSqlSafe(sql.to_owned())))
            .fetch_one(tx.raw_for_tests())
            .await
            .expect("tenant scalar");
        tx.commit().await.expect("commit");
        value
    }

    /// Reads a global identity-table fixture as the test owner. Production runtime SQL is
    /// intentionally denied columns used only to prove fixture cleanup and constraints.
    pub async fn admin_scalar_i32(&self, sql: &str, id: Uuid) -> i32 {
        sqlx::query_scalar(sqlx::AssertSqlSafe(sql.to_owned()))
            .bind(id)
            .fetch_one(&self.admin)
            .await
            .expect("admin fixture scalar")
    }

    pub async fn tenant_optional_scalar<F>(&self, sql: &str, bind: F) -> Option<f64>
    where
        F: FnOnce(
            sqlx::query::QueryScalar<'_, sqlx::Postgres, Option<f64>, sqlx::postgres::PgArguments>,
        ) -> sqlx::query::QueryScalar<
            '_,
            sqlx::Postgres,
            Option<f64>,
            sqlx::postgres::PgArguments,
        >,
    {
        let mut tx = self.tenant_tx().await;
        let value = bind(sqlx::query_scalar(sqlx::AssertSqlSafe(sql.to_owned())))
            .fetch_optional(tx.raw_for_tests())
            .await
            .expect("tenant scalar")
            .flatten();
        tx.commit().await.expect("commit");
        value
    }

    pub async fn tenant_execute<F>(&self, sql: &str, bind: F)
    where
        F: FnOnce(
            sqlx::query::Query<'_, sqlx::Postgres, sqlx::postgres::PgArguments>,
        ) -> sqlx::query::Query<'_, sqlx::Postgres, sqlx::postgres::PgArguments>,
    {
        let mut tx = self.tenant_tx().await;
        bind(sqlx::query(sqlx::AssertSqlSafe(sql.to_owned())))
            .execute(tx.raw_for_tests())
            .await
            .expect("tenant execute");
        tx.commit().await.expect("commit");
    }

    /// Removes guest accounts created in a test room. `users` has no RLS, so this goes through
    /// the identity pool rather than a tenant transaction.
    pub async fn purge_guests(&self, room_id: Uuid) {
        sqlx::query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE guest_created_in_room_id = $1)")
            .bind(room_id)
            .execute(&self.admin)
            .await
            .expect("purge guest tokens");
        sqlx::query("DELETE FROM users WHERE guest_created_in_room_id = $1")
            .bind(room_id)
            .execute(&self.admin)
            .await
            .expect("purge guests");
    }

    /// Removes a room built by a test, and everything that cascades from it.
    pub async fn drop_room(&self, room_id: Uuid) {
        let mut tx = self.tenant_tx().await;
        for statement in [
            "DELETE FROM room_events WHERE room_id = $1",
            "DELETE FROM invite_tokens WHERE room_id = $1",
            "DELETE FROM room_members WHERE room_id = $1",
            "DELETE FROM rooms WHERE id = $1",
        ] {
            sqlx::query(sqlx::AssertSqlSafe(statement.to_owned()))
                .bind(room_id)
                .execute(tx.raw_for_tests())
                .await
                .expect("drop the test room");
        }
        tx.commit().await.expect("commit");
    }

    /// One privileged `count(*)` fixture assertion, bound to a uuid given as text.
    ///
    /// Currently used only to inspect append-only `audit_log`; the production role cannot
    /// read, modify, or delete that table after migration 0006.
    pub async fn scalar(&self, sql: &str, id: &str) -> i64 {
        let id: Uuid = id.parse().expect("a uuid");
        sqlx::query_scalar(sqlx::AssertSqlSafe(sql.to_owned()))
            .bind(id)
            .fetch_one(&self.admin)
            .await
            .expect("admin audit scalar")
    }
}

// ── Scratch databases ───────────────────────────────────────────────────────
//
// Shared because `tests/migrations.rs` and `tests/provision.rs` both need a database of their
// own: one applies DDL, the other creates an *enterprise*, which is the single row in the schema
// that is not tenant-scoped and so cannot be cleaned up behind an RLS policy.
//
// Each integration test file compiles as its own crate, so this cannot live in one of them.

/// Prefix for every scratch database, so [`Scratch::sweep`] can recognise its own litter and
/// nothing else.
const SCRATCH_PREFIX: &str = "tradingroom_migrate_test_";

/// Eight hex characters identifying THIS test process, embedded in every name it creates.
///
/// ── THE RACE THIS CLOSES, REPRODUCED RATHER THAN REASONED ────────────────────────────────────
///
/// [`Scratch::sweep`] argued its own safety like this: *"a database another test is using right now
/// still has a backend attached, so its `DROP` fails and it is left alone."* That is true only once
/// a backend has attached. Between [`Scratch::create`]'s `CREATE DATABASE` and the first
/// [`Scratch::pool`] there is none, and every other test's `create` sweeps in that window.
///
/// It is not theoretical. Adding a third concurrent `Scratch::create` to
/// `migration_reappliability.rs` made it fail on two consecutive runs:
///
/// ```text
/// connect to the scratch database: database "tradingroom_migrate_test_7be62f0e…" does not exist
/// detail: It seems to have just been dropped or renamed.
/// ```
///
/// So sweeping is scoped by process instead of by liveness. Litter from an earlier `cargo test`
/// carries a different token and is still collected, which is the whole point of the sweep; a
/// sibling thread's half-created database carries THIS token and is left alone, which is the bug.
///
/// Cross-process concurrency — two `cargo test` invocations against one cluster at the same moment —
/// is deliberately not covered. It is not how this suite is run, and covering it would need a
/// registry the harness has no way to clean up after a panic.
static SCRATCH_PROCESS_TOKEN: std::sync::OnceLock<String> = std::sync::OnceLock::new();

fn scratch_process_token() -> &'static str {
    SCRATCH_PROCESS_TOKEN.get_or_init(|| Uuid::new_v4().simple().to_string()[..8].to_owned())
}

pub fn scratch_url(base: &str, database: &str) -> String {
    let (prefix, _) = base.rsplit_once('/').expect("a database name in the url");
    format!("{prefix}/{database}")
}

/// A throwaway database, dropped on `finish`.
///
/// Not a `Drop` impl: dropping a database is `async`, and a blocking drop inside an async
/// runtime is how a test suite deadlocks. An explicit `finish()` is less elegant and
/// actually works.
///
/// The cost of that choice is that a **panicking** test never reaches `finish()` and leaves
/// its database behind - observed, not theorised. [`Scratch::sweep`] makes that self-healing
/// instead of a slow leak somebody notices months later.
pub struct Scratch {
    /// Read by tests that build a second connection string to the same scratch database.
    pub name: String,
    url: String,
    admin: String,
}

impl Scratch {
    pub async fn create() -> Self {
        let admin = owner_url();
        // `{prefix}{process token}_{unique}` - 25 + 8 + 1 + 32 = 66 characters would exceed
        // PostgreSQL's 63-byte identifier limit, so the unique half is truncated to 24.
        let unique = Uuid::new_v4().simple().to_string();
        let name = format!(
            "{SCRATCH_PREFIX}{}_{}",
            scratch_process_token(),
            &unique[..24]
        );

        let mut conn = PgConnection::connect(&admin)
            .await
            .expect("the owner should be able to connect");

        Self::sweep(&mut conn).await;

        conn.execute(sqlx::AssertSqlSafe(format!(r#"CREATE DATABASE "{name}""#)))
            .await
            .expect("the owner should be able to create a scratch database");
        conn.close().await.ok();

        let url = scratch_url(&admin, &name);
        Self { name, url, admin }
    }

    /// Drops scratch databases abandoned by an earlier panicking run.
    ///
    /// Deliberately **without** `WITH (FORCE)` and ignoring every failure: a database another
    /// test is using right now still has a backend attached, so its `DROP` fails and it is
    /// left alone.
    ///
    /// That argument is necessary and NOT sufficient, which cost two red runs to learn: between a
    /// sibling's `CREATE DATABASE` and its first connection no backend is attached yet, so liveness
    /// alone does not protect it. The `NOT LIKE` below excludes every name this process created, so
    /// a sweep can only ever collect another run's litter. See [`SCRATCH_PROCESS_TOKEN`].
    async fn sweep(conn: &mut PgConnection) {
        let abandoned: Vec<String> = sqlx::query_scalar(
            "SELECT datname FROM pg_database \
             WHERE datname LIKE $1 || '%' AND datname NOT LIKE $1 || $2 || '%'",
        )
        .bind(SCRATCH_PREFIX)
        .bind(scratch_process_token())
        .fetch_all(&mut *conn)
        .await
        .unwrap_or_default();

        for database in abandoned {
            let _ = conn
                .execute(sqlx::AssertSqlSafe(format!(
                    r#"DROP DATABASE IF EXISTS "{database}""#
                )))
                .await;
        }
    }

    pub async fn pool(&self) -> PgPool {
        PgPool::connect(&self.url)
            .await
            .expect("connect to the scratch database")
    }

    pub async fn finish(self, pool: PgPool) {
        // Every connection must be gone before the database can be dropped.
        pool.close().await;

        let mut conn = PgConnection::connect(&self.admin)
            .await
            .expect("connect to drop the scratch database");
        conn.execute(sqlx::AssertSqlSafe(format!(
            r#"DROP DATABASE IF EXISTS "{}" WITH (FORCE)"#,
            self.name
        )))
        .await
        .expect("drop the scratch database");
        conn.close().await.ok();
    }
}
