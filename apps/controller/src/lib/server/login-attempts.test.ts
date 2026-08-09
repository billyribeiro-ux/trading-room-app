import { describe, expect, it } from 'vitest';
import { LOGIN_ATTEMPT_WINDOW_MS, loginIdentity, nextLoginAttempt } from './login-attempts';

describe('login attempt policy', () => {
  it('uses a deterministic fixed-length pseudonymous identity', () => {
    expect(loginIdentity('owner@example.com')).toMatch(/^[a-f0-9]{64}$/);
    expect(loginIdentity('owner@example.com')).toBe(loginIdentity('owner@example.com'));
    expect(loginIdentity('owner@example.com')).not.toBe(loginIdentity('other@example.com'));
  });

  it('increments within the active window without moving its start', () => {
    const started = new Date('2026-08-02T12:00:00.000Z');
    const now = new Date(started.getTime() + LOGIN_ATTEMPT_WINDOW_MS - 1);

    expect(nextLoginAttempt({ failureCount: 2, windowStartedAt: started }, now)).toEqual({
      failureCount: 3,
      windowStartedAt: started
    });
  });

  it('starts a fresh window at the exact boundary', () => {
    const started = new Date('2026-08-02T12:00:00.000Z');
    const now = new Date(started.getTime() + LOGIN_ATTEMPT_WINDOW_MS);

    expect(nextLoginAttempt({ failureCount: 9, windowStartedAt: started }, now)).toEqual({
      failureCount: 1,
      windowStartedAt: now
    });
  });
});
