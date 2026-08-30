import type { AlertFilterFor } from '#lib/alert-filter.js';
import type { AlertRow } from './alerts.svelte';
import { mergeOlderChatMessages } from '#lib/chat-paging.js';
import { webinarMessageVisible } from '#lib/chat-mode.js';
import { isMentionOf } from '#lib/mention.js';
import { trimChatLog } from '#lib/room-scroller.js';
import type { ChatTab, MessageActionItem, MessageBadge, MessageReactions } from '#lib/types.js';

/** The load values every pipeline reads, taken as a thunk so a navigation reaches them. */
export interface FeedSession<Alert, Message> {
  user: { id: number; displayName: string; hasAdminChat?: boolean };
  alerts: readonly Alert[];
  messages: readonly Message[];
  badges?: {
    byEmailHash?: Record<string, readonly number[]>;
    definitions?: Record<string, MessageBadge & { darkTheme?: number }>;
  } | null;
  sessData?: {
    enableBadges?: boolean;
    showBadgesToPresentersOnly?: boolean;
    modAlertFilterList?: string | null;
  } | null;
}

import type { RoomAlerts } from './alerts.svelte';
import type { RoomChat } from './chat.svelte';
import type { RoomLogPages } from './log-pages.svelte';

/** The client-side overlay applied to a captured message, keyed by its evidence key. */
export interface EvidencePatch {
  hidden?: boolean;
  answered?: boolean;
  body?: string;
  reactions?: MessageReactions;
}

/*
  What each pane actually RENDERS, and the client-side overlay on captured rows.

  Phase 5 slice 9. Twelve declarations and functions, 230 lines. Two things that look separate and
  are one: the read pipelines, and the evidence state every one of them consults.

  ## Why the overlay cannot live anywhere else

  `evidenceMessageState` is what makes a captured row respond to a click before the server has
  answered — a delete hides it, an edit changes its text, a reaction updates its pill. Every
  pipeline below filters on `#isHidden` and maps `#withEvidence`, so a class holding the state
  without the pipelines would be a field with four readers on the other side of a boundary.

  ## The two columns share ONE function, deliberately

  `chatMessagesFor` is called twice — once per column — rather than written as two deriveds. Six
  steps duplicated is six chances to drift, and the extra column arrived after the main one, which
  is exactly when that happens.

  ## What it does NOT decide

  **The rules.** `mergeOlderChatMessages` matches on identity and never on order,
  `webinarMessageVisible` carries the reference's asymmetry about `@`, `isMentionOf` is the one
  mention rule the highlight and the popup also use, and the alert filter fails OPEN in three
  distinct ways inside `#lib/alert-filter.js`. All are transcriptions tested where they live.

  **Ordering and paging.** `RoomLogPages` holds the older pages; this class merges them.

  ## The performance finding this class used to carry, and where it went

  `visibleAlerts` runs six chained passes over `data.alerts` merged with every older page the reader
  has scrolled back to, and until 2026-08-16 NOTHING bounded the second half: it grew with each page
  pulled and never shrank for the life of the session.

  Fixed where the bound belongs, which is not here. The reference releases that history the moment
  the reader returns to the bottom — `currPage > 0 && this.trimFat()` — and this room implemented
  only the other half of that same expression. `RoomLogPages.releaseHistory` carries the
  transcription; `RoomFeedScroll` calls it beside the `arm()` it always called.

  Worth keeping in view here anyway, because this is where the cost is PAID: the passes below are
  proportional to what `RoomLogPages` is holding, so the two files have to stay honest together.
  Nothing in this class caps anything, and it should not start.
*/
export class RoomFeeds<
  Alert extends MessageActionItem & AlertRow,
  Message extends MessageActionItem & { room: string }
> {
  readonly #alerts: RoomAlerts;
  readonly #chat: RoomChat;
  readonly #alertPages: RoomLogPages<Alert>;
  readonly #chatPages: RoomLogPages<Message>;
  readonly #session: () => FeedSession<Alert, Message>;
  readonly #prefs: { readonly trimChatLogs: boolean };
  readonly #isPresenter: () => boolean;
  readonly #webinarMode: () => boolean;
  readonly #theme: () => string;
  readonly #unreadQa: ReadonlySet<number>;
  readonly #alertsLogKey: string;

  #evidence: Record<string, EvidencePatch>;

  /*
    `doChatLogSearch`'s answer, per column, or `null` when no search is running.

    `$state.raw` because each is REPLACED wholesale by the server's next answer and no row in it is
    ever mutated — a deep proxy would be paid on every read by the pipeline below and would buy
    reactivity nothing asks for.

    `null` and `[]` are different and both happen: `null` shows the log, `[]` shows that this term
    matched nothing. Collapsing them would make a search that found nothing look like no search, and
    a reader would read their whole log as the result.
  */
  #chatSearchResults = $state.raw<readonly Message[] | null>(null);
  #extraChatSearchResults = $state.raw<readonly Message[] | null>(null);

  constructor(options: {
    alerts: RoomAlerts;
    chat: RoomChat;
    alertPages: RoomLogPages<Alert>;
    chatPages: RoomLogPages<Message>;
    session: () => FeedSession<Alert, Message>;
    /** `trimChatLogs` is the preference FLAG, not a size - the cap itself lives in `trimChatLog`. */
    prefs: { readonly trimChatLogs: boolean };
    isPresenter: () => boolean;
    webinarMode: () => boolean;
    theme: () => string;
    /** The Q&A markers, owned by the alert path and read here to decorate a row. */
    unreadQa: ReadonlySet<number>;
    alertsLogKey: string;
  }) {
    this.#alerts = options.alerts;
    this.#chat = options.chat;
    this.#alertPages = options.alertPages;
    this.#chatPages = options.chatPages;
    this.#session = options.session;
    this.#prefs = options.prefs;
    this.#isPresenter = options.isPresenter;
    this.#webinarMode = options.webinarMode;
    this.#theme = options.theme;
    this.#unreadQa = options.unreadQa;
    this.#alertsLogKey = options.alertsLogKey;

    /*
      `$state.raw`, because this record is only ever REPLACED.

      `patchEvidence` builds a whole new object — `{ ...this.#evidence, [key]: { … } }` — and nothing
      writes a key in place. The docs reserve `.raw` for exactly that: *"In cases where you're
      dealing with large objects that are only ever reassigned (rather than mutated), use
      `$state.raw` instead."*

      What a deep proxy was costing here is not hypothetical. Every one of the six pipeline passes
      calls `#isHidden` and `#withEvidence` PER ROW, and each of those reads
      `this.#evidence[item.evidenceKey]` — so a proxied record meant a proxy hop per row per pass,
      on the hot path that renders the log. Replacing the object is what the code already does, so
      the fine-grained tracking bought nothing and charged for it on every render.
    */
    this.#evidence = $state.raw<
      Record<
        string,
        {
          hidden?: boolean;
          answered?: boolean;
          body?: string;
          reactions?: MessageReactions;
        }
      >
    >({});
  }

  /** The alert filter's current selection, saved by the modal and read by the pipeline. */
  get filterFor(): AlertFilterFor | undefined {
    return this.#alerts.filterFor;
  }

  /*
    The live tail from the load, with whatever older pages the reader has scrolled back to in front
    of it — the same two-lifetime split the chat log uses, and for the same reason: `data.alerts` is
    replaced by every `invalidateAll()`, so older pages held there would be discarded by one new
    alert.
  */
  get visibleAlerts() {
    return (
      mergeOlderChatMessages(this.#alertPages.older(this.#alertsLogKey), this.#session().alerts)
        .filter((item) => !this.#isHidden(item))
        .map((item) => this.#withEvidence(item))
        .filter(this.#alerts.matchesSearch)
        /*
        THE ALERT FILTER — the second of the reference's three sites, `case "getAlertsLog"` at byte
        1,017,070.

        `senderEmailHash` is this room's name for what the reference calls `avt`: the gravatar hash
        of the sender's email, which is what the selection is keyed by. `alerts-advanced-search.ts`
        matches on the same field for the same reason.

        The predicate lives in `#lib/alert-filter.js` rather than here because it fails OPEN in three
        distinct ways and inlining it would put that logic in three places.
      */
        .filter(this.#alerts.passesFilter(this.#session().sessData?.modAlertFilterList))
        .filter(this.#alerts.afterArchive)
        .map((item) => ({ ...item, unreadQa: this.#unreadQa.has(item.id) }))
    );
  }

  /**
   * THE ALERT FILTER, site three of three — the alerts SEARCH results, byte 1,020,817.
   *
   * `case "doChatLogSearch"`, in the `"alerts" == i.type` branch:
   *
   * ```js
   * try {
   *   sessData.modAlertFilterList?.trim()?.length > 0 &&
   *     Object.keys(user.alertFilterFor).length > 0 &&
   *     (i.data = i.data.filter(se =>
   *       preferences.showAlertsFrom ? user.alertFilterFor[se.avt] : !user.alertFilterFor[se.avt]))
   * } catch {}
   * globals.alertsSearchResults = i.data.reverse();
   * ```
   *
   * The reference filters the RESULTS the server sent back; `#alerts-advanced-search-modal` here
   * searches the rows this room already holds, so the filter is applied to the input instead. Same
   * observable result — a filtered-out trader's alerts cannot appear in a search — and it keeps the
   * predicate in one place rather than reaching into `filterAlerts`.
   *
   * Separate from `visibleAlerts` because the advanced search deliberately does NOT inherit the
   * toolbar's search term, the archive cut-off or the evidence-hidden rules; sharing that chain
   * would quietly narrow the search to whatever the list happens to be showing.
   */
  get searchableAlerts() {
    return this.#session().alerts.filter(
      this.#alerts.passesFilter(this.#session().sessData?.modAlertFilterList)
    );
  }

  /**
   * THE SAME PREDICATE, for rows this room did not load — site three-and-a-half.
   *
   * `searchableAlerts` above still feeds the alerts PANE. The advanced-search MODAL stopped reading
   * it on 2026-08-23, because filtering the newest fifty rows is what made its date range answer
   * "no results" over a log that had them; it asks the database now.
   *
   * That move would have silently reopened the alert filter: the server has no idea which traders
   * this viewer has filtered out, so a muted trader's alerts would have come back in search results
   * and nowhere else. `alert-filter-contract.test.ts` names this as site three of three and says
   * the filtered-out must not appear in a search — so the predicate travels to the results instead
   * of the results coming to the predicate.
   */
  get alertSearchFilter() {
    return this.#alerts.passesFilter(this.#session().sessData?.modAlertFilterList);
  }

  /*
    The live tail from the load, with whatever older pages the reader has scrolled back to in front
    of it.

    The two halves have different lifetimes on purpose: `data.messages` is replaced by every
    `invalidateAll()`, which is every SSE event, while the held older pages survive them. Merging
    rather than concatenating because offset paging over a live tail can hand the boundary row back
    twice — see `mergeOlderChatMessages`, which matches on identity and never on order.

    The trim runs AFTER the merge, so `prefs.trimChatLogs` still caps what is held at the reference's 300
    however far back somebody paged. Trimming first would let the cap be exceeded by exactly the
    pages this feature adds.
  */
  get visibleChat() {
    return this.chatMessagesFor(this.#chat.tab, this.#chatSearchResults, 'main');
  }

  /**
   * What `doChatLogSearch` returned for a column, or `null` to put it back on its log.
   *
   * Written from the remote query's result. `RoomChat` clears it through its `searchCleared`
   * receiver on an emptied box or a channel switch — see the note there for why the term lives on
   * that class and these rows live here.
   */
  setChatSearchResults(column: 'main' | 'extra', rows: readonly Message[] | null): void {
    if (column === 'main') this.#chatSearchResults = rows;
    else this.#extraChatSearchResults = rows;
  }

  /** Whether either column is showing search results rather than its log. Drives the empty state. */
  chatSearchActive(column: 'main' | 'extra'): boolean {
    return (column === 'main' ? this.#chatSearchResults : this.#extraChatSearchResults) !== null;
  }

  /*
    The extra column's rows, through the SAME pipeline as the main column's — merge, trim, hide,
    badge, and the webinar filter — differing only in which channel it reads. Written as a function
    so the two columns cannot drift: a second derived would be a second copy of six steps.
  */
  get visibleExtraChat() {
    return this.chatMessagesFor(this.#chat.extraTab, this.#extraChatSearchResults, 'extra');
  }

  /**
   * A sender's badges, resolved the way `app-st-message.full.js` byte 28120 resolves them.
   *
   * ```js
   * for (let o = 0; o < this.msg.b.length; o++) {
   *   let r = sessData.badgesH[this.msg.b[o]];
   *   r && r.darkTheme && 'darkTheme' === preferences.theme && (r = sessData.badgesH[r.darkTheme]);
   *   r && (this.badges += r.imgURL ? '<img …>' : '<span class="badge …">' + r.text + '</span>');
   * }
   * ```
   *
   * Three things carried across exactly:
   *
   * * **The dark-theme swap is a LOOKUP, not a flag.** `r.darkTheme` holds the id of a variant
   *   badge and the whole definition is replaced with it. This is the render-site proof of T5-27,
   *   which had been established from the manage page alone.
   * * **An id with no definition renders nothing.** `r &&` — a badge deleted from the account while
   *   still assigned to a member is skipped, not drawn as a blank chip.
   * * **A missing variant falls back to the original.** `badgesH[r.darkTheme]` can itself be
   *   undefined if the variant was deleted; upstream would then render nothing, so the `?? badge`
   *   here is a deliberate divergence — losing a badge because its DARK variant was deleted is a
   *   worse outcome than showing the light one.
   *
   * Returns `[]` rather than undefined so `RoomMessage`'s own gate chain does the deciding; this
   * function answers "which badges", never "should badges show".
   */
  badgesFor(emailHash: string | null | undefined): MessageBadge[] {
    if (!emailHash) return [];
    const ids = this.#session().badges?.byEmailHash?.[emailHash];
    if (!ids?.length) return [];
    const definitions = this.#session().badges?.definitions ?? {};
    const resolved: MessageBadge[] = [];
    for (const id of ids) {
      const badge = definitions[String(id)];
      if (!badge) continue;
      const variant =
        this.#theme() === 'dark' && typeof badge.darkTheme === 'number'
          ? (definitions[String(badge.darkTheme)] ?? badge)
          : badge;
      resolved.push({
        text: variant.text,
        color: variant.color,
        backgroundColor: variant.backgroundColor,
        imageUrl: variant.imageUrl
      });
    }
    return resolved;
  }

  #withEvidence<T extends MessageActionItem>(item: T): T {
    if (!item.evidenceKey) return item;
    const state = this.#evidence[item.evidenceKey];
    if (!state) return item;

    return {
      ...item,
      ...(state.answered === undefined ? {} : { answered: state.answered }),
      ...(state.body === undefined
        ? {}
        : {
            body: state.body,
            evidenceBodySegments: undefined
          }),
      ...(state.reactions === undefined ? {} : { reactions: state.reactions })
    } as T;
  }

  #isHidden(item: MessageActionItem) {
    return Boolean(item.evidenceKey && this.#evidence[item.evidenceKey]?.hidden);
  }

  patchEvidence(
    item: MessageActionItem,
    patch: {
      hidden?: boolean;
      answered?: boolean;
      body?: string;
      reactions?: MessageReactions;
    }
  ) {
    if (!item.evidenceKey) return;
    this.#evidence = {
      ...this.#evidence,
      [item.evidenceKey]: {
        ...this.#evidence[item.evidenceKey],
        ...patch
      }
    };
  }

  /**
   * @param searchResults when non-null, these rows REPLACE the log — `doChatLogSearch`'s behaviour.
   *
   * ## Search results go through the SAME filters, and upstream's do not
   *
   * The handler at byte 1,020,422 assigns straight to `globals.chatSearchResults` and renders that.
   * It can afford to: upstream applies WEBINAR MODE as messages ARRIVE, dropping them before they
   * ever reach a log — so its search results, which come from the server rather than from arrival,
   * are simply not filtered by it at all.
   *
   * This room applies webinar mode as a VIEW filter, because it re-reads its log from the server on
   * every invalidate and a drop-on-arrival would be undone by the next load (recorded below). Feeding
   * search results in ahead of that filter rather than through it would therefore have handed a
   * member, in webinar mode, every other member's messages — the exact thing the mode exists to
   * hide, reachable by typing a letter into a search box.
   *
   * So the results enter the pipeline at the point the merged log leaves it, and everything after —
   * hidden rows, webinar mode, evidence, badges — applies to both identically. **This is a
   * divergence from the capture in the direction of the mode's own intent**, and it is the reason
   * this parameter exists rather than a second getter that returns the raw rows.
   *
   * The trim and the older-page merge are skipped for a search, and that is not an omission: both
   * are about the LIVE log's length and the reader's scroll position, and neither has any meaning
   * for a result set the server bounded to one page.
   */
  chatMessagesFor(
    tab: ChatTab,
    searchResults: readonly Message[] | null,
    column: 'main' | 'extra'
  ) {
    return (
      (
        searchResults ??
        trimChatLog(
          mergeOlderChatMessages(this.#chatPages.older(tab), this.#session().messages),
          this.#prefs.trimChatLogs
        )
      )
        .filter((item) => item.room === tab && !this.#isHidden(item))
        /*
          `acA-04` — "MOD ONLY", the checkbox in the chat toolbar, transcribed:

          ```js
          const {modOnly: r} = globals.filterChatMsgs;
          r && (e = e.filter(a => { if (a.uid === s.userXrefID || r && a.isA) return !0 }))
          ```                                                                  // byte 1,414,769

          Your own messages survive the filter alongside the moderators', which reads like an
          oversight and is not: a filter that hid what you had just typed would look like the send
          failing. The `r &&` inside the callback is upstream's, and redundant — the whole `filter`
          only runs when `r` is true — so it is not restated here.

          APPLIED TO SEARCH RESULTS TOO, which upstream cannot do: its toggle re-requests the log and
          drops the search. A result set that contradicted the checkbox above it would be the same
          class of defect `alertSearchFilter` exists to prevent — the filtered-out must not reappear
          in a search.
        */
        .filter(
          (item) =>
            !this.#chat.modOnly(column) ||
            item.senderId === this.#session().user.id ||
            item.isAdmin === true
        )
        /*
        WEBINAR MODE. Upstream applies this as messages ARRIVE, dropping them before they ever reach
        the log; applied here as a view filter instead, because this room re-reads its log from the
        server on every invalidate and a drop-on-arrival would be undone by the next load.

        The rule is the reference's, term for term — see `webinarMessageVisible`, including the
        asymmetry that a message containing an `@` is dropped even when it is an admin message.

        `isMention` is computed with the SAME rule the highlight and the popup use, rather than the
        loose `indexOf('@')` upstream tests separately: one mention rule, in `#lib/mention.js`.
      */
        .filter((item) =>
          !this.#webinarMode()
            ? true
            : webinarMessageVisible(
                {
                  isAdmin: item.isAdmin === true,
                  senderId: item.senderId,
                  body: item.body,
                  isMention: isMentionOf(
                    item.body,
                    this.#session().user.displayName,
                    item.isAdmin === true
                  )
                },
                {
                  id: this.#session().user.id,
                  isPresenter: this.#isPresenter(),
                  hasAdminChat: this.#session().user.hasAdminChat === true
                }
              )
        )
        .map((item) => this.#withEvidence(item))
        /*
        `msg.b` — the sender's badges, attached here rather than stored on the row.

        Upstream they ride on the message itself, because that server owns both the chat log and
        the badge assignments. Ours do not: badges live in the controller and messages in the room's
        own database, so they are joined at render time on `senderEmailHash`, which every message
        already carries. A member given a badge mid-session sees it on their NEXT message upstream
        and on ALL of them here — a divergence in our favour, and the alternative would be
        denormalising controller state into room rows that then go stale.
      */
        .map((item) => ({ ...item, badges: this.badgesFor(item.senderEmailHash) }))
    );
  }
}
