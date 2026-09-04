import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  apiRequestContext,
  apiResultResponse,
  createAccountRoom,
  isCreateAccountRoomRequest,
  listAccountRooms
} from '#lib/server/tradingroom-api.js';

export const GET: RequestHandler = async (event) =>
  apiResultResponse(await listAccountRooms(apiRequestContext(event), event.params.enterpriseId));

export const POST: RequestHandler = async (event) => {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json(
      { error: { code: 'invalid', message: 'Expected a JSON room request.' } },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  if (!isCreateAccountRoomRequest(body)) {
    return json(
      {
        error: {
          code: 'invalid',
          message: 'Expected an exact requestId and room name.'
        }
      },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  return apiResultResponse(await createAccountRoom(apiRequestContext(event), event.params.enterpriseId, body));
};
