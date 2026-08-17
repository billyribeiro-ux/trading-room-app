import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { isEmptyChatHtml, sanitizeChatHtml } from './server/chat-html';

/*
  The rich-text path, end to end: what the server accepts, what the row records, and what the
  renderer is allowed to do with it.

  THE DESIGN DECISION THIS FILE GUARDS. A message is EITHER plain text or rich text, and which one
  is a FACT THE ROW CARRIES (`body_html`, nullable) rather than something the renderer infers from
  whether the body happens to contain angle brackets. Sniffing would render somebody who TYPED
  `<b>hello</b>` in the ordinary composer as bold — a different message from the one they sent.

  TWO SANITISERS, ON PURPOSE. The server pass is the control: it decides what is stored and a
  crafted request cannot bypass it. The browser pass covers rows written when the allow-list said
  something else — the case `notes-repository` already learned, where it re-sanitises historical
  rows on read. They must agree, and two lists that are supposed to agree are exactly the pair that
  drifts, so they are compared here.
*/

const SERVER_SANITIZER = readFileSync(new URL('./server/chat-html.ts', import.meta.url), 'utf8');
const BROWSER_SANITIZER = readFileSync(
  new URL('./components/chat-safe-html.ts', import.meta.url),
  'utf8'
);
const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
// `SERVER` is gone with `serverCode`: `+page.server.ts` no longer holds any of this.
const SCHEMA = readFileSync(new URL('./server/db/schema.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

// `serverCode` is gone: everything this file asserted about the server moved to the remote
// modules, and a reader that nothing reads is the next person's dead end.
const messageCode = stripComments(MESSAGE);

/** The tag list each sanitiser actually enforces, read out of its own source. */
function tagsOf(source: string): string[] {
  const match = /ALLOWED_(?:CHAT_)?TAGS = (?:new Set\()?\[([^\]]*)\]/.exec(source);
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : [];
}

describe('the two allow-lists agree', () => {
  it('server and browser permit exactly the same tags', () => {
    /*
      If these ever diverge, one of two things is true and both are bad: the browser strips what the
      server stored, so a message silently loses its formatting; or the browser renders what the
      server would have refused, which is the direction that matters.
    */
    const server = tagsOf(SERVER_SANITIZER);
    const browser = tagsOf(BROWSER_SANITIZER);
    expect(server.length, 'the server list must be findable').toBeGreaterThan(0);
    expect(browser).toEqual(server);
  });

  it('and that list is the captured toolbar, nothing more', () => {
    // [['font', ['bold', 'italic', 'underline', 'clear']], ['color', ['forecolor']]]
    expect(tagsOf(SERVER_SANITIZER)).toEqual(['b', 'br', 'em', 'i', 'p', 'span', 'strong', 'u']);
  });

  it('neither permits a link, an image or a frame', () => {
    for (const forbidden of ['a', 'img', 'iframe']) {
      expect(tagsOf(SERVER_SANITIZER)).not.toContain(forbidden);
      expect(tagsOf(BROWSER_SANITIZER)).not.toContain(forbidden);
    }
  });
});

describe('the row records which kind of message it is', () => {
  it('the column exists, is nullable, and is added idempotently', () => {
    expect(SCHEMA).toContain("bodyHtml: text('body_html')");
    // Nullable: no `.notNull()` on that column.
    expect(SCHEMA).not.toMatch(/bodyHtml: text\('body_html'\)\.notNull\(\)/);
    expect(DB).toContain("if (!messageColumns.has('body_html')) {");
    expect(DB).toContain('ALTER TABLE messages ADD COLUMN body_html TEXT');
  });
});

describe('the server is the control', () => {
  /*
    `sendMessage` moved to `chat-messages.remote.ts`. Re-pointed there, and that file is asserted to
    hold the command first — after an extraction a `toContain` can otherwise pass against a file
    that never held the thing, and a `not.toContain` almost certainly will.
  */
  const chatCommands = readFileSync(
    new URL('../routes/chat-messages.remote.ts', import.meta.url),
    'utf8'
  );

  it('sanitises what was submitted and stores only the result', () => {
    expect(chatCommands).toContain('export const sendMessage = command(');
    expect(chatCommands).toContain(
      "const sanitizedHtml = submittedHtml?.trim() ? sanitizeChatHtml(submittedHtml.trim()) : '';"
    );
    /*
      The submitted value is never what gets WRITTEN — scoped to the insert, which is what that has
      always meant. Left unscoped it now matches the command's own parameter destructuring
      (`{ bodyHtml: submittedHtml }`), which is a rename and not a write: the guard would have gone
      red for a reason that had nothing to do with what it guards.
    */
    const insert = chatCommands.slice(
      chatCommands.indexOf('db.insert(messages)'),
      chatCommands.indexOf('.run();', chatCommands.indexOf('db.insert(messages)'))
    );
    expect(insert, 'the insert must be found for this to guard anything').toContain(
      'roomShortCode'
    );
    expect(insert).not.toMatch(/bodyHtml:\s*submittedHtml/);
    expect(insert).toContain('bodyHtml,');
  });

  it('treats an all-stripped message as empty rather than posting a blank', () => {
    expect(chatCommands).toContain('!isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null');
  });

  it('still writes a plain-text body, so every existing reader keeps working', () => {
    /*
      The mention rule, the popup, search and any client that never learns about `body_html` all
      read `body`. Deriving it from the sanitised HTML means there is never an HTML-only message.
    */
    expect(chatCommands).toContain('const body = bodyHtml ? stripHtmlToText(bodyHtml)');
    /*
      It is `stripHtmlToText` now and no longer three lines written out here. The composer's
      optimistic copy already used that function and its docstring said "the two must agree" with no
      way to enforce it; one function is the enforcement. The regex itself is asserted where it now
      lives, so this still pins the derivation and not just a call.
    */
    const plainText = readFileSync(new URL('chat-plain-text.ts', import.meta.url), 'utf8');
    expect(plainText).toContain(".replace(/<[^>]*>/g, '')");
    expect(plainText).toContain(".replace(/&nbsp;/g, ' ')");
  });

  it('end to end: a hostile submission stores nothing renderable', () => {
    const hostile =
      '<img src=x onerror="steal()"><script>alert(1)</script><a href="https://evil.test">bank</a>';
    const stored = sanitizeChatHtml(hostile);
    expect(stored).not.toContain('onerror');
    expect(stored).not.toContain('script');
    expect(stored).not.toContain('href');
    // The words survive; only the markup goes.
    expect(stored).toBe('bank');
  });

  it('end to end: formatting a real message survives intact', () => {
    /*
      Asserted by structure, not by string equality: `sanitize-html` re-serialises the style
      declaration (`color: #ff0000` comes back as `color:#ff0000`), so comparing to the input tests
      the library's whitespace habits rather than our policy. The first draft did exactly that and
      failed on a space.
    */
    const typed = '<p><b>AAPL</b> looks <span style="color: #ff0000">weak</span></p>';
    const out = sanitizeChatHtml(typed);
    expect(out).toContain('<b>AAPL</b>');
    expect(out).toContain('weak');
    expect(out).toMatch(/color:\s*#ff0000/);
    expect(isEmptyChatHtml(out)).toBe(false);
  });
});

describe('the renderer', () => {
  it('selects the HTML branch from the COLUMN, never by sniffing the body', () => {
    expect(messageCode).toContain('{:else if item.bodyHtml}');
    // Somebody who types `<b>` must see the characters they typed.
    /*
      Scoped to sniffing for MARKUP. `item.body.includes('?')` is the question-mark rule and is
      correct; the first draft banned the method outright and failed on it. What must never appear
      is a test for a tag character deciding how to render.
    */
    expect(messageCode).not.toMatch(/item\.body\.includes\(['"]</);
  });

  it('reaches the DOM through the sanitising attachment', () => {
    expect(messageCode).toContain('{@attach safeChatHtml(item.bodyHtml)}');
  });

  it('keeps the existing no-raw-html rule intact', () => {
    /*
      `message-links-contract.test.ts` asserts bodies never use Svelte's raw-html tag, and it still
      passes: markup reaches the DOM through an attachment that sanitises first. This assertion is
      here so the two rules are visibly compatible rather than accidentally so.

      The literal is built rather than written, because that contract reads source text and a test
      file naming it would be indistinguishable from a component using it.
    */
    const rawHtmlTag = '{@' + 'html';
    expect(messageCode).not.toContain(rawHtmlTag);
  });

  it('does not run the plain-text segment parser over markup', () => {
    // That parser finds links, tickers and images in TEXT; over markup it would rewrite the
    // author's own tags. The HTML branch is a sibling of it, not a wrapper around it.
    const branch = messageCode.slice(messageCode.indexOf('{:else if item.bodyHtml}'));
    const nextBranch = branch.indexOf('{:else}');
    expect(
      nextBranch,
      'the branch must have an {:else} for this slice to be a branch'
    ).toBeGreaterThan(-1);
    expect(branch.slice(0, nextBranch)).not.toContain('bodySegments');
  });
});
