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
 * So: split on UNESCAPED pipes, scan every cell for a status word rather than trusting a position,
 * and treat the Tier 4 section heading as the status for its rows. A parser that got any one of
 * those wrong is how the first three attempts at this count disagreed with each other.
 */

const ROOT = `${process.cwd()}/../..`;
const REGISTER = readFileSync(`${ROOT}/docs/reference/evidence-gap-register.md`, 'utf8');
const TODO = readFileSync(`${ROOT}/TODO.md`, 'utf8');

type Bucket = 'CLOSED' | 'OPEN' | 'PARKED' | 'UNCLASSIFIED';

function tally() {
  const rows = new Map<string, string[]>();
  for (const line of REGISTER.split('\n')) {
    const id = /^\|\s*(T\d+-\d+)\s*\|/.exec(line)?.[1];
    if (!id) continue;
    /* Unescaped pipes only — `\|` appears inside code spans in several descriptions. */
    const cells = line
      .split(/(?<!\\)\|/)
      .slice(1, -1)
      .map((c) => c.trim());
    /* First occurrence wins: an id repeated in a later summary table is the same gap. */
    if (!rows.has(id)) rows.set(id, cells);
  }

  const counts: Record<Bucket, number> = { CLOSED: 0, OPEN: 0, PARKED: 0, UNCLASSIFIED: 0 };
  for (const [id, cells] of rows) {
    counts[bucket(id, cells)]++;
  }
  return { counts, total: rows.size };
}

function bucket(id: string, cells: string[]): Bucket {
  /* Tier 4's heading IS its status — those rows carry no status word. */
  if (id.startsWith('T4-')) return 'PARKED';
  const joined = cells.join(' ~ ').toUpperCase();
  /* CLOSED wins: a closure note often quotes the original OPEN wording. */
  if (joined.includes('CLOSED')) return 'CLOSED';
  if (joined.includes("WON'T FIX") || joined.includes('PARKED')) return 'PARKED';
  if (/\bOPEN\b/.test(joined)) return 'OPEN';
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
