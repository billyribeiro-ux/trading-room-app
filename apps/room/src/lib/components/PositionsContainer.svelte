<script lang="ts">
  /*
    `app-positions-container` — the owner's positions page, refreshed on a timer.

    Byte 2,329,246. Its markup is two elements and its consts are
    `[1,"positionOverlay","animated","fadeIn"]` and `[3,"src"]`; the captured stylesheet gives them
    `.positionOverlay iframe { width:100%; height:100% }`.

    ## The timer lives HERE because the element does

    `startIframeRefresh` calls `loadPositionsContainer` immediately and then every thirty seconds,
    and `loadPositionsContainer` is only ever "recompute the src". In Svelte that is one `$effect`
    over the two flags: the effect's own teardown replaces `stopIframeRefresh`, `ngOnDestroy` and the
    `unsubscribeAll` together, which is three pieces of bookkeeping the framework does.

    ## The conjunction is the reason there is a timer at all

    `preferences.updatePositionsIframe && globals.showPositions`. A member who has never opened the
    panel must not have a background timer fetching an owner's page every thirty seconds — and
    `positionsRefreshRunning` is a named predicate rather than an inline `&&` for exactly that
    reason.
  */
  import {
    POSITIONS_REFRESH_MS,
    positionsIframeSrc,
    positionsRefreshRunning
  } from '#lib/positions-iframe.js';

  interface Props {
    /** `sessData.positionsIframeUrl`, raw. Checked here, once, by `positionsIframeSrc`. */
    readonly url?: string;
    /** `preferences.updatePositionsIframe` — the viewer's own refresh switch. */
    readonly autoRefresh: boolean;
  }

  let { url, autoRefresh }: Props = $props();

  /*
    The stamp, and NOT a `$derived` over `Date.now()`.

    A derivation reading the clock recomputes whenever anything it is read beside changes, which
    would re-fetch the owner's page on every unrelated invalidate — and this page invalidates every
    five seconds. It is `$state`, written once on mount and then only by the timer, so the number of
    fetches is exactly the number the reference makes.
  */
  let stamp = $state(Date.now());
  const src = $derived(positionsIframeSrc(url, stamp));

  /**
   * `updatePositionsIframe()` — one immediate reload, from the "Update Positions" button.
   *
   * Exported rather than driven by a prop, because the stamp belongs with the element that uses it:
   * a token passed down would put two things in charge of when an owner's page is fetched, and the
   * timer below is already one of them. Upstream reaches the same place through a GUI event bus.
   */
  export function reload() {
    stamp = Date.now();
  }

  $effect(() => {
    // The component is mounted, so `showPositions` is true — that is what renders it.
    if (!positionsRefreshRunning({ updatePositionsIframe: autoRefresh, showPositions: true })) {
      return;
    }
    const timer = setInterval(() => (stamp = Date.now()), POSITIONS_REFRESH_MS);
    return () => clearInterval(timer);
  });
</script>

{#if src}
  <div class="positionOverlay animated fadeIn">
    <iframe {src} title="Positions"></iframe>
  </div>
{/if}
