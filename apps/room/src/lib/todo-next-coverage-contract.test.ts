import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `todo-next.md`'s COVERAGE MAP still describes this repository.
 *
 * ## What went wrong, and why it is worth a gate rather than a correction
 *
 * That file opens with a table of every Svelte surface in the room and its size, under a heading
 * telling the reader it is the scope of the remaining work. On 2026-08-29 every number in it was
 * measured for the first time since it was written, and:
 *
 * * it claimed **42 surfaces, ~30,000 lines**; there were 55 and 27,290;
 * * it listed `routes/+page.svelte` at **6,894** lines. It is 1,425 — **off by 5,469**, because the
 *   page was decomposed and the row never moved;
 * * seven other rows were stale, including both AUDITED surfaces;
 * * it omitted `RoomOverlays.svelte` — 820 lines, the fourth-largest component here — along with 26
 *   other surfaces it named nowhere.
 *
 * Nothing was broken by that. Nothing could be: it is a Markdown table, and no test had ever read
 * it. **That is precisely the problem.** The table was being used as scope — the number "2 of 42"
 * was quoted back as the size of the remaining audit — while the thing it measured had moved
 * underneath it for two weeks.
 *
 * A repository that pins the byte length of its evidence dumps and ratchets the line count of every
 * component had left its own scope document unpinned. This closes that.
 *
 * ## What it checks
 *
 * Three things, and the third is the one that catches a NEW surface rather than a changed one:
 *
 * 1. every row's line count equals `wc -l` on that file today;
 * 2. the headline totals equal the measurement;
 * 3. the set of rows equals the set of files — so a component added tomorrow fails this until it is
 *    entered with an audit verdict, and a deleted one cannot leave a row behind.
 *
 * ## What it deliberately does NOT check
 *
 * Whether the "audited?" verdict is TRUE. That is a judgement about reference evidence, and a test
 * that could decide it would be doing the audit. This file guards the arithmetic, which is the part
 * that rots without anyone touching it — a verdict at least goes stale only when somebody edits the
 * file it describes.
 */

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TRACKER = `${REPO}todo-next.md`;

/**
 * The three fixtures, excluded here for the same reason `orphan-component-contract.test.ts` exempts
 * them: they are compiled by a test and rendered by no route, so they are not surfaces of the room.
 *
 * Named rather than pattern-matched, and kept in step with that file by the assertion below — two
 * lists of the same three paths drifting apart is how one of them ends up absolving a real orphan.
 */
const FIXTURES = [
  'lib/class-clsx-equivalence.svelte',
  'lib/components/BindThisProbe.svelte',
  'lib/components/AttachDepsProbe.svelte'
];

const measured = new Map(
  globSync('**/*.svelte', { cwd: ROOT })
    .map((relative) => relative.replaceAll('\\', '/'))
    .filter((relative) => !relative.includes('.test.') && !FIXTURES.includes(relative))
    .map((relative) => [
      relative,
      readFileSync(`${ROOT}/${relative}`, 'utf8').split('\n').length - 1
    ])
);

const tracker = readFileSync(TRACKER, 'utf8');

/**
 * The inventory table, sliced out of the file BEFORE any row is parsed.
 *
 * `todo-next.md` is 7,900 lines and holds many tables. A row pattern applied to the whole file
 * matched three rows in other ones — two documentation paths and the string `bde` — and reported
 * them as surfaces that had been deleted. Measured, not guessed: that was this file's own first run.
 *
 * So the section is bounded first, by its heading and the next one, and the row pattern only ever
 * sees the inventory. Bounding by heading rather than by "the longest table" keeps the failure
 * legible: rename the heading and the count assertion above goes red naming it, instead of the
 * parser quietly matching a different table.
 */
const INVENTORY = /\n## The inventory[^\n]*\n([\s\S]*?)\n## /.exec(tracker)?.[1] ?? '';

/** The rows: `| 12 | \`path\` | 1,234 | verdict |`. */
const rowPattern = /^\| *\d+ *\| *`([^`]+)` *\| *([\d,]+) *\|([^|]*)\|/gm;

const rows = [...INVENTORY.matchAll(rowPattern)].map((match) => ({
  path: match[1],
  lines: Number(match[2].replaceAll(',', '')),
  verdict: match[3].trim()
}));

describe('the coverage map is an inventory at all', () => {
  it('found rows to check', () => {
    // At zero rows every assertion below is vacuously true, which is how this dies quietly.
    expect(rows.length).toBeGreaterThan(40);
  });

  it('found components to check them against', () => {
    expect(measured.size).toBeGreaterThan(40);
  });

  it('exempts the same fixtures the orphan gate does', () => {
    const orphanGate = readFileSync(`${ROOT}/lib/orphan-component-contract.test.ts`, 'utf8');
    const theirs = [...orphanGate.matchAll(/^ {2}'([^']+\.svelte)':/gm)].map((match) => match[1]);
    expect(theirs.sort()).toEqual([...FIXTURES].sort());
  });
});

describe('every row still describes the file it names', () => {
  it('lists no surface that does not exist', () => {
    const gone = rows.filter((row) => !measured.has(row.path)).map((row) => row.path);
    expect(gone, `${gone.join(', ')} — deleted, or renamed without moving the row`).toEqual([]);
  });

  /*
    PARTLY OVERLAPPING WITH `source-size-contract.test.ts`, measured 2026-08-29 and recorded here so
    the overlap is a decision rather than an accident.

    That file's "every component on disk has a declared ceiling" (:3087) already fails when a new
    component is added without being catalogued — but its subject set is `svelteFilesUnder(
    'lib/components/')` (:3072), so it REQUIRES an entry for **51 of these 55 surfaces**. The four
    outside it are the route files: `routes/+page.svelte`, `routes/session/+page.svelte`,
    `routes/logout/+page.svelte` and `routes/+layout.svelte`.

    `routes/+page.svelte` does carry a ceiling (`source-size-contract.test.ts:34`), and that is worth
    separating from the rest: it has one VOLUNTARILY. Nothing would fail if it were removed, because
    the completeness check never enumerates `routes/`. "Has an entry" and "is required to have one"
    are different properties, and only the second is coverage — an audit of this overlap first
    reported 52 by counting the first, which is the distinction this paragraph exists to keep.

    So the assertion below is not redundant, and it is not independent either. It is kept because the
    two guard different documents for different reasons — a ceiling catalog is about size, this is
    about a tracker that gets read as SCOPE — and because dropping it would leave the route files
    uncovered by either. If `source-size-contract` ever widens to all of `src/`, this comment is the
    place that says what would then be genuinely duplicated.
  */
  it('omits no surface that does', () => {
    const listed = new Set(rows.map((row) => row.path));
    const missing = [...measured.keys()].filter((path) => !listed.has(path));
    expect(
      missing,
      `${missing.join(', ')} — a new surface is unaudited scope until this table says otherwise. RoomOverlays.svelte sat outside this table for two weeks at 820 lines.`
    ).toEqual([]);
  });

  it('states every line count correctly', () => {
    const wrong = rows
      .filter((row) => measured.has(row.path) && measured.get(row.path) !== row.lines)
      .map((row) => `${row.path}: says ${row.lines}, is ${measured.get(row.path)}`);
    expect(
      wrong,
      `${wrong.join('; ')} — this table was read as SCOPE while one row was wrong by 5,469 lines`
    ).toEqual([]);
  });
});

describe('the headline totals match the rows', () => {
  const stated =
    /\*\*(\d+) of (\d+) surfaces audited · ([\d,]+) of ([\d,]+) lines · ([\d.]+)%\.\*\*/.exec(
      tracker
    );

  it('states its own totals in a form that can be checked', () => {
    expect(stated, 'the summary line under the inventory is missing or reworded').not.toBeNull();
  });

  it('counts the surfaces it lists', () => {
    expect(Number(stated![2])).toBe(measured.size);
  });

  it('sums the lines it lists', () => {
    const total = [...measured.values()].reduce((sum, lines) => sum + lines, 0);
    expect(Number(stated![4].replaceAll(',', ''))).toBe(total);
  });

  it('reports the audited share consistently with the rows themselves', () => {
    /*
      Read from the VERDICT COLUMN rather than trusted: `evidence-gap-register-counts.test.ts` was
      corrected for exactly this — it counted matches across the whole row, so prose elsewhere in the
      line voted on the tally. The verdict here is the fourth cell and nothing else.
    */
    const audited = rows.filter((row) => row.verdict !== 'no');
    expect(Number(stated![1])).toBe(audited.length);
    expect(Number(stated![3].replaceAll(',', ''))).toBe(
      audited.reduce((sum, row) => sum + (measured.get(row.path) ?? 0), 0)
    );
  });

  it('and the PERCENTAGE, which was the one figure here nothing checked', () => {
    /*
      Added 2026-08-31, after four of the five numbers on that line were re-derived by this block and
      the fifth was carried over by hand. That is the exact shape this whole file exists to catch —
      the header above records the tracker once saying "19 of 82 surfaces audited · 16.1%" when the
      truth was 32 and 31.4% — and it had reappeared one field to the right.

      It is the LINE share and not the surface share, which is worth stating because the two are far
      apart (40/83 is 48.2%; the lines are 44.6%) and either reads plausibly beside the same
      sentence. Lines is the honest one: the surfaces differ by two orders of magnitude in size, so
      counting files lets a run of small ones move the number without covering anything.

      Rounded to one decimal, matching the format the regex above accepts, and compared as a string
      so a headline that drifts by a tenth fails rather than passing on a float comparison nobody
      wrote a tolerance for.
    */
    const auditedLines = rows
      .filter((row) => row.verdict !== 'no')
      .reduce((sum, row) => sum + (measured.get(row.path) ?? 0), 0);
    const total = [...measured.values()].reduce((sum, lines) => sum + lines, 0);
    expect(total, 'no surfaces measured, so the share below would divide by zero').toBeGreaterThan(
      0
    );
    expect(stated![5]).toBe(((auditedLines / total) * 100).toFixed(1));
  });
});

describe('a surface the register has read WHOLE is scored here', () => {
  /*
    ── THE DRIFT THIS CATCHES, MEASURED ────────────────────────────────────────────────────────────

    On 2026-08-31 this tracker said **19 of 82 surfaces audited · 16.1%**. The real figure was **32 ·
    31.4%**. Thirteen surfaces had a whole `##` section in
    `docs/decoded/room-surface-audit-2026-08-30.md` — read end to end, decoded by value, gated by
    contract tests — and a `no` in the verdict column here.

    Nothing was wrong with either document on its own. The register grew batch by batch, each batch
    landing on its own branch, and marking this table was a manual step at merge time that thirteen
    of them missed. A coverage number that only ever moves when somebody remembers to move it is a
    coverage number that drifts DOWN, which is the safe direction and the reason nobody noticed: the
    tracker was under-claiming, so every reading of it was pessimistic and nothing failed.

    ## Why the ORIGINAL pass is excluded, and how that is decided from the document

    The blockquote above this table says the register *"does not re-score the table above,
    deliberately"*, because that pass's list is 18 SURFACES against this one's 82 FILES and the two
    partitions do not line up — four of its entries are slices of `ModalHost.svelte` alone.

    That reasoning applies to the original two-verifier pass and not to the later batches, each of
    which read ONE file here whole. So the split is taken from the document itself rather than from a
    hand-kept list: an original-pass section opens with the exact line `N verified gaps; M reference
    behaviours confirmed present.`, and nothing else does.
  */
  const AUDIT = readFileSync(
    fileURLToPath(
      new URL('../../../../docs/decoded/room-surface-audit-2026-08-30.md', import.meta.url)
    ),
    'utf8'
  );

  /** A section from the original two-verifier pass, which this table deliberately does not score. */
  const ORIGINAL_PASS = /^\d+ verified gaps; \d+ reference behaviours confirmed present\.?$/;

  const auditLines = AUDIT.split('\n');
  const sections: Array<{ heading: string; original: boolean }> = [];
  for (const [index, line] of auditLines.entries()) {
    const heading = /^## ([A-Za-z0-9_/.-]+\.svelte)\s*$/.exec(line);
    if (!heading) continue;
    let at = index + 1;
    while (at < auditLines.length && !auditLines[at].trim()) at += 1;
    sections.push({
      heading: heading[1],
      original: ORIGINAL_PASS.test((auditLines[at] ?? '').trim())
    });
  }

  it('found sections of both kinds — the vacuity floor', () => {
    /*
      Both halves, because either being empty makes the assertion below pass over nothing. An empty
      `later` list would report that every whole-file read is scored because none was found.
    */
    expect(sections.filter((section) => section.original).length).toBeGreaterThan(5);
    expect(sections.filter((section) => !section.original).length).toBeGreaterThan(15);
  });

  it('scores every later-batch surface that names a file in this table', () => {
    const byBasename = new Map(rows.map((row) => [row.path.split('/').at(-1)!, row]));

    const unscored = sections
      .filter((section) => !section.original)
      .map((section) => byBasename.get(section.heading.split('/').at(-1)!))
      .filter((row) => row !== undefined && row.verdict === 'no')
      .map((row) => row!.path);

    expect(
      unscored,
      `these surfaces have a whole-file section in the v4 register and are still marked 'no' here. ` +
        `Either the section is a partial read — in which case say so in its opening line — or this ` +
        `table owes it a verdict. Thirteen accumulated before this assertion existed.`
    ).toEqual([]);
  });

  it('does NOT require the original pass to be scored', () => {
    /*
      The counter-assertion, so the rule cannot be "simplified" into scoring everything. Those nine
      sections are slices and groupings that do not line up with this table's files, and the
      blockquote above says so; a future edit that scores them would be claiming coverage the pass
      did not produce.
    */
    const originals = sections
      .filter((section) => section.original)
      .map((section) => section.heading);
    expect(originals.length).toBeGreaterThan(0);
    expect(
      originals,
      'the original-pass sections are identified by their own opening line, not by a hand-kept list'
    ).toContain('RoomMessage.svelte');
  });
});
