import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { users } from '#lib/server/db/schema.js';
import { issueToken } from '#lib/server/email-verification.js';
import {
  GENERIC_REQUEST_ACK,
  RESET_TTL_MS,
  resetEnabled,
  resetRequestedRecently,
  sendPasswordResetEmail
} from '#lib/server/password-reset.js';
import { RECAPTCHA_FIELD, recaptchaFailureMessage, verifyRecaptcha } from '#lib/server/recaptcha.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/account');
  /*
    The page is told whether mail works, so it can say so BEFORE somebody types an address and
    presses a button that cannot help them. A form that only reveals it is inert after you have used
    it is the "dead control" complaint this codebase already has a rule about.
  */
  return { enabled: resetEnabled() };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();

    /*
      Refused honestly rather than acknowledged silently.

      This is the one branch that must NOT hide behind the generic acknowledgement: it is not about
      whether this particular address has an account — it is true of every address, so it leaks
      nothing — and telling somebody who is locked out that a link is coming, when the deployment
      cannot send one, strands them waiting for mail that will never exist.
    */
    if (!resetEnabled()) {
      return fail(503, {
        email,
        message: 'Password reset is not available on this deployment yet. Get in touch and we will sort it out.'
      });
    }

    if (!email) return fail(400, { email, message: 'Enter the email address on your account.' });

    /*
      Before the lookup, deliberately — same ordering as registration.

      An unverified submission must not be able to probe which addresses exist, and it must not be
      able to make the server do database work. No-ops when reCAPTCHA is unconfigured; the runtime
      refuses to start on a half-configured pair, so this cannot be silently skipped in production.
    */
    const captcha = await verifyRecaptcha(String(form.get(RECAPTCHA_FIELD) ?? ''), getClientAddress());
    if (!captcha.ok) return fail(400, { email, message: recaptchaFailureMessage() });

    const [user] = await getDb()
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    /*
      Everything from here is invisible to whoever pressed the button.

      No account, inside the cooldown, or the provider refused the message: all three fall through
      to the same acknowledgement below. The first two are silent BY DESIGN — see
      `GENERIC_REQUEST_ACK`.

      The third deserves its own justification, because swallowing a delivery failure normally
      violates this codebase's own rule against it. It is swallowed *for the reader* and reported
      loudly to the log, because the alternative reintroduces the oracle by the back door: an error
      shown here can only ever appear for an address that HAS an account, since no other address
      reaches a send. During a provider outage that turns this form back into exactly the
      enumeration tool the generic message exists to prevent. The person's recovery path is to try
      again; the operator's is the log line, which carries the address and the cause.
    */
    if (user) {
      if (!(await resetRequestedRecently(user.id))) {
        try {
          const token = await issueToken({
            userId: user.id,
            email: user.email,
            purpose: 'reset-password',
            ttlMs: RESET_TTL_MS
          });
          await sendPasswordResetEmail({
            email: user.email,
            displayName: user.displayName,
            token,
            origin: url.origin
          });
        } catch (cause) {
          console.error('[password-reset] the link was not delivered', { email: user.email, cause });
        }
      }
    }

    return { sent: true, message: GENERIC_REQUEST_ACK };
  }
};
