import { beforeEach, describe, expect, it } from 'vitest';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { chatArchives, messages, users } from '#lib/server/db/schema.js';
import { CHAT_DOWNLOAD_LIMIT, chatLogForDownload } from '#lib/server/chat-log.js';

/**
 * `downloadLog("chat")`'s READ, against a real database.
 *
 * `chat-log-download.test.ts` covers the FILE; this covers the query behind it. The split is the
 * same one `chat-archive-read.test.ts` argues for its own subject: *"every one of those is an
 * assertion about text, and text is not a query."*
 *
 * Four things can go wrong here and none is visible in the source:
 *
 *   * a range boundary off by a factor or a sign, so "last 24 hours" returns everything or nothing;
 *   * the archived-row exclusion dropped, so a presenter who swept the log downloads it anyway;
 *   * the channel predicate dropped, so one column's download carries the other's messages;
 *   * the ROOM predicate dropped, which is the 2026-08-07 escalation in a new place.
 */

const ROOM = 'download-room';
const OTHER = 'download-other-room';

/** The instant every range below is measured from, so nothing here depends on when it runs. */
const NOW = new Date(Date.UTC(2026, 8, 1, 12, 0, 0));
const HOURS = (n: number) => new Date(NOW.getTime() - n * 60 * 60 * 1000);

let authorId = 0;
let archiveId = 0;

beforeEach(() => {
  ensureDatabase();
  db.delete(messages).run();
  db.delete(chatArchives).run();

  authorId = db
    .insert(users)
    .values({
      displayName: 'Download Probe',
      email: 'chat-log-download@example.test',
      role: 'staff',
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .onConflictDoUpdate({ target: users.email, set: { displayName: 'Download Probe' } })
    .returning()
    .get().id;

  archiveId = db
    .insert(chatArchives)
    .values({
      roomShortCode: ROOM,
      channel: 'main',
      olderThan: NOW,
      archivedAt: NOW,
      messageCount: 1,
      archivedByUserId: authorId
    })
    .returning()
    .get().id;
});

const post = (
  body: string,
  at: Date,
  options: { room?: string; channel?: string; archived?: boolean } = {}
) =>
  db
    .insert(messages)
    .values({
      roomShortCode: options.room ?? ROOM,
      room: options.channel ?? 'main',
      senderId: authorId,
      body,
      createdAt: at,
      archiveId: options.archived ? archiveId : null
    })
    .run();

const bodies = (range: 'all' | '24hrs' | '7days') =>
  chatLogForDownload(ROOM, 'main', range, NOW).map((row) => row.body);

describe('the three ranges are the three the dialog offers', () => {
  beforeEach(() => {
    post('one hour ago', HOURS(1));
    post('two days ago', HOURS(48));
    post('thirty days ago', HOURS(24 * 30));
  });

  it('`all` is the entire live history', () => {
    expect(bodies('all')).toEqual(['thirty days ago', 'two days ago', 'one hour ago']);
  });

  it('`24hrs` is one day, not one hour and not one week', () => {
    /*
      The boundary is the one a factor error moves. A `24 * 1000` instead of `24 * 60 * 60 * 1000`
      returns nothing, and a `7 * DAY` here returns the two-day-old message — both of which look
      like a working feature to anyone not counting.
    */
    expect(bodies('24hrs')).toEqual(['one hour ago']);
  });

  it('`7days` is a week', () => {
    expect(bodies('7days')).toEqual(['two days ago', 'one hour ago']);
  });

  it('and every range is OLDEST-first, because a transcript is read from its beginning', () => {
    const rows = chatLogForDownload(ROOM, 'main', 'all', NOW);
    expect(rows[0].createdAt.getTime()).toBeLessThan(rows[rows.length - 1].createdAt.getTime());
  });

  it('a message exactly ON the boundary is INCLUDED, which `gte` decides', () => {
    /*
      `gte` and not `gt`. A message posted at exactly the cutoff is inside "the last 24 hours" by
      every ordinary reading, and the difference shows up only on a clock that lands on it.
    */
    post('exactly 24 hours ago', HOURS(24));
    expect(bodies('24hrs')).toContain('exactly 24 hours ago');
  });
});

describe('the download is scoped exactly as every other live read is', () => {
  it('excludes ARCHIVED rows, so a swept log does not come back in a file', () => {
    /*
      `chatRows` states the exclusion once and this goes through it. Forgetting it here would be the
      inert-feature failure that module names — the sweep works, the archive fills, and the messages
      keep leaving the room in a download.
    */
    post('live', HOURS(1));
    post('swept', HOURS(2), { archived: true });
    expect(bodies('all')).toEqual(['live']);
  });

  it('is one CHANNEL, so the extra column cannot download the main one', () => {
    post('main message', HOURS(1));
    post('extra message', HOURS(1), { channel: 'extra' });
    expect(bodies('all')).toEqual(['main message']);
    expect(chatLogForDownload(ROOM, 'extra', 'all', NOW).map((row) => row.body)).toEqual([
      'extra message'
    ]);
  });

  it('is one ROOM, which is the escalation this repository has already had once', () => {
    post('ours', HOURS(1));
    post('another room', HOURS(1), { room: OTHER });
    expect(bodies('all')).toEqual(['ours']);
  });
});

describe('the read is BOUNDED, unlike the reference s', () => {
  it('caps at CHAT_DOWNLOAD_LIMIT rather than serialising whatever exists', () => {
    /*
      Upstream sends `limit: "all"` and writes whatever comes back. "Entire chat history" is exactly
      the read whose size nobody controls, which is the shape `CLAUDE.md` names.

      Seeded a little over the cap rather than to some large round number: what matters is that the
      limit is applied at all, and the cost of proving it should not be a slow test.
    */
    expect(CHAT_DOWNLOAD_LIMIT).toBe(20_000);
    const rows = Array.from({ length: 5 }, (_, index) => index);
    for (const index of rows) post(`m${index}`, HOURS(index + 1));

    const capped = chatLogForDownload(ROOM, 'main', 'all', NOW);
    expect(capped.length).toBeLessThanOrEqual(CHAT_DOWNLOAD_LIMIT);
    expect(capped).toHaveLength(5);
  });
});
