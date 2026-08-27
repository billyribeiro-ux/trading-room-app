/**
 * The handoff to the live room, and the credential the room trusts.
 *
 * Two doors lead into a room and both are minted here, so there is one signer
 * rather than two implementations that drift:
 *
 *   `/launch/[id]`                   an owner launching their own room from the account page
 *   `/session/[code]/joined`         a guest who has just satisfied the room's login rules
 *
 * ## Matched to the reference, 2026-08-07
 *
 * This module previously diverged on purpose — a 60-second life and a `jti` the room redeemed, so a
 * captured token could not be replayed. The instruction is now to match the reference exactly and
 * improve afterwards, deliberately, so both are gone.
 *
 * The payload is transcribed from `ptr1.json` `caps[0]` node `r.0.1.1.0.0.0.3`, and the same token
 * appears byte-identical in `ptr2.json`'s sessions table:
 *
 *     { "name": …, "email": …, "id": …, "type": "site",
 *       "issued": 1784840082215,   // ms since epoch
 *       "iat":    1784840082,      // s since epoch
 *       "exp":    1815944082 }     // iat + 31,104,000 = 360.0 days
 *
 * Key order is the reference's, so the encoded bytes match rather than only the claim set.
 *
 * Two consequences, recorded rather than hidden:
 *
 *  - **A Launch URL is a room credential for a year**, and it now sits in the page's `href`, in
 *    browser history and in referrer headers. That is the reference's behaviour.
 *  - **Single use is gone.** That was not only a lost defence, it was a behaviour difference: a user
 *    whose room failed to load could not retry, because their token was already spent. Refresh
 *    works again, as it does in the reference.
 *
 * Restoring a short TTL and replay defence is a scheduled improvement — `docs/OUTSTANDING.md` §5.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Seconds a handoff token is valid for: `exp - iat` in the captured token, exactly.
 * 31,104,000 = 360 days of 86,400 seconds.
 */
export const HANDOFF_TTL_SECONDS = 31_104_000;

/** Seconds a config-read signature is valid for. Same reasoning, different credential. */
export const CONFIG_READ_TTL_SECONDS = 60;

/**
 * Seconds a config-WRITE signature is valid for.
 *
 * The same sixty, and deliberately not shorter. A shorter window would not make the credential
 * stronger — it is a MAC over `code.timestamp` either way — and it would make a write fail on clock
 * skew that a read survives, which is the kind of asymmetry that gets diagnosed as "the ban button
 * is flaky".
 */
export const CONFIG_WRITE_TTL_SECONDS = 60;

export interface HandoffIdentity {
  name: string;
  email: string;
  /**
   * The account id for an owner launch. A guest has no account row, so the room is told who they
   * are without being told they are somebody they are not — see `guestHandoffToken`.
   */
  id: string;
}

export interface HandoffPayload extends HandoffIdentity {
  type: 'site' | 'guest';
  /** Milliseconds since epoch. The reference carries both this and `iat`; so do we. */
  issued: number;
  /** Seconds since epoch. */
  iat: number;
  exp: number;
}

export function base64Url(value: object | string): string {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * HMAC-SHA256 over `signingInput`, base64url. Exported so there is ONE signer in this application
 * rather than a second `createHmac` that drifts in encoding.
 *
 * Domain separation is the CALLER's job and is not optional: every caller prefixes its input with a
 * literal that names the credential (`config-read:`, `stream-ingest:`). Without that, one secret
 * mints every token type and a value valid in one context is replayable in another.
 */
export function signature(secret: string, signingInput: string): string {
  return createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * `type: 'site'` — an authenticated account launching a room it owns.
 *
 * `nowSeconds` is a parameter rather than a `Date.now()` call so the expiry is testable without
 * faking the clock globally.
 */
export function siteHandoffToken(
  secret: string,
  identity: HandoffIdentity,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  return signHandoff(secret, {
    name: identity.name,
    email: identity.email,
    id: identity.id,
    type: 'site',
    issued: nowSeconds * 1000,
    iat: nowSeconds,
    exp: nowSeconds + HANDOFF_TTL_SECONDS
  });
}

/**
 * `type: 'guest'` — someone who satisfied the room's own login (name, email, room password,
 * nickFilter, phone) but has no account here.
 *
 * The room needs to be able to tell the two apart: a guest is not an owner and must not inherit an
 * owner's authority just because both arrive on the same URL. `id` is empty rather than borrowed.
 */
export function guestHandoffToken(
  secret: string,
  identity: Omit<HandoffIdentity, 'id'>,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  return signHandoff(secret, {
    name: identity.name,
    email: identity.email,
    id: '',
    type: 'guest',
    issued: nowSeconds * 1000,
    iat: nowSeconds,
    exp: nowSeconds + HANDOFF_TTL_SECONDS
  });
}

function signHandoff(secret: string, payload: HandoffPayload): string {
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const body = base64Url(payload);
  return `${header}.${body}.${signature(secret, `${header}.${body}`)}`;
}

/**
 * The room's URL for a handoff, or null when no separate room application is configured.
 *
 * Returning null rather than throwing keeps `launch/[id]`'s same-origin fallback intact: this
 * repository owns an evidence-backed room-login route of its own, and a blank `ROOM_BASE_URL`
 * means "use it".
 */
export function handoffUrl(roomBaseUrl: string | undefined, shortCode: string, token: string): URL | null {
  const base = roomBaseUrl?.trim();
  if (!base) return null;

  const target = new URL('/session', base);
  target.searchParams.set('id', shortCode);
  target.searchParams.set('jwtSite', token);
  return target;
}

/**
 * The href a Launch button carries — the reference's `ng-href`, resolved at page load.
 *
 * The reference embeds the whole `/session?id=…&jwtSite=…` URL in the anchor when the page renders,
 * on both the account list and the manage page. Both surfaces here call this so there is one
 * answer, and so "copy link address" yields a working room URL exactly as it does there.
 *
 * Falls back to this application's own evidence-backed room-login route when `ROOM_BASE_URL` is
 * blank, which is what `handoffUrl` returning null means. No token is minted in that case — there
 * is no separate room to hand off to, so signing a credential for it would be pointless.
 */
export function launchHref(
  roomBaseUrl: string | undefined,
  secret: string | undefined,
  shortCode: string,
  identity: HandoffIdentity,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const sameOrigin = `/session/${encodeURIComponent(shortCode)}`;
  if (!roomBaseUrl?.trim() || !secret) return sameOrigin;

  const target = handoffUrl(roomBaseUrl, shortCode, siteHandoffToken(secret, identity, nowSeconds));
  return target ? target.toString() : sameOrigin;
}

/**
 * The server-to-server credential for reading a room's configuration.
 *
 * Deliberately NOT a JWT: nothing about it needs to be self-describing, it never reaches a browser,
 * and a bearer token whose entire content is a MAC over `code.timestamp` cannot carry a claim
 * somebody forgot to check. Domain-separated from the handoff by the `config-read:` prefix so one
 * secret cannot mint the other.
 */
export function configReadToken(
  secret: string,
  shortCode: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  return `${nowSeconds}.${signature(secret, `config-read:${shortCode}.${nowSeconds}`)}`;
}

/**
 * The server-to-server credential for CHANGING a room's configuration.
 *
 * ## Why this exists, and what it fixes
 *
 * Until 2026-08-27 there was one prefix. `internal/room-ban`, `internal/room-permissions`,
 * `internal/room-setting` and `internal/stream-ingest` all MUTATE controller state, and all four
 * accepted `config-read:` — so a capability minted to read a room's settings also authorised banning
 * a member from it. Three of those routes said so in their own docblocks, in the same words, and
 * called splitting the prefixes "the one follow-up all of these endpoints share". Every new door
 * inherited it, which is how an accepted caveat becomes a permanent one.
 *
 * The MAC is not what was weak: both credentials are derived from `ROOM_JWT_SECRET`, and anything
 * holding that secret can mint either. What was wrong is that the credential did not SAY what it
 * authorised, so nothing could refuse a read token presented at a write. Domain separation is what
 * makes the refusal possible, and `config-read-cannot-write-contract.test.ts` is what proves it
 * happens.
 *
 * ## The deployment note, stated because it is a real consequence
 *
 * The room mints and the controller verifies, and they are separate deployables. During the deploy
 * skew of the release that introduces this, a write from the old room to the new controller is
 * REFUSED — 401, surfaced as a refusal in the presenter's UI, no data written and nothing silently
 * dropped. That is the direction this repository resolves ambiguity in, and it is why the controller
 * does NOT accept both prefixes "for a transition": a transition that accepts the old credential is
 * the current state wearing a deprecation notice.
 */
export function configWriteToken(
  secret: string,
  shortCode: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): string {
  return `${nowSeconds}.${signature(secret, `config-write:${shortCode}.${nowSeconds}`)}`;
}

export type ConfigReadResult = { ok: true } | { ok: false; reason: 'malformed' | 'stale' | 'bad-signature' };

/**
 * One verifier for both credentials, taking the domain as an argument.
 *
 * A second copy of this function differing only in a string literal is how the two would drift — and
 * the drift that matters here is silent: a write verifier that forgot the freshness check, or
 * compared with `===` instead of `timingSafeEqual`, would still pass every test that only checks a
 * good token is accepted. One implementation, two domains, and the domain is the only difference.
 */
function verifyDomainToken(
  domain: 'config-read' | 'config-write',
  secret: string,
  shortCode: string,
  token: string | null | undefined,
  ttlSeconds: number,
  nowSeconds: number
): ConfigReadResult {
  if (!token) return { ok: false, reason: 'malformed' };

  const separator = token.indexOf('.');
  if (separator <= 0) return { ok: false, reason: 'malformed' };

  const issuedAt = Number(token.slice(0, separator));
  const presented = token.slice(separator + 1);
  if (!Number.isInteger(issuedAt) || !presented) return { ok: false, reason: 'malformed' };

  /*
    Signature before freshness.

    Checking the timestamp first would answer "is this within the window" for an unauthenticated
    caller, which is a small oracle but a free one to avoid. It also keeps the comparison
    constant-time for every rejected request rather than only the ones that get that far.
  */
  const expected = signature(secret, `${domain}:${shortCode}.${issuedAt}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };

  // Symmetric window: a clock skewed either way is a misconfiguration, not a longer grace period.
  if (Math.abs(nowSeconds - issuedAt) > ttlSeconds) return { ok: false, reason: 'stale' };

  return { ok: true };
}

/** May this caller READ the room's configuration? A write credential is not accepted here. */
export function verifyConfigReadToken(
  secret: string,
  shortCode: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): ConfigReadResult {
  return verifyDomainToken('config-read', secret, shortCode, token, CONFIG_READ_TTL_SECONDS, nowSeconds);
}

/**
 * May this caller CHANGE the room's configuration?
 *
 * A read credential is refused here, which is the whole point of the split, and the refusal is
 * asserted rather than assumed — see `config-read-cannot-write-contract.test.ts`.
 */
export function verifyConfigWriteToken(
  secret: string,
  shortCode: string,
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): ConfigReadResult {
  return verifyDomainToken('config-write', secret, shortCode, token, CONFIG_WRITE_TTL_SECONDS, nowSeconds);
}
