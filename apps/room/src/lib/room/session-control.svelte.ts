import { refreshRoster, softReset } from '../../routes/session-commands.remote';

import type { RoomDialogs } from './dialogs.svelte.js';

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

  /**
   * Acts on the session, and reports whether it recognised the action.
   *
   * `false` means "not mine" and NOT "nothing happened" — the caller carries on down its own chain.
   * The two are different answers and conflating them would silently swallow every action this class
   * does not know.
   */
  handle(action: string): boolean {
    if (action === 'session-reload-config') {
      this.#dialogs.confirm('Are you sure you want to reload tge session config?', () => {
        this.#closeModal();
        void this.#reload();
        this.#dialogs.alert = 'Session config reloaded...';
      });
      return true;
    }

    /*
      IT NOW SENDS, 2026-08-26. This ran `invalidateAll()` — a LOCAL refetch of this presenter's own
      page — while telling them a command had gone out that "clears the user list" for the room. The
      wire and the delay it promises are on `refreshRoster` in `session-commands.remote.ts`.

      Alert BEFORE the await, because the reference raises it immediately with nothing waited on. A
      failure is still surfaced rather than swallowed.
    */
    if (action === 'session-refresh-roster') {
      this.#dialogs.alert =
        'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list';
      void refreshRoster().catch(() => (this.#dialogs.alert = 'Command failed.'));
      return true;
    }

    /*
      IT NOW SENDS. `softReset` broadcasts `softResetDone`; every client drops its remote media and
      rebuilds after up to three seconds of per-client jitter — the "gently" on the button's label.
      Receiver and measurement in `events.svelte.ts`.

      `#reload()` is GONE rather than kept beside the command: it re-read this presenter's own page,
      which is not what a media reset does to anybody, including them — the broadcast comes back to
      the sender like every other room frame.
    */
    if (action === 'session-soft-reset') {
      this.#dialogs.confirm('Are you sure you want to soft reset the room?', () => {
        this.#closeModal();
        this.#dialogs.alert = 'Soft reset request sent...';
        void softReset().catch(() => (this.#dialogs.alert = 'Command failed.'));
      });
      return true;
    }

    if (action === 'session-hard-reset' || action === 'session-hard-reset-revoke') {
      this.#dialogs.confirm('Are you sure you want to reset the room?', () => {
        this.#closeModal();
        this.#savePreference('sessionTokensRevoked', action === 'session-hard-reset-revoke');
        void this.#reload();
      });
      return true;
    }

    if (action === 'session-save-close') {
      this.#savePreference('sessionOpen', false);
      this.#closeModal();
      return true;
    }

    if (action === 'session-save-close-message') {
      this.#dialogs.alert = 'Message Saved';
      return true;
    }

    if (action === 'session-open') {
      this.#savePreference('sessionOpen', true);
      this.#closeModal();
      return true;
    }

    if (action === 'session-lock' || action === 'session-lock-kick') {
      this.#savePreference('sessionLocked', true);
      this.#savePreference('sessionLockKick', action === 'session-lock-kick');
      this.#dialogs.alert = 'Session Locked';
      return true;
    }

    if (action === 'session-unlock') {
      this.#savePreference('sessionLocked', false);
      this.#dialogs.alert = 'Session Unlocked';
      return true;
    }

    return false;
  }
}
