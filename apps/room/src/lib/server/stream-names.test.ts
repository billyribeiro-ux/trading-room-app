import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { streamIngestNames, users } from '#lib/server/db/schema.js';
import { mtxStreamFromPath, mtxStreamsFromPathList } from '#lib/mtx-reconcile.js';
import { recordStreamIngestName, streamNamesForRoom } from './stream-names';

/**
 * Labelling a stream tab with a person's name rather than the sanitiser's output.
 *
 * `ingestPathFor` in the controller collapses everything outside `[a-zA-Z0-9_-]` to `_`, so the
 * media server only ever reports `…__Dana_Vero`. That is one-way — "Dana Vero", "Dana_Vero" and
 * "Dana/Vero" all reach it — which is exactly why the name is looked up rather than un-mangled.
 */
const ROOM = '3625';
const OTHER_ROOM = '9100';
const EMAILS = ['stream-names-dana@tradingroom.invalid', 'stream-names-blank@tradingroom.invalid'];

const NOW = new Date('2036-07-27T11:00:00.000Z');

let danaId = 0;
let blankId = 0;

function cleanup(): void {
  db.delete(streamIngestNames)
    .where(inArray(streamIngestNames.roomShortCode, [ROOM, OTHER_ROOM]))
    .run();
}

beforeAll(() => {
  ensureDatabase();
  danaId = db
    .insert(users)
    .values({
      displayName: 'Dana Vero',
      email: EMAILS[0],
      role: 'staff',
      status: 'offline',
      createdAt: NOW
    })
    .onConflictDoUpdate({ target: users.email, set: { displayName: 'Dana Vero' } })
    .returning({ id: users.id })
    .get().id;
  blankId = db
    .insert(users)
    .values({
      displayName: '   ',
      email: EMAILS[1],
      role: 'staff',
      status: 'offline',
      createdAt: NOW
    })
    .onConflictDoUpdate({ target: users.email, set: { displayName: '   ' } })
    .returning({ id: users.id })
    .get().id;
});

beforeEach(cleanup);
afterAll(() => {
  cleanup();
  db.delete(users).where(inArray(users.email, EMAILS)).run();
});

describe('recording who minted a path', () => {
  it('records the pairing and reads the CURRENT display name back', () => {
    recordStreamIngestName({
      ingestPath: `room__${ROOM}__Dana_Vero`,
      now: NOW,
      room: ROOM,
      userId: danaId
    });

    expect(streamNamesForRoom(ROOM).get(`room__${ROOM}__Dana_Vero`) ?? null).toBe('Dana Vero');
  });

  it('follows a rename, because the name is joined and not copied', () => {
    recordStreamIngestName({
      ingestPath: `room__${ROOM}__Dana_Vero`,
      now: NOW,
      room: ROOM,
      userId: danaId
    });
    db.update(users).set({ displayName: 'Dana Vero-Smith' }).where(eq(users.id, danaId)).run();

    expect(streamNamesForRoom(ROOM).get(`room__${ROOM}__Dana_Vero`) ?? null).toBe(
      'Dana Vero-Smith'
    );

    db.update(users).set({ displayName: 'Dana Vero' }).where(eq(users.id, danaId)).run();
  });

  it('is an upsert, so pressing New Link does not create a second row', () => {
    const path = `room__${ROOM}__Dana_Vero`;
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: danaId });
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: blankId });
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: danaId });

    const rows = db
      .select()
      .from(streamIngestNames)
      .where(eq(streamIngestNames.roomShortCode, ROOM))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(danaId);
  });

  it('never leaks a name across rooms, because the room is IN the key', () => {
    /*
      The same path string recorded under two rooms is two rows. A lookup that ignored the room
      would be a cross-tenant read, which is the failure mode this whole codebase is shaped around.
    */
    const path = `room__${ROOM}__Dana_Vero`;
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: danaId });

    expect(streamNamesForRoom(OTHER_ROOM).get(path) ?? null).toBeNull();
    expect(streamNamesForRoom(OTHER_ROOM).size).toBe(0);
    expect(streamNamesForRoom(ROOM).get(path)).toBe('Dana Vero');
  });

  it('returns nothing for a path nobody minted', () => {
    expect(streamNamesForRoom(ROOM).get(`room__${ROOM}__Never_Seen`) ?? null).toBeNull();
  });
});

describe('what the stream tab ends up labelled', () => {
  const path = `room__${ROOM}__Dana_Vero`;

  it('shows the real name once the pairing is known', () => {
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: danaId });

    const stream = mtxStreamFromPath(path, ROOM, streamNamesForRoom(ROOM));
    expect(stream?.mediaValue.name).toBe('Dana Vero');
    // The identity is still the path — a label must never change what keys the `{#each}`.
    expect(stream?._id).toBe(path);
    expect(stream?.producerID).toBe('Dana_Vero');
  });

  it('falls back to the sanitised segment when there is no record', () => {
    /*
      Degraded, never wrong. This is exactly what the tab showed before any of this existed, and it
      is what a presenter whose key was minted by an older build still gets.
    */
    const stream = mtxStreamFromPath(path, ROOM, streamNamesForRoom(ROOM));
    expect(stream?.mediaValue.name).toBe('Dana_Vero');
  });

  it('falls back rather than rendering a blank tab for a whitespace-only name', () => {
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: blankId });

    const stream = mtxStreamFromPath(path, ROOM, streamNamesForRoom(ROOM));
    expect(stream?.mediaValue.name).toBe('Dana_Vero');
  });

  it('never invents a name by turning underscores back into spaces', () => {
    /*
      The whole reason for the lookup. Somebody genuinely called `Dana_Vero` must not be renamed to
      "Dana Vero" by a display-time guess, and with no record there is nothing to say which it was.
    */
    const stream = mtxStreamFromPath(path, ROOM, new Map());
    expect(stream?.mediaValue.name).toBe('Dana_Vero');
    expect(stream?.mediaValue.name).not.toBe('Dana Vero');
  });

  it('labels a whole list, leaving unknown paths on their segment', () => {
    recordStreamIngestName({ ingestPath: path, now: NOW, room: ROOM, userId: danaId });

    const streams = mtxStreamsFromPathList(
      {
        items: [
          { name: path, available: true },
          { name: `room__${ROOM}__Someone_Else`, available: true },
          // Another room's path, and a path nothing is publishing to.
          { name: `room__${OTHER_ROOM}__Dana_Vero`, available: true },
          { name: `room__${ROOM}__Idle_One`, available: false }
        ]
      },
      ROOM,
      streamNamesForRoom(ROOM)
    );

    expect(streams.map((stream) => stream.mediaValue.name)).toEqual(['Dana Vero', 'Someone_Else']);
  });

  it('works with no map at all, which is what every existing caller passes', () => {
    expect(mtxStreamFromPath(path, ROOM)?.mediaValue.name).toBe('Dana_Vero');
  });
});
