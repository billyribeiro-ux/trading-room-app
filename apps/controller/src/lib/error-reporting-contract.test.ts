import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  What a 500 leaves behind, pinned in both directions.

  On 2026-08-10 the home page answered 500 in production and the only evidence anywhere was
  `{ errorId, status, route, errorType: 'SyntaxError' }` — a constructor name with no message, no
  stack and no URL. The page rendered fine under SSR locally, a production build served it 200
  locally, and every module in the built server bundle passed `node --check`, so there was nothing
  to reproduce and nothing to read. Diagnosis stalled on a missing `console.error` argument.

  The opposite mistake is worse: a stack trace in an HTTP response hands an attacker the file
  layout. So the split below is the contract — everything to the log, nothing but an id to the
  client — and both halves are asserted, because fixing either one by hand tends to break the other.
*/
const hook = readFileSync(new URL('../hooks.server.ts', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);

describe('handleError', () => {
  it('logs the message, the stack and the URL, not just the error name', () => {
    for (const field of ['message:', 'stack:', 'url:', 'cause:']) {
      expect(hook, `${field} must reach the server log`).toContain(field);
    }
  });

  it('still returns only a generic message and an id to the client', () => {
    const returned = /return\s*\{([\s\S]*?)\};/.exec(hook)?.[1] ?? '';
    expect(returned).toContain('An unexpected error occurred.');
    expect(returned).toContain('errorId');
    // The whole point: none of the diagnostic fields may cross into the response.
    for (const leak of ['stack', 'cause']) {
      expect(returned, `${leak} must never be returned to the client`).not.toContain(leak);
    }
  });
});
