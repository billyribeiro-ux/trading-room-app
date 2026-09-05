//! The tenancy kernel.
//!
//! Every tenant-scoped table in this schema is `ENABLE` + `FORCE ROW LEVEL SECURITY`, and
//! the runtime role is a membership-free `NOSUPERUSER NOBYPASSRLS NOINHERIT` login. The
//! policies compare `enterprise_id` against a session GUC:
//!
//! ```sql
//! enterprise_id = NULLIF(current_setting('app.enterprise_id', true), '')::uuid
//! ```
//!
//! An unset GUC yields `NULL`, and `enterprise_id = NULL` is never true, so a connection
//! that forgets to set it sees **zero rows**. Fail-closed by construction - but also
//! silent, which is why this module exists: forgetting must be impossible, not merely
//! discouraged.
//!
//! The guarantee is structural. [`TenantTx`] wraps a transaction whose GUCs have already
//! been set, its inner handle is private, and every repository function takes
//! `&mut TenantTx`. There is no repository overload that accepts a pool. Four independent
//! fences have to fail before a cross-tenant read is possible:
//!
//! 1. repositories only accept `&mut TenantTx`;
//! 2. `TenantTx::conn` is `pub(crate)`, so nothing outside `db` reaches the connection;
//! 3. `Db`'s pool field is private, so no other module can start an un-scoped transaction;
//! 4. the database itself, which returns nothing without the GUC.

pub mod error;
pub mod migrate;
pub mod repo;

use std::time::Duration;

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{ConnectOptions, Executor, PgPool, Postgres, Transaction};
use uuid::Uuid;

pub use error::DbError;

const EXPECTED_RUNTIME_ROLE: &str = "tradingroom_app";

/// Who is asking. Constructed by the auth layer, never by a handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TenantCtx {
    pub enterprise_id: Uuid,
    /// `None` is *server context*: the GUC is set to the empty string, which the
    /// `private_messages` policy recognises as "apply the tenant check only". Reserved for
    /// the auth bootstrap, the admin plane and background jobs - and greppable as such.
    pub member_id: Option<Uuid>,
}

impl TenantCtx {
    pub fn member(enterprise_id: Uuid, member_id: Uuid) -> Self {
        Self {
            enterprise_id,
            member_id: Some(member_id),
        }
    }

    pub fn server(enterprise_id: Uuid) -> Self {
        Self {
            enterprise_id,
            member_id: None,
        }
    }
}

/// A transaction whose tenant GUCs are provably set.
///
/// Field order is drop order: `tx` rolls back if this is dropped without `commit`.
pub struct TenantTx<'p> {
    tx: Transaction<'p, Postgres>,
    ctx: TenantCtx,
}

impl<'p> TenantTx<'p> {
    /// Visible to `db::repo::*` only. Handlers cannot reach the raw connection, so they
    /// cannot issue un-scoped SQL on a tenant-bearing transaction.
    ///
    /// The `#[expect(dead_code)]` this used to carry has been removed rather than relaxed:
    /// `db::repo::membership` is the first caller, so the attribute had done its job and
    /// would itself have become an error.
    pub(crate) fn conn(&mut self) -> &mut sqlx::PgConnection {
        &mut self.tx
    }

    pub fn ctx(&self) -> TenantCtx {
        self.ctx
    }

    /// Raw connection access for integration tests only.
    ///
    /// Behind the `testing` feature so it does not exist in a production build - the
    /// point of this type is that handlers *cannot* reach the connection. Tests need it
    /// to prove what the database does with arbitrary SQL under a tenant GUC.
    #[cfg(feature = "testing")]
    pub fn raw_for_tests(&mut self) -> &mut sqlx::PgConnection {
        &mut self.tx
    }

    pub async fn commit(self) -> Result<(), DbError> {
        self.tx.commit().await.map_err(DbError::from)
    }
}

/// Per-connection session guards.
///
/// Spelled with literals because `Executor::execute` ties the statement's lifetime to the
/// connection borrow, so a `format!`-built `String` cannot be used here. The literals are
/// pinned to [`crate::limits`] by `session_setup_matches_the_documented_limits`, so there
/// is still one source of truth and drift is a test failure rather than a surprise.
const SESSION_SETUP_SQL: &str = "SET statement_timeout = 5000; \
     SET lock_timeout = 2000; \
     SET idle_in_transaction_session_timeout = 10000;";

/// Exact effective ACL contract installed by migration 0006 and extended by migration 0013.
///
/// `has_*_privilege` evaluates direct, membership-derived and `PUBLIC` grants together.
/// Memberships are independently forbidden, but checking effective privileges keeps a future
/// accidental `PUBLIC` grant from bypassing this boundary. Relation-wide privileges are denied
/// separately because a table grant masks narrower column revocations.
const RUNTIME_OBJECT_PRIVILEGES_SQL: &str = r#"
WITH protected_columns AS (
    SELECT class.relname::text AS table_name, attribute.attname::text AS column_name
    FROM pg_catalog.pg_class AS class
    INNER JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = class.relnamespace
    INNER JOIN pg_catalog.pg_attribute AS attribute
        ON attribute.attrelid = class.oid
    WHERE namespace.nspname = 'public'
      AND class.relname = ANY (ARRAY['enterprises', 'users', 'audit_log'])
      AND attribute.attnum > 0
      AND NOT attribute.attisdropped
),
allowed_columns(table_name, column_name, privilege_type) AS (
    VALUES
        ('enterprises', 'id', 'SELECT'),
        ('users', 'id', 'SELECT'),
        ('users', 'email', 'SELECT'),
        ('users', 'password_hash', 'SELECT'),
        ('users', 'display_name', 'SELECT'),
        ('users', 'is_platform_admin', 'SELECT'),
        ('users', 'preferences', 'SELECT'),
        ('users', 'is_guest', 'SELECT'),
        ('users', 'last_login_at', 'SELECT'),
        ('users', 'email', 'INSERT'),
        ('users', 'email_hash', 'INSERT'),
        ('users', 'display_name', 'INSERT'),
        ('users', 'is_guest', 'INSERT'),
        ('users', 'guest_created_in_room_id', 'INSERT'),
        ('users', 'password_hash', 'UPDATE'),
        ('users', 'display_name', 'UPDATE'),
        ('users', 'last_login_at', 'UPDATE'),
        ('users', 'updated_at', 'UPDATE'),
        ('users', 'preferences', 'UPDATE'),
        ('audit_log', 'enterprise_id', 'INSERT'),
        ('audit_log', 'room_id', 'INSERT'),
        ('audit_log', 'actor_user_id', 'INSERT'),
        ('audit_log', 'actor_name', 'INSERT'),
        ('audit_log', 'event_name', 'INSERT'),
        ('audit_log', 'event_detail', 'INSERT'),
        ('audit_log', 'target_type', 'INSERT'),
        ('audit_log', 'target_id', 'INSERT'),
        ('audit_log', 'metadata', 'INSERT')
),
column_privilege_types(privilege_type) AS (
    SELECT unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'])
),
table_privilege_types(privilege_type) AS (
    -- MAINTAIN exists from PostgreSQL 17 (VACUUM, ANALYZE, REINDEX, CLUSTER, REFRESH).
    -- `has_table_privilege` RAISES `22023 unrecognized privilege type` on a name the server does
    -- not know, so naming it unconditionally makes this whole check ERROR on 16 rather than answer
    -- -- and this check gates the API binding to the database, so the API refused to start with
    -- "unrecognized privilege type: MAINTAIN" instead of anything about its runtime role. Measured
    -- on PostgreSQL 16.13 on 2026-08-31, through this exact function.
    --
    -- The version gate is NOT a relaxation, and that is the whole reason it is safe: below 17 the
    -- privilege does not exist, so it cannot be granted, so a role cannot hold it. There is nothing
    -- for the omitted row to have caught. `services/compose.yml` pins `postgres:17`, where the
    -- second arm is always taken and this check is exactly what it was.
    SELECT unnest(ARRAY[
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ])
    UNION ALL
    SELECT 'MAINTAIN' WHERE current_setting('server_version_num')::int >= 170000
)
SELECT
    NOT EXISTS (
        SELECT 1
        FROM protected_columns AS protected
        CROSS JOIN column_privilege_types AS privilege
        WHERE has_column_privilege(
            session_user,
            format('public.%I', protected.table_name),
            protected.column_name,
            privilege.privilege_type
        ) <> EXISTS (
            SELECT 1
            FROM allowed_columns AS allowed
            WHERE allowed.table_name = protected.table_name
              AND allowed.column_name = protected.column_name
              AND allowed.privilege_type = privilege.privilege_type
        )
    )
    AND NOT EXISTS (
        SELECT 1
        FROM (VALUES ('enterprises'), ('users'), ('audit_log')) AS protected(table_name)
        CROSS JOIN table_privilege_types AS privilege
        WHERE has_table_privilege(
            session_user,
            format('public.%I', protected.table_name),
            privilege.privilege_type
        )
    )
"#;

#[derive(Clone)]
pub struct Db {
    pool: PgPool,
}

/// Cluster-wide attributes that can expand a login role beyond its direct grants.
///
/// Kept as data so every rejection branch can be unit-tested without mutating a PostgreSQL
/// cluster's global role catalog. `membership_count` is the number of direct memberships;
/// every indirect membership path necessarily begins with one of those direct edges.
#[derive(Debug, Clone, PartialEq, Eq, sqlx::FromRow)]
struct RuntimeRolePosture {
    /// PostgreSQL 17's immutable authentication-cycle identity, represented as
    /// `auth_method:identity`. Unlike `session_user`, a superuser cannot rewrite this with
    /// `SET SESSION AUTHORIZATION`.
    system_user: Option<String>,
    session_role: String,
    current_role: String,
    can_login: bool,
    is_superuser: bool,
    can_create_database: bool,
    can_create_role: bool,
    inherits: bool,
    can_replicate: bool,
    bypasses_rls: bool,
    membership_count: i64,
}

fn validate_runtime_role_posture(posture: &RuntimeRolePosture) -> Result<(), DbError> {
    let reject = |reason| DbError::UnsafeRuntimeRole {
        role: posture.session_role.clone(),
        reason,
    };

    let authenticated_as_runtime = posture
        .system_user
        .as_deref()
        .and_then(|system_user| system_user.split_once(':'))
        .is_some_and(|(method, identity)| !method.is_empty() && identity == EXPECTED_RUNTIME_ROLE);
    if !authenticated_as_runtime {
        return Err(reject(
            "authentication-cycle identity does not match runtime role",
        ));
    }
    if posture.session_role != EXPECTED_RUNTIME_ROLE {
        return Err(reject("unexpected authenticated role"));
    }
    if posture.current_role != posture.session_role {
        return Err(reject(
            "current role differs from authenticated session role",
        ));
    }
    if !posture.can_login {
        return Err(reject("LOGIN is required for the runtime role"));
    }
    if posture.is_superuser {
        return Err(reject("SUPERUSER bypasses row-level security"));
    }
    if posture.bypasses_rls {
        return Err(reject("BYPASSRLS disables row-level security"));
    }
    if posture.can_create_database {
        return Err(reject("CREATEDB exceeds the runtime boundary"));
    }
    if posture.can_create_role {
        return Err(reject("CREATEROLE exceeds the runtime boundary"));
    }
    if posture.can_replicate {
        return Err(reject("REPLICATION exceeds the runtime boundary"));
    }
    if posture.inherits {
        return Err(reject("INHERIT permits privilege expansion"));
    }
    if posture.membership_count != 0 {
        return Err(reject("has role memberships"));
    }

    Ok(())
}

fn pool_options(max_connections: u32, acquire_timeout: Duration) -> PgPoolOptions {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .acquire_timeout(acquire_timeout)
        // Applied per connection rather than per transaction so a query cannot escape
        // them by forgetting to opt in.
        .after_connect(|conn, _meta| {
            Box::pin(async move {
                conn.execute(SESSION_SETUP_SQL).await?;
                Ok(())
            })
        })
}

impl Db {
    pub async fn connect(
        database_url: &str,
        max_connections: u32,
        acquire_timeout: Duration,
    ) -> Result<Self, DbError> {
        let options: PgConnectOptions = database_url
            .parse::<PgConnectOptions>()
            .map_err(DbError::from)?
            // sqlx logs every statement at INFO by default, which at production volume is
            // both noise and a way to leak parameter values into logs.
            .log_statements(tracing::log::LevelFilter::Debug)
            // Shows up in pg_stat_activity, so a DBA can attribute a long-running query
            // or a connection leak to this service rather than to "some client".
            .application_name("tradingroom-api");

        let pool = pool_options(max_connections, acquire_timeout)
            .connect_with(options)
            .await
            .map_err(DbError::from)?;

        Ok(Self { pool })
    }

    /// Refuse to start unless the authenticated role has the exact restricted posture.
    ///
    /// PostgreSQL superusers and `BYPASSRLS` roles ignore RLS. Role memberships are also a
    /// privilege path: `INHERIT` can activate them automatically, while a membership whose
    /// `SET` option is true can be selected with `SET ROLE` even when the login is
    /// `NOINHERIT`. This service has no legitimate runtime memberships, so rejecting every
    /// direct membership is both narrower and easier to audit than reasoning about every
    /// membership option and transitive path.
    ///
    /// PostgreSQL 17's `system_user` retains the authentication method and identity presented
    /// before a database role was assigned. The query requires that immutable identity,
    /// `session_user`, and `current_user` all resolve to the runtime role. A superuser using
    /// `SET SESSION AUTHORIZATION`, or a login-time default `SET ROLE`, therefore cannot make
    /// the validator inspect a safer identity than the one that actually connected. Checked
    /// before the listener binds, in the spirit of `tradingroom-media`'s startup ordering.
    pub async fn assert_runtime_role_is_restricted(&self) -> Result<(), DbError> {
        let posture: RuntimeRolePosture = sqlx::query_as(
            "SELECT system_user AS system_user, \
                    session_user::text AS session_role, \
                    current_user::text AS current_role, \
                    runtime_role.rolcanlogin AS can_login, \
                    runtime_role.rolsuper AS is_superuser, \
                    runtime_role.rolcreatedb AS can_create_database, \
                    runtime_role.rolcreaterole AS can_create_role, \
                    runtime_role.rolinherit AS inherits, \
                    runtime_role.rolreplication AS can_replicate, \
                    runtime_role.rolbypassrls AS bypasses_rls, \
                    (SELECT count(*) \
                     FROM pg_catalog.pg_auth_members AS membership \
                     WHERE membership.member = runtime_role.oid)::bigint AS membership_count \
             FROM pg_catalog.pg_roles AS runtime_role \
             WHERE runtime_role.rolname = session_user",
        )
        .fetch_one(&self.pool)
        .await
        .map_err(DbError::from)?;
        validate_runtime_role_posture(&posture)?;

        let object_privileges_match: bool = sqlx::query_scalar(RUNTIME_OBJECT_PRIVILEGES_SQL)
            .fetch_one(&self.pool)
            .await
            .map_err(DbError::from)?;
        if !object_privileges_match {
            return Err(DbError::UnsafeRuntimeRole {
                role: posture.session_role,
                reason: "object privileges do not match the reviewed runtime SQL surface",
            });
        }

        tracing::info!(role = %posture.session_role, "runtime role verified: restricted posture, least-privilege object ACLs, and row-level security apply");
        Ok(())
    }

    /// The only way to obtain a [`TenantTx`].
    ///
    /// `set_config(name, value, true)` is the parameterised twin of `SET LOCAL`. `SET` is a
    /// utility statement and the extended protocol will not bind parameters into one, so
    /// the alternatives were string-interpolating a tenant id - an injection site on the
    /// single most security-critical value in the system - or this. There is no trade-off
    /// being made here; `set_config` is simply the correct tool.
    ///
    /// The transaction is not incidental: `set_config(.., true)` is transaction-scoped, so
    /// under autocommit the setting would vanish before the next statement ran. A pleasant
    /// consequence is that a connection returned to the pool carries no tenant state, so
    /// no reset hook is needed.
    pub async fn begin_tenant(&self, ctx: TenantCtx) -> Result<TenantTx<'static>, DbError> {
        let mut tx = self.pool.begin().await.map_err(DbError::from)?;

        sqlx::query(
            "SELECT set_config('app.enterprise_id', $1, true), \
                    set_config('app.member_id', $2, true)",
        )
        .bind(ctx.enterprise_id.to_string())
        .bind(ctx.member_id.map(|id| id.to_string()).unwrap_or_default())
        .execute(&mut *tx)
        .await
        .map_err(DbError::from)?;

        Ok(TenantTx { tx, ctx })
    }

    /// Non-RLS tables (`users`, `enterprises`, `refresh_tokens`) reached through one narrow
    /// door, so that "isolation enforced in application code" is a single reviewable
    /// surface rather than a habit spread across the codebase.
    pub fn identity(&self) -> IdentityDb<'_> {
        IdentityDb(&self.pool)
    }

    /// Integration-test access to the identity pool, for asserting what was actually
    /// written to the non-RLS tables. Behind the `testing` feature; absent in production.
    #[cfg(feature = "testing")]
    pub fn identity_pool_for_tests(&self) -> &PgPool {
        &self.pool
    }

    /// Every tenant id.
    ///
    /// `enterprises` carries no `enterprise_id` of its own and has no RLS, which is what makes
    /// this readable at all - a background job has no member to act as. Used only by the
    /// pruner, which must sweep each tenant under its own GUC.
    pub async fn enterprise_ids(&self) -> Result<Vec<Uuid>, DbError> {
        sqlx::query_scalar("SELECT id FROM enterprises")
            .fetch_all(&self.pool)
            .await
            .map_err(DbError::from)
    }

    /// Pool saturation, for `/metrics`. `size - idle` climbing to `size` is what explains a
    /// latency spike nothing else accounts for: requests queueing on `acquire`.
    #[must_use]
    pub fn pool_size(&self) -> u32 {
        self.pool.size()
    }

    #[must_use]
    pub fn pool_idle(&self) -> usize {
        self.pool.num_idle()
    }

    /// The pool, for `db::repo::identity` - the three tables with no `enterprise_id` and no
    /// RLS. `pub(crate)`, so "isolation enforced in application code" stays confined to one
    /// reviewable module rather than becoming a way for a handler to reach an un-scoped
    /// connection.
    pub(crate) fn identity_pool(&self) -> &PgPool {
        &self.pool
    }

    /// The pool, for `sqlx::postgres::PgListener::connect_with` only.
    ///
    /// `pub(crate)` rather than `pub`, so this does not become a way for a handler to reach an
    /// un-scoped connection - fence #3 of the tenancy kernel stays intact. A listener is the
    /// one legitimate consumer: `LISTEN` cannot run inside a transaction, so it cannot go
    /// through `begin_tenant`, and it reads no tenant data (the notification payload is a
    /// pointer; the row itself is re-read through a real `TenantTx`).
    pub(crate) fn pool_for_listener(&self) -> &PgPool {
        &self.pool
    }

    pub async fn ping(&self, timeout: Duration) -> Result<(), DbError> {
        tokio::time::timeout(timeout, sqlx::query("SELECT 1").execute(&self.pool))
            .await
            .map_err(|_| DbError::Unavailable("readiness probe timed out".into()))?
            .map_err(DbError::from)?;
        Ok(())
    }

    pub async fn close(&self) {
        self.pool.close().await;
    }
}

/// The `SECURITY DEFINER` resolvers exist to break a chicken-and-egg: the tenant id
/// itself lives in a tenant-scoped table. They run as the owner with a pinned
/// `search_path`, so they are called on a plain pooled connection with no GUC set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedMembership {
    pub enterprise_id: Uuid,
    pub member_id: Uuid,
    pub member_role: String,
}

impl Db {
    pub async fn resolve_membership(
        &self,
        user_id: Uuid,
        room_id: Uuid,
    ) -> Result<Option<ResolvedMembership>, DbError> {
        let row: Option<(Uuid, Uuid, String)> = sqlx::query_as(
            "SELECT enterprise_id, member_id, member_role FROM auth_resolve_membership($1, $2)",
        )
        .bind(user_id)
        .bind(room_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(DbError::from)?;

        Ok(row.map(
            |(enterprise_id, member_id, member_role)| ResolvedMembership {
                enterprise_id,
                member_id,
                member_role,
            },
        ))
    }

    /// Every room this user belongs to.
    ///
    /// The fourth `SECURITY DEFINER` resolver (migration `0004`), and it exists for the same
    /// reason as the three in the baseline: the tenant id lives in a tenant-scoped table, so a
    /// request that knows only who is signed in cannot set the GUC it needs to look anything
    /// up. Runs on a plain pooled connection, before any `TenantTx`.
    pub async fn list_memberships(&self, user_id: Uuid) -> Result<Vec<Membership>, DbError> {
        sqlx::query_as(
            "SELECT enterprise_id, room_id, room_name, room_state, member_id, member_role \
             FROM auth_list_memberships($1)",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(DbError::from)
    }

    /// Every enterprise this user explicitly administers.
    ///
    /// Account authority is not derived from room membership: a room role applies to one room,
    /// while this resolver returns the canonical owner/admin relationship even when an account has
    /// no rooms. Like `list_memberships`, it is bounded to the authenticated user before a tenant
    /// GUC is available.
    pub async fn list_enterprise_memberships(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<EnterpriseMembership>, DbError> {
        sqlx::query_as(
            "SELECT enterprise_id, enterprise_name, enterprise_slug, account_role \
             FROM auth_list_enterprise_memberships($1)",
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(DbError::from)
    }

    /// Resolves an invite token hash to its tenant, room and invite id.
    ///
    /// The third of the baseline's `SECURITY DEFINER` resolvers. Takes the **hash**, never the
    /// token: the raw value is a bearer credential and has no reason to reach the database.
    pub async fn locate_invite_tenant(
        &self,
        token_hash: &str,
    ) -> Result<Option<LocatedInvite>, DbError> {
        sqlx::query_as(
            "SELECT enterprise_id, room_id, invite_id FROM auth_locate_invite_tenant($1)",
        )
        .bind(token_hash)
        .fetch_optional(&self.pool)
        .await
        .map_err(DbError::from)
    }

    pub async fn locate_room_tenant(
        &self,
        room_id: Uuid,
    ) -> Result<Option<(Uuid, String)>, DbError> {
        sqlx::query_as("SELECT enterprise_id, room_state FROM auth_locate_room_tenant($1)")
            .bind(room_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(DbError::from)
    }
}

/// Where an invite token points, before any tenant GUC is set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::FromRow)]
pub struct LocatedInvite {
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub invite_id: Uuid,
}

/// One room the caller belongs to, as the room list renders it.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Membership {
    #[serde(skip)]
    pub enterprise_id: Uuid,
    pub room_id: Uuid,
    pub room_name: String,
    pub room_state: String,
    pub member_id: Uuid,
    pub member_role: String,
}

/// One canonical enterprise owner/admin relationship for account bootstrap.
#[derive(Debug, Clone, PartialEq, Eq, sqlx::FromRow)]
pub struct EnterpriseMembership {
    pub enterprise_id: Uuid,
    pub enterprise_name: String,
    pub enterprise_slug: String,
    pub account_role: String,
}

/// Narrow handle for the three tables that carry no `enterprise_id` and therefore no RLS.
#[derive(Clone, Copy)]
pub struct IdentityDb<'p>(&'p PgPool);

impl<'p> IdentityDb<'p> {
    pub(crate) fn pool(&self) -> &'p PgPool {
        self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::limits;

    type PostureMutation = (&'static str, fn(&mut RuntimeRolePosture));

    fn restricted_posture() -> RuntimeRolePosture {
        RuntimeRolePosture {
            // Built from the constant, not a literal: these fixtures describe THE runtime role,
            // so they must follow it through any rename rather than pinning a name that the
            // deployment no longer authenticates as.
            system_user: Some(format!("scram-sha-256:{EXPECTED_RUNTIME_ROLE}")),
            session_role: EXPECTED_RUNTIME_ROLE.into(),
            current_role: EXPECTED_RUNTIME_ROLE.into(),
            can_login: true,
            is_superuser: false,
            can_create_database: false,
            can_create_role: false,
            inherits: false,
            can_replicate: false,
            bypasses_rls: false,
            membership_count: 0,
        }
    }

    fn assert_posture_rejected(posture: RuntimeRolePosture, expected_reason: &'static str) {
        match validate_runtime_role_posture(&posture) {
            Err(DbError::UnsafeRuntimeRole { role, reason }) => {
                assert_eq!(role, EXPECTED_RUNTIME_ROLE);
                assert_eq!(reason, expected_reason);
            }
            other => panic!("expected an unsafe runtime-role error, got {other:?}"),
        }
    }

    #[test]
    fn session_setup_matches_the_documented_limits() {
        // SESSION_SETUP_SQL must use literals (lifetime constraint on Executor::execute),
        // so this is what stops it drifting from the constants that explain the values.
        for (label, expected) in [
            ("statement_timeout", limits::DB_STATEMENT_TIMEOUT_MS),
            ("lock_timeout", limits::DB_LOCK_TIMEOUT_MS),
            (
                "idle_in_transaction_session_timeout",
                limits::DB_IDLE_IN_TX_TIMEOUT_MS,
            ),
        ] {
            let needle = format!("SET {label} = {expected};");
            assert!(
                SESSION_SETUP_SQL.contains(&needle),
                "SESSION_SETUP_SQL is missing `{needle}`; it reads: {SESSION_SETUP_SQL}"
            );
        }
    }

    #[test]
    fn pool_options_use_the_configured_acquire_timeout() {
        let configured = Duration::from_millis(137);
        let options = pool_options(3, configured);

        assert_eq!(options.get_acquire_timeout(), configured);
    }

    #[test]
    fn server_context_sends_an_empty_member_id() {
        // The pm_participant_only policy treats '' as "tenant check only". A literal
        // "None" or "null" string would silently match no member and hide every PM.
        let ctx = TenantCtx::server(Uuid::nil());
        assert_eq!(ctx.member_id, None);
    }

    #[test]
    fn the_restricted_runtime_role_posture_is_accepted() {
        validate_runtime_role_posture(&restricted_posture())
            .expect("the provisioned runtime-role posture must be accepted");
    }

    #[test]
    fn the_immutable_authentication_identity_is_required_and_parsed_exactly() {
        for system_user in [
            None,
            Some(EXPECTED_RUNTIME_ROLE),
            Some(":ptr_clone_app"),
            Some("scram-sha-256:ptr_clone"),
            Some(concat!(
                "scram-sha-256:",
                "tradingroom_app",
                ":forged-suffix"
            )),
        ] {
            let mut posture = restricted_posture();
            posture.system_user = system_user.map(str::to_owned);
            assert_posture_rejected(
                posture,
                "authentication-cycle identity does not match runtime role",
            );
        }
    }

    #[test]
    fn every_privilege_expansion_path_is_rejected() {
        let mut posture = restricted_posture();
        posture.session_role = "unexpected_role".into();
        posture.current_role = "unexpected_role".into();
        match validate_runtime_role_posture(&posture) {
            Err(DbError::UnsafeRuntimeRole { role, reason }) => {
                assert_eq!(role, "unexpected_role");
                assert_eq!(reason, "unexpected authenticated role");
            }
            other => panic!("expected an unsafe runtime-role error, got {other:?}"),
        }

        let mut posture = restricted_posture();
        posture.current_role = "another_role".into();
        assert_posture_rejected(
            posture,
            "current role differs from authenticated session role",
        );

        let cases: [PostureMutation; 8] = [
            (
                "LOGIN is required for the runtime role",
                |p: &mut RuntimeRolePosture| p.can_login = false,
            ),
            (
                "SUPERUSER bypasses row-level security",
                |p: &mut RuntimeRolePosture| p.is_superuser = true,
            ),
            (
                "BYPASSRLS disables row-level security",
                |p: &mut RuntimeRolePosture| p.bypasses_rls = true,
            ),
            (
                "CREATEDB exceeds the runtime boundary",
                |p: &mut RuntimeRolePosture| p.can_create_database = true,
            ),
            (
                "CREATEROLE exceeds the runtime boundary",
                |p: &mut RuntimeRolePosture| p.can_create_role = true,
            ),
            (
                "REPLICATION exceeds the runtime boundary",
                |p: &mut RuntimeRolePosture| p.can_replicate = true,
            ),
            (
                "INHERIT permits privilege expansion",
                |p: &mut RuntimeRolePosture| p.inherits = true,
            ),
            ("has role memberships", |p: &mut RuntimeRolePosture| {
                p.membership_count = 1
            }),
        ];

        for (expected_reason, mutate) in cases {
            let mut posture = restricted_posture();
            mutate(&mut posture);
            assert_posture_rejected(posture, expected_reason);
        }
    }
}
