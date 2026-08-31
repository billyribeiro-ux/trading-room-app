import { describe, expect, it } from 'vitest';
import {
  countEncodedIdentityPayloads,
  countUnsafeRawEmails,
  findUnsafeRawEmails,
  redactEncodedIdentityPayloads
} from './privacy-utils.mjs';

const encode = (value) => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

describe('encoded evidence privacy boundary', () => {
  it('detects identity claims in a complete JWT-shaped value', () => {
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      name: 'Captured Person',
      email: 'captured.person@example.test'
    })}.signature`;

    expect(countEncodedIdentityPayloads(`jwtSite=${token}`)).toBe(1);
  });

  it('detects the truncated one-segment payload shape found in evidence reports', () => {
    const truncated = encode({ displayName: 'Captured Person', email: 'person@example.test' });

    expect(countEncodedIdentityPayloads(`/session?jwtSite=${truncated}…`)).toBe(1);
  });

  it('redacts only the encoded identity value and reports the replacement count', () => {
    const token = `${encode({ alg: 'none' })}.${encode({ preferred_username: 'captured-user' })}.sig`;
    const result = redactEncodedIdentityPayloads(`before ${token} after`);

    expect(result).toEqual({
      redacted: 'before [REDACTED_CAPTURE_JWT] after',
      replacements: 1
    });
  });

  it('does not classify a non-identity origin payload as personal data', () => {
    const originTrialPayload = encode({ origin: 'https://example.test', expiry: 1_800_000_000 });

    expect(countEncodedIdentityPayloads(originTrialPayload)).toBe(0);
    expect(redactEncodedIdentityPayloads(originTrialPayload)).toEqual({
      redacted: originTrialPayload,
      replacements: 0
    });
  });

  it('accepts already tokenized identity claims', () => {
    const tokenized = encode({ name: '[OWNER_NAME]', email: '[OWNER_EMAIL]' });

    expect(countEncodedIdentityPayloads(tokenized)).toBe(0);
  });

  it('rejects raw emails outside reserved test domains without exposing them', () => {
    const unsafe = `private${'@'}gmail.com`;

    expect(countUnsafeRawEmails(`identity=${unsafe}`)).toBe(1);
    expect(findUnsafeRawEmails(`identity=${unsafe}`)).toEqual([unsafe]);
  });

  it('allows reserved and application test domains', () => {
    const content = [
      'user@example.com',
      'user@example.net',
      'user@example.org',
      'user@preview.example',
      'user@protradingroom.test',
      'user@fixture.invalid'
    ].join(' ');

    expect(countUnsafeRawEmails(content)).toBe(0);
  });

  it('does not classify fingerprinted image filenames as email addresses', () => {
    const fingerprinted = `scroll${'@'}2x.9f02b9f3.png`;

    expect(countUnsafeRawEmails(`/images/${fingerprinted}`)).toBe(0);
    expect(countUnsafeRawEmails(`identity=${fingerprinted}`)).toBe(1);
  });
});

describe('a ui-router view name is not an address', () => {
  /*
    CONSTRUCTED, not written out — the same device the owner-name guards use, and for the same
    reason: `verify-privacy-boundary.mjs` scans this file too, so an address-shaped literal here is a
    violation of the rule the file is testing. The first draft wrote one out and the verifier said so.

    It has to be a NON-reserved domain to be worth asserting: a reserved one is exempt by
    `isSafeTestEmail` and would pass whatever the predicate did.
  */
  const realAddress = ['person', '@', 'realdomain', '.', 'com'].join('');
  const viewName = ['container', '@', 'app-fh.mailbox'].join('');
  /*
    Added 2026-08-31 with `isUiRouterViewName`, and these five cases ARE the argument for it.

    Pinning the manage bundle at `evidence-dumps/manage-app-2026-08-31/` put three
    `viewName@stateName` strings into the tracked tree — AngularJS ui-router's way of addressing a
    named view inside a named state. The email regex accepts them because the state segments after
    the last dot are letters-only and long enough to pass for a TLD.

    The tempting fix was to add those segments to `isSafeTestEmail`, which would have exempted every
    address ending in them, everywhere in the repository, forever, to silence three matches in one
    third-party minified file. The predicate keys on the SYNTAX instead, and the two middle cases are
    what prove the difference: the same string outside a `views` map is still reported, and a real
    address outside one is still reported.
  */
  it('exempts the view name only where ui-router can actually mean one', () => {
    expect(countUnsafeRawEmails(`.state("x",{views:{"${viewName}":{t:1}}})`)).toBe(0);
  });

  it('still reports the SAME string when it is not a views key', () => {
    /*
      The control that makes the exemption narrow rather than a domain allow-list. If this ever
      returns 0, the predicate has stopped keying on position and the guard is weaker than it reads.
    */
    expect(countUnsafeRawEmails(`var x = "${viewName}";`)).toBe(1);
  });

  it('still reports a real address that is not in a views map', () => {
    expect(countUnsafeRawEmails(`var e = "${realAddress}";`)).toBe(1);
  });

  it('DOES exempt a real address written as a views key — the stated residual', () => {
    /*
      Asserted rather than hidden, because a known hole that nobody wrote down is the one that
      surprises somebody later. To leak through, an address has to be the first key of a `views`
      object literal in a tracked file. That is not a shape a leak takes, and it is the price of not
      exempting two TLDs repository-wide.

      If this ever needs closing, the fix is to require the state segment to be a state this bundle
      declares — not to delete the predicate.
    */
    expect(countUnsafeRawEmails(`views:{"${realAddress}":{t:1}}`)).toBe(0);
  });

  it('leaves the reserved-domain path alone', () => {
    expect(countUnsafeRawEmails(`email:"${['mail', '@', 'example.com'].join('')}"`)).toBe(0);
  });
});
