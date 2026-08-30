import { isHttpError } from '@sveltejs/kit';

import type { MessageActionItem } from '#lib/types.js';

import type { RoomDialogs } from './dialogs.svelte';
import type { EvidencePatch } from './feeds.svelte';

/**
 * What it costs to DELETE one row — the confirmation, the optimistic hide, the Q&A special case and
 * the `deleteAlertPW` prompt.
 *
 * ## Why this is a module and not four more branches in `message-actions.svelte.ts`
 *
 * `TODO.md` row AL named the blocker for the alert-delete password exactly, and it was not a design
 * question: *"the client prompt costs about thirty lines in `message-actions.svelte.ts`, which is AT
 * its ceiling… The blocker is therefore an extraction, not a design question. The candidates in that
 * file are the delete branch's optimistic hide, its Q&A special case, and its confirm-copy ternary."*
 *
 * All three are here, together, because they are the same act rather than three neighbours: each one
 * is a decision about how a deletion is asked for and what is put back if it is refused. Splitting
 * them and keeping one behind would have left the dispatcher holding half a rule — and the half it
 * kept would have been the half the password has to sit in front of.
 *
 * It is a plain `.ts` and not a `.svelte.ts` because it holds no reactive state: every value it
 * touches belongs to `RoomDialogs` or to `RoomFeeds`. `arrivals.ts` and `kicks.ts` are the same
 * shape, and `source-size-contract.test.ts` caps a plain `.ts` in `lib/room/` exactly as it caps a
 * rune module — *"being the wrong extension is not a reason to be uncapped"*.
 *
 * ## DELIBERATELY NO CLIENT-SIDE GRANT, unlike `RoomNotesAccess`
 *
 * The notes door caches its answer in `#granted`, because upstream does: `manageAdminNotes` reads
 * `!this.allowToManageNotes` before prompting, so the notes password is asked for once per page.
 *
 * The alert-delete password is the opposite and the capture is explicit about it. `archiveChatDate`
 * prompts on **every single invocation** and keeps no flag at all — its grant is a callback closure
 * that dies when the callback returns. Reproducing that means no cache here, so the prompt is raised
 * for every alert delete, which is what a presenter upstream sees.
 *
 * The server's grant (`sessions.alert_delete_access_at`, two minutes) is therefore NOT a cache of
 * this decision; it is the window between answering a prompt and the delete landing. The two are
 * different values on purpose, and the server never reads this class's.
 */
export interface AlertDeleteCheck {
  /**
   * Ask the controller, through `checkAlertDeletePassword`.
   *
   * REJECTS rather than resolving false when the controller cannot be reached: "I could not ask" is
   * neither a grant nor a refusal, and collapsing it into either is a lie in one direction or a
   * destroyed alert in the other.
   */
  (payload: { candidate: string }): Promise<{ required: boolean; ok: boolean }>;
}

export class RoomMessageDeletion {
  readonly #dialogs: RoomDialogs;
  readonly #session: () => { user: { role: string } };
  readonly #runDelete: (kind: 'alert' | 'chat', item: MessageActionItem) => Promise<boolean>;
  readonly #deleteQuestion: (payload: { questionId: number }) => Promise<void>;
  readonly #patchEvidence: (item: MessageActionItem, patch: EvidencePatch) => void;
  readonly #onChanged: () => Promise<void>;
  readonly #checkAlertDeletePassword: AlertDeleteCheck;

  constructor(options: {
    dialogs: RoomDialogs;
    /** The viewer, for the confirm copy only. Every authority decision is made on the server. */
    session: () => { user: { role: string } };
    /**
     * `RoomMessageActions.#runOperation(kind, item, 'delete')`, which stays there.
     *
     * It is the ONE wire call every operation goes through, and its refusal path — turn an
     * `HttpError` into a dialog, return false — is shared with `markAnswered` and `showMsgToAll`.
     * Copying it here would be a second refusal path to keep in step with the first, which is the
     * failure that made `sendMessage` and `replyMessage` drift apart.
     */
    runDelete: (kind: 'alert' | 'chat', item: MessageActionItem) => Promise<boolean>;
    deleteQuestion: (payload: { questionId: number }) => Promise<void>;
    patchEvidence: (item: MessageActionItem, patch: EvidencePatch) => void;
    onChanged: () => Promise<void>;
    checkAlertDeletePassword: AlertDeleteCheck;
  }) {
    this.#dialogs = options.dialogs;
    this.#session = options.session;
    this.#runDelete = options.runDelete;
    this.#deleteQuestion = options.deleteQuestion;
    this.#patchEvidence = options.patchEvidence;
    this.#onChanged = options.onChanged;
    this.#checkAlertDeletePassword = options.checkAlertDeletePassword;
  }

  /**
   * A click on "Delete" — the whole path, from the confirmation to the send.
   *
   * @param surface `'log'` is the alerts or chat column; `'qa'` is `AlertQaModal`'s thread.
   * @param event The originating click, when there was one. Shift skips the confirmation, exactly as
   *   the dispatcher did before this moved: `event?.shiftKey` and nothing else reads it.
   */
  request(
    kind: 'alert' | 'chat',
    item: MessageActionItem,
    event: MouseEvent | undefined,
    surface: 'log' | 'qa'
  ): void {
    const send = () => this.#send(kind, item, surface);

    /*
      ── THE `deleteAlertPW` DOOR, 2026-08-30 — TODO row AL ───────────────────────────────────────

      THE CAPTURE IS THIS EXACT SURFACE, and finding that changed what this code is: three orderings
      below were written as reasoned DECISIONS and turned out to be transcriptions. Read end to end
      in `main.d1d09071be31f1ba.js`, all three offsets from `grep -abo`:

        // byte 1,352,424 — the message menu sets the flag from the click
        i.shiftKey && (e.shiftDelete = !0), … emit("doAlertDelete", e)

        // byte 2,598,258 — the subscriber: SHIFT skips the confirmation and nothing else
        subscribe("doAlertDelete", oe => { console.log("delete this alert", oe),
          oe.shiftDelete
            ? this.deleteAlertMessage(oe)
            : bootbox.confirm("Are you sure you want to delete this alert by " + oe.n +
                              ". text: " + oe.txt, se => { se && this.deleteAlertMessage(oe) }) })

        // byte 2,601,823 — and the password is INSIDE the send, so shift never skips it
        deleteAlertMessage(e){
          this.appService.globals.sessData.deleteAlertPW
            ? bootbox.prompt({ title:"Please enter the password to delete this alert:", value:"",
                callback: i => { i && (i.trim() === this.appService.globals.sessData.deleteAlertPW
                  ? this.appService.deleteAlert(e) : bootbox.alert("Wrong password!")) } })
            : this.appService.deleteAlert(e)
        }

      So the confirmation comes FIRST, the password comes second, and **SHIFT SKIPS THE CONFIRMATION
      AND NEVER THE PASSWORD** — upstream's own arrangement, not this room's. The reasoning that
      independently produced it is kept because it is still the reason the arrangement is right:
      "are you sure" is the cheap question, and asking for a secret for an action the presenter then
      abandons is worse than asking twice; the shortcut exists so a run of deletions is not confirmed
      ten times, and a shortcut is not an authority.

      FIVE SIBLING SITES compare the same value the same way — `archiveChatDate` at 2,048,641,
      `doSearchSubmit(del)` at 2,051,139, `resetAllMediaServers` at 2,167,386, `switchToBackup` at
      2,173,860, and the whole-log archive — and every one compares in the BROWSER against a value
      `sessData` already holds. This room may not hold it: `deleteAlertPW` is one of the seven
      credential-shaped settings that never cross the config boundary. So the credential stays on the
      controller and the QUESTION travels, through `internal/room-alert-delete-auth/[code]`.

      WHICH DELETES ARE GATED, and each clause is the capture or the setting rather than a preference:

        * ALERTS only. `deleteAlertMessage` is reached from `doAlertDelete`; the chat menu emits
          `doMsgDelete` instead (byte 1,352,349), and chat has its own rule (`usersCanDeleteOwnMsgs`).
        * PRESENTERS only. The help text is "If set, Presenters will need to enter the password to
          delete an alert", and a member cannot reach an alert delete anyway:
          `message-actions.remote.ts` refuses one they do not own, and only a presenter can post one.
        * NOT the Q&A thread, and that is TRANSCRIBED rather than decided. The same expression routes
          a thread entry to `doQAAlertDelete`, whose subscriber at byte 2,598,525 confirms and then
          calls `deleteQAAlert({qaMsgID, msgIndex})` — **no `deleteAlertPW` prompt anywhere in it.**
          Here a thread entry is a row in `alert_questions`, deleted through `deleteQuestion` and
          never through `messageAction`, so the server does not gate it either.
    */
    const proceed = this.#passwordApplies(kind, surface)
      ? () => void this.#askForPassword(send)
      : send;

    if (event?.shiftKey) {
      proceed();
      return;
    }

    const noun = kind === 'alert' ? 'alert' : 'message';
    const role = this.#session().user.role;
    this.#dialogs.confirmation = {
      message:
        role === 'staff' || role === 'admin'
          ? `Are you sure you want to delete this ${noun} by ${item.senderName}. text: ${item.body}`
          : `Are you sure you want to delete your message: ${item.body}`,
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        proceed();
      }
    };
  }

  /** The gate's own predicate, named so the contract test can point at one expression. */
  #passwordApplies(kind: 'alert' | 'chat', surface: 'log' | 'qa'): boolean {
    if (kind !== 'alert' || surface === 'qa') return false;
    const role = this.#session().user.role;
    return role === 'staff' || role === 'admin';
  }

  /**
   * The reference's first branch — `sessData.deleteAlertPW ? prompt : send` — asked of the only
   * machine that can answer it.
   *
   * The first call carries an EMPTY candidate. That is not a probe for the password: the endpoint
   * answers `{required:false, ok:true}` when nothing is configured, which is how the room reproduces
   * a branch it cannot evaluate locally without ever learning the value.
   */
  async #askForPassword(send: () => void): Promise<void> {
    let first: { required: boolean; ok: boolean };
    try {
      first = await this.#checkAlertDeletePassword({ candidate: '' });
    } catch {
      this.#unavailable();
      return;
    }

    if (first.ok) {
      // Nothing configured: upstream deletes without ever raising a dialog.
      send();
      return;
    }

    this.#dialogs.prompt = {
      // Transcribed exactly, including the colon, from `deleteAlertMessage` at byte 2,601,823 —
      // the reference's own prompt for THIS surface, quoted in full in `request`.
      title: 'Please enter the password to delete this alert:',
      value: '',
      onconfirm: (typed) => {
        this.#dialogs.prompt = null;
        /*
          `i && (…)` upstream: an empty answer closes the dialog and says nothing. Reproduced rather
          than tidied — a presenter who dismisses the prompt has not failed, and telling them they
          typed the wrong password would be a lie about an answer they did not give.
        */
        if (typed.trim() === '') return;
        void this.#submitPassword(typed, send);
      }
    };
  }

  /** The second call, with what was typed — sent UNTRIMMED, because trimming is the server's rule. */
  async #submitPassword(candidate: string, send: () => void): Promise<void> {
    let decision: { required: boolean; ok: boolean };
    try {
      decision = await this.#checkAlertDeletePassword({ candidate });
    } catch {
      this.#unavailable();
      return;
    }
    if (decision.ok) {
      send();
      return;
    }
    // The reference's exact string, from the same expression as the title above.
    this.#dialogs.alert = 'Wrong password!';
  }

  /**
   * The controller could not be asked — DELIBERATELY not `'Wrong password!'`.
   *
   * A divergence, recorded because upstream has no network in this path: it compares a value it
   * already holds. Here the check crosses a boundary, so "could not ask" is a third outcome upstream
   * does not have, and collapsing it into the refusal would tell a presenter their correct password
   * was wrong. Nothing is deleted either — the server refuses the same way, for the same reason.
   */
  #unavailable(): void {
    this.#dialogs.alert = 'Could not check the password just now. Please try again.';
  }

  /** The send itself: the Q&A special case, the optimistic hide, and the undo for a refusal. */
  #send(kind: 'alert' | 'chat', item: MessageActionItem, surface: 'log' | 'qa'): void {
    /*
      A Q&A entry is a row in `alert_questions` and has no captured-fixture twin — `askQuestion`
      writes a real row even when the alert it hangs off is a fixture — so there is no optimistic
      overlay to patch and nothing to put back. The refetch is the update.
    */
    if (surface === 'qa') {
      void this.#deleteQuestion({ questionId: item.id })
        .then(() => this.#onChanged())
        .catch((cause: unknown) => {
          this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'That did not work.';
        });
      return;
    }

    /*
      Captured items used to stop here, hidden in this browser's memory and nowhere else — so a
      presenter deleting an alert watched it vanish while every member kept being served it from the
      fixture on every poll, forever. The local hide stays as the optimistic update, because the
      server round-trip and its invalidate take a moment and the row should not linger under the
      cursor; the server call is what makes it stick for the room.
    */
    if (item.evidenceKey) this.#patchEvidence(item, { hidden: true });
    void this.#runDelete(kind, item).then((succeeded) => {
      /*
        A member may only delete what the capture attributes to them, and the server is what decides
        that — as of 2026-08-30 a presenter deleting an ALERT can be refused too, by
        `requireAlertDeleteAccess`. Put a refused item back rather than leaving it hidden for this
        viewer alone: that is the same one-sided disappearance the optimistic hide exists to avoid,
        and it now has a second way to happen.
      */
      if (!succeeded && item.evidenceKey) this.#patchEvidence(item, { hidden: false });
    });
  }
}
