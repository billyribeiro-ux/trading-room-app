import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import {
  presenterRoom,
  requireRoomMember,
  requireSessionId,
  requireUser
} from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { userNotes } from '#lib/server/db/schema.js';
import { listNotesFor, requireNotesAccess, type UserNoteView } from '#lib/server/user-notes.js';

/*
  THE PER-MEMBER ADMIN NOTES LIST — `#user-modal`'s notes tab, behind the password.

  ## How this gap was found, which is the reason it is worth writing down

  Not by reading the capture looking for missing features. By ARITHMETIC:
  `orphan-style-contract.test.ts` measures every class `app.css` styles that nothing wears, and
  `smallAvatarImg` had a rule and no wearer. Following the class into the bundle found `fTe` @
  2,064,959 — the avatar on a row of THIS list — and then found that this room renders the notes tab
  and only its FALSE branch: `{#if !canManageNotes}` had no `{:else}` at all. A presenter who typed
  the correct password got an empty panel.

  The password half had been fixed the same day. The gate worked and opened onto nothing, which is
  the failure mode a stylesheet was the only remaining trace of.

  ## The two upstream commands, verbatim (bundle byte 2,079,597)

  ```js
  addNote()          { bootbox.prompt("Enter your note below", note =>
                         invokeServerCommand("addUserNote", {user, note}).then(r => user.notes = r.notes)) }
  deleteNode(e, i)   { bootbox.confirm("Are you sure you want to delete this note by "+e.name+" ?", ok =>
                         invokeServerCommand("delUserNote", {user, noteIDX: i}).then(r => user.notes = r.notes)) }
  ```

  Both answer with the WHOLE new array, and that is kept: a client that patches its own list from a
  guess is a client whose list can disagree with the table. Every function here returns what the
  next render should show.

  ## THE ADDRESSING DIVERGES, and it is the one thing here that is not a transcription

  `noteIDX` is the row's position in the array the browser happens to be rendering. Two presenters
  with the modal open delete different notes; the second request arrives against a list that has
  already shifted and removes the wrong one. That is the read-then-write race this repository
  refuses by name — and the reason upstream has to do it is that its notes have no identity of their
  own, the same constraint the Q&A thread has and the same parent-plus-ordinal answer.

  Ours have identity, because we own the table. Deletion is by `noteId`, scoped by room and subject
  in the same `WHERE`, so a note id from another room or another member matches zero rows.
*/

/**
 * Who may act, and on whom — resolved once, because all three functions need the same three checks.
 *
 * 1. `presenterRoom()` — the role and the room, both from the session. Neither is assertable.
 * 2. `requireRoomMember(subjectUserId, room)` — the tenancy check, for the reason
 *    `profile-picture.remote.ts` records: these commands touch a durable row keyed on the target
 *    alone, which no subscriber map bounds.
 * 3. `requireNotesAccess(room, sessionId)` — the password, asked of the controller and then of the
 *    session row. **The client's own `canManageNotes` is never consulted.** It decides what to
 *    draw; this decides what may be written, and the two are deliberately different values.
 *
 * Returns the room because every caller needs it next, for the same reason `roomForAvatarChange`
 * returns one rather than a boolean.
 */
async function roomForNotesOn(subjectUserId: number): Promise<string> {
  const room = presenterRoom();
  requireRoomMember(subjectUserId, room);
  await requireNotesAccess(room, requireSessionId(getRequestEvent().locals));
  return room;
}

const SUBJECT = z.strictObject({ subjectUserId: z.number().int().positive() });

/**
 * The notes about one member.
 *
 * A `query` and not a `command`, because it is a read the page performs when the tab opens and
 * SvelteKit's own guidance is that a read belongs in one — the same choice `log-pages.remote.ts`
 * and `alerts-search.remote.ts` made. It is authorised identically to the two writes below: the
 * list IS the private thing, so reading it is exactly as privileged as adding to it. Upstream
 * agrees by construction — the list only exists inside the branch the password unlocks.
 */
export const listUserNotes = query(SUBJECT, async ({ subjectUserId }): Promise<UserNoteView[]> => {
  ensureDatabase();
  const room = await roomForNotesOn(subjectUserId);
  return listNotesFor(room, subjectUserId);
});

/**
 * Write one note about a member, and answer with the whole list.
 *
 * The 2,000-character cap is ours: upstream's `bootbox.prompt` has none, and an unbounded string on
 * a durable per-member row is storage a presenter can ask for for free. It is far longer than any
 * note in the capture and it fails LOUD rather than truncating, because a note silently cut in half
 * is worse than a refused one — the presenter would never know which half the member's file kept.
 */
export const addUserNote = command(
  z.strictObject({
    subjectUserId: z.number().int().positive(),
    note: z.string().trim().min(1).max(2000)
  }),
  async ({ subjectUserId, note }): Promise<UserNoteView[]> => {
    ensureDatabase();
    const room = await roomForNotesOn(subjectUserId);

    db.insert(userNotes)
      .values({
        roomShortCode: room,
        subjectUserId,
        /* The author is the SESSION's user. There is no field for it, deliberately. */
        authorUserId: requireUser(getRequestEvent().locals).id,
        note,
        createdAt: new Date()
      })
      .run();

    return listNotesFor(room, subjectUserId);
  }
);

/**
 * Remove one note, addressed by its own id.
 *
 * The `WHERE` carries the room and the subject as well as the id, so an id belonging to another
 * room or another member deletes nothing rather than deleting something. Zero rows is reported as a
 * 404 rather than shrugged off, for the reason this repository gives about atomic conditional
 * updates: zero rows means the caller's picture of the world was wrong, and silence would let the
 * modal keep showing a note that is still there.
 */
export const deleteUserNote = command(
  z.strictObject({
    subjectUserId: z.number().int().positive(),
    noteId: z.number().int().positive()
  }),
  async ({ subjectUserId, noteId }): Promise<UserNoteView[]> => {
    ensureDatabase();
    const room = await roomForNotesOn(subjectUserId);

    const removed = db
      .delete(userNotes)
      .where(
        and(
          eq(userNotes.id, noteId),
          eq(userNotes.roomShortCode, room),
          eq(userNotes.subjectUserId, subjectUserId)
        )
      )
      .returning({ id: userNotes.id })
      .all();

    if (removed.length === 0) error(404, 'That note is no longer there.');

    return listNotesFor(room, subjectUserId);
  }
);
