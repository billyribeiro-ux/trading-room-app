import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Which of this suite's tests can run on a checkout that does not hold the reference captures.
 *
 * ## The problem this exists for
 *
 * `quality.yml` had failed every one of its runs, from PR #28 onward, and the reason was never a
 * defect: 49 of the room's 108 test files read evidence that is deliberately NOT in this repository.
 * `.gitignore` says why in as many words — the captures are dumps of a LIVE room carrying real
 * names, addresses, gravatar MD5s and in some cases a live JWT, and this repository is public. They
 * are symlinked in from `~/Desktop/new-room/` so the comparisons stay runnable locally, and the
 * symlinks are gitignored too.
 *
 * So the suite could not pass on CI, and no amount of fixing the code was ever going to change that.
 * The question was never "what is broken" but "what is a CI run of this repository allowed to
 * CLAIM". This module is that answer, made executable.
 *
 * ## The answer, and why not the other two
 *
 * Giving CI the captures was rejected: it puts live-room personal data into a CI environment, which
 * is the single thing every rule in `.gitignore` exists to prevent. Editing all 50 files to guard
 * each read individually was rejected as the primary mechanism: 222 of those reads happen at module
 * scope, where a `describe.skipIf` cannot reach them — the file throws during import, before any
 * skip is consulted — so it would have meant restructuring 50 files rather than annotating them.
 *
 * What is left is to partition the suite by what the machine can actually see, and to say so out
 * loud. Locally, where the symlinks resolve, NOTHING is excluded and all 106 files run exactly as
 * before. On CI the evidence-bound files are excluded and the count is printed, so a green run
 * reports what it covered instead of implying it covered everything.
 *
 * ## Why discovery rather than a list of 50 paths
 *
 * DPE rule 4: prefer a catalog-driven test that discovers its own subjects over a hardcoded list, so
 * the next one is covered without anyone remembering. A hardcoded list rots the first time somebody
 * adds an evidence-bound test, and it rots silently.
 *
 * The failure modes are deliberately asymmetric. If discovery MISSES a file, that file runs on CI
 * and dies loudly on `ENOENT` — visible, and it names the path. If discovery over-matches, coverage
 * is lost quietly, which is the dangerous direction, so `evidence-partition.test.ts` pins the exact
 * count and every excluded path: over-matching shows up as a failed assertion in a diff a reviewer
 * reads, not as a green run that tested less than it looked like.
 */

/**
 * The gitignored evidence directories, taken from `.gitignore` rather than from memory.
 *
 * Every name here is either one of the symlinks listed under "Symlinks to the capture folders"
 * (`.gitignore`, the `/apps/room/*` block) or `docs/source`, which has its own rule and its own
 * recorded reason — this repository is public and republishing a third party's compiled application
 * is not a question to answer by accident.
 */
export const EVIDENCE_ROOTS = Object.freeze([
  'docs/source',
  'second-dump',
  'new-evidence',
  'alert-section',
  'app-message-modal',
  'app-modals',
  'app-room',
  'app-session',
  'navbar-section',
  'toast-container',
  'preview',
  'emojis',
  'modal',
  'css'
]);

/** Roots absent from a clean checkout. `css` is tracked and must never suppress a test in CI. */
export const OFF_REPO_EVIDENCE_ROOTS = Object.freeze(
  EVIDENCE_ROOTS.filter((name) => name !== 'css')
);

/*
  A root counts as referenced only where it appears as a path SEGMENT — opening a quote, or after a
  slash in a relative specifier. Matching the bare word would catch `css` in a class name and
  `modal` in `ModalHost.svelte`, and over-matching is the failure mode that loses coverage quietly.

  ## TWO NARROWINGS, added 2026-08-28, and they were worth 7 test files and 75 tests

  This discovery was over-matching in two ways at once, and the header above says exactly why that
  is the dangerous direction: coverage lost QUIETLY, behind a banner announcing it. Both were found
  by lifting the exclusions and running the suite, which is the only way either could have shown up.

  **1. A CITATION IS NOT A READ.** The pattern ran over the raw file, so a path named in a COMMENT
  excluded the test. `room-message-render.test.ts` — 226 lines pinning all 18 captured kebabs with
  their exact labels and source order, the `msgMenu dropright pt-1` class and the colour contract —
  was excluded by one comment citing `docs/source/components/app-st-message.compiled.js`. Its actual
  data is `src/lib/server/captured-message-fixture.json`, which is TRACKED and present. It passes
  here, and had been reported as uncovered for as long as the banner has existed.

  That cost more than the coverage. It was the stated reason `altChatRender` was filed BLOCKED on
  2026-08-28 — the compact renderer shares a kebab menu with `RoomMessage`, and extracting that menu
  looked like a change to the room's most-rendered component with its one guard switched off. The
  guard was never off. The row moved back to buildable in the same commit that fixed this.

  **2. A ROOT THAT IS PRESENT IS NOT MISSING.** The pattern named all fourteen roots, so a test
  reading only under `css/` — which is a real directory in this repository, not a symlink — was
  excluded whenever any OTHER root was absent. Two style contracts were lost that way.

  Comments are stripped before matching and the pattern is built from `missingEvidenceRoots()`
  rather than from `EVIDENCE_ROOTS`. Measured on the day: 49 excluded before, 42 after, and the
  seven that left are exactly the seven that pass with the exclusions lifted. No file that needs a
  missing root was released, and none that does not is still held.
*/

/**
 * Comments removed, so a path cited in prose does not read as a path opened in code.
 *
 * The same `codeOf` shape half the contract tests in this repository already use before a
 * `not.toContain`, and for the identical reason: a comment quoting the thing being asserted about
 * matches the assertion. Block comments first, then line comments — and a line comment is only one
 * when `//` does not follow `:` or a quote, so `https://…` inside a string survives.
 *
 * @param {string} source
 * @returns {string}
 */
function codeOf(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

/**
 * The pattern for the selected roots, built per call so the stable inventory and the current
 * machine's exclusion subset use the same discovery implementation.
 *
 * @param {readonly string[]} roots
 * @returns {RegExp}
 */
function referencePattern(roots) {
  // No selected root means nothing can be evidence-bound: match nothing rather than everything.
  if (roots.length === 0) return /(?!)/;
  return new RegExp(
    `(?:['"\`]|\\.\\./|/)(?:${roots.map((name) => name.replace('/', '\\/')).join('|')})/`
  );
}

/** Absolute path of `apps/room`, derived from this file rather than from `process.cwd()`. */
export function appRoot() {
  return resolve(new URL('../', import.meta.url).pathname);
}

/**
 * The evidence roots that are NOT readable here.
 *
 * On the owner's machine this is empty, because the symlinks resolve. On CI it is all of them.
 * A root that is present but empty is treated as present: this reports what the filesystem says,
 * and inventing a "looks incomplete" heuristic would be exactly the kind of guess the repository
 * standard forbids.
 */
export function missingEvidenceRoots(root = appRoot()) {
  return EVIDENCE_ROOTS.filter((name) => !existsSync(join(root, name)));
}

/** Whether every evidence root resolves, i.e. whether the full suite can run. */
export function evidenceAvailable(root = appRoot()) {
  return missingEvidenceRoots(root).length === 0;
}

/*
  Typed with JSDoc rather than left to inference. `svelte-check` type-checks this file — it is
  imported by `vite.config.ts`, which is TypeScript — and an untyped `out` here made `path` an
  implicit `any` in both callbacks below, four errors that failed `pnpm check`. Annotating the
  recursion is what types the whole chain.
*/
/**
 * @param {string} dir
 * @param {string[]} out
 * @returns {string[]}
 */
function collectTestFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectTestFiles(path, out);
    else if (entry.name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

/**
 * Every test file under `src/` that reads a path inside a selected evidence root, as paths relative
 * to `apps/room` and sorted. The default is the stable full inventory; Vite passes only the roots
 * missing from the current checkout when computing exclusions.
 *
 * @param {string} root
 * @param {readonly string[]} roots
 */
export function discoverEvidenceBoundTests(root = appRoot(), roots = OFF_REPO_EVIDENCE_ROOTS) {
  const src = join(root, 'src');
  if (!existsSync(src)) return [];
  const pattern = referencePattern(roots);
  return collectTestFiles(src, [])
    .filter((path) => pattern.test(codeOf(readFileSync(path, 'utf8'))))
    .map((path) => relative(root, path).split('\\').join('/'))
    .sort();
}
