import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiRequestContext, apiResultResponse, isLoginRequest, login } from '#lib/server/tradingroom-api.js';

export const POST: RequestHandler = async (event) => {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json(
      { error: { code: 'invalid', message: 'Expected a JSON login request.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  if (!isLoginRequest(body)) {
    return json(
      { error: { code: 'invalid', message: 'Expected email and password.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }

  return apiResultResponse(await login(apiRequestContext(event), body));
};
