import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ── `0010_retire_ptr_clone_app.sql`, AND THE FOUR PROPERTIES THAT MAKE IT SAFE ─────────────────
 *
 * This migration removes a LOGIN role that `0001_baseline.sql` names in 22 RLS policies and every
 * grant — and that `0001` RE-CREATES on every new database. It is the highest-consequence shape a
 * migration in this repository can have after `0009`, and each property below was measured against
 * a live PostgreSQL 16.13 cluster on 2026-08-31 rather than reasoned about.
 *
 * ## What the live run established, so this file knows what it is protecting
 *
 * Three databases, one cluster:
 *
 *   `ptr_clone`        chain to `0009`, then `0010` — revoked and the role DROPPED
 *   `fresh_chain`      chain to `0009`, then `0010` — revoked, NOT dropped, because another
 *                      database still granted. Reported, and inert here: 0 grants remaining
 *   `interlock_probe`  chain to `0008` only — `0010` REFUSED, and the role survived the refusal.
 *                      After `0009` was applied, `0010` dropped the role from the cluster
 *
 * And after retirement, `tradingroom_app` kept all 87 table grants and all 22 policies, tenant A saw
 * only tenant A's room, tenant B only B's, and an unset tenant saw zero rows.
 *
 * ## Why a SOURCE contract rather than only the Rust suite
 *
 * `services/api/tests/migration_reappliability.rs` needs a provisioned cluster and `--features
 * testing`, so it does not run in this app's gate and does not run at all in a checkout without a
 * database. These four properties are visible in the SQL, and they are the four that a later edit
 * would most plausibly remove for looking redundant. `verify-backend.mjs` pins the file's bytes;
 * this says what those bytes must continue to MEAN.
 */
const MIGRATION = readFileSync(
  fileURLToPath(new URL('../../../../services/api/migrations/0010_retire_ptr_clone_app.sql', import.meta.url)),
  'utf8'
);

/**
 * The migration with its `--` comments removed — the same rule `codeOf` exists for, in SQL, and
 * `alert-report-modal-contract.test.ts` strips migrations the same way for the same reason.
 *
 * Load-bearing here rather than tidy. Two assertions below are NEGATIVE — that this migration never
 * CASCADEs, and never counts residue through `information_schema` — and the migration's own prose
 * EXPLAINS why it does neither, naming both. Read against the raw file, each fails on the
 * explanation of the very thing it is checking is absent: the most exact way a comment can vote on
 * a rule about code.
 */
const CODE = MIGRATION.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');

describe('the migration that retires the baseline role', () => {
  it('is the file this test thinks it is', () => {
    /* The vacuity floor: every assertion below is a search over this one string. */
    expect(MIGRATION.length).toBeGreaterThan(4_000);
    expect(MIGRATION).toContain('DROP ROLE ptr_clone_app');
  });

  it('REFUSES on a database where 0009 has not taken effect', () => {
    /*
      The interlock, and the reason it is first: without it, a database whose chain has not reached
      `0009` would lose the only role its RLS policies admit, and every tenant read would return
      nothing. Failing loudly on a database that is not ready is correct; leaving it with no working
      runtime role is not.
    */
    expect(MIGRATION).toContain("'tradingroom_app'::regrole::oid = ANY (polroles)");
    expect(MIGRATION).toContain('IF runtime_policies = 0 THEN');
    expect(MIGRATION).toContain('RAISE EXCEPTION');
  });

  it('never CASCADEs, in either branch', () => {
    /*
      Cascade would remove dependencies this migration has not enumerated, in databases it cannot
      see. That is the class of quiet action a schema change to a multi-tenant fintech cluster must
      never take — and it is exactly the shortcut somebody reaches for when `DROP ROLE` refuses.
    */
    expect(CODE).not.toContain('CASCADE');
    expect(CODE).not.toContain('DROP OWNED BY');
  });

  it('tolerates exactly ONE failure, and it is the cluster-global one', () => {
    /*
      Roles are cluster-global; privileges are per-database. `DROP ROLE` fails while any OTHER
      database still grants, which is the normal mid-rollout state — `0001` re-creates this role on
      every new database, so until the last one has run this migration the role is legitimately in
      use somewhere. A migration that failed there would block the chain everywhere but the final
      database, in an order nobody controls.

      So one condition is caught by NAME. A bare `WHEN OTHERS` would swallow the interlock's own
      exception and turn this migration into the silent no-op it exists not to be.
    */
    expect(MIGRATION).toContain('WHEN dependent_objects_still_exist THEN');
    expect(CODE, 'a blanket handler would swallow the interlock').not.toContain('WHEN OTHERS');

    /* Both outcomes announce themselves; neither branch is silent. */
    const handlerAt = MIGRATION.indexOf('WHEN dependent_objects_still_exist THEN');
    expect(handlerAt, 'the handler moved').toBeGreaterThan(-1);
    expect(MIGRATION.slice(handlerAt, handlerAt + 500)).toContain('RAISE NOTICE');
  });

  it('counts the residue from the CATALOGUE, across every class an ACL can live in', () => {
    /*
      Asserted zero before the drop is attempted, because a revoke loop that matched nothing looks
      identical to one that worked.

      The first draft counted through `information_schema` and was wrong in both directions: too
      narrow (no database, schema or type ACL — and the DATABASE grant is what made the first live
      run fail) and too wide (`column_privileges` reflects table grants onto every column, so it
      reported 922 where 26 column ACLs existed). These are the relations `DROP ROLE` itself walks.
    */
    for (const catalogue of [
      'pg_catalog.pg_database',
      'pg_catalog.pg_namespace',
      'pg_catalog.pg_class',
      'pg_catalog.pg_attribute',
      'pg_catalog.pg_proc',
      'pg_catalog.pg_type',
      'pg_catalog.pg_default_acl'
    ]) {
      expect(MIGRATION, `${catalogue} is not counted`).toContain(catalogue);
    }
    expect(MIGRATION).toContain('IF residual <> 0 THEN');
    expect(CODE, 'the residual is measured, never through the views').not.toContain(
      'information_schema.column_privileges'
    );
  });

  it('revokes the DATABASE grant, which is what a LOGIN role always has', () => {
    /*
      `CONNECT` lives on the database, in an ACL nothing above touches, and `DROP ROLE` refuses
      while it stands. Any deployment that has ever let this role log in holds exactly this grant,
      so a retirement without it leaves a droppable-looking role that is not one. Found by the first
      live run failing on it.

      `current_database()` and not a literal: the chain is applied to whatever database it is run
      against, and a name would work on the developer's and fail on the tenant's.
    */
    expect(MIGRATION).toContain('REVOKE ALL PRIVILEGES ON DATABASE %I FROM ptr_clone_app');
    expect(MIGRATION).toContain('current_database()');
  });

  it('is idempotent, because it runs on every database and re-runs on some', () => {
    expect(MIGRATION).toContain("WHERE rolname = 'ptr_clone_app'");
    expect(MIGRATION).toContain('RAISE NOTICE');
    const guardAt = MIGRATION.indexOf('IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles');
    expect(guardAt, 'the already-retired guard moved').toBeGreaterThan(-1);
    expect(MIGRATION.slice(guardAt, guardAt + 300)).toContain('RETURN;');
  });
});
