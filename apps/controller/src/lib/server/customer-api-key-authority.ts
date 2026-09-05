import type {
  CreateCustomerApiKeyRequest,
  CustomerApiKeyMutationResponse,
  DeleteCustomerApiKeyRequest,
  ManagedCustomerApiKey,
  RestrictCustomerApiKeyRequest,
  RotateCustomerApiKeyRequest
} from './tradingroom-api.generated.js';
import {
  createAccountCustomerApiKey,
  deleteAccountCustomerApiKey,
  listAccountCustomerApiKeys,
  refreshSession,
  restrictAccountCustomerApiKey,
  rotateAccountCustomerApiKey,
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

export function readCustomerApiKeyAuthority(
  context: RequestContext,
  enterpriseId: string
): Promise<ApiResult<ManagedCustomerApiKey[]>> {
  return onceAfterExpiredAccess(context, () => listAccountCustomerApiKeys(context, enterpriseId));
}

export function createCustomerApiKeyAuthority(
  context: RequestContext,
  enterpriseId: string,
  request: CreateCustomerApiKeyRequest
): Promise<ApiResult<CustomerApiKeyMutationResponse>> {
  return onceAfterExpiredAccess(context, () => createAccountCustomerApiKey(context, enterpriseId, request));
}

export function rotateCustomerApiKeyAuthority(
  context: RequestContext,
  enterpriseId: string,
  keyId: string,
  request: RotateCustomerApiKeyRequest
): Promise<ApiResult<CustomerApiKeyMutationResponse>> {
  return onceAfterExpiredAccess(context, () => rotateAccountCustomerApiKey(context, enterpriseId, keyId, request));
}

export function restrictCustomerApiKeyAuthority(
  context: RequestContext,
  enterpriseId: string,
  keyId: string,
  request: RestrictCustomerApiKeyRequest
): Promise<ApiResult<CustomerApiKeyMutationResponse>> {
  return onceAfterExpiredAccess(context, () => restrictAccountCustomerApiKey(context, enterpriseId, keyId, request));
}

export function deleteCustomerApiKeyAuthority(
  context: RequestContext,
  enterpriseId: string,
  keyId: string,
  request: DeleteCustomerApiKeyRequest
): Promise<ApiResult<CustomerApiKeyMutationResponse>> {
  return onceAfterExpiredAccess(context, () => deleteAccountCustomerApiKey(context, enterpriseId, keyId, request));
}
