import { PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';
import { RECAPTCHA_SECRET_KEY } from '$app/env/private';

/**
 * Server-side verification of a reCAPTCHA v2 response token.
 *
 * ## Why this exists
 *
 * It did not, and that was the whole problem. `Recaptcha.svelte` rendered the widget and nothing
 * ever checked the token: `siteverify` appeared nowhere in this repository and the environment
 * contract had only the PUBLIC site key. A site key on its own produces a checkbox a user ticks and
 * a server that never asks Google whether the tick was real — which is not weak bot protection, it
 * is none, wearing the costume of some. `Recaptcha.svelte`'s own comment already said a widget that
 * verifies nothing is worse than no widget, and then the verifying half was never written.
 *
 * ## The three configuration states, and why the middle one is an error
 *
 *   neither key   disabled. The form renders an explicit "not configured" panel and the server
 *                 does not pretend to check anything. Correct for local development.
 *   both keys     enabled. The widget renders and every submission is verified against Google,
 *                 failing CLOSED — a network error, a timeout, or a malformed reply rejects the
 *                 submission rather than waving it through.
 *   exactly one   a hard startup error. This is the dangerous state and the reason
 *                 {@link assertRecaptchaConfiguration} exists: a site key without a secret renders
 *                 a real-looking widget that is never verified, and a secret without a site key
 *                 leaves a form with no widget while the server demands a token nobody can supply.
 *                 Both are silent in production and obvious at boot.
 */

/** Google's verification endpoint (`https://developers.google.com/recaptcha/docs/verify`). */
const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

/**
 * Google is a third party on the critical path of signing in. Without a bound, an unreachable or
 * slow endpoint turns every login into a hung request rather than a fast, honest rejection.
 */
const VERIFY_TIMEOUT_MS = 5_000;

/** The field name the widget writes into the form (`g-recaptcha-response`). */
export const RECAPTCHA_FIELD = 'g-recaptcha-response';

export class RecaptchaConfigError extends Error {}

/**
 * True when both halves are present, which is the only state in which verification runs.
 *
 * Read at call time rather than module scope so a test can exercise both branches without
 * re-importing the module.
 */
export function recaptchaEnabled(): boolean {
  return Boolean(PUBLIC_RECAPTCHA_SITE_KEY?.trim()) && Boolean(RECAPTCHA_SECRET_KEY?.trim());
}

/**
 * Refuses to start on a half-configured pair.
 *
 * Called from `control-plane-runtime`, beside the DATABASE_URL assertion, because both answer the
 * same question: is this deployment configured to do what its UI claims it does.
 */
export function assertRecaptchaConfiguration(siteKey: string | undefined, secretKey: string | undefined): void {
  const hasSite = Boolean(siteKey?.trim());
  const hasSecret = Boolean(secretKey?.trim());
  if (hasSite === hasSecret) return;

  throw new RecaptchaConfigError(
    hasSite
      ? 'PUBLIC_RECAPTCHA_SITE_KEY is set without RECAPTCHA_SECRET_KEY: the widget would render and never be verified.'
      : 'RECAPTCHA_SECRET_KEY is set without PUBLIC_RECAPTCHA_SITE_KEY: the server would demand a token no form can produce.'
  );
}

export type RecaptchaResult =
  { ok: true; skipped: boolean } | { ok: false; reason: 'missing-token' | 'rejected' | 'unreachable' };

/**
 * Verifies one submission.
 *
 * `remoteIp` is optional in Google's API and passed when known; it narrows a token to the address
 * that solved it.
 *
 * Fails closed on every unhappy path. A `fetch` that throws, a non-200, a body that is not JSON, or
 * `success: false` all return a rejection — never a pass. The alternative, treating "we could not
 * ask" as "it must be fine", turns an outage at Google into an open door here.
 */
export async function verifyRecaptcha(
  token: string | null | undefined,
  remoteIp?: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<RecaptchaResult> {
  if (!recaptchaEnabled()) return { ok: true, skipped: true };

  const response = token?.trim();
  if (!response) return { ok: false, reason: 'missing-token' };

  const body = new URLSearchParams({ secret: RECAPTCHA_SECRET_KEY ?? '', response });
  if (remoteIp) body.set('remoteip', remoteIp);

  try {
    const reply = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS)
    });
    if (!reply.ok) return { ok: false, reason: 'unreachable' };

    const parsed: unknown = await reply.json();
    const success = parsed && typeof parsed === 'object' && 'success' in parsed && parsed.success === true;
    return success ? { ok: true, skipped: false } : { ok: false, reason: 'rejected' };
  } catch {
    // Deliberately not logging the body: Google's reply echoes nothing secret, but the token is a
    // one-time credential and there is no reason for it to reach a log line.
    return { ok: false, reason: 'unreachable' };
  }
}

/** One message for every failure, so a caller cannot leak which half went wrong. */
export function recaptchaFailureMessage(): string {
  return 'Please complete the "I am not a robot" check and try again.';
}
