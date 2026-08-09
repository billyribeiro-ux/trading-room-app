# TODO

Deferred work, with the evidence needed to do it safely. Each entry records what
was already investigated so the next attempt does not re-derive it — or walk into
a trap that was already found.

---

## Evidence gaps

Things I could not find in the evidence and therefore did **not** build or guessed at. Required by
the "evidence is READ, never searched" rule in `CLAUDE.md`: never invent the value, record it here,
and ship a console script that can fetch it.

The collector for every item below is `scripts/ptr-collect.js` — paste it into the Chrome console on
the live room, as either role, and it downloads a JSON by itself.

| #   | Missing                                           | Where I already looked                                                                                                                                                                              | Blocks                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The Files **sort bar** as the live app renders it | `main.d6d3c112b59b7d0d.js`, `css/complete-app-styles.css`, `app-room/app-room-file.clean.html`, `app-presentationarea.full.js` const table — absent from all four                                   | **RESOLVED** — reproduced byte-for-byte from the owner's rendered markup, including the icon class-order flip. Its CSS is still unevidenced: matched to the sibling `.st-file*` family (`12px`, `var(--tabs-color)`), not to a captured rule. |
| 2   | The **bundle hash** of the live deployment        | Ours is `main.d6d3c112b59b7d0d.js`                                                                                                                                                                  | Everything. If the live hash differs, "absent from the bundle" means "absent from an OLD build" and every such finding needs re-reading. This is the highest-value single datum.                                                              |
| 3   | Wire payloads for the file row actions            | Every dump is DOM-only; `second-dump/decoded/10-gaps/honest-gaps.json` states there are no network/WebSocket captures                                                                               | `deleteFile`, `playMP3ForAll`, `stopMp3ForAll` and `uploadFile` are implemented against the capture's _client_ code and our own server. The real server contract is unverified.                                                               |
| 4   | `mp3Playing` / the **Stop For All** button        | `O(83, o.isP && o.mp3Playing ? 83 : -1)` is the only reference                                                                                                                                      | Not built. Needs to be seen live with a sound playing.                                                                                                                                                                                        |
| 5   | The **private-chat message log**                  | `app-privchat.full.js` gives `downloadLog()`'s serialiser (`{t, n, txt}`) but no rendered rows exist in any dump                                                                                    | `app-privchatscroller` is a stub, so "Download Log" writes an empty file.                                                                                                                                                                     |
| 6   | Five theme variables                              | Referenced by the generated sheet, defined by neither captured stylesheet: `--app-primary-color`, `--border-color`, `--chat-header-bg`, `--chat-header-color`, `--textarea-holder-btns-hover-color` | Anything resolving them falls back.                                                                                                                                                                                                           |
| 7   | The external image CDN                            | `PUBLIC_PTR_UPLOAD_SERVER` / `PUBLIC_PTR_CDN_UPLOAD_KEY` are empty; the capture posts to `${uploadServer}/image/${sessionHandle}` with `Client-ID` auth and reads `data.link`                       | Alert/composer image uploads fall back to the room's own uploader. Captured path is kept and wins if the env is ever set.                                                                                                                     |
| 8   | Alerts/chat rendering at narrow widths            | The four captured `@media` rules ARE shipped and were verified; our own fixed-height overrides were the bug and are fixed                                                                           | Measured clean (no fixed-height overflow, no horizontal scroll) at 1600/1280/992/768/600/480/375, but **not** diffed against the real app at those widths.                                                                                    |

### Added 2026-08-06

| #   | Missing                                              | Where I already looked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Blocks                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | `dontShowRecInfoToUsers` in session data             | referenced by the `[ REC ]` tooltip gate in `app-room.full.js`; absent from our `sessData`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | read defensively and treated as OFF, matching the capture's default of SHOWING the name. If the real session sets it, a member would see a filename they should not.                                                                                                                                                                                                                                       |
| 10  | The `???` self-chat variant                          | `startPC` on the roster and the user-info modal both alert `Chatting with yourself again???`; the message path uses one `?`                                                                                                                                                                                                                                                                                                                                                                                                                | those two entry points are not built, so neither string is reachable from them.                                                                                                                                                                                                                                                                                                                            |
| 11  | Private-chat image upload                            | `imgUpload()` / `onImagePaste()` in `app-privchat.full.js`, both posting to the same absent CDN as gap 7                                                                                                                                                                                                                                                                                                                                                                                                                                   | no image sharing inside a private thread.                                                                                                                                                                                                                                                                                                                                                                  |
| 12  | `mp3Playing`                                         | `O(83, o.isP && o.mp3Playing ? 83 : -1)` is the only reference in the bundle                                                                                                                                                                                                                                                                                                                                                                                                                                                               | "Stop For All" is not built.                                                                                                                                                                                                                                                                                                                                                                               |
| 13  | `getStats()` on a REAL desktop share                 | measured on the headless synthetic pattern only — full 1920×1080 reaches the member, `qualityLimitationReason: none`, `bandwidth: 0`, `cpu: 0`                                                                                                                                                                                                                                                                                                                                                                                             | `streaming-choices.md` rows 2, 3 and 6 stay hypotheses until this exists.                                                                                                                                                                                                                                                                                                                                  |
| 16  | ~~The captured VALUES of the sidebar session flags~~ | **RESOLVED 2026-08-06** - the room no longer holds values for these at all. `sessData` was a hardcoded literal; it now comes from `new-room-control`'s `room_settings` through `internal/room-config/[code]`, narrowed to the twelve the room has a consumer for                                                                                                                                                                                                                                                                           | there is nothing left to capture: a room's settings are whatever its owner sets on its Manage page, and a newly created room has no settings row, so unset means off. Proven by `scripts/room-config-seam-e2e.mjs`: `simUserCount` 0 -> 40 -> 0 moves the room's headcount 1 -> 41 -> 1.                                                                                                                   |
| 17  | ~~A free-trial flag (`isFT`)~~                       | **RESOLVED 2026-08-06** - `room_users.is_free_trial` in the controller, not a column here. Alongside `hasAdminChat` (one of five `permissions_json` keys) and `denyArchivesAccess`                                                                                                                                                                                                                                                                                                                                                         | all three are per-room, which a column on `users` could not express. `isLimitedPresenter` turned out to be stored by nobody: `giveMicScreen` assigns it at runtime, so it is runtime state here too.                                                                                                                                                                                                       |
| 15  | ~~The captured VALUE of `sessData.userUploads`~~     | **RESOLVED 2026-08-06** - a per-room setting read from the controller. `PTR_USER_UPLOADS` is deleted; it was a process-wide switch standing in for a per-room one, so two rooms on one deployment could not disagree about it                                                                                                                                                                                                                                                                                                              | the room asks; the owner decides, per room.                                                                                                                                                                                                                                                                                                                                                                |
| 19  | Three more `isLimitedPresenter` surfaces             | two of the five are BUILT (2026-08-07): the user-info modal's rename pencil (`O(9)`, now a three-way with `canEditUsername` -> `editUsernameByUser`) and its whole administrative body (`O(14)`). The other three are the delete-all control in both message logs and the two log-download menus, all of which live inside an ARCHIVED LOG ENTRY - and `chat-logs-modal` / `alerts-logs-modal` are empty shells reading "There are no archived chats at this time"                                                                         | gating a control that does not exist would be dead scaffolding. They need the archive list first, which needs archived logs.                                                                                                                                                                                                                                                                               |
| 18  | A transcript page, and anything to put on it         | `toggleSpeechRecoHistory()` on the room component and `openTranscriptPage()` on the presentation area are byte-for-byte the same body - both open `#/session-transcript?token=…&name=…`. Nothing in this repo produces a transcript: `currentCaption` is never assigned, because the capture runs the Web Speech API on the presenter's machine and relays results over the socket, and neither half is wired                                                                                                                              | both controls now render behind their captured gates (`archivesAvailableTo()` for the overlay button, the Archives menu for the sidebar item) and both report the gap plainly instead of being dead links. Building the page needs the caption relay first.                                                                                                                                                |
| 14  | Whether a paused recording is excluded from the file | `pause()`/`resume()` proven called and the state changes; the OUTPUT is unchecked                                                                                                                                                                                                                                                                                                                                                                                                                                                          | needs `ffprobe` for duration and seekability; not installed here.                                                                                                                                                                                                                                                                                                                                          |
| 20  | ~~The SSE hub cannot see a membership~~              | **RESOLVED 2026-08-07** - it reads one config at subscribe time, which is once per CONNECTION and not on the message path at all. `isFT` and `hasAdminChat` on a published `RosterUser` are the controller's real per-room values; a failed read falls back to the session's own role rather than taking the realtime channel down with it                                                                                                                                                                                                 | it mattered because the roster is what OTHER people see: false for everyone made a trial invisible to the TRIAL filter and an admin-chat member indistinguishable from a participant in every other browser.                                                                                                                                                                                               |
| 21  | ~~Mobile App Info and Benzinga are NOT BUILT~~       | **RESOLVED 2026-08-07** - both built and proven live. Mobile App Info: the empty `<p>` now holds the gated button (`O(12)` outside, `ptrMobileAppEnabled`/`customMobileAppEnabled`/`freeTrialsGetApp` inside), the navbar icon is gated and wired, and the modal in `ModalHost` stopped being static - a real six-digit pin comes from the controller's new `internal/mobile-pin`, `hideMobileCredentials` drops the block, and `customMobileApp*Url` replaces both links. Benzinga: `O(31)` with the `altBenzingaLogoURL` / icon fork     | store links default to `https://www.tradingroom.app` - this is TradingRoom v1 and has no store listings, so inventing package ids would be two dead links behind two real badges. The Benzinga DEFAULT url is still not reproduced: it needs `sessionID`, `sessData.uuid` (not in the 268-key schema) and `sesionToken`, so a room without `altBenzingaLinkURL` renders nothing rather than a broken link. |
| 22  | A role change does not renegotiate media             | `giveMicScreen` in the capture follows the flag assignment with `mediaHandlerService.disconnectAll()` and a re-init. This room sets the flag and stops there                                                                                                                                                                                                                                                                                                                                                                               | the sidebar reads the flag correctly; a member handed mic and screen mid-session will not actually get a producer until they reload.                                                                                                                                                                                                                                                                       |
| 23  | The Benzinga default URL cannot be built             | `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${sessionID}&id=${sessData.uuid}&tok=${sesionToken}`. `sessData.uuid` is not one of the 268 settings, `sesionToken` is the controller's session credential and has no business in a page, and the host is the reference's own                                                                                                                                                                                                                                                | a room renders Benzinga only when `altBenzingaLinkURL` is set. Three blanks in a URL is a broken link wearing a logo.                                                                                                                                                                                                                                                                                      |
| 24  | Nothing SENDS `giveMicScreen`                        | the receiving half is built and correct: it is a top-level command carrying `{give}`, not a `remotePresCommand` subCmd, and its subscriber sets `isLimitedPresenter`. The capture's sender is `giveMicScreen(e)` on the user-info modal - it refuses a self-target (`Can't give 'Mic/Screenshare' to yourself.`) then `sendServerAdminCommand("giveMicScreen", {user, give})` - but WHICH element calls it has not been located in the decoded template                                                                                    | so `isLimitedPresenter` can only ever be false at runtime today. Both predicates that read it are driven through every combination in `roster-gates.test.ts`; what is missing is the button. A guessed one would be dead scaffolding.                                                                                                                                                                      |
| 25  | ~~One realtime channel for every room~~              | **RESOLVED 2026-08-07.** `ROOM_CHANNEL` was the constant `'ptr-room'`, justified in the source by "this one has exactly one [room]". The controller falsified that: it creates as many rooms as an owner wants and the handoff says which one you entered                                                                                                                                                                                                                                                                                  | until today every room's alerts, chat, roster and presenter commands reached every other room's members. The key is the session's own short code, and the SSE endpoint rejects a path naming a different room, so a URL edit cannot join you to somebody else's room.                                                                                                                                      |
| 26  | ~~The token type decided your role~~                 | **RESOLVED 2026-08-07, and it was a privilege escalation I introduced.** `/session` mapped `type: 'site'` to `staff`, and `isPresenter` — every gate, and every presenter-only server action — is `role === 'staff' \|\| 'admin'`. `requireOwnedRoom` admits any user in the ACCOUNT to `/launch/[id]` and `inviteRoomUser` puts an invited participant in that same account, so a role 2 Participant could launch and hold Archives, Get Random User, the user-info admin body, posting alerts, running polls and every presenter command | role now comes from the controller's membership on EVERY entry, in both directions: 0 Owner -> admin, 1 Presenter -> staff, 1+nonPresenter Admin / 2 / 3 / 4 / no membership -> member. Fails closed if the controller cannot be read. `scripts/role-authority-e2e.mjs` 12/12 asserts a real participant stays a member and a real owner does not.                                                         |
| 27  | ~~A role change never reached a live session~~       | **RESOLVED 2026-08-07.** `/session` wrote the role once, at entry, and seventeen server actions authorise against it. A session stays open for hours, so an owner demoting somebody changed nothing until they re-entered — they kept Archives, Get Random User, posting alerts, running polls and every presenter command meanwhile                                                                                                                                                                                                       | the page load reconciles the stored role against the membership, writing only when it differs. Proven mid-session: promote -> presenter, demote -> the next load takes it away.                                                                                                                                                                                                                            |
| 28  | ~~A banned member was let in~~                       | **RESOLVED 2026-08-07.** Role 4 is the reference's BANNED, written by `applyUserOpcode` case 4 alongside the `banned` column. The role mapping sent it to `member` — correct as a role, wrong as an answer to whether the door opens — and nothing looked at the flag again                                                                                                                                                                                                                                                                | `/session` refuses with 403 and issues no session; a ban landing mid-session ends it on the next load. Both role and column are checked, because the roles are what the reference renders and the column predates that correction.                                                                                                                                                                         |
| 29  | Five of seven membership fields are dropped          | the reference loads `hasMic`, `hasScreen`, `hasCam`, `hasAdminChat`, `canEditNotes`, `denyArchivesAccess` onto `globals.user` at room join, and puts three of them in the media join itself: `isP: isPresenter \|\| hasCam \|\| hasMic \|\| hasScreen`. The room reads two and ignores the rest; its own mic/cam/screen toggles have no permission gate, and `canEditNotes` is decided by role                                                                                                                                             | `docs/SEAM-AUDIT-2026-08-07.md` §2.1, Phase B. Consuming the three media permissions also makes `isLimitedPresenter` reachable without a `giveMicScreen` sender (gap 24).                                                                                                                                                                                                                                  |
| 30  | Neither side checks whether the room is OPEN         | `rooms.state` is open/closed and the controller's guest login refuses a closed room. `/launch/[id]` does not, `/session` does not, and the room ignores the `state` the config read returns                                                                                                                                                                                                                                                                                                                                                | §2.2, Phase A. An owner or anyone in the account walks into a closed room and stays in one that closes under them.                                                                                                                                                                                                                                                                                         |
| 31  | Rooms predating 2026-08-07 have no owner membership  | `createRoom` seats the owner at role 0 now; older rooms have no such row, so their owner reads as `member: null` and is not a presenter in their own room                                                                                                                                                                                                                                                                                                                                                                                  | §2.6, Phase A. One idempotent backfill.                                                                                                                                                                                                                                                                                                                                                                    |

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

| #   | Missing                                                     | Where I already looked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Blocks                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 32  | ~~`sessData.overwriteCashRegisterSound`, read **and** written~~ | Markup is complete: `Wwe`/`qwe` at `app-presentationarea.full.js:1889-1916`, consts 261/262/263, gates at 1972-1991, handler at 3084-3086 (`sendServerAdminCommand('overwriteCashRegisterSound', {url})`). CSS already ships at `src/lib/styles/captured-runtime-components.css:6972`. The setting is real in the controller (`new-room-control/src/lib/room-settings-schema.ts:79`, `wired: false`) but is **not** in `ROOM_VISIBLE_SETTINGS` (`room-config.ts:133-182`), and this room's only controller surface is two READ endpoints (`src/lib/server/control-plane.ts:50-65`) | **RESOLVED 2026-08-08.** Both halves landed. The setting is on `ROOM_VISIBLE_SETTINGS` so the gate has an input, and `POST /internal/room-setting/{code}` on the controller persists a presenter's choice — authenticated with the same bearer MAC as the other internal endpoints, and gated by a second, strictly narrower `ROOM_WRITABLE_SETTINGS`. The room action refuses a url that is not a `shared_files` row of THIS room, and refuses one that is not `audio/*`. "Set as alert sound" / "Remove as alert sound" now render, one at a time. |
| 33  | ~~`sessData.hideFiles`~~, and a `videoOnlyMode` equivalent | `z('hidden', o.hideFiles)` on the main-tab `li` (`full.js:5375`) and on `#files` (5410-5413), fed by `sessData.hideFiles \| **hideFiles RESOLVED 2026-08-08.** Allow-listed, carried across, and `filesSectionHidden()` puts `hidden` on BOTH the main-tab `li` and the `#files` pane — hiding one without the other leaves either a tab that opens nothing or a pane reachable by a tab that is gone. **`videoOnlyMode` stays open and unbuilt on purpose:** it is not a setting but the recording-bot query-parameter global, and this room has no recording bot. The disjunction is written where it belongs so the second term can be added without moving anything. | globals.videoOnlyMode` (2289-2290). `hideFiles` exists in the controller (`room-settings-schema.ts:135`, "Hide Files Section?", `wired: false`) and is not allow-listed. `videoOnlyMode` is not a setting at all: it is a client global set from the `r` query parameter (`docs/source/main.d6d3c112b59b7d0d.js` offset 2596635, `f = s.get("r")`), the recording-bot mode, which this room does not have                                            | The Files tab and pane are unconditional. An owner who ticks "Hide Files Section?" on the Manage page still sees them. One line in `ROOM_VISIBLE_SETTINGS` plus one field on `RoomSessionSettings` closes the `hideFiles` half; the `videoOnlyMode` half has no consumer here and should stay unbuilt until a recording bot does.                  |

---

## 1. Rename `ptr_clone` → `tradingroom`

**Status:** deferred 2026-08-03. Investigated, not started. **Nothing has been
changed.**

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

## 2. Consolidate the two working folders into one repository

**Status:** decided, not executed.

`docs/decisions/0003-vercel-rust-postgresql-control-plane.md` in
`new-room-control`, status **accepted**, dated 2026-08-02: "The product will use
one source repository with independently deployable surfaces."

`services/**` currently exists in both folders and has now diverged **twice**.

The first time (08-02 to 08-03) it was 87 files against 93, 4 migrations against
6, including two migrations that fix proven security drifts. Re-synced at
`4297f9c` and fingerprinted in `services/SYNC-PROVENANCE.md`.

The second time was found on 08-06, and this copy was the one that was ahead —
twelve files, including `0008_room_events_tenant_keys.sql`, which pairs the
tenant keys on the realtime fan-out table. So for as long as that drift stood,
`new-room-control` was serving the unsafe copy while this file said it was the
source of authority. Reconciled by promoting all twelve upstream and re-sealing
at 98 files (`new-room-control` `fdb4f8c`).

A recorded seam is not a fix, and it has now failed to prevent the same defect
twice. The second occurrence is the argument for this entry, not a footnote to
it.

Blocks entry 1.

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

## 4. Media: prove the path, not just the boundary

**Status:** open. Detail in `docs/PRODUCT-OVERVIEW.md` §8.1.

The SFU is deployed on AWS Lightsail and its admission boundary is proven —
Origin, Ed25519, expiry, replay ceiling, TLS, upgrade. **RTP, TURN, and
real-device cells are not.** Also open: single-use/node-bound grants, a real
readiness check, bitrate ceilings, media metrics, and the OpenSSL 3.0.8 rebuild.

---

## 5. Wire the room to the API and delete SQLite

**Status:** open. Detail in `docs/PRODUCT-OVERVIEW.md` §9.

`grep -rn "/api/v1" src/` returns zero. The room runs on 20 SvelteKit form
actions over 15 SQLite tables while a 29-route Rust API sits unused.

Depends on entry 2 — otherwise it targets whichever `services/` tree happens to
be in front of you.

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

## 7. Rewiring the room's Pre-Canned list must not 403 a member

**Status:** open, blocking nothing yet. Created 2026-08-04 alongside migration
`0007_saved_polls.sql`.

`src/routes/+page.server.ts:319-331` selects `savedPolls` and returns it to
**every** role from the page load, gated by nothing. A member never opens the
poll panel, so they never see the list — but their browser is handed every
unsent draft a presenter has written. Invisible is not private.

`GET /api/v1/rooms/{room_id}/saved-polls` refuses non-staff (403). That is a
deliberate tightening, not a match. Whoever does entry 5 must give members an
empty list rather than calling the route, or member page loads will start
failing.

The two writes need no such care: `savePoll` and `deleteSavedPoll` are already
`role === 'staff' || role === 'admin'` in the same file, which is exactly what
`require_staff` enforces.

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

## 9. The server layer had no behavioural tests — and that hid a leaked password hash

**Status:** the leak is **fixed**; the coverage gap is **closed for all 20 actions**, with two
named remainders below. 2026-08-04.

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

### Two remainders, deliberately named rather than quietly skipped

1. **The captured-item branches inside `messageAction` (`id < 0`)** write to
   `captured_item_overrides` and `hidden_room_items` instead of to a table, and need the fixture
   wired up. They carry the same guards as the real-row branches and they are where the "deleted
   alert comes back for everyone else" defect lived.
2. **`restoreNoteVersion`'s happy path.** Its 403, 400 and 404 are covered; restoring an actual
   version is exercised by `notes-repository.test.ts` beneath it, not through the action.

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
