import { describe, expect, it } from 'vitest';
import { isArchivedRoom, selectVisibleRooms, type SessionRow } from '../routes/(app)/account/+page.svelte';

/**
 * The "Show / Hide Archived" toggle, driven rather than described.
 *
 * The reference filters every session row with `ng-hide="s.isArchivedRoom && !showArchivedRooms"`.
 * Ours carried that button once before with NOTHING behind it — `visibleRooms` read the search box
 * alone, so the only effect of pressing it was the word on its own face changing. That is the exact
 * defect these cases exist to keep out, so they call the real function the component's `$derived`
 * calls rather than asserting that the template mentions a variable.
 */

const archived = new Date('2026-08-01T00:00:00Z');

const rooms: SessionRow[] = [
  { name: 'Morning Call', shortCode: '3625', archivedAt: null },
  { name: 'Retired Room', shortCode: '999', archivedAt: archived },
  { name: 'Evening Call', shortCode: '3627', archivedAt: null }
];

/** The component's own defaults, so a case only states what it is actually varying. */
const base = { search: '', showArchived: false, sortKey: null, sortAscending: true } as const;

describe('whether a room counts as archived', () => {
  /*
    A third case lived here and has been deleted rather than left passing: it asserted that
    `new Date(0)` still reads as archived, on the theory that the epoch is falsy. It is not — a Date
    is an object and every object is truthy — so `!!room.archivedAt` and `room.archivedAt !== null`
    cannot disagree for this column's type, and the case could not fail for any implementation
    somebody would plausibly write. A control that cannot fire is decoration.
  */
  it('is the presence of the timestamp', () => {
    expect(isArchivedRoom({ archivedAt: null })).toBe(false);
    expect(isArchivedRoom({ archivedAt: archived })).toBe(true);
  });
});

describe('which sessions the table shows', () => {
  it('hides an archived room by default', () => {
    const shown = selectVisibleRooms(rooms, base);
    expect(shown.map((r) => r.name)).toEqual(['Morning Call', 'Evening Call']);
  });

  it('shows it once the toggle is on', () => {
    const shown = selectVisibleRooms(rooms, { ...base, showArchived: true });
    expect(shown.map((r) => r.name)).toEqual(['Morning Call', 'Retired Room', 'Evening Call']);
  });

  it('still applies the search box while the toggle is on', () => {
    const shown = selectVisibleRooms(rooms, { ...base, showArchived: true, search: 'call' });
    expect(shown.map((r) => r.name)).toEqual(['Morning Call', 'Evening Call']);
  });

  it('will not surface an archived room just because the search matches it', () => {
    expect(selectVisibleRooms(rooms, { ...base, search: 'retired' })).toEqual([]);
    expect(selectVisibleRooms(rooms, { ...base, showArchived: true, search: 'retired' })).toHaveLength(1);
  });

  it('matches the search case-insensitively, as the reference filter does', () => {
    expect(selectVisibleRooms(rooms, { ...base, search: 'MORNING' }).map((r) => r.name)).toEqual(['Morning Call']);
  });
});

describe('sorting, which the archived filter must not disturb', () => {
  it('orders session ids numerically, not lexically', () => {
    // A lexical sort puts '3625' before '999'; the column holds numbers rendered as text.
    const shown = selectVisibleRooms(rooms, { ...base, showArchived: true, sortKey: 'uuid' });
    expect(shown.map((r) => r.shortCode)).toEqual(['999', '3625', '3627']);
  });

  it('reverses on the second press of the same column', () => {
    const shown = selectVisibleRooms(rooms, {
      ...base,
      showArchived: true,
      sortKey: 'uuid',
      sortAscending: false
    });
    expect(shown.map((r) => r.shortCode)).toEqual(['3627', '3625', '999']);
  });

  it('sorts only what survived the filter', () => {
    const shown = selectVisibleRooms(rooms, { ...base, sortKey: 'name' });
    expect(shown.map((r) => r.name)).toEqual(['Evening Call', 'Morning Call']);
  });

  it('never reorders the array it was given — that is load data', () => {
    const source = [...rooms];
    selectVisibleRooms(source, { ...base, showArchived: true, sortKey: 'name' });
    expect(source.map((r) => r.name)).toEqual(['Morning Call', 'Retired Room', 'Evening Call']);
  });
});
