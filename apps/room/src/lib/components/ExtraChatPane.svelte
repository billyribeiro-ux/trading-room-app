<script lang="ts">
  /**
   * `app-extra-chat` — the second chat column.
   *
   * A SEPARATE COMPONENT, because that is what the reference has: `app-chat` and `app-extra-chat`
   * are two components with near-identical templates, and the extra one is placed in its own split
   * area. Reproducing it as a component rather than folding the main pane into something
   * instantiable twice is both faithful and the smaller change — `+page.svelte` keeps its chat pane
   * exactly where it is.
   *
   * The differences from `app-chat`, all of them, read from the decoded component:
   *
   * ```js
   * this.channel   = 'offTopic'   // app-chat defaults to 'main'
   * this.extraChatMsg = !0        // rides on every message it renders
   * // composer is #textAreaTxtExtra, and focusing it sets
   * globals.chatInputFocus = 'textAreaTxtExtra'
   * // channel switches emit switchChatChannelExtra rather than switchChatChannel
   * ```
   *
   * Everything else — the header, the tab strip, the roomscroller, the webinar banner, the composer
   * and the Chat Disabled block — is the same shape, which is why the template consts line up
   * one-for-one with `app-chat`'s.
   *
   * ## What it does NOT do, and why
   *
   * `app-chat` emits `hideChat` for non-presenters when the mode becomes `d`; this component's
   * `changeChatMode` handler only re-runs its own resize. That asymmetry is upstream's and is kept:
   * the extra column is not the thing that collapses the layout.
   */
  import { tick } from 'svelte';

  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import type { RoomScrollFollow } from '#lib/room/scroll-follow.js';
  import { formatChatMutedTill, sameCalendarDay } from '#lib/message-formatters.js';
  import ChatSearchBar from './ChatSearchBar.svelte';
  import ChatTabStrip from './ChatTabStrip.svelte';
  import EmojiPicker from './EmojiPicker.svelte';
  import GiphyPicker from './GiphyPicker.svelte';
  import RoomMessage from './RoomMessage.svelte';
  import { presenterColorsFor, type PresenterColorMap } from '#lib/presenter-colors.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type { ChatDisplayMode } from '#lib/chat-display-mode.js';
  import type {
    ChatTab,
    FollowChatStyle,
    MessageAction,
    MessageActionEvent,
    RoomMessageItem
  } from '#lib/types.js';

  type Props = {
    /**
     * Which channel this column shows. `off-topic` by default — `this.channel = 'offTopic'`.
     *
     * Bindable, because the column has its own tab strip and its own idea of where it is; the page
     * owns the value so that paging and unread counts can be keyed by channel across both columns.
     */
    tab: ChatTab;
    /**
     * The channel strip this column draws, decided on the SERVER.
     *
     * Both columns get the SAME list — a member's entitlement does not depend on which column they
     * are looking at — and it arrives with the page as `data.chatTabs`. See `#lib/chat-tabs.ts`.
     */
    chatTabs: readonly string[];
    /** The chat surfaces' display mode, resolved on the page. `#lib/chat-display-mode.ts`. */
    displayMode: ChatDisplayMode;
    /** `#textAreaTxtExtra`'s value. Bindable for the same reason the main composer is. */
    composer: string;
    /** Already filtered to `tab` by the page, so this component never decides what it may show. */
    messages: RoomMessageItem[];
    doNotDisturbOn: boolean;
    /** `O(23, o.isConnected && o.chatEnabled ? 23 : 24)`. */
    chatEnabled: boolean;
    /** `O(21, o.webinarMode ? 21 : -1)`. */
    webinarMode: boolean;
    selfMutedUntil: Date | null;
    /** `O(9, o.showPMBtn ? 9 : -1)`. */
    showPmButton: boolean;
    canPostImages: boolean;
    /*
      `isPresenter` USED TO BE HERE and is gone, 2026-08-14.

      Upstream's `app-extra-chat` reads it six times — the admin-chat tab (`isPresenter ||
      user.hasAdminChat`), image posting (`isPresenter || sessData.userUploads`), the mention badge,
      the limited-presenter branch and the mic check. It is genuinely load-bearing THERE because the
      component computes its own gates.

      This one does not. The parent computes each gate once and passes the RESULT —
      `showPmButton`, `canPostImages`, `canUseRTE` — which is the better shape: authority is decided
      in one place instead of re-derived per component. Passing the raw flag as well meant a second
      input that no line read, and a future reader could have gated something on it directly and
      quietly disagreed with the parent.
    */
    canUseRTE: boolean;
    giphyApiKey: string;
    /**
     * The sixteen props every message in this room shares, spread straight into `RoomMessage`.
     *
     * ONE prop where there were twelve, and it closed a real defect rather than only tidying the
     * declaration. Twelve were declared, destructured and forwarded here purely to pass through
     * untouched — and the four that were NOT (`usersPublicReply`, `enableReactions`,
     * `enableEditMessage`, `enableEditAlerts`) therefore fell to their `false` defaults, so the same
     * chat message carried a reaction bar and an edit entry in the main column and neither here.
     *
     * THE CAPTURE SAYS THAT IS WRONG, and says it twice. `app-chat` and `app-extra-chat` are
     * declared with the SAME const 212 in the room template, and the message component reads those
     * gates off the shared service rather than off any per-column input:
     *
     * ```js
     * O(19, sessData.enableReactions && "chat" === logType || … ? 19 : -1)
     * sessData.enableEditMessage && "chat" === logType && (this.canEditMessage = …)
     * canPublicReply = "chat" === logType && … && (isPresenter || sessData.usersPublicReply)
     * ```
     *
     * Keyed on `logType` alone. A message in this column is `logType === "chat"` exactly as one in
     * the main column is, so it gets identical reply, edit and reaction capability. There is no
     * per-column narrowing upstream to reproduce.
     */
    chrome: RoomMessageChrome;
    /**
     * Kept OUT of the chrome deliberately: this one is not passed through, it is looked up per
     * message to find the sender's follow style. See `room-message-chrome.ts`.
     */
    followedUsers: Record<string, { followChatStyle?: FollowChatStyle }>;
    /**
     * Every presenter's message colours for this room, keyed by the sender's email hash.
     *
     * Beside `followedUsers` and for the same reason: the map is the same for every message, the
     * lookup is not. `presenter-colors.ts` holds the precedence.
     */
    presenterColors: PresenterColorMap;
    /** The page owns which message menu is open, so only one is open across BOTH columns. */
    openMenuKey: string | null;
    onmenutoggle: (key: string | null) => void;
    onaction: (action: MessageAction, message: RoomMessageItem, event?: MessageActionEvent) => void;
    /** `onTextareaFocus(e, 'textAreaTxtExtra')` — reports which composer the viewer is in. */
    onfocus: () => void;
    /** One keystroke here — `updateLastTypedTime()`. This column has its OWN signal and channel. */
    ontyped: (value: string) => void;
    /** `!i.is(":focus")` — one of the three `notyping` conditions. */
    onstoppedtyping: () => void;
    /** The names typing in THIS column's channel, already excluding this viewer. */
    typists: readonly string[];
    onsend: () => void;
    onscroll: (scroller: HTMLElement) => void;
    /**
     * This column's scroll-follow decision, and the four things it needs.
     *
     * The `$effect` that acts on it lives HERE, not on the page, which is what Svelte's own
     * best-practices page asks for: an effect is for "direct DOM manipulation", and the DOM in
     * question is this component's scroller. `scroll-follow.ts` had already written down the same
     * conclusion for its own reasons — *"the `tick()`-then-check dance around a scroller that may
     * have been replaced mid-flight belongs where the element lives"* — and until 2026-08-16 the
     * element lived here while the dance lived on `+page.svelte`.
     *
     * `follow` is the page's INSTANCE rather than a fresh one, because its markers are what make
     * the decision stateful across renders and because the alerts column deliberately gets a
     * differently-configured one. Constructing it here would silently give this column the
     * `alwaysScrollToBottom` override the alerts instance is forbidden.
     */
    follow: RoomScrollFollow<ChatTab>;
    viewerId: number;
    /** THIS column's flag — see the note on the effect. */
    readingHistory: boolean;
    onstopreadinghistory: () => void;
    onscrolltobottom: (scroller: HTMLElement) => void;
    onprivatechat: () => void;
    /**
     * The magnifier. The PAGE decides what it does — see `ExtraChatPane`'s own note below.
     *
     * It opened the Chat Logs modal until 2026-08-29 and now toggles the search bar, which is what
     * upstream's `toggleChatToolbarSearchOnly()` does and what this room's alerts column already did.
     * The modal is still reached from the sidebar.
     */
    onsearch: () => void;
    /** Whether the search bar under the header is showing — `RoomChat.searchBarOpen('extra')`. */
    searchOpen: boolean;
    /** The term. A plain prop plus a handler rather than a binding, because the setter on
     * `RoomChat` does work — emptying the box drops the results with no round trip — and a binding
     * would let a caller assign the field while skipping it. */
    searchTerm: string;
    onsearchinput: (value: string) => void;
    onsearchsubmit: () => void;
    onsearchclear: () => void;
    onsettings: () => void;
    onimageupload: () => void;
    onrte: () => void;
    onselectgif: (url: string) => void;
  };

  let {
    tab = $bindable('off-topic'),
    chatTabs,
    displayMode,
    composer = $bindable(''),
    messages,
    doNotDisturbOn,
    chatEnabled,
    webinarMode,
    selfMutedUntil,
    showPmButton,
    canPostImages,
    canUseRTE,
    giphyApiKey,
    chrome,
    followedUsers,
    presenterColors,
    openMenuKey,
    onmenutoggle,
    onaction,
    onfocus,
    ontyped,
    onstoppedtyping,
    typists,
    onsend,
    onscroll,
    follow,
    viewerId,
    readingHistory,
    onstopreadinghistory,
    onscrolltobottom,
    onprivatechat,
    onsearch,
    searchOpen,
    searchTerm,
    onsearchinput,
    onsearchsubmit,
    onsearchclear,
    onsettings,
    onimageupload,
    onrte,
    onselectgif
  }: Props = $props();

  let emojiOpen = $state(false);
  let giphyOpen = $state(false);
  let showMessageOptions = $state(false);

  /*
    `globals.chatInputFocus = 'textAreaTxtExtra'` — set on focus and read by the mention router,
    which sends `doMentionExtra` instead of `doMention` when this composer is the focused one. The
    page holds the flag because it is the thing that routes mentions; this only reports.
  */
  /**
   * The extra chat column's scroll container, and the autoscroll it drives.
   *
   * `onscrollerready` wrote this element up to `+page.svelte` and NOTHING read it until 2026-08-14,
   * so the second chat column never followed a new message while the first one did — a message
   * arrived, the column stayed where it was, and the reader saw nothing. ESLint is what surfaced
   * it, as an "assigned but never used" that turned out to be a missing feature.
   *
   * The effect below is a deliberate parallel of the main chat's, not a new design: same four
   * conditions (first view, channel switch, new message, and the reader's own scroll position via
   * `shouldAutoScrollForMessage`), same `tick()` before measuring, and the same identity re-check
   * afterwards so a scroller swapped out mid-await is not written to.
   *
   * It is a local `$state` here as of 2026-08-16, rather than a `let` on the page fed by that
   * callback. The round trip existed only so a page-level `$effect` could reach an element this
   * component owns; with the effect here it has no reader, and a prop whose whole job was to hand
   * an element upward is "no config nothing reads" in prop form.
   */
  /* `| null` — what `bind:this` writes on teardown. `if (!current) return` below covers it. */
  let scroller = $state<HTMLElement | null>(null);

  /*
    THIS COLUMN FOLLOWING ITS OWN MESSAGES.

    Deliberately its own effect rather than a loop over both columns: the two have independent tabs,
    independent message lists and independent reader scroll positions, so one effect reading both
    would re-run each column's scroll logic whenever the other changed. That is the difference
    between "a message arrived here" and "a message arrived anywhere", and it is what would make a
    reader scrolled up in this column get yanked to the bottom by traffic in the other one.

    Moved from `+page.svelte` on 2026-08-16, unchanged in behaviour: same order (clear the flag,
    then `tick`, then scroll), and the same identity re-check afterwards, because the scroller can
    be replaced while the microtask is pending.

    ## Why this is an `$effect` at all, since the autofixer asks

    `svelte-autofixer` flags `onstopreadinghistory()` as state written inside an effect, and it is
    right that it is — the receiver clears this column's reading-history marker. The suggestion is
    still declined, with the reason recorded rather than the warning ignored:

    * What this produces is a SCROLL POSITION, not a value. `$derived` cannot express it, and the
      docs keep effects for exactly this — "direct DOM manipulation" is the first use they name.
    * It is not an event handler either. The trigger is a message ARRIVING, which reaches this
      component as new props, not as a user gesture.
    * The flag is cleared BECAUSE we are about to scroll, so it is part of the same act rather than
      state being synchronised. Deriving it would invert the causality.

    `$effect.pre` was considered and rejected: the docs' chat-autoscroll example uses it because it
    MEASURES the viewport before the DOM updates. This decides from counts and a flag the scroll
    handler already set, and it must scroll AFTER the new rows render — which is what `tick()` is
    waiting for.
  */
  $effect(() => {
    const current = scroller;
    const activeTab = tab;
    const count = messages.length;
    const newestMessage = messages.at(-1);

    if (!current) return;

    if (
      follow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId,
        /*
          THIS column's flag. Passing the main column's would let its reader position decide whether
          this one jumps, which is the defect `extra-chat-column-contract.test.ts` guards.
        */
        readingHistory
      })
    ) {
      onstopreadinghistory();
      void tick().then(() => {
        if (scroller === current) onscrolltobottom(current);
      });
    }
  });

  function submitOnEnter(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    onsend();
  }
</script>

<!--
  `app-extra-chat`'s own root, identical in shape to `app-chat`'s:
  const 6 = `[1,'chat','d-flex','flex-column','h-100',2,'overflow-y','hidden']`.
-->
<app-extra-chat>
  <div class="chat d-flex flex-column h-100" style="overflow-y: hidden;">
    <div class="bs-component">
      <nav class="navbar navbar-expand-lg navbar-light chat-nav p-1 chatHeader">
        <!-- svelte-ignore a11y_missing_attribute -->
        <a class="navbar-brand ml-1 mr-1"
          ><i class="fas fa-comment"></i>
          {#if doNotDisturbOn}
            <span class="badge badge-danger ml-2"><i class="fas fa-bell-slash"></i> DND</span>
          {/if}</a
        >
        <ChatTabStrip tabs={chatTabs} bind:active={tab} />
        <ul class="nav ml-auto align-items-center">
          <!-- `O(9, o.showPMBtn ? 9 : -1)` — the same gate the main pane's PM button uses. -->
          {#if showPmButton}
            <li class="nav-item">
              <!-- svelte-ignore a11y_missing_attribute -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <a title="Open Private chat" class="nav-link" onclick={onprivatechat}>
                <i class="fas fa-comments"></i>
              </a>
            </li>
          {/if}
          <li class="nav-item mx-1">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a title="Search" class="nav-link p-0" onclick={onsearch}>
              <i class="fas fa-search"></i>
            </a>
          </li>
          <li class="nav-item dropdown ml-2" style="position: static;">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              aria-haspopup="true"
              aria-expanded="false"
              class="nav-link dropdown-toggle p-0"
              onclick={onsettings}
            >
              <i title="Settings" class="fas fa-cog chat-header-gear"></i>
            </a>
          </li>
        </ul>
      </nav>
    </div>

    {#if searchOpen}
      <ChatSearchBar
        term={searchTerm}
        oninput={onsearchinput}
        onsubmit={onsearchsubmit}
        onclear={onsearchclear}
      />
    {/if}

    <!--
      `app-extra-roomscroller` — its own element, not the main pane's. The reference gives the extra
      column a separate scroller component for the same reason it gives it a separate chat
      component: two scrollers with two independent positions.
    -->
    <app-extra-roomscroller
      bind:this={scroller}
      style="overflow-y: scroll; overflow-x: hidden; height: 100%;"
      onscroll={(event: Event) => onscroll(event.currentTarget as HTMLElement)}
    >
      <div>
        {#each messages as item, index (item.id)}
          <RoomMessage
            {displayMode}
            {item}
            kind="chat"
            extraChatMsg={true}
            {...chrome}
            followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
            presenterStyle={presenterColorsFor(presenterColors, item.senderEmailHash)}
            menuOpen={openMenuKey === `chat:${item.id}`}
            showDateSeparator={'evidenceSeparatorText' in item
              ? item.evidenceSeparatorText !== null
              : index === 0 || !sameCalendarDay(item.createdAt, messages[index - 1]?.createdAt)}
            ontoggle={(id) => {
              const key = `chat:${id}`;
              onmenutoggle(openMenuKey === key ? null : key);
            }}
            onaction={(action, message, event) => onaction(action, message, event)}
          />
        {/each}
      </div>
    </app-extra-roomscroller>

    <!-- `O(21, o.webinarMode ? 21 : -1)`, tooltip verbatim from const 56. -->
    {#if webinarMode}
      <div class="px-1 webinarMode">
        Webinar Mode
        <span
          {...{
            placement: 'top',
            ngbtooltip:
              'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
          } as Record<string, string>}
          {@attach ngbTooltip}
          class="ml-2"
        >
          <i class="fas fa-question-circle"></i>
        </span>
      </div>
    {/if}

    <!-- `O(23, o.isConnected && o.chatEnabled ? 23 : 24)`. -->
    <!--
      `O(22, o.showTyping && o.usersTypingCnt > 0 ? 22 : -1)` at byte 2,400,312 — the extra column's
      own copy of the indicator, and it reads its OWN channel. Same markup and the same omission as
      the main column's; see `AlertChatArea.svelte` for why the animated dots are not reproduced.
    -->
    {#if typists.length > 0}
      <div>
        <div class="d-flex align-items-center typing-indicator-container">
          <strong class="users-count me-1">[{typists.length}]</strong>
          <span class="users-typing"><em class="mx-1">{typists.join(',')}</em></span>
        </div>
      </div>
    {/if}
    {#if !chatEnabled}
      <div class="chatDisabled d-flex align-items-center">
        <h5 class="pl-3">
          <i class="fas fa-lock"></i> Chat Disabled
          {#if selfMutedUntil}
            <span> till {formatChatMutedTill(selfMutedUntil)}</span>
          {/if}
        </h5>
      </div>
    {:else}
      <div id="textAreaHolderExtra" class="d-flex align-items-center textSendDiv">
        <div class="flex-fill d-flex mx-0">
          <div class="px-0 flex-fill">
            <!--
              `#textAreaTxtExtra` — the id is the whole reason the mention router can tell the two
              composers apart: `preferences.extraChatColumn && 'textAreaTxtExtra' === chatInputFocus`
              is what sends a mention here instead of to the main pane.
            -->
            <textarea
              name="txt-area"
              id="textAreaTxtExtra"
              rows="1"
              spellcheck="true"
              placeholder="Type your message here.."
              class="txt-area form-control border-0"
              bind:value={composer}
              {onfocus}
              oninput={(event) => ontyped(event.currentTarget.value)}
              onblur={onstoppedtyping}
              onkeydown={submitOnEnter}></textarea>
          </div>
          <div
            class={[
              'justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol',
              { 'composer-options-forced': showMessageOptions }
            ]}
          >
            <div class="composer-options">
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <span
                class="textAreaBtns"
                aria-describedby={emojiOpen ? 'ngb-popover-extra' : undefined}
                onclick={() => {
                  giphyOpen = false;
                  emojiOpen = !emojiOpen;
                }}
              >
                <i
                  {...{ placement: 'left', ngbtooltip: 'Add Emojis' } as Record<string, string>}
                  {@attach ngbTooltip}
                  class="far fa-smile"
                ></i>
              </span>
              {#if canPostImages}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span class="textAreaBtns" onclick={onimageupload}>
                  <i
                    {...{ ngbtooltip: 'Upload an Image', placement: 'left' } as Record<
                      string,
                      string
                    >}
                    {@attach ngbTooltip}
                    class="fas fa-image"
                  ></i>
                </span>
              {/if}
              {#if canPostImages}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                  class="textAreaBtns"
                  style="font-size: 12px;"
                  aria-describedby={giphyOpen ? 'ngb-popover-giphy-extra' : undefined}
                  onclick={() => {
                    emojiOpen = false;
                    giphyOpen = !giphyOpen;
                  }}
                >
                  <span>GIF</span>
                </span>
                {#if giphyOpen}
                  <GiphyPicker
                    apiKey={giphyApiKey}
                    popoverId="ngb-popover-giphy-extra"
                    onclose={() => (giphyOpen = false)}
                    onselect={(url) => {
                      giphyOpen = false;
                      onselectgif(url);
                    }}
                  />
                {/if}
              {/if}
              <!--
                The RTE button is on THIS composer too: the reference puts `openRTEModal()` on
                exactly two components, `app-chat` and `app-extra-chat`, and the extra one reads
                `#textAreaTxtExtra` when it opens.
              -->
              {#if canUseRTE}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span class="textAreaBtns" onclick={onrte}>
                  <i
                    {...{ ngbtooltip: 'Rich Text Editor', placement: 'left' } as Record<
                      string,
                      string
                    >}
                    {@attach ngbTooltip}
                    class="fas fa-font"
                  ></i>
                </span>
              {/if}
            </div>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <span class="textAreaBtns composer-expand" onclick={() => (showMessageOptions = true)}>
              <i
                {...{ ngbtooltip: 'Show message options', placement: 'left' } as Record<
                  string,
                  string
                >}
                {@attach ngbTooltip}
                class="fas fa-plus"
              ></i>
            </span>
          </div>
        </div>
        {#if emojiOpen}
          <EmojiPicker onselect={(glyph) => (composer += glyph)} />
        {/if}
      </div>
    {/if}
  </div>
</app-extra-chat>
