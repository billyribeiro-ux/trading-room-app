/**
 * Account-level product visibility.
 *
 * The authenticated reference capture is a restricted demo tenant. Its
 * `disableMarketplace` value is evidence about that tenant's entitlements, not
 * evidence that Marketplace is absent from the product. Until subscription
 * records are introduced, this build intentionally exposes every implemented
 * account-level capability.
 *
 * Keep this policy server-only. When real plans are persisted, this resolver is
 * the single boundary that maps an authenticated account and its subscription
 * to product entitlements. Route authorization must use the same policy; hiding
 * a control in the browser is never an authorization check.
 */

export interface AccountEntitlements {
  readonly 'text-list': boolean;
  readonly sso: boolean;
  readonly mobile: boolean;
  readonly marketplace: boolean;
  readonly 'clone-room': boolean;
  readonly 'delete-room': boolean;
}

export interface AccountEntitlementSubject {
  readonly accountId: number;
}

const FULL_PRODUCT_ENTITLEMENTS = Object.freeze({
  'text-list': true,
  sso: true,
  mobile: true,
  marketplace: true,
  'clone-room': true,
  'delete-room': true
}) satisfies AccountEntitlements;

export function resolveAccountEntitlements(subject: AccountEntitlementSubject): AccountEntitlements {
  void subject;
  return FULL_PRODUCT_ENTITLEMENTS;
}
