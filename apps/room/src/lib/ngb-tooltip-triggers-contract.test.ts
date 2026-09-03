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
/*
  THE BUNDLE READ THAT SAT HERE IS IN `ngb-tooltip-triggers-capture.test.ts`.

  It was a MODULE-SCOPE read of the gitignored `docs/source`, and `gate/evidence-bound-tests.mjs`
  excludes by FILE, so three cases took all TEN here out of every checkout without the dumps — this
  container, and CI. The seven that stayed read the collector's own JSON, which is COMMITTED, and
  our `ngb-tooltip.ts`: what the live page actually rendered, and what this application binds.
*/
const CAPTURE = JSON.parse(
  readFileSync(resolve(cwd, 'evidence-tooltips-presenter-2026-08-12.json'), 'utf8')
);
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
    // Ahead of the direction resolution, so a manual control never reaches it at all.
    const guard = IMPL.indexOf("=== 'manual'");
    const resolve = IMPL.indexOf('resolveDirection(placement)');
    expect(guard).toBeGreaterThan(-1);
    expect(resolve).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(resolve);
  });
});

describe('placement="auto" on that host is what the reference renders, not a collapse of ours', () => {
  it('the DOM carries one placement, and it is auto', () => {
    /*
      The template declares `placement` TWICE and only the later one survives into the DOM, so `top`
      is dead in the reference too and our markup matching `auto` is correctness rather than a
      defect. That template line is anchored in `ngb-tooltip-triggers-capture.test.ts`; what is
      asserted here is the CAPTURED DOM, which is committed.
    */
    expect(gif.host.attrs.placement).toBe('auto');
    expect(gif.host.outerHTML.match(/placement=/g)?.length).toBe(1);
  });
});

describe('left is still the only direction observed rendering', () => {
  it('every tooltip that appeared used it', () => {
    /*
      Still true, and still the point: `left` → `bs-tooltip-start` is the single branch a capture
      proves, and it is what validates the port of `koe` that derives the other 21. That the port
      reproduces it is asserted behaviourally in `ngb-tooltip-placements-contract.test.ts`; here we
      only pin what the evidence itself contains.
    */
    const seen = new Set(
      CAPTURE.tooltips
        .filter((t: { appeared: boolean }) => t.appeared)
        .map((t: { generation: { directionClass: string } }) => t.generation.directionClass)
    );
    expect([...seen]).toEqual(['bs-tooltip-start']);
  });

  it('and it is inserted beside the host, never into body', () => {
    for (const t of CAPTURE.tooltips) {
      if (!t.appeared) continue;
      expect(t.insertedInto.isSiblingOfHost, t.label).toBe(true);
      expect(t.insertedInto.isDirectChildOfBody, t.label).toBe(false);
    }
  });
});
