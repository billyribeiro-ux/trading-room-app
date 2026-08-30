<script lang="ts">
  /**
   * The two reaction-notice checkboxes on the user-settings modal's App tab — USM-08 and USM-09.
   *
   * ## Why a component
   *
   * `source-size-contract.test.ts`: `ModalHost.svelte` is capped, ceilings there only go DOWN, and
   * three reaction rows landed in it at once. The slice is real — these two share one gate apiece,
   * one consumer, and nothing at all with the alert-sound boxes they sat beside.
   *
   * ## What they are for
   *
   * `#lib/room/reaction-notices.ts` raises the toasts and `#lib/reaction-arrivals.ts` notices the
   * reaction; both headers carry the byte offsets and the reason this room cannot read a reaction
   * off the frame the way the reference does.
   */
  interface Props {
    /** `sessData.enableReactions` — `O(116, … ? 116 : -1)` at byte 2,285,066. */
    enableReactions: boolean;
    /** `sessData.enableQAReactions` — `O(117, … ? 117 : -1)` at byte 2,285,130. */
    enableQaReactions: boolean;
    /** The modal's own map, so the two halves of a checkbox cannot disagree about its state. */
    settingChecks: Record<string, boolean>;
    /** `updateSettingCheck`, which is where the id -> preference mapping lives. */
    onchange: (event: Event) => void;
  }

  const { enableReactions, enableQaReactions, settingChecks, onchange }: Props = $props();

  /*
    The same attachment `ModalHost` uses, and a copy rather than a shared import: it is four lines
    and its only reason to exist is that `bind:checked` on a checkbox whose state lives in a plain
    `Record` would make the record the loser of every race with the DOM. Sharing it would mean a
    module for a closure.
  */
  function setInputChecked(checked: boolean) {
    return (node: HTMLInputElement) => {
      node.checked = checked;
    };
  }
</script>

<!--
  USM-08 and USM-09 — `app-reactions-popup` (byte 2,269,041) and `app-reactions-popup-qa`
  (2,269,235), each behind the ROOM setting that turns its feature on:
  `O(116, sessData.enableReactions ? 116 : -1)` and
  `O(117, sessData.enableQAReactions ? 117 : -1)` at bytes 2,285,066 and 2,285,130.

  The gates are the point of the pair: a room with reactions switched off has nothing for
  these to silence, and drawing them would be two more controls whose only effect is their
  own label. `#lib/reaction-arrivals.ts` is the consumer, and its header records why the
  notification is derived from two page loads rather than read off the frame.
-->
{#if enableReactions}
  <div class="p-2 text-mode-box">
    <div id="appReactionsPopup" title="Reactions Response" class="pb-2">
      <i class="fas fa-face-smile"></i>
      <span class="pl-2">Reactions Response:</span>
    </div>
    <div class="ml-5">
      <input
        type="checkbox"
        name="app-reactions-popup"
        value="Do not disturb"
        id="app-reactions-popup"
        class="form-check-input"
        {@attach setInputChecked(settingChecks['app-reactions-popup'])}
        {onchange}
      />
      <label for="app-reactions-popup" class="form-check-label"
        >Reactions Response
        <span>{settingChecks['app-reactions-popup'] ? 'on' : 'off'}</span></label
      >
    </div>
  </div>
{/if}
{#if enableQaReactions}
  <div class="p-2 text-mode-box">
    <div id="appReactionsPopupQa" title="Reactions QA Response" class="pb-2">
      <i class="fas fa-face-smile"></i>
      <span class="pl-2">Reactions QA Response:</span>
    </div>
    <div class="ml-5">
      <input
        type="checkbox"
        name="app-reactions-popup-qa"
        value="Do not disturb"
        id="app-reactions-popup-qa"
        class="form-check-input"
        {@attach setInputChecked(settingChecks['app-reactions-popup-qa'])}
        {onchange}
      />
      <label for="app-reactions-popup-qa" class="form-check-label"
        >Reactions QA Response
        <span>{settingChecks['app-reactions-popup-qa'] ? 'on' : 'off'}</span></label
      >
    </div>
  </div>
{/if}
