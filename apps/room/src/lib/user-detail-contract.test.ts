// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { UserDetail } from './room/user-detail';
import { RoomUserDetail } from './room/user-detail';
import type { ModalTargetUser } from './types';

/*
  THE USER MODAL'S LAST LOGIN AND EMAIL CELLS, AND THE ONE ROUND TRIP THAT FILLS THEM.

  ## What was wrong, measured

  `ModalHost.svelte` has rendered both cells since it was written. `targetUser.loggedIn` had NO
  producer anywhere in `apps/room`: one consumer, one optional field on `ModalTargetUser`, and
  nothing that ever assigned it — so the cell read `n/a` for everybody on every path, permanently.
  `targetUser.email` had exactly one producer, `targetFor`, which reads a live ROSTER entry, so it
  filled for somebody standing in the room and read `n/a` the moment the same modal was opened from
  a chat message instead.

  ## Why that is the reference's design and not a shortfall of it

  Every `getUserInfo` call site in the bundle passes a null `socketID` except the roster's, and a
  null `socketID` takes the DB branch:

  ```js
  a ? (P("getUserInfo socketID was NOT null"), o.socketService.getUserInfo(s, r, a, l, c))
    : (P("getUserInfoDB socketID was null"), o.getUserInfoDB(s, r))
  ```

  — byte 1,159,275. A chat message (byte 1,352,046), the followed-users modal (byte 2,356,520) and
  Random User (byte 2,516,476) all ask the server; the roster (byte 2,032,939) is the one caller that
  passes a live `o.socketID`. So the offline lookup is how that modal is filled everywhere except
  the roster, and this room had no such lookup at all.

  ## What this file asserts, and what it deliberately does not

  It drives `RoomUserDetail` directly with a recording fetch. It does NOT stand up a server: the
  authority half — presenters only, room-scoped — is asserted where it is decided, in
  `authorization-contract.test.ts`'s route sweep and by the source assertions at the end of this
  file. Two behaviours are the point here:

  1. **Asked once.** A card opened, closed and reopened must not ask twice.
  2. **The modal survives a refusal.** Both cells go back to reading `n/a`, which is what they read
     before any of this existed.
*/

const target = (id: number): ModalTargetUser => ({
  id,
  nick: `User ${id}`,
  emailHash: `hash-${id}`,
  pic: '',
  status: 'offline'
});

/** Lets a test resolve the lookup at the moment it chooses, which is when a modal is already open. */
function deferredDetail() {
  const asked: number[] = [];
  /*
    Typed as `UserDetail` rather than as a literal shape. The literal was a second declaration of the
    same contract and it went stale the day the server started answering `ip` and `userAgent`:
    `RoomUserDetail` took the wider type and this fixture could no longer produce one.
  */
  let settle: (value: UserDetail | null) => void = () => {};
  const detail = new RoomUserDetail({
    fetch: (userId) => {
      asked.push(userId);
      return new Promise((resolve) => {
        settle = resolve;
      });
    }
  });
  return { asked, detail, resolve: (value: Parameters<typeof settle>[0]) => settle(value) };
}

describe('the offline user lookup', () => {
  it('adds the two fields the roster cannot supply, once they arrive', async () => {
    const { detail, resolve } = deferredDetail();
    detail.hydrate(7);

    /*
      BEFORE the answer, `decorate` returns the target UNCHANGED — and identity is asserted, not just
      equality. `ModalHost` reads `targetUser` about a hundred times per render, so a spread copy per
      read would be a hundred allocations for the common case of having nothing to add.
    */
    const before = target(7);
    expect(detail.decorate(before)).toBe(before);

    resolve({
      email: 'member@example.test',
      loggedIn: '2026-08-29T23:40:00.000Z',
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
    });
    await Promise.resolve();

    expect(detail.decorate(target(7))).toMatchObject({
      id: 7,
      email: 'member@example.test',
      loggedIn: '2026-08-29T23:40:00.000Z',
      /*
        The two System-tab cells, which had no producer at all until 2026-08-31 — see
        `#lib/server/user-detail.ts`. They ride the same answer as the two above because they are the
        same question with the same authority, not because it was convenient: `decorate` spreads
        whatever the server said, so a cell filled here is a cell the presenter is entitled to.
      */
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)'
    });
  });

  it('leaves everybody else alone', async () => {
    const { detail, resolve } = deferredDetail();
    detail.hydrate(7);
    resolve({ email: 'member@example.test', loggedIn: null, ip: null, userAgent: null });
    await Promise.resolve();

    const other = target(8);
    expect(detail.decorate(other), 'a lookup for one member must not decorate another').toBe(other);
  });

  it('asks once per member, however many times the card is opened', async () => {
    const { asked, detail, resolve } = deferredDetail();
    detail.hydrate(7);
    detail.hydrate(7);
    resolve({ email: 'member@example.test', loggedIn: null, ip: null, userAgent: null });
    await Promise.resolve();
    detail.hydrate(7);

    expect(asked).toEqual([7]);
  });

  it('does not retry a refusal, and the card still renders', async () => {
    const { asked, detail, resolve } = deferredDetail();
    detail.hydrate(7);
    /*
      Null is the server saying "this room has nothing to say about that account" — the deny-by-
      default answer for somebody with no standing here. Asking again would be the same question.
    */
    resolve(null);
    await Promise.resolve();
    detail.hydrate(7);

    expect(asked).toEqual([7]);
    const unchanged = target(7);
    expect(detail.decorate(unchanged)).toBe(unchanged);
  });

  it('never asks about the placeholder target', () => {
    /*
      `get target()` answers `{ id: 0, … }` when a modal is open over nobody. Asking about it would
      be a guaranteed refusal on every such render, and `id` is what the request is keyed on.
    */
    const { asked, detail } = deferredDetail();
    detail.hydrate(0);
    detail.hydrate(-1);
    expect(asked).toEqual([]);
  });
});

/*
  The port holds ANSWERS, and `create-room` renders on the server. A module-level instance would be
  one cache shared by every request a worker handles — `CLAUDE.md`'s "no shared server-side module
  state", and on this data the multi-tenant failure this repository exists under.

  Asserted at the SHAPE rather than by a behavioural test, because the behaviour that makes it safe
  today is "no modal is open at first render", which is a fact about rendering that the next feature
  can change without anybody thinking about this file.
*/
describe('one lookup cache per room, never one per worker', () => {
  const port = readFileSync(
    fileURLToPath(new URL('./room/user-detail-port.ts', import.meta.url)),
    'utf8'
  );

  it('exports a factory rather than an instance', () => {
    expect(port).toContain('export const createRoomUserDetail = (): RoomUserDetail =>');
    expect(
      port,
      'a module-level `new RoomUserDetail()` is one cache for every request this worker handles'
    ).not.toMatch(/^export const \w+ = new RoomUserDetail/m);
  });

  it('is called per room, at the composition root', () => {
    const root = readFileSync(
      fileURLToPath(new URL('./room/create-room.svelte.ts', import.meta.url)),
      'utf8'
    );
    /* Called, not merely imported: `createRoomUserDetail` without `()` would hand over a function. */
    expect(root).toContain('userDetail: createRoomUserDetail(),');
  });
});

/*
  The authority half. Source assertions, because what matters is which guard the ROUTE calls, and a
  behavioural test here would have to stub the guard it is checking for.
*/
describe('the lookup is presenter-only and never takes a room from the caller', () => {
  const route = readFileSync(
    fileURLToPath(new URL('../routes/user-detail.remote.ts', import.meta.url)),
    'utf8'
  );
  const server = readFileSync(
    fileURLToPath(new URL('./server/user-detail.ts', import.meta.url)),
    'utf8'
  );

  it('takes the room from the session through presenterRoom()', () => {
    expect(route).toContain('presenterRoom()');
    /*
      The reference sends `rid` from `globals.sessData.roomID` — a client-held value naming which
      room to ask about. A room in the schema here would be a presenter of room A reading room B,
      which is the 2026-08-07 rule. The ONLY argument is which account.
    */
    expect(route).toContain('z.strictObject({ userId: z.number().int().positive() })');
    expect(route, 'a room may never be an argument').not.toMatch(/room\s*:\s*z\./);
  });

  it('refuses a target with no standing in the room before reading any account row', () => {
    /*
      Order matters and is asserted as order: the scope check runs FIRST, so a refusal cannot be
      distinguished from a missing account and the route cannot be used to test which user ids
      exist. Byte positions rather than a regex over both, because "appears somewhere" would pass
      with the two swapped.
    */
    const scope = server.indexOf('if (!isKnownInRoom(room, userId)) return null;');
    const read = server.indexOf('.from(users)');
    expect(scope).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(-1);
    expect(scope).toBeLessThan(read);
  });

  it('selects only the two fields the modal renders', () => {
    /*
      Not `select()` over the whole row. `users` carries `passwordHash` and `authSource`, and a bare
      select would put both on a wire to a browser — the shape `roster-privacy.test.ts` records as
      having actually happened with `locStr` and `email` on the roster frame.
    */
    expect(server).toContain('.select({ email: users.email, lastLoginAt: users.lastLoginAt })');
    expect(server).not.toMatch(/db\s*\n?\s*\.select\(\)\s*\n?\s*\.from\(users\)/);
  });
});
