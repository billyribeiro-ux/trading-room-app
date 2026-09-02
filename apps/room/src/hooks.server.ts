/*
  `Handle` comes from `@sveltejs/kit/hooks` as of `3.0.0-next.23`, while `error` stays on the
  package root — the migration guide's "Hook types moved to `@sveltejs/kit/hooks`". `next.16` still
  re-exported the types from the root, so the move only became visible on this bump, and it fails
  loudly rather than silently: "has no exported member 'Handle'", followed by four
  `implicitly has an 'any' type` errors from the handlers that were typed by it.
*/
import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { resolveConnectedIdentity } from '#lib/server/connection.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { startAlertScheduler } from '#lib/server/scheduled-alerts.js';
import { startVideoScheduler } from '#lib/server/room-media-state.js';

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

/**
 * `hasAlertScheduler` — the sweep that posts alerts a presenter scheduled for later.
 *
 * ## Why it starts HERE, at module scope, and why that is not the shared-state rule being broken
 *
 * `CLAUDE.md` forbids shared server-side module state, and this is a `setInterval` in a module. The
 * rule it is written against is state that ANSWERS a request — a cache, a session, anything a second
 * request could read and a third could corrupt. This holds none: every question the sweep asks is
 * answered from the `scheduled_alerts` table, so a restart resumes rather than recovers, and nothing
 * a request does depends on the timer having run. `server/room-events.ts` records the same
 * distinction for the SSE hub, whose state is live connections.
 *
 * SvelteKit has no server-start hook, and `hooks.server.ts` is the one module the framework
 * guarantees is evaluated once per server process. Starting it from a route would tie the scheduler
 * to somebody visiting that route.
 *
 * ## It cannot run where there is no server
 *
 * Guarded on `building`, so `vite build` — which imports this module to prerender — does not start a
 * timer inside the build. `$app/env` and not `$app/environment`: the latter is deprecated as of
 * `@sveltejs/kit@3.0.0-next.25` and warns in dev, which is the kind of thing that goes stale in a
 * comment rather than in an import, so it is named at the import instead. The room cannot deploy serverless for two reasons `docs/NEXT-SESSION.md`
 * documents, so "a long-lived process exists" is a property of this app rather than an assumption.
 *
 * The returned stop function is deliberately dropped: the process ending is what stops it, and
 * holding a handle nothing calls would be the dead code this repository refuses.
 */
if (!building) {
  ensureDatabase();
  startAlertScheduler();
  /*
    The VIDEO scheduler, added 2026-09-01, and it is here for exactly the reason the alert one is:
    a play armed for later has to fire whether or not the presenter's tab is still open, and this
    process is the only long-lived thing in the stack that can do it.

    Both handles are dropped deliberately — the process ending is what stops them, and holding one
    nothing calls would be the dead code this repository refuses.
  */
  startVideoScheduler();
}

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
  const response = await resolve(event, {
    preload: ({ type, path }) =>
      type === 'js' || type === 'css' || (type === 'font' && path.endsWith('.woff2'))
  });

  /*
    `Referrer-Policy: same-origin` — and it is here because of a MATCH, not despite one.

    `MSB-06`. The reference's chat link is read whole at bundle byte 1,326,550:

      '<a href="' + e + '" target="_blank" class="linkColor" onclick="event.stopPropagation()">'

    No `rel` — and that is a CHOICE upstream rather than an oversight, which is what makes it worth
    matching. `"rel",` occurs 8 times in the bundle: seven `"rel","noopener noreferrer"` (the avatar
    menu's outbound links among them, `AvatarOptionsMenu.svelte` consts 19 and 21) and one
    `"rel","required"`. So the reference puts `rel` on the links it wants it on, and this one is not
    one of them. This room's `MessageBody` carried `rel="noreferrer"`, which is ours.

    (My first draft of this note said `rel=` occurs nowhere in the bundle. That was a sweep for the
    HTML spelling against a file that stores attributes comma-separated — the same class of error
    this pass has now paid for three times, and it is corrected here rather than quietly fixed.)

    Deleting the attribute alone would have leaked: every chat link opens a third-party site chosen
    by a member, and with no policy anywhere the browser sends a Referer. So the protection moves to
    the layer the reference-facing markup does not express. The `<a>` now matches the capture
    character for character AND no room URL crosses to a pasted domain — which is strictly better
    than either half, and is the reason this is a header rather than a decision to keep the
    attribute.

    `same-origin` rather than the browser's `strict-origin-when-cross-origin` default: that default
    still sends the ORIGIN cross-origin, and nothing outside this room needs to know it exists.
    Same-origin requests keep the full referrer, which is what the SSE reconnects and the remote
    functions see.

    Set on every response rather than on the document, because a policy that only covers the HTML
    leaves every subresource on the default — and `<meta name="referrer">` cannot reach a fetch that
    starts before the parser reaches it.
  */
  response.headers.set('Referrer-Policy', 'same-origin');
  return response;
};
