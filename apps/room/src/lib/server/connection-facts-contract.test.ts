import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  UNKNOWN_CONNECTION,
  liveConnectionFor,
  publishRosterToRoom,
  subscribeToRoom,
  type RosterUser
} from './room-events';

/**
 * ── THE SOCKET HALF OF `userInfo`, AND THE FIVE CELLS THAT HAD NO PRODUCER ────────────────────
 *
 * `ModalHost.svelte`'s System tab renders `targetUser.ip`, `.userAgent`, `.appVersion`,
 * `.streamServer` and `.serverId`. Measured on 2026-08-31: **none of the five had a producer
 * anywhere in this room.** One consumer each, one declaration each on `ModalTargetUser`, and
 * nothing that ever assigned them — so every one read `n/a` for everybody, always, on every path.
 * Exactly the shape `user-detail.ts` was written to close for `loggedIn` and `email`, five more
 * times over.
 *
 * ## `TODO.md` row 9 prescribed the wrong build, and the bundle says so
 *
 * That row called this *"a round trip to a peer, not a database read … the same shape as
 * `getDebugLog`/`debugLogResp`: a request frame addressed to one member and a reply frame back"*.
 * It is not. Read at verified boundaries:
 *
 * ```js
 * // byte 1,159,275 — the two branches
 * a ? o.socketService.getUserInfo(s, r, a, l, c) : o.getUserInfoDB(s, r)
 *
 * // byte 1,026,474 — what the socket branch actually does
 * this.socket.invoke("invokeCmd", { cmd: "userInfo", uid, rid, socketID, serverID, liveOnly })
 *
 * // byte 996,456 — the `privCmdsIn` case, which is the ANSWER ARRIVING AT THE ASKER
 * case "userInfo": if (!xe.user && !xe.userXref) continue; … xe.privData && (xe.user.privData = …)
 * ```
 *
 * The member's browser is never asked. `socketID` names a live SOCKET and the SERVER holding it
 * answers — which is the only way it could work, because a page cannot learn its own public address
 * and a `User-Agent` a browser reports about itself is a string it chose.
 *
 * So the facts come from the same place here: the request that opened the SSE stream. That is
 * `CLAUDE.md`'s rule — an authority decision is made on the server from data the server owns —
 * applied to telemetry rather than to permission.
 *
 * ## Three of the five are still not built, and that is asserted rather than left to be noticed
 *
 * `appVersion` is upstream's `data.cver`, which only the client knows; `streamServer` and
 * `serverId` are the media plane, blocked on the `STREAM_SERVER_MTX` host that `TODO.md` rows X, AC
 * and R name. The last case below fails if any of them acquires a producer without this file
 * learning about it, because a cell that starts filling from an unreviewed source is the defect
 * this whole document is about, arriving from the other direction.
 */

const ROOM = 'connection-facts-room';

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

const noop = () => {};

describe('what the server observed about a live connection', () => {
  it('answers with the address and agent the stream was opened with', () => {
    const stop = subscribeToRoom(ROOM, noop, person(11, 'Mia'), undefined, {
      address: '203.0.113.11',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
    });

    expect(liveConnectionFor(ROOM, 11)).toEqual({
      address: '203.0.113.11',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
    });

    stop();
  });

  it('answers null once the connection is gone, not the address it used to have', () => {
    /*
      The one thing this must never do. A presenter opening the card is asking where the member IS,
      and reporting the last address as though it were current is worse than reporting nothing —
      it is a fact about the past presented as a fact about the present.
    */
    const stop = subscribeToRoom(ROOM, noop, person(12, 'Ada'), undefined, {
      address: '203.0.113.12',
      userAgent: 'agent-12'
    });
    expect(liveConnectionFor(ROOM, 12), 'the positive control').not.toBeNull();

    stop();

    expect(liveConnectionFor(ROOM, 12)).toBeNull();
  });

  it('answers null for a member of a DIFFERENT room, which is the tenancy rule', () => {
    const stop = subscribeToRoom('some-other-room', noop, person(13, 'Bea'), undefined, {
      address: '203.0.113.13',
      userAgent: 'agent-13'
    });

    expect(liveConnectionFor(ROOM, 13)).toBeNull();
    expect(liveConnectionFor('some-other-room', 13), 'the positive control').not.toBeNull();

    stop();
  });

  it('answers null for somebody not connected to a room that has OTHER listeners', () => {
    /*
      THE LOOP-EXHAUSTED PATH, and it exists because a negative control came back GREEN without it.

      `liveConnectionFor` has two ways of saying no: the room has no listeners at all, and the room
      has listeners but none is this person. The two cases above only ever reached the FIRST —
      `subscribeToRoom`'s cleanup deletes a room's map once it empties, so by the time they ask, the
      room is gone from `subscribers` entirely.

      Mutating the second `return null` to `return UNKNOWN_CONNECTION` therefore changed nothing and
      the suite stayed green. That is a hole in the assertions, not in the code: the loop-exhausted
      path is the one a REAL room takes, where somebody is always connected and the question is about
      somebody who is not.
    */
    const stop = subscribeToRoom(ROOM, noop, person(16, 'Eve'), undefined, {
      address: '203.0.113.16',
      userAgent: 'agent-16'
    });

    expect(
      liveConnectionFor(ROOM, 16),
      'the positive control: the room HAS a listener'
    ).not.toBeNull();
    expect(liveConnectionFor(ROOM, 99)).toBeNull();

    stop();
  });

  it('defaults to unknown rather than to an empty string when a caller omits it', () => {
    /*
      Every test double and every older call site takes this default. `'unknown'` and not `''`
      because the cell renders the value directly: an empty string is an empty table cell that reads
      as a missing row rather than as a fact nobody has.
    */
    const stop = subscribeToRoom(ROOM, noop, person(14, 'Cal'));

    expect(liveConnectionFor(ROOM, 14)).toEqual(UNKNOWN_CONNECTION);
    expect(UNKNOWN_CONNECTION.address).not.toBe('');
    expect(UNKNOWN_CONNECTION.userAgent).not.toBe('');

    stop();
  });

  it('never puts the address on the roster, not even the one a PRESENTER receives', () => {
    /*
      THE REASON THIS IS A FOURTH ARGUMENT AND NOT A ROSTER FIELD.

      `publishRosterToRoom` fans the roster out to everybody in the room. An address carried on
      `RosterUser` would therefore travel to other browsers — the leak `roster-privacy.test.ts`
      exists for, on a field with a wider blast radius than the two it already guards.

      ## The recipient is a PRESENTER, and that is what makes the assertion mean anything

      Written first with a member as the recipient, and its negative control came back GREEN: the
      mutation put the address on `locStr`, and `publishRosterToRoom` REDACTS `locStr` for members.
      So the assertion could not tell "the field is not on the wire" from "the field is on the wire
      and this recipient is not allowed it" — it was passing on somebody else's guarantee.

      A presenter is redacted nothing, so a frame that reaches one carries every field the roster
      has. If the address is absent HERE it is absent from the roster, full stop.
    */
    const frames: string[] = [];
    const presenter = { ...person(15, 'Dee'), isP: true } as RosterUser;
    const stop = subscribeToRoom(
      ROOM,
      (event) => frames.push(JSON.stringify(event)),
      presenter,
      undefined,
      { address: '203.0.113.15', userAgent: 'agent-15' }
    );

    publishRosterToRoom(ROOM);

    expect(frames.length, 'the positive control: a roster frame was published').toBeGreaterThan(0);
    expect(
      frames.join(''),
      'the second positive control: the presenter really does receive the unredacted roster'
    ).toContain('dee@example.test');

    for (const frame of frames) {
      expect(frame, 'an address reached the roster wire').not.toContain('203.0.113.15');
      expect(frame, 'a user agent reached the roster wire').not.toContain('agent-15');
    }

    stop();
  });
});

describe('the three System-tab cells that are still not built', () => {
  it('has no producer for appVersion, streamServer or serverId', () => {
    /*
      Stated as source, because there is nothing to call. Each is declared on `ModalTargetUser` and
      rendered by `ModalHost`, and each is left reading `n/a` for a measured reason recorded at
      `server/user-detail.ts`:

        `appVersion`    only the CLIENT knows its build, and a member whose browser is misbehaving
                        can report any string — which is the case the cell exists for.
        `streamServer`  the media plane, blocked on a `STREAM_SERVER_MTX` host.
        `serverId`      the same blocker.

      This goes red if one of them starts being filled. That is the point: the next engineer to wire
      one has to come here and say where the value came from, rather than the cell quietly beginning
      to show something nobody reviewed.
    */
    const detail = readFileSync(
      fileURLToPath(new URL('./user-detail.ts', import.meta.url)),
      'utf8'
    );

    for (const field of ['appVersion', 'streamServer', 'serverId']) {
      expect(
        detail.includes(`${field}:`),
        `${field} acquired a producer in user-detail.ts; say where the value comes from here`
      ).toBe(false);
    }

    /* The vacuity floor: the two that ARE produced must be in that file, or the loop proves nothing. */
    expect(detail).toContain('ip:');
    expect(detail).toContain('userAgent:');
  });
});
