// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ngbTooltip, restingPosition, roundToDevicePixels } from './ngb-tooltip';

/**
 * Every placement the room uses, and the rules that paint each one.
 *
 * The one-entry `CAPTURED_DIRECTIONS` table this replaces was correct and too small: the room's
 * markup also carries `top`, `bottom` and `top-right`, and each of those refused to render. Reading
 * every `"placement",` entry in `main.d6d3c112b59b7d0d.js` gave the inventory; reading the bundle's
 * `Coe` table and `koe` function gave the mapping, which is now ported instead of transcribed.
 *
 * The one branch a capture proves — `left` → `bs-tooltip-start` — is asserted here against the live
 * DOM as well, because it is what validates the reading of `koe` that produces the other 21.
 */

const cwd = process.cwd();
const BUNDLE = readFileSync(resolve(cwd, 'docs/source/main.d6d3c112b59b7d0d.js'), 'utf8');
const REFERENCE_SHEET = readFileSync(
  resolve(cwd, 'docs/source/styles.d622cb9ed2bbc221.css'),
  'utf8'
);
const APPLIED_SHEET = readFileSync(resolve(cwd, 'css/complete-app-styles.css'), 'utf8');
const CAPTURE = JSON.parse(
  readFileSync(resolve(cwd, 'evidence-tooltips-presenter-2026-08-12.json'), 'utf8')
);

/**
 * The `bs-tooltip-*` classes only.
 *
 * These cases are about which DIRECTION class the port derives. `tooltip`, `fade` and `show` are the
 * lifecycle classes, asserted in `ngb-tooltip.test.ts` against the capture; `show` in particular is
 * added on the next frame, so folding it into a whole-`className` comparison makes these fail for a
 * reason that has nothing to do with the direction.
 */
function direction(el: Element | null): string {
  return [...el!.classList].filter((c) => c.startsWith('bs-tooltip-')).join(' ');
}

function open(placement: string) {
  const parent = document.createElement('span');
  const host = document.createElement('i');
  host.setAttribute('ngbtooltip', 'Some control');
  host.setAttribute('placement', placement);
  parent.append(host);
  document.body.append(parent);
  ngbTooltip(host);
  host.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  return parent.querySelector('ngb-tooltip-window');
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('the placement inventory comes from the bundle, not from a guess at what is used', () => {
  it('every direction we now resolve is one the room markup actually asks for', () => {
    /*
      If the reference stops using one of these the test still passes — it only fails if we claim
      support for a direction the markup never requests, which is the "nothing without a consumer"
      rule. `top-right` is the extra chat column's GIF control; `auto` the emoji popover host.
    */
    for (const p of [
      '"placement","left"',
      '"placement","top"',
      '"placement","bottom"',
      '"placement","top-right"',
      '"placement","auto"'
    ]) {
      expect(BUNDLE, p).toContain(p);
    }
  });
});

describe('the class arithmetic is the reference own', () => {
  it('the bundle still carries the table and the function this was ported from', () => {
    // Ported code that stops matching its source is worse than none, so both are pinned.
    expect(BUNDLE).toContain('"top-right":["top-end"]');
    expect(BUNDLE).toContain('function koe(t,n){let[e,i]=n.split("-")');
    expect(BUNDLE).toContain('baseClass:"bs-tooltip"');
  });

  it('left renders exactly what the live DOM carried — the branch that validates the port', () => {
    const gen = CAPTURE.tooltips.find((t: { appeared: boolean }) => t.appeared).generation;
    expect(gen.directionClass).toBe('bs-tooltip-start');
    expect(gen.placementAttributeValue).toBe('left');

    const bubble = open('left')!;
    expect(direction(bubble)).toBe('bs-tooltip-start');
    expect(bubble.classList.contains('tooltip')).toBe(true);
    expect(bubble.classList.contains('fade')).toBe(true);
    expect(bubble.getAttribute('data-popper-placement')).toBe('left');
  });

  it('top and bottom keep their physical names', () => {
    // `koe` only rewrites /^left/ and /^right/, so these pass through untouched.
    expect(direction(open('top'))).toBe('bs-tooltip-top');
    expect(direction(open('bottom'))).toBe('bs-tooltip-bottom');
  });

  it('right becomes end, the mirror of left becoming start', () => {
    expect(direction(open('right'))).toBe('bs-tooltip-end');
  });

  it('top-right resolves to top-end and emits BOTH classes', () => {
    /*
      `Coe["top-right"] = ["top-end"]`, then `koe` pushes the variation alongside the base — so the
      element carries `bs-tooltip-top bs-tooltip-top-end`. The base is what paints; the variation is
      a hook Bootstrap ships no rule for, and emitting it anyway is what the reference does.
    */
    const bubble = open('top-right')!;
    expect(direction(bubble)).toBe('bs-tooltip-top bs-tooltip-top-end');
    expect(bubble.getAttribute('data-popper-placement')).toBe('top-end');
  });

  it('auto takes the head of the reference own expansion order', () => {
    // We do not run Popper's collision pass, so this is where it starts rather than where it lands.
    expect(BUNDLE).toContain('["top","bottom","start","end","top-start","top-end"');
    expect(direction(open('auto'))).toBe('bs-tooltip-top');
  });

  it('a placement ng-bootstrap has no entry for is still refused', () => {
    expect(open('sideways')).toBeNull();
  });
});

describe('every class we emit is painted by both sheets', () => {
  /*
    THE check that made `top`/`bottom` unsafe to guess at before this was read. A direction class with
    no arrow rule renders a bubble with an invisible stub attached, which looks close enough to right
    to ship.
  */
  for (const cls of ['bs-tooltip-top', 'bs-tooltip-bottom', 'bs-tooltip-start', 'bs-tooltip-end']) {
    it(`${cls} has an arrow rule and a coloured pseudo-element`, () => {
      for (const sheet of [REFERENCE_SHEET, APPLIED_SHEET]) {
        expect(sheet).toContain(`.${cls} .tooltip-arrow`);
        expect(sheet).toMatch(new RegExp(`\\.${cls} \\.tooltip-arrow::?before`));
      }
    });
  }

  it('the four border-colour rules point the arrow the right way', () => {
    const want: Record<string, string> = {
      'bs-tooltip-top': 'border-top-color',
      'bs-tooltip-bottom': 'border-bottom-color',
      'bs-tooltip-start': 'border-left-color',
      'bs-tooltip-end': 'border-right-color'
    };
    for (const [cls, prop] of Object.entries(want)) {
      const at = REFERENCE_SHEET.indexOf(`.${cls} .tooltip-arrow:before{`);
      expect(at, cls).toBeGreaterThan(-1);
      expect(REFERENCE_SHEET.slice(at, at + 260), cls).toContain(prop);
    }
  });
});

describe('the 6px offset is the reference own, checked against the captured pixels', () => {
  it('the bundle passes [0, 6] for tooltips against [0, 8] for popovers', () => {
    expect(BUNDLE).toContain(
      'baseClass:"bs-tooltip",updatePopperOptions:s=>this.popperOptions(k_([0,6])(s))'
    );
    expect(BUNDLE).toContain(
      'baseClass:"bs-popover",updatePopperOptions:s=>this.popperOptions(k_([0,8])(s))'
    );
  });

  /*
    Every tooltip that rendered in the 2026-08-12 run, with the host rect and the bubble rect the
    browser actually reported. `restingPosition` is pure so it can be handed these directly — jsdom
    reports every rect as zero, so mounting one and measuring proves nothing, which is how a version
    of this shipped with the offset dropped and a green suite.
  */
  const rendered = CAPTURE.tooltips.filter(
    (t: { appeared: boolean; tooltip: { rect: { w: number } } }) =>
      t.appeared && t.tooltip.rect.w > 0
  );

  it('has three rendered tooltips with real geometry to check against', () => {
    expect(rendered.length).toBe(3);
  });

  for (const t of rendered) {
    it(`reproduces where the browser put "${t.label}" — to the pixel`, () => {
      const box = (r: { x: number; y: number; w: number; h: number }) => ({
        left: r.x,
        top: r.y,
        right: r.x + r.w,
        bottom: r.y + r.h,
        width: r.w,
        height: r.h
      });
      const dpr = CAPTURE.meta.viewport.dpr;

      /*
        The bubble's position BEFORE the transform, recovered from the capture: Popper anchors with
        `inset: 0 0 auto auto` and then translates, so resting = final rect minus the transform it
        applied.
      */
      const [, tx, ty] = t.tooltip.attrs.style.match(/translate3d\((-?[\d.]+)px, (-?[\d.]+)px/)!;
      const restingLeft = t.tooltip.rect.x - Number(tx);
      const restingTop = t.tooltip.rect.y - Number(ty);

      const want = restingPosition(box(t.host.rect), box(t.tooltip.rect), 'left');
      const dx = roundToDevicePixels(want.left - restingLeft, dpr);
      const dy = roundToDevicePixels(want.top - restingTop, dpr);

      // The transform Popper actually wrote, and the rect the browser actually reported.
      expect(dx).toBe(Number(tx));
      expect(dy).toBe(Number(ty));
      expect(restingLeft + dx).toBeCloseTo(t.tooltip.rect.x, 10);
      expect(restingTop + dy).toBeCloseTo(t.tooltip.rect.y, 10);
    });
  }

  it('the rounding is Math.round on the device pixel grid, halves toward +infinity', () => {
    /*
      THE detail that closes the residual. "Add Emojis" wants dx = -1305.75; at dpr 2 that is
      -2611.5 half-pixels, and `Math.round` takes it to -2611, i.e. -1305.5 — which is the captured
      transform. Rounding a half AWAY FROM ZERO, which most languages do, gives -1306 and misses by
      half a pixel. Python's banker's rounding gives -1306 too; that is how this was nearly recorded
      as still-unexplained.
    */
    expect(roundToDevicePixels(-1305.75, 2)).toBe(-1305.5);
    expect(roundToDevicePixels(1173.49, 2)).toBe(1173.5);
    expect(roundToDevicePixels(-1280.25, 2)).toBe(-1280);
    // At dpr 1 it is whole pixels; the `|| 0` guards -0.
    expect(roundToDevicePixels(10.4, 1)).toBe(10);
    expect(Object.is(roundToDevicePixels(-0.2, 1), 0)).toBe(true);
  });

  it('dropping the offset moves the bubble a visible distance, so this cannot pass at 0', () => {
    // The negative control, as an assertion: 6px is the whole gap the arrow reaches across.
    const t = rendered[0];
    const box = (r: { x: number; y: number; w: number; h: number }) => ({
      left: r.x,
      top: r.y,
      right: r.x + r.w,
      bottom: r.y + r.h,
      width: r.w,
      height: r.h
    });
    const got = restingPosition(box(t.host.rect), box(t.tooltip.rect), 'left');
    const flush = t.host.rect.x - t.tooltip.rect.w;
    expect(Math.abs(got.left - flush)).toBeGreaterThan(5.5);
  });

  it('offsets every axis, not just the horizontal one', () => {
    const anchor = { left: 100, top: 100, right: 120, bottom: 116, width: 20, height: 16 };
    const bubble = { left: 0, top: 0, right: 80, bottom: 30, width: 80, height: 30 };
    expect(restingPosition(anchor, bubble, 'top').top).toBe(100 - 30 - 6);
    expect(restingPosition(anchor, bubble, 'bottom').top).toBe(116 + 6);
    expect(restingPosition(anchor, bubble, 'left').left).toBe(100 - 80 - 6);
    expect(restingPosition(anchor, bubble, 'right').left).toBe(120 + 6);
  });

  it('the -start and -end variations align to the host edges', () => {
    const anchor = { left: 100, top: 100, right: 120, bottom: 116, width: 20, height: 16 };
    const bubble = { left: 0, top: 0, right: 80, bottom: 30, width: 80, height: 30 };
    expect(restingPosition(anchor, bubble, 'top-start').left).toBe(100);
    expect(restingPosition(anchor, bubble, 'top-end').left).toBe(120 - 80);
    expect(restingPosition(anchor, bubble, 'left-start').top).toBe(100);
    expect(restingPosition(anchor, bubble, 'left-end').top).toBe(116 - 30);
  });
});

describe('no tooltip in the room can flip, so not running Popper costs nothing', () => {
  it('the reference passes its own fallback list, and flip honours it', () => {
    /*
      `RI` returns `{ placement: r.shift(), modifiers: [ …, { name: "flip", options: { fallbackPlacements: r } } ] }`.
      `r` is the resolved candidate list, and `shift()` both takes the primary AND removes it — so
      what `flip` receives is whatever is LEFT.
    */
    expect(
      BUNDLE.includes('{enabled:!0,name:"flip",options:{fallbackPlacements:r}}'),
      '{enabled:!0,name:"flip",options:{fallbackPlacements:r}}'
    ).toBe(true);
    // Inside flip: `J = l || (...)`, where `l` is `options.fallbackPlacements`.
    expect(BUNDLE.includes('l=e.fallbackPlacements'), 'l=e.fallbackPlacements').toBe(true);
    expect(BUNDLE.includes('J=l||(B!==M&&S?'), 'J=l||(B!==M&&S?').toBe(true);
  });

  it('a fixed placement leaves that list EMPTY, and an empty array is truthy', () => {
    /*
      THE point. `Coe["left"] = ["left"]`, so the candidate list is one long; `shift()` empties it.
      `[] || fallback` evaluates to `[]` in JavaScript, so flip does not fall back to its own
      defaults — it is handed no alternatives at all and the bubble stays where it was asked for.

      Every placement the room writes on a tooltip is fixed: left, top, bottom, top-right. None of
      them can flip, which is why positioning once from the measured rects is a match rather than an
      approximation.
    */
    /*
      Modelled rather than asserted as a literal, both because `[] || x` is statically always-truthy
      (svelte-check says so) and because running the reference's own three steps is the actual claim:
      look the placement up, `shift()` the primary off, hand what remains to flip.
    */
    const candidates = ['left']; // Coe['left'], LTR arm
    const primary = candidates.shift(); // RI: `placement: r.shift()`
    const fallbackPlacements = candidates; // RI: `options: { fallbackPlacements: r }`
    expect(primary).toBe('left');
    expect(fallbackPlacements).toEqual([]);

    /*
      flip reads `l = e.fallbackPlacements` and then `J = l || (…)`. The option is optional, so `l` is
      `string[] | undefined` — which is why the `||` is meaningful rather than always-truthy. At
      runtime it holds `[]`, and an empty array IS truthy, so `l` wins and flip is handed no
      alternatives at all rather than falling back to its own defaults.
    */
    const asFlipOption = (v: string[]): string[] | undefined => v;
    const l = asFlipOption(fallbackPlacements);
    const J = l || ['flip-would-invent-this'];
    expect(J).toBe(fallbackPlacements);
    expect(J).toEqual([]);
    // Unquoted keys in the minified literal, except the hyphenated ones. `includes` rather than
    // `toContain` so a failure prints a boolean instead of 2.8MB of bundle.
    for (const p of [
      'left:["left"]',
      'top:["top"]',
      'bottom:["bottom"]',
      '"top-right":["top-end"]'
    ]) {
      expect(BUNDLE.includes(p), p).toBe(true);
    }
  });

  it('preventOverflow is disabled upstream by a no-op function', () => {
    // The other modifier that would move a bubble. ng-bootstrap registers it and empties it.
    expect(
      BUNDLE.includes('{enabled:!0,name:"preventOverflow",phase:"main",fn:function(){}}'),
      '{enabled:!0,name:"preventOverflow",phase:"main",fn:function(){}}'
    ).toBe(true);
  });

  it('auto is the only placement with alternatives, and no tooltip renders with it', () => {
    /*
      `auto` expands to twelve, so its fallback list is eleven long and flip is live. The room writes
      `auto` on exactly two hosts and neither shows a tooltip on hover: the GIF control is
      `triggers="manual"`, and the emoji host carries `ngbPopover` with no `ngbTooltip` at all.
    */
    const emojiHost =
      '["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",1,"textAreaBtns",3,"click","ngbPopover"]';
    expect(BUNDLE.includes(emojiHost), 'the emoji host carries ngbPopover and no ngbTooltip').toBe(
      true
    );
    const autoHosts = CAPTURE.tooltips.filter(
      (t: { host: { attrs: Record<string, string> } }) => t.host.attrs.placement === 'auto'
    );
    for (const t of autoHosts) {
      expect(t.appeared, `${t.label} must not open on hover`).toBe(false);
      expect(t.host.attrs.triggers).toBe('manual');
    }
  });
});
