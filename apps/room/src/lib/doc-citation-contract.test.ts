import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A `path:line` citation in a live document points inside the file it names.
 *
 * ## What this is for
 *
 * `routes/+page.svelte` was decomposed from roughly eleven thousand lines to 1,425. **Seventeen
 * citations across six documents went on naming lines that no longer exist**, and nothing noticed,
 * because a line number in Markdown is prose to every tool in this repository.
 *
 * Twelve of them were section HEADINGS in `docs/DIVERGENCE-REGISTER.md` — the register of every
 * knowing divergence from the reference, which is the document somebody reads to decide whether a
 * difference is deliberate. `### S19 · apps/room/src/routes/+page.svelte:7743` in a 1,425-line file
 * does not merely fail to help; it suggests the entry describes code that is gone.
 *
 * Every one was repointed by locating the entry's own **verbatim quoted reason** inside the module
 * it had moved to — `"trusting it would put room policy in the gift of whatever arrives on a
 * socket"` is in `lib/room/events.svelte.ts`, and so on for all twelve — rather than by guessing
 * from the title. Most lost their line number entirely and name the module, which is what
 * `docs/decoded/missing-commands-triage.md` already recommends in its own words: *cite symbols and
 * verbatim strings, which survive refactors*.
 *
 * ## What this cannot see, stated rather than glossed
 *
 * A citation that still lands INSIDE the file can still point at the wrong line — after a
 * decomposition most of them do, and this gate calls them fine. It catches the loud half only.
 * The quiet half is what the "cite symbols" convention is for, and no assertion replaces it.
 *
 * Saying so matters more than the coverage does: a gate whose limits are not written down gets read
 * as a guarantee it never made.
 *
 * ## Dated documents are exempt, and that is not a loophole
 *
 * `CHANGELOG.md` and `REPOSITORY-STATE-2026-08-03.md` both cite lines in the pre-decomposition file.
 * Those citations were CORRECT on the day they were written and describe the file as it was then.
 * A gate that demanded they be renumbered would be demanding that history be falsified, which is
 * worse than a stale pointer. They are exempt by name, with the reason at the exemption, rather than
 * by a pattern that would quietly absorb the next live document somebody dates.
 */

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));

/** Documents that record what was true on a date. See the note above. */
const DATED: Record<string, string> = {
  'CHANGELOG.md':
    'every entry is a dated record of a finished piece of work; its citations describe the tree at ' +
    'that commit and renumbering them would falsify the account.',
  'apps/room/docs/REPOSITORY-STATE-2026-08-03.md':
    'a snapshot, named for its date, of the repository on 2026-08-03.'
};

/** Where a repo-relative-ish citation might actually live, longest-shot last. */
const ROOTS = ['', 'apps/room/', 'apps/controller/', 'apps/room/src/', 'apps/controller/src/', 'services/'];

const docs = globSync('**/*.md', { cwd: REPO }).filter(
  (relative) => !relative.includes('node_modules')
);

type Citation = { doc: string; cited: string; resolved: string; want: number; actual: number };

const citations: Citation[] = [];
for (const doc of docs) {
  if (DATED[doc]) continue;
  const text = readFileSync(`${REPO}${doc}`, 'utf8');
  /*
    Only inside backticks, and only with a source extension. A bare `foo.ts:12` in prose is usually
    a quotation of the REFERENCE's own files — which are not in this checkout — and reporting those
    would bury the findings that are about our own tree.
  */
  for (const match of text.matchAll(
    /`([\w./@+-]+\.(?:ts|svelte|mjs|js|sql|rs|html|css|json|yml|yaml)):(\d+)(?:-(\d+))?`/g
  )) {
    const [, relative, from, to] = match;
    const resolved = ROOTS.map((root) => root + relative).find(
      (candidate) => existsSync(`${REPO}${candidate}`) && statSync(`${REPO}${candidate}`).isFile()
    );
    // An unresolvable path is a different question — often a reference file we do not hold.
    if (!resolved) continue;
    const actual = readFileSync(`${REPO}${resolved}`, 'utf8').split('\n').length;
    citations.push({
      doc,
      cited: `${relative}:${from}${to ? `-${to}` : ''}`,
      resolved,
      want: Number(to ?? from),
      actual
    });
  }
}

describe('the citation sweep runs at all', () => {
  it('found documents to read', () => {
    expect(docs.length).toBeGreaterThan(50);
  });

  it('resolved a plausible number of citations, so the assertion below is not vacuous', () => {
    // 200 on 2026-08-29. A floor well below it fails a broken scanner without failing a tidy-up.
    expect(citations.length).toBeGreaterThan(100);
  });

  it('exempts only documents that still exist', () => {
    const gone = Object.keys(DATED).filter((doc) => !existsSync(`${REPO}${doc}`));
    expect(gone, `${gone.join(', ')} — an exemption for a file nobody has any more`).toEqual([]);
  });
});

describe('every live citation lands inside the file it names', () => {
  it('points past the end of nothing', () => {
    const past = citations
      .filter((citation) => citation.want > citation.actual)
      .map(
        (citation) =>
          `${citation.doc}: \`${citation.cited}\` → ${citation.resolved} has ${citation.actual} lines`
      );
    expect(
      past,
      `${past.join('\n  ')}\n\nA citation past the end of its file is usually a decomposition nobody followed: ` +
        `+page.svelte went from ~11,000 lines to 1,425 and took seventeen of these with it. Repoint it by ` +
        `finding the text it quotes in the module the code moved to — do not guess a new number, and prefer ` +
        `naming the module and its symbol over any number at all.`
    ).toEqual([]);
  });
});
