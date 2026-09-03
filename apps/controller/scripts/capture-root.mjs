import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Where the reference captures are, for the SCRIPTS — the `.mjs` half of `#lib/reference-capture.ts`.
 *
 * ## Why this is a second copy, and why that is not an oversight
 *
 * `src/lib/reference-capture.ts` has solved this since 2026-08-15 and its docblock records the exact
 * failure: five test files held the absolute path as a literal, *"passed on the owner's machine and
 * threw `ENOENT` anywhere else — two at module scope, which fails the whole SUITE rather than a
 * test, so the reason was buried in a stack trace instead of being stated."*
 *
 * **Three scripts never adopted it**, and on 2026-09-03 they still held the literal:
 * `verify-account-styles.mjs`, `build-style-contract.mjs` and `build-manage-style-contract.mjs`.
 * Running the first in this container produced an `ENOENT` naming
 * `/Users/billyribeiro/Desktop/new-room/…` — a stranger's home directory as the error message, from
 * a gate `package.json` does not invoke at all.
 *
 * These are plain `node a script by path` runs with no build step, so they cannot import the `.ts`
 * module. The duplication is the same one `extract-manage-schema.mjs` carries for
 * `ROOM_VISIBLE_SETTINGS` and records in the same words: *this script has to run before the module
 * it would import exists.* `capture-root-contract.test.ts` pins the two defaults equal, so the copy
 * cannot drift from the original.
 *
 * ## The environment override is the point, not a convenience
 *
 * Quoting the module this mirrors, because the reasoning is unchanged: *"The default is the
 * documented location. `PTR_CAPTURE_ROOT` lets anybody who holds these dumps somewhere else —
 * another machine, a mounted volume, a restored backup — run the same comparisons without editing
 * five files and without the path to somebody's home directory being the contract."*
 */
export const CAPTURE_ROOT = process.env.PTR_CAPTURE_ROOT ?? '/Users/billyribeiro/Desktop/new-room';

/**
 * The OTHER root, and it is a second one because the captures live in two places.
 *
 * `ptr1.json` — the original forensic capture the two style-contract builders read — sits under
 * `Desktop/pro-trading-room-website/`, not under `Desktop/new-room/`. One variable covering both
 * would have made the default wrong for whichever half it did not describe, and a reader setting it
 * would have no way to know which capture they had just repointed.
 */
export const SITE_CAPTURE_ROOT =
  process.env.PTR_SITE_CAPTURE_ROOT ?? '/Users/billyribeiro/Desktop/pro-trading-room-website';

/** Absolute path of one capture under {@link SITE_CAPTURE_ROOT}. */
export function siteCapturePath(relativePath) {
  return resolve(SITE_CAPTURE_ROOT, relativePath);
}

/** Absolute path of one capture, named by its path relative to {@link CAPTURE_ROOT}. */
export function capturePath(relativePath) {
  return resolve(CAPTURE_ROOT, relativePath);
}

/** Whether a capture is readable here. */
export function hasCapture(relativePath) {
  return existsSync(capturePath(relativePath));
}

/**
 * Read a capture, or exit naming the file, the root and the override.
 *
 * **Exits rather than throws**, and that is the difference from the `.ts` sibling. There, absence
 * means `describe.skipIf` — a suite that says what it could not cover. Here the caller IS the whole
 * program: a builder with no capture has nothing to build and a verifier with no capture has nothing
 * to verify, so the honest outcome is a non-zero exit with a sentence somebody can act on, rather
 * than a stack trace whose most prominent detail is a path on a machine they do not have.
 */
export function readCapture(relativePath, what) {
  const path = capturePath(relativePath);
  if (!existsSync(path)) {
    console.error(
      [
        `MISSING CAPTURE — this script cannot run here, and that is not a defect in the code it checks.`,
        ``,
        `  wants     ${what}`,
        `  at        ${path}`,
        `  root      ${CAPTURE_ROOT}${process.env.PTR_CAPTURE_ROOT ? ' (from PTR_CAPTURE_ROOT)' : ' (the documented default)'}`,
        ``,
        `The reference captures are dumps of a LIVE room carrying real names, addresses and in some`,
        `cases a live token, so they are deliberately not in this repository — see .gitignore. Set`,
        `PTR_CAPTURE_ROOT to wherever you hold them and run this again.`
      ].join('\n')
    );
    process.exit(1);
  }
  return readFileSync(path, 'utf8');
}
