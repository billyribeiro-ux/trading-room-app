# Next session: move the screen controls to where the capture puts them

> ## DONE — superseded by [`ROOM-STATE-2026-08-06.md`](ROOM-STATE-2026-08-06.md)
>
> **2026-08-05.** Everything this document asked for is implemented and proven at runtime, and the
> §7/§8 items it left open are closed or re-recorded in the state document. It is kept as the
> forensic record of HOW the screen-control divergence was found — the const-table decoding in §2
> and §3 is still the best worked example in the repository — but it is no longer a work list.
>
> **Do not take instructions from this file.** Two of its statements were wrong and are corrected
> in place below: the `-detached` positioning claim in §2, and "keyed by the selected screen" in
> §3, which the bundle contradicts (the state is global).

**Written 2026-08-04.** Everything below is evidence-backed and verified. Read
`AGENTS.md` § "The DPE level 8++ Protocol" first — it binds this work.

---

## 1. The defect, in one sentence

`ScreenPane.svelte` renders the zoom/screenshot cluster unconditionally, absolutely positioned
over the video, using the **attached** class in the **detached** position — so the magnifier lands
next to the screen tab's gear instead of sitting right-aligned in the screen tab bar.

## 2. The evidence

From `new/ptr-components-1785884450507.json`, pulled from the LIVE bundle on 2026-08-04 with
`scripts/pull-component-source.js`. Verified identical to the archived
`docs/source/main.d6d3c112b59b7d0d.js`, so the archive is trustworthy for this component and the
offline `scripts/extract-component-source.mjs` can be used instead.

`app-screenshare-view` const table, decoded:

```
  4: class="zoom-controls-container-detached"  [bound: ngClass]     ← note the suffix
  5: class="position-relative h-inherit overflow-hidden"  appDoubleClick=""
  7: class="video-screen-container"  [bound: id]
  8: class="webcamScreen"  autoplay data-ng-dblclick="fullScreen()" playsinline muted
 13: class="btn btn-sm btn-dark"     [bound: click]     ← used TWICE
 14: class="icon fas fa-search"        zoom toggle
 15: class="icon fas fa-camera"        screenshot
 16: class="btn btn-sm btn-warning"  [bound: click]     ← used THREE times
 17: class="icon fas fa-search-plus"
 18: class="icon fas fa-search-minus"
 19: class="icon fas fa-redo"
```

The gate that decides everything, from the same component's template function:

```js
O(5, o.isDetachedCtrl ? 5 : -1);
```

Const 4 — the `-detached` container — renders **only when the screen is detached**. In the normal
attached case `app-screenshare-view` renders no control cluster at all.

Where it goes instead: `ScreenTabs.svelte:222-228` already models it, and `ms-auto` appears in the
captured const table as `[1,"nav-item","ms-auto"]`:

```svelte
{#if screens.length > 0 && controls}
  <li class="nav-item ms-auto">
    <div class="zoom-controls-container position-relative">
      {@render controls()}
    </div>
  </li>
{/if}
```

**`+page.svelte` never passes a `controls` snippet**, so that `{#if}` is always false and the slot
never renders. Verified: `grep -c controls` over the `<ScreenTabs …>` call site returns 0.

Supporting CSS, all confirmed present in the applied sheet `css/complete-app-styles.css`:

```css
.screens-tabs {
  border-color: transparent;
  position: relative;
  z-index: 1;
}
.viewer-only-screen-zoom-controls {
  top: 33px !important;
  left: -3px !important;
}
.video-screen-container {
  position: relative;
  top: 0;
  left: 0;
  z-index: 1999;
  width: inherit;
  height: inherit;
}
```

**Correction, 2026-08-04 (second pass).** `top:33px/left:-3px` is **not** the detached
positioning. `.viewer-only-screen-zoom-controls` is bound by `ngClass` onto the **attached**
trio, from `app-presentationarea.render-helpers.js:261`:

```js
VCe = (t) => ({ 'viewer-only-screen-zoom-controls': t }); // render-helpers.js:10
z('ngClass', ut(1, VCe, e.appService.globals.viewerOnlyMode));
```

So it overrides that component's own `.zoom-controls { top: -33px; left: -33px }` when the room
is in **viewer-only mode**, flipping the trio from above the bar to below it. The detached
cluster has its own rule and its own class - see the correction in §3 below.

## 3. Why it is a refactor and not a markup move

The controls act on **one** screen — `zoomLevel`, `panX`, `panY`, `showZoomCtrl` and
`captureVideoImage()` all target `#webcamScreen-{id}`. The bar has **one** `ms-auto` slot for all
tabs. So the state must move up and be keyed by the selected screen.

**Correction, 2026-08-04 (second pass): the state is global, not keyed by screen.** The lift is
right; "keyed by the selected screen" is not. `app-presentationarea` owns `this.showZoomCtrl = !1`
and emits on a bus that every `app-screenshare-view` subscribes to **unfiltered**
(`app-screenshare-view.compiled.js:45-55`), so `togglePanZoom`, `panZoomIn`, `panZoomOut` and
`panZoomReset` move all screens together. Only `captureVideoImage` carries a payload and is
filtered (`e.screenId !== this.muser._id` returns early), so only the screenshot is addressed.
Panning is the one per-screen piece, because the drag happens on the view's own element. Two more
consequences of reading the subscription rather than inferring it:

- the view's `togglePanZoom()` body is exactly `this.panZoomReset()`, so the capture resets the
  view on **every** toggle, not only when leaving zoom mode;
- the detached cluster has its own second boolean, `showZoomCtrlDetached`, and
  `togglePanZoomDetached()` flips both it and `showZoomCtrl` before resetting.

**And the two clusters are not the same markup.** The attached copy
(`app-presentationarea.render-helpers.js:395-458`) puts the gated trio **first**, inside
`div.zoom-controls.position-absolute`; the detached copy
(`app-screenshare-view.render-helpers.js:74-108`) puts it **last**, inside a `div` with no class
at all, under `div.zoom-controls-container-detached`. That container's rule lives only in
`docs/source/components/app-screenshare-view.component.css`, not in `css/complete-app-styles.css`,
so it is not in the generated sheet and has to be declared in `ScreenPane.svelte` — the same
reason `.webcamScreen` is declared there.

## 4. The plan

1. **Lift the state** out of `ScreenPane.svelte` into `+page.svelte`, keyed by
   `selectedScreenTab`: `showZoomCtrl`, `zoomLevel`, `panX`, `panY`. A `Map<string, ZoomState>` or
   a record keyed by screen id — each screen keeps its own zoom, as it does today.
2. **Pass the cluster as `ScreenTabs`' `controls` snippet** so it renders in the `ms-auto` slot.
   Markup is already correct in `ScreenPane.svelte`; move it, keeping const 13/16 button classes,
   icon order (search, camera, then the gated plus/minus/redo) and the camera OUTSIDE the
   `{#if showZoomCtrl}` gate.
3. **`ScreenPane` keeps a `-detached` variant only**, rendered when the pane is detached, using
   `class="zoom-controls-container-detached"` per const 4. Delete the unconditional
   absolutely-positioned copy and the `.zoom-controls-container { position:absolute; top:0; left:0 }`
   rule in its `<style>` — that rule is ours, not the capture's, and it is what puts the magnifier
   on the gear.
4. **`ScreenPane` still owns the transform**, since `pan-element` lives there. It receives
   `zoomLevel`/`panX`/`panY` as props and reports pointer drags upward.
5. `captureVideoImage()` moves with the cluster but must still resolve
   `#webcamScreen-{selectedScreenTab}` — it queries the DOM by id, so it works from anywhere.

## 5. Do not change

- `.video-screen-container { z-index: 1999 }` — captured, and pinned by
  `src/lib/screen-stacking-contract.test.ts` together with the `#screensTabsContent { z-index: 0 }`
  containment added on 2026-08-04. Both must move together or the dropdown/modal defect returns.
- `videoWidth - 100` in the screenshot arithmetic. Almost certainly a bug upstream; it sets the
  saved file's dimensions, so changing it changes the output. Pinned by
  `src/lib/screen-controls-contract.test.ts`.
- `fillRect` before `drawImage` — default black fills letterbox bars that would otherwise be
  transparent.
- `li.nav-item { display:flex; align-items:center }` in `ScreenTabs.svelte` — this is what keeps
  the gear on the same line as the name, compensating for the deliberate nesting divergence
  documented at `ScreenTabs.svelte:142`.

## 6. Gates

```
pnpm test                       # 271 passing as of this writing
pnpm run format:check
pnpm exec svelte-check --threshold error
```

Add a contract test asserting the cluster renders in the `ms-auto` slot and that `ScreenPane`'s
copy is `-detached`-only. Follow `screen-controls-contract.test.ts`, which asserts against the
**bundle** rather than a DOM dump — the one artifact where absence means absence.

## 7. Closed 2026-08-04 (second pass)

- **The main tab bar is NOT covered.** Measured, not reasoned. A real share was driven in headless
  Chrome (the room's "OBS" entry takes the `getUserMedia` path, which `--use-fake-device-for-
media-stream` satisfies with no picker and no screen-recording permission), then
  `document.elementFromPoint` was sampled at 15 points across `#mainTabs`. Every one returned an
  element **inside** `#mainTabs` and none inside `#screensTabsContent`. Geometry: `#mainTabs`
  occupies y 49-89, `#mainTabsContent` begins at y 89 with computed `overflow: hidden`, and
  `.video-screen-container` is computed `position: relative` at y 90-827 - below the bar, and
  clipped by that ancestor even if it were not. The `z-index: 1999` never had anything to reach.
- **`scripts/pull-component-source.js` now has a real tokenizer.** `parseConstTable` walks the
  table character by character, tracking which quote opened each string and honouring backslash
  escapes. `app-room`'s table is 13,636 chars with exactly one apostrophe, at offset 8123 inside
  `"title","Don't Disturb"`; the old `replaceAll` turned it into `"Don"t Disturb"` and lost all
  229 entries. Pinned by `src/lib/const-table-parser.test.ts` (8 tests), which asserts the old
  shortcut throws where the new parser succeeds.
- **The real selector is `app-post-alert-modal`.** Verified directly against the bundle:
  `"app-alert-modal"` appears **0** times in `docs/source/main.d6d3c112b59b7d0d.js`,
  `"app-post-alert-modal"` appears once, and `docs/source/components/app-post-alert-modal.component.css`
  exists. `scripts/pull-component-source.js:45` was corrected.

## 8. Still open

- **`scripts/extract-component-source.mjs:139` has the identical `replaceAll` defect** and still
  cannot decode `app-room`. Only the console script was fixed; the offline one was left alone
  because the two share no module (the console script is a paste-in IIFE with no exports).
- **`#screenTabs { height: 1px }` (`src/app.css:1022-1029`) is ours, not the capture's.** The
  captured `.screens-tabs` rule is only `border-color: transparent; position: relative; z-index: 1`
  - no height anywhere in `docs/source/styles.d622cb9ed2bbc221.css`. Measured consequence: the
    `ul` computes to 1px while both its `li` children are 40px, so the screen tab label AND the new
    control cluster overhang the video by 39px. It is also inconsistent with
    `#screensTabsContent { height: calc(100% - 82px) }`, which reserves 82px for two bars. Not
    changed here: it predates this work, it moves the video down 39px, and the coupled `calc` needs
    a captured screenshot to verify against.
- **The `ms-auto` slot holds more in the capture than is built here.** `app-presentationarea`'s
  `CSe` also renders a volume dropdown (consts 90-97: `#dropdownVolume`, `.volumeControl`, the
  `volCtrl` range input, mute/unmute, `.room-sound-options`) and a fullscreen toggle (const 98
  with `fa-compress-arrows-alt` / `fa-expand`, calling `fullScreenshare()`). Only the zoom and
  screenshot controls were moved, which is what this document scoped.
- **`viewerOnlyMode` is not modelled**, so the `ngClass` in §2's correction is not reproduced.
  Adding the class with nothing to drive it would be dead config.
