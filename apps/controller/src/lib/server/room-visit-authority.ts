import { TRADINGROOM_API_URL, TRADINGROOM_INTERNAL_SECRET } from '$app/env/private';
import type { ApiResult, RoomLaunchVisit } from './tradingroom-api.js';

const TIMEOUT_MS = 5_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(status: number, code: string, message: string): ApiResult<never> {
  return { ok: false, status, code, message };
}

function isCloseResponse(value: unknown): value is { closed: boolean } {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 1 &&
    'closed' in value &&
    typeof value.closed === 'boolean'
  );
}

function isVisitResponse(value: unknown): value is RoomLaunchVisit {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const visit = value as Record<string, unknown>;
  return (
    Object.keys(visit).sort().join(',') ===
      ['displayName', 'email', 'enteredAt', 'roomId', 'shortCode', 'userId', 'visitId'].sort().join(',') &&
    UUID.test(String(visit.visitId)) &&
    UUID.test(String(visit.roomId)) &&
    UUID.test(String(visit.userId)) &&
    typeof visit.shortCode === 'string' &&
    typeof visit.email === 'string' &&
    typeof visit.displayName === 'string' &&
    typeof visit.enteredAt === 'string' &&
    Number.isFinite(Date.parse(visit.enteredAt))
  );
}

/** Service-authenticated transport used only after the room HMAC is verified by the controller. */
export async function closeRoomVisitInAuthority(input: {
  enterpriseId: string;
  roomId: string;
  userId?: string;
  email?: string;
  fetch?: typeof globalThis.fetch;
}): Promise<ApiResult<{ closed: boolean }>> {
  const secret = TRADINGROOM_INTERNAL_SECRET;
  const base = TRADINGROOM_API_URL?.trim();
  if (!secret || secret.length < 32 || !base) {
    return failure(503, 'unavailable', 'Room visit authority is not configured.');
  }
  const byUser = input.userId !== undefined && input.email === undefined && UUID.test(input.userId);
  const byEmail =
    input.email !== undefined &&
    input.userId === undefined &&
    input.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email);
  if (![input.enterpriseId, input.roomId].every((id) => UUID.test(id)) || (!byUser && !byEmail)) {
    return failure(409, 'unreconciledAuthority', 'The room visit authority mapping is invalid.');
  }

  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(
      new URL(
        `/internal/v1/accounts/${input.enterpriseId}/rooms/${input.roomId}/visits/close`,
        base.endsWith('/') ? base : `${base}/`
      ),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify(byUser ? { userId: input.userId } : { email: input.email?.trim().toLowerCase() }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }
    );
  } catch {
    return failure(503, 'unavailable', 'Room visit authority is unavailable.');
  }

  if (response.headers.getSetCookie().length > 0) {
    return failure(502, 'invalidUpstreamCookie', 'Room visit authority returned forbidden cookies.');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(502, 'invalidUpstreamResponse', 'Room visit authority returned invalid JSON.');
  }
  if (response.ok) {
    return isCloseResponse(body)
      ? { ok: true, status: response.status, data: body }
      : failure(502, 'invalidUpstreamResponse', 'Room visit authority returned an invalid response.');
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
  return failure(502, 'invalidUpstreamResponse', 'Room visit authority returned an invalid error response.');
}

/** Records a controller-authorized public guest in the canonical visit ledger. */
export async function launchGuestRoomVisitInAuthority(input: {
  enterpriseId: string;
  roomId: string;
  requestId: string;
  email: string;
  displayName: string;
  clientAddress?: string;
  userAgent?: string | null;
  fetch?: typeof globalThis.fetch;
}): Promise<ApiResult<RoomLaunchVisit>> {
  const secret = TRADINGROOM_INTERNAL_SECRET;
  const base = TRADINGROOM_API_URL?.trim();
  if (!secret || secret.length < 32 || !base) {
    return failure(503, 'unavailable', 'Room visit authority is not configured.');
  }
  if (
    ![input.enterpriseId, input.roomId, input.requestId].every((id) => UUID.test(id)) ||
    input.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email) ||
    input.displayName.trim().length === 0 ||
    new TextEncoder().encode(input.displayName.trim()).byteLength > 160
  ) {
    return failure(400, 'invalid', 'The guest room visit input is invalid.');
  }
  const headers = new Headers({
    authorization: `Bearer ${secret}`,
    'content-type': 'application/json'
  });
  if (input.clientAddress) headers.set('x-forwarded-for', input.clientAddress);
  if (input.userAgent) headers.set('user-agent', input.userAgent);
  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(
      new URL(
        `/internal/v1/accounts/${input.enterpriseId}/rooms/${input.roomId}/visits/guest-launch`,
        base.endsWith('/') ? base : `${base}/`
      ),
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requestId: input.requestId,
          email: input.email.trim().toLowerCase(),
          displayName: input.displayName.trim()
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS)
      }
    );
  } catch {
    return failure(503, 'unavailable', 'Room visit authority is unavailable.');
  }
  if (response.headers.getSetCookie().length > 0) {
    return failure(502, 'invalidUpstreamCookie', 'Room visit authority returned forbidden cookies.');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure(502, 'invalidUpstreamResponse', 'Room visit authority returned invalid JSON.');
  }
  if (response.ok) {
    return isVisitResponse(body)
      ? { ok: true, status: response.status, data: body }
      : failure(502, 'invalidUpstreamResponse', 'Room visit authority returned an invalid response.');
  }
  return failure(response.status, 'refused', 'Room visit authority refused the guest launch.');
}
