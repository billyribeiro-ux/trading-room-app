import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decryptApiKeySecret, encryptApiKeySecret } from './server/api-key-secret';

/**
 * A key that cannot be decrypted must not take down the account page.
 *
 * The loader called `decryptApiKeySecret` inline and did not catch it. That function throws on a
 * malformed or unauthenticated envelope, so ONE bad row turned every request for `/account` into a
 * 500 — the owner saw `An unexpected error occurred.` and could not open their account at all.
 *
 * This is not a hypothetical row. It happened: the deployment moved to a new Vercel project, the
 * original `API_KEY_ENCRYPTION_KEY` could not be recovered from the old one, and a freshly
 * generated key cannot read an envelope written under the previous one. The ciphertext is intact
 * and still safe; it is simply unreadable, and no retry changes that.
 *
 * These cases pin the two halves of the fix: that the crypto really does refuse a wrong key (so the
 * loader's `try` is guarding something real, not decoration), and that a wrong key is
 * distinguishable from an absent one — because the page tells the operator to ROTATE, and that
 * advice is only correct for one of the two.
 */

const MASTER = 'a'.repeat(32);
const OTHER = 'b'.repeat(32);
const CONTEXT = { accountId: 1, keyId: '7' };

describe('an API key encrypted under a different master key', () => {
  it('round-trips under the key that wrote it', () => {
    const envelope = encryptApiKeySecret('sk_live_example', CONTEXT, MASTER);
    expect(decryptApiKeySecret(envelope, CONTEXT, MASTER)).toBe('sk_live_example');
  });

  it('THROWS under a different key — which is what took the page down', () => {
    const envelope = encryptApiKeySecret('sk_live_example', CONTEXT, MASTER);
    expect(() => decryptApiKeySecret(envelope, CONTEXT, OTHER)).toThrow();
  });

  it('throws for a different account or key id, not just a different master', () => {
    // the envelope is bound to its context, so a row cannot be replayed onto another account
    const envelope = encryptApiKeySecret('sk_live_example', CONTEXT, MASTER);
    expect(() => decryptApiKeySecret(envelope, { accountId: 2, keyId: '7' }, MASTER)).toThrow();
    expect(() => decryptApiKeySecret(envelope, { accountId: 1, keyId: '8' }, MASTER)).toThrow();
  });

  it('throws on a malformed envelope rather than returning something', () => {
    // the failure mode that must never become "return null and carry on" inside the crypto itself
    expect(() => decryptApiKeySecret('not-an-envelope', CONTEXT, MASTER)).toThrow();
  });

  it('the loader catches it instead of letting it escape', () => {
    // asserted on the source, because the throw only escapes in a real request and the whole
    // point is that the page must never see it again
    const loader = readFileSync(new URL('../routes/(app)/account/+page.server.ts', import.meta.url), 'utf8');
    expect(loader).toContain('function readApiKeySecret');
    expect(loader).toMatch(/try\s*\{[\s\S]*decryptApiKeySecret[\s\S]*\}\s*catch/);
    // and it must not still be called bare in the row mapping
    expect(loader).not.toMatch(/secret:\s*k\.secretCiphertext\s*\n?\s*\?\s*decryptApiKeySecret/);
  });
})
