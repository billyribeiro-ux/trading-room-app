import { describe, expect, it } from 'vitest';
import {
  decryptApiKeySecret,
  deriveCanonicalApiKeyId,
  deriveCanonicalApiKeySecret,
  encryptApiKeySecret
} from './api-key-secret';

const masterSecret = 'test-only-master-secret-with-sufficient-entropy';
const context = { accountId: 17, keyId: '0123456789abcdef01234567' };
const secret = 'a'.repeat(64);

describe('API-key secret encryption', () => {
  it('round-trips the complete secret', () => {
    const envelope = encryptApiKeySecret(secret, context, masterSecret);
    expect(decryptApiKeySecret(envelope, context, masterSecret)).toBe(secret);
  });

  it('uses a fresh nonce for every encryption', () => {
    expect(encryptApiKeySecret(secret, context, masterSecret)).not.toBe(
      encryptApiKeySecret(secret, context, masterSecret)
    );
  });

  it('rejects another tenant or key identifier', () => {
    const envelope = encryptApiKeySecret(secret, context, masterSecret);
    expect(() =>
      decryptApiKeySecret(envelope, { ...context, accountId: context.accountId + 1 }, masterSecret)
    ).toThrow();
    expect(() =>
      decryptApiKeySecret(envelope, { ...context, keyId: 'fedcba9876543210fedcba98' }, masterSecret)
    ).toThrow();
  });

  it('rejects tampering and the wrong master secret', () => {
    const envelope = encryptApiKeySecret(secret, context, masterSecret);
    const parts = envelope.split('.');
    const ciphertext = Buffer.from(parts[2], 'base64url');
    ciphertext[0] ^= 1;
    parts[2] = ciphertext.toString('base64url');

    expect(() => decryptApiKeySecret(parts.join('.'), context, masterSecret)).toThrow();
    expect(() => decryptApiKeySecret(envelope, context, `${masterSecret}-wrong`)).toThrow();
  });

  it('refuses to operate without configured key material', () => {
    expect(() => encryptApiKeySecret(secret, context, '')).toThrow(
      'API_KEY_ENCRYPTION_KEY or ROOM_JWT_SECRET must be configured.'
    );
  });

  it('derives stable domain-separated credentials for uncertain canonical retries', () => {
    const requestId = '00000000-0000-4000-8000-000000000001';
    const keyId = deriveCanonicalApiKeyId(requestId, masterSecret);
    const derived = deriveCanonicalApiKeySecret({ keyId, revision: 0 }, masterSecret);
    expect(keyId).toMatch(/^[0-9a-f]{24}$/u);
    expect(derived).toMatch(/^[0-9a-f]{64}$/u);
    expect(deriveCanonicalApiKeyId(requestId, masterSecret)).toBe(keyId);
    expect(deriveCanonicalApiKeySecret({ keyId, revision: 0 }, masterSecret)).toBe(derived);
    expect(deriveCanonicalApiKeyId('00000000-0000-4000-8000-000000000002', masterSecret)).not.toBe(keyId);
    expect(deriveCanonicalApiKeySecret({ keyId: `f${keyId.slice(1)}`, revision: 0 }, masterSecret)).not.toBe(derived);
    expect(deriveCanonicalApiKeySecret({ keyId, revision: 1 }, masterSecret)).not.toBe(derived);
  });

  it('refuses canonical derivation without the dedicated key', () => {
    expect(() => deriveCanonicalApiKeyId('00000000-0000-4000-8000-000000000001', '')).toThrow(
      'API_KEY_ENCRYPTION_KEY must be configured for canonical API-key authority.'
    );
  });
});
