import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Firebase Cloud Messaging adapter, against a fake `fetch`.
 *
 * What these prove: the credential contract (including the newline trap every host sets), that a
 * secret never leaves the module, that FCM's refusals are classified into the three groups the
 * caller acts on differently, and that the connect deadline actually fires.
 *
 * What they cannot prove: that Google accepts the assertion we sign. That needs a real service
 * account, which this deployment does not have — stated plainly rather than faked with a recorded
 * response that would go stale without anybody noticing.
 */

const env = vi.hoisted(() => ({ FCM_SERVICE_ACCOUNT_JSON: '' as string | undefined }));

vi.mock('$app/env/private', () => ({
  get FCM_SERVICE_ACCOUNT_JSON() {
    return env.FCM_SERVICE_ACCOUNT_JSON;
  }
}));

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
});

const { FcmCredentialInvalid, FcmNotConfigured, FcmUnreachable, fcmConfigured, readServiceAccount, sendPush } =
  await import('./fcm');

/** A distinct client_email per test, because the access token is cached under exactly that key. */
let serial = 0;
function configure(overrides: Record<string, unknown> = {}, key: string = privateKey) {
  serial++;
  env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({
    project_id: 'proroom-test',
    client_email: `pusher-${serial}@proroom-test.iam.gserviceaccount.com`,
    private_key: key,
    ...overrides
  });
}

/** A `fetch` that answers the token endpoint, then the send endpoint from a queue. */
function fakeFetch(sendReplies: Array<{ status: number; body: string }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const href = String(url);
    calls.push({ url: href, init });
    if (href.startsWith('https://oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'ya29.fake-access-token', expires_in: 3600 }), {
        status: 200
      });
    }
    const reply = sendReplies.shift() ?? { status: 200, body: JSON.stringify({ name: 'projects/p/messages/1' }) };
    return new Response(reply.body, { status: reply.status });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const MESSAGE = { registrationToken: 'device-token-abcdef', title: 'T', body: 'B' };

beforeEach(() => {
  env.FCM_SERVICE_ACCOUNT_JSON = '';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('configuration', () => {
  it('is unconfigured on this deployment, and says which variable to set', () => {
    expect(fcmConfigured()).toBe(false);
    expect(() => readServiceAccount()).toThrow(FcmNotConfigured);
    expect(() => readServiceAccount()).toThrow(/FCM_SERVICE_ACCOUNT_JSON/);
  });

  it('refuses to send at all when unconfigured, rather than reporting nothing to do', async () => {
    // The whole point: an unconfigured push subsystem must not be mistakable for an idle one.
    await expect(sendPush(MESSAGE, fakeFetch([]).impl)).rejects.toThrow(FcmNotConfigured);
  });

  it('names the missing fields, and never echoes the value it was given', () => {
    env.FCM_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'p', private_key: 'SUPER-SECRET-KEY-MATERIAL' });
    let caught: unknown;
    try {
      readServiceAccount();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(FcmCredentialInvalid);
    expect((caught as Error).message).toContain('client_email');
    expect((caught as Error).message).not.toContain('SUPER-SECRET-KEY-MATERIAL');
  });

  it('rejects a value that is not JSON, without printing it', () => {
    env.FCM_SERVICE_ACCOUNT_JSON = 'not-json-but-still-a-secret';
    expect(() => readServiceAccount()).toThrow(/is not valid JSON/);
    expect(() => readServiceAccount()).not.toThrow(/not-json-but-still-a-secret/);
  });

  it('unescapes the literal backslash-n every secrets form stores', async () => {
    // Vercel and friends keep the PEM's newlines as two characters. Without the unescape,
    // createSign fails with "no start line" — a message that names nothing an operator can fix.
    configure({}, privateKey.replace(/\n/g, '\\n'));
    expect(readServiceAccount().privateKey).toContain('-----BEGIN PRIVATE KEY-----\n');
    await expect(sendPush(MESSAGE, fakeFetch([]).impl)).resolves.toEqual({
      ok: true,
      name: 'projects/p/messages/1'
    });
  });

  it('reports a key that cannot sign as a credential problem, not as a send failure', async () => {
    configure({}, '-----BEGIN PRIVATE KEY-----\nnot-a-key\n-----END PRIVATE KEY-----\n');
    await expect(sendPush(MESSAGE, fakeFetch([]).impl)).rejects.toThrow(FcmCredentialInvalid);
  });
});

describe('the request it makes', () => {
  it('bearer-authenticates the send and puts no key material on the wire twice', async () => {
    configure();
    const { impl, calls } = fakeFetch([]);
    await sendPush(MESSAGE, impl);

    const send = calls.find((c) => c.url.includes('messages:send'));
    expect(send?.url).toBe('https://fcm.googleapis.com/v1/projects/proroom-test/messages:send');
    const headers = send?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer ya29.fake-access-token');
    // The private key authenticates the TOKEN exchange only; it must never reach FCM itself.
    expect(String(send?.init.body)).not.toContain('BEGIN PRIVATE KEY');
    expect(JSON.stringify(headers)).not.toContain('BEGIN PRIVATE KEY');
  });

  it('sends validate_only for a dry run, and not for a real one', async () => {
    configure();
    const { impl, calls } = fakeFetch([]);
    await sendPush({ ...MESSAGE, dryRun: true }, impl);
    await sendPush(MESSAGE, impl);

    const sends = calls.filter((c) => c.url.includes('messages:send'));
    expect(JSON.parse(String(sends[0].init.body)).validate_only).toBe(true);
    expect(JSON.parse(String(sends[1].init.body)).validate_only).toBe(false);
  });

  it('reuses the access token for the same credential and re-mints it for a different one', async () => {
    configure();
    const first = fakeFetch([]);
    await sendPush(MESSAGE, first.impl);
    await sendPush(MESSAGE, first.impl);
    expect(first.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);

    // A cache that outlived the credential would send the previous project's token here.
    configure();
    const second = fakeFetch([]);
    await sendPush(MESSAGE, second.impl);
    expect(second.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
  });
});

describe('classifying what FCM says', () => {
  const unregistered = {
    status: 404,
    body: JSON.stringify({
      error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] }
    })
  };

  it('calls an UNREGISTERED registration unregistered, which is the only thing that licenses pruning', async () => {
    configure();
    await expect(sendPush(MESSAGE, fakeFetch([unregistered]).impl)).resolves.toMatchObject({
      ok: false,
      reason: 'unregistered'
    });
  });

  it('calls a malformed token invalid, separately from a dead one', async () => {
    configure();
    const reply = {
      status: 400,
      body: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', details: [{ errorCode: 'INVALID_ARGUMENT' }] } })
    };
    await expect(sendPush(MESSAGE, fakeFetch([reply]).impl)).resolves.toMatchObject({
      ok: false,
      reason: 'invalid-token'
    });
  });

  it('does NOT call a quota or server error unregistered', async () => {
    /*
      This is the assertion that protects real devices. `QUOTA_EXCEEDED` and a 503 are about us,
      not about the phone, and a caller that pruned on them would delete every working registration
      in the room during an outage.
    */
    configure();
    for (const reply of [
      { status: 429, body: JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED' } }) },
      { status: 503, body: '<html>unavailable</html>' }
    ]) {
      const outcome = await sendPush(MESSAGE, fakeFetch([reply]).impl);
      expect(outcome).toMatchObject({ ok: false, reason: 'rejected' });
    }
  });

  it('throws rather than returning an outcome when Google cannot be reached', async () => {
    // Same reason: "we could not ask" is not an answer about the device.
    configure();
    const impl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    await expect(sendPush(MESSAGE, impl)).rejects.toThrow(FcmUnreachable);
  });

  it('redacts the registration token out of the body it logs', async () => {
    configure();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await sendPush(MESSAGE, fakeFetch([{ status: 400, body: `bad token ${MESSAGE.registrationToken}` }]).impl);

    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('<registration-token>');
    expect(logged).not.toContain(MESSAGE.registrationToken);
  });
});

describe('the connect deadline', () => {
  it('gives up on a socket that never answers, and says how long it waited', async () => {
    configure();
    const hangs = vi.fn(
      (_url: string | URL | Request, init: RequestInit = {}) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('The operation was aborted.')));
        })
    ) as unknown as typeof fetch;

    vi.useFakeTimers();
    // The assertion is attached BEFORE the clock moves, so the rejection is never momentarily
    // unhandled — an unhandled-rejection warning here would be my harness, not the adapter.
    const pending = expect(sendPush(MESSAGE, hangs)).rejects.toThrow(/no response within 3000ms/);
    await vi.advanceTimersByTimeAsync(3_000);
    await pending;
  });
});
