<script lang="ts">
  import '../app.css';
  // The three Font Awesome faces keep the upstream `font-display: auto` (a re-declaration as
  // `optional` was tried and reverted: `optional` lets the browser skip a face on any load it
  // judges slow, which renders every icon from the fallback for that whole page view). Instead
  // the woff2 files are preloaded so they are in the cache before first paint - measured on the
  // prod build: fonts finish at ~26ms and FontFaceSet fires loadingdone at ~72ms, ahead of first
  // contentful paint at ~84ms, so the glyphs are correct in the very first frame. Importing with
  // `?url` keeps the hashed build filename in sync with the `url()` references in the CSS
  // instead of hard-coding a path that would rot.
  import brandsFont from '@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2?url';
  import regularFont from '@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2?url';
  import solidFont from '@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2?url';
  import type { LayoutProps } from './$types';

  let { children }: LayoutProps = $props();

  const iconFonts = [solidFont, regularFont, brandsFont];
</script>

<svelte:head>
  {#each iconFonts as href (href)}
    <link rel="preload" {href} as="font" type="font/woff2" crossorigin="anonymous" />
  {/each}
</svelte:head>

{@render children()}
