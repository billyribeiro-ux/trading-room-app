import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ── `0010_retire_ptr_clone_app.sql`, AND THE FIVE PROPERTIES THAT MAKE IT SAFE ─────────────────
 *
 * This migration strips every privilege from a LOGIN role that `0001_baseline.sql` names in 22 RLS
 * policies and every grant — and that `0001` RE-CREATES on every new database. It is the
 * highest-consequence shape a migration in this repository can have after `0009`, and each property
 * below was measured against a live PostgreSQL 16.13 cluster on 2026-08-31 rather than reasoned
 * about.
 *
 * ## The property that reshaped the migration, and the one this file leads with
 *
 * It ended with `DROP ROLE ptr_clone_app` until the repository's own convergence suite refused it:
 *
 * ```text
 * the_chain_applies_to_a_second_database_on_the_same_cluster ... FAILED
 * ```
 *
 * Roles are cluster-global. The first database applied the chain and dropped the role; the SECOND
 * database on that cluster could then not START its chain, because the migrate preflight requires
 * `ptr_clone_app` to exist before `0001` runs — `0001` would otherwise reach the forensic branch
 * that creates it with the placeholder password committed at its line 26. A dropped role is not
 * convergent, and `migration_reappliability.rs` states that rule in its header.
 *
 * So the migration is revoke-only and per-database. The risk it exists to remove was never the row
 * in `pg_authid`; it was a login-capable identity holding DML on every table of a multi-tenant
 * fintech database. After it runs, that identity holds nothing here — asserted by count inside the
 * migration itself, before it announces success.
 *
 * ## What the live runs established, so this file knows what it is protecting
 *
 * Four databases, one cluster:
 *
 *   `ptr_clone`        chain to `0009`, then `0010` — every privilege revoked
 *   `fresh_chain`      chain to `0009`, then `0010` — every privilege revoked
 *   `interlock_probe`  chain to `0008` only — `0010` REFUSED, and the role survived the refusal
 *   `fence_probe`      the whole chain 1 → 10 through the `migrate` binary, then a SECOND run of
 *                      that binary against it, both exit 0
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
    /*
      The vacuity floor: every assertion below is a search over this one string.

      The needle is read from CODE rather than from the file, and that is not fussiness here. This
      migration's prose quotes the `DROP ROLE` it deliberately does NOT run, so a floor that matched
      the raw file would be satisfied by the explanation of the absent statement — the same defect
      two assertions below are stripped comments to avoid.
    */
    expect(MIGRATION.length).toBeGreaterThan(4_000);
    expect(CODE).toContain('REVOKE ALL PRIVILEGES ON TABLE');
    expect(CODE).toContain("rolname = 'ptr_clone_app'");
  });

  it('does NOT drop the role, because a dropped role is not convergent', () => {
    /*
      THE property, and it is stated as a negative because the positive is what a later reader will
      reach for: the migration is called "retire" and stops one statement short of what that word
      suggests. `migration_reappliability.rs` is where that statement was watched to fail — the
      second database on one cluster could not start its chain once the first had dropped the role.

      Read against CODE, not the file: the migration EXPLAINS the drop it does not perform, names it
      verbatim, and prints the operator's own `DROP ROLE ptr_clone_app;` as the documented manual
      end state. Against the raw text this assertion would fail on its own justification.
    */
    expect(CODE, 'the drop came back; read the note at the end of the migration').not.toContain('DROP ROLE');

    /* And the explanation is still there — a rule whose WHY was deleted gets re-broken. */
    expect(MIGRATION).toContain('convergent');
    expect(MIGRATION).toContain('the_chain_applies_to_a_second_database_on_the_same_cluster');
  });

  it('still announces what it did, so a silent no-op is not mistaken for success', () => {
    /*
      The migration's only remaining outcome is the revoke, so the NOTICE is the whole report. It
      names the residual it asserted and the policy count it checked, which is what distinguishes
      "revoked 87 grants" from "matched nothing and said nothing".
    */
    expect(CODE).toContain('RAISE NOTICE');
    expect(MIGRATION).toContain('ptr_clone_app RETIRED in this database');
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

  it('never CASCADEs, and catches no exception at all', () => {
    /*
      Cascade would remove dependencies this migration has not enumerated, in databases it cannot
      see. That is the class of quiet action a schema change to a multi-tenant fintech cluster must
      never take — and it is exactly the shortcut somebody reaches for when `DROP ROLE` refuses.

      The exception handler goes with the drop. While the drop existed, one condition was caught by
      name (`dependent_objects_still_exist`) for the mid-rollout case; with nothing left that may
      legitimately fail, any handler here could only hide the interlock's own refusal or a revoke
      that did not work. `EXCEPTION` is therefore asserted absent outright, which is a stronger and
      simpler rule than the one it replaces.
    */
    expect(CODE).not.toContain('CASCADE');
    expect(CODE).not.toContain('DROP OWNED BY');
    /*
      An exception HANDLER, not the `RAISE EXCEPTION` two assertions below depend on. In PL/pgSQL a
      handler's `EXCEPTION` sits alone on its line, opening the block; `RAISE EXCEPTION` never does.
      Matching the bare word would forbid the interlock's own refusal, which is how this assertion
      first went red.
    */
    expect(CODE, 'nothing here may swallow a failure').not.toMatch(/^[ \t]*EXCEPTION[ \t]*$/m);
    expect(CODE, 'a blanket handler would swallow the interlock').not.toContain('WHEN OTHERS');
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
    expect(CODE, 'the residual is the only proof the revokes worked, so it must still refuse').toContain(
      'refusing to drop'
    );
    expect(CODE, 'the residual is measured, never through the views').not.toContain(
      'information_schema.column_privileges'
    );
  });

  it('revokes the DATABASE grant, which is what a LOGIN role always has', () => {
    /*
      `CONNECT` lives on the database, in an ACL nothing above touches. Any deployment that has ever
      let this role log in holds exactly this grant, so a retirement without it leaves a role that
      can still open a session. Found by the first live run failing on it — back when the drop was
      still attempted, `DROP ROLE` refused on precisely this ACL.

      `current_database()` and not a literal: the chain is applied to whatever database it is run
      against, and a name would work on the developer's and fail on the tenant's.
    */
    expect(MIGRATION).toContain('REVOKE ALL PRIVILEGES ON DATABASE %I FROM ptr_clone_app');
    expect(MIGRATION).toContain('current_database()');
  });

  it('is idempotent, because it runs on every database and re-runs on some', () => {
    expect(MIGRATION).toContain("WHERE rolname = 'ptr_clone_app'");
    expect(CODE).toContain('RAISE NOTICE');
    const guardAt = MIGRATION.indexOf('IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles');
    expect(guardAt, 'the already-retired guard moved').toBeGreaterThan(-1);
    expect(MIGRATION.slice(guardAt, guardAt + 300)).toContain('RETURN;');
  });
});
