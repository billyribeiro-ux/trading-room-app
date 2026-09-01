import { beforeEach, describe, expect, it } from 'vitest';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { chatArchives, messages, users } from '#lib/server/db/schema.js';
import { chatArchiveById, listChatArchivesFor } from '#lib/server/chat-archive.js';
import { loadArchivedChatLog, loadChatPage } from '#lib/server/chat-log.js';

/**
 * THE ARCHIVED READ, AGAINST A REAL DATABASE.
 *
 * `chat-archive-log-contract.test.ts` reads the source and pins the SHAPE — that the live builder
 * still excludes archived rows, that the archived one matches on an id, that the room is in the
 * predicate. Every one of those is an assertion about text, and text is not a query: the argument
 * that "`=` never matches NULL, so `archivedChatRows` cannot return a live message" is exactly the
 * kind of reasoning that is right in principle and wrong in a dialect.
 *
 * So this runs both readers over one table holding all four combinations — live and archived, this
 * room and another — and looks at what actually comes back.
 */

const ROOM = 'archive-read-room';
const OTHER = 'archive-read-other';

let archiveId = 0;
let otherArchiveId = 0;

beforeEach(() => {
  ensureDatabase();
  db.delete(messages).run();
  db.delete(chatArchives).run();

  const author = db
    .insert(users)
    .values({
      displayName: 'Archive Probe',
      email: 'chat-archive-read@example.test',
      role: 'staff',
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .onConflictDoUpdate({ target: users.email, set: { displayName: 'Archive Probe' } })
    .returning()
    .get();

  const stamp = new Date(Date.UTC(2026, 6, 1, 12, 0));
  const archive = (room: string, count: number) =>
    db
      .insert(chatArchives)
      .values({
        roomShortCode: room,
        channel: 'main',
        olderThan: stamp,
        archivedAt: stamp,
        messageCount: count,
        archivedByUserId: author.id
      })
      .returning()
      .get();

  archiveId = archive(ROOM, 2).id;
  otherArchiveId = archive(OTHER, 1).id;

  const post = (room: string, body: string, at: number, intoArchive: number | null) =>
    db
      .insert(messages)
      .values({
        roomShortCode: room,
        room: 'main',
        senderId: author.id,
        body,
        createdAt: new Date(Date.UTC(2026, 5, 1, 9, at)),
        archiveId: intoArchive
      })
      .run();

  post(ROOM, 'archived first', 1, archiveId);
  post(ROOM, 'archived second', 2, archiveId);
  post(ROOM, 'still live', 3, null);
  post(OTHER, 'another room, archived', 4, otherArchiveId);
});

describe('the two readers are disjoint, executed rather than argued', () => {
  it('the LIVE page never returns an archived message', () => {
    const live = loadChatPage(ROOM, 'main');
    expect(live.map((row) => row.body)).toEqual(['still live']);
  });

  it('the ARCHIVED read never returns a live one', () => {
    /*
      The half that was reasoned about rather than run: a live row's `archiveId` is NULL, and the
      claim is that `=` cannot match it. Here is the query saying so.
    */
    const log = loadArchivedChatLog(ROOM, archiveId);
    expect(log.map((row) => row.body)).toEqual(['archived first', 'archived second']);
  });

  it('and it is OLDEST-first, which is the opposite of the live page', () => {
    /*
      A page is taken newest-first so the LIMIT keeps the newest, then reversed. An archive is read
      from its beginning, so the limit has to keep the OLDEST — a reversal here would silently show
      the END of a long archive while claiming to show its start.
    */
    const log = loadArchivedChatLog(ROOM, archiveId);
    expect(log[0].createdAt.getTime()).toBeLessThan(log[1].createdAt.getTime());
  });
});

describe('an archive belongs to exactly one room', () => {
  it('another room s archive reads as EMPTY, not as its messages', () => {
    /*
      The 2026-08-07 rule, executed. `otherArchiveId` is a real id; naming it from this room returns
      nothing, because the room is in the predicate rather than checked after the fact.
    */
    expect(loadArchivedChatLog(ROOM, otherArchiveId)).toEqual([]);
    expect(loadArchivedChatLog(OTHER, otherArchiveId)).toHaveLength(1);
  });

  it('and the lookup that turns into a 404 refuses it the same way it refuses a missing one', () => {
    /*
      "Not this room's" and "no longer there" must be the SAME answer, or the refusal is an oracle
      over which archive ids exist elsewhere — the rule `chat-channels.ts` states for badge channels.
    */
    expect(chatArchiveById(ROOM, otherArchiveId)).toBeNull();
    expect(chatArchiveById(ROOM, 9_999_999)).toBeNull();
    expect(chatArchiveById(ROOM, archiveId)?.channel).toBe('main');
  });

  it('carries the sender s name and never their address', () => {
    const [first] = loadArchivedChatLog(ROOM, archiveId);
    expect(first.senderName).toBe('Archive Probe');
    expect(JSON.stringify(first)).not.toContain('@example.test');
  });

  it('names WHO swept it, in both reads, and never their address', () => {
    /*
      The capture's `By:` line (`vxe` @ bundle byte 2,301,700), against a real join rather than
      against the source text that spells it. `archived_by_user_id` was `notNull` from the day the
      table was added and nothing selected it until 2026-09-01, so the browser could not answer the
      question the schema comment says the column exists for.

      The address is asserted absent for the same reason it is on the sender above: the join reaches
      a row that also holds an email, and a projection widened by one field is how one leaves.
    */
    const [listed] = listChatArchivesFor(ROOM);
    expect(listed.archivedBy).toBe('Archive Probe');
    expect(chatArchiveById(ROOM, archiveId)?.archivedBy).toBe('Archive Probe');
    expect(JSON.stringify(listed)).not.toContain('@example.test');
  });

  it('lists this room s archives and no other room s', () => {
    /* The join must not have turned the room predicate into a filter over the wrong table. */
    expect(listChatArchivesFor(ROOM).map((row) => row.id)).toEqual([archiveId]);
    expect(listChatArchivesFor(OTHER).map((row) => row.id)).toEqual([otherArchiveId]);
  });
});
