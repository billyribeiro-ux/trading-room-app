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

**Two smaller things fall out of the same eviction, and both are real work:**

- **30 npm script entries in `apps/room/package.json` point at untracked files** — all 30, verified
  by `git ls-files --error-unmatch` on each. Anybody cloning the repository gets a `package.json`
  whose scripts cannot run.
- **`apps/room/scripts/audit-feature-coverage.mjs` cannot be run by a fresh clone** — untracked, and
  present only on this machine. Corrected 2026-08-23: it is a **31st** untracked script, NOT one of
  the 30 above; no `package.json` script names it, so "the other 29" was wrong twice over. It matters
  more than any of them because this file's own enumeration depends on it — see *What the enumeration
  says* below.

**Three baseline lines are stale in the safe direction, recorded so nobody re-reports them as a leak.**
(It read "Two" until 2026-08-23 while naming three files in the same sentence.)
`apps/room/ops/privacy-baseline.txt:121-123` still baselines `rawEmail` findings in
`alert-delete-e2e.mjs`, `audit-clean-app-room.mjs` and `media-screenshare-e2e.mjs`. Those addresses
were replaced by `PTR_*_EMAIL` environment reads; the detector finds zero today. The verifier prints
them under "baselined finding(s) are gone — run `--update` to shrink" rather than failing.

---

## What the CI gates left behind

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
| 1 | **Retire `ptr_clone_app`** — a forward-only migration that drops the baseline role | Deliberately deferred until the cutover is proven in a real deployment, not just on scratch clusters. Since 2026-08-15 the role is named by no policy — `0009_provision_tradingroom_app.sql:199-258` retargets every policy onto `tradingroom_app` and RAISEs `RLS retarget incomplete` if a residual remains — and it reads zero rows from all 22 tenant tables. **It is inert but still holds object privileges, and they are granted at `0001_baseline.sql:1821-1938` (22 table-wide grants plus the function grants), `0006_restrict_runtime_object_privileges.sql:69-107` and `0007_saved_polls.sql:134` — and, added
2026-08-23 after re-reading every migration for `GRANT … ptr_clone_app`, **`0003_room_events.sql:106`
and `0004_list_memberships.sql:55`**, neither of which this row named. A retirement migration that
misses a grant site fails at the worst possible moment.** An earlier draft of this row cited `0005:85`; that line is a `TO ptr_clone_app` clause inside a `CREATE POLICY`, and `0005` contains **no `GRANT` at all** — a policy target is not a privilege, and citing one as the other would send whoever writes the migration to the wrong file. The migration must REFUSE rather than `CASCADE`: a cascade silently drops whatever still depends on it. `0001_baseline.sql` re-creates the role on every new database, so retirement cannot be a rename and cannot assume absence. |
| 2 | **Owner role and database name `ptr_clone` → `tradingroom`** | Its own change, deliberately not bundled. Different mechanism (ownership and `CREATE DATABASE`, not policy membership) and different blast radius: `EXPECTED_MIGRATOR_ROLE`, the preflight identity check, every `MIGRATE_DATABASE_URL`, and the provisioning scripts. Bundling would mean one failure obscures the other. Same shape as the role: add, prove, cut over, retire — **never rename**, which is the mistake the withdrawn `0009_rename_runtime_roles` made. |
| 3 | **Prove the chain against a database that predates `0009`** | Every verification so far builds the cluster from scratch. The retarget is written to be idempotent and self-healing, and was shown to repair a hand-widened policy, but no database with real history has run it. |

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

## What the enumeration says

Nothing had ever ENUMERATED the reference's features, so "everything buildable is built" was for a
long time a statement about what somebody had thought to look for — while two whole presentation-area
tabs sat in the captured bundle unbuilt. `apps/room/scripts/audit-feature-coverage.mjs` now asks the
bundle directly, and since it was written it has found, three separate times, work nobody knew
existed. **Run it after every feature lands** — noting that it is untracked and reachable only on the
author's machine (it is NOT one of the 30 `package.json` entries; no script names it), which is why
the counts below are behind.

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

**The action is to re-run `audit-feature-coverage.mjs` and let the document restate its own total** —
which needs the script tracked first, tying this row to the eviction row above. **And when it is
re-run, its verdicts need three buckets, not one** — see *What "not built" actually means here*
below.

**ITS LINE POINTERS ARE STALE REPO-WIDE.** The document's `ours` column was written before the
`apps/room` decomposition. Verified drifts: the videoplayer row cites `+page.svelte:11294-11316` for
a file that is now under 3,000 lines; the `restoreMobileAppTokens` row cites
`ModalHost.svelte:5327-5362`, which is now the alerts advanced-search modal. **A reader who follows
one of its line numbers, finds unrelated code, and concludes the feature is gone will be wrong.**
Cite symbols and verbatim strings there, not line numbers — strings survive refactors.

**Nothing that is not built gets parked.** An earlier version of that table carried a fifth bucket —
"unclear, needs a product decision" — which read as resolved and was not. A pending decision is
outstanding work; the only thing that removes a row is building it or proving we already did.

### What "not built" actually means here — four kinds, and only one of them is harmless

Established 2026-08-17 by reading each control end to end. **This distinction is the single most
useful thing the audit produced**, because the flat label "NOT BUILT" reads as *nothing is there* and
for most of these the truth is *it is there, it is live, and it is lying*. Severity runs top to
bottom.

**1. LYING CONTROLS — they report success and send nothing.** The worst kind, because the presenter
believes the action landed. Row W holds twelve; `remoteRestartAudio` is the same shape
(`ModalHost.svelte:2300` → `'restart-audio'` → the `EXACT_ALERTS` toast). **`focusOnSessionNote` WAS in this list and is FIXED, 2026-08-23.** Both controls — "Bring everyone
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
`getDebugLog`: `ModalHost.svelte:2306` dispatches `onUserAction('debug-log', …)` and that string
occurs **exactly once in the whole source**, at the call site — no branch in `handle()`, no entry in
`EXACT_ALERTS`. Its modal at `:3844` is unreachable (nothing ever sets `name === 'debug'`) and
nothing ever fills `debugLogModalTxt`. `setUserProfilePic` ("Upload Profile Picture",
`ModalHost.svelte:2376-2381`) is the same.

**IT IS ELEVEN, NOT TWO — AND NINE HAD NEVER BEEN RECORDED ANYWHERE.** Established 2026-08-23 by
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
`doChatLogSearch`: the input is ported verbatim down to the dangling `aria-describedby`
(`AlertChatArea.svelte:580-599`), but `alerts.svelte.ts:271-275` filters `item.body` and
`item.senderName` locally with `includes()`. Upstream it is a SERVER search. Search for an old
message and you get nothing, with no indication the server was never asked.

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
noticed — including the two at the bottom, which were spoken before they were written down.

| # | open item | needs |
| --- | --- | --- |
| 1 | **`forceReload` — DONE 2026-08-23.** Was blocked on a ceiling; resolved by EXTRACTION as the contract prescribes, not by raising a number. `RoomSessionControl` took eleven session action names out of `RoomUserActions` (749 → 708), and `create-room` came down by collapsing a `commands` object that only needed property shorthand once a pointless import alias went. Both under their original ceilings | — |
| 2 | **`forceReload` — DONE 2026-08-23.** Was the confirmed divergence: ours called `location.reload()` outright, so a member mid-sentence lost what they were typing with no notice. Both capture regions were read, not searched — byte 995901 `case"forceReload":e.disconnect(),e.appEventBus.emit("forceReload")` and byte 2597102 `bootbox.alert("You need to reload this page to continue",()=>{window.location.reload()})`. Now: the stream calls `source.close()`, then a `forceReloadRequested` receiver, and `create-room` raises the captured alert whose dismissal reloads. **The ceiling blocker was cleared by EXTRACTION first** — the join/leave announcement left `events.svelte.ts` for `#lib/arrival-announcement.ts` (903 → 900, ceiling LOWERED), and only `dialogs.svelte.ts` needed a raise, taken as a decision with the owner. `RoomDialogs` gained `alertThen`/`dismissAlert`; the stale-callback trap is negative-controlled | — |
| 3 | **`askQuestion` has no mute gate of either kind** (`alert-questions.remote.ts:56`). Whether a CHAT mute should silence Q&A has no evidence either way in anything read | a capture script (`~/CLAUDE.md` §3) |
| 4 | **`kick-duplicates` reports a hardcoded negative.** The reference's own implementation was read, both arms confirmed; its positive arm needs a kick this room cannot perform | a capture script, then the wire |
| 5 | **`save-permissions`** — the controller already writes `roomUsers.permissionsJson` for the same five checkboxes (`server/rooms.ts:90-114`). The room has no write path to the controller | a new internal endpoint; every piece it calls exists |
| 6 | **`doChatLogSearch`** filters the newest 50 rows locally with `includes()` where upstream is a SERVER search. Silent wrong answers | a search endpoint, or make the limit visible |
| 7 | **`admin-notes-password`** — the typed value IS delivered and the handler discards it, so the recorded mechanism was half wrong | a comparison target that exists |
| 8 | **`session-refresh-roster` and `session-soft-reset` promise a server command and only refetch locally.** Now in `session-control.svelte.ts:74-79` and `:82-89`. **The wire is CAPTURED and the names are exact** (read 2026-08-23): byte 2169139 is `refreshRoster(){sendServerAdminCommand("refreshRoster", null), bootbox.alert("Command send OK. Please allow 1/2 minute for old entries to get deleted from the list")}` and byte 2167060 is `sendServerAdminCommand("softResetSession", {}), this.done(), bootbox.alert("Soft reset request sent...")`. Our alerts are those strings verbatim — the wording is faithful and the FACT is not, because nothing is sent. **What is missing is the SERVER half, and it is not in the room bundle**: the room only shows the send, so what "old entries get deleted" actually does is uncaptured. So this is NOT the pure honesty fix it was filed as. Two routes, and it is a product decision rather than a reading: implement `refreshRoster`/`softResetSession` server-side (needs behaviour nobody has captured), or diverge from the captured string so it stops claiming a send — for which there is precedent under *"Not gaps — decisions taken deliberately"*, where a save shows a toast the reference does not, because a silent success is indistinguishable from a dead control | an owner decision; both wire names now known |
| 9 | **Nine dead controls** remain inert, gated by `user-action-disposition-contract.test.ts` with a reason each. The gate stops a tenth appearing; it does not build the nine | the captured wire for each |
| 10 | **`RoomNavbar` has neither a mount nor an SSR render test**, and **no automated browser check runs in CI** | both are work, not blockers |
| 11 | **The `privCmdsIn` channel carries SIX commands this room does not handle.** Found by READING bytes 995300-996700 end to end while confirming `forceReload`, rather than by searching for it — the whole switch was in the same region. Upstream: `forceReload` ✓, `unmuteChat` ✓, and then `remoteRestartAudio`, `getDebugLog` / `debugLogResp` (a pair — a presenter asks, the member replies with `V1`, its rolling client log), `kickUser` (`emit("kickPage", xe.msg), e.disconnect()` — note the order is the OPPOSITE of `forceReload`'s), `muteChat` (the receiver half of a mute this room enforces server-side instead), and `userInfo`. Each was checked against `apps/room/src` before being written down: `remoteRestartAudio` appears nowhere, and the others appear only in unrelated contexts. **Not invented into existence** — what each SHOULD do beyond the emit is not in the room bundle | a capture per command, then the wire |
| 12 | **Three more `bootbox.alert(msg, callback)` receivers exist upstream and none is wired here.** Same region, bytes 2596600-2597200, read end to end: the room reset — *"The room is being reset by an administrator. Click OK to continue..."* → reload; `openSession` — *"The session is now open, click here to reload the page and enter"* → reload; and `permsChangeReload` — *"An admin has changed your room permissions, you need to reload this page to continue"* → navigates to `${apiROOT}/sessions/v2/reAuthSessionTok?sessionID=…&tok=…&r=1` rather than reloading. **The PRIMITIVE they need now exists** (`RoomDialogs.alertThen`, shipped with `forceReload`), so each is a receiver plus a sender, not new plumbing. `permsChangeReload` is the odd one — it re-mints a session token against an endpoint this room does not have | the sender for each; the dialog half is built |

### The six defects that are REAL, FIXABLE, and not yet done — investigated 2026-08-23

Each was traced end to end by reading, and each verdict says what it would cost. **None of them is
blocked on a decision or on hardware**; they are simply not built yet. Ordered by severity.

| defect | verdict | what is missing |
| --- | --- | --- |
| **`save-permissions`** (HIGH) | needs new server code | The controller already writes `roomUsers.permissionsJson` for the SAME five checkboxes (`server/rooms.ts:90-114`). The room has no write path to the controller, so this needs a new internal endpoint — every piece it would call exists |
| **`session-refresh-roster` / `session-soft-reset`** (MEDIUM) | **uses only existing code** | Both raise an alert asserting a server command was sent; neither sends anything, and the local refetch they do instead has no effect on what the message promises. The honest fix needs no protocol at all — correct the message |
| **`doChatLogSearch`** (MEDIUM) | needs new server code | The input never reaches the server, and the set it filters is only the newest 50 rows. Either a real search endpoint, or make the limit VISIBLE — a silent wrong answer is worse than an honest one |
| **`admin-notes-password`** (LOW) | needs new server code | Three stacked causes. The typed value IS delivered and the handler throws it away, so the TODO's stated mechanism was only half right |
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
| Alert Scheduler | same | **Blocker restated 2026-08-17, because the old wording was wrong about which half is missing.** The entitlement IS captured and IS in the schema — `hasAlertScheduler`, `apps/controller/src/lib/room-settings-schema.ts:175` — but it is `wired: false`, so nothing in the room reads it. **THE STORAGE IS ALREADY BUILT AND SHIPPED TOO, and an earlier draft of this row read as though nothing existed:** `alerts.scheduled_for timestamp with time zone` at `services/api/migrations/0001_baseline.sql:165`, with a dedicated index at `:990` (`alerts_tenant_room_scheduled_idx` on `enterprise_id, room_id, scheduled_for, id`) — a column and an index nothing writes. What is genuinely absent is the scheduler process that would read that index and fire, plus the three wire commands. So this is smaller than it looks: two of the four pieces exist |
| Benzinga — **const-table pass DONE, markup verified; two honest gaps remain** | `NEW-TODO.md` §2.2 | The decode pass found nothing to change; all five component consts at bundle byte 2,533,190 already match. **Still missing, and neither is a port:** the reference's DEFAULT url is its own host (`ptrv3.protradingroom.com/public/bz/index.html`), so ours renders nothing unless `altBenzingaLinkURL` is set; and the default `assets/images/benzinga-logo.png` is **verified absent from this repository**, so the icon form always stands in. Note the markup now lives in `apps/room/src/lib/components/RoomSidebar.svelte:327-349`, not in `+page.svelte` |

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

As of 2026-08-15 20:52 EDT: **68 CLOSED, 5 OPEN, 14 parked/won't-fix, 87 total.**

Recounted 2026-08-17 with the verifier's own parser and unchanged. **The five open rows are
`T5-16`, `T5-17`, `T5-18`, `T5-20` and `T5-24`** — which is what B 1 + C 3 + D 1 sums to. Earlier
drafts of this section said "six"; five is right, and `T5-27` was listed twice, as closed and as
open, until 2026-08-17.

**Everything closable by READING is closed.** The five that remain need something no source file can
give, and each says WHO does the next step and WHAT it is.

### B. One needs one sentence from the owner, naming the field.

Blocked by a credential guard whose bar is `[named + specifics]`. A general "match the original" does
not clear it, and this exact edit was explicitly reverted earlier on request. **Four attempts were
refused; do not attempt a fifth without the sentence.**

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

- **T5-24** — `+page.server.ts`, the `wordpressShortcode` line: `key=''` becomes
  `key='${String(settings.ssoJWTSecret ?? '')}'`. Reference `page.manageSession.html:782`. **Why it
  matters:** the shortcode is COPIED into WordPress, where the plugin signs the SSO handoff with that
  key. Empty means every handoff fails, and it renders identically to a working one.
- **T5-25** is the same sentence and is CLOSED as a gap in its own right — the endpoint exists with
  ten green tests. What remains is only the DISPLAY block at `page.manageSession.html:1138-1142`.
  **Its status word disagrees between the register and this file; the register is the tracker, so
  settle it there rather than here.**

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
| **W** | **The user-info / session-control modals raise the reference's exact alert and send nothing — a family, not a one-off, and the 2026-08-17 audit found it WORSE than this row claimed.** The handler is `RoomUserActions.handle` at `apps/room/src/lib/room/user-actions.svelte.ts:480-728` (it was `handleUserAction` in `+page.svelte` when this row was written); the fixed-alert table is `EXACT_ALERTS` at `apps/room/src/lib/user-action-intent.ts:71-77`; the buttons are in `ModalHost.svelte`, wired at `RoomOverlays.svelte:562` (the `onUserAction` prop on the `<ModalHost>` opening at `:488`; this read `:255` until 2026-08-23 and has now drifted three times — cite the symbol, not the line). **TWELVE controls report success and send nothing.** Counted 2026-08-17 by reading `handle()` from `:480` to `:728` and every key of `EXACT_ALERTS`, because this row said "seven" and an audit pass said "nine" and both were arithmetic rather than a read: `kick` and `kick-ban` (`:669-680`, prompt then `User kicked OK`, and the typed message is discarded); `kick-duplicates` (`:682-693`, a hard-coded `No duplicates found for …`, so it reports "none" even when duplicates exist — the reference has BOTH arms and only the negative was ported); `admin-notes-password` (`:695-705`, unconditional `Wrong password!` — the callback takes no parameter, so the typed value is not merely uncompared but never received); `session-send-users-url` and `session-send-sales-image` (`:562-595`, real `http`/`https` validation then `Command send OK.`, the reference's own typo, and no send); **`session-save-close-message` (`:532-535`, whose entire body is `alert = 'Message Saved'`)**; and the five `EXACT_ALERTS` entries `save-permissions`, `mute-chat-24`, `mute-chat-indefinitely`, `restart-audio` and `force-reload`. **`session-save-close-message` had never been recorded anywhere** — it is the "Just Save Close Message" button at `ModalHost.svelte:4128`, and nothing in `apps/room/src` persists a close message, so its sibling "Save Message and Close Session" (`:526-530`, which only writes `sessionOpen: false`) does not save the message either. **Two buttons offer to save it and neither does.**

**A THIRTEENTH AND FOURTEENTH belong to a milder sub-family — they do something local while their message promises a server command**, and they are listed separately rather than folded in, because conflating them would overstate the count: `session-refresh-roster` (`:501-506`) refetches and then says `Command send OK. Please allow 1/2 minute for old entries to get deleted from the list`, and `session-soft-reset` (`:508-515`) refetches and says `Soft reset request sent...`. Neither sends anything; both do a real local reload. Their wire commands are `kickUser`, `sendUsersToURL` and `sendSalesImageToChat` in `docs/decoded/missing-commands-triage.md`, each already carrying payload, byte offsets and verbatim strings — so these are ports, not research. **`unmute-chat` is the one that was fixed** and is the proof the shape is portable: a real command in `chat-mute.remote.ts`, 33 assertions in `unmute-chat-contract.test.ts`. **`mute-chat-24` is the instructive one:** the SERVER half exists and works, reached from the message context menu via `messageAction` (`message-actions.remote.ts:362`) and enforced in `sendMessage` and `replyMessage`; only the modal's copy of the button is inert, so two controls with the same label give two different outcomes. **THE THREE THIS ROW LEFT UNCHECKED HAVE NOW BEEN CHECKED, and none has a reachable wire:** `restart-audio` has no server half at all; **`forceReload` has BOTH ends and ZERO call sites** — a form action at `+page.server.ts:1318` and a receiver at `events.svelte.ts:653`, connected by nothing, which is exactly the `presenterCommand` defect that shipped dead for three commits. **THREE OF THE TWELVE ARE SMALLER THAN THIS ROW MAKES THEM SOUND, established 2026-08-17 — the difference between a port and a wiring job:** (i) **`save-permissions`** — an earlier draft of this row called the controller's `savePermissions` "a different feature", and that was too dismissive: it writes `roomUsers.permissionsJson` for the SAME five checkboxes (`server/rooms.ts:90-114`, `PERMISSION_KEYS`), so the column, the writer and the allow-list all exist and the room-side control needs a CALL, not a feature; (ii) **`kick-ban`** — the BAN half is built and enforced (`applyUserOpcode` case 4 sets `role = 4, banned = true`; `schema.ts:335`), so only the live EJECT of a connected member is missing; (iii) **`mute-chat-24`** — the command exists and is enforced but is keyed on a MESSAGE (`{kind, id, operation:'mute24', targetUserId}`), so what is absent is a user-targeted entry point, not the mute. **Severity is about the lie, not the absence:** a presenter believes the kick landed and the member is still in the room | **HIGH — controls that report success and do nothing** |
| **AE** | **The `+page.svelte` decomposition — the plan and its record now live in `apps/room/docs/PHASE-5-DECOMPOSITION.md`, and this row is the pointer, not the narrative.** Phases 1–4 are complete and Phase 5 has run slices 0–27. **THIS ROW DELIBERATELY STATES NO LINE COUNTS, AND THAT IS THE CORRECTION RATHER THAN AN OMISSION.** The previous version carried `9,605 / 8,627 / 978` and was wrong by 3.3× within a day; a draft of this rewrite carried today's figures and four of them were wrong within the hour, because another session is decomposing these files continuously. A number that is re-measured every time the suite runs does not belong in prose that is edited by hand once a week. **`apps/room/src/lib/source-size-contract.test.ts` is the authority** — the `CEILINGS` array in that file, over the cases it generates (**44 entries / 201 cases as of 2026-08-23**, against the 37/181 this row carried; the figures are restated only to show the drift, and the row's own principle applies to them too — read them from the file, not from here), ceilings that only ever go DOWN, plus a staleness check so a ceiling cannot sit far above the real count and silently license growing back. Read a ceiling from there; do not read a line count from here. **WHAT IS ACTUALLY LEFT, and it is the only part of this row that is work:** (1) **no automated browser check runs in CI** — `.github/workflows/` holds `backend-quality.yml`, `quality.yml` and `smoke.yml`, and none drives a browser, so a regression is caught by a person; (2) **component-render coverage was MIS-STATED here and is corrected 2026-08-17.** This row used to say "five of the six extracted panes have no mount test… `PrivateChatPanel.test.ts` is still the only one". Measured again 2026-08-23: **nineteen** test files render a component — **eight** with client `mount` (`PrivateChatPanel`, `FilesPane`, `PresenterMuteRows`, `RoomSidebar`, `AlertChatArea`, plus the clsx, `BindThisProbe` and `AttachDepsProbe` fixtures) and **eleven** with `render` from `svelte/server` (`RoomMessage`, `NotesPane`, `NoteEditor`, `NoteVersionHistory`, `PostAlert`, `SpeechRecoOverlay`, `StreamTabs`, `SwingAlerts`, `DayTradeAlerts`, plus `PresentationArea` via `main-tab-strip-contract` and `AlertChatArea` via `composer-authority-contract`). **Only two of the eleven parse with `parse5`** (`RoomMessage`, `PostAlert`); the rest assert on the HTML string, so "parsed via parse5" was over-general even at nine. An established SSR-render pattern existed the whole time and this row did not mention it, which sent at least one session hunting a gap that was half-filled. **The two forms are not interchangeable, and that was tested rather than assumed:** SSR emits the structure but NOT anything an `{@attach}` sets, because attachments are client-only — rendering `PresenterMuteRows` server-side yields the row ids and no `checked`. So `label.control`, `input.checked` and `click()` need `mount`; structure and attributes do not. **What is genuinely still open: `RoomNavbar` ALONE has neither form.** Corrected 2026-08-23 — three of the four named here are now covered: `RoomSidebar` and `AlertChatArea` by client `mount` in their own `.svelte.test.ts` files, and `PresentationArea` by SSR `render` inside `main-tab-strip-contract.test.ts`, which is why a scan by FILENAME misses it. **The sentence that used to stand here — that `AlertChatArea` cannot be tested because jsdom reports `scrollHeight`/`offsetHeight` as `0`, "a real limit rather than a backlog item" — is DELETED because the repository refuted it.** `AlertChatArea.svelte.test.ts:8-25` records the retraction in its own words: the follow behaviour "was written down as blocked on an instrument limit" and "the 'needs Playwright' note was pessimism". A tracker that declares a closed gap impossible is worse than one that omits it. (was:) **five of the six extracted panes have no mount test.** Phase 2 named this its real deliverable — "a pane can be MOUNTED… each remaining component gets the same treatment" — and `PrivateChatPanel.test.ts` is still the only one, so `RoomSidebar`, `RoomNavbar`, `AlertChatArea`, `PresentationArea` and `FilesPane` are asserted on as source text. jsdom has no layout, so even those cannot prove a panel is draggable or positioned where the capture puts it. **THE RULE THE WHOLE PHASE EARNED, which outlives the line counts: migrate the tests with the code, and re-point every `not.toContain` at the file that now owns the thing.** A positive assertion fails loudly when a region moves; a negative one starts passing for the wrong reason. That has now happened four times in this repository — `exactAlerts`, `chat-mode-contract.test.ts`, and twice in `screen-volume-contract.test.ts` | **MEDIUM — the standard is being met; the verification is not** |
| **AF** | **The html-to-plain-text derivation — READ 2026-08-17, and the answer is TWO copies, not three.** This row's stated next action was to read the server's authoritative `body` derivation before converting the message-send group. Done: `sendMessage` derives it at `chat-messages.remote.ts:169` by calling `stripHtmlToText`, `editMessage` calls the same function at `message-actions.remote.ts:297`, the client's optimistic copy calls it at `composer.svelte.ts:330`, and `replyMessage` and `askQuestion` carry **no html derivation at all** (both take plain text). One function, three consumers: they cannot disagree, so **the MEDIUM severity this row carried — a silent divergence between what a sender sees and what the room stores — no longer applies.** The only other copy is `isEmptyChatHtml` (`server/chat-html.ts:95-98`), which runs the same three steps to answer a different question (is this empty), and `chat-rich-text-contract.test.ts:123-132` now pins both sides against drift. **WHAT IS LEFT is two comments, not code:** `chat-plain-text.ts:25-30` still says the server's derivation "has NOT been read, so the count is not asserted here", which this read disproves; and `chat-html.ts` carries no note saying its inline copy stays separate deliberately — the other half of this row's own "write it down in BOTH places" | **LOW — comments only; the divergence risk is closed** |
| **AG** | **Seventeen form actions are still reached from JavaScript, through dynamic dispatchers — and it is THREE dispatchers now, not four.** `remote-call-sites-contract.test.ts:140` records the merge: the two trade-alert dispatchers became one, and the union moved with it. The three: `submitPollAction` (`lib/room/modals.svelte.ts:158`) → `savePoll`, `deleteSavedPoll`, `sendPoll`, `sendPollAnswer`, `pollDone`; `submitMutation` (`lib/room/notes.svelte.ts:89`, renamed from `submitNoteMutation`) → the six session-note commands; and the merged swing/day-trade dispatcher (`lib/room/trade-alerts.svelte.ts`, `async submit(`) → the six alert commands. **The arithmetic, so nobody re-derives it wrongly: `+page.server.ts` exports NINETEEN actions — the seventeen above, plus `logout`, which is a real progressive-enhancement form POST and not a JS dispatcher, plus `forceReload`, which has no caller at all (row W).** **Why this is the WORST form of the defect and not a lesser one:** a literal `'?/savePoll'` is at least greppable; an interpolated name is assembled at runtime from a union type, so nothing — not the compiler, not a search, not the build — connects it to the action it reaches. Delete the action and the call site keeps compiling and starts doing nothing, which is exactly what `presenterCommand` did for three commits. **GUARDED, NOT FIXED:** the contract test asserts the dispatchers are exactly N (counted from the code, not trusted from its own table), that the list only ever shrinks, and that **every action name each union can produce still exists** — negative-controlled by renaming `savePoll` and watching it go red. So the class cannot recur silently; the work is simply not done. **Converting them follows the settled rule:** by FEATURE, split on the GATE, with each behavioural test rewritten onto `callRemote` rather than re-pointed as text | **MEDIUM — guarded, so it cannot rot silently; still seventeen endpoints named by strings** |
| **AI** | **The register's own status column does not agree with the verifier that reads it, and the verifier is what CI enforces.** `evidence-gap-register-counts.test.ts` parses `docs/reference/evidence-gap-register.md` and computes **68 CLOSED / 5 OPEN / 14 parked / 87 total**, which is what the tally sentence above says, so the gate is green. But reading the status column by eye gives **66 / 6 / 15**, because the parser's documented "CLOSED wins" rule matches the substring anywhere in the row — and several rows narrate their own history (`already closed`, `unclosed`) or quote the original OPEN wording inside a closure note. **Do not fix this by editing the tally**, which would turn the gate red against a register that has not changed. The fix is in the parser or in the rows: either match the status CELL rather than the whole row, or stop letting prose in other cells vote. **T5-25 is the row where it bites** — the register says OPEN, its own text justifies CLOSED, and the parser calls it CLOSED | **MEDIUM — the number CI enforces and the number a human reads are two different numbers** |

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
