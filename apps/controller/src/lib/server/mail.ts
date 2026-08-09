import { MAIL_FROM, RESEND_API_KEY } from '$app/env/private';

/**
 * Outbound email.
 *
 * There was none. Not "a stub" — none: `docs/OUTSTANDING.md` §1b.4 recorded it as HIGH, the contact
 * form logged "NOT delivered", registration signed people in without proving they owned the
 * address, and there was no password reset because there was nothing to send one with.
 *
 * ## The provider is a decision, not evidence
 *
 * No capture can prove what the reference sends with: `ptr1.json` and `ptr2.json` are browser
 * captures and the reference's sender is server-side Express. So this is not a match — it is our
 * call, and Resend is it: one HTTPS POST with a bearer token, no SDK to keep pinned, small enough
 * to read in one sitting. {@link sendMail} is the seam if that ever changes; nothing above it knows
 * the provider's name.
 *
 * ## Configured, or honestly not
 *
 * `mailConfigured()` is the whole of the "is this real" question, and callers ask it rather than
 * discovering the answer from a thrown error, because the product must behave differently — not
 * merely fail differently:
 *
 *   - configured   → verification is sent AND enforced;
 *   - unconfigured → nothing is sent, verification is NOT enforced.
 *
 * Enforcing verification while unable to send it locks every user out of something that looks like
 * it is working. That is strictly worse than not enforcing, and it is exactly the failure a "just
 * make it required" change would introduce.
 *
 * **As of this commit the deployment is in the unconfigured state**: there is no provider account
 * and no mailbox on a domain with DKIM/SPF. That is not a defect in this file — it is the two
 * things only the owner can do, and until they exist this module correctly sends nothing.
 *
 * ## No silent swallow
 *
 * `sendMail` throws on every unhappy path. A mail failure that returns quietly is how "the reset
 * email never arrived" becomes unreproducible; the caller decides what a failure means.
 */

/** Resend's endpoint. Not configurable: a wrong host is a silent delivery failure. */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * A hung provider must not hold a registration request open. `AbortSignal.timeout` covers the whole
 * exchange — connect and response together — which is what the caller actually cares about.
 */
const TIMEOUT_MS = 8_000;

export class MailNotConfigured extends Error {
  constructor() {
    super('No mail transport is configured: set RESEND_API_KEY and MAIL_FROM.');
    this.name = 'MailNotConfigured';
  }
}

export class MailDeliveryFailed extends Error {
  constructor(message: string) {
    super(`The mail provider refused the message: ${message}`);
    this.name = 'MailDeliveryFailed';
  }
}

/**
 * Whether mail can actually be sent.
 *
 * BOTH values, not either. A key with no from-address produces a provider rejection at send time,
 * which surfaces as a broken registration rather than an unconfigured deployment — the same
 * half-configured trap `recaptcha.ts` refuses at startup.
 */
export function mailConfigured(): boolean {
  return Boolean(RESEND_API_KEY?.trim()) && Boolean(MAIL_FROM?.trim());
}

export interface Mail {
  to: string;
  subject: string;
  /** Plain text only. Nothing this product sends needs markup, and text cannot carry a payload. */
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!mailConfigured()) throw new MailNotConfigured();

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (cause) {
    throw new MailDeliveryFailed(cause instanceof Error ? cause.message : String(cause));
  }

  if (!response.ok) {
    /*
      The provider's body is read for the server log and deliberately kept OUT of the thrown
      message: it echoes the recipient address, and an error page shown to whoever is at the
      keyboard is not a place to reflect one back.
    */
    const detail = await response.text().catch(() => '<unreadable>');
    console.error('[mail] provider rejected the message', { status: response.status, detail });
    throw new MailDeliveryFailed(`status ${response.status}`);
  }
}
