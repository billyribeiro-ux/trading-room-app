<script lang="ts">
  /**
   * THE CLOSE-SESSION PANE of the session-control modal.
   *
   * ## Why it is a component
   *
   * `ModalHost.svelte` is the largest file in this repository and `PHASE-5-DECOMPOSITION.md` names a
   * pane as the unit to break it into. This one earned the move by growing: the close message it
   * hosts had no storage, no command and no reader until 2026-08-27, and wiring all three inside a
   * 6,000-line component pushed that file past its ceiling.
   *
   * It is also the natural boundary. Everything here concerns ONE question — what happens when the
   * presenter closes the room — and it needs four things, none of which is the modal's state.
   *
   * ## The editor's draft is LOCAL, deliberately
   *
   * A writable `$derived` rather than a two-way binding on the prop: the presenter types before they
   * save, and writing through on every keystroke would make the draft indistinguishable from what is
   * stored — so a presenter who typed and changed their mind would have no way back. It re-seeds when
   * a new value arrives from the load, which is what makes another presenter's save show up here.
   */
  let {
    /** Whether this tab is the visible one. The pane renders either way; Bootstrap hides it. */
    active,
    /** What members are told when the room is closed, as stored. The editor opens on this. */
    closedMessage = '',
    /** " Open Session " — a session action, still dispatched through the modal's one door. */
    onOpenSession,
    /**
     * Both SAVE buttons, as one receiver taking what they differ by.
     *
     * Two props would have been two chances to wire the save to only one of them, which is exactly
     * what was wrong until 2026-08-27: the closing button saved nothing, and the saving button
     * saved nothing either and said `Message Saved`.
     */
    onSave
  }: {
    active: boolean;
    closedMessage?: string;
    onOpenSession: () => void;
    onSave?: (message: string, then: 'close' | 'save-only') => void;
  } = $props();

  /*
    A WRITABLE `$derived`, which is exactly the rune this needs and not the pair it was written as.

    The first draft was `$state('')` plus an `$effect` assigning `closedMessage` into it — the shape
    this repository's own standard names as a mistake in as many words: *"`$effect` that assigns a
    value derived from other state → that is `$derived`"*. `svelte/prefer-writable-derived` caught it,
    which is the lint rule doing the job the rule was written for.

    Writable is the point: it re-seeds when the load brings a new value — another presenter's save
    shows up here — and the presenter can still type over it without the write going anywhere until
    they press a button.
  */
  let draft = $derived(closedMessage);
</script>

<div
  id="close-session"
  role="tabpanel"
  aria-labelledby="close-session-tab"
  class={['tab-pane fade', { show: active, active }]}
>
  <div class="d-flex justify-content-center">
    <button
      type="button"
      class="btn btn-outline-light mr-2 my-2"
      onclick={() => onSave?.(draft, 'close')}
    >
      <i class="fas fa-save"></i> Save Message and Close Session
    </button>
    <button
      type="button"
      class="btn btn-outline-light mr-2 my-2"
      onclick={() => onSave?.(draft, 'save-only')}
    >
      <i class="fas fa-save"></i> Just Save Close Message
    </button>
    <button type="button" class="btn btn-outline-light mr-2 my-2" onclick={() => onOpenSession()}>
      Open Session
    </button>
  </div>
  <!--
    THE CLOSE MESSAGE EDITOR. `#summernoteClosedMsg` is the reference's own element id — it
    hosts a Summernote rich-text editor bound to `closedTxt` at bundle byte 2154583 — and this
    rendered the literal string `undefined` inside it until 2026-08-27, which is what an
    interpolated `undefined` looks like once it reaches the DOM as text.

    A TEXTAREA, not a rich-text editor, and that is a recorded divergence rather than a
    shortcut: the message is delivered inside an HTTP error body by `closedRoomMessage`, and
    sending presenter-authored HTML down that path would be an injection surface bought for
    italics. Whoever restores the editor moves the display first.
  -->
  <label for="summernoteClosedMsg" class="d-block mt-2">
    What members see when this room is closed
  </label>
  <textarea
    id="summernoteClosedMsg"
    class="form-control"
    rows="4"
    maxlength="2000"
    bind:value={draft}></textarea>
</div>
