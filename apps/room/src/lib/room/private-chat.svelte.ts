import { isHttpError } from '@sveltejs/kit';

import { restoreAfterLoadMore, scrollPrivateChatToBottom } from './private-chat-scroll';
import { startTitleFlash, stopTitleFlash } from './private-chat-title-flash';

import {
  mergeOlderMessagesBy,
  newLoadMorePaging,
  settleLoadMore,
  startLoadMore
} from '#lib/chat-paging.js';

import { RoomPeerHistory } from './peer-history.svelte';

import { formatCompactTime } from '#lib/compact-message-time.js';

import {
  canShowRosterPrivateChat,
  resolveRosterPrivateChatStart
} from '#lib/roster-private-chat.js';
import type { SoundEffectName } from '#lib/sound-effects.js';

import type { RoomDialogs } from './dialogs.svelte';

/**
 * One frame off the private channel.
 *
 * `privChatLog` is keyed by PEER id, never by message direction — the capture buckets an incoming
 * frame with `isMine = te.uid == myUserID` then `privChatLog[isMine ? te.recvdID : te.uid]`, so
 * both halves of a conversation land in one array.
 *
 * Moved here from `+page.svelte` with the code that reads it.
 */
export type PrivateChatMessage = {
  _id: string;
  t: number;
  n: string;
  txt: string;
  uid: number;
  recvdID: number;
  avt: string;
  pic: string;
  isA: boolean;
};

/**
 * One conversation in the tab strip, most-recently-active last.
 *
 * A DUPLICATE of `PrivateChatPanel.svelte`'s exported interface of the same name, and it was
 * already a duplicate before this class existed — the page declared its own alias rather than
 * importing the component's. Both are structural and identical, so they interchange; merging them
 * is a real change with its own diff and is not folded into a move.
 */
export type PrivateChatTab = {
  name: string;
  uid: number;
  avt: string;
  pic: string;
  unread: number;
  isA: boolean;
  online: boolean;
};

/** The load values this panel reads, taken as a thunk so a navigation reaches it. */
export interface PrivateChatSession {
  user: { id: number; isFT?: boolean };
  /** Shaped to what `canShowRosterPrivateChat` accepts, so nothing is coerced on the way in. */
  sessData?: {
    userPM?: boolean;
    userToPresenterPM?: boolean;
    disablePMForTrials?: boolean;
  } | null;
  privateChats?: readonly PrivateChatTab[] | null;
}

/** The three wire commands this panel sends, injected so the class needs no route import. */
export interface PrivateChatCommands {
  loadLog: (payload: {
    peerId: number;
    page: number;
    searchTerm: string;
  }) => Promise<PrivateChatMessage[]>;
  send: (payload: { peerId: number; body: string }) => Promise<unknown>;
  deleteLog: (payload: { peerId: number }) => Promise<unknown>;
  /**
   * `getAllUserPM {peerID}` - one member's whole private history, for a moderator.
   *
   * NOT `loadLog`. That one is scoped to the thread the caller is a party to; this one spans every
   * conversation the peer had. Two commands on the wire upstream, two here, and deliberately not
   * one with a flag - a flag is how the narrow read gets widened by a caller that passes `true`.
   */
  loadPeerHistory: (payload: {
    peerId: number;
  }) => Promise<{ nick: string; messages: PrivateChatMessage[]; truncated: boolean }>;
}

/** The two preferences the arrival sound reads. */
export interface PrivateChatPrefs {
  readonly doNotDisturbOn: boolean;
  readonly chatSoundOn: boolean;
  /**
   * `preferences.chatPopup` — the toast and browser notification, G12.
   *
   * Beside `chatSoundOn` because upstream reads them in the SAME expression and gates both on
   * `doNotDisturbOn`. `RoomPrefs` already owns it and the @-mention popup already reads it; the
   * private channel simply never did.
   */
  readonly chatPopup: boolean;
  /**
   * `preferences.pmLogsOnRight` — G5, the side the conversation column sits on.
   *
   * It has been WRITTEN by the settings modal since that modal was built and read by nothing, which
   * is the "a control whose only effect is changing its own label" shape `CLAUDE.md` names — and
   * `dead-preference-keys.ts` deliberately does not list it, so nothing was covering for it either.
   */
  readonly pmLogsOnRight: boolean;
}

/*
  The private-chat panel: its tabs, the thread on screen, the draft, the search, and every command
  the panel can send.

  Phase 5 slice 7. Twenty-four declarations and functions, 298 lines, spread across four regions of
  `+page.svelte` — the state at 1,263, the roster entry points at 2,000, and the behaviour at
  4,585. They are one feature and they read each other constantly; `ingest` alone touches six of
  the nine fields.

  ## Generic over the roster row, deliberately

  `canOpenFor` and `openFromRoster` took `(typeof data.connectedUsers)[number]`, which cannot
  survive the move — `typeof` does not accept a call expression, and the session arrives as a
  thunk. Narrowing to the three fields the gates read would have been the easy answer and the wrong
  one: `openFromRoster` hands the row straight on to `selectRosterUser`, which wants all of it.
  So the row type is a parameter and the full row travels intact.

  ## `tabs` and `log` are getters, not `$derived` fields

  Both read `#session()` or a field the constructor assigns, and a `$derived` class field
  initialises in declaration order — before the constructor has assigned what it reads. The same
  decision `RoomFiles.filesHidden` records, and for the same reason.

  ## What it does NOT own

  **The refusal rules.** `canShowRosterPrivateChat` and `resolveRosterPrivateChatStart` are
  transcriptions in `#lib/roster-private-chat.js`, tested there against their truth tables. This class
  calls them; it does not decide them, and the server re-checks every one.

  **Who is on the roster.** `selectRosterUser` is `RoomRoster`'s, injected, because the roster
  selection is read by the user modal as well as by this panel.

  **`selectedMessageUser`.** `close()` clears it, and it belongs to the message-action path
  rather than here. It leaves as an `onCleared` callback rather than as a field this class would
  then co-own with a feature it knows nothing about.
*/
export class RoomPrivateChat<User extends { id: number; isP: boolean; hasAdminChat: boolean }> {
  readonly #dialogs: RoomDialogs;
  readonly #prefs: PrivateChatPrefs;
  readonly #commands: PrivateChatCommands;
  readonly #session: () => PrivateChatSession;
  readonly #isPresenter: () => boolean;
  readonly #viewerOnlyMode: () => boolean;
  readonly #playSound: (name: SoundEffectName) => void;
  readonly #closeUserMenu: () => void;
  readonly #selectRosterUser: (user: User) => void;
  readonly #onCleared: () => void;
  readonly #onThreadDeleted: () => Promise<void>;
  #open;
  #searchTerm;
  #searching;
  #threads: Record<number, PrivateChatMessage[]>;
  #unreadByPeer: Record<number, number>;
  #lastActivityByPeer: Record<number, number>;
  #peerProfiles: PrivateChatTab[];
  #peerId: number | null;
  #draft;
  /** The user-info modal's history, which shares nothing with this panel. See `RoomPeerHistory`. */
  readonly #peerHistory: RoomPeerHistory;
  /** The Load More counter and its guards; `$state.raw` because it is only ever replaced whole. */
  #paging;
  #onlineUserIds;
  #notify;
  #canPost;
  #uploadImages;
  #roomName;
  #composerHasFocus;
  /** The composer's image dialog while it is open — see `beginImageUpload`. */
  #imageUpload;
  /** `PCC-06` — the pasted image awaiting confirmation, and the message travelling with it. */
  #pastedImage;
  #pastedImageMessage;
  /** `loadMoreLastID` — the row to scroll back to once older history lands. See `loadMore`. */
  #loadMoreAnchorId = '';
  /** `privChatSearchResults` — the search's own bucket, so it cannot overwrite the thread. */
  #searchResults;

  constructor(options: {
    dialogs: RoomDialogs;
    prefs: PrivateChatPrefs;
    commands: PrivateChatCommands;
    session: () => PrivateChatSession;
    isPresenter: () => boolean;
    viewerOnlyMode: () => boolean;
    /**
     * The arrival ding. Typed as the real union rather than `string`, because the page's
     * `playSoundEffect` takes that union — a `string` here pushes the mismatch to the
     * construction site, where it reads as the page's problem rather than as this class's contract.
     */
    playSound: (name: SoundEffectName) => void;
    closeUserMenu: () => void;
    selectRosterUser: (user: User) => void;
    /**
     * Who is on the roster right now, as user ids — G16's `checkUserOnlineStatus`.
     *
     * ```js
     * checkUserOnlineStatus() {                                    // byte 2,203,628
     *   if (this.privChatVisible && this.appService.globals.roster && this.chatTabs)
     *     for (const e of this.appService.globals.roster)
     *       for (const i of this.chatTabs)
     *         i.uid === e.userXrefID && (i.online = !0)
     * }
     * ```
     *
     * Every server-supplied tab was built `online: false` and nothing ever consulted the roster, so
     * the `bg-success` dot on the tab strip was permanently grey for anyone the page loaded with —
     * only a peer whose first message arrived this session ever lit up.
     *
     * **A FUNCTION AND NOT A LIST**, so the tab getter reads the roster at the moment it recomputes.
     * Upstream re-runs `checkUserOnlineStatus` on `getRoster`, `onUserJoin` and `onUserLeave`; a
     * `$derived` over the roster does the same thing without three subscriptions to keep in step.
     *
     * **And it can go back to FALSE, which upstream's cannot.** `checkUserOnlineStatus` only ever
     * writes `!0` — it has no branch that clears the flag — so a member who leaves stays lit until
     * something rebuilds `chatTabs`. Deriving it means the dot answers the roster at all times,
     * which is what the dot claims to mean. A deliberate divergence, and the safer direction: the
     * failure it removes is telling a presenter somebody is present when they have gone.
     */
    onlineUserIds: () => ReadonlySet<number>;
    /**
     * Upload one or more images and hand back their URLs — G1's `imgUpload()`.
     *
     * The room's uploader, injected, exactly as `RoomTradeAlerts` takes it: this class knows what
     * to do with a URL and deliberately not how bytes reach the CDN.
     */
    uploadImages: (files: readonly File[]) => Promise<readonly string[]>;
    /**
     * The room's name, which is what the tab title returns to — G27's `globals.sessionName`.
     *
     * A thunk because it comes from the page's data and is replaced on every `invalidateAll()`.
     */
    roomName: () => string;
    /**
     * Whether the private composer has focus — the other half of G27's gate.
     *
     * `!$("#textAreaTxtPM").is(":focus")`. Injected rather than queried here so this class does not
     * reach into the DOM for a decision, which is the split every other collaborator here makes.
     */
    composerHasFocus: () => boolean;
    /**
     * `canPost` — may this member post at all, G13.
     *
     * The room's answer, injected, because it already decides who may chat and a second opinion
     * computed in here is how two places come to disagree about one authority. The composer's own
     * render gate upstream is `O(4, e.isConnected && e.chatEnabled ? 4 : -1)`, which is the same
     * question asked of the same values.
     */
    canPost: () => boolean;
    /**
     * Raise a toast and a browser notification — G12's `alertService.info` plus `new Notification`.
     *
     * Injected rather than reached for, exactly as `playSound` is: this class knows WHEN somebody
     * should be told and deliberately not HOW, and `RoomToasts` already owns the queue, the
     * duplicate guard and the gravatar fallback the notification icon needs.
     */
    notify: (title: string, body: string, icon: string, emailHash: string) => void;
    /** `selectedMessageUser = null` — owned by the message-action path, cleared when this closes. */
    onCleared: () => void;
    onThreadDeleted: () => Promise<void>;
  }) {
    this.#dialogs = options.dialogs;
    this.#prefs = options.prefs;
    this.#commands = options.commands;
    this.#session = options.session;
    this.#isPresenter = options.isPresenter;
    this.#viewerOnlyMode = options.viewerOnlyMode;
    this.#playSound = options.playSound;
    this.#closeUserMenu = options.closeUserMenu;
    this.#selectRosterUser = options.selectRosterUser;
    this.#onlineUserIds = options.onlineUserIds;
    this.#notify = options.notify;
    this.#canPost = options.canPost;
    this.#uploadImages = options.uploadImages;
    this.#roomName = options.roomName;
    this.#composerHasFocus = options.composerHasFocus;
    this.#onCleared = options.onCleared;
    this.#onThreadDeleted = options.onThreadDeleted;

    this.#open = $state(false);

    // The private-chat gear is a toolbar toggle, not a dropdown: `<li class="nav-item dropdown"
    // (click)="togglePMToolbar()">`, with the toolbar rendered as a sibling of the nav inside
    this.#searchTerm = $state('');

    this.#searching = $state(false);

    this.#searchResults = $state.raw<PrivateChatMessage[]>([]);

    this.#imageUpload = $state(false);
    /*
      `$state.raw` on the pair the paste replaces WHOLESALE, and a plain `$state` on the message the
      dialog's textarea types into — the split `composer.svelte.ts` already draws for the chat copy,
      and for the same reason: the file and its object URL arrive and leave together, the message is
      edited a keystroke at a time.
    */
    this.#pastedImage = $state.raw<{ file: File; previewUrl: string } | null>(null);
    this.#pastedImageMessage = $state('');

    this.#threads = $state.raw<Record<number, PrivateChatMessage[]>>({});

    /**
     * The tab strip: the server's conversation list MERGED with what has happened since.
     *
     * Deliberately not a writable `$derived` overridden by hand. Overriding a derived is documented
     * as temporary - it survives only until a dependency changes - and `data` changes on every
     * `invalidateAll()`, which silently reset every unread count back to zero. Measured: an SSE
     * frame arrived correctly and the badge still read 0.
     *
     * So the local deltas live in their own state and the strip is a pure function of both. Nothing
     * to reset, and a conversation started this session appears without waiting for a refetch.
     */
    this.#unreadByPeer = $state.raw<Record<number, number>>({});

    this.#lastActivityByPeer = $state.raw<Record<number, number>>({});

    // An array, not a Record. `Object.entries` stringifies its keys, so reading a peer id back out
    // means `Number(uid)` - and this project forbids arithmetic on an id, because the room-to-API
    // cutover turns them into uuids (`docs/CUTOVER-ROOM-TO-API.md` §1, pinned by
    // `id-opacity-contract.test.ts`). Keeping the id inside the object never coerces it.
    this.#peerProfiles = $state.raw<PrivateChatTab[]>([]);

    /** `this.currUser` - the peer id whose thread is on screen, `''` when none. */
    this.#peerId = $state<number | null>(null);

    this.#draft = $state('');

    /*
      THE MODERATION READ, and its three fields are separate on purpose.

      `$state.raw` because the answer is REPLACED wholesale on every open and never edited in place -
      a deep proxy over a list of up to 500 messages would cost on every read and buy nothing.

      Loading and error are their own fields rather than variants of the value, because the modal
      shows a spinner over the PREVIOUS answer if they are collapsed: `null` would mean both "not
      asked yet" and "asked again", and a moderator would see the last member's messages under a
      spinner labelled with the new one.
    */
    this.#peerHistory = new RoomPeerHistory(options.commands.loadPeerHistory);
    this.#paging = $state.raw(newLoadMorePaging());
  }

  get open() {
    return this.#open;
  }

  get peerId() {
    return this.#peerId;
  }

  get searchTerm() {
    return this.#searchTerm;
  }

  get searching() {
    return this.#searching;
  }

  get draft() {
    return this.#draft;
  }

  set draft(next: string) {
    this.#draft = next;
  }

  get tabs(): PrivateChatTab[] {
    const byId = new Map<number, PrivateChatTab>();
    for (const tab of this.#session().privateChats ?? []) {
      byId.set(tab.uid, {
        name: tab.name,
        uid: tab.uid,
        avt: tab.avt,
        pic: tab.pic,
        unread: 0,
        isA: tab.isA,
        /* Filled from the roster below, where every tab is answered at once. */
        online: false
      });
    }
    // Conversations that started after this page loaded.
    for (const profile of this.#peerProfiles) {
      if (!byId.has(profile.uid)) byId.set(profile.uid, profile);
    }
    /* Read ONCE for the whole strip rather than per tab — upstream's nested loop is O(roster × tabs). */
    const online = this.#onlineUserIds();
    return (
      [...byId.values()]
        .map((tab) => ({
          ...tab,
          unread: this.#unreadByPeer[tab.uid] ?? 0,
          online: online.has(tab.uid)
        }))
        // `newMessage()` splices a tab out and pushes it, so the most recent sits last.
        .sort(
          (a, b) => (this.#lastActivityByPeer[a.uid] ?? 0) - (this.#lastActivityByPeer[b.uid] ?? 0)
        )
    );
  }

  /**
   * What the scroller renders: the search results while searching, the thread otherwise — G25.
   *
   * `this.msgs = this.appService.globals.privChatSearchResults` while a term is set, and
   * `this.msgs = this.appService.globals.privChatLog[this.currUser]` when it is cleared. Two
   * buckets, one view — which is what makes clearing a search a swap rather than a refetch, and what
   * keeps the older pages a reader had already loaded.
   */
  get log(): PrivateChatMessage[] {
    if (this.#peerId === null) return [];
    if (this.#searching) return this.#searchResults;
    return this.#threads[this.#peerId] ?? [];
  }

  canOpenFor(user: User) {
    return canShowRosterPrivateChat(
      {
        isPresenter: this.#isPresenter(),
        userPmEnabled: this.#session().sessData?.userPM,
        userToPresenterPmEnabled: this.#session().sessData?.userToPresenterPM,
        // Both of these were absent, which made the helper's trial branch unreachable.
        currentUserIsTrial: this.#session().user.isFT,
        disablePmForTrials: this.#session().sessData?.disablePMForTrials
      },
      {
        id: user.id,
        permissions: user.isP ? 'a' : 'r',
        // The row's OWN flag, not `role !== 'user'` - an admin-chat member is neither a presenter
        // nor an ordinary row, and that distinction is the whole point of the flag.
        hasAdminChat: user.hasAdminChat
      }
    );
  }

  openFromRoster(user: User) {
    const start = resolveRosterPrivateChatStart(this.#session().user.id, user.id);
    this.#closeUserMenu();

    if (start.kind === 'self') {
      this.#dialogs.alert = start.message;
      return;
    }

    this.#selectRosterUser(user);
    this.show();
  }

  /**
   * `newMessage(e)` - one frame off the private channel.
   *
   * The capture's rules, kept: bucket by peer; if the tab exists but is not the open one, move it
   * to the end of the strip and increment `unread`; if it does not exist, create it. The unread
   * count is only bumped for messages that are NOT mine, which is why `isMine` is computed first -
   * our own echo must not make our own conversation look unread.
   */
  ingest(message: PrivateChatMessage) {
    const isMine = message.uid === this.#session().user.id;
    const peerId = isMine ? message.recvdID : message.uid;

    const thread = this.#threads[peerId] ?? [];
    // Re-entrancy guard: the sender gets an echo AND may already have the row from the action's
    // response. Two copies of one message is worse than none.
    if (thread.some((existing) => existing._id === message._id)) return;
    this.#threads = { ...this.#threads, [peerId]: [...thread, message] };

    // A peer we have never had a tab for: remember enough to draw one.
    if (!this.tabs.some((tab) => tab.uid === peerId)) {
      this.#peerProfiles = [
        ...this.#peerProfiles.filter((profile) => profile.uid !== peerId),
        {
          name: isMine ? `User ${peerId}` : message.n,
          uid: peerId,
          avt: message.avt,
          pic: message.pic,
          unread: 0,
          isA: message.isA,
          online: true
        }
      ];
    }
    this.#lastActivityByPeer = { ...this.#lastActivityByPeer, [peerId]: message.t };

    // Only somebody else's message, and only when their tab is not the one on screen.
    if (!isMine && this.#peerId !== peerId) {
      this.#unreadByPeer = {
        ...this.#unreadByPeer,
        [peerId]: (this.#unreadByPeer[peerId] ?? 0) + 1
      };
    }

    if (!this.#prefs.doNotDisturbOn && !isMine && this.#prefs.chatSoundOn) this.#playSound('pling');

    /*
      ── THE TOAST AND THE BROWSER NOTIFICATION — G12, byte 2,205,900 ──────────────────────────

      ```js
      !this.appService.globals.preferences.doNotDisturbOn &&
      this.appService.globals.preferences.chatPopup && (
        this.alertService.info(e.txt, "Message from " + e.n, { enableHtml: !0 }),
        window.Notification) &&
        new Notification("Message from " + e.n, {
          body: e.txt,
          icon: e.pic || "https://secure.gravatar.com/avatar/" + e.avt + "?d=mm&s=50" })
      ```

      Only the SOUND was fired here. A member with the panel closed, or with a different
      conversation open, had no way to learn a private message had arrived — which is the one thing
      a private message needs to do.

      **Inside the `else` in the capture, and inside the same condition here.** Upstream raises this
      in the branch where the message is NOT for the conversation on screen; there is no point
      telling somebody about a message they are looking at. That is the same `#peerId !== peerId`
      test the unread count above uses, so both live under it.

      `?d=mm&s=50` and not the strip's 32: `RoomToasts.notify` already carries that exact fallback
      for the @-mention popup, so this passes the hash and lets it build the URL — one transcription
      of the gravatar shape rather than a second copy of it.
    */
    if (
      !isMine &&
      this.#peerId !== peerId &&
      !this.#prefs.doNotDisturbOn &&
      this.#prefs.chatPopup
    ) {
      this.#notify(`Message from ${message.n}`, message.txt, message.pic, message.avt);
    }

    /*
      ── THE TAB TITLE — G27, byte 2,207,480 ─────────────────────────────────────────────────

      ```js
      (!$("#textAreaTxtPM").is(":focus") || !window.onfocus) && !e.isMine &&
        (this.notificationInterval = setInterval(…, 2e3))
      ```

      Not mine, and only when the composer does not have focus — somebody typing into the box is
      already looking at it, and flashing the title at them is noise. `document.hasFocus()` answers
      the `!window.onfocus` half: the reference is testing whether the WINDOW is focused at all, and
      that is the case the whole feature exists for.

      Restarting replaces whatever was flashing, which is the first line of upstream's `newMessage`
      — a message from somebody else must name THAT sender.

      `private-chat-title-flash.ts` owns the interval and the title; this decides when.
    */
    if (!isMine && !this.#composerHasFocus()) {
      startTitleFlash(message.n, this.#roomName());
    }

    if (this.#peerId === peerId) this.scrollToBottom();
  }

  /** Delegates to `formatCompactTime`, which is where that transcription lives now. */
  formatTime(at: number) {
    return formatCompactTime(at);
  }

  /** `scrollPCLogToBottom` — delegated to `private-chat-scroll.ts`, which owns both numbers. */
  scrollToBottom() {
    scrollPrivateChatToBottom();
  }

  /**
   * `switchChatToUser(uid, user)` - open a thread.
   *
   * Clears `unread` on the tab it opens, seeds an empty array so the scroller has something to
   * bind to, and loads the first page.
   */
  async switchToUser(peerId: number) {
    this.#peerId = peerId;
    this.#searchTerm = '';
    /* Results belong to the thread that produced them; carrying them across would be another peer's. */
    this.#searchResults = [];
    this.#searching = false;
    if (!this.#threads[peerId]) this.#threads = { ...this.#threads, [peerId]: [] };
    this.#unreadByPeer = { ...this.#unreadByPeer, [peerId]: 0 };
    // `PCswitchChatToUser`: currPage = 0, hasMoreData = !0, isLoadingMore = !1, loadMoreLastID = "".
    this.#paging = newLoadMorePaging();
    await this.loadLog(peerId, 0);
    this.scrollToBottom();
  }

  /** `loadPClogForUID(uid, page)` -> `getPCLog {page, peerID}`; with a term it is `doPCLogSearch`. */
  async loadLog(peerId: number, page = 0, searchTerm = '') {
    let incoming: PrivateChatMessage[];
    try {
      incoming = await this.#commands.loadLog({ peerId, page, searchTerm });
    } catch {
      return; // Non-fatal: the held log stays as it was. See `private-chat.remote.ts`.
    }

    // `getPCLog`. Settled BEFORE the merge: the merge can drop rows as duplicates, and a page that
    // arrived is not an empty page.
    this.#paging = settleLoadMore(this.#paging, incoming.length);

    /*
      A SEARCH FILLS ITS OWN BUCKET — `privChatSearchResults`, G25. It used to overwrite
      `#threads[peerId]`, which is why clearing a search had to refetch and why every older page the
      reader had loaded was thrown away.
    */
    if (searchTerm) {
      this.#searchResults = incoming;
      return;
    }

    // Page 0 replaces; a later page is older history and goes in front, deduped on `_id` because
    // offset paging over a live tail hands the boundary row back twice.
    this.#threads = {
      ...this.#threads,
      [peerId]:
        page === 0
          ? incoming
          : mergeOlderMessagesBy(incoming, this.#threads[peerId] ?? [], (message) => message._id)
    };
  }

  /**
   * `loadMore()` — the badge above the thread, which the panel used to derive from `log.length`.
   *
   * The page is a COUNT OF REQUESTS, held here as `++this.currPage` is held on the reference's
   * scroller; `#lib/chat-paging.ts` records what deriving it from the row count cost. Guarded on
   * both flags, because a second click in flight would take the counter past a page nobody asked for.
   */
  async loadMore(): Promise<void> {
    const peerId = this.#peerId;
    if (peerId === null || this.#paging.loadingMore || !this.#paging.hasMoreData) return;
    const next = startLoadMore(this.#paging);
    this.#paging = next;
    /*
      `this.loadMoreLastID = "pcm-" + this.msgs[0]._id` — byte 2,193,442, recorded BEFORE the
      request. It is the row that is currently at the top, and after the older page is prepended it
      is the row the reader was looking at. See `#restoreAfterLoadMore`.
    */
    const anchor = this.#threads[peerId]?.[0];
    this.#loadMoreAnchorId = anchor ? `pcm-${anchor._id}` : '';
    await this.loadLog(peerId, next.page);
    /* The anchor crosses as an argument: it belongs to the paging that produced it, not to the
       module that scrolls. `private-chat-scroll.ts` carries the `-20` and why it is transcribed. */
    const anchorId = this.#loadMoreAnchorId;
    this.#loadMoreAnchorId = '';
    await restoreAfterLoadMore(anchorId);
  }

  /*
    ── `getAllPCLogsLoading` IS NOT MODELLED, AND THAT IS MEASURED — G7 ────────────────────────

    ```js
    O(1, e.getAllPCLogsLoading ? 1 : 2)      // "Loading private chats. Please wait..." / "No active chat"
    O(3, e.getAllPCLogsLoading ? 3 : -1)     // the tab column's own "Loading all private chats." block
    ```

    Upstream needs that flag because it POSTs `getAllPCLogs` when the panel opens. **This room has
    no such moment.** The conversation list is `loadConversations(...)` in `+page.server.ts:743`,
    resolved before the page is rendered and delivered with it, and the only thing that refreshes it
    is `invalidateAll()` — which keeps the previous list on screen while it runs. There is no
    instant at which the strip exists and its contents are unknown.

    So both of the reference's loading branches would be branches that can never render, which is a
    branch that can never be checked — the dead-control shape this repository removes rather than
    adds. The same call was made and recorded for the note carousel's file browser on 2026-08-30.

    What WOULD make this real is fetching the list on open instead of at page load. That is a
    plausible future change, and this note is here so whoever makes it knows two empty states are
    waiting for the flag rather than discovering it from the capture a second time.
  */

  /** `hasMoreData && !searchTerm` — the badge's gate, which is the server's answer and not a count. */
  get hasMore(): boolean {
    return this.#paging.hasMoreData && !this.#searchTerm;
  }

  /** `isLoadingMore` — the badge becomes a spinner rather than staying clickable. */
  get loadingMore(): boolean {
    return this.#paging.loadingMore;
  }

  /** `sendMessage()` - `sendPrivChat(currUser, text, recvdUser)`. Empty text sends nothing. */
  async send() {
    /*
      ── `canPost` — G13, byte 2,208,062 ────────────────────────────────────────────────────

      ```js
      sendMessage() {
        if (!this.canPost) return void bootbox.alert("Sorry, you can't post to this channel");
        …
      }
      ```

      There was no gate here at all: a member whose chat had been muted or disabled could type into
      the private composer and the message went to the server, which refused it — so the refusal
      arrived as a generic failure rather than as the reason.

      `canPost` is the CALLER's answer, not this class's. The room already decides who may chat, and
      a second opinion computed here is the shape `CLAUDE.md` forbids: two places deciding one
      authority is how they come to disagree. The server refuses independently regardless — this is
      the message, not the enforcement.
    */
    if (!(await this.#post(this.#draft.trim()))) return;
    this.#draft = '';
  }

  /**
   * Send one body to the open peer, with the gate, the refusal wording and the scroll.
   *
   * Extracted from {@link send} on 2026-08-31 when `PCC-06` gave the class a SECOND way to post —
   * a pasted image. Two senders each carrying their own copy of `canPost` is exactly the shape the
   * comment above refuses for the client-versus-server split, one level down: two places deciding
   * one authority is how they come to disagree. There is one place, and both callers go through it.
   *
   * Returns whether the message actually travelled, because the two callers clear different things
   * afterwards and neither should clear on a refusal.
   */
  async #post(text: string): Promise<boolean> {
    if (!this.#refuseUnlessPostable()) return false;
    if (!text || this.#peerId === null) return false;

    try {
      await this.#commands.send({ peerId: this.#peerId, body: text });
    } catch (cause) {
      // The server's own wording, which includes the capture's `Chatting with yourself again?`.
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';
      return false;
    }
    // The echo on `/privChat` is what actually appends it, so nothing is inserted here.
    this.scrollToBottom();
    return true;
  }

  /**
   * `onTextareaFocus()` — the member is looking at the composer, so stop flashing at them.
   *
   * ```js
   * onTextareaFocus() {
   *   this.notificationInterval && clearInterval(this.notificationInterval),
   *   document.title !== this.appService.globals.sessionName &&
   *     (document.title = this.appService.globals.sessionName)
   *   …
   * }
   * ```
   *
   * The rest of upstream's method attaches the `input` listener that `autoExpand` needs;
   * `PrivateChatComposer` binds that declaratively, so only this half crosses.
   */
  composerFocused(): void {
    stopTitleFlash(this.#roomName());
  }

  /** Whether the composer's image dialog is on screen — G1's `imgUpload()`. */
  get imageUpload(): boolean {
    return this.#imageUpload;
  }

  /** `PCC-06` — the pasted image awaiting its confirmation, or `null`. */
  get pastedImage(): { file: File; previewUrl: string } | null {
    return this.#pastedImage;
  }

  /** The message travelling with that image. Bound by the dialog's `msg-text-pc` textarea. */
  get pastedImageMessage(): string {
    return this.#pastedImageMessage;
  }

  set pastedImageMessage(next: string) {
    this.#pastedImageMessage = next;
  }

  /**
   * `imgUpload()` — open the composer's image dialog for THIS conversation.
   *
   * A dialog of its own rather than the chat composer's, which is the rule `RoomOverlays` already
   * records for the swing form: *"routing the swing upload through the composer's handler would post
   * the image into chat instead of putting its URL in the form."* The same is true here, and worse —
   * an image meant for one person would land in the room.
   */
  beginImageUpload(): void {
    this.#imageUpload = true;
  }

  cancelImageUpload(): void {
    this.#imageUpload = false;
  }

  /**
   * The `canPost` gate and its wording, in ONE place, answering `true` when posting may proceed.
   *
   * Two callers rather than one, and the second is why this is a method: `confirmImagePaste` has to
   * ask BEFORE it spends an upload, and `#post` asks again immediately before sending. The same
   * source of truth read twice is fine; two copies of the sentence would not be.
   */
  #refuseUnlessPostable(): boolean {
    if (this.#canPost()) return true;
    this.#dialogs.alert = "Sorry, you can't post to this channel";
    return false;
  }

  /**
   * ── `PCC-06` — pasting a screenshot into a private conversation ────────────────────────────
   *
   * `onImagePaste(e)`, byte **2,212,274**, read whole rather than from the row that filed this:
   *
   * ```js
   * onImagePaste(e){ const i=this, o=(e.clipboardData||e.originalEvent.clipboardData).items;
   *   let s=null;
   *   for(const r of o) 0===r.type.indexOf("image") && (s=r.getAsFile());
   *   if(s){ const r=URL.createObjectURL(s), a=Ao("#textAreaTxtPM").val().trim();
   *     bootbox.confirm({ message:'…<h4>Upload this image?</h4><img …src="'+r+'" />' +
   *       '<textarea … id="msg-text-pc" … placeholder="Enter your message">'+a+'</textarea>…',
   *       callback: l => { if(l){ const c = Ao("#msg-text-pc").val().trim();
   *         doImggurUpload(s, c) } } }) } }
   * ```
   *
   * **The row that filed this said "takes the first `image/*`" and the bundle says otherwise.** The
   * loop keeps assigning, so the LAST image item wins — identical to the chat composer's copy,
   * which `pasted-image.ts` already carries as one shared rule. Corrected in the register; the
   * shared module is used here rather than a second loop, which is what makes the two agree by
   * construction instead of by inspection.
   *
   * The dialog's textarea id is `msg-text-pc`, where chat's is `msg-text`. Both are seeded with
   * their OWN composer's trimmed text, which is why this class seeds from `#draft` and not from
   * anything the chat composer holds.
   */
  beginImagePaste(file: File): void {
    /* A second paste replaces the first and releases its preview — `composer.svelte.ts`'s rule. */
    this.cancelImagePaste();
    /*
      No `target` discriminator, where the chat copy has one. That class serves TWO boxes — the chat
      composer and the inline alert box — and has to remember which paste it is holding. This one
      serves a single composer, so a field whose only value is a constant would be a field nothing
      reads.
    */
    this.#pastedImage = { file, previewUrl: URL.createObjectURL(file) };
    this.#pastedImageMessage = this.#draft.trim();
  }

  /** Discard the pending paste, releasing its preview. Safe to call when there is none. */
  cancelImagePaste(): void {
    const pending = this.#pastedImage;
    this.#pastedImage = null;
    this.#pastedImageMessage = '';
    if (pending) URL.revokeObjectURL(pending.previewUrl);
  }

  /**
   * Upload the pasted image and send it, with whatever text the dialog was left holding.
   *
   * `doImggurUpload(e, i = null, o = !1)` at byte **2,211,249** is what decides the ORDER, and it is
   * not the obvious one:
   *
   * ```js
   * s.imggurUploadTxt += s.imggurUploadTxt && s.imggurUploadTxt.length>0 ? " "+F : F;
   * o || (i && (s.imggurUploadTxt += " " + i, Ao("#textAreaTxtPM").val("")),
   *       s.appService.sendPrivChat(s.currUser, s.imggurUploadTxt, s.recvdUser),
   *       s.imggurUploadTxt = "")
   * ```
   *
   * **The URL comes FIRST and the typed message is appended after it** — `link + " " + message`,
   * not the other way round. That is the same order the chat composer uses and it is worth stating,
   * because "message, then attachment" is what every other messenger does and is what a reader will
   * assume.
   *
   * **The composer is cleared only when a message actually travels** (`i && (… , val(""))`).
   * Clearing unconditionally would eat a draft that was never sent.
   *
   * The pending paste is taken and cleared BEFORE the upload awaits, so a viewer who starts typing
   * during a slow upload keeps what they typed — `composer.svelte.ts` argues the same point, and it
   * is why this does not route the composed text through `#draft` on its way to the server.
   */
  async confirmImagePaste(): Promise<void> {
    const pending = this.#pastedImage;
    if (!pending) return;
    const message = this.#pastedImageMessage.trim();
    this.#pastedImage = null;
    this.#pastedImageMessage = '';
    URL.revokeObjectURL(pending.previewUrl);

    /*
      REFUSED BEFORE THE UPLOAD, not after it.

      Upstream has no gate on this path at all — `doImggurUpload` uploads and then calls
      `sendPrivChat` unconditionally, and the `canPost` check lives only in `sendMessage`. Ours
      already diverges by having one (see the note on the composer's `handlePaste`); asking here
      rather than only inside `#post` is that same divergence spent where it is worth something. A
      muted member's screenshot would otherwise be pushed to the upload server in full and then
      refused, which is bytes spent, a file left on the host, and a slower refusal.
    */
    if (!this.#refuseUnlessPostable()) return;

    let url: string | undefined;
    try {
      [url] = await this.#uploadImages([pending.file]);
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
      return;
    }
    if (!url) {
      this.#dialogs.alert = 'Upload Failed...';
      return;
    }

    const body = message ? `${url} ${message}` : url;
    if (await this.#post(body)) {
      /* `Ao("#textAreaTxtPM").val("")` — and ONLY on the branch that had a message to carry. */
      if (message) this.#draft = '';
    }
  }

  /**
   * The chosen image, uploaded and sent as a private message.
   *
   * ONE file. `ImageUploadDialog` is shared with the chat composer, which allows several; the
   * reference's own private-chat dialog sets `multiple='false'`, so the extras are dropped here
   * rather than by forking the component — the same call `RoomTradeAlerts` makes.
   *
   * The URL is SENT rather than put in the draft, which is what `sendPrivChat` does with it: an
   * image in a private conversation is a message, and leaving it in the box would make a presenter
   * press Enter on a URL they did not type.
   */
  async completeImageUpload(files: readonly File[]): Promise<void> {
    this.#imageUpload = false;
    const [file] = files;
    if (!file) return;

    let url: string | undefined;
    try {
      [url] = await this.#uploadImages([file]);
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
      return;
    }
    if (!url) {
      this.#dialogs.alert = 'Upload Failed...';
      return;
    }
    this.#draft = url;
    await this.send();
  }

  /** `deleteThisPM()` - confirm, then `deletePeerPCLog {peerID}`, then drop the tab. */
  deleteThread() {
    if (this.#peerId === null) return;
    const peerId = this.#peerId;
    this.#dialogs.confirmation = {
      message: 'Are you sure you want to delete all messages in this chat?',
      onconfirm: async () => {
        this.#dialogs.confirmation = null;
        await this.#commands.deleteLog({ peerId });
        const { [peerId]: _dropped, ...remainingLog } = this.#threads;
        this.#threads = remainingLog;
        const { [peerId]: _unread, ...remainingUnread } = this.#unreadByPeer;
        this.#unreadByPeer = remainingUnread;
        this.#peerProfiles = this.#peerProfiles.filter((profile) => profile.uid !== peerId);
        await this.#onThreadDeleted();
        this.#peerId = null;
        this.#onCleared();
      }
    };
  }

  /**
   * `showPrivateChat()` — the ONE door into the private-chat panel, and its refusal.
   *
   * `app-room.compiled.js:855-861`, verbatim in shape:
   *
   * ```js
   * showPrivateChat(e = null, i = null) {
   *   this.appService.globals.videoOnlyMode ||
   *     this.appService.globals.viewerOnlyMode ||
   *     (this.privChatInited || (…initPMDrag()), this.privChatVisible = !0, …)
   * }
   * ```
   *
   * A leading `a || b || (…)`: in video-only or viewer-only mode the panel does not open at all,
   * silently. Four call sites in this file each set `privateChatOpen = true` on their own, so the
   * guard has to live in one place or it is four places to forget it.
   *
   * `videoOnlyMode` is the `r` query parameter — the recording-bot mode — which this room does not
   * model, the same honest gap `files-gates.ts` already records for `hideFiles`. The half that is
   * modelled is enforced.
   */
  show() {
    if (this.#viewerOnlyMode()) return;
    this.#open = true;
  }

  /**
   * The user-info modal's history, as ONE value rather than three parallel accessors.
   *
   * It was three getters here feeding three props on `ModalHost`, which is the shape this session
   * already corrected once for the capture settings: three parameters that are one idea, threaded
   * through every hop between them. One collaborator crosses instead, and both files got shorter.
   */
  get peerHistory(): RoomPeerHistory {
    return this.#peerHistory;
  }

  /**
   * `closePanel()` - the X in the private-chat header:
   *
   * ```js
   * closePanel(){
   *   guiEventBus.emit('PCClosePanel');
   *   this.notificationInterval && (clearInterval(this.notificationInterval),
   *                                 document.title = globals.sessionName);
   *   this.user = null; this.recvdUser = null; this.currUser = '';
   * }
   * ```
   *
   * Closing DESELECTS the thread. Hiding the panel alone - which is all the X used to do - means
   * reopening lands straight back in the last conversation, where the capture returns to
   * "No active chat".
   */
  close() {
    /* `closePanel(){ …, this.notificationInterval && (clearInterval(…), document.title = …), … }` */
    stopTitleFlash(this.#roomName());
    this.#open = false;
    this.#peerId = null;
    this.#onCleared();
    this.#searchTerm = '';
    this.#searching = false;
    this.#searchResults = [];
    this.#draft = '';
  }

  /**
   * `closeTab(uid)` — the X on the header tab, G8.
   *
   * ```js
   * closeTab(e) { this.user = null, this.recvdUser = null, this.currUser = "" }   // byte 2,205,022
   * ```
   *
   * It clears `currUser`, which by `O(17, "" !== o.currUser ? 17 : 18)` drops the panel back to its
   * empty pane. The room's wiring cleared the selected user and left `peerId` alone, so the header
   * tab vanished and the thread and composer stayed — a conversation with nobody's name on it.
   *
   * Separate from {@link RoomPrivateChat.close}, which is the PANEL's X and hides the panel as well.
   * This closes the conversation and leaves the panel open, which is why the two are not one method.
   */
  closeTab(): void {
    /* `closePanel` clears the interval and restores the title; closing the tab is the same act. */
    stopTitleFlash(this.#roomName());
    this.#peerId = null;
    this.#searchTerm = '';
    this.#searching = false;
    this.#searchResults = [];
    this.#draft = '';
    this.#onCleared();
  }

  /**
   * `onEnterSearchChat(value)` — a term searches this thread; an empty one RESTORES it — G25.
   *
   * ```js
   * clearSearchTerm() {                                            // byte 2,209,001
   *   this.pmSearchTerm = "",
   *   this.appService.guiEventBus.emit("setSearchTermPC", {searchTerm: this.pmSearchTerm, uid: this.currUser}),
   *   this.appService.globals.privChatSearchResults = [],
   *   this.msgs = this.appService.globals.privChatLog[this.currUser],
   *   this.appService.appEventBus.emit("scrollPCLogToBottom", {force:!0, repeat:!0})
   * }
   * ```
   *
   * ## Two buckets, because the search overwrote the conversation
   *
   * Upstream keeps results in `privChatSearchResults` and swaps `msgs` back to the untouched
   * `privChatLog[currUser]`. This held ONE array per peer and wrote the results into it, so:
   *
   *   - clearing the search cost a round trip to fetch page 0 again, and
   *   - every older page the reader had loaded was discarded, so `Load More` had to be pressed all
   *     the way back down.
   *
   * The thread and the results are now separate, and clearing is a local swap with no request —
   * which is what makes it instant and what makes the pages survive.
   *
   * The scroll is upstream's too, on both paths: a fresh set of rows means the box is looking at
   * whatever the old ones left it pointing at.
   */
  async search(term: string) {
    if (this.#peerId === null) return;
    const trimmed = term.trim();
    this.#searchTerm = term;
    this.#searching = Boolean(trimmed);

    if (!trimmed) {
      /* `privChatSearchResults = []` then `msgs = privChatLog[currUser]` — a swap, not a fetch. */
      this.#searchResults = [];
      this.scrollToBottom();
      return;
    }

    await this.loadLog(this.#peerId, 0, trimmed);
    this.scrollToBottom();
  }

  /**
   * The toolbar's "Download Log" button, transcribed from `app-privchat`'s `downloadLog()`: one
   * `toLocaleTimeString('en-us', ...)` line per message, CRLF-terminated, offered as a text blob
   * named `${name}_${date}_${time}.txt` with the space in the name replaced (the capture calls
   * `replace(' ', '_')`, which replaces only the first - kept as-is).
   *
   * It writes the rows the panel is showing. An earlier revision of this comment said the log was
   * "still a stub here, so this currently writes an empty file" — that was true when the serialiser
   * landed and stopped being true when `.pc-messages` got its `{#each}` and `loadLog` got its
   * paging. A comment asserting a feature is missing is the one kind that never fails a build, so
   * it outlived the gap by weeks and put the same claim into `TODO.md`'s evidence-gap table.
   *
   * `this.log` is the getter at `:426`: the open peer's thread, or the search bucket while a term
   * is set. An empty file now means an empty thread, which is the honest thing for it to mean.
   */
  downloadLog() {
    const openTab = this.tabs.find((tab) => tab.uid === this.#peerId);
    if (!openTab) return;
    const format: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    const lines = this.log.map(
      (message) =>
        `${new Date(message.t).toLocaleTimeString('en-us', format)} [${message.n}]: ${message.txt}\r\n`
    );
    const url = URL.createObjectURL(new Blob(lines, { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    link.download = `${openTab.name.replace(' ', '_')}_${now.toLocaleDateString()}_${now.toLocaleTimeString()}.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
