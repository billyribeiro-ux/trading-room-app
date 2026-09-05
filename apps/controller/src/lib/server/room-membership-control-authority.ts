import { TRADINGROOM_API_URL, TRADINGROOM_INTERNAL_SECRET } from '$app/env/private';
import type { ManageMemberOperation, MemberTarget, MembershipMutationResponse } from './tradingroom-api.generated.js';
import { isMembershipMutationResponse, type ApiResult } from './tradingroom-api.js';

export type RoomMembershipControlOperation = Extract<
  ManageMemberOperation,
  { type: 'setMuted' | 'setBanned' | 'setPermissions' }
>;

const TIMEOUT_MS = 5_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(status: number, code: string, message: string): ApiResult<never> {
  return { ok: false, status, code, message };
}

export async function mutateRoomMembershipFromController(input: {
  enterpriseId: string;
  roomId: string;
  requestId: string;
  actorMemberId: string;
  target: MemberTarget;
  operation: RoomMembershipControlOperation;
  fetch?: typeof globalThis.fetch;
}): Promise<ApiResult<MembershipMutationResponse>> {
  const secret = TRADINGROOM_INTERNAL_SECRET;
  const base = TRADINGROOM_API_URL?.trim();
  if (!secret || secret.length < 32 || !base) {
    return failure(503, 'unavailable', 'Membership authority is not configured.');
  }
  if (
    ![input.enterpriseId, input.roomId, input.requestId, input.actorMemberId, input.target.memberId].every((id) =>
      UUID.test(id)
    ) ||
    !Number.isSafeInteger(input.target.expectedRevision) ||
    input.target.expectedRevision < 0
  ) {
    return failure(409, 'unreconciledAuthority', 'The membership authority mapping is invalid.');
  }

  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(
      new URL(
        `/internal/v1/accounts/${input.enterpriseId}/rooms/${input.roomId}/members`,
        base.endsWith('/') ? base : `${base}/`
      ),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          requestId: input.requestId,
          actorMemberId: input.actorMemberId,
          target: input.target,
          operation: input.operation
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }
    );
  } catch {
    return failure(503, 'unavailable', 'Membership authority is unavailable.');
  }

  if (response.headers.getSetCookie().length > 0) {
    return failure(502, 'invalidUpstreamCookie', 'Membership authority returned forbidden cookies.');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(502, 'invalidUpstreamResponse', 'Membership authority returned invalid JSON.');
  }
  if (response.ok) {
    return isMembershipMutationResponse(body)
      ? { ok: true, status: response.status, data: body }
      : failure(502, 'invalidUpstreamResponse', 'Membership authority returned an invalid response.');
  }
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    Object.keys(body).length === 1 &&
    'error' in body &&
    body.error &&
    typeof body.error === 'object' &&
    !Array.isArray(body.error) &&
    Object.keys(body.error).length === 2 &&
    'code' in body.error &&
    'message' in body.error &&
    typeof body.error.code === 'string' &&
    typeof body.error.message === 'string'
  ) {
    return failure(response.status, body.error.code, body.error.message);
  }
  return failure(502, 'invalidUpstreamResponse', 'Membership authority returned an invalid error response.');
}
