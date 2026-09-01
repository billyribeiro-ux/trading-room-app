import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';

/**
 * WHOSE NAME THIS PRODUCT PUTS ON ITSELF — and the two places that currently disagree.
 *
 * ## The measurement, 2026-09-01
 *
 * The reference carries one attribution at FOUR sites, identical at every one:
 *
 * | byte | surface | markup |
 * | --- | --- | --- |
 * | 1,179,402 | the login form | `v(11," Powered by: "),d(12,"a",40),v(13,"ProTradingRoom.com")` |
 * | 1,187,483 | its forgot/change-password arm | the same three instructions |
 * | 2,470,674 | the room's sidebar | `v(7," Powered by:\\xa0 "),d(8,"a",18),v(9," ProTradingRoom.com ")` |
 * | 2,576,585 | the closed-session page | the same, with `" Try v3 "` below it |
 *
 * `https://protradingroom.com` occurs three times in the 2,891,205-byte bundle — const 40 is shared
 * by the two login arms.
 *
 * **This room renders two different answers.** `RoomSidebar.svelte` was rebranded to
 * `https://www.tradingroom.app` / `TradingRoomApp`, on a reason recorded at the markup: *"every room
 * this product serves credited, and linked out to, a different company."* `session/+page.svelte`
 * still transcribes the capture. So a member reads one company on the login page and a different one
 * in the room, ninety seconds apart.
 *
 * ## Why this file pins the disagreement instead of resolving it
 *
 * Which name a product puts on its own login page is the OWNER's call. The room half was already
 * decided that way and the login half was not, and the failure mode of leaving it as prose is
 * exactly what produced the split: a rebrand applied to the file somebody happened to be editing.
 *
 * So both sites are asserted by value. Changing either one alone fails this file and the message
 * says what the other one says — which turns "these should agree" from a comment nobody reads into
 * the one thing that has to be looked at.
 *
 * The fourth site is not asserted: this room has no closed-session page at all, and
 * `session-control-refusals-contract.test.ts` records why.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const login = svelteCodeOf(readFileSync(`${ROOT}../src/routes/session/+page.svelte`, 'utf8'));
const sidebar = svelteCodeOf(readFileSync(`${ROOT}lib/components/RoomSidebar.svelte`, 'utf8'));

describe('the two Powered by sites', () => {
  it('reads both files it is measuring', () => {
    expect(login).toContain('Powered by:');
    expect(sidebar).toContain('Powered by:');
  });

  it('the LOGIN page still credits the capture s own company', () => {
    expect(
      login,
      'the login footer is the capture, verbatim (const 40, byte 1,179,402). If this has been ' +
        'rebranded, the room sidebar must move with it: it currently says TradingRoomApp.'
    ).toContain('href="https://protradingroom.com"');
    expect(login).toContain('>ProTradingRoom.com</a');
  });

  it('the ROOM sidebar credits this product, on a reason recorded at the markup', () => {
    expect(
      sidebar,
      'the sidebar was rebranded deliberately. If it has moved back, the login page must move ' +
        'with it: it currently says ProTradingRoom.com.'
    ).toContain('href="https://www.tradingroom.app"');
    expect(sidebar).toContain('>TradingRoomApp</a');
  });

  it('and the disagreement is recorded at BOTH ends, not just one', () => {
    /*
      The half that made this worth a file. The sidebar has carried its reason since it was
      rebranded; the login page carried nothing, so a reader there had no way to know the other
      site said something else. Read RAW, because what is asserted is that the prose exists.
    */
    const loginRaw = readFileSync(`${ROOT}../src/routes/session/+page.svelte`, 'utf8');
    const sidebarRaw = readFileSync(`${ROOT}lib/components/RoomSidebar.svelte`, 'utf8');
    expect(loginRaw).toContain('CREDIT DIFFERENT COMPANIES');
    expect(sidebarRaw).toContain('OURS, not the reference');
  });
});
