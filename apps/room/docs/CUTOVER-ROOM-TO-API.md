# Cutting the room over to the Rust API

> ## Update 2026-08-05 — the realtime half now exists, process-locally
>
> When this plan was written the room had no realtime transport at all. It now has one:
> `src/lib/server/room-events.ts` plus an SSE endpoint at `src/routes/sess/[room]/events/+server.ts`,
> carrying alerts, chat, presenter commands, roster count, `gotPollAnswer` and `forceReload` —
> 7 of the capture's 10 channels, each proven with two peers at ~1.2s.
>
> **It is module state in one node process.** It does not survive a restart and does not span
> instances, so it does not replace this cutover — it raises its priority. `services/api` already
> listens on PostgreSQL `room_events` (`services/api/src/jobs.rs`), unused. The hub was shaped so
> that swapping it is one publish call and one subscribe call; no other code knows the transport.
>
> The captured protocol this reproduces is regenerable:
> `node scripts/extract-realtime-protocol.mjs` → `docs/generated/realtime-protocol.json`.

**Written 2026-08-04.** This is the executable plan for TODO 5 — retiring the SQLite/Drizzle
stack under `/` in favour of `services/api`. It exists because the expensive part of this
cutover was an unknown, and the unknown is now closed with evidence.

Every claim below cites a file and line. Where something is unverified it says so.

---

## 1. The decision: no bridge, no strangler

The plan previously written into `src/lib/server/tradingroom-api.ts` called for a slice-by-slice
migration, justified like this:

> Rewiring `/` in one step would mean changing authentication, identity types and every form
> action at once, with no working state in between.

The unstated consequence was a **bridge**: because SQLite's foreign keys are numeric
(`saved_polls.created_by_user_id` → `users.id`, `messages.sender_id` → `users.id`) and the API's
are uuids, any partial state needs `locals.user` to carry both — a numeric id for the tables not
yet moved and a uuid for the ones that have. That is a column, a lookup, and a deletion, and it
is only worth building if the id type is visible outside the server.

**It is not.** Across `src/routes/+page.svelte` (5,600 lines) and every component in
`src/lib/components/`, there is exactly one numeric coercion of an id:

```
src/routes/+page.svelte:1199    id: Number(user._id),
src/routes/+page.svelte:1212    body.set('userId', String(user.id));
```

It converts to a number and converts straight back to a string thirteen lines later. There is no
arithmetic on ids, no `Math.max` over them, no numeric sort, no comparison to a numeric literal.
The three other `Math.max` hits in the components are panel geometry
(`PollPanel.svelte:394,398,428`).

**This is now a gate, not a paragraph.** `src/lib/id-opacity-contract.test.ts` scans every
component and `+page.svelte` for the five constructs that only work on numeric ids — `Number()`
/ `parseInt()` around one, arithmetic on one, `Math.max`/`min` over them, and comparison to a
number literal — and pins the single round-trip above as the only allowed hit. It has been
verified to fail: injecting `[...savedPolls].sort((a, b) => a.id - b.id)` into `PollPanel.svelte`
turns it red. That case is worth naming, because it is the one that fails _silently_ — a uuid
subtraction yields NaN for every pair, and `Array.sort` reads NaN as "equal", so the list simply
stops being ordered instead of throwing.

**Therefore:** ids are opaque keys to the client, the identity type is a server-side concern
only, and there is no partial state to bridge. The cutover replaces this repository's server
layer wholesale — `load`, the 19 actions, `hooks.server.ts`, `auth.ts`, `connection.ts` —
against a client that does not move. One change, behind the 195 tests that already exist.

### The corollary that makes this safe

The room's numeric identity is **the divergence**, not the API's. `second-dump/db/columns.tsv`
is the captured schema of the original system: `users.id` is `uuid` (line 303) and role is not
on the user at all — it is `room_members.role`, per room (line 241). The API implements that.
SQLite's `users.role` is a single global column (`src/lib/server/db/schema.ts:7`) invented for
the reproduction. Cutting over is moving **towards** the reference, not away from it.

---

## 2. What has to happen to accounts

SQLite holds 4 real accounts and roughly 460 test guests. The real ones:

Addresses and display names are redacted — this repository does not carry the personal data of
real accounts. What matters to a cutover is the SHAPE, which is unchanged: two staff rows for the
same person, one of them unauthenticatable, and two members.

| id  | display_name | email      | role   | can authenticate?                |
| --- | ------------ | ---------- | ------ | -------------------------------- |
| 1   | (staff A)    | (redacted) | staff  | **no** — `password_hash IS NULL` |
| 463 | (staff A)    | (redacted) | staff  | yes — scrypt                     |
| 464 | (member B)   | (redacted) | member | yes — scrypt                     |
| 471 | (member C)   | (redacted) | member | yes — scrypt                     |

`connection.ts:44` requires `isNotNull(users.passwordHash)`, so id 1 is already a row that
cannot log in. **Three** accounts actually move.

### The hashes do NOT move, and this section originally said they did

The first draft of this document asserted "the password hashes move as-is — both sides use
argon2id". That was wrong, and it was asserted without being checked. The two sides use
different algorithms:

|      | scheme                                           | evidence                            |
| ---- | ------------------------------------------------ | ----------------------------------- |
| room | **scrypt**, `scrypt$<salt-hex>$<key-hex>`        | `src/lib/server/password.ts:11,17`  |
| API  | **argon2id**, `$argon2id$v=19$m=19456,t=2,p=1$…` | `services/api/fixtures/seed.sql:47` |

A scrypt digest cannot be converted into an argon2id one — the plaintext is not recoverable from
either. So there are exactly two options:

1. **Teach the API to verify scrypt**, then re-hash to argon2id on next successful login.
2. **Set new passwords for the three accounts** at cutover.

**Take option 2.** Option 1 means carrying a second password scheme through the auth path of a
fintech application permanently — a second verifier, a rehash-on-login branch, and a legacy
format that outlives everyone who remembers why — in order to avoid three password resets on
accounts that all belong to the owner. This room has never been deployed; there is no customer
whose password would be disrupted. The cost of option 1 is forever and the cost of option 2 is
one afternoon.

### What seeding actually looks like

Closed by reading `services/api/fixtures/seed.sql` and `src/db/repo/join.rs`:

- There is **no signup route**. `/api/auth/*` is login, refresh, logout only; the sole
  user-creating path is guest join (`join.rs:287`). New accounts are created by SQL.
- `email_hash` is `md5(lower(trim(email)))` — verified: `md5("owner@acme.test")` is
  `aa01a07b57da4db21fc9e43a13a26f0b`, exactly the value in `seed.sql:47`. It is the same digest
  `gravatarUrl` (`connection.ts:13`) already computes, so the room's avatars keep working.
- `role` becomes a `room_members` row, not a user column. `staff`/`admin` → `room_members.role`;
  `isPresenterRole` (`auth.ts:13`, `staff || admin`) is the same predicate as the API's
  `role.is_staff()`.

The ~460 guest rows are test residue and are **not** migrated. They exist because a previous
build auto-provisioned an account per visitor, which `connection.ts:96` has already stopped
doing.

## 3. The deployment constant the room does not have yet

The API is multi-room; every route is `/api/v1/rooms/{room_id}/…`. The room app is single-room
and has no room entity at all — `.env.example` already says so for the SFU:

> the app's schema has no room entity (messages.room is a chat-channel label), so this is a
> deployment constant for a single-room deployment

So the cutover needs `TRADINGROOM_ROOM_ID` exactly as `MEDIA_ROOM_ID` exists today, plus
`TRADINGROOM_API_URL`, which `tradingroom-api.ts:40` already reads with a default of
`http://127.0.0.1:8080`.

`TRADINGROOM_ROOM_ID` was briefly added to `.env.example` and then removed again: nothing reads
it yet, and config that precedes its consumer reads as progress without being any. It lands in
the same change as the identity resolver that consumes it.

---

## 4. Action → endpoint map

30 route paths exist in `services/api/src/http/v1/mod.rs`; 19 actions exist in
`+page.server.ts`. The mapping:

| Action                 | Endpoint                                              |
| ---------------------- | ----------------------------------------------------- |
| `logout`               | `POST /api/auth/logout`                               |
| `newSessionNoteTab`    | `POST /rooms/{r}/notes`                               |
| `saveSessionNote`      | `PUT /rooms/{r}/notes/{id}`                           |
| `renameSessionNoteTab` | `PATCH /rooms/{r}/notes/{id}`                         |
| `deleteSessionNoteTab` | `DELETE /rooms/{r}/notes/{id}`                        |
| `restoreNoteVersion`   | `POST /rooms/{r}/notes/{id}/versions/{v}/restore`     |
| `setWelcomeMatNoteTab` | `PUT /rooms/{r}/notes/{id}/welcome-mat`               |
| `editUsername`         | `PUT /rooms/{r}/me/display-name`                      |
| `sendMessage`          | `POST /rooms/{r}/channels/{c}/messages`               |
| `replyMessage`         | `POST /rooms/{r}/channels/{c}/messages` (`replyToId`) |
| `postAlert`            | `POST /rooms/{r}/alerts`                              |
| `askQuestion`          | `POST /rooms/{r}/alerts/{a}/questions`                |
| `sendPoll`             | `POST /rooms/{r}/polls`                               |
| `sendPollAnswer`       | `POST /rooms/{r}/polls/{p}/answer`                    |
| `pollDone`             | `POST /rooms/{r}/polls/{p}/close`                     |
| `savePoll`             | `POST /rooms/{r}/saved-polls` ✅ verified 2026-08-04  |
| `deleteSavedPoll`      | `DELETE /rooms/{r}/saved-polls/{id}` ✅ verified      |
| `saveTheme`            | `PUT /account/theme`                                  |
| `messageAction`        | multiplexer — see below                               |

`messageAction` is 216 lines and is the only one that is not a single call. It fans out to
`DELETE|PATCH /rooms/{r}/messages/{id}`, `POST|DELETE /rooms/{r}/messages/{id}/reactions`,
`POST|DELETE /rooms/{r}/members/{m}/mute`, and `.../personal-mute`. Split it first; it is the
one place where a mechanical translation is not enough.

> **Unverified:** every row above except the two marked ✅ was mapped from route names and
> action names, not by reading both bodies. Re-verify per action at execution time — this is
> exactly the kind of "looks obvious" mapping that produced the `savePoll`/`sendPoll` mislabel
> corrected on 2026-08-03.

### `load`

`+page.server.ts:81-362` returns ~15 keys. The API side is `GET /rooms/{r}` (overview),
`/channels`, `/channels/{c}/messages`, `/alerts`, `/alerts/{a}/questions`, `/notes`,
`/saved-polls`, `/me/muted` and `/account/preferences`.

Two parts of `load` are **not** API-backed and must survive untouched: `capturedRoom.messages`
and `capturedRoom.alerts` (`+page.server.ts:342-345`) are capture fixtures, and `sessionHandle`
is a local one-way digest (`connection.ts:70`).

---

## 5. One behaviour change this forces, already recorded

`GET /rooms/{r}/saved-polls` refuses non-staff. `+page.server.ts:319-331` currently returns
`savedPolls` to **every** role. A member must be given `[]` rather than a call to that route, or
their page load 403s. Tracked as TODO 7.

---

## 6. Order of execution

1. Seed the **3** authenticating accounts into Postgres by SQL, with `room_members` rows
   carrying the role and **newly set argon2id passwords** (see §2 — the scrypt hashes cannot be
   carried over). Verify login against `POST /api/auth/login` before touching any room code.
2. Add `TRADINGROOM_ROOM_ID` and `TRADINGROOM_API_URL` to `.env.example` and `.env`.
3. Replace `connection.ts` / `auth.ts` / `hooks.server.ts` with API-backed identity.
4. Replace `load`.
5. Replace the 18 single-call actions.
6. Split and replace `messageAction`.
7. Delete `src/lib/server/db/`, the Drizzle schema, `drizzle/`, and the `DATABASE_URL` SQLite
   path. The old stack goes when nothing points at it.
8. `pnpm test` (195) and `pnpm run format:check` green at every step.
