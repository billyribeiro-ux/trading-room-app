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
<!--
  ── TWO INVENTED HEADERS, DELETED 2026-09-01 — the inverse of every other finding this week ──────

  Both rows carried a header block this room made up:

      <div id="appReactionsPopup" title="Reactions Response" class="pb-2">
        <i class="fas fa-face-smile"></i><span class="pl-2">Reactions Response:</span>
      </div>

  and its `-Qa` twin. **`REe` and `NEe` are `d(0,"div",17)` and nothing else** — const 17 is
  `[1,"ml-5"]`, so the reference draws these two as bare rows among the siblings at
  `H(115,MEe,…)(116,REe,…)(117,NEe,…)(118,UEe,…)(119,HEe,…)`, with no header of any kind.

  Measured against the pinned bundle rather than eyeballed. Occurrences in its 2,891,205 bytes:

      appReactionsPopup       0
      fa-face-smile           0
      "Reactions Response:"   0          (with the colon — the header's text, not the label's)
      appDisableVideo         1          (the NEIGHBOURING group, which really does have one)

  The last line is why it looked right: this modal has twenty-odd section headers of exactly that
  icon-then-`span.pl-2` shape, `appDisableVideo` among them and immediately adjacent, and the pattern
  was carried across to two rows that do not have one.

  **And the icon rendered as nothing.** `fa-face-smile` is Font Awesome 6; this project ships
  `@fortawesome/fontawesome-free@5.8.1` (`apps/room/package.json:30`), where `grep -c fa-face-smile` over
  `css/all.min.css` returns **0** and the smile is `fa-smile`. So both headers drew an empty box
  beside a label duplicating the one on the checkbox below.

  The `p-2 text-mode-box` stays and IS ours: upstream has these rows inside a box their four
  siblings share, and four of those five live in `ModalHost.svelte` — a component cannot be a
  sibling inside a box its parent opened. Same trade `ViewerAlertPrefsPane.svelte` records for the
  positions row.
-->
{#if enableReactions}
  <div class="p-2 text-mode-box">
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
