//! Deterministic, redacted PostgreSQL release attestation.
//!
//! This one-shot binary inspects a target through both repository-defined database identities:
//! the migration owner in `MIGRATE_DATABASE_URL` and the runtime login in `DATABASE_URL`. The
//! URLs are environment-only inputs and never enter evidence or errors. Catalog inspection runs
//! in read-only repeatable-read transactions. The only operation outside those transactions is a
//! session-local `LISTEN`/`UNLISTEN` probe, which proves that the runtime endpoint retains the
//! session state required by the realtime relay. The owner and runtime endpoints are bound to the
//! same PostgreSQL cluster with `pg_control_system()`, and LISTEN support is proven with an actual
//! owner-to-runtime notification round trip. Cluster identifiers and probe nonces never enter the
//! emitted evidence or errors.

use std::env;
use std::fmt::{self, Write as _};
use std::io::{self, Write as _};
use std::str::FromStr;
use std::time::Duration;

use serde::Serialize;
use sqlx::postgres::{PgConnectOptions, PgListener};
use sqlx::{ConnectOptions, Connection, Executor, FromRow, PgConnection};
use tokio::time::timeout;
use tracing::log::LevelFilter;
use tradingroom_api::db::migrate::{
    EXPECTED_MIGRATOR_ROLE, EXPECTED_RUNTIME_ROLE, MIGRATOR, RENAMED_RUNTIME_ROLE,
};
use uuid::Uuid;

const ATTESTATION_VERSION: u32 = 1;
const REQUIRED_POSTGRES_MAJOR: i32 = 17;
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const LISTEN_ROUND_TRIP_TIMEOUT: Duration = Duration::from_secs(5);
const APPLICATION_NAME: &str = "tradingroom-postgres-release-attestation";
const LISTEN_CHANNEL_PREFIX: &str = "tradingroom_attestation_";
const REDACTED_AUTH_METHOD: &str = "[redacted]";
const CONNECTION_IDENTITY_QUERY: &str = "SELECT current_setting('server_version_num')::integer AS server_version_num, \
            current_database()::text AS database_name, \
            (pg_catalog.pg_control_system()).system_identifier::text AS system_identifier, \
            system_user::text AS system_identity, \
            session_user::text AS session_role, \
            current_user::text AS current_role";

const EXPECTED_POLICY_EXPRESSION: &str =
    "(enterprise_id = (NULLIF(current_setting('app.enterprise_id'::text, true), ''::text))::uuid)";

const TABLE_PRIVILEGE_TYPES: &[&str] = &[
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
    "MAINTAIN",
];
const COLUMN_PRIVILEGE_TYPES: &[&str] = &["SELECT", "INSERT", "UPDATE", "REFERENCES"];

const ENTERPRISE_COLUMNS: &[&str] = &["id", "name", "slug", "settings", "created_at", "updated_at"];
const USER_COLUMNS: &[&str] = &[
    "id",
    "email",
    "email_hash",
    "password_hash",
    "display_name",
    "avatar_url",
    "phone",
    "discord_id",
    "is_platform_admin",
    "last_login_at",
    "created_at",
    "updated_at",
    "preferences",
    "is_guest",
    "guest_created_in_room_id",
];
const AUDIT_LOG_COLUMNS: &[&str] = &[
    "id",
    "enterprise_id",
    "room_id",
    "actor_user_id",
    "actor_name",
    "event_name",
    "event_detail",
    "target_type",
    "target_id",
    "metadata",
    "created_at",
    "updated_at",
];

const USER_SELECT_COLUMNS: &[&str] = &[
    "id",
    "email",
    "password_hash",
    "display_name",
    "is_platform_admin",
    "preferences",
    "is_guest",
];
const USER_INSERT_COLUMNS: &[&str] = &[
    "email",
    "email_hash",
    "display_name",
    "is_guest",
    "guest_created_in_room_id",
];
const USER_UPDATE_COLUMNS: &[&str] = &[
    "password_hash",
    "last_login_at",
    "updated_at",
    "preferences",
];
const AUDIT_LOG_INSERT_COLUMNS: &[&str] = &[
    "enterprise_id",
    "room_id",
    "actor_user_id",
    "actor_name",
    "event_name",
    "event_detail",
    "target_type",
    "target_id",
    "metadata",
];

const USAGE: &str = "usage: postgres-release-attestation [--format json|text]";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OutputFormat {
    Json,
    Text,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Command {
    Attest(OutputFormat),
    Help,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct AttestationError {
    code: &'static str,
    message: &'static str,
}

impl AttestationError {
    const fn new(code: &'static str, message: &'static str) -> Self {
        Self { code, message }
    }
}

impl fmt::Display for AttestationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for AttestationError {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct AttestationEvidence {
    attestation_version: u32,
    status: &'static str,
    postgres: PostgresEvidence,
    owner_connection: ConnectionEvidence,
    runtime_connection: ConnectionEvidence,
    owner_role: OwnerRoleEvidence,
    runtime_role: RuntimeRoleEvidence,
    migration_ledger: MigrationLedgerEvidence,
    room_events: RoomEventsEvidence,
    effective_acl: AclEvidence,
    listen_capability: ListenEvidence,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct PostgresEvidence {
    required_major: i32,
    server_version_num: i32,
    owner_and_runtime_versions_match: bool,
    owner_and_runtime_database_match: bool,
    owner_and_runtime_cluster_match: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct ConnectionEvidence {
    expected_role: String,
    system_user: RedactedSystemUserEvidence,
    session_user: String,
    current_user: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct RedactedSystemUserEvidence {
    authentication_method: &'static str,
    identity: String,
    exact_match: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct RoleFlags {
    login: bool,
    superuser: bool,
    create_database: bool,
    create_role: bool,
    inherit: bool,
    replication: bool,
    bypass_rls: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct OwnerRoleEvidence {
    name: String,
    flags: RoleFlags,
    direct_membership_count: i64,
    capability_enforcement: &'static str,
    elevated_capabilities: Vec<&'static str>,
    operator_review_required: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct RuntimeRoleEvidence {
    name: String,
    flags: RoleFlags,
    direct_membership_count: i64,
    capability_enforcement: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct MigrationLedgerEvidence {
    relation: &'static str,
    exact_repository_chain: bool,
    migrations: Vec<MigrationEvidence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct MigrationEvidence {
    version: i64,
    description: String,
    success: bool,
    checksum_sha384: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct RoomEventsEvidence {
    relation: &'static str,
    owner: String,
    row_level_security_enabled: bool,
    row_level_security_forced: bool,
    policy: PolicyEvidence,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct PolicyEvidence {
    name: String,
    permissive: String,
    command: String,
    roles: Vec<String>,
    using_expression: String,
    with_check_expression: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct AclEvidence {
    role: String,
    checked_table_privileges: Vec<&'static str>,
    checked_column_privileges: Vec<&'static str>,
    objects: Vec<ObjectAclEvidence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct ObjectAclEvidence {
    relation: String,
    table_privileges: Vec<String>,
    columns: Vec<ColumnAclEvidence>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct ColumnAclEvidence {
    name: String,
    privileges: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct ListenEvidence {
    notification_round_trip_verified: bool,
    listener_runtime_identity_verified: bool,
    listener_target_verified: bool,
    expected_channel_verified: bool,
    expected_payload_verified: bool,
    owner_sender_verified: bool,
    distinct_sender_and_listener_sessions_verified: bool,
    listener_session_retained: bool,
    cleanup_verified: bool,
    endpoint_requirement: &'static str,
}

#[derive(Debug, FromRow)]
struct ConnectionIdentityRow {
    server_version_num: i32,
    database_name: String,
    system_identifier: String,
    system_identity: Option<String>,
    session_role: String,
    current_role: String,
}

#[derive(Debug, FromRow)]
struct RoleRow {
    name: String,
    can_login: bool,
    is_superuser: bool,
    can_create_database: bool,
    can_create_role: bool,
    inherits: bool,
    can_replicate: bool,
    bypasses_rls: bool,
    membership_count: i64,
}

impl RoleRow {
    fn flags(&self) -> RoleFlags {
        RoleFlags {
            login: self.can_login,
            superuser: self.is_superuser,
            create_database: self.can_create_database,
            create_role: self.can_create_role,
            inherit: self.inherits,
            replication: self.can_replicate,
            bypass_rls: self.bypasses_rls,
        }
    }
}

#[derive(Debug, FromRow)]
struct MigrationRow {
    version: i64,
    description: String,
    success: bool,
    checksum: Vec<u8>,
}

#[derive(Debug, FromRow)]
struct RoomEventsRow {
    owner_name: String,
    rls_enabled: bool,
    rls_forced: bool,
}

#[derive(Debug, FromRow)]
struct PolicyRow {
    name: String,
    permissive: String,
    command: String,
    roles: Vec<String>,
    using_expression: Option<String>,
    with_check_expression: Option<String>,
}

#[derive(Debug, FromRow)]
struct TablePrivilegeRow {
    table_name: String,
    privilege_type: String,
    granted: bool,
}

#[derive(Debug, FromRow)]
struct ColumnPrivilegeRow {
    table_name: String,
    column_name: String,
    privilege_type: String,
    granted: bool,
}

struct OwnerSnapshot {
    identity_row: ConnectionIdentityRow,
    identity: ConnectionEvidence,
    role: OwnerRoleEvidence,
    migration_ledger: MigrationLedgerEvidence,
    room_events: RoomEventsEvidence,
}

struct RuntimeSnapshot {
    identity_row: ConnectionIdentityRow,
    identity: ConnectionEvidence,
    role: RuntimeRoleEvidence,
    effective_acl: AclEvidence,
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    match run(env::args_os()).await {
        Ok(output) => match write_stdout(&output) {
            Ok(()) => std::process::ExitCode::SUCCESS,
            Err(error) => {
                eprintln!("postgres release attestation failed: {error}");
                std::process::ExitCode::FAILURE
            }
        },
        Err(error) => {
            eprintln!("postgres release attestation failed: {error}");
            std::process::ExitCode::FAILURE
        }
    }
}

async fn run(
    arguments: impl IntoIterator<Item = std::ffi::OsString>,
) -> Result<String, AttestationError> {
    match parse_arguments(arguments)? {
        Command::Help => Ok(format!("{USAGE}\n")),
        Command::Attest(format) => {
            let evidence = collect_evidence().await?;
            render_evidence(&evidence, format)
        }
    }
}

fn parse_arguments(
    arguments: impl IntoIterator<Item = std::ffi::OsString>,
) -> Result<Command, AttestationError> {
    let mut arguments = arguments.into_iter();
    let _program = arguments.next();
    let mut format = OutputFormat::Json;
    let mut format_seen = false;
    let mut help_seen = false;

    while let Some(argument) = arguments.next() {
        if argument == "--help" || argument == "-h" {
            help_seen = true;
            continue;
        }

        if argument == "--format" {
            if format_seen {
                return Err(invalid_arguments());
            }
            let value = arguments.next().ok_or_else(invalid_arguments)?;
            format = parse_output_format(&value)?;
            format_seen = true;
            continue;
        }

        if let Some(argument) = argument.to_str()
            && let Some(value) = argument.strip_prefix("--format=")
        {
            if format_seen {
                return Err(invalid_arguments());
            }
            format = parse_output_format(std::ffi::OsStr::new(value))?;
            format_seen = true;
            continue;
        }

        // Never echo an unknown argument: an operator might have pasted a connection URL.
        return Err(invalid_arguments());
    }

    if help_seen {
        if format_seen {
            return Err(invalid_arguments());
        }
        return Ok(Command::Help);
    }

    Ok(Command::Attest(format))
}

fn parse_output_format(value: &std::ffi::OsStr) -> Result<OutputFormat, AttestationError> {
    match value.to_str() {
        Some("json") => Ok(OutputFormat::Json),
        Some("text") => Ok(OutputFormat::Text),
        _ => Err(invalid_arguments()),
    }
}

const fn invalid_arguments() -> AttestationError {
    AttestationError::new(
        "invalid_arguments",
        "accepted arguments are --format json, --format text, and --help; connection URLs must be supplied only through environment variables",
    )
}

async fn collect_evidence() -> Result<AttestationEvidence, AttestationError> {
    validate_embedded_migration_contract()?;

    let owner_url = required_url(
        "MIGRATE_DATABASE_URL",
        "missing_owner_url",
        "set MIGRATE_DATABASE_URL to the direct migration-owner connection URL",
    )?;
    let runtime_url = required_url(
        "DATABASE_URL",
        "missing_runtime_url",
        "set DATABASE_URL to the direct runtime-role connection URL",
    )?;

    let mut owner = connect(&owner_url, ConnectionKind::Owner).await?;
    let owner_snapshot = collect_owner_snapshot(&mut owner).await?;

    let mut runtime = connect(&runtime_url, ConnectionKind::Runtime).await?;
    let runtime_snapshot = collect_runtime_snapshot(&mut runtime).await?;
    let postgres =
        validate_same_target(&owner_snapshot.identity_row, &runtime_snapshot.identity_row)?;

    let listen_capability =
        prove_listen_capability(&runtime_url, &mut owner, &runtime_snapshot.identity_row).await?;
    runtime.close().await.map_err(|_| {
        AttestationError::new(
            "runtime_close_failed",
            "the runtime connection did not close cleanly",
        )
    })?;
    owner.close().await.map_err(|_| {
        AttestationError::new(
            "owner_close_failed",
            "the owner connection did not close cleanly",
        )
    })?;

    Ok(AttestationEvidence {
        attestation_version: ATTESTATION_VERSION,
        status: "pass",
        postgres,
        owner_connection: owner_snapshot.identity,
        runtime_connection: runtime_snapshot.identity,
        owner_role: owner_snapshot.role,
        runtime_role: runtime_snapshot.role,
        migration_ledger: owner_snapshot.migration_ledger,
        room_events: owner_snapshot.room_events,
        effective_acl: runtime_snapshot.effective_acl,
        listen_capability,
    })
}

fn required_url(
    variable: &'static str,
    code: &'static str,
    message: &'static str,
) -> Result<String, AttestationError> {
    env::var(variable)
        .ok()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AttestationError::new(code, message))
}

#[derive(Debug, Clone, Copy)]
enum ConnectionKind {
    Owner,
    Runtime,
}

impl ConnectionKind {
    const fn parse_error(self) -> AttestationError {
        match self {
            Self::Owner => AttestationError::new(
                "owner_url_invalid",
                "MIGRATE_DATABASE_URL is not a valid PostgreSQL connection URL",
            ),
            Self::Runtime => AttestationError::new(
                "runtime_url_invalid",
                "DATABASE_URL is not a valid PostgreSQL connection URL",
            ),
        }
    }

    const fn connect_error(self) -> AttestationError {
        match self {
            Self::Owner => AttestationError::new(
                "owner_connection_failed",
                "could not establish the migration-owner connection",
            ),
            Self::Runtime => AttestationError::new(
                "runtime_connection_failed",
                "could not establish the runtime-role connection",
            ),
        }
    }

    const fn setup_error(self) -> AttestationError {
        match self {
            Self::Owner => AttestationError::new(
                "owner_session_setup_failed",
                "could not apply bounded owner-session timeouts",
            ),
            Self::Runtime => AttestationError::new(
                "runtime_session_setup_failed",
                "could not apply bounded runtime-session timeouts",
            ),
        }
    }
}

async fn connect(url: &str, kind: ConnectionKind) -> Result<PgConnection, AttestationError> {
    let options = PgConnectOptions::from_str(url)
        .map_err(|_| kind.parse_error())?
        .application_name(APPLICATION_NAME)
        .log_statements(LevelFilter::Off);

    let mut connection = timeout(CONNECT_TIMEOUT, PgConnection::connect_with(&options))
        .await
        .map_err(|_| kind.connect_error())?
        .map_err(|_| kind.connect_error())?;

    connection
        .execute(
            "SET statement_timeout = 10000; \
             SET lock_timeout = 2000; \
             SET idle_in_transaction_session_timeout = 10000;",
        )
        .await
        .map_err(|_| kind.setup_error())?;

    Ok(connection)
}

async fn collect_owner_snapshot(
    connection: &mut PgConnection,
) -> Result<OwnerSnapshot, AttestationError> {
    let mut transaction = connection.begin().await.map_err(|_| {
        AttestationError::new(
            "owner_read_only_transaction_failed",
            "could not begin the owner read-only transaction",
        )
    })?;
    transaction
        .execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        .await
        .map_err(|_| {
            AttestationError::new(
                "owner_read_only_transaction_failed",
                "could not establish the owner read-only transaction",
            )
        })?;

    let identity_row = query_identity(&mut transaction, ConnectionKind::Owner).await?;
    let identity = validate_identity(
        &identity_row,
        EXPECTED_MIGRATOR_ROLE,
        "owner_identity_mismatch",
    )?;
    let role_row = query_current_role(&mut transaction, ConnectionKind::Owner).await?;
    let role = validate_owner_role(&role_row)?;
    let migration_ledger = query_and_validate_migrations(&mut transaction).await?;
    let room_events = query_and_validate_room_events(&mut transaction).await?;

    transaction.commit().await.map_err(|_| {
        AttestationError::new(
            "owner_read_only_commit_failed",
            "the owner read-only transaction did not close cleanly",
        )
    })?;

    Ok(OwnerSnapshot {
        identity_row,
        identity,
        role,
        migration_ledger,
        room_events,
    })
}

async fn collect_runtime_snapshot(
    connection: &mut PgConnection,
) -> Result<RuntimeSnapshot, AttestationError> {
    let mut transaction = connection.begin().await.map_err(|_| {
        AttestationError::new(
            "runtime_read_only_transaction_failed",
            "could not begin the runtime read-only transaction",
        )
    })?;
    transaction
        .execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        .await
        .map_err(|_| {
            AttestationError::new(
                "runtime_read_only_transaction_failed",
                "could not establish the runtime read-only transaction",
            )
        })?;

    let identity_row = query_identity(&mut transaction, ConnectionKind::Runtime).await?;
    let identity = validate_identity(
        &identity_row,
        EXPECTED_RUNTIME_ROLE,
        "runtime_identity_mismatch",
    )?;
    let role_row = query_current_role(&mut transaction, ConnectionKind::Runtime).await?;
    let role = validate_runtime_role(&role_row)?;
    let effective_acl = query_and_validate_acl(&mut transaction).await?;

    transaction.commit().await.map_err(|_| {
        AttestationError::new(
            "runtime_read_only_commit_failed",
            "the runtime read-only transaction did not close cleanly",
        )
    })?;

    Ok(RuntimeSnapshot {
        identity_row,
        identity,
        role,
        effective_acl,
    })
}

async fn query_identity(
    connection: &mut PgConnection,
    kind: ConnectionKind,
) -> Result<ConnectionIdentityRow, AttestationError> {
    let row: ConnectionIdentityRow = sqlx::query_as(CONNECTION_IDENTITY_QUERY)
        .fetch_one(&mut *connection)
        .await
        .map_err(|_| match kind {
            ConnectionKind::Owner => AttestationError::new(
                "owner_identity_query_failed",
                "could not inspect PostgreSQL 17 and the owner connection identity",
            ),
            ConnectionKind::Runtime => AttestationError::new(
                "runtime_identity_query_failed",
                "could not inspect PostgreSQL 17 and the runtime connection identity",
            ),
        })?;

    validate_postgres_version(row.server_version_num)?;
    Ok(row)
}

fn validate_same_target(
    owner: &ConnectionIdentityRow,
    runtime: &ConnectionIdentityRow,
) -> Result<PostgresEvidence, AttestationError> {
    if owner.server_version_num != runtime.server_version_num {
        return Err(AttestationError::new(
            "target_version_mismatch",
            "the owner and runtime URLs reached different PostgreSQL versions",
        ));
    }
    if owner.database_name != runtime.database_name {
        return Err(AttestationError::new(
            "target_database_mismatch",
            "the owner and runtime URLs did not reach the same database",
        ));
    }
    if owner.system_identifier != runtime.system_identifier {
        return Err(AttestationError::new(
            "target_cluster_mismatch",
            "the owner and runtime URLs reached different PostgreSQL clusters",
        ));
    }

    Ok(PostgresEvidence {
        required_major: REQUIRED_POSTGRES_MAJOR,
        server_version_num: owner.server_version_num,
        owner_and_runtime_versions_match: true,
        owner_and_runtime_database_match: true,
        owner_and_runtime_cluster_match: true,
    })
}

fn validate_postgres_version(server_version_num: i32) -> Result<(), AttestationError> {
    if server_version_num / 10_000 == REQUIRED_POSTGRES_MAJOR {
        return Ok(());
    }

    Err(AttestationError::new(
        "postgres_major_mismatch",
        "the target must run PostgreSQL major version 17",
    ))
}

fn validate_identity(
    row: &ConnectionIdentityRow,
    expected_role: &str,
    failure_code: &'static str,
) -> Result<ConnectionEvidence, AttestationError> {
    let system_identity_matches = row
        .system_identity
        .as_deref()
        .and_then(|identity| identity.split_once(':'))
        .is_some_and(|(method, identity)| !method.is_empty() && identity == expected_role);

    if !system_identity_matches
        || row.session_role != expected_role
        || row.current_role != expected_role
    {
        return Err(AttestationError::new(
            failure_code,
            "system_user, session_user, and current_user must all identify the expected direct login",
        ));
    }

    Ok(ConnectionEvidence {
        expected_role: expected_role.to_owned(),
        system_user: RedactedSystemUserEvidence {
            authentication_method: REDACTED_AUTH_METHOD,
            identity: expected_role.to_owned(),
            exact_match: true,
        },
        session_user: row.session_role.clone(),
        current_user: row.current_role.clone(),
    })
}

async fn query_current_role(
    connection: &mut PgConnection,
    kind: ConnectionKind,
) -> Result<RoleRow, AttestationError> {
    sqlx::query_as(
        "SELECT role.rolname::text AS name, \
                role.rolcanlogin AS can_login, \
                role.rolsuper AS is_superuser, \
                role.rolcreatedb AS can_create_database, \
                role.rolcreaterole AS can_create_role, \
                role.rolinherit AS inherits, \
                role.rolreplication AS can_replicate, \
                role.rolbypassrls AS bypasses_rls, \
                (SELECT count(*) \
                 FROM pg_catalog.pg_auth_members AS membership \
                 WHERE membership.member = role.oid)::bigint AS membership_count \
         FROM pg_catalog.pg_roles AS role \
         WHERE role.rolname = session_user",
    )
    .fetch_one(&mut *connection)
    .await
    .map_err(|_| match kind {
        ConnectionKind::Owner => AttestationError::new(
            "owner_role_query_failed",
            "could not inspect the migration-owner role posture",
        ),
        ConnectionKind::Runtime => AttestationError::new(
            "runtime_role_query_failed",
            "could not inspect the runtime-role posture",
        ),
    })
}

fn validate_owner_role(row: &RoleRow) -> Result<OwnerRoleEvidence, AttestationError> {
    if row.name != EXPECTED_MIGRATOR_ROLE || !row.can_login || row.membership_count != 0 {
        return Err(AttestationError::new(
            "owner_role_mismatch",
            "the migration owner must be the expected LOGIN role with zero direct memberships",
        ));
    }

    let flags = row.flags();
    let elevated_capabilities = elevated_capabilities(&flags);
    let operator_review_required = !elevated_capabilities.is_empty();

    Ok(OwnerRoleEvidence {
        name: row.name.clone(),
        flags,
        direct_membership_count: row.membership_count,
        capability_enforcement: "reported_for_operator_review_not_provider_normalized",
        elevated_capabilities,
        operator_review_required,
    })
}

fn elevated_capabilities(flags: &RoleFlags) -> Vec<&'static str> {
    let mut capabilities = Vec::new();
    if flags.superuser {
        capabilities.push("SUPERUSER");
    }
    if flags.create_database {
        capabilities.push("CREATEDB");
    }
    if flags.create_role {
        capabilities.push("CREATEROLE");
    }
    if flags.inherit {
        capabilities.push("INHERIT");
    }
    if flags.replication {
        capabilities.push("REPLICATION");
    }
    if flags.bypass_rls {
        capabilities.push("BYPASSRLS");
    }
    capabilities
}

/// Either name the runtime login may legitimately carry.
///
/// `0009_rename_runtime_roles` renames `ptr_clone_app` -> `tradingroom_app`, so a cluster that has
/// migrated presents the new name and one that has not presents the old one. Both are correct, and
/// the POSTURE checks below are identical for either — a rename does not buy a role any capability.
///
/// This mirrors `db::migrate`, whose preflight already accepts both. That tolerance was added there
/// by the adversarial review of 2026-08-11, which recorded the failure exactly: "Pinning a single
/// name made 0009 rename the role its own preflight requires to exist." **The attestor was missed by
/// that fix.** Left as it was, it would have refused to attest any cluster that had actually applied
/// 0009 — which is every cluster from now on — and it would have done so with a
/// `runtime_role_mismatch`, a message that reads like a security finding rather than a stale pin.
fn runtime_role_name_is_expected(name: &str) -> bool {
    name == EXPECTED_RUNTIME_ROLE || name == RENAMED_RUNTIME_ROLE
}

fn validate_runtime_role(row: &RoleRow) -> Result<RuntimeRoleEvidence, AttestationError> {
    let exact = runtime_role_name_is_expected(&row.name)
        && row.can_login
        && !row.is_superuser
        && !row.can_create_database
        && !row.can_create_role
        && !row.inherits
        && !row.can_replicate
        && !row.bypasses_rls
        && row.membership_count == 0;

    if !exact {
        return Err(AttestationError::new(
            "runtime_role_mismatch",
            "the runtime role does not match the exact restricted, membership-free repository contract",
        ));
    }

    Ok(RuntimeRoleEvidence {
        name: row.name.clone(),
        flags: row.flags(),
        direct_membership_count: row.membership_count,
        capability_enforcement: "exact_repository_contract",
    })
}

/// The exact migration chain this attestor is willing to vouch for.
///
/// Deliberately a literal rather than "whatever `MIGRATOR` happens to hold". The point of the
/// check is that adding a migration must be a REVIEWED act: a new file appearing in
/// `services/api/migrations` fails the release gate until somebody extends this list, which is
/// what stops an unreviewed schema change riding into a production attestation.
///
/// Extended from `0001-0006` to `0001-0008` when `0007_saved_polls` and
/// `0008_room_events_tenant_keys` were promoted out of the sibling room repository during the
/// `services/` reconcile. `0008` is the load-bearing one: `room_events` carried three independent
/// foreign keys, so a row could hold one tenant's `enterprise_id` beside another's `room_id` and
/// still satisfy RLS. Both are recorded in `ops/backend-import-provenance.md`.
///
/// Extended to `0001-0009` on 2026-08-14 for `0009_rename_runtime_roles`, which renames the runtime
/// login `ptr_clone_app` -> `tradingroom_app`. Reviewed rather than rubber-stamped: it is
/// forward-only, idempotent in both directions, refuses to guess when BOTH names exist, and
/// re-asserts the restricted posture under the new name — so it cannot quietly hand the grants to a
/// role that may bypass RLS. `0009` shipped in `b9f775e` without this list being extended, which is
/// exactly the reviewed-act gate working: `main` went red until somebody looked.
const ATTESTED_MIGRATION_VERSIONS: [i64; 9] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

fn validate_embedded_migration_contract() -> Result<(), AttestationError> {
    let versions: Vec<i64> = MIGRATOR
        .migrations
        .iter()
        .map(|migration| migration.version)
        .collect();
    if versions == ATTESTED_MIGRATION_VERSIONS {
        return Ok(());
    }

    Err(AttestationError::new(
        "embedded_migration_contract_changed",
        "the attestor is pinned to repository migration versions 0001 through 0009",
    ))
}

async fn query_and_validate_migrations(
    connection: &mut PgConnection,
) -> Result<MigrationLedgerEvidence, AttestationError> {
    let rows: Vec<MigrationRow> = sqlx::query_as(
        "SELECT version, description, success, checksum \
         FROM public._sqlx_migrations \
         ORDER BY version",
    )
    .fetch_all(&mut *connection)
    .await
    .map_err(|_| {
        AttestationError::new(
            "migration_ledger_query_failed",
            "could not read the SQLx migration ledger",
        )
    })?;

    if rows.len() != MIGRATOR.migrations.len() {
        return Err(migration_ledger_mismatch());
    }

    let mut migrations = Vec::with_capacity(rows.len());
    for (row, expected) in rows.iter().zip(MIGRATOR.migrations.iter()) {
        if row.version != expected.version
            || row.description != expected.description
            || !row.success
            || row.checksum.as_slice() != expected.checksum.as_ref()
        {
            return Err(migration_ledger_mismatch());
        }

        migrations.push(MigrationEvidence {
            version: row.version,
            description: row.description.clone(),
            success: row.success,
            checksum_sha384: hex::encode(&row.checksum),
        });
    }

    Ok(MigrationLedgerEvidence {
        relation: "public._sqlx_migrations",
        exact_repository_chain: true,
        migrations,
    })
}

const fn migration_ledger_mismatch() -> AttestationError {
    AttestationError::new(
        "migration_ledger_mismatch",
        "the SQLx ledger must contain only successful repository migrations 0001 through 0008 with exact descriptions and checksums",
    )
}

async fn query_and_validate_room_events(
    connection: &mut PgConnection,
) -> Result<RoomEventsEvidence, AttestationError> {
    let relation: RoomEventsRow = sqlx::query_as(
        "SELECT pg_catalog.pg_get_userbyid(class.relowner)::text AS owner_name, \
                class.relrowsecurity AS rls_enabled, \
                class.relforcerowsecurity AS rls_forced \
         FROM pg_catalog.pg_class AS class \
         INNER JOIN pg_catalog.pg_namespace AS namespace \
             ON namespace.oid = class.relnamespace \
         WHERE namespace.nspname = 'public' \
           AND class.relname = 'room_events' \
           AND class.relkind = 'r'",
    )
    .fetch_one(&mut *connection)
    .await
    .map_err(|_| {
        AttestationError::new(
            "room_events_query_failed",
            "could not inspect the public.room_events relation",
        )
    })?;

    if relation.owner_name != EXPECTED_MIGRATOR_ROLE
        || !relation.rls_enabled
        || !relation.rls_forced
    {
        return Err(AttestationError::new(
            "room_events_rls_mismatch",
            "public.room_events must be owned by the migration owner with enabled and forced row-level security",
        ));
    }

    let policies: Vec<PolicyRow> = sqlx::query_as(
        "SELECT policy.policyname::text AS name, \
                policy.permissive::text AS permissive, \
                policy.cmd::text AS command, \
                ARRAY( \
                    SELECT policy_role::text \
                    FROM unnest(policy.roles) AS policy_role \
                    ORDER BY policy_role::text \
                )::text[] AS roles, \
                policy.qual::text AS using_expression, \
                policy.with_check::text AS with_check_expression \
         FROM pg_catalog.pg_policies AS policy \
         WHERE policy.schemaname = 'public' \
           AND policy.tablename = 'room_events' \
         ORDER BY policy.policyname",
    )
    .fetch_all(&mut *connection)
    .await
    .map_err(|_| {
        AttestationError::new(
            "room_events_policy_query_failed",
            "could not inspect the public.room_events policies",
        )
    })?;

    let [policy] = policies.as_slice() else {
        return Err(room_events_policy_mismatch());
    };
    let using_expression = policy
        .using_expression
        .as_deref()
        .ok_or_else(room_events_policy_mismatch)?;
    let with_check_expression = policy
        .with_check_expression
        .as_deref()
        .ok_or_else(room_events_policy_mismatch)?;

    /*
       Targeted to EXACTLY ONE role, which must be the runtime login under either of its names.

       The single-element check is the load-bearing half and is unchanged: a policy listing a second
       role is a policy somebody widened. What 0009 changes is only which name that one role
       answers to — and `pg_policy` stores targets by OID, so a renamed role keeps its policies and
       simply reports the new name here.
    */
    let targets_runtime_role_only = matches!(policy.roles.as_slice(), [only]
        if runtime_role_name_is_expected(only));

    if policy.name != "room_events_tenant_isolation"
        || policy.permissive != "PERMISSIVE"
        || policy.command != "ALL"
        || !targets_runtime_role_only
        || using_expression != EXPECTED_POLICY_EXPRESSION
        || with_check_expression != EXPECTED_POLICY_EXPRESSION
    {
        return Err(room_events_policy_mismatch());
    }

    Ok(RoomEventsEvidence {
        relation: "public.room_events",
        owner: relation.owner_name,
        row_level_security_enabled: relation.rls_enabled,
        row_level_security_forced: relation.rls_forced,
        policy: PolicyEvidence {
            name: policy.name.clone(),
            permissive: policy.permissive.clone(),
            command: policy.command.clone(),
            roles: policy.roles.clone(),
            using_expression: using_expression.to_owned(),
            with_check_expression: with_check_expression.to_owned(),
        },
    })
}

const fn room_events_policy_mismatch() -> AttestationError {
    AttestationError::new(
        "room_events_policy_mismatch",
        "public.room_events must have exactly the reviewed tenant policy targeted only to the runtime role",
    )
}

async fn query_and_validate_acl(
    connection: &mut PgConnection,
) -> Result<AclEvidence, AttestationError> {
    let table_rows: Vec<TablePrivilegeRow> = sqlx::query_as(
        "WITH protected(table_name, table_order) AS ( \
             VALUES ('enterprises'::text, 1), ('users'::text, 2), ('audit_log'::text, 3) \
         ), privilege(privilege_type, privilege_order) AS ( \
             VALUES \
                 ('SELECT'::text, 1), ('INSERT'::text, 2), ('UPDATE'::text, 3), \
                 ('DELETE'::text, 4), ('TRUNCATE'::text, 5), ('REFERENCES'::text, 6), \
                 ('TRIGGER'::text, 7), ('MAINTAIN'::text, 8) \
         ) \
         SELECT protected.table_name, privilege.privilege_type, \
                has_table_privilege( \
                    session_user, \
                    format('public.%I', protected.table_name), \
                    privilege.privilege_type \
                ) AS granted \
         FROM protected \
         CROSS JOIN privilege \
         ORDER BY protected.table_order, privilege.privilege_order",
    )
    .fetch_all(&mut *connection)
    .await
    .map_err(|_| {
        AttestationError::new(
            "table_acl_query_failed",
            "could not inspect effective runtime relation privileges",
        )
    })?;

    let column_rows: Vec<ColumnPrivilegeRow> = sqlx::query_as(
        "WITH protected(table_name, table_order) AS ( \
             VALUES ('enterprises'::text, 1), ('users'::text, 2), ('audit_log'::text, 3) \
         ), privilege(privilege_type, privilege_order) AS ( \
             VALUES \
                 ('SELECT'::text, 1), ('INSERT'::text, 2), \
                 ('UPDATE'::text, 3), ('REFERENCES'::text, 4) \
         ) \
         SELECT protected.table_name, attribute.attname::text AS column_name, \
                privilege.privilege_type, \
                has_column_privilege( \
                    session_user, \
                    format('public.%I', protected.table_name), \
                    attribute.attname, \
                    privilege.privilege_type \
                ) AS granted \
         FROM protected \
         INNER JOIN pg_catalog.pg_namespace AS namespace \
             ON namespace.nspname = 'public' \
         INNER JOIN pg_catalog.pg_class AS class \
             ON class.relnamespace = namespace.oid \
            AND class.relname = protected.table_name \
            AND class.relkind = 'r' \
         INNER JOIN pg_catalog.pg_attribute AS attribute \
             ON attribute.attrelid = class.oid \
            AND attribute.attnum > 0 \
            AND NOT attribute.attisdropped \
         CROSS JOIN privilege \
         ORDER BY protected.table_order, attribute.attnum, privilege.privilege_order",
    )
    .fetch_all(&mut *connection)
    .await
    .map_err(|_| {
        AttestationError::new(
            "column_acl_query_failed",
            "could not inspect effective runtime column privileges",
        )
    })?;

    validate_acl_rows(&table_rows, &column_rows)
}

fn validate_acl_rows(
    table_rows: &[TablePrivilegeRow],
    column_rows: &[ColumnPrivilegeRow],
) -> Result<AclEvidence, AttestationError> {
    let expected_objects = [
        ("enterprises", ENTERPRISE_COLUMNS),
        ("users", USER_COLUMNS),
        ("audit_log", AUDIT_LOG_COLUMNS),
    ];

    let mut objects = Vec::with_capacity(expected_objects.len());
    for (table_name, expected_columns) in expected_objects {
        let actual_table_rows: Vec<&TablePrivilegeRow> = table_rows
            .iter()
            .filter(|row| row.table_name == table_name)
            .collect();
        if actual_table_rows.len() != TABLE_PRIVILEGE_TYPES.len()
            || actual_table_rows
                .iter()
                .zip(TABLE_PRIVILEGE_TYPES)
                .any(|(row, expected)| row.privilege_type != *expected || row.granted)
        {
            return Err(acl_mismatch());
        }

        let actual_column_names: Vec<&str> = column_rows
            .iter()
            .filter(|row| row.table_name == table_name)
            .map(|row| row.column_name.as_str())
            .fold(Vec::new(), |mut names, name| {
                if names.last().copied() != Some(name) {
                    names.push(name);
                }
                names
            });
        if actual_column_names != expected_columns {
            return Err(acl_mismatch());
        }

        let mut columns = Vec::with_capacity(expected_columns.len());
        for column_name in expected_columns.iter().copied() {
            let rows: Vec<&ColumnPrivilegeRow> = column_rows
                .iter()
                .filter(|row| row.table_name == table_name && row.column_name == column_name)
                .collect();
            if rows.len() != COLUMN_PRIVILEGE_TYPES.len()
                || rows
                    .iter()
                    .zip(COLUMN_PRIVILEGE_TYPES)
                    .any(|(row, expected)| row.privilege_type != *expected)
            {
                return Err(acl_mismatch());
            }

            let privileges: Vec<String> = rows
                .iter()
                .filter(|row| row.granted)
                .map(|row| row.privilege_type.clone())
                .collect();
            let expected_privileges = expected_column_privileges(table_name, column_name);
            if privileges != expected_privileges {
                return Err(acl_mismatch());
            }

            columns.push(ColumnAclEvidence {
                name: column_name.to_owned(),
                privileges,
            });
        }

        objects.push(ObjectAclEvidence {
            relation: format!("public.{table_name}"),
            table_privileges: Vec::new(),
            columns,
        });
    }

    if table_rows.len() != expected_objects.len() * TABLE_PRIVILEGE_TYPES.len()
        || column_rows.len()
            != (ENTERPRISE_COLUMNS.len() + USER_COLUMNS.len() + AUDIT_LOG_COLUMNS.len())
                * COLUMN_PRIVILEGE_TYPES.len()
    {
        return Err(acl_mismatch());
    }

    Ok(AclEvidence {
        role: EXPECTED_RUNTIME_ROLE.to_owned(),
        checked_table_privileges: TABLE_PRIVILEGE_TYPES.to_vec(),
        checked_column_privileges: COLUMN_PRIVILEGE_TYPES.to_vec(),
        objects,
    })
}

fn expected_column_privileges(table_name: &str, column_name: &str) -> Vec<String> {
    COLUMN_PRIVILEGE_TYPES
        .iter()
        .copied()
        .filter(|privilege| match (table_name, *privilege) {
            ("enterprises", "SELECT") => column_name == "id",
            ("users", "SELECT") => USER_SELECT_COLUMNS.contains(&column_name),
            ("users", "INSERT") => USER_INSERT_COLUMNS.contains(&column_name),
            ("users", "UPDATE") => USER_UPDATE_COLUMNS.contains(&column_name),
            ("audit_log", "INSERT") => AUDIT_LOG_INSERT_COLUMNS.contains(&column_name),
            _ => false,
        })
        .map(str::to_owned)
        .collect()
}

const fn acl_mismatch() -> AttestationError {
    AttestationError::new(
        "runtime_acl_mismatch",
        "effective table and column privileges do not match migration 0006's exact runtime matrix",
    )
}

async fn prove_listen_capability(
    runtime_url: &str,
    owner_connection: &mut PgConnection,
    expected_runtime_target: &ConnectionIdentityRow,
) -> Result<ListenEvidence, AttestationError> {
    let mut listener = timeout(CONNECT_TIMEOUT, PgListener::connect(runtime_url))
        .await
        .map_err(|_| listen_probe_failed())?
        .map_err(|_| listen_probe_failed())?;
    let channel = format!("{LISTEN_CHANNEL_PREFIX}{}", Uuid::new_v4().simple());
    let payload = Uuid::new_v4().simple().to_string();

    timeout(LISTEN_ROUND_TRIP_TIMEOUT, listener.listen(&channel))
        .await
        .map_err(|_| listen_probe_failed())?
        .map_err(|_| listen_probe_failed())?;
    let listener_identity = match query_listener_identity(&mut listener).await {
        Ok(identity) => identity,
        Err(error) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(error);
        }
    };
    let listener_runtime_identity_verified = validate_identity(
        &listener_identity,
        EXPECTED_RUNTIME_ROLE,
        "listener_identity_mismatch",
    )
    .is_ok();
    let listener_target_verified =
        validate_same_target(expected_runtime_target, &listener_identity).is_ok();
    if !listener_runtime_identity_verified || !listener_target_verified {
        best_effort_unlisten(&mut listener, &channel).await;
        return Err(listen_probe_failed());
    }
    let listener_process_id = match query_listener_process_id(&mut listener).await {
        Ok(process_id) => process_id,
        Err(error) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(error);
        }
    };

    let owner_process_id: i32 = match timeout(
        LISTEN_ROUND_TRIP_TIMEOUT,
        sqlx::query_scalar("SELECT pg_catalog.pg_backend_pid()").fetch_one(&mut *owner_connection),
    )
    .await
    {
        Ok(Ok(process_id)) => process_id,
        Ok(Err(_)) | Err(_) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(listen_probe_failed());
        }
    };
    let owner_process_id = match u32::try_from(owner_process_id) {
        Ok(process_id) => process_id,
        Err(_) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(listen_probe_failed());
        }
    };
    let distinct_sender_and_listener_sessions_verified = owner_process_id != listener_process_id;
    if !distinct_sender_and_listener_sessions_verified {
        best_effort_unlisten(&mut listener, &channel).await;
        return Err(listen_probe_failed());
    }

    let notification_sent = timeout(
        LISTEN_ROUND_TRIP_TIMEOUT,
        sqlx::query("SELECT pg_catalog.pg_notify($1, $2)")
            .bind(&channel)
            .bind(&payload)
            .execute(&mut *owner_connection),
    )
    .await;
    if !matches!(notification_sent, Ok(Ok(_))) {
        best_effort_unlisten(&mut listener, &channel).await;
        return Err(listen_probe_failed());
    }

    let notification = match timeout(LISTEN_ROUND_TRIP_TIMEOUT, listener.recv()).await {
        Ok(Ok(notification)) => notification,
        Ok(Err(_)) | Err(_) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(listen_probe_failed());
        }
    };
    let listener_process_id_after_receive = match query_listener_process_id(&mut listener).await {
        Ok(process_id) => process_id,
        Err(error) => {
            best_effort_unlisten(&mut listener, &channel).await;
            return Err(error);
        }
    };
    let expected_channel_verified = notification.channel() == channel;
    let expected_payload_verified = notification.payload() == payload;
    let owner_sender_verified = notification.process_id() == owner_process_id;
    let listener_session_retained = listener_process_id_after_receive == listener_process_id;
    if !expected_channel_verified
        || !expected_payload_verified
        || !owner_sender_verified
        || !listener_session_retained
    {
        best_effort_unlisten(&mut listener, &channel).await;
        return Err(listen_probe_failed());
    }

    if !matches!(
        timeout(LISTEN_ROUND_TRIP_TIMEOUT, listener.unlisten(&channel),).await,
        Ok(Ok(()))
    ) {
        best_effort_unlisten(&mut listener, &channel).await;
        return Err(listen_probe_failed());
    }
    let listener_process_id_after_unlisten = query_listener_process_id(&mut listener).await?;
    if listener_process_id_after_unlisten != listener_process_id {
        return Err(listen_probe_failed());
    }
    let still_listening: bool = timeout(
        LISTEN_ROUND_TRIP_TIMEOUT,
        sqlx::query_scalar(
            "SELECT EXISTS ( \
                 SELECT 1 \
                 FROM pg_catalog.pg_listening_channels() AS subscribed(channel_name) \
                 WHERE channel_name = $1 \
             )",
        )
        .bind(&channel)
        .fetch_one(&mut listener),
    )
    .await
    .map_err(|_| listen_probe_failed())?
    .map_err(|_| listen_probe_failed())?;
    if still_listening {
        return Err(listen_probe_failed());
    }

    Ok(ListenEvidence {
        notification_round_trip_verified: true,
        listener_runtime_identity_verified,
        listener_target_verified,
        expected_channel_verified,
        expected_payload_verified,
        owner_sender_verified,
        distinct_sender_and_listener_sessions_verified,
        listener_session_retained,
        cleanup_verified: true,
        endpoint_requirement: "direct_or_session_affine_not_transaction_pooled",
    })
}

async fn query_listener_identity(
    listener: &mut PgListener,
) -> Result<ConnectionIdentityRow, AttestationError> {
    let row: ConnectionIdentityRow = timeout(
        LISTEN_ROUND_TRIP_TIMEOUT,
        sqlx::query_as(CONNECTION_IDENTITY_QUERY).fetch_one(&mut *listener),
    )
    .await
    .map_err(|_| listen_probe_failed())?
    .map_err(|_| listen_probe_failed())?;
    validate_postgres_version(row.server_version_num).map_err(|_| listen_probe_failed())?;
    Ok(row)
}

async fn query_listener_process_id(listener: &mut PgListener) -> Result<u32, AttestationError> {
    let process_id: i32 = timeout(
        LISTEN_ROUND_TRIP_TIMEOUT,
        sqlx::query_scalar("SELECT pg_catalog.pg_backend_pid()").fetch_one(listener),
    )
    .await
    .map_err(|_| listen_probe_failed())?
    .map_err(|_| listen_probe_failed())?;

    u32::try_from(process_id).map_err(|_| listen_probe_failed())
}

async fn best_effort_unlisten(listener: &mut PgListener, channel: &str) {
    let _cleanup = timeout(LISTEN_ROUND_TRIP_TIMEOUT, listener.unlisten(channel)).await;
}

const fn listen_probe_failed() -> AttestationError {
    AttestationError::new(
        "listen_probe_failed",
        "the owner-to-runtime LISTEN notification round trip or cleanup could not be verified",
    )
}

fn render_evidence(
    evidence: &AttestationEvidence,
    format: OutputFormat,
) -> Result<String, AttestationError> {
    match format {
        OutputFormat::Json => serde_json::to_string_pretty(evidence).map_err(|_| {
            AttestationError::new(
                "evidence_serialization_failed",
                "could not serialize the redacted attestation evidence",
            )
        }),
        OutputFormat::Text => Ok(render_text(evidence)),
    }
}

fn render_text(evidence: &AttestationEvidence) -> String {
    let mut output = String::new();
    append_line(
        &mut output,
        format_args!("attestation_version={}", evidence.attestation_version),
    );
    append_line(&mut output, format_args!("status={}", evidence.status));
    append_line(
        &mut output,
        format_args!(
            "postgres.required_major={}",
            evidence.postgres.required_major
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "postgres.server_version_num={}",
            evidence.postgres.server_version_num
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "postgres.owner_and_runtime_versions_match={}",
            evidence.postgres.owner_and_runtime_versions_match
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "postgres.owner_and_runtime_database_match={}",
            evidence.postgres.owner_and_runtime_database_match
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "postgres.owner_and_runtime_cluster_match={}",
            evidence.postgres.owner_and_runtime_cluster_match
        ),
    );
    append_connection(&mut output, "owner_connection", &evidence.owner_connection);
    append_connection(
        &mut output,
        "runtime_connection",
        &evidence.runtime_connection,
    );
    append_line(
        &mut output,
        format_args!("owner_role.name={}", evidence.owner_role.name),
    );
    append_role_flags(&mut output, "owner_role", &evidence.owner_role.flags);
    append_line(
        &mut output,
        format_args!(
            "owner_role.direct_membership_count={}",
            evidence.owner_role.direct_membership_count
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "owner_role.capability_enforcement={}",
            evidence.owner_role.capability_enforcement
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "owner_role.elevated_capabilities={}",
            join_or_none(&evidence.owner_role.elevated_capabilities)
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "owner_role.operator_review_required={}",
            evidence.owner_role.operator_review_required
        ),
    );
    append_line(
        &mut output,
        format_args!("runtime_role.name={}", evidence.runtime_role.name),
    );
    append_role_flags(&mut output, "runtime_role", &evidence.runtime_role.flags);
    append_line(
        &mut output,
        format_args!(
            "runtime_role.direct_membership_count={}",
            evidence.runtime_role.direct_membership_count
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "runtime_role.capability_enforcement={}",
            evidence.runtime_role.capability_enforcement
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "migration_ledger.relation={}",
            evidence.migration_ledger.relation
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "migration_ledger.exact_repository_chain={}",
            evidence.migration_ledger.exact_repository_chain
        ),
    );
    for migration in &evidence.migration_ledger.migrations {
        append_line(
            &mut output,
            format_args!(
                "migration.{}=description:{}|success:{}|checksum_sha384:{}",
                migration.version,
                migration.description,
                migration.success,
                migration.checksum_sha384
            ),
        );
    }
    append_line(
        &mut output,
        format_args!("room_events.relation={}", evidence.room_events.relation),
    );
    append_line(
        &mut output,
        format_args!("room_events.owner={}", evidence.room_events.owner),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.row_level_security_enabled={}",
            evidence.room_events.row_level_security_enabled
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.row_level_security_forced={}",
            evidence.room_events.row_level_security_forced
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.name={}",
            evidence.room_events.policy.name
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.permissive={}",
            evidence.room_events.policy.permissive
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.command={}",
            evidence.room_events.policy.command
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.roles={}",
            evidence.room_events.policy.roles.join(",")
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.using={}",
            evidence.room_events.policy.using_expression
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "room_events.policy.with_check={}",
            evidence.room_events.policy.with_check_expression
        ),
    );
    append_line(
        &mut output,
        format_args!("effective_acl.role={}", evidence.effective_acl.role),
    );
    append_line(
        &mut output,
        format_args!(
            "effective_acl.checked_table_privileges={}",
            evidence.effective_acl.checked_table_privileges.join(",")
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "effective_acl.checked_column_privileges={}",
            evidence.effective_acl.checked_column_privileges.join(",")
        ),
    );
    for object in &evidence.effective_acl.objects {
        append_line(
            &mut output,
            format_args!(
                "acl.{}.table={}",
                object.relation,
                join_strings_or_none(&object.table_privileges)
            ),
        );
        for column in &object.columns {
            append_line(
                &mut output,
                format_args!(
                    "acl.{}.{}={}",
                    object.relation,
                    column.name,
                    join_strings_or_none(&column.privileges)
                ),
            );
        }
    }
    append_line(
        &mut output,
        format_args!(
            "listen_capability.notification_round_trip_verified={}",
            evidence.listen_capability.notification_round_trip_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.listener_runtime_identity_verified={}",
            evidence
                .listen_capability
                .listener_runtime_identity_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.listener_target_verified={}",
            evidence.listen_capability.listener_target_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.expected_channel_verified={}",
            evidence.listen_capability.expected_channel_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.expected_payload_verified={}",
            evidence.listen_capability.expected_payload_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.owner_sender_verified={}",
            evidence.listen_capability.owner_sender_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.distinct_sender_and_listener_sessions_verified={}",
            evidence
                .listen_capability
                .distinct_sender_and_listener_sessions_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.listener_session_retained={}",
            evidence.listen_capability.listener_session_retained
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.cleanup_verified={}",
            evidence.listen_capability.cleanup_verified
        ),
    );
    append_line(
        &mut output,
        format_args!(
            "listen_capability.endpoint_requirement={}",
            evidence.listen_capability.endpoint_requirement
        ),
    );
    output
}

fn append_connection(output: &mut String, prefix: &str, evidence: &ConnectionEvidence) {
    append_line(
        output,
        format_args!("{prefix}.expected_role={}", evidence.expected_role),
    );
    append_line(
        output,
        format_args!(
            "{prefix}.system_user={}:{}",
            evidence.system_user.authentication_method, evidence.system_user.identity
        ),
    );
    append_line(
        output,
        format_args!(
            "{prefix}.system_user_exact_match={}",
            evidence.system_user.exact_match
        ),
    );
    append_line(
        output,
        format_args!("{prefix}.session_user={}", evidence.session_user),
    );
    append_line(
        output,
        format_args!("{prefix}.current_user={}", evidence.current_user),
    );
}

fn append_role_flags(output: &mut String, prefix: &str, flags: &RoleFlags) {
    for (name, value) in [
        ("login", flags.login),
        ("superuser", flags.superuser),
        ("create_database", flags.create_database),
        ("create_role", flags.create_role),
        ("inherit", flags.inherit),
        ("replication", flags.replication),
        ("bypass_rls", flags.bypass_rls),
    ] {
        append_line(output, format_args!("{prefix}.flags.{name}={value}"));
    }
}

fn append_line(output: &mut String, arguments: fmt::Arguments<'_>) {
    output
        .write_fmt(arguments)
        .expect("writing formatted evidence to a String cannot fail");
    output.push('\n');
}

fn join_or_none(values: &[&str]) -> String {
    if values.is_empty() {
        "none".to_owned()
    } else {
        values.join(",")
    }
}

fn join_strings_or_none(values: &[String]) -> String {
    if values.is_empty() {
        "none".to_owned()
    } else {
        values.join(",")
    }
}

fn write_stdout(output: &str) -> Result<(), AttestationError> {
    let mut stdout = io::stdout().lock();
    stdout.write_all(output.as_bytes()).map_err(|_| {
        AttestationError::new(
            "stdout_write_failed",
            "could not write the complete attestation artifact",
        )
    })?;
    if !output.ends_with('\n') {
        stdout.write_all(b"\n").map_err(|_| {
            AttestationError::new(
                "stdout_write_failed",
                "could not write the complete attestation artifact",
            )
        })?;
    }
    stdout.flush().map_err(|_| {
        AttestationError::new(
            "stdout_write_failed",
            "could not flush the complete attestation artifact",
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn restricted_runtime_row() -> RoleRow {
        RoleRow {
            name: EXPECTED_RUNTIME_ROLE.to_owned(),
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

    fn connection_identity(system_identifier: &str) -> ConnectionIdentityRow {
        ConnectionIdentityRow {
            server_version_num: 170_010,
            database_name: "tradingroom".into(),
            system_identifier: system_identifier.into(),
            system_identity: Some(format!("scram-sha-256:{EXPECTED_MIGRATOR_ROLE}")),
            session_role: EXPECTED_MIGRATOR_ROLE.into(),
            current_role: EXPECTED_MIGRATOR_ROLE.into(),
        }
    }

    #[test]
    fn cli_never_echoes_a_mistaken_secret_argument() {
        let secret = "postgres://operator:do-not-print@example.invalid/database";
        let error = parse_arguments(["attest".into(), secret.into()])
            .expect_err("connection URLs are not accepted as arguments");
        let rendered = error.to_string();
        assert_eq!(error.code, "invalid_arguments");
        assert!(!rendered.contains("do-not-print"));
        assert!(!rendered.contains("example.invalid"));
    }

    #[test]
    fn identity_evidence_redacts_the_authentication_method() {
        let row = ConnectionIdentityRow {
            server_version_num: 170_010,
            database_name: "not-emitted".into(),
            system_identifier: "cluster-identifier-not-emitted".into(),
            system_identity: Some("certificate-subject:ptr_clone".into()),
            session_role: EXPECTED_MIGRATOR_ROLE.into(),
            current_role: EXPECTED_MIGRATOR_ROLE.into(),
        };

        let evidence = validate_identity(&row, EXPECTED_MIGRATOR_ROLE, "identity_mismatch")
            .expect("the exact role identity is valid");
        let rendered = serde_json::to_string(&evidence).expect("serialize identity evidence");
        assert!(rendered.contains(REDACTED_AUTH_METHOD));
        assert!(!rendered.contains("certificate-subject"));
        assert!(!rendered.contains("not-emitted"));
        assert!(!rendered.contains("cluster-identifier-not-emitted"));
    }

    #[test]
    fn same_target_requires_the_same_cluster_without_emitting_its_identifier() {
        let owner = connection_identity("owner-cluster-identifier-not-emitted");
        let runtime = connection_identity("owner-cluster-identifier-not-emitted");
        let evidence =
            validate_same_target(&owner, &runtime).expect("the exact same target is valid");
        let rendered = serde_json::to_string(&evidence).expect("serialize PostgreSQL evidence");
        assert!(evidence.owner_and_runtime_cluster_match);
        assert!(!rendered.contains("owner-cluster-identifier-not-emitted"));

        let other_cluster = connection_identity("runtime-cluster-identifier-not-emitted");
        let error = validate_same_target(&owner, &other_cluster)
            .expect_err("different cluster identifiers must fail closed");
        let rendered_error = error.to_string();
        assert_eq!(error.code, "target_cluster_mismatch");
        assert!(!rendered_error.contains("owner-cluster-identifier-not-emitted"));
        assert!(!rendered_error.contains("runtime-cluster-identifier-not-emitted"));
    }

    #[test]
    fn identity_validation_rejects_every_role_switch_and_forged_suffix() {
        for (system_identity, session_role, current_role) in [
            (
                Some("scram-sha-256:ptr_clone_app"),
                "ptr_clone",
                "ptr_clone",
            ),
            (
                Some("scram-sha-256:ptr_clone"),
                "ptr_clone_app",
                "ptr_clone_app",
            ),
            (
                Some("scram-sha-256:ptr_clone"),
                "ptr_clone",
                "ptr_clone_app",
            ),
            (
                Some("scram-sha-256:ptr_clone:forged"),
                "ptr_clone",
                "ptr_clone",
            ),
            (None, "ptr_clone", "ptr_clone"),
        ] {
            let row = ConnectionIdentityRow {
                server_version_num: 170_010,
                database_name: "ignored".into(),
                system_identifier: "ignored".into(),
                system_identity: system_identity.map(str::to_owned),
                session_role: session_role.into(),
                current_role: current_role.into(),
            };
            assert!(validate_identity(&row, EXPECTED_MIGRATOR_ROLE, "identity_mismatch").is_err());
        }
    }

    #[test]
    fn runtime_role_requires_every_exact_flag_and_zero_memberships() {
        type Mutation = fn(&mut RoleRow);
        let mutations: &[Mutation] = &[
            |role| role.can_login = false,
            |role| role.is_superuser = true,
            |role| role.can_create_database = true,
            |role| role.can_create_role = true,
            |role| role.inherits = true,
            |role| role.can_replicate = true,
            |role| role.bypasses_rls = true,
            |role| role.membership_count = 1,
            |role| role.name = "unexpected".into(),
        ];

        validate_runtime_role(&restricted_runtime_row())
            .expect("the exact runtime posture is valid");
        for mutate in mutations {
            let mut row = restricted_runtime_row();
            mutate(&mut row);
            assert!(validate_runtime_role(&row).is_err());
        }
    }

    /// A cluster that has applied `0009` must still be attestable.
    ///
    /// `0009_rename_runtime_roles` renames `ptr_clone_app` -> `tradingroom_app`. `db::migrate`
    /// learned to accept both names on 2026-08-11; this binary did not, and nothing caught it
    /// because the name only appears in a live-database check. Left alone it would have refused
    /// every migrated cluster with `runtime_role_mismatch` — a message that reads like a security
    /// finding rather than a stale pin, which is the expensive way to be wrong.
    ///
    /// The posture half is deliberately re-asserted under the NEW name too: a rename must not buy a
    /// role a single capability, so `BYPASSRLS` on `tradingroom_app` has to fail exactly as it does
    /// on `ptr_clone_app`.
    #[test]
    fn the_runtime_role_is_accepted_under_either_name_but_never_with_a_weaker_posture() {
        let mut renamed = restricted_runtime_row();
        renamed.name = RENAMED_RUNTIME_ROLE.into();
        let evidence =
            validate_runtime_role(&renamed).expect("a migrated cluster must still be attestable");
        assert_eq!(evidence.name, RENAMED_RUNTIME_ROLE);

        for name in [EXPECTED_RUNTIME_ROLE, RENAMED_RUNTIME_ROLE] {
            let mut row = restricted_runtime_row();
            row.name = name.into();
            row.bypasses_rls = true;
            assert!(
                validate_runtime_role(&row).is_err(),
                "{name} must not pass with BYPASSRLS"
            );
        }

        // And no third name is smuggled in by the tolerance.
        let mut impostor = restricted_runtime_row();
        impostor.name = "tradingroom_app_v2".into();
        assert!(validate_runtime_role(&impostor).is_err());
    }

    /// The embedded migration pin had no test, and that cost 25 minutes to discover.
    ///
    /// `services/` was reconciled with the sibling room repository, which promoted two migrations
    /// the attestor had never been told about. Nothing failed at compile time, nothing failed in
    /// `cargo test`, and the contract only broke in CI — after a full dependency build, against a
    /// live database, at the very end of the job.
    ///
    /// This asserts the same thing the release gate does, in microseconds. If a migration is added
    /// without extending `ATTESTED_MIGRATION_VERSIONS`, it fails here first.
    #[test]
    fn the_embedded_migration_pin_matches_the_migrations_on_disk() {
        validate_embedded_migration_contract()
            .expect("ATTESTED_MIGRATION_VERSIONS must list exactly the embedded migrations");

        let embedded: Vec<i64> = MIGRATOR
            .migrations
            .iter()
            .map(|migration| migration.version)
            .collect();
        assert_eq!(
            embedded, ATTESTED_MIGRATION_VERSIONS,
            "a migration was added or removed without extending the attested chain"
        );
    }

    #[test]
    fn owner_capabilities_are_reported_without_assuming_a_provider_superuser_model() {
        let managed_owner = RoleRow {
            name: EXPECTED_MIGRATOR_ROLE.into(),
            can_login: true,
            is_superuser: false,
            can_create_database: false,
            can_create_role: true,
            inherits: false,
            can_replicate: false,
            bypasses_rls: false,
            membership_count: 0,
        };
        let evidence = validate_owner_role(&managed_owner).expect("managed owner is portable");
        assert_eq!(evidence.elevated_capabilities, ["CREATEROLE"]);
        assert!(evidence.operator_review_required);

        let mut member_owner = managed_owner;
        member_owner.membership_count = 1;
        assert!(validate_owner_role(&member_owner).is_err());
    }

    #[test]
    fn exact_acl_fixture_accepts_only_the_migration_0006_matrix() {
        let (table_rows, mut column_rows) = exact_acl_rows();
        let evidence = validate_acl_rows(&table_rows, &column_rows)
            .expect("the migration 0006 matrix is valid");
        assert_eq!(evidence.objects.len(), 3);
        assert!(
            evidence
                .objects
                .iter()
                .all(|object| object.table_privileges.is_empty())
        );

        let promoted = column_rows
            .iter_mut()
            .find(|row| {
                row.table_name == "users"
                    && row.column_name == "is_platform_admin"
                    && row.privilege_type == "UPDATE"
            })
            .expect("platform-admin update row exists");
        promoted.granted = true;
        assert_eq!(
            validate_acl_rows(&table_rows, &column_rows)
                .expect_err("an added privilege must fail closed")
                .code,
            "runtime_acl_mismatch"
        );
    }

    #[test]
    fn json_and_text_rendering_are_deterministic_and_connection_secret_free() {
        let (table_rows, column_rows) = exact_acl_rows();
        let evidence = fixture_evidence(
            validate_acl_rows(&table_rows, &column_rows).expect("valid ACL fixture"),
        );

        let json_first = render_evidence(&evidence, OutputFormat::Json).expect("render JSON");
        let json_second = render_evidence(&evidence, OutputFormat::Json).expect("render JSON");
        let text_first = render_evidence(&evidence, OutputFormat::Text).expect("render text");
        let text_second = render_evidence(&evidence, OutputFormat::Text).expect("render text");

        assert_eq!(json_first, json_second);
        assert_eq!(text_first, text_second);
        for rendered in [&json_first, &text_first] {
            assert!(!rendered.contains("postgres://"));
            assert!(!rendered.contains("do-not-print"));
            assert!(!rendered.contains("database.internal"));
            assert!(!rendered.contains("scram-sha-256"));
            assert!(rendered.contains(REDACTED_AUTH_METHOD));
            assert!(rendered.contains("checksum_sha384"));
            assert!(rendered.contains("operator_review_required"));
        }
    }

    fn exact_acl_rows() -> (Vec<TablePrivilegeRow>, Vec<ColumnPrivilegeRow>) {
        let expected_objects = [
            ("enterprises", ENTERPRISE_COLUMNS),
            ("users", USER_COLUMNS),
            ("audit_log", AUDIT_LOG_COLUMNS),
        ];
        let table_rows = expected_objects
            .iter()
            .flat_map(|(table_name, _)| {
                TABLE_PRIVILEGE_TYPES
                    .iter()
                    .map(move |privilege| TablePrivilegeRow {
                        table_name: (*table_name).to_owned(),
                        privilege_type: (*privilege).to_owned(),
                        granted: false,
                    })
            })
            .collect();
        let column_rows = expected_objects
            .iter()
            .flat_map(|(table_name, columns)| {
                columns.iter().flat_map(move |column_name| {
                    let expected = expected_column_privileges(table_name, column_name);
                    COLUMN_PRIVILEGE_TYPES
                        .iter()
                        .map(move |privilege| ColumnPrivilegeRow {
                            table_name: (*table_name).to_owned(),
                            column_name: (*column_name).to_owned(),
                            privilege_type: (*privilege).to_owned(),
                            granted: expected.iter().any(|allowed| allowed == privilege),
                        })
                })
            })
            .collect();
        (table_rows, column_rows)
    }

    fn fixture_evidence(effective_acl: AclEvidence) -> AttestationEvidence {
        let connection = |role: &str| ConnectionEvidence {
            expected_role: role.into(),
            system_user: RedactedSystemUserEvidence {
                authentication_method: REDACTED_AUTH_METHOD,
                identity: role.into(),
                exact_match: true,
            },
            session_user: role.into(),
            current_user: role.into(),
        };
        let owner_flags = RoleFlags {
            login: true,
            superuser: true,
            create_database: true,
            create_role: true,
            inherit: true,
            replication: true,
            bypass_rls: true,
        };

        AttestationEvidence {
            attestation_version: ATTESTATION_VERSION,
            status: "pass",
            postgres: PostgresEvidence {
                required_major: REQUIRED_POSTGRES_MAJOR,
                server_version_num: 170_010,
                owner_and_runtime_versions_match: true,
                owner_and_runtime_database_match: true,
                owner_and_runtime_cluster_match: true,
            },
            owner_connection: connection(EXPECTED_MIGRATOR_ROLE),
            runtime_connection: connection(EXPECTED_RUNTIME_ROLE),
            owner_role: OwnerRoleEvidence {
                name: EXPECTED_MIGRATOR_ROLE.into(),
                elevated_capabilities: elevated_capabilities(&owner_flags),
                flags: owner_flags,
                direct_membership_count: 0,
                capability_enforcement: "reported_for_operator_review_not_provider_normalized",
                operator_review_required: true,
            },
            runtime_role: RuntimeRoleEvidence {
                name: EXPECTED_RUNTIME_ROLE.into(),
                flags: restricted_runtime_row().flags(),
                direct_membership_count: 0,
                capability_enforcement: "exact_repository_contract",
            },
            migration_ledger: MigrationLedgerEvidence {
                relation: "public._sqlx_migrations",
                exact_repository_chain: true,
                migrations: MIGRATOR
                    .migrations
                    .iter()
                    .map(|migration| MigrationEvidence {
                        version: migration.version,
                        description: migration.description.to_string(),
                        success: true,
                        checksum_sha384: hex::encode(migration.checksum.as_ref()),
                    })
                    .collect(),
            },
            room_events: RoomEventsEvidence {
                relation: "public.room_events",
                owner: EXPECTED_MIGRATOR_ROLE.into(),
                row_level_security_enabled: true,
                row_level_security_forced: true,
                policy: PolicyEvidence {
                    name: "room_events_tenant_isolation".into(),
                    permissive: "PERMISSIVE".into(),
                    command: "ALL".into(),
                    roles: vec![EXPECTED_RUNTIME_ROLE.into()],
                    using_expression: EXPECTED_POLICY_EXPRESSION.into(),
                    with_check_expression: EXPECTED_POLICY_EXPRESSION.into(),
                },
            },
            effective_acl,
            listen_capability: ListenEvidence {
                notification_round_trip_verified: true,
                listener_runtime_identity_verified: true,
                listener_target_verified: true,
                expected_channel_verified: true,
                expected_payload_verified: true,
                owner_sender_verified: true,
                distinct_sender_and_listener_sessions_verified: true,
                listener_session_retained: true,
                cleanup_verified: true,
                endpoint_requirement: "direct_or_session_affine_not_transaction_pooled",
            },
        }
    }
}
