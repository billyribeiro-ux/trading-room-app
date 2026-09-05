import type {
  InviteMemberRequest,
  ManageMembersRequest,
  ManagedMember,
  MembershipMutationResponse
} from './tradingroom-api.generated.js';
import {
  inviteAccountRoomMember,
  listAccountRoomMembers,
  manageAccountRoomMembers,
  refreshSession,
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

export function readMembershipAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string
): Promise<ApiResult<ManagedMember[]>> {
  return onceAfterExpiredAccess(context, () => listAccountRoomMembers(context, enterpriseId, roomId));
}

export function inviteMembershipAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  request: InviteMemberRequest
): Promise<ApiResult<MembershipMutationResponse>> {
  return onceAfterExpiredAccess(context, () => inviteAccountRoomMember(context, enterpriseId, roomId, request));
}

export function mutateMembershipAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  request: ManageMembersRequest
): Promise<ApiResult<MembershipMutationResponse>> {
  return onceAfterExpiredAccess(context, () => manageAccountRoomMembers(context, enterpriseId, roomId, request));
}
