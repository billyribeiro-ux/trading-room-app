import { describe, expect, it } from 'vitest';
import { assertBadgeAuthorityConfiguration, resolveBadgeAuthorityMode } from './badge-authority-policy.js';

describe('badge authority policy', () => {
  it('defaults to legacy and refuses ambiguous values', () => {
    expect(resolveBadgeAuthorityMode(undefined)).toBe('legacy');
    expect(resolveBadgeAuthorityMode('rust')).toBe('rust');
    expect(() => resolveBadgeAuthorityMode('dual')).toThrow('BADGE_AUTHORITY_MODE must be one of: legacy, rust.');
  });

  it('requires the preceding authority slice and API endpoint', () => {
    expect(() => assertBadgeAuthorityConfiguration('rust', 'legacy', 'https://api.example.test')).toThrow(
      'MEMBERSHIP_AUTHORITY_MODE=rust is required'
    );
    expect(() => assertBadgeAuthorityConfiguration('rust', 'rust', '')).toThrow('TRADINGROOM_API_URL is required');
    expect(() => assertBadgeAuthorityConfiguration('rust', 'rust', 'https://api.example.test')).not.toThrow();
  });
});
