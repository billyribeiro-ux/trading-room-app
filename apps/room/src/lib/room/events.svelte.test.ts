// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RoomEventStream } from './events.svelte';

/*
  The realtime channel, EXECUTED.

  Eight contract files read this class as source and between them they pin every one of the six
  channels against the reference bundle. What none of them can do is OPEN the stream, and the two
  properties that only exist once it is open are the two this file holds:

    1. the connection flags are REACTIVE — the sidebar's indicator and the "Conected" overlay both
       render straight off them, so a `$state` demoted to a plain field during a refactor leaves a
       room that shows "connected" forever after the first drop;

    2. the flash fires on a RE-connect and never on the first open. `EventSource` re-fires `open` on
       every retry, so the only thing distinguishing "we recovered" from "we started" is the pair of
       flags — and announcing a recovery that never happened is the defect the citation in the
       handler was written for.

  `room-mtx.svelte.test.ts`'s shape, for the reason that file records: mutations and `flushSync`
  INSIDE `$effect.root`, the expectation OUTSIDE it, because a thrown assertion inside the root is
  swallowed and reports as a pass.
*/

/**
 * A stand-in `EventSource` that hands back its listeners so a test can fire them.
 *
 * Deliberately not a mock of the whole API: jsdom has no `EventSource` at all, so this supplies
 * exactly the three events the class registers and nothing else. A stub that accepted any event
 * would let a rename of `open` to `opened` pass unnoticed.
 */
class FakeEventSource {
  static last: FakeEventSource | null = null;

  readonly url: string;
  readonly listeners = new Map<string, (event: unknown) => void>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }

  addEventListener(type: string, handler: (event: unknown) => void) {
    this.listeners.set(type, handler);
  }

  close() {
    this.closed = true;
  }

  fire(type: string, event: unknown = {}) {
    const handler = this.listeners.get(type);
    if (!handler) throw new Error(`the class never registered a '${type}' listener`);
    handler(event);
  }
}

const originalEventSource = globalThis.EventSource;

beforeEach(() => {
  FakeEventSource.last = null;
  (globalThis as { EventSource?: unknown }).EventSource = FakeEventSource;
});

afterEach(() => {
  (globalThis as { EventSource?: unknown }).EventSource = originalEventSource;
});

const make = () => {
  const missed: true[] = [];
  const tabs: string[] = [];
  const played: string[] = [];
  const stream = new RoomEventStream<{ id: number }>({
    prefs: { doNotDisturbOn: false } as never,
    toasts: { show: () => null } as never,
    media: {} as never,
    // The broadcast receivers the video/YouTube/mp3 commands call, recorded so the dispatch can
    // be asserted to reach the right one.
    broadcasts: { videoStarted: (url: string) => played.push(url) } as never,
    mediaTransport: {} as never,
    mtx: {} as never,
    roster: { countArrived: () => {}, rosterArrived: () => {} },
    privateChat: { ingest: () => {} },
    userActions: { followedUsers: {} },
    session: () => ({ room: { shortCode: 'abc' }, user: { id: 1 }, sessData: null }),
    isPresenter: () => false,
    appHasFocus: () => true,
    restartMediaSession: () => null,
    showTab: (tab) => tabs.push(tab),
    chatMissedWhileHidden: () => missed.push(true)
  });
  return { stream, missed, tabs, played };
};

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

describe('the connection flags carry their runes', () => {
  it('the sidebar indicator re-runs its readers on open and on error', () => {
    const { stream } = make();
    stream.subscribe();
    const source = FakeEventSource.last;
    const seen = observe(
      () => stream.connected,
      () => {
        source?.fire('open');
        flushSync();
        source?.fire('error');
      }
    );
    // false at subscribe, true on open, false on the drop. A plain field would give [false].
    expect(seen).toEqual([false, true, false]);
  });

  it('the reconnect overlay re-runs its readers when the flash is raised', () => {
    const { stream } = make();
    stream.subscribe();
    const source = FakeEventSource.last;
    /*
      A SEPARATE group from `connected`, and separately asserted for the reason `room-mtx` records:
      the indicator and the overlay are two different elements, so a wiring that kept one live while
      leaving the other static would show a room that knows it reconnected and never says so. One
      assertion could not tell those two apart.
    */
    const seen = observe(
      () => stream.reconnectedFlash,
      () => {
        // First open, then a drop, then the RE-connect that raises it.
        source?.fire('open');
        flushSync();
        source?.fire('error');
        flushSync();
        source?.fire('open');
      }
    );
    expect(seen.at(0)).toBe(false);
    expect(seen.at(-1)).toBe(true);
  });
});

describe('the flash is a RE-connection, never the first one', () => {
  it('stays down on the first open', () => {
    const { stream } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('open');
    // Announcing a recovery on a fresh page is the defect the handler's citation was written for.
    expect(stream.reconnectedFlash).toBe(false);
    expect(stream.connected).toBe(true);
  });

  it('rises on the open that follows a drop', () => {
    const { stream } = make();
    stream.subscribe();
    const source = FakeEventSource.last;
    source?.fire('open');
    source?.fire('error');
    expect(stream.connected).toBe(false);
    source?.fire('open');
    expect(stream.reconnectedFlash).toBe(true);
  });
});

describe("the stream is this room's own channel, and it closes", () => {
  it('subscribes to the session shortCode rather than a constant', () => {
    // A client cannot put itself in another room by editing the URL - the server keys the
    // subscription off the session too - but sending a constant would break every room but one.
    const { stream } = make();
    stream.subscribe();
    expect(FakeEventSource.last?.url).toBe('/sess/abc/events');
  });

  it('hands back a teardown that actually closes the source', () => {
    const { stream } = make();
    const stop = stream.subscribe();
    expect(FakeEventSource.last?.closed).toBe(false);
    stop();
    expect(FakeEventSource.last?.closed).toBe(true);
  });
});

describe('the two receivers reach the page', () => {
  it('a chat frame on a hidden tab calls the receiver instead of refetching', () => {
    const missed: true[] = [];
    const stream = new RoomEventStream<{ id: number }>({
      prefs: { doNotDisturbOn: false, chatSoundOn: false, visibilityChangeEnabled: true } as never,
      toasts: { show: () => null } as never,
      media: {} as never,
      broadcasts: {} as never,
      mediaTransport: {} as never,
      mtx: {} as never,
      roster: { countArrived: () => {}, rosterArrived: () => {} },
      privateChat: { ingest: () => {} },
      userActions: { followedUsers: {} },
      session: () => ({ room: { shortCode: 'abc' }, user: { id: 1 }, sessData: null }),
      isPresenter: () => false,
      // The tab is HIDDEN, which is the whole condition under test.
      appHasFocus: () => false,
      restartMediaSession: () => null,
      showTab: () => {},
      chatMissedWhileHidden: () => missed.push(true)
    });
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'chat', data: { senderId: 99 } })
    });
    // The flag is the page's; the stream can only ask for it to be set.
    expect(missed).toEqual([true]);
  });

  it('a room-wide video moves a non-presenter through the tab receiver', () => {
    const { stream, tabs, played } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'cmds',
        data: { cmd: 'playVideoForAll', url: 'https://example.test/v.mp4' }
      })
    });
    expect(played).toEqual(['https://example.test/v.mp4']);
    expect(tabs).toEqual(['videoplayer']);
  });
});
