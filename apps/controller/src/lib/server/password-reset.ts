import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { emailVerificationTokens } from './db/schema';
import { mailConfigured, sendMail } from './mail';
import { brandedHtml, brandedText } from './mail-template';

/**
 * Getting back in after losing a password.
 *
 * ## Why this file exists at all
 *
 * `TODO.md` item A: **HIGH — blocks real customers.** "Forgot your password?" on the login page
 * pointed at `/contact`, and the contact action explicitly does not deliver, so the only route back
 * into a locked-out account was somebody editing the database by hand.
 *
 * ## Nothing here is matched, and it cannot be
 *
 * The reference's login page has a "forgot password" link, and that is the entire extent of the
 * evidence — the flow behind it is server-side Express and no browser capture reaches it. The
 * captures prove a link exists; they prove nothing about what happens after it. So this is OURS,
 * built on the token design already proven in `email-verification.ts`, and it does not claim to
 * imitate anything unobserved. Recorded here so a later reader does not mistake these decisions for
 * matched behaviour.
 *
 * ## The three properties that make it safe
 *
 * 1. **The token is the credential, and it is single-use, hashed at rest, and short-lived.** Reused
 *    wholesale from verification, including the conditional UPDATE that makes a double click lose
 *    rather than double-redeem.
 * 2. **The request form is not an account oracle.** Its answer is identical whether or not the
 *    address has an account. See {@link GENERIC_REQUEST_ACK}.
 * 3. **Redemption revokes every existing session.** `setPasswordFromReset` in `auth.ts`.
 */

/**
 * One hour, against verification's twenty-four.
 *
 * A verification link proves an address and nothing more; a reset link *changes the password and
 * signs a session in*, which makes it the strongest credential this product ever puts in an inbox.
 * It also does not need to survive a night — somebody resetting a password is at the keyboard now,
 * which is why they just asked. An expired link is a button away from a fresh one; a link that sat
 * readable in a mailbox for a day is not.
 */
export const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * How long a fresh request waits before it will send again.
 *
 * Without this, the form is a mail cannon: anybody who knows an address can post it repeatedly and
 * fill that person's inbox from your sending domain, which costs you both the recipient's patience
 * and your domain's sending reputation. reCAPTCHA raises the cost of automating that; this bounds
 * it even when the captcha is unconfigured, which is the local-development state.
 *
 * Sixty seconds is chosen to be shorter than anybody's tolerance for "it did not arrive, send it
 * again" and long enough that a loop achieves nothing.
 */
export const RESET_COOLDOWN_MS = 60 * 1000;

/**
 * The one answer the request form ever gives.
 *
 * Deliberately identical for an address with an account, an address without one, one inside its
 * cooldown, and one whose message the provider just rejected. Any difference between those — a
 * different sentence, a different status, a visibly different response time — turns this public,
 * unauthenticated form into a way to ask "does this person have an account here", which for a
 * trading product is a list worth money to whoever assembles it.
 *
 * This is the exact opposite of the choice made on the verification page, and both are right: there
 * the reader already holds a token from their own mailbox, so precision helps them and tells an
 * attacker nothing. Here the reader has typed an address that may not be theirs.
 */
export const GENERIC_REQUEST_ACK =
  'If that address has an account, a link to set a new password is on its way. It expires in an hour.';

/** The link that lands in the inbox. Built from the request's own origin, never a hardcoded host. */
export function resetLink(origin: string, token: string): string {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Whether the flow can run on this deployment.
 *
 * Same shape as `verificationEnforced`, and for the same reason: the honest states are "can send"
 * and "cannot". A reset form that accepts an address and cheerfully says a link is coming, on a
 * deployment with no transport, is a dead end dressed as a working product — and it is worse than
 * verification's version of that mistake, because the person using it is already locked out.
 */
export function resetEnabled(): boolean {
  return mailConfigured();
}

/**
 * Whether a live reset link was issued too recently to send another.
 *
 * Reads the newest UNCONSUMED reset token: a consumed one means the person already finished, and a
 * finished reset should not block starting a fresh one.
 *
 * Note what this deliberately is not — a general-purpose rate limiter. It bounds mail to one
 * address, which is the abuse this form enables. Request-rate limiting belongs at the deployment
 * edge, the same caveat `login-attempts.ts` carries, and misrepresenting this as more than it is
 * would be worse than not having it.
 */
export async function resetRequestedRecently(userId: number, now: Date = new Date()): Promise<boolean> {
  const [row] = await getDb()
    .select({ createdAt: emailVerificationTokens.createdAt })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, userId),
        eq(emailVerificationTokens.purpose, 'reset-password'),
        isNull(emailVerificationTokens.consumedAt)
      )
    )
    .orderBy(desc(emailVerificationTokens.createdAt))
    .limit(1);

  if (!row) return false;
  return now.getTime() - row.createdAt.getTime() < RESET_COOLDOWN_MS;
}

/**
 * Sends the reset link.
 *
 * Throws when mail is unconfigured, like every other sender here, so no caller can believe it sent
 * something. Callers check {@link resetEnabled} first.
 */
export async function sendPasswordResetEmail(input: {
  email: string;
  displayName: string;
  token: string;
  origin: string;
}): Promise<void> {
  const content = {
    origin: input.origin,
    greeting: `Hi ${input.displayName},`,
    paragraphs: ['Somebody asked to set a new password on your account. If that was you, use the link below.'],
    action: { label: 'Set a new password', url: resetLink(input.origin, input.token) },
    footnotes: [
      'The link works once and expires in one hour.',
      /*
        This sentence is doing real work and is worded carefully.

        Anybody can put somebody else's address into a public form, so this message will sometimes
        arrive unrequested. It has to say plainly that ignoring it is sufficient — that no change
        has happened yet and none will without this link — or the recipient's reasonable conclusion
        is that their account is already being taken, and the support mail that follows is ours.
      */
      'If you did not ask for this, you can ignore this message — your password has not changed.',
      'Setting a new password also signs you out on every other device.'
    ]
  };

  await sendMail({
    to: input.email,
    subject: 'Set a new password',
    text: brandedText(content),
    html: brandedHtml(content)
  });
}
