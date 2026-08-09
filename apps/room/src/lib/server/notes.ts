import sanitizeHtml from 'sanitize-html';

export const ALLOWED_NOTE_TAGS = [
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
  'i',
  'img',
  'iframe',
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
  'ul',
  'hr'
] as const;

const COLOR_VALUE =
  /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const FONT_FAMILY_VALUE =
  /^(?:Arial|Arial Black|Comic Sans MS|Courier New|Helvetica Neue|Helvetica|Impact|Lucida Grande|Tahoma|Times New Roman|Verdana)$/;
const FONT_SIZE_VALUE = /^(?:8|9|10|11|12|14|18|24|36)px$/;
const LINE_HEIGHT_VALUE = /^(?:1(?:\.0|\.2|\.4|\.5|\.6|\.8)?|2\.0|3\.0)$/;
const PERCENT_VALUE = /^(?:\d{1,3}(?:\.\d{1,6})?)%$/;

function carouselAttributes(attributes: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const value = attributes['data-ptr-carousel'];
  if (value === undefined) {
    return attributes.class === 'ptr-carousel-track'
      ? { class: 'ptr-carousel-track', style: attributes.style ?? '' }
      : attributes;
  }

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
      return {};
    }
    return {
      'data-ptr-carousel': JSON.stringify({ interval, height }),
      style: attributes.style ?? ''
    };
  } catch {
    return {};
  }
}

export function sanitizeNoteHtml(contentHtml: string): string {
  return sanitizeHtml(contentHtml, {
    allowedTags: [...ALLOWED_NOTE_TAGS],
    allowedAttributes: {
      a: ['href', 'rel', 'style', 'target', 'title'],
      col: ['colspan', 'style', 'width'],
      div: ['class', 'data-ptr-carousel', 'style'],
      iframe: ['allow', 'allowfullscreen', 'frameborder', 'height', 'src', 'title', 'width'],
      img: ['alt', 'height', 'src', 'style', 'title', 'width'],
      p: ['style'],
      span: ['style'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
      table: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      h5: ['style'],
      h6: ['style']
    },
    allowedStyles: {
      '*': {
        'background-color': [COLOR_VALUE],
        color: [COLOR_VALUE],
        'font-family': [FONT_FAMILY_VALUE],
        'font-size': [FONT_SIZE_VALUE],
        'line-height': [LINE_HEIGHT_VALUE],
        'text-align': [/^(?:left|center|right|justify)$/]
      },
      a: {
        display: [/^block$/],
        'flex-shrink': [/^0$/],
        height: [/^100%$/],
        overflow: [/^hidden$/],
        width: [PERCENT_VALUE]
      },
      col: {
        width: [PERCENT_VALUE]
      },
      div: {
        background: [/^#111$/i],
        display: [/^flex$/],
        height: [PERCENT_VALUE],
        overflow: [/^hidden$/],
        position: [/^relative$/],
        transform: [/^translateX\(-?\d+(?:\.\d+)?%\)$/],
        transition: [/^transform 0\.5s ease$/],
        'user-select': [/^none$/],
        'will-change': [/^transform$/],
        width: [PERCENT_VALUE]
      },
      img: {
        display: [/^block$/],
        height: [/^100%$/],
        'object-fit': [/^contain$/],
        width: [/^100%$/]
      },
      table: {
        'min-width': [/^\d+(?:\.\d+)?px$/],
        width: [PERCENT_VALUE]
      }
    },
    allowedSchemes: ['https'],
    allowedIframeHostnames: [
      'docs.google.com',
      'player.vimeo.com',
      'www.youtube-nocookie.com',
      'www.youtube.com'
    ],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
    nestingLimit: 50,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          rel: 'noopener noreferrer'
        }
      }),
      div: (_tagName, attributes) => ({
        tagName: 'div',
        attribs: carouselAttributes(attributes)
      })
    }
  });
}
