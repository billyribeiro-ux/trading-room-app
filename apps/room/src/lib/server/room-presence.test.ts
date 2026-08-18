import { describe, expect, it } from 'vitest';
import { subscribeToRoom, type RosterUser } from './room-events';

/**
 * `onUserJoin` / `onUserLeave` are PERSON events, not connection events.
 *
 * `app-room.full.js:2134-2155` announces arrivals and departures, and the reference's roster is
 * keyed on `userXrefID` with those two flipping a single entry's `online` flag rather than
 * appending a row (`room-events.ts:236-241`). So one person holding three tabs must announce once
 * on the first tab and once on the last — not three times each way.
 *
 * That is the whole reason `subscribeToRoom` asks whether the person is already here BEFORE adding
 * the listener, and whether they are still here AFTER removing it. These tests pin both edges,
 * because the failure mode is invisible in a single-tab room and obvious in a real one: a presenter
 * gets a toast and a beep every time anybody reloads.
 */

function person(id: number, displayName: string): RosterUser {
  return {
    id,
    userXrefID: String(id),
    displayName,
    email: `${displayName.toLowerCase()}@example.test`,
    avatarUrl: '',
    role: 'user',
    status: 'online'
  } as RosterUser;
}

/** Collects every event published to the room under test. */
function recorder() {
  const seen: Array<{ cmd?: string; userId?: number; nick?: string }> = [];
  const listener = (event: { channel: string; data: unknown }) => {
    if (event.channel !== 'roster') return;
    seen.push(event.data as { cmd?: string; userId?: number; nick?: string });
  };
  return { seen, listener };
}

describe('room presence announcements', () => {
  it('announces a join once, carrying the person and their name', () => {
    const room = 'presence-join';
    const watcher = recorder();
    const stopWatching = subscribeToRoom(room, watcher.listener, person(1, 'Watcher'));
    watcher.seen.length = 0;

    const stop = subscribeToRoom(room, () => {}, person(2, 'Dana'));

    expect(watcher.seen).toEqual([{ cmd: 'onUserJoin', userId: 2, nick: 'Dana' }]);
    stop();
    stopWatching();
  });

  it('announces a leave once when the last connection goes', () => {
    const room = 'presence-leave';
    const watcher = recorder();
    const stopWatching = subscribeToRoom(room, watcher.listener, person(1, 'Watcher'));
    const stop = subscribeToRoom(room, () => {}, person(2, 'Dana'));
    watcher.seen.length = 0;

    stop();

    expect(watcher.seen).toEqual([{ cmd: 'onUserLeave', userId: 2, nick: 'Dana' }]);
    stopWatching();
  });

  /*
    The case the whole design exists for. Three tabs, one person: one join and one leave, not three
    of each. A room where everybody keeps a second tab open would otherwise beep at the presenter on
    every reload.
  */
  it('is silent for a second and third tab of the same person', () => {
    const room = 'presence-tabs';
    const watcher = recorder();
    const stopWatching = subscribeToRoom(room, watcher.listener, person(1, 'Watcher'));
    watcher.seen.length = 0;

    const first = subscribeToRoom(room, () => {}, person(2, 'Dana'));
    const second = subscribeToRoom(room, () => {}, person(2, 'Dana'));
    const third = subscribeToRoom(room, () => {}, person(2, 'Dana'));

    expect(watcher.seen.filter((event) => event.cmd === 'onUserJoin')).toHaveLength(1);

    watcher.seen.length = 0;
    first();
    second();
    expect(watcher.seen.filter((event) => event.cmd === 'onUserLeave')).toHaveLength(0);

    third();
    expect(watcher.seen.filter((event) => event.cmd === 'onUserLeave')).toHaveLength(1);

    stopWatching();
  });

  /*
    `user === null` is an anonymous listener. The reference's payload is `{nick, userXrefID}`, so
    there is nothing to announce and nothing to key the dedupe on.
  */
  it('announces nothing for an anonymous listener', () => {
    const room = 'presence-anon';
    const watcher = recorder();
    const stopWatching = subscribeToRoom(room, watcher.listener, person(1, 'Watcher'));
    watcher.seen.length = 0;

    const stop = subscribeToRoom(room, () => {});
    expect(watcher.seen).toEqual([]);

    stop();
    expect(watcher.seen).toEqual([]);
    stopWatching();
  });

  it('keeps two different people independent', () => {
    const room = 'presence-two';
    const watcher = recorder();
    const stopWatching = subscribeToRoom(room, watcher.listener, person(1, 'Watcher'));
    watcher.seen.length = 0;

    const stopDana = subscribeToRoom(room, () => {}, person(2, 'Dana'));
    const stopRae = subscribeToRoom(room, () => {}, person(3, 'Rae'));

    expect(watcher.seen.map((event) => event.userId)).toEqual([2, 3]);

    watcher.seen.length = 0;
    stopDana();
    expect(watcher.seen).toEqual([{ cmd: 'onUserLeave', userId: 2, nick: 'Dana' }]);

    stopRae();
    stopWatching();
  });
});
