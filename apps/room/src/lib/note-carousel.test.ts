// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CAROUSEL_NODE,
  PtrCarousel,
  findCarousel,
  hasCarousel,
  normalizeSlides,
  numericRange,
  parseCarouselConfig,
  parseCarouselSlides
} from './components/notes/carousel';

/**
 * The image carousel, exercised against a REAL Tiptap document rather than a rendered string.
 *
 * `docs/source/components/app-note.full.js` holds the whole reference component:
 * `generateCarouselHtml()` writes the markup, `editCarousel()` reads it back into the modal, and
 * `replaceCarouselInEditor()` writes the edited version out. What matters is that a note saved by
 * the reference opens here with the same interval, height and slides — so these tests parse the
 * reference's own output shape and assert on what comes out the other side.
 *
 * ## The reference component moved out of this file on 2026-09-03, and here is why
 *
 * `docs/source` is gitignored, so a MODULE-SCOPE read of `app-note.full.js` excluded all twenty-two
 * cases here from every checkout without the dumps — this container, and CI. Eighteen of them build
 * a real Tiptap document and read nothing but this repository. `note-carousel-capture.test.ts` holds
 * the four that read the reference, as the whole `what the capture actually contains` block: every
 * assertion in it was about the original and none about us, so nothing had to be split in half.
 */
/** Exactly what `generateCarouselHtml()` emits, for two slides, one of them linked. */
const STORED = [
  `<div data-ptr-carousel='{"interval":7,"height":60}' style="position:relative;width:100%;height:60%;overflow:hidden;background:#111;user-select:none;">`,
  `<div class="ptr-carousel-track" style="display:flex;width:200%;height:100%;transition:transform 0.5s ease;will-change:transform;">`,
  `<a href="https://example.com/go" target="_blank" style="width:50.000000%;height:100%;flex-shrink:0;display:block;overflow:hidden;">`,
  `<img src="https://cdn.example.com/one.png" style="width:100%;height:100%;object-fit:contain;display:block;">`,
  `</a>`,
  `<div style="width:50.000000%;height:100%;flex-shrink:0;display:block;overflow:hidden;">`,
  `<img src="https://cdn.example.com/two.png" style="width:100%;height:100%;object-fit:contain;display:block;">`,
  `</div>`,
  `</div></div>`
].join('');

const editors: Editor[] = [];

function editorWith(content: string): Editor {
  const editor = new Editor({ extensions: [StarterKit, PtrCarousel], content });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

function element(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe('numericRange', () => {
  it('accepts a number inside the range and rejects everything else', () => {
    expect(numericRange(7, 1, 60, 5)).toBe(7);
    expect(numericRange('7', 1, 60, 5)).toBe(7);
    expect(numericRange(0, 1, 60, 5)).toBe(5);
    expect(numericRange(61, 1, 60, 5)).toBe(5);
    expect(numericRange('nonsense', 1, 60, 5)).toBe(5);
    expect(numericRange(null, 1, 60, 5)).toBe(5);
    expect(numericRange(undefined, 1, 60, 5)).toBe(5);
    expect(numericRange(Number.NaN, 1, 60, 5)).toBe(5);
    expect(numericRange(Number.POSITIVE_INFINITY, 1, 60, 5)).toBe(5);
  });

  it('keeps the boundaries themselves', () => {
    expect(numericRange(1, 1, 60, 5)).toBe(1);
    expect(numericRange(60, 1, 60, 5)).toBe(60);
  });
});

describe('reading a stored carousel back', () => {
  it('recovers interval and height from the reference JSON attribute', () => {
    expect(parseCarouselConfig(element(STORED))).toEqual({ interval: 7, height: 60 });
  });

  it('falls back rather than throwing on an attribute somebody hand-edited', () => {
    expect(parseCarouselConfig(element('<div data-ptr-carousel="{oops">'))).toEqual({
      interval: 5,
      height: 90
    });
    expect(parseCarouselConfig(element('<div>'))).toEqual({ interval: 5, height: 90 });
    // Out of range is not the same as absent, and both land on the same default.
    expect(
      parseCarouselConfig(element(`<div data-ptr-carousel='{"interval":900,"height":-4}'>`))
    ).toEqual({ interval: 5, height: 90 });
  });

  it('recovers the slides, taking the href only from the linked one', () => {
    expect(parseCarouselSlides(element(STORED))).toEqual([
      { url: 'https://cdn.example.com/one.png', link: 'https://example.com/go' },
      { url: 'https://cdn.example.com/two.png', link: '' }
    ]);
  });

  it('drops a frame with no image instead of keeping it blank', () => {
    const withEmpty = STORED.replace(
      '<img src="https://cdn.example.com/two.png" style="width:100%;height:100%;object-fit:contain;display:block;">',
      ''
    );
    expect(parseCarouselSlides(element(withEmpty))).toHaveLength(1);
  });

  it('returns nothing when the track is missing entirely', () => {
    expect(parseCarouselSlides(element('<div data-ptr-carousel="{}"></div>'))).toEqual([]);
  });
});

describe('normalizeSlides', () => {
  it('keeps well-formed slides and trims them', () => {
    expect(normalizeSlides([{ url: '  https://a/1.png ', link: ' https://b ' }])).toEqual([
      { url: 'https://a/1.png', link: 'https://b' }
    ]);
  });

  it('discards anything that is not a slide', () => {
    expect(normalizeSlides(null)).toEqual([]);
    expect(normalizeSlides('nope')).toEqual([]);
    expect(normalizeSlides([null, 4, 'x', {}, { link: 'https://b' }])).toEqual([]);
  });
});

describe('the document round trip', () => {
  it('parses stored markup into node attributes and writes the same markup back', () => {
    const editor = editorWith(STORED);
    const found = findCarousel(editor.state.doc);

    expect(found).not.toBeNull();
    expect(found?.attrs.interval).toBe(7);
    expect(found?.attrs.height).toBe(60);
    expect(normalizeSlides(found?.attrs.slides)).toEqual([
      { url: 'https://cdn.example.com/one.png', link: 'https://example.com/go' },
      { url: 'https://cdn.example.com/two.png', link: '' }
    ]);

    /*
      The written form has to be re-readable, because that is the only thing standing between an
      edit and a carousel that renders as an empty black box. The track width and the per-slide
      width are what `translateX` arithmetic depends on, so they are asserted rather than eyeballed.
    */
    const written = editor.getHTML();
    expect(written).toContain('data-ptr-carousel="{&quot;interval&quot;:7,&quot;height&quot;:60}"');
    expect(written).toContain('class="ptr-carousel-track"');
    /*
      Matched tolerantly, because SERIALISATION IS NOT VERBATIM. Tiptap writes through the DOM, and
      the CSSOM re-prints what it stores: `width:50.000000%` comes back as `width: 50%`, and
      `background:#111` as `background: rgb(17, 17, 17)`. What has to hold is the arithmetic — a
      track `100 × slides` wide with each slide `100 / slides` of it, which is what makes
      `translateX(-n × (100 / count))` land on slide n — not the exact characters.
    */
    expect(written).toMatch(/width:\s*200%/);
    expect(written).toMatch(/width:\s*50(?:\.0+)?%/);
    expect(written).toContain('href="https://example.com/go"');
    // Added on the way out and not present in the reference's own markup.
    expect(written).toContain('rel="noopener noreferrer"');
    expect(parseCarouselSlides(element(written))).toHaveLength(2);
  });

  it('a slide with no link is written as a div, not an empty anchor', () => {
    const written = editorWith(STORED).getHTML();
    const track = element(written).querySelector('.ptr-carousel-track');

    expect(track?.children[0]?.tagName).toBe('A');
    expect(track?.children[1]?.tagName).toBe('DIV');
  });
});

describe('hasCarousel', () => {
  it('is false for an ordinary note and true once one is present', () => {
    expect(hasCarousel(editorWith('<p>just words</p>').state.doc)).toBe(false);
    expect(hasCarousel(editorWith(STORED).state.doc)).toBe(true);
  });

  it('finds one nested inside a blockquote, which a top-level scan would miss', () => {
    const editor = editorWith(`<blockquote>${STORED}</blockquote>`);
    expect(hasCarousel(editor.state.doc)).toBe(true);
  });
});

describe('findCarousel', () => {
  it('returns null when there is none', () => {
    expect(findCarousel(editorWith('<p>words</p>').state.doc)).toBeNull();
  });

  it('takes the first when nothing is selected, as the reference always does', () => {
    const second = STORED.replace(/interval":7/, 'interval":9');
    const editor = editorWith(`${STORED}<p>between</p>${second}`);

    expect(findCarousel(editor.state.doc)?.attrs.interval).toBe(7);
  });

  it('takes the SELECTED one instead, which is the divergence', () => {
    /*
      The reference edits the first carousel whatever the user clicked, and its save then overwrites
      that first one — so in a note with two, the second can never be edited and attempting it
      destroys the first. Passing the selection is what avoids that.
    */
    const second = STORED.replace(/interval":7/, 'interval":9');
    const editor = editorWith(`${STORED}<p>between</p>${second}`);

    const all: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === CAROUSEL_NODE) all.push(pos);
      return true;
    });
    expect(all).toHaveLength(2);

    expect(findCarousel(editor.state.doc, all[1])?.attrs.interval).toBe(9);
    expect(findCarousel(editor.state.doc, all[0])?.attrs.interval).toBe(7);
    // A selection that is not a carousel falls back to the reference's behaviour.
    expect(findCarousel(editor.state.doc, 9999)?.attrs.interval).toBe(7);
  });
});

describe('saving an edit', () => {
  it('rewrites the carousel in place and leaves everything around it alone', () => {
    const editor = editorWith(`<p>before</p>${STORED}<p>after</p>`);
    const target = findCarousel(editor.state.doc);
    expect(target).not.toBeNull();

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(target?.pos ?? 0, undefined, {
        slides: [{ url: 'https://cdn.example.com/three.png', link: '' }],
        interval: 12,
        height: 45
      })
    );

    const written = editor.getHTML();
    expect(written).toContain('<p>before</p>');
    expect(written).toContain('<p>after</p>');
    expect(written).toContain('three.png');
    expect(written).not.toContain('one.png');
    expect(written).not.toContain('two.png');

    const reread = findCarousel(editor.state.doc);
    expect(reread?.attrs.interval).toBe(12);
    expect(reread?.attrs.height).toBe(45);
    expect(normalizeSlides(reread?.attrs.slides)).toHaveLength(1);
    // Still exactly one carousel: an edit must not leave the old one behind.
    expect(editor.getHTML().match(/data-ptr-carousel/g)).toHaveLength(1);
  });

  it('a single slide is written full width so the transform still lands on it', () => {
    const editor = editorWith(STORED);
    const target = findCarousel(editor.state.doc);

    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(target?.pos ?? 0, undefined, {
        slides: [{ url: 'https://cdn.example.com/only.png', link: '' }],
        interval: 5,
        height: 90
      })
    );

    const written = editor.getHTML();
    const track = element(written).querySelector<HTMLElement>('.ptr-carousel-track');

    expect(track?.style.width).toBe('100%');
    expect((track?.children[0] as HTMLElement | undefined)?.style.width).toBe('100%');
  });
});
