import { describe, expect, it } from 'vitest';

import { sanitizeNoteHtml } from '#lib/server/notes.js';

/**
 * THE BROWSER'S OWN OUTPUT, PUT THROUGH THE SERVER SANITISER.
 *
 * ## Why this file exists beside a browser spec
 *
 * `e2e/note-carousel-cssom.spec.ts` measures what Chromium prints and checks it against patterns
 * RESTATED in that file. This runs the real `sanitizeNoteHtml` over the same strings. The split is
 * deliberate and each half is useless alone:
 *
 *   * the spec can reach a browser but must restate the rules, so it cannot catch the two files
 *     drifting apart;
 *   * this can call the real sanitiser but cannot reach a browser, so the strings below are only
 *     trustworthy because the spec measured them.
 *
 * Together they close the loop: a browser said these are the bytes, and the sanitiser says these
 * bytes survive. Neither half is allowed to be the source of the other.
 *
 * ## The strings
 *
 * Copied from the Chromium 141 run on 2026-09-01 — `dom.style.cssText = …` then
 * `getAttribute('style')`, which is exactly what `prosemirror-model` does for a `style` attribute
 * (`dist/index.js:3441`) and therefore exactly what `editor.getHTML()` produces.
 *
 * Three of these were being STRIPPED before that measurement, on every carousel saved through the
 * editor: the black backing, the slide animation, and the track width at ten or more slides.
 *
 * ## A THIRD serialiser in the chain, found by writing this file
 *
 * The assertions below first read `background: rgb(17, 17, 17)` — the browser's spelling — and
 * failed on a declaration that had survived. `sanitize-html` REBUILDS the style attribute from the
 * declarations it kept, and its spelling is its own: no space after the colon, and no trailing
 * semicolon.
 *
 *     renderHTML writes   background:#111;
 *     the CSSOM prints    background: rgb(17, 17, 17);
 *     sanitize-html emits background:rgb(17, 17, 17)
 *
 * Three spellings of one declaration, and the value has a space inside the `rgb()` that survives all
 * three. Recorded because anything asserting on STORED note HTML is asserting on the third form, and
 * the first two are the ones a reader would reach for.
 */

/** Precisely what a browser hands `sanitizeNoteHtml`, for a two-slide carousel at 60% height. */
const AS_A_BROWSER_WRITES_IT = [
  '<div data-ptr-carousel=\'{"interval":7,"height":60}\'',
  ' style="position: relative; width: 100%; height: 60%; overflow: hidden;',
  ' background: rgb(17, 17, 17); user-select: none;">',
  '<div class="ptr-carousel-track"',
  ' style="display: flex; width: 200%; height: 100%; transition: transform 0.5s;',
  ' will-change: transform;">',
  '<div style="width: 50%; height: 100%; flex-shrink: 0; display: block; overflow: hidden;">',
  '<img alt="" src="https://cdn.example.com/one.png"',
  ' style="width: 100%; height: 100%; object-fit: contain; display: block;">',
  '</div></div></div>'
].join('');

describe('a carousel that has been through a real browser survives the server sanitiser', () => {
  const sanitized = sanitizeNoteHtml(AS_A_BROWSER_WRITES_IT);

  it('keeps the black backing, which every carousel was losing', () => {
    /*
      `background:#111` is what `renderHTML` writes and `rgb(17, 17, 17)` is what the CSSOM prints
      back. The allow-list accepted only the first, so the declaration was dropped and the carousel
      rendered on whatever was behind it.
    */
    expect(sanitized).toContain('background:rgb(17, 17, 17)');
  });

  it('keeps the slide animation, whose default timing function the CSSOM deletes', () => {
    /*
      `ease` is the initial value of `transition-timing-function`, so the CSSOM omits it — the value
      is not reformatted, part of it is REMOVED. That is the case the original reasoning could not
      have predicted, because it was looking for reformatting.
    */
    expect(sanitized).toContain('transition:transform 0.5s');
  });

  it('keeps a track wide enough for ten slides', () => {
    /*
      Ten slides make the track `1000%`, and the percent pattern allowed three digits. Above nine
      slides the track collapsed to its default width and every slide stacked on top of the first.
    */
    const tenSlides = AS_A_BROWSER_WRITES_IT.replace('width: 200%', 'width: 1000%');
    expect(sanitizeNoteHtml(tenSlides)).toContain('width:1000%');
  });

  it('keeps the geometry the arithmetic depends on', () => {
    /* Slide width, height and the flex layout: without these the translate lands on nothing. */
    expect(sanitized).toContain('width:50%');
    expect(sanitized).toContain('height:60%');
    expect(sanitized).toContain('display:flex');
    expect(sanitized).toContain('flex-shrink:0');
    expect(sanitized).toContain('object-fit:contain');
  });

  it('and the widening admitted no new PROPERTY and no new shape', () => {
    /*
      THE HALF THAT KEEPS THIS A NARROWING RATHER THAN A HOLE. Three values gained a second spelling;
      the allow-list is still deny-by-default and still refuses everything it refused before.

      Each of these is a real shape a style allow-list exists to stop, and each is checked on the
      carousel's own root element so it is refused in the position where it would matter.
    */
    const attack = (css: string) =>
      sanitizeNoteHtml(`<div data-ptr-carousel='{"interval":7,"height":60}' style="${css}"></div>`);

    /* A colour that is not the one colour. */
    expect(attack('background: rgb(255, 0, 0);')).not.toContain('rgb(255, 0, 0)');
    expect(attack('background: #112;')).not.toContain('#112');
    /* `url()` in any admitted property. */
    expect(attack('background: url(https://evil.example/x);')).not.toContain('url(');
    /* A different duration or a different property in the transition slot. */
    expect(attack('transition: all 9s ease;')).not.toContain('all 9s');
    expect(attack('transition: transform 9s;')).not.toContain('9s');
    /* A property that was never on the list. */
    expect(attack('position: fixed;')).not.toContain('fixed');
    expect(attack('z-index: 9999;')).not.toContain('z-index');
    /* And five digits, so the width bound is a bound rather than an opening. */
    expect(attack('width: 10000%;')).not.toContain('10000%');
  });
});
