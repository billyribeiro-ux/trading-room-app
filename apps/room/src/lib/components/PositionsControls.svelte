<script lang="ts">
  /*
    The two positions buttons — `W4e` at bundle byte 2,492,892, and its mobile twin at 2,495,042.

        H(0, G4e, 3, 0, "button", 220)          // only when showPositions
        d(1,"button",221) x("click", toggleShowPositions()) v(2)

        O(0, showPositions ? 0 : -1)
        Ne(" ", showPositions ? "Hide Positions" : "Show Positions", " ")

    with consts 220 `["type","button",1,"btn","btn-sm","updatePositionBtn"]`,
    221 `["type","button",1,"btn","btn-sm","positionBtn",3,"click"]`,
    222 the same as 220 with a click, and 223 `[1,"fas","fa-sync"]`.

    So: a toggle whose LABEL is the state, and — only while the panel is open — a manual refresh
    beside it. The refresh button exists because the thirty-second timer is behind a preference a
    member may not have on, which is the case the reference solves by making the reload manual.

    ## `Update Positions` forces a reload, it does not toggle the preference

    `updatePositionsIframe()` emits an event the container answers with one `loadPositionsContainer`.
    Here that is one new stamp, and it is a prop callback rather than state in this component: the
    container owns the stamp, and a button that owned it would be a second thing deciding when the
    owner's page is fetched.
  */
  interface Props {
    /** `globals.showPositions` — the toggle, and the button's own label. */
    readonly showPositions: boolean;
    readonly ontoggle: () => void;
    /** `updatePositionsIframe()` — one immediate reload. Only offered while the panel is open. */
    readonly onrefresh: () => void;
  }

  let { showPositions, ontoggle, onrefresh }: Props = $props();
</script>

{#if showPositions}
  <button type="button" class="btn btn-sm updatePositionBtn" onclick={onrefresh}>
    <i class="fas fa-sync"></i> Update Positions
  </button>
{/if}
<button type="button" class="btn btn-sm positionBtn" onclick={ontoggle}>
  {showPositions ? 'Hide Positions' : 'Show Positions'}
</button>
