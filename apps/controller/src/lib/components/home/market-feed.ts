/**
 * The simulated market feed behind the home page's live visuals.
 *
 * Honesty rule: everything this module emits renders under a visible "simulated feed" label
 * (`SIMULATED_FEED_LABEL` in the copy deck). It exists to demonstrate the real-time rendering
 * pipeline, never to imply live quotes.
 *
 * The generator is a seeded mulberry32 random walk, not `Math.random()`: the same seed produces
 * the same tape on every load, which keeps browser regressions and screenshots deterministic
 * while still looking like a market.
 */

export interface Walk {
  /** Advance one tick and return the new price. */
  next(): number;
  /** Produce the next `n` ticks as an array. */
  series(n: number): number[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A price path with drift-free noise plus a slow sine swell, so the line trends and breathes
 * instead of jittering around a flat mean.
 */
export function createWalk(seed: number, start: number, volatility: number): Walk {
  const random = mulberry32(seed);
  let price = start;
  let phase = random() * Math.PI * 2;

  return {
    next() {
      phase += 0.045 + random() * 0.02;
      const noise = (random() - 0.5) * 2 * volatility;
      const swell = Math.sin(phase) * volatility * 0.6;
      price = Math.max(start * 0.9, price + noise + swell);
      return price;
    },
    series(n: number) {
      return Array.from({ length: n }, () => this.next());
    }
  };
}
