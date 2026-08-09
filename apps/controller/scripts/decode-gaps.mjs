#!/usr/bin/env node
/**
 * Decode the files scripts/capture-gaps.js downloads into something the verify
 * harnesses can read directly.
 *
 * In:  a directory of `ptr-gaps-<room>-<stamp>-part*.json`
 * Out: one `<state>.json` per captured state, in exactly the shape
 *      scripts/verify/verify-manage.mjs already consumes, plus the assets
 *      written back out as real files.
 *
 * Usage:
 *   node scripts/decode-gaps.mjs ~/Downloads            # newest capture found there
 *   node scripts/decode-gaps.mjs ~/Downloads out/gaps   # explicit output dir
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const inDir = resolve(process.argv[2] ?? `${process.env.HOME}/Downloads`);
const outDir = resolve(process.argv[3] ?? 'evidence-dumps/NEXT-STEP/gaps');

const files = readdirSync(inDir).filter((f) => /^ptr-gaps-.*-part\d+.*\.json$/.test(f));
if (!files.length) {
  console.error(`no ptr-gaps-*.json in ${inDir}`);
  process.exit(1);
}

/* newest run only — the stamp is the third-from-last dash group */
const stampOf = (f) => (f.match(/-(\d{13})-part/) || [])[1] ?? '0';
const newest = files.map(stampOf).sort().at(-1);
const run = files.filter((f) => stampOf(f) === newest).sort();
console.log(`decoding run ${newest} — ${run.length} files`);

mkdirSync(outDir, { recursive: true });

const read = (f) => JSON.parse(readFileSync(join(inDir, f), 'utf8'));
const slug = (s) => s.replace(/[^\w.-]+/g, '_');

let meta = null;
const states = new Map(); // label -> { ...cap, nodes: [] }

for (const f of run) {
  const payload = read(f);

  if (/part0-META/.test(f)) {
    meta = payload;
    writeFileSync(join(outDir, 'meta.json'), JSON.stringify(payload, null, 2));
    continue;
  }
  if (/part1-rawHtml/.test(f)) {
    writeFileSync(join(outDir, 'rawHtml.html'), payload.rawHtml);
    continue;
  }
  if (/part2-stylesheets/.test(f)) {
    writeFileSync(join(outDir, 'stylesheets.json'), JSON.stringify(payload.stylesheets));
    for (const [i, s] of payload.stylesheets.entries()) {
      if (s.rules) writeFileSync(join(outDir, `sheet-${i}.css`), s.rules);
    }
    continue;
  }
  if (/part3-assets/.test(f)) {
    let written = 0;
    for (const a of payload.assets) {
      if (!a.dataUrl) continue;
      const name = slug(a.url.split('/').pop() || 'asset');
      const base64 = a.dataUrl.slice(a.dataUrl.indexOf(',') + 1);
      writeFileSync(join(outDir, `asset-${name}`), Buffer.from(base64, 'base64'));
      written++;
    }
    console.log(`  assets: ${written} written, ${payload.assets.length - written} unavailable`);
    continue;
  }

  // a capture state, possibly split across chunks
  const key = payload.label;
  if (!states.has(key)) states.set(key, { ...payload, nodes: [] });
  states.get(key).nodes.push(...payload.nodes);
}

/* one file per state, plus a rect-only view in the verifier's shape */
const summary = [];
for (const [label, cap] of states) {
  const name = slug(label);
  writeFileSync(join(outDir, `state-${name}.json`), JSON.stringify(cap));

  const rects = cap.nodes
    .filter((n) => n.rendered !== false)
    .map((n) => ({
      tag: n.tag,
      cls: (n.attrs.class || '')
        .replace(/\s*ng-(scope|binding|isolate|pristine|valid|invalid|dirty|untouched|touched|empty|not-empty)\S*/g, '')
        .trim(),
      text: n.text,
      rect: n.rect,
      style: n.style
    }));
  writeFileSync(join(outDir, `rects-${name}.json`), JSON.stringify(rects));

  summary.push({ state: label, elements: cap.nodes.length, rendered: rects.length });
}

console.table(summary);
console.log(`\nwrote ${states.size} states to ${outDir}`);
if (meta) {
  console.log(`  captured ${meta.capturedAt} at ${meta.viewport.w}x${meta.viewport.h} @dpr${meta.viewport.dpr}`);
  console.log(`  url ${meta.url}`);
  const missing = (meta.assets ?? []).filter((a) => a.error);
  if (missing.length) {
    console.log('\n  assets that could NOT be captured — treat as honest gaps, not defaults:');
    for (const a of missing) console.log(`    ${a.url} — ${a.error}`);
  }
}
