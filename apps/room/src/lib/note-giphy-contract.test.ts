import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * The note surface's three Giphy gaps, and the one thing they have in common.
 *
 * | audit row | what it wanted |
 * | --- | --- |
 * | `note-editor-giphy-search-button` | `<span class="input-group-text">` with `fa-search` |
 * | `note-editor-giphy-hint-text` | `insert it`, where three other surfaces say `select it` |
 * | `note-editor-gif-insert-confirm` | the full-width preview, and `sendingGif` |
 *
 * Two of the three are ONE STRING that differs on this surface and nowhere else — the hint's verb
 * and the confirmation's. Both were filed as shared-component compromises: this room runs one
 * `GiphyPicker` and one `GifConfirmDialog` for all four surfaces, and both hardcoded the majority
 * wording. **A compromise is what they were and neither was necessary.** The difference is a prop
 * with the majority string as its default, so the three surfaces that were already right are not
 * touched and the one that was wrong passes what the capture gives it.
 *
 * The words are not interchangeable, which is why upstream varies them. Everywhere else a
 * double-click SELECTS a GIF that is then confirmed and SENT to a room; in a note it goes into a
 * document. `insert` and `post` describe different consequences.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const PICKER = read('./components/GiphyPicker.svelte');
const CONFIRM = read('./components/GifConfirmDialog.svelte');
const EDITOR = read('./components/notes/NoteEditor.svelte');
const CHAT = read('./components/AlertChatArea.svelte');
const EXTRA = read('./components/ExtraChatPane.svelte');

describe('the search button', () => {
  it('exists, as the other half of a pair that shipped with one half', () => {
    /*
      ```js
      d(12,"span",88), x("click", () => searchGiphy()), T(13,"i",89),      // byte 1,467,345
      d(14,"span",88), x("click", () => clearSearchGiphy()), T(15,"i",90)
      ```

      Const 88 is `[1,"input-group-text","text-dark",3,"click"]` and BOTH spans use it. Only the
      clear span was here, so a search could be started only by pressing Enter in the field — with a
      visible affordance beside it that did the opposite.
    */
    expect(PICKER).toContain('<i class="fa fa-2x fa-search"></i>');
    expect(PICKER).toContain('<i class="fa fa-2x fa-times"></i>');
    const spans = [...PICKER.matchAll(/class="input-group-text text-white"/g)];
    expect(spans, 'the pair, and nothing else').toHaveLength(2);
  });

  it('is reachable from a keyboard, which the capture s bare span is not', () => {
    /*
      Ours, on both spans, and stated rather than silent: the capture puts a click handler on a plain
      `<span>`. Not a `<button>`, because `input-group-text` is what gives the two their shape inside
      the group and a button would have to un-style itself back to it.
    */
    const roles = [...PICKER.matchAll(/role="button"/g)];
    expect(roles).toHaveLength(2);
    expect(PICKER).toContain('aria-label="Search Giphy"');
    expect(PICKER).toContain('aria-label="Clear the Giphy search"');
    const keys = [...PICKER.matchAll(/event\.key === 'Enter' \|\| event\.key === ' '/g)];
    expect(keys, 'both spans answer Enter and Space').toHaveLength(2);
  });
});

describe('the wording that differs on exactly one surface', () => {
  it('defaults to the majority string, so three surfaces stay untouched', () => {
    /*
      `select it` at offsets 1,425,716, 2,197,828 and 2,372,175; `insert it` at 1,467,154 only.
      Defaulting to the majority is what makes this a one-line change rather than three.
    */
    expect(PICKER).toContain("hint = '*Double click an image to select it'");
    expect(CONFIRM).toContain("message = 'You sure you want to post this image:'");
    /* And the two chat surfaces pass neither, which is the other half of that claim. */
    expect(CHAT).not.toContain('hint=');
    expect(EXTRA).not.toContain('hint=');
  });

  it('renders the prop, not the literal it replaced', () => {
    /* A default that nothing reads is a prop with no consumer. */
    expect(PICKER).toContain('<h6>{hint}</h6>');
    expect(PICKER).not.toContain('*Double click an image to select it</h6>');
    expect(CONFIRM).toContain('{message}<br />');
    expect(CONFIRM).not.toContain('You sure you want to post this image:<br />');
  });

  it('is passed by the note surface, in the capture s words', () => {
    expect(EDITOR).toContain('hint="*Double click an image to insert it"');
    expect(EDITOR).toContain('message="You sure you want to insert this image:"');
  });
});

describe('the insert confirmation', () => {
  it('previews before inserting, rather than inserting on the double-click', () => {
    /*
      The preview is the point: a Giphy result is a thumbnail in a grid, and what lands in the note
      is `images.original` — a different, larger image the presenter has not seen at the size it will
      appear.
    */
    expect(EDITOR).toContain('{#if pendingGif !== null}');
    expect(EDITOR).toContain('<GifConfirmDialog');
    const at = EDITOR.indexOf('function insertGif');
    expect(at, 'the handler must exist').toBeGreaterThan(-1);
    const end = EDITOR.indexOf('\n  }', at);
    expect(end, 'the handler must be closed').toBeGreaterThan(at);
    const body = EDITOR.slice(at, end);
    /* It STAGES; it does not insert. */
    expect(body).toContain('pendingGif = { title, url };');
    expect(body).not.toContain('setImage');
  });

  it('inserts only from the confirmation, and clears the pending GIF first', () => {
    const at = EDITOR.indexOf('function confirmGif');
    expect(at, 'the confirm must exist').toBeGreaterThan(-1);
    const end = EDITOR.indexOf('\n  }', at);
    expect(end, 'the confirm must be closed').toBeGreaterThan(at);
    const body = EDITOR.slice(at, end);
    expect(body).toContain('const chosen = pendingGif;');
    expect(body.indexOf('pendingGif = null;')).toBeLessThan(body.indexOf('setImage'));
    expect(body).toContain('setImage({ src: chosen.url, alt: chosen.title })');
  });

  /**
   * The `insertGif` body, bound and asserted once for the three blocks below that read it.
   *
   * `slice-anchor-contract` requires the bound to be a local: an `indexOf` written into the slice
   * returns -1 when the marker moves, and `slice(-1)` is a well-defined one-character string that
   * every assertion below would then be asking questions about.
   */
  const insertAt = EDITOR.indexOf('function insertGif');
  const insertEnd = EDITOR.indexOf('\n  }', insertAt);
  const insertBody = EDITOR.slice(insertAt, insertEnd);

  it('bound the handler it reads', () => {
    expect(insertAt, 'the handler must exist').toBeGreaterThan(-1);
    expect(insertEnd, 'the handler must be closed').toBeGreaterThan(insertAt);
  });

  it('refuses a second GIF while one is pending — upstream s `sendingGif` guard', () => {
    /*
      `this.sendingGif || (…)`. A double-click that registers twice is what a double-click on a slow
      machine does, and it inserted two copies. The refusal REPLACES nothing: the presenter is
      looking at a preview of the first, and letting a second overwrite it would confirm a different
      image than the one on screen.
    */
    expect(insertBody).toContain('if (pendingGif !== null) return;');
    expect(insertBody.indexOf('if (pendingGif !== null) return;')).toBeLessThan(
      insertBody.indexOf('pendingGif = { title, url };')
    );
  });

  it('closes the picker on select, which is `modalService.dismissAll()`', () => {
    expect(insertBody).toContain('giphyOpen = false;');
    /* Before either guard, so a refused second select still closes the picker it came from. */
    expect(insertBody.indexOf('giphyOpen = false;')).toBeLessThan(
      insertBody.indexOf('if (pendingGif !== null) return;')
    );
  });

  it('still refuses a URL that is not https', () => {
    /* The one guard this handler already had, which the restructure had to keep. */
    expect(insertBody).toContain("if (!url.startsWith('https://')) return;");
  });
});
