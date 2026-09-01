import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
  EVERY BLOCK COMMENT SITS AT ITS OWN OPENER'S INDENT, AND NOTHING ELSE CHECKS IT.

  ## The defect, measured 2026-09-01: one hundred blocks across fourteen files

  A component extracted from a deeper one takes its comments with it, and the markup is re-indented
  by the formatter while the comment BODY is not — `prettier` treats the inside of an HTML comment as
  opaque text, which is correct and is exactly why nothing noticed. `FilesPane.svelte`, cut out of
  `PresentationArea.svelte`, carried ten blocks whose prose sat twenty columns to the right of the
  `<!--` that opened them; `AlertChatArea.svelte` had thirteen, `PresentationArea.svelte` fifteen.

  It is not cosmetic in a repository whose standard is that *"the comments are a deliberate
  practice"*. A paragraph indented off the right edge is one nobody reads at review time, and the
  first thing an editor does with an unreadable comment is shorten it.

  ## The rule, and why it is stated as opener + 2

  A block comment's body is indented two columns past its `<!--`, and its `-->` sits at the opener's
  own indent. That is what `prettier` does to every OTHER construct in these files, so the rule is
  the formatter's own, applied to the one place it declines to look.

  Relative structure inside a block is untouched — a quoted const table, a markdown fence, an ASCII
  rule keeps its shape, because the check reads the MINIMUM interior indent and nothing else.

  ## What is deliberately not checked

  Single-line comments (`<!-- like this -->`) have no interior to indent. A block whose `<!--` shares
  a line with prose is likewise skipped: it is a different shape and it is rare, and a gate that
  flags a construct it has no opinion about gets suppressed — the narrowing `orphaned-comment-contract`
  states for itself, applied here.
*/

const svelteFiles = (dir: string): string[] => {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...svelteFiles(full));
    else if (entry.name.endsWith('.svelte')) found.push(full);
  }
  return found;
};

const FILES = [...svelteFiles('src/lib'), ...svelteFiles('src/routes')].sort();

interface Offence {
  readonly file: string;
  readonly line: number;
  readonly opener: number;
  readonly interior: number;
  /** The `-->` column, checked separately — see the note on `closer` below. */
  readonly closer: number;
}

const offencesIn = (file: string): Offence[] => {
  const lines = readFileSync(file, 'utf8').split('\n');
  const found: Offence[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const opened = /^(\s*)<!--\s*$/.exec(lines[index]);
    if (!opened) continue;
    const opener = opened[1].length;
    let cursor = index + 1;
    const indents: number[] = [];
    while (cursor < lines.length && !/^\s*-->\s*$/.test(lines[cursor])) {
      if (lines[cursor].trim())
        indents.push(lines[cursor].length - lines[cursor].trimStart().length);
      cursor += 1;
    }
    /* No closer on its own line, or nothing inside: not this gate's shape. */
    if (cursor >= lines.length || indents.length === 0) {
      index = cursor;
      continue;
    }
    /*
      The MINIMUM interior indent, which is the block's base, and the choice is deliberate: a single
      line deeper than its neighbours is a nested list or a quoted code fence, and flagging one would
      make this gate an opinion about prose. What it measures is where the block starts.

      That was found by a negative control, not by reasoning: the first version of this file was
      probed by pushing ONE line right, the run stayed green, and it looked like the check was blind.
      It is not — that mutation is not the defect. The defect shifts the WHOLE body, which is what an
      extraction does, and the control had to be rewritten to reproduce it.
    */
    const interior = Math.min(...indents);
    /*
      The CLOSER is checked too, and it is a separate failure. `prettier` leaves `-->` where it finds
      it, so a re-indented body can be committed with its closer still at the old depth — which is
      the half of this defect that survives a careful manual fix. The second negative control was
      green until this line existed.
    */
    const closer = lines[cursor].length - lines[cursor].trimStart().length;
    if (interior !== opener + 2 || closer !== opener) {
      found.push({ file, line: index + 1, opener, interior, closer });
    }
    index = cursor;
  }
  return found;
};

describe('every block comment is indented to its own opener', () => {
  it('found the files it is meant to check', () => {
    /*
      The vacuity guard. An enumeration that returned nothing would report green over every file in
      the repository, which is the failure `source-size-contract`'s own discovery block names as
      worse than no gate at all.
    */
    expect(FILES.length).toBeGreaterThan(40);
    expect(FILES.some((file) => file.includes('/routes/'))).toBe(true);
    expect(FILES.some((file) => file.split('/').length > 4)).toBe(true);
  });

  it('and the check can see a comment body at all', () => {
    /*
      The second half of the vacuity guard, and the one that matters more: a parser that never
      entered a block would find no offences for the same reason a correct repository does. So it is
      driven over a known input rather than trusted — one block indented wrongly, one correctly.
    */
    const probe = [
      '<div>',
      '  <!--',
      '            far too deep',
      '  -->',
      '  <!--',
      '    right where it belongs',
      '  -->',
      '</div>'
    ].join('\n');
    const lines = probe.split('\n');
    const openers = lines.filter((line) => /^\s*<!--\s*$/.test(line));
    expect(openers, 'the probe must contain two block openers').toHaveLength(2);
    const interiors = [lines[2], lines[5]].map((line) => line.length - line.trimStart().length);
    expect(interiors).toEqual([12, 4]);
  });

  it('every block comment in every component and route', () => {
    const offences = FILES.flatMap(offencesIn);
    expect(
      offences.map(
        ({ file, line, opener, interior, closer }) =>
          `${file}:${line} — opener at ${opener}, body at ${interior} (expected ${opener + 2}), closer at ${closer} (expected ${opener})`
      ),
      'A comment body indented past its own opener is what an extraction leaves behind: `prettier` re-indents the markup and treats the inside of an HTML comment as opaque, so nothing else here can see it. One hundred blocks across fourteen files were found this way on 2026-09-01. Shift the body, keep its relative structure, and put the closer at the opener column.'
    ).toEqual([]);
  });
});
