import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  BUNDLE_PATH,
  OUTPUT_PATH,
  TRANSLATED_PATH,
  componentStyles,
  readInputs,
  renameHost,
  renderExtraChatStyles
} from '../../gate/sync-extra-chat-styles.mjs';

/**
 * `XCP-09` — the second chat column's component styles, and the generator that produces them.
 *
 * ## What this guards, and why regenerate-and-compare rather than assertions about content
 *
 * The artifact is 339 lines of generated CSS. A test that asserted selectors out of it would pass
 * for a file somebody hand-edited, which is the failure `AGENTS.md`'s rule against editing generated
 * files exists to prevent and which no rule can catch on its own. So the first assertion here
 * REGENERATES from the two pinned inputs and compares byte for byte: a hand-edit fails, a stale
 * checkout after the inputs move fails, and neither can be argued with.
 *
 * That is only possible because the generator exports a pure `renderExtraChatStyles(bundle,
 * translated)` and writes only when it is the entry point. A generator that can only write is one
 * nobody can check without trusting it first.
 *
 * ## The measurement that licenses the whole approach
 *
 * The generator does not translate Angular's `[_ngcontent-%COMP%]` itself. It renames an
 * already-translated section, and the licence for that is that `app-chat` and `app-extra-chat` ship
 * BYTE-IDENTICAL style arrays — 5,807 bytes each, and 49 each for the scroller pair. That identity
 * is asserted here as well as inside the generator, because it is the premise rather than a detail:
 * if the two ever diverge, this file is the wrong answer and the failure has to say so out loud.
 *
 * ## The row this closes, and the blocker that was wrong
 *
 * `XCP-09` was filed on 2026-08-31 as blocked on a RE-CAPTURE of `css/complete-app-styles.css` from
 * a room with the second column enabled. The capture we hold was taken with `extraChatColumn` off,
 * so Angular never mounted the component and never injected its styles into the captured DOCUMENT —
 * true, and the wrong conclusion. The compiled COMPONENT carries its own rules and ships here,
 * pinned, and this repository's own tests already read it. A blocker has to name the thing that is
 * actually missing.
 */

const room = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const inputs = readInputs();
const generated = room(OUTPUT_PATH);
const appCss = room('src/app.css');

describe('the two components the reference declares twice', () => {
  it('ship byte-identical style arrays, which is what licenses the rename', () => {
    /*
      Both halves of each pair, with their offsets, because "these are the same" is worth nothing
      unless the two things being compared were each found where they were claimed to be.
    */
    const chat = componentStyles(inputs.bundle, 'app-chat');
    const extraChat = componentStyles(inputs.bundle, 'app-extra-chat');
    expect(chat.at).toBe(1_454_430);
    expect(extraChat.at).toBe(2_400_462);
    expect(chat.css.length).toBe(5807);
    expect(extraChat.css).toBe(chat.css);

    const scroller = componentStyles(inputs.bundle, 'app-roomscroller');
    const extraScroller = componentStyles(inputs.bundle, 'app-extra-roomscroller');
    expect(scroller.at).toBe(1_419_485);
    expect(extraScroller.at).toBe(2_367_140);
    expect(scroller.css).toBe('[_nghost-%COMP%]{background-color:var(--msgs-bg)}');
    expect(extraScroller.css).toBe(scroller.css);
  });

  it('are the reason the generator refuses rather than guesses when they diverge', () => {
    /*
      The negative control, executed rather than described: a bundle with one byte changed inside
      `app-extra-chat`'s array must make the generator throw, and the message must name the pair.
      Without this, the identity check is a comment.
    */
    const extraChat = componentStyles(inputs.bundle, 'app-extra-chat');
    const at = inputs.bundle.indexOf('.navbar[_ngcontent-%COMP%]{font-size:12px', extraChat.at);
    expect(at, 'the extra column style array does not start where it did').toBeGreaterThan(-1);
    const tampered =
      inputs.bundle.slice(0, at) +
      '.navbar[_ngcontent-%COMP%]{font-size:13px' +
      inputs.bundle.slice(at + '.navbar[_ngcontent-%COMP%]{font-size:12px'.length);

    expect(() => renderExtraChatStyles(tampered, inputs.translated)).toThrow(
      /no longer ship identical styles/
    );
  });
});

describe('the generated artifact', () => {
  it('is exactly what the generator produces from the two pinned inputs', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR. Byte for byte, so a hand-edit of the CSS fails here rather
      than shipping, and so does a checkout where the inputs moved and nobody re-ran the generator.
    */
    expect(generated).toBe(renderExtraChatStyles(inputs.bundle, inputs.translated).text);
  });

  it('pins both of its inputs by hash in its own header', () => {
    // A generated file whose header does not say what it came from is a file nobody can re-derive.
    expect(generated).toContain(BUNDLE_PATH);
    expect(generated).toContain(TRANSLATED_PATH);
    expect(generated).toMatch(/SHA-256: [0-9a-f]{64}/);
    expect(generated).toContain('do not edit by hand; run: pnpm css:sync-extra-chat');
  });

  it('carries the rules the row named, on the extra hosts and no others', () => {
    /*
      The row named eight things the column was missing. Each is asserted on the EXTRA host, because
      the whole defect was that these rules existed for one column and not the other.
    */
    /*
      Whitespace-collapsed, because prettier wraps a long selector onto its own line — `app-extra-chat`
      then `  .typing-indicator-container:not(...)` — and a literal two-token match would encode the
      formatter's wrap position rather than the rule. Same trap `image-preview-latch-contract.test.ts`
      hit twice on the same day.
    */
    const flat = generated.replace(/\s+/g, ' ');
    for (const selector of [
      'app-extra-chat .chatTabs',
      'app-extra-chat .roomLog',
      'app-extra-chat .txt-area',
      'app-extra-chat .counterBadge',
      'app-extra-chat .typing-indicator-container',
      'app-extra-chat .users-typing',
      'app-extra-chat .textAreaBtns',
      'app-extra-chat #textAreaHolder',
      'app-extra-chat .giphy-search',
      'app-extra-chat .chatDisabled',
      'app-extra-chat .webinarMode'
    ]) {
      expect(flat, `${selector} is missing`).toContain(selector);
    }
    expect(flat).toContain('app-extra-roomscroller:not(:root)');
    /*
      And the COUNT, so a rename that quietly dropped rules cannot pass the list above: 56 blocks for
      the column — the same number the bundle's array declares and the same number section 34 carries
      — plus the one the scroller contributes.
    */
    expect(generated.match(/\{/g) ?? []).toHaveLength(57);
  });

  it('leaves no rule addressing the FIRST column, which would be the rename half-applied', () => {
    /*
      Comment-free, because the header legitimately names `app-chat` and `app-roomscroller` as the
      sources it was renamed from. What must not appear is a SELECTOR — so the search is over the
      declarations only, and the negative is paired with a positive on the same text so it cannot
      pass by matching nothing.
    */
    const declarations = generated.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations, 'the slice removed everything').toContain('app-extra-chat');
    expect(declarations).not.toMatch(/(?<![\w-])app-chat(?![\w-])/);
    expect(declarations).not.toMatch(/(?<![\w-])app-roomscroller(?![\w-])/);
  });

  it('is imported by app.css, immediately after the sheet it is a twin of', () => {
    /*
      ORDER IS LOAD-BEARING and is asserted rather than trusted: the two columns are the same
      declarations under different hosts, so an import between them would give the second column a
      different answer to any `app.css` override written for the first.
    */
    const twin = "@import './lib/styles/captured-runtime-components.css';";
    const first = appCss.indexOf(twin);
    const second = appCss.indexOf("@import './lib/styles/captured-extra-chat.css';");
    expect(first, 'the twin sheet is no longer imported').toBeGreaterThan(-1);
    expect(second, 'the extra column sheet is not imported at all').toBeGreaterThan(first);
    /* From the END of the first import, so the assertion is about what is BETWEEN them. */
    expect(appCss.slice(first + twin.length, second)).not.toContain('@import');
  });

  it('stays SEPARATE from the sheet it was renamed out of', () => {
    /*
      One provenance line per artifact. `captured-runtime-components.css` is generated from
      `css/complete-app-styles.css` and pins that input's hash; appending a section derived from the
      bundle would make its own header a lie.
    */
    expect(inputs.translated).not.toContain('app-extra-chat');
    expect(inputs.translated, 'the twin section is gone from the source sheet').toContain(
      '/* Captured runtime section 34: app-chat; scope 3761163150 */'
    );
  });
});

describe('renameHost, which is where a prefix collision would hide', () => {
  it('does not rename a longer name that merely starts with the host', () => {
    /*
      `app-chat` is a prefix of `app-chat-logs-modal`, and `\\b` does not help — `t` followed by `-`
      IS a word boundary, so `\\bapp-chat\\b` matches inside the longer name. This is the assertion
      that would have caught that draft.
    */
    expect(renameHost('app-chat .x, app-chat-logs-modal .y', 'app-chat', 'app-extra-chat')).toBe(
      'app-extra-chat .x, app-chat-logs-modal .y'
    );
    expect(
      renameHost('app-roomscroller:not(:root)', 'app-roomscroller', 'app-extra-roomscroller')
    ).toBe('app-extra-roomscroller:not(:root)');
  });
});
