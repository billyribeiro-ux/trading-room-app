/**
 * `room_sessions` — one row per visit, which is the table the participant stats CSV needs.
 *
 * ## Why the export was thin
 *
 * `TODO.md` item K. The reference's `exportStatsToCSV` writes nine columns, read from its own
 * bundle in `dumps/export-controls-1786287657298.json`:
 *
 *     Name, Email, [Phone,] IP, In, Out, Duration, isMobile, Browser
 *
 * Six of them — IP, In, Out, Duration, isMobile, Browser — come from its per-visit participant
 * records (`statXrefs`), and this application had no equivalent. `stats` was `users` filtered to
 * those with a `lastLoginAt`, which is **one timestamp per person** and says nothing about a visit:
 * it cannot answer "when did they arrive", "when did they leave", or "how long were they here".
 *
 * Emitting those headers over empty cells would have claimed we collect data we do not, so the
 * export wrote only the columns it could fill. This table is what lets it write the rest honestly.
 *
 * ## One row per ARRIVAL, not per person
 *
 * A member who enters a room four times in a day is four rows. That is what makes Duration a
 * meaningful number and what `statXrefs` — an *xref*, a cross-reference row — plainly is in the
 * reference.
 *
 * ## `left_at` is nullable, and that is not a gap
 *
 * A visit in progress has no end. The reference handles exactly this case: `outTime` absent renders
 * `"N/A"` for both Out and Duration, so an open row is a faithful row rather than a broken one.
 *
 * ## Why the identity is copied rather than only referenced
 *
 * `room_user_id` is nullable and the name and email are stored alongside it. Two reasons, and both
 * are about the export being a historical record:
 *
 *  * a **guest** satisfies the room's own login and has no membership row at all, so a foreign key
 *    would be the only column and it would be null;
 *  * a member who is later removed from the room, or renames themselves, must not silently rewrite
 *    or erase visits that already happened. A stats export is evidence of who was present, and
 *    joining live rows would make last month's report change when somebody edits their profile.
 *
 * ## Indexes
 *
 * `room_id, joined_at` because every read is "this room, this period, newest first".
 * `room_id, email, left_at` because closing a visit looks up the open row for one person, and a
 * partial index on the open ones keeps that lookup small as history grows.
 */
export const sql = `
  CREATE TABLE IF NOT EXISTS room_sessions (
    id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    room_id       INTEGER NOT NULL REFERENCES rooms(id),
    room_user_id  INTEGER REFERENCES room_users(id),
    display_name  TEXT NOT NULL,
    email         TEXT NOT NULL,
    ip            TEXT,
    user_agent    TEXT,
    is_mobile     BOOLEAN NOT NULL DEFAULT FALSE,
    browser       TEXT,
    joined_at     TIMESTAMPTZ NOT NULL,
    left_at       TIMESTAMPTZ
  );

  CREATE INDEX IF NOT EXISTS room_sessions_room_joined_idx
    ON room_sessions (room_id, joined_at DESC);

  CREATE INDEX IF NOT EXISTS room_sessions_open_idx
    ON room_sessions (room_id, email)
    WHERE left_at IS NULL;
`;
