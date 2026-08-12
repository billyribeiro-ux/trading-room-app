/**
 * Renders every tooltip placement in real Chromium and measures what the browser draws.
 *
 * `TODO.md` gap 1's last open thread. `top`, `bottom`, `right` and `top-right` were derived from the
 * reference's own `Coe`/`koe` and unit-tested, but never SEEN — and jsdom reports every rect as zero,
 * so no vitest run can tell whether the arrow is painted or where the bubble lands. Compiling and
 * passing tests is not evidence that a thing renders.
 *
 * What this does, and why each part is the real one rather than a stand-in:
 *
 * - **The implementation** is `src/lib/ngb-tooltip.ts`, bundled by esbuild. Not a re-description of
 *   it in the harness — a re-description would pass while the shipped module was broken.
 * - **The stylesheet** is `css/complete-app-styles.css`, the sheet the app actually serves.
 * - **The assertions** are geometric: the arrow must have a non-zero box and a solid border on the
 *   side that points at the host, and the bubble must sit on the expected side of the host with the
 *   6px gap the reference's `k_([0, 6])` specifies.
 *
 * Writes a PNG per placement plus a JSON of the measurements. Exits non-zero on any mismatch, so it
 * is usable as a gate rather than as something a human has to squint at.
 */

import { createRequire, stripTypeScriptTypes } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startHarnessServer } from './lib/harness-server.mjs';

/*
  `@playwright/test` is already a devDependency of `apps/controller`, so it is resolved from there
  rather than added to this app's `package.json`: a dependency change is the one category that
  mandates a full-gate run, and this is dev-only tooling no build imports. If the room ever grows its
  own browser tests, that is the moment to declare it here properly.

  No bundler. `stripTypeScriptTypes` is Node's own, so the browser runs the REAL
  `src/lib/ngb-tooltip.ts` with only its type annotations blanked — not a transpiled copy and not a
  re-description, either of which could pass while the shipped module was broken.
*/
const need = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../controller/package.json')
);
const { chromium } = need('@playwright/test');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'evidence-tooltip-placements');
mkdirSync(OUT, { recursive: true });

/*
  The direction each placement must resolve to, which border paints its arrow, and how tall the
  bubble should be for this one-line label.

  `height` is not one number, and that is a property of the REFERENCE rather than a quirk here. Its
  stylesheet ships both Bootstrap generations' tooltip rules in the same file, and the Bootstrap 4
  block is still live:

      .bs-tooltip-top,.bs-tooltip-auto[x-placement^=top]{padding:.4rem 0}

  Bootstrap 4 and 5 share the names `top` and `bottom`, so that rule lands on the element ng-bootstrap
  emits and adds 2 × 0.4rem = 12.8px of vertical padding. It does NOT land on `start`/`end`, because
  Bootstrap 4 spelled those `left`/`right`. So a top or bottom tooltip is genuinely ~12.8px taller
  than a left one, in the original as much as here — 29px against 41.8px.

  Verified present in `docs/source/styles.d622cb9ed2bbc221.css`, the reference's own pinned sheet, and
  in ours. Asserting a flat 29px was wrong: it generalised the height of the only direction ever
  captured.
*/
const ONE_LINE = 29;
const BS4_VERTICAL_PADDING = 12.797;
const CASES = [
  {
    placement: 'left',
    cls: 'bs-tooltip-start',
    side: 'left',
    border: 'borderLeftColor',
    height: ONE_LINE
  },
  {
    placement: 'right',
    cls: 'bs-tooltip-end',
    side: 'right',
    border: 'borderRightColor',
    height: ONE_LINE
  },
  {
    placement: 'top',
    cls: 'bs-tooltip-top',
    side: 'top',
    border: 'borderTopColor',
    height: ONE_LINE + BS4_VERTICAL_PADDING
  },
  {
    placement: 'bottom',
    cls: 'bs-tooltip-bottom',
    side: 'bottom',
    border: 'borderBottomColor',
    height: ONE_LINE + BS4_VERTICAL_PADDING
  },
  {
    placement: 'top-right',
    cls: 'bs-tooltip-top',
    side: 'top',
    border: 'borderTopColor',
    height: ONE_LINE + BS4_VERTICAL_PADDING
  },
  /*
    The BOUND shape: `["placement","top",1,"created-at","mx-2",3,"ngbTooltip","ngStyle"]`. A property
    binding sets no attribute, so this host carries `placement` and NO `ngbtooltip` — and it must
    still render. Before `ngbTooltipWith` existed, the three message-timestamp spans in this app
    carried `placement="top"` and showed nothing at all.
  */
  {
    placement: 'top',
    bound: true,
    cls: 'bs-tooltip-top',
    side: 'top',
    border: 'borderTopColor',
    height: ONE_LINE + BS4_VERTICAL_PADDING
  }
];

const SOURCE = readFileSync(resolve(ROOT, 'src/lib/ngb-tooltip.ts'), 'utf8');
const MODULE = stripTypeScriptTypes(SOURCE)
  // The only import is `import type { Attachment }`, erased with the types it declares.
  .replace(/^import .*svelte\/attachments.*$/gm, '');
const CSS = readFileSync(resolve(ROOT, 'css/complete-app-styles.css'), 'utf8');

/*
  A real HTTP origin instead of `page.setContent()`.

  `setContent` gives the document an opaque origin, and Chromium refuses `file://` subresource
  fetches from one — so every `@font-face` in the sheet silently failed and every measurement here
  was taken under fallback fonts. This harness's own numbers did not move when that was fixed (the
  tooltip's text is set in the sheet's own stack, whose faces this page does not load either way),
  but the defect was in all three harnesses and leaving it in one is how it comes back.
*/
const server = await startHarnessServer({
  mounts: {
    '/webfonts': resolve(
      createRequire(resolve(ROOT, 'package.json')).resolve(
        '@fortawesome/fontawesome-free/css/all.min.css'
      ),
      '../../webfonts'
    ),
    '/room': ROOT
  }
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 620 }, deviceScaleFactor: 2 });

const results = [];
let failures = 0;

for (const c of CASES) {
  server.setHtml(
    `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style>
     <style>
       body { margin:0; background:#2b3e50; height:620px;
              display:flex; align-items:center; justify-content:center; }
       .host { color:#bbb; font: 900 16px/16px "Font Awesome 5 Free"; display:inline-block;
               width:16px; height:16px; background:#7a8b99; border-radius:2px; }
     </style></head>
     <body><span class="textAreaBtns"><i class="host"
        ${c.bound ? '' : 'ngbtooltip="Upload an Image"'} placement="${c.placement}"></i></span></body></html>`
  );
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.addScriptTag({
    content:
      MODULE + '\nwindow.__ngbTooltip = ngbTooltip;\nwindow.__ngbTooltipWith = ngbTooltipWith;',
    type: 'module'
  });
  await page.waitForFunction('window.__ngbTooltip !== undefined');
  await page.evaluate((bound) => {
    const host = document.querySelector('.host');
    if (bound) window.__ngbTooltipWith('Upload an Image')(host);
    else window.__ngbTooltip(host);
  }, Boolean(c.bound));

  /*
    Park the pointer off the host FIRST. Playwright's mouse position survives `setContent`, and every
    case puts the host at the same centred coordinates — so from the second case on, the pointer is
    already inside it and `hover()` moves nothing, dispatching no `mouseenter`. That produced a
    confident "placement=top renders nothing" on the first run, which was this harness and not the
    code: `top` renders correctly once the pointer actually arrives.
  */
  await page.mouse.move(5, 5);
  await page.hover('.host');
  // The `show` class lands on the next frame and the opacity transition is 150ms.
  await page.waitForTimeout(400);

  const m = await page.evaluate(() => {
    const bubble = document.querySelector('ngb-tooltip-window');
    if (!bubble) return null;
    const arrow = bubble.querySelector('.tooltip-arrow');
    const inner = bubble.querySelector('.tooltip-inner');
    const before = getComputedStyle(arrow, '::before');
    const host = document.querySelector('.host');
    const r = (e) => {
      const b = e.getBoundingClientRect();
      return {
        left: b.left,
        top: b.top,
        right: b.right,
        bottom: b.bottom,
        width: b.width,
        height: b.height
      };
    };
    return {
      classes: [...bubble.classList],
      hostHasAttribute: document.querySelector('.host').hasAttribute('ngbtooltip'),
      popperPlacement: bubble.getAttribute('data-popper-placement'),
      opacity: getComputedStyle(bubble).opacity,
      zIndex: getComputedStyle(bubble).zIndex,
      bubble: r(bubble),
      host: r(host),
      arrow: r(arrow),
      innerBg: getComputedStyle(inner).backgroundColor,
      innerColor: getComputedStyle(inner).color,
      innerRadius: getComputedStyle(inner).borderRadius,
      innerPadding: getComputedStyle(inner).padding,
      innerMaxWidth: getComputedStyle(inner).maxWidth,
      arrowBorders: {
        borderTopColor: before.borderTopColor,
        borderRightColor: before.borderRightColor,
        borderBottomColor: before.borderBottomColor,
        borderLeftColor: before.borderLeftColor
      },
      arrowBorderWidth: before.borderWidth
    };
  });

  const problems = [];
  if (!m) problems.push('no tooltip rendered at all');
  else {
    if (!m.classes.includes(c.cls)) problems.push(`missing ${c.cls} (got ${m.classes.join(' ')})`);
    if (c.bound && m.hostHasAttribute) {
      problems.push('a bound tooltip must not write an `ngbtooltip` attribute the reference lacks');
    }
    if (!m.classes.includes('show')) problems.push('never reached the `show` state');
    if (m.opacity !== '0.9') problems.push(`settled opacity ${m.opacity}, reference is 0.9`);
    if (m.zIndex !== '1080') problems.push(`z-index ${m.zIndex}, reference is 1080`);
    if (m.arrow.width === 0 || m.arrow.height === 0) problems.push('arrow has no box');

    // The arrow must be PAINTED — a class with no rule leaves a transparent stub.
    const painted = m.arrowBorders[c.border];
    if (!painted || painted === 'rgba(0, 0, 0, 0)') {
      problems.push(`arrow ${c.border} is ${painted} — the class is not painted`);
    }

    /*
      A SINGLE LINE, 29px tall, exactly as the capture recorded for this same label. The first run of
      this script put `position: relative` on the parent span, which made it the bubble's containing
      block; `inset: 0 0 auto auto` then shrank the box to the span's 16px and "Upload an Image"
      wrapped onto three lines. Every numeric check still passed — the classes, the arrow, the gap —
      and only the screenshot showed it. The reference's `span.textAreaBtns` is NOT positioned: the
      capture has the bubble resting at left 1901.3 in a 1989px viewport, i.e. `right: 0` against the
      initial containing block. This assertion is here so that stays true without anyone looking.
    */
    if (Math.abs(m.bubble.width - 124.703) > 0.5) {
      problems.push(`bubble is ${m.bubble.width}px wide, capture is 124.703px — the label wrapped`);
    }
    if (Math.abs(m.bubble.height - c.height) > 0.5) {
      problems.push(`bubble is ${m.bubble.height}px tall, expected ${c.height}px`);
    }
    if (m.innerMaxWidth !== '200px')
      problems.push(`max-width ${m.innerMaxWidth}, reference is 200px`);

    // And the bubble must be on the right side of the host, 6px clear of it.
    const gap =
      c.side === 'left'
        ? m.host.left - m.bubble.right
        : c.side === 'right'
          ? m.bubble.left - m.host.right
          : c.side === 'top'
            ? m.host.top - m.bubble.bottom
            : m.bubble.top - m.host.bottom;
    m.gap = Number(gap.toFixed(3));
    if (Math.abs(gap - 6) > 0.75) problems.push(`gap ${m.gap}px, expected 6px`);

    /*
      The CROSS AXIS: the bubble is centred on the host, and the arrow is centred on the bubble, so
      all three centres coincide. Without this, an arrow pinned to a corner and a bubble that never
      translated along the cross axis both pass every other check — they did, on the run that added
      these lines.
    */
    const axis = c.side === 'left' || c.side === 'right' ? 'y' : 'x';
    const mid = (r) => (axis === 'y' ? (r.top + r.bottom) / 2 : (r.left + r.right) / 2);
    m.centres = { host: mid(m.host), bubble: mid(m.bubble), arrow: mid(m.arrow) };

    /*
      A bare placement centres the bubble on the host. A `-end` variation does NOT — it aligns the
      bubble's trailing edge to the host's, which is the whole difference between `top` and
      `top-right`. Asserting "centred" for both was wrong.
    */
    if (c.placement.includes('-')) {
      const trailing =
        axis === 'x' ? m.bubble.right - m.host.right : m.bubble.bottom - m.host.bottom;
      if (Math.abs(trailing) > 1) {
        problems.push(`-end variation must align trailing edges; off by ${trailing.toFixed(2)}px`);
      }
    } else if (Math.abs(m.centres.bubble - m.centres.host) > 1) {
      problems.push(
        `bubble centre is ${m.centres.bubble.toFixed(2)} on ${axis}, host is ${m.centres.host.toFixed(2)}`
      );
    }
    if (Math.abs(m.centres.arrow - m.centres.host) > 1) {
      problems.push(
        `arrow centre is ${m.centres.arrow.toFixed(2)} on ${axis}, host is ${m.centres.host.toFixed(2)}`
      );
    }
  }

  await page.screenshot({ path: resolve(OUT, `${c.placement}${c.bound ? '-bound' : ''}.png`) });
  results.push({ ...c, ok: problems.length === 0, problems, measured: m });
  failures += problems.length ? 1 : 0;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '}  placement=${(c.placement + (c.bound ? ' (bound)' : '')).padEnd(18)} ` +
      `→ ${m?.classes.filter((x) => x.startsWith('bs-')).join(' ') ?? '(nothing)'}` +
      `${m ? `  gap=${m.gap}px  arrow=${m.arrow.width}×${m.arrow.height}` : ''}` +
      (problems.length ? `\n      ${problems.join('\n      ')}` : '')
  );
}

writeFileSync(resolve(OUT, 'measurements.json'), JSON.stringify({ cases: results }, null, 2));
await browser.close();
await server.close();
console.log(`\n${results.length - failures}/${results.length} placements render correctly`);
console.log(`screenshots + measurements: ${OUT}`);
process.exit(failures ? 1 : 0);
