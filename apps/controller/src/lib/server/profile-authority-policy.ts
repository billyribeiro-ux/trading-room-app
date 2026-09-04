import type { AccountBootstrap } from './tradingroom-api.generated';

export const PROFILE_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type ProfileAuthorityMode = (typeof PROFILE_AUTHORITY_MODES)[number];

export function resolveProfileAuthorityMode(configured: string | undefined): ProfileAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (configured === 'legacy' || configured === 'rust') return configured;
  throw new Error(`PROFILE_AUTHORITY_MODE must be one of: ${PROFILE_AUTHORITY_MODES.join(', ')}.`);
}

export function assertProfileAuthorityConfiguration(
  mode: ProfileAuthorityMode,
  tradingRoomApiUrl: string | undefined
): void {
  if (mode === 'rust' && !tradingRoomApiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when PROFILE_AUTHORITY_MODE=rust.');
  }
}

export interface LegacyAuthorityMapping {
  authorityUserId: string | null;
  authorityEnterpriseId: string | null;
}

/**
 * Returns the exact reason a canonical response cannot be bound to the controller session.
 *
 * There is deliberately no matching by email, display name, array position, or room id. Those are
 * mutable or non-unique. The offline converter writes one-to-one UUID mappings and runtime either
 * proves both mappings or refuses the response.
 */
export function authorityBindingFailure(
  local: LegacyAuthorityMapping,
  bootstrap: AccountBootstrap
): string | undefined {
  if (!local.authorityUserId || !local.authorityEnterpriseId) return 'legacy identity is not reconciled';
  if (bootstrap.user.id !== local.authorityUserId) return 'canonical user id does not match the session mapping';
  if (bootstrap.user.isGuest) return 'an account session resolved to a guest identity';
  if (!bootstrap.accounts.some((account) => account.id === local.authorityEnterpriseId)) {
    return 'canonical enterprise membership does not match the session mapping';
  }
  return undefined;
}
