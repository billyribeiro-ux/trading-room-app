import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RANDOM_USER_MINIMUM,
  archivesAvailableTo,
  joinsMediaAsProducer,
  formatUserLocation,
  locationVisibleTo,
  memberDeniedArchives,
  filterRosterToTrials,
  randomUserCandidates,
  rosterBlockVisible,
  rosterCountVisibleTo,
  rosterRowClass,
  rosterRowVisible,
  searchRoster,
  sortRosterByNick,
  uniqueRoster,
  type RosterSessionFlags,
  type RosterViewer
} from './roster-gates';

/*
  The bundle is the evidence, and it is pinned here so that a gate cannot be quietly relaxed
  without the expression it claims to transcribe also changing. `docs/source/**` is SHA-256
  pinned, so these strings are stable by construction.
*/
const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
/*
  `.room-sidebar` became `RoomSidebar.svelte` on 2026-08-15 — the second of the five template
  regions. Assertions read out of the reference bundle are untouched, because the evidence did not
  move; ours follow the markup into the component.
*/
const SIDEBAR = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');

const viewer = (overrides: Partial<RosterViewer> = {}): RosterViewer => ({
  isPresenter: false,
  email: 'member@example.com',
  userXrefID: '7',
  hasAdminChat: false,
  isLimitedPresenter: false,
  denyArchivesAccess: false,
  ...overrides
});

const session = (overrides: RosterSessionFlags = {}): RosterSessionFlags => ({ ...overrides });

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

describe('archivesAvailableTo', () => {
  it('gives a full presenter archives when no allowlist exists', () => {
    expect(archivesAvailableTo(viewer({ isPresenter: true }), session())).toBe(true);
  });

  it('honours an allowlist that names the presenter, and one that does not', () => {
    const staff = viewer({ isPresenter: true, email: 'staff@example.com' });
    expect(
      archivesAvailableTo(
        staff,
        session({ showArchivesToSpecificPresenters: ['staff@example.com'] })
      )
    ).toBe(true);
    expect(
      archivesAvailableTo(
        staff,
        session({ showArchivesToSpecificPresenters: ['other@example.com'] })
      )
    ).toBe(false);
  });

  it('puts a LIMITED presenter on the viewer branch, where the allowlist cannot help them', () => {
    const limited = viewer({
      isPresenter: true,
      isLimitedPresenter: true,
      email: 'staff@example.com'
    });
    // Named on the allowlist, and it makes no difference: the viewer branch never reads it.
    expect(
      archivesAvailableTo(
        limited,
        session({ showArchivesToSpecificPresenters: ['staff@example.com'] })
      )
    ).toBe(false);
    expect(archivesAvailableTo(limited, session({ showArchivesToUsers: true }))).toBe(true);
  });

  it('requires the session to open archives AND the account not to be denied', () => {
    expect(archivesAvailableTo(viewer(), session({ showArchivesToUsers: true }))).toBe(true);
    expect(archivesAvailableTo(viewer(), session())).toBe(false);
    expect(
      archivesAvailableTo(
        viewer({ denyArchivesAccess: true }),
        session({ showArchivesToUsers: true })
      )
    ).toBe(false);
  });
});

describe('rosterBlockVisible and rosterCountVisibleTo', () => {
  it('opens the block for any of the four conditions', () => {
    expect(rosterBlockVisible(viewer(), session())).toBe(false);
    expect(rosterBlockVisible(viewer(), session({ rosterVisibleToViewers: true }))).toBe(true);
    expect(rosterBlockVisible(viewer(), session({ onlyPresentersVisibleToViewers: true }))).toBe(
      true
    );
    expect(rosterBlockVisible(viewer({ isPresenter: true }), session())).toBe(true);
    expect(rosterBlockVisible(viewer({ hasAdminChat: true }), session())).toBe(true);
  });

  it('gates the badge separately from the list', () => {
    // A room can show the list and hide the headcount, and vice versa.
    const s = session({ rosterVisibleToViewers: true });
    expect(rosterBlockVisible(viewer(), s)).toBe(true);
    expect(rosterCountVisibleTo(viewer(), s)).toBe(false);
    expect(rosterCountVisibleTo(viewer(), session({ rosterCountVisibleToViewers: true }))).toBe(
      true
    );
    expect(rosterCountVisibleTo(viewer({ isPresenter: true }), session())).toBe(true);
  });
});

describe('rosterRowVisible', () => {
  const presenterRow = { isP: true, userXrefID: '1' };
  const memberRow = { isP: false, userXrefID: '2' };
  const adminChatRow = { isP: false, hasAdminChat: true, userXrefID: '3' };

  it('admits only presenters and admin-chat rows under onlyPresentersVisibleToViewers', () => {
    const s = session({ onlyPresentersVisibleToViewers: true });
    const me = viewer();
    // The block is open to this viewer...
    expect(rosterBlockVisible(me, s)).toBe(true);
    // ...but only two of the three rows are.
    expect(rosterRowVisible(me, s, presenterRow)).toBe(true);
    expect(rosterRowVisible(me, s, adminChatRow)).toBe(true);
    expect(rosterRowVisible(me, s, memberRow)).toBe(false);
  });

  it('shows every row once the roster is open to viewers', () => {
    const s = session({ rosterVisibleToViewers: true });
    for (const row of [presenterRow, memberRow, adminChatRow]) {
      expect(rosterRowVisible(viewer(), s, row)).toBe(true);
    }
  });

  it('shows every row to a presenter regardless of flags', () => {
    for (const row of [presenterRow, memberRow, adminChatRow]) {
      expect(rosterRowVisible(viewer({ isPresenter: true }), session(), row)).toBe(true);
    }
  });

  it('lets an admin-chat viewer see privileged rows and their own, and nobody else', () => {
    const me = viewer({ hasAdminChat: true, userXrefID: '2' });
    expect(rosterRowVisible(me, session(), presenterRow)).toBe(true);
    expect(rosterRowVisible(me, session(), adminChatRow)).toBe(true);
    // Their own row - matched by userXrefID, not by any flag.
    expect(rosterRowVisible(me, session(), memberRow)).toBe(true);
    expect(rosterRowVisible(me, session(), { isP: false, userXrefID: '99' })).toBe(false);
  });

  it('hides every row from a plain viewer in a closed room', () => {
    for (const row of [presenterRow, memberRow, adminChatRow]) {
      expect(rosterRowVisible(viewer(), session(), row)).toBe(false);
    }
  });
});

describe('rosterRowClass', () => {
  it('gives an admin-chat member BOTH classes', () => {
    expect(rosterRowClass({ isP: false, hasAdminChat: true })).toBe('regUser presUser');
  });

  it('gives a plain member regUser and a presenter presUser', () => {
    expect(rosterRowClass({ isP: false })).toBe('regUser');
    expect(rosterRowClass({ isP: true })).toBe('presUser');
  });
});

describe('the two list pipes', () => {
  const roster = [
    { displayName: 'Zoe', isP: false, isFT: true },
    { displayName: 'adam', isP: false, isFT: false },
    { displayName: 'Mia', isP: false, isFT: true }
  ];

  it('is the identity when the toggle is off', () => {
    expect(sortRosterByNick(roster, false).map((r) => r.displayName)).toEqual([
      'Zoe',
      'adam',
      'Mia'
    ]);
    expect(filterRosterToTrials(roster, false)).toHaveLength(3);
  });

  it('sorts non-presenters case-insensitively by nick', () => {
    expect(sortRosterByNick(roster, true).map((r) => r.displayName)).toEqual([
      'adam',
      'Mia',
      'Zoe'
    ]);
  });

  it('leaves presenters where they are, because the captured comparator returns 0 for them', () => {
    const withPresenter = [
      { displayName: 'Zoe', isP: false },
      { displayName: 'Host', isP: true },
      { displayName: 'adam', isP: false }
    ];
    // Neither presenters-first nor fully alphabetical: the presenter compares equal to both
    // neighbours, so the comparison that would swap Zoe and adam never happens across it.
    expect(sortRosterByNick(withPresenter, true).map((r) => r.displayName)).toEqual([
      'Zoe',
      'Host',
      'adam'
    ]);
  });

  it('matches the captured object-returning comparator on every permutation', () => {
    /*
      The proof that returning `0` is a faithful substitution and not a convenient one. This runs
      the capture's own comparator - `(o, s) => o.isP ? o : s.isP ? s : (…)`, which hands `sort` an
      OBJECT and relies on it coercing to NaN and being treated as 0 - and requires the same order
      out of both for every arrangement of a roster containing two presenters.
    */
    const people = [
      { displayName: 'Zoe', isP: false },
      { displayName: 'Host', isP: true },
      { displayName: 'adam', isP: false },
      { displayName: 'Mia', isP: false },
      { displayName: 'Admin', isP: true }
    ];

    const permutations = <T>(items: T[]): T[][] =>
      items.length <= 1
        ? [items]
        : items.flatMap((item, index) =>
            permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
              item,
              ...rest
            ])
          );

    for (const arrangement of permutations(people)) {
      /*
        The two casts reproduce a DEFECT, and removing them would break the test rather than tidy
        it. The reference's comparator returns the OBJECT where a number belongs — JavaScript
        coerces that to `NaN`, which `sort` reads as "leave the pair alone". That is why presenters
        do not actually sort to the top upstream, and this loop over every permutation is what pins
        `sortRosterByNick` to the same observable order.

        TypeScript refuses an object as a comparator result, correctly, so the cast is the only way
        to express the reference's behaviour at all.
      */
      const captured = [...arrangement].sort((left, right) =>
        left.isP
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (left as any)
          : right.isP
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (right as any)
            : left.displayName.toLowerCase() > right.displayName.toLowerCase()
              ? 1
              : -1
      );
      expect(sortRosterByNick(arrangement, true).map((r) => r.displayName)).toEqual(
        captured.map((r) => r.displayName)
      );
    }
  });

  it('does not mutate its input, unlike the capture', () => {
    const original = [...roster];
    sortRosterByNick(roster, true);
    filterRosterToTrials(roster, true);
    expect(roster).toEqual(original);
  });

  it('"Sort by Trials" filters as well as sorts', () => {
    expect(filterRosterToTrials(roster, true).map((r) => r.displayName)).toEqual(['Mia', 'Zoe']);
  });
});

describe('uniqueRoster and the random draw', () => {
  const roster = [
    { displayName: 'Host', isP: true, isFT: false, emailHash: 'h' },
    { displayName: 'Ann', isP: false, isFT: true, emailHash: 'a' },
    { displayName: 'Ann (2nd tab)', isP: false, isFT: true, emailHash: 'a' },
    { displayName: 'Bob', isP: false, isFT: false, emailHash: 'b' }
  ];

  it('counts one person with two tabs once', () => {
    const result = uniqueRoster(roster);
    expect(result.totalUsers).toBe(4);
    expect(result.unique).toBe(3);
    expect(result.uniqueUsers.map((r) => r.displayName)).toEqual(['Host', 'Ann', 'Bob']);
  });

  it('draws from deduped non-presenters', () => {
    expect(randomUserCandidates(roster, false).map((r) => r.displayName)).toEqual(['Ann', 'Bob']);
  });

  it('narrows to trials on "Yes"', () => {
    expect(randomUserCandidates(roster, true).map((r) => r.displayName)).toEqual(['Ann']);
  });

  it('can return a set too small to draw from, which the caller must respect', () => {
    // One trial account - `if (o >= 2)` means no dialog at all, not "pick the only one".
    expect(randomUserCandidates(roster, true).length).toBeLessThan(RANDOM_USER_MINIMUM);
  });
});

describe('searchRoster', () => {
  const roster = [
    { displayName: 'Billy Ribeiro', email: 'billy@example.com' },
    { displayName: 'Ann Lee', email: 'ann@example.com' }
  ];

  it('matches a nick substring, case-insensitively', () => {
    expect(searchRoster(roster, 'RIB').map((r) => r.displayName)).toEqual(['Billy Ribeiro']);
    expect(searchRoster(roster, 'lee').map((r) => r.displayName)).toEqual(['Ann Lee']);
  });

  it('matches a full email exactly, never a fragment of one', () => {
    expect(searchRoster(roster, 'ann@example.com').map((r) => r.displayName)).toEqual(['Ann Lee']);
    // The capture compares hashes, so a partial address cannot match; neither can this.
    expect(searchRoster(roster, '@example.com')).toHaveLength(0);
  });

  it('returns nothing rather than everything for an unmatched term', () => {
    expect(searchRoster(roster, 'nobody')).toHaveLength(0);
  });
});

describe('the sidebar renders what the gates decide', () => {
  it('wires every roster-header control that used to be inert', () => {
    /*
      The four controls moved to `RoomRoster` on 2026-08-15, so these read the methods rather than
      four page-local togglers. The point of the assertion is unchanged and is the reason it exists:
      every one of these was RENDERED and did nothing before it was written.
    */
    expect(SIDEBAR).toContain('onclick={() => roster.toggleTrialsOnly()}');
    expect(SIDEBAR).toContain('onclick={() => roster.toggleSortByNick()}');
    expect(SIDEBAR).toContain('onclick={() => roster.toggleSearch()}');
    expect(SIDEBAR).toContain('class:btn-dark={roster.sortByNick}');
    expect(SIDEBAR).toContain('<i class="fas fa-check-circle"></i>');
    // The search input is the fourth, and it is a two-way binding onto the class's own term.
    expect(SIDEBAR).toContain('bind:value={roster.searchTerm}');
  });

  it('is rendered by the page, and handed the gates it renders from', () => {
    expect(pageSource).toContain('<RoomSidebar');
    expect(pageSource).toContain('{rosterVisible}');
    expect(pageSource).toContain('{rosterCountVisible}');
    expect(pageSource).toContain('{rowVisible}');
  });

  it('applies both roster gates, not just the outer one', () => {
    expect(SIDEBAR).toContain('{#if rosterVisible}');
    expect(SIDEBAR).toContain('{#if rowVisible(user)}');
    expect(SIDEBAR).toContain('{#if rosterCountVisible}');
    expect(SIDEBAR).toContain('class={rosterRowClass(user)}');
  });

  it('renders the list through the pipes rather than raw', () => {
    /*
      `roster.display` is searched, then sorted, then narrowed to trials; `roster.users` is the raw
      list. Rendering the second would leave all four header controls decorative again, which is
      the state this whole block was written to end.
    */
    expect(SIDEBAR).toContain('{#each roster.display as user (user.id)}');
    expect(SIDEBAR).not.toContain('{#each roster.users as user (user.id)}');
    expect(SIDEBAR).not.toContain('{#each roster.visible as user (user.id)}');
  });
});

/**
 * `joinsMediaAsProducer` — the reference's media admission.
 *
 * Transcribed from `docs/source/main.d6d3c112b59b7d0d.js` offset 1075893, the bundle's only
 * `connectToRoom` emit:
 *
 *   isP: globals.user.isPresenter || globals.user.hasCam
 *        || globals.user.hasMic   || globals.user.hasScreen
 *
 * These tests pin the whole truth table, because until 2026-08-07 this room derived media
 * admission from `users.role` instead, which made the owner's permissions modal decorative on the
 * media path: a Participant granted a microphone could not speak, and the grant said so.
 */
describe('joinsMediaAsProducer', () => {
  const NOBODY = { isPresenter: false, hasMic: false, hasCam: false, hasScreen: false };

  it('admits a presenter with no media permissions at all', () => {
    expect(joinsMediaAsProducer({ ...NOBODY, isPresenter: true })).toBe(true);
  });

  it('admits a non-presenter holding any ONE of the three', () => {
    expect(joinsMediaAsProducer({ ...NOBODY, hasMic: true })).toBe(true);
    expect(joinsMediaAsProducer({ ...NOBODY, hasCam: true })).toBe(true);
    expect(joinsMediaAsProducer({ ...NOBODY, hasScreen: true })).toBe(true);
  });

  it('refuses a member holding none of them', () => {
    expect(joinsMediaAsProducer(NOBODY)).toBe(false);
  });

  it('treats an absent permission as not granted, which is what a guest has', () => {
    // A guest has no membership row, so every key is undefined rather than false.
    expect(joinsMediaAsProducer({ isPresenter: false })).toBe(false);
  });

  it('is a disjunction over exactly the three MEDIA permissions', () => {
    // hasAdminChat and canEditNotes are deliberately absent from the reference's expression.
    // Including them would let a chat moderator open a microphone.
    const chatOnly = { ...NOBODY, hasAdminChat: true, canEditNotes: true } as never;
    expect(joinsMediaAsProducer(chatOnly)).toBe(false);
  });
});

/**
 * `memberDeniedArchives` — the individual archives block.
 *
 * Split out because `member?.denyArchivesAccess ?? false` answered two different questions with
 * one value: "there is no membership" and "there is a membership that does not say".
 */
describe('memberDeniedArchives', () => {
  it('does not block a guest, who has no row to block', () => {
    expect(memberDeniedArchives(null)).toBe(false);
    expect(memberDeniedArchives(undefined)).toBe(false);
  });

  it('honours an explicit grant and an explicit block', () => {
    expect(memberDeniedArchives({ denyArchivesAccess: false })).toBe(false);
    expect(memberDeniedArchives({ denyArchivesAccess: true })).toBe(true);
  });

  it('fails CLOSED when a membership exists but does not say', () => {
    // A malformed or truncated payload. Answering "not blocked" would hand out the archives.
    expect(memberDeniedArchives({})).toBe(true);
    expect(memberDeniedArchives({ denyArchivesAccess: undefined })).toBe(true);
  });

  it('composes with the room-level switch rather than replacing it', () => {
    // A guest is not individually blocked, so the ROOM's setting alone decides.
    const guest = {
      isPresenter: false,
      email: 'g@example.com',
      userXrefID: '1',
      hasAdminChat: false,
      isLimitedPresenter: false,
      denyArchivesAccess: memberDeniedArchives(null)
    };
    expect(archivesAvailableTo(guest, { showArchivesToUsers: true })).toBe(true);
    expect(archivesAvailableTo(guest, { showArchivesToUsers: false })).toBe(false);
  });
});

/**
 * `userLocation` — the city line under a member's name.
 *
 * The string rule and the gate are both transcribed; see OUTSTANDING §3.1 for the evidence.
 */
describe('formatUserLocation', () => {
  it('builds the full string the reference produces', () => {
    expect(formatUserLocation({ city: 'Waterbury', region_code: 'CT', country_code: 'US' })).toBe(
      'Waterbury, CT, US'
    );
  });

  it('makes the country the whole string when nothing precedes it', () => {
    // The branch that separates a tidy label from a row reading ", , US".
    expect(formatUserLocation({ country_code: 'US' })).toBe('US');
    expect(formatUserLocation({ city: '', region_code: '', country_code: 'US' })).toBe('US');
  });

  it('handles a partial answer without stray punctuation', () => {
    expect(formatUserLocation({ city: 'Waterbury' })).toBe('Waterbury');
    expect(formatUserLocation({ city: 'Waterbury', country_code: 'US' })).toBe('Waterbury, US');
    expect(formatUserLocation({ region_code: 'CT', country_code: 'US' })).toBe('CT, US');
  });

  it('is empty when the lookup failed or returned nothing', () => {
    expect(formatUserLocation(null)).toBe('');
    expect(formatUserLocation(undefined)).toBe('');
    expect(formatUserLocation({})).toBe('');
  });
});

describe('locationVisibleTo', () => {
  it('shows a location to a presenter', () => {
    expect(locationVisibleTo({ isPresenter: true }, { locStr: 'Waterbury, CT, US' })).toBe(true);
  });

  it('hides it from a member, including on their OWN row', () => {
    // `globals.isPresenter && entry.privData`. Ungated, this leaks every member's city to every
    // other member in the room.
    expect(locationVisibleTo({ isPresenter: false }, { locStr: 'Waterbury, CT, US' })).toBe(false);
  });

  it('renders nothing when there is no location, rather than an empty line', () => {
    expect(locationVisibleTo({ isPresenter: true }, { locStr: '' })).toBe(false);
    expect(locationVisibleTo({ isPresenter: true }, {})).toBe(false);
  });
});

/**
 * `giveMicScreen` — the sender §2.4 said was missing.
 *
 * The command's own strings are transcribed from the bundle at offset 2075481 (the sender) and
 * 2499228 (the recipient's toast). Pinned as source assertions because the behaviour spans a form
 * action, an SSE frame and two components, and the thing that actually breaks is somebody
 * "tidying" one of the strings so the two halves stop agreeing.
 */
describe('giveMicScreen wiring', () => {
  // `serverSource` is gone: `+page.server.ts` no longer holds `giveMicScreen`, and a reader
  // that nothing reads is the next person's dead end.
  const pageSource = readFileSync('src/routes/+page.svelte', 'utf8');
  const modalSource = readFileSync('src/lib/components/ModalHost.svelte', 'utf8');

  it('has a sender, which is what made isLimitedPresenter reachable at last', () => {
    expect(modalSource).toContain('async function giveMicScreen(give: boolean)');
    expect(modalSource).toContain('void giveMicScreen(true)');
    expect(modalSource).toContain('void giveMicScreen(false)');
  });

  it('refuses a self-target on BOTH sides, with the reference’s wording', () => {
    // The capture checks this only in the browser. A presenter posting directly to the endpoint
    // would otherwise switch their own presenter flag off with no control left to switch it back.
    const refusal = "Can't ${give ? 'give' : 'take'} 'Mic/Screenshare' to yourself.";
    expect(modalSource).toContain(refusal);
    /*
      The server half moved to `presenter-commands.remote.ts` with the command. BOTH sides is the
      whole claim, so re-pointing one of them without asserting the file holds the command would
      have left this passing on the modal alone.
    */
    const presenterCommands = readFileSync(
      new URL('../routes/presenter-commands.remote.ts', import.meta.url),
      'utf8'
    );
    expect(presenterCommands).toContain('export const giveMicScreen = command(');
    expect(presenterCommands).toContain(refusal);
  });

  it('confirms with the capture’s two strings, not a paraphrase', () => {
    expect(modalSource).toContain("'Mic/Screenshare given OK'");
    expect(modalSource).toContain("'Mic/Screen taken away OK'");
  });

  it('tells the RECIPIENT, success for a grant and error for a revoke', () => {
    expect(pageSource).toContain("'You can now Talk / Screenshare'");
    expect(pageSource).toContain("'You can no longer Talk / Screenshare'");
    // Two skins, not one: losing a capability is not good news and the capture colours it so.
    expect(pageSource).toMatch(/kind: command\.give === true \? 'success' : 'error'/);
  });

  it('is its own top-level command, never a remotePresCommand subCmd', () => {
    // An earlier version dispatched it as a subCmd, which no sender would ever have matched.
    expect(
      readFileSync(new URL('../routes/presenter-commands.remote.ts', import.meta.url), 'utf8')
    ).toContain("cmd: 'giveMicScreen'");
    expect(pageSource).toContain("command?.cmd === 'giveMicScreen'");
  });
});

/**
 * `playMP3ForAll` / `stopMp3ForAll` — the room-wide sound.
 *
 * The senders already existed and nothing received them, so "Play For All" was silent in every
 * browser. Transcribed from the bundle: subscribers at offset 1963827, the `isP && mp3Playing`
 * gate at 2016079, and the `src` binding on `#mp3player` in the same template block.
 */
describe('room-wide sound', () => {
  const pageSource = readFileSync('src/routes/+page.svelte', 'utf8');

  it('receives both commands, not just sends them', () => {
    expect(pageSource).toContain("command?.cmd === 'playMP3ForAll'");
    expect(pageSource).toContain("command?.cmd === 'stopMp3ForAll'");
  });

  it('binds the audio element to the url, so something actually plays', () => {
    // It was `src=""`, which is the whole reason the feature made no sound.
    expect(pageSource).toContain("src={mp3Url ?? ''}");
    // `#mp3player` is the capture's id and setBkgMusicVol reaches it by that selector.
    expect(pageSource).toContain('id="mp3player"');
  });

  it('gates Stop For All on BOTH presenter and playing', () => {
    // `O(83, o.isP && o.mp3Playing ? 83 : -1)` — a control that is inert most of the time should
    // not be on screen most of the time.
    expect(pageSource).toContain('{#if isPresenter && mp3Playing}');
    expect(pageSource).toContain('Stop For All');
  });

  it('keeps mp3Playing as its own flag rather than deriving it from the url', () => {
    // The capture keeps both and gates different things on each.
    expect(pageSource).toMatch(/let mp3Playing = \$state\(false\)/);
    expect(pageSource).toMatch(/let mp3Url = \$state<string \| null>\(null\)/);
  });
});

/**
 * The media admission formula must be used by BOTH halves.
 *
 * The SFU grant's role is minted from `joinsMediaAsProducer`; the browser's `canProduce` used the
 * account role. They disagreed for exactly the case the permissions modal exists to create — a
 * Participant granted a microphone got a `presenter` grant from the server and was then refused a
 * send transport by their own browser.
 */
describe('media admission is one formula, not two', () => {
  const pageSource = readFileSync('src/routes/+page.svelte', 'utf8');
  const grantSource = readFileSync('src/routes/api/media/grant/+server.ts', 'utf8');

  it('mints the grant from the permissions, not the account role', () => {
    expect(grantSource).toContain('permissions.hasMic');
    expect(grantSource).toContain('permissions.hasCam');
    expect(grantSource).toContain('permissions.hasScreen');
  });

  it('gates canProduce on the same predicate the grant uses', () => {
    expect(pageSource).toContain('canProduce: joinsMediaAsProducer({');
    expect(pageSource).not.toContain('canProduce: isPresenter');
  });
});

/*
  `giveMicScreen` must restart the recipient's media — `TODO.md` gap 22.

  The capture follows the flag assignment with `disconnectAll()` and a re-init after 3s, so the peer
  actually gains or loses a producer. Setting the flag alone changes what the sidebar renders and
  nothing about what the SFU carries.

  Read as source text: the handler needs an EventSource, a live SFU and a role change to execute.
*/
describe('a role change restarts the media session', () => {
  const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('rebuilds rather than reusing, because close() latches permanently', () => {
    /*
      `MediaSession.close()` sets `#closed` and `load()` calls `#assertOpen()`, so a closed instance
      throws `sessionClosed` for ever. Reusing it is the obvious implementation and it would fail on
      the first role change.
    */
    expect(code).toContain('restartMediaSession = async () => {');
    const body = code.slice(
      code.indexOf('restartMediaSession = async () => {'),
      code.indexOf("media.on('newProducer'")
    );
    expect(body).toContain('previous?.close()');
    expect(body).toContain('new MediaSession(');
  });

  it('reuses the SAME signalling client', () => {
    // A second socket would leave the SFU holding two peers for one person, and the per-identity
    // connection cap is four.
    const body = code.slice(
      code.indexOf('restartMediaSession = async () => {'),
      code.indexOf("media.on('newProducer'")
    );
    /*
      `signalling`, not `media` — the local `const media = new SignallingClient(...)` was renamed on
      2026-08-15 because `RoomMedia` took that identifier at the top of the page and shadowed it,
      which `svelte-check` caught. The assertion is unchanged in meaning: the SAME client is reused.
    */
    expect(body).toContain('signalling,');
    expect(body).not.toContain('new SignallingClient(');
  });

  it("waits the capture's 3 seconds before re-initialising", () => {
    // Reconnecting into a teardown that has not finished is how you get two peers for one person.
    const handler = code.slice(code.indexOf("command?.cmd === 'giveMicScreen'"));
    expect(handler.slice(0, 2000)).toContain('setTimeout(() => void restart(), 3000)');
  });

  it('drops everything it was consuming, not just the screens', () => {
    /*
      Their transports are gone; a tab bar still painting them is a frozen picture pretending to be
      live, which is the exact failure the disconnect handler already guards against.

      This asserted `screenStreams.clear()`, and that was too weak in a way that mattered: it is not
      the map any dedupe guard reads. `addRemoteScreen` returns early on `sharedScreens`,
      `addRemoteWebcam` on `webcamPresenters`, `addRemoteAudio` on `remoteAudioStreams` — so the
      rebuild from `getProducers` immediately below found every producer already "known" and
      re-consumed none of them. The room came back from a role change to a blank bar and silence.

      `dropRemoteMedia()` clears the guards as well as the streams; what it must contain is pinned
      in `media-restart-contract.test.ts` so this assertion cannot be satisfied by an empty function.
    */
    const body = code.slice(
      code.indexOf('restartMediaSession = async () => {'),
      code.indexOf("media.on('newProducer'")
    );
    expect(body).toContain('dropRemoteMedia()');
  });
});
