<script lang="ts">
  /**
   * The video pane behind one screen tab.
   *
   * Captured shape, from a live admin room:
   *
   *   div.video-screen-container > video#webcamScreen-6a300cc493c3cb36774d1c0d.webcamScreen
   *
   * with the id shared by the tab anchor (`{id}-tab`) and the pane (`aria-controls="{id}"`), so a
   * screen's tab, pane and video element are all keyed by the same producer id.
   *
   * The real sizing rule was found in the component's OWN stylesheet,
   * `docs/source/components/app-screenshare-view.component.css`, after an earlier note in this file
   * wrongly claimed `.webcamScreen { max-height: 100vh !important }` was it and that nothing needed
   * declaring here:
   *
   *   .webcamScreen { width: 100%; height: 100%; object-fit: contain;
   *                   vertical-align: top; pointer-events: none }
   *
   * `object-fit: contain` is what stops a full-resolution capture being cut off, and
   * `pointer-events: none` is load-bearing rather than cosmetic - the video must not swallow the
   * drag, or panning could never start on top of it.
   *
   * Also captured and applied below:
   *
   *   .video-screen-container   { position: relative; top: 0; left: 0; z-index: 1999;
   *                               width: inherit; height: inherit }
   *   .viewer-only-screen-tab   { padding-bottom: 5px; height: 100% !important;
   *                               max-height: calc(-40px + 100vh) !important }
   *   .viewer-only-screen-video { max-height: 100% !important }
   *   .screencast-pan-grabbing  { cursor: grabbing }
   *   .zoom-controls-container-detached { background-color: transparent; z-index: 10; opacity: .5;
   *                               position: absolute; right: 5px; top: 5px; text-align: right }
   *
   * The control cluster this component used to render unconditionally now belongs to the tab bar.
   * `app-screenshare-view` renders a cluster ONLY when the screen is popped out into its own
   * window - its template gates the whole thing on `isDetachedCtrl`
   * (`docs/source/components/app-screenshare-view.compiled.js:326`):
   *
   *   O(5, o.isDetachedCtrl ? 5 : -1)
   *
   * and const 4 of that component's table is `class="zoom-controls-container-detached"`. In the
   * ordinary attached case the captured component renders NO cluster at all; the tab bar's
   * `li.nav-item.ms-auto` slot carries it. See `ScreenZoomControls.svelte` for both arrangements
   * and `src/lib/screen-zoom.ts` for the state model.
   */
  import { scaleForZoomLevel, captureVideoImage, type Pan } from '$lib/screen-zoom';
  import ScreenZoomControls from './ScreenZoomControls.svelte';

  type Props = {
    /** Producer id. Keys the pane, the video element and the tab that controls it. */
    id: string;
    /** The one-track MediaStream from `RemoteStream.stream`. */
    stream: MediaStream | null;
    active: boolean;
    /** Volume 0-100, mirroring the room's master control. */
    volume?: number;
    muted?: boolean;
    /**
     * Zoom mode. Global rather than per screen, because the capture broadcasts it by value to
     * every view - see `src/lib/screen-zoom.ts`. Gates the drag, exactly as the captured
     * `noDragFromElementClass: "screencast-pan"` does.
     */
    showZoomCtrl: boolean;
    /** The shared zoom level. Also global, for the same reason. */
    zoomLevel: number;
    /** This screen's own pan offset. Per screen, because the drag is. */
    pan: Pan;
    /** Is this window a detached screen popout? Renders the captured `-detached` cluster. */
    detached?: boolean;
    /**
     * `appService.globals.viewerOnlyMode` — the `vo` query parameter.
     *
     * Two captured `ngClass` bindings depend on it and BOTH were static classes here, so viewer-only
     * geometry was applied to every room:
     * `H0e = (t, n) => ({hidden: t, 'viewer-only-screen-video': n})` on the `<video>`
     * (`docs/source/components/app-screenshare-view.render-helpers.js:2`, bound at
     * `…compiled.js:335-345`) and `jCe = (t) => ({'viewer-only-screen-tab': t})` on the pane's
     * strip (`app-presentationarea.render-helpers.js:9, 491`).
     */
    viewerOnlyMode?: boolean;
    /** Reports a drag upward; the parent owns the per-screen pan map. */
    onpan?: (x: number, y: number) => void;
    ontogglezoom?: () => void;
    onzoomin?: () => void;
    onzoomout?: () => void;
    onreset?: () => void;
  };

  let {
    id,
    stream,
    active,
    volume = 100,
    muted = false,
    showZoomCtrl,
    zoomLevel,
    pan,
    detached = false,
    viewerOnlyMode = false,
    onpan,
    ontogglezoom,
    onzoomin,
    onzoomout,
    onreset
  }: Props = $props();

  /**
   * Dragging is gated behind the zoom toggle, which is the part the class names give away. The
   * compiled template binds `V0e = (t, n) => ({"screencast-pan": t, "screencast-pan-grabbing": n})`
   * as `(!showZoomCtrl, showZoomCtrl)`, and `screencast-pan` is the config's
   * `noDragFromElementClass` - the class that BLOCKS a drag. So with zoom off the screen does not
   * pan; turning zoom on removes the blocker and switches the cursor to `grabbing`.
   *
   * The captured config also sets `zoomOnMouseWheel: !1` and `zoomOnDoubleClick: !1`. Both `false`s
   * are deliberate and are why the gestures are not what you might assume: the wheel scrolls the
   * page rather than zooming, and a double-click maximises rather than zooming, which is consistent
   * with `onDoubleClicked()` below rather than in conflict with it.
   */
  const scale = $derived(scaleForZoomLevel(zoomLevel));

  /**
   * The detached cluster's own gate. The capture keeps a SECOND boolean for it
   * (`app-screenshare-view.compiled.js:18,76-80`):
   *
   * ```js
   * this.showZoomCtrlDetached = !1;
   * togglePanZoomDetached() { this.showZoomCtrlDetached = !this.showZoomCtrlDetached;
   *                           this.showZoomCtrl = !this.showZoomCtrl;
   *                           this.panZoomReset() }
   * ```
   *
   * so the popout's magnifier flips its own trio AND the shared zoom mode, then resets the view.
   */
  let showZoomCtrlDetached = $state(false);

  function togglePanZoomDetached() {
    showZoomCtrlDetached = !showZoomCtrlDetached;
    // The parent flips the shared `showZoomCtrl` and runs the reset, matching the two remaining
    // statements of the captured method.
    ontogglezoom?.();
  }

  let dragging = $state(false);
  let dragOriginX = 0;
  let dragOriginY = 0;

  function onPointerDown(event: PointerEvent) {
    // `noDragFromElementClass: "screencast-pan"` - no panning while zoom mode is off.
    if (!showZoomCtrl || event.button !== 0) return;
    dragging = true;
    dragOriginX = event.clientX - pan.x;
    dragOriginY = event.clientY - pan.y;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    onpan?.(event.clientX - dragOriginX, event.clientY - dragOriginY);
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  /**
   * Double-click to maximise, transcribed from the capture's own directive:
   *
   * ```js
   * onDoubleClicked() {
   *   let e = document.querySelector(`#video-screen-container-${this.id}`);
   *   document.fullscreenElement
   *     ? (document.exitFullscreen ? document.exitFullscreen() : …)
   *     : (e.requestFullscreen ? e.requestFullscreen() : e.webkitRequestFullscreen ? … )
   * }
   * ```
   *
   * Note what it targets: `#video-screen-container-{id}`, an **id**. This component carried
   * `video-screen-container` as a bare class with no id, so the capture's own selector would have
   * found nothing here and there was no way to maximise a screen at all.
   *
   * The container is fullscreened rather than the `<video>` because that is what the capture does -
   * and it is the better choice anyway, since anything else drawn over the screen goes fullscreen
   * with it instead of being clipped away.
   */
  function toggleFullscreen(node: HTMLElement) {
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    void node.requestFullscreen?.().catch((error: unknown) => {
      // Fullscreen is refused without a user gesture and inside some sandboxed frames. Say so
      // rather than leaving a double-click that silently does nothing.
      console.warn(`[media] could not maximise screen ${id}`, error);
    });
  }

  /**
   * Attaches the stream and starts playback.
   *
   * `srcObject` cannot be set from markup - it takes a MediaStream object, not a URL - so it has to
   * be assigned to the element. Autoplay is the reason `muted` matters: Chrome blocks audible
   * autoplay without a user gesture, and a screen share arriving before the viewer has clicked
   * anything would otherwise sit frozen on its first frame. A rejected play() is surfaced rather
   * than swallowed, because a silently paused video looks identical to a broken producer.
   */
  function attachStream(node: HTMLVideoElement) {
    // Read the reactive props HERE, in the attachment body. An attachment runs inside an effect and
    // re-runs when state it reads changes; the function it RETURNS is the teardown, not an update.
    // Putting this work in the returned function meant it only ever ran on destroy - the element
    // never got a srcObject, the tab appeared with `hasSrc: false`, and nothing threw.
    if (node.srcObject !== stream) node.srcObject = stream;
    node.volume = Math.min(1, Math.max(0, volume / 100));
    node.muted = muted;

    if (stream) {
      node.play().catch((error: unknown) => {
        // Not fatal: the element keeps the stream and plays on the next gesture. Worth recording,
        // because "no picture" and "picture paused by policy" look identical on screen.
        console.warn(`[media] autoplay blocked for screen ${id}`, error);
      });
    }

    return () => {
      // Release the stream so a removed pane cannot hold a decoder open.
      node.pause();
      node.srcObject = null;
    };
  }
</script>

<!--
  `tab-pane fade` with `show active` on the selected one is the same pattern `#mainTabsContent`
  already uses for Screens/Notes/Files, and it is what `data-bs-target="#{id}"` on the tab drives.
-->
<!--
  `viewer-only-screen-tab` does NOT belong on this pane, and it used to be here as a STATIC class.

  `SSe` renders this element from const 73,
  `['role','tabpanel',1,'tab-pane','fade',3,'ngClass','id']`, and its only `ngClass` is
  `ut(5, Hr, i.selectedScreenShareTab == e._id)` with `Hr = (t) => ({'show active': t})`
  (`app-presentationarea.render-helpers.js:8, 461-469`). There is no second class here in the
  reference, conditional or otherwise.

  The `viewer-only-screen-tab` binding lands on `div#screensTabsContent` — const 72, node 5 of
  `wSe` — which `+page.svelte` renders. Written here it applied
  `height: 100% !important; max-height: calc(-40px + 100vh) !important`
  (`css/complete-app-styles.css:6978`) to every screen pane in every room; moved here conditionally
  it would still be an element the reference never puts it on.
-->
<div
  {id}
  class="tab-pane fade"
  class:show={active}
  class:active
  role="tabpanel"
  aria-labelledby="{id}-tab"
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="video-screen-container-{id}"
    class="video-screen-container"
    class:screencast-pan={!showZoomCtrl}
    class:screencast-pan-grabbing={showZoomCtrl}
    ondblclick={(event) => toggleFullscreen(event.currentTarget)}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <!--
      `div.pan-zoom-frame > div.pan-element` is the captured wrapper pair, and it is what carries
      the width the video needs:
        div.pan-zoom-frame, div.panElement          { position: static !important }
        div.pan-zoom-frame, div.pan-element,
        div.zoom-element                            { height: inherit !important; width: 100% }
    -->
    <div class="pan-zoom-frame">
      <div
        class="pan-element"
        style="transform: translate({pan.x}px, {pan.y}px) scale({scale}); transform-origin: center center;"
      >
        <!--
          `H0e = (t, n) => ({hidden: t, 'viewer-only-screen-video': n})`
          (`docs/source/components/app-screenshare-view.render-helpers.js:2`), bound at
          `…compiled.js:335-345` as

            hidden:                    !o.isConnected
                                       || (o.isPresentingThisScreen && !o.localpreview)
                                       || o.mediaService.saveData
            viewer-only-screen-video:  o.appService.globals.viewerOnlyMode

          BOTH arguments, because wiring one of a two-argument function and quoting the whole of it
          is how a gap gets sealed behind evidence that looks complete.

          * `!isConnected` → `stream === null` here. The consumer is created before the picture
            arrives, so without this a tab shows a black box instead of nothing.
          * `isPresentingThisScreen && !localpreview` is FALSE by construction in this app: our own
            screens render from the local capture (`addLocalScreen` in `+page.svelte`), i.e. we
            always local-preview, so the term can never be true here. Not modelled, and it would be
            dead if it were.
          * `mediaService.saveData` is still not modelled, and the reason is narrower than it used
            to read here. The VIEWER-FACING half of "Video off to preserve data" now exists — it is
            `preferences.disableVideo`, and `+page.svelte` gates the whole screens pane on it, so
            this component never mounts while it is on. `saveData` is a different symbol: it lives
            on the media service, every site in the decoded component tree READS it
            (`app-screenshare-view.compiled.js:313,342`, `app-av-settings-modal.compiled.js:239`),
            and no writer for it appears anywhere in that tree — the service itself is inside the
            minified `main.d6d3c112b59b7d0d.js`, so whether anything sets it is genuinely
            uncaptured rather than known to be nothing. Note also that
            `app-presentationarea.full.js:2217` declares its OWN `this.saveData = !1`, which is a
            separate field that file never reads again; the two are easy to mistake for each other.

          `z('controls', o.showControls)` on the line above is NOT reproduced, and that is a
          finding rather than an omission: `showControls` starts `!1` and its only writer is a click
          handler ON THIS ELEMENT (`…compiled.js:302-305`), which the same component's own
          `.webcamScreen { pointer-events: none }` (`:357`) makes unreachable. The attribute is
          therefore false for the life of the component upstream, and no control bar ever appears.
        -->
        <video
          id="webcamScreen-{id}"
          class="webcamScreen"
          class:hidden={stream === null}
          class:viewer-only-screen-video={viewerOnlyMode}
          autoplay
          playsinline
          {@attach attachStream}
        ></video>
      </div>
    </div>

    <!--
      Only the popped-out window draws a cluster over the video. See the header comment: the
      captured template gates const 4 on `isDetachedCtrl`, and in the attached case renders
      nothing here at all.
    -->
    {#if detached}
      <div class="zoom-controls-container-detached">
        <ScreenZoomControls
          variant="detached"
          showZoomCtrl={showZoomCtrlDetached}
          ontoggle={togglePanZoomDetached}
          oncapture={() => captureVideoImage(id)}
          onzoomin={() => onzoomin?.()}
          onzoomout={() => onzoomout?.()}
          onreset={() => onreset?.()}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  /*
   * The captured component's own rule, from
   * `docs/source/components/app-screenshare-view.component.css`:
   *
   *   .webcamScreen { width: 100%; height: 100%; object-fit: contain;
   *                   vertical-align: top; pointer-events: none }
   *
   * It lives here rather than in the global sheet because that is where the capture keeps it - it
   * is component-scoped there too (`[_ngcontent-%COMP%]`), which is exactly why grepping the
   * global stylesheet for `.webcamScreen` turned up only `.detach-screen .webcamScreen` and led to
   * the conclusion that no sizing rule existed. It does; it was just scoped.
   *
   * `object-fit: contain` is the anti-clipping rule: the video letterboxes into its box instead of
   * laying out at the capture's intrinsic resolution and overflowing. `pointer-events: none` keeps
   * the video from swallowing the drag that pans it.
   */
  .webcamScreen {
    width: 100%;
    height: 100%;
    object-fit: contain;
    vertical-align: top;
    pointer-events: none;
  }

  /*
   * `.hidden { display: none }` — the other half of `H0e`, from the same component stylesheet
   * (`docs/source/components/app-screenshare-view.compiled.js:357`). Scoped there too, which is why
   * the four `.hidden` rules in the applied global sheet are all other components' copies and none
   * of them reaches this element.
   */
  .hidden {
    display: none;
  }

  /* `div.pan-zoom-frame, div.pan-element { height: inherit !important; width: 100% }` */
  .pan-zoom-frame,
  .pan-element {
    height: inherit;
    width: 100%;
  }

  /* Panning must not select the page text under the cursor while dragging. */
  .screencast-pan-grabbing {
    user-select: none;
  }

  /*
   * Verbatim from `docs/source/components/app-screenshare-view.component.css`:
   *
   *   .zoom-controls-container-detached { background-color: transparent; z-index: 10; opacity: .5;
   *                                       position: absolute; right: 5px; top: 5px;
   *                                       text-align: right }
   *
   * It is declared here, not in `src/lib/styles/captured-runtime-components.css`, because that file
   * is GENERATED from `css/complete-app-styles.css` and this rule is not in that sheet - it only
   * exists in the component stylesheet. Same reason `.webcamScreen` is declared here.
   *
   * The rule this replaced - `.zoom-controls-container { position: absolute; top: 0; left: 0 }` -
   * was ours, not the capture's, and it is what pinned the magnifier over the screen tab's gear.
   * The unsuffixed `.zoom-controls-container` belongs to `app-presentationarea`
   * (`css/complete-app-styles.css`, scope `_ngcontent-ng-c2028866615`) and is already applied
   * globally to the tab bar's copy.
   */
  .zoom-controls-container-detached {
    background-color: transparent;
    z-index: 10;
    opacity: 0.5;
    position: absolute;
    right: 5px;
    top: 5px;
    text-align: right;
  }
</style>
