import { describe, expect, it } from 'vitest';

import { isEmptyChatHtml, sanitizeChatHtml } from './chat-html';

/*
  The chat allow-list. Every case here is either something the captured toolbar produces, or
  something an author could send by hand and must not get through.

  The toolbar, from the reference's own `rteConfig`:
    [['font', ['bold', 'italic', 'underline', 'clear']], ['color', ['forecolor']]]
*/

describe('sanitizeChatHtml — what the toolbar produces survives', () => {
  it('keeps bold, in both spellings a browser emits', () => {
    expect(sanitizeChatHtml('<b>hi</b>')).toBe('<b>hi</b>');
    expect(sanitizeChatHtml('<strong>hi</strong>')).toBe('<strong>hi</strong>');
  });

  it('keeps italic and underline', () => {
    expect(sanitizeChatHtml('<i>a</i> <em>b</em> <u>c</u>')).toBe('<i>a</i> <em>b</em> <u>c</u>');
  });

  it('keeps a forecolor as a span style', () => {
    expect(sanitizeChatHtml('<span style="color: #ff0000">red</span>')).toContain('color');
    expect(sanitizeChatHtml('<span style="color: rgb(1, 2, 3)">x</span>')).toContain(
      'rgb(1, 2, 3)'
    );
  });

  it('drops <font>, because our editor never emits one', () => {
    /*
      In the first draft this was allowed "for older browsers". Two things killed it:
      `sanitize-html` cannot value-check a plain attribute, so the regex written to guard it was
      dead code; and we do not use summernote — our editor emits `<span style="color">`. Allowing a
      tag nothing here produces is inventing a capability, not reproducing one. The TEXT survives.
    */
    expect(sanitizeChatHtml('<font color="#00ff00">g</font>')).toBe('g');
  });

  it('keeps paragraphs and breaks, which are how the editor holds lines', () => {
    expect(sanitizeChatHtml('<p>one</p><p>two</p>')).toBe('<p>one</p><p>two</p>');
    expect(sanitizeChatHtml('a<br />b')).toContain('<br />');
  });
});

describe('sanitizeChatHtml — what must never get through', () => {
  it('drops script, and its contents with it', () => {
    expect(sanitizeChatHtml('<script>alert(1)</script>')).toBe('');
    expect(sanitizeChatHtml('hi<script>alert(1)</script>')).toBe('hi');
  });

  it('drops event handlers while keeping the text', () => {
    expect(sanitizeChatHtml('<b onclick="steal()">x</b>')).toBe('<b>x</b>');
    expect(sanitizeChatHtml('<span onmouseover="x" style="color:#fff">y</span>')).not.toContain(
      'onmouseover'
    );
  });

  it('drops iframes, which the NOTE list allows and chat must not', () => {
    /*
      The reason this file exists instead of an import. A note is a document and may embed one; a
      chat line may not, or any presenter could frame anything into a multi-tenant room's log.
    */
    expect(sanitizeChatHtml('<iframe src="https://evil.test"></iframe>')).toBe('');
  });

  it('drops author-supplied links and images', () => {
    /*
      Links and inline images DO appear in chat — produced by the renderer from plain text, never by
      the author. An author-supplied <a href> could point somewhere its visible text does not say.
    */
    expect(sanitizeChatHtml('<a href="https://evil.test">bank.example</a>')).toBe('bank.example');
    expect(sanitizeChatHtml('<img src="x" onerror="steal()">')).toBe('');
  });

  it('drops styles the toolbar cannot produce', () => {
    // No background, no size, no family, no alignment: the captured toolbar has none of them.
    const out = sanitizeChatHtml(
      '<span style="color:#fff;background-color:#000;font-size:48px;position:fixed">x</span>'
    );
    expect(out).toContain('color');
    expect(out).not.toContain('background-color');
    expect(out).not.toContain('font-size');
    expect(out).not.toContain('position');
  });

  it('drops a colour that is not a colour', () => {
    // `url(...)` in a style value is how a CSS injection usually starts.
    expect(
      sanitizeChatHtml('<span style="color: url(javascript:alert(1))">x</span>')
    ).not.toContain('url(');
  });

  it('leaves plain text completely alone', () => {
    // The overwhelming majority of messages. Sanitising must not rewrite them.
    expect(sanitizeChatHtml('just a normal message with $AAPL and a ? in it')).toBe(
      'just a normal message with $AAPL and a ? in it'
    );
  });
});

describe('isEmptyChatHtml', () => {
  it('knows the four ways the reference reports an empty editor', () => {
    // `('' === e || '<p><br></p>' === e || '<br>' === e || '<p></p>' === e) && (e = '')`
    for (const empty of ['', '<p><br></p>', '<br>', '<p></p>']) {
      expect(isEmptyChatHtml(empty), empty).toBe(true);
    }
  });

  it('treats formatting-only and whitespace-only content as empty', () => {
    expect(isEmptyChatHtml('<b></b>')).toBe(true);
    expect(isEmptyChatHtml('<p>&nbsp;</p>')).toBe(true);
    expect(isEmptyChatHtml('<p>   </p>')).toBe(true);
  });

  it('is checked AFTER sanitising, so a fully-stripped message is empty', () => {
    /*
      The case that matters: content whose every tag was disallowed must not post as an empty
      bubble. `<script>` sanitises to '' and this reports it empty.
    */
    expect(isEmptyChatHtml(sanitizeChatHtml('<script>alert(1)</script>'))).toBe(true);
  });

  it('does not call real content empty', () => {
    expect(isEmptyChatHtml('<b>hi</b>')).toBe(false);
    expect(isEmptyChatHtml('hello')).toBe(false);
  });
});
