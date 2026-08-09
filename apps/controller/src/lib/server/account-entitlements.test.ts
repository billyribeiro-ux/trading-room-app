import { describe, expect, it } from 'vitest';
import { resolveAccountEntitlements } from './account-entitlements';

describe('account entitlements', () => {
  it('exposes every implemented account capability until subscription policy exists', () => {
    expect(resolveAccountEntitlements({ accountId: 1 })).toEqual({
      'text-list': true,
      sso: true,
      mobile: true,
      marketplace: true,
      'clone-room': true,
      'delete-room': true
    });
  });

  it('does not infer product restrictions from the captured demo account', () => {
    expect(Object.values(resolveAccountEntitlements({ accountId: 999 })).every(Boolean)).toBe(true);
  });
});
