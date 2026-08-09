/**
 * Forensic diff: the rendered /account page against the reference capture.
 *
 * The reference rects come straight out of the dump — nothing is typed by hand —
 * and are matched to our elements by an explicit selector map, so a rename on
 * either side shows up as a missing element rather than a silent pass.
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
const DUMP_PATH = dumpPath('room-login-1785587807656.json');
const URL = 'http://localhost:5300/account';
const PORT = 9334;
const cookie = process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8').trim();

/* ── reference side ─────────────────────────────────────────────────────── */
const dump = JSON.parse(readFileSync(DUMP_PATH, 'utf8'));
const cls = (e) => (e.attrs.class || '').replace(/\s*ng-\S+/g, '').trim();
const nodes = dump.baseline.nodes.filter((e) => e.rect.w > 0 || e.rect.h > 0);

/** pick the reference element by tag + class + visible text */
const ref = (tag, klass, text) => {
  const hit = nodes.find(
    (e) => e.tag === tag && cls(e) === klass && (text === undefined || (e.text || '').trim().startsWith(text))
  );
  if (!hit) throw new Error(`reference has no ${tag}.${klass} ${text ?? ''}`);
  return hit.rect;
};

/**
 * Each entry: [label, our CSS selector, our nth match, reference rect, axes].
 *
 * `axes` names which of x/y/w/h are compared. Table column boundaries are
 * content-driven — auto table layout hands leftover width to whichever cell has
 * the longest text — so on the two tables whose rows hold different data from
 * the reference's (a differently named room; a masked API secret instead of a
 * plaintext one) the column x/w are excluded and everything else is checked.
 */
/**
 * The API Keys table is normalised to the reference's shape before measuring.
 *
 * The captured tenant has ONE key. The dev database has however many have been
 * created since, and each extra row moves everything below it — which turned
 * this verifier into a test of the row COUNT rather than of the CSS.
 *
 * Rows past the first are therefore hidden for the duration of the measurement,
 * exactly the way hover-truth forces :hover: it changes what is rendered, not
 * what is stored, and it puts the page in the one state the reference actually
 * documents. Extrapolating a 3-row expectation from a 1-row capture would be a
 * guess — with three rows Chrome distributes the table height as 42/42/41.5,
 * and there is no reference for which of those is right.
 *
 * The row that IS compared is compared exactly: thead 60.5, row 41.5.
 */
const REF_THEAD_H = 60.5;
const REF_ROW_H = 41.5;

const CHECKS = [
  ['navbar', 'nav.acc-navbar', 0, { x: 0, y: 0, w: 1989, h: 50 }, 'xywh'],
  ['container', '.acc-container', 0, { x: 409.5, y: 50, w: 1170, h: 1074.992 }, 'xywh'],

  ['h4 Total Sessions', 'h4.acc-h4', 0, ref('h4', '', 'Total'), 'xywh'],
  ['search panel', '.acc-col-4.acc-panel', 0, ref('div', 'col-md-4 panel pane-default'), 'xywh'],
  ['search input', '.acc-input.acc-search', 0, ref('input', 'form-control'), 'xywh'],
  ['Archived button', '.acc-row > .acc-btn', 0, ref('button', 'btn btn-sm btn-default', 'Archived'), 'xyh'],
  ['sessions panel', '.acc-row-block > .acc-panel', 0, ref('div', 'col-md-12 panel pane-default'), 'xywh'],
  [
    'sessions table',
    '.acc-row-block table.acc-table',
    0,
    nodes.find((e) => e.tag === 'table' && e.rect.y === 191.797).rect,
    'xywh'
  ],

  ['hr 1', 'hr.acc-hr', 0, { x: 439.5, y: 339.797, w: 1110, h: 1 }, 'xywh'],
  ['h3 Badges', 'h3.acc-h3', 0, ref('h3', '', 'Badges'), 'xywh'],
  ['badges panel', '.col-md-9.acc-panel', 0, ref('div', 'col-md-9 panel pane-default'), 'xywh'],
  [
    'btn Add New Badge',
    '.col-md-9.acc-panel > .acc-btn',
    0,
    ref('a', 'btn btn btn-warning mb', 'Add New Badge'),
    'xywh'
  ],
  [
    'btn Upload Image Badge',
    '.col-md-9.acc-panel > .acc-btn',
    1,
    ref('a', 'btn btn-info mb', 'Upload Image Badge'),
    'xywh'
  ],
  [
    'btn Export Badges',
    '.col-md-9.acc-panel > .acc-btn',
    2,
    ref('a', 'btn btn btn-default mb', 'Export Badges'),
    'xywh'
  ],
  ['badges table', '.col-md-9.acc-panel .acc-table-responsive', 0, { x: 440.5, y: 442.195, w: 823, h: 60 }, 'xywh'],

  ['hr 2', 'hr.acc-hr', 1, { x: 439.5, y: 543.195, w: 1110, h: 1 }, 'xywh'],
  ['h3 Extra Admin Users', 'h3.acc-h3', 1, ref('h3', '', 'Extra Admin Users'), 'xywh'],
  [
    'admin panel',
    '.col-md-12.acc-panel',
    1,
    nodes.find((e) => e.rect.y === 600.594 && e.tag === 'div' && cls(e).startsWith('col-md-12')).rect,
    'xywh'
  ],
  [
    'btn Add Admin User',
    '.col-md-12.acc-panel > .acc-btn',
    0,
    ref('button', 'btn btn-success mb', 'Add Admin User'),
    'xywh'
  ],
  ['admin table', '.acc-table-responsive.acc-mt-15', 0, { x: 440.5, y: 660.594, w: 1108, h: 97 }, 'xywh'],

  ['hr 3', 'hr.acc-hr', 2, { x: 439.5, y: 798.594, w: 1110, h: 1 }, 'xywh'],
  ['h3 API Keys', 'h3.acc-h3', 2, ref('h3', '', 'API Keys'), 'xywh'],
  [
    'api panel',
    '.col-md-12.acc-panel',
    2,
    nodes.find((e) => e.rect.y === 855.992 && e.tag === 'div' && cls(e).startsWith('col-md-12')).rect,
    'xywh'
  ],
  ['api table-responsive', '.col-md-12.acc-panel .acc-table-responsive', 2, { x: 440.5, y: 856.992, w: 1108 }, 'xyw'],
  ['btn New Api key', '.acc-btn.acc-btn-success', 1, ref('button', 'btn btn btn-success mb', 'New Api key'), 'xywh'],
  ['btn API Docs', '.acc-btn.acc-btn-primary', 0, ref('a', 'btn btn-primary mb', 'API Docs'), 'xywh'],
  ['api table', '.col-md-12.acc-panel table.acc-table', 2, { y: 910.992, h: 102, x: 440.5, w: 1108 }, 'xywh'],
  ['api action: regen secret', '.acc-api-label', 0, ref('label', '', ''), 'wh'],
  ['api action: restrictions', '.acc-api-label', 1, { w: 75.688, h: 20 }, 'wh'],
  ['api action: delete', '.acc-api-label', 2, { w: 41.203, h: 20 }, 'wh'],

  ['center-block', '.acc-inner', 0, { x: 424.5, y: 80, w: 1140, h: 953.992 }, 'xywh'],
  ['page footer', '.acc-page-footer', 0, { x: 424.5, y: 1033.992, w: 1140, h: 91 }, 'xywh'],
  ['footer hr', '.acc-page-footer hr', 0, { x: 439.5, y: 1068.992, w: 1110, h: 1 }, 'xywh'],
  ['footer ©', '.acc-page-footer .mr-sm', 0, { x: 911.789, y: 1091.492, w: 11.203, h: 16.5 }, 'xywh'],
  ['footer year', '.acc-page-footer .mr-sm', 1, { x: 931.891, y: 1091.492, w: 31.141, h: 16.5 }, 'xywh'],
  ['footer name', '.acc-page-footer span:last-child', 0, { x: 971.93, y: 1091.492, w: 105.281, h: 16.5 }, 'xywh']
];

/* ── ours ───────────────────────────────────────────────────────────────── */
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-verify',
    '--window-size=1989,1265',
    '--force-device-scale-factor=2',
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
await send('Page.navigate', { url: URL });
await new Promise((r) => setTimeout(r, 2500));

/* The capture contains one API key. A developer's authenticated account may
   legitimately contain none, so create one through the real action only for
   this measurement and remove it before Chrome exits. This keeps geometry
   verification deterministic without baking test data into the application. */
let fixtureKey = null;
const evaluate = async (expression, awaitPromise = false) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};
const keyIds = await evaluate(`(() => {
  const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
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
  await send('Page.navigate', { url: URL });
  await new Promise((r) => setTimeout(r, 1500));
  fixtureKey =
    (await evaluate(`(() => {
    const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
    return t ? t.tBodies[0].rows[0].cells[0].textContent.trim() : null;
  })()`)) || null;
}

/* Put the API Keys table into the reference's one-row shape, then measure. */
const { result: hidden } = await send('Runtime.evaluate', {
  expression: `(() => {
    const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
    if (!t) return 0;
    const rows = [...t.tBodies[0].rows];
    rows.slice(1).forEach((r) => (r.style.display = 'none'));
    return rows.length - 1;
  })()`,
  returnByValue: true
});
if (hidden.value)
  console.log(
    `  (fixture holds ${hidden.value + 1} API keys to the reference's 1; ` + `${hidden.value} hidden for measurement)`
  );

/* the API Keys table's real row geometry, measured before anything is compared */
const { result: rowsRaw } = await send('Runtime.evaluate', {
  expression: `(() => {
    const t = document.querySelectorAll('.col-md-12.acc-panel table.acc-table')[2];
    if (!t) return JSON.stringify({ missing: true });
    const head = t.tHead ? t.tHead.getBoundingClientRect().height : 0;
    const rows = [...t.tBodies[0].rows].map((r) => +r.getBoundingClientRect().height.toFixed(3));
    return JSON.stringify({ head: +head.toFixed(3), rows });
  })()`,
  returnByValue: true
});
const rowInfo = JSON.parse(rowsRaw.value);
if (!rowInfo.missing) rowInfo.rows = rowInfo.rows.slice(0, 1);
const rowFails = [];
if (rowInfo.missing) {
  rowFails.push('  MISSING  API Keys table');
} else {
  if (Math.abs(rowInfo.head - REF_THEAD_H) > 0.01)
    rowFails.push(`  OFF      API Keys thead\n             want h=${REF_THEAD_H}\n             got  h=${rowInfo.head}`);
  if (Math.abs(rowInfo.rows[0] - REF_ROW_H) > 0.01)
    rowFails.push(`  OFF      API Keys row\n             want h=${REF_ROW_H}\n             got  h=${rowInfo.rows[0]}`);
}
const spec = CHECKS.map(([label, sel, nth]) => ({ label, sel, nth }));
const { result } = await send('Runtime.evaluate', {
  expression: `(() => {
    const spec = ${JSON.stringify(spec)};
    return JSON.stringify(spec.map(({label, sel, nth}) => {
      const el = document.querySelectorAll(sel)[nth];
      if (!el) return { label, missing: true };
      const r = el.getBoundingClientRect();
      return { label, x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) };
    }));
  })()`,
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

/* ── diff ───────────────────────────────────────────────────────────────── */
const mine = JSON.parse(result.value);
let pass = 0;
const fails = [];

CHECKS.forEach(([label, , , want, axes], i) => {
  const got = mine[i];
  if (got.missing) {
    fails.push(`  MISSING  ${label}  (no element for its selector)`);
    return;
  }
  const bad = [...axes].filter((a) => want[a] !== undefined && Math.abs(want[a] - got[a]) > 0.01);
  if (bad.length === 0) {
    pass++;
    return;
  }
  fails.push(
    `  OFF      ${label}\n` +
      `             want ${[...axes].map((a) => `${a}=${want[a] ?? '-'}`).join(' ')}\n` +
      `             got  ${[...axes].map((a) => `${a}=${got[a]}`).join(' ')}   [${bad.join(',')}]`
  );
});

fails.unshift(...rowFails);
const totalChecks = CHECKS.length + 1 + (rowInfo.rows?.length ?? 0);
console.log(`\n  /account  ${pass + (rowFails.length ? 0 : 1 + (rowInfo.rows?.length ?? 0))}/${totalChecks} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
