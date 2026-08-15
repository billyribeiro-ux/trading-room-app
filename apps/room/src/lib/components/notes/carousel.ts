import {
  Node as TiptapNode,
  mergeAttributes,
  type DOMOutputSpecArray,
  type Editor
} from '@tiptap/core';

/*
  The image carousel: its Tiptap node, the parsers that read one back out of stored HTML, and the
  two document queries the editor's "Edit Carousel" button needs.

  This lives outside `NoteEditor.svelte` because none of it is component state — it is a schema and
  four pure functions — and because a `.svelte` file cannot be exercised without mounting it. Kept
  in the component, the round trip that matters (stored HTML → node attributes → stored HTML) could
  only be checked by eye. Here a test builds a real document and reads it back.

  Evidence: `docs/source/components/app-note.full.js`. `generateCarouselHtml()` emits the markup,
  `editCarousel()` reads it back, and `setupCarousel()` in `safe-html.ts` drives it once rendered.
*/

/*
  The ProseMirror document node, reached through the editor's own type rather than by importing
  `@tiptap/pm/model`. `@tiptap/pm` is not a direct dependency here — only `@tiptap/core` and the
  extensions are — and adding one for a single type would widen the dependency contract, which is
  one of the few changes this repository makes the full gate run for.
*/
type CarouselDoc = Editor['state']['doc'];

export type CarouselSlide = {
  link: string;
  url: string;
};

/** The node name, in one place, because a string typo here is a silently missing carousel. */
export const CAROUSEL_NODE = 'ptrCarousel';

/**
 * Clamps an untrusted value into a range, falling back when it is not a finite number at all.
 *
 * Stored notes carry whatever the reference wrote, and a hand-edited `data-ptr-carousel` carries
 * whatever somebody typed, so every number out of that attribute goes through this.
 */
export function numericRange(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : fallback;
}

/** Reads `interval` and `height` back out of the `data-ptr-carousel` JSON the reference writes. */
export function parseCarouselConfig(element: HTMLElement): { height: number; interval: number } {
  try {
    const parsed = JSON.parse(element.getAttribute('data-ptr-carousel') ?? '{}') as {
      height?: unknown;
      interval?: unknown;
    };
    return {
      height: numericRange(parsed.height, 10, 100, 90),
      interval: numericRange(parsed.interval, 1, 60, 5)
    };
  } catch {
    // Malformed JSON is a note somebody edited by hand, not a reason to lose the carousel.
    return { height: 90, interval: 5 };
  }
}

/**
 * Recovers the slide list from rendered markup.
 *
 * `generateCarouselHtml()` wraps each image in an `<a>` when it has a link and a `<div>` when it
 * does not, which is why the href is only read off an anchor. A slide with no image is dropped
 * rather than kept as a blank frame.
 */
export function parseCarouselSlides(element: HTMLElement): readonly CarouselSlide[] {
  const track = element.querySelector('.ptr-carousel-track');
  if (track === null) return [];
  return [...track.children]
    .map((child) => ({
      url: child.querySelector('img')?.getAttribute('src')?.trim() ?? '',
      link: child instanceof HTMLAnchorElement ? (child.getAttribute('href')?.trim() ?? '') : ''
    }))
    .filter(({ url }) => url.length > 0);
}

/** Narrows an unknown `slides` attribute — it survives a round trip through stored JSON — to slides. */
export function normalizeSlides(value: unknown): readonly CarouselSlide[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((slide: unknown) => {
      if (slide === null || typeof slide !== 'object') return null;
      const record = slide as Record<string, unknown>;
      return {
        url: typeof record.url === 'string' ? record.url.trim() : '',
        link: typeof record.link === 'string' ? record.link.trim() : ''
      };
    })
    .filter((slide): slide is CarouselSlide => slide !== null && slide.url.length > 0);
}

/**
 * Whether the document holds a carousel at all — the gate on the "Edit Carousel" button.
 *
 * Read on every editor transaction, so it stops descending the moment it finds one instead of
 * walking a long note to the end on each keystroke.
 */
export function hasCarousel(doc: CarouselDoc): boolean {
  let present = false;
  doc.descendants((node) => {
    if (node.type.name === CAROUSEL_NODE) present = true;
    return !present;
  });
  return present;
}

/**
 * The carousel the edit button should open, with the position needed to write it back.
 *
 * The reference always takes the first — `querySelector` returns it, and `replaceCarouselInEditor`
 * replaces it — so in a note holding two, the second is uneditable and saving silently overwrites
 * the first. That is data loss rather than a missing feature, so when the caller passes the
 * position of a selected node, that one wins. With one carousel, which is every captured note, the
 * two behave identically.
 */
export function findCarousel(
  doc: CarouselDoc,
  selectionFrom?: number
): { attrs: Record<string, unknown>; pos: number } | null {
  const matches: { attrs: Record<string, unknown>; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== CAROUSEL_NODE) return true;
    matches.push({ attrs: node.attrs, pos });
    // An atom node: nothing inside it is worth visiting.
    return false;
  });

  const selected =
    selectionFrom === undefined ? undefined : matches.find(({ pos }) => pos === selectionFrom);
  return selected ?? matches[0] ?? null;
}

/**
 * The `ptrCarousel` node.
 *
 * `renderHTML` reproduces `generateCarouselHtml()` from the reference exactly — the track is
 * `100 * slides.length` percent wide with each slide `100 / slides.length` of that, which is what
 * makes `translateX(-n * (100 / count))` land on slide `n`. `safe-html.ts` allow-lists precisely
 * these declarations, so changing one here without changing it there renders an unstyled carousel.
 */
export const PtrCarousel = TiptapNode.create({
  name: CAROUSEL_NODE,
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      height: {
        default: 90,
        parseHTML: (element) => parseCarouselConfig(element).height
      },
      interval: {
        default: 5,
        parseHTML: (element) => parseCarouselConfig(element).interval
      },
      slides: {
        default: [],
        parseHTML: (element) => parseCarouselSlides(element),
        // Held as a node attribute and rebuilt from the DOM on the way back in, never serialised
        // as an attribute of its own.
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-ptr-carousel]' }];
  },

  renderHTML({ node }) {
    const slides = normalizeSlides(node.attrs.slides);
    const interval = numericRange(node.attrs.interval, 1, 60, 5);
    const height = numericRange(node.attrs.height, 10, 100, 90);
    const width = slides.length === 0 ? 100 : 100 / slides.length;
    const slideSpecs: DOMOutputSpecArray[] = slides.map((slide) => {
      const image: DOMOutputSpecArray = [
        'img',
        {
          alt: '',
          src: slide.url,
          style: 'width:100%;height:100%;object-fit:contain;display:block;'
        }
      ];
      const wrapperStyle = `width:${width.toFixed(6)}%;height:100%;flex-shrink:0;display:block;overflow:hidden;`;
      return slide.link
        ? [
            'a',
            {
              href: slide.link,
              rel: 'noopener noreferrer',
              target: '_blank',
              style: wrapperStyle
            },
            image
          ]
        : ['div', { style: wrapperStyle }, image];
    });

    return [
      'div',
      mergeAttributes({
        'data-ptr-carousel': JSON.stringify({ interval, height }),
        style: `position:relative;width:100%;height:${height}%;overflow:hidden;background:#111;user-select:none;`
      }),
      [
        'div',
        {
          class: 'ptr-carousel-track',
          style: `display:flex;width:${Math.max(1, slides.length) * 100}%;height:100%;transition:transform 0.5s ease;will-change:transform;`
        },
        ...slideSpecs
      ]
    ] as unknown as DOMOutputSpecArray;
  }
});
