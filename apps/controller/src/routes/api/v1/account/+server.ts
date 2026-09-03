import type { RequestHandler } from './$types';
import { apiRequestContext, apiResultResponse, getAccountBootstrap } from '#lib/server/tradingroom-api.js';

export const GET: RequestHandler = async (event) =>
  apiResultResponse(await getAccountBootstrap(apiRequestContext(event)));
