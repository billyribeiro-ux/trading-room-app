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

## ⛔ THREE THINGS THE FIRST CI RUN OF THE FRONTEND GATE EXPOSED — 2026-08-14 22:54 EDT

`quality.yml` was built on 2026-08-14 and ran for the first time on PR #28. It is on the branch, NOT
yet on `main`. Its first run failed both jobs, and everything below is what that bought.

### 1. Room type-check — CLOSED 2026-08-14 22:50, and worth reading before trusting a green

Six `Cannot find module '$env/dynamic/private'`, pre-existing on `main`, invisible locally because a
stale `.svelte-kit` still held the old ambient types. Fixed in `7ea4b77`.

**The rule that came out of it: `svelte-check` is only evidence after `rm -rf .svelte-kit`.** A green
local check against a stale generated directory is not a green check, and it was reported as one
several times before CI contradicted it.

### 2. Controller unit tests — CLOSED 2026-08-14 23:06

Nine tests across five files held absolute paths under `/Users/billyribeiro/Desktop/new-room/`, so
they passed on the owner's machine and `ENOENT`d anywhere else. Two failed at SUITE level, because
the read was at module scope and threw during import before any guard could run.

**Copying the captures in was tried and REVERTED.** It works, and `.gitignore:45-47` forbids it in as
many words — they are dumps of a live room holding real names, addresses and in some cases a live
JWT. Recorded beside it: `privacy:verify` scans with `git ls-files --exclude-standard`, so it passed
on the copied dumps **without reading one byte of them**. A green privacy check says nothing about an
ignored file.

`reference-capture.ts` is the fix: one place that knows where the captures live, `hasCapture` for
`describe.skipIf`, and `readCapture` that names the file and the override when it throws. The
module-scope reads are guarded because `skipIf` never runs if the import throws first.

`PTR_CAPTURE_ROOT` overrides the location, which is what made this verifiable **without spending a
CI run**: pointing it at an empty directory reproduces exactly what a runner sees.

- with the captures: **964 passed**, 91 files
- as CI sees it: **943 passed, 21 skipped, 0 failed**, 86 files passed and 5 skipped

One silent pass was removed on the way: `account-page-sbs.test.ts` had `if (!existsSync(REFERENCE))
return;`, which made a missing dump a green test that compared nothing.

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

### 3. Backend quality — NOT OURS TO FIX: the runner is out of minutes

**Owner, 2026-08-14 23:00: the account has run out of CI minutes, and that is why these jobs fail.**
Nothing below is being worked on, and CI is not to be triggered again until the app is finished —
every push against an open PR starts a run and spends minutes that are not there.

Kept because it was diagnosed rather than guessed, and the diagnosis stands whatever the cause:

The Rust job fails all 27 integration tests with
`password authentication failed for user "ptr_clone_app"` (28P01).

**An earlier reading of this was wrong and is corrected here.** It looked like a `push` vs
`pull_request` difference. It is not: the PR runs that appear green **skip the entire gate** —
`Report a skipped backend gate` ran and both provisioning and tests show `skipped`. The gate is red
every time it actually executes, and has been on every push to `main`.

Provisioning is not the bug. `services/docker/postgres/10-provision-roles.sh` uses `\getenv` and
`format(… %L …)`, which is correct quoting for a password containing both `'` and `\`, and that step
reports success. The failure is at connect time in `api/tests/support/mod.rs:92` — inside
`services/**`, which is **a mirror**: "a change made here is lost on the next sync."

Owner's note 2026-08-14: this may be a **billing/quota** problem on the runner rather than a code
one. Not investigated further pending that.

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
| confirmed missing, with payload / gate / verbatim strings recorded | **25** |
| claimed missing then refuted — we already build it | 7 (+1 contested, resolved by reading) |
| built under another name — the audit cannot see these | 9 |
| third-party noise, not a PTR feature | 4 |
| unclear, needs a product decision, all media-server admin | 5 |

**Ready to build, fully specified:**

| item | spec | note |
| --- | --- | --- |
| Files sort bar | `docs/decoded/files-sort-bar.md` | verified offset by offset; NEW-TODO §2.1 had three errors and is superseded |
| ~~`presAreaTabs-recordings`~~ **BLOCKED** | `docs/decoded/missing-commands-triage.md` | NOT cheap after all. The reference's pane is one iframe onto a SERVER archive page; we have **zero recordings/archive tables** in either database, so the tab would front nothing. Needs an archive service first — a design decision, not a port |
| Alert Filter | `docs/decoded/alert-scheduler-filter-labels.md` | server owns the filtering; `showAlertsFrom` inverts allow-list vs deny-list |
| Alert Labels | same | not a wire feature; a JSON-string room setting plus a text transform |
| Alert Scheduler | same | needs an entitlement whose manage-page control was NOT located, and a server-side scheduler we do not have |
| Benzinga | `NEW-TODO.md` §2.2 | small; needs one more decode pass for the const-table classes |

**The control-plane question is answered.** `docs/decoded/control-plane-capture.md`: the reference
registers **31 ui-router states and not one is an operator surface**, and `states[*].data` is `null`
on all 31 — the reference expresses no authority in its router at all. There is no route-level role
model to copy, and the super-admin portal can only be designed, not matched.

### The rows below

What is left in the table is blocked on a decision, an environment, or an architecture this
deployment does not have — which is what the old sentence *meant* and should have said.

| row | what it needs | who or what unblocks it |
| --- | --- | --- |
| **P** | bookkeeping. PRs #20–#27 are MERGED. **#30 is open and must NOT be merged as-is** — it contains the Swing delete that could not delete (fixed on the branch, not in that PR), and its full gate has never run | a clean tree, then the gate |
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

**Row S closed 2026-08-14.** The room owns its login page again, the product has ONE entry form
rather than two, and the question I put to the owner turned out to have an answer in the bundle:
`webinarPW` is in no room code at all, so the reference validates the password on its server exactly
as this now does.

Seven rows were CLOSED today and removed from this file rather than struck through, because a row
that is not something somebody still has to DO does not belong in it — see the rule at the top. Each
one's record is in `CHANGELOG.md` under 2026-08-14: **Z** the unbounded chat and alert reads, **Z2**
the alert-question tenancy leak in both directions, **X2** the extra chat column, **AB** the chat
mode control, **V** — whose premise did not survive being read — **S** the room's login page, and
**AA**, which was already closed on 2026-08-12.

**Three of those rows were WRONG about their own subject**, which is the most useful thing this file
learned today: AB said the producer was not modelled when the consumer was the missing half; V said
a bandwidth saving was missing when the reference never made one; S framed a design decision that
the bundle already answered. A row is a hypothesis until it is re-read against the evidence.

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

As of 2026-08-14 09:21 EDT: **67 CLOSED, 6 OPEN, 14 parked/won't-fix, 87 total.**

**Everything closable by READING is closed.** The six that remain need something no source file
can give. Each is written out below with the exact next action, because "blocked" without an
instruction is just a note that something is unfinished.

---

### HANDOFF — the SIX still open, and exactly what each needs

Rewritten 2026-08-13 18:21 EDT, recounted 2026-08-14. It said twelve while the template read was
still running, then fourteen, and the prose disagreed with the tally line above it in BOTH
directions for a day. The items below count 0 + 1 + 4 + 1 + 0 = **six** after the 2026-08-14 browser session closed six and parked one, which is what the
tally says and what `evidence-gap-register-counts.test.ts` recounts from the register itself.
Section B reads "two" because one sentence unblocks two EDITS; only one of them (T5-24) is an open
register row. Every item says WHO does the next step and WHAT it is. **No item here
is waiting on more reading — the templates are exhausted.**

#### A. Nothing. All five closed 2026-08-14 by one browser session.

**T5-15, T5-21, T2-20, T2-7 and T2-22 are CLOSED.** Captures: `evidence-dumps/stripe-details-2026-08-14.json`,
`rendered-states-2026-08-14.json`, `rendered-states-welcome-2026-08-14.json`,
`rendered-states-login-2026-08-14.json`. **The only browser work left is T1-9/T1-10 in section E.**

That session found THREE defects in our own collectors, every one of which had been returning a
plausible result rather than an error — the scope walk that climbed away from the controller, the
denylist that matched `post` inside `POST_ROUTE_API_DOCUMENTATION.md`, and the login detector that
labelled the Add Admin User form as the login form. All three are fixed and asserted.

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

#### C. Four are NOT CAPTURED YET. Each needs one targeted collection script.

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
| **T5-27 `badges.dark_theme`** | the PICKER that sets it. Storage and display are already proven — `page.welcome.html:1191-1211` shows `ng-if="roomBadge._id === b.darkTheme"`, so it is an ID and not a boolean. Only the control that assigns it is uncaptured |

Rules for those scripts, from `~/CLAUDE.md` §3: one self-contained `.js` file pasted into the console
on the LIVE app; it detects whether the session is a member or an admin and records what that role
can and cannot reach; it drives itself to the target and downloads a JSON with no follow-up step; it
captures markup, computed styles AND the matching stylesheet rules; it records honest gaps when a
target never rendered; and it checks a hard denylist before every click — **never** delete, upload,
play, stop, send, save or submit.

**Do NOT build the features from guesses.** The one thing that has not changed is that inventing a
data source is forbidden. Capture first, then build from what came back.

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

#### E. Nothing. Both re-fetched 2026-08-14 and resolved.

**T1-9 CLOSED** — all 8 public-site images fetched, recorded in
`evidence-dumps/static-asset-manifest-2026-08-14.json` by url + bytes + sha256.
**T1-10 PARKED to Tier 4** — both room build assets soft-404'd a second time (HTTP 200, 52-byte body), which is
the condition this bucket set for parking them. Nothing is blocked: the room's real bundle is already in the
repository at `apps/room/docs/source/`, decoded into 194 component files.

**T1-6 was independently re-confirmed** by the same run — its three glyphicon fonts soft-404 as well, which is
what its existing "CLOSED AS NOT-DEPLOYED" status already said.

#### F. Nothing. This bucket is empty.

**T5-28 closed 2026-08-14** — it was already built; only a test was missing. Every remaining item
needs something from outside this repository.

### Not an evidence gap — missing work, recorded so it is not lost

| #   | what                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | severity                                          | written up                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P   | **STALE ABOVE THE FOLD, CORRECTED 2026-08-14 23:10: PR #22 merged long ago (`f0c2fdd`), and so did #23–#27.** `main` is at `6f4411e`. It is still RED on Backend quality, but for a DIFFERENT reason than this row was written about — the owner confirmed the account is out of CI minutes. The paragraph below is kept because its lesson is permanent and was earned the hard way. **The lesson is bigger than the bookkeeping: a green PR check has not been proving the backend.** That job's scope step skips every step on a pull request whose diff touches no backend path — by design, and documented in its own skip notice — so #19, #20 and #21 were each merged on a SUCCESS that was a skip. The first push to `main` set `backend=true`, the steps ran for the first time ever, and three latent defects fired at once: verifier paths that do not exist at the repository root, a `REPOSITORY_ROOT` computed one level up instead of three, and a `cargo tree --invert` missing `--target all` that reported a target-gated crate as having escaped its graph. All three are fixed in #22, which the gate runs IN FULL because the diff touches the workflow itself. **The characteristic remains after the fix and is worth knowing: a PR that touches no backend path still merges without running that suite, so `main` is where backend rot surfaces.** Treat a red `main` after a merge as expected-by-design and fix forward; do not read a green PR as proof the Rust and PostgreSQL contracts ran. | **HIGH until #22 merges — `main` is red** | this row |
| Q   | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | blocks the first WordPress customer               | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| R   | **Screenshare quality and the MP4 question — the RESEARCH was already here; the recorder half is now implemented, three rows remain.** The owner's memory was of `apps/room/docs/streaming-choices.md`, written 2026-08-05 — a measured, evidence-tagged ranking of ten options. It is byte-identical to the copy in `new-room`, so there was nothing to pull. **Done 2026-08-10: row 4.** The recorder was `new MediaRecorder(stream)` with NO options, taking the browser's ~2.5 Mbps default; it now picks VP9 explicitly at 8 Mbps (`src/lib/recording-codec.ts`, 10 tests). Row 4's own table is why — on realistic chart content VP9 produces **3841 kbps at an 8 Mbps cap and 6414 at 16**, while H.264/mp4 **saturates at ~2033 and ignores a higher cap**. 8 rather than 12 Mbps because row 4 warns a second 1080p encode competes with the live encoder. **MP4 arrives automatically on Safari** (it produces `video/mp4` natively and is last in the preference list); making it universal without losing ~1.8 Mbps of detail needs server-side remux, which is row 10 and needs the transcoding workers `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. **Also done 2026-08-10: row 2.** `contentHint = 'detail'` is now set on the captured screen track — the doc's "strongest remaining candidate", chosen on the wire measurement: full 1920x1080 arrives with `qualityLimitationReason: none` and cumulative `bandwidth: 0, cpu: 0`, so nothing is throttling and the only lever left is telling libvpx the content is text rather than camera video. Its COST is still unmeasured (it may raise the bitrate, and under real congestion it trades frame rate for resolution), and it is a divergence — the capture sets the hint on its alert-overlay canvas, never the raw screen track. Reverting is deleting one line. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth, and it diverges from a byte-identical constraint) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both were deliberately NOT taken without the measurement, and both need the same one: **`apps/room/docs/MEASURE-SHARE-QUALITY.md`** — a written procedure, ~5 minutes, needing a human because `getDisplayMedia` requires an OS screen-picker dialog that browser automation cannot click. Attempted 2026-08-11 and abandoned: `chrome://webrtc-internals` lists every page in the BROWSER, and six Simpler Trading tabs plus two ChatGPT tabs were each contributing their own connections. The doc says which tabs to close, in what order, and what each possible result would mean. **The measurement that settles all three is one thing: a presenter sharing a REAL desktop with a member attached, reading `outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps figure is not the real number. | quality; owner-visible                            | `apps/room/docs/streaming-choices.md`, rows 2, 6, 8                                                                                                                 |
| S   | **The room-side login page is BUILT, 2026-08-14 — the room renders `app-session-login` on every entry, as the reference does.** The reported divergence is gone: Launch no longer drops you straight into the room. `/session?id&jwtSite` is a PAGE now, not a redirect; it verifies the handoff, prefills name and email from the token, marks the email read-only, and waits for `Login` — because the reference never auto-submits either (`doLoginCheck()` has exactly four callers, all click or submit bindings). **The A/B question I put to the owner was WRONG and the dumps answered it:** `webinarPW` appears NOWHERE in the room bundle, so the reference does not hold the room password in the browser at all — `loginToRoom()` posts the typed value and its SERVER decides. Ours does the same through `internal/room-entry/[code]`, which runs the SAME `decideRoomEntry` the guest door uses, so there is one entry decision rather than two. The five settings that DRIVE the page now cross (`showPasswordField`, `usernameInstructions`, `hasRequiredPhoneInLogin`, `customEnterDisclosure`, `disableEditingUsername`), each read in the bundle at a cited byte offset — the four-edit process, 56 wired. **One deliberate narrowing:** `banIPList` DOES cross to the reference's room and is checked in its browser; ours checks it server-side only, because a ban list in a browser hands every banned address to every visitor and the server decision is authoritative regardless. **STILL OPEN, and it is the guest path:** the controller's `/session/[code]` form and this page are now two forms for a guest, where the reference has one. The room is the reference's only form, so the controller's guest door should become a token-minting step — that is the next unit and it needs no new evidence. | MEDIUM — the launch path matches; the guest path shows two forms | this row |
| X   | **ONE settings-modal checkbox remains, and it is blocked on architecture rather than on effort.** Row X started at thirteen on 2026-08-14; twelve are closed. **`visibility-change-enabled` was CLOSED 2026-08-14** — item AA had deferred it, and AA's objection was right about the ROSTER half and only that half: `unloadRoster`/`loadRoster` gate a five-second POLL upstream, ours is SSE-pushed, so reproducing it would leave a hidden tab holding a stale roster. The CHAT half is the reverse and was worth more here than upstream: a hidden tab was doing a full page load per message posted, because this room re-reads its log on every SSE event. Now it skips the refetch while hidden, keeps the mention path alive, and catches up once on return — `appHasFocusGetChatLog`. Defaults OFF, a stated divergence: the reference ships `visibilityChangeEnabled:!0`, but upstream's hidden branch skips an array append and ours skips a network read, so nobody is opted in silently. **`app-recording-preview-window` (`recPreviewWindow`) is the last one, and it is BLOCKED — proven, not assumed.** The image src is `${sessData.recPreviewLocation}?${Date.now()}` polled every 1000ms, and `recPreviewLocation` is set by the SERVER on the command channel — `case "setRecPreview": globals.sessData.recPreviewLocation = i.url` (bundle byte 1023704). It is not a manage-page setting and nothing else writes it. The component's OWN gate is `videoOnlyMode || !isPresenter || !recPreviewLocation || !recPreviewWindow` → do nothing, so without a server snapshot it correctly renders nothing. This room records CLIENT-side with `MediaRecorder` — the declared divergence in item R — so no snapshot exists and no `setRecPreview` ever arrives. Building it would ship a component that cannot run; producing the frame locally instead would invent a mechanism the reference does not have, and its own heading says "DELAYED UPTO 20s" because the snapshot is generated server-side. **THE BLOCKER IS NAMED WRONG EVERYWHERE, AND 2026-08-14 FOUND WHAT IT ACTUALLY IS: a MediaMTX cluster.** Every row that touches recording — this one, AC, and row R's row 10 — says "server-side recording", which reads as something to be BUILT. It is not built from scratch either: the reference hands recording to **MediaMTX**, an off-the-shelf media server — `this.useMTX = this.globals.sessData.useMediaMTX` (bundle byte 1115350) — and the manage page carries three settings for it, all inside the reference's own **`dont-touch`** group — `useMediaMTX` ("Use MediaMTX?"), `mediaMTXClusterID` ("MediaMTX ClusterID") and `backupMediaMTXClustterID` (typo upstream's). A ClusterID and a BACKUP ClusterID mean a managed media tier with its own identity, not a process beside the SFU. **And client-side recording is NOT our divergence:** `startRecFromMuser` branches `mtxStreams.length > 0 ? sendServerAdminCommand('startRecMtx', {streams}) : this.mediaService.startRecForMuser(null)` (byte 2524230) — upstream records in the browser too whenever no MTX stream exists, which is exactly what this room does. So `MediaRecorder` here reproduces a real upstream path rather than diverging from it, and item R's description of it as "a declared divergence" is wrong. **CORRECTED 16:20 — there is no client-side publish to write.** An earlier draft of this row said the client publishes to MediaMTX over WHIP. That was inference from two strings in one bundle and reading them disproved it: every `WHIP` site is the OBS-ingest panel ("stream directly from OBS into this room… get your WHIP streaming link", byte 2142400), a different feature. What the MTX path does is narrower — `mtxStartStream`/`mtxStopStream` are SERVER→client notifications, and the room pushes each into `mtxStreams` and renders it as a stream TAB (`selectStreamTabOfId`, byte 1137850). The client only OBSERVES streams the server already holds and asks the server to record them. **How a stream reaches MediaMTX is not established by the client bundle and is not claimed here.** **So this row needs an infrastructure decision and no room code at all:** stand up MediaMTX, at which point `setRecPreview`, `stopRecMsg` and row R's server-side remux become reachable together. | LOW — cannot run without a MediaMTX cluster | this row; `visibility-change-contract.test.ts` |
| G   | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | decide before real volume                         | not yet written up                                                                                                                                                  |
| H   | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | before real users                                 | supersedes `NEXT-SESSION.md` §4c                                                                                                                                    |
| E   | **The room↔controller seam cannot be exercised locally: `apps/room/.env` does not exist.** Found 2026-08-12 while trying to produce the RENDER proof for `hideChatAlerts` and `isChatOnlyRoom`. `scripts/room-config-seam-e2e.mjs` is the right instrument and now carries the assertions for both — it flips each setting on the Manage page and reads whether `.alert-chat-box` and `.presentation-box` are in the room's DOM — but it **has not been run**, and the reason is environmental rather than a defect in either application. Three separate things are missing: (1) `apps/room/.env` is absent entirely, and `.env.example` lists nine variables the room needs, of which `CONTROL_BASE_URL` and `ROOM_JWT_SECRET` are the two the seam depends on; (2) `ROOM_JWT_SECRET` is **not in `apps/controller/.env` either** (0 occurrences), so there is no shared HMAC secret on this machine and the room's signed request to `internal/room-config/<code>` could not be verified even if the room were pointed at the controller; (3) the probe's own defaults are stale — it declares `CONTROL=http://localhost:5180`, but the controller's dev port is **5173** (`apps/controller/vite.config.ts:17`, and the comment there says the room's `CONTROL_BASE_URL` must name that exact port). Port 5180 on this machine is a **different project** (`Desktop/trick-trades`), which is what a first run actually reached — `/register` answered 404. **Not fixed here because provisioning a shared secret is an owner decision**, and inventing one to make a probe go green is the opposite of what this file is for. What the gates DO have behind them meanwhile: `chat-alerts-gates-contract.test.ts`, 13 assertions read out of the decoded component at runtime, with four negative controls each seen red and restored. What is missing is only the last mile — a browser observing a column leave the DOM when an owner ticks the box. | MEDIUM — the two gates are tested but not rendered | this row; `apps/room/scripts/room-config-seam-e2e.mjs` §9 |

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
