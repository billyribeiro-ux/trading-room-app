import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The four assertions that pin the note Version History panel's SOURCE, split out on 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `note-version-history.test.ts` holds seventeen cases and its header states the design plainly:
 * *"This file pins BOTH halves… what the capture actually contains, so a future reader can see the
 * markup was transcribed rather than invented, and what we render, so it cannot drift away from
 * it."* Thirteen of those cases are the second half — `noteVersionPreview`, `noteVersionDate`, the
 * revert sentence, and six that `render(NoteEditor)` and read the emitted HTML. Four are the first.
 *
 * All seventeen were excluded from every checkout without the dumps, this container and CI included,
 * because `docs/source/components/app-note.full.js` was read at MODULE SCOPE. Splitting the file on
 * the halves it already named is what lets thirteen of them run.
 *
 * ## What is here
 *
 * The whole `what the capture actually contains` block, moved intact: the toggle `C0e`, the panel
 * `w0e`, one row `S0e`, their `consts` entries, the two `O(…)` gates, and the preview algorithm and
 * revert sentence stated verbatim — which is what the thirteen free cases execute.
 */

const REFERENCE = readFileSync(
  new URL('../../docs/source/components/app-note.full.js', import.meta.url),
  'utf8'
);

describe('what the capture actually contains', () => {
  it('builds the toggle from consts 16 and 17, labelled with the count', () => {
    expect(REFERENCE).toContain("[1, 'btn', 'btn-warning', 'text-center', 'm-1', 3, 'click']");
    expect(REFERENCE).toContain("[1, 'fas', 'fa-history']");
    expect(REFERENCE).toContain("Ne(' Version History (', e.prevVersions.length, ') ')");
    expect(REFERENCE).toContain("Et('active', e.showVersionHistory)");
  });

  it('builds the panel and one row from consts 13 and 18-25', () => {
    expect(REFERENCE).toContain("[1, 'version-history-panel', 'card', 'mt-2', 'mb-2']");
    expect(REFERENCE).toContain("[1, 'card-header']");
    expect(REFERENCE).toContain("[1, 'list-group', 'list-group-flush']");
    expect(REFERENCE).toContain(
      "[1, 'list-group-item', 'd-flex', 'justify-content-between', 'align-items-center']"
    );
    expect(REFERENCE).toContain("[1, 'badge', 'bg-secondary', 'text-light']");
    expect(REFERENCE).toContain("[1, 'version-preview', 3, 'innerHTML']");
    expect(REFERENCE).toContain("[1, 'btn', 'btn-sm', 'btn-outline-primary', 3, 'click']");
    expect(REFERENCE).toContain("[1, 'fas', 'fa-undo']");
    expect(REFERENCE).toContain("v(4, ' Previous Versions')");
  });

  it('gates the toggle on there being history at all, not on a disabled state', () => {
    expect(REFERENCE).toContain('O(11, e.prevVersions.length > 0 ? 11 : -1)');
    expect(REFERENCE).toContain('O(15, e.showVersionHistory ? 15 : -1)');
  });

  it('states the preview algorithm and the revert sentence verbatim', () => {
    expect(REFERENCE).toContain(".replace(/<[^>]*>/g, ' ')");
    expect(REFERENCE).toContain(".replace(/\\s+/g, ' ')");
    expect(REFERENCE).toContain("return i.length > 100 ? i.substring(0, 100) + '...' : i;");
    // Single-quoted on purpose: the reference builds this with a template literal, so the
    // interpolation is part of the text being matched rather than something to evaluate here.
    expect(REFERENCE).toContain(
      'Are you sure you want to revert to the version from ${e.date}? Your current content will be replaced.'
    );
  });
});
