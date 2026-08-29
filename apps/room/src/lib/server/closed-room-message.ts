import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from './db/index.js';
import { roomState } from './db/schema.js';

/**
 * The sentence a closed room turns somebody away with.
 *
 * ## Why this is a function, with ONE consumer
 *
 * Two doors refuse a closed room and only one of them EXPLAINS. `session/[code]` turns an arriving
 * guest away with a message, which is this one. `+page.server.ts` handles the other case — a member
 * whose room shut under them mid-session — by ending the session and redirecting to signed out, with
 * no message at all, and that is deliberate rather than an oversight: they are already inside, and
 * the honest act is to remove them rather than to leave them on a page explaining why they may not
 * be on it.
 *
 * So this is not a shared helper serving two callers. It is the read and its fallback, kept out of a
 * route that is already 260 lines of entry checking, in the one place a second door would look if
 * one is ever added. Stated plainly because a comment claiming two consumers where there is one is
 * the drift this repository hunts in its own diffs.
 *
 * ## The fallback is load-bearing
 *
 * `closed_message` is nullable so that "the presenter never wrote one" stays distinguishable from
 * "the presenter cleared it", and `saveCloseMessage` normalises a trimmed-empty save to `null` for
 * the same reason. Either way this returns the room's own sentence rather than handing a member a
 * blank refusal, which is the failure a `.notNull().default('')` column would have made unavoidable.
 */
export const CLOSED_ROOM_DEFAULT = 'This room is closed.';

/**
 * `undefined` is accepted and answers with the default.
 *
 * The guest door reaches this from a branch where the short code is `string | undefined` — the
 * config read that produced the refusal was made inside an `if (shortCode)` the type checker cannot
 * see through. Narrowing it at the call site with a non-null assertion would be asserting something
 * true today and unchecked tomorrow; answering honestly here costs one line and cannot go stale.
 * No short code means no row to read, which is exactly the case the default exists for.
 */
export function closedRoomMessage(shortCode: string | undefined): string {
  if (!shortCode) return CLOSED_ROOM_DEFAULT;
  ensureDatabase();
  const row = db
    .select({ closedMessage: roomState.closedMessage })
    .from(roomState)
    .where(eq(roomState.roomShortCode, shortCode))
    .get();
  return row?.closedMessage?.trim() || CLOSED_ROOM_DEFAULT;
}
