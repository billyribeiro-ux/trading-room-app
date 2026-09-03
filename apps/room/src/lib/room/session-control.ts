import type { RoomDialogs } from './dialogs.svelte.js';
import { SESSION_LOCK_WRITES } from './session-lock-writes.js';
import { handleSessionRoomCommand, type SessionRoomCommandDeps } from './session-room-commands.js';

/**
 * WHAT A PRESENTER DOES TO THE SESSION — lock it, open it, reset it, close it.
 *
 * ## Why this is not `RoomUserActions`
 *
 * That class's own ceiling entry describes it as *"everything that can be done TO a user"*, and none
 * of these is done to a user. They act on the ROOM: `session-lock` locks the door, `session-open`
 * opens it, `session-hard-reset` resets the whole thing. They arrived in `handle()` only because
 * `ModalHost` happens to dispatch them through the same `onUserAction` prop, which is a transport
 * detail and not a statement about what they are.
 *
 * The evidence that the seam is real rather than convenient is the DEPENDENCY SURFACE. Eleven action
 * names moved and they need four things — `dialogs`, `closeModal`, `reload`, `savePreference`. They
 * touch no roster, no target user, no presenter command, no `localStorage` key, none of the muted or
 * followed lists. A group that takes a quarter of its old home's collaborators with it was a
 * separate thing already.
 *
 * ## Why `handle` returns a boolean
 *
 * So the dispatcher stays ONE door. `ModalHost` dispatches every control through `onUserAction`, and
 * splitting that into two props at the call site would make the caller decide which class owns a
 * string — exactly the coupling that made `focusOnSessionNote` a lie, where a menu item shared a
 * prop with a tab click. `RoomUserActions.handle` asks this first and returns if the answer is yes;
 * the call site is unchanged and cannot get the routing wrong.
 *
 * ## What did NOT move, and why it could not
 *
 * `session-send-video` is a session action by name and stays behind, because it is NESTED inside
 * another action's prompt callback rather than being a branch of its own. Moving it would have meant
 * restructuring the enclosing control, which is a different change from relocating a family. Found
 * by reading the block boundaries; a mechanical cut on the `if (action === …)` pattern would have
 * taken half of it and left the other half orphaned.
 *
 * `session-lock-kick` and `session-hard-reset-revoke` are not branches of their own either — each is
 * a second name handled inside its sibling's condition, and both came across intact with it.
 */
export class RoomSessionControl {
  constructor(options: {
    dialogs: RoomDialogs;
    closeModal: () => void;
    reload: () => Promise<void>;
    savePreference: (key: string, value: boolean) => void;
    /**
     * `lockSession` — the room's door, written on the CONTROLLER.
     *
     * Injected for the reason every collaborator here is: this class knows which button was pressed
     * and nothing about how a setting reaches the control plane, and its tests must not need one.
     */
    lockSession: (payload: { lock: boolean; kick: boolean }) => Promise<unknown>;
  }) {
    this.#dialogs = options.dialogs;
    this.#closeModal = options.closeModal;
    this.#reload = options.reload;
    this.#savePreference = options.savePreference;
    this.#lockSession = options.lockSession;
  }

  readonly #dialogs: RoomDialogs;
  readonly #closeModal: () => void;
  readonly #reload: () => Promise<void>;
  readonly #savePreference: (key: string, value: boolean) => void;
  readonly #lockSession: (payload: { lock: boolean; kick: boolean }) => Promise<unknown>;

  /** The four collaborators, as one object, so the extracted group takes them without a fifth copy. */
  get #deps(): SessionRoomCommandDeps {
    return {
      dialogs: this.#dialogs,
      closeModal: this.#closeModal,
      reload: this.#reload,
      savePreference: this.#savePreference
    };
  }

  /**
   * Acts on the session, and reports whether it recognised the action.
   *
   * `false` means "not mine" and NOT "nothing happened" — the caller carries on down its own chain.
   * The two are different answers and conflating them would silently swallow every action this class
   * does not know.
   */
  handle(action: string): boolean {
    if (handleSessionRoomCommand(action, this.#deps)) return true;

    /*
      `session-save-close` and `session-save-close-message` LEFT this chain on 2026-08-27, and their
      removal is the fix: neither could carry the editor's text, because `onUserAction(action, user)`
      has no third parameter. `CloseSessionPane` calls a receiver instead — see `close-message.ts`.
    */
    /*
      THE LOCK, as a table rather than three branches — see `SESSION_LOCK_WRITES`.

      It used to be the one group here that contacted nothing: two preference writes and a captured
      sentence. That was the defect, not the design — the keys had no readers, so the door never
      closed. It sends a command now, and the table survives for its original reason: three branches
      cost four lines apiece and grew this file every time the room learned another lock state.

      THE ALERT MOVED TO AFTER THE AWAIT, and that is the second half of the fix. Raised before it,
      `Session Locked` appeared whether or not the write landed — which is exactly the failure the
      command was built to end, reproduced one layer up.
    */
    const lock = SESSION_LOCK_WRITES[action];
    if (lock) {
      void this.#lockSession({ lock: lock.lock, kick: lock.kick })
        .then(() => {
          this.#dialogs.alert = lock.alert;
        })
        .catch((cause: unknown) => {
          /*
            SAID, not swallowed. The command answers 502 when the controller refuses the write, and
            a presenter who is told nothing has no way to tell a locked room from an unlocked one.
          */
          console.error('[session-control] the lock did not change', cause);
          this.#dialogs.alert = 'Could not change the room lock right now.';
        });
      return true;
    }

    return false;
  }
}
