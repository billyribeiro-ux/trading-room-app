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

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url));
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
