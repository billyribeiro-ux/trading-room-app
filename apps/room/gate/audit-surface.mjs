#!/usr/bin/env node
/*
  ONE REFERENCE COMPONENT AGAINST THE FILES THAT IMPLEMENT IT — const values and text literals.

  ## Why this exists, and what it replaces

  `todo-next.md` asks for a per-surface read: *"read the reference component end to end at verified
  boundaries, transcribe every const by value, then measure ours and list the gaps."* Thirty-odd
  surfaces remain, and until 2026-09-01 each was done by hand — dump the const table, eyeball it
  against the component, hope nothing was skipped. Two audits done that way on the same day found
  real gaps (`PAM-11`'s seven classes, and the Repeat select shipping with no classes at all), which
  is the argument for the method; doing it thirty more times by eye is the argument for a script.

  ## Why it is not `reference-const-coverage-contract.test.ts`

  That sweep asks a different question and cannot answer this one. It searches the WHOLE application
  for each value, so `form-select`, `d-flex` and `m-0` count as present because they occur somewhere
  — while being absent from the component under audit. Its own comment records the limitation. This
  script scopes the search to the files that implement ONE surface, which is what makes a
  per-component gap visible at all.

  It also reads TEXT LITERALS (`v(n,"…")`), which the sweep does not read at any scope: they are not
  in the const table. "No room files found." is absent from this room deliberately and could never
  have appeared in that sweep's output either way.

  ## What it does NOT decide

  It reports CANDIDATES, and the false-alarm rate is real — the same three causes every time:

    * a value we render from a variable (`class={active ? 'a' : 'b'}` never contains `"a b"`);
    * a value that lives in a fifth file the `--files` list did not name;
    * a value this repository refuses on purpose, with its reason already written down.

  So the output is the start of a read, not a verdict. Every gap it prints is either built, or given
  a recorded reason, by a person. `audit-feature-coverage.mjs` states the same caveat about its own
  output and measured a 21% false-gap rate; this one is scoped tighter but is not a decision
  procedure either.

  ## Usage

    node gate/audit-surface.mjs --selector app-post-alert-modal \
      --files src/lib/components/PostAlertModal.svelte,src/lib/components/ScheduledAlerts.svelte

    node gate/audit-surface.mjs --from 1449150 --to 1451150 --files src/lib/components/ChatSearchBar.svelte

  `--selector` finds `selectors:[["name"]]` and reads from its `consts:[` to its `,template:function`.
  `--from`/`--to` take a byte range instead, for a REGION of a large component — `#files` lives inside
  `app-presentationarea` and has no selector of its own.
*/

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOM = dirname(fileURLToPath(new URL('.', import.meta.url)));
const EVIDENCE = join(ROOM, 'docs/source-v4-2026-08-15');
const BUNDLE = 'main.d1d09071be31f1ba.js';

/**
 * The bundle, verified against the `sha256sums.txt` committed beside it.
 *
 * Copied in shape from `audit-feature-coverage.mjs` rather than imported, and the duplication is
 * deliberate: this is nine lines, and a shared helper would make one script's evidence check
 * depend on the other script continuing to exist. Both fail loudly on drift, which is the property
 * that matters.
 */
function readVerifiedBundle() {
  const sums = readFileSync(join(EVIDENCE, 'sha256sums.txt'), 'utf8');
  const pinned = sums
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name === BUNDLE)?.[0];
  if (!pinned) throw new Error(`sha256sums.txt does not pin ${BUNDLE}`);
  const bytes = readFileSync(join(EVIDENCE, BUNDLE));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `${BUNDLE} does not match its pin.\n  pinned ${pinned}\n  actual ${actual}\n` +
        'Every byte offset recorded in this repository is against the pinned bytes. Do not re-pin.'
    );
  }
  return bytes.toString('utf8');
}

/**
 * Angular's own attribute and binding vocabulary, which is machinery rather than surface.
 *
 * Deny-by-default the other way round from most lists here: everything NOT named is reported, so a
 * name added carelessly hides a real gap. Each entry is either an Angular directive, a DOM attribute
 * NAME (the VALUES are still reported), or a bare HTML type token.
 */
const FRAMEWORK = new Set([
  // Angular bindings and directives
  'ngModel',
  'ngModelChange',
  'ngModelOptions',
  'ngClass',
  'ngStyle',
  'ngIf',
  'ngForOf',
  'ngSwitch',
  'ngbTooltip',
  'ngbPopover',
  'ngbDropdown',
  'ngbDropdownMenu',
  'ngbDropdownToggle',
  'emojiSelect',
  'formControlName',
  'placement',
  'container',
  'autoClose',
  'popoverClass',
  'triggers',
  // event names
  'click',
  'change',
  'paste',
  'focus',
  'blur',
  'input',
  'submit',
  'keyup',
  'keydown',
  'keypress',
  'keydown.enter',
  'mouseenter',
  'mouseleave',
  'scroll',
  'load',
  'error',
  // attribute NAMES — their values are still measured
  'type',
  'id',
  'name',
  'href',
  'src',
  'alt',
  'title',
  'value',
  'placeholder',
  'rows',
  'cols',
  'for',
  'role',
  'target',
  'download',
  'multiple',
  'accept',
  'selected',
  'checked',
  'disabled',
  'hidden',
  'spellcheck',
  'minlength',
  'maxlength',
  'tabIndex',
  'tabindex',
  'style',
  'colspan',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-selected',
  'aria-expanded',
  'aria-hidden',
  'aria-modal',
  'aria-live',
  'aria-current',
  'data-bs-toggle',
  'data-bs-target',
  'data-bs-dismiss',
  'data-bs-parent',
  // bare token values
  'true',
  'false',
  'button',
  'text',
  'checkbox',
  'radio',
  'url',
  'email',
  'file',
  'password',
  'submit',
  'reset',
  'tab',
  'tablist',
  'tabpanel',
  'dialog',
  'document',
  'top',
  'left',
  'right',
  'bottom',
  'auto',
  'outside',
  'body',
  'manual',
  'none',
  'block',
  'both',
  '_blank',
  '_self'
]);

/**
 * Top-level entries of a `[[…],[…]]` const table, split without eval.
 *
 * @param {string} table
 * @returns {string[]}
 */
function splitTable(table) {
  const out = [];
  let depth = 0;
  let cur = '';
  let inString = false;
  let escaped = false;
  for (const ch of table.slice(1, -1)) {
    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      cur += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      cur += ch;
      continue;
    }
    if (!inString) {
      if (ch === '[') depth += 1;
      else if (ch === ']') depth -= 1;
      else if (ch === ',' && depth === 0) {
        out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Comments stripped PER FILE, then joined.
 *
 * Per file and not on the concatenation, and this is a bug that was made and caught on 2026-09-01:
 * joining first lets an unbalanced `/*` in one file pair with a `*` + `/` in the next, and 30 KB of
 * a 47 KB corpus disappeared. Every value then reported as absent, and the run looked like a
 * catastrophic gap rather than like a broken script.
 */
/**
 * @param {string[]} paths
 * @returns {string}
 */
function readOurs(paths) {
  return paths
    .map((path) => readFileSync(join(ROOM, path), 'utf8'))
    .map((source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ''))
    .map(decodeEntities)
    .join('\n');
}

/**
 * `\\xNN` and `\\uNNNN` in a bundle literal, resolved to the character they denote.
 *
 * The mirror of `decodeEntities`, and the same failure in the other direction. The capture's chat
 * header reads `v(1,"\\xa0Chat")` — four source characters for one non-breaking space — and this room
 * writes `&nbsp;Chat`. Decoding one side only leaves them unequal, so both sides are normalised and
 * the value is reported in its ORIGINAL spelling, because that is what a reader will grep for.
 *
 * Found by a run rather than by design: `\\xa0Chat` was the last false alarm left after the entity
 * decoder went in, and it belongs to `acA-11`, which was built and documented months earlier.
 */
/**
 * @param {string} value
 * @returns {string}
 */
function unescapeJs(value) {
  return value
    .replace(/\\x([0-9a-fA-F]{2})/g, (/** @type {string} */ _, /** @type {string} */ hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (/** @type {string} */ _, /** @type {string} */ hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/**
 * The five HTML entities this room writes, decoded before comparison.
 *
 * `Send on this date & time:` is in the capture and `Send on this date &amp; time:` is in our
 * markup — the same rendered text and not the same string, so a raw search reports a gap that a
 * person then has to rule out by opening the file. It happened on the very first run.
 *
 * Only the named five, and deliberately not a general decoder: `&#8212;` and friends do not appear
 * in this room's markup, and a decoder broad enough to be "safe" would start rewriting text that is
 * genuinely different.
 */
/**
 * @param {string} source
 * @returns {string}
 */
function decodeEntities(source) {
  return source
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&nbsp;', '\u00a0');
}

/**
 * @param {string[]} argv
 * @returns {{ selector?: string; from?: string; to?: string; files?: string; json?: string }}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--')) throw new Error(`expected a --flag, got ${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (!args.files) throw new Error('--files is required: a comma-separated list of source paths');
  if (!args.selector && !(args.from && args.to)) {
    throw new Error('give either --selector <app-name> or --from <byte> --to <byte>');
  }
  return args;
}

/**
 * Audit ONE surface, and return the report rather than printing it.
 *
 * Exported so `surface-audit-contract.test.ts` can PIN each audited surface's result: once a surface
 * is read and its remaining gaps given reasons, the pinned list is what stops the next change
 * re-opening one silently. That is the same shape `feature-coverage-contract.test.ts` uses for the
 * wire-vocabulary enumeration, and for the same reason its own note gives — *"a count would have
 * caught none of those three"*.
 *
 * @param {{selector?: string, from?: number, to?: number, files: string[]}} options
 */
export function auditSurface(options) {
  const args = {
    selector: options.selector,
    from: options.from === undefined ? undefined : String(options.from),
    to: options.to === undefined ? undefined : String(options.to),
    files: options.files.join(',')
  };
  const bundle = readVerifiedBundle();
  const paths = options.files.map((path) => path.trim()).filter(Boolean);
  const ours = readOurs(paths);

  let from;
  let to;
  /** Declared without an initialiser: both branches below assign it, and eslint asks for that. */
  let entries;
  if (args.selector) {
    const marker = `selectors:[["${args.selector}"]]`;
    const at = bundle.indexOf(marker);
    if (at === -1) throw new Error(`no component with selector ${args.selector} in ${BUNDLE}`);
    const consts = bundle.indexOf('consts:[', at);
    const template = bundle.indexOf(',template:function', at);
    if (consts === -1 || template === -1 || consts > template) {
      throw new Error(`${args.selector} has no const table before its template`);
    }
    from = consts;
    to = template;
    entries = splitTable(bundle.slice(consts + 'consts:'.length, template));
  } else {
    from = Number(args.from);
    to = Number(args.to);
    /*
      A raw range has no table STRUCTURE to walk — it is a slice out of the middle of a table, so it
      may open or close mid-entry. `splitTable` would mis-bracket it, so the whole range is treated
      as one entry and the values are read out of it directly.

      The consequence is that structural fragments become candidate values: a slice cutting across
      `…],[1,…` yields the string `],[1,` and reports it as a gap. Those are filtered by shape —
      anything that is not a plausible attribute value, class name or human string. The filter is
      here rather than in `FRAMEWORK` because it is about the SLICE, not about Angular.
    */
    entries = [bundle.slice(from, to)];
  }

  const region = bundle.slice(from, to);
  /** @type {Map<string, number[]>} */
  const constGaps = new Map();
  /** A value a template could plausibly carry — not a fragment of the array syntax around it. */
  /** @param {string} value */
  const isSurfaceValue = (value) => !/^[[\],\d\s]+$/.test(value);

  /*
    ── WHOLE-TOKEN MATCHING, AND IT IS THE FOURTH TIME THIS REPOSITORY HAS PAID FOR SUBSTRINGS ────

    A plain `ours.includes(value)` reports `form-select` as PRESENT when the only thing in our
    markup is `form-select-sm`. Found by a negative control: `class="form-select form-select-sm"`
    was cut to `class="form-select-sm"` and `surface-audit-contract.test.ts` stayed green over a
    class the reference carries and this room had just lost.

    It is the same shape as `js` matching inside `json`, `pmToolbar` inside `pmToolbarZZ`, and a
    declaration assertion passing on the comment above it — three failures this repository has
    already recorded. `reference-const-coverage-contract`'s sweep still matches by substring and
    says so; this one does not.

    The boundary is `[A-Za-z0-9_-]`, hyphen INCLUDED, because every value at risk here is a
    hyphenated class or id and the hyphen is what makes one a prefix of another. Quotes, spaces,
    braces, angle brackets and `.` are all boundaries, so `data.files` still matches `files` — this
    check makes matching stricter, never looser, so it can only remove false PRESENCE.
  */
  const NOT_TOKEN = /[A-Za-z0-9_-]/;
  /** @param {string} value */
  const rendered = (value) => {
    let at = ours.indexOf(value);
    while (at !== -1) {
      const before = at === 0 ? '' : ours[at - 1];
      const after = ours[at + value.length] ?? '';
      if (!NOT_TOKEN.test(before) && !NOT_TOKEN.test(after)) return true;
      at = ours.indexOf(value, at + 1);
    }
    return false;
  };

  entries.forEach((entry, index) => {
    for (const [, value] of entry.matchAll(/"([^"]{2,})"/g)) {
      if (!isSurfaceValue(value) || FRAMEWORK.has(value) || rendered(value)) continue;
      /*
        `?? []` and a re-set rather than a non-null assertion on the line above. The `has`/`get` pair
        cannot miss — the `set` is one statement up — but asserting a fact the checker can see is
        false in general is how a real miss ships as a crash, and `audit-feature-coverage.mjs` makes
        the same choice at its own printer for the same reason.
      */
      const at = constGaps.get(value) ?? [];
      if (args.selector) at.push(index);
      constGaps.set(value, at);
    }
  });

  /*
    ── TEXT LITERALS ARE READ FROM THE VIEWS THIS COMPONENT ACTUALLY REFERENCES ──────────────────

    Angular hoists every embedded view to a `function` of its own, ABOVE the component's `consts:`,
    so a component's text is not inside its own byte range. The first version of this script read a
    32 KB window below the table instead, and its very first run reported "Create New Poll",
    "Pre-Canned Polls" and "Debug Log" as gaps in `app-post-alert-modal` — the neighbours' text,
    swept up by a window that was tuned rather than derived.

    So the views are RESOLVED instead. `H(slot, Name, decls, vars, …)` in the template names each
    one; each named function may reference more; the walk is transitive and bounded by the set of
    names already seen. Text is read from the component's own template and from exactly those
    functions, which is the same set the component can render and nothing else.
  */
  /** @type {Map<string, string>} */
  const viewSources = new Map();
  /**
   * @param {string} source
   * @param {number} depth
   */
  const collectViews = (source, depth) => {
    if (depth > 8) return;
    /*
      `H(slot, View, decls, vars, …)` — and the CHAINED form, which is most of them.

      The minifier emits consecutive template declarations as `H(59,VTe,4,3,"div",35)(60,HTe,4,3,
      "div",35)(61,$Te,…)`: one `H`, then bare call syntax. A regex anchored on `H(` finds the first
      of each chain and nothing else, which is exactly what the first version did — it resolved TWO
      of `app-post-alert-modal`'s thirteen views and reported the run as clean.

      So the shape matched is the SIGNATURE — `(number, Identifier, number, number` — which is the
      same whether the call is prefixed or chained. A false match resolves to no function body and is
      reported as unresolved rather than silently dropped.
    */
    for (const [, view] of source.matchAll(
      /\(\s*\d+\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*\d+\s*,\s*\d+/g
    )) {
      if (viewSources.has(view)) continue;
      const declared = new RegExp(`function ${view.replace(/\$/g, '\\$')}\\(t,n\\)\\{`).exec(
        bundle
      );
      if (!declared) {
        viewSources.set(view, '');
        continue;
      }
      /*
        A view's body is bounded by the NEXT top-level `function X(t,n){`, which is how the minifier
        emits them — consecutive, at the same scope. Falling back to the declaration's own start
        would read nothing; falling back to end-of-bundle would read everything, so the miss is
        recorded as an empty body rather than guessed at.
      */
      const bodyFrom = declared.index;
      const next = /function [A-Za-z_$][\w$]*\(t,n\)\{/g;
      next.lastIndex = bodyFrom + 1;
      const following = next.exec(bundle);
      const body = bundle.slice(bodyFrom, following ? following.index : bodyFrom);
      viewSources.set(view, body);
      collectViews(body, depth + 1);
    }
  };
  const template = bundle.slice(to, bundle.indexOf('},dependencies:', to) + 1);
  collectViews(template, 0);
  collectViews(region, 0);

  /** @type {Set<string>} */
  const textGaps = new Set();
  const unresolved = [...viewSources].filter(([, body]) => body === '').map(([view]) => view);
  for (const source of [template, ...viewSources.values()]) {
    for (const [, value] of source.matchAll(/\bv\(\d+,"([^"]{2,})"\)/g)) {
      const literal = unescapeJs(value);
      if (!literal.trim() || rendered(literal.trim())) continue;
      textGaps.add(value);
    }
  }

  const report = {
    subject: args.selector ?? `bytes ${from}-${to}`,
    bundle: BUNDLE,
    region: { from, to, bytes: to - from, consts: args.selector ? entries.length : null },
    files: paths,
    views: { resolved: viewSources.size - unresolved.length, unresolved },
    constGaps: [...constGaps].map(([value, at]) => ({ value, consts: at })),
    textGaps: [...textGaps]
  };

  return report;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = auditSurface({
    selector: args.selector,
    from: args.from === undefined ? undefined : Number(args.from),
    to: args.to === undefined ? undefined : Number(args.to),
    /* `parseArgs` throws when `--files` is missing, so this is narrowed by the time it is read. */
    files: (args.files ?? '').split(',')
  });
  const { from, to } = report.region;
  const entries = { length: report.region.consts ?? 0 };
  const unresolved = report.views.unresolved;
  const paths = report.files;

  if (args.json === 'true') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${report.subject} — bytes ${from}..${to}`);
  process.stdout.write(args.selector ? ` (${entries.length} consts)\n` : '\n');
  process.stdout.write(`  measured against ${paths.length} file(s)\n`);
  process.stdout.write(
    `  views resolved: ${report.views.resolved}` +
      (unresolved.length ? `, UNRESOLVED: ${unresolved.join(', ')}` : '') +
      '\n\n'
  );
  process.stdout.write(`  CONST VALUES ABSENT: ${report.constGaps.length}\n`);
  for (const { value, consts } of report.constGaps) {
    process.stdout.write(
      `    ${JSON.stringify(value)}${consts.length ? `  consts ${consts.join(', ')}` : ''}\n`
    );
  }
  process.stdout.write(`\n  TEXT LITERALS ABSENT: ${report.textGaps.length}\n`);
  for (const value of report.textGaps) process.stdout.write(`    ${JSON.stringify(value)}\n`);
  process.stdout.write(
    '\n  Candidates, not verdicts: a value rendered from a variable, living in a file --files did ' +
      'not name, or refused on purpose will appear here. Read each one.\n'
  );
}

/*
  Run as a command only when invoked as one — the convention `audit-feature-coverage.mjs` sets at its
  own line 241. Without this guard, importing `auditSurface` executes the CLI, which parses an empty
  `process.argv` and throws "--files is required" from inside a test that never asked for a CLI.
  That happened on the first import, which is why the guard is here and not assumed.
*/
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
