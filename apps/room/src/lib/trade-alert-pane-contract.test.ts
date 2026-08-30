import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `dta-01` … `dta-04` — the two trade-alert panes, which are twins and must stay twins.
 *
 * ```js
 * ii(".day-trade-alert-form").addClass("animated flash");
 * const s = setTimeout(() => { ii(".day-trade-alert-form").removeClass("animated flash"),
 *                              clearTimeout(s) }, 500)                    // byte 1,988,722
 *
 * bootbox.dialog({ …, size: "large",
 *   buttons: { download: { label: '<i class="fa fa-download"></i> Download Image',
 *                          className: "btn-primary btn-sm m-auto", … } } })  // byte 1,992,730
 *
 * bootbox.confirm({ message: '<div class="text-center"><h4>Upload this image?</h4>' +
 *   '<img style="max-width:100%; max-height: 50vh;" src="' + a + '" /> </div>', … })
 *                                                                          // byte 1,992,250
 * ```
 *
 * ## Every assertion here runs TWICE, and that is the point
 *
 * Day trade and swing are two components with one behaviour, and all four rows were missing from
 * BOTH. A test that checks one of them is a test that lets the pair drift, which is how this pair
 * came to need four identical fixes in the first place.
 */

const read = (path: string) => readFileSync(path, 'utf8');

const PANES = [
  ['day trade', 'src/lib/components/day-trade-alerts/DayTradeAlertsPane.svelte'],
  ['swing', 'src/lib/components/swing-alerts/SwingAlertsPane.svelte']
] as const;

const FORMS = [
  ['day trade', 'src/lib/components/day-trade-alerts/DayTradeAlertForm.svelte'],
  ['swing', 'src/lib/components/swing-alerts/SwingAlertForm.svelte']
] as const;

/** Comments stripped: this file's prose quotes every string it asserts. */
const code = (path: string) => codeOf(path, read(path));

describe('dta-01 — Edit flashes the composer', () => {
  it.each(FORMS)('%s: the form wears the attachment', (_name, path) => {
    expect(code(path)).toContain('{@attach flashOnEdit(flashNonce)}');
  });

  it.each(PANES)('%s: the pane bumps the nonce when Edit is pressed', (_name, path) => {
    const source = code(path);
    const at = source.indexOf('function requestEdit(');
    expect(at, 'requestEdit is missing').toBeGreaterThan(-1);
    const to = source.indexOf('\n  }', at);
    expect(to, 'requestEdit is never closed').toBeGreaterThan(at);
    expect(source.slice(at, to)).toContain('flashNonce += 1;');
  });

  it('is a COUNTER, because a boolean cannot flash twice inside 500ms', () => {
    /*
      With a boolean, a second Edit inside the window leaves the value already `true`, nothing
      re-runs, and the FIRST timer strips the class off the second flash. The presenter presses Edit,
      sees nothing, and is back to the defect the row is about.
    */
    for (const [, path] of PANES) expect(code(path)).toContain('let flashNonce = $state(0);');
    expect(code('src/lib/flash-on-edit.ts')).toContain('if (nonce === 0) return;');
  });

  it('cancels the previous timer rather than letting it end the new flash', () => {
    /* Svelte's own contract for attachments: the returned function runs BEFORE the re-run. */
    expect(code('src/lib/flash-on-edit.ts')).toContain('clearTimeout(timer);');
  });
});

describe('dta-02 and dta-03 — the image lightbox', () => {
  it.each(PANES)('%s: opens large, as `size:"large"` does', (_name, path) => {
    expect(code(path)).toContain('className="modal-lg"');
  });

  it.each(PANES)('%s: its only button is Download Image', (_name, path) => {
    const source = code(path);
    expect(source).toContain('class="btn btn-primary btn-sm m-auto"');
    expect(source).toContain('<i class="fa fa-download"></i> Download Image');
    /* The `footer` snippet is what suppresses the default OK — `buttons:` REPLACES it upstream. */
    expect(source).toContain('{#snippet footer()}');
  });

  it.each(PANES)(
    '%s: saving closes the dialog, as the reference s callback does',
    (_name, path) => {
      const source = code(path);
      const at = source.indexOf('downloadImage(previewUrl);');
      expect(at, 'the download is not wired').toBeGreaterThan(-1);
      expect(source.slice(at, at + 80)).toContain('dialog = null;');
    }
  );
});

describe('dta-04 — the paste confirm asks its question', () => {
  it('carries the heading on BOTH panes, not just the chat composer s', () => {
    /*
      Counted rather than `toContain`ed: the chat composer's copy has had this heading since it was
      built, so a single-occurrence check was already satisfied before either pane had it.
    */
    const overlays = code('src/lib/components/RoomOverlays.svelte');
    expect(overlays.match(/<h4>Upload this image\?<\/h4>/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('sizes the preview at the reference s 50vh rather than inheriting 70vh', () => {
    const overlays = code('src/lib/components/RoomOverlays.svelte');
    expect(overlays.match(/style="max-height: 50vh;"/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('the download itself', () => {
  it('is a module, so a pane does not have to hold the room s modal state to save a file', () => {
    /*
      It was a method on `RoomModals` with one caller. `dta-02` needed two more, in components that
      do not hold `RoomModals` and should not — and it was never modal state: no field, no
      lifecycle, nothing rendered. A method whose class it never touches is a function that has not
      been extracted yet.
    */
    expect(read('src/lib/room/modals.svelte.ts')).not.toContain('downloadImage(url: string)');
    expect(code('src/lib/components/RoomOverlays.svelte')).toContain(
      'onclick={() => downloadImage(modals.selectedImageUrl as string)}'
    );
  });

  it('keeps the reference s two filename rules, which are not cosmetic', () => {
    /*
      `replace(/^[^_]+_/, '')` drops the upload id this room's storage prefixes and
      `replace(/_[^_]+(\.[^.]+)$/, '$1')` drops the size suffix — without them a presenter saving a
      screenshot gets `a3f9c1_chart_1024.png` instead of `chart.png`.
    */
    const source = code('src/lib/download-image.ts');
    expect(source).toContain("replace(/^[^_]+_/, '')");
    expect(source).toContain("replace(/_[^_]+(\\.[^.]+)$/, '$1')");
    expect(source).toContain("|| 'image.jpg'");
  });
});
