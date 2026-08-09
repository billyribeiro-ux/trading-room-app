import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import { readFileSync } from 'node:fs';
import Login from '../routes/(public)/login/+page.svelte';
import Forgot from '../routes/(public)/forgot-password/+page.svelte';
import Reset from '../routes/(public)/reset-password/+page.svelte';

/**
 * The recovery path, rendered.
 *
 * `TODO.md` item A recorded this as **HIGH — blocks real customers**: "Forgot your password?"
 * pointed at `/contact`, whose action explicitly stores and sends nothing, so the only route back
 * into a locked-out account was somebody editing the database by hand.
 *
 * These cases pin the three things that would silently undo that: the link going anywhere else, the
 * request form claiming to have sent something on a deployment that cannot send, and the reset page
 * offering a password form for a token that is not valid.
 */

/** Strip comments before asserting — a test that matches its own explanatory prose proves nothing. */
function visible(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

const forgot = (data: unknown, form: unknown = null) =>
  visible(ssr(Forgot as never, { props: { data, form } as never }).body);

const reset = (data: unknown, form: unknown = null) =>
  visible(ssr(Reset as never, { props: { data, form } as never }).body);

describe('the login page routes people somewhere that works', () => {
  it('sends "Forgot your password?" to /forgot-password, not to /contact', () => {
    const body = visible(ssr(Login as never, { props: { form: null } as never }).body);

    expect(body).toMatch(/href="\/forgot-password"[^>]*>\s*Forgot your password\?/);
    /*
      The specific regression. /contact was the destination for months and its action delivers
      nothing, so this link was the whole of account recovery and it went nowhere.
    */
    expect(body).not.toMatch(/href="\/contact"[^>]*>\s*Forgot your password\?/);
  });
});

describe('the request form on a deployment that cannot send mail', () => {
  it('says so instead of offering a form', () => {
    const body = forgot({ enabled: false });

    expect(body).toContain('not available on this deployment');
    // No input to type an address into: the point is that it never accepts one.
    expect(body).not.toMatch(/<input[^>]+name="email"/);
  });

  it('announces it rather than only colouring it', () => {
    expect(forgot({ enabled: false })).toMatch(/role="alert"/);
  });
});

describe('the request form when mail works', () => {
  it('offers an address field and the captcha', () => {
    const body = forgot({ enabled: true });
    expect(body).toMatch(/<input[^>]+name="email"/);
    expect(body).toMatch(/g-recaptcha|recaptcha-unconfigured/);
  });

  it('shows the acknowledgement after a submission, and no longer the form', () => {
    const ack = 'If that address has an account, a link to set a new password is on its way.';
    const body = forgot({ enabled: true }, { sent: true, message: ack });

    expect(body).toContain(ack);
    expect(body).not.toMatch(/<input[^>]+name="email"/);
  });

  it('renders a failure from the action', () => {
    const body = forgot({ enabled: true }, { email: 'a@b.test', message: 'Enter the email address on your account.' });
    expect(body).toContain('Enter the email address on your account.');
    expect(body).toMatch(/role="alert"/);
  });
});

describe('the reset page', () => {
  it('offers no password form when the token is refused', () => {
    const body = reset({ valid: false, message: 'That link has expired — they last an hour. Request a new one.' });

    expect(body).toContain('That link has expired');
    // The whole risk: a form shown here would collect a new password and then throw it away.
    expect(body).not.toMatch(/<input[^>]+name="password"/);
    expect(body).toMatch(/href="\/forgot-password"/);
  });

  it('carries the token in the body, because a form does not send the query string', () => {
    const body = reset({ valid: true, token: 'tok-123', minPassword: 12 });
    expect(body).toMatch(/<input[^>]+type="hidden"[^>]+name="token"[^>]+value="tok-123"/);
  });

  it('asks for the password twice and states the minimum it will accept', () => {
    const body = reset({ valid: true, token: 't', minPassword: 12 });

    expect(body).toMatch(/<input[^>]+name="password"/);
    expect(body).toMatch(/<input[^>]+name="confirm"/);
    expect(body).toContain('At least 12 characters');
  });

  it('warns that other devices will be signed out BEFORE the button is pressed', () => {
    // `setPasswordFromReset` revokes every session. Somebody signed in on a phone should find that
    // out here, not by being logged out of it later with no explanation.
    expect(reset({ valid: true, token: 't', minPassword: 12 })).toContain('signs you out on every other device');
  });

  it('keeps the one-time credential out of search engines', () => {
    const head = ssr(Reset as never, { props: { data: { valid: true, token: 't', minPassword: 12 } } as never }).head;
    expect(head).toMatch(/name="robots"[^>]*content="noindex, nofollow"/);
  });

  it('does NOT set no-referrer, which would break its own form', () => {
    /*
      Pinned because it looks like an omission and is not.

      A request whose referrer policy is `no-referrer` serialises its `Origin` as `null` (Fetch), and
      SvelteKit's CSRF check refuses a POST whose Origin does not match the server's. Adding this
      meta tag — the obvious "harden the page with the token in the URL" move, and one `verify-email`
      genuinely does make — would make every reset fail with "Cross-site POST form submissions are
      forbidden" while the page still rendered perfectly. `control-plane-policy.ts` records this
      collision being hit once already.

      Cross-origin referrer leakage is covered by the global `referrer-policy: same-origin` header,
      which is applied to every response.
    */
    const head = ssr(Reset as never, { props: { data: { valid: true, token: 't', minPassword: 12 } } as never }).head;
    expect(head).not.toMatch(/name="referrer"/);
  });

  it('still has the form the referrer policy would have broken', () => {
    // The above only means something while this page actually posts.
    expect(reset({ valid: true, token: 't', minPassword: 12 })).toMatch(/<form[^>]+method="POST"/);
  });
});

describe('the styling exists rather than being asserted', () => {
  it('.acc-success has a real rule, unlike the pub-* classes these pages deliberately avoid', () => {
    /*
      These two pages use the login panel's classes, which are measured and real, and this pins the
      one class that had to be added.

      They were written this way because `contact`, `privacy`, `terms` and `verify-email` rendered
      `pub-auth` / `pub-container` / `pub-form-card` / `pub-hint` while none of those had a rule
      anywhere in the app. That was TODO.md item I, and it is now CLOSED — `public.css` defines
      them, scoped `.pub-root` like everything else in that sheet. These pages still use `acc-*`
      rather than switching: they are reached from the login panel and belong to its flow, and the
      two sets stay in their own stylesheets so a change to one cannot reach the other.
    */
    const css = readFileSync(new URL('../account.css', import.meta.url), 'utf8');
    expect(css).toMatch(/^\.acc-success\s*\{/m);
    expect(forgot({ enabled: true }, { sent: true, message: 'ok' })).toMatch(/class="acc-success"/);
  });
});
