import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from './source-comments.js';

/**
 * THREE THINGS ON THE NOTES SURFACE THAT NOTHING READ — `NE-01`, `CD-05`, `CD-06`.
 *
 * `CLAUDE.md`: *"Nothing exists without a consumer… No `.flipped` class with no CSS. No control
 * whose only effect is changing its own label."* Two gates in this repository look for half of that:
 * `orphan-style-contract.test.ts` finds a RULE nobody wears, and `orphan-component-contract.test.ts`
 * finds a component nobody mounts. Neither looks in the direction this file does — a class no rule
 * reaches, and a block that renders nothing at all.
 *
 * ## What was there
 *
 * **`NoteEditor.svelte` carried an `{#if}` whose body was one HTML comment.** Three conditions were
 * evaluated on every render — `giphyApiKey && openMenu === null && dialog === null` — to decide
 * between rendering nothing and rendering nothing. The comment inside it said *"Giphy is opened by
 * the toolbar button through this captured picker surface"*, which is true and describes the block
 * eighty lines above it that actually mounts `GiphyPicker`. A note pointing at another block, left
 * inside a gate of its own, reads as a surface that has not been built yet.
 *
 * **`CarouselDialog.svelte` wore two invented class names.** `note-carousel-modal` on the carousel
 * modal's root and `note-modal-dialog` on a wrapper `<div>` inside the file browser. Both were
 * searched for rather than assumed: zero occurrences in `main.d1d09071be31f1ba.js`, zero in
 * `styles.ee2a710065b60389.css`, and zero in every sheet this app ships. `O0e` has no wrapper
 * element either — the `.modal-dialog` NgbModal supplies is outside the template — so the div was
 * not a transcription of anything.
 *
 * ## Why a test rather than just the deletion
 *
 * All three are invisible to every other gate here. They compile, they lint, they type-check, and
 * `svelte-check` has nothing to say about a class with no rule or a branch with no body. The cost of
 * a fourth is now a failing test instead of a reader spending ten minutes deciding whether a class
 * is load-bearing.
 */

const ROOT = new URL('../', import.meta.url);

const EDITOR = svelteCodeOf(
  readFileSync(new URL('lib/components/notes/NoteEditor.svelte', ROOT), 'utf8')
);
const DIALOG = svelteCodeOf(
  readFileSync(new URL('lib/components/notes/CarouselDialog.svelte', ROOT), 'utf8')
);

/**
 * Every stylesheet this app actually ships, in cascade order — the same list
 * `img-dimensions-contract.test.ts` reads, and for the same reason: a class is only orphaned if
 * NONE of them carries it, and a shorter list produces a false positive.
 */
const SHEETS = [
  '../css/complete-app-styles.css',
  'lib/styles/tokens.css',
  'lib/styles/captured-runtime-components.css',
  'app.css'
] as const;

const shipped = SHEETS.map((path) => readFileSync(new URL(path, ROOT), 'utf8')).join('\n');

const BUNDLE = readFileSync(
  new URL('../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', ROOT),
  'utf8'
);
const REFERENCE_CSS = readFileSync(
  new URL('../docs/source-v4-2026-08-15/styles.ee2a710065b60389.css', ROOT),
  'utf8'
);

describe('the corpus this file measures against', () => {
  it('read four sheets and both reference artifacts', () => {
    /*
      The vacuity guard. Every assertion below is a `not.toContain`, and a `not.toContain` against an
      empty string passes — which would turn this whole file green while measuring nothing.
    */
    expect(shipped.length).toBeGreaterThan(100_000);
    expect(BUNDLE.length).toBe(2_891_205);
    expect(REFERENCE_CSS.length).toBeGreaterThan(400_000);
    /* And the sheets really are the ones with rules in them. */
    expect(shipped).toContain('.note-modal-title');
  });
});

describe('NE-01 — the branch that rendered nothing', () => {
  it('is gone, and the Giphy picker it pointed at is not', () => {
    expect(EDITOR).not.toContain('giphyApiKey && openMenu === null && dialog === null');
    /* The real mount, which the deleted block's comment was describing. */
    expect(EDITOR).toContain('{#if giphyApiKey && giphyOpen}');
    expect(EDITOR).toContain('<GiphyPicker');
  });

  it('leaves no other empty block behind it', () => {
    /*
      A block whose body is only whitespace once comments are stripped. This is the general form of
      the defect rather than a re-statement of the one instance, so a second one fails here too.
    */
    const empty = EDITOR.match(/\{#if[^}]*\}\s*\{(?::else|\/if)/g) ?? [];
    expect(empty, `${empty.join(' ; ')} — an {#if} with nothing in it`).toEqual([]);
  });
});

describe('CD-05 and CD-06 — the two class names nothing styles', () => {
  it.each(['note-carousel-modal', 'note-modal-dialog'])(
    '`%s` is worn by nothing, because no rule anywhere defines it',
    (name) => {
      expect(shipped, `${name} has no rule in any shipped sheet`).not.toContain(name);
      expect(REFERENCE_CSS, `${name} is not in the reference stylesheet either`).not.toContain(
        name
      );
      expect(BUNDLE, `${name} is not in the reference bundle either`).not.toContain(name);
      expect(DIALOG, `${name} must not be worn by anything here`).not.toContain(name);
    }
  );

  it('keeps the classes that ARE styled, so the deletion was narrow', () => {
    /*
      The control for the control. `note-modal`, `note-modal-content`, `note-modal-header` and
      `note-modal-title` all have rules in the shipped sheet and all four are still worn — a sweep
      that removed one of them would look identical in a diff to the two that had to go.
    */
    for (const name of [
      'note-modal open',
      'note-modal-content',
      'note-modal-header',
      'note-modal-title',
      'note-modal-body',
      'note-modal-footer'
    ]) {
      expect(DIALOG, name).toContain(name);
      expect(shipped, `${name} must still be a real rule`).toContain(name.split(' ')[0]);
    }
  });
});
