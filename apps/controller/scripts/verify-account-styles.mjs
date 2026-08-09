/**
 * Side-by-side: what `account.css` declares against what the account capture measured.
 *
 * ## Why this exists
 *
 * `verify-manage-styles.mjs` has caught real, user-visible colour bugs in `manage.css` that every
 * other gate in the project passed. `account.css` — a longer sheet, on the page an owner actually
 * lives in — had no equivalent. A manual read of the account capture then found eleven divergences
 * in it, none of which any automated check could have seen.
 *
 * ## Why it could not simply be the manage verifier pointed at another file
 *
 * `manage.css` reuses the reference's own class names verbatim, so a rule for `.caret` and the
 * capture's `.caret` nodes are the same thing and no translation is needed. `account.css` does the
 * opposite: it renames everything into an `acc-` namespace. Our `.acc-input` is the reference's
 * `.form-control`; our `.acc-btn-danger` is nothing at all on this page.
 *
 * So a NAME MAPPING is unavoidable, and a wrong entry in it produces confident nonsense — a gate
 * asserting that our button is the wrong colour because it was compared against somebody else's
 * button. Every entry in `MAPPING` below was therefore derived by reading our markup and the
 * capture side by side, and carries the locator for both. Where the correspondence is not
 * one-element-to-one-element it is left OUT and reported as unmapped, because a gate covering
 * twenty classes honestly beats one covering sixty with three lies in it.
 *
 * ## What it compares
 *
 * The same two facts the manage verifier compares: the value our stylesheet states OUTRIGHT for a
 * class, and the value every reference node carrying the mapped class was measured at. It models no
 * cascade beyond equal-specificity source order, so a reported divergence is a real disagreement
 * between a declaration we wrote and a measurement, not a guess about what won.
 *
 * Run with `--css <path>` to gate a copy instead of `src/account.css`. That is how the positive
 * controls prove this file bites without editing a source file another agent may be holding open.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CAPTURE = '/Users/billyribeiro/Desktop/new-room/scripts/collect-account-2026-08-08T20-19-23-396Z.json';
const DEFAULT_CSS = new URL('../src/account.css', import.meta.url);
const OUT = new URL('../docs/generated/account-style-contract.json', import.meta.url);

const cssArgument = process.argv.indexOf('--css');
const cssPath = cssArgument === -1 ? DEFAULT_CSS : process.argv[cssArgument + 1];
const rawCss = readFileSync(cssPath, 'utf8');

/* ══ 1. The evidence ═══════════════════════════════════════════════════════════════════════════
 *
 * One run of the live collector against the reference's `#/page/welcome`, logged in as the owner,
 * at 1989x1265 @dpr2. Two of its captures are of the account page:
 *
 *   account:page          860 nodes — the whole page, including the ng-hide login panel and the
 *                                     ng-hide badge editor that are in the template but not on
 *                                     screen
 *   account:sessionsTable  31 nodes — the sessions table re-measured on its own; the same elements
 *                                     as account:page[15..45], so it agrees by construction and is
 *                                     ingested only because it is part of the stated evidence
 *
 * The same run also holds `manage:*` captures. They are DELIBERATELY not ingested. They are a
 * different page under a different stylesheet, and folding them in would either drop facts (a class
 * that renders differently there stops agreeing) or, worse, pin an account class at a manage value.
 * One of them, `manage:dontTouch`, is additionally a mis-capture — byte-identical to
 * `manage:header[18..89]` — so anything ingesting this file generically pins those 72 nodes twice.
 */
const run = JSON.parse(readFileSync(CAPTURE, 'utf8'));
const ACCOUNT_CAPTURES = ['account:page', 'account:sessionsTable'];

/**
 * Properties that inherit, out of the 95 the collector records.
 *
 * Used for the hidden-node rule below. Taken from the same list `build-style-contract.mjs` uses,
 * since the two read the same capture format.
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

/**
 * Properties whose value is produced by layout rather than by the class.
 *
 * These are kept in a SEPARATE contract and reported separately, because a used width is a fact
 * about the content that happened to be in that element, not about the class. `.user-badge-img`
 * measures 30.125px wide only because that owner's badge is that shape.
 */
const SIZE = new Set(['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height']);

/** AngularJS bookkeeping is not a style hook. `ng-hide` is the exception: `display:none` is a fact. */
const isMeaningful = (token) => token === 'ng-hide' || (!token.startsWith('ng-') && token.length > 0);

/** class -> property -> Set(values), from every rendered-or-not node */
const byClass = new Map();
/** class -> property -> Set(values), from RENDERED nodes only — the size contract */
const sizeByClass = new Map();
/** class -> how many nodes wear it */
const nodeCount = new Map();
/** class -> how many of those nodes actually rendered */
const renderedCount = new Map();
/** class -> the nodes wearing it, kept whole so a disagreement can be traced back to which node
 *  caused it and which OTHER class on that node accounts for it */
const nodesByClass = new Map();

let ingestedNodes = 0;

for (const key of ACCOUNT_CAPTURES) {
  const capture = run.captures?.[key];
  if (!capture?.nodes) throw new Error(`capture ${key} missing from ${CAPTURE}`);
  for (const node of capture.nodes) {
    ingestedNodes += 1;
    const classAttr = node.class;
    const style = node.style;
    if (!classAttr || !style) continue;

    /*
      "Not rendered" is decided by the RECT, not by this node's own `display`.

      `build-style-contract.mjs` tests `display === 'none' || visibility === 'hidden'`, which is
      right for a node that carries `ng-hide` itself and wrong for one whose ANCESTOR carries it.
      account:page[57] is exactly that case: `span.label` inside the ng-hide badge editor computes
      `display: inline`, `visibility: visible`, and measures 0x0. Its inherited values were taken in
      a context no user ever sees, so treating it as visible would have pinned `.label` from a box
      that was never laid out.

      A 0x0 rect means the box was not laid out, whatever the reason.
    */
    const rect = node.rect ?? { w: 0, h: 0 };
    const rendered = rect.w > 0 || rect.h > 0;
    const tokens = String(classAttr).trim().split(/\s+/).filter(isMeaningful);

    for (const token of tokens) {
      nodeCount.set(token, (nodeCount.get(token) ?? 0) + 1);
      if (rendered) renderedCount.set(token, (renderedCount.get(token) ?? 0) + 1);
      let siblings = nodesByClass.get(token);
      if (!siblings) nodesByClass.set(token, (siblings = []));
      siblings.push({ tokens: new Set(tokens), style, rendered });

      let props = byClass.get(token);
      if (!props) byClass.set(token, (props = new Map()));
      let sizes = sizeByClass.get(token);
      if (!sizes) sizeByClass.set(token, (sizes = new Map()));

      for (const [property, value] of Object.entries(style)) {
        if (SIZE.has(property)) {
          // A box that was never laid out has no size. Chrome reports `auto` for it, which is not
          // a measurement of anything.
          if (rendered && value !== 'auto') {
            let values = sizes.get(property);
            if (!values) sizes.set(property, (values = new Set()));
            values.add(value);
          }
          continue;
        }
        /*
          On a node that never rendered, only NON-INHERITED properties are evidence.

          An inherited value there describes wherever that subtree happened to hang, not the class.
          `build-style-contract.mjs` learned this the hard way: `.btn-danger` was pinned at
          `color: rgb(51,51,51)` from one hidden node inside a `.panel-title`, and our correct white
          was reported as the divergence. Background, padding and border do not inherit, so they
          remain good evidence on a hidden node and are kept.
        */
        if (!rendered && INHERITED.has(property)) continue;
        /*
          `display: none` on an ng-hide node records AngularJS hiding it, not what the class does.

          `build-style-contract.mjs` keeps that value on purpose — for `.ng-hide` itself it IS the
          fact worth pinning. Here it is poison: [36] is `div.label.label-warning.ng-hide`, so
          `.label` measured `inline` on two nodes and `none` on that one, and `.acc-label`'s
          perfectly correct `display: inline` stopped being judgeable at all.
        */
        if (!rendered && (property === 'display' || property === 'visibility')) continue;
        let values = props.get(property);
        if (!values) props.set(property, (values = new Set()));
        values.add(value);
      }
    }
  }
}

/**
 * A class pins a property only when every node wearing it measured the same value.
 *
 * Where they disagree the property is dropped and the disagreement is KEPT — `splits` below turns
 * it into a report of its own, because one of our classes standing in for two different reference
 * renderings is itself a defect. `.label` is the live example: `div.label` measures 2.1px of top
 * padding at a 10.5px font, `span.label` measures 2.7px at 13.5px, and `.acc-label` is written on
 * both.
 */
function agree(source) {
  const contract = new Map();
  const disagreements = new Map();
  for (const [token, props] of source) {
    const pinned = new Map();
    const split = new Map();
    for (const [property, values] of props) {
      if (values.size === 1) pinned.set(property, [...values][0]);
      else split.set(property, [...values].sort());
    }
    contract.set(token, pinned);
    disagreements.set(token, split);
  }
  return { contract, disagreements };
}

const { contract, disagreements } = agree(byClass);
const { contract: sizeContract } = agree(sizeByClass);

/* ══ 2. The mapping ════════════════════════════════════════════════════════════════════════════
 *
 * our class -> the reference class that sits on the SAME element.
 *
 * Read, not guessed. Each entry names the line of our markup and the node index in
 * `account:page` that were compared to produce it. Where more than one reference class sits on the
 * element, the one chosen is the one present on exactly the corresponding elements and no others —
 * e.g. `.acc-sort-icon` maps to `fa-sort-alpha-asc` (two nodes, both sort glyphs) rather than to
 * `icon` (five nodes, three of which are button icons inheriting a button's white).
 *
 * Anything whose correspondence is not one-element-to-one-element is absent on purpose and is
 * listed by the run as unmapped. The reasons are recorded next to `UNMAPPED_NOTES`.
 */
const MAPPING = {
  // account/+page.svelte:227 `class="acc-input acc-search"` — the sessions search box.
  // account:page[8] input.form-control @440.5,135.8 348x34, the only input in the `.col-md-4` panel.
  // Also :565/:569/:573 (add-admin Name/Email/Password) ↔ [775]/[778]/[781] input.form-control.
  'acc-input': 'form-control',

  // Every `.acc-btn` in our markup is a `.btn` in the reference: :201, :324 Launch ↔ [40],
  // :330 Manage ↔ [42], :362 Add New Badge ↔ [735], :553 Add Admin User ↔ [766],
  // :636 New Api key ↔ [803], :641 API Docs ↔ [805].
  'acc-btn': 'btn',
  // :324 `acc-btn acc-btn-sm acc-btn-info` on Launch ↔ [40] a.btn.btn-sm.btn-info @1132.5,260.8 76.9x30
  'acc-btn-sm': 'btn-sm',
  // :379 Export Badges ↔ [738] a.btn.btn.btn-default.mb @754.6,398.2 119.1x34
  'acc-btn-default': 'btn-default',
  // :372 Upload Image Badge ↔ [736] a.btn.btn-info.mb @573.1,398.2 177.7x34
  'acc-btn-info': 'btn-info',
  // :330 Manage ↔ [42] a.btn.btn-sm.btn-inverse @1213.3,260.8 81.5x30
  'acc-btn-inverse': 'btn-inverse',
  // :362 Add New Badge ↔ [735] a.btn.btn.btn-warning.mb @440.5,398.2 128.7x34
  'acc-btn-warning': 'btn-warning',
  // :553 Add Admin User ↔ [766] button.btn.btn-success.mb @440.5,643.6 129x34
  'acc-btn-success': 'btn-success',
  // :576 Add Admin User (submit) ↔ [783] button.btn.btn-primary; :641 API Docs ↔ [805] a.btn.btn-primary.mb
  'acc-btn-primary': 'btn-primary',
  // :549 Close Add Admin User ↔ [767] button.btn.btn-secondary.mb.ng-hide — never rendered in the
  // capture, so only its non-inherited values are evidence. That is enough: `.btn-secondary` is a
  // Bootstrap 4 name on a Bootstrap 3 sheet and the point of the class is the background it does
  // NOT get.
  'acc-btn-secondary': 'btn-secondary',
  // :421 Transparent ↔ [63] button.btn.btn-tiny.btn-default, inside the ng-hide badge editor
  'acc-btn-tiny': 'btn-tiny',
  // :352 New Room ↔ [47] a.btn.btn.btn-warning.mb.btn-block; login/+page.svelte:95 ↔ [849] button.btn.btn-block.btn-info.mb
  'acc-btn-block': 'btn-block',

  // :312 the State chip ↔ [35] div.label.label-orange @907.6,263.7 37.7x17.7 «open»;
  // :409 the badge preview ↔ [57] span.label «New Badge»; :510 the badge chip ↔ [749] div.label.label-badge-img
  'acc-label': 'label',
  // :552 `class="acc-label{badge.imageUrl ? ' acc-label-badge-img' : ''}"` ↔ [749]
  // div.label.label-badge-img @448.5,516.2 38.1x12.5 — the only label-badge-img node
  'acc-label-badge-img': 'label-badge-img',
  // :560 `<span class="acc-room-badge-name">` ↔ [752] span.room-badge-name.ng-binding
  'acc-room-badge-name': 'room-badge-name',
  // :565 `<span class="acc-room-badge-id">` ↔ [753] span.room-badge-id.ng-binding «(6a6f27a09cb16975cc8f132a)»
  'acc-room-badge-id': 'room-badge-id',
  // [35] carries label-orange and is the only node that does
  'acc-label-orange': 'label-orange',
  // [36] div.label.label-warning.ng-hide «archived»
  'acc-label-warning': 'label-warning',

  // :316 `<div class="acc-muted">{userCount} / {maxUsers}</div>` ↔ [38] div.text-muted.ng-binding
  // @999.9,260.8 115.7x20 «0 / 2»
  'acc-muted': 'text-muted',
  // login/+page.svelte:84 "Forgot your password?" ↔ [840] a.text-muted, inside the ng-hide login panel
  'acc-text-muted': 'text-muted',

  // :225 `col-md-4 acc-col-4 acc-panel` ↔ [7] div.col-md-4.panel.pane-default @424.5,134.8 380x36;
  // :258 ↔ [13], :361 ↔ [734], :543 ↔ [765], :631 ↔ [799] — all five div.*.panel.pane-default.
  // `pane-default` and not `panel`: `panel` is also worn by the two `.panel.panel-default`
  // collapsibles and by the login panel, which are different boxes. `pane-default` is a TYPO in the
  // reference (for `panel-default`) that matches no rule, so it names exactly the five dashboard
  // panels and nothing else.
  'acc-panel': 'pane-default',
  // :404 the badge editor ↔ [51] div.panel.panel-default.col-md-6.ng-hide; :559 ↔ [768] div.panel.panel-default.ng-hide
  'acc-panel-default': 'panel-default',
  // :405 ↔ [52] div.panel-heading; :560 ↔ [769]
  'acc-panel-heading': 'panel-heading',
  // :414 ↔ [58] div.panel-body; :561 ↔ [771]
  'acc-panel-body': 'panel-body',

  // :260 ↔ [15] table.table.table-striped.table-bordered.table-hover @440.5,191.8 1108x107;
  // :482 ↔ [741], :590 ↔ [786], :648 ↔ [806]. All four reference tables carry all four classes, so
  // any of them names the same set; `table` is the one our class is named after.
  'acc-table': 'table',
  // :259 ↔ [14] div.table-responsive @440.5,191.8 1108x107; :481 ↔ [740], :589 ↔ [785], :632 ↔ [800]
  'acc-table-responsive': 'table-responsive',

  // :362 `acc-btn acc-btn-warning acc-mb` ↔ [735] a.btn.btn.btn-warning.mb — the reference's `mb`
  'acc-mb': 'mb',
  // :457 `acc-btn acc-btn-warning acc-pull-right` ↔ [76] button.btn.btn.btn-warning.pull-right
  'acc-pull-right': 'pull-right',
  // :225 — our markup keeps the reference's own `col-md-4` alongside `.acc-col-4`; [7] is the node
  'acc-col-4': 'col-md-4',

  // :563 `<div class="acc-field">` wrapping label+input ↔ [773] div.form-group in the same add-admin form
  'acc-field': 'form-group',
  // login/+page.svelte:56 and :72 ↔ [832] div.form-group.has-feedback.mb and [836] div.form-group.has-feedback
  'acc-form-group': 'form-group',
  // login/+page.svelte:69 `<span class="acc-feedback">` ↔ [834] span.fa.fa-envelope.form-control-feedback.text-muted
  'acc-feedback': 'form-control-feedback',
  // login/+page.svelte:83 `<div class="acc-text-right">` ↔ [839] div.text-right.mt
  'acc-text-right': 'text-right',

  // components/AppFooter.svelte `.acc-page-footer` ↔ [853] div.p-lg.text-center.ng-scope
  // @424.5,1076 1140x91. `p-lg` names only that node; `text-center` is also on every centred <th>.
  'acc-page-footer': 'p-lg',

  // components/ControllerChrome.svelte:54 `class="acc-container acc-container-sm {intro}"`
  // ↔ [0] div.container.container-sm.animated.fadeInDown @409.5,50 1170x1117 — one element, and our
  // two classes both sit on it.
  'acc-container': 'container',
  'acc-container-sm': 'container-sm',

  // :501 `<img class="acc-badge-img">` ↔ [751] img.user-badge-img @452.5,513.5 30.1x20
  'acc-badge-img': 'user-badge-img',
  // :666 `<i class="fa fa-lock acc-text-warning">` ↔ [815] i.fa.fa-lock.text-warning.ng-hide
  'acc-text-warning': 'text-warning',
  // :278 and :290 `<i class="fa fa-sort-alpha-asc acc-sort-icon">` ↔ [19] and [21]
  // div.icon.fa.fa-sort-alpha-asc @523.4,214.8 13x14 — the only two fa-sort-alpha-asc nodes
  'acc-sort-icon': 'fa-sort-alpha-asc'
};

/**
 * Why a class our sheet styles is NOT in the mapping. Printed by the run, so the gap is visible
 * rather than implied by absence.
 */
const UNMAPPED_NOTES = {
  'acc-inner':
    'account/+page.svelte:189 is ONE element where the reference has three: [1] div.center-block.mt-xl, ' +
    '[2] an unclassed div, [3] div.app. Its padding-top:15px stands in for what those two wrappers ' +
    'contribute (the reference h4 sits at x=439.5 inside a node at 424.5), so comparing it to [1] alone ' +
    'would report a compensation as a bug.',
  'acc-center-block':
    'claims the same reference element as .acc-inner ([1] div.center-block.mt-xl) while declaring ' +
    'different metrics, and is used on the login/register pages, which this capture took logged IN. ' +
    'Two of our classes for one reference node is a question for a human, not a mapping.',
  'acc-h4': 'account/+page.svelte:207 ↔ [4] h4.ng-binding — styled by TAG in the reference, no class to key on.',
  'acc-h3': 'account/+page.svelte:359 ↔ [49] h3 with no class at all.',
  'acc-hr': 'account/+page.svelte:356 ↔ [48] hr with no class at all.',
  'acc-panel-title':
    'used on two different reference elements — [53] h3.panel-title in a panel heading and [828] ' +
    'p.pv.text-bold on the login panel — whose padding and font differ. One class, two counterparts.',
  'acc-api-label': 'account/+page.svelte:689 ↔ [755]/[757]/[818] <label> elements carrying NO class.',
  'acc-row-action':
    'the same box as .acc-api-label — account/+page.svelte:596/:695 ↔ [755]/[757]/[759] <label> ' +
    'elements with no class, styled by TAG in bootstrap.min.css.',
  'acc-badge-editor':
    'account/+page.svelte:404 ↔ [51] div.panel.panel-default.col-md-6.ng-hide. Every class on that ' +
    'node is already mapped (.acc-panel-default, and col-md-6 is on the login column too), so this ' +
    'is our own alias for the element rather than a counterpart of a reference class.',
  'acc-link': 'account/+page.svelte:698 ↔ [756]/[819] bare <a> elements carrying no class.',
  'acc-clickable': 'account/+page.svelte:209 ↔ [5] a <span> with no class.',
  'acc-badge-preview': 'account/+page.svelte:407 ↔ [55] an <h4> with no class.',
  'acc-toolbar':
    'account/+page.svelte:350 is a <form>; the reference puts the New Room button in [46] ' +
    'div.col-md-2.ng-hide with no toolbar element at all.',
  'acc-search': 'account/+page.svelte:227 shares its element with .acc-input; [8] carries only form-control.',
  'acc-mt-15': 'account/+page.svelte:589 ↔ [785], whose 15px comes from an inline style attribute, not a class.',
  'acc-btn-danger':
    'no .btn-danger anywhere in the account capture. The reference renders Delete as a bare <a> inside ' +
    'a <label> ([757]/[758]), and its admin table is empty. Our red button is a deliberate departure, ' +
    'so there is nothing on this page to check it against.',
  'acc-panel-narrow': 'ours — the reference leaves the auth form in a full-width .col-md-6 (login/+page.svelte:45).',
  'acc-hint': 'ours — the reference opens a bootbox for API-key restrictions and has no hint text.',
  'acc-scope': 'ours — same restrictions editor; no counterpart.',
  'acc-restrictions': 'ours — same restrictions editor; no counterpart.',
  'acc-error': 'ours — the reference surfaces login failures through bootbox, not an inline <p>.',
  'acc-empty': 'ours.',
  'acc-logging-in': 'login/+page.svelte:105 ↔ [852] a <label> with no class.',
  'acc-brand-lockup': 'register page only; no counterpart in this capture.',
  'acc-form-note': 'register page only; no counterpart in this capture.',
  'acc-checkbox': 'register page only; no .c-checkbox node in this capture.',
  'acc-body': 'our wrapper stands in for <body>, which the collector does not capture as a node.'
};

/* ══ 3. Reading the stylesheet ═════════════════════════════════════════════════════════════════ */

/**
 * A brace-matching reader rather than one regex, because `account.css` nests.
 *
 * A flat `([^{}]+)\{([^}]*)\}` sweep reports `@media (min-width: 992px) { .acc-container` as a
 * selector and then loses the closing brace, which is how a nested rule ends up judged under the
 * wrong media — or a `@keyframes` step ends up judged as a class.
 */
function parseRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [];
  let buffer = '';
  let index = 0;

  while (index < stripped.length) {
    const character = stripped[index];
    if (character === '{') {
      const prelude = buffer.trim();
      buffer = '';
      if (prelude.startsWith('@')) {
        stack.push(prelude);
        index += 1;
        continue;
      }
      const end = stripped.indexOf('}', index);
      rules.push({ selector: prelude, body: stripped.slice(index + 1, end), at: [...stack] });
      index = end + 1;
      continue;
    }
    if (character === '}') {
      stack.pop();
      buffer = '';
      index += 1;
      continue;
    }
    buffer += character;
    index += 1;
  }
  return rules;
}

/**
 * Does this rule apply in the conditions the capture was taken in?
 *
 * 1989px wide, on screen, no reduced-motion preference. A `max-width: 767px` rule and a `print`
 * rule describe a page nobody measured, so judging them against this capture would be comparing our
 * phone layout to their desktop one. A `min-width: 992px` rule DOES apply and must be read, which
 * is why they cannot simply all be skipped.
 */
const VIEWPORT_WIDTH = run.viewport?.w ?? 1989;

function applies(atRules) {
  return atRules.every((query) => {
    if (!query.startsWith('@media')) return false; // @keyframes and anything else: not a page rule
    const text = query.slice('@media'.length).toLowerCase();
    if (text.includes('print') || text.includes('prefers-reduced-motion')) return false;
    const min = /min-width:\s*(\d+(?:\.\d+)?)px/.exec(text);
    if (min && Number(min[1]) > VIEWPORT_WIDTH) return false;
    const max = /max-width:\s*(\d+(?:\.\d+)?)px/.exec(text);
    if (max && Number(max[1]) < VIEWPORT_WIDTH) return false;
    return true;
  });
}

const rules = parseRules(rawCss).filter((rule) => applies(rule.at));

/** Split on top-level whitespace or commas — `rgba(0, 0, 0, .05)` must survive as one token. */
function tokenise(value, separator) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    const isSeparator = depth === 0 && (separator === ',' ? character === ',' : /\s/.test(character));
    if (isSeparator) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const EDGES = ['top', 'right', 'bottom', 'left'];
const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const LINE_STYLES = /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/;
const COLOURISH = /^(#|rgb|rgba|hsl|hsla|transparent$|currentcolor$)/i;

/** 1-4 values, in CSS box order. `padding: 6px 18px` is the declaration the eleven-divergence read
 *  flagged, so this shorthand is not optional. */
function box(values) {
  const [a, b = a, c = a, d = b] = values;
  return [a, b, c, d];
}

/**
 * Shorthands this reader expands, and only these.
 *
 * Anything not listed is compared only when written longhand. Half-understanding a shorthand is how
 * a checker starts lying, so `outline`, `font`, `flex`, `transition` and `box-shadow` are left
 * alone — their serialisations differ from the CSSOM's in ways that would produce noise rather than
 * findings.
 */
function expand(property, value) {
  const out = {};
  const words = tokenise(value, ' ');

  if (property === 'padding' || property === 'margin') {
    if (words.length < 1 || words.length > 4) return out;
    box(words).forEach((v, i) => (out[`${property}-${EDGES[i]}`] = v));
    return out;
  }

  if (property === 'border-width' || property === 'border-style' || property === 'border-color') {
    const kind = property.split('-')[1];
    if (words.length < 1 || words.length > 4) return out;
    box(words).forEach((v, i) => (out[`border-${EDGES[i]}-${kind}`] = v));
    return out;
  }

  if (property === 'border-radius') {
    if (value.includes('/') || words.length < 1 || words.length > 4) return out;
    const [tl, tr = tl, br = tl, bl = tr] = words;
    [tl, tr, br, bl].forEach((v, i) => (out[`border-${CORNERS[i]}-radius`] = v));
    return out;
  }

  if (property === 'border' || (property.startsWith('border-') && EDGES.includes(property.slice(7)))) {
    const edges = property === 'border' ? EDGES : [property.slice(7)];
    /*
      `border: 0` is a complete reset: width 0, style none, colour back to currentcolor. Writing
      only the width would leave the style unstated and let the paintless check below fire on a
      rule that is perfectly correct.
    */
    if (words.length === 1 && /^0(px|em|rem)?$/.test(words[0])) {
      for (const edge of edges) {
        out[`border-${edge}-width`] = '0px';
        out[`border-${edge}-style`] = 'none';
      }
      return out;
    }
    for (const word of words) {
      if (LINE_STYLES.test(word)) for (const edge of edges) out[`border-${edge}-style`] = word;
      else if (COLOURISH.test(word) || word.startsWith('var('))
        for (const edge of edges) out[`border-${edge}-color`] = word;
      else if (/^[\d.]+(px|em|rem)$/.test(word) || /^(thin|medium|thick)$/.test(word))
        for (const edge of edges) out[`border-${edge}-width`] = word;
    }
    return out;
  }

  if (property === 'background') {
    // Only the two unambiguous forms. `background: none` resets background-color to transparent,
    // which the CSSOM reports as `rgba(0, 0, 0, 0)`; anything with a position or an image in it is
    // left unexpanded rather than half-read.
    if (words.length === 1 && words[0].toLowerCase() === 'none') out['background-color'] = 'transparent';
    else if (words.length === 1 && (COLOURISH.test(words[0]) || words[0].startsWith('var(')))
      out['background-color'] = words[0];
    return out;
  }

  if (property === 'overflow') {
    if (words.length === 1) {
      out['overflow-x'] = words[0];
      out['overflow-y'] = words[0];
    } else if (words.length === 2) {
      out['overflow-x'] = words[0];
      out['overflow-y'] = words[1];
    }
    return out;
  }

  if (property === 'text-decoration') {
    if (words.length === 1) out['text-decoration-line'] = words[0];
    return out;
  }

  out[property] = value.trim();
  return out;
}

/** Properties worth judging: the ones the capture pins reliably and a stylesheet states outright. */
const JUDGED = new Set([
  'color',
  'background-color',
  ...EDGES.map((e) => `border-${e}-color`),
  ...EDGES.map((e) => `border-${e}-style`),
  ...EDGES.map((e) => `border-${e}-width`),
  ...CORNERS.map((c) => `border-${c}-radius`),
  ...EDGES.map((e) => `padding-${e}`),
  ...EDGES.map((e) => `margin-${e}`),
  'font-size',
  'font-weight',
  'font-style',
  'font-family',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration-line',
  'white-space',
  'vertical-align',
  'display',
  'float',
  'position',
  'cursor',
  'opacity',
  'overflow-x',
  'overflow-y',
  'box-sizing',
  'object-fit',
  'user-select',
  'pointer-events',
  'list-style-type',
  'resize'
]);

/** Custom properties, read out of the sheet under test so `var(--acc-ink)` and `rgb(51,51,51)` do
 *  not read as a disagreement. A gate that cries wolf is one that gets switched off. */
const customProperties = new Map(
  [...rawCss.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()])
);

/**
 * Values a stylesheet and a computed style write differently while meaning the same thing.
 *
 * Every conversion here is an identity. Nothing is rounded and no near-match is accepted: the whole
 * point is that `rgb(254,86,33)` and `rgb(255,204,0)` must never compare equal.
 */
function canonical(value, property) {
  let out = String(value).replace(/\s+/g, ' ').trim().toLowerCase();

  const variable = /^var\((--[a-zA-Z0-9_-]+)\)$/.exec(out);
  if (variable && customProperties.has(variable[1])) out = customProperties.get(variable[1]).toLowerCase();

  if (out === 'transparent') return 'rgba(0, 0, 0, 0)';

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(out);
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // A bare `0` is `0px` for every length judged here.
  if (out === '0' && /width|radius|padding|margin|size|height|spacing/.test(property)) return '0px';

  // The CSSOM serialises font stacks with double quotes.
  if (property === 'font-family') out = out.replace(/'/g, '"');

  return out.replace(/,\s*/g, ', ');
}

/**
 * Values that cannot be judged without the cascade this file deliberately does not model.
 *
 * `auto` is context-dependent for a margin or a size — `margin: 0 auto` computes to whatever the
 * centring worked out to — but it is a REAL, checkable value for `cursor` and `overflow`, so it
 * cannot be blanket-listed the way the manage verifier lists it.
 */
function unjudgeable(value, property) {
  if (['inherit', 'currentcolor', 'initial', 'unset', 'revert'].includes(value)) return true;
  if (value === 'auto' && (property.startsWith('margin-') || SIZE.has(property))) return true;

  /*
    A RELATIVE length resolves against a parent this file does not know.

    `.acc-label { font-size: 75% }` is Bootstrap's own declaration, transcribed correctly, and the
    capture reports the resolved `10.5px` — 75% of the 14px it inherited in that cell. Comparing the
    two reported a divergence that does not exist, on three properties at once (`font-size: 75%`,
    `line-height: 1`, `border-radius: .25em`), which is exactly the sort of noise that gets a gate
    switched off. The cost is real and stated: a wrong `padding: .5em` goes unjudged here.
  */
  if (/[\d.]\s*(%|em|rem|ex|ch|vw|vh|vmin|vmax)$/.test(value)) return true;
  if (property === 'line-height' && /^[\d.]+$/.test(value)) return true;
  return false;
}

/* ══ 4. Which declaration actually wins ════════════════════════════════════════════════════════ */

/** Every rule whose selector list contains the bare `.class` selector and nothing else for it. */
function bareBlocksFor(className) {
  return rules.filter((rule) => tokenise(rule.selector, ',').some((selector) => selector.trim() === `.${className}`));
}

/**
 * `\b` is the WRONG boundary for a CSS class name.
 *
 * A word boundary sits between `e` and `-`, so `\.acc-btn\b` matches inside `.acc-btn-sm` — and
 * `.acc-btn-sm` is a different class, not an override of `.acc-btn`. Get this wrong and `.acc-btn`
 * becomes unjudgeable for padding, font-size, line-height and border-radius, because `.acc-btn-sm`
 * restates all four. A class name ends where `[A-Za-z0-9_-]` stops.
 */
function mentions(selector, className) {
  return new RegExp(`\\.${className}(?![\\w-])`).test(selector);
}

/** A state rule is not an override of the resting state: the capture is entirely at rest. Counting
 *  `.acc-btn-default:hover`'s background as an override would make the resting background of every
 *  variant unjudgeable, which is precisely how the manage verifier's first control failed to fire. */
const STATE = /:(hover|focus|active|visited|disabled|checked|focus-visible|first-child|last-child|nth-)|\[disabled\]/;

/** The shorthands that would also set this longhand, so `border: 0` counts as declaring
 *  `border-top-width`. The manage verifier only looked one level up and would have missed it. */
function aliases(property) {
  const out = [property];
  const edge = /^border-(top|right|bottom|left)-(color|width|style)$/.exec(property);
  if (edge) out.push(`border-${edge[2]}`, `border-${edge[1]}`, 'border');
  const corner = /^border-(top-left|top-right|bottom-right|bottom-left)-radius$/.exec(property);
  if (corner) out.push('border-radius');
  const boxed = /^(padding|margin)-(top|right|bottom|left)$/.exec(property);
  if (boxed) out.push(boxed[1]);
  if (property === 'background-color') out.push('background');
  if (property === 'overflow-x' || property === 'overflow-y') out.push('overflow');
  if (property === 'text-decoration-line') out.push('text-decoration');
  return out;
}

const declares = (body, property) => aliases(property).some((name) => new RegExp(`(^|;|\\s)${name}\\s*:`).test(body));

/**
 * A MORE SPECIFIC selector also setting this property means the cascade lands somewhere this file
 * cannot see, so the base rule is not judged. It bends toward silence rather than toward a false
 * alarm. It deliberately does NOT hide a duplicate of the same bare selector — two `.acc-input`
 * blocks disagreeing would be a real defect.
 */
function overriddenElsewhere(className, property) {
  for (const rule of rules) {
    const selectors = tokenise(rule.selector, ',');
    if (selectors.some((selector) => selector.trim() === `.${className}`)) continue;
    if (!selectors.some((selector) => mentions(selector, className) && !STATE.test(selector))) continue;
    if (declares(rule.body, property)) return true;
  }
  return false;
}

/** Read a block into property -> {value, important}, last-wins, with `!important` beating source order. */
function declarationsOf(body) {
  const found = new Map();
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;
    const property = declaration.slice(0, colon).trim();
    let value = declaration.slice(colon + 1).trim();
    if (!property || !value || property.startsWith('--')) continue;
    const important = /!important/.test(value);
    value = value.replace(/!important/g, '').trim();
    const previous = found.get(property);
    if (previous && previous.important && !important) continue;
    found.set(property, { value, important });
  }
  return found;
}

/* ══ 5. The comparison ═════════════════════════════════════════════════════════════════════════ */

const divergences = [];
const sizeFindings = [];
const splits = [];
let compared = 0;
let mappedWithEvidence = 0;

/**
 * What our sheet declares for each mapped class, per property, after the cascade this file does
 * model: equal-specificity source order, with `!important` winning.
 *
 * account.css writes `.acc-container` three times — 750px, 970px, 1170px, one per breakpoint — and
 * all three apply at 1989px. Judging each separately would report two divergences against a
 * measurement only the last one is responsible for.
 */
const winningByClass = new Map();
for (const ourClass of Object.keys(MAPPING)) {
  const winning = new Map();
  for (const block of bareBlocksFor(ourClass)) {
    for (const [property, { value, important }] of declarationsOf(block.body)) {
      for (const [name, expanded] of Object.entries(expand(property, value))) {
        const previous = winning.get(name);
        if (previous && previous.important && !important) continue;
        winning.set(name, { value: expanded, important, wrote: `${property}: ${value}` });
      }
    }
  }
  winningByClass.set(ourClass, winning);
}

const ourClassFor = new Map(Object.entries(MAPPING).map(([ours, theirs]) => [theirs, ours]));

/**
 * Is a disagreement among a class's nodes already accounted for by ANOTHER class we model?
 *
 * `.btn` measures 5px of padding on some nodes and 6px on others — not because Bootstrap is
 * inconsistent, but because the 5px ones also wear `.btn-sm`, which we model as `.acc-btn-sm` and
 * which declares that padding itself. Reporting those as "one class, two renderings" filled the
 * output with sixteen entries about `.acc-btn` and buried the two that mattered.
 *
 * So a value group is explained when every node in it wears some other class that we map AND whose
 * rule in this sheet states the property. Anything left is a genuine case of one of our classes
 * standing in for elements the reference renders differently, with nothing in our sheet to tell
 * them apart.
 */
function unexplainedSplit(referenceClass, property) {
  const nodes = (nodesByClass.get(referenceClass) ?? []).filter((node) => {
    if (SIZE.has(property)) return node.rendered && node.style[property] !== 'auto';
    if (!node.rendered && INHERITED.has(property)) return false;
    if (!node.rendered && (property === 'display' || property === 'visibility')) return false;
    return node.style[property] !== undefined;
  });
  const groups = new Map();
  for (const node of nodes) {
    const value = node.style[property];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(node);
  }
  if (groups.size < 2) return false;

  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [, members] of ordered.slice(1)) {
    const explained = members.every((node) =>
      [...node.tokens].some((token) => {
        if (token === referenceClass) return false;
        const sibling = ourClassFor.get(token);
        return sibling !== undefined && winningByClass.get(sibling)?.has(property);
      })
    );
    if (!explained) return [...groups.keys()].sort();
  }
  return false;
}

for (const [ourClass, referenceClass] of Object.entries(MAPPING)) {
  const measured = contract.get(referenceClass);
  const measuredSizes = sizeContract.get(referenceClass);
  if (!measured) continue;
  mappedWithEvidence += 1;

  for (const [property, { value, wrote }] of winningByClass.get(ourClass)) {
    const ours = canonical(value, property);
    if (unjudgeable(ours, property)) continue;

    if (SIZE.has(property)) {
      // Only a fixed length is worth comparing to a used size; `100%` of a different parent is not.
      if (!/^[\d.]+px$/.test(ours)) continue;
      const expected = measuredSizes?.get(property);
      if (expected === undefined) continue;
      if (canonical(expected, property) !== ours) {
        sizeFindings.push({
          ourClass,
          referenceClass,
          property,
          ours: value,
          captured: expected,
          nodes: renderedCount.get(referenceClass) ?? 0
        });
      }
      continue;
    }

    if (!JUDGED.has(property)) continue;
    if (overriddenElsewhere(ourClass, property)) continue;

    const expected = measured.get(property);
    if (expected === undefined) {
      const conflict = disagreements.get(referenceClass)?.get(property) && unexplainedSplit(referenceClass, property);
      if (conflict) {
        splits.push({
          ourClass,
          referenceClass,
          property,
          ours: value,
          measured: conflict,
          nodes: nodeCount.get(referenceClass) ?? 0
        });
      }
      continue;
    }

    compared += 1;
    if (canonical(expected, property) !== ours) {
      divergences.push({
        ourClass,
        referenceClass,
        property,
        wrote,
        ours: value,
        resolved: ours === value.trim().toLowerCase() ? null : ours,
        captured: expected,
        nodes: nodeCount.get(referenceClass) ?? 0
      });
    }
  }
}

/* ══ 6. A width with no style paints NOTHING ═══════════════════════════════════════════════════
 *
 * The one check that does not compare against the capture, because it does not need to: it is wrong
 * on its own terms. `border-*-style` initialises to `none`, and a `none` border has a used width of
 * zero whatever the declared width says. A rule that sets a width and never sets a style — not in
 * that block, not through a shorthand — is a line the author believes they drew and the browser
 * never draws.
 *
 * It is invisible to the comparison above, which starts from what we wrote: there is no wrong
 * declaration to catch, only an absent one. In `manage.css` this went undetected for the whole life
 * of that gate, on the rule under every table heading on the page.
 *
 * Every selector is scanned, not just the mapped ones — the manage bug was on a descendant selector
 * and would otherwise have stayed out of reach.
 */

/**
 * The style may be supplied by a DIFFERENT rule that also matches the same element.
 *
 * The first cut of this looked only inside the block holding the width, and reported two defects
 * that were mine, not the sheet's:
 *
 *   `.acc-tooltip.tooltip.bottom .tooltip-arrow { border-width: 0 5px 5px }` — the style comes from
 *   `.acc-tooltip .tooltip-arrow { border-style: solid }` four rules above it;
 *   `.acc-table > thead > tr > th { border-bottom-width: 1px }` — the style comes from the group
 *   rule listing that exact selector with `border: 1px solid var(--acc-cell-rule)`.
 *
 * Reporting either would have sent the owner to look at working code. So a rule B is taken to also
 * match A's elements when every class-or-tag token in B's selector also appears in A's, AND B's
 * final compound is a subset of A's final compound — which is true for both cases above and false
 * for an unrelated rule. State rules are excluded: a `:hover` border-style is not the resting one.
 */
function tokensOf(selector) {
  return new Set([
    ...[...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => `.${m[1]}`),
    ...[...selector.matchAll(/(^|[\s>+~])([a-zA-Z][a-zA-Z0-9]*)/g)].map((m) => m[2])
  ]);
}
const finalCompound = (selector) =>
  tokensOf(
    selector
      .split(/[\s>+~]+/)
      .filter(Boolean)
      .pop() ?? ''
  );
const isSubset = (a, b) => [...a].every((x) => b.has(x));

function styleSuppliedElsewhere(rule, edge) {
  for (const other of rules) {
    if (other === rule) continue;
    const supplies = declarationsOf(other.body);
    const expanded = new Map();
    for (const [property, { value }] of supplies) {
      for (const [name, v] of Object.entries(expand(property, value))) expanded.set(name, v);
    }
    if (!expanded.get(`border-${edge}-style`)) continue;
    for (const theirs of tokenise(other.selector, ',')) {
      if (STATE.test(theirs)) continue;
      for (const ours of tokenise(rule.selector, ',')) {
        if (isSubset(tokensOf(theirs), tokensOf(ours)) && isSubset(finalCompound(theirs), finalCompound(ours))) {
          return true;
        }
      }
    }
  }
  return false;
}

const paintless = [];
for (const rule of rules) {
  const found = declarationsOf(rule.body);
  const expanded = new Map();
  for (const [property, { value }] of found) {
    for (const [name, v] of Object.entries(expand(property, value))) expanded.set(name, v);
  }
  for (const edge of EDGES) {
    const width = expanded.get(`border-${edge}-width`);
    if (!width || /^0(px|em|rem)?$/.test(width)) continue;
    if (expanded.get(`border-${edge}-style`)) continue;
    if (styleSuppliedElsewhere(rule, edge)) continue;
    paintless.push({ selector: rule.selector.replace(/\s+/g, ' '), edge, width, kind: 'border' });
  }
  const outlineWidth = found.get('outline-width')?.value;
  if (outlineWidth && !/^0(px|em|rem)?$/.test(outlineWidth) && !found.has('outline-style') && !found.has('outline')) {
    paintless.push({
      selector: rule.selector.replace(/\s+/g, ' '),
      edge: 'outline',
      width: outlineWidth,
      kind: 'outline'
    });
  }
}

/* ══ 7. Report ═════════════════════════════════════════════════════════════════════════════════ */

/** Every class this sheet gives a bare `.class { … }` block to, which is the set a mapping could
 *  ever cover. Anything here and not in MAPPING is a hole, and holes get named. */
const styledClasses = new Set();
for (const rule of rules) {
  for (const selector of tokenise(rule.selector, ',')) {
    const bare = /^\.([a-zA-Z0-9_-]+)$/.exec(selector.trim());
    if (bare) styledClasses.add(bare[1]);
  }
}
const unmapped = [...styledClasses].filter((c) => !(c in MAPPING)).sort();

const pinnedFacts = [...contract.values()].reduce((n, props) => n + props.size, 0);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      generatedFrom: {
        capture: CAPTURE,
        sha256: createHash('sha256').update(readFileSync(CAPTURE)).digest('hex').slice(0, 16),
        captures: ACCOUNT_CAPTURES,
        nodes: ingestedNodes,
        viewport: run.viewport
      },
      mapping: MAPPING,
      unmappedNotes: UNMAPPED_NOTES,
      classes: contract.size,
      pinnedFacts,
      contract: Object.fromEntries(
        [...contract]
          .filter(([token]) => Object.values(MAPPING).includes(token))
          .map(([token, props]) => [
            token,
            {
              nodes: nodeCount.get(token) ?? 0,
              rendered: renderedCount.get(token) ?? 0,
              style: Object.fromEntries([...props].sort()),
              size: Object.fromEntries([...(sizeContract.get(token) ?? new Map())].sort()),
              disagreements: Object.fromEntries([...(disagreements.get(token) ?? new Map())].sort())
            }
          ])
      )
    },
    null,
    2
  )}\n`
);

console.log(
  `account.css vs capture: ${compared} declarations compared against ${pinnedFacts} pinned facts ` +
    `from ${ingestedNodes} nodes; ${mappedWithEvidence}/${Object.keys(MAPPING).length} mapped classes ` +
    `have evidence`
);

if (splits.length) {
  console.log(`\nONE CLASS, TWO RENDERINGS: ${splits.length} — advisory\n`);
  console.log(
    '  our class declares one value where the reference nodes it maps to measure several. Not a\n' +
      '  divergence — there is no single measurement to diverge from — but it means the class is\n' +
      '  standing in for elements the reference styles differently.\n'
  );
  for (const s of splits.sort((a, b) => b.nodes - a.nodes)) {
    console.log(`  .${s.ourClass} -> .${s.referenceClass}  (${s.nodes} nodes)  ${s.property}`);
    console.log(`      ours     ${s.ours}`);
    console.log(`      captured ${s.measured.join('  |  ')}`);
  }
}

if (sizeFindings.length) {
  console.log(`\nFIXED SIZE vs MEASURED: ${sizeFindings.length} — advisory\n`);
  console.log(
    '  a fixed length in our sheet against the used size of the rendered reference node. A used\n' +
      '  size depends on the content that was in the element, so this is a prompt to look, not proof.\n'
  );
  for (const s of sizeFindings) {
    console.log(`  .${s.ourClass} -> .${s.referenceClass}  (${s.nodes} rendered)  ${s.property}`);
    console.log(`      ours     ${s.ours}`);
    console.log(`      captured ${s.captured}`);
  }
}

if (unmapped.length) {
  console.log(`\nNOT GATED: ${unmapped.length} classes have a rule here and no evidence-backed counterpart\n`);
  for (const name of unmapped) {
    const note = UNMAPPED_NOTES[name];
    console.log(`  .${name}${note ? `\n      ${note}` : ''}`);
  }
}

if (paintless.length) {
  console.error(`\nBORDERS THAT CANNOT PAINT: ${paintless.length}\n`);
  for (const p of paintless) {
    console.error(`  ${p.selector}`);
    console.error(`      border-${p.edge}-width: ${p.width}  with no ${p.kind}-style — used width is 0`);
  }
}

if (divergences.length) {
  // Most-used class first: a wrong value on a class worn by 12 nodes is 12 wrong things on screen.
  divergences.sort((a, b) => b.nodes - a.nodes);
  console.error(`\nDIVERGENCES: ${divergences.length}\n`);
  for (const d of divergences) {
    console.error(`  .${d.ourClass} -> .${d.referenceClass}  (${d.nodes} nodes)  ${d.property}`);
    console.error(`      ours     ${d.ours}${d.resolved ? '  -> ' + d.resolved : ''}   [${d.wrote}]`);
    console.error(`      captured ${d.captured}`);
  }
}

if (divergences.length || paintless.length) process.exit(1);

console.log('\nno divergence between a declared value and its measurement, and every declared border can paint');
