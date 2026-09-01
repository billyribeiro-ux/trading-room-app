import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';

/**
 * THE NOTE EDITOR'S MODAL LABELS, AND THE PREMISE THAT DECIDES WHICH ARE REPRODUCIBLE.
 *
 * ## What changed, and why it needed a test rather than a paragraph
 *
 * Three of the reference's modals name themselves through `ariaLabelledBy` and an id on the title:
 *
 * ```js
 * modalService.open(this.carouselModal,     {ariaLabelledBy:"carousel-modal-title",     size:"lg"})
 * modalService.open(this.fileBrowserModal,  {ariaLabelledBy:"file-browser-modal-title", size:"lg"})
 * modalService.open(this.giphySearchPopOver,{ariaLabelledBy:"modal-basic-title"})
 * ["id","carousel-modal-title",1,"modal-title"]         // byte 1,484,582
 * ["id","file-browser-modal-title",1,"modal-title"]     // byte 1,486,486
 * ["id","modal-basic-title",1,"modal-title"]            // byte 1,486,810
 * ```
 *
 * All three were `aria-label` here instead, on one recorded reason: *"a literal document-unique id
 * belongs to a component that is mounted once, and this one is mounted … in an editor that a room
 * may hold more than one of."*
 *
 * **That reason was right about one of the three and wrong about the other two**, and both halves
 * are measured below rather than argued:
 *
 * | modal | mount sites | id is document-unique? |
 * | --- | --- | --- |
 * | carousel | `NoteEditor`, itself mounted only for `editingNoteId` | YES — transcribed |
 * | file browser | same | YES — transcribed |
 * | Giphy | `GiphyPicker`, mounted at FOUR sites | NO — stays instance-suffixed |
 *
 * ## Why this is a gate and not a note
 *
 * The premise is a fact about OTHER files. A `{#each}` around `NoteEditor`, or a second call site
 * for it, would make two literal ids collide — and every word of the prose explaining why they are
 * safe would still read as true. That is precisely the shape this repository writes tests for.
 *
 * `aria-labelledby` is also the better of the two and would be worth this even without the match:
 * the accessible name becomes the visible heading element, so a rename cannot leave a stale copy
 * behind. `aria-label` is a second copy of the title.
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const DIALOG = svelteCodeOf(
  readFileSync(new URL('./components/notes/CarouselDialog.svelte', import.meta.url), 'utf8')
);

/** Every `.svelte` file, so a new mount site anywhere is counted rather than assumed absent. */
const COMPONENTS = globSync('src/**/*.svelte');
const mountsOf = (tag: string) =>
  COMPONENTS.filter((path) => svelteCodeOf(readFileSync(path, 'utf8')).includes(`<${tag}`));

describe('the reference names all three modals by their title element', () => {
  it('carries all three consts and all three bindings at their bytes', () => {
    expect(BUNDLE.indexOf('["id","carousel-modal-title",1,"modal-title"]')).toBe(1_484_582);
    expect(BUNDLE.indexOf('["id","file-browser-modal-title",1,"modal-title"]')).toBe(1_486_486);
    expect(BUNDLE.indexOf('["id","modal-basic-title",1,"modal-title"]')).toBe(1_486_810);
    expect(BUNDLE.indexOf('ariaLabelledBy:"carousel-modal-title"')).toBe(1_475_314);
    expect(BUNDLE.indexOf('ariaLabelledBy:"file-browser-modal-title"')).toBe(1_477_226);
    expect(BUNDLE.indexOf('ariaLabelledBy:"modal-basic-title"')).toBe(1_482_515);
  });
});

describe('the two that are document-unique here are TRANSCRIBED', () => {
  it('labels each dialog by the id its own title carries', () => {
    for (const id of ['carousel-modal-title', 'file-browser-modal-title']) {
      expect(DIALOG, `${id} must label its dialog`).toContain(`aria-labelledby="${id}"`);
      expect(DIALOG, `${id} must be ON the title element`).toContain(`<h4 id="${id}"`);
    }
  });

  it('and no longer names itself twice with an aria-label', () => {
    /*
      Both halves matter. Leaving `aria-label` beside `aria-labelledby` is not an error — the label
      wins — but it is the second copy of the title this change exists to remove, and it would go
      stale silently the first time a heading is reworded.
    */
    expect(DIALOG).not.toContain('aria-label={title}');
    expect(DIALOG).not.toContain('aria-label="Select Image"');
  });
});

describe('the PREMISE that makes those ids safe, measured rather than believed', () => {
  it('NoteEditor is mounted at exactly one site', () => {
    /*
      `NotesPane.svelte` states it: *"ours mounts `NoteEditor` only in the panel being edited …
      `editingNoteId` is a single value — a second instance could never be reached."* Asserted here
      because a `{#each}` around it would make two literal ids collide while every explanation of why
      they are safe still read as true.
    */
    expect(mountsOf('NoteEditor')).toEqual(['src/lib/components/notes/NotesPane.svelte']);
  });

  it('and that site mounts it for ONE note, not for every note', () => {
    const pane = svelteCodeOf(
      readFileSync(new URL('./components/notes/NotesPane.svelte', import.meta.url), 'utf8')
    );
    /* The gate is the single-valued id, which is what bounds it to one instance. */
    expect(pane).toContain('{#if editingNoteId === note.id && canEdit}');
  });

  it('CarouselDialog is mounted once, inside that editor', () => {
    expect(mountsOf('CarouselDialog')).toEqual(['src/lib/components/notes/NoteEditor.svelte']);
  });
});

describe('the third id is transcribed too, and the count was the wrong measurement', () => {
  it('GiphyPicker is mounted at FOUR sites, which is what made the id look impossible', () => {
    /*
      THE PREMISE THIS BLOCK USED TO ASSERT WAS WRONG, and it was wrong in an instructive way.

      It read: *"`modal-basic-title` is not reproducible here and the other two are, and the
      difference is a number rather than a preference"* — four mount sites, so a literal id would
      appear four times.

      The number is right and it is a fact about the wrong element. `modal-basic-title` is not the
      PICKER's id; it is the id of the MODAL TITLE that upstream's note mount is opened inside:

          opengifSerachModal(){this.modalService.open(this.giphySearchPopOver,
            {ariaLabelledBy:"modal-basic-title"})}                    // byte 1,482,730
          d(0,"div",26)(1,"h4",82),v(2,"Giphy Search")                // L0e, byte 1,467,000
          82  ["id","modal-basic-title",1,"modal-title"]

      The other three mounts are ng-bootstrap POPOVERS. They have no `modal-header`, no
      `modal-title`, and nothing labelled by that id at all — so it was never going to appear four
      times. The count measured the picker; the id belongs to the dialog around one of them.

      `GIF-07` separated the two: `GiphyPicker` renders the popover chrome only under
      `variant="popover"`, and `notes/NoteEditor.svelte` supplies the modal chrome for the fourth.
      The id is now literal, on the one mount whose capture has it.

      The four-site floor stays asserted, because it is still the reason the PICKER carries no
      document-unique id of its own.
    */
    const mounts = mountsOf('GiphyPicker');
    expect(mounts.length).toBeGreaterThanOrEqual(4);
    expect(mounts).toContain('src/lib/components/notes/NoteEditor.svelte');
    expect(mounts).toContain('src/lib/components/AlertChatArea.svelte');
    expect(mounts).toContain('src/lib/components/ExtraChatPane.svelte');
    expect(mounts).toContain('src/lib/components/PrivateChatComposer.svelte');
  });

  it('the note mount labels its dialog with the captured id, verbatim', () => {
    const editor = svelteCodeOf(
      readFileSync(new URL('./components/notes/NoteEditor.svelte', import.meta.url), 'utf8')
    );
    expect(editor).toContain('ariaLabelledby="modal-basic-title"');
    expect(editor).toContain('titleId="modal-basic-title"');
    expect(editor).toContain('titleClass="modal-title"');
    /* Const 82 opens under `d(1,"h4",82)`, so the level is transcribed with the id. */
    expect(editor).toContain('titleTag="h4"');
  });

  it('and the three popover mounts still pass an instance id, because they are four', () => {
    /*
      The half of the old premise that survives: the POPOVER window needs a document-unique id for
      `aria-describedby` to point at, and there are three of them on one page. Each passes
      `${componentId}-…`, and `NoteEditor` no longer passes one at all — its picker has no popover.
    */
    const editor = svelteCodeOf(
      readFileSync(new URL('./components/notes/NoteEditor.svelte', import.meta.url), 'utf8')
    );
    expect(editor).not.toContain('popoverId={`${componentId}-note-giphy`}');

    const chat = svelteCodeOf(
      readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8')
    );
    expect(chat).toContain('popoverId=');
  });
});
