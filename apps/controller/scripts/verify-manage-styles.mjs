/**
 * Side-by-side: what `manage.css` declares against what the capture measured.
 *
 * ## Why this and not a rendered diff
 *
 * A browser diff needs the page rendered, aligned node-for-node against an AngularJS DOM, and a
 * matching heuristic in between — and a heuristic that mismatches reports confident nonsense. This
 * compares the two things that are both already facts: the value our stylesheet declares for a
 * class, and the value every node carrying that class was measured at.
 *
 * It cannot see the cascade, so it is deliberately narrow: it only judges a property when our
 * stylesheet states it OUTRIGHT for that class. That makes a reported divergence a real one — our
 * own declaration disagreeing with the measurement — rather than a guess about what won.
 *
 * ## What it caught the day it was written
 *
 * The three the owner found by eye, all in classes this file styles: `.caret` forced black over a
 * measured white, `.editable-click` painting its text with the underline's blue, and
 * `.editable-empty` red where all 115 nodes measure near-black. Every existing gate passed
 * throughout, because no gate in either project had ever compared a colour.
 */

import { readFileSync } from 'node:fs';

const contractPath = new URL('../docs/generated/style-contract.json', import.meta.url);
const cssPath = new URL('../src/manage.css', import.meta.url);

const { contract, pinnedFacts, generatedFrom } = JSON.parse(readFileSync(contractPath, 'utf8'));
const capturedNodes = generatedFrom.filter((s) => !s.skipped).reduce((n, s) => n + s.nodes, 0);
const css = readFileSync(cssPath, 'utf8');

/** Properties worth judging: appearance, which is what the capture pins reliably. */
const JUDGED = new Set([
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-style',
  'border-bottom-style',
  'border-top-width',
  'border-bottom-width',
  'font-style',
  'font-weight',
  'font-size',
  'text-decoration-line',
  'text-transform',
  'display',
  'cursor',
  'opacity'
]);

/**
 * Shorthands this reader expands, so `border-bottom: 1px dashed rgb(…)` is judged as the three
 * longhands the capture records. Anything not listed is compared only when written longhand —
 * silently half-understanding a shorthand is how a checker starts lying.
 */
function expand(property, value) {
  const out = {};
  const colour = value.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8}|\b[a-z]+\b(?=\s*$))/i);
  if (property === 'border-bottom' || property === 'border-top') {
    const width = value.match(/(\d+(?:\.\d+)?px)/);
    const style = value.match(/\b(solid|dashed|dotted|double|none)\b/);
    if (width) out[`${property}-width`] = width[1];
    if (style) out[`${property}-style`] = style[1];
    if (colour && !/^(solid|dashed|dotted|double|none)$/i.test(colour[1])) out[`${property}-color`] = colour[1];
    return out;
  }
  if (property === 'text-decoration') {
    out['text-decoration-line'] = value.trim();
    return out;
  }
  out[property] = value.trim();
  return out;
}

/**
 * Custom properties, read from wherever this stylesheet defines them.
 *
 * `color: var(--acc-ink)` and `color: rgb(51,51,51)` are the same declaration written two ways,
 * and a checker that reports them as a divergence is producing noise — which is how a gate gets
 * switched off rather than obeyed.
 */
const TOKEN_SHEETS = ['../src/account.css', '../src/manage.css'];
const customProperties = new Map(
  TOKEN_SHEETS.flatMap((sheet) => [
    ...readFileSync(new URL(sheet, import.meta.url), 'utf8').matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g)
  ]).map(([, name, value]) => [name, value.trim()])
);

/**
 * Values a stylesheet and a computed style write differently while meaning the same thing.
 *
 * The browser reports one canonical form; CSS authors write another. Every conversion here is an
 * identity, not a tolerance — nothing is rounded and no near-match is accepted, because the whole
 * point of this file is that `rgb(217,83,79)` and `rgb(119,119,119)` must never compare equal.
 */
function canonical(value, property) {
  let out = value.replace(/\s+/g, ' ').trim().toLowerCase();

  // `var(--x)` -> its declared value, one level, which is all this stylesheet uses.
  const variable = out.match(/^var\((--[a-zA-Z0-9_-]+)\)$/);
  if (variable && customProperties.has(variable[1])) {
    out = customProperties.get(variable[1]).toLowerCase();
  }

  // `transparent` is reported as `rgba(0, 0, 0, 0)`.
  if (out === 'transparent') return 'rgba(0, 0, 0, 0)';

  // `#fff` / `#ffffff` -> `rgb(255, 255, 255)`.
  const hex = out.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // A bare `0` is `0px` for every length this file judges.
  if (out === '0' && /width|size/.test(property)) return '0px';

  return out.replace(/,\s*/g, ', ');
}

/**
 * Values that cannot be judged without the cascade this file deliberately does not model.
 *
 * `inherit` and `currentcolor` resolve to whatever an ancestor computed, so comparing them to a
 * measurement says nothing about whether we are right.
 */
const UNJUDGEABLE = new Set(['inherit', 'currentcolor', 'initial', 'unset', 'revert', 'auto']);

/*
  Every `.mg-root .<class> { … }` block, single-class selectors only.

  A compound or descendant selector (`.mg-root .btn > .caret`) targets a narrower set than the
  class, so the capture's class-wide agreement is not the right comparison for it — those are
  skipped rather than judged wrongly.
*/
const blocks = [...css.matchAll(/\.mg-root\s+\.([a-zA-Z0-9_-]+)\s*(?:,\s*[^{]*?)?\{([^}]*)\}/g)];

/**
 * Properties a MORE SPECIFIC selector also sets for the same class.
 *
 * `.mg-root .panel-heading { border-bottom: 1px solid transparent }` is Bootstrap's base rule, and
 * `.mg-root .panel-default > .panel-heading { border-color: rgb(221,221,221) }` overrides it. The
 * cascade lands on the measurement; judging the base rule alone reported a divergence that does
 * not exist on screen.
 *
 * So a property is skipped when some other selector mentioning the class also declares it. This is
 * the one place this file bends, and it bends toward silence rather than toward a false alarm —
 * a checker that cries wolf is one that gets switched off.
 *
 * It deliberately does NOT hide a duplicate of the SAME selector: two `.mg-root .btn-assertive`
 * blocks disagreeing is a real defect, and that is how the dead red one was found.
 */
function overriddenElsewhere(className, property) {
  /*
    `\b` is the WRONG boundary for a CSS class name.

    A word boundary sits between `e` and `-`, so `\.badge\b` matches inside `.badge-danger` — and
    `.badge-danger` is a different class, not an override of `.badge`. That made `.badge`'s
    `background-color` unjudgeable: a positive control that swapped the grey for Bootstrap's red
    went unreported. A class name ends where `[A-Za-z0-9_-]` stops, so that is what is asserted.
  */
  const specific = new RegExp(`\\.mg-root\\s+[^{}]*[.>\\s]${className}(?![\\w-])[^{}]*\\{([^}]*)\\}`, 'g');
  for (const [selectorAndBody, body] of css.matchAll(specific)) {
    // The plain `.mg-root .<class> {` form is the rule being judged, not an override of it.
    if (new RegExp(`\\.mg-root\\s+\\.${className}\\s*[,{]`).test(selectorAndBody)) continue;
    /*
      A state rule is not an override of the resting state.

      The capture is entirely at rest — nothing was hovered, focused or disabled — so a `:hover`
      block says nothing about the value being judged. Counting it as an override silently made
      every class with a hover rule unjudgeable, which is how the first control for this file
      failed to fire: `.editable-click:hover` sets `border-bottom-color`, so the resting underline
      could be any colour at all and nothing would notice.
    */
    const selector = selectorAndBody.slice(0, selectorAndBody.indexOf('{'));
    if (/:(hover|focus|active|visited|disabled|checked|first-child|last-child|nth-)/.test(selector)) continue;
    const base = property.replace(/-(top|right|bottom|left)-(color|width|style)$/, '-$2');
    if (new RegExp(`(^|;|\\s)${property}\\s*:`).test(body) || new RegExp(`(^|;|\\s)${base}\\s*:`).test(body)) {
      return true;
    }
  }
  return false;
}

const divergences = [];
let compared = 0;

for (const [, className, body] of blocks) {
  const measured = contract[className];
  if (!measured) continue;

  for (const declaration of body.split(';')) {
    const [rawProperty, ...rest] = declaration.split(':');
    if (!rawProperty || rest.length === 0) continue;
    const property = rawProperty.trim();
    const value = rest
      .join(':')
      .replace(/!important/g, '')
      .trim();
    if (!property || !value) continue;

    for (const [expandedProperty, expandedValue] of Object.entries(expand(property, value))) {
      if (!JUDGED.has(expandedProperty)) continue;
      const expected = measured.style[expandedProperty];
      if (expected === undefined) continue;

      const ours = canonical(expandedValue, expandedProperty);
      if (UNJUDGEABLE.has(ours)) continue;
      if (overriddenElsewhere(className, expandedProperty)) continue;

      compared += 1;
      if (canonical(expected, expandedProperty) !== ours) {
        divergences.push({
          className,
          property: expandedProperty,
          ours: expandedValue,
          resolved: ours === expandedValue.trim().toLowerCase() ? null : ours,
          captured: expected,
          nodes: measured.nodes
        });
      }
    }
  }
}

/*
  ── A width with no style paints NOTHING ──────────────────────────────────────────────────────

  This is the one check that does not compare against the capture, because it does not need to:
  it is wrong on its own terms. `border-*-style` initialises to `none`, and a `none` border has a
  used width of zero whatever the declared width says. So a rule that sets `border-bottom-width` to
  1px and never sets `border-bottom-style` is a line the author believes they drew and the browser
  never draws.

  SCOPE, stated precisely because the first version of this note overstated it: the check looks in
  the SAME BLOCK only — the longhand, the edge shorthand, `border-style` or `border`. It does not
  chase a style supplied by some other selector that also matches the element. That direction is
  the safe one to be wrong in: it can raise a false alarm, never miss a real one. If it ever does
  cry wolf, fix it by widening the lookup, not by deleting the check.

  It went undetected for the whole life of this gate, on `.table > thead > tr > th` — the rule under
  every table heading on the page — precisely BECAUSE the gate compares declarations. There was no
  wrong declaration to catch. The bug was an absent one, and absence is invisible to a check that
  starts from what we wrote.

  Every selector in the file is scanned here, not just the single-class blocks the comparison uses,
  since the `th` rule is a descendant selector and would otherwise still be out of reach.
*/
const EDGES = ['top', 'right', 'bottom', 'left'];
const paintless = [];

for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const declared = (property) => new RegExp(`(^|;|\\s)${property}\\s*:\\s*([^;]+)`).exec(body)?.[2]?.trim();

  for (const edge of EDGES) {
    const width = declared(`border-${edge}-width`);
    if (!width || /^0(px|em|rem)?$/.test(width)) continue;

    // the shorthands that would supply the missing style, in this same block
    const hasStyle =
      declared(`border-${edge}-style`) || declared(`border-${edge}`) || declared('border-style') || declared('border');
    if (hasStyle) continue;

    paintless.push({ selector: selector.trim().replace(/\s+/g, ' '), edge, width });
  }

  const outlineWidth = declared('outline-width');
  if (outlineWidth && !/^0(px|em|rem)?$/.test(outlineWidth) && !declared('outline-style') && !declared('outline')) {
    paintless.push({ selector: selector.trim().replace(/\s+/g, ' '), edge: 'outline', width: outlineWidth });
  }
}

console.log(
  `manage.css vs capture: ${compared} declarations compared against ` +
    `${pinnedFacts} pinned facts from ${capturedNodes} nodes`
);

if (paintless.length) {
  console.error(`\nBORDERS THAT CANNOT PAINT: ${paintless.length}\n`);
  for (const p of paintless) {
    console.error(`  ${p.selector}`);
    console.error(
      `      border-${p.edge}-width: ${p.width}  with no ${p.edge === 'outline' ? 'outline' : 'border'}-style — used width is 0`
    );
  }
  process.exit(1);
}

if (divergences.length === 0) {
  console.log('no divergence between a declared value and its measurement, and every declared border can paint');
  process.exit(0);
}

// Most-used class first: a wrong value on a class with 115 nodes is 115 wrong things on screen.
divergences.sort((a, b) => b.nodes - a.nodes);
console.error(`\nDIVERGENCES: ${divergences.length}\n`);
for (const d of divergences) {
  console.error(`  .${d.className}  (${d.nodes} nodes)  ${d.property}`);
  console.error(`      ours     ${d.ours}${d.resolved ? '  -> ' + d.resolved : ''}`);
  console.error(`      captured ${d.captured}`);
}
process.exit(1);
