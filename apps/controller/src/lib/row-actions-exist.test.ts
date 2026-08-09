import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Every `?/action` the manage page posts to must be an action the server actually exports.

  This exists because of a concrete near-miss: the row menu's three newest items — Get FCM Tokens,
  Send Test Mobile Notifs, Resend Welcome Email — had their markup and their server actions written
  by different hands at the same time. Nothing in `svelte-check`, the type system or any existing
  test relates the string `?/sendTestPush` in a template to the key `sendTestPush` in an `Actions`
  object. A typo on either side is a button that silently 404s at the moment an operator uses it,
  and only then.

  Deliberately whole-file rather than row-menu-only: the same failure mode applies to every form on
  the page, and the check costs nothing extra.
*/

const ROOT = new URL('../routes/(app)/account/rooms/[id]/', import.meta.url);
const page = readFileSync(new URL('+page.svelte', ROOT), 'utf8');
const server = readFileSync(new URL('+page.server.ts', ROOT), 'utf8');

/** Comments stripped, so a `?/name` mentioned in prose is never mistaken for a wired form. */
const markup = page.replace(/<!--[\s\S]*?-->/g, '');

/** Every distinct `action="?/name"` in the template. */
const posted = [...new Set([...markup.matchAll(/action="\?\/([A-Za-z0-9_]+)"/g)].map((m) => m[1]))].sort();

/**
 * Every key of the exported `actions` object.
 *
 * Matched at its own indentation — two spaces then `name:` — rather than anywhere in the file, so
 * a nested object key or a local variable cannot masquerade as an action.
 */
const declared = new Set([...server.matchAll(/^ {2}([A-Za-z0-9_]+):\s*async/gm)].map((m) => m[1]));

describe('every posted action exists on the server', () => {
  it('found actions on both sides at all', () => {
    // If either extraction silently returns nothing, every assertion below passes vacuously —
    // which is the way this style of test usually rots.
    expect(posted.length).toBeGreaterThan(10);
    expect(declared.size).toBeGreaterThan(10);
  });

  for (const name of posted) {
    it(`?/${name} is exported by +page.server.ts`, () => {
      expect(declared.has(name)).toBe(true);
    });
  }
});
