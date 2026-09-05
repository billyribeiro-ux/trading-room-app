import type {
  AssignBadgesRequest,
  BadgeMutationResponse,
  CreateBadgeRequest,
  DeleteBadgeRequest,
  ManagedBadge,
  UpdateBadgeRequest
} from './tradingroom-api.generated.js';
import {
  assignAccountRoomBadges,
  createAccountBadge,
  deleteAccountBadge,
  listAccountBadges,
  refreshSession,
  updateAccountBadge,
  type ApiFailure,
  type ApiResult,
  type RequestContext
} from './tradingroom-api.js';

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

export function readBadgeAuthority(context: RequestContext, enterpriseId: string): Promise<ApiResult<ManagedBadge[]>> {
  return onceAfterExpiredAccess(context, () => listAccountBadges(context, enterpriseId));
}

export function createBadgeAuthority(
  context: RequestContext,
  enterpriseId: string,
  request: CreateBadgeRequest
): Promise<ApiResult<BadgeMutationResponse>> {
  return onceAfterExpiredAccess(context, () => createAccountBadge(context, enterpriseId, request));
}

export function updateBadgeAuthority(
  context: RequestContext,
  enterpriseId: string,
  badgeId: string,
  request: UpdateBadgeRequest
): Promise<ApiResult<BadgeMutationResponse>> {
  return onceAfterExpiredAccess(context, () => updateAccountBadge(context, enterpriseId, badgeId, request));
}

export function deleteBadgeAuthority(
  context: RequestContext,
  enterpriseId: string,
  badgeId: string,
  request: DeleteBadgeRequest
): Promise<ApiResult<BadgeMutationResponse>> {
  return onceAfterExpiredAccess(context, () => deleteAccountBadge(context, enterpriseId, badgeId, request));
}

export function assignBadgeAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  request: AssignBadgesRequest
): Promise<ApiResult<BadgeMutationResponse>> {
  return onceAfterExpiredAccess(context, () => assignAccountRoomBadges(context, enterpriseId, roomId, request));
}
