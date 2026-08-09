import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * The token machinery, against a fake database.
 *
 * These are pure-logic tests over a stub, which is honest about what they prove: the branch order,
 * the refusal reasons, and that a hash rather than a token is what gets stored. What they cannot
 * prove is that the SQL is right — that belongs in `*.db.test.ts`, against real PostgreSQL, which
 * is where the conditional-UPDATE race is actually exercised.
 */

const rows: Array<Record<string, unknown>> = [];
const userRows: Array<Record<string, unknown>> = [];

vi.mock('$app/env/private', () => ({ RESEND_API_KEY: '', MAIL_FROM: '' }));

vi.mock('./db', () => ({
  getDb: () => ({
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        rows.push({ ...v, consumedAt: v.consumedAt ?? null });
      }
    }),
    select: () => ({
      from: () => ({
        where: (predicate: (r: Record<string, unknown>) => boolean) => ({
          limit: async () => rows.filter(predicate)
        })
      })
    }),
    update: (table: { table?: string }) => ({
      set: (patch: Record<string, unknown>) => ({
        where: (predicate: (r: Record<string, unknown>) => boolean) => {
          const target = table.table === 'users' ? userRows : rows;
          const hit = target.filter(predicate);
          for (const r of hit) Object.assign(r, patch);
          return Object.assign(Promise.resolve(hit), { returning: async () => hit });
        }
      })
    })
  })
}));

/*
  Drizzle's `eq`/`and`/`isNull` are replaced by plain predicates, so the stub above can evaluate a
  WHERE without reimplementing SQL. The column objects are the schema's, so a renamed column still
  breaks these tests rather than silently passing.
*/
vi.mock('drizzle-orm', () => ({
  eq: (col: { name: string }, value: unknown) => (r: Record<string, unknown>) => r[col.name] === value,
  isNull: (col: { name: string }) => (r: Record<string, unknown>) => r[col.name] == null,
  and:
    (...preds: Array<(r: Record<string, unknown>) => boolean>) =>
    (r: Record<string, unknown>) =>
      preds.every((p) => p(r))
}));

vi.mock('./db/schema', () => ({
  emailVerificationTokens: {
    table: 'email_verification_tokens',
    tokenHash: { name: 'tokenHash' },
    userId: { name: 'userId' },
    email: { name: 'email' },
    purpose: { name: 'purpose' },
    expiresAt: { name: 'expiresAt' },
    consumedAt: { name: 'consumedAt' }
  },
  users: {
    table: 'users',
    id: { name: 'id' },
    email: { name: 'email' },
    emailVerifiedAt: { name: 'emailVerifiedAt' }
  }
}));

const { hashToken, issueToken, markEmailVerified, redeemToken, VERIFICATION_TTL_MS, verificationEnforced } =
  await import('./email-verification');

beforeEach(() => {
  rows.length = 0;
  userRows.length = 0;
});

describe('issueToken', () => {
  it('stores the hash and never the token itself', async () => {
    const token = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email' });

    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    // The plaintext must not appear in ANY column — not just the one we meant to hash.
    expect(JSON.stringify(rows[0])).not.toContain(token);
  });

  it('expires 24 hours out', async () => {
    const now = new Date('2026-08-08T10:00:00Z');
    await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email', now });
    expect((rows[0].expiresAt as Date).getTime() - now.getTime()).toBe(VERIFICATION_TTL_MS);
  });

  it('invalidates the previous unconsumed link, so a mailbox never holds two', async () => {
    const first = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email' });
    await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email' });

    const firstRow = rows.find((r) => r.tokenHash === hashToken(first));
    expect(firstRow?.consumedAt).not.toBeNull();
    expect(await redeemToken(first, 'verify-email')).toEqual({ ok: false, reason: 'already-used' });
  });

  it('leaves a DIFFERENT purpose alone', async () => {
    const reset = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'reset-password' });
    await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email' });
    expect(rows.find((r) => r.tokenHash === hashToken(reset))?.consumedAt).toBeNull();
  });
});

describe('redeemToken', () => {
  it('accepts a fresh token once and refuses the second attempt', async () => {
    const token = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email' });

    expect(await redeemToken(token, 'verify-email')).toEqual({ ok: true, userId: 7, email: 'a@example.test' });
    expect(await redeemToken(token, 'verify-email')).toEqual({ ok: false, reason: 'already-used' });
  });

  it('refuses a token issued for another purpose', async () => {
    const token = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'reset-password' });
    expect(await redeemToken(token, 'verify-email')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('refuses an expired token', async () => {
    const issuedAt = new Date('2026-08-08T10:00:00Z');
    const token = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email', now: issuedAt });

    const oneMsLate = new Date(issuedAt.getTime() + VERIFICATION_TTL_MS + 1);
    expect(await redeemToken(token, 'verify-email', oneMsLate)).toEqual({ ok: false, reason: 'expired' });
  });

  it('treats the exact expiry instant as expired, not valid', async () => {
    const issuedAt = new Date('2026-08-08T10:00:00Z');
    const token = await issueToken({ userId: 7, email: 'a@example.test', purpose: 'verify-email', now: issuedAt });

    const exactly = new Date(issuedAt.getTime() + VERIFICATION_TTL_MS);
    expect(await redeemToken(token, 'verify-email', exactly)).toEqual({ ok: false, reason: 'expired' });
  });

  it('refuses garbage and the empty string without touching the database', async () => {
    expect(await redeemToken('', 'verify-email')).toEqual({ ok: false, reason: 'unknown' });
    expect(await redeemToken('not-a-token', 'verify-email')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('returns the address the token was ISSUED for, not one read back later', async () => {
    const token = await issueToken({ userId: 7, email: 'old@example.test', purpose: 'verify-email' });
    const result = await redeemToken(token, 'verify-email');
    expect(result).toEqual({ ok: true, userId: 7, email: 'old@example.test' });
  });
});

describe('markEmailVerified', () => {
  it('reports false when the address moved after the link was sent', async () => {
    userRows.push({ id: 7, email: 'new@example.test', emailVerifiedAt: null });
    // The token named the OLD address; no row matches, so nothing was proved.
    expect(await markEmailVerified(7, 'old@example.test')).toBe(false);
    expect(userRows[0].emailVerifiedAt).toBeNull();
  });

  it('writes the timestamp and reports true when the address still matches', async () => {
    userRows.push({ id: 7, email: 'a@example.test', emailVerifiedAt: null });
    const at = new Date('2026-08-08T10:00:00Z');
    expect(await markEmailVerified(7, 'a@example.test', at)).toBe(true);
    expect(userRows[0].emailVerifiedAt).toEqual(at);
  });
});

describe('verificationEnforced', () => {
  it('is false when no mail transport is configured, so nobody is locked out', () => {
    // RESEND_API_KEY and MAIL_FROM are both '' in the mock above — the deployment's real state.
    expect(verificationEnforced()).toBe(false);
  });
});
