<script lang="ts">
  /*
    `app-alerts` + `app-chat` and the gutter between them — the fourth of the five template regions,
    and the largest.

    ## Why the two panes are ONE component

    The split between them is a single `<as-split>` whose gutter drags one number:
    `split.alertsPercent` sizes the alert area and the chat area is whatever is left. Two components
    would have to share that percentage AND the gutter that writes it, which is a binding across a
    boundary that exists for no reason other than the file being long.

    ## It is rendered from INSIDE `chatAlertsPane`, not instead of it

    That snippet is rendered at TWO sites — the horizontal room layout and the vertical one — so a
    component at each would spell this prop list twice, and the next person to add a prop would
    update one of them.

    ## Forty-five props, and the compiler produced the list

    Not a hand scan of the region. The file was written with an empty `<script>` and
    `svelte-check --output machine` was asked what it could not resolve; every `Cannot find name`
    became a prop. That matters here specifically: `data` appears twelve times in this markup and
    not once as the variable — every one is a `data-bs-toggle` or `data-bs-target` attribute, which
    is exactly the false positive that produced four invented props in `RoomNavbar`.

    Five of the forty-five are state CLASSES rather than scalars, which is the payoff `RoomSidebar`
    and `RoomNavbar` already recorded: `split`, `alerts`, `chat`, `polls` and `menus` go whole, and
    replace roughly thirty separate inputs.

    ## What it does NOT decide

    Nothing here sends a message, archives a log, or resolves who may post. Every control calls a
    page callback and every gate arrives already decided — `canPostImages`, `canUseRTE`,
    `chatEnabled`, `alertFilterConfigured`. Authority is computed once, on the page, from data the
    server owns. A pane that re-derived any of them would be a second opinion about permission.
  */
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { formatChatMutedTill, sameCalendarDay } from '#lib/message-formatters.js';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import RoomMessage from '#lib/components/RoomMessage.svelte';
  import type { AlertLabel } from '#lib/alert-labels.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type { RoomAlerts } from '#lib/room/alerts.svelte.js';
  import type { RoomChat } from '#lib/room/chat.svelte.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomPolls } from '#lib/room/polls.svelte.js';
  import type { RoomSplit } from '#lib/room/split.svelte.js';
  import type {
    FollowChatStyle,
    MessageAction,
    MessageActionItem,
    MessageReactionPayload,
    ModalName,
    RoomMessageItem
  } from '#lib/types.js';

  interface Props {
    /** The outer area's style and the inner pair's — one instance, because it is one gutter. */
    split: RoomSplit;
    alerts: RoomAlerts;
    chat: RoomChat;
    polls: RoomPolls;
    /** The page owns which menu is open, so only one is open across every column at once. */
    menus: RoomMenus;

    /** The ROLE, decided on the page from `data.user.role`. Never asserted by a component. */
    isPresenter: boolean;
    doNotDisturbOn: boolean;
    pollIsActive: boolean;
    /**
     * The two halves of the Alert Filter, and they are NOT the same question.
     * `alertFilterConfigured` is the OWNER's `modAlertFilterList` — whether the room has a filter at
     * all, which is what shows the toolbar button. `alertFilterActive` adds the viewer's own
     * selection, which is what shows the "filtered" badge in the brand.
     */
    alertFilterConfigured: boolean;
    alertFilterActive: boolean;
    /** `?co=1` — a detached chat window, which is already the chat in its own window. */
    chatOnlyMode: boolean;
    /** `O(21, o.webinarMode ? 21 : -1)`. */
    webinarMode: boolean;
    /** `O(23, o.isConnected && o.chatEnabled ? 23 : 24)` — the composer, or Chat Disabled. */
    chatEnabled: boolean;
    selfMutedUntil: Date | null;
    canPostImages: boolean;
    canUseRTE: boolean;
    giphyApiKey: string;
    /**
     * BINDABLE, and it is the only one.
     *
     * The composer's "+" ASSIGNS it, and a plain prop assignment updates this component's copy and
     * nothing else — so the four composer buttons would appear here and the page's value would
     * never move, which is what closes the override again on the next chat mode change.
     * `svelte-check` is silent on that, exactly as it was on `RoomNavbar`'s two.
     */
    showMessageOptions: boolean;

    /** Both logs arrive already filtered, searched and paged. This pane never decides visibility. */
    visibleAlerts: RoomMessageItem[];
    visibleChatMessages: RoomMessageItem[];
    /** The alerts column ONLY — a chat message must not get a parsed label. See the chrome file. */
    alertLabels: readonly AlertLabel[];
    /** The sixteen props every message in this room shares, spread straight into `RoomMessage`. */
    messageChrome: RoomMessageChrome;
    /** Kept OUT of the chrome deliberately: looked up per message, not passed through. */
    followedUsers: Record<string, { followChatStyle?: FollowChatStyle }>;

    /*
      Attachments the PAGE owns, because each writes to DOM the page also reads: the split element
      it measures, the two scrollers whose follow state it holds, and the textarea it focuses and
      auto-expands. Handing the nodes back is the whole job; none of them belongs here.
    */
    captureAlertChatElement: (node: HTMLElement) => void;
    captureAlertsScroller: (node: HTMLElement) => void;
    captureChatScroller: (node: HTMLElement) => void;
    captureComposerElement: (node: HTMLTextAreaElement) => void;
    observeComposerWidth: (node: HTMLElement) => void;

    onopenmodal: (name: Exclude<ModalName, null>) => void;
    onopenpoll: () => void;
    ontogglealertstoolbar: () => void;
    ontogglealertssearch: () => void;
    ondetachalerts: () => void;
    onsavealerts: () => void;
    onarchivealerts: () => void;
    onalertsscroll: (event: Event) => void;
    onchatscroll: (event: Event) => void;
    /**
     * Takes the KIND as its first argument rather than being two callbacks, because the page's
     * handler is one function branching on it — splitting it here would put that branch in this
     * file and give the two columns two places to disagree about what "delete" means.
     */
    onmessageaction: (
      kind: 'alert' | 'chat',
      action: MessageAction,
      item: MessageActionItem,
      payload?: MouseEvent | MessageReactionPayload
    ) => void;
    onprivatechat: () => void;
    onexpandcomposer: (element: HTMLTextAreaElement | undefined) => void;
    onsend: () => Promise<void>;
    onimageupload: () => void;
    onrte: () => void;
    /** Two arguments, because the page records the GIF's title beside its url. */
    onselectgif: (title: string, url: string) => void;
    onbeginsplit: (event: PointerEvent, target: 'main' | 'chat-alerts') => void;
  }

  let {
    split,
    alerts,
    chat,
    polls,
    menus,
    isPresenter,
    doNotDisturbOn,
    pollIsActive,
    alertFilterConfigured,
    alertFilterActive,
    chatOnlyMode,
    webinarMode,
    chatEnabled,
    selfMutedUntil,
    canPostImages,
    canUseRTE,
    giphyApiKey,
    showMessageOptions = $bindable(false),
    visibleAlerts,
    visibleChatMessages,
    alertLabels,
    messageChrome,
    followedUsers,
    captureAlertChatElement,
    captureAlertsScroller,
    captureChatScroller,
    captureComposerElement,
    observeComposerWidth,
    onopenmodal,
    onopenpoll,
    ontogglealertstoolbar,
    ontogglealertssearch,
    ondetachalerts,
    onsavealerts,
    onarchivealerts,
    onalertsscroll,
    onchatscroll,
    onmessageaction,
    onprivatechat,
    onexpandcomposer,
    onsend,
    onimageupload,
    onrte,
    onselectgif,
    onbeginsplit
  }: Props = $props();
</script>

<as-split-area
  minsize="0"
  class="alert-chat-box alert-chat-regular as-split-area"
  style={split.primaryAreaStyle}
>
  <as-split
    {@attach captureAlertChatElement}
    minsize="0"
    class={split.innerIsVertical
      ? 'as-percent as-vertical as-init'
      : 'as-percent as-horizontal as-init'}
    style={split.innerIsVertical ? undefined : 'flex-direction: row;'}
    dir="ltr"
  >
    <as-split-area minsize="0" class="alert-box as-split-area" style={split.alertsAreaStyle}>
      <app-alerts>
        <div class="chat d-flex flex-column" style="height: 100%;">
          <div class="bs-component">
            <nav class="navbar navbar-expand-lg navbar-light chat-nav p-1 alertHeader">
              <!-- svelte-ignore a11y_missing_attribute -->
              <a class="navbar-brand ml-1"
                ><i class="fas fa-bell me-1"></i> Alerts
                <!--
                            `M2e`, const 21 — the Alert Filter's own entry point, and the reason
                            the toolbar button below could be left out for as long as it was.

                            Order matters and is the capture's: `H(6, M2e, …, "span", 8)` then
                            `H(7, A2e, …, "span", 9)`, so "filtered" precedes "DND" inside the
                            brand. Gate at byte 2,056,460 is the conjunction
                            `modAlertFilterList && doFilteredAlerts`.

                            Const 8 is the same span WITHOUT the click binding — Angular's
                            placeholder attrs for the same node — so there is one badge here, not
                            two. `.filtered-text` is a captured rule in
                            `captured-runtime-components.css` (font-size 12px, vertical-align
                            middle, and a hover state), which until now had no element to style.
                          -->
                {#if alertFilterActive}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    data-bs-toggle="modal"
                    data-bs-target="#alert-filter-modal"
                    title="Alert Filter"
                    class="badge badge-danger ms-1 filtered-text"
                    onclick={() => onopenmodal('alert-filter')}>{' '}filtered</span
                  >
                {/if}
                {#if doNotDisturbOn}
                  <span class="badge badge-danger ms-2"><i class="fas fa-bell-slash"></i> DND</span>
                {/if}</a
              >
              <ul class="nav ml-auto">
                {#if isPresenter}
                  <li
                    class={[
                      'nav-item mx-2',
                      {
                        'poll-active-blink': pollIsActive && !polls.minimized,
                        'poll-active-indicator': polls.minimized
                      }
                    ]}
                  >
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a onclick={onopenpoll}><i class="fas fa-question-circle"></i> Poll</a>
                  </li>
                  <li class="nav-item mr-2">
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a onclick={() => onopenmodal('alert')}
                      ><i class="fas fa-plus-circle"></i> Post Alert</a
                    >
                  </li>
                {/if}
                {#if !isPresenter && polls.minimized}
                  <li class="nav-item mx-2">
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <!-- svelte-ignore a11y_missing_attribute -->
                    <a class="poll-active-blink" style="cursor: pointer;" onclick={onopenpoll}
                      ><i class="fas fa-question-circle"></i> Poll</a
                    >
                  </li>
                {/if}
                <li class="nav-item mx-1">
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a title="Search" class="nav-link p-0" onclick={ontogglealertssearch}>
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
                    onclick={ontogglealertstoolbar}
                  >
                    <i title="Settings" class="fas fa-cog chat-header-gear"></i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          {#if alerts.toolbarOpen}
            <!--
                        Ported node for node from alert-section/datach-alerts-1. The empty right
                        div is a conditional slot in the capture (an Angular comment anchor pair),
                        so it is kept rather than collapsed - removing it changes the flex layout.
                        The button's title is "Detach Chat" while its label reads "Detach Alerts";
                        that mismatch is capture-accurate and deliberate.
                      -->
            <div class="shadow p-2 w-100 alertsToolbar" style="margin-top: 0px;">
              <!--
                          `R2e` (const 28), gated on `showAlertsToolbarExtended`. The magnifier
                          collapses this away and leaves only the form below.
                        -->
              {#if alerts.toolbarExtended}
                <div class="d-flex align-items-center justify-content-between flex-wrap">
                  <div class="d-flex align-items-center">
                    <!-- `O(2, e.isPresenter ? 2 : -1)` - const 36, presenter only. -->
                    {#if isPresenter}
                      <div class="ms-4 my-2 text-white">
                        <input
                          type="checkbox"
                          name="inline-alert-entry"
                          value="Show inline alert entry"
                          id="inline-alert-entry"
                          class="form-check-input"
                          bind:checked={alerts.inlineEntry}
                        /><label for="inline-alert-entry" class="form-check-label">
                          Show inline alert entry
                        </label>
                      </div>
                    {/if}
                    <!--
                                `O(3, chatOnlyMode ? -1 : 3)` - const 37/42. Hidden in a detached
                                chat window, which is already the chat in its own window.
                                The title is "Detach Chat" while the label reads "Detach Alerts";
                                that mismatch is capture-accurate and deliberate.
                              -->
                    {#if !chatOnlyMode}
                      <button
                        title="Detach Chat"
                        class="btn btn-outline-info btn-sm m-1"
                        onclick={ondetachalerts}
                      >
                        <i class="fas fa-window-restore"></i> Detach Alerts
                      </button>
                    {/if}
                  </div>
                  <!--
                              The right-hand div, which this room rendered empty. The capture
                              declares TWO buttons for it, and each is gated:

                                const 38/44  data-bs-target="#alert-filter-modal"
                                             gated on `sessData.modAlertFilterList`
                                const 39     data-bs-target="#alerts-advanced-search-modal"
                                             gated on `sessData.advancedSearchAlerts &&
                                             ownerdID == '56ba547185ae93560d186ea8'`

                              This slot held Advanced Search alone until the Alert Filter's gate
                              was built, and the reason was sound at the time: across BOTH DOM
                              captures of this toolbar the Alert Filter button never appears - one
                              shows the slot holding nothing but its two Angular comment anchors,
                              the other shows Advanced Search alone - so rendering it
                              UNCONDITIONALLY put two buttons on a wrapped second row, a layout
                              the capture never produces.

                              That objection was about the missing gate, not about the button. The
                              captured rooms simply had no `modAlertFilterList`, which is exactly
                              the case `alertFilterConfigured` is false in, so both captures still
                              render precisely what they show. Omitting it now would be the
                              divergence.

                              Order is the capture's: `H(5, N2e, …, "button", 38)` before
                              `H(6, L2e, …, "button", 39)`, so Filter alerts precedes Advanced
                              Search.

                              Advanced Search's own gate is not reproducible - the second half is
                              a hardcoded owner id from the original deployment
                              (`ownerdID == '56ba547185ae93560d186ea8'`) - so it renders
                              unconditionally.
                            -->
                  <div>
                    {#if alertFilterConfigured}
                      <!--
                                  Const 44 carries no `type`, where const 39 beside it opens with
                                  `"type","button"`. Reproduced as-is. It is inert either way -
                                  this row is a SIBLING of `#alert-settings` rather than a child
                                  (`H(1, B2e, …)` precedes `d(2, "form", 29)`), so there is no
                                  form for a default-type button to submit.
                                -->
                      <button
                        data-bs-toggle="modal"
                        data-bs-target="#alert-filter-modal"
                        class="btn btn-outline-light btn-sm m-1"
                        onclick={() => onopenmodal('alert-filter')}
                      >
                        <i class="fas fa-filter me-1"></i>{' '}Filter alerts
                      </button>
                    {/if}
                    <button
                      type="button"
                      data-bs-toggle="modal"
                      data-bs-target="#alerts-advanced-search-modal"
                      class="btn btn-outline-light btn-sm m-1"
                      onclick={() => onopenmodal('advanced-search')}
                    >
                      <i class="fas fa-search me-1"></i> Advanced Search
                    </button>
                  </div>
                </div>
              {/if}
              <form novalidate id="alert-settings" class="w-100">
                <div>
                  <div class="form-group m-0">
                    <div class="input-group">
                      <!--
                                  `name` is ours, not the capture's. Const 32 of `app-alerts`
                                  carries only class/type/placeholder/aria-label/aria-describedby/
                                  title, so the original ships this field with neither an `id` nor
                                  a `name` and Chrome reports "A form field element should have an
                                  id or name attribute" against it too.

                                  A `name` is added rather than an `id` because `id` is the half of
                                  that pair the capture DOES use elsewhere and would be a new
                                  document-unique hook; `name` satisfies the same requirement,
                                  scopes to the enclosing `form#alert-settings`, and renders
                                  nothing. No captured attribute is changed or removed.

                                  Note also that the captured `aria-describedby="addon-search"`
                                  points at an id nothing in the component defines - the clear
                                  button is `addon-chat-clear`. That dangling reference is
                                  reproduced as-is rather than silently repaired.
                                -->
                      <input
                        type="text"
                        name="alert-search-term"
                        placeholder="Type your search term, then press Enter"
                        aria-label="Search"
                        aria-describedby="addon-search"
                        title="Type your search term, then press Enter"
                        class="form-control"
                        bind:value={alerts.search}
                        onkeydown={(event) => {
                          if (event.key === 'Enter') event.preventDefault();
                        }}
                      /><!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        id="addon-chat-clear"
                        title="Clear the search"
                        class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex clear-alert-input input-group-text"
                        onclick={() => (alerts.search = '')}><i class="fas fa-times"></i></span
                      >
                      <!--
                                  `O2e`, gated on `showAlertsToolbarExtended`: the save button,
                                  and inside it the archive control gated again on
                                  `isPresenter && !media.limitedPresenter`. Search-only shows neither -
                                  this room showed both in every state.
                                -->
                      {#if alerts.toolbarExtended}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <span
                          id="addon-chat-save"
                          title="Save alerts messages"
                          class="btn btn-outline-secondary d-inline-flex pl-2 pr-2 input-group-text"
                          onclick={onsavealerts}
                          ><i class="fas fa-save"></i>
                        </span>
                        {#if isPresenter}
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div
                            id="addon-chat-messages-archive"
                            title="Archive Alerts Messages"
                            class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex archive-alert-input input-group-text"
                            onclick={onarchivealerts}
                          >
                            <i class="fas fa-trash"></i>
                          </div>
                        {/if}
                      {/if}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          {/if}

          <app-roomscroller
            {@attach captureAlertsScroller}
            id="chatScrollViewParentAlerts"
            style="overflow-y: scroll; height: 100%;"
            onscroll={onalertsscroll}
          >
            <div>
              {#each visibleAlerts as item, index (item.id)}
                <RoomMessage
                  {item}
                  kind="alert"
                  {...messageChrome}
                  {alertLabels}
                  followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                  menuOpen={menus.messageId === `alert:${item.id}`}
                  showDateSeparator={'evidenceSeparatorText' in item
                    ? item.evidenceSeparatorText !== null
                    : index === 0 ||
                      !sameCalendarDay(item.createdAt, visibleAlerts[index - 1]?.createdAt)}
                  ontoggle={(id) => {
                    const key = `alert:${id}`;
                    menus.toggleMessageMenu(key);
                  }}
                  onaction={(action, message, event) =>
                    onmessageaction('alert', action, message, event)}
                />
              {/each}
            </div>
          </app-roomscroller>
        </div>
      </app-alerts>
    </as-split-area>

    <as-split-area minsize="0" class="chat-box as-split-area" style={split.chatAreaStyle}>
      <app-chat>
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
                    class={['nav-link', { active: chat.tab === 'main' }]}
                    onclick={() => (chat.tab = 'main')}>Main Chat</a
                  >
                </li>
                <li class="nav-item">
                  <!-- svelte-ignore a11y_interactive_supports_focus -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a
                    data-bs-toggle="tab"
                    role="tab"
                    class={['nav-link', { active: chat.tab === 'off-topic' }]}
                    onclick={() => (chat.tab = 'off-topic')}>Off Topic</a
                  >
                </li>
              </ul>
              <ul class="nav ml-auto align-items-center">
                <li class="nav-item">
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <a title="Open Private chat" class="nav-link" onclick={onprivatechat}>
                    <i class="fas fa-comments"></i>
                  </a>
                </li>
                <li class="nav-item mx-1">
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <!-- svelte-ignore a11y_missing_attribute -->
                  <a title="Search" class="nav-link p-0" onclick={() => onopenmodal('chat-logs')}>
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
                    onclick={() => onopenmodal('settings')}
                  >
                    <i title="Settings" class="fas fa-cog chat-header-gear"></i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>

          <app-roomscroller
            {@attach captureChatScroller}
            style="overflow-y: scroll; overflow-x: hidden; height: 100%;"
            onscroll={onchatscroll}
          >
            <div>
              {#each visibleChatMessages as item, index (item.id)}
                <RoomMessage
                  {item}
                  kind="chat"
                  {...messageChrome}
                  followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                  menuOpen={menus.messageId === `chat:${item.id}`}
                  showDateSeparator={'evidenceSeparatorText' in item
                    ? item.evidenceSeparatorText !== null
                    : index === 0 ||
                      !sameCalendarDay(item.createdAt, visibleChatMessages[index - 1]?.createdAt)}
                  ontoggle={(id) => {
                    const key = `chat:${id}`;
                    menus.toggleMessageMenu(key);
                  }}
                  onaction={(action, message, event) =>
                    onmessageaction('chat', action, message, event)}
                />
              {/each}
            </div>
          </app-roomscroller>

          <!--
                      `O(21, o.webinarMode ? 21 : -1)` —
                      `<div class="px-1 webinarMode"> Webinar Mode <span …><i …></i></span><i></i></div>`,
                      with the tooltip verbatim from const 56.
                    -->
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
          <!--
                      `O(23, o.isConnected && o.chatEnabled ? 23 : 24)` — the composer, or the
                      captured Chat Disabled block. Two reasons reach the same block: the room is in
                      mode `d`, which applies to everyone, and this viewer is muted, which does not.

                      The mute half was ENFORCED here long before it was ever shown — `sendMessage`
                      refuses while a live row exists — so a muted member typed, pressed send, and
                      watched nothing happen with no explanation anywhere.
                    -->
          {#if !chatEnabled}
            <div class="chatDisabled d-flex align-items-center">
              <h5 class="pl-3">
                <i class="fas fa-lock"></i> Chat Disabled
                <!--
                            `H(4, u0e, 3, 4, 'span')` under `O(4, e.chatMutedTill ? 4 : -1)` — the
                            span appears only when the viewer is muted, which is what distinguishes
                            "the room turned chat off" from "you personally cannot post".
                          -->
                {#if selfMutedUntil}
                  <span> till {formatChatMutedTill(selfMutedUntil)}</span>
                {/if}
              </h5>
            </div>
          {:else}
            <div id="textAreaHolder" class="d-flex align-items-center textSendDiv">
              <div class="flex-fill d-flex mx-0" {@attach observeComposerWidth}>
                <div class="px-0 flex-fill">
                  <textarea
                    name="txt-area"
                    id="textAreaTxt"
                    rows="1"
                    spellcheck="true"
                    placeholder="Type your message here.."
                    class="txt-area form-control border-0"
                    {@attach captureComposerElement}
                    bind:value={chat.composer}
                    onfocus={() => chat.focused('textAreaTxt')}
                    oninput={(event) => onexpandcomposer(event.currentTarget)}
                    onkeydown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const field = event.currentTarget;
                        void onsend().then(() => onexpandcomposer(field));
                      }
                    }}></textarea>
                </div>
                <!--
                          Which set of composer buttons applies is a pure width question, so it is
                          answered by a container query in app.css rather than by measuring after
                          hydration. Measuring meant the server rendered the collapsed "+" and the
                          ResizeObserver swapped in the four buttons once hydration ran, which is
                          the flicker. `showMessageOptions` stays as the explicit override the "+"
                          button sets, exactly as the captured app's toggleMessageOptions() does.
                        -->
                <div
                  class={[
                    'justify-content-center d-flex flex-row align-items-center justify-content-center p-0 m-0 text-center textAreaBtnsCol',
                    { 'composer-options-forced': showMessageOptions }
                  ]}
                >
                  <div class="composer-options">
                    <span
                      {...{
                        placement: 'auto',
                        container: 'body',
                        autoclose: 'outside',
                        popoverclass: 'popOverDiv'
                      } as Record<string, string>}
                      class="textAreaBtns"
                      aria-describedby={menus.emoji ? 'ngb-popover-3' : undefined}
                      onclick={() => {
                        menus.set('giphy', false);
                        menus.toggle('emoji');
                      }}
                    >
                      <i
                        {...{
                          placement: 'left',
                          ngbtooltip: 'Add Emojis'
                        } as Record<string, string>}
                        {@attach ngbTooltip}
                        class="far fa-smile"
                      ></i>
                    </span>
                    {#if canPostImages}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span class="textAreaBtns" onclick={onimageupload}>
                        <i
                          {...{
                            ngbtooltip: 'Upload an Image',
                            placement: 'left'
                          } as Record<string, string>}
                          {@attach ngbTooltip}
                          class="fas fa-image"
                        ></i>
                      </span>
                    {/if}
                    {#if isPresenter}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span
                        data-bs-toggle="modal"
                        data-bs-target="#play-youtube-modal"
                        class="textAreaBtns"
                        onclick={() => onopenmodal('youtube')}
                      >
                        <i
                          {...{
                            ngbtooltip: 'Play YouTube For All',
                            placement: 'left'
                          } as Record<string, string>}
                          {@attach ngbTooltip}
                          class="fas fa-video"
                        ></i>
                      </span>
                    {/if}
                    {#if canPostImages}
                      <span
                        {...{
                          ngbtooltip: 'Search for GIFs',
                          placement: 'auto',
                          container: 'body',
                          autoclose: 'outside',
                          popoverclass: 'popOverDiv',
                          triggers: 'manual'
                        } as Record<string, string>}
                        {@attach ngbTooltip}
                        class="textAreaBtns"
                        style="font-size: 12px;"
                        aria-describedby={menus.giphy ? 'ngb-popover-giphy' : undefined}
                        onclick={() => {
                          menus.set('emoji', false);
                          menus.toggle('giphy');
                        }}
                      >
                        <span>GIF</span>
                      </span>
                      {#if menus.giphy}
                        <GiphyPicker
                          apiKey={giphyApiKey}
                          popoverId="ngb-popover-giphy"
                          onclose={() => menus.set('giphy', false)}
                          onselect={onselectgif}
                        />
                      {/if}
                    {/if}
                    <!--
                              The fifth and last button in this group, and it is fifth in the
                              capture too: the const block resolves them in order as
                              `O(2, canPostImages …)`, `O(3, isPresenter …)`, `O(4, canPostImages …)`,
                              then `O(5, …enableRTE && …enableRTE && …isPresenter ? 5 : -1)`.
                              Its own two consts are `class="textAreaBtns"` with a click, and
                              `ngbTooltip="Rich Text Editor" placement="left" class="fas fa-font"`.

                              Only this composer has it. The reference puts `openRTEModal()` on
                              exactly two components — this one and the extra chat column, which
                              this room does not have yet — and none on private chat, so the PM
                              composer deliberately goes without.
                            -->
                    {#if canUseRTE}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <span class="textAreaBtns" onclick={onrte}>
                        <i
                          {...{
                            ngbtooltip: 'Rich Text Editor',
                            placement: 'left'
                          } as Record<string, string>}
                          {@attach ngbTooltip}
                          class="fas fa-font"
                        ></i>
                      </span>
                    {/if}
                  </div>
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    class="textAreaBtns composer-expand"
                    onclick={() => (showMessageOptions = true)}
                  >
                    <i
                      {...{
                        ngbtooltip: 'Show message options',
                        placement: 'left'
                      } as Record<string, string>}
                      {@attach ngbTooltip}
                      class="fas fa-plus"
                    ></i>
                  </span>

                  {#if menus.emoji}
                    <EmojiPicker onselect={(glyph) => (chat.composer += glyph)} />
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </app-chat>
    </as-split-area>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      role="separator"
      tabindex="0"
      class="as-split-gutter"
      aria-orientation={split.innerIsVertical ? 'vertical' : 'horizontal'}
      aria-valuemin="0"
      aria-valuenow={split.alertsPercent}
      aria-valuetext={`${Math.round(split.alertsPercent)} percent`}
      style="flex-basis: 11px; order: 1;"
      onpointerdown={(event) => onbeginsplit(event, 'chat-alerts')}
    >
      <div class="as-split-gutter-icon"></div>
    </div>
  </as-split>
</as-split-area>
