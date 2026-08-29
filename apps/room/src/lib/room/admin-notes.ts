import type { RoomDialogs } from './dialogs.svelte';
import { RoomNotesAccess, type NotesAccessCheck } from './notes-access.svelte';
import { RoomUserNotes, type UserNotesPort } from './user-notes.svelte';

/**
 * Everything the Admin Notes tab says to the server — the door's one call, and the list's three.
 *
 * One TYPE because it is one wire, configured in one place. Two CLASSES behind it because they are
 * two questions, which `RoomUserNotes` argues at length. `RoomUserActions` names this once instead
 * of carrying two options that must always be passed together and can be passed apart.
 */
export type NotesPort = UserNotesPort & { check: NotesAccessCheck };

/**
 * The Admin Notes feature: the password door, the list behind it, and the one rule that joins them.
 *
 * ## THE GRANT AND THE LOAD ARE ONE ACTION
 *
 * This is the whole reason the class exists. Separating them was the first draft's bug: a presenter
 * clears the password, the panel flips from the prompt to the list — and the list is empty until
 * they click the tab a second time. Upstream never has that gap, because its notes arrive with the
 * roster entry: `user.notes` is already populated when `allowToManageNotes` flips. There is no
 * upstream behaviour to copy here, only one to match.
 *
 * ## Why a THIRD class rather than either of the two owning the other
 *
 * Both of those were written and both were wrong, in the same way and for the same measurable
 * reason. `RoomUserActions` wiring the pair together cost it twenty-three lines to express a
 * relationship that is not about what a presenter does to a member — the sentence that class exists
 * to say. `RoomNotesAccess` owning the list cost that file fifty-six, and made a class whose entire
 * job is answering one yes-or-no question also responsible for a fetch.
 *
 * `source-size-contract.test.ts` refused both, and it was right both times: a file at its ceiling is
 * a file where the next paragraph of wiring does not belong. The composition is its own idea, so it
 * gets its own file — which is also the only file where the paragraph above makes sense to read.
 *
 * ## No callback, deliberately
 *
 * An `ongrant` hook on `RoomNotesAccess` was the first shape tried. It works, and it puts a piece of
 * this class's rule inside a class that should not know the rule exists — the door would have to
 * carry a member id through two async branches purely to hand it back. Awaiting `ask()` and then
 * reading `granted` says the same thing from the outside, where the joining rule belongs.
 *
 * `granted` is re-read rather than inferred because `ask()` resolves on THREE outcomes and only one
 * of them is a grant: the password may have been wrong, or the controller unreachable. Loading in
 * either of the other two would send a request the server is about to refuse.
 */
export class RoomAdminNotes {
  readonly #access: RoomNotesAccess;
  readonly #list: RoomUserNotes;

  constructor(dialogs: RoomDialogs, port: NotesPort) {
    this.#access = new RoomNotesAccess(dialogs, port.check);
    /*
      The gate is a THUNK into `#access` and not a copy of its flag. Two objects holding their own
      "is the door open" is how one of them ends up stale, which is the failure the tenancy kernel
      and `room-defaults.ts` each record in their own words.
    */
    this.#list = new RoomUserNotes(dialogs, port, () => this.#access.granted);
  }

  /** Upstream's `allowToManageNotes`. Read by tests and by nothing else — the pane asks the list. */
  get granted(): boolean {
    return this.#access.granted;
  }

  get list(): RoomUserNotes {
    return this.#list;
  }

  /**
   * `manageAdminNotes()` for one member: clear the door if it is shut, then show what is behind it.
   *
   * Called on the Enter Password button. The notes TAB calls `list.open` directly instead, because
   * clicking a tab must not raise a password prompt — upstream's tab does not, and a dialog nobody
   * asked for is worse than an empty panel.
   */
  async ask(subjectUserId: number): Promise<void> {
    await this.#access.ask();
    if (this.#access.granted) await this.#list.open(subjectUserId);
  }
}
