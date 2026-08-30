<script
  lang="ts"
  generics="Entry extends { id: number; displayName: string; avatarUrl: string; locStr?: string | null; isP?: boolean; isFT?: boolean }"
>
  import type { TipButton } from '#lib/tip-button.js';
  import type { RoomMenus } from '#lib/room/menus.svelte.js';
  import type { RoomRoster, RosterMember } from '#lib/room/roster.svelte.js';
  import type { RosterSessionFlags } from '#lib/roster-gates.js';
  import type { MessageBadge } from '#lib/types.js';

  /*
    `.room-sidebar` — the room's left rail: the viewer's own card, the Users block with its four
    header controls, and the item list (Archives, Transcript, Mobile App, Benzinga, Random User).

    ## The second of the five template regions, and the first to take state CLASSES as props

    `PrivateChatPanel` took nineteen plain props because it owns nothing the room's state classes
    own. This one is different: the roster list, its four header controls and two of the floating
    menus all live in `RoomRoster` and `RoomMenus`, so the instances are passed whole. Three
    references replace what would otherwise have been about twenty.

    That is the argument for the classes landing BEFORE the components, and it is worth stating
    where it pays off rather than only in the plan: extracting this markup first would have meant a
    prop-and-callback surface roughly the size of the file it came from.

    ## What stayed on the page

    Every GATE — `rosterVisible`, `rosterCountVisible`, `archivesAvailable`, `rowVisible` — is a
    transcription in `#lib/roster-gates.js` evaluated against the viewer and the session, both of which
    come from the page load. They are passed as computed booleans rather than recomputed here: a
    component that re-derived them would be a second place for the room's authority model to live,
    which is the opposite of this repository's first rule.
  */

  /*
    GENERIC over the roster row, declared in the `generics` attribute above.

    The constraint states what this markup reads and nothing more: the id keys the each block and
    the per-row menu, the name and avatar render, `locStr` is the city the location gate reads, and
    the two flags are the sort pipes'. The page's row carries twenty-odd fields it never touches.

    A fixed narrow interface was the first draft and TypeScript refused it, correctly: the page's
    callbacks take the FULL row, and a function accepting a wide parameter cannot stand in for one
    declared to accept a narrow one. Widening the component's own reads to the page's type would
    have been the other fix and the wrong one — it would tie this file to the load's shape. Generic
    keeps both honest.
  */
  interface Props {
    /** Whether the rail is expanded. The capture toggles a class rather than unmounting. */
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    isPresenter: boolean;
    /*
      NO `user` AND NO `viewer` PROP, and their absence is deliberate rather than an omission.

      A first draft declared both. ESLint reported them unused and it was right twice over: the
      `user` in this markup is the each block's row variable, which shadows any prop of that name,
      and every gate the viewer would have fed is already passed as a computed answer. Two props
      that render nothing is exactly the dead scaffolding this repository forbids, and the compiler
      found them before the diff did.
    */
    /**
     * The session settings this rail reads, named rather than taken whole.
     *
     * `RosterSessionFlags` is what the gates need; these three are the rail's own hides. Stating
     * them is the same discipline as the generic row above — a component says what it reads, so
     * removing a setting breaks here rather than silently rendering an item nobody configured.
     */
    session: RosterSessionFlags & {
      hideAppInfo?: boolean;
      hideRecs?: boolean;
      hideChatLog?: boolean;
      /**
       * RS-05 — `showUserAvatar(e) { return !sessData.hideAvatars || !!e }` (byte 2,036,617).
       *
       * The roster's avatar has its OWN gate and it is not the message log's: a presenter's avatar
       * shows even in a room that hides avatars, because a member has to be able to tell who is
       * running the room. The rail rendered every avatar unconditionally, so a room that turned
       * avatars off still published every member's picture in the sidebar.
       */
      hideAvatars?: boolean;
    };
    /**
     * RS-02 — the badges a roster row wears, resolved by the page.
     *
     * `parseBadges(e.data.badges)` upstream, which builds an HTML string from the account's badge
     * definitions. This room already has that resolution — `RoomFeeds.badgesFor(emailHash)`, with
     * the dark-variant fallback and the deleted-badge skip written out there — and it is the SAME
     * function the message rows use. Passed as a resolver rather than pre-resolved per row, because
     * the rail renders a list that changes on every roster frame.
     */
    badgesFor: (emailHash: string | null | undefined) => readonly MessageBadge[];
    roster: RoomRoster<Entry & RosterMember & { email: string }>;
    menus: RoomMenus;
    /** Whether the realtime channel is up. The "Chat" line reports it. */
    roomEventsConnected: boolean;
    /** Whether the media session is up, reported beside it. */
    mediaConnected: boolean;
    /** Set while the alerts/chat column is torn off into its own window. */
    chatAlertsDetached: boolean;

    /*
      The gates, computed by the page from `#lib/roster-gates.js` and passed as answers.

      Not recomputed here on purpose: every authority decision in this room is made in one place
      from data the server owns, and a component that evaluated its own copy would be a second
      place for that to drift.
    */
    rosterVisible: boolean;
    rosterCountVisible: boolean;
    archivesAvailable: boolean;
    rowVisible: (entry: Entry) => boolean;
    rosterRowClass: (entry: Entry) => string;
    /*
      PREDICATES, not booleans, because they answer per row. Passed as the page's own functions
      so the gate is evaluated in exactly one place; a component that took a boolean would have
      to be told the answer for every row up front, and one that re-derived it would be a second
      home for the room's authority model.
    */
    locationVisible: (entry: Entry) => boolean;
    /**
     * "Show only usernames?" — whether this row draws in full or as an icon and a name.
     *
     * Per ROW and not per viewer: `rosterRowIsFull` carries the transcription and the reason that
     * distinction is the whole setting. Resolved on the page like every other roster gate, so this
     * component renders a decision rather than making one.
     */
    rowIsFull: (entry: Entry) => boolean;
    /**
     * The "tip me" button, already resolved. `tipButtonFor` holds the three-way gate and the
     * URL check; this component renders two sites from one answer, exactly as the reference reads
     * one `isTipEnabled` field at both of its.
     */
    tip: TipButton;
    canOpenRosterPrivateChat: (entry: Entry) => boolean;
    mobileAppAvailable: boolean;
    /** The three Benzinga settings as one value — see `gates.benzinga` for why they travel together. */
    benzinga: { visible: boolean; url: string | null; logoUrl: string | null };
    /** `DUMP_CONTRACT.version`, shown in the footer. */
    dumpVersion: string;

    /**
     * The SIX modals this rail opens, named rather than `string`.
     *
     * A `string` here would accept any name the page's `ModalName` union does not contain, and the
     * page's own handler is typed on that union — so a wider prop is both a lie and a type error at
     * the call site. Listed explicitly, which also documents what the rail can reach.
     */
    onopenmodal: (
      name: 'alert-logs' | 'chat-logs' | 'connectivity' | 'followed' | 'muted' | 'settings'
    ) => void;
    onopenrosteruserinfo: (entry: Entry) => void;
    onopenrosterprivatechat: (entry: Entry) => void;
    onmentionrosteruser: (entry: Entry) => void;
    /** The per-row kebab also records WHICH row the user menu belongs to. */
    onselectuser: (id: number) => void;
    onusersearchkey: (event: KeyboardEvent) => void;
    ongetmobilepin: () => void;
    ongetrandomuser: () => void;
    onopentranscript: () => void;
    onreopenalertschat: () => void;
    onreload: () => void;
  }

  let {
    sidebarOpen,
    theme,
    isPresenter,
    badgesFor,
    session,
    roster,
    menus,
    roomEventsConnected,
    mediaConnected,
    chatAlertsDetached,
    rosterVisible,
    rosterCountVisible,
    archivesAvailable,
    rowVisible,
    rosterRowClass,
    locationVisible,
    rowIsFull,
    tip,
    canOpenRosterPrivateChat,
    mobileAppAvailable,
    benzinga,
    dumpVersion,
    onopenmodal,
    onopenrosteruserinfo,
    onopenrosterprivatechat,
    onmentionrosteruser,
    onselectuser,
    onusersearchkey,
    ongetmobilepin,
    ongetrandomuser,
    onopentranscript,
    onreopenalertschat,
    onreload
  }: Props = $props();

  /**
   * `toggleUserSearch()` focuses the input 300ms later, because it does not exist until the strip
   * renders. An attachment focuses it when it is actually in the DOM, which is the same intent
   * without a timer that can outlive the element.
   */
  function focusUserSearch(node: HTMLInputElement) {
    node.focus();
  }
</script>

<div class="room-sidebar">
  <div class="sidebar-wrapper">
    <nav class="navbar w-100 h-100">
      <ul class="navbar-nav small w-100 h-100">
        <li class="nav-item text-center">
          <p>
            Powered by:
            <!-- OURS, not the reference's. This shipped as
                   `href="https://protradingroom.com"` with the text "ProTradingRoom.com" —
                   transcribed with the rest of the sidebar — so every room this product
                   serves credited, and linked out to, a different company. The class name
                   stays `ptr-website-link` because `app.css` styles that selector and
                   renaming it would change the rendering, which this is not. -->
            <a
              href="https://www.tradingroom.app"
              target="_blank"
              rel="noopener noreferrer"
              class="ptr-website-link">TradingRoomApp</a
            >
          </p>
          <p>Version: {dumpVersion}</p>
          <!--
              `H(12, JAe, 2, 1, "p")` with `O(12, sessData.hideAppInfo ? -1 : 12)`.

              This was an empty `<p>` — the element was in the right place with nothing in
              it, so the room looked complete and the feature did not exist. Inside is
              `XAe`, whose own gate is
              `O(1, !ptrMobileAppEnabled && !customMobileAppEnabled
                    || user.isFT && !freeTrialsGetApp ? -1 : 1)`:
              a room that has no app hides the button, and a trial account is shut out of it
              unless the room says trials may have the app.
            -->
          <!--
            `H(13, aPe, 5, 2, "p")` with `O(13, isTipEnabled ? 13 : -1)`, consts 34/35/36:
            `["type","button",1,"btn","btn-primary","btn-sm",3,"click","title"]`,
            `[1,"fas","fa-dollar-sign"]`, `[1,"ms-1"]`. The label is bound to BOTH the `title`
            attribute and the text, which is upstream's own doubling and not a mistake here.
          -->
          <!--
            RS-10 — THE ORDER IS THE REFERENCE'S: `H(12, rPe, …)(13, aPe, …)` at byte 2,470,612,
            with `O(12, sessData.hideAppInfo ? -1 : 12)` and `O(13, isTipEnabled ? 13 : -1)`. Mobile
            App Info comes first and the tip second, and these two were the other way round.

            It reads as cosmetic and is not quite: both are `<p>` buttons in the same block, so the
            one a member's eye lands on first is whichever the room happens to have configured. The
            reference puts the thing the ROOM offers before the thing the PRESENTER asks for.
          -->
          {#if !session?.hideAppInfo}
            <p>
              {#if mobileAppAvailable}
                <button
                  type="button"
                  data-bs-toggle="modal"
                  data-bs-target="#mobileAppInfoModal"
                  class={['btn btn-sm btn-secondary', { 'btn-dark': theme === 'dark' }]}
                  onclick={ongetmobilepin}>Mobile App Info</button
                >
              {/if}
            </p>
          {/if}
          {#if tip.visible}
            <p>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                title={tip.label}
                onclick={() => window.open(tip.url, '_blank', 'noopener,noreferrer')}
              >
                <i class="fas fa-dollar-sign"></i><span class="ms-1">{tip.label}</span>
              </button>
            </p>
          {/if}
          <hr />
          <!--
              The two connection lines. Both were hard-coded markup - a permanently spinning
              cog next to "Reconnecting Media..." and a permanent tick next to "Chat" - bound
              to nothing, so the spinner could never stop no matter what the media server did.

              The raw staff capture (`sidebar-forced-open`) shows the same two rows, and it
              was taken mid-reconnect: `i.fas.fa-cog.fa-spin` beside "Reconnecting Media..."
              and `i.fas.fa-check` beside "Chat". So the ELEMENTS are right; what was missing
              is that they report state. `mediaConnected` already tracks the SFU socket, and
              `roomEventsConnected` tracks the SSE channel that carries chat.
            -->
          <!--
            ── RS-11 — FOUR NODES IN TWO SHAPES, and we had two nodes in one ─────────────────────

            ```js
            H(15,lPe,3,0,"p")(16,cPe,3,0,"p"), d(17,"p"), H(18,dPe,3,0,"span")(19,uPe,3,0,"span")
            O(15, socketConnected ? -1 : 15)   O(16, mediaSoupService.connected ? -1 : 16)
            O(18, socketConnected ? 18 : -1)   O(19, mediaSoupService.connected ? 19 : -1)
            ```

            The two FAILURE lines are a `<p>` each — they are sentences, and a sentence gets a line.
            The two SUCCESS marks share one `<p>` and are `<span>`s inside it — they are labels, and
            two labels sit on one line. We had one `<p>` per service with the two states swapped
            inside it, so on a healthy connection the room drew two stacked lines where the
            reference draws one, and CHAT came second where the reference puts it first.

            The literals are transcribed with their own spacing, which is not uniform and is
            upstream's: `" Reconnecting Chat..."` has a leading space and no trailing one,
            `" Reconnecting Media... "` has both, and `"Chat "` / `"Media "` each carry a trailing
            space before their tick. Written as expressions because Svelte normalises whitespace at
            element boundaries.
          -->
          {#if !roomEventsConnected}
            <p><i class="fas fa-cog fa-spin"></i>{' Reconnecting Chat...'}</p>
          {/if}
          {#if !mediaConnected}
            <p><i class="fas fa-cog fa-spin"></i>{' Reconnecting Media... '}</p>
          {/if}
          <p>
            {#if roomEventsConnected}
              <span>{'Chat '}<i class="fas fa-check"></i></span>
            {/if}
            {#if mediaConnected}
              <span>{'Media '}<i class="fas fa-check"></i></span>
            {/if}
          </p>
        </li>
        <li class="nav-item">
          <!-- svelte-ignore a11y_missing_attribute -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            title="Connectivity Check"
            data-bs-toggle="modal"
            data-bs-target="#webrtc-troubleshooter-modal"
            class="nav-link sidebar-item"
            onclick={() => onopenmodal('connectivity')}
          >
            <i class="fas fa-network-wired"></i>
            <span class="pl-2">Connectivity Check</span>
          </a>
        </li>
        <!--
            `O(25, e.reopenAlertsChatBtn ? 25 : -1)` (`app-room.render-helpers.js:355`),
            rendering `oPe` (`:76-87`) as `H(25, oPe, 5, 0, 'li', 19)` (`:312`) - which is
            why it sits HERE, between Connectivity Check and General Settings, rather than at
            the end of the list. Markup and classes from the const table: 19 is
            `[1, 'nav-item']`, 38 is
            `['title', 'Reopen Alerts / Chat', 1, 'nav-link', 'sidebar-item', 3, 'click']`,
            39 is `[1, 'fas', 'fa-window-restore']` and 22 is `[1, 'pl-2']`
            (`app-room.compiled.js:1324, 1416, 1417, 1337`).

            This is the control the detach bootbox promises when it says the chat can be
            reopened "from the side menu", and until now this room had no such item - the
            affordance was a button inside the column, which upstream is deleted the moment
            the chat detaches.

            Gated on `chatAlertsDetached` rather than a separate `reopenAlertsChatBtn`
            field. Upstream needs two variables because `hideChatAlerts` is a plain property
            that four other writers also set, so it cannot say WHY it is true; here
            `hideChatAlerts` is derived and `chatAlertsDetached` IS the detach source, so a
            second flag would be a copy that can only disagree. The reference sets both in
            one statement and clears both in `onreopenalertschat` (`app-room.full.js:2179-2181`,
            `:3047-3053`), so they are never independent.
          -->
        {#if chatAlertsDetached}
          <li class="nav-item">
            <!-- svelte-ignore a11y_missing_attribute -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a
              title="Reopen Alerts / Chat"
              class="nav-link sidebar-item"
              onclick={onreopenalertschat}
            >
              <i class="fas fa-window-restore"></i>
              <span class="pl-2">Reopen Alerts / Chat</span>
            </a>
          </li>
        {/if}
        <li class="nav-item">
          <!-- svelte-ignore a11y_missing_attribute -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            title="General Settings"
            data-bs-toggle="modal"
            data-bs-target="#user-settings-modal"
            class="nav-link sidebar-item"
            onclick={() => onopenmodal('settings')}
          >
            <i class="fas fa-cogs"></i>
            <span class="pl-2">General Settings</span>
          </a>
        </li>
        <!--
            `H(31, aPe, 4, 2, "li", 25)` with `O(31, sessData.hasBenzingaNews ? 31 : -1)`.

            `aPe` picks between two children on `O(2, altBenzingaLogoURL ? 2 : 3)`: a custom
            logo, or the captured default pair of a `fas fa-newspaper` and the words
            "Benzinga News". The default image the capture would otherwise use
            (`/assets/images/benzinga-logo.png`) is not in this repository, so the icon form
            is what an unconfigured room gets - not a broken `<img>`.
          -->
        <!--
          ── SIDE-01 — NO TIP ITEM HERE. IT IS THE NAVBAR'S, AND IT WAS RENDERING A THIRD TIME ────

          A `<li class="nav-item" title={tip.label}>` used to sit on this line, carrying a comment
          that cited `H(14, APe, 5, 2, "li", 139)` and consts 139/140. Every one of those citations
          is real and every one of them belongs to a DIFFERENT template: node 14 and consts 139/140
          are `U4e`, the `app-room` NAVBAR, at bundle byte 2,485,267. This file transcribes `TPe`,
          the sidebar, whose own node 14 is `T(14,"hr")` — read end to end at 2,470,562 through
          2,472,257, it has no tip `<li>` at any slot.

          The tip the sidebar DOES have is `aPe` (byte 2,466,601), the `<p><button>` above, gated
          `O(13, isTipEnabled ? 13 : -1)`, and that one is correct and stays. So the reference
          renders the tip twice in the room and this room was rendering it three times: here, in
          that `<p>`, and — since RS-09 built the navbar's copy on 2026-08-30 — in `RoomNavbar` as
          well. RS-09 measured this exact `<li>` and said so in as many words ("In the reference TPe
          … there is no tip li in the sidebar at all"); what it did was add the missing navbar
          render, and the stray one it had just measured stayed behind.

          **The lesson is the one the audit's own preamble states, arriving from the other side.** A
          row phrased as "X is missing over there" is closed by adding X, and the half that says
          "and it is wrong over here" is the half that gets dropped — because the added control is
          visible and the removed one is only a deletion nobody is looking for.
          `sidebar-tip-single-render-contract.test.ts` is what makes it stay one, in both files.
        -->
        {#if benzinga.visible}
          <li class="nav-item py-0">
            <a
              href={benzinga.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Benzinga News"
              class="nav-link sidebar-item ps-1"
            >
              {#if benzinga.logoUrl}
                <img
                  class="benzinga-logo-alt"
                  src={benzinga.logoUrl}
                  alt="Benzinga News"
                  width="120"
                  height="24"
                />
              {:else}
                <i class="fas fa-newspaper"></i><span class="pl-2">Benzinga News</span>
              {/if}
            </a>
          </li>
        {/if}
        <!-- `O(32, e.archivesAvailable ? 32 : -1)` -->
        {#if archivesAvailable}
          <li class="nav-item dropdown">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a
              id="archivesDropdown"
              title="Archives"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded={menus.archives}
              class="nav-link sidebar-item dropdown-toggle"
              onclick={(event) => {
                event.stopPropagation();
                menus.toggle('archives');
              }}
            >
              <i class="fas fa-archive"></i>
              <span class="pl-2">Archives</span>
            </a>
            <div
              aria-labelledby="archivesDropdown"
              class={menus.archives
                ? 'dropdown-menu users-dropdown-options show'
                : 'dropdown-menu users-dropdown-options'}
              style={menus.archives ? 'display: block;' : undefined}
            >
              <!-- `O(6, isPresenter || !sessData.hideRecs ? 6 : -1)` -->
              {#if isPresenter || !session?.hideRecs}
                <!-- svelte-ignore a11y_missing_attribute -->
                <a class="dropdown-item small"
                  ><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a
                >
              {/if}
              <!-- Alert Logs is the one entry the capture never gates. -->
              <!-- svelte-ignore a11y_missing_attribute -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <a
                data-bs-toggle="modal"
                data-bs-target="#alerts-logs-modal"
                class="dropdown-item small"
                onclick={() => onopenmodal('alert-logs')}
              >
                <i class="fas fa-bell"></i>
                <span class="pl-2">Alert Logs</span>
              </a>
              <!--
                One condition guards both, and it is the same one twice:
                  O(11, !sessData.hideChatLog || isPresenter ? 11 : -1)   Chat Logs
                  O(12, !sessData.hideChatLog || isPresenter ? 12 : -1)   Transcript History
              -->
              {#if !session?.hideChatLog || isPresenter}
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <a
                  data-bs-toggle="modal"
                  data-bs-target="#chat-logs-modal"
                  class="dropdown-item small"
                  onclick={() => onopenmodal('chat-logs')}
                >
                  <i class="fas fa-comment"></i>
                  <span class="pl-2">Chat Logs</span>
                </a>
                <!-- svelte-ignore a11y_missing_attribute -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- `x("click", () => g(3).toggleSpeechRecoHistory())` - this had no handler. -->
                <a class="dropdown-item small" onclick={onopentranscript}
                  ><i class="fas fa-closed-captioning"></i><span class="pl-2"
                    >Transcript History</span
                  ></a
                >
              {/if}
            </div>
          </li>
        {/if}
        <li class="nav-item py-0">
          <!-- svelte-ignore a11y_missing_attribute -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            title="Manage Muted Users"
            data-bs-toggle="modal"
            data-bs-target="#mutedUsersModal"
            class="nav-link sidebar-item ps-1"
            onclick={() => onopenmodal('muted')}
          >
            <i class="fas fa-comments"></i>
            <span class="pl-2">Manage Muted Users</span>
          </a>
        </li>
        <li class="nav-item py-0">
          <!-- svelte-ignore a11y_missing_attribute -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <a
            title="Manage Followed Users"
            data-bs-toggle="modal"
            data-bs-target="#followedUsersModal"
            class="nav-link sidebar-item ps-1"
            onclick={() => onopenmodal('followed')}
          >
            <i class="fas fa-users"></i>
            <span class="pl-2">Manage Followed Users</span>
          </a>
        </li>
        <!--
            `O(43, e.appService.globals.isPresenter ? 43 : -1)` - presenter only, and it acts
            on the roster (`globals.roster.filter(r => !r.isP)`), which a member does not have.
            This was shown to everyone.
          -->
        {#if isPresenter}
          <li class="nav-item py-0">
            <!-- svelte-ignore a11y_missing_attribute -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a title="Get Random User" class="nav-link sidebar-item ps-1" onclick={ongetrandomuser}>
              <i class="fas fa-user"></i>
              <span class="pl-2">Get Random User</span>
            </a>
          </li>
        {/if}
        <!-- `O(44, onlyPresentersVisibleToViewers || rosterVisibleToViewers || isPresenter || user.hasAdminChat ? 44 : -1)` -->
        {#if rosterVisible}
          <li class="nav-item d-flex flex-column h-100">
            <!-- svelte-ignore a11y_missing_attribute -->
            <a
              class="nav-link active-room-users d-flex align-items-center justify-content-between pt-0"
            >
              <div title="Users">
                <i class="fas fa-user"></i>
                <span class="pl-2">Users:</span>
                <!--
                  `O(6, sessData.rosterCountVisibleToViewers || isPresenter ? 6 : -1)` - the
                  COUNT has its own gate, separate from the roster list's. This was
                  unconditional, so a room that hides the headcount from viewers still
                  published it.
                -->
                {#if rosterCountVisible}
                  <span class="badge badge-primary d-inline-block ml-1"
                    >{roster.connectedCount}</span
                  >
                {/if}
              </div>
              <div class="flex-fill users-btns">
                <div title="Users Options" class="dropdown user-options">
                  <!-- svelte-ignore a11y_consider_explicit_label -->
                  <button
                    id="user-options-btn"
                    data-bs-toggle="dropdown"
                    aria-expanded={menus.rosterSort}
                    class="btn btn-sm btn-dark ml-1 float-right border-0 dropdown-toggle"
                    onclick={(event) => {
                      event.stopPropagation();
                      menus.toggle('rosterSort');
                    }}
                  >
                    <i class="fas fa fa-cog"></i>
                  </button>
                  <ul
                    aria-labelledby="user-options-btn"
                    class={menus.rosterSort ? 'dropdown-menu show' : 'dropdown-menu'}
                    style={menus.rosterSort ? 'display: block;' : undefined}
                  >
                    <!--
                      const 65 is `[1,"dropdown-item","d-flex","align-items-center","justify-content-between",3,"click"]`
                      and `H(15, fPe, 1, 0, "i", 66)` with `O(15, roster.trialsOnly ? 15 : -1)`
                      puts a `fas fa-check-circle` (const 66) on the right when the filter is
                      on. `justify-content-between` exists FOR that tick; the item had neither
                      the handler nor the icon, so it was a label in a menu.
                    -->
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <li
                      class="dropdown-item d-flex align-items-center justify-content-between"
                      onclick={() => roster.toggleTrialsOnly()}
                    >
                      <span>Sort by Trials</span>
                      {#if roster.trialsOnly}
                        <i class="fas fa-check-circle"></i>
                      {/if}
                    </li>
                  </ul>
                </div>
                <button
                  title="Reload Users"
                  class="btn btn-sm btn-default ml-1 float-right reload-room-users border-0"
                  onclick={() => onreload()}
                >
                  <i class="fas fa fa-sync"></i>
                </button>
                <!--
                  `z("ngClass", ut(6, qB, i.isSortUsers))` with `qB = t => ({"btn-dark": t})` -
                  the alpha-sort button goes dark while the sort is on. It had no handler and
                  no state, so nothing about the list or the button ever changed.
                -->
                <button
                  title="Sort Users"
                  class={[
                    'btn btn-sm btn-secondary float-right border-0 ms-1',
                    { 'btn-dark': roster.sortByNick }
                  ]}
                  onclick={() => roster.toggleSortByNick()}
                >
                  <i class="fas fa-sort-alpha-down"></i>
                </button>
                <button
                  title="Search Users"
                  class="btn btn-sm btn-default float-right search-room-users border-0"
                  onclick={() => roster.toggleSearch()}
                >
                  <i class="fas fa fa-search"></i>
                </button>
              </div>
            </a>
            <!--
              `H(22, mPe, 1, 1, "input", 73)` gated by `O(22, roster.searchOpen ? 22 : -1)`. Every
              attribute is const 73 verbatim. The capture binds `search` (the clear "x" a
              `type=search` input fires) to `searchUsers()` and `keyup` to `onusersearchkey`,
              which acts on Enter alone.
            -->
            {#if roster.searchOpen}
              <input
                type="search"
                id="userSearchTermInput"
                placeholder="Search by nick or email,enter to search"
                aria-label="Search"
                aria-describedby="addon-search"
                class="form-control"
                bind:value={roster.searchTerm}
                onsearch={() => roster.search()}
                onkeyup={onusersearchkey}
                {@attach focusUserSearch}
              />
            {/if}
            <div class="flex-grow-1">
              <app-room-roster>
                <div class="room-roster-list">
                  {#if sidebarOpen}
                    {#each roster.display as user (user.id)}
                      <!--
                        Two gates and a class map, all of which were missing: the per-row
                        visibility test, and `{regUser: !isP, presUser: isP || hasAdminChat}`,
                        which is not the either/or that `role === 'user'` assumed.
                      -->
                      {#if rowVisible(user)}
                        <div class="room-roster-container">
                          <div class={rosterRowClass(user)}>
                            <!--
                              `O(1, !sessData.showOnlyUsernames || e.isP ? 1 : 2)` — byte 2,035,670.
                              Slot 1 is the full row; slot 2 is `T2e`, four nodes, below. `e` is the
                              ROW: a room with this on draws presenters in full and members as bare
                              names, to everybody. See `rosterRowIsFull`.
                            -->
                            {#if !rowIsFull(user)}
                              <div class="media">
                                <i class="fas fa-user m-1"></i>
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <span
                                  onclick={() => onmentionrosteruser(user)}
                                  ondblclick={() => onopenrosteruserinfo(user)}
                                  >{user.displayName}</span
                                >
                              </div>
                            {:else}
                              <div class="media">
                                <!--
                                  RS-05 — `O(1, i.showUserAvatar(e.isP) ? 1 : -1)`, and
                                  `showUserAvatar(e) { return !sessData.hideAvatars || !!e }` at
                                  byte 2,036,617.

                                  The roster's avatar gate is NOT the message log's: a presenter's
                                  picture shows even in a room that hides avatars, because a member
                                  has to be able to tell who is running the room. This rendered
                                  every avatar unconditionally, so a room with avatars turned off
                                  still published every member's picture here.
                                -->
                                {#if !session?.hideAvatars || user.isP === true}
                                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                                  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                                  <img
                                    class="rosterImg mr-3"
                                    alt={user.displayName}
                                    src={user.avatarUrl}
                                    onclick={() => onopenrosteruserinfo(user)}
                                  />
                                {/if}
                                <div class="media-body">
                                  <div class="mt-0 mb-0 nickName d-inline">
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <span
                                      onclick={() => onmentionrosteruser(user)}
                                      ondblclick={() => onopenrosteruserinfo(user)}
                                      >{user.displayName}</span
                                    >
                                    <!--
                                      RS-02 and RS-01 — `O(6, e.data.badges ? 6 : -1)` and
                                      `O(7, isPresenter && e.isFT ? 7 : -1)` at byte 2,034,694.

                                      The badges div was rendered ALWAYS and EMPTY: const 8's class
                                      list with no content and no gate, which is a wrapper nobody
                                      fills. The Trial chip (const 9) had no node at all — so a
                                      presenter scanning the roster could not tell a trial from a
                                      paying member, which is the one distinction that list is used
                                      to make.

                                      `badgesFor` is `RoomFeeds`'s and is the SAME resolution the
                                      message rows use, including its dark-variant fallback and its
                                      skip for a badge deleted from the account. Upstream reaches
                                      the same place through `parseBadges`, which builds an HTML
                                      string; real elements here for the reason `MessageBody`
                                      records — text that is never parsed as markup cannot be
                                      markup.
                                    -->
                                    {#each badgesFor(user.emailHash) as badge, badgeIndex (`${user.id}-${badgeIndex}`)}
                                      {#if badge.imageUrl}
                                        <img
                                          class="user-badge-img"
                                          src={badge.imageUrl}
                                          alt={badge.imageUrl}
                                        />
                                      {:else}
                                        <span
                                          class="badge px-1 mx-1 user-badge d-inline-block align-baseline mr-1"
                                          style="background-color: {badge.backgroundColor}; color: {badge.color};"
                                          >{badge.text}</span
                                        >
                                      {/if}
                                    {/each}
                                    {#if isPresenter && user.isFT === true}
                                      <span class="badge bg-danger trial-badge">Trial</span>
                                    {/if}
                                    <!-- svelte-ignore a11y_interactive_supports_focus -->
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <a
                                      role="button"
                                      id="dropdownMenuLink"
                                      data-bs-toggle="dropdown"
                                      aria-haspopup="true"
                                      aria-expanded={menus.userId === user.id}
                                      class="msgMenu dropright d-inline-block float-right"
                                      onclick={(event) => {
                                        event.stopPropagation();
                                        onselectuser(user.id);
                                        menus.toggleUserMenu(user.id);
                                      }}>⠇</a
                                    >
                                    <div
                                      aria-labelledby="dropdownMenuLink"
                                      class={menus.userId === user.id
                                        ? 'dropdown-menu users-dropdown-options show'
                                        : 'dropdown-menu users-dropdown-options'}
                                      data-bs-popper={menus.userId === user.id
                                        ? 'static'
                                        : undefined}
                                      style={menus.userId === user.id
                                        ? 'display: block;'
                                        : undefined}
                                    >
                                      <!-- svelte-ignore a11y_missing_attribute -->
                                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                                      <a
                                        class="dropdown-item"
                                        onclick={() => onopenrosteruserinfo(user)}
                                        ><i class="fas fa-user"></i>&nbsp;&nbsp;User Info</a
                                      >
                                      <!-- svelte-ignore a11y_missing_attribute -->
                                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                                      <a
                                        class="dropdown-item"
                                        onclick={() => onmentionrosteruser(user)}
                                        ><i class="fas fa-reply"></i>&nbsp;&nbsp;Mention / Reply</a
                                      >
                                      {#if canOpenRosterPrivateChat(user)}
                                        <!-- svelte-ignore a11y_missing_attribute -->
                                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <a
                                          class="dropdown-item"
                                          onclick={() => onopenrosterprivatechat(user)}
                                          ><i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat
                                        </a>
                                      {/if}
                                    </div>
                                  </div>
                                </div>
                                <!--
                                `<p class="userLocation">`, a sibling of `.nickName` inside
                                `.media-body`. Presenter-only: the reference gates it on
                                `globals.isPresenter && entry.privData`, so a member never
                                sees anyone's city — see `locationVisibleTo`.
                              -->
                                {#if locationVisible(user)}
                                  <p class="userLocation">{user.locStr}</p>
                                {/if}
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/if}
                    {/each}
                  {/if}
                </div>
              </app-room-roster>
            </div>
          </li>
        {/if}
      </ul>
    </nav>
  </div>
</div>
