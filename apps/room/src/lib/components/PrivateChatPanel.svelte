<script lang="ts">
  import CompactMessageRow from '#lib/components/CompactMessageRow.svelte';
  import { panelDragResize } from '#lib/panel-drag.js';

  /*
    `app-privchat` — the room's private-message panel, as its own component.

    ## Why this one first

    It is the smallest of the five template regions (250 lines) and the most self-contained: one
    floating panel, one conversation at a time, no shared scroll machinery and no split geometry. It
    is the slice that proves the Phase 2 pattern without risking the panes a member looks at all day.

    ## Props rather than context, and the reason is not laziness

    The plan called for `createContext`, and `svelte/context` recommends it over a shared module —
    because module-level state is *"accessible by the NEXT user"* during SSR. That argument does not
    apply here: the room's eight state classes are instantiated inside `+page.svelte`, so they are
    per-request already and there is nothing to leak. What context would buy is avoiding prop
    drilling, and this component is a DIRECT child of the page. Adding a context layer for a
    one-level hop is indirection with no reader.

    Context earns its place the moment a pane grows children that need the same state. When that
    happens the change is mechanical and this note should be revisited rather than obeyed.

    ## REVISITED 2026-08-17, and the condition has NOT fired. Measured, not felt.

    The phase plan instructed the opposite — "`PresentationArea` → its own panes: `createContext`" —
    and a first pass at it got as far as a written provider before the evidence refuted it. Recording
    that here because the plan's sentence is still readable and would otherwise be obeyed again.

    What the trigger above actually asks is whether state passes THROUGH a layer. The docs define
    the problem the same way: values owned by a parent reaching a descendant "potentially through
    many layers of intermediate components". So it was counted, by walking each child's own template
    for the prop names its parent had handed it:

      `PresentationArea` forwards 50 props unchanged to 12 children.
      Of those 50, the number a child forwards ON to a grandchild is ZERO.

    Fifty one-level hops is not drilling; it is a wide component with direct children. Context would
    have bought nothing and cost the thing this repository values most — 49 contract tests assert on
    these hand-offs as source text, and context makes a hand-off invisible to all of them.

    Two things nearly made it look like drilling, and both dissolved on reading rather than counting:
    `viewerOnlyMode` appears in `ScreenTabs` only inside a CAPTURE CITATION, not as a prop; and
    `ScreenPane` renders `ScreenZoomControls` without forwarding either shared gate — it passes a
    locally derived `showZoomCtrlDetached` instead.

    So the note stands, now with a measurement behind it instead of an argument. The condition to
    watch is unchanged and is worth restating precisely: not "a component has many props", but
    "a prop is forwarded by a child it was given to".

    ## What moved INTO this component, and why that is a reduction rather than a relocation

    `showPMToolbar` was page state read and written by nothing outside this markup. State whose only
    reader is one component belongs to that component; leaving it on the page kept a flag in a
    13,000-line file for the benefit of a gear icon.
  */

  /** One conversation in the tab strip, as `getAllPCLogs` fills it. */
  export interface PrivateChatTab {
    name: string;
    uid: number;
    avt: string;
    pic: string;
    unread: number;
    isA: boolean;
    online: boolean;
  }

  /**
   * One rendered row.
   *
   * Declared structurally rather than imported from `#lib/server/private-chat.js`, so a client
   * component does not reach into a server-only module for a shape. The five fields are what the
   * markup reads: `_id` is the each block's key, `isA` styles the presenter's name, `n` is the
   * name, `t` the timestamp and `txt` the body.
   *
   * The each block is described rather than quoted, deliberately. This repository forbids template
   * syntax inside a comment — prose to a human, an unclosed block to a parser — and the rule was
   * earned by exactly that shipping green.
   */
  export interface PrivateChatRow {
    _id: string;
    isA?: boolean;
    n: string;
    t: number;
    txt: string;
  }

  interface Props {
    /** `display: block` when open — the capture keeps the panel mounted and hides it. */
    open: boolean;
    doNotDisturb: boolean;
    isPresenter: boolean;
    /** The peer whose tab is pinned in the header, or null when none is selected. */
    peer: { pic: string; nick: string } | null;
    tabs: PrivateChatTab[];
    /** Which conversation is open. Null renders "No active chat" rather than an empty thread. */
    currentUserId: number | null;
    log: PrivateChatRow[];
    /** True while a search term is in force, which hides Load More — a filtered log is not a paged one. */
    searching: boolean;
    searchTerm: string;
    draft: string;
    /** A short local time against each row, as `app-st-compactmessage` shows it. */
    onclosepeer: () => void;
    ondeletethis: () => void;
    onclose: () => void;
    onsearch: (term: string) => void;
    ondonotdisturb: () => void;
    ondownload: () => void;
    onswitchuser: (uid: number) => void;
    onloadmore: (uid: number, page: number) => void;
    onsend: () => void;
  }

  let {
    open,
    doNotDisturb,
    isPresenter,
    peer,
    tabs,
    currentUserId,
    log,
    searching,
    searchTerm = $bindable(),
    draft = $bindable(),
    onclosepeer,
    ondeletethis,
    onclose,
    onsearch,
    ondonotdisturb,
    ondownload,
    onswitchuser,
    onloadmore,
    onsend
  }: Props = $props();

  /*
    `O(14, o.showPMToolbar ? 14 : -1)` — the gear's own strip, inside `.bs-component`.

    Component-local because nothing outside this markup ever read or wrote it. Moving it here is the
    part of the extraction that removes a line rather than relocating one.
  */
  let toolbarOpen = $state(false);

  /** The page size `getAllPCLogs` answers with; Load More asks for the next multiple of it. */
  const PAGE_SIZE = 50;
</script>

<!--
  Draggable and resizable, exactly as the capture sets it up:

    un("#privaChatCompHolder")
      .draggable({ appendTo:"body", containment:".wrapper", cursor:"move", scroll:!1, snap:!0,
                   cancel:".privChatScroller, .textSendDiv, #pmSearchTermTxt" })
      .resizable({ handles:"n, e, s, w, ne, se, sw, nw",
                   maxWidth: un(".wrapper").width(), maxHeight: un(".wrapper").height() })

  The `cancel` list is what keeps the panel usable: without it, scrolling the conversation or
  selecting text in the composer would pick the whole panel up and move it.
-->
<app-privchat
  id="privaChatCompHolder"
  class="privChatHolder"
  style={open ? 'display: block;' : undefined}
  {@attach panelDragResize({
    containment: '.wrapper',
    cancel: '.privChatScroller, .textSendDiv, #pmSearchTermTxt',
    handles: 'n, e, s, w, ne, se, sw, nw',
    snap: true
  })}
>
  <div class="chat d-flex flex-column h-100" style="overflow-y: hidden;">
    <div class="bs-component">
      <nav class="navbar navbar-expand-lg navbar-light bg-light chat-nav-pm p-1 text-white">
        <!-- svelte-ignore a11y_missing_attribute -->
        <a class="navbar-brand ml-1 mr-1"
          ><i class="fas fa-comments"></i>
          {#if doNotDisturb}
            <span class="badge badge-danger ml-2"><i class="fas fa-bell-slash"></i> DND</span>
          {/if}</a
        >
        {#if peer}
          <ul
            role="tablist"
            class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs"
          >
            <li class="nav-item">
              <!-- svelte-ignore a11y_missing_attribute -->
              <a data-bs-toggle="tab" role="tab" class="nav-link active">
                <img alt="user.name" class="avatarImg avatarImg-active" src={peer.pic} />
                {peer.nick}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                  class="close-tab"
                  onclick={(event) => {
                    event.stopPropagation();
                    onclosepeer();
                  }}
                >
                  <i class="mx-1 fas fa-times"></i>
                </span>
              </a>
            </li>
          </ul>
        {/if}
        <ul class="nav ml-auto flex-nowrap align-items-center">
          {#if peer && isPresenter}
            <li class="nav-item mr-2">
              <!-- svelte-ignore a11y_missing_attribute -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <a
                class="btn btn-outline-secondary btn-sm text-light border-0"
                onclick={ondeletethis}
              >
                <i class="fas fa-trash"></i> This
              </a>
            </li>
          {/if}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li
            class="nav-item dropdown"
            style="position: static;"
            onclick={() => (toolbarOpen = !toolbarOpen)}
          >
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <!-- svelte-ignore a11y_missing_attribute -->
            <a aria-haspopup="true" aria-expanded="false" class="nav-link dropdown-toggle p-0">
              <i title="Settings" class="fas fa-cog chat-header-gear"></i>
            </a>
          </li>
          <li class="nav-item ml-2 mr-2">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <i class="fas fa-times" onclick={onclose}></i>
          </li>
        </ul>
      </nav>
      {#if toolbarOpen}
        <div
          class="shadow p-2 w-100 border-top border-secondary pmToolbar"
          style="margin-top: 0px;"
        >
          <form
            id="chat-settings"
            class="w-100"
            onsubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div>
              <div class="form-group">
                <div class="input-group">
                  <input
                    type="text"
                    name="pmSearchTermTxt"
                    id="pmSearchTermTxt"
                    placeholder="Type your search term, then press Enter"
                    aria-label="Search"
                    aria-describedby="addon-search"
                    title="Type your search term, then press Enter"
                    class="form-control"
                    bind:value={searchTerm}
                    onkeydown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      onsearch(event.currentTarget.value);
                    }}
                  />
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <span
                    id="addon-chat-clear"
                    title="Clear the search"
                    class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex input-group-text"
                    onclick={() => onsearch('')}
                  >
                    <i class="fas fa-times"></i>
                  </span>
                </div>
              </div>
            </div>
          </form>
          <li class="d-inline mr-2">
            <!-- svelte-ignore a11y_missing_attribute -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a class="btn btn-outline-light btn-sm text-light" onclick={ondonotdisturb}
              ><i class="fas fa-bell-slash"></i> Don't Disturb</a
            >
            <!-- svelte-ignore a11y_missing_attribute -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <a class="btn btn-outline-info btn-sm text-light mx-1" onclick={ondownload}
              ><i class="fas fa-download"></i> Download Log</a
            >
          </li>
        </div>
      {/if}
    </div>
    <div class="d-flex h-100 pc-body">
      {#if tabs.length > 0}
        <!--
          One row per conversation - `getAllPCLogs` fills this. The row markup is the capture's
          `tEe`: a `list-group-item` carrying a status dot, the avatar and the name, with
          `pc-active` on the open one.
        -->
        <div class="list-group pc-list">
          {#each tabs as tab (tab.uid)}
            <button
              type="button"
              aria-current={currentUserId === tab.uid}
              class={[
                'list-group-item list-group-item-light d-flex align-items-center justify-content-between px-1',
                { 'pc-active': currentUserId === tab.uid }
              ]}
              onclick={() => onswitchuser(tab.uid)}
            >
              <span class="user-status-container">
                <span class={['badge user-status-type', { 'bg-success': tab.online }]}>&nbsp;</span>
                <img alt="t.avt" class="avatarImg" src={tab.pic} />
                <span class="pc-username ms-1">{tab.name}</span>
              </span>
              {#if tab.unread > 0}
                <span class="badge privchatUnread">{tab.unread}</span>
              {/if}
            </button>
          {/each}
        </div>
        <div class="pc-logs">
          {#if currentUserId === null}
            <div class="flex-fill p-3 text-center">No active chat</div>
          {:else}
            <!--
              `app-privchatscroller`: `.pc-messages` scrolls, with a Load More badge above the
              rows while `hasMoreData && !searchTerm`. Rows are `app-st-compactmessage` with
              `logType="pc"`.
            -->
            <app-privchatscroller class="privChatScroller">
              <div class="pc-messages">
                {#if log.length >= PAGE_SIZE && !searching}
                  <div class="text-center">
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span
                      class="badge badge-warning"
                      onclick={() =>
                        currentUserId !== null &&
                        onloadmore(currentUserId, Math.floor(log.length / PAGE_SIZE))}
                    >
                      Load More</span
                    >
                  </div>
                {/if}
                {#each log as message (message._id)}
                  <CompactMessageRow {message} />
                {/each}
              </div>
            </app-privchatscroller>
            <!--
              `#textAreaTxtPM`. Enter sends, Shift+Enter and Alt+Enter insert a newline -
              `onKey(e)` in the capture, which calls `preventDefault()` on 13 either way.
            -->
            <div class="d-flex align-items-center textSendDiv" id="textAreaHolderPM">
              <textarea
                id="textAreaTxtPM"
                class="txt-area w-100"
                rows="1"
                placeholder="Type your message here.."
                bind:value={draft}
                onkeydown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  if (event.shiftKey || event.altKey) {
                    draft += '\n';
                    return;
                  }
                  onsend();
                }}></textarea>
            </div>
          {/if}
        </div>
      {:else}
        <div class="flex-fill p-3 text-center">No active chat</div>
      {/if}
    </div>
  </div>
</app-privchat>
