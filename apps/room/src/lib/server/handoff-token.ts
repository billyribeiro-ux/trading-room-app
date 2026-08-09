/**
 * Verifying the controller's handoff token.
 *
 * `new-room-control` mints this at `/launch/[id]` (an owner launching a room they own) and at
 * `/session/[code]/joined` (a guest who satisfied the room's own login rules). Both arrive here as
 *
 *   GET /session?id=<shortCode>&jwtSite=<HS256 JWT>
 *
 * with payload `{ name, email, id, type, issued, iat, exp }` — the reference's exact claim set and
 * key order, transcribed from `ptr1.json` `caps[0]` node `r.0.1.1.0.0.0.3`. This module is the whole
 * of the trust decision, kept out of the route so every branch of it is testable without a server.
 *
 * ## What is deliberately strict
 *
 * A JWT verifier is a place where "accept unless obviously wrong" quietly becomes an
 * authentication bypass, so every check below is an allow rather than a reject:
 *
 *  - the algorithm must be exactly `HS256`. `alg: "none"` is the textbook forgery and any other
 *    value means the two sides disagree about what was signed;
 *  - the signature is compared in constant time, over the exact bytes presented rather than a
 *    re-serialisation of the decoded payload;
 *  - `type` must be one this room knows. An unrecognised type is a token from a future the room
 *    has not been taught, and guessing at it is how a `guest` gains an owner's authority;
 *  - `exp` is required. A token without one never expires.
 *
 * ## What changed on 2026-08-07
 *
 * The token was matched to the reference, so `jti` is gone and with it the single-use guard that
 * `session/+server.ts` enforced through `redeemHandoff`. The reference mints no `jti` and its token
 * lives 360 days, so a replayed link is simply a working link. That is a real loss of defence AND a
 * behaviour fix — a user whose room failed to load previously could not retry, because their token
 * was already spent. Restoring single use is a scheduled improvement, not an oversight.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** The two doors the controller mints for. */
export type HandoffType = 'site' | 'guest';

export interface HandoffClaims {
  name: string;
  email: string;
  /** The controller's account id for a `site` token. Empty for a guest, who has no account. */
  id: string;
  type: HandoffType;
  /** Milliseconds since epoch, as the reference mints it. */
  issued: number;
  /** Seconds since epoch. */
  iat: number;
  exp: number;
}

export type HandoffRejection =
  'malformed' | 'bad-algorithm' | 'bad-signature' | 'expired' | 'bad-claims' | 'unknown-type';

export type HandoffResult =
  { ok: true; claims: HandoffClaims } | { ok: false; reason: HandoffRejection };

/**
 * Skew tolerance on `exp`.
 *
 * The token lives 60 seconds and crosses two processes; without a little slack, a clock a second
 * fast on one side rejects a token the other just minted. Kept small deliberately — this widens
 * the replay window by exactly as much as it forgives.
 */
export const CLOCK_SKEW_SECONDS = 5;

function decodeSegment(segment: string): unknown {
  // `base64url` rejects nothing, so a malformed segment yields garbage rather than throwing; the
  // JSON.parse below is what actually fails, and the caller treats that as malformed.
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function verifyHandoffToken(
  secret: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): HandoffResult {
  if (!token) return { ok: false, reason: 'malformed' };

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return { ok: false, reason: 'malformed' };
  }
  const [headerSegment, payloadSegment, presentedSignature] = parts;

  let header: unknown;
  let payload: unknown;
  try {
    header = decodeSegment(headerSegment);
    payload = decodeSegment(payloadSegment);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!isRecord(header) || header.alg !== 'HS256' || header.typ !== 'JWT') {
    return { ok: false, reason: 'bad-algorithm' };
  }

  /*
    Signed over the presented segments, not over a re-encode of `payload`.

    Re-serialising and re-signing would compare a token to itself: any field the parser dropped or
    normalised would verify happily and then be read as if it had been signed.
  */
  const expected = createHmac('sha256', secret)
    .update(`${headerSegment}.${payloadSegment}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const a = Buffer.from(expected);
  const b = Buffer.from(presentedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return { ok: false, reason: 'bad-signature' };

  if (!isRecord(payload)) return { ok: false, reason: 'bad-claims' };

  const { name, email, id, type, issued, iat, exp } = payload;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return { ok: false, reason: 'bad-claims' };
  /*
    `issued` (ms) and `iat` (s) are the reference's, transcribed from ptr1.json caps[0]. They are
    required so a token missing them is refused rather than quietly accepted as a different shape.

    There is no `jti` any more. The reference has none, and the room's single-use guard depended on
    it — see the module header and docs/OUTSTANDING.md.
  */
  if (typeof issued !== 'number' || !Number.isFinite(issued))
    return { ok: false, reason: 'bad-claims' };
  if (typeof iat !== 'number' || !Number.isFinite(iat)) return { ok: false, reason: 'bad-claims' };
  if (typeof name !== 'string' || name.trim().length === 0)
    return { ok: false, reason: 'bad-claims' };
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return { ok: false, reason: 'bad-claims' };
  }
  if (typeof id !== 'string') return { ok: false, reason: 'bad-claims' };

  // Expiry after the claims are known to be well-formed, so an expired token cannot also be a
  // malformed one and get the wrong diagnosis in the log.
  if (nowSeconds > exp + CLOCK_SKEW_SECONDS) return { ok: false, reason: 'expired' };

  if (type !== 'site' && type !== 'guest') return { ok: false, reason: 'unknown-type' };
  // A guest is not an account. A token claiming both is contradictory, and resolving the
  // contradiction in the room's favour is exactly the mistake worth refusing.
  if (type === 'guest' && id !== '') return { ok: false, reason: 'bad-claims' };

  return {
    ok: true,
    claims: { name: name.trim(), email: email.trim().toLowerCase(), id, type, issued, iat, exp }
  };
}
