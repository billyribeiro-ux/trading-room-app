import { describe, expect, test } from 'vitest';
import { sanitizeNoteHtml } from './notes';

describe('sanitizeNoteHtml', () => {
  test('retains evidence-scoped formatting while stripping executable markup', () => {
    const sanitized = sanitizeNoteHtml(
      '<p>Hello <strong>traders</strong><script>alert(1)</script></p>'
    );

    expect(sanitized).toBe('<p>Hello <strong>traders</strong></p>');
    expect(sanitized).not.toContain('<script');
  });

  test('strips event handlers and unsafe image schemes', () => {
    const sanitized = sanitizeNoteHtml(
      '<img src="javascript:alert(1)" onerror="alert(2)" alt="chart" />'
    );

    expect(sanitized).toBe('<img alt="chart" />');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
  });

  test('hardens allowed links and rejects non-https absolute destinations', () => {
    const sanitized = sanitizeNoteHtml(
      '<a href="https://example.com/chart" target="_blank">chart</a>' +
        '<a href="data:text/html,bad">bad</a>'
    );

    expect(sanitized).toContain(
      '<a href="https://example.com/chart" target="_blank" rel="noopener noreferrer">chart</a>'
    );
    expect(sanitized).toContain('<a rel="noopener noreferrer">bad</a>');
  });

  test('retains the captured editor formatting, tables, and trusted video iframe', () => {
    const sanitized = sanitizeNoteHtml(
      '<p style="text-align:center"><span style="font-family:Arial;font-size:14px;color:#FF0000;background-color:#FFFF00;line-height:1.5">Plan</span></p>' +
        '<table style="width:100%"><tbody><tr><th>Risk</th><td>2</td></tr></tbody></table>' +
        '<iframe src="https://www.youtube-nocookie.com/embed/abc123" width="640" height="480" allowfullscreen></iframe>'
    );

    expect(sanitized).toContain('text-align:center');
    expect(sanitized).toContain('font-family:Arial');
    expect(sanitized).toContain('font-size:14px');
    expect(sanitized).toContain('<table style="width:100%">');
    expect(sanitized).toContain('https://www.youtube-nocookie.com/embed/abc123');
  });

  test('normalizes captured carousel data and rejects unsafe carousel attributes', () => {
    const sanitized = sanitizeNoteHtml(
      `<div data-ptr-carousel='{"interval":5,"height":90}' style="position:relative;width:100%;height:90%;overflow:hidden;background:#111;user-select:none;">` +
        '<div class="ptr-carousel-track" style="display:flex;width:200%;height:100%;transition:transform 0.5s ease;will-change:transform;">' +
        '<img src="https://example.com/one.png" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="alert(1)">' +
        '</div></div>' +
        `<div data-ptr-carousel='{"interval":0,"height":500}' onclick="alert(2)">bad</div>`
    );

    expect(sanitized).toContain(
      'data-ptr-carousel="{&quot;interval&quot;:5,&quot;height&quot;:90}"'
    );
    expect(sanitized).toContain('class="ptr-carousel-track"');
    expect(sanitized).toContain('object-fit:contain');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('height&quot;:500');
  });
});
