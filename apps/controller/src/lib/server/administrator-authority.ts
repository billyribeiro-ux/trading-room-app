import type {
  AdministratorMutationResponse,
  CreateAdministratorRequest,
  DeleteAdministratorRequest,
  ManagedAdministrator
} from './tradingroom-api.generated.js';
import {
  createAccountAdministrator,
  deleteAccountAdministrator,
  listAccountAdministrators,
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

export function readAdministratorAuthority(
  context: RequestContext,
  enterpriseId: string
): Promise<ApiResult<ManagedAdministrator[]>> {
  return onceAfterExpiredAccess(context, () => listAccountAdministrators(context, enterpriseId));
}

export function createAdministratorAuthority(
  context: RequestContext,
  enterpriseId: string,
  request: CreateAdministratorRequest
): Promise<ApiResult<AdministratorMutationResponse>> {
  return onceAfterExpiredAccess(context, () => createAccountAdministrator(context, enterpriseId, request));
}

export function deleteAdministratorAuthority(
  context: RequestContext,
  enterpriseId: string,
  userId: string,
  request: DeleteAdministratorRequest
): Promise<ApiResult<AdministratorMutationResponse>> {
  return onceAfterExpiredAccess(context, () => deleteAccountAdministrator(context, enterpriseId, userId, request));
}
