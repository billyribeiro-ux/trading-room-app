import { error, type Handle } from '@sveltejs/kit';
import { resolveConnectedIdentity } from '$lib/server/connection';

/**
 * Routes reachable without a session. Everything else requires one.
 *
 * `/session` is the handoff receiver, and it is the only one: the controller owns identity, so the
 * room's own email-and-password login was a second way in that the reference has no equivalent
 * for. It is gone. `/session` is public in the sense that it is reachable without a cookie, not in
 * the sense that it is unauthenticated — it refuses everything but a signed, unexpired, unspent
 * token from the controller.
 */
const PUBLIC_PATHS = new Set(['/session']);

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
