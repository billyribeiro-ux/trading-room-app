import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import NotesPane from './components/notes/NotesPane.svelte';
import { svelteCodeOf } from './source-comments.js';
import type { RoomNote } from './types.js';

/**
 * ONE TAB PANEL PER NOTE, AND THE HIT TARGET THAT SELECTS ONE — `NP-01` and `NP-02`.
 *
 * ## NP-01, and why a dangling `aria-controls` is the sharp end of it
 *
 * `zSe` — the notes pane, byte 1,930,200 — repeats BOTH of its lists over the same array:
 *
 * ```js
 * function zSe(t,n){if(1&t&&(d(0,"ul",120),ht(1,jSe,9,11,"li",16,pc),u(),
 *                            d(3,"div",121),ht(4,$Se,10,9,"div",72,pc),u()),…
 * ```
 *
 * one `<li>` per note in `ul#notesTabs`, and one `<div>` per note in `div#notesTabsContent`. Const
 * 72 is `["role","tabpanel",1,"tab-pane","fade",3,"ngClass","id"]`, byte 1,999,590 — `show active`
 * arrives through `ngClass`, which is Bootstrap's tab-pane shape exactly: every pane is in the
 * document and one of them is shown.
 *
 * This room rendered ONE panel, for the active note. Nothing looked wrong, and two things were:
 *
 * **Every tab but the open one pointed at an element that did not exist.** `jSe` sets
 * `Et("aria-controls", e._id)` at byte 1,929,073 and ours sets the same attribute on every anchor —
 * but the only `id` in the document was the active note's. `notes-pane-render.test.ts` had been
 * asserting exactly that pair for two notes since it was written: `aria-controls="60"` on the second
 * tab, and one panel, `id="59"`. Both assertions were true and together they described a broken
 * relationship. A test can pin two facts and still not ask whether they agree.
 *
 * **Switching tabs threw away the scroll position.** `.note-container` is `overflow-y: auto`, so
 * each panel is its own scroller. Unmounting it discards where the reader was; the reference's
 * panes stay mounted and only swap a class.
 *
 * ### What is deliberately NOT repeated
 *
 * The EDITOR. Upstream renders `app-note` in every panel and lets each decide whether it is editing
 * (`H(0,T0e,16,3)` gated on `isEditing`). Ours mounts `NoteEditor` only in the panel being edited,
 * because ours is a Tiptap instance with a document, an undo stack and a three-second autosave
 * timer, and `editingNoteId` is a single value — a second instance is unreachable and would cost all
 * of that per note in the room. The read-only `.note-view` IS repeated, which is what upstream's
 * `app-note` renders when it is not editing (const 3, `[1,"note-view",3,"innerHTML","id"]`).
 *
 * ## NP-02 — the click belongs to the `<li>`
 *
 * Const 31 is `["role","presentation",1,"nav-item",3,"click"]` (byte 1,996,498) and const 73, the
 * anchor, is `["data-bs-toggle","tab","role","tab","aria-selected","true",1,"nav-link",3,"ngClass",
 * "id"]` (byte 1,999,647) — no click on it at all. `jSe` binds `onNotesTabChange(o._id)` on the
 * `<li>` at byte 1,928,643.
 *
 * The difference is measurable rather than notional: `.noteTabset .nav-link` carries `margin: 5px`,
 * so every tab has a five-pixel ring that belongs to the `<li>` and to nothing else, and a press
 * landing there did nothing. `acA-12` is the same finding on the two alert-toolbar toggles and was
 * built the same way, which is why this one is transcribed rather than argued about.
 */

const ROOT = new URL('../', import.meta.url);

const PANE = svelteCodeOf(
  readFileSync(new URL('lib/components/notes/NotesPane.svelte', ROOT), 'utf8')
);

const BUNDLE = readFileSync(
  new URL('../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', ROOT),
  'utf8'
);

const SHEET = readFileSync(new URL('../css/complete-app-styles.css', ROOT), 'utf8');

const note = (id: number, name: string, isWelcomeMat = false): RoomNote => ({
  id,
  name,
  contentHtml: `<p>${name}</p>`,
  isWelcomeMat,
  position: 0,
  updatedById: 1,
  createdAt: '2026-07-30T12:00:00.000Z',
  updatedAt: '2026-07-30T12:00:00.000Z'
});

const body = (notes: readonly RoomNote[], canEdit = true) =>
  render(NotesPane, {
    props: {
      canEdit,
      focusedNoteId: null,
      onBringEveryone: () => undefined,
      giphyApiKey: '',
      newNoteOpen: false,
      notes,
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

describe('what the capture actually contains', () => {
  it('repeats the panel list over the same array as the tab list', () => {
    expect(BUNDLE.slice(1_930_173, 1_930_320)).toContain('ht(1,jSe,9,11,"li",16,pc)');
    expect(BUNDLE.indexOf('ht(4,$Se,10,9,"div",72,pc)')).toBe(1_930_259);
  });

  it('carries `show active` on the panel through ngClass, not in the class list', () => {
    expect(BUNDLE.indexOf('["role","tabpanel",1,"tab-pane","fade",3,"ngClass","id"]')).toBe(
      1_999_590
    );
  });

  it('binds the tab click on the `li` const and not on the anchor const', () => {
    expect(BUNDLE.indexOf('["role","presentation",1,"nav-item",3,"click"]')).toBe(1_996_498);
    const anchor = BUNDLE.indexOf(
      '["data-bs-toggle","tab","role","tab","aria-selected","true",1,"nav-link",3,"ngClass","id"]'
    );
    /*
      Found FIRST, then placed. The exact offset below is the stronger assertion, but the slice two
      lines down is bound by this local: if the const table ever moves, `indexOf` answers -1,
      `slice(-1, 89)` yields one character, and `not.toContain('"click"')` passes against it.
    */
    expect(
      anchor,
      'the anchor const must exist for the slice below to test anything'
    ).toBeGreaterThan(-1);
    expect(anchor).toBe(1_999_647);
    /* The anchor const declares two bindings and neither is a listener: no `3,"click"` in it. */
    expect(BUNDLE.slice(anchor, anchor + 90)).not.toContain('"click"');
    expect(BUNDLE.slice(1_928_605, 1_928_760)).toContain('d(0,"li",31),x("click"');
  });

  it('gives the anchor a margin the li owns, which is what the hit target costs', () => {
    /* The five pixels the row's own comment cites. Read, not remembered. */
    expect(SHEET).toContain('.noteTabset .nav-link {');
    const at = SHEET.indexOf('.noteTabset .nav-link {');
    expect(at, 'the rule must exist for the slice below to test anything').toBeGreaterThan(-1);
    expect(SHEET.slice(at, SHEET.indexOf('}', at))).toContain('margin: 5px');
  });
});

describe('NP-01 — every note has a panel, and exactly one is shown', () => {
  it('renders one tabpanel per note', () => {
    const rendered = body([note(59, 'Bible Verses'), note(60, 'Trading Plan'), note(61, 'Rules')]);
    expect(rendered.match(/role="tabpanel"/g)).toHaveLength(3);
  });

  it('shows only the active one, and keeps the reference s class order', () => {
    const rendered = body([note(59, 'Bible Verses'), note(60, 'Trading Plan')]);
    expect(rendered).toContain(
      '<div role="tabpanel" class="tab-pane fade show active" aria-labelledby="59-tab" id="59">'
    );
    expect(rendered).toContain(
      '<div role="tabpanel" class="tab-pane fade" aria-labelledby="60-tab" id="60">'
    );
    expect(rendered.match(/show active/g)).toHaveLength(1);
  });

  it('resolves every tab s aria-controls, which is the defect this row was for', () => {
    /*
      THE ASSERTION THAT WOULD HAVE CAUGHT IT. Every `aria-controls` names an id; every one of those
      ids is on an element in the same document. Written as a sweep rather than as two literals, so
      a third note is covered without anyone remembering.
    */
    const rendered = body([note(59, 'a'), note(60, 'b'), note(61, 'c')]);
    const controls = [...rendered.matchAll(/aria-controls="(\d+)"/g)].map((found) => found[1]);
    expect(controls, 'one aria-controls per tab').toHaveLength(3);
    for (const id of controls) {
      expect(rendered, `aria-controls="${id}" must name an element that exists`).toContain(
        `id="${id}">`
      );
    }
  });

  it('gives every panel its own note body and its own noteOptions bar', () => {
    const rendered = body([note(59, 'Bible Verses'), note(60, 'Trading Plan')]);
    expect(rendered).toContain('id="summernoteEdit-59"');
    expect(rendered).toContain('id="summernoteEdit-60"');
    expect(
      rendered.match(/<div class="noteOptions d-flex align-items-center justify-content-between">/g)
    ).toHaveLength(2);
  });

  it('still renders nothing at all for a room with no notes', () => {
    const rendered = body([]);
    expect(rendered).toContain('<div id="notesTabsContent"');
    expect(rendered).not.toContain('role="tabpanel"');
  });

  it('mounts at most ONE editor, which is the part that is not repeated', () => {
    /*
      SSR renders no editor at all (`editingNoteId` starts null), so the claim is pinned at the
      source: the branch is keyed on the row's own id against a single-valued `editingNoteId`, which
      cannot be true for two rows.
    */
    expect(PANE).toContain('{#if editingNoteId === note.id && canEdit}');
    expect(PANE).toContain('let editingNoteId = $state<number | null>(null);');
    expect(PANE.match(/<NoteEditor/g)).toHaveLength(1);
  });
});

describe('NP-02 — the whole nav-item is the hit target', () => {
  it('hangs the click on the li and leaves the anchor without one', () => {
    const liAt = PANE.indexOf('<li');
    expect(liAt, 'the tab li must exist').toBeGreaterThan(-1);
    const anchorAt = PANE.indexOf('<a', liAt);
    expect(anchorAt, 'the anchor must follow it').toBeGreaterThan(liAt);
    const li = PANE.slice(liAt, anchorAt);
    const anchor = PANE.slice(anchorAt, PANE.indexOf('>', anchorAt));

    expect(li).toContain('selectNote(note.id)');
    expect(anchor, 'the anchor carries the role and the ids, never the handler').not.toContain(
      'onclick'
    );
    expect(anchor).toContain('role="tab"');
    expect(anchor).toContain('aria-controls={tabId}');
  });

  it('renders the li with exactly the reference s two attributes', () => {
    /*
      The handler is not an attribute, so the rendered `<li>` is unchanged by the move — which is
      precisely why this needed a test: the fix is invisible in the DOM and one refactor from being
      undone.
    */
    const rendered = body([note(59, 'a'), note(60, 'b')]);
    expect(rendered.match(/<li role="presentation" class="nav-item">/g)).toHaveLength(2);
  });
});
