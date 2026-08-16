// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomToasts } from './toasts.svelte';

/*
  The test that ships WITH the extraction, which is the half `room-mtx.svelte.test.ts` records
  having been written a commit too late.

  The value assertions below are worth having, but a plain object would pass every one of them. The
  last describe block is the point of the file: it asserts that reading `toasts.notices` in a
  template actually re-runs when a toast arrives. Wire the rune up wrongly and `svelte-check`,
  `eslint`, `svelte-autofixer` and the whole suite stay green while the room silently stops showing
  notifications.
*/

const notice = (message: string, title?: string) => ({
  kind: 'info' as const,
  message,
  enableHtml: false,
  ...(title ? { title } : {})
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the queue starts empty', () => {
  it('has no notices', () => {
    expect(new RoomToasts().notices).toEqual([]);
  });
});

describe('showing and dismissing', () => {
  it('returns an id and puts the newest first', () => {
    const toasts = new RoomToasts();
    const first = toasts.show(notice('one'));
    const second = toasts.show(notice('two'));

    expect(first).toBe(1);
    expect(second).toBe(2);
    // Newest first: `[{id, ...notice}, ...notices]`, which is the order `ToastHost` renders.
    expect(toasts.notices.map((toast) => toast.message)).toEqual(['two', 'one']);
  });

  it('dismisses by id and leaves the rest', () => {
    const toasts = new RoomToasts();
    const first = toasts.show(notice('one'));
    toasts.show(notice('two'));

    toasts.dismiss(first as number);
    expect(toasts.notices.map((toast) => toast.message)).toEqual(['two']);
  });

  it('expires a toast on its own timer', () => {
    const toasts = new RoomToasts();
    toasts.show(notice('one'), 5_000);

    vi.advanceTimersByTime(4_999);
    expect(toasts.notices, 'cleared early').toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(toasts.notices, 'did not clear on time').toHaveLength(0);
  });

  it('NEVER expires a toast asked for with timeOut 0', () => {
    /*
      toastr's `disableTimeOut: true`, and the media reconnect banners depend on it: a toast that
      says "reconnecting" must not clear itself while the thing is still disconnected. It is
      cleared by the event that makes it false, not by a clock.
    */
    const toasts = new RoomToasts();
    toasts.show(notice('Reconnecting to media...'), 0);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(toasts.notices, 'a sticky toast expired').toHaveLength(1);
  });
});

describe('the duplicate guard', () => {
  it('refuses an identical title and message, and says so with null', () => {
    const toasts = new RoomToasts();
    expect(toasts.show(notice('same', 'Media'))).toBe(1);
    expect(
      toasts.show(notice('same', 'Media')),
      'a duplicate must report that nothing was added, so a caller holding the id does not hold somebody else’s'
    ).toBeNull();
    expect(toasts.notices).toHaveLength(1);
  });

  it('matches on BOTH title and message, not either', () => {
    /*
      The guard is `toast.title === notice.title && toast.message === notice.message`. Two different
      subsystems raising the same sentence under different titles are two different notices - the
      media "Reconnecting..." and a presenter "Reconnecting..." are the pair this protects.
    */
    const toasts = new RoomToasts();
    toasts.show(notice('same', 'Media'));
    expect(toasts.show(notice('same', 'Presenter'))).toBe(2);
    expect(toasts.notices).toHaveLength(2);
  });
});

describe('hover holds a toast open', () => {
  it('stick drops the timer so it never expires', () => {
    const toasts = new RoomToasts();
    const id = toasts.show(notice('one'), 5_000) as number;

    toasts.stick(id);
    vi.advanceTimersByTime(60_000);
    expect(toasts.notices, 'a stuck toast expired anyway').toHaveLength(1);
  });

  it('resume gives it a fresh second, not the remainder of its original wait', () => {
    const toasts = new RoomToasts();
    const id = toasts.show(notice('one'), 5_000) as number;

    toasts.stick(id);
    toasts.resume(id);
    vi.advanceTimersByTime(999);
    expect(toasts.notices, 'cleared before its second was up').toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(toasts.notices).toHaveLength(0);
  });

  it('resuming a toast that is already gone schedules nothing', () => {
    /*
      A pointer can leave an element that the same click already dismissed. Without the guard this
      schedules a timer against an id that no longer exists, and the timer map grows by one entry
      per stray mouseleave for the life of the room.
    */
    const toasts = new RoomToasts();
    const id = toasts.show(notice('one')) as number;
    toasts.dismiss(id);

    expect(() => toasts.resume(id)).not.toThrow();
    vi.advanceTimersByTime(60_000);
    expect(toasts.notices).toHaveLength(0);
  });
});

describe('dismissMatching', () => {
  it('removes every toast whose message contains the fragment', () => {
    const toasts = new RoomToasts();
    toasts.show(notice('Disconnected from Media Server... reconnecting...'));
    toasts.show(notice('Connected to Media Server'));
    toasts.show(notice('something else'));

    toasts.dismissMatching('Disconnected from Media Server');
    expect(toasts.notices.map((toast) => toast.message)).toEqual([
      'something else',
      'Connected to Media Server'
    ]);
  });
});

describe('teardown', () => {
  it('drops every pending timer so none fires after the room is gone', () => {
    const toasts = new RoomToasts();
    toasts.show(notice('one'), 5_000);
    toasts.show(notice('two'), 5_000);

    toasts.destroy();
    // `getTimerCount` is vitest's own view of the fake clock, so this asserts the handles were
    // cleared rather than that the list happens to look right afterwards.
    expect(vi.getTimerCount(), 'a timer outlived destroy()').toBe(0);
  });
});

describe('the browser notification', () => {
  it('does nothing at all where Notification is unavailable', () => {
    // jsdom has no Notification, which is the same state a browser that refused it is in. The
    // guard is `!('Notification' in window)` and this proves it returns rather than throwing.
    const toasts = new RoomToasts();
    expect(() => toasts.notify('title', 'body', null, 'hash')).not.toThrow();
  });
});

describe('it is actually reactive — the part no other gate could prove', () => {
  /*
    THE SHAPE HERE IS LOAD-BEARING, and `room-mtx.svelte.test.ts` records the two drafts that got it
    wrong before anybody noticed:

    - Registering the effect inside `$effect.root` and then mutating and flushing OUTSIDE it records
      nothing, because effects only run inside the root.
    - Moving the assertions INSIDE the root hides failures, because `$effect.root` swallows a thrown
      assertion — that draft passed with a deliberately false expectation in it.

    So every mutation and flush happens INSIDE the root, and every assertion happens OUTSIDE it.
    The negative control is deleting `$state` from `#notices`, which turns both of these red.
  */
  it('re-runs a reader as toasts arrive and leave', () => {
    const toasts = new RoomToasts();
    const seen: number[] = [];
    let id: number | null = null;

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(toasts.notices.length);
      });
      flushSync();
      id = toasts.show(notice('one'));
      flushSync();
      toasts.dismiss(id as number);
      flushSync();
    });
    stop();

    expect(seen, 'the effect did not re-run as the queue changed').toEqual([0, 1, 0]);
  });

  it('does NOT re-run for a duplicate, because a duplicate writes nothing', () => {
    /*
      Separate from the case above, and it is the assertion that would catch the obvious wrong fix
      for the duplicate guard: reassigning the array before checking, or returning early after
      having already written. Either would leave the list correct and re-render the whole toast
      container on every suppressed duplicate — which, for the media reconnect path that fires on a
      backoff schedule, is a redraw every thirty seconds forever.
    */
    const toasts = new RoomToasts();
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(toasts.notices.length);
      });
      flushSync();
      toasts.show(notice('same', 'Media'));
      flushSync();
      toasts.show(notice('same', 'Media'));
      flushSync();
    });
    stop();

    expect(seen, 'a suppressed duplicate still triggered a re-render').toEqual([0, 1]);
  });
});
