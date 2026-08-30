import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { sessionImageFiles } from './session-image-files.js';
import { svelteCodeOf } from './source-comments.js';

/**
 * The note carousel's image browser — `note-editor-file-browser-modal`.
 *
 * ## What was missing
 *
 * The carousel dialog offered a bare URL box per slide and nothing else, so a presenter who had
 * already uploaded an image through Files had **no way to reach it** from a slide. They had to know
 * the URL.
 *
 * ## The reference, decoded with this component's own consts
 *
 * ```js
 * openFileBrowser(e) {                                              // byte 1,477,053
 *   this.fileBrowserTargetIndex = e, this.fileBrowserImages = [], this.fileBrowserLoading = !0,
 *   this.fileBrowserModalRef = this.modalService.open(this.fileBrowserModal, {…}),
 *   this.httpClient.post(`${apiROOT}/sessions/v2/cmd`,
 *     { tok: …, cmd: "getSessionFiles", uploadType: "files" }).subscribe({
 *       next: o => { this.fileBrowserLoading = !1,
 *         o?.success && o.files && (this.fileBrowserImages =
 *           o.files.filter(s => s.contentType?.includes("image/"))) } })
 * }
 * ```
 *
 * ```
 * 77  [1,"file-browser-grid"]                              R0e/I0e, byte 1,465,937
 * 79  [1,"file-browser-item",3,"click","title"]
 * 80  [1,"file-browser-thumb",3,"src","alt"]
 * 81  [1,"file-browser-name"]
 * ```
 *
 * with the strings verbatim — ` Select Image `, `No images found. Upload images via Files first.`,
 * ` Cancel ` — and four CSS rules at byte 1,486,651.
 */

/*
  `CarouselDialog.svelte` since 2026-08-30, `NoteEditor.svelte` before it. The carousel modal, this
  browser, the per-slide upload and the two confirmations were extracted into their own component
  when the three-state slide row put the editor at 2,214 lines and `source-size-contract` refused it
  — its rule is that ceilings only go down and a slice comes out instead. Nothing about the markup
  below changed in that move, which is why these assertions are re-pointed rather than rewritten.
*/
const EDITOR = readFileSync(
  new URL('./components/notes/CarouselDialog.svelte', import.meta.url),
  'utf8'
);
const AREA = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');
/*
  Comments stripped — the component quotes the very markup and consts it renders.

  `svelteCodeOf` and NOT the two-line `replace` every other contract test uses, because this is one
  of the files where that one is wrong: `CarouselDialog.svelte` contains `accept="image/*"`, an
  ordinary HTML attribute whose `/*` opens a block comment the naive pattern closes thousands of
  characters later. Half this file vanished on the first draft of these assertions. A `toContain`
  fails loudly, which is how it was caught; a `not.toContain` would have passed for a defect that is
  still there.

  `orphan-component-contract.test.ts` measured all of that on 2026-08-29 and carries the tripwire for
  a fifth such file; what changed on 2026-08-30 is only that its correct implementation stopped being
  local to it.
*/
const editorCode = svelteCodeOf(EDITOR);
const areaCode = svelteCodeOf(AREA);

const file = (name: string, contentType: string | null) => ({
  name,
  url: `/uploads/${name}`,
  contentType
});

describe('which files are offered', () => {
  it('images only', () => {
    expect(
      sessionImageFiles([
        file('shot.png', 'image/png'),
        file('deck.pdf', 'application/pdf'),
        file('clip.mp4', 'video/mp4')
      ]).map((entry) => entry.name)
    ).toEqual(['shot.png']);
  });

  it('matches `includes`, not `startsWith` — which is transcribed, not tightened', () => {
    /*
      `s.contentType?.includes("image/")` matches anywhere in the string. It reads like a mistake and
      it is the shipped filter; narrowing it would silently drop a file the reference shows, and the
      worst case of the loose version is a broken thumbnail in a grid the presenter chose to open.
    */
    expect(sessionImageFiles([file('odd', 'application/x-image/thing')])).toHaveLength(1);
  });

  it('skips a row with no content type rather than throwing', () => {
    /*
      The optional chain is upstream's. This room's column is NOT NULL with a default, so the case is
      unreachable here — kept because the list arrives as JSON on the page payload, and "unreachable"
      is a claim about our writer.
    */
    expect(sessionImageFiles([file('mystery', null)])).toEqual([]);
    expect(sessionImageFiles(null)).toEqual([]);
    expect(sessionImageFiles(undefined)).toEqual([]);
  });

  it('keeps the page s order rather than re-sorting', () => {
    /*
      The Files pane shows the same rows in the same order (`orderBy(asc(createdAt))`); a browser
      that disagreed with the pane it is browsing would be its own small confusion.
    */
    expect(
      sessionImageFiles([file('b.png', 'image/png'), file('a.png', 'image/png')]).map(
        (entry) => entry.name
      )
    ).toEqual(['b.png', 'a.png']);
  });
});

describe('the browser', () => {
  it('is reachable from every slide, by the button the reference labels ` Browse `', () => {
    /*
      THIS ASSERTION WAS WRONG WHEN IT SHIPPED IN `1b93d65`, and it was wrong in the direction that
      makes a contract test worthless: it pinned a label I had invented. ` Select Image ` is the
      MODAL's title (byte 1,466,205); the button that opens it is ` Browse ` with `fas fa-folder-open`
      and `btn btn-sm btn-outline-info mb-0 ml-1` (const 61/62, byte 1,462,300). The test agreed with
      the code because I wrote both from the same wrong memory, which is the whole reason this
      repository transcribes consts by value rather than describing them.
    */
    expect(editorCode).toContain('onclick={() => openFileBrowser(index)}');
    expect(editorCode).toContain('class="btn btn-sm btn-outline-info mb-0 ml-1"');
    expect(editorCode).toContain('><i class="fas fa-folder-open"></i> Browse</button');
    /* And the invented label is gone from the BUTTON — it survives only as the modal's title. */
    expect(editorCode).not.toContain('>Select Image</button');
  });

  it('says why it is unavailable rather than opening on nothing', () => {
    /*
      A `Select Image` that opens an empty grid is a control that reports a capability it does not
      have. The room's own empty state still exists for the case where the list empties while the
      dialog is open.
    */
    expect(editorCode).toContain('disabled={sessionImages.length === 0}');
    expect(editorCode).toContain("'No images have been uploaded to this room yet.'");
  });

  it('draws the reference s grid, item, thumb and name', () => {
    expect(editorCode).toContain('{#if fileBrowserTargetIndex !== null}');
    expect(editorCode).toContain('<div class="file-browser-grid">');
    expect(editorCode).toContain('class="file-browser-item"');
    expect(editorCode).toContain('class="file-browser-thumb"');
    expect(editorCode).toContain('<div class="file-browser-name">{file.name}</div>');
    expect(editorCode).toContain('No images found. Upload images via Files first.');
    expect(editorCode).toContain('Select Image');
  });

  it('has all four transcribed CSS rules, in the component s own scope', () => {
    /*
      The reference's block is component-scoped (`[_ngcontent-%COMP%]`), which is exactly what a
      Svelte `<style>` gives — so they are reproduced here rather than in a shared sheet, beside the
      markup they scope to. `img-dimensions-contract` reads this same block to prove the thumbnail
      has a box.
    */
    for (const rule of [
      '.file-browser-grid',
      '.file-browser-item',
      '.file-browser-thumb',
      '.file-browser-name'
    ]) {
      expect(editorCode, rule).toContain(`${rule} {`);
    }
    expect(editorCode).toContain('grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));');
    expect(editorCode).toContain('object-fit: cover;');
  });

  it('does NOT draw a loading state, and that omission is measured', () => {
    /*
      Upstream switches three ways — `O(7, fileBrowserLoading ? 7 : 0 === images.length ? 8 : 9)` —
      because it POSTs `getSessionFiles` on every open. This room's list arrives with the page load
      and every upload path invalidates it, so there is no moment at which it is loading. A branch
      that can never render is a branch that can never be checked.
    */
    expect(editorCode).not.toContain('Loading images...');
    expect(editorCode).not.toContain('fileBrowserLoading');
    /* And nothing fetches, which is the other half of the same claim. */
    expect(editorCode).not.toContain('getSessionFiles');
  });

  it('fills the slide s IMAGE field, never its link', () => {
    /*
      Upstream binds `z("src", e.vidPath)` on the thumbnail and fills the slide's image field. A
      presenter who wants the slide to link somewhere types that separately, which is why the row has
      two inputs.
    */
    const at = editorCode.indexOf('function selectFileForSlide');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const closes = editorCode.indexOf('\n  }', at);
    expect(closes, 'the handler must be closed').toBeGreaterThan(at);
    const body = editorCode.slice(at, closes);

    expect(body).toContain("updateCarouselSlide(index, 'url', file.url);");
    expect(body).not.toContain("'link'");
    /* Closed BEFORE the write, so a second click cannot land on a stale target. */
    expect(body.indexOf('fileBrowserTargetIndex = null')).toBeLessThan(
      body.indexOf('updateCarouselSlide')
    );
  });

  it('is fed by the page, filtered once', () => {
    expect(areaCode).toContain('const carouselImages = $derived(sessionImageFiles(data.files));');
    expect(areaCode).toContain('sessionImages={carouselImages}');
  });
});

/**
 * The per-slide upload — the OTHER half of `E0e`, and the half a presenter reaches first.
 *
 * The browser above can only offer what is already in the room. `uploadCarouselImage` is how an
 * image GETS there from inside the carousel dialog, and without it a presenter building a carousel
 * had to leave, open Files, upload, come back and re-open the dialog — which loses the slides they
 * had already typed, because this modal holds them in component state.
 *
 * ```js
 * uploadCarouselImage(e, i) {                                       // byte 1,476,460
 *   const o = e.target, s = o.files?.[0];
 *   if (!s) return;
 *   const r = this.carouselImages[i];
 *   r.uploading = !0;
 *   … POST FormData{image, name} …
 *   success: h => { r.url = h.data.link, r.uploading = !1 },
 *   error:   h => { r.uploading = !1, bootbox.alert("Image upload failed.") }
 *   o.value = ""
 * }
 * ```
 */
describe('the per-slide upload', () => {
  /*
    Both bounds are LOCALS and both are asserted below, which `slice-anchor-contract` requires and
    which this file's `selectFileForSlide` block already does: an `indexOf` written straight into a
    slice bound returns -1 when the marker moves, and `slice(-1)` is a well-defined operation
    returning one character that every `toContain` below would then quietly fail against — or worse,
    that every `not.toContain` would quietly pass against.
  */
  const at = editorCode.indexOf('async function uploadCarouselImage');
  const closes = editorCode.indexOf('\n  }', at);
  const body = editorCode.slice(at, closes);

  it('exists, and this block s slice bounds found it', () => {
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    expect(closes, 'the handler must be closed').toBeGreaterThan(at);
  });

  it('is triggered by a LABEL over a hidden input, which is the reference s own pattern', () => {
    /*
      Const 58 is `["type","file","accept","image/*",2,"display","none",3,"change","id"]` and 59 is
      `[1,"btn","btn-sm","btn-outline-secondary","mb-0"]`. A bare `<input type="file">` cannot be
      styled to match the buttons beside it; a `<label for>` over a hidden one can, and it is
      keyboard-reachable and screen-reader-labelled for free. `cfi_{index}` is the id both halves
      agree on — get it wrong and the control silently does nothing, which is why it is pinned.
    */
    expect(editorCode).toContain('accept="image/*"');
    expect(editorCode).toContain('style="display: none"');
    expect(editorCode).toContain('id="cfi_{index}"');
    expect(editorCode).toContain('onchange={(event) => uploadCarouselImage(event, index)}');
    expect(editorCode).toContain(
      '<label class="btn btn-sm btn-outline-secondary mb-0" for="cfi_{index}"'
    );
    expect(editorCode).toContain('><i class="fas fa-upload"></i> Upload</label');
  });

  it('takes the FIRST file only, as upstream does even though the input is not `multiple`', () => {
    expect(body).toContain('const file = input.files?.[0];');
  });

  it('clears the input unconditionally, so the same file can be chosen twice', () => {
    /*
      Upstream clears at the END of a synchronous body. Ours clears FIRST, and the difference is the
      `await`: an early `return` after the await point would leave the input holding a file it had
      already consumed, and the next `change` for that same file would never fire. Cleared before
      anything can return, the two orders are equivalent for every path that reaches the upload.
    */
    const cleared = body.indexOf("input.value = '';");
    expect(cleared, 'the input must be cleared').toBeGreaterThan(-1);
    expect(cleared, 'before any early return').toBeLessThan(body.indexOf('if (!file) return;'));
    expect(cleared).toBeLessThan(body.indexOf('await onUploadImages'));
  });

  it('writes the URL only on SUCCESS, and addresses the slide by KEY on the way back', () => {
    /*
      Two rules in one line, and the second is not upstream's. Upstream holds a REFERENCE to the
      slide object (`const r = this.carouselImages[i]`) and mutates it, so a deletion during the
      upload writes into a detached object and is harmlessly lost. Ours replaces the array wholesale
      (`$state.raw`), so an index captured before the await can point at a DIFFERENT slide after
      `removeCarouselSlide` renumbers. Re-finding by key is what makes the two behave the same.
    */
    expect(body).toContain('const [url] = await onUploadImages([file]);');
    expect(body).toContain(
      'const at = carouselSlides.findIndex((entry) => entry.key === slide.key);'
    );
    expect(body).toContain("if (url && at !== -1) updateCarouselSlide(at, 'url', url);");
    /* The failure is a dialog, as `bootbox.alert("Image upload failed.")` is. */
    expect(body).toContain("errorMessage = 'Image upload failed.';");
    expect(body).toContain('} catch {');
  });

  it('spins on the slide s KEY, never its index', () => {
    /*
      `removeCarouselSlide` renumbers every row after the one it drops. A spinner keyed by index
      would jump to the wrong row the moment a presenter deletes a slide above an upload in flight —
      a defect that only appears under a race, which is exactly the kind this repository pins rather
      than discovers.
    */
    expect(editorCode).toContain('let uploadingSlideKey = $state<number | null>(null);');
    expect(editorCode).toContain('uploadingSlideKey = slide.key;');
    expect(editorCode).toContain('{#if uploadingSlideKey === slide.key}');
    expect(editorCode).not.toContain('uploadingSlideIndex');
  });

  it('always clears the spinner, including on a throw', () => {
    const finallyAt = body.indexOf('} finally {');
    expect(finallyAt, 'the handler must have a finally').toBeGreaterThan(-1);
    expect(body.slice(finallyAt)).toContain('uploadingSlideKey = null;');
  });

  it('reuses this room s uploader rather than transcribing the reference s POST', () => {
    /*
      `onUploadImages` is the prop the Insert Image dialog has always used — CDN when configured,
      `composer-image.remote.ts` otherwise. A second `$.ajax` here would be a second uploader with its
      own credential handling, which is the shape the 2026-08-07 escalation came out of.
    */
    expect(body).not.toContain('FormData');
    expect(editorCode).not.toContain('upload_server');
  });

  it('draws the reference s spinner, by its consts', () => {
    /*
      `D0e` is `d(0,"div",47), T(1,"i",52), d(2,"div",53), v(3,"Uploading...")` — const 47
      `[1,"text-center","py-2"]`, 52 the icon, 53 `[1,"small","mt-1"]`.

      IT SHIPPED THIS MORNING AS `<span class="mx-2">` around a `<span class="small mt-1">`, both
      invented. Corrected when the three-state row was transcribed and the whole of `x0e` was
      decoded rather than only the parts a feature needed — which is the argument for reading a
      template end to end before writing any of it.
    */
    expect(editorCode).toContain('<div class="text-center py-2">');
    expect(editorCode).toContain('<i class="fas fa-spinner fa-spin fa-2x text-primary"></i>');
    expect(editorCode).toContain('<div class="small mt-1">Uploading...</div>');
    expect(editorCode).not.toContain('<span class="mx-2"');
  });
});
