import type { RequestHandler } from './$types';
import { apiRequestContext, apiResultResponse, refreshSession } from '#lib/server/tradingroom-api.js';

export const POST: RequestHandler = async (event) => apiResultResponse(await refreshSession(apiRequestContext(event)));
