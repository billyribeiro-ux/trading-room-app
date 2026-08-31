import type { EmojiDumpEntry } from '#lib/emoji-data.js';

/**
 * The emoji picker's search, transcribed from the reference's own `emojiSearch` service.
 *
 * It lives outside `EmojiPicker.svelte` because it is not a view concern and never was: upstream it
 * is an injected service (`Yee` in `main.d1d09071be31f1ba.js`, whose class body begins at byte
 * 730,571 with `originalPool={};index={};emojisList={};emoticonsList={};emojiSearch={}`), and
 * `emoji-search` the COMPONENT only holds the input and forwards what the service returns:
 *
 * ```js
 * handleSearch(e){ "" === e ? (this.icon = this.icons.search, this.isSearching = !1)
 *                           : (this.icon = this.icons.delete, this.isSearching = !0);
 *   const i = this.emojiSearch.search(this.query, this.emojisToShowFilter, this.maxResults,
 *                                     this.include, this.exclude, this.custom);
 *   this.searchResults.emit(i) }                                             // byte 736,776
 * ```
 *
 * `maxResults` is the picker's own field, `maxResults=75` at byte 736,246.
 */

/** `maxResults=75` — byte 736,246. */
export const MAX_RESULTS = 75;

/**
 * `buildSearch()` verbatim: short_names, name and id are split on separators, keywords too,
 * emoticons are NOT, everything lowercased and de-duplicated, joined with commas.
 *
 * The asymmetry is the part worth keeping: an emoticon is `:-)`, and splitting it on `-` would put
 * `:` and `)` into the pool as separate tokens, so every one-character query would match every
 * emoji that has any emoticon at all.
 */
export function buildSearch(entry: EmojiDumpEntry): string {
  const tokens: string[] = [];
  const add = (value: string | string[] | undefined, split: boolean) => {
    if (!value) return;
    for (const item of Array.isArray(value) ? value : [value]) {
      for (const part of split ? item.split(/[-|_|\s]+/) : [item]) {
        const token = part.toLowerCase();
        if (!tokens.includes(token)) tokens.push(token);
      }
    }
  };
  add(entry.shortNames, true);
  add(entry.name, true);
  add(entry.id, true);
  add(entry.keywords, true);
  add(entry.emoticons, false);

  return tokens.join(',');
}

/**
 * One search over one fixed pool, with the reference's own per-id memo.
 *
 * A factory rather than a free function because the memo has to outlive a keystroke: `buildSearch`
 * walks five fields and de-duplicates with `includes`, and running it per entry per keystroke over
 * 1,821 entries is what the memo exists to stop. Upstream keeps the same table in
 * `this.emojiSearch[id]` on a service that is `providedIn: "root"`, so it is built once per
 * application; here it is built once per picker, which is the same bound with a shorter life.
 *
 * A plain `Map`, not a `SvelteMap`: nothing renders from it, and making it reactive would
 * invalidate the search on its own cache writes.
 */
export function createEmojiSearch(pool: readonly EmojiDumpEntry[]) {
  const byId = new Map(pool.map((entry) => [entry.id, entry]));
  const searchStrings = new Map<string, string>();

  const searchStringFor = (entry: EmojiDumpEntry) => {
    let value = searchStrings.get(entry.id);
    if (value === undefined) {
      value = buildSearch(entry);
      searchStrings.set(entry.id, value);
    }
    return value;
  };

  /**
   * `search()` verbatim: the `-`/`+` shortcuts, at most two terms, each term matched as a substring
   * of the built search string and ranked by where it matched (0 when the term IS the id), the
   * terms intersected, then capped at `maxResults`.
   *
   * `null` rather than `[]` for "no query", because the two mean different things to the caller: a
   * null result restores the categories, an empty array shows `No Emoji Found`. A whitespace-only
   * query returns `null` too — `terms.filter(Boolean)` empties — which is why the picker's Enter
   * handler needs no separate `!query` guard.
   */
  return function search(raw: string): EmojiDumpEntry[] | null {
    if (!raw.length) return null;
    if (raw === '-' || raw === '-1') {
      const entry = byId.get('-1');
      return entry ? [entry] : [];
    }
    if (raw === '+' || raw === '+1') {
      const entry = byId.get('+1');
      return entry ? [entry] : [];
    }

    let terms = raw
      .toLowerCase()
      .split(/[\s|,|\-|_]+/)
      .filter(Boolean);
    if (!terms.length) return null;
    if (terms.length > 2) terms = [terms[0], terms[1]];

    const perTerm = terms.map((term) => {
      const ranks = new Map<string, number>();
      const matched = pool.filter((entry) => {
        const index = searchStringFor(entry).indexOf(term);
        if (index === -1) return false;
        ranks.set(entry.id, term === entry.id ? 0 : index + 1);
        return true;
      });
      return matched.sort((a, b) => (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0));
    });

    let results = perTerm[0] ?? [];
    for (const list of perTerm.slice(1)) {
      const ids = new Set(list.map((entry) => entry.id));
      results = results.filter((entry) => ids.has(entry.id));
    }

    return results.length > MAX_RESULTS ? results.slice(0, MAX_RESULTS) : results;
  };
}
