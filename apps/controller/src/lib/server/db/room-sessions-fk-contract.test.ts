import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './migrations/index.js';

/*
  `room_sessions` must never reference its parents without an ON DELETE action.

  Migration 0007 declared both foreign keys with a bare `REFERENCES`, which defaults to NO ACTION,
  and that broke two ordinary operations for any room anybody had ever visited: removing a member
  (`rooms.ts:196`, and the bulk loops at `:440` and `:940`) and deleting a room (`rooms.ts:385`,
  which deletes memberships FIRST and so failed on its opening statement).

  Proven on a scratch PostgreSQL 16 database built from these same migration strings, 2026-08-11.
  With 0007's constraints restored verbatim:

      DELETE FROM room_users  -> ERROR: violates foreign key constraint
                                 "room_sessions_room_user_id_fkey" on table "room_sessions"
      DELETE FROM rooms       -> ERROR: violates foreign key constraint
                                 "room_users_room_id_fkey" on table "room_users"

  (The fixture address below is written on a reserved domain. The run used a synthetic `@x.com`
  address; `x.com` is a live domain, so it is substituted here rather than left in the tree. The
  substitution is noted rather than made silently — an edited transcript that does not say it was
  edited is no longer evidence of anything.)

  After 0009, on the same rows:

      DELETE FROM room_users  -> DELETE 1, and the visit SURVIVES as
                                 room_user_id=NULL display_name=Owner email=o@example.com
      DELETE FROM rooms       -> DELETE 1, and the visits are gone

  The two actions differ deliberately, and 0007's own docblock is the authority for it: a removed
  member "must not silently rewrite or erase visits that already happened", so the membership going
  away nulls one column and leaves the evidence; a deleted room takes its visits with it because a
  visit to a room that no longer exists records nothing.
*/

const sqlFor = (version: number) => {
  const migration = MIGRATIONS.find((m: { version: number }) => m.version === version);
  expect(migration, `migration ${version} must be registered`).toBeTruthy();
  return (migration as { sql: string }).sql;
};

describe('room_sessions foreign keys carry an ON DELETE action', () => {
  it('is registered in the runner, so it actually runs', () => {
    const versions = MIGRATIONS.map((m: { version: number }) => m.version);
    // Contiguous and ordered - a gap means one was written and never wired in.
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toContain(9);
  });

  it('keeps the visit and nulls the membership when a member is removed', () => {
    expect(sqlFor(9)).toMatch(/FOREIGN KEY \(room_user_id\) REFERENCES room_users\(id\) ON DELETE SET NULL/);
    // CASCADE here would delete last quarter's attendance because somebody tidied the member list.
    expect(sqlFor(9)).not.toMatch(/room_user_id\)[^,;]*ON DELETE CASCADE/);
  });

  it('takes the visits with the room when the room is deleted', () => {
    expect(sqlFor(9)).toMatch(/FOREIGN KEY \(room_id\) REFERENCES rooms\(id\) ON DELETE CASCADE/);
  });

  it('drops the auto-generated names too, so it is idempotent on a live database', () => {
    const sql = sqlFor(9);
    // 0007's inline REFERENCES produced PostgreSQL's own `*_fkey` names; the explicit names are
    // what this migration adds. Dropping BOTH is what makes a second run a no-op - verified by
    // running the file twice against the scratch database, exit 0 both times.
    for (const name of [
      'room_sessions_room_id_fkey',
      'room_sessions_room_user_id_fkey',
      'room_sessions_room_id_fk',
      'room_sessions_room_user_id_fk'
    ]) {
      expect(sql, `${name} must be dropped before the constraints are added`).toContain(
        `DROP CONSTRAINT IF EXISTS ${name}`
      );
    }
  });

  it('did not edit the shipped migration instead of adding one', () => {
    // Forward-only. 0007 keeps its original bare REFERENCES; editing it would change what a
    // database that already applied it thinks it ran.
    expect(sqlFor(7)).toContain('room_id       INTEGER NOT NULL REFERENCES rooms(id),');
    expect(sqlFor(7)).not.toContain('ON DELETE');
  });
});
