# Original `new-room` backend forensic inventory

Status: **evidence snapshot for the selected Rust/PostgreSQL/mediasoup backend track; not an implementation plan**  
Captured: **2026-08-02 (America/New_York)**  
Original repository: `/Users/billyribeiro/Desktop/new-room`  
Original Git snapshot: branch `main`, commit
`f84bae3e92ed266a762b6cab68afc97bf36b4dcc`  
Audience: engineers and AI agents planning the replacement backend

## 1. Purpose and reading rule

This file records the backend facts present in the original `new-room`
repository: schemas, constraints, tenant isolation, authentication, session and
token handling, RBAC/ABAC, API enforcement, realtime delivery, media admission,
configuration, tests, and verified drift.

The selected backend track is the Rust/Axum/SQLx/PostgreSQL API plus the Rust
mediasoup SFU. It is a different stack from the currently wired
SvelteKit/SQLite reconstruction. Accordingly, every finding belongs to one of
three classes:

1. **Portable contract** — a domain, security, or consistency property that the
   replacement must deliberately preserve or deliberately supersede.
2. **Source-stack mechanism** — how SvelteKit/SQLite, Rust/Axum/SQLx,
   PostgreSQL, or mediasoup currently implements that property.
3. **Observed drift or gap** — conflicting, incomplete, provisional, or unsafe
   behavior that must not become a requirement merely because it exists.

This is an inventory, not migration DDL and not approval of every original
decision. Where the code labels a value as product judgment rather than captured
evidence, this report preserves that distinction.

## 2. Evidence boundary and reproducibility

### 2.1 Repository state

The original worktree was read only. At capture time it was not completely
clean:

- `kebabs/kebab-alert` and `kebabs/kebab-chat` were recorded as deleted.
- `NEXT-STEP/`, `scripts/capture-ptr-reference.js`,
  `scripts/decode-ptr-dump.mjs`, and
  `services/api/src/db/repo/provision.rs` were untracked.
- No tracked backend source file was modified relative to the named commit.

The untracked `provision.rs` is therefore **provisional evidence**, not committed
behavior. It is also not exported by `services/api/src/db/repo/mod.rs` and calls
a nonexistent `Db::begin_untenanted`; it is not compiled or reachable in the
captured source tree.

### 2.2 Evidence hierarchy

When sources disagree, use this order:

1. Running database catalog observed read only on 2026-08-02, for what is
   actually installed locally.
2. Executable migration, runtime, and enforcement code.
3. Tests that exercise those paths.
4. Pinned forensic database artifacts.
5. READMEs, comments, and plans.

Runtime state answers “what is installed here”; source answers “what a fresh
deployment intends.” Both are recorded because migration planning needs both.

### 2.3 Integrity anchors

| Artifact | SHA-256 |
|---|---|
| `services/api/migrations/0001_baseline.sql` | `c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9` |
| `second-dump/db/RECREATE.sql` | `c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9` |
| `services/api/migrations/0002_room_capability_defaults.sql` | `6f45aa701ebbb1f003e955c8fe408692dfce42a09a117fc8838af8d515715d22` |
| `services/api/migrations/0003_room_events.sql` | `4d22501a6899f48bc937a43b98e800657199d1d6b3670d12c2e1c66e7a1d1d40` |
| `services/api/migrations/0004_list_memberships.sql` | `c39e4eb164a527028b1d4d0540fb98994f0b89b705405b1b70b6795776d2c4cc` |
| `second-dump/db/SCHEMA-REFERENCE.md` | `60c05492ef379a283fff95050599dcdc993c17052af974e62b2d97890b587d3a` |
| `second-dump/db/SCHEMA-FULL.sql` | `8ecdae3cb0ee301cc3617472caf2e499912c354726b04af35d32da27ae879d74` |

`pnpm schema:verify` was run against the original repository during this audit
and passed. It verified the exact baseline hashes and the baseline inventory of
23 public domain tables plus the Drizzle migration table, 317 public columns,
167 constraints, 93 indexes, 20 RLS-protected tables, 20 policies, five pinned
`SECURITY DEFINER` helpers, and the intended role/grant contract. Later SQLx
migrations are outside that baseline count and are inventoried below.

## 3. Executive findings

1. The repository contains **two backend generations**, not one:
   a currently wired SvelteKit/SQLite reconstruction and a substantially newer
   Rust/PostgreSQL API plus Rust mediasoup SFU.
2. The PostgreSQL model is the richer enterprise domain model: multi-tenant,
   room-scoped, capability driven, refresh-token based, and realtime. The
   SQLite model is single-room and has no database-enforced tenancy or RLS.
3. The PostgreSQL baseline is cryptographically pinned to the forensic
   reconstruction. Migrations `0002`–`0004` intentionally extend it with
   per-room capability defaults, a transactional realtime outbox, and room-list
   membership discovery.
4. The running PostgreSQL catalog has all four SQLx migrations applied: 24
   public domain tables plus `_sqlx_migrations`, 327 domain columns, 21 tables
   with both `ENABLE` and `FORCE ROW LEVEL SECURITY`, and seven custom
   functions.
5. Tenant isolation and authorization are separate layers. RLS restricts tenant
   visibility; membership and capabilities decide what a member may do.
6. The running application role is `NOBYPASSRLS`, which is essential, but it is
   currently `INHERIT` even though bootstrap DDL intends `NOINHERIT`. It has no
   role memberships at capture time, so the present impact is latent drift.
7. The `room_events` policy is installed for `PUBLIC`, because migration `0003`
   omits `TO ptr_clone_app`. All baseline tenant policies explicitly target the
   application role. The predicate still isolates tenants, but the grant surface
   is broader than intended.
8. The newer auth design uses Argon2id, short Ed25519-signed access tokens, opaque
   rotating refresh-token families with reuse detection, and separate signing
   keys for access tokens and media grants. The legacy path uses scrypt and an
   opaque SQLite session cookie.
9. Authorization is a hybrid RBAC/ABAC model: five room roles establish
   defaults; sixteen capabilities can be overridden per member; mute, global
   mute, PM restriction, and trial expiry suppress otherwise granted rights.
10. Some newer code is incomplete or aspirational: `/enterprise` is documented
    but not routed, Redis is provisioned but unused, platform-admin enforcement
    is not wired to an admin plane, access-token `jti` revocation is only a future
    seam, and tenant provisioning is untracked/uncompilable.

## 4. Runtime topology and authority

| Surface | Storage | Runtime entry | State in captured tree | Authority assessment |
|---|---|---|---|---|
| SvelteKit room reconstruction | SQLite via Better SQLite3 and Drizzle | root `package.json`, `src/hooks.server.ts`, `src/routes/**` | Wired application path | Active reconstruction behavior, but not the enterprise target model |
| Enterprise room API | PostgreSQL 17 via SQLx | `services/api/src/main.rs` | Implemented and tested; separate service startup | **Selected backend track** and richest backend/security contract |
| Media/SFU | In-memory mediasoup state plus signed grants | `services/media/src/main.rs` | Implemented separate Rust service | **Selected media track** and signaling/admission contract |
| Redis | Redis container | `docker-compose.yml` | Provisioned, no code consumer | Planned/unused, not a current correctness dependency |
| Tenant provisioning | PostgreSQL | untracked `services/api/src/db/repo/provision.rs` | Not exported; does not compile against current `Db` | Provisional design only |
| `/enterprise` cutover | Claimed in `services/README.md` | no matching `src/routes/enterprise` | Not wired | Documentation drift |

The SvelteKit app and Rust API are not two adapters over one database. They use
different engines, identifiers, table shapes, role vocabularies, session models,
and room concepts. The decision is to continue with the Rust/PostgreSQL/mediasoup
track. SQLite remains relevant only where it proves legacy behavior or identifies
data that may need migration; it is not the authorization or tenancy model to
carry forward.

## 5. Portable security and consistency contract

These are the strongest stack-neutral properties evidenced by the newer backend.
They are the right starting inputs for the next architecture plan:

- Every tenant-scoped read and write carries one resolved tenant identity.
- Missing tenant context fails closed to zero rows or an equivalent denial.
- A room ID alone never grants access; current user-to-room membership is
  resolved server-side for every room request.
- Tenant isolation does not substitute for permissions. Mutations require an
  explicit effective-capability decision.
- Subject, member, role, display name, presenter status, trial status, and tenant
  identity come from verified server state, never a client payload.
- Private messages are limited to their participants in addition to tenant
  isolation. Any service-level bypass is explicit and auditable.
- Room role defaults are room-owned policy; per-member capability values apply
  only when the override flag is set.
- Time-dependent restrictions take an explicit current time and fail with stable
  machine-readable reasons.
- Password lookup does not reveal whether an account exists through response
  shape or materially different work.
- Password hashes are memory-hard, parameterized, and transparently upgraded
  after successful verification when policy strengthens.
- Refresh tokens are high-entropy bearer values, stored only as hashes, rotated
  atomically, and grouped into revocable families. Reuse revokes the family.
- Access and media credentials use separate signing keys and disjoint claim
  schemas.
- A mutation and its realtime event commit atomically; reconnect replay reads an
  authoritative durable log rather than trusting lossy notifications.
- Authentication credentials, raw invite tokens, private keys, and fixture/live
  secret values never appear in this report, logs, URLs, or persistent plaintext.

## 6. Schema lineage

### 6.1 SQLite reconstruction

The wired SvelteKit runtime opens `DATABASE_URL` as a filesystem path, defaulting
to `.data/proroom.sqlite`, enables WAL and foreign keys, and calls runtime
bootstrap DDL from `src/lib/server/db/index.ts`. The Drizzle TypeScript schema is
`src/lib/server/db/schema.ts`.

The runtime schema has 15 declared tables:

| Table | Declared columns |
|---|---|
| `users` | `id`, `display_name`, `email`, `avatar_url`, `role`, `status`, `password_hash`, `created_at` |
| `messages` | `id`, `room`, `sender_id`, `body`, `is_admin`, `background_color`, `font_color`, `answered`, `reply_to_message_id`, `reply_to_name`, `reply_to_body`, `reactions_json`, `created_at` |
| `alerts` | `id`, `sender_id`, `kind`, `body`, `target_url`, `non_trade`, `is_admin`, `background_color`, `font_color`, `question_count`, `question_answered`, `reactions_json`, `created_at` |
| `alert_questions` | `id`, `alert_id`, `sender_id`, `body`, `answered_at`, `created_at` |
| `shared_files` | `id`, `name`, `kind`, `url`, `size`, `created_at` |
| `user_settings` | `user_id`, `theme`, `room_layout`, `chat_text_size`, `compact_alerts`, `compact_chat`, `do_not_disturb`, `settings_json`, `updated_at` |
| `polls` | `id`, `sender_id`, `question`, `choices_json`, `status`, `created_at`, `ended_at` |
| `poll_answers` | `id`, `poll_id`, `sender_id`, `choice_index`, `created_at` |
| `saved_polls` | `id`, `question`, `choices_json`, `created_by_user_id`, `created_at` |
| `notes` | `id`, `name`, `content_html`, `is_welcome_mat`, `position`, `updated_by_id`, `deleted_at`, `deleted_by_id`, `created_at`, `updated_at` |
| `note_versions` | `id`, `note_id`, `content_html`, `updated_by_id`, `version`, `created_at`, `updated_at` |
| `chat_mutes` | `id`, `target_user_id`, `muted_by_user_id`, `expires_at`, `created_at` |
| `sessions` | `id`, `user_id`, `created_at`, `last_seen_at` |
| `hidden_room_items` | `evidence_key`, `hidden_by_user_id`, `hidden_at` |
| `captured_item_overrides` | `evidence_key`, `answered`, `body`, `reactions_json`, `updated_by_user_id`, `updated_at` |

Key SQLite constraints are unique email, one answer per poll/member, one version
number per note, foreign keys for the declared user/content relationships, and
`ON DELETE CASCADE` only from note versions to notes. There are no checks on role,
status, poll status, JSON shapes, message lengths, or room membership, and there
is no tenant key or database RLS.

SQLite migration authority is fragmented:

- Generated migrations and snapshots stop at `0006`.
- Handwritten `0007_hidden_room_items.sql` and
  `0008_captured_item_overrides.sql` are absent from the Drizzle journal and
  snapshots.
- `alert_questions` and `users.password_hash` have no corresponding migration.
- Runtime bootstrap creates missing tables and conditionally patches columns,
  making `db/index.ts` more authoritative than the migration journal.
- The observed local SQLite database also has undeclared
  `messages.is_question` and `messages.reply_enabled` columns.

These are migration hazards, not portable requirements.

### 6.2 PostgreSQL migration chain

| Migration | Contract |
|---|---|
| `0001_baseline.sql` | Byte-pinned forensic baseline: domain schema, roles, grants, functions, indexes, triggers, and RLS |
| `0002_room_capability_defaults.sql` | Validates and seeds `rooms.config.capabilities.<role>` without rewriting the pinned baseline |
| `0003_room_events.sql` | Adds the append-only transactional realtime outbox, replay indexes, grants, and RLS |
| `0004_list_memberships.sql` | Adds a narrowly scoped `SECURITY DEFINER` resolver for the signed-in user's room list |

The installed PostgreSQL domain contains 24 public tables after `0003`.
`_sqlx_migrations` is migration metadata and is not a domain table. The older
baseline also creates `drizzle.__drizzle_migrations` in a separate schema as
forensic provenance.

<!-- The complete PostgreSQL table, constraint, RLS, function, auth, and API
     catalogs continue below. Keep this comment until the audit is finalized. -->
