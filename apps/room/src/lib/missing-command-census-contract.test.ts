import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE MISSING-COMMAND TRIAGE STATES ITS OWN STATUS, AND THIS RECOMPUTES IT.
 *
 * ## The failure this exists for
 *
 * `docs/decoded/missing-commands-triage.md` is the tracker for every reference wire command this
 * room does not have — `feature-coverage-contract.test.ts` says so in as many words: *"that document
 * — not this list — is the tracker."* It was written on 2026-08-15 as a snapshot, and nothing made
 * it move afterwards. By 2026-08-29 its headline said **30 not built**; measuring its own rows
 * against the source said **twelve of twenty-five were built**, three more under another name.
 *
 * A tracker that is wrong by more than half is worse than no tracker: it sends the next engineer to
 * rebuild working code, which `~/CLAUDE.md` records as worse than saying nothing.
 *
 * ## And it hid a real defect, which is why the gate is the fix rather than a rewrite
 *
 * `forceStopScreen`'s row cited `ScreenTabs.svelte:211,227` as ours. That is the presenter's menu
 * ITEM. The item rendered and reached a handler that dropped the presenter's own tab and returned,
 * so a member whose screen a presenter had "stopped" kept broadcasting to the whole room. The same
 * document, one section away, records catching exactly this on `stopVideoForAll` and states the
 * rule — *"the refuter matched the BUTTON. The brief asked it to match the BEHAVIOUR."*
 *
 * Rewriting the prose would have fixed the sentence for a day. This fixes the class: the status
 * column is now recomputed on every run.
 *
 * ## What is measured, and what is deliberately NOT
 *
 * Measured: whether the identifier occurs in `apps/room/src` outside comments and outside tests.
 * That is the document's OWN definition of the table — *"present in the reference bundle and absent
 * from `apps/room/src`"* — so a name that now occurs falsifies a `NOT BUILT` row by the document's
 * own criterion, and this cannot be argued with.
 *
 * NOT measured: whether the feature is correct, or complete, or reaches the network. **An identifier
 * is a floor, not a proof** — which is the lesson of `forceStopScreen` itself, whose name would have
 * been enough to satisfy a weaker version of this file while the control was still lying. That is
 * what `BUILT` rows carry a per-feature contract test FOR; this one refuses the drift, not the bug.
 *
 * `BUILT AS <symbol>` is the third status and it is the one the document's own history demands:
 * `presAreaTabs-videoplayer` was almost reported missing because we key that tab without the
 * reference's prefix. A row that names OUR symbol is checked against OUR symbol, and the reference
 * name is then free to be absent.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TRIAGE = fileURLToPath(
  new URL('../../../../docs/decoded/missing-commands-triage.md', import.meta.url)
);

/**
 * Source with comments removed, because a command NAMED IN PROSE is not an implementation.
 *
 * The same strip `orphan-style-contract.test.ts` uses, and for the same reason it was added there
 * after a negative control refused to fire: this codebase quotes the reference constantly, and every
 * transcription note is a potential false "built". It matters more here than almost anywhere — the
 * whole point of a row is that the identifier is ABSENT, and `notyping` appears in nine comments.
 *
 * Imprecise in the safe direction: an over-eager strip can only delete real occurrences, which makes
 * something look unbuilt and fails loudly, never the reverse.
 */
function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Everything that could implement a command.
 *
 * `.test.ts` is excluded and only that: a command named in an assertion is not an implementation,
 * and counting one would let this very file mark a row built by mentioning it.
 */
const SOURCE = [
  ...globSync('**/*.svelte', { cwd: ROOT }),
  ...globSync('**/*.ts', { cwd: ROOT }).filter((file) => !file.endsWith('.test.ts'))
]
  .map((file) => withoutComments(readFileSync(`${ROOT}${file}`, 'utf8')))
  .join('\n');

function occurs(identifier: string): boolean {
  return SOURCE.includes(identifier);
}

/** One row of the *Confirmed missing* table: its command and the status it claims. */
type Row = { command: string; status: string };

function rows(): Row[] {
  const doc = readFileSync(TRIAGE, 'utf8');
  const found: Row[] = [];
  for (const line of doc.split('\n')) {
    const match = /^\| `([A-Za-z-]+)` \| (BUILT AS [A-Za-z]+|BUILT|NOT BUILT) \| /.exec(line);
    if (match) found.push({ command: match[1], status: match[2] });
  }
  return found;
}

describe('the triage document tells the truth about what is built', () => {
  const table = rows();

  it('reads a table with every row of it tagged', () => {
    /*
      The vacuity floor. If the table's shape changes and the regex stops matching, every assertion
      below loops over nothing and reports success — the failure mode this repository has hit twice.
      Twenty-five is the count the document itself states, so a row losing its status is caught here
      rather than silently dropping out of the census.
    */
    expect(table).toHaveLength(25);
    /* And that the corpus is real, and that the matcher sees a command known to be built. */
    expect(SOURCE.length).toBeGreaterThan(500_000);
    expect(occurs('kickUser')).toBe(true);
  });

  it('has no row still marked NOT BUILT whose command now exists', () => {
    /*
      The direction that cost the time. Twelve rows were in this state on 2026-08-29 — every one of
      them a feature somebody could have been sent to rebuild.
    */
    const stale = table
      .filter((row) => row.status === 'NOT BUILT' && occurs(row.command))
      .map((row) => row.command)
      .sort();

    expect(
      stale,
      'these commands now occur in apps/room/src, so their rows are no longer NOT BUILT — change ' +
        'the status column. A tracker that says a built thing is missing sends the next engineer ' +
        'to rebuild working code.'
    ).toEqual([]);
  });

  it('has no row marked BUILT whose command does not occur at all', () => {
    /*
      The other direction, and it is what stops the status column becoming a place to hide: marking a
      row BUILT is a claim, and deleting the implementation has to break it. Without this the column
      would be exactly the prose it replaced.
    */
    const claimed = table
      .filter((row) => row.status === 'BUILT' && !occurs(row.command))
      .map((row) => row.command)
      .sort();

    expect(
      claimed,
      'these rows claim BUILT but the command occurs nowhere in apps/room/src'
    ).toEqual([]);
  });

  it('checks a BUILT AS row against OUR symbol, not the reference name', () => {
    /*
      `presAreaTabs-videoplayer` is why this status exists: we key that tab without the reference's
      prefix, and the coverage audit was one adversarial pass away from reporting a built tab as a
      missing one. A row that names our symbol is checked against our symbol — and the reference name
      is then free to be absent, which is the whole point.
    */
    const renamed = table.filter((row) => row.status.startsWith('BUILT AS '));
    expect(renamed.length, 'the BUILT AS rows have gone; is the census still measuring?').toBe(3);

    const missing = renamed
      .filter((row) => !occurs(row.status.slice('BUILT AS '.length)))
      .map((row) => `${row.command} -> ${row.status}`)
      .sort();

    expect(missing, 'a BUILT AS row names a symbol that does not exist in apps/room/src').toEqual(
      []
    );
  });

  it('states a headline that matches its own rows', () => {
    /*
      The counts at the top of the document are what a reader actually reads, and they were the half
      that went stale — the per-row detail was at least dated. Recomputing them from the table is
      what stops the summary and the rows disagreeing, which is the shape
      `evidence-gap-register-counts.test.ts` was written for on a different tracker.
    */
    const doc = readFileSync(TRIAGE, 'utf8');
    const tally = (status: string) => table.filter((row) => row.status === status).length;

    const built = tally('BUILT');
    const notBuilt = tally('NOT BUILT');
    const renamed = table.filter((row) => row.status.startsWith('BUILT AS ')).length;

    expect(doc).toContain(`| *Confirmed missing*, now **BUILT** | **${built}** |`);
    expect(doc).toContain(`| *Confirmed missing*, **BUILT AS** something else | ${renamed} |`);
    expect(doc).toContain(`| *Confirmed missing*, still **NOT BUILT** | ${notBuilt} |`);
  });
});
