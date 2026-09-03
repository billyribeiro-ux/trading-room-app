import { isHttpError, isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { redirectToConfiguredLocation } from './configured-redirect.js';

function capture(location: string): unknown {
  try {
    redirectToConfiguredLocation(location);
  } catch (cause) {
    return cause;
  }
}

describe('configured redirects', () => {
  it('permits same-origin paths and exact HTTP(S) destination origins', () => {
    for (const location of ['/account', 'joined', 'https://room.example/session?id=7']) {
      const result = capture(location);
      expect(isRedirect(result), location).toBe(true);
      expect(result).toMatchObject({ status: 303, location });
    }
  });

  it('fails closed for scheme-relative and executable protocols', () => {
    for (const location of ['//attacker.example/path', 'javascript:alert(1)', 'data:text/html,bad']) {
      const result = capture(location);
      expect(isHttpError(result, 500), location).toBe(true);
    }
  });
});
