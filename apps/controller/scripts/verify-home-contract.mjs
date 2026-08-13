import { access, readFile } from 'node:fs/promises';

/**
 * The home surface contract — successor to `verify-home-fidelity.mjs`.
 *
 * The 2026-08 redesign (docs/decisions/0005-cinematic-home.md) retired the pixel-fidelity
 * reconstruction of the captured legacy page in favor of an owner-directed cinematic surface.
 * This gate protects the properties that make that surface correct, honest, and safe — and unlike
 * its predecessor it is fully self-contained: no evidence dumps, no owner-local symlinks, so it
 * runs anywhere the repository is cloned.
 *
 * What it enforces:
 *   1. No raster imagery on the home surface — the composition is markup, WebGL, and SVG only.
 *   2. The animation stack is pinned and the gate itself is wired into the test chain.
 *   3. The copy deck keeps its anchors: the headline, the stack claims, the simulated-feed
 *      honesty label, and all seven verbatim member quotes carried over from the capture.
 *   4. Motion safety: one GSAP registration behind a window guard, reduced-motion checked in the
 *      motion module, and explicit reduced-motion handling where marquees loop.
 *   5. SSR safety: three.js loads only through a dynamic import behind a WebGL probe.
 *   6. The layout gives `/` its own chrome — nav, consent, footer — outside `.pub-root`.
 *   7. Decorative layers are aria-hidden and animated stat values keep static accessible copy.
 */

const failures = [];

async function read(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    failures.push(`${file}: missing — the home contract names it as a required source`);
    return '';
  }
}

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function requireText(file, source, claim, expected) {
  if (!compact(source).includes(compact(expected))) failures.push(`${file}: missing ${claim}`);
}

function requirePattern(file, source, claim, pattern) {
  if (!pattern.test(source)) failures.push(`${file}: missing ${claim}`);
}

function rejectPattern(file, source, claim, pattern) {
  if (pattern.test(source)) failures.push(`${file}: violates ${claim}`);
}

const files = {
  packageJson: 'package.json',
  layout: 'src/routes/+layout.svelte',
  page: 'src/routes/(public)/+page.svelte',
  homeCss: 'src/home.css',
  content: 'src/lib/content/home.ts',
  motion: 'src/lib/motion.ts',
  feed: 'src/lib/components/home/market-feed.ts',
  nav: 'src/lib/components/home/HomeNav.svelte',
  hero: 'src/lib/components/home/HeroCinematic.svelte',
  heroScene: 'src/lib/components/home/HeroScene.svelte',
  candleField: 'src/lib/components/home/CandleField.svelte',
  stats: 'src/lib/components/home/StatStrip.svelte',
  showcase: 'src/lib/components/home/ShowcaseSection.svelte',
  deskMock: 'src/lib/components/home/DeskMock.svelte',
  phoneMock: 'src/lib/components/home/PhoneMock.svelte',
  engineering: 'src/lib/components/home/EngineeringSection.svelte',
  tape: 'src/lib/components/home/TapeSection.svelte',
  voices: 'src/lib/components/home/VoicesSection.svelte',
  cta: 'src/lib/components/home/CtaSection.svelte',
  footer: 'src/lib/components/home/HomeFooter.svelte',
  consent: 'src/lib/components/home/ConsentBanner.svelte'
};

const sources = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await read(file)]))
);

/* ---- 1. No raster imagery anywhere on the home surface --------------------------------- */

const surfaceKeys = Object.keys(files).filter((key) => !['packageJson', 'layout', 'homeCss'].includes(key));
for (const key of surfaceKeys) {
  rejectPattern(files[key], sources[key], 'the no-raster-imagery rule (<img> on the home surface)', /<img\b/);
}
// The token sheet joins the bitmap scan: a CSS background bitmap is raster imagery too. (Its one
// data URI is SVG, which the rule deliberately allows.)
for (const key of [...surfaceKeys, 'homeCss']) {
  rejectPattern(
    files[key],
    sources[key],
    'the no-raster-imagery rule (bitmap asset reference)',
    /\.(?:png|jpe?g|webp|gif|avif)\b/i
  );
}

const retiredArtifacts = [
  'static/public/images/ptr_descrived_perspective.png',
  'static/public/images/user_comments.png',
  'static/public/images/ss3.png',
  'static/public/images/circle-icons',
  'src/lib/components/home/HeroSection.svelte',
  'src/lib/components/home/FeatureGrid.svelte',
  'src/lib/components/home/Testimonials.svelte',
  'src/lib/components/home/MobileSection.svelte',
  'scripts/verify-home-fidelity.mjs'
];
for (const artifact of retiredArtifacts) {
  let present = true;
  try {
    await access(artifact);
  } catch {
    present = false;
  }
  if (present) failures.push(`${artifact}: retired by the redesign but still present`);
}

/* ---- 2. Pinned animation stack and gate wiring ------------------------------------------ */

const pkg = JSON.parse(sources.packageJson || '{}');
for (const dependency of ['gsap', 'three', '@threlte/core', 'd3-scale', 'd3-shape', 'd3-array']) {
  const pin = pkg.dependencies?.[dependency];
  if (!pin || /[\^~]/.test(pin)) {
    failures.push(`package.json: dependency ${dependency} must be exact-pinned (found ${pin ?? 'nothing'})`);
  }
}
if (!pkg.scripts?.['home:contract']?.includes('verify-home-contract.mjs')) {
  failures.push('package.json: home:contract script must run this gate');
}
if (!pkg.scripts?.test?.includes('home:contract')) {
  failures.push('package.json: the test chain must run home:contract');
}

/* ---- 3. Copy-deck anchors ----------------------------------------------------------------- */

requireText(files.content, sources.content, 'the hero headline', "['The trading floor,', 're-engineered.']");
for (const claim of ['Svelte 5', 'Rust', 'WebRTC']) {
  requireText(files.content, sources.content, `the stack claim "${claim}" in the hero sub`, claim);
}
requireText(
  files.content,
  sources.content,
  'the simulated-feed honesty label',
  "SIMULATED_FEED_LABEL = 'Simulated feed'"
);

const verbatimQuotes = [
  'Looks way cleaner and sounds great!',
  'WOW absolutely no Lag!',
  'Crisper charts!',
  'The audio quality is so much better!',
  'Yes! Way better than Omnovia',
  'PC resources much healthier. Webinato slowed me right down!',
  'I like it a lot more!'
];
for (const quote of verbatimQuotes) {
  requireText(files.content, sources.content, `the verbatim member quote "${quote}"`, quote);
}

requirePattern(files.hero, sources.hero, 'the simulated-feed label beside the hero tape', /SIMULATED_FEED_LABEL/);
requirePattern(files.tape, sources.tape, 'the simulated-feed label on the live chart', /SIMULATED_FEED_LABEL/);

/* ---- 3b. Font-contract handshake (the evidence-bound fonts:verify gate is owner-local) ------ */

requireText(
  files.page,
  sources.page,
  'the exact self-hosted hero font asset',
  /*
    NO LEADING SLASH. SvelteKit 3's `asset()` takes a path relative to the assets base, and the
    codebase is unanimous: all 6 `asset()` call sites are written without one. This assertion had
    `/fonts/...` and went RED when `ff948db` ("Adopt SvelteKit 3 next") migrated the call shapes and
    left the verifier behind.
  */
  "const heroFontUrl = asset('fonts/roboto/roboto-v51-latin-300.woff2');"
);
requirePattern(
  files.page,
  sources.page,
  'the critical hero font preload',
  /rel="preload"[\s\S]*?href=\{heroFontUrl\}[\s\S]*?as="font"[\s\S]*?type="font\/woff2"[\s\S]*?crossorigin="anonymous"/
);
rejectPattern(
  files.page,
  sources.page,
  'local-only font delivery (no remote font hosts)',
  /fonts\.(?:googleapis|gstatic)\.com/
);
// The preloaded binary must actually be the display face in use: Roboto as the display token,
// weight 300 on the headline that renders it.
requirePattern(files.homeCss, sources.homeCss, 'the Roboto display token', /--hc-font-display:\s*'Roboto'/);
requirePattern(files.hero, sources.hero, 'the 300-weight hero headline', /font-weight:\s*300/);

/* ---- 4. Motion safety ---------------------------------------------------------------------- */

requireText(
  files.motion,
  sources.motion,
  'the window-guarded single GSAP plugin registration',
  "if (typeof window !== 'undefined') { gsap.registerPlugin(ScrollTrigger); }"
);

/*
 * Scope the reduced-motion requirement to each factory's own body. An unanchored
 * `reveal[\s\S]*?prefersReducedMotion` span could be satisfied by ANY later occurrence in the
 * file, which means deleting one factory's guard would never trip the gate.
 */
function exportedFunctionBody(source, name) {
  const start = source.indexOf(`export function ${name}`);
  if (start === -1) return null;
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

for (const factory of ['reveal', 'parallax', 'magnetic']) {
  const body = exportedFunctionBody(sources.motion, factory);
  if (!body || !body.includes('prefersReducedMotion()')) {
    failures.push(`${files.motion}: ${factory}() is missing its own reduced-motion check`);
  }
}
requirePattern(files.homeCss, sources.homeCss, 'the global reduced-motion clamp', /prefers-reduced-motion:\s*reduce/);
for (const key of ['hero', 'voices', 'phoneMock']) {
  requirePattern(
    files[key],
    sources[key],
    'an explicit reduced-motion override for its looping animation',
    /prefers-reduced-motion:\s*reduce/
  );
}

/* ---- 5. SSR and WebGL safety ---------------------------------------------------------------- */

/*
 * three.js isolation, repo-wide across the home surface: only HeroScene and CandleField — reached
 * exclusively through the dynamic import — may touch three/threlte, and nothing anywhere may
 * import HeroScene statically.
 */
for (const key of surfaceKeys) {
  if (key === 'heroScene' || key === 'candleField') continue;
  rejectPattern(
    files[key],
    sources[key],
    'three.js chunk isolation (three/threlte outside the lazy scene pair)',
    /from\s+'(?:three|@threlte\/core)'/
  );
  rejectPattern(
    files[key],
    sources[key],
    'lazy three.js loading (HeroScene must never be imported statically)',
    /import\s+HeroScene\s+from/
  );
}
requirePattern(
  files.hero,
  sources.hero,
  'the dynamic HeroScene import behind the WebGL probe',
  /\{#await import\('\.\/HeroScene\.svelte'\)/
);
requirePattern(files.hero, sources.hero, 'the WebGL capability probe', /getContext\('webgl2'\)/);
requirePattern(
  files.candleField,
  sources.candleField,
  'a pausable frame loop (useTask with a running gate)',
  /useTask\([\s\S]*?running:/
);

/* ---- 6. Layout chrome ------------------------------------------------------------------------ */

requireText(files.layout, sources.layout, 'the dedicated home chrome shell', '<div class="home-cine">');
requireText(files.layout, sources.layout, 'the consent banner on the home surface', '<ConsentBanner />');
requirePattern(files.layout, sources.layout, 'the home nav with account gating', /<HomeNav signedIn=/);
requirePattern(files.layout, sources.layout, 'the home footer with account gating', /<HomeFooter signedIn=/);
requireText(files.layout, sources.layout, 'a semantic main landmark for the home page', '<main id="home-main">');
requireText(files.layout, sources.layout, 'the home token sheet import', "import '../home.css';");
rejectPattern(
  files.layout,
  sources.layout,
  'home independence from the Bootstrap transcription (no #home4 pub-root shell)',
  /home4/
);

/* ---- 7. Accessibility floor ------------------------------------------------------------------ */

requirePattern(
  files.deskMock,
  sources.deskMock,
  'aria-hidden on the decorative desk illustration',
  /aria-hidden="true"/
);
requirePattern(
  files.phoneMock,
  sources.phoneMock,
  'aria-hidden on the decorative phone illustration',
  /aria-hidden="true"/
);
requirePattern(files.heroScene, sources.heroScene, 'aria-hidden on the WebGL canvas layer', /aria-hidden="true"/);
requirePattern(
  files.stats,
  sources.stats,
  'plain-text stat values (no obfuscating text effects)',
  /class="value">\{stat\.value\}/
);
requirePattern(files.tape, sources.tape, 'an accessible name on the live chart', /role="img"[\s\S]*?aria-label/);

/* ---- 8. Consent contract --------------------------------------------------------------------- */

requireText(files.consent, sources.consent, 'the stored-consent key', "localStorage.getItem('gdprConsent')");
requirePattern(files.consent, sources.consent, 'the accepted/rejected value pair', /'accepted' \| 'rejected'/);
requirePattern(files.consent, sources.consent, 'the client-only stored-consent read', /\{@attach readStoredConsent\}/);

/* ---- 9. Footer contract ---------------------------------------------------------------------- */

/* The links must live in the footer itself; the copyright line lives in the deck the footer
   renders. Testing a combined blob let either side silently lose its half. */
for (const [claim, pattern] of [
  /*
    ROUTE IDS INCLUDE THE ROUTE GROUP. These pages live at `src/routes/(public)/{privacy,terms,
    contact}` and there are no ungrouped variants, so `/(public)/privacy` IS the route id — that is
    what SvelteKit 3's typed `resolve()` accepts, and `resolve('/privacy')` would not type-check.
    All 41 `resolve()` call sites in `src` carry their group.

    These three matched the pre-group shape and went RED for the same reason as the font assertion
    above: `ff948db` migrated the source and this file was not updated with it. The links were never
    missing — the contract was describing a shape the framework no longer uses.
  */
  ['the privacy link', /resolve\('\/\(public\)\/privacy'\)/],
  ['the terms link', /resolve\('\/\(public\)\/terms'\)/],
  ['the contact link', /resolve\('\/\(public\)\/contact'\)/],
  ['the rendered copyright line', /\{FOOTER\.copyright\}/]
]) {
  if (!pattern.test(sources.footer)) failures.push(`${files.footer}: missing ${claim}`);
}
requireText(files.content, sources.content, 'the copyright text', "copyright: '© 2026 TradingRoomApp™'");

if (failures.length) {
  console.error('Home surface contract failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(
  'Home surface contract passed: no raster imagery, pinned animation stack, copy-deck anchors with all ' +
    `${verbatimQuotes.length} verbatim quotes, motion/SSR safety, dedicated chrome, accessibility floor, ` +
    'consent contract, and footer links.'
);
