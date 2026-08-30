import type { Attachment } from 'svelte/attachments';

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'col',
  'colgroup',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'iframe',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul'
]);
const DISCARDED_CONTENT_TAGS = new Set(['script', 'style', 'template']);
const ALLOWED_ATTRIBUTES: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(['href', 'rel', 'style', 'target', 'title']),
  col: new Set(['colspan', 'style', 'width']),
  div: new Set(['class', 'data-ptr-carousel', 'style']),
  h1: new Set(['style']),
  h2: new Set(['style']),
  h3: new Set(['style']),
  h4: new Set(['style']),
  h5: new Set(['style']),
  h6: new Set(['style']),
  iframe: new Set(['allow', 'allowfullscreen', 'frameborder', 'height', 'src', 'title', 'width']),
  img: new Set(['alt', 'height', 'src', 'style', 'title', 'width']),
  p: new Set(['style']),
  span: new Set(['style']),
  table: new Set(['style']),
  td: new Set(['colspan', 'rowspan', 'style']),
  th: new Set(['colspan', 'rowspan', 'style'])
};
const SAFE_IFRAME_HOSTS = new Set([
  'docs.google.com',
  'player.vimeo.com',
  'www.youtube-nocookie.com',
  'www.youtube.com'
]);
const COLOR_VALUE =
  /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const FONT_FAMILY_VALUE =
  /^(?:Arial|Arial Black|Comic Sans MS|Courier New|Helvetica Neue|Helvetica|Impact|Lucida Grande|Tahoma|Times New Roman|Verdana)$/;
const FONT_SIZE_VALUE = /^(?:8|9|10|11|12|14|18|24|36)px$/;
const LINE_HEIGHT_VALUE = /^(?:1(?:\.0|\.2|\.4|\.5|\.6|\.8)?|2\.0|3\.0)$/;
const PERCENT_VALUE = /^(?:\d{1,3}(?:\.\d{1,6})?)%$/;

const COMMON_STYLE_RULES: Readonly<Record<string, RegExp>> = {
  'background-color': COLOR_VALUE,
  color: COLOR_VALUE,
  'font-family': FONT_FAMILY_VALUE,
  'font-size': FONT_SIZE_VALUE,
  'line-height': LINE_HEIGHT_VALUE,
  'text-align': /^(?:left|center|right|justify)$/
};

const TAG_STYLE_RULES: Readonly<Record<string, Readonly<Record<string, RegExp>>>> = {
  a: {
    display: /^block$/,
    'flex-shrink': /^0$/,
    height: /^100%$/,
    overflow: /^hidden$/,
    width: PERCENT_VALUE
  },
  col: { width: PERCENT_VALUE },
  div: {
    background: /^#111$/i,
    display: /^flex$/,
    height: PERCENT_VALUE,
    overflow: /^hidden$/,
    position: /^relative$/,
    transform: /^translateX\(-?\d+(?:\.\d+)?%\)$/,
    transition: /^transform 0\.5s ease$/,
    'user-select': /^none$/,
    'will-change': /^transform$/,
    width: PERCENT_VALUE
  },
  img: {
    display: /^block$/,
    /*
      ADMITTED 2026-08-30, for `note-editor-image-popover`'s `floatLeft` / `floatRight` /
      `floatNone` group (reference byte 1,469,073). This allow-list is deny-by-default and widening
      it is a decision, so here is the argument.

      `float` is a layout keyword with three legal values and no others; the pattern below admits
      exactly those. It cannot carry a URL, a `url()`, an expression, a custom property or anything
      that resolves at parse time — the three attack shapes a style allow-list exists to refuse. It
      moves an image inside the note's own text flow and can reach nothing outside it.

      Narrower than the property's real grammar on purpose: CSS also defines `inline-start`,
      `inline-end` and the global keywords, and none of them is a thing this editor can produce.
      An allow-list matching the specification rather than the writer is an allow-list that has
      stopped saying anything.
    */
    float: /^(?:left|right|none)$/,
    height: /^100%$/,
    'object-fit': /^contain$/,
    width: /^100%$/
  },
  table: {
    'min-width': /^\d+(?:\.\d+)?px$/,
    width: PERCENT_VALUE
  }
};

function safeHttpsUrl(value: string, baseUrl: string): URL | null {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function sanitizeStyle(value: string, tag: string): string {
  const tagRules = TAG_STYLE_RULES[tag] ?? {};
  return value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .flatMap((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return [];
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const propertyValue = declaration.slice(separator + 1).trim();
      const rule = tagRules[property] ?? COMMON_STYLE_RULES[property];
      return rule?.test(propertyValue) ? [`${property}:${propertyValue}`] : [];
    })
    .join(';');
}

function sanitizedCarouselConfig(value: string): string | null {
  try {
    const parsed = JSON.parse(value) as { height?: unknown; interval?: unknown };
    const interval = Number(parsed.interval);
    const height = Number(parsed.height);
    if (
      !Number.isFinite(interval) ||
      interval < 1 ||
      interval > 60 ||
      !Number.isFinite(height) ||
      height < 10 ||
      height > 100
    ) {
      return null;
    }
    return JSON.stringify({ interval, height });
  } catch {
    return null;
  }
}

function sanitizeNode(source: Node, owner: Document, depth: number): readonly Node[] {
  if (depth > 50) return [];
  if (source.nodeType === Node.TEXT_NODE) {
    return [owner.createTextNode(source.textContent ?? '')];
  }
  if (!(source instanceof Element)) return [];

  const tag = source.localName.toLocaleLowerCase();
  if (DISCARDED_CONTENT_TAGS.has(tag)) return [];
  const children = [...source.childNodes].flatMap((child) => sanitizeNode(child, owner, depth + 1));
  if (!ALLOWED_TAGS.has(tag)) return children;

  const element = owner.createElement(tag);
  const allowed = ALLOWED_ATTRIBUTES[tag] ?? new Set<string>();
  for (const attribute of source.attributes) {
    if (!allowed.has(attribute.name)) continue;
    if (attribute.name === 'href' || attribute.name === 'src') {
      const url = safeHttpsUrl(attribute.value, owner.baseURI);
      if (url === null) continue;
      if (tag === 'iframe' && !SAFE_IFRAME_HOSTS.has(url.hostname)) continue;
    }
    if (attribute.name === 'style') {
      const style = sanitizeStyle(attribute.value, tag);
      if (style) element.setAttribute('style', style);
      continue;
    }
    if (tag === 'div' && attribute.name === 'class') {
      if (attribute.value === 'ptr-carousel-track') element.className = attribute.value;
      continue;
    }
    if (tag === 'div' && attribute.name === 'data-ptr-carousel') {
      const config = sanitizedCarouselConfig(attribute.value);
      if (config !== null) element.setAttribute(attribute.name, config);
      continue;
    }
    element.setAttribute(attribute.name, attribute.value);
  }
  if (tag === 'a') element.setAttribute('rel', 'noopener noreferrer');
  element.append(...children);
  return [element];
}

/**
 * Parses server-sanitized note HTML into a second client-side allowlist before
 * inserting DOM nodes, protecting historical rows if sanitizer policy changes.
 */
export function sanitizeNoteHtmlForBrowser(contentHtml: string, owner: Document): DocumentFragment {
  const template = owner.createElement('template');
  template.innerHTML = contentHtml;
  const fragment = owner.createDocumentFragment();
  fragment.append(
    ...[...template.content.childNodes].flatMap((node) => sanitizeNode(node, owner, 0))
  );
  return fragment;
}

function setupCarousel(element: HTMLElement): () => void {
  const config = sanitizedCarouselConfig(element.getAttribute('data-ptr-carousel') ?? '');
  const track = element.querySelector<HTMLElement>('.ptr-carousel-track');
  if (config === null || track === null || track.children.length <= 1) return () => {};

  const { interval } = JSON.parse(config) as { interval: number };
  const count = track.children.length;
  let active = 0;
  let timer = 0;
  const controls: HTMLElement[] = [];

  const select = (next: number) => {
    active = ((next % count) + count) % count;
    track.style.transform = `translateX(-${active * (100 / count)}%)`;
    dots.forEach((dot, index) => {
      dot.style.background = index === active ? '#fff' : 'rgba(255,255,255,0.45)';
    });
  };
  const start = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => select(active + 1), interval * 1000);
  };
  const control = (label: string, side: 'left' | 'right', move: number) => {
    const button = element.ownerDocument.createElement('button');
    button.type = 'button';
    button.innerHTML = label;
    button.setAttribute('aria-label', move < 0 ? 'Previous slide' : 'Next slide');
    button.setAttribute(
      'style',
      `position:absolute;top:50%;transform:translateY(-50%);z-index:10;background:rgba(0,0,0,0.45);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:26px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:background 0.2s;${side}:10px;`
    );
    /*
      The hover, and the two calls the click was missing — byte 1,480,561:

      ```js
      W.onmouseenter = () => W.style.background = "rgba(0,0,0,0.75)",
      W.onmouseleave = () => W.style.background = "rgba(0,0,0,0.45)",
      W.onclick = J => { J.preventDefault(), J.stopPropagation(), B(), h() }
      ```

      The style string above already declares `transition: background 0.2s` — transcribed with the
      rest of it — and nothing ever changed the background, so the transition described an animation
      that could not happen. A declared transition with no trigger is the same defect class as a
      class with no CSS.

      `preventDefault` and `stopPropagation` are the half that matters more. A carousel slide may be
      wrapped in a link (`slide.link`, "clicking the image opens this"), and an arrow sits INSIDE
      that link. Without these, paging a linked carousel navigates away from the note.

      Inline styles rather than a stylesheet rule, and `addEventListener` rather than `onmouseenter`:
      the first is what the reference does and what keeps this factory self-contained inside
      `setupCarousel`, which builds into rendered note HTML that no component stylesheet scopes; the
      second is this file's own convention and does not silently replace a handler someone else set.
    */
    button.addEventListener('mouseenter', () => (button.style.background = 'rgba(0,0,0,0.75)'));
    button.addEventListener('mouseleave', () => (button.style.background = 'rgba(0,0,0,0.45)'));
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      select(active + move);
      start();
    });
    element.append(button);
    controls.push(button);
  };

  const dotHolder = element.ownerDocument.createElement('div');
  dotHolder.setAttribute(
    'style',
    'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:10;'
  );
  const dots = Array.from({ length: count }, (_unused, index) => {
    const dot = element.ownerDocument.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show slide ${index + 1}`);
    dot.setAttribute(
      'style',
      `width:8px;height:8px;border-radius:50%;cursor:pointer;transition:background 0.2s;background:${index === 0 ? '#fff' : 'rgba(255,255,255,0.45)'};border:0;padding:0;`
    );
    dot.addEventListener('click', () => {
      select(index);
      start();
    });
    dotHolder.append(dot);
    return dot;
  });
  element.append(dotHolder);
  controls.push(dotHolder);

  control('‹', 'left', -1);
  control('›', 'right', 1);
  start();

  return () => {
    window.clearInterval(timer);
    controls.forEach((node) => node.remove());
  };
}

/** Creates a reactive Svelte attachment that renders only allowlisted note DOM. */
export function safeNoteHtml(contentHtml: string): Attachment<HTMLElement> {
  return (node) => {
    node.replaceChildren(sanitizeNoteHtmlForBrowser(contentHtml, node.ownerDocument));
    const cleanups = [...node.querySelectorAll<HTMLElement>('[data-ptr-carousel]')].map(
      setupCarousel
    );
    return () => cleanups.forEach((cleanup) => cleanup());
  };
}
