import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `USM-18` — the room's "Smaller image previews?" default, the per-member pair it seeds, and the
 * one class the pair drives. Audited against the pinned v4 bundle on 2026-09-02.
 *
 * ## Why this row needed its own file rather than a line in an existing one
 *
 * It is the row this repository got wrong the most times, and every wrong answer was recorded as
 * settled prose in four separate places:
 *
 * 1. *"neither preference has a consumer"* — false; `defaultImagePreview` is a one-shot latch.
 * 2. *"the pair is one flag copied"* — false; the two are written by different handlers and only
 *    one of them is ever persisted by each.
 * 3. *"a class with no rule must not be bound"* — a real rule, applied to the wrong case. It
 *    governs classes this repository INVENTS. `btn-ligth` (`ChatArchiveLogPane.svelte:139`) is the
 *    precedent for a class TRANSCRIBED from the capture, and it has shipped since that pane existed.
 * 4. *"the toggle keeps them in step"* — true, and nothing said HOW, which is where the last defect
 *    was hiding: it negates the preference rather than reading the checkbox.
 *
 * So nothing here is asserted from prose. Every claim SLICES the bundle at the offset it names, so
 * a wrong offset fails here instead of surviving as a sentence, and the bundle's own length is
 * checked first — if this is not the pinned file, every offset below is meaningless.
 *
 * ## The argument that lives here rather than at the code
 *
 * `prefs.svelte.ts` holds the transcription and a short WHY; the long form is here, where it is
 * asserted, which is the split this repository already uses for `ModalHost`/USM-12 and
 * `refresh.svelte.ts`/G16.
 *
 * TWO FIELDS AND NOT ONE. A single flag cannot express "the room's default has been handed to this
 * member". Re-applying the default on every load would overwrite the member's own decision every
 * time they opened the room, and never applying it would make the room setting inert. The latch is
 * the only shape that gives the owner a default AND leaves the member the last word.
 *
 * EACH WRITER PERSISTS THE OTHER'S FIELD. The session load persists the latch and assigns the flag;
 * the toggle persists the flag and assigns the latch. Between them both names can reach the blob,
 * and each on its own leaves the other to be re-derived. That is not a design anybody would choose
 * and it is exactly what the two handlers do, so it is what this room does.
 *
 * ## The absence in this file is measured after `codeOf`
 *
 * `chat-uploaded-img-sm` appears in the comments that explain it, so an absence assertion over raw
 * Svelte source would fail on the paragraph rather than on the markup. Same rule as
 * `extra-chat-surface-contract.test.ts`, learned the same expensive way.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

/**
 * Slice at an offset and compare with the bytes the row claims are there. The length comes from the
 * expected text so a hand-counted length cannot fail as though the offset were wrong.
 */
const at = (offset: number, expected: string) => BUNDLE.slice(offset, offset + expected.length);

const MODAL = codeOf('components/ModalHost.svelte', read('./components/ModalHost.svelte'));
const MODAL_RAW = read('./components/ModalHost.svelte');
const PREFS = read('./room/prefs.svelte.ts');
const PAGE = read('../routes/+page.svelte');
const CHAT_AREA = codeOf(
  'components/AlertChatArea.svelte',
  read('./components/AlertChatArea.svelte')
);
const EXTRA = codeOf('components/ExtraChatPane.svelte', read('./components/ExtraChatPane.svelte'));

const APP_CSS = read('../app.css');
const CAPTURED_CSS = read('./styles/captured-runtime-components.css');
const REFERENCE_CSS = read('../../docs/source-v4-2026-08-15/styles.ee2a710065b60389.css');
const GENERATOR_INPUT = read('../../css/complete-app-styles.css');

describe('the bundle these offsets were read from', () => {
  it('is the pinned v4 capture', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });
});

describe('USM-18 — what the reference actually does', () => {
  it('seeds the member preference from the room setting exactly once, and persists the latch', () => {
    /*
      `processSessData`. The guard is the LATCH, which is what makes it one-shot: a member who turns
      the preview off is not overridden by a room default that says on, because the latch is
      persisted and the clause never runs again.
    */
    const latch = BUNDLE.indexOf('sessData.smallerImagePreview&&!');
    expect(latch, 'the latch clause is gone from the bundle').toBeGreaterThan(-1);
    /* Bounded at the clause's own closing parenthesis-and-semicolon so it cannot run into the next
       statement — the length is the reason two earlier drafts of this assertion failed. */
    const clauseEnd = BUNDLE.indexOf('))', latch);
    expect(clauseEnd, 'the latch clause is never closed').toBeGreaterThan(latch);
    const clause = BUNDLE.slice(latch, clauseEnd + 2);
    expect(clause).toContain('preferences.defaultImagePreview');
    expect(clause).toContain(
      'preferences.smallImagePreview=this.appService.globals.sessData.smallerImagePreview'
    );
    expect(clause).toContain('setPreference("defaultImagePreview"');
    /* The FLAG is assigned and not persisted here. Both halves, because "X does not happen" is
       worth nothing unless the thing that does happen is shown beside it. */
    expect(clause).not.toContain('setPreference("smallImagePreview"');
  });

  it('the toggle negates the PREFERENCE, mirrors it into the latch, and persists only the flag', () => {
    /*
      The half no prose ever carried, and the one that decides how `updateSettingCheck` has to be
      written: `input.checked` is the negation of the CONJUNCTION, and this negates the flag. The
      two differ exactly when the latch is false and the flag is true — reachable, because this
      handler never persists the latch.
    */
    expect(at(2_253_020, 'smallImagePreviewOnChange(){')).toBe('smallImagePreviewOnChange(){');
    /* Bounded at the NEXT method rather than by a length, so the slice cannot end mid-statement and
       cannot swallow a neighbour's `setPreference` into the absence assertion below. */
    const end = BUNDLE.indexOf('}disableVideoChange(){', 2_253_020);
    expect(end, 'the method this slices is never closed').toBeGreaterThan(2_253_020);
    const body = BUNDLE.slice(2_253_020, end);
    expect(body).toContain(
      'preferences.smallImagePreview=!this.appService.globals.preferences.smallImagePreview'
    );
    expect(body).toContain(
      'preferences.defaultImagePreview=this.appService.globals.preferences.smallImagePreview'
    );
    expect(body).toContain('setPreference("smallImagePreview"');
    expect(body, 'the toggle must NOT persist the latch').not.toContain(
      'setPreference("defaultImagePreview"'
    );
  });

  it('binds the checkbox to the conjunction, and the two labels to INDEPENDENT slots', () => {
    /*
      The one checkbox in that modal whose on/off spans are not an either/or. Its neighbours compile
      to `? 230 : 231` — one index or the other, so exactly one span always renders. This pair is two
      `? n : -1` slots and the OFF slot additionally requires the latch, so with both flags false
      NEITHER word appears. `Cke` and `Ske` are `<span>on</span>` and `<span>off</span>`.
    */
    expect(at(2_233_430, 'Cke(t,n){1&t&&(d(0,"span"),v(1,"on"),u())}')).toBe(
      'Cke(t,n){1&t&&(d(0,"span"),v(1,"on"),u())}'
    );
    expect(at(2_233_481, 'Ske(t,n){1&t&&(d(0,"span"),v(1,"off"),u())}')).toBe(
      'Ske(t,n){1&t&&(d(0,"span"),v(1,"off"),u())}'
    );
    const slots = BUNDLE.slice(2_286_800, 2_287_130);
    expect(slots).toContain(
      'z("checked",o.appService.globals.preferences.smallImagePreview&&o.appService.globals.preferences.defaultImagePreview)'
    );
    expect(slots).toContain(
      'O(219,o.appService.globals.preferences.smallImagePreview&&o.appService.globals.preferences.defaultImagePreview?219:-1)'
    );
    expect(at(2_287_062, 'O(220,!o.appService')).toBe('O(220,!o.appService');
    expect(BUNDLE.slice(2_287_062, 2_287_062 + 130)).toContain(
      'preferences.defaultImagePreview?220:-1'
    );
  });

  it('binds `chat-uploaded-img-sm` on BOTH scrollers, through the same conjunction', () => {
    /*
      The element is the scroller and not a message, which the INPUT LISTS settle: `app-roomscroller`
      declares `logType, displayMode, isPresenter`, and the binding chain at the offset below is
      exactly that list plus `ngClass`. The extra column's component adds `extraChatMsg`, and its
      chain has the extra term.
    */
    expect(at(1_418_937, 'selectors:[["app-roomscroller"]]')).toBe(
      'selectors:[["app-roomscroller"]]'
    );
    expect(BUNDLE.slice(1_418_937, 1_418_937 + 300)).toContain(
      'inputs:{logType:"logType",displayMode:"displayMode",isPresenter:"isPresenter"}'
    );
    expect(at(2_366_597, 'selectors:[["app-extra-roomscroller"]]')).toBe(
      'selectors:[["app-extra-roomscroller"]]'
    );

    expect(at(1_454_129, 'ct(12,B_e')).toBe('ct(12,B_e');
    expect(at(2_400_160, 'ct(13,B3e')).toBe('ct(13,B3e');
    expect(at(1_420_656, 'B_e=t=>({"chat-uploaded-img-sm":t})')).toBe(
      'B_e=t=>({"chat-uploaded-img-sm":t})'
    );
    expect(at(2_367_305, 'B3e=t=>({"chat-uploaded-img-sm":t})')).toBe(
      'B3e=t=>({"chat-uploaded-img-sm":t})'
    );
  });

  it('and that class is styled by NOTHING, in the reference or here', () => {
    /*
      The measurement that stood while everything around it was re-read, and the reason it is kept
      after the row was built rather than deleted with it: it is now the guard against somebody
      INVENTING the rule the reference does not have, which would be a worse divergence than binding
      a dead name.

      Proved against a control in the same sheets, because a search that finds nothing proves nothing
      until it is shown to find something.
    */
    for (const sheet of [REFERENCE_CSS, GENERATOR_INPUT, APP_CSS, CAPTURED_CSS]) {
      expect(sheet).not.toContain('chat-uploaded-img-sm');
    }
    expect(
      GENERATOR_INPUT,
      'the control class must be found, or the search proves nothing'
    ).toContain('chat-uploaded-img');
    /* The nearest real rule is a DIFFERENT class driven by a size mode on an ancestor. */
    expect(GENERATOR_INPUT).toContain('.alert-chat-box-sm .chat-uploaded-img .uploaded-img');
  });
});

describe('USM-18 — what this room does with it', () => {
  it('the room setting crosses, and is marked wired', () => {
    const schema = readFileSync(
      new URL('../../../controller/src/lib/room-settings-schema.ts', import.meta.url),
      'utf8'
    );
    const row = /\{ name: "smallerImagePreview",[^}]*\}/.exec(schema)?.[0];
    expect(row, 'the setting is gone from the schema').toBeDefined();
    expect(row).toContain('wired: true');

    const allowList = readFileSync(
      new URL('../../../controller/src/lib/room-config.ts', import.meta.url),
      'utf8'
    );
    expect(allowList).toContain("'smallerImagePreview'");
  });

  it('the latch is one-shot, persists only the latch, and is triggered from a browser-only effect', () => {
    /*
      Read as SOURCE rather than exercised, for the reason `badge-row-reveal.test.ts` gives: this is
      a client-state assignment SSR never runs, so a rendered assertion would be identical whether
      the wire existed or had been cut. The behaviour it guards is exercised by the unit test below.
    */
    const prefs = codeOf('room/prefs.svelte.ts', PREFS);
    expect(prefs).toContain('latchRoomImagePreview(roomDefault: boolean) {');
    expect(prefs).toContain('if (untrack(() => this.#defaultImagePreview)) return;');
    expect(prefs).toContain("this.save('defaultImagePreview', roomDefault);");
    /* The flag is assigned, never persisted, by the latch — the reference's asymmetry. */
    expect(prefs).not.toContain("this.save('smallImagePreview', roomDefault)");

    const page = codeOf('routes/+page.svelte', PAGE);
    expect(page).toContain(
      'prefs.latchRoomImagePreview(data.sessData?.smallerImagePreview === true);'
    );
  });

  it('the toggle is special-cased so it negates the preference, not the rendered conjunction', () => {
    expect(MODAL).toContain("if (input.id === 'small-image-preview') {");
    expect(MODAL).toContain("onPreferenceChange('smallImagePreview', !smallImagePreview);");
    /* And it does NOT go through the generic id table, which would send `input.checked`. */
    const table = /const preferenceKeyByInputId[\s\S]*?\n {4}\};/.exec(MODAL)?.[0] ?? '';
    expect(table, 'the mapping table must be findable').not.toBe('');
    expect(table).not.toContain('small-image-preview');
  });

  it('the modal renders the conjunction and two independent spans, not a ternary', () => {
    /*
      WHITESPACE-TOLERANT, and the reason is worth the lines: prettier wraps this label across three
      lines and breaks it INSIDE `<span>on</span`, so a literal `toContain` passes on the source a
      human writes and fails the moment the formatter touches it. The first version of this test did
      exactly that, and the second — collapsing runs of whitespace to one space — encoded prettier's
      current break position in the expected string, which is the same bug with a longer fuse.

      What is being asserted is the SHAPE: two `{#if}` blocks with the right gates, not a ternary.
      The regexes allow any whitespace between the tokens and none of it is significant to Svelte.
    */
    expect(MODAL).toContain('setInputChecked(smallImagePreview && defaultImagePreview)');
    expect(MODAL).toMatch(
      /\{#if smallImagePreview && defaultImagePreview\}\s*<span>\s*on\s*<\/span\s*>\s*\{\/if\}/
    );
    expect(MODAL).toMatch(
      /\{#if !smallImagePreview && defaultImagePreview\}\s*<span>\s*off\s*<\/span\s*>\s*\{\/if\}/
    );
    /*
      The shape that would be wrong, and it is asserted as an absence over COMMENT-STRIPPED source
      because the paragraph at the checkbox quotes it as the thing not to write.
    */
    expect(MODAL).not.toContain("{smallImagePreview && defaultImagePreview ? 'on' : 'off'}");
    expect(MODAL_RAW, 'the reason must still be recorded beside the markup').toContain(
      'THE TWO SPANS ARE NOT AN EITHER/OR'
    );
  });

  it('both scrollers bind the class, through the conjunction', () => {
    const binding = "class={{ 'chat-uploaded-img-sm': smallImagePreview && defaultImagePreview }}";
    expect(CHAT_AREA).toContain(binding);
    expect(EXTRA).toContain(binding);
  });
});
