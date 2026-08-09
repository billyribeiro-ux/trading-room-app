import { describe, expect, it, vi } from 'vitest';

/*
  Both env modules are mocked so the three configuration states can be exercised without the
  machine's own environment deciding the result. That is not a convenience here — it is the defect
  this repository hit today in the sibling room project, where two tests passed only because a
  developer's `.env` happened to hold a key and failed the moment CI ran them in a clean checkout.
*/
const mocked = vi.hoisted(() => ({ site: '', secret: '' }));
vi.mock('$app/env/public', () => ({
  get PUBLIC_RECAPTCHA_SITE_KEY() {
    return mocked.site;
  }
}));
vi.mock('$app/env/private', () => ({
  get RECAPTCHA_SECRET_KEY() {
    return mocked.secret;
  }
}));

const { assertRecaptchaConfiguration, recaptchaEnabled, RecaptchaConfigError, RECAPTCHA_FIELD, verifyRecaptcha } =
  await import('./recaptcha');

function configure(site: string, secret: string) {
  mocked.site = site;
  mocked.secret = secret;
}

/** A `fetch` that records what it was asked and answers with a chosen body. */
function stubFetch(reply: { ok: boolean; body?: unknown; throws?: boolean }) {
  const calls: { url: string; body: string }[] = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? '') });
    if (reply.throws) throw new Error('network down');
    return {
      ok: reply.ok,
      json: async () => reply.body
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('configuration states', () => {
  it('accepts both halves absent, which is local development', () => {
    expect(assertRecaptchaConfiguration(undefined, undefined)).toBeUndefined();
    expect(assertRecaptchaConfiguration('', '   ')).toBeUndefined();
  });

  it('accepts both halves present', () => {
    expect(assertRecaptchaConfiguration('site', 'secret')).toBeUndefined();
  });

  /*
    The state this whole module exists to prevent. A site key alone renders a real-looking checkbox
    that nothing verifies, which is the failure `Recaptcha.svelte` warns about in its own comment
    and which shipped anyway, because the verifying half was never written.
  */
  it('refuses a site key with no secret', () => {
    expect(() => assertRecaptchaConfiguration('site', undefined)).toThrow(RecaptchaConfigError);
    expect(() => assertRecaptchaConfiguration('site', '  ')).toThrow(/widget would render and never be verified/);
  });

  it('refuses a secret with no site key', () => {
    expect(() => assertRecaptchaConfiguration(undefined, 'secret')).toThrow(/no form can produce/);
  });
});

describe('verification', () => {
  it('skips cleanly when unconfigured, and does not call out', async () => {
    configure('', '');
    const { impl, calls } = stubFetch({ ok: true, body: { success: true } });
    expect(recaptchaEnabled()).toBe(false);
    await expect(verifyRecaptcha('anything', null, impl)).resolves.toEqual({
      ok: true,
      skipped: true
    });
    expect(calls).toHaveLength(0);
  });

  it('passes a successful verification and sends secret, response and remoteip', async () => {
    configure('site', 'the-secret');
    const { impl, calls } = stubFetch({ ok: true, body: { success: true } });
    await expect(verifyRecaptcha('token-abc', '198.51.100.7', impl)).resolves.toEqual({
      ok: true,
      skipped: false
    });
    expect(calls[0].url).toBe('https://www.google.com/recaptcha/api/siteverify');
    const sent = new URLSearchParams(calls[0].body);
    expect(sent.get('secret')).toBe('the-secret');
    expect(sent.get('response')).toBe('token-abc');
    expect(sent.get('remoteip')).toBe('198.51.100.7');
  });

  it('omits remoteip when the address is unknown rather than sending an empty one', async () => {
    configure('site', 'the-secret');
    const { impl, calls } = stubFetch({ ok: true, body: { success: true } });
    await verifyRecaptcha('token', null, impl);
    expect(new URLSearchParams(calls[0].body).has('remoteip')).toBe(false);
  });

  it('rejects a missing or blank token without calling out', async () => {
    configure('site', 'the-secret');
    const { impl, calls } = stubFetch({ ok: true, body: { success: true } });
    for (const token of [undefined, null, '', '   ']) {
      await expect(verifyRecaptcha(token, null, impl)).resolves.toEqual({
        ok: false,
        reason: 'missing-token'
      });
    }
    expect(calls).toHaveLength(0);
  });

  /*
    Every unhappy path fails CLOSED. Treating "we could not ask Google" as "it must be fine" turns
    an outage at a third party into an open door here, which is the opposite of what a bot defence
    is for.
  */
  it('fails closed when Google says no', async () => {
    configure('site', 'the-secret');
    const { impl } = stubFetch({ ok: true, body: { success: false, 'error-codes': ['timeout'] } });
    await expect(verifyRecaptcha('token', null, impl)).resolves.toEqual({
      ok: false,
      reason: 'rejected'
    });
  });

  it('fails closed on a non-200', async () => {
    configure('site', 'the-secret');
    const { impl } = stubFetch({ ok: false });
    await expect(verifyRecaptcha('token', null, impl)).resolves.toEqual({
      ok: false,
      reason: 'unreachable'
    });
  });

  it('fails closed when the request throws', async () => {
    configure('site', 'the-secret');
    const { impl } = stubFetch({ ok: true, throws: true });
    await expect(verifyRecaptcha('token', null, impl)).resolves.toEqual({
      ok: false,
      reason: 'unreachable'
    });
  });

  it('fails closed on a reply that is not the expected shape', async () => {
    configure('site', 'the-secret');
    for (const body of [null, 'yes', 42, {}, { success: 'true' }]) {
      const { impl } = stubFetch({ ok: true, body });
      await expect(verifyRecaptcha('token', null, impl)).resolves.toEqual({
        ok: false,
        reason: 'rejected'
      });
    }
  });
});

describe('the form field', () => {
  it('is the name Google’s widget writes', () => {
    // Hard-coded by the widget; a rename here silently stops every token being read.
    expect(RECAPTCHA_FIELD).toBe('g-recaptcha-response');
  });
});
