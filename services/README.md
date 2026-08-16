# Rust backend services

This directory is an independently deployable Cargo workspace:

| crate | responsibility |
|---|---|
| `api` (`tradingroom-api`) | HTTP and WebSocket API, authentication, tenancy, capabilities, migrations, and realtime event log |
| `media` (`tradingroom-media`) | mediasoup SFU, signaling, and signed-grant admission |

`api` produces the long-running `tradingroom-api` binary and the one-shot
`migrate` binary. The root SvelteKit application does not own this PostgreSQL
schema and must not receive its privileged credentials.

## Local fixture account

There is no signup endpoint yet. `api/fixtures/seed.sql` loads a synthetic,
local-only platform administrator and a two-tenant authorization fixture:

| field | value |
|---|---|
| email | `platform-admin@tradingroom.test` |
| password | `tradingroom-admin-2026` |

The password hash is produced by the same Argon2id implementation used at login,
and `api/tests/login_probe.rs` proves both the successful and wrong-password paths.
Never copy this fixture credential into a deployed environment.

## Local PostgreSQL bootstrap

The checked-in Compose model intentionally provisions PostgreSQL only. There is
no Redis dependency or Redis client in the current workspace, and Redis is not a
correctness dependency for realtime replay, token-family revocation, or local
verification.

1. Create the ignored environment file and restrict its permissions:

   ```sh
   cp services/.env.example services/.env
   chmod 600 services/.env
   ```

2. Fill every blank secret. Generate the two database passwords independently
   with `openssl rand -hex 24`. Generate each private signing key independently
   with `openssl rand -base64 32`; the two values must differ.

3. Derive the SFU's public verification key from the raw media private seed.
   After sourcing `services/.env`, this command prints only the public key; paste
   its output into `MEDIA_GRANT_PUBLIC_KEY`:

   ```sh
   set -a
   source services/.env
   set +a
   node -e 'const {createPrivateKey,createPublicKey}=require("node:crypto");const encoded=process.env.MEDIA_GRANT_PRIVATE_KEY?.trim()??"";const seed=Buffer.from(encoded,"base64");if(seed.length!==32||seed.toString("base64")!==encoded)throw new Error("MEDIA_GRANT_PRIVATE_KEY must be 32 raw bytes in padded standard base64");const prefix=Buffer.from("302e020100300506032b657004220420","hex");const privateKey=createPrivateKey({key:Buffer.concat([prefix,seed]),format:"der",type:"pkcs8"});const {x}=createPublicKey(privateKey).export({format:"jwk"});console.log(Buffer.from(x,"base64url").toString("base64"));'
   ```

4. Start the digest-pinned PostgreSQL 17 service:

   ```sh
   cd services
   docker compose up -d postgres
   docker compose ps
   ```

   The database binds only to `127.0.0.1`. On first initialization, the official
   image creates owner role `ptr_clone`; the mounted provisioner creates
   `ptr_clone_app` with the exact restricted runtime posture, and `0009` provisions
   **`tradingroom_app`** with parity to it — that second role is the one the API binds as. PostgreSQL runs
   `/docker-entrypoint-initdb.d` only when the named volume is empty. Changing
   credentials later does not re-run the provisioner against existing data.

5. Source the local configuration, apply migrations as the owner, then load the
   fixture once into a fresh database:

   ```sh
   set -a
   source .env
   set +a
   cargo run --locked --release -p tradingroom-api --bin migrate
   psql "$MIGRATE_DATABASE_URL" -v ON_ERROR_STOP=1 -f api/fixtures/seed.sql
   ```

6. Run the API and SFU in separate terminals after sourcing the same file:

   ```sh
   cargo run --locked --release -p tradingroom-api --bin tradingroom-api
   cargo run --locked --release -p tradingroom-media --bin tradingroom-media
   ```

The Compose volume survives `docker compose down`. `docker compose down
--volumes` permanently deletes the local database; use it only for an explicitly
disposable fixture reset.

## Credential and role boundaries

Two database URLs represent different privilege levels:

- `MIGRATE_DATABASE_URL` authenticates as database owner `ptr_clone` and is used
  only by the one-shot migrator. The migration boundary requires that exact
  authenticated owner identity; the long-running runtime role cannot alter the
  schema.
- `DATABASE_URL` authenticates the long-running API as **`tradingroom_app`** — the runtime role
  since 2026-08-15, and what `db::migrate::EXPECTED_RUNTIME_ROLE` compares the authenticated
  identity against before binding a listener. `ptr_clone_app` still EXISTS: `0009` provisions the
  new role with exact parity to it rather than renaming it, because a rename would have broken
  every existing deployment's connection string at the moment the migration ran. Before
  binding a listener, the API requires that exact session identity and current
  role, `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT`,
  `NOREPLICATION`, `NOBYPASSRLS`, and zero direct role memberships.

Migration `0006_restrict_runtime_object_privileges.sql` replaces the baseline's
table-wide CRUD on the three highest-risk objects with the SQL surface the API
actually exercises:

| Object | Runtime privilege |
|---|---|
| `enterprises` | `SELECT (id)` only, for the tenant-by-tenant retention sweep |
| `users` | column-scoped login/refresh/preference reads; guest-only insert columns; password-cost, login-time, and preference update columns |
| `audit_log` | column-scoped `INSERT` only; no runtime read, update, or delete |

Before promoting a PostgreSQL target, run the repository-root
`pnpm backend:postgres:attest --format json` command with both URLs injected from
the target secret manager. It emits deterministic redacted evidence only after
PostgreSQL 17, both direct identities, migrations 0001–0006, role posture,
`room_events` RLS/policy, the complete effective ACL matrix, and session-retained
`LISTEN` all pass. The LISTEN proof independently revalidates its third
connection's runtime identity and cluster/database target, requires a backend
session distinct from the owner sender, and proves PID continuity. The exact
input/output and failure contract is maintained in
[`ops/postgres-runtime-role-hardening.md`](../ops/postgres-runtime-role-hardening.md#read-only-release-attestation).

The `users.password_hash` read and update privileges remain because the current
login implementation verifies stored hashes and transparently upgrades weaker
cost parameters. They are an explicit residual of using one runtime database
identity for authentication and application traffic, not permission to update
`is_platform_admin`, identity fields, or arbitrary profile columns.

The API also requires two distinct Ed25519 private seeds:

- `AUTH_TOKEN_PRIVATE_KEY` signs access tokens.
- `MEDIA_GRANT_PRIVATE_KEY` signs short-lived media grants.

The current Rust API parses both as standard Base64 that decodes to exactly 32
raw secret bytes. They are not PEM or PKCS#8 values. The SFU receives only
`MEDIA_GRANT_PUBLIC_KEY`, the corresponding raw 32 public bytes in padded
standard Base64, so a compromised media host cannot mint grants.

`TRUSTED_WEB_ORIGIN`, and `MEDIA_ALLOWED_ORIGIN` in grant-enforcing mode, are
mandatory canonical browser origins such as `https://app.example.com`: scheme, host, and optional non-default
port only, with no path, credentials, query, fragment, wildcard, or trailing
slash. Matching is exact. In particular, `https://app.example.com` does not
trust `https://admin.app.example.com`, and `http://localhost:5173` does not match
`http://127.0.0.1:5173`. Use HTTP only for loopback development.

The API requires that exact Origin for cookie-authenticated unsafe methods and
for the authenticated room-events WebSocket. `Sec-Fetch-Site`, when a browser
sends it, must independently be `same-origin`; `same-site` is intentionally not
enough. Headerless GET probes to `/healthz`, `/readyz`, and `/metrics` remain
available to non-browser infrastructure.

The SFU applies the same exact-origin check before accepting `/ws` in every
grant-enforcing deployment. Its HTTP request spans contain only a bounded route
label and method; the grant-bearing query string is never admitted to tracing.

The live Stage 1 host runs repository revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6` as immutable image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
That revision contains this exact-origin implementation. It predates the
announced-address enforcement added after merged-main revision `9968bd6…`, so
the new enforcement remains source and CI work until a separately approved
deployment-by-digest promotion.

`MEDIA_ALLOW_ANONYMOUS` is off when absent or blank. Secure admission refuses to
start without `MEDIA_GRANT_PUBLIC_KEY`; explicitly anonymous local mode accepts
only `1` or `true` and refuses to coexist with a configured public key. Anonymous
local mode may omit `MEDIA_ALLOWED_ORIGIN`, deliberately permitting missing
Origin headers for local tools; if it is set, exact-origin enforcement remains
active. Anonymous mode also fails startup unless both its signaling bind and
announced address are loopback, so the admission bypass cannot expose a
network-reachable SFU. Signed-grant admission remains available with the checked-in local
loopback bind and loopback announced address. That exception requires both
addresses to be loopback; once signaling binds externally, signed-grant mode
requires a publicly routable announced address and fails closed on private,
loopback, or special-use values.

`TRUSTED_PROXY_HOPS` is also a deployment topology contract, not a tuning value.
Keep it at `0` only when clients connect directly to the API listener; then every
`X-Forwarded-For` value is ignored and the kernel peer address is authoritative.
Behind a proxy, set the exact number of owned hops and prove the deployed header
chain. Too high permits address spoofing; too low collapses users onto a proxy
address and corrupts IP-keyed rate limiting and audit data.

## Managed PostgreSQL compatibility gate

Do not select a managed PostgreSQL product from a generic compatibility label.
Before adoption, prove all of these current service requirements on the exact
plan and connection path:

- PostgreSQL 17 exposes `system_user` and preserves the authenticated owner and
  runtime identities used by the fail-closed preflight checks;
- both promotion connections may execute `pg_control_system()` so the attestor
  can prove they reach one cluster without emitting its system identifier;
- the migration identity can create/alter the exact roles, inspect and lock
  `pg_catalog.pg_authid`, inspect `pg_auth_members`, and apply the required role,
  ownership, RLS, function, and object-privilege DDL;
- migrations connect directly as the exact database owner, while the long-lived
  API connects directly as the membership-free restricted runtime role; and
- the API can hold a dedicated long-lived `PgListener` connection. A
  transaction-only pooler cannot carry PostgreSQL `LISTEN` and is therefore not
  a compatible endpoint for this process.

If a provider withholds any of those capabilities, change the reviewed database
identity/migration architecture before deployment; do not weaken the checks or
silently adopt pre-existing schema.

## Running and building

After migration and fixture loading, use the restricted runtime URL for the full
database-backed suite:

```sh
cd services
set -a
source .env
set +a
cargo fmt --all -- --check
cargo clippy --locked --workspace --all-targets --features testing -- -D warnings
cargo test --locked --workspace --features testing
```

Container build contexts are the workspace directory, not a crate directory:

```sh
docker build -f services/api/Dockerfile -t tradingroom-api:local services
docker build -f services/media/Dockerfile -t tradingroom-media:local services
```

The API image contains both server and migrator binaries, but credential
separation remains structural at deployment: the one-shot migration job receives
only the owner URL, and the long-running API receives only the runtime URL.

From the repository root, the deterministic non-database backend gates are:

```sh
pnpm backend:migrations:verify
pnpm backend:check
pnpm backend:advisories
pnpm backend:licenses
pnpm quality
```

`pnpm backend:check` verifies all pinned migration bytes, formatting, locked binary
compilation, the media library suite, and compilation of all API tests. It does
not claim PostgreSQL execution. `.github/workflows/backend-quality.yml`
provisions the same digest-pinned PostgreSQL 17 image, applies roles and
migrations, loads the fixture, denies every Clippy warning, and runs the complete
workspace suite against real RLS.

`pnpm backend:advisories` and `pnpm backend:licenses` are separate RustSec and
resolved-license/source policy gates. `pnpm quality` includes the backend
migration-byte and complete `services/**` provenance verifier but does not
subsume `backend:check`, those supply-chain gates, or PostgreSQL execution.

The 2026-08-02 local baseline passed 155 API library tests, 116 API PostgreSQL
integration tests, and 110 media library tests. This hardening branch also passes
8 release-attestor tests and 9 media binary-policy tests. Exact merged-main
revision `9968bd6b035656d503711504564651559c17e868` passed hosted backend run
[`30776711733`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776711733).
Those results prove their named revisions and gates; they are not a
deployed-API/PostgreSQL or current-branch runtime claim.

## Core invariants

### Tenancy is structural

Every tenant-scoped table uses `ENABLE` plus `FORCE ROW LEVEL SECURITY`. Policies
compare `enterprise_id` with transaction-local tenant GUCs. An unset GUC matches
zero rows. Repository functions require `&mut TenantTx`; handlers cannot obtain a
raw tenant-bearing connection or an unscoped pool transaction.

Migration `0005_harden_runtime_role_and_room_events_policy.sql` narrows the
`room_events` policy to `ptr_clone_app` and enforces the complete role posture
described above. **That name is correct and permanent in the shipped migration** —
migrations are forward-only and editing one changes its checksum, so every applied
database would refuse to migrate. `0009` extends the same posture to
`tradingroom_app`; `ops/naming-provenance.md` is the mapping, and the two names
being true at once is the point of that table. The bootstrap provisioner, migration, and pre-bind runtime check
are intentionally redundant controls at different lifecycle boundaries.

Migration `0006_restrict_runtime_object_privileges.sql` then revokes the
baseline's broad table and column grants on `enterprises`, `users`, and
`audit_log` before granting the reviewed column matrix above. PostgreSQL 17
integration tests inspect every column privilege and execute both permitted API
statements and denied enterprise rewrite, platform-admin promotion, identity
delete, and audit read/update/delete attempts.

### Authorization is obtained per request

`RoomMember` resolves current membership and effective capabilities before a
room handler can access tenant data. Tenant isolation is not authorization: room
membership, role defaults, overrides, mute state, and trial state are evaluated
separately.

### Events commit before fan-out

Mutations write `room_events` in the same PostgreSQL transaction as domain data.
The in-memory hub is a bounded accelerator, never the source of truth. Each API
instance listens for pointer-only PostgreSQL notifications, re-reads the event
under RLS, and clients replay durable gaps from PostgreSQL.

An in-process job runs hourly and deletes events older than seven days, once per
tenant under `TenantTx`. Multiple API instances may run the idempotent sweep
concurrently; alerting and operational metrics for that job are still deployment
work.

### Historic migrations are immutable

`0001_baseline.sql` is the imported forensic baseline. Imported migrations
`0001` through `0004` and reviewed forward migrations `0005` and `0006` are byte-pinned by
`scripts/verify-backend.mjs`; the baseline hash is independently embedded in
`api/src/db/migrate.rs`. Never edit an applied migration. Add a forward-only
migration and update its evidence contract in the same reviewed change.

## Honest boundaries

- The live Stage 1 mediasoup service is the independently health-checked
  `0a97fb1…` image recorded in `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`; later service
  changes on this branch have not been deployed. Its statically linked OpenSSL
  3.0.8 dependency blocks production promotion even though the local RustSec
  gate and current-source smoke evidence pass their narrower contracts.
- The Rust API and PostgreSQL control plane are not deployed or connected to the
  Vercel frontend. The current Svelte browser client is not wired to the Rust
  media-session contract.
- The frontend remains in its documented fail-closed `marketing-only` mode.
  There is no implemented `/enterprise` cutover route in this repository.
- Rate-limit state is intentionally per API process. PostgreSQL owns refresh
  token-family rotation and revocation. Redis is neither provisioned here nor
  represented as implemented.
- Tenant self-service provisioning, production secret delivery, managed
  PostgreSQL selection, API TLS/routing, application error monitoring, and a
  rehearsed API/database rollback remain production-cutover work.
- Hosted backend proof exists for exact default-branch revision `9968bd6…` in
  run `30776711733`. Each later revision still requires its own protected hosted
  result; success for that revision is not transferable evidence.
