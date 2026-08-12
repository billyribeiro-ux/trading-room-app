// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ngbTooltip, restingPosition } from './ngb-tooltip';

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
    it(`reproduces where the browser put "${t.label}"`, () => {
      const box = (r: { x: number; y: number; w: number; h: number }) => ({
        left: r.x,
        top: r.y,
        right: r.x + r.w,
        bottom: r.y + r.h,
        width: r.w,
        height: r.h
      });
      const got = restingPosition(box(t.host.rect), box(t.tooltip.rect), 'left');

      /*
        Vertically exact — within 0.02px on all three, which is what confirms the centring rule.
        Horizontally there is a systematic 0.25px residual: our left edge lands 0.25px left of the
        captured one, identically for all three. That is NOT explained here. It is small enough to be
        Popper's `roundOffsets` at the capture's `devicePixelRatio: 2` combined with rects reported
        to one decimal, and it is recorded as an unexplained residual rather than absorbed by
        tuning OFFSET_DISTANCE to 5.75 — the bundle says 6, and fitting the constant to three
        samples would be inventing a value the source contradicts.
      */
      expect(Math.abs(got.top - t.tooltip.rect.y)).toBeLessThan(0.05);
      expect(Math.abs(got.left - t.tooltip.rect.x)).toBeLessThan(0.5);
    });
  }

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
