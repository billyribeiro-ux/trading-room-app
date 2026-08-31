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
    dialog is `ImagePasteConfirm.svelte` now — one component with the heading in it, rendered by
    every call site — so the property to assert is no longer "how many copies say it" but "the one
    they all use says it", plus "they all still use it". Both are below, and together they are
    strictly stronger: the old count passed if two copies had the heading and a third had been added
    without it, as long as the total reached three.

    It also survives the set GROWING, which the old count could not: `PCC-06` added a fourth call
    site on 2026-08-31 and the heading assertion did not have to move, because there is still one
    dialog. Only the call-site count below did.
  */
  it('asks the question, in the one dialog every paste now renders', () => {
    const confirm = code('src/lib/components/ImagePasteConfirm.svelte');
    expect(confirm.match(/<h4>Upload this image\?<\/h4>/g)?.length).toBe(1);
  });

  it('sizes the preview at the reference s 50vh rather than inheriting 70vh', () => {
    const confirm = code('src/lib/components/ImagePasteConfirm.svelte');
    expect(confirm.match(/style="max-height: 50vh;"/g)?.length).toBe(1);
  });

  it('and all SIX pastes still reach it, each with its own handler', () => {
    /*
      The half the count used to buy. Each call site keeps its OWN `onconfirm`, because
      `doImggurUpload` dispatches on a feature name deny-by-default (byte 1,992,037) — sharing one
      handler is how an image meant for a form is posted into chat.

      THREE became FIVE and then SIX on 2026-08-31, and each one is a distinct destination rather
      than a copy:

        - `PCC-06` — `onImagePaste` on `app-privchat` ends in `doImggurUpload(s, c)` ->
          `sendPrivChat` (byte 2,211,249). Routing a private paste through the chat composer's
          handler would post the screenshot into the ROOM rather than to one person.
        - `QAM-06` — `onImagePaste` on `app-alert-qa` ends in `sendAlertQAReply(qaMsg._id, …)` and
          then `modal("hide")` (byte 2,338,987). The register's prescribed fix for its twin
          `QAM-05` was the chat path, and it would have put a presenter's answer to one member's
          question into the room's public chat.

        - `RPL-03` — `onImagePaste` on `app-reply-modal` ends in `doImggurUpload(s, c)` ->
          `sendChatReply(msg.c, …, msg._id, null)` and then `$("#replyModal").modal("hide")`
          (byte 2,322,349). A public reply against ONE message: not the Q&A thread's destination and
          not chat's.

      Six destinations, six handlers. **The count did its job on the day the sixth arrived**: this
      case went red with `expected 6 to be 5` the moment `RPL-03` was wired, which is exactly the
      failure it was kept for — the comment above predicted *"it is what fails when a sixth call site
      is added"* and then that is what happened. Updated rather than loosened, because a count that
      is relaxed the first time it fires was never a guard.
    */
    const overlays = code('src/lib/components/RoomOverlays.svelte');
    expect(overlays.match(/<ImagePasteConfirm/g)?.length).toBe(6);
    expect(overlays).toContain('onconfirm={() => void composer.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void swingAlerts.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void dayTradeAlerts.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void privateChat.confirmImagePaste()}');
    expect(overlays).toContain('onconfirm={() => void messageActions.qaImage.confirm()}');
    expect(overlays).toContain('onconfirm={() => void messageActions.replyImage.confirm()}');

    /*
      Five instances, five DISTINCT confirm handlers — no two call sites sharing one.

      Anchored on `…ImagePaste()` rather than on any `onconfirm`: this file also renders unrelated
      confirmations, and a pattern loose enough to count those is a pattern that would go green on
      a sixth paste site sharing a handler with the fifth, because some other dialog happened to
      make the total come out right.
    */
    /*
      RE-POINTED 2026-08-31: the Q&A and reply paths became `PendingImagePost` instances when the
      ratchet refused the second copy of one lifecycle, so their handlers are `qaImage.confirm()` and
      `replyImage.confirm()` rather than `confirmQaImagePaste()`. The pattern widened to match both
      spellings, and it is still anchored on `confirm` — loose enough to count an unrelated dialog is
      loose enough to pass on a sixth paste site sharing a fifth's handler.
    */
    const handlers =
      overlays.match(/onconfirm=\{\(\) => void [\w.]*(?:ImagePaste\(\)|Image\.confirm\(\))\}/g) ??
      [];
    expect(handlers).toHaveLength(6);
    expect(new Set(handlers).size).toBe(6);

    /*
      And five DISTINCT message-box ids, which is the other half of "not a copy": the reference
      gives each surface its own (`msg-text`, `msg-text-pc`, `msg-text-qa`), and the two alert forms
      have none at all because their dialogs carry no message box.
    */
    for (const id of [
      'id="msg-text"',
      'id="msg-text-pc"',
      'id="msg-text-qa"',
      'id="msg-text-reply"'
    ]) {
      expect(overlays.match(new RegExp(id.replace(/"/g, '"'), 'g'))?.length).toBe(1);
    }
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
