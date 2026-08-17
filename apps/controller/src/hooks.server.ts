import { randomUUID } from 'node:crypto';
/*
  `@sveltejs/kit/hooks`, not the package root, as of `3.0.0-next.23`.

  The Kit 3 migration guide lists it under "@sveltejs/kit Exports" — *"Hook types moved to
  `@sveltejs/kit/hooks`"* — and `next.16` still re-exported them from the root, so the move only
  became visible on this bump. It fails LOUDLY and specifically ("has no exported member 'Handle'"),
  which is the good kind of breaking change: the three type imports go, and then eight
  `implicitly has an 'any' type` errors follow from the handlers that were typed by them.
*/
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import {
  applySecurityHeaders,
  controlPlaneUnavailableResponse,
  decideControlPlaneRequest
} from '#lib/server/control-plane-policy.js';
import { controlPlaneMode } from '#lib/server/control-plane-runtime.js';

export const init: ServerInit = async () => {
  if (controlPlaneMode !== 'postgres') return;

  // This dynamic boundary keeps the database out of the normal marketing-only
  // startup path. The DB module itself is independently lazy because SvelteKit may
  // evaluate matched route modules before this hook.
  const { ensureDatabase } = await import('#lib/server/db/index.js');
  await ensureDatabase();
};

export const handle: Handle = async ({ event, resolve }) => {
  const decision = decideControlPlaneRequest(controlPlaneMode, event.route.id, event.request.method);
  if (!decision.allowed) return controlPlaneUnavailableResponse(event.request.method);

  // Both branches end at the same place on purpose. The enabled branch used to `return
  // resolve(event)` directly, which meant a deployment with the control plane on served every
  // page — including a reachable login form — with no CSP, no `nosniff`, no `DENY` and no
  // `noindex`. An enabled deployment needs those headers more than a marketing one, not less.
  if (controlPlaneMode === 'postgres') {
    const { readUser } = await import('#lib/server/auth.js');
    event.locals.user = await readUser(event.cookies);
    return applySecurityHeaders(await resolve(event));
  }

  event.locals.user = undefined;
  return applySecurityHeaders(await resolve(event));
};

/**
 * Give support a correlation id without sending internal exception details to
 * the browser. The server log intentionally excludes query strings, request
 * bodies, cookies, user data, and the raw error message.
 */
/*
  `kind`, not `status`, as of `3.0.0-next.23`.

  Kit 3 replaced the input's `status` with a DISCRIMINANT — `'app' | 'framework' | 'validation' |
  'unknown'` — and moved status the other way: the hook may now RETURN one to override the default.
  This handler does not, deliberately, because it has never wanted to change what the user is sent;
  it only wants the log line.

  The swap is an upgrade for exactly the reason the note below records. `status: 500` said an error
  happened and nothing about its origin. `kind` separates the four cases that need different
  responses from an operator: `'app'` is our own `error()` call and usually intentional,
  `'framework'` is a 404 or a malformed request, `'validation'` is a remote function called with
  bad arguments, and `'unknown'` is the only one that means something threw where nothing should.
  Alerting on 500s treated all four alike.
*/
export const handleError: HandleServerError = ({ error, event, kind }) => {
  const errorId = randomUUID();
  /*
    THE MESSAGE AND STACK GO TO THE SERVER LOG. They used to be dropped, and that cost real time.

    This hook logged `errorType` alone — the constructor name. So when the home page began
    answering 500 in production on 2026-08-10, every diagnostic anyone had was
    `{ errorId, status: 500, route: '/(public)', errorType: 'SyntaxError' }`: the fact that
    something failed to parse, with no hint of what, where, or which line. The page rendered
    correctly under SSR locally, a production build served it 200 locally, and all 100 modules in
    the built server bundle passed `node --check`, so nothing reproducible pointed at the cause.
    A name without a message is not an error report; it is a notification that one happened.

    What is logged here and what is RETURNED are deliberately different. The response keeps the
    generic message and the id — a stack trace in a browser is an information leak, and the id is
    what ties a user's screenshot to this line. Vercel's function logs are not public.
  */
  console.error('[request-error]', {
    errorId,
    kind,
    method: event.request.method,
    route: event.route.id,
    url: event.url.pathname,
    errorType: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    // A `SyntaxError` from `JSON.parse` names neither the input nor the caller; the cause chain is
    // often the only thing that does.
    cause: error instanceof Error && error.cause ? String(error.cause) : undefined
  });

  return {
    message: 'An unexpected error occurred.',
    errorId
  };
};
