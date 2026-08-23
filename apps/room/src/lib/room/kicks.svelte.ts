import { DEFAULT_KICK_MESSAGE, duplicateKickAlert, duplicatesOf } from '#lib/kick-duplicates.js';
import type { ModalTargetUser } from '#lib/types.js';

import type { RoomDialogs } from './dialogs.svelte';

/** The roster fields the kick family reads. Narrow: it matches and sends, nothing else. */
export interface KickCandidate {
  id: number;
  emailHash: string;
}

/** The one command this domain needs. `RoomUserActions` owns the full `UserActionCommands`. */
export interface KickCommands {
  kickUser: (payload: { targetUserId: number; message: string }) => Promise<unknown>;
}

/**
 * REMOVING A PERSON FROM THE ROOM — `kick` and `kick-duplicates`, and the record of why `kick-ban`
 * is neither.
 *
 * ## Why this is a domain and not a convenient cut
 *
 * The same seam that justified `RoomSessionControl`, whose `why:` reads "what a presenter does to
 * the SESSION - lock, open, reset, close". This is the other half of that sentence: what a presenter
 * does to a PERSON, at the one end that ejects them. Both branches share a default message, both
 * prompt before acting, both end in the same command, and neither touches the roster selection,
 * the managed lists or the permission checkboxes that make up the rest of `RoomUserActions`.
 *
 * Extracted on 2026-08-23 on the owner's ruling, when building the real `kick-duplicates` loop put
 * `user-actions.svelte.ts` at 788 against a ceiling of 777. The ratchet's own message asks for an
 * extraction rather than a raise, and that file had already been extracted once and raised once the
 * same day — a third move would have made the number mean nothing.
 *
 * ## The history worth keeping, because both controls lied
 *
 * `kick` opened a prompt, closed the modal and alerted *"User kicked OK"* while sending nothing:
 * there was no kick command in this room at all. `kick-duplicates` alerted
 * ``"No duplicates found for "+nick`` **unconditionally**, never reading a roster. Both were counted
 * as `handled` by `user-action-disposition-contract.test.ts` because a branch existed — the fourth
 * disposition that contract now asserts against.
 *
 * `kick-ban` is deliberately absent from here. A ban must outlive the frame; `room_users.banned`
 * exists in the controller's schema and role 4 is `banned`, so the store is real — but writing it is
 * a CONTROLLER command this room does not yet have, and aliasing the ban onto a plain kick would
 * drop it silently. It stays in `INERT_ACTIONS` until that write exists.
 */
export class RoomKicks<Candidate extends KickCandidate> {
  readonly #dialogs: RoomDialogs;
  readonly #commands: KickCommands;
  readonly #roster: () => readonly Candidate[];
  readonly #closeModal: () => void;
  readonly #announceThenSend: (message: string, send: () => Promise<unknown>) => void;

  constructor(options: {
    dialogs: RoomDialogs;
    commands: KickCommands;
    /** `session().connectedUsers` — every entry carries `emailHash`, which is the duplicate join. */
    roster: () => readonly Candidate[];
    closeModal: () => void;
    /**
     * Raises the alert BEFORE the command resolves, which is what the reference does — it alerts
     * immediately and never waits for a reply. Injected rather than reimplemented so `kick` keeps
     * the same ordering as `force-reload` and `unmute-chat`.
     */
    announceThenSend: (message: string, send: () => Promise<unknown>) => void;
  }) {
    this.#dialogs = options.dialogs;
    this.#commands = options.commands;
    this.#roster = options.roster;
    this.#closeModal = options.closeModal;
    this.#announceThenSend = options.announceThenSend;
  }

  /**
   * Returns true when it took the action, so the caller's chain can `return` on it — the same shape
   * `RoomSessionControl.handle` uses, and what keeps `handle()` a chain rather than a switch.
   */
  handle(action: string, user: ModalTargetUser): boolean {
    if (action === 'kick') {
      this.#dialogs.prompt = {
        title: 'Enter the kick message for this user',
        value: DEFAULT_KICK_MESSAGE,
        onconfirm: (message: string) => {
          this.#dialogs.prompt = null;
          this.#closeModal();
          this.#announceThenSend('User kicked OK', () =>
            this.#commands.kickUser({ targetUserId: user.id, message })
          );
        }
      };
      return true;
    }

    if (action === 'kick-duplicates') {
      this.#dialogs.prompt = {
        title: `Kick all other duplicates of ${user.nick} with the following message:`,
        value: DEFAULT_KICK_MESSAGE,
        onconfirm: (message: string) => {
          this.#dialogs.prompt = null;
          this.#closeModal();
          /*
            One `kickUser` per OTHER login of the same person, then one alert carrying the count.
            The match is `#lib/kick-duplicates.js`; upstream does the same loop client-side.
          */
          const others = duplicatesOf(this.#roster(), {
            id: user.id,
            emailHash: user.emailHash
          });
          for (const other of others) {
            void this.#commands.kickUser({ targetUserId: other.id, message });
          }
          this.#dialogs.alert = duplicateKickAlert(others.length, user.nick);
        }
      };
      return true;
    }

    return false;
  }
}
