import type {
  ArchiveAccountRoomRequest,
  CreateAccountRoomRequest,
  LaunchAccountRoomRequest,
  ManagedRoom,
  RoomLaunchVisit
} from './tradingroom-api.generated';
import {
  createAccountRoom,
  launchAccountRoom,
  listAccountRooms,
  refreshSession,
  setAccountRoomArchived,
  type ApiFailure,
  type ApiResult,
  type RequestContext
} from './tradingroom-api';

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

export function launchRoomInAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  request: LaunchAccountRoomRequest
): Promise<ApiResult<RoomLaunchVisit>> {
  return onceAfterExpiredAccess(context, () => launchAccountRoom(context, enterpriseId, roomId, request));
}

export function readRoomAuthority(context: RequestContext, enterpriseId: string): Promise<ApiResult<ManagedRoom[]>> {
  return onceAfterExpiredAccess(context, () => listAccountRooms(context, enterpriseId));
}

export function createRoomInAuthority(
  context: RequestContext,
  enterpriseId: string,
  request: CreateAccountRoomRequest
): Promise<ApiResult<ManagedRoom>> {
  return onceAfterExpiredAccess(context, () => createAccountRoom(context, enterpriseId, request));
}

export function archiveRoomInAuthority(
  context: RequestContext,
  enterpriseId: string,
  roomId: string,
  request: ArchiveAccountRoomRequest
): Promise<ApiResult<ManagedRoom>> {
  return onceAfterExpiredAccess(context, () => setAccountRoomArchived(context, enterpriseId, roomId, request));
}
