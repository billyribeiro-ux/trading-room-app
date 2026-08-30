/**
 * `simUserCount` — the owner-typed number that pads the room's headcount, bounded as the reference
 * bounds it.
 *
 * ```js
 * e && (this.simUserCount = Number(e),
 *       this.simUserCount > 5e3 && (this.simUserCount = 5e3),
 *       this.simUserCount <= 0  && (this.simUserCount = 0))
 * ```
 *
 * (bundle byte 2,499,409.) This room applied neither bound: `apps/room/src/lib/room/roster.svelte.ts`
 * added the raw setting to the count, and `room-config-client.ts` types it as a bare
 * `simUserCount?: number` with no server-side check either. **So 50000 rendered as 50000, and -5
 * SUBTRACTED five from a real roster** — a room of twelve could publish "7". A number that lies
 * downwards is the worse half: an inflated headcount is at least the kind of lie the setting exists
 * to tell, and a deflated one is nobody's intent.
 *
 * ## Three details are transcribed rather than tidied, and each would be a real change
 *
 * 1. **The upper test is `>` and the lower is `<=`.** At exactly 0 the reference assigns 0, which
 *    changes nothing — a redundant branch. Rewriting it as `<` would be a correction, and a
 *    transcription that corrects is no longer one.
 * 2. **`Number(e)` is upstream's**, so a setting of `"lots"` arrives as `NaN` there and is compared
 *    twice, both false, leaving `NaN` in the count. That is the one case the reference does NOT
 *    answer, so it is answered here: `NaN` is 0, because the alternative is a headcount rendered as
 *    "NaN" to every member in the room.
 * 3. **The guard `e &&` means an ABSENT setting leaves the previous value alone** upstream. Here the
 *    value is read from `data` on every render rather than assigned once, so there is no previous
 *    value to keep and the absent case is 0 — which is what the caller already defaulted to.
 *
 * A module rather than three lines at the call site because a bound nobody can point at is a bound
 * nobody can test, and this one has two ends and a `NaN` case.
 */
export const SIM_USER_COUNT_MAX = 5_000;

export function clampSimUserCount(value: number | null | undefined): number {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  if (count > SIM_USER_COUNT_MAX) return SIM_USER_COUNT_MAX;
  if (count <= 0) return 0;
  return count;
}
