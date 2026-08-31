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
  import { scaleForZoomLevel, captureVideoImage, type Pan } from '#lib/screen-zoom.js';
  import {
    SCREEN_TOO_SMALL_DELAY_MS,
    SCREEN_TOO_SMALL_PIXELS
  } from '#lib/room/media-transport.svelte.js';
  import ScreenPaneStatus from './ScreenPaneStatus.svelte';
  import ScreenZoomControls from './ScreenZoomControls.svelte';

  type Props = {
    /** Producer id. Keys the pane, the video element and the tab that controls it. */
    id: string;
    /** The one-track MediaStream from `RemoteStream.stream`. */
    stream: MediaStream | null;
    active: boolean;
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
    /**
     * `mediaService.saveData` — the third term of the `<video>`'s `hidden` binding, and the gate on
     * the `Video Disabled` h3. Set from the AV settings modal; while it is on, `+page.svelte` never
     * consumes the producer, so `stream` is null here anyway — the class is bound to BOTH because
     * the reference binds both, and a screen already being watched when the switch is thrown keeps
     * its stream and is hidden rather than torn down.
     */
    saveData?: boolean;
    /**
     * The anti-leak watermark's text, or `null` for none — `#lib/user-id-watermark.ts`.
     *
     * THIS PANE HAD NO WATERMARK AT ALL until 2026-08-30, and it is the surface the setting is named
     * for: a room with `overlayUserIdOnScreenshare` on got the viewer's id burned over the MTX
     * stream player and nothing over the screenshare (`SV-SP-01`). The reference draws the same span
     * on both — `app-screenshare-view` const 9 is `[1,"overlay-userID-container"]`, rendered by
     * `Q0e` at byte 1,494,134 behind `O(10, !isPresenter && sessData.overlayUserIdOnScreenshare ?
     * 10 : -1)` at byte 1,502,175.
     *
     * Arrives already decided, like every other authority value here: the gate has two terms and an
     * empty-id case, and a copy of it per component is a copy that stops matching.
     */
    userIdWatermark?: string | null;
    /**
     * `SV-SP-02` — has THIS window detached this screen into a popout?
     *
     * ```js
     * function z0e(t,n){ … d(0,"h3",10), x("click", () => g().reAttachScren()),
     *   v(1," Screen Detached.. Click here to re-attach "), u() }             // byte 1,492,849
     * O(1, o.isDetached ? 1 : -1)                                            // byte 1,501,523
     * ```
     *
     * Const 10 is `[1,"mt-4","text-center",3,"click"]`. Distinct from `detached` above, which is the
     * POPOUT recognising itself — upstream's `isDetachedCtrl`. The two names differ by four
     * characters and mean opposite ends of the same gesture.
     */
    detachedHere?: boolean;
    /**
     * `SV-SP-03` — who is sharing, and what they called it.
     *
     * ```js
     * function q0e(t,n){ … d(0,"h3",3), T(1,"i",12), v(2) …
     *   ns(" Connecting To Screen of ", e.muser.mediaValue.name, "-",
     *      e.muser.mediaValue.screenName, " ") }                              // byte 1,493,278
     * ```
     *
     * Two fields and a hyphen between them, which is the capture's own separator. Optional because
     * the popout route renders a pane before the roster is known.
     */
    presenterName?: string;
    screenName?: string;
    /**
     * `o.isPresentingThisScreen` — the third term of the connecting gate.
     *
     * True for a screen this browser is sharing. Those render from the local capture here rather
     * than from a consumer, so they are connected the moment they exist and must never show a
     * spinner waiting for a producer that is not coming.
     */
    ownScreen?: boolean;
    /** `reAttachScren()` — the click on the blanked pane. */
    onreattach?: () => void;
    /** `SV-SP-04` — this consumer came up with no picture; ask for the producer again. */
    ontoosmall?: () => void;
    /** `i.tooSmallRetries = 0` — a real picture arrived, so the retry budget resets. */
    onsettled?: () => void;
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
    detachedHere = false,
    presenterName = '',
    screenName = '',
    ownScreen = false,
    onreattach,
    ontoosmall,
    onsettled,
    showZoomCtrl,
    zoomLevel,
    pan,
    detached = false,
    viewerOnlyMode = false,
    saveData = false,
    userIdWatermark = null,
    onpan,
    ontogglezoom,
    onzoomin,
    onzoomout,
    onreset
  }: Props = $props();

  /**
   * `o.isConnected` — the reference's own name for "the picture has arrived".
   *
   * A screen this browser is SHARING is connected by construction: those render from the local
   * capture rather than from a consumer, so `ownScreen` short-circuits the wait. Without that term a
   * presenter would watch a spinner over their own screen forever.
   */
  const connected = $derived(stream !== null || ownScreen);

  /**
   * `O(4, o.isConnected || o.isPresentingThisScreen || o.isDetached ? -1 : 4)` — byte 1,501,699.
   *
   * Read as the negation it is: the connecting line shows only while NONE of the three is true. The
   * detached term matters — a blanked pane already says what is happening and must not also claim to
   * be connecting.
   */
  const connecting = $derived(!connected && !detachedHere);

  /**
   * `SP2-01` — the `<video>`'s own hide condition, which is NOT the cluster's.
   *
   * ```js
   * z("controls",o.showControls)("ngClass",Kn(18,H0e,
   *   !o.isConnected||o.isPresentingThisScreen&&!o.localpreview||o.mediaService.saveData,
   *   o.appService.globals.viewerOnlyMode))                                   // byte 1,502,001
   * ```
   *
   * **There is no `isDetached` term here.** One derived used to feed this binding and the detached
   * cluster's, and the two are different expressions upstream — see `detachedClusterHidden` below,
   * whose leading `!e.isDetached` this one does not have. Sharing one made `detachedHere` UNHIDE the
   * picture: a source pane whose producer had gone, or whose viewer had switched Video Disabled on,
   * drew the captured `Screen Detached..` heading over a live-looking empty `<video>` instead of
   * over nothing.
   *
   * `isPresentingThisScreen && !localpreview` is false by construction here and is not modelled;
   * the note at the `<video>` records why, and `SP2-04` records the control it gates upstream —
   * `W0e`, the invitation to attach the local stream that this application never needs.
   */
  const pictureHidden = $derived(!connected || saveData);

  /**
   * `$0e = t => ({hidden: t})` over `!e.isDetached && (!e.isConnected || … || saveData)` —
   * byte 1,493,686, and `SV-SP-14`.
   *
   * The detached zoom cluster collapses under the conditions that hide the `<video>` AND the extra
   * `!isDetached` term, so a popout whose stream has not arrived does not float a magnifier over an
   * empty box. `!isDetached` is upstream's own leading term and is `!detachedHere` here for the
   * reason the two props record: this pane is the SOURCE window when that is true, and it draws no
   * cluster at all — the cluster is behind `detached`, the popout's own flag.
   */
  const detachedClusterHidden = $derived(!detachedHere && pictureHidden);

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
    /*
      `SV-SP-10` — NO volume and NO muted assignment. `muted` is a static attribute on the element,
      as it is in const 8, and this used to write the room's master volume onto a screenshare. See
      the note at the `<video>`.
    */

    if (stream) {
      node.play().catch((error: unknown) => {
        // Not fatal: the element keeps the stream and plays on the next gesture. Worth recording,
        // because "no picture" and "picture paused by policy" look identical on screen.
        console.warn(`[media] autoplay blocked for screen ${id}`, error);
      });
    }

    /*
      `SV-SP-04` — a consumer that negotiates and delivers no frames.

      ```js
      o.addEventListener("playing", () => { i.isConnected = !0;
        const s = o.videoWidth, r = o.videoHeight; …
        if ((s < 10 || r < 10) && i.tooSmallRetries < 3 && …) return i.tooSmallRetries++,
          void setTimeout(() => { i.mediaService.callScreenOfUserWEBRTC(this.muser) }, 3e3);
        i.tooSmallRetries = 0 })                                              // byte 1,499,022
      ```

      On screen a 0x0 video is an empty pane that never fills, which is indistinguishable from a
      presenter who has not started sharing — so nothing about it looks like a fault to report.

      **The measurement is taken after the delay rather than at `playing`, and that is the one
      deliberate change.** Upstream reads the size immediately and then has to exclude Firefox and
      Edge, because those report 0 for a frame or two after the event on the codepath it was written
      for. Reading it once the picture has had the same 3,000 ms to arrive makes those exclusions
      unnecessary rather than merely omitted — and a browser sniff that nothing needs is a branch
      with no consumer.

      The timer is cleared on teardown: a pane closed inside the window must not re-consume a
      producer nobody is watching.
    */
    let sizeCheck: ReturnType<typeof setTimeout> | undefined;
    const onPlaying = () => {
      globalThis.clearTimeout(sizeCheck);
      sizeCheck = globalThis.setTimeout(() => {
        const tooSmall =
          node.videoWidth < SCREEN_TOO_SMALL_PIXELS || node.videoHeight < SCREEN_TOO_SMALL_PIXELS;
        if (tooSmall) ontoosmall?.();
        else onsettled?.();
      }, SCREEN_TOO_SMALL_DELAY_MS);
    };
    node.addEventListener('playing', onPlaying);

    return () => {
      globalThis.clearTimeout(sizeCheck);
      node.removeEventListener('playing', onPlaying);
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
  class={['tab-pane fade', { show: active, active }]}
  role="tabpanel"
  aria-labelledby="{id}-tab"
>
  <!--
    `SP2-03` — the status headings are SIBLINGS of the pan container upstream, not contents of it,
    so they sit here rather than inside the transformed `div.pan-element`. The create block, the
    three gates and why the placement matters are all in `ScreenPaneStatus.svelte`.
  -->
  <ScreenPaneStatus
    {detachedHere}
    {saveData}
    {connecting}
    {presenterName}
    {screenName}
    {onreattach}
  />
  <!--
    `SP2-02` — `overflow-hidden`, the clip the zoom needs.

    Const 5 of `app-screenshare-view` is
    `["appDoubleClick","",1,"position-relative","h-inherit","overflow-hidden",3,"ngClass","id"]`
    (table at byte 1,500,337), and `.overflow-hidden{overflow:hidden!important}` is Bootstrap's own
    rule in the reference sheet (`styles.ee2a710065b60389.css` byte 294,501) and is already applied
    here (`css/complete-app-styles.css:4886`), so this class is not a new one. Without it a screen at
    `scalePerZoomLevel ** (level - 2)` above 1 — or dragged — paints outside its pane over the rest
    of the room, because the only transform is on `.pan-element` and nothing bounds it.

    OFF in the popout, and that is captured too rather than assumed: the popout's own component is
    `app-detached-screen`, whose const 0 is `[1,"detach-screen",…]` (byte 2,593,102), and the sheet
    carries `.detach-screen .overflow-hidden{overflow:initial!important}` (CSS byte 437,841, applied
    here at `css/complete-app-styles.css:6956`) — one rule whose only purpose is to un-clip this
    element in that window. Nothing in this application ever sets `.detach-screen`, so that rule
    would never fire; `detached` is the flag that answers the same question from data we own.
  -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    id="video-screen-container-{id}"
    class={[
      'video-screen-container',
      { 'screencast-pan': !showZoomCtrl, 'screencast-pan-grabbing': showZoomCtrl },
      { 'overflow-hidden': !detached }
    ]}
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
          * `mediaService.saveData` is now BOUND, and this comment twice said it could not be. It
            said "not modelled", then "the writer is uncaptured" — both wrong, and wrong for a
            structural reason worth keeping: the search had been the decoded COMPONENTS, and a
            service is not a component, so no component decode could ever have held it. Read out of
            the bundle directly: `toggleDisableVideo(){this.saveData=!this.saveData}` at
            `main.d6d3c112b59b7d0d.js` byte 1136736, called from an `<a>` in the AV settings modal
            at byte 2292763. DISTINCT from `preferences.disableVideo`, which is the USER settings
            modal's pane preference; both exist upstream with their own control. Note also that
            `app-presentationarea.full.js:2217` declares its OWN `this.saveData = !1`, a third
            symbol that file never reads again — the three are easy to mistake for each other.

          `z('controls', o.showControls)` on the line above is NOT reproduced, and that is a
          finding rather than an omission: `showControls` starts `!1` and its only writer is a click
          handler ON THIS ELEMENT (`…compiled.js:302-305`), which the same component's own
          `.webcamScreen { pointer-events: none }` (`:357`) makes unreachable. The attribute is
          therefore false for the life of the component upstream, and no control bar ever appears.
        -->
        <!--
          `SP2-03` moved the three status headings OUT of this element and up to the pane root,
          where the reference's create block has them. See the note above the first of them: they
          are siblings of the pan container upstream, so they are not inside the transform.
        -->
        <!--
          `SV-SP-10` — `muted` is a STATIC attribute here, as it is in const 8:

          ```js
          ["autoplay","autoplay","data-ng-dblclick","fullScreen()","playsinline","","muted","true",
           1,"webcamScreen",3,"click","controls","ngClass","id"]                // byte 1,500,765
          ```

          `muted` and `volume` sit BEFORE the `3` marker and the binding run after it holds only
          `click`, `controls`, `ngClass` and `id` — so the reference guarantees this element is
          silent, and `newScreenStream` re-asserts `i.muted = !0` twice more (byte 1,497,239).

          This bound both to the room's master volume. Harmless TODAY, because `addRemoteScreen`
          refuses any producer whose `kind !== 'video'` so the consumed stream carries no audio
          track — and that is one guard away from playing screenshare audio through an element the
          reference makes silent three separate ways. A screen is a picture here; the room's volume
          control is for the room's audio.

          **There is no `volume` prop and no `muted` prop on this component any more**, and that is
          the half of the fix that makes the second predicate unwritable rather than merely absent:
          a caller cannot pass what does not exist. `PresentationArea` passes neither.
        -->
        <video
          id="webcamScreen-{id}"
          class={['webcamScreen', { hidden: pictureHidden, 'viewer-only-screen-video': viewerOnlyMode }]}
          autoplay
          playsinline
          muted
          {@attach attachStream}
        ></video>
      </div>
    </div>

    <!--
      `Q0e` — the anti-leak watermark, byte 1,494,134. The same span `StreamingView` draws, from the
      same answer (`#lib/user-id-watermark.ts`), on the surface `overlayUserIdOnScreenshare` is named
      for and did not cover until 2026-08-30.

      INSIDE `#video-screen-container-{id}` rather than beside it, and both halves of that matter:
      the captured rule is `.video-screen-container { position: relative }`, which is what the
      overlay's own `position: relative; bottom: 50%` is measured against; and the container is what
      `toggleFullscreen` fullscreens, so the watermark goes fullscreen WITH the picture instead of
      being clipped away — which is precisely the state a recording would be made in.
    -->
    {#if userIdWatermark}
      <span class="overlay-userID-container"> {userIdWatermark} </span>
    {/if}

    <!--
      Only the popped-out window draws a cluster over the video. See the header comment: the
      captured template gates const 4 on `isDetachedCtrl`, and in the attached case renders
      nothing here at all.
    -->
    {#if detached}
      <!--
        `SV-SP-14` — `$0e = t => ({hidden: t})` at byte 1,492,696, bound at byte 1,493,972 over
        `!e.isDetached && (…)`. That leading term is what makes this expression DIFFERENT from the
        `<video>`'s, which is why `SP2-01` gives it its own derived rather than sharing one.
      -->
      <div class={['zoom-controls-container-detached', { hidden: detachedClusterHidden }]}>
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
