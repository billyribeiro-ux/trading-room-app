import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ROOM_PERMISSION_KEYS } from './permission-keys.js';

/*
  THE FIVE KEYS MEAN THE SAME THING IN BOTH APPLICATIONS, and nothing else can check that.

  These names are JSON on the wire and JSON in the column. The room sends `granted: ['hasMic', …]`,
  the controller writes `roomUsers.permissionsJson`, and `internal/room-config` hands the result back
  on the next page load. TypeScript sees none of it: two independent `as const` arrays in two
  packages that never import each other.

  THE FAILURE IS SILENT AND IT REVOKES. `savePermissions` writes `false` for every key it does not
  receive, so a room-side rename to `hasMicrophone` would not throw anywhere — the controller would
  read "hasMic was not granted" and turn the microphone off. An owner ticking a box would clear it.

  So the controller's own declaration is READ, and the two lists are compared. Reading its source
  rather than importing it is deliberate: the packages are separate builds with separate tsconfigs,
  and an import here would either fail to resolve or quietly pull a stale copy.
*/

const ROOMS_TS = readFileSync('../controller/src/lib/server/rooms.ts', 'utf8');

/**
 * The controller's `PERMISSION_KEYS`, parsed from its declaration.
 *
 * Anchored on the exact `export const PERMISSION_KEYS = [` opener and cut at the first `]`, so a
 * renamed constant fails to parse and reports rather than silently matching something else. The
 * count guard below is what catches a parse that returns nothing.
 */
const controllerKeys = (): string[] => {
  const opener = 'export const PERMISSION_KEYS = [';
  const start = ROOMS_TS.indexOf(opener);
  if (start < 0) throw new Error('PERMISSION_KEYS is no longer declared where this test reads it');
  const body = ROOMS_TS.slice(start + opener.length, ROOMS_TS.indexOf(']', start));
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

describe('the permission keys agree across the seam', () => {
  it('found the controller declaration it is meant to compare against', () => {
    // At zero every assertion below is vacuous — the same guard the other catalog tests carry.
    expect(controllerKeys().length).toBeGreaterThan(0);
  });

  it('the room sends exactly the keys the controller stores, in the same order', () => {
    /*
      ORDER is asserted as well as membership, and not out of tidiness: both lists are also the
      order the checkboxes render in and the order the reference's own log line names them at bundle
      byte 2077194. A reader comparing the modal to the column should be able to read down.
    */
    expect([...ROOM_PERMISSION_KEYS]).toEqual(controllerKeys());
  });

  it('there are FIVE, which is what the capture names', () => {
    /*
      `saveCustomPerms` logs `Mic`, `Screen`, `Cam`, `adminChat`, `canEditNotes` — five, and no
      sixth. This is the guard against `temporaryAccessOnly` being quietly added to the payload: it
      is a checkbox in our modal with no column behind it and no captured behaviour, recorded in
      `TODO.md` as a gap rather than invented into a permission.
    */
    expect(ROOM_PERMISSION_KEYS).toHaveLength(5);
    expect(ROOM_PERMISSION_KEYS).not.toContain('temporaryAccessOnly');
  });
});
