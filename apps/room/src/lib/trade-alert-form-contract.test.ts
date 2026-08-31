import { readFileSync } from 'node:fs';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `DTF-01` … `DTF-05` and `SWF-01` … `SWF-05` — the two trade-alert COMPOSER FORMS.
 *
 * `docs/decoded/room-surface-audit-2026-08-30.md` reads the two PANES under
 * `## day-trade-alerts + swing-alerts panes`. The forms inside them are named there twice and once
 * respectively, in passing, and carry no rows of their own; the two sections this file is the gate
 * for were appended on 2026-08-31 after reading `hwe` (byte 1,933,979) and `Ewe` (byte 1,940,236)
 * end to end, together with every sub-template each of them instantiates:
 *
 * ```js
 * swe 1,933,226   rwe 1,933,472   awe 1,933,621                       // swing image row
 * lwe 1,933,754   cwe 1,933,808   dwe 1,933,861   uwe 1,933,920       // swing buttons
 * ywe 1,939,468   Fwe 1,939,723   Cwe 1,939,875                       // day-trade image row
 * Swe 1,940,011   wwe 1,940,065   Twe 1,940,118   Dwe 1,940,177       // day-trade buttons
 * ```
 *
 * and the component's whole `consts:[` table, bracket-walked BY VALUE from 1,994,264 rather than
 * looked up by slot. That is what settles const 92 (`fas fa-times`, no margin, shared with the
 * volume dropdown) against const 197 (the same icon WITH `me-1`, the Cancel button's) — a pair a
 * slot lookup confirms either way because both are plausible at either index.
 *
 * ## Every assertion runs TWICE, for the same reason `trade-alert-pane-contract` does
 *
 * The two forms are one behaviour in two files. Their own comment states the invariant in prose —
 * *"the ONLY differences below are the five ids, the two radio ids, the `name=` attributes and the
 * form's own class. Anything else that differs is a mistake"* — and until this file nothing checked
 * it. The last group here turns that sentence into an equality.
 */

const SRC = new URL('.', import.meta.url);

const read = (path: string) => readFileSync(new URL(path, SRC), 'utf8');

const FORMS = [
  ['day trade', 'components/day-trade-alerts/DayTradeAlertForm.svelte'],
  ['swing', 'components/swing-alerts/SwingAlertForm.svelte']
] as const;

/* ------------------------------------------------------------------------------------------- */

/**
 * `DTF-01` / `SWF-01` — the seven text nodes that carry the reference's own leading and trailing
 * spaces.
 *
 * Read verbatim from the two templates and their sub-templates:
 *
 * ```js
 * v(2," Image ")          // rwe / Fwe, the upload affordance
 * v(28," Long ")          // hwe / Ewe node 28
 * v(32," Short ")         // hwe / Ewe node 32
 * v(1,"Discard ")         // lwe 1,933,754 / Swe 1,940,011
 * v(1,"Cancel ")          // cwe 1,933,808 / wwe 1,940,065
 * v(1,"Save Changes ")    // dwe 1,933,861 / Twe 1,940,118
 * v(1,"Submit Alert ")    // uwe 1,933,920 / Dwe 1,940,177
 * ```
 *
 * All seven were written here as bare template text, and Svelte removes leading and trailing
 * whitespace inside an element — so all fourteen nodes (seven, twice) rendered without them. The
 * repository's answer to that is older than this row and repo-wide: `AGENTS.md` records the
 * `{' Retry '}` idiom as a STANDING EXCEPTION to the autofixer's "unexpected mustache interpolation
 * with a string literal value", `eslint.config.js` turns `svelte/no-useless-mustaches` off for it,
 * and there are 45 string-literal mustaches outside these two files, 42 of them the leading-space
 * shape — measured, not recalled.
 *
 * ## What is user-visible here, stated honestly rather than uniformly
 *
 * TWO of the seven are. ` Long ` and ` Short ` open with a space that sits between the radio input
 * and its word, so it renders as a gap the reference has and this did not — and it widens the
 * hover target, which `captured-runtime-components.css:7208` gives `cursor: pointer`. The other
 * five are trailing spaces at the end of a button or an `input-group-text`, where HTML collapses
 * trailing whitespace at the end of a line box: they are invisible on screen. They are carried
 * anyway because every capture comparison in this repository diffs RENDERED STRINGS, which makes
 * the space evidence rather than formatting — that is the argument `AGENTS.md` already makes.
 *
 * ## Asserted on the COMPILER'S OUTPUT, not on the source
 *
 * DPE rule 5: a source assertion would prove the braces were typed, which is not the claim. The
 * claim is that the rendered text node holds the reference's string, and the compiler is what
 * decides that. The control below is the same probe compiled from BARE markup, which is exactly
 * what these files held before this row: it proves the assertion can fail, and it is the reason
 * the braces are not "useless".
 */
const REFERENCE_TEXT = [
  ' Image ',
  ' Long ',
  ' Short ',
  'Discard ',
  'Cancel ',
  'Save Changes ',
  'Submit Alert '
] as const;

const compiled = (source: string) => compile(source, { generate: 'client' }).js.code;

/** Every string literal the compiled template assigns to a text node or to `textContent`. */
const renderedText = (generated: string): string[] =>
  [...generated.matchAll(/(?:nodeValue|textContent) = '((?:[^'\\]|\\.)*)';/g)].map(
    (found) => found[1]
  );

describe('DTF-01 / SWF-01 — the reference s leading and trailing spaces survive to the DOM', () => {
  it.each(FORMS)('%s: renders all seven text nodes with their spaces intact', (_name, path) => {
    const rendered = renderedText(compiled(read(path)));
    for (const text of REFERENCE_TEXT) {
      expect(
        rendered,
        `the compiled template never assigns ${JSON.stringify(text)} — a bare-markup text node loses the reference's spaces`
      ).toContain(text);
    }
  });

  it('and bare markup really does lose them, which is why the braces are there', () => {
    /*
      THE NEGATIVE CONTROL, compiled rather than asserted. This is the exact markup both forms
      carried before this row.

      Its FIRST version was green and worthless, which is worth leaving recorded: it ran
      `renderedText` over the probe and asserted the result did not contain ` Long `. It never
      could. Bare text is STATIC, so Svelte emits it inside the `from_html` template literal and
      assigns no `nodeValue` at all — the list was empty, and an empty list fails no `not.toContain`.
      A control that cannot go red is not a control, and this one had to be measured to find that
      out.

      So it asserts the trim POSITIVELY, on the template Svelte actually emits: `>Long</label>` is
      the proof that the spaces were removed, and it fails the moment Svelte stops removing them —
      at which point the group above would be measuring nothing.
    */
    const bare = compiled(
      `<label for="a" class="form-check-label">
         Long
       </label>
       <button type="button"><i class="fas fa-trash me-1"></i>Discard</button>`
    );
    expect(bare, 'Svelte no longer trims element-edge whitespace — re-read DTF-01').toContain(
      '>Long</label>'
    );
    expect(bare).toContain('>Discard</button>');
    expect(bare).not.toContain(' Long ');
    expect(bare).not.toContain('Discard ');
  });
});

/* ------------------------------------------------------------------------------------------- */

/**
 * `DTF-02` / `SWF-02` — the byte each form cites for its own `paste` binding.
 *
 * Both were wrong, in different ways, and neither could have been caught by anything that reads
 * only this repository — which is why they are pinned here now that they have been measured:
 *
 * | form | cited | actually at | off by |
 * | --- | ---: | ---: | ---: |
 * | day trade | 1,941,249 | **1,941,208** | 41 bytes, landing mid-expression |
 * | swing | 1,992,250 | **1,934,924** | 57,326 bytes, landing on a different construct |
 *
 * The swing one is the instructive half. 1,992,250 is where `onImagePaste(e,i){` — the HANDLER'S
 * DEFINITION — begins, and it is also the offset `dta-04` cites for the `Upload this image?`
 * confirm that lives inside that method. The comment quotes `x("paste", …)`, the template's call
 * site, and gave the byte of something 57 KB away that a reader following it would still find
 * plausible, because it is genuinely about pasting. An offset that lands on plausible bytes is the
 * one that never gets questioned.
 *
 * Read as COMMENT TEXT and therefore deliberately NOT through `codeOf`: the thing being checked is
 * the citation, which only exists in the comment.
 */
describe('DTF-02 / SWF-02 — the paste call sites are cited at the byte they are actually at', () => {
  it('day trade cites 1,941,208, the byte of its `x("paste", …)`', () => {
    const source = read(FORMS[0][1]);
    expect(source).toContain('the call site at byte 1,941,208');
    expect(source, 'the superseded offset is back').not.toContain('1,941,249');
  });

  it('swing cites 1,934,924, and no longer the handler s definition 57,326 bytes away', () => {
    const source = read(FORMS[1][1]);
    expect(source).toContain('the call site at byte 1,934,924');
    expect(source, 'the superseded offset is back').not.toContain('1,992,250');
  });
});

/* ------------------------------------------------------------------------------------------- */

/**
 * `DTF-03` / `SWF-03` / `DTF-04` / `SWF-04` — what the two `<style>` blocks actually decide.
 *
 * ## The row that looked like a gap and is not
 *
 * The reference's `cursor: pointer` rule (byte 2,026,556) names NINE selectors. Each form
 * transcribes THREE of them, and the six it drops are all reachable inside the form —
 * `.form-check-label`, and the four radio ids. Read as a missing name that is a gap; measured, it
 * is not one. `src/lib/styles/captured-runtime-components.css:7207-7215` ships all nine under the
 * `app-presentationarea` host, `app.css:5` imports that sheet, and `PresentationArea.svelte`
 * renders `<app-presentationarea>` with both panes — and therefore both forms — inside it. So the
 * pointer cursor on the radio pair and its labels is already live, under a name the reader of the
 * component would not have searched for. `UIM-03`'s lesson, met again: *a gap stated as a missing
 * NAME is the shape most likely to survive verification while being wrong.*
 *
 * ## Which makes the rest of both style blocks a DUPLICATE, deliberately kept
 *
 * Measured the same way: **every rule either form declares is already in that generated sheet**,
 * host-scoped — the form rule at :7078, `.input-group-text` at :7083, `.form-control` at :7090, the
 * eight-selector radio-margin cross product at :7094, `.uploaded-img-preview` at :7196,
 * `.remove-image-btn` at :7204 and the hover rule at :7207. The component copies are therefore
 * redundant TODAY, and `ScreenPane.svelte:650` states this repository's rule in as many words: a
 * captured rule is declared in a component *"because that file is GENERATED … and this rule is not
 * in that sheet"*. By that rule these would come out.
 *
 * They stay, and the reason is the failure mode rather than the tidiness. Removing them makes each
 * form's appearance depend on an ANCESTOR ELEMENT rendered by a different component; mount the form
 * anywhere else and the failure is silent and total — a 12px form becomes 16px and unbounded in
 * width, with nothing red anywhere. This repository fails closed. What was actually wrong was the
 * two components' stated JUSTIFICATION, which named `styles.ee2a710065b60389.css` (the reference's
 * global sheet, where these rules genuinely are not) and not the generated captured one, and this
 * group is where that omission stops being invisible: if the generator ever drops one of these
 * rules, the assertion below fails and the component copy becomes load-bearing rather than
 * redundant — which is precisely the moment somebody needs to be told.
 */
const CAPTURED = read('styles/captured-runtime-components.css').replace(/\s+/g, ' ');

/**
 * Does the generated sheet carry this selector — as a WHOLE selector, not as a prefix of one?
 *
 * ## The control that found this, and what it was hiding
 *
 * The first version asked `CAPTURED.includes(selector)`, and its negative control came back GREEN:
 * `app-presentationarea .remove-image-btn:not(:root)` was renamed out of the sheet and nothing
 * failed, because the `:hover` rule two lines below still contains that exact text as a prefix.
 * Every selector in both lists below has a `:hover` twin, so the rule was true of ALL of them — the
 * group would have gone on passing with the entire non-hover half of the block deleted.
 *
 * A selector ends where the next one begins, and in the whitespace-collapsed sheet that is either
 * `, ` or ` {`. Testing for the boundary is what makes the assertion about a rule rather than about
 * a substring.
 */
const declares = (selector: string) =>
  CAPTURED.includes(`${selector},`) || CAPTURED.includes(`${selector} {`);

/** Selectors the two forms declare, and which the generated sheet must still carry. */
const DUPLICATED = [
  'app-presentationarea .day-trade-alert-form:not(:root)',
  'app-presentationarea .swing-alert-form:not(:root)',
  'app-presentationarea .day-trade-alert-form:not(:root) .input-group-text:not(:root)',
  'app-presentationarea .swing-alert-form:not(:root) .input-group-text:not(:root)',
  'app-presentationarea .day-trade-alert-form:not(:root) .form-control:not(:root)',
  'app-presentationarea .swing-alert-form:not(:root) .form-control:not(:root)',
  'app-presentationarea .day-trade-alert-form:not(:root) #dayTradeAlert-long:not(:root)',
  'app-presentationarea .day-trade-alert-form:not(:root) #dayTradeAlert-short:not(:root)',
  'app-presentationarea .swing-alert-form:not(:root) #swingAlert-long:not(:root)',
  'app-presentationarea .swing-alert-form:not(:root) #swingAlert-short:not(:root)',
  'app-presentationarea .uploaded-img-preview:not(:root)',
  'app-presentationarea .remove-image-btn:not(:root)',
  'app-presentationarea .uploaded-img-preview:not(:root):hover',
  'app-presentationarea .img-upload-btn:not(:root):hover',
  'app-presentationarea .remove-image-btn:not(:root):hover'
] as const;

/** The six the forms do NOT declare — the whole of `DTF-03` / `SWF-03`. */
const NOT_DECLARED_HERE = [
  'app-presentationarea .form-check-label:not(:root):hover',
  'app-presentationarea #dayTradeAlert-long:not(:root):hover',
  'app-presentationarea #dayTradeAlert-short:not(:root):hover',
  'app-presentationarea #swingAlert-long:not(:root):hover',
  'app-presentationarea #swingAlert-short:not(:root):hover',
  'app-presentationarea .uploaded-alert-image:not(:root):hover'
] as const;

describe('DTF-03 / SWF-03 — the six cursor selectors neither form declares are shipped anyway', () => {
  it('the generated captured sheet carries all six', () => {
    for (const selector of NOT_DECLARED_HERE) {
      expect(
        declares(selector),
        `${selector} is gone from the generated sheet, so the radio pair and its labels lost the pointer cursor the reference gives them at byte 2,026,556. It now has to be declared in both forms.`
      ).toBe(true);
    }
  });

  it('and they really are absent from the components, so this is not a duplicate check', () => {
    /* The vacuity guard: if the forms had grown them, the group above would prove nothing. */
    for (const [, path] of FORMS) {
      expect(codeOf(path, read(path))).not.toContain('.form-check-label:hover');
    }
  });

  it('is reachable: the host is rendered, and both panes are inside it', () => {
    const area = read('components/PresentationArea.svelte');

    const opens = area.indexOf('<app-presentationarea>');
    expect(opens, 'the captured host element is no longer rendered').toBeGreaterThan(-1);
    const closes = area.indexOf('</app-presentationarea>');
    expect(closes, 'the captured host element is never closed').toBeGreaterThan(opens);

    for (const pane of ['<SwingAlertsPane', '<DayTradeAlertsPane']) {
      const at = area.indexOf(pane);
      expect(at, `${pane} is no longer rendered here`).toBeGreaterThan(-1);
      expect(
        at > opens && at < closes,
        `${pane} is rendered OUTSIDE <app-presentationarea>, so every rule this group relies on stops applying to its form`
      ).toBe(true);
    }

    expect(read('../app.css')).toContain("@import './lib/styles/captured-runtime-components.css';");
  });
});

describe('DTF-04 / SWF-04 — the style blocks duplicate the generated sheet, and that is a decision', () => {
  it('every rule the forms declare is still in the generated sheet too', () => {
    const missing = DUPLICATED.filter((selector) => !declares(selector));
    expect(
      missing,
      `${missing.join('; ')} — the generated sheet no longer ships these, so the copies in the two forms have become LOAD-BEARING. Re-read DTF-04 before touching either style block.`
    ).toEqual([]);
  });

  it('and the two declarations that would be noticed first still say the same thing', () => {
    /*
      Selectors alone would pass against a rule whose body had changed. These two are the ones a
      presenter would see: the form's own size, and the pointer cursor the row is about.
    */
    const form = CAPTURED.indexOf('app-presentationarea .day-trade-alert-form:not(:root), ');
    expect(form, 'the form rule is gone from the generated sheet').toBeGreaterThan(-1);
    const formEnd = CAPTURED.indexOf('}', form);
    expect(formEnd, 'the form rule is never closed').toBeGreaterThan(form);
    expect(CAPTURED.slice(form, formEnd)).toContain('font-size: 12px; max-width: 600px;');

    const cursor = CAPTURED.indexOf('app-presentationarea .uploaded-alert-image:not(:root):hover');
    expect(cursor, 'the cursor rule is gone from the generated sheet').toBeGreaterThan(-1);
    const cursorEnd = CAPTURED.indexOf('}', cursor);
    expect(cursorEnd, 'the cursor rule is never closed').toBeGreaterThan(cursor);
    expect(CAPTURED.slice(cursor, cursorEnd)).toContain('cursor: pointer;');
  });
});

/* ------------------------------------------------------------------------------------------- */

/**
 * `DTF-05` / `SWF-05` — `<form #alertForm="ngForm">` is not carried, and the measurement says why.
 *
 * Both templates open `d(0,"form",170,0)` / `d(0,"form",222,0)`, and that trailing `0` is the
 * LOCAL REFS index: consts[0] is `["alertForm","ngForm"]`, so upstream the form element publishes
 * itself as a template reference variable named `alertForm`.
 *
 * Nothing reads it. `alertForm` occurs **exactly once in all 2,891,205 bytes** of
 * `main.d1d09071be31f1ba.js`, at byte 1,994,267 — inside that consts entry itself. No template
 * expression, no `@ViewChild`, no handler. The `NgForm` directive it names is applied to the
 * element by `FormsModule`'s selector whether or not the ref exists, so the ref changes nothing;
 * and this room's equivalent of what a `#alertForm` would be FOR — disabling submit on invalid —
 * is not what the reference does either. Its submit button (const 190) carries no binding at all,
 * and `onSwingAlertSubmit` (byte 1,981,965) re-checks the four fields itself before sending.
 *
 * Recorded as a refusal with its count rather than left unmentioned, because "the reference has a
 * template ref we do not" is the kind of observation that gets re-found and re-investigated.
 */
describe('DTF-05 / SWF-05 — the dead `#alertForm` template ref is refused, not overlooked', () => {
  it.each(FORMS)('%s: carries no ngForm reference variable', (_name, path) => {
    expect(codeOf(path, read(path))).not.toContain('alertForm');
  });
});

/* ------------------------------------------------------------------------------------------- */

/**
 * THE TWINS STAY TWINS, which is the invariant every row above depends on.
 *
 * `DayTradeAlertForm.svelte` states it in prose: *"Every placeholder, every label, every input
 * type, every icon and every button word is character for character the same as the swing form …
 * So the ONLY differences below are the five ids, the two radio ids, the `name=` attributes and
 * the form's own class. Anything else that differs is a mistake."*
 *
 * That was read out of the bundle — const runs 173-178 against 223-227, with 171, 172, 177,
 * 179-182, 185 and 188-199 shared outright — and until this file nothing enforced it. All four
 * `dta-*` rows exist because one behaviour was missing from BOTH panes; the same shape here would
 * be one of the pair silently drifting, which no per-file assertion can see.
 *
 * So: strip the comments, rename the day-trade half mechanically, and require EQUALITY. The guard
 * above it is what keeps the rename honest — a day-trade form that accidentally spelled a swing id
 * would survive the rename and match, so each file is first required to contain none of the other's
 * vocabulary at all.
 */
const swingify = (source: string) =>
  source
    .replaceAll('day-trade-alert-form', 'swing-alert-form')
    .replaceAll('day-trade-alerts', 'swing-alerts')
    .replaceAll('dayTradeAlert', 'swingAlert')
    .replaceAll('DayTradeAlert', 'SwingAlert')
    .replaceAll('dayTrade', 'swing')
    .replaceAll('DayTrade', 'Swing');

const significantLines = (source: string) =>
  source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

describe('the two forms are one component in two files', () => {
  it('neither form speaks the other s vocabulary', () => {
    const day = codeOf(FORMS[0][1], read(FORMS[0][1]));
    expect(day, 'the day-trade form names a swing symbol').not.toMatch(/swing/i);

    const swing = codeOf(FORMS[1][1], read(FORMS[1][1]));
    expect(swing, 'the swing form names a day-trade symbol').not.toMatch(/day.?trade/i);
  });

  it('and are identical once the day-trade half is renamed', () => {
    const day = significantLines(swingify(codeOf(FORMS[0][1], read(FORMS[0][1]))));
    const swing = significantLines(codeOf(FORMS[1][1], read(FORMS[1][1])));
    expect(
      day,
      'the two composers have drifted. They are one behaviour in two files: every placeholder, label, input type, icon and button word is character for character the same upstream, and only the ids, the `name=` attributes and the form class differ.'
    ).toEqual(swing);
  });
});
