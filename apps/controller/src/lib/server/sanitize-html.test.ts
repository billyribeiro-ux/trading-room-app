import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize-html';

describe('sanitizeHtml', () => {
  it('keeps the markup the editor actually produces', () => {
    const html = '<h2>Welcome</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>one</li></ul>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it('drops script tags entirely, content and all', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>alert(1)');
    // the tag is gone; the text that was inside it is escaped, not executed
    expect(sanitizeHtml('<script>alert(1)</script>')).not.toContain('<script');
  });

  it('survives the nested-tag trick that defeats a regex strip', () => {
    // a naive "remove <script>…</script>" leaves a working <script> behind here
    const out = sanitizeHtml('<scr<script>ipt>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<scr');
  });

  it('drops every event handler attribute', () => {
    expect(sanitizeHtml('<img src="/a.png" onerror="alert(1)">')).toBe('<img src="/a.png" alt="" />');
    expect(sanitizeHtml('<p onclick="alert(1)">x</p>')).toBe('<p>x</p>');
    // a newline inside the tag defeats a regex that anchors on whitespace
    expect(sanitizeHtml('<p\n onmouseover="alert(1)">x</p>')).toBe('<p>x</p>');
  });

  it('refuses javascript: and vbscript: urls', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="vbscript:msgbox">x</a>')).toBe('<a>x</a>');
    // control characters inside the scheme are stripped before the check
    expect(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeHtml('<a href="JaVaScRiPt:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('keeps ordinary links and adds noopener when they open a new tab', () => {
    expect(sanitizeHtml('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com">x</a>');
    expect(sanitizeHtml('<a href="https://example.com" target="_blank">x</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>'
    );
    expect(sanitizeHtml('<a target="_blank" rel="nofollow">x</a>')).toBe(
      '<a target="_blank" rel="nofollow noopener noreferrer">x</a>'
    );
    expect(sanitizeHtml('<a target="_blank" rel="opener SPONSORED noopener">x</a>')).toBe(
      '<a target="_blank" rel="sponsored noopener noreferrer">x</a>'
    );
  });

  it('allows data: only for real image types', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(sanitizeHtml(`<img src="${png}">`)).toBe(`<img src="${png}" alt="" />`);
    expect(sanitizeHtml('<img src="data:text/html;base64,PHNjcmlwdD4=">')).toBe('<img alt="" />');
    expect(sanitizeHtml('<img src="/portrait.png" alt="Profile portrait">')).toBe(
      '<img src="/portrait.png" alt="Profile portrait" />'
    );
    expect(sanitizeHtml('<a href="data:image/png;base64,x">y</a>')).toBe('<a>y</a>');
  });

  it('filters style down to a safe property list', () => {
    expect(sanitizeHtml('<p style="color: red">x</p>')).toBe('<p style="color: red">x</p>');
    expect(sanitizeHtml('<p style="position: fixed">x</p>')).toBe('<p>x</p>');
    expect(sanitizeHtml('<p style="background-image: url(javascript:alert(1))">x</p>')).toBe('<p>x</p>');
  });

  it('drops embedding tags that can host script', () => {
    for (const tag of ['iframe', 'object', 'embed', 'svg', 'math', 'style', 'link', 'meta', 'base']) {
      expect(sanitizeHtml(`<${tag}>x</${tag}>`)).not.toContain(`<${tag}`);
    }
  });

  it('closes tags left dangling, so the output cannot escape its container', () => {
    expect(sanitizeHtml('<div><p>x')).toBe('<div><p>x</p></div>');
    expect(sanitizeHtml('</p></div>')).toBe('');
  });

  it('escapes stray angle brackets in text', () => {
    expect(sanitizeHtml('5 < 6')).toBe('5 &lt; 6');
  });

  it('handles empty and absent input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
  });
});
