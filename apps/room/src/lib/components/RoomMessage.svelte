<script lang="ts">
  import { parseBodySegments, tickerColorStyle } from '#lib/message-body-segments.js';
  import MessageBody from '#lib/components/MessageBody.svelte';
  import type { MessageAction, MessageActionEvent, RoomMessageItem } from '#lib/types.js';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import type { EmojiDumpEntry } from '#lib/emoji-data.js';
  import { isMentionOf } from '#lib/mention.js';
  import type { AlertLabel } from '#lib/alert-labels.js';
  import { safeChatHtml } from './chat-safe-html';
  import { ngbTooltipWith } from '#lib/ngb-tooltip.js';
  import MessageMenu from '#lib/components/MessageMenu.svelte';
  import {
    alertDateFormatter,
    chatTimeFormatter,
    compactTimeFormatter,
    longDateFormatter
  } from '#lib/message-formatters.js';
  import { messageMenuAllows, sourceMessageBehavior } from '#lib/message-behavior.js';
  import type { FollowChatStyle } from '#lib/types.js';
  import { type PresenterColors } from '#lib/presenter-colors.js';
  import { resolveMessageStyles } from '#lib/message-styles.js';
  import { hideMessageAvatar, type ChatDisplayMode } from '#lib/chat-display-mode.js';
  import {
    alertQaCountText,
    TRIAL_BADGE_TEXT,
    usernameRowStyle
  } from '#lib/message-renderer-differences.js';

  type MessageKind = 'alert' | 'chat';

  interface Props {
    item: RoomMessageItem;
    kind: MessageKind;
    currentUserId: number;
    currentUserEmailHash: string;
    viewerIsPresenter: boolean;
    theme: 'light' | 'dark';
    menuOpen: boolean;
    showDateSeparator: boolean;
    currentUserName?: string;
    /**
     * The room's configured Alert Labels, already parsed by the page.
     *
     * Parsed once there rather than per message: `parseAlertLabels` runs `JSON.parse` and this
     * component instantiates one copy PER RENDERED MESSAGE. The same reasoning the three date
     * formatters below are hoisted for.
     *
     * Only consulted when `kind === 'alert'` — see `parseBodySegments`.
     */
    alertLabels?: readonly AlertLabel[];
    followedStyle?: FollowChatStyle;
    /**
     * This SENDER's presenter colours, looked up by the call site from the room's map.
     *
     * Per message and therefore not on `RoomMessageChrome`, for the same reason `followedStyle` is
     * not: the MAP is the same for every message, the lookup is not. Both are looked up at the same
     * three call sites, from the same `item.senderEmailHash`.
     *
     * `#lib/presenter-colors.ts` holds the reference transcription and the precedence table. In
     * short: this beats the viewer's `chatStyle` and the message's own colours, and loses to
     * `followedStyle`, which is the viewer's explicit decision about one particular person.
     */
    presenterStyle?: PresenterColors;
    /**
     * Whether the kebab menu is drawn at all. Default TRUE — every log draws it.
     *
     * FALSE has exactly one caller: the advanced-alert-search modal, and it is a recorded divergence
     * rather than a preference. The reference renders `app-st-message` there with its full menu
     * (byte 2,421,116) and binds ONE handler of its own, `copyTradeOnClick`. This room has no route
     * from that modal to the message-action command — `ModalHost` is handed `onQaAction` and nothing
     * else — so drawing the menu here would draw twelve entries that cannot act, which is the
     * dead-control defect this repository spends most of its time removing. Drawing the row without
     * a kebab is the honest half of the reference's behaviour; the other half is named in the audit.
     */
    showMenu?: boolean;
    chatStyle?: FollowChatStyle;
    allowDeleteOwnMessage?: boolean;
    usersPublicReply?: boolean;
    userPrivateMessaging?: boolean;
    userToPresenterPrivateMessaging?: boolean;
    disablePrivateMessagingForTrials?: boolean;
    currentUserIsTrial?: boolean;
    viewerIsLimitedPresenter?: boolean;
    enableReactions?: boolean;
    enableQaReactions?: boolean;
    isQaMessage?: boolean;
    hasQaOnAlerts?: boolean;
    enableEditMessage?: boolean;
    enableEditAlerts?: boolean;
    hideAvatars?: boolean;
    /** The first term of `hideAvatar`. See `hideMessageAvatar`. */
    altChatRender?: boolean;
    presenterMessagesOnTheRight?: boolean;
    /**
     * `preferences.chatGif` — whether an inline `.gif` plays, or shows a click-to-reveal placeholder.
     *
     * Default TRUE, matching the reference's blob (`chatGif:!0`). It is passed into the
     * `urlwrapImg` pipe as its second argument (`main.d6d3c112b59b7d0d.js` byte 1326105), and gates
     * ONLY `.gif` — a `.png` is never muted.
     */
    chatGif?: boolean;
    chatBadges?: boolean;
    enableBadges?: boolean;
    showBadgesToPresentersOnly?: boolean;
    showNewIndicator?: boolean;
    /**
     * "Copy trades" — whether `[{( … )}]` in an ALERT becomes a click-to-copy order.
     *
     * On the chrome rather than per call site, for the reason that type exists: three components
     * render a message, and a room setting handed to each separately is one that a component will
     * stop being handed. Defaults `false`, so a room that never configured it renders the marker as
     * the literal text it is.
     */
    copyTrades?: boolean;
    disableStarYears?: boolean;
    /**
     * `displayMode` — `'r'` renders the card, `'c'` renders the compact single line.
     *
     * A PROP rather than a preference read here, for the reason the whole chrome exists: the mode is
     * resolved once per surface (`resolveChatDisplayMode`, which the owner's `altChatRender` can
     * force) and handed down. A component that read the preference itself would be a second answer
     * to a question the surface has already asked.
     */
    displayMode?: ChatDisplayMode;
    /**
     * RM-16 — `extraChatMsg`, true for every row the EXTRA chat column renders.
     *
     * Upstream it is read in two places and this component is one of them: it switches the gif
     * placeholder's id to `gifExtra_<id>` so the same message in both panes does not produce two
     * elements with one DOM id. The OTHER place is the mention router, which is
     * `MessageActions.handle`'s `fromExtraColumn` here and already wired.
     */
    extraChatMsg?: boolean;
    ontoggle: (id: number) => void;
    /*
      `MSB-03` — the payload is the SHARED `MessageActionEvent` now, and the two interfaces that used
      to sit at the top of this file are gone.

      They were local copies: `MessageReactionPayload` re-declared, and `TradeCopyPayload` re-declared
      under a comment that said outright *"`#lib/types.ts`'s `TradeCopyPayload`, restated locally
      beside its sibling above."* A duplication with its own note explaining that it is one is still
      a duplication — it stayed structurally compatible by luck, and `MessageActionEvent` gaining a
      fourth member is what ended the luck. Nothing here ever narrowed the payload; it only respelled
      it.
    */
    onaction: (action: MessageAction, item: RoomMessageItem, payload?: MessageActionEvent) => void;
  }

  let {
    item,
    kind,
    currentUserId,
    currentUserEmailHash,
    viewerIsPresenter,
    theme,
    menuOpen,
    showDateSeparator,
    currentUserName = '',
    alertLabels = [],
    followedStyle,
    presenterStyle,
    showMenu = true,
    chatStyle,
    allowDeleteOwnMessage = false,
    usersPublicReply = false,
    userPrivateMessaging = false,
    userToPresenterPrivateMessaging = false,
    disablePrivateMessagingForTrials = false,
    currentUserIsTrial = false,
    viewerIsLimitedPresenter = false,
    enableReactions = false,
    enableQaReactions = false,
    isQaMessage = false,
    hasQaOnAlerts = false,
    enableEditMessage = false,
    enableEditAlerts = false,
    hideAvatars = false,
    altChatRender = false,
    presenterMessagesOnTheRight = false,
    chatGif = true,
    chatBadges = false,
    enableBadges = false,
    showBadgesToPresentersOnly = false,
    showNewIndicator = false,
    copyTrades = false,
    disableStarYears = false,
    displayMode = 'r',
    extraChatMsg = false,
    ontoggle,
    onaction
  }: Props = $props();

  let reactionPickerOpen = $state(false);
  let reactionPickerTrigger = $state<'menu' | 'pill' | null>(null);

  const isOwnMessage = $derived(item.senderId === currentUserId);
  const isAdminMessage = $derived(item.isAdmin === true);
  const capturedMenuItems = $derived(viewerIsPresenter ? item.evidenceMenuItems : undefined);
  const behavior = $derived(
    sourceMessageBehavior({
      kind,
      viewerIsPresenter,
      viewerIsLimitedPresenter,
      isOwnMessage,
      isAdminMessage,
      allowDeleteOwnMessage: !viewerIsPresenter && isOwnMessage && allowDeleteOwnMessage,
      usersPublicReply,
      userPrivateMessaging,
      userToPresenterPrivateMessaging,
      disablePrivateMessagingForTrials,
      currentUserIsTrial,
      enableReactions,
      enableQaReactions,
      isQaMessage,
      enableEditMessage,
      enableEditAlerts
    })
  );
  /*
    The twelve menu gates, as ONE object.

    They were twelve near-identical three-line derivations here until 2026-08-28, when
    `altChatRender` made a second renderer necessary and copying them would have meant twelve
    entitlement rules written out twice. `messageMenuAllows` states the gate-to-label mapping once;
    `MessageMenu.svelte` renders it.
  */
  const menuAllows = $derived(messageMenuAllows(behavior, capturedMenuItems));

  /*
    `hideAvatar` — `hideAvatars` is only one of its two terms.

    The other is `altChatRender`, and it applies to CHAT and the Q&A thread and NOT to the alerts
    log. That asymmetry is upstream's; `hideMessageAvatar` carries the transcription and the reason
    it is reproduced rather than tidied.
  */
  const hideAvatar = $derived(
    hideMessageAvatar({ altChatRender, hideAvatars, kind, isQaMessage })
  );
  /*
    ── RM-05 — AN ADMIN'S ALERT TAKES THE ADMIN CARD, and the `kind === 'chat'` term was OURS ──────

    Both renderers gate the admin/member split on a comparison against a log type that does not
    exist:

    ```js
    O(3, o.msg.isA && "alert" != o.logType ? 3 : 4)                       // app-st-message,        1,361,608
    O(3, o.msg.isA && "alert" != o.logType && "pc" != o.logType ? 3 : 4)  // app-st-compactmessage, 1,400,148
    ```

    `"alert"` is SINGULAR and the log types are `alerts`, `chat` and `pc`. That is not read off one
    site and assumed: every `logType` literal in the bundle was enumerated — 32 `alerts`, 23 `chat`,
    3 `pc`, and exactly 2 `alert`, which are these two comparisons and nothing else. So the term is
    dead in both, and `"pc" != o.logType` — which IS live — never applies to this component, because
    a private message renders through `CompactMessageRow`. Upstream's gate is therefore `msg.isA`,
    in both renderers, for everything this file draws.

    The box class says the same thing with no term at all: `ct(30, o6, e.msg.isA)` at byte 1,334,988
    and `ct(27, o6, e.msg.isA)` at 1,343,627, where `o6 = t => ({"msg-box-adm": t})`. A gate written
    twice, once with a dead condition and once without, is the reference telling you which one it
    meant.

    **WHAT CHANGES ON SCREEN:** an alert posted by a presenter now renders as the reversed admin
    card — right-aligned, `msg-box-adm` — where it rendered as a member's forward card before. The
    audit row flagged this as a candidate rather than a certainty because the captured DOM might
    have been the better authority and could not be read in this checkout. It still cannot; the
    enumeration above settles it from the bundle instead, and captured rows are unaffected either
    way because `evidenceDirection` and `evidenceMessageBoxClass` still win outright.
  */
  const reverseMessage = $derived(
    item.evidenceDirection ? item.evidenceDirection === 'reverse' : isAdminMessage
  );
  const messageBoxClass = $derived(
    item.evidenceMessageBoxClass ?? `msg-box pb-1${isAdminMessage ? ' msg-box-adm' : ''}`
  );
  const messageRowClass = $derived(
    `mr-1 d-flex ${reverseMessage ? 'flex-row-reverse' : 'flex-row'}`
  );
  const avatarRowClass = $derived(
    `d-flex ${reverseMessage ? 'flex-row-reverse ' : ''}justify-content-center align-items-start flex-nowrap mt-1`
  );
  /**
   * Every inline style this row carries, resolved once by `#lib/message-styles.js`.
   *
   * The precedence — presenter pair, then the viewer's follow override, then the room style, and
   * `evidenceKey` shutting all three off — was ninety lines of `$derived` here. It is one pure
   * function now, for the reason `source-size-contract` forced the question and the reason upstream
   * already has one: `invertTxtColorToggler(invertTxtColor, mode)` is a method, called by both
   * renderers, and the four-row answer table in `presenter-colors.ts` had no function to point at.
   */
  const styles = $derived(
    resolveMessageStyles({
      kind,
      presenterStyle,
      followedStyle,
      chatStyle,
      backgroundColor: item.backgroundColor,
      fontColor: item.fontColor,
      evidenceKey: item.evidenceKey,
      evidenceMessageBoxStyle: item.evidenceMessageBoxStyle,
      evidenceBodyStyle: item.evidenceBodyStyle
    })
  );
  const messageBoxStyle = $derived(styles.box);
  const backgroundInversionStyle = $derived(styles.backgroundInversion);
  const usernameStyle = $derived(styles.username);
  const dateStyle = $derived(styles.date);
  const bodyStyle = $derived(styles.body);
  /**
   * RM-21 — the ticker's colour, which is `parseStock`'s own and not the body's.
   *
   * `tickerColorStyle` lives beside the pass that emits the span. `evidenceKey` is applied HERE
   * rather than inside it, because "this row is captured DOM, do not repaint it" is a fact about
   * this component's evidence props and not about the reference's pipe.
   */
  const stockStyle = $derived(
    item.evidenceKey ? undefined : tickerColorStyle({ kind, chatStyle, followedStyle })
  );
  /*
    The shared rule, not a second copy. This was `item.body.includes('@' + currentUserName)` —
    case-sensitive, no trailing space and blind to `@all`, so `@Bob` never highlighted for bob,
    `@bobby` always did, and a presenter addressing the room with `@all ` highlighted for nobody.
    See `#lib/mention` for the reference's own three terms.
  */
  const isMention = $derived(isMentionOf(item.body, currentUserName, isAdminMessage));
  /**
   * RM-07 — `questionColor` applies on ALERTS too, and the `kind === 'chat'` gate here was ours.
   *
   * ```js
   * Kn(13, Ew, e.msg.isMention && !e.hasCustomFollowedUserColors,
   *          e.msg.txt.includes("?") && !e.hasCustomFollowedUserColors)   // byte 1,331,638
   * const Ew = (t, n) => ({ mentionColor: t, questionColor: n })
   * ```
   *
   * Two conditions and neither mentions the log type. The card's alert branch reads the same
   * expression as its chat branch, so an alert containing a question mark is tinted upstream and
   * was not here — which matters most on the surface where questions are the point, since an alert
   * is what `hasQAOnAlerts` invites a question about.
   */
  const isQuestion = $derived(
    item.evidenceQuestion ?? (item.body.includes('?') && followedStyle === undefined)
  );
  /**
   * RM-03 — the two colour classes the COMPACT body was missing.
   *
   * The same `Ew` map as the card's, applied by the compact member body `p_e` (byte 1,378,508), its
   * reply body `f_e` (1,378,951) and the compact admin body. Ours carried only layout classes, so a
   * member mentioned in compact mode got no highlight at all — and the mention colour is the one
   * signal that says a message is addressed to you.
   *
   * A separate derived from `messageBodyClass` and not a shared suffix, because the two bodies have
   * different layout classes and mirror on `reverseMessage`; the shared part is the CONDITIONS,
   * which are these two expressions and are written once here.
   */
  const bodyColorClasses = $derived(
    `${isMention && followedStyle === undefined ? ' mentionColor' : ''}${isQuestion ? ' questionColor' : ''}`
  );
  const messageBodyClass = $derived(
    `msg-left text-formated preText ml-2 mr-2 p-0${bodyColorClasses}${presenterMessagesOnTheRight ? ' presenter-msg-right' : ''}`
  );
  const reactions = $derived(Object.entries(item.reactions ?? {}));
  const visibleBadges = $derived(
    chatBadges &&
      !presenterMessagesOnTheRight &&
      enableBadges &&
      (item.badges?.length ?? 0) > 0 &&
      (!showBadgesToPresentersOnly || viewerIsPresenter)
      ? (item.badges ?? [])
      : []
  );



  /**
   * The three body passes, from `#lib/message-body-segments.js`.
   *
   * They were 200 lines of this component until `source-size-contract` refused the file, and the
   * seam is the reference's own: upstream they are PIPES — `parseSymbols`, `parseLinks`,
   * `parseStock` — pure transforms of one string that every body-rendering template shares. The
   * context object is what they read besides the string.
   */
  const segmentContext = $derived({
    kind,
    messageId: item.id,
    alertLabels,
    copyTrades
  });
  const stockSegments = $derived(parseBodySegments(item.body, segmentContext));
  const replyStockSegments = $derived(
    item.replyToBody ? parseBodySegments(item.replyToBody, segmentContext) : []
  );

  /*
    The three formatters live in `#lib/message-formatters.js` and are built ONCE for the page.

    This script runs per rendered item — one per alert, one per chat message — so declaring them
    here constructed three `Intl.DateTimeFormat` objects per message, of which at most one is ever
    called: the long date only under the separator, the alert stamp only on the alert branch, the
    chat time only on the chat branch. Construction costs ~35x a `format()` call, and the objects
    are byte-identical every time because the locale and every option are literals.
  */
  function runAction(action: MessageAction, payload?: MessageActionEvent) {
    onaction(action, item, payload);
  }

  function chooseReaction(entry: EmojiDumpEntry) {
    runAction('reaction', { key: entry.id, emoji: entry.glyph });
    window.setTimeout(() => {
      reactionPickerOpen = false;
      reactionPickerTrigger = null;
    }, 500);
  }



  // `.img-container` is `inline-flex` (shrink-to-fit) and `.uploaded-img` is `width: 100%`, so the
  // used width is circular and stays collapsed until the bytes arrive - the width/height
  // attributes only supply the aspect ratio. Publishing the intrinsic width lets the paired
  // app.css rule reserve the exact box the image settles into.
  function uploadWidthVariable(intrinsicWidth: number | null | undefined) {
    return typeof intrinsicWidth === 'number' && intrinsicWidth > 0
      ? `--upload-intrinsic-width: ${intrinsicWidth}px;`
      : undefined;
  }

  function evidenceImageAttachment(url: string) {
    return (node: HTMLElement) => {
      const onclick = `openImageModal(event,'${url.replaceAll("'", "\\'")}')`;
      node.setAttribute('onclick', onclick);
      return () => {
        if (node.getAttribute('onclick') === onclick) node.removeAttribute('onclick');
      };
    };
  }
</script>


<!--
  The Ask-a-question button, which BOTH hosts render and which was written out twice.

  The two blocks were character-for-character identical and the reference's two are too — compact
  const 69 and card const 70 are the same eleven-entry array:

  ```
  ["title","Ask a question",1,"btn","btn-sm","btn-secondary","me-1","alert-qa",3,"click","ngClass","ngStyle"]
  ```

  Only the source ORDER differs, and that difference is upstream's: the compact alerts row (`r_e`,
  1,377,512) puts the stamp before the button and the card puts the button before the stamp. A
  snippet keeps the order at the call sites, where it belongs, and the button in one place.

  Its ONE parameter is `compact`, and RMSG-03 is why: the count span is the single thing the two
  renderers spell differently. Everything else it reads is this component's — nothing crosses a
  props boundary, which is the test of whether a snippet is the right tool rather than a component.
-->
{#snippet alertQaButton(compact: boolean)}
  {#if !isQaMessage && hasQaOnAlerts}
    <button
      title="Ask a question"
      class={[
        'btn btn-sm btn-secondary me-1 alert-qa',
        {
          'btn-danger': Boolean(item.unreadQa),
          animated: Boolean(item.unreadQa),
          flash: Boolean(item.unreadQa)
        }
      ]}
      style={bodyStyle}
      onclick={() => runAction('question')}
    >
      <!--
        The captured button keeps a literal space inside each span - `> (1) <` and `> ✅<` - and that
        space is what separates the checkmark from the icon. Svelte trims whitespace at element
        boundaries, so it has to be written as an expression to survive into the rendered output.

        RMSG-03 — and the two renderers do NOT pad the COUNT the same way: `Ne(" (", n, ") ")` on
        the card, `Ne("(", n, ")")` in the compact row, with every other part of the button
        identical. `alertQaCountText`, in `#lib/message-renderer-differences.js`.
      -->
      {#if item.questionCount}
        <span class="me-1">{alertQaCountText(item.questionCount, compact)}</span>
      {/if}
      <i class="fas fa-question-circle"></i>
      {#if item.questionAnswered}<span>{' '}✅</span>{/if}
    </button>
  {/if}
{/snippet}

<!--
  The reactions strip — the pills and the add pill — as ONE implementation with THREE call sites.

  RM-22: the card's two containers are a `span.ms-1` (admin, const 29) and a bare `div` (member,
  const 6) — a difference in the WRAPPER and not in what it wraps — and the compact host's two
  differ from each other in nothing but a class. Four containers, one list; the compact branch kept
  its own copy until RMSG-06, and the gate it differed by was already implied by its container's.
-->
{#snippet reactionStrip(gated: boolean)}
              <!--
                RMSG-06 — three of the four repeaters gate the pill on `clickedBy.length > 0` and one
                does not, and as of 2026-09-02 this reproduces both.

                  Oge  1,333,312   card admin       O(1, e.value.clickedBy.length > 0 ? 1 : -1)
                  u1e  1,341,960   card member      the same
                  V1e  1,371,615   compact admin    the same
                  m_e  1,379,950   compact MEMBER   d(0,"span")(1,"span",51), x("click",…), v(2)

                `m_e` renders the pill unconditionally, and `addRemoveReaction` empties `clickedBy`
                rather than deleting the key — so once a reaction's last holder removes it, upstream
                draws `😀 0` on a compact member row and on no other row in the product.

                It was refused as a defect. It is one, and it is the reference's: the parameter is
                `false` from the single compact call site when that row is a MEMBER's, and `true`
                everywhere else, so exactly one of four hosts differs, as upstream.
              -->
              {#each reactions as [reactionKey, reaction] (reactionKey)}
                {#if !gated || reaction.clickedBy.length > 0}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    class={['badge chat-reaction', { 'chat-reaction-added': reaction.clickedBy.includes(currentUserEmailHash) }]}
                    onclick={() =>
                      runAction('reaction', {
                        key: reactionKey,
                        emoji: reaction.emoji
                      })}
                  >
                    {reaction.emoji}
                    {reaction.clickedBy.length}
                  </span>
                {/if}
              {/each}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!--
                RM-13 — `chat-reaction-hover` was OURS on this pill, and it made the control
                unreachable on a touch device.

                The class is REAL and captured — `.msg-box:hover .chat-reaction-hover{display:
                inline-block}` with `.chat-reaction-hover{display:none}` at byte 1,366,420 — but
                **no reference template applies it**. A rule with no wearer upstream is a rule
                upstream does not use, and reading one as an instruction is how a stylesheet
                becomes a spec.

                What it cost: the pill sat at `display: none` until the enclosing `.msg-box` was
                hovered. There is no hover on a phone, so adding a reaction was impossible there —
                the reference's pill is always visible, which is why it needs no such rule.

                The captured rule STAYS in `captured-runtime-components.css`. That file is
                evidence, not our stylesheet, and deleting a captured rule because we stopped
                wearing it would edit the record.
              -->
              <span
                class="badge chat-reaction"
                aria-describedby={reactionPickerOpen && reactionPickerTrigger === 'pill'
                  ? `message-reaction-popover-${kind}-${item.id}`
                  : undefined}
                onclick={() => {
                  reactionPickerOpen = !reactionPickerOpen;
                  reactionPickerTrigger = reactionPickerOpen ? 'pill' : null;
                }}
              >
                <i class="far fa-smile"></i>
              </span>
{/snippet}

<!--
  ONE separator, rendered by whichever host is on screen.

  The reference has it in BOTH components — each `styles:[…]` block carries its own `.separator`
  rule — so it must sit INSIDE a host or neither rule reaches it. A snippet is how that is one
  implementation and two call sites rather than two copies:
  `alert-chat-style-contract.test.ts` asserts there is exactly one, and it is right to.
-->
{#snippet dateSeparator()}
  <div class="separator">
    <!--
      RMSG-05 — the `<a>` takes `styleF` in BOTH components (const 6 is `[3,"ngStyle"]` in each
      table), and this room painted it with nothing. `DATE_SEPARATOR_TAKES_BODY_STYLE`.
    -->
    <!-- svelte-ignore a11y_missing_attribute -->
    <a style={bodyStyle}
      >{item.evidenceSeparatorText ?? longDateFormatter.format(item.createdAt)}</a
    >
  </div>
{/snippet}

<!--
  ── TWO HOSTS, ONE PER MODE — RM-01 ─────────────────────────────────────────────────────────────

  The reference has TWO COMPONENTS here, not one with a branch: `app-st-message` renders the card
  and `app-st-compactmessage` renders the single line, each with its own `styles:[…]` block. The
  feed picks between them (`y_e` renders `app-st-message`, its sibling `app-st-compactmessage`).

  This rendered BOTH modes inside the CARD host, so the compact branch inherited its
  stylesheet: 16px text where the compact component sets 14px, a 35px avatar where it sets 25px,
  `font-weight: 900` on the username where it sets 800 — and `nowrap` and `reactions-container`,
  which the compact markup already wore, had no rule anywhere in this repository.

  Two hosts rather than one component per mode, deliberately. The branch reads two dozen values off
  this component — every gate, every style, both formatters, the menu's allow-list — and a component
  taking those as props would be two dozen props whose only purpose is to reach back here. That is
  the trade `source-size-contract` records for the note editor's toolbar, made again: the SEAM the
  reference draws is the host element and its stylesheet, and that is exactly what crosses.

  `lib/styles/compact-message.css` carries the transcription and why it cannot come from the
  generated sheet.
-->
{#if displayMode === 'c'}
  <app-st-compactmessage>
    {#if showDateSeparator}{@render dateSeparator()}{/if}
    <!--
      `app-st-compactmessage` — one line per message instead of a card.

      TWO MIRRORED LAYOUTS, exactly as the capture has them, and they are not a theme with a
      modifier: the admin row is `msg-box msg-box-adm` inside `w-100 h-100 d-flex flex-row-reverse`
      with every part floated RIGHT (byte 1,395,475, template `z1e`), and the member row is plain
      `msg-box` inside `w-100 h-100 d-inline-block` running the other way (`b_e`). Read them side by
      side and the class lists share almost nothing but `msg-box`, which is why both are written out.

      The MEMBER row is the richer one — it is the only place the trial badge, the new indicator and
      the membership stars appear in compact mode, because upstream puts them only there.
    -->
    <div class={reverseMessage ? 'msg-box msg-box-adm' : 'msg-box'} style={messageBoxStyle}>
      <div class={reverseMessage ? 'w-100 h-100 d-flex flex-row-reverse' : 'w-100 h-100 d-inline-block'}>
        <!--
          ── RM-11 — `presenterMsgsOnTheRight` PAINTS FOUR NODES HERE, and we had one of them wrong ─

          The compact ADMIN template binds a different lambda at each of four nodes, and the member
          template binds none of them — which is why every one of these carries `reverseMessage`:

          | node | const | lambda | class |
          | --- | --- | --- | --- |
          | this row | 8 | `g1e` (1,366,633) | `flex-row-reverse` |
          | the body wrapper | 23 | `_1e` (1,366,665) | `w-100` when there is a reply and the setting is OFF; `flex-fill` when it is on |
          | the plain body | 25 | `b1e` (1,366,704) | `presenter-msg-right flex-fill` |
          | the reactions strip | 26 | `y1e` (1,366,866) | `presenter-reactions-right` — RM-12 |

          This node had `presenter-msg-right`, which is a REAL class from the same component and the
          wrong one for this node: it sets `text-align`/`margin`, so the row's children kept their
          source order and the setting did nothing a presenter could see. `flex-row-reverse` is the
          one that mirrors them, and it is what `g1e` binds.
        -->
        <div
          class={[
            'w-100 d-inline-flex align-items-center',
            { 'flex-row-reverse': reverseMessage && presenterMessagesOnTheRight }
          ]}
        >
          {#if showMenu}
          <MessageMenu
              allows={menuAllows}
              variant={reverseMessage ? 'compactAdmin' : 'compactMember'}
              {menuOpen}
              style={usernameStyle}
              reactionPopoverId={reactionPickerOpen && reactionPickerTrigger === 'menu'
                ? `message-reaction-popover-${kind}-${item.id}`
                : undefined}
              onaction={(action, event) => runAction(action, event)}
              ontoggle={() => {
                reactionPickerOpen = false;
                reactionPickerTrigger = null;
                ontoggle(item.id);
              }}
              onreactiontoggle={() => {
                reactionPickerOpen = !reactionPickerOpen;
                reactionPickerTrigger = reactionPickerOpen ? 'menu' : null;
              }}
            />
          {/if}
          {#if !hideAvatar}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={reverseMessage
                ? 'avatar ml-1 d-inline-block float-right align-baseline'
                : 'avatar mr-1 d-inline-block'}
              onclick={() => runAction('user')}
            >
              <img alt="msg.avt" src={item.senderAvatarUrl} />
            </div>
          {/if}
          <span class={reverseMessage ? 'd-inline-block float-right align-baseline' : 'd-inline-block align-baseline'}>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <strong
              class={reverseMessage ? 'username' : 'username mr-1 d-inline-block'}
              style={usernameStyle}
              onclick={() => runAction('mention')}
              ondblclick={() => runAction('user')}
            >
              {item.senderName}
            </strong>
          </span>
          <!--
            ── TWO STAMPS, ONE PER LOG — RM-02 ──────────────────────────────────────────────────

            The compact member row branches on the log before it renders a time:
            `O(26, "alerts" === e.logType ? 26 : 27)` in `b_e` at byte 1,380,680.

            `r_e` (1,377,512) is the ALERTS row — `Ct(3, 3, e.msg.t, "short")` in a
            `[1,"created-at","mr-2",3,"ngStyle"]` span, then the `alert-qa` button gated
            `!isQAMsg && hasQAOnAlerts`. `a_e` (1,377,804) is the chat row, and that is the
            bracketed one.

            **This rendered the bracketed chat time for every kind**, so an alerts log switched to
            compact mode lost the Q&A entry point entirely — no way to ask a question, and no
            `btn-danger animated flash` marker saying one was waiting. The date was wrong too: a
            bracketed `h:mm a` where the reference gives Angular's `short`, which is
            `M/d/yy, h:mm a` and is what `alertDateFormatter` already produces for the card.

            The button is the card's, verbatim, down to the literal spaces inside each span —
            const 69 `["title","Ask a question",1,"btn","btn-sm","btn-secondary","me-1","alert-qa",
            3,"click","ngClass","ngStyle"]` is the same const the card branch uses.
          -->
          {#if kind === 'alert'}
            <span>
              <span class="created-at mr-2" style={dateStyle}
                >{item.evidenceTimestampText ?? alertDateFormatter.format(item.createdAt)}</span
              >
              {@render alertQaButton(true)}
            </span>
          {:else}
            <!--
              THE STAMP IS BRACKETED HERE and it is not in the regular renderer: `[h:mm a]` against
              the card's bare `hh:mm a`. Both are the capture's own — `Ct(29,27,e.msg.t,"h:mm a")`
              wrapped in the literal brackets, versus `"hh:mm a"` unbracketed on the card — so the
              two formats differ by a leading zero as well as by the brackets.

              RM-10 — AND THE TWO COMPACT ROWS DO NOT BRACKET IT THE SAME WAY. The admin row pads
              it and the member row does not:

              ```js
              Ne(" [", Ct(29, 27, e.msg.t, "h:mm a"), "] ")   // z1e,  admin,  byte 1,374,160
              Ne("[",  Ct(3,  6,  e.msg.t, "h:mm a"), "]")    // a_e,  member, byte 1,377,804
              ```

              Ours emitted the member form for both, so an admin's compact stamp sat flush against
              the username on one side and the badges on the other. The two literals are written as
              EXPRESSIONS rather than as template whitespace on purpose: Svelte normalises runs of
              whitespace around a text node, so ` [` typed into the markup is not reliably ` [`,
              and a divergence of exactly one space is the kind nothing here would ever catch.
            -->
            <span
              {...{ placement: 'top' } as Record<string, string>}
              {@attach ngbTooltipWith(alertDateFormatter.format(item.createdAt))}
              class={reverseMessage
                ? 'created-at ml-1 nowrap d-inline-block float-right align-baseline'
                : 'created-at d-inline-block align-baseline'}
              style={dateStyle}
            >{reverseMessage ? ' [' : '['}{item.evidenceTimestampText ??
                compactTimeFormatter.format(item.createdAt)}{reverseMessage ? '] ' : ']'}</span
            >
          {/if}
          {#if visibleBadges.length > 0}
            <div
              class={reverseMessage
                ? 'd-inline-flex align-baseline float-right'
                : 'd-inline-block align-baseline mr-1'}
            >
              {#each visibleBadges as badge, badgeIndex (`${item.id}-${badgeIndex}`)}
                {#if badge.imageUrl}
                  <img class="user-badge-img" src={badge.imageUrl} alt={badge.imageUrl} />
                {:else}
                  <span
                    class="badge px-1 mx-1 user-badge"
                    style="background-color: {badge.backgroundColor}; color: {badge.color};"
                    >{badge.text}</span
                  >
                {/if}
              {/each}
            </div>
          {/if}
          <!--
            The three MEMBER-ONLY marks. The admin template has no node for any of them, which is
            why they are gated on the layout as well as on their own rule rather than sharing one.
          -->
          <!--
            RMSG-04 — the compact Trial badge is `Trial` and the card's is ` Trial `, from the same
            const; its `New` sibling is unpadded in both. `TRIAL_BADGE_TEXT`.
          -->
          {#if !reverseMessage && viewerIsPresenter && item.isTrial}
            <span class="badge bg-danger trial-badge">{TRIAL_BADGE_TEXT.compact}</span>
          {/if}
          {#if !reverseMessage && showNewIndicator && viewerIsPresenter && item.isNew}
            <span class="badge bg-warning new-badge">New</span>
          {/if}
          {#if !reverseMessage && !disableStarYears && kind === 'chat' && !isAdminMessage && item.membershipYears !== null && item.membershipYears !== undefined && chatBadges}
            <span class="stars-container" style={dateStyle}>
              <i class="fas fa-star stars-icon"></i>
              <span class="stars-num">{item.membershipYears}</span>
            </span>
          {/if}
          <div
            class={[
              reverseMessage
                ? 'd-inline-flex msg-left preText ml-2 float-right align-baseline'
                : 'd-inline-flex msg-left preText align-baseline',
              {
                /*
                  `_1e = (t, n) => ({ "w-100": t, "flex-fill": n })`, bound at byte 1,374,249 as
                  `Kn(32, _1e, msg.repl && !presenterMsgsOnTheRight, presenterMsgsOnTheRight)`.
                  The two terms are mutually exclusive by construction and are still written as the
                  reference writes them, because the first also requires a REPLY: a plain message
                  with the setting off gets neither.
                */
                'w-100': reverseMessage && Boolean(item.replyToBody) && !presenterMessagesOnTheRight,
                'flex-fill': reverseMessage && presenterMessagesOnTheRight
              }
            ]}
          >
            <!--
              RM-14 — `function Age(t,n){1&t&&(d(0,"div",27),v(1,"\u2705"),u())}` at byte 1,331,360,
              with const 27 `[1,"ms-1","private-reply"]`.

              `answered-check` was OURS and it carried no CSS anywhere in this repository — a class
              with no rule, which is the defect `CLAUDE.md` names by that description. The reference
              reuses the reply wrapper's own classes for the tick, which reads oddly and is what it
              does: `ms-1` is the gap and `private-reply` the inherited type treatment.
            -->
            {#if item.answered && kind !== 'alert'}
              <div class="ms-1 private-reply">✅</div>
            {/if}
            {#if item.replyToBody}
              <!--
                ── RM-25 — THE COMPACT REPLY BLOCK WAS THE ANSWERED TICK'S MARKUP ────────────────

                This wore `ms-1 private-reply` — compact const 24, which is the TICK's const
                (`h_e`/`L1e` render `<div class="ms-1 private-reply">✅</div>` and nothing else with
                it). The compact reply block is a different shape entirely. `U1e` at byte 1,370,300,
                admin, and `f_e` at 1,378,850, member:

                ```js
                d(0,"div",43)(1,"div",44)(2,"strong",45), v(3), u(),   // <div43><div44><strong45>
                T(4,"div",46), u(),                                     //   <div46/> </div44>
                T(7,"div",47), u()                                      //   <div47/> </div43>
                ```

                const 43 `msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100` (+ `v1e`, admin
                only) · const 76 the same list with no ngClass (member) · const 44
                `private-reply-message w-100` + the theme background · const 45 `d-block username` ·
                const 46 the quoted body, which is the only node here that carries the mention and
                question colours · const 47 the sender's OWN text, a direct child of the outer div
                with no class and no style at all.

                Ours nested them the other way round — `private-reply-message` as a SIBLING of the
                name rather than the box that wraps it — so the quoted block had no background, the
                name had no `username` treatment, and neither body carried a colour. `w-100` was
                missing from the box, which is what makes it fill the row.

                THE STYLES ARE NOT ALL THE BODY'S, and the binding order says which is which: div43
                and strong45 both take `invertTxtColorToggler(invertTxtColor, "name")` — the NAME
                inversion, which is `usernameStyle` here and is what the card already puts on this
                same `d-block username` node — while only div46 takes `styleF`. div47 takes neither,
                so the sender's own line inherits, and that is the reference's own asymmetry.
              -->
              <div
                class={[
                  'msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100',
                  { 'presenter-msg-right': reverseMessage && presenterMessagesOnTheRight }
                ]}
                style={usernameStyle}
              >
                <div
                  class={[
                    'private-reply-message w-100',
                    {
                      'private-reply-bg-light': theme === 'light',
                      'private-reply-bg-dark': theme === 'dark'
                    }
                  ]}
                >
                  <strong class="d-block username" style={usernameStyle}>
                    {item.replyToName}
                  </strong>
                  <div class={bodyColorClasses.trim() || undefined} style={bodyStyle}>
                    <MessageBody segments={replyStockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} />
                  </div>
                </div>
                <div><MessageBody segments={stockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} /></div>
              </div>
            {:else}
              <div
                class={(reverseMessage
                  ? 'msg-left preText ml-2 d-inline-block float-right align-baseline'
                  : 'msg-left preText d-inline-block align-baseline') +
                  bodyColorClasses +
                  (reverseMessage && presenterMessagesOnTheRight
                    ? ' presenter-msg-right flex-fill'
                    : '')}
                style={bodyStyle}
              >
                <MessageBody segments={stockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} />
              </div>
            {/if}
          </div>
          {#if menuAllows.reaction && reactions.length > 0}
            <!--
              RM-12 — `$1e` (byte 1,371,909) binds `y1e = t => ({"presenter-reactions-right": t})`
              to compact const 26 `[1,"reactions-container",3,"ngClass","ngStyle"]`; the member
              container is const 65 and has ngStyle alone. Without it a presenter's compact
              reactions stayed left while every other part of their row moved right.

              A `<div>`, because both compact containers are: `$1e` opens `d(0,"div",26)` and `__e`
              (1,380,430) opens `d(0,"div",65)`. It was a `<span>` here, and the two are not
              interchangeable — an inline box does not take the `margin-left: 20px` the captured
              `.reactions-container` rule gives it the way a block one does, and the reactions strip
              is a row of its own beneath the message rather than a continuation of it.
            -->
            <div
              class={[
                'reactions-container',
                { 'presenter-reactions-right': reverseMessage && presenterMessagesOnTheRight }
              ]}
              style={bodyStyle}
            >
              <!--
                RM-04 lives in `reactionStrip` now, with the card's, and the DUPLICATE that sat here
                is gone. Its one difference was redundant: this copy wrapped the add pill in a
                second gate on the log type, which is `g_e`'s own —
                `O(3, "chat" === e.logType || "alerts" === e.logType && e.isQAMsg ? 3 : -1)` at byte
                1,380,270 — and that gate is IMPLIED BY THE CONTAINER'S, upstream as well as here.
                `__e` renders under `O(36, (enableReactions && "chat" === logType ||
                enableQAReactions && "alerts" === logType && isQAMsg) && checkMsgReactions(msg) ? 36
                : -1)` (`b_e`, 1,380,680), every disjunct of which entails a disjunct of the inner
                one. `menuAllows.reaction` is that same expression here (`message-behavior.ts`,
                `react:`) and already gates this container, so the inner test can never be false
                where it is evaluated.
              -->
              <!--
                RMSG-06's discriminator. `reverseMessage` is what chooses between the two compact
                containers here — `$1e` (admin, const 26, byte 1,371,909) and `__e` (member, const
                65, 1,380,430) — and those two containers hold `V1e` and `m_e`, the gated repeater
                and the ungated one. So the same term that picks the container picks the gate.
              -->
              {@render reactionStrip(reverseMessage)}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </app-st-compactmessage>
{:else}
  <app-st-message>
    {#if showDateSeparator}{@render dateSeparator()}{/if}
    <div class={messageBoxClass} style={messageBoxStyle}>
      <div {...{ clas: 'd-flex flex-column  align-items-center w-100 ' } as Record<string, string>}>
        <div class={messageRowClass}>
          <div class={avatarRowClass}>
            {#if showMenu}
            <MessageMenu
              allows={menuAllows}
              variant="regular"
              {menuOpen}
              style={backgroundInversionStyle}
              reactionPopoverId={reactionPickerOpen && reactionPickerTrigger === 'menu'
                ? `message-reaction-popover-${kind}-${item.id}`
                : undefined}
              onaction={(action, event) => runAction(action, event)}
              ontoggle={() => {
                reactionPickerOpen = false;
                reactionPickerTrigger = null;
                ontoggle(item.id);
              }}
              onreactiontoggle={() => {
                reactionPickerOpen = !reactionPickerOpen;
                reactionPickerTrigger = reactionPickerOpen ? 'menu' : null;
              }}
            />
            {/if}
            {#if !hideAvatar}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="avatar pl-1" onclick={() => runAction('user')}>
                <img alt="msg.avt" src={item.senderAvatarUrl} />
              </div>
            {/if}
          </div>
          <div class="w-100">
            <div class="d-flex justify-content-between align-items-center w-100">
              {#if reverseMessage}
                <span
                  {...{ placement: 'top' } as Record<string, string>}
                  {@attach ngbTooltipWith(alertDateFormatter.format(item.createdAt))}
                  class="created-at mx-2"
                  style={dateStyle}
                  >{item.evidenceTimestampText ?? chatTimeFormatter.format(item.createdAt)}
                </span>
              {/if}
              <!-- RMSG-02 — const 58 binds `ngStyle`, const 23 does not; ours gated it on the LOG. -->
              <div
                class="d-flex align-items-center justify-content-between flex-nowrap"
                style={usernameRowStyle(reverseMessage, bodyStyle)}
              >
                <!--
                  RMSG-01 — `text-primary` was ours: `fge` is bound once, on a card whose own gate
                  makes `msg.isA` false. `CARD_USERNAME_TEXT_PRIMARY_REFUSED`.
                -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <strong
                  class="username mx-1"
                  style={usernameStyle}
                  onclick={() => runAction('mention')}
                  ondblclick={() => runAction('user')}
                >
                  {item.senderName}
                </strong>
                <!--
                  RM-22 — THE BADGES HAVE A WRAPPER, and it is the wrapper that bounds them.

                  `H(33, Mge, 2, 5, "div", 25)` on the admin card and its member twin on const 60:

                  ```
                  25  [1,"d-inline-block","flex-shrink-1",2,"overflow","hidden",3,"innerHTML","ngStyle"]
                  60  [1,"d-inline-block","flex-shrink-1",2,"overflow","hidden",3,"innerHTML"]
                  ```

                  We rendered the badges as direct siblings of the username inside a `flex-nowrap`
                  row, so a member with several badges pushed the timestamp and the kebab out of the
                  row instead of having their badges clipped. `flex-shrink-1` plus
                  `overflow: hidden` is what makes the badge strip the part that gives.

                  The two consts differ only by `ngStyle`, which is `styleF` on the admin (`Mge`
                  binds `("innerHTML", …)("ngStyle", e.styleF)`) and absent on the member — so the
                  style is gated on the layout, exactly as the const table has it. The CONTENT is
                  still real elements rather than the reference's `innerHTML` of a prebuilt string;
                  that divergence is older than this row and is the safer half.
                -->
                <div
                  class="d-inline-block flex-shrink-1"
                  style:overflow="hidden"
                  style={reverseMessage ? bodyStyle : undefined}
                >
                  {#each visibleBadges as badge, badgeIndex (`${item.id}-${badgeIndex}`)}
                    {#if badge.imageUrl}
                      <img class="user-badge-img" src={badge.imageUrl} alt={badge.imageUrl} />
                    {:else}
                      <span
                        class="badge px-1 mx-1 user-badge"
                        style="background-color: {badge.backgroundColor}; color: {badge.color};"
                        >{badge.text}</span
                      >
                    {/if}
                  {/each}
                </div>
                {#if viewerIsPresenter && item.isTrial}
                  <span class="badge bg-danger trial-badge">{TRIAL_BADGE_TEXT.card}</span>
                {/if}
                {#if showNewIndicator && viewerIsPresenter && item.isNew}
                  <span class="badge bg-warning new-badge">New</span>
                {/if}
                {#if !disableStarYears && kind === 'chat' && !isAdminMessage && item.membershipYears !== null && item.membershipYears !== undefined && chatBadges}
                  <span class="stars-container" style={dateStyle}>
                    <i class="fas fa-star stars-icon"></i>
                    <span class="stars-num">{item.membershipYears}</span>
                  </span>
                {/if}
                {#if item.sessionName}
                  <span class="ms-1 badge text-bg-secondary">[{item.sessionName}]</span>
                {/if}
              </div>
              {#if kind === 'alert'}
                <div>
                  {@render alertQaButton(false)}
                  <span class="created-at mr-2" style={dateStyle}
                    >{item.evidenceTimestampText ?? alertDateFormatter.format(item.createdAt)}</span
                  >
                </div>
              {:else if !reverseMessage}
                <span
                  {...{ placement: 'top' } as Record<string, string>}
                  {@attach ngbTooltipWith(alertDateFormatter.format(item.createdAt))}
                  class="created-at mx-2"
                  style={dateStyle}
                  >{item.evidenceTimestampText ?? chatTimeFormatter.format(item.createdAt)}
                </span>
              {/if}
            </div>
            <!--
              RM-22 — `justify-content-end` on the ADMIN body row, `dge` at byte 1,335,936.

              Card const 26 is `[1,"d-flex",3,"ngClass"]` and const 65 — the member's node 36 — is a
              plain `[1,"d-flex"]`, so the binding exists on one layout only. Without it a
              presenter's card body stayed left-packed while the rest of their row moved right.
            -->
            <div
              class={[
                'd-flex',
                { 'justify-content-end': reverseMessage && presenterMessagesOnTheRight }
              ]}
            >
              {#if item.answered && kind !== 'alert'}
                <div>✅</div>
              {/if}
              {#if item.replyToName && item.replyToBody}
                <!--
                  RM-22 — THE CARD'S REPLY BLOCK IS THE SAME SHAPE AS THE COMPACT ONE, and ours was
                  the same wrong shape. `Rge` at byte 1,331,967 (admin) and `c1e` at 1,340,691
                  (member):

                  ```js
                  d(0,"div",46)(1,"div",47)(2,"strong",48), v(3), u(),  //  div46 > div47 > strong48
                  T(4,"div",49), u(),                                    //    div49 </div47>
                  T(7,"div",50), u()                                     //    div50 </div46>
                  ```

                  ```
                  46  msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100  + ngClass hge + ngStyle
                  73  the same list, ngStyle only                              (member, `c1e`)
                  47  private-reply-message w-100                              + the theme background
                  48  d-block username                                         + ngStyle
                  49  the QUOTED body - the only node here carrying the colours
                  50  the sender's OWN line, no class and no style at all
                  ```

                  Ours wore `ms-1 private-reply` - card const **27**, which is the answered TICK's -
                  put the sender's own line INSIDE `private-reply-message`, and gave both bodies
                  `messageBodyClass`, which lacks the `pe-3 w-100` that makes the block fill the row.

                  The STYLES are not all the body's, and the binding order says which is which: div46
                  and strong48 both take `invertTxtColorToggler(invertTxtColor, "name")` - the name
                  inversion, which is `usernameStyle` - while only div49 takes `styleF`. div50 takes
                  neither and inherits. `hge` is `presenter-msg-right` and, like everything else in
                  this family, is bound on the admin layout alone.
                -->
                <div
                  class={[
                    'msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100',
                    { 'presenter-msg-right': reverseMessage && presenterMessagesOnTheRight }
                  ]}
                  style={usernameStyle}
                >
                  <div
                    class={['private-reply-message w-100', { 'private-reply-bg-light': theme === 'light', 'private-reply-bg-dark': theme === 'dark' }]}
                  >
                    <strong class="d-block username" style={usernameStyle}>
                      {item.replyToName}
                    </strong>
                    <div class={bodyColorClasses.trim() || undefined} style={bodyStyle}>
                      <MessageBody segments={replyStockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} />
                    </div>
                  </div>
                  <div>
                    <MessageBody segments={stockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} />
                  </div>
                </div>
              {:else}
                <div class={messageBodyClass} style={bodyStyle}>
                  {#if item.evidenceBodySegments}
                    <!-- Unkeyed for the same reason as `bodySegments` above: parsed, never reordered. -->
                    <!-- eslint-disable-next-line svelte/require-each-key -->
                    {#each item.evidenceBodySegments as segment}
                      {#if segment.kind === 'stock'}
                        <span class="stockColor" style={stockStyle}>{segment.text}</span>
                      {:else if segment.kind === 'image' && segment.url}
                        <div
                          class="img-container"
                          style={uploadWidthVariable(segment.width)}
                          {@attach evidenceImageAttachment(segment.url)}
                        >
                          <!-- svelte-ignore a11y_missing_attribute -->
                          <img
                            class="uploaded-img"
                            src={segment.url}
                            width={segment.width}
                            height={segment.height}
                          /><br
                            {...{ clear: 'both' } as Record<string, string>}
                          />
                        </div>
                      {:else}{segment.text}{/if}
                    {/each}
                  {:else if item.bodyHtml}
                    <!--
                      The rich-text branch, and it does NOT use Svelte's raw-html tag. That rule is
                      asserted next door in `message-links-contract.test.ts` and is kept: markup
                      reaches the DOM through an attachment that sanitises first, so there is no path
                      where an unfiltered string is trusted. `item.bodyHtml` was already sanitised by
                      the server on the way in, and is sanitised AGAIN here before insertion.

                      (This comment names no raw-html tag on purpose. That contract reads SOURCE TEXT,
                      so a comment mentioning the literal fails it just as code would — which is
                      exactly what happened on the first draft.)

                      Twice is not belt-and-braces for its own sake. The server pass is the control —
                      it is what a crafted request cannot bypass. The browser pass covers the rows
                      that already existed when the allow-list was narrower, which is the case that
                      bit the notes table: `notes-repository` re-sanitises historical rows on read for
                      exactly this reason, and its test says so.

                      The segment parser is deliberately NOT applied here. It exists to find links,
                      tickers and images in PLAIN text; run over markup it would rewrite the author's
                      own tags.
                    -->
                    <span {@attach safeChatHtml(item.bodyHtml)}></span>
                  {:else}
                    <MessageBody segments={stockSegments} {stockStyle} {chatGif} messageId={item.id} {extraChatMsg} onaction={runAction} />
                    {#if kind === 'alert' && item.targetUrl}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div
                        class="img-container"
                        style={uploadWidthVariable(item.targetWidth)}
                        onclick={(event) => runAction('image', { url: item.targetUrl!, event })}
                      >
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <img
                          class="uploaded-img"
                          src={item.targetUrl}
                          width={item.targetWidth ?? undefined}
                          height={item.targetHeight ?? undefined}
                        /><br
                          {...{ clear: 'both' } as Record<string, string>}
                        />
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>
            {#if menuAllows.reaction && reactions.length > 0}
              <!--
                RM-22 — THE CARD'S TWO REACTION CONTAINERS ARE DIFFERENT ELEMENTS WITH DIFFERENT
                CLASSES, and ours was one element with neither.

                ```js
                function Lge(t,n){ … d(0,"span",29) … z("ngClass", ct(6, pge, presenterMsgsOnTheRight))("ngStyle", e.styleF) … }   // admin,  1,333,606
                function p1e(t,n){ … d(0,"div",6)   … z("ngStyle", e.styleF) … }                                                    // member, 1,342,254
                ```

                Card const 29 is `[1,"ms-1",3,"ngClass","ngStyle"]` and const 6 is `[3,"ngStyle"]`.
                So the admin strip is an inline `span` with a `ms-1` gap and the right-align binding;
                the member's is a `div` with no class at all. Ours emitted a `span` with neither base
                class and applied `presenter-reactions-right` on BOTH layouts — so a member's card
                right-aligned its reactions whenever the room had the setting on, which is a thing
                the reference has no node for.
              -->
              {#if reverseMessage}
                <span
                  class={[
                    'ms-1',
                    { 'presenter-reactions-right': presenterMessagesOnTheRight }
                  ]}
                  style={bodyStyle}
                >
                  {@render reactionStrip(true)}
                </span>
              {:else}
                <div style={bodyStyle}>{@render reactionStrip(true)}</div>
              {/if}
            {/if}
          </div>
        </div>
      </div>
    </div>
  </app-st-message>
{/if}
<!--
  The reaction picker sits OUTSIDE both hosts, and it did not before.

  It is a popover: `ngbPopover` renders into `container: "body"` upstream, and this one is portalled
  by `EmojiPicker` itself. Keeping it inside whichever host is rendering would mean writing it twice
  — once per branch — for an element that belongs to neither, and a duplicated popover is two
  popovers with one id.
-->
{#if reactionPickerOpen}
  <EmojiPicker
    popoverId={`message-reaction-popover-${kind}-${item.id}`}
    onselect={() => {}}
    onentry={chooseReaction}
  />
{/if}
