/** Proves the private chat panel drags and resizes, and that `cancel` protects the scroller. */
import { handoffUrl, roomJwtSecret } from './lib/enter-room.mjs';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
const BASE = process.env.BASE ?? 'http://localhost:5179';
const profile = '/tmp/e2e-pc';
rmSync(profile, { recursive: true, force: true });
const proc = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--remote-debugging-port=9595',
    '--headless=new',
    '--no-first-run',
    '--disable-gpu',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--window-size=1512,900',
    `--user-data-dir=${profile}`,
    'about:blank'
  ],
  { stdio: 'ignore', detached: true }
);
let ver;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch('http://127.0.0.1:9595/json/version');
    if (r.ok) {
      ver = await r.json();
      break;
    }
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const p = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id === undefined) return;
  const x = p.get(m.id);
  p.delete(m.id);
  m.error ? x.reject(new Error(JSON.stringify(m.error))) : x.resolve(m.result);
});
const send = (me, pa = {}, s) => {
  const i = ++id;
  return new Promise((res, rej) => {
    p.set(i, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: i, method: me, params: pa, ...(s ? { sessionId: s } : {}) }));
  });
};
// The room has no login of its own; the controller hands off with a signed token.
const t = await send('Target.createTarget', {
  url: handoffUrl({ base: BASE, email: 'probe@handoff.test', secret: roomJwtSecret() })
});
const sid = (await send('Target.attachToTarget', { targetId: t.targetId, flatten: true }))
  .sessionId;
await send('Runtime.enable', {}, sid);
await sleep(2500);
const ev = async (e) =>
  (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }, sid))
    .result.value;
// Entry happened on the navigation above; nothing to submit.
await sleep(7000);

// Open the private chat.
await ev(`(()=>{const el=document.getElementById('privaChatCompHolder');
  if(el) el.style.display='block';})()`);
await sleep(600);

const state = () =>
  ev(`(()=>{const el=document.getElementById('privaChatCompHolder');
  if(!el) return JSON.stringify({found:false});
  const r=el.getBoundingClientRect();
  return JSON.stringify({found:true,x:Math.round(r.x),y:Math.round(r.y),
    w:Math.round(r.width),h:Math.round(r.height),
    handles:el.querySelectorAll('[data-resize-handle]').length});})()`);

const drag = (fromSel, dx, dy) =>
  ev(`(()=>{
  const el=document.getElementById('privaChatCompHolder');
  const src = ${JSON.stringify(fromSel)} ? el.querySelector(${JSON.stringify(fromSel)}) : el;
  if(!src) return 'no source '+${JSON.stringify(fromSel)};
  const r=el.getBoundingClientRect();
  el.setPointerCapture=()=>{}; el.hasPointerCapture=()=>false; el.releasePointerCapture=()=>{};
  const o={bubbles:true,pointerId:7,button:0,isPrimary:true};
  src.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:r.x+150,clientY:r.y+12}));
  el.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:r.x+150+${dx},clientY:r.y+12+${dy}}));
  el.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:r.x+150+${dx},clientY:r.y+12+${dy}}));
  return 'ok';})()`);

const results = [];
const check = (l, ok, extra = '') => {
  results.push(ok);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${l.padEnd(50)} ${extra}`);
};

const before = JSON.parse(await state());
console.log('before:', JSON.stringify(before));
check('panel found', before.found, '');
check('eight resize handles added', before.handles === 8, `handles=${before.handles}`);

await drag(null, 120, 80);
await sleep(300);
const dragged = JSON.parse(await state());
console.log('dragged:', JSON.stringify(dragged));
check(
  'dragging from the panel body moves it',
  dragged.x !== before.x || dragged.y !== before.y,
  `${before.x},${before.y} -> ${dragged.x},${dragged.y}`
);

const atDrag = { ...dragged };
await drag('.privChatScroller', 90, 90);
await sleep(300);
const afterCancel = JSON.parse(await state());
console.log('after cancel-drag:', JSON.stringify(afterCancel));
check(
  'dragging from .privChatScroller does NOT move it',
  afterCancel.x === atDrag.x && afterCancel.y === atDrag.y,
  `${afterCancel.x},${afterCancel.y}`
);

// Move the panel to the wrapper's top-left first. Resizing it where it already touches the
// containment edge proves nothing: `containment: ".wrapper"` correctly refuses to grow past it,
// which is why the first attempt grew width and not height.
const wrapper = JSON.parse(
  await ev(`(()=>{const w=document.querySelector('.wrapper');
  const r=w.getBoundingClientRect();
  return JSON.stringify({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});})()`)
);
console.log('wrapper:', JSON.stringify(wrapper));
await ev(`(()=>{const el=document.getElementById('privaChatCompHolder');
  const w=document.querySelector('.wrapper').getBoundingClientRect();
  el.style.position='fixed'; el.style.left=(w.x+10)+'px'; el.style.top=(w.y+10)+'px';
  el.style.right='auto'; el.style.bottom='auto';})()`);
await sleep(300);
const roomy = JSON.parse(await state());
console.log('moved to top-left:', JSON.stringify(roomy));

await ev(`(()=>{const el=document.getElementById('privaChatCompHolder');
  const h=el.querySelector('[data-resize-handle="se"]');
  const r=el.getBoundingClientRect();
  h.setPointerCapture=()=>{}; h.hasPointerCapture=()=>false; h.releasePointerCapture=()=>{};
  const o={bubbles:true,pointerId:9,button:0,isPrimary:true};
  h.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:r.right,clientY:r.bottom}));
  h.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:r.right+70,clientY:r.bottom+50}));
  h.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:r.right+70,clientY:r.bottom+50}));})()`);
await sleep(300);
const resized = JSON.parse(await state());
console.log('resized:', JSON.stringify(resized));
check(
  'the se handle resizes both axes',
  resized.w > roomy.w && resized.h > roomy.h,
  `${roomy.w}x${roomy.h} -> ${resized.w}x${resized.h}`
);
check(
  'resizing stays inside the wrapper',
  resized.x + resized.w <= wrapper.x + wrapper.w + 1 &&
    resized.y + resized.h <= wrapper.y + wrapper.h + 1,
  `right=${resized.x + resized.w} vs ${wrapper.x + wrapper.w}`
);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
ws.close();
process.kill(-proc.pid, 'SIGKILL');
rmSync(profile, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
