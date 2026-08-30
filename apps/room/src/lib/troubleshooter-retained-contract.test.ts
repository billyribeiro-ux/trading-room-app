import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE CONNECTIVITY/MIC TROUBLESHOOTER IS NOT GONE FROM v4, AND A TRACKER SAID IT WAS.
 *
 * ## The claim, and what measuring it produced
 *
 * `NEW-TODO.md` §2.6 read, in full:
 *
 * > **2.6 Removed upstream — check whether we built it.** `"Connectivity/Mic Troubleshooter"` is in
 * > our older bundle and **gone** from the current v4. If we built it, it should probably come out.
 * > If we did not, do not build it.
 *
 * We did build it — `ModalHost.svelte`, `#webrtc-troubleshooter-modal`, four tabs. So the row's
 * instruction was to delete a working feature.
 *
 * **The premise is false.** Counted in the current v4 bundle with `String.indexOf`, not `grep -c`
 * (the bundle is one line, so a line-based count returns 1 or 0 and destroys every real number —
 * the mistake `missing-commands-triage.md` records being made on 2026-08-15):
 *
 * ```
 * Connectivity/Mic        2
 * webrtc-troubleshooter   8
 * troubleshooter-tabs     6
 * Troubleshooter          2
 * ```
 *
 * Nothing about it was removed. Where the claim came from is not recoverable — the older bundle it
 * compares against is gitignored — and it does not matter: the current bundle is the authority for
 * what v4 has, it is SHA-256 pinned in this repository, and it says the feature is there.
 *
 * ## Why this is a test and not only a deletion
 *
 * The row is gone from `NEW-TODO.md`, which stops a reader acting on it. It does not stop the claim
 * being re-derived — "I searched the bundle and did not find it" is one bad grep away, and the
 * consequence is a silent feature deletion that no other gate here would catch: removing a modal
 * breaks no type, no lint rule and no other test.
 *
 * So the measurement is pinned against the bundle itself. If a future v4 genuinely drops the
 * feature, this fails, and THAT is the moment to have the conversation — with evidence, rather than
 * on a sentence.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUNDLE = readFileSync(`${ROOT}../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, 'utf8');
const MODAL_HOST = readFileSync(`${ROOT}lib/components/ModalHost.svelte`, 'utf8');

/**
 * Occurrences of a literal, counted the only way that works on a one-line bundle.
 *
 * `grep -c` counts LINES and the bundle is one, so it answers 1 or 0 for everything. Recorded here
 * because that error was made once in this repository and nearly caused a correct report to be
 * dismissed.
 */
function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let at = 0;
  while ((at = haystack.indexOf(needle, at)) !== -1) {
    count++;
    at += needle.length;
  }
  return count;
}

describe('the reference still ships the troubleshooter', () => {
  it('reads the bundle the room was ported from', () => {
    /* The vacuity floor: an empty or moved file makes every count below zero and agree with itself. */
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it.each([
    ['Connectivity/Mic', 2],
    ['webrtc-troubleshooter', 8],
    ['troubleshooter-tabs', 6]
  ])('has %s %i times', (needle, expected) => {
    expect(
      occurrences(BUNDLE, needle),
      `NEW-TODO §2.6 said this was removed upstream and it is not. Do not delete the modal on the ` +
        `strength of a sentence — if a NEW bundle genuinely drops it, update this file with the ` +
        `measurement and then decide.`
    ).toBe(expected);
  });
});

describe('and this room still has it', () => {
  it('renders the modal the row would have had us delete', () => {
    expect(MODAL_HOST).toContain('id="webrtc-troubleshooter-modal"');
    expect(MODAL_HOST).toContain('troubleshooter-tabs');
    /*
      The title stopped being a literal on 2026-08-30 with CONN-04: the reference swaps between
      ` Connectivity/Mic Troubleshooter ` and ` Connectivity Troubleshooter ` on `isPresenter`
      (`O(5, isPresenter ? 5 : 6)`, byte 2,433,777), because a member has no Mic tab to troubleshoot.
      Both strings are still here, which is what this row is about — the modal was not deleted — so
      the assertion follows the binding rather than being relaxed.
    */
    expect(MODAL_HOST).toContain(
      "title={isPresenter ? 'Connectivity/Mic Troubleshooter' : 'Connectivity Troubleshooter'}"
    );
  });
});
