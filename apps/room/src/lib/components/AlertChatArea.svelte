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
  import { tick } from 'svelte';

  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { formatChatMutedTill, sameCalendarDay } from '#lib/message-formatters.js';
  import EmojiPicker from '#lib/components/EmojiPicker.svelte';
  import GiphyPicker from '#lib/components/GiphyPicker.svelte';
  import ChatSearchBar from '#lib/components/ChatSearchBar.svelte';
  import ChatTabStrip from '#lib/components/ChatTabStrip.svelte';
  import RoomMessage from '#lib/components/RoomMessage.svelte';
  import { presenterColorsFor, type PresenterColorMap } from '#lib/presenter-colors.js';
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import {
    inlineAlertKeyAction,
    inlineAlertKeyPrevents,
    inlineAlertPosts
  } from '#lib/inline-alert-key.js';
  import type { AlertLabel } from '#lib/alert-labels.js';
  import type { RoomMessageChrome } from '#lib/room-message-chrome.js';
  import type { ChatDisplayMode } from '#lib/chat-display-mode.js';
  import type { RoomAlerts } from '#lib/room/alerts.svelte.js';
  import type { RoomBroadcasts } from '#lib/room/broadcasts.svelte.js';
  import type { RoomChat } from '#lib/room/chat.svelte.js';
  import type { RoomFeedScroll } from '#lib/room/feed-scroll.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomPolls } from '#lib/room/polls.svelte.js';
  import type { RoomScrollFollow } from '#lib/room/scroll-follow.js';
  import type { RoomSplit } from '#lib/room/split.svelte.js';
  import type {
    ChatTab,
    FollowChatStyle,
    MessageAction,
    MessageActionEvent,
    MessageActionItem,
    ModalName,
    RoomMessageItem
  } from '#lib/types.js';

  interface Props {
    /** The outer area's style and the inner pair's — one instance, because it is one gutter. */
    split: RoomSplit;
    alerts: RoomAlerts;
    /**
     * The room-wide broadcasts, for the ONE thing this pane renders from them: the sales image a
     * presenter pins over the chat column. Passed whole rather than as a url prop because the
     * overlay has a close receiver as well as a value, and splitting those is how a stop gets
     * half-applied — the reason `RoomBroadcasts` holds receivers instead of setters.
     */
    broadcasts: RoomBroadcasts;
    chat: RoomChat;
    /**
     * The channel strip this column draws, decided on the SERVER.
     *
     * `chatTabsWithBadges` lets an owner configure extra channels behind badges, so the list is per
     * room AND per member; it arrives with the page as `data.chatTabs`. Both columns get the same
     * one — an entitlement does not depend on which column a member is looking at.
     */
    chatTabs: readonly string[];
    /**
     * The display mode for each of this component's TWO logs, resolved on the page.
     *
     * Two props and not one because upstream keys them separately — `loadChatMode` against
     * `chatMode`, `loadAlertsMode` against `alertsMode` — so a member can run the alerts log compact
     * and the chat log as cards. `#lib/chat-display-mode.ts`.
     */
    alertsDisplayMode: ChatDisplayMode;
    chatDisplayMode: ChatDisplayMode;
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
    /**
     * The toolbar search's scope, when it is narrower than the log — see
     * `#lib/alert-toolbar-search-scope.js`. `null` when there is nothing to say, which is most of
     * the time; a notice that is always there is one nobody reads.
     */
    searchScopeNotice: string | null;
    visibleChatMessages: RoomMessageItem[];
    /** The alerts column ONLY — a chat message must not get a parsed label. See the chrome file. */
    alertLabels: readonly AlertLabel[];
    /** The sixteen props every message in this room shares, spread straight into `RoomMessage`. */
    messageChrome: RoomMessageChrome;
    /** Kept OUT of the chrome deliberately: looked up per message, not passed through. */
    followedUsers: Record<string, { followChatStyle?: FollowChatStyle }>;
    /**
     * Every presenter's message colours for this room, keyed by the sender's email hash.
     *
     * Beside `followedUsers` and for the same reason: the map is the same for every message, the
     * lookup is not, so it is not chrome. `presenter-colors.ts` holds the precedence.
     */
    presenterColors: PresenterColorMap;

    /*
      Attachments the PAGE owns, because each writes to DOM the page also reads: the split element
      it measures, and the textarea it focuses and auto-expands. Handing the nodes back is the whole
      job; none of them belongs here.

      `captureChatScroller` LEFT this list on 2026-08-17. Its only reader was a page-level `$effect`
      that scrolled this component's element, and that effect is below now — so the round trip had
      nothing left to serve.

      `captureAlertsScroller` STAYED, and the asymmetry is the point rather than an oversight:
      `RoomAlertsPane.toggleToolbar()` reads that element too. Toggling the toolbar changes the
      strip's height, so the log has to be pulled back to the newest alert afterwards — upstream's
      `guiEventBus.emit('scrollAlertLogToBottom')`. Two owners, so the element is still handed up.
      That is the "written on both sides of a boundary" rule this decomposition already paid for
      once with `followedUsers`: shared means thunk-and-receiver, never extracted to one side.
    */
    captureAlertChatElement: (node: HTMLElement) => void;
    captureAlertsScroller: (node: HTMLElement) => void;
    captureComposerElement: (node: HTMLTextAreaElement) => void;
    observeComposerWidth: (node: HTMLElement) => void;

    /**
     * SCROLL-FOLLOW for both feeds, decided and acted on HERE.
     *
     * Svelte's best-practices page keeps `$effect` for "direct DOM manipulation", and the DOM these
     * two manipulate is this component's scrollers. `scroll-follow.ts` says the same thing from the
     * other direction — *"the `tick()`-then-check dance around a scroller that may have been
     * replaced mid-flight belongs where the element lives"*.
     *
     * `feedScroll` arrives WHOLE rather than as six callbacks, which is the shape this component
     * already uses for `split`, `alerts`, `chat`, `polls` and `menus`. The two `RoomScrollFollow`
     * instances are the page's, not fresh ones: their markers make the decision stateful across
     * renders, and the alerts instance is deliberately constructed WITHOUT the
     * `alwaysScrollToBottom` override that the chat one gets — `shouldAutoScrollForMessage` records
     * that rule. Building them here would hand the alerts log an override it must not have.
     */
    feedScroll: RoomFeedScroll;
    alertsFollow: RoomScrollFollow;
    chatFollow: RoomScrollFollow<ChatTab>;
    viewerId: number;

    onopenmodal: (name: Exclude<ModalName, null>) => void;
    onopenpoll: () => void;
    ontogglealertstoolbar: () => void;
    ontogglealertssearch: () => void;
    /**
     * `doChatLogSearch` — submit the chat column's term to the server.
     *
     * Takes the column AND the term rather than reading either, so the component decides nothing:
     * which column it is in is the one thing a shared handler gets wrong, and the term is passed at
     * the moment of submit rather than read later from state that may have moved on.
     */
    onchatsearch: (column: 'main' | 'extra', term: string) => void;
    ondetachalerts: () => void;
    onsavealerts: () => void;
    onarchivealerts: () => void;
    /*
      `onalertsscroll` and `onchatscroll` WERE HERE, and the note twenty lines above already said
      why they should not have been: *"`feedScroll` arrives WHOLE rather than as six callbacks"*.
      Two of those callbacks were passed beside it anyway, so this component read the same object
      two ways — `feedScroll.alertsReadingHistory` through the facade, `onalertsscroll` through a
      prop the page built out of the same instance.

      Removed 2026-08-18. The two scrollers below call `feedScroll.trackAlertsScroll` and
      `trackChatScroll` directly, which is what every other member of it already did here.
    */
    /**
     * Takes the KIND as its first argument rather than being two callbacks, because the page's
     * handler is one function branching on it — splitting it here would put that branch in this
     * file and give the two columns two places to disagree about what "delete" means.
     */
    onmessageaction: (
      kind: 'alert' | 'chat',
      action: MessageAction,
      item: MessageActionItem,
      payload?: MessageActionEvent
    ) => void;
    onprivatechat: () => void;
    /**
     * `O(9, o.showPMBtn ? 9 : -1)`, byte 1,453,980 — whether this column offers private chat.
     *
     * `gates.showPmButton` has existed since it was written and `ExtraChatPane` has used it; THIS
     * column had no prop and rendered the entry point unconditionally, so a free-trial member in a
     * room with `disablePMForTrials` was refused private chat in one column and offered it in the
     * other. A prop, not a `gates` read, for the reason `ExtraChatPane`'s own props note gives.
     */
    showPmButton: boolean;
    /**
     * A viewer pasted an image into the chat composer — `x("paste", o => onImagePaste(o))`, byte
     * 1,427,208.
     *
     * A callback and not the upload itself, for the reason every other action here is one: the
     * confirmation dialog, the upload endpoint and the composer's draft all belong to `RoomComposer`,
     * and this component would have to be handed three more things to do the job in place.
     */
    onpasteimage: (file: File) => void;
    /**
     * The inline alert box posted its text — upstream's `emit("inlineAlertEntry", value)`.
     *
     * A callback rather than the post itself, for the reason every other action here is one: the
     * alert path, its refusals and its dialogs belong to `RoomComposer`.
     */
    oninlinealert: (body: string) => void;
    /** The inline alert box pasted an image — `emit("inlineAlertEntryImage", {event, alertTxt})`. */
    oninlinealertimage: (file: File, alertText: string) => void;
    /**
     * `toggleInlineAlertEntry()` — byte 2,047,433, and it does TWO things:
     *
     * ```js
     * toggleInlineAlertEntry() {
     *   this.appService.localstorage.setObject("showAlertsEntry", {showAlertsEntry: this.showAlertsEntry}),
     *   this.appService.guiEventBus.emit("scrollAlertLogToBottom")
     * }
     * ```
     *
     * It PERSISTS the flag — ours was ephemeral `$state`, so the box closed itself on every reload —
     * and it pulls the log back to the newest alert, because opening the field shortens the
     * scroller. A `bind:checked` could do neither, which is why this is a callback and the checkbox
     * is one-way now.
     */
    oninlineentrytoggle: (open: boolean) => void;
    onexpandcomposer: (element: HTMLTextAreaElement | undefined) => void;
    /** One keystroke in the main composer — `updateLastTypedTime()`. */
    ontyped: (value: string) => void;
    /** `!i.is(":focus")` — one of the reference's three `notyping` conditions. */
    onstoppedtyping: () => void;
    /**
     * "Typing indicator" — the names currently typing in this column's channel, already excluding
     * this viewer. Empty when the room has not enabled it, which reads the same as nobody typing.
     */
    typists: readonly string[];
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
    broadcasts,
    chat,
    chatTabs,
    alertsDisplayMode,
    chatDisplayMode,
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
    searchScopeNotice,
    visibleChatMessages,
    alertLabels,
    messageChrome,
    followedUsers,
    presenterColors,
    captureAlertChatElement,
    captureAlertsScroller,
    captureComposerElement,
    observeComposerWidth,
    feedScroll,
    alertsFollow,
    chatFollow,
    viewerId,
    onopenmodal,
    onopenpoll,
    ontogglealertstoolbar,
    ontogglealertssearch,
    onchatsearch,
    ondetachalerts,
    onsavealerts,
    onarchivealerts,
    onmessageaction,
    onprivatechat,
    showPmButton,
    onpasteimage,
    oninlinealert,
    oninlinealertimage,
    oninlineentrytoggle,
    onexpandcomposer,
    ontyped,
    onstoppedtyping,
    typists,
    onsend,
    onimageupload,
    onrte,
    onselectgif,
    onbeginsplit
  }: Props = $props();

  /**
   * The two scrollers, held HERE because the effects below are the things that move them.
   *
   * The alerts one is captured TWICE on purpose — locally, and through the page's
   * `captureAlertsScroller` — because `RoomAlertsPane.toggleToolbar()` reads it too. See the note on
   * the props. The chat one has no second reader and so has no prop at all.
   */
  let alertsScroller = $state<HTMLElement | undefined>();
  /* `| null`, because that is what `bind:this` writes on teardown — proven in
     `dom-reference-contract.svelte.test.ts`, not assumed. */
  let chatScroller = $state<HTMLElement | null>(null);

  /**
   * The clipboard, filtered down to at most one image.
   *
   * `canPostImages` FIRST, matching the reference's own `if (!this.canPostImages) return !1` — a
   * viewer the room does not let post images gets an ordinary paste and no dialog. It is not the
   * authority: `composer-image.remote.ts` re-checks on the server, which is the check that counts.
   *
   * THE LAST image item wins, not the first, and that is the reference's loop rather than a
   * simplification of it: a paste carrying both a screenshot and its text URL resolves to the image.
   *
   * The default is deliberately NOT prevented. A paste of plain text still lands in the textarea;
   * only an image is intercepted, which is what the three alert composers already do.
   */
  function handleComposerPaste(event: ClipboardEvent): void {
    if (!canPostImages) return;
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onpasteimage(image);
  }

  /**
   * The inline alert box's own draft. Local, because nothing outside this element reads it.
   *
   * Upstream keeps it in the DOM and reads it back with `$("#textAreaAlertTxt").val()`; a bound
   * value is the same thing without a selector that can stop matching.
   */
  let inlineAlertText = $state('');

  /**
   * `onKey(e)` — byte 2,047,478, and its three branches are NOT the chat composer's.
   *
   * ```js
   * onKey(e) {
   *   if (13 == e.keyCode) {
   *     e.preventDefault();
   *     const i = $("#textAreaAlertTxt");
   *     if (e.shiftKey) i.val(i.val());
   *     else {
   *       if (!e.altKey) return i.val().trim() && emit("inlineAlertEntry", i.val()),
   *                             i.val(""), i.height("23px"), !1;
   *       i.val(i.val() + "\n")
   *     }
   *   }
   * }
   * ```
   *
   * **Enter posts. ALT+Enter inserts a newline. SHIFT+Enter does NOTHING** — `i.val(i.val())` is a
   * no-op after `preventDefault`, so the newline is swallowed. That last one reads as a bug and is
   * the shipped behaviour, and it is the opposite of the chat composer one column over, where
   * Shift+Enter is the newline. Reproduced rather than harmonised: a presenter's muscle memory for
   * this box is the reference's, and "fixing" it would post an alert where they expected a line
   * break.
   *
   * The RAW text is sent, not the trimmed one — `emit("inlineAlertEntry", i.val())` after testing
   * `i.val().trim()`. So leading whitespace survives into the alert, exactly as it does through the
   * modal, whose own composer "deliberately does not trim inputs".
   */
  function onInlineAlertKey(event: KeyboardEvent): void {
    const action = inlineAlertKeyAction(event);
    if (inlineAlertKeyPrevents(action)) event.preventDefault();
    if (action === 'newline') {
      inlineAlertText += '\n';
      return;
    }
    if (action !== 'post') return;
    const body = inlineAlertText;
    /* Cleared unconditionally, posted only when there is something to post — see the module. */
    inlineAlertText = '';
    if (inlineAlertPosts(body)) oninlinealert(body);
  }

  /**
   * `onImagePaste(e)` — byte 2,047,700.
   *
   * ```js
   * onImagePaste(e) {
   *   const i = $("#textAreaAlertTxt"), o = i.val();
   *   emit("inlineAlertEntryImage", { event: e, alertTxt: o });
   *   i.val(""), i.height("23px")
   * }
   * ```
   *
   * The box is cleared BEFORE the confirmation opens, which is upstream's order and is why the
   * pending text travels with the event rather than being read back later. The subscriber is the
   * post-alert MODAL (byte 2,125,263), so a pasted image here becomes an alert and not a chat
   * message — `RoomComposer` carries that split.
   *
   * `pastedImageFrom` is the shared rule; the reference's own handler for this box is the same loop.
   */
  function onInlineAlertPaste(event: ClipboardEvent): void {
    const image = pastedImageFrom(event.clipboardData?.items);
    if (!image) return;
    const text = inlineAlertText;
    inlineAlertText = '';
    oninlinealertimage(image, text);
  }

  function holdAlertsScroller(node: HTMLElement) {
    alertsScroller = node;
    captureAlertsScroller(node);
    return () => {
      if (alertsScroller === node) alertsScroller = undefined;
    };
  }

  /*
    THE ALERTS LOG FOLLOWING ITS NEWEST ALERT.

    Moved from `+page.svelte` on 2026-08-17, unchanged in behaviour: same order (clear the flag,
    then `tick`, then scroll) and the same identity re-check afterwards, because the scroller can be
    replaced while the microtask is pending.

    No `tab`, unlike the chat effect below — the alerts pane is one log with no channels, and
    `RoomScrollFollow` reads `undefined !== undefined` as false so the channel-switch condition
    simply never fires for it.

    On the autofixer's suggestion that `stopReadingHistory` is state written inside an effect: it
    is, and the suggestion is declined for the reason recorded in `ExtraChatPane` — what this
    produces is a scroll POSITION rather than a value, so `$derived` cannot express it; the trigger
    is an alert arriving as new props rather than a gesture, so an event handler cannot either; and
    the flag is cleared BECAUSE we are about to scroll, which is one act rather than two.
  */
  $effect(() => {
    const current = alertsScroller;
    const count = visibleAlerts.length;
    const newestMessage = visibleAlerts.at(-1);

    if (!current) return;

    if (
      alertsFollow.follows({
        count,
        newestSenderId: newestMessage?.senderId,
        viewerId,
        readingHistory: feedScroll.alertsReadingHistory
      })
    ) {
      feedScroll.stopReadingHistory('alerts');
      void tick().then(() => {
        if (alertsScroller === current) feedScroll.forceAlertsToBottom(current);
      });
    }
  });

  /*
    THE MAIN CHAT COLUMN FOLLOWING ITS OWN MESSAGES.

    Its own effect rather than a loop over both feeds: alerts and chat have independent lists and
    independent reader positions, so one effect reading both would re-run each feed's scroll logic
    whenever the other changed — "a message arrived anywhere" instead of "a message arrived here".

    `tab` IS read here, because the chat column has channels and a channel switch is one of the four
    conditions that scrolls.
  */
  $effect(() => {
    const current = chatScroller;
    const activeTab = chat.tab;
    const count = visibleChatMessages.length;
    const newestMessage = visibleChatMessages.at(-1);

    if (!current) return;

    if (
      chatFollow.follows({
        count,
        tab: activeTab,
        newestSenderId: newestMessage?.senderId,
        viewerId,
        readingHistory: feedScroll.chatReadingHistory
      })
    ) {
      feedScroll.stopReadingHistory('chat');
      void tick().then(() => {
        if (chatScroller === current) feedScroll.forceChatToBottom(current);
      });
    }
  });
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
                          checked={alerts.inlineEntry}
                          onchange={(event) => oninlineentrytoggle(event.currentTarget.checked)}
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
                    <!--
                      THE SEARCH'S SCOPE, said out loud. Not captured — the reference's toolbar sends
                      `doChatLogSearch` to a server and has nothing to warn about; ours filters the
                      alerts the page holds. `alert-toolbar-search-scope.ts` carries the whole
                      account, including why this is the resolution rather than a round trip on
                      Enter.

                      `role="status"` so a screen reader is told the answer narrowed, which is the
                      one thing a sighted reader gets from the sentence appearing where it was not.
                    -->
                    {#if searchScopeNotice}
                      <small class="form-text text-muted" role="status">{searchScopeNotice}</small>
                    {/if}
                  </div>
                </div>
              </form>
            </div>
          {/if}

          <app-roomscroller
            {@attach holdAlertsScroller}
            id="chatScrollViewParentAlerts"
            style="overflow-y: scroll; height: 100%;"
            onscroll={(event: Event) => feedScroll.trackAlertsScroll(event)}
          >
            <div>
              {#each visibleAlerts as item, index (item.id)}
                <RoomMessage
                  {item}
                  kind="alert"
                  {...messageChrome}
                  displayMode={alertsDisplayMode}
                  {alertLabels}
                  followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                  presenterStyle={presenterColorsFor(presenterColors, item.senderEmailHash)}
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

          <!--
            ── THE INLINE ALERT ENTRY, whose checkbox has always been drawn ─────────────────────────

            `O(20, o.showAlertsEntry ? 20 : -1)` at byte 2,056,748, template `H2e` at 2,044,139, with
            the three consts decoded from `app-alerts`' own table:

              20  [1,"w-100","inline-alert-entry-field"]
              52  ["id","textAreaAlertHolder",1,"p-1"]
              53  ["name","txt-area-alert","id","textAreaAlertTxt","rows","1","spellcheck","true",
                   "placeholder","Type your alert here..",1,"txt-area-alert","form-control",
                   "border-0",3,"keyup","paste"]

            The checkbox that toggles it has been in the toolbar since this pane was built and
            `alerts.inlineEntry` has held its value; NOTHING rendered the field (`acA-01`). The
            captured CSS for all three selectors is already bridged in
            `styles/captured-runtime-components.css`, so this is markup arriving to meet a stylesheet
            that was waiting for it.

            PRESENTER-ONLY here, and that is ours rather than upstream's: the checkbox is already
            inside `{#if isPresenter}` in the toolbar, so the field could only ever be opened by a
            presenter — but `inlineEntry` is client state, and a gate that depends on a checkbox
            being unreachable is not a gate. Posting an alert is presenter-only on the server either
            way (`post-alert.remote.ts`).
          -->
          {#if isPresenter && alerts.inlineEntry}
            <div class="w-100 inline-alert-entry-field">
              <div id="textAreaAlertHolder" class="p-1">
                <textarea
                  name="txt-area-alert"
                  id="textAreaAlertTxt"
                  rows="1"
                  spellcheck="true"
                  placeholder="Type your alert here.."
                  class="txt-area-alert form-control border-0"
                  bind:value={inlineAlertText}
                  onkeydown={onInlineAlertKey}
                  onpaste={onInlineAlertPaste}></textarea>
              </div>
            </div>
          {/if}
        </div>
      </app-alerts>
    </as-split-area>

    <!--
      `position-relative` when the overlay is up, which is `un(".chat-box").addClass("position-relative")`
      at byte 2502040. It is REQUIRED, not decoration: `#added-image-to-chat` is
      `position: absolute; top: 0; left: 0; width: 100%; height: 100%` (complete-app-styles.css:7004),
      so without a positioned ancestor it would size itself against the viewport and cover the room.

      Conditional rather than always-on, because the capture adds the class when the image arrives
      and this pane has no other absolutely-positioned child that wants it.
    -->
    <as-split-area
      minsize="0"
      class="chat-box as-split-area {broadcasts.salesImageUrl ? 'position-relative' : ''}"
      style={split.chatAreaStyle}
    >
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
              <ChatTabStrip tabs={chatTabs} bind:active={chat.tab} />
              <ul class="nav ml-auto align-items-center">
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
                  <a title="Search" class="nav-link p-0" onclick={() => chat.search.toggle('main')}>
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

          <!--
            The magnifier above used to open the Chat Logs modal. Upstream binds it to
            `toggleChatToolbarSearchOnly()` (byte 1,453,494, the `li` at index 10), and this room's
            own ALERTS column already worked that way — so the chat column was the odd one out. The
            modal is still reached from the sidebar, so nothing lost a route.
          -->
          {#if chat.search.isOpen('main')}
            <ChatSearchBar
              term={chat.search.term('main')}
              oninput={(value) => chat.search.setTerm('main', value)}
              onsubmit={() => onchatsearch('main', chat.search.term('main'))}
              onclear={() => chat.search.clear('main')}
            />
          {/if}

          <app-roomscroller
            bind:this={chatScroller}
            style="overflow-y: scroll; overflow-x: hidden; height: 100%;"
            onscroll={(event: Event) => feedScroll.trackChatScroll(event)}
          >
            <div>
              {#each visibleChatMessages as item, index (item.id)}
                <RoomMessage
                  {item}
                  kind="chat"
                  {...messageChrome}
                  displayMode={chatDisplayMode}
                  followedStyle={followedUsers[item.senderEmailHash]?.followChatStyle}
                  presenterStyle={presenterColorsFor(presenterColors, item.senderEmailHash)}
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
            `O(22, o.showTyping && o.usersTypingCnt > 0 ? 22 : -1)` — byte 1,454,281, a SIBLING of
            the composer switch below and therefore above whichever half of it renders. Consts 58,
            59, 60 and 61:

              <div><div class="d-flex align-items-center typing-indicator-container">
                <strong class="users-count me-1">[{{ usersTypingCnt }}]</strong>
                <app-typing-indicator-dots></app-typing-indicator-dots>
                <span class="users-typing"><em class="mx-1">{{ usersTyping }}</em></span>
              </div></div>

            THE ANIMATED DOTS ARE NOT REPRODUCED, and that is a measurement rather than a shortcut.
            `app-typing-indicator-dots` is three empty spans whose whole appearance is CSS, and
            neither `app-typing-indicator-dots` nor its `.typing-indicator` class has a single rule
            in any stylesheet this repository holds — the same check `smallerImagePreview` failed and
            `blinkingRec` passed. Emitting three empty spans that style to nothing would be markup
            with no consumer; inventing the animation would be inventing a design. The three classes
            that DO have rules — `typing-indicator-container`, `users-count`, `users-typing` — are
            all here.

            The COUNT is `typists.length` rather than a second field: a joined string that has to be
            split to be counted is two representations of one fact, and upstream carries both only
            because its receiver builds the string first.
          -->
          {#if typists.length > 0}
            <div>
              <div class="d-flex align-items-center typing-indicator-container">
                <strong class="users-count me-1">[{typists.length}]</strong>
                <span class="users-typing"><em class="mx-1">{typists.join(',')}</em></span>
              </div>
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
                    oninput={(event) => {
                      onexpandcomposer(event.currentTarget);
                      /*
                        `updateLastTypedTime()` — one `typing` per burst, then `notyping` after five
                        seconds of silence. The signal owns the debounce; this only reports the key.
                      */
                      ontyped(event.currentTarget.value);
                    }}
                    onpaste={handleComposerPaste}
                    onblur={onstoppedtyping}
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
      <!--
        `sendSalesImageToChat` — the image a presenter pins over the chat column.

        Transcribed from the subscriber at byte 2502019, which builds this by hand and appends it:

          un(".chat-box").addClass("position-relative");
          const o = un(`<div id="added-image-to-chat">
              <div class="text-right m-2">
                <span class="p-2" onclick="removeImageFromChat()" title="Close">&times;</span>
              </div>
              <a href="${i.url}" target="_blank" title="Open link: ${i.url}"><img src="${i.url}"/></a>
            </div>`);
          un(".chat-box").append(o)

        Every class and the id are the capture's, and all four CSS rules were already shipped
        verbatim at `css/complete-app-styles.css:7004-7007` — this markup is what they were waiting
        for.

        THREE DIVERGENCES, all forced and all stated:

        * `rel="noopener noreferrer"` on the anchor. The url is presenter-chosen and arbitrary;
          `target="_blank"` without it hands the opened page a live `window.opener`.
        * `role`/`tabindex`/`onkeydown` on the close control. Upstream is a bare `<span onclick>`,
          which no keyboard can reach. The element stays a `<span>` because the captured CSS selects
          `#added-image-to-chat span`; only the affordances are added.
        * `alt=""`. The image is decorative sales material with no captured description, and an
          invented one would be inventing evidence. Empty is the correct value for "decorative",
          not a missing attribute.

        NO width/height ON THE IMAGE, which the repository's no-CLS rule would normally require. It
        cannot cause layout shift here: the overlay is `position: absolute` filling an ancestor of
        fixed size, so it is out of flow entirely, and the url is remote with an unknowable intrinsic
        ratio. Stated rather than left as a silent exception.
      -->
      {#if broadcasts.salesImageUrl}
        <div id="added-image-to-chat">
          <div class="text-right m-2">
            <span
              class="p-2"
              role="button"
              tabindex="0"
              title="Close"
              onclick={() => broadcasts.salesImageDismissed()}
              onkeydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  broadcasts.salesImageDismissed();
                }
              }}>&times;</span
            >
          </div>
          <a
            href={broadcasts.salesImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open link: {broadcasts.salesImageUrl}"
            ><img src={broadcasts.salesImageUrl} alt="" /></a
          >
        </div>
      {/if}
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
