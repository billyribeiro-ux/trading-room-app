<script lang="ts">
  import { asset } from '$app/paths';
  import CtaSection from '$lib/components/home/CtaSection.svelte';
  import FeatureGrid from '$lib/components/home/FeatureGrid.svelte';
  import HeroSection from '$lib/components/home/HeroSection.svelte';
  import MobileSection from '$lib/components/home/MobileSection.svelte';
  import Testimonials from '$lib/components/home/Testimonials.svelte';

  const heroFontUrl = asset('/fonts/roboto/roboto-v51-latin-300.woff2');
</script>

<svelte:head>
  <title>TradingRoomApp - Trading Room Software for professional traders</title>
  <!-- The hero is above the fold; preload its one evidence-backed face. -->
  <link
    rel="preload"
    href={heroFontUrl}
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
  />
  <meta name="description" content="TradingRoomApp Trading room software for professional traders" />
  <meta
    name="keywords"
    content="Trading room, chat room software, webinato replacement, omnovia replacement"
  />
  <meta name="theme-color" content="#ffffff" />
</svelte:head>

<HeroSection />
<FeatureGrid />
<hr />
<Testimonials />
<MobileSection />
<CtaSection />
