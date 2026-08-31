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
  /*
    ## The three copies became ONE on 2026-08-31, which is why this counts differently now

    The assertion here used to be `>= 3` occurrences inside `RoomOverlays.svelte`, and the comment
    beside it explained why counting beat `toContain`: the chat composer's copy had carried the
    heading since it was built, so a single-occurrence check was already satisfied before either
    alert pane had it.

    **That is a defence against three copies, and the right fix was to stop having three.** The
    dialog is `ImagePasteConfirm.svelte` now — one component with the heading in it, rendered by all
    three call sites — so the property to assert is no longer "how many copies say it" but "the one
    that all three use says it", plus "all three still use it". Both are below, and together they
    are strictly stronger: the old count passed if two copies had the heading and a third had been
    added without it, as long as the total reached three.
  */
  it('asks the question, in the one dialog all three pastes now render', () => {
    const confirm = code('src/lib/components/ImagePasteConfirm.svelte');
    expect(confirm.match(/<h4>Upload this image\?<\/h4>/g)?.length).toBe(1);
  });

  it('sizes the preview at the reference s 50vh rather than inheriting 70vh', () => {
    const confirm = code('src/lib/components/ImagePasteConfirm.svelte');
    expect(confirm.match(/style="max-height: 50vh;"/g)?.length).toBe(1);
  });

  it('and all three pastes still reach it', () => {
    /*
      The half the count used to buy. Each call site keeps its OWN `onconfirm`, because
      `doImggurUpload` dispatches on a feature name deny-by-default (byte 1,992,037) — sharing one
      handler is how an image meant for a form is posted into chat.
    */
    const overlays = code('src/lib/components/RoomOverlays.svelte');
    expect(overlays.match(/<ImagePasteConfirm/g)?.length).toBe(3);
    expect(overlays).toContain('onconfirm={() => void composer.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void swingAlerts.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void dayTradeAlerts.confirmImagePaste()}');
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
    /*
      The lightbox left `RoomOverlays.svelte` for `ImageLightbox.svelte` on 2026-08-31, and the cast
      went with it: the component takes `url: string`, so `modals.selectedImageUrl as string` — the
      assertion that a `string | null` narrowed by an enclosing `{#if}` really is a string — is now
      the prop's type instead of a cast at the call site.
    */
    expect(code('src/lib/components/ImageLightbox.svelte')).toContain(
      'onclick={() => downloadImage(url)}'
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
