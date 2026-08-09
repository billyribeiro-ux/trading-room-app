/**
 * The cinematic home page's copy deck — the single authority for every word on `/`.
 *
 * The 2026-08 redesign (docs/decisions/0005-cinematic-home.md) replaced the captured legacy
 * marketing page with an owner-directed product surface. The seven testimonial quotes are the one
 * evidence-carried survivor: they are verbatim member comments from the original capture and are
 * kept verbatim here. Everything else is first-party copy for the product as it is actually built —
 * Svelte 5, a Rust control plane, PostgreSQL 17, and a mediasoup WebRTC SFU — so every technical
 * claim below is traceable to this repository rather than to marketing imagination.
 *
 * Plain module data, not `$state`: nothing here changes at runtime, and keeping the deck out of
 * markup means the copy can be reviewed and diffed without reading components.
 */

export const BRAND = 'tradingroom.app';

export const HERO_EYEBROW = 'Live trading-room infrastructure';

export const HERO_HEADLINE_LINES = ['The trading floor,', 're-engineered.'] as const;

export const HERO_HEADLINE = HERO_HEADLINE_LINES.join(' ');

export const HERO_SUB =
  'tradingroom.app puts your entire desk — HD screen-share, voice, chat, and trade alerts — on one ' +
  'real-time surface, driven by an engine built like a trading system: Svelte 5 on the wire, a Rust ' +
  'core, WebRTC end to end.';

export const HERO_CTA_PRIMARY = { label: 'Book a private demo', href: '/contact' } as const;

export const HERO_CTA_SECONDARY = { label: 'Inspect the engineering', href: '#engineering' } as const;

export const HERO_CHIPS = ['White-label', 'Zero installs', 'Desktop + mobile', 'Encrypted end to end'] as const;

export interface TickerEntry {
  readonly symbol: string;
  readonly move: string;
  readonly direction: 'up' | 'down';
}

/** Decorative hero tape. Deliberately labeled simulated wherever it renders — these are not quotes. */
export const TICKER: readonly TickerEntry[] = [
  { symbol: 'ES', move: '+0.42%', direction: 'up' },
  { symbol: 'NQ', move: '+0.68%', direction: 'up' },
  { symbol: 'SPY', move: '+0.39%', direction: 'up' },
  { symbol: 'AAPL', move: '+1.12%', direction: 'up' },
  { symbol: 'NVDA', move: '+2.41%', direction: 'up' },
  { symbol: 'TSLA', move: '-0.87%', direction: 'down' },
  { symbol: 'BTC', move: '+3.05%', direction: 'up' },
  { symbol: 'ETH', move: '+1.94%', direction: 'up' },
  { symbol: 'EUR/USD', move: '-0.12%', direction: 'down' },
  { symbol: 'CL', move: '+0.76%', direction: 'up' },
  { symbol: 'GC', move: '+0.28%', direction: 'up' },
  { symbol: 'VIX', move: '-4.10%', direction: 'down' }
];

export const SIMULATED_FEED_LABEL = 'Simulated feed';

export interface Stat {
  readonly value: string;
  readonly label: string;
  readonly detail: string;
}

export const STATS: readonly Stat[] = [
  {
    value: '<1s',
    label: 'glass-to-glass screen-share',
    detail: 'A WebRTC SFU moves pixels, not screenshots. Your chart lands before the candle closes.'
  },
  {
    value: '0',
    label: 'installs, plugins, downloads',
    detail: 'Pure HTML5 in any modern browser. No Flash, no Java, nothing for members to maintain.'
  },
  {
    value: '1080p',
    label: 'HD share and voice',
    detail: 'Engineered for charts and order flow — crisp lines, readable numbers, clean audio.'
  },
  {
    value: '100%',
    label: 'white-label, your brand',
    detail: 'Your domain, your colors, your room. Branding, recording, webinars, and stats included.'
  }
];

export const ENGINEERING = {
  eyebrow: 'The stack',
  heading: 'Engineered like a trading system.',
  lede:
    'Most rooms are webinar tools with a chat bolted on. tradingroom.app is built the way you would ' +
    'build an execution platform — every layer chosen for latency, safety, and uptime.'
} as const;

export interface Pillar {
  readonly index: string;
  readonly tag: string;
  readonly title: string;
  readonly body: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    index: '01',
    tag: 'svelte 5 · runes',
    title: 'Zero-waste rendering',
    body:
      'The interface compiles to surgical DOM updates — no virtual-DOM diffing, no runtime tax. ' +
      'Frames stay free for the tape.'
  },
  {
    index: '02',
    tag: 'rust · postgres 17',
    title: 'A Rust control plane',
    body:
      'Memory-safe, predictable under load, boring in the best way. Tail latencies stay flat when ' +
      'the market refuses to.'
  },
  {
    index: '03',
    tag: 'mediasoup · sfu',
    title: 'WebRTC end to end',
    body:
      'Screen, voice, and video ride a selective-forwarding unit over encrypted DTLS-SRTP — ' +
      'sub-second glass to glass, not screen-scraped video.'
  },
  {
    index: '04',
    tag: 'server-sent events',
    title: 'Streaming by default',
    body:
      'Alerts, chat, and roster changes arrive over live connections. Nothing polls, nothing ' +
      'refreshes, nobody hits F5.'
  },
  {
    index: '05',
    tag: 'tls 1.3 · rls',
    title: 'Encrypted and isolated',
    body:
      'TLS on every byte, encrypted media, and row-level security in the database. Your calls, ' +
      'your data, your room — nobody else’s.'
  },
  {
    index: '06',
    tag: 'html5',
    title: 'Zero-install, everywhere',
    body: 'No Flash. No Java. No downloads. The whole desk runs in the browser, on desktops and phones alike.'
  }
];

/** The wire, drawn as a diagram strip under the pillars. */
export const ARCH_FLOW = ['Browser', 'Edge · SvelteKit SSR', 'Rust API', 'PostgreSQL 17'] as const;

export const ARCH_MEDIA_LANE = 'WebRTC SFU · mediasoup — media never touches the request path';

export const SHOWCASE = {
  eyebrow: 'The product',
  heading: 'One surface. The whole desk.',
  lede:
    'Screen-share, voice, chat, alerts, and your member roster — in one window, under your brand. ' +
    'What you see below is a live rendering, not a screenshot: it is drawn by the same engine that ' +
    'runs the room.'
} as const;

export const SHOWCASE_FEATURES = [
  'Recording, webinars, and replays',
  'Member stats and roster control',
  'Custom integrations on your site',
  'Trade alerts to every device'
] as const;

export const MOBILE = {
  heading: 'The whole desk, in your pocket.',
  body:
    'tradingroom.app runs from the mobile browser on iOS and Android — and trade alerts land on ' +
    'the phone the moment they are called.'
} as const;

export const TAPE = {
  eyebrow: 'Real-time',
  heading: 'Built for the tape.',
  lede:
    'A room has to keep pace with the market it trades. The chart below streams simulated ticks ' +
    'through a live pipeline and is rendered in your browser as it moves — the way the room ' +
    'itself streams alerts, chat, and prices.'
} as const;

export const TAPE_SPARKLINE_SYMBOLS = ['ES', 'NQ', 'BTC', 'EUR/USD'] as const;

export const VOICES = {
  eyebrow: 'After the switch',
  heading: 'Desks that switch don’t switch back.',
  note: 'Verbatim member comments, captured after rooms moved from legacy webinar platforms to tradingroom.app.'
} as const;

/** Verbatim from the original capture — the one piece of the legacy page kept word for word. */
export const TESTIMONIALS: readonly string[] = [
  'Looks way cleaner and sounds great!',
  'WOW absolutely no Lag!',
  'Crisper charts!',
  'The audio quality is so much better!',
  'Yes! Way better than Omnovia',
  'PC resources much healthier. Webinato slowed me right down!',
  'I like it a lot more!'
];

export const CTA = {
  heading: 'Bring your room. We’ll bring the engine.',
  lede: 'Pricing, white-label setup, and custom integrations are a conversation — talk to the people who built it.',
  primary: { label: 'Talk to us', href: '/contact' },
  secondary: { label: 'Get a free demo room', href: '/contact' },
  finePrint: 'White-label from day one · Your domain, your brand · Nothing for your members to install'
} as const;

/**
 * Footer link markup lives literally in HomeFooter.svelte so `svelte/no-navigation-without-resolve`
 * can statically verify every href; the deck carries only the words.
 */
export const FOOTER = {
  tagline: 'Real-time trading rooms for professional desks — engineered, not assembled.',
  stack: 'Engineered on Svelte 5 · Rust · WebRTC',
  heritage: 'No Flash. No Java. No lag.',
  copyright: '© 2026 TradingRoomApp™'
} as const;

/** Intrinsic dimensions for raster assets that remain on legacy marketing chrome. */
export const IMAGE_SIZES = {
  brand: { w: 88, h: 55 }
} as const;
