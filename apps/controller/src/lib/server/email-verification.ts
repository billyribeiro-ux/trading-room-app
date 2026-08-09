import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { emailVerificationTokens, users } from './db/schema';
import { mailConfigured, sendMail } from './mail';

/**
 * Proving that somebody owns the address they signed up with.
 *
 * ## Single use, hashed, short
 *
 * The token is 32 random bytes, sent once in a link and never stored — the row holds its SHA-256.
 * A verification link lands in an inbox, which is forwarded, synced, and scanned by security
 * appliances that follow links, so it is consumed on first redemption and expires in 24 hours.
 *
 * ## What is OURS and what is matched
 *
 * All of it is ours. The reference sends mail — `room-settings-schema.ts` proves `sendReportEmails`
 * ("you will get an email to the address below for each incident"), `reportEmail`,
 * `sendOpenCloseEmail`, and `roomType`'s "reminder-email tools" — but no browser capture reaches a
 * server-side sender, so there is no evidence of its signup-verification flow, its wording, or
 * whether it has one at all. Nothing here claims to match it. The message copy below is written to
 * be plain and true rather than to imitate something unobserved.
 */

/** 32 bytes. Long enough that guessing is not a strategy, short enough for a clickable URL. */
const TOKEN_BYTES = 32;

/** How long a verification link lives. Long enough to survive a night, short enough to matter. */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export type TokenPurpose = 'verify-email' | 'reset-password';

/** SHA-256, hex. Fast is correct here: the input is 256 bits of entropy, not a human password. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Issues a token, returning the plaintext exactly once.
 *
 * Any unconsumed token for the same user and purpose is consumed first, so asking for a second link
 * invalidates the first. Otherwise "resend" leaves a growing set of live credentials sitting in a
 * mailbox, and the oldest is the one most likely to have leaked.
 */
export async function issueToken(input: {
  userId: number;
  email: string;
  purpose: TokenPurpose;
  now?: Date;
}): Promise<string> {
  const now = input.now ?? new Date();
  const token = randomBytes(TOKEN_BYTES).toString('base64url');

  await getDb()
    .update(emailVerificationTokens)
    .set({ consumedAt: now })
    .where(
      and(
        eq(emailVerificationTokens.userId, input.userId),
        eq(emailVerificationTokens.purpose, input.purpose),
        isNull(emailVerificationTokens.consumedAt)
      )
    );

  await getDb()
    .insert(emailVerificationTokens)
    .values({
      tokenHash: hashToken(token),
      userId: input.userId,
      email: input.email,
      purpose: input.purpose,
      expiresAt: new Date(now.getTime() + VERIFICATION_TTL_MS),
      createdAt: now
    });

  return token;
}

/** Why a token was refused. Named so the page rendering one message per reason cannot drift. */
export type RedeemFailureReason = 'unknown' | 'expired' | 'already-used';

export type RedeemResult = { ok: true; userId: number; email: string } | { ok: false; reason: RedeemFailureReason };

/**
 * Consumes a token, or explains why it will not.
 *
 * The three refusals are distinguished FOR the person holding the link, unlike a login where
 * vagueness protects account existence. They already have this token from their own inbox, and
 * "that link expired, here is a new one" is the difference between a working product and a dead
 * end.
 *
 * The consume is a conditional UPDATE with `consumed_at IS NULL` in its WHERE, so two simultaneous
 * clicks cannot both succeed — the second updates zero rows and is refused. A SELECT-then-UPDATE
 * would be a real race here, because mail clients genuinely do prefetch links in parallel.
 */
export async function redeemToken(token: string, purpose: TokenPurpose, now: Date = new Date()): Promise<RedeemResult> {
  if (!token) return { ok: false, reason: 'unknown' };

  const [row] = await getDb()
    .select()
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, hashToken(token)), eq(emailVerificationTokens.purpose, purpose)))
    .limit(1);

  if (!row) return { ok: false, reason: 'unknown' };
  if (row.consumedAt) return { ok: false, reason: 'already-used' };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };

  const consumed = await getDb()
    .update(emailVerificationTokens)
    .set({ consumedAt: now })
    .where(and(eq(emailVerificationTokens.tokenHash, row.tokenHash), isNull(emailVerificationTokens.consumedAt)))
    .returning({ tokenHash: emailVerificationTokens.tokenHash });

  // Lost the race with a parallel click. Refused rather than reported as success.
  if (consumed.length === 0) return { ok: false, reason: 'already-used' };

  return { ok: true, userId: row.userId, email: row.email };
}

/**
 * Marks the address proved — but only the address the token named.
 *
 * The `email` predicate is the whole point: a link issued for an old address must not verify a new
 * one somebody switched to in the meantime.
 */
export async function markEmailVerified(userId: number, email: string, now: Date = new Date()): Promise<boolean> {
  const changed = await getDb()
    .update(users)
    .set({ emailVerifiedAt: now })
    .where(and(eq(users.id, userId), eq(users.email, email)))
    .returning({ id: users.id });

  /*
    Whether the row was actually written, returned rather than assumed.

    Zero rows means the address moved between issuing the link and clicking it. The token was still
    valid and is now spent, but nothing was proved — and a page that says "confirmed" when no column
    changed is the exact shape of bug that gets discovered months later by somebody wondering why an
    account reads unverified. The caller reports it honestly instead.
  */
  return changed.length > 0;
}

/**
 * Whether verification is ENFORCED on this deployment.
 *
 * Deliberately tied to whether mail can be sent at all. The two honest states are "send and
 * enforce" and "neither"; the third — enforce without being able to send — is a lockout.
 */
export function verificationEnforced(): boolean {
  return mailConfigured();
}

/** The link that lands in the inbox. Built from the request's own origin, never a hardcoded host. */
export function verificationLink(origin: string, token: string): string {
  return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Sends the verification link.
 *
 * Throws when mail is unconfigured, so no caller can believe it sent something. Callers check
 * {@link verificationEnforced} first and simply do not call this on a deployment with no transport.
 */
export async function sendVerificationEmail(input: {
  email: string;
  displayName: string;
  token: string;
  origin: string;
}): Promise<void> {
  await sendMail({
    to: input.email,
    subject: 'Confirm your email address',
    text: [
      `Hi ${input.displayName},`,
      '',
      'Confirm this address to finish setting up your account:',
      '',
      verificationLink(input.origin, input.token),
      '',
      'The link works once and expires in 24 hours.',
      'If you did not create an account, you can ignore this message.'
    ].join('\n')
  });
}
