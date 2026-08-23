import { isHttpError } from '@sveltejs/kit';

import {
  MUTE_ALL_CONFIRM,
  MUTE_STAGGER_MS,
  type RosterAuthority,
  type TalkingEntry,
  nonAdminTalkingUsers
} from '#lib/mute-all-non-admins.js';
import type { RoomPermissionKey } from '#lib/permission-keys.js';
import { playSoundEffect } from '#lib/sound-effects.js';
import type { FollowChatStyle, ManagedChatUser, ModalName, ModalTargetUser } from '#lib/types.js';
import {
  MISSING_SCHEME_ALERT,
  addVideoToList,
  isAcceptableSendUrl,
  userActionAlert
} from '#lib/user-action-intent.js';

import type { RoomDialogs } from './dialogs.svelte';
import { RoomManagedUsers } from './managed-users.svelte';
import { RoomSessionControl } from './session-control.svelte';
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
  /** `forceReload` — reloads ONE member's browser. Presenter-gated on the server. */
  forceReload: (targetUserId: number) => Promise<unknown>;
  /**
   * `kickUser` — removes ONE member. Presenter-gated on the server, like `forceReload`.
   *
   * NO `ban` FIELD, deliberately. The reference's payload carries `ban` and `kickAllInstances`; a ban
   * needs somewhere durable to record that the person may not return, and this room has none. Taking
   * the flag and dropping it would be the same defect this command was added to fix — see
   * `presenter-commands.remote.ts`.
   */
  kickUser: (payload: { targetUserId: number; message: string }) => Promise<unknown>;
  /**
   * `saveCustomPerms` — the five checkboxes, written through to the CONTROLLER.
   *
   * The only command here that changes something durable rather than broadcasting; see
   * `permissions.remote.ts` for why it is a module of one.
   */
  savePermissions: (payload: {
    targetUserId: number;
    granted: RoomPermissionKey[];
  }) => Promise<unknown>;
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
    /*
      The five permission checkboxes, optional because they reach this class through two paths and
      `targetFor` must not care which. Both DO carry them — `+page.server.ts` on the load and
      `sess/[room]/events` on the `/roster/` frame — but a member's copy is redacted to all-false at
      the hub, so this type must not promise the truth, only the shape.
    */
    hasAdminChat?: boolean;
    hasMic?: boolean;
    hasScreen?: boolean;
    hasCam?: boolean;
    canEditNotes?: boolean;
  }
> {
  readonly #dialogs: RoomDialogs;
  readonly #sessionControl: RoomSessionControl;
  readonly #toasts: RoomToasts;
  readonly #commands: UserActionCommands;
  readonly #session: () => UserActionSession<User>;
  readonly #isPresenter: () => boolean;
  readonly #talking: () => readonly TalkingEntry[];
  readonly #rosterUsers: () => readonly RosterAuthority[];
  readonly #openModal: (name: Exclude<ModalName, null>) => void;
  readonly #closeModal: () => void;
  readonly #closeUserMenu: () => void;
  readonly #mentionUser: (name: string) => void;
  readonly #clearSelectedMessage: () => void;
  readonly #hidePreviewWindows: () => void;
  readonly #reload: () => Promise<void>;
  /*
    The two viewer-local lists moved to `RoomManagedUsers` on 2026-08-23, under the owner's ruling
    that a file over its ceiling is extracted rather than raised. The getters below still expose
    them from here because `ModalHost` reads them through this object and re-pointing every call
    site would be a wider change than the extraction itself — and because a `$derived` read through
    a getter is the same signal read, so nothing is lost.
  */
  readonly #managed: RoomManagedUsers;
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
    /*
      Built HERE rather than injected, deliberately. It needs four collaborators this class already
      holds, so injecting it would make every caller assemble the same object out of things it had
      just handed over — and `create-room` is the one file that would grow to do it. Tests reach the
      session actions through `handle()` exactly as `ModalHost` does, which is the behaviour worth
      asserting; nothing needs to substitute this.
    */
    this.#sessionControl = new RoomSessionControl({
      dialogs: options.dialogs,
      closeModal: options.closeModal,
      reload: options.reload,
      savePreference: (key, value) => options.savePreference(key, value)
    });
    this.#toasts = options.toasts;
    this.#commands = options.commands;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#talking = options.talking;
    this.#rosterUsers = options.rosterUsers;
    this.#openModal = options.openModal;
    this.#closeModal = options.closeModal;
    this.#closeUserMenu = options.closeUserMenu;
    this.#mentionUser = options.mentionUser;
    this.#clearSelectedMessage = options.clearSelectedMessage;
    this.#hidePreviewWindows = options.hidePreviewWindows;
    this.#reload = options.reload;

    this.#managed = new RoomManagedUsers(options.defaultFollowStyle);

    this.#selectedUserId = $state<number | null>(null);

    this.#selectedMessageUser = $state<ModalTargetUser | null>(null);
  }

  get mutedUsers() {
    return this.#managed.mutedUsers;
  }

  get followedUsers() {
    return this.#managed.followedUsers;
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
      /*
        THE FIVE CHECKBOXES, carried through — and note they land on FLAT fields while arriving in a
        nested one. `ModalTargetUser.permissions` is already taken, by an unrelated `'r' | 'a'`
        string one line above, so reusing the name here would have silently overwritten it.

        Without this the modal read `undefined` for all five and `Boolean(undefined)` drew every box
        unchecked, whatever the membership said. Cosmetic while Save sent nothing; a REVOCATION the
        moment it started, because the endpoint writes `false` for every key it is not given.
      */
      hasMic: user.hasMic ?? false,
      hasScreen: user.hasScreen ?? false,
      hasCam: user.hasCam ?? false,
      canEditNotes: user.canEditNotes ?? false,
      hasAdminChat: user.hasAdminChat ?? false,
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

  /** Called once on mount by `+page.svelte`. Both lists come back, or both come back empty. */
  loadManaged() {
    this.#managed.load();
  }

  /**
   * `saveFollowChatStyle` — kept on THIS object because `RoomOverlays.svelte:560` calls it here.
   *
   * A one-line delegate rather than a re-pointed call site: the extraction that moved the storage
   * was about a ceiling, and widening it into every consumer would have made a bookkeeping change
   * into a behavioural one.
   */
  applyFollowStyle(user: ModalTargetUser, style: FollowChatStyle) {
    this.#managed.applyFollowStyle(user, style);
  }

  requestFollowToggle(user: ModalTargetUser) {
    this.#dialogs.confirmation = {
      message: `Do you want to ${this.#managed.isFollowed(user.emailHash) ? 'un' : ''}follow ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        this.#managed.applyFollowToggle(user);
      }
    };
  }

  requestMuteToggle(user: ModalTargetUser) {
    this.#dialogs.confirmation = {
      message: `Do you want to ${this.#managed.isMuted(user.emailHash) ? 'un' : ''}mute ${user.nick}?`,
      className: 'manage-user-list',
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        this.#managed.applyMuteToggle(user);
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
        this.#managed.remove(list, user.emailHash);
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

  /** Raise the captured alert, fire the command, and replace the alert only if it refuses. */
  #announceThenSend(alert: string, send: () => Promise<unknown>): void {
    this.#dialogs.alert = alert;
    void send().catch(() => {
      this.#dialogs.alert = 'Command failed.';
    });
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
    /*
      SESSION actions first, and they are not user actions at all — see `RoomSessionControl` for why
      eleven names left this file on 2026-08-23. Asked here rather than routed at the call site so
      `ModalHost` keeps ONE `onUserAction` door: making the caller choose which class owns a string
      is the coupling that turned "Bring everyone here" into a lie.

      `false` means "not mine", never "nothing happened".
    */
    if (this.#sessionControl.handle(action)) return;

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

    /*
      `kick` NOW SENDS. It used to alert *"User kicked OK"* while sending nothing, because no kick
      command existed — a control that reported success. The captured wire, and why that is worse
      than an inert control, are on `kickUser` in `presenter-commands.remote.ts`.

      `kick-ban` IS DELIBERATELY NOT WIRED: a ban must outlive the frame and this room has nowhere to
      record it, so aliasing it here would drop the ban silently. It is in `INERT_ACTIONS` with that
      reason.
    */
    if (action === 'kick') {
      this.#dialogs.prompt = {
        title: 'Enter the kick message for this user',
        value: 'You have been kicked from the room by an administrator',
        onconfirm: (message: string) => {
          this.#dialogs.prompt = null;
          this.#closeModal();
          this.#announceThenSend('User kicked OK', () =>
            this.#commands.kickUser({ targetUserId: user.id, message })
          );
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
      THE TWO CONTROLS THAT ACTUALLY SEND, ahead of the alert tail because they do.

      Both were keys of `EXACT_ALERTS` once, and in both cases their presence in that table WAS the
      bug — see `user-action-intent.ts` for each. They are written through one helper rather than
      twice, which is this module's own argument applied to itself: the invariant is declared once
      and both callers use it, so the two cannot drift the way the mute check did between
      `sendMessage` and `replyMessage`.

      The alert is raised BEFORE the command resolves because the reference raises it immediately.
      `Command failed.` is inherited from the sibling handlers here, not captured — the reference
      never showed us a failure for either control.
    */
    if (action === 'unmute-chat') {
      this.#announceThenSend('user chat unmuted', () => this.#unmuteChat(user));
      return;
    }
    if (action === 'force-reload') {
      this.#announceThenSend('Reload request sent OK', () => this.#commands.forceReload(user.id));
      return;
    }

    /*
      `test-follow-sound` — WIRED 2026-08-23, and the sound is `pling` because the reference says so.

      This sat in `INERT_ACTIONS` reading *"which sound the reference plays here is not evidenced"*.
      It is evidenced. The method is `testFollowChatSound`, which is why three sessions of searching
      for `testFollowSound` / `followSound` / `Follow Sound` found nothing — the word `Chat` sits in
      the middle of the name. At byte 2075886 of `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`:

        testFollowChatSound(){
          return this.followChatStyle.playSound && this.soundEffectsService.pling.play(), !1
        }

      `pling` is already in `SOUND_EFFECT_SOURCES` and `static/assets/sound/pling.{mp3,ogg}` are
      already on disk, so nothing new is downloaded, added or guessed.

      ## Why there is no `playSound` re-check here, and why that is not a weakening

      The reference guards twice: once on the button — `z("disabled", !e.followChatStyle.playSound)`
      — and once inside the method. Ours already carries the first, at `ModalHost.svelte:2547`
      (`disabled={!followChatStyle.playSound}`), against the same flag, with the same two titles
      (`'Chat sound is on.'` / `'Chat sound is off.'`) and the same `fa-volume-up` / `fa-volume-mute`
      swap the reference binds beside it.

      The second guard cannot be reproduced without widening the dispatcher: `handle(action, user)`
      carries no payload, and the style being tested is the LIVE, possibly-unsaved one held in the
      modal — not `#followedUsers[emailHash].followChatStyle`, which is the SAVED one and would be
      the wrong value to test. `saveCustomPerms` is a prop for exactly this reason and says so.
      Reading the saved style here would look faithful and be wrong; a disabled button that cannot
      be clicked is faithful and right.

      It is the only one of the eleven inert controls that needed no server, which is why it is the
      only one being built today.
    */
    if (action === 'test-follow-sound') {
      playSoundEffect('pling');
      return;
    }

    // The table moved to `user-action-intent.ts`; the state writes stay here. See it for why.
    const fixedAlert = userActionAlert(action);
    if (fixedAlert) {
      this.#dialogs.alert = fixedAlert;
    }
  }

  /**
   * `saveCustomPerms` — the five permission checkboxes, sent this time.
   *
   * NOT part of `handle()`, and the reason is the same one that gave it its own prop in
   * `ModalHost`: every action `handle` takes is `(name, user)` with no payload, and this one carries
   * the state of five boxes. Squeezing it in would mean widening the one dispatcher every control in
   * the modal shares.
   *
   * ## The order of the three steps is the capture's
   *
   * Byte 2077194: `sendServerAdminCommand(...)`, `doCloseModal()`, `bootbox.alert(...)`, then
   * `loadRoster()`. The send is FIRST and is not awaited before the modal closes — upstream is
   * fire-and-forget over a socket, and a presenter who has to watch a spinner for a round trip is a
   * behaviour the reference does not have.
   *
   * ## The refusal replaces the alert rather than adding one
   *
   * `#announceThenSend` is the existing shape for exactly this: raise the captured wording, and if
   * the command rejects, overwrite it with `Command failed.` A second dialog stacked on the first
   * would leave the presenter reading "Permissions applied" underneath "it did not".
   *
   * The reload the alert promises — *"user will reload the page now to apply..."* — is the
   * `permsChangeReload` receiver, which is NOT built: it navigates to a `reAuthSessionTok` endpoint
   * this deployment does not have (`TODO.md`). So the member picks the change up on their next load
   * rather than immediately, and that gap is recorded rather than papered over by inventing a
   * broadcast the capture does not describe.
   */
  savePermissions(user: ModalTargetUser, granted: readonly RoomPermissionKey[]): void {
    this.#closeModal();
    this.#announceThenSend(userActionAlert('save-permissions') ?? '', () =>
      this.#commands.savePermissions({ targetUserId: user.id, granted: [...granted] })
    );
  }
}
