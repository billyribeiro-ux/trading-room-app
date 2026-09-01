import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * NO FILE UNDER `src/` STATES WHAT `package.json` PINS AS A LITERAL.
 *
 * ## The two claims that made this necessary, and the one that must NOT be caught
 *
 * `declaration-tag-contract.test.ts` — in this app and in the room, the same sentence twice — said
 * *"`package.json` pins **5.56.10**"*. On 2026-08-31 it pinned **5.57.0**. Neither claim was
 * load-bearing and neither had ever been read by anything, which is exactly what makes the shape
 * worth removing: a number in prose beside the thing it counts is the copy nobody updates, and it
 * drifts silently until somebody reasons from it. Both now READ the pin and assert the FLOOR the
 * feature actually needs — 5.56, where declaration tags arrived — which survives every upgrade.
 *
 * **A dated observation is the opposite of this and is deliberately allowed.** This repository is
 * full of sentences like *"`Handle` comes from `@sveltejs/kit/hooks` as of `3.0.0-next.23`"*,
 * *"read against `3.0.0-next.16` and RE-READ against `3.0.0-next.23`"*, and *"`svelte@5.57.0`'s
 * emitted module for this file"*. Those record WHICH version was examined, which is the evidence
 * discipline the root standard requires; forcing them to equal today's pin would destroy the
 * information they carry. So this file catches the CLAIM ABOUT THE PIN and nothing else.
 *
 * `docs/` is out of scope for the same reason, one level up: `SVELTE-CONFORMANCE-AUDIT.md` is a
 * dated audit record and quoting the versions it was run against is correct. Its header carries a
 * version correction instead, which is a thing a human writes and not a thing a gate can.
 *
 * ## A gate on a PHRASING collides with the record of that phrasing, and this one did immediately
 *
 * The corrected docblock in `declaration-tag-contract.test.ts` quoted the claim it was retiring —
 * *"said `pins 5.56.10`"* — and this file flagged it, correctly and uselessly, on its first run. The
 * history is worth keeping and the number IS the evidence, so the sentence was rephrased to name the
 * patch version without the present-tense verb rather than the gate being widened to guess at intent.
 *
 * That is the third self-reference of the day, after `reference-const-coverage-contract` reading its
 * own table and `comment-path-citations-contract` reading its own account of a bad path. A file
 * whose subject is a defect will contain the defect; the fix is at the record, never a hole in the
 * rule.
 */

const PACKAGE = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const PINS: Record<string, string> = { ...PACKAGE.dependencies, ...PACKAGE.devDependencies };

/**
 * A sentence asserting what this repository PINS.
 *
 * Narrow on purpose. `pins`/`pinned`/`baseline` within a short reach of a semver is the phrasing
 * both stale claims used, and it is the phrasing a reader takes as current fact. `as of`, `read
 * against` and `@version` are none of these and are not matched.
 */
const PIN_CLAIM = /\b(?:pins|pinned at|pinned to|baseline is|baseline:)\s*\**`?(\d+\.\d+\.\d+)`?/gi;

const SOURCES = globSync('src/**/*.{svelte,ts}');

describe('the sweep is measuring something', () => {
  it('reads a corpus and knows this app s own pins', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    expect(PINS.svelte, 'svelte must be pinned for any of this to mean anything').toMatch(/^\d+\.\d+\.\d+/);
    expect(PINS['@sveltejs/kit']).toBeDefined();
  });
});

describe('no source file quotes the pin', () => {
  it('names each claim that does, with the version it states', () => {
    /*
      Reported as a LIST so one run says everything that is wrong. The message carries the stated
      version and the file, because the fix is never "change the number" — it is to read the pin or
      to assert the floor the code actually needs.
    */
    const claims: string[] = [];
    for (const file of SOURCES) {
      if (file.includes('svelte-version-claims-contract')) continue;
      for (const match of readFileSync(file, 'utf8').matchAll(PIN_CLAIM)) claims.push(`${file} states ${match[1]}`);
    }
    expect(
      claims,
      'a source file asserts what package.json pins as a literal; read the pin, or assert the ' +
        'floor the feature needs, so the claim cannot drift'
    ).toEqual([]);
  });
});
