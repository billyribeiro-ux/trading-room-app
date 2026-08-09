import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { ACCOUNT_ACTIVE, accounts, users } from '$lib/server/db/schema';
import { MIN_PASSWORD, createLoginSession, setPasswordFromReset } from '$lib/server/auth';
import { inspectToken, redeemToken, type RedeemFailureReason } from '$lib/server/email-verification';
import type { Actions, PageServerLoad } from './$types';

/**
 * Why this is a union rather than an inferred optional — same as `verify-email`: inside
 * `{#if data.valid}` the page needs a token, and in the else branch it needs a message, and
 * inference would make both optional in both branches.
 *
 * The refused branch carries the finished SENTENCE, not the reason code. The page would otherwise
 * need its own copy of the three strings — and a type imported from `$lib/server`, which client
 * code may not touch. One wording, on the server, used by both the load and the action.
 */
type ResetPage = { valid: true; token: string; minPassword: number } | { valid: false; message: string };

/**
 * The GET **inspects and does not consume**.
 *
 * This is the whole difference between this route and `verify-email`. There, clicking the link IS
 * the action, so redeeming on load is correct. Here the link only buys the right to fill in a form,
 * and the form is submitted some seconds later — so consuming on arrival would spend the credential
 * before it had been used for anything, and every reset would fail on submit.
 */
export const load: PageServerLoad = async ({ url }): Promise<ResetPage> => {
  const token = url.searchParams.get('token') ?? '';
  const state = await inspectToken(token, 'reset-password');
  if (!state.ok) return { valid: false, message: REFUSALS[state.reason] };
  return { valid: true, token, minPassword: MIN_PASSWORD };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const token = String(form.get('token') ?? '');
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    /*
      The password is validated BEFORE the token is redeemed, and the order is the point.

      Redeeming first would mean a mistyped confirmation burns the link: the token is single-use, so
      the person is told "the two passwords do not match", presses back, and finds their only way
      into the account already spent. They would then have to request a new link for a typo. Nothing
      here touches the token until the input is known to be acceptable.
    */
    if (!password) return fail(400, { message: 'Enter a new password.' });
    if (password.length < MIN_PASSWORD) return fail(400, { message: `Use at least ${MIN_PASSWORD} characters.` });
    if (password !== confirm) return fail(400, { message: 'The two passwords do not match.' });

    /*
      Now it is spent — atomically, by the conditional UPDATE inside `redeemToken`. Two submissions
      racing cannot both win; the loser is refused as already-used rather than quietly setting the
      password twice.
    */
    const result = await redeemToken(token, 'reset-password');
    if (!result.ok) return fail(400, { reason: result.reason, message: REFUSALS[result.reason] });

    /*
      The token was valid and is now spent, but the address it named is no longer on that account.
      Nothing is claimed and no password is set — the same honest-zero-rows report `markEmailVerified`
      makes, for the same reason.
    */
    if (!(await setPasswordFromReset({ userId: result.userId, email: result.email, password }))) {
      return fail(400, {
        message: 'That link was for an address this account no longer uses. Request a new one from the login page.'
      });
    }

    /*
      Suspension is checked AFTER the token is redeemed, for the same reason the login action checks
      it after the password: the refusal only becomes specific once ownership has been proved.
      Nobody reaches this line without a live link from that account's own mailbox.

      And it must be checked. `readUser` refuses a suspended session, so without this the reset
      would succeed, a session would be minted, and the very next request would bounce to /login
      with nothing said — a loop that reads as a broken product rather than a suspended account.
      The password IS changed regardless; they proved the address, and leaving them a credential
      that works the moment the account is restored is better than a silent no-op.
    */
    const [account] = await getDb()
      .select({ status: accounts.status })
      .from(accounts)
      .innerJoin(users, eq(users.accountId, accounts.id))
      .where(eq(users.id, result.userId))
      .limit(1);
    if (!account || account.status !== ACCOUNT_ACTIVE) {
      return fail(403, {
        message:
          'Your password has been changed, but this account is suspended. Contact support if you believe this is an error.'
      });
    }

    /*
      Signed in, on a session created AFTER every previous one was deleted.

      Not a convenience: `setPasswordFromReset` has just revoked every session on the account,
      including this browser's if it had one. Without a fresh session the person would set a new
      password and immediately land on the login page, which reads as a failed reset. Minting one
      here means the device that performed the reset stays signed in and every other device is out,
      which is the intended outcome of the whole flow.

      This grants nothing they do not already hold — whoever completed this exchange now knows the
      password and could sign in with it.
    */
    await createLoginSession(result.userId, cookies);
    redirect(303, '/account');
  }
};

/**
 * One sentence per refusal, each naming the next action.
 *
 * Precision is safe here for the same reason it is on the verification page: the reader is holding
 * a token that arrived in their own mailbox, so none of this tells an attacker anything trying the
 * link would not. It is the request form, where an address is typed in, that has to stay vague.
 */
const REFUSALS: Record<RedeemFailureReason, string> = {
  unknown: 'That link is not one we issued. Check you copied the whole address from the email.',
  expired: 'That link has expired — they last an hour. Request a new one.',
  'already-used': 'That link has already been used. If the reset worked, sign in; if not, request another.'
};
