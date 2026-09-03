import { execFileSync } from 'node:child_process';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * EVERY FILE PATH THIS APP CITES IN A COMMENT EITHER OPENS, OR SAYS WHY IT CANNOT.
 *
 * ## The failure this exists for
 *
 * The house style is to cite the file that owns a rule rather than restate it — that is what keeps
 * one decision in one place. A citation is therefore load-bearing: it is the reader's only route to
 * the argument, and when it rots the argument becomes unreachable while the prose still reads as
 * authoritative. Nothing in the toolchain sees inside a comment, so a path there is the one kind of
 * reference that can rot silently.
 *
 * `apps/room` gained the same sweep first. Running it here found **four wrong pointers in one pass**:
 *
 * - `money.ts` and `money.test.ts` cited `evidence-dumps/TIER1-fetched/app.min.js` for
 *   `formatStripeAmount`. That directory has never held that file; the artifact is
 *   `evidence-dumps/manage-app-2026-08-31/app.min.js`, and the OFFSET was right all along —
 *   `formatStripeAmount` is at exactly 183,815 there, measured with `indexOf` on the file's bytes.
 * - `room-config-boundary.test.ts` credited the seam probe's finding to an ignored, workstation-only
 *   script rather than the tracked Playwright spec that replaced it.
 * - `api-docs.ts` carried `Regenerate: node scripts/extract-api-docs.mjs`, an instruction naming a
 *   generator no commit has ever added under any path.
 * - `editable-display.test.ts` said "Reproduce with" against a capture output never committed.
 *
 * The first two are now correct. The last two, and two others, are provenance records for files that
 * genuinely are not here — they are listed by name below with what was measured, because deleting a
 * citation is not the same as fixing it: the reader loses how the number was obtained.
 */

/**
 * A repo-relative source path, anchored at BOTH ends.
 *
 * Left, because an unanchored pattern matches the `src/lib/…` tail of `apps/controller/src/lib/…`
 * and then fails to resolve it — the room's first draft reported five phantoms that way.
 *
 * Right, and the extension order with it, because **`js` matches inside `json`**: without
 * longest-first plus `(?![\w-])` this reads `…rects-tab_Branding_Logo_Landing_Page_.json` as a `.js`
 * file and reports a stale pointer to a file that is right there under a name nobody wrote. That
 * citation exists in `RichTextEditor.svelte` and is what found the bug.
 */
const CITATION =
  /(?<![\w./-])(?:apps\/[\w-]+\/)?(?:src|gate|ops|e2e|scripts|evidence-dumps)\/[\w./-]+\.(?:mjs|json|svelte|html|css|sql|md|ts|js)(?![\w-])/g;

/** Repository candidates pair the on-disk resolution with the path Git must actually ship. */
const REPOSITORY_BASES = [
  { disk: '', tracked: 'apps/controller/' },
  { disk: '../../', tracked: '' },
  { disk: '../room/', tracked: 'apps/room/' }
] as const;

/** Framework citations are installed dependencies rather than repository-owned files. */
const DEPENDENCY_BASES = ['node_modules/svelte/', 'node_modules/@sveltejs/kit/'] as const;

const TRACKED = new Set(
  execFileSync('git', ['ls-files', '-z'], { cwd: '../..', encoding: 'utf8' }).split('\0').filter(Boolean)
);

const opensFromCleanCheckout = (path: string): boolean =>
  REPOSITORY_BASES.some((base) => existsSync(base.disk + path) && TRACKED.has(base.tracked + path)) ||
  DEPENDENCY_BASES.some((base) => existsSync(base + path));

/**
 * The citations that cannot be opened, each with what was MEASURED about it.
 *
 * A ratchet in both directions: a new unopenable citation fails, and one that becomes openable and is
 * left listed fails too. Neither is a warning — both mean this table no longer describes the tree.
 */
const UNOPENABLE: Readonly<Record<string, string>> = {
  /*
    A capture OUTPUT, never committed. `git log --all` finds no commit adding it under any path. The
    block around it records how a count was obtained, which is worth more than a step nobody here can
    repeat — and `evidence-dumps/` holds the decoded artifacts that WERE reviewed and tracked.
  */
  'scripts/collect-account-2026-08-08T20-19-23-396Z.json': 'a capture output, never committed',

  /*
    A generator no commit has ever added, measured rather than assumed: `git log --all` finds nothing
    under any path, and `scripts/` here is fully in sync (0 untracked, 0 tracked-but-absent), so this
    is not an eviction like the room's. The generated HTML beside it is the artifact; regenerating it
    needs the generator restored or rewritten.
  */
  'scripts/extract-api-docs.mjs': 'a generator that has never been in this repository'
};

const commentsIn = (path: string, source: string): string[] => {
  const blocks = [
    ...[...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => match[0]),
    /* `[^:]` so `https://` is not read as a line comment. */
    ...[...source.matchAll(/(?:^|[^:])\/\/[^\n]*/g)].map((match) => match[0])
  ];
  if (path.endsWith('.svelte')) blocks.push(...[...source.matchAll(/<!--[\s\S]*?-->/g)].map((match) => match[0]));
  return blocks;
};

interface Citation {
  readonly path: string;
  readonly from: string;
}

/**
 * The corpus EXCLUDES this file, and the exclusion was earned within a minute of writing it.
 *
 * The docblock above quotes `evidence-dumps/TIER1-fetched/app.min.js` while explaining that it is
 * the wrong path — so the sweep read its own account of the bug as a fifth broken citation. Any file
 * whose subject is bad citations will quote bad citations; reading itself makes the result a
 * statement about its own prose. `reference-const-coverage-contract.test.ts` was caught by the
 * identical shape on the same day, from the other direction, and believed for about a minute.
 */
const CITATIONS: Citation[] = globSync('src/**/*.{svelte,ts}')
  .filter((file) => !file.includes('comment-path-citations'))
  .flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return commentsIn(file, source).flatMap((block) =>
      [...block.matchAll(CITATION)].map((match) => ({ path: match[0], from: file }))
    );
  });

describe('the sweep is measuring something', () => {
  it('found citations to check, across many files', () => {
    /* At zero this file is vacuously green. The floor is far below the 55 measured on 2026-08-31. */
    expect(CITATIONS.length).toBeGreaterThan(35);
    expect(new Set(CITATIONS.map((citation) => citation.from)).size).toBeGreaterThan(15);
  });

  it('and the extension boundary works, which is what the json bug was', () => {
    /*
      The regression guard for the pattern itself. `RichTextEditor.svelte` cites a `.json` capture;
      read with a `js`-first alternation and no right anchor, the sweep truncates it to `.js` and
      reports a file that exists under a name nobody wrote.
    */
    const truncated = CITATIONS.filter((citation) => citation.path.endsWith('rects-baseline.js'));
    expect(truncated).toEqual([]);
    expect(CITATIONS.some((citation) => citation.path.endsWith('.json'))).toBe(true);

    /*
      A developer workstation can still contain the old ignored Room probe. That local file is the
      exact condition that hid the hosted failure, so it remains a negative control for the resolver:
      an ignored file is not something a clean checkout can cite.
    */
    expect(opensFromCleanCheckout('apps/room/scripts/audit-behavior-coverage.mjs')).toBe(false);
  });
});

describe('every cited path opens, or is listed with what was measured about it', () => {
  it('names each disagreement, rather than failing on the first', () => {
    const unopenable = [
      ...new Set(CITATIONS.filter(({ path }) => !opensFromCleanCheckout(path)).map(({ path }) => path))
    ].sort();
    expect(
      unopenable,
      'a comment cites a file that cannot be opened and is not in UNOPENABLE — the argument it ' +
        'points at is unreachable while the prose still reads as authoritative; or an entry in ' +
        'UNOPENABLE now opens and the table was not shrunk'
    ).toEqual(Object.keys(UNOPENABLE).sort());
  });
});
