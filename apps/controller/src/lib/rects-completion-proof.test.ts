import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The two derived tables behind the `rects-*.json` COMPLETION PROOF.
 *
 * ## Why this test exists
 *
 * `docs/reference/evidence-dumps-full-read.md` claims all 11 `rects-*.json` captures were read, and
 * backs it with a deduplication argument: every distinct element identity, every distinct
 * (property,value) pair, and every distinct (tag+class -> style) binding was read, in two tables.
 *
 * Those tables lived in `/tmp` until 2026-08-13. A proof whose evidence is one reboot from
 * disappearing is an assertion, and an assertion about unread evidence is precisely what PR #12 was
 * opened to revert — closed unmerged on 2026-08-12 with "reading the 41 files instead of reverting
 * them, which is the better resolution of the same rule". This is the other half of keeping that
 * bargain: the reading is recorded AND it stays checkable.
 *
 * ## What is asserted, and what deliberately is not
 *
 * The digests pin the tables byte for byte — no header was added to either file precisely so these
 * stay meaningful. The counts pin the arithmetic the prose depends on. What is NOT asserted is that
 * the dedup argument covers document STRUCTURE: it does not, and the doc says so. Element order and
 * nesting collapse under the keys used, so where structure matters the source templates are the
 * evidence, not these tables.
 */

const ROOT = `${process.cwd()}/../..`;
const VOCAB = `${ROOT}/docs/reference/rects-vocab.txt`;
const DELTAS = `${ROOT}/docs/reference/rects-deltas.txt`;
const DOC = `${ROOT}/docs/reference/evidence-dumps-full-read.md`;

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const lines = (path: string) => readFileSync(path, 'utf8').replace(/\n$/, '').split('\n');

describe('the completion-proof tables are in the repository, not /tmp', () => {
  it('both files exist and are readable', () => {
    expect(() => readFileSync(VOCAB)).not.toThrow();
    expect(() => readFileSync(DELTAS)).not.toThrow();
  });

  it('are byte-for-byte what the proof was written against', () => {
    /* Recorded 2026-08-13 when they were committed. A header added to either file would change these
       and fail here, which is why neither carries one. */
    expect(sha256(VOCAB)).toBe('6a241dcaa97cb43faec4d09c8d6ec0a07579543323abf9cc74247c98af601ef9');
    expect(sha256(DELTAS)).toBe('87364da55726618420c8764b2eeb4e44fcf1d820da1af81f53b231abedfe3859');
  });

  it('the vocabulary table is the 69 property lines the proof cites', () => {
    expect(lines(VOCAB).length).toBe(69);
  });

  it('the delta table reconciles: 4 header lines + 182 bindings x 2 = 368', () => {
    /*
      The arithmetic the prose rests on. `182 bindings` is not a number anyone can eyeball off a
      368-line file, so it is computed here rather than trusted.
    */
    const d = lines(DELTAS);
    expect(d.length).toBe(368);
    expect((d.length - 4) / 2).toBe(182);
    expect(d[0]).toContain('PAGE DEFAULT');
    expect(d[3]).toContain('PER tag+class');
  });

  it('every vocabulary line states a property and a count of distinct values', () => {
    /* Shape check, so a truncated or reformatted file fails loudly rather than silently satisfying
       a line count. */
    for (const line of lines(VOCAB)) {
      expect(line, line.slice(0, 60)).toMatch(/^[a-z-]+ {2}\(\d+\) {2}-> {2}\S/);
    }
  });

  it('the doc cites the repository paths, never /tmp again', () => {
    const doc = readFileSync(DOC, 'utf8');
    expect(doc).not.toContain('/tmp/rects');
    expect(doc).toContain('docs/reference/rects-vocab.txt');
    expect(doc).toContain('docs/reference/rects-deltas.txt');
  });

  it('the doc still states the limits of the dedup argument', () => {
    /*
      The honest caveat is load-bearing: somebody will otherwise cite this proof for element ORDER,
      which the keys collapse. If the caveat is ever edited out, this fails.
    */
    const doc = readFileSync(DOC, 'utf8');
    expect(doc).toContain('DEDUPLICATION argument');
    expect(doc).toMatch(/Element ORDER/);
  });
});
