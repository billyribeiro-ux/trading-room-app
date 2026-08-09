/**
 * A small in-process rate limiter for the SvelteKit form actions.
 *
 * The room's write actions had no limit of any kind: one authenticated account could post
 * messages, alerts or questions as fast as it could issue requests, and every one of them
 * is broadcast to everyone else on the next poll. That is a flooding problem before it is
 * a load problem.
 *
 * Deliberately per process and in memory. These limits exist to make abuse tedious, not to
 * meter anything, and a shared store would put a network round trip in front of every
 * write to buy an exactness nobody needs here. This backend is single-node today; the Rust
 * API is where a distributed limiter belongs if it is ever warranted.
 *
 * A fixed window is used rather than a token bucket because the failure mode - a burst of
 * up to 2x the quota straddling a window boundary - is harmless for a chat message, and
 * the implementation is small enough to be obviously correct.
 */

/** Distinct buckets so a burst of chat cannot consume the quota for asking a question. */
export type RateLimitBucket = 'message' | 'alert' | 'question' | 'reaction';

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Upper bound on tracked keys. Without it, a long-running process accumulates one entry
 * per (bucket, user) forever, and the limiter becomes a slow memory leak.
 */
const MAX_TRACKED_KEYS = 10_000;

export const RATE_LIMITS: Record<RateLimitBucket, { limit: number; windowMs: number }> = {
  // Roughly two messages a second sustained. Comfortably above human typing, far below
  // what a script can manage.
  message: { limit: 30, windowMs: 15_000 },
  // Alerts fan out to every reader and can trigger notifications, so they are tighter.
  alert: { limit: 10, windowMs: 60_000 },
  question: { limit: 10, windowMs: 60_000 },
  // Reactions are cheap and clicky; the limit only exists to stop a script hammering them.
  reaction: { limit: 60, windowMs: 15_000 }
};

/**
 * Records one use and reports whether it is allowed.
 *
 * @param bucket which quota to charge
 * @param subject a stable identifier for the caller, normally the user id
 * @param now injectable so the behaviour is testable without sleeping
 */
export function consumeRateLimit(
  bucket: RateLimitBucket,
  subject: string | number,
  now = Date.now()
): { allowed: boolean; retryAfterMs: number } {
  const { limit, windowMs } = RATE_LIMITS[bucket];
  const key = `${bucket}:${subject}`;
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    if (windows.size >= MAX_TRACKED_KEYS) {
      // Drop everything already expired before giving up; only if the map is still full
      // is something genuinely abnormal happening.
      for (const [candidate, window] of windows) {
        if (now >= window.resetAt) windows.delete(candidate);
      }
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Test-only: forget all state so cases cannot bleed into each other. */
export function resetRateLimits(): void {
  windows.clear();
}
