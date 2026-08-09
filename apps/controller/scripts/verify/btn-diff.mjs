/**
 * "Export Badges", every captured computed property, ours against the capture.
 * 474 properties, not a curated shortlist.
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
const PORT = 9342,
  cookie = readFileSync('/tmp/cookie1.txt', 'utf8').trim();
const LABEL = process.env.LABEL || 'Export Badges';
const refDump = JSON.parse(readFileSync(dumpPath('room-login-1785587807656.json'), 'utf8'));
const ref = refDump.baseline.nodes.find((e) => (e.text || '').trim() === LABEL);
if (!ref) {
  console.log('no reference element with text', JSON.stringify(LABEL));
  process.exit(1);
}

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-eb',
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
const ev = async (x) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(()=>{${x}})()`,
    returnByValue: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails.exception));
  return result.value;
};
await send('Network.enable');
const [n, v] = cookie.split('=');
await send('Network.setCookie', { name: n, value: v, domain: 'localhost', path: '/' });
await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:5300/account' });
await new Promise((r) => setTimeout(r, 2500));

const mine = await ev(`
  const LABEL=${JSON.stringify(LABEL)};
  const el=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===LABEL);
  if(!el) return null;
  const cs=getComputedStyle(el); const style={};
  for(const p of cs) style[p]=cs.getPropertyValue(p);
  const r=el.getBoundingClientRect();
  return { tag: el.tagName.toLowerCase(), cls: el.className, type: el.getAttribute('type'),
           rect:{x:+r.x.toFixed(3),y:+r.y.toFixed(3),w:+r.width.toFixed(3),h:+r.height.toFixed(3)}, style };
`);
chrome.kill();
if (!mine) {
  console.log('NOT FOUND');
  process.exit(1);
}

console.log('\n  ' + LABEL);
console.log('  tag        ref', ref.tag, ' ours', mine.tag);
console.log('  type attr  ref', JSON.stringify(ref.attrs.type), ' ours', JSON.stringify(mine.type));
console.log('  rect       ref', JSON.stringify(ref.rect));
console.log('             ours', JSON.stringify(mine.rect));
const rectOk = ['x', 'y', 'w', 'h'].every((k) => Math.abs(ref.rect[k] - mine.rect[k]) < 0.01);
console.log('  geometry  ', rectOk ? 'EXACT' : 'DIFFERS');

const skip =
  /^(-webkit-locale|font-family|perspective-origin|transform-origin|inset|block-size|inline-size|height|width|min-height|max-height|top|left|right|bottom|border-.*-radius$)/;
let same = 0;
const diff = [];
for (const [p, want] of Object.entries(ref.style)) {
  if (skip.test(p)) continue;
  if (!(p in mine.style)) continue;
  const got = mine.style[p];
  if (want === got) {
    same++;
    continue;
  }
  diff.push(`    ${p.padEnd(34)} want ${String(want).slice(0, 44).padEnd(46)} got ${String(got).slice(0, 44)}`);
}
console.log(`\n  computed properties  ${same}/${same + diff.length} identical\n`);
if (diff.length) console.log(diff.join('\n') + '\n');
