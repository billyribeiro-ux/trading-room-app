import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from './source-comments.js';

/**
 * THE CAROUSEL'S IMAGE-BROWSER MODAL, DECODED NODE BY NODE — `CD-01` to `CD-04`.
 *
 * ## Why there was anything left to find
 *
 * `note-image-browser-contract.test.ts` already pins this modal's STRINGS and its grid, and every
 * one of them was right: ` Select Image `, `No images found. Upload images via Files first.`, the
 * four `file-browser-*` classes and their four CSS rules. What nobody had read was the CHROME the
 * strings sit in — the header, its icon, its close button, and the footer — and all four of those
 * were invented.
 *
 * That is the shape this repository keeps meeting from the other side: a reader who looks up the
 * const a feature needs finds the feature and stops. `O0e` is nine nodes long and every one of them
 * names a const; decoding all nine took a minute and produced four corrections.
 *
 * ```js
 * function O0e(t,n){if(1&t){const e=Y();                          // byte 1,466,225
 *   d(0,"div",26)(1,"h4",72),T(2,"i",62),v(3," Select Image "),u(),
 *   d(4,"button",28),x("click",…dismiss()),T(5,"span",29),u()(),
 *   d(6,"div",30),H(7,A0e,4,0,"div",73)(8,P0e,4,0)(9,I0e,3,0),u(),
 *   d(10,"div",40)(11,"button",41),x("click",…dismiss()),v(12," Cancel "),u()()}
 * ```
 *
 * | node | const | value, read from the table at byte 1,483,532 |
 * | --- | --- | --- |
 * | 2 | 62 | `[1,"fas","fa-folder-open"]` — byte 1,486,004 |
 * | 4 | 28 | `["type","button","aria-label","Close",1,"close",3,"click"]` — byte 1,484,628 |
 * | 11 | 41 | `["type","button",1,"btn","btn-outline-dark",3,"click"]` — byte 1,485,128 |
 *
 * ## The one node that is deliberately NOT transcribed
 *
 * `T(5,"span",29)` is a CHILDLESS `<span aria-hidden="true">`. `T` is elementStart-and-end with no
 * children; a `×` would compile to `d(5,"span",29),v(6,"×"),u()`. So upstream's close button paints
 * nothing but its own padding — the glyph was lost somewhere above this build, and `.close` in the
 * captured sheet carries no `::before` to put it back. Reproducing that would reproduce an invisible
 * control, which `CLAUDE.md` names as the one reason not to match the reference. `note-icon-close`
 * is what the four sibling dialogs in this room already draw, and it is what is drawn here.
 *
 * ## `role="dialog"` is ours; the LABEL is the capture's since 2026-09-01
 *
 * Upstream writes neither directly: `openFileBrowser` opens the template through
 * `modalService.open(this.fileBrowserModal, {ariaLabelledBy:"file-browser-modal-title", size:"lg"})`
 * at byte 1,477,226, and NgbModal puts `role="dialog"` and `aria-labelledby` on a wrapper it owns.
 * Const 72 is `["id","file-browser-modal-title",1,"modal-title"]` — the id that binding points at.
 *
 * **This said `aria-label` was ours "for a measured reason", and the reason was wrong.** It read: *"a
 * literal document-unique id belongs to a component that is mounted once, and this one is mounted
 * inside `{#if dialog === 'carousel'}` in an editor that a room may hold more than one of."*
 * `NotesPane.svelte` says the opposite three levels up — *"`editingNoteId` is a single value — a
 * second instance could never be reached"* — so the id IS document-unique here, exactly as upstream.
 *
 * Both the id and the binding are transcribed now, and `note-editor-modal-labelling-contract.test.ts`
 * asserts the mount counts that make them safe rather than restating the claim. It also records the
 * sharper answer the blanket reason was hiding: the Giphy modal's `modal-basic-title` genuinely
 * cannot be a literal, because `GiphyPicker` is mounted at four sites.
 */

const DIALOG = svelteCodeOf(
  readFileSync(new URL('./components/notes/CarouselDialog.svelte', import.meta.url), 'utf8')
);

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

/**
 * The browser modal's own markup, sliced out of the file.
 *
 * Both bounds are locals and both are asserted, which `slice-anchor-contract` requires: an
 * `indexOf` written straight into a slice bound answers -1 when its marker moves, and `slice(-1)`
 * is a well-defined operation returning one character that every `toContain` below would then fail
 * against and every `not.toContain` would quietly pass against.
 */
const opens = DIALOG.indexOf('{#if fileBrowserTargetIndex !== null}');
const closes = DIALOG.indexOf('{#if carouselConfirm !== null}');
const browser = DIALOG.slice(opens, closes);

describe('the slice this file measures', () => {
  it('found the browser modal', () => {
    expect(opens, 'the browser branch must exist').toBeGreaterThan(-1);
    expect(closes, 'the confirmation block must follow it').toBeGreaterThan(opens);
    expect(browser).toContain('Select Image');
  });
});

describe('what the capture actually contains', () => {
  it('gives the header its folder icon, not the carousel modal s images icon', () => {
    expect(BUNDLE.slice(1_466_225, 1_466_400)).toContain('(1,"h4",72),T(2,"i",62)');
    expect(BUNDLE.indexOf('[1,"fas","fa-folder-open"]', 1_483_532)).toBe(1_486_004);
  });

  it('uses ONE close-button const for both of this component s modals', () => {
    expect(BUNDLE.indexOf('["type","button","aria-label","Close",1,"close",3,"click"]')).toBe(
      1_484_628
    );
    /* And its child is childless — `T`, not `d`+`v`+`u`. That is the node we do not copy. */
    expect(BUNDLE.slice(1_466_225, 1_466_470)).toContain('T(5,"span",29)');
  });

  it('uses ONE footer-button const for both dismissals', () => {
    expect(BUNDLE.indexOf('["type","button",1,"btn","btn-outline-dark",3,"click"]')).toBe(
      1_485_128
    );
    /* Node 11 of the browser, and node 25 of the carousel modal, are both const 41. */
    expect(BUNDLE.slice(1_466_470, 1_466_560)).toContain('d(10,"div",40)(11,"button",41)');
  });

  it('names the modal through NgbModal rather than in the template', () => {
    expect(BUNDLE.indexOf('ariaLabelledBy:"file-browser-modal-title"')).toBe(1_477_226);
    expect(BUNDLE).toContain('["id","file-browser-modal-title",1,"modal-title"]');
  });
});

describe('what this room renders', () => {
  it('CD-01 — the header icon is the folder, and the title class matches its sibling', () => {
    expect(browser).toContain('<i class="fas fa-folder-open"></i> Select Image');
    expect(browser).not.toContain('<i class="fas fa-images"></i> Select Image');
    /*
      `note-modal-title`, the same class the carousel modal's own heading wears. The browser said
      `modal-title` — Bootstrap's, not summernote's — which is a third spelling in a file that only
      ever needed one.
    */
    /* The class is still the carousel's; the id joined it in 2026-09-01's labelling change. */
    expect(browser).toContain('class="note-modal-title"');
    expect(browser).not.toContain('<h4 class="modal-title">');
  });

  it('CD-02 — the close button is `close`, as it is in every other note dialog', () => {
    expect(browser).toContain('class="close"');
    expect(browser).not.toContain('btn-close');
    expect(browser).toContain('<i class="note-icon-close"></i>');
    /* All five note dialogs agree now, which is the assertion that keeps a sixth from drifting. */
    expect(DIALOG.match(/class="close"/g)).toHaveLength(2);
  });

  it('CD-03 — the footer button is const 41, the same button the carousel modal dismisses with', () => {
    expect(browser).toContain('class="btn btn-outline-dark"');
    expect(browser).not.toContain('btn btn-secondary');
    expect(DIALOG.match(/class="btn btn-outline-dark"/g)).toHaveLength(2);
  });

  it('CD-04 — the modal announces itself as a dialog with a name', () => {
    expect(browser).toContain('role="dialog"');
    /*
      `aria-labelledby` and the id since 2026-09-01 — see this file's header for the premise that
      changed. The heading text is still asserted, on the element that now carries the id.
    */
    expect(browser).toContain('aria-labelledby="file-browser-modal-title"');
    expect(browser).toContain('<h4 id="file-browser-modal-title"');
    /*
      This case asserted the OPPOSITE until 2026-09-01 — `not.toContain('file-browser-modal-title')`
      — on the reasoning that *"this component is re-created on every open of an editor a room may
      hold several of, so a literal id is a duplicate waiting for a second note to be edited."*

      A room holds ONE editor: `NotesPane.svelte` gates it on `editingNoteId === note.id`, a single
      value, and says in as many words that *"a second instance could never be reached"*. The
      duplicate the case was defending against cannot occur, so the id is document-unique here for
      the same reason it is upstream.

      Inverted rather than deleted: the sentence it protected is exactly what changed.
      `note-editor-modal-labelling-contract.test.ts` asserts the mount counts so the premise is
      checked rather than re-argued.
    */
    expect(
      browser,
      'the label must not ALSO be an aria-label — one name, one source'
    ).not.toContain('aria-label="Select Image"');
  });
});
