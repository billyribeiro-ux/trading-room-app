import type { RoomDialogs } from './dialogs.svelte';

/**
 * The notes-password door — upstream's `allowToManageNotes` and the check that sets it.
 *
 * ## Why it is a module of its own
 *
 * It began inside `RoomUserActions` and pushed that class 98 lines past its ceiling.
 * `source-size-contract.test.ts` answers that with one instruction — *"extract a slice into a module
 * or component rather than raising this number"* — and this is the fourth time this class has been
 * asked: `RoomChatMute`, `RoomKicks` and `RoomSessionControl` all left the same way.
 *
 * It reads better here on its own terms too. This is one question with a two-call answer and a piece
 * of session state, and none of it is about what a presenter does TO a member, which is the sentence
 * `RoomUserActions` exists to say.
 *
 * ## The defect it closes
 *
 * `admin-notes-password` raised the reference's prompt and then set `'Wrong password!'`
 * **unconditionally** — its `onconfirm` took no parameter, so the typed value was never received. A
 * presenter typing the correct password was told it was wrong, every time.
 *
 * The primitive was never at fault: `RoomPrompt.onconfirm` is `(value: string) => void` and
 * `BootboxDialog.svelte` calls `onconfirm?.(promptResult())`. What was missing was somewhere for the
 * value to go.
 *
 * ## Two calls, because the room may not hold the password
 *
 * Upstream, at bundle byte 2,081,768:
 *
 * ```js
 * manageAdminNotes(){
 *   this.appService.globals.sessData.needPasswordForUserNotes && !this.allowToManageNotes
 *     ? bootbox.prompt({ …, callback: e => { e && (e.trim() === …needPasswordForUserNotes
 *         ? this.allowToManageNotes = !0 : bootbox.alert("Wrong password!")) } })
 *     : this.allowToManageNotes = !0
 * }
 * ```
 *
 * Its first branch never prompts when nothing is configured. This room cannot evaluate that branch:
 * `needPasswordForUserNotes` is credential-shaped and never crosses the config boundary. So the first
 * call carries an EMPTY candidate and the controller answers `required` — the same branch, asked of
 * the only machine that can answer it — and the second carries what was typed.
 */
export interface NotesAccessCheck {
  /**
   * Ask the controller. REJECTS rather than resolving false when it cannot be reached: "I could not
   * ask" is neither a grant nor a refusal, and collapsing it into either is a lie in one direction
   * or the other.
   */
  (payload: { candidate: string }): Promise<{ required: boolean; ok: boolean }>;
}

export class RoomNotesAccess {
  readonly #dialogs: RoomDialogs;
  readonly #check: NotesAccessCheck;

  /**
   * Upstream's `allowToManageNotes`, and deliberately the same shape: ONE flag for the session, not
   * one per member. Upstream reads `!this.allowToManageNotes` before prompting, so the password is
   * asked for once rather than once per user.
   *
   * Not derived from anything the server sent — the room is never told whether a password is
   * configured, because that fact is credential-derived. The only thing that sets this true is an
   * answer from the check.
   */
  #granted = $state(false);

  constructor(dialogs: RoomDialogs, check: NotesAccessCheck) {
    this.#dialogs = dialogs;
    this.#check = check;
  }

  get granted(): boolean {
    return this.#granted;
  }

  /** The reference's `manageAdminNotes()`, with the comparison moved to the machine that can make it. */
  async ask(): Promise<void> {
    if (this.#granted) return;

    let first: { required: boolean; ok: boolean };
    try {
      first = await this.#check({ candidate: '' });
    } catch {
      this.#unavailable();
      return;
    }

    if (first.ok) {
      // Nothing configured: upstream grants without ever raising a dialog.
      this.#granted = true;
      return;
    }

    this.#dialogs.prompt = {
      title: "Please enter the password to manage user's notes:",
      value: '',
      onconfirm: (typed) => {
        this.#dialogs.prompt = null;
        /*
          `e && (…)` upstream: an empty answer closes the dialog and says nothing. Reproduced rather
          than tidied — a presenter who dismisses the prompt has not failed, and telling them they
          typed the wrong password would be a second lie in the control that just lost its first.
        */
        if (typed.trim() === '') return;
        void this.#submit(typed);
      }
    };
  }

  /** The second call, with what was typed — sent UNTRIMMED, because trimming is the server's rule. */
  async #submit(candidate: string): Promise<void> {
    let decision: { required: boolean; ok: boolean };
    try {
      decision = await this.#check({ candidate });
    } catch {
      this.#unavailable();
      return;
    }
    if (decision.ok) {
      this.#granted = true;
      return;
    }
    // The reference's exact string, which is the one thing about this control that was always right.
    this.#dialogs.alert = 'Wrong password!';
  }

  /**
   * The controller could not be asked — DELIBERATELY not `'Wrong password!'`.
   *
   * A divergence, recorded because upstream has no network in this path: it compares a value it
   * already holds. Here the check crosses a boundary, so "could not ask" is a third outcome upstream
   * does not have, and collapsing it into the refusal would reproduce the exact defect this control
   * was repaired for. It grants nothing either.
   */
  #unavailable(): void {
    this.#dialogs.alert = 'Could not check the password just now. Please try again.';
  }
}
