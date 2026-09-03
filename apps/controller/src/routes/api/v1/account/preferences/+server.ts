import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  apiRequestContext,
  apiResultResponse,
  getAccountPreferences,
  isPreferenceRequest,
  setAccountPreference
} from '#lib/server/tradingroom-api.js';

export const GET: RequestHandler = async (event) =>
  apiResultResponse(await getAccountPreferences(apiRequestContext(event)));

export const PATCH: RequestHandler = async (event) => {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json(
      { error: { code: 'invalid', message: 'Expected a JSON preference request.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  if (!isPreferenceRequest(body)) {
    return json(
      { error: { code: 'invalid', message: 'Expected a key and value.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  return apiResultResponse(await setAccountPreference(apiRequestContext(event), body));
};
