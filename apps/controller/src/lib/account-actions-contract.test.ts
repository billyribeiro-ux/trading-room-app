import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The account page's forms against the actions that answer them, and the account scoping of the
  three that were added with badge editing and room archiving.

  Nothing in `svelte-check`, the type system or any other test relates the string `?/updateBadge` in
  a template to the key `updateBadge` in an `Actions` object, so a typo on either side is a control
  that silently 404s at the moment somebody uses it. `row-actions-exist.test.ts` does this for the
  MANAGE page; this is the same check for the page it was missing on.

  The scoping cases are here as well as in `account-row-scope.db.test.ts` on purpose: the database
  test is the proof, and it does not run in CI (no PostgreSQL binary). This one runs everywhere and
  fails the moment somebody drops the account out of a WHERE clause.
*/

const ROOT = new URL('../routes/(app)/account/', import.meta.url);
const page = readFileSync(new URL('+page.svelte', ROOT), 'utf8');
const server = readFileSync(new URL('+page.server.ts', ROOT), 'utf8');

/** Comments stripped, so an action named in prose is never mistaken for a wired form. */
const markup = page.replace(/<!--[\s\S]*?-->/g, '');

/**
 * Every distinct action the template posts to.
 *
 * `formaction` as well as `action`: the badge editor's "Save Edit for New Badge" button posts the
 * shared form to `?/updateBadge` that way, and a pattern reading only `action=` would have declared
 * this file clean while the edit path pointed nowhere.
 */
const posted = [
  ...new Set([...markup.matchAll(/\b(?:action|formaction)="\?\/([A-Za-z0-9_]+)"/g)].map((m) => m[1]))
].sort();

/** Every key of the exported `actions` object, matched at its own indentation. */
const declared = new Set([...server.matchAll(/^ {2}([A-Za-z0-9_]+):\s*async/gm)].map((m) => m[1]));

/**
 * One action's source, with its comments removed.
 *
 * The comments explain the scoping in prose, so searching the raw text for "accountId" would pass
 * on a body that only talks about it. This reads the code.
 */
function codeOf(name: string): string {
  const start = server.indexOf(`\n  ${name}: async`);
  expect(start, `${name} is not declared at action indentation in +page.server.ts`).toBeGreaterThan(-1);
  const rest = server.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[A-Za-z0-9_]+: async/);
  const body = next === -1 ? rest : rest.slice(0, next + 1);
  return body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '');
}

describe('every action the account page posts to exists on the server', () => {
  it('found forms and actions on both sides at all', () => {
    // If either extraction silently returns nothing, every assertion below passes vacuously.
    expect(posted.length).toBeGreaterThan(8);
    expect(declared.size).toBeGreaterThan(8);
  });

  it('includes the three controls this page was missing', () => {
    expect(posted).toContain('updateBadge');
    expect(posted).toContain('addBadgeDarkTheme');
    expect(posted).toContain('setRoomArchived');
  });

  for (const name of posted) {
    it(`?/${name} is exported by +page.server.ts`, () => {
      expect(declared.has(name)).toBe(true);
    });
  }
});

describe('a row can only be written by the account that owns it', () => {
  const scoped: [string, string][] = [
    ['updateBadge', 'eq(badges.accountId, accountId)'],
    ['addBadgeDarkTheme', 'eq(badges.accountId, accountId)'],
    ['setRoomArchived', 'eq(rooms.accountId, accountId)']
  ];

  for (const [name, clause] of scoped) {
    it(`${name} reads the account from the session and puts it in the WHERE clause`, () => {
      const code = codeOf(name);
      expect(code, 'the account must come from requireUser, never from the form').toContain('requireUser(locals)');
      expect(code).toContain(clause);
      /*
        The scoping has to be part of the write's own condition, not a SELECT beforehand. A
        SELECT-then-UPDATE is a TOCTOU: the row can change owner between the two statements, and the
        check would have passed against a row the write no longer touches.
      */
      expect(code, 'the scope must be in the same statement as the write').not.toContain('.select(');
    });

    it(`${name} treats zero rows changed as a refusal rather than a success`, () => {
      const code = codeOf(name);
      expect(code).toContain('.returning(');
      expect(code).toMatch(/changed\.length === 0/);
    });
  }
});

describe('editing a badge edits it', () => {
  it('updateBadge issues an UPDATE and never an INSERT', () => {
    const code = codeOf('updateBadge');
    expect(code).toContain('.update(badges)');
    /*
      The whole reason this action exists. Pointing "Save Edit for New Badge" at `?/createBadge`
      renders exactly the same and silently produces a SECOND badge, which is why the edit control
      was withheld until there was something other than an insert to save into.
    */
    expect(code, 'an edit that inserts is the bug this action was written to prevent').not.toContain('.insert(');
  });

  it('leaves the image alone, because the editor has no file field in edit mode', () => {
    // Writing `imageUrl` here would clear the image of every image badge that gets renamed.
    expect(codeOf('updateBadge')).not.toContain('imageUrl');
  });
});
