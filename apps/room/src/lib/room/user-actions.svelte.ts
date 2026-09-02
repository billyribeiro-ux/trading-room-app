import { isHttpError } from '@sveltejs/kit';

import {
  MUTE_ALL_CONFIRM,
  MUTE_STAGGER_MS,
  MUTE_TALKING_USER_CONFIRM_WORD,
  type RosterAuthority,
  type TalkingEntry,
  muteTalkingUserPrompt,
  nonAdminTalkingUsers
} from '#lib/mute-all-non-admins.js';
import type { RoomPermissionKey } from '#lib/permission-keys.js';
import { playSoundEffect } from '#lib/sound-effects.js';
import type { FollowChatStyle, ManagedChatUser, ModalName, ModalTargetUser } from '#lib/types.js';
import {
  MISSING_SCHEME_ALERT,
  PEER_SUBCMDS,
  addVideoToList,
  isAcceptableSendUrl,
  userActionAlert
} from '#lib/user-action-intent.js';

import { RoomChatMute } from './chat-mute';
import {
  MODAL_TARGET_PLACEHOLDER,
  modalTargetFromManagedUser,
  modalTargetFromRosterRow,
  type RosterRowForTarget
} from './modal-target';
import type { UserActionCommands } from './user-action-commands';
import type { RoomDialogs } from './dialogs.svelte';
import { RoomKicks } from './kicks';
import { RoomAdminNotes, type NotesPort } from './admin-notes';
import { RoomManagedUsers } from './managed-users.svelte';
import { RoomProfilePicture } from './profile-picture';
import { RoomSessionControl } from './session-control';
import type { RoomUserDetail } from './user-detail';
import type { RoomToasts } from './toasts.svelte';

/** The load values every one of these actions reads, taken as a thunk. */
export interface UserActionSession<User> {
  user: { id: number };
  sessionHandle: string;
  connectedUsers: readonly User[];
}

/** The two wire commands this class sends, injected so it needs no route import. */

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
export class RoomUserActions<User extends RosterRowForTarget> {
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
  readonly #chatMute: RoomChatMute;
  /*
    The two viewer-local lists moved to `RoomManagedUsers` on 2026-08-23, under the owner's ruling
    that a file over its ceiling is extracted rather than raised. The getters below still expose
    them from here because `ModalHost` reads them through this object and re-pointing every call
    site would be a wider change than the extraction itself — and because a `$derived` read through
    a getter is the same signal read, so nothing is lost.
  */
  readonly #managed: RoomManagedUsers;
  readonly #kicks: RoomKicks<User>;
  /** The `userInfoDB` lookup's answers. Injected, because the wire lives in `create-room`. */
  readonly #detail: RoomUserDetail;
  /** Set and clear one member's avatar. Built here for `RoomKicks`' reason — see that class. */
  readonly #profilePicture: RoomProfilePicture;
  #selectedUserId: number | null;
  #selectedMessageUser: ModalTargetUser | null;

  constructor(options: {
    dialogs: RoomDialogs;
    toasts: RoomToasts;
    commands: UserActionCommands;
    /** The Admin Notes wire — the door and the list behind it. See `NotesPort`. */
    notesPort: NotesPort;
    /** Last Login and the address, for a target the roster cannot describe. See `RoomUserDetail`. */
    userDetail: RoomUserDetail;
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

    /*
      BUILT HERE, EXPOSED BELOW. `#announceThenSend` is private to this class and both mute buttons
      need it, so constructing the slice from outside would mean a second copy of it — the same
      argument that put `RoomKicks` right beneath. The muted MEMBER's two receivers live in
      `RoomEventStream`, which is handed this instance rather than a second one; the whole reason
      the slice exists is that those two ends must not sit in files that cannot see each other.
    */
    this.#chatMute = new RoomChatMute({
      commands: options.commands,
      alert: (message) => (options.dialogs.alert = message),
      // A TOAST for the release, a DIALOG for the mute. The asymmetry is upstream's — see the slice.
      notice: (message) => options.toasts.show({ kind: 'info', message, enableHtml: false }),
      reload: options.reload,
      announceThenSend: (message, send) => this.#announceThenSend(message, send)
    });

    this.#managed = new RoomManagedUsers(options.defaultFollowStyle);
    this.#notes = new RoomAdminNotes(options.dialogs, options.notesPort);
    this.#kicks = new RoomKicks<User>({
      dialogs: options.dialogs,
      commands: options.commands,
      roster: () => this.#session().connectedUsers,
      closeModal: () => this.#closeModal(),
      announceThenSend: (message, send) => this.#announceThenSend(message, send)
    });

    this.#detail = options.userDetail;
    this.#profilePicture = new RoomProfilePicture({
      commands: options.commands,
      alert: (message) => (options.dialogs.alert = message)
    });

    this.#selectedUserId = $state<number | null>(null);

    this.#selectedMessageUser = $state<ModalTargetUser | null>(null);
  }

  /** The chat mute, handed to `RoomEventStream` so both ends share one instance. */
  get chatMute(): RoomChatMute {
    return this.#chatMute;
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

  /**
   * The notes-password door — see `RoomNotesAccess`. It lived here, pushed this class 98 lines past
   * its ceiling, and left the way the ratchet asks: extract rather than raise. The fourth slice out,
   * after `RoomChatMute`, `RoomKicks` and `RoomSessionControl`.
   */
  readonly #notes: RoomAdminNotes;

  get userNotes(): RoomAdminNotes['list'] {
    return this.#notes.list;
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

  /**
   * Ask the server for the card's Last Login and address — called when the card is SHOWN.
   *
   * `RoomModals.open` calls this from the branch it already has for `'user'`, which is the one place
   * every entry point converges: the roster row, the chat message, and the followed/muted lists all
   * reach the card through `openModal('user')`.
   *
   * The first draft hung it off `set selectedMessageUser` instead and that was WRONG, not merely
   * different. `message-actions.handle` selects the sender for EVERY action it dispatches — mention,
   * reply, report, question, delete — so a presenter clicking "Mention" would have triggered a
   * lookup of that member's email address. A request for data nobody asked to see, on a field this
   * repository restricts to presenters on purpose.
   */
  hydrateDetail(): void {
    this.#detail.hydrate(this.target.id);
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

  /**
   * The member the user modal is about — the message selection if there is one, else the roster's.
   *
   * Delegates to `targetFor` so a `User` becomes a `ModalTargetUser` in ONE place. It did not, and
   * the second construction was missing all five permission fields; `entitlement-shape-contract.test.ts`
   * records what that costs, why nothing reached it, and refuses a third.
   */
  get target(): ModalTargetUser {
    return this.#detail.decorate(this.#resolveTarget());
  }

  /** Who is selected, before the server's additions. Split out only so `target` stays one line. */
  #resolveTarget(): ModalTargetUser {
    if (this.#selectedMessageUser) return this.#selectedMessageUser;
    const user = this.#session().connectedUsers.find(
      (connectedUser) => connectedUser.id === this.#selectedUserId
    );
    // No `User` at all: a placeholder for a modal that should not be open. See the contract test.
    if (!user) return MODAL_TARGET_PLACEHOLDER;
    return this.targetFor(user);
  }

  /**
   * A roster row as the modal sees it.
   *
   * The mapping itself is `modalTargetFromRosterRow` in `room/modal-target.ts`, with a message's
   * sender beside it — one subject, one module, testable without building this class. This method
   * stays because it is the name every caller and contract test already uses, and because `select`,
   * `openInfoFor` and `mentionFromRoster` all route through it.
   */
  targetFor(user: User): ModalTargetUser {
    return modalTargetFromRosterRow(user);
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

  /**
   * ── G04 — `muteTalkingUserDialog(e)`, the navbar speaker names' own control ───────────────────
   *
   * ```js
   * muteTalkingUserDialog(e) {
   *   this.appService.globals.user.isPresenter && bootbox.prompt(
   *     "Would you like to force stop " + e.mediaValue.name +
   *     " from talking? (forces a remote mute for all). type: yes to proceed",
   *     i => { i && "yes" == i.toLowerCase() &&
   *            this.appService.sendServerCommand("muteTalkingUser", e) })
   * }
   * ```
   *
   * (bundle byte 2,529,373; the click that reaches it is `d(0,"span",147)` at 2,473,449, one per
   * name in the talking indicator.) The speaker names in this room's navbar were a bare `<span>`,
   * so a presenter watching somebody hold the floor had no way to take it back short of opening the
   * roster and finding them — and `muteAllNonAdmins`, which IS built, is all-or-nothing.
   *
   * ## A PROMPT and not a confirm, because the reference chose the harder gesture
   *
   * The word has to be typed. That is upstream's, and it is right for what this does: it mutes a
   * microphone for *everyone in the room*, not for the presenter pressing it, and an accidental
   * click on a name in a list of names is exactly the mistake a confirm dialog does not prevent.
   * The comparison is `toLowerCase()`'d and anything else — including an empty box — sends nothing.
   *
   * ## The command mapping is `muteAllNonAdmins`'s, and is not repeated here
   *
   * Upstream's `sendServerCommand('muteTalkingUser', muser)` has no counterpart in this room;
   * `remotePresCommand` / `mutemic` is the same act addressed to one peer, carried out by that
   * peer's own browser, with the server re-checking that the caller is a presenter and that the
   * subCmd is one of three (`+page.server.ts:1654-1670`). The reasoning is written out once, on
   * `muteAllNonAdmins` above; this is the single-target door to the same corridor.
   */
  muteTalkingUserDialog(user: TalkingEntry) {
    // `this.appService.globals.user.isPresenter &&` — the whole method is behind it, so a member
    // clicking a name gets no dialog rather than a dialog whose Send is refused.
    if (!this.#isPresenter()) return;

    this.#dialogs.prompt = {
      title: muteTalkingUserPrompt(user.mediaValue.name),
      // `bootbox.prompt(message, callback)` — no `value`, so the box opens empty.
      value: '',
      onconfirm: (value) => {
        this.#dialogs.prompt = null;
        // `i && "yes" == i.toLowerCase()` — verbatim, including that it is not trimmed upstream.
        if (!value || value.toLowerCase() !== MUTE_TALKING_USER_CONFIRM_WORD) return;
        void this.#commands
          .presenter({ subCmd: 'mutemic', targetUserId: user.userID })
          .catch((cause) => console.error('[presenterCommand]', cause));
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
    this.#selectedMessageUser = modalTargetFromManagedUser({
      ...user,
      userXrefID: user.userXrefID,
      _id: user._id
    });
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

  handle(action: string, user: ModalTargetUser) {
    /*
      SESSION actions first, and they are not user actions at all — see `RoomSessionControl` for why
      eleven names left this file on 2026-08-23. Asked here rather than routed at the call site so
      `ModalHost` keeps ONE `onUserAction` door: making the caller choose which class owns a string
      is the coupling that turned "Bring everyone here" into a lie.

      `false` means "not mine", never "nothing happened".
    */
    if (this.#sessionControl.handle(action)) return;
    // The chat mute owns both of its buttons, for the reason `RoomChatMute` opens with: the pair
    // drifted while the presenter's half and the member's half lived in files that could not see
    // each other. `false` means "not mine".
    if (this.#chatMute.handle(action, user.id)) return;

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
          // SENDS since 2026-08-23; both alerted and sent nothing. See `sessionSendUrl`.
          this.#closeModal();
          this.#announceThenSend('Command send OK.', () =>
            this.#commands.sessionSendUrl({
              cmd:
                action === 'session-send-sales-image' ? 'sendSalesImageToChat' : 'sendUsersToURL',
              url
            })
          );
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

    if (action === 'get-my-token') {
      /*
        `getMyToken()`, byte 2,255,348 — "Session Information".

        Upstream hides the user-settings modal first (`$("#user-settings-modal").modal("hide")`) and
        then opens a bootbox on top. `#openModal` is a single-slot host, so opening this one closes
        that one: the same visible outcome by the mechanism this room already has, rather than two
        modals racing for the backdrop.

        The dialog is half refused, and the refusal is on screen rather than here — see
        `SessionInfoModal.svelte`, which carries the whole argument: the token field would mean the
        server writing an httpOnly cookie into the DOM.
      */
      this.#openModal('session-info');
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
    /*
      `kick` and `kick-duplicates` moved to `RoomKicks` on 2026-08-23 — what a presenter does to
      remove a PERSON, the other half of the sentence `RoomSessionControl` owns. Delegated here for
      the same reason session actions are: the chain stays a chain.
    */
    if (this.#kicks.handle(action, user)) return;

    if (action === 'admin-notes-password') {
      /*
        ROW W'S LAST LYING CONTROL, WIRED 2026-08-29.

        This branch used to raise the prompt and then set `'Wrong password!'` UNCONDITIONALLY — its
        `onconfirm` took no parameter, so the typed value was never received, not merely uncompared.
        A presenter typing the correct password was told it was wrong every time.

        The primitive was never at fault: `RoomPrompt.onconfirm` is `(value: string) => void` and
        `BootboxDialog.svelte` calls `onconfirm?.(promptResult())`. The value arrived and was thrown
        away. What was missing was somewhere for it to go — see `routes/notes-auth.remote.ts`.

        Fire-and-forget because `handle` is synchronous for every other action and the answer lands
        in a dialog, not in this call's return. `void` rather than a floating promise so the intent
        is declared: nothing here awaits, and the rejection path is handled inside.
      */
      void this.#notes.ask(user.id);
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
    /*
      THE PEER COMMANDS, all of which had their wire built before their buttons did. Three arrived on
      2026-08-23 and `restart-screens` on 2026-08-26; `user-action-intent.ts` carries the full
      account of each, including that all four `INERT_ACTIONS` entries named a blocker that did not
      exist. ONE BRANCH for all of them, because they differ only in the string they carry.

      NO SUCCESS ALERT, and that is the capture rather than an omission. `remotePresCommand(c)` at
      byte 2080529 is one line — `sendServerAdminCommand("remotePresCommand", {user, cmd:c})` — with
      no `bootbox` after it, unlike `forceReload` and `remoteRestartAudio` two lines below, which
      both raise one. Adding one here would invent a string.

      A FAILURE is loud anyway. Silent-on-success is the reference; silent-on-FAILURE is the defect
      class this whole sweep exists to remove, and a member whose microphone was not cut is
      something the presenter has to know about.

      The modal is NOT closed. Every neighbouring branch that closes it does so on evidence; nothing
      read says these do, and closing it would be a behaviour this room invented.
    */
    if (action in PEER_SUBCMDS) {
      void this.#commands
        .presenter({ subCmd: PEER_SUBCMDS[action], targetUserId: user.id })
        .catch(() => (this.#dialogs.alert = 'Command failed.'));
      return;
    }
    /*
      `restart-audio` — WIRED 2026-08-23, the FOURTH entry to leave `EXACT_ALERTS` and the last of
      that family with a captured wire already waiting for it. It raised
      "Audio restart request sent OK" over nothing for the whole port, while both halves sat in the
      bundle: `sendServerAdminCommand("remoteRestartAudio", user)` at byte 2080461 and
      `subscribe("remoteRestartAudio", () => this.reconnectAudio())` at 1119299.

      `#announceThenSend`, because unlike the three peer mutes above this one DOES carry an alert in
      the capture — the sender raises one and the three `remotePresCommand` buttons do not. Two
      neighbouring methods, two different behaviours, both reproduced.
    */
    if (action === 'restart-audio') {
      this.#announceThenSend(userActionAlert('restart-audio') ?? '', () =>
        this.#commands.restartAudio(user.id)
      );
      return;
    }
    if (action === 'force-reload') {
      this.#announceThenSend('Reload request sent OK', () => this.#commands.forceReload(user.id));
      return;
    }

    /*
      `debug-log` — WIRED 2026-08-29, and it leaves `INERT_ACTIONS` with this branch.

      NO ANNOUNCEMENT, deliberately, and it is the difference between this and `force-reload`
      directly above. The capture's sender is one line with no `bootbox` after it:

        getDebugLog(){ this.appService.sendServerAdminCommand("getDebugLog", this.user) }   // 2080323

      so `#announceThenSend` would be inventing an alert the reference does not raise — which is the
      `EXACT_ALERTS` shape four commits have been removing, arriving from the other direction.

      The modal is opened by the ANSWER rather than by the click, for the same reason: there is
      nothing to show until a log arrives, and an empty textarea that appears immediately would read
      as "this member has no log" rather than as "waiting".
    */
    if (action === 'debug-log') {
      void this.#commands.requestDebugLog(user.id);
      return;
    }

    /*
      `upload-profile-picture` reaches `uploadProfilePicture` BELOW rather than a branch here, and
      that is not an inconsistency — it is the same call `save-permissions` makes. This dispatcher
      carries an action name and a user; a control that also carries a FILE cannot use it without
      widening the signature for every other action, and a prop shared between two different acts is
      what lets a control look wired while doing something else.
    */

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

  /*
    Forwarded rather than re-pointed at their new home, and that is the smaller change of the two.
    `ModalHost` and `handle()`'s `upload-profile-picture` branch call these on this object; moving
    the call sites would have put a second collaborator in the modal's props for a slice whose whole
    behaviour is two commands. `RoomKicks` is exposed the same way, for the same reason.
  */
  uploadProfilePicture(user: ModalTargetUser, file: File): void {
    this.#profilePicture.uploadProfilePicture(user, file);
  }

  removeProfilePicture(user: ModalTargetUser): void {
    this.#profilePicture.removeProfilePicture(user);
  }
}
