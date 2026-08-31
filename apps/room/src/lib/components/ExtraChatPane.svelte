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
   *
   * ## The measured facts about this surface live in `#lib/extra-chat-surface.ts`
   *
   * Every const index below is read from THIS component's table (byte 2,393,850) and not from
   * `app-chat`'s, which is not an offset of it. That module carries the decoded tables, the id this
   * composer must wear (`XCP-01`), and the three gaps this file cannot close from inside itself —
   * the absent YouTube button (`XCP-08`), the entire missing component stylesheet (`XCP-09`) and
   * the `ngClass` this room refuses (`XCP-07`).
   */
  import { tick } from 'svelte';

  import { composerEnterAction } from '#lib/chat-composer-enter.js';
  import {
    EXTRA_CHAT_COMPOSER_HOLDER_ID,
    EXTRA_CHAT_EMOJI_POPOVER,
    EXTRA_CHAT_GIF_TRIGGER
  } from '#lib/extra-chat-surface.js';
  import { ngbTooltip } from '#lib/ngb-tooltip.js';
  import { pastedImageFrom } from '#lib/pasted-image.js';
  import type { RoomScrollFollow } from '#lib/room/scroll-follow.js';
  import { formatChatMutedTill, sameCalendarDay } from '#lib/message-formatters.js';
  import ChatSearchBar from './ChatSearchBar.svelte';
  import ChatTabStrip from './ChatTabStrip.svelte';
  import type { ChatTabUnreadCounts } from '#lib/room/chat-tab-unread.js';
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
    /**
     * `acA-06` — THIS column's unread counts. `app-extra-chat` keeps its own `unreadMsgs` map (byte
     * 2,375,500) and clears its own on a switch, so the two columns badge independently.
     */
    unread?: ChatTabUnreadCounts;
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
      `isPresenter` USED TO BE HERE and is gone, 2026-08-14. Upstream's component reads it six times
      because it computes its own gates; this one is handed each RESULT instead, so authority is
      decided once in the parent. `#lib/extra-chat-surface.ts` carries the full argument.
    */
    canUseRTE: boolean;
    giphyApiKey: string;
    /**
     * The sixteen props every message in this room shares, spread straight into `RoomMessage`.
     *
     * ONE prop where there were twelve, and it closed a real defect rather than tidying a
     * declaration: the four that were not forwarded fell to their `false` defaults, so the same
     * chat message carried a reaction bar and an edit entry in the main column and neither here.
     * `room-message-chrome.ts` is the argument — it names this component by name, quotes the three
     * captured lines that key those gates on `logType` alone, and says why there is no per-column
     * narrowing upstream to reproduce. Pointed at rather than restated.
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
     * The `$effect` that acts on it lives HERE because the DOM in question is this component's
     * scroller — see the effect below, and `scroll-follow.ts`, which reached the same conclusion
     * for its own reasons. `follow` is the page's INSTANCE rather than a fresh one: constructing it
     * here would silently give this column the `alwaysScrollToBottom` the alerts one is forbidden.
     */
    follow: RoomScrollFollow<ChatTab>;
    viewerId: number;
    /** THIS column's flag — see the note on the effect. */
    readingHistory: boolean;
    onstopreadinghistory: () => void;
    onscrolltobottom: (scroller: HTMLElement) => void;
    onprivatechat: () => void;
    /**
     * The magnifier. The PAGE decides what it does: it toggles the search bar, which is upstream's
     * `toggleChatToolbarSearchOnly()` and what the alerts column already did. The Chat Logs modal
     * it used to open is still reached from the sidebar.
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
    /**
     * `acA-04` — `showChatToolbarExtended` for THIS column, and the checkbox it gates.
     *
     * `app-extra-chat` carries its own copy of the whole bar (const table at byte 2,395,378, the
     * checkbox at 2,396,458) and its own `filterChatMsgs.modOnlyExtra`, so nothing here is shared
     * with the main column but the component that draws it.
     */
    searchExtended: boolean;
    modOnly: boolean;
    onmodonly: (next: boolean) => void;
    /**
     * The gear — `toggleChatToolbar()`, byte 1,435,047. It was named `onsettings` and opened the
     * settings modal, which is not what the reference's gear does; it was renamed with `acA-04`,
     * when the extended toolbar gained the first control it had to show.
     */
    ontoggletoolbar: () => void;
    onimageupload: () => void;
    /**
     * `ACA-05` — a screenshot pasted into THIS column's composer.
     *
     * Const 61 carries `paste` in its binding section and `cMe` at byte **2,373,521** binds it. The
     * refusal that used to stand here read the MAIN composer's copy and concluded a second column
     * would seed from the first column's box; `app-extra-chat`'s own `onImagePaste` at byte
     * **2,392,023** reads `ui("#textAreaTxtExtra")`, so each column reads its own. Reading it once
     * more showed the DESTINATION differs too — `sendGrpChat(s.channel, …)`, this column's tab —
     * which is why the page routes it to `beginImagePaste(file, 'extra')` and not to the main
     * column's handler.
     */
    onpasteimage: (file: File) => void;
    /**
     * `XCP-08` — "Play YouTube For All". **The presence of this handler IS the gate.**
     *
     * `lMe` at byte 2,373,038 resolves five children and gates them at 2,373,334:
     * `O(2, canPostImages …)` image, `O(3, isPresenter …)` **YouTube**, `O(4, canPostImages …)` GIF,
     * `O(5, …enableRTE && … && isPresenter …)` RTE. The main column drew the third and this one did
     * not, so a presenter could send a video to the room from one chat column and not the other.
     *
     * Optional, and that is the whole design rather than convenience. This component is handed each
     * entitlement's RESULT and deliberately NOT `isPresenter` — the argument is in
     * `#lib/extra-chat-surface.ts`, which named exactly this prop as the reason `XCP-08` was
     * blocked. A `boolean` beside a `() => void` would put the gate in two places and let them
     * disagree; one nullable handler cannot. The page passes it or it does not, and the button
     * renders exactly when it can act.
     *
     * Upstream's span carries no click handler at all — it is a Bootstrap `data-bs-target`, and
     * this room's modal host is not Bootstrap-driven, which is the same substitution
     * `AlertChatArea` makes with its own `onopenmodal`.
     */
    onyoutube?: () => void;
    onrte: () => void;
    onselectgif: (url: string) => void;
  };

  let {
    tab = $bindable('off-topic'),
    chatTabs,
    unread = {},
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
    searchExtended,
    modOnly,
    onmodonly,
    ontoggletoolbar,
    onimageupload,
    onpasteimage,
    onyoutube,
    onrte,
    onselectgif
  }: Props = $props();

  let emojiOpen = $state(false);
  let giphyOpen = $state(false);
  let showMessageOptions = $state(false);

  /* `globals.chatInputFocus = 'textAreaTxtExtra'` — set on focus, read by the mention router. */
  /**
   * The extra chat column's scroll container, and the autoscroll it drives.
   *
   * A local `$state` since 2026-08-16, not a `let` on the page fed by an `onscrollerready`
   * callback — the round trip existed only so a page-level effect could reach an element this
   * component owns. `#lib/extra-chat-surface.ts` records what that prop cost while nothing read it.
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

  /**
   * `ACA-05` — the clipboard filter for THIS column, and the guard's position is upstream's.
   *
   * ```js
   * onImagePaste(e){ … let s=null;
   *   for(const r of o) 0===r.type.indexOf("image") && (s=r.getAsFile());
   *   if(s){ if(!this.canPostImages) return !1; … } }             // byte 2,392,023
   * ```
   *
   * The `canPostImages` check sits INSIDE the `if(s)` block here, where `app-chat`'s copy opens
   * with it. Behaviourally identical — no image, nothing happens either way — and the order is
   * `pastedImageFrom` first because the shared rule is the shared rule; noting it so a reader
   * comparing the two copies does not think one of them was transcribed loosely.
   *
   * The default is deliberately NOT prevented: a paste of plain text still lands in the textarea.
   */
  function handleComposerPaste(event: ClipboardEvent): void {
    if (!canPostImages) return;
    const image = pastedImageFrom(event.clipboardData?.items);
    if (image) onpasteimage(image);
  }

  /**
   * `XCP-03` and `XCP-04` — Enter, decoded rather than assumed.
   *
   * The three-way branch, both offsets and both divergences are in `#lib/chat-composer-enter.ts`,
   * which exists because this composer and `AlertQaModal`'s disagreed about it. Two things were
   * wrong HERE: Alt+Enter SENT, where byte 2,386,309 inserts a newline; and the emoji picker
   * survived a send, where byte 2,386,367 makes `showEmojiChooser = !1` the first act of the send
   * branch — a popover left covering the message it was used to write.
   */
  function submitOnEnter(event: KeyboardEvent) {
    if (composerEnterAction(event) !== 'send') return;
    event.preventDefault();
    emojiOpen = false;
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
        <!--
          ECP-01 — j3e at byte 2,367,398, gated by O(5, 0 == o.chatTabs.length ? 5 : -1) at
          2,399,848. The main column has carried this since acA-11; nbsp is the capture's \xa0.
        -->
        <!-- svelte-ignore a11y_missing_attribute -->
        <a class="navbar-brand ml-1 mr-1"
          ><i class="fas fa-comment"></i>
          <!--
            `XCP-02` — `j3e` (byte 2,367,381) renders `<span>\xa0Chat</span>` under
            `O(5, 0 == o.chatTabs.length ? 5 : -1)` (byte 2,399,848). `ChatTabStrip` already carries
            the other half of `acA-11`; without this one a channel-less room said nothing at all.
          -->
          {#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}
          {#if doNotDisturbOn}
            <span class="badge badge-danger ml-2"><i class="fas fa-bell-slash"></i> DND</span>
          {/if}</a
        >
        <ChatTabStrip tabs={chatTabs} bind:active={tab} {unread} />
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
          <!-- ECP-03 — const 15 carries the click, const 16 does not. See the contract test. -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li class="nav-item mx-1" onclick={onsearch}>
            <!-- svelte-ignore a11y_missing_attribute -->
            <a title="Search" class="nav-link p-0">
              <i class="fas fa-search"></i>
            </a>
          </li>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li class="nav-item dropdown ml-2" style="position: static;" onclick={ontoggletoolbar}>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a aria-haspopup="true" aria-expanded="false" class="nav-link dropdown-toggle p-0">
              <i title="Settings" class="fas fa-cog chat-header-gear"></i>
            </a>
          </li>
        </ul>
      </nav>
    </div>

    {#if searchOpen}
      <ChatSearchBar
        column="extra"
        term={searchTerm}
        oninput={onsearchinput}
        onsubmit={onsearchsubmit}
        onclear={onsearchclear}
        extended={searchExtended}
        {modOnly}
        {onmodonly}
      />
    {/if}

    <!--
      `app-extra-roomscroller` — its own element, because the reference gives this column a separate
      scroller component for the same reason it gives it a separate chat one: two independent
      positions. `XCP-07` — the `ngClass` it also binds (byte 2,400,160) is refused; see
      `#lib/extra-chat-surface.ts`.
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

    <!--
      `O(21, o.webinarMode ? 21 : -1)` at byte 2,400,282, tooltip verbatim from const **53**.

      `XCP-06` — this said "const 56", which is `app-chat`'s number for it. 56 in THIS component's
      table is the typing counter. `Z3e` (byte 2,371,066) also closes with a bare `T(4,"i")` — no
      const, so no class and no text — which is measured and refused: nothing can style or read it.
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
      <!--
        `XCP-01` — const 25 is `["id","textAreaHolder",…]` and the `Extra` suffix was OURS. It cost
        this column every `#textAreaHolder` rule in `app.css` INCLUDING the `container-type` the
        composer's two `@container` queries resolve against, so both button sets rendered at every
        width and pressing "+" only hid "+". `#lib/extra-chat-surface.ts` holds the measurement.
      -->
      <div id={EXTRA_CHAT_COMPOSER_HOLDER_ID} class="d-flex align-items-center textSendDiv">
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
              onpaste={handleComposerPaste}
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
              <!--
                `XCP-05` — const 66's four popover attributes, absent on this trigger alone. Its two
                `svelte-ignore` lines went with them; `#lib/extra-chat-surface.ts` says why.
              -->
              <span
                {...EXTRA_CHAT_EMOJI_POPOVER}
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
                <!-- `XCP-05` — const 72; this trigger had no tooltip at all. Ignores dropped as above. -->
                <span
                  {...EXTRA_CHAT_GIF_TRIGGER}
                  {@attach ngbTooltip}
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
                `XCP-08` — `iMe` at byte 2,371,656. Const 68 is
                `["data-bs-toggle","modal","data-bs-target","#play-youtube-modal",1,"textAreaBtns"]`
                wrapped around const 71
                `["ngbTooltip","Play YouTube For All","placement","left",1,"fas","fa-video"]`.

                Both captured attributes are kept even though this room's modal host is not
                Bootstrap-driven, exactly as the main column keeps them: they are what the capture
                serves, and `onclick` is the substitution. Gated on the HANDLER, not on a flag — see
                the prop.
              -->
              {#if onyoutube}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                  data-bs-toggle="modal"
                  data-bs-target="#play-youtube-modal"
                  class="textAreaBtns"
                  onclick={onyoutube}
                >
                  <i
                    {...{ ngbtooltip: 'Play YouTube For All', placement: 'left' } as Record<
                      string,
                      string
                    >}
                    {@attach ngbTooltip}
                    class="fas fa-video"
                  ></i>
                </span>
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
          <!--
            `EMOJI-10` — the `popoverId` MUST match what the trigger advertises, and here it did not:
            the picker mounted with the default `ngb-popover-3` while the trigger said
            `ngb-popover-extra`, so `portalPopover`'s lookup found nothing — or, with the main
            column's picker also open, THAT column's trigger, and positioned this popover over the
            wrong composer. `#lib/extra-chat-surface.ts` carries the measurement.
          -->
          <EmojiPicker popoverId="ngb-popover-extra" onselect={(glyph) => (composer += glyph)} />
        {/if}
      </div>
    {/if}
  </div>
</app-extra-chat>
