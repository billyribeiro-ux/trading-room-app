/**
 * Turns the manage-page capture into a machine-checkable style contract.
 *
 * ## Why this exists
 *
 * The capture holds 2,156 nodes × 95 computed CSS properties — roughly 200,000 measured facts
 * about one page — and until now NOTHING compared a single one of them. `verify-account-contract`
 * reads our source text and asserts strings appear in it. The room's `runtime-vs-capture` compares
 * tags, ids, attributes and text. No checker in either project has ever compared a colour.
 *
 * That is why a black caret survived every gate we own, why `.editable-click` painted its text
 * with the underline's blue, and why 115 `.editable-empty` fields rendered red. Each was found by
 * the owner looking at the screen. This replaces that with arithmetic.
 *
 * ## What it pins, and why by class rather than by node
 *
 * Aligning an AngularJS DOM to a Svelte one node-by-node needs a matching heuristic, and a
 * heuristic that silently mismatches reports confident nonsense. So this pins something that needs
 * no alignment at all: for every class token in the capture, the computed value of each property
 * where EVERY node carrying that class agrees.
 *
 * `.caret` appears 68 times and every one has `border-top-color: rgb(255,255,255)` — that is a
 * fact about the class, not about a position in a tree, and it is exactly the fact we got wrong.
 * Where nodes carrying a class disagree on a property, the property is dropped: a class that is
 * sometimes one colour and sometimes another pins nothing, and pretending otherwise would produce
 * false failures that get the whole gate switched off.
 *
 * Layout properties are excluded deliberately — see LAYOUT_PROPERTIES.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { siteCapturePath } from './capture-root.mjs';

// The argument still wins; the DEFAULT is `PTR_SITE_CAPTURE_ROOT` now rather than a literal into one
// person's home directory. See `capture-root.mjs` for why the scripts carry their own copy.
const CAPTURE = process.argv[2] ?? siteCapturePath('ptr1.json');
const OUT = new URL('../docs/generated/manage-style-contract.json', import.meta.url);

/**
 * Properties whose value depends on where a node sits, not on what it is.
 *
 * A width or an x-offset is a fact about the whole page's layout; two nodes sharing a class will
 * legitimately differ, so they would be dropped by the agreement rule anyway — but they would also
 * make the contract enormous and slow to read. Position is a separate contract (the existing
 * breakpoint and pixel-match work); this one is about appearance.
 */
const LAYOUT_PROPERTIES = new Set([
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
  'transform'
]);

/**
 * Classes that say nothing about appearance.
 *
 * AngularJS stamps `ng-*` onto nodes for its own bookkeeping — `ng-scope`, `ng-binding`,
 * `ng-pristine` and so on. Pinning styles to them would assert that our Svelte output must carry
 * Angular's internal classes, which is false and would make the contract unmeetable.
 *
 * `ng-hide` is the exception and is kept: it is the one with a real rule behind it
 * (`display: none !important`), and whether an element is hidden is a fact worth pinning.
 */
function isMeaningfulClass(token) {
  if (token === 'ng-hide') return true;
  if (token.startsWith('ng-')) return false;
  return token.length > 0;
}

const capture = JSON.parse(readFileSync(CAPTURE, 'utf8'));

/**
 * The baseline cap only.
 *
 * `forced-darkTheme` and `forced-lightTheme` differ from it in exactly one node — `<body>`'s class
 * — so folding them in would add nothing and let a theme-specific value masquerade as universal.
 */
const baseline = capture.caps.find((cap) => cap.label === 'baseline-room');
if (!baseline?.fullDom?.nodes?.length) {
  console.error('the baseline-room cap is missing or empty');
  process.exit(1);
}
const nodes = baseline.fullDom.nodes;

/** class token -> property -> Set of values seen */
const byClass = new Map();

for (const node of nodes) {
  const classAttr = node.attrs?.class;
  if (!classAttr || !node.style) continue;
  for (const token of String(classAttr).trim().split(/\s+/)) {
    if (!isMeaningfulClass(token)) continue;
    let properties = byClass.get(token);
    if (!properties) byClass.set(token, (properties = new Map()));
    for (const [property, value] of Object.entries(node.style)) {
      if (LAYOUT_PROPERTIES.has(property)) continue;
      let values = properties.get(property);
      if (!values) properties.set(property, (values = new Set()));
      values.add(value);
    }
  }
}

const contract = {};
let pinnedFacts = 0;
let droppedForDisagreement = 0;

for (const [token, properties] of [...byClass].sort(([a], [b]) => a.localeCompare(b))) {
  const count = nodes.filter((node) =>
    String(node.attrs?.class ?? '')
      .trim()
      .split(/\s+/)
      .includes(token)
  ).length;

  const agreed = {};
  for (const [property, values] of [...properties].sort(([a], [b]) => a.localeCompare(b))) {
    if (values.size === 1) {
      agreed[property] = [...values][0];
      pinnedFacts += 1;
    } else {
      droppedForDisagreement += 1;
    }
  }
  if (Object.keys(agreed).length > 0) contract[token] = { nodes: count, style: agreed };
}

const payload = {
  source: CAPTURE.split('/').pop(),
  sourceSha256: createHash('sha256').update(readFileSync(CAPTURE)).digest('hex'),
  cap: baseline.label,
  viewport: baseline.viewport,
  capturedNodes: nodes.length,
  classes: Object.keys(contract).length,
  pinnedFacts,
  droppedForDisagreement,
  contract
};

writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `pinned ${pinnedFacts} style facts across ${payload.classes} classes ` +
    `from ${nodes.length} nodes (${droppedForDisagreement} properties dropped for disagreement)`
);
