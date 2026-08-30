import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';
import { IMAGE_FLOATS, IMAGE_WIDTHS } from './components/notes/note-image.js';

/**
 * The image popover, and the hidden element that went with it.
 *
 * ```js
 * popover: { image: [                                            // reference byte 1,469,073
 *   ["custom", ["imageAttributes"]],
 *   ["image",  ["resizeFull","resizeHalf","resizeQuarter","resizeNone"]],
 *   ["float",  ["floatLeft","floatRight","floatNone"]],
 *   ["remove", ["removeMedia"]]
 * ]}
 * ```
 *
 * Once an image was in a note there was no way to resize it, float it or remove it — only a raw text
 * delete.
 *
 * **WHAT THE CAPTURE EVIDENCES IS THE GROUP LIST AND NOTHING ELSE.** Summernote is not in the
 * bundle, so its popover's markup, geometry and icons are unknown. This test therefore asserts the
 * COMMANDS by their captured names and the behaviour behind them; it deliberately does not pin
 * markup that no capture could contradict.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const EDITOR = read('./components/notes/NoteEditor.svelte');
const EXTENSION = read('./components/notes/note-image.ts');
const SANITIZER = read('./components/notes/safe-html.ts');

describe('the three groups that are built', () => {
  it('names every command the capture names, and no others', () => {
    /*
      Read from the exported tables rather than from the markup: the table IS the transcription, and
      the loop that renders it cannot drift from it.
    */
    expect(IMAGE_WIDTHS.map(({ command }) => command)).toEqual([
      'resizeFull',
      'resizeHalf',
      'resizeQuarter',
      'resizeNone'
    ]);
    expect(IMAGE_FLOATS.map(({ command }) => command)).toEqual([
      'floatLeft',
      'floatRight',
      'floatNone'
    ]);
  });

  it('treats `resizeNone` and `floatNone` as the ABSENCE of a value', () => {
    /*
      Which is what the names say. A width of `auto` or a float of the string `"none"` written into
      the attribute would both be a value, and the image would stop inheriting its own size or its
      own flow — the control would look like it worked and would not undo anything.
    */
    expect(IMAGE_WIDTHS.at(-1)?.width).toBeNull();
    expect(IMAGE_FLOATS.at(-1)?.float).toBeNull();
    expect(IMAGE_WIDTHS.map(({ width }) => width)).toEqual(['100%', '50%', '25%', null]);
    expect(IMAGE_FLOATS.map(({ float }) => float)).toEqual(['left', 'right', null]);
  });

  it('shows only while an image is selected', () => {
    expect(EDITOR).toContain("return editor !== null && editor.isActive('image');");
    expect(EDITOR).toContain('{#if imageSelected}');
  });

  it('recomputes when the caret moves, as a $derived and not an $effect', () => {
    /*
      `revision` is bumped by `onSelectionUpdate`, so reading it is what makes these recompute. An
      effect assigning them would re-run per keystroke to produce the same answer — the trap
      `CLAUDE.md` names by hand.
    */
    for (const name of ['imageSelected', 'imageWidth', 'imageFloat']) {
      expect(EDITOR, name).toContain(`let ${name} = $derived.by(() => {`);
    }
    /*
      And assigned NOWHERE else — the declaration is the only `imageSelected =` in the file, which is
      what "derived, not effect" means in practice. Counted rather than `not.toContain`, because the
      declaration itself matches that string: the first draft of this line asserted the absence of
      text it had just required, and went red for the right reason.
    */
    const assignments = [...EDITOR.matchAll(/imageSelected =/g)];
    expect(assignments, 'the declaration and nothing else').toHaveLength(1);
  });

  it('updates the existing image rather than replacing it', () => {
    /*
      `updateAttributes` keeps `src`, `alt` and everything else, and a `null` CLEARS rather than
      writing the string "null" — which is what makes the two `None` commands mean what they say.
    */
    expect(EDITOR).toContain("updateAttributes('image', { width })");
    expect(EDITOR).toContain("updateAttributes('image', { float })");
    expect(EDITOR).toContain('function removeImage(): void {');
    expect(EDITOR).toContain('deleteSelection()');
  });

  it('marks the option in force, so the strip reports state instead of only offering it', () => {
    expect(EDITOR).toContain('aria-pressed={imageWidth === option.width}');
    expect(EDITOR).toContain('aria-pressed={imageFloat === option.float}');
  });
});

describe('what survives a save and a reopen', () => {
  it('parses back everything it renders', () => {
    /*
      The editor serializes to HTML on save and re-parses it on open, so an attribute that renders
      but does not parse survives exactly until the note is reopened — a control that appears to work
      all session and loses its effect overnight.
    */
    for (const half of ['parseHTML', 'renderHTML']) {
      const found = [...EXTENSION.matchAll(new RegExp(`${half}:`, 'g'))];
      expect(found, `${half} for both attributes`).toHaveLength(2);
    }
  });

  it('keeps src, alt and title rather than replacing the attribute set', () => {
    /* Dropping `...this.parent?.()` would strip every existing image's alt text on the next save. */
    expect(EXTENSION).toContain('...this.parent?.()');
  });

  it('passes the sanitizer, which is the authority on what a note may contain', () => {
    /*
      `img` already admitted a `width` ATTRIBUTE; it did not admit a `float` declaration. Summernote
      writes the width as a style, and ours writes the attribute — a divergence with a reason: the
      `img` style allow-list admits `width: 100%` and nothing else, so `50%` and `25%` would have
      been stripped on the way back in and the control would have changed nothing.
    */
    expect(SANITIZER).toContain(
      "img: new Set(['alt', 'height', 'src', 'style', 'title', 'width'])"
    );
    expect(SANITIZER).toContain('float: /^(?:left|right|none)$/');
  });

  it('admits exactly the three float values and no more', () => {
    /*
      CSS also defines `inline-start`, `inline-end` and the global keywords, and none of them is a
      thing this editor can produce. An allow-list matching the specification rather than the writer
      has stopped saying anything.
    */
    const float = /float: (\/.*\/)/.exec(SANITIZER);
    expect(float, 'the rule must exist').not.toBeNull();
    const pattern = new RegExp(float![1].slice(1, -1));
    for (const legal of ['left', 'right', 'none']) expect(pattern.test(legal), legal).toBe(true);
    for (const refused of ['inline-start', 'inherit', 'url(x)', 'left;position:fixed', '']) {
      expect(pattern.test(refused), refused).toBe(false);
    }
  });
});

describe('what is deliberately NOT built', () => {
  it('invents no `imageAttributes` dialog', () => {
    /*
      A third-party summernote plugin whose dialog is unevidenced twice over — not in this bundle,
      and not in the reference's own source. Building a src/alt/title dialog would be inventing a
      surface and then transcribing nothing. Recorded at the audit row as the one group of four that
      stays open.
    */
    expect(EDITOR).not.toContain('imageAttributes');
    expect(EXTENSION).not.toContain('imageAttributes');
  });

  it('deleted the hidden mount element rather than keeping it for a library we do not use', () => {
    /*
      `<div id="summernoteEdit-{noteId}" class="note-view" hidden></div>` stood in this component.
      Summernote initialises ON the `.note-view` element and replaces it, so upstream has ONE element
      that is both the rendered note and the editor. Tiptap mounts into `.note-editor-host`, and the
      read-only note is `NotesPane`'s own element — so this was a mount point for a library this app
      does not use, hidden, read by nothing and written by nothing.

      It also put a DUPLICATE id in the document: `NotesPane` renders the same one for the same note,
      so `getElementById` could return either and which depended on render order.
    */
    expect(EDITOR).not.toContain('id={`summernoteEdit-${noteId}`}');
  });

  it('gives the strip a real CSS rule rather than a hook class', () => {
    /* A class carrying no declarations is the `.flipped`-with-no-CSS defect `CLAUDE.md` names. */
    const at = EDITOR.indexOf('.note-image-popover {');
    expect(at, 'the rule must exist').toBeGreaterThan(-1);
    const closes = EDITOR.indexOf('}', at);
    expect(closes, 'the rule must be closed').toBeGreaterThan(at);
    expect(EDITOR.slice(at, closes)).toContain('margin-bottom');
  });
});
