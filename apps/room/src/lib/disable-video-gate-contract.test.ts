import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';

/*
  `preferences.disableVideo` — the viewer's own "Video off to preserve data" switch.

  WHY THIS FILE EXISTS, and it is not "because the feature is new".

  The checkbox shipped a long time ago (`ModalHost.svelte`, `id="app-disable-video"`). Nothing read
  it: the value was written into `settingChecks` and then read by its own label two lines below
  itself, so ticking it changed the word "Enabled" to "Disabled" and did nothing else. A control
  whose only effect is changing its own label is exactly what `CLAUDE.md` forbids, and it survived
  because it LOOKS wired — there is a handler, there is state, there is a `savePreference` POST.
  Only following the key to a consumer shows there was none.

  So the assertions below are in two halves on purpose:

    * the REFERENCE half reads the decoded component at runtime and states what the flag does
      upstream, so a re-decode that changes it fails here rather than drifting silently;
    * the OURS half states that the flag reaches markup — the half that was missing.

  And it is source-level rather than rendered, for the reason `badge-row-reveal.test.ts` gives:
  `videoDisabled` is client state that SSR always renders false, so a server render is byte
  identical whether the gate works or has been deleted. That blind spot is what let the Select All
  revert pass 780 green tests.
*/

const HELPERS = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.render-helpers.js', import.meta.url),
  'utf8'
);
const AREA = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.full.js', import.meta.url),
  'utf8'
);
const SETTINGS = readFileSync(
  new URL('../../docs/source/components/app-user-settings-modal.full.js', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The preference declarations and the write path moved to `RoomPrefs` in Phase 5 slice 3, so the
  assertions about them read the class that now owns them. The page half is still read above -
  each assertion points at the file that owns its subject.
*/
const PREFS_SOURCE = readFileSync(new URL('./room/prefs.svelte.ts', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');

/** Comments quote the reference at length, so a positional assertion must not read them. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/*
  The presentation area moved to `PresentationArea.svelte` on 2026-08-15. The assertions below
  point at whichever file owns each subject: markup here, the handlers and gates behind it on the
  page.
*/
const paneMarkup = stripComments(
  readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8')
);
const pageMarkup = stripComments(PAGE);
const prefsCode = stripComments(PREFS_SOURCE);

/** One top-level `function NAME(t, n) { … }` out of a decoded render-helper file. */
function helper(source: string, name: string): string {
  const from = source.indexOf(`function ${name}(t, n) {`);
  expect(from, `${name} must exist in the decoded component`).toBeGreaterThan(-1);
  const next = source.indexOf('\nfunction ', from + 1);
  return source.slice(from, next === -1 ? source.length : next);
}

/** The component's `consts:[…]` table, parsed with the repository's own tokenizer. */
function constTable(compiled: string): unknown[] {
  const from = compiled.indexOf('consts: [');
  expect(from, 'the component must declare a consts table').toBeGreaterThan(-1);
  const open = compiled.indexOf('[', from);
  expect(open, 'the consts table must open').toBeGreaterThan(-1);
  const close = compiled.indexOf('\n        ],\n        template:', open);
  expect(close, 'the consts table must close before the template').toBeGreaterThan(open);
  return parseConstTable(compiled.slice(open, close + '\n        ]'.length)) as unknown[];
}

describe('the reference: what disableVideo does upstream', () => {
  it('TSe chooses between the message and the whole screens pane, on preferences.disableVideo', () => {
    const tse = helper(HELPERS, 'TSe');
    /*
      `H(0, eSe, 2, 0, 'h3', 23)(1, wSe, 8, 5)` then
      `O(0, g().appService.globals.preferences.disableVideo ? 0 : 1)`.

      Slot 0 is the message and slot 1 is the pane, so the flag being SET selects the message. The
      polarity is the whole risk in this feature and it is asserted rather than described.
    */
    expect(tse).toContain('appService.globals.preferences.disableVideo');
    expect(tse).toContain("H(0, eSe, 2, 0, 'h3', 23)(1, wSe, 8, 5)");
    expect(tse).toMatch(/disableVideo\s*\?\s*0\s*:\s*1/);
  });

  it('the message is eSe, and it is the exact string this app renders', () => {
    expect(helper(HELPERS, 'eSe')).toContain("v(1, 'Video off to preserve data...')");
  });

  it("the message's class is const 23 — text-center mt-4", () => {
    expect(constTable(AREA)[23]).toEqual([1, 'text-center', 'mt-4']);
  });

  it('the branch it replaces is the ENTIRE pane: strip, tabs and content', () => {
    /*
      `wSe` is not just the videos. It holds the "No one is presenting right now..." h3 (`tSe`), the
      `ul` at const 70, and the `div` at const 72 which is `screensTabsContent`. That is why the
      gate in `+page.svelte` wraps everything rather than hiding the `<video>` elements: a tab strip
      with nothing under it would still be consuming streams, which defeats the point of a
      data-saving switch.
    */
    const wse = helper(HELPERS, 'wSe');
    expect(wse).toContain("H(0, tSe, 2, 0, 'h3', 23)");
    expect(wse).toContain("d(1, 'ul', 70)");
    expect(wse).toContain("d(5, 'div', 72)");
    const consts = constTable(AREA);
    expect(consts[72]).toContain('screensTabsContent');
  });

  it('the checkbox is checked when video is ENABLED — the binding is inverted', () => {
    expect(SETTINGS).toContain("z('checked', !o.appService.globals.preferences.disableVideo)");
  });

  it('disableVideoChange does NOT persist, alone among its neighbours', () => {
    /*
      This is the evidence for `videoDisabled` starting false on every load instead of being read
      back out of the saved preferences. `beepOnUserLeaveChange`, `popupOnUserLeaveChange` and
      `smallImagePreviewOnChange` all call `setPreference`; this one flips the flag and stops. Both
      halves are asserted, because "X does not call Y" is worth nothing unless Y is shown to be the
      thing everything else calls.
    */
    const from = SETTINGS.indexOf('disableVideoChange() {');
    expect(from, 'disableVideoChange must exist').toBeGreaterThan(-1);
    const body = SETTINGS.slice(from, SETTINGS.indexOf('\n    }', from));
    expect(body).toContain('preferences.disableVideo');
    expect(body).not.toContain('setPreference');

    const neighbour = SETTINGS.indexOf('beepOnUserLeaveChange() {');
    expect(neighbour, 'beepOnUserLeaveChange must exist in the settings component').toBeGreaterThan(
      -1
    );
    expect(SETTINGS.slice(neighbour, SETTINGS.indexOf('\n    }', neighbour))).toContain(
      'setPreference'
    );
  });
});

describe('ours: the flag reaches the markup', () => {
  it('starts false rather than being restored, matching the non-persisting handler', () => {
    expect(prefsCode).toContain('this.#videoDisabled = $state(false);');
    // Not `prefs.loaded[...]` — see the reference assertion above for why that is deliberate.
    expect(pageMarkup).not.toMatch(/videoDisabled\s*=\s*\$state\([^)]*prefs.loaded/);
  });

  it('the settings checkbox is wired to it, INVERTED', () => {
    /*
      The modal reports whether the box is TICKED, and ticked means video is on. Storing the value
      uninverted would blank the screens pane for every viewer who has video enabled, which is all
      of them by default — a defect that would look like "the room is broken", not like a
      preference bug.
    */
    expect(PREFS_SOURCE).toContain("if (key === 'disableVideo') this.#videoDisabled = !value;");
  });

  it('persists under the reference name, not the element id', () => {
    /*
      `disableVideo` is what the reference calls it (`app-user-settings-modal.full.js:1223-1226`).
      This keyed off `app-disable-video` when it was first built, because the modal's old
      `?? input.id` fallback sent the element id — the same fallback that wrote nineteen dead keys
      into every settings blob. With the fallback gone an unmapped id sends nothing at all, so this
      mapping row is now what keeps the gate connected.
    */
    expect(stripComments(MODAL)).toContain("'app-disable-video': 'disableVideo'");
  });

  it('both halves start at "video on" without being wired to each other', () => {
    expect(stripComments(MODAL)).toContain("'app-disable-video': true");
  });

  it('renders the reference string, with the reference class', () => {
    expect(paneMarkup).toContain('<h3 class="text-center mt-4">Video off to preserve data...</h3>');
  });

  it('gates the WHOLE pane — the tabs and the content are in the else branch', () => {
    /*
      Positional, because "both strings are in the file" would pass just as happily if the gate
      rendered the message ABOVE an untouched pane — which is the one wrong shape a reader would
      never notice, since the message would be visible and the screens would keep streaming
      underneath it.
    */
    const gate = paneMarkup.indexOf('{:else if videoDisabled}');
    expect(gate, 'the screens pane must be gated on videoDisabled').toBeGreaterThan(-1);
    const message = paneMarkup.indexOf('Video off to preserve data...', gate);
    const otherwise = paneMarkup.indexOf('{:else}', gate);
    const tabs = paneMarkup.indexOf('<ScreenTabs', gate);
    const content = paneMarkup.indexOf('id="screensTabsContent"', gate);
    const close = paneMarkup.indexOf('{/if}', content);
    const streams = paneMarkup.indexOf('id="streams"', gate);

    expect(message).toBeGreaterThan(gate);
    expect(otherwise).toBeGreaterThan(message);
    expect(tabs).toBeGreaterThan(otherwise);
    expect(content).toBeGreaterThan(tabs);
    expect(close).toBeGreaterThan(content);
    expect(streams).toBeGreaterThan(close);
  });
});
