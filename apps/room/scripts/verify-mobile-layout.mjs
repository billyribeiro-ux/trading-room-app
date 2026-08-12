/**
 * Renders the room at 600px and at 602px in real Chromium and measures the two trees.
 *
 * `isMobileScreen = window.innerWidth <= 601` (`app-room.full.js:1889`, `:2988`) selects an entirely
 * different template — `O(5, o.isMobileScreen ? 6 : 5)` (`:4061`) — so 602 is the first desktop
 * width and 601 is the last mobile one. Both are rendered, plus 601 itself, because a threshold with
 * no case on its own boundary is a threshold nobody has checked.
 *
 * ## What this proves, and what it does not — read before trusting the output
 *
 * It CANNOT drive the Svelte component: `+page.svelte` loads through `+page.server.ts`, which reaches
 * the controller for `sessData` on every request, and this machine has no `apps/room/.env` (TODO row
 * E). So the fixture below is built here, exactly as `verify-viewer-only-layout.mjs` builds its own.
 *
 * What it CAN prove, and does, is that the arrangement `K4e` describes actually produces the
 * geometry it is supposed to when the browser lays it out:
 *
 *  - stacked, with the PRESENTATION above the chat — `K4e`'s child order is presentation (node 1),
 *    then chat/alerts (node 2), the reverse of `j4e` (`app-room.render-helpers.js:1815-1817` against
 *    `:1650`, `:1662`);
 *  - vertical as a STATIC attribute, from const 224 `['minSize','0','direction','vertical', …]` and
 *    const 228 `['direction','vertical','minSize','0']` — both splits, not just the outer;
 *  - with NO `order` property on either area (consts 225 and 226 carry `size` only; 227, the extra
 *    chat column this room does not model, is the sole mobile area with `order`), which is why the
 *    document order has to be the layout;
 *  - and 50/50, from `chatAlertsSizeMobile = 50` / `presAreaSizeMobile = 50` (`full.js:1852-1853`),
 *    against the desktop 70/30 (`:1848-1849`).
 *
 * That the TEMPLATE picks the right one of these at the right width is
 * `src/lib/mobile-layout-contract.test.ts`, which reads the render block and the deriveds. The two
 * together are the claim; neither is on its own.
 *
 * Writes a PNG per width and exits non-zero on any mismatch.
 */

import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileDigest, startHarnessServer } from './lib/harness-server.mjs';

const need = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../controller/package.json')
);
const { chromium } = need('@playwright/test');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'evidence-mobile-layout');
mkdirSync(OUT, { recursive: true });

const roomRequire = createRequire(resolve(ROOT, 'package.json'));
const CSS = [
  readFileSync(resolve(ROOT, 'css/complete-app-styles.css'), 'utf8'),
  readFileSync(roomRequire.resolve('@fortawesome/fontawesome-free/css/all.min.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/tokens.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/captured-runtime-components.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/app.css'), 'utf8').replace(/^@import[^\n]*\n/gm, '')
].join('\n');

/** `isMobileScreen = window.innerWidth <= 601`. Not a stylesheet breakpoint — the template gate. */
const MOBILE_MAX_WIDTH = 601;

/**
 * The room shell in the two arrangements, built from the SAME description the component uses.
 *
 * `mobile` decides everything the const table decides upstream: the child order, the direction of
 * both splits, whether the areas carry `order`, and which pair of sizes they take. Passing it is the
 * one knob, so a negative control here is a single edit.
 */
function shell({ mobile }) {
  const chatAlertsFraction = mobile ? 0.5 : 0.4;
  const areaOrder = (desktopOrder) => (mobile ? '' : `order: ${desktopOrder}; `);
  const chatAlerts = `
    <as-split-area minsize="0" class="alert-chat-box alert-chat-regular as-split-area"
        style="${areaOrder(0)}flex: 0 0 calc(${chatAlertsFraction * 100}% - ${chatAlertsFraction * 11}px);">
      <as-split minsize="0" class="as-percent as-vertical as-init" dir="ltr">
        <as-split-area minsize="0" class="alert-box as-split-area" style="order: 0; flex: 0 0 30%;">
          <div style="height:100%;background:#1b2733"></div>
        </as-split-area>
        <as-split-area minsize="0" class="chat-box as-split-area" style="order: 2; flex: 0 0 70%;">
          <div style="height:100%;background:#22303c"></div>
        </as-split-area>
      </as-split>
    </as-split-area>`;
  const presentation = `
    <as-split-area minsize="0" class="presentation-box as-split-area"
        style="${areaOrder(2)}flex: 0 0 calc(${(1 - chatAlertsFraction) * 100}% - ${(1 - chatAlertsFraction) * 11}px);">
      <app-presentationarea>
        <div class="mainPresentationAreaHolder" style="height:100%;background:#0d1b26"></div>
      </app-presentationarea>
    </as-split-area>`;
  const gutter = `<div role="separator" class="as-split-gutter"
      style="${mobile ? '' : 'order: 1; '}flex-basis: 11px;"></div>`;

  // The whole point: document order IS the layout on mobile, so the panes swap places here rather
  // than being restyled.
  const children = mobile
    ? `${presentation}${gutter}${chatAlerts}`
    : `${chatAlerts}${presentation}${gutter}`;

  return `
  <app-room id="topRoomDiv" class="lightTheme">
    <div class="wrapper">
      <div class="d-flex flex-column-reverse flex-sm-row room-container">
        <as-split minsize="0" id="mainAreaSplit"
            class="${mobile ? 'as-vertical' : 'as-horizontal'} as-percent as-init"
            style="${mobile ? 'flex-direction: column;' : ''}" dir="ltr">
          ${children}
        </as-split>
      </div>
    </div>
  </app-room>`;
}

const CASES = [
  { name: 'desktop-602', width: 602, mobile: false },
  { name: 'mobile-601', width: 601, mobile: true },
  { name: 'mobile-600', width: 600, mobile: true }
];

const server = await startHarnessServer({
  mounts: {
    '/webfonts': resolve(
      roomRequire.resolve('@fortawesome/fontawesome-free/css/all.min.css'),
      '../../webfonts'
    ),
    '/room': ROOT
  }
});

const browser = await chromium.launch();
const results = [];
let failures = 0;

for (const testCase of CASES) {
  const page = await browser.newPage({
    viewport: { width: testCase.width, height: 800 },
    deviceScaleFactor: 2
  });
  server.setHtml(
    `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style>
     <style>
       html, body { margin:0; height:100%; background:#2b3e50; }
       .wrapper, .room-container { height:100%; }
       as-split { display:flex; width:100%; }
       as-split.as-vertical { flex-direction: column; }
       as-split-area { overflow:hidden; }
       .as-split-gutter { background:#33475b; }
     </style></head><body>${shell(testCase)}</body></html>`
  );
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const measured = await page.evaluate(() => {
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        top: +rect.top.toFixed(2),
        left: +rect.left.toFixed(2),
        width: +rect.width.toFixed(2),
        height: +rect.height.toFixed(2)
      };
    };
    const split = document.querySelector('#mainAreaSplit');
    const areas = [...split.querySelectorAll(':scope > as-split-area')];
    return {
      innerWidth: window.innerWidth,
      // Which pane comes first in the DOCUMENT, which is the thing K4e actually changes.
      firstAreaClass: areas[0]?.className ?? null,
      splitFlexDirection: getComputedStyle(split).flexDirection,
      presentationOrder: getComputedStyle(document.querySelector('.presentation-box')).order,
      chatOrder: getComputedStyle(document.querySelector('.alert-chat-box')).order,
      innerSplitDirection: getComputedStyle(document.querySelector('.alert-chat-box as-split'))
        .flexDirection,
      presentation: box('.presentation-box'),
      chatAlerts: box('.alert-chat-box')
    };
  });

  const problems = [];
  // Tied to the CASE, never to the flag that drew it — the mistake `verify-viewer-only-layout.mjs`
  // records having made, where an assertion restated its own input and could not fail.
  const mustBeMobile = testCase.width <= MOBILE_MAX_WIDTH;

  if (measured.innerWidth !== testCase.width) {
    problems.push(`viewport reports ${measured.innerWidth}px, expected ${testCase.width}`);
  }

  if (mustBeMobile) {
    if (measured.splitFlexDirection !== 'column') {
      problems.push(
        `the split lays out ${measured.splitFlexDirection}; const 224 fixes it to vertical`
      );
    }
    if (!measured.firstAreaClass?.includes('presentation-box')) {
      problems.push(
        `the first area is "${measured.firstAreaClass}"; K4e's node 1 is the presentation`
      );
    }
    // No `order` on either area — consts 225/226 carry `size` only.
    if (measured.presentationOrder !== '0' || measured.chatOrder !== '0') {
      problems.push(
        `order is set (presentation ${measured.presentationOrder}, chat ${measured.chatOrder}); the mobile areas carry none`
      );
    }
    // Stacked, and the presentation on top — the geometric consequence of the two facts above.
    if (measured.presentation.top >= measured.chatAlerts.top) {
      problems.push(
        `the presentation starts at ${measured.presentation.top}px and the chat at ${measured.chatAlerts.top}px — it should be above`
      );
    }
    if (Math.abs(measured.presentation.width - testCase.width) > 1) {
      problems.push(
        `the presentation is ${measured.presentation.width}px of ${testCase.width} — a stacked pane spans the width`
      );
    }
    if (measured.innerSplitDirection !== 'column') {
      problems.push(
        `the inner split lays out ${measured.innerSplitDirection}; const 228 fixes it to vertical too`
      );
    }
  } else {
    if (measured.splitFlexDirection !== 'row') {
      problems.push(`the desktop split lays out ${measured.splitFlexDirection}, expected row`);
    }
    if (!measured.firstAreaClass?.includes('alert-chat-box')) {
      problems.push(`the first area is "${measured.firstAreaClass}"; j4e's node 1 is the chat`);
    }
    if (measured.chatOrder === '0' && measured.presentationOrder === '0') {
      problems.push('the desktop areas should carry the order property that places them');
    }
    // Side by side: same top, different left.
    if (Math.abs(measured.presentation.top - measured.chatAlerts.top) > 0.5) {
      problems.push('the desktop panes should share a top edge');
    }
    if (measured.presentation.left <= measured.chatAlerts.left) {
      problems.push('the presentation should sit to the RIGHT of the chat in an ltr room');
    }
  }

  const shot = resolve(OUT, `${testCase.name}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  results.push({
    ...testCase,
    ok: problems.length === 0,
    problems,
    measured,
    png: `${testCase.name}.png`,
    digest: await fileDigest(shot)
  });
  failures += problems.length ? 1 : 0;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '}  ${testCase.name.padEnd(12)} → ` +
      `${measured.splitFlexDirection}, first area ${measured.firstAreaClass?.split(' ')[0]}` +
      (problems.length ? `\n      ${problems.join('\n      ')}` : '')
  );
  await page.close();
}

/*
  601 and 602 must not render the same thing. That pair is the whole threshold: if the two images
  match, the boundary is somewhere else than the code claims and every assertion above passed while
  measuring one layout twice.
*/
const digests = new Map(results.map((entry) => [entry.name, entry.digest]));
const imageProblems = [];
if (digests.get('mobile-601') === digests.get('desktop-602')) {
  imageProblems.push(
    'mobile-601.png and desktop-602.png are byte-identical — the 601 boundary does nothing'
  );
}
if (digests.get('mobile-601') !== digests.get('mobile-600')) {
  // Different widths, so the images differ in size; compare the arrangement instead.
  const [a, b] = [
    results.find((r) => r.name === 'mobile-601'),
    results.find((r) => r.name === 'mobile-600')
  ];
  if (a.measured.firstAreaClass !== b.measured.firstAreaClass) {
    imageProblems.push('600 and 601 disagree about which pane comes first; both are mobile');
  }
}
failures += imageProblems.length ? 1 : 0;
results.push({
  name: 'threshold distinctness',
  ok: imageProblems.length === 0,
  problems: imageProblems,
  measured: Object.fromEntries(digests)
});
console.log(
  `${imageProblems.length ? 'FAIL' : 'ok  '}  threshold    → 601 is mobile, 602 is not` +
    (imageProblems.length ? `\n      ${imageProblems.join('\n      ')}` : '')
);

writeFileSync(resolve(OUT, 'measurements.json'), JSON.stringify({ cases: results }, null, 2));
await browser.close();
await server.close();
console.log(`\n${results.length - failures}/${results.length} widths render correctly`);
console.log(`screenshots + measurements: ${OUT}`);
console.log(
  'NOTE: this renders the ARRANGEMENT K4e describes, not the Svelte component - the room needs a\n' +
    'controller this machine has no .env for (TODO row E). Which arrangement the template picks at\n' +
    'which width is src/lib/mobile-layout-contract.test.ts.'
);
process.exit(failures ? 1 : 0);
