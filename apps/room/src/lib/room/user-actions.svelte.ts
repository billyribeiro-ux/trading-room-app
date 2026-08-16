import { isHttpError } from '@sveltejs/kit';

import {
  MUTE_ALL_CONFIRM,
  MUTE_STAGGER_MS,
  type RosterAuthority,
  type TalkingEntry,
  nonAdminTalkingUsers
} from '#lib/mute-all-non-admins.js';
import type { FollowChatStyle, ManagedChatUser, ModalName, ModalTargetUser } from '#lib/types.js';
import {
  MISSING_SCHEME_ALERT,
  addVideoToList,
  isAcceptableSendUrl,
  userActionAlert
} from '#lib/user-action-intent.js';

import type { RoomDialogs } from './dialogs.svelte';
import type { RoomToasts } from './toasts.svelte';

/** The load values every one of these actions reads, taken as a thunk. */
export interface UserActionSession<User> {
  user: { id: number };
  sessionHandle: string;
  connectedUsers: readonly User[];
}

/** The two wire commands this class sends, injected so it needs no route import. */
export interface UserActionCommands {
  /**
   * The three mute sub-commands, as the union the server accepts.
   *
   * Typed as `string` first, which pushed the mismatch to the construction site and made it read
   * as the page's problem. The server re-checks the caller either way; this is about the class
   * declaring what it can actually send.
   */
  presenter: (payload: {
    subCmd: 'mutemic' | 'mutecam' | 'mutescreens';
    targetUserId: number;
  }) => Promise<unknown>;
  editUsername: (payload: { userId: number; username: string }) => Promise<unknown>;
  unmuteChat: (payload: { targetUserId: number }) => Promise<unknown>;
}

/*
  Everything a presenter or a member can DO to a user, and the selection every one of those acts on.

  Phase 5 slice 13. Twenty declarations and functions, 461 lines, of which `handle` alone is 249 —
  the single largest function in `+page.svelte` before this slice. They belong together because
  they all read the same two things: WHO is selected, and what this viewer is allowed to do.

  ## `target` is the reason this is one class and not three

  `ModalHost` reads `targetUser` a hundred times. It is derived from two fields — the message you
  clicked, or the roster row you picked — and every action below either writes those fields or acts
  on what they resolve to. Splitting the selection from the actions would put a hundred reads on one
  side of a prop boundary and every write on the other.

  ## A getter, not a `$derived` field

  `target` reads `#session()`, which the constructor assigns. A `$derived` class field
  initialises in declaration order, before that assignment, so it would resolve against `undefined`
  exactly once and cache it. The same decision `RoomFiles.filesHidden` records.

  ## What it does NOT decide

  **The alert table.** `userActionAlert` is a transcription in `#lib/user-action-intent.js`, tested
  there. `handle` looks each action up; it does not carry the strings.

  **Who may mute whom.** `nonAdminTalkingUsers` is in `#lib/mute-all`, and `presenterCommand`
  re-checks the caller on the SERVER. What moved here is which control is drawn and what it prompts,
  never who may press it.

  **The muted and followed lists are this BROWSER's**, in `localStorage`, exactly as the capture
  keeps them — they are a local filter and not a room setting, which is why `#storeManaged` writes
  no command.

  ## Generic over the roster row, for the reason `RoomPrivateChat` records

  `targetFor`, `select`, `openInfoFor` and `mentionFromRoster` take a connected-user row and
  `select` passes it on. `typeof` cannot survive the move to a thunk, and narrowing would break
  the hand-off, so the row type is a parameter.
*/
export class RoomUserActions<
  User extends {
    id: number;
    displayName: string;
    email: string;
    emailHash: string;
    avatarUrl: string;
    status: string;
    role: string;
  }
> {
  readonly #dialogs: RoomDialogs;
  readonly #toasts: RoomToasts;
  readonly #commands: UserActionCommands;
  readonly #session: () => UserActionSession<User>;
  readonly #isPresenter: () => boolean;
  readonly #talking: () => readonly TalkingEntry[];
  readonly #rosterUsers: () => readonly RosterAuthority[];
  readonly #savePreference: (key: string, value: boolean) => void;
  readonly #openModal: (name: Exclude<ModalName, null>) => void;
  readonly #closeModal: () => void;
  readonly #closeUserMenu: () => void;
  readonly #mentionUser: (name: string) => void;
  readonly #defaultFollowStyle: () => FollowChatStyle;
  readonly #clearSelectedMessage: () => void;
  readonly #hidePreviewWindows: () => void;
  readonly #reload: () => Promise<void>;
  #mutedUsers: Record<string, ManagedChatUser>;
  #followedUsers: Record<string, ManagedChatUser>;
  #selectedUserId: number | null;
  #selectedMessageUser: ModalTargetUser | null;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    commands: UserActionCommands;
    session: () => UserActionSession<User>;
    isPresenter: () => boolean;
    /** `media.talking` — who has a microphone open, which is what "mute all" acts on. */
    talking: () => readonly TalkingEntry[];
    rosterUsers: () => readonly RosterAuthority[];
    savePreference: (key: string, value: boolean) => void;
    openModal: (name: Exclude<ModalName, null>) => void;
    closeModal: () => void;
    closeUserMenu: () => void;
    mentionUser: (name: string) => void;
    /**
     * `defaultFollowChatStyle` — INJECTED rather than moved, and that is deliberate twice over.
     *
     * It reads the theme preference, so it belongs with the preferences; and
     * `alerts-background-contract.test.ts` asserts it against `+page.svelte` by name, pinning the
     * captured default against the ROOM style it must not share a function with. Moving it would
     * have re-pointed a test that is about a colour rather than about this class.
     */
    defaultFollowStyle: () => FollowChatStyle;
    /** Owned by the message-action path; selecting a roster row clears it. */
    clearSelectedMessage: () => void;
    hidePreviewWindows: () => void;
    reload: () => Promise<void>;
  }) {
    this.#dialogs = options.dialogs;
    this.#toasts = options.toasts;
    this.#commands = options.commands;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#talking = options.talking;
    this.#rosterUsers = options.rosterUsers;
    this.#savePreference = options.savePreference;
    this.#openModal = options.openModal;
    this.#closeModal = options.closeModal;
    this.#closeUserMenu = options.closeUserMenu;
    this.#mentionUser = options.mentionUser;
    this.#defaultFollowStyle = options.defaultFollowStyle;
    this.#clearSelectedMessage = options.clearSelectedMessage;
    this.#hidePreviewWindows = options.hidePreviewWindows;
    this.#reload = options.reload;

    this.#mutedUsers = $state<Record<string, ManagedChatUser>>({});

    this.#followedUsers = $state<Record<string, ManagedChatUser>>({});

    this.#selectedUserId = $state<number | null>(null);

    this.#selectedMessageUser = $state<ModalTargetUser | null>(null);
  }

  get mutedUsers() {
    return this.#mutedUsers;
  }

  get followedUsers() {
    return this.#followedUsers;
  }

  get selectedUserId() {
    return this.#selectedUserId;
  }

  get selectedMessageUser() {
    return this.#selectedMessageUser;
  }

  /**
   * The message-action path selects a user too, so it can set this one directly.
   *
   * A setter rather than a receiver because there is no invariant to keep: it is one field, and
   * `target` reads it or falls through to the roster selection.
   */
  set selectedMessageUser(next: ModalTargetUser | null) {
    this.#selectedMessageUser = next;
  }

  /** `edit-my-info` and the private-chat close both clear the message selection. */
  clearSelectedMessageUser(): void {
    this.#selectedMessageUser = null;
  }

  /**
   * The roster's own "select this row" — the id alone, with no target object.
   *
   * A receiver rather than a setter on `selectedUserId`, because a bare setter would let a caller
   * change WHO is selected while leaving `#selectedMessageUser` pointing at somebody else, and
   * `target` prefers the message selection. Clearing it here is what keeps the two agreeing.
   */
  selectUserId(id: number | null): void {
    this.#selectedUserId = id;
    this.#selectedMessageUser = null;
  }

  get target(): ModalTargetUser {
    if (this.#selectedMessageUser) return this.#selectedMessageUser;
    const user = this.#session().connectedUsers.find(
      (connectedUser) => connectedUser.id === this.#selectedUserId
    );
    if (!user) {
      return {
        id: 0,
        nick: '',
        emailHash: 'undefined',
        pic: 'https://secure.gravatar.com/avatar/undefined?d=mm&s=80',
        status: 'offline',
        ip: 'n/a'
      };
    }
    return {
      id: user.id,
      nick: user.displayName,
      email: user.email,
      emailHash: user.emailHash,
      pic: user.avatarUrl,
      status: user.status,
      permissions: user.role === 'user' ? 'r' : 'a',
      ...(user.status !== 'offline' ? { userXrefID: String(user.id), _id: String(user.id) } : {})
    };
  }

  targetFor(user: User): ModalTargetUser {
    return {
      id: user.id,
      nick: user.displayName,
      email: user.email,
      emailHash: user.emailHash,
      pic: user.avatarUrl,
      status: user.status,
      permissions: user.role === 'user' ? 'r' : 'a',
      ...(user.status !== 'offline' ? { userXrefID: String(user.id), _id: String(user.id) } : {})
    };
  }

  select(user: User) {
    this.#selectedUserId = user.id;
    this.#selectedMessageUser = this.targetFor(user);
    this.#clearSelectedMessage();
    this.#closeUserMenu();
  }

  openInfoFor(user: User) {
    this.select(user);
    this.#openModal('user');
  }

  mentionFromRoster(user: User) {
    this.select(user);
    this.#mentionUser(user.displayName);
  }

  #readManaged(key: 'mutedUsers' | 'followedUsers') {
    if (typeof localStorage === 'undefined') return {};
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, ManagedChatUser>)
        : {};
    } catch {
      return {};
    }
  }

  loadManaged() {
    this.#mutedUsers = this.#readManaged('mutedUsers');
    this.#followedUsers = this.#readManaged('followedUsers');
  }

  #storeManaged(key: 'mutedUsers' | 'followedUsers', users: Record<string, ManagedChatUser>) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(users));
    }
  }

  #applyFollowToggle(user: ModalTargetUser) {
    const next = { ...this.#followedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic,
        userXrefID: user.userXrefID,
        _id: user._id,
        followChatStyle: this.#defaultFollowStyle()
      };
    }
    this.#followedUsers = next;
    this.#storeManaged('followedUsers', next);
  }

  applyFollowStyle(user: ModalTargetUser, style: FollowChatStyle) {
    const existing = this.#followedUsers[user.emailHash];
    if (!existing) return;
    const next = {
      ...this.#followedUsers,
      [user.emailHash]: {
        ...existing,
        followChatStyle: { ...style }
      }
    };
    this.#followedUsers = next;
    this.#storeManaged('followedUsers', next);
  }

  #applyMuteToggle(user: ModalTargetUser) {
    const next = { ...this.#mutedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic
      };
    }
    this.#mutedUsers = next;
    this.#storeManaged('mutedUsers', next);
  }

  requestFollowToggle(user: ModalTargetUser) {
    this.#dialogs.confirmation = {
      message: `Do you want to ${this.#followedUsers[user.emailHash] ? 'un' : ''}follow ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        this.#applyFollowToggle(user);
      }
    };
  }

  requestMuteToggle(user: ModalTargetUser) {
    this.#dialogs.confirmation = {
      message: `Do you want to ${this.#mutedUsers[user.emailHash] ? 'un' : ''}mute ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        this.#applyMuteToggle(user);
      }
    };
  }

  /**
   * `muteAllNonAdmins()` — `app-room.full.js:2963-2986`, reached through
   * `appEventBus.subscribe('muteAllNonAdmins', …)` (`:2219-2221`), which in this room is the
   * session-control action of the same name.
   *
   * **This replaced a control that did the wrong thing quietly.** It read
   * `muted = true; volume = 0` — so a presenter who asked the room to silence its non-admin
   * speakers silenced their OWN speakers instead, and every one of those microphones stayed open
   * for everybody else. The label and the effect were unrelated.
   *
   * The selection is `nonAdminTalkingUsers` in `#lib/mute-all-non-admins.js`, with the four properties
   * that matter transcribed and tested there — chiefly that a talking user with no roster row is
   * SKIPPED rather than assumed ordinary.
   *
   * **One mapping, stated because it is not a transcription.** Upstream sends its own
   * `sendServerCommand('muteTalkingUser', muser)`. This room has no such command; it has
   * `remotePresCommand` / `mutemic`, which is the same act addressed to one peer and is already
   * carried out by that peer's own browser (`:5917`). The server re-checks that the caller is a
   * presenter and that the subCmd is one of three (`+page.server.ts:1654-1670`), so authority is
   * decided there rather than asserted here.
   *
   * The 100ms stagger is the reference's and is not cosmetic: this is one request per muted member.
   */
  muteAllNonAdmins() {
    // `if (!globals.user.isPresenter) return` — the first line of the method, before the dialog.
    if (!this.#isPresenter()) return;
    // `!e || 0 === e.length ||` — with nobody speaking the confirm never opens at all.
    if (this.#talking().length === 0) return;

    this.#dialogs.confirmation = {
      message: MUTE_ALL_CONFIRM,
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        const targets = nonAdminTalkingUsers(this.#talking(), this.#rosterUsers());
        // `0 !== r.length &&` — an empty selection sends nothing, which is the case where every
        // open microphone belongs to a presenter.
        targets.forEach((entry, index) => {
          globalThis.setTimeout(() => {
            void this.#commands
              .presenter({ subCmd: 'mutemic', targetUserId: entry.userID })
              .catch((cause) => console.error('[presenterCommand]', cause));
          }, MUTE_STAGGER_MS * index);
        });
      }
    };
  }

  requestManagedRemoval(list: 'mutedUsers' | 'followedUsers', user: ManagedChatUser) {
    this.#dialogs.confirmation = {
      message: `Do you want to un${list === 'mutedUsers' ? 'mute' : 'follow'} ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        const next = { ...(list === 'mutedUsers' ? this.#mutedUsers : this.#followedUsers) };
        delete next[user.emailHash];
        if (list === 'mutedUsers') this.#mutedUsers = next;
        else this.#followedUsers = next;
        this.#storeManaged(list, next);
      }
    };
  }

  openManagedInfo(user: ManagedChatUser) {
    if (!user.userXrefID || !user._id) {
      this.#dialogs.alert = 'User is not logged in.';
      return;
    }
    this.#selectedMessageUser = {
      id: Number(user._id),
      nick: user.nick,
      emailHash: user.emailHash,
      pic: user.pic,
      status: 'online',
      userXrefID: user.userXrefID,
      _id: user._id
    };
    this.#openModal('user');
  }

  /** `invalidateAll()` only on the resolved path — the roster is this route's `load`, not a query. */
  async #updateUsername(user: ModalTargetUser, username: string) {
    const trimmed = username.trim();
    if (!trimmed) return;
    try {
      await this.#commands.editUsername({ userId: user.id, username: trimmed });
    } catch (cause) {
      this.#dialogs.alert = isHttpError(cause)
        ? cause.body.message
        : 'Could not change that username.';
      return;
    }
    await this.#reload();
  }

  /**
   * Lifts a member's chat mute — the other half of `mute24`.
   *
   * The mute was enforced on the server and the unmute was not sent anywhere: the modal's button
   * raised the reference's alert and stopped. `invalidateAll()` refreshes the presenter's own view
   * of the roster; the MEMBER learns about it on the `privCmds` channel, because their gate is
   * server-read and nothing local to them changed.
   *
   * That `invalidateAll()` runs by hand and has to: single-flight mutations refresh remote QUERIES,
   * and the presenter's roster is not one — it comes from this route's `load`. Converting it is its
   * own change, and doing it here would be claiming a refresh that never happens.
   *
   * The caller does not await this — `handleUserAction` is synchronous — but it DOES catch it. A
   * remote command rejects where the old `fetch('?/unmuteChat')` returned `response.ok === false`
   * for anyone who bothered to look, and nobody did; that is the same silent success this whole
   * path was built to fix. `chat-mute.remote.ts` carries the rest of the reasoning.
   */
  async #unmuteChat(user: ModalTargetUser) {
    await this.#commands.unmuteChat({ targetUserId: user.id });
    await this.#reload();
  }

  handle(action: string, user: ModalTargetUser) {
    if (action === 'session-reload-config') {
      this.#dialogs.confirm('Are you sure you want to reload tge session config?', () => {
        this.#closeModal();
        void this.#reload();
        this.#dialogs.alert = 'Session config reloaded...';
      });
      return;
    }

    /*
      The reference raises `alertService.success("Copied to clipboard.")` from all three of its
      copy buttons (`main.d6d3c112b59b7d0d.js` bytes 2168500-2169300). `alertService` is
      ngx-toastr, which is what `ToastHost` reproduces — so this is the same transient success
      toast, not a modal.
    */
    if (action === 'copied-to-clipboard') {
      this.#toasts.show({ kind: 'success', message: 'Copied to clipboard.', enableHtml: false });
      return;
    }

    if (action === 'session-refresh-roster') {
      void this.#reload();
      this.#dialogs.alert =
        'Command send OK. Please allow 1/2 minute for old entries to get deleted from the list';
      return;
    }

    if (action === 'session-soft-reset') {
      this.#dialogs.confirm('Are you sure you want to soft reset the room?', () => {
        this.#closeModal();
        void this.#reload();
        this.#dialogs.alert = 'Soft reset request sent...';
      });
      return;
    }

    if (action === 'session-hard-reset' || action === 'session-hard-reset-revoke') {
      this.#dialogs.confirm('Are you sure you want to reset the room?', () => {
        this.#closeModal();
        this.#savePreference('sessionTokensRevoked', action === 'session-hard-reset-revoke');
        void this.#reload();
      });
      return;
    }

    if (action === 'session-save-close') {
      this.#savePreference('sessionOpen', false);
      this.#closeModal();
      return;
    }

    if (action === 'session-save-close-message') {
      this.#dialogs.alert = 'Message Saved';
      return;
    }

    if (action === 'session-open') {
      this.#savePreference('sessionOpen', true);
      this.#closeModal();
      return;
    }

    if (action === 'session-lock' || action === 'session-lock-kick') {
      this.#savePreference('sessionLocked', true);
      this.#savePreference('sessionLockKick', action === 'session-lock-kick');
      this.#dialogs.alert = 'Session Locked';
      return;
    }

    if (action === 'session-unlock') {
      this.#savePreference('sessionLocked', false);
      this.#dialogs.alert = 'Session Unlocked';
      return;
    }

    if (action === 'invalid-restream-link') {
      this.#dialogs.alert =
        'Invalid RTMP link!, please make sure it starts with "rtmp://" and does not contain spaces or special characters. For example: rtmp://example.com/live/stream';
      return;
    }

    if (
      action === 'session-send-video' ||
      action === 'session-send-sales-image' ||
      action === 'session-send-users-url'
    ) {
      this.#dialogs.prompt = {
        title: 'Please enter the URL:',
        value: '',
        onconfirm: (value) => {
          const url = value.trim();
          this.#dialogs.prompt = null;
          if (!isAcceptableSendUrl(url)) {
            this.#dialogs.alert = MISSING_SCHEME_ALERT;
            return;
          }
          if (action === 'session-send-video') {
            const key = `videos-${this.#session().sessionHandle}`;
            const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
            const result = addVideoToList(stored, url);
            if (!result.added) {
              this.#dialogs.alert = 'Video already exists.';
              return;
            }
            localStorage.setItem(key, JSON.stringify(result.videos));
            this.#closeModal();
            this.#dialogs.alert = 'Video added.';
            return;
          }
          this.#closeModal();
          this.#dialogs.alert = 'Command send OK.';
        }
      };
      return;
    }

    if (action === 'edit-my-info') {
      this.#selectedMessageUser = null;
      this.#selectedUserId = this.#session().user.id;
      this.#openModal('user');
      return;
    }

    if (action === 'remove-preview-windows') {
      this.#hidePreviewWindows();
      return;
    }

    if (action === 'mute-all-non-admins') {
      this.muteAllNonAdmins();
      return;
    }

    if (action === 'edit-username') {
      // `editUsername(e)` - a presenter renaming somebody else. No pre-filled value, no length or
      // character rules: the capture accepts whatever a presenter types.
      this.#dialogs.prompt = {
        title: `Enter a new username for "${user.nick}":`,
        value: '',
        onconfirm: (value) => {
          this.#dialogs.prompt = null;
          void this.#updateUsername(user, value);
        }
      };
      return;
    }

    if (action === 'edit-username-by-user') {
      /*
        `editUsernameByUser(e)` - a member renaming THEMSELVES, and a different function from the
        one above in four ways the capture is explicit about:

          bootbox.prompt({ title: "Enter a new username for yourself:", value: this.user.nick, … })
          if (!/^[a-zA-Z0-9]+$/.test(o))  "Username can only contain letters and numbers"
          if (o.length < 3)               "Username must be at least 3 characters long"
          if (o.length >= 30)             "Username must be less than 30 characters long"
          … && this.user.nick?.trim() != o && (… setPreference("savedNick", o) …)

        The rules exist because this one is reachable by the person being renamed. Every string is
        the capture's, including "less than 30" on a `>= 30` test.
      */
      this.#dialogs.prompt = {
        title: 'Enter a new username for yourself:',
        value: user.nick,
        onconfirm: (value) => {
          this.#dialogs.prompt = null;
          const next = value?.trim() ?? '';
          if (next.length === 0) return;
          if (!/^[a-zA-Z0-9]+$/.test(next)) {
            this.#dialogs.alert = 'Username can only contain letters and numbers';
            return;
          }
          if (next.length < 3) {
            this.#dialogs.alert = 'Username must be at least 3 characters long';
            return;
          }
          if (next.length >= 30) {
            this.#dialogs.alert = 'Username must be less than 30 characters long';
            return;
          }
          // Unchanged is a no-op, not a round trip.
          if (user.nick?.trim() === next) return;
          void this.#updateUsername(user, next);
        }
      };
      return;
    }

    if (action === 'kick' || action === 'kick-ban') {
      this.#dialogs.prompt = {
        title: 'Enter the kick message for this user',
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          this.#dialogs.prompt = null;
          this.#closeModal();
          this.#dialogs.alert = 'User kicked OK';
        }
      };
      return;
    }

    if (action === 'kick-duplicates') {
      this.#dialogs.prompt = {
        title: `Kick all other duplicates of ${user.nick} with the following message:`,
        value: 'You have been kicked from the room by an administrator',
        onconfirm: () => {
          this.#dialogs.prompt = null;
          this.#closeModal();
          this.#dialogs.alert = `No duplicates found for ${user.nick}`;
        }
      };
      return;
    }

    if (action === 'admin-notes-password') {
      this.#dialogs.prompt = {
        title: "Please enter the password to manage user's notes:",
        value: '',
        onconfirm: () => {
          this.#dialogs.prompt = null;
          this.#dialogs.alert = 'Wrong password!';
        }
      };
      return;
    }

    /*
      Ahead of `userActionAlert` below because this one sends something — see `EXACT_ALERTS` in
      `user-action-intent.ts` for why leaving it in that table was the bug. The alert is raised
      first because the reference raises it immediately; `Command failed.` is inherited from the
      sibling handlers in this file, not captured, because the reference never showed us a failure
      for this control.
    */
    if (action === 'unmute-chat') {
      this.#dialogs.alert = 'user chat unmuted';
      void this.#unmuteChat(user).catch(() => {
        this.#dialogs.alert = 'Command failed.';
      });
      return;
    }

    // The table moved to `user-action-intent.ts`; the state writes stay here. See it for why.
    const fixedAlert = userActionAlert(action);
    if (fixedAlert) {
      if (action === 'save-permissions') this.#closeModal();
      this.#dialogs.alert = fixedAlert;
    }
  }
}
