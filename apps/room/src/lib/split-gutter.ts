/**
 * The main gutter's double-click, and the presentation collapse it drives.
 *
 * Extracted rather than left inline in `+page.svelte` for the reason `roster-gates.ts` and
 * `files-gates.ts` are: a rule that lives inside a 10,000-line component can be read but not
 * DRIVEN, and this one is a two-click state machine whose whole content is timing. Here a test can
 * click it.
 *
 * The reference binds `gutterDblClick` to `hideShowPresentationArea()` on the outer split in both
 * layouts — `app-room.render-helpers.js:1622-1623` (desktop, `j4e`) and `:1787-1788` (mobile,
 * `K4e`) — and configures the window with `gutterDblClickDuration: '400'`, const 8 of
 * `app-room.compiled.js:1294-1304`. This room has rendered that attribute since the split was
 * written and had NO handler behind it: `hideShowPresentationArea` had zero occurrences, so
 * double-clicking the gutter did nothing at all. Dead scaffolding by this repository's own
 * definition — a control whose configuration ships and whose behaviour does not.
 */

/**
 * `gutterDblClickDuration="400"` — the reference's number, read off const 8, not chosen here.
 *
 * Not delegated to the browser's own `dblclick`: that event's threshold is the platform's, and
 * honouring macOS's value while rendering a 400ms attribute would leave the attribute decorative in
 * a second way.
 */
export const GUTTER_DOUBLE_CLICK_MS = 400;

/**
 * The two geometries `hideShowPresentationArea` moves between, as CHAT/ALERTS fractions.
 *
 * Upstream keeps a pair that sums to 100 — `presAreaSize` and `chatAlertsSize`. This room keeps one
 * number, `mainSplit`, which is the chat/alerts side, so `chatAlertsSize / 100` is the whole
 * mapping: 100/0 collapsed, 30/70 restored.
 */
export const PRESENTATION_COLLAPSED_SPLIT = 1;
export const PRESENTATION_RESTORED_SPLIT = 0.3;

/**
 * `hideShowPresentationArea()` — `app-room.full.js:2693-2698`:
 *
 * ```js
 * this.presAreaSize > 0
 *   ? ((this.presAreaSize = 0), (this.chatAlertsSize = 100))
 *   : ((this.presAreaSize = 70), (this.chatAlertsSize = 30)),
 *   this.printSizes();
 * ```
 *
 * The asymmetry is the reference's and is kept deliberately: it collapses to exactly 0 but restores
 * to 70/30 rather than to whatever the user last dragged, so the second double-click is a reset as
 * much as an undo. Restoring the dragged size would be the friendlier behaviour and a divergence.
 *
 * `printSizes()` is a `console.log` and nothing else (`:2708-2712`), which is why nothing here
 * persists — unlike `dragEnd`, which does write.
 */
export function togglePresentationSplit(mainSplit: number): number {
  const presentationSize = (1 - mainSplit) * 100;
  return presentationSize > 0 ? PRESENTATION_COLLAPSED_SPLIT : PRESENTATION_RESTORED_SPLIT;
}

/**
 * "No click is pending", and NOT `0`.
 *
 * `0` was the obvious sentinel and it is wrong, which a test caught rather than a reader:
 * `performance.now()` is measured from page load, so a real first click at t=350ms is 350ms away
 * from a sentinel of 0 — inside the window — and the room would collapse its presentation area on
 * the first single click anybody made in the first 400ms of the session. The same collision
 * reappears after every completed double-click, because that resets the timestamp too.
 *
 * `-Infinity` is the only value no elapsed time can fall within.
 */
export const NO_PENDING_CLICK = Number.NEGATIVE_INFINITY;

/** What a pointer release on the gutter turned out to be. */
export interface GutterRelease {
  /** True when this release completed a double-click inside the window. */
  readonly doubleClick: boolean;
  /** The timestamp to carry into the next release. */
  readonly lastClickAt: number;
}

/**
 * Decide whether a pointer release on the main gutter completed a double-click.
 *
 * `moved` is what separates a click from a drag, and it is not optional: `beginSplit` calls
 * `preventDefault()` on pointerdown, so native `click` events are not reliable on this element, and
 * counting pointer releases alone would fire the toggle on two quick drags — which is a resize
 * followed by the room throwing that resize away.
 *
 * The timestamp resets to {@link NO_PENDING_CLICK} on a completed double-click rather than carrying
 * forward, so three clicks are one double-click and a leftover rather than two overlapping ones.
 */
export function gutterRelease(lastClickAt: number, now: number, moved: boolean): GutterRelease {
  if (moved) return { doubleClick: false, lastClickAt };
  if (now - lastClickAt <= GUTTER_DOUBLE_CLICK_MS) {
    return { doubleClick: true, lastClickAt: NO_PENDING_CLICK };
  }
  return { doubleClick: false, lastClickAt: now };
}
