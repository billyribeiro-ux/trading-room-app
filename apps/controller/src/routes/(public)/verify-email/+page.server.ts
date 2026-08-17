import { markEmailVerified, redeemToken, type RedeemFailureReason } from '#lib/server/email-verification.js';
import type { PageServerLoad } from './$types';

/**
 * Declared as a union rather than inferred from the two returns below.
 *
 * Inference widens them into one object with both fields optional, which loses the guarantee the
 * page depends on: inside `{#if data.verified}` there is an email, and in the else branch there is
 * a reason. Without this the template has to handle an `undefined` reason that cannot occur.
 */
type VerifyPage =
  { verified: true; email: string } | { verified: false; reason: RedeemFailureReason | 'address-changed' };

/**
 * The other end of the link in the email.
 *
 * Deliberately PUBLIC and deliberately a GET. Somebody clicking a link from their inbox may be on a
 * different device, in a different browser, or signed out entirely — requiring a session here would
 * strand exactly the people the link exists to help. The token IS the authentication: 256 bits,
 * single-use, expiring, and it proves precisely one thing (this address received this mail), which
 * is the only thing being claimed.
 *
 * A GET that mutates is normally wrong, and it is right here for one reason: a mail client cannot
 * POST. The mutation is idempotent in effect — redeeming twice leaves the same verified user — and
 * the second attempt is reported honestly as already-used rather than dressed up as fresh success.
 */
export const load: PageServerLoad = async ({ url }): Promise<VerifyPage> => {
  const token = url.searchParams.get('token') ?? '';
  const result = await redeemToken(token, 'verify-email');

  if (!result.ok) {
    /*
      The reason reaches the page. This is not the login form: the person is holding a link from
      their own mailbox, and "expired, ask for another" versus "already used, you are done" is the
      difference between a recoverable state and a dead end. Nothing about which reason applies
      tells an attacker anything they could not learn by trying.
    */
    return { verified: false, reason: result.reason };
  }

  /*
    The token was valid and is now spent, but the address it named is no longer on that account —
    somebody changed it in between. Nothing was proved, so nothing is claimed.
  */
  if (!(await markEmailVerified(result.userId, result.email))) {
    return { verified: false, reason: 'address-changed' };
  }

  return { verified: true, email: result.email };
};
