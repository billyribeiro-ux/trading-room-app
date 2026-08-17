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
    unkeyedAt('src/lib/components/RoomMessage.svelte', 2);
    unkeyedAt('src/routes/+page.svelte', 1);
  });
});
