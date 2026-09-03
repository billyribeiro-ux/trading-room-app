import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Links in a message body.

  A pasted URL rendered as dead text - `parseStockSegments` only ever split on `$TICKER`. The
  capture runs every body through a `parseLinks` pipe:

      transform(e, i, o, s) {
        return sanitizer.bypassSecurityTrustHtml(
          e.replace(/((http|https|ftp):\/\/[\w?=&.@\/-;#~%-]+(?![\w\s?&.@\/;#~%"=-]*>))/gi,
            r => this.urlwrapImg(r, i, o, s))) }

      urlwrapImg(e, ...) {
        let r = e.toLowerCase();
        if (r.indexOf('.png') !== -1 || '.jpg' || '.jpeg' || '.gif' || '.jfif') { ...img-container... }
        return '<a href="' + e + '" target="_blank" class="linkColor" onclick="event.stopPropagation()">'
             + sanitize(e) + '</a>' }

  Two deliberate differences from the capture, both recorded here so neither is mistaken for drift:

    1. Segments, not an HTML string. The capture builds markup and hands it to
       `bypassSecurityTrustHtml`, relying on DOMPurify to keep that safe. Emitting real elements
       means a message body can never be parsed as markup at all. The rendered DOM is the same.

    2. `onclick="event.stopPropagation()"` is a Svelte handler rather than a literal attribute, so
       it does not appear in the serialised HTML. Kept because the capture has it.
*/

const source = readFileSync(new URL('./components/MessageBody.svelte', import.meta.url), 'utf8');
const segments = readFileSync(new URL('./message-body-segments.ts', import.meta.url), 'utf8');
const main = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the captured link pipe', () => {
  it('still reads out of the bundle', () => {
    expect(main).toContain(
      '\'<a href="\'+e+\'" target="_blank" class="linkColor" onclick="event.stopPropagation()">\''
    );
  });
});

describe('message bodies', () => {
  it('wraps a URL in the captured anchor', () => {
    expect(source).toContain('class="linkColor"');
    expect(source).toContain('target="_blank"');
    expect(source).toContain('event.stopPropagation()');
    /*
      MSB-06's `rel` deletion and the `Referrer-Policy` header that replaces it are asserted in
      `shell-body-rte-reference-contract.test.ts`, NOT here — this file is one of the 42 that
      `gate/evidence-bound-tests.mjs` excludes when the capture roots are absent, so an assertion
      added here would never have run in this checkout. Found by a negative control that produced
      no output at all rather than a failure.
    */
  });

  it("keeps the capture's URL pattern verbatim, range and all", () => {
    // `\/-;` is a RANGE - narrowing it would stop matching URLs the room links today.
    expect(segments).toContain(
      '/((http|https|ftp):\\/\\/[\\w?=&.@\\/-;#~%-]+(?![\\w\\s?&.@\\/;#~%"=-]*>))/gi'
    );
  });

  it('renders image URLs inline instead of as an anchor', () => {
    expect(segments).toContain("'.png', '.jpg', '.jpeg', '.gif', '.jfif'");
    expect(source).toContain('uploaded-img');
  });

  it('still splits tickers', () => {
    expect(source).toContain('stockColor');
  });

  it('never routes a body through {@html}', () => {
    // The capture's `bypassSecurityTrustHtml` has no counterpart here, on purpose.
    expect(source).not.toContain('{@html');
    expect(segments).not.toContain('{@html');
  });
});
