import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/*
  `{#each}` KEYS: keyed by default, and an INDEX key only where position is the real identity.

  ## The rule, and where it comes from

  Svelte's best-practices page, verbatim: *"Prefer to use keyed each blocks — this improves
  performance by allowing Svelte to surgically insert or remove items rather than updating the DOM
  belonging to existing items."* And immediately after: *"The key MUST uniquely identify the object.
  Do not use the index as a key."*

  A structural audit on 2026-08-17 found five index-keyed blocks. Reading them turned one rule into
  two cases, which is why this file exists instead of a five-line fix.

  ## Case one: no identity, so the key was a false signal

  `RoomMessage.bodySegments`, `RoomMessage`'s evidence segments and the page's private-chat segments
  all iterate arrays PARSED from a single message body and replaced wholesale when it changes. A
  segment never moves from one position to another while surviving, so it has no identity to key by.

  An index key and no key at all produce identical DOM reuse — so this was never a bug. It was a
  claim: `(index)` reads as "these are keyed, reuse is safe", and there was nothing behind it. The
  keys were removed; behaviour is byte-identical and the code no longer promises what it cannot do.

  ## Case two: position IS the identity, so the index is correct

  `PollPanel` iterates `pollChoices` twice, and in that component a choice is defined by its slot:

      onanswer(index)                                — the vote sent to the server IS the index
      totals[index]                                  — the result count for that choice
      calculatePollSeries(pollChoices, totals, total) — paired by position

  Here the index satisfies "uniquely identifies the object" rather than violating it. Giving choices
  synthetic ids would add a SECOND identity to keep in step with the wire's, and the failure mode of
  that drifting is a vote recorded against the wrong choice — strictly worse than what it replaced.

  ## What this file does

  Discovers every `{#each}` in every `.svelte` file via `svelte.parse` — never a regex over Svelte
  structure — and fails on any index-keyed block that is not on the allow-list below, WITH its
  reason. A new one cannot appear silently, and an existing one cannot be "tidied" into synthetic
  ids without deleting a stated justification first.
*/

const ALLOWED_INDEX_KEYS: readonly { file: string; why: string }[] = [
  {
    file: 'src/lib/components/PollPanel.svelte',
    why: 'position IS the choice identity — `onanswer(index)` is the vote and `totals` is a parallel array'
  }
];

const svelteFiles = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...svelteFiles(path));
    else if (entry.name.endsWith('.svelte')) found.push(path);
  }
  return found;
};

interface EachBlock {
  file: string;
  line: number;
  keyed: boolean;
  indexKeyed: boolean;
}

const eachBlocks = (): EachBlock[] => {
  const found: EachBlock[] = [];
  for (const file of svelteFiles('src')) {
    const source = readFileSync(file, 'utf8');
    const lineOf = (offset: number) => source.slice(0, offset).split('\n').length;
    const ast = parse(source, { modern: true });

    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const candidate = node as {
        type?: string;
        key?: { type?: string; name?: string };
        index?: string;
        start?: number;
      };

      if (candidate.type === 'EachBlock') {
        found.push({
          file,
          line: lineOf(candidate.start ?? 0),
          keyed: Boolean(candidate.key),
          /*
            The index key is `(index)` where `index` is the each block's own index binding — an
            `Identifier` whose name matches. `(item.id)` is a different node entirely, and
            `(datum.label)` in `PollPanel`'s pie chart is a MemberExpression, so neither trips this.
          */
          indexKeyed:
            candidate.key?.type === 'Identifier' &&
            candidate.index !== undefined &&
            candidate.key.name === candidate.index
        });
      }

      for (const value of Object.values(node as Record<string, unknown>)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };

    visit(ast.fragment);
  }
  return found;
};

describe('every {#each} key says something true', () => {
  const blocks = eachBlocks();

  it('found the each blocks it is meant to police', () => {
    // At zero every assertion below is vacuous — the same guard the reader catalog carries.
    expect(blocks.length).toBeGreaterThan(40);
  });

  it('no index-keyed block exists outside the allow-list', () => {
    const allowed = new Set(ALLOWED_INDEX_KEYS.map((entry) => entry.file));
    const offenders = blocks
      .filter((block) => block.indexKeyed && !allowed.has(block.file))
      .map((block) => `${block.file}:${block.line}`);

    expect(
      offenders,
      `these {#each} blocks are keyed by INDEX:\n  ${offenders.join('\n  ')}\n\nSvelte's best practices: "the key must uniquely identify the object. Do not use the index as a key."\n\nTwo honest outcomes. If the items have no identity — a parsed or derived list replaced wholesale — write NO key; index-keyed and unkeyed reuse the DOM identically, so the key is a promise with nothing behind it. If position genuinely IS the identity, as it is for poll choices whose index is the vote, add the file to ALLOWED_INDEX_KEYS with the reason.`
    ).toEqual([]);
  });

  it('every allow-list entry still has an index-keyed block to justify', () => {
    /*
      The staleness half, and the reason this is not just a lint rule. An entry left behind after
      its block was rewritten reads as a standing exemption for a file that no longer needs one —
      the next index key added there would be waved through by a justification about something else.
    */
    const indexKeyedFiles = new Set(
      blocks.filter((block) => block.indexKeyed).map((block) => block.file)
    );
    const stale = ALLOWED_INDEX_KEYS.filter((entry) => !indexKeyedFiles.has(entry.file)).map(
      (entry) => entry.file
    );

    expect(
      stale,
      `${stale.join(', ')} is allow-listed for index keys but no longer has one. Remove the entry — a permission nobody uses is a permission the next person inherits by accident.`
    ).toEqual([]);
  });

  it('the segment lists carry no key at all, which is the honest form', () => {
    /*
      Asserted positively rather than left to the negative above, because "no offenders" would also
      be satisfied by someone deleting the `{#each}` entirely. These three are the blocks the audit
      found and corrected, and they must stay unkeyed rather than acquire a new invented key.
    */
    const unkeyedAt = (file: string, count: number) => {
      const inFile = blocks.filter((block) => block.file === file && !block.keyed);
      expect(
        inFile.length,
        `${file} should hold ${count} unkeyed each block(s)`
      ).toBeGreaterThanOrEqual(count);
    };
    /*
      ONE each, not two, since 2026-08-30: the segment renderer became `MessageBody.svelte`, so the
      unkeyed segment block moved and the one left in `RoomMessage.svelte` is the CARD's captured
      `evidenceBodySegments` list. Both are asserted, because "the file has at least one" would be
      satisfied by the wrong one surviving.
    */
    unkeyedAt('src/lib/components/RoomMessage.svelte', 1);
    unkeyedAt('src/lib/components/MessageBody.svelte', 1);
    /*
      MOVED, 2026-08-28, and re-pointed rather than dropped. This was `+page.svelte`'s
      `bodySegmentsPrivate` snippet — a link split threaded into `PrivateChatPanel` as a prop. It is
      `CompactMessageRow.svelte`'s now, because a second surface (the all-user private-message modal)
      renders the same row and a transcription written twice is two transcriptions. The block did not
      change; only its home did, and the reason for it carrying no key is unchanged.
    */
    unkeyedAt('src/lib/components/CompactMessageRow.svelte', 1);
  });
});

/**
 * ── `DTP-04` AND `SWP-04` — `trackBy: (index, item) => item`, AND WHY THE ID KEY STAYS ───────────
 *
 * Both alert panes were asked to change `{#each visibleAlerts as row (row.id)}` to `(row)`, on the
 * ground that the reference passes `Li(t,n){return n}` as `ɵɵrepeaterCreate`'s seventh argument
 * (byte 1,944,820 for the day-trade pane, 1,938,465 for the swing twin) — Angular's identity
 * trackBy — and that a Svelte object key is its exact analogue. The analogue is exact. Measured and
 * NOT changed, 2026-09-02, for two reasons that stand independently.
 *
 * ## 1. A key is not rendered output
 *
 * `trackBy` and a Svelte key are both RECONCILIATION hints: they decide whether a DOM node is moved
 * or re-created, and the resulting markup is identical either way. That is internal structure, which
 * is the one thing that is not a divergence to close.
 *
 * ## 2. Svelte's own documentation names this exact trade and recommends against it
 *
 * From `svelte/each`, verbatim: *"The key can be any object, but **strings and numbers are
 * recommended since they allow identity to persist when the objects themselves change**."*
 *
 * The objects here change. `visibleAlerts` is
 * `limitDayTradeLogs(searchDayTradeLogs(alerts, search), limit)` — `filter` and `slice`, which
 * return new ARRAYS holding the SAME element references, so within one page's lifetime the two keys
 * agree exactly. They part across a REFETCH, where the load produces new objects for the same
 * alerts: `row.id` moves the existing rows, and `row` destroys and re-creates every one of them —
 * losing focus, selection and scroll position inside each row, on every new alert.
 *
 * `CLAUDE.md` makes official Svelte guidance the floor rather than the ceiling, so a change that
 * this repository's framework documentation recommends against needs more than an analogue to
 * justify it, and "the reference's reconciliation hint is spelled differently" is not more.
 *
 * NOT A DIVERGENCE. Recorded here rather than at either pane, because it is one answer for both and
 * a copy in each is how the two would drift.
 */
describe('DTP-04 / SWP-04 — the alert panes key by id, and the reference’s trackBy does not change that', () => {
  const pane = (file: string) => readFileSync(`src/lib/components/${file}`, 'utf8');

  it('both panes key on the row id', () => {
    for (const file of [
      'day-trade-alerts/DayTradeAlertsPane.svelte',
      'swing-alerts/SwingAlertsPane.svelte'
    ]) {
      expect(pane(file), `${file} lost its keyed each`).toContain(
        '{#each visibleAlerts as row (row.id)}'
      );
    }
  });

  it('and the rows they key are the SAME objects the source holds, which is what makes it matter', () => {
    /*
      The measurement the disposition rests on: if these helpers copied their rows, the two keys
      would differ on every render rather than only across a refetch, and the argument would be a
      different one. `filter` and `slice` return new arrays of the same references.
    */
    const helpers = readFileSync('src/lib/day-trade-alerts.ts', 'utf8');
    expect(helpers).toContain('rows.slice(0, limit)');
    expect(helpers).toContain('rows.filter(');
    expect(helpers, 'a copy here would change what the key means').not.toContain('...row');
  });
});
