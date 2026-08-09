import { beforeEach, describe, expect, test } from 'vitest';
import { RATE_LIMITS, consumeRateLimit, resetRateLimits } from './rate-limit';

describe('write-action rate limiting', () => {
  beforeEach(resetRateLimits);

  test('a burst is allowed up to the quota and refused after it', () => {
    const { limit } = RATE_LIMITS.message;

    for (let attempt = 1; attempt <= limit; attempt += 1) {
      expect(consumeRateLimit('message', 1).allowed, `attempt ${attempt}`).toBe(true);
    }

    const refused = consumeRateLimit('message', 1);
    expect(refused.allowed).toBe(false);
    // The caller is told how long to wait rather than being left to guess.
    expect(refused.retryAfterMs).toBeGreaterThan(0);
  });

  test('quotas are per user, so one flooder cannot mute everyone else', () => {
    const { limit } = RATE_LIMITS.message;
    for (let attempt = 0; attempt < limit; attempt += 1) {
      consumeRateLimit('message', 'flooder');
    }
    expect(consumeRateLimit('message', 'flooder').allowed).toBe(false);
    expect(consumeRateLimit('message', 'someone-else').allowed).toBe(true);
  });

  test('buckets are independent, so chatting does not spend the question quota', () => {
    const { limit } = RATE_LIMITS.message;
    for (let attempt = 0; attempt < limit; attempt += 1) {
      consumeRateLimit('message', 42);
    }
    expect(consumeRateLimit('message', 42).allowed).toBe(false);
    // Being talkative must not stop someone asking the presenter a question.
    expect(consumeRateLimit('question', 42).allowed).toBe(true);
  });

  test('the window reopens once it elapses', () => {
    const { limit, windowMs } = RATE_LIMITS.alert;
    const start = 1_000_000;

    for (let attempt = 0; attempt < limit; attempt += 1) {
      consumeRateLimit('alert', 7, start);
    }
    expect(consumeRateLimit('alert', 7, start).allowed).toBe(false);

    // Time is a parameter, so this needs no sleeping and cannot be flaky.
    expect(consumeRateLimit('alert', 7, start + windowMs).allowed).toBe(true);
  });

  test('alerts are limited more tightly than chat, since they fan out to everyone', () => {
    expect(RATE_LIMITS.alert.limit).toBeLessThan(RATE_LIMITS.message.limit);
  });
});
