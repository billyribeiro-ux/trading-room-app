/**
 * A PRESENTER INSIDE AN IFRAME is offered a way out of it.
 *
 * ## The capture, read whole
 *
 * `app.component`'s init, bundle byte 2,600,909 — inside `if (a)`, where `a` is the token that
 * arrived in the URL:
 *
 * ```js
 * let claims = decodeToken(a);
 * if (claims && "a" == claims.perms) try {
 *   window.location !== window.parent.location &&
 *     bootbox.confirm(
 *       "You seem to be a presenter and be running inside an iframe, click OK to load the page in regular mode so that you can present",
 *       function (ok) { ok && (window.parent.location = window.location + "&kt=1") }
 *     );
 * } catch {}
 * ```
 *
 * A presenter cannot present from inside somebody's embed — screen share, the device picker and the
 * webcam prompt all need a top-level document — so the reference offers the break-out rather than
 * failing later with a permissions error nobody can act on. It is an OFFER: a Cancel leaves the
 * member exactly where they were.
 *
 * ## Three divergences, each measured, each recorded here rather than taken quietly
 *
 * **1. The authority is the SERVER's, and this one is not negotiable.** Upstream reads
 * `decodeToken(a).perms == "a"` — the browser decoding the token out of its own address bar and
 * believing what it says. That is client-asserted authority, which is the 2026-08-07 privilege
 * escalation by name, and this repository does not reintroduce it for any reason. `isPresenter`
 * here is the value `+page.server.ts` computed from the membership row it read, and it costs
 * nothing to use: the check gates an OFFER, so the two would agree in every honest case anyway.
 * What it buys is that a member who edits a token cannot make this room navigate their top frame.
 *
 * **2. `&kt=1` is appended as a QUERY PARAMETER rather than as those four characters.** `kt` has
 * exactly ONE occurrence in the whole 2,891,205-byte bundle and it is this write — **nothing reads
 * it**, upstream or here. Upstream can concatenate because it only reaches this line when a token
 * was in the URL, so there is always a `?` to append to; this room strips the token from the
 * address bar on entry (`session/+page.svelte`), so the same concatenation would produce
 * `…/room&kt=1` — a URL with no query string and a parameter glued to the path. The reference-facing
 * output is that `kt=1` is present, and `URL.searchParams` produces exactly that with the right
 * separator.
 *
 * **3. The `try`/`catch` is transcribed, INCLUDING what it swallows.** Reading
 * `window.parent.location` across origins throws a `SecurityError`, so upstream's swallow means a
 * CROSS-ORIGIN embed gets no offer — arguably the case where the offer matters most.
 * `window.self !== window.top` would answer without throwing and would cover it. It is not used,
 * because "it would reproduce an upstream defect" is not a reason to diverge, and a room that
 * offered the break-out in a case the reference stays silent in would be a different product in the
 * one situation an operator is most likely to notice.
 *
 * ## The room can be framed, and that is measured rather than assumed
 *
 * `hooks.server.ts` sets one security header (`Referrer-Policy`) and neither `X-Frame-Options` nor
 * a `frame-ancestors` CSP appears anywhere in `apps/room`. So an operator embedding this room in a
 * page is possible today, which is what makes this module reachable rather than an unreachable
 * branch — and the reference plainly supports embedding, because detecting it is the whole point of
 * the code above.
 *
 * **Whether the room SHOULD be frameable is a product question and not this module's to answer.**
 * Adding `frame-ancestors 'none'` would close a clickjacking surface and would also break every
 * operator embedding the room today, so it is recorded here for the owner rather than taken.
 *
 * ## Pure, because the interesting half is the rule
 *
 * {@link decideIframeBreakout} is a function of its arguments. The confirm and the navigation are
 * the caller's. Same split as `room-defaults.ts`, `live-access.ts` and `media-elevation.ts`: a rule
 * reachable only by mounting a room inside an iframe is a rule nobody tests.
 */

/**
 * The sentence, transcribed. Exported so the contract can assert it against the capture rather than
 * against a copy of itself.
 */
export const IFRAME_BREAKOUT_PROMPT =
  'You seem to be a presenter and be running inside an iframe, click OK to load the page in regular mode so that you can present';

/** The parameter the reference appends. Nothing reads it — see divergence 2 in the header. */
export const IFRAME_BREAKOUT_PARAM = 'kt';

export interface IframeBreakoutInput {
  /**
   * The SERVER's answer, never the client's. See divergence 1 in the header — this is the whole
   * reason the input is a boolean rather than a token.
   */
  readonly isPresenter: boolean;
  /**
   * Whether this document is inside a frame, as the reference asks it:
   * `window.location !== window.parent.location`, evaluated inside the caller's `try`.
   *
   * `null` means the question THREW — a cross-origin parent. Upstream's empty `catch` turns that
   * into silence, and so does this: a rule that cannot tell does not offer.
   */
  readonly framed: boolean | null;
}

/**
 * Whether to offer the break-out.
 *
 * Deny-by-default in both directions: a non-presenter is never offered it, and `framed === null`
 * (the cross-origin throw) is not treated as `true`.
 */
export function decideIframeBreakout(input: IframeBreakoutInput): boolean {
  return input.isPresenter && input.framed === true;
}

/**
 * Where the top frame is sent when the presenter accepts: this document's own address, plus `kt=1`.
 *
 * Takes the href as a string rather than reading `location`, so the whole rule is testable without
 * a browser and so the caller is the only thing that touches the DOM.
 */
export function iframeBreakoutTarget(href: string): string {
  const url = new URL(href);
  url.searchParams.set(IFRAME_BREAKOUT_PARAM, '1');
  return url.toString();
}

export interface IframeBreakoutDeps {
  /** The room's confirm primitive, wrapped by the caller — never handed over by reference. */
  readonly confirm: (message: string, onconfirm: () => void) => void;
  /** `window.parent.location.href = target`, isolated so the rule above stays pure. */
  readonly navigateTop: (target: string) => void;
}

/**
 * The acting half, called once on mount.
 *
 * Reads `window` here and nowhere else in this module, inside the same `try` the reference uses,
 * for the same reason: the comparison itself is what throws on a cross-origin parent.
 */
export function offerIframeBreakout(isPresenter: boolean, deps: IframeBreakoutDeps): void {
  let framed: boolean | null;
  try {
    framed = window.location !== window.parent.location;
  } catch {
    // A cross-origin parent. Upstream swallows this and stays silent; see divergence 3.
    framed = null;
  }

  if (!decideIframeBreakout({ isPresenter, framed })) return;

  const target = iframeBreakoutTarget(window.location.href);
  deps.confirm(IFRAME_BREAKOUT_PROMPT, () => deps.navigateTop(target));
}
