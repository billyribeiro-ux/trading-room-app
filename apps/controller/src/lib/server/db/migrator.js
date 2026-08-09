import { createHash } from 'node:crypto';
import { MIGRATIONS, MIGRATIONS_TABLE } from './migrations/index.js';

/**
 * Applies pending migrations, exactly once each, in order.
 *
 * Plain `.js` for the same reason the migration list is: `scripts/seed.mjs` runs this under node
 * with no bundler, and the app runs it under Vite. One implementation, not two.
 *
 * ## What the caller must provide
 *
 * A `postgres` handle that is ALREADY inside a transaction holding the bootstrap advisory lock.
 * This function takes neither, because the lock has to cover the migration table's own creation
 * too — and a function that sometimes opens a transaction and sometimes assumes one is exactly how
 * `sql.begin is not a function` reached production.
 */

/**
 * Stable across machines and node versions: the migration text decides the checksum, nothing else.
 *
 * @param {string} sql
 * @returns {string}
 */
export function checksum(sql) {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/**
 * Validates the migration list itself, before touching the database.
 *
 * Separated so a test can run it without a connection — these are the mistakes a reviewer makes at
 * 6pm, and none of them should need a database to catch.
 */
/**
 * @param {{ version: number; name: string; sql: string }[]} [migrations]
 * @returns {string[]}
 */
export function validateMigrations(migrations = MIGRATIONS) {
  /** @type {string[]} */
  const problems = [];
  let expected = 0;
  for (const migration of migrations) {
    if (migration.version !== expected) {
      problems.push(
        `migration ${migration.name} is version ${migration.version}; expected ${expected} — versions must be contiguous and ordered, or "apply everything after N" is ambiguous`
      );
    }
    expected = migration.version + 1;
    if (!migration.name || !/^[a-z0-9_]+$/.test(migration.name)) {
      problems.push(`migration ${migration.version} has no usable name`);
    }
    if (typeof migration.sql !== 'string' || migration.sql.trim().length === 0) {
      problems.push(`migration ${migration.version} (${migration.name}) has no SQL`);
    }
  }
  return problems;
}

/**
 * Runs everything not yet recorded.
 *
 * ## Atomicity is the CALLER's transaction, not one opened here
 *
 * This originally opened a transaction per migration with `sql.begin`. That threw
 * `sql.begin is not a function` in production and nowhere else, because `ensureDatabase` calls this
 * with a `TransactionSql` — which postgres-js does not give a `.begin` — while the test called it
 * with a top-level client, which does. The test proved nothing about the path that actually runs.
 *
 * So: every statement executes on whatever handle it is given, and the caller supplies the
 * transaction. `ensureDatabase` already opens one to hold the advisory lock, so the whole batch is
 * atomic — either all pending migrations apply and are recorded, or none are. That is a coarser
 * grain than per-migration, and it is the safe direction: it is impossible to record a migration
 * that did not apply, or apply one that was not recorded.
 *
 * `sql` is typed loosely on purpose: it is called with both a top-level client and a
 * `TransactionSql`, which postgres-js models as different types even though the surface used here —
 * tagged template, `.unsafe`, `.begin` — is identical on both.
 *
 * @param {any} sql a client already holding the bootstrap advisory lock
 * @param {{ version: number; name: string; sql: string }[]} [migrations]
 * @returns {Promise<{ applied: number[]; alreadyApplied: number[] }>}
 */
export async function runMigrations(sql, migrations = MIGRATIONS) {
  const problems = validateMigrations(migrations);
  if (problems.length > 0) {
    throw new Error(`the migration list is invalid:\n  ${problems.join('\n  ')}`);
  }

  await sql.unsafe(MIGRATIONS_TABLE);
  const recorded = new Map(
    (await sql`SELECT version, name, checksum FROM applied_migrations`).map(
      (/** @type {{ version: number; name: string; checksum: string }} */ row) => [Number(row.version), row]
    )
  );

  /** @type {number[]} */
  const applied = [];
  /** @type {number[]} */
  const alreadyApplied = [];

  for (const migration of migrations) {
    const digest = checksum(migration.sql);
    const previous = recorded.get(migration.version);

    if (previous) {
      /*
        The "never edit a shipped migration" rule, enforced rather than documented.

        Two databases at the same version number with different shapes is the worst failure this
        system can have, because everything downstream — including the next migration — assumes the
        version means something. Refusing to boot is the only safe answer.
      */
      if (previous.checksum !== digest) {
        throw new Error(
          `migration ${migration.version} (${migration.name}) has changed since it was applied ` +
            `(recorded ${String(previous.checksum).slice(0, 12)}…, now ${digest.slice(0, 12)}…). ` +
            'Never edit a shipped migration — add a new one.'
        );
      }
      alreadyApplied.push(migration.version);
      continue;
    }

    await sql.unsafe(migration.sql);
    /*
      `NOW()` — the DATABASE's clock, not this instance's.

      Several serverless instances apply migrations, and their clocks are not guaranteed to agree.
      `applied_at` is the column somebody reads to reconstruct the order things happened in, so it
      has to come from the one clock all of them share.
    */
    await sql`
      INSERT INTO applied_migrations (version, name, checksum, applied_at)
      VALUES (${migration.version}, ${migration.name}, ${digest}, NOW())
    `;
    applied.push(migration.version);
  }

  return { applied, alreadyApplied };
}
