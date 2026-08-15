#!/usr/bin/env node
/**
 * A smoke test for `collect-manage-gaps.js`, with no dependencies.
 *
 * ## Why this exists
 *
 * That collector is pasted into a console on a LIVE system by a human, once, and its whole value is
 * the file it downloads. A script that throws on line 3 wastes the trip; worse, one that throws
 * halfway writes a partial capture that looks complete. Neither is acceptable for something that
 * gets one shot.
 *
 * `node --check` only proves it parses. This runs it.
 *
 * ## What it proves, and what it does not
 *
 * **Proves:** the file executes top to bottom against a DOM without throwing, finds a Settings tab
 * and its fields, opens a disclosure and notices whether the DOM actually changed, walks the user
 * rows, records honest gaps for what is absent, and reaches the download step.
 *
 * **Does not prove:** anything about the real page. The DOM below is a hand-built stand-in — it has
 * the shapes the collector looks for, not the reference's markup. A selector that is subtly wrong
 * for the real manage page passes here and finds nothing there, which is exactly why the collector
 * writes `gaps[]` instead of assuming success.
 *
 * Run: node apps/controller/scripts/collect-manage-gaps.smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, 'collect-manage-gaps.js');

/* ── the smallest DOM that exercises every branch ─────────────────────────── */

let idCounter = 0;

function makeElement(tag, options = {}) {
  const attrs = new Map(Object.entries(options.attrs ?? {}));
  const element = {
    tagName: tag.toUpperCase(),
    children: options.children ?? [],
    textContent: options.text ?? '',
    innerHTML: options.html ?? `<${tag}>stub</${tag}>`,
    value: options.value,
    checked: options.checked,
    parentElement: null,
    _id: ++idCounter,
    get id() {
      return attrs.get('id') ?? '';
    },
    get className() {
      return attrs.get('class') ?? '';
    },
    get attributes() {
      return [...attrs].map(([name, value]) => ({ name, value }));
    },
    getAttribute: (name) => (attrs.has(name) ? attrs.get(name) : null),
    setAttribute: (name, value) => attrs.set(name, value),
    matches: (selector) => (options.matchSelectors ?? []).includes(selector),
    closest: () => options.closest ?? null,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: 20 }),
    focus() {},
    blur() {},
    dispatchEvent: () => true,
    click: () => options.onClick && options.onClick(),
    appendChild: () => {},
    remove: () => {},
    querySelectorAll: (selector) => queryAll(element.children, selector),
    querySelector: (selector) => queryAll(element.children, selector)[0] ?? null
  };
  for (const child of element.children) child.parentElement = element;
  return element;
}

/**
 * Deliberately crude: matches on tag name, `.class` and `[attr]` only.
 *
 * **It does NOT support descendant selectors.** `table tr` matches nothing here, which is why the
 * run reports `user rows captured: 0` while the collector's `table tr` query is perfectly correct
 * for a real page. That number is a limit of this stub, not a finding about the collector — do not
 * "fix" the collector because of it.
 */
function queryAll(pool, selector) {
  const parts = selector.split(',').map((part) => part.trim());
  const flat = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      flat.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(pool);
  return flat.filter((node) =>
    parts.some((part) => {
      if (part.startsWith('.')) return node.className.split(/\s+/).includes(part.slice(1));
      if (part.startsWith('[')) {
        const name = part.slice(1, -1).split('=')[0];
        return node.getAttribute(name) !== null;
      }
      // `[` needs no escape inside a character class; the three members are `.`, `[` and `:`.
      return node.tagName.toLowerCase() === part.split(/[.[:]/)[0];
    })
  );
}

const hiddenField = makeElement('input', { attrs: { id: 'ssoJWTSecret', type: 'text' }, value: 'super-secret-value' });
let dontTouchOpen = false;

const settingsFields = Array.from({ length: 3 }, (_, index) =>
  makeElement('input', { attrs: { id: `setting${index}`, type: 'text' }, value: `v${index}` })
);

const dontTouchToggle = makeElement('a', {
  text: "DON'T TOUCH These below unless you know what you are doing...",
  onClick: () => {
    dontTouchOpen = true;
    root.children.push(hiddenField);
  }
});

const userRow = makeElement('tr', {
  children: [
    makeElement('td', { text: 'Dana Reyes', html: 'Dana Reyes' }),
    makeElement('td', { text: 'Presenter / manual', html: 'Presenter / manual' }),
    makeElement('td', { text: 'dana@example.com', html: 'dana@example.com' })
  ]
});

const root = {
  children: [
    makeElement('a', { text: 'Settings' }),
    makeElement('a', { text: 'Users' }),
    ...settingsFields,
    dontTouchToggle,
    makeElement('table', { children: [userRow] }),
    makeElement('button', { attrs: { class: 'btn' }, text: 'A button' })
  ]
};

/*
  `body` is a real element-like object, not a plain literal.

  The first version of this harness made it `{ innerText, innerHTML, appendChild }` and the collector
  threw `pane.querySelectorAll is not a function` — which was MY bug, not its: every real
  `document.body` has that method. Worth keeping the note, because the throw did reveal something
  true: when `.tab-pane.active` is absent the collector falls back to the whole document, which is
  loud in the output (`paneSelector: "body (fallback)"`) rather than silent.
*/
const bodyElement = makeElement('body', { children: root.children, html: '<body>stub</body>' });
bodyElement.innerText = 'Manage Extra Admin Users';

const document_ = {
  body: bodyElement,
  documentElement: { innerHTML: '<html>unamePW</html>' },
  styleSheets: [{ href: 'https://example.test/app.css', cssRules: [] }],
  querySelectorAll: (selector) => queryAll(root.children, selector),
  querySelector: (selector) => queryAll(root.children, selector)[0] ?? null,
  createElement: (tag) => makeElement(tag)
};

let downloaded = null;
const sandbox = {
  document: document_,
  location: { href: 'https://original.test/#/page/manageSession', origin: 'https://original.test' },
  getComputedStyle: () => ({ getPropertyValue: () => 'stub' }),
  MouseEvent: class {
    constructor(type) {
      this.type = type;
    }
  },
  Blob: class {
    constructor(parts) {
      downloaded = parts[0];
    }
  },
  URL: { createObjectURL: () => 'blob:stub' },
  setTimeout,
  console: { log: () => {}, warn: () => {}, error: (...a) => console.error(...a), table: () => {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

/* ── run the real file ────────────────────────────────────────────────────── */

const source = readFileSync(SOURCE, 'utf8');
const context = createContext(sandbox);

let threw = null;
try {
  runInContext(source, context, { filename: SOURCE });
} catch (error) {
  threw = error;
}

/*
  The collector is an async IIFE and deliberately sleeps between steps so an Angular page can
  re-render: 1200ms for the Settings tab, 900 for the disclosure, ~240 per hover sample, 600 per
  dropdown, 1200 for the Users tab. Four seconds was not enough and the first run of this harness
  reported "never reached the download step", which was the WAIT being short rather than the
  collector being broken. Poll instead of guessing.
*/
const deadline = Date.now() + 30_000;
while (!downloaded && Date.now() < deadline) {
  await new Promise((resolve_) => setTimeout(resolve_, 250));
}

const problems = [];
if (threw) problems.push(`threw synchronously: ${threw.message}`);
if (!downloaded) problems.push('never reached the download step — the capture would produce no file');

let parsed = null;
if (downloaded) {
  try {
    parsed = JSON.parse(downloaded);
  } catch (error) {
    problems.push(`produced invalid JSON: ${error.message}`);
  }
}

if (parsed) {
  if (parsed.tool !== 'collect-manage-gaps') problems.push('wrong tool name in the output');
  if (!parsed.targets?.settings) problems.push('did not capture the Settings pane');
  if (!Array.isArray(parsed.gaps)) problems.push('gaps[] is not an array');
  // Presence, not count: see the note on `queryAll` — this stub cannot match `table tr`, so a
  // count assertion here would fail for a reason that has nothing to do with the collector.
  if (!parsed.targets?.userRows) problems.push('did not capture the user-rows section at all');
  // The credential mask has to work; the fixture puts a real-looking value in `ssoJWTSecret`.
  if (downloaded.includes('super-secret-value')) {
    problems.push('LEAKED a secret-shaped value into the download — the redaction did not fire');
  }
  if (!dontTouchOpen) problems.push("never clicked the DON'T TOUCH disclosure");
}

if (problems.length) {
  console.error('SMOKE FAILED');
  for (const problem of problems) console.error('  -', problem);
  process.exit(1);
}

console.log('SMOKE PASSED');
console.log(`  reached download: ${(downloaded.length / 1024).toFixed(1)} KB of valid JSON`);
console.log(`  settings fields captured: ${parsed.targets.settings.fieldCount}`);
console.log(
  `  user rows captured: ${parsed.targets.userRows.count} ` +
    '(0 is expected — this stub has no descendant-selector support)'
);
console.log(`  DON'T TOUCH disclosure clicked: ${dontTouchOpen}`);
console.log(`  honest gaps recorded: ${parsed.gaps.length}`);
console.log(`  secret redacted: ${!downloaded.includes('super-secret-value')}`);
