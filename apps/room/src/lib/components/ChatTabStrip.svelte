<script lang="ts">
  import { chatTabLabel } from '#lib/chat-tabs.js';
  import { unreadFor, type ChatTabUnreadCounts } from '#lib/room/chat-tab-unread.js';

  /**
   * `chatTabs` — the channel strip above a chat column.
   *
   * ## Why it is a component now
   *
   * It was the same nine lines of markup twice, once in `AlertChatArea.svelte` and once in
   * `ExtraChatPane.svelte`, with the two channels WRITTEN OUT as two `<li>` blocks apiece. That was
   * defensible while every room had exactly those two: four blocks, no logic, no drift possible.
   *
   * `chatTabsWithBadges` ends it. The list is per room and per member now — an owner configures
   * extra channels behind badges and the SERVER decides which of them each member gets — so both
   * strips have to loop, and two loops over one list is one loop too many. `dump-contract.ts` pins
   * the captured labels (`Main Chat`, `Off Topic`) and this is the one place that renders them.
   *
   * ## The markup is the capture's, unchanged
   *
   * `nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs` on the list,
   * `nav-item` / `nav-link` on each entry, `data-bs-toggle="tab"` and `role="tab"` on the anchor.
   * The only thing that moved is where the entries come from.
   *
   * ## The badge, and the one place the two columns differ upstream
   *
   * `acA-06`. `app-chat` interpolates `Ne("", unreadMsgs[name], " ")` and `app-extra-chat`
   * `Ne(" ", unreadMsgs[name], " ")` (bytes 1,421,108 and 2,367,759) — a leading space in one and
   * not the other, and the label beside it is `Ze(displayName)` in one and `Ne("", displayName, " ")`
   * in the other. That is the whole difference between the two strips, and it is whitespace inside
   * an inline-flex pill. One component renders both rather than two transcriptions drifting apart
   * over a space; recorded here so nobody re-derives the difference and forks the file for it.
   */
  let {
    /** The names, in the order the server decided. Built-ins first, then the badge channels. */
    tabs,
    /** Which one is open. `$bindable` because both call sites own the value on a state class. */
    active = $bindable<string>(),
    /** Raised after `active` is set, for a caller that has to do more than remember the choice. */
    onselect,
    /**
     * `acA-06` — this COLUMN's unread counts, keyed by channel.
     *
     * Handed in rather than read from a store, because the two columns have separate maps and a
     * component that reached for one of them would be the thing that picks. Defaulted so the many
     * constructions that render a strip without a live room need not wire it.
     */
    unread = {}
  }: {
    tabs: readonly string[];
    active: string;
    onselect?: (tab: string) => void;
    unread?: ChatTabUnreadCounts;
  } = $props();
</script>

<!--
  `acA-11`, second half — `O(7, o.chatTabs.length ? 7 : -1)` at byte 1,453,947 suppresses the WHOLE
  `<ul>` when there are no tabs. This emitted the styled list unconditionally, so a room with no
  channels configured drew an empty `nav nav-tabs` strip in the header: padding, a border and
  nothing in it.

  The first half is in `AlertChatArea.svelte`, where the brand grows its `&nbsp;Chat` label in
  exactly that case — the two are one behaviour and neither reads right alone.
-->
{#if tabs.length > 0}
  <ul role="tablist" class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs">
    {#each tabs as tab (tab)}
      {const counts = $derived(unreadFor(unread, tab))}
      <li class="nav-item">
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_missing_attribute -->
        <a
          data-bs-toggle="tab"
          role="tab"
          class={['nav-link', { active: active === tab }]}
          onclick={() => {
            active = tab;
            onselect?.(tab);
          }}
          >{chatTabLabel(
            tab
          )}<!--
            `O(3, unreadMsgs[name] || unreadMentions[name] ? 3 : -1)` inside `z_e`, byte 1,421,206 —
            the pill appears only when there is something in it, so a quiet channel's tab is the bare
            label the strip has always drawn.
          -->{#if counts.messages || counts.mentions}<span
              class="badge badge-pill badge-warning ml-1 counterBadge"
              >{counts.messages}
              <!--
                The `(n)` is the reference's `H_e`, `[1,"text-danger"]`, and it is presenter-only —
                stated ONCE, where the count is taken (`RoomChat.chatArrived`). A non-presenter's
                map never gains a mention, so this reads as the count rather than as a second gate on
                the role.
              -->{#if counts.mentions}<span
                  class="text-danger">({counts.mentions})</span
                >{/if}</span
            >{/if}</a
        >
      </li>
    {/each}
  </ul>
{/if}
