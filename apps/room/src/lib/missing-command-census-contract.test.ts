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
type Row = { command: string; status: string; rest: string };

function rows(): Row[] {
  const doc = readFileSync(TRIAGE, 'utf8');
  const found: Row[] = [];
  for (const line of doc.split('\n')) {
    const match =
      /^\| `([A-Za-z-]+)` \| (BUILT AS [A-Za-z]+|BUILT|NOT BUILT|BLOCKED) \| (.*)$/.exec(line);
    if (match) found.push({ command: match[1], status: match[2], rest: match[3] });
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
      .filter(
        (row) => (row.status === 'NOT BUILT' || row.status === 'BLOCKED') && occurs(row.command)
      )
      .map((row) => row.command)
      .sort();

    expect(
      stale,
      'these commands now occur in apps/room/src, so their rows are no longer NOT BUILT — change ' +
        'the status column. A tracker that says a built thing is missing sends the next engineer ' +
        'to rebuild working code.'
    ).toEqual([]);
  });

  it('makes every BLOCKED row name what would unblock it', () => {
    /*
      ## WHY A FOURTH STATUS, added 2026-08-30

      `NOT BUILT` meant one thing to this file — the command name does not occur in `apps/room/src` —
      and something else entirely to a reader: WORK. Six rows carried it, and only two of them were
      work. The other four cannot be built here at all, each for a different and specific reason:

        `presAreaTabs-recordings`  there is no archive service and zero archive tables in either
                                   database, so the tab has nothing to point at
        `stopRecMsg`               the reference's server does not send it; it needs a recorder
        `stopOBStream`             its Start/Stop pair renders under `O(1, e.useMTX ? -1 : 1)` at
                                   bundle byte 2,145,988 — only when MTX is OFF, and this
                                   deployment is MTX
        `streamPlayerDisabled`     gated on `globals.isPlayer`, which is
                                   `decodedPassedToken.isPTRPlayer` (byte 1,191,994) — a claim the
                                   controller mints nowhere. `HandoffPayload` in
                                   `room-handoff.ts` carries `type`, `issued`, `iat`, `exp` and the
                                   identity, and `isPTRPlayer` occurs ZERO times in either app.

      A tracker that files four unbuildable things beside two buildable ones under one word is a
      tracker that costs somebody a day finding out which is which. That has already happened here
      twice, in the other direction, and the cost was the same.

      ## AND WHY IT IS MACHINE-CHECKED

      `BLOCKED` is the status most able to become a place to hide — it is the one that means "not my
      problem". So a row may only claim it while its own cells NAME the blocker, in the vocabulary
      of things that actually block work here. A row that says BLOCKED and explains nothing fails,
      which is the same rule `INERT_ACTIONS` and `ORPHANS` are held to.
    */
    const blocked = table.filter((row) => row.status === 'BLOCKED');
    expect(blocked.length, 'the BLOCKED rows have gone; is the census still measuring?').toBe(4);

    /*
      Deliberately a VOCABULARY and not a free-text check. "Blocked" with a reason nobody can act on
      is the same as blocked with no reason; every term here names a thing that either exists or can
      be obtained, so each row points at something somebody could go and do.
    */
    const UNBLOCKERS = [
      'archive',
      'recorder',
      'MediaMTX',
      'useMTX',
      'isPTRPlayer',
      'isPlayer',
      'capture',
      'owner'
    ];
    const silent = blocked
      .filter((row) => !UNBLOCKERS.some((term) => row.rest.includes(term)))
      .map((row) => row.command)
      .sort();

    expect(
      silent,
      'these rows claim BLOCKED without naming what would unblock them. A blocker nobody can act ' +
        'on is indistinguishable from an excuse — say which thing is missing.'
    ).toEqual([]);

    /*
      And the two that are LEFT are the real remaining work, asserted by name so that finishing them
      turns this red rather than quietly leaving the census looking the same.
    */
    const notBuilt = table
      .filter((row) => row.status === 'NOT BUILT')
      .map((row) => row.command)
      .sort();
    expect(
      notBuilt,
      'the buildable remainder of the census has changed — update this list and TODO.md with it'
    ).toEqual([]);
    /*
      IT IS EMPTY, 2026-08-30. `archiveLogs` and `unarchiveLogs` were the last two, and they left as
      `BUILT AS` rather than `BUILT` because this room names them `archiveChatLog` and
      `unarchiveChatLog` — the reference's own names never appear in our source, which is exactly the
      case that status exists for.

      So every one of the twenty-five is now built, built under another name, or BLOCKED with the
      blocker named. A row returning to `NOT BUILT` is a new finding, and it fails here until it is
      listed above.
    */
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
    expect(renamed.length, 'the BUILT AS rows have gone; is the census still measuring?').toBe(7);

    const missing = renamed
      .filter((row) => !occurs(row.status.slice('BUILT AS '.length)))
      .map((row) => `${row.command} -> ${row.status}`)
      .sort();

    expect(missing, 'a BUILT AS row names a symbol that does not exist in apps/room/src').toEqual(
      []
    );
  });

  it('cites symbols and paths, never line numbers or somebody machine', () => {
    /*
      THE DOCUMENT'S OWN RECOMMENDATION, enforced. Its method section says to *"cite symbols and
      verbatim strings, which survive refactors"* — and `doc-citation-contract.test.ts` quotes that
      sentence as the convention it cannot itself check, because a citation that still lands INSIDE
      a file can point at the wrong line and that gate calls it fine.

      It was not being followed here. Measured 2026-08-29: **44 `path:line` citations**, of which 23
      named a line that no longer exists — `+page.svelte:11294` in a file now under 1,500 lines,
      `ModalHost.svelte:5327` which is now the alerts advanced-search modal. `TODO.md` recorded the
      consequence exactly: *"a reader who follows one of its line numbers, finds unrelated code, and
      concludes the feature is gone will be wrong."*

      Two of them were absolute paths into the author's home directory, which no clone can resolve
      at all.

      All 44 are now paths plus symbols. **Byte offsets are untouched and must stay** — 200 of them —
      because those cite the SHA-256'd bundle, which cannot drift: a byte offset is evidence, a line
      number is a guess about a file somebody else will edit.
    */
    const doc = readFileSync(TRIAGE, 'utf8');

    const lineCitations = [
      ...doc.matchAll(/[A-Za-z0-9_.[\]+-]+\.(?:ts|svelte|mjs|js|sql):\d+/g)
    ].map((match) => match[0]);
    expect(
      lineCitations,
      'cite the symbol, not the line — this document is the tracker, and a stale line number sends ' +
        'a reader to unrelated code and lets them conclude the feature is gone'
    ).toEqual([]);

    /* The continuations a naive strip leaves behind: `Foo.svelte, :133, :156`. */
    const dangling = [...doc.matchAll(/[\s(]:\d{2,}/g)].map((match) => match[0]);
    expect(dangling, 'a line number left without the path it belonged to').toEqual([]);

    const absolute = [...doc.matchAll(/\/Users\/[^\s`|]+/g)].map((match) => match[0]);
    expect(absolute, 'an absolute path from one machine, which no clone can resolve').toEqual([]);

    /* And the vacuity floor: the byte offsets that ARE the evidence must still be here. */
    expect((doc.match(/\b\d{6,7}\b|\d,\d{3},\d{3}/g) ?? []).length).toBeGreaterThan(100);
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
    /*
      Added with the BLOCKED status. The headline's whole job is to be the number a reader trusts,
      and a reader who sees "6 NOT BUILT" plans six pieces of work when two of them are work — so
      the split has to appear here, recomputed, or the summary is stale again by construction.
    */
    expect(doc).toContain(
      `| *Confirmed missing*, **BLOCKED** — cannot be built here, blocker named | ${tally('BLOCKED')} |`
    );
  });
});
