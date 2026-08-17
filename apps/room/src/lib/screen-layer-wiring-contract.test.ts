import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  THE SFU SPATIAL LAYER FOLLOWS THE SELECTED SCREEN TAB — and nothing guarded that it does.

  ## Why this file exists

  `RoomMediaTransport.applyScreenLayers()` asks the SFU for the top spatial layer on the screen the
  viewer is watching and layer 0 on the rest. Without it a room with four shared screens pulls
  full-resolution video for all four while somebody looks at one.

  The METHOD is real code in `media-transport.svelte.ts`. What had no guard at all was the WIRING —
  the effect that decides when to call it. Measured on 2026-08-17 while moving that effect from
  `+page.svelte` to `PresentationArea.svelte`: `applyScreenLayers` appeared in exactly two files in
  `src/`, the class and the caller, and in NO test. Deleting the effect outright left the suite green
  at 2,402. That is the definition of unguarded, and it was found by asking the question rather than
  by anything failing.

  ## The assertion that carries the weight

  Not "the effect exists" — "the two `void` reads exist". They are the part a reasonable person
  removes.

  ```js
  $effect(() => {
    void screens.selectedTab;                 // <- looks like dead code
    void mediaTransport.screenStreams.size;   // <- looks like dead code
    void mediaTransport.applyScreenLayers();
  });
  ```

  `applyScreenLayers` reads `selectedTab` and the stream map INTERNALLY, through `this`. An effect
  only tracks what it reads SYNCHRONOUSLY in its own body, and that method is `async`, so everything
  past its first `await` is untracked. Strip the two `void` lines and the effect runs once on mount
  and never again: switching tabs leaves the newly-selected screen on layer 0. Soft video, no error,
  no failing test, and a plausible-looking tidy-up in the commit that caused it.

  This is asserted against SOURCE rather than by mounting, for the reason the sibling contracts give:
  the failure is a call site going missing, which is a property of the source and survives whatever
  the component tree looks like. Proving the layer actually changed needs a live SFU.

  ## Both ends, always

  The positive half is asserted against `PresentationArea.svelte` and the negative half against
  `+page.svelte`. A second copy of this effect would ask the SFU twice per tab switch, and the
  positive half alone would stay green through it — the same lesson `arrival-delivery-contract` and
  `chat-popup-contract` each learned in S3.
*/

const PRESENTATION = readFileSync(
  new URL('./components/PresentationArea.svelte', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const TRANSPORT = readFileSync(
  new URL('./room/media-transport.svelte.ts', import.meta.url),
  'utf8'
);

/** Comments stripped, so prose quoting a call can never satisfy an assertion about a call. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const presentationCode = stripComments(PRESENTATION);
const pageCode = stripComments(PAGE);

describe('the screen spatial-layer effect is wired, and stays wired', () => {
  it('the method it calls is real, and prefers the selected tab', () => {
    /*
      The floor. If `applyScreenLayers` were renamed or gutted, every assertion below would be about
      a call to nothing — so the callee is checked before the call sites are.
    */
    expect(TRANSPORT).toContain('async applyScreenLayers()');
    expect(TRANSPORT).toContain('screen.id === this.#screens.selectedTab ? TOP_SPATIAL_LAYER : 0');
  });

  it('lives in the component that renders the screen, not on the page', () => {
    const at = presentationCode.indexOf('applyScreenLayers');
    expect(at, 'the spatial-layer effect should be in PresentationArea').toBeGreaterThan(-1);

    const opened = presentationCode.lastIndexOf('$effect(() => {', at);
    expect(opened, 'applyScreenLayers must be called from inside an $effect').toBeGreaterThan(-1);

    // MOVE, not copy. Two effects means two round trips to the SFU on every tab switch.
    expect(pageCode, 'the spatial-layer effect left the page in S5').not.toContain(
      'applyScreenLayers'
    );
  });

  it('KEEPS the two void reads, which look like dead code and are the dependencies', () => {
    const at = presentationCode.indexOf('void mediaTransport.applyScreenLayers()');
    expect(at, 'the call should be present before its dependencies are checked').toBeGreaterThan(
      -1
    );
    const opened = presentationCode.lastIndexOf('$effect(() => {', at);
    const body = presentationCode.slice(opened, at);

    /*
      Both must be INSIDE the same effect and BEFORE the call — an effect tracks what it reads
      synchronously, and `applyScreenLayers` is `async`, so a read placed after it would be untracked
      exactly like the reads inside the method already are.
    */
    expect(
      body,
      'without `void screens.selectedTab` the effect never re-runs on a tab switch, and the newly selected screen stays on layer 0 — soft video, no error, no failing test'
    ).toContain('void screens.selectedTab;');
    expect(
      body,
      'without `void mediaTransport.screenStreams.size` a screen arriving or leaving does not re-balance the layers'
    ).toContain('void mediaTransport.screenStreams.size;');
  });
});
