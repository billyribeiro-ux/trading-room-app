import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_ROOTS,
  appRoot,
  discoverEvidenceBoundTests,
  evidenceAvailable,
  missingEvidenceRoots
} from '../../gate/evidence-bound-tests.mjs';

/**
 * Pins the partition that decides what a CI run of this suite is allowed to claim.
 *
 * `vite.config.ts` excludes the evidence-bound test files when the reference captures are not
 * readable, which is every CI checkout, because the captures are dumps of a live room and this
 * repository is public. That mechanism has one dangerous direction and one safe one, and this file
 * exists to hold the dangerous one shut.
 *
 * If discovery MISSES a file, that file runs on CI and dies loudly on `ENOENT` naming the path.
 * Annoying, self-announcing, harmless. If discovery OVER-matches, a test is silently dropped from
 * every CI run and the suite still reports green — coverage lost with nobody informed, which is the
 * failure this repository's standard calls worse than a red build. So the exact list and the exact
 * count are asserted here: over-matching becomes a failed assertion in a diff a reviewer reads.
 *
 * ## Why this file must never match its own pattern
 *
 * A test that pins the exclusion list is worthless if it is itself excluded. Naming an evidence root
 * followed by a slash in this file would make discovery match it, and on CI this file would vanish
 * along with the 49 it is supposed to be watching — the assertions would not fail, they would not
 * run at all.
 *
 * So every root name below is assembled from parts and never written as a path literal. That is not
 * cleverness for its own sake: `gate/verify-privacy-boundary.mjs` builds the owner's name the same
 * way and records the same reason — otherwise the gate reports itself, and the obvious fix is to
 * exclude it, which is how a gate stops watching its own blind spot. {@link doesNotExcludeItself}
 * asserts the property rather than trusting the comment.
 */
const SELF = 'src/lib/evidence-partition.test.ts';

/**
 * The number of test files that read the off-repo captures, pinned deliberately.
 *
 * Measured 2026-08-15 by reading the discovery output against a grep of the same tree. The two
 * disagreed at 50 vs 49, and the grep was wrong: it matched `docs/source-v4-2026-08-15/`, which is a
 * PREFIX of a capture root but is a directory of 5 files tracked in this repository and readable on
 * CI. `for-all-broadcast-contract.test.ts` reads it and runs everywhere. That is exactly the class of
 * mistake this constant is here to catch, and it was caught by pinning rather than by prose.
 *
 * Moving this number is allowed and expected — a new evidence-bound test SHOULD move it. Moving it
 * without saying so in the same diff is what this prevents.
 */
/*
  49 -> 42 on 2026-08-28, and it is the direction this constant exists to make visible: SEVEN files
  were being dropped from every CI run while the banner announced them as uncovered.

  Both causes were over-matching in `discoverEvidenceBoundTests`, and both were found the only way
  they could be — by lifting the exclusions and running the whole suite.

  * **A CITATION IS NOT A READ.** The pattern ran over the raw file, so a path named in a COMMENT
    excluded the test. `room-message-render.test.ts` is the expensive one: 226 lines pinning all 18
    captured kebabs with their exact labels and source order, the `msgMenu dropright pt-1` class and
    the colour contract — excluded by a single comment citing a compiled-component path under the
    first root named below, while the data it actually reads
    (`server/captured-message-fixture.json`) is tracked and present. It passes.

    THE PATH IS DESCRIBED RATHER THAN WRITTEN, here as everywhere else in this file, and the reason
    is the section below: {@link doesNotExcludeItself} reads the RAW source, deliberately stricter
    than discovery now is. Discovery strips comments; this file still may not name a root at all, so
    that the guard holds even if the pattern changes again.
  * **A ROOT THAT IS PRESENT IS NOT MISSING.** The pattern named all fourteen roots, so a test
    reading only under the one root that is a real directory here rather than a symlink was excluded
    whenever any other root was absent. Two style contracts were lost that way.

  Measured: 49 before, 42 after, and the seven that left are exactly the seven that pass with the
  exclusions lifted. Neither narrowing released a file that needs a missing root.
*/
const EVIDENCE_BOUND_FILE_COUNT = 42;

describe('the evidence partition, which decides what CI claims to have covered', () => {
  it('discovers a stable, sorted, duplicate-free list', () => {
    const found = discoverEvidenceBoundTests();

    expect(found).toEqual([...found].sort());
    expect(new Set(found).size).toBe(found.length);
    // Discovery reads the source tree, not the captures, so it returns the same answer on a machine
    // that holds the evidence and one that does not. Running it twice pins that.
    expect(discoverEvidenceBoundTests()).toEqual(found);
  });

  it('pins the count, so silently dropping a test from CI cannot pass unnoticed', () => {
    expect(
      discoverEvidenceBoundTests(),
      'the evidence-bound test count moved. If you added a test that reads the captures this is ' +
        'correct — update EVIDENCE_BOUND_FILE_COUNT in the same diff. If you did not, discovery is ' +
        'over-matching and tests are being dropped from every CI run while it reports green.'
    ).toHaveLength(EVIDENCE_BOUND_FILE_COUNT);
  });

  it('names only files that exist and really do read a capture root', () => {
    const root = appRoot();

    for (const relativePath of discoverEvidenceBoundTests()) {
      expect(existsSync(join(root, relativePath)), `${relativePath} does not exist`).toBe(true);

      const source = readFileSync(join(root, relativePath), 'utf8');
      const referencesARoot = EVIDENCE_ROOTS.some((name) => source.includes(`${name}/`));
      expect(referencesARoot, `${relativePath} was excluded but reads no capture root`).toBe(true);
    }
  });

  it('does not exclude itself, or the partition would go unwatched on CI', () => {
    // Assembled from parts for the reason in this file's header: written as a path literal, the
    // string would make discovery match this file and CI would drop the very test doing the pinning.
    const aRootAsAPath = `${EVIDENCE_ROOTS[0]}/`;
    expect(readFileSync(join(appRoot(), SELF), 'utf8')).not.toContain(aRootAsAPath);
    expect(discoverEvidenceBoundTests()).not.toContain(SELF);
  });

  it('keeps a known capture-free test in the CI run', () => {
    // `media-elevation-contract.test.ts` asserts a pure authority rule with no captured input, so it
    // must run everywhere. If discovery ever swallows this one, the pattern has gone badly wrong.
    expect(discoverEvidenceBoundTests()).not.toContain('src/lib/media-elevation-contract.test.ts');
  });

  it('reports missing roots as a subset of the declared roots, and agrees with itself', () => {
    const missing = missingEvidenceRoots();

    for (const name of missing) expect(EVIDENCE_ROOTS).toContain(name);
    expect(evidenceAvailable()).toBe(missing.length === 0);
    // The two are the same question asked twice; a disagreement means one of them is guessing.
    expect(missing.every((name) => !existsSync(join(appRoot(), name)))).toBe(true);
  });
});
