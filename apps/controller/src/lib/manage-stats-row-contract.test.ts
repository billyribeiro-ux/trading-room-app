import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The User Stats table's row, against `page.manageSession.html:739-754`.
 *
 * ## Why this reads the SOURCE rather than a render
 *
 * `visibleStats` is derived from client state — the search box, four checkboxes and a Reverse
 * toggle — and SSR renders it with all of them at their defaults. The two things this guards are a
 * date FORMAT and an index BASE, both of which a default-state render would show correctly even if
 * the wrong helper were called on a different branch. The source is where the choice actually lives.
 *
 * ## The two defects it pins
 *
 * 1. **`toLocaleString()`** rendered the VISITOR's locale. An owner in London saw `07/08/2026, 17:05`
 *    for the same instant — day and month swapped, no meridiem. `last-login-format.ts` exists
 *    entirely to fix that, and this table sat two tabs away from the fix still doing it. The
 *    reference's format is `date:'MM/dd/yyyy @ h:mma'`, which is what `formatLastLogin` implements.
 *
 * 2. **The index was 1-based.** `{{$index}}` in ngRepeat is zero-based, and our own user row already
 *    renders it that way, so the stats table numbered from 1 while the user table numbered from 0.
 */

const RAW = readFileSync(new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url), 'utf8');

/**
 * The component source with COMMENTS REMOVED.
 *
 * The ban below is on the CALL, not on naming it. The comments explaining why `toLocaleString` is
 * forbidden necessarily contain the word, and the first version of this test went red on its own
 * documentation — which is a real failure mode, not a nuisance: a test that cannot distinguish code
 * from prose either blocks the explanation or gets loosened until it stops catching anything.
 *
 * HTML comments and JS block/line comments both, because this file carries all three.
 */
const SOURCE = RAW.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|\s)\/\/[^\n]*/g, '$1');

describe('dates on the manage page never render in the reader’s locale', () => {
  it('calls toLocaleString NOWHERE — not on any tab, not in any modal', () => {
    /*
      Deliberately a whole-file assertion rather than a per-site one. There were THREE calls: the
      stats row, the App PIN expiry and the push-token list. Pinning only the one that had reference
      evidence would have left the other two, which is how this survived the first fix.
    */
    expect(SOURCE).not.toContain('toLocaleString');
    expect(SOURCE).not.toContain('toLocaleDateString');
    expect(SOURCE).not.toContain('toLocaleTimeString');
  });

  it('routes BOTH stats timestamps through formatLastLogin', () => {
    /* The row is now one per ARRIVAL, so there are two stamps rather than one: In and Out. */
    expect(SOURCE).toContain('formatLastLogin(row.joinedAt)');
    expect(SOURCE).toContain('formatLastLogin(row.leftAt)');
  });

  it('routes the App PIN expiry and the token list through it too', () => {
    /* Format INHERITED from this page's other stamps, not captured — the reference shows both inside
       a bootbox whose format is in no capture we hold. The reason is not inherited: a locale-rendered
       date is wrong for a reader abroad wherever it appears. */
    expect(SOURCE).toContain('formatLastLogin(String(form.pairCodeExpiresAt))');
    expect(SOURCE).toContain('formatLastLogin(t.addedAt)');
  });
});

describe('the stats row index is zero-based, as ngRepeat’s $index is', () => {
  it('renders the raw index, not index + 1', () => {
    expect(RAW).toContain('{#each visibleStats as row, i (row.id)}');
    /* `<tr hidden={…}>` since T5-12 — the online filter hides rather than removes. */
    expect(SOURCE).toMatch(/\{#each visibleStats as row, i \(row\.id\)\}\s*<tr hidden=\{[^}]*\}>\s*<td>\{i\}<\/td>/);
  });

  it('does not reintroduce the 1-based form', () => {
    /* The exact shape of the defect. */
    expect(SOURCE).not.toContain('<td>{i + 1}</td>');
  });

  it('agrees with the user table, which was already zero-based', () => {
    /* Two tables, one convention. The reference numbers both from 0. */
    expect(SOURCE).toContain('<td>{i}</td>');
  });
});
