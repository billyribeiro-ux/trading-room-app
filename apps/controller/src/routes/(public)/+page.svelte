<script lang="ts">
  import { asset } from '$app/paths';
  import { page } from '$app/state';
  import CtaSection from '$lib/components/home/CtaSection.svelte';
  import EngineeringSection from '$lib/components/home/EngineeringSection.svelte';
  import HeroCinematic from '$lib/components/home/HeroCinematic.svelte';
  import ShowcaseSection from '$lib/components/home/ShowcaseSection.svelte';
  import StatStrip from '$lib/components/home/StatStrip.svelte';
  import TapeSection from '$lib/components/home/TapeSection.svelte';
  import VoicesSection from '$lib/components/home/VoicesSection.svelte';
  import { HERO_SUB } from '$lib/content/home';

  // The hero headline is set in self-hosted Roboto 300 and is above the fold; preload the exact
  // binary pinned by docs/reference/font-contract.md.
  const heroFontUrl = asset('/fonts/roboto/roboto-v51-latin-300.woff2');

  const title = 'tradingroom.app — The trading floor, re-engineered';
  const description =
    'Real-time trading rooms for professional desks: HD screen-share, voice, chat, and trade alerts ' +
    'on an engine built like a trading system — Svelte 5, a Rust core, WebRTC everywhere. ' +
    'White-label, zero installs, desktop and mobile.';
</script>

<svelte:head>
  <title>{title}</title>
  <link
    rel="preload"
    href={heroFontUrl}
    as="font"
    type="font/woff2"
    crossorigin="anonymous"
  />
  <meta name="description" content={description} />
  <meta
    name="keywords"
    content="Trading room, trading room software, chat room software, webinato replacement, omnovia replacement, white label trading room"
  />
  <meta name="theme-color" content="#04050a" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="tradingroom.app" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={HERO_SUB} />
  <meta property="og:url" content={page.url.origin + '/'} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
</svelte:head>

<HeroCinematic />
<StatStrip />
<ShowcaseSection />
<EngineeringSection />
<TapeSection />
<VoicesSection />
<CtaSection />
