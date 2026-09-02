import { and, count, desc, eq, gte, lt } from 'drizzle-orm';

import { db } from './db';
import { sessionTranscripts } from './db/schema';

/**
 * The transcript STORE — one room's closed-caption lines, written as they are spoken and read a day
 * at a time.
 *
 * The split is the one `scheduled-alerts.ts` draws: this owns the rows and the bounds, and knows
 * nothing about who is allowed to ask. Authority lives in `session-transcript.remote.ts`, on the
 * server, decided from the session — never from an argument.
 *
 * Every value the reference's page reads is transcribed from bundle byte **2,606,700** onward; the
 * table's own docblock in `db/schema.ts` records where each came from.
 */

/**
 * Rows to a page.
 *
 * `this.pageSize = 300` on `SessionTranscriptComponent`, transcribed rather than chosen. It is also
 * what makes the read bounded: one room, one day, at most 300 rows, over the
 * `(room_short_code, spoken_at)` index.
 */
export const TRANSCRIPT_PAGE_SIZE = 300;

/**
 * The longest line one caption may be.
 *
 * A ceiling on a per-utterance write from a presenter's browser, for the same reason every other
 * body in this room carries one. The Web Speech API returns a sentence, so this is far above any
 * real line; what it refuses is a crafted request, not speech.
 */
export const MAX_TRANSCRIPT_LINE = 2_000;

export interface TranscriptRow {
  id: number;
  speaker: string;
  text: string;
  spokenAt: Date;
}

export interface TranscriptPage {
  rows: TranscriptRow[];
  page: number;
  hasMore: boolean;
  hasPrevious: boolean;
  totalCount: number;
  totalPages: number;
}

/**
 * Record one FINAL caption line.
 *
 * `speaker` is the SERVER's name for the caller. It is a parameter rather than a lookup because the
 * caller's session is the remote function's to read, and this module deliberately does not reach for
 * request state — but it is never a field the browser sends. That is the 2026-08-07 privilege
 * escalation's rule applied to content: a client naming who spoke is a client forging a transcript.
 */
export function recordTranscriptLine(entry: {
  roomShortCode: string;
  speaker: string;
  text: string;
  spokenAt: Date;
}): number {
  const [row] = db
    .insert(sessionTranscripts)
    .values({
      roomShortCode: entry.roomShortCode,
      speaker: entry.speaker,
      text: entry.text,
      spokenAt: entry.spokenAt
    })
    .returning({ id: sessionTranscripts.id })
    .all();

  return row.id;
}

/**
 * One room's transcript for ONE DAY, newest first, paged.
 *
 * ## The day is a HALF-OPEN interval, and the caller gives both ends
 *
 * The reference sends a single `startDate` — `new Date(Date.UTC(y, m, d, 13, 0, 0)).toISOString()`,
 * 13:00 UTC on the selected day — and its server decides what "that day" means from it. We do not
 * have that server, so the boundary is decided HERE and stated: `[dayStart, dayEnd)`. A half-open
 * interval is the only shape that cannot double-count or drop the boundary row, and the caller
 * computes both ends from the same date so the two can never disagree.
 *
 * ## Two queries, and why that is not a query in a loop
 *
 * The count and the page are separate statements because the page's own footer renders
 * *"Showing N of TOTAL entries (Page P of PAGES)"* — the reference reads both from one response's
 * `pagination` block. Both are the same bounded index range; neither grows with the room's history.
 *
 * ## Newest first
 *
 * `loadTranscripts(page, append)` prepends when appending (`[...response.transcripts, ...this.transcripts]`),
 * which only reads correctly if the server hands back descending time. Transcribed from the client's
 * behaviour rather than guessed, because getting it backwards puts a conversation in reverse.
 */
export function transcriptPageFor(query: {
  roomShortCode: string;
  dayStart: Date;
  dayEnd: Date;
  page: number;
}): TranscriptPage {
  const within = and(
    eq(sessionTranscripts.roomShortCode, query.roomShortCode),
    gte(sessionTranscripts.spokenAt, query.dayStart),
    lt(sessionTranscripts.spokenAt, query.dayEnd)
  );

  /*
    An explicit `SELECT count(*)` rather than drizzle's `$count` helper: on this version `$count`
    returned a value that arrived as `NaN`, which the pagination test caught on its first run. A
    count nobody can read is worse than no count, because the page renders "Showing N of NaN".
  */
  const [counted] = db.select({ total: count() }).from(sessionTranscripts).where(within).all();
  const totalCount = counted?.total ?? 0;
  const totalPages = Math.ceil(totalCount / TRANSCRIPT_PAGE_SIZE);

  /*
    A page past the end is answered with an EMPTY page rather than a refusal, which is what the
    reference's own controls need: `Load More` is disabled only on `loading`, so it can be clicked
    on the last page, and it expects a response it can render as "no more" rather than an error
    banner over a transcript that is fine.
  */
  const rows = db
    .select({
      id: sessionTranscripts.id,
      speaker: sessionTranscripts.speaker,
      text: sessionTranscripts.text,
      spokenAt: sessionTranscripts.spokenAt
    })
    .from(sessionTranscripts)
    .where(within)
    .orderBy(desc(sessionTranscripts.spokenAt), desc(sessionTranscripts.id))
    .limit(TRANSCRIPT_PAGE_SIZE)
    .offset(query.page * TRANSCRIPT_PAGE_SIZE)
    .all();

  return {
    rows,
    page: query.page,
    hasMore: (query.page + 1) * TRANSCRIPT_PAGE_SIZE < totalCount,
    hasPrevious: query.page > 0,
    totalCount,
    totalPages
  };
}
