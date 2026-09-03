import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  apiRequestContext,
  apiResultResponse,
  isPreferencesRequest,
  updateAccountTheme
} from '#lib/server/tradingroom-api.js';

export const PUT: RequestHandler = async (event) => {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json(
      { error: { code: 'invalid', message: 'Expected a JSON preferences object.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  if (!isPreferencesRequest(body)) {
    return json(
      { error: { code: 'invalid', message: 'Expected a preferences object.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  return apiResultResponse(await updateAccountTheme(apiRequestContext(event), body));
};
