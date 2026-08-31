import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `docs/decoded/room-surface-audit-2026-08-30.md` counts its own remaining work.
 *
 * ## Why this exists, and it is the same lesson `todo-next-coverage-contract` was written for
 *
 * That document is the tracker for 224 rows across eighteen surfaces, and "how many are left" was
 * being answered by grepping it. On 2026-08-30 that answer came out **three different ways in ten
 * minutes** — 158, then 218, then 151 — not because the document changed but because each pattern
 * recognised a different subset of the eight ways a closed row says it is closed. Every one of those
 * numbers was quoted as progress before the next one refuted it.
 *
 * A number nothing checks is a number that drifts, and this one was drifting inside a single
 * session. So the DISPOSITIONS are a fixed vocabulary now, the header states the totals, and this
 * file is what makes the two agree.
 *
 * ## The vocabulary, and why "closed" is more than "built"
 *
 * A row can be finished in eight ways and only three of them are code. The other five are the
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

/**
 * ## The verification table, checked against the five other places the same numbers appear
 *
 * The block above counts ROWS. This one counts the two-verifier PASS that produced them, and it was
 * added on 2026-08-30 because that pass's totals had drifted inside the document itself.
 *
 * `274 claimed / 222 survived / 52 refuted` is what the table read. Every other statement of the
 * same numbers disagreed: the prose said "51 were refuted" and broke it down as thirty-two plus
 * nineteen; the refuted section was headed "The fifty-one refuted claims" and listed fifty-one; the
 * per-surface table summed to 223; and `274 - 51` is 223. One number had been moved — when UIM-03
 * was refuted after the document was committed — and five had not.
 *
 * That is precisely the failure the document was written to warn about, happening to the document.
 * So the fix is not to correct the number once; it is to make those statements check each other,
 * which is what this does. **Every assertion below compares one part of the document to another
 * part of it** — none of them hardcodes a total — so the numbers may all change together and the
 * test still holds, while any one of them moving alone fails.
 */
describe('the two-verifier pass states its own arithmetic', () => {
  const cell = (label: string) => {
    const found = new RegExp(
      `^\\| \\*{0,2}${label}\\*{0,2} \\| \\*{0,2}(\\d+)\\*{0,2} \\|$`,
      'm'
    ).exec(AUDIT);
    expect(found, `the summary table has no "${label}" row`).not.toBeNull();
    return Number(found![1]);
  };

  const claimed = () => cell('differences claimed');
  const survived = () => cell('survived verification');
  const refuted = () => cell('refuted');

  it('adds up: claimed = survived + refuted', () => {
    expect(survived() + refuted()).toBe(claimed());
  });

  it('states the same survivor count in the headline as in the table', () => {
    const headline = /\*\*(\d+) verified gaps across (\d+) surfaces\.\*\*/.exec(AUDIT);
    expect(headline, 'the opening sentence is missing or reworded').not.toBeNull();
    expect(Number(headline![1])).toBe(survived());
    expect(Number(headline![2])).toBe(cell('surfaces read'));
  });

  /**
   * The refuted heading spells its number out, which is why it was the one nobody updated. A word
   * is not harder to check than a digit — it is only harder to grep, and that is the argument for
   * checking it here rather than hoping.
   */
  const UNITS = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
  ];
  const TENS = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety'
  ];
  const spell = (value: number) =>
    value < 20
      ? UNITS[value]
      : value % 10 === 0
        ? TENS[Math.floor(value / 10)]
        : `${TENS[Math.floor(value / 10)]}-${UNITS[value % 10]}`;

  const REFUTED_HEADING = /^## The ([a-z-]+) refuted claims$/m;

  it('states the same refuted count in the refuted section s own heading', () => {
    const heading = REFUTED_HEADING.exec(AUDIT);
    expect(heading, 'the refuted section heading is missing or reworded').not.toBeNull();
    expect(refuted(), 'the speller below only covers 0-99').toBeLessThan(100);
    expect(heading![1]).toBe(spell(refuted()));
  });

  it('lists exactly that many refuted claims under it', () => {
    const heading = REFUTED_HEADING.exec(AUDIT);
    /*
      ## Bounded at the NEXT `## ` heading, and it used to run to the end of the file

      "Under it" means the refuted section, not the rest of the document. Slicing to EOF was
      correct only for as long as the refuted table happened to be the last thing in the file, and
      that stopped being true the moment a surface was appended below it: on 2026-08-31 the three
      sections for `StreamingView`, `DayTradeAlertsPane` and `SwingAlertsPane` arrived carrying
      markdown TABLES of their own — a per-member byte map and a decoded `consts` table — and
      forty-eight of their rows were counted as refuted claims. The document was right and the
      count was wrong, which is the one direction this file exists to prevent.

      The end anchor is bound to a local and checked, for the reason the surfaces-table parser
      below states in full: `indexOf` answers -1 on failure, -1 is a valid `slice` argument, and a
      slice with an inlined `indexOf` silently becomes "to the last character" instead of throwing.
      Here that silence is exactly the bug being fixed, so it is asserted rather than assumed —
      with the refuted section allowed to be last, which it was until today.
    */
    const from = heading!.index;
    const next = AUDIT.indexOf('\n## ', from + 1);
    const section = AUDIT.slice(from, next === -1 ? AUDIT.length : next);
    expect(section.startsWith('## The '), 'the refuted section slice lost its own heading').toBe(
      true
    );
    /* Table BODY rows only — the header row and the `| --- |` rule are not claims. */
    const listed = section
      .split('\n')
      .filter(
        (line) => line.startsWith('| ') && !line.startsWith('| --- ') && !line.startsWith('| # |')
      );
    expect(listed).toHaveLength(refuted());
  });

  /**
   * The per-surface table, parsed once — and its two anchors bound to locals rather than inlined,
   * because `indexOf` answers -1 when it fails and -1 is a valid `slice` argument. A slice bound by
   * an inlined `indexOf` silently becomes "from the end" or "to the last character" instead of
   * throwing, which is the shape `slice-anchor-contract.test.ts` ratchets down, and the shape that
   * has produced a green-but-meaningless assertion three times in this repository.
   */
  const surfaceRows = () => {
    const start = AUDIT.indexOf('| surface | gaps | of which high |');
    expect(start, 'the per-surface table is missing or its header was reworded').toBeGreaterThan(
      -1
    );
    const end = AUDIT.indexOf('\n\n', start);
    expect(end, 'the per-surface table runs to the end of the document').toBeGreaterThan(start);
    const cells = AUDIT.slice(start, end)
      .split('\n')
      .map((line) => /^\| [^|]+ \| (\d+) \| (\d+) \| (\d+) \|$/.exec(line))
      .filter((found): found is RegExpExecArray => found !== null);
    expect(cells.length, 'no surface rows parsed — the column shape changed').toBe(
      cell('surfaces read')
    );
    return cells;
  };

  const columnTotal = (column: 1 | 2 | 3) =>
    surfaceRows().reduce((sum, found) => sum + Number(found[column]), 0);

  it('sums the per-surface table to the survivor count', () => {
    /*
      This is the assertion that would have caught the drift on its own: the per-surface table is
      the only statement of the total that is DERIVED rather than written, so it cannot be edited
      into agreement without editing a surface.
    */
    expect(columnTotal(1)).toBe(survived());
  });

  /**
   * Four more derived agreements, all of which held while the summary table did not — which is the
   * argument for pinning them rather than trusting that the one wrong number was the only one.
   */
  it('sums the kind and severity breakdowns to the survivor count too', () => {
    const kinds = (AUDIT.match(/^\| `[a-z-]+` \| (\d+) \|/gm) ?? []).reduce(
      (sum, line) => sum + Number(/(\d+)/.exec(line)![1]),
      0
    );
    expect(kinds, 'the `kind` column').toBe(survived());

    const severities = ['high', 'medium', 'low'].reduce((sum, name) => {
      const found = new RegExp(`\\| ${name} \\| (\\d+) \\|`).exec(AUDIT);
      expect(found, `the severity table has no "${name}" row`).not.toBeNull();
      return sum + Number(found![1]);
    }, 0);
    expect(severities, 'the `severity` column').toBe(survived());
  });

  it('agrees with itself on how many of the gaps are high, and how many behaviours were present', () => {
    /* The `of which high` column against the severity breakdown above it. */
    const high = /\| high \| (\d+) \|/.exec(AUDIT);
    expect(high, 'the severity table has no "high" row').not.toBeNull();
    expect(columnTotal(2)).toBe(Number(high![1]));

    /* The `confirmed present` column against the one place the prose states that total. */
    expect(AUDIT).toContain(`${columnTotal(3)} behaviours were confirmed built`);
  });

  it('files every row under the surface heading that counts it', () => {
    /*
      ## The defect this was written for, found 2026-08-30

      The eighteen `note-editor-*` rows sat under `## RoomMessage.svelte`, and
      `## notes/NoteEditor.svelte` was an empty stub below them claiming eighteen gaps and listing
      none. Nothing was lost and every one of them was closed — but each section said the opposite
      of the truth to anybody reading it: NoteEditor looked unstarted, RoomMessage looked twice its
      size, and "which surface is finished" could not be answered by reading.

      Every OTHER assertion in this file was green throughout, and that is the point: they all count
      the document as one bag of rows. This is the only one that asks WHERE a row is, and the
      surfaces table is the statement it is checked against — the same table whose `gaps` column
      already has to sum to the survivor count, so the two constraints together pin both the total
      and its distribution.

      RM-25 is the one allowance, and it is a named one rather than a tolerance: it was added after
      the pass, is recorded as such in the prose above, and is deliberately not in that table.
    */
    const surfaces = new Map<string, number>();
    for (const found of surfaceRows()) {
      const name = /^\| ([^|]+?) \|/.exec(found[0]);
      expect(name, `could not read a surface name from ${found[0]}`).not.toBeNull();
      surfaces.set(name![1].trim(), Number(found[1]));
    }

    /*
      Walk the document, attributing each `### ` row to the `## ` heading above it — and counting,
      per surface, how many of those rows declare themselves as added AFTER the pass.

      THE ALLOWANCE IS DERIVED NOW, and it used to be `surface === 'RoomMessage.svelte' ? 1 : 0`.
      That was honest when RM-25 was the only such row: one named exception, written where a reader
      would see it. It stopped scaling on 2026-08-31, when a second reading added twenty-seven rows
      across five surfaces — and a hardcoded list would have had to grow by hand every time, which
      is the shape that goes stale.

      So the document declares it instead. A row added after the pass carries the same sentence
      RM-25's prose carries, and this counts those sentences per heading. The constraint is
      unchanged and is still exact: a row may sit outside the table ONLY by saying so at itself.
      An unmarked row still has to be in the surface's `gaps` count, and a marked one still has to
      be somewhere — the `survivors plus the ones added afterwards` assertion below counts the same
      sentences document-wide, so a row cannot escape both.
    */
    const filed = new Map<string, number>();
    const addedAfter = new Map<string, number>();
    let heading = '';
    let inRow = '';
    for (const line of lines) {
      if (line.startsWith('## ')) {
        heading = line.slice(3).trim();
        inRow = '';
      } else if (line.startsWith('### ')) {
        filed.set(heading, (filed.get(heading) ?? 0) + 1);
        inRow = heading;
      } else if (inRow && line.includes('row was ADDED after this document was committed')) {
        addedAfter.set(inRow, (addedAfter.get(inRow) ?? 0) + 1);
      }
    }

    const wrong: string[] = [];
    for (const [surface, gaps] of surfaces) {
      const allowance = addedAfter.get(surface) ?? 0;
      const actual = filed.get(surface) ?? 0;
      if (actual !== gaps + allowance) {
        wrong.push(`${surface}: the table says ${gaps}, ${actual} rows are filed under it`);
      }
    }
    expect(
      wrong,
      `${wrong.join('; ')} — a row filed under the wrong heading makes both sections lie about how much of each surface is done.`
    ).toEqual([]);
  });

  it('and the rows in the document are the survivors plus the ones added afterwards', () => {
    /*
      RM-25 was found while building, after the pass ran, and is deliberately outside the table. So
      the document holds MORE rows than the pass produced, and the difference is not slack — it is
      exactly the rows whose addition is recorded in the prose above. Any other gap between the two
      is a row that appeared without a record.
    */
    const added = (AUDIT.match(/row was ADDED after this document was committed/g) ?? []).length;
    expect(rows.length).toBe(survived() + added);
  });
});
