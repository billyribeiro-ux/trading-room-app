/**
 * The WordPress SSO verifier.
 *
 * Every test here is a door somebody could otherwise walk through. The two that matter most are
 * `refuses a token older than our ceiling even when the customer's exp is generous` — without it a
 * payment gate is decorative — and `refuses a token minted for another room`, which is what stops
 * one customer's key from being a master key across their own rooms.
 */
import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  generateSsoSecret,
  SSO_CLOCK_SKEW_SECONDS,
  SSO_MAX_TOKEN_AGE_SECONDS,
  verifySsoToken
} from './sso-token';

const SECRET = 'a'.repeat(64);
const ROOM = '1001';
const NOW = 1_800_000_000;

function base64Url(value: object | string): string {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Mints exactly what a WordPress plugin would send. */
function mint(
  payload: Record<string, unknown>,
  options: { secret?: string; alg?: string } = {}
): string {
  const header = base64Url({ alg: options.alg ?? 'HS256', typ: 'JWT' });
  const body = base64Url(payload);
  const mac = createHmac('sha256', options.secret ?? SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${body}.${mac}`;
}

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Dana Reyes',
    email: 'Dana.Reyes@Example.com',
    room: ROOM,
    memberships: ['gold-annual'],
    products: ['options-mastery'],
    permissions: [],
    iat: NOW,
    exp: NOW + 900,
    ...overrides
  };
}

describe('verifySsoToken', () => {
  it('accepts a well-formed token and normalises the email', () => {
    const result = verifySsoToken(SECRET, ROOM, mint(claims()), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Lower-cased once, here, because it is the join key to a membership row.
    expect(result.claims.email).toBe('dana.reyes@example.com');
    expect(result.claims.name).toBe('Dana Reyes');
    expect(result.claims.memberships).toEqual(['gold-annual']);
    expect(result.claims.products).toEqual(['options-mastery']);
  });

  it('refuses when the room has no SSO key configured', () => {
    for (const secret of [undefined, null, '', '   ']) {
      const result = verifySsoToken(secret, ROOM, mint(claims()), NOW);
      expect(result).toEqual({ ok: false, reason: 'no-secret' });
    }
  });

  it('refuses a token signed with a different key', () => {
    const result = verifySsoToken(SECRET, ROOM, mint(claims(), { secret: 'b'.repeat(64) }), NOW);
    expect(result).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses alg none and any algorithm that is not HS256', () => {
    for (const alg of ['none', 'None', 'HS512', 'RS256', '']) {
      const result = verifySsoToken(SECRET, ROOM, mint(claims(), { alg }), NOW);
      expect(result).toEqual({ ok: false, reason: 'bad-algorithm' });
    }
  });

  it('refuses a payload edited after signing', () => {
    const token = mint(claims());
    const [header, , mac] = token.split('.');
    const tampered = `${header}.${base64Url(claims({ email: 'someone.else@example.com' }))}.${mac}`;
    expect(verifySsoToken(SECRET, ROOM, tampered, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('refuses anything that is not three non-empty segments', () => {
    for (const token of ['', 'a', 'a.b', 'a.b.c.d', '.b.c', 'a..c', 'a.b.']) {
      const result = verifySsoToken(SECRET, ROOM, token, NOW);
      expect(result.ok).toBe(false);
    }
    expect(verifySsoToken(SECRET, ROOM, null, NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses a token minted for another room', () => {
    const result = verifySsoToken(SECRET, ROOM, mint(claims({ room: '2002' })), NOW);
    expect(result).toEqual({ ok: false, reason: 'wrong-room' });
  });

  it('requires the room claim rather than inferring it from the URL', () => {
    const result = verifySsoToken(SECRET, ROOM, mint(claims({ room: undefined })), NOW);
    expect(result).toEqual({ ok: false, reason: 'bad-claims' });
  });

  it('requires a name and an email', () => {
    for (const missing of [{ email: '' }, { name: '' }, { email: undefined }, { name: undefined }]) {
      const result = verifySsoToken(SECRET, ROOM, mint(claims(missing)), NOW);
      expect(result).toEqual({ ok: false, reason: 'bad-claims' });
    }
  });

  it('requires numeric iat and exp', () => {
    for (const bad of [{ iat: 'soon' }, { exp: null }, { exp: undefined }, { iat: undefined }]) {
      const result = verifySsoToken(SECRET, ROOM, mint(claims(bad)), NOW);
      expect(result).toEqual({ ok: false, reason: 'bad-claims' });
    }
  });

  it('refuses an expired token, with skew tolerance either side of the boundary', () => {
    const token = mint(claims({ exp: NOW }));
    // Inside the skew window: still good, because two machines disagree about "now".
    expect(verifySsoToken(SECRET, ROOM, token, NOW + SSO_CLOCK_SKEW_SECONDS).ok).toBe(true);
    expect(verifySsoToken(SECRET, ROOM, token, NOW + SSO_CLOCK_SKEW_SECONDS + 1)).toEqual({
      ok: false,
      reason: 'expired'
    });
  });

  /*
    THE payment-gate test.

    A customer whose WordPress mints year-long tokens — which is exactly what the reference's own
    handoff does, at 360 days — would otherwise turn "is this subscription paid?" into "was it paid
    at some point last year". Our ceiling applies on top of their `exp`, so a stale assertion is
    refused even though the customer considers it valid.
  */
  it('refuses a token older than our ceiling even when the customer exp is generous', () => {
    const longLived = claims({ iat: NOW, exp: NOW + 31_104_000 });
    const token = mint(longLived);

    const stillFresh = NOW + SSO_MAX_TOKEN_AGE_SECONDS - 1;
    expect(verifySsoToken(SECRET, ROOM, token, stillFresh).ok).toBe(true);

    const tooOld = NOW + SSO_MAX_TOKEN_AGE_SECONDS + SSO_CLOCK_SKEW_SECONDS + 1;
    expect(verifySsoToken(SECRET, ROOM, token, tooOld)).toEqual({ ok: false, reason: 'too-old' });
  });

  it('refuses a token stamped in the future beyond skew', () => {
    const token = mint(claims({ iat: NOW + 5_000, exp: NOW + 10_000 }));
    expect(verifySsoToken(SECRET, ROOM, token, NOW)).toEqual({
      ok: false,
      reason: 'from-the-future'
    });
  });

  /*
    Both list shapes are accepted because both are what a WordPress plugin naturally produces:
    `json_encode` of a term list gives an array, `implode(',', $slugs)` gives a string. The
    signature covers whichever arrived, so accepting both costs no security and saves a support
    ticket per integrator.
  */
  it('accepts entitlements as an array or as a comma-separated string', () => {
    const asArray = verifySsoToken(SECRET, ROOM, mint(claims({ memberships: ['a', ' b '] })), NOW);
    const asString = verifySsoToken(SECRET, ROOM, mint(claims({ memberships: 'a, b' })), NOW);
    expect(asArray.ok && asArray.claims.memberships).toEqual(['a', 'b']);
    expect(asString.ok && asString.claims.memberships).toEqual(['a', 'b']);
  });

  it('treats a missing or unusable entitlement claim as empty rather than failing', () => {
    const result = verifySsoToken(
      SECRET,
      ROOM,
      mint(claims({ memberships: undefined, products: 42, permissions: [1, 'ok', null] })),
      NOW
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claims.memberships).toEqual([]);
    expect(result.claims.products).toEqual([]);
    // Non-strings are dropped rather than coerced: a permission named "1" is not a permission.
    expect(result.claims.permissions).toEqual(['ok']);
  });
});

describe('generateSsoSecret', () => {
  it('produces 32 bytes of hex, and a different one every time', () => {
    const first = generateSsoSecret();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(Array.from({ length: 50 }, generateSsoSecret)).size).toBe(50);
  });

  it('produces a key that the verifier actually accepts', () => {
    const secret = generateSsoSecret();
    const result = verifySsoToken(secret, ROOM, mint(claims(), { secret }), NOW);
    expect(result.ok).toBe(true);
  });
});
