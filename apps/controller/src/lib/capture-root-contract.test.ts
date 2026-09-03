import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CAPTURE_ROOT } from './reference-capture.js';

/**
 * No gate may name a path on one person's machine.
 *
 * ## What was measured on 2026-09-03
 *
 * `verify-account-styles.mjs` is a real verifier with its own positive-control suite — a sibling of
 * `verify-manage-styles.mjs`, which its header says *"has caught real, user-visible colour bugs in
 * `manage.css` that every other gate in the project passed"*. Running it in this container produced:
 *
 * ```
 * Error: ENOENT: no such file or directory, open
 *   '/Users/billyribeiro/Desktop/new-room/scripts/collect-account-2026-08-08T20-19-23-396Z.json'
 * ```
 *
 * A stack trace whose most prominent detail is a directory on a machine the reader does not have.
 * Two more scripts held the same shape — `build-style-contract.mjs` and
 * `build-manage-style-contract.mjs` — and none of the three is invoked by `package.json` at all.
 *
 * **`src/lib/reference-capture.ts` had already solved this on 2026-08-15**, and its own header
 * records the identical failure: *"Five test files held the absolute path as a literal. They passed
 * on the owner's machine and threw `ENOENT` anywhere else — two at module scope, which fails the
 * whole SUITE rather than a test, so the reason was buried in a stack trace instead of being
 * stated."* The suites adopted it; the scripts never did. **A fix that lands in one half of a
 * repository is a fix that the other half will re-earn.**
 *
 * ## What this asserts
 *
 * The property, not the three files: no script under `scripts/` or `gate/` may carry an absolute
 * home-directory path, so the fourth one cannot arrive quietly. `capture-root.mjs` is the single
 * exception and it is the one place the default is allowed to live — checked here against the `.ts`
 * module's, so the two copies cannot drift.
 */

const CONTROLLER = new URL('../../', import.meta.url).pathname;

/*
  Both script directories, and the room's too. The failure class is not specific to the controller —
  the room's `gate/` runs the enumerations every triage document in this repository is measured
  against, and a hardcoded path there would take those with it.
*/
const SCRIPTS = [
  ...globSync(`${CONTROLLER}scripts/**/*.mjs`),
  ...globSync(`${CONTROLLER}../room/gate/**/*.mjs`),
  ...globSync(`${CONTROLLER}../room/e2e/**/*.mjs`)
];

/** The one file allowed to name the default, because naming it once is the whole point. */
const OWNS_THE_DEFAULT = 'capture-root.mjs';

describe('no gate names somebody s home directory', () => {
  it('reads a real set of scripts, so the sweep is not empty', () => {
    /*
      The instrument first. A glob that matched nothing would pass every assertion below over an
      empty universe — the vacuity failure this repository has met five times, and the reason every
      sweep here carries a floor.
    */
    expect(SCRIPTS.length).toBeGreaterThan(15);
  });

  it.each(['/Users/', '/home/billy', 'C:\\\\Users\\\\'])('no script carries %s', (literal: string) => {
    const offenders = SCRIPTS.filter((path) => !path.endsWith(OWNS_THE_DEFAULT))
      .filter((path) => readFileSync(path, 'utf8').includes(literal))
      .map((path) => path.slice(CONTROLLER.length));

    expect(
      offenders,
      `a gate that names one machine can only run on that machine — route it through capture-root.mjs`
    ).toEqual([]);
  });

  it('and the one file that DOES name it agrees with the module it mirrors', () => {
    /*
      `capture-root.mjs` is a deliberate second copy: these are plain `node` invocations with no
      build step, so they cannot import the `.ts` module — the same duplication
      `extract-manage-schema.mjs` carries for `ROOM_VISIBLE_SETTINGS` and for the same stated reason.

      A copy nothing compares is a copy that drifts, so the defaults are compared. Read from the
      SOURCE rather than imported, because importing it would read `PTR_CAPTURE_ROOT` from whatever
      environment the suite happens to run in and compare two overrides instead of two defaults.
    */
    const source = readFileSync(`${CONTROLLER}scripts/${OWNS_THE_DEFAULT}`, 'utf8');
    const declared = /CAPTURE_ROOT = process\.env\.PTR_CAPTURE_ROOT \?\? '([^']+)'/.exec(source);
    expect(declared, 'capture-root.mjs must declare the default').not.toBeNull();

    /*
      `CAPTURE_ROOT` imported from the `.ts` module reflects the environment too, so this compares
      against the module's own literal when nothing is set — which is the case in the gate, and is
      asserted rather than assumed.
    */
    expect(process.env.PTR_CAPTURE_ROOT ?? declared![1]).toBe(CAPTURE_ROOT);
  });

  it('and each of the four orphaned verifiers has a NAME somebody can run', () => {
    /*
      Measured 2026-09-03: four verifiers under `scripts/` were invoked by no `package.json` script
      at all — `verify-account-styles.mjs` and its own positive-control suite, and the two deployed
      smokes. A gate nobody can name is a gate nobody runs, and this repository has already written
      down what that costs: *"A gate that cannot execute is a gate that drifts silently."*

      NAMED but deliberately NOT in `gate`. Two of the four need a live host and the other two need a
      capture that is not in this repository, so adding them to the gate would break it for everyone
      — which is the same treatment `verify-room-settings-schema.mjs` gets, and for the same reason.
      What changes is that an operator who holds the evidence has a command instead of a file path.
    */
    const scripts = JSON.parse(readFileSync(`${CONTROLLER}package.json`, 'utf8')).scripts as Record<string, string>;
    const named = Object.values(scripts).join(' ');
    for (const verifier of [
      'verify-account-styles.mjs',
      'verify-account-styles.controls.mjs',
      'verify-deployed-media.mjs',
      'verify-deployed-production.mjs'
    ]) {
      expect(named, `${verifier} must be runnable by name`).toContain(verifier);
    }

    /* And they must NOT be in the gate, which cannot see a capture or a host. */
    expect(scripts.gate).not.toContain('account:styles');
    expect(scripts.gate).not.toContain('deployed:');
  });

  it('and every script that reads a capture can SAY so when it is missing', () => {
    /*
      The half that the ENOENT failed at. `capture-root.mjs` exits with the file, the root, the
      override and why the captures are absent from this repository — a sentence somebody can act
      on. Pinned so a later edit cannot quietly reduce it to a throw.
    */
    const source = readFileSync(`${CONTROLLER}scripts/${OWNS_THE_DEFAULT}`, 'utf8');
    expect(source).toContain('MISSING CAPTURE');
    expect(source).toContain('PTR_CAPTURE_ROOT');
    expect(source).toContain('process.exit(1)');
  });
});
