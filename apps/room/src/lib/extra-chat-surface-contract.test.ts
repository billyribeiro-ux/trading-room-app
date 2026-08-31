import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { composerEnterAction } from './chat-composer-enter';
import {
  EXTRA_CHAT_COMPOSER_HOLDER_ID,
  EXTRA_CHAT_EMOJI_POPOVER,
  EXTRA_CHAT_GIF_TRIGGER,
  EXTRA_CHAT_MEASURED_GAPS,
  EXTRA_CHAT_RELOCATED_DECISIONS
} from './extra-chat-surface';
import { codeOf } from './source-comments';

/**
 * `XCP-01` … `XCP-09` — the extra chat column, audited against the pinned v4 bundle on 2026-08-31.
 *
 * ## What this file is for, and why the offsets are re-read here rather than trusted
 *
 * Every row below cites a byte offset, and a cited offset in a document has been wrong more than
 * once in this repository — one pointed at a different method entirely. So each assertion SLICES
 * the bundle at the offset it names and compares the bytes, which means a wrong offset fails here
 * rather than surviving as prose. The bundle's own length is asserted first: if the file this reads
 * is not the pinned one, every offset below is meaningless and the vacuity floor says so.
 *
 * ## The negative-assertion trap, and how this file avoids it
 *
 * `source-size-contract.test.ts` records why a `not.toContain` over an extracted file turns green
 * for the wrong reason. Several rows here are ABSENCES — `textAreaHolderExtra` must not come back,
 * `app-extra-chat` must still be missing from the generated stylesheet — so each is paired with a
 * positive assertion over the same text, and every absence over Svelte source is measured after
 * `codeOf` strips the comments. Otherwise the paragraph explaining why a thing is absent is itself
 * enough to make the absence claim fail, which is a rule this repository learned the expensive way.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

/**
 * Slice the bundle at an offset and compare it to the bytes the row claims are there.
 *
 * The length comes from the EXPECTED text rather than being written out, because a hand-counted
 * length is a second thing to get wrong and it fails as though the OFFSET were wrong — a false
 * alarm pointing at the one number this file exists to protect. Six of these were off by one on the
 * first run with every offset correct, which is exactly that failure.
 */
const at = (offset: number, expected: string) => BUNDLE.slice(offset, offset + expected.length);

const PANE_RAW = read('./components/ExtraChatPane.svelte');
const PANE = codeOf('components/ExtraChatPane.svelte', PANE_RAW);
const SURFACE = read('./extra-chat-surface.ts');
const APP_CSS = read('../app.css');
const CAPTURED_CSS = read('./styles/captured-runtime-components.css');
const GENERATOR_INPUT = read('../../css/complete-app-styles.css');
const BUNDLE = read('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js');

describe('the bundle these rows were read from', () => {
  it('is the pinned one — the vacuity floor for every offset below', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('and the offsets land inside `app-extra-chat` rather than `app-chat`', () => {
    /*
      The one mistake this whole file exists to make impossible. Both components have a consts table,
      a template function and a stylesheet, and their numbering does not line up — so an offset read
      against the wrong one produces a confident wrong claim. `app-extra-chat`'s selector is the
      anchor, and every offset asserted below is after it.
    */
    const selector = BUNDLE.indexOf('selectors:[["app-extra-chat"]]');
    expect(selector, 'the extra chat component is not in this bundle').toBeGreaterThan(-1);
    expect(selector).toBeLessThan(2_393_850);
  });
});

describe('XCP-01 — the composer holder wears the capture’s own id', () => {
  it('is what const 25 says, read at the offset', () => {
    expect(BUNDLE.slice(2_393_850, 2_393_850 + 4_000)).toContain(
      '["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]'
    );
  });

  it('and the component’s own stylesheet addresses it by that id', () => {
    const style = '#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--te';
    expect(at(2_405_618, style)).toBe(style);
  });

  it('so the pane renders it, through the constant that carries the reason', () => {
    expect(EXTRA_CHAT_COMPOSER_HOLDER_ID).toBe('textAreaHolder');
    expect(PANE).toContain('id={EXTRA_CHAT_COMPOSER_HOLDER_ID}');
  });

  it('and the invented suffix is gone from the whole of `src/`', () => {
    /*
      Paired with the positive assertion above rather than standing alone: `textAreaHolderExtra`
      would also be absent from a file that had lost its composer entirely.
    */
    expect(PANE).toContain('class="d-flex align-items-center textSendDiv"');
    expect(PANE).not.toContain('textAreaHolderExtra');
    expect(codeOf('extra-chat-surface.ts', SURFACE)).not.toContain('textAreaHolderExtra');
  });

  /**
   * The four rule families the suffix was costing, asserted where they live.
   *
   * This is the half that makes the row a `defect` rather than a naming preference: the id is not
   * decoration, it is the selector five separate rule blocks are written against, and the container
   * query is the one that turned a control into a no-op.
   */
  it('reaches the rules the suffix was cutting it off from', () => {
    expect(APP_CSS).toContain('#textAreaHolder {\n  container-type: inline-size;\n}');
    expect(APP_CSS).toContain('@container (width < 410px)');
    expect(APP_CSS).toContain('@container (width >= 410px)');
    expect(APP_CSS).toContain('#textAreaHolder textarea {');
    expect(APP_CSS).toContain('.darkTheme #textAreaHolder {');
  });

  it('and `.textSendDiv`, which was carrying none of it, still has no rule anywhere', () => {
    /*
      Measured rather than assumed, because "the classes are still there" was the reason the missing
      styling went unnoticed. `textSendDiv` IS in the markup — that is the positive half — and has
      no declaration block in either stylesheet this room ships.
    */
    expect(PANE).toContain('textSendDiv');
    expect(APP_CSS).not.toContain('.textSendDiv');
    expect(CAPTURED_CSS).not.toContain('.textSendDiv');
  });
});

describe('XCP-02 — the brand grows a label when the room has no channels', () => {
  it('is `j3e` at the offset, and the gate is this component’s own', () => {
    /*
      The bundle is read as TEXT, so the non-breaking space is the four characters the minifier
      wrote — a backslash, an `x`, an `a` and a `0` — not the character they denote. Asserting
      the escape is the stronger claim anyway: it is what a reader who opens the file at this
      offset actually sees, and the first draft of this line asserted the decoded character and
      failed against the pinned bytes.
    */
    const j3e = String.raw`function j3e(t,n){1&t&&(d(0,"span"),v(1,"\xa0Chat"),u())}`;
    expect(at(2_367_381, j3e)).toBe(j3e);
    /* The escape, not a space — which is why the pane reproduces it as `&nbsp;`. */
    expect(j3e).toContain(String.raw`\xa0Chat`);
    const gate = 'O(5,0==o.chatTabs.length?5:-1)';
    expect(at(2_399_848, gate)).toBe(gate);
  });

  it('so the pane draws it, with the captured character rather than a space', () => {
    expect(PANE).toContain('{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}');
  });
});

describe('XCP-03 and XCP-04 — what Enter does, defined once for both composers', () => {
  it('branches the way the reference branches, at the offset', () => {
    const shift = 'e.shiftKey?(i.val(i.val()),this.autoExpand(';
    const alt = 'e.altKey?(i.val(i.val()+"\\n"),';
    expect(at(2_386_255, shift)).toBe(shift);
    expect(at(2_386_309, alt)).toBe(alt);
  });

  it('and the rule agrees with it', () => {
    const key = (over: Partial<{ shiftKey: boolean; altKey: boolean }> = {}) =>
      composerEnterAction({ key: 'Enter', shiftKey: false, altKey: false, ...over });

    expect(key()).toBe('send');
    /* The half that was wrong in the extra column: alt is a line break, not a send. */
    expect(key({ altKey: true })).toBe('line-break');
    expect(key({ shiftKey: true })).toBe('line-break');
    expect(composerEnterAction({ key: 'a', shiftKey: false, altKey: false })).toBe('ignore');
  });

  it('and both composers route through it rather than re-deciding', () => {
    expect(PANE).toContain("if (composerEnterAction(event) !== 'send') return;");
    const composer = codeOf(
      'components/AlertQaComposer.svelte',
      read('./components/AlertQaComposer.svelte')
    );
    expect(composer).toContain("if (composerEnterAction(event) !== 'send') return;");
  });

  it('and a send closes the emoji picker, which is the send branch’s first act', () => {
    const send = 'this.showEmojiChooser=!1,this.sendMessage()';
    expect(at(2_386_367, send)).toBe(send);
    const handler = PANE.slice(PANE.indexOf('function submitOnEnter'));
    expect(handler.slice(0, 200)).toContain('emojiOpen = false;');
  });
});

describe('XCP-05 — two captured attribute tables that were never applied', () => {
  it('reads const 66 off the bundle and matches the emoji trigger to it', () => {
    const table = BUNDLE.slice(2_393_850, 2_393_850 + 8_000);
    expect(table).toContain(
      '["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",1,"textAreaBtns",3,"click","ngbPopover"]'
    );
    expect(EXTRA_CHAT_EMOJI_POPOVER).toEqual({
      placement: 'auto',
      container: 'body',
      autoclose: 'outside',
      popoverclass: 'popOverDiv'
    });
    expect(PANE).toContain('{...EXTRA_CHAT_EMOJI_POPOVER}');
  });

  it('reads const 72 and matches the GIF trigger to it, `placement` duplicate and all', () => {
    const table = BUNDLE.slice(2_393_850, 2_393_850 + 8_000);
    expect(table).toContain(
      '["ngbTooltip","Search for GIFs","placement","top","placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv","triggers","manual",1,"textAreaBtns",2,"font-size","12px",3,"click","ngbPopover"]'
    );
    /*
      `auto` and not `top`: the const writes `placement` twice and Angular applies the later value.
      Pinned as a VALUE rather than as a spelling of the whole tag, so adding an attribute the
      capture calls for does not turn this contract into a transcript.
    */
    expect(EXTRA_CHAT_GIF_TRIGGER.placement).toBe('auto');
    expect(EXTRA_CHAT_GIF_TRIGGER.ngbtooltip).toBe('Search for GIFs');
    expect(EXTRA_CHAT_GIF_TRIGGER.triggers).toBe('manual');
    expect(PANE).toContain('{...EXTRA_CHAT_GIF_TRIGGER}');
  });
});

describe('XCP-06 — the const numbers are read against THIS component’s table', () => {
  it('proves the two tables are not an offset of one another', () => {
    /*
      The comment in the pane cited `app-chat`'s 56 for a control this component holds at 53. Both
      slices are asserted, so a future reader who doubts it can see the two tables disagree rather
      than take the correction on trust.
    */
    const extra = BUNDLE.slice(2_393_850, 2_393_850 + 8_000);
    /*
      Both anchors bound and CHECKED before either is sliced. `indexOf` answers -1 when it fails and
      -1 is a valid `slice` argument, so an inlined miss silently reads "from the end" instead of
      throwing — the shape `slice-anchor-contract.test.ts` ratchets down, and the shape that has
      produced a green-but-meaningless assertion three times in this repository. Caught here by that
      very gate, on the first full run.
    */
    const chatSelector = BUNDLE.indexOf('selectors:[["app-chat"]]');
    expect(chatSelector, 'app-chat is not in this bundle').toBeGreaterThan(-1);
    const chatTable = BUNDLE.indexOf('consts:[', chatSelector);
    expect(chatTable, 'app-chat has no consts table after its selector').toBeGreaterThan(-1);
    const chat = BUNDLE.slice(chatTable, chatTable + 8_000);

    const tooltip =
      '["placement","top","ngbTooltip","In webinar mode users only see their own chat messages, while Presenters see everyones messages...",1,"ml-2"]';
    expect(extra).toContain(tooltip);
    expect(chat).toContain(tooltip);
    /* The entry `app-chat` has at 53/54 and this column has no node for at all. */
    expect(chat).toContain('"title","Detach Chat"');
    expect(extra).not.toContain('"title","Detach Chat"');
  });

  it('and the webinar gate is where the pane says it is', () => {
    const webinar = 'O(21,o.webinarMode?21:-1)';
    expect(at(2_400_282, webinar)).toBe(webinar);
  });
});

describe('XCP-07, XCP-08, XCP-09 — the three gaps this column cannot close from its own file', () => {
  it('names all three where the component points, so none can go quiet', () => {
    expect([...EXTRA_CHAT_MEASURED_GAPS]).toEqual(['XCP-07', 'XCP-08', 'XCP-09']);
    for (const row of EXTRA_CHAT_MEASURED_GAPS) expect(SURFACE).toContain(row);
  });

  it('XCP-07 — the `ngClass` exists in the reference and the class it names has no rule here', () => {
    expect(at(2_400_160, 'ct(13,B3e')).toBe('ct(13,B3e');
    const b3e = 'B3e=t=>({"chat-uploaded-img-sm":t})';
    expect(at(2_367_305, b3e)).toBe(b3e);
    /* Paired: the reference HAS it (above), and no stylesheet here answers it (below). */
    expect(APP_CSS).not.toContain('chat-uploaded-img-sm');
    expect(CAPTURED_CSS).not.toContain('chat-uploaded-img-sm');
  });

  it('XCP-08 — the YouTube button is in the reference and not in this column', () => {
    const iMe = 'function iMe(t,n){1&t&&(d(0,"span",68),T(1,"i",71),u())}';
    expect(at(2_371_656, iMe)).toBe(iMe);
    const table = BUNDLE.slice(2_393_850, 2_393_850 + 8_000);
    expect(table).toContain('"data-bs-target","#play-youtube-modal"');
    expect(table).toContain('["ngbTooltip","Play YouTube For All","placement","left"');
    /* Positive first: the pane draws the buttons either side of the missing one. */
    expect(PANE).toContain('{...EXTRA_CHAT_GIF_TRIGGER}');
    expect(PANE).not.toContain('play-youtube-modal');
  });

  it('XCP-09 — the component ships 5,818 bytes of styles that this room has never transcribed', () => {
    /*
      Both halves measured, because either alone is misleading. The bundle HAS the stylesheet, and
      neither the generated sheet nor the capture it is generated FROM has ever seen this component
      — which is why this is a re-capture rather than a transcription anybody could do here.
    */
    const styles = 'styles:[".navbar[_ngcontent-%CO';
    expect(at(2_400_462, styles)).toBe(styles);
    expect(at(2_405_618, '#textAreaHolder')).toBe('#textAreaHolder');

    expect(CAPTURED_CSS).toContain('Captured runtime section');
    expect(CAPTURED_CSS).not.toContain('app-extra-chat');
    expect(GENERATOR_INPUT.length).toBeGreaterThan(600_000);
    expect(GENERATOR_INPUT).not.toContain('extra-chat');
  });
});

describe('the reasoning that left the component is where it says it went', () => {
  /**
   * The half of the extraction that a diff review cannot catch.
   *
   * `ExtraChatPane.svelte` had zero lines of ceiling headroom, so seven decisions moved into
   * `extra-chat-surface.ts` verbatim and each left a pointer behind. A pointer to a paragraph that
   * is not there is worse than the paragraph never having moved, because the pointer reads as
   * though the reasoning survived.
   */
  it('carries every relocated decision, and the pane still points at each', () => {
    expect([...EXTRA_CHAT_RELOCATED_DECISIONS]).toContain('EMOJI-10');
    for (const decision of EXTRA_CHAT_RELOCATED_DECISIONS) {
      expect(SURFACE, `${decision} is not in extra-chat-surface.ts`).toContain(decision);
    }
    expect(PANE_RAW).toContain('#lib/extra-chat-surface.ts');
    expect(PANE).toContain("from '#lib/extra-chat-surface.js'");
  });
});
