import type { AccountRoomSettings, ApiFailure, ApiResult, RequestContext } from './tradingroom-api.js';
import { getAccountRoomSettings, patchAccountRoomSettings, refreshSession } from './tradingroom-api.js';

async function onceAfterExpiredAccess<T>(
  context: RequestContext,
  operation: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const first = await operation();
  if (first.ok || first.status !== 401) return first;
  const refreshed = await refreshSession(context);
  if (!refreshed.ok) return refreshed as ApiFailure;
  return operation();
}

export function readRoomSettingsAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string
): Promise<ApiResult<AccountRoomSettings>> {
  return onceAfterExpiredAccess(context, () => getAccountRoomSettings(context, enterpriseId, roomId));
}

export function patchRoomSettingsAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  input: {
    requestId: string;
    expectedRevision: number;
    base: Record<string, string | number | boolean | null | undefined>;
    updates: Record<string, string | number | boolean | null | undefined>;
  }
): Promise<ApiResult<AccountRoomSettings>> {
  return onceAfterExpiredAccess(context, () => patchAccountRoomSettings(context, enterpriseId, roomId, input));
}
