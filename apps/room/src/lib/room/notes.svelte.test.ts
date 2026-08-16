// @vitest-environment jsdom
import { readFileSync } from 'node:fs';

import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { RoomNotes } from './notes.svelte';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));
vi.mock('$app/forms', () => ({ deserialize: vi.fn(() => ({ type: 'success', data: {} })) }));

/*
  THE NOTES TAB, executed.

  Written because a negative control came back green — the FOURTH in this phase. Removing
  `this.#showNotesTab()` from the create path, so a note is made and nobody is taken to the tab
  holding it, broke nothing in 2,321 assertions.

  The other three were slice 22's detach receiver, the client half of the mention bit, and slice
  24's modal rune. All four are the same shape: a RECEIVER or a rune whose two ends each read
  correctly in isolation, so no source-text contract could see the join. Each was a missing test
  rather than a missing behaviour, and each was found by running the control before committing.
*/

const make = () => {
  const shown: true[] = [];
  const notes = new RoomNotes({
    menus: { closeForModal: () => {}, set: () => {} } as never,
    modals: { open: () => {} } as never,
    noteGates: () => ({ editorMounted: false }),
    showNotesTab: () => shown.push(true)
  });
  return { notes, shown };
};

describe('creating a note takes you to the tab holding it', () => {
  it('the create path asks the page to show Notes', () => {
    /*
      A RECEIVER, because `mainTab` is written by four features and the tab strip is the page's. The
      class can only ask — so what is asserted is that it asks, and `+page.svelte` supplying the
      receiver is asserted below.
    */
    const { notes, shown } = make();
    const link = document.createElement('ul');
    document.body.append(link);
    const teardown = notes.mountNewNoteLink(link);

    const anchor = link.querySelector('a');
    expect(anchor, 'the new-note link must be mounted for this to guard anything').not.toBeNull();
    anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(shown, 'creating a note must move the room to the Notes tab').toEqual([true]);
    teardown?.();
    link.remove();
  });

  it('the page supplies the receiver the class calls', () => {
    // Every expectation above is satisfied by a class calling a receiver nobody wires, which would
    // raise no error and move no tab — the exact failure that made the control green.
    const page = readFileSync('src/routes/+page.svelte', 'utf8');
    expect(page, 'the page no longer wires the Notes tab receiver').toContain(
      "showNotesTab: () => (mainTab = 'notes')"
    );
  });
});

describe('the editor flag carries its rune', () => {
  it('the Notes pane re-renders when the editor opens and closes', () => {
    // Demoted to a plain field the pane would show whichever state it had at mount, for ever.
    const { notes } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(notes.newNoteOpen);
      });
      flushSync();
      notes.newNoteOpen = true;
      flushSync();
      notes.newNoteOpen = false;
      flushSync();
    });
    stop();
    expect(seen).toEqual([false, true, false]);
  });
});
