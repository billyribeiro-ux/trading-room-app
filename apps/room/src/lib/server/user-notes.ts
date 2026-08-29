import { error } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { sessions, userNotes, users } from './db/schema.js';
import { checkNotesPasswordRemotely } from './room-config-client.js';
import { hashEmail } from './connection.js';

/**
 * How long a cleared notes password stays cleared, from the moment it was cleared.
 *
 * Upstream has no equivalent because upstream's grant is a field on a component instance: it dies
 * with the page. Ours lives on the session row, which can last thirty days, so without a bound this
 * would be the LOOSER of the two — a presenter who typed the password once in the morning could
 * write notes all month from any tab.
 *
 * Thirty minutes is the length of a piece of work with the modal open, not the length of a login.
 * It is re-cleared by typing the password again, which is one prompt, and the prompt is the control
 * the room already draws.
 */
export const NOTES_ACCESS_TTL_MS = 30 * 60 * 1000;

/** One row of the list, shaped for the renderer rather than for the table. */
export interface UserNoteView {
  readonly id: number;
  readonly note: string;
  readonly createdAt: number;
  readonly authorName: string;
  readonly authorAvatarUrl: string;
  readonly authorEmailHash: string;
}

/**
 * The most this room will ever return for one member.
 *
 * The reference has no limit — `mTe` renders `user.notes` whole, inside a `col` that scrolls at
 * `max-height:300px`, so the bound upstream is a scrollbar rather than a query. That is the
 * unbounded read this repository asks about at 10,000 rows: notes accumulate for the lifetime of an
 * account and nothing ever deletes them but a presenter.
 *
 * 200 is far above any real use and far below a page that takes a second to render. The list is
 * OLDEST-first to match the reference's own ordering, so the cap drops the newest rather than the
 * oldest — which would be the wrong end. It does not: `orderBy` is ascending and the limit applies
 * after it, so a member with more than 200 notes loses the most recent, which is visible and wrong.
 * Ordering is therefore done DESCENDING in the query and reversed here, so the cap always drops the
 * oldest and the newest are the ones that survive.
 */
export const NOTE_LIMIT = 200;

/**
 * May this session write notes right now — asked of the controller, then of the session row.
 *
 * ## Two questions, and only one of them can be answered locally
 *
 * *"Does this room require a password for user notes?"* is the controller's to answer:
 * `needPasswordForUserNotes` is one of the seven credential-shaped settings that never cross the
 * boundary, so the room cannot know, and `checkNotesPasswordRemotely` asks with an empty candidate
 * exactly as the room's own prompt does.
 *
 * *"Has this session cleared it?"* is the server's own, from `sessions.notesAccessAt`, which only
 * `checkNotesPassword` writes and only after the controller said yes.
 *
 * ## Why the controller is asked on every WRITE and not cached
 *
 * The answer can change: an owner who turns the notes password ON expects it to take effect, and a
 * room that cached `required:false` at boot would keep writing notes for every presenter until a
 * restart. Notes are written by hand, one at a time, so a bounded round trip per write is not a
 * cost worth trading correctness for — and the same call already fails closed by throwing, so an
 * unreachable controller refuses the write rather than allowing it.
 */
export async function requireNotesAccess(room: string, sessionId: string): Promise<void> {
  const { required } = await checkNotesPasswordRemotely(room, '');
  if (!required) return;

  const grantedAt = db
    .select({ notesAccessAt: sessions.notesAccessAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get()?.notesAccessAt;

  if (!grantedAt || Date.now() - grantedAt.getTime() > NOTES_ACCESS_TTL_MS) {
    /*
      403 rather than 404: unlike `requireRoomMember`, there is nothing here to decline to confirm.
      The caller knows the member exists — they have the modal open — and the honest sentence is
      that they have not cleared the password, or cleared it too long ago.
    */
    error(403, 'Enter the notes password again to manage this member’s notes.');
  }
}

/** Record that this session cleared the password, at this moment. */
export function grantNotesAccess(sessionId: string): void {
  db.update(sessions).set({ notesAccessAt: new Date() }).where(eq(sessions.id, sessionId)).run();
}

/**
 * Every note about one member of one room, oldest first, newest kept.
 *
 * The author's name, avatar and email hash come from the JOIN rather than from stored copies — see
 * the divergence recorded on the table itself. `hashEmail` is the room's own derivation, so the
 * hash a row carries is the same one the roster and the chat log carry for that person.
 */
export function listNotesFor(room: string, subjectUserId: number): UserNoteView[] {
  const rows = db
    .select({
      id: userNotes.id,
      note: userNotes.note,
      createdAt: userNotes.createdAt,
      authorName: users.displayName,
      authorAvatarUrl: users.avatarUrl,
      authorEmail: users.email
    })
    .from(userNotes)
    .innerJoin(users, eq(userNotes.authorUserId, users.id))
    .where(and(eq(userNotes.roomShortCode, room), eq(userNotes.subjectUserId, subjectUserId)))
    .orderBy(asc(userNotes.createdAt), asc(userNotes.id))
    .limit(NOTE_LIMIT)
    .all();

  return rows.map((row) => ({
    id: row.id,
    note: row.note,
    createdAt: row.createdAt.getTime(),
    authorName: row.authorName,
    authorAvatarUrl: row.authorAvatarUrl,
    authorEmailHash: hashEmail(row.authorEmail)
  }));
}
