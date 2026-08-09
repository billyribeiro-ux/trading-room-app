# PostgreSQL runtime-role, object-privilege, and RLS hardening

Status: implemented and locally proven on disposable PostgreSQL 17; target-environment migration remains a promotion action

Scope: `services/api` migrator/runtime identities, high-risk object ACLs, and
`public.room_events` RLS policy targeting

## Hard evidence and defect

- The byte-pinned baseline contains `IF NOT EXISTS` branches that create both
  database roles with literal `CHANGE_ME_*` passwords. Those bytes are immutable
  forensic evidence, but allowing either branch to execute would silently install a
  known credential.
- The pinned baseline creates `ptr_clone_app` as `NOSUPERUSER`, `NOCREATEDB`,
  `NOCREATEROLE`, `NOBYPASSRLS`, and `NOINHERIT`, and every baseline tenant policy
  names that role explicitly.
- `services/api/migrations/0003_room_events.sql` enabled and forced RLS, but its
  `room_events_tenant_isolation` policy omitted `TO ptr_clone_app`.
- The pinned baseline granted table-wide `SELECT`, `INSERT`, `UPDATE`, and
  `DELETE` on `enterprises`, `users`, and `audit_log`. Current Rust SQL reads
  only `enterprises.id`; uses a bounded set of `users` columns for
  login/refresh/preferences and guest creation; and only appends to `audit_log`.
  The broader privileges allowed enterprise rewrites, platform-admin mutation,
  identity deletion, and audit-evidence alteration without any application path
  requiring them.
- PostgreSQL 17 documents that a policy with no named role applies to `PUBLIC`, that
  superusers and `BYPASSRLS` roles bypass RLS, and that policy role membership follows
  normal inheritance rules:
  <https://www.postgresql.org/docs/17/ddl-rowsecurity.html>.
- PostgreSQL 17 also documents two membership privilege paths: `INHERIT` can activate
  privileges automatically and `SET ROLE` can activate a membership whose `SET` option
  is true. `SET` defaults to true; the role's `INHERIT` attribute supplies the default
  for a new membership's `INHERIT` option:
  <https://www.postgresql.org/docs/17/role-membership.html> and
  <https://www.postgresql.org/docs/17/sql-grant.html>.
- `pg_auth_members` is the cluster-wide catalog of direct membership edges:
  <https://www.postgresql.org/docs/17/catalog-pg-auth-members.html>.

Standard table grants already limited `room_events` to `ptr_clone_app`, so the missing
policy target was not by itself an observed data leak. It was still a latent privilege
expansion: a later table grant to another role would also activate the `PUBLIC` policy.

## Implemented invariant

Migration `0005_harden_runtime_role_and_room_events_policy.sql` is forward-only and
preserves all table data. It:

1. resets `ptr_clone_app` to the restricted login attributes without changing its
   password;
2. refuses to proceed if that login has any direct role membership, rather than
   silently revoking an operator-created relationship; and
3. replaces the outbox policy with one explicit `AS PERMISSIVE FOR ALL TO
   ptr_clone_app` policy using the unchanged tenant `USING` and `WITH CHECK`
   expressions.

Migration 5's immutable SHA-256 is
`f7e9e175a58788fbdd2f9f606a899b03bc24abaa463ce7764ae8a99a445e9e67`.

Migration `0006_restrict_runtime_object_privileges.sql` is also forward-only
and data-preserving. It revokes both relation-wide and column grants before
installing this reviewed matrix:

| Object | Effective `ptr_clone_app` privilege |
|---|---|
| `enterprises` | `SELECT (id)` |
| `users` | `SELECT` on `id`, `email`, `password_hash`, `display_name`, `is_platform_admin`, `preferences`, `is_guest`; guest-creation `INSERT` columns; `UPDATE` on `password_hash`, `last_login_at`, `updated_at`, `preferences` |
| `audit_log` | `INSERT` on the nine columns written by `repo::moderation::audit`; no read, update, or delete |

Migration 6's immutable SHA-256 is
`e0406134d8f460bd7d2e83d650cd15735228136c3d73d6c46e1d264b570cfd27`.
The root `pnpm backend:migrations:verify` gate pins both reviewed forward
migrations together with the four imported migrations and rejects an added,
removed, renamed, or modified migration until the manifest is deliberately
reviewed and updated.

`users.password_hash` remains readable and updateable because login verifies the
stored hash and performs a best-effort cost upgrade after successful
authentication. That is the least privilege compatible with the current single
runtime-identity SQL design, but it remains an explicit credential-compromise
residual. Removing it safely requires a separate authentication database
identity or a reviewed change to the transparent-rehash contract.

Because roles are shared across every database in a cluster, migration 5 takes a short,
self-exclusive `SHARE ROW EXCLUSIVE` lock on `pg_authid` before inspecting or changing
the role. Parallel scratch-database migration runs reproduced PostgreSQL's `tuple
concurrently updated` failure without serialization. PostgreSQL documents `pg_authid` as
cluster-wide and this lock mode as self-exclusive while still permitting ordinary reads:
<https://www.postgresql.org/docs/17/catalog-pg-authid.html> and
<https://www.postgresql.org/docs/17/explicit-locking.html>.

The no-membership rule is intentionally stronger than inspecting membership options.
Every indirect role path starts with a direct `pg_auth_members` edge, and this service
has no evidence-backed need for any such edge. Rejecting all of them closes automatic
inheritance and `SET ROLE` paths with one auditable invariant.

`migrate::preflight` is the fail-closed boundary in front of the immutable baseline.
The migration binary calls it once before execution. Through one
acquired connection it requires PostgreSQL 17's `system_user` authentication-cycle
identity to name `ptr_clone`, and independently requires both mutable SQL identities,
`session_user` and `current_user`, to equal `ptr_clone`. A superuser that authenticates
under another identity and then runs `SET SESSION AUTHORIZATION` or `SET ROLE` is
rejected. PostgreSQL documents that `system_user` preserves the authentication method
and presented identity, while a superuser can change `session_user`:
<https://www.postgresql.org/docs/17/functions-info.html>. The preflight then requires
`ptr_clone_app` to already exist with
`LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`,
`NOREPLICATION`, `NOBYPASSRLS`, and zero direct memberships. A missing role or any
posture drift stops the process before SQLx creates a migration ledger or executes
migration 1. Provisioning therefore remains an explicit prerequisite; migration never
falls back to the baseline's known placeholder credentials.

Baseline adoption is prohibited. The former table-name-only check could not prove exact
columns, types, constraints, indexes, functions, triggers, grants, ownership, or RLS policy
semantics, so it could manufacture a successful migration record for a divergent schema.
There is no `--adopt` CLI option, no reusable adoption function, and no call to SQLx's
migration-skip primitive. Because no API/PostgreSQL production deployment exists yet, every
environment must start from an empty database and execute the immutable chain. A database
that already has objects but lacks the authentic SQLx ledger is rejected by ordinary
migration collisions; it is never silently accepted.

`Db::assert_runtime_role_is_restricted` repeats the invariant before the HTTP listener
binds. It requires the evidence-backed `ptr_clone_app` login, validates the authenticated
`session_user`, rejects a different `current_user`, rejects
administrative/replication/RLS-bypass attributes, rejects `INHERIT`, and rejects any
direct membership. Errors expose only the login role and a static reason; membership
names and credentials never enter application logs or HTTP
responses. The PostgreSQL bootstrap script enforces the same posture on new local
clusters and refuses a different `POSTGRES_APP_USER`, because the grants and policies in
the migration set explicitly name `ptr_clone_app`.

## Verification and promotion

Deterministic checks that do not need a database:

```bash
cd services
cargo fmt --all -- --check
cargo test --locked -p tradingroom-api --features testing --test migrations \
  runtime_object_privileges_match_the_current_api_sql_surface
cargo check --locked --workspace --bins
```

The migration and runtime integration boundary requires an isolated PostgreSQL 17
instance with the repository's provisioner and seed loaded:

```bash
cd services
MIGRATE_DATABASE_URL='postgres://ptr_clone:<owner-password>@127.0.0.1:5432/ptr_clone' \
  cargo test --locked -p tradingroom-api --features testing --test migrations
DATABASE_URL='postgres://ptr_clone_app:<runtime-password>@127.0.0.1:5432/ptr_clone' \
  cargo test --locked -p tradingroom-api --features testing --test tenancy
```

### Read-only release attestation

`postgres-release-attestation` turns the promotion requirements into one
provider-neutral, fail-closed executable check. It uses only PostgreSQL 17
catalogs and the repository-pinned SQLx client; it has no cloud-provider API or
un-pinned database client dependency. Supply both URLs through the environment,
never as command arguments:

```bash
set -a
source services/.env # or inject the same two variables from the target secret manager
set +a
umask 077
pnpm --silent backend:postgres:attest --format json > postgres-release-attestation.json
# Human-readable output from the identical evidence model:
pnpm backend:postgres:attest --format text
```

`MIGRATE_DATABASE_URL` must be a direct connection that authenticates as
`ptr_clone`; `DATABASE_URL` must be a direct or session-affine connection that
authenticates as `ptr_clone_app`. A transaction-pooling endpoint is invalid for
the runtime URL because the application requires session-retained `LISTEN`
state. The attestor proves this by issuing `LISTEN`, recording that listener's
exact runtime identity, target cluster/database, and backend PID internally,
subscribing to a unique random channel, proving the owner and listener use
distinct backend sessions, having the already-verified owner session send a
unique random `pg_notify`, receiving the exact channel/payload from the exact
sender, proving the listener PID did not change across receipt and cleanup, then issuing
`UNLISTEN` and confirming the channel is gone. PIDs, channel names, payloads, and
cluster identifiers never enter output. The probe changes no table, role,
policy, grant, or migration state; PostgreSQL notifications are transient
session traffic.

All catalog reads run inside repeatable-read, read-only transactions; only the
bounded session-level LISTEN/NOTIFY/UNLISTEN proof runs afterward. Evidence is
assembled completely before stdout is written. Any connection, query, identity,
version, checksum, policy, ACL, or LISTEN mismatch exits nonzero and emits only a
static stage/reason on stderr. SQLx error text is deliberately not forwarded.
Consequently a URL, password, host, database name, certificate subject, or raw
authentication method cannot enter the artifact or failure log.

The deterministic JSON/text model intentionally omits timestamps, backend PIDs,
provider identifiers, and endpoints. It records:

- PostgreSQL major 17, the exact numeric server version seen by both URLs, and
  proof from `pg_control_system().system_identifier` that both connections reach
  the same cluster (the identifier itself is never emitted);
- redacted `system_user` evidence plus exact `session_user`/`current_user` for
  both connections, and proof that both URLs name the same database;
- the complete owner-role flag set, `LOGIN`, and zero direct memberships;
- the exact membership-free runtime posture;
- only successful SQLx ledger versions `0001`–`0006`, with descriptions and
  embedded SHA-384 checksums matching this build;
- `room_events` ownership, enabled/forced RLS, and the single exact
  `PERMISSIVE FOR ALL TO ptr_clone_app` tenant policy including both expressions;
- every allowed and denied table/column privilege in migration 0006's effective
  ACL universe; and
- the actual listener's exact runtime identity and target, distinct owner/listener
  backend sessions, an exact owner-to-runtime notification round trip, listener
  backend continuity, and cleaned-up LISTEN session state.

The owner is portable across managed PostgreSQL providers: exact flags are
reported, but provider-specific `SUPERUSER`/`CREATEDB`/`CREATEROLE`/`INHERIT`/
`REPLICATION`/`BYPASSRLS` values are not silently normalized into the local
Docker superuser model. `capability_enforcement` therefore says
`reported_for_operator_review_not_provider_normalized`, and
`elevated_capabilities` plus `operator_review_required` make the release review
explicit. Exact owner identity, `LOGIN`, and zero memberships still fail closed.
The runtime flags are not provider-variable and must match the repository
contract exactly.

This artifact is the promotion evidence for successful versions 5 and 6, the
exact policy target, role postures, zero memberships, effective ACL matrix, and
LISTEN-capable runtime endpoint. Retain the earlier migrator log as separate
evidence that the identity/runtime-role preflight passed before migration
execution; this read-only tool does not manufacture migration history.

The configured backend workflow also initializes a second PostgreSQL 17 service
with the same database and role names and the same migration chain. It then mixes
the first cluster's owner URL with the second cluster's runtime URL and requires
an empty stdout plus the static `target_cluster_mismatch` failure. This is a real
two-cluster negative control, not an inference from different database names.
Protected hosted execution evidence for this branch remains pending until the
workflow passes on its exact revision.

Layered local verification on 2026-08-02 (counts name their exact gate rather
than implying that an earlier database suite was rerun after every later source
addition):

- `cargo fmt --all -- --check`: passed;
- `cargo clippy --locked --workspace --all-targets --features testing -- -D warnings`:
  passed;
- `cargo check --locked --workspace --bins`: passed;
- focused migration-module unit tests: 5 passed;
- migration integration tests: 12 passed against a disposable PostgreSQL 17 instance;
  the suite also created and dropped its own baseline scratch databases. Coverage includes
  exact migrator identity, absent/unsafe/runtime membership rejection, immutable
  authentication identity after `SET SESSION AUTHORIZATION`, executable CLI rejection of
  the removed adoption flag, read-only preflight ordering, rejection of an existing schema
  with no authentic ledger, policy-role, object-privilege, and role-catalog assertions;
- runtime tenancy integration tests: 10 passed, including the complete role-posture gate
  and unscoped `room_events` default-deny check;
- the complete API suite passed against that instance: 155 unit tests plus 116 integration
  tests, including 21 real-HTTP authentication tests and all 12 migration tests;
- `pnpm backend:check` passed its six-migration integrity pin, formatting, locked workspace
  build, 110 media tests, and API target compilation;
- the release-attestor binary's 8 focused tests passed, including deterministic
  secret-free rendering and same-name/different-cluster rejection;
- a newly initialized disposable PostgreSQL 17.10 database passed the complete
  version, identity, role, six-migration ledger, RLS/policy, effective-ACL,
  cluster-identity, listener-identity/target, distinct-session, and live
  owner-to-runtime LISTEN/NOTIFY/UNLISTEN attestation;
- a second independently initialized PostgreSQL 17.10 cluster with the same
  database and role names provided the negative control: mixed owner/runtime
  URLs exited 1 with empty stdout and static `target_cluster_mismatch`;
- root `pnpm quality` passed zero-warning Svelte diagnostics, all 89 Vitest tests,
  20 Playwright tests, every repository contract, and the Vercel production build; and
- provisioner `bash -n`: passed.

The pre-existing local `ptr_clone` database was deliberately not migrated during this
work. A read-only ledger query after the scratch suites showed successful versions
`1,2,3,4` and neither version 5 nor 6. Production/local fixture application remains an explicit
promotion action, never an incidental test side effect.

## Failure and recovery

- If migration 5 fails on a membership, inspect the named role out of band, review why
  it exists, and explicitly revoke the membership only after confirming it is not a
  required operator path. Then rerun migrations. The migration does not guess.
- If startup rejects role drift, keep the instance out of service, correct the role or
  connection identity, and restart. Do not bypass the assertion.
- If migration preflight rejects the owner identity, use the dedicated `ptr_clone`
  credential directly; do not authenticate as another superuser and use `SET ROLE`. If
  it reports a missing or unsafe runtime role, rerun the reviewed role provisioner with
  environment-supplied credentials, inspect the posture, and only then rerun migration.
- If a database already contains application objects but lacks successful SQLx ledger rows,
  do not insert or skip migration records. No deployed environment currently requires
  preservation: recreate an empty database and run the migration chain. Any future
  preservation requirement needs a separately reviewed, comprehensive schema-provenance
  procedure; table-name presence is not evidence.
- Do not edit or roll back an applied migration. If a production correction is needed,
  add the next forward migration. Migrations 5 and 6 run transactionally, so a policy or
  ACL replacement failure rolls back instead of leaving a partially applied state.
