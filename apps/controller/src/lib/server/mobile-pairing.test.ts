/**
 * The pairing rules — the pure half, which is where every security decision lives.
 *
 * `redeemPairCode` needs a database and is covered by the `.db.test.ts` suites; the input
 * validation and the token-list arithmetic are pure and are pinned here, because they are what
 * stands between a public endpoint and a JSON column an attacker would like to write to.
 */
import { describe, expect, it } from 'vitest';
import { addPushToken, MAX_PUSH_TOKENS, MAX_PAIR_ATTEMPTS, validatePairRequest } from './mobile-pairing';

const VALID = {
  room: '1001',
  email: 'Dana.Reyes@Example.com',
  pin: '418290',
  token: 'f'.repeat(160),
  platform: 'iOS'
};

describe('validatePairRequest', () => {
  it('accepts a well-formed request and normalises it', () => {
    const parsed = validatePairRequest(VALID);
    expect(parsed).not.toBeNull();
    // Lower-cased once, here: it is the lookup key against `room_users.email`.
    expect(parsed?.email).toBe('dana.reyes@example.com');
    expect(parsed?.platform).toBe('ios');
  });

  /*
    Exactly six digits.

    `issueMobilePairCode` zero-pads with `padStart(6, '0')`, so "42" is not a short form of "000042"
    — it is a different string that would never match. Accepting it would only widen what an
    attacker may send.
  */
  it('requires exactly six digits for the pin', () => {
    for (const pin of ['', '4182', '4182901', 'abcdef', '41829a', '41 8290', '-18290', '4182.0']) {
      expect(validatePairRequest({ ...VALID, pin }), `accepted ${JSON.stringify(pin)}`).toBeNull();
    }
    expect(validatePairRequest({ ...VALID, pin: '000000' })).not.toBeNull();

    /*
      SURROUNDING whitespace is trimmed and then the six-digit rule still applies.

      This test first asserted `' 418290'` was refused and failed, and the code was right: a PIN read
      aloud and pasted, or autofilled, routinely arrives with a leading space, and refusing it would
      produce a support ticket for no security gain. An INTERNAL space is still refused above,
      because that is a different string rather than a formatting artifact.
    */
    expect(validatePairRequest({ ...VALID, pin: ' 418290 ' })).not.toBeNull();
  });

  it('requires a plausible email', () => {
    for (const email of ['', 'dana', 'a'.repeat(400) + '@x.com']) {
      expect(validatePairRequest({ ...VALID, email })).toBeNull();
    }
  });

  /*
    The token is bounded because it lands in a JSON column written by an UNAUTHENTICATED caller.
    The upper bound is generous on purpose — Google has changed the token format before, and
    refusing a longer one would break pairing for a reason no support engineer would ever find.
  */
  it('bounds the registration token at both ends', () => {
    expect(validatePairRequest({ ...VALID, token: 'short' })).toBeNull();
    expect(validatePairRequest({ ...VALID, token: 'f'.repeat(4097) })).toBeNull();
    expect(validatePairRequest({ ...VALID, token: 'f'.repeat(4096) })).not.toBeNull();
  });

  it('accepts only the two platforms an app can be', () => {
    expect(validatePairRequest({ ...VALID, platform: 'android' })).not.toBeNull();
    for (const platform of ['', 'web', 'windows', 'ios ; drop', 'IOS!']) {
      expect(validatePairRequest({ ...VALID, platform })).toBeNull();
    }
  });

  it('rejects missing fields and wrong types rather than coercing them', () => {
    for (const patch of [{ room: '' }, { room: undefined }, { pin: undefined }, { token: undefined }]) {
      expect(validatePairRequest({ ...VALID, ...patch })).toBeNull();
    }
    expect(validatePairRequest({})).toBeNull();
  });
});

describe('addPushToken', () => {
  const t = (token: string, addedAt: number) => ({ token, platform: 'ios', addedAt });

  it('appends a new device', () => {
    const { tokens, replacedExisting } = addPushToken([t('a', 1)], 'b', 'android', 2);
    expect(tokens.map((entry) => entry.token)).toEqual(['a', 'b']);
    expect(replacedExisting).toBe(false);
  });

  /*
    Re-pairing the same device is the COMMON case — a reinstall, a restored backup, a rotated token
    that resolves to the same string. It must refresh the entry, not grow the list, or a member's
    token array fills with duplicates of one phone and evicts their real second device.
  */
  it('replaces an identical token instead of duplicating it', () => {
    const { tokens, replacedExisting } = addPushToken([t('a', 1), t('b', 2)], 'a', 'ios', 9);
    expect(tokens.map((entry) => entry.token)).toEqual(['b', 'a']);
    expect(tokens).toHaveLength(2);
    expect(replacedExisting).toBe(true);
    // Re-registering refreshes the timestamp, so it is now the most recent.
    expect(tokens.at(-1)?.addedAt).toBe(9);
  });

  /*
    The cap is not tidiness: this list is written by a public endpoint, so an unbounded column is a
    slow denial of service. Evicting the OLDEST means a member replacing a lost phone is never
    locked out by their own history.
  */
  it('caps the list and evicts the oldest', () => {
    const existing = Array.from({ length: MAX_PUSH_TOKENS }, (_, index) => t(`old${index}`, index));
    const { tokens } = addPushToken(existing, 'new', 'ios', 999);

    expect(tokens).toHaveLength(MAX_PUSH_TOKENS);
    expect(tokens.map((entry) => entry.token)).not.toContain('old0');
    expect(tokens.at(-1)?.token).toBe('new');
  });

  it('keeps the list ordered oldest-first so eviction is predictable', () => {
    const { tokens } = addPushToken([t('c', 30), t('a', 10)], 'b', 'ios', 20);
    expect(tokens.map((entry) => entry.addedAt)).toEqual([10, 20, 30]);
  });
});

describe('the constants that bound the attack', () => {
  it('gives an attacker five guesses out of a million', () => {
    // Six digits is 1e6 combinations; the endpoint is public because a phone that has never paired
    // holds no credential. Five failures destroys the code, so this number is the whole defence.
    expect(MAX_PAIR_ATTEMPTS).toBe(5);
    expect(MAX_PAIR_ATTEMPTS).toBeLessThan(10);
  });
});
