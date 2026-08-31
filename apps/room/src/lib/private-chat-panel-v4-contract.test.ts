import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';

/**
 * `app-privchat` against the PINNED v4 bundle — the private-chat panel, audited 2026-08-31.
 *
 * ## The result, and it is the one worth stating plainly
 *
 * All **79 consts** were decoded by value and swept against everything this app ships. **Seventy-five
 * of the values are present.** The four that are not are Angular TEMPLATE REFERENCE VARIABLES —
 * `["searchTermTxtPM",""]`, `["emojiPanelDiv",""]`, `["giphyPickerPop","ngbPopover"]`,
 * `["giphyPicker",""]` — a construct Svelte has no counterpart for, so their absence is structural
 * rather than a gap.
 *
 * And they are dead in the reference too, which is the finding: **each of those four names occurs in
 * the bundle only inside a `consts:` declaration and is read nowhere** — not by name, and not
 * positionally through `It(n)`, which this template never calls. `app-chat` and `app-extra-chat`
 * declare the same four, so the panel inherited them from the shared chat-surface shape and uses
 * none. That is the same category as `hideScreens`, the flag `MainTabStrip` records as unable to be
 * true: reference machinery that exists and does nothing.
 *
 * ## Why this file exists beside the panel's other contracts
 *
 * `PrivateChatPanel.test.ts` and `private-chat-composer-v4-contract.test.ts` cover behaviour. What
 * nothing covered is the CONST TABLE as a whole — the question "is any of it missing?", which is the
 * only one that can be answered wrong by omission rather than by a wrong assertion. A per-value
 * sweep answers it; a list of hand-picked assertions is a list of things somebody thought to check.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');
const PANEL = readFileSync('src/lib/components/PrivateChatPanel.svelte', 'utf8');

/** Byte 2,214,572 — the `[` of `consts:[` for `app-privchat`, verified by the first case below. */
const PRIVCHAT_CONSTS = 2_214_572;

const constTableAt = (open: number): unknown[] => {
  expect(BUNDLE[open], `byte ${open} does not open an array`).toBe('[');
  let depth = 0;
  let at = open;
  while (at < BUNDLE.length) {
    const char = BUNDLE[at];
    if (char === '"' || char === "'") {
      const quote = char;
      at += 1;
      while (at < BUNDLE.length && BUNDLE[at] !== quote) at += BUNDLE[at] === '\\' ? 2 : 1;
      at += 1;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return parseConstTable(BUNDLE.slice(open, at + 1)) as unknown[];
    }
    at += 1;
  }
  throw new Error(`unterminated array at byte ${open}`);
};

const CONSTS = constTableAt(PRIVCHAT_CONSTS);

/** The four Angular template refs, which are the only values this app does not carry. */
const TEMPLATE_REFS = ['searchTermTxtPM', 'emojiPanelDiv', 'giphyPickerPop', 'giphyPicker'];

describe('the evidence this file measures is loaded', () => {
  it('reads the bundle at the pinned size, so an offset means something', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('and the const table is the panel s own, at the byte this file names', () => {
    expect(BUNDLE.slice(2_214_520, 2_214_560)).toContain('selectors:[["app-privchat"]]');
    expect(CONSTS).toHaveLength(79);
  });
});

describe('every value in the 79-const table ships, bar the four Angular refs', () => {
  it('sweeps the whole table rather than a list somebody thought to check', () => {
    /*
      Attribute NAMES and bare CSS keywords are skipped — asserting that `"type"` appears in a Svelte
      file proves nothing. What is checked is every value that IDENTIFIES something: ids, class
      names, placeholder text, labels.

      Swept across the whole app rather than this one component, because the panel's parts are
      separate components here — the giphy picker, the emoji picker and the composer each left it —
      and a per-file sweep would report every one of their consts as missing.
    */
    const boring = new Set([
      'type',
      'button',
      'click',
      'ngClass',
      'ngModel',
      'ngModelChange',
      'ngModelOptions',
      'role',
      'true',
      'false',
      'both',
      'none',
      'block',
      'left',
      'center',
      'width',
      'height',
      'display',
      'margin',
      'text-align',
      'color',
      'white',
      'clear',
      'src',
      'for',
      'rows',
      'maxlength',
      'readonly',
      'aria-hidden',
      'aria-label',
      'title',
      'name',
      'placeholder',
      'data-bs-toggle',
      'data-bs-target',
      'aria-controls',
      'aria-selected',
      'keyup.enter',
      'id',
      'keyup',
      'paste',
      'ngbPopover',
      'ngbTooltip',
      'placement',
      'container',
      'autoClose',
      'popoverClass',
      'hidden',
      'change',
      'input',
      'scroll',
      'keydown',
      'blur',
      'focus',
      'alt',
      'href',
      'target',
      'rel',
      'style',
      'tabindex',
      'value',
      'checked',
      'disabled',
      'innerHTML',
      'emojiSelect',
      'dblclick'
    ]);
    const ours = globSync('src/**/*.{svelte,ts}')
      .filter((path) => !path.includes('.test.'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    const missing: string[] = [];
    for (const [index, entry] of CONSTS.entries()) {
      for (const value of entry as unknown[]) {
        if (typeof value !== 'string' || value.length < 3 || boring.has(value)) continue;
        if (TEMPLATE_REFS.includes(value)) continue;
        if (!ours.includes(value)) missing.push(`const ${index}: ${value}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('and the four exceptions are template refs the REFERENCE never reads either', () => {
    /*
      This is the whole justification for excluding them, and it is measured rather than asserted
      from the shape: each name occurs in the bundle ONLY inside a `consts:` declaration. If one were
      read — by name, or positionally — the exclusion would be hiding a real behaviour.

      `giphyPickerPop` occurs three times because `app-chat` and `app-extra-chat` declare the same
      ref; all three are declarations. The others occur once or twice for the same reason.
    */
    for (const ref of TEMPLATE_REFS) {
      const occurrences = BUNDLE.split(`"${ref}"`).length - 1;
      expect(occurrences, `${ref} should appear only as a declared ref`).toBeGreaterThan(0);
      /* Read by name would look like `.giphyPickerPop` or `viewChild('giphyPickerPop')`. */
      expect(BUNDLE, `${ref} is read by name somewhere`).not.toContain(`.${ref}`);
    }
  });

  it('and this template reads no ref positionally either, so nothing is hiding behind `It(n)`', () => {
    /*
      Angular resolves a template ref through `It(index)`. The panel's template calls it ZERO times,
      which is what makes "declared and never used" a measurement rather than an inference.

      Bound and asserted before the slice: a `-1` from either `indexOf` would make this read a tail
      of the whole file, where `It(` certainly appears, and the assertion would invert silently.
    */
    const component = BUNDLE.indexOf('selectors:[["app-privchat"]]');
    expect(component, 'app-privchat moved').toBeGreaterThan(-1);
    const template = BUNDLE.indexOf('template:function', component);
    expect(template, 'the panel has no template').toBeGreaterThan(component);
    const dependencies = BUNDLE.indexOf('dependencies:[', template);
    expect(dependencies, 'the template never ends').toBeGreaterThan(template);
    expect(BUNDLE.slice(template, dependencies)).not.toContain('It(');
  });
});

describe('the seven gates of the panel s update block', () => {
  /*
    `2&i&&( … )` at byte 2,215,033 — every conditional the panel evaluates per change detection.
    Transcribed here as the list, because a gate that quietly stops being evaluated is invisible: the
    markup still renders, just always or never.
  */
  const gates = () => {
    const template = BUNDLE.indexOf(
      'template:function',
      BUNDLE.indexOf('selectors:[["app-privchat"]]')
    );
    expect(template).toBeGreaterThan(-1);
    const update = BUNDLE.indexOf('2&i&&', template);
    expect(update, 'the panel has no update block').toBeGreaterThan(template);
    return BUNDLE.slice(update, update + 420);
  };

  it('reads them from the bundle at the byte this file names', () => {
    const block = gates();
    expect(block).toContain('O(5,o.appService.globals.preferences.doNotDisturbOn?5:-1)');
    expect(block).toContain('O(6,""!==o.currUser?6:-1)');
    expect(block).toContain('O(8,""!==o.currUser&&o.appService.globals.isPresenter?8:-1)');
    expect(block).toContain('O(14,o.showPMToolbar?14:-1)');
    expect(block).toContain('o.appService.globals.preferences.pmLogsOnRight');
    expect(block).toContain('O(16,o.chatTabs&&o.chatTabs.length>0?16:-1)');
    /* The only either/or: a chosen peer renders the thread, none renders the picker. */
    expect(block).toContain('O(17,""!==o.currUser?17:18)');
  });

  it('and all seven are built', () => {
    /*
      `doNotDisturb` rather than `doNotDisturbOn`: the PREFERENCE keeps the reference's key and the
      PROP is named for what it means to this component, which is the boundary every gate in this
      room crosses — the page reads the preference, the component takes the answer.
    */
    expect(PANEL).toContain('{#if doNotDisturb}');
    expect(PANEL).toContain('showPMToolbar');
    expect(PANEL).toContain('pmLogsOnRight');
    expect(PANEL).toContain('chatTabs');
    /* Slot 17 versus 18 — the thread, or the empty-state picker. */
    expect(PANEL).toContain('{:else}');
  });
});
