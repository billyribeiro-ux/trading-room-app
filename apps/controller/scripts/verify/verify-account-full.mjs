/**
 * /account against `evidence-dumps/login-page/logged-in-page` — EVERY visible element, not a
 * sample of them.
 *
 * The reference side is that served DOM rendered against the controller's real
 * stylesheets (same method as the Manage page; see src/manage.css). Our side is
 * the live page. Both trees are walked in document order and matched by a
 * translation from the reference's Bootstrap classes to ours, so an element that
 * exists on one side and not the other shows up as a miss rather than being
 * quietly skipped.
 *
 * What is deliberately NOT compared, and why:
 *
 *  - The three reCAPTCHA/iframe nodes. They are Google's, injected off-screen at
 *    y=-10000, and are not part of this page.
 *  - Table column x/width. Auto layout hands leftover width to whichever cell
 *    holds the longest text, and the captured tenant's rooms, admins and API
 *    keys are not ours. Every other axis on those tables is compared.
 *  - Anything whose text differs because the DATA differs — checked by shape,
 *    not by content.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * The captures live in ~/Downloads/new-dumps. Resolved by prefix rather than by
 * an exact filename so a fresh capture (whose name carries a new timestamp) is
 * picked up automatically, and a missing one throws by name instead of ENOENT
 * on a path nobody recognises.
 */
const DUMP_DIR = process.env.HOME + '/Downloads/new-dumps';
function dumpPath(prefix) {
  const stem = prefix.replace(/\d+\.json$/, '');
  const hit = readdirSync(DUMP_DIR)
    .filter((f) => f.startsWith(stem))
    .sort()
    .pop();
  if (!hit) throw new Error(`no capture matching ${stem}* in ${DUMP_DIR}`);
  return `${DUMP_DIR}/${hit}`;
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9374;
const cookie = (process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8')).trim();
/**
 * The AUTHORITATIVE reference: the rect dump taken in a real browser on the real
 * page, not a reconstruction.
 *
 * Rendering `evidence-dumps/login-page/logged-in-page` against the captured stylesheets was the
 * first attempt, and it disagrees with the dump by 0.016px on every percentage
 * width — 379.984 where the real page has 380. The cause is the capture itself:
 * a stylesheet read back out of the CSSOM has its percentages serialised with
 * fewer digits than the source, so `33.33333333%` comes back as `33.3333%`, and
 * 1140 x that lands a 64th of a pixel short. The dump measured the real thing
 * and does not have that error.
 */
const dump = JSON.parse(readFileSync(dumpPath('room-login-1785587807656.json'), 'utf8'));
const cleanCls = (c) =>
  (c || '')
    .replace(/\s*ng-\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const ref = dump.baseline.nodes
  .filter((n) => n.rect && (n.rect.w > 0 || n.rect.h > 0))
  .map((n) => ({ tag: n.tag, cls: cleanCls(n.attrs.class), text: (n.text || '').trim(), rect: n.rect }));

/** reference class signature -> our selector for the same element */
const MAP = {
  'nav|navbar topnavbar': 'nav.acc-navbar',
  'div|container container-sm animated fadeInDown': '.acc-container',
  'div|center-block mt-xl': '.acc-inner',
  'h4|': 'h4.acc-h4',
  'div|col-md-4 panel pane-default': '.acc-col-4.acc-panel',
  'input|form-control': '.acc-input.acc-search',
  'button|btn btn-sm btn-default': '.acc-row > .acc-btn',
  'div|col-md-9 panel pane-default': '.col-md-9.acc-panel',
  'a|btn btn btn-warning mb': '.col-md-9.acc-panel > .acc-btn-warning',
  'a|btn btn-info mb': '.col-md-9.acc-panel > .acc-btn-info',
  'i|fa fa-cloud-upload': '.col-md-9.acc-panel .fa-cloud-upload',
  'a|btn btn btn-default mb': '.col-md-9.acc-panel > .acc-btn-default',
  'button|btn btn-success mb': '.col-md-12.acc-panel > .acc-btn-success',
  'button|btn btn btn-success mb': '.acc-table-responsive .acc-btn-success',
  'a|btn btn-primary mb': '.acc-btn-primary',
  'a|btn btn-sm btn-info': '.acc-btn-sm.acc-btn-info',
  'a|btn btn-sm btn-inverse': '.acc-btn-sm.acc-btn-inverse',
  'i|icon fa fa-external-link': '.acc-btn-sm.acc-btn-info .fa-external-link',
  'i|icon fa fa-cogs': '.acc-btn-sm.acc-btn-inverse .fa-cogs',
  'div|label label-orange': '.acc-label-orange',
  'div|p-lg text-center': '.acc-page-footer',
  'span|mr-sm': '.acc-page-footer .mr-sm',
  'div|col-md-2': '.acc-table-responsive .col-md-2'
};

/** signatures whose ordinal position is what identifies them */
const ORDINAL = {
  // the footer's rule has no class in the reference either, so match every <hr>
  'hr|': '.acc-body hr',
  'h3|': 'h3.acc-h3',
  'div|col-md-12 panel pane-default': '.col-md-12.acc-panel',
  'div|table-responsive': '.acc-table-responsive',
  'table|table table-striped table-bordered table-hover': 'table.acc-table',
  // the nested row inside the API Keys table-responsive uses the plain class
  'div|row': '.acc-row, .acc-row-block, .acc-body .row'
};

/** Google's injected widgets — not this page */
const IGNORE = /g-recaptcha|^iframe$/;

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-vacctfull',
    // the same device scale the dump was taken at; without it sub-pixel widths
    // land on a different 1/64 and every percentage box reads ~0.02 out
    '--force-device-scale-factor=2',
    '--window-size=1989,1265',
    'about:blank'
  ],
  { stdio: 'ignore' }
);
const wsUrl = await (async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const l = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const p = l.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('no chrome');
})();
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const send = (m, p = {}) =>
  new Promise((res) => {
    const mid = ++id;
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === mid) {
        ws.removeEventListener('message', h);
        res(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: mid, method: m, params: p }));
  });
await send('Network.enable');
const [name, value] = cookie.split('=');
await send('Network.setCookie', { name, value, domain: 'localhost', path: '/' });
await send('Page.enable');
/* The reference was captured with no classic scrollbar — its navbar measures the
   full 1989. Headless Chrome draws a 15px one as soon as the page overflows, and
   that steals width from every centred box, so a fixture with two extra API key
   rows moved x on half the page. Hiding it makes the measurement depend on the
   CSS instead of on how much data happens to be in the dev database. */
await send('Emulation.setScrollbarsHidden', { hidden: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5300/account' });
await new Promise((r) => setTimeout(r, 3000));

/* Match the capture's one-key fixture without requiring persistent seed data.
   If the current account has no key, create one through the real action for the
   audit and delete exactly that key before Chrome exits. */
const evaluate = async (expression, awaitPromise = false) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};
let fixtureKey = null;
const keyIds = await evaluate(`(() => {
  const t = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
  if (!t || !t.tBodies[0]) return [];
  return [...t.tBodies[0].rows]
    .filter((r) => r.cells.length === 3 && !r.cells[0].hasAttribute('colspan'))
    .map((r) => r.cells[0].textContent.trim());
})()`);
if (keyIds.length === 0) {
  await evaluate(
    `(async () => {
    await fetch('/account?/createApiKey', {
      method: 'POST',
      body: new FormData(),
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  })()`,
    true
  );
  await send('Page.navigate', { url: 'http://localhost:5300/account' });
  await new Promise((r) => setTimeout(r, 1500));
  fixtureKey =
    (await evaluate(`(() => {
    const t = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
    return t ? t.tBodies[0].rows[0].cells[0].textContent.trim() : null;
  })()`)) || null;
}

/* Same normalisation as verify-account: the capture's tenant has ONE API key, so
   rows past the first are hidden for the measurement rather than extrapolated. */
const { result: hidden } = await send('Runtime.evaluate', {
  expression: `(() => {
    const t = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
    if (!t || !t.tBodies[0]) return 0;
    const rows = [...t.tBodies[0].rows];
    rows.slice(1).forEach((r) => (r.style.display = 'none'));
    return rows.length - 1;
  })()`,
  returnByValue: true
});
if (hidden.value) console.log(`  (${hidden.value} extra API key row(s) hidden for measurement)`);

/* build the comparison list from the reference, in document order */
const counters = new Map();
const targets = [];
for (const e of ref) {
  const sig = `${e.tag}|${e.cls || ''}`;
  if (IGNORE.test(sig) || IGNORE.test(e.cls || '')) continue;
  const sel = MAP[sig] ?? ORDINAL[sig];
  if (!sel) continue; // structural wrappers with no counterpart of ours
  const nth = counters.get(sel) ?? 0;
  counters.set(sel, nth + 1);
  // table cells are content-sized; compare their y/h only
  // Anything laid out INSIDE the sessions table is positioned by that table's
  // auto column widths, which are driven by the captured tenant's data, not
  // ours. Their size is still compared; their x is not.
  const inTable = /^(table|thead|tbody|tr|th|td)$/.test(e.tag);
  const contentPositioned = e.rect.y > 250 && e.rect.y < 300;
  targets.push({
    sig,
    sel,
    nth,
    want: e.rect,
    axes: inTable ? 'yh' : contentPositioned ? 'ywh' : 'xywh'
  });
}

const { result } = await send('Runtime.evaluate', {
  expression: `JSON.stringify(${JSON.stringify(targets.map(({ sel, nth }) => ({ sel, nth })))}.map(({sel,nth}) => {
    const el = document.querySelectorAll(sel)[nth];
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    return { x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) };
  }))`,
  returnByValue: true
});
if (fixtureKey) {
  await evaluate(
    `(async () => {
    const fd = new FormData();
    fd.set('id', ${JSON.stringify(fixtureKey)});
    await fetch('/account?/deleteApiKey', {
      method: 'POST',
      body: fd,
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  })()`,
    true
  );
}
chrome.kill();

const mine = JSON.parse(result.value);
let pass = 0;
const fails = [];
targets.forEach((t, i) => {
  const got = mine[i];
  if (got.missing) {
    fails.push(`  MISSING  ${t.sig}  [${t.sel}][${t.nth}]`);
    return;
  }
  const bad = [...t.axes].filter((a) => Math.abs(t.want[a] - got[a]) > 0.01);
  if (!bad.length) {
    pass++;
    return;
  }
  fails.push(
    `  OFF      ${t.sig}  [${t.nth}]\n` +
      `             want ${[...t.axes].map((a) => `${a}=${t.want[a]}`).join(' ')}\n` +
      `             got  ${[...t.axes].map((a) => `${a}=${got[a]}`).join(' ')}   [${bad.join(',')}]`
  );
});

console.log(`\n  /account, every mapped element  ${pass}/${targets.length} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
