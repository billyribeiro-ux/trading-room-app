import { randomUUID } from 'node:crypto';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import {
  applySecurityHeaders,
  controlPlaneUnavailableResponse,
  decideControlPlaneRequest
} from '$lib/server/control-plane-policy';
import { controlPlaneMode } from '$lib/server/control-plane-runtime';

export const init: ServerInit = async () => {
  if (controlPlaneMode !== 'postgres') return;

  // This dynamic boundary keeps the database out of the normal marketing-only
  // startup path. The DB module itself is independently lazy because SvelteKit may
  // evaluate matched route modules before this hook.
  const { ensureDatabase } = await import('$lib/server/db');
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
    const { readUser } = await import('$lib/server/auth');
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
export const handleError: HandleServerError = ({ error, event, status }) => {
  const errorId = randomUUID();
  console.error('[request-error]', {
    errorId,
    status,
    method: event.request.method,
    route: event.route.id,
    errorType: error instanceof Error ? error.name : typeof error
  });

  return {
    message: 'An unexpected error occurred.',
    errorId
  };
};
