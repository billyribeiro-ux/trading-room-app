/**
 * The three decisions the closed-caption overlay makes, decoded from the PINNED v4 bundle.
 *
 * `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, `app-presentationarea` — the component
 * block at byte 1,994,075, its 292-entry const table bracket-walked from `consts:[[` at 1,994,264
 * to 2,014,221, and the overlay's compiled template `u2e` at 1,952,976.
 *
 * Naming the bundle matters here: `SpeechRecoOverlay.svelte` and its render test were both written
 * against `docs/source/main.d6d3c112b59b7d0d.js`, an earlier dump whose table has 286 entries. Every
 * const index in those two files is six low as a result, and two of the icon citations were wrong
 * even after that shift. The rendered markup was right; the citations pointed at other components'
 * consts, which is a footnote that sends the next reader to the wrong place.
 *
 * ## `hasSpeechRecognitionEntries()`, byte 1,958,755
 *
 * ```js
 * const e = this.isSpeechRecoOverlayEnabled(), i = this.getSpeechRecognitionHistory().length;
 * return !!e && (this.speechRecoHistoryMode ? i > 0
 *                                           : this.showSpeechRecognition && !!this.currentSpeechReco)
 * ```
 *
 * The viewer-preference half (`e`) is the call site's own `{#if subtitles}`; what belongs to the
 * overlay is the second half, and the two branches differ. History mode does not need a live
 * caption, it needs history — a flat "is there a caption" closed the transcript the moment the room
 * went quiet.
 *
 * ## `onSpeechRecoScroll(e)`, byte 1,951,628
 *
 * ```js
 * const i = e.target;
 * i && (this.speechRecoAutoScroll = i.scrollHeight - i.scrollTop - i.clientHeight < 10)
 * ```
 *
 * Scrolling up to read pins the view; scrolling back to the bottom re-arms it. The slack is ten
 * pixels and it is the capture's, not a round number chosen here.
 *
 * ## `{{ entry.timestamp | date:'shortTime' }}`
 *
 * Angular's `shortTime` is `h:mm a` — no leading zero on the hour. `hour: '2-digit'` renders
 * "01:30 PM" where the capture renders "1:30 PM", so the hour is `numeric`.
 */

/** The capture's own ten pixels. */
export const AUTO_SCROLL_SLACK = 10;

/** Whether a scroll container is close enough to its bottom to keep following new lines. */
export function isAtBottom(target: {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}): boolean {
  return target.scrollHeight - target.scrollTop - target.clientHeight < AUTO_SCROLL_SLACK;
}

/** The second half of `hasSpeechRecognitionEntries()` — the half the overlay owns. */
export function captionsVisible(
  historyMode: boolean,
  historyLength: number,
  hasCurrent: boolean
): boolean {
  return historyMode ? historyLength > 0 : hasCurrent;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** `date:'shortTime'`. */
export function formatCaptionTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp));
}

/**
 * SRO-04 — both dismissal handlers take the event upstream, and the first thing each does is stop
 * it.
 *
 * ```js
 * hideSpeechRecognition(e){ e.preventDefault(), e.stopPropagation(), … }   // byte 1,957,104
 * toggleSpeechRecoHistory(e){ e.preventDefault(), e.stopPropagation(), … } // byte 1,957,875
 * ```
 *
 * The overlay is `position: absolute; z-index: 9999` lying across the bottom of the presentation
 * surface, so a click allowed to bubble reaches whatever is under it. The component bound its
 * callbacks directly, which let every dismissal through as a click on the presentation area as well.
 *
 * **The transcript button deliberately does not get this.** Its handler is
 * `x("click", function(){ return D(e), E(g(2).openTranscriptPage()) })` — no event argument at all,
 * because it opens a new window and there is nothing to suppress. Reproducing the suppression there
 * too would be tidiness overruling the capture on a control where the capture is explicit.
 *
 * Typed structurally rather than as `MouseEvent` so this stays testable without a DOM.
 */
export function haltCaptionDismissal(event: {
  preventDefault: () => void;
  stopPropagation: () => void;
}): void {
  event.preventDefault();
  event.stopPropagation();
}
