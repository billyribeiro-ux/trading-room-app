import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The captured dumps the side-by-side tests compare against, which live OUTSIDE this repository.
 *
 * ## Why they are not in the repository, and must not be
 *
 * `.gitignore` says it in as many words, and the rule predates this file:
 *
 * > Every one of these is a dump of a LIVE room: real names, real addresses, gravatar MD5s, and in
 * > some cases a live JWT. They are read from `~/Desktop/new-room/`, never copied here. Findings
 * > belong in docs/ with a citation to the file and line; the capture itself stays out.
 *
 * Copying them in was tried on 2026-08-15 and reverted. It works — every test passes — and it puts
 * a live member dump into git history for ever. Worth recording beside it: `privacy:verify` scans
 * with `git ls-files --exclude-standard`, so it passed on the copied dumps **without reading one
 * byte of them**. A green privacy check says nothing about an ignored file.
 *
 * ## What this module is for
 *
 * Five test files held the absolute path as a literal. They passed on the owner's machine and threw
 * `ENOENT` anywhere else — two at module scope, which fails the whole SUITE rather than a test, so
 * the reason was buried in a stack trace instead of being stated. The first CI run of the frontend
 * gate is what surfaced it.
 *
 * So: one place that knows where the captures are, and a check the suites can gate on. A missing
 * capture becomes a SKIPPED suite that says why, not a failure and not a silent pass.
 *
 * ## The environment override is the point, not a convenience
 *
 * The default is the documented location. `PTR_CAPTURE_ROOT` lets anybody who holds these dumps
 * somewhere else — another machine, a mounted volume, a restored backup — run the same comparisons
 * without editing five files and without the path to somebody's home directory being the contract.
 */
export const CAPTURE_ROOT = process.env.PTR_CAPTURE_ROOT ?? '/Users/billyribeiro/Desktop/new-room';

/** Absolute path of one capture, named by its path relative to {@link CAPTURE_ROOT}. */
export function capturePath(relativePath: string): string {
  return resolve(CAPTURE_ROOT, relativePath);
}

/**
 * Whether a capture is readable here.
 *
 * Intended for `describe.skipIf(!hasCapture(…))`. A suite that cannot see its evidence has nothing
 * to say — it must not pass, because that would report coverage it never had, and it must not fail,
 * because the code under test is fine and the machine simply does not hold a private dump.
 */
export function hasCapture(relativePath: string): boolean {
  return existsSync(capturePath(relativePath));
}

/**
 * Read a capture, or throw naming the file and the override.
 *
 * The message matters: the failure this replaces was a bare `ENOENT` with an absolute path into
 * somebody else's home directory, which reads like a broken test rather than an absent private
 * dump. Callers at module scope should still guard with {@link hasCapture} — a throw during module
 * evaluation takes the whole suite down before any `skipIf` can be consulted.
 */
export function readCapture(relativePath: string): string {
  const path = capturePath(relativePath);
  if (!existsSync(path)) {
    throw new Error(
      `Reference capture not found: ${path}\n` +
        'These dumps are deliberately kept outside the repository (see .gitignore). ' +
        'Set PTR_CAPTURE_ROOT if yours live elsewhere.'
    );
  }
  return readFileSync(path, 'utf8');
}
