import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// scrypt ships with Node, so this adds no dependency. The async form is used deliberately: the
// synchronous one blocks the event loop for the whole derivation, which is exactly the cost this
// function is supposed to have.
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = 'scrypt';

/** Produces `scrypt$<salt-hex>$<key-hex>`, safe to store verbatim in a TEXT column. */
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * Constant-time comparison against a stored hash. Returns false rather than throwing for a missing
 * or malformed hash so a user row without a password simply cannot log in.
 */
export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;

  const [prefix, saltHex, keyHex] = stored.split('$');
  if (prefix !== PREFIX || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, 'hex');
  if (expected.length !== KEY_LENGTH) return false;

  const actual = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, expected);
}
