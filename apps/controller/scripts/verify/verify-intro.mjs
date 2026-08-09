/**
 * The animation rule, end to end:
 *   the container drops in from the top on a document load or reload, and on
 *   nothing else — not on a navigation between controller pages, not on a
 *   navigation from the marketing site into the controller (which remounts the
 *   container), and not when something on the page saves.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ORIGIN = 'http://localhost:5300';
const PORT = 9336;
const cookie = readFileSync('/tmp/cookie1.txt', 'utf8').trim();

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-intro',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('chrome did not come up');
})();

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const mid = ++id;
    const onMsg = (m) => {
      const d = JSON.parse(m.data);
      if (d.id === mid) {
        ws.removeEventListener('message', onMsg);
        resolve(d.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

const evalJs = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};

await send('Network.enable');
const [name, value] = cookie.split('=');
await send('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1989,
  height: 1265,
  deviceScaleFactor: 2,
  mobile: false
});
// Headless Chrome reports `prefers-reduced-motion: reduce` by default, and
// account.css honours that with `animation: none !important` — so without this
// the page correctly refuses to animate and every count below is 0.
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
});
// Install the counter before the document exists, so a load cannot animate
// before the listener is attached.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__intro = 0;
    document.addEventListener('animationstart', (e) => {
      if (e.animationName === 'fadeInDown') window.__intro++;
    }, true);`
});

const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok, detail });

/* The counter is installed by Page.addScriptToEvaluateOnNewDocument below, so
   it resets on a real document load and survives client-side navigation —
   which is exactly the distinction under test. It counts `animationstart` for
   fadeInDown, i.e. whether the page actually dropped in, not whether some class
   happens to be present. */

const goto = async (href) => {
  await evalJs(`
    const a = [...document.querySelectorAll('a')].find((x) => new URL(x.href, location.origin).pathname === '${href}');
    if (!a) throw new Error('no link to ${href} on ' + location.pathname);
    a.click();
    await new Promise((r) => setTimeout(r, 1400));
    return location.pathname;
  `);
  return evalJs(`return location.pathname;`);
};

/* ── 1. a document load animates exactly once ───────────────────────────── */
await send('Page.navigate', { url: `${ORIGIN}/login` });
await new Promise((r) => setTimeout(r, 300));
await new Promise((r) => setTimeout(r, 2200));

let n = await evalJs(`return window.__intro;`);
check('document load on /login animates once', n === 1, `animationstart x${n}`);

/* ── 2. controller → controller navigation does not replay ──────────────── */
const at = await goto('/account');
check('navigated to /account', at === '/account', at);
n = await evalJs(`return window.__intro;`);
check('/login → /account does NOT replay', n === 1, `animationstart x${n}`);

/* ── 3. controller → marketing → controller does not replay ─────────────── */
await send('Page.navigate', { url: `${ORIGIN}/` });
await new Promise((r) => setTimeout(r, 1800));
await new Promise((r) => setTimeout(r, 800));
n = await evalJs(`return window.__intro;`);
check('the marketing home does not animate', n === 0, `animationstart x${n}`);

const intoController = await goto('/account');
check('navigated from / into the controller', intoController === '/account', intoController);
n = await evalJs(`return window.__intro;`);
check('/ → /account animates once (the container mounts for the first time)', n === 1, `animationstart x${n}`);

// back out to marketing and in again — the container remounts a SECOND time,
// which is the case that used to replay
await goto('/contact');
const backIn = await goto('/account');
check('navigated /contact → /account', backIn === '/account', backIn);
n = await evalJs(`return window.__intro;`);
check('a SECOND remount of the container does NOT replay', n === 1, `animationstart x${n}`);

/* ── 4. a mutation does not replay ──────────────────────────────────────── */
/* The mutation is a real one, because a fake one would not exercise the thing
   under test. It is also UNDONE at the end of the run: this used to leave a new
   API key behind on every invocation, and a verifier that grows the fixture it
   measures eventually breaks its own neighbours — /account's table heights are
   read against a capture whose tenant has exactly one key. */
const idsBefore = await evalJs(`
  const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
  return t ? [...t.tBodies[0].rows].map((r) => r.cells[0].textContent.trim()) : [];
`);
await evalJs(`
  document.querySelector('.acc-search').value = 'zz';
  document.querySelector('.acc-search').dispatchEvent(new Event('input', { bubbles: true }));
  const fd = new FormData();
  await fetch('/account?/createApiKey', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
  await new Promise((r) => setTimeout(r, 1200));
  return true;
`);
n = await evalJs(`return window.__intro;`);
check('a save does NOT replay', n === 1, `animationstart x${n}`);

/* ── 5. a real reload animates again ────────────────────────────────────── */
await send('Page.navigate', { url: `${ORIGIN}/account` });
await new Promise((r) => setTimeout(r, 300));
await new Promise((r) => setTimeout(r, 2200));
n = await evalJs(`return window.__intro;`);
check('a reload animates again, exactly once', n === 1, `animationstart x${n}`);

/* undo the key this run created — by id, comparing against the list taken
   before the POST, so nothing pre-existing can be caught by it */
const cleanup = await evalJs(`
  const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
  if (!t) return { noTable: true };
  const before = ${JSON.stringify(idsBefore)};
  const added = [...t.tBodies[0].rows]
    .map((r) => r.cells[0].textContent.trim())
    .filter((id) => id && !before.includes(id));
  for (const id of added) {
    const fd = new FormData();
    fd.set('id', id);
    await fetch('/account?/deleteApiKey', { method: 'POST', body: fd, headers: { 'x-sveltekit-action': 'true' } });
  }
  return { removed: added };
`);
check(
  'the run cleaned up the API key it created',
  Array.isArray(cleanup.removed) && cleanup.removed.length === 1,
  JSON.stringify(cleanup)
);

chrome.kill();

const pass = results.filter((r) => r.ok).length;
console.log(`\n  intro animation  ${pass}/${results.length}\n`);
for (const r of results) {
  console.log(`  ${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}${r.ok || !r.detail ? '' : `\n          got: ${r.detail}`}`);
}
console.log();
process.exit(pass === results.length ? 0 : 1);
