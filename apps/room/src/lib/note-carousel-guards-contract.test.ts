import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * The four guards the note surface was missing, and the stacking bug that hid two of them.
 *
 * | audit row | what it wanted |
 * | --- | --- |
 * | `note-editor-insert-carousel-silent-noop` | `Please add at least one image URL.` |
 * | `note-editor-add-slide-scroll` | the new row scrolled into view |
 * | `note-editor-carousel-arrow-hover` | the arrows' hover, `preventDefault`, `stopPropagation` |
 * | `note-editor-version-cap` | `maxVersions = 3` |
 *
 * plus one defect nobody was looking for: every dialog raised from inside a note modal was painting
 * BEHIND it, at `z-index: 1055` against `1070`.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const EDITOR = read('./components/notes/NoteEditor.svelte');
const DIALOG = read('./components/notes/CarouselDialog.svelte');
const SAFE_HTML = read('./components/notes/safe-html.ts');
const REPOSITORY = read('./server/notes-repository.ts');
const APP_CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

describe('insert with nothing to insert', () => {
  it('says so, in the reference s words', () => {
    /*
      `window.bootbox.alert("Please add at least one image URL.")` — byte 1,478,230, the else of
      `generateCarouselHtml()`. This returned silently: the primary button is always enabled, so
      pressing it with an empty or non-`https://` slide list closed nothing, inserted nothing and
      said nothing. `CLAUDE.md`'s fail-loud rule and the reference agree.
    */
    expect(EDITOR).toContain("errorMessage = 'Please add at least one image URL.';");
  });

  it('leaves the dialog OPEN, which is upstream s order too', () => {
    /*
      The presenter is being told to fix the thing in front of them; closing the modal would take
      away the rows they have to fix. Only the success branch dismisses, in the reference and here —
      so the `dialog = null` must come after the guard, not before it.
    */
    const at = EDITOR.indexOf("errorMessage = 'Please add at least one image URL.';");
    expect(at, 'the alert must exist').toBeGreaterThan(-1);
    const dismissAt = EDITOR.indexOf('dialog = null;', at);
    expect(dismissAt, 'the dismissal is further down the same function').toBeGreaterThan(at);
    /* And the guard returns before reaching it. */
    expect(EDITOR.slice(at, dismissAt)).toContain('return;');
  });

  it('does NOT blame the presenter for a missing editor', () => {
    /*
      A null editor is a bug in the component, not a mistake by the presenter, and telling them to
      add an image URL would send them to look at working input. The two conditions were one `||`
      before this; separating them is the whole fix.
    */
    expect(EDITOR).toContain('if (instance === null) return;');
    expect(EDITOR).not.toContain('if (slides.length === 0 || instance === null) return;');
  });
});

describe('adding a slide', () => {
  it('scrolls the new row into view, with the reference s own options', () => {
    /*
      `e[e.length - 1]?.scrollIntoView({behavior:"smooth", block:"nearest"})` — byte 1,475,568. The
      list is a `max-height: 50vh` scroller inside a `max-height: calc(100vh - 40px)` dialog, so a
      presenter with six slides pressed ` Add slide ` and nothing appeared to happen.
    */
    expect(DIALOG).toContain("scrollIntoView({ behavior: 'smooth', block: 'nearest' })");
  });

  it('waits for the render that added the row, not for the next macrotask', () => {
    /*
      `tick()` where the reference uses a bare `setTimeout`. Both wait for the DOM; `tick` waits for
      exactly this render, so it cannot fire before the element exists or long after it.
    */
    expect(DIALOG).toContain("import { tick, untrack } from 'svelte';");
    const at = DIALOG.indexOf('async function addCarouselSlide');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const end = DIALOG.indexOf('\n  }', at);
    expect(end, 'the handler must be closed').toBeGreaterThan(at);
    const body = DIALOG.slice(at, end);
    expect(body).toContain('await tick();');
    expect(body).not.toContain('setTimeout');
  });

  it('looks inside THIS dialog s list, never at the whole document', () => {
    /*
      `document.querySelectorAll('.carousel-slide-row')` is scoped in the reference by there being
      one such modal on the page. Holding the element scopes it without depending on that staying
      true — and this component is now mounted by a parent that could, in principle, mount two.
    */
    expect(DIALOG).toContain('bind:this={slidesList}');
    expect(DIALOG).toContain("slidesList?.querySelectorAll('.carousel-slide-row')");
    expect(DIALOG).not.toContain('document.querySelectorAll');
  });
});

describe('the rendered carousel s arrows', () => {
  it('lightens on hover, which the declared transition promised and nothing delivered', () => {
    /*
      Byte 1,480,561. The inline style string here already declares `transition: background 0.2s` —
      transcribed with the rest of it — and nothing ever changed the background, so it described an
      animation that could not happen. A declared transition with no trigger is the same defect class
      as a class with no CSS.
    */
    expect(SAFE_HTML).toContain('transition:background 0.2s;');
    expect(SAFE_HTML).toContain("button.style.background = 'rgba(0,0,0,0.75)'");
    expect(SAFE_HTML).toContain("button.style.background = 'rgba(0,0,0,0.45)'");
    expect(SAFE_HTML).toContain("'mouseenter'");
    expect(SAFE_HTML).toContain("'mouseleave'");
  });

  it('stops the click from following the slide s link', () => {
    /*
      The half that matters more. A slide may be wrapped in a link — `slide.link`, "clicking the
      image opens this" — and an arrow sits INSIDE it. Without these two calls, paging a linked
      carousel navigates away from the note.
    */
    const at = SAFE_HTML.indexOf("button.addEventListener('click'");
    expect(at, 'the click handler must exist').toBeGreaterThan(-1);
    const end = SAFE_HTML.indexOf('\n    });', at);
    expect(end, 'the click handler must be closed').toBeGreaterThan(at);
    const body = SAFE_HTML.slice(at, end);
    expect(body).toContain('event.preventDefault();');
    expect(body).toContain('event.stopPropagation();');
  });
});

describe('the version cap', () => {
  it('is the reference s three, named once', () => {
    /* `this.maxVersions = 3` — byte 1,468,359. */
    expect(REPOSITORY).toContain('export const NOTE_VERSION_LIMIT = 3;');
  });

  it('DELETES the surplus rather than merely hiding it', () => {
    /*
      A `LIMIT 3` on the read alone is the version of this fix that looks tidier and is worse: the
      table still grows forever, and the rows past the third become data nothing can reach. There was
      no cap at all before — an unbounded `SELECT` on a path `NotesPane` reissues on every
      three-second autosave, which is the first question `CLAUDE.md` says to ask of a read path.
    */
    expect(REPOSITORY).toContain('.delete(noteVersions)');
    expect(REPOSITORY).toContain('notInArray(noteVersions.id, keep)');
    expect(REPOSITORY).toContain('.limit(NOTE_VERSION_LIMIT)');
  });

  it('prunes on the INSERT branch only', () => {
    /*
      The coalescing branch rewrites the newest row in place, so the count cannot have changed and a
      delete there would be a query per keystroke-window over a row set that is already right.
    */
    const insertAt = REPOSITORY.indexOf('.insert(noteVersions)');
    const updateAt = REPOSITORY.indexOf('.update(noteVersions)');
    expect(insertAt, 'both branches must exist').toBeGreaterThan(-1);
    expect(updateAt, 'both branches must exist').toBeGreaterThan(-1);
    expect(updateAt, 'the coalescing update comes first').toBeLessThan(insertAt);
    const pruneAt = REPOSITORY.indexOf('.delete(noteVersions)');
    expect(pruneAt, 'the prune follows the insert, not the update').toBeGreaterThan(insertAt);
  });

  it('orders by version rather than doing arithmetic on it', () => {
    /*
      `version` is monotonic per note, but the restore path writes a NEW version rather than
      rewinding the counter — so `version <= n - 3` would be a second assumption where the ordering
      is the only one needed.
    */
    expect(REPOSITORY).toContain('.orderBy(desc(noteVersions.version))');
    expect(REPOSITORY).not.toContain('NOTE_VERSION_LIMIT -');
    expect(REPOSITORY).not.toContain('- NOTE_VERSION_LIMIT');
  });
});

describe('a dialog raised from inside a note modal', () => {
  it('stacks over it, by numbers read from the sheets that ship', () => {
    /*
      Bootstrap gives `.modal` 1055 and `.modal-backdrop` 1050; Summernote's `.note-modal.open` is
      1070, transcribed into both note components. So every `<BootboxDialog>` raised while a note
      modal was open painted BEHIND it — present, focused, answering the keyboard, and invisible
      under the modal that asked the question. `NoteEditor` had done that since it was written.
    */
    expect(APP_CSS).toContain('.bootbox.modal.above-note-modal {');
    expect(APP_CSS).toContain('z-index: 1075;');
    expect(APP_CSS).toContain('.bootbox.modal.above-note-modal + .modal-backdrop {');
    expect(APP_CSS).toContain('z-index: 1074;');
  });

  it('beats the number it has to beat, in both components', () => {
    /*
      The assertion that makes the entry above mean something. If either component's `.note-modal`
      z-index is ever raised, this goes red rather than the dialog quietly disappearing again.
    */
    for (const [name, source] of [
      ['NoteEditor', EDITOR],
      ['CarouselDialog', DIALOG]
    ] as const) {
      const at = source.indexOf('.note-modal.open {');
      expect(at, `${name} must declare the note modal's z-index`).toBeGreaterThan(-1);
      const closes = source.indexOf('}', at);
      expect(closes, `${name}'s rule must be closed`).toBeGreaterThan(at);
      const declared = /z-index:\s*(\d+);/.exec(source.slice(at, closes));
      expect(declared, `${name} must give it a number`).not.toBeNull();
      expect(Number(declared![1]), `${name} must sit below 1075`).toBeLessThan(1075);
    }
  });

  it('is opt-in, so it does not lift every dialog in the room over every modal', () => {
    /*
      Lifting the whole `.bootbox` class would be a different and wrong claim. Only the components
      that raise a dialog from inside their own modal pass the class.
    */
    expect(EDITOR).toContain('className="above-note-modal"');
    const uses = [...DIALOG.matchAll(/className="above-note-modal"/g)];
    expect(uses, 'the carousel confirms and its upload alert').toHaveLength(2);
  });
});
