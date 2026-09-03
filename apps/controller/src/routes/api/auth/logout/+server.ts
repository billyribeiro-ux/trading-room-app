import type { RequestHandler } from './$types';
import { apiRequestContext, apiResultResponse, logout } from '#lib/server/tradingroom-api.js';

export const POST: RequestHandler = async (event) => apiResultResponse(await logout(apiRequestContext(event)));
