import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { emailVerificationTokens, users } from './db/schema';
import { mailConfigured, sendMail } from './mail';
import { brandedHtml, brandedText } from './mail-template';

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
  /**
   * How long this particular link lives. Defaults to {@link VERIFICATION_TTL_MS}.
   *
   * A parameter rather than a second constant read from the purpose, because the caller is the one
   * that knows what it is sending. A password reset is a stronger credential than a verification —
   * redeeming it changes the password and signs a session in — so it gets a much shorter life
   * ({@link RESET_TTL_MS}), and that decision belongs beside the code that sends it.
   */
  ttlMs?: number;
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
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? VERIFICATION_TTL_MS)),
      createdAt: now
    });

  return token;
}

/** Why a token was refused. Named so the page rendering one message per reason cannot drift. */
export type RedeemFailureReason = 'unknown' | 'expired' | 'already-used';

export type RedeemResult = { ok: true; userId: number; email: string } | { ok: false; reason: RedeemFailureReason };

/**
 * Reads a token's standing WITHOUT spending it.
 *
 * Exists for the password-reset page, where the two halves of the flow are separated by however
 * long somebody takes to type a new password twice:
 *
 *  - the GET needs to know whether to render a form or an explanation, and must NOT consume,
 *    because the token is the only thing authorising the POST that follows;
 *  - the POST consumes, via {@link redeemToken}, which is where the single-use guarantee lives.
 *
 * Verification does not need this — its link is redeemed by the act of clicking, so there is
 * nothing between arriving and spending.
 *
 * Deliberately NOT a "check then redeem" pair used as a substitute for the conditional UPDATE. What
 * this returns is a snapshot that may be stale by the time the POST arrives; `redeemToken` is still
 * the only thing that decides, and it decides atomically.
 */
export async function inspectToken(
  token: string,
  purpose: TokenPurpose,
  now: Date = new Date()
): Promise<{ ok: true; userId: number; email: string } | { ok: false; reason: RedeemFailureReason }> {
  if (!token) return { ok: false, reason: 'unknown' };

  const [row] = await getDb()
    .select()
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, hashToken(token)), eq(emailVerificationTokens.purpose, purpose)))
    .limit(1);

  if (!row) return { ok: false, reason: 'unknown' };
  if (row.consumedAt) return { ok: false, reason: 'already-used' };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, userId: row.userId, email: row.email };
}

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
  /*
    One description of the message, rendered twice.

    `brandedHtml` and `brandedText` take the same input, so the two parts cannot drift apart — a
    text body saying something different from the HTML is both a spam signal and a support problem.
    The text part is not a courtesy: many clients block remote images by default, and a recipient
    who has never received mail from this domain is exactly the one most likely to have them off.
  */
  const content = {
    origin: input.origin,
    greeting: `Hi ${input.displayName},`,
    paragraphs: ['Confirm this address to finish setting up your account.'],
    action: { label: 'Confirm my email', url: verificationLink(input.origin, input.token) },
    footnotes: [
      'The link works once and expires in 24 hours.',
      'If you did not create an account, you can ignore this message.'
    ]
  };

  await sendMail({
    to: input.email,
    subject: 'Confirm your email address',
    text: brandedText(content),
    html: brandedHtml(content)
  });
}
