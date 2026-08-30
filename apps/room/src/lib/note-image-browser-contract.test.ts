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

const EDITOR = readFileSync(
  new URL('./components/notes/NoteEditor.svelte', import.meta.url),
  'utf8'
);
const AREA = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');
/*
  Comments stripped — the component quotes the very markup and consts it renders.

  `svelteCodeOf` and NOT the two-line `replace` every other contract test uses, because this is one
  of the four files where that one is wrong: `NoteEditor.svelte` contains `accept="image/*"`, an
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
  it('is reachable from every slide', () => {
    expect(editorCode).toContain('onclick={() => openFileBrowser(index)}');
    expect(editorCode).toContain('>Select Image</button');
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
