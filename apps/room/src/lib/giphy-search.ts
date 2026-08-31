/**
 * The Giphy search call, and the one thing the room is allowed to believe about what comes back.
 *
 * ## Everything here is EXTERNAL
 *
 * `api.giphy.com` is a third party. Nothing it returns is authority: not the id, not the title, not
 * the URL. The room's rule for that is already written down — every allow-list is deny-by-default
 * and no value the client did not derive itself decides anything — so this module's job is to hand
 * the picker a shape it can render and to REFUSE the parts of the payload that do not parse, rather
 * than to coerce them into something that looks fine and is wrong.
 *
 * The reference does none of this. `searchGiphy()` at byte 2,213,709 of the pinned v4 bundle is
 *
 * ```js
 * searchGiphy(){ const e = b_()({https:!0, apiKey: this.appService.globals.giphy_api_key}),
 *                      i = this.giphySearchTerm;
 *   e.search(i).then(o => { console.log(o), this.giphyResults = o.data }).catch(console.error) }
 * ```
 *
 * — the SDK's `data` assigned straight through. What is preserved from that is the shape of the
 * failure: a rejected search leaves the previous results standing rather than blanking the grid.
 *
 * ## The dimensions, and why they are read at all
 *
 * `T(1,"img",77)` with const 77 `[3,"dblclick","src"]` — the reference's result image carries no
 * width, no height and no `aspect-ratio`, and its only sizing is `app-privchat img { max-width:
 * 100% }` at byte 2,225,0xx. So every GIF in the grid lands at its natural size as it decodes and
 * the whole list reflows under the pointer, which is the layout shift this repository's standard
 * names in as many words.
 *
 * Giphy returns `width` and `height` on each rendition as decimal STRINGS. `imageBox` accepts them
 * only when both parse as positive, finite integers and answers `null` otherwise — a GIF with a
 * missing or junk size renders exactly as it did before, unsized, rather than with an attribute
 * built out of `NaN`.
 */

/** One rendition. `width`/`height` are optional because a hand-written fixture may omit them. */
export interface GiphyImage {
  readonly url: string;
  readonly width?: string;
  readonly height?: string;
}

export interface GiphyResult {
  readonly id: string;
  readonly title: string;
  readonly images: {
    readonly downsized_large: GiphyImage;
    readonly original: GiphyImage;
  };
}

/** The intrinsic box of a rendition, or `null` when the payload does not state a usable one. */
export function imageBox(image: GiphyImage): { width: number; height: number } | null {
  const width = Number(image.width);
  const height = Number(image.height);
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/**
 * The search URL.
 *
 * Built with `URL`/`searchParams` rather than by concatenation so a search term containing `&` is a
 * search term rather than another parameter. `rating=pg` is the reference SDK's default for this
 * room and is sent explicitly, because a default that lives in somebody else's package is a default
 * that can change without this repository noticing.
 */
export function giphySearchUrl(apiKey: string, query: string): URL {
  const url = new URL('https://api.giphy.com/v1/gifs/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('rating', 'pg');
  return url;
}

/**
 * Run one search.
 *
 * Throws on a non-2xx response instead of parsing the error body as results — `response.json()` on
 * Giphy's `{"meta":{"status":403,…}}` succeeds and yields `data: undefined`, which would silently
 * blank the grid and look like "no matches for that word".
 */
export async function searchGiphy(apiKey: string, query: string): Promise<GiphyResult[]> {
  const response = await fetch(giphySearchUrl(apiKey, query));
  if (!response.ok) throw new Error(`giphy search failed: ${response.status}`);
  const payload = (await response.json()) as { data?: GiphyResult[] };
  return Array.isArray(payload.data) ? payload.data : [];
}
