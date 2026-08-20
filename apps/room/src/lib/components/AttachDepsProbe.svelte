<script lang="ts">
  /*
    A PROBE, not a feature. It exists so `attachment-dependency-contract.svelte.test.ts` can prove on
    the real compiler which closure of an attachment collects reactive dependencies, instead of the
    test asserting what the docs are believed to say.

    Two elements, one reactive counter. `inBody` reads it where the attachment itself runs; `inTeardown`
    reads it only inside the function the attachment returns. Each bumps its own tally so the test can
    see which one Svelte re-ran.

    `tally` is a PLAIN object and must stay one. A first draft made it `$state`, and writing to a
    reactive proxy from inside an attachment — which runs in an effect — is a write-read cycle:
    `effect_update_depth_exceeded`, thrown by my own probe and nothing to do with the rule being
    measured. The tallies are only ever read after `flushSync`, so they need no reactivity at all.
  */
  let {
    count,
    tally
  }: { count: number; tally: { body: number; teardown: number; teardownReads: number } } = $props();

  function readsInBody(node: HTMLElement) {
    void count;
    tally.body += 1;
    void node;
  }

  function readsInTeardown(node: HTMLElement) {
    tally.teardown += 1;
    void node;
    return () => {
      void count;
      tally.teardownReads += 1;
    };
  }
</script>

<div {@attach readsInBody}></div>
<div {@attach readsInTeardown}></div>
