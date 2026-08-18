// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';

import { RoomMenus } from '#lib/room/menus.svelte.js';
import { RoomRoster } from '#lib/room/roster.svelte.js';
import { locationVisibleTo, rosterRowClass, rosterRowVisible } from '#lib/roster-gates.js';

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
  people: Entry[];
  session?: { onlyPresentersVisibleToViewers?: boolean; rosterVisibleToViewers?: boolean };
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
      menus: new RoomMenus(),
      roomEventsConnected: true,
      mediaConnected: true,
      chatAlertsDetached: false,
      rosterVisible: true,
      rosterCountVisible: true,
      archivesAvailable: true,
      rowVisible: (row: Entry) => rosterRowVisible(viewer, session, row),
      rosterRowClass,
      locationVisible: (row: Entry) => locationVisibleTo(viewer, row),
      canOpenRosterPrivateChat: () => true,
      mobileAppAvailable: true,
      benzingaVisible: false,
      benzingaUrl: '',
      benzingaLogoUrl: undefined,
      dumpVersion: 'test',
      onopenmodal: () => {},
      onopenrosteruserinfo: () => {},
      onopenrosterprivatechat: () => {},
      onmentionrosteruser: () => {},
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
