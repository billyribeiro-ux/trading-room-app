/**
 * Builds the style contract from EVERY capture we hold, and reports where they disagree.
 *
 * ## Two sources, and why both are needed
 *
 * `ptr1.json` is the original forensic capture: 2,156 nodes, but only the one manage tab that
 * happened to be open, everything at rest, every panel closed.
 *
 * `collect-*.json` is the live collector's output: 6,671 nodes across all six manage tabs, the
 * account page, the DON'T TOUCH block expanded, and the xeditable editor open — states that exist
 * in no earlier dump.
 *
 * ## Build drift is real and is reported, not silently merged
 *
 * The live app has been rebuilt since ptr1 was taken:
 *
 *     ptr1 dump : app.min.js?v=1784623769671
 *     live now  : app.min.js?v=1786116181737
 *
 * So the two sources can legitimately disagree, and a merge that silently picked one would hide
 * the reference changing under us. Where they disagree the fact is DROPPED from the contract and
 * listed under `disagreements`, because a value we cannot pin is not something to gate on.
 *
 * ## Pinned by class, not by node
 *
 * Aligning an AngularJS DOM to a Svelte one needs a matching heuristic, and a heuristic that
 * mismatches reports confident nonsense. A class-wide fact needs no alignment: `.caret` is worn by
 * 19 nodes across the two sources and every one is `rgb(255,255,255)`. Where nodes carrying a class
 * disagree, the property is dropped — a class that is sometimes one colour pins nothing.
 *
 * That count read "68" until it was checked. 68 is what you get by SUBSTRING-matching `caret`,
 * which sweeps up the 60 `fa-caret-right pull-right` glyphs in the row menus — a different class
 * entirely. It is the same mistake, in prose, that this file's `\b`-boundary bug made in code, and
 * it was sitting in the paragraph explaining why the design is sound. The real number is 19, from
 * this script's own artifact; verify with `contract.caret.nodes` rather than by counting again.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
/*
  The two capture roots were LITERALS into one person's home directory until 2026-09-03.
  `src/lib/reference-capture.ts` had solved this for the test suites on 2026-08-15; the scripts never
  adopted it, and `capture-root.mjs` is the `.mjs` half. Both roots are overridable, and this file
  already continues without a capture it cannot read — the paths simply stop naming a machine nobody
  else has.
*/
import { CAPTURE_ROOT, capturePath, siteCapturePath } from './capture-root.mjs';

const OUT = new URL('../docs/generated/style-contract.json', import.meta.url);

/** Position depends on where a node sits, not on what it is. Appearance is what this pins. */
const LAYOUT = new Set([
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'top',
  'right',
  'bottom',
  'left',
  'flex-basis',
  'grid-template-columns',
  'order',
  'z-index',
  'transform',
  'background-position',
  'background-image'
]);

/**
 * CSS properties that inherit from the parent, out of the 95 recorded.
 *
 * These are the ones whose value on a hidden element describes its ancestors rather than its own
 * class — see the note where this is used.
 */
const INHERITED = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-shadow',
  'white-space',
  'word-break',
  'overflow-wrap',
  'cursor',
  'visibility',
  'list-style-type',
  'pointer-events',
  'user-select'
]);

/** AngularJS bookkeeping. `ng-hide` is kept: `display:none` is a real, checkable fact. */
const isMeaningful = (token) => token === 'ng-hide' || (!token.startsWith('ng-') && token.length > 0);

/** source label -> class -> property -> Set(values) */
const perSource = new Map();

/** class -> how many nodes wear it, across every source. Ranks divergences by blast radius. */
const nodeCount = new Map();

function ingest(label, nodes) {
  let map = perSource.get(label);
  if (!map) perSource.set(label, (map = new Map()));
  for (const node of nodes) {
    const classAttr = node.class ?? node.attrs?.class;
    const style = node.style;
    if (!classAttr || !style) continue;

    /*
      A hidden node is not evidence about how a class LOOKS.

      `.btn-danger` was pinned at `color: rgb(51,51,51)` from a single node that was
      `display:none`, 0x0, and sitting inside a `.panel-title` — where Bootstrap's
      `.panel-title > a { color: inherit }` beats `.btn-danger`'s white. The stock rule in the very
      same capture reads `.btn-danger { color: rgb(255,255,255) }`, so the contract was asserting
      the opposite of the rule it had recorded, and our correct `#fff` was reported as a divergence.

      An invisible element inherits from wherever it happens to hang and is measured in a context
      no user ever sees. Skipping it costs nothing — `ng-hide` itself is still pinned, so "this is
      hidden" remains checkable.
    */
    const hidden = style.display === 'none' || style.visibility === 'hidden';
    for (const token of String(classAttr).trim().split(/\s+/)) {
      if (!isMeaningful(token)) continue;
      nodeCount.set(token, (nodeCount.get(token) ?? 0) + 1);
      let props = map.get(token);
      if (!props) map.set(token, (props = new Map()));
      for (const [property, value] of Object.entries(style)) {
        if (LAYOUT.has(property)) continue;
        /*
          For a hidden node, only NON-INHERITED properties are evidence.

          The first cut of this skipped hidden nodes entirely, which was too blunt in both
          directions. `.btn-danger` had been pinned at `color: rgb(51,51,51)` from one
          `display:none` node inside a `.panel-title`, where `.panel-title > a { color: inherit }`
          beats `.btn-danger`'s white — an inherited value measured in a context no user sees. But
          dropping the whole node also lost `.badge-danger-chat`, whose three nodes are all
          `ng-hide` and whose `background-color: rgb(255,0,0)` is perfectly good evidence, because
          background does not inherit.

          So the rule follows the CSS: inherited properties on a hidden node say more about its
          ancestors than about its class.
        */
        if (hidden && INHERITED.has(property)) continue;
        let values = props.get(property);
        if (!values) props.set(property, (values = new Set()));
        values.add(value);
      }
    }
  }
}

const sources = [];

/* ── the original forensic capture ─────────────────────────────────────────── */
const PTR1 = siteCapturePath('ptr1.json');
try {
  const ptr1 = JSON.parse(readFileSync(PTR1, 'utf8'));
  const baseline = ptr1.caps.find((c) => c.label === 'baseline-room');
  ingest('ptr1', baseline.fullDom.nodes);
  sources.push({
    label: 'ptr1',
    file: 'ptr1.json',
    nodes: baseline.fullDom.nodes.length,
    viewport: baseline.viewport,
    sha256: createHash('sha256').update(readFileSync(PTR1)).digest('hex').slice(0, 16)
  });
} catch (error) {
  console.error(`ptr1.json could not be read (${error.code ?? error.message}) — building without it`);
}

/* ── every live collector run on the Desktop ───────────────────────────────── */
const SEARCH = [CAPTURE_ROOT, capturePath('scripts')];
for (const dir of SEARCH) {
  // No initialiser: the `catch` always continues, so a value here could never be read.
  let entries;
  try {
    entries = readdirSync(dir).filter((f) => /^collect-.*\.json$/.test(f));
  } catch {
    continue;
  }
  for (const file of entries) {
    const run = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
    /*
      A narrow viewport is not a smaller version of the same page — it is a different layout, and
      merging it would pin values that only hold on a phone. Recorded as skipped rather than
      quietly folded in.
    */
    if (!run.viewport || run.viewport.w < 1400) {
      sources.push({ label: file, skipped: `viewport ${run.viewport?.w}px — narrower than the reference's 1842px` });
      continue;
    }
    let count = 0;
    for (const capture of Object.values(run.captures ?? {})) {
      if (capture?.nodes) {
        ingest('live', capture.nodes);
        count += capture.nodes.length;
      }
    }
    sources.push({ label: file, nodes: count, viewport: run.viewport, page: run.page });
  }
}

/* ── agree within a source, then across sources ────────────────────────────── */
const contract = {};
const disagreements = [];
let pinned = 0;
let droppedWithin = 0;

const allClasses = new Set([...perSource.values()].flatMap((m) => [...m.keys()]));

for (const token of [...allClasses].sort()) {
  const agreedPerSource = new Map();
  for (const [label, map] of perSource) {
    const props = map.get(token);
    if (!props) continue;
    for (const [property, values] of props) {
      if (values.size !== 1) {
        droppedWithin += 1;
        continue;
      }
      let bySource = agreedPerSource.get(property);
      if (!bySource) agreedPerSource.set(property, (bySource = new Map()));
      bySource.set(label, [...values][0]);
    }
  }

  const style = {};
  for (const [property, bySource] of agreedPerSource) {
    const distinct = new Set(bySource.values());
    if (distinct.size === 1) {
      style[property] = [...distinct][0];
      pinned += 1;
    } else {
      // The two builds render this differently. Not pinned — recorded.
      disagreements.push({ class: token, property, values: Object.fromEntries(bySource) });
    }
  }
  if (Object.keys(style).length) {
    contract[token] = {
      sources: [...perSource].filter(([, m]) => m.has(token)).map(([label]) => label),
      nodes: nodeCount.get(token) ?? 0,
      style
    };
  }
}

const payload = {
  generatedFrom: sources,
  classes: Object.keys(contract).length,
  pinnedFacts: pinned,
  droppedForDisagreementWithinASource: droppedWithin,
  disagreementsBetweenSources: disagreements.length,
  disagreements,
  contract
};

/*
  NOTHING INGESTED IS A REFUSAL. IT IS NOT AN EMPTY CONTRACT.

  Both source sets are owner-local: `ptr1.json` under ~/Desktop and the `collect-*.json` runs beside
  it. On any other machine — every CI checkout, every fresh clone — the ptr1 read raises ENOENT and
  both `readdirSync` calls take their `continue`, so `perSource` stays empty and `payload` is
  `{"classes":0,"pinnedFacts":0,"contract":{}}`.

  That used to be WRITTEN, and the consequence was measured on 2026-09-01 rather than argued:
  running this script anywhere but the owner's laptop replaced the 682,298 committed bytes of
  `docs/generated/style-contract.json` with 183, printed `pinned 0 facts across 0 classes`, and
  exited 0. With that file in place `verify-manage-styles.mjs` — which is `manage:styles`, a step of
  `test:gates` and therefore of `pnpm run gate` — reports `0 declarations compared against 0 pinned
  facts from 0 nodes`, finds no divergence because it holds nothing to diverge from, and exits 0.
  The gate that exists to catch a colour our stylesheet declares against the colour the capture
  measured had been disarmed by its own generator, and the only trace was three zeroes in a log
  line.

  So an absent capture set refuses: the committed artifact is left byte-for-byte as it is, the
  message names both locations that were searched, and the exit code is non-zero. A builder that
  cannot see its evidence has produced nothing, and writing that nothing over the evidence is the
  one outcome that turns a missing input into a green gate downstream.

  A capture set that is PRESENT but yields FEWER facts is deliberately not this branch and is not
  refused. That is a real measurement of a reference that changed, and suppressing it would be the
  mirror of the mistake above — the same distinction `gate/verify-postgres-schema-artifacts.mjs`
  draws between an absent capture and a damaged one.
*/
if (perSource.size === 0) {
  console.error(
    [
      'style contract: REFUSING TO WRITE — no capture source was readable, so NOTHING WAS MEASURED.',
      `- ${OUT.pathname} is unchanged.`,
      `- ptr1 forensic capture: ${PTR1}`,
      `- live collector runs:   ${SEARCH.join(', ')}`,
      '- An empty contract here disarms verify-manage-styles.mjs (pnpm manage:styles): it reports no',
      '  divergence whenever it has no pinned facts to compare manage.css against.'
    ].join('\n')
  );
  process.exit(1);
}

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`sources:`);
for (const s of sources)
  console.log(
    `  ${s.label.padEnd(46)} ${s.skipped ? 'SKIPPED — ' + s.skipped : s.nodes + ' nodes @ ' + s.viewport.w + 'px'}`
  );
console.log(
  `\npinned ${pinned} facts across ${payload.classes} classes; ` +
    `${droppedWithin} dropped within a source; ${disagreements.length} disagreements BETWEEN builds`
);
for (const d of disagreements.slice(0, 12)) console.log(`  .${d.class} ${d.property}: ${JSON.stringify(d.values)}`);
