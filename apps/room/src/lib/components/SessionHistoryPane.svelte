<script lang="ts">
  import { mediumDateFormatter } from '#lib/message-formatters.js';
  import { refusalMessage } from '#lib/refusal-message.js';
  import type { SessionHistoryEntry } from '#lib/server/session-history.js';
  import { getSessionHistory } from '../../routes/session-history.remote';

  /**
   * The session-control modal's Session History tab — SC-01.
   *
   * ## Why it is a component
   *
   * It was eighty-four lines of `ModalHost.svelte` plus thirty-six of state and one loader, and
   * `source-size-contract.test.ts` is what moved it: SC-14 and SC-17 added a gate and its evidence
   * to that file, ceilings there only go DOWN, and prose is never trimmed to hit a number. The
   * slice is a real one — this pane owns three pieces of state, one fetch and nothing else, and
   * none of its six tab neighbours touch any of them.
   *
   * ## What it was before
   *
   * `No session history.` rendered unconditionally above a `Load History` button with **no
   * `onclick` at all** — not a handler that did nothing, no handler. The pane said the same thing
   * whatever the room had done.
   */
  interface Props {
    /** Whether Session History is the selected tab — Bootstrap's `show active` pair. */
    active: boolean;
  }

  const { active }: Props = $props();

  /*
    The Session History pane's three pieces of state — `SC-01`.

    `$state.raw` on the list: it is replaced wholesale by every fetch and never mutated, so a deep
    proxy over it would be overhead on every row rendered.

    NOT loaded when the modal opens. Upstream's empty branch draws a `Load History` button, which
    only makes sense if the pane starts empty — the presenter asks. A fetch on open would make that
    button unreachable and would query on every open of a modal whose other six tabs are the common
    ones.
  */
  let sessionHistoryEntries = $state.raw<SessionHistoryEntry[]>([]);
  let sessionHistoryLoading = $state(false);
  let sessionHistoryError = $state<string | null>(null);

  /**
   * `fetchSessionHistory()` — byte 1,145,917, and both buttons call it.
   *
   * Upstream has no failure path at all: `i && i.data && (globals.sessionHistory = i.data)` leaves
   * the pane exactly as it was when the call fails, so a presenter clicking Refresh on a broken
   * connection sees nothing happen. Shown here instead, for the reason every refusal in this file is
   * shown: silence is indistinguishable from success.
   */
  async function loadSessionHistory() {
    if (sessionHistoryLoading) return;
    sessionHistoryLoading = true;
    sessionHistoryError = null;
    try {
      sessionHistoryEntries = await getSessionHistory();
    } catch (cause) {
      sessionHistoryError = refusalMessage(cause, 'Could not load the session history.');
    } finally {
      sessionHistoryLoading = false;
    }
  }
</script>

<div
  id="session-history"
  role="tabpanel"
  aria-labelledby="session-history-tab"
  class={['tab-pane fade', { show: active, active }]}
>
  <!--
  ── THE BUTTON HAD NO HANDLER AT ALL ─────────────────────────────────────────────────────

  Not a handler that did nothing — no `onclick`. `No session history.` was rendered
  unconditionally above it, so the pane said the same thing whatever the room had done.
  `SC-01`, and the exact shape `CLAUDE.md` names: a control whose only effect is nothing.

  Both of upstream's branches now, decoded with `app-session-control-modal`'s own consts
  table (119 = `[1,"list-group","text-dark"]`, 120 = `[1,"p-4","text-center"]`,
  121 = the `btn btn-primary`, 122 = `[1,"fas","fa","fa-sync"]`, 123 = the list-group item,
  124 = `[1,"d-flex","w-100","justify-content-between"]`, 125 = `[1,"mb-1"]`):

    EDe (empty)  "No session history." + a `Load History` button
    DDe (loaded) a `Refresh` button, then one `<a>` per entry: `<h5>` eventName,
                 `<small>` created through `date:'medium'`, `<p>` eventValue

  The `<a>` carries no `href` upstream and none here: it is a styled row, not a link, which
  is why it has no click of its own either. `aria-current="true"` is the capture's, on every
  row rather than on one — reproduced rather than corrected, because these strings are what a
  DOM diff compares.

  `mediumDateFormatter` already existed for the Files pane's uploaded-at column; Angular's
  `date:'medium'` is one format and this room resolves it in one place.
-->
  {#if sessionHistoryError}
    <div class="alert alert-danger m-4">{sessionHistoryError}</div>
  {/if}
  {#if sessionHistoryEntries.length === 0}
    <div class="p-4 text-center">No session history.</div>
    <div class="p-4 text-center">
      <button type="button" class="btn btn-primary" onclick={loadSessionHistory}
        ><i class="fas fa fa-sync"></i>
        {sessionHistoryLoading ? 'Loading…' : 'Load History'}
      </button>
    </div>
  {:else}
    <div class="list-group text-dark">
      <div class="p-4 text-center">
        <button type="button" class="btn btn-primary" onclick={loadSessionHistory}
          ><i class="fas fa fa-sync"></i>
          {sessionHistoryLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {#each sessionHistoryEntries as entry (entry.id)}
        <!--
        `<a>` with no `href`, which is the capture's own element and is why the warning is
        suppressed rather than fixed. The three alternatives are all worse:

          a `<div>`   changes the rendered DOM these class strings are diffed against, for
                      no behavioural gain — the element is inert upstream too;
          an `href`   invents a link that goes nowhere, which is the defect this repository
                      removes rather than adds;
          a `<button>` announces an action to a screen reader that does not exist.

        `list-group-item-action` is Bootstrap's hover/focus styling and the capture applies
        it here despite there being no action. Reproduced with the rest of the string.
      -->
        <!-- svelte-ignore a11y_missing_attribute -->
        <a
          aria-current="true"
          class="list-group-item list-group-item-action border-bottom border-top border-dark"
        >
          <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">{entry.eventName}</h5>
            <small>{mediumDateFormatter.format(new Date(entry.created))}</small>
          </div>
          <p class="mb-1">{entry.eventValue}</p>
        </a>
      {/each}
    </div>
  {/if}
</div>
