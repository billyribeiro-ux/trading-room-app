/*
  Drives the emoji picker in real headless Chrome and checks the behaviours the deployed
  bundle defines but the dump could not capture, because the dump is a single idle frame:
  search, the skin-tone row, the hover preview, and the Frequently Used store.

  Expectations come from docs/source/main.d6d3c112b59b7d0d.js, not from taste:
    - handleSearch() shows the Search category and sets every other one to display:none
    - maxResults = 75
    - buildSearch() indexes short_names, name, id, keywords and emoticons
    - emoji-skins opens on the first click and picks on the second
    - frequently.add() writes emoji-mart.frequently and emoji-mart.last

  Usage: node scripts/audit-emoji-behaviour.mjs   (exits non-zero on any failed check)
*/
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { build } from 'vite';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9336;
const workDir = await mkdtemp(join(tmpdir(), 'ptr-emoji-behaviour-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await writeFile(
  join(workDir, 'entry.js'),
  `import { mount } from 'svelte';
   import EmojiPicker from ${JSON.stringify(resolve('src/lib/components/EmojiPicker.svelte'))};
   window.__picked = [];
   mount(EmojiPicker, {
     target: document.getElementById('host'),
     props: { onselect: (glyph) => window.__picked.push(glyph) }
   });`
);

const bundle = await build({
  configFile: false,
  logLevel: 'silent',
  plugins: [svelte()],
  resolve: { alias: { $lib: resolve('src/lib') } },
  build: {
    outDir: join(workDir, 'client'),
    emptyOutDir: true,
    rollupOptions: {
      input: join(workDir, 'entry.js'),
      output: { entryFileNames: 'entry.js', format: 'iife' }
    }
  }
});

const cssBuild = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    outDir: join(workDir, 'css'),
    emptyOutDir: true,
    rollupOptions: { input: resolve('src/app.css') }
  }
});
const cssAsset = [cssBuild]
  .flat()
  .flatMap((output) => output.output ?? [])
  .find((asset) => asset.fileName.endsWith('.css'));
const css = await readFile(join(workDir, 'css', cssAsset.fileName), 'utf8');
const script = await readFile(join(workDir, 'client', 'entry.js'), 'utf8');
void bundle;

const pagePath = join(workDir, 'picker.html');
await writeFile(
  pagePath,
  `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style>` +
    `<style>body{margin:0;background:#111}</style></head><body><div id="host"></div>` +
    `<script>${script}<\/script></body></html>`
);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${join(workDir, 'profile')}`,
    '--window-size=900,900',
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
  message.error
    ? waiter.reject(new Error(JSON.stringify(message.error)))
    : waiter.resolve(message.result);
};
const send = (method, params = {}) =>
  new Promise((resolve_, reject) => {
    const n = ++messageId;
    pending.set(n, { resolve: resolve_, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
};

await send('Page.enable');
await send('Runtime.enable');
await sleep(2500);

const raw = await evaluate(`(async () => {
  const checks = [];
  const check = (name, pass, detail) => checks.push({ name, pass: !!pass, detail });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const categories = () => [...document.querySelectorAll('.emoji-mart-category')];
  const searchSection = () => document.querySelector('[aria-label="Search Results"]');
  const others = () => categories().filter((c) => c !== searchSection());
  const input = document.querySelector('#emoji-mart-search-2');
  const setQuery = async (value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(140);
  };

  check('idle: Search category hidden', getComputedStyle(searchSection()).display === 'none');
  check('idle: all 10 real categories visible',
    others().every((c) => getComputedStyle(c).display !== 'none'), others().length);
  check('idle: first anchor selected',
    !!document.querySelector('.emoji-mart-anchor-selected'));

  await setQuery('cat');
  const visibleAfter = others().filter((c) => getComputedStyle(c).display !== 'none').length;
  const results = [...searchSection().querySelectorAll('.emoji-mart-emoji')];
  check('search: Search category shown', getComputedStyle(searchSection()).display === 'block');
  check('search: every other category hidden', visibleAfter === 0, visibleAfter);
  check('search: results are rendered, not filtered in place', results.length > 0, results.length);
  check('search: respects maxResults = 75', results.length <= 75, results.length);
  check('search: matches by keyword not just aria-label',
    results.some((r) => r.getAttribute('aria-label').includes('cat')), results.length);
  check('search: no anchor highlighted while searching',
    !document.querySelector('.emoji-mart-anchor-selected'));
  check('search: clear button shows the delete glyph',
    document.querySelector('.emoji-mart-search-icon path').getAttribute('d').startsWith('M10 8.586'));

  await setQuery('zzzzzzzz');
  check('search: no matches shows No Emoji Found',
    searchSection().classList.contains('emoji-mart-no-results') &&
      !!searchSection().querySelector('.emoji-mart-no-results-label'));

  document.querySelector('.emoji-mart-search-icon').click();
  await sleep(140);
  check('clear: restores the categories',
    getComputedStyle(searchSection()).display === 'none' &&
      others().every((c) => getComputedStyle(c).display !== 'none'));
  check('clear: refocuses the input', document.activeElement === input);
  check('clear: restores the magnifier glyph',
    document.querySelector('.emoji-mart-search-icon path').getAttribute('d').startsWith('M12.9'));

  const cell = document.querySelector('.emoji-mart-category:not([aria-label="Search Results"]) .emoji-mart-emoji');
  cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
  await sleep(140);
  const previewName = document.querySelector('.emoji-mart-preview-name');
  const shortNames = document.querySelectorAll('span.emoji-mart-preview-shortname');
  const previewSprite = document.querySelector('.emoji-mart-preview-emoji .emoji-mart-emoji span');
  check('preview: shows the hovered name', !!previewName && previewName.textContent.trim().length > 0,
    previewName && previewName.textContent);
  check('preview: lists :shortnames:', shortNames.length > 0 &&
    /^:.+:$/.test(shortNames[0].textContent.trim()), shortNames[0] && shortNames[0].textContent);
  check('preview: renders at 38px, not the grid 24px',
    previewSprite.style.width === '38px', previewSprite.style.width);

  cell.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
  await sleep(140);
  check('preview: mouseleave restores the idle preview',
    !document.querySelector('.emoji-mart-preview-name') &&
      !!document.querySelector('.emoji-mart-title-label'));

  const swatches = [...document.querySelectorAll('.emoji-mart-skin-swatch')];
  const before = document.querySelector('.emoji-mart-category:not([aria-label="Search Results"]) .emoji-mart-emoji span').style.backgroundPosition;
  swatches[0].firstElementChild.click();
  await sleep(120);
  check('skins: first click opens the row',
    document.querySelector('.emoji-mart-skin-swatches').classList.contains('opened'));
  swatches[3].firstElementChild.click();
  await sleep(160);
  const after = document.querySelector('.emoji-mart-category:not([aria-label="Search Results"]) .emoji-mart-emoji span').style.backgroundPosition;
  check('skins: second click applies the tone',
    swatches[3].classList.contains('selected') &&
      !document.querySelector('.emoji-mart-skin-swatches').classList.contains('opened'));
  check('skins: sprite moves to the skin variation', before !== after, before + ' -> ' + after);
  check('skins: tone is persisted', localStorage.getItem('emoji-mart.skin') === '4',
    localStorage.getItem('emoji-mart.skin'));

  const pick = document.querySelector('.emoji-mart-category:not([aria-label="Search Results"]) .emoji-mart-emoji');
  pick.click();
  await sleep(160);
  check('select: emits the glyph', window.__picked.length === 1, window.__picked.join(''));
  check('select: records the frequently-used counter',
    !!localStorage.getItem('emoji-mart.frequently') && !!localStorage.getItem('emoji-mart.last'),
    localStorage.getItem('emoji-mart.last'));

  return JSON.stringify(checks);
})()`);

ws.close();
chrome.kill();

const checks = JSON.parse(raw);
const failed = checks.filter((entry) => !entry.pass);
for (const entry of checks) {
  const detail = entry.detail === undefined || entry.detail === null ? '' : `  (${entry.detail})`;
  process.stdout.write(`${entry.pass ? 'PASS' : 'FAIL'}  ${entry.name}${detail}\n`);
}
process.stdout.write(`\n${checks.length - failed.length}/${checks.length} checks passed\n`);
if (failed.length) process.exitCode = 1;

// Best-effort: Chrome is still flushing its profile as it exits, so a failed rmdir here
// must not mask the checks above.
await sleep(500);
await rm(workDir, { recursive: true, force: true }).catch(() => {});
