# TODO — what is still left to do

Stripped 2026-08-13 18:26 EDT to exactly that, and re-audited 2026-08-17 against the repository
itself. Everything historical lives in `CHANGELOG.md`, and the process rules earned along the way
live in `docs/reference/working-rules.md`. If a section here is not something somebody still has to
DO, it does not belong.

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

**What the 2026-08-17 audit changed, stated once so the diff is not mistaken for progress.** Eighty-five
claims in this file were checked by reading the artefacts they name, and every "this is finished"
verdict was then put to a pass whose only job was to refute it — which overturned ten of sixteen and
saved four rows that were about to be deleted while still carrying open work. Rows removed below were
removed on that evidence. **No row was removed because it looked stale**; the two that looked most
finished (row W's toast-only family, row AE's decomposition) turned out to be, respectively, worse
than recorded and three times further along than recorded.

> ⛔ **`apps/controller/src/lib/evidence-gap-register-counts.test.ts:36` READS THIS FILE.** It
> requires the tally sentence under *The register* below to exist in its exact documented shape and
> to equal a live recount of `docs/reference/evidence-gap-register.md`. **Do not delete or hand-edit
> that sentence.** If it drifts, recount with the test's own parser — never by memory, and never by
> reading the register's status column, which does not agree with it (see the open row on that).

---

## Still open — the 78 evicted scripts remain readable in PUBLIC history

The one thing untracking could not reach, and an owner decision rather than a piece of work.

`apps/room/scripts` holds **0** files on `main` today. At `be239b2` — before the 2026-08-15
eviction — it holds **78**, and the repository is `public`, so they are readable at that commit by
anyone. Untracking governs future commits only.

**AND THE DIRECTORY IS STILL GROWING, unmeasured until 2026-08-23: 146 files on disk against 0
tracked and 78 at `be239b2`.** The ignore rule is the bare directory line `/apps/room/scripts/` at
`.gitignore:176`, so every script written since the eviction has gone straight into a directory git
cannot see — nearly doubling the surface with no review, no CI and no privacy scan. That is a
second problem from the same rule and it gets worse on its own: the eviction question is about 78
files already published, this one is about 68 more that nobody has ever looked at.

Measured rather than assumed, with the repository's own detector in `apps/room/gate/privacy-utils.mjs`:
no email addresses, no gravatar hashes, no tokens across all 78. **One** occurrence of the owner's
name, in `scripts/compare-capture-states.mjs`, baselined at `apps/room/ops/privacy-baseline.txt:68`.
What they do carry is the third-party application they were built to match —
`chat.protradingroom.com`, its selectors and wire protocol — which makes this the republication
question, not a credential leak.

Two ways to actually resolve it, and only these two: rewrite history with `git filter-repo` and
force-push (every commit SHA changes, and GitHub may cache the old objects until support purges
them), or make the repository private (instant, erases nothing, ends the exposure). Leaving it is a
legitimate third answer given what is actually in the files. **Owner's decision; not taken.**

**Corrected 2026-08-17: it is 78 of 78 on `origin/main`, not 76.** `git merge-base --is-ancestor
be239b2 origin/main` exits 0, so every blob in that tree is reachable from the published default
branch, and a per-file check returned a commit for all 78 and none for zero. Nothing about the
decision turns on the number, but the row stated it as a measurement.

**Two smaller things fell out of the same eviction and are DONE, 2026-08-27.** The manifest no longer
advertises what a clone cannot run, and the enumeration is published. What is left of the eviction is
the owner decision above and nothing else. `apps/room/docs/UNPUBLISHED-SCRIPTS.md` records the thirty
removed entries so the account survives the removal, and names the one thing still genuinely lost:
the four Chromium gates, which cannot be re-derived from tracked bytes because they drive a browser
against unpublished captures. That is the same owner decision as row 5.

**Three baseline lines are stale in the safe direction, recorded so nobody re-reports them as a leak.**
(It read "Two" until 2026-08-23 while naming three files in the same sentence.)
`apps/room/ops/privacy-baseline.txt:121-123` still baselines `rawEmail` findings in
`alert-delete-e2e.mjs`, `audit-clean-app-room.mjs` and `media-screenshare-e2e.mjs`. Those addresses
were replaced by `PTR_*_EMAIL` environment reads; the detector finds zero today. The verifier prints
them under "baselined finding(s) are gone — run `--update` to shrink" rather than failing.

---

## What the CI gates left behind

### One evidence set is documented and has never been committed — needs the owner

`apps/controller/evidence-dumps/account-page/` is in the archive map, is cited by
`docs/reference/account-pixel-match.md` and others, and does not exist in this repository.
`git log --all -- 'apps/controller/evidence-dumps/account-page*'` returns nothing, so it was never
committed rather than deleted — it is a capture that stayed on the machine that took it.

**Nothing here can close this.** The capture is of an authenticated page on the reference site;
it cannot be re-derived from what the repository holds, and fabricating it would be worse than its
absence. What was done on 2026-08-28 is everything short of that: the absence is pinned in
`scripts/verify-evidence-layout.mjs` (restore the directory and the verifier goes red, naming the
lists the entry has to move to), `verify-account-contract.mjs` skips one SHA-256 pin out loud
instead of dying with ENOENT before its other assertions, and `evidence-dumps/README.md` says so
in prose.

**What unblocks it:** the owner committing `account-page/` from the machine that holds it, with
`upload-image-badge-prompt.html` hashing to
`fb4e934f761f15fb2eac26882ce6ebac9b6628f6f3b8ab48b20ad521a6c7c43f` — the hash the contract still
carries. Conclusions already drawn from that capture stay unrecheckable by anybody else until then.

### Local dev secrets — one standing warning, no outstanding action

The 2026-08-15 restoration is finished and its record is in `CHANGELOG.md`. What survives here is the
fact that makes it repeatable, and it is not a task:

**Every controller variable on Vercel is type `Sensitive`, which is write-only.** No value can be
read back by the dashboard, the CLI or support. **`~/Desktop/new-room-control/.env` and
`.env.vercel-pull` are therefore the only readable copies of production secrets that exist
anywhere.** Back that folder up off this machine.

Consequence of the one key that could not be restored and was regenerated: API keys created before
2026-08-15 can no longer be re-displayed on the account page. They still **authenticate** —
`secret_hash` is what authenticates and it is untouched. Delete and recreate any key you want visible.

### The runtime-role cutover is not finished

`ops/naming-provenance.md` is the authority on all of this; these are the rows it points at. Verified
2026-08-17: the highest migration is `services/api/migrations/0009_provision_tradingroom_app.sql`,
and there is **no `DROP ROLE` or `REASSIGN OWNED` in any migration**, so all three rows stand.

| # | what | why it is not done yet |
| --- | --- | --- |
| 1 | **Retire `ptr_clone_app`** — a forward-only migration that drops the baseline role | Deliberately deferred until the cutover is proven in a real deployment, not just on scratch clusters. Since 2026-08-15 the role is named by no policy — `0009_provision_tradingroom_app.sql:199-258` retargets every policy onto `tradingroom_app` and RAISEs `RLS retarget incomplete` if a residual remains — and it reads zero rows from all 22 tenant tables. **It is inert but still holds object privileges, and they are granted at `0001_baseline.sql:1821-1938` (22 table-wide grants plus the function grants), `0006_restrict_runtime_object_privileges.sql:69-107` and `0007_saved_polls.sql:134` — and, added **PROVEN ON A REAL CLUSTER, 2026-08-29 — and the approach in this row would have been UNSAFE.** PostgreSQL 16.13 was brought up in this container, the roles provisioned by `docker/postgres/10-provision-roles.sh`, the whole chain applied by `cargo run --bin migrate`, and `api/fixtures/seed.sql` loaded, so the numbers below are measurements rather than readings of the SQL. **The retarget holds, and the control proves the measurement is not vacuous:** the owner sees 2 rooms and 4 alerts; `tradingroom_app` with no tenant key sees **0**; `tradingroom_app` carrying tenant A's key sees **1** room (the positive control — the mechanism works) and **0** of tenant B's (isolation); `ptr_clone_app` sees **0** with no key **and 0 while carrying a valid tenant key**. An INSERT as `ptr_clone_app` is refused with *"new row violates row-level security policy for table rooms"*. Its remaining surface, measured: **87 table privileges over 22 tables** (22 SELECT, 22 INSERT, 22 DELETE, **21** UPDATE — one table has none), **6 routine grants**, USAGE on schema `public`, **0** default ACLs, **0** database grants, **0** owned objects, and it can still LOG IN. **THE DROP THIS ROW ASKS FOR MUST NOT BE WRITTEN.** `0001_baseline.sql:25-28` carries `IF NOT EXISTS (… 'ptr_clone_app') THEN CREATE ROLE ptr_clone_app LOGIN PASSWORD 'CHANGE_ME_APP'`, and `0001` is byte-identical to the captured schema and may not be edited. `db/migrate.rs:243-258` exists precisely to keep that branch from firing — its preflight REFUSES to migrate unless `ptr_clone_app` is already provisioned. So dropping the role (a) makes the next `migrate` run fail that preflight, and (b) re-arms the committed-password branch on every fresh database. **Retirement here means NEUTER, NOT DROP**: revoke all 87 privileges, the 6 routine grants and schema USAGE, and `ALTER ROLE ptr_clone_app NOLOGIN`, keeping the role so both the fence and `0001` stay satisfied. That removes the credential path and every privilege while leaving nothing to recreate. **Still deferred, and the condition is unchanged**: this was a scratch cluster, which is exactly what this row says is not enough |
2026-08-23 after re-reading every migration for `GRANT … ptr_clone_app`, **`0003_room_events.sql:106`
and `0004_list_memberships.sql:55`**, neither of which this row named. A retirement migration that
misses a grant site fails at the worst possible moment.** An earlier draft of this row cited `0005:85`; that line is a `TO ptr_clone_app` clause inside a `CREATE POLICY`, and `0005` contains **no `GRANT` at all** — a policy target is not a privilege, and citing one as the other would send whoever writes the migration to the wrong file. The migration must REFUSE rather than `CASCADE`: a cascade silently drops whatever still depends on it. `0001_baseline.sql` re-creates the role on every new database, so retirement cannot be a rename and cannot assume absence. |
| 2 | **Owner role and database name `ptr_clone` → `tradingroom`** | Its own change, deliberately not bundled. Different mechanism (ownership and `CREATE DATABASE`, not policy membership) and different blast radius: `EXPECTED_MIGRATOR_ROLE`, the preflight identity check, every `MIGRATE_DATABASE_URL`, and the provisioning scripts. Bundling would mean one failure obscures the other. Same shape as the role: add, prove, cut over, retire — **never rename**, which is the mistake the withdrawn `0009_rename_runtime_roles` made. |
| 3 | **DONE 2026-08-28, and it found something.** The chain was run against a real PostgreSQL: `0001`-`0008` applied, the cluster aged by hand, then `0009`. **The retarget works** — 22 policies moved off the baseline role with `0` residual, and a policy hand-widened to name BOTH roles was repaired to name the runtime role alone, which is the claim this row made. **What it does NOT do is inspect the PREDICATE, and nothing downstream did either:** `alert_media` widened to `USING (true)` survived `0009` intact while the migration reported success, because `postgres-release-attestation` asserted a predicate for exactly one table, `public.room_events`. Closed by extending that attestation to every policy in `public`. Still outstanding here: a database with real PRODUCTION history, which a scratch cluster aged by hand is not. |

**The cost constraint that governs how these get tested.** Every push against an open PR starts a
run. The backend gate is ~33 minutes when the diff touches a backend path and ~25 seconds when it
does not, so batching backend pushes is worth real money and docs pushes are effectively free. See
`docs/reference/working-rules.md` rule 12 for why a green PR check is not proof the backend ran.

---

## Evidence gaps

**Whether a real browser serialises `background:#111` as `rgb(17, 17, 17)` — UNVERIFIED, and it
matters.** Writing the jsdom test surfaced that Tiptap's `getHTML()` returns CSSOM-normalised style
attributes there: `width:50.000000%` comes back `width: 50%`, and `background:#111` comes back
`background: rgb(17, 17, 17)`. Both sanitiser allow-lists — `safe-html.ts` client-side and
`server/notes.ts` line 123 — accept `background` only as `/^#111$/i`, so **if** a browser normalises
the same way, every carousel saved through our editor loses its black backing.

I do not believe it does: `setAttribute('style', …)` preserves the attribute verbatim in Chrome, and
the server sanitiser is `sanitize-html` over `htmlparser2`, a string parser with no CSSOM at all. So
this is most likely a jsdom artefact and **nothing has been changed on the strength of it** —
widening a sanitiser allow-list to defend against a behaviour I have not observed is exactly the
speculative change this file exists to prevent.

- **What is missing:** one look at `editor.getHTML()` in a real browser after inserting a carousel.
- **Where I looked:** `carousel.ts` `renderHTML`, `TAG_STYLE_RULES.div.background` in
  `apps/room/src/lib/components/notes/safe-html.ts` (**not** `lib/safe-html.ts` — the file moved and
  this row used to cite it by bare name), `server/notes.ts:123`, and the jsdom output pinned in
  `note-carousel.test.ts`.
- **What it blocks:** nothing today. It decides whether the allow-lists need a second accepted form.

**No persisted room video/YouTube state, so the four "For All" commands have no LATE-JOIN REPLAY.**
The commands themselves broadcast and are received — `videoForAll` and `youtubeForAll` are remote
commands at `apps/room/src/routes/for-all-broadcast.remote.ts:81` and `:142` (they were form actions
in `+page.server.ts` when this row was written; the contract test records the move), pinned by
`apps/room/src/lib/for-all-broadcast-contract.test.ts`. What is absent is the reference's server side
of them, and it is absent because this room has nowhere to put it — `room_state`
(`apps/room/src/lib/server/db/schema.ts:854-863`) holds `roomShortCode`, `chatMode` and `updatedAt`,
and no other table persists playing-media state.

Three consequences, all real and none of them papered over in code:

1. **A member who joins while a video is playing sees nothing.** The reference replays it from
   session state on connect — `roomState.videoURL && !roomState.videoPlayTime && (hideVideoPlayer =
   1, videoPlayerUrl = roomState.videoURL, onMainTabChange('presAreaTabs-videoplayer'))`, bundle
   byte 1,967,430.
2. **A scheduled play lives in the presenter's browser.** Upstream, `playVideoForAll` is posted the
   moment Send is pressed and carries `videoPlayTime` (byte 1,981,613); the SERVER holds the pair
   and broadcasts when it fires, which is why its dispatch forwards only `{url: i.url}` (byte
   1,024,587). Here the presenter's own `setTimeout` is the scheduler and posts at fire time, so
   closing that tab cancels the play. `videoPlayTime` is deliberately NOT on this room's wire — a
   field no receiver reads is the dead scaffolding this repository forbids.
3. **The YouTube seek offset is always 0, so no `start=` is ever appended.** The subscriber derives
   it — `i = Math.round((Date.now() - Number(e.startTime)) / 1e3)`, byte 1,964,799 — and its ONLY
   source is the replay, `emit('playYTForAll', {url: roomState.ytURL, startTime:
   roomState.ytStartTime})` at byte 1,965,054. `ytStartTime` occurs exactly once in the whole
   bundle, and that is it. A late joiner therefore starts a YouTube video from the beginning rather
   than dropping into the middle. **Nothing invents a `startTime` onto the wire to hide this**; the
   contract test asserts that no file puts one there.

- **What is missing:** a decision, not evidence — whether this room persists playing-media state
  (a `room_state` migration plus a replay in the page load and a server-side timer), or stays
  process-local as the SSE hub itself already is.
- **Where I looked:** bundle bytes 1,024,137–1,024,708 (the dispatch), 1,503,220 (the overlay),
  1,964,799–1,967,430 (the four subscribers and both replays), 1,981,613–1,981,945 (the senders),
  2,296,932 (the stop-then-play), 2,016,864 / 2,017,661 (the `hideVideoPlayer` gate); and
  `apps/room/src/lib/server/db/schema.ts`, which has no column for any of it.
- **What it blocks:** late joiners only. A member present when a presenter presses play gets the
  video, the tab switch and the overlay today.

---

## What the SETTINGS enumeration says — new, 2026-08-28

`apps/room/gate/audit-setting-coverage.mjs` asks the second question nothing had asked. The command
audit next to it asks what the reference SENDS; this asks what it READS.

`room-settings-schema.ts` declares **269** settings and marks **166** of them `wired: false` —
nothing in this room reads them. That number alone says nothing: most were never meant to reach a
room. The answerable question is narrower, and it is measured against the pinned v4 bundle:

A subset of them are read by the reference's OWN room client, as `sessData.<name>`, and **that subset
is pinned BY NAME in `apps/room/src/lib/setting-coverage-contract.test.ts` — never by a count here.**

> **Superseded 2026-08-29, twice.** This paragraph said **170** and "26 of the 170"; the first was
> corrected when `COUNT_CLAIMS` grew to include `TODO.md`, and the second was still wrong the next
> day — measured live, the reference reads **22**, not 26. `COUNT_CLAIMS` did not catch it because it
> checks the WIRED count and this is a different claim, in a phrasing no pattern matched. The
> verifier's own docblock had predicted exactly this: *"the next stale count will be in a seventh
> file phrased a seventh way."* It was a seventh phrasing in the same file.
>
> So the number is GONE rather than corrected, which is the doctrine
> `setting-coverage-contract.test.ts` already states about itself: *"NO COUNTS IN THIS PARAGRAPH ANY
> MORE… the numbers move every time a setting is wired, and prose beside a list it counts is the copy
> nobody updates."* That test now asserts this file carries no such count.

**The subset is fully triaged, and nothing in it is buildable here.** Measured 2026-08-29 against the
pinned bundle, every one has a disposition in `docs/decoded/missing-settings-triage.md` with a byte
offset:

- **SEVEN are credentials the reference ships to every browser** and this room refuses to. Wiring one
  is a regression, not progress.
- **ONE is answered by derivation** — `playChatMessageSoundFor`'s feature is built; the raw value
  deliberately does not cross.
- **THREE are not gaps at all**, because the reference's own feature does not work: `h264Enabled` is
  `sessData.h264Enabled || !0`, unconditionally true; `advancedSearchAlerts` is gated on one
  hard-coded owner id; `smallerImagePreview` seeds a preference whose only class has no rule in any
  of the 52 stylesheets held here.
- **The rest are BLOCKED** on infrastructure or one owner answer — an archive service, a
  server-owned lock, a second MediaMTX cluster, the `r` recording-bot parameter, a cross-post
  fan-out that occurs zero times in the bundle, or a Discord application registration.

`WIRE` — the section for settings whose surface exists and is missing a term — **opened at twelve rows
and is down to one**, `recsInRoom`, which is itself blocked on the Recordings tab.

**Thirty-one have already left the list, on the day it was written**, and it keeps moving.

> **History, not a current count.** The list opened at 202 unwired and 58 questions. Both numbers have
> moved many times since; the live one is the paragraph above, which
> `apps/controller/scripts/verify-room-settings-schema.mjs` checks. This sentence sits in a
> blockquote for that reason — it is the convention that lets a document record what it used to say
> without a superseded number failing the build, or the check being loosened to let one pass.

- `hideNotes` — the Notes tab and pane now honour *"Hide Notes Section?"*, which they did not while
  its two siblings `hideFiles` and `hideRecs` did. A gap nobody could have found by looking, because
  the tab it gates was always built.
- `darkThemeAsDefault`, `alertSoundOff`, `alertsChatOnBottom` — **one feature, not three settings.**
  Read alone, each is a small owner preference; read together they are three consecutive clauses of
  one expression in the reference (bytes 1,149,414 / 1,149,637 / 1,149,866), each paired with a
  per-viewer LATCH so that a room default seeds a member's preference once and never overrides it
  afterwards. `#lib/room/room-defaults.ts`. **The list is what put the three names next to each
  other**; asked one at a time, the shape is invisible.
- `dontShowRecInfoToUsers` — **not a missing feature at all.** The gate was built and
  `RoomNavbar.svelte` carried the correct transcription in a comment, but `RoomGates.recordingTooltip`
  read the flag off `prefs.loaded` — a viewer preference nothing writes — instead of `sessData`. It
  compiled, `svelte-check` was clean, and its own test passed because the test handed it the same
  wrong source the code read. Every member in every room saw the recording file name the owner had
  asked to hide. **Nothing but this list could have found it.**

**All 53 were READ and triaged on 2026-08-28**, and the answers are in
`docs/decoded/missing-settings-triage.md` — that document, not the pinned list, is the tracker. Three
classes of answer are not work at all:

- **NEVER — SEVEN are credentials the reference ships to every member's browser.** `deleteAlertPW`,
  `banIPList`, `obsStreamKey`, `twillioApiSID`, `modAdminLoginList`, and — found on 2026-08-28 by
  reading every entry rather than by pattern — `allRoomsWelcomeMatPW` and `needPasswordForUserNotes`.
  Each is `bootbox.prompt` then `value.trim() === sessData.<pw>` **in the browser**, so upstream the
  gate protects nothing. `internal/room-entry` is the shape that replaces them: the credential stays
  on the controller and the question travels. **Wiring one is a regression wearing an enumeration's
  clothes.**
- **NOT A GAP — three reproduce a defect.** `h264Enabled` is `sessData.h264Enabled || !0`, so it is
  unconditionally true upstream and the setting does nothing at all. `advancedSearchAlerts` is gated
  on one hard-coded owner id. `smallerImagePreview` seeds a preference whose only effect is a class
  with no rule in any of the 52 stylesheets this repository holds.
- **ENUMERATION ARTEFACT — one count is noise, and it is the rule this list needs most.** `name`
  matches `this.name` on unrelated error classes throughout the bundle and so sat near the TOP of
  the list. Its one real read — `globals.sessionName = r.name`, feeding `document.title` — was a
  real gap and took three lines of `<svelte:head>` to close on 2026-08-28. **Rank a row by what it
  turns out to be, never by the number beside it.**

Two of the WIRE rows — `chatDisabledForTrials` and `hasQAOnAlerts` — landed the same day, and one
row was CORRECTED out of WIRE into FEATURE by reading it properly rather than by re-reading the
first pass: `enableQAReactions` gates reactions on the entries of the Q&A THREAD (`isQAMsg` is the
modal's own flag, not a property of a message), and that thread's menu was inert here, so wiring the
flag would have lit a control that cannot act. **It was BUILT on 2026-08-28**, and the correction
still under-called it: it needed two commands addressing a question by its own row id, two columns on
`alert_questions`, and the thread extracted into `AlertQaModal.svelte` because the size ratchet
refused the raise. It also found a silent data loss — every question ever asked on a CAPTURED alert
was written and never read back. The remainder split into **12 WIRE** (the surface exists here and is
missing a term), **18 FEATURE** and **6 BLOCKED**, each with its byte offset and its size in the
triage document.

**The ceiling catalog is now DISCOVERED for components as well as modules** (2026-08-28). It was a
hand-kept list at **12 of 48**, and the four found uncapped by accident in two days were the visible
part: `AlertChatArea` (1,113) and `RoomMessage` (949) had never had one either. Adding an entry is
now how a component is ADMITTED, not how it gets covered. Three files are named as their own
outstanding work rather than swept: `AlertChatArea`, `RoomMessage` and `RoomNavbar`.

**A CORRECTION THAT BELONGS BESIDE THAT ROW.** The ceiling sweep and two CHANGELOG entries called
`RoomNavbar` "the one component with neither a mount nor an SSR render test". **That was false.**
`room-navbar-render.test.ts` and `room-navbar-contract.test.ts` both existed, and row AE below said
so; `todo-next.md` carried the stale line and it was read, believed and repeated rather than checked
with one `ls`. The navbar's real gap was a client `mount` — SSR runs no handler and no `$bindable`
write — and `components/RoomNavbar.svelte.test.ts` closed it on 2026-08-28. Both trackers are
corrected.

**A THIRD KIND OF ANSWER, added 2026-08-28: DERIVED.** `playChatMessageSoundFor` holds member email
ADDRESSES and the reference ships them to every browser to hash there. The room never needs them:
`internal/room-config/[code]` sends the HASHES, the same digest it already sends for
`badges.byEmailHash`. **The feature is built and the setting stays `wired: false`** — so the counts
above do not move, and that is correct rather than a bookkeeping problem: the pinned list asks
whether the raw value crosses, and here it must not. Two silent upstream defects are fixed on the
way, including one where following a single person turns off every chat sound in the room.

**WIRE is down to ONE**, and it is `recsInRoom`, which is BLOCKED anyway — wire it with the
Recordings tab, never before it. The section opened with twelve.

**`isNewIndicatorOn` was the THIRD row corrected out of WIRE**, on 2026-08-28, and its own caveat is
what did it: *"Needs `msg.isNew` to have a supply; check before wiring."* The check says there is no
supply and there cannot be one from evidence — `isNew` is produced by the reference's SERVER and
arrives on the login payload (bytes 995,175 and 1,157,344), so the rule deciding who is new is
unknowable here, and inventing one would invent the decision the setting exists to express. It is
BLOCKED on one owner answer or one capture of that response.

**The check found a live defect on the way.** `ModalHost.svelte` drew the `Trial` and `New` badges
as `{#if targetUser.isTrial}` and `{#if targetUser.isNew}` — ONE term between them, where the capture
has `isPresenter &&` on both. `isTrial` has a supply, so **any member opening another member's info
card could read their billing status.** Both now carry the presenter term.

**A SECOND WIRE ROW WAS WRONG, and reading fixed it.** `enablePrivateMessageHistory` was filed as
"one row in the user-info modal". The button is one row; the modal it opens was a permanent
`Loading...` spinner with no fetch, no list, no empty state and nothing in the repository that could
open it. That is the second row corrected out of WIRE the same way `enableQAReactions` was — a gate
whose SURFACE exists and whose ACTION does not — and it is the pattern to check for before filing
anything else as cheap. It was built on 2026-08-28: a bounded repository read, a remote command that
decides the role AND the entitlement on the server, and the captured modal actually filled in.

`simplifiedEditor` left WIRE on 2026-08-28 and is worth a line of its own, because it is the first
setting to cross whose DOWNSTREAM VENDOR is absent from the capture. The reference spends it choosing
between two Summernote button names and Summernote is not in the bundle we hold, so the room
reproduces the decision — foreground-only colour — and `resolveNoteSurfaceGates` states in as many
words which part of that is evidenced and which part is this repository's call. A setting wired
without that distinction written down would read, later, as a transcription.

`src/lib/setting-coverage-contract.test.ts` pins that list BY NAME — never by a size — and asserts
separately that the seven credentials are still on it, because a name leaving that list means the
room started reading it.

> **Superseded 2026-08-29.** This sentence said *"pins the 26 by NAME"*. It was the SECOND stale copy
> of that number in this file and the THIRD phrasing of it, found only because a negative control on
> the new guard failed to fire — the guard's pointer assertion was being satisfied by this line while
> this line carried the stale count. Two sites, three phrasings, one file: which is the argument for
> the guard rather than another correction.

The largest by read count are `deleteAlertPW` (12, a credential), `altChatRender` (6) and
`smallerImagePreview` (6, answered as NOT A GAP). **Read count is not priority** — it is how many
times the reference mentions a name, and the biggest number on this list is a credential we refuse.
`enableQAReactions` was second at 10 and is built; `positionsIframe` was fourth at 7 and is built.

**SEVEN TEST FILES WERE BEING DROPPED FROM EVERY CI RUN**, 2026-08-28, behind a banner announcing
them as uncovered. `gate/evidence-bound-tests.mjs` matched an evidence-root path anywhere in a test
file, including in a COMMENT, and matched all fourteen roots rather than the ones actually missing.
`room-message-render.test.ts` — 226 lines pinning all 18 captured kebabs with their exact labels and
source order — was excluded by one citation while the fixture it reads is tracked and present. The
suite goes 173 files / 2,841 tests to **180 / 2,904** with nothing written to make them pass. Both
narrowings are in place and `evidence-partition.test.ts` pins 42.

**AND IT WAS THE STATED REASON `altChatRender` WAS FILED BLOCKED**, forty minutes earlier the same
day. The guard was never off. That is the SECOND inherited blocker to dissolve on re-measurement in
one session, after the Rust one below — **re-measure a blocker before building around it.**

**THE ROOM NOW HAS A BROWSER GATE, and its first run found two defects that were shipping** — a
`ReferenceError` that made every room render 500 for eleven days, and a duplicate `<title>` that had
been overriding every page's. Both fixed; `.github/workflows/quality.yml` runs the suite on every PR.
All seven of its specs pass in 35 seconds. Getting the last four green turned up a THIRD shipped
defect: the login page navigated to itself in an infinite loop for anyone arriving with a valid
handoff, because the SvelteKit 3 migration to `goto(…, { shallow: true })` broke the termination
condition its own comment documented — that call does not update `page.url`, so the guard re-read the
token forever.

**THE SETTINGS ENUMERATION IS DOWN TO ONE UNBUILT FEATURE** — measured 2026-08-28, not inherited.
`enableDiscord` needs a Discord application registration, which is the owner's call because there is
nothing to link accounts to until one exists. `altChatRender` was the fifth and is BUILT.

**`hasAlertScheduler` is BUILT, and its blocker named the wrong process.** "A scheduler process in
`services/api`" is true of that crate and is not where this belongs: the reference's scheduler is its
own Node server, and this stack's long-lived Node process is the ROOM, which cannot be serverless on
two grounds already documented and which owns the `alerts` table and the fan-out. Durable rows, an
ephemeral sweep timer, one atomic conditional UPDATE so firing is exactly-once. FIFTH inherited
blocker to dissolve on re-measurement in one session.

**`autoRecord` + `dontStopRecOnMicMute` are BUILT, and their blocker described the wrong system.** It
read "a server-side recorder, which does not exist", which is true of the REFERENCE — its
`startRecLocal` is a misnomer reaching `socket.emit("cmd", {cmd: "startRecord"})` — and irrelevant
here, because this room records in the browser with `MediaRecorder`, deliberately and with the reason
already at the method. Two divergences are written at the code: only this peer's own share is
auto-recorded, and the start is guarded on not already recording. FOURTH inherited blocker to
dissolve on re-measurement in one session.

**`alertsOverlayOnScreenshare` was the fourth, and it is BUILT — its blocker was WRONG, not merely
stale.** The row read "a human at a screen picker", which remains true of the one thing it blocks:
nothing here can look at a composited frame, and `alert-overlay-contract.test.ts` says so in its own
header. But the risk in that feature was never the canvas; it was the wrapping, and the wrapping is
arithmetic. Split into a pure `alert-overlay-layout.ts`, all four of its wrapping rules are measured
against a stub text measurer and twelve negative controls were seen red. THIRD inherited blocker to
dissolve on re-measurement in one session.

**TWO INHERITED BLOCKERS WERE RE-MEASURED AND ONE IS NARROWER THAN IT READS.** `cargo check -p
tradingroom-api --features testing` and `cargo clippy -p tradingroom-api --features testing --
-D warnings` are **both green in this container**. What cannot build is `cargo test`: the crate
dev-depends on `tradingroom-media` for one contract test, which pulls `mediasoup-sys`, whose build
script fetches `libsrtp` from GitHub and gets **403** from the egress proxy. So a `services/api`
change can be compiled and linted here — it just cannot be unit-tested, which is why a scheduler
that writes to a multi-tenant database on a timer is not something to ship from this container.

**`chatTabsWithBadges` was the first row to change a TYPE**, 2026-08-28. This room had two chat
channels hard-coded in three components behind a closed `ChatTab` union, and the union's own note
argued for it: a typo becomes a compile error. An owner can configure more channels, behind badges,
so the set is per room AND per member — and the reference decides which a member gets **in the
browser**, against a list the browser holds. Every read and write path here asks the server instead,
and the realtime chat and typing fan-outs became audience-aware, which they were not. Two live
defects fell out of it: a reply could be posted into a channel the replier could not read, and the
chat fan-out told every listener in the room that something had happened in a private one.

---

## What the enumeration says

Nothing had ever ENUMERATED the reference's features, so "everything buildable is built" was for a
long time a statement about what somebody had thought to look for — while two whole presentation-area
tabs sat in the captured bundle unbuilt. `apps/room/gate/audit-feature-coverage.mjs` now asks the
bundle directly, and since it was written it has found, three separate times, work nobody knew
existed. **Run it after every feature lands.** It moved from the untracked `scripts/` to the
published `gate/` on 2026-08-27 and was re-derived from the tracked v4 bundle, so a fresh clone can
reproduce every number it prints; `src/lib/feature-coverage-contract.test.ts` pins the output by NAME
rather than by count, because wiring one command while another quietly stops being mentioned leaves a
total unchanged. **Its own first run under Vitest reported every gap closed** — the pin file contains
the absent names as literals and the scan was reading `src/**` whole, so the measurement was
satisfied by a pin of its own output. Test files are excluded now, and the rule that settled it is
the honest one anyway: a name that appears only in a test or a comment is not an implementation.

**What it measures today, from the pinned bundle (sha256 `40796ca8…bab87524`, 2,891,205 bytes):**
135 wire identifiers in the reference, **93 named in our source, 42 not**; 8 presentation-area tabs,
**6 named, 2 not** — `recordings`, which is a real gap with a named blocker, and `files`, which is not
a gap at all (the reference uses the id as a value in `onMainTabChange`; this room reaches the same
behaviour through a typed union). **An absent identifier is not an absent feature**: the last
adversarial pass killed 7 of 34 such claims outright and reclassified 9 more.

`docs/decoded/missing-commands-triage.md` — every missing identifier read at every occurrence, then
each gap claim put through an adversarial pass that killed 8 of 34:

| | |
| --- | ---: |
| **NOT BUILT — outstanding work** | **30** |
| — fully specified, ready to build | 25 |
| — need a decision first, still outstanding | 5 |
| claimed missing then refuted — we already build it | 7 (+1 contested, resolved by reading) |
| built under another name — the audit cannot see these | 9 |
| third-party noise, never ours to build | 4 |

**⚠️⚠️ "NOT BUILT" IS THE WRONG LABEL FOR ROUGHLY HALF THAT TABLE, AND THE RIGHT LABEL IS WORSE.**
A pass on 2026-08-17 attacked 49 open items with the single instruction *prove this is already
built*. **23 came back mislabelled** — 21 partly built, 2 built outright. The count above is left
alone deliberately (the document derives it, and a hand-adjusted copy in a second place is how one of
them goes stale), but **do not read that table as "nothing exists" for any given row.** The recurring
shape is this: **the UI was ported verbatim — every string, every button, every gate — and the wire
was never connected.** So the control renders, a presenter clicks it, and nothing happens.

**Five rows are simply built and the document has not noticed:** `playVideoForAll` (`:76`),
`stopVideoForAll` (`:71`), `playYTForAll` (`:73`), `stopYTForAll` (`:74`) and `unmuteChat` (`:82`),
all shipped 2026-08-15 (`for-all-broadcast.remote.ts:81,142`; `chat-mute.remote.ts:50`). A sixth,
`presAreaTabs-videoplayer`, is built and gated end to end at `PresentationArea.svelte:520-541` and
`:1039-1048` — so of the **two** presentation-area tabs the audit reported missing, only
`recordings` is real.

**The script is tracked and the re-run is DONE, 2026-08-27** — its current output is above. What is
still outstanding is the DOCUMENT: `missing-commands-triage.md` must be restated against those 42
names, and **its verdicts need three buckets, not one** — see *What "not built" actually means here*
below.

**ITS LINE POINTERS WERE STALE REPO-WIDE — FIXED AND GATED, 2026-08-29.** The document's `ours`
column was written before the `apps/room` decomposition. Measured: **44 `path:line` citations, 23 of
them naming a line that no longer exists** — the videoplayer row cited `+page.svelte:11294-11316` for
a file now under 1,500 lines, and the `restoreMobileAppTokens` row cited `ModalHost.svelte:5327-5362`,
which is now the alerts advanced-search modal. **Two were absolute paths into the author's home
directory**, which no clone can resolve at all.

All 44 are now a path plus a SYMBOL, which is what the document's own method section already
recommended — *cite symbols and verbatim strings, which survive refactors*. **The 200 byte offsets
are untouched and must stay:** they cite the SHA-256'd bundle, which cannot drift. A byte offset is
evidence; a line number is a guess about a file somebody else will edit.

`missing-command-census-contract.test.ts` now refuses a `path:line` citation, a dangling `, :133`
continuation, an absolute path, and — as its vacuity floor — the loss of the byte offsets. Four
negative controls seen red. This closes what `doc-citation-contract.test.ts` states it cannot see:
*"a citation that still lands INSIDE the file can still point at the wrong line… it catches the loud
half only."*

**Nothing that is not built gets parked.** An earlier version of that table carried a fifth bucket —
"unclear, needs a product decision" — which read as resolved and was not. A pending decision is
outstanding work; the only thing that removes a row is building it or proving we already did.

### What "not built" actually means here — four kinds, and only one of them is harmless

Established 2026-08-17 by reading each control end to end. **This distinction is the single most
useful thing the audit produced**, because the flat label "NOT BUILT" reads as *nothing is there* and
for most of these the truth is *it is there, it is live, and it is lying*. Severity runs top to
bottom.

**1. LYING CONTROLS — they report success and send nothing.** The worst kind, because the presenter
believes the action landed. **Row W names the one that is left; the census itself lives in row 4, which is
machine-checked** — this sentence carried its own copy (*"Row W holds THREE as of 2026-08-27, down from
twelve"*) until 2026-08-29, which made it the third place in this file stating one number. `remoteRestartAudio` was named here as the same shape
and is NOT one any more: `restart-audio` keeps its `EXACT_ALERTS` entry because the reference raises
that alert too, and it now sits over a real `restartAudio` command. **`focusOnSessionNote` WAS in this list and is FIXED, 2026-08-23.** Both controls — "Bring everyone
here" at `NoteTabContent.svelte` and "Bring **E**veryone here" at `NoteEditor.svelte:583` — were wired
through `NotesPane` to a purely local `selectNote(id)`, and brought nobody. They now send a real
`focusOnSessionNote` command on the same `cmds` channel the screen version uses, with the protocol
READ out of the capture rather than modelled on its sibling (bytes 1474066, 1970831, 1023554, 1962371)
— the two turned out to be adjacent cases in the same switch, which is the evidence that reusing the
channel was right rather than convenient. Authority is `presenterRoom()`, so no room identifier is
accepted from the client. `NoteTabContent`'s `onSelect` prop was deleted with it: once the menu item
stopped borrowing it, eslint showed it had no other reader. Pinned by
`focus-on-session-note-contract.test.ts` (11 cases), negative-controlled three ways including the
re-broadcast loop. It was the identical defect to the screens one that
`focus-on-screen-contract.test.ts:13` already recorded — *"The menu item said 'Bring everyone here'
and brought nobody"* — one tab away, and nobody had looked.

**2. DEAD CONTROLS — no handler at all, not even a toast.** Clicking does literally nothing.
**BOTH BUILT 2026-08-29 — this whole section is superseded and kept only for the byte offsets it
records.** `debug-log` and `upload-profile-picture` (with its remove half) have real branches, real
commands and contract cover; see `routes/debug-log.remote.ts` and `routes/profile-picture.remote.ts`.
**One correction the build produced:** the upload evidence in
`docs/decoded/missing-commands-triage.md:93` is TRUNCATED in that document — it names a "125px
longest edge" downscale and three alert sentences but cuts off mid-word — so both were read from the
bundle instead, at bytes 2,084,700 and 2,086,100, and the downscale and the alerts shipped as a
correction hours after the feature. The original text follows.

`getDebugLog`: `ModalHost.svelte:2306` dispatches `onUserAction('debug-log', …)` and that string
occurs **exactly once in the whole source**, at the call site — no branch in `handle()`, no entry in
`EXACT_ALERTS`. Its modal at `:3844` is unreachable (nothing ever sets `name === 'debug'`) and
nothing ever fills `debugLogModalTxt`. `setUserProfilePic` ("Upload Profile Picture",
`ModalHost.svelte:2376-2381`) is the same.

**IT WAS ELEVEN, IT IS NOW SIX, AND NINE OF THE ELEVEN HAD NEVER BEEN RECORDED ANYWHERE.** The
paragraph below is the 2026-08-23 finding, kept because how the class was FOUND is the transferable
part; the count is re-measured in row 4 and in `user-action-intent.ts`, which is the authority.
Established 2026-08-23 by
diffing every `onUserAction('…')` string in the source against every branch in
`RoomUserActions.handle` and every key of `EXACT_ALERTS`: **42 dispatched, 27 handled, 5 alerted,
11 reaching nothing.** `handle()` ends on a bare `if (fixedAlert)` with **no fallback**, so each of
the eleven returns having done nothing at all — no command, no toast, no error, nothing in the
console. This section previously named two of them (`getDebugLog`, `setUserProfilePic`); the other
nine are `stop-screens` (`ModalHost.svelte:2265`), `restart-screens` (`:2272`), `start-recording`
(`:2279`), `stop-recording` (`:2285`), `mute-mic` (`:2253`), `mute-camera` (`:2259`),
`disable-private-chat` (`:2373`), `get-my-token` (`:3075`) and `test-follow-sound` (`:2505`).
**None of the eleven has a server half** — verified by searching `src/routes` and `src/lib/server`
for each name, which returns zero files — so none can be wired by connecting an existing endpoint.
Each needs the reference's captured wire protocol or an infrastructure decision, and this
repository forbids inventing either.

**GUARDED, NOT FIXED — `user-action-disposition-contract.test.ts` (2026-08-23).** Deny by default:
every dispatched action must be handled, alerted, or carry an entry in `INERT_ACTIONS`
(`user-action-intent.ts`) with a reason and a `file:line`. A twelfth cannot be added silently, and
wiring one means deleting its entry — at which point the gate demands a real handler. It also
refuses dispatch by a COMPUTED name, which no enumeration could see. Nine cases; the runtime half
executes `handle()` for each inert action and asserts no dialog, no toast, no command, behind two
positive controls. Negative-controlled three ways: a twelfth dead control, an action wired without
removing its entry, and a placeholder reason — each red on its own assertion. **The entries are a
to-do list with evidence attached, not a suppression file: the work is still open.**

**3. SILENT CORRECTNESS GAPS — it works, but not the way the reference works, and nothing says so.**
`doChatLogSearch` was the example and **the ALERTS half is closed, 2026-08-27, by the second of the
two resolutions the defect table offered: the limit is VISIBLE.** The toolbar still filters the rows
the page holds — it is a live filter, not a round trip — but it now says so, and points at the
Advanced Search modal, which has queried the database since 2026-08-23 and reports its own
truncation. `alert-toolbar-search-scope.ts` carries the rule and records that the sentence is ours.

**The CHAT half is a missing FEATURE, not a broken one, and that is the correction:** this room has no
chat search input at all. Upstream's `doSearchSubmit` (byte 1439114) sends
`{searchTerm, channel, type:"chat", del}`, and the same command with `del:true` DELETES what it
matches — gated on `deleteAlertPW`, which is the setting row 2 was originally confused about. Building
the search would mean deciding about the delete too.

**4. HONEST PARTIALS — half built, and the code documents the limit.** These are fine and must not be
lumped in with the above. `forceStopScreen` is the example: `screens.stop()` really stops one of your
own screens (closes the producer, releases the capture), and for somebody else's it drops the tab
with the reason written down — *"Stopping their producer is not ours to do, so this only drops the
tab and is deliberately not pretending the remote share ended."* That is the standard being met, not
missed.

**A FIFTH THING THAT IS NOT A CONTROL AT ALL — FIXED 2026-08-23, recorded because the shape recurs.**
`+page.server.ts:381` sent `muted: roomConfig.member?.muted ?? false` into the room and **nothing read
it**, so the controller's PERMANENT mute (manage page, `applyUserOpcode` case 3, membership role 3)
crossed the seam and did nothing: a member muted indefinitely kept posting, because the room enforced
only its own 24-hour `chat_mutes` table. `refuseIfMuted` in `chat-messages.remote.ts` now asks the
control plane on both send paths — server-side, from data the server owns, rather than trusting the
value that had already been serialised into the page. Pinned by three cases in
`message-alert-action-contract.test.ts`, negative-controlled.

**A THIRD PATH had no mute gate at all and is also FIXED: private chat.** `sendPrivateMessage`
checked NEITHER mute — not `chat_mutes`, not the controller's — so a muted member could DM, which is
the worse direction because nobody else in the room can see it. In scope rather than assumed: the
reference gates its own private-chat composer on `e.isConnected && e.chatEnabled` (bundle byte
2199385) and a mute is what clears `chatEnabled`. The guard now lives in `#lib/server/chat-mute.ts`
and is SHARED rather than copied — two copies of a rule this small is how one drifts, which is
precisely what happened to the 24-hour mute when it was enforced on `sendMessage` and not on
`replyMessage`.

**Still open beside it, and NOT fixed:** `askQuestion` (`alert-questions.remote.ts:56`) has **no mute
gate of either kind**. Whether a CHAT mute should silence Q&A is a policy question with no evidence
either way in anything read so far, so it is recorded rather than guessed — extending the gate on a
hunch is the invention this file exists to prevent.

### OPEN RIGHT NOW — the running list, 2026-08-23

**Nothing here is parked.** Each row says what it needs and who can move it. A finding that lives only
in a conversation is a finding already lost, so anything noticed goes in here the moment it is
noticed — rows 9, 10 and 11 all arrived that way on 2026-08-23, found while confirming something
else and written down before they could be forgotten.

**A row that is DONE is deleted, never struck through.** Two `forceReload` rows left on 2026-08-23
once the fix shipped; the CHANGELOG entry of 12:12 EDT is where finished work is recorded. Two
places describing the same thing is how one of them goes stale.

| # | open item | needs |
| --- | --- | --- |
| 1 | **`kick-duplicates` KICKS — built 2026-08-23, and the row's blocker was my own bad reading.** It alerted ``"No duplicates found for "+nick`` unconditionally, never touching a roster. Now: match `session().connectedUsers` on `emailHash` with a different `id`, one `kickUser` per match, one alert carrying the count. The rule is pure in `#lib/kick-duplicates.ts` (the `mute-all-non-admins.ts` pattern); the wiring is `RoomKicks`. **Negative control seen RED on both arms** — mutated to match on `id` alone it kicked the stranger: `expected [ 3, 7, 8 ] to deeply equal [ 7, 8 ]`. I had claimed this needed `emailHash` added to the roster; it was already on `User` and already read | NOTHING. Done |
| 2 | **`admin-notes-password` BUILT, and the tripwire hole is CLOSED — 2026-08-29.** The row's own correction stands and is what made this buildable: the setting is `needPasswordForUserNotes` (`room-settings-schema.ts:90`, `wired: false`), not `deleteAlertPW`, which belongs to `archiveChatDate` at byte 2,048,693 — the two share only the string `"Wrong password!"`, which occurs NINE times in the bundle and is what the original row conflated. Built exactly as the row specified, on the `internal/room-entry` precedent: **`POST /internal/room-notes-auth/<code>` takes the typed candidate, compares it on the CONTROLLER and answers two booleans** — the credential stays where it was configured and the QUESTION travels. Room half is `checkNotesPasswordRemotely` (a READER in `config-write-capability-contract.test.ts`) and `RoomNotesAccess`; `wired` stays `false` for both settings, as the row required. **The second half of this row was still open until 2026-08-29 and is now done:** `needPasswordForUserNotes` matched NONE of `room-config-boundary.test.ts`'s `credentialShaped` patterns, so the tripwire meant to catch a credential crossing to the room would have watched this one past. `[Pp]assword` is now in the pattern — with a TYPE check beside it, because `showPasswordField` is on `ROOM_VISIBLE_SETTINGS`, matches the same pattern and is a boolean about whether the login page draws a box. A bare `/[Pp]assword/` would have repeated the `URL$` mistake this file already records. A positive control now asserts the tripwire catches the one that got past it. | NOTHING. Done |
| 3 | **BOTH NOW SEND — built 2026-08-26, and the defect table's verdict was wrong.** That table said *"uses only existing code … the honest fix needs no protocol at all — correct the message"*. That was decided without locating the senders. Both are in the bundle: `refreshRoster()` is `sendServerAdminCommand("refreshRoster", null)` at byte 2169139, and soft reset's server frame is `case"softResetDone"` at 1023810. Correcting the sentence would have meant giving up a working feature to make a true statement about not having it. Now `session-commands.remote.ts` — a THIRD remote module, because both take no argument at all and a third payload shape would have falsified `presenter-commands`' opening paragraph. `refreshRoster` re-publishes the roster (redacted per recipient as always); `softReset` broadcasts `softResetDone`, and the receiver drops remote media then rebuilds after **up to 3s of per-client jitter** — `3e3*Math.random()`, which is the "gently" on the button's own label and the difference between a reset and a thundering herd at the SFU. Two deliberate divergences recorded: the presenter's own mic/cam are NOT cut (upstream does; our `restart()` re-establishes them), and upstream's `for (let r of this.screenSharingUsers);` is an EMPTY STATEMENT that does nothing | NOTHING. Done |
| 4 | **SIX inert controls, not ten — recounted 2026-08-27 from `user-action-intent.ts` itself rather than from this row.** Four left the table when they were built: `mute-mic`, `mute-camera`, `stop-screens` and `restart-screens` are `PEER_SUBCMDS` entries reaching `presenterCommand` (`presenter-commands.remote.ts`), gated by `presenterRoom()` and addressed with `publishToUsers`, so the server-side presenter check this row demanded EXISTS and has since it was written. Of the six left, **two are not work**: `disable-private-chat` MATCHES the reference, which renders that button with no click binding at all, and building it would be the divergence; and `start-recording` / `stop-recording` are an honest gap — their wire IS captured, and it resolves to the reference's SERVER-side recorder, which this room does not have. Pointing them at `RoomRecording`'s local `MediaRecorder` would write a video file to a member's disk unprompted. **BOTH ARE NOW BUILT — 2026-08-29.** `debug-log` and `upload-profile-picture` have real branches, real commands and contract cover; what remains inert is the recording pair (no server-side recorder), `disable-private-chat` (a MATCH — the reference wires nothing to it) and `get-my-token` (a deliberate security divergence). The count of controls that are inert *and* represent unbuilt work is therefore **ZERO**. `upload-profile-picture` also carried a wrong disposition: it was filed as belonging with the controller because it is durable, and the controller's `users` table has no avatar column — the room's own `users.avatar_url` is the authority. It is also the first presenter command needing `requireRoomMember`, because it is the first that writes a durable row keyed on the target alone rather than being scoped by `publishToUsers`. The original note follows. **TWO were real work, not three — corrected 2026-08-29.** `get-my-token` was listed here as *"fully evidenced at byte 2255348 and merely unbuilt"*, and that is wrong in the direction that matters: it is evidenced and DELIBERATELY NOT BUILT. The reference dialog renders `globals.sesionToken` into a readonly input, and this room's session cookie is `httpOnly` (`apps/room/src/lib/server/auth.ts:91`), so no script can read it — every occurrence of `sesionToken` in this repository is a quotation of the reference inside a comment. Building it would mean putting an httpOnly value into the DOM, turning a cookie an XSS cannot read into a string it can. The other half is not worth building alone: `globals.sessionID` is the room code, already in the address bar. Unblocking it needs a token SAFE to show — a short-lived, narrowly-scoped support identifier — which is a feature, not a port. See its `INERT_ACTIONS` entry. The two that remain: `debug-log`, which needs a bounded client log buffer, a reply direction nothing else uses, and a server that REMEMBERS the requestor rather than trusting the client's field; and `upload-profile-picture`, which is durable and so belongs with the controller like `room-ban`. **Disposition census, measured 2026-08-29: 38 dispatched actions, 4 inert, 2 carrying a fixed alert — and NEITHER of those two is a liar.** The 2026-08-27 census this row used to carry said *40, 6, 3* and named `mute-chat-indefinitely` as sending nothing; that was true when written and stopped being true the same day, when the control was wired and its `EXACT_ALERTS` entry deleted — see row W, which recorded the change while this row kept the superseded number. **The census is now GATED**, and it had earned one: row W's own text records this family being counted as seven, then nine, then twelve, each time by arithmetic over the previous number rather than by reading the code. `user-action-disposition-contract.test.ts` recomputes all three numbers and fails if this sentence disagrees with them, so it is the authority in the enforceable sense now — not merely by asking to be read instead of this row | `get-my-token` is a security divergence rather than a build — see above. `debug-log` and `upload-profile-picture` need design, both named above. The recording pair needs a server-side recorder, which is the deployment decision `RoomRecording` records |
| 5 | **The room's four Chromium gates cannot run in CI.** They pass locally — 22 assertions — but `/apps/room/scripts/` is gitignored entirely (`.gitignore:176`), deliberately: collectors that reach the REFERENCE application are not published. Proven by trying: the runner failed `MODULE_NOT_FOUND` | an OWNER DECISION: publish those collectors, or re-implement the measurements under `apps/room/gate/`, which IS published |
| 6 | **`kick-ban` BUILT end to end, 2026-08-23 — the ban is durable.** `POST /internal/room-ban/<code>?email=<caller>` writes `roomUsers.banned`, mirroring `internal/room-permissions` exactly: bearer MAC over `<code>.<timestamp>`, account-active check, caller must be owner-or-presenter **of that room**, target must be a member **of that room**, target named by EMAIL because ids do not cross the seam. Two refusals are stricter than the reference and deliberate: **no self-ban** (following `room-permissions`, which follows `giveMicScreen`'s *"Can't give 'Mic/Screenshare' to yourself."*), and **no banning the owner** — a room whose owner can be banned by their own presenter can be taken from its account holder, which fails closed by choice rather than by capture. The write is ONE conditional UPDATE re-scoped by `roomId` with `.returning()`; zero rows is a 409 the room surfaces as a refusal, not an outage. Room side: `kickUser` now carries `ban`, as upstream's `{user,msg,ban,kickAllInstances}` does, and **the ban is written BEFORE the frame goes out** — kick first would disconnect the member while the write is still in flight, so a failed write would eject somebody who had been told they were banned. `kick` and `kick-ban` share one branch and the flag is asserted explicitly on both sides. `kickAllInstances` is still refused: its behaviour is not shown anywhere read, and `kick-duplicates` does that job explicitly. **Negative control seen RED.** Still absent: upstream's `app-kicked-page` | NOTHING for the ban. A kicked page remains unbuilt |
| 7 | **RE-READ 2026-08-26. Three sub-items, and the row's own parenthetical was FALSE — the seventh false claim on this file.** The row said *"the room already reads `sessData.closedTxt` somewhere — find it"*. **There is no reader.** `closedTxt` has ZERO occurrences in `apps/`, `services/` or `ops/` — the only five hits are prose in two docs, and `docs/reference/room-component-gap-register.md:343-344` says the opposite in as many words. What generated the belief is `ModalHost.svelte:4184`, which carries the reference's own element id `summernoteClosedMsg` (upstream binds `closedTxt` into it by `innerHTML`, byte 2154583) and renders the hard-coded literal string `undefined` inside it. **An EIGHTH false claim sits in our own triage:** `docs/decoded/missing-commands-triage.md:48-49` lists `saveAndCloseSession` and `saveCloseMessage` under *"the seven false gaps — we already build these"*, citing a BUTTON and an alert-only handler. Neither is built. **(a) BUILT 2026-08-26 — both receivers ship.** `RoomBroadcasts.salesImageShown`/`salesImageDismissed`, two guarded dispatch branches, and the `#added-image-to-chat` overlay in `AlertChatArea`. **The presenter is EXCLUDED from both** (`isPresenter ||` at bytes 1015228/1015399 is a guard, not a truthiness shorthand) — a negative control removing it came back GREEN, so `for-all-broadcast-contract.test.ts` now pins the guard, the empty-url refusal and the two distinct bodies; seen RED. Divergences stated in the markup: `rel="noopener noreferrer"`, keyboard affordances on the close span, `alt=""`, and no img dimensions (the overlay is `position:absolute`, so out of flow — no CLS possible). ORIGINAL FINDING RETAINED: Senders live (`for-all-broadcast.remote.ts:203-214`, gated + `broadcastableUrl`); **the overlay CSS is already shipped verbatim** — all four rules `#added-image-to-chat`, ` img`, ` span`, ` span:hover` at `css/complete-app-styles.css:7004-7007`; the `.chat-box` element it appends into exists at `AlertChatArea.svelte:670`; `RoomBroadcasts` is the named home for room-wide receivers with six already there. Needs: overlay state + two receiver methods on `RoomBroadcasts`, two dispatch branches in `events.svelte.ts`, the markup, and contract cover. **(b) `session-save-close-message`** — needs a column on `room_state` (`schema.ts:854-863`, holds only `chatMode` today), a `saveCloseMessage` command, the wiring, and a load. HONEST GAP: the reference's SERVER is not in the capture, so WHERE it stores the message — per session or per room, which column — is unknowable; only the payload key `closedMsg` and the round trip are evidenced. **(c) The opcode-3 door** — needs `internal/room-mute/[code]` on the controller, `roomMuteUrl`+`writeRoomMute`, a `muteChatIndefinitely` command, and the button branch. HONEST GAPS: opcode 3 DESTROYS the target's prior role (a muted presenter returns as a participant — the same trade `internal/room-ban` already records), and the `time` value does not survive: upstream carries both durations on ONE `muteChat` distinguished by `time` (`"24"`/`"0"`) while this repo splits them across two stores (SQLite `chat_mutes` vs controller `role = 3`) | **(a) and (c) are DONE.** (c) shipped: `internal/room-mute/[code]` is on the controller, `writeRoomMute` is a WRITER in `config-write-capability-contract.test.ts`, and `muteChatIndefinitely` is a real command wired through `create-room.svelte.ts` — with both honest gaps recorded at the code. **(b) IS ALSO DONE, measured 2026-08-29** — `room_state.closed_message` (`schema.ts:981`), `saveCloseMessage` in `session-commands.remote.ts`, `lib/room/close-message.ts`, `lib/server/closed-room-message.ts` and `close-message-contract.test.ts`. The storage decision the row asked for was taken and RECORDED AT THE COLUMN rather than here: per ROOM, because `room_state` is already keyed that way and a message that reset on every close is one the presenter rewrites every time — *"recorded as a decision, not a match"*, since the reference's server is not in the capture. `NULL` is kept distinct from `''` so an unset message falls back to its own sentence rather than showing a member a blank page. **THIS ROW IS NOW ENTIRELY DONE.** **The `config-read:` inheritance is FIXED, 2026-08-27** — `config-write:` is its own domain, the four write endpoints (`room-ban`, `room-permissions`, `room-setting`, `stream-ingest`) verify it, and a read token is refused at each. A new door now picks a capability instead of inheriting one |
| 8 | **A guest's pre-hydration email is RARELY discarded on `/session/[code]`.** Once in nine e2e runs, never in eight targeted repeats. The field resolved first as the SSR node then as one with no `value` attribute — **replaced rather than hydrated**. Mitigated not fixed: `playwright.config.ts` retries twice in CI, reporting it as flaky | a reproduction; the load correlation suggests throttling the CPU or the script release |
| AJ | **TWO REFERENCE SURFACES FOUND BY ARITHMETIC, 2026-08-29 — `app.css` styles 29 classes nothing wears.** Measured across 200 class selectors in our own `app.css`, with every `.svelte` and non-test `.ts` in `src/` as the corpus of possible wearers. The 29 split cleanly and the split is what makes them actionable: **14 are CAPTURED** (the reference's own sheet has them, so the rule is waiting for markup) and **15 are OURS** (invented pre-decomposition panel names that nothing will ever wear). Two findings fall out of the captured half. **(a) `#user-modal` is missing four affordances.** `edit-user-avatar-options`, `remove-profile-picture-btn`, `chat-stars` and `tagline` all carry the Angular component id `ng-c1441935951`, which IS the user-info modal this room renders — so the modal is built and four of its controls are not. `remove-profile-picture-btn` is the other half of `upload-profile-picture` (built 2026-08-29): a presenter can set an avatar and cannot clear one. `chat-stars` is a per-member rating nothing here reads or writes; `tagline` needs a column this room does not have. **(b) A microphone-test surface with FIVE states** — `mic-status-idle`/`testing`/`success`/`no-audio`/`error`, all `ng-c2606333922`, with no counterpart here at all. **How this was found is the point:** `.debug-area` sat in `app.css` with two rules and no wearer for the entire port, and it was the captured class for the Debug Log textarea — the CSS was the only trace that the feature was missing. That was luck. `orphan-style-contract.test.ts` makes it arithmetic: all 29 are catalogued with a reason and a measured `captured` flag, a THIRTIETH fails the build, and an entry that gains markup fails until it is deleted — the same declaration `INERT_ACTIONS` treats as done | (a) and (b) are unbuilt reference surfaces, each now named with its component id. **The 15 invented rules are GONE, 2026-08-29** — 26 rules and 185 lines, deleted in their own commit for the reason the measuring one recorded. Not one rule was partial: every selector in every one of the 26 was dead, so `postcss` could remove whole rules and refuse by construction to touch a rule mixing live and dead selectors. Every custom property they referenced still has other consumers, and the browser suite is green on the deletion. **`remove-profile-picture-btn` is also gone from the catalog** — built the same day, which turned the gate red and is the declaration that it is done. Thirteen entries remain and every one is now a FEATURE rather than dead code |
| 9 | **The `privCmdsIn` switch: ELEVEN cases, EIGHT built here, TWO built elsewhere, ONE left.** Re-enumerated 2026-08-29 from bytes 995,800-997,400, and the offsets are quoted in `private-commands.ts`'s own docblock so the count can be re-run rather than trusted: `995896 forceReload`, `995969 remoteRestartAudio`, `996041 getDebugLog`, `996120 debugLogResp`, `996187 kickUser`, `996261 muteChat`, `996320 unmuteChat`, `996376 remotePresCommand`, `996456 userInfo`, `996699 updateProfilePic`, `996894 getRoster`. Built HERE: all but the three that are not addressed frames — `remotePresCommand` rides the `cmds` channel and `getRoster` lives in `RoomRoster`, both built. `forceStopScreen` is a NINTH branch with no upstream case at all (2026-08-29). The whole channel sits behind **ONE addressing gate**, deny-by-default, which every branch written after it inherits without its author knowing the rule exists. **LEFT: `userInfo` alone.** Sender `invoke("invokeCmd", {cmd:"userInfo", uid, rid, socketID, serverID, liveOnly})` at byte 1,026,474; the frame carries `notesArr`, `privData` and `badges`, which need a server-side user-detail lookup this room has no endpoint for. **This row said FIVE built and THREE left until 2026-08-29** — written before `getDebugLog`, `debugLogResp` and `updateProfilePic` landed, and the same staleness the row's own prose warns about. The logout-on-ban is DONE and pinned by `ban-ends-the-session-contract.test.ts`. | one receiver: `userInfo` |
| 10 | **BOTH BUILDABLE SENDERS SHIP, 2026-08-27 — and the row's own diagnosis was right: the receivers were never the missing half.** `RoomDialogs.alertThen` had existed since `forceReload` was built, and all four upstream callback receivers were already transcribed in `dialogs.svelte.ts`. What was missing was a SENDER: `session-hard-reset` and `session-open` wrote a PREFERENCE and told nobody, so each read as working from the only seat that could see it — the presenter's own page reloaded. Both are now ordinary broadcast commands in `session-commands.remote.ts`, with the receivers on the `cmds` channel: `hardReset` drops remote media first (upstream disconnects before it alerts) and `openSession` does not, and their two sentences are the capture's, read at bytes 2596540-2597340. **The preference writes STAY** — they are what makes the act survive a client that was not connected to hear the frame. Covered by two cases in `events.svelte.test.ts`. **`permsChangeReload` stays blocked and is the only part of this row left:** `reAuthSessionTok` is confirmed absent from the bundle, so there is nowhere for its callback to navigate to | NOTHING for the two. `permsChangeReload` needs a capture that contains `reAuthSessionTok` |

### The six defects that are REAL, FIXABLE, and not yet done — investigated 2026-08-23

Each was traced end to end by reading, and each verdict says what it would cost. **None of them is
blocked on a decision or on hardware**; they are simply not built yet. Ordered by severity.

| defect | verdict | what is missing |
| --- | --- | --- |
| **`save-permissions`** (HIGH) | **FIXED — and this row's verdict was right about the shape and wrong about the state** | It said the room has no write path to the controller. It has one: `permissions.remote.ts` → `writeRoomPermissions` → `POST /internal/room-permissions/<code>`, gated by `presenterRoom()`, with the five keys taken from `ROOM_PERMISSION_KEYS` rather than from the client. The alert stays in `EXACT_ALERTS` because the reference raises it too — an announcement over a real send, not a liar |
| **`session-refresh-roster` / `session-soft-reset`** | **FIXED 2026-08-26 — and this row's verdict was wrong** | It said the honest fix was to correct the message. Decided without locating the senders; both are captured and both are ordinary server commands. Built as `session-commands.remote.ts`. See row 3 |
| **`doChatLogSearch`** (MEDIUM) | **BOTH HALVES DONE — the alerts half 2026-08-27, the chat half 2026-08-29** | The alerts half was resolved the second way this row offered: the limit is visible, because a real endpoint already existed one click away in Advanced Search and a second search path over one table was the wrong half to build. **The chat half could not take that resolution** — its premise was *"a correct search already exists one click away"*, and the chat columns had no search at all. So it is the endpoint: `searchChatChannel` (`server/chat-log.ts`), `searchChatMessages` (`log-pages.remote.ts`, reusing `loadOlderChatMessages`' channel gate verbatim), `RoomChatSearch` and `ChatSearchBar.svelte`. **The security half is the part worth reading:** upstream renders results straight, because it filters webinar mode at ARRIVAL; this room filters at VIEW, so the faithful port would have handed a member in webinar mode every other member's messages by typing one letter. Results enter the pipeline where the merged log leaves it. **The delete-by-search (`del: true`) is REFUSED rather than omitted** — a destructive operation whose blast radius is a LIKE pattern the caller typed needs its own authority argument, not a flag on the read path; it stays on the census as its own row |
| **`admin-notes-password`** (LOW) | needs new server code | The typed value IS delivered and the handler throws it away — `user-actions.svelte.ts:674-684`. **The setting this row named was wrong**: it is `needPasswordForUserNotes`, not `deleteAlertPW`. See row 2 |
| **`kick-duplicates`** (MEDIUM) | **NOT fixable without inventing** | The reference's own implementation was read in the capture, both arms confirmed. The positive arm needs a kick the room cannot perform. Recorded, not guessed |

**FOUR were fixed on 2026-08-23** and are recorded above rather than here: the controller's permanent
mute, the missing private-chat mute gate, `focusOnSessionNote`, and **`forceReload`** — whose form
action and receiver both existed with nothing joining them while its button raised a fixed alert
and sent nothing. Two defects cancelling into silence: nobody misses a wire nothing calls, and
nobody doubts a button that reports success. `EXACT_ALERTS` is down from five entries to four, the
orphaned action is deleted, and the actions export is nineteen to eighteen.

**Ready to build, fully specified:**

| item | spec | note |
| --- | --- | --- |
| `presAreaTabs-recordings` — **NOT BUILT, blocker named** | `docs/decoded/missing-commands-triage.md` | NOT cheap after all. The reference's pane is one iframe onto a SERVER archive page; verified 2026-08-17 that there are **zero recordings/archive tables in either database** — `rooms.archived_at` is a per-room flag, not an archive — so the tab would front nothing. Needs an archive service first: a design decision, not a port |
| Alert Labels — **composer picker only** | `docs/decoded/alert-scheduler-filter-labels.md` | The RENDER half is built: the setting is wired and `#hash` becomes a badge on the alerts log. What is left is the post-alert modal's label SELECTOR, the thing `checked` exists for. **Evidence gap, not a port:** `alertLabels` is one of `direct-evidence-contract.ts`'s `hiddenCapabilityBranches`, so that branch never rendered in any capture we hold and there is no markup to match. Needs a new capture from a room that has the entitlement |
| Alert Scheduler | same | **BUILT 2026-08-29 — removed from "ready to build".** This cell said *"The entitlement IS captured and IS in the schema — `hasAlertScheduler` … but it is `wired: false`, so nothing in the room reads it."* Measured: `hasAlertScheduler` is **`wired: true`**, and the feature ships as `scheduled-alert.ts`, `server/scheduled-alerts.ts`, `routes/scheduled-alerts.remote.ts`, `components/ScheduledAlerts.svelte` and the sweeper `startAlertScheduler`, under `scheduled-alert-contract.test.ts`. `NEW-TODO.md` §5.3 carried the same stale claim and was corrected the same day — two trackers describing one feature, and both wrong in the same direction |
| Benzinga — **BUILT BOTH PLACES, 2026-08-29** | `NEW-TODO.md` §2.2 | This cell said the const-table pass *"found nothing to change"*. It found a whole surface: **Benzinga renders TWICE upstream.** Two of the three render functions are the sidebar component compiled twice (`mPe` 2,467,533, `_Re` 2,563,731); the third, **`PPe` at 2,473,150**, is a different element in a different container with different classes — the NAVBAR item — and only the sidebar one existed here. The indices were parsed with a string-aware walker rather than counted, because an index is per component and the sidebar's `li` is index 32 of a table where that means a generic `nav-item`. Both honest gaps stand and are recorded at the code: the default url is built from three values this room does not have, and `assets/images/benzinga-logo.png` is verified absent — which is why the navbar item, being image-ONLY upstream, renders only when the room supplies a logo rather than shipping a broken `<img>` |

---

## The rows blocked on a decision, an environment, or hardware

One table, and every row says who or what unblocks it.

| row | what it needs | who or what unblocks it |
| --- | --- | --- |
| **G** | **The Postgres host question — Neon under volume.** Serverless Postgres autoscales compute, but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent; current load is one user. **`docs/NEXT-SESSION.md` ANSWERS THIS TWICE AND THE TWO ANSWERS DISAGREE, which is itself the first thing to fix:** `:406-410` is headed "What should NOT move" and states "**PostgreSQL stays managed** … this is the one tier where paying for someone else's on-call is straightforwardly worth it", while `:245-246` lists "whether Postgres stays managed or moves self-hosted" under **Open sub-questions**. Until one of those is struck, this row cannot be narrowed to "which managed provider" — an earlier draft narrowed it on the strength of `:406` alone, having not read `:245` | the owner |
| **H** | **Production topology should SEPARATE the media plane from the app tier.** Hetzner earns its place on egress economics and the rest of the app has the opposite shape. One box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed is a five-day TEST topology. Separating later is a redeploy, not a migration. **`NEXT-SESSION.md` §4c still reads "Start with one" and has not been amended**, so two documents currently record opposite intents | the owner |
| **Q** | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is proven: `php -l` clean under PHP 8.3.33, and `tests/mint-golden-token.php` mints a token with the plugin's OWN functions which our TypeScript verifier checks in `sso-wordpress-contract.test.ts`. Both ran in a container, so no local PHP is needed. **What remains needs a real site:** boot it against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry** — the only thing that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions` and the cached-page path. `integrations/wordpress/STAGING-TEST.md` §6 is that step | an environment |
| **E** | **The seam probe has still never been RUN, and its instrument is not in the repository.** `apps/room/.env` exists and its `ROOM_JWT_SECRET` matches the controller's, so the original blocker is gone. What replaced it: `room-config-seam-e2e.mjs` is **untracked** (`git ls-files` returns 0) and absent from a fresh checkout — one of the 30. It also declares `CONTROL=http://localhost:5180` while the controller's dev port is **5173** (`apps/controller/vite.config.ts:26` — this row said `:17` until 2026-08-17). Port 5180 is a different project, which a first run actually reached: `/register` answered 404. Meanwhile the gates ARE tested — `chat-alerts-gates-contract.test.ts`, 30 assertions across 13 tests, negative-controlled — but no browser has watched a column leave the DOM when an owner ticks the box | nothing — this one is mine to run |
| **R** | **Screenshare quality and the MP4 question — rows 6, 8 and 10 of `apps/room/docs/streaming-choices.md`.** Rows 2 and 4 shipped: the recorder picks VP9 at 8 Mbps (`recording-codec.ts`) and `contentHint = 'detail'` is set on the captured screen track. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both need the same measurement, and it needs a human because `getDisplayMedia` requires an OS screen-picker dialog automation cannot click — the procedure is `apps/room/docs/MEASURE-SHARE-QUALITY.md`, ~5 minutes. Headless returns Chrome's synthetic gradient, which compresses too easily to show any difference. Row 10 (server-side remux, so MP4 is universal rather than Safari-only) needs the same cluster as X and AC. **`streaming-choices.md` HAS TWO STALE LINES OF ITS OWN and they should be corrected when somebody next opens it:** `:3` reads "Nothing here is implemented except the entry marked DONE" (the only entry so marked is row 1 at `:72`), which has been untrue since rows 2 and 4 shipped; and the "What is already true" table at `:23` still records `Screen track contentHint` as **unset**, though it is set in `apps/room/src/lib/room/media-transport.svelte.ts` | the owner, then a MediaMTX cluster |
| **X** | **One settings-modal checkbox remains: `app-recording-preview-window` (`recPreviewWindow`), and it is blocked, proven rather than assumed.** The image src is `${sessData.recPreviewLocation}?${Date.now()}` polled every 1000 ms, and `recPreviewLocation` is set by the SERVER on the command channel — `case "setRecPreview": globals.sessData.recPreviewLocation = i.url` (bundle byte 1023704). It is not a manage-page setting and nothing else writes it. The component's OWN gate is `videoOnlyMode \|\| !isPresenter \|\| !recPreviewLocation \|\| !recPreviewWindow` → do nothing, so without a server snapshot it correctly renders nothing. Building it would ship a component that cannot run. The other twelve checkboxes are closed | a MediaMTX cluster |
| **AC** | **`stopRecMsg` browser Notification — the server does not send it.** Re-audited and the premise HOLDS. `stopRecMsg` appears three times in the bundle and its only emitter is the SERVER command switch (byte 1014265); the subscriber is `app-room` (byte 2501954). The payload is server-GENERATED text, so a client-side recorder cannot produce it: our `recordingState` broadcasts `startRec`/`stopRec`/`pauseRec`/`resumeRec` with no message body. The producer is the MediaMTX path — the presenter asks with `startRecMtx`/`stopRecMtx` and the SERVER answers with those six, so `stopRecMsg` arrives when a MediaMTX recording stops and not before | a MediaMTX cluster |
| **AD** | **OBS / XSplit — BOTH HALVES BUILT. Ingest and playback are complete** and every named artefact was re-verified 2026-08-17: `mtx-streams.ts` (26 tests), `StreamingView.svelte` with the full hls.js ladder, `StreamTabs.svelte`, the `#streams` pane, the three wire commands with `isMtxStream` validation at the wire boundary, the room's `/internal/media-hook`, `mtx-reconciler.ts`, the CONTROLLER's `/internal/stream-read/[code]` (it mints the playback token, so it lives with the database — named by app here because "internal" routes exist in both), and `stream-ingest.db.test.ts` against a real PostgreSQL. `apps/room/docs/OBS-XSPLIT-INGEST.md` is the contract and `OBS-XSPLIT-SETUP.md` the operator instructions. **ONE thing remains and it is not code:** a host at `STREAM_SERVER_MTX` with 8889 (WHIP/WHEP) and 1935 (RTMP) reachable and TLS in front. With the variable blank the panel says so honestly and the credential still mints, rotates and validates. What cannot be produced without the host is an end-to-end publish from a real encoder | a MediaMTX host at `STREAM_SERVER_MTX` |

**One decision unblocks X, AC and R's row 10, and it is not "build server-side recording."** The
reference hands recording to **MediaMTX**, an off-the-shelf media server. `useMediaMTX`,
`mediaMTXClusterID` and `backupMediaMTXClustterID` are all real manage-page settings inside the
reference's own `dont-touch` group, and the two ClusterIDs are read by the reference's SERVER — they
appear nowhere in the room bundle. The room only observes MTX streams and asks the server to record
them, so **there is no room code waiting to be written.** Client-side `MediaRecorder` is NOT a
divergence: upstream takes that same branch whenever no MTX stream exists (`startRecFromMuser`, byte
2524230).

**Note for whoever stands the host up: the hooks are `runOnAvailable`/`runOnUnavailable`.**
`runOnReady`/`runOnNotReady` were renamed and no longer exist (mediamtx.org/docs/usage/hooks).

**FOUR CONTROLS IN THE STREAM TAB ARE INERT UPSTREAM — do not "finish" any of them by guessing.**
Each is pinned by a test in `stream-tabs-contract.test.ts`: the forced eye badge (`forcedScreenMTXID`,
2 occurrences in the whole bundle, one of them `=""`, no writer); the lock badge (`lockedScreenIDMTX`,
4 occurrences, three reads, no writer); "Lock Screen"
(`toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")}`); and "Bring everyone here",
which sends a real `focusOnScreen` that **no recipient can resolve**, because every receiver scans
`mediaService.screenSharingUsers` and never `mtxHandlerService.mtxStreams`. They render because a
viewer of the reference sees them, and they are prop-driven so the branches stay reachable if the
protocol is ever captured. **The badge reads `lockedScreenIDMTX` while the menu label reads
`lockedScreenID` — an upstream asymmetry, reproduced deliberately and guarded in both directions,
because collapsing the two props is the obvious tidy-up and is invisible by eye.**

**Known limitation, inherited and not introduced.** `publishToRoom` is process-local, so a hook
reaches only one instance's subscribers, and the room defaults to the Vercel adapter. Every existing
realtime feature has this, `focusOnScreen` included. The reconcile is what keeps the stream list
correct regardless; the durable fix is PostgreSQL `room_events`, already listened on by
`services/api`.

---

## The register, and the five gaps that are still open

`docs/reference/evidence-gap-register.md` is the tracker for every gap found in the full read of
`apps/controller/evidence-dumps/`. **That file owns their status — this section is the index to it.**
Do not record a gap's status in both places; one of them will go stale. It covers the CONTROLLER
ONLY: `page.manageSession.html`, `page.welcome.html` and their siblings, and says nothing whatever
about `apps/room`.

The room's own gap register is `docs/reference/room-component-gap-register.md`, and the work queue
that goes with it is **`todo-next.md`** — deliberately a separate file, because this one is being
edited concurrently by the decomposition work and two sessions writing one TODO is how a merge
conflict eats a finding. **Read `todo-next.md`'s own header before treating it as a build spec: it
covers 2 of 42 room surfaces, about 2.7% of the lines.** `NEW-TODO.md` covers Part 1 flaws in the
ORIGINAL that we deliberately do not reproduce.

As of 2026-08-27: **66 CLOSED, 6 OPEN, 15 parked/won't-fix, 87 total.**

**Recounted 2026-08-27 with the verifier's own parser after that parser was corrected, and the
numbers MOVED — this is the resolution of the row that used to sit at AI, not a change to the
register.** The parser scanned every cell of a row for a status word, so prose in the detail cell
voted: rows that narrate their own history (`already closed`, `Status stays OPEN`) were counted by
the sentence rather than by the status column. It now reads the status CELL, located from each
table's own header, and joins the trailing cells back where unescaped pipes inside code spans had
split one status into several. Three rows moved — `T1-3` to won't-fix, `T2-22` to closed, `T5-25` to
open — and each was read in full before the change was kept.

**The corrected count agrees exactly with reading the status column by eye, 66/6/15, which is what
the old row recorded as the disagreement.** Two independent methods agreeing is the evidence.

**The six open rows are `T5-16`, `T5-17`, `T5-18`, `T5-20`, `T5-24` and `T5-25`** — B 2 + C 3 + D 1.
`T5-25` is the one that used to be counted closed: its ENDPOINT is built with ten green tests, and
its DISPLAY block is blocked on the same owner sentence as `T5-24`, so the row is open and §B now
names both.

**Everything closable by READING is closed.** The five that remain need something no source file can
give, and each says WHO does the next step and WHAT it is.

### B. Two need one sentence from the owner, naming the field.

Blocked by a credential guard whose bar is `[named + specifics]`. A general "match the original" does
not clear it, and this exact edit was explicitly reverted earlier on request. **Four attempts were
refused; do not attempt a fifth without the sentence.**

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

- **T5-24** — `+page.server.ts`, the `wordpressShortcode` line: `key=''` becomes
  `key='${String(settings.ssoJWTSecret ?? '')}'`. Reference `page.manageSession.html:782`. **Why it
  matters:** the shortcode is COPIED into WordPress, where the plugin signs the SSO handoff with that
  key. Empty means every handoff fails, and it renders identically to a working one.
- **T5-25** is the same sentence and is OPEN, settled 2026-08-27. Its ENDPOINT is built with ten
  green tests — that part was never the gap. What remains is the DISPLAY block at
  `page.manageSession.html:1138-1142`, the readonly `input#pairURLLink` whose value embeds
  `pairSecretKey` in copyable text, and it is blocked by the same credential guard as `T5-24`. The
  register said OPEN, this file said CLOSED and the parser said CLOSED; the register is the tracker
  and the corrected parser now agrees with it.

### C. Three are NOT CAPTURED YET. Each needs one targeted collection script.

**These are not blocked on infrastructure.** The original application has all of them, and this
repository's rule for anything missing is not to park it but to **write a browser-console script that
fetches it** — `scripts/ptr-collect.js` is the working reference implementation. Each is blocked on
**one capture run against the live original**, and what each script has to bring back is already
known.

| item | the script must capture |
| --- | --- |
| **T5-16 Recordings** | the response behind `recs` — `vidPath`, `contentType`, `name`, `created`, and `length` in MILLISECONDS (the page renders `length/60000` to two decimals). **The field contract is in fact already evidenced** at `apps/controller/evidence-dumps/TIER1-fetched/api-post-routes.md:403-422`; what is genuinely missing is a PRODUCER, because this product stores no recordings server-side — which makes this row depend on the same MediaMTX decision as rows X and AC |
| **T5-17 Avatars** | the avatar set behind `avatars`, plus the request `selectAvatar(avatar)` posts — URL, method and body |
| **T5-20 `recorded_max_capacity`** | what actually WRITES it. Column, reader and reset all exist (controller migration `0011-recorded-max-capacity.js`); the missing half is the live-occupancy signal the controller never receives. Capture whether the original pushes occupancy on its command channel and under what name. **Do not substitute the roster size** — the number who ever registered is not the number ever simultaneously present |

Rules for those scripts, from `~/CLAUDE.md` §3: one self-contained `.js` file pasted into the console
on the LIVE app; it detects whether the session is a member or an admin and records what that role
can and cannot reach; it drives itself to the target and downloads a JSON with no follow-up step; it
captures markup, computed styles AND the matching stylesheet rules; it records honest gaps when a
target never rendered; and it checks a hard denylist before every click — **never** delete, upload,
play, stop, send, save or submit.

**CHECKED — the two live collections on disk do NOT cover these.**
`~/Desktop/new-room/collect-manage-2026-08-08T20-16-32-687Z.json` and
`~/Desktop/new-room/scripts/collect-account-2026-08-08T20-19-23-396Z.json` (note the two live in
different directories; both are real captures of `protradingroom.com`, all six manage tabs twice
each) were read end to end. `selectAvatar`, `vidPath`, `recs`, `maxCapacity` and `recorded_max`:
**zero occurrences in either file.** They are `manage` and `welcome` only.

**Do NOT build the features from guesses.** Inventing a data source is forbidden. Capture first, then
build from what came back.

### D. One is a decision about a control the REFERENCE ships broken.

- **T5-18 — the recordings "Share" button has no handler of any kind.** It renders and does nothing.
  This repository forbids shipping a control whose only effect is its own presence, so a faithful
  rebuild has to choose. **Recommendation: omit it and record why**, the same call already taken for
  the Stripe Details link. Moot until T5-16 exists — a dependency the register's own row does not
  carry, which is why this bullet survives alongside it.

---

## Not an evidence gap — missing work, recorded so it is not lost

| # | what | severity |
| --- | --- | --- |
| **W** | **ONE control reports success and sends nothing: `admin-notes-password`. Measured 2026-08-29, and now machine-checked** — row 4's census next door is asserted by `user-action-disposition-contract.test.ts`, so this row states the property once and points there rather than carrying its own count. **The live defect.** `admin-notes-password` (`user-actions.svelte.ts:630-640`): the prompt's `onconfirm` takes **no parameter**, so the typed password is never received — not merely uncompared — and the handler sets `Wrong password!` unconditionally. The setting is `needPasswordForUserNotes`; see row 2. **`EXACT_ALERTS` itself is no longer a defect list.** It holds two keys and neither lies: `save-permissions` announces a real write to `roomUsers.permissionsJson` through `permissions.remote.ts`, and `restart-audio` announces a real `restartAudio` command. The reference raises both alerts too, so the table is finally what its docblock always claimed — "the fixed alert for an action". **Eleven of the twelve this row once named are DONE**, recorded in `CHANGELOG.md` rather than struck through here: `kick` and `kick-ban` (both send, and the ban is durable), `kick-duplicates` (both arms), `session-send-users-url` and `session-send-sales-image` (senders and receivers ship), `unmute-chat`, `mute-chat-24`, `force-reload`, `save-permissions`, and — 2026-08-27 — `mute-chat-indefinitely`, whose door was `internal/room-mute/[code]` with `muteChatIndefinitely` in `chat-mute.remote.ts` as the room's half. `session-refresh-roster` and `session-soft-reset` were listed beside them as a milder sub-family and are also done — both are real server commands (`session-commands.remote.ts`), which is the correction row 3 records: the defect table had ruled they needed no protocol at all, decided without locating the senders, and both were in the capture. **`session-save-close-message` and its sibling are DONE, 2026-08-27** — `room_state.closed_message`, a `saveCloseMessage` command, an editor in `CloseSessionPane.svelte` where the literal string `undefined` used to render, and a READER: `closedRoomMessage` is what a closed room now turns a member away with. Neither action name is dispatched any more — an action STRING cannot carry a payload, which is why they could never have been fixed in place. **Severity is about the lie, not the absence:** a presenter believes the mute landed and the member keeps posting. **Superseded, kept because the arithmetic is the lesson:** this row said seven, then nine, then twelve, then three, then two, *"and each was arithmetic over a previous number rather than a read"*. On 2026-08-29 it was carrying **four numbers for one property in one cell** — a "TWO controls" headline, "`EXACT_ALERTS` holds **three** keys today", "now holds two keys and neither is a liar", and a "**The two liars left**" clause that then listed one. Successive edits had layered without removing what they superseded. That is what a hand-maintained count does, and it is why row 4's census is gated and this row now defers to it | **HIGH — one control still reports success and does nothing** |
| **AE** | **The `+page.svelte` decomposition — the plan and its record now live in `apps/room/docs/PHASE-5-DECOMPOSITION.md`, and this row is the pointer, not the narrative.** Phases 1–4 are complete and Phase 5 has run slices 0–27. **THIS ROW DELIBERATELY STATES NO LINE COUNTS, AND THAT IS THE CORRECTION RATHER THAN AN OMISSION.** The previous version carried `9,605 / 8,627 / 978` and was wrong by 3.3× within a day; a draft of this rewrite carried today's figures and four of them were wrong within the hour, because another session is decomposing these files continuously. A number that is re-measured every time the suite runs does not belong in prose that is edited by hand once a week. **`apps/room/src/lib/source-size-contract.test.ts` is the authority** — the `CEILINGS` array in that file, over the cases it generates (**44 entries / 201 cases as of 2026-08-23**, against the 37/181 this row carried; the figures are restated only to show the drift, and the row's own principle applies to them too — read them from the file, not from here), ceilings that only ever go DOWN, plus a staleness check so a ceiling cannot sit far above the real count and silently license growing back. Read a ceiling from there; do not read a line count from here. **WHAT WAS LEFT IS NOW DONE. (1) A BROWSER RUNS IN CI — corrected 2026-08-29.** This row said *"no automated browser check runs in CI — `.github/workflows/` holds `backend-quality.yml`, `quality.yml` and `smoke.yml`, and none drives a browser, so a regression is caught by a person"*. Measured by parsing `quality.yml`: it now holds **two** browser jobs, `controller-e2e` and `room-e2e`, each running `playwright install --with-deps chromium` then `pnpm run test:e2e`. The room's own job was added on 2026-08-28 and found two shipping defects on its first run — a `ReferenceError` answering 500 on every room render for eleven days, and a duplicate `<title>` that meant the tab never showed the room's name. See `CHANGELOG.md`; (2) **component-render coverage was MIS-STATED here and is corrected 2026-08-17.** This row used to say "five of the six extracted panes have no mount test… `PrivateChatPanel.test.ts` is still the only one". Measured again 2026-08-23: **nineteen** test files render a component — **eight** with client `mount` (`PrivateChatPanel`, `FilesPane`, `PresenterMuteRows`, `RoomSidebar`, `AlertChatArea`, plus the clsx, `BindThisProbe` and `AttachDepsProbe` fixtures) and **eleven** with `render` from `svelte/server` (`RoomMessage`, `NotesPane`, `NoteEditor`, `NoteVersionHistory`, `PostAlert`, `SpeechRecoOverlay`, `StreamTabs`, `SwingAlerts`, `DayTradeAlerts`, plus `PresentationArea` via `main-tab-strip-contract` and `AlertChatArea` via `composer-authority-contract`). **Only two of the eleven parse with `parse5`** (`RoomMessage`, `PostAlert`); the rest assert on the HTML string, so "parsed via parse5" was over-general even at nine. An established SSR-render pattern existed the whole time and this row did not mention it, which sent at least one session hunting a gap that was half-filled. **The two forms are not interchangeable, and that was tested rather than assumed:** SSR emits the structure but NOT anything an `{@attach}` sets, because attachments are client-only — rendering `PresenterMuteRows` server-side yields the row ids and no `checked`. So `label.control`, `input.checked` and `click()` need `mount`; structure and attributes do not. **`RoomNavbar` was the last one and it is COVERED, 2026-08-28** — `room-navbar-contract.test.ts`, SSR
render, asserting that the six broadcast controls behind the single `{#if isPresenter}` are ABSENT for
a member and PRESENT for a presenter, with a positive control so the absence assertions cannot pass
against a render that produced nothing. Negative control seen RED on three cases by widening that gate
to `{#if true}`. Nothing remains of this row. Its FIRST item — the missing browser check — was closed on 2026-08-28 and this row is corrected 2026-08-29; its second was corrected on 2026-08-17 and again on 2026-08-28 when `RoomNavbar` gained its mount test. (was:) Corrected 2026-08-23 — three of the four named here are now covered: `RoomSidebar` and `AlertChatArea` by client `mount` in their own `.svelte.test.ts` files, and `PresentationArea` by SSR `render` inside `main-tab-strip-contract.test.ts`, which is why a scan by FILENAME misses it. **The sentence that used to stand here — that `AlertChatArea` cannot be tested because jsdom reports `scrollHeight`/`offsetHeight` as `0`, "a real limit rather than a backlog item" — is DELETED because the repository refuted it.** `AlertChatArea.svelte.test.ts:8-25` records the retraction in its own words: the follow behaviour "was written down as blocked on an instrument limit" and "the 'needs Playwright' note was pessimism". A tracker that declares a closed gap impossible is worse than one that omits it. (was:) **five of the six extracted panes have no mount test.** Phase 2 named this its real deliverable — "a pane can be MOUNTED… each remaining component gets the same treatment" — and `PrivateChatPanel.test.ts` is still the only one, so `RoomSidebar`, `RoomNavbar`, `AlertChatArea`, `PresentationArea` and `FilesPane` are asserted on as source text. jsdom has no layout, so even those cannot prove a panel is draggable or positioned where the capture puts it. **THE RULE THE WHOLE PHASE EARNED, which outlives the line counts: migrate the tests with the code, and re-point every `not.toContain` at the file that now owns the thing.** A positive assertion fails loudly when a region moves; a negative one starts passing for the wrong reason. That has now happened four times in this repository — `exactAlerts`, `chat-mode-contract.test.ts`, and twice in `screen-volume-contract.test.ts` | **MEDIUM — the standard is being met; the verification is not** |
| **AG** | **Seventeen form actions are still reached from JavaScript, through dynamic dispatchers — and it is THREE dispatchers now, not four.** `remote-call-sites-contract.test.ts:140` records the merge: the two trade-alert dispatchers became one, and the union moved with it. The three: `submitPollAction` (`lib/room/modals.svelte.ts:158`) → `savePoll`, `deleteSavedPoll`, `sendPoll`, `sendPollAnswer`, `pollDone`; `submitMutation` (`lib/room/notes.svelte.ts:89`, renamed from `submitNoteMutation`) → the six session-note commands; and the merged swing/day-trade dispatcher (`lib/room/trade-alerts.svelte.ts`, `async submit(`) → the six alert commands. **The arithmetic, so nobody re-derives it wrongly: `+page.server.ts` exports EIGHTEEN actions — the seventeen above, plus `logout`, which is a real progressive-enhancement form POST and not a JS dispatcher. It read NINETEEN until 2026-08-27, counting `forceReload`, which had no caller at all; that action was deleted when the command shipped, so the count moved with it and is re-measured here rather than inherited.** **Why this is the WORST form of the defect and not a lesser one:** a literal `'?/savePoll'` is at least greppable; an interpolated name is assembled at runtime from a union type, so nothing — not the compiler, not a search, not the build — connects it to the action it reaches. Delete the action and the call site keeps compiling and starts doing nothing, which is exactly what `presenterCommand` did for three commits. **GUARDED, NOT FIXED:** the contract test asserts the dispatchers are exactly N (counted from the code, not trusted from its own table), that the list only ever shrinks, and that **every action name each union can produce still exists** — negative-controlled by renaming `savePoll` and watching it go red. So the class cannot recur silently; the work is simply not done. **Converting them follows the settled rule:** by FEATURE, split on the GATE, with each behavioural test rewritten onto `callRemote` rather than re-pointed as text | **MEDIUM — guarded, so it cannot rot silently; still seventeen endpoints named by strings** |

---

## Not gaps — decisions taken deliberately

Recorded so nobody "fixes" them back. **This section stays in this file even though it is not work**,
and 2026-08-17 is why: the navbar bullet below turned out to be the only surviving record of a rule
whose test had gone vacuous. A decision recorded only in a test is a decision that disappears the day
the test stops asserting it.

- **Popper's collision pass is not reproduced, and does not need to be.** `RI` hands flip
  `fallbackPlacements: r` AFTER `r.shift()` has taken the primary, so for any fixed placement that
  list is empty — and `[] || …` is `[]` in JavaScript, so flip is handed no alternatives and never
  moves the bubble. `preventOverflow` is registered upstream with `fn: function(){}`, a no-op. Only
  `auto` has alternatives, and no tooltip in the room renders with `auto`: the GIF control is
  `triggers="manual"` and the emoji host carries `ngbPopover` with no `ngbTooltip`. Pinned by
  `ngb-tooltip-placements-contract.test.ts`.

- **The screen `<video>` has no `controls` attribute, and reproducing the binding would be wrong.**
  The reference binds `z('controls', o.showControls)` (`app-screenshare-view.compiled.js:335`), but
  `showControls` is initialised `!1` (`:15`) and its ONLY writer is a click handler on that same
  `<video>` (`:302-305`) — an element the same component's own stylesheet gives
  `pointer-events: none` (`:357`). The click can never land, so the attribute is false for the life
  of the component and the native control bar never appears upstream. Omitting it reproduces the
  observable behaviour exactly; porting the binding and the click would give this room a control the
  original does not have. Pinned by `screen-volume-contract.test.ts`.

- **The overlay's per-presenter rows use a DIFFERENT id prefix from the navbar's.** Both dropdowns
  build their row ids identically upstream — `ei('name'|'id'|'for', 'talkingPresenter', i,
  '-donot-disturb')` at `app-presentationarea.render-helpers.js:370-374` and
  `app-room.render-helpers.js:1087-1091` — and in viewer-only mode BOTH dropdowns are in the
  document at once, because the navbar's is ungated and the overlay's trigger renders only in that
  mode. So upstream every row id appears twice and each `<label for>` in the overlay resolves to the
  navbar's checkbox instead of its own: clicking "Mute Trendy Jon" in the overlay would toggle the
  navbar's copy. The navbar keeps the captured ids exactly (`RoomNavbar.svelte:763` passes no
  `idPrefix`, so `PresenterMuteRows.svelte:71` supplies the default); the overlay takes
  `screenTalkingPresenter{i}-donot-disturb` (`ScreenVolumeControl.svelte:191`). Same rule as the
  `aria-selected` and `tabindex` divergences in `ScreenTabs.svelte` — a captured value is reproduced
  unless reproducing it locks a real person out — and unlike the duplicate `id="dropdownMenuScreen"`,
  which costs a reader nothing and is kept. Pinned by `screen-volume-contract.test.ts`, **whose
  navbar half was vacuous from 2026-08-15 to 2026-08-17 — see row AH.**

- **New Room is always visible.** The reference hides it behind five clicks on "Sessions"
  (`ng-show="showNewRoom>=5"`). Ours does not, by the owner's decision — an account at zero rooms
  otherwise has no visible way back. Pinned by `account-new-room-reveal.test.ts`.
- **A save shows a toast.** The reference appears to show nothing. A silent success is
  indistinguishable from a dead control, which is the exact complaint that produced this rule.
- **Failures render.** Both the account page and the manage page had `fail()` paths that rendered
  nothing — 22 and 43 respectively. Pinned by `account-form-errors.test.ts` and
  `manage-form-errors.test.ts`.
- **The editor toolbar stays enabled.**
- **Marketplace is not a tab.** It is not in the captured strip; it stays a routable pane reached
  from its own buttons so they are not dead controls. Pinned by `manage-tab-strip.test.ts:76-81`.
- **AngularJS directives are not reproduced** — `ng-click`, `ng-repeat`, `ta-button`,
  `dropdown="dropdown"`. They render nothing. `data-menu-control` replaces the last of these because
  the outside-click closer needs a hook and TypeScript rejects `dropdown` on a div; pinned by
  `apps/controller/src/lib/manage-menu-stays-open.test.ts:41`, whose docstring at `:10-21` states the
  same reasoning. **An earlier draft of this line cited `manage-menu-scope.test.ts`, a file that does
  not exist** — a plausible-sounding filename is the exact defect this repository forbids, and it was
  caught by opening the path rather than by trusting the name.
