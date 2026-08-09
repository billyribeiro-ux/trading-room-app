# ProTradingRoom — whole-product reference

**Compiled:** 2026-08-03
**Purpose:** one place to look up what exists across the whole product.

## How to read this document

This is an **inventory**, not a certification. Nothing here asserts that a
component works correctly in production. Every line is tagged:

| Tag     | Meaning                                                                  |
| ------- | ------------------------------------------------------------------------ |
| **[M]** | Measured in this workspace on 2026-08-03 by the command shown            |
| **[C]** | Cited from a repository document, with the file named                    |
| **[R]** | Read directly from source, with `file:line`                              |
| **[U]** | Unverified — recorded because it is believed true, and named as untested |

Anything marked **[U]** must not be treated as proven. §8 lists what needs a
test run before shipping.

---

## 1. The product, and the two folders

One product: a SaaS trading-room platform. A customer signs up, gets a room, and
administers it; participants join that room for live chat, alerts, polls, notes
and media.

It currently lives in two working folders:

| Folder                       | Git remote                         | HEAD                                           | Role                                                 |
| ---------------------------- | ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `~/Desktop/new-room`         | `billyribeiro-ux/new-room`         | `f84bae3` on `main` (2026-08-01 12:44) **[M]** | The room application + the Rust backend source       |
| `~/Desktop/new-room-control` | `billyribeiro-ux/trading-app-main` | `8c6ee34` (2026-08-03 18:24) **[M]**           | The SaaS control plane (account/room administration) |

### 1.1 The repository question is already decided

`new-room-control/docs/decisions/0003-vercel-rust-postgresql-control-plane.md`,
status **accepted**, dated 2026-08-02 **[C]**:

> The product will use one source repository with independently deployable
> surfaces. The exact tracked Rust service tree will be imported as a reviewed
> follow-up slice; the untracked provisioning prototype will not be imported.

So the target is **one repository, several deployable surfaces**. The two folders
today are a transitional state, not the intended end state.

### 1.2 How the two are coupled — and where they have diverged

The Rust `services/**` tree was authored in `new-room` and imported into
`new-room-control`. From `new-room-control/ops/backend-import-provenance.md` **[C]**:
source commit `f84bae3e92ed266a762b6cab68afc97bf36b4dcc`, 86 tracked
`services/**` files, sorted path-list SHA-256 `427e200c…`, path-and-content
manifest SHA-256 `8265dc32…`, imported with `git archive` so untracked and
modified ambient files were not eligible.

**That seal describes the import, not the present.** The two trees are no longer
the same **[M]**:

|                                     | `new-room` | `new-room-control` |
| ----------------------------------- | ---------- | ------------------ |
| Tracked `services` files            | 87         | **93**             |
| Rust source lines (excl. `target/`) | 24,536     | **29,806**         |
| Migrations                          | 4          | **6**              |

Present only in `new-room-control` **[M]**:

- `services/api/migrations/0005_harden_runtime_role_and_room_events_policy.sql`
- `services/api/migrations/0006_restrict_runtime_object_privileges.sql`
- `services/api/src/bin/postgres-release-attestation.rs`
- `services/api/src/http/origin.rs`
- `services/.dockerignore`, `services/.env.example`, `services/compose.yml`,
  `services/deny.toml`

Present only in `new-room` **[M]**:

- `services/api/src/db/repo/provision.rs` (the non-compiling prototype, §3.7)
- `services/media/Cargo.lock`

**Consequence, and it matters for planning: the more advanced backend is in
`new-room-control`, not in `new-room`.** The control repo carries the two
security-drift migrations, an Origin module, a release-attestation binary, and
the container/supply-chain files. Any work that assumes `new-room/services` is
the authoritative backend is working against an older tree.

## 2. Target architecture

From ADR 0003 **[C]**:

```text
browser
  -> SvelteKit UI/BFF on Vercel
  -> Rust/Axum control API
  -> PostgreSQL system of record
  -> separately deployed Rust mediasoup SFU for ephemeral live media
```

Ownership, as fixed by that decision **[C]**:

- **Vercel** — rendering, progressive interactions, a same-origin BFF boundary.
  Not durable data, not authorization policy.
- **Rust/Axum** — authentication, account/tenant operations, validation,
  authorization, media-session issuance, payment-webhook processing.
- **PostgreSQL** — tenants, identities, sessions/refresh families, subscriptions,
  rooms, memberships, capabilities, durable room data, audit/outbox. Tenant RLS
  and application authorization stay distinct layers.
- **mediasoup** — only ephemeral live media state. Accepts short-lived,
  audience/node-bound grants issued by the control API.
- **Redis** — deferred until a measured requirement exists.

---

## 3. The backend (Rust)

Present in both folders, but **not identically** — see §1.2. Figures in §3.2 are
measured on `new-room/services`; where `new-room-control` differs, it is ahead.

### 3.1 Stack

Read from `services/api/Cargo.toml` and `services/media/Cargo.toml` **[R]**:

**API** — `axum`, `tokio`, `tower`, `tower-http`, `serde`, `serde_json`,
`thiserror`, `tracing`, `tracing-subscriber`, `uuid`, `time`, `base64`,
`ed25519-dalek`, `sha2`, `sqlx`, `rust_decimal`, `ipnetwork`, **`argon2`**,
`password-hash`, `rand`, `subtle`, `futures-util`, `ammonia`, `cookie`, `hex`,
`governor`.

**Media** — `mediasoup`, `axum`, `tokio`, `tower-http`, `serde`, `serde_json`,
`tracing`, `thiserror`, `ed25519-dalek`, `base64`,
`event-listener-primitives`, `futures-util`, `uuid`.

So the intended stack — Rust, Axum, Tokio, sqlx, PostgreSQL, Argon2id — is what
is actually in the manifests.

`services/api/src/auth/password.rs:1-4` **[R]** states Argon2id is not a
preference but a schema requirement: `rooms_access_tiers_argon2id_check`
constrains every access tier's `passwordHash` to match `^[$]argon2id[$]`.

### 3.2 Size

| Item                                    | Value                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Rust source files (excluding `target/`) | 69 **[M]**                                                                 |
| Rust source lines                       | 24,536 **[M]**                                                             |
| Migrations                              | 4 in `new-room`; **6 in `new-room-control`** (adds `0005`, `0006`) **[M]** |
| Integration test files                  | 9 **[M]**                                                                  |

### 3.3 Modules

`services/api/src/` **[R]**: `auth/` (`extract`, `grant`, `login`, `password`,
`refresh`, `token`), `db/` with `repo/` (`alert`, `event`, `identity`, `join`,
`membership`, `message`, `moderation`, `note`, `poll`, `provision`, `room`),
`http/` (`client_ip`, `metrics`, `ratelimit`, `v1/`), `realtime/` (`hub`,
`protocol`, `relay`), plus `capability.rs`, `config.rs`, `error.rs`, `html.rs`,
`jobs.rs`, `limits.rs`.

### 3.4 HTTP surface

**29 route templates** under `/api/v1` **[M]**, plus `/api/auth/{login,logout,refresh}`
and `/healthz`, `/readyz`, `/metrics` **[M]**.

Families: rooms; channels; messages + reactions; alerts + questions; polls
(+ answer, close); notes (+ versions, restore, welcome-mat); moderation (mute,
personal-mute); media-grant; events; account theme/preferences; join; guest.

> Counting note: `grep -rhoE '"/api/v1[a-z0-9_{}/-]*"'` returns 31 distinct
> strings. Two embed the example UUID `6f9619ff-…` and are route-class fixtures
> in `http/metrics.rs`, not routes.

### 3.5 Realtime

Not a stub. `realtime/hub.rs`, `relay.rs`, `protocol.rs`, with outbox and
`pg_notify` references in `main.rs`, `jobs.rs`, `db/mod.rs`, `db/repo/event.rs`,
`http/v1/messages.rs`, `http/v1/notes.rs` **[M]**. Delivered over
`/api/v1/rooms/{room_id}/events` as a socket upgrade.

### 3.6 Test state

`cargo test --locked --workspace --features testing` — **335 tests across 16
targets, exit 0** **[M]**.

Independently corroborated: ADR 0003 records a 2026-08-02 full-workspace run of
**230 API tests and 105 media tests** **[C]** — the same 335.

Two things a reader will hit:

1. **`cargo test --workspace` fails to compile without `--features testing`.**
   Eight integration targets need `raw_for_tests` / `identity_pool_for_tests`,
   which are `#[cfg(feature = "testing")]` at `services/api/src/db/mod.rs:95`
   and `:208` **[R]**. This is by design — the comment calls the private
   connection "fence #2 of the tenancy kernel". CI passes the flag
   (`.github/workflows/ci.yml:137`) **[R]**.
2. **One flaky media test.** `server::tests::the_room_is_told_when_a_producer_and_then_a_peer_goes_away`
   failed once under full-workspace load with `MID already exists in RTP
listener [mid:0]` at `media/src/server.rs:1739`; then passed isolated ×3,
   passed with the media lib alone (105/105), and passed on a second full run
   (335/335) **[M]**. Order- or load-dependent. **Not fixed.**

### 3.7 `provision.rs` does not compile

`services/api/src/db/repo/provision.rs:181` calls `db.begin_untenanted()`.
`grep -rn "fn begin_untenanted" services/api/src` returns **nothing** **[M]**.

No `mod provision;` declares the file, so it is not compiled and
`cargo check --locked --workspace --bins` passes **[M]**. It is a design
prototype only. ADR 0003 independently records the same defect **[C]** and
excludes it from the import.

### 3.8 The two security drifts are fixed — in the control repo only

ADR 0003 recorded two **proven** drifts against intent **[C]**: the installed
runtime role had `INHERIT` contrary to an intended `NOINHERIT`, and the
`room_events` RLS policy targeted `PUBLIC` rather than only `ptr_clone_app`.

Both are addressed by
`new-room-control/services/api/migrations/0005_harden_runtime_role_and_room_events_policy.sql`
**[R]**, whose own header explains the cause: `0003_room_events.sql` omitted a
`TO` clause, so PostgreSQL treated the policy as applying to `PUBLIC`. Ordinary
table privileges still prevented access, but the policy boundary was broader
than every other tenant policy. The same migration inspects `rolinherit` and
issues `ALTER ROLE ptr_clone_app`.

`0006_restrict_runtime_object_privileges.sql` **[R]** then revokes and re-grants
explicit privileges on `enterprises`, `users` and `audit_log` for
`ptr_clone_app`.

**Neither migration exists in `new-room`** **[M]**. That folder's backend still
carries both drifts.

---

## 4. Media / mediasoup SFU

### 4.1 What exists

`services/media`, Rust, built on the `mediasoup` crate **[R]**. Configuration
surface, from `services/media/src/config.rs` **[M]**: `MEDIA_BIND_ADDRESS`,
`MEDIA_ANNOUNCED_ADDRESS`, `MEDIA_GRANT_PUBLIC_KEY`, `MEDIA_RTC_PORT_MIN`,
`MEDIA_RTC_PORT_MAX`, `MEDIA_WORKERS`.

Admission is by Ed25519 grant: the control side holds the private half and mints,
the SFU holds only the public half and verifies. `.env.example` states that if
the two halves come from different pairs, "every peer is refused with no other
symptom" **[C]**.

Test state: 105 tests in the media lib **[M]**, subject to the flake in §3.6.

### 4.2 Deployment constraints — these decide the hosting choice

From `new-room/docs/DEPLOY.md` **[C]**, which cites `config.rs` line ranges:

An SFU opens a **wide UDP port range** (default 10,000 ports,
`MEDIA_RTC_PORT_MIN=40000`–`MEDIA_RTC_PORT_MAX=49999`, `config.rs:72-73`) and
tells browsers to send RTP to `MEDIA_ANNOUNCED_ADDRESS`. That rules out
single-HTTP-port platforms — Vercel, Railway's default web service, Heroku,
Cloud Run. It requires **a VM with a public IP** (EC2, Hetzner, DigitalOcean,
Fly.io with dedicated IPv4) run with host networking, or Kubernetes with
`hostNetwork: true`.

Capacity is the port range restated (`config.rs:130-135`):

| Range                 | Workers | Concurrent peers |
| --------------------- | ------- | ---------------- |
| 40000-49999 (default) | 4       | 1250             |
| 40000-40999           | 2       | 125              |
| 40000-40099 (minimum) | 1       | 12               |

`Config::validate` requires ≥100 ports per worker and refuses to start otherwise
(`config.rs:89-110`) — rejected at boot, not at first connection. Peers past the
ceiling are refused at the door with a retryable 503, deliberately.

Firewall: `4443/tcp` for signalling plus the RTC range on **both UDP and TCP**.

### 4.3 AWS deployment — it is deployed, and the record is detailed

Authority: `new-room-control/docs/MEDIASOUP-DEPLOYMENT-PLAN.md`, 726 lines,
"Verified: 2026-08-02" **[C]**. Everything in this subsection is cited from it.

**Host.** Amazon Lightsail **Small-2GB, public IPv4, US East (N. Virginia)** —
2 vCPU, 2 GB RAM, 60 GB SSD, 3 TB transfer, $12/month. Chosen over the $5/$7
bundles for operational margin, explicitly "an engineering safety decision, not
a claim that the repository contains a measured 2 GB minimum". The path stays
x86-64 and AWS from first public test through initial launch.

**What is running.** The test host was rebuilt and cut over from repository
revision `0a97fb1bb375e84e08591e85e6d932d8b503e9b6`. Active media image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`,
which replaced `sha256:09bd912feeeaefe160ef6491d9d5b7ae73caac13fd08ee389d802915688ba5da`
at `2026-08-02T21:49:05Z`. Prior image and config retained on-host for rollback.

**Runtime posture verified:** healthy, host-networked, read-only, non-root
`65532:65532`; systemd reports media and Caddy active; exactly one allowed
browser Origin, `https://www.tradingroom.app`.

**Public boundary, proven over trusted TLS:**

- `/health` returns a bounded JSON allowlist with ≥1 worker, zero worker deaths,
  `admission: require-grant`;
- plaintext HTTP returns an exact permanent `308` to HTTPS, and HTTPS supplies
  the reviewed security headers;
- a correctly originated, same-origin, **unsigned** WebSocket upgrade → `401`;
- missing, wrong, or duplicate Origin → `403`;
- cross-site or duplicate `Sec-Fetch-Site` → `403`;
- **none** of the rejection responses set a cookie.

**Positive signature path, proven `2026-08-02T22:02:59Z`** by a fail-safe probe
that generated an ephemeral Ed25519 key in memory, sent only the public half,
and installed a root-only backup plus a 180-second systemd rollback watchdog
first:

- a grant expired beyond the implemented 30-second clock-skew allowance → `401`;
- one valid ephemeral grant completed an authenticated `101 Switching Protocols`
  handshake with the exact RFC 6455 accept value and no cookie;
- the same bearer grant admitted **four** simultaneous sockets for one identity;
  the fifth returned `503` under the per-identity cap;
- masked normal closes drained the synthetic room and all peers;
- the environment was restored byte-for-byte and the six-case public rejection
  matrix passed again.

No private key or grant was serialized, sent to AWS, written to disk, printed,
or retained.

**What that deployment does NOT prove**, stated by the same document:

- that the retained public key matches the future control-plane signer;
- that fresh bearer grants are single-use — **they are not**;
- that **RTP flows** — media itself is unproven;
- that **TURN works**;
- that any real-device or browser cell passes.

So: the admission, Origin, Ed25519, expiry, replay-ceiling, TLS and upgrade
boundary is proven on a live AWS host. The actual media path is not. Both
statements are true at once, and §8 keeps them apart.

**Staged ladder** (list prices verified 2026-08-02):

| Stage            | Host                 | Workers / ports            | Cost             | Purpose                                         |
| ---------------- | -------------------- | -------------------------- | ---------------- | ----------------------------------------------- |
| 0 — local        | developer machine    | 1 / local                  | $0               | unit, protocol, same-machine browser            |
| 1 — public smoke | Lightsail Small-2GB  | 1 / `40000-40199`          | $12/mo           | cross-network + TURN proof, small invited group |
| 2 — private beta | Lightsail Large-4GB  | 1 / `40000-40999`          | $42/mo           | sustained test traffic, dedicated CPU           |
| 3 — paid launch  | 2 × Xlarge-8GB       | 3 per node / `40000-41999` | $168/mo          | minimum two-node reconnectable topology         |
| 4 — growth       | +Xlarge-8GB per pool | 3 per node                 | +$84/mo per node | assign new rooms to healthy nodes               |

Stage 3 is **blocked until room-aware placement exists**. Two SFUs must not sit
behind round-robin DNS or an HTTP load balancer: participants in one room could
land on isolated in-memory routers and be unable to exchange media.

### 4.4 An upstream blocker on promotion

`new-room-control/docs/ROOM-STATE-2026-08-06.md` **[C]**: mediasoup's **statically
linked OpenSSL 3.0.8** independently blocks media promotion regardless of
RustSec, deployment identity, or container-base scan results, and needs a
reviewed upstream-supported build. The media image also still lacks a
native/binary SBOM, current vulnerability evidence, signature, and provenance
attestation.

---

## 5. The room application (`new-room`)

SvelteKit 5 / Svelte 5 runes, the forensic reconstruction of the captured room.

| Item                      | Value                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| Route files               | 9 **[M]**                                                                         |
| `src` TS/Svelte/CSS lines | 67,055 **[M]**                                                                    |
| Largest components        | `+page.svelte` 5,839; `ModalHost.svelte` 4,624; `NoteEditor.svelte` 1,423 **[M]** |
| Server form actions       | 20 **[M]**                                                                        |
| SQLite tables             | 15 **[M]**                                                                        |
| Vitest                    | 30 files, 195 tests, pass **[M]**                                                 |
| `svelte-check`            | 906 files, 0 errors, 0 warnings **[M]**                                           |

Feature surfaces present: alerts, chat and message rows, message menus and
moderation, composer, emoji and Giphy pickers, polls, notes with versions,
screen/presentation panes, roster with followed/muted users and private chat,
local media capture and recording, sound effects, toasts, modals.

### 5.1 The room does not use the Rust API

This is the single largest gap in the product today.

- `grep -rn "/api/v1" src/` returns **0 matches** **[M]**.
- `$lib/server/tradingroom-api` is named in `vite.config.ts` but does not exist
  — deleted by commit `7732567` **[M]**.
- `vite.config.ts` keeps the `/api/v1` and `/api/auth` dev proxy with `ws: true`,
  and its own comment reads _"Nothing in this app calls it yet."_ **[R]**

The room runs instead on SvelteKit form actions over Drizzle/better-sqlite3, 15
tables in `.data/proroom.sqlite` **[M]**.

History: commit `004ed31` (2026-08-01) added `src/lib/server/tradingroom-api.ts`
(191 lines) and an `/enterprise` UI that consumed the API; commit `7732567` the
same day removed both, because the UI was an invented page rather than the
captured room **[M]**. The removal took the API client with it.

**SQLite must go.** ADR 0003 supersedes the SQLite outcome and names PostgreSQL
the system of record **[C]**. The work is §9.

Media in the room is wired to `src/routes/api/media/grant/+server.ts`, which
mints against the `MEDIA_ROOM_ID` deployment constant, **not** to the API's
capability-backed `/api/v1/rooms/{room_id}/media-grant` **[M]**.

---

## 6. The control plane (`new-room-control`)

SvelteKit on `adapter-vercel`; dependencies `better-sqlite3`, `drizzle-orm`,
`valibot`, FontAwesome **[R]**. 14,761 lines of `src` **[M]**.

Surfaces built: marketing home, contact, privacy, terms; login, register, logout;
`/account` (rooms, badges, extra admin users, API keys); `/account/rooms/[id]`
(the six-tab Manage page: Users, Text List, Branding, SSO Setup, User Stats,
Settings); `/account/api-docs`; room-entry `/session/[code]`.

Notable pieces **[R]**:

- `src/lib/room-settings-schema.ts` — **268 room settings** extracted from the
  reference controller; its header records **11 wired**, the rest storable but
  not yet read by anything.
- `src/lib/server/account-entitlements.ts` — returns `FULL_PRODUCT_ENTITLEMENTS`,
  every capability true. The captured reference is a restricted demo tenant; this
  build deliberately exposes every implemented capability and keeps one
  server-only policy boundary for when real plans and roles arrive.
- `src/lib/room-member-role.ts` — presenter/trial/non-presenter role predicates.
- `src/lib/server/private-sqlite.ts` — the local SQLite filesystem boundary
  described at length in ADR 0003.

Gate and deployment state is recorded in
`new-room-control/docs/ROOM-STATE-2026-08-06.md` **[C]**: hosted Quality, Backend
quality, Security, Deployed smoke and Vercel Production all green on `dac88f1`;
local `pnpm quality` green with 110 Vitest across 12 files, 20 Playwright tests,
746 files at 0 svelte-check errors; backend 112 media library tests and 11 media
binary tests. The site is deployed and **contained** — `robots.txt` disallow-all,
login/registration/account/launch/logout/room-entry/API-docs/session/contact-POST
all fail closed, **no transactional customer traffic open**.

---

## 7. Cutover gates

`new-room-control/../new-room-control/docs/PRODUCTION-CUTOVER-PLAN.md` defines Gates 0–5 **[C]**:

| Gate | Subject                         | State per STATUS-2026-08-03 **[C]** |
| ---- | ------------------------------- | ----------------------------------- |
| 0    | Official-domain containment     | nearly complete                     |
| 1    | Backend SSOT and security drift | see §3.8                            |
| 2    | Account bootstrap               | substantially unbuilt               |
| 3    | Vertical feature migration      | substantially unbuilt               |
| 4    | Signup, payment, entitlements   | substantially unbuilt               |
| 5    | Media promotion                 | blocked upstream, §4.4              |

Production-opening rule **[C]**: the official domain opens transactional traffic
only when Gates 0–4 are complete and the required portion of Gate 5 is proven for
the offered product.

---

## 8. What still needs proving before shipping

Split by whether a document already proves it. The media boundary is **proven on
a live AWS host** (§4.3); the media _path_ is not.

### 8.1 Named as unproven by the deployment plan itself **[C]**

From `MEDIASOUP-DEPLOYMENT-PLAN.md` §8, unchecked items:

- **RTP does not have a proof.** No real-device or browser cell has passed.
  Needs two-device, cross-network, forced-TURN, load, soak and recovery cells.
- **TURN is not built.** Server-side Cloudflare TURN credential generation is
  required; the long-lived TURN key and Cloudflare API token must never reach a
  browser.
- **Grants are not single-use and are not node-bound.** A grant can be replayed
  across future nodes until it is bound to a node or audience.
- **The media-session response is incomplete.** It must return the selected WSS
  endpoint, short-lived grant, expiry and short-lived `iceServers`.
- **The browser client is not wired.** The room client must be imported into its
  owning application and wired to the Rust media-session contract, and its media
  identity migrated from legacy numeric IDs to the UUID/string IDs carried by
  Rust v2 grants.
- **`/health` is not a readiness check.** It reports status and `workerDeaths`
  but does not prove transport creation.
- **No room-aware placement drain**, which is what blocks Stage 3 (§4.3).
- **No screen-share/camera bitrate or encoding ceilings.** The current
  screen-share path has a start bitrate and no evidenced maximum.
- **No media-specific metrics.**
- **OpenSSL 3.0.8 rebuild** with binary/native SBOM, current vulnerability
  evidence, signatures/provenance and a tested rollback (§4.4).
- **Operational runbook**: OS patching, firewall reconciliation, secret
  delivery, certificate renewal, NTP monitoring, configuration backup/recovery.
- **Key rotation** with overlapping public keys and a `kid` claim is deferred
  but is a paid-launch gate; the current verifier supports exactly one public
  key.

### 8.2 Proved locally, not on the target

- **The Rust backend.** 335 tests pass (§3.6) — on a developer machine against a
  local PostgreSQL. Needs a run against the selected managed target with the
  real owner/runtime role split.
- **The two security drifts of §3.8.** `INHERIT` vs `NOINHERIT`, and the
  `room_events` policy targeting `PUBLIC`. Fix, then prove.

### 8.3 Open defects

- **The media flake of §3.6.** Reproduce deliberately under concurrency rather
  than waiting for it to reappear.
- **Grant key-pair agreement.** Mismatched Ed25519 halves refuse every peer with
  no other symptom (§4.1). Worth an explicit startup assertion.

---

## 9. The largest outstanding piece of work

Connecting the room to the backend, and deleting SQLite.

1. Restore a **server-side API client only** — `tradingroom-api.ts` is
   recoverable from `004ed31` (191 lines, previously reviewed). Not the
   `/enterprise` UI.
2. Migrate the 20 form actions to the API in slices, each behind its existing
   green tests: identity/join → messages + reactions → alerts + questions →
   polls → notes + versions → moderation. Retire each SQLite table as its slice
   lands.
3. Move media admission from `/api/media/grant` to
   `/api/v1/rooms/{room_id}/media-grant`, so grants come from the capability
   layer rather than a single-room deployment constant.
4. Consume `/api/v1/rooms/{room_id}/events`, replacing `invalidateAll()`. This is
   what gives cross-client presence and fanout.
5. Delete the SQLite runtime once all 15 tables are unused.

**Which backend to target.** §1.2 shows `new-room-control/services` is ahead by
two migrations, an Origin module, a release-attestation binary and the
container/supply-chain files. Wiring the room against `new-room/services` would
be building on the older tree, and it is the tree still carrying both security
drifts (§3.8). Reconciling the two `services` trees is therefore a prerequisite
of this work, not a follow-up to it — and ADR 0003's one-repository target
(§1.1) is the natural place to resolve it.

Steps 1–4 themselves touch `src/` only.

---

## 10. Open decisions

- **Repository consolidation, now urgent rather than tidy.** ADR 0003 fixes the
  target as one repository (§1.1). The two `services` trees have already
  diverged (§1.2), so consolidation is what decides which backend the room is
  wired to. The mechanics are not yet decided.
- **Managed PostgreSQL target.** Migrations and role posture are proved locally
  and in CI, not on a selected managed target **[C]**.
- **Contact transport, and error monitoring** — each blocked on a provider
  choice **[C]**.
- **Terms and privacy** — both are placeholders; needs counsel, not engineering **[C]**.

---

## 11. Source documents

| Document                                                      | Repo     | What it governs                                    |
| ------------------------------------------------------------- | -------- | -------------------------------------------------- |
| `docs/decisions/0003-vercel-rust-postgresql-control-plane.md` | control  | The accepted production topology and repo decision |
| `../new-room-control/docs/ENGINEERING-SSOT.md`                | control  | Engineering single source of truth                 |
| `../new-room-control/docs/PRODUCTION-CUTOVER-PLAN.md`         | control  | Gates 0–5 and the production-opening rule          |
| `docs/ROOM-STATE-2026-08-06.md`                               | control  | Point-in-time gate and deployment state            |
| `ops/backend-import-provenance.md`                            | control  | The `services/**` import seal                      |
| `docs/REPOSITORY-STATE-2026-08-03.md`                         | new-room | Measured state of the room repo                    |
| `docs/DEPLOY.md`                                              | new-room | SFU hosting constraints and variables              |
| `../new-room-control/docs/AMENDMENT.md`                       | control  | Superseded by ADR 0003 for the SQLite outcome      |

Where this document restates a number from one of those, the named document
remains the authority.
