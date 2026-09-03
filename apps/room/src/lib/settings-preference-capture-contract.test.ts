import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { WIRES } from './settings-preference-wiring-contract.test.js';

/**
 * The one assertion in the settings-wiring family that needs a CAPTURE, split out on 2026-09-03.
 *
 * ## Why this file exists, and what its absence was costing
 *
 * `settings-preference-wiring-contract.test.ts` read
 * `docs/source/components/app-user-settings-modal.full.js` at MODULE SCOPE. That path is one of the
 * gitignored capture roots, so `gate/evidence-bound-tests.mjs` excluded **the whole file** on any
 * checkout without the dumps — this container, and CI.
 *
 * Sixteen wires times four cases, plus ten more at the top level. **One** of those needed the
 * capture. Every other assertion reads `ModalHost.svelte`, `prefs.svelte.ts`, `create-room.svelte.ts`
 * and `dead-preference-keys.ts` — files that are right there, committed, in every checkout.
 *
 * And they had drifted. Two assertions in the excluded half were measurably wrong when this split
 * was made: `DEAD_PREFERENCE_KEYS` was asserted `toHaveLength(23)` against a list of 27, and its
 * invented-name group was pinned at four names against eight. Four session keys had been retired
 * into that list across three days — `sessionLocked`, `sessionLockKick`, `sessionOpen`,
 * `sessionTokensRevoked` — and the one test that counts them could not object, because a module-scope
 * read of a file nobody's assertion used had taken the whole suite out of the run.
 *
 * **A test that cannot run is not a weaker test. It is a claim nobody is checking.** The banner is
 * honest about the exclusion; it cannot be honest about what the excluded assertions now say.
 *
 * ## What is here
 *
 * The middle column of the wire: that each preference NAME is the one the reference persists, read
 * from the `setPreference` call in the reference's own handler, rather than inferred from the
 * element id. That is the assertion the capture is genuinely for, and it is the reason the wiring
 * file's header says *"a name typed from memory fails here"*.
 *
 * `WIRES` is imported rather than copied, so the two files cannot disagree about which sixteen wires
 * exist — a second table would be the drift this split exists to end.
 */

const SETTINGS = readFileSync(
  new URL('../../docs/source/components/app-user-settings-modal.full.js', import.meta.url),
  'utf8'
);

describe.each(WIRES)('$id — the preference name against the capture', ({ preference, handler }) => {
  it('is the one the reference persists, not one inferred from the id', () => {
    const from = SETTINGS.indexOf(`${handler}() {`);
    expect(from, `${handler} must exist in the decoded settings modal`).toBeGreaterThan(-1);
    const body = SETTINGS.slice(from, SETTINGS.indexOf('\n    }', from));
    expect(body).toContain(`'${preference}'`);
    expect(body).toContain('setPreference');
  });
});
