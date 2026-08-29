<script lang="ts">
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
   * ## Search only
   *
   * Upstream's bar has an extended state carrying save-chat and archive controls. Those are separate
   * features and are not built, so their container is not rendered: an empty toolbar section is a
   * control whose only effect is its own presence.
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
  };

  let { term, oninput, onsubmit, onclear }: Props = $props();
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
  </form>
</div>
