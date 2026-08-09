/**
 * The "Actions With Selected" dropdown, against the capture taken with it open.
 *
 * Evidence: ~/Downloads/new-dumps/…-part13-dropdown_1_Actions_With_Selected.json
 * — the reference page with that menu open, every node carrying a real rect. The
 * expected numbers are read out of that file at run time; none is typed here, so
 * a re-capture changes the target automatically and a typo cannot invent a
 * passing value.
 *
 * The whole open menu is compared: the toggle pair, the caret, the <ul>, all ten
 * <li>, the element inside each one, and every <i> glyph — because the icon
 * advance widths are baked into FontAwesome and a wrong icon set shows up there
 * and nowhere else.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9394;
const cookie = (process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8')).trim();
const roomId = (process.env.ROOM ?? readFileSync('/tmp/roomid.txt', 'utf8')).trim();

const DUMP_DIR = process.env.HOME + '/Downloads/new-dumps';
const capture = readdirSync(DUMP_DIR)
  .filter((f) => f.includes('dropdown_1_Actions_With_Selected'))
  .sort()
  .pop();
if (!capture) throw new Error(`no dropdown_1_Actions_With_Selected capture in ${DUMP_DIR}`);

/* ── reference ──────────────────────────────────────────────────────────── */
const flatten = (o, out = []) => {
  if (!o || typeof o !== 'object') return out;
  if (Array.isArray(o)) return (o.forEach((x) => flatten(x, out)), out);
  if (o.tag && o.rect) out.push(o);
  for (const k in o) flatten(o[k], out);
  return out;
};
const all = flatten(JSON.parse(readFileSync(`${DUMP_DIR}/${capture}`, 'utf8'))).filter(
  (n) => n.rect.w > 0 || n.rect.h > 0
);
const cls = (n) =>
  (n.attrs.class || '')
    .replace(/\s*ng-\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const refWrap = all.find((n) => cls(n) === 'users-many-actions');
const refSpan = all.find((n) => cls(n) === 'dropdown open');
const refToggles = all.filter(
  (n) => n.tag === 'button' && cls(n) === 'btn dropdown-toggle btn-primary' && n.rect.x < 600
);
const refCaret = all.find((n) => cls(n) === 'caret' && n.rect.x < 600);
const refUl = all.find((n) => n.tag === 'ul' && cls(n) === 'dropdown-menu' && n.rect.w > 0);
const refLis = all.filter((n) => n.tag === 'li' && n.rect.x === refUl.rect.x + 1).sort((a, b) => a.rect.y - b.rect.y);
const refAnchors = all
  .filter((n) => n.tag === 'a' && n.rect.x === refUl.rect.x + 1)
  .sort((a, b) => a.rect.y - b.rect.y);
const refIcons = all
  .filter((n) => n.tag === 'i' && n.rect.x >= refUl.rect.x && n.rect.x < refUl.rect.x + refUl.rect.w)
  .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

/** [label, our selector, reference rect, axes] */
const CHECKS = [
  ['wrapper', '.mg-root .users-many-actions', refWrap.rect, 'xywh'],
  ['span.dropdown', '.mg-root .users-many-actions .dropdown', refSpan.rect, 'xywh'],
  [
    'toggle "Actions With Selected"',
    '.mg-root .users-many-actions .dropdown > button:nth-of-type(1)',
    refToggles[0].rect,
    'xywh'
  ],
  [
    'toggle "…Email List"',
    '.mg-root .users-many-actions .dropdown > button:nth-of-type(2)',
    refToggles[1].rect,
    'xywh'
  ],
  ['caret', '.mg-root .users-many-actions .dropdown .caret', refCaret.rect, 'xywh'],
  ['ul.dropdown-menu', '.mg-root .users-many-actions .dropdown-menu', refUl.rect, 'xywh']
];
refLis.forEach((li, i) => {
  const text = (refAnchors[i].text || '').replace(/\s+/g, ' ').trim();
  CHECKS.push([
    `li[${i}] ${text}`,
    `.mg-root .users-many-actions .dropdown-menu > li:nth-child(${i + 1})`,
    li.rect,
    'xywh'
  ]);
  CHECKS.push([
    `item[${i}] ${text}`,
    `.mg-root .users-many-actions .dropdown-menu > li:nth-child(${i + 1}) :is(a,button)`,
    refAnchors[i].rect,
    'xywh'
  ]);
});
refIcons.forEach((ic, i) => {
  CHECKS.push([`icon[${i}] ${cls(ic)}`, `.mg-root .users-many-actions .dropdown-menu i`, ic.rect, 'xywh', i]);
});

/* ── ours ───────────────────────────────────────────────────────────────── */
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-vbulk',
    '--window-size=1989,1265',
    '--force-device-scale-factor=2',
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
  throw new Error('chrome did not come up');
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
await send('Page.navigate', { url: `http://localhost:5300/account/rooms/${roomId}?tab=users` });
await new Promise((r) => setTimeout(r, 3000));
await send('Runtime.evaluate', {
  expression: `[...document.querySelectorAll('.users-many-actions .dropdown button')]
     .find((b) => b.textContent.includes('Actions With Selected')).click()`
});
await new Promise((r) => setTimeout(r, 400));

const spec = CHECKS.map(([label, sel, , , nth]) => ({ label, sel, nth: nth ?? 0 }));
const { result } = await send('Runtime.evaluate', {
  expression: `JSON.stringify(${JSON.stringify(spec)}.map(({sel,nth}) => {
    const el = document.querySelectorAll(sel)[nth];
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    return { x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) };
  }))`,
  returnByValue: true
});
chrome.kill();

/* ── diff ───────────────────────────────────────────────────────────────── */
const mine = JSON.parse(result.value);
let pass = 0;
const fails = [];
CHECKS.forEach(([label, sel, want, axes], i) => {
  const got = mine[i];
  if (got.missing) {
    fails.push(`  MISSING  ${label}  [${sel}]`);
    return;
  }
  const bad = [...axes].filter((a) => Math.abs(want[a] - got[a]) > 0.01);
  if (!bad.length) {
    pass++;
    return;
  }
  fails.push(
    `  OFF      ${label}\n` +
      `             want ${[...axes].map((a) => `${a}=${want[a]}`).join(' ')}\n` +
      `             got  ${[...axes].map((a) => `${a}=${got[a]}`).join(' ')}   [${bad.join(',')}]`
  );
});
console.log(`\n  Actions With Selected menu  ${pass}/${CHECKS.length} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
