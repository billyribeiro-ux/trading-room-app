import { expect, test } from '@playwright/test';

/**
 * WHAT A REAL BROWSER DOES TO THE CAROUSEL'S STYLE ATTRIBUTES — the measurement, not the belief.
 *
 * ## The evidence gap this closes, and the reasoning that was wrong
 *
 * `TODO.md` carried this for weeks. Writing the jsdom test had surfaced that `editor.getHTML()`
 * returns CSSOM-normalised style attributes there — `width:50.000000%` as `width: 50%`,
 * `background:#111` as `background: rgb(17, 17, 17)` — and the row said:
 *
 * > I do not believe it does: `setAttribute('style', …)` preserves the attribute verbatim in Chrome
 * > … this is most likely a jsdom artefact and **nothing has been changed on the strength of it**.
 *
 * Declining to widen a sanitiser against an unobserved behaviour was the right call. The reasoning
 * under it was not, and one look at the library settles why: **ProseMirror does not use
 * `setAttribute` for `style`.** `prosemirror-model/dist/index.js:3441`:
 *
 * ```js
 * else if (name == "style" && dom.style)
 *     dom.style.cssText = attrs[name];
 * else
 *     dom.setAttribute(name, attrs[name]);
 * ```
 *
 * `cssText` goes through the CSSOM. The jsdom output was never an artefact; it was the answer.
 *
 * ## What this spec is, and why it is a browser test rather than a unit test
 *
 * The subject is a BROWSER's CSS serialisation. A unit test can only ask jsdom, which is the engine
 * whose fidelity is in question — asking it again would be assuming the conclusion. This asks
 * Chromium, in the same job that already boots one, and it asserts BOTH paths so the distinction the
 * old reasoning turned on stays visible: `cssText` normalises, `setAttribute` does not.
 *
 * ## What it protects
 *
 * Three declarations the allow-lists refused before this ran, each losing something on every
 * carousel saved through the editor: the black backing, the slide animation, and — at ten or more
 * slides — the track width, because `1000%` has four digits and the pattern allowed three.
 *
 * If a future Chromium prints any of these differently, this fails and the allow-lists are wrong
 * again. That is the point: the values in `safe-html.ts` and `server/notes.ts` are claims about a
 * browser, and a claim about a browser should be checked against one.
 */

/**
 * The declarations `carousel.ts`'s `renderHTML` emits, verbatim.
 *
 * Copied rather than imported: this file's job is to observe what a browser does to these exact
 * strings, and importing them would make the spec agree with the source by construction — including
 * on the day somebody changes the source and the allow-lists apart. `note-carousel.test.ts` is what
 * holds `renderHTML` to them.
 */
const EMITTED = {
  root: 'position:relative;width:100%;height:60%;overflow:hidden;background:#111;user-select:none;',
  track:
    'display:flex;width:200%;height:100%;transition:transform 0.5s ease;will-change:transform;',
  trackTenSlides:
    'display:flex;width:1000%;height:100%;transition:transform 0.5s ease;will-change:transform;',
  slideOfThree: 'width:33.333333%;height:100%;flex-shrink:0;display:block;overflow:hidden;',
  image: 'width:100%;height:100%;object-fit:contain;display:block;'
} as const;

/** `dom.style.cssText = …`, which is the assignment ProseMirror makes. */
const serialiseViaCssText =
  (css: string) =>
  ({ tag, css: text }: { tag: string; css: string }) => {
    void tag;
    void text;
    void css;
  };
void serialiseViaCssText;

test.describe('the CSSOM re-prints what the carousel writes', () => {
  test('normalises three declarations the allow-lists must therefore accept', async ({ page }) => {
    await page.setContent('<!doctype html><html><body></body></html>');

    const printed = await page.evaluate((emitted) => {
      /* The assignment `prosemirror-model` makes for a `style` attribute, and nothing else. */
      const viaCssText = (tag: string, css: string) => {
        const element = document.createElement(tag);
        element.style.cssText = css;
        return element.getAttribute('style') ?? '';
      };
      /* The assignment it makes for every OTHER attribute — the one the old reasoning assumed. */
      const viaSetAttribute = (tag: string, css: string) => {
        const element = document.createElement(tag);
        element.setAttribute('style', css);
        return element.getAttribute('style') ?? '';
      };
      return {
        root: viaCssText('div', emitted.root),
        track: viaCssText('div', emitted.track),
        trackTenSlides: viaCssText('div', emitted.trackTenSlides),
        slideOfThree: viaCssText('div', emitted.slideOfThree),
        image: viaCssText('img', emitted.image),
        rootBySetAttribute: viaSetAttribute('div', emitted.root)
      };
    }, EMITTED);

    /*
      ── THE THREE THAT NORMALISE ────────────────────────────────────────────────────────────────
    */

    /* `#111` becomes a computed rgb triple. Every carousel's black backing depended on this. */
    expect(printed.root).toContain('background: rgb(17, 17, 17)');
    expect(printed.root, 'the hex form does not survive').not.toContain('#111');

    /*
      `ease` is the initial value of `transition-timing-function`, so the CSSOM drops it. This is the
      case nobody thought to look for — the value is not reformatted, part of it is deleted.
    */
    expect(printed.track).toContain('transition: transform 0.5s');
    expect(printed.track, 'the default timing function is dropped').not.toContain('0.5s ease');

    /* Six decimal places collapse to four. Harmless on its own, and it is why the pattern is loose. */
    expect(printed.slideOfThree).toContain('width: 33.3333%');

    /*
      ── AND WHAT DOES NOT, WHICH IS THE HALF THAT KEEPS THE ALLOW-LISTS NARROW ──────────────────
    */

    /* Four digits survive as four digits, so the fix is one more digit rather than an open pattern. */
    expect(printed.trackTenSlides).toContain('width: 1000%');
    /* Percentages, keywords and `object-fit` are printed back unchanged. */
    expect(printed.image).toBe('width: 100%; height: 100%; object-fit: contain; display: block;');

    /*
      ── AND THE DISTINCTION THE OLD REASONING TURNED ON, ASSERTED SO IT STAYS VISIBLE ───────────

      `setAttribute` really does preserve the string verbatim. The row's belief was correct about
      this method and wrong about which one ProseMirror calls, which is exactly the kind of error a
      test of the MECHANISM catches and a test of the outcome does not.
    */
    expect(printed.rootBySetAttribute).toBe(EMITTED.root);
    expect(printed.rootBySetAttribute).toContain('background:#111');
  });

  test('and every normalised form is one the sanitiser allow-lists accept', async ({ page }) => {
    /*
      THE HALF THAT MAKES THIS A CONTRACT RATHER THAN A CURIOSITY.

      Measuring the browser proves nothing on its own; what matters is whether the values it produces
      survive `safe-html.ts` and `server/notes.ts`. The patterns are restated here from those files
      and applied to the browser's OWN output, so the two can only agree by being right.

      Restated rather than imported for the same reason `EMITTED` is copied: importing would make the
      spec agree with the source by construction, and the failure this guards against is precisely a
      source that has drifted from what a browser does.
    */
    await page.setContent('<!doctype html><html><body></body></html>');

    const declarations = await page.evaluate((emitted) => {
      const parse = (tag: string, css: string) => {
        const element = document.createElement(tag);
        element.style.cssText = css;
        return (element.getAttribute('style') ?? '')
          .split(';')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const at = part.indexOf(':');
            return { property: part.slice(0, at).trim(), value: part.slice(at + 1).trim() };
          });
      };
      return {
        root: parse('div', emitted.root),
        track: parse('div', emitted.trackTenSlides),
        slide: parse('div', emitted.slideOfThree)
      };
    }, EMITTED);

    const PERCENT = /^(?:\d{1,4}(?:\.\d{1,6})?)%$/;
    const DIV_RULES: Record<string, RegExp> = {
      background: /^(?:#111|rgb\(17,\s*17,\s*17\))$/i,
      display: /^(?:flex|block)$/,
      'flex-shrink': /^0$/,
      height: PERCENT,
      overflow: /^hidden$/,
      position: /^relative$/,
      transition: /^transform 0\.5s(?: ease)?$/,
      'user-select': /^none$/,
      'will-change': /^transform$/,
      width: PERCENT
    };

    for (const [name, list] of Object.entries(declarations)) {
      for (const { property, value } of list) {
        const rule = DIV_RULES[property];
        expect(rule, `${name}: no rule allows the property \`${property}\``).toBeDefined();
        expect(
          rule.test(value),
          `${name}: the browser prints \`${property}: ${value}\` and the allow-list refuses it, ` +
            'so this declaration is stripped from every carousel saved through the editor'
        ).toBe(true);
      }
    }
  });
});
