import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The four anchors for the Files pane's two gates, split out on 2026-09-03.
 *
 * ## What they were costing
 *
 * `files-gates.test.ts` holds eleven cases and seven of them EXECUTE the gates —
 * `filesSectionHidden`, `alertSoundButtonFor` and `alertSoundCommandValue` — over real fixtures.
 * Among them is the one that file exists for: `offers exactly ONE of the two for any file, in every
 * configuration`. Its header says why that matters — the two branches are COMPLEMENTS, so *"a
 * missing input does not hide both buttons, it shows both at once"*, which is how a room that never
 * received the setting announces itself with two contradictory buttons on every sound file.
 *
 * A module-scope read of the gitignored `docs/source` took all eleven out of every checkout without
 * the dumps, because `gate/evidence-bound-tests.mjs` excludes by FILE.
 *
 * ## What is here
 *
 * Four anchors, each named for what it anchors. Two were whole cases; two were one line inside a
 * case whose remainder is about this application.
 */

const bundle = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.full.js', import.meta.url),
  'utf8'
);

/** The flattened const table and update block — see `files-pane-capture.test.ts` for why. */
const flat = bundle.replace(/\n\s*/g, '');

describe('hideFiles, in the capture', () => {
  it('is still bound to both elements in the bundle', () => {
    /*
      ANCHORS `hideFiles` in `files-gates.test.ts`, and the two reads differ on purpose: the
      main-tab `li` at 5375 is one line and survives the flatten unchanged, while the `#files` pane
      at 5410-5413 is broken across four lines, so only the flattened text holds it entire.
    */
    expect(bundle).toContain("z('hidden', o.hideFiles)");
    expect(flat).toContain(
      "z('ngClass', ut(61, Hr, 'presAreaTabs-files' == o.selectedMainTab))('hidden',o.hideFiles)"
    );
  });

  it('and really is ORed with videoOnlyMode, which this room has no equivalent of', () => {
    /*
      ANCHORS `reads hideFiles ALONE, because the reference ORs in a mode this room does not have`.
      `videoOnlyMode` is not a setting — `main.d6d3c112b59b7d0d.js` sets it from the `r` query
      parameter, the recording-bot mode. Recorded as an ABSENT TERM rather than invented, and the
      free file asserts our `filesSectionHidden` body does not mention it.
    */
    expect(bundle).toContain('this.appService.globals.videoOnlyMode');
  });
});

describe('the alert-sound row buttons, in the capture', () => {
  it('still reads the captured gating out of the bundle', () => {
    /*
      ANCHORS the whole `the alert-sound row buttons` block. Consts 22 and 23 are the two branches,
      and reading them side by side is what shows they are complements rather than two independent
      conditions — which is the property `alertSoundButtonFor` implements and the free file executes.
    */
    expect(flat).toContain(
      "O(22,i.isP &&e.contentType.indexOf('audio/') >= 0 &&(!i.appService.globals.sessData.overwriteCashRegisterSound ||"
    );
    expect(flat).toContain(
      "O(23,i.isP &&e.contentType.indexOf('audio/') >= 0 &&i.appService.globals.sessData.overwriteCashRegisterSound &&"
    );
  });

  it('and removes with the EMPTY STRING rather than the url being removed', () => {
    /*
      ANCHORS `sends the EMPTY STRING to remove, not the url being removed`, which executes
      `alertSoundCommandValue` for both directions. `{ url: i ? e : '' }` — full.js:3084-3086.
    */
    expect(bundle).toContain(
      "sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' })"
    );
  });
});
