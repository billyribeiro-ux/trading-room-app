<script lang="ts">
  import '../app.css';
  import type { LayoutProps } from './$types';

  /**
   * NO `<svelte:head>` FONT PRELOADS HERE, AND THEIR ABSENCE IS THE DELIVERABLE.
   *
   * This file used to hand-write three `<link rel="preload" as="font">` tags for the Font Awesome
   * faces, `?url`-imported so the hashed build name stayed in sync. `hooks.server.ts` passes
   * `preload` to `resolve`, and SvelteKit emits the identical tag — `rel="preload"`, `as="font"`,
   * `type="font/woff2"`, `crossorigin` — for every font that filter accepts. So each face was
   * preloaded TWICE per page, and the two lists had already drifted: three faces here against the
   * filter's four (the note editor's `summernote` face is in this layout's CSS graph too).
   *
   * The filter is the half that stays because it is the one that cannot go stale — it is fed by
   * the build's own font list, so a face entering or leaving the CSS graph is a fact it already
   * knows and this file would have had to be told. `font-preload-contract.test.ts` holds the pair.
   *
   * One honest consequence, from the official `kit/hooks` doc: *"in dev mode `preload` is not
   * called, since it depends on analysis that happens at build time."* `pnpm dev` therefore emits
   * no font preload. Correct trade — dev serves the woff2 unhashed off local disk.
   */
  let { children }: LayoutProps = $props();
</script>

{@render children()}
