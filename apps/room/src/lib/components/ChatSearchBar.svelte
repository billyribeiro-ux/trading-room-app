<script lang="ts">
  import type { ChatColumn } from '#lib/room/chat-search.svelte.js';

  /**
   * `chatToolbar` — the search bar under a chat column's header.
   *
   * ## Transcribed, and from two identical const tables
   *
   * The main column's is at bundle byte 1,449,203 and the extra column's at 2,395,378, and they are
   * byte-identical through the whole bar:
   *
   * ```js
   * [1,"shadow","p-2","w-100","chatToolbar",2,"margin-top","0px"]
   * ["id","chat-settings",1,"w-100",3,"change","keydown.enter"]
   * ["type","text","name","chatSearchTermTxt","placeholder","Type your search term, then press Enter",
   *  "aria-label","Search","aria-describedby","addon-search","title","Type your search term, then press Enter",
   *  1,"form-control",3,"ngModelChange","ngModel"]
   * ["id","addon-chat-clear","title","Clear the search",1,"btn","btn-outline-secondary","pl-2","pr-2",
   *  "d-inline-flex","clear-chat-input","input-group-text",3,"click"]
   * ```
   *
   * That is why this is ONE component rather than a copy in each pane. It went in twice first, and
   * the size contract refused the second copy — correctly: two hand-maintained transcriptions of the
   * same const table is how one of them loses an attribute and nobody notices, and this repository
   * has a gate for orphaned CSS precisely because that happened with a class name.
   *
   * `aria-describedby="addon-search"` points at an id nothing defines — the clear button is
   * `addon-chat-clear`. **The dangling reference is the capture's** and is reproduced rather than
   * quietly repaired, exactly as the alerts column's field reproduces the same one and records why.
   *
   * ## The extended section, and the one id that is deliberately not the capture's
   *
   * The bar has two states upstream — search-only, and extended with the controls under it. The
   * extended section was not rendered here at all while none of its controls existed. `acA-04` built
   * the first: **Mod Only**, `X_e` at byte **1,423,104**, whose const table is
   *
   * ```js
   * 43 ["placement","top","ngbTooltip","Show only Moderators messages",
   *     1,"form-check","text-white","d-inline-block","m-1","mt-2"]
   * 44 ["type","checkbox","id","mod-only",1,"form-check-input",3,"ngModelChange","change","ngModel"]
   * 45 ["for","mod-only",1,"form-check-label"]                                     (byte 1,450,283)
   * ```
   *
   * transcribed below with ONE change: the id carries the column. `"mod-only"` occurs four times in
   * the bundle — twice for `app-chat` and twice for `app-extra-chat` (1,450,283 and 2,396,458) — so
   * a room with both bars open ships two elements with one id, and the extra column's `<label for>`
   * then operates the main column's checkbox. That is a functional break rather than a cosmetic one,
   * and it is the reason this is a divergence rather than a faithful copy. The two halves stay in
   * step because ONE expression builds both.
   *
   * ## `ACA-06` — what is still not built, named CORRECTLY this time
   *
   * This paragraph used to read: *"The save-chat and archive controls beside it (`Y_e` and `Q_e`,
   * nodes 4 and 5 of `X_e`) are separate features and are still not built."* **Four names and one
   * byte offset were wrong**, and the sentence is the one a reader uses to decide which sub-template
   * holds what — so it pointed the next person at the wrong two functions in the wrong slot.
   *
   * Decoded by value on 2026-08-31, every offset opened and read:
   *
   * ```js
   * function q_e  // 1,421,800  div const 41 — click archiveOptions()          Archive Chat Messages
   * function K_e  // 1,421,929  span const 38 — click downloadLog("chat")      Save chat messages
   * function Y_e  // 1,422,202  div const 46, button const 48 " Group Chat Control "
   * function Q_e  // 1,422,956  button const 53 — click detachChat()           " Detach Chat"
   * function X_e  // 1,423,104  the Mod Only checkbox, plus Y_e and Q_e as nodes 4 and 5
   * function J_e  // 1,423,745  the bar itself; K_e/q_e hang off it at node 9
   * ```
   *
   * So `Y_e` and `Q_e` are the **Group Chat Control dropdown** and the **Detach Chat button**, and
   * the save/archive pair is `K_e`/`q_e` at node **9 of `J_e`** — a different slot entirely. The
   * extended state is TWO independent slots, not one: `O(9, showChatToolbarExtended ? 9 : -1)`
   * inside the input group and `O(10, showChatToolbarExtended ? 10 : -1)` beneath it.
   *
   * None of the four is built. Nothing stands in for them, which is deliberate: an empty toolbar
   * section is a control whose only effect is its own presence.
   *
   * **The two columns differ, and that decides where three of them belong.** `app-extra-chat`'s
   * extended section (`Q3e`, byte 2,369,619) carries Mod Only and Group Chat Control and STOPS —
   * there is no Detach Chat. The const tables agree: `app-chat` carries three entries
   * `app-extra-chat` does not (47 and 53, the two forms of the Detach button, and 54, its
   * `fa-window-restore` icon), which is exactly the offset by which every const from 48 onward
   * shifts between the two tables. Detach Chat belongs to the main column alone.
   */
  type Props = {
    /** What is typed. A value plus a handler, not a binding — see `oninput`. */
    term: string;
    /**
     * Every keystroke, because emptying the box ENDS the search with no submit
     * (`searchTermChanged(e) { e || this.clearSearchTerm() }`, byte 1,439,050). A two-way binding
     * would let a caller assign the term while skipping the rule that goes with it.
     */
    oninput: (value: string) => void;
    /** Enter, or the form's submit. */
    onsubmit: () => void;
    /** The `×`. */
    onclear: () => void;
    /**
     * Which column this bar belongs to. Read for ONE thing — the checkbox's id — and taken as the
     * column rather than as a raw id string so no call site can invent a third one.
     */
    column: ChatColumn;
    /** `showChatToolbarExtended` for this column. The controls below the field appear with it. */
    extended: boolean;
    /** `filterChatMsgs.modOnly` / `.modOnlyExtra` for this column. */
    modOnly: boolean;
    /** The checkbox. A value plus a handler, for the reason `oninput` is one. */
    onmodonly: (next: boolean) => void;
  };

  let { term, oninput, onsubmit, onclear, column, extended, modOnly, onmodonly }: Props = $props();

  /** `mod-only` in the main column, `mod-only-extra` in the extra one. See the docblock. */
  const modOnlyId = $derived(column === 'extra' ? 'mod-only-extra' : 'mod-only');
</script>

<div class="shadow p-2 w-100 chatToolbar" style="margin-top: 0px;">
  <form
    novalidate
    id="chat-settings"
    class="w-100"
    onsubmit={(event) => {
      event.preventDefault();
      onsubmit();
    }}
  >
    <div>
      <div class="form-group m-0">
        <div class="input-group">
          <input
            type="text"
            name="chatSearchTermTxt"
            placeholder="Type your search term, then press Enter"
            aria-label="Search"
            aria-describedby="addon-search"
            title="Type your search term, then press Enter"
            class="form-control"
            value={term}
            oninput={(event) => oninput(event.currentTarget.value)}
          /><!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span
            id="addon-chat-clear"
            title="Clear the search"
            class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex clear-chat-input input-group-text"
            onclick={onclear}><i class="fas fa-times"></i></span
          >
        </div>
      </div>
    </div>
    <!--
      `H(10, X_e, 6, 3)` inside `J_e`, gated `O(10, e.showChatToolbarExtended ? 10 : -1)` at byte
      1,424,325 — the controls live under the field and appear only in the extended state.
    -->
    {#if extended}
      <div
        title="Show only Moderators messages"
        class="form-check text-white d-inline-block m-1 mt-2"
      >
        <input
          type="checkbox"
          id={modOnlyId}
          class="form-check-input"
          checked={modOnly}
          onchange={(event) => onmodonly(event.currentTarget.checked)}
        />
        <label for={modOnlyId} class="form-check-label"> Mod Only </label>
      </div>
    {/if}
  </form>
</div>
