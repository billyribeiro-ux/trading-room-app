/**
 * Typed, server-only transport for the Rust authority boundary.
 *
 * The browser never learns the Rust origin and this module forwards only the two Rust session
 * cookies, never the controller's own cookies. Successful bodies are validated before any
 * upstream Set-Cookie value is accepted.
 */

import type { Cookies } from '@sveltejs/kit';
import { TRADINGROOM_API_URL } from '$app/env/private';
import type {
  AccountBootstrap,
  Error as ApiErrorBody,
  LoginRequest,
  Session,
  TradingRoomApiOperation,
  TradingRoomApiOperations
} from './tradingroom-api.generated';

export type { AccountBootstrap, LoginRequest, Session } from './tradingroom-api.generated';

export const ACCESS_COOKIE = '__Host-tradingroom_access';
export const REFRESH_COOKIE = '__Host-tradingroom_refresh';

const ACCESS_TTL_SECONDS = 600;
const REFRESH_TTL_SECONDS = 14 * 24 * 60 * 60;
const UPSTREAM_TIMEOUT_MS = 5_000;

const OPERATIONS: {
  readonly [Operation in TradingRoomApiOperation]: Pick<
    TradingRoomApiOperations[Operation],
    'method' | 'path' | 'successStatus'
  >;
} = {
  login: { method: 'POST', path: '/api/auth/login', successStatus: 200 },
  logout: { method: 'POST', path: '/api/auth/logout', successStatus: 204 },
  refreshSession: { method: 'POST', path: '/api/auth/refresh', successStatus: 200 },
  getAccountBootstrap: { method: 'GET', path: '/api/v1/account', successStatus: 200 }
};

export interface RequestContext {
  cookies: Cookies;
  origin: string;
  clientAddress?: string;
  userAgent?: string | null;
  fetch?: typeof globalThis.fetch;
}

export function apiRequestContext(input: {
  cookies: Cookies;
  url: URL;
  request: Request;
  getClientAddress: () => string;
}): RequestContext {
  let clientAddress: string | undefined;
  try {
    clientAddress = input.getClientAddress();
  } catch {
    // The API deliberately accepts absent peer attribution and logs the deployment degradation;
    // inventing an address here would collapse every user into a misleading shared identity.
  }
  return {
    cookies: input.cookies,
    origin: input.url.origin,
    clientAddress,
    userAgent: input.request.headers.get('user-agent')
  };
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly status: number;
  readonly data: T;
}

export interface ApiFailure {
  readonly ok: false;
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export class UnsafeApiCookieError extends Error {
  constructor(reason: string) {
    super(`Rust API cookie rejected: ${reason}`);
    this.name = 'UnsafeApiCookieError';
  }
}

type ApiCookieDisposition = 'live' | 'expired';

function baseUrl(): string {
  return (TRADINGROOM_API_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isSession(value: unknown): value is Session {
  if (!isRecord(value) || !hasExactKeys(value, ['userId', 'displayName', 'isPlatformAdmin', 'expiresAt'])) {
    return false;
  }
  return (
    isUuid(value.userId) &&
    typeof value.displayName === 'string' &&
    typeof value.isPlatformAdmin === 'boolean' &&
    Number.isSafeInteger(value.expiresAt)
  );
}

export function isLoginRequest(value: unknown): value is LoginRequest {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['email', 'password']) &&
    typeof value.email === 'string' &&
    typeof value.password === 'string'
  );
}

function isAccountBootstrap(value: unknown): value is AccountBootstrap {
  if (!isRecord(value) || !hasExactKeys(value, ['user', 'accounts'])) return false;
  if (!isRecord(value.user) || !Array.isArray(value.accounts)) return false;
  if (
    !hasExactKeys(value.user, ['id', 'displayName', 'isPlatformAdmin', 'isGuest', 'preferences']) ||
    !isUuid(value.user.id) ||
    typeof value.user.displayName !== 'string' ||
    typeof value.user.isPlatformAdmin !== 'boolean' ||
    typeof value.user.isGuest !== 'boolean' ||
    !isRecord(value.user.preferences)
  ) {
    return false;
  }

  return value.accounts.every((account) => {
    if (!isRecord(account) || !hasExactKeys(account, ['id', 'name', 'slug', 'role', 'rooms'])) return false;
    if (
      !isUuid(account.id) ||
      typeof account.name !== 'string' ||
      typeof account.slug !== 'string' ||
      (account.role !== 'owner' && account.role !== 'admin') ||
      !Array.isArray(account.rooms)
    ) {
      return false;
    }
    return account.rooms.every(
      (room) =>
        isRecord(room) &&
        hasExactKeys(room, ['id', 'name', 'state', 'memberId', 'role']) &&
        isUuid(room.id) &&
        isUuid(room.memberId) &&
        typeof room.name === 'string' &&
        typeof room.state === 'string' &&
        ['owner', 'presenter', 'limited_presenter', 'moderator', 'member'].includes(String(room.role))
    );
  });
}

function isApiError(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['error']) &&
    isRecord(value.error) &&
    hasExactKeys(value.error, ['code', 'message']) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  );
}

function parseCookie(
  raw: string,
  disposition: ApiCookieDisposition
): {
  name: typeof ACCESS_COOKIE | typeof REFRESH_COOKIE;
  value: string;
  path: string;
  sameSite: 'lax' | 'strict';
  maxAge: number;
} {
  const segments = raw.split(';');
  const pair = segments.shift()?.trim() ?? '';
  const separator = pair.indexOf('=');
  if (separator <= 0) throw new UnsafeApiCookieError('missing name/value pair');

  const name = pair.slice(0, separator).trim();
  if (name !== ACCESS_COOKIE && name !== REFRESH_COOKIE) {
    throw new UnsafeApiCookieError(`unexpected name ${JSON.stringify(name)}`);
  }
  const value = pair.slice(separator + 1).trim();
  if (/[^\x21-\x7e]/.test(value) || value.includes(';')) {
    throw new UnsafeApiCookieError(`${name} contains invalid bytes`);
  }

  const attributes = new Map<string, string>();
  for (const segment of segments) {
    const [rawName, ...rawValue] = segment.trim().split('=');
    const attribute = rawName.toLowerCase();
    if (!attribute || attributes.has(attribute)) {
      throw new UnsafeApiCookieError(`${name} has an empty or duplicate attribute`);
    }
    if (!['max-age', 'path', 'httponly', 'secure', 'samesite'].includes(attribute)) {
      throw new UnsafeApiCookieError(`${name} has unreviewed attribute ${JSON.stringify(rawName)}`);
    }
    attributes.set(attribute, rawValue.join('=').trim());
  }

  if (!attributes.has('httponly') || !attributes.has('secure')) {
    throw new UnsafeApiCookieError(`${name} must be HttpOnly and Secure`);
  }
  if (attributes.get('httponly') !== '' || attributes.get('secure') !== '') {
    throw new UnsafeApiCookieError(`${name} boolean attributes must not carry values`);
  }

  // RFC 10025 requires Path=/ for every __Host- cookie. A narrower refresh path
  // causes conformant browsers to reject the cookie instead of scoping it.
  const expectedPath = '/';
  const path = attributes.get('path');
  if (path !== expectedPath) throw new UnsafeApiCookieError(`${name} has path ${JSON.stringify(path)}`);

  const rawMaxAge = attributes.get('max-age');
  if (!rawMaxAge || !/^\d+$/.test(rawMaxAge)) {
    throw new UnsafeApiCookieError(`${name} has invalid Max-Age`);
  }
  const maxAge = Number(rawMaxAge);
  const expectedTtl = name === ACCESS_COOKIE ? ACCESS_TTL_SECONDS : REFRESH_TTL_SECONDS;
  if (disposition === 'live' && (maxAge !== expectedTtl || value === '')) {
    throw new UnsafeApiCookieError(`${name} is not the required live cookie`);
  }
  if (disposition === 'expired' && (maxAge !== 0 || value !== '')) {
    throw new UnsafeApiCookieError(`${name} is not the required expired cookie`);
  }

  const sameSite = attributes.get('samesite')?.toLowerCase();
  const expectedSameSite = name === REFRESH_COOKIE && maxAge > 0 ? 'strict' : 'lax';
  if (sameSite !== expectedSameSite) {
    throw new UnsafeApiCookieError(`${name} has SameSite=${JSON.stringify(sameSite)}`);
  }

  return { name, value, path, sameSite, maxAge };
}

/** Accepts only a complete live or expired pair from a session-changing operation. */
export function applyApiCookies(
  headers: readonly string[],
  cookies: Cookies,
  disposition: ApiCookieDisposition = 'live'
): void {
  const seen = new Set<string>();
  const parsed = headers.map((header) => parseCookie(header, disposition));
  for (const cookie of parsed) {
    if (seen.has(cookie.name)) throw new UnsafeApiCookieError(`duplicate ${cookie.name}`);
    seen.add(cookie.name);
  }
  if (seen.size !== 2 || !seen.has(ACCESS_COOKIE) || !seen.has(REFRESH_COOKIE)) {
    throw new UnsafeApiCookieError('the complete access and refresh cookie pair is required');
  }
  // Parse the complete set before mutating the response cookie jar. A malformed second header
  // must not leave the first one applied.
  for (const cookie of parsed) {
    cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      httpOnly: true,
      secure: true,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge
    });
  }
}

/** Returns only Rust session cookies; controller, impersonation, and room cookies stay local. */
export function apiCookieHeader(cookies: Pick<Cookies, 'get'>): string | undefined {
  const pairs = [ACCESS_COOKIE, REFRESH_COOKIE]
    .map((name) => [name, cookies.get(name)] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== undefined)
    .map(([name, value]) => `${name}=${value}`);
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

async function call<Operation extends TradingRoomApiOperation>(
  operation: Operation,
  context: RequestContext,
  request: TradingRoomApiOperations[Operation]['request']
): Promise<ApiResult<TradingRoomApiOperations[Operation]['response']>> {
  const contract = OPERATIONS[operation];
  const headers = new Headers({ accept: 'application/json' });
  const cookie = apiCookieHeader(context.cookies);
  if (cookie) headers.set('cookie', cookie);
  if (request !== undefined) headers.set('content-type', 'application/json');
  if (contract.method !== 'GET') {
    headers.set('origin', context.origin);
    headers.set('sec-fetch-site', 'same-origin');
  }
  if (context.clientAddress) headers.set('x-forwarded-for', context.clientAddress);
  if (context.userAgent) headers.set('user-agent', context.userAgent);

  let response: Response;
  try {
    response = await (context.fetch ?? globalThis.fetch)(`${baseUrl()}${contract.path}`, {
      method: contract.method,
      headers,
      body: request === undefined ? undefined : JSON.stringify(request),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (cause) {
    console.error('[tradingroom-api] request failed', {
      operation,
      errorType: cause instanceof Error ? cause.name : typeof cause
    });
    return {
      ok: false,
      status: 503,
      code: 'unavailable',
      message: 'The account service is unavailable.'
    };
  }

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw !== '') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
  }

  if (!response.ok) {
    if (isApiError(parsed)) {
      return {
        ok: false,
        status: response.status,
        code: parsed.error.code,
        message: parsed.error.message
      };
    }
    console.error('[tradingroom-api] invalid error response', { operation, status: response.status });
    return {
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse',
      message: 'The account service returned an invalid response.'
    };
  }

  const valid =
    response.status === contract.successStatus &&
    (operation === 'logout'
      ? raw === ''
      : operation === 'getAccountBootstrap'
        ? isAccountBootstrap(parsed)
        : isSession(parsed));
  if (!valid) {
    console.error('[tradingroom-api] invalid success response', { operation, status: response.status });
    return {
      ok: false,
      status: 502,
      code: 'invalidUpstreamResponse',
      message: 'The account service returned an invalid response.'
    };
  }

  try {
    const responseCookies = response.headers.getSetCookie();
    if (operation === 'getAccountBootstrap') {
      if (responseCookies.length !== 0) {
        throw new UnsafeApiCookieError('a read-only operation returned session cookies');
      }
    } else {
      applyApiCookies(responseCookies, context.cookies, operation === 'logout' ? 'expired' : 'live');
    }
  } catch (cause) {
    console.error('[tradingroom-api] refused response cookies', {
      operation,
      errorType: cause instanceof Error ? cause.name : typeof cause
    });
    return {
      ok: false,
      status: 502,
      code: 'invalidUpstreamCookie',
      message: 'The account service returned an invalid session.'
    };
  }

  return {
    ok: true,
    status: response.status,
    data: parsed as TradingRoomApiOperations[Operation]['response']
  };
}

export function login(context: RequestContext, request: LoginRequest): Promise<ApiResult<Session>> {
  return call('login', context, request);
}

export function refreshSession(context: RequestContext): Promise<ApiResult<Session>> {
  return call('refreshSession', context, undefined);
}

export function logout(context: RequestContext): Promise<ApiResult<null>> {
  return call('logout', context, undefined);
}

export function getAccountBootstrap(context: RequestContext): Promise<ApiResult<AccountBootstrap>> {
  return call('getAccountBootstrap', context, undefined);
}

export function apiResultResponse<T>(result: ApiResult<T>): Response {
  const cacheControl = { 'cache-control': 'private, no-store' };
  if (result.ok) {
    return new Response(result.data === null ? null : JSON.stringify(result.data), {
      status: result.status,
      headers: result.data === null ? cacheControl : { ...cacheControl, 'content-type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: { code: result.code, message: result.message } }), {
    status: result.status,
    headers: { ...cacheControl, 'content-type': 'application/json' }
  });
}
