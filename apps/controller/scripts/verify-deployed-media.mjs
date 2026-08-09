import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { connect as connectTls } from 'node:tls';

const configuredOrigin = process.env.MEDIA_SMOKE_ORIGIN?.trim();
assert.ok(configuredOrigin, 'MEDIA_SMOKE_ORIGIN must name the reviewed Stage 1 HTTPS origin');
const configuredBrowserOrigin = process.env.MEDIA_SMOKE_BROWSER_ORIGIN?.trim();
assert.ok(configuredBrowserOrigin, 'MEDIA_SMOKE_BROWSER_ORIGIN must name the reviewed browser HTTPS origin');

const mediaOrigin = new URL(configuredOrigin);
assert.equal(mediaOrigin.protocol, 'https:', 'MEDIA_SMOKE_ORIGIN must use HTTPS');
assert.equal(mediaOrigin.username, '', 'MEDIA_SMOKE_ORIGIN must not contain credentials');
assert.equal(mediaOrigin.password, '', 'MEDIA_SMOKE_ORIGIN must not contain credentials');
assert.equal(mediaOrigin.port, '', 'MEDIA_SMOKE_ORIGIN must use the standard HTTPS port');
assert.equal(mediaOrigin.pathname, '/', 'MEDIA_SMOKE_ORIGIN must not contain a path');
assert.equal(mediaOrigin.search, '', 'MEDIA_SMOKE_ORIGIN must not contain a query');
assert.equal(mediaOrigin.hash, '', 'MEDIA_SMOKE_ORIGIN must not contain a fragment');

const browserOrigin = new URL(configuredBrowserOrigin);
assert.equal(browserOrigin.protocol, 'https:', 'MEDIA_SMOKE_BROWSER_ORIGIN must use HTTPS');
assert.equal(browserOrigin.username, '', 'MEDIA_SMOKE_BROWSER_ORIGIN must not contain credentials');
assert.equal(browserOrigin.password, '', 'MEDIA_SMOKE_BROWSER_ORIGIN must not contain credentials');
assert.equal(browserOrigin.port, '', 'MEDIA_SMOKE_BROWSER_ORIGIN must use the standard HTTPS port');
assert.equal(browserOrigin.pathname, '/', 'MEDIA_SMOKE_BROWSER_ORIGIN must not contain a path');
assert.equal(browserOrigin.search, '', 'MEDIA_SMOKE_BROWSER_ORIGIN must not contain a query');
assert.equal(browserOrigin.hash, '', 'MEDIA_SMOKE_BROWSER_ORIGIN must not contain a fragment');

const MEDIA_HOST = mediaOrigin.hostname;
const HTTPS_HEALTH_URL = new URL('/health', mediaOrigin).href;
const plaintextOrigin = new URL(mediaOrigin);
plaintextOrigin.protocol = 'http:';
const HTTP_HEALTH_URL = new URL('/health', plaintextOrigin).href;
const REQUEST_TIMEOUT_MS = 5_000;
const MAXIMUM_HEALTH_BODY_BYTES = 1_024;
const MAXIMUM_UPGRADE_HEADER_BYTES = 8_192;
const MINIMUM_HSTS_MAX_AGE_SECONDS = 31_536_000;
const EXPECTED_HEALTH_KEYS = ['admission', 'peers', 'rooms', 'status', 'workerDeaths', 'workers'];

assert.equal(
  Number.parseInt(process.versions.node.split('.')[0], 10),
  24,
  `deployed media verification requires Node 24; received ${process.versions.node}`
);

await verifyTlsCertificate();
await verifyHttpsHealth();
await verifyHttpRedirect();
await verifyWebSocketAdmissionBoundary();

console.log(`Deployed Stage 1 media contract verified at ${mediaOrigin.origin}`);

async function verifyTlsCertificate() {
  const socket = await openVerifiedTlsSocket('media TLS verification');
  try {
    const certificate = socket.getPeerCertificate();
    assert.ok(certificate.valid_to, 'media TLS certificate must provide an expiry');
    assert.ok(Date.parse(certificate.valid_to) > Date.now(), 'media TLS certificate must not be expired');
  } finally {
    socket.destroy();
  }
}

async function verifyHttpsHealth() {
  await withFetchResponse(HTTPS_HEALTH_URL, {}, async (response) => {
    assert.equal(response.status, 200, 'HTTPS media health must return 200');
    assert.match(
      response.headers.get('content-type') ?? '',
      /^application\/json(?:;|$)/i,
      'HTTPS media health must return JSON'
    );
    assert.equal(response.headers.get('set-cookie'), null, 'media health must not set a cookie');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assertHsts(response);

    const declaredLength = response.headers.get('content-length');
    if (declaredLength !== null) {
      assert.ok(
        Number.parseInt(declaredLength, 10) <= MAXIMUM_HEALTH_BODY_BYTES,
        'media health response must remain bounded'
      );
    }

    const body = await response.text();
    assert.ok(
      Buffer.byteLength(body, 'utf8') <= MAXIMUM_HEALTH_BODY_BYTES,
      'media health response must remain bounded'
    );

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error('media health response must contain valid JSON', { cause: error });
    }

    assert.ok(
      payload !== null && typeof payload === 'object' && !Array.isArray(payload),
      'media health payload must be an object'
    );
    assert.deepEqual(
      Object.keys(payload).sort(),
      EXPECTED_HEALTH_KEYS,
      'media health must expose only the reviewed safe fields'
    );
    assert.equal(payload.status, 'ok');
    assertPositiveInteger(payload.workers, 'workers');
    assert.equal(payload.workerDeaths, 0, 'workerDeaths must remain zero');
    assert.equal(payload.admission, 'require-grant');
    assertNonNegativeInteger(payload.rooms, 'rooms');
    assertNonNegativeInteger(payload.peers, 'peers');
  });
}

async function verifyHttpRedirect() {
  await withFetchResponse(HTTP_HEALTH_URL, {}, async (response) => {
    assert.equal(response.status, 308, 'plaintext media health must permanently redirect');
    assert.equal(
      response.headers.get('location'),
      HTTPS_HEALTH_URL,
      'plaintext media health must redirect to the exact HTTPS endpoint'
    );
    assert.equal(response.headers.get('set-cookie'), null, 'media redirect must not set a cookie');
  });
}

async function verifyWebSocketAdmissionBoundary() {
  const probes = [
    {
      label: 'correct-origin unsigned WebSocket upgrade',
      expectedStatus: 401,
      headers: [`Origin: ${browserOrigin.origin}`, 'Sec-Fetch-Site: same-origin']
    },
    {
      label: 'missing-origin WebSocket upgrade',
      expectedStatus: 403,
      headers: []
    },
    {
      label: 'wrong-origin WebSocket upgrade',
      expectedStatus: 403,
      headers: ['Origin: https://origin-mismatch.invalid']
    },
    {
      label: 'duplicate-origin WebSocket upgrade',
      expectedStatus: 403,
      headers: [`Origin: ${browserOrigin.origin}`, `Origin: ${browserOrigin.origin}`]
    },
    {
      label: 'cross-site Fetch Metadata WebSocket upgrade',
      expectedStatus: 403,
      headers: [`Origin: ${browserOrigin.origin}`, 'Sec-Fetch-Site: cross-site']
    },
    {
      label: 'duplicate Fetch Metadata WebSocket upgrade',
      expectedStatus: 403,
      headers: [`Origin: ${browserOrigin.origin}`, 'Sec-Fetch-Site: same-origin', 'Sec-Fetch-Site: same-origin']
    }
  ];

  for (const probe of probes) {
    await verifyRejectedWebSocketUpgrade(probe);
  }
}

async function verifyRejectedWebSocketUpgrade({ label, expectedStatus, headers }) {
  const socket = await openVerifiedTlsSocket(label);
  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      let received = '';
      let receivedBytes = 0;

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('data', onData);
        socket.off('error', fail);
        socket.off('close', onClose);
      };
      const succeed = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const fail = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const onClose = () => fail(new Error(`${label} closed before a response`));
      const onData = (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAXIMUM_UPGRADE_HEADER_BYTES) {
          fail(new Error('unsigned WebSocket response headers exceeded the safety bound'));
          return;
        }

        received += chunk.toString('latin1');
        const headerEnd = received.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        try {
          const responseHead = received.slice(0, headerEnd);
          const [statusLine, ...responseHeaders] = responseHead.split('\r\n');
          assert.match(
            statusLine,
            new RegExp(`^HTTP/1\\.1 ${expectedStatus}(?:\\s|$)`),
            `${label} must receive HTTP ${expectedStatus}`
          );
          assert.equal(
            responseHeaders.some((headerLine) => /^set-cookie:/i.test(headerLine)),
            false,
            `${label} must not set a cookie`
          );
          succeed();
        } catch (error) {
          fail(error);
        }
      };
      const timer = setTimeout(() => fail(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);

      socket.on('data', onData);
      socket.once('error', fail);
      socket.once('close', onClose);
      const websocketKey = randomBytes(16).toString('base64');
      socket.write(
        [
          'GET /ws HTTP/1.1',
          `Host: ${MEDIA_HOST}`,
          'Connection: Upgrade',
          'Upgrade: websocket',
          'Sec-WebSocket-Version: 13',
          `Sec-WebSocket-Key: ${websocketKey}`,
          ...headers,
          'User-Agent: tradingroom-deployed-media-smoke/1.0',
          '',
          ''
        ].join('\r\n')
      );
    });
  } finally {
    socket.destroy();
  }
}

function assertPositiveInteger(value, field) {
  assert.ok(Number.isInteger(value) && value >= 1, `${field} must be an integer of at least one`);
}

function assertNonNegativeInteger(value, field) {
  assert.ok(Number.isInteger(value) && value >= 0, `${field} must be a nonnegative integer`);
}

function assertHsts(response) {
  const header = response.headers.get('strict-transport-security') ?? '';
  const match = /(?:^|;)\s*max-age=(\d+)(?:;|$)/i.exec(header);
  assert.ok(match, 'HTTPS media health must set an HSTS max-age');
  assert.ok(
    Number.parseInt(match[1], 10) >= MINIMUM_HSTS_MAX_AGE_SECONDS,
    'HTTPS media health HSTS max-age must be at least one year'
  );
}

async function withFetchResponse(url, init, verify) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      'user-agent': 'tradingroom-deployed-media-smoke/1.0'
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });

  try {
    await verify(response);
  } finally {
    if (response.body && !response.bodyUsed) await response.body.cancel();
  }
}

function openVerifiedTlsSocket(label) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const socket = connectTls({
      host: MEDIA_HOST,
      port: 443,
      servername: MEDIA_HOST,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2'
    });

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('error', fail);
      socket.off('secureConnect', onSecureConnect);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      socket.destroy();
      reject(new Error(`${label} failed`, { cause: error }));
    };
    const onSecureConnect = () => {
      try {
        assert.equal(socket.authorized, true, `${label} must use a publicly trusted certificate`);
        assert.ok(['TLSv1.2', 'TLSv1.3'].includes(socket.getProtocol()), `${label} must negotiate TLS 1.2 or newer`);
      } catch (error) {
        fail(error);
        return;
      }

      settled = true;
      cleanup();
      resolve(socket);
    };

    socket.once('error', fail);
    socket.once('secureConnect', onSecureConnect);
    timer = setTimeout(() => fail(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
  });
}
