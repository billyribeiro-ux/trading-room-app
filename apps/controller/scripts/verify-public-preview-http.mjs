import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import postgres from 'postgres';

const host = '127.0.0.1';

/*
  A PostgreSQL server this verifier may create and drop a throwaway database on.

  The SQLite build made a temp directory per run and deleted it afterwards. The
  equivalent here is a real database with a random name, dropped in the `finally`.
  It is deliberately NOT the developer's own DATABASE_URL: this verifier registers
  accounts, and pointing it at a working database would put fixture rows in it.
*/
const adminUrl = process.env.VERIFY_POSTGRES_ADMIN_URL ?? 'postgres://localhost:5432/postgres';

/*
  Configuration this verifier PINS rather than inherits.

  `vite dev` reads the developer's `.env`, so without this the gate's result depends on the machine
  it runs on. Not hypothetical: adding the reCAPTCHA pair assertion made every server here refuse to
  start, because one `.env` held a site key and no secret. That is a real half-configured state,
  correctly rejected — but it turned an unrelated HTTP contract red and said nothing about the
  contract being tested.

  Both halves are blanked, which is the disabled state. These tests are about the control-plane
  boundary and the account flow; `recaptcha.test.ts` owns bot protection.

  Declared up here, above the top-level awaits that drive this file. A `const` is not hoisted, so
  placing it beside `startDevServer` further down left it in the temporal dead zone and every call
  threw before reaching a server.
*/
const PINNED_ENV = Object.freeze({
  PUBLIC_RECAPTCHA_SITE_KEY: '',
  RECAPTCHA_SECRET_KEY: '',
  PROFILE_AUTHORITY_MODE: '',
  ROOM_AUTHORITY_MODE: '',
  ROOM_SETTINGS_AUTHORITY_MODE: ''
});
const staleSessionHeaders = { cookie: 'control_session=stale-preview-session' };
// This verifier intentionally drives Vite's development server so the first request to a route can
// include cold Svelte SSR compilation. Keep the timeout above that compile cost; production latency
// is measured by the deployed verifier, not by this deterministic source contract.
const requestTimeoutMs = 15_000;

await verifyMarketingOnlyBoundary();
await verifyPostgresModeRequiresAConnectionString();
await verifyAccountFlowBoots();

console.log(
  'Control-plane HTTP contracts verified: marketing fails closed, postgres mode demands a connection string, and the account flow works'
);

async function verifyMarketingOnlyBoundary() {
  const running = await startDevServer({
    CONTROL_PLANE_MODE: 'marketing-only',
    DATABASE_URL: ''
  });

  try {
    await waitForServer(running);

    for (const path of ['/', '/contact', '/privacy', '/terms']) {
      for (const method of ['GET', 'HEAD']) {
        const response = await fetchWithin(`${running.origin}${path}`, {
          method,
          headers: staleSessionHeaders,
          redirect: 'manual'
        });
        assert.equal(response.status, 200, `${method} ${path} must remain available`);
        assert.equal(response.headers.get('set-cookie'), null, `${method} ${path} must not create a session`);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-frame-options'), 'DENY');
        await discardResponse(response);
      }
    }

    const home = await (await fetchWithin(running.origin, { headers: staleSessionHeaders, redirect: 'manual' })).text();
    assert.doesNotMatch(home, /href="\/login"|href="\/register"|>Register\/Login</);

    const contact = await (
      await fetchWithin(`${running.origin}/contact`, {
        headers: staleSessionHeaders,
        redirect: 'manual'
      })
    ).text();
    /*
      ASSERTED AS A PROPERTY, NOT AS A SENTENCE.

      This used to demand the literal "contact form is disabled during this public preview" — the
      wording of the ORIGINAL contact page, written in e50a819 and never revisited while the page
      itself was rebuilt twice. The page now keys off `controlPlaneMode` rather than a launch phase,
      so it says "not available on this deployment", which is the more accurate claim: the form is
      unavailable because there is no control plane behind it, not because of what week it is.

      The behaviour it guards is intact and, if anything, stronger than when this was written. The
      page renders the warning BEFORE the form — its own comment cites this project's dead-control
      rule for why — states that nothing would be stored or sent, and offers a route that works.
      So the three things below are what actually matter, and none of them is a wording.
    */
    assert.match(contact, /form is not available|form is disabled/i);
    assert.match(contact, /would be stored or sent|stored or sent/i);
    assert.match(contact, /mailto:/i);
    /*
      The warning must PRECEDE the message field, not follow a submission.

      Anchored on the MESSAGE TEXTAREA specifically, not on any `<input>`. The first draft of this
      used `<(?:textarea|input)\b` and failed against a correct page, because the shared chrome
      renders inputs of its own above the article — the assertion was measuring the wrong thing.
      What matters is that the visitor reads "nothing would be stored or sent" before they type
      their enquiry.
    */
    const warningAt = contact.search(/stored or sent/i);
    const messageFieldAt = contact.search(/<textarea\b/i);
    assert.ok(
      warningAt !== -1 && (messageFieldAt === -1 || warningAt < messageFieldAt),
      'the contact page must say the form does not work BEFORE the message field'
    );

    const blocked = [
      ['GET', '/login'],
      ['POST', '/login'],
      ['GET', '/register'],
      ['POST', '/register'],
      ['GET', '/account'],
      ['HEAD', '/account'],
      ['GET', '/account/__data.json'],
      ['POST', '/account?/createApiKey'],
      ['GET', '/account/api-docs'],
      ['GET', '/account/rooms/1'],
      ['POST', '/account/rooms/1?/saveField'],
      ['GET', '/launch/1'],
      ['GET', '/logout'],
      ['POST', '/logout'],
      ['GET', '/session/test-room'],
      ['POST', '/session/test-room'],
      ['GET', '/session/test-room/joined'],
      ['POST', '/contact']
    ];

    for (const [method, path] of blocked) {
      const response = await fetchWithin(`${running.origin}${path}`, {
        method,
        body: method === 'POST' ? new URLSearchParams({ probe: '1' }) : undefined,
        headers: {
          ...staleSessionHeaders,
          ...(method === 'POST' ? { origin: running.origin } : {})
        },
        redirect: 'manual'
      });
      assert.equal(response.status, 503, `${method} ${path} must fail closed`);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(response.headers.get('set-cookie'), null, `${method} ${path} must not create a session`);
      await discardResponse(response);
    }

    const missing = await fetchWithin(`${running.origin}/definitely-not-a-route`, {
      headers: staleSessionHeaders,
      redirect: 'manual'
    });
    assert.equal(missing.status, 404, 'unknown routes must retain the ordinary SvelteKit 404');
    await discardResponse(missing);
  } catch (error) {
    process.stderr.write(running.output());
    throw error;
  } finally {
    await stopDevServer(running);
  }
}

/**
 * The mode is fail-closed on its configuration, not on the hosting platform.
 *
 * This replaces a test that asserted `local-sqlite` was rejected on Vercel. That
 * prohibition existed because Vercel's filesystem is ephemeral and per-instance, so a
 * SQLite file written there was lost. PostgreSQL is reachable over the network and
 * Vercel is now the intended host, so the platform check is gone — but the
 * configuration check that actually protects anything is still here: `postgres` mode
 * without a connection string must refuse to start rather than boot and fail at the
 * first query.
 */
async function verifyPostgresModeRequiresAConnectionString() {
  let running;
  try {
    running = await startDevServer({ CONTROL_PLANE_MODE: 'postgres', DATABASE_URL: '' });
    await waitForRuntimeRejection(running);
    assert.match(running.output(), /DATABASE_URL is required when CONTROL_PLANE_MODE=postgres/);
  } catch (error) {
    if (running) process.stderr.write(running.output());
    throw error;
  } finally {
    if (running) await stopDevServer(running);
  }
}

async function verifyAccountFlowBoots() {
  const databaseName = `proroom_verify_${randomBytes(6).toString('hex')}`;
  const admin = postgres(adminUrl, { max: 1, prepare: false, onnotice: () => {} });
  let running;

  try {
    await admin.unsafe(`CREATE DATABASE ${databaseName}`);
    const databaseUrl = new URL(adminUrl);
    databaseUrl.pathname = `/${databaseName}`;

    running = await startDevServer({
      CONTROL_PLANE_MODE: 'postgres',
      DATABASE_URL: databaseUrl.toString()
    });
    await waitForServer(running);
    const loginPage = await fetchWithin(`${running.origin}/login`, { redirect: 'manual' });
    assert.equal(loginPage.status, 200, 'the enabled login must render');
    await discardResponse(loginPage);

    // The bootstrap must have created its schema on first request, not on import.
    const seeded = postgres(databaseUrl.toString(), { max: 1, prepare: false, onnotice: () => {} });
    try {
      const tables = await seeded`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
      const names = new Set(tables.map((r) => r.tablename));
      for (const required of ['accounts', 'users', 'rooms', 'room_users', 'login_sessions']) {
        assert.ok(names.has(required), `bootstrap must create ${required}`);
      }
    } finally {
      await seeded.end();
    }

    const email = 'runtime-proof@example.com';
    const password = 'Local-runtime-proof-123!';
    const registration = await fetchWithin(`${running.origin}/register`, {
      method: 'POST',
      body: new URLSearchParams({
        name: 'Runtime Proof',
        email,
        password,
        confirm: password,
        agreeTOS: 'on'
      }),
      headers: { accept: 'text/html,application/xhtml+xml', origin: running.origin },
      redirect: 'manual'
    });
    assertNativeFormRedirect(registration, '/account', 'registration');
    const registrationCookie = sessionCookie(registration, 'registration');
    await discardResponse(registration);

    const registeredAccount = await fetchWithin(`${running.origin}/account`, {
      headers: { cookie: registrationCookie },
      redirect: 'manual'
    });
    assert.equal(registeredAccount.status, 200, 'the newly registered account must load');
    assert.equal(registeredAccount.headers.get('cache-control'), 'private, no-store');
    await discardResponse(registeredAccount);

    const login = await fetchWithin(`${running.origin}/login`, {
      method: 'POST',
      body: new URLSearchParams({ email, password }),
      headers: { accept: 'text/html,application/xhtml+xml', origin: running.origin },
      redirect: 'manual'
    });
    assertNativeFormRedirect(login, '/account', 'login');
    const loginCookie = sessionCookie(login, 'login');
    await discardResponse(login);

    const authenticatedAccount = await fetchWithin(`${running.origin}/account`, {
      headers: { cookie: loginCookie },
      redirect: 'manual'
    });
    assert.equal(authenticatedAccount.status, 200, 'the authenticated account must load');
    assert.equal(authenticatedAccount.headers.get('cache-control'), 'private, no-store');
    await discardResponse(authenticatedAccount);
  } catch (error) {
    if (running) process.stderr.write(running.output());
    throw error;
  } finally {
    if (running) await stopDevServer(running);
    await admin.unsafe(`DROP DATABASE IF EXISTS ${databaseName} WITH (FORCE)`).catch(() => {});
    await admin.end();
  }
}

function assertNativeFormRedirect(response, expectedLocation, label) {
  assert.equal(response.status, 303, `${label} native form must use an HTTP redirect`);
  assert.equal(response.headers.get('location'), expectedLocation, `${label} must redirect`);
}

function sessionCookie(response, label) {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, `${label} must issue a session cookie`);
  return setCookie.split(';', 1)[0];
}

async function startDevServer(configuration) {
  const port = await availablePort();
  const origin = `http://${host}:${port}`;
  let output = '';
  let startupError;
  const server = spawn('pnpm', ['dev', '--host', host, '--port', String(port)], {
    cwd: new URL('../', import.meta.url),
    detached: process.platform !== 'win32',
    env: { ...process.env, CI: 'true', ...PINNED_ENV, ...configuration },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const appendOutput = (chunk) => {
    output = `${output}${chunk}`.slice(-64 * 1024);
  };
  server.stdout.setEncoding('utf8');
  server.stderr.setEncoding('utf8');
  server.stdout.on('data', appendOutput);
  server.stderr.on('data', appendOutput);
  server.once('error', (error) => {
    startupError = error;
    appendOutput(`${error.name}: child process failed to start\n`);
  });

  return { origin, output: () => output, server, startupError: () => startupError };
}

async function stopDevServer({ server }) {
  if (server.exitCode !== null || server.signalCode !== null) return;
  const exitObserved = new Promise((resolve) => server.once('exit', () => resolve(true)));
  signalProcessTree(server, 'SIGTERM');
  if (await settleWithin(exitObserved, 3_000)) return;
  signalProcessTree(server, 'SIGKILL');
  assert.equal(await settleWithin(exitObserved, 3_000), true, 'preview process did not exit');
}

function signalProcessTree(server, signal) {
  if (server.pid && process.platform !== 'win32') {
    try {
      process.kill(-server.pid, signal);
      return;
    } catch (error) {
      if (error?.code === 'ESRCH') return;
    }
  }
  server.kill(signal);
}

function settleWithin(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    promise.then(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function availablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, host, resolve);
  });
  const address = listener.address();
  assert.ok(address && typeof address === 'object');
  const selectedPort = address.port;
  await new Promise((resolve, reject) => listener.close((error) => (error ? reject(error) : resolve())));
  return selectedPort;
}

async function waitForServer(running) {
  const { origin, server } = running;
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (running.startupError()) throw running.startupError();
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`preview server exited with code ${server.exitCode}`);
    }

    try {
      const response = await fetchWithin(origin);
      const ready = response.status === 200;
      await discardResponse(response);
      if (ready) return;
    } catch {
      // The listener is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('timed out waiting for the control-plane test server');
}

async function waitForRuntimeRejection(running) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (running.startupError()) throw running.startupError();
    if (running.server.exitCode !== null || running.server.signalCode !== null) return;

    let response;
    try {
      response = await fetchWithin(running.origin);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    const status = response.status;
    await discardResponse(response);
    assert.notEqual(status, 200, 'a misconfigured control plane must never serve the application');
    if (status >= 500) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('timed out waiting for the misconfiguration to be rejected');
}

function fetchWithin(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs) });
}

async function discardResponse(response) {
  if (response.body) await response.body.cancel();
}
