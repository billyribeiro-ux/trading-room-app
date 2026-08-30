<script lang="ts">
  import type { SavedPoll } from '#lib/types.js';

  /**
   * The Pre-Canned Polls list — one `<li>` per saved poll, with Delete and Load.
   *
   * The reference is `PTe`, bundle byte 2,101,467, the tracked body of
   * `ht(49, PTe, 8, 1, "li", 35, xTe)` inside the setup template `RTe`. Its consts are 35
   * (`list-group-item`), 39 (`float-right`), 40 (`btn btn-default btn-sm mr-2` + click), 41
   * (`fas fa-trash`) and 42 (`btn btn-primary btn-sm` + click), and every one of them is worn here.
   *
   * ## Why it is a component
   *
   * `PollPanel.svelte` sits at the ceiling `source-size-contract` holds it to and POLL-01 and
   * POLL-02 add to it, so the ratchet asks for an extraction rather than a raise. This is the seam
   * that was free: the panel's script, its pie geometry and its drag maths are pinned by exact-string
   * assertions in `poll-panel-contract.test.ts`, and this list is pinned by none.
   *
   * It is also the honest seam rather than merely the available one — upstream draws it from its own
   * tracked template, it reads one array and emits two intents, and it shares no state with the
   * panel's three modes.
   *
   * ## `deleteSavedPoll` and `loadSavedPoll` take the ROW, not its index
   *
   * Upstream both take `$index` into `savedPolls`, and this repository's `poll-09` row already
   * records why that shape did not cross: deletion here is by row id against a server table, not by
   * position in a JSON blob that is resent whole. So the callbacks take the poll, and the `{#each}`
   * is keyed by `poll.id` — a real identity, unlike the choice lists next door where position IS the
   * identity and the key is deliberately the index.
   */
  let {
    savedPolls,
    ondelete,
    onload
  }: {
    savedPolls: SavedPoll[];
    ondelete: (poll: SavedPoll) => void;
    onload: (poll: SavedPoll) => void;
  } = $props();
</script>

<p>
  You can store polls you use often here. Just type the poll on the create poll tab and press
  "save"
</p>
<ul class="list-group">
  {#each savedPolls as poll (poll.id)}
    <li class="list-group-item">
      {poll.q}
      <div class="float-right">
        <button type="button" class="btn btn-default btn-sm mr-2" onclick={() => ondelete(poll)}>
          <i class="fas fa-trash"></i> Delete
        </button>
        <button type="button" class="btn btn-primary btn-sm" onclick={() => onload(poll)}>
          Load
        </button>
      </div>
    </li>
  {/each}
</ul>
