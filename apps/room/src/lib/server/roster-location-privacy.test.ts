// @vitest-environment node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import {
  publishRosterToRoom,
  setRosterLocation,
  subscribeToRoom,
  type RoomEvent,
  type RosterUser
} from './room-events';

/*
  A MEMBER MUST NEVER RECEIVE ANOTHER MEMBER'S LOCATION — on the wire, not merely on the screen.

  ## The defect, found 2026-08-18 by reading the fan-out path

  `RosterUser.locStr` carries a member's city, e.g. `Waterbury, CT, US`. Its own docblock in
  `room-events.ts` says: *"It sits beside the IP under `privData` in the reference and is
  presenter-only on the way out — `locationVisibleTo` is the gate, and nothing here may publish it
  to a member."*

  The gate existed and worked. It is `roster-gates.ts:locationVisibleTo`, and `RoomSidebar.svelte`
  wraps the city line in `{#if locationVisible(user)}`, so a member's screen showed nothing.

  **The wire was never filtered.** `roomRoster()` returns whole `RosterUser` objects, `publishToRoom`
  hands the identical object to every listener in the room, and FOUR call sites published it: on
  join, on leave, on teardown, and every time a browser's geolocation lookup answered. A member with
  DevTools open read every other member's city out of the SSE payload. The UI was declining to draw
  data it had already been handed.

  That is the shape the root standard names in as many words: *"Every authority decision is made on
  the server from data the server owns — never asserted by the client, ever, for any reason."* A
  render gate is not an authority decision; it is a decoration over one nobody made.

  ## Why this file EXECUTES rather than reads source

  A source-text assertion cannot answer the only question that matters — what bytes reach a member.
  So this subscribes a real presenter and a real member to a real room through the real hub, sets a
  real location, publishes, and inspects what each listener was actually handed.

  ## Fails closed

  An anonymous listener has no `RosterUser` and is therefore not a presenter, so it is redacted. The
  authority is the subscriber's own `isP`, which `sess/[room]/events/+server.ts` sets from the room's
  membership row server-side — the note at that assignment records deliberately choosing it as the
  SINGLE source rather than falling back to the session role, precisely because two ways of
  computing one fact is the shape of the 2026-08-07 privilege escalation.
*/

/*
  Built against the real `RosterUser`, not a hand-written subset — a first draft carried a `nick`
  field the type does not have, and `svelte-check` named it. The annotated return type is what makes
  that a compile error rather than a fixture that quietly drifts from the shape the hub publishes.
*/
const rosterUser = (id: number, isP: boolean): RosterUser => ({
  id,
  userXrefID: `xref-${id}`,
  displayName: `User ${id}`,
  email: `user${id}@example.test`,
  avatarUrl: '',
  role: isP ? 'staff' : 'member',
  status: 'active',
  createdAt: new Date(0),
  emailHash: `hash-${id}`,
  isP,
  isFT: false,
  hasAdminChat: false,
  locStr: ''
});

const ROOM = 'privacy-probe-room';
const teardowns: (() => void)[] = [];

/** Subscribes and records the frames that listener receives. */
const listen = (user: RosterUser | null) => {
  const received: RoomEvent[] = [];
  teardowns.push(subscribeToRoom(ROOM, (event) => received.push(event), user));
  return received;
};

/** The `users` array out of the most recent `getRoster` frame this listener saw. */
const lastRoster = (received: RoomEvent[]): RosterUser[] => {
  for (let index = received.length - 1; index >= 0; index -= 1) {
    const frame = received[index];
    const data = frame.data as { cmd?: string; users?: RosterUser[] };
    if (frame.channel === 'roster' && data?.cmd === 'getRoster' && data.users) return data.users;
  }
  throw new Error('no getRoster frame was received at all');
};

afterEach(() => {
  while (teardowns.length) teardowns.pop()?.();
});

describe('roster location is redacted per recipient, at the hub', () => {
  it('a MEMBER receives no location for anybody, including a presenter', () => {
    const presenter = rosterUser(1, true);
    const member = rosterUser(2, false);
    const presenterFrames = listen(presenter);
    const memberFrames = listen(member);

    // Both people report a city, exactly as `POST /api/roster/location` does.
    expect(setRosterLocation(ROOM, presenter.id, 'Waterbury, CT, US')).toBe(true);
    expect(setRosterLocation(ROOM, member.id, 'Lisbon, PT')).toBe(true);
    publishRosterToRoom(ROOM);

    const seenByMember = lastRoster(memberFrames);
    expect(seenByMember, 'the member must still see the whole roster').toHaveLength(2);
    expect(
      seenByMember.map((entry) => entry.locStr),
      'a member must receive no location at all - not even their own neighbours’'
    ).toEqual(['', '']);

    // And the roster is otherwise intact: redaction must not cost a row or a name.
    expect(seenByMember.map((entry) => entry.displayName).sort()).toEqual(['User 1', 'User 2']);

    const seenByPresenter = lastRoster(presenterFrames);
    expect(
      seenByPresenter.map((entry) => entry.locStr).sort(),
      'a presenter is the one role that may see them'
    ).toEqual(['Lisbon, PT', 'Waterbury, CT, US']);
  });

  it('an ANONYMOUS listener is redacted, because absent authority is not presenter', () => {
    const presenter = rosterUser(3, true);
    listen(presenter);
    const anonymousFrames = listen(null);

    expect(setRosterLocation(ROOM, presenter.id, 'Waterbury, CT, US')).toBe(true);
    publishRosterToRoom(ROOM);

    expect(
      lastRoster(anonymousFrames).map((entry) => entry.locStr),
      'no RosterUser means no presenter claim, so it fails closed'
    ).toEqual(['']);
  });

  it('does not hand the presenter and the member the SAME array', () => {
    /*
      Structural, and it is what makes the redaction real rather than incidental. If both recipients
      were handed one object, a later change on either side would be a change on both — and the
      cheapest wrong fix for this defect is to mutate the shared roster in place.
    */
    const presenterFrames = listen(rosterUser(4, true));
    const memberFrames = listen(rosterUser(5, false));
    expect(setRosterLocation(ROOM, 4, 'Waterbury, CT, US')).toBe(true);
    publishRosterToRoom(ROOM);

    expect(lastRoster(presenterFrames)).not.toBe(lastRoster(memberFrames));
  });

  it('survives a listener that throws, like every other fan-out in the hub', () => {
    // One dead connection must not silence the room; `publishToRoom` carries the same contract.
    const presenter = rosterUser(6, true);
    teardowns.push(
      subscribeToRoom(
        ROOM,
        () => {
          throw new Error('this connection is gone');
        },
        presenter
      )
    );
    const memberFrames = listen(rosterUser(7, false));

    expect(() => publishRosterToRoom(ROOM)).not.toThrow();
    expect(lastRoster(memberFrames), 'the surviving listener still got the roster').toHaveLength(2);
  });
});

describe('no route publishes the raw roster around the hub', () => {
  /*
    The executable half above proves the hub redacts. This half proves nothing BYPASSES it — a new
    endpoint calling `publishToRoom(..., { cmd: 'getRoster', users: roomRoster(room) })` would
    reintroduce the leak with every assertion above still green, because those only inspect what the
    hub itself sends.
  */
  const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
  const serverModules = tracked.filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
  );

  it('only `room-events.ts` itself constructs a getRoster frame', () => {
    const offenders: string[] = [];
    for (const file of serverModules) {
      if (file === 'src/lib/server/room-events.ts') continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        // `getRosterCount` is a number and carries nothing private; it is deliberately allowed.
        if (line.includes("cmd: 'getRoster'") && !line.includes('getRosterCount')) {
          offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 90)}`);
        }
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nBuild the frame in room-events.ts, where the subscriber map knows who each recipient is. A getRoster frame assembled anywhere else cannot redact locStr per recipient, which is the defect of 2026-08-18: the roster went out identical to everyone and only the browser declined to draw the city.`
    ).toEqual([]);
  });

  it('and `roomRoster` is not exported into a route that could publish it raw', () => {
    /*
      Weaker than the check above on purpose — `roomRoster(room).length` is a legitimate and common
      call for the count. This asserts only that no route pairs the full roster with a publish.
    */
    const offenders: string[] = [];
    for (const file of serverModules) {
      if (!file.startsWith('src/routes/')) continue;
      const text = readFileSync(file, 'utf8');
      if (/publishToRoom\([^)]*roomRoster\(room\)(?!\.length)/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
