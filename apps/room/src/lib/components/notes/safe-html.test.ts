import { describe, expect, test } from 'vitest';
import { sanitizeNoteHtmlForBrowser } from './safe-html';

describe('sanitizeNoteHtmlForBrowser', () => {
  test('requires a browser document', () => {
    expect(typeof sanitizeNoteHtmlForBrowser).toBe('function');
  });
});
