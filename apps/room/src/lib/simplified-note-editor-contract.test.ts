import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import NoteEditor from './components/notes/NoteEditor.svelte';

/**
 * "Simplified Note Editor?" — the note toolbar's colour control, foreground only.
 *
 * ## The transcription, and the honest limit of it
 *
 * Byte 1,468,503, the one and only occurrence of the setting in the pinned v4 bundle:
 *
 * ```js
 * this.isSimplifiedEditor = this.appService.globals.sessData.simplifiedEditor ? "forecolor" : "color"
 * ```
 *
 * …spent as the single member of the toolbar's `["color", [this.isSimplifiedEditor]]` group. The
 * setting is never a boolean downstream; it selects a Summernote BUTTON NAME.
 *
 * **Summernote is not in the capture**, so the markup each name produces is unevidenced. What the
 * captured stylesheet decides — two 160px palettes inside a 337px `note-color-all` menu, and an
 * `-all` suffix that means nothing without a not-all case — is argued in full at
 * `resolveNoteSurfaceGates`, together with the ONE decision taken beyond the evidence. This file
 * asserts the two shapes that argument produced; it does not re-make the argument.
 *
 * ## Why a render and not a source assertion
 *
 * The whole feature is *which markup comes out*, and a `{#if}` around a palette is exactly the thing
 * a source assertion cannot see the effect of. The negative control that matters here — "the
 * background palette is gone" — is meaningless unless something proves it was ever there, so every
 * refusal below is paired with the same assertion passing in the other mode.
 */
const editor = (simplifiedEditor: boolean) =>
  render(NoteEditor, {
    props: {
      contentHtml: '',
      giphyApiKey: '',
      noteId: 1,
      onBringEveryone: () => undefined,
      onDirtyChange: () => undefined,
      onDone: () => undefined,
      onRequestRestore: () => undefined,
      onSave: () => undefined,
      onSetWelcomeMat: () => undefined,
      /* The carousel's image browser reads this; an empty room offers none. */
      sessionImages: [],
      onUploadImages: async () => [],
      onVersionHistoryOpenChange: () => undefined,
      showVersionHistory: false,
      simplifiedEditor,
      versions: []
    }
  }).body;

describe('the note toolbar colour control', () => {
  /*
    THE PALETTE ITSELF IS INSIDE A DROPDOWN that only renders when open, and this component's menus
    are `$state` driven by a click — so SSR never opens one. That is a real limit of this instrument
    and it is stated rather than worked around with a mount: what SSR CAN see is the group wrapper,
    the quick swatch and its handler, which is where both of the differences that matter live.

    The palettes themselves are covered by the source assertions at the foot of this file, and the
    pair is deliberate: the render proves the shape that ships, the source proves the palette is
    inside the gate rather than beside it.
  */
  it('draws the two-palette wrapper in an ordinary room', () => {
    expect(editor(false)).toContain('note-color-all');
  });

  it('drops that wrapper when the room simplifies the editor', () => {
    /*
      `note-color-all` is what widens the dropdown to 337px for two palettes side by side
      (`styles.ee2a710065b60389.css`). Leaving it on a one-palette menu would draw a half-empty
      337px box, which is the visible symptom this assertion exists to prevent.
    */
    expect(editor(true)).not.toContain('note-color-all');
  });

  /*
    THE QUICK SWATCH, and this is the decision taken beyond the evidence — asserted precisely
    because it is a decision. In the full control it applies a BACKGROUND colour. Simplified, the
    background palette is gone, so a background applier would be the only background affordance left
    in the toolbar and nothing else could undo it.
  */
  it('paints the swatch as a background chip in an ordinary room', () => {
    expect(editor(false)).toContain('background-color:#FFFF00;color:#000000;');
  });

  it('paints it as a foreground chip when simplified', () => {
    const body = editor(true);
    expect(body).toContain('background-color:#FFFFFF;color:#FFFF00;');
    expect(body).not.toContain('background-color:#FFFF00;color:#000000;');
  });

  /*
    THE REST OF THE TOOLBAR IS UNTOUCHED, and this is the assertion that stops "simplified" from
    quietly becoming "cut down". The setting names ONE button upstream. Font, size, style, lists and
    the insert group are not its business, and a future edit that trimmed them here would otherwise
    pass every other test in this file.
  */
  it('changes nothing else about the toolbar', () => {
    const body = editor(true);
    for (const group of [
      'note-style',
      'note-fontname',
      'note-fontsize',
      'note-para',
      'note-table'
    ]) {
      expect(body, `${group} is not this setting's business`).toContain(group);
    }
  });
});

/*
  The source half. `openMenu` is `$state` set by a click, so SSR renders no dropdown at all and the
  two palettes cannot be observed by rendering — see the note above. What CAN regress is the gate
  containing the Background palette and NOT the Text palette, and that is a text-visible fact.
*/
describe('the palettes inside the dropdown', () => {
  const source = readFileSync(
    new URL('./components/notes/NoteEditor.svelte', import.meta.url),
    'utf8'
  );

  it('puts the Background palette behind the gate', () => {
    const gateAt = source.indexOf('{#if !simplifiedEditor}');
    expect(gateAt, 'the simplified gate has been renamed or removed').toBeGreaterThan(-1);
    const closeAt = source.indexOf('{/if}', gateAt);
    expect(closeAt, 'the simplified gate is unterminated').toBeGreaterThan(gateAt);

    const gated = source.slice(gateAt, closeAt);
    expect(gated).toContain('Background Color');
    expect(gated, 'the Text palette must survive a simplified editor').not.toContain('Text Color');
  });

  it('keeps the Text palette outside it', () => {
    // Both palettes exist; only one of them is conditional.
    expect(source).toContain('Text Color');
    expect(source).toContain('Background Color');
  });
});

/*
  THE CHAIN, and it is here because its absence was caught by a negative control that stayed GREEN.

  Every assertion above renders `NoteEditor` directly with the prop handed to it, so replacing
  `{simplifiedEditor}` in `NotesPane` with a literal `false` — cutting the wire at its last hop —
  passed all seven of them. That is the same failure the unfed-props sweep found six times over on
  `RoomMessage`: a component that renders correctly and receives nothing.

  Each hop below is its own regression target. The setting reaching `PresentationArea` and stopping
  there would look identical from inside the editor.
*/
describe('the setting reaches the editor', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

  it('is resolved on the page, from the room facts the load already holds', () => {
    // `data` satisfies `NoteSurfaceSources` structurally; the module decides which fields it reads.
    expect(read('../routes/+page.svelte')).toContain('resolveNoteSurfaceGates(data)');
  });

  it('crosses to the presentation area on the gates object, not as a fourth prop', () => {
    const page = read('../routes/+page.svelte');
    const area = read('./components/PresentationArea.svelte');
    expect(page).toContain('{noteGates}');
    // The type is imported rather than restated, so the shape cannot drift between the two files.
    expect(area).toContain(
      "import type { NoteSurfaceGates } from '#lib/components/notes/note-gates.js'"
    );
    expect(area).toContain('noteGates: NoteSurfaceGates;');
    expect(area).toContain('simplifiedEditor={noteGates.simplifiedEditor}');
  });

  it('crosses NotesPane rather than stopping there', () => {
    const pane = read('./components/notes/NotesPane.svelte');
    expect(pane).toContain('readonly simplifiedEditor: boolean;');
    /*
      The SHORTHAND specifically. `simplifiedEditor={false}` also type-checks, also renders, and was
      exactly the mutation that proved this block was missing.
    */
    expect(pane).toContain('{simplifiedEditor}');
    expect(pane).not.toContain('simplifiedEditor={false}');
  });
});
