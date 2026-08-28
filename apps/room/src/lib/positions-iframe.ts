/**
 * The positions iframe — an owner's own page beside the presentation area, refreshed on a timer.
 *
 * ## The transcription
 *
 * `app-positions-container`, byte 2,329,246:
 *
 * ```js
 * ngOnInit() {
 *   preferences.updatePositionsIframe &&
 *     (globals.showPositions ? this.startIframeRefresh() : this.stopIframeRefresh())
 * }
 * startIframeRefresh() {
 *   this.stopIframeRefresh();
 *   this.loadPositionsContainer();
 *   this.iframeInterval = setInterval(() => this.loadPositionsContainer(), 3e4)
 * }
 * loadPositionsContainer() {
 *   const e = globals.sessData.positionsIframeUrl, i = e.includes("?") ? "&" : "?";
 *   this.positionsIframeUrl = e + i + `t=${Date.now()}`
 * }
 * ```
 *
 * and its template, consts `[1,"positionOverlay","animated","fadeIn"]` and `[3,"src"]`:
 *
 * ```html
 * <div class="positionOverlay animated fadeIn"><iframe [src]="positionsIframeUrl"></iframe></div>
 * ```
 *
 * ## THE CACHE-BUST IS THE FEATURE
 *
 * An iframe whose `src` does not change is not re-fetched, so `t=<now>` is not decoration — it is
 * the only reason a refresh refreshes. The separator choice is the reference's own and is correct:
 * an owner URL that already carries a query string needs `&`.
 *
 * ## Two gates and they are ANDed, which is easy to get wrong
 *
 * `preferences.updatePositionsIframe` (per viewer) AND `globals.showPositions` (the toggle). The
 * timer runs only when both hold — `updatePositionsIframeChanged` re-evaluates exactly that
 * conjunction (byte 2,329,586). A member who has never opened the panel must not have a background
 * timer fetching an owner's page every thirty seconds.
 *
 * ## The URL is checked, and the reference again is not
 *
 * `Ct(2,1, …, "resourceUrl")` — the same `bypassSecurityTrustResourceUrl` as `customPlayerURL`. Same
 * decision here and for the same reason: this iframe loads inside every member's room.
 */

/** `setInterval(…, 3e4)`. */
export const POSITIONS_REFRESH_MS = 30_000;

/**
 * The `src` for one load, cache-busted, or `null` when the room configured nothing usable.
 *
 * `now` is a PARAMETER rather than a `Date.now()` call inside, so this is pure and its test does not
 * have to stub a global — the same shape `customFaviconHref` takes.
 */
export function positionsIframeSrc(raw: string | undefined | null, now: number): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  /*
    Built by string concatenation on the ORIGINAL value rather than through `URL.searchParams`, and
    that is deliberate: `searchParams.set` re-encodes the whole query string, so an owner URL
    carrying an already-encoded token could come back different from what they pasted. The separator
    rule is the reference's own and needs nothing more.
  */
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}t=${now}`;
}

/**
 * Whether the refresh timer should be running.
 *
 * A named predicate rather than an inline `&&`, because it is the conjunction the reference
 * re-evaluates on `updatePositionsIframeChanged` and the one a background timer depends on.
 */
export function positionsRefreshRunning(input: {
  readonly updatePositionsIframe: boolean;
  readonly showPositions: boolean;
}): boolean {
  return input.updatePositionsIframe && input.showPositions;
}
