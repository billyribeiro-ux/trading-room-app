import type { MembershipAuthorityMode } from './membership-authority-policy.js';

export const BADGE_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type BadgeAuthorityMode = (typeof BADGE_AUTHORITY_MODES)[number];

export function resolveBadgeAuthorityMode(configured: string | undefined): BadgeAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (BADGE_AUTHORITY_MODES.includes(configured as BadgeAuthorityMode)) {
    return configured as BadgeAuthorityMode;
  }
  throw new Error(`BADGE_AUTHORITY_MODE must be one of: ${BADGE_AUTHORITY_MODES.join(', ')}.`);
}

export function assertBadgeAuthorityConfiguration(
  badgeMode: BadgeAuthorityMode,
  membershipMode: MembershipAuthorityMode,
  apiUrl: string | undefined
): void {
  if (badgeMode !== 'rust') return;
  if (membershipMode !== 'rust') {
    throw new Error('MEMBERSHIP_AUTHORITY_MODE=rust is required when BADGE_AUTHORITY_MODE=rust.');
  }
  if (!apiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when BADGE_AUTHORITY_MODE=rust.');
  }
}
