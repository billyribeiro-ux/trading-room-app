# ProTradingRoom reconstruction — repository state

> ## ⚠️ SUPERSEDED — historical record only
>
> **Superseded by [`ROOM-STATE-2026-08-06.md`](ROOM-STATE-2026-08-06.md).**
>
> Its test counts, gate results and open-work list are all from 2026-08-03 and are stale. The
> room gained a realtime channel, working mic/webcam across peers, and 32 fixed defects after this
> was written. Read it for the 08-03 snapshot, not for what is true now.

**Audit date:** 2026-08-03
**Workspace:** `/Users/billyribeiro/Desktop/new-room`
**Branch:** `chore/capture-tooling-and-provision-prototype` at `6284e4a`
**Last `main` commit:** `f84bae3` (2026-08-01 12:44)
**Working tree:** clean except untracked `NEXT-STEP/` (deliberate — see §8)

Supersedes [`REPOSITORY-STATE-2026-07-30.md`](REPOSITORY-STATE-2026-07-30.md), which is
kept as the 07-30 record. That document was written before the twelve commits of
2026-08-01 and is materially wrong about the architecture; §6 lists every
correction rather than leaving the reader to diff two documents.

This report states only what was measured on the date above. Every number in §2
and §3 came from running the named command in this workspace. Sections carried
forward without re-verification are named as such in §7 and must not be cited as
current.

---

## 1. What changed since 2026-07-30

Twelve commits landed on 2026-08-01 (`e60e319` … `f84bae3`). They added a
PostgreSQL-backed Rust API, a realtime socket with a transactional outbox and
`LISTEN`/`NOTIFY`, a capability layer, room entry and guest access, message
moderation, and room panels.

They also added a SvelteKit client for that API (`src/lib/server/tradingroom-api.ts`)
and an `/enterprise` UI — and then `7732567` **removed both**, because the UI was
an invented page rather than the captured room. The removal took the API client
with it.

The consequence is the single most important fact in this report and is stated in
full in §4: **the API is built and tested; the room does not call it.**

---

## 2. Verified gates (2026-08-03)

| Command                                              | Result                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm test`                                          | **PASS** — 30 files, **195 tests**, plus the PostgreSQL schema evidence contract |
| `pnpm check`                                         | **PASS** — **906 files, 0 errors, 0 warnings**                                   |
| `cargo check --locked --workspace --bins`            | **PASS**                                                                         |
| `cargo test --locked --workspace --features testing` | **PASS** — **335 tests** across 16 targets                                       |
| `cargo test --locked --workspace` (no feature)       | **FAILS TO COMPILE** — see §5.1                                                  |

`pnpm test` runs `verify-postgres-schema-artifacts.mjs` first; it reported
1,960 / 290 / 2,814 canonical lines with exact SHA-256, 24 tables, 317 public
columns, 167 constraints, 93 indexes, 20 FORCE+ENABLE RLS tables, 19 tenant
policies plus the private-message exception, 5 SECURITY DEFINER helpers, and
`ptr_clone_app` still `NOBYPASSRLS`.

The Rust suite requires PostgreSQL on `127.0.0.1:5432`; `pg_isready` confirmed a
live cluster before the run. `services/api/tests/support/mod.rs:42` defaults to
`postgres://ptr_clone_app:…@127.0.0.1:5432/ptr_clone`.

---

## 3. Measured inventory

### 3.1 SvelteKit application

| Item                                     | Value                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| Route files (`src/routes/+*`)            | 9                                                                         |
| `src` TS/Svelte/CSS lines                | 67,055                                                                    |
| Largest components                       | `+page.svelte` 5,839; `ModalHost.svelte` 4,624; `NoteEditor.svelte` 1,423 |
| Server form actions in `+page.server.ts` | 20                                                                        |
| SQLite tables defined                    | **15**                                                                    |

Routes: `+layout.svelte`, `+page.svelte`, `+page.server.ts`, `login/`, `logout/`,
`api/media/grant/+server.ts`, `api/notes/[noteId]/versions/+server.ts`.

The 15 SQLite tables are `users`, `messages`, `alerts`, `alert_questions`,
`shared_files`, `user_settings`, `polls`, `poll_answers`, `saved_polls`, `notes`,
`note_versions`, `chat_mutes`, `sessions`, `hidden_room_items`,
`captured_item_overrides`.

> Counting note: six of these are declared with the table name on a continuation
> line, so a single-line `grep sqliteTable\('name'` finds only nine. The count
> above comes from `grep -E "^export const [a-zA-Z]+ = sqliteTable"`, which finds
> all fifteen. The 07-30 figure of 12 predates `alert_questions`,
> `hidden_room_items` and `captured_item_overrides`.

### 3.2 Rust services

| Item                               | Value                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Source files (excluding `target/`) | 69                                                                                                                     |
| Source lines                       | 24,536                                                                                                                 |
| Distinct HTTP paths                | **29** route templates under `/api/v1`, plus `/api/auth/{login,logout,refresh}` and `/healthz` `/readyz` `/metrics`    |
| Migrations                         | 4 (`0001_baseline` … `0004_list_memberships`)                                                                          |
| Integration test files             | 9 (`actions`, `auth_http`, `join`, `login_probe`, `migrations`, `realtime`, `refresh_rotation`, `room_api`, `tenancy`) |

Endpoint families: rooms, channels, messages + reactions, alerts + questions,
polls (+ answer, close), notes (+ versions, restore, welcome-mat), moderation
(mute, personal-mute), media-grant, events, account theme/preferences, join,
guest.

> Counting note: `grep -rhoE '"/api/v1[a-z0-9_{}/-]*"'` returns 31 distinct
> strings. Two of them embed the example UUID `6f9619ff-…` and are route-class
> test fixtures in `http/metrics.rs`, not routes. 29 is the route-template count.

Realtime is real code, not a stub: `realtime/hub.rs`, `relay.rs`, `protocol.rs`,
with outbox and `pg_notify` references in `main.rs`, `jobs.rs`, `db/mod.rs`,
`db/repo/event.rs`, `http/v1/messages.rs`, `http/v1/notes.rs`.

---

## 4. The architecture as it actually stands

There are two backends in this repository. The room uses the older one.

```text
Browser (captured room at /)
  ├─ SvelteKit form actions ──► Drizzle ──► better-sqlite3 (.data/proroom.sqlite, 15 tables)
  ├─ /api/media/grant (SvelteKit) ──► Ed25519 grant ──► services/media (SFU)
  └─ (no path to services/api)

services/api  (PostgreSQL, RLS, realtime, capability layer)   ◄── NO CLIENT
```

Evidence for the disconnect, all reproducible:

- `grep -rn "/api/v1" src/` returns **0 matches**.
- `$lib/server/tradingroom-api` is named in `vite.config.ts` but **does not exist**;
  it was deleted by `7732567`.
- `vite.config.ts` keeps the `/api/v1` and `/api/auth` dev proxy with `ws: true`.
  Its own comment says: _"Nothing in this app calls it yet."_ It is retained
  deliberately, so that when the room does connect it is same-origin and the
  API's `__Host-` cookies work without a `Domain=` scope or a CORS allowlist.

Media is wired, but to the SvelteKit endpoint rather than the API: the browser
gets its grant from `src/routes/api/media/grant/+server.ts`, which mints against
the `MEDIA_ROOM_ID` deployment constant, not against the API's capability layer
at `/api/v1/rooms/{room_id}/media-grant`.

---

## 5. Known defects

### 5.1 `cargo test --workspace` does not compile without `--features testing`

Eight integration targets fail with `no method named raw_for_tests` /
`no method named identity_pool_for_tests`. Both helpers exist but are
`#[cfg(feature = "testing")]` (`services/api/src/db/mod.rs:95` and `:208`), and a
`tests/` target compiles against the crate as an external dependency, so the
`cfg` excludes them.

This is **correct by design, not a bug**: the feature comment states the private
connection is "fence #2 of the tenancy kernel" and must not be reachable in a
production build. CI already uses the right invocation
(`.github/workflows/ci.yml:137`: `cargo test --workspace --features testing`).

Recorded here because the bare command is the one a newcomer will type, and its
failure looks like broken code rather than a missing flag.

### 5.2 One intermittent media test

`server::tests::the_room_is_told_when_a_producer_and_then_a_peer_goes_away`
failed once during a full-workspace run:

```
MID already exists in RTP listener [mid:0]
media/src/server.rs:1739
```

Evidence gathered on the failure:

| Run                                | Result               |
| ---------------------------------- | -------------------- |
| Isolated, ×3                       | pass, pass, pass     |
| `-p tradingroom-media --lib` alone | 105 passed, 0 failed |
| Full workspace, run 1              | **1 failed**         |
| Full workspace, run 2              | 335 passed, 0 failed |

So it is order- or load-dependent, not a stable failure. The message points at
mediasoup router/worker state shared across concurrently running tests rather
than at the assertion itself. It is **not** fixed and should not be assumed
benign; it is a real flake in a media path that will run under far more
concurrency in production than in this suite.

### 5.3 Upload credential still browser-exposed

`PUBLIC_PTR_CDN_UPLOAD_KEY` is read in the client at
`src/routes/+page.svelte:2934` and `:2971`. The `PUBLIC_` prefix means SvelteKit
ships it to the browser. This was flagged on 07-30 and is unchanged.

---

## 6. Corrections to the 2026-07-30 record

| 07-30 claim                                                                                  | Verified 2026-08-03                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "No WebSocket, Socket.IO, SSE, Redis, LiveKit, or mediasoup runtime dependency or transport" | False. `services/` ships a realtime hub/relay/protocol, a transactional outbox with `LISTEN`/`NOTIFY`, and a mediasoup SFU.                                                                                              |
| "No cross-client presence, remote media, room event fanout"                                  | Superseded. The API implements room events; the _room UI_ still does not consume them.                                                                                                                                   |
| Runtime route surface is 4 files                                                             | 9 files (adds `login/`, `logout/`, `api/media/grant/`).                                                                                                                                                                  |
| "The active Drizzle/SQLite runtime defines 12 tables"                                        | 15 tables. `polls`, `poll_answers`, `notes`, `note_versions`, `chat_mutes`, `sessions` are all still present — they were not removed — and `alert_questions`, `hidden_room_items`, `captured_item_overrides` were added. |
| `pnpm test` — 23 files, 95 tests                                                             | 30 files, 195 tests.                                                                                                                                                                                                     |
| "The workspace contains no `.git` directory"                                                 | False. 67 commits; remote `billyribeiro-ux/new-room`.                                                                                                                                                                    |
| "No GitHub Actions or other CI pipeline is present"                                          | False. `.github/workflows/ci.yml`.                                                                                                                                                                                       |
| "No Dockerfile/compose deployment"                                                           | False. `services/api/Dockerfile`, `services/media/Dockerfile`, `services/docker/postgres/`, and `docker-compose.yml` at the repository root.                                                                             |
| "No health/readiness/liveness endpoint"                                                      | False. `/healthz`, `/readyz`, `/metrics`.                                                                                                                                                                                |
| "No structured logger, tracing, metrics"                                                     | Partly false — `/metrics` and `http/metrics.rs` exist. Tracing/error-reporting not re-verified.                                                                                                                          |
| "No explicit app-layer rate limiter"                                                         | False. `services/api/src/http/ratelimit.rs`, `src/limits.rs`, and `src/lib/server/rate-limit.ts`.                                                                                                                        |
| Maturity: "realtime room delivery … remain to be implemented"                                | Wrong shape. Realtime is implemented server-side; what remains is **connecting the room to it**.                                                                                                                         |

The 07-30 statement that survives unchanged is the upload-credential boundary
(§5.3) and the PostgreSQL package not being the runtime database (§4).

---

## 7. Not re-verified in this pass

Carried forward from 07-30 and **not** re-measured. Do not cite as current:

- the feature inventory (07-30 § "Feature inventory");
- the modal inventory (07-30 § "Modal inventory");
- captured-evidence coverage counts — 58 capture states, 27,785 node
  occurrences, 384 classes, 290 CSS variables;
- the styling cascade description and `complete-app-styles.css` hash;
- the mediasoup readiness boundary (07-30 § "Mediasoup readiness and exact integration boundary");
- the production build's chunk sizes.

Nothing in this pass contradicts them; they simply were not the subject.

---

## 8. `NEXT-STEP/` is deliberately untracked

`.gitignore` excludes `NEXT-STEP/*.json` because the raw dumps carry a live JWT
and member PII. **That pattern matches one directory level only**, so
`NEXT-STEP/run2/welcome-run2.json` and `NEXT-STEP/run3/welcome-run3.json` are not
covered and a plain `git add .` would publish them. The directory is 83 MB, 59
files; the 57 files under `decoded/` are redacted and would be safe.

Until that pattern is widened, `NEXT-STEP/` must stay untracked.

---

## 9. What finishing looks like

The backend is not the gap. The gap is that the captured room has no client for
it. In dependency order:

1. Restore a server-side API client only — `tradingroom-api.ts` is recoverable
   from `004ed31` (191 lines, already reviewed). Not the `/enterprise` UI.
2. Migrate the 20 form actions to the API in slices, each behind its existing
   green tests: identity/join → messages + reactions → alerts + questions →
   polls → notes + versions → moderation. Retire each SQLite table as its slice
   lands.
3. Move media admission from `/api/media/grant` to
   `/api/v1/rooms/{room_id}/media-grant`, so grants come from the capability
   layer rather than a single-room deployment constant.
4. Consume `/api/v1/rooms/{room_id}/events`, replacing `invalidateAll()`. This is
   what closes cross-client presence and fanout.
5. Remove the SQLite runtime once all 15 tables are unused.

Sequencing constraint: `services/**` was imported byte-identically into the
sibling control-plane repository at `f84bae3`, sealed by a path-and-content
manifest. Steps 1–4 touch `src/` only and do not disturb that seal. Any change
under `services/` will, and needs to be a deliberate re-import decision.
