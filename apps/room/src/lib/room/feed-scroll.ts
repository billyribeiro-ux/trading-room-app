import {
  CHAT_PAGE_ARRIVAL_NUDGE,
  CHAT_PAGE_REQUEST_NUDGE,
  shouldLoadOlderMessages
} from '#lib/chat-paging.js';
import type { ChatTab } from '#lib/types.js';

import {
  loadOlderAlerts as loadOlderAlertsPage,
  loadOlderChatMessages as loadOlderChatPage
} from '../../routes/log-pages.remote';
import { isRoomScrollerReadingHistory, scrollRoomScrollerToBottom } from '#lib/room-scroller.js';

import type { RoomAlerts } from './alerts.svelte';
import type { RoomChat } from './chat.svelte';
import { ALERTS_LOG } from './log-pages.svelte';

/**
 * SCROLL-FOLLOW and PAGING, for all three feeds at once.
 *
 * Phase 5 slice 23. Eight functions and five fields covering alerts, chat and the extra chat
 * column: whether the reader has scrolled up into history, how a feed is pulled back to the bottom,
 * and when scrolling up far enough fetches an older page.
 *
 * **Three feeds, one class, because it is one MECHANISM and three instances of it.** Each feed has
 * a `*ScrollingUp` flag, a tracker that sets it, and a paging arm that is disarmed while the reader
 * is in history — the same three moving parts wired to three scrollers. Splitting by feed would put
 * that pattern in three files and let one of them drift, which is exactly the argument
 * `RoomLogPages` already made when swing and day-trade alerts turned out to be one feature.
 *
 * **The `*ScrollingUp` flags MOVED here rather than staying shared**, and that is a change of
 * ownership rather than a move of storage. They were written in two places: by the trackers, which
 * are here, and by the follow effects on the page, which set them back to false on the tick they
 * pull a feed to the bottom. Two writers of one flag is how a feed ends up following while its
 * reader is halfway up the log. Now there is one writer of record and the page asks —
 * `readingHistory` to read, `stopReadingHistory` to clear — so the flag cannot be set from two
 * sides that disagree.
 *
 * **The debounce timers travel too.** `alertScrollTimer` and `chatScrollTimer` exist only so a
 * second scroll-to-bottom cancels the first; nothing outside these functions ever read them.
 *
 * A plain `.ts`: no rune. What renders is `RoomFeeds`, and the flags are read through a getter that
 * a `$effect` on the page depends on exactly as it did when they were `let`s beside it.
 */
/**
 * The seven members of `RoomLogPages` this class actually uses.

 * A STRUCTURAL surface rather than the class, and the type checker is what said so: the page holds
 * `RoomLogPages` over a UNION row — its chat log carries both the main and the extra-chat shapes —
 * while the rows this file hands to `arrived` come from the two remote loaders. Naming the class
 * made those two disagree at the call site for a reason that has nothing to do with paging.
 *
 * Generic over the row the LOADER returns, which is the only row this file ever passes in.
 */
interface LogPages<Row> {
  readonly loading: boolean;
  hasMore(key: string): boolean;
  arm(key: string): void;
  releaseHistory(key: string): boolean;
  requesting(key: string): number;
  settled(): void;
  exhausted(key: string): void;
  arrived(key: string, incoming: readonly Row[], page: number): void;
}

/** The alert row, as the loader that fetches it defines it. Derived, never restated. */
type AlertRow = Awaited<ReturnType<typeof loadOlderAlertsPage>>[number];

/** And the chat row. */
type MessageRow = Awaited<ReturnType<typeof loadOlderChatPage>>[number];

export class RoomFeedScroll {
  #alertsScrollingUp: boolean;
  #chatScrollingUp: boolean;
  #extraChatScrollingUp: boolean;
  #alertScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  #chatScrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  constructor(options: {
    alerts: RoomAlerts;
    chat: RoomChat;
    alertPages: LogPages<AlertRow>;
    chatPages: LogPages<MessageRow>;
    /** The rows each feed shows, read to decide whether an older page is worth fetching. */
    feeds: {
      readonly visibleAlerts: readonly unknown[];
      readonly visibleChat: readonly unknown[];
      readonly visibleExtraChat: readonly unknown[];
    };
  }) {
    this.#alerts = options.alerts;
    this.#chat = options.chat;
    this.#alertPages = options.alertPages;
    this.#chatPages = options.chatPages;
    this.#feeds = options.feeds;

    this.#alertsScrollingUp = false;

    this.#chatScrollingUp = false;

    this.#extraChatScrollingUp = false;

    this.#alertScrollTimer = undefined;

    this.#chatScrollTimer = undefined;
  }

  readonly #alerts: RoomAlerts;
  readonly #chat: RoomChat;
  readonly #alertPages: LogPages<AlertRow>;
  readonly #chatPages: LogPages<MessageRow>;
  readonly #feeds: {
    readonly visibleAlerts: readonly unknown[];
    readonly visibleChat: readonly unknown[];
    readonly visibleExtraChat: readonly unknown[];
  };

  /*
    The three flags a follow effect READS, and the one receiver that clears them.

    Exposed as a getter per feed rather than as one object, because each is read by a different
    effect and a shared object would make all three re-run when any one moved.
  */
  get alertsReadingHistory(): boolean {
    return this.#alertsScrollingUp;
  }

  get chatReadingHistory(): boolean {
    return this.#chatScrollingUp;
  }

  get extraChatReadingHistory(): boolean {
    return this.#extraChatScrollingUp;
  }

  /**
   * The reader is no longer in history — called by a follow effect on the tick it pulls the feed
   * back to the bottom.
   *
   * A RECEIVER rather than three setters, and rather than leaving the flags on the page: they were
   * written from two sides before this, and two writers of one flag is how a feed ends up following
   * while its reader is halfway up the log.
   */
  stopReadingHistory(feed: 'alerts' | 'chat' | 'extraChat'): void {
    if (feed === 'alerts') this.#alertsScrollingUp = false;
    else if (feed === 'chat') this.#chatScrollingUp = false;
    else this.#extraChatScrollingUp = false;
  }

  /**
   * Cancel any pending scroll-to-bottom.
   *
   * Called from the page teardown, beside `toasts.destroy()`. Both debounce timers were cleared
   * there when they were page-level `let`s, and that was the one place outside these functions that
   * touched them — so the teardown asks the class instead of reaching for the timers.
   */
  destroy(): void {
    if (this.#alertScrollTimer !== undefined) globalThis.clearTimeout(this.#alertScrollTimer);
    if (this.#chatScrollTimer !== undefined) globalThis.clearTimeout(this.#chatScrollTimer);
  }

  forceAlertsToBottom(scroller: HTMLElement) {
    if (this.#alertScrollTimer !== undefined) globalThis.clearTimeout(this.#alertScrollTimer);
    this.#alertScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  forceChatToBottom(scroller: HTMLElement) {
    if (this.#chatScrollTimer !== undefined) globalThis.clearTimeout(this.#chatScrollTimer);
    this.#chatScrollTimer = scrollRoomScrollerToBottom(scroller);
  }

  trackAlertsScroll(event: Event) {
    const scroller = event.currentTarget as HTMLElement;
    this.#alertsScrollingUp = isRoomScrollerReadingHistory(scroller);
    /*
      Back at the bottom: BOTH of the reference's actions, which sit in one expression upstream —
      `hasMoreData = !0` re-arms paging, and `currPage > 0 && this.trimFat()` releases the history
      that was paged in. Only the first was implemented here until 2026-08-16, which is what left
      `visibleAlerts` iterating over a list that never shrank. `RoomLogPages.releaseHistory` carries
      the transcription and the `chatLogPageSize` bound it reproduces.
    */
    if (!this.#alertsScrollingUp) {
      this.#alertPages.arm(ALERTS_LOG);
      this.#alertPages.releaseHistory(ALERTS_LOG);
    }
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: this.#feeds.visibleAlerts.length,
        /* REAL here, unlike the chat log: the alerts pane has a live search field, and
           `matchesAlertSearch` filters the rendered list by it. Upstream refuses to page while a
           term is set because a filtered log is not a paged one — asking for page 2 of a filter the
           server knows nothing about would interleave unfiltered history into a filtered view. */
        searchTerm: this.#alerts.search,
        hasMoreData: this.#alertPages.hasMore(ALERTS_LOG),
        loadingMore: this.#alertPages.loading
      })
    ) {
      return;
    }
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void this.loadOlderAlerts(scroller);
  }

  trackChatScroll(event: Event) {
    const scroller = event.currentTarget as HTMLElement;
    this.#chatScrollingUp = isRoomScrollerReadingHistory(scroller);
    /*
      Back at the bottom, so paging is armed again: `hasMoreData = !0` on the way down is the
      reference's own reset, and without it a reader who once hit the end of the history could never
      page again in that session even after the log had grown.
    */
    if (!this.#chatScrollingUp) {
      this.#chatPages.arm(this.#chat.tab);
      /*
        And the same release, because upstream's `trimFat` is ONE function serving both log types —
        `'chat' == this.logType ? emit('trimChatLog', this.channel) : emit('trimAlertsLog')`, and
        both handlers splice back to `chatLogPageSize`. `trimChatLog`'s 300 caps the live tail on
        arrival and says nothing about paged-in history, so without this the chat columns grew the
        same way the alerts pane did, just more slowly.
      */
      this.#chatPages.releaseHistory(this.#chat.tab);
    }
    this.#maybeLoadOlderMessages(scroller);
  }

  /**
   * The extra column's scroll handler.
   *
   * Its own `isScrollingUp` and its own paging trigger: two scrollers with two positions is the
   * whole point of `app-extra-roomscroller` being a separate component upstream. The paging STATE
   * is shared because it is keyed by channel — two columns showing the same channel are looking at
   * the same history, and should not fetch it twice.
   */
  trackExtraChatScroll(scroller: HTMLElement) {
    this.#extraChatScrollingUp = isRoomScrollerReadingHistory(scroller);
    if (!this.#extraChatScrollingUp) {
      this.#chatPages.arm(this.#chat.extraTab);
      /* Keyed by channel, so this releases the same history the main column would. */
      this.#chatPages.releaseHistory(this.#chat.extraTab);
    }
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: this.#feeds.visibleExtraChat.length,
        searchTerm: '',
        hasMoreData: this.#chatPages.hasMore(this.#chat.extraTab),
        loadingMore: this.#chatPages.loading
      })
    ) {
      return;
    }
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void this.loadOlderChatMessages(this.#chat.extraTab, scroller);
  }

  /** `loadMoreLogs({type: 'alerts', page})` -> `getAlertsLog {page}`. */
  async loadOlderAlerts(scroller: HTMLElement) {
    const page = this.#alertPages.requesting(ALERTS_LOG);

    let incoming: Awaited<ReturnType<typeof loadOlderAlertsPage>>;
    try {
      incoming = await loadOlderAlertsPage(page);
    } catch {
      // Non-fatal by design, not swallowed: `hasMoreData` stays true and the next scroll retries.
      return; // `log-pages.remote.ts` carries why, and why the `finally` below must not move.
    } finally {
      this.#alertPages.settled();
    }

    if (incoming.length === 0) {
      this.#alertPages.exhausted(ALERTS_LOG);
      return;
    }

    this.#alertPages.arrived(ALERTS_LOG, incoming, page);
    scroller.scrollTop += CHAT_PAGE_ARRIVAL_NUDGE;
  }

  /**
   * `loadMoreLogs({type: 'chat', channel, page})` — one page older, appended in front.
   *
   * The empty answer is the terminator, exactly as upstream reads it
   * (`0 == o.length && (this.hasMoreData = !1)`): the server does not say how much history is left
   * and does not need to, because running out is something you discover by asking once too often.
   */
  async loadOlderChatMessages(channel: ChatTab, scroller: HTMLElement) {
    const page = this.#chatPages.requesting(channel);

    let incoming: Awaited<ReturnType<typeof loadOlderChatPage>>;
    try {
      incoming = await loadOlderChatPage({ channel, page });
    } catch {
      return; // Non-fatal and retried, exactly as the this.#alerts sibling above.
    } finally {
      this.#chatPages.settled();
    }

    if (incoming.length === 0) {
      this.#chatPages.exhausted(channel);
      return;
    }

    this.#chatPages.arrived(channel, incoming, page);
    /*
      The SECOND nudge. The reference does two and they are not duplicates: `+30` the instant the
      request goes out, which is above, and `+1` when a page greater than zero arrives, which is
      here. Prepending fifty rows leaves the browser free to keep `scrollTop` pointing at what is
      now different content, and one pixel is the smallest scroll that makes it recompute the
      anchor without visibly moving the reader.
    */
    scroller.scrollTop += CHAT_PAGE_ARRIVAL_NUDGE;
  }

  #maybeLoadOlderMessages(scroller: HTMLElement) {
    if (
      !shouldLoadOlderMessages({
        scrollTop: scroller.scrollTop,
        messageCount: this.#feeds.visibleChat.length,
        /*
          Always empty HERE, and deliberately not invented. The reference's roomlog component has
          its own `searchTerm` that filters the live log in place, and refuses to page while one is
          set — a filtered log is not a paged one. This room has no such filter: its chat search is
          the `chat-logs` archive modal, a separate view over its own query. The rule is kept whole
          in `shouldLoadOlderMessages` because it is the reference's, and this call site passes the
          only honest value it has.
        */
        searchTerm: '',
        hasMoreData: this.#chatPages.hasMore(this.#chat.tab),
        loadingMore: this.#chatPages.loading
      })
    ) {
      return;
    }
    /*
      `+30` the instant the request goes out, before any answer — upstream applies it synchronously
      after the emit, in the scroll handler itself. It moves the reader off the trigger zone so a
      continuing gesture is not fighting the threshold while the fetch is in flight.
    */
    scroller.scrollTop += CHAT_PAGE_REQUEST_NUDGE;
    void this.loadOlderChatMessages(this.#chat.tab, scroller);
  }
}
