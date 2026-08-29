/**
 * The HLS buffer-size preference — one rule, three names, and a clamp that is not decoration.
 *
 * ## What it is
 *
 * `preferences.bufferSizeLevel`, read by the streaming view to configure hls.js:
 *
 * ```js
 * getHlsConfig() { const e = this.appService.globals.preferences.bufferSizeLevel || 3, … }
 * getBufferSizeLevel() { return this.appService.globals.preferences.bufferSizeLevel || 3 }
 * getBufferSizeName() { switch (this.getBufferSizeLevel()) {
 *   case 1: default: return "Normal"; case 2: return "Increased"; case 3: return "Maximum" } }
 * setBufferSize(e) { e < 1 || e > 3 || this.getBufferSizeLevel() !== e &&
 *   (preferences.bufferSizeLevel = e, setPreference("bufferSizeLevel", e), this.hls && this.loadStream()) }
 * ```
 *
 * (bundle bytes 1,902,845 / 1,908,430 / 1,908,677 / 1,908,726).
 *
 * ## Why a module for four lines of logic
 *
 * Because otherwise it is written twice. `StreamingView.svelte` needs the NAME for its dropdown
 * label and the LEVEL for its hls.js config; `RoomPrefs` needs the level to hold as state and to
 * seed from a settings blob that can contain anything. Those are two files reaching the same three
 * answers, and this repository's own history is that the second copy is the one that goes stale.
 *
 * ## The clamp is load-bearing
 *
 * The value arrives from a JSON blob a member's row carries, so it can be `"3"`, `null`, `0`, `7`
 * or an object. It then reaches hls.js as a buffer length in a config object. `|| 3` — the
 * reference's own guard — catches `0`, `null` and `undefined` and nothing else: `"2"` survives as a
 * string and `7` survives as seven. Both are reproduced deliberately as REFUSALS here rather than
 * as coercions, because a buffer of seven is not a preference a control can produce and silently
 * honouring it would be inventing a fourth level the reference does not have.
 */

/** 1 Normal, 2 Increased, 3 Maximum — and nothing else is a level. */
export type StreamBufferLevel = 1 | 2 | 3;

/** Upstream's own default, and the value `|| 3` produces for every falsy reading. */
export const STREAM_BUFFER_DEFAULT: StreamBufferLevel = 3;

/**
 * The three labels, in the switch's own order.
 *
 * `case 1: default:` share `"Normal"` upstream, which matters only for a value that cannot occur
 * once {@link streamBufferLevel} has run — the fallthrough is the reference being defensive about
 * the same blob this clamps.
 */
export const STREAM_BUFFER_NAMES: Readonly<Record<StreamBufferLevel, string>> = {
  1: 'Normal',
  2: 'Increased',
  3: 'Maximum'
};

/**
 * Whatever the settings blob held, as a level.
 *
 * `=== 1 | 2 | 3` and nothing else, so a string, a float, a 0 or an absent key all land on the
 * default. That is stricter than the reference's `|| 3` in exactly one direction — it also refuses
 * `7` and `"2"` — and the module header says why.
 */
export function streamBufferLevel(value: unknown): StreamBufferLevel {
  return value === 1 || value === 2 || value === 3 ? value : STREAM_BUFFER_DEFAULT;
}

/** The dropdown's label for a level. */
export function streamBufferName(level: StreamBufferLevel): string {
  return STREAM_BUFFER_NAMES[level];
}
