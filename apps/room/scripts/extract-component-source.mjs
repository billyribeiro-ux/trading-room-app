/*
  Pulls a compiled Angular component out of the shipped bundle.

  Why this exists: the DOM captures only contain what the captured session happened to render, so
  anything gated behind a role, a tab nobody opened, or an empty list is simply absent. That is how
  the saved-poll row went missing for a day, and how the screenshare control cluster came to be
  half-implemented.

  A component's TEMPLATE is not gated. Angular compiles it into `main.*.js` whole - every branch,
  every icon, every handler - and ships it to every visitor regardless of who they log in as. So
  this reads the bundle instead of a session, and the answer is the same for a member, a presenter
  and a logged-out browser.

    node scripts/extract-component-source.mjs app-screenshare-view
    node scripts/extract-component-source.mjs app-poll-modal --raw

  Prints the component's `consts` table decoded into readable attribute sets, the icon and label
  inventory, and (with --raw) the template function itself.
*/

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseConstTable } from './lib/const-table.mjs';

const SOURCE_DIR = 'docs/source';

function bundlePath() {
  const match = readdirSync(SOURCE_DIR).find((name) => /^main\..*\.js$/.test(name));
  if (!match) {
    console.error(`no main.*.js in ${SOURCE_DIR}/`);
    process.exit(1);
  }
  return join(SOURCE_DIR, match);
}

/**
 * Finds `selectors:[["<name>"]]` and returns the component's definition body.
 *
 * Anchored on the selector rather than on a minified identifier, because the identifiers change
 * with every build and the selector is the thing the template actually uses.
 */
function componentBody(source, selector) {
  const anchor = source.indexOf(`selectors:[["${selector}"]]`);
  if (anchor === -1) return null;

  // Walk forward to the end of this definition: the next `selectors:[[` is the next component.
  const next = source.indexOf('selectors:[["', anchor + 10);
  return source.slice(anchor, next === -1 ? anchor + 20000 : next);
}

/** Extracts the `consts:[ ... ]` array by matching brackets, which nesting makes necessary. */
function constsTable(body) {
  const start = body.indexOf('consts:[');
  if (start === -1) return null;

  let depth = 0;
  for (let at = start + 'consts:'.length; at < body.length; at += 1) {
    const char = body[at];
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return body.slice(start + 'consts:'.length, at + 1);
    }
  }
  return null;
}

/*
  Angular's const entries are flat arrays with a small marker language:

    ["attr","value", …]   plain attributes, in pairs
    1, "cls", "cls"       everything after a bare 1 is a CLASS until the next marker
    2, "prop","value"     after a bare 2 come STYLE property/value pairs
    3, "prop"             after a bare 3 come BOUND property names

  Decoding it matters because a raw dump of `[1,"btn","btn-sm","btn-dark",3,"click"]` hides that
  this is `class="btn btn-sm btn-dark" (click)="…"`.
*/
function decodeEntry(entry) {
  if (!Array.isArray(entry)) return String(entry);

  const attrs = [];
  const classes = [];
  const styles = [];
  const bound = [];
  let mode = 'attr';

  for (let at = 0; at < entry.length; at += 1) {
    const value = entry[at];
    if (typeof value === 'number') {
      mode = value === 1 ? 'class' : value === 2 ? 'style' : value === 3 ? 'bound' : 'attr';
      continue;
    }
    if (mode === 'class') classes.push(value);
    else if (mode === 'bound') bound.push(value);
    else if (mode === 'style') {
      styles.push(`${value}:${entry[at + 1]}`);
      at += 1;
    } else {
      attrs.push(`${value}="${entry[at + 1]}"`);
      at += 1;
    }
  }

  const parts = [];
  if (classes.length) parts.push(`class="${classes.join(' ')}"`);
  if (attrs.length) parts.push(attrs.join(' '));
  if (styles.length) parts.push(`style="${styles.join('; ')}"`);
  if (bound.length) parts.push(`[bound: ${bound.join(', ')}]`);
  return parts.join('  ') || '(empty)';
}

const [, , selector, ...flags] = process.argv;
if (!selector) {
  console.error('usage: node scripts/extract-component-source.mjs <selector> [--raw]');
  process.exit(1);
}

const path = bundlePath();
const source = readFileSync(path, 'utf8');
const body = componentBody(source, selector);

if (!body) {
  console.error(`selector ${selector} not found in ${path}`);
  const available = [...source.matchAll(/selectors:\[\["([a-z-]+)"\]\]/g)].map((m) => m[1]);
  console.error(`\n${available.length} components in the bundle, e.g.:`);
  console.error(available.slice(0, 25).join(', '));
  process.exit(1);
}

console.log(`# ${selector}`);
console.log(`# from ${path} (${(source.length / 1024 / 1024).toFixed(1)} MB bundle)`);
console.log(`# Static: identical for a member, a presenter, or a logged-out browser.\n`);

const table = constsTable(body);
if (table) {
  let entries;
  try {
    // A JavaScript array literal, NOT JSON: app-room's table carries `"Don't Disturb"`, and the
    // old JSON.parse(table.replaceAll("'", '"')) shortcut turned that into `"Don"t Disturb"` and
    // dropped all 229 entries. scripts/lib/const-table.mjs walks it a character at a time.
    entries = parseConstTable(table);
  } catch (cause) {
    console.log(`consts table could not be parsed (${cause}); raw:\n`, table.slice(0, 2000));
    entries = [];
  }

  console.log(`## consts (${entries.length} entries)\n`);
  entries.forEach((entry, index) => {
    console.log(String(index).padStart(3) + ':  ' + decodeEntry(entry));
  });

  const icons = new Set();
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    for (const value of entry) {
      if (typeof value === 'string' && /^fa-/.test(value)) icons.add(value);
    }
  }
  console.log(`\n## icons (${icons.size})\n${[...icons].sort().join('\n')}`);
}

// Every literal string the template renders as text, which is where labels and tooltips live.
const labels = [...body.matchAll(/[v|ht]\(\d+,\s*"((?:[^"\\]|\\.){3,120})"\)/g)]
  .map((m) => m[1])
  .filter((text) => /[a-z]{3}/i.test(text));
if (labels.length) {
  console.log(`\n## rendered text (${labels.length})`);
  for (const label of [...new Set(labels)]) console.log(`  ${label}`);
}

if (flags.includes('--raw')) {
  console.log('\n## template function\n');
  console.log(body.slice(0, 12000));
}
