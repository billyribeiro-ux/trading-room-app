import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The screen control cluster must match the captured components.

  Pinned against the SHIPPED BUNDLE rather than a DOM capture, because a DOM capture only holds
  what that session rendered - the camera button was missing here for exactly that reason, and no
  dump would have shown it. A compiled template is served whole to every visitor regardless of
  role, so this is the one artifact where absence means absence.

  `scripts/extract-component-source.mjs` decodes the same tables by hand.

  The capture ships the cluster TWICE, and the two copies are not interchangeable:

    * `app-presentationarea` renders it in the tab bar's `li.nav-item.ms-auto` slot, inside
      `div.zoom-controls-container.position-relative`, with the gated trio FIRST and absolutely
      positioned.
    * `app-screenshare-view` renders it over the video inside
      `div.zoom-controls-container-detached`, with the gated trio LAST - and only when the screen
      is popped out into its own window.

  Rendering the detached copy in the attached position is the defect this file exists to catch:
  it put the magnifier on top of the screen tab's gear.
*/

const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const controls = readFileSync(
  new URL('./components/ScreenZoomControls.svelte', import.meta.url),
  'utf8'
);
const pane = readFileSync(new URL('./components/ScreenPane.svelte', import.meta.url), 'utf8');
const tabs = readFileSync(new URL('./components/ScreenTabs.svelte', import.meta.url), 'utf8');
const zoom = readFileSync(new URL('./screen-zoom.ts', import.meta.url), 'utf8');
/*
  The screen viewer left the page for `RoomScreens` in Phase 5 slice 11. Read as its own source, so
  an assertion about which screen is shown cannot pass against a file that no longer decides it.
*/
const screensModule = readFileSync(new URL('room/screens.svelte.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/*
  Comments stripped before any positional assertion. These files quote the captured markup at
  length in their own documentation, so `indexOf` finds the prose long before the template - the
  same trap `screen-stacking-contract.test.ts` records: a contract test that reads comments is
  testing the wrong document.
*/
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const paneMarkup = stripComments(pane);

/** The `{#if variant === 'attached'}` … `{:else}` … render block, split into its two branches. */
function renderBranches() {
  const block = controls.slice(controls.indexOf("{#if variant === 'attached'}"));
  const elseAt = block.indexOf('{:else}');
  expect(elseAt, 'the render block must have both branches').toBeGreaterThan(-1);
  return { attached: block.slice(0, elseAt), detached: block.slice(elseAt) };
}

describe('screen controls', () => {
  it('renders every icon the captured components declare', () => {
    // The captured const tables for app-screenshare-view and app-presentationarea, verbatim.
    for (const icon of ['fa-search', 'fa-camera', 'fa-search-plus', 'fa-search-minus', 'fa-redo']) {
      expect(bundle, `${icon} should be in the bundle`).toContain(`"icon","fas","${icon}"`);
      expect(controls, `${icon} should be rendered`).toContain(icon);
    }
  });

  it('uses the captured button classes', () => {
    // Const 13/98 (dark) is the magnifier and the camera; const 16/102 (warning) is the trio.
    expect(bundle).toContain('[1,"btn","btn-sm","btn-dark",3,"click"]');
    expect(bundle).toContain('[1,"btn","btn-sm","btn-warning",3,"click"]');
    expect(controls).toContain('class="btn btn-sm btn-dark"');
    expect(controls).toContain('class="btn btn-sm btn-warning"');
  });

  it('keeps the camera beside the zoom toggle, not behind zoom mode', () => {
    const dark = controls.slice(
      controls.indexOf('{#snippet darkButtons()}'),
      controls.indexOf('{#snippet zoomTrio()}')
    );

    expect(dark).toContain('fa-search');
    expect(dark).toContain('fa-camera');
    // Const 13 (btn-dark) is used TWICE - search and camera - while const 16 (btn-warning) is the
    // gated trio. So the camera must not sit behind the gate.
    expect(dark, 'the camera must not be gated on zoom mode').not.toContain('{#if');
  });

  it('reproduces both captured containers, each on the right side', () => {
    // app-presentationarea, const 88 - the bar's cluster. `ScreenTabs` owns it.
    expect(bundle).toContain('[1,"zoom-controls-container","position-relative"]');
    expect(tabs).toContain('class="zoom-controls-container position-relative"');

    // app-screenshare-view, const 4 - the popout's cluster. `ScreenPane` owns it.
    expect(bundle).toContain('[1,"zoom-controls-container-detached"');
    expect(paneMarkup).toContain('class="zoom-controls-container-detached"');

    // And the pane must NOT carry the bar's container. Rendering the attached class in the
    // detached position is exactly the defect: `-detached` is a distinct class, so a substring
    // check would pass on it, hence the explicit boundary.
    expect(paneMarkup).not.toMatch(/class="zoom-controls-container(?!-detached)/);
  });

  it('fills the ms-auto slot the capture puts the cluster in', () => {
    // app-presentationarea, const 71.
    expect(bundle).toContain('[1,"nav-item","ms-auto"]');
    expect(tabs).toContain('class="nav-item ms-auto"');
    expect(tabs).toContain('{@render controls()}');

    // The slot was already modelled and never filled - `+page.svelte` passed no snippet, so the
    // `{#if}` around it was permanently false. That is what this asserts against.
    // The snippet moved with the tab strip into `PresentationArea.svelte` on 2026-08-15.
    const pane = readFileSync(
      new URL('./components/PresentationArea.svelte', import.meta.url),
      'utf8'
    );
    expect(pane, 'the pane must pass the controls snippet').toContain('{#snippet controls()}');
    expect(pane).toContain('variant="attached"');
  });

  it('renders the pane cluster only when the screen is detached', () => {
    // `O(5, o.isDetachedCtrl ? 5 : -1)` - const 4 renders only in a popout window.
    expect(bundle).toContain('isDetachedCtrl');

    const cluster = paneMarkup.indexOf('zoom-controls-container-detached');
    const gate = paneMarkup.indexOf('{#if detached}');
    expect(gate, 'the pane cluster must be gated').toBeGreaterThan(-1);
    expect(gate, 'the gate must enclose the cluster').toBeLessThan(cluster);
    expect(paneMarkup).toContain('variant="detached"');
  });

  it('keeps each variant in its captured order', () => {
    const { attached, detached } = renderBranches();

    // Attached (app-presentationarea `CSe`): the trio is child [2] and the dark buttons are [16]
    // and [18], so the trio comes FIRST and is absolutely positioned clear of the row.
    expect(attached).toContain("'zoom-controls position-absolute'");
    expect(attached.indexOf('{@render zoomTrio()}')).toBeLessThan(
      attached.indexOf('{@render darkButtons()}')
    );

    // Detached (app-screenshare-view `Y0e`): the dark buttons are [1] and [3], the trio is [5],
    // and its wrapper carries no class at all.
    expect(detached.indexOf('{@render darkButtons()}')).toBeLessThan(
      detached.indexOf('{@render zoomTrio()}')
    );
    expect(detached, 'the detached trio wrapper is an unclassed div').not.toContain(
      'zoom-controls position-absolute'
    );
  });

  it('reproduces the captured canvas arithmetic exactly', () => {
    // `a = videoWidth - 100` is almost certainly a bug in the capture, and it is copied anyway:
    // it decides the saved file's dimensions, so "fixing" it changes the output.
    expect(bundle).toContain('Number(i.videoWidth-100)');
    expect(zoom).toContain('video.videoWidth - 100');

    // fillRect before drawImage - the default black fills letterbox bars that would otherwise be
    // transparent.
    expect(zoom.indexOf('context.fillRect')).toBeLessThan(zoom.indexOf('context.drawImage'));

    expect(zoom).toMatch(/screenshot-\$\{screenId\}-\$\{Date\.now\(\)\}\.png/);
  });

  it('keeps the captured pan/zoom configuration', () => {
    // `new Kse({... zoomLevels: 20, initialZoomLevel: 2, scalePerZoomLevel: 1.1})`
    expect(bundle).toContain('zoomLevels:20');
    expect(bundle).toContain('initialZoomLevel:2');
    expect(bundle).toContain('scalePerZoomLevel:1.1');
    expect(zoom).toMatch(/ZOOM_LEVELS = 20/);
    expect(zoom).toMatch(/INITIAL_ZOOM_LEVEL = 2/);
    expect(zoom).toMatch(/SCALE_PER_ZOOM_LEVEL = 1\.1/);
  });

  it('lifts the zoom state to the page, where the capture keeps it', () => {
    // `app-presentationarea`'s constructor carries `this.showZoomCtrl = !1`, and its five handlers
    // drive every screen over the event bus. A per-pane copy cannot reach the shared bar slot.
    expect(bundle).toContain('this.showZoomCtrl=!1');
    /*
      Lifted OUT of the pane and now out of the page too: `RoomScreens` owns it since slice 11. The
      property this test is about is unchanged — one copy, shared by every screen, because a
      per-pane copy cannot reach the shared bar slot.
    */
    expect(screensModule).toContain('this.#showZoomCtrl = $state(false)');
    expect(screensModule).toContain('toggleZoomControls() {');
    expect(page).not.toContain('let showZoomCtrl = $state(false)');

    // The pane receives them; it no longer owns them.
    expect(pane).not.toMatch(/let showZoomCtrl = \$state/);
    expect(pane).toContain('showZoomCtrl: boolean');
  });
});
