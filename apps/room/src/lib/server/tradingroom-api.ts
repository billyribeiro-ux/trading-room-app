/**
 * Server-side client for the Rust API (`services/api`).
 *
 * # Why this is server-side only
 *
 * The session lives in `__Host-` prefixed, `HttpOnly` cookies. The browser cannot read them and
 * must not: that is the whole point of `HttpOnly`. So every call to the API is made from
 * SvelteKit's server, which forwards the request's own cookies and hands back any the API
 * issues. The browser talks to one origin and holds one session; the API is never exposed
 * directly.
 *
 * # The cutover this belongs to
 *
 * `/` still runs on the SQLite/Drizzle stack with numeric user ids, across 19 form actions and
 * 15 tables. The Rust API uses uuids and a completely different session.
 *
 * This paragraph used to argue for a slice-by-slice strangler, on the grounds that "rewiring `/`
 * in one step would mean changing authentication, identity types and every form action at once,
 * with no working state in between". **That was wrong**, and it was wrong in the expensive
 * direction: it implied a bridge - a per-user mapping from uuid back to a numeric SQLite id -
 * held for the length of the migration and then deleted.
 *
 * No bridge is needed, because the client does not care what an id is. Measured, not assumed:
 * across `+page.svelte` and every component there is exactly ONE numeric coercion of an id,
 * `Number(user._id)` at `+page.svelte:1199`, and it is handed straight back through
 * `String(user.id)` fourteen lines later. No arithmetic, no `Math.max` over ids, no ordering by
 * id, no comparison against a numeric literal. Ids are opaque keys to the client.
 *
 * So the identity type is a server-side concern only, and the cutover is a replacement of this
 * repository's server layer - `load`, the 19 actions, `hooks.server.ts`, `auth.ts`,
 * `connection.ts` - against a client that does not move. See `docs/CUTOVER-ROOM-TO-API.md`.
 *
 * This file was written once before, in 004ed31, and removed in 7732567 along with an
 * `/enterprise` UI that was invented rather than captured. The UI deserved to go; this client
 * did not, and it is restored here unchanged apart from this paragraph. Nothing imports it yet,
 * so adding it changes no behaviour - it is the transport the first slice will use.
 */

import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Where the Rust API listens.
 *
 * Read from `$env/dynamic/private` rather than `$env/static/private` so the same build runs in
 * dev and in a container without recompiling - the value is only known at deploy time.
 */
function baseUrl(): string {
  return (env.TRADINGROOM_API_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
}

/** The two cookies the API issues. Names must match `http::ACCESS_COOKIE` / `REFRESH_COOKIE`. */
export const ACCESS_COOKIE = '__Host-tradingroom_access';
export const REFRESH_COOKIE = '__Host-tradingroom_refresh';

export interface ApiResult<T> {
  status: number;
  ok: boolean;
  /** Parsed JSON, or null for a 204. */
  data: T | null;
  /** The API's stable machine code (`unauthorized`, `muted`, `trialExpired`, …). */
  code: string | null;
  /** Human-readable, safe to show. The API only fills this for errors a caller can act on. */
  message: string | null;
  /** `Set-Cookie` values to replay to the browser. */
  setCookie: string[];
}

interface CallOptions {
  method?: string;
  body?: unknown;
  /** The inbound request's `Cookie` header, forwarded verbatim. */
  cookie?: string;
  /** The caller's address, for the API's IP-keyed rate limits. */
  clientAddress?: string;
}

/**
 * One call to the API.
 *
 * Never throws on a non-2xx: an HTTP status is data here, and a `load` that wants to render
 * "your trial expired" needs the code, not an exception. A genuinely unreachable API is the one
 * case that produces a synthetic 503, so the caller does not have to distinguish "no response"
 * from "no network stack".
 */
export async function call<T = unknown>(
  path: string,
  options: CallOptions = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { accept: 'application/json' };

  if (options.cookie) headers.cookie = options.cookie;
  if (options.body !== undefined) headers['content-type'] = 'application/json';

  // The API resolves the client address from the rightmost `X-Forwarded-For` entry after
  // stripping TRUSTED_PROXY_HOPS. SvelteKit is one hop in front of it, so it appends exactly
  // one entry here and the API is configured with TRUSTED_PROXY_HOPS=1. Getting this wrong is
  // harmful in both directions: too low and every request looks like it came from this process,
  // so one IP-keyed limit throttles the whole site.
  if (options.clientAddress) headers['x-forwarded-for'] = options.clientAddress;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (cause) {
    // The API being down is an operational fact, not a user error, and must not surface as a
    // 500 that blames the request. Logged here because this is the only place that knows the
    // difference between "unreachable" and "refused".
    console.error('[tradingroom-api] unreachable', cause);
    return {
      status: 503,
      ok: false,
      data: null,
      code: 'unavailable',
      message: 'The service is starting up or unreachable.',
      setCookie: []
    };
  }

  // `getSetCookie` returns each header separately. Reading `.get('set-cookie')` would fold the
  // access and refresh cookies into one comma-joined string and lose both.
  const setCookie = response.headers.getSetCookie?.() ?? [];

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // A non-JSON body from a JSON API is a bug worth seeing, not worth crashing a page over.
      console.error('[tradingroom-api] non-JSON body', { path, status: response.status });
    }
  }

  const error =
    parsed && typeof parsed === 'object' && 'error' in parsed
      ? (parsed as { error: { code?: string; message?: string } }).error
      : null;

  return {
    status: response.status,
    ok: response.ok,
    data: response.ok ? ((parsed ?? null) as T | null) : null,
    code: error?.code ?? null,
    message: error?.message ?? null,
    setCookie
  };
}

/**
 * Replays the API's `Set-Cookie` headers to the browser.
 *
 * SvelteKit's `setHeaders` explicitly refuses `set-cookie`, so each header is parsed back into
 * the attributes `cookies.set` takes. The attributes are read from the API's own header rather
 * than hardcoded here, so the lifetime, path and `SameSite` of each cookie stay decided in one
 * place - the service that issues them.
 *
 * `secure: true` over `http://localhost` is fine: browsers treat localhost as a trustworthy
 * origin, so both `Secure` and the `__Host-` prefix are honoured there. It is not a dev-only
 * relaxation, and there is deliberately none: a build that quietly drops `Secure` outside
 * production is a build whose cookie behaviour is not the one under test.
 */
export function applyCookies(setCookie: string[], cookies: Cookies) {
  for (const raw of setCookie) {
    const [pair, ...rest] = raw.split(';');
    const separator = pair.indexOf('=');
    if (separator === -1) continue;

    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();

    const attributes = new Map<string, string>();
    for (const part of rest) {
      const at = part.indexOf('=');
      if (at === -1) attributes.set(part.trim().toLowerCase(), '');
      else attributes.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim());
    }

    const maxAge = Number(attributes.get('max-age'));
    const sameSite = attributes.get('samesite')?.toLowerCase();

    cookies.set(name, value, {
      // `__Host-` requires exactly this: Path=/, no Domain, Secure. Taken from the header so a
      // change on the API side cannot silently disagree with a copy here.
      path: attributes.get('path') || '/',
      httpOnly: attributes.has('httponly'),
      secure: attributes.has('secure'),
      sameSite: sameSite === 'strict' || sameSite === 'none' ? sameSite : 'lax',
      // 0 is meaningful - it is how the API expires a cookie on logout - so this checks for a
      // number rather than for truthiness.
      maxAge: Number.isFinite(maxAge) ? maxAge : undefined
    });
  }
}

/** The session shape `/api/auth/login` and `/api/auth/refresh` return. */
export interface Session {
  userId: string;
  displayName: string;
  isPlatformAdmin: boolean;
  expiresAt: number;
}
