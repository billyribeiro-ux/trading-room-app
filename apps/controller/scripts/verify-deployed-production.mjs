import assert from 'node:assert/strict';

const CANONICAL_ORIGIN = 'https://www.tradingroom.app';
const APEX_ORIGIN = 'https://tradingroom.app';
const REQUEST_TIMEOUT_MS = 5_000;
const MINIMUM_HSTS_MAX_AGE_SECONDS = 31_536_000;
const EXPECTED_ROBOTS = 'User-agent: *\nDisallow: /\n';

const EXPECTED_SECURITY_HEADERS = new Map([
  ['cache-control', 'no-store'],
  ['content-security-policy', "base-uri 'self'; frame-ancestors 'none'; object-src 'none'"],
  ['permissions-policy', 'camera=(), geolocation=(), microphone=()'],
  // `same-origin`, not `no-referrer`. `no-referrer` also suppresses `Origin` on a form POST, so
  // SvelteKit's CSRF check refuses every submission from a page carrying it — which includes
  // `/contact` in this very list. `same-origin` still sends nothing cross-origin, which is the
  // disclosure this header prevents. See the comment in src/lib/server/control-plane-policy.ts.
  ['referrer-policy', 'same-origin'],
  ['x-content-type-options', 'nosniff'],
  ['x-frame-options', 'DENY'],
  ['x-robots-tag', 'noindex, nofollow']
]);

/*
  Reachable without a session. `/login` and `/register` are in this list now: the control plane is
  ENABLED in production, and they are the front door rather than something to be sealed off.
*/
const PUBLIC_ROUTES = ['/', '/contact', '/privacy', '/terms', '/login', '/register'];

/*
  Surfaces that belong to a signed-in account, each with what production actually answers to an
  anonymous request. Every one of these was measured against www.tradingroom.app on 2026-08-08
  rather than assumed.

  `/account/__data.json` is the odd one and the reason it is listed explicitly: SvelteKit answers a
  data request with HTTP 200 whose BODY is `{"type":"redirect","location":"/login"}`. Asserting a
  303 there would fail; asserting only the status would pass while the endpoint leaked. So the body
  is checked.
*/
const SIGNED_OUT_REDIRECTS = [
  ['GET', '/account'],
  ['HEAD', '/account'],
  ['GET', '/account/api-docs'],
  ['GET', '/account/rooms/1'],
  ['GET', '/launch/1'],
  ['GET', '/logout']
];

/** Anonymous requests that must not reveal whether the thing exists. */
const NOT_FOUND_FOR_ANONYMOUS = [
  // Operator console. 404 rather than 403 so its existence is not confirmed to a stranger.
  '/admin',
  '/session/deployed-smoke-room',
  '/session/deployed-smoke-room/joined'
];

/*
  Mutations that must not execute for an anonymous caller.

  Deliberately NOT probed, and each for a reason rather than an oversight:

    `/contact`  the form is live now, so a POST would deliver a real message. A smoke test that
                sends mail every 40 minutes is a smoke test nobody keeps.
    `/register` a POST that got past validation would create an account.
    `/login`    failed attempts feed the CAPTCHA threshold in `login_attempts`; a scheduled job
                should not be poisoning a real user-facing counter.

  What is left still proves the property: these are account-scoped writes, and if authentication
  were bypassed they would succeed.
*/
const ANONYMOUS_MUTATIONS = ['/account?/createApiKey', '/account/rooms/1?/saveField'];

assert.equal(
  Number.parseInt(process.versions.node.split('.')[0], 10),
  24,
  `deployed production verification requires Node 24; received ${process.versions.node}`
);

let requestCount = 0;

await verifyCanonicalRedirect();
await verifyPublicRoutes();
await verifySignedOutRedirects();
await verifyHiddenFromAnonymous();
await verifyUnknownRoute();
await verifyRobotsPolicy();
// Mutation-shaped probes run last, only once every read-only check above has proved the
// authentication boundary is intact.
await verifyAnonymousMutationsRefused();

console.log(`Deployed production contract verified with ${requestCount} bounded HTTPS requests to ${CANONICAL_ORIGIN}`);

async function verifyCanonicalRedirect() {
  for (const method of ['GET', 'HEAD']) {
    await withResponse(`${APEX_ORIGIN}/`, { method }, async (response) => {
      const label = `${method} apex`;
      assert.equal(response.status, 308, `${label} must permanently redirect`);
      assert.equal(
        response.headers.get('location'),
        `${CANONICAL_ORIGIN}/`,
        `${label} must target the canonical www origin`
      );
      assertHsts(response, label);
    });
  }
}

async function verifyPublicRoutes() {
  let homeHtml;
  let contactHtml;

  for (const path of PUBLIC_ROUTES) {
    for (const method of ['GET', 'HEAD']) {
      await withResponse(canonicalUrl(path), { method, headers: staleSessionHeader() }, async (response) => {
        const label = `${method} ${path}`;
        assert.equal(response.status, 200, `${label} must remain publicly available`);
        assertSecurityHeaders(response, label);
        assert.match(response.headers.get('content-type') ?? '', /^text\/html(?:;|$)/i, `${label} must return HTML`);

        if (method === 'GET' && path === '/') homeHtml = await response.text();
        if (method === 'GET' && path === '/contact') contactHtml = await response.text();
      });
    }
  }

  /*
    Inverted on 2026-08-08, and the inversion is the point.

    This used to assert the homepage had NO way in, which was right while the control plane was
    sealed. Production has since been opened, so the same assertion would now fail forever — and a
    permanently red scheduled alarm is one nobody reads. Asserting the links are PRESENT keeps the
    check load-bearing in the other direction: a deploy that silently reverted to the sealed
    marketing build, or lost its navigation, fails here.
  */
  assert.equal(typeof homeHtml, 'string', 'the canonical homepage body must be inspected');
  assert.match(homeHtml, /href=["']\/login(?:["'?#/])/i, 'the homepage must offer a way to sign in');
  assert.match(homeHtml, /href=["']\/register(?:["'?#/])/i, 'the homepage must offer a way to register');

  /*
    Likewise: the contact form is live, so the preview notice must be GONE and the textarea must be
    there. The old assertions said the exact opposite.
  */
  assert.equal(typeof contactHtml, 'string', 'the deployed contact body must be inspected');
  assert.doesNotMatch(
    contactHtml,
    /contact form is disabled during this public preview/i,
    'the preview notice must not survive on a deployment whose contact form works'
  );
  assert.match(contactHtml, /<textarea\b/i, 'the contact form must render its message field');
}

/**
 * An account surface, requested with a stale session cookie, must send the caller to `/login` and
 * disclose nothing on the way.
 *
 * The stale cookie is deliberate: a session id that no longer exists must not authenticate, and
 * that is a different failure from having no cookie at all.
 */
async function verifySignedOutRedirects() {
  for (const [method, path] of SIGNED_OUT_REDIRECTS) {
    await withResponse(canonicalUrl(path), { method, headers: staleSessionHeader() }, async (response) => {
      const label = `${method} ${path}`;
      assert.equal(response.status, 303, `${label} must redirect an unauthenticated caller`);
      assert.equal(response.headers.get('location'), '/login', `${label} must send them to the login page`);
      assertSecurityHeaders(response, label);

      /*
        A redirect carries no body. Asserting it is empty is what separates "redirected" from
        "rendered the page and also mentioned a redirect", which is the shape an authentication
        bypass would take.
      */
      assert.equal(await response.text(), '', `${label} must not render any of the page it protects`);
    });
  }

  /*
    The data endpoint. HTTP 200, and the body IS the redirect — see the comment on
    SIGNED_OUT_REDIRECTS. Checking the body rather than the status is the whole value here.
  */
  await withResponse(canonicalUrl('/account/__data.json'), { headers: staleSessionHeader() }, async (response) => {
    const label = 'GET /account/__data.json';
    assert.equal(response.status, 200, `${label} answers 200 with a redirect payload`);
    assert.deepEqual(
      JSON.parse(await response.text()),
      { type: 'redirect', location: '/login' },
      `${label} must return only a redirect, never account data`
    );
  });
}

/** Anonymous callers must not be able to tell these apart from a route that does not exist. */
async function verifyHiddenFromAnonymous() {
  for (const path of NOT_FOUND_FOR_ANONYMOUS) {
    await withResponse(canonicalUrl(path), { headers: staleSessionHeader() }, async (response) => {
      const label = `GET ${path}`;
      assert.equal(response.status, 404, `${label} must not confirm that it exists`);
      assertSecurityHeaders(response, label);
    });
  }
}

async function verifyUnknownRoute() {
  await withResponse(canonicalUrl('/definitely-not-a-route'), { headers: staleSessionHeader() }, async (response) => {
    assert.equal(response.status, 404, 'unknown routes must retain the ordinary 404');
    assertSecurityHeaders(response, 'GET unknown route');
  });
}

async function verifyRobotsPolicy() {
  await withResponse(canonicalUrl('/robots.txt'), {}, async (response) => {
    assert.equal(response.status, 200, 'robots.txt must remain available');
    assertHsts(response, 'GET /robots.txt');
    assert.equal(response.headers.get('set-cookie'), null, 'robots.txt must not create a session');
    assert.match(response.headers.get('content-type') ?? '', /^text\/plain(?:;|$)/i);
    assert.equal(
      (await response.text()).replaceAll('\r\n', '\n'),
      EXPECTED_ROBOTS,
      'robots.txt must disallow every crawler path during the preview'
    );
  });
}

async function verifyAnonymousMutationsRefused() {
  for (const path of ANONYMOUS_MUTATIONS) {
    await withResponse(
      canonicalUrl(path),
      {
        method: 'POST',
        headers: {
          ...staleSessionHeader(),
          origin: CANONICAL_ORIGIN
        },
        body: new URLSearchParams({ probe: '1' })
      },
      async (response) => {
        const label = `POST ${path}`;

        /*
          Refused, without pinning HOW. A 303 to /login, a 401, a 403 from the CSRF check — all are
          correct refusals, and which one applies depends on where in the stack the request dies.
          What must never happen is a 2xx, which is the only thing that means the write ran.
        */
        assert.ok(response.status >= 300, `${label} must not succeed for an anonymous caller (got ${response.status})`);
        assert.equal(response.headers.get('set-cookie'), null, `${label} must not establish a session`);
      }
    );
  }
}

function assertSecurityHeaders(response, label) {
  for (const [name, expected] of EXPECTED_SECURITY_HEADERS) {
    assert.equal(response.headers.get(name), expected, `${label} must set ${name}`);
  }
  assert.equal(response.headers.get('set-cookie'), null, `${label} must not create a session`);
  assertHsts(response, label);
}

function assertHsts(response, label) {
  const header = response.headers.get('strict-transport-security') ?? '';
  const match = /(?:^|;)\s*max-age=(\d+)(?:;|$)/i.exec(header);
  assert.ok(match, `${label} must set an HSTS max-age`);
  assert.ok(
    Number.parseInt(match[1], 10) >= MINIMUM_HSTS_MAX_AGE_SECONDS,
    `${label} HSTS max-age must be at least one year`
  );
}

async function withResponse(url, init, verify) {
  const response = await productionFetch(url, init);
  try {
    await verify(response);
  } finally {
    if (response.body && !response.bodyUsed) await response.body.cancel();
  }
}

async function productionFetch(url, init = {}) {
  const method = init.method ?? 'GET';
  const headers = new Headers({
    accept: 'text/html,application/xhtml+xml',
    'user-agent': 'tradingroom-deployed-smoke/1.0'
  });
  for (const [name, value] of new Headers(init.headers)) headers.set(name, value);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    requestCount += 1;
    return response;
  } catch (error) {
    throw new Error(`${method} ${new URL(url).pathname} did not complete within the production boundary`, {
      cause: error
    });
  }
}

function canonicalUrl(path) {
  return new URL(path, CANONICAL_ORIGIN).href;
}

function staleSessionHeader() {
  return { cookie: 'control_session=stale-deployed-smoke-session' };
}
