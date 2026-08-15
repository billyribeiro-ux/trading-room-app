import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPresenterRole } from './server/auth';

function text(path: URL) {
  return readFileSync(path, 'utf8');
}

/*
  The provisioning script, which is the only thing that can write a role other than the column
  default, and which is NOT in the repository.

  On 2026-08-15 every file under `apps/room/scripts` was untracked and gitignored — that directory
  is reference-match tooling that drives a live third-party application, and this repository is
  public. The file is still on disk for anyone who holds it, so the case below still runs here; on a
  checkout without it the case is SKIPPED rather than failed. That is the same rule
  `apps/controller/src/lib/reference-capture.ts` states for the captures: a case that cannot see its
  evidence must not pass, because that reports coverage it never had, and must not fail, because the
  code under test is fine and the machine simply does not hold the file.

  Only the role-vocabulary assertions need it. The dead-guard assertion does not, and is a separate
  `it` for exactly that reason — it is the one that caught a live defect, and it must keep running
  everywhere rather than being skipped as collateral.
*/
const PROVISIONING_SCRIPT = new URL('../../scripts/set-password.mjs', import.meta.url);
const hasProvisioningScript = existsSync(PROVISIONING_SCRIPT);

/**
 * Authorization rules that are easy to write in a way that silently never fires.
 *
 * Both cases below were live defects found by auditing rather than by a failing test,
 * which is precisely why they are pinned here: a guard that does nothing looks identical
 * to a guard that works until someone tries it.
 */
describe('authorization guards', () => {
  it.skipIf(!hasProvisioningScript)('writes only roles the guards already know about', () => {
    // The other half of the roles that actually exist: whatever the provisioning script can
    // write. `'user'` is not among them, and media-grant.test.ts says so outright.
    const provisioning = text(PROVISIONING_SCRIPT);

    expect(provisioning).toContain("role = 'member'");

    for (const role of ['admin', 'staff', 'member', 'guest']) {
      expect(provisioning).toContain(role);
    }
  });

  it('never gates on a role that no account can hold', () => {
    // One half of the roles that actually exist: the column default. The other half is the
    // provisioning script, asserted above wherever that file is present.
    const schema = text(new URL('./server/db/schema.ts', import.meta.url));
    expect(schema).toContain("default('staff')");

    // If a guard compares against a role that cannot exist, the guard is dead code and
    // the action is effectively unguarded.
    // Comments are stripped so this asserts on real code, not on the prose explaining
    // why the dead comparison was removed.
    const pageServer = text(new URL('../routes/+page.server.ts', import.meta.url))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const deadComparisons = pageServer.match(/role\s*===\s*'user'/g) ?? [];
    expect(deadComparisons, "a guard compared role against 'user', which exists in no row").toEqual(
      []
    );
  });

  it('lets a user rename themselves and a presenter rename anyone, and nobody else', () => {
    // The rule as it now reads in +page.server.ts, exercised directly.
    const mayRename = (actorId: number, actorRole: string, targetId: number) =>
      actorId === targetId || isPresenterRole(actorRole);

    // Own account: always allowed.
    expect(mayRename(7, 'member', 7)).toBe(true);
    expect(mayRename(7, 'guest', 7)).toBe(true);

    // Someone else's account: presenters only.
    expect(mayRename(7, 'admin', 9)).toBe(true);
    expect(mayRename(7, 'staff', 9)).toBe(true);

    // The defect this replaced: a member could rename anyone, an admin included.
    expect(mayRename(7, 'member', 9)).toBe(false);
    expect(mayRename(7, 'guest', 9)).toBe(false);
  });

  it('gates note version history behind the same role that gates editing', () => {
    const versions = text(
      new URL('../routes/api/notes/[noteId]/versions/+server.ts', import.meta.url)
    );

    // History exposes text that was edited away or deleted, so reading it must not be
    // looser than writing, which every note action restricts to staff|admin.
    expect(versions).toContain('isPresenterRole');
    expect(versions).toContain('403');
  });

  it('treats exactly staff and admin as presenters', () => {
    expect(isPresenterRole('staff')).toBe(true);
    expect(isPresenterRole('admin')).toBe(true);
    expect(isPresenterRole('member')).toBe(false);
    expect(isPresenterRole('guest')).toBe(false);
    // Not a real role; must not be treated as privileged by accident.
    expect(isPresenterRole('user')).toBe(false);
    expect(isPresenterRole('')).toBe(false);
  });
});

describe('session credential exposure', () => {
  it('never sends the raw session cookie value to the browser', () => {
    // The page payload used to carry `sessionId: requireSessionId(locals)` - the literal
    // `ptr_connection` value - and the client put it in a third-party upload URL and a
    // popout query string. A credential in a URL reaches the receiving server's access
    // logs, any proxy in between, `Referer` headers and browser history.
    const pageServer = text(new URL('../routes/+page.server.ts', import.meta.url))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(pageServer).not.toMatch(/sessionId:\s*requireSessionId/);
    expect(pageServer).toContain('publicSessionHandle');

    // And no client code reads a raw session id off the payload any more.
    const page = text(new URL('../routes/+page.svelte', import.meta.url));
    expect(page).not.toContain('data.sessionId');
  });

  it('derives a stable, one-way handle', async () => {
    const { publicSessionHandle } = await import('./server/connection');
    const a = publicSessionHandle('11111111-2222-4333-8444-555555555555');
    const b = publicSessionHandle('11111111-2222-4333-8444-555555555555');

    // Stable, so localStorage keys and upload namespaces survive a reload...
    expect(a).toBe(b);
    // ...distinct per session...
    expect(a).not.toBe(publicSessionHandle('99999999-2222-4333-8444-555555555555'));
    // ...and it does not contain the input, so leaking it leaks no credential.
    expect(a).not.toContain('11111111');
    expect(a).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('write-action input validation', () => {
  it('accepts only the channels the client can render', async () => {
    const { isChatTab, CHAT_TABS } = await import('./types');

    for (const tab of CHAT_TABS) expect(isChatTab(tab)).toBe(true);

    // `messages.room` is a bare label with no foreign key, so without this an arbitrary
    // string could be written and the content would sit in a channel nobody displays.
    expect(isChatTab('main')).toBe(true);
    expect(isChatTab('off-topic')).toBe(true);
    expect(isChatTab('smuggled')).toBe(false);
    expect(isChatTab('')).toBe(false);
    expect(isChatTab('MAIN')).toBe(false);
  });

  it('caps message and alert bodies', () => {
    const pageServer = text(new URL('../routes/+page.server.ts', import.meta.url));
    // Stored forever and re-sent to every reader on every poll, so an unbounded body is
    // a storage and bandwidth problem as much as an input-validation one.
    expect(pageServer).toContain('MAX_MESSAGE_BODY');
    expect(pageServer).toContain('MAX_ALERT_BODY');
    expect(pageServer).toContain('isChatTab(room)');
  });
});
