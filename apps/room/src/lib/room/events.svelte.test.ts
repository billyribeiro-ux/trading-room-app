// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatChatMutedTill } from '#lib/message-formatters.js';
import { RoomChatMute } from './chat-mute.svelte';
import { RoomPrivateCommands } from './private-commands.svelte';
import { RoomEventStream } from './events.svelte';

/*
  `invalidateAll` is MOCKED, because it is the observable the hidden-tab branch turns on.

  Every other assertion in this file watches a receiver the class was handed. This one cannot: the
  question is whether the class REFETCHES, and the refetch is a SvelteKit call with no return value
  and no collaborator. Counting it is the only way to tell "deferred" from "delivered", which is
  precisely the distinction the mention bit exists to make.
*/
const invalidateAll = vi.fn();
vi.mock('$app/navigation', () => ({
  invalidate: vi.fn(async () => {}),
  invalidateAll: (...args: unknown[]) => invalidateAll(...args)
}));

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

const make = (mediaTransport: Record<string, unknown> = {}) => {
  const missed: true[] = [];
  const tabs: string[] = [];
  const played: string[] = [];
  /*
    Each entry records whether the CHANNEL WAS ALREADY CLOSED at the moment the receiver ran, which
    is the only way to assert the reference's ordering — `e.disconnect(), emit("forceReload")` at
    byte 995901 — from the outside. A boolean sampled afterwards would be true either way.
  */
  const reloadAsked: boolean[] = [];
  const kicked: { message: string; closedAlready: boolean }[] = [];
  const revoked: string[] = [];
  /*
    A REAL `RoomChatMute`, not a stub. The sentence a muted member sees is assembled inside it, so a
    stub here would assert the wiring and let the wording drift — and the wording is the captured
    part. Its `invalidateAll` is the module's own; what is recorded is what reached the screen.
  */
  const chatMuted: string[] = [];
  const chatNotices: string[] = [];
  const audioReconnects: boolean[] = [];
  const chatMute = new RoomChatMute({
    commands: {
      muteChat: () => Promise.resolve(null),
      muteChatIndefinitely: () => Promise.resolve(null),
      unmuteChat: () => Promise.resolve(null)
    },
    alert: (message) => chatMuted.push(message),
    notice: (message) => chatNotices.push(message),
    reload: () => Promise.resolve(),
    announceThenSend: (_alert, send) => void send()
  });
  const stream = new RoomEventStream<{ id: number }>({
    prefs: { doNotDisturbOn: false } as never,
    toasts: { show: () => null } as never,
    media: {} as never,
    // The broadcast receivers the video/YouTube/mp3 commands call, recorded so the dispatch can
    // be asserted to reach the right one.
    broadcasts: { videoStarted: (url: string) => played.push(url) } as never,
    mediaTransport: mediaTransport as never,
    mtx: {} as never,
    roster: { countArrived: () => {}, rosterArrived: () => {} },
    privateChat: { ingest: () => {} },
    userActions: { followedUsers: {} },
    session: () => ({ room: { shortCode: 'abc' }, user: { id: 1 }, sessData: null }),
    isPresenter: () => false,
    appHasFocus: () => true,
    restartMediaSession: () => null,
    showTab: (tab) => tabs.push(tab),
    focusSessionNote: () => {},
    // Recorded rather than stubbed: the MESSAGE is what a revoked member reads, so a stub would
    // assert the routing and let the reason drift.
    alertThenReload: (message: string) => revoked.push(message),
    chatMissedWhileHidden: () => missed.push(true),
    /*
      A REAL `RoomPrivateCommands`, not a stub. The addressing test is now ONE gate inside it, and a
      stub would assert that the router recognised the channel while leaving the gate — the thing
      standing between one member and the whole room — untested.
    */
    privateCommands: new RoomPrivateCommands({
      viewerId: () => 1,
      chatMute,
      forceReloadRequested: () => reloadAsked.push(FakeEventSource.last?.closed === true),
      kicked: (message: string) =>
        kicked.push({ message, closedAlready: FakeEventSource.last?.closed === true }),
      reconnectAudio: () => (audioReconnects.push(true), Promise.resolve())
    })
    /*
      Records the message AND whether the stream was already closed when it arrived. That second
      field is the whole point: the reference emits BEFORE disconnecting on a kick, the exact
      opposite of `forceReload` above, so a test that only checked the message would pass against
      either ordering.
    */
  });
  return {
    stream,
    missed,
    tabs,
    played,
    reloadAsked,
    kicked,
    revoked,
    chatMuted,
    chatNotices,
    audioReconnects
  };
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

/**
 * A stream whose viewer has `visibilityChangeEnabled` on and a HIDDEN tab.
 *
 * Built once for the three assertions that turn on that condition. Three copies of a fourteen-line
 * construction is how one of them ends up with `appHasFocus: () => true` and passes for the wrong
 * reason — which is the failure mode this whole file exists to catch elsewhere.
 */
const hiddenTabStream = (missed: true[]) =>
  new RoomEventStream<{ id: number }>({
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
    // The tab is HIDDEN, which is the whole condition these three share.
    appHasFocus: () => false,
    restartMediaSession: () => null,
    showTab: () => {},
    focusSessionNote: () => {},
    alertThenReload: () => {},
    chatMissedWhileHidden: () => missed.push(true),
    privateCommands: new RoomPrivateCommands({
      viewerId: () => 1,
      chatMute: new RoomChatMute({
        commands: {
          muteChat: () => Promise.resolve(null),
          muteChatIndefinitely: () => Promise.resolve(null),
          unmuteChat: () => Promise.resolve(null)
        },
        alert: () => {},
        notice: () => {},
        reload: () => Promise.resolve(),
        announceThenSend: () => {}
      }),
      forceReloadRequested: () => {},
      kicked: () => {},
      reconnectAudio: () => Promise.resolve()
    })
  });

describe('the two receivers reach the page', () => {
  it('a chat frame on a hidden tab calls the receiver instead of refetching', () => {
    const missed: true[] = [];
    const stream = hiddenTabStream(missed);
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'chat', data: { senderId: 99 } })
    });
    // The flag is the page's; the stream can only ask for it to be set.
    expect(missed).toEqual([true]);
    // And it did NOT refetch, which is the whole point of the preference.
    expect(invalidateAll).not.toHaveBeenCalled();
  });

  it('a MENTION pierces the hidden-tab gate, because the server said it was one', () => {
    /*
      THE DIVERGENCE CLOSED ON 2026-08-16, asserted at runtime.

      Upstream keeps mentions alive on this branch —
      `visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)` —
      and this room could not, because its mention popup is an `$effect` reading `data.messages`
      and the early return is exactly what stops that changing. So the refetch IS the delivery, and
      counting it is how "deferred" is told from "delivered".

      The bit comes from the SERVER: the frame carries no message text, so the client cannot decide
      this for itself. `chat-mention-fanout.test.ts` proves the other end of that.
    */
    invalidateAll.mockClear();
    const missed: true[] = [];
    const stream = hiddenTabStream(missed);
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'chat', data: { senderId: 99 }, isMention: true })
    });

    // Still recorded as missed — coming back should still catch up on everything else.
    expect(missed).toEqual([true]);
    // But the refetch happened, so the popup's effect sees the message now rather than later.
    expect(invalidateAll).toHaveBeenCalledTimes(1);
  });

  it('a frame with no bit behaves as it did before, rather than announcing everything', () => {
    // The field is optional on the wire. A publisher that has not learned to send it must leave the
    // branch as it was — `!== true` rather than a falsy test is what makes that so.
    invalidateAll.mockClear();
    const missed: true[] = [];
    const stream = hiddenTabStream(missed);
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'chat', data: { senderId: 99 } })
    });
    expect(invalidateAll).not.toHaveBeenCalled();
  });

  /*
    `forceReload` ASKS, and it disconnects before it asks.

    Until 2026-08-23 this handler was a bare `location.reload()`: a presenter pressed the button and
    the member's page went, mid-sentence, with no warning. The reference does neither of those
    things — byte 995901 is `case "forceReload": e.disconnect(), e.appEventBus.emit("forceReload")`
    and its subscriber at byte 2597102 is `bootbox.alert("You need to reload this page to continue",
    () => window.location.reload())`. Both offsets were read in the bundle, not searched for.

    Nothing in this file can assert the DIALOG — that is the page's, and `create-room` wires it. What
    is asserted here is the half the stream owns: it closes, then it asks, and it asks only the
    member the frame names.
  */
  it('a forceReload addressed to this member closes the channel and ASKS', () => {
    const { stream, reloadAsked } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'privCmds', data: { cmd: 'forceReload', targetUserId: 1 } })
    });
    expect(reloadAsked, 'the receiver ran exactly once').toHaveLength(1);
    expect(
      reloadAsked[0],
      'and the channel was ALREADY closed when it did — disconnect precedes the ask'
    ).toBe(true);
  });

  it('and a forceReload aimed at somebody else is ignored entirely', () => {
    /*
      The addressing guard. `privCmds` is per-member upstream (`/privCmdsIn/{uid}-{id}/`) while this
      room's stream is per-ROOM, so the `targetUserId` test is the only thing standing between one
      presenter reloading one member and reloading everybody at once.
    */
    const { stream, reloadAsked } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'privCmds', data: { cmd: 'forceReload', targetUserId: 99 } })
    });
    expect(reloadAsked, 'not this member').toEqual([]);
    expect(FakeEventSource.last?.closed, 'and their channel stays up').toBe(false);
  });

  it('a muteChat frame tells the addressed member, in the captured wording, and leaves them connected', () => {
    /*
      The defect this closes: the mute was ENFORCED and never ANNOUNCED. `refuseIfChatMuted` has
      refused sends the whole time and the composer only learns why on the NEXT page load, so a
      member muted mid-conversation typed into a live-looking box and watched nothing happen.

      Upstream raises a DIALOG here and a toast for the opposite (bundle byte 1430423), which is why
      this asserts the dialog receiver rather than the toast list.

      The SENTENCE is asserted whole, and it is assembled from two captured fragments rather than
      composed: `Chat Disabled` is the block AlertChatArea renders, and the time is
      `formatChatMutedTill`, the reference's `EEE @ h:mm a`. Nothing here is a guessed sentence —
      upstream's own `msg` is built by a server that is not in the capture.

      A fixed instant, never `new Date()`: a relative one would make the expected string depend on
      the day this runs. 2026-08-24T15:45:00Z is a Monday.
    */
    const { stream, chatMuted } = make();
    stream.subscribe();
    const till = new Date('2026-08-24T15:45:00.000Z');
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'privCmds',
        data: { cmd: 'muteChat', targetUserId: 1, mutedTill: till.toISOString() }
      })
    });
    expect(chatMuted).toEqual([`Chat Disabled till ${formatChatMutedTill(till)}`]);
    expect(
      FakeEventSource.last?.closed,
      'a mute is not a kick — the member stays in the room and keeps receiving'
    ).toBe(false);
  });

  it('and a muteChat aimed at somebody else raises nothing', () => {
    // The same addressing guard the forceReload pair above tests, on the frame that would otherwise
    // put a "Chat Disabled" dialog in front of every member in the room at once.
    const { stream, chatMuted } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'privCmds',
        data: { cmd: 'muteChat', targetUserId: 99, mutedTill: '2026-08-24T15:45:00.000Z' }
      })
    });
    expect(chatMuted).toEqual([]);
  });

  it('a muteChat with no usable instant still says the member is muted', () => {
    /*
      The frame carries an ISO string, so a malformed one is possible in a way a Date is not. Falling
      back to the bare captured `Chat Disabled` is deliberate: the alternative is either an
      "Invalid Date" in front of a member or silence about a mute that is already in force.
    */
    const { stream, chatMuted } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'privCmds',
        data: { cmd: 'muteChat', targetUserId: 1, mutedTill: 'not-a-date' }
      })
    });
    expect(chatMuted).toEqual(['Chat Disabled']);
  });

  it('a remoteRestartAudio frame reconnects the addressed member, silently', () => {
    /*
      `case "remoteRestartAudio": e.appEventBus.emit("remoteRestartAudio")` at byte 995973, whose
      subscriber at 1119299 is `() => { this.reconnectAudio() }` — one line, no toast and no dialog.

      SILENCE IS ASSERTED, not just the call. This receiver is the last of the "reports success,
      sends nothing" family to be wired, and the temptation on wiring one is to add a confirmation
      the capture does not have. The member is not the one who pressed anything.
    */
    const { stream, audioReconnects, chatMuted, chatNotices } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'privCmds',
        data: { cmd: 'remoteRestartAudio', targetUserId: 1 }
      })
    });
    expect(audioReconnects).toEqual([true]);
    expect(chatMuted, 'no dialog — the capture raises none here').toEqual([]);
    expect(chatNotices, 'and no toast either').toEqual([]);
    expect(
      FakeEventSource.last?.closed,
      'and the stream stays up — this is not a kick or a reload'
    ).toBe(false);
  });

  it('and a remoteRestartAudio aimed at somebody else reconnects nothing', () => {
    /*
      The one gate, exercised on the newest branch. A broadcast rebuild would have every member in
      the room re-consume every producer at once — a thundering herd at the SFU, from a button meant
      for one person.
    */
    const { stream, audioReconnects } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'privCmds',
        data: { cmd: 'remoteRestartAudio', targetUserId: 99 }
      })
    });
    expect(audioReconnects).toEqual([]);
  });

  it("a revoked session reaches the receiver with the SERVER's reason", () => {
    /*
      `NEW-TODO.md` Part 1, the client half. Both revenue leaks end the same way: the server closes
      the connection and says why. The MESSAGE is the server's — three different things end a
      connection and they are not interchangeable, so composing one here would tell some members the
      wrong thing to do about it.
    */
    const { stream, revoked } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'cmds',
        data: {
          cmd: 'sessionRevoked',
          reason: 'entitlement-lapsed',
          message: 'Your access to this room has ended.'
        }
      })
    });
    expect(revoked).toEqual(['Your access to this room has ended.']);
  });

  it('acts on NOTHING ELSE in a batch that also revokes', () => {
    /*
      The reason `sessionRevoked` is the FIRST branch in the chain rather than one more beside the
      others. Anything acted on after it would be acted on for a member the server has just decided
      is not entitled to it — which is the leak this whole feature closes, reopened by ordering.

      Asserted by sending a frame that is BOTH: a real command name and the revocation. A chain that
      tested `playVideoForAll` first would play the video into a revoked session.
    */
    const { stream, revoked, played, tabs } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({
        channel: 'cmds',
        data: {
          cmd: 'sessionRevoked',
          message: 'signed in elsewhere',
          url: 'https://example.test/should-not-play.mp4'
        }
      })
    });
    expect(revoked).toEqual(['signed in elsewhere']);
    expect(played).toEqual([]);
    expect(tabs).toEqual([]);
  });

  it('a hard reset drops remote media and states the captured sentence', () => {
    /*
      `TODO.md` row 10 recorded this as a missing RECEIVER for two sessions. It was not — `alertThen`
      has existed since `forceReload` was built. What was missing was the SENDER: the presenter's
      button wrote a preference and reloaded their OWN page, so the reset read as working from the
      only seat that could see it.
    */
    const dropped: true[] = [];
    const { stream, revoked } = make({ dropRemoteMedia: () => dropped.push(true) });
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'cmds', data: { cmd: 'hardReset' } })
    });
    expect(revoked).toEqual([
      'The room is being reset by an administrator. Click OK to continue...'
    ]);
    /*
      The MEDIA DROP is asserted beside the message because upstream disconnects before it alerts. A
      reset that leaves every consumer attached while a modal waits for a click holds the SFU open for
      exactly as long as nobody is looking at the screen.
    */
    expect(dropped).toEqual([true]);
  });

  it('an opened session states its own captured sentence, and a different one', () => {
    /*
      Two frames, two sentences, and they are NOT interchangeable: this one is addressed to people
      who are not in the room yet — a member sitting on the "This room is closed." refusal, for whom
      the reload is what re-runs the door check that now says yes.
    */
    const { stream, revoked } = make();
    stream.subscribe();
    FakeEventSource.last?.fire('message', {
      data: JSON.stringify({ channel: 'cmds', data: { cmd: 'openSession' } })
    });
    expect(revoked).toEqual(['The session is now open, click here to reload the page and enter']);
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
