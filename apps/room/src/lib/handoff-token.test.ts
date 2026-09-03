import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  authorityEmailForHandoff,
  CLOCK_SKEW_SECONDS,
  verifyHandoffToken
} from './server/handoff-token';

/**
 * The room's entire trust decision about who is allowed in.
 *
 * The controller mints these; this file proves the room refuses everything else. Every rejection
 * branch is exercised, because a verifier is the one place where a missing check does not fail —
 * it succeeds, for the wrong person.
 */

const SECRET = 'test-secret-at-least-32-bytes-long-xxxx';
const NOW = 1_785_000_000;

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * Mints a token the same way `signHandoff` does in
 * `apps/controller/src/lib/server/room-handoff.ts` — base64url header, base64url payload, and
 * `signature()`'s HMAC-SHA256 over `header.payload`, base64url with the padding stripped.
 *
 * This cited `new-room-control/src/lib/server/room-handoff.ts` until 2026-08-31: a path in one of the
 * two sibling REFERENCE folders, outside this repository, naming a COPY of a file whose authority is
 * in-tree. A reader following it left the repository to read something they already had.
 */
function mint(
  payload: Record<string, unknown>,
  { secret = SECRET, header = { alg: 'HS256', typ: 'JWT' } } = {}
): string {
  const h = b64(header);
  const p = b64(payload);
  const signature = createHmac('sha256', secret)
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${h}.${p}.${signature}`;
}

const sitePayload = {
  name: 'Ada Owner',
  email: 'Ada@Example.com',
  id: '7',
  type: 'site',
  issued: NOW * 1000,
  iat: NOW,
  exp: NOW + 31_104_000
};

const guestPayload = {
  name: 'Sam Guest',
  email: 'sam@example.com',
  id: '',
  type: 'guest',
  issued: NOW * 1000,
  iat: NOW,
  exp: NOW + 31_104_000
};

describe('a token the controller actually minted', () => {
  it('is accepted, with its claims', () => {
    const result = verifyHandoffToken(SECRET, mint(sitePayload), NOW);
    expect(result).toEqual({
      ok: true,
      claims: {
        name: 'Ada Owner',
        email: 'ada@example.com',
        id: '7',
        type: 'site',
        issued: NOW * 1000,
        iat: NOW,
        exp: NOW + 31_104_000
      }
    });
  });

  it('normalises the email, because the room keys accounts on it', () => {
    // `Ada@Example.com` and `ada@example.com` are one person. Two rows would be two rosters.
    const result = verifyHandoffToken(
      SECRET,
      mint({ ...sitePayload, email: '  ADA@EXAMPLE.COM ' }),
      NOW
    );
    expect(result.ok && result.claims.email).toBe('ada@example.com');
  });

  it('accepts a guest, and keeps them a guest', () => {
    const result = verifyHandoffToken(SECRET, mint(guestPayload), NOW);
    expect(result.ok && result.claims.type).toBe('guest');
    expect(result.ok && result.claims.id).toBe('');
  });
});

describe('handoff membership authority', () => {
  it('allows only an authenticated site token to select a membership by email', () => {
    const site = verifyHandoffToken(SECRET, mint(sitePayload), NOW);
    const guest = verifyHandoffToken(SECRET, mint(guestPayload), NOW);
    expect(site.ok && authorityEmailForHandoff(site.claims)).toBe('ada@example.com');
    expect(guest.ok && authorityEmailForHandoff(guest.claims)).toBe('');
    expect(authorityEmailForHandoff(null)).toBe('');
  });
});

describe('forgery', () => {
  it('refuses a signature made with another secret', () => {
    expect(
      verifyHandoffToken(SECRET, mint(sitePayload, { secret: 'not-the-secret' }), NOW)
    ).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('refuses a payload edited after signing', () => {
    // The canonical attack: take a real guest token and promote it.
    const real = mint(guestPayload);
    const [header, , signature] = real.split('.');
    const tampered = `${header}.${b64({ ...guestPayload, type: 'site', id: '1' })}.${signature}`;
    expect(verifyHandoffToken(SECRET, tampered, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('refuses alg:none, signature or not', () => {
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(sitePayload)}.`;
    expect(verifyHandoffToken(SECRET, unsigned, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyHandoffToken(SECRET, `${unsigned}x`, NOW)).toEqual({
      ok: false,
      reason: 'bad-algorithm'
    });
  });

  it('refuses an algorithm the two sides do not agree on', () => {
    for (const alg of ['HS512', 'RS256', 'hs256', '']) {
      expect(
        verifyHandoffToken(SECRET, mint(sitePayload, { header: { alg, typ: 'JWT' } }), NOW)
      ).toEqual({
        ok: false,
        reason: 'bad-algorithm'
      });
    }
  });

  it('refuses a signature that is merely a prefix of the real one', () => {
    const real = mint(sitePayload);
    const truncated = real.slice(0, -4);
    expect(verifyHandoffToken(SECRET, truncated, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });
});

describe('expiry', () => {
  /** The reference's own lifetime: exp - iat in ptr1.json caps[0] is exactly 31,104,000s = 360d. */
  const REFERENCE_TTL = 31_104_000;

  it('accepts up to exp, plus the stated skew', () => {
    const token = mint(sitePayload);
    expect(verifyHandoffToken(SECRET, token, NOW + REFERENCE_TTL).ok).toBe(true);
    expect(verifyHandoffToken(SECRET, token, NOW + REFERENCE_TTL + CLOCK_SKEW_SECONDS).ok).toBe(
      true
    );
  });

  it('refuses a second past it', () => {
    expect(
      verifyHandoffToken(SECRET, mint(sitePayload), NOW + REFERENCE_TTL + CLOCK_SKEW_SECONDS + 1)
    ).toEqual({
      ok: false,
      reason: 'expired'
    });
  });

  it('refuses a token with no exp at all', () => {
    // Absent means "never expires", which is the opposite of what a 60-second handoff is for.
    const { exp: _dropped, ...noExp } = sitePayload;
    expect(verifyHandoffToken(SECRET, mint(noExp), NOW)).toEqual({
      ok: false,
      reason: 'bad-claims'
    });
  });

  it('refuses a non-numeric or infinite exp rather than coercing it', () => {
    for (const exp of ['9999999999', null, {}]) {
      expect(verifyHandoffToken(SECRET, mint({ ...sitePayload, exp }), NOW).ok).toBe(false);
    }
  });
});

describe('claims', () => {
  it('refuses a type it has not been taught', () => {
    // A token from a future this room does not know is not a token to guess about.
    expect(verifyHandoffToken(SECRET, mint({ ...sitePayload, type: 'admin' }), NOW)).toEqual({
      ok: false,
      reason: 'unknown-type'
    });
  });

  it('refuses a guest carrying an account id', () => {
    // Contradictory: a guest has no account. Resolving it in the room's favour is the bug.
    expect(verifyHandoffToken(SECRET, mint({ ...guestPayload, id: '7' }), NOW)).toEqual({
      ok: false,
      reason: 'bad-claims'
    });
  });

  /*
    `jti` is gone: the reference mints none, and matching it removed the single-use guard that
    depended on it. What replaces this test is the pair below — `issued` and `iat` are the
    reference's own claims, and a token missing either is a different shape that must be refused
    rather than quietly accepted.
  */
  it('refuses a token with no `issued`, which the reference always sends', () => {
    const { issued: _dropped, ...noIssued } = sitePayload;
    expect(verifyHandoffToken(SECRET, mint(noIssued), NOW)).toEqual({
      ok: false,
      reason: 'bad-claims'
    });
  });

  it('refuses a token with no `iat`', () => {
    const { iat: _dropped, ...noIat } = sitePayload;
    expect(verifyHandoffToken(SECRET, mint(noIat), NOW)).toEqual({
      ok: false,
      reason: 'bad-claims'
    });
  });

  it('refuses a blank name or a non-email', () => {
    expect(verifyHandoffToken(SECRET, mint({ ...sitePayload, name: '   ' }), NOW).ok).toBe(false);
    for (const email of ['', 'not-an-email', 'a@b', 'a b@example.com']) {
      expect(verifyHandoffToken(SECRET, mint({ ...sitePayload, email }), NOW).ok).toBe(false);
    }
  });

  it('refuses a numeric id rather than stringifying it', () => {
    expect(verifyHandoffToken(SECRET, mint({ ...sitePayload, id: 7 }), NOW)).toEqual({
      ok: false,
      reason: 'bad-claims'
    });
  });

  it('refuses a payload that is not an object', () => {
    for (const payload of [[], 'string', 42, null]) {
      expect(verifyHandoffToken(SECRET, mint(payload as never), NOW).ok).toBe(false);
    }
  });
});

describe('malformed input', () => {
  it('never throws, whatever it is handed', () => {
    const inputs = [
      undefined,
      null,
      '',
      'a',
      'a.b',
      'a.b.c.d',
      '..',
      'a..c',
      '.b.c',
      'a.b.',
      '!!!.???.###',
      mint(sitePayload).replace(/\./g, '')
    ];
    for (const input of inputs) {
      expect(() => verifyHandoffToken(SECRET, input, NOW)).not.toThrow();
      expect(verifyHandoffToken(SECRET, input, NOW).ok).toBe(false);
    }
  });
});
