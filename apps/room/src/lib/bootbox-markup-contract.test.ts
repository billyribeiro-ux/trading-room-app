import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';

/**
 * THE BOOTBOX DIALOGS, AND THE ONE CAPTURE THIS REPOSITORY HAS OF THEM.
 *
 * ## Where the evidence is, and what is wrong with it
 *
 * bootbox builds its markup in JavaScript, so none of it is in the Angular bundle: grep the
 * 2,891,205 bytes for `bootbox-close-button`, `bootbox-accept`, `bootbox-cancel` or `bootbox-input`
 * and every one returns **zero**. Only the CALL SITES are there — `bootbox.confirm({message: …})`,
 * `bootbox.prompt({inputType:"radio", …})` — and each of the three components in this family cites
 * its own by byte.
 *
 * The rendered DOM exists in exactly one place: `docs/reference/evidence-dumps-full-read.md`, which
 * records `account-page/upload-image-badge-prompt.html` and says of itself *"meta.json config has
 * `OPEN_BOOTBOX: false`, so NEXT-STEP never captured a bootbox at all. THIS FILE IS THAT MISSING
 * EVIDENCE."*
 *
 * **And it is from the wrong surface.** That page is the AngularJS ACCOUNT application on Bootstrap
 * 3; the room is Angular 17 on Bootstrap 5. The same evidence file makes the point about a different
 * dependency thirty lines later — *"the AngularJS controller uses Font Awesome 4.3.0 … the Angular-17
 * room uses Font Awesome 5.8.1 … Do not assume one icon set across the two surfaces"* — and it
 * applies here with the same force.
 *
 * So three values in that capture CANNOT be transcribed into this room, and this file is where that
 * is written down rather than left as an absence somebody re-derives:
 *
 * | captured | why not here |
 * | --- | --- |
 * | `data-dismiss="modal"` | Bootstrap 3's attribute. Bootstrap 5 spells it `data-bs-dismiss`, and this room ships no Bootstrap JavaScript to read either |
 * | `btn-default` on Cancel | a Bootstrap 3 class with no Bootstrap 5 equivalent — kept ALONGSIDE `btn-secondary` rather than instead of it, so the captured name survives for any stylesheet keyed on it |
 * | `data-bb-handler="cancel"` / `"confirm"` | bootbox's own dispatch hooks, read by bootbox's event handlers. Nothing here reads them, and an attribute with no reader is the shape this repository refuses |
 *
 * ## What IS transcribed, and is asserted below
 *
 * The class names and the ORDER, both of which the evidence states explicitly: *"Note the ORDER:
 * Cancel (btn-default) FIRST, then OK (btn-primary). And the close button carries BOTH
 * `bootbox-close-button` and `close`."*
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => svelteCodeOf(readFileSync(`${ROOT}${file}`, 'utf8'));

const EVIDENCE = readFileSync(`${ROOT}../../../docs/reference/evidence-dumps-full-read.md`, 'utf8');
const dialog = read('lib/components/BootboxDialog.svelte');
const gif = read('lib/components/GifConfirmDialog.svelte');
const upload = read('lib/components/ImageUploadDialog.svelte');

describe('the captured bootbox markup is read, not remembered', () => {
  it('finds the one capture this repository holds of it', () => {
    /*
      Asserted rather than quoted, so the claims below rest on a file that is still there and still
      says this. The whole block is nine lines of `docs/reference/evidence-dumps-full-read.md`.
    */
    expect(EVIDENCE).toContain('THE BOOTBOX MARKUP');
    expect(EVIDENCE).toContain('button.bootbox-close-button.close');
    expect(EVIDENCE).toContain('div.modal-body > div.bootbox-body > form.bootbox-form');
    expect(EVIDENCE).toContain('input.bootbox-input.bootbox-input-text.form-control');
    expect(EVIDENCE).toContain('Cancel (btn-default) FIRST, then OK (btn-primary)');
  });

  it('and records that it comes from a Bootstrap 3 surface', () => {
    /* `OPEN_BOOTBOX: false` is why the room's own capture has none of this. */
    expect(EVIDENCE).toContain('OPEN_BOOTBOX: false');
    expect(EVIDENCE).toContain('Do not assume one icon set across the two surfaces');
  });
});

describe('all three bootbox dialogs carry the captured class names', () => {
  it('the close button carries BOTH names, as the evidence says twice', () => {
    for (const [name, source] of Object.entries({ dialog, gif, upload })) {
      expect(source, name).toContain('bootbox-close-button close');
    }
  });

  it('the body and the form are the captured nesting', () => {
    expect(dialog).toContain('<div class="bootbox-body">');
    expect(dialog).toContain('class="bootbox-form"');
    expect(dialog).toContain('class="bootbox-input bootbox-input-text form-control"');
  });

  it('Cancel comes FIRST and keeps the Bootstrap 3 class beside the Bootstrap 5 one', () => {
    /*
      Order is stated in the evidence and is the half a reader would get wrong: every other dialog in
      this room puts the affirmative button last, and bootbox does too — but its Cancel is the
      `btn-default` one, which reads as the secondary action in Bootstrap 3 and has no BS5
      equivalent. Kept alongside `btn-secondary` rather than replaced, so a stylesheet keyed on the
      captured name still finds it.
    */
    expect(dialog).toContain("cancelClassName = 'btn-secondary btn-default'");
    expect(gif).toContain('class="btn btn-secondary btn-default bootbox-cancel"');
    const cancel = dialog.indexOf('bootbox-cancel');
    const accept = dialog.indexOf('bootbox-accept', cancel);
    expect(cancel, 'the cancel button is drawn').toBeGreaterThan(-1);
    expect(accept, 'and the accept button follows it').toBeGreaterThan(cancel);
  });

  it('and each one emits the backdrop bootbox emits', () => {
    /* `backdrop:!0` — `ROV-04`, `VID-01`, and the upload dialog since 2026-09-01. */
    for (const [name, source] of Object.entries({ dialog, gif, upload })) {
      expect(source, name).toContain('<div class="modal-backdrop fade show"></div>');
    }
  });
});

describe('the three Bootstrap 3 values are refused, and stay refused', () => {
  it('no dialog carries `data-dismiss`, which is Bootstrap 3 s spelling', () => {
    for (const [name, source] of Object.entries({ dialog, gif, upload })) {
      expect(source, name).not.toContain('data-dismiss=');
    }
  });

  it('and none carries `data-bb-handler`, which nothing here would read', () => {
    for (const [name, source] of Object.entries({ dialog, gif, upload })) {
      expect(source, name).not.toContain('data-bb-handler');
    }
  });
});
