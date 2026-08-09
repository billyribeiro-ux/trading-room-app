import { describe, expect, it } from 'vitest';
import { resolveFeatureReadiness } from './features';

describe('feature configuration readiness', () => {
  it('reports missing integration configuration without treating it as access denial', () => {
    expect(resolveFeatureReadiness({})).toEqual({
      'text-list': false,
      sso: false,
      mobile: false,
      marketplace: false
    });
  });

  it('derives readiness only from each integration setting', () => {
    expect(
      resolveFeatureReadiness({
        twillioApiToken: 'twilio-token',
        ssoHost: 'https://sso.example.test',
        ptrMobileAppEnabled: true,
        stripeEmail: 'billing@example.test'
      })
    ).toEqual({
      'text-list': true,
      sso: true,
      mobile: true,
      marketplace: true
    });
  });
});
