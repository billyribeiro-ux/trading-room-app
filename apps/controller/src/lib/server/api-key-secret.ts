import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENVELOPE_VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

type ApiKeySecretContext = {
  accountId: number;
  keyId: string;
};

function deriveEncryptionKey(masterSecret: string) {
  if (!masterSecret) {
    throw new Error('API_KEY_ENCRYPTION_KEY or ROOM_JWT_SECRET must be configured.');
  }

  return createHash('sha256')
    .update('proroom-control:api-key-secret:v1\0', 'utf8')
    .update(masterSecret, 'utf8')
    .digest();
}

function associatedData({ accountId, keyId }: ApiKeySecretContext) {
  return Buffer.from(`account:${accountId}\0api-key:${keyId}`, 'utf8');
}

/**
 * Encrypts a customer API credential for recoverable, owner-visible display.
 * The account and key identifiers are authenticated as AAD, so ciphertext
 * cannot be copied to another row or tenant and still decrypt successfully.
 */
export function encryptApiKeySecret(secret: string, context: ApiKeySecretContext, masterSecret: string) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', deriveEncryptionKey(masterSecret), iv);
  cipher.setAAD(associatedData(context));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [ENVELOPE_VERSION, iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join(
    '.'
  );
}

export function decryptApiKeySecret(envelope: string, context: ApiKeySecretContext, masterSecret: string) {
  const parts = envelope.split('.');
  if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION) {
    throw new Error('Unsupported API-key secret envelope.');
  }

  const iv = Buffer.from(parts[1], 'base64url');
  const ciphertext = Buffer.from(parts[2], 'base64url');
  const tag = Buffer.from(parts[3], 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw new Error('Malformed API-key secret envelope.');
  }

  const decipher = createDecipheriv('aes-256-gcm', deriveEncryptionKey(masterSecret), iv);
  decipher.setAAD(associatedData(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
