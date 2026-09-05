#!/usr/bin/env node

/**
 * Deterministic, non-database gate for the imported Rust backend.
 *
 * `--migrations-only` verifies every committed migration byte, plus the
 * imported migrations' documented forensic lineage. The full command additionally formats Rust,
 * checks every workspace binary, runs the media library's unit tests, and compile-checks
 * every API test target with its test-only `testing` feature enabled.
 *
 * The full command intentionally does not execute PostgreSQL-backed API tests.
 * Those require provisioned owner/runtime roles, migrated schema, and the
 * committed fixture; compiling them is not evidence that those database
 * contracts pass.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/*
  THREE levels up, not one.

  `import.meta.url` is `apps/controller/scripts/…`, so `'../'` resolves to `apps/controller/` — the
  APP root, not the repository root. Everything below is addressed `services/api/…`, which lives at
  the repository root, so every one of those paths pointed at a directory that does not exist and
  this verifier died on its first `scandir`.

  It came from the sibling repository, where `services/` sits beside `scripts/` and `'../'` was
  right. Moving it under `apps/controller/` invalidated the assumption without changing the name,
  and because `pnpm test` runs this at step 2 the whole chain has been failing there ever since.
*/
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SERVICES_DIRECTORY = path.join(REPOSITORY_ROOT, 'services');
const SERVICES_MANIFEST = path.join(SERVICES_DIRECTORY, 'Cargo.toml');
const FORENSICS_PATH = 'docs/reference/original-new-room-backend-forensics.md';
const MIGRATIONS_DIRECTORY = 'services/api/migrations';
const MIGRATE_SOURCE_PATH = 'services/api/src/db/migrate.rs';
const ORIGINAL_SNAPSHOT = 'f84bae3e92ed266a762b6cab68afc97bf36b4dcc';
const BASELINE_SOURCE_PATH = 'second-dump/db/RECREATE.sql';

const HISTORIC_MIGRATIONS = Object.freeze([
  Object.freeze({
    path: 'services/api/migrations/0001_baseline.sql',
    sha256: 'c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9'
  }),
  Object.freeze({
    path: 'services/api/migrations/0002_room_capability_defaults.sql',
    sha256: '6f45aa701ebbb1f003e955c8fe408692dfce42a09a117fc8838af8d515715d22'
  }),
  Object.freeze({
    path: 'services/api/migrations/0003_room_events.sql',
    sha256: '4d22501a6899f48bc937a43b98e800657199d1d6b3670d12c2e1c66e7a1d1d40'
  }),
  Object.freeze({
    path: 'services/api/migrations/0004_list_memberships.sql',
    sha256: 'c39e4eb164a527028b1d4d0540fb98994f0b89b705405b1b70b6795776d2c4cc'
  })
]);

const REVIEWED_FORWARD_MIGRATIONS = Object.freeze([
  Object.freeze({
    path: 'services/api/migrations/0005_harden_runtime_role_and_room_events_policy.sql',
    sha256: 'f7e9e175a58788fbdd2f9f606a899b03bc24abaa463ce7764ae8a99a445e9e67'
  }),
  Object.freeze({
    path: 'services/api/migrations/0006_restrict_runtime_object_privileges.sql',
    sha256: 'e0406134d8f460bd7d2e83d650cd15735228136c3d73d6c46e1d264b570cfd27'
  }),
  // Reconciled from the sibling working folder on 2026-08-06; see
  // ops/backend-import-provenance.md "Reconciled sibling drift and re-seal".
  Object.freeze({
    path: 'services/api/migrations/0007_saved_polls.sql',
    sha256: '84c84dd92492c56c0dc34d4cad0185f91e97a59123f5992d9a359b8473fa8b57'
  }),
  Object.freeze({
    path: 'services/api/migrations/0008_room_events_tenant_keys.sql',
    sha256: '5b724072b09ba21c43fb9db03e3cd2cfbb0bbb8343b3b719c21b82e1fde266d2'
  }),
  /*
    Added 2026-08-10, pinned 2026-08-12 — and the gap between those two dates is the point.

    This gate could not run at all: `REPOSITORY_ROOT` resolved to `apps/controller/` rather than the
    repository root, so it died on `scandir` before reading a single migration. A migration was
    therefore added to the chain, deployed, and had a preflight defect found and fixed in it, all
    without the verifier that exists to pin exactly that ever executing.

    It renames the runtime role, which is the highest-risk shape a migration in this repository can
    have — `migrate.rs` requires that role by name BEFORE the chain runs, so getting it wrong locks
    every later migrate and API start out of the database.
  */
  Object.freeze({
    path: 'services/api/migrations/0009_provision_tradingroom_app.sql',
    sha256: '20b95d68bac75a698fa4e90502c2e54cc88d475d8b92bc4aada946a57700ce9c'
  }),
  /*
    `0010` finishes what `0009` began: it revokes every privilege `ptr_clone_app` holds in the
    database it runs on. Authored here on 2026-08-31 and pinned in the same commit.

    ## It is riskier than it looks, which is why it is here and not merely reviewed

    Its subject is a LOGIN role that `0001_baseline.sql` names in 22 RLS policies and every grant,
    and that `0001` RE-CREATES on every new database. Four properties make that safe, and each was
    measured against a live PostgreSQL 16.13 cluster rather than argued:

      * an INTERLOCK — it refuses unless `tradingroom_app` is already named by an RLS policy, so a
        database where `0009` has not taken effect keeps its only working role. Verified by running
        the chain to `0008` and watching `0010` refuse; the role survived the refusal.
      * it does NOT drop the role, and that is the property that reshaped it. The first version
        ended in `DROP ROLE`, tolerating `dependent_objects_still_exist` for the mid-rollout case;
        `migration_reappliability.rs` then failed on
        `the_chain_applies_to_a_second_database_on_the_same_cluster`, because roles are
        cluster-global and the SECOND database could no longer start its chain — the migrate
        preflight requires that role to exist before `0001` runs. A dropped role is not convergent.
      * PER-DATABASE and complete. What the risk ever was is a login-capable identity holding DML on
        every table of a multi-tenant fintech database; after this runs, on this database, it holds
        no table, column, routine, schema, default or CONNECT privilege at all.
      * a residual COUNT over every ACL class in the catalogue, asserted zero before it reports
        success. Its first draft counted through `information_schema` and was both too narrow and
        too wide; the catalogue is what PostgreSQL itself walks.

    The role's own removal is a documented OPERATOR step for a cluster that will take no further new
    databases, and `db::migrate::baseline_role_absence_policy` is what keeps that step from bricking
    the next deploy — measured, `exit 1` to `exit 0` with the tenancy intact.
  */
  Object.freeze({
    path: 'services/api/migrations/0010_retire_ptr_clone_app.sql',
    sha256: 'f38b8ee829abb7e0525d4f31ccb389ddafad9e92c309c53a18ddc9969e1e5251'
  }),
  /*
    Authored and reviewed 2026-09-03 for cutover Gate 2. This is the first migration that makes
    account owner/admin authority explicit rather than inferring it from one room's role. It is
    forward-only; refuses an ambiguous historic owner backfill; enforces the two account roles and
    at most one owner; applies the reviewed tenant RLS policy; revokes all direct runtime table
    access; and exposes only a user-bounded SECURITY DEFINER resolver with a pinned search_path and
    no PUBLIC execute grant. Its live PostgreSQL migration/ACL/RLS/negative controls are in
    services/api/tests/migrations.rs.
  */
  Object.freeze({
    path: 'services/api/migrations/0011_enterprise_memberships.sql',
    sha256: '37f96aad9a4451848bbad3733edfdab52d05b173a0d00f1c20d2a0f6c15592d1'
  }),
  /*
    Authored and reviewed 2026-09-03 for cutover Gate 3. The migration adds explicit enterprise
    suspension state plus owner-only, resumable cross-database conversion runs and one-to-one
    legacy entity mappings. Runtime receives no privilege on either ledger table; PostgreSQL
    integration tests prove uniqueness, digest constraints, and denied runtime access.
  */
  Object.freeze({
    path: 'services/api/migrations/0012_legacy_cutover_ledger.sql',
    sha256: '0a9d0946b47a3f4f92959155587687828d785c69e4224a413be5f461ac01e695'
  }),
  /*
    Authored and reviewed 2026-09-03 for the first Gate 3 request-path slice. It grants only
    column-level UPDATE on users.display_name to the restricted runtime role and asserts that
    relation-wide UPDATE and is_platform_admin UPDATE remain absent. The handler binds the
    authenticated UUID; live PostgreSQL HTTP and ACL tests prove read-after-write, guest/session
    refusal, over-post rejection, and the exact surviving privilege boundary.
  */
  Object.freeze({
    path: 'services/api/migrations/0013_profile_write_privilege.sql',
    sha256: 'ee8eea163f4d9fb5aa4786313c48ed85ae30d1fc4bd5925ef1129aef99ff7549'
  }),
  /*
    Authored and reviewed 2026-09-04 for the canonical room-lifecycle slice. It adds an absolute
    archive timestamp and an enterprise-scoped creation idempotency key without widening runtime
    privileges. Real PostgreSQL migration and HTTP tests prove duplicate-request convergence,
    stable archive timestamps, tenant omission, exact request envelopes, and audit-on-change only.
  */
  Object.freeze({
    path: 'services/api/migrations/0014_room_lifecycle_authority.sql',
    sha256: '21932f0090dee30ab5c6cb3dce380ddaf4408283803e3871cdb2c18b27f626ed'
  }),
  /*
    Authored and reviewed 2026-09-04 after the room slice's concurrency audit. The tenant-bound,
    user-bounded SECURITY DEFINER function locks matching owner/admin authority for the caller's
    transaction. Runtime still has no direct enterprise_memberships privilege; PUBLIC cannot call
    the function. Live PostgreSQL tests prove fail-closed tenant omission and a blocked concurrent
    revocation by its exact SQLSTATE.
  */
  Object.freeze({
    path: 'services/api/migrations/0015_lock_account_authority.sql',
    sha256: '35cd20f21d2f4fbfd00cdf3fdb0b4e02f1a86db120a1344022c95d2cf5f3f199'
  }),
  /*
    Authored and reviewed 2026-09-04 for canonical room-settings authority. It adds a monotonic
    settings revision and object-only invariant to rooms, extends the owner-only conversion ledger,
    and adds a forced-RLS append-only request ledger with only SELECT/INSERT runtime grants. Fresh
    PostgreSQL tests prove exact ACLs, tenant omission, idempotent mutation, conflict behavior, and
    aggregate bounds.
  */
  Object.freeze({
    path: 'services/api/migrations/0016_room_settings_authority.sql',
    sha256: 'e785d03c9592017764c26a0bf629ba1441063f6463472fc86220de64e4bfaf9d'
  }),
  /*
    Authored and reviewed 2026-09-04 for canonical membership authority. It adds optimistic
    revisions and managed state, a deferred last-owner invariant, fail-closed runtime membership
    resolvers, and a forced-RLS append-only mutation ledger with SELECT+INSERT-only runtime access.
  */
  Object.freeze({
    path: 'services/api/migrations/0017_membership_authority.sql',
    sha256: 'fa97e4f2bd787d4e0f19d3503ae4104baa933f5ec8963922ad99e3eb0933182e'
  }),
  /*
    Authored and reviewed 2026-09-05 for canonical badge authority. It replaces JSON-only member
    assignments with composite-tenant foreign keys, revisioned definitions, and a forced-RLS,
    append-only exactly-once ledger. Real PostgreSQL tests prove ACLs, RLS omission, cross-tenant
    actor/badge refusal, message snapshot immutability, and referential cleanup on deletion.
  */
  Object.freeze({
    path: 'services/api/migrations/0018_badge_authority.sql',
    sha256: '847f9b465741f86bd5a44ad7a415e5a39e0401f188452e7ba7322697ec95f9ff'
  })
]);

const PINNED_MIGRATIONS = Object.freeze([...HISTORIC_MIGRATIONS, ...REVIEWED_FORWARD_MIGRATIONS]);

const BASELINE_SHA256 = HISTORIC_MIGRATIONS[0].sha256;

function fail(message) {
  throw new Error(`[backend:check] ${message}`);
}

function repositoryPath(relativePath) {
  return path.join(REPOSITORY_ROOT, ...relativePath.split('/'));
}

async function digest(relativePath) {
  const bytes = await readFile(repositoryPath(relativePath));
  return createHash('sha256').update(bytes).digest('hex');
}

function assertDocumentedHash(document, artifactPath, expectedHash) {
  const tableRow = `| \`${artifactPath}\` | \`${expectedHash}\` |`;
  if (!document.includes(tableRow)) {
    fail(`${FORENSICS_PATH} no longer records the exact ${artifactPath} integrity anchor`);
  }
}

async function verifyHistoricMigrationSet() {
  const migrationDirectory = repositoryPath(MIGRATIONS_DIRECTORY);
  const migrationNames = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();

  for (const name of migrationNames) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/u.test(name)) {
      fail(`${MIGRATIONS_DIRECTORY}/${name} does not follow the versioned migration contract`);
    }
  }

  const expectedMigrationNames = PINNED_MIGRATIONS.map(({ path: migrationPath }) => path.posix.basename(migrationPath));
  if (JSON.stringify(migrationNames) !== JSON.stringify(expectedMigrationNames)) {
    fail(
      `pinned migration set changed: expected ${expectedMigrationNames.join(', ')}, got ${migrationNames.join(', ')}`
    );
  }

  for (const migration of PINNED_MIGRATIONS) {
    const actualHash = await digest(migration.path);
    if (actualHash !== migration.sha256) {
      fail(`${migration.path} changed: expected ${migration.sha256}, got ${actualHash}`);
    }
  }
}

async function verifyForensicLineage() {
  const [forensics, migrateSource] = await Promise.all([
    readFile(repositoryPath(FORENSICS_PATH), 'utf8'),
    readFile(repositoryPath(MIGRATE_SOURCE_PATH), 'utf8')
  ]);

  if (!forensics.includes(ORIGINAL_SNAPSHOT)) {
    fail(`${FORENSICS_PATH} no longer identifies original snapshot ${ORIGINAL_SNAPSHOT}`);
  }

  for (const migration of HISTORIC_MIGRATIONS) {
    assertDocumentedHash(forensics, migration.path, migration.sha256);
  }
  assertDocumentedHash(forensics, BASELINE_SOURCE_PATH, BASELINE_SHA256);

  const rustHash = migrateSource.match(/pub const BASELINE_SHA256: &str\s*=\s*\n?\s*"([a-f0-9]{64})";/u)?.[1];
  if (rustHash !== BASELINE_SHA256) {
    fail(`${MIGRATE_SOURCE_PATH} must independently pin the embedded baseline to ${BASELINE_SHA256}`);
  }

  if (/include_(?:bytes|str)!\([^\n)]*(?:second-dump|verify-postgres-schema-artifacts)/u.test(migrateSource)) {
    fail(`${MIGRATE_SOURCE_PATH} restored a compile-time dependency on absent forensic files`);
  }
}

async function verifyMigrationContract() {
  await verifyHistoricMigrationSet();
  await verifyForensicLineage();
  console.log(
    `[backend:check] PASS migration integrity: ${PINNED_MIGRATIONS.length} pinned migrations (${HISTORIC_MIGRATIONS.length} imported + ${REVIEWED_FORWARD_MIGRATIONS.length} reviewed forward), baseline ${BASELINE_SHA256}`
  );
}

function runCargo(label, args) {
  console.log(`[backend:check] ${label}`);
  const result = spawnSync('cargo', args, {
    // Run under services/ so rustup honors services/rust-toolchain.toml.
    cwd: SERVICES_DIRECTORY,
    stdio: 'inherit',
    env: process.env
  });

  if (result.error) {
    fail(`${label} could not start: ${result.error.message}`);
  }
  if (result.signal) {
    fail(`${label} was terminated by ${result.signal}`);
  }
  if (result.status !== 0) {
    fail(`${label} exited with status ${result.status}`);
  }
}

function runNonDatabaseCargoGate() {
  runCargo('Rust format check', ['fmt', '--manifest-path', SERVICES_MANIFEST, '--all', '--', '--check']);
  runCargo('locked workspace binary check', [
    'check',
    '--locked',
    '--manifest-path',
    SERVICES_MANIFEST,
    '--workspace',
    '--bins'
  ]);
  runCargo('locked media library unit tests', [
    'test',
    '--locked',
    '--manifest-path',
    SERVICES_MANIFEST,
    '--package',
    'tradingroom-media',
    '--lib'
  ]);
  runCargo('locked API test-target compile with testing feature', [
    'test',
    '--locked',
    '--manifest-path',
    SERVICES_MANIFEST,
    '--package',
    'tradingroom-api',
    '--features',
    'testing',
    '--no-run'
  ]);

  console.log('[backend:check] PASS deterministic non-database Rust gate');
  console.log(
    '[backend:check] NOT RUN: PostgreSQL-backed API tests; provision the documented owner/runtime roles, migrations, and fixture before running the API suite without --no-run'
  );
}

const argumentsList = process.argv.slice(2);
if (argumentsList.some((argument) => argument !== '--migrations-only') || argumentsList.length > 1) {
  fail('usage: node scripts/verify-backend.mjs [--migrations-only]');
}

await verifyMigrationContract();
if (argumentsList[0] !== '--migrations-only') {
  runNonDatabaseCargoGate();
}
