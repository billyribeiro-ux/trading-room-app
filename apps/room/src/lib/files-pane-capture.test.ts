import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The eight assertions in the Files-pane family that need a CAPTURE, split out on 2026-09-03.
 *
 * ## What the split bought, and what its absence was costing
 *
 * `files-pane-contract.test.ts` is 1,343 lines and **sixty-four cases** — the largest contract file
 * in this suite. It read `docs/source/components/app-presentationarea.full.js` at MODULE SCOPE, and
 * `docs/source` is one of the gitignored capture roots, so `gate/evidence-bound-tests.mjs` excluded
 * **the whole file** on any checkout without the dumps. That is this container, and it is CI.
 *
 * Of those sixty-four, **eight** touch a capture. The other fifty-six read `FilesPane.svelte`,
 * `PresentationArea.svelte`, `create-room.svelte.ts`, `files.svelte.ts`, `file-sort.ts`, `app.css`,
 * `tokens.css`, the v4 bundle and stylesheet (both COMMITTED), and a real better-sqlite3 database —
 * every one of them present in every checkout. Among them are the twelve `files-pane.remote.ts`
 * authority cases: *refuses a member*, *refuses another room's file by id*, *closes the TOCTOU in
 * one statement*. **Twelve tenancy assertions on a fintech application, excluded from CI by a read
 * nobody's authority case used.**
 *
 * ## Why these eight are ANCHORS rather than transcriptions
 *
 * Six of the eight were one line inside a much larger case. `gates the Files tab AND the pane on
 * hideFiles` is fifty lines about our two elements, our config client, our prop hand-off and our
 * stylesheet ordering, opening with a single `expect(bundle).toContain("z('hidden', o.hideFiles)")`.
 * That line is not the case's subject; it is its ANCHOR — the statement that the thing our markup is
 * transcribed FROM still says what we transcribed. Moving the anchor and leaving the transcription
 * is the honest partition, and it is why each case here is named for what it anchors.
 *
 * The free file names this one at each seam, so a reader who holds the dumps can pair them.
 *
 * **A test that cannot run is not a weaker test. It is a claim nobody is checking.**
 */

const bundle = readFileSync(
  new URL('../../docs/source/components/app-presentationarea.full.js', import.meta.url),
  'utf8'
);

/*
  The const table with the newlines and indentation of the pretty-printed bundle removed — the same
  construction the free file used, and for the same reason: every const in
  `app-presentationarea.full.js` is an array literal broken across lines, so a `toContain` against
  the raw text can only match one element at a time, and a claim about the attributes an element
  does NOT have becomes unwritable. Flattened, a whole const is one string and can be pinned entire.
*/
const consts = bundle.replace(/\n\s*/g, '');

describe('the update block the permission gates are transcribed from', () => {
  it('still gates 77, 81 and 83 on the presenter', () => {
    /*
      ANCHORS `files pane permissions` in the free file. If these vanish, the three `isPresenter`
      guards it asserts over `FilesPane.svelte` are pinned to nothing and must be re-derived.
    */
    expect(bundle).toContain('O(77, o.isP ? 77 : -1)');
    expect(bundle).toContain('O(81, o.isP ? 81 : -1)');
    expect(bundle).toContain('O(83, o.isP && o.mp3Playing ? 83 : -1)');
  });

  it('and still hides the Files tab and pane on hideFiles', () => {
    /*
      ANCHORS `gates the Files tab AND the pane on hideFiles`. `z('hidden', o.hideFiles)` sits on the
      main-tab `li` (full.js:5375) and on the `#files` pane (5410-5413) — which is why ours gates
      BOTH, in two files, rather than one of them.
    */
    expect(bundle).toContain("z('hidden', o.hideFiles)");
  });
});

describe('the strings and consts the markup is transcribed from', () => {
  it('still carries the empty heading whose gate cannot fire here', () => {
    /*
      ANCHORS `does NOT render the captured empty heading`. The heading is REAL in the reference —
      that is the whole reason its absence from ours needs an argument rather than a shrug. What
      changed is that its gate (`sessionFiles` FALSY) cannot arise behind a loader ending in
      `.all()`, so the element is not rendered and the free file pins the ELEMENT's absence.
    */
    expect(bundle).toContain("v(1, 'No room files found.')");
  });

  it('still rounds file size by 1024, which fileSizeInKb EXECUTES', () => {
    /*
      ANCHORS `reports size the way the capture does`. That case used to assert this expression as a
      STRING and prove only that the text existed; `fileSizeInKb` is executed there now. This is the
      half that says the executed rule is the captured one.
    */
    expect(bundle).toContain('i.round(e.size / 1024)');
  });

  it('still declares the search input with neither an id nor a name', () => {
    /*
      ANCHORS `the files search input`. The free file asserts our `<input>` tag carries neither
      attribute; this is the const that makes that a MATCH rather than an omission. Const 39.
    */
    expect(consts).toContain(
      "['type','text','placeholder','Search files...','aria-label','search'," +
        "'aria-describedby','addon-wrapping',1,'form-control',3,'ngModelChange','ngModel']"
    );
  });

  it('still declares both alert-sound buttons, one of them with the `pe` typo', () => {
    /*
      ANCHORS `is transcribed from consts 261/262/263`. Const 263 spells the attribute `pe="button"`
      where every sibling spells `type` — a typo in the original, harmless only because the files
      table sits in no `form`. The free file asserts ours writes `type` on both and that `pe=`
      reaches no rendered tag; these two consts are what that correction is a correction OF.
    */
    expect(consts).toContain(
      "['type','button','title','Overwrite Cash Register Sound',1,'btn','ml-2','btn-info'," +
        "'set-alert-sound-btn',3,'click']"
    );
    expect(consts).toContain(
      "['pe','button','title','Remove Overwrited Cash Register Sound',1,'btn','ml-2','btn-info'," +
        "'set-alert-sound-btn',3,'click']"
    );
  });
});

describe('the OLDER capture, which did not have the sort bar', () => {
  it('is genuinely silent about it, which is why that bar was first built from a paste', () => {
    /*
      ANCHORS `files sort bar: the evidence it is pinned to`. Evidence has a DATE. The search that
      once reported "the sort bar is nowhere in the capture" was not wrong — our evidence was older
      than the feature, and `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` (COMMITTED, so the
      v4 half of that block runs everywhere) holds the whole control.

      This half stays here because it reads the OLD bundle, and that one is gitignored. Keeping it
      matters: the older capture's silence is the recorded reason the first build of the bar was a
      paste rather than a transcription, and a reason with no test is a reason that gets edited away.

      `css/complete-app-styles.css` is COMMITTED and could have stayed in the free file; it is read
      here because the pair is one claim — neither artefact of that vintage knew about this bar.
    */
    const captured = readFileSync(
      new URL('../../css/complete-app-styles.css', import.meta.url),
      'utf8'
    );
    const main = readFileSync(
      new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
      'utf8'
    );
    expect(main).not.toContain('st-fileSortBar');
    expect(captured).not.toContain('.st-fileSortBar');
  });
});

describe('the presenter-tab capture', () => {
  it('shows screens-tab as the active one, which is why the room opens there', () => {
    /*
      ANCHORS `the room opens on Screens`. The free file keeps the assertion about OUR default —
      `let mainTab: MainTab = $state('screens')` — because that is a claim about this repository.
      This is the evidence it is a match to: a live capture of the presenter's own tab strip, in
      which `screens-tab` carries `aria-selected="true"`.

      The room defaulted to 'notes' before this was read, so a member landed on an empty Notes pane.
    */
    const evidence = readFileSync(
      new URL('../../new-evidence/presenter-tab', import.meta.url),
      'utf8'
    );
    /*
      Both positions bound to locals and asserted found, per `slice-anchor-contract.test.ts`: an
      `indexOf` that misses returns -1, `slice(-1)` yields ONE character, and a `toContain` over one
      character fails for the wrong reason while a `not.toContain` passes for no reason at all.
    */
    const at = evidence.indexOf('id="screens-tab"');
    expect(at, 'the screens tab must exist in the capture').toBeGreaterThan(-1);
    const screensTab = evidence.slice(at);
    const tagEnd = screensTab.indexOf('>');
    expect(tagEnd, 'the tab element must be closed').toBeGreaterThan(-1);
    expect(screensTab.slice(0, tagEnd)).toContain('aria-selected="true"');
    expect(evidence).toContain('class="nav-link active"');
  });
});
