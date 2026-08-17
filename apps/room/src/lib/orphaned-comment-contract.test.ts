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

  ## The JSDoc-only narrowing was too wide, and four orphans lived in the gap (2026-08-17)

  It cost exactly what the paragraph above predicted it might, and within the region the next slice
  was about to touch. Reading `+page.svelte` around its remaining `$effect`s turned up FOUR plain
  `/*` blocks separated from their code, none of them visible to anything in this repository:

  * `THE ALERTS PANE's own actions, in #lib/room/alerts-pane.ts` sat 59 lines and three unrelated
    comments above `new RoomAlertsPane(…)`.
  * `SCROLL-FOLLOW and PAGING for all three feeds, in #lib/room/feed-scroll.ts` sat 50 lines above
    `new RoomFeedScroll(…)`.
  * `── Older chat history ──` had NO code left under it at all. Its subject — the newest page from
    the load plus older pages held in client state — moved to the server; the reasoning survives at
    `+page.server.ts:462-476` and `chat-paging-contract.test.ts:193-198`.
  * `The SECOND chat column, following its own messages` had come to rest directly on top of the
    ALERT-ARRIVAL effect, which it describes not at all. It was a stale duplicate: the scroll-follow
    effect it belongs to moved on 2026-08-16 and took a better-worded copy of the same reasoning
    with it, now `ExtraChatPane.svelte:220-250`.

  The last one is the sharpest argument for this gate. Two correct things — a comment and an effect
  — read as one wrong thing purely because of what sits between them, and `svelte-check`, `eslint`,
  the autofixer and 2,402 tests all stayed green while a comment about chat scrolling introduced the
  alert filter.

  ## So the narrowing is REPLACED rather than widened

  Policing every plain `/*` would reintroduce the false positives the paragraph above rejects. What
  changed instead is that a plain block is policed WHEN IT CITES A MODULE — when its body names a
  `#lib/room/…` path. That is this codebase's slice-citation form, used 31 times in `+page.svelte`
  alone, and it always means "the subject named here now lives there", which is only true of the
  code immediately below it. A GROUP HEADER, the case the narrowing was written to protect, does not
  cite a module — checked against both examples named above before this was written, and neither
  carries a citation.

  A citation comment is therefore held to the same rule as a JSDoc: it must be followed by code, not
  by another comment. The group-header exemption survives intact for the comments that earned it.
*/

const ROOM_MODULES = readdirSync('src/lib/room')
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => `src/lib/room/${name}`);

const POLICED = ['src/routes/+page.svelte', ...ROOM_MODULES];

/**
 * The slice-citation form: `<subject>, in `#lib/room/<module>``.
 *
 * Matched on the PATH rather than on the word "in", because the sentence around it varies —
 * "Every preference this viewer owns, in …", "ONE class, two instances", "next to each other, so
 * nobody merges them". The path is the invariant, and it is what makes the claim checkable.
 */
const CITES_MODULE = /#lib\/room\/[\w-]+(?:\.svelte)?\.(?:ts|js)/;

interface Block {
  readonly start: number;
  readonly end: number;
  /** `/**` opens a docblock; a plain `/*` is a citation or a group header. */
  readonly jsdoc: boolean;
}

/**
 * Block comments at the top level of a script or a class body, in order.
 *
 * The OPEN is indent-filtered and the CLOSE is not, deliberately: a JSDoc inside a class opens at
 * two spaces and continues at three, so filtering the close on indent would never find it and every
 * comment after the first would be swallowed into one enormous block. That is not hypothetical —
 * the first draft of the module sweep did it and reported a block spanning 230 lines.
 *
 * BOTH comment forms are collected as of 2026-08-17; which of them is policed is decided in
 * `orphansIn`, because the answer depends on the body and this only knows the delimiters.
 */
const blockComments = (source: string): Block[] => {
  const lines = source.split('\n');
  const scriptEnd = lines.findIndex((l) => l.trim() === '</script>');
  const end = scriptEnd < 0 ? lines.length : scriptEnd;
  const found: Block[] = [];
  let open: number | null = null;
  let jsdoc = false;
  for (let i = 0; i < end; i++) {
    const trimmed = lines[i].trim();
    if (open === null) {
      // Zero or two spaces: a script's own top level, or a class body's — never inside a function.
      const topLevel = /^ {0,2}\S/.test(lines[i]);
      if (topLevel && trimmed.startsWith('/*') && !trimmed.endsWith('*/')) {
        open = i;
        jsdoc = trimmed.startsWith('/**');
      }
      continue;
    }
    if (trimmed.endsWith('*/')) {
      found.push({ start: open, end: i, jsdoc });
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

/** The text of a block, for asking whether it cites a module. */
const bodyOf = (lines: string[], block: Block): string =>
  lines.slice(block.start, block.end + 1).join('\n');

/**
 * Is this block held to the rule?
 *
 * A JSDoc always is. A plain `/*` is only when it CITES A MODULE — see the 2026-08-17 note above for
 * why the line is drawn there and not around every plain block.
 */
const isPoliced = (lines: string[], block: Block): boolean =>
  block.jsdoc || CITES_MODULE.test(bodyOf(lines, block));

/**
 * The policed blocks with no CODE before the next policed block, as reportable strings.
 *
 * ## Why "the next POLICED block" and not "the next block"
 *
 * Because two comments on ONE declaration are legitimate and common here, and they are structurally
 * identical to an orphan pair. `files.svelte.ts:239-257` is the case: a JSDoc explaining why empty
 * rows are kept, then a plain block explaining what the search matches, then the `searchedFiles()`
 * they both describe. Nothing is adrift.
 *
 * The first draft of the plain-block half paired every block with its immediate successor and
 * reported that as an orphan, along with two others of the same shape — a REGRESSION introduced by
 * this file's own change, in the same session it was written to catch other people's. It is noted
 * here rather than quietly fixed because the shape recurs: widening what a scanner collects silently
 * changes what it PAIRS, and the pairing is where the meaning lives.
 *
 * So a non-policed comment counts as neither a boundary nor as code: the search steps over it and
 * keeps looking for the declaration.
 */
const orphansIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const comments = blockComments(source);
  const found: string[] = [];

  /* Every line inside ANY collected block, so prose is never mistaken for the declaration. */
  const commentLine = new Set<number>();
  for (const block of comments) {
    for (let i = block.start; i <= block.end; i++) commentLine.add(i);
  }

  const policed = comments.filter((block, i) => {
    // The file header introduces the file, not a declaration. See the narrowing note above.
    if (i === 0 && isHeader(lines, block.start)) return false;
    return isPoliced(lines, block);
  });

  for (let i = 0; i < policed.length - 1; i++) {
    const block = policed[i];
    let code = false;
    for (let at = block.end + 1; at < policed[i + 1].start; at++) {
      if (lines[at].trim() !== '' && !commentLine.has(at)) {
        code = true;
        break;
      }
    }
    if (!code) {
      found.push(`${file}:${block.end + 2} — "${lines[block.start + 1]?.trim().slice(0, 60)}…"`);
    }
  }
  return found;
};

describe('no block comment has lost the code it explains', () => {
  it('finds the files and the comments it is meant to police', () => {
    /* At zero, every assertion below is vacuous — the same guard the reader catalog carries. */
    expect(ROOM_MODULES.length).toBeGreaterThan(20);

    const pageLines = readFileSync('src/routes/+page.svelte', 'utf8').split('\n');
    const pageBlocks = blockComments(pageLines.join('\n'));
    expect(pageBlocks.filter((block) => block.jsdoc).length).toBeGreaterThan(10);

    /*
      THE CITATION HALF NEEDS ITS OWN GUARD, and this is the whole reason it is a separate
      assertion. `CITES_MODULE` is a regex over prose; a typo in it matches nothing, every plain
      block silently stops being policed, and the sweep below goes green by covering less. That is
      the identical failure this file was written about, one level up. 31 citation blocks were
      counted in the page on 2026-08-17 by reading them; the floor is set below that so ordinary
      extraction can move them without a false alarm, and a collapse to zero cannot hide.
    */
    /*
      COUNTED ACROSS THE WHOLE POLICED SET, not just the page — corrected 2026-08-17 when S7 moved
      the 36 `new Room*()` constructions into `create-room.svelte.ts` and took their citations with
      them. The page fell from 31 citation blocks to 2 and this guard went red.

      That was the gate reporting a real change, and the wrong fix would have been to lower the
      floor until it passed. The citations did not vanish; they MOVED to a file this same test
      already polices. So the floor now counts where they actually are.
    */
    const cited = POLICED.flatMap((file) => {
      const lines = readFileSync(file, 'utf8').split('\n');
      return blockComments(lines.join('\n')).filter(
        (block) => !block.jsdoc && isPoliced(lines, block)
      );
    });
    expect(
      cited.length,
      'CITES_MODULE matched nothing across the policed files — the plain-block half is inert'
    ).toBeGreaterThan(20);
  });

  it.each(POLICED)('%s has no block comment immediately followed by another', (file) => {
    const orphans = orphansIn(file);
    expect(
      orphans,
      `these block comments are immediately followed by another, which means the declaration between them has moved and its prose did not:\n  ${orphans.join('\n  ')}\n\nMove each one to the code that now owns its subject — which may be in another file, or may be further down this one. The comments are the asset; a comment separated from its code explains the wrong thing.`
    ).toEqual([]);
  });
});
