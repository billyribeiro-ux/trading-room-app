# TODO — what is still left to do

Stripped 2026-08-13 18:26 EDT to exactly that. Everything historical moved out: finished work lives
in `CHANGELOG.md`, and the process rules earned along the way live in
`docs/reference/working-rules.md`. If a section here is not something somebody still has to DO, it
does not belong.

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

---

## Still open — the 78 evicted scripts remain readable in PUBLIC history

The one thing untracking could not reach, and the only genuinely outstanding item here.

`apps/room/scripts` holds **0** files on `main` today. At `be239b2` — before the 2026-08-15
eviction — it holds **78**, and the repository is `public`, so they are readable at that commit by
anyone. Untracking governs future commits only.

Measured rather than assumed, with the repository's own detector in `apps/room/gate/privacy-utils.mjs`:
no email addresses, no gravatar hashes, no tokens across all 78. **One** occurrence of the owner's
name, in `scripts/compare-capture-states.mjs`. What they do carry is the third-party application
they were built to match — `chat.protradingroom.com`, its selectors and wire protocol — which makes
this the republication question, not a credential leak.

Two ways to actually resolve it, and only these two: rewrite history with `git filter-repo` and
force-push (every commit SHA changes, and GitHub may cache the old objects until support purges
them), or make the repository private (instant, erases nothing, ends the exposure). Leaving it is a
legitimate third answer given what is actually in the files. **Owner's decision; not taken.**

The evidence-partition work this section used to describe is DONE and is in `CHANGELOG.md`
(2026-08-15): `gate/evidence-bound-tests.mjs` discovers the evidence-bound set,
`src/lib/evidence-partition.test.ts` pins the count, and the suite runs whole locally and partitioned
on CI. Nothing there is outstanding.

**What is still not decided:** 76 of the 78 evicted files are already on
`origin/main` and stay readable at those commits — including `scripts/compare-capture-states.mjs`,
which contains the owner's name and is baselined in `ops/privacy-baseline.txt`. Untracking governs
future commits only. Removing them from GitHub needs a history rewrite and a force-push, which was
not authorised. This is the same pending decision `gate/verify-privacy-boundary.mjs`'s own header
already describes.

**Smaller, and genuinely outstanding:** 30 npm script entries in `apps/room/package.json` point at
untracked files, and this file's own "run it after every feature lands" instruction for
`apps/room/scripts/audit-feature-coverage.mjs` cannot be followed by anyone cloning the repository.

---

## What the CI gates left behind

Both frontend items the first `quality.yml` run exposed are CLOSED and their records are in
`CHANGELOG.md`; the two rules they earned are `docs/reference/working-rules.md` **10** (`svelte-check`
is only evidence after `rm -rf .svelte-kit`) and **11** (a test that returns early on a missing
fixture is a silent pass). What is below is only what somebody still has to do.

### 2b. Local dev secrets — restored 2026-08-15, and one is permanently gone

`apps/controller/.env` was overwritten (`cat >` where `>>` was meant) and went from 1413 bytes to
81. Six of its seven variables were restored from `~/Desktop/new-room-control/.env`.

**`API_KEY_ENCRYPTION_KEY` could not be restored and was regenerated instead.** It is now set in
Vercel production (`--sensitive`), set identically in the local `.env`, and production has been
redeployed and verified live. Consequence, stated once: API keys created BEFORE this can no longer
be re-displayed on the account page. They still **authenticate** — `secret_hash` is what
authenticates and it is untouched; `secret_ciphertext` only exists so the page can show the value
again. Delete and recreate any key you want visible.

**The fact that made this unrecoverable, and it applies to all eleven:** every controller variable on
Vercel is type `Sensitive`, which is **write-only**. No value can be read back by the dashboard, the
CLI or support. **`~/Desktop/new-room-control/.env` and `.env.vercel-pull` are therefore the only
readable copies of production secrets that exist anywhere.** Back that folder up off this machine.

### 3. Backend quality — GREEN on `main` since 2026-08-15; the cutover tail remains

**The backend gate is GREEN end to end as of 2026-08-15** — run `31910327192`, 33m36s, every step
passing, and again on `main` after the merge. It was never green before that day.

**The 2026-08-14 attribution was wrong and is corrected here rather than quietly dropped.** It read:
"the account has run out of CI minutes, and that is why these jobs fail." The jobs were failing on
four real defects, each hidden behind the one before it, and all four are now fixed — see
`CHANGELOG.md` 2026-08-15. Minutes were never the cause.

**The owner's cost constraint stands on its own and is unchanged:** every push against an open PR
starts a run. The backend gate is ~33 minutes when the diff touches a backend path and ~25 seconds
when it does not, so batching backend pushes is worth real money and docs pushes are effectively
free. See `docs/reference/working-rules.md` rule 12 for why a green PR check is not proof the
backend ran.

#### Still open — the runtime-role cutover is not finished

`ops/naming-provenance.md` is the authority on all of this; these are the rows it points at.

| # | what | why it is not done yet |
| --- | --- | --- |
| 1 | **Retire `ptr_clone_app`** — a forward-only migration that drops the baseline role | Deliberately deferred until the cutover is proven in a real deployment, not just on scratch clusters. Since 2026-08-15 the role is named by no policy and reads zero rows from all 22 tenant tables, so it is inert but still holds object privileges. The migration must REFUSE rather than `CASCADE`: a cascade silently drops whatever still depends on it. `0001_baseline.sql` re-creates it on every new database, so retirement cannot be a rename and cannot assume absence. |
| 2 | **Owner role and database name `ptr_clone` → `tradingroom`** | Its own change, deliberately not bundled. Different mechanism (ownership and `CREATE DATABASE`, not policy membership) and different blast radius: `EXPECTED_MIGRATOR_ROLE`, the preflight identity check, every `MIGRATE_DATABASE_URL`, and the provisioning scripts. Bundling would mean one failure obscures the other. Same shape as the role: add, prove, cut over, retire — **never rename**, which is the mistake the withdrawn `0009_rename_runtime_roles` made. |
| 3 | **Prove the chain against a database that predates `0009`** | Every verification so far builds the cluster from scratch. The retarget is written to be idempotent and self-healing, and was shown to repair a hand-widened policy, but no database with real history has run it. |

### Evidence gaps

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
- **Where I looked:** `carousel.ts` `renderHTML`, `safe-html.ts` `TAG_STYLE_RULES.div.background`,
  `server/notes.ts:123`, and the jsdom output pinned in `note-carousel.test.ts`.
- **What it blocks:** nothing today. It decides whether the allow-lists need a second accepted form.

**No persisted room video/YouTube state, so the four "For All" commands have no LATE-JOIN REPLAY —
2026-08-15.** The commands themselves now broadcast and are received (`videoForAll` /
`youtubeForAll` in `apps/room/src/routes/+page.server.ts`, pinned by
`apps/room/src/lib/for-all-broadcast-contract.test.ts`). What is absent is the reference's server
side of them, and it is absent because this room has nowhere to put it — `room_state`
(`apps/room/src/lib/server/db/schema.ts`) holds `chatMode` and nothing else.

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

## State, 2026-08-15 08:11 EDT

**The previous version of this section said "Eight rows remain, and not one of them is blocked on
effort. Every item that could be built from the evidence has been." That was false when it was
written, and it is worth understanding why before trusting any similar sentence.**

At the moment it was written, Swing Trade Alerts and Day Trade Alerts — two entire
presentation-area tabs — were sitting in the captured bundle unbuilt, and had been since day one.
`presAreaTabs-swingAlerts` occurs 3 times in v3, 3 times in our 2026-07-30 capture and 3 times in
current v4. Nothing had ever ENUMERATED the reference's features, so "everything buildable is built"
was a statement about what somebody had thought to look for.

`apps/room/scripts/audit-feature-coverage.mjs` now asks the bundle directly. Since it was written it
has found, three separate times, work nobody knew existed. **Run it after every feature lands.**

### What the enumeration says today

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

**Nothing that is not built gets parked.** An earlier version of this table carried a fifth bucket —
"unclear, needs a product decision" — which read as resolved and was not. A pending decision is
outstanding work; the only thing that removes a row is building it or proving we already did. Owner
directive, 2026-08-15, after the same mistake had already hidden two whole tabs behind a confident
sentence.

**Ready to build, fully specified:**

| item | spec | note |
| --- | --- | --- |
| `presAreaTabs-recordings` — **NOT BUILT, blocker named** | `docs/decoded/missing-commands-triage.md` | NOT cheap after all. The reference's pane is one iframe onto a SERVER archive page; we have **zero recordings/archive tables** in either database, so the tab would front nothing. Needs an archive service first — a design decision, not a port |
| Alert Labels — **composer picker only** | `docs/decoded/alert-scheduler-filter-labels.md` | The RENDER half is built (2026-08-15): the setting is wired, `#hash` becomes a badge on the alerts log. What is left is the post-alert modal's label SELECTOR, the thing `checked` exists for. **Evidence gap, not a port:** `alertLabels` is one of `direct-evidence-contract.ts`'s `hiddenCapabilityBranches`, so that branch never rendered in any capture we hold and there is no markup to match. Needs a new capture from a room that has the entitlement |
| Alert Scheduler | same | needs an entitlement whose manage-page control was NOT located, and a server-side scheduler we do not have |
| Benzinga — **const-table pass DONE 2026-08-15, markup verified; two honest gaps remain** | `NEW-TODO.md` §2.2 | The decode pass found nothing to change. Component consts at bundle byte 2,533,190: 25 `nav-item py-0`, 40 `target=_blank title="Benzinga News" nav-link sidebar-item ps-1`, 41 `benzinga-logo-alt`, 42 `fas fa-newspaper`, 22 `pl-2` — all five already match `+page.svelte`. We add only `rel`, `alt` and `width`/`height`, which are house rules, not drift. **Still missing, and neither is a port:** the reference's DEFAULT url is its own host (`ptrv3.protradingroom.com/public/bz/index.html`), so ours renders nothing unless `altBenzingaLinkURL` is set; and the default `assets/images/benzinga-logo.png` is not in this repository, so the icon form always stands in |

**The control-plane question is answered.** `docs/decoded/control-plane-capture.md`: the reference
registers **31 ui-router states and not one is an operator surface**, and `states[*].data` is `null`
on all 31 — the reference expresses no authority in its router at all. There is no route-level role
model to copy, and the super-admin portal can only be designed, not matched.

### The rows below

What is left in the table is blocked on a decision, an environment, or an architecture this
deployment does not have — which is what the old sentence *meant* and should have said.

| row | what it needs | who or what unblocks it |
| --- | --- | --- |
| **G** | the Postgres host question — Neon under volume | the owner |
| **H** | production topology — separating media from the app tier | the owner |
| **Q** | the WordPress plugin run inside a live WordPress | an environment |
| **E** | **UNBLOCKED 2026-08-15.** `apps/room/.env` now exists and its `ROOM_JWT_SECRET` matches the controller's. The seam probe has still never been RUN | nothing — this one is mine to run |
| **R** | screenshare quality / MP4 — the measurement needs a human at an OS screen-picker dialog; its row 10 needs the same cluster as X and AC | the owner, then a MediaMTX cluster |
| **X** | `app-recording-preview-window` — `setRecPreview` comes from the MediaMTX path | a MediaMTX cluster |
| **AC** | `stopRecMsg` — the same producer, the same path | a MediaMTX cluster |
| **AD** | **OBS / XSplit — BOTH HALVES BUILT 2026-08-14.** Ingest and playback are complete: StreamTabs, the `#streams` pane, StreamingView with hls.js, the three wire commands, `/internal/media-hook`, the reconcile loop, and real presenter names on the tabs. ONE thing remains, and it is not code | a MediaMTX host at `STREAM_SERVER_MTX` |

**Row AD, built 2026-08-14 16:41.** The owner's requirement is that a presenter can stream from the
BROWSER (works today, mediasoup) **and** from OBS / XSplit. The ingest half now exists end to end:
the migration, the credential, its rotation, the media server's authorisation check, the room
endpoint and every missing panel element. `apps/room/docs/OBS-XSPLIT-INGEST.md` is the contract and
`apps/room/docs/OBS-XSPLIT-SETUP.md` is the operator + presenter instructions.

**Two claims in the previous version of this row were WRONG, and reading the region around the
fragment is what disproved them.** Recorded rather than quietly corrected:

1. *"The two instruction blocks are switched by `O(1, e.useMTX ? -1 : 1)` — `useMediaMTX` is exactly
   what turns OBS ingest from RTMP into WHIP."* **No.** Byte 2152300 shows the switch is the radio
   pair: `O(153, "RTMP" === e.streamingType ? 153 : -1)` and `O(154, "WHIP" === e.streamingType ? 154
   : -1)`. `useMTX` gates one thing inside the WHIP block — a pair of Start/Stop WHIP Streaming
   buttons that render only when `useMediaMTX` is **off**. Consequence: `useMediaMTX` never needed to
   cross `ROOM_VISIBLE_SETTINGS`, so the four-edit process was not required.
2. *The RTMP URL is `rtmp://{streamServerMTX}/room__{sessionID}__{name}`.* Incomplete — it ends
   `?jwt=${mtxToken}`. That parameter name is the only evidence anywhere of the token's format, and
   the WHIP side does not carry it in the URL at all: the panel's second field is labelled **`Bearer`**
   (consts index 116). One token, two carriers, which is exactly how MediaMTX's HTTP auth surfaces it
   (`token` vs `query`).

**A defect in the reference, and our one deliberate divergence.** Its `getNewToken()` rebuilds
`streamingLinkRTMP` only, leaving `streamKey` and `streamingLink` holding the token just revoked — so
pressing New Link on the WHIP tab yields a dead Bearer. Ours derives all three from one source.

**What is blocked is still not the ingest code.** A MediaMTX host at `STREAM_SERVER_MTX` with 8889
(WHIP/WHEP) and 1935 (RTMP) reachable and TLS in front. With the variable blank the panel says so
honestly and the credential still mints, rotates and validates — `stream-ingest.db.test.ts` proves
all three against a real PostgreSQL. What cannot be produced without the host is an end-to-end
publish from a real encoder.

**The PLAYBACK half — READ 2026-08-14 17:02, and it was never a gap.** This row said twice that the
mechanism was "not established from the bundle" and guessed WHEP. Both were wrong. The answer was in
`docs/source/components/app-streaming-view.full.js`, a file in the dump nobody had opened:

```js
this.videoSrc = `https://${globals.streamServerMTX}/room__${muser.sessionID}__${muser.producerID}/index.m3u8?jwt=${globals.mtxToken}`;
```

**HLS via hls.js on 443, not WHEP on 8889** — with `__reb` appended when
`mediaValue.serverName !== streamServerMTX`. And the playlist carries `?jwt=`, so playback is
authenticated; `userLoggedIn` (byte 994430) hands every session an `mtxToken`, not just presenters.

**That mattered, because the guess had produced a real hole.** `media-auth` refused all reads and
both documents told operators to `authHTTPExclude` them, which would have served every room's video
to anyone who guessed a path. Fixed the same day: a `read` scope, room-scoped and stateless, proven
by 12/12 live HTTP checks including genuine 200s.

**Also read, also worth recording:** `MtxHandlerService`'s `connectToMTX`, `disconnectFromMTX` and
`handleStreamsMTX` are **empty function bodies in the shipped bundle** (byte 1137300). Upstream has
no client-side MediaMTX connection to reproduce — the service keeps a list and selects tabs, and the
`<video>` element does the rest.

**The four named pieces — two BUILT 2026-08-14, two remaining.**

- ✅ the room's `mtxStreams` list — `apps/room/src/lib/mtx-streams.ts`, `MtxHandlerService`
  transcribed as pure functions with 21 tests.
- ✅ the `app-streaming-view` equivalent — `StreamingView.svelte`, the full hls.js configuration
  (three buffer levels, `lowLatencyMode`, the optimal→balanced→conservative ladder) and the five
  sub-templates from bundle byte 1901148.
- ✅ the stream TAB BAR — `StreamTabs.svelte` (`RSe`, `:543-588`) with
  `stream-tabs-contract.test.ts`. **NOT reusable from `ScreenTabs`**: that component renders
  `img.presenter-img` and `{name}-{screenName}` unconditionally, and `RSe` renders neither.
- ✅ the `#streams` PANE — `OSe`, `:589-618` — BUILT 2026-08-14, and the Streams main tab opens.
  `useMediaMTX` and `overlayUserIdOnScreenshare` now cross the config boundary (56 → 58 wired), the
  playback token arrives with the page from `/internal/stream-read/{code}`, and the pane reproduces
  the `disableVideo` gate that blanks `#screens` — the same preference blanks BOTH panes upstream
  (`O(41, disableVideo ? 41 : 42)` at `:5388-5393`).
- ✅ the three `cmds` commands — BUILT 2026-08-14. **The two names are NOT the same thing and this
  cost a wrong draft:** `getSessionMTXMediaState` (MTX in the MIDDLE) is the WIRE command in both
  directions, payload `data`; `getSessionMediaStateMTX` (MTX at the END) is an INTERNAL bus event
  upstream carrying no payload. `mtxStartStream`/`mtxStopStream` carry the stream under `muser`.
  Validated by `isMtxStream` at the wire boundary — a deliberate divergence, because upstream pushes
  `i.muser` in unchecked and two of its fields are interpolated into a playlist URL.
- ✅ `/internal/media-hook` **and the reconcile** — BUILT 2026-08-14. **Hooks for latency,
  reconciliation for truth.** The hook is a `curl` MediaMTX spawns, with no retry and no delivery
  guarantee, reaching only the instance it lands on; `mtx-reconciler.ts` polls `/v3/paths/list` per
  room from every process, which is instance-independent. Polling is a STATED DIVERGENCE — the
  reference does not poll, because a SocketCluster socket has delivery semantics a spawned shell
  command does not.
  - It emits **deltas, never the full list on a timer**: `applySessionMediaState` moves the
    selection to `list[0]` every time it runs, so a repeated full-list apply would drag every
    viewer's tab back to the first stream every five seconds. Both halves are asserted.
  - `available`, **never the deprecated `ready`** — from the project's own `api/openapi.yaml`.
  - `MEDIA_HOOK_SECRET` is separate from `ROOM_JWT_SECRET` on purpose: it ends up in a media host's
    config file. `MEDIA_API_URL` is MediaMTX's control API, `127.0.0.1:9997` and localhost-only.
  - The ingest doc had the hook POSTing to the CONTROLLER, which was wrong — the SSE fan-out is in
    the ROOM. Corrected.

**What remains before OBS ingest is end-to-end: a MediaMTX host.** Every piece of room and controller
code is now built and tested. What cannot be produced without the host is a real encoder publishing
and a real viewer watching — see the note above on `STREAM_SERVER_MTX`.

**Known limitation, inherited and not introduced.** `publishToRoom` is process-local, so a hook
reaches only one instance's subscribers, and the room defaults to the Vercel adapter. Every existing
realtime feature has this, `focusOnScreen` included. The reconcile is what keeps the stream list
correct regardless; the durable fix is TODO entry 5 (PostgreSQL `room_events`, already listened on by
`services/api`).

**The two dead `svelte.config 2.js` files were REMOVED 2026-08-14**, along with `TODO 2.md`. Kit 3
takes its configuration through the Vite plugin and **errors** on a real `svelte.config.js`, so only
the `" 2"` in those names kept them harmless — renaming one back would have broken the build. Zero
tracked duplicate-named files remain.

**The "not ours to author" blocker this row used to claim was WRONG, and it is retracted.** The
`muser` shape is fully determined by the bundle: `_id` (identity, tab id `${_id}-tab`, pane id, and
the video element `video-${muser._id}`), `sessionID` and `producerID` (the two playlist path
segments), `mediaValue.name` (the tab label) and `mediaValue.serverName` (the `__reb` decision).
Every one of those is READ by a view in the capture. Nothing about it needed authoring in
`services/**`.

**Note for whoever builds the hooks: they are `runOnAvailable`/`runOnUnavailable`.
`runOnReady`/`runOnNotReady`, which this row previously named, were renamed and no longer exist**
(mediamtx.org/docs/usage/hooks).

**FOUR CONTROLS IN THE STREAM TAB ARE INERT UPSTREAM — do not "finish" any of them by guessing.**
Established 2026-08-14 and each pinned by a test in `stream-tabs-contract.test.ts`: the forced eye
badge (`forcedScreenMTXID` — 2 occurrences in the whole bundle, one of them `=""`, no writer); the
lock badge (`lockedScreenIDMTX` — 4 occurrences, one `=""`, three reads, no writer); "Lock Screen"
(`toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")}`); and "Bring everyone here",
which sends a real `focusOnScreen` command that **no recipient can resolve**, because every
receiver scans `mediaService.screenSharingUsers` and never `mtxHandlerService.mtxStreams`. They are
rendered because a viewer of the reference sees them, and they are prop-driven so the branches stay
reachable if the protocol is ever captured. **The badge reads `lockedScreenIDMTX` while the menu
label reads `lockedScreenID` — an upstream asymmetry, reproduced deliberately and guarded in both
directions, because collapsing the two props is the obvious tidy-up and is invisible by eye.**

**One decision unblocks X, AC and R's row 10, and it is not "build server-side recording".** Established
2026-08-14 from the bundle: the reference hands recording to **MediaMTX**, an off-the-shelf media
server. `useMediaMTX`, `mediaMTXClusterID` and `backupMediaMTXClustterID` are all real manage-page
settings, all inside the reference's own `dont-touch` group, and the two ClusterIDs are read by the
reference's SERVER — they appear nowhere in the room bundle. The room only observes MTX streams and
asks the server to record them, so **there is no room code waiting to be written.** Client-side
`MediaRecorder` is NOT a divergence — upstream takes that same branch whenever no MTX stream exists.

**Established 2026-08-14, having previously been listed here as unknown:** how a stream reaches
MediaMTX. It is the OBS-ingest panel — an external encoder publishes over WHIP or RTMP with a token
the controller mints, and MediaMTX asks the controller to authorise it. That is row AD, now built.
The earlier draft's error was the opposite one: it said the *client* publishes over WHIP, and the
WHIP sites turned out to be this panel. Both halves of that confusion are now resolved.

**Still not established, and still not claimed:** how the room PLAYS an MTX stream once it exists.

---

## Where things are written down

| document                                                | covers                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/NEXT-SESSION.md`                                  | verified state, the room-hosting decision, backend + egress arithmetic, what the original actually runs on, hostname/DNS plan, consolidation, ordered next actions, audit method, traps                                                     |
| `docs/DEPLOYMENT.md`                                    | **what runs where** — the Hetzner box, the services on it, the secrets, and how to ship a new build                                                                                                                                         |
| `docs/SFU-MIGRATION.md`                                 | how the media service moved to Hetzner — **done 2026-08-09**; kept as the record and as the operational contract for that box                                                                                                               |
| `docs/RETIRE-AWS-SFU.md`                                | **the old AWS SFU, retired 2026-08-10** — what it was, every command run, and why the "EC2, not Lightsail" identification was wrong                                                                                                         |
| `docs/EMAIL.md`                                         | transactional sending vs mailbox hosting, what is built, the DNS records, and the verification trap                                                                                                                                         |
| `docs/MOBILE-APP.md`                                    | the phone/tablet app — decoded server surface, proposed endpoint contract, security constraints, the white-label question                                                                                                                   |
| `apps/controller/docs/OUTSTANDING.md`                   | the controller's own gap register, §1–§7                                                                                                                                                                                                    |
| `docs/reference/working-rules.md`                       | **how to work on this repository** — eight rules, each earned by a specific failure on 2026-08-13. Read before trusting any "not built" or "no such rule" note. |
| `apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md`     | the SFU deployment ladder — **Stage 2+ superseded**, see `NEXT-SESSION.md` §4c                                                                                                                                                              |
| `apps/controller/docs/decisions/`                       | ADRs. 0003 is the one that matters for topology                                                                                                                                                                                             |
| `apps/room/TODO.md`                                     | the room's own list                                                                                                                                                                                                                         |
| `apps/controller/evidence-bootstrap-3.3.7.css`          | **the styling authority for the account, manage and login pages.** Pulled from `new-room-control/css-modals` 2026-08-11, SHA-256 pinned by `manage-panel-bootstrap3-contract.test.ts`. See the note below on the two Bootstrap generations. |
| `apps/room/evidence-tooltips-presenter-2026-08-11.json` | the RENDERED tooltip, captured from the live original. `ngb-tooltip.test.ts` reads its expectations out of this file                                                                                                                        |

---

## The product runs TWO Bootstrap generations, on two surfaces

Established 2026-08-11 from `new-room-control/css-modals`, and never written down before. Getting
this wrong is how a "fix" gets applied to the wrong surface, so it belongs at the top of this file
rather than inside a row.

| surface                                              | generation          | how it is PROVEN                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The room** (`chat.protradingroom.com`, Angular 2+) | **Bootstrap 5**     | the live tooltip renders `class="tooltip fade show bs-tooltip-start"` with `data-popper-placement` — a spelling only Bootstrap 5 emits (`apps/room/evidence-tooltips-presenter-2026-08-11.json`); its modal captures carry `modal fade show` and `aria-modal`, and **zero** `modal fade in`   |
| **Account / manage / login** (AngularJS)             | **Bootstrap 3.3.7** | `div class="panel panel-default"` appears six times across `evidence-dumps/login-page/{login,logged-in-page,manage,complimentary}`, beside `ng-show`/`ng-hide`. `.panel` is a Bootstrap **3** component — 4 replaced it with `.card`, 5 dropped it entirely — so that markup cannot be either |

**Confirmed again 2026-08-12, by RENDERED tooltips from both surfaces.** The manage page renders
`<div class="tooltip bottom … fade … in" tooltip-popup="" content="Account Settings"
placement="bottom" is-open="isOpen">` — Bootstrap 3's `.tooltip.<direction>` + `.in`, driven by
AngularJS UI Bootstrap's `tooltip="…"`/`tooltip-placement="…"` directives, inserted as a sibling
inside the host's `<li>`. The room renders `<ngb-tooltip-window class="tooltip fade show
bs-tooltip-start" data-popper-placement="left">` — Bootstrap 5 via ng-bootstrap. Two surfaces, two
tooltip systems, neither sharing a class name with the other. Captured in
`apps/controller/evidence-tooltips-manage-2026-08-12.json` and
`apps/room/evidence-tooltips-presenter-2026-08-11.json`.

`new-room-control/css-modals` is the source for the SECOND surface: the Bootstrap 3.3.7 LESS tree,
the compiled `bootstrap.css` (now pinned here as `apps/controller/evidence-bootstrap-3.3.7.css`),
and a `styes.css` whose header reads **"Naut - Bootstrap Admin Theme + AngularJS"** — the theme the
AngularJS half of the product was built on.

**It changes nothing about the room, and that is a finding rather than a disappointment.** Bootstrap
3 spells tooltips `.tooltip.left` + `.in` with arrows drawn from `width:0;height:0` borders; there
are **zero** such rules in our applied sheet or in the reference's own `styles.d622cb9ed2bbc221.css`.
Bootstrap 3 is not in the room's cascade at all.

**What it did do is verify work already done.** Every `.panel*` value in `apps/controller/src/manage.css`
matches Bootstrap 3.3.7 exactly — `margin-bottom: 20px`, `border-radius: 4px`,
`padding: 10px 15px`, `#ddd`, `#333333`, `#f5f5f5` — and that file was transcribed from a RENDER,
because no rect dump for the manage page existed. Two independent derivations agreeing to the byte
is the strongest form this evidence takes. `account.css`'s note that "the 15px inset belongs to the
HEADINGS", derived from `439.5 - 424.5` measured in a capture, is `.panel-heading { padding: 10px 15px }`
upstream. Nothing was edited to make any of it agree; `manage-panel-bootstrap3-contract.test.ts`
exists so it cannot silently stop agreeing, and a 1px drift fails it.

**Use it as the authority for gaps 1, 2, 3, 5, 8, 9, 10 and 11, and for item S** — every one of
those is on the AngularJS surface, and their styling questions now have a source instead of a
sampled computed style.

## Evidence gaps — the index

Full write-ups live in the documents linked. Nothing below has been filled in with a plausible
value; each is a thing that was looked for and not found.

**This file lists only what is still OPEN.** Closed items are not struck through here any more —
they are removed, and their history lives in `CHANGELOG.md`, dated and timed, with the commit that
closed each one. Two places recording the same thing is how one of them goes stale, and a list that
is mostly strikethrough is a list nobody reads to the bottom of.

### THE REGISTER: `docs/reference/evidence-gap-register.md`

Every gap from the full read of `apps/controller/evidence-dumps/` now lives there with a status, in
five tiers. **That file is the tracker — this section is only the index to it.** Do not record a
gap's status in both places; one of them will go stale.

As of 2026-08-15 20:52 EDT: **68 CLOSED, 5 OPEN, 14 parked/won't-fix, 87 total.**

**Everything closable by READING is closed.** The six that remain need something no source file
can give. Each is written out below with the exact next action, because "blocked" without an
instruction is just a note that something is unfinished.

---

### HANDOFF — the SIX still open, and exactly what each needs

Rewritten 2026-08-13 18:21 EDT, recounted 2026-08-14, pruned 2026-08-15. It said twelve while the
template read was still running, then fourteen, and the prose disagreed with the tally line above it
in BOTH directions for a day.

The items below count **B 1 + C 3 + D 1 = five**, which is what the tally says and what
`evidence-gap-register-counts.test.ts` recounts from the register itself. Three buckets that read
"Nothing" — the five closed by the 2026-08-14 browser session, both items re-fetched and resolved,
and one empty bucket — were REMOVED on 2026-08-15 rather than left saying nothing: a bucket whose
content is "nothing to do" is not something somebody still has to do, which is the rule at the top of
this file.

Section B reads "two" because one sentence unblocks two EDITS; only one of them (T5-24) is an open
register row. Every item says WHO does the next step and WHAT it is. **No item here is waiting on
more reading — the templates are exhausted.**

#### B. Two need one sentence from the owner, naming the field.

Blocked by a credential guard whose bar is `[named + specifics]`. A general "match the original" does
not clear it, and this exact edit was explicitly reverted earlier on request. **Four attempts were
refused; do not attempt a fifth without the sentence.**

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

- **T5-24** — `+page.server.ts`, the `wordpressShortcode` line: `key=''` becomes
  `key='${String(settings.ssoJWTSecret ?? '')}'`. Reference `page.manageSession.html:782`. **Why it
  matters:** the shortcode is COPIED into WordPress, where the plugin signs the SSO handoff with that
  key. Empty means every handoff fails, and it renders identically to a working one.
- **T5-25 is CLOSED as a gap in its own right** — the endpoint exists with ten green tests. What
  remains is only the DISPLAY block at `page.manageSession.html:1138-1142`, which is the same
  sentence.

#### C. Three are NOT CAPTURED YET. Each needs one targeted collection script.

**T5-27 left this bucket on 2026-08-15** - its setter was captured verbatim out of the live
`app.min.js` and the row is CLOSED in the register. It was never a script problem: the handler builds
a `bootbox.dialog` at click time, so no collector reading the DOM could ever have found it.

**Corrected 2026-08-15 by the owner, and the correction matters.** This bucket said these needed
"infrastructure that does not exist" and were not to be built. That was wrong twice over: the
original application **does** have all four, and this repository's own rule for anything missing is
not to park it but to **write a browser-console script that fetches it** — `scripts/ptr-collect.js`
is the working reference implementation and every collector here was built from its shape.

So none of these is blocked on infrastructure. Each is blocked on **one capture run against the live
original**, and what each script has to bring back is already known:

| item | the script must capture |
| --- | --- |
| **T5-16 Recordings** | the response behind `recs` — `vidPath`, `contentType`, `name`, `created`, and `length` in MILLISECONDS (the page renders `length/60000` to two decimals) |
| **T5-17 Avatars** | the avatar set behind `avatars`, plus the request `selectAvatar(avatar)` posts — URL, method and body |
| **T5-20 `recorded_max_capacity`** | what actually writes it. Column, reader and reset all exist (migration `0011`); the missing half is the live-occupancy signal the controller never receives. Capture whether the original pushes occupancy on its command channel and under what name |

Rules for those scripts, from `~/CLAUDE.md` §3: one self-contained `.js` file pasted into the console
on the LIVE app; it detects whether the session is a member or an admin and records what that role
can and cannot reach; it drives itself to the target and downloads a JSON with no follow-up step; it
captures markup, computed styles AND the matching stylesheet rules; it records honest gaps when a
target never rendered; and it checks a hard denylist before every click — **never** delete, upload,
play, stop, send, save or submit.

**Do NOT build the features from guesses.** The one thing that has not changed is that inventing a
data source is forbidden. Capture first, then build from what came back.

**CHECKED 2026-08-15 — the two live collections on disk do NOT cover three of these four, and that
is now verified rather than assumed.** `collect-manage-2026-08-08T20-16-32-687Z.json` and
`scripts/collect-account-2026-08-08T20-19-23-396Z.json` (both in `Desktop/new-room`, both real
captures of `protradingroom.com`, all six manage tabs twice each) were read end to end for these
gaps. `selectAvatar`, `vidPath`, `recs`, `maxCapacity` and `recorded_max`: **zero occurrences in any
capture in either file.** The only two `avatar` hits are the `hideAvatars` and `altChatRender`
setting labels on the manage page, not the Avatars page. So T5-16, T5-17 and T5-20 genuinely need a
new run against routes these two never visited — they are `manage` and `welcome` only. T5-27 is the
one they DO reach, and what it needs is a room precondition rather than a better script.

**T5-20 keeps one specific warning:** do not substitute the roster size for occupancy. The number who
ever registered is not the number ever simultaneously present.

- **T5-16 — the Recordings page.** Needs an endpoint behind `recs`: `vidPath`, `contentType`, `name`,
  `created`, `length` (MILLISECONDS — the reference renders `length/60000` to two decimals).
- **T5-17 — the Avatars page.** Needs the avatar set behind `avatars`, and the endpoint
  `selectAvatar(avatar)` posts to.
- **T5-20 — nothing writes `recorded_max_capacity`.** Column, reader and reset all exist (migration
  `0011`). A high-water mark needs LIVE occupancy and the controller receives no occupancy signal.
  **Do not substitute the roster size** — the number who ever registered is not the number ever
  simultaneously present.
- **T5-27 — `badges.dark_theme` is an ID, not a boolean.** PROVEN by
  `page.welcome.html:1191-1211` (`ng-if="roomBadge._id === b.darkTheme"`). The storage and the
  display are evidenced; the PICKER that sets it is not. Migrating now would leave a column nothing
  can write — the same defect as T5-20. **Plan:** a nullable
  `dark_theme_badge_id INTEGER REFERENCES badges(id)`; keep the boolean as superseded, since
  migrations are forward-only; true→null is the only honest backfill.

#### D. One is a decision about a control the REFERENCE ships broken.

- **T5-18 — the recordings "Share" button has no handler of any kind.** It renders and does nothing.
  This repository forbids shipping a control whose only effect is its own presence, so a faithful
  rebuild has to choose. **Recommendation: omit it and record why**, the same call already taken for
  the Stripe Details link. Moot until T5-16 exists.

### Not an evidence gap — missing work, recorded so it is not lost

| #   | what                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | severity                                          | written up                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q   | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | blocks the first WordPress customer               | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| R   | **Screenshare quality and the MP4 question — the RESEARCH was already here; the recorder half is now implemented, three rows remain.** The owner's memory was of `apps/room/docs/streaming-choices.md`, written 2026-08-05 — a measured, evidence-tagged ranking of ten options. It is byte-identical to the copy in `new-room`, so there was nothing to pull. **Done 2026-08-10: row 4.** The recorder was `new MediaRecorder(stream)` with NO options, taking the browser's ~2.5 Mbps default; it now picks VP9 explicitly at 8 Mbps (`src/lib/recording-codec.ts`, 10 tests). Row 4's own table is why — on realistic chart content VP9 produces **3841 kbps at an 8 Mbps cap and 6414 at 16**, while H.264/mp4 **saturates at ~2033 and ignores a higher cap**. 8 rather than 12 Mbps because row 4 warns a second 1080p encode competes with the live encoder. **MP4 arrives automatically on Safari** (it produces `video/mp4` natively and is last in the preference list); making it universal without losing ~1.8 Mbps of detail needs server-side remux, which is row 10 and needs the transcoding workers `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. **Also done 2026-08-10: row 2.** `contentHint = 'detail'` is now set on the captured screen track — the doc's "strongest remaining candidate", chosen on the wire measurement: full 1920x1080 arrives with `qualityLimitationReason: none` and cumulative `bandwidth: 0, cpu: 0`, so nothing is throttling and the only lever left is telling libvpx the content is text rather than camera video. Its COST is still unmeasured (it may raise the bitrate, and under real congestion it trades frame rate for resolution), and it is a divergence — the capture sets the hint on its alert-overlay canvas, never the raw screen track. Reverting is deleting one line. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth, and it diverges from a byte-identical constraint) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both were deliberately NOT taken without the measurement, and both need the same one: **`apps/room/docs/MEASURE-SHARE-QUALITY.md`** — a written procedure, ~5 minutes, needing a human because `getDisplayMedia` requires an OS screen-picker dialog that browser automation cannot click. Attempted 2026-08-11 and abandoned: `chrome://webrtc-internals` lists every page in the BROWSER, and six Simpler Trading tabs plus two ChatGPT tabs were each contributing their own connections. The doc says which tabs to close, in what order, and what each possible result would mean. **The measurement that settles all three is one thing: a presenter sharing a REAL desktop with a member attached, reading `outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps figure is not the real number. | quality; owner-visible                            | `apps/room/docs/streaming-choices.md`, rows 2, 6, 8                                                                                                                 |
| S   | **The room-side login page is BUILT, 2026-08-14 — the room renders `app-session-login` on every entry, as the reference does.** The reported divergence is gone: Launch no longer drops you straight into the room. `/session?id&jwtSite` is a PAGE now, not a redirect; it verifies the handoff, prefills name and email from the token, marks the email read-only, and waits for `Login` — because the reference never auto-submits either (`doLoginCheck()` has exactly four callers, all click or submit bindings). **The A/B question I put to the owner was WRONG and the dumps answered it:** `webinarPW` appears NOWHERE in the room bundle, so the reference does not hold the room password in the browser at all — `loginToRoom()` posts the typed value and its SERVER decides. Ours does the same through `internal/room-entry/[code]`, which runs the SAME `decideRoomEntry` the guest door uses, so there is one entry decision rather than two. The five settings that DRIVE the page now cross (`showPasswordField`, `usernameInstructions`, `hasRequiredPhoneInLogin`, `customEnterDisclosure`, `disableEditingUsername`), each read in the bundle at a cited byte offset — the four-edit process, 56 wired. **One deliberate narrowing:** `banIPList` DOES cross to the reference's room and is checked in its browser; ours checks it server-side only, because a ban list in a browser hands every banned address to every visitor and the server decision is authoritative regardless. **STILL OPEN, and it is the guest path:** the controller's `/session/[code]` form and this page are now two forms for a guest, where the reference has one. The room is the reference's only form, so the controller's guest door should become a token-minting step — that is the next unit and it needs no new evidence. | MEDIUM — the launch path matches; the guest path shows two forms | this row |
| X   | **ONE settings-modal checkbox remains, and it is blocked on architecture rather than on effort.** Row X started at thirteen on 2026-08-14; twelve are closed. **`visibility-change-enabled` was CLOSED 2026-08-14** — item AA had deferred it, and AA's objection was right about the ROSTER half and only that half: `unloadRoster`/`loadRoster` gate a five-second POLL upstream, ours is SSE-pushed, so reproducing it would leave a hidden tab holding a stale roster. The CHAT half is the reverse and was worth more here than upstream: a hidden tab was doing a full page load per message posted, because this room re-reads its log on every SSE event. Now it skips the refetch while hidden, keeps the mention path alive, and catches up once on return — `appHasFocusGetChatLog`. Defaults OFF, a stated divergence: the reference ships `visibilityChangeEnabled:!0`, but upstream's hidden branch skips an array append and ours skips a network read, so nobody is opted in silently. **`app-recording-preview-window` (`recPreviewWindow`) is the last one, and it is BLOCKED — proven, not assumed.** The image src is `${sessData.recPreviewLocation}?${Date.now()}` polled every 1000ms, and `recPreviewLocation` is set by the SERVER on the command channel — `case "setRecPreview": globals.sessData.recPreviewLocation = i.url` (bundle byte 1023704). It is not a manage-page setting and nothing else writes it. The component's OWN gate is `videoOnlyMode || !isPresenter || !recPreviewLocation || !recPreviewWindow` → do nothing, so without a server snapshot it correctly renders nothing. This room records CLIENT-side with `MediaRecorder` — the declared divergence in item R — so no snapshot exists and no `setRecPreview` ever arrives. Building it would ship a component that cannot run; producing the frame locally instead would invent a mechanism the reference does not have, and its own heading says "DELAYED UPTO 20s" because the snapshot is generated server-side. **THE BLOCKER IS NAMED WRONG EVERYWHERE, AND 2026-08-14 FOUND WHAT IT ACTUALLY IS: a MediaMTX cluster.** Every row that touches recording — this one, AC, and row R's row 10 — says "server-side recording", which reads as something to be BUILT. It is not built from scratch either: the reference hands recording to **MediaMTX**, an off-the-shelf media server — `this.useMTX = this.globals.sessData.useMediaMTX` (bundle byte 1115350) — and the manage page carries three settings for it, all inside the reference's own **`dont-touch`** group — `useMediaMTX` ("Use MediaMTX?"), `mediaMTXClusterID` ("MediaMTX ClusterID") and `backupMediaMTXClustterID` (typo upstream's). A ClusterID and a BACKUP ClusterID mean a managed media tier with its own identity, not a process beside the SFU. **And client-side recording is NOT our divergence:** `startRecFromMuser` branches `mtxStreams.length > 0 ? sendServerAdminCommand('startRecMtx', {streams}) : this.mediaService.startRecForMuser(null)` (byte 2524230) — upstream records in the browser too whenever no MTX stream exists, which is exactly what this room does. So `MediaRecorder` here reproduces a real upstream path rather than diverging from it, and item R's description of it as "a declared divergence" is wrong. **CORRECTED 16:20 — there is no client-side publish to write.** An earlier draft of this row said the client publishes to MediaMTX over WHIP. That was inference from two strings in one bundle and reading them disproved it: every `WHIP` site is the OBS-ingest panel ("stream directly from OBS into this room… get your WHIP streaming link", byte 2142400), a different feature. What the MTX path does is narrower — `mtxStartStream`/`mtxStopStream` are SERVER→client notifications, and the room pushes each into `mtxStreams` and renders it as a stream TAB (`selectStreamTabOfId`, byte 1137850). The client only OBSERVES streams the server already holds and asks the server to record them. **How a stream reaches MediaMTX is not established by the client bundle and is not claimed here.** **So this row needs an infrastructure decision and no room code at all:** stand up MediaMTX, at which point `setRecPreview`, `stopRecMsg` and row R's server-side remux become reachable together. | LOW — cannot run without a MediaMTX cluster | this row; `visibility-change-contract.test.ts` |
| G   | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | decide before real volume                         | not yet written up                                                                                                                                                  |
| H   | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | before real users                                 | supersedes `NEXT-SESSION.md` §4c                                                                                                                                    |
| E   | **The seam probe has still never been RUN, and its instrument is no longer in the repository.** The blocker this row was written about is GONE: `apps/room/.env` now exists and its `ROOM_JWT_SECRET` matches the controller's (2026-08-15). What replaced it is smaller and more awkward — `room-config-seam-e2e.mjs` lived in `apps/room/scripts/`, which was evicted on 2026-08-15, so the probe is **untracked and absent from a fresh checkout** (verified: `git ls-files` returns 0, and the path does not exist in a clean worktree). It is one of the 30 npm entries pointing at untracked files, recorded at the top of this file. **Still true and still checkable:** the probe declares `CONTROL=http://localhost:5180` while the controller's dev port is **5173** — `apps/controller/vite.config.ts:17` (`const localPort = 5173`), re-verified 2026-08-15, and the comment there says the room's `CONTROL_BASE_URL` must name that exact port. Port 5180 is a different project (`Desktop/trick-trades`), which a first run actually reached — `/register` answered 404. What the gates DO have behind them meanwhile: `chat-alerts-gates-contract.test.ts`, 13 assertions read out of the decoded component at runtime, with four negative controls each seen red and restored. What is missing is only the last mile — a browser observing a column leave the DOM when an owner ticks the box. | MEDIUM — the two gates are tested but not rendered | this row; the probe, wherever it now lives |

| W   | **The user-info / session-control modals raise the reference's exact alert and send nothing — a family, not a one-off.** Found 2026-08-15 while building `unmuteChat`, by READING `handleUserAction` in `+page.svelte` end to end rather than searching it. The handler ends in a `Record<string, string>` named `exactAlerts` that maps an action straight to its toast; several branches above it do the same with a prompt in front. **`unmute-chat` is now fixed** — it posts to a real action, deletes the live `chat_mutes` row and tells the member on `privCmds` (`unmute-chat-contract.test.ts`, 14 assertions, negative control seen red). **These were read in the same pass and are still toast-only, listed with what each currently does and nothing inferred:** `kick` and `kick-ban` (prompt, then `User kicked OK`); `kick-duplicates` (prompt, then `No duplicates found for …` — a hard-coded negative result, so it reports "none" even when duplicates exist); `admin-notes-password` (prompt, then `Wrong password!` unconditionally, so the correct password is also refused); `session-send-users-url` and `session-send-sales-image` (URL prompt with the real `http`/`https` validation, then `Command send OK.`, the reference's own typo, and no send). Their wire commands are `kickUser`, `sendUsersToURL` and `sendSalesImageToChat` in `docs/decoded/missing-commands-triage.md`, each already carrying payload, byte offsets and verbatim strings — so these are ports, not research. **`mute-chat-24` is the instructive one:** the SERVER half exists and works, reached from the message context menu via `runMessageOperation(…, 'mute24')`; only the modal's copy of the button is inert. That is exactly the shape `unmuteChat` had. **Not claimed here:** whether `save-permissions`, `restart-audio` and `force-reload` are sent from some other path was not checked — only their entry in this table was read, and `forceReload` demonstrably does exist as a `privCmds` command, so at least one of the three has a real wire somewhere. Check before porting. **Severity is about the lie, not the absence:** every one of these reports success, so a presenter believes the kick landed and the member is still in the room. | **HIGH — controls that report success and do nothing** | this row; `docs/decoded/missing-commands-triage.md`; `apps/room/src/lib/unmute-chat-contract.test.ts` |

| AE  | **`+page.svelte` was 13,663 lines and is 9,605, and the rest of the gap is the SCRIPT, not the template.** **MEASURED 2026-08-16 06:07, not estimated: the `<script>` block is 8,627 lines and the template is 978.** Phase 4 moved that pair by 7 lines and ALL SEVEN came off the template — the script did not change by a single line, which is the clearest statement of the point below that any of these numbers make. That is the number this row now turns on, and it CORRECTS THE APPROVED PLAN'S ARITHMETIC rather than reporting progress against it. The plan expected Phase 1 (state classes) to take the file to ~5,500 and Phase 2 (template into components) to take it to ~1,700. Phase 2 delivered in full — the template went 4,251 -> 978 across Phases 2 and 4, every pane of the room is its own file, and there is essentially no template left to extract. Phase 1 did NOT: eight state classes moved 13,522 -> 12,938, about 584 lines, because what they moved was DECLARATIONS while the 268 function bodies stayed. So the ~1,100 target is not reachable by any amount of further component work, and anyone measuring this row's progress by counting components will conclude it is nearly finished when the remaining 8,627 lines have barely been touched. **WHAT IS ACTUALLY LEFT is the orchestration in that script block** — the SSE handler, the command dispatch, the media transport, the file and alert commands — and it needs its own plan, because the Phase 1 pattern (state behind getters in a `.svelte.ts` class) is the wrong shape for a 577-line event handler. **This is a standing breach of this repository's own first rule.** Raised by the owner 2026-08-15 in these words: *"in svelte 5/sveltekit no file should have anything near 12,000 lines… that means what has been set as the standard since the very beginning, which is to follow svelte's best practices, is not being implemented"* — and *"that's what svelte was designed for, to break large files into smaller components so it's easier and faster to execute."* Both are correct. **Measured, not estimated:** `+page.svelte` 13,663 lines of which the `<script>` block is **9,410** (lines 1–9,411) and the template 4,251; `ModalHost.svelte` 5,985; `+page.server.ts` 3,233. Those two `.svelte` files are **46% of every line of Svelte in the repository** (42,520 total). The mass is NOT markup — it is nine thousand lines of TypeScript orchestration inside a component, which is exactly what `.svelte.ts` rune modules and child components exist to prevent. Note the repo has been extracting *pure* logic correctly all along (`alert-filter.ts`, `alert-labels.ts`, `media-elevation.ts`, `screen-volume.ts`), which is why what remains is the stateful half nobody took. **WHY IT NEVER SHRANK, and the thing that makes fixing it dangerous: 46 of 112 room test files read `+page.svelte` as raw TEXT, and 17 read `+page.server.ts`.** Adding one more handler to the existing file is always cheaper than creating a module, and nothing said no. Worse, when a region is extracted, positive assertions fail loudly (fine — that is a migration telling you where to go) but **negative assertions (`not.toContain`) start passing for the wrong reason**: the text is absent because the region left, not because the guard still holds. `unmute-chat-contract.test.ts` carried one such assertion, **and it went vacuous for real on 2026-08-15**: it sliced `+page.svelte` for `const exactAlerts` to prove the unmute had left the toast-only table, the table moved to `user-action-intent.ts` at 12:56, the slice found nothing, and the guard passed against the empty string. It shipped that way and was caught at 13:07 by READING the file — not by any test. Fixed the same commit: it now reads the file that owns the table and asserts the table was FOUND first. **This is the predicted failure mode occurring four hours after it was predicted, which is the measure of how easily it happens.** **DONE 2026-08-15 12:22 — the ratchet, so it cannot grow while the extraction proceeds:** `source-size-contract.test.ts`, 57 assertions, ceilings that only ever go DOWN plus a staleness check so a ceiling cannot be left far above the real figure and silently license growing back; both halves negative-controlled and seen red. It also requires every text-reading contract test to make at least one POSITIVE assertion. **AGREED PLAN (owner, 2026-08-15): ratchet first, then script extraction, and the refactor runs BEFORE resuming the remaining reference-match ports** — every command still to port would otherwise add more lines to these same two files, and row W alone is six more handlers. Slices, each one moving its own contract assertions to the new module and lowering the ceiling: (1) media / mic / screen orchestration → `room-media.svelte.ts`; (2) modal + user actions → `room-actions.svelte.ts`; (3) SSE / event dispatch → `room-events-client.svelte.ts`; then the template into components. **Rule for every slice: migrate the tests with the code, and re-point every `not.toContain` at the file that now owns the thing — an extraction that leaves them behind turns guards green at the exact moment they stop guarding.** **RUNNING TOTAL, measured 2026-08-15 14:40:** `+page.svelte` **13,663 → 13,529**, (below where it stood before the one ceiling raise), `ModalHost.svelte` **5,985 → 5,983** (its first movement, downward), `+page.server.ts` **3,233 → 2,473 (−760, a 24% reduction)**, sixteen modules extracted (`room-mtx.svelte.ts`, `media-capture-error.ts`, `user-action-intent.ts`, `chat-mute.remote.ts`, `mobile-pin.remote.ts`, `log-pages.remote.ts`, `private-chat.remote.ts`, `presenter-commands.remote.ts`, `for-all-broadcast.remote.ts`, `recording-state.remote.ts`, `chat-mode.remote.ts`, `chat-plain-text.ts`, `files-pane.remote.ts`, `composer-image.remote.ts`, `server/remote-command-harness.ts`, `mediumDate` into `message-formatters.ts`), plus `presenterRoom()` in `$lib/server/auth.ts` and `chatModeConfirmPrompt()` in `$lib/chat-mode.ts` — the presenter gate + tenant scope as ONE call, shared by both broadcast modules. suite 1,530 → **1,636 across 122 files**, ten remotes registered and every client id read out of the built bundle. **The `+page.svelte` ceiling was RAISED once, 13,551 → 13,561**, recorded in `source-size-contract.test.ts` with its reason: the remote-function conversion is −42 across the two capped files but costs the component ten lines of comment at the first call site, and shaving the explanation to hit a number is the tail wagging the dog. It does not move again. **NEXT: remote functions, smallest call site first** (owner, 2026-08-15). DONE: `unmuteChat` (command) and `getMyMobilePin` (command — a READ that must NOT be a query, because query caches and this mints a fresh pin; `mobile-pin.remote.ts` carries the rule). DONE also: `loadOlderChatMessages` + `loadOlderAlerts` as the first `query` functions (pure reads; pagination-cache interaction checked and written up in `log-pages.remote.ts`). DONE also: the PRIVATE-CHAT TRIO (`loadPrivateChatLog`, `sendPrivateMessage`, `deletePrivateChatLog`) as one `private-chat.remote.ts` — converted as a FEATURE, not three call sites, which is the shape the rest should take. All three are commands INCLUDING the read: it is re-asked with the same argument on every conversation open, so a cache hit would be a stale thread. **They had ZERO test coverage — the full rewrite left the suite green — now closed by `private-chat-remote-contract.test.ts` (20 assertions, 4 negative controls).** DONE also: `presenterCommand` + `focusOnScreen` as `presenter-commands.remote.ts` — the first MULTI-CALL-SITE conversion (3 sites). The presenter gate was inlined by hand in BOTH actions in a file that already imports `isPresenterRole`; it is now `presenterRoom()`, declared once, returning the room from the session so the gate and the tenant scope cannot be applied separately. DONE also: `videoForAll` + `youtubeForAll` as `for-all-broadcast.remote.ts` — the presenter gate moved a SECOND time, out of `presenter-commands.remote.ts` and into `$lib/server/auth.ts`, because leaving it in one module would have recreated the duplication between modules instead of between actions. DONE also: `recordingState` + `changeChatMode` as TWO modules (`recording-state.remote.ts`, `chat-mode.remote.ts`) — not one, because they are two features that only looked alike: recording is momentary and stores nothing, the chat mode writes a row because a late joiner has to find the chat disabled. Two non-move changes recorded at both ends: `recName` now REFUSES over 200 chars where the action silently `.slice(0,200)`-ed it, and the mode allow-list is `z.enum(CHAT_MODES)` derived from the exported constant rather than a restated `isChatMode`, with `ChatMode` typed all the way out through the modal prop and both radio handlers. **Two defects found by doing it, both fixed:** (i) `requestSessionChatMode` interpolated the RAW LETTER, so the session modal asked "change the chat mode to p" while the settings modal asked it properly — one `chatModeConfirmPrompt` in `$lib/chat-mode.ts` now, called twice; (ii) `chat-mode-contract.test.ts` sliced the action out of `+page.server.ts` with an end marker (`getMyMobilePin: async`) that had ceased to exist, so `indexOf` returned -1 and four assertions ran against the whole rest of the file while staying GREEN — the same family as the `exactAlerts` vacuous slice, and there is nothing to slice now that the command owns a file. **This was also the first conversion the ratchet did not let through on comment-moves alone** (15 over), and it was paid with a real extraction — `$lib/chat-plain-text.ts` (`stripHtmlToText`, pure, twinned with a server derivation, never executed by a test until now). **THE REMOTE-FUNCTION CONVERSION IS FINISHED, 2026-08-15 15:25.** Twelve conversions, sixteen remote functions, **ZERO `fetch('?/action')` call sites left in `+page.svelte`**. Grouped by FEATURE and split on the GATE — a function that can reach another account or another room never shares a module with functions that cannot. Modules: `chat-mute`, `mobile-pin`, `log-pages`, `private-chat`, `presenter-commands` (+`giveMicScreen`), `for-all-broadcast`, `recording-state`, `chat-mode`, `files-pane` (+`uploadFile`), `composer-image`, `user-settings`, `username`, `chat-messages`, `alert-questions`, `post-alert`, `message-actions`. **WHAT THE CONVERSION WAS FOR — every one of these was invisible while the two halves sat eighty lines apart:** `mute24` did not mute (`replyMessage` never checked `chat_mutes`, so a muted member could reply into the same log); length bounds applied to one path of four; the chat-mode confirm was spelled two ways and one showed the raw letter `p`; `kind` accepted any string and meant "chat"; `deleteFile` was a SELECT-then-DELETE TOCTOU; `saveTheme` silently coerced anything unrecognised to `light`; three copies of the reaction toggle and three of the html-to-text derivation, none ever executed by a test. **THE DEFECT I SHIPPED:** `presenterCommand`'s action was removed in `e708a0f` while `ModalHost.svelte` went on posting `fetch('?/presenterCommand')` — revoking a member's mic/camera/screens did NOTHING for three commits. Missed because I checked `+page.svelte` and concluded from that. **THEN I CLAIMED "ZERO CALL SITES REMAIN" AND THAT WAS FALSE TOO:** my sweep matched `fetch('?/`, a single-quoted literal, and four dispatchers build the endpoint with a TEMPLATE literal. Searching for the shape I expected, twice. **THE FIX IS `remote-call-sites-contract.test.ts`** — walks all of `src/`, asserts the four surviving dispatchers are exactly four and only ever shrink, and asserts **every action name each union can produce still exists**, which is the `presenterCommand` defect in the one form the compiler can never catch. Negative-controlled both ways. **THE UNBLOCKER was `$lib/server/remote-command-harness.ts`:** it establishes the request store Kit's server does, so a `command` is EXECUTABLE by a test against a live database exactly as an action was — ~90 behavioural assertions rewritten onto it rather than lost, built by READING four files in `@sveltejs/kit@3.0.0-next.16`. **RUNNING TOTAL:** `+page.svelte` **13,663 → 13,522**, `ModalHost.svelte` **5,985 → 5,982**, `+page.server.ts` **3,233 → 1,617 (−1,616, a 50% reduction)**, suite **1,530 → 1,661 across 124 files**, ceiling raised ONCE (on the first conversion) and every round since paid with a real module. **CLOSED 2026-08-15 15:30 by the owner: "everything is working on the app".** That is the runtime evidence the twelve conversions were missing — every converted path exercised in a real room, including the `presenterCommand` revoke that was dead for three commits. The browser-verification gap recorded against every one of these commits is closed on that confirmation; it is recorded as the owner's report rather than as a capture, which is what it is. **What remains is tracked as row AG, not here:** seventeen form actions behind four dynamic dispatchers, guarded by `remote-call-sites-contract.test.ts` and not yet converted. **THE DECOMPOSITION ITSELF IS NOW UNDER WAY — plan approved by the owner 2026-08-15, target 10-13x smaller (~1,000-1,350 lines), four phases: (1) a context spine of six room state classes, (2) five template components, (3) latch effects replaced by handlers at the arrival point, (4) residue. **PHASE 4 IS COMPLETE, 2026-08-16 06:07 (`class:` -> clsx): 162 directives across 25 files, zero left.** The plan said 44; that counted `+page.svelte` alone, before Phase 2 moved its template out. **The order question was settled by RENDERING both forms, not by reading the docs** — `class-clsx-equivalence.test.ts` compares every shape that occurs here across three condition sets, because this suite asserts exact captured class strings and `svelte/class` never states the join order. Static first, conditionals in written order, attribute omitted when empty. **My first instrument was WRONG AND REPORTED SUCCESS:** a hand-rolled tag scanner stopped after three tags in `+page.svelte` (an apostrophe in a JS handler broke its quote tracking) and reported `0 directives` for a file with five. Rewritten on `svelte.parse`. **The ModalHost ceiling forced real work for the first time** — the conversion is a net saving everywhere except that file, which grew 55 lines, so it was paid with the extraction the conversion had just exposed: the connectivity test's four rows were four 22-line blocks restating one pass/fail rule and one glyph rule four times, and are now one `{#each}` over `$lib/connectivity-status-rows`, whose rules had never been executed by a test. 5,982 -> 5,965. **Two Phase 4 items are deliberate NON-changes and stay that way:** the 8 copy-on-write `new Set()` sites (the autofixer's `SvelteSet` suggestion removes a per-toggle allocation and is NOT a correctness fix) and `<svelte:document>`, whose note already records why it is not an attachment. PHASE 1 IS COMPLETE, measured 2026-08-15 18:54 — EIGHT classes, not the six the plan named: `RoomPolls` (`d3b24fb`), `RoomMenus` (`abe9691`), `RoomSplit` (`62888f4`), `RoomRoster` (`a9db20d`), `RoomAlerts` (`4792f4c`), `RoomLogPages` (`45ee562`). SEVEN, not six: `RoomLogPages` was not in the approved plan and exists because reading the alerts pane found the SAME older-page machinery held twice in two shapes - scalars for alerts, per-channel maps for chat - with the arity as the only difference. It is the first slice that removed a duplicate rather than moving one. `+page.svelte` 13,522 -> 12,961; suite 1,661 across 124 files -> 1,789 across 130. `RoomChat` (`64ffd63`) and `RoomMedia` (`8fc98d8`) closed it. `+page.svelte` 13,522 -> 12,938; suite 1,661 across 124 files -> 1,826 across 132. WHAT PHASE 1 FOUND, beyond the extraction: two closers with two different lists; an uncited seventeen-figure literal now PROVEN to reproduce all four captured flex strings; the same older-page machinery held twice in two shapes; a mention router whose three inputs were 650 lines apart; and `isRecordingStarting`, a spinner indicator that was declared once, rendered once as `recIndicatorStart`, and set by NOTHING - so a presenter got no feedback between pressing record and the room confirming. All wired, all negative-controlled. TWELVE of my own instruments or expectations were wrong across the phase and every one was corrected in the test rather than in the source; a comment I wrote would have dropped a whole contract from CI, caught by `evidence-partition.test.ts`. THE STANDING GAP ACROSS ALL EIGHT COMMITS: no browser. Nothing has been exercised against a real room - no dragged gutter, no sorted roster, no microphone, no recording. Phase 2 should close it, because a mounted component is testable in a way a 13,000-line page never was. PHASE 3 IS DONE (3a-3d; see the record at the end of this row), and its plan has already been CORRECTED ONCE BY READING THE CODE - recorded here because a plan with a false premise is worse than no plan. 3a DONE (`cb65464`): the `visibilitychange` listener became a `<svelte:document>` handler, which `svelte/best-practices` names outright ("Avoid using onMount or $effect for this"); 13 effects -> 12; paid for by extracting the four captured navbar strings to `$lib/navbar-labels.ts` rather than raising the ceiling or shortening the explanation. THE CORRECTION: the plan claimed the three scroller effects are the docs' own autoscroll example and should become `$effect.pre`. THEY ARE NOT. That example uses `.pre` because it MEASURES the DOM before it changes (`div.offsetHeight + div.scrollTop > div.scrollHeight - 20`); all three of ours read NO DOM at all before their `tick()` - checked, all three come back NONE - and instead ask a flag that `trackAlertsScroll` maintains continuously. Converting them would buy nothing and change when three scroll decisions run. Their remaining latch (`count > previousAlertCount`) exists to tell an ARRIVAL from a re-render, and cannot be deleted while arrival is INFERRED from a count. So the order changes: `createSubscriber` FIRST so the arrival is the event, the scrollers after it, and `$effect.pre` not at all unless one later needs a measurement it does not take today. 3b DONE: the two `visibilitychange` listeners are ONE, and merging them found a real defect - a return to the tab WITH missed chat fired BOTH `invalidate('room:data')` and `invalidateAll()`, two loads for one event, because each listener was correct about its own concern and neither knew about the other. The merged handler issues exactly one either way. The contract test that covered this asserted "returning to a tab where nothing happened should cost nothing", which was true of the handler it read and FALSE of the page; it could not see the second listener. Rewritten. AND A GAP IN MY OWN CHANGE, found by a control rather than by reading: deleting `startRefresh()` left the WHOLE SUITE GREEN - a room whose five-second poll never restarts looks fine until somebody else speaks. Asserted in both directions now. **PHASE 2 IS COMPLETE, measured 2026-08-16 05:43. SIX components, not the five the plan named, and `+page.svelte` is 12,938 -> 9,612.** `PrivateChatPanel` (`e27956a`), `RoomSidebar` (`08247b4`), `RoomNavbar`, then the two most COUPLED regions last and deliberately so: `AlertChatArea` (`9d7a990`, 696 lines out, 45 props) and `PresentationArea` (`37ab9c2`, 1,335 lines out, ~100 props). `FilesPane` (`eb4685d`, 482 lines out, 22 props) is the sixth - not in the plan, and the reason it exists is that it was the one pane inside `PresentationArea` with no component of its own. **THE METHOD THAT MADE THE LAST THREE SAFE, and it is the transferable part:** write the component with an EMPTY `<script>`, run `svelte-check --output machine`, and take every `Cannot find name` as the prop list. A hand scan of these regions produces props for COMMENT TEXT - `data` appears twelve times in the alert/chat markup and not once as the variable, every hit a `data-bs-*` attribute - and it misses what is not an identifier: `screenVolume` is a SNIPPET and `captureVideoImage` is an import, both of which the compiler got right and a scan would not have. **THE REAL COST WAS NEVER THE COMPONENT - it was the contract tests**, 24 assertions across 13 files for `AlertChatArea` and 40 across 11 for `PresentationArea`, many asserting on BOTH the page's script and the pane's markup inside one test. Each needed two source constants with every assertion pointed at the file that owns its subject, and most came out STRONGER for it: a control split across two files now has its hand-off asserted as well. WHAT PHASE 2 HAS COST ME SO FAR, recorded because it is a pattern rather than three accidents: FOUR times a scan of a region for identifiers produced props for COMMENT TEXT (`user`/`viewer`, `toggleSpeechRecoHistory`, `decodedRecName`, `onstopsharingall`), and every one was caught by ESLint or svelte-check rather than by reading. The navbar also nearly shipped a real defect - `sidebarOpen` and `mobileNavOpen` are ASSIGNED inside that bar, so as plain props the hamburger would have animated while the sidebar never moved; they are `$bindable()` now. THE PHASE'S REAL DELIVERABLE IS NOT THE LINE COUNT - it is that a pane can be MOUNTED. Every contract test in this repository asserted on source text because nothing could be rendered in isolation; `PrivateChatPanel.test.ts` is the first mount test here and makes 25 assertions about the DOM, which is a class of question (does a member with two conversations see two rows?) that no amount of text-reading can answer. Each remaining component gets the same treatment. DEVIATION FROM THE APPROVED PLAN, recorded rather than quietly taken: PROPS, not `createContext`. The plan quoted `svelte/context` on module state being reachable by the NEXT user during SSR - but the eight state classes are instantiated INSIDE `+page.svelte`, so they are per-request already and there is nothing to leak. These are direct children; a context layer for a one-level hop is indirection with no reader. The condition for revisiting it is written into `PrivateChatPanel.svelte`: context earns its place when a pane grows children that need the same state. CORRECTED 2026-08-15 19:15 - the "no browser" line on this row was WRONG and the owner said so: the room has been tested, screen sharing and messaging included. That is the owner's report and it is runtime evidence; the same confirmation was already recorded at 15:30 and I went on asserting the gap anyway, which was a claim about someone else's work I had no basis for. THE HONEST REMAINING GAP IS NARROWER: no automated browser check runs in CI, so a regression is caught by a person rather than by the suite, and jsdom mount tests have no layout so they cannot prove a panel is draggable or positioned where the capture puts it - largest last, since each one teaches the next, and these are where the line count actually moves. THE PLAN'S SIX-ROW TABLE WAS WRONG ABOUT THREE FIELDS AND THE EVIDENCE SAID SO EACH TIME, which is worth carrying forward as the working method rather than as trivia: `talkingUsers` is media and not roster (its declaration sits between `micMuted` and `webcamMuted`, its writers are SFU audio-producer announcements, and the comment above it says "talking" means A MICROPHONE IS OPEN); `isLimitedPresenter` is what a member BECOMES when a presenter hands them mic and screen, so it is media too; and the alerts PAGING is not alerts machinery at all, because upstream renders ONE roomlog component for both logs switched on `logType` - moving the alerts half would split a thing that is deliberately one thing. All three wait for the class whose WRITER they belong to. Choosing the wrong owner for the convenience of one reader is a decision you then have to explain forever. THE PATTERN IS PROVEN AND IS NOT NEGOTIABLE PER CLASS: private `$state`/`$derived` fields behind getters in `src/lib/room/*.svelte.ts`; a `const` instance never reassigned (`svelte/svelte-js-files` - reassigned state cannot be exported; `svelte/context` - reassigning breaks the link); a test whose reactivity block mutates and flushes INSIDE `$effect.root` and asserts OUTSIDE it, because a wiring that renders once and then silently stops updating passes `svelte-check`, the suite AND `svelte-autofixer`; a negative control seen red; the ceiling lowered in the same commit; one class per commit with the app green at each. WHAT PHASE 1 HAS ALREADY PAID FOR ITSELF WITH: two closers with two different lists (`openModal` left three top-bar dropdowns over the modal, `closeFloatingMenus` left the emoji and GIF pickers open) - both preserved exactly, with a test asserting they differ; and an uncited seventeen-figure literal three lines from a cited one, now named `CAPTURED_ALERTS_PERCENT` and PROVEN to reproduce all four captured flex strings from the 11px gutter. TWO SIMPLIFICATIONS THE EVIDENCE REFUSED, recorded so nobody re-proposes them: collapsing the eleven menu flags to one `open: MenuName | null` (four of them are genuinely non-exclusive, so one field would be a UX change dressed as a refactor), and swapping `bind:innerWidth` for `svelte/reactivity/window` (`0` means "never measured" and is load-bearing for both SSR and the resize-refetch skip). THE MIGRATION RULE HELD: 13 assertions across 4 text-reading contract files failed loudly and were re-pointed at the file that now owns the thing, never deleted - and one negative assertion was made STRUCTURAL rather than relocated, because a `slice(indexOf(...))` guard is the exact shape that goes vacuous when text moves.** **3c DONE, and its plan was WRONG — recorded because a corrected plan is the deliverable here as much as the code.** The approved step said: the latch effects react to a server push arriving through `subscribeToRoomEvents`, so move them to the arrival point and the latches delete themselves; `createSubscriber` is the documented way to make that source reactive. **Reading `subscribeToRoomEvents` end to end says the opposite, on two counts.** (i) `data` has FOUR producers, not one: the SSE handler's `invalidateAll()`, the five-second poll's `invalidate('room:data')`, the reconnect catch-up on `source.addEventListener('open')`, and the visibility return. Move delivery into the SSE handler and every alert that arrives by the other three is delivered SILENTLY — precisely the ones that arrive while the stream was down, and the hidden-tab branch returns BEFORE the refetch, so the catch-up on return is the only thing that would ever deliver them and it is not an SSE event. (ii) `createSubscriber` does not apply: its documented job is integrating an EXTERNAL event-based system with Svelte's reactivity by making a getter reactive. `data.messages` is already reactive load data; there is nothing external to wrap, and it would not remove one latch, because the latches answer *which rows are new*, not *did something change*. **WHAT WAS ACTUALLY DONE, which is 3c's stated prize by a different route:** the three delivery effects each carried their own copy of one algorithm — `seenAlertIds`+`alertDeliveryInitialized`, `seenQuestionIds`+`qaNoticesPrimed`, `seenMessageIds`+`chatSoundPrimed`, two thousand lines apart, restating three times the rule that the first pass announces NOTHING. Now one `RoomArrivals` in `$lib/room/arrivals.ts`, tested once, with the rule negative-controlled. Six latch identifiers deleted from the page. **It is deliberately a plain `.ts` class and NOT a rune module** — nothing renders from these markers, and a `$state` set that an effect both reads and writes re-runs itself. **THE CONTROL THAT MATTERED CAME BACK GREEN, twice.** With the suite at 1,862, making the chat ding fire for your OWN messages, and making alert delivery re-toast the entire log on every load, BOTH left it entirely green. The class had unit tests; the page's USE of it had none. Closed by `arrival-delivery-contract.test.ts` (7 assertions, positive-first slicing), and the three controls re-run against it red. The first version of that guard also failed for a reason that was MINE — it encoded prettier's line break in the marker string; the source was rewritten to a named local so the guard reads a stable expression rather than a formatting accident. **3d DONE — the three scroller effects, which were the last latches the plan named.** Eight identifiers for one question asked three times (`alertsScrollInitialized`/`previousAlertCount`, `chatScrollInitialized`/`previousChatCount`/`previousChatTab`, and the extra column's three) are now three `RoomScrollFollow` instances. THREE INSTANCES AND NOT ONE SHARED MARKER is the load-bearing part: the columns have independent tabs, lists and reader scroll positions, so shared markers would let traffic in one column yank a reader out of another. **A REMEMBERED RULE BECAME STRUCTURAL:** `shouldAutoScrollForMessage` records that the alerts scroller must NOT take the viewer's `alwaysScrollToBottom` override, and that used to be a defaulted fourth argument you had to remember not to pass; it is now a constructor capability, so the alerts column has no argument left to pass by mistake. The contract test guarding it asserts on CONSTRUCTION now and is stronger for it. **A TERM THAT COULD NEVER CHANGE AN ANSWER, found by a control that stayed green:** both chat effects computed `initialized && !didSwitchChannel && count > previousCount`, and `didSwitchChannel ||` already short-circuits the return, so `isNewMessage` is only consulted when `didSwitchChannel` is false. `A || B || (C && !B && D)` reduces to `A || B || (C && D)`. Dead term, deleted, with the reasoning kept. **AND A CONTROL THAT STAYED GREEN FOR A WORSE REASON — MY TEST WAS WRONG:** making a DELETION count as an arrival left the suite green, because both count tests passed `readingHistory: true`, so `shouldAutoScrollForMessage` had already refused to move the reader and the count comparison decided nothing. Both now pass `readingHistory: false`. That is the SIXTH control this session that came back green, and the fourth where the fault was in my instrument rather than the code. **COUNTED RATHER THAN CLAIMED:** the page still holds 12 `$effect`s, the same 12 as after 3a — 3c and 3d removed LATCHES, not effects. What remains is the mention popup's `popupSeeded`/`lastPopupChatId`, deliberately not folded into `RoomArrivals`: it marks a POSITION in the server's ordering and re-seeds silently when that marker has been trimmed away, where an identity set would announce the whole log. `+page.svelte` 11,621 -> 11,593 across 3c and 3d; suite 1,853/133 -> 1,882/136. | **HIGH — the standard is not being met** | this row; `apps/room/src/lib/source-size-contract.test.ts` |

| AF  | **The html-to-plain-text derivation exists at least THREE times and nothing proves the copies agree.** Found 2026-08-15 14:05 while extracting `stripHtmlToText` out of `+page.svelte` into `$lib/chat-plain-text.ts` — by READING the function's own docstring, which states the agreement requirement and does not enforce it: *"The server derives it the same way and its derivation is the authoritative one — this is the optimistic copy, so the two must agree."* **What was actually read:** (1) `$lib/chat-plain-text.ts` (the client's optimistic body, moved this commit, now under test for the first time); (2) `isEmptyChatHtml` in `$lib/server/chat-html.ts` lines 89–100, which runs the identical three steps — `.replace(/<[^>]*>/g,'')`, `.replace(/&nbsp;/g,' ')`, `.trim()` — to answer a different question, whether a sanitised message is empty. **What was NOT read, and is the gap:** the server's own `body` derivation on the message-send path in `+page.server.ts`, which the docstring calls authoritative. Until that is read end to end it is not known whether there are three copies or two, nor whether the client's and the server's can ever disagree — and a disagreement here means the optimistic bubble a sender sees differs from the row every other member gets. **Blocks nothing today** and was deliberately not chased: the message-send path is the group whose conversion carries ~60 behavioural assertions against a live SQLite database, and widening this commit into it is how that gets half-done. **Next action:** read `sendMessage`/`replyMessage`/`askQuestion` in `+page.server.ts` in full before that group is converted, then either share one function or write down, in both places, why two derivations with the same body must stay separate. | MEDIUM — a silent divergence between what a sender sees and what the room stores | this row; `apps/room/src/lib/chat-plain-text.ts`; `apps/room/src/lib/server/chat-html.ts` |

| AG  | **Seventeen form actions are still reached from JavaScript, through four DYNAMIC dispatchers.** Found 2026-08-15 15:20 by `remote-call-sites-contract.test.ts` on its first run — and found only because the guard walks all of `src/` rather than one file. My own sweep had reported ZERO remaining call sites, twice, because it matched `fetch('?/`, a single-quoted literal; these build the endpoint with a template literal, `fetch(\`?/${action}\`)`. **The four, with what each can reach:** `submitPollAction` → `savePoll`, `deleteSavedPoll`, `sendPoll`, `sendPollAnswer`, `pollDone`; `submitNoteMutation` → the six session-note commands; `submitSwingCommand` → `swingAlertMsg`, `editSwingAlertMsg`, `deleteSwingAlertMsg`; `submitDayTradeCommand` → `dayTradeAlertMsg`, `editDayTradeAlertMsg`, `deleteDayTradeAlertMsg`. **Why this is the WORST form of the defect and not a lesser one:** a literal `'?/savePoll'` is at least greppable; an interpolated name is assembled at runtime from a union type, so nothing — not the compiler, not a search, not the build — connects it to the action it reaches. Delete the action and the call site keeps compiling and starts doing nothing, which is exactly what `presenterCommand` did for three commits. **GUARDED, NOT FIXED:** the contract test asserts the four are exactly four (counted from the code, not trusted from its own table), that the list only ever shrinks, and that **every action name each union can produce still exists** — negative-controlled by renaming `savePoll` and watching it go red. So the class cannot recur silently; the work is simply not done. **Converting them follows the settled rule:** by FEATURE, split on the GATE, with each behavioural test rewritten onto `callRemote` rather than re-pointed as text. Notes and polls are the two coherent features; swing and day-trade alerts are a third and fourth that already share `notes-command.ts` schemas. | MEDIUM — guarded, so it cannot rot silently; still seventeen endpoints named by strings | this row; `apps/room/src/lib/remote-call-sites-contract.test.ts` |

## Scope — what is NOT being matched

- **The homepage / marketing site is being rewritten and redesigned.** It is the one surface where
  matching the reference buys nothing, because it is being replaced. Do not spend audit effort on
  `(public)/+page.svelte` or its sections.
- **The marketing screenshots go with it.** `ptr_descrived_perspective.png`, `ss3.png` and
  `user_comments.png` are photographs of the ORIGINAL's interface. Renaming the files would not
  change what is inside them, and they will be retaken against this product once the room is live.
- **Fidelity still matters everywhere else** — the admin, the account page, the manage page and the
  room. Those are the product; the homepage is a brochure.

---

## Not gaps — decisions taken deliberately

Recorded so nobody "fixes" them back:

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
  navbar's copy. The navbar keeps the captured ids exactly; the overlay takes
  `screenTalkingPresenter{i}-donot-disturb`. Same rule as the `aria-selected` and `tabindex`
  divergences in `ScreenTabs.svelte` — a captured value is reproduced unless reproducing it locks a
  real person out — and unlike the duplicate `id="dropdownMenuScreen"`, which costs a reader nothing
  and is kept. Pinned by `screen-volume-contract.test.ts`.
- **New Room is always visible.** The reference hides it behind five clicks on "Sessions"
  (`ng-show="showNewRoom>=5"`). Ours does not, by the owner's decision — an account at zero rooms
  otherwise has no visible way back. Pinned by `account-new-room-reveal.test.ts`.
- **A save shows a toast.** The reference appears to show nothing (gap 2). A silent success is
  indistinguishable from a dead control, which is the exact complaint that produced this rule.
- **Failures render.** Both the account page and the manage page had `fail()` paths that rendered
  nothing — 22 and 43 respectively.
- **The editor toolbar stays enabled.** See gap 3.
- **Marketplace is not a tab.** It is not in the captured strip; it stays a routable pane reached
  from its own buttons so they are not dead controls.
- **AngularJS directives are not reproduced** — `ng-click`, `ng-repeat`, `ta-button`,
  `dropdown="dropdown"`. They render nothing. `data-menu-control` replaces the last of these because
  the outside-click closer needs a hook and TypeScript rejects `dropdown` on a div.
| AC  | **`stopRecMsg` browser Notification — the server does not send it. RE-AUDITED 2026-08-14 and the premise HOLDS**, which is worth recording because three sibling rows did not. Every occurrence checked: `stopRecMsg` appears three times in the bundle and its only emitter is the SERVER command switch — `case"stopRecMsg":this.guiEventBus.emit("stopRecMsg",i)` (byte 1014265). The subscriber is `app-room`: `-1!=i.data.indexOf("Stopped")?alertsService.error(i.data):alertsService.info(i.data),new Notification(i.data,{body:i.data})` (byte 2501954). The payload is server-GENERATED text, not a client event, so a client-side recorder cannot produce it: our `recordingState` action broadcasts `startRec`/`stopRec`/`pauseRec`/`resumeRec` with no message body, and nothing here writes the sentence the notification would display. **The producer is the MediaMTX path, established 2026-08-14 — see row X.** The presenter asks with `startRecMtx {streams}` / `stopRecMtx`, and the SERVER answers on the same channel with `startRec`, `stopRec`, `pauseRec`, `resumeRec`, `setRecPreview {url}` and `stopRecMsg {data}`. Those six are the server's half of one conversation, so `stopRecMsg` arrives when a MediaMTX recording stops and not before. **Closing it means a MediaMTX cluster**, the same infrastructure decision as row X and row R's row 10 — one decision unblocks all three. | LOW — cannot run without a MediaMTX cluster | this row |
