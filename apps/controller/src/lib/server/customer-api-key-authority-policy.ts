import type { AdministratorAuthorityMode } from './administrator-authority-policy.js';

export const CUSTOMER_API_KEY_AUTHORITY_MODES = ['legacy', 'rust'] as const;
export type CustomerApiKeyAuthorityMode = (typeof CUSTOMER_API_KEY_AUTHORITY_MODES)[number];

export function resolveCustomerApiKeyAuthorityMode(configured: string | undefined): CustomerApiKeyAuthorityMode {
  if (configured === undefined || configured === '') return 'legacy';
  if (CUSTOMER_API_KEY_AUTHORITY_MODES.includes(configured as CustomerApiKeyAuthorityMode)) {
    return configured as CustomerApiKeyAuthorityMode;
  }
  throw new Error(`CUSTOMER_API_KEY_AUTHORITY_MODE must be one of: ${CUSTOMER_API_KEY_AUTHORITY_MODES.join(', ')}.`);
}

export function assertCustomerApiKeyAuthorityConfiguration(
  mode: CustomerApiKeyAuthorityMode,
  administratorMode: AdministratorAuthorityMode,
  apiUrl: string | undefined,
  encryptionKey: string | undefined
): void {
  if (mode !== 'rust') return;
  if (administratorMode !== 'rust') {
    throw new Error('ADMINISTRATOR_AUTHORITY_MODE=rust is required when CUSTOMER_API_KEY_AUTHORITY_MODE=rust.');
  }
  if (!apiUrl?.trim()) {
    throw new Error('TRADINGROOM_API_URL is required when CUSTOMER_API_KEY_AUTHORITY_MODE=rust.');
  }
  if (!encryptionKey?.trim()) {
    throw new Error('API_KEY_ENCRYPTION_KEY is required when CUSTOMER_API_KEY_AUTHORITY_MODE=rust.');
  }
}
