import { fail, redirect } from '@sveltejs/kit';
import { eq, lt } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, loginAttempts, users } from '#lib/server/db/schema.js';
import { createLoginSession, verifyPassword } from '#lib/server/auth.js';
import { profileAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { LOGIN_ATTEMPT_RETENTION_MS, loginIdentity, nextLoginAttempt } from '#lib/server/login-attempts.js';
import { authorityBindingFailure } from '#lib/server/profile-authority-policy.js';
import { readProfileAuthority } from '#lib/server/profile-authority.js';
import { RECAPTCHA_FIELD, recaptchaFailureMessage, verifyRecaptcha } from '#lib/server/recaptcha.js';
import {
  apiRequestContext,
  clearApiCookies,
  login as loginToAuthority,
  logout as logoutFromAuthority
} from '#lib/server/tradingroom-api.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * The reference reveals the captcha at three failures: `failedLoginCount >= 3` in its login markup.
 * The same number gates the server check, so the form and the server agree on when a token exists.
 */
const CAPTCHA_REVEAL_THRESHOLD = 3;

/**
 * The reference reveals its CAPTCHA once `failedLoginCount >= 3`. This durable
 * counter reproduces that UI without putting request/user state in shared SSR
 * module memory. Production abuse prevention still belongs at the deployment
 * edge and is intentionally not misrepresented by this UI counter.
 */
async function recordFailedLogin(email: string) {
  const now = new Date();
  const identityHash = loginIdentity(email);
  const [previous] = await getDb()
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.identityHash, identityHash))
    .limit(1);
  const { failureCount, windowStartedAt } = nextLoginAttempt(previous, now);

  await getDb()
    .insert(loginAttempts)
    .values({ identityHash, failureCount, windowStartedAt, lastFailedAt: now })
    .onConflictDoUpdate({
      target: loginAttempts.identityHash,
      set: { failureCount, windowStartedAt, lastFailedAt: now }
    });

  return failureCount;
}

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) redirect(303, '/account');
  return {};
};

export const actions: Actions = {
  default: async (event) => {
    const { request, cookies, getClientAddress } = event;
    const form = await request.formData();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!email || !password) return fail(400, { email, message: 'Email and password are required.' });

    await getDb()
      .delete(loginAttempts)
      .where(lt(loginAttempts.lastFailedAt, new Date(Date.now() - LOGIN_ATTEMPT_RETENTION_MS)));

    /*
      The captcha is required only once it is actually on screen.

      The reference reveals it at `failedLoginCount >= 3` and not before, so demanding a token on a
      first attempt would reject every legitimate login — there is no widget to produce one. The
      stored count is read here, before this attempt is recorded, because it is the same number the
      previous response used to decide whether to render the widget.

      Deliberately keyed on the stored server-side count rather than anything the form submits. A
      client-supplied "I did not need a captcha" is not a fact, it is a request.
    */
    const [priorAttempt] = await getDb()
      .select({ failureCount: loginAttempts.failureCount })
      .from(loginAttempts)
      .where(eq(loginAttempts.identityHash, loginIdentity(email)))
      .limit(1);
    if ((priorAttempt?.failureCount ?? 0) >= CAPTCHA_REVEAL_THRESHOLD) {
      const captcha = await verifyRecaptcha(String(form.get(RECAPTCHA_FIELD) ?? ''), getClientAddress());
      if (!captcha.ok) {
        return fail(400, {
          email,
          failedLoginCount: priorAttempt?.failureCount ?? 0,
          message: recaptchaFailureMessage()
        });
      }
    }

    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    // Same message either way: distinguishing them tells an attacker which emails exist.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      const count = await recordFailedLogin(email);
      return fail(400, {
        email,
        failedLoginCount: count,
        message: 'Those credentials are not valid.'
      });
    }
    /*
      Suspension is checked AFTER the password, deliberately.

      Checking it first would turn the login form into an account-status oracle: anybody could type
      an email and learn whether that account exists and is suspended, without proving anything. The
      credentials must be right before the reason for refusal becomes specific.

      And it must be specific. `readUser` already refuses a suspended session, so without this the
      password would be accepted, a session created, and the very next request would bounce to
      /login with no explanation — a login loop that looks like a broken product rather than a
      suspended account.
    */
    const [account] = await getDb()
      .select({ status: accounts.status, authorityEnterpriseId: accounts.authorityEnterpriseId })
      .from(accounts)
      .where(eq(accounts.id, user.accountId))
      .limit(1);
    if (!account || account.status !== ACCOUNT_ACTIVE) {
      return fail(403, {
        email,
        message: 'This account has been suspended. Contact support if you believe this is an error.'
      });
    }

    if (profileAuthorityMode === 'rust') {
      if (!user.authorityUserId || !account.authorityEnterpriseId) {
        return fail(503, {
          email,
          message: 'This account has not completed the profile-authority migration. Contact support.'
        });
      }

      const context = apiRequestContext(event);
      const authorityLogin = await loginToAuthority(context, { email, password });
      if (!authorityLogin.ok) {
        clearApiCookies(cookies);
        return fail(503, {
          email,
          message: 'The profile authority could not verify this account. Contact support.'
        });
      }
      if (authorityLogin.data.userId !== user.authorityUserId) {
        const cleanup = await logoutFromAuthority(context);
        if (!cleanup.ok) clearApiCookies(cookies);
        console.error('[profile-authority] authority login returned a different identity', {
          localUserId: user.id
        });
        return fail(503, {
          email,
          message: 'The profile authority could not verify this account. Contact support.'
        });
      }

      const canonical = await readProfileAuthority(context);
      const bindingFailure = canonical.ok
        ? authorityBindingFailure(
            {
              authorityUserId: user.authorityUserId,
              authorityEnterpriseId: account.authorityEnterpriseId
            },
            canonical.data
          )
        : `canonical bootstrap failed with ${canonical.code}`;
      if (!canonical.ok || bindingFailure) {
        const cleanup = await logoutFromAuthority(context);
        if (!cleanup.ok) clearApiCookies(cookies);
        console.error('[profile-authority] refused login binding', {
          localUserId: user.id,
          reason: bindingFailure
        });
        return fail(503, {
          email,
          message: 'The profile authority could not verify this account. Contact support.'
        });
      }
    }

    await getDb().delete(loginAttempts).where(eq(loginAttempts.identityHash, loginIdentity(email)));
    try {
      await createLoginSession(user.id, cookies);
    } catch (cause) {
      if (profileAuthorityMode === 'rust') {
        const context = apiRequestContext(event);
        const cleanup = await logoutFromAuthority(context);
        if (!cleanup.ok) clearApiCookies(cookies);
      }
      throw cause;
    }
    redirect(303, '/account');
  }
};
