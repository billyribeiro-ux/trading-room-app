import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The panel title's `Current: N / Max M`, and the two bugs that were in it.
 *
 * ## What the evidence says
 *
 * `page.manageSession.html:10` renders TWO different fields next to a `resetMaxCount()` button:
 *
 *     Current …: {{sess.current_capacity}} / Max … {{sess.recordedMaxCapacity}}
 *
 * and the reference's own API documentation — in this repository at `#lib/content/api-docs.ts:127`,
 * transcribed from the original — lists THREE:
 *
 *     "current_capacity":     25    live occupancy
 *     "current_max":         100    the configured limit
 *     "recordedMaxCapacity": 150    the high-water mark
 *
 * The mark EXCEEDING the limit in the reference's own example is what settles that it is a recorded
 * observation rather than configuration, and therefore what "Reset Counts" clears.
 *
 * ## The two bugs
 *
 * 1. **"Current" was the FILTERED list.** It read `data.users.length`, which is what survives the
 *    search box and the seven list filters — so typing a name into search made a room-occupancy
 *    readout say 1.
 * 2. **"Max" was the CONFIGURED limit, and the reset destroyed it.** `resetMaxCount` set `maxUsers`
 *    to 0, and `maxUsers` is the value `internal/room-config/[code]` ships to the room. A button
 *    labelled "Reset Counts" was wiping configuration.
 */

const member = {
  id: 1,
  userId: 1,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 2,
  banned: false,
  muted: false,
  paused: false,
  nonPresenter: false,
  note: null,
  badges: [] as number[],
  badgesJson: '[]',
  permissions: { hasMic: false, hasCam: false, hasScreen: false, hasAdminChat: false, canEditNotes: false },
  permissionsJson: '{}',
  isFreeTrial: false,
  hideUserCount: false,
  hidePersInfo: false,
  denyArchivesAccess: false,
  restrictPmUser: false,
  inactive: false,
  hasPassword: false,
  mobilePairCode: null,
  notificationsState: 'active',
  inviteStatus: 'approved',
  discordUserId: null,
  discordUsername: null,
  phone: null,
  avatarUrl: null,
  lastLoginAt: null,
  pushTokenCount: 0,
  hasFileAccess: false,
  hasMobileApp: false,
  alerterAppFcmUserOff: false,
  isMarketplaceUser: false,
  stripeSubscriptionStatus: null,
  stripeLastPaidAt: null,
  stripeCurrentPeriodEnd: null,
  stripeLastPaymentFailureAt: null,
  stripeLastPaidAmount: null,
  stripeLastPaidCurrency: null
};

/** The whole rendered page, for assertions outside the panel title. */
function page(over: {
  users?: unknown[];
  rosterCount?: number;
  maxUsers?: number;
  recordedMaxCapacity?: number;
}): string {
  return renderPage(over);
}

/**
 * The panel TITLE element only.
 *
 * Scoped deliberately and tightly: the capacity assertions below include negative ones — "the
 * configured limit 100 must NOT appear" — and over the whole page a bare `100` would match a
 * setting value, a pixel width or a member id, so a scoped slice is what makes the negative
 * assertion mean anything.
 */
function renderPage(over: {
  users?: unknown[];
  rosterCount?: number;
  maxUsers?: number;
  recordedMaxCapacity?: number;
}): string {
  return render(Page as never, {
    props: {
      data: {
        room: {
          id: 1,
          shortCode: '3625',
          name: 'Live Room',
          publicId: 'abc',
          state: 'open',
          maxUsers: over.maxUsers ?? 100,
          recordedMaxCapacity: over.recordedMaxCapacity ?? 150
        },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab: 'users',
        tabs: [{ id: 'users', label: 'Users', visible: true, strip: true }],
        entitlements: {},
        settings: {},
        landingHtml: '',
        users: over.users ?? [member],
        rosterCount: over.rosterCount ?? 1,
        unsupportedFilter: null,
        visits: [],
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
}

function title(over: {
  users?: unknown[];
  rosterCount?: number;
  maxUsers?: number;
  recordedMaxCapacity?: number;
}): string {
  const body = renderPage(over);
  const at = body.indexOf('panel-title');
  expect(at, 'the page must render a panel title').toBeGreaterThan(-1);
  /* Up to the Launch anchor, which is the first thing after the capacity span and the reset form. */
  const end = body.indexOf('<a', at);
  expect(end, 'the title must be followed by the Launch anchor').toBeGreaterThan(at);
  return body.slice(at, end);
}

describe('the panel title’s capacity readout', () => {
  it('shows the WHOLE roster as Current, not the filtered list', () => {
    /*
      The failing case, concretely: a room of 250 people, filtered down to one by a search. Before the
      fix this read "Current: 1". `rosterCount` is counted with `count(*)` before any filter runs.
    */
    const html = title({ users: [member], rosterCount: 250 });
    expect(html).toContain('250');
  });

  it('does NOT fall back to the filtered list length', () => {
    /* The negative half: with a roster of 250 and one row rendered, a "1" next to Current is the bug.
       Asserted on the rendered fragment `: 1 /`, which is the exact shape the defect produced. */
    const html = title({ users: [member], rosterCount: 250 });
    expect(html).not.toMatch(/Current[^/]*?:\s*1\s*\//);
  });

  it('shows the HIGH-WATER MARK as Max, not the configured limit', () => {
    /* 150 vs 100 — the reference's own two example values, chosen so one cannot stand in for the
       other. A row rendering the limit would show 100 here. */
    const html = title({ maxUsers: 100, recordedMaxCapacity: 150 });
    expect(html).toContain('150');
    expect(html).not.toContain('100');
  });

  it('renders a zero high-water mark as 0 rather than hiding it', () => {
    /* 0 is what a room that has never had a subscriber reads, and since 2026-08-31 that is a real
       observation rather than the absence of a writer: `internal/room-occupancy/[code]` raises the
       mark on every new peak. It must still render — a blank would say "unknown", which is a
       different claim from "never exceeded zero". */
    const html = title({ recordedMaxCapacity: 0, rosterCount: 7 });
    expect(html).toContain('0');
    expect(html).toContain('7');
  });
});

describe('the Select All / Unselect All label — page.manageSession.html:258', () => {
  /*
    The reference has TWO spans on the same label:

      <span ng-if="!checkedAllUsers">Select All</span>
      <span ng-if="checkedAllUsers">Unselect All</span>

    Ours rendered only the first, under a comment claiming the reference "drops the words once every
    row is checked, leaving a bare checkbox". That was read off a capture taken with nothing
    selected, where the second `ng-if` had removed its span and left nothing to see. The label
    TOGGLES. Same mistake as the four `ng-show="false"` icons, and only the source shows it.

    ASSERTED ON THE COMPONENT SOURCE, not on a render, and deliberately: `allSelected` is client
    state that SSR always renders false, so a server render can only ever show the "Select All" half.
    A test that rendered would pass just as happily against the one-span version — which is exactly
    what happened when the fix was first made and no negative control went red.
  */
  const SOURCE = readFileSync(
    new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url),
    'utf8'
  );

  it('carries BOTH labels, each on its own branch of the same condition', () => {
    expect(SOURCE).toContain('<span>Unselect All</span>');
    expect(SOURCE).toContain('<span>Select All</span>');
    expect(SOURCE).toMatch(/\{#if allSelected\}<span>Unselect All<\/span>\{:else\}<span>Select All<\/span>\{\/if\}/);
  });

  it('does not render the one-sided version that hid the label entirely', () => {
    /* The exact shape of the defect: a lone `{#if !allSelected}` with no else. */
    expect(SOURCE).not.toMatch(/\{#if !allSelected\}<span>Select All<\/span>\{\/if\}/);
  });

  it('renders Select All on the server, where nothing is selected yet', () => {
    expect(page({ rosterCount: 3 })).toContain('Select All');
  });
});
