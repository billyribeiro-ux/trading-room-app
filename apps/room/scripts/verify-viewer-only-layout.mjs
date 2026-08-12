/**
 * Renders the two reduced room layouts in real Chromium and measures what the browser draws.
 *
 * Six of the bindings added for viewer-only mode change GEOMETRY, and geometry is exactly what a
 * unit test and a type checker cannot see:
 *
 * - `class:vh-100={chatOnlyMode || viewerOnlyMode}` on `as-split#mainAreaSplit`
 *   (`QB = (t) => ({'vh-100': t})`, `app-room.render-helpers.js:11, 1639-1648`). `.vh-100` is
 *   `height: 100vh !important`, and `chatOnlyMode` is a PRE-EXISTING mode whose split height this
 *   now changes — so it is rendered here as its own case rather than assumed harmless.
 * - `{#if viewerOnlyMode}` removing the alert/chat `as-split-area` entirely
 *   (`hideChatAlerts = viewerOnlyMode`, `app-room.compiled.js:76-77`). A one-child flex split's
 *   sizing is not something the compiler can answer.
 * - `class:viewer-only-screen-tab={viewerOnlyMode}` on `div#screensTabsContent` (const 72), whose
 *   rule is `height: 100% !important; max-height: calc(-40px + 100vh) !important` — the 40px being
 *   `ul#mainTabs`, which is `hidden` in the same mode.
 *
 * ## What this can and cannot prove — read this before trusting the output
 *
 * It CANNOT diff against the reference's own pixels. No capture of this product in viewer-only or
 * chat-only mode exists in this repository: `HANDOFF.md` records that the volume trigger "has never
 * rendered in any capture" for exactly that reason, and the same is true of the layout around it.
 * So there is no `evidence-*.json` to compare rects with, the way
 * `verify-tooltip-placements.mjs` compares against a captured tooltip.
 *
 * What it CAN prove, and does, is that the rules the reference's own stylesheet declares actually
 * take effect on the elements this app renders them on: the split is exactly one viewport tall, the
 * surviving column occupies the full width, the tab strip is not painted, and the screens content
 * is 40px short of the viewport. Those are the reference's numbers even though the screenshot is
 * ours.
 *
 * Writes a PNG per layout and exits non-zero on any mismatch.
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
const OUT = resolve(ROOT, 'evidence-viewer-only');
mkdirSync(OUT, { recursive: true });

// The same five sheets `src/app.css` imports, in its order — see `verify-screen-volume.mjs` for why
// loading fewer produces confident nonsense.
const roomRequire = createRequire(resolve(ROOT, 'package.json'));
const CSS = [
  readFileSync(resolve(ROOT, 'css/complete-app-styles.css'), 'utf8'),
  readFileSync(roomRequire.resolve('@fortawesome/fontawesome-free/css/all.min.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/tokens.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/captured-runtime-components.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/app.css'), 'utf8').replace(/^@import[^\n]*\n/gm, '')
].join('\n');

const VIEWPORT = { width: 1280, height: 800 };

/**
 * The room shell, in the three shapes this app can now render it.
 *
 * `full` is the control: both columns, no `vh-100`. Without it a measurement of the reduced layouts
 * says nothing — "the split is 800px tall" is only interesting if the unreduced one is not.
 */
function shell({ vh100, chatColumn, viewerOnly, chrome, mtZero }) {
  const chat = chatColumn
    ? `<as-split-area minsize="0" class="alert-chat-box alert-chat-regular as-split-area"
          style="order: 0; flex: 0 0 calc(40% - 4.4px);">
         <div style="height:100%;background:#1b2733"></div>
       </as-split-area>
       <div role="separator" class="as-split-gutter" style="flex-basis: 11px; order: 1;"></div>`
    : '';
  /*
    THE CHROME — the navbar and the sidebar, and the 49px they reserve.

    Absent from this fixture until 2026-08-12, which is why `4/4` could not catch the defect
    `f9e1890` fixes: the harness measured the split, `#mainTabs` and the video, and never the two
    elements beside them. `grep -c "room-sidebar\\|mainAppNav\\|mt-0"` returned 0.

    Upstream both are gated on ONE condition, evaluated twice
    (`docs/source/components/app-room.full.js:4043-4059`):

      O(3, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 3)   // the sidebar
      O(4, videoOnlyMode || chatOnlyMode || viewerOnlyMode ? -1 : 4)   // the navbar

    and the root div binds `KAe = (t, n) => ({'push-wrapper': t, 'mt-0': n})` with `n` as that same
    flag (`:4029-4039`). The 49px is not decoration: `app-room .wrapper` carries
    `margin-top: 49px` (`src/lib/styles/captured-runtime-components.css:1099-1138`) as space
    reserved FOR the `fixed-top` navbar. Remove the navbar without `mt-0` and the gap stays — and a
    `vh-100` split under a 49px gap ends 49px BELOW the window, which is the whole defect.
  */
  const navbarAndSidebar = chrome
    ? `<div class="room-sidebar" style="width:0"></div>
       <nav class="navbar navbar-expand-md navbar-dark fixed-top mainAppNav" style="height:49px;background:#1b2733">
         <span class="users ml-1 mr-1 d-flex align-items-center"><i class="fas fa-user"></i></span>
       </nav>`
    : '';
  return `
  <app-room id="topRoomDiv" class="lightTheme">
    <div class="wrapper${mtZero ? ' mt-0' : ''}">
      <div class="d-flex flex-column-reverse flex-sm-row room-container">
        ${navbarAndSidebar}
        <as-split minsize="0" id="mainAreaSplit" class="as-horizontal as-percent as-init${vh100 ? ' vh-100' : ''}" dir="ltr">
          ${chat}
          <as-split-area minsize="0" class="presentation-box as-split-area"
              style="order: 2; flex: 0 0 calc(${chatColumn ? '60%' : '100%'} - 6.6px);">
            <app-presentationarea>
              <div class="mainPresentationAreaHolder">
                <ul id="mainTabs" class="nav nav-tabs mainTabset" role="tablist"${viewerOnly ? ' hidden' : ''}>
                  <li role="presentation" class="nav-item"><a class="nav-link active" role="tab">
                    <div class="d-flex"><div><i class="fas fa-desktop"></i><span class="ml-1">Screens</span></div></div>
                  </a></li>
                </ul>
                <div id="mainTabsContent" class="tab-content">
                  <div id="screens" class="tab-pane fade show active" role="tabpanel">
                    <ul id="screenTabs" role="tablist" class="nav nav-tabs screens-tabs">
                      <li role="presentation" class="nav-item"><a class="nav-link active" role="tab">
                        <span class="mx-1">Trendy Jon-FUTURES</span></a></li>
                    </ul>
                    <div id="screensTabsContent" class="tab-content${viewerOnly ? ' viewer-only-screen-tab' : ''}">
                      <div class="tab-pane fade show active" role="tabpanel">
                        <div class="video-screen-container">
                          <div class="pan-zoom-frame"><div class="pan-element">
                            <div class="webcamScreen${viewerOnly ? ' viewer-only-screen-video' : ''}"
                                 style="background:#0d1b26"></div>
                          </div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </app-presentationarea>
          </as-split-area>
        </as-split>
      </div>
    </div>
  </app-room>`;
}

/*
  `chrome` and `mtZero` are the two halves of one upstream condition, so they move together: a room
  that keeps its navbar keeps the 49px reserved for it, and a room that drops the navbar drops the
  gap. Rendering them independently is exactly the state `f9e1890` fixed, and the negative controls
  at the bottom of this file re-create each half on purpose.
*/
const CASES = [
  {
    name: 'full-room',
    vh100: false,
    chatColumn: true,
    viewerOnly: false,
    columns: 2,
    chrome: true,
    mtZero: false
  },
  {
    name: 'chat-only',
    vh100: true,
    chatColumn: true,
    viewerOnly: false,
    columns: 2,
    chrome: false,
    mtZero: true
  },
  {
    name: 'viewer-only',
    vh100: true,
    chatColumn: false,
    viewerOnly: true,
    columns: 1,
    chrome: false,
    mtZero: true
  }
];

/*
  A real HTTP origin, for the same reason `verify-screen-volume.mjs` needs one: `page.setContent()`
  gives an opaque origin and Chromium refuses `file://` font fetches from it, so every glyph paints
  as a fallback box. Shared helper, because the defect was in all three harnesses.
*/
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
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });

const results = [];
let failures = 0;

for (const testCase of CASES) {
  server.setHtml(
    `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style>
     <style>
       html, body { margin:0; height:100%; background:#2b3e50; }
       .wrapper, .room-container { height:100%; }
       as-split { display:flex; width:100%; }
       as-split-area { overflow:hidden; }
       .as-split-gutter { background:#33475b; }
     </style></head><body>${shell(testCase)}</body></html>`
  );
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const measured = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { width: +box.width.toFixed(2), height: +box.height.toFixed(2) };
    };
    const split = document.querySelector('#mainAreaSplit');
    const splitBox = split.getBoundingClientRect();
    return {
      split: rect('#mainAreaSplit'),
      /*
        The defect, made measurable: where the split ENDS relative to the window. A `vh-100` split
        that starts 49px down ends 49px below the fold, and every previous assertion here — height,
        areas, max-height — passes while it does.
      */
      splitTop: +splitBox.top.toFixed(2),
      splitBottom: +splitBox.bottom.toFixed(2),
      navbarPresent: document.querySelector('.mainAppNav') !== null,
      sidebarPresent: document.querySelector('.room-sidebar') !== null,
      wrapperMarginTop: getComputedStyle(document.querySelector('.wrapper')).marginTop,
      wrapperHasMtZero: document.querySelector('.wrapper').classList.contains('mt-0'),
      presentation: rect('.presentation-box'),
      chatColumn: rect('.alert-chat-box'),
      areas: split.querySelectorAll('as-split-area').length,
      hasVh100: split.classList.contains('vh-100'),
      mainTabsDisplay: getComputedStyle(document.querySelector('#mainTabs')).display,
      screensContent: rect('#screensTabsContent'),
      screensMaxHeight: getComputedStyle(document.querySelector('#screensTabsContent')).maxHeight,
      videoMaxHeight: getComputedStyle(document.querySelector('.webcamScreen')).maxHeight
    };
  });

  const problems = [];
  const viewportHeight = VIEWPORT.height;

  if (measured.areas !== testCase.columns) {
    problems.push(`${measured.areas} split areas, expected ${testCase.columns}`);
  }

  /*
    The expectation is tied to WHICH LAYOUT this is, not to the flag that renders it.

    The first version derived both from `testCase.vh100`, so flipping that flag flipped the
    assertion with it and the case could not fail — a check that restates its own input, which is
    the failure mode this repository's rules name explicitly. `QB` gives the class to EVERY reduced
    layout, so the identity of the case is what demands it.

    Measured, with the class removed from the viewer-only case: the same markup renders at 751px
    instead of 800px. That is what makes the number below evidence rather than a coincidence.
  */
  const mustBeReduced = testCase.name !== 'full-room';

  /*
    THE CHROME AND THE 49px, which is what `f9e1890` fixed and what this harness could not see.

    Tied to the case's identity, not to the flags that render it — the same rule the `vh-100` check
    below already learned: `O(3, …)` and `O(4, …)` remove the sidebar and the navbar in every
    reduced mode, and `KAe`'s second argument turns the reserved 49px off in exactly those modes.
  */
  if (measured.navbarPresent === mustBeReduced) {
    problems.push(
      `the navbar is ${measured.navbarPresent ? 'present' : 'absent'} in ${testCase.name}; O(4, …) removes it in every reduced mode`
    );
  }
  if (measured.sidebarPresent === mustBeReduced) {
    problems.push(
      `the sidebar is ${measured.sidebarPresent ? 'present' : 'absent'} in ${testCase.name}; O(3, …) carries the same gate`
    );
  }
  const expectedMargin = mustBeReduced ? '0px' : '49px';
  if (measured.wrapperMarginTop !== expectedMargin) {
    problems.push(
      `.wrapper margin-top is ${measured.wrapperMarginTop} in ${testCase.name}, expected ${expectedMargin} — the 49px is space reserved for a navbar that ${mustBeReduced ? 'is not there' : 'is'}`
    );
  }
  /*
    And the consequence, which is the reason any of it matters: nothing may end below the fold. A
    `vh-100` split starting at a 49px offset ends at 849 in an 800px window, i.e. 49px of the room
    is unreachable. This is the assertion the old fixture had no elements to make.
  */
  if (measured.splitBottom > viewportHeight + 0.5) {
    problems.push(
      `the split ends at ${measured.splitBottom}px in a ${viewportHeight}px window — ${(measured.splitBottom - viewportHeight).toFixed(0)}px of the room is off-screen`
    );
  }
  if (measured.hasVh100 !== mustBeReduced) {
    problems.push(
      `vh-100 is ${measured.hasVh100 ? 'present' : 'absent'} on ${testCase.name}; QB gives it to every reduced layout`
    );
  }
  if (mustBeReduced) {
    // `.vh-100 { height: 100vh !important }` — exactly one viewport, not "roughly".
    if (Math.abs(measured.split.height - viewportHeight) > 0.5) {
      problems.push(`split is ${measured.split.height}px tall, .vh-100 demands ${viewportHeight}`);
    }
  } else if (measured.split.height >= viewportHeight) {
    // The control: without the class the split is NOT pinned to the viewport.
    problems.push('the unreduced split should not already be a full viewport tall');
  }

  if (testCase.columns === 1) {
    if (measured.chatColumn !== null) problems.push('the chat column is still in the document');
    // One child, and it takes the whole width — a flex basis of `calc(100% - 6.6px)` with no
    // sibling and no gutter.
    if (measured.presentation.width < measured.split.width - 12) {
      problems.push(
        `presentation column is ${measured.presentation.width}px of ${measured.split.width}px`
      );
    }
    if (measured.mainTabsDisplay !== 'none') {
      problems.push(`ul#mainTabs is ${measured.mainTabsDisplay}, viewer-only mode hides it`);
    }
    // `.viewer-only-screen-tab { max-height: calc(-40px + 100vh) !important }`
    const expected = viewportHeight - 40;
    if (measured.screensMaxHeight !== `${expected}px`) {
      problems.push(
        `#screensTabsContent max-height is ${measured.screensMaxHeight}, expected ${expected}px`
      );
    }
    if (measured.videoMaxHeight !== '100%') {
      problems.push(
        `.viewer-only-screen-video max-height is ${measured.videoMaxHeight}, expected 100%`
      );
    }
  } else {
    if (measured.chatColumn === null) problems.push('the chat column should still be rendered');
    if (measured.mainTabsDisplay === 'none') problems.push('ul#mainTabs must stay visible here');
    if (measured.screensMaxHeight !== 'none') {
      problems.push(
        `#screensTabsContent has max-height ${measured.screensMaxHeight} in a normal room`
      );
    }
    if (measured.videoMaxHeight !== 'none') {
      problems.push(`the video has max-height ${measured.videoMaxHeight} in a normal room`);
    }
  }

  /*
    TWO captures per case, and the second is the one that carries the claim.

    `fullPage` shows the room. But `vh-100` changes an UNPAINTED box — the split has no background of
    its own — so a full-page shot of `full-room` and `chat-only` is legitimately identical even
    though their splits are 751px and 800px. The element capture is bounded BY that box, so a 49px
    difference becomes a different image size and therefore different bytes. Asserting on the page
    shot alone is what let this script write one file twice and call it two results.
  */
  const pageShot = resolve(OUT, `${testCase.name}.png`);
  const splitShot = resolve(OUT, `${testCase.name}-split.png`);
  await page.screenshot({ path: pageShot, fullPage: true });
  await page.locator('#mainAreaSplit').screenshot({ path: splitShot });
  results.push({
    ...testCase,
    ok: problems.length === 0,
    problems,
    measured,
    png: `${testCase.name}.png`,
    splitPng: `${testCase.name}-split.png`,
    digest: await fileDigest(pageShot),
    splitDigest: await fileDigest(splitShot)
  });
  failures += problems.length ? 1 : 0;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '}  ${testCase.name.padEnd(12)} → ` +
      `${measured.areas} area(s), split ${measured.split.height}px, ` +
      `screens max-height ${measured.screensMaxHeight}` +
      (problems.length ? `\n      ${problems.join('\n      ')}` : '')
  );
}

/*
  THE IMAGES HAVE TO DIFFER where the layouts do.

  This script wrote `full-room.png` and `chat-only.png` byte-identical while its own
  `measurements.json` recorded 751px against 800px, and reported 3/3. The pictures were a check that
  could not fail.

  Which pairing carries which claim:
  - the SPLIT captures must all differ — every case has a different split box (751×?, 800×2 columns,
    800×1 column);
  - the PAGE captures must differ between one-column and two-column layouts, but full-room and
    chat-only may legitimately match, because `vh-100` resizes a box nothing paints. Demanding a
    difference there would be demanding one the browser has no reason to produce.
*/
const splitDigests = new Map(results.map((entry) => [entry.name, entry.splitDigest]));
const pageDigests = new Map(results.map((entry) => [entry.name, entry.digest]));
const imageProblems = [];
for (const [left, right] of [
  ['full-room', 'chat-only'],
  ['chat-only', 'viewer-only'],
  ['full-room', 'viewer-only']
]) {
  if (splitDigests.get(left) === splitDigests.get(right)) {
    imageProblems.push(
      `${left}-split.png and ${right}-split.png are byte-identical (${splitDigests.get(left)?.slice(0, 12)}…)`
    );
  }
}
if (pageDigests.get('chat-only') === pageDigests.get('viewer-only')) {
  imageProblems.push('chat-only.png and viewer-only.png are byte-identical');
}
failures += imageProblems.length ? 1 : 0;
results.push({
  name: 'image distinctness',
  ok: imageProblems.length === 0,
  problems: imageProblems,
  measured: { split: Object.fromEntries(splitDigests), page: Object.fromEntries(pageDigests) }
});
console.log(
  `${imageProblems.length ? 'FAIL' : 'ok  '}  images       → ` +
    `${splitDigests.size} split captures, ${pageDigests.size} page captures` +
    (imageProblems.length ? `\n      ${imageProblems.join('\n      ')}` : '')
);

writeFileSync(
  resolve(OUT, 'measurements.json'),
  JSON.stringify({ viewport: VIEWPORT, cases: results }, null, 2)
);
await browser.close();
await server.close();
console.log(`\n${results.length - failures}/${results.length} layouts render correctly`);
console.log(`screenshots + measurements: ${OUT}`);
console.log(
  'NOTE: no capture of this product in viewer-only or chat-only mode exists, so this measures the\n' +
    "reference's own CSS rules taking effect on our elements — not a pixel diff against its output."
);
process.exit(failures ? 1 : 0);
