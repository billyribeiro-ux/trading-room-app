import { isHttpError } from '@sveltejs/kit';

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
/**
 * How long after the first scroll the second one fires — `setTimeout(…, 500)` at byte 2,192,880.
 *
 * Exported so the contract that guards it reads THIS value rather than restating the number, which
 * is how the two stop agreeing. It was 60 here until 2026-08-30; see {@link RoomPrivateChat.scrollToBottom}.
 */
export const PRIVATE_CHAT_RESCROLL_MS = 500;

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
    this.#onCleared = options.onCleared;
    this.#onThreadDeleted = options.onThreadDeleted;

    this.#open = $state(false);

    // The private-chat gear is a toolbar toggle, not a dropdown: `<li class="nav-item dropdown"
    // (click)="togglePMToolbar()">`, with the toolbar rendered as a sibling of the nav inside
    this.#searchTerm = $state('');

    this.#searching = $state(false);

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

  get log(): PrivateChatMessage[] {
    return this.#peerId === null ? [] : (this.#threads[this.#peerId] ?? []);
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
    if (this.#peerId === peerId) this.scrollToBottom();
  }

  /** Delegates to `formatCompactTime`, which is where that transcription lives now. */
  formatTime(at: number) {
    return formatCompactTime(at);
  }

  /**
   * `scrollPCLogToBottom` — scroll now, and again once the rows have settled.
   *
   * ```js
   * scrollToBottom(e = !1, i = !1) {                              // byte 2,192,880
   *   try {
   *     this.scrollRef.nativeElement.scrollTop = this.scrollRef.nativeElement.scrollHeight;
   *     const o = this;
   *     setTimeout(() => { o.scrollRef.nativeElement.scrollTop = o.scrollRef.nativeElement.scrollHeight }, 500)
   *   } catch {}
   * }
   * ```
   *
   * **The delay was 60ms and the reference's is 500** — G23. The second scroll exists because the
   * first one runs against a box whose height is not final: avatars are still loading, and a long
   * message has not wrapped yet. 60ms fires before either settles, so it re-scrolled to the same
   * wrong place and the conversation opened part-way up its own last message.
   *
   * `setTimeout` and not `tick()`, which is the opposite of the choice made in `CarouselDialog` and
   * for the opposite reason: `tick()` waits for Svelte to finish rendering, and what is being waited
   * for here is the BROWSER finishing layout after images arrive — which Svelte does not know about
   * and cannot await.
   */
  scrollToBottom() {
    const run = () => {
      const scroller = document.querySelector('.pc-messages');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };
    run();
    setTimeout(run, PRIVATE_CHAT_RESCROLL_MS);
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

    // Page 0 replaces; a later page is older history and goes in front, deduped on `_id` because
    // offset paging over a live tail hands the boundary row back twice.
    this.#threads = {
      ...this.#threads,
      [peerId]:
        page === 0 || searchTerm
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
    await this.loadLog(peerId, next.page);
  }

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
    const text = this.#draft.trim();
    if (!text || this.#peerId === null) return;

    try {
      await this.#commands.send({ peerId: this.#peerId, body: text });
    } catch (cause) {
      // The server's own wording, which includes the capture's `Chatting with yourself again?`.
      this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';
      return;
    }
    this.#draft = '';
    // The echo on `/privChat` is what actually appends it, so nothing is inserted here.
    this.scrollToBottom();
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
    this.#open = false;
    this.#peerId = null;
    this.#onCleared();
    this.#searchTerm = '';
    this.#searching = false;
    this.#draft = '';
  }

  /** `onEnterSearchChat(value)` - a term searches this thread; an empty one restores it. */
  async search(term: string) {
    if (this.#peerId === null) return;
    this.#searchTerm = term;
    this.#searching = Boolean(term.trim());
    await this.loadLog(this.#peerId, 0, term.trim());
    this.scrollToBottom();
  }

  /**
   * The toolbar's "Download Log" button, transcribed from `app-privchat`'s `downloadLog()`: one
   * `toLocaleTimeString('en-us', ...)` line per message, CRLF-terminated, offered as a text blob
   * named `${name}_${date}_${time}.txt` with the space in the name replaced (the capture calls
   * `replace(' ', '_')`, which replaces only the first - kept as-is).
   *
   * The private-chat message log itself is still a stub here, so this currently writes an empty
   * file. That is the honest state, not a placeholder transcript.
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
