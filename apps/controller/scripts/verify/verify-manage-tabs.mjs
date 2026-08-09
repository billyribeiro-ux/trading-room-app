/**
 * Every Manage tab, ours against the real capture.
 *
 * The reference side is evidence-dumps/NEXT-STEP/gaps/rects-tab_*.json — the panes revealed one
 * at a time by scripts/capture-gaps.js on protradingroom.com. Our side is the
 * same tab reached by `?tab=`.
 *
 * Content-driven widths are excluded per check: their room is 3627 with its own
 * names and data, so a column sized by its longest cell legitimately differs.
 * Structure, position and the fixed boxes are all compared.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9366;
const cookie = (process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8')).trim();
const roomId = (process.env.ROOM ?? readFileSync('/tmp/roomid.txt', 'utf8')).trim();

const load = (f) => JSON.parse(readFileSync(`evidence-dumps/NEXT-STEP/gaps/rects-${f}.json`, 'utf8'));
const find = (ref, fn, what) => {
  const hit = ref.find(fn);
  if (!hit) throw new Error(`not in the capture: ${what}`);
  return hit.rect;
};
const cls = (c) => (e) => (e.cls || '') === c;
const txt = (t) => (e) => (e.text || '').startsWith(t);

/* tab id on our side -> capture file, plus the checks for that tab */
const TABS = [
  {
    id: 'text-list',
    file: 'tab_Text_List',
    checks: (r) => [
      ['pane', find(r, cls('tab-pane active'), 'pane'), '.mg-root .tab-pane.active', 0, 'xw'],
      ['Save List', find(r, txt('Save List'), 'Save List'), 'button|Save List', 0, 'wh'],
      ['textarea', find(r, (e) => e.tag === 'textarea', 'textarea'), '#textListTxt', 0, 'xwh']
    ]
  },
  {
    id: 'branding',
    file: 'tab_Branding_Logo_Landing_Page_',
    checks: (r) => [
      ['Logo label', find(r, txt('Logo'), 'Logo label'), 'label|Logo', 0, 'xywh'],
      ['toolbar', find(r, cls('ta-toolbar btn-toolbar'), 'toolbar'), '.mg-root .ta-toolbar', 0, 'xwh'],
      [
        'group 1',
        find(r, (e) => e.cls === 'btn-group' && e.rect.x === 52, 'group 1'),
        '.mg-root .ta-toolbar .btn-group',
        0,
        'xwh'
      ],
      [
        'group 2',
        find(r, (e) => e.cls === 'btn-group' && Math.abs(e.rect.x - 364.625) < 1, 'group 2'),
        '.mg-root .ta-toolbar .btn-group',
        1,
        'wh'
      ],
      [
        'group 3',
        find(r, (e) => e.cls === 'btn-group' && Math.abs(e.rect.x - 645.281) < 1, 'group 3'),
        '.mg-root .ta-toolbar .btn-group',
        2,
        'wh'
      ],
      ['H1 button', find(r, txt('H1'), 'H1'), 'button|H1', 0, 'xywh'],
      ['P button', find(r, (e) => e.text === 'P', 'P'), 'button|P', 0, 'wh'],
      ['pre button', find(r, (e) => e.text === 'pre', 'pre'), 'button|pre', 0, 'wh'],
      ['Words counter', find(r, txt('Words:'), 'Words'), '#toolbarWC', 0, 'wh'],
      ['Chars counter', find(r, txt('Characters:'), 'Characters'), '#toolbarCC', 0, 'wh'],
      ['editor body', find(r, (e) => /ta-scroll-window/.test(e.cls || ''), 'editor'), '.mg-root .ta-editor', 0, 'xwh']
    ]
  },
  {
    id: 'sso',
    file: 'tab_SSO_Setup',
    checks: (r) => [
      ['pane', find(r, cls('tab-pane active'), 'pane'), '.mg-root .tab-pane.active', 0, 'xywh'],
      ['SSO Host label', find(r, txt('SSO Host'), 'label'), 'label|SSO Host', 0, 'xyw'],
      [
        'col-sm-8',
        find(r, cls('col-sm-8'), 'col-sm-8'), // scoped to the pane: the Email Preview column is also a .col-sm-8 and sits
        // earlier in the DOM, hidden behind the registration auth modes
        '.mg-root .tab-pane.active .col-sm-8',
        0,
        'xyw'
      ],
      // scoped to the pane: the page's FIRST .form-control-static is the Room
      // Title row up in the header, not this tab's
      [
        'static',
        find(r, (e) => e.cls === 'form-control-static' && e.rect.y > 350, 'static'),
        '.mg-root .tab-pane.active .col-sm-8 .form-control-static',
        0,
        'xyw'
      ]
    ]
  },
  {
    id: 'stats',
    file: 'tab_User_Stats',
    checks: (r) => [
      ['pane', find(r, cls('tab-pane active'), 'pane'), '.mg-root .tab-pane.active', 0, 'xw'],
      ['col-sm-4 pull-left', find(r, cls('col-sm-4 pull-left'), 'left col'), '.mg-root .col-sm-4.pull-left', 0, 'xyw'],
      ['Start Date label', find(r, txt('Start Date'), 'start'), 'label|Start Date', 0, 'xyw'],
      ['End Date label', find(r, txt('End Date'), 'end'), 'label|End Date', 0, 'xy'],
      ['Load Stats', find(r, txt('Load Stats'), 'load'), 'button|Load Stats', 0, 'xy'],
      ['Search Users label', find(r, txt('Search Users'), 'search'), 'label|Search Users', 0, 'xyw'],
      ['search col', find(r, cls('col-sm-4'), 'search col'), '.mg-root div.col-sm-4:not(.pull-left)', 0, 'xyw']
    ]
  }
];

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-vtabs',
    /* The dump was taken at dsf=2. Chrome snaps layout to 1/64 of a CSS pixel, and
     that grid is not the same at dsf=1 — without these two flags the editor
     toolbar measured 307.641 against the reference's 307.625, a single 64th,
     with nothing wrong in the CSS at all. setDeviceMetricsOverride alone does
     not fix it; the process has to start at the same scale. */
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
const [n, v] = cookie.split('=');
await send('Network.setCookie', { name: n, value: v, domain: 'localhost', path: '/' });
await send('Page.enable');
/* The reference was captured with no classic scrollbar — its tab-content spans
   the full 1989 viewport. Headless Chrome draws a 15px one the moment the page
   overflows, which narrows every percentage box by a fraction; that is where the
   toolbar's 0.016px came from. */
await send('Emulation.setScrollbarsHidden', { hidden: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });

let pass = 0,
  total = 0;
const fails = [];

for (const tab of TABS) {
  const checks = tab.checks(load(tab.file));
  await send('Page.navigate', { url: `http://localhost:5300/account/rooms/${roomId}?tab=${tab.id}` });
  await new Promise((r) => setTimeout(r, 2600));

  const spec = checks.map(([label, , sel, nth]) => ({ label, sel, nth }));
  const { result } = await send('Runtime.evaluate', {
    expression: `JSON.stringify(${JSON.stringify(spec)}.map(({label,sel,nth}) => {
      let el;
      if (sel.includes('|')) {
        const [tag, text] = sel.split('|');
        el = [...document.querySelectorAll('.mg-root ' + tag)]
          .filter((n) => n.textContent.replace(/\\s+/g,' ').trim().startsWith(text))[nth];
      } else { el = document.querySelectorAll(sel)[nth]; }
      if (!el) return { label, missing: true };
      const r = el.getBoundingClientRect();
      return { label, x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) };
    }))`,
    returnByValue: true
  });
  const mine = JSON.parse(result.value);

  checks.forEach(([label, want, , , axes], i) => {
    const got = mine[i];
    total++;
    if (got.missing) {
      fails.push(`  MISSING  ${tab.id}: ${label}`);
      return;
    }
    const bad = [...axes].filter((a) => Math.abs(want[a] - got[a]) > 0.01);
    if (!bad.length) {
      pass++;
      return;
    }
    fails.push(
      `  OFF      ${tab.id}: ${label}\n             want ${[...axes].map((a) => `${a}=${want[a]}`).join(' ')}\n             got  ${[...axes].map((a) => `${a}=${got[a]}`).join(' ')}   [${bad.join(',')}]`
    );
  });
}
chrome.kill();

console.log(`\n  manage tabs  ${pass}/${total} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
