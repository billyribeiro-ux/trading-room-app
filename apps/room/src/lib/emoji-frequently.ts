import type { EmojiDumpEntry } from '#lib/emoji-data.js';

/**
 * The picker's Frequently Used row, and the `localStorage` behind it.
 *
 * A module for the same reason `#lib/emoji-search.ts` is one: upstream this is a SERVICE, not part
 * of the view. `NR` at byte 723,544 is `providedIn: "root"` and holds the whole of it —
 *
 * ```js
 * class t{ platformId; NAMESPACE="emoji-mart"; frequently=null; defaults={}; initialized=!1;
 *   DEFAULTS=["+1","grinning","kissing_heart", … ,"heart","poop"];
 *   init(){ this.frequently = JSON.parse(Ol(this.platformId) &&
 *     localStorage.getItem(`${this.NAMESPACE}.frequently`) || "null"), this.initialized=!0 }
 *   add(e){ … }
 *   get(e,i){ … }                                                            // byte 723,544
 * ```
 *
 * — and `Ol(this.platformId)` is Angular's own `isPlatformBrowser`, which is why every reach for
 * `localStorage` here is guarded rather than assumed. The guard is wider here than upstream's:
 * reading `localStorage` can THROW outright, not merely be absent, when a browser is set to block
 * site data, and a picker that cannot remember an emoji must still open.
 */

/** `NAMESPACE="emoji-mart"` — the prefix on all three keys this module touches. */
export const NAMESPACE = 'emoji-mart';

/** `NR.DEFAULTS` — the Frequently Used row before anything is stored. Sixteen ids, in this order. */
export const FREQUENTLY_DEFAULTS = [
  '+1',
  'grinning',
  'kissing_heart',
  'heart_eyes',
  'laughing',
  'stuck_out_tongue_winking_eye',
  'sweat_smile',
  'joy',
  'scream',
  'disappointed',
  'unamused',
  'weary',
  'sob',
  'sunglasses',
  'heart',
  'poop'
] as const;

/**
 * `localStorage`, or `null` — never a throw.
 *
 * Two distinct failures collapse to the same answer on purpose: the API is absent (the server, and
 * Angular's `isPlatformBrowser` guard upstream), or reading the property throws (cookies blocked,
 * some sandboxed frames). Neither is a fault to report; both mean "this browser will not remember",
 * which is a state the picker is required to open in.
 */
export function emojiStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** `JSON.parse(localStorage.getItem(NAMESPACE + ".frequently") || "null")`, with the parse guarded. */
export function readFrequently(): Record<string, number> | null {
  const store = emojiStorage();
  if (!store) return null;
  try {
    return JSON.parse(store.getItem(`${NAMESPACE}.frequently`) ?? 'null');
  } catch {
    /* A hand-edited or truncated value must not stop the picker opening. */
    return null;
  }
}

/**
 * `frequently.get(perLine, totalFrequentLines)` verbatim.
 *
 * ```js
 * if(null===this.frequently){ this.defaults={}; const c=[];
 *   for(let h=0;h<e;h++) this.defaults[this.DEFAULTS[h]] = e-h, c.push(this.DEFAULTS[h]);
 *   return c }
 * const o=e*i, a=Object.keys(this.frequently).sort((c,h)=>this.frequently[c]-this.frequently[h])
 *   .reverse().slice(0,o), l=…getItem(`${this.NAMESPACE}.last`);
 * return l && !a.includes(l) && (a.pop(), a.push(l)), a
 * ```
 *
 * `const o=e*i,a=Object.keys(this.frequently).sort` begins at byte 724,507.
 *
 * With nothing stored it returns the first `perLine` DEFAULTS, which is exactly the nine cells the
 * dump captured; otherwise the most-used ids, capped at `perLine * totalFrequentLines`, with the
 * last-used one forced in by DISPLACING the least-used — `a.pop()` then `a.push(l)`, not an
 * unbounded append, which is what keeps the row a fixed size no matter how long a session runs.
 */
export function frequentIdsNow(perLine: number, totalFrequentLines: number): string[] {
  const stored = readFrequently();
  if (!stored) return FREQUENTLY_DEFAULTS.slice(0, perLine);

  const ids = Object.keys(stored)
    .sort((a, b) => stored[a] - stored[b])
    .reverse()
    .slice(0, perLine * totalFrequentLines);
  const last = emojiStorage()?.getItem(`${NAMESPACE}.last`);
  if (last && !ids.includes(last)) {
    ids.pop();
    ids.push(last);
  }
  return ids;
}

/**
 * `frequently.add()` verbatim: bump the counter, remember it as `.last`, persist both.
 *
 * The seeded counts are upstream's `this.defaults`, built by the same `e-h` descent `get()` uses,
 * so the first pick lands in a table that already ranks the captured nine rather than in an empty
 * one — which would put a single pick above every default.
 */
export function rememberFrequent(entry: EmojiDumpEntry, perLine: number): void {
  const store = emojiStorage();
  if (!store) return;

  const counts =
    readFrequently() ??
    Object.fromEntries(FREQUENTLY_DEFAULTS.slice(0, perLine).map((id, at) => [id, perLine - at]));
  counts[entry.id] = (counts[entry.id] ?? 0) + 1;
  try {
    store.setItem(`${NAMESPACE}.last`, entry.id);
    store.setItem(`${NAMESPACE}.frequently`, JSON.stringify(counts));
  } catch {
    /* A full or read-only store must not break picking an emoji. */
  }
}
