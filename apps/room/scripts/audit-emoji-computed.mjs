/*
  Diffs the rendered emoji picker against the chat-composer capture
  (first-dump/decoded/01-caps/53-emoji-popover:0), which carries a rect and 95 computed
  style properties for every one of its 5588 nodes.

  Compiling and type-checking prove nothing about pixels, so this renders EmojiPicker,
  bundles src/app.css through vite exactly as the app loads it, opens the pair in real
  headless Chrome over CDP, and compares every node's box and computed styles.

  Two things are deliberately normalised, both arithmetic rather than layout:

    - The capture host had overlay scrollbars: its .emoji-mart-scroll is 336 wide around
      a 324-wide category, so the scrollbar took 0px. Headless Chrome uses classic 15px
      scrollbars, so ::-webkit-scrollbar is zeroed to put the two on the same footing.
    - Rects are compared relative to the popover root, since the capture's absolute page
      coordinates come from a 1842x1265 viewport this harness has no reason to recreate.
      Nodes the capture renders at 0x0 (the display:none no-results block) are compared
      on being absent from layout rather than on an offset from that root.

  Usage: node scripts/audit-emoji-computed.mjs [capture-nodes.json]
  Exits non-zero when any node disagrees with the capture.
*/
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { render } from 'svelte/server';
import { build } from 'vite';

const CAPTURE = resolve(
  process.argv[2] ?? 'first-dump/decoded/01-caps/53-emoji-popover:0/nodes.json'
);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

const PROPS = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'transform',
  'width',
  'height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-left',
  'color',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'border-top-width',
  'border-bottom-width',
  'border-top-color',
  'border-bottom-color',
  'border-top-left-radius',
  'border-bottom-left-radius',
  'overflow-x',
  'overflow-y',
  'cursor',
  'fill',
  'opacity',
  'z-index',
  'text-align',
  'vertical-align',
  'flex-grow',
  'max-width',
  'visibility'
];

const workDir = await mkdtemp(join(tmpdir(), 'ptr-emoji-audit-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderPicker() {
  await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [svelte()],
    resolve: { alias: { $lib: resolve('src/lib') } },
    build: {
      ssr: resolve('src/lib/components/EmojiPicker.svelte'),
      outDir: join(workDir, 'ssr'),
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: 'emoji.mjs' } }
    }
  });
  const { default: EmojiPicker } = await import(
    `${pathToFileURL(join(workDir, 'ssr', 'emoji.mjs')).href}?t=${Date.now()}`
  );
  return render(EmojiPicker, { props: { onselect: () => {} } }).body;
}

async function bundleCss() {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      outDir: join(workDir, 'css'),
      emptyOutDir: true,
      rollupOptions: { input: resolve('src/app.css') }
    }
  });

  // The emitted name carries a content hash, so find it rather than assume it. Vite also
  // emits every font and image app.css references; only the stylesheet matters here.
  const outputs = [result].flat().flatMap((bundle) => bundle.output ?? []);
  const sheet = outputs.find((asset) => asset.fileName.endsWith('.css'));
  if (!sheet) throw new Error('vite emitted no stylesheet for src/app.css');

  return readFile(join(workDir, 'css', sheet.fileName), 'utf8');
}

const [markup, css] = await Promise.all([renderPicker(), bundleCss()]);
const pagePath = join(workDir, 'picker.html');
await writeFile(
  pagePath,
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>` +
    `<style>body{margin:0;background:#111}</style></head><body>${markup}</body></html>`
);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${join(workDir, 'profile')}`,
    '--window-size=1842,1265',
    '--force-device-scale-factor=2',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

let target;
for (let attempt = 0; attempt < 60 && !target; attempt++) {
  try {
    const res = await fetch(
      `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(pathToFileURL(pagePath).href)}`,
      { method: 'PUT' }
    );
    if (res.ok) target = await res.json();
  } catch {
    // Chrome has not opened the port yet.
  }
  if (!target) await sleep(500);
}
if (!target) {
  chrome.kill();
  throw new Error(`Chrome never exposed a debugging port on ${PORT}`);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve_, reject) => {
  ws.onopen = resolve_;
  ws.onerror = reject;
});
let messageId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
};
const send = (method, params = {}) =>
  new Promise((resolve_, reject) => {
    const n = ++messageId;
    pending.set(n, { resolve: resolve_, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send('Page.enable');
await send('Runtime.enable');
await sleep(2000);

const { result } = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `(() => {
    const style = document.createElement('style');
    style.textContent = '::-webkit-scrollbar{width:0!important;height:0!important}';
    document.head.appendChild(style);
    const root = document.querySelector('ngb-popover-window');
    if (!root) return JSON.stringify({ error: 'no ngb-popover-window in the rendered output' });
    const rootRect = root.getBoundingClientRect();
    const props = ${JSON.stringify(PROPS)};
    const nodes = [];
    const walk = (element, path) => {
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const style = {};
      for (const prop of props) style[prop] = computed.getPropertyValue(prop);
      nodes.push({
        path,
        tag: element.tagName.toLowerCase(),
        cls: element.getAttribute('class') || '',
        rect: {
          dx: +(rect.x - rootRect.x).toFixed(1),
          dy: +(rect.y - rootRect.y).toFixed(1),
          w: +rect.width.toFixed(1),
          h: +rect.height.toFixed(1)
        },
        style
      });
      let index = 0;
      for (const child of element.children) walk(child, path + '.' + index++);
    };
    walk(root, 'r');
    return JSON.stringify(nodes);
  })()`
});
ws.close();
chrome.kill();

const rendered = JSON.parse(result.value);
if (rendered.error) throw new Error(rendered.error);

const captureFile = JSON.parse(await readFile(CAPTURE, 'utf8'));
const captureNodes = captureFile.nodes ?? captureFile;
const captureRoot = captureNodes.find((node) => node.path === 'r');
const capturedByPath = new Map(captureNodes.map((node) => [node.path.split('#')[0], node]));

const normalize = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const isHidden = (rect) => rect && rect.x === 0 && rect.y === 0 && rect.w === 0 && rect.h === 0;
const differences = [];

for (const node of rendered) {
  const captured = capturedByPath.get(node.path);
  if (!captured) {
    differences.push({
      path: node.path,
      tag: node.tag,
      cls: node.cls,
      bad: ['absent from the capture']
    });
    continue;
  }

  const bad = [];
  if (isHidden(captured.rect)) {
    if (node.rect.w !== 0 || node.rect.h !== 0) {
      bad.push(
        `rect: the capture keeps this out of layout, we render ${node.rect.w}x${node.rect.h}`
      );
    }
  } else if (captured.rect) {
    const relative = {
      dx: +(captured.rect.x - captureRoot.rect.x).toFixed(1),
      dy: +(captured.rect.y - captureRoot.rect.y).toFixed(1),
      w: captured.rect.w,
      h: captured.rect.h
    };
    for (const key of ['dx', 'dy', 'w', 'h']) {
      if (Math.abs(node.rect[key] - relative[key]) > 0.6) {
        bad.push(`rect.${key}: got ${node.rect[key]} want ${relative[key]}`);
      }
    }
  }

  for (const prop of PROPS) {
    // The root is placed by the trigger it is anchored to, which this harness omits.
    if (node.path === 'r' && ['top', 'right', 'bottom', 'left', 'transform'].includes(prop))
      continue;
    /*
      background-position has no observable effect without an image, and the built CSS
      cannot agree with the capture on it: esbuild minifies upstream's `background: none`
      to `background: 0 0`, which pins the position at `0px 0px` where the unminified
      cascade leaves the initial `0% 0%`. Identical rendering, different serialisation,
      so it is only compared where an image actually exists.
    */
    if (
      prop === 'background-position' &&
      normalize(captured.style?.['background-image']) === 'none'
    ) {
      continue;
    }
    const want = captured.style?.[prop];
    if (want === undefined || want === null) continue;
    if (normalize(node.style[prop]) !== normalize(want)) {
      bad.push(`${prop}: got ${normalize(node.style[prop])} want ${normalize(want)}`);
    }
  }

  if (bad.length) differences.push({ path: node.path, tag: node.tag, cls: node.cls, bad });
}

await rm(workDir, { recursive: true, force: true });

const byProperty = {};
for (const difference of differences) {
  for (const entry of difference.bad) {
    const key = entry.split(':')[0];
    byProperty[key] = (byProperty[key] ?? 0) + 1;
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      capture: CAPTURE,
      renderedNodes: rendered.length,
      captureNodes: captureNodes.length,
      propertiesPerNode: PROPS.length,
      nodesWithDifferences: differences.length,
      differencesByProperty: byProperty,
      differences: differences.slice(0, 40)
    },
    null,
    2
  )}\n`
);

if (differences.length) process.exitCode = 1;
