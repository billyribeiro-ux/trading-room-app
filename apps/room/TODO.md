# TODO

Deferred work, with the evidence needed to do it safely. Each entry records what
was already investigated so the next attempt does not re-derive it — or walk into
a trap that was already found.

**This file lists only OPEN work.** Resolved entries were moved to
`apps/room/docs/RESOLVED-ARCHIVE.md` on 2026-08-10 — eleven evidence-gap rows, the Files-pane
section, and sections 3, 3d and 8. They were moved rather than deleted because `CHANGELOG.md`
begins on 2026-08-09 and all of them closed between 08-04 and 08-08, so nothing else in the tree
records them.

---

## Evidence gaps

Things I could not find in the evidence and therefore did **not** build or guessed at. Required by
the "evidence is READ, never searched" rule in `CLAUDE.md`: never invent the value, record it here,
and ship a console script that can fetch it.

The collector for every item below is `scripts/ptr-collect.js` — paste it into the Chrome console on
the live room, as either role, and it downloads a JSON by itself.

| #   | Missing                                    | Where I already looked                                                                                                                                                                                                                                                                                                     | Blocks                                                                                                                                                                                                                                            |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Files sort bar's **CSS**               | its MARKUP is closed — reproduced byte-for-byte from the owner's rendered capture, icon class-order flip included. The rules were searched for in `main.d6d3c112b59b7d0d.js`, `css/complete-app-styles.css`, `app-room/app-room-file.clean.html` and the `app-presentationarea.full.js` const table — absent from all four | nothing visibly: the bar renders. But its `12px` / `var(--tabs-color)` are **inherited from the sibling `.st-file*` family, not captured**, so if the real bar differs we would not know. Closing it needs a computed-style read of the live bar. |
| 2   | The **bundle hash** of the live deployment | Ours is `main.d6d3c112b59b7d0d.js`                                                                                                                                                                                                                                                                                         | Everything. If the live hash differs, "absent from the bundle" means "absent from an OLD build" and every such finding needs re-reading. This is the highest-value single datum.                                                                  |
| 3   | Wire payloads for the file row actions     | Every dump is DOM-only; `second-dump/decoded/10-gaps/honest-gaps.json` states there are no network/WebSocket captures                                                                                                                                                                                                      | `deleteFile`, `playMP3ForAll`, `stopMp3ForAll` and `uploadFile` are implemented against the capture's _client_ code and our own server. The real server contract is unverified.                                                                   |
| 4   | `mp3Playing` / the **Stop For All** button | `O(83, o.isP && o.mp3Playing ? 83 : -1)` is the only reference                                                                                                                                                                                                                                                             | Not built. Needs to be seen live with a sound playing.                                                                                                                                                                                            |
| 5   | The **private-chat message log**           | `app-privchat.full.js` gives `downloadLog()`'s serialiser (`{t, n, txt}`) but no rendered rows exist in any dump                                                                                                                                                                                                           | `app-privchatscroller` is a stub, so "Download Log" writes an empty file.                                                                                                                                                                         |
| 6   | Five theme variables                       | Referenced by the generated sheet, defined by neither captured stylesheet: `--app-primary-color`, `--border-color`, `--chat-header-bg`, `--chat-header-color`, `--textarea-holder-btns-hover-color`                                                                                                                        | Anything resolving them falls back.                                                                                                                                                                                                               |
| 7   | The external image CDN                     | `PUBLIC_PTR_UPLOAD_SERVER` / `PUBLIC_PTR_CDN_UPLOAD_KEY` are empty; the capture posts to `${uploadServer}/image/${sessionHandle}` with `Client-ID` auth and reads `data.link`                                                                                                                                              | Alert/composer image uploads fall back to the room's own uploader. Captured path is kept and wins if the env is ever set.                                                                                                                         |
| 8   | Alerts/chat rendering at narrow widths     | The four captured `@media` rules ARE shipped and were verified; our own fixed-height overrides were the bug and are fixed                                                                                                                                                                                                  | Measured clean (no fixed-height overflow, no horizontal scroll) at 1600/1280/992/768/600/480/375, but **not** diffed against the real app at those widths.                                                                                        |

### Added 2026-08-06

| #   | Missing                                              | Where I already looked                                                                                                                                                                                                                                                                                                                                                                                                                                             | Blocks                                                                                                                                                                                                                                                      |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | `dontShowRecInfoToUsers` in session data             | referenced by the `[ REC ]` tooltip gate in `app-room.full.js`; absent from our `sessData`                                                                                                                                                                                                                                                                                                                                                                         | read defensively and treated as OFF, matching the capture's default of SHOWING the name. If the real session sets it, a member would see a filename they should not.                                                                                        |
| 10  | The `???` self-chat variant                          | `startPC` on the roster and the user-info modal both alert `Chatting with yourself again???`; the message path uses one `?`                                                                                                                                                                                                                                                                                                                                        | those two entry points are not built, so neither string is reachable from them.                                                                                                                                                                             |
| 11  | Private-chat image upload                            | `imgUpload()` / `onImagePaste()` in `app-privchat.full.js`, both posting to the same absent CDN as gap 7                                                                                                                                                                                                                                                                                                                                                           | no image sharing inside a private thread.                                                                                                                                                                                                                   |
| 12  | `mp3Playing`                                         | `O(83, o.isP && o.mp3Playing ? 83 : -1)` is the only reference in the bundle                                                                                                                                                                                                                                                                                                                                                                                       | "Stop For All" is not built.                                                                                                                                                                                                                                |
| 13  | `getStats()` on a REAL desktop share                 | measured on the headless synthetic pattern only — full 1920×1080 reaches the member, `qualityLimitationReason: none`, `bandwidth: 0`, `cpu: 0`                                                                                                                                                                                                                                                                                                                     | `streaming-choices.md` rows 2, 3 and 6 stay hypotheses until this exists.                                                                                                                                                                                   |
| 19  | Three more `isLimitedPresenter` surfaces             | two of the five are BUILT (2026-08-07): the user-info modal's rename pencil (`O(9)`, now a three-way with `canEditUsername` -> `editUsernameByUser`) and its whole administrative body (`O(14)`). The other three are the delete-all control in both message logs and the two log-download menus, all of which live inside an ARCHIVED LOG ENTRY - and `chat-logs-modal` / `alerts-logs-modal` are empty shells reading "There are no archived chats at this time" | gating a control that does not exist would be dead scaffolding. They need the archive list first, which needs archived logs.                                                                                                                                |
| 18  | A transcript page, and anything to put on it         | `toggleSpeechRecoHistory()` on the room component and `openTranscriptPage()` on the presentation area are byte-for-byte the same body - both open `#/session-transcript?token=…&name=…`. Nothing in this repo produces a transcript: `currentCaption` is never assigned, because the capture runs the Web Speech API on the presenter's machine and relays results over the socket, and neither half is wired                                                      | both controls now render behind their captured gates (`archivesAvailableTo()` for the overlay button, the Archives menu for the sidebar item) and both report the gap plainly instead of being dead links. Building the page needs the caption relay first. |
| 14  | Whether a paused recording is excluded from the file | `pause()`/`resume()` proven called and the state changes; the OUTPUT is unchecked                                                                                                                                                                                                                                                                                                                                                                                  | needs `ffprobe` for duration and seekability; not installed here.                                                                                                                                                                                           |
| 23  | The Benzinga default URL cannot be built             | `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${sessionID}&id=${sessData.uuid}&tok=${sesionToken}`. `sessData.uuid` is not one of the 268 settings, `sesionToken` is the controller's session credential and has no business in a page, and the host is the reference's own                                                                                                                                                                        | a room renders Benzinga only when `altBenzingaLinkURL` is set. Three blanks in a URL is a broken link wearing a logo.                                                                                                                                       |
| 24  | Nothing SENDS `giveMicScreen`                        | the receiving half is built and correct: it is a top-level command carrying `{give}`, not a `remotePresCommand` subCmd, and its subscriber sets `isLimitedPresenter`. The capture's sender is `giveMicScreen(e)` on the user-info modal - it refuses a self-target (`Can't give 'Mic/Screenshare' to yourself.`) then `sendServerAdminCommand("giveMicScreen", {user, give})` - but WHICH element calls it has not been located in the decoded template            | so `isLimitedPresenter` can only ever be false at runtime today. Both predicates that read it are driven through every combination in `roster-gates.test.ts`; what is missing is the button. A guessed one would be dead scaffolding.                       |
| 29  | Five of seven membership fields are dropped          | the reference loads `hasMic`, `hasScreen`, `hasCam`, `hasAdminChat`, `canEditNotes`, `denyArchivesAccess` onto `globals.user` at room join, and puts three of them in the media join itself: `isP: isPresenter \|\| hasCam \|\| hasMic \|\| hasScreen`. The room reads two and ignores the rest; its own mic/cam/screen toggles have no permission gate, and `canEditNotes` is decided by role                                                                     | `docs/SEAM-AUDIT-2026-08-07.md` §2.1, Phase B. Consuming the three media permissions also makes `isLimitedPresenter` reachable without a `giveMicScreen` sender (gap 24).                                                                                   |

---

## 1. Rename `ptr_clone` → `tradingroom`

**Status 2026-08-31: the runtime role is DONE by migration and now PROVEN on a live cluster; the
rest is smaller than this entry claimed, and its "belongs at the source repository" is withdrawn.**

**Two blockers this entry inherited are gone, and neither was retired by doing the work.**

_"Deliberately not done from this repository: `services/**` is a mirror"_ — **false, and recorded as
false.** `CLAUDE.md` states this repository is `services/**`'s authority, and
`verify-backend-provenance.mjs:122-128` is the measurement behind it: it searched `scripts`, `ops`,
every per-app scripts directory, `.github` and the root manifest, found **no sync in either
direction**, and records the owner confirming on 2026-08-12 that the siblings are reference only.
The same entry routed the work to root `TODO.md` item **P**, which no longer exists.

_"every one of those assertions is a runtime check needing a provisioned cluster to verify"_ — a
cluster was started here on 2026-08-31 (PostgreSQL 16.13, the version this entry names) and the
whole chain was run against it. **What this entry asserted from reading is now measured:**

| measured 2026-08-31                                  | result                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `0001` → `0009` applied in order on a fresh database | **all nine OK**, each in a transaction                                                                 |
| `0009` re-run on the same database                   | clean; prints _"parity verified: 87 relation, 26 column, 22 policy facts mirrored to tradingroom_app"_ |
| table privileges, both roles                         | **87 each — exact parity**                                                                             |
| RLS policies targeting `tradingroom_app`             | **22**, and **zero** name `ptr_clone_app`                                                              |
| `tradingroom_app` + tenant A's GUC                   | sees tenant A's room and no other                                                                      |
| `tradingroom_app` + tenant B's GUC                   | sees tenant B's room and no other                                                                      |
| `tradingroom_app` with **no** tenant GUC             | **0 rows — fails closed**                                                                              |
| `ptr_clone_app` + a valid tenant GUC                 | **0 rows**                                                                                             |

That last line is `0009`'s own security claim, in its own words — _"after this runs, `ptr_clone_app`
holds object privileges but is named by no policy, so under FORCE ROW LEVEL SECURITY it reads zero
rows from every tenant table"_ — and it is now a measurement rather than a reading. **The baseline
role is already inert with respect to tenant data.**

**And that migration is written and proven — `0010_retire_ptr_clone_app.sql`, 2026-08-31.** It
revokes every ACL class the role holds in the database it runs on and drops the role once that is
the last database in the cluster still granting to it. Measured across three databases on the same
PostgreSQL 16.13 cluster:

| database          | chain         | outcome                                                                                                       |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `ptr_clone`       | `0001`→`0009` | revoked, **role dropped** — it was the only database granting                                                 |
| `fresh_chain`     | `0001`→`0009` | revoked, **not** dropped, and said so: another database still granted. 0 grants remaining here                |
| `interlock_probe` | `0001`→`0008` | **REFUSED**, and the role survived the refusal. `0009` applied, then `0010` dropped the role from the cluster |

Three things that only a live cluster could have taught, each now written at the migration:

- **`DROP ROLE` is cluster-global while privileges are per-database.** The first draft dropped
  unconditionally and failed with _"72 objects in database interlock_probe"_ — which is the normal
  mid-rollout state, because `0001` re-creates this role on every new database. Exactly one failure,
  `dependent_objects_still_exist`, is tolerated and announced; anything else propagates.
- **A LOGIN role always holds a DATABASE grant.** `CONNECT` lives in an ACL no table-level revoke
  touches, and `DROP ROLE` refuses while it stands. The first live run failed on precisely that.
- **The residual count has to read the catalogue.** Through `information_schema` it was both too
  narrow (no database, schema or type ACL) and too wide (`column_privileges` reflects table grants
  onto every column: it reported 922 where 26 column ACLs existed).

After retirement `tradingroom_app` kept all 87 table grants and all 22 policies, tenant A saw only
A's room, tenant B only B's, and an unset tenant saw zero rows.

**What remains of this entry is the OWNER role and the database name** — `ptr_clone` →
`tradingroom_owner` / `tradingroom`. That half is an operator step and always was: migrations
authenticate as `ptr_clone`, and PostgreSQL answers `ERROR: session user cannot be renamed`.

`services/api/migrations/0009_rename_runtime_roles.sql` renames `ptr_clone_app` →
`tradingroom_app`, forward-only, guarded and idempotent. Proven against PostgreSQL 16.13 on all four
paths: absent → no-op; present → renamed; twice → clean; **both names present → refuses**, because
choosing one silently would decide which role owns the grants.

**A trap this entry did not record, now measured:** the OWNER role cannot be renamed by a migration
at all. Migrations authenticate as `ptr_clone`, and PostgreSQL answers
`ERROR: session user cannot be renamed` — while the same statement from another session succeeds.
It is an operator step, written up in `ops/postgres-runtime-role-hardening.md`.

**The scope below is wrong, and that matters.** It says 570 occurrences as though the job were a
find-and-replace. Measured 2026-08-10: **594 outside `second-dump/`, of which ~445 (three quarters)
must keep the old name permanently** — 383 in the checksum-pinned `0001_baseline.sql` alone, plus
the applied migrations, the provisioning script that must keep creating `ptr_clone_app` for those
migrations to apply, the evidence verifier, and the historical documents. RLS policies need nothing:
targets are stored by OID, not by name.

**What is left: ~150 live occurrences**, all inside `services/**` — connection defaults, the
release-attestation expected values, and the role-name assertions in `tests/migrations.rs` (43) and
`tests/tenancy.rs` (11). Deliberately not done from this repository: `services/**` is a mirror, this
entry itself says to do it "at the source repository, as its own dedicated change", that tree has
already diverged twice, and every one of those assertions is a runtime check needing a provisioned
cluster to verify. Tracked with the rest of the mirror promotion as root `TODO.md` item **P**.

The original write-up is kept below, because its four traps are still the reason this is careful
work — and trap 3's answer changed: neither role exists in the local cluster any more, so
scram-sha-256 must be re-verified per target rather than trusted from 2026-08-03.

### The decision

| Thing                      | New name            |
| -------------------------- | ------------------- |
| Database                   | `tradingroom`       |
| Owner / migration role     | `tradingroom_owner` |
| Runtime / application role | `tradingroom_app`   |

Not `tr_*`. The codebase already settled on `tradingroom`: crates
`tradingroom-api` and `tradingroom-media`, cookies `__Host-tradingroom_access`
and `__Host-tradingroom_refresh`, env var `TRADINGROOM_API_URL`, domain
`tradingroom.app`. `ptr_clone` is the only holdout, and `tr_` would introduce a
third naming style.

### Scope

1,433 occurrences across 41 tracked files. They split into two groups and the
split is the single most important thing on this page.

| Group            | Occurrences | Action           |
| ---------------- | ----------: | ---------------- |
| `second-dump/**` |         863 | **DO NOT TOUCH** |
| Ours             |         570 | Rename           |

**`second-dump/**` is captured evidence of the ORIGINAL system.** `ptr_clone` is
what that system was actually called. Those artifacts are SHA-256 pinned and
verified by `scripts/verify-postgres-schema-artifacts.mjs`, which runs inside
`pnpm test` and currently passes with "Canonical artifacts: 1,960 / 290 / 2,814
lines; SHA-256 exact". Renaming anything under `second-dump/` breaks the evidence
contract and destroys the provenance of the capture. It stays `ptr_clone`
forever.

Ours, by area: `services/` 528, `scripts/` 13, `.github/` 12,
`docker-compose.yml` 7, `docs/` 6, `PROJECT_VISION.md` 4.

Note `scripts/verify-postgres-schema-artifacts.mjs` is in the "ours" column but
**asserts against the captured artifacts**, so its `ptr_clone` references must
survive. Read it before editing.

### Trap 1 — five applied migrations name the role

`0001_baseline`, `0003_room_events`, `0004_list_memberships`,
`0005_harden_runtime_role_and_room_events_policy`, and
`0006_restrict_runtime_object_privileges` all reference `ptr_clone_app`.

**This cannot be a find-and-replace.** Editing an applied migration changes its
sqlx checksum and every existing database refuses to migrate. That is not
hypothetical — it is exactly what has already happened to the legacy database on
this machine, whose recorded checksums for migrations 2 and 3 no longer match the
files, so it can never be migrated forward again.

The rename must be a **new forward-only migration at the next unused number**
performing `ALTER ROLE … RENAME TO …`. Existing migrations are never touched.

(This entry has now said `0007` and then `0008`, and both were taken while it sat
here — by `0007_saved_polls.sql` and `0008_room_events_tenant_keys.sql`. Read the
directory rather than trusting a number written in prose.)

### Trap 2 — bootstrap ordering on a fresh database

`services/docker/postgres/10-provision-roles.sh` creates the roles at container
init. Migrations `0001`–`0006` then `GRANT` to `ptr_clone_app`.

So the provisioning script must **keep creating the OLD names**, or those
migrations fail on any fresh database. `0007` renames afterwards. A fresh
database therefore ends at `tradingroom_app` having passed through
`ptr_clone_app`.

This is correct but reads as a mistake. Comment it in the script or someone will
"fix" it.

### Trap 3 — password survival

`ALTER ROLE … RENAME TO` **clears the password when it is stored as md5.** Both
roles on this machine are `scram-sha-256`, verified against `pg_authid`, so the
rename preserves them here. **Re-verify on every target before renaming.** The
failure mode is a login that stops working with no other symptom.

RLS policies reference roles by OID, not name, so policy targets survive a
rename automatically.

### Trap 4 — it edits release-evidence code

`services/api/src/bin/postgres-release-attestation.rs` hardcodes the names as
**expected values**, including `"scram-sha-256:ptr_clone_app"`,
`certificate-subject:ptr_clone`, and an assertion that `room_events` is
"targeted only to ptr_clone_app". That binary produces the release attestations
the cutover contract depends on.

`services/api/tests/migrations.rs` carries 45 further occurrences asserting on
role names, and `tests/tenancy.rs` 11.

### When to do it

**After the two working folders are consolidated** (see entry 2), at the source
repository, as its own dedicated change with nothing else moving.

Doing it now would mean a 570-occurrence edit through auth, RLS policy targets,
applied migration history, live databases and release attestation — landing on
top of a `services/` sync that is hours old.

### Order when it happens

1. Confirm `scram-sha-256` on every target (Trap 3).
2. Add `NNNN_rename_runtime_roles.sql` at the next free number, guarded and
   idempotent.
3. Leave `10-provision-roles.sh` creating the old names; comment why (Trap 2).
4. Update Rust defaults, `.env.example`, `compose.yml`, `Dockerfile`, CI.
5. Update the attestation binary and its expected values (Trap 4).
6. Rename the live databases — requires zero active connections.
7. Full suite, then regenerate the release attestation.
8. Leave `second-dump/**` untouched and re-run the evidence contract to prove it.

---

## 4. Media: prove the path, not just the boundary

**Status:** open. Detail in `docs/PRODUCT-OVERVIEW.md` §8.1.

The SFU is deployed on the **Hetzner box** (`87.99.154.155`) at
`media.tradingroom.app`, live 2026-08-09 12:44 EDT, and its admission boundary is proven — Origin,
Ed25519, expiry, replay ceiling, TLS, upgrade, and on 2026-08-09 20:36 a real minted grant was
admitted end to end (101, router created). **RTP, TURN, and real-device cells are not.** Also
open: single-use/node-bound grants, a real readiness check, bitrate ceilings, media metrics, and
the OpenSSL 3.0.8 rebuild.

(This entry said "AWS Lightsail" until 2026-08-10. The product name was right — it was
`mediasoup-test-01` on Lightsail, confirmed against the Lightsail API — but the deployment had
already moved to Hetzner on 08-09, and the Lightsail instance was **deleted 2026-08-10 05:14 EDT**.
`docs/RETIRE-AWS-SFU.md` is the record.)

---

## 5. Wire the room to the API and delete SQLite

**Status:** open, and re-measured 2026-08-31 — **every number this entry carried was stale, and one
of them had quietly become self-referential.**

| the entry said                         | measured 2026-08-31                                                                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grep -rn "/api/v1" src/` returns zero | **3 hits — and all three are PROSE saying "zero `/api/v1` calls"**. Stripped of comments: **0**. The claim is intact; its measurement now matches the documentation of itself                                                                              |
| 20 SvelteKit form actions              | **2**, and neither is a JS dispatcher: `routes/logout` and `routes/session`, both progressive-enhancement form POSTs. The other eighteen became remote functions on 2026-08-30; `routes/+page.server.ts` exports none and a contract asserts the empty set |
| 15 SQLite tables                       | **27**                                                                                                                                                                                                                                                     |
| a 29-route Rust API                    | **37** routes                                                                                                                                                                                                                                              |

That grep is the entry worth pausing on. It is a real measurement that has been quoted for weeks and
would now return three, and a reader checking it would find the number wrong and the conclusion
right. **A measurement that matches this repository's own prose about the measurement is not a
measurement.** Comment-stripped is the form to use, which is the rule `codeOf` exists for.

**No longer depends on entry 2.** That entry rested on `services/**` being a mirror that drifts, and
`verify-backend-provenance.mjs:122-128` searched for a sync in either direction, found none, and
records the owner confirming on 2026-08-12 that the siblings are reference only. There is no second
tree to target: this repository is `services/**`'s authority.

**What the conversion changed about the size of this entry, and it is not smaller.** Eighteen form
actions became eighteen remote functions, each a typed command with its own gate — so the cutover
now has eighteen well-defined seams to move rather than eighteen `fetch('?/name')` strings whose
endpoint, argument type and failure meaning were all agreements nothing checked. The work is the
same; what it is made of is better.

### 2026-08-05: the room now has a realtime channel, and it is process-local

This entry got materially more urgent. The room had NO realtime transport at all — a presenter's
alert never reached a member without a reload. That is now fixed with a publish/subscribe hub and
an SSE endpoint on the capture's own path shape (`src/lib/server/room-events.ts`,
`src/routes/sess/[room]/events/+server.ts`), carrying 7 of the capture's 10 channels. Measured:
alerts, chat and presenter commands all reach a second peer in ~1.2s.

**The hub keeps its subscriber set in module state, so it does not survive a restart and does not
span instances.** The durable answer is exactly this entry: `services/api` already listens on
PostgreSQL `room_events` (`services/api/src/jobs.rs`) and that is unused. The hub was deliberately
shaped for a one-line swap — one `publishToRoom`, one subscribe, nothing else transport-aware.

Protocol evidence is regenerable: `node scripts/extract-realtime-protocol.mjs` →
`docs/generated/realtime-protocol.json` (10 channels, 42 client commands, 104 server cases).

---

## 6. Flaky media test

**Status:** open, reproduced once.

`server::tests::the_room_is_told_when_a_producer_and_then_a_peer_goes_away`
failed once under full-workspace load with `MID already exists in RTP listener
[mid:0]` at `media/src/server.rs:1739`. Passes isolated ×3, passes with the media
lib alone, passed on the next full run. Order- or load-dependent, in a media path
that will see far more concurrency in production than this suite does.

---

## 9. The server layer had no behavioural tests — and that hid a leaked password hash

**Status:** the leak is **fixed**; the coverage gap is **closed for all 20**, and the two remainders
this entry named for itself are closed too — 2026-08-30. 2026-08-04.

**They are not "actions" any more, and the distinction matters to anyone reading this entry now.**
All twenty became remote functions during 2026-08-30; `routes/+page.server.ts` exports no form
actions at all and a contract asserts the empty set. The coverage this entry is about survived the
conversion because each test was rewritten onto `callRemote` rather than re-pointed as text — every
assertion still executes against the live database.

### The leak

`+page.server.ts` built the connected user as `{...requireUser(locals)}`, spreading the whole
`users` row into the page payload. That row includes `password_hash`, so the scrypt digest of
the logged-in account was serialised into the SSR HTML and into `__sveltekit` data on **every
page load** — reaching the browser, any cache in front of it, and any HAR file attached to a
support ticket.

Proven, not inferred:

```
KEYS: avatarUrl, createdAt, displayName, email, emailHash, id, passwordHash, role, status
CONTAINS HASH: true
```

Fixed by naming the eight fields the client actually needs. Named rather than filtered, so a
column added to `users` later is a compile-time decision about whether the browser may see it.
Pinned by an exact-key-set assertion in `page-load-contract.test.ts`.

Same class as the raw `ptr_connection` value `publicSessionHandle` was written to stop: a
credential reached the browser because a shorter expression was available.

### It survived because nothing executed the code

`+page.server.ts` is 1,157 lines and had **zero** behavioural coverage. The rest of the suite is
pure functions, render contracts and source-text pins; `authorization-contract.test.ts` reads the
server as a _string_.

### Coverage now

| Surface                                                           | File                                    | Tests |
| ----------------------------------------------------------------- | --------------------------------------- | ----: |
| `load`                                                            | `page-load-contract.test.ts`            |     5 |
| 5 poll actions                                                    | `poll-actions-contract.test.ts`         |    12 |
| `messageAction` (216 lines)                                       | `message-action-contract.test.ts`       |    16 |
| 4 content actions                                                 | `message-alert-action-contract.test.ts` |    17 |
| 6 notes + `editUsername`, `saveTheme`, `logout`, `savePreference` | `notes-account-action-contract.test.ts` |    16 |

**All 20 actions covered.** The room suite went 197 → 263 across 2026-08-04.

Note the count: this entry said 19 actions for most of the day. It is **20** — `savePreference`
was missed by an `awk` over the file and only turned up when the list was enumerated properly at
the end. Enumerate, do not estimate.

### Two remainders — both CLOSED 2026-08-30, and one of them had a blocker that was never true

1. **The captured-item branches inside `messageAction` (`id < 0`)** — covered, in
   `message-action-contract.test.ts`. This entry said they _"need the fixture wired up"_. The
   fixture needed no wiring: it is `server/captured-message-fixture.json`, a tracked JSON file that
   `captured-room.ts` imports directly and which resolves anywhere. The blocker was inherited rather
   than measured, and re-measuring it is the whole of what closed it — the same lesson
   `missing-settings-triage.md` records about `altChatRender`.

   Four assertions: a presenter's delete records a `hidden_room_items` row **keyed to this room**, a
   member the capture does not attribute to gets 403, an edit lands in `captured_item_overrides`
   with the same room key, and — the one worth having — **the same negative id from a room that is
   not the capture's is refused 404**. Every room is served the same fixture rows, so an unscoped
   negative id is a cross-tenant write: one room's delete landing on evidence another room is being
   shown. Control: removing `capturedRoomItem`'s room check makes that delete SUCCEED from room 9999. 404 rather than 403 is deliberate — from a room not rendering the capture the item does not
   exist, and 403 would confirm it exists somewhere, which is an oracle over another tenant.

   Two things were found on the way in. The file's `vi.mock` predated the `deleteAlertPW` door and
   omitted `checkAlertDeletePasswordRemotely`, so the whole delete branch threw before reaching any
   assertion; and its `beforeEach` cleared three tables but not these two, so the first hide
   survived into the next test and made a refusal look like a write. A `beforeEach` listing SOME of
   the tables a file writes is worse than one listing none, because it reads as complete.

2. **`restoreNoteVersion`'s happy path** — covered, in `notes-account-action-contract.test.ts`,
   through the command rather than beneath it. The repository test proves the restore; what it
   cannot prove is what the wrapper adds — that the room comes from the SESSION and not an argument,
   that the caller's id is what lands in `updatedById`, and that a null becomes 404 rather than 500
   or success. The restore is performed by a DIFFERENT presenter from the one who wrote the version,
   because restoring your own would pass whether the command passed the caller through or the
   version's author. Controls: crediting a fixed user id, and reusing the latest version number
   instead of appending — both red.

   `saveNote` COALESCES a same-author save inside its window, so two saves by one person make ONE
   version. The first draft asserted two and its own vacuity guard caught it.

### Divergences from the API these tests caught

Each is invisible through the shipped client, which is exactly why it needed pinning — the
cutover would have changed behaviour on a path no test covered and no user can reach today.

|                                     | SQLite today      | API                           |
| ----------------------------------- | ----------------- | ----------------------------- |
| `sendPollAnswer`                    | first answer wins | last answer wins              |
| `deleteSavedPoll` with a missing id | `{success: true}` | 404                           |
| `editUsername` with a missing id    | `{success: true}` | route renames the caller only |

### Guards that must survive the cutover

- `!isOwner && (!isPresenter || message.isAdmin)` — a presenter may edit an ordinary member's
  message but **not** another admin's.
- `sendMessage` refuses a channel outside `CHAT_TABS`. `messages.room` is a label, not a foreign
  key, so without it a crafted request parks invisible content in every reader's payload.
- `postAlert` keeps `targetUrl` only for `kind === 'media'`.
- `askQuestion` keys "answered" off **authorship, not role**.
- `editUsername` — the guard once read `role === 'user'`, a role no row holds, so it never fired
  and any caller could rename any account. Pinned in its positive form.
- `savePreference` merges into `settings_json`; a PATCH that replaces the document is the bug.

The cutover is now mechanical against a suite that can see it.
