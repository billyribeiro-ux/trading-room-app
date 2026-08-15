import { describe, expect, it } from 'vitest';
import { stripHtmlToText } from './chat-plain-text';

/*
  `stripHtmlToText` lived inside `+page.svelte` from the day the rich-text composer was built, so it
  has never been executed by a test — only asserted to EXIST, as a string, by
  `chat-rte-gate-contract.test.ts`. These are the first assertions about what it returns.
*/

describe('the plain-text twin of a rich message', () => {
  it('strips tags', () => {
    expect(stripHtmlToText('<p>hello <strong>there</strong></p>')).toBe('hello there');
  });

  it('turns `&nbsp;` into a space, because `trim()` does not treat it as whitespace', () => {
    /*
      The middle step, and the reason it exists. `'&nbsp;'.trim()` is `'&nbsp;'` — a message of
      nothing but spacing would otherwise survive as a non-empty body.
    */
    expect(stripHtmlToText('<p>&nbsp;</p>')).toBe('');
    expect(stripHtmlToText('<p>a&nbsp;b</p>')).toBe('a b');
  });

  it('leaves every other entity exactly as typed', () => {
    /*
      `body` is rendered as TEXT. `&amp;` reads correctly there as typed, and decoding it here would
      be the first half of an escaping round-trip nobody asked for — and the half that turns
      `&lt;script&gt;` back into something a future careless `{@html}` would run.
    */
    expect(stripHtmlToText('<p>Tom &amp; Jerry</p>')).toBe('Tom &amp; Jerry');
    expect(stripHtmlToText('<p>&lt;script&gt;</p>')).toBe('&lt;script&gt;');
  });

  it('trims the ends but not the middle', () => {
    expect(stripHtmlToText('<p>  spaced   out  </p>')).toBe('spaced   out');
  });

  it('returns empty for an empty editor, in each of the shapes one produces', () => {
    // The four `EMPTY_EDITOR_OUTPUT` shapes `$lib/server/chat-html.ts` enumerates.
    expect(stripHtmlToText('')).toBe('');
    expect(stripHtmlToText('<p><br></p>')).toBe('');
    expect(stripHtmlToText('<br>')).toBe('');
    expect(stripHtmlToText('<p></p>')).toBe('');
  });

  it('does not attempt to be a sanitiser', () => {
    /*
      Worth pinning so nobody mistakes it for one. `<[^>]*>` is a tag-shaped-text remover, and the
      server's `sanitizeChatHtml` is what actually decides safety. The value here feeds `body`, a
      text field, and the HTML path never goes through this function at all.
    */
    expect(stripHtmlToText('<img src=x onerror=alert(1)>caption')).toBe('caption');
  });

  it('and a bare `<` eats to the next `>`, which is why the input is sanitised HTML', () => {
    /*
      Pinned because I got it wrong first and had to read the regex rather than assume it. `<[^>]*>`
      is greedy from ANY `<` to the NEXT `>`, so in `a < b</p>` the match is `< b</p>` and the `b`
      goes with it. The result is `a`, not `a < b`.

      That is not a defect on the path this function serves, and the distinction matters: the input
      is always `sanitizeChatHtml` output, where a literal `<` a user typed is already `&lt;`. It is
      recorded here so the next reader knows the function is a tag remover for KNOWN-GOOD html and
      not a general html-to-text converter, and does not reach for it on raw user input.
    */
    expect(stripHtmlToText('<p>a < b</p>')).toBe('a');
    expect(stripHtmlToText('<p>a &lt; b</p>')).toBe('a &lt; b');
  });
});
