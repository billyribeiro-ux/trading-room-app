import { describe, expect, it } from 'vitest';
import {
  assertAdministratorAuthorityConfiguration,
  resolveAdministratorAuthorityMode
} from './administrator-authority-policy.js';

describe('administrator authority policy', () => {
  it('defaults to legacy and refuses ambiguous values', () => {
    expect(resolveAdministratorAuthorityMode(undefined)).toBe('legacy');
    expect(resolveAdministratorAuthorityMode('rust')).toBe('rust');
    expect(() => resolveAdministratorAuthorityMode('dual')).toThrow(
      'ADMINISTRATOR_AUTHORITY_MODE must be one of: legacy, rust.'
    );
  });

  it('requires the preceding authority slice and API endpoint', () => {
    expect(() => assertAdministratorAuthorityConfiguration('rust', 'legacy', 'https://api.example.test')).toThrow(
      'BADGE_AUTHORITY_MODE=rust is required'
    );
    expect(() => assertAdministratorAuthorityConfiguration('rust', 'rust', '')).toThrow(
      'TRADINGROOM_API_URL is required'
    );
    expect(() => assertAdministratorAuthorityConfiguration('rust', 'rust', 'https://api.example.test')).not.toThrow();
  });
});
