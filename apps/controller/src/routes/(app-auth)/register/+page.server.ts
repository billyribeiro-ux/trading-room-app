import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { accounts, users } from '$lib/server/db/schema';
import { createLoginSession, hashPassword } from '$lib/server/auth';
import { RECAPTCHA_FIELD, recaptchaFailureMessage, verifyRecaptcha } from '$lib/server/recaptcha';
import { issueToken, sendVerificationEmail, verificationEnforced } from '$lib/server/email-verification';
import { provisionRoom } from '$lib/server/provision-room';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/account');
  return {};
};

const MIN_PASSWORD = 12;

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress, url }) => {
    const form = await request.formData();
    // The reference's signup asks for a person, not a business: name, email,
    // password. The account is named after them and can be renamed later.
    const company = String(form.get('name') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const values = { company, name, email };

    if (!name || !email || !password) {
      return fail(400, { ...values, message: 'Every field is required.' });
    }
    if (form.get('agreeTOS') !== 'on') {
      return fail(400, { ...values, message: 'You need to agree with the terms.' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(400, { ...values, message: 'That does not look like an email address.' });
    }
    if (password.length < MIN_PASSWORD) {
      return fail(400, { ...values, message: `Use at least ${MIN_PASSWORD} characters.` });
    }
    if (password !== confirm) {
      return fail(400, { ...values, message: 'The two passwords do not match.' });
    }

    /*
      Checked before the database is touched, and before the password is hashed.

      Order matters twice. Hashing is deliberately expensive, so verifying first denies a bot the
      ability to burn server CPU by posting rubbish; and rejecting before the uniqueness lookup
      means an unverified submission cannot be used to probe which emails already exist.

      No-ops when reCAPTCHA is unconfigured, which is the local-development state. A half-configured
      pair cannot reach here — the runtime refuses to start on one.
    */
    const captcha = await verifyRecaptcha(String(form.get(RECAPTCHA_FIELD) ?? ''), getClientAddress());
    if (!captcha.ok) {
      return fail(400, { ...values, message: recaptchaFailureMessage() });
    }
    const [taken] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    if (taken) {
      // Registration cannot hide that an email is taken — the unique constraint is
      // the point. Login stays deliberately vague; this cannot.
      return fail(409, { ...values, message: 'That email already has an account. Try signing in.' });
    }

    const now = new Date();
    /*
      One transaction: an account without its owner is not a state worth persisting, and neither is
      an account whose first room half-exists.
    */
    const userId = await getDb().transaction(async (tx) => {
      const [account] = await tx
        .insert(accounts)
        .values({ name: company, ownerEmail: email, createdAt: now })
        .returning({ id: accounts.id });
      const [user] = await tx
        .insert(users)
        .values({
          accountId: account.id,
          email,
          displayName: name,
          passwordHash: hashPassword(password),
          createdAt: now
        })
        .returning({ id: users.id });

      /*
        A first room, created with the account.

        This reverses an earlier decision here, which read: "an auto-created 'Room 1' would be
        inventing something the reference never showed." That was absence of evidence dressed up as
        evidence, and reading the reference's own account page settles it the other way.

        `ptr2.json` captures `#/page/welcome` — 882 nodes, `truncated: false` — and three things in
        it matter:

          - the Sessions table has NO empty state. Both the Admin Users table and the credentials
            table below it carry a placeholder row, each shown by an ng-show guard that tests its
            own collection for emptiness. Sessions carries no such row and no such guard: the
            reference's UI has no design for an account with zero rooms, because it never expects
            one. (The two guards are quoted verbatim in the PR description rather than here — the
            literal text trips the secret scanner's generic-api-key rule, and a false positive is
            not something to baseline.)
          - "New Room" is hidden behind `ng-show="showNewRoom>=5"`, revealed only by clicking the
            word "Sessions" five times. Nobody discovers that.
          - the page carries no registration form or link at all — only a login form
            (`ng-submit="submitLogin()"`) and "forgot password". The reference has no self-serve
            signup, so its accounts and their rooms are provisioned together, by hand.

        We DO have self-serve signup, so we have to answer a question the reference never faced.
        Landing a new account on an empty table whose only create button takes five undocumented
        clicks reads as a broken product — `docs/OUTSTANDING.md` §1b.5 records that happening to the
        owner on first use, and it happened again today.

        Inside the transaction, so a failure to allocate a room code rolls the account back rather
        than leaving a half-registered login.
      */
      // No name: `provisionRoom` titles it `Room <shortCode>`, which is what the reference calls a
      // room — "Room 3625" in both captures of session 3625.
      await provisionRoom(tx, { accountId: account.id, ownerUserId: user.id, now });

      return user.id;
    });

    /*
      Prove the address, when we are able to.

      `verificationEnforced()` is false on a deployment with no mail transport, and this whole block
      is skipped there — no token is minted for a link that can never be delivered.

      A send failure does NOT fail the request. The account exists by this point; throwing here
      would leave somebody with a working login and an error page telling them registration failed.
      It is logged loudly instead, and `/account` shows the unverified banner with a Resend button,
      which is the recovery path a transient provider outage needs anyway.
    */
    if (verificationEnforced()) {
      try {
        const token = await issueToken({ userId, email, purpose: 'verify-email' });
        await sendVerificationEmail({ email, displayName: name, token, origin: url.origin });
      } catch (cause) {
        console.error('[register] verification email was not delivered', { email, cause });
      }
    }

    await createLoginSession(userId, cookies);
    redirect(303, '/account');
  }
};
