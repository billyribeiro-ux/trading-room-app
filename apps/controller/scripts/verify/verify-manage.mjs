/**
 * Manage Session, ours against the reference.
 *
 * The reference side is /tmp/ref-manage-rects.json — `evidence-dumps/login-page/manage`
 * rendered against the controller's captured stylesheets at 1989x1265 @dpr2.
 * Regenerate it with /tmp/ref-manage-rects.mjs.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9362;
const cookie = (process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8')).trim();
const roomId = (process.env.ROOM ?? readFileSync('/tmp/roomid.txt', 'utf8')).trim();
/**
 * The REAL capture, taken off protradingroom.com by scripts/capture-gaps.js and
 * decoded into evidence-dumps/NEXT-STEP/gaps — not the rebuilt render that stood in for it
 * before. The two agree to within 0.08px, which is what validated the rebuild,
 * but real evidence beats a reconstruction so this is what we now measure to.
 */
const REF_FILE = process.env.REF ?? 'evidence-dumps/NEXT-STEP/gaps/rects-baseline.json';
const ref = JSON.parse(readFileSync(REF_FILE, 'utf8'));

/** [label, reference matcher, our selector, nth, axes] */
const pick = (fn, what = '') => {
  const hit = ref.find(fn);
  if (!hit) throw new Error(`reference element not found: ${what || fn.toString().slice(0, 90)}`);
  return hit.rect;
};
const byClass = (c) => (e) => e.cls === c;
const CHECKS = [
  ['navbar', pick(byClass('navbar topnavbar')), 'nav.acc-navbar', 0, 'xywh'],
  ['panel', pick(byClass('panel panel-default')), '.mg-root .panel.panel-default', 0, 'xyw'],
  ['panel-heading', pick(byClass('panel-heading')), '.mg-root .panel-heading', 0, 'xywh'],
  ['panel-title', pick(byClass('panel-title')), '.mg-root .panel-title', 0, 'xyw'],
  [
    'title text',
    pick((e) => e.tag === 'span' && (e.text || '').startsWith('Manage Room id')),
    '.mg-root .panel-title > span',
    0,
    'xy'
  ],
  ['count', pick(byClass('text-muted')), '.mg-root .panel-title .text-muted', 0, 'y'],
  ['Reset Counts', pick(byClass('btn btn-link btn-warning')), '.mg-root .btn-link', 0, 'y'],
  ['Launch', pick(byClass('btn btn-sm pull-right btn-info mr')), '.mg-root .btn-info.pull-right', 0, 'ywh'],
  ['panel-body', pick(byClass('panel-body')), '.mg-root .panel-body', 0, 'xyw'],
  ['form-vertical', pick(byClass('form-vertical')), '.mg-root .form-vertical', 0, 'xyw'],
  [
    'Room Title label',
    pick((e) => e.tag === 'label' && (e.text || '').startsWith('Room Title')),
    'label|Room Title',
    0,
    'xywh'
  ],
  [
    'Auth Mode label',
    pick((e) => e.tag === 'label' && (e.text || '').startsWith('Authorization Mode')),
    'label|Authorization Mode',
    0,
    'xywh'
  ],
  ['Room Title col', pick(byClass('col-sm-10')), '.mg-root .col-sm-10', 0, 'xyw'],
  ['Room Title static', pick(byClass('form-control-static')), '.mg-root .form-control-static', 0, 'xyw'],
  [
    'Room Link label',
    pick((e) => e.tag === 'label' && (e.text || '').startsWith('Room Link')),
    'label|Room Link',
    0,
    'xyw'
  ],
  [
    'Vanity Link label',
    pick((e) => e.tag === 'label' && (e.text || '').startsWith('Vanity Link')),
    'label|Vanity Link',
    0,
    'xy'
  ],
  [
    'Unique Link label',
    pick((e) => e.tag === 'label' && (e.text || '').startsWith('Unique Link')),
    'label|Unique Link',
    0,
    'xy'
  ],
  [
    'Room Link group',
    pick(byClass('input-group')), // by id: the Registration Link block now precedes this one in the DOM and is
    // hidden, so an ordinal would pick that instead. The reference rects only list
    // visible elements, so its ordinal means something different.
    '.mg-root .input-group:has(#webinarLinkTxt)',
    0,
    'xyw'
  ],
  ['Room Link input', pick((e) => e.tag === 'input' && /col-md-6/.test(e.cls || '')), '#webinarLinkTxt', 0, 'xyh'],
  ['nav-tabs', pick(byClass('nav nav-tabs')), '.mg-root .nav-tabs', 0, 'xywh'],
  ['tab Users', pick((e) => e.tag === 'a' && e.text === 'Users'), '.mg-root .nav-tabs a', 0, 'ywh'],
  ['tab-content', pick(byClass('tab-content')), '.mg-root .tab-content', 0, 'xyw'],
  ['tab-pane', pick(byClass('tab-pane active')), '.mg-root .tab-pane.active', 0, 'xyw'],
  ['users table', pick(byClass('table table-striped')), '.mg-root table.table', 0, 'xw'],
  ['search label', pick((e) => e.tag === 'label' && e.text === 'Search Users'), 'label|Search Users', 0, 'x'],
  ['panel-footer', pick(byClass('panel-footer text-center')), '.mg-root .panel-footer', 0, 'xwh']
];

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-vmanage',
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
/* The reference was captured with no classic scrollbar — its tab-content spans
   the full 1989 viewport. Headless Chrome draws a 15px one the moment the page
   overflows, which narrows every percentage box by a fraction; that is where the
   toolbar's 0.016px came from. */
await send('Emulation.setScrollbarsHidden', { hidden: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: `http://localhost:5300/account/rooms/${roomId}` });
await new Promise((r) => setTimeout(r, 3000));

const spec = CHECKS.map(([label, , sel, nth]) => ({ label, sel, nth }));
const { result } = await send('Runtime.evaluate', {
  expression: `JSON.stringify(${JSON.stringify(spec)}.map(({label,sel,nth}) => {
    let el;
    if (sel.includes('|')) {
      const [tag, text] = sel.split('|');
      el = [...document.querySelectorAll('.mg-root ' + tag)].filter(
        (n) => n.textContent.replace(/\\s+/g, ' ').trim().startsWith(text)
      )[nth];
    } else {
      el = document.querySelectorAll(sel)[nth];
    }
    if (!el) return { label, missing: true };
    const r = el.getBoundingClientRect();
    return { label, x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) };
  }))`,
  returnByValue: true
});
chrome.kill();

const mine = JSON.parse(result.value);
let pass = 0;
const fails = [];
CHECKS.forEach(([label, want, , , axes], i) => {
  const got = mine[i];
  if (got.missing) {
    fails.push(`  MISSING  ${label}`);
    return;
  }
  const bad = [...axes].filter((a) => Math.abs(want[a] - got[a]) > 0.01);
  if (!bad.length) {
    pass++;
    return;
  }
  fails.push(
    `  OFF      ${label}\n             want ${[...axes].map((a) => `${a}=${want[a]}`).join(' ')}\n             got  ${[...axes].map((a) => `${a}=${got[a]}`).join(' ')}   [${bad.join(',')}]`
  );
});
console.log(`\n  /account/rooms/[id]  ${pass}/${CHECKS.length} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
