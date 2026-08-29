/**
 * A room's own favicon and stylesheet — owner-authored, served to every member.
 *
 * ## The transcription
 *
 * Both are applied on `globalsLoaded`, one after the other (bundle byte 2,594,998):
 *
 * ```js
 * sessData.customFaviconURL && this.changeFavicon(sessData.customFaviconURL);
 * sessData.customCSS && this.addCustomCSS(sessData.customCSS);
 * ```
 *
 * ```js
 * changeFavicon(e) {                                              // byte 2,602,147
 *   e = e + "?=" + Math.random();
 *   var i = document.createElement("link"),
 *       o = document.getElementById("dynamic-favicon"),
 *       s = document.querySelector('link[type="image/x-icon"]');
 *   i.id = "dynamic-favicon"; i.rel = "icon"; i.href = e;
 *   s && document.head.removeChild(s);
 *   o && document.head.removeChild(o);
 *   document.head.appendChild(i);
 * }
 *
 * addCustomCSS(e) {                                               // byte 2,602,486
 *   if (e && e.indexOf("https") >= 0) {
 *     const i = document.createElement("link");
 *     i.rel = "stylesheet"; i.type = "text/css"; i.href = e;
 *     document.head.appendChild(i);
 *   } else {
 *     const i = document.createElement("style");
 *     i.appendChild(document.createTextNode(e));
 *     document.head.appendChild(i);
 *   }
 * }
 * ```
 *
 * `app.html` was already built for this: its icon link carries `type="image/x-icon"` and the comment
 * there says why — that attribute is the selector `changeFavicon` uses to find the tag it replaces.
 *
 * ## `indexOf("https") >= 0` IS BROKEN, and this is where it is fixed
 *
 * It is a substring test against the WHOLE string, anywhere in it. Two failures follow directly:
 *
 * * `body { background: url(https://cdn.example/x.png) }` — a perfectly ordinary stylesheet —
 *   contains `https`, so upstream sets it as a `link.href` and the room gets a broken stylesheet
 *   request instead of the styling the owner wrote.
 * * `http://cdn.example/room.css` does NOT contain `https`, so upstream injects the URL itself as
 *   CSS TEXT and the stylesheet never loads.
 *
 * Both are silent. This module parses instead: a value that is a complete `http:`/`https:` URL is a
 * stylesheet to link, and anything else is CSS to inline. That is what the check was reaching for.
 *
 * ## The inline form is a TEXT NODE, and the reason is NOT the one first written here
 *
 * The first draft of this paragraph said a text node was a security property — that
 * `<style>{@html css}</style>` would let an owner value containing `</style><script>…` become
 * executable script. **That was measured and it is false.** `<style>` is a RAWTEXT element: its
 * content is not parsed as HTML, so a closing tag inside it does not terminate anything a fragment
 * parser will then read as markup. Checked in this repository's own jsdom: `innerHTML` and
 * `appendChild(createTextNode(…))` on a `<style>` produce an IDENTICAL single `#text` child, and no
 * `<script>` element exists either way. The claim is recorded and refuted here rather than quietly
 * deleted, because "innerHTML in a style tag is XSS" is a plausible thing to believe twice.
 *
 * The real reason is the OTHER alternative. Ordinary interpolation — `<style>{css}</style>` — is
 * what a Svelte author reaches for first, and Svelte HTML-escapes text content: `a > b` and
 * `a & b` reach the CSS parser as `a &gt; b` and `a &amp; b`. Correct CSS in, broken CSS out, and
 * silently. A text node says exactly what is meant — this string is content, not markup — without
 * reaching for a raw-HTML primitive to say it, and it is what the reference does.
 *
 * **What this module does NOT claim**: owner-authored CSS is still owner-authored code running in
 * every member's page. It can hide controls, overlay them, and load external images by selector —
 * and an attribute selector plus a `url()` is a real exfiltration channel for anything that reaches
 * the DOM as an attribute. It is scoped to that owner's own room and their own members, which is
 * the same bargain a site theme makes, and the room's CSP is the layer that bounds it rather than
 * this function. Nothing here makes owner CSS safe; it makes the two forms of it work correctly.
 */

/** A parsed `http:`/`https:` URL, or `null`. Shared by both settings. */
function httpUrl(raw: string | undefined | null): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * The favicon href, cache-busted, or `null` when the room has not set a usable one.
 *
 * The cache-bust is the reference's own — `e + "?=" + Math.random()` — and it is reproduced because
 * an owner changing their favicon and seeing the old one is the failure it exists to prevent.
 * `?=` is a malformed query string (an empty parameter name), and it is kept verbatim: browsers
 * treat it as an opaque cache key, which is all it is for, and "correcting" it to `?v=` would change
 * a URL the owner's own CDN logs may key on.
 *
 * The suffix is a PARAMETER rather than a call to `Math.random()` inside, so this function is pure
 * and its test does not have to stub a global.
 */
export function customFaviconHref(
  raw: string | undefined | null,
  cacheBust: string
): string | null {
  const url = httpUrl(raw);
  return url === null ? null : `${url}?=${cacheBust}`;
}

/** What `customCSS` resolves to: a stylesheet to link, CSS to inline, or nothing. */
export type CustomStylesheet =
  | { readonly kind: 'link'; readonly href: string }
  | { readonly kind: 'inline'; readonly css: string }
  | null;

export function customStylesheetFor(raw: string | undefined | null): CustomStylesheet {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  /*
    Parsed, not substring-matched — see the header for the two silent failures `indexOf("https")`
    produces. A value that IS a URL is a stylesheet; anything else is CSS.
  */
  const url = httpUrl(value);
  return url === null ? { kind: 'inline', css: value } : { kind: 'link', href: url };
}
