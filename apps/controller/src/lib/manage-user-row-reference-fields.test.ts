import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The eleven member fields migration `0010` added, rendered.
 *
 * ## Why this test exists at all
 *
 * Four of these icons were hardcoded `hidden` for weeks, under a comment reasoning — from a DOM
 * capture — that `ng-show="false"` was a literal. It is not: all four INTERPOLATE, and the captured
 * room simply had both case-by-case settings off. The whole Stripe block was worse: it hangs off
 * `ng-if="user.isMarketPlaceUser"`, and `ng-if` REMOVES the element, so it left nothing at all in
 * any capture. A test that only compared our render against a capture would have gone green on both
 * omissions forever, because the capture does not contain them either.
 *
 * So this is deliberately not a side-by-side against a capture. It asserts against the reference's
 * uncompiled TEMPLATE — `evidence-dumps/TIER1-fetched/views/page.manageSession.html:351-399` — which
 * is the only artifact that shows a conditional that never fired.
 *
 * ## The negative controls
 *
 * Each gate is exercised in BOTH states from the same fixture. An assertion that an icon appears
 * when its flag is true proves nothing on its own — the icon could be unconditional. The paired
 * assertion that it disappears when the flag is false is what makes it a test.
 */

const baseMember = {
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
  discordUserId: null as string | null,
  discordUsername: null as string | null,
  phone: null,
  avatarUrl: null,
  lastLoginAt: null,
  pushTokenCount: 0,
  hasFileAccess: false,
  hasMobileApp: false,
  alerterAppFcmUserOff: false,
  isMarketplaceUser: false,
  stripeSubscriptionStatus: null as string | null,
  stripeLastPaidAt: null as Date | null,
  stripeCurrentPeriodEnd: null as Date | null,
  stripeLastPaymentFailureAt: null as Date | null,
  stripeLastPaidAmount: null as number | null,
  stripeLastPaidCurrency: null as string | null
};

type Member = typeof baseMember;

/** The row's `<td>`, rendered with one member and the given room settings. */
function renderCell(member: Partial<Member>, settings: Record<string, unknown> = {}): string {
  const body = render(Page as never, {
    props: {
      data: {
        room: { id: 1, shortCode: '3625', name: 'Live Room', publicId: 'abc', state: 'open' },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab: 'users',
        tabs: [{ id: 'users', label: 'Users', visible: true, strip: true }],
        entitlements: {},
        settings,
        landingHtml: '',
        users: [{ ...baseMember, ...member }],
        unsupportedFilter: null,
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

  const tbody = body.slice(body.indexOf('<tbody'), body.indexOf('</tbody>'));
  const from = tbody.indexOf('<tr');
  expect(from, 'the rendered page must contain a user row').toBeGreaterThan(-1);
  /* Comments stripped: several carry the reference markup they document, and a test that matched
     inside them would pass on documentation rather than on output. */
  const row = tbody.slice(from).replace(/<!--[\s\S]*?-->/g, '');

  /*
    THE SECOND CELL ONLY — the identity cell. Everything this file asserts lives there.

    Scoping this wrong is how the first draft of this test manufactured five failures about working
    code. Matching over the whole `<tr>` also sweeps the Actions dropdown, which carries its own
    `fa fa-mobile` (Get App PIN, Show App Tokens, four notification items…) and its own
    `fa fa-clock-o` (Freshen Login Date). "No mobile icon on this row" counted nine, and "no clock
    icon" found the menu's.

    Split on the closing tag rather than parsing: `<td>` cannot nest, so index 1 is exactly the
    cell that follows the `{{$index}}` one.
  */
  const cells = row.split('</td>');
  expect(cells.length, 'the row must have more than one cell').toBeGreaterThan(1);
  return cells[1];
}

/**
 * Counts an icon by its exact Font Awesome class list rather than by substring.
 *
 * `includes('fa fa-mobile')` also matches `fa fa-mobile fa-2x`, so the small phone and the large
 * one are indistinguishable that way — which is precisely the pair this row has to tell apart.
 */
function iconCount(html: string, classList: string): number {
  return html.split(`class="${classList}"`).length - 1;
}

describe('the four conditional icons — page.manageSession.html:351-354', () => {
  it('shows the folder only when the room is case-by-case AND the member is granted', () => {
    const on = { fileAccessCaseByCase: true };
    expect(iconCount(renderCell({ hasFileAccess: true }, on), 'fa fa-folder-o fa-2x')).toBe(1);

    /* Both halves of the AND, each proven necessary on its own. */
    expect(iconCount(renderCell({ hasFileAccess: false }, on), 'fa fa-folder-o fa-2x')).toBe(0);
    expect(iconCount(renderCell({ hasFileAccess: true }, {}), 'fa fa-folder-o fa-2x')).toBe(0);
  });

  it('shows the large phone only when mobile case-by-case is on and the member has the app', () => {
    const on = { ptrMobileAppCaseByCaseEnabled: true };
    expect(iconCount(renderCell({ hasMobileApp: true }, on), 'fa fa-mobile fa-2x')).toBe(1);
    expect(iconCount(renderCell({ hasMobileApp: false }, on), 'fa fa-mobile fa-2x')).toBe(0);
    expect(iconCount(renderCell({ hasMobileApp: true }, {}), 'fa fa-mobile fa-2x')).toBe(0);
  });

  it('shows the small phone for a registered device only when case-by-case is OFF', () => {
    expect(iconCount(renderCell({ pushTokenCount: 2 }, {}), 'fa fa-mobile')).toBe(1);
    expect(iconCount(renderCell({ pushTokenCount: 0 }, {}), 'fa fa-mobile')).toBe(0);
    expect(
      iconCount(renderCell({ pushTokenCount: 2 }, { ptrMobileAppCaseByCaseEnabled: true }), 'fa fa-mobile')
    ).toBe(0);
  });

  it('shows the RED small phone when the member silenced their own notifications', () => {
    expect(iconCount(renderCell({ alerterAppFcmUserOff: true }, {}), 'fa fa-mobile mg-red')).toBe(1);
    expect(iconCount(renderCell({ alerterAppFcmUserOff: false }, {}), 'fa fa-mobile mg-red')).toBe(0);
    expect(
      iconCount(
        renderCell({ alerterAppFcmUserOff: true }, { ptrMobileAppCaseByCaseEnabled: true }),
        'fa fa-mobile mg-red'
      )
    ).toBe(0);
  });

  it('renders BOTH small phones for a member who registered a device and then silenced it', () => {
    /* Not mutually exclusive, and the pair is meaningful: reachable, but muted. The two large/small
       variants ARE exclusive — see the next test — but these two are not, and collapsing them into
       an if/else would lose the state an operator most needs to see. */
    const html = renderCell({ pushTokenCount: 1, alerterAppFcmUserOff: true }, {});
    expect(iconCount(html, 'fa fa-mobile')).toBe(1);
    expect(iconCount(html, 'fa fa-mobile mg-red')).toBe(1);
  });

  it('never shows the large phone and either small one together, in any combination', () => {
    /*
      Structural, not incidental: one branch requires `ptrMobileAppCaseByCaseEnabled` and the other
      two require its negation. Exhausted over all eight flag combinations rather than spot-checked.
    */
    for (const caseByCase of [true, false]) {
      for (const hasMobileApp of [true, false]) {
        for (const tokens of [0, 3]) {
          const html = renderCell(
            { hasMobileApp, pushTokenCount: tokens, alerterAppFcmUserOff: true },
            { ptrMobileAppCaseByCaseEnabled: caseByCase }
          );
          const large = iconCount(html, 'fa fa-mobile fa-2x');
          const small = iconCount(html, 'fa fa-mobile') + iconCount(html, 'fa fa-mobile mg-red');
          expect(large === 0 || small === 0, `caseByCase=${caseByCase} app=${hasMobileApp} tokens=${tokens}`).toBe(
            true
          );
        }
      }
    }
  });

  it('shows none of the four for a member with nothing set — the captured room’s state', () => {
    const html = renderCell({}, {});
    expect(iconCount(html, 'fa fa-folder-o fa-2x')).toBe(0);
    expect(iconCount(html, 'fa fa-mobile fa-2x')).toBe(0);
    expect(iconCount(html, 'fa fa-mobile')).toBe(0);
    expect(iconCount(html, 'fa fa-mobile mg-red')).toBe(0);
  });
});

describe('the Discord line — page.manageSession.html:362-364', () => {
  it('is gated on the ID and prints the USERNAME', () => {
    const html = renderCell({ discordUserId: '108431982739', discordUsername: 'ada#0001' });
    expect(html).toContain('Discord Username: ada#0001');
    /*
      The bug this fixes: the id was printed in both positions, so a linked member showed a numeric
      snowflake where the reference shows their name. Asserting the id is ABSENT from the cell is
      what catches a regression to it — an assertion that the username is present would still pass.
    */
    expect(html).not.toContain('108431982739');
  });

  it('does not render at all without the ID, even when a username exists', () => {
    const html = renderCell({ discordUserId: null, discordUsername: 'ada#0001' });
    expect(html).not.toContain('Discord Username');
    expect(html).not.toContain('ada#0001');
  });
});

describe('the Stripe / marketplace block — page.manageSession.html:365-389', () => {
  const paid = {
    isMarketplaceUser: true,
    stripeSubscriptionStatus: 'active',
    stripeLastPaidAt: new Date('2026-08-01T12:00:00Z'),
    stripeCurrentPeriodEnd: new Date('2026-09-01T12:00:00Z'),
    stripeLastPaidAmount: 4999,
    stripeLastPaidCurrency: 'USD'
  };

  it('is removed entirely for a member who is not a marketplace user', () => {
    /* `ng-if`, not `ng-show` — the reference REMOVES it, which is why it appears in no capture. */
    const html = renderCell({ ...paid, isMarketplaceUser: false });
    expect(html).not.toContain('stripe-mini');
    expect(html).not.toContain('fa-credit-card');
    expect(html).not.toContain('$49.99');
  });

  it('renders the status label with the class the reference computes', () => {
    const html = renderCell(paid);
    expect(html).toContain('stripe-mini');
    expect(html).toContain('label label-success');
    expect(html).toContain('fa fa-credit-card');
    expect(html).toContain('active');
  });

  it('falls back to the word "stripe" when there is no status, as the reference does', () => {
    const html = renderCell({ isMarketplaceUser: true, stripeSubscriptionStatus: null });
    expect(html).toContain('stripe');
    expect(html).toContain('label label-default');
  });

  it('paints a failed payment red and a healthy one not', () => {
    const failed = renderCell({ ...paid, stripeLastPaymentFailureAt: new Date('2026-08-10T12:00:00Z') });
    expect(failed).toContain('label label-danger');
    expect(failed).toContain('fa fa-exclamation-triangle');
    expect(renderCell(paid)).not.toContain('fa fa-exclamation-triangle');
  });

  it('formats the four dates as MM/dd/yyyy, the Angular filter the reference applies', () => {
    const html = renderCell(paid);
    expect(html).toContain('08/01/2026');
    expect(html).toContain('09/01/2026');
  });

  it('omits each optional label when its value is absent', () => {
    const html = renderCell({ isMarketplaceUser: true, stripeSubscriptionStatus: 'active' });
    expect(html).not.toContain('fa fa-calendar-check-o');
    expect(html).not.toContain('fa fa-clock-o');
    expect(html).not.toContain('fa fa-exclamation-triangle');
    expect(html).not.toContain('fa fa-usd');
  });

  it('renders the amount through formatMoney, in whole minor units', () => {
    expect(renderCell(paid)).toContain('$49.99');
  });

  it('DOES NOT reproduce the reference’s 100x zero-decimal bug', () => {
    /*
      The single most consequential assertion in this file. `formatStripeAmount` divides by 100
      unconditionally, so a ¥4,999 charge renders as "49.99 JPY" — a hundredfold understatement on
      every zero-decimal currency. `money.test.ts` holds that implementation as a negative control;
      this proves the ROW does not route around `formatMoney` and reintroduce it.
    */
    const html = renderCell({ ...paid, stripeLastPaidCurrency: 'JPY' });
    expect(html).toContain('4,999 JPY');
    expect(html).not.toContain('49.99');
  });

  it('does not render a Details control, because nothing says what it opens', () => {
    /*
      HONEST GAP, asserted so it cannot be closed by accident. The reference ends the block with an
      anchor whose ng-click is `openStripeDetails(user)`. That handler is in no capture, not in the
      template, and not among the handlers transcribed out of the bundle. Shipping the anchor with
      invented contents — or with none — would be a control whose only effect is its own presence.

      When the evidence arrives, this test fails and names what to do. That is the point of it.
    */
    const html = renderCell(paid);
    expect(html).not.toContain('fa-info-circle');
    expect(html).not.toContain('Details');
  });
});
