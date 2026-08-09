import { describe, expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Proves every server entry point under `/admin` is guarded, by reading the route tree.
 *
 * ## Why a test that reads files
 *
 * The guard is one function call. Nothing in TypeScript, ESLint or `svelte-check` can require it:
 * a `+page.server.ts` that simply omits `requireSuperadmin` compiles, type-checks, lints and ships,
 * and the only symptom is that every customer's data is served to anybody who guesses the URL.
 *
 * Unit tests do not close this either. `superadmin.test.ts` proves the guard REFUSES correctly; it
 * cannot prove the route CALLS it. Those are different claims and the gap between them is the whole
 * risk. This test reads what is actually on disk, so a new route is covered the moment it exists
 * rather than when somebody remembers to write a test for it.
 *
 * ## Both layers are required
 *
 * The layout guard makes protection the default. The page guard is the backstop, because
 * SvelteKit's documentation states plainly that a layout `load` does not run on every request —
 * it can be skipped during client-side navigation between child routes, and page and layout `load`
 * functions run concurrently unless the page awaits `parent()`. Requiring both is not belt-and-
 * braces theatre; it is what the framework's own guidance implies.
 */

const ADMIN_ROUTES = new URL('../../routes/(app)/admin/', import.meta.url).pathname;
const GUARD = 'requireSuperadmin';

/** Every server file under the admin tree, at any depth. */
async function serverEntryPoints(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await serverEntryPoints(full)));
      continue;
    }
    // The files SvelteKit runs on the server. A `+page.svelte` cannot leak data it is not given,
    // so it is deliberately not in this set.
    if (/^\+(page|layout)\.server\.ts$|^\+server\.ts$/.test(entry.name)) found.push(full);
  }
  return found;
}

const entryPoints = await serverEntryPoints(ADMIN_ROUTES);
const named = (path: string) => relative(ADMIN_ROUTES, path);

describe('every server entry point under /admin', () => {
  it('exists at all — a passing test over an empty directory proves nothing', () => {
    expect(entryPoints.length).toBeGreaterThan(0);
  });

  it.each(entryPoints.map((path) => [named(path), path]))('%s calls the guard', async (_name, path) => {
    const source = await readFile(path, 'utf8');
    expect(source).toContain(GUARD);
  });

  /*
    The layout is what makes protection the default rather than something each route opts into.
    Deleting it would leave every existing page still guarded and every FUTURE one exposed — a
    change that breaks nothing today and everything later, which is exactly the kind this catches.
  */
  it('is covered by a layout guard, so a new route is protected by existing', async () => {
    const layout = join(ADMIN_ROUTES, '+layout.server.ts');
    const source = await readFile(layout, 'utf8').catch(() => null);
    expect(source, '/admin/+layout.server.ts must exist and guard the whole subtree').not.toBeNull();
    expect(source).toContain(GUARD);
  });
});

describe('the admin tree', () => {
  /*
    A form action here is a cross-tenant WRITE. The console was read-only by design until
    2026-08-08; the rule now is that a write may exist but must be guarded, audited and bounded —
    which still needs enforcement rather than a sentence in a comment, otherwise the next `actions`
    export slips in during a busy afternoon and nobody notices the boundary moved.

    When billing needs destructive operations, this assertion is where the conversation starts:
    deleting it should be a deliberate act with its own review, not a side effect.
  */
  /*
    The console is no longer read-only, and this assertion changed on purpose.

    It used to be `not.toMatch(/export const actions/)`. Deleting it was always going to be the
    first step of §3.2, and deleting it ALONE would have removed the only thing standing between a
    cross-tenant read view and a cross-tenant write view. So it is replaced, not removed: every
    action that exists must be guarded, audited, and unable to lock the operator out.
  */
  it('guards, audits and bounds every write it exposes', async () => {
    for (const path of entryPoints) {
      const source = await readFile(path, 'utf8');
      if (!/export\s+const\s+actions\b/.test(source)) continue;

      // Guarded — the same check the load functions get. An action is a cross-tenant write.
      expect(source, `${named(path)} exports actions without requireSuperadmin`).toContain('requireSuperadmin');

      /*
        Audited, and by the AWAITED writer. `recordAdminAccess` is fire-and-forget and correct for
        a read; using it for a write would produce a change nobody can attribute when the insert
        fails.
      */
      expect(source, `${named(path)} writes without recordAdminWrite`).toContain('recordAdminWrite');
      expect(source, `${named(path)} must await its audit before writing`).toMatch(/await\s+recordAdminWrite\(/);

      /*
        Guarded against self-harm. An operator who suspends their own account is signed out by
        `readUser` on the next request and cannot sign back in to undo it — there is no recovery
        path in the product.
      */
      expect(source, `${named(path)} can suspend the operator's own account`).toContain('operator.accountId');
    }
  });

  /*
    Writes must be bounded to a known set. An action that takes a column name, a table, or an
    arbitrary status from the form is how a support tool becomes an arbitrary-write primitive.
  */
  it('never writes a status the application does not define', async () => {
    for (const path of entryPoints) {
      const source = await readFile(path, 'utf8');
      if (!/export\s+const\s+actions\b/.test(source)) continue;
      expect(source, `${named(path)} accepts an unvalidated status`).toMatch(
        /status !== ACCOUNT_ACTIVE && status !== ACCOUNT_SUSPENDED/
      );
    }
  });

  /*
    The columns that must never reach an operator's screen. Selecting a password hash or an API
    key's ciphertext would not fail any other check — it renders, it type-checks, and it hands a
    support view a customer's credentials.
  */
  it('never selects a credential column', async () => {
    const forbidden = [
      ['passwordHash', 'a password hash'],
      ['secretHash', 'an API key verification hash'],
      ['secretCiphertext', 'an encrypted API key secret'],
      ['settingsJson', "a room's 269 settings, which include webinarPW and ssoJWTSecret"]
    ] as const;

    for (const path of entryPoints) {
      const source = await readFile(path, 'utf8');
      for (const [column, why] of forbidden) {
        expect(source, `${named(path)} references ${column} — ${why}`).not.toContain(column);
      }
    }
  });
});
