/*
  Tests get their own SQLite file instead of the app's.

  `src/lib/server/db` opens `DATABASE_URL` (default `.data/proroom.sqlite`) as a single
  shared connection. A dev server, a preview server or `node build` each hold a write
  connection to that same file for as long as they run, so a test transaction that
  upgrades from a read to a write races them and fails with

      SqliteError: database is locked

  SQLite raises that immediately rather than waiting out better-sqlite3's 5s busy timeout,
  because retrying a deferred transaction that already holds a read lock could deadlock.
  The failure is intermittent only because it depends on whether anything else happens to
  be running - which, with a dev server open, is the normal case.

  `setupFiles` run before any test module is imported, and the db module reads
  `process.env.DATABASE_URL` once at import time, so setting it here is what it picks up.
  The path is keyed by process id so parallel Vitest workers get one file each.
*/
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = join(tmpdir(), `ptr-test-db-${process.pid}`);
mkdirSync(directory, { recursive: true });
process.env.DATABASE_URL = join(directory, 'test.sqlite');

// Keyed by pid rather than per test file: with `isolate: false` several files share one
// worker process and one already-imported db module, so the file has to outlive them all.
process.once('exit', () => {
  rmSync(directory, { recursive: true, force: true });
});
