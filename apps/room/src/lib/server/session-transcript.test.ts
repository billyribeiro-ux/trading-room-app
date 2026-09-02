import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sessionTranscripts } from '#lib/server/db/schema.js';

import {
  TRANSCRIPT_PAGE_SIZE,
  recordTranscriptLine,
  transcriptPageFor
} from './session-transcript';

/**
 * The transcript STORE, driven against the real database.
 *
 * Every value asserted here is transcribed from the reference's own page — the component at bundle
 * byte 2,607,394 and its request at 1,151,135 — rather than chosen. What this file exists to catch
 * is the two ways a paged, dated, per-room read goes wrong in production and in nothing else:
 * a boundary row counted twice or dropped, and a room seeing another room's speech.
 */

const ROOM = 'transcript-test-room';
const OTHER_ROOM = 'transcript-test-other';
const ROOMS = [ROOM, OTHER_ROOM];

/** 2026-09-02T00:00:00Z. A fixed instant, because a transcript is read one DAY at a time. */
const DAY_START = Date.UTC(2026, 8, 2, 0, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

const pageOf = (page = 0, roomShortCode = ROOM) =>
  transcriptPageFor({
    roomShortCode,
    dayStart: new Date(DAY_START),
    dayEnd: new Date(DAY_START + DAY_MS),
    page
  });

function clear(): void {
  db.delete(sessionTranscripts).where(inArray(sessionTranscripts.roomShortCode, ROOMS)).run();
}

beforeAll(() => ensureDatabase());
beforeEach(clear);
afterAll(clear);

describe('recordTranscriptLine', () => {
  it('stores the line and hands back the id the page tracks by', () => {
    const id = recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'good morning',
      spokenAt: new Date(DAY_START + 60_000)
    });

    expect(id).toBeGreaterThan(0);

    const [row] = db.select().from(sessionTranscripts).where(eq(sessionTranscripts.id, id)).all();

    expect(row.speaker).toBe('Ada');
    expect(row.text).toBe('good morning');
    expect(row.roomShortCode).toBe(ROOM);
    expect(row.spokenAt.getTime()).toBe(DAY_START + 60_000);
  });
});

describe('transcriptPageFor', () => {
  /*
    NEWEST FIRST, and this is not a preference.

    `loadTranscripts(page, append)` builds `[...response.transcripts, ...this.transcripts]` — it
    PREPENDS the arriving page. That only reads correctly if the server hands back descending time;
    ascending would put the conversation in reverse on the second page.
  */
  it('returns the day newest first', () => {
    for (const [minute, text] of [
      [1, 'first'],
      [2, 'second'],
      [3, 'third']
    ] as const) {
      recordTranscriptLine({
        roomShortCode: ROOM,
        speaker: 'Ada',
        text,
        spokenAt: new Date(DAY_START + minute * 60_000)
      });
    }

    expect(pageOf().rows.map((row) => row.text)).toEqual(['third', 'second', 'first']);
  });

  /*
    THE ROOM SCOPE. Every other room's speech is in the same table, and a transcript is the most
    complete record of a paid room there is — an unscoped read is one owner's members reading
    another owner's calls. The room is in the WHERE rather than filtered afterwards, so the index
    does the work and a forgotten filter cannot leak.
  */
  it('never returns another room’s lines', () => {
    recordTranscriptLine({
      roomShortCode: OTHER_ROOM,
      speaker: 'Someone else',
      text: 'a different room',
      spokenAt: new Date(DAY_START + 60_000)
    });
    recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'ours',
      spokenAt: new Date(DAY_START + 120_000)
    });

    const page = pageOf();
    expect(page.rows.map((row) => row.text)).toEqual(['ours']);
    expect(page.totalCount).toBe(1);
  });

  /*
    THE DAY IS HALF-OPEN, `[dayStart, dayEnd)`.

    The reference's page steps a day at a time — `Load Previous Day` / `Load Next Day` — so the
    boundary instant belongs to exactly one of two adjacent days. A closed interval would show
    midnight on both; an open one would show it on neither.
  */
  it('includes the first instant of the day and excludes the first instant of the next', () => {
    recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'midnight exactly',
      spokenAt: new Date(DAY_START)
    });
    recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'one millisecond before',
      spokenAt: new Date(DAY_START - 1)
    });
    recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'next midnight exactly',
      spokenAt: new Date(DAY_START + DAY_MS)
    });

    expect(pageOf().rows.map((row) => row.text)).toEqual(['midnight exactly']);
  });

  /*
    THE PAGINATION BLOCK the reference's footer renders verbatim:
      "Showing {filtered.length} of {totalCount} entries (Page {currentPage + 1} of {totalPages})"
    with `Load Prev` disabled on `!hasPrevious` and the bottom of the list driven by `hasMore`.
  */
  it('reports the pagination the reference’s footer reads', () => {
    const lines = TRANSCRIPT_PAGE_SIZE + 5;
    for (let index = 0; index < lines; index += 1) {
      recordTranscriptLine({
        roomShortCode: ROOM,
        speaker: 'Ada',
        text: `line ${index}`,
        spokenAt: new Date(DAY_START + index * 1_000)
      });
    }

    const first = pageOf(0);
    expect(first.rows).toHaveLength(TRANSCRIPT_PAGE_SIZE);
    expect(first.totalCount).toBe(lines);
    expect(first.totalPages).toBe(2);
    expect(first.hasMore).toBe(true);
    expect(first.hasPrevious).toBe(false);

    const second = pageOf(1);
    expect(second.rows).toHaveLength(5);
    expect(second.hasMore).toBe(false);
    expect(second.hasPrevious).toBe(true);

    /*
      NO ROW APPEARS ON BOTH PAGES. Ordering on `spokenAt` alone would leave rows sharing an
      instant in an order SQLite does not promise, and offset paging over an unstable order both
      repeats and drops rows. The tiebreak on `id` is what makes the two pages a partition, and this
      is the assertion that fails without it.
    */
    const ids = new Set([...first.rows, ...second.rows].map((row) => row.id));
    expect(ids.size).toBe(lines);
  });

  /*
    A page past the end is an EMPTY page, not a refusal: `Load More` is disabled only on `loading`,
    so it can be clicked on the last page and must not put an error banner over a fine transcript.
  */
  it('answers a page past the end with no rows and no error', () => {
    recordTranscriptLine({
      roomShortCode: ROOM,
      speaker: 'Ada',
      text: 'only line',
      spokenAt: new Date(DAY_START + 60_000)
    });

    const page = pageOf(9);
    expect(page.rows).toEqual([]);
    expect(page.totalCount).toBe(1);
    expect(page.hasMore).toBe(false);
  });

  it('reports an empty day rather than failing', () => {
    const page = pageOf();
    expect(page.rows).toEqual([]);
    expect(page.totalCount).toBe(0);
    expect(page.totalPages).toBe(0);
    expect(page.hasMore).toBe(false);
    expect(page.hasPrevious).toBe(false);
  });
});
