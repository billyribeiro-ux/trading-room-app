import { describe, expect, it } from 'vitest';
import { deliverySuppressionReason, linkedAlertRoomIds } from './alert-delivery.js';

const eligible = {
  role: 2,
  banned: false,
  inactive: false,
  paused: false,
  inviteStatus: 'approved',
  notificationsState: 'active',
  alerterAppFcmUserOff: false,
  isFreeTrial: false,
  hasMobileApp: true,
  isMarketplaceUser: false,
  stripeSubscriptionStatus: null,
  stripeCurrentPeriodEnd: null,
  lastLoginAt: new Date('2026-09-01T00:00:00.000Z')
};

const now = new Date('2026-09-03T00:00:00.000Z');

describe('alert push eligibility', () => {
  it('requires a configured room app', () => {
    expect(deliverySuppressionReason(eligible, {}, false, now)).toBe('room-app-disabled');
  });

  it('honours the room-wide push kill switch at send time', () => {
    expect(deliverySuppressionReason(eligible, { diasableFCMAlerts: true }, true, now)).toBe('room-push-disabled');
  });

  it.each([
    [{ banned: true }, 'membership-ineligible'],
    [{ inactive: true }, 'membership-ineligible'],
    [{ inviteStatus: 'pending' }, 'membership-ineligible'],
    [{ paused: true }, 'notifications-disabled'],
    [{ notificationsState: 'unsubscribed' }, 'notifications-disabled'],
    [{ alerterAppFcmUserOff: true }, 'notifications-disabled']
  ] as const)('suppresses an ineligible member: %o', (patch, expected) => {
    expect(deliverySuppressionReason({ ...eligible, ...patch }, {}, true, now)).toBe(expected);
  });

  it('enforces trial and case-by-case app gates and otherwise permits delivery', () => {
    expect(deliverySuppressionReason({ ...eligible, isFreeTrial: true }, { freeTrialsGetApp: false }, true, now)).toBe(
      'trial-app-disabled'
    );
    expect(
      deliverySuppressionReason(
        { ...eligible, hasMobileApp: false },
        { ptrMobileAppCaseByCaseEnabled: true },
        true,
        now
      )
    ).toBe('member-app-disabled');
    expect(deliverySuppressionReason(eligible, {}, true, now)).toBeNull();
  });

  it.each(['canceled', 'unpaid', 'incomplete_expired', 'past_due', null] as const)(
    'fails closed for marketplace billing state %s',
    (stripeSubscriptionStatus) => {
      expect(
        deliverySuppressionReason({ ...eligible, isMarketplaceUser: true, stripeSubscriptionStatus }, {}, true, now)
      ).toBe('billing-ineligible');
    }
  );

  it('permits a current marketplace subscription and rejects an expired paid period', () => {
    const current = {
      ...eligible,
      isMarketplaceUser: true,
      stripeSubscriptionStatus: 'active',
      stripeCurrentPeriodEnd: new Date('2026-09-04T00:00:00.000Z')
    };
    expect(deliverySuppressionReason(current, {}, true, now)).toBeNull();
    expect(
      deliverySuppressionReason(
        { ...current, stripeCurrentPeriodEnd: new Date('2026-09-03T00:00:00.000Z') },
        {},
        true,
        now
      )
    ).toBe('billing-period-expired');
  });

  it('applies the captured login-age rule only after explicit authority gates', () => {
    expect(
      deliverySuppressionReason({ ...eligible, lastLoginAt: new Date('2026-08-19T23:59:59.999Z') }, {}, true, now)
    ).toBe('login-expired');
    expect(
      deliverySuppressionReason({ ...eligible, lastLoginAt: null }, { mobileAppExpireNotificationsDays: 14 }, true, now)
    ).toBe('login-age-unknown');
    expect(
      deliverySuppressionReason({ ...eligible, lastLoginAt: null }, { mobileAppExpireNotificationsDays: 0 }, true, now)
    ).toBeNull();
  });
});

describe('linked alert targets', () => {
  it('deduplicates, bounds and excludes the source room', () => {
    const raw = ['7', '8', '7', '9', ...Array.from({ length: 30 }, (_, index) => String(index + 10))].join(',');
    const ids = linkedAlertRoomIds(raw, 8, false);
    expect(ids).toHaveLength(20);
    expect(ids.slice(0, 3)).toEqual([7, 9, 10]);
    expect(ids).not.toContain(8);
  });

  it('returns no targets when this alert suppresses cross-posting', () => {
    expect(linkedAlertRoomIds('7,9', 8, true)).toEqual([]);
  });
});
