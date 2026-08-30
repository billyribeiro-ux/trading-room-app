// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { RoomModals } from './modals.svelte';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));
vi.mock('../../routes/user-settings.remote', () => ({ saveTheme: vi.fn(async () => {}) }));

/*
  THE OVERLAY STATE MACHINE, executed.

  Written because a negative control was invisible to every gate. Demoting `#modal` from `$state` to
  a plain field — so the room renders whichever overlay was showing when it loaded and never
  changes again — broke nothing: svelte-check reports 0 errors and 0 warnings, because Svelte's
  `non_reactive_update` warning is about a `let` in a COMPONENT and says nothing about a class
  field, and all 2,311 assertions passed.

  That is the third time in this phase a control has come back green, and each time it was a missing
  test rather than a missing behaviour. The other two were slice 22's detach receiver and the
  client half of the mention bit.

  `room-mtx.svelte.test.ts`'s shape, for the reason that file records: mutations and `flushSync`
  INSIDE `$effect.root`, the expectation OUTSIDE it, because a thrown assertion inside the root is
  swallowed and reports as a pass.
*/

const make = () => {
  const managed: true[] = [];
  const themes: string[] = [];
  const debugLogsCleared: true[] = [];
  /** Which modal openings asked the server about the card's subject. */
  const detailsAsked: true[] = [];
  const modals = new RoomModals({
    menus: { closeForModal: () => {}, set: () => {}, closeFloating: () => {} } as never,
    polls: {} as never,
    messageActions: { clearSelected: () => {}, selected: null },
    userActions: {
      loadManaged: () => managed.push(true),
      hydrateDetail: () => detailsAsked.push(true)
    },
    unreadQaAlertIds: { clear: () => {}, delete: () => true },
    setTheme: (next) => themes.push(next),
    debugLog: {
      clearReceived: () => {
        debugLogsCleared.push(true);
      }
    }
  });
  return { modals, managed, themes, debugLogsCleared, detailsAsked };
};

/*
  The user card's server lookup is asked for HERE and nowhere else, because this is the one place
  every entry point converges — see `RoomUserActions.hydrateDetail` for why hanging it off the
  selection instead was wrong rather than merely different.
*/
describe('opening the user card asks the server about its subject', () => {
  it('asks for the user modal and for no other', () => {
    const { modals, detailsAsked } = make();
    modals.open('muted');
    modals.open('followed');
    modals.open('report');
    expect(detailsAsked, 'the managed lists show no card').toEqual([]);
    modals.open('user');
    expect(detailsAsked).toEqual([true]);
  });
});

/** Read inside an effect root, mutate inside it, assert on the result outside. */
const observe = <T>(read: () => T, mutate: () => void): T[] => {
  const seen: T[] = [];
  const stop = $effect.root(() => {
    $effect(() => {
      seen.push(read());
    });
    flushSync();
    mutate();
    flushSync();
  });
  stop();
  return seen;
};

describe('every field the template renders from carries its rune', () => {
  /*
    ONE assertion per independently reactive field, and they are independent on purpose: the modal
    host, the settings modal, the alerts modal, the session-control modal and the lightbox are five
    different elements. A wiring that made the modal name live while leaving the tab static would
    open the right dialog on the wrong tab, and a single check could not tell that from working.
  */
  it('the modal name, so opening one shows it', () => {
    const { modals } = make();
    const seen = observe(
      () => modals.modal,
      () => {
        modals.open('alert-filter');
        flushSync();
        modals.closeActive();
      }
    );
    expect(seen).toEqual([null, 'alert-filter', null]);
  });

  it('the settings tab, so the settings modal opens where it was asked to', () => {
    const { modals } = make();
    const seen = observe(
      () => modals.settingsTab,
      () => (modals.settingsTab = 'chat')
    );
    expect(seen).toEqual(['app', 'chat']);
  });

  it('the alert tab, which is a different modal and a different field', () => {
    const { modals } = make();
    const seen = observe(
      () => modals.alertTab,
      () => (modals.alertTab = 'url')
    );
    expect(seen).toEqual(['text', 'url']);
  });

  it('the session-control tab, set by the navbar rather than by the modal', () => {
    // `openSessionControl` writes the tab AND the modal name; the tab is asserted on its own so a
    // wiring that opened the dialog on its default tab cannot pass here.
    const { modals } = make();
    const seen = observe(
      () => modals.sessionControlInitialTab,
      () => modals.openSessionControl('av-device-selection')
    );
    expect(seen).toEqual(['reset-session', 'av-device-selection']);
  });

  it('the lightbox url, so a click opens the image and a dismiss closes it', () => {
    const { modals } = make();
    const seen = observe(
      () => modals.selectedImageUrl,
      () => {
        modals.selectedImageUrl = 'https://example.test/a.png';
        flushSync();
        modals.selectedImageUrl = null;
      }
    );
    expect(seen).toEqual([null, 'https://example.test/a.png', null]);
  });
});

describe('opening a modal does the work that goes with it', () => {
  it('the managed lists are loaded for the three modals that render them', () => {
    // `muted`, `followed` and `user` all show a managed list; opening any other modal must not
    // fetch one, which is the half a "does it load" assertion alone would miss.
    const { modals, managed } = make();
    modals.open('muted');
    modals.open('followed');
    modals.open('user');
    expect(managed).toHaveLength(3);

    modals.open('alert-filter');
    expect(managed, 'an unrelated modal must not load them').toHaveLength(3);
  });

  it('setTheme reaches the page, because theme did not travel', () => {
    // Thirteen other places read `theme`, so it stayed on the page and crosses as a receiver. If it
    // ever moves into this class, this is the assertion that should be reconsidered rather than
    // deleted.
    const { modals, themes } = make();
    modals.setTheme('dark');
    expect(themes).toEqual(['dark']);
  });

  it('forgets a received debug log when its modal closes', () => {
    /*
      A presenter who opens the Debug Log modal again must not be shown whoever answered LAST, under
      whatever title that answer carried - it reads as a fresh reply and is not one. The clear lives
      in `closeActive` beside the poll and Q&A cleanups rather than at the call site, because
      `ModalHost` has ONE `onclose` for every modal it hosts.
    */
    const { modals, debugLogsCleared } = make();
    modals.open('debug');
    expect(debugLogsCleared).toEqual([]);
    modals.closeActive();
    expect(debugLogsCleared).toEqual([true]);

    /*
      And NOT on an unrelated close, which is what makes the `=== 'debug'` guard load-bearing.

      `qa` rather than `poll`: this file's `polls` is `{} as never`, so closing a poll would throw on
      a stub rather than exercise the guard. `qa`'s own cleanup short-circuits on a null selection,
      which is what makes it the neutral close here.
    */
    modals.open('qa');
    modals.closeActive();
    expect(debugLogsCleared).toEqual([true]);
  });
});
