import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expectedHashes = new Map([
  ['evidence-dumps/home-page/file', '935562f231a499feff797afe59672f8bdc4b223d61d652c6f102b6deafd594ab'],
  ['static/public/images/protradingroom_icon.png', 'f9c8e4a59a690bfb8818819ab0cfef00d0800044ee028d99faf535c3253148a5'],
  [
    'static/public/images/ptr_descrived_perspective.png',
    '4419e8ded4a3e4e19a15809fb9c577044629c9345b75843b81b56f49207e699c'
  ],
  ['static/public/images/user_comments.png', 'b133877779a920e6e6d36749284dbd1548cf5a2a1fbc59330825a8155445a4ba'],
  ['static/public/images/ss3.png', 'bf4fd92aaa5865cd6824852b946a04c2e00b026f28b9b45d032a904e077d8752'],
  [
    'static/public/images/circle-icons/one-color/locked.png',
    'beab5323195e7c7d351298464c8f0af4484f881039924487d0ed2f5775458b82'
  ],
  [
    'static/public/images/circle-icons/one-color/cloud.png',
    '5a387d3acfc0b59e024e995d1a677a23833802f263c42fab2bc85ba768b18eff'
  ],
  [
    'static/public/images/circle-icons/one-color/browser.png',
    '16f5d6e2d032d66b4c5c5a4c720f6d9b5577c09996188fd99809753544478dec'
  ],
  ['static/fonts/roboto/roboto-v51-latin-300.woff2', '0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a']
]);

const heroImageContract = Object.freeze({
  file: 'static/public/images/ptr_descrived_perspective.png',
  sha256: '4419e8ded4a3e4e19a15809fb9c577044629c9345b75843b81b56f49207e699c',
  byteLength: 712178,
  width: 1440,
  height: 956,
  bitDepth: 8,
  colorType: 6,
  interlaceMethod: 0
});

const failures = [];

const heroViewportCases = [
  { viewport: 320, expectedWidth: 290 },
  { viewport: 375, expectedWidth: 345 },
  { viewport: 767, expectedWidth: 737 },
  { viewport: 768, expectedWidth: 738 },
  { viewport: 991, expectedWidth: 961 },
  { viewport: 992, expectedWidth: 631.333333 },
  { viewport: 1200, expectedWidth: 770 },
  { viewport: 1440, expectedWidth: 930 },
  { viewport: 2160, expectedWidth: 1410 },
  { viewport: 2205, expectedWidth: 1440 }
];

for (const { viewport, expectedWidth } of heroViewportCases) {
  const columnContentWidth = viewport < 992 ? viewport - 30 : viewport * (2 / 3) - 30;
  const renderedWidth = Math.min(heroImageContract.width, columnContentWidth);
  if (Math.abs(renderedWidth - expectedWidth) > 0.000001) {
    failures.push(`hero sizing at ${viewport}px: expected ${expectedWidth}px, calculated ${renderedWidth}px`);
  }
}

for (const [file, expected] of expectedHashes) {
  const bytes = await readFile(file);
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) failures.push(`${file}: expected ${expected}, received ${actual}`);
}

function inspectPng(bytes) {
  const signature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== signature || bytes.toString('ascii', 12, 16) !== 'IHDR') {
    return undefined;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
    interlaceMethod: bytes[28]
  };
}

const heroBytes = await readFile(heroImageContract.file);
const heroPng = inspectPng(heroBytes);
if (heroBytes.byteLength !== heroImageContract.byteLength) {
  failures.push(
    `${heroImageContract.file}: expected ${heroImageContract.byteLength} bytes, received ${heroBytes.byteLength}`
  );
}
for (const key of ['width', 'height', 'bitDepth', 'colorType', 'interlaceMethod']) {
  if (!heroPng || heroPng[key] !== heroImageContract[key]) {
    failures.push(
      `${heroImageContract.file}: expected PNG ${key}=${heroImageContract[key]}, received ${heroPng?.[key] ?? 'invalid PNG'}`
    );
  }
}

const suppliedHeroPath = process.argv[2];
if (suppliedHeroPath) {
  const suppliedBytes = await readFile(suppliedHeroPath);
  const suppliedHash = createHash('sha256').update(suppliedBytes).digest('hex');
  if (!suppliedBytes.equals(heroBytes)) {
    failures.push(
      `${suppliedHeroPath}: supplied hero is not byte-for-byte identical to ${heroImageContract.file} ` +
        `(received SHA-256 ${suppliedHash})`
    );
  }
}

const sources = new Map(
  await Promise.all(
    [
      'src/public.css',
      'svelte.config.js',
      'src/routes/+layout.svelte',
      'src/routes/(public)/+page.svelte',
      'src/lib/components/SiteHeader.svelte',
      'src/lib/components/home/HeroSection.svelte',
      'src/lib/components/home/FeatureGrid.svelte',
      'src/lib/content/home.ts'
    ].map(async (file) => [file, await readFile(file, 'utf8')])
  )
);

function compact(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function requireText(file, claim, expected) {
  const source = sources.get(file);
  if (!source || !compact(source).includes(compact(expected))) {
    failures.push(`${file}: missing ${claim}`);
  }
}

function rejectPattern(file, claim, pattern) {
  const source = sources.get(file);
  if (!source || pattern.test(source)) failures.push(`${file}: violates ${claim}`);
}

const css = 'src/public.css';
requireText(css, 'original theme hash', '497733a044053a64d2ff340192b9542306269bde38a55db30308791ee26470ab');
requireText(css, 'Bootstrap hash', 'e9503448692b738dd260fbd7f7cabf2e11f09b600fa97e6eb3a56eba5b1a7e9b');
requireText(
  css,
  'exact self-hosted Roboto 300 face',
  "@font-face { font-family: 'Roboto'; font-style: normal; font-weight: 300; font-display: auto; src: url('/fonts/roboto/roboto-v51-latin-300.woff2') format('woff2'); }"
);
requireText(
  css,
  'desktop hero geometry',
  '.pub-root#home4 #hero { background: #4b4848; background-size: cover; height: 583px; position: relative; top: -60px; overflow: hidden;'
);
requireText(
  css,
  'tablet hero geometry',
  '@media (max-width: 991px) { .pub-root#home4 #hero { padding-top: 100px; height: 550px;'
);
requireText(
  css,
  'mobile hero typography',
  '@media (max-width: 767px) { .pub-root .hidden-xs { display: none !important;'
);
requireText(css, 'mobile hero heading size', '.pub-root#home4 #hero h1.hero-text { font-size: 27px; }');
requireText(css, 'desktop hero grid activation', '@media (min-width: 992px) { .pub-root .container { width: 970px; }');
requireText(css, 'desktop hero image column width', '.pub-root .col-md-8 { width: 66.66666667%; }');
requireText(css, 'desktop hero copy column width', '.pub-root .col-md-4 { width: 33.33333333%; }');
requireText(css, 'desktop hero padding', '.pub-root#home4 #hero { padding-top: 105px; }');
requireText(
  css,
  'fluid hero gutter geometry',
  '.pub-root .container, .pub-root .container-fluid { padding-right: 15px; padding-left: 15px; margin-right: auto; margin-left: auto; }'
);
requireText(
  css,
  'hero image continuous downscaling',
  '.pub-root#home4 #hero .col-md-8 img { /* User-confirmed behavior: shrink to the column, never upscale the source. */ max-width: 100%; }'
);
requireText(
  css,
  'theme button geometry',
  'padding: 13px 32px; font-weight: 400; font-size: 17px; color: #fff !important;'
);
requireText(
  css,
  'small button geometry',
  '.pub-root .button.button-small { padding: 10px 33px; border: 1px solid #68a2ee;'
);
requireText(css, 'Font Awesome 4.0.3 public transform', '.pub-root .fa { transform: none; }');
requireText(css, 'desktop feature offset', '.pub-root#home4 #second-option { margin-top: 85px; }');
requireText(css, 'feature icon size', '.pub-root#home4 #second-option .feature img { max-width: 40px;');
requireText(
  css,
  'mobile section geometry',
  '.pub-root#home4 #mobile { -webkit-font-smoothing: antialiased; background: #f7f8fb; border: 1px solid #eaedf7;'
);
requireText(css, 'CTA geometry', '.pub-root#home4 #cta { margin-top: 100px;');
requireText(
  css,
  'footer geometry',
  '.pub-root #footer { background: #000; margin-top: 120px; padding-top: 47px; padding-bottom: 35px;'
);
requireText(
  css,
  'theme desktop container override',
  "@media (min-width: 1200px) { /* theme.css deliberately overrides Bootstrap's nominal 1170px container. */ .pub-root .container { width: 970px; } }"
);

requireText(
  'svelte.config.js',
  'source root-relative SSR URLs',
  'paths: { // The captured application is hosted at the domain root and emits // root-relative URLs. Keep SvelteKit route resolution without rewriting // SSR output to page-relative forms such as `./contact`. relative: false }'
);
requireText(
  'src/routes/+layout.svelte',
  'home4 public-shell identity',
  "id={page.url.pathname === '/' ? 'home4' : undefined}"
);
requireText(
  'src/routes/+layout.svelte',
  'source consent/header order',
  "{#if page.url.pathname === '/'} <ConsentBanner /> {/if} <SiteHeader"
);
requireText(
  'src/routes/(public)/+page.svelte',
  'base-path-aware hero font asset',
  "const heroFontUrl = asset('/fonts/roboto/roboto-v51-latin-300.woff2');"
);
requireText(
  'src/routes/(public)/+page.svelte',
  'critical hero font preload',
  '<link rel="preload" href={heroFontUrl} as="font" type="font/woff2" crossorigin="anonymous" />'
);
requireText('src/lib/components/SiteHeader.svelte', 'accessible account menu state', 'aria-expanded={accountMenuOpen}');
requireText(
  'src/lib/components/SiteHeader.svelte',
  'source dropdown open class',
  "class={['dropdown', { open: accountMenuOpen }]}"
);
requireText(
  'src/lib/components/home/HeroSection.svelte',
  'exact fluid/8/4 hero grid',
  '<div class="container-fluid"> <h1 class="hero-text" style="text-align: center">{HERO_HEADLINE}</h1> <div class="row"> <div class="col-md-8" style="text-align: center">'
);
requireText(
  'src/lib/components/home/HeroSection.svelte',
  'exact supplied hero source and nonvisual accessibility text',
  '<img src={asset(\'/public/images/ptr_descrived_perspective.png\')} style="height: 95%" alt="ProTradingRoom interface showing trade alerts, group chat, market charts, and HD screen sharing" />'
);
requireText(
  'src/lib/components/home/HeroSection.svelte',
  'static CTA with SvelteKit base-path resolution',
  '<a href={resolve(\'/contact\')} class="button button-large button-primary">Learn More</a>'
);
requireText(
  'src/lib/components/home/HeroSection.svelte',
  'exact selling-list inline styles',
  '<ul style="color: #f0f0f0; padding-bottom: 0px; font-size: 20px; padding-top: 40px">'
);
requireText(
  'src/lib/components/home/HeroSection.svelte',
  'exact literal selling points',
  '<li>White Label!</li> <li>HD Screen-Sharing with no lag!</li> <li>Desktop or Mobile</li> <li>Mobile trade alerts</li> <li>Web based HTML5, No Flash, No Downloads</li> <li>Custom integrations on your site</li> <li>Branding, Recording, Webinars, Stats, and more...</li>'
);
requireText(
  'src/lib/components/home/FeatureGrid.svelte',
  'evidence-backed heading alignment',
  'style:text-align={feature.titleAlign}'
);
requireText(
  'src/lib/components/home/FeatureGrid.svelte',
  'exact feature section shell',
  '<div id="second-option"> <div class="container"> <div class="row">'
);
requireText(
  'src/lib/components/home/FeatureGrid.svelte',
  'exact feature column and icon markup',
  '<div class="col-md-4 feature"> <div style="text-align: center"> <img src={iconSources[feature.icon]} alt={feature.alt} /> </div>'
);
requireText(
  'src/lib/content/home.ts',
  'first feature content and inherited heading alignment',
  "icon: 'locked', alt: '', title: 'Rooms are encrypted & secured', lines: ['All communications use encryption.', 'Encrypted video, audio, and text']"
);
requireText(
  'src/lib/content/home.ts',
  'second feature content and centered heading',
  "icon: 'cloud', alt: '', title: 'Cloud Based', titleAlign: 'center', lines: [ 'No software to install, update, or maintain.', 'Presenters and Users log in from their web enabled devices' ]"
);
requireText(
  'src/lib/content/home.ts',
  'third feature content and centered heading',
  "icon: 'browser', alt: '', title: 'Runs from the web browser. No Flash! No Java!. Pure HTML5 solution.', titleAlign: 'center', lines: ['There is no expensive hardware or software to buy.']"
);

rejectPattern(css, 'original dead hero button classes', /\.pub-root\s+\.button-(?:large|primary)\s*\{/);
rejectPattern('src/routes/(public)/+page.svelte', 'remote runtime font delivery', /fonts\.(?:googleapis|gstatic)\.com/);
rejectPattern(css, 'hero image upscaling', /\.pub-root#home4\s+#hero[^{,]*img\s*\{[^}]*(?<!-)\bwidth\s*:\s*100%/s);
rejectPattern(
  'src/lib/components/home/HeroSection.svelte',
  'single-source hero image on every device',
  /\b(?:srcset|sizes)=|<picture\b/
);
rejectPattern(
  'src/lib/components/home/HeroSection.svelte',
  'verbatim hero without configurable CTA abstraction',
  /\$props|\bPathname\b|\bcta(?:Href|Label)\b/
);
rejectPattern(
  'src/lib/components/home/FeatureGrid.svelte',
  'dimension-free supplied feature images',
  /\b(?:width|height)=/
);

if (failures.length) {
  console.error('Home fidelity contract failed:\n' + failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

const suppliedResult = suppliedHeroPath ? ` Supplied hero ${suppliedHeroPath} is byte-for-byte identical.` : '';
console.log(
  `Home fidelity contract passed (${expectedHashes.size} evidence hashes, exact ${heroImageContract.width}x${heroImageContract.height} PNG metadata, ${heroViewportCases.length} responsive boundary calculations, and critical cascade assertions).${suppliedResult}`
);
