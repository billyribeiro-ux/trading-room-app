import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `RSG-01` … `RSG-04` — `app-room-roster`, audited 2026-08-31 against the pinned v4 bundle.
 *
 * ## What the audit found, and it was not a missing feature
 *
 * All 24 of the component's consts were decoded by value and compared against `RoomSidebar.svelte`.
 * Twenty are present. The four that are not — `new-badge`, `stars-container`, `stars-icon` and
 * `stars-num` — are `RS-03` and `RS-04` in the register, both BLOCKED on a server-side supply that
 * does not exist (`e.data.years` and `e.isNew` are populated by nothing, anywhere), and both
 * correctly reported as such. So the behaviour is complete to the limit of the evidence.
 *
 * **What was wrong was the EVIDENCE POINTERS, in three ways, and all three are the shape that
 * survives a review**: the sentence is true, the quoted code is right, and only the label beside it
 * is wrong — so a reader who checks finds the claim correct and moves on. `SHL-06` and two in
 * `screen-volume.ts` were the same error in the same week.
 *
 * This file is what makes those pointers falsifiable. A citation cannot be type-checked, linted or
 * rendered; a byte offset in a comment is exactly as unverified as prose unless something reads both
 * ends, which is how the four below rotted unnoticed.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');
const GATES = readFileSync('src/lib/roster-gates.ts', 'utf8');
const SIDEBAR = readFileSync('src/lib/components/RoomSidebar.svelte', 'utf8');
const LOAD = readFileSync('src/routes/+page.server.ts', 'utf8');

const cited = (offset: number, length: number) => BUNDLE.slice(offset, offset + length);

describe('the evidence this file measures is loaded', () => {
  it('reads the bundle at the pinned size, so an offset means something', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });
});

describe('RSG-01 — the row gate is in `E2e`, not `C2e`', () => {
  it('E2e holds the four-term visibility expression', () => {
    expect(cited(2_035_701, 13)).toBe('function E2e(');
    expect(cited(2_035_701, 400)).toContain(
      'i.appService.globals.sessData.onlyPresentersVisibleToViewers&&(e.isP||e.hasAdminChat)'
    );
  });

  it('and `C2e` is the Private Chat dropdown item, which is why the slip was invisible', () => {
    /*
      It is a real template in the same component, so a reader checking "is there a `C2e`?" found one
      and stopped. Asserting what it ACTUALLY is, rather than only that the new name is right, is
      what stops the citation drifting back.
    */
    expect(cited(2_033_494, 13)).toBe('function C2e(');
    expect(cited(2_033_494, 160)).toContain('startPC(o)');
    expect(cited(2_033_494, 160)).not.toContain('onlyPresentersVisibleToViewers');
  });

  it('and the module cites the right one', () => {
    expect(GATES).toContain("`app-room-roster`'s `E2e` — byte **2,035,701**");
  });
});

describe('RSG-02 — the class map is `g2e`, and `u2e` is another component', () => {
  it('g2e is the pure function the row applies', () => {
    expect(cited(2_032_757, 35)).toBe('g2e=(t,n)=>({regUser:t,presUser:n})');
    /* And `D2e` is what applies it — the row wrapper, one level above the gate. */
    expect(cited(2_035_468, 13)).toBe('function D2e(');
    expect(cited(2_035_468, 240)).toContain('Kn(2,g2e,!e.isP,e.isP||e.hasAdminChat)');
  });

  it('`u2e` has no assignment at all, and the function of that name is elsewhere', () => {
    /*
      The worse half of this slip. A citation pointing at nothing is found the first time somebody
      looks; this one pointed at REAL code in another component, so looking confirmed it.
    */
    expect(BUNDLE).not.toContain('u2e=(t,n)=>');
    expect(cited(1_952_934, 13)).toBe('function u2e(');
    expect(cited(1_952_934, 120)).not.toContain('regUser');
  });

  it('and the module cites the right one', () => {
    expect(GATES).toContain('`Kn(2, g2e, !e.isP, e.isP || e.hasAdminChat)`');
    expect(GATES).toContain('byte **2,032,757**');
  });
});

describe('RSG-03 — no citation names a bundle this repository does not hold', () => {
  it('the older build is named only in the record of its own removal', () => {
    /*
      `docs/source/main.d6d3c112b59b7d0d.js` is an OLDER build under an evidence root this checkout
      does not ship. Two citations named it while their OFFSETS resolved correctly against the v4
      bundle — the numbers had been re-derived and the filename beside them had not, which is the
      exact inverse of `SVC-02`, where the file was right and the numbers were stale.

      Comments are NOT stripped here, deliberately: every one of these citations lives in a comment,
      so stripping them would leave nothing to check. The assertion is therefore on the COUNT and on
      the position — one mention, and it is the sentence that explains why it is gone.
    */
    const mentions = GATES.match(/d6d3c112b59b7d0d/g) ?? [];
    expect(mentions, 'only the RSG-03 correction record may name it').toHaveLength(1);
    const [before] = GATES.split('`RSG-03`: this named');
    expect(before, 'a live citation must not precede the record of its removal').not.toContain(
      'd6d3c112b59b7d0d'
    );
  });

  it('and the two offsets it carried resolve in the bundle that IS here', () => {
    expect(cited(2_035_670, 60)).toContain('showOnlyUsernames||e.isP?1:2');
    expect(cited(1_075_893, 40)).toContain('connectToRoom');
  });
});

describe('RSG-04 — the roster key is upstream s identity, because of one line in the load', () => {
  it('keys by `user.id`, which this room derives `userXrefID` from', () => {
    /*
      `m2e = (t, n) => n.userXrefID` at byte 2,032,733 is the reference's track-by. Ours keys by
      `user.id`, and the two select the same person ONLY because `+page.server.ts` sets
      `userXrefID: String(account.id)`.

      That equivalence is a property of this room rather than of the shape, so both ends are pinned:
      the moment `userXrefID` becomes something the account does not derive — an external CRM id, an
      SSO subject — the key here stops being upstream's identity and a roster row is recreated where
      the reference reuses it. Nothing else in the repository would notice.
    */
    expect(cited(2_032_733, 24)).toBe('m2e=(t,n)=>n.userXrefID,');
    expect(codeOf('src/lib/components/RoomSidebar.svelte', SIDEBAR)).toContain(
      '{#each roster.display as user (user.id)}'
    );
    expect(codeOf('src/routes/+page.server.ts', LOAD)).toContain('userXrefID: String(account.id)');
  });
});

describe('the twenty consts that ARE built, and the four that are blocked', () => {
  it('the row s own class names are all present', () => {
    for (const value of [
      'room-roster-list',
      'room-roster-container',
      'rosterImg',
      'media-body',
      'nickName',
      'trial-badge',
      'dropdownMenuLink',
      'users-dropdown-options',
      'userLocation'
    ]) {
      expect(SIDEBAR, `const value ${value} is not rendered`).toContain(value);
    }
  });

  it('and the four that are NOT are the two blocked register rows, not a new gap', () => {
    /*
      `stars-container`/`stars-icon`/`stars-num` are `RS-03` and `new-badge` is `RS-04`. Both need a
      value no server here produces — `e.data.years` and `e.isNew` — and both are recorded BLOCKED
      with that reason. Asserted as ABSENT rather than left unmentioned, so that building them
      without the supply (markup gated on a value that is always undefined, which is what the
      register calls "a second node that can never render") fails here.
    */
    for (const value of ['stars-container', 'stars-icon', 'stars-num', 'new-badge']) {
      expect(
        SIDEBAR,
        `${value} needs a server-side supply that does not exist — see RS-03/RS-04`
      ).not.toContain(value);
    }
  });
});
