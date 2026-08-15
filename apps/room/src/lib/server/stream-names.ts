/**
 * The name behind a MediaMTX ingest path.
 *
 * A `/v3/paths/list` response carries paths and nothing else, and a path only ever holds the
 * SANITISED form of a presenter's name — `ingestPathFor` collapses everything outside
 * `[a-zA-Z0-9_-]` to `_` before the media server sees it. `Dana Vero` and `Dana_Vero` and
 * `Dana/Vero` all publish to `…__Dana_Vero`, so the display name is not recoverable from the path
 * and guessing at it would rename real people.
 *
 * The room does not have to guess, because `api/stream-ingest` held both halves at mint time. See
 * the note on {@link streamIngestNames} for why that is the source and why the alternatives were
 * rejected.
 */

import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { streamIngestNames, users } from '$lib/server/db/schema';

/**
 * Record who a freshly minted ingest path belongs to.
 *
 * An upsert on `(room, path)`, because minting is a ROTATION: pressing "New Link" issues a new
 * token for the same path, and a presenter who renamed themselves gets a different path while the
 * old row stays behind harmlessly — it names a path nothing publishes to any more.
 *
 * Never throws into the caller's happy path. This is a label, and a room whose stream keys stopped
 * being issued because a cosmetic write failed would be a far worse failure than a tab reading
 * `Dana_Vero`.
 */
export function recordStreamIngestName(input: {
  ingestPath: string;
  now: Date;
  room: string;
  userId: number;
}): void {
  ensureDatabase();
  try {
    db.insert(streamIngestNames)
      .values({
        roomShortCode: input.room,
        ingestPath: input.ingestPath,
        userId: input.userId,
        updatedAt: input.now
      })
      .onConflictDoUpdate({
        target: [streamIngestNames.roomShortCode, streamIngestNames.ingestPath],
        set: { userId: input.userId, updatedAt: input.now }
      })
      .run();
  } catch (cause) {
    // Logged rather than swallowed silently: it is not worth failing the request over, but a write
    // that keeps failing is a real fault and has to be visible somewhere.
    console.warn('[stream-names] could not record the ingest path owner', {
      room: input.room,
      cause
    });
  }
}

/**
 * Every known path in one room, mapped to the display name to show for it.
 *
 * One query per reconcile, bounded by the number of people who have ever asked for a stream key in
 * THIS room — not by the user table, and not by anything that grows with chat traffic. The name is
 * joined at read time rather than copied at write time so that renaming a member relabels their
 * tab.
 *
 * Returns an empty map on failure, which is correct here and only here: the caller falls back to
 * the path segment, which is exactly what it showed before this existed.
 */
export function streamNamesForRoom(room: string): ReadonlyMap<string, string> {
  ensureDatabase();
  const names = new Map<string, string>();
  try {
    const rows = db
      .select({ ingestPath: streamIngestNames.ingestPath, displayName: users.displayName })
      .from(streamIngestNames)
      .innerJoin(users, eq(users.id, streamIngestNames.userId))
      .where(eq(streamIngestNames.roomShortCode, room))
      .all();
    for (const row of rows) names.set(row.ingestPath, row.displayName);
  } catch (cause) {
    console.warn('[stream-names] could not read ingest path owners', { room, cause });
  }
  return names;
}

/*
  There is deliberately no single-path lookup beside these two.

  One was written and removed: nothing but its own test ever called it, and the reconciler — the
  only reader — wants the whole room in one query rather than a statement per stream. A helper kept
  alive by the test that exercises it is the dead scaffolding this repository keeps finding.
*/
