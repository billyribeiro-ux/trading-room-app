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

  ## A performance finding this class does NOT fix

  `visibleAlerts` runs six chained passes over a list NOTHING bounds — `data.alerts` plus every
  older page the reader has scrolled back to. `trimChatLog` caps the chat columns at the
  reference's 300; alerts have no equivalent. At 10,000 alerts that is 60,000 operations per render.
  Pre-existing, recorded in `TODO.md`, and deliberately not fixed inside a move — the fix changes
  behaviour and belongs in its own change with its own measurement.
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

    this.#evidence = $state<
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
    return this.chatMessagesFor(this.#chat.tab);
  }

  /*
    The extra column's rows, through the SAME pipeline as the main column's — merge, trim, hide,
    badge, and the webinar filter — differing only in which channel it reads. Written as a function
    so the two columns cannot drift: a second derived would be a second copy of six steps.
  */
  get visibleExtraChat() {
    return this.chatMessagesFor(this.#chat.extraTab);
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

  chatMessagesFor(tab: ChatTab) {
    return (
      trimChatLog(
        mergeOlderChatMessages(this.#chatPages.older(tab), this.#session().messages),
        this.#prefs.trimChatLogs
      )
        .filter((item) => item.room === tab && !this.#isHidden(item))
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
