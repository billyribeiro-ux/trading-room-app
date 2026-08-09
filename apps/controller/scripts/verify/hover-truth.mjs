/**
 * Ground truth for every button interaction state.
 *
 * Reading hover rules out of `bootstrap.min.css` by eye is not evidence: the
 * controller also loads `styles.css`, which overrides button colours (its
 * `.btn-default` border is rgb(230,233,238), not Bootstrap's #ccc). Only the
 * cascade of ALL its stylesheets, in document order, gives the real answer.
 *
 * So: rebuild the reference page from the capture — every stylesheet's text in
 * order, plus its rawHtml — load it in Chrome, and read the computed style of
 * each button with its pseudo-states forced. Then do exactly the same to our
 * page and diff.
 *
 * Pseudo-states are forced by duplicating every rule that mentions `:hover`
 * (etc.) with the pseudo swapped for a class of the same name. A pseudo-class
 * and a class have identical specificity, so the cascade is preserved exactly —
 * which a CDP `forcePseudoState` call would also do, but this works identically
 * on both pages with one piece of code.
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
const PORT = 9340;
const cookie = readFileSync('/tmp/cookie1.txt', 'utf8').trim();

/* ── rebuild the reference page from the capture ─────────────────────────── */
const dump = JSON.parse(readFileSync(DUMP_PATH, 'utf8'));
const sheets = dump.stylesheets.map((s) => s.rules || '').filter(Boolean);
writeFileSync(
  '/tmp/ref-page.html',
  `<!doctype html><html><head><meta charset="utf-8">
${sheets.map((css) => `<style>${css}</style>`).join('\n')}
</head>${dump.rawHtml.replace(/<script[\s\S]*?<\/script>/g, '')}</html>`
);

/* the in-page state-forcing shim, used identically on both pages */
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
        // Replace EVERY pseudo in a selector at once, so combined rules such as
        // \`.btn-default:active:hover\` (which is a different, darker rule from
        // \`:hover\` alone) are representable. Replacing one at a time silently
        // dropped them and made :active look like :hover.
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
  'border-top-color',
  'color',
  'box-shadow',
  'opacity',
  'text-decoration-line',
  'cursor'
];

const READ = (targets) => `
  const PROPS = ${JSON.stringify(PROPS)};
  const targets = ${JSON.stringify(targets)};
  const read = (el) => Object.fromEntries(PROPS.map((p) => [p, getComputedStyle(el).getPropertyValue(p)]));
  const result = {};
  for (const { key, sel, nth } of targets) {
    const el = document.querySelectorAll(sel)[nth ?? 0];
    if (!el) { result[key] = null; continue; }
    const states = { base: read(el) };
    for (const combo of [['hover'], ['focus'], ['active'], ['active', 'hover']]) {
      combo.forEach((p) => el.classList.add('__' + p));
      states[combo.join('+')] = read(el);
      combo.forEach((p) => el.classList.remove('__' + p));
    }
    result[key] = states;
  }
  return result;
`;

/* ── drive Chrome ───────────────────────────────────────────────────────── */
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-hover',
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

const load = async (url, wait = 2500) => {
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, wait));
};

/* the same nine controls, named on each side */
const REF_TARGETS = [
  { key: 'default (sm)', sel: 'button.btn.btn-sm.btn-default' },
  { key: 'info (sm)', sel: 'a.btn.btn-sm.btn-info' },
  { key: 'inverse (sm)', sel: 'a.btn.btn-sm.btn-inverse' },
  { key: 'warning', sel: 'a.btn.btn-warning.mb' },
  { key: 'info', sel: 'a.btn.btn-info.mb' },
  { key: 'default', sel: 'a.btn.btn-default.mb' },
  { key: 'success', sel: 'button.btn.btn-success.mb' },
  { key: 'primary', sel: 'a.btn.btn-primary.mb' },
  { key: 'action link', sel: 'td label a' }
];

const MINE_TARGETS = [
  { key: 'default (sm)', sel: '.acc-btn.acc-btn-sm.acc-btn-default' },
  { key: 'info (sm)', sel: '.acc-btn.acc-btn-sm.acc-btn-info' },
  { key: 'inverse (sm)', sel: '.acc-btn.acc-btn-sm.acc-btn-inverse' },
  { key: 'warning', sel: '.acc-btn.acc-btn-warning' },
  { key: 'info', sel: '.acc-btn.acc-btn-info:not(.acc-btn-sm)' },
  { key: 'default', sel: '.acc-btn.acc-btn-default:not(.acc-btn-sm)' },
  { key: 'success', sel: '.acc-btn.acc-btn-success' },
  { key: 'primary', sel: '.acc-btn.acc-btn-primary' },
  { key: 'action link', sel: '.acc-link' }
];

await load(`file:///tmp/ref-page.html`);
const refShim = await evalJs(FORCE);
const REF = await evalJs(READ(REF_TARGETS));

await load('http://localhost:5300/account');
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
  await load('http://localhost:5300/account', 1500);
  fixtureKey = await evalJs(`
    const table = [...document.querySelectorAll('.acc-table-responsive table.acc-table')].pop();
    return table ? table.tBodies[0].rows[0].cells[0].textContent.trim() : null;
  `);
}
const mineShim = await evalJs(FORCE);
const MINE = await evalJs(READ(MINE_TARGETS));

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

/* ── diff ───────────────────────────────────────────────────────────────── */
console.log(`\n  forced rules: reference ${refShim}, ours ${mineShim}\n`);

let pass = 0;
let total = 0;
const problems = [];

for (const { key } of REF_TARGETS) {
  const r = REF[key];
  const m = MINE[key];
  if (!r) {
    problems.push(`  ??  ${key}: not found in the reference page`);
    continue;
  }
  if (!m) {
    problems.push(`  ??  ${key}: not found on our page`);
    continue;
  }
  for (const state of ['base', 'hover', 'focus', 'active', 'active+hover']) {
    for (const p of PROPS) {
      total++;
      const want = r[state][p];
      const got = m[state][p];
      if (want === got) {
        pass++;
      } else {
        problems.push(`  OFF ${key.padEnd(14)} :${state.padEnd(6)} ${p.padEnd(20)} want ${want}   got ${got}`);
      }
    }
  }
}

if (process.env.TABLE) {
  console.log('  REFERENCE TRUTH TABLE');
  for (const { key } of REF_TARGETS) {
    const r = REF[key];
    if (!r) continue;
    console.log('\n  ' + key);
    for (const state of ['base', 'hover', 'focus', 'active', 'active+hover']) {
      const s = r[state];
      console.log(
        `    ${state.padEnd(13)} bg=${s['background-color'].padEnd(22)} bd=${s['border-top-color'].padEnd(22)} fg=${s.color.padEnd(20)} shadow=${s['box-shadow'] === 'none' ? 'none' : 'lift'}  td=${s['text-decoration-line']}`
      );
    }
  }
  console.log();
}
console.log(`  button states  ${pass}/${total} exact\n`);
if (problems.length) console.log(problems.join('\n') + '\n');
process.exit(problems.length ? 1 : 0);
