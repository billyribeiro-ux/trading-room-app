/**
 * Renders the screen overlay's volume control in real Chromium and measures what the browser draws.
 *
 * jsdom reports every rect as zero and resolves no stylesheet, so no vitest run in this repository
 * can answer the two questions that decide whether this control actually works:
 *
 * 1. **Does the trigger render EMPTY at audioVolume 50 and 4?** Every branch in the reference's
 *    `hSe` is a strict inequality, so both boundaries fall through all three. A port that quietly
 *    widened one would look right in every unit test and paint a different button here.
 * 2. **Are `volumeControl`, `volCtrl`, `room-sound-options` and `#dropdownVolume` PAINTED?** A class
 *    with no rule is invisible in a DOM assertion and obvious on screen. `app-presentationarea`'s
 *    own stylesheet gives all four a rule (`app-presentationarea.compiled.js:3290`); this proves the
 *    sheet this app actually serves does too.
 *
 * What is real here and what is not, stated so the result can be trusted:
 *
 * - **The icon decision is the REAL module.** `src/lib/screen-volume.ts` is loaded with its types
 *   stripped by Node's own `stripTypeScriptTypes` — not a re-description, which could pass while the
 *   shipped module was broken. Same technique as `verify-tooltip-placements.mjs`.
 * - **The stylesheets are the REAL ones** — all five that `src/app.css` imports, in its order. See
 *   the note on `CSS` below: loading only one of them is what made the first run report four rules
 *   as missing.
 * - **The markup around the icon is written here.** Compiling `ScreenVolumeControl.svelte` would
 *   need the Svelte compiler and a client runtime in the page; instead the markup is asserted
 *   attribute-for-attribute against the decoded const table by
 *   `src/lib/screen-volume-contract.test.ts`, and what this script proves is the pixels those
 *   classes produce. Both halves together are the claim; neither alone is.
 *
 * ## Which artifact carries which claim
 *
 * `measurements.json` proves the ICON IDENTITY (`iconClass`, straight from the real module) and the
 * GEOMETRY (the 31px trigger, the 129×32 slider, the painted classes). The PNGs prove the states
 * RENDER DIFFERENTLY FROM EACH OTHER — which is a separate claim, and one this script used to make
 * falsely: it wrote one byte-identical file for four different volume states and did not notice.
 * Every capture is now hashed and the states that must differ are asserted to differ.
 *
 * Writes a PNG per volume value plus a JSON of the measurements, and exits non-zero on any
 * mismatch, so it is usable as a gate.
 */

import { createRequire, stripTypeScriptTypes } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileDigest, startHarnessServer } from './lib/harness-server.mjs';

// `@playwright/test` is a devDependency of `apps/controller`; resolved from there rather than
// declared here, exactly as `verify-tooltip-placements.mjs` does and for the same reason — a
// dependency change is the one category that mandates a full-gate run.
const need = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../controller/package.json')
);
const { chromium } = need('@playwright/test');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'evidence-screen-volume');
mkdirSync(OUT, { recursive: true });

const MODULE = stripTypeScriptTypes(
  readFileSync(resolve(ROOT, 'src/lib/screen-volume.ts'), 'utf8')
);

/**
 * THE CASCADE THE APP ACTUALLY SERVES, in `src/app.css`'s own order.
 *
 * The first run of this script loaded `css/complete-app-styles.css` alone — the sheet
 * `verify-tooltip-placements.mjs` needs — and reported four missing rules. That was the harness:
 * `app.css` imports five sheets, and `#dropdownVolume`, `.volumeControl` and `.room-sound-options`
 * are Angular component styles, which live in `src/lib/styles/captured-runtime-components.css`.
 * Measuring against one of five sheets and calling the result "the class has no rule" is exactly the
 * manufactured defect the repository's rules warn about.
 *
 * Font Awesome is resolved from the package the app depends on and SERVED OVER HTTP, so the woff2
 * faces load and each icon paints its real glyph. An earlier version of this script built the page
 * with `page.setContent()`, which gives an opaque origin Chromium refuses `file://` font fetches
 * from; every glyph was a fallback box and the script carried a comment disclaiming it. Four volume
 * states then produced ONE byte-identical PNG, because a fallback box looks the same whichever
 * glyph was asked for. The origin is the fix; `scripts/lib/harness-server.mjs` is where it lives.
 */
const roomRequire = createRequire(resolve(ROOT, 'package.json'));
const CSS = [
  readFileSync(resolve(ROOT, 'css/complete-app-styles.css'), 'utf8'),
  readFileSync(roomRequire.resolve('@fortawesome/fontawesome-free/css/all.min.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/tokens.css'), 'utf8'),
  readFileSync(resolve(ROOT, 'src/lib/styles/captured-runtime-components.css'), 'utf8'),
  // `app.css`'s own rules, minus the five `@import`s inlined above and around this line.
  readFileSync(resolve(ROOT, 'src/app.css'), 'utf8').replace(/^@import[^\n]*\n/gm, '')
].join('\n');

/**
 * Each icon class mapped to the codepoint FONT AWESOME'S OWN stylesheet gives it, e.g.
 * `.fa-volume-up:before{content:"\f028"}`.
 *
 * Parsed from the shipped CSS rather than typed here: the expectation then comes from the package
 * the app depends on, and a version bump that moved a codepoint would surface as a failure instead
 * of agreeing with a number somebody wrote down once.
 */
const ICON_CODEPOINTS = new Map(
  [
    ...readFileSync(
      roomRequire.resolve('@fortawesome/fontawesome-free/css/all.min.css'),
      'utf8'
    ).matchAll(/\.(fa-[a-z0-9-]+):before\{content:"\\([0-9a-f]+)"\}/g)
  ].map(([, name, hex]) => [name, `U+${hex.toUpperCase()}`])
);

/**
 * The six values the contract test names, and what the reference paints at each.
 *
 * 50 and 4 are the two that matter: `null` means the button renders with NO icon inside it.
 */
const CASES = [
  { audioVolume: 0, icon: 'fa-volume-off' },
  { audioVolume: 4, icon: null },
  { audioVolume: 5, icon: 'fa-volume-down' },
  { audioVolume: 50, icon: null },
  { audioVolume: 51, icon: 'fa-volume-up' },
  { audioVolume: 100, icon: 'fa-volume-up' }
];

/**
 * The overlay cluster, with the menu forced open (`.show`) so the menu's own rules are measurable.
 *
 * WRAPPED IN `<app-presentationarea>`, and that is load-bearing rather than decorative. This
 * component's styles are served through `src/lib/styles/captured-runtime-components.css`, which
 * scopes every rule Angular emitted with `[_ngcontent-%COMP%]` under the component's own host
 * element — the same way `+page.svelte` renders them. The first run of this script omitted the
 * wrapper and reported four missing rules; that was the harness, not the sheet.
 */
const MARKUP = `
  <app-presentationarea>
  <li class="nav-item ms-auto">
    <div class="zoom-controls-container position-relative">
      <button type="button" id="dropdownVolume" data-bs-toggle="dropdown" class="btn btn-sm btn-dark"></button>
      <div aria-labelledby="dropdownVolume" class="dropdown-menu volumeControl show" style="display:block">
        <h4>Volume <span data-bs-toggle="dropdown" class="float-right mr-2"><i class="fas fa-times"></i></span></h4>
        <input audiovolslider="" type="range" min="0" max="100" title="Volume" class="mx-auto py-2 volCtrl" />
        <br />
        <button type="button" title="Mute Audio" class="btn btn-primary btn-sm">Mute</button>
        <hr />
        <div class="room-sound-options">
          <div class="my-1">
            <input type="checkbox" value="Presenter audiob" title="Presenter audio" class="form-check-input"
                   name="talkingPresenter0-donot-disturb" id="talkingPresenter0-donot-disturb" />
            <label class="form-check-label" for="talkingPresenter0-donot-disturb"><span>Mute</span> Trendy Jon </label>
          </div>
          <div class="mx-2 text-center">
            <input audiovolslider="" type="range" min="0" max="100" title="Volume" class="mx-auto py-1 volCtrl" />
          </div>
        </div>
      </div>
    </div>
  </li>
  </app-presentationarea>`;

/*
  `/webfonts` is mounted because that is where the stylesheet's own `url(../webfonts/…)` resolves
  to from a document at `/index.html` — no `<base>` tag rewriting every relative URL on the page.
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
const page = await browser.newPage({ viewport: { width: 700, height: 520 }, deviceScaleFactor: 2 });

const results = [];
let failures = 0;

for (const testCase of CASES) {
  server.setHtml(
    `<!doctype html><html><head><meta charset="utf-8">
     <style>${CSS}</style>
     <style>
       body { margin:0; background:#2b3e50; padding:80px; }
       ul { list-style:none; margin:0; padding:0; display:flex; }
     </style></head><body><ul>${MARKUP}</ul></body></html>`
  );
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  // The faces have to be IN before anything is measured or shot; `document.fonts.ready` is the
  // browser's own answer to that, and it is why the glyphs below are real rather than fallback boxes.
  await page.evaluate(() => document.fonts.ready);

  await page.addScriptTag({
    content: `${MODULE}\nwindow.__volumeIcon = volumeIcon;`,
    type: 'module'
  });
  await page.waitForFunction('window.__volumeIcon !== undefined');

  /*
    The REAL module decides, in the browser, which icon (if any) goes in the button. Nothing in this
    file re-implements the thresholds — that is the whole point of loading the module.
  */
  await page.evaluate((audioVolume) => {
    const icon = window.__volumeIcon(audioVolume);
    const trigger = document.querySelector('#dropdownVolume');
    trigger.textContent = '';
    if (icon) {
      const element = document.createElement('i');
      element.className = `fas ${icon}`;
      trigger.append(element);
    }
  }, testCase.audioVolume);

  const measured = await page.evaluate(() => {
    const style = (selector, property) =>
      getComputedStyle(document.querySelector(selector)).getPropertyValue(property);
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { width: box.width, height: box.height };
    };
    const icon = document.querySelector('#dropdownVolume i');
    return {
      iconClass: icon ? icon.className : null,
      iconBox: icon ? rect('#dropdownVolume i') : null,
      /*
        THE GLYPH, not the class — which is what four byte-identical PNGs used to be hiding.

        `content` on `::before` is the codepoint the icon class asks for (`\f028` for volume-up,
        `\f027` down, `\f026` off), and `document.fonts.check(font, text)` answers whether the loaded
        face can actually draw THAT character. Calling `check()` without the text argument was the
        first attempt and it answers about U+0020, which an icon font does not contain — the face was
        loaded and the call still said false.
      */
      fontsLoaded: [...document.fonts]
        .filter((face) => face.status === 'loaded')
        .map((face) => `${face.family} ${face.weight}`),
      iconGlyph: icon
        ? [...getComputedStyle(icon, '::before').content.replace(/^["']|["']$/g, '')]
            .map((character) => `U+${character.codePointAt(0).toString(16).toUpperCase()}`)
            .join(' ')
        : null,
      /*
        Recorded as a diagnostic, NOT asserted on. `FontFaceSet.check()` answered `false` here for a
        face `document.fonts` itself reports as loaded and which visibly paints — an icon font has no
        glyph for the space character `check()` tests by default, and passing the icon codepoint did
        not change its answer either. Asserting on it failed four states for a reason that was about
        the API. The face being loaded, the codepoint being right and the captures differing are the
        three facts that actually settle it.
      */
      iconFontUsable: icon
        ? document.fonts.check(
            '900 16px "Font Awesome 5 Free"',
            getComputedStyle(icon, '::before').content.replace(/^["']|["']$/g, '')
          )
        : true,
      triggerWidth: style('#dropdownVolume', 'width'),
      triggerAfterDisplay: getComputedStyle(document.querySelector('#dropdownVolume'), '::after')
        .display,
      menu: {
        display: style('.volumeControl', 'display'),
        background: style('.volumeControl', 'background-color'),
        color: style('.volumeControl', 'color'),
        textAlign: style('.volumeControl', 'text-align'),
        border: style('.volumeControl', 'border-top-width')
      },
      slider: rect('.volCtrl'),
      sliderBackground: style('.volCtrl', 'background-color'),
      soundOptions: {
        textAlign: style('.room-sound-options', 'text-align'),
        paddingLeft: style('.room-sound-options', 'padding-left')
      },
      container: {
        opacity: style('.zoom-controls-container', 'opacity'),
        zIndex: style('.zoom-controls-container', 'z-index')
      }
    };
  });

  const problems = [];

  // 1. The icon, or deliberately none.
  if (testCase.icon === null) {
    if (measured.iconClass !== null) {
      problems.push(
        `audioVolume ${testCase.audioVolume} must render NO icon; got ${measured.iconClass}`
      );
    }
  } else if (measured.iconClass !== `fas ${testCase.icon}`) {
    problems.push(`expected fas ${testCase.icon}, got ${measured.iconClass}`);
  } else if (!measured.iconBox || measured.iconBox.width === 0 || measured.iconBox.height === 0) {
    // A Font Awesome glyph with no rule has a zero box — the class is present and paints nothing.
    problems.push(`${testCase.icon} has no box: the icon font rule is not applied`);
  }

  // 2. The classes must be PAINTED. `app-presentationarea`'s own sheet is the reference:
  //    #dropdownVolume{width:31px} / :after{display:none}
  //    .volumeControl{text-align:center;color:var(--light-gray);background-color:var(--darker-black);border:1px solid #fafafa}
  //    .volCtrl{background-color:var(--darker-black);height:32px;width:129px}
  //    .room-sound-options{text-align:left;padding-left:30px}
  if (measured.triggerWidth !== '31px') {
    problems.push(`#dropdownVolume is ${measured.triggerWidth} wide, reference is 31px`);
  }
  if (measured.triggerAfterDisplay !== 'none') {
    problems.push(`#dropdownVolume::after is ${measured.triggerAfterDisplay}, reference is none`);
  }
  if (measured.menu.textAlign !== 'center') {
    problems.push(`.volumeControl text-align is ${measured.menu.textAlign}, reference is center`);
  }
  if (measured.menu.background === 'rgba(0, 0, 0, 0)') {
    problems.push('.volumeControl has no background — the class is not painted');
  }
  if (measured.menu.border === '0px') {
    problems.push('.volumeControl has no border — the reference draws 1px solid #fafafa');
  }
  if (Math.abs(measured.slider.height - 32) > 0.5 || Math.abs(measured.slider.width - 129) > 0.5) {
    problems.push(
      `.volCtrl is ${measured.slider.width}x${measured.slider.height}, reference is 129x32`
    );
  }
  if (measured.soundOptions.textAlign !== 'left' || measured.soundOptions.paddingLeft !== '30px') {
    problems.push(
      `.room-sound-options is ${measured.soundOptions.textAlign}/${measured.soundOptions.paddingLeft}, reference is left/30px`
    );
  }

  /*
    3. The GLYPH, in three facts that together rule out the fallback box the old harness was
       painting:

       a. no font request was refused — a network fact from the server, so a face that fails to load
          is reported with its status rather than disclaimed in a comment;
       b. the Font Awesome face is in `document.fonts` with status `loaded`;
       c. the codepoint on `::before` is the one FONT AWESOME'S OWN STYLESHEET declares for that
          class. `ICON_CODEPOINTS` is parsed out of the shipped CSS rather than typed here, so the
          expectation cannot drift from the package the app depends on.
  */
  if (server.fontFailures.length > 0) {
    problems.push(
      `font requests refused: ${server.fontFailures.map((entry) => `${entry.path} → ${entry.status}`).join(', ')}`
    );
  }
  if (testCase.icon !== null) {
    if (!measured.fontsLoaded.includes('Font Awesome 5 Free 900')) {
      problems.push(
        `the solid face is not loaded (${measured.fontsLoaded.join(', ') || 'nothing loaded'}) — every glyph would be a fallback box`
      );
    }
    const expected = ICON_CODEPOINTS.get(testCase.icon);
    if (!expected) {
      problems.push(`${testCase.icon} has no :before rule in the shipped Font Awesome stylesheet`);
    } else if (measured.iconGlyph !== expected) {
      problems.push(
        `${testCase.icon} painted ${measured.iconGlyph}, its own CSS declares ${expected}`
      );
    }
  }

  const shot = resolve(OUT, `volume-${testCase.audioVolume}.png`);
  await page.screenshot({ path: shot });
  results.push({
    ...testCase,
    ok: problems.length === 0,
    problems,
    measured,
    png: `volume-${testCase.audioVolume}.png`,
    digest: await fileDigest(shot)
  });
  failures += problems.length ? 1 : 0;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '}  audioVolume=${String(testCase.audioVolume).padEnd(4)} ` +
      `→ ${measured.iconClass ?? '(no icon)'}` +
      (problems.length ? `\n      ${problems.join('\n      ')}` : '')
  );
}

/*
  THE NAVBAR DROPDOWN, with two presenters talking.

  A separate case because it is a separate control in a separate component (`app-room`), and because
  the thing being proved is ORDER rather than a threshold: `div.room-sound-options` holds the
  per-presenter rows FIRST, then an `hr`, then the six sound checkboxes
  (`app-room.render-helpers.js:1224-1279`). This app rendered the checkboxes alone, so a member
  could mute the room but not one presenter.

  Two presenters, because one row cannot show that the rows repeat, and because the second row's id
  is what makes `talkingPresenter1-donot-disturb` observable.
*/
const NAV_MARKUP = `
  <app-room>
  <li class="nav-item dropdown dropstart">
    <a id="dropdownVolume" data-bs-toggle="dropdown" class="nav-link d-flex align-items-center">
      <i class="fas fa-2x fa-volume-up"></i><span class="ml-2 mainNavItem">Volume</span>
    </a>
    <div aria-labelledby="dropdownVolume" class="dropdown-menu volumeControl show" style="display:block">
      <h4>Volume <span data-bs-toggle="dropdown" class="float-right mr-2"><i class="fas fa-times"></i></span></h4>
      <input audiovolslider="" type="range" min="0" max="100" title="Volume" class="mx-auto py-2 volCtrl" />
      <br />
      <button type="button" title="Mute Audio" class="btn btn-primary btn-sm">Mute</button>
      <hr />
      <div style="text-align: center;">
        <hr />
        <p class="m-0">Background Music:</p>
        <input type="range" min="0" max="100" title="Background Volume" class="px-0 py-2" />
      </div>
      <div class="dropdown-divider"></div>
      <div class="room-sound-options">
        <div class="my-1">
          <input type="checkbox" value="Presenter audiob" title="Presenter audio" class="form-check-input"
                 name="talkingPresenter0-donot-disturb" id="talkingPresenter0-donot-disturb" />
          <label class="form-check-label" for="talkingPresenter0-donot-disturb"><span>Mute</span> Trendy Jon </label>
        </div>
        <div class="mx-2 text-center">
          <input audiovolslider="" type="range" min="0" max="100" title="Volume" class="mx-auto py-1 volCtrl" />
        </div>
        <div class="my-1">
          <input type="checkbox" value="Presenter audiob" title="Presenter audio" class="form-check-input"
                 name="talkingPresenter1-donot-disturb" id="talkingPresenter1-donot-disturb" checked />
          <label class="form-check-label muted" for="talkingPresenter1-donot-disturb"> Sam <span>Muted</span></label>
        </div>
        <div class="mx-2 text-center">
          <input audiovolslider="" type="range" min="0" max="100" title="Volume" class="mx-auto py-1 volCtrl" />
        </div>
        <hr />
        <div class="my-1">
          <input type="checkbox" name="alert-donot-disturb" value="Alert Do not disturb" id="alert-donot-disturb"
                 title="Alert sound" class="form-check-input" checked />
          <label for="alert-donot-disturb" class="form-check-label">Alert sound <span>on</span></label>
        </div>
        <div class="my-1">
          <input type="checkbox" name="qa-donot-disturb" value="QA Do not disturb" id="qa-donot-disturb"
                 title="QA sound" class="form-check-input" checked />
          <label for="qa-donot-disturb" class="form-check-label">QA sound <span>on</span></label>
        </div>
        <div class="my-1">
          <input type="checkbox" name="non-trade-donot-disturb" value="Non-trade alerts do not disturb"
                 id="non-trade-donot-disturb" title="Non-trade alert sound" class="form-check-input" checked />
          <label for="non-trade-donot-disturb" class="form-check-label">NTA sound <span>on</span></label>
        </div>
        <div class="my-1">
          <input type="checkbox" name="chat-donot-disturb" value="Chat Do not disturb" id="chat-donot-disturb"
                 title="Chat sound" class="form-check-input" checked />
          <label for="chat-donot-disturb" class="form-check-label">Chat sound <span>on</span></label>
        </div>
        <div class="my-1">
          <input type="checkbox" name="presentation-subtitles" value="Presentation Subtitles"
                 id="presentation-subtitles" title="Show Speech Recognition Overlay" class="form-check-input" />
          <label for="presentation-subtitles" class="form-check-label">
            <i class="fas fa-closed-captioning"></i> Subtitles <span>off</span></label>
        </div>
        <div class="my-1">
          <input type="checkbox" name="app-donot-disturb" value="Do not disturb" id="app-donot-disturb"
                 title="Don't Disturb" class="form-check-input" />
          <label for="app-donot-disturb" class="form-check-label"><span>Don't Disturb</span></label>
        </div>
      </div>
    </div>
  </li>
  </app-room>`;

// Taller viewport: the whole dropdown — rows, rule and all six checkboxes — has to be IN the
// screenshot, or the picture proves the top of a control and nothing about its end.
await page.setViewportSize({ width: 700, height: 1150 });
server.setHtml(
  `<!doctype html><html><head><meta charset="utf-8">
   <style>${CSS}</style>
   <style>
     body { margin:0; background:#2b3e50; padding:40px; }
     ul { list-style:none; margin:0; padding:0; }
   </style></head><body><ul>${NAV_MARKUP}</ul></body></html>`
);
await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const nav = await page.evaluate(() => {
  const options = document.querySelector('.room-sound-options');
  // Direct children in document order — this is the whole assertion.
  const order = [...options.children].map((child) => {
    if (child.tagName === 'HR') return 'hr';
    const input = child.querySelector('input');
    if (!input) return child.className;
    if (input.type === 'range') return 'presenter-slider';
    return input.id.startsWith('talkingPresenter') ? 'presenter-row' : `checkbox:${input.id}`;
  });
  const style = (selector, property) =>
    getComputedStyle(document.querySelector(selector)).getPropertyValue(property);
  return {
    order,
    rowIds: [...options.querySelectorAll('input[type=checkbox]')].map((input) => input.id),
    mutedLabelColour: style('label.muted', 'color'),
    plainLabelColour: style('label.form-check-label:not(.muted)', 'color'),
    backgroundMusicAlign: style('.volumeControl div[style*="text-align"]', 'text-align')
  };
});

const navProblems = [];
const firstCheckbox = nav.order.findIndex((entry) => entry.startsWith('checkbox:'));
const lastRow = nav.order.lastIndexOf('presenter-row');
const ruleAt = nav.order.indexOf('hr');
if (lastRow === -1) navProblems.push('the navbar dropdown rendered no presenter rows at all');
if (lastRow > firstCheckbox) navProblems.push('the presenter rows must come BEFORE the checkboxes');
if (!(ruleAt > lastRow && ruleAt < firstCheckbox)) {
  navProblems.push(`the trailing hr must sit between them; order was ${nav.order.join(' → ')}`);
}
if (nav.rowIds[0] !== 'talkingPresenter0-donot-disturb') {
  navProblems.push(
    `first row id is ${nav.rowIds[0]}, reference is talkingPresenter0-donot-disturb`
  );
}
if (nav.backgroundMusicAlign !== 'center') {
  navProblems.push(
    `background-music container is ${nav.backgroundMusicAlign}, const 114 is center`
  );
}

const navShot = resolve(OUT, 'navbar-dropdown.png');
await page.screenshot({ path: navShot });
results.push({
  case: 'navbar dropdown',
  ok: navProblems.length === 0,
  problems: navProblems,
  measured: nav,
  png: 'navbar-dropdown.png',
  digest: await fileDigest(navShot)
});
failures += navProblems.length ? 1 : 0;
console.log(
  `${navProblems.length ? 'FAIL' : 'ok  '}  navbar dropdown       → ${nav.order.join(' → ')}` +
    (navProblems.length ? `\n      ${navProblems.join('\n      ')}` : '')
);

/*
  THE IMAGES HAVE TO DIFFER, and until this existed they did not have to.

  This script wrote ONE byte-identical PNG for volume 0, 5, 51 and 100 — four states whose entire
  purpose is three different glyphs — and reported 7/7. The pictures were a check that could not
  fail, because every glyph was painting as the same fallback box.

  So: hash every capture, and name the pairs that MUST differ. 0/5/51 are three distinct glyphs;
  4 and 50 are legitimately identical to each other (both render no icon at all) and that pairing is
  deliberately NOT asserted — the honest version of this check says which states must differ and
  which may not, rather than demanding difference everywhere and being wrong about one.
*/
const MUST_DIFFER = [
  ['volume-0.png', 'volume-5.png'],
  ['volume-5.png', 'volume-51.png'],
  ['volume-0.png', 'volume-51.png'],
  ['volume-0.png', 'volume-4.png'],
  ['volume-4.png', 'volume-100.png']
];
const digests = new Map(
  results.filter((entry) => entry.png).map((entry) => [entry.png, entry.digest])
);
const collisions = MUST_DIFFER.filter(([left, right]) => digests.get(left) === digests.get(right));
for (const [left, right] of collisions) {
  console.log(
    `FAIL  images          → ${left} and ${right} are byte-identical (${digests.get(left)?.slice(0, 12)}…)`
  );
}
failures += collisions.length;
results.push({
  case: 'image distinctness',
  ok: collisions.length === 0,
  problems: collisions.map(([left, right]) => `${left} == ${right}`),
  measured: Object.fromEntries(digests)
});
if (collisions.length === 0) {
  console.log(
    `ok    images          → ${digests.size} captures, every state that must differ does`
  );
}

writeFileSync(resolve(OUT, 'measurements.json'), JSON.stringify({ cases: results }, null, 2));
await browser.close();
await server.close();
console.log(`\n${results.length - failures}/${results.length} states render correctly`);
console.log(`screenshots + measurements: ${OUT}`);
process.exit(failures ? 1 : 0);
