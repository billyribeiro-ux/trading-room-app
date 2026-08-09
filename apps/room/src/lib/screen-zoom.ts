/**
 * The screen pan/zoom model, transcribed from the capture.
 *
 * It lives in one module because the capture splits the same model across TWO components, and
 * both halves are reproduced here:
 *
 *   * `app-presentationarea` owns the STATE and the buttons. Its constructor carries
 *     `this.showZoomCtrl = !1` and its methods are
 *     (`docs/source/components/app-presentationarea.compiled.js:480-499`):
 *
 *     ```js
 *     togglePanZoom()     { this.showZoomCtrl = !this.showZoomCtrl;
 *                           guiEventBus.emit("togglePanZoom", this.showZoomCtrl) }
 *     panZoomIn()         { guiEventBus.emit("panZoomIn") }
 *     panZoomOut()        { guiEventBus.emit("panZoomOut") }
 *     panZoomReset()      { guiEventBus.emit("panZoomReset") }
 *     captureVideoImage() { guiEventBus.emit("captureVideoImage",
 *                             { tabType: this.selectedMainTab,
 *                               screenId: this.selectedScreenShareTab,
 *                               streamId: this.selectedMTXStreamTab }) }
 *     ```
 *
 *   * `app-screenshare-view` owns the TRANSFORM and subscribes to those four events
 *     (`docs/source/components/app-screenshare-view.compiled.js:45-58`):
 *
 *     ```js
 *     subscribe("togglePanZoom",     i => { this.showZoomCtrl = i; this.togglePanZoom() })
 *     subscribe("panZoomIn",         () => this.panZoomIn())
 *     subscribe("panZoomOut",        () => this.panZoomOut())
 *     subscribe("panZoomReset",      () => this.panZoomReset())
 *     subscribe("captureVideoImage", i  => this.captureVideoImage(i))
 *     ```
 *
 * Two consequences of that wiring decide the shape of the state, and neither is a preference:
 *
 *   1. **Zoom is GLOBAL, not per screen.** `panZoomIn`/`panZoomOut`/`panZoomReset` are broadcast
 *      with no screen id and every subscribed view acts on them, so all screens hold the same
 *      zoom level. `showZoomCtrl` is likewise a single boolean on the presentation area, pushed
 *      to every view by value.
 *   2. **Only the SCREENSHOT is addressed.** `captureVideoImage` carries a payload, and the view
 *      filters it (`app-screenshare-view.compiled.js:90`):
 *      `if (e && ("presAreaTabs-screens" !== e.tabType || e.screenId !== this.muser._id)) return`
 *      so exactly one screen answers the camera button.
 *
 * Panning is the exception and stays per screen: the drag is handled by the pan library on the
 * view's own element, so dragging screen A cannot move screen B. A broadcast `resetView()` still
 * clears every screen's pan, which is why {@link NEUTRAL_PAN} is applied to all of them on reset.
 *
 * The configuration itself, from the captured component
 * (`app-screenshare-view.compiled.js:19`):
 *
 * ```js
 * this.panZoomConfig = new Kse({
 *   zoomOnMouseWheel: !1, zoomOnDoubleClick: !1,
 *   noDragFromElementClass: "screencast-pan",
 *   zoomLevels: 20, initialZoomLevel: 2, scalePerZoomLevel: 1.1
 * })
 * ```
 */
export const ZOOM_LEVELS = 20;
export const INITIAL_ZOOM_LEVEL = 2;
export const SCALE_PER_ZOOM_LEVEL = 1.1;

/** A screen's pan offset in CSS pixels. Per screen, because the drag is. */
export type Pan = { x: number; y: number };

/** `panZoomAPI.resetView()`'s translation half. */
export const NEUTRAL_PAN: Pan = { x: 0, y: 0 };

/**
 * `initialZoomLevel: 2` is treated as the neutral level - scale 1, the screen exactly fitting its
 * pane - with the 20 levels running either side of it.
 *
 * An honest note on why this is a reading rather than a transcription: the scale a level maps to
 * belongs to the third-party pan/zoom library the capture configures, not to the captured code,
 * so the library's own `neutralZoomLevel` convention is not in any artifact here. Anchoring
 * neutral at the stated initial level is the reading that makes the configured numbers
 * self-consistent - the view starts unscaled, and zooming out is possible - and it uses the
 * captured `zoomLevels` and `scalePerZoomLevel` exactly.
 */
export function scaleForZoomLevel(level: number): number {
  return SCALE_PER_ZOOM_LEVEL ** (level - INITIAL_ZOOM_LEVEL);
}

/** `panZoomAPI.zoomIn()` */
export function zoomIn(level: number): number {
  return Math.min(ZOOM_LEVELS - 1, level + 1);
}

/** `panZoomAPI.zoomOut()` */
export function zoomOut(level: number): number {
  return Math.max(0, level - 1);
}

/**
 * `captureVideoImage()` - the camera button, transcribed from the capture
 * (`app-screenshare-view.compiled.js:90`):
 *
 * ```js
 * captureVideoImage(e = null) {
 *   if (e && ("presAreaTabs-screens" !== e.tabType || e.screenId !== this.muser._id)) return;
 *   const i = document.querySelector(`#webcamScreen-${this.muser._id}`); if (!i) return;
 *   const o = document.createElement("canvas"), s = o.getContext("2d"),
 *         r = document.createElement("a");
 *   let a, l, c;
 *   c = Number(i.videoWidth / i.videoHeight);
 *   a = Number(i.videoWidth - 100);
 *   l = Number(a / c);
 *   o.width = a; o.height = l;
 *   s.fillRect(0, 0, a, l); s.drawImage(i, 0, 0, a, l);
 *   r.download = `screenshot-${this.muser._id}-${(new Date).getTime()}.png`;
 *   r.href = o.toDataURL(); r.click();
 * }
 * ```
 *
 * The screen id is a parameter here rather than `this.muser._id` because the capture reaches this
 * code by two different routes, and they resolve DIFFERENT screens:
 *
 *   * the tab bar's camera emits the payload, so the guard above lets only the SELECTED screen
 *     through;
 *   * the detached window's camera calls it with no argument
 *     (`app-screenshare-view.render-helpers.js:85`), so the guard is skipped and the pane
 *     captures ITS OWN screen.
 *
 * Three details are copied rather than improved, because they are observable:
 *
 *   * the canvas is `videoWidth - 100` wide, not `videoWidth`. It looks like a mistake and may
 *     well be one, but it sets the saved file's dimensions, so changing it changes the output.
 *   * `fillRect` runs before `drawImage`. With no `fillStyle` set the default is opaque black,
 *     which is what fills the letterbox bars of a non-matching aspect ratio - without it they
 *     would be transparent, and a PNG with transparent bars pasted into a document looks broken.
 *   * the filename is `screenshot-{id}-{epoch-ms}.png` and `toDataURL()` defaults to PNG.
 *
 * `videoWidth` is 0 until the first frame decodes, so a click before then would produce a
 * -100-wide canvas and throw. That case is refused rather than reproduced: the capture would
 * simply have failed, and failing quietly is worse than not offering the button's effect.
 */
export function captureVideoImage(screenId: string): void {
  const video = document.querySelector<HTMLVideoElement>(`#webcamScreen-${screenId}`);
  if (!video || !video.videoWidth || !video.videoHeight) {
    console.warn(`[media] no decoded frame yet for screen ${screenId}; screenshot skipped`);
    return;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const aspect = video.videoWidth / video.videoHeight;
  const width = video.videoWidth - 100;
  const height = width / aspect;

  canvas.width = width;
  canvas.height = height;
  context.fillRect(0, 0, width, height);
  context.drawImage(video, 0, 0, width, height);

  const link = document.createElement('a');
  link.download = `screenshot-${screenId}-${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
}
