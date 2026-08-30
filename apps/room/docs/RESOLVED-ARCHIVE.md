# Resolved room work — the archive

Everything in here is **closed**. It was moved out of `apps/room/TODO.md` on **2026-08-10 05:0x
EDT** so that file lists only open work, matching the convention already stated at the top of the
root `TODO.md`: closed items are removed rather than struck through, because a list that is mostly
strikethrough is a list nobody reads to the bottom of.

**It was moved, not deleted.** `CHANGELOG.md` begins on 2026-08-09 and these were closed between
**2026-08-04 and 2026-08-08**, so nothing else in the working tree records them. Several contain
findings that are still worth reading — §8 in particular, where restoring the evidence base turned
up a real tenancy defect within the hour.

Nothing here is a live instruction. Do not work from it — **with one exception.** §3d's closing
subsection, "Why the five `.svelte` files are ignored rather than formatted", explains a
`.prettierignore` entry that is **still in force**: those templates are excluded from formatting
deliberately, because this room is verified by screenshot diff and whitespace between inline
elements is rendered whitespace, so reflowing a template can shift layout by a space's width.
Read it before "fixing" that ignore rule.

---

## Evidence-gap rows resolved 2026-08-06 to 2026-08-08

Kept in their original table form. `#` is the gap number they carried in `apps/room/TODO.md`.

| #   | Missing                                                         | Where I already looked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Blocks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | ~~The captured VALUES of the sidebar session flags~~            | **RESOLVED 2026-08-06** - the room no longer holds values for these at all. `sessData` was a hardcoded literal; it now comes from `new-room-control`'s `room_settings` through `internal/room-config/[code]`, narrowed to the twelve the room has a consumer for                                                                                                                                                                                                                                                                                                                                                                                                   | there is nothing left to capture: a room's settings are whatever its owner sets on its Manage page, and a newly created room has no settings row, so unset means off. Proven by `scripts/room-config-seam-e2e.mjs`: `simUserCount` 0 -> 40 -> 0 moves the room's headcount 1 -> 41 -> 1.                                                                                                                                                                                                                                                             |
| 17  | ~~A free-trial flag (`isFT`)~~                                  | **RESOLVED 2026-08-06** - `room_users.is_free_trial` in the controller, not a column here. Alongside `hasAdminChat` (one of five `permissions_json` keys) and `denyArchivesAccess`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | all three are per-room, which a column on `users` could not express. `isLimitedPresenter` turned out to be stored by nobody: `giveMicScreen` assigns it at runtime, so it is runtime state here too.                                                                                                                                                                                                                                                                                                                                                 |
| 15  | ~~The captured VALUE of `sessData.userUploads`~~                | **RESOLVED 2026-08-06** - a per-room setting read from the controller. `PTR_USER_UPLOADS` is deleted; it was a process-wide switch standing in for a per-room one, so two rooms on one deployment could not disagree about it                                                                                                                                                                                                                                                                                                                                                                                                                                      | the room asks; the owner decides, per room.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 20  | ~~The SSE hub cannot see a membership~~                         | **RESOLVED 2026-08-07** - it reads one config at subscribe time, which is once per CONNECTION and not on the message path at all. `isFT` and `hasAdminChat` on a published `RosterUser` are the controller's real per-room values; a failed read falls back to the session's own role rather than taking the realtime channel down with it                                                                                                                                                                                                                                                                                                                         | it mattered because the roster is what OTHER people see: false for everyone made a trial invisible to the TRIAL filter and an admin-chat member indistinguishable from a participant in every other browser.                                                                                                                                                                                                                                                                                                                                         |
| 21  | ~~Mobile App Info and Benzinga are NOT BUILT~~                  | **RESOLVED 2026-08-07** - both built and proven live. Mobile App Info: the empty `<p>` now holds the gated button (`O(12)` outside, `ptrMobileAppEnabled`/`customMobileAppEnabled`/`freeTrialsGetApp` inside), the navbar icon is gated and wired, and the modal in `ModalHost` stopped being static - a real six-digit pin comes from the controller's new `internal/mobile-pin`, `hideMobileCredentials` drops the block, and `customMobileApp*Url` replaces both links. Benzinga: `O(31)` with the `altBenzingaLogoURL` / icon fork                                                                                                                             | store links default to `https://www.tradingroom.app` - this is TradingRoom v1 and has no store listings, so inventing package ids would be two dead links behind two real badges. The Benzinga DEFAULT url is still not reproduced: it needs `sessionID`, `sessData.uuid` (not in the 268-key schema) and `sesionToken`, so a room without `altBenzingaLinkURL` renders nothing rather than a broken link.                                                                                                                                           |
| 25  | ~~One realtime channel for every room~~                         | **RESOLVED 2026-08-07.** `ROOM_CHANNEL` was the constant `'ptr-room'`, justified in the source by "this one has exactly one [room]". The controller falsified that: it creates as many rooms as an owner wants and the handoff says which one you entered                                                                                                                                                                                                                                                                                                                                                                                                          | until today every room's alerts, chat, roster and presenter commands reached every other room's members. The key is the session's own short code, and the SSE endpoint rejects a path naming a different room, so a URL edit cannot join you to somebody else's room.                                                                                                                                                                                                                                                                                |
| 26  | ~~The token type decided your role~~                            | **RESOLVED 2026-08-07, and it was a privilege escalation I introduced.** `/session` mapped `type: 'site'` to `staff`, and `isPresenter` — every gate, and every presenter-only server action — is `role === 'staff' \|\| 'admin'`. `requireOwnedRoom` admits any user in the ACCOUNT to `/launch/[id]` and `inviteRoomUser` puts an invited participant in that same account, so a role 2 Participant could launch and hold Archives, Get Random User, the user-info admin body, posting alerts, running polls and every presenter command                                                                                                                         | role now comes from the controller's membership on EVERY entry, in both directions: 0 Owner -> admin, 1 Presenter -> staff, 1+nonPresenter Admin / 2 / 3 / 4 / no membership -> member. Fails closed if the controller cannot be read. `scripts/role-authority-e2e.mjs` 12/12 asserts a real participant stays a member and a real owner does not.                                                                                                                                                                                                   |
| 27  | ~~A role change never reached a live session~~                  | **RESOLVED 2026-08-07.** `/session` wrote the role once, at entry, and seventeen server actions authorise against it. A session stays open for hours, so an owner demoting somebody changed nothing until they re-entered — they kept Archives, Get Random User, posting alerts, running polls and every presenter command meanwhile                                                                                                                                                                                                                                                                                                                               | the page load reconciles the stored role against the membership, writing only when it differs. Proven mid-session: promote -> presenter, demote -> the next load takes it away.                                                                                                                                                                                                                                                                                                                                                                      |
| 28  | ~~A banned member was let in~~                                  | **RESOLVED 2026-08-07.** Role 4 is the reference's BANNED, written by `applyUserOpcode` case 4 alongside the `banned` column. The role mapping sent it to `member` — correct as a role, wrong as an answer to whether the door opens — and nothing looked at the flag again                                                                                                                                                                                                                                                                                                                                                                                        | `/session` refuses with 403 and issues no session; a ban landing mid-session ends it on the next load. Both role and column are checked, because the roles are what the reference renders and the column predates that correction.                                                                                                                                                                                                                                                                                                                   |
| 32  | ~~`sessData.overwriteCashRegisterSound`, read **and** written~~ | Markup is complete: `Wwe`/`qwe` at `app-presentationarea.full.js:1889-1916`, consts 261/262/263, gates at 1972-1991, handler at 3084-3086 (`sendServerAdminCommand('overwriteCashRegisterSound', {url})`). CSS already ships at `src/lib/styles/captured-runtime-components.css:6972`. The setting is real in the controller (`new-room-control/src/lib/room-settings-schema.ts:79`, `wired: false`) but is **not** in `ROOM_VISIBLE_SETTINGS` (`room-config.ts:133-182`), and this room's only controller surface is two READ endpoints (`src/lib/server/control-plane.ts:50-65`)                                                                                 | **RESOLVED 2026-08-08.** Both halves landed. The setting is on `ROOM_VISIBLE_SETTINGS` so the gate has an input, and `POST /internal/room-setting/{code}` on the controller persists a presenter's choice — authenticated with the same bearer MAC as the other internal endpoints, and gated by a second, strictly narrower `ROOM_WRITABLE_SETTINGS`. The room action refuses a url that is not a `shared_files` row of THIS room, and refuses one that is not `audio/*`. "Set as alert sound" / "Remove as alert sound" now render, one at a time. |
| 33  | ~~`sessData.hideFiles`~~, and a `videoOnlyMode` equivalent      | `z('hidden', o.hideFiles)` on the main-tab `li` (`full.js:5375`) and on `#files` (5410-5413), fed by `sessData.hideFiles \| **hideFiles RESOLVED 2026-08-08.** Allow-listed, carried across, and `filesSectionHidden()`puts`hidden`on BOTH the main-tab`li`and the`#files` pane — hiding one without the other leaves either a tab that opens nothing or a pane reachable by a tab that is gone. **`videoOnlyMode` stays open and unbuilt on purpose:** it is not a setting but the recording-bot query-parameter global, and this room has no recording bot. The disjunction is written where it belongs so the second term can be added without moving anything. | globals.videoOnlyMode`(2289-2290).`hideFiles` exists in the controller (`room-settings-schema.ts:135`, "Hide Files Section?", `wired: false`) and is not allow-listed. `videoOnlyMode`is not a setting at all: it is a client global set from the`r` query parameter (`docs/source/main.d6d3c112b59b7d0d.js`offset 2596635,`f = s.get("r")`), the recording-bot mode, which this room does not have                                                                                                                                                  | The Files tab and pane are unconditional. An owner who ticks "Hide Files Section?" on the Manage page still sees them. One line in `ROOM_VISIBLE_SETTINGS` plus one field on `RoomSessionSettings` closes the `hideFiles` half; the `videoOnlyMode` half has no consumer here and should stay unbuilt until a recording bot does. |

---

## 3. Retire the legacy local database — RESOLVED 2026-08-04

**Status:** closed. Retired by rename; nothing was dropped.

```sql
ALTER DATABASE ptr_clone        RENAME TO ptr_clone_legacy_20260804;  -- 12 MB, all 755 rows kept
ALTER DATABASE ptr_clone_verify RENAME TO ptr_clone;
```

The state recorded immediately before, which confirmed the diagnosis in this entry:

|                      | migrations | public tables | users | messages |
| -------------------- | ---------: | ------------: | ----: | -------: |
| `ptr_clone` (legacy) |          4 |            25 |     8 |       23 |
| `ptr_clone_verify`   |      **8** |            26 |     8 |       23 |

Unblocked by stopping pid 84889 — the orphaned `tradingroom-api` release build that had held a
`LISTEN "room_events"` connection since 2026-08-01. `ALTER DATABASE … RENAME` needs zero
connections, and both databases were confirmed connection-free first.

**Proof it worked:** the full workspace suite now passes with **no environment overrides at
all** — 412 passed, 0 failed on the default connection strings. Every prior run in this
repository needed `MIGRATE_DATABASE_URL` and `DATABASE_URL` pointed at `ptr_clone_verify`,
precisely because the database named `ptr_clone` could not be migrated forward. That workaround
is now gone.

The legacy database keeps its checksum mismatch on migrations 2 and 3 and still cannot migrate
forward. It is retained for recovery only. Drop it once nothing has needed it for a while.

---

---

## 3d. `pnpm format:check` is red — RESOLVED 2026-08-04

**Status:** closed. `pnpm run format:check` → "All matched files use Prettier
code style!"

The entry said four files. The real number was **2,679**, because this entry was
written before the Rust workspace had been built: `services/target/` alone
contributed 2,120 build artifacts and `services/media/` another 496.

Resolved by applying one rule per entry in `.prettierignore` — SOURCE is
formatted, GENERATED and EVIDENCE are ignored:

| Ignored                                                                                                                                                      | Why                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `services/`                                                                                                                                                  | Rust workspace with its own `cargo fmt --all --check` gate; held here as a mirror. 2,617 of the 2,679. |
| `src/lib/styles/captured-runtime-components.css`                                                                                                             | Generated, header carries the source SHA-256. SSOT §1 forbids hand-editing it.                         |
| `css/complete-app-styles.css`                                                                                                                                | The file the above is generated FROM.                                                                  |
| `subtitles.clean.html`, `mention-reply-private-chat.clean.html`, `preview/`, `enterprise/`, `NEXT-STEP/`, `gap-dump/`, `docs/website-ptr1-prt2-full-read.md` | Raw captures. Evidence, not source.                                                                    |
| `pnpm-lock.yaml`                                                                                                                                             | Resolved by the package manager.                                                                       |
| `src/routes/+page.svelte` and 4 sibling components                                                                                                           | **Not** generated — deliberately deferred. See below.                                                  |

The remaining 40 genuine source files (`.ts`, `.mjs`, `.js`, `.yml`, `.md`) were
formatted.

### Why the five `.svelte` files are ignored rather than formatted

They are hand-written source and would normally be formatted. They are not,
because this room is verified by screenshot diff against a capture, and
whitespace **between inline elements is rendered whitespace** — prettier
reflowing a template can move a text node and shift layout by a space's width.
`+page.svelte` alone is an 1,800-line diff.

Formatting them is a deliberate decision to re-verify the pixel match afterwards,
not a cleanup. It stays out of the automatic gate until someone takes that on.

---

---

## 8. The evidence base is missing — RESOLVED 2026-08-04

**Status:** closed. `second-dump/db` (19 files, 0.6 MB) and `alert-section`
(9 files) were restored from `a1f92fb^` on the owner's instruction. The other 873
files of `second-dump/` stayed deleted: nothing reads them.

| Gate        | Before                                               | After                                                                      |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm test` | died at step 1, `ENOENT second-dump/db/RECREATE.sql` | **PASS** — "Canonical artifacts: 1,960 / 290 / 2,814 lines; SHA-256 exact" |
| vitest      | 194 / 195                                            | **195 / 195**                                                              |

### It paid for itself the same hour

Reading the restored `foreign_keys.tsv` (78 rows) and `unique.tsv` (39 rows) in
full turned up a real defect in `0007_saved_polls.sql`, written the day before
without them:

- `FOREIGN KEY (room_id) REFERENCES rooms(id)` — an independent key where all 14
  room-scoped tables in the reference use
  `(enterprise_id, room_id) REFERENCES rooms(enterprise_id, id)`. Two independent
  keys are each satisfiable alone, so a row could hold tenant A's
  `enterprise_id` beside tenant B's `room_id`, and RLS compares only
  `enterprise_id` — so it would read back as tenant A's while pointing into
  tenant B's room.
- no `<table>_tenant_id_unique UNIQUE (enterprise_id, id)`, which 19 of the
  reference's tenant tables carry.
- no `ON UPDATE CASCADE`, which all 78 of the reference's foreign keys carry.

An audit of all 18 room-scoped tables then found **`room_events`** with the same
defect plus two more: `audience_member_id` and `origin_member_id` referenced
`room_members(id)` alone, where the convention is
`(enterprise_id, room_id, <member>) REFERENCES room_members(enterprise_id, room_id, id)`.
That table is the realtime fan-out, so a member id resolving outside the event's
own room is the difference between a staff-scoped payload reaching staff and
reaching someone else. Fixed in `0008_room_events_tenant_keys.sql`.

`alert_media` also lacks `(enterprise_id, id)` UNIQUE and that one is **faithful** —
the reference does not give it that constraint either.

Both are now held by `every_room_scoped_table_pairs_its_tenant_keys` and
`a_room_event_cannot_point_at_another_tenants_room` in
`services/api/tests/migrations.rs`. The first discovers room-scoped tables from
the catalog rather than a list, so a table added tomorrow is covered without
anyone remembering.

---

---

### Added 2026-08-08 — the Files pane

Neither of these is an _evidence_ gap. Both are fully captured, down to the const table and the CSS
rule; what is missing is a capability on this side of the seam. **No collector script is warranted
for either** — running `scripts/ptr-collect.js` against the live room would return exactly what is
already in `docs/source/components/app-presentationarea.full.js`. What they need is the controller,
and the controller is another repository.

Both are pinned by `src/lib/files-pane-contract.test.ts` (describe `the alert-sound row buttons`),
which goes RED the moment either half is wired — that is the prompt to render the markup.

**BOTH RESOLVED 2026-08-08.** The prompt fired exactly as designed: the tests went red when the
controller side landed, and the markup followed. The rows are kept struck through rather than
deleted, because the paragraph above is the reasoning that got them closed and is worth keeping
next to the outcome.

| #   | Missing | Where I already looked | Blocks |
| --- | ------- | ---------------------- | ------ |

---

## Entries 3b, 3c and 7, closed and moved 2026-08-31

Moved out of `apps/room/TODO.md` under the convention this file's own header states. Each was
verified before it was moved — none was taken on its own word, and two of the three had already been
true for weeks while the register went on listing them as open.

**3b was resolved by the file simply not existing.** The entry says a second Cargo lock sits at
`services/media/Cargo.lock` in violation of the SSOT's "sole workspace lock". `find services -name
Cargo.lock` returns exactly one path, `services/Cargo.lock`, and `git ls-files` agrees. Its stated
blocker is worth reading as a lesson rather than as history: _"`services/**` is a mirror, so it must
be resolved at the source and re-synced rather than deleted here."_ **That premise is false and
`CLAUDE.md` records it as false** — "the rule that used to sit on this line was **false and cost
real time**", contradicted by `verify-backend-provenance.mjs`, which searched for a sync in either
direction and found none. The entry was blocked on a rule that had already been retracted.

**3c made three claims and all three are false today**, each measured rather than argued:

| its claim                                                                   | measured 2026-08-31                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "no `quality` script and no CI parity"                                      | both apps declare `gate`, and `package-scripts-contract.test.ts` asserts _"room gate runs CI's steps, in CI's order"_ and the same for the controller — parity is not merely present, it is enforced                                                                                       |
| "the drift check in `services/SYNC-PROVENANCE.md` is manual, so it can rot" | `verify-backend-provenance.mjs` runs in `.github/workflows/backend-quality.yml:316`                                                                                                                                                                                                        |
| "no gate verifies any number in `docs/*.md`"                                | at least five do: `evidence-gap-register-counts`, `room-surface-audit-counts`, `todo-next-coverage-contract`, `setting-coverage-contract`, `feature-coverage-contract` — and `missing-command-census-contract`, which recomputes a triage table on every run and fails in either direction |

The entry's own closing sentence asked for exactly what now exists. It stayed open because nobody
re-read it after building the thing it asked for, which is the failure this archive exists to stop.

**7 was already marked RESOLVED 2026-08-11** and had been sitting in the open register for twenty
days. Verified before moving: its three cited tests exist in `page-load-contract.test.ts` and pass —
_"returns an empty list to anyone who is not a presenter"_, _"gates on the membership predicate, not
on the account role"_, and _"does not even run the query for a member"_ — which are precisely the
three claims it makes.

## 3b. `services/media/Cargo.lock` violates a named authority

**Status:** open, one-line fix, needs the sibling's agreement.

`new-room-control/docs/ENGINEERING-SSOT.md` §1 names "the sole workspace lock
`services/Cargo.lock`". A second lock exists here at `services/media/Cargo.lock`,
beneath a workspace member. It is one of only two files distinguishing this
`services/` copy from the sealed upstream tree, and it is not permitted by the
authority table.

It was previously written off as "harmless" in `services/SYNC-PROVENANCE.md`.
That was wrong; corrected there.

Removing it is trivial, but `services/**` is a mirror, so it must be resolved at
the source and re-synced rather than deleted here.

---

---

## 3c. This repository has no enforced gates for its own documentation

**Status:** open.

`new-room-control` has `AGENTS.md`, `CONTRIBUTING.md`, a normative SSOT, an
executable `services/**` seal, and `scripts/verify-documented-test-counts.mjs`
wired into its test chain so a stale documented number fails the build.

This repository has none of that beyond the `AGENTS.md` added on 2026-08-03.
Concretely:

- no `quality` script and no CI parity;
- the drift check in `services/SYNC-PROVENANCE.md` is manual, so it can rot;
- no gate verifies any number in `docs/*.md` — the test count, table count and
  route count will silently go stale.

This is not hypothetical. `docs/REPOSITORY-STATE-2026-07-30.md` was materially
wrong for three days and nothing caught it, and the `services/` divergence went
undetected for a day.

**2026-08-05:** partially addressed in kind rather than by a gate. Claims that used to live only
in prose are now executable — `comment-safety-contract.test.ts`, `webcam-contract.test.ts`,
`alerts-background-contract.test.ts`, `alerts-toolbar-contract.test.ts`,
`screen-tab-bar-contract.test.ts`, `const-table-parser.test.ts` — and the state document
(`docs/ROOM-STATE-2026-08-06.md`) records the runtime measurement behind every "fixed" row. There
is still no gate over the NUMBERS in `docs/*.md`, so treat any count as true only for its date.

Entry 2 (consolidation) resolves most of this by putting both halves under one
set of gates. Until then, treat every documented number as true only for its
stated date.

---

---

## 7. Pre-Canned polls no longer reach a member's browser — RESOLVED 2026-08-11

**Status:** closed. The loader returns `[]` to anyone who is not a presenter, and does not run the
query at all for them.

It selected `savedPolls` and returned them to EVERY role. A member never opens the poll panel, so
they never SAW the list — but their browser was handed **every unsent draft a presenter had
written**, in the SSR HTML and in `__sveltekit` data, on every page load. Invisible is not private:
it reaches the browser, any cache in front of it, and any HAR attached to a support ticket. Same
class as the `password_hash` spread into the page payload on 2026-08-04.

Gated on `connectedUser.isP` — the membership's own answer, the same predicate the poll panel
renders from — rather than on `role`, which gets it wrong in both directions: a Participant granted
presenter rights in the controller would be refused, and a Presenter who had them withheld served.

**It also pre-empts entry 5.** `GET /api/v1/rooms/{id}/saved-polls` refuses non-staff with 403, so
the cutover would have started failing member page loads. An empty list here is what that route
already agrees with — the concern this entry was originally written to record.

Pinned by three tests in `page-load-contract.test.ts`, including that the empty list is the
ternary's FIRST branch, so a member's load makes no database read for polls at all. Negative
control: removing the gate fails two of them.

The two writes needed no change: `savePoll` and `deleteSavedPoll` were already
`role === 'staff' || role === 'admin'`, which is what `require_staff` enforces.

---
