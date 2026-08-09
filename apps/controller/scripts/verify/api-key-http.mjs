import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import postgres from 'postgres';

const baseUrl = process.env.ACCOUNT_TEST_BASE_URL ?? 'http://127.0.0.1:5300';
const email = process.env.SEED_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_PASSWORD ?? '';
assert.ok(email, 'SEED_EMAIL is required for the live account verifier');
assert.ok(password.length >= 12, 'SEED_PASSWORD must be at least 12 characters');
assert.ok(process.env.DATABASE_URL?.trim(), 'DATABASE_URL is required for the live account verifier');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
let cookie = '';
let fixtureId = '';

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('origin', baseUrl);
  if (cookie) headers.set('cookie', cookie);
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: 'manual' });
}

async function accountKeyIds() {
  const rows = await sql`
    SELECT api_keys.id
      FROM api_keys
      JOIN users ON users.account_id = api_keys.account_id
     WHERE users.email = ${email}`;
  return new Set(rows.map((row) => row.id));
}

function renderedSecret(html, keyId) {
  const withoutSvelteMarkers = html.replace(/<!--[\s\S]*?-->/g, '');
  const escapedId = keyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const row = withoutSvelteMarkers.match(
    new RegExp(`<td>\\s*${escapedId}\\s*</td>[\\s\\S]{0,1200}?<td>\\s*([0-9a-f]{64})\\s*</td>`)
  );
  return row?.[1] ?? null;
}

const before = await accountKeyIds();

try {
  const credentials = new URLSearchParams({ email, password });
  const login = await request('/login', {
    method: 'POST',
    body: credentials,
    headers: { 'content-type': 'application/x-www-form-urlencoded' }
  });
  assert.equal(login.status, 200, 'SvelteKit action transport must succeed');
  const loginResult = await login.json();
  assert.deepEqual(loginResult, { type: 'redirect', status: 303, location: '/account' });
  const setCookie = login.headers.get('set-cookie');
  assert.ok(setCookie, 'login must issue a session cookie');
  cookie = setCookie.split(';', 1)[0];

  const create = await request('/account?/createApiKey', {
    method: 'POST',
    body: new FormData(),
    headers: { 'x-sveltekit-action': 'true' }
  });
  assert.equal(create.status, 200, 'createApiKey action must succeed');

  const created = [...(await accountKeyIds())].filter((id) => !before.has(id));
  assert.equal(created.length, 1, 'the action must create exactly one fixture key');
  fixtureId = created[0];

  const [row] = await sql`
    SELECT secret_hash AS "secretHash", secret_ciphertext AS ciphertext
      FROM api_keys WHERE id = ${fixtureId}`;
  assert.ok(row?.ciphertext, 'new credentials must retain an encrypted display copy');

  const firstPage = await request('/account');
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.headers.get('cache-control'), 'private, no-store');
  const firstHtml = await firstPage.text();
  assert.doesNotMatch(firstHtml, /••••/, 'account HTML must not contain a masked credential');
  assert.match(firstHtml, /id="sessSearch" name="sessSearch"/);
  const firstSecret = renderedSecret(firstHtml, fixtureId);
  assert.match(firstSecret ?? '', /^[0-9a-f]{64}$/, 'the complete secret must render in its table cell');
  assert.equal(createHash('sha256').update(firstSecret).digest('hex'), row.secretHash);

  const reloadedPage = await request('/account');
  assert.equal(reloadedPage.status, 200);
  const reloadedSecret = renderedSecret(await reloadedPage.text(), fixtureId);
  assert.equal(reloadedSecret, firstSecret, 'the complete secret must survive a document reload');
} finally {
  if (fixtureId) {
    const form = new FormData();
    form.set('id', fixtureId);
    const deletion = await request('/account?/deleteApiKey', {
      method: 'POST',
      body: form,
      headers: { 'x-sveltekit-action': 'true' }
    }).catch(() => null);

    if (deletion?.status !== 200) {
      // This exact row was created by this verifier. A bounded fallback keeps a
      // failed HTTP assertion from leaving test credentials in the live fixture.
      await sql`DELETE FROM api_keys WHERE id = ${fixtureId}`;
    }
    assert.equal((await sql`SELECT 1 FROM api_keys WHERE id = ${fixtureId}`).length, 0);
  }
  await sql.end();
}

console.log('Live API-key display contract verified; fixture removed');
