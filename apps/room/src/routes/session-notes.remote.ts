import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import {
  deleteSessionNoteTabSchema,
  newSessionNoteTabSchema,
  renameSessionNoteTabSchema,
  restoreNoteVersionSchema,
  saveSessionNoteSchema,
  setWelcomeMatNoteTabSchema
} from '#lib/notes-command.js';
import { isPresenterRole, requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import {
  createNote,
  deleteNote,
  renameNote,
  restoreNoteVersion as restoreNoteVersionRow,
  saveNote,
  setWelcomeMatNote,
  setWelcomeMatNoteEverywhere
} from '#lib/server/notes-repository.js';
import { checkWelcomeMatPasswordRemotely } from '#lib/server/room-config-client.js';
import { publishToRoom } from '#lib/server/room-events.js';
import type { RoomNote } from '#lib/types.js';

/*
  THE SIX SESSION-NOTE COMMANDS.

  ## What they were

  Six form actions in `+page.server.ts`, reached by `RoomNotes.submitMutation(action, values)` —
  ``fetch(`?/${action}`)`` over a six-member union with a hand-built `FormData` body, whose result
  came back through `deserialize()` and was inspected for `result.type === 'failure'`. Nothing about
  that was checked by anything: the endpoint was a string built while the page ran, every value was
  stringified on the way out and re-parsed with `Number()` / `String()` on the way in, and a refusal
  was a discriminated union the caller had to remember to look at. `presenterCommand` is what
  happens when one end of that arrangement moves.

  ## The SCHEMAS did not move, and that is deliberate

  `#lib/notes-command.ts` already held one `strictObject` per command, transcribed from the captured
  websocket envelope `{cmd, data}` and tested by `notes-command.test.ts`. Each command below
  validates with that schema's `.shape.data` — the payload half — so the bounds (`name` 1..120,
  `contentHtml` up to a megabyte, every id a positive integer) are declared exactly once and the
  captured envelope keeps its own test. Restating them here would have created a second definition
  free to drift from the first.

  The three things the action did BY HAND are what actually changed:

    - `Number(formData.get('noteId'))` produced `NaN` for `'abc'`, which the schema then refused as
      a `fail(400)`. There is no coercion step now; a non-number is refused as a number.
    - `String(formData.get('allRooms')) === 'true'` reconstructed a boolean from text. `allRooms`
      crosses as a real boolean.
    - `fail(…)` became `error(…)`, because `fail` returns a value only a form action's caller
      understands and a command has no such caller.

  ## The gate: presenter, and the caller's OWN room, in one call

  {@link notesRoom} is the local equivalent of `presenterRoom()` and exists for one reason
  `presenterRoom()` cannot serve: each of these six refuses with its own sentence — *"You cannot
  create session notes."*, *"…edit…"*, *"…rename…"*, *"…delete…"*, *"…restore…"*, *"You cannot change
  the welcome mat."* — and `notes-account-action-contract.test.ts` pins that they differ. What it
  keeps from `presenterRoom()` is the property that matters: the room is returned only AFTER the
  role check, so "may they" and "which room" cannot be applied separately. Handing those out
  separately is exactly the 2026-08-07 privilege escalation.

  **No command here takes a room.** Every one of them acts on the room the session says the caller
  is in, so a presenter of room A cannot rename room B's notes, and the repository's own room
  predicate is what turns a foreign `noteId` into a 404 rather than a write.
*/

/**
 * The gate, and the room, together — with this command's own refusal sentence.
 *
 * `verb` completes *"You cannot …"*. It is a parameter rather than six copies of the same three
 * lines, and it is a SENTENCE rather than an enum because that is all it is: the six messages are
 * the reference's own phrasing and nothing branches on them.
 */
function notesRoom(verb: string): { room: string; userId: number } {
  const { locals } = getRequestEvent();
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) error(403, `You cannot ${verb}.`);
  return { room: requireRoomShortCode(locals), userId: user.id };
}

/**
 * The repository answers `null` for "no such note IN THIS ROOM"; the caller has to be told 404.
 *
 * That translation is the whole job of these six wrappers — the repository is covered by
 * `notes-repository.test.ts` — and it is the thing a rewrite drops. A `null` returned as success is
 * a note pane that silently does nothing; a `null` thrown as a 500 tells a presenter the room is
 * broken when what actually happened is that they clicked a tab somebody else had just deleted.
 */
function found(note: RoomNote | null, missing: string): RoomNote {
  if (note === null) error(404, missing);
  return note;
}

/** `newSessionNoteTab` — create a tab. The only one of the six that names no existing note. */
export const newSessionNoteTab = command(newSessionNoteTabSchema.shape.data, ({ name }) => {
  ensureDatabase();
  const { room, userId } = notesRoom('create session notes');

  return createNote({ room, name, now: new Date(), userId });
});

/**
 * `saveSessionNote` — write the body, then TELL THE ROOM.
 *
 * ```js
 * case "updatedSessionNote":
 *   for (let se = 0; se < this.globals.sessionNotes.length; se++) {
 *     let _e = this.globals.sessionNotes[se];
 *     _e._id == i.tab._id && (this.globals.sessionNotes[se].noteContent = i.tab.noteContent,
 *       this.appEventBus.emit("noteTabUpdated", { id: _e._id, name: _e.name })) }
 *   break;                                                        // bundle byte 1,022,762
 * ```
 *
 * The action wrote the row and returned. Every other viewer's Notes pane kept the previous text
 * until they happened to reload — a presenter edits the room's notes during a session and the room
 * does not see it, which is the whole point of the pane. USM-11 is the popup half of this, and it
 * could not exist without the frame.
 *
 * **THE PAYLOAD IS THE ID AND THE NAME, not the content.** `invalidateAll()` re-reads the row,
 * which is the authority — the same argument the four message-mutation frames make. The name rides
 * along because the toast needs it and a note's TAB NAME is already rendered to everyone who can
 * see the pane at all; the note's BODY is not sent, so the frame carries nothing the recipient
 * could not already read.
 *
 * **The publish is AFTER the 404**, and that ordering is the feature: announcing a change that was
 * refused tells the room something untrue. `error(404, …)` throws, so the publish below it cannot
 * be reached by a save that did not happen — which is a stronger guarantee than the `return` it
 * replaced, because a `return` can be followed by unreachable code that looks live.
 */
export const saveSessionNote = command(
  saveSessionNoteSchema.shape.data,
  ({ noteId, contentHtml }) => {
    ensureDatabase();
    const { room, userId } = notesRoom('edit session notes');

    const note = found(
      saveNote({ room, contentHtml, noteId, now: new Date(), userId }),
      'Session note was not found.'
    );

    publishToRoom(room, {
      channel: 'cmds',
      data: {
        cmd: 'updatedSessionNote',
        noteId: note.id,
        noteName: note.name,
        actorUserId: userId
      }
    });
    return note;
  }
);

/** `restoreNoteVersion` — put a recorded version back, as a new version rather than a rewrite. */
export const restoreNoteVersion = command(
  restoreNoteVersionSchema.shape.data,
  ({ noteId, versionId }) => {
    ensureDatabase();
    const { room, userId } = notesRoom('restore session notes');

    return found(
      restoreNoteVersionRow({ room, noteId, now: new Date(), userId, versionId }),
      'Session note version was not found.'
    );
  }
);

/** `renameSessionNoteTab` — rename a tab. */
export const renameSessionNoteTab = command(
  renameSessionNoteTabSchema.shape.data,
  ({ noteId, newName }) => {
    ensureDatabase();
    const { room, userId } = notesRoom('rename session notes');

    return found(
      renameNote({ room, name: newName, noteId, now: new Date(), userId }),
      'Session note was not found.'
    );
  }
);

/**
 * `deleteSessionNoteTab` — SOFT delete: the row stays and `deletedAt` is set.
 *
 * Version history has to survive a delete, which is why this is not a `DELETE`.
 */
export const deleteSessionNoteTab = command(deleteSessionNoteTabSchema.shape.data, ({ noteId }) => {
  ensureDatabase();
  const { room, userId } = notesRoom('delete session notes');

  return found(
    deleteNote({ room, noteId, now: new Date(), userId }),
    'Session note was not found.'
  );
});

/**
 * `setWelcomeMatNoteTab` — make one note the room's welcome mat, here or everywhere.
 *
 * ## The all-rooms branch, and where its authority lives
 *
 * **THE AUTHORITY IS THE SERVER'S, WHICH THE REFERENCE'S IS NOT.** Upstream compares the typed
 * password in the browser against `sessData.allRoomsWelcomeMatPW`, so a member who can read
 * `sessData` can send this command with any `pw` and have it obeyed. Here the room forwards the
 * candidate and obeys the answer; it never learns the password and cannot be talked out of asking.
 * `internal/room-welcome-mat-auth` answers both halves — which rooms, and is the password right —
 * in one call, because a separate list endpoint would let any holder of a `config-read` token
 * enumerate an account's rooms without knowing the password.
 *
 * Fails CLOSED. `checkWelcomeMatPasswordRemotely` throws when the controller cannot be reached, and
 * that is not caught into a per-room fallback: applying to this room only would be a quiet, wrong
 * answer to a request that named every room. `error(503, …)` says so out loud instead.
 *
 * The exclusivity — one welcome mat, moved rather than added — is enforced inside the repository's
 * transaction, which clears the flag on every live note before setting it on the target.
 */
export const setWelcomeMatNoteTab = command(
  setWelcomeMatNoteTabSchema.shape.data,
  async ({ noteId, allRooms, pw }) => {
    ensureDatabase();
    const { room, userId } = notesRoom('change the welcome mat');
    const now = new Date();

    if (allRooms) {
      let decision;
      try {
        decision = await checkWelcomeMatPasswordRemotely(room, pw);
      } catch {
        error(
          503,
          'The welcome mat could not be replaced everywhere right now. Try again shortly.'
        );
      }

      /* `Wrong password!` is the reference's own string, at byte 1,474,217. */
      if (!decision.ok) error(403, 'Wrong password!');

      return found(
        setWelcomeMatNoteEverywhere({
          sourceRoom: room,
          rooms: decision.rooms,
          noteId,
          now,
          userId
        }),
        'Session note was not found.'
      );
    }

    return found(setWelcomeMatNote({ room, noteId, now, userId }), 'Session note was not found.');
  }
);
