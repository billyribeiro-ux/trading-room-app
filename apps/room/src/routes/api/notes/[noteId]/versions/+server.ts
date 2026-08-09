import { json } from '@sveltejs/kit';
import { isPresenterRole, requireRoomShortCode, requireUser } from '$lib/server/auth';
import { getNoteVersions } from '$lib/server/notes-repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => {
  /*
    Version history is an editor capability, so it is gated the same way editing is.

    Previously this handler checked nothing beyond the session that `hooks.server.ts`
    already requires, while every one of the six note actions in `+page.server.ts` demands
    `staff | admin`. That asymmetry mattered: the current text of a note is returned to
    everyone by the page load, but its *history* contains text that was edited away or
    deleted, so a member could read content no longer meant to be visible by asking for an
    older version of it.
  */
  const user = requireUser(locals);
  if (!isPresenterRole(user.role)) {
    return json({ message: 'You cannot view this note history.' }, { status: 403 });
  }

  const noteId = Number(params.noteId);
  if (!Number.isInteger(noteId) || noteId <= 0) {
    return json({ message: 'A valid note ID is required.' }, { status: 400 });
  }

  /*
    Scoped to the caller's own room.

    `noteId` arrives in the URL, so without this a presenter could read the full edit history of a
    note belonging to a room they have no membership in simply by guessing an id — and history is
    exactly the content the role check above exists to protect.
  */
  const versions = getNoteVersions(requireRoomShortCode(locals), noteId);
  return versions === null
    ? json({ message: 'Session note was not found.' }, { status: 404 })
    : json(versions);
};
