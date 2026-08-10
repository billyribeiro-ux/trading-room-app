#!/usr/bin/env node
/**
 * Post-deploy smoke test — the check neither application had, and the reason two total outages
 * reached production in one day.
 *
 * ## Why this exists
 *
 * On 2026-08-10 the controller's home page answered 500 for hours and the room refused every
 * handoff, and BOTH shipped past a completely green pipeline:
 *
 *   - `svelte-check` — 0 errors, 0 warnings, both apps
 *   - `vitest`       — 566 and 524 tests passing
 *   - `vite build`   — clean, under both adapters
 *   - `vite preview` — served the home page 200 on a developer machine
 *
 * Every one of those inspects SOURCE or a BUNDLE. Not one of them starts the artefact that ships
 * and asks it for a page. The two failures lived exactly in that gap:
 *
 *   - gsap resolved differently in the deployed function than in any local bundle, so
 *     `/(public)` threw `Cannot use import statement outside a module` at module instantiation;
 *   - Kit 3's `$env/dynamic/private` returned nothing because the room had no `src/env.ts`, so
 *     every secret read `undefined` while `process.env` held the real value.
 *
 * Neither is detectable without running the built server against a real environment. This script
 * is that step, and it takes about a second.
 *
 * ## What it asserts, and why each one
 *
 * Status codes alone, plus one content check per tier, because a 200 that renders an error page is
 * the failure mode a status check misses.
 *
 * The room's probe is the sharpest of the three: `/session` with a deliberately invalid token must
 * answer **403**. A 500 there means the room could not read `ROOM_JWT_SECRET` — which is precisely
 * what the Kit 3 regression did — and it needs no valid credential to run.
 *
 * ## Usage
 *
 *   node scripts/smoke.mjs                        # production
 *   SMOKE_CONTROLLER=https://preview.vercel.app \
 *   node scripts/smoke.mjs                        # a preview deployment
 *
 * Exits 0 when every check passes, 1 otherwise, and prints one line per check either way. It is
 * safe to run against production at any time: every request is a GET, nothing mutates, and the one
 * token it sends is invalid on purpose.
 */

const CONTROLLER = process.env.SMOKE_CONTROLLER ?? 'https://www.tradingroom.app';
const ROOM = process.env.SMOKE_ROOM ?? 'https://chat.tradingroom.app';
const MEDIA = process.env.SMOKE_MEDIA ?? 'https://media.tradingroom.app';

/** Per-request ceiling. A hung tier is a failed tier; this is a smoke test, not a patience test. */
const TIMEOUT_MS = 20_000;

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = [];

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} name
 * @param {string} url
 * @param {number} expected
 * @param {(body: string) => string | null} [checkBody] returns an error string, or null when fine
 */
async function expectStatus(name, url, expected, checkBody) {
  try {
    const response = await fetchWithTimeout(url);
    if (response.status !== expected) {
      results.push({ name, ok: false, detail: `expected ${expected}, got ${response.status} — ${url}` });
      return;
    }
    if (checkBody) {
      const problem = checkBody(await response.text());
      if (problem) {
        results.push({ name, ok: false, detail: `${expected} but ${problem} — ${url}` });
        return;
      }
    }
    results.push({ name, ok: true, detail: `${expected}` });
  } catch (error) {
    results.push({ name, ok: false, detail: `${error instanceof Error ? error.message : error} — ${url}` });
  }
}

// ── Controller ───────────────────────────────────────────────────────────────
// `/` is listed first because it is the one that broke: it was the ONLY failing route, while
// everything behind it stayed healthy, which is what made the outage easy to miss.
await expectStatus('controller  /', `${CONTROLLER}/`, 200, (body) =>
  body.includes('<title>') ? null : 'no <title> in the response body'
);
await expectStatus('controller  /login', `${CONTROLLER}/login`, 200);
await expectStatus('controller  /contact', `${CONTROLLER}/contact`, 200);
await expectStatus('controller  /privacy', `${CONTROLLER}/privacy`, 200);
await expectStatus('controller  /terms', `${CONTROLLER}/terms`, 200);
await expectStatus('controller  /forgot-password', `${CONTROLLER}/forgot-password`, 200);

// ── Room ─────────────────────────────────────────────────────────────────────
// 403 is the whole point. A deliberately invalid token must be PARSED and REFUSED; a 500 means the
// room could not read ROOM_JWT_SECRET, which is what the Kit 3 env regression produced.
await expectStatus('room        /session (invalid token must be refused, not 500)',
  `${ROOM}/session?id=1001&jwtSite=smoke-test-invalid-token`, 403);

// ── SFU ──────────────────────────────────────────────────────────────────────
await expectStatus('media       /health', `${MEDIA}/health`, 200, (body) => {
  try {
    const health = JSON.parse(body);
    if (health.status !== 'ok') return `status is ${JSON.stringify(health.status)}`;
    // A worker that died and was not replaced serves nothing, while /health still answers.
    if (health.workers < 1) return `no workers (${health.workers})`;
    if (health.workerDeaths > 0) return `workerDeaths is ${health.workerDeaths}`;
    // Admission must stay required. Anonymous mode would let anyone into any room.
    if (health.admission !== 'require-grant') return `admission is ${JSON.stringify(health.admission)}`;
    return null;
  } catch {
    return 'body is not JSON';
  }
});
// The Caddy contract from ops/mediasoup/Caddyfile.example: only /health and /ws are proxied.
await expectStatus('media       / (must not proxy)', `${MEDIA}/`, 404);

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? '  ok  ' : 'FAIL  '}${r.name}: ${r.detail}`);
console.log(
  failed.length === 0
    ? `\nAll ${results.length} checks passed.`
    : `\n${failed.length} of ${results.length} checks FAILED.`
);
process.exit(failed.length === 0 ? 0 : 1);
