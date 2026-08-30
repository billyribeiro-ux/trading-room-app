import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SIM_USER_COUNT_MAX, clampSimUserCount } from './sim-user-count.js';

/**
 * G14 — the padding on the room's headcount, bounded as the reference bounds it.
 *
 * ```js
 * e && (this.simUserCount = Number(e),
 *       this.simUserCount > 5e3 && (this.simUserCount = 5e3),
 *       this.simUserCount <= 0  && (this.simUserCount = 0))
 * ```
 *
 * (bundle byte 2,499,409.) Neither bound was applied here and the LOWER one is the half that
 * matters: `roster.svelte.ts` added the raw setting to the count, so a negative value SUBTRACTED
 * from a real roster and a room of twelve could publish "7".
 */
describe('the two bounds, at their exact edges', () => {
  it('pins the ceiling at 5000 and lets 5000 itself through', () => {
    expect(SIM_USER_COUNT_MAX).toBe(5_000);
    expect(clampSimUserCount(5_000)).toBe(5_000);
    expect(clampSimUserCount(5_001)).toBe(5_000);
    expect(clampSimUserCount(50_000)).toBe(5_000);
  });

  it('refuses to SUBTRACT from a real roster', () => {
    /* The defect: `connectedCount` is `rosterCount + simUserCount`, so -5 hid five real members. */
    expect(clampSimUserCount(-5)).toBe(0);
    expect(clampSimUserCount(-1)).toBe(0);
  });

  it('passes an ordinary value through untouched', () => {
    /* The control for both bounds at once. */
    expect(clampSimUserCount(1)).toBe(1);
    expect(clampSimUserCount(250)).toBe(250);
    expect(clampSimUserCount(4_999)).toBe(4_999);
  });
});

describe('the cases the reference does not answer', () => {
  it('treats a non-numeric setting as 0 rather than rendering NaN', () => {
    /*
      `Number(e)` is upstream's, so `"lots"` arrives as `NaN` there and is compared twice — both
      false — leaving `NaN` in the count. The alternative to answering it is a headcount rendered as
      "NaN" to every member in the room, so it is answered, and the module says that it is ours.
    */
    expect(clampSimUserCount(Number.NaN)).toBe(0);
    expect(clampSimUserCount('lots' as unknown as number)).toBe(0);
    expect(clampSimUserCount(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('treats an absent setting as 0, which is what the caller already defaulted to', () => {
    /* `e &&` upstream keeps the PREVIOUS value; there is no previous value here — it is read per render. */
    expect(clampSimUserCount(undefined)).toBe(0);
    expect(clampSimUserCount(null)).toBe(0);
  });
});

describe('the two boundary OPERATORS, which no value can tell apart', () => {
  /*
    ## Both of these were unfalsifiable assertions until a control said so

    The first drafts here read "`> 5e3`, not `>=`" and "assigns 0 at exactly 0, as `<= 0` does", and
    both were asserted by VALUE. Neither can fail. At exactly 5000, `>` returns the input and `>=`
    returns `SIM_USER_COUNT_MAX` — **the same number**. At exactly 0, `<= 0` returns 0 and `< 0`
    falls through and returns 0. Changing either operator is invisible to every input.

    That is not a reason to drop the claim; it is a reason to assert it where it IS observable. The
    operators are a transcription — `>` and `<=` are what the bundle has, and the `<=` branch is
    redundant there too — so the source is what pins them, and the values above pin that the bounds
    exist at all. `sim-user-count.ts` says why a redundant branch is kept rather than tidied.
  */
  const source = readFileSync(new URL('./sim-user-count.ts', import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    ''
  );

  it('transcribes `>` on the ceiling and `<=` on the floor', () => {
    expect(source).toContain('if (count > SIM_USER_COUNT_MAX) return SIM_USER_COUNT_MAX;');
    expect(source).toContain('if (count <= 0) return 0;');
  });

  it('and the values at both boundaries are what the reference produces', () => {
    expect(clampSimUserCount(0)).toBe(0);
    expect(Object.is(clampSimUserCount(-0), 0)).toBe(true);
    expect(clampSimUserCount(5_000)).toBe(5_000);
  });
});
