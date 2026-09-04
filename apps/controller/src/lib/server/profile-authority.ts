import type { AccountBootstrap } from './tradingroom-api.generated';
import {
  getAccountBootstrap,
  refreshSession,
  type ApiFailure,
  type ApiResult,
  type RequestContext
} from './tradingroom-api';

/** Reads canonical state, rotating an expired access token at most once. */
export async function readProfileAuthority(context: RequestContext): Promise<ApiResult<AccountBootstrap>> {
  const first = await getAccountBootstrap(context);
  if (first.ok || first.status !== 401) return first;

  const refreshed = await refreshSession(context);
  if (!refreshed.ok) return refreshed as ApiFailure;
  return getAccountBootstrap(context);
}
