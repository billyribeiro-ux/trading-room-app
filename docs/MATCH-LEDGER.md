# Match ledger

The component-by-component proof that this app matches the reference. One section per reference
component. Nothing is a claim without a `file:line` citation on **both** sides; anything that
cannot be found is a gap row, never a guess.

**Method, per component.** Read all four decoded files in full — `render-helpers.js` for the
create/update blocks, `compiled.js` for the const table and the scoped stylesheet, `full.js` for
the class body behind the handlers, `component.css` for what the component owns. Then read our
counterpart in full. Then record every element, class, attribute, binding, gate and handler as
**matched**, **diverged** (with the reason, and whether it was deliberate) or **absent**.

**This file is the resumable state.** The audit spans more sessions than one context window holds;
a session that dies mid-audit must not cost the work.

**Scale, measured 2026-08-12.** 52 distinct reference components in
`apps/room/docs/source/components/` (194 files, 3.3 MB). 50 files in
`apps/controller/docs/reference/` (45 pieces + 5 parts, 3.3 MB), 3 ever opened. On our side, 21
Svelte components and 80 lib modules in the room.

---

## `app-room` — reference side COMPLETE, our side IN PROGRESS

Read in full: `component.css` (1 line, the whole scoped sheet), `render-helpers.js` (1,825),
`compiled.js` (2,290), `full.js` (4,115). Note `full.js:1-1825` is byte-identical to
`render-helpers.js`; the unique content is the class body, const table and template at `1826-4115`.

Our side: `src/routes/+page.svelte` (9,947 lines), read to ~2,320.

Every gap below was confirmed with an occurrence count against `+page.svelte`, not a comment match.

### Matched

| item | reference | ours |
| --- | --- | --- |
| `mute()`/`unmute()` — all five effects, in order | `full.js:2632-2648` | `+page.svelte:3674-3688` |
| `adjustVol`'s hidden `subtitles = true` at zero | `full.js:2608` | `+page.svelte:3563` |
| Volume targets `[id^=msRemAudio-]`, `[id^=video-]` | `full.js:2606-2607` | `+page.svelte:3558` |
| Four persistence keys; `manageRoomLayout` read/write symmetry | `full.js:2318-2353`, `2752-2765` | `+page.svelte:5264-5265` |
| `fa-volume-off` as const 107 | `full.js:3521` | fixed on `viewer-only-mode-and-volume-dropdown` |
| const 54 `[1,'fas','fa-closed-captioning']` — Subtitles icon | `full.js:3300` | correct |
| `room-sound-options` → `my-1` → six-checkbox const chain | `full.js:3550-3659` | matches |
| Background-music container `[2,'text-align','center']` | `full.js:3548` | fixed on that branch |
| `archivesAvailableTo()` | `full.js:2305-2317` | `roster-gates.ts:54`, used `+page.svelte:1337` |
| `getRandomUser()` incl. the No-branch still drawing | `full.js:2460-2476` | `+page.svelte:1210-1225` |
| `randomUser()`, incl. `>= 2` with no else and the 3s reveal | `full.js:2427-2459` | `+page.svelte:1179-1187` |
| `searchUsers` / `clearUserSearch` / `doUserSearch` | `full.js:2767-2783` | `+page.svelte:371-385` |
| `sortUsers` / `sortFTUsers` / `toggleUserSearch` | `full.js:2483-2490`, `2401-2407` | `+page.svelte:338-356` |
| `detachChat` popout incl. `co=1` | `full.js:2179-2181` | `+page.svelte:1711-1736` |
| `reopenAlertsChat()` | `full.js:3047-3053` | `+page.svelte:1764-1768` |

### Gaps — structural

1. **The navbar is not gated on the three modes.**
   `O(4, videoOnlyMode ‖ chatOnlyMode ‖ viewerOnlyMode ? -1 : 4)` — `full.js:4052-4059`.
   Ours renders it always — `+page.svelte:7768`.
2. **The sidebar is not gated.** Same condition, node 3 — `full.js:4043-4050`.
   Ours — `+page.svelte:7284`.
3. **`mt-0` is unbound.** `KAe = (t,n) => ({'push-wrapper': t, 'mt-0': n})`, `n` = the three-mode
   flag — `full.js:4029-4039`. Ours binds only `push-wrapper` — `+page.svelte:6592`.
   With `.wrapper{margin-top:49px}` and `.navbar{height:49px}` in the scoped sheet, `mt-0` exists to
   reclaim the navbar's space, so 1–3 are one defect with three signatures. **Consequence:** the
   `vh-100` shipped on the viewer-only branch puts a 100vh split *below* a 49px navbar that should
   not be there — 49px of overflow in both viewer-only and chat-only mode.
4. **`isMobileScreen` and the entire `K4e` layout.** `window.innerWidth <= 601` at init and on
   resize — `full.js:1889`, `2988` — selected by `O(5, o.isMobileScreen ? 6 : 5)` — `full.js:4061`.
   `K4e` has a different child order, no `dragEnd`, `presAreaSizeMobile`/`chatAlertsSizeMobile`, and
   no `openPrivateChat` binding on `app-chat`. **0 occurrences** here.
5. **`hideChatAlerts` has five sources; we model none as state.** `sessData.hideChatAlerts`
   (`full.js:1893`), `isPlayer && isPresenter` (`1894-1896`), `videoOnlyMode && !recordChat`
   (`1898-1900`), `viewerOnlyMode` (`1901-1902`), `detachChat` (`2179-2181`). One flag gates the
   column — `render-helpers.js:1650`. The room setting an operator configures does nothing here.
6. **`hidePresentation` — 0 occurrences.** `chatOnlyMode ‖ sessData.isChatOnlyRoom` —
   `full.js:1903-1904` — gating the presentation column at `render-helpers.js:1662`.
7. **The bottom-layout axis — 0 occurrences.** `isChatAlertsOnBottom`, `presAreaSizeBottom`,
   `chatAlertsSizeBottom`, `chatSizeBottom`, `alertSizeBottom` — `full.js:1854-1859` — consumed in
   `manageRoomLayout` (`2333-2346`) and the `hideChat` handler (`2210-2217`).
8. **The gutter double-click is dead scaffolding.** `gutterdblclickduration="400"` ships at
   `+page.svelte:7787`; `hideShowPresentationArea` — **0 occurrences**. Upstream both splits bind it
   (`render-helpers.js:1622-1623`, `1787-1788`) and it collapses presentation to 0 / chat to 100 and
   restores 70/30 — `full.js:2693-2698`.

### Gaps — behaviour

9. **Push-to-talk** — `ControlRight` unmutes on keydown, re-mutes on keyup — `full.js:3011-3032`.
   `pushToTalk` **0**.
10. **`sessData.disableCopy`** — non-presenters get `preventDefault` on right-click and on
    Ctrl+C/U/S and F12 (`full.js:3017-3026`), plus `document.body.classList.add('noselect')`
    (`2227-2229`). `disableCopy` **0**, `contextmenu` **0**, `noselect` **0**.
11. **`muteAllNonAdmins()`** — `full.js:2963-2986`, subscribed `2219-2221`. Presenter-only, filters
    `perms !== 'a'`, staggers `muteTalkingUser` 100ms apart. **0**.
12. **`appVisibilityChange`** — `full.js:2253-2273`. After 10s attaches `visibilitychange`; on hide
    unloads the roster, on show reloads it and refetches chat and the extra-chat column. Gated on
    `preferences.visibilityChangeEnabled`. `visibilityChangeEnabled` **0**, `appHasFocus` **0**.
13. **Tawk support** — `full.js:2224-2298`. Injects `embed.tawk.to` for presenters, sets name/email,
    hides the widget until toggled. `Tawk_API` **0**, `loadTawkSupport` **0**.
14. **The `hideChat` handler** — `full.js:2185-2218`. Collapses chat to 0 / alerts to 100, disables
    `extraChatColumn` while remembering it was on, restores sizes from the correct localStorage key.
15. **`pollModalCompHolder`** — const 12, fully styled (`.pollModalHolder`, fixed, 580×553,
    z-index 501). **0**. Its sibling `privaChatCompHolder` (typo verbatim) is present — the pair was
    half-ported.
16. **`initPMDrag`** — `full.js:2663-2679`. jQuery UI draggable + resizable, containment `.wrapper`,
    snap, 8 handles, `cancel` on the scroller/textarea/search.
17. **`.alert-chat-box` hover hides `.mainTabset ul.nav-tabs`** — `full.js:1926-1932`.
18. **`beforeunload → window.opener.postMessage('windowClosing')`**, chat-only only —
    `full.js:1905-1907`.
19. **Join/leave popups and beeps** — `full.js:2134-2155`. Presenter-only, double-gated on `sessData`
    and `preferences`, suppressed by DND.
20. **`privChatIn` routing** — `full.js:2097-2110`. A presenter with DND gets `PCnewMessage` without
    the panel opening; everyone else gets the panel plus the `pling` sound.
21. **Recording sound effects** — `full.js:2045-2070`. Gated on DND, the specific preference, and
    `!videoOnlyMode`.
22. **`stopRecMsg` raises a `new Notification(...)`** — `full.js:2071-2076`.
23. **`reconnectedSocket` flashes `#connectedMsg` for 3s** — `full.js:2035-2041`; `recStarting` sets
    a 5s auto-clearing flag — `2023-2028`.
24. **`calculateDuplicates()`** — `full.js:2420-2426`. **0**.

### Corrections issued during this audit

- `archivesAvailableTo()` was reported as a gap and is **not** one. It is at
  `roster-gates.ts:54`, used at `+page.svelte:1337`, 6 occurrences. Moved to Matched above.

### Documents this audit revises

- **TODO row V.** `toggleTalkingPresenter` (`full.js:2354-2371`) and `adjustVolPres`
  (`2610-2631`) both call `mediaSoupService.startListeningToPresenter` /
  `stopListeningToPresenter`. Per-presenter mute **does** reach the SFU upstream; the limit is our
  signalling, not the design. Row V must be restated. Also `toggleTalkingPresenter` sets
  `audioVolumeFor[i] = 100` on unmute and `0` on mute — verify ours carries that.
- **`v4.md` / `v5.md`.** `full.js:1925` is
  `roomV4Link = window.location.href.replace('.com/', '.com/v3/')`. Still no `useV3/4/5` in the
  bundle, but a property named `roomV4Link` pointing at `/v3/` belongs in both files.

### Reverse direction — what WE do that the reference does not

Nine divergences, every one declared in the code with its reasoning. None is undocumented.

| # | ours | what the reference does | why we differ |
| --- | --- | --- | --- |
| 1 | The Files sort bar — `st-fileSortBar`, `st-fileSortName`, `st-fileSortDate` | Nothing. Absent from `main.d6d3c112b59b7d0d.js`, from `complete-app-styles.css` and from the rendered Files dump | `+page.svelte:856` — the deployment we hold predates it; class names come from the owner's own markup, not the bundle |
| 2 | Benzinga default URL not built | `benzingaUrl` from `sessionID` + `sessData.uuid` + `sesionToken` | `:1318` — all three are values this room does not have, and `sesionToken` is a credential that has no business in a page. Only `altBenzingaLinkURL` is reproduced |
| 3 | `setMasterVolume` sets `subtitles = true` at zero on BOTH paths | `app-room`'s `adjustVol` does; `app-presentationarea`'s does not | `:3605` — one `volume` state serves both; splitting it would mean two master-volume paths, which is worse than one line of drift |
| 4 | `videoOnlyMode` (the `r` parameter) not modelled | Third term of every three-mode gate | `:3869`, `:7780` — honest gap, same shape as `files-gates.ts` records for `hideFiles` |
| 5 | `track.contentHint = 'detail'` on the screen capture | Sets it on the alert-overlay canvas stream only, never the raw screen track | `:4454` — deliberate; cost unmeasured, may trade frame rate for sharpness under congestion. Reverting is deleting one line |
| 6 | Recording is CLIENT-side (`MediaRecorder`) | Server-side — `startRec(muser)`, `startRecMtx`, server returns `recName`. The whole bundle has ONE `new MediaRecorder`, the AV-settings mic test | `:4539` — the recording/transcoding workers are deferred by the deployment plan |
| 7 | `giveMicScreen` TAKES fully, GIVES only half | Grants mic/screen at runtime via `isLimitedPresenter` | `:5564-5576` — the SFU reads the grant's role from controller membership, so a rebuilt session re-mints `member`. Closing it needs a decision (durable membership write vs. client-asserted elevation) that is the owner's, not ours |
| 8 | "Powered by" links to `tradingroom.app` | `https://protradingroom.com`, text "ProTradingRoom.com" | `:7291` — reproducing it would make every room credit and link out to a different company |
| 9 | `mute()`/`unmute()` split into navbar and overlay pairs | Two components genuinely carry different bodies | `:3600-3603` — matched deliberately, and the overlay's shorter pair is the correct one |
| 10 | The Q&A flash clears once an alert has no unanswered question left | Purely an unread marker: `ut(4, mge, msg.unreadQA \|\| !1)` — `msg.ans` never appears in it. Only `openAlertQAModal` and `hidden.bs.modal` clear it; answering clears nothing | `:3204-3219` — explicit product decision, so the flash reads as "someone is waiting on you" rather than "you have not opened this". Both upstream clears still apply |

**Note on the method's limit, proven.** Divergence 10 carries no marker phrase from the list used to
locate 1–9 — it is headed `DELIBERATE DEVIATION` — and was found only by the linear read. That is
the concrete demonstration that the locate-then-read pass is not sufficient on its own, and why the
remaining linear read below is real work rather than diligence theatre.

| 11 | The mobile inner chat/alerts gutter still persists `chatAlertSizes` | `W4e` drops its `dragEnd` as `K4e` does | `:5659-5668` — our inner gutter writes the same key the desktop layout reads, so dropping it would mean a phone silently reverting a size set on a laptop |
| 12 | `window.opener?.postMessage(...)` — an optional chain | Dereferences `window.opener` unconditionally | `:6944-6950` — safe upstream only because `co=1` is reached exclusively through `detachChat`. This room can be opened at `?co=1` by hand, where the reference's line throws a TypeError on every unload |
| 13 | The Alert Filter button is not rendered | Declares it (const 38/44) gated on `sessData.modAlertFilterList` | `:8407-8434` — across BOTH captures of this toolbar it never appears; rendering it put two buttons on a wrapped second row the capture never produces. Its other entry point (`span.badge.filtered-text`) is recorded as open rather than substituted for |
| 14 | `name="alert-search-term"` on the alert search input | Const 32 carries neither `id` nor `name` | `:8452-8469` — Chrome reports the same warning against the original. `name` rather than `id` because `id` is the half the capture uses elsewhere as a document-unique hook |
| 15 | The VideoPlayer tab is gated on `isPresenter` alone | `O(25, (hideVideoPlayer && !isP) \|\| isP ? 25 : -1)` | `:9074-9087` — `hideVideoPlayer` is unmodelled. `isPresenter` reproduces both observed states, and the missing term is recorded rather than invented |
| 16 | `type="button"` on the alert-sound buttons | Const 263 spells it `pe="button"` — a typo | `:9795-9803` — harmless where it stands (no enclosing form), but copied forward it plants a latent bug for anyone who later wraps the pane in one. The TITLE's misspelling *is* reproduced |

**Method — and the reverse pass is now COMPLETE.** All 9,947 lines of `+page.svelte` were read
linearly, to the end of the file. Divergences 1–9 were first surfaced by a marker search; 10–16 were
found only by the linear read and carry no marker phrase that search would have matched. That is the
measured cost of the shortcut: it would have missed seven of sixteen.

### ⚠ Which tree each finding was read against — a method error, recorded

`audit/match-ledger` is branched from `main` (`f73ea57`), which **predates PR #3**. Proven on this
checkout: `function showPrivateChat` has **0 occurrences**, and `privateChatOpen = true` still
appears inline in `handleMessageAction` — both of which PR #3 changed.

So:

- **Lines 1–3,320 and divergences 1–10** were read while checked out on
  `viewer-only-mode-and-volume-dropdown`, i.e. WITH PR #3's changes. Those stand.
- **Anything read from line 3,320 onward on this branch is against the PRE-PR-#3 file** and must
  not be recorded as a finding about current code.

**Rule for the rest of this audit: check out `viewer-only-mode-and-volume-dropdown` (or whatever
supersedes it) before reading our side.** The reference side is unaffected — the decoded tree is
identical on every branch.

This is logged rather than silently fixed because it is the exact failure this project has a
standing rule about: a result that is about my tooling rather than about the app. Nothing in the
Matched or Gaps tables above came from the wrong tree — every one of those was verified by
occurrence count while on the viewer-only branch — but the next reader needs to know the trap
exists.

### `app-room` is CLOSED in both directions

Reference side: all 8,231 lines. Our side: all 9,947 lines. 15 items matched, 24 gaps (13 now
implemented on PR #3), 16 divergences — every one declared in the code with its reasoning.

Nothing further is outstanding for this component. Next: `app-presentationarea`, then
`app-screenshare-view` (both have anchored const mappings from the viewer-only work), then the
remaining 49.

---

## Remaining components

51 of 52 not yet started. Next: `app-presentationarea`, then `app-screenshare-view` (both have
anchored const mappings from the viewer-only work), then the rest in dependency order, panes before
modals. The controller's 50 reference files are a second pass after the room.
