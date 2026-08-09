/**
 * There is no rect dump for the Manage page — `evidence-dumps/login-page/manage` is served DOM
 * only. So build one: its markup, rendered against the controller's real
 * stylesheets (captured whole in room-login-1785587807656.json, same app, same
 * CSS), at the same 1989x1265 @dpr2 as every other measurement here.
 *
 * That turns a markup-only capture into a measurable reference.
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
const PORT = 9360;
const dump = JSON.parse(readFileSync(dumpPath('room-login-1785587807656.json'), 'utf8'));
const raw = readFileSync('evidence-dumps/login-page/manage', 'utf8');

// keep angular's own ng-hide rule — it is what hides the conditional blocks
const NG = `[ng\\:cloak],[ng-cloak],[data-ng-cloak],[x-ng-cloak],.ng-cloak,.x-ng-cloak,
            .ng-hide:not(.ng-hide-animate){display:none !important;}
/* The captured stylesheet's @font-face points at a relative path that does not
   resolve from a file:// page, so without this every icon falls back to a
   default glyph of uniform width and the reference's buttons measure narrower
   than they really are. FontAwesome 4 is the version the controller loads. */
@font-face { font-family: 'FontAwesome'; font-style: normal; font-weight: normal;
  src: url('${process.cwd()}/node_modules/font-awesome/fonts/fontawesome-webfont.woff2') format('woff2'); }`;
const body = raw
  .slice(raw.indexOf('<body'))
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*>/gi, '');

writeFileSync(
  '/tmp/ref-manage.html',
  `<!doctype html><html><head><meta charset="utf-8"><style>${NG}</style>
${dump.stylesheets
  .map((s) => s.rules || '')
  .filter(Boolean)
  .map((c) => `<style>${c}</style>`)
  .join('\n')}
</head>${body}</html>`
);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-refmanage',
    '--allow-file-access-from-files',
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
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1989, height: 1265, deviceScaleFactor: 2, mobile: false });
await send('Page.navigate', { url: 'file:///tmp/ref-manage.html' });
await new Promise((r) => setTimeout(r, 3000));

const nodes = await ev(`
  const PROPS=['background-color','color','font-size','font-weight','line-height','padding-top','padding-left',
               'margin-top','margin-bottom','border-top-width','border-top-color','text-align','display','float'];
  const out=[];
  for (const el of document.querySelectorAll('*')) {
    const r=el.getBoundingClientRect();
    if (r.width===0 && r.height===0) continue;
    const cs=getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute('class')||'').replace(/\\s*ng-(scope|binding|isolate|pristine|valid|invalid|dirty|untouched|touched|empty|not-empty)\\S*/g,'').trim(),
      text: (el.childNodes.length && [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').replace(/\\s+/g,' ').trim())||'',
      rect: {x:+r.x.toFixed(3), y:+r.y.toFixed(3), w:+r.width.toFixed(3), h:+r.height.toFixed(3)},
      style: Object.fromEntries(PROPS.map(p=>[p, cs.getPropertyValue(p)]))
    });
  }
  return out;
`);
chrome.kill();
writeFileSync('/tmp/ref-manage-rects.json', JSON.stringify(nodes));
console.log('visible elements:', nodes.length);
console.log('page height:', Math.max(...nodes.map((n) => n.rect.y + n.rect.h)).toFixed(1));
