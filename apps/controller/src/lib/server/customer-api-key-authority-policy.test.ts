import { describe, expect, it } from 'vitest';
import {
  assertCustomerApiKeyAuthorityConfiguration,
  resolveCustomerApiKeyAuthorityMode
} from './customer-api-key-authority-policy.js';

describe('customer API-key authority policy', () => {
  it('defaults to legacy and refuses ambiguous values', () => {
    expect(resolveCustomerApiKeyAuthorityMode(undefined)).toBe('legacy');
    expect(resolveCustomerApiKeyAuthorityMode('rust')).toBe('rust');
    expect(() => resolveCustomerApiKeyAuthorityMode('dual')).toThrow(
      'CUSTOMER_API_KEY_AUTHORITY_MODE must be one of: legacy, rust.'
    );
  });

  it('requires the preceding authority slice, API endpoint, and dedicated encryption key', () => {
    expect(() =>
      assertCustomerApiKeyAuthorityConfiguration('rust', 'legacy', 'https://api.example.test', 'encryption-key')
    ).toThrow('ADMINISTRATOR_AUTHORITY_MODE=rust is required');
    expect(() => assertCustomerApiKeyAuthorityConfiguration('rust', 'rust', '', 'encryption-key')).toThrow(
      'TRADINGROOM_API_URL is required'
    );
    expect(() => assertCustomerApiKeyAuthorityConfiguration('rust', 'rust', 'https://api.example.test', '')).toThrow(
      'API_KEY_ENCRYPTION_KEY is required'
    );
    expect(() =>
      assertCustomerApiKeyAuthorityConfiguration('rust', 'rust', 'https://api.example.test', 'encryption-key')
    ).not.toThrow();
  });
});
