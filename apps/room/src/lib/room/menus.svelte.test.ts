// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomMenus } from './menus.svelte';

/*
  The two closers had two different lists, and this file is where that stops being invisible.

  Nothing here asserts what the menus SHOULD do — there is no capture evidence either way. It pins
  what they currently do, at the point the eleven flags moved into one class, so the difference
  between `closeForModal` and `closeFloating` is a decision somebody can read and rule on rather
  than a divergence nobody can see.
*/

describe('the top-bar four are mutually exclusive', () => {
  it('opening one closes the others', () => {
    const menus = new RoomMenus();
    menus.toggleTop('recording');
    expect(menus.recording).toBe(true);

    menus.toggleTop('soundcloud');
    expect(menus.soundcloud).toBe(true);
    expect(menus.recording, 'the top menus are exclusive').toBe(false);
  });

  it('and toggling the open one closes it', () => {
    const menus = new RoomMenus();
    menus.toggleTop('screen');
    menus.toggleTop('screen');
    expect(menus.screen).toBe(false);
  });

  it('opening any of them also closes the volume slider', () => {
    // `volumeOpen = false` was the fourth line of `toggleTopMenu`.
    const menus = new RoomMenus();
    menus.toggle('volume');
    expect(menus.volume).toBe(true);
    menus.toggleTop('recording');
    expect(menus.volume).toBe(false);
  });
});

describe('the independent four are NOT exclusive, and that is preserved deliberately', () => {
  it('roster sort, archives, notes and files can be open together', () => {
    /*
      The evidence that refused the obvious simplification. Collapsing all eleven flags into one
      `open: MenuName | null` would make these exclusive, which is a UX change dressed as a
      refactor — `toggleTopMenu` enforces exclusivity for the top bar and for nothing else.
    */
    const menus = new RoomMenus();

    /*
      OPENED IN EVERY ORDER, and that is not padding. The first draft opened them in one fixed order
      and its negative control — making `archives` close the others — stayed GREEN, because
      `archives` was opened FIRST and so had nothing to close. A control that cannot fail is the
      thing this repository keeps catching, and it caught me here.

      Each pass opens one menu LAST, so any exclusivity that menu introduces has something live to
      close and is visible in the assertion.
    */
    const independent = ['rosterSort', 'archives', 'notes', 'files'] as const;
    for (const last of independent) {
      menus.closeFloating();
      for (const menu of independent) if (menu !== last) menus.set(menu, true);
      menus.set(last, true);

      expect(
        independent.map((menu) => menus[menu]),
        `opening ${last} last closed one of the others`
      ).toEqual([true, true, true, true]);
    }
  });
});

describe('the two closers, and exactly what each one leaves open', () => {
  const allOpen = () => {
    const menus = new RoomMenus();
    menus.toggleTop('recording');
    menus.set('soundcloud', true);
    menus.set('volume', true);
    menus.toggle('rosterSort');
    menus.set('archives', true);
    menus.set('notes', true);
    menus.set('files', true);
    menus.set('emoji', true);
    menus.set('giphy', true);
    menus.openUserMenu(7);
    menus.openMessageMenu('m-1');
    return menus;
  };

  it('closeForModal leaves the three top-bar dropdowns open', () => {
    // `openModal`'s list. Preserved, not endorsed — see the class header.
    const menus = allOpen();
    menus.closeForModal();

    expect(menus.recording, 'openModal never closed this').toBe(true);
    expect(menus.soundcloud, 'nor this').toBe(true);
    expect([menus.volume, menus.rosterSort, menus.archives, menus.notes, menus.files]).toEqual([
      false,
      false,
      false,
      false,
      false
    ]);
    expect([menus.emoji, menus.giphy]).toEqual([false, false]);
    expect([menus.userId, menus.messageId]).toEqual([null, null]);
  });

  it('closeFloating leaves the emoji and GIF pickers open', () => {
    // `closeFloatingMenus`'s list. The pickers live in the composer, which may be why.
    const menus = allOpen();
    menus.closeFloating();

    expect(menus.emoji, 'closeFloatingMenus never closed this').toBe(true);
    expect(menus.giphy, 'nor this').toBe(true);
    expect([menus.volume, menus.recording, menus.soundcloud, menus.screen]).toEqual([
      false,
      false,
      false,
      false
    ]);
    expect([menus.userId, menus.messageId]).toEqual([null, null]);
  });

  it('and the two lists differ, which is the finding', () => {
    /*
      Asserted directly so it cannot be "tidied" into agreement without somebody deciding to. If the
      two are ever made identical on purpose, this is the test that says so out loud.
    */
    const forModal = allOpen();
    forModal.closeForModal();
    const floating = allOpen();
    floating.closeFloating();

    expect(forModal.recording).not.toBe(floating.recording);
    expect(forModal.emoji).not.toBe(floating.emoji);
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  // Mutations and flushes inside the root; assertions outside. See `polls.svelte.test.ts`.
  it('re-runs a reader as the top menu changes', () => {
    const menus = new RoomMenus();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(menus.recording);
      });
      flushSync();
      menus.toggleTop('recording');
      flushSync();
      menus.closeFloating();
      flushSync();
    });
    stop();

    expect(seen, 'the recording menu flag is not reactive').toEqual([false, true, false]);
  });

  it('and as the per-row user menu moves between rows', () => {
    // A null-vs-id field rather than a boolean; stale here means the menu opens on the wrong row.
    const menus = new RoomMenus();
    const seen: (number | null)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(menus.userId);
      });
      flushSync();
      menus.openUserMenu(7);
      flushSync();
      menus.openUserMenu(9);
      flushSync();
    });
    stop();

    expect(seen, 'the user menu id is not reactive').toEqual([null, 7, 9]);
  });
});
