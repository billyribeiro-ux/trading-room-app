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
  }) {
    this.#dialogs = options.dialogs;
    this.#closeModal = options.closeModal;
    this.#reload = options.reload;
    this.#savePreference = options.savePreference;
  }

  readonly #dialogs: RoomDialogs;
  readonly #closeModal: () => void;
  readonly #reload: () => Promise<void>;
  readonly #savePreference: (key: string, value: boolean) => void;

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

    if (action === 'session-save-close') {
      this.#savePreference('sessionOpen', false);
      this.#closeModal();
      return true;
    }

    if (action === 'session-save-close-message') {
      this.#dialogs.alert = 'Message Saved';
      return true;
    }

    /*
      THE LOCK, as a table rather than three branches — see `SESSION_LOCK_WRITES`. It is the one
      group here that contacts nothing: two preference writes and a captured sentence, with no
      command, no reload and no modal to close. Keeping it inline made this file grow by four lines
      every time the room learned a new lock state, which is what pushed it over its ceiling when the
      hard-reset and open senders landed.
    */
    const lock = SESSION_LOCK_WRITES[action];
    if (lock) {
      for (const key of Object.keys(lock.preferences)) {
        this.#savePreference(key, lock.preferences[key]);
      }
      this.#dialogs.alert = lock.alert;
      return true;
    }

    return false;
  }
}
