/**
 * "Custom player URL" — an owner's own iframe INSTEAD of the room's screenshare pane.
 *
 * ## The transcription
 *
 * Byte 2,017,248, in `app-presentationarea`'s update block:
 *
 * ```js
 * O(38, o.appService.globals.sessData.customPlayerURL ? 38 : 39)
 * ```
 *
 * Those are the two children of `div#screens` (const 20,
 * `["id","screens","role","tabpanel","aria-labelledby","screens-tab",1,"tab-pane","fade",…]`):
 *
 * ```js
 * d(36,"div",19)(37,"div",20), H(38, eSe, 3, 4, "div", 21)(39, DSe, 2, 1), u()
 * ```
 *
 * and slot 38 is `eSe` at byte 1,918,589, with consts 21 and 68 resolved:
 *
 * ```html
 * <div class="d-flex align-items-start justify-content-center w-100 h-100">
 *   <iframe width="100%" height="95%" scrolling="no" frameborder="no"
 *           allow="autoplay" allowfullscreen [src]="customPlayerURL"></iframe>
 * </div>
 * ```
 *
 * **It replaces the WHOLE pane**, not the videos inside it. Slot 39 is `DSe`, which is itself the
 * `preferences.disableVideo` switch between "Video off to preserve data…" and the real screens UI —
 * so an owner who sets this URL takes away the tab strip, the panes and the save-data message
 * together. That is the same all-or-nothing shape `disableVideo` already has one level down, and the
 * reason is the same: a tab strip with no video under it would still be requesting streams.
 *
 * ## The URL is checked, and the reference explicitly is not
 *
 * `Ct(2,1, …, "resourceUrl")` is Angular's `DomSanitizer.bypassSecurityTrustResourceUrl` — the
 * reference opts OUT of its own framework's URL sanitising for this value. Svelte has no such guard
 * to opt out of, so the check has to be written: `http:`/`https:` only, parsed rather than
 * pattern-matched.
 *
 * This is the same decision `tipButtonFor` makes, and it matters more here. A tip button is a link a
 * member chooses to click; this is an iframe that loads on arrival in every member's room. A
 * `javascript:` URL in an `iframe src` runs in the embedding page's origin in older engines, and a
 * malformed value silently swallows the room's entire screenshare surface either way.
 *
 * **What this does NOT do** is bound what the framed page can do once loaded. That is a CSP
 * `frame-src` and an iframe `sandbox` question, and neither belongs to a pure function — recorded
 * here so the absence is a known one rather than an assumed guarantee.
 */
export function customPlayerUrl(raw: string | undefined | null): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    // Not a URL. The room keeps its own screens pane, which is the safe half of the either/or.
    return null;
  }
}
