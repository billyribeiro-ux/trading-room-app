import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `docs/decoded/room-surface-audit-2026-08-30.md` counts its own remaining work.
 *
 * ## Why this exists, and it is the same lesson `todo-next-coverage-contract` was written for
 *
 * That document is the tracker for 224 rows across seventeen surfaces, and "how many are left" was
 * being answered by grepping it. On 2026-08-30 that answer came out **three different ways in ten
 * minutes** — 158, then 218, then 151 — not because the document changed but because each pattern
 * recognised a different subset of the seven ways a closed row says it is closed. Every one of those
 * numbers was quoted as progress before the next one refuted it.
 *
 * A number nothing checks is a number that drifts, and this one was drifting inside a single
 * session. So the DISPOSITIONS are a fixed vocabulary now, the header states the totals, and this
 * file is what makes the two agree.
 *
 * ## The vocabulary, and why "closed" is more than "built"
 *
 * A row can be finished in seven ways and only three of them are code. The other four are the
 * expensive ones to lose, because a row that was investigated and deliberately not built looks
 * exactly like a row nobody has read yet — which is how work gets done twice.
 */
const DISPOSITIONS = [
  /** Built here, in this repository, against the cited reference bytes. */
  'BUILT',
  /** Built, but the row named a larger scope than the part that was right to build. */
  'HALF BUILT',
  /** A defect of ours removed rather than a reference behaviour added. */
  'FIXED',
  /** Already present under a name the audit's reader did not search for. */
  'ALREADY BUILT',
  /** Read, measured, and deliberately NOT built — with the measurement recorded at the code. */
  'MEASURED REFUSAL',
  /** Reproducing the reference here would reproduce a defect. Recorded, not matched. */
  'DELIBERATE DIVERGENCE',
  /** Not ours to decide. Named, with what the owner has to answer. */
  'OWNER DECISION',
  /** Cannot be finished from this checkout. Named, with what would unblock it. */
  'BLOCKED'
] as const;

const AUDIT = readFileSync(
  new URL('../../../../docs/decoded/room-surface-audit-2026-08-30.md', import.meta.url),
  'utf8'
);

const lines = AUDIT.split('\n');

/**
 * Every `### ` row, with the first non-blank line under it.
 *
 * That line is the whole grammar: it is either a DISPOSITION (the row is finished) or the
 * `**severity** · category · reference byte` metadata line (the row is open). There is no third
 * shape, and a row that grows one is a row this cannot count — which is the assertion below.
 */
const rows = lines.flatMap((line, index) => {
  if (!line.startsWith('### ')) return [];
  let at = index + 1;
  while (at < lines.length && !lines[at].trim()) at += 1;
  return [{ heading: line.slice(4), first: (lines[at] ?? '').trim() }];
});

const METADATA = /^\*\*(low|medium|high|critical)\*\* ·/;
const disposition = (first: string) => DISPOSITIONS.find((word) => first.startsWith(`**${word}`));

const open = rows.filter((row) => METADATA.test(row.first));
const closed = rows.filter((row) => disposition(row.first));

describe('the audit is countable at all', () => {
  it('found the rows', () => {
    /* At zero rows every assertion below is vacuously true, which is how this dies quietly. */
    expect(rows.length).toBeGreaterThan(200);
  });

  it('gives every row one of the two shapes, and nothing else', () => {
    /*
      A row whose first line is neither a severity nor a disposition is invisible to every count in
      this file AND to every grep anyone runs over the document. It is the failure mode this test
      exists for, so it is named rather than silently skipped.
    */
    const strays = rows
      .filter((row) => !METADATA.test(row.first) && !disposition(row.first))
      .map((row) => `${row.heading.slice(0, 70)} — starts "${row.first.slice(0, 40)}"`);
    expect(
      strays,
      `${strays.join('; ')} — a row is either OPEN (a **severity** · line) or CLOSED (one of: ${DISPOSITIONS.join(', ')}). Anything else is a row no count can see.`
    ).toEqual([]);
  });

  it('accounts for every row exactly once', () => {
    expect(open.length + closed.length).toBe(rows.length);
  });
});

describe('the header states the totals it can be checked against', () => {
  const stated = /\*\*(\d+) open · (\d+) closed · (\d+) rows\.\*\*/.exec(AUDIT);

  it('states them in a form that can be checked', () => {
    expect(stated, 'the disposition line under the summary is missing or reworded').not.toBeNull();
  });

  it('counts the open rows', () => {
    expect(Number(stated![1])).toBe(open.length);
  });

  it('counts the closed ones', () => {
    expect(Number(stated![2])).toBe(closed.length);
  });

  it('and the two sum to the whole document', () => {
    expect(Number(stated![3])).toBe(rows.length);
  });
});
