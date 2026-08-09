import { describe, expect, it } from 'vitest';
import {
  CONFIG_READ_TTL_SECONDS,
  HANDOFF_TTL_SECONDS,
  configReadToken,
  guestHandoffToken,
  handoffUrl,
  siteHandoffToken,
  verifyConfigReadToken
} from './room-handoff';

// Shaped like the fixture in api-key-secret.test.ts, which the secret gate has
// always passed. The previous value scored 3.573 entropy and tripped Gitleaks'
// generic-api-key rule; this one states what it is in words instead. It signs
// nothing outside Vitest.
const SECRET = 'test-only-room-handoff-secret-with-sufficient-entropy';
const NOW = 1_785_000_000;

/** The room verifies these, so the test reads them the way the room will. */
function decode(token: string) {
  const [header, payload, signature] = token.split('.');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    signature
  };
}

describe('the handoff token', () => {
  it('is an HS256 JWT with the reference payload shape', () => {
    const { header, payload } = decode(
      siteHandoffToken(SECRET, { name: 'Ada Owner', email: 'ada@example.com', id: '7' }, NOW)
    );
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT' });
    /*
      toEqual, not toMatchObject: the point of this test is that we mint the reference's claim set
      EXACTLY — no extra claims, none missing. toMatchObject would pass with a stray `jti` still in
      the payload, which is the specific thing this change removed.
    */
    expect(payload).toEqual({
      name: 'Ada Owner',
      email: 'ada@example.com',
      id: '7',
      type: 'site',
      issued: NOW * 1000,
      iat: NOW,
      exp: NOW + HANDOFF_TTL_SECONDS
    });
  });

  /**
   * Transcribed from `ptr1.json` `caps[0]` node `r.0.1.1.0.0.0.3`, and byte-identical in `ptr2`:
   * `exp 1815944082 - iat 1784840082 = 31,104,000` = 360 days exactly.
   */
  it('lives exactly as long as the reference token, 360 days', () => {
    expect(HANDOFF_TTL_SECONDS).toBe(31_104_000);
    expect(1815944082 - 1784840082).toBe(HANDOFF_TTL_SECONDS);
  });

  it('emits the claims in the reference key order, so the bytes match and not just the values', () => {
    const { payload } = decode(siteHandoffToken(SECRET, { name: 'Ada', email: 'ada@example.com', id: '7' }, NOW));
    expect(Object.keys(payload)).toEqual(['name', 'email', 'id', 'type', 'issued', 'iat', 'exp']);
  });

  it('is base64url, never base64 — the room reads it out of a query string', () => {
    // A raw `+` or `/` survives URLSearchParams encoding but not every proxy between here and
    // there, and a `=` is a padding character in a value that has no business needing padding.
    for (const part of siteHandoffToken(SECRET, { name: 'A+B/C', email: 'a@example.com', id: '1' }, NOW).split('.')) {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  /*
    Replaces "gives every mint a distinct jti". The reference mints no jti, so two mints at the same
    second are now byte-identical — which is exactly what makes a Launch link re-usable, and is the
    behaviour being matched. Asserted rather than left implicit, so re-introducing a nonce is a
    deliberate act that fails this test first.
  */
  it('is reproducible: the same identity at the same second mints the same token', () => {
    const identity = { name: 'Ada', email: 'ada@example.com', id: '7' };
    expect(siteHandoffToken(SECRET, identity, NOW)).toBe(siteHandoffToken(SECRET, identity, NOW));
  });

  it('marks a guest as a guest and gives them no account id', () => {
    // A guest proved the room's login rules, not an account. Borrowing an id here is how a guest
    // silently inherits an owner's authority downstream.
    const { payload } = decode(guestHandoffToken(SECRET, { name: 'Sam', email: 'sam@example.com' }, NOW));
    expect(payload.type).toBe('guest');
    expect(payload.id).toBe('');
  });

  it('changes signature when any byte of the payload changes', () => {
    const a = decode(siteHandoffToken(SECRET, { name: 'Ada', email: 'ada@example.com', id: '7' }, NOW));
    const b = decode(siteHandoffToken(SECRET, { name: 'Ada', email: 'ada@example.com', id: '8' }, NOW));
    expect(a.signature).not.toBe(b.signature);
  });

  it('changes signature when the secret changes', () => {
    const identity = { name: 'Ada', email: 'ada@example.com', id: '7' };
    const one = decode(siteHandoffToken(SECRET, identity, NOW));
    const two = decode(siteHandoffToken(`${SECRET}-other`, identity, NOW));
    // Same header, different secrets: if the signature matched, the secret would not be a secret.
    expect(one.header).toEqual(two.header);
    expect(one.signature).not.toBe(two.signature);
  });
});

describe('handoffUrl', () => {
  it('builds the reference URL shape', () => {
    const url = handoffUrl('https://room.example.com', '3627', 'a.b.c');
    expect(url?.pathname).toBe('/session');
    expect(url?.searchParams.get('id')).toBe('3627');
    expect(url?.searchParams.get('jwtSite')).toBe('a.b.c');
  });

  it('returns null for a blank base so the same-origin fallback survives', () => {
    expect(handoffUrl(undefined, '3627', 't')).toBeNull();
    expect(handoffUrl('', '3627', 't')).toBeNull();
    expect(handoffUrl('   ', '3627', 't')).toBeNull();
  });
});

describe('the config-read credential', () => {
  it('round-trips', () => {
    expect(verifyConfigReadToken(SECRET, '3627', configReadToken(SECRET, '3627', NOW), NOW)).toEqual({ ok: true });
  });

  it('is bound to the room code it was minted for', () => {
    // Otherwise one room's reader can read every room in the account.
    const token = configReadToken(SECRET, '3627', NOW);
    expect(verifyConfigReadToken(SECRET, '9999', token, NOW)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('is bound to the secret', () => {
    const token = configReadToken(`${SECRET}-other`, '3627', NOW);
    expect(verifyConfigReadToken(SECRET, '3627', token, NOW)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('expires, in both directions', () => {
    const token = configReadToken(SECRET, '3627', NOW);
    expect(verifyConfigReadToken(SECRET, '3627', token, NOW + CONFIG_READ_TTL_SECONDS)).toEqual({ ok: true });
    expect(verifyConfigReadToken(SECRET, '3627', token, NOW + CONFIG_READ_TTL_SECONDS + 1)).toEqual({
      ok: false,
      reason: 'stale'
    });
    // A token from the future is a skewed clock, not extra grace.
    expect(verifyConfigReadToken(SECRET, '3627', token, NOW - CONFIG_READ_TTL_SECONDS - 1)).toEqual({
      ok: false,
      reason: 'stale'
    });
  });

  it('rejects a tampered timestamp rather than accepting a re-dated signature', () => {
    const token = configReadToken(SECRET, '3627', NOW);
    const forged = `${NOW + 5_000}.${token.slice(token.indexOf('.') + 1)}`;
    expect(verifyConfigReadToken(SECRET, '3627', forged, NOW + 5_000)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('rejects malformed input without throwing', () => {
    for (const bad of [undefined, null, '', 'nodot', '.', '.sig', 'abc.sig', `${NOW}.`]) {
      expect(verifyConfigReadToken(SECRET, '3627', bad, NOW).ok).toBe(false);
    }
  });

  it('is domain-separated from the handoff, so one secret cannot mint the other', () => {
    // The config credential MACs `config-read:<code>.<ts>`; the handoff MACs `<header>.<payload>`.
    const config = configReadToken(SECRET, '3627', NOW);
    const handoff = siteHandoffToken(SECRET, { name: 'Ada', email: 'a@example.com', id: '1' }, NOW);
    expect(verifyConfigReadToken(SECRET, '3627', handoff.split('.').slice(1).join('.'), NOW).ok).toBe(false);
    expect(config.split('.')).toHaveLength(2);
  });
});
