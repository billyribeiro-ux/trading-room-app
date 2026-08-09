import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The shared screen must not paint over the dropdown or the modal.

  `.video-screen-container` carries `z-index: 1999` verbatim from the captured stylesheet. That
  number is correct and must not be "fixed" - but it only orders things within a stacking context,
  and nothing gave it one, so it competed at the root against every Bootstrap layer in the same
  captured sheet: .modal 1050, .dropdown-menu 1000.

  The correction is containment, not a smaller number. These two assertions have to move together:
  lower the captured value, or drop the containment, and the defect returns.
*/

const appCssRaw = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
/*
  Comments stripped before any assertion. The first version of this file matched its own
  explanatory comment - which mentions both `.video-screen-container` and `z-index` - and failed
  on prose rather than on a declaration. A contract test that reads comments is testing the wrong
  document.
*/
const appCss = appCssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
const captured = readFileSync(
  new URL('../../docs/source/styles.d622cb9ed2bbc221.css', import.meta.url),
  'utf8'
);

describe('shared screen stacking', () => {
  it('keeps the captured z-index exactly as captured', () => {
    // Source of truth. If the capture ever says something else, this test is what notices.
    expect(captured).toContain(
      '.video-screen-container{position:relative;top:0;left:0;z-index:1999;width:inherit;height:inherit}'
    );
    // And nothing in our own sheet overrides it.
    expect(appCss).not.toMatch(/\.video-screen-container[^}]*z-index/);
  });

  it('contains that z-index so the dropdown and the modal stay on top', () => {
    const rule = appCss.match(
      /app-presentationarea #screensTabsContent[\s\S]{0,200}?\{[\s\S]*?\}/
    )?.[0];

    expect(rule, '#screensTabsContent must establish a stacking context').toBeTruthy();
    // `position` plus a numeric `z-index` is what creates the context; z-index: 0 keeps the
    // subtree ordered below .dropdown-menu (1000) and .modal (1050) at the root.
    expect(rule).toMatch(/position:\s*relative/);
    expect(rule).toMatch(/z-index:\s*0/);
  });

  it('proves the captured layers the video was beating', () => {
    for (const [selector, z] of [
      ['.modal', '1050'],
      ['.dropdown-menu', '1000']
    ]) {
      const found = captured.includes(`${selector}{`) || captured.includes(`${selector},`);
      expect(found, `${selector} should exist in the captured sheet`).toBe(true);
      expect(captured).toContain(`z-index:${z}`);
    }
  });
});
