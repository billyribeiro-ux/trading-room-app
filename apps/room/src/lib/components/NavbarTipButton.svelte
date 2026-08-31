<script lang="ts">
  /*
    RS-09 — the NAVBAR's tip button, which is the reference's SECOND copy of the same feature.

    ## Why it is a file of its own

    Extracted out of `RoomNavbar.svelte` on 2026-08-31, in the change that added `NAV-02` and
    `NAV-04`: the bar was at its declared ceiling, and `source-size-contract.test.ts` only ever moves
    a ceiling down. A seam was needed and this is the cleanest one in the file — the item reads one
    resolved value and raises one window, and nothing else in the bar reads `tip`.

    ```js
    function APe(t,n){ … d(0,"li",139), x("click", () => doTipToUser()),
                         d(1,"a",140), T(2,"i",35), d(3,"span",36), v(4) …
                       xn("title", sessData.tipMeBtnTxt), Ze(sessData.tipMeBtnTxt) }
    O(14, e.isTipEnabled ? 14 : -1)          // byte 2,487,938, immediately before Benzinga
    139 [1,"nav-item",3,"click","title"]
    140 [1,"d-flex","align-items-center","btn","btn-primary","btn-sm"]
    35  [1,"fas","fa-dollar-sign"]
    36  [1,"ms-1"]
    ```

    `aPe` (byte 2,466,601) is the SIDEBAR's copy and this room has it; this is the navbar's, and
    `tip-button.ts` was written expecting both — its own docblock says *"the two call sites read
    `tip.visible`"* while only one existed. The label is bound to the `title` AND to the text, which
    is upstream's doubling on both copies.

    The `<li>` carries the click here where the sidebar's `<button>` does, so the whole item is the
    target rather than the button inside it. That is const 139's `3,"click"` and not a choice;
    `role`/`tabindex`/`onkeydown` are ours, for the reason every other captured
    click-on-a-non-control in the bar carries them.

    ## `noopener,noreferrer` is OURS, deliberately

    `doTipToUser(){ sessData.tipMeBtnUrl && window.open(sessData.tipMeBtnUrl, "_blank") }` at byte
    2,531,860 — two arguments, so the opened page keeps a live `window.opener` handle back into the
    room. That is a tabnabbing surface on a URL an owner types into a settings field, and it is not
    reproduced. The sidebar's copy answers it the same way.
  */
  import type { TipButton } from '#lib/tip-button.js';

  let { tip }: { tip: TipButton } = $props();
</script>

{#if tip.visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <li
    class="nav-item"
    title={tip.label}
    onclick={() => window.open(tip.url, '_blank', 'noopener,noreferrer')}
  >
    <!-- svelte-ignore a11y_missing_attribute -->
    <a class="d-flex align-items-center btn btn-primary btn-sm">
      <i class="fas fa-dollar-sign"></i><span class="ms-1">{tip.label}</span>
    </a>
  </li>
{/if}
