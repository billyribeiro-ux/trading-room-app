import { readFileSync } from 'node:fs';
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
/**
 * The ACCOUNT's badge list, which is what the reference iterates (`ng-repeat="b in badgesList"`).
 *
 * Deliberately NOT in id order relative to what a member is assigned: the ordering assertion below
 * only means something if the account list and the member's list disagree about sequence.
 */
const accountBadges = [
  { id: 10, label: 'VIP', backgroundColor: '#003366', textColor: '#ffffff', imageUrl: null as string | null },
  { id: 20, label: 'Mentor', backgroundColor: '#8a2be2', textColor: '#f0f0f0', imageUrl: null as string | null },
  { id: 30, label: 'Sponsor', backgroundColor: '#111111', textColor: '#ffff00', imageUrl: 'data:image/png;base64,AAAA' }
];

function renderCell(member: Partial<Member>, settings: Record<string, unknown> = {}, wholeRow = false): string {
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
        visits: [],
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: accountBadges,
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
  if (wholeRow) return row;
  const cells = row.split('</td>');
  expect(cells.length, 'the row must have more than one cell').toBeGreaterThan(1);
  return cells[1];
}

/** The WHOLE row, for assertions about the Actions cell rather than the identity cell. */
function renderRow(member: Partial<Member>, settings: Record<string, unknown> = {}): string {
  return renderCell(member, settings, true);
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

describe('the two per-member grants — page.manageSession.html:545-551 and :592-598', () => {
  /*
    The four menu items that WRITE `hasMobileApp` and `hasFileAccess`.

    They matter more than their size suggests: without them the two columns have no writer, so the
    folder and large-phone icons above can never light up. An indicator with no cause is the same
    defect as a control with no effect, and it is the one this row would have shipped had the icons
    landed on their own.
  */
  it('offers the mobile pair only when the room is mobile case-by-case', () => {
    const on = renderRow({}, { ptrMobileAppCaseByCaseEnabled: true });
    expect(on).toContain('Enable Mobile App');
    expect(on).toContain('Disable Mobile App');
    expect(on).toContain('value="mobile-app"');

    const off = renderRow({}, {});
    expect(off).not.toContain('Enable Mobile App');
    expect(off).not.toContain('Disable Mobile App');
  });

  it('offers the files pair only when the room is file case-by-case', () => {
    const on = renderRow({}, { fileAccessCaseByCase: true });
    expect(on).toContain('Enable Files');
    expect(on).toContain('Disable Files');
    expect(on).toContain('value="file-access"');

    const off = renderRow({}, {});
    expect(off).not.toContain('Enable Files');
    expect(off).not.toContain('Disable Files');
  });

  it('posts opposite `granted` values for the enable and disable halves', () => {
    /*
      The failure this catches is two buttons that both grant — different labels, identical effect,
      which renders and passes a smoke test. Both hidden inputs are asserted, per grant.
    */
    for (const [setting, grant] of [
      ['ptrMobileAppCaseByCaseEnabled', 'mobile-app'],
      ['fileAccessCaseByCase', 'file-access']
    ]) {
      const html = renderRow({}, { [setting]: true });
      const posts = html.split(`value="${grant}"`).length - 1;
      expect(posts, grant).toBe(2);
      expect(html, grant).toContain('name="granted" value="on"');
      expect(html, grant).toContain('name="granted" value=""');
    }
  });

  it('paints only the DISABLE glyph red, which is all that tells the pair apart', () => {
    const mobile = renderRow({}, { ptrMobileAppCaseByCaseEnabled: true });
    expect(mobile).toContain('fa fa-mobile mg-red');
    const files = renderRow({}, { fileAccessCaseByCase: true });
    expect(files).toContain('fa fa-folder mg-red');
    /* SOLID `fa-folder` in the menu, OUTLINE `fa-folder-o` in the row icon. Two glyphs, kept as two. */
    expect(files).not.toContain('fa fa-folder-o mg-red');
  });

  it('gates the divider on the same setting, so neither submenu ends on a trailing rule', () => {
    const before = renderRow({}, {}).split('class="divider"').length - 1;
    const withBoth = renderRow({}, {
      ptrMobileAppCaseByCaseEnabled: true,
      fileAccessCaseByCase: true
    }).split('class="divider"').length - 1;
    expect(withBoth).toBe(before + 2);
  });
});

describe('the member’s badges on the row — page.manageSession.html:391-396', () => {
  /*
    Ours rendered badges only inside the row menu, so an operator could assign one and never see it.
    The reference paints them in the identity cell, between the Stripe block and the TRIAL span.
  */
  it('renders nothing when the member has none, even though the account has three', () => {
    const html = renderCell({ badges: [] });
    expect(html).not.toContain('mg-row-badges');
    expect(html).not.toContain('VIP');
  });

  it('renders only the badges this member actually has', () => {
    const html = renderCell({ badges: [10] });
    expect(html).toContain('mg-row-badges');
    expect(html).toContain('VIP');
    /* The negative half: an account badge the member does NOT hold must not appear. */
    expect(html).not.toContain('Mentor');
    expect(html).not.toContain('Sponsor');
  });

  it('orders by the ACCOUNT list, not by the order the member was assigned them', () => {
    /*
      `ng-repeat="b in badgesList" ng-if="user.badges.includes(b._id)"` — the outer loop is the
      account's list. Assigning 20 before 10 must still render VIP (10) first, so a column of rows
      is scannable. A row that iterated `member.badges` would render Mentor first and pass a test
      that only checked both are present.
    */
    const html = renderCell({ badges: [20, 10] });
    expect(html.indexOf('VIP')).toBeGreaterThan(-1);
    expect(html.indexOf('Mentor')).toBeGreaterThan(-1);
    expect(html.indexOf('VIP')).toBeLessThan(html.indexOf('Mentor'));
  });

  it('carries each badge’s own colours inline, because they come from the data', () => {
    const html = renderCell({ badges: [10, 20] });
    expect(html).toContain('background-color: #003366');
    expect(html).toContain('color: #ffffff');
    expect(html).toContain('background-color: #8a2be2');
    expect(html).toContain('color: #f0f0f0');
  });

  it('renders the IMAGE form for an image badge and suppresses its text', () => {
    const html = renderCell({ badges: [30] });
    expect(html).toContain('class="user-badge-img"');
    expect(html).toContain('data:image/png;base64,AAAA');
    /* `ng-hide` on the span with the same predicate as `ng-show` on the img: exactly one paints. */
    expect(html).not.toContain('>Sponsor<');
  });

  it('renders the TEXT form when there is no image, and no img element at all', () => {
    const html = renderCell({ badges: [10] });
    expect(html).toContain('>VIP<');
    expect(html).not.toContain('user-badge-img');
  });

  it('uses the image URL as the alt text, which is the reference’s own choice', () => {
    /* A badge image has no other text. Inventing alt copy would be inventing. */
    const html = renderCell({ badges: [30] });
    expect(html).toContain('alt="data:image/png;base64,AAAA"');
  });

  it('leads with two NON-BREAKING spaces, inside the block and before the first badge', () => {
    /*
      Nothing in CSS separates this block from the name before it — these two characters do.

      Asserted on the CODEPOINT, not on the entity text. Svelte decodes `&nbsp;` in the template and
      emits U+00A0, so a test matching the literal string `&nbsp;` fails against correct output —
      and, worse, a test matching `\s*` passes against two ORDINARY spaces, which collapse in HTML
      and would silently remove the gap. U+00A0 is the whole point of the markup.
    */
    const html = renderCell({ badges: [10] });
    const at = html.indexOf('mg-row-badges');
    const after = html.slice(html.indexOf('>', at) + 1);
    expect(after.slice(0, 2)).toBe('\u00a0\u00a0');
    expect(after.charCodeAt(0)).toBe(0x00a0);
    expect(after.charCodeAt(1)).toBe(0x00a0);
  });

  it('sits between the Stripe block and the TRIAL span, where the reference puts it', () => {
    const html = renderCell({
      badges: [10],
      isFreeTrial: true,
      isMarketplaceUser: true,
      stripeSubscriptionStatus: 'active'
    });
    const stripe = html.indexOf('stripe-mini');
    const badges = html.indexOf('mg-row-badges');
    const trial = html.indexOf('badge-danger-chat');
    expect(stripe).toBeGreaterThan(-1);
    expect(badges).toBeGreaterThan(stripe);
    expect(trial).toBeGreaterThan(badges);
  });
});

describe('the APPROVE button’s `btn-small` — page.manageSession.html:415', () => {
  /*
    `class="btn btn-small btn-warning"`. `btn-small` is the BOOTSTRAP 2 spelling; Bootstrap 3 renamed
    it to `btn-sm`. So it is INERT — the button renders at default size.

    Proven, not assumed: `.btn-small` is absent from `evidence-bootstrap-3.3.7.css` (which does carry
    `.btn-sm` and `.btn-xs`), absent from `evidence-dumps/TIER1-fetched/styles.css`, and absent from
    `theme.css`. Three stylesheets, all three read for the name.

    This test exists because the obvious "fix" is wrong. Changing `btn-small` to `btn-sm` would make
    the button VISIBLY SMALLER than the reference — `.btn-sm` has real padding, font-size, line-height
    and border-radius rules. A tidy-up that looks like a typo correction is a rendering regression.
  */
  /* `${cwd}/…` rather than a relative URL, matching `manage-panel-bootstrap3-contract.test.ts`:
     the sheet sits at the app root, two levels above this file, and vitest runs from the app root. */
  const BOOTSTRAP3 = readFileSync(`${process.cwd()}/evidence-bootstrap-3.3.7.css`, 'utf8');

  it('is a class Bootstrap 3 does not define, which is why it is safe to keep', () => {
    expect(BOOTSTRAP3).not.toContain('.btn-small');
    /* The control: the sheet really is Bootstrap 3, and really does define the class someone would
       "correct" it to. Without this, the assertion above would also pass on an empty file. */
    expect(BOOTSTRAP3).toContain('.btn-sm');
    expect(BOOTSTRAP3).toContain('.btn-xs');
  });

  it('is rendered on the APPROVE button, spelled the reference’s way', () => {
    const html = renderRow({ inviteStatus: 'pending' });
    expect(html).toContain('class="btn btn-small btn-warning"');
    /* If this ever becomes btn-sm, the button shrinks and stops matching. */
    expect(html).not.toContain('btn-sm btn-warning');
  });

  it('shows APPROVE only for a pending member', () => {
    expect(renderRow({ inviteStatus: 'pending' })).toContain('APPROVE');
    expect(renderRow({ inviteStatus: 'approved' })).not.toContain('APPROVE');
  });

  it('renders the label without the reference’s leading space, and that is correct', () => {
    /*
      The reference's markup is `> APPROVE</button>` — a leading space inside the button. Ours emits
      `>APPROVE<`, because the Svelte compiler trims leading whitespace in an element.

      NOT a defect, and deliberately NOT "fixed". A leading space at the start of a line box is
      collapsed away by HTML, so the two render identically. The only way to force it into the output
      is `&nbsp;`, which does NOT collapse — that would add a real gap the reference does not have,
      turning a cosmetic non-difference into a visible one.

      Asserted in this direction so the next person who notices the diff finds the reason here
      instead of "correcting" it.
    */
    const html = renderRow({ inviteStatus: 'pending' });
    expect(html).toContain('>APPROVE<');
    expect(html).not.toContain('>&nbsp;APPROVE<');
  });
});
