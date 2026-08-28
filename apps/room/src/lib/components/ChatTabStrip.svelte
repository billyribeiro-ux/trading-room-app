<script lang="ts">
  import { chatTabLabel } from '#lib/chat-tabs.js';

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
   */
  let {
    /** The names, in the order the server decided. Built-ins first, then the badge channels. */
    tabs,
    /** Which one is open. `$bindable` because both call sites own the value on a state class. */
    active = $bindable<string>(),
    /** Raised after `active` is set, for a caller that has to do more than remember the choice. */
    onselect
  }: {
    tabs: readonly string[];
    active: string;
    onselect?: (tab: string) => void;
  } = $props();
</script>

<ul role="tablist" class="nav nav-tabs flex-wrap flex-grow-1 justify-content-center chatTabs">
  {#each tabs as tab (tab)}
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
        }}>{chatTabLabel(tab)}</a
      >
    </li>
  {/each}
</ul>
