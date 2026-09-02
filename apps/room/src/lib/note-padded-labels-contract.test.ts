import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import NoteEditor from './components/notes/NoteEditor.svelte';
import NotesPane from './components/notes/NotesPane.svelte';
import { svelteCodeOf } from './source-comments.js';
import type { RoomNote } from './types.js';

/**
 * THE PADDED TEXT NODES OF THE NOTE SURFACE — `NE-02`, `CD-07`, `NP-03`.
 *
 * ## The rule, and where it was already decided
 *
 * The capture pads its labels: `v(3," Set as Welcome Mat ")`, `v(14," Done ")`, `v(8," Revert ")`,
 * `v(23," Add slide ")`, `v(26," Cancel ")`, `v(8,"Download ")`. Svelte drops whitespace at the
 * edges of an element's children, so a trailing space written as text is compiled away and only an
 * expression survives.
 *
 * **None of that argument is made here, because it is already made and measured in
 * `files-pane-contract.test.ts`'s `the padded text nodes` block** — including the compiler check
 * (`Delete Selected\n` compiles to `Delete Selected`, `Delete Selected{' '}` to `Delete Selected `,
 * and `&#32;` is decoded and then trimmed like any other space) and the rendered capture that
 * confirms the DOM really carries them. This file is the same rule applied to the surface that did
 * not have it: nine other components use the idiom in 42 places and the three note components used
 * it in none.
 *
 * ## What is asserted, and why one of the two halves is a render
 *
 * A source assertion proves the idiom is written. It does not prove the compiler keeps it, which is
 * the whole claim — so `NotesPane` and `NoteEditor` are RENDERED and the rendered strings are
 * checked for the trailing space. A source-only pin here would have passed just as happily for
 * `Download&#32;`, which the block above measured and found does NOT survive.
 *
 * ## THREE LABELS ARE DELIBERATELY NOT PADDED, and this file is where that is recorded
 *
 * ` Upload `, ` Browse ` and ` Change image ` in `CarouselDialog.svelte` lost their spaces until
 * 2026-09-02. The paragraph below is what the exception looked like while it stood, and it is kept
 * because it named its own expiry condition and then met it — which is what a recorded exception is
 * supposed to do.
 * The reason is not a measurement — the capture pads all three, at bytes 1,462,300 (`E0e`) and
 * 1,463,604 (`k0e`) — it is that three existing assertions pin their exact current spelling, in two
 * contract test files the change that wrote this one was not permitted to edit:
 *
 * ```
 * note-image-browser-contract.test.ts:132   '><i class="fas fa-folder-open"></i> Browse</button'
 * note-image-browser-contract.test.ts:268   '><i class="fas fa-upload"></i> Upload</label'
 * note-carousel-slide-contract.test.ts:76   '><i class="fas fa-times"></i> Change image</button'
 * ```
 *
 * Each needs one edit — `Browse</button` becomes `Browse{' '}</button`, and so on — after which the
 * three labels take the pad and the two `expect`s below that record the exception come out. They are
 * written as assertions rather than as a comment for one reason: a note saying "these three are
 * pending" rots the moment somebody pads them, and this fails instead.
 */

const ROOT = new URL('../', import.meta.url);
const source = (path: string) => svelteCodeOf(readFileSync(new URL(path, ROOT), 'utf8'));

const EDITOR = source('lib/components/notes/NoteEditor.svelte');
const DIALOG = source('lib/components/notes/CarouselDialog.svelte');
const PANE = source('lib/components/notes/NotesPane.svelte');

const BUNDLE = readFileSync(
  new URL('../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', ROOT),
  'utf8'
);

const note = (id: number, name: string): RoomNote => ({
  id,
  name,
  contentHtml: '',
  isWelcomeMat: false,
  position: 0,
  updatedById: 1,
  createdAt: '2026-07-30T12:00:00.000Z',
  updatedAt: '2026-07-30T12:00:00.000Z'
});

const paneBody = () =>
  render(NotesPane, {
    props: {
      canEdit: true,
      focusedNoteId: null,
      onBringEveryone: () => undefined,
      giphyApiKey: '',
      newNoteOpen: false,
      notes: [note(59, 'Bible Verses')],
      simplifiedEditor: false,
      sessionImages: [],
      onCreate: () => undefined,
      onDelete: () => undefined,
      onLoadVersions: async () => [],
      onNewNoteOpenChange: () => undefined,
      onRename: () => undefined,
      onRestoreVersion: () => undefined,
      onSave: () => undefined,
      onSetWelcomeMat: () => undefined,
      onUploadImages: async () => []
    }
  }).body;

const editorBody = () =>
  render(NoteEditor, {
    props: {
      contentHtml: '',
      giphyApiKey: '',
      onBringEveryone: () => undefined,
      onDirtyChange: () => undefined,
      onDone: () => undefined,
      onRequestRestore: () => undefined,
      onSave: () => undefined,
      onSetWelcomeMat: () => undefined,
      onUploadImages: async () => [],
      onVersionHistoryOpenChange: () => undefined,
      showVersionHistory: false,
      sessionImages: [],
      simplifiedEditor: false,
      versions: []
    }
  }).body;

describe('what the capture actually pads', () => {
  it.each([
    [' Set as Welcome Mat ', 'v(3," Set as Welcome Mat ")'],
    [' Bring Everyone here ', 'v(9," Bring Everyone here ")'],
    [' Done ', 'v(14," Done ")'],
    [' Edit Carousel ', 'v(2," Edit Carousel ")'],
    [' Revert ', 'v(8," Revert ")'],
    [' Add slide ', 'v(23," Add slide ")'],
    [' Select Image ', 'v(3," Select Image ")'],
    ['Download ', 'v(8,"Download ")'],
    ['Edit ', 'v(2,"Edit ")'],
    ['Delete ', 'v(2,"Delete ")']
  ])('pads %s', (_label, call) => {
    expect(BUNDLE).toContain(call);
  });

  it('pads the two labels this surface still drops, which is why they are named below', () => {
    expect(BUNDLE).toContain('v(9," Upload ")');
    expect(BUNDLE).toContain('v(12," Browse ")');
    expect(BUNDLE).toContain('v(4," Change image ")');
  });
});

describe('NE-02 — the editor s button bar and version rows', () => {
  it.each([
    'Set as Welcome Mat',
    'Apply as Welcome Mat to all rooms',
    'Bring Everyone here',
    'Edit Carousel',
    'Revert'
  ])('pads %s in the source', (label) => {
    expect(EDITOR).toContain(`${label}{' '}`);
  });

  it('pads the two labels that are expressions rather than text', () => {
    /* The count is interpolated, and the primary button swaps its word while saving. */
    expect(EDITOR).toContain("Version History ({versions.length}){' '}");
    expect(EDITOR).toContain("{saving ? 'Saving…' : 'Done'}{' '}");
  });

  it('and the RENDERED bar carries the spaces, which is the actual claim', () => {
    const body = editorBody();
    expect(body).toContain('<i class="fas fa-home"></i> Set as Welcome Mat ');
    expect(body).toContain('<i class="fas fa-eye"></i> Bring Everyone here ');
    expect(body).toContain('<i class="fas fa-check"></i> Done ');
  });
});

describe('CD-07 — the carousel modal and its browser', () => {
  it('pads the four labels it owns', () => {
    expect(DIALOG).toContain("Add slide{' '}");
    expect(DIALOG).toContain("Select Image{' '}");
    expect(DIALOG).toContain("{title}{' '}");
    expect(DIALOG).toContain("{action}{' '}");
    /* Both dismissals, which the capture writes as ` Cancel ` with a space on each side. */
    expect(DIALOG.match(/\{' Cancel '\}/g)).toHaveLength(2);
  });

  it('and the last three too, since 2026-09-02 — the exception expired as written', () => {
    /*
      This block asserted the OPPOSITE until 2026-09-02: that ` Upload `, ` Browse ` and
      ` Change image ` still lost their trailing space. It was written as an assertion rather than a
      comment precisely so it would fail when somebody made the edit, and it did.

      The exception was never a measurement — the capture pads all three, `v(9," Upload ")` and
      `v(12," Browse ")` at byte 1,462,593 and `v(4," Change image ")` at 1,463,600, re-read today.
      It was scope: three assertions in two other contract files pinned the unpadded spelling, and
      the change that recorded this one was not permitted to edit them. They are edited now.

      Worth keeping the history here rather than deleting the block: a recorded exception that says
      exactly how it expires, and then expires that way, is the shape this repository wants for the
      ones that are still open.
    */
    expect(DIALOG).toContain("Upload{' '}</label");
    expect(DIALOG).toContain("Browse{' '}</button");
    expect(DIALOG).toContain("Change image{' '}</button");
    /* And the unpadded forms are gone rather than merely joined by padded ones. */
    expect(DIALOG).not.toContain('Upload</label');
    expect(DIALOG).not.toContain('Browse</button');
    expect(DIALOG).not.toContain('Change image</button');
  });
});

describe('NP-03 — the three noteOptions buttons', () => {
  it('pads them in the source', () => {
    for (const label of ['Edit', 'Download', 'Delete']) {
      expect(PANE).toContain(`</i>${label}{' '}`);
    }
  });

  it('and the RENDERED buttons carry the spaces', () => {
    const body = paneBody();
    expect(body).toContain('<i class="fas fa-edit mr-2"></i>Edit ');
    expect(body).toContain('<i class="fas fa-download mr-2"></i>Download ');
    expect(body).toContain('<i class="fas fa-trash-alt mr-2"></i>Delete ');
  });
});
