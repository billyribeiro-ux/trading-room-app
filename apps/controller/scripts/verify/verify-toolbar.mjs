/**
 * The rich text editor's toolbar, control by control.
 *
 * Evidence: ~/Downloads/new-dumps/…-part7-tab_Branding_Logo_Landing_Page_.json,
 * the reference with that tab open. Every button and every icon carries a real
 * rect, so this compares each one rather than the group totals — a group that is
 * 0.047px wide says nothing about WHICH of its nine buttons is wrong, and the
 * per-control numbers say exactly.
 *
 * Buttons are matched left-to-right within each group, which is well defined:
 * `.btn-group > .btn` floats left in source order and every control is present.
 */
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9406;
const cookie = (process.env.COOKIE ?? readFileSync('/tmp/cookie1.txt', 'utf8')).trim();
const roomId = (process.env.ROOM ?? readFileSync('/tmp/roomid.txt', 'utf8')).trim();

const DUMP_DIR = process.env.HOME + '/Downloads/new-dumps';
const capture = readdirSync(DUMP_DIR)
  .filter((f) => /part7-tab_Branding/.test(f))
  .sort()
  .pop();
if (!capture) throw new Error(`no Branding tab capture in ${DUMP_DIR}`);

const flat = (o, out = []) => {
  if (!o || typeof o !== 'object') return out;
  if (Array.isArray(o)) return (o.forEach((x) => flat(x, out)), out);
  if (o.tag && o.rect) out.push(o);
  for (const k in o) flat(o[k], out);
  return out;
};
const cls = (n) =>
  (n.attrs.class || '')
    .replace(/\s*ng-\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const all = flat(JSON.parse(readFileSync(`${DUMP_DIR}/${capture}`, 'utf8'))).filter(
  (n) => n.rect.w > 0 || n.rect.h > 0
);

/*
 * Buttons are found by the `ta-button` attribute and grouped by their DOM path,
 * NOT by class or by geometry. Both shortcuts are traps: `justifyCenter` carries
 * `btn btn-default active` when the editor's caret is in centred text, so a
 * `class === 'btn btn-default'` filter silently drops it and every button after
 * it lines up against the wrong reference, and a geometric group test inherits
 * whatever the group's own rect happens to be.
 */
const groupOf = (n) => {
  const m = /div\.btn-group:nth-of-type\((\d+)\)/.exec(n.path || '');
  return m ? Number(m[1]) - 1 : -1;
};
const refButtons = all
  .filter((n) => n.tag === 'button' && n.attrs['ta-button'])
  .map((b) => {
    const icon = all.find(
      (n) =>
        n.tag === 'i' &&
        n.rect.x > b.rect.x &&
        n.rect.x < b.rect.x + b.rect.w &&
        Math.abs(n.rect.y - b.rect.y) < b.rect.h
    );
    return {
      gi: groupOf(b),
      label: b.attrs.name || (b.text || '').trim() || '?',
      rect: b.rect,
      icon: icon ? { cls: cls(icon), rect: icon.rect } : null
    };
  })
  .sort((a, b) => a.gi - b.gi || a.rect.x - b.rect.x);
const groups = all
  .filter((n) => cls(n) === 'btn-group' && /ta-toolbar|btn-group-small/.test(n.path || ''))
  .sort((a, b) => a.rect.x - b.rect.x);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-vtb',
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
await send('Emulation.setScrollbarsHidden', { hidden: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });
/*
  THE TAB IS A PATH SEGMENT. `?tab=branding` STOPPED SELECTING ANYTHING.

  The room detail route moved to `rooms/[id]/[[tab]]/`, and its loader reads `params.tab ?? 'users'`
  with no query fallback anywhere in `src` — the reasoning is written out at
  `src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts:178-192`, and an unknown segment now
  404s rather than falling back. So the old URL still resolved, and landed on USERS: the Branding
  tab never rendered, `.mg-root .ta-toolbar .btn-group` matched nothing, and every group and every
  button was reported MISSING against a toolbar that is built and correct.

  This is the third time in this app a route migration left a verifier addressing the old shape —
  `verify-account-contract.mjs:44-48` records the same `[[tab]]` move breaking its read, and
  `verify-home-contract.mjs:168-174` records `ff948db` doing it to the `asset()` call shapes. Both
  notes say the same thing this one does: the assertion failed against correct code, which is the
  worst kind of failure because it sends the next reader to fix something that is not broken.

  The sibling forensic scripts under this directory still carry `?tab=` and are NOT fixed here:
  `verify-manage-tabs.mjs:178` iterates every tab id through the query form and is broken the same
  way; `verify-behaviour.mjs:474` and `verify-bulk-menu.mjs:152` ask for `?tab=users`, which is the
  default the loader falls back to, so those two still land where they meant to and are stale rather
  than wrong.

  NOT EXECUTED HERE. This script needs macOS Chrome at the hard-coded path, a dev server on :5300, a
  session cookie at /tmp/cookie1.txt and the owner-local Branding capture under ~/Downloads/new-dumps
  — none of which exist in the environment this correction was made in. The route shape is read from
  the loader rather than assumed, but the run itself is unverified and is owed one.
*/
await send('Page.navigate', { url: `http://localhost:5300/account/rooms/${roomId}/branding` });
await new Promise((r) => setTimeout(r, 3000));

const { result } = await send('Runtime.evaluate', {
  expression: `JSON.stringify((() => {
    const groups = [...document.querySelectorAll('.mg-root .ta-toolbar .btn-group')];
    const R = (e) => { const r = e.getBoundingClientRect();
      return { x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3) }; };
    return {
      groups: groups.map(R),
      buttons: groups.flatMap((g, gi) => [...g.querySelectorAll(':scope > button')].map((b) => {
        const i = b.querySelector('i');
        return { gi, label: b.getAttribute('name') || b.textContent.replace(/\\s+/g,' ').trim() || '?',
                 rect: R(b), icon: i ? { cls: i.getAttribute('class'), rect: R(i) } : null };
      }))
    };
  })())`,
  returnByValue: true
});
chrome.kill();

const mine = JSON.parse(result.value);
let pass = 0;
const fails = [];
const cmp = (label, want, got, axes = 'wh') => {
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
};

groups.forEach((g, i) => {
  if (!mine.groups[i]) {
    fails.push(`  MISSING  btn-group ${i}`);
    return;
  }
  cmp(`btn-group ${i}`, g.rect, mine.groups[i], 'wh');
});
refButtons.forEach((b, i) => {
  const got = mine.buttons[i];
  if (!got) {
    fails.push(`  MISSING  button ${i} "${b.label}"`);
    return;
  }
  cmp(`g${b.gi} "${b.label}"`, b.rect, got.rect, 'wh');
  if (b.icon) {
    if (!got.icon) {
      fails.push(`  MISSING  icon for "${b.label}" (want ${b.icon.cls})`);
      return;
    }
    cmp(`g${b.gi} "${b.label}" icon ${b.icon.cls}`, b.icon.rect, got.icon.rect, 'wh');
  }
});
if (refButtons.length !== mine.buttons.length)
  fails.push(`  COUNT    reference has ${refButtons.length} toolbar buttons, ours ${mine.buttons.length}`);

const total = pass + fails.length;
console.log(`\n  editor toolbar, per control  ${pass}/${total} exact\n`);
if (fails.length) console.log(fails.join('\n') + '\n');
process.exit(fails.length ? 1 : 0);
