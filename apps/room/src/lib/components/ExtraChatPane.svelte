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
  import { ngbTooltip } from '$lib/ngb-tooltip';
  import { formatChatMutedTill, sameCalendarDay } from '$lib/message-formatters';
  import EmojiPicker from './EmojiPicker.svelte';
  import GiphyPicker from './GiphyPicker.svelte';
  import RoomMessage from './RoomMessage.svelte';
  import type {
    ChatTab,
    FollowChatStyle,
    MessageAction,
    MessageActionEvent,
    RoomMessageItem,
    Theme
  } from '$lib/types';

  type Props = {
    /**
     * Which channel this column shows. `off-topic` by default — `this.channel = 'offTopic'`.
     *
     * Bindable, because the column has its own tab strip and its own idea of where it is; the page
     * owns the value so that paging and unread counts can be keyed by channel across both columns.
     */
    tab: ChatTab;
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
    theme: Theme;
    chatStyle: FollowChatStyle;
    chatGif: boolean;
    chatBadges: boolean;
    enableBadges: boolean;
    showBadgesToPresentersOnly: boolean;
    disableStarYears: boolean;
    presenterMessagesOnTheRight: boolean;
    currentUserId: number;
    currentUserEmailHash: string;
    currentUserName: string;
    viewerIsPresenter: boolean;
    followedUsers: Record<string, { followChatStyle?: FollowChatStyle }>;
    /** The page owns which message menu is open, so only one is open across BOTH columns. */
    openMenuKey: string | null;
    onmenutoggle: (key: string | null) => void;
    onaction: (action: MessageAction, message: RoomMessageItem, event?: MessageActionEvent) => void;
    /** `onTextareaFocus(e, 'textAreaTxtExtra')` — reports which composer the viewer is in. */
    onfocus: () => void;
    onsend: () => void;
    onscroll: (scroller: HTMLElement) => void;
    onscrollerready: (scroller: HTMLElement | undefined) => void;
    onprivatechat: () => void;
    onsearch: () => void;
    onsettings: () => void;
    onimageupload: () => void;
    onrte: () => void;
    onselectgif: (url: string) => void;
  };

  let {
    tab = $bindable('off-topic'),
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
    theme,
    chatStyle,
    chatGif,
    chatBadges,
    enableBadges,
    showBadgesToPresentersOnly,
    disableStarYears,
    presenterMessagesOnTheRight,
    currentUserId,
    currentUserEmailHash,
    currentUserName,
    viewerIsPresenter,
    followedUsers,
    openMenuKey,
    onmenutoggle,
    onaction,
    onfocus,
    onsend,
    onscroll,
    onscrollerready,
    onprivatechat,
    onsearch,
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
  function captureScroller(node: HTMLElement) {
    onscrollerready(node);
    return () => onscrollerready(undefined);
  }

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
        <ul
          role="tablist"
          class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs"
        >
          <li class="nav-item">
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              data-bs-toggle="tab"
              role="tab"
              class:active={tab === 'main'}
              class="nav-link"
              onclick={() => (tab = 'main')}>Main Chat</a
            >
          </li>
          <li class="nav-item">
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              data-bs-toggle="tab"
              role="tab"
              class:active={tab === 'off-topic'}
              class="nav-link"
              onclick={() => (tab = 'off-topic')}>Off Topic</a
            >
          </li>
        </ul>
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

    <!--
      `app-extra-roomscroller` — its own element, not the main pane's. The reference gives the extra
      column a separate scroller component for the same reason it gives it a separate chat
      component: two scrollers with two independent positions.
    -->
    <app-extra-roomscroller
      {@attach captureScroller}
      style="overflow-y: scroll; overflow-x: hidden; height: 100%;"
      onscroll={(event: Event) => onscroll(event.currentTarget as HTMLElement)}
    >
      <div>
        {#each messages as item, index (item.id)}
          <RoomMessage
            {item}
            kind="chat"
            {chatGif}
            {presenterMessagesOnTheRight}
            {chatBadges}
            {enableBadges}
            {showBadgesToPresentersOnly}
            {disableStarYears}
            {currentUserId}
            {currentUserEmailHash}
            {currentUserName}
            followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
            {chatStyle}
            {viewerIsPresenter}
            {theme}
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
              onkeydown={submitOnEnter}></textarea>
          </div>
          <div
            class="justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol"
            class:composer-options-forced={showMessageOptions}
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
