// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RANDOM_USER_REVEAL_MS, RoomRoster, type RosterMember } from './roster.svelte';

/*
  The fourth room state class. The reactivity block at the bottom is the one no other gate can see,
  and its shape is copied from `polls.svelte.test.ts` — mutations and flushes INSIDE `$effect.root`,
  assertions OUTSIDE it, because two earlier drafts in this repository proved nothing by getting
  that backwards.
*/

interface Member extends RosterMember {
  id: number;
  displayName: string;
  email: string;
}

const member = (over: Partial<Member> & { id: number }): Member => ({
  displayName: `user${over.id}`,
  email: `user${over.id}@example.com`,
  emailHash: `hash${over.id}`,
  ...over
});

const SEED = [member({ id: 1, displayName: 'seeded' })];

/** The page's two thunks, as a mutable fixture: a test can move `data` under the class. */
const rosterOf = (users: Member[] = [], simUserCount = 0) => {
  const sources = { users, simUserCount };
  const roster = new RoomRoster<Member>({
    seed: () => SEED,
    simUserCount: () => sources.simUserCount
  });
  if (users.length > 0) roster.rosterArrived(users);
  return { roster, sources };
};

describe('the seed stands in until the hub speaks', () => {
  it('starts on the page load’s own entry', () => {
    /*
      The page load can only ever describe THIS connection, so the list is one person until the
      first `getRoster` frame. Until that seed existed the badge counted every subscriber while the
      list rendered one hard-coded entry — a presenter saw "Users: 2" over a list of themselves.
    */
    const { roster } = rosterOf();
    expect(roster.users).toEqual(SEED);
  });

  it('and is replaced, not merged, by the first frame', () => {
    const { roster } = rosterOf();
    const live = [member({ id: 2 }), member({ id: 3 })];
    roster.rosterArrived(live);
    expect(roster.users).toEqual(live);
  });

  it('an EMPTY frame falls back to the seed rather than emptying the room', () => {
    /*
      `#live.length > 0` and not a null check, which is the reference's shape and worth pinning: a
      frame carrying nobody is indistinguishable from not having heard yet, and showing an empty
      roster to somebody who is demonstrably in the room is the worse of the two wrong answers.
    */
    const { roster } = rosterOf([member({ id: 2 })]);
    roster.rosterArrived([]);
    expect(roster.users).toEqual(SEED);
  });
});

describe('the badge count', () => {
  it('prefers the hub’s number over the list length', () => {
    const { roster } = rosterOf([member({ id: 2 })]);
    roster.countArrived(37);
    expect(roster.connectedCount).toBe(37);
  });

  it('falls back to the list until the first count frame, not to zero', () => {
    // Null is not 0. A badge that flashes through zero on every page load is the thing this avoids.
    const { roster } = rosterOf([member({ id: 2 }), member({ id: 3 })]);
    expect(roster.connectedCount).toBe(2);
  });

  it('and adds the session’s simulated users to either', () => {
    const { roster, sources } = rosterOf([member({ id: 2 })]);
    sources.simUserCount = 5;
    expect(roster.connectedCount, 'the list plus sim users').toBe(6);
    roster.countArrived(10);
    expect(roster.connectedCount, 'the hub count plus sim users').toBe(15);
  });
});

describe('the two pipes, which are a sort and a filter', () => {
  const unsorted = [
    member({ id: 1, displayName: 'Zoe', isFT: true }),
    member({ id: 2, displayName: 'adam' }),
    member({ id: 3, displayName: 'Mia', isFT: true })
  ];

  it('sorts by nick, case-insensitively, only when toggled on', () => {
    /*
      CASE-INSENSITIVELY, which is the assertion and not a detail: `adam` sorts before `Mia`. The
      comparator lowercases both sides, so a plain `.sort()` would disagree — 'Z' is code unit 90
      and 'a' is 97, and the whole lowercase half of the room would land after the uppercase half.
      A first draft of this expectation was written the wrong way round for exactly that reason.
    */
    const { roster } = rosterOf(unsorted);
    expect(roster.display.map((entry) => entry.displayName)).toEqual(['Zoe', 'adam', 'Mia']);

    roster.toggleSortByNick();
    expect(roster.display.map((entry) => entry.displayName)).toEqual(['adam', 'Mia', 'Zoe']);
  });

  it('"sort by trials" is a FILTER as much as a sort — it hides everyone else', () => {
    const { roster } = rosterOf(unsorted);
    roster.toggleTrialsOnly();
    expect(roster.display.map((entry) => entry.displayName)).toEqual(['Mia', 'Zoe']);
  });

  it('and neither pipe mutates the roster it was handed', () => {
    /*
      Both pipes call `.sort()` on the array upstream, mutating `globals.roster` in place. Doing
      that to reactive state would make the sort toggle rewrite the roster itself, which is why the
      helpers copy — asserted here because the copy is invisible until it is missing.
    */
    const { roster } = rosterOf(unsorted);
    const before = roster.users.map((entry) => entry.displayName);
    roster.toggleSortByNick();
    void roster.display;
    expect(roster.users.map((entry) => entry.displayName)).toEqual(before);
  });
});

describe('the search, which is a snapshot and not a live filter', () => {
  const people = [
    member({ id: 1, displayName: 'Alice' }),
    member({ id: 2, displayName: 'Bob' }),
    member({ id: 3, displayName: 'alicia' })
  ];

  it('matches on nick, case-insensitively', () => {
    const { roster } = rosterOf(people);
    roster.searchTerm = 'ali';
    roster.search();
    expect(roster.visible.map((entry) => entry.displayName)).toEqual(['Alice', 'alicia']);
  });

  it('and on an exact email, which is where the capture hashes instead', () => {
    const { roster } = rosterOf(people);
    roster.searchTerm = 'user2@example.com';
    roster.search();
    expect(roster.visible.map((entry) => entry.displayName)).toEqual(['Bob']);
  });

  it('holds its result while people join and leave', () => {
    /*
      The reason `#searched` is stored rather than derived. A live filter re-runs as the roster
      changes, which reads as results appearing under the cursor mid-scroll.
    */
    const { roster } = rosterOf(people);
    roster.searchTerm = 'ali';
    roster.search();
    expect(roster.visible).toHaveLength(2);

    roster.rosterArrived([...people, member({ id: 4, displayName: 'alina' })]);
    expect(roster.visible, 'a NEW frame clears the search entirely').toHaveLength(4);
  });

  it('a getRoster frame clears the TERM too, not just the result', () => {
    // `subscribe("getRoster", () => { this.visibleRoster = globals.roster; this.userSearchTermTxt = "" })`
    const { roster } = rosterOf(people);
    roster.searchTerm = 'ali';
    roster.search();
    roster.rosterArrived(people);
    expect(roster.searchTerm).toBe('');
  });

  it('a matching-nobody search is NOT the same as no search', () => {
    // An empty array is a search that found nobody; null is no search. Collapsing them would make
    // "no results" silently show the whole room.
    const { roster } = rosterOf(people);
    roster.searchTerm = 'nobody';
    roster.search();
    expect(roster.visible).toEqual([]);

    roster.clearSearch();
    expect(roster.visible).toHaveLength(3);
  });

  it('Enter on an EMPTY term clears rather than matching everything', () => {
    const { roster } = rosterOf(people);
    roster.searchTerm = 'ali';
    roster.submitSearch();
    expect(roster.visible).toHaveLength(2);

    roster.searchTerm = '';
    roster.submitSearch();
    expect(roster.visible).toHaveLength(3);
  });

  it('searches the LIVE roster, never the previous result', () => {
    // Searching a search would narrow with every Enter and leave no way back but clearing.
    const { roster } = rosterOf(people);
    roster.searchTerm = 'ali';
    roster.search();
    roster.searchTerm = 'bob';
    roster.search();
    expect(roster.visible.map((entry) => entry.displayName)).toEqual(['Bob']);
  });

  it('and the search panel toggles independently of the term', () => {
    const { roster } = rosterOf(people);
    expect(roster.searchOpen).toBe(false);
    roster.toggleSearch();
    expect(roster.searchOpen).toBe(true);
    roster.toggleSearch();
    expect(roster.searchOpen).toBe(false);
  });
});

describe('the random draw', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const room = () =>
    rosterOf([
      member({ id: 1, displayName: 'presenter', isP: true }),
      member({ id: 2, displayName: 'one', isFT: true }),
      member({ id: 3, displayName: 'two', isFT: true }),
      member({ id: 4, displayName: 'three' })
    ]).roster;

  it('draws a non-presenter and holds the name back for three seconds', () => {
    const roster = room();
    roster.draw(false);

    expect(roster.pick?.entry.isP, 'presenters are never drawn').toBeFalsy();
    expect(roster.pick?.revealed, 'the suspense IS the dialog').toBe(false);

    vi.advanceTimersByTime(RANDOM_USER_REVEAL_MS);
    expect(roster.pick?.revealed).toBe(true);
  });

  it('"Only select from Trials?" narrows the field rather than cancelling', () => {
    // Both answers run the same path — "Yes" only adds the isFT filter — so No is not a dismissal.
    const roster = room();
    roster.draw(true);
    expect(roster.pick?.entry.isFT).toBe(true);
  });

  it('and the two-candidate minimum is applied AFTER that filter, not before', () => {
    /*
      Found by a draft of the test above being wrong: its room had four people and only one trial,
      "Yes" produced nothing, and the assertion read as a broken draw. It is not — `randomUser(s)`
      receives the ALREADY-narrowed set upstream and its `if (o >= 2)` sees that length. So a busy
      room with one trial in it opens no dialog at all on "Yes", which looks like a dead button and
      is the reference's behaviour.
    */
    const oneTrial = rosterOf([
      member({ id: 1, displayName: 'presenter', isP: true }),
      member({ id: 2, displayName: 'only trial', isFT: true }),
      member({ id: 3, displayName: 'a' }),
      member({ id: 4, displayName: 'b' }),
      member({ id: 5, displayName: 'c' })
    ]).roster;

    oneTrial.draw(false);
    expect(oneTrial.pick, 'four non-presenters is plenty for an unfiltered draw').not.toBeNull();

    oneTrial.closeDraw();
    oneTrial.draw(true);
    expect(oneTrial.pick, 'one trial is below the minimum, so nothing opens').toBeNull();
  });

  it('opens NOTHING below two candidates, which is the reference having no else branch', () => {
    /*
      `var o = e.length; if (o >= 2) { … }`. Drawing a "random" user from a field of one is not a
      draw. An earlier version alerted "No users to pick from." and named the only candidate; the
      capture does neither.
    */
    const single = rosterOf([
      member({ id: 1, isP: true }),
      member({ id: 2, displayName: 'alone' })
    ]).roster;
    single.draw(false);
    expect(single.pick).toBeNull();
  });

  it('dedupes by email hash, so three tabs are one candidate', () => {
    // Without it the draw is weighted by how many windows somebody left open.
    const roster = rosterOf([
      member({ id: 1, displayName: 'same', emailHash: 'h' }),
      member({ id: 2, displayName: 'same', emailHash: 'h' }),
      member({ id: 3, displayName: 'same', emailHash: 'h' })
    ]).roster;
    roster.draw(false);
    expect(roster.pick, 'one unique candidate is below the minimum').toBeNull();
  });

  it('a dismissed draw cannot come back when its reveal finally fires', () => {
    /*
      HONEST NOTE ON WHAT THIS CAN AND CANNOT PROVE, because two drafts of it claimed more.

      Three things could stop a dismissed dialog reappearing: `closeDraw`'s `clearTimeout`, the
      `if (this.#pick)` in the reveal callback, and `draw`'s own `clearTimeout`. Only the THIRD is
      negative-controllable, and it is controlled by the test below this one — remove it and a stale
      timer reveals a newer pick early.

      The other two are redundant WITH EACH OTHER: delete the cancel and the null check catches it;
      delete the null check and the cancel means the callback never runs. Deleting either alone
      leaves this assertion green, which is exactly what happened, twice, before this note existed.
      Both are kept — defence in depth on an async callback is cheap — and the redundancy is named
      here so nobody removes one believing a test covers it.

      What the assertion IS, then: a regression guard on the observable behaviour. A dismissed
      dialog stays dismissed. That is worth pinning even though no single line owns it.
    */
    const roster = room();
    roster.draw(false);
    roster.closeDraw();
    vi.advanceTimersByTime(RANDOM_USER_REVEAL_MS);
    expect(roster.pick).toBeNull();
  });

  it('and a second draw restarts the three seconds rather than inheriting them', () => {
    const roster = room();
    roster.draw(false);
    vi.advanceTimersByTime(RANDOM_USER_REVEAL_MS - 100);
    roster.draw(false);

    vi.advanceTimersByTime(100);
    expect(roster.pick?.revealed, 'the first timer must not reveal the second pick').toBe(false);
    vi.advanceTimersByTime(RANDOM_USER_REVEAL_MS);
    expect(roster.pick?.revealed).toBe(true);
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  it('re-runs a reader as a roster frame arrives', () => {
    const { roster } = rosterOf();
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(roster.users.length);
      });
      flushSync();
      roster.rosterArrived([member({ id: 2 }), member({ id: 3 })]);
      flushSync();
    });
    stop();

    expect(seen, 'the roster frame did not reach the effect').toEqual([1, 2]);
  });

  it('and as the DERIVED display list is re-sorted', () => {
    /*
      Separate from the case above because a wiring that made `#live` reactive and left the derived
      chain stale would pass the first test while the sort button did nothing on screen.
    */
    const { roster } = rosterOf([
      member({ id: 1, displayName: 'Zoe' }),
      member({ id: 2, displayName: 'adam' })
    ]);
    const seen: string[][] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(roster.display.map((entry) => entry.displayName));
      });
      flushSync();
      roster.toggleSortByNick();
      flushSync();
    });
    stop();

    /*
      A LITERAL, not `[...].sort()`. The first draft built the expectation with the platform's own
      sort and it disagreed with the comparator under test — which is the same defect as writing a
      regex over text you do not control: the expectation stops being a statement about the code and
      becomes a second implementation that can be wrong on its own.
    */
    expect(seen.at(0)).toEqual(['Zoe', 'adam']);
    expect(seen.at(-1), 'the sort toggle is not reactive').toEqual(['adam', 'Zoe']);
  });

  it('and the badge follows the count without the list changing', () => {
    const { roster } = rosterOf([member({ id: 2 })]);
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(roster.connectedCount);
      });
      flushSync();
      roster.countArrived(50);
      flushSync();
    });
    stop();

    expect(seen, 'the count frame is not reactive').toEqual([1, 50]);
  });
});
