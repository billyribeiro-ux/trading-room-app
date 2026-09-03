import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RANDOM_USER_MINIMUM } from './roster-gates.js';

/**
 * The seven roster-gate transcriptions that need the OLDER bundle, split out on 2026-09-03.
 *
 * ## What the split recovered
 *
 * `roster-gates.test.ts` read `docs/source/main.d6d3c112b59b7d0d.js` at module scope for these seven
 * cases. `docs/source` is a MISSING capture root here, so `gate/evidence-bound-tests.mjs` excluded
 * **all sixty-eight cases** on every checkout without the dumps — including CI. Sixty-one of them
 * read this repository's own modules and components and needed nothing else.
 *
 * **And one of the sixty-one had drifted.** `receives both commands, not just sends them` asserted
 * `command?.cmd === 'playMP3ForAll'` against `events.svelte.ts`; those two branches left that file
 * on 2026-08-27 with the other six "for all" receivers, in an extraction that file's own ceiling
 * entry argues for. The assertion had been wrong for a week and nothing could say so.
 *
 * Second file that day to give up a stale assertion the moment it could run, after
 * `settings-preference-wiring-contract.test.ts` gave up four.
 *
 * ## Why the offsets could not simply be repointed at the committed bundle
 *
 * `docs/source-v4-2026-08-15/` IS committed, and it is a DIFFERENT BUILD: 2,891,205 bytes against
 * this one's 2,887,876. Every needle below was read from the older file, so repointing them would be
 * asserting strings against a bundle nobody checked them in. The gap register's own corpus caveat
 * records the same trap being hit once already.
 */

const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const SIDEBAR = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');

describe('the gates are transcriptions, not inventions', () => {
  it('pins archivesAvailableTo() in the shipped bundle', () => {
    expect(bundle).toContain(
      'globals.isPresenter&&!this.appService.globals.isLimitedPresenter?!(this.appService.globals.sessData.showArchivesToSpecificPresenters'
    );
    expect(bundle).toContain(
      '.showArchivesToUsers||this.appService.globals.user.denyArchivesAccess)'
    );
  });

  it('pins the four sidebar gates', () => {
    // O(44) - the Users block.
    expect(bundle).toContain(
      'sessData.onlyPresentersVisibleToViewers||e.appService.globals.sessData.rosterVisibleToViewers||e.appService.globals.isPresenter||e.appService.globals.user.hasAdminChat?44:-1'
    );
    // O(6) - the badge, gated apart from the list.
    expect(bundle).toContain(
      'sessData.rosterCountVisibleToViewers||i.appService.globals.isPresenter?6:-1'
    );
    // O(43) - Get Random User.
    expect(bundle).toContain('O(43,e.appService.globals.isPresenter?43:-1)');
    // O(15) - the "Sort by Trials" tick.
    expect(bundle).toContain('O(15,i.isSortFTUsers?15:-1)');
  });

  it('pins the per-row gate, which is a different expression from O(44)', () => {
    expect(bundle).toContain(
      'sessData.onlyPresentersVisibleToViewers&&(e.isP||e.hasAdminChat)||i.appService.globals.sessData.rosterVisibleToViewers||i.appService.globals.isPresenter||i.appService.globals.user.hasAdminChat&&(e.isP||e.hasAdminChat||i.appService.globals.user.userXrefID===e.userXrefID)?1:-1'
    );
  });

  it('pins both list pipes and the class map', () => {
    expect(bundle).toContain(
      'transform(e,i){return i?e.sort((o,s)=>o.isP?o:s.isP?s:o.nick.toLowerCase()>s.nick.toLowerCase()?1:-1):e}'
    );
    expect(bundle).toContain(
      'transform(e,i){return i?e.filter(s=>s.isFT).sort((s,r)=>s.nick.toLowerCase()>r.nick.toLowerCase()?1:-1):e}'
    );
    expect(bundle).toContain('u2e=(t,n)=>({regUser:t,presUser:n})');
    expect(bundle).toContain('qB=t=>({"btn-dark":t})');
  });

  it('pins getRandomUser()s candidate set and the two-candidate minimum', () => {
    expect(bundle).toContain(
      'let o=e.appService.globals.roster.filter(r=>!r.isP),{uniqueUsers:s}=e.uniqueRoster(o)'
    );
    expect(bundle).toContain('i&&(s=s.filter(r=>r.isFT)),e.randomUser(s)');
    expect(bundle).toContain('randomUser(e){const i=this;var o=e.length;if(o>=2)');
    expect(RANDOM_USER_MINIMUM).toBe(2);
  });

  it('pins searchUsers, clearUserSearch and the Enter-only keyup', () => {
    expect(bundle).toContain(
      'doUserSearch(e){13==e.keyCode&&(this.userSearchTermTxt?this.searchUsers():this.clearUserSearch())}'
    );
    expect(bundle).toContain(
      'clearUserSearch(){P("Clear search..."),this.visibleRoster=this.appService.globals.roster}'
    );
  });

  it('pins the search inputs captured attributes verbatim', () => {
    expect(bundle).toContain(
      '"type","search","id","userSearchTermInput","placeholder","Search by nick or email,enter to search","aria-label","Search","aria-describedby","addon-search",1,"form-control"'
    );
    expect(SIDEBAR).toContain('placeholder="Search by nick or email,enter to search"');
    expect(SIDEBAR).toContain('aria-describedby="addon-search"');
  });
});
