import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from './source-comments.js';

/**
 * The carousel slide row — `x0e`, and the four rows of the surface audit it answers.
 *
 * ## What the row was
 *
 * ONE flat state: two `type="url"` boxes and a `Delete slide` button, rendered identically whether
 * a slide was empty, filling or filled. That single fact is why four separate audit rows could not
 * be built one at a time — ` Change image ` has nothing to change while the box holding the URL is
 * already on screen, and a "Delete this slide?" confirmation guards a splice that a presenter never
 * asked to be asked about.
 *
 * ```js
 * // x0e, byte 1,464,150 — decoded with this component's own consts table
 * d(0,"div",37)                                  //  37 [1,"carousel-slide-row","card","mb-2","p-2"]
 *   (1,"div",43)(2,"span",44), v(3),             //  43 flex line, 44 [1,"badge","badge-secondary","mr-2"]
 *   d(4,"button",45), T(5,"i",46),               //  45 [… "btn-outline-danger","ml-auto",3,"click","disabled"]
 *   H(6,D0e,4,0,"div",47)(7,E0e,20,4)(8,k0e,5,1),//  the three states
 *   d(9,"div",48)(10,"label",49), v(11,"Link URL "),
 *     d(12,"span",50), v(13,"(optional — clicking the image opens this)"),
 *   d(14,"input",51)
 * // …
 * m(3), Ne("#", i+1, ""),
 * z("disabled", 1 === o.carouselImages.length),
 * O(6, e.uploading ? 6 : e.url ? 8 : 7)
 * ```
 *
 * ## The four rows
 *
 * | row | what it wanted |
 * | --- | --- |
 * | `note-editor-carousel-slide-preview` | `k0e` — the preview and ` Change image ` |
 * | `note-editor-paste-url-regex` | `pendingUrl`, its check button, `keyup.enter`, the paste |
 * | `note-editor-carousel-destructive-confirms` | both `bootbox.confirm` questions |
 * | `note-editor-carousel-modal-chrome` | the `#N` badge, delete-disabled-at-one, ` Cancel ` |
 *
 * plus the label strings of `note-editor-carousel-labels`.
 */

/*
  `svelteCodeOf`, not the naive two-line strip: this file quotes the markup it renders AND carries
  `accept="image/*"`, whose `/*` opens a comment the whole-file regex closes thousands of characters
  later. `orphan-component-contract.test.ts` records both this file and `NoteEditor.svelte` as the
  two measured hazards.
*/
const DIALOG = svelteCodeOf(
  readFileSync(new URL('./components/notes/CarouselDialog.svelte', import.meta.url), 'utf8')
);
const EDITOR = svelteCodeOf(
  readFileSync(new URL('./components/notes/NoteEditor.svelte', import.meta.url), 'utf8')
);

describe('the three states, one at a time', () => {
  it('switches on uploading, then url, then neither — the reference s own order', () => {
    /*
      `O(6, e.uploading ? 6 : e.url ? 8 : 7)`. The order matters: a slide being replaced has BOTH a
      url and an upload in flight, and the spinner has to win or the presenter watches the old image
      sit there looking like nothing happened.
    */
    const at = DIALOG.indexOf('{#if uploadingSlideKey === slide.key}');
    expect(at, 'the spinner branch must come first').toBeGreaterThan(-1);
    const url = DIALOG.indexOf('{:else if slide.url}', at);
    expect(url, 'the filled branch must follow it').toBeGreaterThan(at);
    expect(DIALOG.indexOf('{:else}', url), 'the empty branch is last').toBeGreaterThan(url);
  });

  it('previews the filled slide and offers ` Change image `', () => {
    /* `k0e` — const 68 the box, 69 the image, 70 the button, 71 `fa-times`. */
    expect(DIALOG).toContain('<div class="carousel-img-preview mb-2">');
    expect(DIALOG).toContain('<img class="carousel-preview-img" src={slide.url}');
    expect(DIALOG).toContain('class="btn btn-sm btn-outline-secondary mt-1"');
    expect(DIALOG).toContain('><i class="fas fa-times"></i> Change image</button');
  });

  it('carries the reference s own CSS for both, and no invented rule', () => {
    /*
      The old `.carousel-slide-row` was a hand-written grid with a bottom border — a rule picked
      because it looked right. Upstream's is a bordered card on a tinted ground (byte 1,488,253),
      with the spacing coming from the `card mb-2 p-2` classes const 37 carries.
    */
    expect(DIALOG).toContain('<div class="carousel-slide-row card mb-2 p-2">');
    expect(DIALOG).toContain('max-height: 50vh;');
    expect(DIALOG).toContain('background-color: #fafafa;');
    expect(DIALOG).toContain('max-height: 140px;');
    expect(DIALOG).toContain('object-fit: contain;');
    expect(DIALOG).not.toContain('border-bottom: 1px solid #ddd;');
  });
});

describe('the staged URL', () => {
  const at = DIALOG.indexOf('function confirmCarouselImageUrl');
  const closes = DIALOG.indexOf('\n  }', at);
  const confirmBody = DIALOG.slice(at, closes);

  it('exists, and this block s slice bounds found it', () => {
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    expect(closes, 'the handler must be closed').toBeGreaterThan(at);
  });

  it('binds the INPUT to pendingUrl and never to url', () => {
    /*
      This is the reason the two-step is not "nothing left to do", which is what the audit assumed
      while the field was bound straight through: `url` decides which state renders, so a directly
      bound box flips the row into an `<img src="h">` on the first keystroke and takes itself off
      the screen.
    */
    expect(DIALOG).toContain('value={slide.pendingUrl}');
    expect(DIALOG).toContain("updateCarouselSlide(index, 'pendingUrl', event.currentTarget.value)");
    expect(DIALOG).not.toContain("updateCarouselSlide(index, 'url', event.currentTarget.value)");
  });

  it('promotes it trimmed, and only when there is something to promote', () => {
    expect(confirmBody).toContain('const staged = carouselSlides[index]?.pendingUrl.trim();');
    expect(confirmBody).toContain('if (!staged) return;');
    expect(confirmBody).toContain("updateCarouselSlide(index, 'url', staged);");
  });

  it('offers all three of the reference s ways to confirm', () => {
    /* The check button (const 67, disabled on an empty trim), Enter, and a matching paste. */
    expect(DIALOG).toContain("disabled={slide.pendingUrl.trim() === ''}");
    expect(DIALOG).toContain('onclick={() => confirmCarouselImageUrl(index)}');
    expect(DIALOG).toContain("if (event.key !== 'Enter') return;");
    expect(DIALOG).toContain('onpaste={(event) => onCarouselUrlPaste(event, index)}');
  });

  it('auto-confirms a pasted IMAGE url by the transcribed regex, and nothing else', () => {
    /*
      `/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|jfif|svg)(\?.*)?$/i` — character for character, `jfif`
      included. Deliberately narrow: anything it does not match falls through to the browser's own
      paste, so a URL with no extension is not rejected, merely not auto-confirmed.

      The anchors are what make running this on a paste safe. `^https?://` and the `(\?.*)?$` tail
      mean no `javascript:` or `data:` payload can match, and the value lands in an `<img src>`.
    */
    expect(DIALOG).toContain(
      'const CAROUSEL_IMAGE_URL = /^https?:\\/\\/.+\\.(jpg|jpeg|png|gif|webp|jfif|svg)(\\?.*)?$/i;'
    );
    const paste = DIALOG.indexOf('function onCarouselUrlPaste');
    expect(paste, 'the paste handler must exist').toBeGreaterThan(-1);
    const pasteEnd = DIALOG.indexOf('\n  }', paste);
    expect(pasteEnd, 'the paste handler must be closed').toBeGreaterThan(paste);
    const pasteBody = DIALOG.slice(paste, pasteEnd);
    /* preventDefault fires ONLY on the matching branch, which is why the guard is written first. */
    expect(
      pasteBody.indexOf('if (!pasted || !CAROUSEL_IMAGE_URL.test(pasted)) return;')
    ).toBeLessThan(pasteBody.indexOf('event.preventDefault();'));
  });
});

describe('the two confirmations', () => {
  it('asks before deleting a slide, in the reference s words', () => {
    /*
      `removeCarouselImage`, byte 1,475,669 — `"Delete this slide?"`, confirm `Delete`/`btn-danger`,
      cancel `btn-default`. This was an immediate splice, and it was the one destructive path in the
      note surface that skipped the house pattern `NotesPane` already uses for delete-note,
      revert-version and welcome-mat.
    */
    expect(DIALOG).toContain("'Delete this slide?'");
    expect(DIALOG).toContain("'btn btn-danger bootbox-accept'");
    expect(DIALOG).toContain('onclick={() => requestRemoveCarouselSlide(index)}');
  });

  it('asks before replacing an image, and STAGES the old url rather than discarding it', () => {
    /*
      `clearCarouselImage`, byte 1,476,242 — `"Change this image?"`, `Change`/`btn-warning`. The old
      URL moves INTO the staging field, so a presenter who changes their mind can press the check
      and have it back. That is why it is a `clear` and not a delete.
    */
    expect(DIALOG).toContain("'Change this image?'");
    expect(DIALOG).toContain("'btn btn-warning bootbox-accept'");
    expect(DIALOG).toContain("{ ...slide, pendingUrl: slide.url, url: '' }");
  });

  it('is raised through the project s dialog primitive, never window.confirm', () => {
    expect(DIALOG).toContain('<BootboxDialog');
    expect(DIALOG).not.toContain('window.confirm');
    expect(DIALOG).not.toContain('bootbox.confirm(');
  });

  it('keys the pending question by SLIDE, and re-finds it on accept', () => {
    /*
      Same argument as the upload spinner: `removeCarouselSlide` renumbers, and an upload can land
      while the dialog is open. An index captured when the question was asked can point at a
      different slide by the time it is answered.
    */
    expect(DIALOG).toContain(
      "type CarouselConfirm = { kind: 'delete-slide' | 'change-image'; key: number };"
    );
    expect(DIALOG).toContain(
      'const index = carouselSlides.findIndex((slide) => slide.key === pending.key);'
    );
    expect(DIALOG).not.toContain('carouselConfirmIndex');
  });

  it('cannot have both questions open at once', () => {
    /* One nullable union, not two booleans — two flags can disagree about which dialog is up. */
    expect(DIALOG).toContain('let carouselConfirm = $state.raw<CarouselConfirm | null>(null);');
    expect(DIALOG).toContain('{#if carouselConfirm !== null}');
  });
});

describe('the modal chrome', () => {
  it('numbers each slide and refuses to delete the last one', () => {
    /*
      `Ne("#", i+1, "")` on const 44, and `z("disabled", 1 === o.carouselImages.length)` on 45.

      The disabled state REPLACES a behaviour that reached the same end state by a worse route:
      deleting the last row used to splice it out and silently re-add a blank one, so the
      presenter's row appeared to survive a delete they had just asked for.
    */
    expect(DIALOG).toContain('<span class="badge badge-secondary mr-2">#{index + 1}</span>');
    expect(DIALOG).toContain('disabled={carouselSlides.length === 1}');
    expect(DIALOG).toContain('<i class="fas fa-trash"></i>');
  });

  it('has a footer Cancel, and both ways out are the same act', () => {
    /*
      Const 41, ` Cancel `. The footer held one button and dismissal was the header X alone — a
      modal whose only way out is an unlabelled X in a corner is one a presenter can fail to find.
    */
    const dismissals = [...DIALOG.matchAll(/onclick=\{dismissCarouselModal\}/g)];
    expect(dismissals, 'the header X and the footer Cancel, and nothing else').toHaveLength(2);
    expect(DIALOG).toContain('class="btn btn-outline-dark"');
  });

  it('uses the captured label strings, not the ones that were here', () => {
    for (const label of [
      'Rotation interval (seconds)',
      'Height (%)',
      '>Slides<',
      '<i class="fas fa-plus"></i> Add slide',
      'Link URL ',
      '(optional — clicking the image opens this)',
      'Image <span class="text-danger">*</span>'
    ]) {
      expect(DIALOG, label).toContain(label);
    }
    /* The three that were invented. `Delete slide` is now the icon-only const-46 trash. */
    expect(DIALOG).not.toContain('>Interval (seconds)<');
    expect(DIALOG).not.toContain('Link / URL');
    expect(DIALOG).not.toContain('>Delete slide</button');
  });
});

describe('the seam between the dialog and the editor', () => {
  it('hands the dialog values, never the editor', () => {
    /*
      The whole justification for the extraction. Nothing in `CarouselDialog` touches Tiptap: no
      instance, no selection, no document. It is handed what a carousel is made of, edits it, and
      hands it back once.
    */
    expect(DIALOG).not.toContain('editor');
    expect(DIALOG).not.toContain('Tiptap');
    expect(DIALOG).not.toContain('chain()');
  });

  it('seeds its state ONCE, and says so in code rather than in a comment', () => {
    /*
      `untrack` is load-bearing here. Reading a prop in a component body is exactly what Svelte's
      `state_referenced_locally` warns about, because the usual mistake is meaning `$derived` and
      getting a snapshot. Here the snapshot IS the intent — a `$derived` would throw away everything
      the presenter typed the moment anything upstream re-evaluated.
    */
    expect(DIALOG).toContain("import { tick, untrack } from 'svelte';");
    expect(DIALOG).toContain('let carouselInterval = $state(untrack(() => initialInterval));');
    expect(DIALOG).toContain('let carouselHeight = $state(untrack(() => initialHeight));');
  });

  it('is mounted inside the branch, so closing it discards the draft', () => {
    /*
      The seed is only sound because the component is destroyed on close and rebuilt on open. Keep
      it alive and hidden and a stale half-typed carousel outlives the note it belonged to.
    */
    const branch = EDITOR.indexOf("{:else if dialog === 'carousel'}");
    expect(branch, 'the branch must exist').toBeGreaterThan(-1);
    expect(EDITOR.indexOf('<CarouselDialog', branch)).toBeGreaterThan(branch);
    expect(EDITOR.indexOf('{/if}', branch)).toBeGreaterThan(
      EDITOR.indexOf('<CarouselDialog', branch)
    );
  });

  it('keeps the document rule in the EDITOR, where the document is', () => {
    /*
      The `https://` filter is a rule about what the document will accept, not about what a
      presenter may type — `parseCarouselSlides` applies the same one on the way back in. Moving it
      into the dialog would put half the rule in a component that cannot see the other half.
    */
    expect(EDITOR).toContain(
      "const slides = config.slides.filter(({ url }) => url.trim().startsWith('https://'));"
    );
    expect(DIALOG).not.toContain("startsWith('https://')");
  });

  it('drops the dialog s own bookkeeping on the way out', () => {
    /* `key` is the each block's identity and `pendingUrl` is the staging field. Neither is a node. */
    const at = DIALOG.indexOf('function submitCarousel');
    expect(at, 'the submit must exist').toBeGreaterThan(-1);
    const end = DIALOG.indexOf('\n  }', at);
    expect(end, 'the submit must be closed').toBeGreaterThan(at);
    const body = DIALOG.slice(at, end);
    expect(body).toContain('slides: carouselSlides.map(({ link, url }) => ({ link, url })),');
    expect(body).not.toContain('key');
    expect(body).not.toContain('pendingUrl');
  });
});
