import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * The reset-specific policy, against a fake database.
 *
 * Same honesty as `email-verification.test.ts`: these are pure-logic tests over a stub, so they
 * prove the branch order, the constants and the message copy — not the SQL. The token machinery
 * these build on is already covered there.
 */

const rows: Array<Record<string, unknown>> = [];

const mailSent: Array<Record<string, unknown>> = [];
let configured = true;

vi.mock('./mail', () => ({
  mailConfigured: () => configured,
  sendMail: async (m: Record<string, unknown>) => {
    if (!configured) throw new Error('MailNotConfigured');
    mailSent.push(m);
  }
}));

vi.mock('./db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: (predicate: (r: Record<string, unknown>) => boolean) => ({
          /*
            `orderBy` is applied by the stub rather than ignored, because the whole point of
            `resetRequestedRecently` is that it reads the NEWEST row. A stub that returned insertion
            order would pass a broken implementation.
          */
          orderBy: (compare: (a: Record<string, unknown>, b: Record<string, unknown>) => number) => ({
            limit: async (n: number) => rows.filter(predicate).sort(compare).slice(0, n)
          })
        })
      })
    })
  })
}));

vi.mock('drizzle-orm', () => ({
  eq: (col: { name: string }, value: unknown) => (r: Record<string, unknown>) => r[col.name] === value,
  isNull: (col: { name: string }) => (r: Record<string, unknown>) => r[col.name] == null,
  and:
    (...preds: Array<(r: Record<string, unknown>) => boolean>) =>
    (r: Record<string, unknown>) =>
      preds.every((p) => p(r)),
  // Newest first, which is what `.orderBy(desc(createdAt))` means.
  desc: (col: { name: string }) => (a: Record<string, unknown>, b: Record<string, unknown>) =>
    (b[col.name] as Date).getTime() - (a[col.name] as Date).getTime()
}));

vi.mock('./db/schema', () => ({
  emailVerificationTokens: {
    table: 'email_verification_tokens',
    userId: { name: 'userId' },
    purpose: { name: 'purpose' },
    consumedAt: { name: 'consumedAt' },
    createdAt: { name: 'createdAt' }
  }
}));

const {
  GENERIC_REQUEST_ACK,
  RESET_COOLDOWN_MS,
  RESET_TTL_MS,
  resetEnabled,
  resetLink,
  resetRequestedRecently,
  sendPasswordResetEmail
} = await import('./password-reset');

const { VERIFICATION_TTL_MS } = await import('./email-verification');

beforeEach(() => {
  rows.length = 0;
  mailSent.length = 0;
  configured = true;
});

describe('RESET_TTL_MS', () => {
  it('is much shorter than a verification link, because it is a much stronger credential', () => {
    // Redeeming a reset link changes the password AND signs a session in. Redeeming a verification
    // link proves an address. They must not share a lifetime.
    expect(RESET_TTL_MS).toBeLessThan(VERIFICATION_TTL_MS);
    expect(RESET_TTL_MS).toBe(60 * 60 * 1000);
  });
});

describe('resetRequestedRecently', () => {
  const at = (iso: string) => new Date(iso);

  it('is false when nothing was ever requested', async () => {
    expect(await resetRequestedRecently(7)).toBe(false);
  });

  it('is true inside the cooldown, so the form cannot be used as a mail cannon', async () => {
    const issued = at('2026-08-09T10:00:00Z');
    rows.push({ userId: 7, purpose: 'reset-password', consumedAt: null, createdAt: issued });

    const oneMsInside = new Date(issued.getTime() + RESET_COOLDOWN_MS - 1);
    expect(await resetRequestedRecently(7, oneMsInside)).toBe(true);
  });

  it('is false at exactly the cooldown boundary, so the wait is not open-ended', async () => {
    const issued = at('2026-08-09T10:00:00Z');
    rows.push({ userId: 7, purpose: 'reset-password', consumedAt: null, createdAt: issued });

    const exactly = new Date(issued.getTime() + RESET_COOLDOWN_MS);
    expect(await resetRequestedRecently(7, exactly)).toBe(false);
  });

  it('ignores a CONSUMED token, so finishing a reset does not block starting another', async () => {
    const issued = at('2026-08-09T10:00:00Z');
    rows.push({
      userId: 7,
      purpose: 'reset-password',
      consumedAt: new Date(issued.getTime() + 1000),
      createdAt: issued
    });

    expect(await resetRequestedRecently(7, new Date(issued.getTime() + 5000))).toBe(false);
  });

  it('reads the NEWEST unconsumed token, not the first one it finds', async () => {
    const old = at('2026-08-09T09:00:00Z');
    const fresh = at('2026-08-09T10:00:00Z');
    /*
      OLDEST FIRST, and the order is the entire test.

      Inserted newest-first this case passes without any ordering at all — the stub's `slice(0, 1)`
      returns the right row by luck. Verified by mutation: with the rows this way round, deleting
      the `orderBy(desc(...))` from the implementation turns this red; with them the other way it
      stayed green and proved nothing.
    */
    rows.push({ userId: 7, purpose: 'reset-password', consumedAt: null, createdAt: old });
    rows.push({ userId: 7, purpose: 'reset-password', consumedAt: null, createdAt: fresh });

    // Reading the OLD row would put this an hour outside the cooldown and answer false.
    expect(await resetRequestedRecently(7, new Date(fresh.getTime() + 1000))).toBe(true);
  });

  it("does not see another user's request", async () => {
    const issued = at('2026-08-09T10:00:00Z');
    rows.push({ userId: 8, purpose: 'reset-password', consumedAt: null, createdAt: issued });
    expect(await resetRequestedRecently(7, new Date(issued.getTime() + 1))).toBe(false);
  });

  it('does not see a VERIFICATION token, which is a different purpose entirely', async () => {
    const issued = at('2026-08-09T10:00:00Z');
    rows.push({ userId: 7, purpose: 'verify-email', consumedAt: null, createdAt: issued });
    expect(await resetRequestedRecently(7, new Date(issued.getTime() + 1))).toBe(false);
  });
});

describe('resetEnabled', () => {
  it('follows the mail transport, so nobody is promised a link that cannot be sent', () => {
    configured = false;
    expect(resetEnabled()).toBe(false);
    configured = true;
    expect(resetEnabled()).toBe(true);
  });
});

describe('resetLink', () => {
  it('points at the redemption page and carries the token in the query', () => {
    expect(resetLink('https://www.tradingroom.app', 'abc123')).toBe(
      'https://www.tradingroom.app/reset-password?token=abc123'
    );
  });

  it('encodes a token that would otherwise break the query string', () => {
    // base64url does not produce these, but the encoding is what guarantees that.
    expect(resetLink('https://x.test', 'a+b/c=d&e')).toBe('https://x.test/reset-password?token=a%2Bb%2Fc%3Dd%26e');
  });
});

describe('sendPasswordResetEmail', () => {
  const send = () =>
    sendPasswordResetEmail({
      email: 'ada@example.test',
      displayName: 'Ada',
      token: 'tok',
      origin: 'https://www.tradingroom.app'
    });

  it('puts the link in the PLAIN TEXT part, not only in the button', async () => {
    await send();
    // Many clients block remote images and some render text only; a reset that is unusable there is
    // unusable for exactly the people least able to work around it.
    expect(mailSent[0].text).toContain('https://www.tradingroom.app/reset-password?token=tok');
  });

  it('tells an unrequested recipient that nothing has happened yet', async () => {
    await send();
    // This message will sometimes arrive because somebody else typed the address. Without this
    // sentence the reasonable reading is "my account is being taken right now".
    expect(String(mailSent[0].text)).toContain('your password has not changed');
  });

  it('warns that other devices will be signed out, before it happens', async () => {
    await send();
    expect(String(mailSent[0].text)).toContain('signs you out on every other device');
  });

  it('throws rather than silently doing nothing when mail is unconfigured', async () => {
    configured = false;
    await expect(send()).rejects.toThrow();
    expect(mailSent).toHaveLength(0);
  });
});

describe('GENERIC_REQUEST_ACK', () => {
  it('never names the address or says whether an account exists', () => {
    /*
      The acknowledgement is returned identically for an address with an account, one without, one
      inside its cooldown, and one whose message the provider just refused. If it ever grows a
      conditional, this public form becomes a way to ask "does this person have an account here".
    */
    expect(GENERIC_REQUEST_ACK).toContain('If that address has an account');
    expect(GENERIC_REQUEST_ACK).not.toMatch(/\bwe (sent|have sent)\b/i);
  });
});
