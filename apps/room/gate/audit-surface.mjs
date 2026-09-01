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

    node gate/audit-surface.mjs --all      # TRIAGE: every component against the whole application

  `--selector` finds `selectors:[["name"]]` and reads from its `consts:[` to its `,template:function`.
  `--from`/`--to` take a byte range instead, for a REGION of a large component — `#files` lives inside
  `app-presentationarea` and has no selector of its own.
*/

import { createHash } from 'node:crypto';
import { globSync, readFileSync } from 'node:fs';
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
  'keyup.enter',
  'mouseenter',
  'mouseleave',
  'scroll',
  'load',
  'error',
  /*
    Added after the first whole-app sweep, which reported every one of these as a missing value. They
    are Angular's own vocabulary and have no rendered form: `dblclick` and `ngSubmit` are event
    bindings, `ngFor`/`ngForOf` and `appDoubleClick` are directives. Named individually rather than
    filtered by an `ng` prefix, because a class called `ngsomething` would then vanish silently.
  */
  'dblclick',
  'ngSubmit',
  'ngFor',
  'appDoubleClick',
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
  return (
    paths
      .map((path) => [path, readFileSync(join(ROOM, path), 'utf8')])
      .map(([path, source]) => codeOf(String(path), String(source)))
      .map(decodeEntities)
      /*
      OUR side is JS-unescaped too, and the reference's is already. `MessageMenu.svelte` writes the
      kebab glyph as `const KEBAB_TEXT = '\\u2807 '` — the escape, which is exactly how the bundle
      writes it — and decoding only one side left the two unequal, so a fully-transcribed control came
      back as a missing literal in both message components.

      The direction is safe: decoding can only make a match MORE likely, so the error it risks is a
      false negative (a real gap counted present) rather than a false alarm, and it takes a literal
      backslash-u in source to cause one.
    */
      .map(unescapeJs)
      .join('\n')
  );
}

/**
 * Comments removed the way `src/lib/source-comments.ts` removes them, and NOT the obvious way.
 *
 * ## The bug this replaced, measured 2026-09-01
 *
 * A whole-file `/\* … *\/` regex over a `.svelte` file is wrong, because the TEMPLATE is not
 * JavaScript and `/*` there is usually not a comment at all:
 *
 * ```svelte
 * <input accept="image/*" ... />
 * ```
 *
 * That `/` and `*` open a "comment" the regex closes at the next real one — in
 * `CarouselDialog.svelte`, **13,024 characters later** — and the whole carousel markup between them
 * is deleted. This script reported eight of that component's own strings as missing from the room,
 * including ` Add slide ` and `No images found. Upload images via Files first.`, every one of which
 * is on screen.
 *
 * It is the exact failure `source-comments.ts` was written for, and this file had the naive version
 * anyway — a rule correct in one place and wrong in another, which is that module's own complaint.
 * It cannot be imported here (that module is TypeScript, this is a `.mjs` gate script), so the RULE
 * is restated with a pointer rather than the code being copied blind: JS comment syntax is in force
 * only inside `<script>` and `<style>`; the template's comments are `<!-- -->` and nothing else.
 *
 * `orphan-component-contract.test.ts` carries the tripwire that fails when a third such file appears.
 *
 * @param {string} path
 * @param {string} source
 * @returns {string}
 */
function codeOf(path, source) {
  /** @param {string} body */
  const withoutJs = (body) =>
    body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  if (!path.endsWith('.svelte')) return withoutJs(source);
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2>)/g,
      (_match, open, _tag, body, close) => open + withoutJs(body) + close
    );
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

  /*
    ── ADJACENT STRING LITERALS ARE JOINED, BECAUSE THE FORMATTER SPLITS THEM ────────────────────

    prettier breaks a long string across a `+`:

    ```ts
    'This is the default screen users are taken to right now. If you are a presenter and talking ' +
      'whichever screen you select will be forced on others…'
    ```

    That is ONE string to JavaScript and two to a text search, so `app-presentationarea`'s const 74
    — a 261-character tooltip — was reported absent against `ScreenTabs.svelte:102`, which renders
    it, and `StreamTabs.svelte:120`, which renders it too. Whitespace collapsing cannot fix it: the
    break is in SOURCE, not in markup, and there is a `+` between the halves.

    Joining adjacent literals is exactly what the engine does at parse time, so this models the
    language rather than guessing at a formatter: a closing quote, optional whitespace, `+`,
    optional whitespace, an opening quote of the SAME kind, all of it removed. Different quote
    characters are left alone — that is a concatenation of two genuinely different strings, and
    folding it would invent a value neither file contains.

    Every search below reads THIS and not `ours`: const values are attribute values too, and an
    attribute value is exactly as splittable as a text node.
  */
  const joined = ours
    .replace(/'\s*\+\s*'/g, '')
    .replace(/"\s*\+\s*"/g, '')
    .replace(/`\s*\+\s*`/g, '');

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
    let at = joined.indexOf(value);
    while (at !== -1) {
      const before = at === 0 ? '' : joined[at - 1];
      const after = joined[at + value.length] ?? '';
      if (!NOT_TOKEN.test(before) && !NOT_TOKEN.test(after)) return true;
      at = joined.indexOf(value, at + 1);
    }
    return false;
  };

  /*
    ── ANGULAR TEMPLATE REFERENCE VARIABLES ARE NOT SURFACE ──────────────────────────────────────

    `#carouselModal` in a template compiles to the const `["carouselModal",""]` — a two-element entry
    whose second element is the empty string. It names a NODE for other code in the same component to
    reach; it appears in no attribute and no class list, and this room reaches its own nodes with
    `bind:this`. Reporting one as a missing value asks this repository to transcribe an identifier
    that has no rendered form.

    Six showed up in the first whole-app sweep — `carouselModal`, `fileBrowserModal`,
    `giphySearchPopOver`, `emojiPanelDiv`, `scrollerref`, `chatWidth` — and each would cost a reader
    the same two minutes to rule out. Recognised by SHAPE rather than by name, so the seventh is
    filtered the day it is written.

    @param {string} entry
  */
  /** @param {string} entry */
  const isTemplateRef = (entry) => /^\s*\["[^"]+",""\]\s*$/.test(entry);

  /*
    ── ANGULAR'S CONST ENCODING, READ RATHER THAN PATTERN-MATCHED ────────────────────────────────

    A const array is SECTIONED by bare numeric markers, and the sections are different kinds of
    thing:

      [ "type","checkbox","id","ignoreWeekendsChk",   // attributes: name, value, name, value …
        1, "form-check-input",                        // 1 → class names
        2, "max-width","200px",                       // 2 → style property, value, …
        3, "ngModelChange","ngModel" ]                // 3 → BINDING names

    Only the first three sections render. The `3,` section is the names of property and event
    bindings — `ngModel`, `click`, `innerHTML`, and a child component's own inputs — and none of them
    appears in any attribute or class list. `app-roomscroller`'s whole const table is
    `[3,"msg","isP","logType","prevD"]`, four input names, and the first sweep reported two of them as
    values this room fails to render.

    Attribute NAMES are skipped for the same reason: `"type"` and `"aria-label"` are the vocabulary,
    their VALUES are the surface. That is what the odd-index take below does, and it is why the
    hand-kept `FRAMEWORK` list is now a backstop rather than the mechanism.

    Verified against the pinned surfaces before it replaced the old whole-entry scan: every one gives
    the identical answer, which is the only evidence that a smarter reader is still reading the same
    thing.

    @param {string} entry
    @returns {string[]}
  */
  /**
   * @param {string} entry
   * @returns {string[]}
   */
  const surfaceValuesOf = (entry) => {
    /* Tokens at the top level: quoted strings, and the bare numeric section markers. */
    const tokens = [...entry.matchAll(/"((?:[^"\\]|\\.)*)"|(?<![\w"])([123])(?=\s*,)/g)];
    const out = [];
    let section = 0;
    let attrIndex = 0;
    for (const token of tokens) {
      if (token[2] !== undefined) {
        section = Number(token[2]);
        continue;
      }
      const value = token[1];
      if (section === 0) {
        /* Attribute pairs: name, value, name, value — take the values. */
        if (attrIndex % 2 === 1) out.push(value);
        attrIndex += 1;
      } else if (section === 1 || section === 2) {
        out.push(value);
      }
      /* section 3 — binding names — deliberately dropped. */
    }
    return out;
  };

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
  /*
    The template's own bytes, bounded by the EARLIEST of the three things Angular emits after it.

    `},dependencies:` alone was the first bound and it is not always present: `app-muted-users-modal`
    goes straight from its template to `},styles:`, so the slice ran past the component entirely and
    the view walk picked up the four `app-rec-preview` views declared just below it — reporting
    "Recording paused." as a gap in the muted-users modal. Sixteen views resolved for a component
    whose template declares two, which is the number that gave it away.
  */
  const templateEnd = ['},dependencies:', '},styles:', '},encapsulation:', '}})']
    .map((marker) => bundle.indexOf(marker, to))
    .filter((at) => at !== -1)
    .reduce((earliest, at) => Math.min(earliest, at), bundle.length);
  const template = bundle.slice(to, templateEnd + 1);
  collectViews(template, 0);
  collectViews(region, 0);

  /*
    ── LOCAL REFERENCE LISTS ARE FOUND BY POSITION, NOT BY SHAPE ─────────────────────────────────

    `#alertForm="ngForm"` compiles to the const `["alertForm","ngForm"]`, and `app-presentationarea`
    holds one at index 0. It is not surface — it names a node, and an `exportAs` on it names a
    DIRECTIVE to read instead of the element — so `ngForm` was being reported as a value this room
    fails to render, on a form this room has no Angular in.

    **The obvious fix is wrong, and it was tried first.** Widening `isTemplateRef` to accept any
    two-string const `["x","y"]` also swallows `["value","sent"]`, `["value","queued"]` and
    `["value","failed"]` — ordinary attribute pairs — and four real gaps quietly left
    `app-alert-send-report-modal`'s pin. A shape that two different things share cannot tell them
    apart.

    Angular's own encoding does. A const index in the THIRD argument of `d(slot,"tag",N)` is the
    attribute list; a FOURTH argument is the local-refs list:

        d(23,"div",74,3)      // consts[74] = attributes, consts[3] = local refs
        d(0,"div",52)         // attributes only

    So the indices are read from the template and from every view it reaches, and a const at one of
    them is skipped wherever it is and whatever it looks like. That is why this loop runs here,
    after the view walk, rather than beside the const table it reads.
  */
  /*
    SELECTOR RUNS ONLY, and that restriction is a correctness requirement rather than caution.

    A `--from`/`--to` run parses a SLICE of a const table, so its index 0 is the first entry in the
    range; the indices in `d(slot,"tag",attrs,refs)` are the whole component's. Applying one
    numbering to the other skips an arbitrary entry — and it did, on the first run: the `#files`
    region's pinned `pe` gap (upstream's own typo, an attribute literally named `pe`) disappeared
    because some unrelated 4-argument call in `app-presentationarea`'s template happened to carry
    its range-relative index.

    A range run therefore keeps the shape check alone, which is what it had before this existed.
  */
  /** @type {Set<number>} */
  const localRefIndices = new Set();
  if (args.selector) {
    for (const source of [template, region, ...viewSources.values()]) {
      for (const [, , refs] of source.matchAll(/[dT]\(\d+,"[^"]*",(\d+),(\d+)\)/g)) {
        localRefIndices.add(Number(refs));
      }
    }
  }

  entries.forEach((entry, index) => {
    if (isTemplateRef(entry) || localRefIndices.has(index)) return;
    for (const value of surfaceValuesOf(entry)) {
      if (value.length < 2) continue;
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
    ── TEXT IS COMPARED WITH WHITESPACE COLLAPSED, AND THE REASON IS THE FORMATTER ───────────────

    HTML collapses runs of whitespace, so ` Stop Screens ` in the capture and

    ```svelte
    <i class="icon fa fa-stop-circle"></i> Stop
    Screens</button
    ```

    here are the same words on screen. `prettier` wraps our markup at 100 columns and the capture has
    no wrapping at all, so a literal comparison reports every button whose label happens to straddle
    a line — and it did: ` Stop Screens ` came back as a gap against a control that is fully built,
    decoded, and carries forty lines about its own icons.

    Const values are NOT normalised this way. A class attribute is one token and never wraps; letting
    whitespace slide there would make `"btn btn-sm"` match `"btn   btn-sm"`, which is a difference
    worth keeping.
  */
  const flat = joined.replace(/\s+/g, ' ');
  /** @type {Set<string>} */
  const textGaps = new Set();
  const unresolved = [...viewSources].filter(([, body]) => body === '').map(([view]) => view);
  for (const source of [template, ...viewSources.values()]) {
    for (const [, value] of source.matchAll(/\bv\(\d+,"([^"]{2,})"\)/g)) {
      const literal = unescapeJs(value);
      const wanted = literal.replace(/\s+/g, ' ').trim();
      if (!wanted || flat.includes(wanted)) continue;
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

/**
 * Every `app-*` component in the bundle, in byte order.
 *
 * @param {string} bundle
 * @returns {string[]}
 */
function everySelector(bundle) {
  return [...bundle.matchAll(/selectors:\[\["(app-[a-z0-9-]+)"\]\]/g)].map((match) => match[1]);
}

/**
 * `--all` — every component at once, measured against the WHOLE application.
 *
 * A different question from the per-surface runs, and weaker on purpose: a value found anywhere in
 * `src/` counts as rendered, so this cannot see a gap in one component that another component fills
 * — which is exactly the blind spot `PAM-11` was hiding in. What it CAN do is answer, in one pass,
 * which of the fifty-one reference components have anything left at all. Those are then read
 * properly, with `--selector` and the files that implement them.
 *
 * Triage, in other words. The per-surface run is the audit.
 */
function runAll() {
  const bundle = readVerifiedBundle();
  const files = [...globSync('src/**/*.svelte'), ...globSync('src/**/*.ts')]
    .filter((path) => !path.includes('.test.'))
    .sort();
  process.stdout.write(
    `${everySelector(bundle).length} components against ${files.length} files\n\n`
  );
  for (const selector of everySelector(bundle)) {
    const report = auditSurface({ selector, files });
    const consts = report.constGaps.map((gap) => gap.value);
    const line =
      `${selector.padEnd(30)} consts=${String(report.region.consts).padStart(3)}` +
      ` views=${String(report.views.resolved).padStart(3)}` +
      ` gaps=${consts.length}/${report.textGaps.length}`;
    process.stdout.write(
      consts.length || report.textGaps.length
        ? `${line}\n    ${JSON.stringify(consts)}\n    ${JSON.stringify(report.textGaps)}\n`
        : `${line}\n`
    );
  }
  process.stdout.write(
    '\nWHOLE-APP scope: a value rendered by ANY component counts as present here. A surface with 0/0 ' +
      'still needs a --selector run against its own files before it is audited.\n'
  );
}

function main() {
  if (process.argv.includes('--all')) {
    runAll();
    return;
  }
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
