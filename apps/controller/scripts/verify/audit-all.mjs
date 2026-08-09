/**
 * Full forensic audit of /account: every element that has a counterpart in the
 * reference, in every interaction state, across the properties that are visible.
 *
 * Same method as hover-truth.mjs — the reference's own stylesheets reloaded in
 * document order so the real cascade decides, with pseudo-states forced by
 * class substitution — but widened from nine buttons to the whole page.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

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
const PORT = 9341;
const cookie = readFileSync('/tmp/cookie1.txt', 'utf8').trim();

const dump = JSON.parse(readFileSync(DUMP_PATH, 'utf8'));
writeFileSync(
  '/tmp/ref-page.html',
  `<!doctype html><html><head><meta charset="utf-8">
${dump.stylesheets
  .map((s) => s.rules || '')
  .filter(Boolean)
  .map((css) => `<style>${css}</style>`)
  .join('\n')}
</head>${dump.rawHtml.replace(/<script[\s\S]*?<\/script>/g, '')}</html>`
);

const FORCE = `
  const PSEUDO = ['hover', 'focus', 'active'];
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const rule of list) {
        if (rule.cssRules && !rule.selectorText) { walk(rule.cssRules); continue; }
        if (!rule.selectorText) continue;
        const parts = rule.selectorText.split(',')
          .filter((sel) => PSEUDO.some((p) => sel.includes(':' + p)))
          .map((sel) => PSEUDO.reduce((acc, p) => acc.split(':' + p).join('.__' + p), sel));
        if (parts.length) out.push(parts.join(',') + '{' + rule.style.cssText + '}');
      }
    };
    walk(rules);
  }
  const el = document.createElement('style');
  el.textContent = out.join('\\n');
  document.head.appendChild(el);
  return out.length;
`;

const PROPS = [
  'background-color',
  'color',
  'opacity',
  'cursor',
  'box-shadow',
  'text-decoration-line',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'border-top-color',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-left-radius',
  'padding-top',
  'padding-left',
  'text-align',
  'vertical-align',
  'text-transform',
  'letter-spacing'
];

/* [label, reference selector, our selector, nth] */
const PAIRS = [
  ['navbar', 'nav.navbar.topnavbar', 'nav.acc-navbar', 0],
  ['panel', 'div.col-md-12.panel', '.acc-row-block > .acc-panel', 0],
  ['h4 total', 'h4', 'h4.acc-h4', 0],
  ['h3 section', 'h3', 'h3.acc-h3', 0],
  ['hr', 'hr', 'hr.acc-hr', 0],
  ['search input', 'input.form-control', '.acc-input.acc-search', 0],

  ['table', 'table.table', '.acc-row-block table.acc-table', 0],
  ['thead th', 'table.table thead th', '.acc-row-block table.acc-table thead th', 0],
  ['th text-center', 'table.table thead th.text-center', '.acc-row-block table.acc-table thead th.acc-th-center', 0],
  ['tbody row 1', 'table.table tbody tr', '.acc-row-block table.acc-table tbody tr', 0],
  ['tbody td', 'table.table tbody td', '.acc-row-block table.acc-table tbody td', 0],
  ['td text-center', 'table.table tbody td.text-center', '.acc-row-block table.acc-table tbody td.acc-td-center', 0],
  ['empty cell', 'td.text-center.text-muted', '.acc-empty-cell', 0],

  ['state chip', 'div.label.label-orange', '.acc-label-orange', 0],
  ['users muted', 'td.text-center div.text-muted', '.acc-td-center .acc-muted', 0],
  ['session id', 'td strong', '.acc-row-block tbody td strong', 0],
  ['sortable th', 'th[ng-click]', '.acc-th-sort', 0],
  ['sort icon', 'div.icon.fa-sort-alpha-asc', '.acc-sort-icon', 0],
  ['clickable Sessions', 'h4 span[ng-click]', '.acc-clickable', 0],

  ['footer block', 'div.p-lg.text-center', '.acc-page-footer', 0],
  ['footer hr', 'div.p-lg.text-center hr', '.acc-page-footer hr', 0],
  ['footer mr-sm', 'div.p-lg.text-center span.mr-sm', '.acc-page-footer .mr-sm', 0],
  ['api label', 'td label', '.acc-api-label', 0]
];

const READ = (pairs, which) => `
  const PROPS = ${JSON.stringify(PROPS)};
  const pairs = ${JSON.stringify(pairs)};
  const read = (el) => Object.fromEntries(PROPS.map((p) => [p, getComputedStyle(el).getPropertyValue(p)]));
  const result = {};
  for (const pair of pairs) {
    const sel = pair[${which}];
    const el = document.querySelectorAll(sel)[pair[3]];
    if (!el) { result[pair[0]] = null; continue; }
    const states = { base: read(el) };
    for (const combo of [['hover'], ['focus'], ['active']]) {
      combo.forEach((p) => el.classList.add('__' + p));
      // a row's highlight is declared on the ROW, so force the ancestors too
      const row = el.closest('tr');
      if (row && row !== el) combo.forEach((p) => row.classList.add('__' + p));
      states[combo.join('+')] = read(el);
      combo.forEach((p) => el.classList.remove('__' + p));
      if (row && row !== el) combo.forEach((p) => row.classList.remove('__' + p));
    }
    result[pair[0]] = states;
  }
  return result;
`;

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-audit',
    '--allow-file-access-from-files',
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

const evalJs = async (expression, awaitPromise = false) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(${awaitPromise ? 'async ' : ''}() => { ${expression} })()`,
    awaitPromise,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};

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

await send('Page.navigate', { url: 'file:///tmp/ref-page.html' });
await new Promise((r) => setTimeout(r, 2500));
await evalJs(FORCE);
const REF = await evalJs(READ(PAIRS, 1));

await send('Page.navigate', { url: 'http://localhost:5300/account' });
await new Promise((r) => setTimeout(r, 2500));
let fixtureKey = null;
const existingKeys = await evalJs(`
  const table = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
  if (!table || !table.tBodies[0]) return [];
  return [...table.tBodies[0].rows]
    .filter((row) => row.cells.length === 3 && !row.cells[0].hasAttribute('colspan'))
    .map((row) => row.cells[0].textContent.trim());
`);
if (existingKeys.length === 0) {
  await evalJs(
    `
    await fetch('/account?/createApiKey', {
      method: 'POST',
      body: new FormData(),
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  `,
    true
  );
  await send('Page.navigate', { url: 'http://localhost:5300/account' });
  await new Promise((r) => setTimeout(r, 1500));
  fixtureKey = await evalJs(`
    const table = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
    return table ? table.tBodies[0].rows[0].cells[0].textContent.trim() : null;
  `);
}
await evalJs(FORCE);
const MINE = await evalJs(READ(PAIRS, 2));

if (fixtureKey) {
  await evalJs(
    `
    const fd = new FormData();
    fd.set('id', ${JSON.stringify(fixtureKey)});
    await fetch('/account?/deleteApiKey', {
      method: 'POST',
      body: fd,
      headers: { 'x-sveltekit-action': 'true' }
    });
    return true;
  `,
    true
  );
}

chrome.kill();

let pass = 0,
  total = 0;
const problems = [],
  missing = [];

for (const [label] of PAIRS) {
  const r = REF[label],
    m = MINE[label];
  if (!r) {
    missing.push(`  ??  ${label}: absent from the reference page (selector needs revisiting)`);
    continue;
  }
  if (!m) {
    missing.push(`  ??  ${label}: absent from our page`);
    continue;
  }
  for (const state of ['base', 'hover', 'focus', 'active']) {
    for (const p of PROPS) {
      total++;
      if (r[state][p] === m[state][p]) pass++;
      else
        problems.push(
          `  OFF ${label.padEnd(20)} :${state.padEnd(6)} ${p.padEnd(24)} want ${String(r[state][p]).padEnd(28)} got ${m[state][p]}`
        );
    }
  }
}

console.log(`\n  full audit  ${pass}/${total} exact\n`);
if (missing.length) console.log(missing.join('\n') + '\n');
if (problems.length) console.log(problems.join('\n') + '\n');
process.exit(problems.length || missing.length ? 1 : 0);
