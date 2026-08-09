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
