import { describe, expect, it } from 'vitest';
import { decryptApiKeySecret, encryptApiKeySecret } from './api-key-secret';

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
});
