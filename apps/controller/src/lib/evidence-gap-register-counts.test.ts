import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `TODO.md`'s gap tally, recounted from the register it summarises.
 *
 * ## Why this exists
 *
 * `TODO.md` carries one line of the form "N CLOSED, N OPEN, N parked, N total", and
 * `docs/reference/evidence-gap-register.md` is the tracker those numbers describe. The tally was
 * maintained by hand — adjusted by memory each time an item closed — and on 2026-08-13 **all four
 * numbers were wrong**: it read 42/24/14/79 against an actual 46/22/13/81.
 *
 * That is the exact failure both documents warn about in their own words: "two places recording the
 * same thing is how one of them goes stale". The register is the tracker; the tally is a derived
 * fact; and a derived fact maintained by hand drifts silently, because nobody recounts 81 table rows
 * to check a sentence.
 *
 * ## How the register is parsed, and why it needs care
 *
 * Rows do not all have the same shape:
 *
 *  - Tier 0 rows are `| id | gap | status | detail |` — status is the THIRD cell.
 *  - Tiers 1, 2 and 5 are `| id | gap | … | status |` — status is the LAST cell.
 *  - **Tier 4 rows carry no status word at all**, because their section heading is "Tier 4 — won't
 *    fix". Reading position alone counts them as unclassified.
 *  - Several rows contain a literal `\|` inside a code span, so a naive split on `|` shreds them.
 *
 * So: split on UNESCAPED pipes, find the status column from the table's OWN HEADER, and treat the
 * Tier 4 section heading as the status for its rows. A parser that got any one of those wrong is how
 * the first three attempts at this count disagreed with each other.
 *
 * ## Why it reads the status CELL now, and not the whole row — corrected 2026-08-27
 *
 * It used to scan every cell for a status word, "CLOSED wins". That made the number CI enforces and
 * the number a human reads two different numbers, which `TODO.md` carried as an open row: the parser
 * said 68/5/14 while reading the status column by eye gave 66/6/15. Both cannot be right, and the
 * parser was wrong — rows narrate their own history (`already closed`, `Status stays OPEN`), and a
 * closure note quoting the original OPEN wording made prose in the DETAIL cell vote on the status.
 *
 * Three rows moved when the anchor changed, and each was read before the change was kept:
 *
 *   T1-3   its status cell says "WON'T FIX — superseded by T0-5"; the row's detail mentioned CLOSED
 *   T2-22  status "**CLOSED 2026-08-14**", with an earlier note inside the same cell that reads
 *          "(Status stays OPEN: the geometry half remains.)" — history, not status
 *   T5-25  status "OPEN — DECISION NEEDED (same as T5-24)", while its detail argues its endpoint is
 *          built. Both are true: the endpoint is built and the DISPLAY is blocked on the same owner
 *          sentence as T5-24, so the row is open
 *
 * The corrected parse gives **66 / 6 / 15 / 87 with nothing unclassified — the same numbers as
 * reading the column by eye.** Two independent methods agreeing is the evidence this is now right.
 *
 * ## Trailing cells are JOINED, and that is not a shortcut
 *
 * Seven rows contain unescaped `|` inside prose — `||` in an Angular expression, an IP list
 * `localhost|127.0.0.1`, a filter pipe `statXrefs | filter:` — so those rows split into more cells
 * than their header has columns. Taking the status by bare index would read a fragment of a code
 * span; taking the LAST cell would read a fragment of the same prose. Where the header puts status
 * LAST, everything from that index on IS the status cell, so it is joined back before being read.
 * Without that, five rows come back UNCLASSIFIED and the total silently undercounts by five.
 */

const ROOT = `${process.cwd()}/../..`;
const REGISTER = readFileSync(`${ROOT}/docs/reference/evidence-gap-register.md`, 'utf8');
const TODO = readFileSync(`${ROOT}/TODO.md`, 'utf8');

type Bucket = 'CLOSED' | 'OPEN' | 'PARKED' | 'UNCLASSIFIED';

/** Unescaped pipes only — `\|` appears inside code spans in several descriptions. */
function splitCells(line: string): string[] {
  return line
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((c) => c.trim());
}

function tally() {
  const rows = new Map<string, { cells: string[]; header: string[] }>();
  /*
    The header travels WITH the row, because the tables disagree about where status sits and a row
    read against the wrong header is read at the wrong index. Cleared at every heading so a table
    cannot inherit the previous section's columns.
  */
  let header: string[] = [];
  for (const line of REGISTER.split('\n')) {
    if (!line.startsWith('|')) {
      if (line.startsWith('#')) header = [];
      continue;
    }
    const cells = splitCells(line);
    /* The `|---|` separator is not a row. */
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const id = /^\|\s*(T\d+-\d+)\s*\|/.exec(line)?.[1];
    if (!id) {
      header = cells;
      continue;
    }
    /* First occurrence wins: an id repeated in a later summary table is the same gap. */
    if (!rows.has(id)) rows.set(id, { cells, header });
  }

  const counts: Record<Bucket, number> = { CLOSED: 0, OPEN: 0, PARKED: 0, UNCLASSIFIED: 0 };
  for (const [id, { cells, header: columns }] of rows) {
    counts[bucket(id, cells, columns)]++;
  }
  return { counts, total: rows.size };
}

/**
 * The status cell of one row, located by the header of the table it sits in.
 *
 * `null` when the table has no status column at all — Tier 4's does not, and its rows are handled
 * before this is reached.
 */
function statusCell(cells: string[], header: string[]): string | null {
  const index = header.findIndex((name) => /^status$/i.test(name));
  if (index < 0) return null;
  /* Status last: every trailing cell is prose that unescaped pipes split off it. See the header. */
  return index === header.length - 1 ? cells.slice(index).join(' ') : (cells[index] ?? '');
}

function bucket(id: string, cells: string[], header: string[]): Bucket {
  /* Tier 4's heading IS its status — those rows carry no status word. */
  if (id.startsWith('T4-')) return 'PARKED';
  const cell = statusCell(cells, header);
  if (cell === null) return 'UNCLASSIFIED';
  const status = cell.toUpperCase();
  /* CLOSED still wins WITHIN the cell: a closure note quotes the wording it replaced. */
  if (status.includes('CLOSED')) return 'CLOSED';
  if (status.includes("WON'T FIX") || status.includes('WON\u2019T FIX') || status.includes('PARKED'))
    return 'PARKED';
  if (/\bOPEN\b/.test(status)) return 'OPEN';
  return 'UNCLASSIFIED';
}

describe('the TODO tally matches the register it summarises', () => {
  const { counts, total } = tally();

  it('reads a real set of rows, so the comparison cannot be vacuous', () => {
    /* If the row regex ever stops matching, every count below is 0 and would agree with a TODO line
       that also said 0. Counted 2026-08-13. */
    expect(total).toBeGreaterThan(70);
  });

  it('classifies every row — none left unclassified', () => {
    /*
      An unclassified row is a silent undercount. This caught the five Tier 4 rows, whose status is
      their section heading rather than a cell, and which a position-based parser dropped.
    */
    expect(counts.UNCLASSIFIED).toBe(0);
  });

  it('the four buckets sum to the total', () => {
    expect(counts.CLOSED + counts.OPEN + counts.PARKED + counts.UNCLASSIFIED).toBe(total);
  });

  it('TODO.md states exactly those numbers', () => {
    const line = /\*\*(\d+) CLOSED, (\d+) OPEN, (\d+) parked\/won't-fix, (\d+) total\.\*\*/.exec(TODO);
    expect(line, 'TODO.md must carry a tally line in the documented shape').not.toBeNull();
    const [, closed, open, parked, tot] = line!;
    expect(
      { closed: +closed, open: +open, parked: +parked, total: +tot },
      'TODO.md tally has drifted from the register — recount, do not adjust by memory'
    ).toEqual({
      closed: counts.CLOSED,
      open: counts.OPEN,
      parked: counts.PARKED,
      total
    });
  });
});
