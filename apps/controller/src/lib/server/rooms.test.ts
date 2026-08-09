import { describe, expect, it } from 'vitest';
import { MANY_OPCODES, PERMISSION_KEYS, USER_OPCODES, readPermissions, setInviteStatus } from './rooms';

/**
 * These guard the two things in this codebase where a quiet mistake is expensive:
 * confusing the two opcode enums, and mis-reading a permissions blob.
 */

describe('opcode maps', () => {
  it('matches the reference updateUser map, with 12 absent', () => {
    expect(
      Object.keys(USER_OPCODES)
        .map(Number)
        .sort((a, b) => a - b)
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
    expect(USER_OPCODES[2]).toBe('make-participant'); // also bound to Unban
    expect(12 in USER_OPCODES).toBe(false);
  });

  it('keeps updateManyUsers a SEPARATE enum where 10 means remove-all', () => {
    // This is the trap: in updateUser, 10 hides personal data. Sharing a code path
    // between the two would turn "hide personal data" into "delete every selected user".
    expect(MANY_OPCODES[10]).toBe('remove-all');
    expect(USER_OPCODES[10]).toBe('hide-personal-data');
    expect(MANY_OPCODES[10]).not.toBe(USER_OPCODES[10]);
  });
});

describe('setInviteStatus', () => {
  /*
    The reference has exactly two call sites — the row's APPROVE button sends 'approved'
    and the row menu's "Pause / Pending" sends 'pending'. Its row template has no branch
    for anything else, so a third value would store a state nothing can render or undo.

    This reaches the guard without a database on purpose: the rejection happens before
    getDb() is called, which is itself the property worth pinning. If someone moves the
    validation below the query, this test starts failing by trying to open a connection.
  */
  it('refuses any status the reference cannot render', async () => {
    for (const bad of ['', 'APPROVED', 'approve', 'banned', 'null', 'undefined']) {
      await expect(setInviteStatus(1, 1, bad as 'approved' | 'pending')).rejects.toThrow(/unknown invite status/);
    }
  });
});

describe('readPermissions', () => {
  it('reads the five modal checkboxes', () => {
    expect(PERMISSION_KEYS).toEqual(['hasMic', 'hasScreen', 'hasCam', 'hasAdminChat', 'canEditNotes']);
  });

  it('grants only what is explicitly true', () => {
    const p = readPermissions(JSON.stringify({ hasMic: true, hasCam: 'yes', hasScreen: 1 }));
    expect(p.hasMic).toBe(true);
    expect(p.hasCam).toBe(false); // a truthy string is not a grant
    expect(p.hasScreen).toBe(false);
  });

  it('denies everything when the blob is corrupt, rather than guessing', () => {
    const p = readPermissions('{not json');
    expect(Object.values(p).every((v) => v === false)).toBe(true);
  });

  it('denies everything for an array or null payload', () => {
    expect(Object.values(readPermissions('[]')).every((v) => v === false)).toBe(true);
    expect(Object.values(readPermissions('null')).every((v) => v === false)).toBe(true);
  });

  it('always returns all five keys, whatever was stored', () => {
    expect(Object.keys(readPermissions('{}')).sort()).toEqual([...PERMISSION_KEYS].sort());
  });
});
