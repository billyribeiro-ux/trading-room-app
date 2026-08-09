#!/usr/bin/env node
// Decode a NEXT-STEP capture dump into feedable, line-by-line readable slices.
//
// Lossless by construction:
//  - every capture, every node, every attribute, every rect, every text/::before/::after
//  - every computed style property is either printed on the node, or equal to the
//    capture-wide COMMON value printed in that capture's DEFAULTS.txt header.
//    (per-node line + DEFAULTS table == the full original style object)
//  - non-baseline full-DOM captures are emitted as an exhaustive per-node diff vs
//    baseline; nodes with zero differences are listed explicitly by path.
//
// usage: node scripts/decode-ptr-dump.mjs <input.json> <outDir>

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [, , inPath, outDir] = process.argv;
if (!inPath || !outDir) {
  console.error('usage: node scripts/decode-ptr-dump.mjs <input.json> <outDir>');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const raw = readFileSync(inPath, 'utf8');
const dump = JSON.parse(raw);
const caps = dump.caps ?? [];

const slug = (s) =>
  String(s)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 60);
const w = (p, body) => {
  writeFileSync(join(outDir, p), Array.isArray(body) ? body.join('\n') + '\n' : body);
};
const mk = (p) => mkdirSync(join(outDir, p), { recursive: true });

const nodesOf = (cap) => cap.fullDom?.nodes ?? cap.subtree?.nodes ?? null;
const containerOf = (cap) => cap.fullDom ?? cap.subtree ?? null;

// ---------------------------------------------------------------- 00-META.txt
const meta = caps.find((c) => c.label === '__meta__')?.meta ?? {};
const metaLines = [];
metaLines.push(`SOURCE FILE      : ${inPath}`);
metaLines.push(`BYTES            : ${raw.length}`);
metaLines.push(`dump.part        : ${dump.part}`);
metaLines.push(`capture count    : ${caps.length}`);
metaLines.push(`meta.capturedAt  : ${meta.capturedAt}`);
metaLines.push(`meta.url         : ${meta.url}`);
metaLines.push(`meta.ua          : ${meta.ua}`);
metaLines.push(`meta.role        : ${meta.role}`);
metaLines.push(`meta.viewport    : ${JSON.stringify(meta.viewport)}`);
metaLines.push(`meta.errors      : ${JSON.stringify(meta.errors)}`);
for (const [k, v] of Object.entries(meta)) {
  if (['capturedAt', 'url', 'ua', 'role', 'viewport', 'errors', 'styleSheets'].includes(k)) continue;
  metaLines.push(`meta.${k} : ${JSON.stringify(v).slice(0, 4000)}`);
}
metaLines.push('');
metaLines.push('=== CAPTURE INDEX ===');
caps.forEach((cap, i) => {
  const c = containerOf(cap);
  const kind = cap.fullDom ? 'fullDom' : cap.subtree ? 'subtree' : cap.meta ? 'meta' : '?';
  metaLines.push(
    `[${String(i).padStart(2, '0')}] ${kind.padEnd(8)} label=${cap.label} ts=${cap.ts ?? '-'} ` +
      `nodes=${c?.count ?? '-'} truncated=${c?.truncated ?? '-'} themeClass=${JSON.stringify(cap.themeClass ?? null)} ` +
      `viewport=${JSON.stringify(cap.viewport ?? null)} dir=${cap.label === '__meta__' ? '-' : `caps/${String(i).padStart(2, '0')}-${slug(cap.label)}`}`
  );
});
metaLines.push('');
metaLines.push('=== cssVars PER CAPTURE (verbatim) ===');
caps.forEach((cap, i) => {
  if (!cap.cssVars) return;
  metaLines.push(`[${String(i).padStart(2, '0')}] ${cap.label}: ${JSON.stringify(cap.cssVars)}`);
});
metaLines.push('');
metaLines.push('=== STYLESHEET INDEX (rules in 01-stylesheets/) ===');
(meta.styleSheets ?? []).forEach((ss, i) => {
  metaLines.push(
    `[${String(i).padStart(2, '0')}] ruleCount=${ss.ruleCount} bytes=${(ss.rules ?? '').length} href=${ss.href ?? '(inline)'} -> 01-stylesheets/${String(i).padStart(2, '0')}.css`
  );
});
w('00-META.txt', metaLines);

// -------------------------------------------------------- 01-stylesheets/*.css
mk('01-stylesheets');
(meta.styleSheets ?? []).forEach((ss, i) => {
  const head =
    `/* sheet[${i}] href=${ss.href ?? '(inline)'} ruleCount=${ss.ruleCount}` +
    (ss.access ? ` access=${ss.access}` : '') +
    (ss.media ? ` media=${ss.media}` : '') +
    ' */\n';
  w(`01-stylesheets/${String(i).padStart(2, '0')}.css`, head + (ss.rules ?? ''));
});

// ---------------------------------------------- harness v2 evidence (if present)
// Old dumps lack all of these; each block is skipped silently when absent.
if (meta.head) w('03-head.html', meta.head);
if (meta.rawHtml) w('04-raw.html', meta.rawHtml);
if (meta.htmlAttrs || meta.bodyAttrs) {
  w('05-root-attrs.txt', [
    '<html> attributes:',
    ...Object.entries(meta.htmlAttrs ?? {}).map(([k, v]) => `  ${k} = ${JSON.stringify(v)}`),
    '',
    '<body> attributes:',
    ...Object.entries(meta.bodyAttrs ?? {}).map(([k, v]) => `  ${k} = ${JSON.stringify(v)}`)
  ]);
}
if (meta.stateRules) {
  w('06-state-rules.txt', [
    `${meta.stateRules.length} rule(s) carrying :hover / :active / :focus / .open / .show / .in / .active.`,
    'matchingElementsOnPage = how many elements match the state-stripped selector in this capture;',
    '0 means the rule exists but nothing on this page can ever trigger it.',
    '',
    ...meta.stateRules.map(
      (r, i) =>
        `[${i}] ${r.href}${r.media ? ` @media ${r.media}` : ''}\n` +
        `    matches on page: ${r.matchingElementsOnPage}\n` +
        `    ${r.css}`
    )
  ]);
}
if (meta.mediaQueries) {
  const mq = meta.mediaQueries;
  w('07-media-queries.txt', [
    `${mq.length} @media block(s); ${mq.filter((m) => m.matchesNow).length} active at capture viewport.`,
    '',
    ...mq.map(
      (m, i) =>
        `[${i}] ${m.matchesNow ? 'ACTIVE ' : 'inactive'} ${m.query}  (${m.ruleCount} rules, ${m.href})\n${m.rules}\n`
    )
  ]);
}
if (meta.focusStates?.length) {
  w('08-focus-states.txt', [
    `${meta.focusStates.length} element(s) captured while genuinely focused.`,
    '',
    ...meta.focusStates.map(
      (f, i) =>
        `[${i}] ${f.label}\n    selector: ${f.selector}\n    rect: ${JSON.stringify(f.rect)}\n` +
        Object.entries(f.style)
          .map(([k, v]) => `    ${k}: ${v}`)
          .join('\n')
    )
  ]);
}
if (meta.mutations?.length) {
  w('09-mutations.txt', [
    `${meta.mutations.length} DOM mutation(s) observed during the recording window.`,
    'This is the ONLY evidence of the app behaving dynamically. Empty = the page was quiescent.',
    '',
    ...meta.mutations.map(
      (m, i) =>
        `[${i}] ${m.t} ${m.type} ${m.target}` +
        (m.attr ? ` attr=${m.attr}` : '') +
        (m.oldValue !== undefined ? ` old=${JSON.stringify(m.oldValue)}` : '') +
        (m.added ? ` +${m.added}` : '') +
        (m.removed ? ` -${m.removed}` : '') +
        (m.addedText?.length ? `\n     text: ${m.addedText.map((t) => JSON.stringify(t)).join(' | ')}` : '')
    )
  ]);
}
if (meta.resources?.length) {
  w('10-resources.txt', [
    `${meta.resources.length} network resource(s).`,
    '',
    ...meta.resources.map(
      (r) => `${String(r.size ?? 0).padStart(9)} B  ${String(r.type).padEnd(12)} ${r.ms}ms  ${r.name}`
    )
  ]);
}
if (meta.fonts || meta.angular || meta.storageKeys) {
  w('11-runtime.txt', [
    '=== document.fonts ===',
    ...(meta.fonts ?? []).map((f) => `  ${f.family} ${f.weight} ${f.style} — ${f.status}`),
    '',
    '=== angular ===',
    JSON.stringify(meta.angular, null, 2),
    '',
    '=== storage keys (values deliberately withheld) ===',
    JSON.stringify(meta.storageKeys, null, 2)
  ]);
}

// ------------------------------------------------------------ style-key helper
const ALL_KEYS = (() => {
  const s = new Set();
  for (const cap of caps) for (const n of nodesOf(cap) ?? []) for (const k of Object.keys(n.style ?? {})) s.add(k);
  return [...s];
})();

function commonValues(nodes) {
  const tally = new Map(ALL_KEYS.map((k) => [k, new Map()]));
  for (const n of nodes) {
    for (const k of ALL_KEYS) {
      const v = n.style?.[k];
      if (v === undefined) continue;
      const m = tally.get(k);
      m.set(v, (m.get(v) ?? 0) + 1);
    }
  }
  const out = {};
  for (const [k, m] of tally) {
    let best = null,
      bestN = -1;
    for (const [v, c] of m)
      if (c > bestN) {
        best = v;
        bestN = c;
      }
    if (best !== null) out[k] = { value: best, count: bestN, distinct: m.size };
  }
  return out;
}

function fmtNode(n, common, idx) {
  const L = [];
  const attrs = n.attrs ?? {};
  L.push(`#${idx} path=${n.path} <${n.tag}>`);
  const r = n.rect ?? {};
  L.push(`  rect: x=${r.x} y=${r.y} w=${r.w} h=${r.h}`);
  const ak = Object.keys(attrs);
  if (ak.length === 0) L.push('  attrs: (none)');
  else for (const k of ak) L.push(`  attr ${k} = ${JSON.stringify(attrs[k])}`);
  if (n.text !== undefined) L.push(`  text: ${JSON.stringify(n.text)}`);
  if (n.before !== undefined && n.before !== null) L.push(`  ::before: ${JSON.stringify(n.before)}`);
  if (n.after !== undefined && n.after !== null) L.push(`  ::after: ${JSON.stringify(n.after)}`);
  const st = n.style ?? {};
  const dev = [];
  const missing = [];
  for (const k of ALL_KEYS) {
    const v = st[k];
    if (v === undefined) {
      if (common[k]) missing.push(k);
      continue;
    }
    if (!common[k] || v !== common[k].value) dev.push(`${k}: ${v}`);
  }
  L.push(`  style-deviations (${dev.length}; all other props == COMMON in DEFAULTS.txt):`);
  for (const d of dev) L.push(`    ${d}`);
  if (missing.length) L.push(`  style-absent-props: ${missing.join(', ')}`);
  return L.join('\n');
}

function defaultsFile(label, nodes, common) {
  const L = [];
  L.push(`COMMON (most-frequent) computed-style values for capture "${label}" — ${nodes.length} nodes.`);
  L.push('A node line prints ONLY properties whose value differs from the COMMON value below.');
  L.push("Node full style = COMMON table, overridden by that node's style-deviations. Nothing is discarded.");
  L.push('');
  L.push('prop | COMMON value | nodes with COMMON value | distinct values in capture');
  for (const k of ALL_KEYS) {
    const c = common[k];
    if (!c) {
      L.push(`${k} | (absent on all nodes) | 0 | 0`);
      continue;
    }
    L.push(`${k} | ${c.value} | ${c.count}/${nodes.length} | ${c.distinct}`);
  }
  return L;
}

// chunk writer: keep each slice comfortably readable
function writeChunks(dir, header, blocks, blocksPerFile) {
  let fileNo = 0;
  for (let i = 0; i < blocks.length; i += blocksPerFile) {
    const part = blocks.slice(i, i + blocksPerFile);
    const name = `${dir}/nodes-${String(fileNo).padStart(3, '0')}.txt`;
    w(name, [
      `${header} — records ${i}..${i + part.length - 1} of ${blocks.length}`,
      '',
      ...part.flatMap((b) => [b, ''])
    ]);
    fileNo++;
  }
  return fileNo;
}

// ------------------------------------------------------------------- captures
const baselineCap = caps.find((c) => c.label === 'baseline-room' && c.fullDom);
const baselineNodes = nodesOf(baselineCap) ?? [];
const baselineByPath = new Map(baselineNodes.map((n) => [n.path, n]));

const manifest = [];

caps.forEach((cap, i) => {
  if (cap.label === '__meta__') return;
  const nodes = nodesOf(cap);
  if (!nodes) return;
  const dir = `caps/${String(i).padStart(2, '0')}-${slug(cap.label)}`;
  mk(dir);

  const isBaseline = cap === baselineCap;
  const isFullDiff = !isBaseline && !!cap.fullDom && baselineNodes.length > 0;

  const common = commonValues(nodes);
  w(`${dir}/DEFAULTS.txt`, defaultsFile(cap.label, nodes, common));

  const info = [
    `capture index : ${i}`,
    `label         : ${cap.label}`,
    `ts            : ${cap.ts}`,
    `kind          : ${cap.fullDom ? 'fullDom' : 'subtree'}`,
    `node count    : ${nodes.length} (declared ${containerOf(cap).count}, truncated=${containerOf(cap).truncated})`,
    `themeClass    : ${JSON.stringify(cap.themeClass ?? null)}`,
    `viewport      : ${JSON.stringify(cap.viewport ?? null)}`,
    `cssVars       : ${JSON.stringify(cap.cssVars ?? null)}`,
    `emitted as    : ${isFullDiff ? 'DIFF vs baseline-room (exhaustive)' : 'FULL node dump'}`
  ];
  w(`${dir}/INFO.txt`, info);

  let files;
  if (!isFullDiff) {
    const blocks = nodes.map((n, k) => fmtNode(n, common, k));
    files = writeChunks(dir, `FULL node dump — capture[${i}] ${cap.label}`, blocks, 120);
  } else {
    const blocks = [];
    const identical = [];
    const seen = new Set();
    nodes.forEach((n, k) => {
      seen.add(n.path);
      const b = baselineByPath.get(n.path);
      if (!b) {
        blocks.push(
          `#${k} path=${n.path} <${n.tag}>  *** NODE ABSENT IN BASELINE — full dump ***\n` + fmtNode(n, common, k)
        );
        return;
      }
      const L = [];
      const r = n.rect ?? {},
        br = b.rect ?? {};
      for (const d of ['x', 'y', 'w', 'h']) if (r[d] !== br[d]) L.push(`  rect.${d}: ${br[d]} -> ${r[d]}`);
      const ka = new Set([...Object.keys(n.attrs ?? {}), ...Object.keys(b.attrs ?? {})]);
      for (const k2 of ka) {
        const a = b.attrs?.[k2],
          c = n.attrs?.[k2];
        if (a !== c) L.push(`  attr ${k2}: ${JSON.stringify(a)} -> ${JSON.stringify(c)}`);
      }
      if (n.tag !== b.tag) L.push(`  tag: ${b.tag} -> ${n.tag}`);
      if (n.text !== b.text) L.push(`  text: ${JSON.stringify(b.text)} -> ${JSON.stringify(n.text)}`);
      // before/after are objects — compare by value, not by reference, or every node
      // that merely HAS a pseudo-element reports a phantom difference.
      for (const pseudo of ['before', 'after']) {
        const a = JSON.stringify(b[pseudo] ?? null);
        const c = JSON.stringify(n[pseudo] ?? null);
        if (a !== c) L.push(`  ::${pseudo}: ${a} -> ${c}`);
      }
      for (const k2 of ALL_KEYS) {
        const a = b.style?.[k2],
          c = n.style?.[k2];
        if (a !== c) L.push(`  style ${k2}: ${a} -> ${c}`);
      }
      if (L.length === 0) identical.push(n.path);
      else blocks.push(`#${k} path=${n.path} <${n.tag}> — ${L.length} difference(s) vs baseline\n` + L.join('\n'));
    });
    const removed = baselineNodes.filter((b) => !seen.has(b.path)).map((b) => `${b.path} <${b.tag}>`);
    w(`${dir}/IDENTICAL-TO-BASELINE.txt`, [
      `${identical.length} of ${nodes.length} nodes are byte-identical to baseline-room (rect, attrs, tag, text, ::before, ::after, and ALL computed style props).`,
      '',
      ...identical
    ]);
    w(`${dir}/NODES-REMOVED-VS-BASELINE.txt`, [
      `${removed.length} baseline node path(s) absent from this capture:`,
      '',
      ...removed
    ]);
    files = writeChunks(dir, `DIFF vs baseline — capture[${i}] ${cap.label}`, blocks, 120);
    info.push(`nodes identical to baseline: ${identical.length}/${nodes.length}`);
    info.push(`nodes differing            : ${blocks.length}`);
    info.push(`nodes removed vs baseline  : ${removed.length}`);
    w(`${dir}/INFO.txt`, info);
  }

  manifest.push(
    `${dir}  label=${cap.label}  nodes=${nodes.length}  mode=${isFullDiff ? 'diff' : 'full'}  nodeFiles=${files}`
  );
});

w('02-MANIFEST.txt', [
  `Decoded ${inPath}`,
  `Read order: 00-META.txt -> 01-stylesheets/*.css -> each caps/*/INFO.txt + DEFAULTS.txt + nodes-*.txt (+ IDENTICAL / REMOVED for diff captures)`,
  '',
  ...manifest
]);

console.log(`decoded ${inPath} -> ${outDir}`);
console.log(manifest.join('\n'));
