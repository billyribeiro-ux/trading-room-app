# Changelog

Newest first. Every entry carries a **date and local time (EDT)**, and every time is either a git
commit timestamp or a measurement taken at that moment — none is estimated. Where a change landed in
a commit whose message describes something else, the commit is named anyway, because that is how it
will be found later.

**How this is maintained:** an entry is appended every time a piece of work is finished, not at the
end of a session. A change with no entry is a change the next person has to reverse-engineer from
`git log`.

**Branching: there isn't any, and that is deliberate.** Work is committed and pushed **straight to
`main`** — confirmed by the owner 2026-08-09. No feature branches, no PRs. The consequence is worth
stating once, here, rather than rediscovering it: **`main` auto-deploys**, so a push is a production
release, not a reviewable step. Two things follow, and both are conventions of this file:

1. **Every entry says whether it has runtime impact** — whether the push changed what the site
   serves, or only documentation, comments and tests. That is the first thing anyone reading back
   through an incident wants to know.
2. **Verification happens before the push, not after**, because there is no review gate to catch it.
   Each entry records what was run and what could not be.

---

## 2026-08-12

### 2026-08-12 16:29 EDT — A second pre-existing RED test, found by running a suite nobody had run

**Runtime impact: none** — one assertion in `dump-contract.test.ts`.

`f9e1890` replaced the wrapper ternary with `class="wrapper"` plus two `class:` directives, because
it bound a SECOND class to the same element — `KAe = (t, n) => ({"push-wrapper": t, "mt-0": n})`
(`app-room.full.js:5`, applied at `:4029-4039`), and two independent classes do not fit one
`a ? b : c`. The assertion still demanded the ternary verbatim, so it went red at that commit and
stayed red, because `f9e1890` reported `svelte-check` and prettier only.

The same shape as the `individualVolumeControls` failure found earlier today: a suite that nothing
ran between the change and now. What the assertion GUARDS is unchanged and still asserted — the
wrapper always carries `wrapper`, and `push-wrapper` appears only with `sidebarOpen`. Negative
control: binding `push-wrapper` to `true` turns it red; restored.

### 2026-08-12 16:26 EDT — `isMobileScreen` and the `K4e` layout, and the CSS rule that was deleting it

**Runtime impact: a phone gets the reference's room instead of a squeezed desktop one** — and the
presentation area, which our own stylesheet had been hiding on every screen under 900px, comes back.

**The threshold selects a TEMPLATE, not a class.** `isMobileScreen = window.innerWidth <= 601`
(`app-room.full.js:1889`, `:2988`) drives `O(5, o.isMobileScreen ? 6 : 5)` (`:4061`), choosing
between `j4e` and `K4e` (`app-room.render-helpers.js:1616-1664` and `:1783-1821`). 601, not 600: the
scoped sheet's own media query beside it is `max-width: 600px`, so the two do not agree and the 1px
seam is the reference's. Copied rather than tidied.

**Four differences, every one read from the const table rather than inferred:**

- **The child order reverses.** `K4e` node 1 is the presentation (`O(1, hidePresentation ? -1 : 1)`,
  `:1815`), node 2 the chat/alerts. `j4e` is the other way round (`:1650`, `:1662`). Same two flags.
- **Both splits are vertical as a STATIC attribute.** Const 224 is
  `['minSize','0','direction','vertical','id','mainAreaSplit','gutterDblClickDuration','400',…]` and
  const 228 is `['direction','vertical','minSize','0']`, where the desktop pair (consts 8 and 209)
  *binds* direction from `directionRoom()`. So a phone is stacked whatever `roomSplitDir` says.
- **No `dragEnd`.** `K4e` binds `gutterDblClick` and `dragStart` only, so a mobile drag is never
  recorded — and is not recorded here.
- **No `order` on either area.** Consts 225/226 carry `size` alone; const 227, the extra chat column
  this room does not model, is the only mobile area with `order`.

**That last one is why this reorders the DOM rather than restyling it.** Snippets, not a second copy:
the two panes are ~1,625 lines, and a duplicated layout drifts the first time somebody edits the one
they happen to be looking at.

**A trap caught against const 228 rather than by eye.** The inner chat/alerts split is normally the
*opposite* direction to the outer, so the obvious implementation reuses `splitIsHorizontal` — which
would have put alerts BESIDE chat in a phone-width column. Const 228 says vertical outright, so
`innerSplitIsVertical` is an OR, not a negation.

**Mobile geometry is its own and is never written down.** `chatAlertsSizeMobile = 50` /
`presAreaSizeMobile = 50` (`:1852-1853`) live in a separate field from the desktop 70/30
(`:1848-1849`), so rotating a tablet does not destroy either.

**Crossing the threshold refetches, once.** `onResize` debounces 500ms then re-emits
`appHasFocusGetChatLog` and re-requests `getAlertsLog` page 0 (`:2990-2999`) — because the two
templates hold different numbers of messages. It fires on the FLIP, not on every resize.
`invalidate('room:data')` is all of it here: the load registers `depends('room:data')`
(`+page.server.ts:124`) and returns alerts and messages together.

**THE DEFECT THIS FOUND, and it was ours.** `src/app.css` carried
`@media (max-width: 900px) { .vertical-gutter, .presentation-box { display: none } }`, unattributed,
since `cbfb4b9`. It hid the presentation area on every screen under 900px — the exact pane `K4e`
puts FIRST on a phone. It is not captured: the reference's own `max-width: 900px` block
(`css/complete-app-styles.css:7855`, de-scoped twin at `captured-runtime-components.css:7196`)
contains nothing but font sizes for the Files pane. The `.vertical-gutter` half was inert — that
class has zero occurrences in `+page.svelte` — so the only thing the block ever did was the harm.
**Found by rendering, not by reading:** the new harness measured `.presentation-box` as 0×0 with
`display: none` at both 601px and 602px, which is why it exists.

**Verified:** `scripts/verify-mobile-layout.mjs` renders 602, 601 and 600 in Chromium — 4/4, and it
measures the geometry rather than the flag: desktop side-by-side (chat 236px + presentation 354px,
shared top edge), mobile stacked full-width (presentation at y=49 h=370, chat at y=430). Three
negative controls, each red then restored — drawing 601 with the desktop arrangement (which also
tripped the 601-vs-602 distinctness check), drawing 602 with the mobile one, and **putting the 900px
rule back, which failed all three widths**. `mobile-layout-contract.test.ts` 13/13 with four more
controls: moving the threshold to 600, making the inner split the inverse of the outer, persisting a
mobile drag, and refetching on every resize instead of the flip. `svelte-check` 978 files, 0 errors,
0 warnings. `svelte-autofixer` clean. `verify:viewer-only` still 4/4 after the CSS removal. 91/91
across the six room suites.

**NOT carried, and stated rather than glossed:** `W4e` renders `app-chat` with no `openPrivateChat`
binding (`app-room.render-helpers.js:1753`) while its extra-chat sibling keeps one (`:1769`). This
room INLINES app-chat instead of composing it, so the parent/child binding distinction does not map —
reproducing it would mean shipping a button that is knowingly dead on phones. Left alone deliberately.
**Also not modelled:** `K4e` node 3, the extra chat column, and the bottom-layout axis
(`isChatAlertsOnBottom` and its four sizes, `:1854-1859`) — `extraChatColumn` has zero occurrences in
this room, a gap that predates this change.

**NOT verified:** no browser drove the Svelte component itself at either width. The harness renders
the arrangement and the contract test reads which arrangement the template picks; the room needs a
controller this machine has no `.env` for — TODO row E.

### 2026-08-12 16:01 EDT — `disableCopy` and push-to-talk: three host bindings that were never bound

**Runtime impact: "Disable Copy?" now protects something.** An owner has been able to tick it on the
Manage page all along; `disableCopy`, `contextmenu` and `noselect` each had **zero occurrences** in
this room, so it protected nothing at all.

**Three bindings, one rule.** `onKeyDown`, `onRightClick` and `onKeyUp`
(`app-room.full.js:3011-3032`) are host-bound to `keydown`, `contextmenu` and `keyup`
(`app-room.compiled.js:1260-1281`). The copy restriction carries the same two terms in all three
places plus `ngAfterViewInit` (`:2227-2229`): `!isPresenter && sessData.disableCopy`. Right-click is
suppressed, Ctrl+C / Ctrl+U / Ctrl+S and F12 are suppressed, and `document.body` gains `noselect`.

**The presenter exemption is the point, not an oversight.** This restricts the AUDIENCE; the person
running the room keeps their own clipboard. Asserted in both directions.

**Two readings that would have been wrong, and are pinned so they cannot return.** `F12` is the
second arm of an `||`, not a third Ctrl combination — reading it as `Ctrl+F12` would leave devtools
open on the one key most people reach for. And the comparison is `e.key.toLowerCase()`, so Ctrl+Shift+C
is caught; dropping the lowercase would let Shift through.

**Push-to-talk's `!e.repeat` is load-bearing.** `preferences.pushToTalk && !e.repeat &&
('ControlRight' === e.code || 17 == e.which) && micMuted && toggleMic()` (`:3012-3016`). keydown
repeats while a key is held; without that term every repeat calls the mic toggle again, closing and
reopening the producer many times a second for as long as somebody speaks. The legacy `which === 17`
fallback is kept for the same reason it exists upstream — browsers that populate one and not the
other.

**`noselect` was checked, not assumed.** `.noselect { user-select: none; }` at
`css/complete-app-styles.css:7017`, unscoped. A class with no rule behind it would have closed the
keyboard path while leaving the text selectable by drag, which is this repository's standing example
of dead scaffolding.

**One declared divergence.** Upstream adds `noselect` once in `ngAfterViewInit` and never revisits
it, because `isPresenter` cannot change in that component's lifetime. Here it can — `giveMicScreen`
elevates a member mid-session — so it is an `$effect` with a teardown; a class added at mount would
keep restricting somebody the room has just promoted.

**Listener targets, stated as unresolved.** The reference registers the key events with one target
resolver (`Cm`, shared with the window-only `onResize`) and `contextmenu` with another (`mE`).
Neither symbol is defined anywhere in `docs/source/components/`, so which is `window` and which is
`document` is NOT established. All three are bound on `window` here; `contextmenu` bubbles to both
and the handler's only effect is `preventDefault`, so the distinction cannot change behaviour.

**HONEST GAP: nothing writes `pushToTalk` yet.** The gate reads it correctly and will work the moment
a control sets it, but the checkbox lives in `app-user-settings-modal` — the only other component in
the decoded tree that mentions it — which is a separate component and a separate piece of work.
Inventing a checkbox here would mean guessing its label and position.

**Verified:** `room-key-gates.test.ts` 18/18 — behaviour driven directly, plus the handlers, the
three event bindings and the wiring read out of the decoded component at runtime. Five negative
controls, each red on exactly its own assertion then restored: dropping the presenter exemption,
folding F12 into the Ctrl combination, dropping `!repeat`, dropping the legacy keyCode, and losing
the case-insensitivity. Controller 56/56 across the settings chain; `schema:verify` green at 46
wired, with the tripwire moved 45 → 46 and the schema regenerating to three changed lines.
`svelte-check` 977 files, 0 errors, 0 warnings. `svelte-autofixer` clean. Prettier clean. 45/45
across the four room suites touching these files.

**NOT verified:** no browser pressed a key. The predicates are exercised directly and the wiring is
asserted as source, but nothing dispatched a real `keydown` at a live room — the same environment gap
as TODO row E.

### 2026-08-12 15:54 EDT — The gutter double-click does something now, and it found a bug on the way

**Runtime impact: double-clicking the main gutter collapses the presentation area and restores it.**
It previously did nothing at all.

`gutterdblclickduration="400"` has shipped on `#mainAreaSplit` since the split was written —
transcribed from const 8 (`app-room.compiled.js:1294-1304`) — while `hideShowPresentationArea` had
**zero occurrences**. A control whose configuration ships and whose behaviour does not, which is this
repository's own definition of dead scaffolding. The handler is `app-room.full.js:2693-2698`, bound
to `gutterDblClick` on the OUTER split in both reference layouts (`render-helpers.js:1622-1623`
desktop, `:1787-1788` mobile) — asserted as a count of 2, so a layout that stops binding it fails.

**The mapping.** Upstream keeps `presAreaSize` + `chatAlertsSize` summing to 100; this room keeps one
number, `mainSplit`, which is the chat/alerts side. So 100/0 collapsed is `mainSplit = 1` and 30/70
restored is `0.3`. The asymmetry is the reference's and is kept: it restores to a fixed 70/30 rather
than to whatever the user last dragged, so the second double-click is a reset as much as an undo.
Nothing persists — upstream ends in `printSizes()`, which is a `console.log` and nothing else
(`:2708-2712`), unlike `dragEnd` which does write. Persisting would let a transient toggle overwrite
the geometry the user chose by dragging.

**The 400ms window is implemented rather than delegated.** The browser's own `dblclick` threshold is
the platform's, not this attribute's; honouring macOS's value while rendering a 400ms attribute would
leave the attribute decorative in a second way. `beginSplit` calls `preventDefault()` on pointerdown,
so native `click` is not reliable on this element either — the release is a click only if the pointer
went down and up without `resizeFromPointer` running, which is what stops two quick DRAGS from
toggling and throwing the resize away.

**Extracted to `$lib/split-gutter`, and that is what caught the bug.** A two-click state machine whose
entire content is timing cannot be driven from inside a 10,000-line component, so it follows
`roster-gates.ts` / `files-gates.ts` out into a module. Writing the "restores to 70/30" case then
failed for a reason that was not the test's: **the sentinel for "no click pending" was `0`, and
`performance.now()` counts from page load** — a genuine first click at t=100ms sat 100ms from the
sentinel, inside the window, so the room would have collapsed its presentation area on the FIRST
SINGLE CLICK of any session, and again after every completed double-click. Now `-Infinity`, with a
regression test that asserts the behaviour at small timestamps rather than asserting the constant.

**Verified:** `split-gutter.test.ts` 12/12 — six of them a real click sequence at real timestamps
(single click does nothing; second click collapses; fourth restores; three clicks are one
double-click and a leftover; the 400ms boundary counts, 401 does not; two drags do not fire), and
five pinning the handler, the binding count, the const-table 400 and the wiring into the room. Four
negative controls, each red on exactly its own assertion then restored: restoring to the dragged size
instead of 70/30, narrowing the window to 100ms, putting the sentinel back to `0`, and ignoring the
drag flag. `svelte-check` 975 files, 0 errors, 0 warnings. `svelte-autofixer` clean. Prettier clean.
27/27 across the three suites touching these files.

**NOT verified:** no browser drove a real gutter. The state machine is exercised directly, and the
wiring into `finishSplit` is asserted as source, but nothing clicked a live `.as-split-gutter` — the
same environment gap as TODO row E.

### 2026-08-12 15:46 EDT — `hideChatAlerts` and `hidePresentation`: the two column gates, as one flag each

**Runtime impact: two room settings that did nothing now remove a column each.** An owner who ticked
"Hide Alerts/Chat Section?" or "Chat Only Room?" on the Manage page got a room that ignored both.

**`hideChatAlerts` was three mechanisms and no setting.** Upstream it is ONE field with five writers
(`app-room.full.js:1893-1902`, plus `detachChat` at `:2179-2181`) gating the whole chat/alerts column
at `O(1, e.hideChatAlerts ? -1 : 1)` (`app-room.render-helpers.js:1650`) and the extra chat column
beside it at `:1652-1660`. Here it was a hardcoded branch on `viewerOnlyMode`, a second branch on
`chatAlertsDetached`, and nowhere at all for the room setting — which is precisely why the setting
did nothing: there was no fourth branch, and adding one would have been a fourth copy of one
decision. It is now one `$derived` flag with the three sources this room can resolve.

**Two of the five are honest gaps, and are recorded as such rather than guessed.** `isPlayer` has
zero occurrences here — upstream it is a stream-PLAYBACK global whose only other reader raises "The
stream has ended" on `streamPlayerEnded` (`:2162-2165`), and this room has no such mode.
`videoOnlyMode` is the `r` query parameter, the same gap `files-gates.ts` already records for
`hideFiles`. `recordChat` was deliberately kept OFF the wire: it appears only inside that writer, so
sending it would add a setting nothing can read.

**`hidePresentation` was half-built under another name.** `{#if !chatOnlyMode}` on the presentation
column has been there since `cbfb4b9`, so the brief's expectation that `?co=1` renders a presentation
area was already false — that half was correct. What was missing is the SECOND term,
`sessData.isChatOnlyRoom` (`full.js:1903-1904`, gate at `render-helpers.js:1662`), and the name the
reference gives the pair. The `beforeunload` listener registered inside that same statement is now
carried too: it posts `windowClosing` to `window.opener`, which is how the opener learns the popout
closed and calls `reatachChat`. The `?.` on `window.opener` is a declared divergence — upstream
`co=1` is only ever reached through `detachChat` so an opener always exists, while this room can be
opened at `?co=1` by hand, where the reference's line would throw on every unload.

**The reopen control moved to where the bootbox says it is.** Detaching used to leave a "Reopen here"
panel inside the column; upstream it deletes the column and raises `reopenAlertsChatBtn`, whose
control is a SIDEBAR item — `H(25, oPe, 5, 0, 'li', 19)` gated by `O(25, …)`
(`render-helpers.js:312, 355`, markup `:76-87`), with its title, classes and icon read from consts
19/22/38/39 (`compiled.js:1324, 1337, 1416, 1417`). It sits between Connectivity Check and General
Settings because that is where node 25 sits. No separate `reopenAlertsChatBtn` field: here
`hideChatAlerts` is derived and `chatAlertsDetached` IS the detach source, so a second flag could
only disagree with it.

**Wiring the two settings across the boundary touched four lists, by design.** `ROOM_CONSUMED` in the
generator, `ROOM_VISIBLE_SETTINGS`, the `RoomSessionSettings` interface, and the verifier's own
`EXPECTED_WIRED_SETTINGS` — the duplication is deliberate and documented, so drift shows up as a diff.
The generator's `WIRED_SETTINGS.size` tripwire moved 43 → 45 and the schema regenerated to exactly
three changed lines: the documented count and the two `wired` flags.

**One pre-existing RED test found and fixed, and it was not mine.** `room-config-boundary.test.ts`
asserts its `consumers` map equals `ROOM_VISIBLE_SETTINGS`; `individualVolumeControls` was added to
the allow-list with the viewer-only work and never given an entry, so that assertion had been failing
before this change. Verified against `HEAD` before touching it. Its consumer is real —
`PresenterMuteRows.svelte:123` — and all three names now have entries.

**Verified:** `chat-alerts-gates-contract.test.ts`, 13 assertions read out of the decoded component
at RUNTIME, 13/13. Four negative controls, each red on exactly its own assertion and restored:
unbinding the chat gate, dropping the setting from the derived flag, narrowing `hidePresentation`
back to `chatOnlyMode`, and changing the sidebar item's title. Controller: 56/56 across the four
tests that guard the settings chain. `schema:verify` green at 45 wired. `svelte-check` 972 files, 0
errors, 0 warnings. `svelte-autofixer` clean. Prettier clean.

**NOT verified, and recorded as TODO row E rather than glossed:** there is no RENDER behind these two
gates. `room-config-seam-e2e.mjs` now carries the assertions — flip the setting, watch `.alert-chat-box`
or `.presentation-box` leave the DOM — but it could not run: `apps/room/.env` does not exist,
`ROOM_JWT_SECRET` is absent from the controller's `.env` too, and the probe's default `CONTROL` port
5180 is a different project on this machine (the controller's dev port is 5173). Provisioning a
shared secret is an owner decision, and inventing one to make a probe go green is the opposite of
what the gate is for.

### 2026-08-12 15:22 EDT — The navbar fix now has a render, and the harness can fail on it

**Runtime impact: none** — tests and a harness only. It closes the verification gap `f9e1890` left
open, which was the second of PR #3's two blockers.

`f9e1890` gated the navbar and the sidebar on the three modes and bound `mt-0`, and shipped
**verified by `svelte-check` and prettier only**. Its own commit message said so. The reason was
this harness: `grep -c "room-sidebar\|mainAppNav\|mt-0"` over
`scripts/verify-viewer-only-layout.mjs` returned **0**. It built a fixture containing the split,
`#mainTabs` and the video, and never the two elements beside them — so `4/4` was green before the
fix and green after it, measuring something real, but not the thing that was wrong.

The fixture now renders the chrome, and four assertions measure it, each tied to the case's identity
rather than to the flag that draws it:

- the navbar is ABSENT in viewer-only and chat-only, PRESENT in the full room —
  `O(4, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 4)` (`app-room.full.js:4043-4059`);
- the sidebar the same, from `O(3, …)`, which is the same condition evaluated twice;
- `.wrapper` computes `margin-top: 49px` in the full room and `0px` in both reduced ones —
  `KAe = (t, n) => ({'push-wrapper': t, 'mt-0': n})` (`:4029-4039`) against
  `app-room .wrapper { margin-top: 49px }`
  (`src/lib/styles/captured-runtime-components.css:1099-1138`);
- **nothing ends below the fold.** This is the defect itself: a `vh-100` split that starts 49px down
  ends at 849 in an 800px window.

Negative controls, all four red before being restored. Unbinding `mt-0` in the viewer-only case
reports both halves at once — `.wrapper margin-top is 49px … expected 0px` and **`the split ends at
849px in a 800px window — 49px of the room is off-screen`**, which is the pre-`f9e1890` state
reproduced and measured. Keeping the chrome in chat-only reports the navbar and the sidebar
separately. In the contract test, unbinding `mt-0` and replacing the `{#if}` with `{#if true}` each
go red.

The contract test also pins the harness itself now: it asserts that
`verify-viewer-only-layout.mjs` mentions `mainAppNav`, `room-sidebar`, `wrapperMarginTop` and
`splitBottom`, so a fixture that stops rendering the chrome fails in vitest rather than quietly
returning to green-and-blind.

**Verified:** 67 tests across the five contracts touching these files; `svelte-check` 972 files, 0
errors; prettier clean; `verify:viewer-only` **4/4** with the chrome measured; four negative
controls.

### 2026-08-12 14:28 EDT — Review corrections: the viewer-only class was on two wrong elements

**Runtime impact: yes.** Three class bindings moved, one added, one attribute determined not to
belong.

A review of the 13:45 entry re-derived each claim from the decoded files and found the placement of
`viewer-only-screen-tab` wrong in both directions. `wSe`'s update block
(`app-presentationarea.render-helpers.js:471-494`) walks `O(0,…)`, `m(2)`, `pt(…)`, `m(2)`,
`O(4,…)` — an explicit index, which fixes the pointer independently of counting — then `m()` to node
5, and node 5 is `d(5,'div',72)`. The const table agrees from the other side: **only const 72 carries
a `3,'ngClass'` marker**, and Angular emits that marker exactly where a binding exists. So:

- **removed** from `ul#screenTabs` (const 70 has no marker at all — the class had no upstream), and
  with it the now-unused `viewerOnlyMode` prop on `ScreenTabs.svelte`;
- **removed** from the screen pane (const 73's only `ngClass` is `Hr = {'show active': t}`);
- **added** to `div#screensTabsContent` in `+page.svelte`, which is what const 72 is.

**`H0e`'s other argument, wired.** The 13:45 work quoted the whole of
`H0e = (t, n) => ({hidden: t, 'viewer-only-screen-video': n})` and bound only `n`. `t` is
`!isConnected || (isPresentingThisScreen && !localpreview) || saveData`
(`app-screenshare-view.compiled.js:338-343`): the first term is `stream === null` here and is now
bound, with the component's own `.hidden { display: none }` (`:357`) added to `ScreenPane`'s scoped
style block; the second is false by construction in this app; the third, `saveData`, is unmodelled
and is now `TODO.md` W.

**`controls` determined NOT to be a gap.** `z('controls', o.showControls)` sits on the line above,
but `showControls` starts `!1` and its only writer is a click on that same `<video>`, which the same
stylesheet gives `pointer-events: none`. The bar never appears upstream; omitting the attribute
reproduces the behaviour. Recorded under decisions taken deliberately.

**A comment corrected:** `PresenterMuteRows` said the navbar's `hr` was "inside the repeater". It is
a SIBLING of it (`ht(0, _4e, …), T(2, 'hr')`), inside the gated block — one rule per dropdown, not
one per row. The output was right; the sentence was not.

**The two layouts now have a render.** `pnpm --filter room verify:viewer-only` — four checks in real
Chromium at 1280×800: a full room (control, split 751px), chat-only (`vh-100` → exactly 800px),
viewer-only (one split area, `ul#mainTabs` `display:none`, `#screensTabsContent` **max-height 760px
against an 800px viewport — `calc(100vh - 40px)` computed live**, which confirms the const-72
placement from the rendered side rather than from the const table), and the image check below.
**4/4**, captures in `apps/room/evidence-viewer-only/`.

**The limit of that, stated next to the number because anyone who reads it alone will be wrong: no
capture of this product in viewer-only or chat-only mode exists, so what this proves is the
reference's CSS taking effect on our elements, not a pixel diff against its output.** That is the
honest ceiling for this item, not a gap to be closed later by trying harder — the evidence to close
it does not exist. The same sentence is in the script's own header.

**Which artifact carries which claim.** `measurements.json` proves the icon identity and the
geometry: `iconClass` comes from the real module, `iconGlyph` is the codepoint on `::before`
(U+F026 / U+F027 / U+F028) checked against the one Font Awesome's own stylesheet declares for that
class, and the rects are the browser's. The PNGs prove a different thing — that the states render
DIFFERENTLY FROM EACH OTHER — and that claim is now asserted rather than assumed.

**Both harnesses were writing one file for several states and reporting green.** `volume-0`, `-5`,
`-51` and `-100` were byte-identical, as were `full-room` and `chat-only`, while the JSON beside them
recorded three different glyphs and a 49px difference. Two causes, both fixed rather than labelled:

- every harness built its page with `page.setContent()`, which gives an opaque origin Chromium
  refuses `file://` font fetches from, so every glyph painted as the same fallback box. All three
  now serve over `http://127.0.0.1` through `scripts/lib/harness-server.mjs`, the faces load, and
  the server records any font request that does not return 200 so a failure is a named network fact
  rather than a disclaimer. `verify-tooltip-placements.mjs` had the same defect and got the same
  fix; its six results are unchanged.
- nothing compared the captures. Every capture is now hashed; the states that must differ are
  asserted to differ, the layout cases are captured full-page AND element-bounded so a 49px change
  in an unpainted box becomes a byte difference, and the pair that may legitimately match
  (`full-room` vs `chat-only` full-page) is documented as such instead of demanded.

Negative controls for both: forcing volume 5 to paint volume 0's glyph fails with
`volume-0.png and volume-5.png are byte-identical`; rendering chat-only without `vh-100` fails with
`full-room-split.png and chat-only-split.png are byte-identical`.

**One assertion was withdrawn as wrong.** `document.fonts.check('900 16px "Font Awesome 5 Free"', …)`
returns false for a face `document.fonts` reports as loaded and which visibly paints — an icon font
has no glyph for the character the API tests by default, and passing the codepoint did not change
its answer. It is recorded as a diagnostic; the assertions that replaced it are the loaded face, the
codepoint, and the captures differing.

**The layout harness's first version could not fail, and its own negative control found that.** Both
the render and the expectation came from one `vh100` flag, so flipping the flag flipped the check.
The expectation is now tied to the case's identity — `QB` gives `vh-100` to every reduced layout —
and flipping the flag fails with `vh-100 is absent on viewer-only`.

**Attribution note, recorded rather than rewritten:** commit `6a5053e`
("v5.md and v4.md: forensic audit of the app version switches") also contains the first batch of this
work — `screen-volume.ts`, `ScreenVolumeControl.svelte`, both test files and the `+page.svelte`
changes — swept in from an uncommitted working tree by a concurrent session. The history is wrong
and is being left alone: two sessions are pushing to `main`, and a force-push to fix an attribution
line is the worse trade.

### 2026-08-12 13:45 EDT — Viewer-only mode is real, and the navbar dropdown is complete

**Runtime impact: yes**, in three places — the navbar volume dropdown, the background-music slider,
and every screen pane in every room.

Item U added `viewerOnlyMode` to this app. Reading the decoded tree for its OTHER consumers turned up
seven bindings and two defects, all of them in code that already shipped.

**Closed, each with its decoded citation:**

| what | evidence | what it was |
| --- | --- | --- |
| the navbar dropdown had no per-presenter rows | `app-room.render-helpers.js:1224-1225, 1103-1106, 1436` | a member could mute the room but not one presenter |
| its third icon was `fa-volume-mute` | `app-room.compiled.js:1696` is `fa-2x fa-volume-off`; and Font Awesome's own sheet declares `.fa-volume-off:before{content:"\f026"}` against `.fa-volume-mute:before{content:"\f6a9"}` | **not a near-miss class name — a different picture.** U+F6A9 is not U+F026, so every listener who dropped below 4 saw the wrong glyph, not a variant of the right one |
| the background-music slider was gated on SoundCloud alone | `:1434` gates on `scPlaying \|\| mp3Playing \|\| roomState.ytURL` | dead for MP3 and YouTube — two of the three sources it controls |
| its container carried `class="m-0"` | const 114 is `[2,'text-align','center']` — a `2` marker is STYLES | the class belongs to the `<p>`, which already had it; the centring was absent |
| `viewer-only-screen-video` and `viewer-only-screen-tab` were STATIC classes | `app-screenshare-view.render-helpers.js:2`, `app-presentationarea.render-helpers.js:9` — both are `ngClass` bindings | viewer-only geometry (`max-height: 100% !important`, `height: 100% !important`) applied to EVERY room |
| nothing applied `viewer-only-screen-zoom-controls` | `…render-helpers.js:10, 261` | the rule shipped and painted nothing; the trio sat 66px from where the reference puts it |
| the main tab strip stayed visible in viewer-only mode | `app-presentationarea.compiled.js:3154-3155` | — |
| chat and alerts stayed visible | `app-room.compiled.js:76-77` | — |
| the private chat could still be opened | `app-room.compiled.js:855-861` | four call sites each set the flag; there is now one `showPrivateChat()` carrying the refusal |
| the split kept its two-column height with one column | `app-room.render-helpers.js:11, 1639-1648` — `QB = (t) => ({'vh-100': t})` | `.vh-100` shipped in the sheet and was applied by nothing |

The per-presenter row is now ONE component, `PresenterMuteRows.svelte`, rendered by both dropdowns —
the two const tables are the same values in the same order (`app-presentationarea` 111-115,
`app-room` 117/201-204), so it is one control that appears twice.

**One deliberate divergence, recorded in `TODO.md`:** upstream both dropdowns give their rows the
same ids, and in viewer-only mode both are in the document at once — so every `<label for>` in the
overlay resolves to the navbar's checkbox. The navbar keeps the captured ids; the overlay takes a
distinct prefix.

**Three things checked and found already correct** (asked for, and worth recording so nobody looks
again): `KB`/`HCe` both resolve to the single class `muted`; const 54 is
`['fas','fa-closed-captioning']`, so the Subtitles icon was right; and the icon thresholds in the
navbar are the same strict inequalities as the overlay's.

**Verified:** 687 tests across 66 files (the whole room suite, because shared components changed);
`svelte-check` 972 files, 0 errors; prettier clean; **six more negative controls run and each went
red** — the icon reverted, `trailingRule` dropped, the background-music gate narrowed, the container
class restored, the viewer-only classes made static again, and the `mainTabs` binding removed; and
the render harness extended to **7/7**, including a screenshot of the navbar dropdown with two
presenters talking that shows rows → slider → rows → slider → `hr` → the six checkboxes, in that
order.

### 2026-08-12 12:55 EDT — Item U built: the zoom-overlay volume dropdown, from the DECODED component

**Runtime impact: yes.** A new control renders in the screen tab bar's `ms-auto` cluster when the
room is entered with `?vo=1` or `?vo=2`, and one room setting now crosses from the controller.

The reference's second `#dropdownVolume` — `btn btn-sm btn-dark`, consts 90-97 and 106-115 of
`app-presentationarea` — with its master slider, its Mute/Unmute pair, and one row per talking
presenter carrying a mute checkbox and (when the room enables it) a per-presenter volume slider.

**Decoded, not reconstructed.** Every claim came from
`apps/room/docs/source/components/app-presentationarea.{render-helpers,compiled}.js` and its
`app-room` counterpart — line-numbered files that were already in the repository. No byte offsets
were sliced out of the 2.9 MB bundle for any of it. The one exception is the `vo` parameter itself,
which belongs to the app service rather than to a component and is inherited from the entry above.

Built:

- `apps/room/src/lib/screen-volume.ts` — the icon thresholds and both preference transitions, as
  pure functions, so the render harness can run the REAL code in a browser.
- `apps/room/src/lib/components/ScreenVolumeControl.svelte` — the markup.
- `ScreenZoomControls.svelte` — a `volume` snippet slot, between the zoom trio and the dark buttons,
  which is where `CSe` puts children [3] and [4].
- `+page.svelte` — `viewerOnlyMode` from the `vo` parameter (the same idiom `co` and `dscreen`
  already use), the two preference maps as `$state.raw`, the four handlers, persistence through
  `savePreference`.
- The controller: `individualVolumeControls` added to `ROOM_VISIBLE_SETTINGS` and to the room's
  `RoomSessionSettings`, and to the generator's `ROOM_CONSUMED`. Schema regenerated: 43 wired,
  `verify-room-settings-schema.mjs` green. The setting itself was always captured and stored
  (`room-settings-schema.ts:254`, manage-page decode at
  `apps/controller/docs/reference/parts/02-baseline-720-1439.md:2221`); what it lacked was transport
  and a consumer, and both arrived together.

**Four corrections to `HANDOFF.md`, all from reading the decoded tree:**

1. The two `room-sound-options` are a subset and a superset — the NAVBAR one holds the presenter
   rows *and* the six checkboxes, so ours (checkboxes only) is incomplete. Recorded as `TODO.md` V.
2. `mute()`/`unmute()` differ between the two components; the overlay's pair does not touch
   subtitles or background music.
3. The navbar's third icon is `fa-volume-off`; ours renders `fa-volume-mute`. `TODO.md` V.
4. `individualVolumeControls` was stored but unwired, not absent.

**Verified:** 30 tests green (17 behaviour, 13 contract — the contract test parses the decoded const
table with the repository's own tokenizer and takes each index from the render helper's call site);
`pnpm --filter room check` 971 files, 0 errors; prettier clean; **six negative controls run and each
went red** (`>50`→`>=50`, `<4`→`<=4`, `delete`→`= false`, the Mute/Muted swap inverted, the volume
slot removed, and the same `>=50` against the render harness); and a REAL RENDER —
`verify:screen-volume`, six volume values in Chromium, 6/6, PNGs in `apps/room/evidence-screen-volume/`,
proving the trigger is EMPTY at exactly 50 and exactly 4 and that all four captured classes are
painted by the sheets this app serves.

**Not closed, and recorded rather than papered over:** per-presenter mute does not reach the SFU —
this signalling wire has no `pauseConsumer` — so it is applied to the listener's own `<audio>`
element. `TODO.md` V has the two ways to close it.

### 2026-08-12 13:05 EDT — The gate has a source, and `HANDOFF.md` is complete

`viewerOnlyMode` is the **`vo`** URL query parameter. Bundle offset ~2595500:

```text
const s=new URLSearchParams(window.location.search), _=s.get("vo")
_&&"1"===_&&(this.appService.globals.viewerOnlyMode=!0),
_&&"2"===_&&(this.appService.globals.viewerOnlyMode=!0,this.appService.globals.viewerOnlyModeLimited=!0)
```

Default `!1`. `?vo=1` is viewer-only, `?vo=2` is viewer-only **limited**. Siblings recorded from the
same block because they will be wanted: `r`→`videoOnlyMode`, `co`→`chatOnlyMode`, plus `id`, `tok`,
`sl`, `forcedStream`, `dscreen`, `pw`, `email`, `name`, `dlf`, `kt`, `changePasswordUID`.
`individualVolumeControls` is `sessData.individualVolumeControls`, two occurrences, both gating the
per-user slider.

`HANDOFF.md` gained a **START HERE** section naming the four state sources still unread —
`audioMutedFor` (30 occurrences), `audioVolumeFor` (24), `toggleTalkingPresenter` (4),
`adjustVolPres` (6). None is a gap; they are reads nobody has done, and saying so is what stops the
next session treating an unread region as a missing fact.

Two dead pointers were also found and fixed while verifying every reference in the brief:
`services/SYNC-PROVENANCE.md` does not exist and was cited by `TODO.md` item P. Both now point at
`ops/backend-import-provenance.md`.

### 2026-08-12 12:50 EDT — Item U: the trigger is GATED, and the state behind it does not exist here

Started building it and stopped at the right place. Reading `CSe`'s update block — which the earlier
pass had not read, having stopped at the creation block — changes what item U actually is:

```text
m(),O(3,e.appService.globals.viewerOnlyMode?3:-1),
```

Index 3 is `hSe`, the volume button. **It renders only in viewer-only mode.** That one line explains
the whole mystery: the control "has never rendered in any capture" because no capture was taken in
viewer-only mode. It was never missing markup — it is gated markup, and a capture was never going to
show it no matter how many were taken.

The other gates, same block: Mute when `audioVolume > 0`, Unmute when `0 == audioVolume`, the
per-presenter list when `talkingUsers.length > 0`.

**Then the part that stopped the build.** The control needs six pieces of state, and five are absent
from this app: `viewerOnlyMode` (present only inside a comment in `ScreenZoomControls.svelte:18`),
`individualVolumeControls`, `audioMutedFor[userID]`, `audioVolumeFor[userID]`,
`toggleTalkingPresenter()` and `adjustVolPres()`. Only `talkingUsers`, `volume`, `setMasterVolume`
and `toggleMute` exist.

So this is not "add a button to a container". It is a state-plumbing change with a component on top,
and the honest thing was to write the finding down rather than start it with the context left and
hand over something half-wired. **Nothing was faked to make the markup render**, which is the failure
mode that rule exists to prevent.

One more trap recorded while there: **the two `room-sound-options` are not the same content.** Both
variants carry that class, so they look interchangeable. The nav one holds the sound checkboxes and
is already built at `+page.svelte:6904`; the overlay one holds a row per talking presenter and is
not. Copying the nav across would render the wrong control under the right class name.

`HANDOFF.md` now carries the verbatim update block, all five gates, the state table with what is
present and what is absent, and that trap.

### 2026-08-12 12:20 EDT — Item U's evidence gap closed by reading, not by a script

No code yet. The row said the volume dropdown's trigger "has never rendered in any capture" and was
one of the collapsed `<!---->` placeholders — the sort of thing that gets a console script. It did not
need one. The trigger is in `main.d6d3c112b59b7d0d.js` in full, with its icons and its conditions.

**Why it looked missing: there are TWO `#dropdownVolume` triggers.**

- `[…1,"nav-link","d-flex","align-items-center"]` — the main nav. **Already built**, at
  `+page.svelte:6824`, and correct: `fa-2x`, `fa-volume-mute` and the `mainNavItem` label each occur
  exactly once in the bundle, so ours is that variant rather than a near-miss of the other.
- `[…1,"btn","btn-sm","btn-dark"]` — the zoom-controls overlay. **Not built.**

Its template is `hSe`: a `button` holding one of three icons picked by `audioVolume` — `>50` →
`fa-volume-up`, `<50 && >4` → `fa-volume-down`, `<4` → `fa-volume-off`. **Every branch is a strict
inequality, so at exactly 50 or exactly 4 no icon renders at all.** That is the reference's behaviour
and it gets reproduced, not corrected — this is the class of thing that gets "tidied" into a bug by
the next reader.

The parent `CSe` puts three children in `div.zoom-controls-container.position-relative`: the zoom
buttons, this button, then `div.dropdown-menu.volumeControl`. `ScreenTabs.svelte:249` renders the
container and `{@render controls()}` only, so the button and the menu are exactly what is absent.

Recorded now so the reading is not repeated. Implementation is the next step.

### 2026-08-12 12:02 EDT — `TODO.md` made to obey its own rule again

No code. The file states at the top that it lists only what is still OPEN, and that closed items are
removed rather than struck through, "because a list that is mostly strikethrough is a list nobody
reads to the bottom of". Three commits of tooltip work had left it doing the opposite: gap 1 sat in
the gaps table with its own row reading "Closed 2026-08-12" and `blocks: nothing`, followed by five
paragraphs of closed narrative.

Removed. The gaps table is now empty and says so in one line, pointing at the two dated CHANGELOG
entries that hold the history. The one finding in that narrative which is not history — that Popper's
collision pass is deliberately not reproduced, and why it costs nothing — moved to "Not gaps —
decisions taken deliberately", which is where a thing nobody should "fix" back belongs.

What remains in `TODO.md` is eight rows, none of them evidence gaps: P, Q, R, S, U, Z, G, H.

### 2026-08-12 11:52 EDT — The five tooltips the reference binds rather than writes

Closing the loose end from the previous entry instead of reporting it. Checking which placements this
app actually uses turned up `ModalHost.svelte:4207`:

```svelte
<span {...{ placement: 'top' }} class="created-at mr-2">{qaAlertTimestamp}</span>
```

`placement="top"` and nothing attached. Two more like it in `RoomMessage.svelte`. All three showed no
tooltip; the reference shows one.

**Why they were invisible.** Angular marks the start of the binding list in `TAttributes` with `3`,
and a property binding sets no DOM attribute. So
`["placement","top",1,"created-at","mx-2",3,"ngbTooltip","ngStyle"]` renders a host with `placement`
and no `ngbtooltip` — and our attachment only ever read the attribute. Five of the room's tooltips are
declared that way, all message timestamps.

**`ngbTooltipWith(text)`** takes the value through the attachment. Deliberately not by writing an
`ngbtooltip` attribute: that would show the right bubble on an element the reference never marks, and
`verify:tooltips` now fails if a bound host grows one.

**The value is Angular's `date:'short'`** — `xn("ngbTooltip", Ct(27, 24, e.msg.t, "short"))`, against
a visible `h:mm a`. For en-US that is `M/d/yy, h:mm a`, which the existing `alertDateFormatter`
already produces exactly. Reused rather than re-derived: a second formatter for the same shape is how
two of them drift apart, and these three were hoisted into `message-formatters.ts` precisely to stop
that.

**Verified:** a sixth `verify:tooltips` case renders the attribute-less bound host in real Chromium —
**6/6**. Four negative controls, all caught: the factory returning nothing, the factory writing the
attribute, one timestamp host unwired, and the wrong formatter (time instead of `short`). Svelte MCP
autofixer clean on both components (no issues). `svelte-check` 967 files, 0 errors; room suite 64
files, **646 tests**; prettier clean.

### 2026-08-12 11:27 EDT — The placements rendered in a real browser, which found three bugs

The previous entry shipped the placements with three limits named: no screenshot, an unexplained
0.25px residual, and no collision handling. All three are closed, and rendering them found defects
that 640 passing tests could not.

**`pnpm --filter room verify:tooltips`** drives real Chromium at `deviceScaleFactor: 2`, hovers each
placement and measures what is drawn — classes, settled opacity, z-index, arrow box, arrow border
colour, the 6px gap, cross-axis alignment and bubble size. It runs the REAL `src/lib/ngb-tooltip.ts`
(Node's own `stripTypeScriptTypes`, no bundler, no re-description) against the REAL
`css/complete-app-styles.css`, and exits non-zero on any mismatch. **5/5 correct.** Screenshots and
measurements in `apps/room/evidence-tooltip-placements/`.

**Bug 1 — the arrow was never positioned.** Bootstrap sets its width, height and one edge; Popper
writes `position: absolute` and the offset inline, which the capture shows plainly. Ours stayed a
block in normal flow and added its own height to the bubble: Chromium rendered 41.797px against the
capture's 29px, and 41.797 − 29 = 12.797 = the arrow. Invisible to every unit test, because jsdom
reports all rects as zero.

**Bug 2 — the arrow must point at the HOST, clamped to the bubble.** Centring it on the bubble is
only right when the bubble is centred on the host. For a `-end` variation the bubble aligns to the
host's trailing edge, and the arrow then points at empty space — Chromium put it at x 395.7 against a
host at x 450. Popper's `arrow` modifier centres on the reference and clamps; ours now does too.

**Bug 3 — my own assertion.** I asserted a flat 29px bubble height, which generalised the only
direction ever captured. Top and bottom really are ~12.8px taller, in the original as much as here:
the reference's own pinned sheet still carries the Bootstrap 4 block, and
`.bs-tooltip-top{padding:.4rem 0}` lands on ng-bootstrap's element because both generations spell
that direction `top` — while BS4's `left` never matches BS5's `start`. Verified present in
`docs/source/styles.d622cb9ed2bbc221.css`.

**The 0.25px residual is solved.** Popper's `roundOffsetsByDPR` — `Md(t.x*o)/o` with `Md=Math.round`
— snaps the translate to the device pixel grid, and the capture ran at `devicePixelRatio: 2`.
Applying it reproduces all three captured transforms and all three final rects **exactly**, on both
axes. `Math.round`'s half-toward-`+∞` is load-bearing: `Math.round(-2611.5) = -2611` gives the
captured `-1305.5`, while rounding half away from zero gives `-1306`. Python's banker's rounding also
gives `-1306`, which is how this was nearly recorded as still-unexplained a second time.

**Collision handling is not needed, and that is now proven rather than asserted.** `RI` hands flip
`fallbackPlacements: r` after `r.shift()` has removed the primary, so for any fixed placement the
list is EMPTY — and `[] || …` is `[]`, so flip gets no alternatives and never moves the bubble.
`preventOverflow` is registered with `fn: function(){}`. Only `auto` has alternatives, and no tooltip
renders with `auto`: the GIF control is `triggers="manual"`, the emoji host has `ngbPopover` and no
`ngbTooltip`.

**Negative controls, on the renderer:** arrow left in flow (0/5), arrow pinned to the bubble start
(0/5), arrow centred on the bubble instead of the host (4/5 — only `top-right` can distinguish them,
which is the point), bubble not translated on x (0/5) or y (0/5), offset 6→0 (0/5). Earlier, on the
unit suite: the `top`→`start` rename applied too broadly, the variation class dropped, top/bottom
swapped, centring replaced by edge alignment, and offset 6→**5.75**.

**Two failures I caused and had to rule out before believing either.** Playwright's mouse position
survives `setContent`, and every case centres the host at the same coordinates — so from the second
case on, `hover()` moved nothing and dispatched no `mouseenter`, producing a confident
"placement=top renders nothing" that was the harness. And I had put `position: relative` on the
parent span, making it the containing block and starving the bubble of width until the label wrapped
onto three lines; the reference's span is unpositioned, which the capture proves (resting left 1901.3
in a 1989px viewport). Every numeric check passed through that one — only the screenshot showed it.

**Verified:** `svelte-check` 967 files, 0 errors. Full room suite **64 files, 640 tests**. Prettier
clean. `verify:tooltips` 5/5.

### 15:05 — Every tooltip placement the room uses, derived from the reference's own arithmetic

The last entry closed gap 1 and recorded one thing rather than fixing it: `top`, `bottom` and
`top-right` render in the reference and refused to render here. "We don't render those hosts today"
was a reason to defer, not a reason to leave a hole. Closed now, and the evidence for it turned out
to be sitting in two files I had not opened.

**The mapping is code in the bundle, not a guess.** ng-bootstrap ships the placement table (`Coe`)
and the class function (`koe`):

```js
function koe(t,n){let[e,i]=n.split("-");
  const o=e.replace(/^left/,"start").replace(/^right/,"end");
  …return t&&(s=s.map(r=>`${t}-${r}`)),s.join(" ")}
```

with `baseClass:"bs-tooltip"` at the tooltip's own `createPopper` call (`bs-popover` for popovers).
Both are **ported**, not reduced to a hand-typed table of 22 rows. `left` → `bs-tooltip-start` is the
branch two captures prove, and running the reference's arithmetic means the other 21 are produced by
the same code that produces the verified one. `top-right` → `top-end` → `bs-tooltip-top
bs-tooltip-top-end`, and `data-popper-placement` now carries the RESOLVED placement, which is what
Popper writes.

**The classes are painted — read, not assumed.** The pinned `styles.d622cb9ed2bbc221.css` and our
shipped `complete-app-styles.css` both carry arrow rules for all four directions with the matching
`border-*-color`. Every computed value in the capture is explained by them: arrow `left:-1px`,
`border-width` `.4rem 0 .4rem .4rem`, `border-radius` 6px, `opacity .9`, `z-index 1080`.

**A real defect fell out.** The bundle passes `k_([0,6])` — a 6px offset between host and bubble —
and `place()` placed the edges flush. The captured rects agree: 5.75px of gap. Positioning is now a
pure exported `restingPosition()`, checked against all three captured tooltips at the pixels the
browser reported — **vertical within 0.02px, horizontal within 0.25px**. The 0.25px residual is
recorded as unexplained rather than absorbed by tuning the constant to 5.75; the bundle says 6, and
fitting it to three samples would be inventing a value the source contradicts.

**Negative controls, six of them, all caught:** the `top`→`start` rename applied too broadly (3
fail), offset 6→0 (5), the variation class dropped (1), offset 6→**5.75** (1), top/bottom swapped
(1), centring replaced by top-edge alignment (3). The 5.75 case is the one that matters — it proves
the geometry test distinguishes the real constant from a fitted one.

That mutant round is also why `restingPosition` is exported and pure. The first version of the offset
test read the implementation's source text for the right expressions, and **survived offset 6→0**.
jsdom reports every rect as zero, so mounting a tooltip and measuring proves nothing; handing the
captured rects to a pure function is what makes the check real.

Two stale comments fixed in the same file while re-reading the diff: a reference to a
`ngb-tooltip-contract.test.ts` that does not exist, and a "see `place()` for what that costs" pointing
at a function that no longer discusses it.

**Verified:** `svelte-check` 967 files, 0 errors. Full room suite **64 files, 635 tests, all green**.

**A note on the environment, because it cost an hour and was not the code.** Midway through, three
unrelated packages started failing identically — `picomatch.scan`, `tough-cookie`'s exports, and
jsdom's generated interfaces all came back as empty or partial modules. It reproduced in plain
`node`, independent of vitest. The machine had booted ten minutes earlier under load. Clearing the
three `.vite` caches and a forced re-link settled it; jsdom then constructed 6/6. Several of my own
diagnostic probes along the way were malformed — a `chdir` before a script-relative require, a
guessed `tough-cookie` path, a bracket-matcher that ran to EOF on minified JS — and each made an
intact package look corrupt. All were re-run properly before anything was concluded, and nothing was
reported as broken on the strength of them.

### 14:40 — Gap 1 closed, by disproving all three things it asserted

The presenter run on the live room arrived. Read alongside the bundle's own directive definition, it
overturned every part of the gap as written — including two readings that were mine.

**`triggers` is an NgbTooltip input.** The bundle:
`selectors:[["","ngbTooltip",""]],inputs:{animation:"animation",autoClose:"autoClose",placement:"placement",popperOptions:"popperOptions",triggers:"triggers",…}`.
Yesterday's note claimed `triggers:"manual"` sat "in the POPOVER's group" and so the tooltip was not
manual-triggered. Angular's `TAttributes` has no per-directive grouping — every static attribute
ahead of the `1` (classes) marker is set on the element, and every directive declaring that input
receives it. The capture agrees without needing the argument: seven hosts rendered a tooltip within
33ms, and the GIF control rendered nothing at all.

**`placement="auto"` was never a defect of ours.** The template declares it twice —
`["ngbTooltip","Search for GIFs","placement","top","placement","auto",…]`. One attribute reaches the
DOM and it is the later one. The captured host is
`placement="auto" container="body" autoclose="outside" popoverclass="popOverDiv" triggers="manual"`,
which is what `+page.svelte` already emitted, attribute for attribute. `top` is dead in the reference
too.

**The eye badge has no tooltip to capture.** The `#screenTabs` region uses
`tooltip="Unlock this screen?"` and `tooltip="This is the default screen users are taken to right
now…"` with `placement="bottom"` — and the bundle contains **no `[tooltip]` directive selector**;
`"","tooltip",""` appears zero times against exactly one `"","ngbTooltip",""`. Those are inert
attributes. The hover text there comes from native `title="Lock this screen?"` /
`title="Unlock this screen?"` beside `fa-eye`, which the OS draws. **The instruction to re-run while
sharing a screen was futile and I had written it into `TODO.md` twice.**

**Shipped:** `ngb-tooltip.ts` returns before binding anything when `triggers="manual"`, ahead of the
placement lookup so a correct control no longer warns on every render.
`ngb-tooltip-triggers-contract.test.ts` pins all of it — 12 cases reading the capture and the bundle
rather than transcriptions. Both tooltip suites green, 31 tests; `svelte-check` 966 files, 0 errors.

Also recorded, from reading every `"placement",` entry in the bundle: the room's full inventory is
`left`, `top`, `bottom`, `top-right`, `auto`. We render no `top`/`bottom`/`top-right` host today, so
the attachment's refusal covers nothing real — and if one is built, `bottom` is capturable by
hovering the Welcome Mat badge and `top` by the webinar question-mark icon, neither needing a screen
share.

Capture saved as `apps/room/evidence-tooltips-presenter-2026-08-12.json` (Bootstrap 5.3.3, 8 hosts,
60 native `title` attributes).

### 14:15 — The manage page's tooltip system, captured — and it proves the two generations again

**No runtime impact.** One evidence file tracked.

The owner ran `collect-tooltips.js` on the MANAGE page rather than the room, so it does not close
gap 1 — but it captured something no dump here contained, and it independently confirms a finding
that had rested on `.panel` markup and stylesheet contents alone.

```html
<div
  class="tooltip bottom ng-animate fade-add in-add fade fade-add-active in in-add-active"
  tooltip-popup=""
  content="Account Settings"
  placement="bottom"
  is-open="isOpen"
></div>
```

`.tooltip` + a bare direction class + `.in` is **Bootstrap 3**, driven by AngularJS UI Bootstrap's
`tooltip="…"` / `tooltip-placement="…"` attributes — visible on the host, `<a class="icon fa fa-cog"
tooltip-placement="bottom" tooltip="Account Settings">`. It is inserted as a sibling inside the
host's `<li>`.

The room renders `<ngb-tooltip-window class="tooltip fade show bs-tooltip-start"
data-popper-placement="left">` — Bootstrap 5 via ng-bootstrap, with `.show` rather than `.in` and a
`bs-tooltip-*` direction rather than a bare one.

**Two surfaces, two tooltip systems, sharing only the word `tooltip`.** That is the third independent
line of evidence for the two-Bootstrap-generations finding, after the `.panel` markup and the
`bootstrap.min.css` rule set, and the first from rendered DOM on both sides. Saved as
`apps/controller/evidence-tooltips-manage-2026-08-12.json`.

Two honest notes the run itself recorded: it was signed in as a **member**, so presenter-only
controls were absent; and 29 elements on that page use a native `title` attribute, which the OS draws
and no script can capture.

Gap 1 still needs the same one paste, on `chat.protradingroom.com` **while sharing a screen**.

### 13:55 — Item U reduced to one line, gap 1 halved, and the collector no longer strands tooltips

**No runtime impact.** One collector hardened; two rows reduced to what is genuinely open.
715 / 65 controller, 604 / 62 room.

**Item U: the background is closed with four independent confirmations.** Every `#screenTabs` node in
`proroom-ULTIMATE-staff-2026-07-24…json` reads `background-color: rgb(17,17,17)` — across the
`main-tab:Screens`, `Streams`, `Notes` and `Files` captures. Ours is `var(--notes-tabs-bg)` = `#111`,
the variable the captured sheet keys `.screens-tabs` off by name.

**And the height never needed the number.** All four captures are of an EMPTY bar — h=1, its own
border, or h=0 when the pane is hidden — so the populated height is still underived. It does not
matter: our sheet pins no height and uses `auto`, which reproduces both states because
`.nav-tabs .nav-item { margin-bottom: -1px }` cancels the bar's own border once it has tabs, and
`screen-tab-bar-contract.test.ts:87` fails if anybody pins one. **A derived 41.5 that nothing
consumes is a note, not a gap.** U is now one line: the volume dropdown's trigger, which is a
collapsed `<!---->` in every capture.

**Gap 1: `Search for GIFs` is solved, and it exposed a divergence.** The room bundle carries that
element's const table verbatim:

```
["ngbTooltip","Search for GIFs","placement","top","placement","auto","container","body",
 "autoClose","outside","popoverClass","popOverDiv","triggers","manual",…,"ngbPopover"]
```

**Two `placement` entries.** `top` belongs to the ngbTooltip, `auto` to the ngbPopover — and
`triggers: manual` sits in the POPOVER's group, so the tooltip is not manual-triggered and my earlier
reading of that was wrong. Our markup collapses the two into a single `placement: 'auto'`, so that
tooltip carries no placement of its own and the attachment refuses to render it. Fixing it needs
`top`, which has never been captured rendering — `bs-tooltip-top` is the obvious name and obvious is
not evidence.

**The collector no longer leaves anything behind.** The 2026-08-11 run stranded four tooltips in the
message-modal copies: one round of leave events and a fixed 150ms wait, against a `.tooltip` carrying
`transition: opacity .15s linear` and hosts inside hidden modals that may never receive a pointer
event. It now retries four times at 250ms, also fires the pointer onto `document.body` — which is
what really ends a hover — and if an element still will not go, removes the node it created. The page
is the owner's; leaving a black bubble stuck over their room is not an acceptable cost of observing
it. Whether it had to force one is recorded, because that means the close path needs another look.

One paste now closes both remaining tooltip placements: run it **while sharing a screen** for the
`bottom` eye badge, and hover the GIF control for `top`.

### 11:05 — The next two gates: a path bug in three verifiers, and an unpinned migration

**No runtime impact.** Verifier fixes and one capture tracked. 715 tests / 65 files, room 604 / 62.

With `schema:verify` alive, `pnpm test` moved on to failing at step 2. Diagnosed end to end.

**Three verifiers could never run.** `verify-backend.mjs`, `verify-backend-provenance.mjs` and
`verify-api-release-artifact.mjs` each compute
`REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))`. From `apps/controller/scripts/`
that is the APP root. Every path they check is `services/api/…`, which lives at the **repository**
root, so all three died on `scandir` before reading a file. They came from the sibling repository,
where `services/` sits beside `scripts/` and `'../'` was correct; moving them under
`apps/controller/` invalidated the assumption without changing the name. Now `'../../../'`.

**With the path right, it immediately caught a real thing.** `0009_rename_runtime_roles.sql` was
added 2026-08-10, deployed, and had a preflight defect found and fixed in it — all without ever being
pinned, because the verifier that exists to pin exactly that could not execute. It is the
highest-risk shape a migration here can have: it renames the runtime role `migrate.rs` requires by
name BEFORE the chain runs. Now pinned by SHA-256, with the gap between the two dates written into
the entry.

**The third cause is the owner's, and is deliberately not silenced.** The gate now reports
`file count changed: expected 98, got 99` — the real `services/**` divergence item P describes.
`ops/backend-import-provenance.md` records what was IMPORTED from the source, and 0009 was authored
here, so bumping the count to 99 would claim an import that never happened and hide the thing P
exists for. The chain stays red at step 2, honestly now instead of on a path bug.

**And `evidence:verify` (step 4) needs the full evidence tree.** It expects nine entries under
`evidence-dumps/`; this repository has only the 216 KB `login-page/manage` that `schema:verify`
needs, now tracked. The full tree is **45 MB** in `new-room-control/`. Pulling it is one command in
the sanctioned direction, but committing 45 MB is not a call to make unilaterally at the end of a
session — recorded as `TODO.md` item Z.

### 10:35 — Item Y CLOSED. Settings back to baseline, and a gate that never ran now runs

**Runtime impact: yes, in the controller.** 715 tests / 65 files, room 604 / 62, `svelte-check` 0/0
both, format clean, documented counts verified.

`schema:verify` **passes for the first time.** It is the first step of `pnpm test` and had been
throwing `ENOENT: evidence-dumps/login-page/manage` — a file that never existed here — so the chain
failed at step one and the generated settings schema was unverifiable. The capture is now tracked,
the generator runs, and the schema it produces matches byte for byte.

Settings side-by-side, measured at every step: **1094 → 65 → 63 → 62 → 16**, its baseline. Users 2/2
and User Stats 6/6 unchanged.

**The fifth cause, found by looking rather than reasoning.** `+page.svelte` carried a hardcoded
`<label>` for `doNotAutoSoftReset`, with a comment saying "`help` cannot express that, so it is
furniture here". True when written; false once `helpShape` existed — the shape system rendered the
helper and so did the literal, so it appeared **twice**. That was the whole of the remaining 62.

Its comment named the missing property exactly: the helper is a **sibling of the row's `<p>`**, not
a child. Indent proves it — the helper sits one level shallower than its own anchor — and counting
across the capture finds **three** settings that do it, not one: `pairOKRedirect`,
`pairErrorRedirect` and `doNotAutoSoftReset`. So it is generated as `helpOutside` rather than matched
by name, and the next setting that does it is placed correctly instead of wrongly.

**Four hand-maintained exceptions are gone.** `BARE`, `CLASSLESS` and `NO_BR` named 16 settings by
hand beside a generated file of 269, and the page named a seventeenth. All four are deleted, and the
replacement was **verified before it was made**: all 9 `CLASSLESS` names generate `plain`, all 4
`NO_BR` names generate `bare`, and the placement flag finds exactly the three the outline puts
outside. Every one of them had already drifted — the tables held 3 of the 11 text-node helpers, so
the other 8 rendered with a class and a `<br>` the reference has none of.

**One more defect found on the way in.** `webinarDate` carries `· "&nbsp;"` between its anchor and
the next row — spacing, not a helper. Taking it produced `help: ""` with a shape, which renders an
empty element. Whitespace-only text is no longer a helper, and the text-node count corrected from 13
to **11**.

`CORRECTED` stays, and is now honestly what its docblock says: three helpers whose TEXT the
whitespace collapsing damages. It is no longer also a workaround for `outline.mjs` truncating at 160
characters, because that cap is now 1000.

`setting-help-shape-contract.test.ts` pins all of it in 14 cases — the four shape counts, the three
outside settings by name, the mapping from each shape to its markup, that the tables and the
hardcoded label are gone, and that the longest helper survives whole. Negative control: forcing
`outside: false` fails two of them.

### 10:00 — Item Y: four causes fixed, the fifth localised. Settings 1094 → 62

**No runtime impact.** Generator and decoder only; every src-side change was reverted. 701 tests /
64 files, `svelte-check` 0/0.

Worked end to end. The Settings side-by-side against `new-room/mising/file2`, measured at each step:
**baseline 16 → 1094 → 65 → 63 → 62.**

**(1) A helper taken from inside a conditional block.** `pairSecretKey` absorbed "Sample link you
would need to use to add each user…", which labels the sample-link input inside a
`<div ng-show="sess.hasAppPairLink && sess.pairSecretKey">`. One mis-attribution offset every node
after it. **1094 → 65.**

**(2) The schema recorded help TEXT but not SHAPE.** The reference writes helpers **four** ways,
counted by walking from each `saveSessField(` to its helper: **136** `<br><label class="muted">`,
**37** `<br><label>`, **5** bare `<label>`, and **13** a plain TEXT NODE with no element at all. The
fourth was invisible to a `<label>`-only scan. `helpShape` is now generated.

**(3) `outline.mjs` truncated every text node at 160 characters.** Four helpers shipped cut off
mid-sentence, and `room-settings-help.ts` carried a hand-written `CORRECTED` table restoring three of
them — that table was a workaround for this cap, not for whitespace as its docblock said. The fourth,
`chatTabsWithBadges` at 203 characters, nobody had noticed. Raised to 1000.

**(4) `settingHelp()` consulted three hand-maintained tables** — `BARE`, `CLASSLESS`, `NO_BR`, 16
names transcribed by hand — beside a generated file of 269 settings. A second source of truth, and it
had already drifted: it held 3 of the 13 text-node helpers, so the other 10 rendered with a `muted`
class and a `<br>` the reference does not have. **The replacement was verified before it was made:**
all 9 `CLASSLESS` names generate `plain` and all 4 `NO_BR` names generate `bare`, so the derived
shape reproduces the hand-written one exactly wherever the two overlap.

**(5) Remaining: 62, all one insertion.** At `doNotAutoSoftReset` our render emits its helper —
`label` + text — twice where the reference emits it once. Ruled out by reading: not a duplicate
schema row (269 names, zero duplicates), not the two settings loops (their slices are disjoint —
`apiSecret` at index 130, this setting at 206), not `helpCopy` (renders once), and the reference's own
capture contains that string once. I have not found the second emitter and will not guess at it.

**Nothing is half-applied.** The evidence file, the regenerated schema, the `settingHelp` rewire and
the renderer change were all reverted, so the suite is green and `schema:verify` is dead exactly as at
HEAD. Only the generator and decoder fixes are committed; they change nothing until the schema is
regenerated, which has to be the same commit that resolves (5) and moves the baseline.

### 09:35 — The media reconnect toasts, read out of the reference's own bundle

**Runtime impact: yes, in the room.** 604 tests / 62 files, `svelte-check` 0/0.

The owner supplied the rendered markup:

```html
<div class="toast-title" aria-label="Media">Media</div>
<div role="alert" class="toast-message">
  Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>
</div>
```

`docs/source/main.d6d3c112b59b7d0d.js` carries the call that produces it, in the mediasoup socket's
`disconnect` handler — and a second one beside it that the markup alone would not have revealed:

```js
i.reconnectToast ||
  ((i.reconnectToast = i.toastr.info(
    'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>',
    "Media",
    { disableTimeOut: !0, tapToDismiss: !0, closeButton: !0, enableHtml: !0 },
  ))(i.liveMicTrack || i.liveCamTrack || i.liveScreenTrack) &&
    !i.presenterReconnectToast &&
    (i.presenterReconnectToast = i.toastr.info(
      "Reconnecting media (presenter)... re-sharing mic/cam/screen",
      "Presenter",
      { disableTimeOut: !0, tapToDismiss: !1, closeButton: !1 },
    )));
```

**They are ADDITIONS, not replacements.** The bundle still contains "Connected to Media Server" and
"Disconnected from Media Server", which the room already raised from the older `alertService`
capture, so the reference shows both and so do we.

Four things came out of the bundle that the rendered markup could not have given:

**`disableTimeOut`** — these never expire. `showToast` now takes `0` to mean that and returns the id
so a sticky toast can be cleared by whatever raised it. A banner saying "reconnecting" must not clear
itself while the thing is still disconnected, and the redial backoff climbs to one attempt every 30s.

**The `||` guard** — one at a time, however many redials run. Without it every attempt stacks another.

**The presenter toast is conditional and undismissable.** Raised only when this peer holds a live
track, and with `tapToDismiss: !1, closeButton: !1` where the member's has both. That asymmetry is
deliberate upstream: a presenter whose mic is being re-shared needs to know it, and it goes when the
re-share finishes rather than when they click. Mapped onto what this room actually holds —
`localMicProducerId`, `webcamStream`, `localScreenStreams` — and a muted mic still counts, because
muting pauses the producer rather than closing it.

**Where they are cleared.** Inline in the socket's `connect` handler, beside
`emit("mediaServerConnected")`. The reference's own `clearReconnectToasts()` duplicates that body and
is called from nowhere in the bundle — dead code upstream, so there is no second path to reproduce.

Eleven contract cases, reading BOTH sides out of files so the test and the implementation are checked
against the same bytes. Negative controls: making the toast expire, and raising the presenter one
unconditionally, each fail their case.

One thing to own: I first wrote `localMediaState.micTrack` — a name that does not exist in this
codebase. `svelte-check` caught it immediately, and it is the exact failure mode this project
forbids. The real three were found by reading rather than by guessing again.

### 08:58 — Eight changelog entries were reported as written and were not

**No runtime impact.** Bookkeeping, and a failure of mine worth recording rather than quietly fixing.

Every entry from 15:06 through 07:46 was missing from this file. I wrote them with a Python
`str.replace(anchor, entry + anchor, 1)` against a heading I had transcribed slightly wrong — the
14:55 heading reads "four defects in the collector fixed" and I anchored on "four collector defects
fixed". `str.replace` is a **silent no-op** when the needle is absent, and the script printed "ok"
unconditionally afterwards. Every later entry chained off the same missing anchor, so all eight
vanished, and I reported each one as done.

The same class as the failures already in this file: a check that cannot fail. `node --check` passing
on `constdescription`, `indexOf` returning -1 into a `<` comparison, a smoke harness whose stub was
the thing under test. A script that reports success without verifying its own effect is that pattern
again, in a tool rather than in a test.

All eight are now restored, with times taken from the **commit timestamps** rather than reconstructed
from memory — `da82a50` 14:57 through `6007e69` 07:46 — and each names its commit. What was written
in `TODO.md` at the time was correct throughout; only this file lost them.

### 07:46 — The helper SHAPE is generated, and the last cause of item Y is located

**No runtime impact.** Generator only. 701 tests / 64 files, `svelte-check` 0/0.

The reference writes a helper THREE ways, counted across `evidence-dumps/login-page/manage`:
**136** as `<br><label class="muted">`, **37** as `<br><label>`, **5** as a bare `<label>` with no
`<br>`. The schema recorded the help TEXT and not the shape, so our renderer emitted the muted form
for all 178 — a `muted` class on 42 helpers that have none, a `<br>` before 5 that have none.
`helpShape` (`'muted' | 'plain' | 'bare' | null`) is now generated and reproduces those counts
exactly.

With the shape wired through, Settings still read 65 differing, and the cause is located: **DON'T
TOUCH settings render their helper twice.** The `dontTouch()` snippet at `+page.svelte:813` and the
generic settings loop both emit it, so a `group: 'dont-touch'` row shows `label.muted` AND `label`
where the reference has one bare `label`. That is the whole of the remaining 65.

Nothing half-applied: the evidence file, regenerated schema and renderer change were all reverted, so
the suite is green and `schema:verify` is dead exactly as at HEAD.

## 2026-08-11

### 19:22 — A generator bug fixed; my "two captures disagree" claim withdrawn

**No runtime impact.** `0848e1f`.

**The 19:16 claim that two captures of the manage page disagree about help text is WITHDRAWN.** They
do not: `new-room/mising/file2`, `evidence-dumps/login-page/manage` and the uncompiled partial all
carry exactly **141** `<label class="muted">`. The committed schema is simply stale, and saying
otherwise put a fabricated conflict into the record. The uncompiled partial settled it, since it
generates the captures — `evidence-page.manageSession.html:1026` carries the label verbatim.

**The real defect:** the generator took a helper from inside a following `<div ng-show=…>`.
`pairSecretKey` absorbed "Sample link you would need to use to add each user…", which labels the
sample-link input inside that block. That one mis-attribution offset every node after it and drove
the Settings side-by-side from a baseline of 16 to **1094 of 1507 differing**. Breaking on a
conditional container gives `pairSecretKey: help: null` and drops it to **65**.

### 19:16 — Item X closed: the self-serve pairing door, and a dead gate found

**Runtime impact: yes.** `f91dda3`. 701 tests / 64 files.

`GET /ptr_app/sessions/v2/addUser/<publicId>/?sec=…&email=…&name=…` exists. Path, parameters and the
two literal placeholders are transcribed from `evidence-page.manageSession.html:1141`, gated at
`:1138` by `ng-show="sess.hasAppPairLink && sess.pairSecretKey"` — an enabled room with no secret is
unconfigured, not open.

One divergence, forced by architecture: the **host**. The reference serves this from the room; ours
is on the controller because the controller owns memberships. The path matches exactly.

Said plainly, it is a room-scoped bearer secret in a URL — the reference's design. What is not
reproduced is vagueness about its limits: it can only create a **plain member** through
`inviteRoomUser`, the secret is compared in constant time, all four refusals return one 403 with one
message, and an unknown room answers exactly as a wrong secret does. The secret's FORMAT is not
invented — `sec=` came back empty in the capture, so no populated key has been observed and no
length or alphabet is assumed. Negative controls: a naive `===` and a distinct 404 each fail.

**And a gate was found dead.** `pnpm test` runs `schema:verify` first, and at HEAD it throws
`ENOENT: evidence-dumps/login-page/manage` — a file that has never existed here. The chain has been
failing at step one and the generated schema has been unverifiable.

### 19:05 — Item W closed: the visit rows and their IP addresses left the page payload

**Runtime impact: yes.** `a3870cb`. 691 tests / 63 files.

The manage loader selected up to 5,000 `room_sessions` rows and returned them as `visits` so the
browser could build a CSV — ~755 KB serialised into every load, every row carrying a visitor's **IP
address and email**. `GET /account/rooms/<shortCode>/stats.csv` now produces it, behind the same
`requireUser` + `requireOwnedRoom` gate, ownership checked before the rows are read,
`cache-control: private, no-store`.

The 5,000 cap is gone deliberately: it existed because an unbounded SELECT behind a PAGE LOAD is a
slow-motion outage, which does not apply to a file somebody asked for. Silently truncating an export
is worse than a slow one. `?limit=` is honoured and clamped.

The format moved to `$lib/stats-csv.ts` rather than being copied, so the endpoint and its tests share
one definition. **The existing format contract caught the move**, failing six cases; three were
asserting source TEXT for things now structural and were rewritten to exercise the function and
assert the OUTPUT. **The side-by-side contract caught a regression I introduced** — making Export an
`<a>` made the page differ from the reference by one more node, since the reference's own markup is a
`<button>`. It is a button again.

### 18:55 — TODO.md reduced to what is actually open

**No runtime impact.** `d33677a`.

Eleven closed rows were still in the evidence-gap table marked CLOSED, breaking that file's own rule
that closed items are REMOVED and their history lives here. The blocking table now holds one row.
Gap 12 moved rather than closed — its evidence is complete but no `addUser` route existed, which is
missing work rather than a missing fact.

The section header now carries the lesson forward: four of the twelve were already answered by
captures unread since 2026-08-01 while the rows claimed otherwise. Read what is in `new-room` and
`new-room-control` before writing another collector.

### 16:18 — Gap 4 implemented, gap 10 fully closed, the screen tab attributes fixed

**Runtime impact: yes.** `f8632ef`. 678 tests / 62 files.

**Gap 4 is working code, not just an answer.** The loader said "Picking one would be inventing the
semantics" about three candidate columns. The bundle names one: `loadMobileUsers` keeps a user when
`alerterAppTokens.length`, which is `pushTokensJson`. Both filters are live, `listRoomUsers` selects
the column, and 7 contract cases pin it — including that it reads the column as JSON, since `'[]'` is
a non-empty string and an empty list. **The upstream inversion is pinned against, not copied:**
`loadNonMobileUsers` slices at 10,000 then keeps users who HAVE tokens.

**Gap 10's `:hover` half closed, and never needed a rendered state.** All fifteen stylesheets are
captured as FILES carrying **449 `:hover` rules**. The row's premise that they were unverified was
false; what cannot be captured is the rendered STATE, which was never the thing to match.

**`user.type` named.** The Role cell comment said the field "is not nameable from this evidence" — it
was never unnameable, only unfetched. **"login" is withdrawn**: it appears in none of the five files
carrying that row.

**Screen tabs:** `data-bs-target` removed to match. `aria-selected` and `tabindex` are deliberate
divergences under one rule — a captured value is reproduced unless reproducing it locks a real person
out. Upstream all three tabs claim `aria-selected="true"` and the anchors have neither `href` nor
`tabindex`, so they are keyboard-unreachable.

### 16:07 — All twelve blocking gaps closed

**No runtime impact.** `8cc7983`.

**Gap 1:** a new room has no name on the client. `createNew` POSTs `cmd:"newSession"` with email and
token and **no name field**, then goes straight to the manage page. The Settings capture's
`editable-click` reading **"Room 3627"** was the server-generated default. Our required name input is
a confirmed divergence. The error path also **logs the user out**.

**Gap 2:** the original shows nothing on save. `saveSessField` returns the POST promise with no
`.success` and no `.error`. `generateNewApiSecret` in the same slice chains
`.success(… bootbox.alert(…))`, so when this app wants to confirm it says so.

**Gap 3:** line 636 is the entire editor declaration — no toolbar config, no `disabled`. That
attribute on 29 of 30 buttons is textAngular's own runtime state.

**Gap 7:** `customMobileAppLaunchWord` replaces the deep-link scheme. `launchPTRApp` defaults to
`protradingroomapp://` and substitutes the word, building `<scheme>?t=&s=&pc=`.

Four gaps came from captures unread since 2026-08-01, four from the uncompiled manage view, four from
the bundle. Not one needed a value invented.

### 15:30 — The uncompiled manage view is in hand: gaps 4, 5, 6 and 8 closed

**No runtime impact.** `be5a543`. Three scripts in sequence, each failure narrowing the next.

`pull-app-bundle` fetched all three bundles — `vendor.min.js` 1,245,997 B, `janus3.js` 79,285 B,
`app.min.js` 455,314 B — and hit six of seven targets. But `user.role==0` was absent from all of them
and no `$templateCache` carried the role spans. **That absence was the finding:** this app does not
inline its views. `pull-manage-partial` read the state verbatim — `templateUrl:
Route.base("page.manageSession.html")`, a function call, so no literal path exists and every
directory guess returned a 52-byte stub. `pull-template-cache` found it at
`/public/app/views/page.manageSession.html` — **216,609 bytes**, committed as evidence.

**Gap 5:** the token is `{{user.type}}`, at line 420. **"login" was never observed in any file in
either folder** and that claim is withdrawn. **Gap 4:** two of three filter CLIENT-side on
`alerterAppTokens`; Marketplace uses its own `userListMarketplace` command. **Gap 6:** the three
branches are icons in the user row, not menu items. **Gap 8:** the two hidden items are **Batch User
Invite** (`doBatchInvite()`) and a separator.

### 15:06 — Four gaps were already captured; the TODO rows were stale

**No runtime impact.** `023ad0b`.

The owner said everything was already pulled and to read the dumps rather than search them. Correct:
I had been trusting `TODO.md` rows instead of the files they describe, and asking for re-runs of
captured work. `evidence-dumps/NEXT-STEP/gaps/`, captured 2026-08-01 on the same room the 2026-08-11
run used, holds eleven states with per-node rects and computed styles plus all fifteen stylesheets.

**Gap 9 closed, and the proof is arithmetic:** 207 `a.editable.editable-click` on the Settings tab
against 256 with the disclosure open — a delta of **exactly 49**, the 49 `dont-touch` settings the row
called unverified. **Gap 11 closed:** 1017 and 1265 nodes, neither truncated. **Gap 10 closed for the
manage page:** two open dropdowns and an open permissions modal here, seventeen more in `ptr1.json`.
**Gap 8 answered:** the menu captured open with 9 items at 199x25. **Gap 5 still open**, for a stated
reason: that capture's user table is empty.

**Why every collector missed it:** xeditable renders each setting as an anchor, not an input, so
counting `input, select, textarea` finds almost none.

**`ptr1`/`ptr2` are not room dumps** — `__meta__.url` says `#/page/manageSession/…` and
`#/page/welcome`, `role: member`. They carry all fifteen stylesheets with full rule text.

### 14:55 — The manage collector ran; gap 12 closed, and four defects in the collector fixed

**No runtime impact.** One evidence file, one collector fixed. No application code.

The owner ran `collect-manage-gaps.js` three times. The first two were on the wrong page — the room,
then `#/page/welcome` — and the collector said so rather than inventing data. The third was on
`#/page/manageSession/6a6529b318781e20ed81947d`, which is the right one, and it is committed as
`apps/controller/evidence-manage-gaps-2026-08-11.json`.

**Gap 12 is closed as an evidence gap.** The app-pair link is an
`<input class="form-control col-md-6">` — a read-only URL field, not an anchor — holding

```
https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/6a6529b318781e20ed81947d/?sec=&email=__userEmail__&name=__userName__
```

Three guesses became facts: the host is the **room** (`chat.`) and not the controller; the path is
`/ptr_app/sessions/v2/addUser/<publicId>/`; and the placeholders are the literal strings
`__userEmail__` and `__userName__`. `sec=` came back **empty**, which is its own finding — this room
has no `pairSecretKey` set. What remains is not an evidence gap but missing work: no `addUser` route
exists on either host.

**Gap 8 is answered, and the answer is an absence.** `unamePWCommentPresent: true` — the
`ngIf` comment is in the DOM, so Angular evaluated the condition and stripped the block. This room is
not in `unamePW` mode and the two items are genuinely absent, which is exactly the shape the
collector's own note predicted the answer would take.

**The rest of that run was the collector failing, and its own log said how.** Four defects, all mine,
all now fixed and verified against a real DOM rather than the hand-rolled stub the existing smoke
harness uses:

1. **It captured the wrong pane.** `paneSelector: "tab-pane ng-scope active"` with **one** field — a
   search box named `title` carrying `ng-enter="loadUsers(uSearch)"`, which is the USERS pane. The
   Settings tab was found by matching text across `a, button, li`, a `li` won, and in AngularJS the
   handler is on the `a` inside it. `clickableWithin()` now clicks the innermost control.
2. **It could not tell "not rendered yet" from "wrong pane".** A fixed 1200ms sleep then serialise.
   It now records the active pane before clicking, polls until the field count is stable for two
   consecutive reads, and reports `paneChanged` and `settledAfterMs` — so those two failures produce
   two different messages instead of one misleading one.
3. **The denylist refused a menu on the word "email".** "Actions With the Email List" was never
   opened, and gap 10 stayed open over a false positive. The guard is now applied by CAPABILITY: an
   element whose only power is `data-toggle="dropdown"`/`tab`/`collapse` reveals what is already on
   the page and is opened; anything carrying an `ng-click` handler is still refused by wording. No
   menu ITEM is ever clicked, and that is enforced by there being no code path that clicks one.
4. **Gap 9 counted a different set of fields than gap 11.** `input, select, textarea` in one place
   against a wider set in the other, so its "23 → 23" could not have been trusted even if the click
   had worked. One `FIELD_SELECTOR` now serves both.

Verified by execution: against a real DOM the Settings pane now reports `paneChanged: true`,
`fieldCount: 264` — up from 1 — settled after 638ms, with zero refused clicks and the menu captured.

### 14:35 — `css-modals` identified: the product runs TWO Bootstrap generations, and it verifies the manage page

**No runtime impact.** One evidence file pulled in, one contract test, documentation. No `.css` or
`.svelte` changed.

The owner supplied `new-room-control/css-modals`. Read as evidence, it answers a question nobody had
asked and that nothing in this repository recorded: **the product is built on two different
Bootstrap generations, on two different surfaces.**

| surface                              | generation          | proof                                                                                                                                                                                                                           |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the room (Angular 2+)                | **Bootstrap 5**     | the live tooltip renders `tooltip fade show bs-tooltip-start` with `data-popper-placement`, which only 5 emits; its modals carry `modal fade show` + `aria-modal` and **zero** `modal fade in`                                  |
| account / manage / login (AngularJS) | **Bootstrap 3.3.7** | `div class="panel panel-default"` six times across `evidence-dumps/login-page/{login,logged-in-page,manage,complimentary}`, beside `ng-show`/`ng-hide`. `.panel` is Bootstrap 3 only — 4 replaced it with `.card`, 5 dropped it |

`css-modals` is the source for the second surface: the Bootstrap 3.3.7 LESS tree, the compiled
`bootstrap.css`, and a `styes.css` headed **"Naut - Bootstrap Admin Theme + AngularJS"** — the theme
the AngularJS half was built on.

**It changes nothing in the room, and that is a result rather than a disappointment.** Bootstrap 3
spells tooltips `.tooltip.left` + `.in`, with arrows drawn from `width:0;height:0` borders. There are
**zero** such rules in our applied sheet or in the reference's own `styles.d622cb9ed2bbc221.css`, so
Bootstrap 3 is not in the room's cascade at all and the tooltip work stands unchanged.

**What it did do is verify work already shipped.** `apps/controller/src/manage.css` was transcribed
from a RENDER — its own header records that no rect dump for that page existed. Every `.panel*` value
in it matches Bootstrap 3.3.7 to the byte: `margin-bottom: 20px`, `background-color: #fff`,
`border: 1px solid transparent`, `border-radius: 4px`, `padding: 10px 15px`, `border-color: #ddd`,
`color: #333333`, `background-color: #f5f5f5`. And `account.css`'s note that "the 15px inset belongs
to the HEADINGS" — derived from `439.5 - 424.5` measured in a capture — is
`.panel-heading { padding: 10px 15px }` upstream.

Two independent derivations agreeing to the byte is the strongest form this evidence takes. **Nothing
was edited to make them agree.** `bootstrap.css` is pinned as `apps/controller/evidence-bootstrap-3.3.7.css`
(SHA-256 `74a581f4…`) and `manage-panel-bootstrap3-contract.test.ts` reads BOTH sides out of files —
no literal is typed into the test — so it cannot pass because the same wrong number was written
twice. Negative control: a 1px drift in one padding fails it.

It also names the authority for eight open gaps. Gaps 1, 2, 3, 5, 8, 9, 10, 11 and item S are all on
the AngularJS surface, and their styling questions now have a source instead of a sampled computed
style.

### 14:24 — The collector ran, disproved the tooltip implementation, and it was rebuilt from the capture

**Runtime impact: yes, in the room.** 593 tests / 61 files, `svelte-check` 0 errors 0 warnings.

**The implementation shipped at 13:55 was wrong in every decision it made, and it was wrong because
it was built on inference.** It emitted a `div.tooltip.show.bs-tooltip-left` with a `.arrow` and
`x-placement`, appended to `document.body`, reasoning from `x-placement` appearing in three modal
captures that the app must be Bootstrap 4. That reasoning was written up as though it were evidence.
It is the one thing this project does not allow, and the collector — which should have been written
FIRST — disproved all five decisions in a single run.

What the live original actually renders, captured on `chat.protradingroom.com` as a presenter:

```html
<ngb-tooltip-window
  role="tooltip"
  id="ngb-tooltip-9"
  class="tooltip fade show bs-tooltip-start"
  data-popper-placement="left"
  style="position: absolute; inset: 0px 0px auto auto; margin: 0px;
         transform: translate3d(-1255.5px, 1074.5px, 0px);"
>
  <div data-popper-arrow="" class="tooltip-arrow"></div>
  <div class="tooltip-inner">Add Emojis</div>
</ngb-tooltip-window>
```

A custom element, not a div. `tooltip-arrow`, not `arrow`. `data-popper-placement`, not
`x-placement`. `bs-tooltip-start`, not `bs-tooltip-left`. A **sibling of the host** inside
`span.textAreaBtns` — `isDirectChildOfBody: false` — not appended to the body. And a `fade` class,
caught mid-transition at `opacity: 0.099804`, which is the proof it animates.

**The rebuild asserts against the capture, not against a description of it.** The output is
committed as `apps/room/evidence-tooltips-presenter-2026-08-11.json`, and every expectation in
`ngb-tooltip.test.ts` is READ OUT of that file at run time — element name, class set, placement
attribute, arrow markup, insertion point, id format. Nothing is transcribed by hand, so the test
cannot drift from the evidence and cannot be satisfied by a value somebody typed into it. Negative
control: restoring the inference-based implementation fails 6 of the 21 cases, one for each wrong
decision.

**The CSS half is closed too, and by the owner's own pointer** — every stylesheet is saved in
`new-room`/`new-room-control`, and `docs/source/styles.d622cb9ed2bbc221.css` is the reference's own
sheet, already SHA-256 pinned here. Every captured computed value now traces to a rule in it:

- `.tooltip{--bs-tooltip-zindex:1080;…}` — the Bootstrap 5 block comes after the Bootstrap 4 one and
  wins, which is why the captured `z-index` is 1080 and not 1070
- `.tooltip-inner{padding:var(--bs-tooltip-padding-y) var(--bs-tooltip-padding-x)}` = `.25rem .5rem`
  = the captured `4px 8px`; `border-radius:var(--bs-border-radius)` = the captured `6px`
- `.bs-tooltip-start .tooltip-arrow{width:var(--bs-tooltip-arrow-height);height:var(--bs-tooltip-arrow-width)}`
  — `.4rem`/`.8rem` **swapped**, which is exactly the captured `6.39844 x 12.7969`
- `.bs-tooltip-start .tooltip-arrow:before{…border-left-color:var(--bs-tooltip-bg)}` — the captured
  `border-width: 6px 0px 6px 6px` on a black arrow

**What is deliberately NOT implemented, because it was not captured.** Only `placement="left"` was
observed, so `left → bs-tooltip-start` is the only mapping in the code. Bootstrap 5 renamed left and
right to start and end, so `right` is presumably `end` and top/bottom presumably keep their names —
**presumably is not evidence.** Any other placement refuses to render and logs why, and a test
asserts that refusal. All nine wired sites use `left`, so nothing is missing today.

Three things the run could not reach, recorded as `TODO.md` gap 10a rather than filled in: the
`placement="bottom"` eye badge never rendered because no screen was being shared; `Search for GIFs`
never rendered, which is consistent with its transcribed `triggers: 'manual'` but is a reading
rather than proof; and the run left four tooltips on the page in the modal copies, so the
collector's close events need widening before the next run.

### 14:11 — A collector for the one thing the tooltip work could not verify

**No runtime impact.** Two new files under `apps/room/scripts/`, neither shipped to a browser by the
app.

The owner's standing rule, restated today and correctly: **whatever cannot be verified 100% on hard
evidence gets a console script, at all times.** The tooltip implementation an hour earlier is exactly
that case — it was shipped with an honest gap recorded rather than a match claimed, and a recorded
gap with no way to close it is half the rule.

**`collect-tooltips.js`** closes it. Paste into the Chrome console on the live original with the chat
pane visible; it downloads one JSON and needs nothing else — no terminal, no second step, no `stop()`.

**Why this gap is closable when the rest of gap 10 is not.** A synthetic event cannot trigger a real
CSS `:hover`, which is why the manage-page collector captures `:hover` RULES rather than states and
says so in its own output. A tooltip is different: `ngbTooltip` is a **directive** with real
JavaScript listeners on `mouseenter`/`focusin`. Dispatching those runs the same code path a real
pointer runs, and the element it builds is the real one. So this half of gap 10 is now `10a` and has
a collector; the `:hover` half stays open and unchanged.

**It never clicks anything on the main pass.** It hovers. That means it cannot send, save, upload,
delete, play, stop, post or submit — a stronger guarantee than checking a denylist, though the same
hard denylist as the other collectors is present for the optional dropdown pass. Every hover is
followed by its matching leave, and the run ends by asserting no tooltip was left behind; if one was,
it says so in `gaps` and tells the reader to reload.

**The four questions it answers**, none of which the evidence here can: `.arrow` or `.tooltip-arrow`;
`x-placement` or `data-popper-placement`; `bs-tooltip-left` or `bs-tooltip-start` (Bootstrap 5 renamed
the logical directions); and whether the bubble is inserted into `document.body` or as a sibling of
its host, which decides how ours must be positioned. It also **measures the open delay**, which was
assumed to be ng-bootstrap's default of 0 and never observed. Native `title=` tooltips are recorded
as text with an explicit note that the OS draws them and no script can capture their appearance.

**Verified by EXECUTION, not by `node --check`.** That check passed once on `constdescription`, which
was a legal implicit global and would have thrown under `'use strict'` on the first click.
`collect-tooltips.smoke.mjs` runs the real file against a simulated room under jsdom: 9 assertions
covering role detection, both attribute spellings, the captured markup and generation detection,
clean close-down, the native `title=` note, the verdict block, and — the one that matters most — that
a control which never renders becomes an honest **gap** rather than a silent omission. One failure
during the run was my harness, not the collector: jsdom needs `runScripts: 'outside-only'` before
`window.eval` is the window's own, and without it the script ran in a context with no `location`.
Fixed in the harness and noted there.

### 13:55 — The tooltips work, and every remaining review finding is closed

**Runtime impact: yes**, in both apps and in the Rust API. Room **584 tests / 61 files**, controller
**671 / 61** plus **46 db tests / 8 files** against a real PostgreSQL, `tradingroom-api` **155** lib tests, both `svelte-check` 0 errors 0 warnings, clippy
clean at `-D warnings`. One new dependency: `jsdom`, devDependency of `apps/room` only.

**The nine `ngbtooltip` attributes now show a tooltip.** `$lib/ngb-tooltip.ts` is an attachment that
reads `ngbtooltip` and `placement` off the element it is attached to, so the markup stays
byte-identical to the capture — including the attribute order — and the transcribed strings stay in
one place rather than being duplicated into a call.

**No new CSS was written, because none was needed.** The complete rule set is already in
`css/complete-app-styles.css`, applied and SHA-256 pinned: `.tooltip` at `z-index: 1070`,
`position: absolute`, `opacity: 0` rising to `0.9` on `.show`; `.tooltip .arrow` at
`0.8rem x 0.4rem`; `.bs-tooltip-left .arrow` flipping to `0.4rem x 0.8rem` at `right: 0` with
`border-left-color: rgb(0,0,0)`; `.tooltip-inner` at `max-width: 200px`, `padding: .25rem .5rem`,
white on black, `border-radius: .25rem`. The attachment only produces the DOM those rules expect,
and a test asserts each selector it emits **exists as a rule in the pinned sheet** — this repository
has shipped a `.flipped` class with no CSS before.

**Which Bootstrap generation, decided on evidence.** The sheet carries BOTH — the Bootstrap 4 block
using `.arrow` and `x-placement`, and the Bootstrap 5 block using `.tooltip-arrow` and
`data-popper-placement`. The discriminator is what the reference's own Popper emits: `x-placement`
appears in three captures (`app-modals/app-muted-users-modal`, `app-privchat`, `app-alert-qa-modal`),
which is Popper 1 and therefore the ng-bootstrap generation that owns `ngbtooltip`. Bootstrap 5's
`data-popper-placement` appears only on `data-bs-toggle="dropdown"` menus, driven by Bootstrap's own
JS. Both libraries run in the reference; the tooltips belong to the ng-bootstrap half.

**HONEST GAP, stated plainly: this is not verified against a rendered original.** `tooltip-arrow`
and `bs-tooltip-` appear in **zero** capture files — no capture in this repository contains a
rendered tooltip, which is `TODO.md` gap 10. So the CSS is captured and the class names are
**inherited from that captured sheet**, not read off a rendered element. A pixel-match claim would
be a fabrication. What is proven is that the DOM matches the rules the reference's own stylesheet
declares, and that is as far as the evidence goes until gap 10 is collected.

Twelve tests, driven rather than read as source text — the first DOM-exercising tests in this app,
which is why `jsdom` arrived. They cover the built markup, cleanup on leave/click/destroy, no
duplicate stacking, `aria-describedby` pointing at a live element, an absent attribute producing
nothing, and the text never being treated as markup.

**`recordVisit` was an unbounded public write.** `/session/[code]/joined` calls it on a page load
that needs only a `room_identity` cookie — and `/session/[code]` writes that cookie with
`httpOnly: false` as plain JSON, so it is attacker-set. `user_agent` was bounded to 512; `display_name`,
`email` and `ip` were not, and both are bare `TEXT`. A loop of requests wrote unbounded rows of
unbounded width to the production database with no rate limit anywhere in front of it. Widths are
now bounded (254 by RFC 5321, 45 for the longest IPv6 text form, 200 for a name) and — the half that
actually matters — a second OPEN visit is never opened for the same person in the same room, which
is what the data model already said: `closeVisit` looks up "the open row for one person" and 0007
created `room_sessions_open_idx ON (room_id, email) WHERE left_at IS NULL` for exactly that lookup.
A genuine re-entry still gets its own row, because leaving closes the previous one.

**The SSO door could grant presenter authority, and its docblock claimed it could not.** The room
resolves role from the token's email alone and deliberately ignores its `type`
(`apps/room/src/routes/session/+server.ts:94`, `:125`), so a compromised WordPress, a malicious WP
admin, or a leaked `wp-config.php` could sign a token carrying a presenter's address and arrive with
presenter commands, archives, admin chat, ban and kick. The invariant is now **enforced** rather than
asserted: the door refuses any address holding staff authority in that room, computed exactly as
`/internal/room-config/[code]` computes it, and refused through the same `refuse()` path as every
other check so it returns identical words and cannot be used to enumerate a room's staff. The cost is
real and accepted — a presenter who is also a subscriber cannot use the SSO link. Staff enter through
the controller's own login, where the authority comes from an account we authenticate.

**Two more tests that could not fail.** The PHP mint-ordering test compared byte offsets against
`add_shortcode(`, so a mint moved INTO the shortcode callback — the exact page-cache token leak the
test is named for — still scored greater and still passed; it now asserts the callback body contains
no mint at all. The `contentHint` test counted global occurrences with no position, so moving the
statement to the webcam block kept the count at one while stripping the hint off the screen encoder;
it is now anchored between the two capture sites. Both were verified by building the reviewer's exact
mutant and watching the test go red.

**And the critical Rust one is fixed after all.** `0009_rename_runtime_roles.sql` renames the runtime
role, while `migrate.rs:41` pinned a single name and the preflight runs BEFORE the migration chain —
so the first migrate succeeded and every run after it, including `assert_runtime_role_is_restricted`
at `main.rs:74` and therefore API startup, failed with `RuntimeRoleMissing`. The preflight now accepts
either name during the transition, with the posture checks unchanged and applied to whichever is
present. Proven against a real PostgreSQL across all four states: old only → found; both → the renamed
one, deterministically; new only → found, which is the case that was broken; neither → no row, so the
safety check still fires. `RENAMED_RUNTIME_ROLE` is documented as the transition and expected to be
deleted once no cluster carries the old name.

This lands in `services/**`, which is a mirror — it still needs promoting at the source per TODO
item P, and that direction remains the owner's.

### 13:16 — The screens bar renders again, and seven review findings are closed with runtime proof

**Runtime impact: yes**, in both apps. Room 572 tests / 60 files, controller 662 / 60, both
`svelte-check` 0 errors 0 warnings, both formatted, plus 6 new tests against a real PostgreSQL.

**The screens tab bar was missing its background because it was missing entirely.** The owner
reported a div with a different background absent from where the screens go. `ScreenTabs` sat in
the alternate branch of the "no one is presenting" conditional, so an idle room rendered the
heading INSTEAD of `ul#screenTabs`.

Settled by reading the capture rather than reasoning about it. `main-tab:Screens` holds three
children under `r.0#screens`, in a session where **nothing was shared**: `.0` the h3 (y 113.5,
h 33.6), `.1#screenTabs` (y 155.1, h 1), `.2#screensTabsContent` (y 156.1, h 1134). Siblings, not
alternatives — the content starts at exactly where the 1px bar ends. And the bar is the **only**
element in that whole region with an opaque background: `#screens`, the h3 and the content are all
`rgba(0,0,0,0)`, the bar is `rgb(17,17,17)`. Removing it removed the only paint, which is precisely
what was reported.

The bar is now unconditional and only its contents are conditional, which `ScreenTabs` already
handled. Its background also now reads `var(--notes-tabs-bg)` rather than `var(--darker-black)` —
both are `#111`, so no pixel moved, but the captured sheet keys `.screens-tabs` off that variable
by name and matching it keeps the bar with its siblings under a future theme.

**Two adversarial reviews ran over the day's work; 15 security and 2 quality findings survived
refutation.** Seven are closed here. Every fix has a negative control — the defect restored, the
test watched to go red, the fix restored.

**`room_sessions` had two foreign keys with no ON DELETE, which broke every delete path.** Migration
0007 used bare `REFERENCES`, defaulting to NO ACTION, and `recordVisit` writes a child row on a
public page load — so in practice every active room had them. `deleteRoomCascade` deletes
memberships first and failed on its opening statement; removing a single member failed the same way
at four call sites. Migration **0009** adds the actions, proven on a scratch PostgreSQL 16 built
from these same migration strings: with 0007's constraints restored both deletes raise FK
violations; after 0009 the member delete leaves the visit standing as
`room_user_id=NULL display_name=Owner email=o@x.com` and the room delete takes its visits with it.
The two actions differ deliberately, and 0007's own docblock is the authority — a removed member
"must not silently rewrite or erase visits that already happened", so that is SET NULL; a deleted
room has no honest record to keep, so that is CASCADE. Idempotent, verified by running it twice.

**Five wrong PINs bricked a member's phone pairing for ever.** `redeemPairCode` refuses on
`attempts >= 5` before it compares the PIN, and `issueMobilePairCode` wrote only the code and its
expiry — so a reissued PIN was refused too, and no interface could clear the counter. Anyone who
knew a room code and a member's email could do it in five requests.

**And the counter was a read-then-write, so the cap was per round, not per guess.** Every request in
a parallel burst read the same value and wrote the same value. It is now `mobile_pair_attempts + 1`
evaluated by PostgreSQL under the UPDATE's own row lock, with the live-code predicates repeated in
the WHERE so a request that lost a race cannot push past the cap. The success path was the same
shape and is now a conditional claim on the code still being present, so only one of two
simultaneous correct redemptions can win — the loser used to overwrite the winner's token list with
its own stale copy, quietly unpairing the device that got there first.

`redeemPairCode` had no coverage at all, which is why both lived in it. It now has
`mobile-pairing.db.test.ts` — six cases against a real PostgreSQL, including a positive control, a
20-request concurrent burst, and the two migration-0009 delete paths.

**Three handlers in the room read a session that no longer existed.** `restartMediaSession` must
build a new `MediaSession` because `close()` latches permanently, but `newProducer`, `peerClosed`
and the `onMount` teardown all closed over the `const session` captured at build time. After a mic
hand-over, arriving producers were consumed on a closed session and rendered nothing, in silence;
a peer leaving tore down nothing; and leaving the room closed the already-closed original while the
rebuilt session's transports and RTCPeerConnections survived the component, still holding the SFU
peer slot.

**And the reset either side of it cleared the wrong thing.** It cleared `screenStreams`, which is
not the map any dedupe guard reads — `addRemoteScreen` guards on `sharedScreens`, `addRemoteWebcam`
on `webcamPresenters`, `addRemoteAudio` on `remoteAudioStreams`. So the rebuild from `getProducers`
found every producer already "known" and re-consumed none of them. One `dropRemoteMedia()` now
clears the guards as well as the streams, used by both the reconnect and the role-change paths; the
reconnect half of that bug predates today.

**A test written today to prevent a privilege escalation passed when the gate was deleted.**
`media-elevation-contract.test.ts` compared `indexOf(...)` offsets, and `indexOf` returns -1 when
the needle is absent — which is less than any real offset. Both offsets are now asserted to exist
before being compared; deleting the staff gate fails it.

**Two payload findings.** The manage page loaded 5,000 visit rows on every tab for data only the CSV
button reads — ~755 KB measured with this project's own devalue, and every row carries a visitor's
IP address and email. Now gated on the Stats tab; the complete fix is a streaming endpoint, recorded
as TODO W. And `RoomMessage` constructed three `Intl.DateTimeFormat` objects per rendered item, of
which at most one is ever called — hoisted to `$lib/message-formatters`, where they are built once.

**One critical finding is NOT fixed, deliberately.** `services/api/migrations/0009` renames the
runtime role that `migrate.rs:41` hardcodes and the preflight requires to exist _before_ migrations
run, so the first migrate succeeds and every run after it — including API startup — fails.
`services/**` is a mirror and a change authored here is lost on the next sync, so it is written up
in full as TODO V for the owner to author at the source.

**Also fixed: the documented-test-count gate had been red before any of this.** Four sites across
three controller documents claimed 215 Vitest tests against 657 at HEAD. Verified stale at HEAD by
stashing, so it is not something today introduced. Now 662 across 60 files, and the gate passes.

### 12:50 — The standard is written down at the root, and the dead tooltips are recorded

**No runtime impact.** Documentation only: one new file, two pointers, one TODO row. Nothing under
`src/` was touched, so no gate was run — there was nothing for one to check.

**`CLAUDE.md` at the repository root is new, and is now the root standard.** The owner restated the
bar twice today — "Level 8+ enterprise grade, built for the next 20 years, following Svelte and
Rust's best practices, clean maintainable code, maximized for the highest performance ALWAYS", then
"THIS IS APPLE/GOOGLE/MICROSOFT LEVEL STUFF" — and asked for it written into `CLAUDE.md` and every
necessary file.

The reason a new file was needed rather than an edit: **operating rules existed in
`apps/room/AGENTS.md` and `apps/controller/AGENTS.md`, and in neither case at the root.** A session
opened at the repository root loaded neither, so the standard bound whoever happened to read one of
the two app files. It now loads for every session in this repository and binds every sub-agent.

It translates the directive into what it actually means here — the comment-plus-test pair as the
unit of work, fail-closed and server-side authority, performance as shape rather than
micro-optimisation, nothing without a consumer — then the mandatory Svelte and rust-analyzer MCP
workflows, the money and migration rules, the test-what-changed table, and the diff re-read
checklist. Each rule that has already cost something says what it cost.

**The two `AGENTS.md` files got a pointer, not a copy.** This repository's own most expensive defect
class is one rule implemented twice and then drifting — `isP` vs `isPresenter`, the `services/**`
mirror twice, the wired-settings count in three places. Three copies of a written standard fails the
same way, so neither app file restates anything; both say the root file wins.

**TODO row T: the `ngbtooltip` attributes are inert.** The owner sent two elements from the
send-message field — `far fa-smile` / "Add Emojis" and `fas fa-plus` / "Show message options", both
`placement="left"` — and asked for that whole section matched.

Reading them against ours: **both already match byte for byte**, at
`apps/room/src/routes/+page.svelte:7848-7854` and `:7923-7929`, down to the attribute order, which
differs between the two elements in the capture and differs the same way in ours. The markup was
never the problem.

The problem is that `ngbtooltip` is an ng-bootstrap directive. In a Svelte application it is a
string attribute the browser ignores, so **all nine of them — five in `+page.svelte`, four in
`ModalHost.svelte` — are silent.** Nine icons that look interactive and do nothing on hover. No
tooltip renderer exists anywhere under `apps/room/src`; the only other hits for "tooltip" are the
two contract constants.

The CSS is not the gap: `apps/room/css/complete-app-styles.css:2550-2566` already holds the whole
ng-bootstrap 4 rule set, and 4577+ holds the Bootstrap 5 `--bs-tooltip-*` flavour as well — so which
one the reference uses has to come from a render, not from the stylesheet. **What is missing is the
rendered hover DOM, and that is already gap 10** ("no hover, focus or open-menu state in any
capture"). Row T therefore names what gap 10 blocks rather than opening a second gap for the same
absence.

## 2026-08-10

### 12:39 — Gap 22 fully CLOSED: the hand-over works, and the escalation is not reintroduced

**Runtime impact: yes, in the room.** New: `src/lib/server/media-elevation.ts`,
`src/lib/media-elevation-contract.test.ts`, the `media_elevations` table. Changed: the
`giveMicScreen` action and `/api/media/grant`.

Earlier today the media restart landed and the GIVE direction was left open, with the decision
written up as the owner's. **The evidence settled it instead**, which is the better outcome.

**What the capture actually does.** Two mechanisms, kept separate:

|                                           | mechanism                                                                          | storage                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| `#permissionsModal` → `saveCustomPerms()` | `changeUserPerms` with `hasMic`/`hasScreen`/`hasCam`/`hasAdminChat`/`canEditNotes` | **durable**                    |
| `giveMicScreen`                           | sets client globals, re-joins asserting `isP`                                      | **transient, client-asserted** |

The first is already ours as the controller's `permissions_json`. The second works there because the
browser re-joins computing `isP: isPresenter || hasCam || hasMic || hasScreen` **from its own
globals**, which `giveMicScreen` had just set.

**That is client-asserted authority — precisely what was removed on 2026-08-07**, when a token type
mapped to `staff` and turned out to be a privilege escalation. So the reference's mechanism could not
be copied, and folding the hand-over into the durable permissions was equally wrong: it would make a
transient act permanent and mean a presenter lending a microphone had quietly edited somebody's
standing permissions.

**The answer both the evidence and the security model allow:** keep it transient, and decide it on
the server. `media_elevations` is written by the `giveMicScreen` action — already staff-gated, and
it refuses a self-target — and read by `/api/media/grant` when it mints. The client is _told_ over
the `cmds` channel so it can restart its media; it never asserts anything.

Three properties, each pinned by a test with a negative control:

- **It widens `hasMic` and `hasScreen`, never `isPresenter`.** An elevation is "you may talk and
  share", not "you are a presenter" — folding it into the presenter flag would hand the recipient
  every presenter-only server action (archives, polls, alerts) from a control labelled
  "Mic/Screenshare". Making that mistake fails the test.
- **It is read from our database, never from the request.** If the grant ever took mic/screen from a
  body or query parameter, any member could mint themselves a producer grant and the SFU would
  believe it.
- **It expires.** The capture's dies with the browser's globals, so a reload silently takes the
  microphone back. Ours survives one deliberately — a member who refreshes mid-sentence should not
  lose the ability to speak — which is why it needs its own ceiling: twelve hours, and the expiry is
  compared in SQL so a drifted clock cannot honour a dead row.

Revoking deletes rather than tombstoning, because a lingering row is a second state for `hasMic` to
be read from wrongly.

Verified: **561 tests across 59 files** (554 → 561), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:30 — Gap 22: a role change restarts the media, and the half that cannot work yet is named

**Runtime impact: yes, in the room.** Files: `apps/room/src/routes/+page.svelte`,
`src/lib/roster-gates.test.ts`.

The capture's own handler, transcribed:

```js
subscribe("giveMicScreen", e => {
  globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give,
  this.mediaHandlerService.disconnectAll(),
  setTimeout(() => this.mediaHandlerService.initWithGlobalsAndEventHandler(...), 3e3)
})
```

The room set the flag and stopped, so the sidebar read it correctly and the media did not change at
all. It now tears the session down and builds a new one after the capture's own 3 seconds — kept
rather than tuned, because the server tears the peer down when the socket's session ends and
reconnecting into an unfinished teardown is how you get two peers for one person.

**A NEW session, not the old one reused**, and that is the trap in this change:
`MediaSession.close()` latches `#closed` permanently and `load()` calls `#assertOpen()`, so a closed
instance throws `sessionClosed` for ever. The obvious implementation — close, then reload the same
object — fails on the first role change. For the same reason the `connected` handler no longer uses
the `session` const it closed over; it reads the current `mediaSession`, or it would throw on the
first reconnect after a restart and the room would silently stop consuming. Everything else is
deliberately reused: the same signalling client, because a second socket leaves the SFU holding two
peers for one person against a per-identity cap of four.

**Taking mic/screen away now works completely** — the rebuild closes every producer that peer held,
immediately and server-side, and drops the screens it was painting so a dead transport cannot leave
a frozen picture pretending to be live.

**Giving still does not grant produce rights, and this is the finding worth recording.** It is
architectural, not a forgotten line. The SFU decides who may produce from the GRANT's role, and
`/api/media/grant` mints that from the CONTROLLER's membership —
`joinsMediaAsProducer(isPresenter || hasCam || hasMic || hasScreen)`, read through `readRoomConfig`.
`isLimitedPresenter` is runtime state that never touches the membership. So a rebuilt session
re-mints the **same `member` grant** and the SFU answers `forbidden` to `produce`. Restarting the
media was necessary and is not sufficient.

Closing it needs a decision that is the owner's, and neither half was invented: either
`giveMicScreen` writes `hasMic`/`hasScreen` onto the membership — durable, works, and diverges from
the capture's explicitly transient model — or the grant learns to carry a runtime elevation, which
means the client asserting its own authority. Written into `TODO.md` and into the handler itself.

Four tests pin it, including that the rebuild reuses the signalling client and waits 3 seconds.
Negative control: removing the delay fails that test.

Verified: **554 tests across 58 files** (550 → 554), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:13 — Gap 31 CLOSED: owners are seated in their own rooms again

**No runtime impact until the migration runs** — one forward-only backfill. Files:
`apps/controller/src/lib/server/db/migrations/0008-backfill-owner-memberships.js`, plus `TODO.md`.

`provisionRoom` has seated the owner at role 0 since 2026-08-07. **Every room created before that
has no such row**, so its owner reads as `member: null` — and the room resolves role from the
membership and fails closed to `member`. The owner of an older room is therefore **not a presenter
in their own room**.

Three pieces of this repository presume that row exists and none could fire without it: `roleLabel`
maps `role === 0` to "Owner", `applyManyOpcode` skips role 0 so bulk actions cannot touch the owner,
and `shouldRemoveAsNonPresenter` preserves "only the owner and a true presenter". That last one is
the sharp edge — "Remove non-presenters" was never protecting anybody's owner by name, because
there was no owner row to protect.

**Who the owner is, and why this is not a guess.** `accounts.owner_email` is explicit and unique,
written at registration from the registering user's own address, and `provisionRoom` is called with
that user's id. So the backfill joins room → account → the user whose email matches
`owner_email`, rather than picking the lowest user id and hoping. Compared **case-insensitively**,
because the two columns are written by different paths and a single capitalised address would
otherwise leave that owner unseated with no error at all.

**It never changes an existing row.** If an owner already holds some other role — invited as a
participant, demoted deliberately — that was somebody's decision, and a migration that silently
promoted them to role 0 would overwrite it with no way to tell afterwards. The honest limit: this
fixes "the owner has no row", which is gap 31, and not "the owner has the wrong row", which nobody
has reported and which cannot be distinguished from a deliberate demotion.

**Proven against a real PostgreSQL, all four cases**, on a scratch database built to the same shape:

| case                                  | before   | after             |
| ------------------------------------- | -------- | ----------------- |
| old room, owner unseated — the bug    | `(none)` | **0**             |
| room created after 08-07              | `0`      | `0`, no duplicate |
| **owner deliberately at role 2**      | `2`      | **2 — untouched** |
| `owner_email` capitalised differently | `(none)` | **0**             |

Re-running left four membership rows in total, so it is idempotent — belt and braces, since
`room_users_unique_idx` is unique on `(room_id, user_id)` and `ON CONFLICT DO NOTHING` would catch
what `NOT EXISTS` somehow raced. The scratch database was dropped afterwards.

Verified: **657 tests across 59 files**, `svelte-check` **0 errors, 0 warnings**, format gate green.

### 12:13 — TODO item S: the login page, to be scoped by Will

Recorded at the owner's request as a **placeholder, explicitly not a description of a problem**.
Nothing has been investigated, measured or decided, and writing a problem statement from guesswork
is how a "fix" arrives for something nobody asked to change.

The row carries only context so the conversation can start from facts: the room's guest login is
`(public)/session/[code]` rendering through `RoomLogin.svelte`, with eleven settings already driving
it, and the controller's own account login is a separate page at `(public)/login`. **Which of the
two is meant, and what should change, comes from Will.**

### 12:06 — Gap 30 CLOSED (a closed room actually refuses), and the chat ding is wired

**Runtime impact: yes, both apps.** Files: `apps/controller/src/routes/(app)/launch/[id]/+server.ts`,
`apps/room/src/routes/+page.svelte`, `+page.server.ts`, `room-config-client.ts`, plus the three
settings lists and two contract tests.

## A closed room now refuses at every door

`apps/room/TODO.md` gap 30. Three doors lead into a room and only two checked `state`: the guest
login redirects when `room.state !== 'open'`, and the room's own `/session` enforces
`isShutOutByRoomState`. **`/launch/[id]` did not — and it is the widest of the three**, because
`requireOwnedRoom` admits **anyone in the ACCOUNT**. So a role-2 Participant could launch straight
into a room their owner had deliberately closed, past a check the other two doors were making.

The rule is **copied from the room rather than invented**, so the two cannot drift: open lets
everyone through; closed shuts out only those who are neither the owner nor a true presenter.
Presenters keep their way in on purpose — closing a room is how you prepare it, and locking out the
person who has to open it would be the obvious next bug. `isRoomPresenter` is the controller's own
predicate, where role 1 counts only when the `nonPresenter` discriminator is false.

The refusal redirects to the same place the guest door uses, so a closed room looks identical
whichever way you arrived — one door explaining more than another is how people learn to probe.

## The chat ding

Transcribed from `app-chat.compiled.js:112-137` rather than designed:

```js
!doNotDisturbOn && chatSoundOn
  ? followedUsers[e.avt].followChatStyle.playSound
      ? pling.play()
      : (… || (sessData.dingOnNewMessage && hashEmail(user.email) !== e.avt)) && followed.play()
```

**The naming is the reference's and it is genuinely confusing:** the sound file called `followed` is
what the ROOM-WIDE ding plays, while an explicitly _followed_ user gets `pling`. Swapping them is
the obvious mistake and nothing else would catch it, so a test pins the order.

A followed user **outranks** the room setting — that branch short-circuits, so they are heard even
when the room's ding is off. And it never fires for your own message: the reference compares
`hashEmail(user.email) !== e.avt`, and the `senderId` guard already above the block makes it
unreachable, which a test also pins.

The chat event now carries `senderEmailHash`, because the followed-user branch keys on it and the
payload previously held only the sender id and the room.

**`playChatMessageSoundFor` is deliberately NOT implemented.** It is a room setting holding member
email addresses, and the reference compares it against `e.avt` — a HASH. Honouring it means the
server sending hashed addresses; sending raw member emails to every browser to decide a sound would
be the wrong trade. Recorded rather than quietly skipped.

`dingOnNewMessage` wired through all three lists — `ROOM_VISIBLE_SETTINGS`, the generator, and the
verifier that cannot run here — **41 → 42 of 269**. The boundary test caught the omission
immediately: its consumers map requires every allow-listed setting to name the code that reads it.

**Two of my own tests were wrong before the code was.** One sliced the source with a bare
`indexOf('void invalidateAll()')`, which matched an earlier call and produced an empty block, so
three assertions failed against correct code — a slice needs both ends anchored. The other
duplicated an existing `readFileSync` import and failed to parse at all.

Verified: room **550 tests / 58 files** (546 → 550), controller **657 / 59** (646 → 657), both
`svelte-check` **0/0**, both format gates green, node-adapter build clean.

### 11:06 — Room TODO entry 7 CLOSED: pre-canned polls were reaching every member's browser

**Runtime impact: yes, in the room** — the page payload shrinks for members, and stops carrying
something it should never have carried. Files: `apps/room/src/routes/+page.server.ts`,
`src/lib/page-load-contract.test.ts`.

The loader selected `savedPolls` and returned them to **every role**. A member never opens the poll
panel, so they never SAW the list — but their browser was handed **every unsent draft a presenter
had written**, in the SSR HTML and in `__sveltekit` data, on every page load.

**Invisible is not private.** It reaches the browser, any cache in front of it, and any HAR a user
attaches to a support ticket. This is the same class as the `password_hash` that was spread into the
page payload on 2026-08-04 — and that one also looked harmless right up until somebody printed the
keys.

Gated on **`connectedUser.isP`**, the membership's own answer and the same predicate the poll panel
renders from. Not on `role`, which gets it wrong in both directions: a Participant granted presenter
rights in the controller would be refused, and a Presenter who had them withheld would be served.
That distinction is exactly the bug `canEditNotes` had before it was fixed the same way.

The empty list is the ternary's **first** branch, so a member's page load now makes **no database
read for polls at all** — the value cannot leak back through a refactor that returns a query result
unconditionally.

**It also pre-empts entry 5**, which is what that TODO row was written to warn about:
`GET /api/v1/rooms/{id}/saved-polls` refuses non-staff with 403, so the API cutover would have
started failing member page loads. An empty list is what that route already agrees with.

Three tests pin it, and the negative control confirms they bite: removing the gate fails two of
them. The two writes needed nothing — `savePoll` and `deleteSavedPoll` were already staff-gated,
which is what `require_staff` enforces.

Verified: **546 tests across 58 files** (543 → 546), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 11:01 — The share-quality measurement, written down rather than rushed

**No code change** — one document. New: `apps/room/docs/MEASURE-SHARE-QUALITY.md`.

An attempt at the row 6 / row 8 measurement was made and abandoned, for a reason worth recording:
**`chrome://webrtc-internals` lists every page in the BROWSER, not one app.** The window had six
`simplertrading.com` tabs and two `chatgpt.com` tabs open, each contributing its own peer
connections, and the panel that was expanded turned out to be Simpler Trading's — a dead connection
stuck at `ICE: new => new => new`, nothing to do with this app. Ours was there, correctly named
`chat.tradingroom.app/?room=1001`, four boxes along.

Rather than have the owner close tabs they are actively using, the procedure is now a document:
which tabs to close and in what order, why `webrtc-internals` must be opened **before** the share
starts (it logs from the moment it opens, so opening it first captures negotiation and the bitrate
ramp instead of joining midway), and how the second session works — an **incognito window joining as
a GUEST**, name and email, no second account and no logging out.

It also records the two things that make the reading meaningful and are easy to get wrong: a second
session must actually be **receiving**, or the encoder has no reason to spend bits; and the shared
surface should be a **chart**, since the doc's 3841 kbps was measured on candlesticks and 13px text
and a desktop wallpaper is not comparable to it.

And it says what each possible result would MEAN — bitrate up with `limitation: none` closes rows 6
and 8; `qualityLimitationReason: bandwidth` makes row 8 a real conversation and row 6 actively
harmful; a drop in `framesPerSecond` is `contentHint='detail'` trading smoothness for sharpness,
which is the caveat recorded when it shipped and the point at which it should be reconsidered rather
than defended.

**Why it needs a human at all**, stated so nobody re-litigates it: `getDisplayMedia` requires a real
user gesture and an operating-system screen-picker dialog. Browser automation can drive a page; it
cannot click an OS dialog.

### 10:51 — Item R, the share half: `contentHint = 'detail'`, and why rows 6 and 8 were NOT taken

**Runtime impact: yes, in the room** — one property on the captured screen track. Files:
`apps/room/src/routes/+page.svelte`, `src/lib/recording-codec.test.ts`, and
`scripts/collect-share-stats.js` for the measurement that is still owed.

`streaming-choices.md` row 2, and the reasoning is that document's own wire measurement rather than
a preference. Presenter-to-member, 12 seconds with a member attached: full 1920x1080 leaves the
presenter, arrives at the member, paints at 1920x1080, VP9 end to end, **zero dropped frames** — and
`qualityLimitationReason: none` with cumulative `bandwidth: 0, cpu: 0`. The encoder spent **zero
seconds constrained**.

**So a soft-looking share was never a limit to lift.** Nothing throttles it; nothing asks it to spend
more. With `encodings: undefined` there is no floor, no ceiling and no content hint, so libvpx's own
heuristic decides — and that heuristic is tuned for camera video, where blurring a moving background
is free. For candlesticks, gridlines and 13px quote text it is exactly the wrong trade. One property
tells it otherwise, on the screen path only; the camera path keeps the default, where it is correct.

**Two caveats, kept rather than buried.** Its cost is **unmeasured** — it may raise the bitrate, and
under genuine congestion it degrades frame rate instead of resolution, so a share could end up
sharper and choppier. And it is a **divergence**: the capture sets this hint on its alert-overlay
canvas stream and never on the raw screen track. Taken anyway because the measurement shows the
headroom is real and unused, and because reverting is deleting one line.

**Rows 6 and 8 were deliberately not taken.** Row 6 (raising the 1920 cap for Retina) makes every
member pay bandwidth and decode CPU for pixels most of their screens cannot show, and diverges from
a constraint that is byte-identical to the capture. Row 8 (an explicit `maxBitrate`/`minBitrate`)
puts a floor under everyone's bandwidth, and a floor is precisely what hurts the member on the worst
connection. Both change what every viewer receives, so both wait for the measurement — unlike row 2,
which asks the encoder to use headroom already proven to exist.

**And the measurement I cannot take myself, stated plainly.** `getDisplayMedia` requires a real user
gesture and an OS screen-picker dialog. Browser automation can drive a page; it cannot click an
operating-system dialog. So the presenter-side `getStats()` read needs a human sharing a real
desktop with a second session receiving — `apps/room/scripts/collect-share-stats.js` collects it in
one paste and downloads the JSON. Worth recording why the second session is not an obstacle: it is
an **incognito window joining as a GUEST** with a name and an email. No second account, no logging
out of anything.

Verified: **543 tests across 58 files** (541 → 543), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:56 — Item R, the recorder half: VP9 at 8 Mbps instead of the browser's guess

**Runtime impact: yes, in the room** — recordings change codec and bitrate. New:
`apps/room/src/lib/recording-codec.ts` (+ 10 tests); `+page.svelte`'s `startRecording` wired to it.

**The research the owner remembered was already in this repository**: `apps/room/docs/streaming-choices.md`,
written 2026-08-05, a measured and evidence-tagged ranking of ten options — byte-identical to the
copy in `new-room`, so there was nothing to pull. The earlier "not found" result was about the
IMPLEMENTATION, and that distinction is the whole of this entry.

**The recorder was `new MediaRecorder(recordedStream)` — no options at all.** No codec, no bitrate.
So the browser chose both, at roughly 2.5 Mbps, and row 4's measurement says what that costs on
realistic chart content (34 lines of 13px monospace, 120 animated candlesticks, 1080p30):

| codec          | cap 2 Mbps | cap 8 Mbps | cap 16 Mbps |
| -------------- | ---------: | ---------: | ----------: |
| **VP9 (webm)** |       1429 |   **3841** |    **6414** |
| AV1 (webm)     |       1928 |       3778 |        3802 |
| H.264 (mp4)    |       1582 |       2033 |        1990 |
| HEVC (mp4)     |       1238 |       1723 |        1626 |

**Only VP9 keeps scaling.** Everything else saturates and ignores a higher cap, so for 1080p text a
~2 Mbps ceiling is a quality ceiling you cannot buy your way out of. The detail was available and
simply never asked for.

**On the owner's MP4 request, honestly.** MP4 and maximum sharpness are in direct tension and the
measurement is why — `.webm` does not open in QuickTime, while mp4/H.264 saturates near 2 Mbps. The
instruction was "the very best without sacrificing performance", so **quality wins the ordering**:
VP9, then AV1, then VP8, and mp4 only when nothing better is supported — which on **Safari is
immediately**, since it produces `video/mp4` natively. A Safari presenter therefore gets an MP4 with
nothing special done, and a Chrome presenter gets the sharpest file the machine can make. Making MP4
universal _without_ losing ~1.8 Mbps of detail is server-side remux — row 10, needing the
transcoding workers the deployment plan defers. Demoting VP9 to avoid a conversion nobody has asked
for yet would be the wrong trade, and it is recorded rather than quietly made.

**8 Mbps, not 12, and that is the performance half of the instruction.** Row 4's own warning:
_"not bandwidth-free for the presenter's CPU. A second 1080p encode competes with the live encoder,
and on a loaded machine that can drop frames on the share members are watching."_ The recording is
for the presenter; the live share is for everyone. So it takes the measured 3841 kbps at 8 Mbps and
declines to chase the extra 2573 kbps a 16 Mbps cap would allow.

An unsupported `mimeType` makes `new MediaRecorder` **throw**, so nothing-supported yields
`undefined` and the browser's default — a recording at the old quality beats a recording that never
starts. Ten tests pin the ordering, the Safari path, the throw-avoidance and the bitrate, with
`isSupported` injected so none of it rests on a manual check in one browser.

**Three rows remain, and they all need the same measurement**: row 2 `contentHint='detail'` (the
doc's strongest remaining candidate — the wire shows full resolution arriving with `bandwidth: 0,
cpu: 0`, so nothing is throttling and the only lever left is telling the encoder the content is
text), row 6 raising the 1920 cap for Retina, and row 8 an explicit `maxBitrate`. All three are
settled by one thing: **a presenter sharing a REAL desktop with a member attached, reading
`outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns
Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the
doc's own 525 kbps figure is not the real number and why these rows are not being changed blind.

Verified: **541 tests across 58 files** (531 → 541), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:43 — Item R: searched the two reference folders, and the MP4/quality work is not in them

**No code change** — a read-only search and its honest result. `TODO.md` item **R** rewritten from a
placeholder into a record of where I looked; item **P** updated with what the owner's pull-only rule
means for it.

The owner granted permission to pull files **from** `new-room-control` and `new-room` into this
repository, never the other way. So the first task for R was to find what that work actually did
rather than re-derive it. **It is not in either folder.**

- `diff -rq apps/room/src ~/Desktop/new-room/src` → **6 differing files, and every difference is
  work done in THIS repo today**: the `inert` modal fix, the connectivity test, the media-grant
  newline fix, `env.ts`. The only file unique to theirs is `handoff-redemption.test.ts`, the
  single-use guard deliberately removed on 08-07. **Our room is ahead of that folder, not behind
  it** — there is nothing there to pull.
- `MediaRecorder` appears in both trees **exactly once**, in `ModalHost`'s mic test. Neither has a
  room recorder.
- Every `recording` hit in `new-room-control/src` is a **settings surface** — `room-config.ts`,
  `room-settings-schema.ts`, the dont-touch block — the same `wired: false` entries already here.
- Every `ffmpeg` / `transcode` hit in both is **documentation or captured evidence**, never
  implementation.

So the memory is either of a discussion rather than an implementation, or the code lives somewhere
outside the two folders. **The owner needs to say which**, because the alternative is building it
from first principles and presenting the result as a match — the specific thing the house rules
forbid. The row now records the search so the next session does not repeat it.

What is genuinely here to start from: `streaming-choices.md` measured VP9 screen share at
**3841 kbps** on realistic chart content; `setPreferredLayers` is implemented in `services/media`,
deliberately beyond the capture, so per-consumer layer choice already exists; and `useH264`,
`useVP9`, `useHQVideo`, `hideRecs` and "Disable download button for Recordings for users" are all in
the settings schema with `wired: false` — the surfaces exist, the pipeline does not.

**Item P is now blocked by definition rather than by preference.** It needs `services/**` promoted
_to_ `new-room-control`, and that direction is exactly the one the owner has prohibited. Recorded as
an owner action.

### 12:21 — TODO item K CLOSED: the stats export writes all nine of the reference's columns

**No runtime impact until deployed** — a new table, two write points and a rewritten export. Item
**K** is removed from `TODO.md`. New: migration `0007-room-sessions.js`,
`lib/server/room-visits.ts` (+ 7 tests), `lib/humanize-duration.ts`.

The reference's `exportStatsToCSV` writes nine columns, read verbatim from its own bundle in
`dumps/export-controls-1786287657298.json`:

```
Name, Email, [Phone,] IP, In, Out, Duration, isMobile, Browser
```

Six of them came from its per-visit `statXrefs` records, and this application had no equivalent:
`stats` is **one row per PERSON**, keyed on `lastLoginAt`, which cannot answer when somebody
arrived, when they left, or how long they stayed. So the export wrote three columns and the rest was
recorded as an honest gap rather than filled with blanks that would claim we collect data we do not.

**`room_sessions` records one row per ARRIVAL** — which is what an _xref_ row plainly is. A member
who enters four times in a day is four rows, and that is what makes Duration a real number rather
than an average of nothing.

**The detail that settled the design: an open visit is faithful, not broken.** The reference's own
writer defaults `outMStr` to `"N/A"` and computes `dur` only when both times exist — so a row for
somebody still in the room renders `N/A, N/A` in its file too. Ours does the same, which meant the
feature could ship complete without waiting on a reliable "left" signal.

Written at the only place it can be: the moment the controller mints a handoff, at **both** doors —
owner launch and guest join. That request is the only one that sees the IP and the user agent, since
the room application runs behind a proxy on another host and sees neither the browser's original
address nor our account context.

**Name and email are copied into the row rather than only referenced**, and that is deliberate: a
guest has no membership at all, and a member later removed or renamed must not silently rewrite
visits that already happened. A stats export is evidence of who was present; joining live rows would
make last month's report change when somebody edits their profile.

`recordVisit` never throws into its caller. A stats row failing to write must not stop somebody
entering a room they paid for — a lost row is a gap in a report, a thrown error is a member staring
at an error page.

**The user-agent parser is small on purpose, and its ORDER is the whole thing.** Edge and Opera both
carry `Chrome` in their strings, and Chrome carries `Safari`, so the most specific token has to win
or every browser reads as Chrome — which looks right, because Chrome is the common case, and is
wrong for everyone else. Also handled: an Android **tablet** omits the `Mobile` token a phone
carries, so a naive `/Mobile/` test reports every Android tablet as a desktop, in a product built
explicitly for tablets. Both are pinned by tests. `isMobile` and `browser` are treated as **labels a
visitor supplied**, never as security inputs; nothing decides anything from them.

`humanizeDuration` reproduces moment's `relativeTime` defaults — "a few seconds", "an hour" — because
the reference calls `moment(out).from(in, true)`, and matching the thresholds is what makes our file
read the same as theirs rather than merely similar. It lives outside `$lib/server` because both
halves need it and SvelteKit refuses a `$lib/server` import from a component; duplicating the
thresholds is how two files quietly disagree about what an hour is.

**And the contract test had a hole worth naming.** `export-format-contract.test.ts` exists precisely
because these formats were once invented — its own header says a `Last login` column _"the reference
never had"_ was the giveaway. It pinned filenames and CRLF and **not the stats header**, which is why
a three-column version survived until now. Four assertions added: both phone variants of the
nine-column header, the absence of `Last login`, one row per visit rather than per person, and the
`N/A` for an open one.

Verified: **657 tests across 59 files** (646 → 657), `svelte-check` **0 errors, 0 warnings**, format
gate green, `vite build` clean. `svelte-kit sync` was needed once — the loader's new `visits` key is
invisible to the page until Kit regenerates its types.

### 12:10 — TODO item C CLOSED: `push_tokens_json` has a writer, and the mobile app has a brief

**No runtime impact until deployed** — a new public endpoint nothing calls yet, plus migration 0006.
Item **C** is removed from `TODO.md`. New: `routes/api/mobile/pair/+server.ts`,
`lib/server/mobile-pairing.ts` (+ 11 tests), `db/migrations/0006-mobile-pair-attempts.js`,
`mobile-app/PROMPT.md`.

The column has existed since the schema was written and **nothing had ever appended to it**, because
the endpoint a device would call did not exist. So the FCM client, the fan-out and the manage-page
controls were all built against a list that could only ever be empty.

`POST /api/mobile/pair` takes room + email + PIN + FCM token, verifies, appends the token and
**consumes the PIN**. It is `/api/` rather than `/internal/` because a phone that has never paired
holds no shared secret — that is what pairing is for.

**Which makes a six-digit PIN the credential on a public endpoint, so two things carry the weight:**

- **Single use.** Consumed on success. Without it, a PIN read over someone's shoulder stays valid
  for days — `ptrMobileAppExpirePairCodeDays` sets the window.
- **Five failures destroy the code.** A million combinations, five guesses, and then the thing being
  attacked no longer exists. A member who mistypes five times asks for another; one click.

**The counter is a column, not a rate limiter, and that is the interesting decision.** The obvious
answer is a limiter — and it is the wrong one here, because this controller runs **serverless on
Vercel**: an in-process count lives and dies with one instance and shares nothing with the next. It
would look like protection and provide almost none. Migration 0006 adds
`room_users.mobile_pair_attempts`, following the precedent `login-attempts.ts` already set.

Failures are counted **only against a live code**. Incrementing on an expired or exhausted one would
let anyone run the counter up on a member who is not currently pairing, so their _next_ code would
start part-spent.

Room and email are required alongside the PIN because the reference's own pair URL carries both —
`…/addUser/<publicId>/?sec=…&email=__userEmail__&name=__userName__` — so an attacker needs a room
code and a member's address, not just six digits swept across every room.

Every failure returns the same 403 with no detail. Wrong room, unknown email, expired, wrong PIN,
exhausted — one answer, because distinguishing them turns the endpoint into a way to discover which
email addresses are members of which room. The reason goes to the log, where the audience is us; the
**email is logged and the PIN is not**, since knowing which six digits were tried helps nobody and
writes a live credential into the log.

Ten devices per member, oldest evicted, and re-pairing the same device **replaces** its entry rather
than adding one — a reinstall is the common case and must not fill the array with duplicates of one
phone.

**`svelte-check` caught a real error the tests could not.** The query was written against
`roomUsers.email`, and `room_users` has no such column — a membership is a join row carrying room,
account and role, while the identity lives once on `users`. Every test in that file exercises the
pure half, so all 646 passed while the database query was wrong. It now joins through `users`. That
is the argument for running the type gate on a `.ts` change rather than trusting a green suite.

**And `mobile-app/PROMPT.md`** — the folder and brief for the app's own session, as the owner asked.
It fixes the wire contract so a future session cannot redesign it to suit the client, lists what is
already built and tested, and puts §5's open questions where they cannot be skipped. The first of
those decides the whole project: **does the app carry video, or only alerts?** Every captured control
is notification-related and no capture shows a mobile media path — an alert receiver is a small app
and a media client is not, so the framework choice deliberately waits on that answer rather than
being made first and regretted.

Verified: **646 tests across 58 files** (635 → 646), `svelte-check` **0 errors, 0 warnings**, format
gate green, `vite build` clean with the new route present in the output.

### 11:53 — TODO item N CLOSED: the connectivity test now tests THIS deployment

**Runtime impact: yes, in the room** — the troubleshooter's "Network Test" changes what it measures.
Item **N** is removed from `TODO.md`. Files: `apps/room/src/routes/+page.svelte`,
`src/lib/components/ModalHost.svelte`, new `src/lib/connectivity-test-contract.test.ts`.

The test ran against Google's public STUN servers only, which made every result misleading in a way
a user could not detect: a green tick said nothing about whether `media.tradingroom.app` was
reachable, and a red one blamed the user's firewall for infrastructure we do not run.

The room already had the right values — `/api/media/grant` returns this deployment's ICE servers on
every mint — but `+page.svelte` held them in a `let` inside `onMount`, reachable only by the media
session. They are now component-level `$state.raw` (raw because the array is REPLACED on each grant
and never mutated, so deep proxying would cost something and buy nothing) and passed to `ModalHost`
as a prop.

**The decision worth recording: when the deployment's servers are available they are used ALONE.**
Appending the public STUN entries "just in case" is the obvious thing to do and it would reintroduce
the same defect pointing the other way — a passing `stun` tick could have come from Google while
ours was unreachable, and nothing in the UI would distinguish them. A result is only worth showing
if it is about the infrastructure the user is actually trying to reach.

The public servers survive as a **labelled fallback** for the window before the media socket has
opened, when we have nothing of our own to offer. The modal now says which of the two ran — _"Tested
against this room's own media servers"_ or _"Tested against public STUN only … Join the room, then
run it again"_ — and only after a run, so it reports fact rather than intent. "STUN passed" is a
different claim in each case and a support conversation should not have to guess which one it is
reading.

`turn: 'unconfigured'` is unchanged and still correct: `MEDIA_TURN_URLS`/`MEDIA_TURN_SECRET` are
unset, so the minted list carries STUN only. Saying "check your network or firewall" for a relay
nobody configured blames the user for our own missing setting.

**Pinned by seven contract tests**, because all three decisions are invisible once made. The sharpest
asserts structurally that the public servers appear only on the fallback branch and are never
concatenated onto the deployment list. Another guards the thing that already shipped once and must
never return: the reference's `turn:flash.protradingroom.com` with `ptrUser`/`ptr123`, which opened
two authenticated relay allocations against a third party's host and leaked our users' IP addresses
to it on every run.

**One of those tests was wrong first, and the fix is the interesting part.** It asserted the TURN
host was absent from the file and failed — because the comment above `runWebRTCTest` quotes the
removed configuration verbatim, which is exactly what makes that comment worth having. Asserting on
raw text would have forced a future maintainer to delete the explanation to get the suite green. It
now strips comments before checking the live code, and separately asserts the explanation is still
there.

Verified: **531 tests across 57 files** (524 → 531), `svelte-check` **0 errors, 0 warnings**, the
Svelte autofixer reports **zero issues** on `ModalHost.svelte`, format gate green, and the
node-adapter build — the artefact that ships — is clean.

### 11:53 — New TODO item R: MP4 recording downloads and member screenshare quality

Raised by the owner: both were built in the other folder/repo and need re-establishing here.

Recorded as a **placeholder for a review, not a description of a defect** — nothing has been measured
on this side yet, and the first task is to find what that repo actually did rather than re-derive it
from first principles and call the result a match.

What is already known here, so the review starts from evidence: `docs/streaming-choices.md` measured
VP9 screen share at **3841 kbps** on realistic chart content; `setPreferredLayers` is implemented in
`services/media` (deliberately beyond the capture, precisely so a viewer is not forced to decode a
background tab's top layer); and `useH264`, `useVP9`, `useHQVideo`, `hideRecs` and "Disable download
button for Recordings for users" all exist in the settings schema with `wired: false` — so the
surfaces exist while the pipeline does not.

### 11:39 — TODO item L CLOSED: the Hetzner box has a firewall at last

**Runtime impact: yes, on production.** `ufw` is active and enabled at boot on `87.99.154.155`,
which serves both `media.tradingroom.app` and `chat.tradingroom.app`. Item **L** is removed from
`TODO.md`.

**Every rule came from a measured listener. Nothing was assumed.** `ss -tlnp` / `ss -ulnp` first:

| bound publicly                                | rule                             |
| --------------------------------------------- | -------------------------------- |
| `sshd` :22                                    | `22/tcp`                         |
| `caddy` :80                                   | `80/tcp` — also ACME renewals    |
| `caddy` :443                                  | `443/tcp`                        |
| **`caddy` UDP :443**                          | **`443/udp`**                    |
| mediasoup RTC, `40000-40199` from `media.env` | `40000:40199/udp` **and** `/tcp` |

**The UDP 443 rule is the one that would have been missed.** Caddy listens on UDP 443 for HTTP/3;
a TCP-only ruleset looks complete, passes an HTTPS check, and silently breaks QUIC for every client
that negotiates it. It is in the `ss -ulnp` output and nowhere in any document.

Everything else — the SFU's signalling on `127.0.0.1:4443`, the room on `127.0.0.1:3000`, Caddy's
admin API on `127.0.0.1:2019`, resolved, chrony — is **loopback-bound**, so it needed no rule and is
now unreachable regardless.

**The Docker trap was checked rather than assumed.** When Docker _publishes_ a port its DNAT chain
jumps ahead of ufw's INPUT rules and the firewall is decorative — a well-known way to believe a box
is protected when it is not. Measured: the media container runs `NetworkMode=host` with `ports=[]`,
and both `DOCKER-USER` and the nat `DOCKER` chain are empty. No bypass exists here, so ufw genuinely
governs the SFU.

**A dead-man switch was armed before anything changed.** `DEFAULT_INPUT_POLICY` is `DROP`, so one
missing rule locks SSH out of a box with no console access. `systemd-run --on-active=10min ufw
--force disable`, detached from the session, would have undone it with nobody needing to get in. It
was cancelled only after the verification below, and the firewall was then confirmed still active a
minute past the original deadline.

**Verified from outside, and the proof is a pair of ports:**

|                               | before    | after                                                            |
| ----------------------------- | --------- | ---------------------------------------------------------------- |
| 22 / 80 / 443                 | succeeded | succeeded                                                        |
| **40000, 40199** (allowed)    | refused   | **refused** — still reaching the host; mediasoup binds on demand |
| **40500** (outside the range) | refused   | **dropped, no answer**                                           |
| **2019** (Caddy admin)        | —         | **dropped, no answer**                                           |

"Refused" means the packet reached the host and nothing was listening; a timeout means the firewall
ate it. That flip on 40500 — and only on 40500, while 40199 next door still answers — is what
distinguishes a working ruleset from a hopeful one.

Also verified: a **new** SSH connection succeeds (the lockout test), all three hostnames respond, and
`pnpm smoke` passes **9 of 9** both immediately after enabling and again after the deadline passed.

The 2026-08-09 finding that opened this item is reproduced exactly in the "before" column: TCP 40000
**and 40500** both refused, `ufw inactive`, iptables INPUT `ACCEPT`. Nothing was wrongly exposed at
the time — but the next service to bind `0.0.0.0` would have been public the second it started, and
now it will not be.

### 07:52 — A collector for the six gaps I cannot reach, and it is EXECUTED rather than just written

**No runtime impact** — two scripts and six TODO rows. New:
`apps/controller/scripts/collect-manage-gaps.js`, `collect-manage-gaps.smoke.mjs`.

Paste-and-go for `TODO.md` gaps **5, 8, 9, 10, 11 and 12** — the manage-page ones that
`collect-create-new.js` does not touch. It downloads its own JSON; no terminal command, no
follow-up.

**It fixes the two defects that spoiled the last capture,** both recorded in `TODO.md` and both
silent failures:

- **Truncation.** The previous collector stopped its node array at index 900 and cut every tab's
  `html` at 120,000 characters — 35.6% of the Settings pane unmeasured. This one has no cap, and
  writes any limit it _does_ hit into `gaps[]`, so a short capture can never again look complete.
- **The DON'T TOUCH block.** The previous one "logged the step and serialised the wrong element",
  leaving 49 settings verified only against an older dump. This one counts fields **before and
  after** clicking the disclosure and refuses to serialise if nothing changed — an empty result is
  reported as a failure instead of written out as evidence.

**Safety is structural, not a promise.** Every click goes through `safeClick()`, which refuses any
element whose text or attributes match a denylist (delete, upload, play, stop, send, save, submit,
post, ban, kick, clear, reset, launch, archive, pay, invite, email) and records the refusal. The only
clicks are on tab strips and disclosures — controls whose entire function is to reveal something
already present. It issues **no** network request of any kind. Credential-shaped field values are
masked before they reach the file.

**And it was actually run.** `node --check` only proves a file parses, and this gets pasted into a
live system once — a script that throws halfway writes a partial capture that looks complete.
`collect-manage-gaps.smoke.mjs` executes the real file against a dependency-free DOM stub:

```
SMOKE PASSED
  reached download: 21.2 KB of valid JSON
  settings fields captured: 3
  DON'T TOUCH disclosure clicked: true
  honest gaps recorded: 4
  secret redacted: true
```

That run caught **three problems, two of them mine and one real**:

1. A `const description` I had glued into `constdescription` while replacing a stray non-ASCII
   identifier. **`node --check` passed it** — it is legal as an implicit global — and it would have
   thrown at runtime under `'use strict'`, on the first click, on the live system. Only executing it
   found that.
2. My stub's `body` lacked `querySelectorAll`, which every real body has. My bug — but it exposed
   that the collector falls back to capturing the whole document when `.tab-pane.active` is absent,
   which the output now states as `paneSelector: "body (fallback)"`.
3. A four-second wait shorter than the collector's own deliberate sleeps, reported as "never reached
   the download step". The harness polls for 30s now instead of guessing.

`user rows captured: 0` in that output is a limit of the stub — it has no descendant-selector
support, so `table tr` matches nothing — and both the code and the printed line say so, because a
number that looks like a failure and is not is how a real failure gets ignored later.

**Attempted and abandoned, recorded rather than hidden:** verifying it in a real browser needed the
file served over `http://127.0.0.1`, and that navigation was declined — correctly, since the
standing rule is that nothing runs on local ports for this project. The server was stopped and the
port confirmed closed within the minute.

### 07:38 — The other two items: the collector verified ready, and a staging checklist for item Q

**No runtime impact** — one new document and two TODO rows. New:
`integrations/wordpress/STAGING-TEST.md`.

**Evidence gap 1 (`createNew()`) — prepared, and it is the owner's to run.** The function lives in
`/public/dist/app.min.js` on the LIVE original; nothing in this repository can reach it. What I could
do was make it a single paste and prove the script is safe to paste:
`node --check` clean, and re-read end to end — it performs **one `fetch` GET** of same-origin scripts
and the only `.click()` in the file is on an anchor it creates to trigger the download. It touches no
page control, submits nothing and posts nothing. Its eight targets cover gaps **1, 2, 3, 6 and 7** in
a single run, plus an attempt at 4. The TODO row now says so, rather than leaving the next reader to
re-audit it before daring to run it.

**Item Q — the missing half is a real WordPress, so it is now a checklist rather than a research
task.** `STAGING-TEST.md` is nine numbered steps with expected results and the exact log lines to
look for. Two of them are the point:

- **§5, the cache trap.** Copy the button's `href` and confirm it contains **no `jwt=` token**, then
  open it logged-out and confirm you get the WordPress login rather than the room. If a token is
  ever in that href, every visitor served the cached page enters as whoever loaded it first. The
  design prevents it; this is how you check the design survived.
- **§6, cancelling the subscription.** Cancel in WooCommerce, do not log out, click again — expect a
  refusal with `reason: "no-match"`. **This is the only step that proves entitlement is live rather
  than decorative; every other step passes with the gate wide open.** Item Q closes when §6 passes,
  and not before.

It also warns to leave the second and third filters blank during the test, because filters are
OR-ed — a second one would admit a visitor who matches only it, and the membership gate would never
be exercised at all.

### 07:35 — Item 1, the `ptr_clone` rename: the runtime role is renamed, and the job was 4× smaller than recorded

**No runtime impact** — a new forward-only migration nothing has applied yet, plus documentation.
Files: `services/api/migrations/0009_rename_runtime_roles.sql`,
`ops/postgres-runtime-role-hardening.md`, `apps/room/TODO.md`.

**Migration 0009 renames `ptr_clone_app` → `tradingroom_app`**, forward-only because the five applied
migrations that name the old role cannot be touched: editing one changes its sqlx checksum and every
existing database refuses to migrate, which has already happened on this project to a legacy database
that can never be migrated forward again. `0001_baseline.sql` is pinned twice besides.

Proven against a real PostgreSQL 16.13, all four paths — absent → no-op; present → renamed; run
twice → clean; **both names present → refuses**, because choosing one silently would decide which
role owns the grants, and that is an operator's call.

**A trap the entry did not record, and it would have failed on every database.** The OWNER role
cannot be renamed by a migration at all:

```
connected AS the role     ERROR:  session user cannot be renamed
from another session      ALTER ROLE
```

Migrations authenticate as `ptr_clone`, so an in-migration owner rename is impossible, not merely
risky. Measured with a throwaway role rather than assumed from documentation. It is now an operator
step with its own runbook.

**The scope in the entry was wrong by a factor of four, and that is the more useful finding.** It
read as a 570-occurrence find-and-replace. Measured: **594 outside the evidence dump, and ~445 of
them — three quarters — must keep the old name permanently.** 383 are in the checksum-pinned
`0001_baseline.sql` alone; the rest are the other applied migrations, the provisioning script that
must keep creating `ptr_clone_app` so those migrations can apply, the SHA-256-pinned evidence
verifier, and historical documents whose provenance rewriting would falsify. RLS policies need
nothing at all — policy targets are stored by OID, not by name.

Treating this as a text substitution is precisely how a database stops migrating, so the breakdown
is now a table in the runbook rather than a sentence in a TODO.

**What is left, and why it is not done here.** ~150 live occurrences, all inside `services/**`:
connection defaults, the release-attestation expected values, and the role-name assertions in
`tests/migrations.rs` (43) and `tests/tenancy.rs` (11). `services/**` is a mirror of
`new-room-control`; the entry itself says to do this "at the source repository, as its own dedicated
change with nothing else moving"; that tree has already diverged twice — the second time with
`new-room-control` serving the unsafe copy — and every one of those assertions is a runtime check
that needs a provisioned cluster with both roles to verify. Doing it from this side would deepen a
divergence already open as item **P**. Recorded rather than half-done.

Verified: `cargo check -p tradingroom-api --all-targets --features testing` clean, room format gate
green.

### 07:22 — The WordPress plugin is EXECUTED: `php -l` clean, and a PHP-minted token verified here

**No runtime impact** — closes the executable half of `TODO.md` item **Q**. New:
`integrations/wordpress/tradingroom-sso/tests/mint-golden-token.php`, `tests/golden-token.json`.

Docker Hub was reachable again (it and `git push` were failing from the same network fault an hour
earlier), so the thing that could not be done, was done.

**`php -l` under PHP 8.3.33: no syntax errors.**

**And a real cross-language proof, which is the part that matters.** `tests/mint-golden-token.php`
loads the plugin with the three WordPress functions it touches at load time stubbed, then mints a
token through the plugin's **own** `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()`.
The result is committed as `golden-token.json` and pinned by four new tests: the bytes a real
`hash_hmac` and a real `json_encode` produced are run through the verifier a customer's login will
hit. Everything else in that file _describes_ what PHP would emit; this is PHP emitting it.

**It caught the encoding hazard in the act.** The harness deliberately feeds the entitlement path a
duplicate and a blank — `['gold-annual', 'gold-annual', '  ']` — and the minted payload reads
`"memberships":["gold-annual"]`. A JSON **array**, de-duplicated and trimmed. Without the plugin's
`array_values( array_unique( … ) )` wrapper, `array_filter` would have left a gap in the keys and
PHP would have emitted `{"0":"gold-annual"}`, which our reader treats as nothing asserted — failing
closed, but baffling to debug. That wrapper is now proven load-bearing rather than argued to be.

The vector is also proven to be a real credential rather than a bypass: it is refused once stale
(`expired`) and refused against another room (`wrong-room`). Negative control: changing a single
signature byte fails four of the sixteen tests; restoring it passes.

Both commands run in a container, so **no local PHP is required** to reproduce or to regenerate the
vector after a change to the minting path — the command is in the script's header and in the
README.

**What is left of item Q, stated precisely rather than closed early:** the harness stubs WordPress;
it does not boot it. Nothing here has exercised `wc_memberships_get_user_active_memberships`,
`wcs_get_users_subscriptions`, the settings screen or the cached-page path. Before a customer uses
this it needs a staging site: enter as a paid member, then **cancel the subscription and prove the
next entry is refused**. That needs a real WordPress, not a build machine — so item Q is narrowed to
exactly that, and the README's Status section now says which half is proven.

Verified: **635 tests across 57 files** (631 → 635), `svelte-check` **0 errors, 0 warnings**, format
gate green.

### 07:09 — Full audit: three broken gates found and fixed, one of them mine

**No runtime impact** — gates, formatting and one stale contract list. Files: the room's
`.prettierignore`, the controller's `package.json` and `scripts/verify-room-settings-schema.mjs`,
`src/lib/sso-boundary.test.ts`, plus 29 files reformatted.

Everything was re-run from scratch — both apps, the Rust workspace, production. **Three real
defects, and two false alarms that were my own tooling.**

---

**1. A stale contract list — and it was mine, from four commits ago.**
`scripts/verify-room-settings-schema.mjs` carries its own `EXPECTED_WIRED_SETTINGS`, a **third**
copy of the wired set beside the generator's and the generated file's. Phase 2 and 3 wired six
settings and left this one at 35.

Nothing failed, because **this gate cannot run in this repository** — it shells out to the generator,
which reads `evidence-dumps/`, which is not here (`ENOENT: no such file or directory …
evidence-dumps/login-page/manage`). It is the strongest of the three checks — it regenerates the
schema twice and compares bytes — and it is the one that would have gone red on the first machine
that had the dump.

Fixed to 41 entries, and the note above it corrected. More usefully, `sso-boundary.test.ts` now
**reads that script and asserts its list equals the schema's wired set**, so an unrunnable gate is
mirrored by one vitest can execute. Negative control: removing a single entry fails the new test;
restoring it passes.

That note already said _"a count that appears twice is a count that goes wrong once."_ It appeared
three times, and went wrong a third time. It now goes wrong loudly.

**2. The room's format gate had regressed — 33 files.** It was closed green on 2026-08-04 by
`TODO.md` 3d. **29 of the 33 were `.vercel/output/**`** — minified chunks and generated JSON from an
adapter-vercel build that did not exist when that entry was written, so the directory was never
ignored. `.vercel` added beside `.svelte-kit` and `build`, following the file's own stated rule
("SOURCE gets formatted, GENERATED gets ignored"). The remaining 4 were real and are formatted. The
five `.svelte` files deliberately excluded for whitespace-geometry reasons were **not** touched.

**3. The controller's format gate could never pass at all.** Its script globbed
`.github/**/*.{yaml,yml}`, but `.github/` lives at the repository root, not inside `apps/controller`
— so prettier exited on `No files matching the pattern were found` regardless of the code. The stale
glob is removed and 25 files formatted (6 from this SSO work, 3 from earlier today, ~16
pre-existing).

---

**Two false alarms, both my own tooling, reported here rather than as findings:**

- **`pnpm smoke` failed 6 of 9**, including `media /health: fetch failed`. An immediate re-run passed
  **9 of 9**, and probing the same three hosts from the Hetzner box returned 200/403/200. It was this
  machine's transient network — the same fault that was failing `git push` and the Docker Hub pull in
  the same minutes. **Production was never down.** Checking from a second network before reporting is
  the only reason that is not in here as an outage.
- **`cargo check --workspace --all-targets` reported 12 errors** in `tradingroom-api`'s tests. Every
  one was a missing `*_for_tests` helper — which are behind the `testing` feature, deliberately not
  default ("in a production build the connection stays private, which is fence #2 of the tenancy
  kernel"). With `--features testing`: clean. **My invocation was wrong; the crate is fine.**

---

**Verified after every fix:** controller **631 tests / 57 files**, `svelte-check` 0/0, `vite build`
clean, format gate green. Room **524 tests / 56 files**, `svelte-check` 0/0, node-adapter build
clean, format gate green — "All matched files use Prettier code style!" for the first time since it
regressed. Rust: `tradingroom-api` checks clean with its feature, `clippy -D warnings` clean on
`tradingroom-media`. `pnpm smoke` **9 of 9** against production.

### 06:57 — WordPress SSO, phase 4: the plugin, and an honest limit on it

**No runtime impact.** New: `integrations/wordpress/tradingroom-sso/tradingroom-sso.php`,
`integrations/wordpress/README.md`, `apps/controller/src/lib/server/sso-wordpress-contract.test.ts`.

The customer-side half. A logged-in member clicks "Enter Room"; the plugin asks WooCommerce what
they currently hold — active memberships, active subscriptions, purchased products — signs it with
that room's key, and redirects to `/sso/<code>?jwt=…`.

**The design decision that matters most: the token is minted on CLICK, never at render.** A token
embedded in rendered HTML is stored by the page cache, the CDN and every "copy of this page" plugin,
and then served to **every subsequent visitor** — each of whom would enter the room as whoever
loaded the page first. So the shortcode links to the plugin's own endpoint and the mint happens when
that link is followed. On a cached WordPress site the alternative is not a performance issue, it is
a total authentication failure, and it is the single easiest thing to get wrong here.

**The key is never a shortcode attribute.** The reference's own shortcode carried `key=''`, which
puts a room credential into post content — visible to every editor, every revision, every export.
Ours keeps keys in site options, masked on the settings screen, and a masked row left untouched
keeps its stored value so an admin can edit the controller URL without re-entering every key.

Also: entry requires a logged-in user (and sends them to log in and come back rather than losing the
click); an unknown room is refused rather than redirected to, which is what makes the one outbound
`wp_redirect` safe; and three filters plus an action are exposed for sites whose entitlements do not
live in WooCommerce at all.

**Two PHP hazards, both now pinned by tests.** `wp_json_encode` escapes forward slashes by default —
`https://x` becomes `https:\/\/x` — which is the classic "works in Postman, fails from WordPress"
bug when a verifier re-serialises the payload before checking the signature. Ours cannot hit it,
because the signature is computed over the payload **segment as presented**, never over a re-encoding
of the decoded object; the test exists to keep that invariant through future refactors. And
`json_encode` turns a non-sequential PHP array into `{}` rather than `[]`, which is why the plugin's
`array_values()` wrapper is load-bearing — our reader treats a non-array as nothing asserted, which
fails **closed**, but the failure would be baffling without the note.

**The honest limit, and it is a real one: the plugin has never been executed.** PHP is not installed
here and Docker Hub was unreachable (`context deadline exceeded` pulling `php:8.3-cli`), so neither
`php -l` nor a real mint was possible. The 12 contract tests prove **our side honours the contract we
wrote down** — they do not prove the PHP produces those bytes. Recorded as `TODO.md` item **Q** with
the one command that closes it, and stated in the README's Status section rather than left for a
customer to discover. **It should not ship to a customer before `php -l` and a staging install with
a real subscription cancelled mid-test.**

Verified: **629 tests across 57 files pass** (617 → 629), `svelte-check` **0 errors, 0 warnings**.

**All four phases are done.** `ssoJWTSecret` and the three entitlement filters are wired and
enforced; `tokenExpiresIn` bounds staleness; the room application was never touched. What remains
before a customer uses it is item **Q** and a decision on the default expiry (`1h` is in place).

### 06:50 — WordPress SSO, phase 3: `tokenExpiresIn` becomes the room's own staleness ceiling

**No runtime impact until deployed.** Files: `src/lib/server/sso-token.ts` (+ tests),
`(public)/sso/[code]/+server.ts`, `sso-boundary.test.ts`, the generator and the generated schema.

Phase 1 enforced one hour for every room. That is now the **default**, and a room owner narrows it
with the setting the reference already provides: `tokenExpiresIn`, whose help reads _"A string like
'1d', '1h', '12h" etc…"_ and whose captured value in the reference tenant is exactly `"1d"`.

`resolveMaxTokenAge()` accepts `s`/`m`/`h`/`d`, bare digits as seconds, and tolerates spacing and
case. **Every path returns a usable number** — this runs on the entry path, so a typo in a settings
box must not take a room offline. It reports how it got there (`default` · `configured` · `clamped` ·
`unparsed`) and the route logs anything that is not a clean read, because a settings box that
silently does nothing is the exact complaint the `wired` flag exists to prevent.

**The clamp, at 24 hours.** An owner typing `365d` would turn the payment gate into a decoration.
The ceiling is not arbitrary: `1d` is the reference's own captured value, so a day is demonstrably a
value the original expected people to use, and the boundary itself is honoured rather than clamped.
Over-long values are capped and logged rather than refused — refusing would lock an owner out of
their own room over a text box, while honouring it silently would make the gate meaningless.

**`verifySsoToken` takes an options object now.** There are two independent knobs and a third would
eventually arrive; `verifySsoToken(secret, code, token, 3600)` reads as a timestamp at a glance and
would be a silent bug on the entry path. The twenty existing call sites were migrated by walking
balanced parentheses rather than by regex, because `NOW` also appears inside the claim literals and
a regex would have rewritten those too.

**`tokenExpiresIn` is wired — 40 → 41 of 269.** Generator, generated file and the boundary test's
count-lock all moved together, which is what that lock is for.

**A second test of mine broke on formatting rather than behaviour**, and the fix is the same lesson
as phase 2's: it pinned the complete single-line `verifySsoToken(...)` expression and failed the
moment the options object was added. Rewritten to assert the call **prefix** — that `shortCode`
reaches the verifier — which is the behaviour worth pinning. A test that fails when a line wraps
teaches people to stop reading tests.

Verified: **617 tests across 56 files pass** (610 → 617), `svelte-check` **0 errors, 0 warnings**.

### 06:46 — WordPress SSO, phase 2: the door, and the entitlement rule

**No runtime impact until deployed** — new route and helper. Files:
`apps/controller/src/routes/(public)/sso/[code]/+server.ts`,
`src/lib/server/sso-entitlement.ts` (+ tests), `src/lib/sso-boundary.test.ts`,
`scripts/extract-manage-schema.mjs`, `src/lib/room-settings-schema.ts`.

`GET /sso/<shortCode>?jwt=<HS256 JWT>` — verify, evaluate entitlement, mint the **existing** guest
handoff, redirect into the room. Roughly 60 lines of decision surrounded by the reasons for each.

**Why it mints a GUEST token, and why that is the property to defend.** A WordPress visitor has no
account here, and inventing one would be inventing authority. `type: 'guest'` with an empty `id` is
precisely true, and the room then resolves their role from its own membership, failing closed to
`member`. So **entitlement is delegated; authority is not** — if a customer's WordPress is
compromised, the blast radius is people entering a room they did not pay for, not somebody arriving
as staff. `sso-boundary.test.ts` asserts the route calls `guestHandoffToken` and never
`siteHandoffToken`.

**The entitlement semantics come from the reference's help text, and they are surprising.**
`allowedProducts` and `allowedPerms` both read _"Either a product or membership, or both must
match"_ — an explicit disjunction. So configured filters are **OR-ed**: filling in a second family
to be stricter actually **widens** access. That runs against the usual fail-closed instinct, and it
is implemented as the evidence states rather than as instinct prefers, with the ambiguity named in
the module docs: the same sentence is repeated verbatim on `allowedPerms`, where "a product or
membership" does not mention permissions at all, so it reads like copied help text and the dump
cannot settle it. `explainEntitlementDecision()` exists so the Manage page can warn an owner in the
place they are typing rather than leaving them to discover it from who turns up.

The lapsed-payment path needs no special signal: WooCommerce simply stops reporting the plan, the
token arrives with nothing in it, and no filter matches. **Absence is the signal**, which means we
cannot drift out of step with their billing state machine.

**Ordering, and one deliberate inconsistency.** The verifier checks the signature before reading any
claim, because reporting on unauthenticated bytes is how a verifier becomes an oracle. The route
does the opposite — room-state before signature — and says why: whether a room is open is not a
secret (the guest login already reveals it to anyone holding the code), so there is no oracle to
protect and an early refusal avoids an HMAC per probe.

Every refusal returns the same words. `loginErrorURL` (the customer's own "your subscription has
lapsed" page) takes precedence, then `loginErrorMsg`, which the room-login page already uses — so
both doors refuse consistently. Admissions are logged too, with the filter entry that opened the
door: _"on what basis was this person let in"_ is the question asked months later, and it cannot be
answered from a log of failures only.

**Wiring, and a generated file edited by hand — deliberately, and with a lock.** Five settings now
have a consumer: `ssoJWTSecret`, `allowedMemberships`, `allowedProducts`, `allowedPerms`,
`loginErrorURL`. **35 → 40 of 269 wired.** The flag lives in `scripts/extract-manage-schema.mjs`'s
`WIRED_SETTINGS`, which was updated properly — but **`pnpm schema:extract` cannot run in this
repository**: it reads `evidence-dumps/login-page/manage`, which is not here (the same absence that
blocked `verify-home-fidelity.mjs` on 2026-08-09). So the identical transformation was applied by
hand to the generated file, which its own header forbids.

That is only acceptable with something enforcing it, so `sso-boundary.test.ts` reads the generator's
contract number and asserts the generated file's wired count and header text agree with it. Flip a
flag in one without the other and it fails. It is the difference between "edited a generated file
once, carefully" and "the generated file is now hand-maintained by accident".

**One test was wrong and the code was right** — worth recording, because it is the failure mode the
house rules name. The ordering test used `indexOf('evaluateEntitlement')` and failed; it had matched
the _import_ statements at the top of the file, where the entitlement module happens to be imported
before the token one. The route was correct throughout. Fixed by anchoring on call syntax, with the
mistake written into the test so the next person does not repeat it.

Verified: **610 tests across 56 files pass**, `svelte-check` **0 errors, 0 warnings**. The full suite
was run rather than a targeted one because the wired count changed in a generated file many tests
read. `svelte-kit sync` was needed first — a new route has no `./$types` until Kit generates them.

### 06:40 — WordPress SSO, phase 1: the verifier for a customer-minted token

**No runtime impact** — new module and its tests; nothing routes to it yet. Files:
`apps/controller/src/lib/server/sso-token.ts`, `sso-token.test.ts`.

**The goal, in one line:** a customer running WordPress + WooCommerce (Simpler Trading is the worked
example) embeds a room short code on their site, and _their_ billing system decides whether a member
may enter — payment up to date or not.

**The evidence this is built on, not inferred.** `room-settings-schema.ts:67`, the help text the
reference itself renders for `ssoJWTSecret`:

> "Use this key in combination with the **WordPRess plugin**, or other JWT SSO, make it hard to
> getss, like: `5081b73a690762e2526bc1fef3c46eedf1ec8832`"

with `ssoHost`, `allowPWLoginWithSSO` and `tokenExpiresIn` (captured `"1d"`) beside it, and the
owner's own shortcode carrying `key=''` and `mode='urlv3'` — a URL-borne JWT.

**The architecture decision, and it removes most of the work.** Reading the room's `/session` route
first paid for itself: _"The controller owns identity… Either way the controller mints a token and
redirects here."_ So WordPress SSO is a **third door on the controller**, beside owner-launch and
guest-login — the customer's site redirects to us, we verify and evaluate entitlement, then mint the
**existing** handoff through `room-handoff.ts`. Three consequences:

- **the room application needs no change at all** — it still trusts exactly one credential;
- **`ssoJWTSecret` never leaves the controller process.** It is not in `ROOM_VISIBLE_SETTINGS` and is
  never serialised into page data, which matters because the room puts its config into SSR HTML on
  every load;
- **one signer, one verifier.** A second implementation of the handoff is how two implementations
  drift apart.

**What is transcribed and what is ours, stated rather than blurred.** Transcribed: that the
mechanism exists, and its key. **Ours:** the claim set. The reference's captured token is
`{ name, email, id, type, issued, iat, exp }` — byte-for-byte from `ptr1.json` — and carries **no
membership, product or permission field**, so the dump cannot say how `allowedMemberships` /
`allowedProducts` / `allowedPerms` were evaluated: either their plugin checked before minting, or
their server called back to WordPress. Rather than invent a mechanism and present it as recovered,
the entitlements ride **inside** the signed token — no callback, no shared network path, no
WooCommerce credential on our side. Recorded as a deliberate divergence in the module docs.

**The check that makes the payment gate real, and the reason it exists.** The customer controls
`exp`; we enforce `SSO_MAX_TOKEN_AGE_SECONDS = 3600` on top. Without it a site minting year-long
tokens — which is exactly what the reference's own handoff does, at **360 days** — would turn "is
this subscription paid?" into "was it paid at some point last year". One hour survives a slow
checkout or a link opened in a new tab, and makes a cancellation bite within a trading session
rather than a trading week. Its test is named for the job it does.

Also strict, each one an allow rather than a reject: `HS256` pinned (`alg: none` is the textbook
forgery), constant-time comparison over the **presented** bytes rather than a re-serialisation,
`exp` required, future-dated `iat` refused, and **`room` required and matched against the URL** —
per-room keys already make cross-room replay hard, but a customer who reuses one key across two
rooms would otherwise hand every token holder entry to both. Binding costs nothing and does not
depend on the customer's key hygiene. Rejections are opaque to the caller and detailed in the log,
because naming the failed check turns the endpoint into an oracle for probing a customer's key.

Two integrator-friendliness decisions, both free: entitlements are accepted as a JSON array **or** a
comma-separated string, because `json_encode` of a term list gives one and `implode(',', $slugs)`
gives the other; and email is lower-cased once, here, since it is the join key to a membership row.

`generateSsoSecret()` emits **32 bytes** of hex rather than the reference example's 20 — this is an
HMAC-SHA256 key, and matching a screenshot is not a reason to hand a customer less entropy than the
algorithm's block size. The value is opaque to the plugin, which only copies it.

Verified: **17 tests pass**, `svelte-check` **0 errors, 0 warnings**. No migration was needed —
`ssoJWTSecret` is already one of the 269 keys in `room_settings.settings_json`.

**Not yet wired.** `wired: true` is flipped only when a consumer exists, and the consumer is the
route in phase 2. The flag lives in `scripts/extract-manage-schema.mjs`'s `WIRED_SETTINGS` and the
schema is regenerated — hand-editing the generated file would be undone by the next `schema:extract`.

### 06:01 — The liveness fix is DEPLOYED and proven against production

**Runtime impact: yes.** `tradingroom-media` on `87.99.154.155` was rebuilt and restarted at
09:56:21 UTC (05:56 EDT). It now runs the build containing `a11883c`.

**How it was verified, in order.** Nothing below is inferred:

1. **The build carries the fix.** The image is distroless and has no shell, so the binary was copied
   out with `docker create` + `docker cp` and read directly: both new log strings
   (`no response to heartbeat`, `peer stopped answering`) are present. Build log: zero errors.
   Image 71.8 MB, unchanged in size from the previous one.
2. **The service came back healthy** — `systemctl is-active` → `active`, worker started, admission
   still `require-grant` against the same public key.
3. **`pnpm smoke` → `All 9 checks passed.`**
4. **A real ghost was reclaimed, on the deployed build.** A probe minted a genuine Ed25519 grant on
   the box (so the signing key never left it), opened `/ws` over raw TLS with a hand-written
   upgrade — deliberately not a WebSocket library, because one would auto-pong and hide the very
   thing being measured — and then answered nothing at all:

   ```
   09:58:11.183  peer connected                  room=tra-liveness-probe user=Legacy(424242)
   09:59:11.185  peer stopped answering; closing its socket and releasing its slot  silent_for_secs=60
   09:59:11.185  room emptied; router closed     room=tra-liveness-probe
   09:59:11.185  peer disconnected
   probe:        server closed us after 60.0 s
   ```

   `/health` moved `rooms:1,peers:2` → `rooms:2,peers:3` while it was connected and back to
   `rooms:1,peers:2` sixty seconds later. **The router was closed and the slot released**, which is
   the whole point: before today that socket would have been counted forever.

5. **The live peers were NOT evicted.** The owner's two sockets stayed connected throughout the
   probe and are still connected now. That is the second test's property holding in production.

**And the restart settled the open question from 05:42.** Both peers **reconnected 1.4 seconds
after the service came back** (09:56:22, same room, same user). A ghost cannot reconnect — so those
two sockets were live browser tabs, idle and producing nothing, not abandoned ones. My 05:09 claim
was wrong in a different way than I feared: they were real sessions, but "the media plane is
carrying real peers" was still overstated, because no media was flowing on either and the earlier
06:58–07:09 session was the only one that ever produced audio or video.

Probe artefacts (`/tmp/liveness-probe.mjs`, its log, the extracted binary, the build log) were
removed from the box afterwards.

**Still open, and deliberately not done here:** `services/**` is a mirror, so this change now
diverges from `new-room-control`'s copy and must be promoted upstream and re-sealed
(`apps/room/TODO.md` entry 2, a drift that has already happened twice). That folder is under a
standing instruction not to be edited from this repository, so it needs the owner's call rather than
a quiet sync. `TODO.md` item **P** is narrowed to that alone.

### 05:42 — "Two real peers" investigated: the SFU cannot tell a live peer from an abandoned socket

**No runtime impact yet — the fix is committed (`a11883c`) and NOT deployed.** The box still runs
the 2026-08-09 build. Deploying needs a ~15-minute rebuild on the box and a service restart.

At 05:09 I wrote that `media.tradingroom.app` showed `rooms:1, peers:2` and called it "two real
peers connected to a real room… the media plane is carrying real peers." **That claim was not
supported by anything I had measured.** What follows is what the box actually says.

**The journal — both peers are the same person, and neither has produced anything.**

```
07:22:47Z  peer 64840acf… room=tra-1001 user=Some(Legacy(1)) role=Some(Presenter)  peer connected
07:40:33Z  peer 87c1c059… room=tra-1001 user=Some(Legacy(1)) role=Some(Presenter)  peer connected
```

No `peer is producing` line for either, and no disconnect. The session before them
(06:58:41–07:09:17) _did_ produce audio and video and then disconnected cleanly — so the media path
works and disconnect detection works when a socket closes properly.

**The sockets — alive at the TCP layer, silent at the application layer.** `ss -tni` at 09:30:06Z,
against the two client connections from `216.49.131.90`:

| socket  | `lastsnd`/`lastrcv`           | connected at | `lastack` |
| ------- | ----------------------------- | ------------ | --------- |
| `:5147` | **7,639,280 ms — 2h 07m 19s** | 07:22:47Z    | 5.4 s     |
| `:5425` | **6,573,063 ms — 1h 49m 33s** | 07:40:33Z    | 14.5 s    |

Both idle times match their connect timestamps **to the second**: not one application byte has
crossed either socket since the moment it was established. `lastack` in seconds means the client's
TCP stack is still answering keepalives, so these are most likely two idle browser tabs rather than
ghosts. **That is the point — the server cannot tell, and neither can I.** An idle tab and an
abandoned socket are byte-for-byte identical to this service.

**Why that is a defect and not a cosmetic stat.** Reading `serve_peer`, the loop selects on exactly
three things — shutdown, notifications, inbound frames — and **no timer**. Every per-peer resource
is RAII on that task: `LiveConnection` (which holds both the global `max_peers` slot _and_ the
per-identity count, capped at `MAX_CONNECTIONS_PER_VERIFIED_USER = 4`), `HubMembership`, and the
`Session` holding the room's router. The task ends only when the socket produces an event. A client
that disappears **without a clean close** — closed laptop, dropped network, killed browser process,
phone leaving coverage — produces none, so:

- the room never empties and its router stays open;
- `/health` reports participants who are gone;
- and after four such sockets **that user is refused entry to their own room with a 503 while the
  service reports itself healthy** — precisely the failure `Config::max_peers`' own documentation
  says the ceiling exists to prevent. Both current sockets belong to `Legacy(1)`, so that user is
  already holding **2 of their 4** slots on connections that have said nothing for two hours.

TCP keepalive is not a fallback. It is the kernel's policy on a socket this process never sees — it
talks to Caddy over loopback, which never fails on its own — and the box's own settings
(`tcp_keepalive_time 7200`, `intvl 75`, `probes 9`, read from `sysctl`) would take **over two
hours** to conclude anything.

**The fix — a heartbeat arm in the peer loop.** Ping every `peer_ping_interval`; close the peer when
it has said nothing for `peer_silence_limit`. Any inbound frame counts as proof of life, which is
why that assignment sits above the `match` rather than in the `Pong` arm. Defaults 20 s and 60 s —
three missed pings — both now `Config` fields (`MEDIA_PEER_PING_SECONDS`,
`MEDIA_PEER_SILENCE_SECONDS`) validated at startup, so a zero interval or a silence limit below the
ping interval fails the boot instead of the first peer.

**No client change is required.** Browsers answer a WebSocket ping automatically at the protocol
level (RFC 6455 §5.5.2), so the pong arrives without a line of room code.

Two tests, and the pair is the point:

- `a_peer_that_stops_answering_is_closed_and_its_slot_released` — connects a socket and then never
  polls it, which is a faithful reproduction: a tungstenite client answers pings only while its
  stream is polled, so an unpolled socket is exactly a peer whose TCP stack is fine and whose
  application is not.
- `a_peer_that_keeps_answering_is_never_evicted` — **a heartbeat that evicts live sockets would be a
  worse defect than the leak**, and would look like an intermittent network fault rather than a
  server decision.

**Negative control, because a test that passes either way is worthless:** with the reclaim branch
disabled, the first test fails `left: 1, right: 0`. It measures the mechanism.

Verified: **114 lib + 11 bin tests pass**, `cargo clippy -p tradingroom-media --all-targets -D
warnings` clean, `cargo fmt` applied. Scope was the changed crate only, per the standing rule.

**Two honest notes.** The **rust-analyzer MCP was not available** in this session — absent from the
tool registry entirely, not merely unresponsive — so this used `cargo check`/`clippy`, which the
house rules allow only with this disclosure. And `services/**` is a **mirror**: this change makes
this copy diverge from `new-room-control`'s, which is `apps/room/TODO.md` entry 2 and has already
bitten twice. It must be promoted upstream and re-sealed rather than left to drift.

### 05:14 — The old SFU is DELETED. It was Lightsail all along, and the 04:56 entry below was my error

**No runtime impact on this repository** — no code changed. Real-world impact: an AWS resource that
had been billing since 2026-08-02 no longer exists.

**What was deleted,** read from the Lightsail API rather than inferred from anything:

|           |                                                                             |
| --------- | --------------------------------------------------------------------------- |
| Instance  | `mediasoup-test-01`, us-east-1a, Ubuntu                                     |
| Bundle    | `small_3_0` — **$12.00/month**, 2 vCPU, 2 GB RAM, 60 GB SSD, 3 TB transfer  |
| Created   | 2026-08-02 12:54:31 -0400 — so **$12/month for 8 days**                     |
| Static IP | `mediasoup-test-ip` = `34.195.170.147`, released                            |
| Alarms    | `mediasoup-cpu-high`, `mediasoup-status-check-failed`, both removed with it |

`aws lightsail get-instances` now returns empty across all eleven regions, as do `get-static-ips`,
`get-disks` and `get-instance-snapshots`. EC2, EBS and S3 were already empty everywhere.

**The order was stop → verify → delete, and the verify step is the point.** After stopping,
`https://media.34-195-170-147.sslip.io/health` was unreachable while `media.tradingroom.app` still
answered — **with `rooms:1, peers:2`, the first real peers ever observed on the Hetzner SFU** — and
`node scripts/smoke.mjs` printed `All 9 checks passed`. Only then was it deleted. Stopping is
reversible; if anything had depended on that machine, smoke would have said so while
`start-instance` was still an option. Smoke passed 9/9 again after deletion.

Releasing the static IP is a separate call and is easy to miss: a Lightsail static IP is **free
while attached to a running instance and billed once it is not**, and `delete-instance` detaches it.

---

**Now the correction, and it is mine.** The 04:56 entry below says _"it is EC2 in us-east-1, not
Lightsail — the owner was right that no Lightsail instance was ever deployed."_ **That was wrong.**
`mediasoup-test-01` existed, in Lightsail, exactly as `MEDIASOUP-DEPLOYMENT-PLAN.md` had described
it since Stage 1. The entry is left in place rather than rewritten, because it was read.

Both pieces of evidence I used were read correctly and neither supports the conclusion I drew:

- **`whois` → Amazon, and reverse DNS → `ec2-34-195-170-147.compute-1.amazonaws.com`.** Lightsail
  instances _are_ EC2 instances underneath, so a Lightsail IP carries exactly that rDNS form.
  **Reverse DNS establishes the vendor and the region. It cannot distinguish the product.**
- **`aws ec2 describe-instances` empty in every region.** This felt like confirmation and was the
  opposite: **Lightsail resources never appear in the EC2 API**, so an empty EC2 sweep is precisely
  what a Lightsail-only account returns. The sweep that seemed to prove the finding was the
  strongest available sign that the wrong service was being queried.

One command settles it, and it is the service's own:

```console
$ aws lightsail get-instances --region us-east-1 --query 'instances[].name' --output text
mediasoup-test-01
```

**This is the house rule in `CLAUDE.md` almost word for word — "rule out my own tooling before
reporting a single failure", and "if it cannot be found, it does NOT get invented".** I inferred a
product from a hostname format and then told the owner they were right, which is worse than being
wrong quietly: it endorsed a conclusion with authority it had not earned. The honest answer at 04:56
was _"the vendor is Amazon and the region is us-east-1; which product it is cannot be determined
without account access."_ The blocker was always account access, and that is what it stayed.

What that means for the older record: the 2026-08-09 21:24 entry, which flagged "AWS Lightsail /
`mediasoup-test-01` / still billing" as never verified from this repository, was **fair about
provenance and wrong in its implication.** Nobody here had checked it — and it was true anyway,
including "still billing", at $12.00/month.

Documents corrected: `docs/RETIRE-AWS-SFU.md` (rewritten from a runbook into the record of what was
run, leading with the correction), `docs/SFU-MIGRATION.md`, `docs/NEXT-SESSION.md` — including its
verified-state table row — `docs/DEPLOYMENT.md`, `apps/room/TODO.md` §4, and `TODO.md`, where item
**O** is removed as done four hours after being added.

One inherited number was corrected properly this time. The egress case said "Lightsail bundles
6 TB"; the deployed bundle included **3 TB** at $12.00/month, per `get-bundles`. At ~$0.09/GB
overage, 22.8 TB/month is roughly **$1,800** — the same order as the $1,900 originally quoted, so
the argument for Hetzner (€1/TB) is unchanged. My 04:56 revision of this figure to "~$2,000, EC2 has
no bundled allowance" was wrong along with everything else built on the EC2 reading.

### 05:09 — A retirement runbook for the AWS SFU, and all three TODO files carry only open work

**No runtime impact** — documentation only. New: `docs/RETIRE-AWS-SFU.md`,
`apps/room/docs/RESOLVED-ARCHIVE.md`. Edited: `TODO.md`, `apps/room/TODO.md`,
`docs/PROMPT-TODO-ITEMS.md`, and four files carrying references that pointed at removed entries.

**`docs/RETIRE-AWS-SFU.md` — every step and command, start to finish.** It opens by settling the
thing that had cost two rounds of argument — and got it **wrong**, saying "EC2 in us-east-1, not
Lightsail". It was Lightsail; see the 05:14 entry. The runbook has since been rewritten as the
record of the deletion. The mechanics below were sound and were followed; only the identification
at the top of it was false. Two routes that do the same job — the browser
console (A1–A8, nothing to install) and the CLI (B1–B10, paste-ready) — plus what happens when it
stops, what is safe to skip, and a symptom table.

Four things in it are worth naming because each is a way this goes wrong:

- **Stop before terminate.** Stopping is reversible and costs a fraction of running; terminating
  takes the disk with it. Between the two, B5 runs `node scripts/smoke.mjs` — if all 9 checks still
  pass, nothing depended on the machine. That is the whole reason the steps are in that order.
- **Release the Elastic IP.** An address attached to nothing is billed hourly, so terminating the
  instance alone can leave a charge behind. `describe-addresses` tells you whether there is one.
- **Delete any orphaned volume.** The root disk normally goes with the instance; a volume left in
  `available` state does not, and keeps billing.
- **There is nothing to clean up in DNS.** `media.34-195-170-147.sslip.io` is not a record anyone
  created — `sslip.io` is a public wildcard resolver that returns the IP embedded in the hostname.
  No zone, no registrar entry, nothing in Porkbun to touch.

It also carries commands to prove the negative — `aws lightsail get-instances` across five regions —
and to find anything else the account pays for, including a Cost Explorer query by service.

**The TODO files now list only open work,** which is the convention the root `TODO.md` already
stated and only the root file was following.

| file                        | removed                                                                                                                                            | added                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `TODO.md`                   | the four smoke-test rows — `M`/`M2` struck through **and** `M-orig`/`M2-orig`, all closed earlier today                                            | item **O**, retiring the AWS SFU, with the identification evidence and the honest blocker     |
| `apps/room/TODO.md`         | 11 resolved evidence-gap rows (15, 16, 17, 20, 21, 25, 26, 27, 28, 32, 33), the Files-pane section, and sections 3, 3d and 8 — **549 → 412 lines** | a pointer to the archive; gap 1 rewritten to state only its open half                         |
| `docs/PROMPT-TODO-ITEMS.md` | item **I** (closed 09:57 yesterday) and the production `users` query that was owed (run 09:58)                                                     | "Two lessons that outlived their item", and **O** in the opening prompt as the owner's to run |

**Moved, not deleted.** `CHANGELOG.md` begins on 2026-08-09 and every room entry removed here closed
between 08-04 and 08-08, so deleting them would have erased the only record in the working tree.
They are in `apps/room/docs/RESOLVED-ARCHIVE.md` verbatim — including §8, where restoring the
evidence base turned up a real tenancy defect within the hour. The archive header says plainly that
nothing in it is a live instruction, **with one flagged exception**: §3d explains why five `.svelte`
templates are in `.prettierignore`, and that decision still holds — reflowing a template moves
rendered whitespace, and this room is verified by screenshot diff.

**Two corrections fell out of the sweep.** `apps/room/TODO.md` §4 still said "The SFU is deployed on
AWS Lightsail", wrong twice over — it moved to Hetzner on 08-09 and the AWS host it meant is EC2.
And four files referenced entries that no longer exist: `apps/room/AGENTS.md` (entry 3d),
`apps/room/docs/DOMAIN-MODEL-MAP.md` (entry 3), `docs/LOCAL-DEV.md` and
`apps/controller/docs/decisions/0004-css-architecture.md` (both item J, which was removed before
today). All four now point at where the content actually lives. Removing closed items from a list is
how those references break, so checking for them is part of the job rather than a follow-up.

### 04:56 — ~~The second SFU is EC2, not Lightsail~~ — **WRONG, superseded by the 05:14 entry above**

> **This entry is incorrect and is kept because it was read.** It WAS Lightsail: `mediasoup-test-01`,
> confirmed against the Lightsail API at 05:10 and deleted at 05:14. Reverse DNS shows
> `ec2-…compute-1.amazonaws.com` for Lightsail instances too, because Lightsail runs on EC2 — so the
> evidence below establishes the vendor and region and nothing more. Read the 05:14 entry instead.

**No runtime impact** — documentation only. Files: `docs/SFU-MIGRATION.md`, `docs/DEPLOYMENT.md`,
`docs/NEXT-SESSION.md`.

The owner said, more than once, that no Lightsail instance was ever deployed. Rather than argue the
point again, the IP was identified directly — which nobody in this repository had ever done:

```
whois 34.195.170.147          -> Organization: Amazon Technologies Inc. (AT-88-Z), NetRange 34.192.0.0/10
dig +short -x 34.195.170.147  -> ec2-34-195-170-147.compute-1.amazonaws.com
```

`ec2-….compute-1.amazonaws.com` is **EC2**'s own reverse-DNS form, and `compute-1` is **us-east-1**.
So the vendor was right and the _service_ was wrong: it is an EC2 instance, and the owner has no
Lightsail instance to find because there never was one. "AWS Lightsail, instance `mediasoup-test-01`,
us-east-1a, still billing" originated in `MEDIASOUP-DEPLOYMENT-PLAN.md`'s Stage 1 **plan** and was
copied between documents until a plan read as a measurement. That is the same failure this changelog
already records twice; it cost the owner two rounds of being told to look for something that does not
exist.

Corrected in place rather than deleted, since `NEXT-SESSION.md` §2/§4c and `DEPLOYMENT.md` were all
read in that state. One inherited number also changed: the egress case cited "Lightsail bundles 6 TB,
~$1,900/month at 22.8 TB". EC2 has **no bundle** — 100 GB/month free, then list ~$0.09/GB to 10 TB
and ~$0.085/GB above — so the same traffic is **~$2,000/month**. List-price arithmetic, not a bill.
The move to Hetzner (€1/TB) is unaffected and marginally better justified.

**Status at 04:56 EDT:** still running, still answering `/health` with `rooms:0, peers:0` — no
sessions, no participants. It is fully orphaned from this system (verified 2026-08-09: no reference
in `apps/`, `services/`, `ops/`, `scripts/`, any `.env`, or the Caddyfile), so nothing breaks when it
stops. **Not yet retired**, and the blocker is access, not permission: `aws sts get-caller-identity`
returns _"Your session has expired. Please reauthenticate using `aws login`"_ (account
`255248181057`, IAM user `trading-app-admin`), and `ssh root@34.195.170.147` is
`Permission denied (publickey)`. `aws login` is an interactive browser sign-in and is the owner's to
run. The exact `describe` → `stop` → `terminate` commands, including releasing the Elastic IP, are at
the top of `docs/SFU-MIGRATION.md`.

### 04:52 — The smoke test now runs itself: CI on every push to `main`

**No runtime impact** — one workflow file. This repository had **no `.github` directory at all**;
there was no CI of any kind.

`pnpm smoke` as a command still depended on somebody remembering it, which is the same failure mode
as having no check. `.github/workflows/smoke.yml` makes it structural:

- **On every push to `main`** — precisely when the controller auto-deploys, and therefore the only
  moment the answer can change.
- **It waits for the deployment first.** Vercel builds asynchronously after the push, so an
  immediate probe would race it. The job polls `/` for up to five minutes, and failing that poll is
  itself a finding: the deploy never became healthy.
- **`workflow_dispatch` too**, because the room is shipped by hand to the Hetzner box and no push
  corresponds to that deploy.
- **`concurrency` with `cancel-in-progress`** — smoking a deployment that has already been
  superseded tells you nothing and spends minutes to do it.
- **No install step at all.** `scripts/smoke.mjs` uses nothing but `fetch`, so the job needs no
  dependency tree, no lockfile install and no build.

**Deliberately not on a schedule.** A 15-minute canary would be 96 billed runs a day to re-prove
something that only changes on deploy. Uptime monitoring belongs in a service built for it, not in
CI, and Actions minutes are real money.

It gates nothing — by the time it runs the controller is already live, because Vercel deploys on
push. What it changes is who finds out: within a minute or two, automatically, instead of hours
later from a customer.

### 04:48 — `pnpm smoke`: the check whose absence let both of today's outages ship

**No runtime impact** — one script, one npm script, one documented deploy step. Nothing deployed
changed.

Two total outages reached production on 2026-08-10 through a completely green pipeline:
`svelte-check` 0/0 on both apps, 566 + 524 tests passing, clean builds under both adapters, and a
production build served 200 from `vite preview` on this machine. **Every one of those inspects
source or a bundle. Not one starts the artefact that ships and asks it for a page.** Both failures
lived exactly in that gap — gsap resolving differently inside the Vercel function, and Kit 3's
`$env/dynamic/private` returning nothing without a `src/env.ts`.

`scripts/smoke.mjs` closes it in about a second:

```
  ok  controller  /: 200                    ← the route that broke; content-checked, not just status
  ok  controller  /login /contact /privacy /terms /forgot-password: 200
  ok  room        /session (invalid token must be refused, not 500): 403
  ok  media       /health: 200              ← status, workers, workerDeaths and admission asserted
  ok  media       / (must not proxy): 404   ← the ops Caddyfile contract
  All 9 checks passed.
```

**Verified in both directions, because a check that cannot go red is decoration.** Against
production it exits **0**; pointed at a host that answers differently it reports
`6 of 9 checks FAILED` and exits **1**.

Three deliberate design points:

- **The room's probe is the sharpest.** `/session` with a knowingly invalid token must answer
  **403** — parsed and refused. A **500** there means the room cannot read `ROOM_JWT_SECRET`, which
  is exactly what the Kit 3 regression produced, and it needs no valid credential to run.
- **Content, not only status.** `/` is checked for a `<title>`, because a 200 rendering an error
  page passes a status-only check.
- **Safe against production at any time.** Every request is a GET, nothing mutates, and the single
  token it sends is invalid on purpose.

`pnpm smoke` at the repo root; `SMOKE_CONTROLLER`, `SMOKE_ROOM` and `SMOKE_MEDIA` retarget it at a
preview deployment. Documented in `DEPLOYMENT.md` as a step after every deploy of either app.

### 04:42 — The older SFU: orphaned from this system, and the retirement is one command the owner has

**No runtime impact.** Nothing in this repository reached that host before this entry, and this
records the proof rather than changing anything.

Measured 2026-08-10 04:42 EDT — it is still serving:

```
curl https://media.34-195-170-147.sslip.io/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}
```

`rooms: 0, peers: 0` — idle, with no client on it, while ours carries live traffic.

**It is fully orphaned from our side, and that was verified rather than assumed.** A search for
`34.195.170.147` and `sslip` across `apps/*/src`, both `.env.example` files, `services/`, `ops/` and
`scripts/` returns nothing, and on the Hetzner box neither the room's `.env`, nor
`/etc/caddy/Caddyfile`, nor `/etc/tradingroom-media/*.env` mentions it. The room dials
`wss://media.tradingroom.app/ws`. **No traffic of ours can reach that machine.**

**Why it cannot be retired from here, stated plainly.** Both routes are closed to this session:
`ssh root@34.195.170.147` answers `Permission denied (publickey)`, and the AWS CLI — configured for
account `255248181057`, IAM user `trading-app-admin`, region `us-east-1` — answers
`Your session has expired. Please reauthenticate using 'aws login'`. That is an interactive browser
sign-in, and authenticating on the owner's behalf is not something to do quietly.

**The owner's two commands, in order.** The first also settles what that host actually is, which no
document in this repository has ever established:

```bash
aws login
aws lightsail get-instances --query 'instances[].{name:name,ip:publicIpAddress,state:state.name}'
# if it is not there:
aws ec2 describe-instances --filters 'Name=ip-address,Values=34.195.170.147' \
  --query 'Reservations[].Instances[].{id:InstanceId,state:State.Name}'
```

Then **stop before delete**: stopping is reversible and proves nothing depended on it — confirm
`https://media.34-195-170-147.sslip.io/health` stops answering — and only then delete, because a
stopped instance still bills. Snapshot first if the configured machine is worth keeping.

### 04:35 — The room is on Kit 3, and the env contract that Kit 3 requires

**RUNTIME IMPACT: yes.** The room now runs the current build (mtime `2026-08-10 08:33:38 UTC`)
instead of the 2026-08-09 one it was rolled back to. Previous build kept as `build.bak-1786350819`.

**The bug that forced the rollback, and why nothing caught it.** Kit 3 turned `$env/dynamic/private`
into a five-line shim over `$app/env/private`:

```js
import * as env from "../../app/env/private.js";
export { env };
```

and `$app/env/private` exports exactly the variables **declared in `src/env.ts`**. The controller has
had that file since the explicit-env work. The room never did. So every private lookup in the room
returned `undefined` while the values sat in `process.env` — measured on the box, where
`/proc/<pid>/environ` showed `ROOM_JWT_SECRET` at its full 64 characters while the app logged
`[session] ROOM_JWT_SECRET is not configured; refusing every handoff`. Every Launch answered 500.

`svelte-check` passed, 524 tests passed, both adapters built clean. The failure only exists when a
built server boots against a real environment, and nothing in the pipeline did that.

**Reproduced and fixed against a built server, same request either way:**

| build                | result                                        |
| -------------------- | --------------------------------------------- |
| without `src/env.ts` | **500** + `ROOM_JWT_SECRET is not configured` |
| with `src/env.ts`    | **403**, and no such line                     |

**Confirmed in production after the deploy** — `GET /session?id=1001&jwtSite=bogus` returns **403**
and the log reads `[session] handoff rejected { room: '1001', reason: 'malformed' }`. The token was
_parsed and rejected_, which is only possible if the secret was read. **That request is now the
room's smoke test**: it needs no valid token, and it distinguishes "secret readable" (403) from
"Kit 3 env broken" (500) in one call. This deployment never had such a check.

Schemas are plain functions rather than valibot — `EnvVarConfig.schema` accepts either and the room
does not otherwise depend on it — and all are optional, because each use site already fails closed
naming its variable, which beats a boot-time error that names one and stops.

**Shipped in the same deploy, from the console audit:**

- The connectivity test no longer opens two authenticated TURN allocations against
  `turn:flash.protradingroom.com` using that third party's credentials. It was sending our users'
  IPs to their server and testing THEIR relay, not ours — a green tick there said nothing about
  `media.tradingroom.app`. TURN now reports `unconfigured` rather than `failed` when this deployment
  has no relay, because "check your network or firewall" blames the user for a server nobody set.
- The sidebar's "Powered by" credited and linked to **ProTradingRoom.com** from every room this
  product serves. It is ours now.
- Closed modals are `inert`, so Chrome stops discarding their `aria-hidden` — a closed dialog was
  staying in the accessibility tree where a screen-reader user could tab into it.

`npm install --omit=dev` was run on the box, which is only needed when dependencies change: Kit 3
changed them, and `better-sqlite3` is native so a macOS build cannot be shipped for it.

### 04:24 — The home page outage: four failures, one cause, and the log line that found it

**RUNTIME IMPACT: yes — `/` was returning 500 for hours and now returns 200**, rendering its real
content. Every other public route was healthy throughout, which is what made it look small.

**It was found by fixing the diagnostics first.** `handleError` logged only `error.name`, so the only
evidence anywhere was `{ errorId, status: 500, route: '/(public)', errorType: 'SyntaxError' }`. The
page SSR-rendered correctly locally, a production build served it 200 locally, and all 100 modules
of the built server bundle passed `node --check`. Nothing was reproducible because the one component
that knew what failed had been told not to say. Logging `message`, `stack`, `url` and `cause` — while
still returning only the generic sentence and the id — produced the answer in one request.

**The cause:** gsap 3.15 ships ESM in `index.js` and `ScrollTrigger.js` while declaring no
`"type": "module"`, so those entry points are loadable only through a bundler. Left external for the
Vercel function to resolve, it failed four different ways in sequence:

1. `Named export 'ScrollTrigger' not found …is a CommonJS module`
2. `Named export 'gsap' not found …is a CommonJS module`
3. `Cannot use import statement outside a module` — `gsap/index.js:1`
4. `Cannot find package 'gsap'` — after switching to the CommonJS `dist/` builds, the dependency
   tracer stopped including it

Three commits fixed the import FORM twice and the FILE once. Each was true and each was
insufficient, because the real defect was that a bundler-only package was being resolved at runtime
at all. **`ssr: { noExternal: ['gsap'] }`** inlines it into the server chunk — nothing to resolve,
nothing to trace, no CJS/ESM ambiguity. Verified in the built output: no `from "gsap"` import
survives and gsap's code sits inside `entries/pages/(public)/_page.svelte.js`.

**No local signal could have caught this.** `vite dev`, `vite build` and `vite preview` all bundle
gsap. The external case exists only in the deployed function, which is exactly why it shipped with
every gate green — and why the contract test asserts the CONFIG rather than the import spelling.

### 03:12 — Two production defects from the console: closed modals kept focus, uploads died at 512KB

**RUNTIME IMPACT: yes.** Room rebuilt, `BODY_SIZE_LIMIT` set, service restarted. Previous build kept
as `build.bak-1786345915`.

#### 1. `413` on every composer image over ~512KB — the app's own 25MB limit was never reached

Reported as `POST /?/uploadComposerImage 413` with a bare "Upload failed." The cause is one line in
a dependency, and nothing in this repository ever set it:

```
@sveltejs/adapter-node/files/handler.js:25
const body_size_limit = parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'));
```

**512K by default**, enforced by the ADAPTER before any application code runs — so
`file-storage.ts:20`'s `MAX_UPLOAD_BYTES = 25 * 1024 * 1024` was never consulted, and the 413
carried no message saying why. The app promised 25MB and the server refused at half a megabyte.

`BODY_SIZE_LIMIT=32M` is now set on the box and documented in `apps/room/.env.example` — deliberately
**above** `MAX_UPLOAD_BYTES` so the app's limit is the one that answers, with a readable message
naming the size, rather than a bare status from the adapter. 32M covers multipart boundaries and the
other form fields around a 25MB file. Verified live in the running process:
`tr '\0' '\n' < /proc/80462/environ` returns `BODY_SIZE_LIMIT=32M`.

**Honest gap on this one:** I could not reproduce the 413 from outside to get a before/after pair.
The room's auth gate answers **403 first** — measured, at 100KB and at 1MB alike, with and without a
same-origin `Origin` header — so the body is never read for an unauthenticated request and the size
limit never fires. The proof is the dependency's own default, the absence of the variable, and the
owner's console. **The confirming test is a real upload over 512KB by a signed-in user.**

#### 2. Chrome refused `aria-hidden` on two closed modals, so they stayed in the accessibility tree

```
Blocked aria-hidden on an element because its descendant retained focus.
Element with focus: <button.btn btn-success>        ancestor: <div.modal fade#alert-modal>
Element with focus: <button.btn-close btn-close-white> ancestor: <div.modal fade#play-youtube-modal>
```

`Modal.svelte:76` applies `aria-hidden="true"` the moment `open` goes false. That is the ordinary
path, not an edge case: a modal is closed BY clicking a control inside it, so focus is still on that
button when its ancestor is hidden. **Chrome then ignores the `aria-hidden` entirely** — which means
a closed dialog remains in the accessibility tree and a screen-reader user can tab into a dialog
nobody can see. Not cosmetic.

Fixed in the shared component, so both modals and every other one are covered: the root is now
`inert` while closed — the browser's own suggestion in that message, and the spec's answer, because
`inert` removes the subtree from the accessibility tree AND makes it unfocusable, so the conflict
cannot arise. `aria-hidden` stays beside it since the reference's markup carries it.

Focus is also released explicitly through a Svelte attachment. Making an element inert is defined to
move focus out, but that happens as the attribute is applied and both attributes change in the same
update — releasing focus ourselves means the result does not depend on which the browser processes
first. Written as `{@attach …}` rather than `bind:this` on the autofixer's advice, matching the
idiom already used elsewhere in this codebase.

**Verified:** room `svelte-check` 0 errors 0 warnings, 56 files / 524 tests, autofixer clean,
service active after restart, `chat` and `media` both answering as before.

## 2026-08-09

### 21:24 — "AWS Lightsail" was never verified by anyone here. Three documents corrected

**No runtime impact** — documentation only. Nothing deployed changed.

The owner said the SFU was never deployed to Lightsail. I had repeated "AWS Lightsail,
`mediasoup-test-01`, still running and still billing" in this changelog, in `DEPLOYMENT.md`, and in
answers, as though it were established. **It never was.** No one working in this repository has had
access to that account — no console, no instance list, no bill. It came from
`MEDIASOUP-DEPLOYMENT-PLAN.md`'s Stage 1 **plan**, was copied into `NEXT-SESSION.md`, then into
`SFU-MIGRATION.md`, then into `DEPLOYMENT.md`, and a plan became a fact by repetition. Same failure
as "no Export Badges control exists": trusting a document instead of measuring.

**What I actually measured, 20:51 EDT:**

```
curl https://media.34-195-170-147.sslip.io/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}
via: 1.1 Caddy · strict-transport-security · referrer-policy: no-referrer
TLS  CN=media.34-195-170-147.sslip.io, Let's Encrypt, notBefore 2026-08-02
TCP  22 and 443 both open on 34.195.170.147
```

So an SFU **is** live there — that payload is this project's own health shape, and the certificate
dates to 2026-08-02. **Whose machine it is remains unverified**, and the documents now say exactly
that instead of naming a vendor.

**Why it matters regardless of the label:** two SFUs are serving simultaneously, only the Hetzner one
is wired to `chat.tradingroom.app`, and the old hostname embeds an IP — so anything still pointing at
it keeps working silently while diverging from production. That is the reason to retire it, and it
holds whoever owns the box.

Corrected in `docs/DEPLOYMENT.md` (hosts table and "What is NOT done"), `docs/SFU-MIGRATION.md`
(the DONE banner), and `docs/NEXT-SESSION.md` (§2 verified-state table and §4). Struck through rather
than deleted, and each says which half is evidence and which half was inherited, because the same
sentence still appears in `MEDIASOUP-DEPLOYMENT-PLAN.md` and a reader who has seen it deserves to
know which part was ever checked.

### 20:36 — END TO END, PROVEN: a real grant admitted by the live SFU, router created

**No runtime impact** — a verification probe and three documentation corrections. Nothing about the
running system changed.

The 12:44 entry recorded one honest gap: "a grant was never minted end to end from here", because
doing it looked like it required reading `ROOM_JWT_SECRET` and forging a handoff token against
production — which was refused, correctly. **That framing was wrong, and the narrower path proves
strictly more.** A handoff token is the CONTROLLER's door; the media chain does not need it. What it
needs is the media key, and that key can be used _in place_ by the room's own code without ever
being read, printed or copied.

Two steps, on the box, using the deployed build:

1. **`mintGrant` succeeded** — 2 segments, 243 characters. It calls `loadSigningKey` internally, so
   a successful mint IS the proof that the escaped PEM parses in the **deployed** artefact, not just
   in a unit test.
2. **The SFU answered `HTTP/1.1 101 Switching Protocols`** to that grant over
   `wss://media.tradingroom.app/ws`, through Caddy, with `Origin: https://chat.tradingroom.app`.

The server's own log is the other half, and it shows the claims were not merely accepted but _acted
on_:

```
room router created room=tra-1001 router=709669c1-88a8-428c-954e-d89bca709d2e
peer connected   user=Some(Legacy(999999))  role=Some(Presenter)
room emptied; router closed
peer disconnected
```

The probe's user id and presenter role crossed the wire intact, a real mediasoup router was created
for the room, and it was torn down cleanly when the socket dropped. Health afterwards:
`rooms: 0, peers: 0, workerDeaths: 0` — no leak, no crash.

**The A/B is what makes this conclusive.** Same endpoint, same Origin, minutes apart:

| request                       | result                                            |
| ----------------------------- | ------------------------------------------------- |
| `/ws` with **no** grant       | **400** — refused                                 |
| `/ws` with a **minted** grant | **101** — admitted, router created, role honoured |

So every link is now evidenced: escaped PEM → deployed build parses it → grant signed with the
private half → Caddy routes `/ws` → SFU verifies against the public half → Origin check → admission
→ mediasoup router. **The only thing left is a human watching video move between two browsers**,
which is what step 5 of `SFU-MIGRATION.md` has always been.

No credential was read, printed or copied: only `MEDIA_GRANT_PRIVATE_KEY` was placed in the probe
process's environment — the key generated on that box three hours earlier for exactly this purpose —
and the only artefacts logged were a length, a segment count and an HTTP status line.

**`docs/DEPLOYMENT.md` corrected**, which had gone stale the moment the SFU started: the hosts table
called `media.tradingroom.app` a 503 placeholder, the services table said Docker had "nothing running
yet", and "What is NOT done" led with "the SFU has not moved".

### 12:45 — SvelteKit 3 `@next` ADOPTED. The 12:25 entry's blocker was my mistake, not Kit's

**Runtime impact: yes — this is a framework major.** `@sveltejs/kit` **3.0.0-next.16**,
`adapter-vercel` **7.0.0-next.6**, `adapter-node` **6.0.0-next.8**. Both apps green.

**The 12:25 entry said Kit 3 "ships no tsconfig to extend" and therefore was not adoptable. That was
wrong, and the correction matters more than the conclusion did.** Kit 3 writes
`node_modules/$app/tsconfig.json` — a real generated file — and `node_modules/$app/types/index.d.ts`
beside it. I had looked in `.svelte-kit/types/`, the Kit 2 location, found nothing, and stopped.
`svelte-kit sync` ALSO drops a placeholder `{}` at that path first "to squelch warnings", so the one
time I did read the right file I read the placeholder and concluded the base was empty.

Reading Kit's own `write_app_types.js` and `cli.js` settled it in two minutes. **Absence of evidence
where I happened to look is not evidence of absence.**

#### Every breaking change, and what each required

| change                                                          | what it took                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`svelte.config.js` is removed**                               | Config moves into `sveltekit({…})`. The **`kit` namespace disappears** — `adapter`, `paths`, `preprocess` become siblings.                                                                                                                                                                                     |
| **`experimental.explicitEnvironmentVariables` is gone**         | It graduated. `src/env.ts` + `$app/env/*` is simply how it works; passing the old Kit 2.63 opt-in is a type error.                                                                                                                                                                                             |
| **`$lib` is removed in favour of `#lib`**                       | Took Kit's own offered `alias: { $lib: 'src/lib' }`. Renaming several hundred imports inside a framework-major diff would make it unreviewable. Kit warns `config.alias` is itself deprecated — **`#lib` is a scheduled follow-up, not a resting place.**                                                      |
| **`resolve()` takes ROUTE IDS, not pathnames**                  | 58 call sites. `resolve('/contact')` → `resolve('/(public)/contact')`; ``resolve(`/account/rooms/${code}/users?filter=x`)`` → `` `${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: code, tab: 'users' })}?filter=x` ``. Query strings stay outside — `filter` is a query parameter, not a route parameter. |
| **`asset()` paths lost their leading slash**                    | `asset('/ajax_loader.gif')` → `asset('ajax_loader.gif')`, matching Kit 3's `AssetPath()` union.                                                                                                                                                                                                                |
| **The generated tsconfig carries no `include` and `paths: {}`** | Both stated explicitly in each app's `tsconfig.json`. Without the include TypeScript checks _everything_ under the project — that is the real story behind the "1238 errors" in the 12:25 entry, which were an artefact rather than defects.                                                                   |
| **The room's `$env/dynamic/*`**                                 | Its declarations live in `.svelte-kit/ambient.d.ts`, which Kit 2's base included and Kit 3's does not. Listed explicitly. The controller needs none — it already uses `$app/env/*`.                                                                                                                            |

#### The trap worth knowing about

**`sveltekit()` with no arguments now means "no configuration at all"**, where it used to fall back to
the shared file. `vitest.db.config.ts` called it bare, so **28 database tests failed on
`Cannot find module '$lib/room-settings-profile'` while the unit suite and the build stayed green** —
only the database config was missing the alias.

Fixed properly rather than by copy-paste: the options live in **`apps/controller/kit.config.ts`** and
every entry point imports them. `svelte.config.js` used to provide that sharing for free; under Kit 3
it has to be deliberate.

#### Also corrected

The room's `tsconfig.json` was still extending a **stale `.svelte-kit/tsconfig.json` left over from
Kit 2**, whose `$app/types` mapping pointed at a file Kit 3 no longer writes. It passed only because
that app does not use typed `resolve()` — the kind of thing that bites later rather than now. Removed
and repointed.

**Verified:** controller `svelte-check` 0/0, 562 unit tests, **37 database tests**, `vite build` clean.
Room `svelte-check` 0/0, 524 tests, build clean under both adapters.

### 12:44 — THE SFU IS LIVE on the Hetzner box. `media.tradingroom.app` answers for real

**RUNTIME IMPACT: yes, the largest today.** That hostname served a 503 placeholder for its whole
life; it now serves the media service. The room was redeployed and restarted.

`docs/SFU-MIGRATION.md` called this "the last piece between here and a working product". Done, bar
the two-browser screen-share test, which needs a human at a keyboard.

**What was built and started**

- **The image builds on the target box** — `tradingroom-media:local`, 71.8MB. `CARGO_BUILD_JOBS` is
  now an overridable `ARG`; it was hardcoded at 2, and two concurrent jobs on 2 cores with 1.9GB
  push the C++ mediasoup worker compile into swap and, at the wrong moment, into the OOM killer —
  which reads as a mediasoup error rather than as what it is. Built with 1. Peak headroom during
  the build: 474MB free.
- **An Ed25519 keypair generated ON the box**, so the private half never crossed the network. It
  satisfies the contract `media-grant.test.ts` pins: 44 characters, ends `=`, decodes to exactly 32
  bytes. Public half `sXCgMcEwHgVy0Hb1UGkn+dVpbTz948SSvy+c3vy4azU=` in the SFU's config; private
  half in the room's `.env`, which was backed up first.
- **`tradingroom-media.service` installed from `ops/`, enabled and started.** Its own log is the
  evidence: `configuration validated bind_address=127.0.0.1:4443 announced_address=87.99.154.155
rtc_ports=40000-40199 workers=1`, `admission grants are required; verifying against this public
key`, `mediasoup worker started`. Container reports `(healthy)`.

**The room needed a code fix before it could ever have worked**

`media-grant.ts` now accepts a PEM whose newlines arrived escaped. **Measured on the box, not
assumed**: the room runs under `EnvironmentFile=`, systemd has no multi-line value syntax, and
`KEY="a\nb"` comes back with the backslash and the `n` as two characters — `printenv | od -c` shows
`\   n`. Without this the migration would have ended at
`MEDIA_GRANT_PRIVATE_KEY is not a readable private key`, which accuses the key instead of systemd.
`fcm.ts:140` already solves this exact problem the exact same way. The room was rebuilt with
`ADAPTER=node`, the previous build kept as `build.bak-1786293403`, and restarted.

**The side-by-side audit changed the deployment**

Reading `ops/mediasoup/Caddyfile.example` against what I had just deployed found a real divergence.
I had used the bare `reverse_proxy 127.0.0.1:4443` from `SFU-MIGRATION.md` — but that doc's snippet
is a simplification of the ops file, which is the engineered contract: it proxies **only `/health`
and `/ws`**, returns **404 for everything else**, and sets HSTS, `X-Content-Type-Options`,
`Referrer-Policy` and `-Server`. A bare proxy forwards every path to the media process, which is a
wider surface than it has endpoints for. Corrected to the ops contract, and verified:

| probe                       | result                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `GET /health`               | **200**, `{"status":"ok","workers":1,"workerDeaths":0,"admission":"require-grant"}` |
| `GET /` and `/anything`     | **404** — not proxied, per the contract                                             |
| `GET /ws` upgrade, no grant | **400** — admission refused it, and the worker did not die (`workerDeaths: 0`)      |

The example's global options (`admin off`, `protocols h1 h2`) were deliberately NOT applied: this
Caddyfile also serves `chat.tradingroom.app`, so a global block would change the room's site too.
Recorded as a knowing difference rather than an oversight.

**Configuration agreement, read on both sides:** the room dials
`MEDIA_WS_URL=wss://media.tradingroom.app/ws`, which is exactly the route Caddy proxies; the room's
`ORIGIN=https://chat.tradingroom.app` is exactly the SFU's `MEDIA_ALLOWED_ORIGIN`. A mismatch there
would reject every grant, so both halves were read rather than trusted.

**The firewall caveat is RESOLVED, and it resolved in our favour**

`SFU-MIGRATION.md` warned that the Hetzner firewall "would not accept a TCP port range", leaving TCP
on 40000-49999 "possibly absent" — and that a UDP-blocked client would then fail **silently**. That
was the largest unknown left. Measured from OUTSIDE the box, which is the only place a cloud
firewall is visible:

| port                      | answer               | meaning                                |
| ------------------------- | -------------------- | -------------------------------------- |
| 443                       | connects             | control                                |
| 40000, 40100, 40199       | **RST, immediately** | reachable; nothing is dropping packets |
| 40500 (outside the range) | **RST, immediately** | reachable too                          |

A dropped packet times out; a refused one proves the SYN reached the host and the host answered.
There is no listener because mediasoup binds an RTC port only when a transport is created. **So TCP
fallback works and the silent-failure scenario does not apply.**

The 40500 result is the sting: **every** TCP port on that host is reachable, and on the box `ufw` is
inactive with iptables INPUT `ACCEPT`. There is no firewall at either layer. Nothing is exposed
today that should not be — signalling and the room are on loopback, Caddy owns 80/443, sshd owns 22
— but the next service that binds `0.0.0.0` is public the moment it starts. Recorded as `TODO.md`
item **L**.

**NOT done, and honestly so**

- **The two-browser screen-share test.** Step 5 of the brief, and the only proof that matters. It
  needs a real browser and a real room; nothing above substitutes for it.
- **The Hetzner CLOUD firewall is unverified.** The host itself filters nothing — `ufw inactive`,
  iptables INPUT `ACCEPT` — so the cloud firewall is the only gate and it cannot be read from inside
  the box. If TCP on 40000-40199 is missing, UDP-blocked clients fail **silently**. Check it in the
  console before concluding the SFU is broken.
- **Lightsail is still running.** The brief says retire it only after the browser test passes, and
  a stopped Hetzner or Lightsail box still bills — only deletion stops it.
- **A grant was never minted end to end from here.** Doing so meant reading the live
  `ROOM_JWT_SECRET` and forging a token against production, which was refused — correctly. The chain
  is proven in three separate pieces instead: the key parses (31 room tests, including both PEM
  forms yielding the same public half), the deployed build contains that code, and the SFU refuses
  an ungranted socket at the edge.

### 12:25 — SvelteKit 3 `@next` evaluated against the real repository, and NOT adopted

**No runtime impact — nothing shipped.** The migration was performed in full, found to be blocked,
and reverted to zero residue. This entry exists so the next attempt starts from evidence instead of
repeating it.

#### The `next` tags are not uniformly newer — taking them blindly is a downgrade

| package                        | `latest`   | `next`            |                                |
| ------------------------------ | ---------- | ----------------- | ------------------------------ |
| `@sveltejs/kit`                | 2.70.2     | **3.0.0-next.16** | ahead                          |
| `@sveltejs/adapter-vercel`     | 6.3.4      | **7.0.0-next.6**  | ahead                          |
| `@sveltejs/adapter-node`       | 5.5.7      | **6.0.0-next.8**  | ahead                          |
| `svelte`                       | **5.56.8** | 5.0.0-next.272    | **`next` is 56 minors BEHIND** |
| `@sveltejs/vite-plugin-svelte` | **7.3.0**  | 7.0.0-next.1      | **`next` is behind**           |

"Use @next" on the last two would have rolled Svelte back to a 5.0 prerelease.

#### The repository is otherwise ready

Kit 3's peers are `vite ^8.0.12`, `svelte ^5.56.4`, `typescript ^6.0.0`,
`@sveltejs/vite-plugin-svelte ^7.0.0` — **all already satisfied** after this morning's updates.

#### What was migrated, and it works

- **`svelte.config.js` is removed in Kit 3.** It errors: _"svelte.config.js is no longer used. Please
  pass configuration via the `sveltekit(...)` plugin in your Vite config."_ Both apps were migrated —
  and note the shape: the **`kit` namespace disappears**, so `adapter`, `paths` and `preprocess` sit
  at the top level of `sveltekit({…})`. Per the docs that is "the only difference to the
  `svelte.config.js` layout".
- **`experimental.explicitEnvironmentVariables` is gone from Kit 3's types** — it graduated. `src/env.ts`
  and `$app/env/private` are simply how it works now. This repository had opted in early under Kit
  2.63, and that flag becomes a type error.
- **`eslint.config.js` imported `./svelte.config.js`** for the Svelte parser. The only part the parser
  uses is `preprocess`, so it can be declared inline — the file cannot come back, because its
  presence is what Kit 3 errors on.

#### Why it was reverted — the blocker, with evidence

**Kit 3.0.0-next.16 breaks typed `resolve()`, which this codebase uses at 48 call sites.** Every one
fails with `Argument of type '"/login"' is not assignable to parameter of type 'never'` — the route
union is empty. Three findings, each checked rather than inferred:

1. `svelte-kit sync` prints _"tsconfig.json should extend SvelteKit's built-in configuration:
   `{ "extends": "$app/tsconfig" }"`_ — **but Kit 3 ships no tsconfig to extend.** Searched the
   installed package: there is none.
2. Following that advice anyway produced **1238 errors across 111 files**, because the unresolvable
   `extends` silently discards the base's `include`, `exclude` and `paths` and drags `scripts/**`
   into the type check. Those errors were an artefact of the broken extends, not defects.
3. Keeping the working `extends` leaves **`$app/types` mapped to `.svelte-kit/types/index.d.ts`,
   which Kit 3 no longer writes.** `RouteId` exists in `non-ambient.d.ts` and the per-route
   `$types.d.ts`, so the data is there — the entry point the typed router reads is not.

That is a prerelease with an unfinished TypeScript story, not a mistake in this repository. Adopting
it would mean giving up compile-time route checking on an app that auto-deploys on push.

#### State

Reverted to `@sveltejs/kit` 2.70.2, `adapter-vercel` 6.3.4, `adapter-node` 5.5.7, and `package.json`
and `pnpm-lock.yaml` restored to HEAD so **not one byte remains** of the attempt.

**Re-verified after reverting:** `svelte-check` 0 errors 0 warnings, 51 files / 562 tests passing,
`vite build` clean, `pnpm install --frozen-lockfile` clean.

**Retry when** Kit 3 either ships `$app/tsconfig` or writes `types/index.d.ts` again. The two-file
config migration above is done and takes ten minutes to redo.

### 12:15 — Dependencies taken to latest, with three deliberate exceptions (pushed to `main`)

**Runtime impact: yes** — `better-sqlite3` and `vite` are build/runtime dependencies. No source
changed.

Every version below was read from a registry or an official index **today**, not recalled.

#### Node — latest **LTS**, as asked

`nodejs.org/dist/index.json`: the newest LTS is **v24.19.0 "Krypton"**, released 2026-08-03. v26.7.0
exists and is **Current, not LTS**, so it is deliberately not adopted.

- `.nvmrc` created — there was none, so the Node version was implicit.
- `engines` unified to `24.x`. The root said `>=22`, the controller said `24.x`, **and the room
  declared none at all** — three answers to one question.

#### Updated (10 packages + pnpm)

`pnpm` 11.18.0 → **11.21.0**. `vite` 8.1.5 → 8.2.1 · `@sveltejs/vite-plugin-svelte` 7.2.0 → 7.3.0 ·
`svelte-check` 4.7.4 → 4.7.5 · `typescript-eslint` 8.65.0 → 8.66.0 · `eslint` 10.8.0 → 10.8.1 ·
`globals` 17.7.0 → 17.9.0 · `@types/node` 26.1.2 → 26.2.0 · `@types/better-sqlite3` 7.6.13 → 9.6.0 ·
`@types/howler` 2.2.12 → 2.2.13 · `better-sqlite3` 13.0.2 → 13.0.3.

**`svelte-check` now reports 0 errors and 0 WARNINGS.** The three long-standing `href=""` warnings
are gone in 4.7.5 — they were the ones the manage page documented as unavoidable.

#### TypeScript 7.0.2 — attempted, and REVERTED

It is on `latest`, so "latest" would have taken it. It **breaks the toolchain**: `svelte-check`
crashes on load, and no peer accepts it — SvelteKit wants `^5.3.3 || ^6.0.0`, `svelte-check`
`^5.0.0 || ^6.0.0`, and `typescript-eslint` `>=4.8.4 <6.1.0`. **6.0.3 is already the ceiling those
peers allow**, so the repository was correct before and stays there.

#### NOT updated — three packages pinned to captured evidence

Bumping these would break the pixel match, which is the premise of the whole reproduction:

| package                         | pinned    | latest | why it stays                                                                                                                                                                                                                    |
| ------------------------------- | --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `font-awesome`                  | **4.3.0** | 4.7.0  | both captures request `fontawesome-webfont.woff2?v=4.3.0`. 4.7.0 redrew `fa-user` from 1408 units to 1280 — **10.219px against 9.289px** at the 13px the dropdown uses.                                                         |
| `@fortawesome/fontawesome-free` | **5.8.1** | 7.3.1  | the room is FA5, where the gear measures 16px = 1em; FA4's cog is 0.857em and shrank that button to 24.719.                                                                                                                     |
| `animate.css`                   | **3.7.2** | 4.1.1  | the reference loads 3.7.2 and the app uses its class names (`animated fadeInDown`). **v4 renames every class** to `animate__animated animate__fadeInDown`, and `account.css` transcribes 3.7.2's exact reduced-motion contract. |

#### Rust

**The toolchain pin was already current**: `channel-rust-stable.toml` gives rustc **1.97.1
(2026-07-14)**, which is exactly what `services/rust-toolchain.toml` pins.

21 crates updated via `cargo update` (thiserror, wasm-bindgen, time, regex-automata, cc, …).
`cargo check --workspace` exit 0; `cargo clippy --workspace --all-targets` exit 0.

**Eight direct crates are still behind and are NOT done**, because each needs a `Cargo.toml` edit
and an API migration rather than a lockfile bump: `base64` 0.22→0.23, `ed25519-dalek` 2→3,
`mediasoup` 0.24→0.25, `password-hash` 0.5→0.6, `rand` 0.9→0.10, `sha2` 0.10→0.11,
`tokio-tungstenite` 0.29→0.30, `tower-http` 0.6→0.7. `mediasoup` especially: the SFU migration is
another session's live task and moving it underneath them would be reckless.

#### Two defects found on the way, neither caused by this change

- **The documented clippy gate is wrong for this workspace.** `cargo clippy --all-targets -- -D
warnings` fails with **46 errors on a clean tree**, because the test helpers
  (`raw_for_tests`, `identity_pool_for_tests`, `set_relay_ready_for_tests`) sit behind a
  deliberately non-default `testing` feature. Proven pre-existing by re-running it against the
  stashed original lockfile: same 46. The correct invocation is
  **`cargo clippy --workspace --all-targets --features tradingroom-api/testing -- -D warnings`**,
  which exits 0.
- **`ed25519-dalek` is declared twice and disagrees**: the workspace `Cargo.toml` says `3.0.0`,
  `media/Cargo.toml` pins `"2"`. The lock resolves 2.2.0. Recorded, not silently reconciled.

**Verified:** controller `svelte-check` 0/0, 51 files / 562 tests, `vite build` clean. Room
`svelte-check` 0/0, 56 files / 523 tests. Rust check and clippy both exit 0.

### 11:23 — `pnpm check` was RED and nobody knew; plus the focus ring that would not let go

**RUNTIME IMPACT: yes, but only visual** — a focus outline no longer sticks after a mouse click.
The rest is the build gate.

**`pnpm check` has been failing, and my own reporting hid it.** The script is
`svelte-check --tsconfig ./tsconfig.json --fail-on-warnings`, so its three `a11y_invalid_attribute`
warnings exit **1**. I had been running `svelte-check --threshold error` — my flag, not the
project's — and reporting "0 errors, 3 warnings" as though that were fine, in four separate
changelog entries. It was not fine: `check` sits inside `quality`, so the whole chain was red.
**Now 0 errors, 0 warnings, 0 files with problems, exit 0.**

The cause was `href=""` on three click-to-edit anchors, and the comment defending it was wrong in
both halves: it claimed `#` "cannot ship" under `--fail-on-warnings` while `""` is flagged by the
**same rule**, so the swap bought nothing and left the gate broken. The markup is right — an anchor
is what the reference uses, `""` is what its siblings carry (`file2:889, 991`), the click is always
prevented — so the rule is now **suppressed by name** with a comment that says so, instead of dodged
by picking a different invalid value.

**Two dead `svelte-ignore` comments removed.** `a11y_label_has_associated_control` on the stats date
labels suppressed nothing once `for` became conditional. A suppression that silences no warning is
scaffolding that outlives its reason.

**The emoji-picker "active blue": the ring is the reference's, the LINGER is not.** Its own
`bootstrap.min.css` carries verbatim (`evidence-dumps/NEXT-STEP/gaps/sheet-2.css:782`)
`.btn:focus { outline: -webkit-focus-ring-color auto 5px; outline-offset: -2px; }`, and its
`styles.css` (`sheet-9.css:324`) overrides only `box-shadow`, never `outline`. So deleting it would
contradict the capture. Changed `:focus` → `:focus-visible` instead: identical declared values,
byte for byte, but a mouse click no longer leaves the ring on until you click elsewhere. Keyboard
focus still shows it. Our classes were never the problem — `acc-btn acc-btn-default acc-btn-sm` is
exactly the reference's `btn btn-default btn-sm` (`logged-in-page:515`).

**Triaged, not fixed, because they are not bugs:** "Disconnected from Media Server" and the 503 are
the **un-migrated SFU** — `curl https://media.tradingroom.app/health` returns 503 with the body
`media endpoint not yet deployed on this host`, which is the placeholder `docs/SFU-MIGRATION.md`
describes. Nothing in this repository fixes that; it needs the SFU moved onto the Hetzner box, and
that needs SSH.

**Found and NOT yet fixed:** 13 form fields carry neither `id` nor `name`, which is the
"A form field element should have an id or name attribute" advisory. Nine are checkboxes, and
**adding `name` to a checkbox makes it submit** — a behaviour change, not a lint fix — so this needs
deciding rather than sweeping. A first scan said 19; six were my own regex counting Svelte's
`{id}`/`{name}` shorthand and reference markup quoted inside comments.

**Verified:** `pnpm check` exit 0; 51 files, 562 tests passing; breakpoint contract passing;
autofixer clean.

### 11:12 — All five downloads rewritten from the reference's own bundle

**RUNTIME IMPACT: yes.** Every export in the app changes filename, format, or both.

The owner ran `collect-export-controls.js` and `collect-create-new.js` against the live original;
both dumps are in `dumps/`. `app.min.js` — 455KB, never on disk before — is now readable, and it
overturned one conclusion and corrected four formats.

**Export Badges was a real defect, and the earlier dismissal of it was wrong.** The handler is
`exportBadges()`, on the ACCOUNT page, writing `BadgesList.csv` through a `convertToCSV`. Ours wrote
`badges.json`. The 10:50 entry said no such control existed; it had searched the manage-page capture
only, which is the failure the house rules exist to prevent, quoted in the same entry that committed
it.

| download        | was                                                                      | now, from the bundle                                                                                    |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Export Badges   | `badges.json`, `application/json`                                        | **`BadgesList.csv`**, `text/csv;charset=utf-8`, eleven fixed keys                                       |
| Users → Export  | `room-<code>-users.csv`, 4 quoted columns incl. an invented `Last login` | `Participant_List_<uuid>.csv`, **unquoted**, `Name, Email[, Phone], Role`                               |
| Stats → Export  | `room-<code>-stats.csv`, `#/Nick/Email/Last login`                       | `Participant_Stats_<uuid>_<date>.csv`, **quoted**                                                       |
| Monthly         | `room-<code>-monthly.csv`                                                | `Monthly_report_<uuid>_<range>.csv`, header `Month, Total Logins, ` — trailing comma is the reference's |
| Export Settings | `room-<code>-settings.json`                                              | `Settings_<uuid>.json`, `text/json;charset=utf-8` — **JSON confirmed correct**                          |

**Details that only a bundle read could give:** every CSV ends `\r\n` — except the badges one, which
`convertToCSV` writes with `\n`. Headers carry a space after each comma — except the badges one,
which has none. The participant list is unquoted and the other three are quoted. These look like
inconsistencies and are the reference's own.

**Two deliberate divergences, both one character wide.** The reference's `.replace(","," ")` on a
member name substitutes only the FIRST comma, so a second one still corrupts an unquoted row —
`replaceAll` here. And its `convertToCSV` guards on `!== undefined`, so a present-but-null key
concatenates the literal text `null` into the cell; our `emoji` and `imgURL` are nullable, so null
writes empty instead.

**Honest gaps, recorded not filled:** the reference's stats CSV has six columns this app has no data
for — IP, In, Out, Duration, isMobile, Browser — which come from per-session participant records
that do not exist here. Now `TODO.md` item **K**; it is a schema question, not an export one. And
three badge columns (`type`, `onlyP`, `roles`) are written empty; `roles` is collected by the editor
and never stored, already recorded at `+page.server.ts:345`.

`darkTheme` left the badges export as a result — the reference's key list is fixed at eleven and
matching it wins. The now-false comment in `schema.ts` saying otherwise was corrected.

**Also fixed: two type errors I shipped at 10:54.** `svelte-check` went 0 → 2 because
`expect(...).not.toBeNull()` does not narrow a type, and I ran the test and the breakpoint gate but
not `svelte-check` on a `.ts` change. Back to 0.

**Verified:** 51 files, 562 tests passing; `svelte-check` 0 errors, 3 warnings (unchanged, all
pre-existing); breakpoint contract passing; autofixer clean on both pages. Pinned by a new
`export-format-contract.test.ts` — 14 cases over filenames, line endings, MIME, header spacing,
per-file quoting and the empty-badges guard.

### 10:54 — The badge roles textarea no longer overflows its container (deliberate divergence)

**RUNTIME IMPACT: yes.** One CSS rule on the account page's badge editor. The field stops escaping
its card.

`#badgeRolesTxt` is `<textarea class="input-text" cols="70" rows="2">` inside a `.col-md-6` editor.
Node #91 of `NEXT-STEP/run2/welcome-run2.json` computes **`width: auto`** and **`max-width: none`**,
so the box comes entirely from `cols="70"` — about 70 characters, inside a card that is roughly half
of a 1170px container. Wider than its parent, with nothing to stop it. **The reference does this
too**, confirmed by the owner against the live original, so this is a divergence chosen on purpose
rather than a match.

**`max-width: 100%`, not `width: 100%`**, and the distinction is the whole fix: `width: 100%` would
contradict the measured `width: auto` and stretch the field even where there is room, which the
reference does not do. Bounding it changes nothing until the box would leave its parent — the one
case that is broken. `box-sizing: border-box` is already in force from `.acc-body *` and matches
what #91 computes, so the 2px padding and 1px border sit inside the bound.

**Honest gap:** the overflow itself is not in any capture. Every rect in that file is `0×0` because
the badge editor is `ng-show`-collapsed when captured, and a hidden element has no box. The authored
style explains _why_ it overflows; the owner's observation is the evidence _that_ it does. No
number for how far it overruns exists, and none was invented.

**Pinned in both directions** by a new case in `badge-editor-contract.test.ts`: `max-width: 100%`
must be present, a bare `width: 100%` must not be, and `cols="70"` stays in the markup. The
assertion **strips CSS comments first** — its first version matched the note quoting the old
`#badgeRolesTxt { width: 100% }` and failed against correct CSS, which is the same
"satisfied by its own documentation" trap the file already guards against for markup.

**Verified:** mutation-checked — swapping `max-width` for `width` turns the test red, so it is not
vacuous. Breakpoint contract passes; 5/5 badge editor tests pass.

### 10:50 — "Export badges should be CSV": investigated, and NOT changed — **THIS ENTRY WAS WRONG**

> **Corrected 11:12 by the bundle capture. The owner was right and this entry was not.**
> There IS an `Export Badges` control — `ng-click="exportBadges()"` — and it writes
> `BadgesList.csv`. The mistake below is a single word: this entry says "not in the reference",
> having searched `must-match/important`, which is the **manage** page. The control is on the
> **account** page. Searching one capture and concluding about the whole app is the exact failure
> the house rules describe, committed while quoting them. Everything below about the four
> manage-page exports is accurate and was confirmed by the same bundle; only the badges claim was
> false. See the 11:12 entry.

**No runtime impact** — one new collector script. **No application code was touched, deliberately.**

Reported: clicking export badges downloads a `.json` and should download a `.csv`. Read against
`must-match/important`, every export/download handler in the reference is:

| capture line | handler                                                     | format                                     |
| ------------ | ----------------------------------------------------------- | ------------------------------------------ |
| 34           | `exportListToCSV()`                                         | CSV                                        |
| 916          | `exportStatsToCSV(statsDate)`                               | CSV                                        |
| 919          | `downloadMontlyStats(…)` — the reference's own misspelling  | CSV                                        |
| 985          | **`exportSettingsToJSON()`**                                | **JSON**                                   |
| 986          | `loadSettingsFromJSON()`                                    | **inside an HTML comment — never renders** |
| 91, 2081     | `removeBadgesForUsers()`, `openChatTabsWithBadgesEditor(…)` | not exports                                |

**There is no "Export badges" control** — not in this app and not in the reference. The only JSON
download anywhere is Export Settings, whose handler in the reference is literally named
`exportSettingsToJSON`, and ours already matches it. Users, stats and monthly already produce CSV
with `.csv` filenames.

So the requested change has no target, and making the settings export CSV would contradict the
capture. **Left alone pending the owner's call** — it is a divergence to decide, not a defect to fix,
and it will be recorded as a divergence if chosen.

**`apps/controller/scripts/collect-export-controls.js`** added to settle what markup cannot: whether
the function BODIES agree with their names, and whether the control the owner clicked exists
somewhere no capture reached. It fetches every same-origin bundle, pulls a 4,000-character window
around all thirteen export/badge/MIME/blob symbols, and captures every export/download/badge control
across every tab it can reach — outerHTML, computed styles, and the stylesheet rules that match, so
"this class has no rule" can be proven. Honest `gaps[]` for any tab that never rendered.

**It clicks nothing that acts.** `export` and `download` are on its denylist on purpose: the point
is to read the exporter, not run it. Tab links are the only thing clicked, matched by exact string
comparison — never a regex built from a label, which is how a menu item with a slash in its name
once went unclicked and the bug looked like the app's.

### 10:37 — Tabs moved into the path, and the last route still using a row id (pushed to `main`)

**Runtime impact: yes, URLs change.** `/account/rooms/1001?tab=marketplace` is now
`/account/rooms/1001/marketplace`. A tab selects which pane of the room you are looking at, and a
pane is a place — not an option bolted onto a page, which is what `?tab=` read as.

- **The manage page moved to `[id]/[[tab]]/`.** The segment is optional, so `/account/rooms/1001`
  still resolves and lands on Users — the same default a missing `?tab=` had. 14 links rewritten
  across three files, and 13 test files repointed at the new location.
- **An unknown tab now 404s** instead of quietly showing Users. Silent fallback was tolerable when
  the tab was an option; a path that resolves to something other than what it names is a different
  thing, and the honest answer for a URL nobody issued is that it does not exist.
- **`/launch/[id]` still resolved `eq(rooms.id, Number(params.id))`** — missed when the manage page
  moved off primary keys earlier today. It was the one door still speaking in row ids, and nothing
  in the UI links to it, so nothing caught it. Now resolves by short code like everything else.

**Investigated end to end.** Every `searchParams` read in both applications, and every generated
customer-facing URL:

| kept as a query, and why                             |                                                                                                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?q=`, `?filter=`                                    | a search term and a filter over the collection a pane shows. This is what query strings are FOR; making them path segments would conflate a filter with a resource.                                     |
| `?token=` (verify-email, reset-password), `?secTok=` | one-time credentials, not resources. A path segment would make a secret look like a page.                                                                                                               |
| `?email=` on the three `/internal/*` endpoints       | server-to-server lookup parameters, never seen by a customer.                                                                                                                                           |
| `?co=1` in the room                                  | **transcribed evidence, not a choice.** The capture reads `const F = s.get("co")` into `globals.chatOnlyMode`; renaming it would break the original's detached chat popout. Checked before touching it. |

**Still outstanding, and it is the same offence:** the room's entry URL is
`/session?id=3625&jwtSite=…`. `id` belongs in the path. It is NOT in this push because it spans two
applications — the controller mints that link and the room parses it — and the room is deployed by
hand to Hetzner while the controller auto-deploys on push. Shipping them out of order breaks every
Launch button. Sequenced separately and deliberately.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 unit
tests passing. All 37 database tests passing. Not verified in a browser — `pnpm test:e2e` now exists
but has not been run.

### 10:31 — `TODO.md` now lists only open work (`ca1fe65`, pushed to `main`)

> This heading first read **10:35**, a time I wrote before checking the clock. It was 10:31.
> Corrected to the commit's own timestamp, and left visible: this file's whole premise is that
> every time here is measured rather than estimated, so an invented one in it is worse than an
> invented one anywhere else.

**No runtime impact** — one document.

Seven closed items removed rather than left struck through: evidence gap **13** (`ptr_logo.png`),
and work items **A** (password reset), **B** (mail transport), **D** (`ROOM_BASE_URL`),
**E** (`ROOM_JWT_SECRET`), **I** (four unstyled public pages) and **J** (the wrong-shell defect).

Nothing is lost — every one of them is in this file, dated, timed, and against the commit that
closed it. That is the point of the split: two places recording the same thing is how one of them
goes stale, and a list that is mostly strikethrough is a list nobody reads to the bottom of. The
header now says so, so the next person does not "helpfully" restore the history.

**Two counts repaired, which is the part a plain deletion would have got wrong:**

- "closes five of **thirteen** gaps" now reads "five of the **twelve remaining** gaps", because gap
  13 was one of the thirteen.
- checked for dangling references to the removed ids across the file — none.

**What is left, and it is now the whole file:** evidence gaps **1–12**, and work items **C**
(`push_tokens_json` has no writer), **G** (Neon under volume) and **H** (separate the media plane
from the app tier). G and H are the owner's calls, recorded rather than queued.

### 10:28 — The e2e harness could not run at all; written, plus the manage-page spec (pushed to `main`)

**No runtime impact** — test infrastructure and one `.gitignore` line. Nothing about what the site
serves changed.

**`test:e2e` is listed in the `quality` gate and could never have executed.** `e2e/` holds three
specs and `package.json` runs `playwright test`, but **there was no `playwright.config.*` anywhere in
the repository**. The specs navigate with `page.goto('/register')`, which needs a `baseURL` to
resolve. A gate in the quality chain that cannot run is worse than no gate, because it reads as
coverage.

- **`playwright.config.ts`** — `testDir: e2e`, baseURL on 5173, serial (`workers: 1`), and a
  `webServer` block so **Playwright owns the server's whole lifecycle**: it starts it, waits for
  `/login`, and tears it down when the run ends. That is what makes an e2e run compatible with the
  standing "nothing runs on local ports" rule — there is nothing left to forget about.
- **`reuseExistingServer: false`**, against the usual `!process.env.CI`. Other projects on this
  machine use this port range, and reusing a foreign server would run these assertions against a
  different application and report the result as this one's — exactly the failure the standing rule
  exists to prevent. Failing loudly on a busy port is the safer answer.
- **`playwright-report/` and `test-results/` added to `.gitignore`.** They were not ignored;
  `vite.config.ts` already excludes both from its watcher for the same reason, so this was an
  oversight rather than a decision. Without it the HTML report lands in the next commit.

**`e2e/manage-room.spec.ts`** covers the two things shipped earlier today that a unit test cannot
prove, and which `CHANGELOG.md` recorded as unverified in a browser:

- the URL a customer lands on carries the room's **short code** — read off the Manage link's own
  `href` and asserted to be four-or-more digits, never a hardcoded value, since the code comes from
  a database sequence;
- the stats date field **takes focus on click**, the label's `for` is absent at rest and present
  while editing, and **blur closes the row** — the half of the defect a stub cannot demonstrate,
  because `blur` is a browser behaviour rather than a function call.

The account is a throwaway registered through the real form, the same pattern
`critical-journey.spec.ts` already uses. Nothing is forged and no session is inserted.

**Verified:** the config parses and `playwright test --list` reports 9 tests across 4 files without
starting anything. `svelte-check` 0 errors, 3 warnings (unchanged); 547 unit tests passing.

**NOT yet executed, and that is the honest state.** Running it starts a dev server on 5173, which
is the owner's explicit standing boundary, so it waits on their word rather than being assumed.
Everything above is the harness being correct; none of it is the assertions having passed.

### 10:18 — Rooms are addressed by their short code, not the database id (pushed to `main`)

**Runtime impact: yes, and it changes a URL.** `/account/rooms/1?tab=users` is now
`/account/rooms/3625?tab=users`. Raised by the owner: the old form read as unfinished, and it was —
`1` is a row's primary key. It advertises how many rooms the database holds and belongs to the
database rather than to the product.

The short code is the room's own identity and the only number this product ever shows for it. The
reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, its Sessions
table lists Session ID `3625`, and `provisionRoom` already names a new room `Room <shortCode>`.
`rooms.short_code` is `NOT NULL` with a unique index, so the lookup costs exactly what the primary
key did.

- `+page.server.ts` — the load, `ownedRoom`/`ownedRoomId`, and the clone redirect all resolve by
  short code. The clone's `returning` gained `shortCode` so the redirect reads the value that
  actually landed rather than a local.
- Eleven links updated: two on the account page, nine on the manage page.

**Old numeric links 404, deliberately.** Accepting both would be ambiguous — id and short code are
both digit strings, and nothing stops one room's code equalling another room's id, so a fallback
would silently resolve to the WRONG room. A 404 is the honest answer, and on a days-old deployment
whose rooms have four-digit codes and single-digit ids there is nothing bookmarked to break.

**`?tab=` is left alone.** A query parameter for a tabbed view is a normal, correct pattern; moving
it into the path would churn the most evidence-pinned page in the repository for no user-visible
gain. The complaint was the `1`, and the `1` is what changed.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 tests
(up 6 — `room-url-identity.test.ts`). **All 37 database tests pass**, and getting there mattered:
six of them failed on the first run because the harness passed numeric ids as the route param. That
is the change working, not a flake — the harness now resolves id to short code with a real lookup,
so the cases stay about the DON'T TOUCH actions.

The new cases can tell the two identifiers apart because the fixture's differ on purpose — **id 1,
short code 3625**. A fixture whose id happened to equal its code would pass on either
implementation. Mutation-checked: reverting one link to `${room.id}` turns two of them red.

### 10:12 — Both open manage-page audit defects fixed (pushed to `main`)

**Runtime impact: yes.** Two live UI bugs on the User Stats pane of a page already in production.
Both were found by the manage-page audit's own adversarial verifier and had been open since.

- **The stats date fields were a one-way trap.** Clicking either date swapped its anchor for an
  `<input type="date">` and stopped there — the field never took focus. The picker never opened,
  nothing could be typed without a second click, and **the row could not close**, because its only
  exits are `change` and `blur` and `blur` cannot fire on an element that never held focus. One
  click put the row into an edit state with no way out.

  Fixed with `{@attach focusDateField}` — an attachment rather than a `use:` action, which is what
  the current Svelte docs list as the replacement under "avoid legacy features", and which runs at
  element creation, exactly when focus needs to move.

- **`for="statsFrom"` / `for="statsTo"` were orphaned at rest.** Both pointed at ids that exist only
  while editing, so at rest the labels referenced nothing: a screen reader announces a label whose
  control cannot be found, and clicking it moves focus nowhere. `for` is now set only while the
  field exists.

  At rest the captioned thing is an `<a>`, which is not a labelable element — there is no id `for`
  could legally point at — so the label carries a documented `svelte-ignore` and the anchor gained
  an `aria-label` so the caption still reaches assistive tech. This is also the closer match: the
  reference's own labels carry no `for` at all (file2:904, 909), and attributes are invisible to the
  side-by-side comparison, which reads tag and classes only.

- **`focusDateField` was extracted to `$lib/focus-date-field.ts`** rather than left in a 2,000-line
  component, for the same reason as `chrome.ts`: it has three branches that are easy to get wrong
  and impossible to see in review — a browser with no `showPicker`, a `showPicker` that throws
  because the call is not user-activated, and the ordering of focus against it. **Focus runs first
  and unconditionally**, so a refused popup cannot take the stuck-row fix down with it; that
  ordering is pinned by a test.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings — unchanged, and all three are the
pre-existing `href=""` ones this block already documents. 49 files, 541 tests passing (up 6:
`focus-date-field.test.ts`). 47 manage-page tests still passing, so the side-by-side match is intact.

**Not verified in a browser**, and worth stating plainly: nothing runs on local ports for this
project by standing instruction, and the manage page needs a signed-in session and a room. The
picker opening is asserted against a stub, not against Chromium. The two behaviours a stub cannot
prove — that the native calendar actually appears, and that blur now fires — are the reason the
`showPicker` call is best-effort rather than assumed.

### 10:03 — This changelog started, and two comments corrected (`8c5dca3`, pushed to `main`)

**No runtime impact** — documentation, one code comment and one test comment. Nothing about what the
site serves changed in this push; the pages and CSS themselves went up earlier in `6e7a151`.

- **`CHANGELOG.md`** created at the repo root. It exists because several changes today landed in
  commits whose messages described something else — the four rebuilt public pages went in under a
  commit about the `pub-*` decision — which makes work unfindable without reading diffs.
- **Two comments that were true when written and had since reversed**, in
  `forgot-password/+page.svelte` and `password-reset-pages.test.ts`. Both stated that the `pub-*`
  classes have no rule anywhere in the app; `public.css` had defined all seven an hour earlier. A
  comment asserting a fact that has flipped is worse than no comment, because it is read as current.
  `forgot-password` still wears `acc-*` on purpose, and the comment now says why it should stay that
  way.

**Verified before pushing:** 48 files, 535 tests passing; `svelte-check` 0 errors, 3 warnings
(unchanged); breakpoint contract passing.

### 09:59 — Full controller unit suite re-measured

**No runtime impact** — a measurement, plus one documented count corrected.

**48 files, 535 tests, all passing.** `docs/PROMPT-TODO-ITEMS.md` said 522; corrected in place with
the date of the new measurement rather than silently overwritten.

### 09:58 — The verification query that was owed, run against production

**No runtime impact** — one read-only `SELECT`. Nothing was written to the database.

`docs/EMAIL.md` §5 and `docs/PROMPT-TODO-ITEMS.md` both recorded a query that had to be re-run
_after_ `RESEND_API_KEY` and `MAIL_FROM` went live, because flipping them makes `verificationEnforced()`
true and gates any account with a NULL `email_verified_at` out of creating rooms.

Result: **one row, and it is the safe one.** `id 1 | billy.ribeiro@icloud.com`, `created_at` and
`email_verified_at` both `2026-08-07 22:46:34.438+00` — equal to the millisecond, which is the
signature of migration 1's backfill. **Nobody is locked out; no `UPDATE` and no resend needed.**

Also corrected the reason the brief gave for not having run it. It said obtaining a connection string
requires `vercel env pull`, which would write every other production secret to disk. It does not: a
`DATABASE_URL` was already on disk at `~/Desktop/new-room-control/.env.vercel-pull`, which is where
`scripts/set-vercel-env.sh` already reads it from.

_This measurement expires with the next registration._

### 09:57 — TODO item I closed: the four unstyled public pages (`6e7a151`)

**RUNTIME IMPACT: yes.** Three public pages and a stylesheet, live on `main` and therefore deployed.
`/contact`, `/privacy` and `/terms` render differently to a visitor from this commit onward.

`contact`, `privacy`, `terms` and `verify-email` rendered with seven classes that had **no CSS rule
anywhere in the app**. `pub-hint`, `pub-error` and `pub-success` were therefore visually identical,
so on `/verify-email` "your address is confirmed" and "that link has expired" looked the same.

- **`src/public.css`** — added a section defining `pub-auth`, `pub-container`, `pub-form-card`,
  `pub-field`, `pub-hint`, `pub-error` and `pub-success`, every rule scoped `.pub-root …`, under a
  header marked NOT TRANSCRIBED because those pages were never captured. Values reuse what the app
  already has: Bootstrap 3.1.1 panel and `.form-control` geometry, `#777` from `.acc-text-muted`, and
  the two message colours literal-copied from `--btn-danger-bg` / `--btn-success-bg`.
- **Deliberately fluid, with no `@media` block** — `scripts/verify-breakpoints.mjs` asserts
  `public.css` carries exactly the thresholds 767/768/991/992/1200, so a new one fails that gate.
- **`(public)/contact/+page.svelte`** — rebuilt with labelled fields, all four server states handled
  (including `unavailable`, which the old page ignored), and an honest not-delivered state pointing
  at the real `support@tradingroom.app` mailbox.
- **`(public)/privacy/+page.svelte`, `(public)/terms/+page.svelte`** — written from the source code
  rather than a template, naming the third parties a template would miss: Gravatar's MD5-of-email
  lookup, reCAPTCHA, and Resend via Amazon SES `us-east-1`. Both carry an explicit "not reviewed by a
  lawyer" notice and list what is still undecided.
- **Checked, and it was an artifact:** the brief warned `contact`'s submit might be white-on-white
  because it computes `background: rgba(0,0,0,0)`. It is not. `.pub-root .button` sets
  `background-color: #4589e3` then `background: linear-gradient(...)`; the shorthand resets
  background-_color_ to transparent while setting background-_image_ to the gradient.
- Fixed two comments the change made false — in `forgot-password/+page.svelte` and
  `password-reset-pages.test.ts`, both of which still said the `pub-*` classes had no rule.

**Verified:** breakpoint contract passes; `svelte-check` 0 errors, 3 warnings (unchanged — none
added); 535 tests pass; Svelte autofixer clean on all three pages.
**Honest gap:** `verify-home-fidelity.mjs` could not be run — it reads `evidence-dumps/`, which lives
outside this repo — so its two `public.css` reject patterns were checked by hand (0 matches).

### 09:50 — `/forgot-password` and `/reset-password` moved to the correct shell (`4f36e89`)

Both were rendering in the marketing shell while wearing controller `acc-*` classes; measured in
Chromium, every field came out 508px instead of 254px. The shell is now decided by `$lib/chrome.ts`.

### 09:15 — Documentation corrected: mail is live (`17c1842`)

Three places still described the transport as unconfigured.

### 09:07–09:11 — Password reset built (`4291afc`, `178cbf4`)

The one flow with no route back into an account. Token design reused from `email-verification.ts`:
hashed at rest, single-use, one hour rather than 24, rate limited, reCAPTCHA before the lookup.

### ~08:50 — Email turned on end to end

- Porkbun hosted mailbox created for `support@tradingroom.app` ($36/yr — the free forward was
  offered and declined so replies do not come from a personal address).
- Resend domain `mail.tradingroom.app` verified; DKIM and the `send.mail` MX are live. **The SPF TXT
  and DMARC records did not save** and are still absent from the zone — confirmed against all four
  Porkbun nameservers. Sending works; inbox placement is weaker than it should be.
- `RESEND_API_KEY` and `MAIL_FROM` set on Vercel production, both marked Sensitive.
- `scripts/set-vercel-env.sh` extended to write both, with a minimum length for the key and a
  write-time check that `MAIL_FROM` is an address.

### 07:59 — The room is deployed (`77ac66d`)

`chat.tradingroom.app` on the Hetzner box, with `ROOM_JWT_SECRET` rotated to 64 hex characters on
the room and on Vercel in the same sitting.

### 05:04–05:33 — Documentation established

`TODO.md` at the repo root (`41ffe54`), `docs/EMAIL.md` (`12354fb`), `docs/MOBILE-APP.md`
(`f8a92f2`), and the white-label correction separating what the evidence proves from what it merely
permits (`38c74c0`).

### 04:19–04:47 — Rich text editor and hand-off notes

Editor toolbar focus ring, paragraph output, active-format highlighting, save toast
(`9755def`…`7ee434c`), and the hand-off notes (`2c620a4`).

### Earlier — manage-page side-by-side audit

Ran across 13 agents. The manage page went from **2,355 differing elements to 24**: tab strip 0/15,
Users 2/507, Text List 0/6, Branding 0/94, SSO Setup 0/9, User Stats 6/53, Settings 16/1501. The
first fix was a harness bug — the fixture omitted the `strip` property the page filters on, so the
tab strip scored 15/15 against an empty `<ul>`.

**Two defects from that work are still open**, both caught by its own adversarial verifier and
neither yet fixed: the stats date `<input>` is created on click but never focused, so the picker does
not open and the row sticks in edit state; and `for="statsFrom"`/`for="statsTo"` point at ids that
exist only while editing, so the labels are orphaned at rest.

## 2026-08-12 17:05 EDT — the provenance seal can run for the first time

Three instances of one path bug, not one. `REPOSITORY_ROOT` was corrected earlier, but
`verify-backend-provenance.mjs` still read every file with `new URL(`../${path}`, import.meta.url)`
at two more sites (the manifest read and the documented-count read), which resolve to
`apps/controller/` — a directory that has no `services/` and no `ops/`. Both are now addressed from
`REPOSITORY_ROOT`. They were invisible because the file-count check threw first.

The count is split rather than bumped. `LOCALLY_AUTHORED` names
`services/api/migrations/0009_rename_runtime_roles.sql`, authored here on 2026-08-10 and never
imported, and pins it by its own SHA-256 (`6acfec23…`). The imported seal stays at 98, so
`ops/backend-import-provenance.md` still records only what was imported. TODO row Z refused to bump
98 to 99 and that refusal was right; this is the half that was missing.

VERIFIED: the count check passes (98 imported, 99 total, 1 locally authored) and the path-list
SHA-256 passes — both for the first time.

NOT GREEN, and deliberately not silenced: the manifest SHA-256 now differs
(expected `4c303601…`, got `f1a8493f…`). That check has NEVER executed before, because the read it
depends on pointed at a directory that does not exist. So the mismatch is either real content drift
in an imported file or a pin that was computed at import time and never validated. Re-pinning it to
make the gate green would destroy the first true signal this seal has ever produced. It needs a
per-file diff against the source, which is TODO row P and the owner’s direction to move in.

## 2026-08-12 17:40 EDT — the manifest mismatch is real drift, and it is now enumerated

The provenance seal's manifest SHA-256 failure was an open question four hours ago: real drift, or a
pin computed at import time and never validated? It is REAL DRIFT, and the answer came from git
rather than from an opinion.

`git diff --name-only e50a819..HEAD -- services` lists ten IMPORTED files whose content has changed
since the seal was taken: `Cargo.lock`, `api/src/db/migrate.rs`, `media/Dockerfile`,
`media/src/config.rs`, `grant.rs`, `main.rs`, `router_registry.rs`, `server.rs`, `session.rs`,
`worker_pool.rs`. `server.rs` alone is +196 lines. An eleventh, `0009_rename_runtime_roles.sql`, was
authored here and is sealed separately as `LOCALLY_AUTHORED`; it is not part of this divergence.

That matters beyond the gate. `CLAUDE.md` states `services/**` is a mirror and a change made here is
lost on the next sync — so ten files of real work, the SFU liveness fix among them, exist only in
this repository and a sync would destroy them.

The seal stays red. It is reporting exactly what it exists to report, and re-pinning would erase the
only record that these ten diverged. TODO row P now enumerates them and states the two honest ways
to close it — push them back to the source and re-seal, or accept this repository as the authority
for `services/**` and retire the import-provenance framing. That is a decision about where the
backend lives, and it is the owner's.

TODO rows Z and P both rewritten to the current state; Z's three original causes are closed.

## 2026-08-12 17:35 EDT — the app-room gap sweep: all 11 closed

Every gap the ledger recorded for `app-room` is now resolved, and four of them turned out not to be
gaps at all.

**Implemented (4).**

`muteAllNonAdmins` — it read `muted = true; volume = 0`, so a presenter asking the room to silence
its non-admin speakers silenced their OWN speakers and left every one of those microphones open for
everybody else. The label and the effect were unrelated. Now selects from `talkingUsers` with the
roster as the authority on who is an admin, skipping anyone with no roster row rather than assuming
them ordinary, and staggers the sends 100ms apart.

The `#connectedMsg` reconnect flash — the markup shipped and nothing ever showed it. Flashes for 3s
on a RE-connect only, never the first open.

Join/leave announcements, end to end. The subscriber map is the presence table, so these are PERSON
events: one person with three tabs announces once on the first and once on the last.

Tawk presenter support — and it carried a hazard. The reference hardcodes
`https://embed.tawk.to/5aecb59f227d3d7edc24f7c2/default`, which is protradingroom OWN property.
Copied verbatim, every presenter here would open a support chat into another company inbox and
`setAttributes` would post their name and email into it. The property now comes from
`PUBLIC_PTR_TAWK_PROPERTY_ID`; with none configured no script is injected and the control does not
render.

**Closed by evidence, no code (2).** Both would have ADDED behaviour the reference does not have.
`calculateDuplicates` has zero call sites — dead upstream. The `.alert-chat-box` hover targets
`.mainTabset ul.nav-tabs`, and `mainTabset` sits on exactly one element in the decoded tree —
`ul#mainTabs`, which IS the only `ul.nav-tabs` and has no `ul` descendants. The selector matches
nothing.

**Already implemented (2), and both were my own false negatives** from grepping `+page.svelte` alone
when the code lives in `ModalHost.svelte`: `initPMDrag` and `pollModalCompHolder`. Recorded rather
than quietly dropped, because it is the second time a scoped search has produced a wrong conclusion
in this work.

**Deferred, each because the producer does not exist here (3).** `hideChat` — its only emitter is
inside `changeChatMode`, a feature this room does not model, so the handler alone would be a
listener nothing emits. `stopRecMsg` — sent by the reference own server on a recording pipeline we
replaced client-side. `appVisibilityChange` — its roster half has no counterpart because this roster
is SSE-pushed.

VERIFIED: 775 tests / 73 files green; svelte-check 0 errors; schema:verify 269 total, 49 wired;
prettier clean; four negative controls run, each red then restored.
