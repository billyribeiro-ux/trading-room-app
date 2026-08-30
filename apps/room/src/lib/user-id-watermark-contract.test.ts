import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { userIdWatermark } from './user-id-watermark.js';

/**
 * The anti-leak watermark, and the surface it was named for but never covered.
 *
 * ## `SV-SP-01`
 *
 * `overlayUserIdOnScreenshare` burns the viewer's `userXrefID` over the picture so a leaked
 * recording names the account that made it. This room drew it on `StreamingView` — the MTX/OBS
 * stream player — and **nowhere else**. `ScreenPane`, which is where a presenter's SCREENSHARE
 * renders, had neither the prop nor the gate. A room that turned the setting on watermarked a
 * restreamed feed and left the screenshare clean.
 *
 * The reference draws the same span on both: `app-screenshare-view` const 9 is
 * `[1,"overlay-userID-container"]`, rendered by `Q0e` at byte 1,494,134 behind
 * `O(10, !isPresenter && sessData.overlayUserIdOnScreenshare ? 10 : -1)` at byte 1,502,175.
 *
 * ## What this file is NOT claiming
 *
 * That anything is prevented. A `<span>` over a `<video>` in the viewer's own browser can be
 * removed by anyone who opens developer tools. What it does is make a casual screen recording carry
 * the recorder's account id. That is the whole claim, it is written at the module too, and it is
 * worth repeating because "anti-leak" in a fintech room invites a stronger reading than the shape
 * can support.
 */

const SCREEN_PANE = readFileSync(
  new URL('./components/ScreenPane.svelte', import.meta.url),
  'utf8'
);
const STREAMING = readFileSync(
  new URL('./components/StreamingView.svelte', import.meta.url),
  'utf8'
);
const AREA = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');
/* Comments stripped: the docblocks above quote the very gate they describe. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const screenPaneCode = strip(SCREEN_PANE);
const streamingCode = strip(STREAMING);
const areaCode = strip(AREA);

const input = (over: Partial<Parameters<typeof userIdWatermark>[0]> = {}) => ({
  viewerIsPresenter: false,
  overlayUserIdOnScreenshare: true,
  userXrefID: '4471',
  ...over
});

describe('who sees the watermark', () => {
  it('a member in a room that turned it on', () => {
    expect(userIdWatermark(input())).toBe('4471');
  });

  it('nobody, when the room has it off', () => {
    expect(userIdWatermark(input({ overlayUserIdOnScreenshare: false }))).toBeNull();
  });

  it('NOT the presenter — the reference s own first term', () => {
    /*
      The overlay traces a leak back to the account that made it, and the presenter is the person
      whose material it is. Watermarking their own screen with their own id protects nobody and
      obstructs the one viewer who has to read it.
    */
    expect(userIdWatermark(input({ viewerIsPresenter: true }))).toBeNull();
  });

  it('nobody, when there is no id to burn', () => {
    /*
      `null` and not `''`: an empty span carrying the captured class is an invisible element a later
      CSS change could make visible, and a blank watermark would report the setting as working.
    */
    expect(userIdWatermark(input({ userXrefID: '' }))).toBeNull();
    expect(userIdWatermark(input({ userXrefID: '   ' }))).toBeNull();
  });

  it('trims what it prints', () => {
    expect(userIdWatermark(input({ userXrefID: ' 4471 ' }))).toBe('4471');
  });
});

describe('both videos draw it', () => {
  it('the SCREENSHARE pane, which had none at all', () => {
    expect(screenPaneCode).toContain('{#if userIdWatermark}');
    expect(screenPaneCode).toContain(
      '<span class="overlay-userID-container"> {userIdWatermark} </span>'
    );
  });

  it('and it sits INSIDE the container that gets fullscreened', () => {
    /*
      Two reasons, both load-bearing. The captured rule is `.video-screen-container { position:
      relative }`, which is what the overlay's own `position: relative; bottom: 50%` is measured
      against. And `toggleFullscreen` fullscreens `#video-screen-container-{id}` — so a watermark
      outside it is clipped away in exactly the state a recording would be made in.

      Asserted by NESTING rather than by line order: both bounds are locals, and a `<span>` that
      merely appears after the opening tag could still be a sibling.
    */
    const opensAt = screenPaneCode.indexOf('id="video-screen-container-{id}"');
    expect(opensAt, 'the container must exist').toBeGreaterThan(-1);

    let depth = 0;
    let sawSpanInside = false;
    let closedAt = -1;
    const tags = /<div\b|<\/div>|<span class="overlay-userID-container"/g;
    tags.lastIndex = screenPaneCode.lastIndexOf('<div', opensAt);
    for (let m = tags.exec(screenPaneCode); m; m = tags.exec(screenPaneCode)) {
      if (m[0].startsWith('<span')) {
        if (depth > 0) sawSpanInside = true;
        continue;
      }
      depth += m[0] === '<div' ? 1 : -1;
      if (depth === 0) {
        closedAt = m.index;
        break;
      }
    }
    expect(closedAt, 'the container must be closed').toBeGreaterThan(opensAt);
    expect(sawSpanInside, 'the watermark must nest inside the fullscreened container').toBe(true);
  });

  it('the stream player, from the SAME answer rather than its own gate', () => {
    expect(streamingCode).toContain('{#if userIdWatermark}');
    /*
      The gate expression is gone from both components. It was spelled out in `StreamingView` and
      absent from `ScreenPane`, which is exactly how a rule with two consumers ends up with one.
    */
    expect(streamingCode).not.toContain('overlayUserIdOnScreenshare');
    expect(screenPaneCode).not.toContain('overlayUserIdOnScreenshare');
    expect(streamingCode).not.toContain('userXrefID');
    expect(screenPaneCode).not.toContain('userXrefID');
  });

  it('and the page resolves it once, for both', () => {
    expect(areaCode).toContain('const userIdWatermark = $derived(');
    expect(areaCode).toContain('resolveUserIdWatermark({');
    expect(areaCode).toContain('viewerIsPresenter: isPresenter');
    expect(areaCode).toContain(
      'overlayUserIdOnScreenshare: data.sessData?.overlayUserIdOnScreenshare === true'
    );
    // Fed to BOTH — the absence of the second feed is the whole defect.
    expect(areaCode.match(/\{userIdWatermark\}/g) ?? []).toHaveLength(2);
  });
});
