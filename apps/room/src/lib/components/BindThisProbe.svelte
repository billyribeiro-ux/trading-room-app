<script lang="ts">
  /*
    A PROBE, not a room component. It exists so `dom-reference-contract.test.ts` can prove what
    `bind:this` actually does at runtime, rather than trusting a reading of the docs.

    The question it answers is narrow and load-bearing: twelve capture attachments in this repository
    hand-roll a teardown guard —

        function captureX(node) { x = node; return () => { if (x === node) x = undefined; } }

    — and the `if (x === node)` half exists to survive the case where a NEW element mounts before the
    OLD one tears down. If `bind:this` already handles that, the guard is hand-rolling something the
    platform does, which `~/CLAUDE.md` forbids in as many words. If it does NOT, every one of those
    attachments is load-bearing and must stay.

    `which` alternates between two elements that bind the SAME variable, which is the shape that
    makes the ordering observable. `present` covers the plain mount/unmount case.
  */
  interface Props {
    which: 'a' | 'b';
    present: boolean;
    /** Reported out so the test reads the binding rather than reaching into the component. */
    report: (node: HTMLElement | undefined) => void;
  }

  let { which, present, report }: Props = $props();

  let node = $state<HTMLElement | undefined>();

  $effect(() => {
    report(node);
  });
</script>

{#if present}
  {#if which === 'a'}
    <div data-which="a" bind:this={node}>A</div>
  {:else}
    <section data-which="b" bind:this={node}>B</section>
  {/if}
{/if}
