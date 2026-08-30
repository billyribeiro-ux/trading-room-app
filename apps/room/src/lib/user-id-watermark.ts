/**
 * `overlayUserIdOnScreenshare` — the viewer's own id burned over the picture, so a leaked recording
 * names who leaked it.
 *
 * ## The defect this closes, and it was on the surface the setting is NAMED for
 *
 * The room has carried this overlay on `StreamingView` — the MTX/OBS stream player — since it was
 * built, and **not on `ScreenPane`**, which is where a presenter's screenshare renders. A room that
 * turned the setting on got the watermark over a restreamed feed and nothing at all over the
 * screenshare. `SV-SP-01`.
 *
 * The reference puts it on both. `app-screenshare-view`'s const 9 is `[1,"overlay-userID-container"]`
 * and its render helper is the same span:
 *
 * ```js
 * function Q0e(t, n) {                                                       // byte 1,494,134
 *   if (1 & t && (d(0, "span", 9), v(1), u()),
 *       2 & t) { const e = g(); m(), Ne(" ", e.appService.globals.user.userXrefID, " ") }
 * }
 * ```
 *
 * mounted behind
 *
 * ```js
 * O(10, !o.appService.globals.isPresenter
 *       && o.appService.globals.sessData.overlayUserIdOnScreenshare ? 10 : -1)  // byte 1,502,175
 * ```
 *
 * ## Why the rule is a module and not two expressions
 *
 * Because it was one expression and the second copy is exactly what did not get written. Two
 * components render a video that this setting is supposed to cover; a gate spelled out at each of
 * them is a gate one of them will stop having, which is the state this module was written to fix.
 * It answers the whole question — *what does this viewer see burned over this picture* — so a caller
 * cannot hold half of it.
 *
 * ## PRESENTERS ARE EXEMPT, and that is not a courtesy
 *
 * `!isPresenter` is the reference's own first term. The overlay exists to trace a leak back to the
 * account that made it, and the presenter is the person whose material it is — watermarking their
 * own screen with their own id protects nobody and obstructs the one viewer who has to read it.
 *
 * ## It is a deterrent, not a control
 *
 * Stated plainly because the opposite is easy to assume in a room that carries real money: this is
 * a `<span>` over a `<video>` in the viewer's own browser. Anyone who can open developer tools can
 * remove it, and nothing here should ever be described as preventing a leak. What it does is make a
 * casual screen recording carry the recorder's account id, which is a different and much weaker
 * claim — and the only one this shape can support.
 */

export interface UserIdWatermarkInput {
  /**
   * The viewer's ROLE, not any media elevation.
   *
   * A member handed mic and screen becomes a limited presenter for media purposes and is still
   * somebody the room is watermarking — see `media-elevation.ts` for why the two are never the same
   * boolean.
   */
  readonly viewerIsPresenter: boolean;
  /** `sessData.overlayUserIdOnScreenshare`, already resolved `=== true` by the caller. */
  readonly overlayUserIdOnScreenshare: boolean;
  /** `globals.user.userXrefID` — what the span actually prints. */
  readonly userXrefID: string;
}

/**
 * The text to burn over this viewer's picture, or `null` for "nothing".
 *
 * `null` rather than `''`, so the caller's `{#if}` cannot accidentally render an empty span with the
 * captured class on it — an invisible element that a later CSS change could make visible.
 *
 * The empty-id case is its own answer and not an oversight: a room whose viewer has no `userXrefID`
 * has nothing to identify a leak with, and a blank watermark would say the setting is working when
 * it is not.
 */
export function userIdWatermark(input: UserIdWatermarkInput): string | null {
  if (input.viewerIsPresenter) return null;
  if (!input.overlayUserIdOnScreenshare) return null;
  const id = input.userXrefID.trim();
  return id === '' ? null : id;
}
