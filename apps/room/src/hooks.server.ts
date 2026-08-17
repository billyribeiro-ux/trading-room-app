/*
  `Handle` comes from `@sveltejs/kit/hooks` as of `3.0.0-next.23`, while `error` stays on the
  package root — the migration guide's "Hook types moved to `@sveltejs/kit/hooks`". `next.16` still
  re-exported the types from the root, so the move only became visible on this bump, and it fails
  loudly rather than silently: "has no exported member 'Handle'", followed by four
  `implicitly has an 'any' type` errors from the handlers that were typed by it.
*/
import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { resolveConnectedIdentity } from '#lib/server/connection.js';

/**
 * Routes reachable without a session. Everything else requires one.
 *
 * `/session` is the handoff receiver: the controller owns identity, so the room's own
 * email-and-password login was a second way in that the reference has no equivalent for. It is gone.
 *
 * `/internal/media-hook` is MediaMTX reporting that a stream went live or stopped. It has no cookie
 * because it is a `curl` spawned by a media server, not a browser.
 *
 * **Both are public in the sense that they are reachable without a cookie, and neither is
 * unauthenticated.** `/session` refuses everything but a signed, unexpired, unspent token from the
 * controller; `/internal/media-hook` refuses everything but a constant-time bearer match against
 * `MEDIA_HOOK_SECRET`, and refuses everything outright when that is unset. Adding a path here moves
 * the authentication decision INTO that route — it does not remove it, and a route added here
 * without its own check is an open door.
 */
const PUBLIC_PATHS = new Set(['/session', '/internal/media-hook']);

export const handle: Handle = async ({ event, resolve }) => {
  const connection = resolveConnectedIdentity(event.cookies);
  event.locals.user = connection.user;
  event.locals.sessionId = connection.sessionId;
  event.locals.roomShortCode = connection.roomShortCode;

  // A single choke point for authentication: every route except PUBLIC_PATHS is behind it, so no
  // page or form action can be reached without a session, including the `?/action` POSTs on `/`.
  if (!connection.user && !PUBLIC_PATHS.has(event.url.pathname)) {
    /*
      Nowhere local to send them. The room has no login of its own any more, and inventing a page
      that says so would be a dead end wearing a UI. `403` names the actual situation: this room is
      entered from the controller, and the browser did not arrive from it.
    */
    error(403, 'Open this room from your account page.');
  }

  // The Font Awesome faces are icon fonts: every `.fas`/`.far`/`.fab` glyph is laid out from the
  // webfont's metrics, so swapping it in after first paint resizes the navbar and the tab strips.
  // SvelteKit only preloads `js` and `css` by default; adding `font` emits the <link rel=preload>
  // that lets the faces arrive before first paint instead of shifting the layout afterwards.
  //
  // Only the woff2 files are preloaded: each @font-face lists eot/woff2/woff/ttf/svg sources and
  // Chrome uses exactly one (woff2), but `type === 'font'` matches every emitted font asset, so
  // the unfiltered form made the Link header preload woff AND ttf too - measured as 6 extra
  // requests / ~540 KB of never-used bytes on every cold load.
  return resolve(event, {
    preload: ({ type, path }) =>
      type === 'js' || type === 'css' || (type === 'font' && path.endsWith('.woff2'))
  });
};
