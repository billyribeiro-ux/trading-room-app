import type { SanitizedHtml } from '$lib/sanitized-html';

/**
 * Shared allowlist sanitiser for the room's landing-page HTML.
 *
 * The browser uses this before previewing raw editor input. The server invokes
 * the same function again before persistence because client-side validation is
 * never an authorization or security boundary.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'div',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'hr'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  '*': new Set(['style'])
};

const ALLOWED_CSS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
  'margin',
  'padding',
  'width',
  'height'
]);

function safeUrl(value: string, allowData: boolean): string | null {
  const normalized = value.trim();
  const schemeProbe = normalized.replace(/[\p{Cc}\s]/gu, '').toLowerCase();
  if (/^(javascript|vbscript|file):/.test(schemeProbe)) return null;
  if (schemeProbe.startsWith('data:')) {
    if (!allowData) return null;
    if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(normalized)) return null;
  }
  return normalized;
}

function filterStyle(value: string): string {
  return value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const [property, ...remainder] = declaration.split(':');
      const cssValue = remainder.join(':').trim().toLowerCase();
      if (!ALLOWED_CSS.has(property.trim().toLowerCase())) return false;
      return !/url\s*\(|expression\s*\(|\\/i.test(cssValue);
    })
    .join('; ');
}

/**
 * Rebuild an HTML fragment from explicit tag, attribute, style and URL
 * allowlists. Anything not understood is dropped, and malformed nesting is
 * closed into well-formed output.
 */
export function sanitizeHtml(input: string): SanitizedHtml {
  if (!input) return '' as SanitizedHtml;

  const output: string[] = [];
  const openTags: string[] = [];
  const tokens = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+|<)/g;
  let token: RegExpExecArray | null;

  while ((token = tokens.exec(input))) {
    const [raw, tagName, rawAttributes, text] = token;

    if (text !== undefined) {
      output.push(text.replace(/</g, '&lt;'));
      continue;
    }
    if (raw.startsWith('<!--')) continue;

    const tag = (tagName ?? '').toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;

    if (raw.startsWith('</')) {
      const index = openTags.lastIndexOf(tag);
      if (index !== -1) {
        for (let position = openTags.length - 1; position >= index; position--) {
          output.push(`</${openTags[position]}>`);
        }
        openTags.length = index;
      }
      continue;
    }

    const attributes: string[] = [];
    const attributeTokens = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
    let attribute: RegExpExecArray | null;
    while ((attribute = attributeTokens.exec(rawAttributes ?? ''))) {
      const name = attribute[1].toLowerCase();
      let value = attribute[2] ?? '';
      if (value.startsWith('"') || value.startsWith("'")) value = value.slice(1, -1);

      if (!(ALLOWED_ATTRS[tag]?.has(name) || ALLOWED_ATTRS['*'].has(name))) continue;

      if (name === 'href' || name === 'src') {
        const safe = safeUrl(value, tag === 'img');
        if (safe === null) continue;
        value = safe;
      }
      if (name === 'style') {
        value = filterStyle(value);
        if (!value) continue;
      }

      attributes.push(`${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`);
    }

    if (tag === 'img' && !attributes.some((value) => value.startsWith('alt='))) {
      attributes.push('alt=""');
    }

    if (tag === 'a' && attributes.some((value) => value.startsWith('target='))) {
      const relIndex = attributes.findIndex((value) => value.startsWith('rel='));
      const existingRel = relIndex === -1 ? '' : attributes[relIndex].slice(5, -1);
      const relTokens = existingRel
        .split(/\s+/)
        .map((value) => value.toLowerCase())
        .filter((value) => /^[a-z][a-z0-9_-]*$/.test(value) && value !== 'opener');

      for (const required of ['noopener', 'noreferrer']) {
        if (!relTokens.includes(required)) relTokens.push(required);
      }

      const hardenedRel = `rel="${relTokens.join(' ')}"`;
      if (relIndex === -1) attributes.push(hardenedRel);
      else attributes[relIndex] = hardenedRel;
    }

    const selfClosing = tag === 'br' || tag === 'img' || tag === 'hr';
    output.push(`<${tag}${attributes.length ? ` ${attributes.join(' ')}` : ''}${selfClosing ? ' /' : ''}>`);
    if (!selfClosing) openTags.push(tag);
  }

  for (let position = openTags.length - 1; position >= 0; position--) {
    output.push(`</${openTags[position]}>`);
  }

  return output.join('') as SanitizedHtml;
}
