import { checkNotesPassword } from '../../routes/notes-auth.remote';
import { addUserNote, deleteUserNote, listUserNotes } from '../../routes/user-notes.remote';
import type { NotesPort } from './admin-notes';

/**
 * Everything the Admin Notes tab says to the server: the door, and the list behind it.
 *
 * ## Why the adapter is a module and not four lines in `create-room.svelte.ts`
 *
 * Two reasons, and the second is the load-bearing one:
 *
 * 1. `RoomUserNotes` then knows nothing about the wire, which is what lets its own test drive it
 *    with three stubs and no server. That is the shape every other collaborator in `lib/room/` has.
 * 2. **`create-room.svelte.ts` is at its ceiling.** The room's composition root is capped precisely
 *    because it is the file everything is tempted to grow into, and an object literal per feature is
 *    exactly that growth. The ratchet's instruction is to extract rather than raise, and a named
 *    port is a better thing to extract than an arbitrary slice.
 *
 * The four calls this feature makes, in one object — see `NotesPort` for why one wire and two
 * classes is not a contradiction.
 *
 * Frozen because it holds no state and there is exactly one of it; a caller reaching in to swap
 * `remove` would be replacing the wire under a class that has no idea.
 */
export const userNotesPort: NotesPort = Object.freeze({
  check: checkNotesPassword,
  list: (subjectUserId: number) => listUserNotes({ subjectUserId }),
  add: (subjectUserId: number, note: string) => addUserNote({ subjectUserId, note }),
  remove: (subjectUserId: number, noteId: number) => deleteUserNote({ subjectUserId, noteId })
});
