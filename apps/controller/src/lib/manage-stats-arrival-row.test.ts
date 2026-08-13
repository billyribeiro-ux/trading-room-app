import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The User Stats row, against `page.manageSession.html:739-754`.
 *
 * ## What changed, and why it needed a decision
 *
 * This table rendered one row per PERSON. The reference renders one per ARRIVAL — `statXrefs` — with
 * an IP and a lookup link, a browser, In/Out stamps and a duration. A member row carries none of
 * those, so the table could never have matched.
 *
 * The arrival rows existed (`room_sessions`) but were removed from this payload on 2026-08-11 after
 * two reviews: ~755 KB per load, on every tab, each row carrying a visitor's IP and email. The owner
 * ruled on 2026-08-13 to match the original. What survives from that review is the SHAPE of the fix:
 * the rows load on the Stats tab only, capped at 5,000, newest first, and the uncapped export still
 * reads at request time.
 *
 * ## The subtle one
 *
 * "Show Online Users Only" is a per-row `ng-hide`, NOT a filter — the row stays in the table and
 * `table-striped` keeps counting it. Reproduced deliberately (T5-12). A version that removed the
 * rows would look tidier and would not be the reference.
 */

const visit = {
  id: 1,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  ip: '203.0.113.7',
  isMobile: false,
  browser: 'Chrome 140',
  joinedAt: new Date('2026-08-07T17:05:00'),
  leftAt: new Date('2026-08-07T19:35:00'),
  isFreeTrial: false
};

function statsCell(visits: unknown[]): string {
  const body = render(Page as never, {
    props: {
      data: {
        room: {
          id: 1,
          shortCode: '3625',
          name: 'Live Room',
          publicId: 'abc',
          state: 'open',
          maxUsers: 100,
          recordedMaxCapacity: 150
        },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab: 'stats',
        tabs: [{ id: 'stats', label: 'User Stats', visible: true, strip: true }],
        entitlements: {},
        settings: {},
        landingHtml: '',
        users: [],
        rosterCount: 0,
        unsupportedFilter: null,
        visits,
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: [],
        schema: ROOM_SETTINGS,
        fieldByName: Object.fromEntries(ROOM_SETTINGS.map((d) => [d.name, d])),
        featureReadiness: {},
        wordpressShortcode: '',
        apiScopes: []
      },
      form: null
    } as never
  }).body;
  const at = body.indexOf('<tbody');
  expect(at, 'the stats tab must render a table body').toBeGreaterThan(-1);
  return body.slice(at, body.indexOf('</tbody>', at));
}

describe('the arrival row renders every cell the reference does', () => {
  it('numbers from zero, as ngRepeat’s $index does', () => {
    expect(statsCell([visit])).toContain('<td>0</td>');
  });

  it('shows the IP with the reference’s ip-api.com lookup link', () => {
    const html = statsCell([visit]);
    expect(html).toContain('http://ip-api.com/#203.0.113.7');
    expect(html).toContain('203.0.113.7 (lookup)');
    /* Not in the reference, and the one deliberate addition: an unguarded `target="_blank"` hands
       the opened page a `window.opener` handle back to this one. It changes nothing visible. */
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('shows the browser behind a desktop or mobile glyph, whichever the visit was', () => {
    expect(statsCell([visit])).toContain('fa fa-desktop');
    expect(statsCell([visit])).toContain('Chrome 140');
    expect(statsCell([{ ...visit, isMobile: true }])).toContain('fa fa-mobile');
    expect(statsCell([{ ...visit, isMobile: true }])).not.toContain('fa fa-desktop');
  });

  it('renders In and Out in the captured format, never the reader’s locale', () => {
    const html = statsCell([visit]);
    expect(html).toContain('In: 08/07/2026 @ 5:05PM');
    expect(html).toContain('Out 08/07/2026 @ 7:35PM');
  });

  it('computes duration in HOURS to two decimals, as `duration / 3600 | number: 2` does', () => {
    /* 17:05 to 19:35 is two and a half hours. */
    expect(statsCell([visit])).toContain('<td>2.50</td>');
  });

  it('leaves Out and Duration EMPTY for a visit still in progress', () => {
    /*
      `ng-hide="userStat.isOnline"` on the Out span, and an open visit has no duration yet. A running
      total would be inventing a number the reference does not show.

      Asserted on the WORD "Out", not on a date. The first version of this checked
      `not.toContain('Out 08/07/2026')` and passed against a version that rendered the label
      unconditionally — because `formatLastLogin(null)` yields an epoch date, so the string it was
      looking for was absent for the wrong reason. Found by a negative control that stayed green.
    */
    const html = statsCell([{ ...visit, leftAt: null }]);
    expect(html).not.toContain('Out ');
    expect(html).not.toContain('1970');
    expect(html).toContain('<td></td>');
  });

  it('renders the TRIAL badge from the joined membership', () => {
    /* `room_sessions` has no trial column — a visit is not a membership — so it is LEFT-joined from
       `room_users`, and a guest with no membership row is honestly false rather than missing. */
    expect(statsCell([{ ...visit, isFreeTrial: true }])).toContain('badge-danger-chat');
    expect(statsCell([visit])).not.toContain('badge-danger-chat');
  });

  it('renders one row per ARRIVAL, so the same person appears once per visit', () => {
    const html = statsCell([visit, { ...visit, id: 2, joinedAt: new Date('2026-08-08T09:00:00'), leftAt: null }]);
    expect(html.split('ada@example.com').length - 1).toBe(2);
  });
});

describe('the online filter HIDES rows rather than removing them — T5-12', () => {
  const SOURCE = readFileSync(
    new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url),
    'utf8'
  );

  it('drives the row with a `hidden` ATTRIBUTE, not an {#if} that would drop it', () => {
    /*
      The mechanism, asserted on the source, because SSR renders the checkbox off and both versions
      look identical in that state. `ng-hide` leaves the element in the DOM, so `table-striped`'s
      `nth-of-type` keeps counting it and the banding goes irregular when the filter is on. An
      `{#if}` would remove the row, tidy the striping, and stop matching the reference.
    */
    expect(SOURCE).toContain('<tr hidden={hiddenByOnline(row.leftAt)}>');
    expect(SOURCE).not.toContain('{#if !hiddenByOnline(row.leftAt)}');
  });

  it('renders every arrival row regardless, so the count is the data’s', () => {
    const html = statsCell([visit, { ...visit, id: 2, leftAt: null }]);
    expect(html.split('<tr').length - 1).toBe(2);
  });
});
