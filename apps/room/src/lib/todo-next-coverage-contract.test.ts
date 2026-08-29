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
    .map((relative) => [relative, readFileSync(`${ROOT}/${relative}`, 'utf8').split('\n').length - 1])
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
    /\*\*(\d+) of (\d+) surfaces audited · ([\d,]+) of ([\d,]+) lines · ([\d.]+)%\.\*\*/.exec(tracker);

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
});
