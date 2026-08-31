<script lang="ts">
  import type { ChatColumn } from '#lib/room/chat-search.svelte.js';
  import type { ChatMode } from '#lib/chat-mode.js';

  /**
   * `ACA-06` — the three dropdown items, in the reference's order and with its exact labels.
   *
   * A constant rather than three transcribed blocks: `Y_e` renders `li` const 50 three times with
   * the same shape and only the mode and the label differing, so writing it three times would be
   * three places for the label or the tick to drift. The ORDER is the capture's — `g`, `p`, `d`.
   */
  const CHAT_MODE_ITEMS = [
    { mode: 'g', label: 'Regular Group Chat' },
    { mode: 'p', label: 'Webinar Mode' },
    { mode: 'd', label: 'Disable Group Chat' }
  ] as const satisfies readonly { mode: ChatMode; label: string }[];

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
    /**
     * `ACA-06` — "Archive Chat Messages", `q_e` at byte 1,421,800.
     *
     * `div` const 41 `["id","addon-chat-archive","title","Archive Chat Messages",1,"btn",
     * "btn-outline-secondary","pl-2","pr-2","d-inline-flex","archive-alert-input",
     * "input-group-text",3,"click"]`, holding `i` const 42 `[1,"fas","fa-trash"]`, click
     * `archiveOptions()`.
     *
     * **Optional, and its presence IS the gate** — upstream's is
     * `O(2, isPresenter && !isLimitedPresenter ? 2 : -1)`, and this component is given neither flag
     * for the reason `ExtraChatPane` states for its own props: each entitlement's RESULT is decided
     * once by the page. A boolean beside a `() => void` would put one gate in two places.
     *
     * It sits INSIDE the input group, not in the section below — the bar has two independent
     * extended slots (`O(9, …)` and `O(10, …)`) and this is the first.
     */
    onarchive?: () => void;
    /**
     * `ACA-06` — the Group Chat Control dropdown, `Y_e` at byte 1,422,202.
     *
     * The room's current mode, which drives the tick: `ct(3|5|7, kw, "g"|"p"|"d" == chatMode)` with
     * `kw = t => ({ visible: t })` at byte 1,420,712 — so all three ticks are RENDERED and one is
     * made visible by a class, rather than one being rendered conditionally.
     */
    chatMode?: ChatMode;
    /**
     * The three items' click — `changeChatMode("g"|"p"|"d", event)`.
     *
     * Optional and gating the dropdown, upstream's being
     * `O(4, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 4)`. Note the shape: the
     * reference gates on `-1` for the NEGATIVE case, so the control shows for a presenter OR anyone
     * holding the mic, and hides for a limited presenter regardless. Resolved by the page.
     */
    onchatmode?: (mode: ChatMode) => void;
    /**
     * `ACA-06` — "Detach Chat", `Q_e` at byte 1,422,956. **Main column only.**
     *
     * `app-extra-chat`'s extended section (`Q3e`, byte 2,369,619) carries Mod Only and Group Chat
     * Control and STOPS. The const tables agree: `app-chat` carries three entries `app-extra-chat`
     * does not — 47 and 53, the two forms of this button, and 54, its `fa-window-restore` icon —
     * which is exactly the offset by which every const from 48 onward shifts between the two
     * tables. So this is not an oversight in the second column; the control belongs to the first.
     *
     * Optional, gating it, upstream's being `O(5, chatOnlyMode ? -1 : 5)` — a detached window does
     * not offer to detach again.
     */
    ondetach?: () => void;
  };

  let {
    term,
    oninput,
    onsubmit,
    onclear,
    column,
    extended,
    modOnly,
    onmodonly,
    onarchive,
    chatMode,
    onchatmode,
    ondetach
  }: Props = $props();

  /**
   * `ACA-06` — whether the Group Chat Control menu is open.
   *
   * COMPONENT-LOCAL, and deliberately not lifted: `data-bs-toggle="dropdown"` is the capture's
   * whole mechanism and it is inert here, so something has to hold the open state. Nothing outside
   * this bar reads it, and the two columns each own their own — a shared flag would open both
   * menus at once in a room with the second column on.
   */
  let chatModeMenuOpen = $state(false);

  /** `mod-only` in the main column, `mod-only-extra` in the extra one. See the docblock. */
  const modOnlyId = $derived(column === 'extra' ? 'mod-only-extra' : 'mod-only');

  /**
   * `addon-chat-archive` carries the column too, for the reason `mod-only` does.
   *
   * The capture emits the same id in both compiled copies, so a room with the second column open
   * would ship two elements with one id. Nothing here resolves anything by it — unlike `mod-only`,
   * whose `<label for>` genuinely operates the wrong checkbox — but a duplicate id is invalid HTML
   * either way, and the two divergences are the same divergence.
   */
  const archiveId = $derived(
    column === 'extra' ? 'addon-chat-archive-extra' : 'addon-chat-archive'
  );
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
          <!--
            `ACA-06` — THE BAR'S FIRST EXTENDED SLOT, and it is a different one from the section
            below.

            `H(9, K_e, 3, 1)` inside `J_e`, gated `O(9, showChatToolbarExtended ? 9 : -1)` at byte
            1,424,325 — the same flag as the section under the field, in a second independent slot
            INSIDE the input group. The docblock at the head of this file used to name these two
            controls as `Y_e`/`Q_e` in the OTHER slot; `ACA-06` corrected that, and this is where
            they actually live.

            The save button (`K_e`, const 38) is NOT built. It is the one of the four that is not
            blocked on scope: `downloadLog("chat")` at byte 1,415,703 opens a radio prompt over
            "Entire chat history" / "Last 24 hours" / "Last 7 days" and hands the answer to
            `downloadLogType`, which awaits `invokeServerCommand("getAllLog", {type, channel,
            limit})`. **There is no such command in this repository** — `getAllLog` returns zero
            hits across the app — so the button would open a dialog whose every option fails. The
            alerts column's twin exports the rows the page already holds; this one asks the server
            for history the page has never seen, which is why one is built and the other is not.
          -->
          {#if onarchive}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              id={archiveId}
              title="Archive Chat Messages"
              class="btn btn-outline-secondary pl-2 pr-2 d-inline-flex archive-alert-input input-group-text"
              onclick={onarchive}
            >
              <i class="fas fa-trash"></i>
            </div>
          {/if}
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
      <!--
        `ACA-06` — the Group Chat Control dropdown, `Y_e` at byte 1,422,202, const 46
        `[1,"dropdown","d-inline-block","m-1","group-chat-control"]`.

        `data-bs-toggle="dropdown"` is the capture's and is kept even though this room's dropdowns
        are not Bootstrap-driven — the same substitution the buffer-size menu and the extra column's
        YouTube button make. The menu is shown by the `show` class here, driven by local state,
        because there is no Bootstrap JavaScript to toggle it.

        **All three ticks are RENDERED and one is made visible by a class**, which is upstream's
        shape rather than a conditional: `ct(3|5|7, kw, "g"|"p"|"d" == chatMode)` with
        `kw = t => ({ visible: t })` at byte 1,420,712. Reproduced, because `.visible` is a real
        rule and a conditional `{#if}` would render a different DOM for the same state.
      -->
      {#if onchatmode}
        <div class="dropdown d-inline-block m-1 group-chat-control">
          <button
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded={chatModeMenuOpen}
            class="btn btn-secondary dropdown-toggle btn-sm"
            onclick={() => (chatModeMenuOpen = !chatModeMenuOpen)}>{' Group Chat Control '}</button
          >
          <ul class={chatModeMenuOpen ? 'dropdown-menu show' : 'dropdown-menu'}>
            {#each CHAT_MODE_ITEMS as item (item.mode)}
              <li>
                <!--
                  ONE DIVERGENCE, and it is the substitution this repository has already argued.

                  The capture puts the click on the `li` (const 50 is `[3,"click"]`) and the label
                  inside `a` const 51 `[1,"dropdown-item"]` — **an anchor with no `href` at all**.
                  That anchor is not focusable and not operable by keyboard, so upstream these three
                  items can only be reached with a pointer.

                  `<button class="dropdown-item">` is used instead, carrying the click. Bootstrap
                  supports both and styles them identically, so nothing renders differently — the
                  same trade `StreamingView`'s buffer menu records, and `ModalHost`'s restream
                  cross-link before it. The handler moves one node inward with it, because a click
                  on the `li` that a keyboard cannot originate is the half of the capture worth
                  losing.

                  `StreamTabs` keeps ITS anchor, and that is not an inconsistency: its const 57 is
                  `['href','#',1,'dropdown-item']`, which IS focusable. Different const, different
                  answer.
                -->
                <button
                  type="button"
                  class="dropdown-item"
                  onclick={() => {
                    chatModeMenuOpen = false;
                    onchatmode(item.mode);
                  }}
                  ><i class={['fas fa-check-square me-1', { visible: chatMode === item.mode }]}
                  ></i>{item.label}</button
                >
              </li>
            {/each}
          </ul>
        </div>
      {/if}
      <!--
        `ACA-06` — "Detach Chat", `Q_e` at byte 1,422,956, const 53
        `["title","Detach Chat",1,"btn","btn-outline-info","btn-sm","mx-1","mt-1",3,"click"]` over
        const 54 `[1,"fas","fa-window-restore"]`.

        MAIN COLUMN ONLY, and that is the const tables' own answer rather than a choice — see the
        prop. The handler's presence is the gate.
      -->
      {#if ondetach}
        <button
          type="button"
          title="Detach Chat"
          class="btn btn-outline-info btn-sm mx-1 mt-1"
          onclick={ondetach}><i class="fas fa-window-restore"></i>{' Detach Chat'}</button
        >
      {/if}
    {/if}
  </form>
</div>
