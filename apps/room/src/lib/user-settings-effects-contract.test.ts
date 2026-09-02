import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * USM-12, USM-13, USM-17 and USM-18 — four controls in the user-settings modal that persisted a
 * value and then did nothing with it, or persisted nothing at all.
 *
 * ## The one shape they share
 *
 * Each writes a preference, and for each the preference had **no reader**. That is the defect class
 * `CLAUDE.md` names first — *"no control whose only effect is changing its own label"* — and this
 * modal held three of them at once, which is why they are closed together.
 *
 * ```js
 * O(115, isPresenter ? 115 : -1)                                          USM-12  byte 2,285,015
 * recPreviewWindowOnChange(){ …setPreference("recPreviewWindow",…),
 *   preferences.recPreviewWindow || guiEventBus.emit("closeRecPreviewWindow") }     byte 2,250,601
 *
 * speechRecoCCOnChange(){ …setPreference("doSpeechReco",…),
 *   preferences.speechRecoCC ? …startSpeechRecognition() : …stop… }        USM-13  byte 2,246,212
 *
 * switchTheme(e){ this.chatStyle = JSON.parse(localStorage.getItem("chatStyle"))
 *                                  || globals.chatStyle[e], … }           USM-17  byte 2,253,925
 *
 * v(218," Smaller image preview "), H(219,Cke,…)(220,Ske,…)               USM-18  byte 2,281,312
 * ```
 */

const read = (path: string) => readFileSync(path, 'utf8');
const MODAL_PATH = 'src/lib/components/ModalHost.svelte';
const PAGE_PATH = 'src/routes/+page.svelte';

/** Comments stripped: this file's own prose quotes the calls it asserts. */
const modal = () => codeOf(MODAL_PATH, read(MODAL_PATH));
const page = () => codeOf(PAGE_PATH, read(PAGE_PATH));
/*
  The four side effects left `create-room.svelte.ts` for `preference-side-effects.ts` in the same
  commit that added two of them: the composition root went over its ceiling, ceilings only go down,
  and prose is never trimmed to hit a number. The assertions are unchanged; only where they read.
*/
const sideEffects = () =>
  codeOf(
    'src/lib/room/preference-side-effects.ts',
    read('src/lib/room/preference-side-effects.ts')
  );
const prefs = () => codeOf('src/lib/room/prefs.svelte.ts', read('src/lib/room/prefs.svelte.ts'));
const recording = () => codeOf('src/lib/room/recording.ts', read('src/lib/room/recording.ts'));

/** The Svelte block opened at `opening`, to its MATCHING close. See `session-control-audience`. */
const blockAt = (source: string, opening: string, from = source.indexOf(opening)) => {
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  let depth = 0;
  let cursor = from;
  while (cursor < source.length) {
    const open = source.indexOf('{#', cursor);
    const close = source.indexOf('{/', cursor);
    expect(close, `\`${opening}\` is never closed`).toBeGreaterThan(-1);
    if (open > -1 && open < close) {
      depth += 1;
      cursor = open + 2;
      continue;
    }
    depth -= 1;
    if (depth === 0) return source.slice(from, source.indexOf('}', close) + 1);
    cursor = close + 2;
  }
  throw new Error(`\`${opening}\` is never closed`);
};

const gatesAround = (source: string, marker: string) => {
  const at = source.indexOf(marker);
  expect(at, `${marker} must be rendered`).toBeGreaterThan(-1);
  const enclosing: string[] = [];
  for (const found of source.matchAll(/\{#if ([^}]+)\}/g)) {
    /*
      `found.index` is passed EXPLICITLY, and that is not tidiness. `{#if isPresenter}` occurs seven
      times in this file; without it `blockAt` measures the FIRST one and the length is compared
      against a different block's position, so a marker inside the fourth `{#if isPresenter}` reads
      as enclosed by nothing. The gate suite went red on exactly that, on a change that was correct.
    */
    const block = blockAt(source, found[0], found.index);
    if (found.index < at && found.index + block.length > at) enclosing.push(found[1]);
  }
  return enclosing;
};

describe('USM-12 — the Recording Preview checkbox persists, acts, and is presenter-only', () => {
  it('is mapped to its preference, which is what makes it persist at all', () => {
    /*
      `updateSettingCheck`'s table has NO fallback, by design: an unmapped id writes nothing. So the
      row IS the declaration that the control has a consumer, and its absence was defect one.
    */
    expect(modal()).toContain("'app-recording-preview-window': 'recPreviewWindow'");
  });

  it('has a preference to be mapped TO, defaulting on as the reference does', () => {
    expect(prefs()).toContain('loadedSettings.recPreviewWindow !== false');
    expect(prefs()).toContain("if (key === 'recPreviewWindow') this.#recPreviewWindow = value;");
  });

  it('is read where it decides something — the preview refuses to open when it is off', () => {
    expect(recording()).toContain('if (!this.#prefs.recPreviewWindow) {');
  });

  it('closes an open preview the moment it is switched off', () => {
    const branch = sideEffects();
    expect(branch).toContain("if (key === 'recPreviewWindow' && value === false) {");
    expect(branch).toContain('deps.hideRecordingPreview();');
  });

  it('and renders for a presenter alone', () => {
    expect(gatesAround(modal(), 'id="app-recording-preview-window"')).toContain('isPresenter');
  });
});

describe('USM-13 — the captions toggle starts and stops recognition now', () => {
  it('acts on both edges rather than only persisting', () => {
    const side = sideEffects();
    expect(side).toContain("if (key === 'doSpeechReco') {");
    expect(side).toContain('deps.beginSpeechRecognition();');
    expect(side).toContain('deps.endSpeechRecognition();');
  });

  it('does NOT repeat the mic guard the loader already applies', () => {
    /*
      The reference's `micProducer && !micMuted` is deliberately not copied: `beginSpeechRecognition`
      refuses without a live session, without the preference, without the room entitlement and
      without presenter authority, and it is the method both mic paths already call. Two copies of
      one guard is how they come to disagree — so the absence is asserted, not left to a reader.
    */
    const at = sideEffects().indexOf("if (key === 'doSpeechReco') {");
    expect(at, 'the branch is missing').toBeGreaterThan(-1);
    const branch = sideEffects().slice(at, at + 260);
    expect(branch).not.toContain('micMuted');
    expect(branch).not.toContain('microphoneStream');
  });
});

describe('USM-17 — switching theme re-seeds the colours the viewer never chose', () => {
  it('replaces the defaults under the saved style, rather than the whole style', () => {
    expect(page()).toContain('globalChatStyle = chatStyleAfterThemeSwitch(next, savedChatStyle);');
    expect(read('src/lib/chat-style.ts')).toContain(
      'return { ...defaultChatStyleForTheme(theme), ...saved };'
    );
  });

  it('keeps a SEPARATE record of what was saved, because the merged one cannot answer that', () => {
    /*
      `globalChatStyle` is the theme defaults with the stored values on top. Re-seeding from it would
      carry the old theme's defaults forward for ever — the failure this second field exists to
      avoid, and the reason it is not simply `globalChatStyle`.
    */
    expect(page()).toContain('let savedChatStyle = $state.raw<Partial<FollowChatStyle>>');
    expect(page()).toContain('savedChatStyle = { ...savedChatStyle, ...patch };');
  });

  it('leaves the presenter-colour half where it already was', () => {
    /*
      That half was ALREADY built: the settings modal's open-time effect reads `theme`, so it re-runs
      on a switch. Asserted so the next reader does not add a second seeder — two effects keyed on
      the same question are two answers to it.
    */
    expect(modal()).toContain(
      'const seed = seedPresenterColors(presenterColors, messageChrome.currentUserEmailHash, theme);'
    );
  });
});

describe('USM-18 — the label says on or off, like every other one in this modal', () => {
  it('carries the pair as TWO independent slots, which is what the reference compiles to', () => {
    /*
      BOTH HALVES CHANGED on 2026-09-02. The label was always here; what it read was
      `settingChecks['small-image-preview']`, a value written only by its own click, and it read it
      as a ternary like every neighbour.

      Neither is what the capture does. The gate is the conjunction `smallImagePreview &&
      defaultImagePreview`, and the two spans are independent slots — `? 219 : -1` and
      `? 220 : -1`, the second additionally requiring the latch — so with both flags false NEITHER
      word renders. This is the one checkbox in this modal that is not an either/or.
      `image-preview-latch-contract.test.ts` reads all of that out of the bundle.
    */
    expect(modal()).toContain('setInputChecked(smallImagePreview && defaultImagePreview)');
    /*
      Whitespace-tolerant: prettier breaks this label mid-`</span`, so a literal match encodes the
      formatter's current wrap position rather than the shape. `image-preview-latch-contract.test.ts`
      records the two drafts that got this wrong.
    */
    expect(modal()).toMatch(
      /\{#if smallImagePreview && defaultImagePreview\}\s*<span>\s*on\s*<\/span\s*>\s*\{\/if\}/
    );
    expect(modal()).toMatch(
      /\{#if !smallImagePreview && defaultImagePreview\}\s*<span>\s*off\s*<\/span\s*>\s*\{\/if\}/
    );
    expect(modal()).not.toContain("{smallImagePreview && defaultImagePreview ? 'on' : 'off'}");
  });

  it('and the id stays OUT of the preference table, for a NEW reason', () => {
    /*
      The assertion is unchanged and everything behind it is different, which is why the paragraph
      is rewritten rather than left alone.

      It used to say mapping the id would persist a value nothing can read, because
      `chat-uploaded-img-sm` has no rule in any of the 52 stylesheets. That measurement still holds
      and it was never the question — a class TRANSCRIBED from the capture is not a class this
      repository invented, which is the `btn-ligth` precedent.

      The id stays out now because the handler is SPECIAL-CASED above the table:
      `smallImagePreviewOnChange` (byte 2,253,020) negates the PREFERENCE, and the generic path
      sends `input.checked`, which is the negation of the CONJUNCTION. A row here would silently
      route it through the wrong one. `setting-coverage-contract.test.ts` carries the argument for
      building the row at all; `image-preview-latch-contract.test.ts` is its contract.
    */
    expect(modal()).toContain("if (input.id === 'small-image-preview') {");
    /*
      The OBJECT LITERAL, matched brace to brace — not `blockAt`, which counts `{#`/`{/` and would
      run past the end of a JS object to the next Svelte block and quietly assert over half the
      file. That draft passed, which is the point of writing this down.
    */
    const source = modal();
    const from = source.indexOf('const preferenceKeyByInputId');
    expect(from, 'the mapping table is missing').toBeGreaterThan(-1);
    const opens = source.indexOf('{', from);
    expect(opens, 'the mapping table has no opening brace').toBeGreaterThan(from);
    let depth = 0;
    let end = -1;
    for (let at = opens; at < source.length; at += 1) {
      if (source[at] === '{') depth += 1;
      else if (source[at] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = at;
          break;
        }
      }
    }
    expect(end, 'the mapping table is never closed').toBeGreaterThan(opens);
    const table = source.slice(opens, end);
    expect(table, 'the table could not be sliced').toContain("'alert-popup-donot-disturb'");
    expect(table, 'the slice ran past the table').not.toContain('preferenceKey');
    expect(table).not.toContain("'small-image-preview'");
  });
});
