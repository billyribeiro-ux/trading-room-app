<script lang="ts">
  /*
    `.mod-msg-container` — a bar ONLY THE PRESENTER SEES, above the presentation area.

    ## The transcription, verbatim

    Template function `$4e` at bundle byte 2,492,174, with its consts resolved from the component's
    own `consts:` array at 2,533,190:

        213  ['animated', 'fadeIn', 'mod-msg-container']
        216  ['text-danger', 'd-flex', 'align-items-center', 'justify-content-between']
        217  ['mod-msg-btn', 3, 'click']
        218  ['fas', 'fa-times', 'text-warning']
        219  ['text-warning', 'mod-msg']

        <div class="animated fadeIn mod-msg-container">
          <h5 class="text-danger d-flex align-items-center justify-content-between">
            Moderator Message (only you see this message):
            <span class="mod-msg-btn" (click)="closeModMessage()">
              <i class="fas fa-times text-warning"></i>
            </span>
          </h5>
          <div class="text-warning mod-msg">{{ modMessage }}</div>
        </div>

    The gate is `O(2, e.modMessage && globals.isPresenter ? 2 : -1)` (byte 2,493,284), and the value
    is `this.modMessage = sessData.modMessage` (2,498,699). The parenthetical in the heading is the
    capture's own and is transcribed rather than paraphrased: it is what tells a presenter the bar is
    not visible to the room.

    ## The dismissal is LOCAL, and that is reproduced rather than improved

    `closeModMessage() { this.modMessage = "" }` (byte 2,532,005) clears the component's own field
    and writes nothing back, so the bar returns on the next load. Persisting it would need a
    preference the reference does not have, and inventing one would be inventing a decision. The
    state lives here rather than on the page for the same reason it lives on the component upstream:
    nothing else reads it.

    ## Its classes have somewhere to land

    All three carry real rules in `captured-runtime-components.css` — `.mod-msg-container` at 4158,
    `.mod-msg-btn` at 4202 with its `:hover` at 4239. A fact about these three, never the test for
    whether a surface is built: USM-18's class fails it and is transcribed regardless.
  */
  interface Props {
    /** `sessData.modMessage`. Empty or absent means no bar, which is the common case. */
    message: string;
    /** The ROLE. A member never sees this bar, whatever the room configured. */
    isPresenter: boolean;
  }

  let { message, isPresenter }: Props = $props();

  /*
    Dismissed for this page only. `$state` and not a preference: see the header — the reference
    clears its own field and persists nothing, so the bar comes back on the next load.
  */
  let dismissed = $state(false);
</script>

{#if message && isPresenter && !dismissed}
  <div class="animated fadeIn mod-msg-container">
    <h5 class="text-danger d-flex align-items-center justify-content-between">
      Moderator Message (only you see this message):
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="mod-msg-btn" onclick={() => (dismissed = true)}>
        <i class="fas fa-times text-warning"></i>
      </span>
    </h5>
    <div class="text-warning mod-msg">{message}</div>
  </div>
{/if}
