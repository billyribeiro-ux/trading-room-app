import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  A BLOCK COMMENT MUST STILL HAVE THE CODE IT EXPLAINS.

  ## The defect this closes

  Phase 5 slice 3 moved forty preference declarations into `RoomPrefs` and left four of their
  docblocks behind on `+page.svelte`. The prose was not deleted and not duplicated — it was
  SEPARATED from the code it describes, and came to rest above an unrelated declaration, where it
  reads as an explanation of something it has nothing to do with.

  One of them is the twelve-line note on `alwaysScrollToBottom` explaining why the comparison is
  `=== true` and not `!== false` — that the preferences blob ships the flag OFF, so seeding it on
  would drag a reader out of the history they are scrolled up into. `RoomPrefs` holds the field and
  the comparison; it did not hold the reason until slice 27.

  ## Why the existing gate could not see it

  `comment-safety-contract` asks: do block-comment lines REMOVED from the page reappear in the
  slice's new module? Comments that were never removed pass it trivially. The failure mode is the
  exact inverse of the one that gate was written for, and it is invisible to a diff too — nothing
  changed on those lines.

  ## What this asserts

  Two block comments in a row, at the top level of the script or of a class body, with nothing
  between them. That is the orphan signature: a docblock that lost its declaration ends up
  immediately above the next docblock, because the statement that used to separate them has gone.

  ## The MODULES are policed too, and that was the second half of the same lesson

  As first written this read `+page.svelte` alone, on the reasoning that the page is where the
  extraction removes things. That was half the mechanism and it went red within one slice of being
  written: slice 27's generator copied every block comment that PRECEDED an extracted declaration,
  which swept up six that belonged to declarations staying behind, and deposited them in
  `gates.svelte.ts` stacked on top of one another. The prose travelled to a file that had nothing
  to do with it — the mirror image of leaving it behind, and equally invisible to a diff, because
  every one of those lines is an addition to a new file.

  Reading the destinations found four more that predate slice 27 and had simply never been looked
  for: the SSE channel's own docblock adrift from `subscribe()` in `events.svelte.ts`, the local
  screen tab's from `#addLocalScreen`, `closePanel()`'s from `close()`, and the download note's
  from `downloadRecording()`. Four modules, four slices, one shape.

  The modules are DISCOVERED rather than listed, for the reason `source-size-contract.test.ts`
  gives at its own catalog: a hand-kept list is the failure this file exists to prevent.

  ## Two deliberate narrowings, stated rather than implied

  JSDoc only — `/**`, not a plain `/*`. A plain block comment is how this codebase writes a SLICE
  CITATION and a GROUP HEADER, and both legitimately sit above another comment: `composer` has a
  construction note above a type note, and `media.svelte.ts` introduces its four recording
  transitions with a header whose first member carries its own docblock. Counting those would make
  this fail on correct code, and a gate that cries wolf gets suppressed.

  A file's FIRST block comment is exempt, because a module header introduces the file rather than a
  declaration and is followed by the first declaration's own docblock as a matter of course —
  `arrivals.ts` and `feed-scroll.ts` both have exactly that shape and both are correct.

  What that costs is stated too: a comment that lost its code and happens to sit above a plain
  statement is not caught here. Saying so is better than implying a completeness this cannot have.
  All ten found so far had the shape above, and it is the shape an extraction produces.
*/

const ROOM_MODULES = readdirSync('src/lib/room')
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => `src/lib/room/${name}`);

const POLICED = ['src/routes/+page.svelte', ...ROOM_MODULES];

/**
 * Block comments at the top level of a script or a class body, in order, as `[startLine, endLine]`.
 *
 * The OPEN is indent-filtered and the CLOSE is not, deliberately: a JSDoc inside a class opens at
 * two spaces and continues at three, so filtering the close on indent would never find it and every
 * comment after the first would be swallowed into one enormous block. That is not hypothetical —
 * the first draft of the module sweep did it and reported a block spanning 230 lines.
 */
const blockComments = (source: string): [number, number][] => {
  const lines = source.split('\n');
  const scriptEnd = lines.findIndex((l) => l.trim() === '</script>');
  const end = scriptEnd < 0 ? lines.length : scriptEnd;
  const found: [number, number][] = [];
  let open: number | null = null;
  for (let i = 0; i < end; i++) {
    const trimmed = lines[i].trim();
    if (open === null) {
      // Zero or two spaces: a script's own top level, or a class body's — never inside a function.
      const topLevel = /^ {0,2}\S/.test(lines[i]);
      if (topLevel && trimmed.startsWith('/**') && !trimmed.endsWith('*/')) open = i;
      continue;
    }
    if (trimmed.endsWith('*/')) {
      found.push([open, i]);
      open = null;
    }
  }
  return found;
};

/**
 * Is this the FILE HEADER — a block comment with no declaration above it?
 *
 * Import statements do not count, and they are tracked across lines rather than matched per line:
 * this codebase's import lists routinely span six lines, and a per-line `startsWith('import')` test
 * would read `  rosterBlockVisible,` as code and call every module header a declaration's docblock.
 */
const isHeader = (lines: string[], start: number): boolean => {
  let inImport = false;
  for (const line of lines.slice(0, start)) {
    const text = line.trim();
    if (inImport) {
      if (text.endsWith(';')) inImport = false;
      continue;
    }
    if (text === '') continue;
    if (text.startsWith('import')) {
      if (!text.endsWith(';')) inImport = true;
      continue;
    }
    return false;
  }
  return true;
};

/** The pairs with nothing but blank lines between them, as reportable strings. */
const orphansIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const comments = blockComments(source);
  const found: string[] = [];

  for (let i = 0; i < comments.length - 1; i++) {
    const [start, end] = comments[i];
    // The file header introduces the file, not a declaration. See the narrowing note above.
    if (i === 0 && isHeader(lines, start)) continue;
    const [nextStart] = comments[i + 1];
    const between = lines.slice(end + 1, nextStart).filter((l) => l.trim() !== '');
    if (between.length === 0) {
      found.push(`${file}:${end + 2} — "${lines[start + 1]?.trim().slice(0, 60)}…"`);
    }
  }
  return found;
};

describe('no block comment has lost the code it explains', () => {
  it('finds the files and the comments it is meant to police', () => {
    /* At zero, every assertion below is vacuous — the same guard the reader catalog carries. */
    expect(ROOM_MODULES.length).toBeGreaterThan(20);
    expect(blockComments(readFileSync('src/routes/+page.svelte', 'utf8')).length).toBeGreaterThan(
      10
    );
  });

  it.each(POLICED)('%s has no block comment immediately followed by another', (file) => {
    const orphans = orphansIn(file);
    expect(
      orphans,
      `these block comments are immediately followed by another, which means the declaration between them has moved and its prose did not:\n  ${orphans.join('\n  ')}\n\nMove each one to the code that now owns its subject — which may be in another file, or may be further down this one. The comments are the asset; a comment separated from its code explains the wrong thing.`
    ).toEqual([]);
  });
});
