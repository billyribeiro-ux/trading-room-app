import { existsSync, globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { missingEvidenceRoots } from '../../gate/evidence-bound-tests.mjs';

/**
 * EVERY FILE PATH THIS APP CITES IN A COMMENT CAN BE OPENED.
 *
 * ## The failure this exists for, which this repository has hit repeatedly
 *
 * The house style is to cite the file that owns a rule rather than restate it — that is what keeps
 * one decision in one place. A citation is therefore load-bearing: it is the reader's only route to
 * the argument, and when it rots the argument becomes unreachable while the prose still reads as
 * authoritative. Every instance so far was found by somebody walking into it:
 *
 * - `TODO.md` row R named `media-transport.svelte.ts` for a `contentHint` line that has **zero**
 *   occurrences there; it had moved to `local-capture.svelte.ts` with the produce paths.
 * - `missing-commands-triage.md` carried **44** stale pointers of the same kind.
 * - `handoff-token.test.ts` cited `new-room-control/src/lib/server/room-handoff.ts` — a path in a
 *   sibling REFERENCE folder OUTSIDE this repository, naming a copy of a file whose authority is
 *   in-tree at `apps/controller/`. Corrected on the day this file was written.
 *
 * None of those is catchable by type-checking, linting or any test of behaviour. A path inside a
 * comment is prose to every tool in the toolchain, which is precisely why it needs one of its own.
 *
 * ## What counts as a citation, and why the pattern is anchored
 *
 * A repo-relative source path: an optional `apps/<name>/` prefix, then one of the four directories
 * this repository actually has (`src`, `gate`, `ops`, `e2e`), then a path ending in a source
 * extension. **Anchored on the left** — the first draft was not, and it reported five false
 * positives by matching the `src/lib/…` TAIL of `apps/controller/src/lib/…` and then failing to
 * resolve it against this app. A sweep whose first result is five phantoms is a sweep nobody trusts
 * the sixth result of.
 *
 * **Anchored on the right too, and the extension order is load-bearing.** `js` matches inside `json`,
 * so an unanchored alternation reads `…rects-tab.json` as `…rects-tab.js` and reports a file that is
 * right there under a name nobody wrote. Longest-first plus `(?![\w-])` closes both halves. Measured
 * on the controller's corpus, where that exact citation exists.
 */
const CITATION =
  /(?<![\w./-])(?:apps\/[\w-]+\/)?(?:src|gate|ops|e2e)\/[\w./-]+\.(?:mjs|json|svelte|html|css|sql|md|ts|js)(?![\w-])/g;

/**
 * Where a citation may resolve, and every base is here for a stated reason.
 *
 * `''` is this app; `../../` the repository root; `../controller/` the sibling app, because the two
 * halves of one feature are routinely argued across the boundary and a room test citing the
 * controller's own contract is the correct thing to write. The two `node_modules` bases are the
 * framework's OWN source: ten citations here read Svelte's and SvelteKit's internals by path
 * (`src/internal/client/dom/blocks/each.js`, `src/runtime/shared.js`), which is the strongest form a
 * claim about framework behaviour can take, and every one of them opens.
 */
const BASES = [
  '',
  '../../',
  '../controller/',
  'node_modules/svelte/',
  'node_modules/@sveltejs/kit/'
];

/**
 * The capture roots this checkout does not have, taken from the gate that owns that list.
 *
 * Imported rather than re-derived, for the reason `verify-privacy-boundary.mjs` gives when it does
 * the same: `gate/evidence-bound-tests.mjs` already owns which roots exist and why, and a second
 * copy is a second thing to keep in step. A citation into one of them is not stale — it is evidence
 * this clone cannot see, and 42 test files are excluded from every run here for exactly that reason.
 */
const MISSING = missingEvidenceRoots();

const commentsIn = (path: string, source: string): string[] => {
  const blocks = [
    ...[...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => match[0]),
    /* `[^:]` so `https://` is not read as a line comment — the same guard `source-comments.ts` uses. */
    ...[...source.matchAll(/(?:^|[^:])\/\/[^\n]*/g)].map((match) => match[0])
  ];
  if (path.endsWith('.svelte'))
    blocks.push(...[...source.matchAll(/<!--[\s\S]*?-->/g)].map((match) => match[0]));
  return blocks;
};

interface Citation {
  readonly path: string;
  readonly from: string;
}

const cited = (): Citation[] => {
  const found: Citation[] = [];
  /*
    EXCLUDING THIS FILE, and the controller's copy of this sweep earned the exclusion the same day:
    its docblock quotes a wrong path while explaining that it is wrong, and the sweep read that as a
    broken citation. Any file whose subject is bad citations will quote bad citations. This one is
    only lucky — it names `media-transport.svelte.ts` as a bare filename rather than a path — and
    luck is not a reason to leave the trap open.
  */
  for (const file of globSync('src/**/*.{svelte,ts}').filter(
    (path) => !path.includes('comment-path-citations')
  )) {
    const source = readFileSync(file, 'utf8');
    for (const block of commentsIn(file, source))
      for (const match of block.matchAll(CITATION)) found.push({ path: match[0], from: file });
  }
  return found;
};

const CITATIONS = cited();

describe('the sweep is measuring something', () => {
  it('found citations to check, in more than one file', () => {
    /*
      At zero this file is vacuously green, which is how a sweep dies quietly. The floor is far below
      the 85 measured on 2026-08-31: this asserts the EXTRACTION still works, not the count, because
      pinning the count would fail on every comment anybody writes.
    */
    expect(CITATIONS.length).toBeGreaterThan(60);
    expect(new Set(CITATIONS.map((citation) => citation.from)).size).toBeGreaterThan(20);
  });

  it('and it reads comments, not code', () => {
    /*
      Every `import` in this app names a path too, and none of them is a citation — they are checked
      by the compiler and would drown the result. The extraction takes comment BLOCKS, so an import
      cannot appear here; asserted by the one shape that would prove otherwise.
    */
    expect(CITATIONS.some((citation) => citation.path.startsWith('src/lib/components/'))).toBe(
      true
    );
    expect(CITATIONS.map((citation) => citation.path)).not.toContain('src/app.d.ts');
  });
});

describe('every cited path opens', () => {
  it('names each one that does not, rather than failing on the first', () => {
    const broken = CITATIONS.filter(({ path }) => {
      if (BASES.some((base) => existsSync(base + path))) return false;
      /* Evidence this clone does not hold. Not stale — absent, and the gate says which roots. */
      return !MISSING.some((root) => path.startsWith(root) || path.includes(`/${root}/`));
    });
    expect(
      [...new Set(broken.map(({ path, from }) => `${path}   <- ${from}`))].sort(),
      'a comment cites a file that cannot be opened from anywhere this repository resolves: the ' +
        'argument it points at is unreachable while the prose still reads as authoritative'
    ).toEqual([]);
  });
});
