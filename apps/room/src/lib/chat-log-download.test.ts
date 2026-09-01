import { describe, expect, it } from 'vitest';

import { chatLogFileName, chatLogFileText } from '#lib/chat-log-download.js';

/**
 * The file `downloadLog("chat")` writes, driven — byte 1,416,419.
 *
 * Three details of this format are easy to approximate and impossible to notice afterwards: the
 * options passed to `toLocaleTimeString` carry DATE fields, there is NO SPACE before the bracket,
 * and lines end CRLF. A reader comparing our file to the reference's would see the same information
 * in all three cases and a diff in none of the ones that matter.
 *
 * They are the whole reason the format is a module rather than four lines inside a click handler:
 * asserting them by mounting a component would be testing the mount.
 */

/** A fixed instant, so every assertion is about the format and not about when it ran. */
const AT = Date.parse('2026-09-01T14:05:00.000Z');

describe('the line format is the capture s', () => {
  it('has NO space before the bracket', () => {
    /*
      `…toLocaleTimeString(…) + "[" + B.n + "]: " + B.txt`. `private-chat.svelte.ts`'s own transcription
      of `app-privchat`'s `downloadLog` HAS a space, because its capture has one. Two downloads, two
      formats, and the difference is upstream's — so a shared helper would have had to pick one and
      be wrong about the other.
    */
    const line = chatLogFileText([{ t: AT, n: 'Dana Vero', txt: 'morning' }]);
    expect(line).toContain('[Dana Vero]: morning');
    expect(line, 'a space here is the private-chat format, not this one').not.toContain(
      ' [Dana Vero]'
    );
  });

  it('ends every line CRLF, which a `\\n` would silently pass a reader', () => {
    const text = chatLogFileText([
      { t: AT, n: 'A', txt: 'one' },
      { t: AT, n: 'B', txt: 'two' }
    ]);
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.split('\r\n')).toHaveLength(3);
    /* And no bare LF anywhere, which is what a `\n` join would produce and Notepad would run together. */
    expect(text.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('carries the DATE, because the options say so even though the method is a TIME one', () => {
    /*
      `{year, month, day, hour, minute}` handed to `toLocaleTimeString` — the capture's own
      combination, and it looks like a mistake until you run it: the method honours the date fields.
      A log spanning days is unreadable without them, which is presumably why.

      Asserted through the platform rather than against a literal string: the exact punctuation is
      ICU's and varies by version, so pinning `"9/1/2026, 02:05 PM"` would be pinning a Node build.
      What must hold is that the date fields are present at all — which is what a plain
      `toLocaleTimeString()` would drop.
    */
    const expected = new Date(AT).toLocaleTimeString('en-us', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    expect(chatLogFileText([{ t: AT, n: 'A', txt: 'x' }])).toContain(expected);
    /* The control: a bare time-only format is SHORTER, so the two cannot coincide. */
    expect(expected.length).toBeGreaterThan(new Date(AT).toLocaleTimeString('en-us').length);
  });

  it('writes one line per message, in the order given', () => {
    /* Oldest-first is the SERVER's job (`chatLogForDownload` orders ascending); this preserves it. */
    const text = chatLogFileText([
      { t: AT, n: 'A', txt: 'first' },
      { t: AT + 1000, n: 'B', txt: 'second' }
    ]);
    expect(text.indexOf('first')).toBeLessThan(text.indexOf('second'));
  });

  it('an empty log is an empty file, not a header', () => {
    /* A room with nothing in range downloads an empty file, which is honest. */
    expect(chatLogFileText([])).toBe('');
  });
});

describe('the file name is the capture s', () => {
  it('is `ChatLog_` plus toDateString', () => {
    const now = new Date(AT);
    expect(chatLogFileName(now)).toBe(`ChatLog_${now.toDateString()}.txt`);
  });

  it('uses toDateString and NOT toLocaleDateString, which would put slashes in a filename', () => {
    /*
      `toDateString` is fixed-format (`Tue Sep 01 2026`) and always filename-safe; in much of Europe
      `toLocaleDateString` returns `01/09/2026`. Upstream chose the safe one and reproducing it is
      free. Asserted by shape rather than by comparing the two, because on a machine whose locale
      happens to use dots the comparison would pass with the wrong method.
    */
    expect(chatLogFileName(new Date(AT))).not.toContain('/');
    expect(chatLogFileName(new Date(AT))).toMatch(
      /^ChatLog_[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}\.txt$/
    );
  });
});
