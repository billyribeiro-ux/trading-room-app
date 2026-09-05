import type { BadgeAuthorityMode } from './badge-authority-policy.js';

export const ADMINISTRATOR_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type AdministratorAuthorityMode = (typeof ADMINISTRATOR_AUTHORITY_MODES)[number];

export function resolveAdministratorAuthorityMode(configured: string | undefined): AdministratorAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (ADMINISTRATOR_AUTHORITY_MODES.includes(configured as AdministratorAuthorityMode)) {
    return configured as AdministratorAuthorityMode;
  }
  throw new Error(`ADMINISTRATOR_AUTHORITY_MODE must be one of: ${ADMINISTRATOR_AUTHORITY_MODES.join(', ')}.`);
}

export function assertAdministratorAuthorityConfiguration(
  administratorMode: AdministratorAuthorityMode,
  badgeMode: BadgeAuthorityMode,
  apiUrl: string | undefined
): void {
  if (administratorMode !== 'rust') return;
  if (badgeMode !== 'rust') {
    throw new Error('BADGE_AUTHORITY_MODE=rust is required when ADMINISTRATOR_AUTHORITY_MODE=rust.');
  }
  if (!apiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when ADMINISTRATOR_AUTHORITY_MODE=rust.');
  }
}
