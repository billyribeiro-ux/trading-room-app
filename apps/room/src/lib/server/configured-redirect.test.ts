import { isHttpError, isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { redirectToConfiguredLocation } from './control-plane.js';

function capture(location: string): unknown {
  try {
    redirectToConfiguredLocation(location);
  } catch (cause) {
    return cause;
  }
}

describe('configured room-entry redirects', () => {
  it('allows local paths and an explicitly selected HTTP(S) origin', () => {
    for (const location of ['/login-error', 'retry', 'https://customer.example/denied']) {
      const result = capture(location);
      expect(isRedirect(result), location).toBe(true);
      expect(result).toMatchObject({ status: 303, location });
    }
  });

  it('rejects scheme-relative and executable targets', () => {
    for (const location of [
      '//attacker.example/path',
      'javascript:alert(1)',
      'data:text/html,bad'
    ]) {
      expect(isHttpError(capture(location), 500), location).toBe(true);
    }
  });
});
