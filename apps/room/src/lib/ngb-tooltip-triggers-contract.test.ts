import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `triggers="manual"`, and the placement inventory it belongs to — `TODO.md` gap 1.
 *
 * Two captures and the bundle, read together, settled three things that had been reasoned about
 * rather than observed. Each `it` below pins one of them to the bytes it came from.
 */

const cwd = process.cwd();
const BUNDLE = readFileSync(resolve(cwd, 'docs/source/main.d6d3c112b59b7d0d.js'), 'utf8');
const CAPTURE = JSON.parse(readFileSync(resolve(cwd, 'evidence-tooltips-presenter-2026-08-12.json'), 'utf8'));
const IMPL = readFileSync(resolve(cwd, 'src/lib/ngb-tooltip.ts'), 'utf8');

const gif = CAPTURE.tooltips.find((t: { label: string }) => t.label === 'Search for GIFs');

describe('the capture is of the room, as a presenter', () => {
  it('is the room host and not the account app', () => {
    // The 14:08 run that day was the manage page and proved nothing about this file.
    expect(CAPTURE.meta.url).toContain('chat.protradingroom.com');
    expect(CAPTURE.role.detected).toBe('presenter');
  });

  it('records the room Bootstrap version, which had never been read off the live page', () => {
    expect(CAPTURE.meta.libraries.bootstrapVersion).toBe('5.3.3');
  });
});

describe('triggers is an NgbTooltip input, not a popover-only one', () => {
  it('the directive declares it', () => {
    /*
      THE fact the whole change rests on. Read out of the bundle rather than transcribed, so if the
      reference ever drops the input this test fails instead of quietly describing something gone.
    */
    const at = BUNDLE.indexOf('selectors:[["","ngbTooltip",""]]');
    expect(at).toBeGreaterThan(-1);
    const def = BUNDLE.slice(at, at + 300);
    expect(def).toContain('triggers:"triggers"');
    expect(def).toContain('placement:"placement"');
  });

  it('there is no separate [tooltip] directive for it to belong to instead', () => {
    // `tooltip="Unlock this screen?"` on the screen tabs binds to nothing. Inert markup, not a
    // second tooltip system — which is why no run while sharing a screen could ever capture it.
    expect(BUNDLE).not.toContain('"","tooltip",""');
    expect((BUNDLE.match(/selectors:\[\["","ngbTooltip",""\]\]/g) ?? []).length).toBe(1);
  });
});

describe('the GIF control never opens on hover, in the reference or here', () => {
  it('the reference sets triggers=manual on it', () => {
    expect(gif.host.attrs.triggers).toBe('manual');
    expect(gif.host.attrs.ngbtooltip).toBe('Search for GIFs');
  });

  it('hovering it produced no tooltip element', () => {
    // Every other host in that run rendered within 33ms. This one rendered nothing.
    expect(gif.appeared).toBe(false);
    for (const t of CAPTURE.tooltips) {
      if (t.label !== 'Search for GIFs') expect(t.appeared, t.label).toBe(true);
    }
  });

  it('our attachment returns before binding anything', () => {
    expect(IMPL).toContain("if (host.getAttribute('triggers') === 'manual') return;");
    // Ahead of the placement lookup, or `auto` warns on every render for a control that is correct.
    expect(IMPL.indexOf("=== 'manual'")).toBeLessThan(IMPL.indexOf('CAPTURED_DIRECTIONS[placement]'));
  });
});

describe('placement="auto" on that host is what the reference renders, not a collapse of ours', () => {
  it('the DOM carries one placement, and it is auto', () => {
    /*
      The template declares `placement` TWICE — `["ngbTooltip","Search for GIFs","placement","top",
      "placement","auto",…]`. Only one attribute survives into the DOM and it is the later one, so
      `top` is dead in the reference too. Our markup matching `auto` is correctness, not a defect.
    */
    expect(BUNDLE).toContain('"ngbTooltip","Search for GIFs","placement","top","placement","auto"');
    expect(gif.host.attrs.placement).toBe('auto');
    expect(gif.host.outerHTML.match(/placement=/g)?.length).toBe(1);
  });
});

describe('left is still the only direction observed rendering', () => {
  it('every tooltip that appeared used it', () => {
    const seen = new Set(
      CAPTURE.tooltips.filter((t: { appeared: boolean }) => t.appeared).map((t: { generation: { directionClass: string } }) => t.generation.directionClass)
    );
    expect([...seen]).toEqual(['bs-tooltip-start']);
    expect(IMPL).toContain("{ left: 'bs-tooltip-start' }");
  });

  it('and it is inserted beside the host, never into body', () => {
    for (const t of CAPTURE.tooltips) {
      if (!t.appeared) continue;
      expect(t.insertedInto.isSiblingOfHost, t.label).toBe(true);
      expect(t.insertedInto.isDirectChildOfBody, t.label).toBe(false);
    }
  });
});
