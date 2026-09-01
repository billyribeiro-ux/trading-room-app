// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_ZOOM_LEVEL } from '#lib/screen-zoom.js';

import { RoomDialogs } from './dialogs.svelte';
import { RoomScreens, type SharedScreen } from './screens.svelte';

/*
  The screen viewer, executed.

  `screen-controls-contract.test.ts` and `focus-on-screen-contract.test.ts` read this class as
  source and pin the controls and the broadcast against the capture. What neither can do is run a
  removal, and the property that only exists at runtime is the one the split created:

  **the transport owns the LIST and this class owns the three ids that point into it.** A screen
  going away has to clear whichever of them named it, or the viewer is left pointed at a screen that
  no longer exists.
*/

const make = (
  options: {
    screens?: SharedScreen[];
    isPresenter?: boolean;
    follow?: boolean;
    local?: string[];
    params?: Record<string, string>;
    blockPopup?: boolean;
  } = {}
) => {
  const dialogs = new RoomDialogs();
  let list: SharedScreen[] = options.screens ?? [
    { id: 'a', ownerId: 7 },
    { id: 'b', ownerId: 8 }
  ];
  const stoppedLocal: string[] = [];
  const focused: string[] = [];
  const forceStopped: { targetUserId: number; producerId: string }[] = [];
  const reselected: string[] = [];
  const params = new URLSearchParams(options.params ?? {});

  const screens = new RoomScreens({
    dialogs,
    screens: () => list,
    removeScreen: (id) => (list = list.filter((entry) => entry.id !== id)),
    isLocalScreen: (id) => (options.local ?? []).includes(id),
    stopLocalScreen: (id) => stoppedLocal.push(id),
    selectTabOfId: (id) => reselected.push(id),
    searchParams: () => params,
    sessionHandle: () => 'room-1',
    isPresenter: () => options.isPresenter ?? false,
    followMyScreens: () => options.follow ?? false,
    focusOnScreen: (id) => (focused.push(id), Promise.resolve(null)),
    forceStopScreen: (target) => (forceStopped.push(target), Promise.resolve(null))
  });

  return {
    screens,
    dialogs,
    stoppedLocal,
    focused,
    reselected,
    forceStopped,
    list: () => list
  };
};

afterEach(() => vi.unstubAllGlobals());

describe('the three ids are three different questions', () => {
  it('a removal clears whichever of them named the screen', () => {
    /*
      `selectedTab` is what this viewer is looking at, `forcedId` is what a presenter pushed everyone
      to, `lockedId` is what a presenter pinned. A screen going away has to clear all three that
      named it — leaving one behind points the viewer at something that no longer exists.
    */
    const { screens } = make();
    screens.selectedTab = 'a';
    screens.forcedTo('a');
    screens.lockedTo('a');

    screens.screenRemoved('a', 'b');
    expect(screens.selectedTab).toBe('b');
    expect(screens.forcedId, 'the forced id outlived the screen').toBeNull();
    expect(screens.lockedId, 'and so did the lock').toBeNull();
  });

  it('leaves ids that named a DIFFERENT screen alone', () => {
    const { screens } = make();
    screens.forcedTo('b');
    screens.lockedTo('b');
    screens.screenRemoved('a', 'b');
    expect(screens.forcedId).toBe('b');
    expect(screens.lockedId).toBe('b');
  });

  it('forcing everyone to a screen writes TWO fields, together', () => {
    const { screens } = make();
    screens.forcedTo('b');
    expect(screens.forcedId).toBe('b');
    expect(screens.selectedTab, 'a forced screen is also the one you are shown').toBe('b');
  });
});

describe('stopping a screen', () => {
  it('asks the TRANSPORT to drop it, then cleans up its own ids', () => {
    const { screens, list } = make();
    screens.selectedTab = 'a';
    screens.stop('a');
    expect(
      list().map((s) => s.id),
      'the transport owns the list'
    ).toEqual(['b']);
    expect(screens.selectedTab, 'and falls back to what is left').toBe('b');
  });

  it('routes a LOCAL screen to the local stop and touches nothing else', () => {
    const { screens, stoppedLocal, list } = make({ local: ['a'] });
    screens.selectedTab = 'a';
    screens.stop('a');
    expect(stoppedLocal).toEqual(['a']);
    expect(
      list().map((s) => s.id),
      'a local screen is stopped, not removed here'
    ).toEqual(['a', 'b']);
    expect(screens.selectedTab).toBe('a');
  });

  it('falls back to null when the last screen goes', () => {
    const { screens } = make({ screens: [{ id: 'a', ownerId: 7 }] });
    screens.selectedTab = 'a';
    screens.stop('a');
    expect(screens.selectedTab).toBeNull();
  });
});

describe('zoom and pan', () => {
  it('resets the level AND clears every pan, because they are one control', () => {
    const { screens } = make();
    screens.zoomIn();
    screens.pans.set('a', { x: 5, y: 5 });
    expect(screens.zoomLevel).not.toBe(INITIAL_ZOOM_LEVEL);

    screens.resetZoom();
    expect(screens.zoomLevel).toBe(INITIAL_ZOOM_LEVEL);
    expect(screens.pans.size, 'a reset that leaves the pan is not a reset').toBe(0);
  });

  it('toggling the controls resets as it closes', () => {
    const { screens } = make();
    screens.zoomIn();
    screens.toggleZoomControls();
    expect(screens.showZoomCtrl).toBe(true);
    expect(screens.zoomLevel, 'opening the bar starts from the captured level').toBe(
      INITIAL_ZOOM_LEVEL
    );
  });
});

describe('the presenter broadcast', () => {
  it('moves LOCALLY first, then broadcasts', () => {
    /*
      The local move happens first so the presenter's own view responds to their click without
      waiting for a round trip. The server re-checks that the caller is a presenter.
    */
    const { screens, focused } = make({ isPresenter: true });
    screens.bringEveryoneTo('b');
    expect(screens.selectedTab).toBe('b');
    expect(focused).toEqual(['b']);
  });

  it('a MEMBER moves locally and sends nothing', () => {
    const { screens, focused } = make({ isPresenter: false });
    screens.bringEveryoneTo('b');
    expect(screens.selectedTab).toBe('b');
    expect(focused, 'authority is the server’s, and a member does not even ask').toEqual([]);
  });

  it('a tab click broadcasts only when the presenter asked it to', () => {
    const off = make({ isPresenter: true, follow: false });
    off.screens.selectTab('b');
    expect(off.focused).toEqual([]);

    const on = make({ isPresenter: true, follow: true });
    on.screens.selectTab('b');
    expect(on.focused).toEqual(['b']);
  });
});

describe('the detached window', () => {
  it('reads its screen from the URL, because a popout has no parent state', () => {
    const detached = make({ params: { dscreen: '1', presID: 'b' } });
    expect(detached.screens.detachedScreenId).toBe('b');

    const normal = make();
    expect(normal.screens.detachedScreenId, 'both parameters are required').toBeNull();

    const half = make({ params: { dscreen: '1' } });
    expect(half.screens.detachedScreenId).toBeNull();
  });

  it('says so when the browser blocks the popup, rather than failing silently', () => {
    vi.stubGlobal('open', () => null);
    const { screens, dialogs } = make();
    screens.detach('a');
    expect(dialogs.alert).toContain('blocked');
  });

  it('focuses an existing popout instead of opening a second one', () => {
    let opened = 0;
    const win = { closed: false, focus: vi.fn(), addEventListener: vi.fn() };
    vi.stubGlobal('open', () => ((opened += 1), win));
    const { screens } = make();
    screens.detach('a');
    screens.detach('a');
    expect(opened, 'a second window for one screen is two windows to close').toBe(1);
    expect(win.focus).toHaveBeenCalled();
  });

  it('does nothing for a screen the transport does not have', () => {
    let opened = 0;
    vi.stubGlobal('open', () => ((opened += 1), null));
    const { screens } = make();
    screens.detach('nope');
    expect(opened).toBe(0);
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, as `room-mtx.svelte.test.ts` records. One assertion per independently reactive group:
    a wiring that made the tab reactive and left the lock stale would pass a single test and still
    draw the wrong screen pinned.
  */
  it('re-runs a reader when the tab changes', () => {
    const { screens } = make();
    const seen: (string | null)[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(screens.selectedTab));
      flushSync();
      screens.selectTab('b');
      flushSync();
    });
    stop();
    expect(seen, 'the selectedTab getter is not reactive').toEqual([null, 'b']);
  });

  it('re-runs a reader when a screen is locked', () => {
    const { screens } = make();
    const seen: (string | null)[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(screens.lockedId));
      flushSync();
      screens.toggleLock('a');
      flushSync();
    });
    stop();
    expect(seen, 'the lockedId getter is not reactive').toEqual([null, 'a']);
  });

  it('re-runs a reader when the zoom moves', () => {
    const { screens } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(screens.zoomLevel));
      flushSync();
      screens.zoomIn();
      flushSync();
    });
    stop();
    expect(seen[0]).toBe(INITIAL_ZOOM_LEVEL);
    expect(seen[1], 'the zoomLevel getter is not reactive').not.toBe(INITIAL_ZOOM_LEVEL);
  });

  it('re-runs a reader when the control bar opens', () => {
    const { screens } = make();
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(screens.showZoomCtrl));
      flushSync();
      screens.toggleZoomControls();
      flushSync();
    });
    stop();
    expect(seen, 'the showZoomCtrl getter is not reactive').toEqual([false, true]);
  });
});

describe('SP2-04 — the local-preview opt-in', () => {
  /*
    BEHAVIOURAL, where `screen-pane-contract` is textual. That file reads the source and the bundle;
    this one drives the class, because the two things that can actually go wrong here are a
    non-idempotent setter and a leak across a producer id — and neither is visible in a string match.
  */

  it('starts false for every screen, which is upstream s own default', () => {
    /* `this.localpreview = !1` at byte 1,494,577. A default nobody asserts is a default nobody has. */
    const { screens } = make();
    expect(screens.isLocalPreviewing('a')).toBe(false);
    expect(screens.isLocalPreviewing('b')).toBe(false);
  });

  it('opts in ONE screen, and leaves its siblings alone', () => {
    /*
      Per screen, not per room: a presenter sharing three screens who asks to preview one has not
      asked for the other two, and each costs its own decode. Upstream's flag is per component
      instance, which is per screen.
    */
    const { screens } = make();
    screens.largePreview('a');
    expect(screens.isLocalPreviewing('a')).toBe(true);
    expect(screens.isLocalPreviewing('b')).toBe(false);
  });

  it('is idempotent, as `= !0` is', () => {
    /*
      A second click must not grow the list. Asserted through the public reader plus a third screen,
      because the list itself is private — if a duplicate ever slipped in, `isLocalPreviewing` would
      still answer true and only a leak would show it.
    */
    const { screens } = make();
    screens.largePreview('a');
    screens.largePreview('a');
    screens.largePreview('a');
    expect(screens.isLocalPreviewing('a')).toBe(true);
    screens.screenRemoved('a', null);
    /* One removal clears it — which it cannot do if three copies went in. */
    expect(screens.isLocalPreviewing('a')).toBe(false);
  });

  it('forgets the opt-in with the screen, so a reissued producer id starts closed', () => {
    /*
      THE ONE THIS ROOM NEEDS AND THE REFERENCE DOES NOT. Upstream's flag dies with the component;
      ours is room-lived, and `restartLocalScreens` re-produces the same capture onto a NEW producer
      id and drops the old through `screenRemoved`. Without the cleanup the list grows a dead entry
      per reconnect, and the day the SFU reissues an id the presenter's screen attaches itself.
    */
    const { screens } = make();
    screens.largePreview('a');
    screens.screenRemoved('a', 'b');
    expect(screens.isLocalPreviewing('a')).toBe(false);

    /* And the same id, arriving again, is a NEW screen that has not been asked for. */
    screens.screenRemoved('b', null);
    expect(screens.isLocalPreviewing('a')).toBe(false);
    screens.largePreview('a');
    expect(screens.isLocalPreviewing('a')).toBe(true);
  });

  it('does not disturb the three ids it now sits beside', () => {
    /*
      `screenRemoved` gained a fourth line. The three that were there decide which tab is showing,
      what a presenter forced and what they locked, and a mistake in the new line is most likely to
      be a mistake in one of theirs.
    */
    const { screens } = make();
    screens.selectedTab = 'a';
    screens.largePreview('a');
    screens.screenRemoved('a', 'b');
    expect(screens.selectedTab).toBe('b');
    expect(screens.isLocalPreviewing('a')).toBe(false);
  });
});
