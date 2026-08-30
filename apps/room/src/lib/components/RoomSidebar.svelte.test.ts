// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { RoomMenus } from '#lib/room/menus.svelte.js';
import type { MessageBadge } from '#lib/types.js';
import { RoomRoster } from '#lib/room/roster.svelte.js';
import {
  locationVisibleTo,
  rosterRowClass,
  rosterRowIsFull,
  rosterRowVisible
} from '#lib/roster-gates.js';

import RoomSidebar from './RoomSidebar.svelte';

/*
  THE ROSTER, MOUNTED — and specifically the CLIENT half of the 2026-08-18 location fix.

  ## Why this component, and why now

  That day's security work moved `locStr` and `email` behind a per-recipient redaction in the SSE
  hub, because the wire had never been filtered and only the browser was declining to draw the city.
  `roster-privacy.test.ts` proves the server now withholds them.

  This proves the OTHER half: that even handed a location, a member's sidebar renders none. Two
  independent layers, each asserted, is what "fails closed" means for a field that is
  presenter-only — and it is the difference between a fix and a fix nobody can regress safely.

  It also closes a gap that was recorded and left open: this component had no mount coverage at all,
  and every assertion about it read source text. A source-text assertion can prove an `{#if}` exists.
  It cannot prove what a member's browser ends up with, which is the only question a privacy gate is
  actually asking.

  ## The gates are the REAL ones

  `rosterRowVisible`, `rosterRowClass` and `locationVisibleTo` are imported from `roster-gates.ts`
  and passed in exactly as `+page.svelte` passes them. Stubbing them would prove that this component
  calls a function, which is not in doubt; wiring the real ones proves the rendered DOM agrees with
  the truth table those gates are tested against.
*/

interface Entry {
  id: number;
  displayName: string;
  avatarUrl: string;
  email: string;
  emailHash: string;
  locStr: string;
  isP: boolean;
  isFT: boolean;
  hasAdminChat: boolean;
  userXrefID: string;
}

const entry = (over: Partial<Entry> & { id: number; displayName: string }): Entry => ({
  avatarUrl: '',
  email: `user${over.id}@example.test`,
  emailHash: `hash-${over.id}`,
  locStr: '',
  isP: false,
  isFT: false,
  hasAdminChat: false,
  userXrefID: String(over.id),
  ...over
});

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

/**
 * Mounts the sidebar open, with a real `RoomRoster` seeded from `people`.
 *
 * `session` DEFAULTS to `rosterVisibleToViewers`, and that default is load-bearing rather than
 * convenience. The first draft passed `{}`, under which `rosterRowVisible` admits no row for a
 * member at all — so "a member sees no location" passed while the roster was EMPTY. The positive
 * control below (`toHaveLength(2)` before the location assertion) is what turned that green into a
 * red, and it is why every test here counts rows before it says anything about their contents.
 */
const render = (options: {
  isPresenter: boolean;
  badgesFor?: (emailHash: string | null | undefined) => readonly MessageBadge[];
  people: Entry[];
  session?: {
    onlyPresentersVisibleToViewers?: boolean;
    rosterVisibleToViewers?: boolean;
    showOnlyUsernames?: boolean;
    /** RS-05 — the roster avatar's own gate, which is not the message log's. */
    hideAvatars?: boolean;
  };
  /*
    The two handlers a REDUCED roster row must keep. Optional, and defaulted to no-ops, so every
    existing call site is unchanged — only the tests that need to observe a click pass them.
  */
  onMention?: (name: string) => void;
  onUserInfo?: (name: string) => void;
  /** The "tip me" button, already resolved. Absent means the room has not configured one. */
  tip?: { visible: boolean; label: string; url: string };
  /** RS-11 — the two connection states, defaulted to a healthy room. */
  connected?: { roomEvents?: boolean; media?: boolean };
}) => {
  const roster = new RoomRoster<Entry>({
    seed: () => options.people,
    simUserCount: () => 0
  });
  const viewer = {
    isPresenter: options.isPresenter,
    email: 'viewer@example.test',
    userXrefID: 'viewer',
    hasAdminChat: false,
    isLimitedPresenter: false,
    denyArchivesAccess: false
  };
  const session = options.session ?? { rosterVisibleToViewers: true };

  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(RoomSidebar<Entry>, {
    target,
    props: {
      sidebarOpen: true,
      theme: 'dark' as const,
      isPresenter: options.isPresenter,
      session,
      roster,
      /*
        RS-02's resolver. Empty by default so the BASE render is a roster with no badges — the room
        most rooms are — and the tests that want one supply it through `options`.
      */
      badgesFor: options.badgesFor ?? (() => []),
      menus: new RoomMenus(),
      roomEventsConnected: options.connected?.roomEvents ?? true,
      mediaConnected: options.connected?.media ?? true,
      chatAlertsDetached: false,
      rosterVisible: true,
      rosterCountVisible: true,
      archivesAvailable: true,
      rowVisible: (row: Entry) => rosterRowVisible(viewer, session, row),
      rosterRowClass,
      locationVisible: (row: Entry) => locationVisibleTo(viewer, row),
      rowIsFull: (row: Entry) => rosterRowIsFull(row, session),
      tip: options.tip ?? { visible: false, label: '', url: '' },
      canOpenRosterPrivateChat: () => true,
      mobileAppAvailable: true,
      benzinga: { visible: false, url: null, logoUrl: null },
      dumpVersion: 'test',
      onopenmodal: () => {},
      onopenrosteruserinfo: (row: Entry) => options.onUserInfo?.(row.displayName),
      onopenrosterprivatechat: () => {},
      onmentionrosteruser: (row: Entry) => options.onMention?.(row.displayName),
      onselectuser: () => {},
      onusersearchkey: () => {},
      ongetmobilepin: () => {},
      ongetrandomuser: () => {},
      onopentranscript: () => {},
      onreopenalertschat: () => {},
      onreload: () => {}
    }
  });
  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
  return target;
};

describe('the roster renders nobody’s location to a member', () => {
  const people = [
    entry({ id: 1, displayName: 'Presenter One', isP: true, locStr: 'Waterbury, CT, US' }),
    entry({ id: 2, displayName: 'Member Two', locStr: 'Lisbon, PT' })
  ];

  it('a PRESENTER sees the city line', () => {
    // The positive control. Without it, the member assertion below could pass on a broken render.
    const dom = render({ isPresenter: true, people });
    expect(dom.querySelectorAll('.room-roster-container'), 'both people rendered').toHaveLength(2);
    const shown = [...dom.querySelectorAll('.userLocation')].map((node) =>
      node.textContent?.trim()
    );

    expect(shown.sort(), 'a presenter is the one role the reference shows it to').toEqual([
      'Lisbon, PT',
      'Waterbury, CT, US'
    ]);
  });

  it('a MEMBER sees no `.userLocation` element at all, even though the data carries one', () => {
    /*
      Note what the fixture does: it hands the component entries WITH a `locStr`, which after the
      hub fix a member would never actually receive. That is deliberate — this is the second layer,
      and a layer that only works when the first one already did is not a layer.
    */
    const dom = render({ isPresenter: false, people });

    /*
      THE POSITIVE CONTROL, and it earned its place immediately: without it this test passed against
      an EMPTY roster, because a member sees no rows at all unless the room sets
      `rosterVisibleToViewers`. An assertion that something is absent proves nothing until you have
      shown the thing it would be absent FROM is present.
    */
    expect(
      dom.querySelectorAll('.room-roster-container'),
      'both people must be rendered'
    ).toHaveLength(2);

    expect(
      dom.querySelectorAll('.userLocation').length,
      'the element must be absent, not merely empty or hidden'
    ).toBe(0);
    expect(
      dom.textContent,
      'and no city string may reach the DOM by any other route'
    ).not.toContain('Waterbury');
    expect(dom.textContent).not.toContain('Lisbon');
  });

  it('still renders the people themselves, so the redaction costs no rows', () => {
    // The obvious wrong fix for a leak is to drop the row. Both roles see both names.
    for (const isPresenter of [true, false]) {
      const dom = render({ isPresenter, people });
      expect(
        dom.textContent,
        `${isPresenter ? 'presenter' : 'member'} sees Presenter One`
      ).toContain('Presenter One');
      expect(dom.textContent).toContain('Member Two');
    }
  });

  it('renders no city for a person who has none, whoever is looking', () => {
    // `locationVisibleTo` requires a non-empty string, so an empty one draws nothing for anybody.
    const dom = render({
      isPresenter: true,
      people: [entry({ id: 3, displayName: 'No Location', locStr: '' })]
    });
    expect(dom.querySelectorAll('.userLocation').length).toBe(0);
  });
});

describe('the per-row visibility gate removes the row from the DOM', () => {
  it('a row the gate refuses is absent, not hidden', () => {
    /*
      `onlyPresentersVisibleToViewers` is the room setting behind it. Asserted at the DOM because
      "hidden" and "absent" look identical in a source-text assertion and are not the same thing:
      a hidden row is still in the document, still searchable, still readable in DevTools.
    */
    const dom = render({
      isPresenter: false,
      people: [
        entry({ id: 1, displayName: 'Presenter One', isP: true }),
        entry({ id: 2, displayName: 'Ordinary Member' })
      ],
      session: { onlyPresentersVisibleToViewers: true }
    });

    expect(dom.textContent, 'a presenter stays visible to a member').toContain('Presenter One');
    expect(
      dom.textContent,
      'and the ordinary member is not in the document at all in this room mode'
    ).not.toContain('Ordinary Member');
    expect(dom.querySelectorAll('.room-roster-container').length, 'one row, not two').toBe(1);
  });
});

/*
  "Show only usernames?" — and the assertion set is shaped by the mistake the setting invites.

  `O(1, !sessData.showOnlyUsernames || e.isP ? 1 : 2)` at bundle byte 2,035,670. **`e` is the ROW**,
  so this reduces MEMBER rows and leaves PRESENTER rows alone, for every viewer. The obvious reading
  — "members see only usernames" — is the exact inverse, and would have produced a room where a
  presenter could not see their own members' avatars.

  Every test below therefore renders BOTH kinds of row in one roster and asserts on the difference
  between them, rather than on a single row in isolation. A test that rendered one member and found
  no avatar would pass just as well under the inverted reading.
*/
describe('the roster row shape', () => {
  /*
    SCOPED TO THE ROSTER LIST, and by the const's own three classes.

    The first draft used `i.fa-user` and matched the sidebar's own "Get Random User" button, which
    carries `fas fa-user` eleven lines away. The reduced row's icon is const 23,
    `["fas","fa-user","m-1"]`, so the selector says all three — and every query is scoped to
    `.room-roster-list` so nothing outside the roster can satisfy an assertion about the roster.
  */
  const REDUCED = '.room-roster-list i.fas.fa-user.m-1';
  const FULL = '.room-roster-list img.rosterImg';

  const mixed = [
    entry({ id: 1, displayName: 'Member', isP: false }),
    entry({ id: 2, displayName: 'Presenter', isP: true })
  ];

  it('draws every row in full when the room has not set it', () => {
    const root = render({ isPresenter: true, people: mixed });
    expect(root.querySelectorAll('.room-roster-container'), 'positive control').toHaveLength(2);
    expect(root.querySelectorAll(FULL)).toHaveLength(2);
    expect(root.querySelectorAll(REDUCED)).toHaveLength(0);
  });

  it('reduces the MEMBER row and leaves the PRESENTER row in full', () => {
    const root = render({
      isPresenter: true,
      people: mixed,
      session: { rosterVisibleToViewers: true, showOnlyUsernames: true }
    });

    expect(root.querySelectorAll('.room-roster-container'), 'positive control').toHaveLength(2);
    // One of each, which is the assertion the inverted reading cannot satisfy.
    expect(root.querySelectorAll(FULL)).toHaveLength(1);
    expect(root.querySelectorAll(REDUCED)).toHaveLength(1);
    // …and it is the PRESENTER who keeps the avatar.
    expect(root.querySelector(FULL)?.getAttribute('alt')).toBe('Presenter');
  });

  it('reduces the same rows for a MEMBER viewer, because the gate has no viewer term', () => {
    const root = render({
      isPresenter: false,
      people: mixed,
      session: { rosterVisibleToViewers: true, showOnlyUsernames: true }
    });
    expect(root.querySelectorAll('.room-roster-container'), 'positive control').toHaveLength(2);
    expect(root.querySelectorAll(FULL)).toHaveLength(1);
    expect(root.querySelectorAll(REDUCED)).toHaveLength(1);
  });

  /*
    THE REDUCED ROW KEEPS ITS HANDLERS. `T2e` carries `(click)="doMention(nick)"` and
    `(dblclick)="doUserInfo(...)"` — only the chrome goes. A presenter must still be able to open a
    reduced row's info card, and a reduced row that could not be clicked would be a roster a
    moderator cannot moderate.
  */
  it('keeps the name clickable on a reduced row', () => {
    const mentioned: string[] = [];
    const opened: string[] = [];
    const root = render({
      isPresenter: true,
      people: [entry({ id: 1, displayName: 'Member' })],
      session: { rosterVisibleToViewers: true, showOnlyUsernames: true },
      onMention: (name) => mentioned.push(name),
      onUserInfo: (name) => opened.push(name)
    });

    const reduced = root.querySelector(REDUCED)?.parentElement;
    expect(reduced, 'the reduced row did not render').not.toBeNull();
    const name = reduced?.querySelector('span');
    expect(name?.textContent).toBe('Member');

    name?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    flushSync();
    expect(mentioned).toEqual(['Member']);

    name?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    flushSync();
    expect(opened).toEqual(['Member']);
  });
});

/*
  The tip button RENDERS, at both sites, and this is a mount rather than a source assertion for the
  reason the sidebar's other tests give: what can regress is whether the markup comes out, and a
  `toContain` on the file proves only that somebody typed it.

  ONE SITE IN THIS COMPONENT, corrected 2026-08-31 — and the correction is the interesting part.

  This said two: *"the reference draws this button twice — once in the app-info block and once
  beside Benzinga"*, and asserted two rendered buttons. SIDE-01 measured that and it is wrong.
  `TPe`, the sidebar, was read end to end from bundle byte 2,470,562 to 2,472,257 and has no tip
  `<li>` at any slot; its own node 14 is `T(14,"hr")`. The `H(14, APe, 5, 2, "li", 139)` this
  premise rested on belongs to `U4e`, the app-room NAVBAR, at 2,485,267.

  So the reference draws it twice in the ROOM, one per component — and this repository briefly drew
  it THREE times, because the navbar's copy was added without removing the sidebar `<li>` that the
  same row had just measured as not existing upstream. This test was green throughout: two rendered
  buttons is satisfied by two in the wrong places.

  What replaces it is narrower and says more: the sidebar draws it ONCE, as `aPe`'s `<p><button>`
  rather than an `<a>`, and `sidebar-tip-single-render-contract.test.ts` holds the same invariant
  across both files so a copy landing in either fails something.
*/
describe('the tip button', () => {
  const tip = { visible: true, label: 'Buy me a coffee', url: 'https://tip.test/me' };

  it('draws it exactly once when the room configured one', () => {
    const root = render({ isPresenter: false, people: [], tip });
    const buttons = root.querySelectorAll('i.fas.fa-dollar-sign');
    expect(
      buttons,
      'the sidebar draws `aPe` and nothing else; the navbar draws the other'
    ).toHaveLength(1);
    for (const node of root.querySelectorAll('span.ms-1')) {
      expect(node.textContent).toBe('Buy me a coffee');
    }
  });

  it('draws none when it did not', () => {
    const root = render({ isPresenter: false, people: [] });
    expect(root.querySelectorAll('i.fas.fa-dollar-sign')).toHaveLength(0);
  });

  it('is a button that opens the destination, not a link', () => {
    /*
      `aPe` is `<p><button>`. The `<a class="btn btn-primary">` this looked for was the removed
      `<li>`'s, so the assertion could only ever have passed while the extra render existed — it was
      testing the defect. The destination is opened by the handler rather than carried in an `href`,
      which is why there is no `rel` to assert: `window.open(tip.url, '_blank', 'noopener,noreferrer')`
      passes the same two tokens as window features.
    */
    const root = render({ isPresenter: false, people: [], tip });
    expect(
      root.querySelector('a.btn.btn-primary'),
      'the `<li><a>` form belongs to the navbar'
    ).toBeNull();
    const button = root.querySelector<HTMLButtonElement>('button.btn.btn-primary.btn-sm');
    expect(button, 'the sidebar draws `aPe`’s button').not.toBeNull();
    expect(button?.getAttribute('title')).toBe('Buy me a coffee');
    expect(root.querySelectorAll('[title="Buy me a coffee"]')).toHaveLength(1);
  });
});

/**
 * RS-01, RS-02 and RS-05 — the three roster-row gaps, and the third is the one that mattered.
 *
 * All three are rendered rather than read, because all three are `{#if}`s over data that reaches
 * the row: what can regress is the GATE resolving the other way, and a gate is only observable in
 * the markup it produces.
 */
describe('RS-05 — the roster avatar has its OWN gate', () => {
  /*
    `showUserAvatar(e) { return !this.appService.globals.sessData.hideAvatars || !!e }`
    at byte 2,036,617, applied as `O(1, i.showUserAvatar(e.isP) ? 1 : -1)`.
  */
  const people = [
    entry({ id: 1, displayName: 'Member' }),
    entry({ id: 2, displayName: 'Pres', isP: true })
  ];
  const avatars = (root: HTMLElement) => root.querySelectorAll('img.rosterImg').length;

  it('hides a MEMBER s avatar when the room hides avatars', () => {
    /*
      The defect: this rail rendered every avatar unconditionally, so a room that turned avatars off
      still published every member's picture here — a setting honoured in the message log and not in
      the list of everybody in the room.
    */
    const root = render({
      isPresenter: true,
      people,
      session: { rosterVisibleToViewers: true, hideAvatars: true }
    });
    expect(root.querySelectorAll('.room-roster-container'), 'both rows must render').toHaveLength(
      2
    );
    expect(avatars(root), "only the presenter's survives").toBe(1);
  });

  it('keeps a PRESENTER s, because a member has to be able to tell who runs the room', () => {
    /* `|| !!e` — the second term, and it is the whole reason this gate is not the log's. */
    const root = render({
      isPresenter: true,
      people: [entry({ id: 2, displayName: 'Pres', isP: true })],
      session: { rosterVisibleToViewers: true, hideAvatars: true }
    });
    expect(avatars(root)).toBe(1);
  });

  it('shows both when the room does not hide avatars, which is the control', () => {
    const root = render({
      isPresenter: true,
      people,
      session: { rosterVisibleToViewers: true }
    });
    expect(avatars(root)).toBe(2);
  });
});

describe('RS-02 — the badges div was rendered ALWAYS and EMPTY', () => {
  const badge = { text: 'VIP', color: '#eee', backgroundColor: '#111' };

  it('fills it from the same resolver the message rows use', () => {
    /*
      `O(6, e.data.badges ? 6 : -1)` with `parseBadges(e.data.badges)` — const 8's class list was
      here with no content and no gate, which is a wrapper nobody fills.
    */
    const root = render({
      isPresenter: false,
      people: [entry({ id: 1, displayName: 'Member' })],
      badgesFor: () => [badge]
    });
    const chip = root.querySelector('.user-badge');
    expect(chip, 'the badge is not rendered').not.toBeNull();
    expect(chip?.textContent).toBe('VIP');
  });

  it('renders NOTHING when the member wears none, rather than an empty wrapper', () => {
    /* The half that was wrong before: an element with a class list and no reason to exist. */
    const root = render({
      isPresenter: false,
      people: [entry({ id: 1, displayName: 'Member' })]
    });
    expect(root.querySelectorAll('.room-roster-container')).toHaveLength(1);
    expect(root.querySelector('.user-badge')).toBeNull();
    expect(root.querySelector('.d-inline-block.align-baseline.mr-1')).toBeNull();
  });
});

describe('RS-01 — the Trial chip', () => {
  const trial = entry({ id: 3, displayName: 'Trialist', isFT: true });

  it('is shown to a PRESENTER, which is the one distinction the list is used to make', () => {
    /* `O(7, i.appService.globals.isPresenter && e.isFT ? 7 : -1)` at byte 2,034,694. */
    const root = render({ isPresenter: true, people: [trial] });
    expect(root.querySelector('.trial-badge')?.textContent).toBe('Trial');
  });

  it('is NOT shown to a member, and not shown for a non-trial', () => {
    /* Two controls, and they fail differently: one is the viewer gate, one is the row s own flag. */
    expect(
      render({ isPresenter: false, people: [trial] }).querySelector('.trial-badge')
    ).toBeNull();
    expect(
      render({
        isPresenter: true,
        people: [entry({ id: 4, displayName: 'Paid' })]
      }).querySelector('.trial-badge')
    ).toBeNull();
  });
});

describe('RS-10 and RS-11 — the info block s order and its four connection nodes', () => {
  const people = [entry({ id: 1, displayName: 'Member' })];

  /** Every `<p>` and `<span>` in the info `<li>`, in document order, as trimmed text. */
  const infoLines = (dom: HTMLElement) =>
    [...dom.querySelectorAll('li.nav-item p')].map((p) => (p.textContent ?? '').trim());

  it('RS-11 — draws the two SUCCESS marks as spans in ONE p, Chat first', () => {
    /*
      `d(17,"p"), H(18,dPe,3,0,"span")(19,uPe,3,0,"span")` with
      `O(18, socketConnected ? 18 : -1)` and `O(19, mediaSoupService.connected ? 19 : -1)`.
      We drew one `<p>` per service, so a healthy room got two stacked lines where the reference
      gives one — and CHAT came second.
    */
    const dom = render({ isPresenter: false, people });
    const spans = [...dom.querySelectorAll('li.nav-item p span')].map((s) =>
      (s.textContent ?? '').trim()
    );
    expect(spans).toContain('Chat');
    expect(spans).toContain('Media');
    expect(spans.indexOf('Chat'), 'Chat comes first').toBeLessThan(spans.indexOf('Media'));

    /* Both marks in the SAME paragraph, which is the shape half of the row. */
    const shared = [...dom.querySelectorAll('li.nav-item p')].filter(
      (p) => p.querySelectorAll('span').length === 2
    );
    expect(shared, 'the two ticks share one <p>').toHaveLength(1);
  });

  it('RS-11 — draws each FAILURE as its own p, and only while it is failing', () => {
    /* `H(15,lPe,3,0,"p")(16,cPe,3,0,"p")` — sentences, and a sentence gets a line. */
    const down = render({
      isPresenter: false,
      people,
      connected: { roomEvents: false, media: false }
    });
    const lines = infoLines(down);
    expect(lines.some((l) => l.includes('Reconnecting Chat...'))).toBe(true);
    expect(lines.some((l) => l.includes('Reconnecting Media...'))).toBe(true);
    /* And they are separate paragraphs, not one line carrying both. */
    expect(lines.filter((l) => l.includes('Reconnecting')).length).toBe(2);

    /* The control: a healthy room says neither. */
    expect(infoLines(render({ isPresenter: false, people })).join(' ')).not.toContain(
      'Reconnecting'
    );
  });

  it('RS-10 — Mobile App Info comes before the tip button', () => {
    /*
      `H(12, rPe, …)(13, aPe, …)` at byte 2,470,612. Both are `<p>` buttons in the same block, so
      the one a member's eye lands on first is whichever the room happens to have configured; the
      reference puts the thing the ROOM offers before the thing the PRESENTER asks for.
    */
    const dom = render({
      isPresenter: false,
      people,
      tip: { visible: true, label: 'Tip Me', url: 'https://example.test/tip' }
    });
    const buttons = [...dom.querySelectorAll('li.nav-item p button')].map((b) =>
      (b.textContent ?? '').trim()
    );
    expect(buttons).toEqual(['Mobile App Info', 'Tip Me']);
  });
});
