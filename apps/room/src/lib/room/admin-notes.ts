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
   * ## BOTH ENTRY POINTS CALL THIS — and the comment that used to sit here was WRONG
   *
   * It read: *"Called on the Enter Password button. The notes TAB calls `list.open` directly
   * instead, because clicking a tab must not raise a password prompt — upstream's tab does not,
   * and a dialog nobody asked for is worse than an empty panel."*
   *
   * The claim about upstream is false, and it was made without reading the bytes. UIM-06 read
   * them. The tab strip is `J2e` at bundle byte 2,059,546:
   *
   * ```js
   * function J2e(t,n){ if(1&t){ const e=Y();
   *   d(0,"a",54), v(1," System "),  u(),
   *   d(2,"a",55), v(3," Actions "), u(),
   *   d(4,"a",56), x("click",function(){ return D(e), E(g(2).manageAdminNotes()) }),
   *                v(5," Admin Notes "), u() } }
   * ```
   *
   * — and const 56, decoded from that component's own table at 2,087,748, is
   * `["id","nav-tab-notes", …, 1,"nav-item","nav-link", 3,"click"]`: the ONLY one of the three
   * anchors carrying a click binding at all. The button (`pTe`, byte 2,064,649) calls the same
   * method. Two callers upstream, and the room now has the same two.
   *
   * The reasoning behind the false claim was not silly — a dialog nobody asked for IS worse than an
   * empty panel — it was just answered differently by the original: `manageAdminNotes()` at
   * 2,081,768 prompts only when `needPasswordForUserNotes` is configured AND the door is still
   * shut, and otherwise grants silently. `RoomNotesAccess.ask()` is both of those branches, so
   * a room with no password never sees a prompt from clicking this tab either.
   *
   * The cost of leaving it was concrete: the Admin Notes tab switched panes and did nothing else,
   * so the password door had exactly one caller and a presenter who clicked the tab saw the
   * password paragraph instead of the prompt the reference raises.
   */
  async ask(subjectUserId: number): Promise<void> {
    await this.#access.ask();
    if (this.#access.granted) await this.#list.open(subjectUserId);
  }
}
