#!/usr/bin/env node
/**
 * Pull the AUTHORED component CSS out of a capture.
 *
 * Angular scopes a component's stylesheet by rewriting its selectors with
 * `[_ngcontent-<id>]` / `[_nghost-<id>]` attribute guards. Those rules are the
 * source the developer wrote — `.login-form { padding: 15px 25px }` — which is a
 * different and far more useful artifact than the computed style of one element.
 *
 * Computed styles tell you what a node ended up with. Authored rules tell you the
 * intent, the states you cannot see (`:focus`, `:hover`, `:active`), and the
 * selectors for UI the current configuration never rendered.
 *
 * This existed in every dump already; nothing was mining it. That is why an
 * earlier pass placed the avatar gear absolutely by inference when the authored
 * rule plainly said `position: relative; top: 25px; left: -20px`.
 *
 * usage: node scripts/extract-component-css.mjs <dump.json> [outDir]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , inPath, outDir = 'component-css'] = process.argv;
if (!inPath) {
  console.error('usage: node scripts/extract-component-css.mjs <dump.json> [outDir]');
  process.exit(1);
}

const dump = JSON.parse(readFileSync(inPath, 'utf8'));
const sheets = dump.stylesheets ?? dump.caps?.find((c) => c.label === '__meta__')?.meta?.styleSheets ?? [];
if (!sheets.length) {
  console.error('no stylesheets in that dump');
  process.exit(1);
}

const SCOPE = /\[_ng(?:content|host)-([a-zA-Z0-9-]+)\]/g;

/** Split CSS into top-level rules without a full parser: track brace depth. */
function rules(css) {
  const out = [];
  let depth = 0,
    start = 0,
    sel = '';
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      if (depth === 0) {
        sel = css.slice(start, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        out.push([sel, css.slice(start, i).trim()]);
        start = i + 1;
      }
    }
  }
  return out;
}

const byScope = new Map();
let scanned = 0;

for (const ss of sheets) {
  const css = ss.rules ?? '';
  if (!css) continue;
  scanned++;
  for (const [sel, body] of rules(css)) {
    const ids = [...sel.matchAll(SCOPE)].map((m) => m[1]);
    if (!ids.length) continue;
    const id = ids[0];
    // strip the scope guards to recover what the developer typed
    const authored = sel
      .replace(/\[_nghost-[a-zA-Z0-9-]+\]/g, ':host')
      .replace(/\[_ngcontent-[a-zA-Z0-9-]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const list = byScope.get(id) ?? [];
    // Angular can emit the same sheet twice (eager + lazy). Dedupe on the pair.
    if (!list.some((r) => r.selector === authored && r.body === body)) {
      list.push({ selector: authored, body, raw: sel.trim() });
    }
    byScope.set(id, list);
  }
}

if (!byScope.size) {
  console.log(`scanned ${scanned} stylesheet(s); no Angular-scoped component CSS found.`);
  console.log('(that is expected for a non-Angular page — the AngularJS controller has none)');
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

let totalRules = 0;
for (const [id, list] of byScope) {
  totalRules += list.length;
  const lines = [
    `/* Authored component CSS recovered from ${inPath}`,
    ` * Angular scope id: ${id}  —  ${list.length} unique rules`,
    ` *`,
    ` * Selectors have had their [_ngcontent-*] / [_nghost-*] guards stripped, so`,
    ` * these are as the component's stylesheet was written. Values referencing`,
    ` * var(--*) resolve against the room token reference (docs/reference/css/room-tokens.css).`,
    ` */`,
    ''
  ];
  for (const r of list) {
    lines.push(`${r.selector} {`);
    for (const d of r.body
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean))
      lines.push(`  ${d};`);
    lines.push('}', '');
  }
  const file = join(outDir, `${id}.css`);
  writeFileSync(file, lines.join('\n'));
  console.log(`${file}  —  ${list.length} rules`);
}

/* The states no screenshot and no computed-style capture can show you. */
const states = [];
for (const [id, list] of byScope)
  for (const r of list)
    if (/:(hover|focus|active|disabled|checked|visited|focus-within)/.test(r.selector))
      states.push(`${id}  ${r.selector} { ${r.body} }`);

console.log(`\n${byScope.size} component scope(s), ${totalRules} authored rules, from ${scanned} stylesheet(s).`);
if (states.length) {
  console.log(`\n${states.length} interaction-state rule(s) — invisible to any screenshot:`);
  for (const s of states) console.log(`  ${s}`);
}
