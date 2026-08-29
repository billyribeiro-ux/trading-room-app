import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE SESSION COOKIE STAYS UNREADABLE BY SCRIPT, AND NO TOKEN LEAKS INTO THE PAGE.
 *
 * ## Why this file exists, and what it is guarding against specifically
 *
 * `get-my-token` is a live button in `ModalHost.svelte`. The reference's handler (bundle byte
 * 2,255,348) opens a "Session Information" dialog rendering `globals.sesionToken` into a readonly
 * `<input>` with a Copy button. `TODO.md` row 4 described it for weeks as *"fully evidenced … and
 * merely unbuilt"*, which reads as an invitation to build it.
 *
 * **It must not be built that way.** This room's session cookie is set `httpOnly` in
 * `server/auth.ts`, so no script can read it — which is the whole point. Putting it in the DOM would
 * turn a value an XSS cannot reach into one it can, in a multi-tenant fintech room.
 *
 * The reference can do it because its room and its site are one system and `sesionToken` is already
 * a plain global there. This reconstruction split them, and the split is only worth anything while
 * the cookie stays closed.
 *
 * ## What this asserts, and why each half is needed
 *
 * A comment recording the decision is not a gate — the row that got this wrong was also a comment.
 * So two properties are pinned instead:
 *
 * 1. **the cookie is still `httpOnly`** — if somebody opens it, the reasoning above evaporates and
 *    this fails on the commit that does it rather than a year later;
 * 2. **no session token reaches client code** — every mention of `sesionToken`/`sessionToken` in the
 *    room's client source is inside a COMMENT quoting the reference. The moment one appears in code,
 *    the thing this decision prevents has happened.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Comments out, so the reference quotations this repository is full of are not read as code. */
const codeOf = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('the session cookie', () => {
  const auth = codeOf(readFileSync(`${ROOT}/lib/server/auth.ts`, 'utf8'));

  /**
   * The `cookies.set(SESSION_COOKIE, …)` options object, sliced out before anything is asserted.
   *
   * SCOPED, and a weaker draft is why. It first asserted `httpOnly: true` anywhere in the file plus
   * `toContain('SESSION_COOKIE')` as a vacuity guard — and the control for that guard DID NOT FIRE,
   * because renaming the constant to `SESSION_COOKIE_RENAMED` still contains the substring. Worse,
   * an `httpOnly: true` on some OTHER cookie would have satisfied the first assertion while the
   * session cookie was wide open.
   *
   * Reading the options of the session cookie's own `set` call ties the flag to the cookie it is
   * about, and makes removing or renaming that call fail rather than pass.
   */
  const sessionCookieOptions = (() => {
    const at = auth.indexOf('cookies.set(SESSION_COOKIE');
    if (at === -1) return null;
    const open = auth.indexOf('{', at);
    const close = auth.indexOf('}', open);
    return open === -1 || close === -1 ? null : auth.slice(open, close);
  })();

  it('is still set by this file', () => {
    expect(
      sessionCookieOptions,
      'no `cookies.set(SESSION_COOKIE, …)` call here any more — this gate is reading nothing, so find where the session cookie is set and point it there'
    ).not.toBeNull();
  });

  it('is set httpOnly', () => {
    expect(
      /httpOnly:\s*true/.test(sessionCookieOptions ?? ''),
      'the room session cookie is no longer httpOnly. Everything `get-my-token` is deliberately NOT built on rests on this: see its INERT_ACTIONS entry.'
    ).toBe(true);
  });
});

describe('no session token reaches the client', () => {
  /*
    CLIENT source only. `lib/server/**` and the route servers legitimately handle the session id —
    that is where it belongs — and sweeping them in would make this fail on correct code.
  */
  const clientFiles = [
    ...globSync('lib/**/*.{ts,svelte}', { cwd: ROOT }),
    ...globSync('routes/**/*.svelte', { cwd: ROOT })
  ]
    .map((relative) => relative.replaceAll('\\', '/'))
    .filter((relative) => !relative.includes('.test.') && !relative.startsWith('lib/server/'));

  it('found client files to read', () => {
    expect(clientFiles.length).toBeGreaterThan(50);
  });

  it('names no session token outside a comment', () => {
    const leaks: string[] = [];
    for (const file of clientFiles) {
      const code = codeOf(readFileSync(`${ROOT}/${file}`, 'utf8'));
      // The reference's own spelling AND the correct one: `sesionToken` is upstream's typo, and both
      // must stay out of client code.
      if (/\bses?sionToken\b/.test(code)) leaks.push(file);
    }
    expect(
      leaks,
      `${leaks.join(', ')} — a session token is named in CLIENT code. Every existing mention in this repository is a quotation of the reference inside a comment; one in code means the httpOnly cookie has been handed to the page, which is exactly what \`get-my-token\` is deliberately not built on.`
    ).toEqual([]);
  });
});
