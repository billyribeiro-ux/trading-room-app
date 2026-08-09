import { createHash } from 'node:crypto';

export const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface LoginAttemptState {
  failureCount: number;
  windowStartedAt: Date;
}

export function loginIdentity(email: string) {
  return createHash('sha256').update(email).digest('hex');
}

/** Pure policy for advancing the evidence-backed CAPTCHA threshold counter. */
export function nextLoginAttempt(previous: LoginAttemptState | undefined, now: Date) {
  const withinWindow = previous && now.getTime() - previous.windowStartedAt.getTime() < LOGIN_ATTEMPT_WINDOW_MS;

  return {
    failureCount: withinWindow ? previous.failureCount + 1 : 1,
    windowStartedAt: withinWindow ? previous.windowStartedAt : now
  };
}
