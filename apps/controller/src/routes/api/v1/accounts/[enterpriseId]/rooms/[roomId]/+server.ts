import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  apiRequestContext,
  apiResultResponse,
  isArchiveAccountRoomRequest,
  setAccountRoomArchived
} from '#lib/server/tradingroom-api.js';

export const PATCH: RequestHandler = async (event) => {
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json(
      {
        error: {
          code: 'invalid',
          message: 'Expected a JSON room archive request.'
        }
      },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  if (!isArchiveAccountRoomRequest(body)) {
    return json(
      {
        error: {
          code: 'invalid',
          message: 'Expected only an archived boolean.'
        }
      },
      { status: 400, headers: { 'cache-control': 'private, no-store' } }
    );
  }
  return apiResultResponse(
    await setAccountRoomArchived(apiRequestContext(event), event.params.enterpriseId, event.params.roomId, body)
  );
};
