import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The four assertions about the reference NOTE component, split out of `note-carousel.test.ts` on
 * 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `note-carousel.test.ts` holds twenty-two cases. Eighteen of them build a REAL Tiptap document and
 * round-trip the carousel through it — `normalizeSlides`, `parseCarouselConfig`,
 * `parseCarouselSlides`, `findCarousel`, `hasCarousel`, `numericRange` — and read nothing but this
 * repository. Four read `docs/source/components/app-note.full.js`, which is gitignored, at MODULE
 * SCOPE, so `gate/evidence-bound-tests.mjs` excluded all twenty-two from every checkout without the
 * dumps. That is this container, and it is CI.
 *
 * The parser that decides whether a note written by the original opens correctly here was not run
 * by the machine that decides whether a branch is mergeable.
 *
 * ## What is here
 *
 * The whole `what the capture actually contains` block, moved intact — every one of its assertions
 * is about the reference and none is about us, so there is no half to leave behind. It is the
 * evidence the eighteen free cases are a transcription OF: the button and its gate, the modal
 * heading that swings on `isEditingCarousel`, and the two `querySelector` calls that take the FIRST
 * carousel — the behaviour `note-carousel.test.ts` records this application as diverging from.
 */

/*
  Resolved from the project root rather than from `import.meta.url`, the same way the file this was
  split from resolves it and for the same recorded reason: under `@vitest-environment jsdom` that
  value is an `http:` URL, not a `file:` one, and `readFileSync` refuses it — the failure is "The URL
  must be of scheme file". This file declares no jsdom environment, but the path stays identical so
  the two cannot drift; the length guard below makes a wrong working directory loud either way.
*/
const REFERENCE = readFileSync(
  resolve(process.cwd(), 'docs/source/components/app-note.full.js'),
  'utf8'
);

describe('what the capture actually contains', () => {
  it('read the reference component at all', () => {
    // An unreadable file would make every `toContain` in this block vacuous rather than red.
    expect(REFERENCE.length).toBeGreaterThan(40_000);
  });

  it('renders an Edit Carousel button gated on the note already holding one', () => {
    expect(REFERENCE).toContain("[1, 'btn', 'btn-secondary', 'text-center', 'm-1', 3, 'click']");
    expect(REFERENCE).toContain("[1, 'fas', 'fa-images']");
    expect(REFERENCE).toContain("v(2, ' Edit Carousel ')");
    expect(REFERENCE).toContain('O(10, e.carouselInNote ? 10 : -1)');
    expect(REFERENCE).toContain("includes('data-ptr-carousel')");
  });

  it('swings the modal heading and its submit button on the same flag', () => {
    expect(REFERENCE).toContain("e.isEditingCarousel ? 'Edit' : 'Insert', ' Image Carousel '");
    expect(REFERENCE).toContain("e.isEditingCarousel ? 'Save Changes' : 'Insert Carousel', ' '");
  });

  it('takes the first carousel and replaces the first, which is the behaviour we diverge from', () => {
    // `editCarousel()` and `replaceCarouselInEditor()` both reach for it the same way.
    expect(REFERENCE).toContain("querySelector('[data-ptr-carousel]')");
    expect(REFERENCE).toContain("querySelector('.ptr-carousel-track')");
  });
});
