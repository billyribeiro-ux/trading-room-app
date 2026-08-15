import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceDir = resolve(repoRoot, 'second-dump/db');

/*
  ## Why this verifier is allowed to decline to run, and why that is not a loophole

  `apps/room/second-dump` is a symlink to the capture set at ~/Desktop/new-room/second-dump, and it
  is gitignored on purpose. Those files are a dump of a LIVE room — real members, real messages,
  real addresses — and this repository is public. They are evidence, they are not source, and they
  are never going to be committed here. `.gitignore` says so twice, at `second-dump/` and at
  `/apps/room/second-dump`.

  The consequence was that `pnpm test` could only run on the one laptop holding the captures.
  `package.json` chains three commands — the privacy gate, then this schema gate, then vitest — so
  on every CI checkout this file threw a bare

      ENOENT: no such file or directory, open '.../second-dump/db/RECREATE.sql'

  at step two and killed the run before a single test executed. `quality.yml` failed all eight runs
  after PR #28 partly on exactly this. A gate that cannot execute anywhere but one machine is not
  protecting anything; it is only preventing everything else from being protected, which is the
  same failure the privacy gate's own header records when it was left in an untracked directory.

  So an absent capture set is a SKIP. It is emphatically not a pass and it must never print like
  one: the message goes to stderr — the PASS summary at the bottom of this file is the only thing
  that is allowed on stdout — it says NOTHING WAS VERIFIED in those words, and it names the exact
  directory it wanted and the exact commands that would make the run real. Somebody scanning a log
  must not be able to mistake this branch for evidence that the schema contract still holds,
  because it is evidence of nothing whatsoever.

  ## Absent is a skip. Present-but-wrong is a failure. That distinction IS the gate.

  The condition is `existsSync` on the evidence DIRECTORY and nothing else. It is the one predicate
  that is false on every checkout that structurally cannot have the captures and true on every
  machine that does, so it cannot quietly become true on a machine that was supposed to be
  verifying something.

  Everything past this guard stays exactly as strict as it was before the guard existed. If the
  directory is there but an artifact inside it is gone, `readFileSync` throws and the process exits
  non-zero. If an artifact is there but one byte moved, the line-count, byte-length and SHA-256
  assertions in `readArtifact` fail and the process exits 1. Neither of those is absence. They are
  a capture set that has been damaged, truncated or edited, which is the precise thing this file
  was written to catch, and turning them into a green skip would leave a verifier that can no
  longer fail — worse than no verifier, because it reports.

  That is the "simplification" this comment exists to stop: do not widen the check into a
  try/catch around the reads, do not turn it into a per-file existence test, and do not add a flag
  that forces this branch. There is no `--skip` here on purpose, because a skip a human can type
  is a skip that ends up pasted into a CI workflow and never removed.

  A dangling symlink — the capture folder moved, or an external volume is not mounted — resolves as
  absent here, and that is correct rather than a hole: the artifacts are unreachable, so no claim
  can be made from them either way.
*/
if (!existsSync(evidenceDir)) {
  console.error(
    [
      'PostgreSQL schema evidence contract: SKIPPED — NOTHING WAS VERIFIED',
      `- Missing evidence directory: ${evidenceDir}`,
      '- This is by design: apps/room/second-dump is a gitignored symlink to captures of a LIVE',
      '  room holding real personal data, and this repository is public, so no checkout of it',
      '  ever carries them.',
      '- This run checked NOTHING. Artifact SHA-256s, the table/column/constraint inventory,',
      '  FORCE and ENABLE ROW LEVEL SECURITY coverage, the 20 policies, the ptr_clone_app grants',
      '  and the SECURITY DEFINER ordering are all UNVERIFIED here. Do not read this exit code as',
      '  the schema contract holding.',
      '- To verify for real, run it where the captures live (~/Desktop/new-room/second-dump):',
      '    ln -s ~/Desktop/new-room/second-dump apps/room/second-dump',
      '    cd apps/room && node gate/verify-postgres-schema-artifacts.mjs',
      '- A capture set that is PRESENT but incomplete or altered is not skipped — it fails.'
    ].join('\n')
  );
  process.exit(0);
}

const artifactContract = {
  'RECREATE.sql': {
    lines: 1960,
    bytes: 95519,
    sha256: 'c8baed853578437e18de0fae3406bfa1ee2791b2e625db8d13e2b72a51ac27d9'
  },
  'SCHEMA-REFERENCE.md': {
    lines: 290,
    bytes: 9618,
    sha256: '60c05492ef379a283fff95050599dcdc993c17052af974e62b2d97890b587d3a'
  },
  'SCHEMA-FULL.sql': {
    lines: 2814,
    bytes: 93433,
    sha256: '8ecdae3cb0ee301cc3617472caf2e499912c354726b04af35d32da27ae879d74'
  }
};

const publicTables = [
  'alert_media',
  'alert_questions',
  'alerts',
  'audit_log',
  'enterprises',
  'files',
  'follows',
  'invite_tokens',
  'member_notes',
  'message_reactions',
  'messages',
  'mutes',
  'note_versions',
  'notes',
  'poll_responses',
  'polls',
  'private_messages',
  'refresh_tokens',
  'room_channels',
  'room_members',
  'room_state',
  'rooms',
  'users'
];

const tenantPolicyTables = [
  'alert_media',
  'alert_questions',
  'alerts',
  'audit_log',
  'files',
  'follows',
  'invite_tokens',
  'member_notes',
  'message_reactions',
  'messages',
  'mutes',
  'note_versions',
  'notes',
  'poll_responses',
  'polls',
  'room_channels',
  'room_members',
  'room_state',
  'rooms'
];

const forceRlsTables = [...tenantPolicyTables, 'private_messages'].sort();
const globalIdentityTables = ['enterprises', 'refresh_tokens', 'users'];
const securityDefinerFunctions = [
  'auth_locate_invite_tenant',
  'auth_locate_room_tenant',
  'auth_resolve_membership',
  'delete_expired_alert_media',
  'expire_unattached_alert_media'
];
const allFunctions = [...securityDefinerFunctions, 'set_updated_at'].sort();

const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function lineCount(text) {
  return text.match(/\n/g)?.length ?? 0;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function matches(text, pattern, captureIndex = 0) {
  return [...text.matchAll(pattern)].map((match) => match[captureIndex]);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertExactSet(actual, expected, label) {
  const normalizedActual = sortedUnique(actual);
  const normalizedExpected = sortedUnique(expected);
  const missing = normalizedExpected.filter((value) => !normalizedActual.includes(value));
  const unexpected = normalizedActual.filter((value) => !normalizedExpected.includes(value));

  if (actual.length !== normalizedActual.length) {
    fail(
      `${label}: duplicate entries found (${actual.length} rows, ${normalizedActual.length} unique)`
    );
  }
  if (missing.length > 0) fail(`${label}: missing ${missing.join(', ')}`);
  if (unexpected.length > 0) fail(`${label}: unexpected ${unexpected.join(', ')}`);
}

function readArtifact(name) {
  const path = resolve(evidenceDir, name);
  const buffer = readFileSync(path);
  const text = buffer.toString('utf8');
  const expected = artifactContract[name];

  assert(lineCount(text) === expected.lines, `${name}: expected ${expected.lines} lines`);
  assert(buffer.byteLength === expected.bytes, `${name}: expected ${expected.bytes} bytes`);
  assert(
    sha256(buffer) === expected.sha256,
    `${name}: SHA-256 does not match the supplied artifact`
  );

  return text;
}

function functionBlock(sql, functionName) {
  const start = sql.indexOf(`CREATE FUNCTION public.${functionName}`);
  const end = sql.indexOf(`\nALTER FUNCTION public.${functionName}`, start);

  assert(start >= 0, `${functionName}: CREATE FUNCTION not found`);
  assert(end > start, `${functionName}: ALTER FUNCTION terminator not found`);
  return start >= 0 && end > start ? sql.slice(start, end) : '';
}

function readEvidenceRows(name, expectedRows) {
  const text = readFileSync(resolve(evidenceDir, name), 'utf8');
  const rows = text.split('\n').filter(Boolean);
  assert(rows.length === expectedRows, `${name}: expected ${expectedRows} evidence rows`);
  return rows;
}

const recreate = readArtifact('RECREATE.sql');
const schemaReference = readArtifact('SCHEMA-REFERENCE.md');
const schemaFull = readArtifact('SCHEMA-FULL.sql');

const createTables = matches(recreate, /^CREATE TABLE\s+([a-z_]+\.[a-z_]+)/gm, 1);
assertExactSet(
  createTables,
  ['drizzle.__drizzle_migrations', ...publicTables.map((name) => `public.${name}`)],
  'tables'
);

const recreateFunctions = matches(recreate, /^CREATE FUNCTION public\.([a-z_]+)/gm, 1);
const schemaFullFunctions = matches(schemaFull, /^CREATE FUNCTION public\.([a-z_]+)/gm, 1);
assertExactSet(recreateFunctions, allFunctions, 'RECREATE functions');
assertExactSet(schemaFullFunctions, allFunctions, 'SCHEMA-FULL functions');

const recreateForceRls = matches(
  recreate,
  /^ALTER TABLE(?: ONLY)? public\.([a-z_]+) FORCE ROW LEVEL SECURITY;/gm,
  1
);
const recreateEnableRls = matches(
  recreate,
  /^ALTER TABLE(?: ONLY)? public\.([a-z_]+) ENABLE ROW LEVEL SECURITY;/gm,
  1
);
const fullForceRls = matches(
  schemaFull,
  /^ALTER TABLE(?: ONLY)? public\.([a-z_]+) FORCE ROW LEVEL SECURITY;/gm,
  1
);
const fullEnableRls = matches(
  schemaFull,
  /^ALTER TABLE(?: ONLY)? public\.([a-z_]+) ENABLE ROW LEVEL SECURITY;/gm,
  1
);

assertExactSet(recreateForceRls, forceRlsTables, 'RECREATE FORCE RLS tables');
assertExactSet(recreateEnableRls, forceRlsTables, 'RECREATE ENABLE RLS tables');
assertExactSet(fullForceRls, forceRlsTables, 'SCHEMA-FULL FORCE RLS tables');
assertExactSet(fullEnableRls, forceRlsTables, 'SCHEMA-FULL ENABLE RLS tables');

for (const table of globalIdentityTables) {
  assert(!forceRlsTables.includes(table), `${table}: global identity table must not be under RLS`);
}
assert(
  !recreateForceRls.includes('__drizzle_migrations') &&
    !recreateEnableRls.includes('__drizzle_migrations'),
  'drizzle.__drizzle_migrations must not be under RLS'
);

const policyLines = recreate.split('\n').filter((line) => line.startsWith('CREATE POLICY '));
const tenantPolicyLines = policyLines.filter((line) =>
  line.startsWith('CREATE POLICY tenant_isolation ')
);
const privateMessagePolicyLines = policyLines.filter((line) =>
  line.startsWith('CREATE POLICY pm_participant_only ')
);

assert(policyLines.length === 20, 'RECREATE policies: expected exactly 20');
assert(tenantPolicyLines.length === 19, 'tenant_isolation policies: expected exactly 19');
assert(privateMessagePolicyLines.length === 1, 'pm_participant_only policy: expected exactly one');
assertExactSet(
  tenantPolicyLines.map((line) => line.match(/ON public\.([a-z_]+)/)?.[1]).filter(Boolean),
  tenantPolicyTables,
  'tenant_isolation policy tables'
);

for (const line of tenantPolicyLines) {
  assert(line.includes('TO ptr_clone_app'), 'tenant_isolation policy must target ptr_clone_app');
  assert(
    line.includes("NULLIF(current_setting('app.enterprise_id'::text, true), ''::text"),
    'tenant_isolation policy must use the fail-closed app.enterprise_id GUC expression'
  );
  assert(line.includes(' WITH CHECK '), 'tenant_isolation policy must include WITH CHECK');
}

const privateMessagePolicy = privateMessagePolicyLines[0] ?? '';
assert(
  privateMessagePolicy.includes('ON public.private_messages TO ptr_clone_app'),
  'pm_participant_only must target public.private_messages and ptr_clone_app'
);
assert(
  privateMessagePolicy.includes("current_setting('app.enterprise_id'::text, true)"),
  'pm_participant_only must check app.enterprise_id'
);
assert(
  privateMessagePolicy.includes("current_setting('app.member_id'::text, true)"),
  'pm_participant_only must check app.member_id'
);
assert(
  privateMessagePolicy.includes('sender_member_id') &&
    privateMessagePolicy.includes('recipient_member_id'),
  'pm_participant_only must check both participants'
);
assert(
  !privateMessagePolicy.includes('WITH CHECK'),
  'pm_participant_only must not define WITH CHECK'
);

const policyRows = readEvidenceRows('policies.tsv', 20).map((row) => row.split('\t'));
const standardPolicyRows = policyRows.filter((row) => row[2] === 'tenant_isolation');
const privateMessagePolicyRows = policyRows.filter((row) => row[2] === 'pm_participant_only');

assert(standardPolicyRows.length === 19, 'policies.tsv: expected 19 tenant_isolation rows');
assert(privateMessagePolicyRows.length === 1, 'policies.tsv: expected one pm_participant_only row');
for (const row of policyRows) {
  assert(row[0] === 'public', `policies.tsv ${row[1]}: schema must be public`);
  assert(row[3] === 'PERMISSIVE', `policies.tsv ${row[1]}: policy must be PERMISSIVE`);
  assert(row[4] === '{ptr_clone_app}', `policies.tsv ${row[1]}: role must be ptr_clone_app`);
  assert(row[5] === 'ALL', `policies.tsv ${row[1]}: command must be ALL`);
}
for (const row of standardPolicyRows) {
  assert(Boolean(row[7]), `policies.tsv ${row[1]}: tenant policy WITH CHECK must be present`);
}
assert(
  (privateMessagePolicyRows[0]?.[7] ?? '') === '',
  'policies.tsv private_messages: WITH CHECK must be absent'
);

assert(
  recreate.includes(
    "CREATE ROLE ptr_clone LOGIN PASSWORD 'CHANGE_ME_OWNER'\n      SUPERUSER CREATEDB CREATEROLE BYPASSRLS;"
  ),
  'ptr_clone role must remain SUPERUSER and BYPASSRLS with a deployment placeholder'
);
assert(
  recreate.includes(
    "CREATE ROLE ptr_clone_app LOGIN PASSWORD 'CHANGE_ME_APP'\n      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;"
  ),
  'ptr_clone_app role must remain NOBYPASSRLS and NOINHERIT with a deployment placeholder'
);

const firstRecreateTable = recreate.indexOf('CREATE TABLE ');
const lastRecreateTrigger = recreate.lastIndexOf('CREATE TRIGGER ');
const firstFullTable = schemaFull.indexOf('CREATE TABLE ');
assert(
  recreate.indexOf('CREATE FUNCTION public.set_updated_at') < firstRecreateTable,
  'RECREATE set_updated_at must be defined before tables/triggers'
);
assert(
  schemaFull.indexOf('CREATE FUNCTION public.set_updated_at') < firstFullTable,
  'SCHEMA-FULL set_updated_at position changed from the supplied raw dump'
);

for (const functionName of securityDefinerFunctions) {
  const recreateIndex = recreate.indexOf(`CREATE FUNCTION public.${functionName}`);
  const fullIndex = schemaFull.indexOf(`CREATE FUNCTION public.${functionName}`);
  assert(
    recreateIndex > lastRecreateTrigger,
    `RECREATE ${functionName} must remain deferred until after tables and triggers`
  );
  assert(
    fullIndex >= 0 && fullIndex < firstFullTable,
    `SCHEMA-FULL ${functionName} must remain before tables as evidence of the raw-dump restore trap`
  );

  for (const [label, sql] of [
    ['RECREATE', recreate],
    ['SCHEMA-FULL', schemaFull]
  ]) {
    const block = functionBlock(sql, functionName);
    assert(
      block.includes('SECURITY DEFINER'),
      `${label} ${functionName}: SECURITY DEFINER missing`
    );
    assert(
      block.includes("SET search_path TO 'pg_catalog', 'public'"),
      `${label} ${functionName}: pinned search_path missing`
    );
  }
}

assert(
  schemaFull.includes('SET check_function_bodies = false;'),
  'SCHEMA-FULL must retain the pg_dump check_function_bodies preamble'
);
assert(
  !recreate.includes('SET check_function_bodies = false;'),
  'RECREATE must rely on correct function ordering, not disabled body checks'
);

const explicitIndexes = matches(recreate, /^CREATE (?:UNIQUE )?INDEX /gm);
const triggers = matches(recreate, /^CREATE TRIGGER /gm);
const tableGrants = matches(
  recreate,
  /^GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public\.([a-z_]+) TO ptr_clone_app;/gm,
  1
);
const functionGrants = matches(
  recreate,
  /^GRANT ALL ON FUNCTION public\.([a-z_]+)\([^;]+ TO ptr_clone_app;/gm,
  1
);
const recreateGrants = matches(recreate, /^GRANT /gm);
const fullGrants = matches(schemaFull, /^GRANT /gm);

assert(explicitIndexes.length === 31, 'RECREATE: expected 31 explicit CREATE INDEX statements');
assert(triggers.length === 22, 'RECREATE: expected 22 triggers');
assertExactSet(tableGrants, publicTables, 'ptr_clone_app public table grants');
assertExactSet(functionGrants, securityDefinerFunctions, 'ptr_clone_app function grants');
assert(
  recreateGrants.length === 30,
  'RECREATE: expected 30 GRANT statements (including duplicated schema USAGE)'
);
assert(fullGrants.length === 29, 'SCHEMA-FULL: expected 29 GRANT statements');

const columns = readEvidenceRows('columns.tsv', 317);
const checks = readEvidenceRows('checks.tsv', 27);
const foreignKeys = readEvidenceRows('foreign_keys.tsv', 78);
const indexes = readEvidenceRows('indexes.tsv', 93);
const primaryKeys = readEvidenceRows('primary_keys.tsv', 23);
const triggersEvidence = readEvidenceRows('triggers.tsv', 22);
const uniqueConstraints = readEvidenceRows('unique.tsv', 39);

assert(
  checks.length + foreignKeys.length + primaryKeys.length + uniqueConstraints.length === 167,
  'constraint evidence: expected 167 total CHECK/FK/PK/UNIQUE constraints'
);
assert(columns.length === 317, 'column evidence: expected 317 public columns');
assert(indexes.length === 93, 'index evidence: expected 93 catalog indexes');
assert(triggersEvidence.length === 22, 'trigger evidence: expected 22 rows');

assert(
  schemaReference.includes('### 1.3 Tables with NO RLS') &&
    schemaReference.includes(
      '`enterprises`, `users`, `refresh_tokens`, `__drizzle_migrations` — global identity'
    ),
  'SCHEMA-REFERENCE: global identity/RLS boundary statement missing'
);
assert(
  schemaReference.includes('## 2. SECURITY DEFINER functions') &&
    schemaReference.includes('All pin `search_path = pg_catalog, public`'),
  'SCHEMA-REFERENCE: SECURITY DEFINER contract statement missing'
);

if (failures.length > 0) {
  console.error('PostgreSQL schema evidence contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('PostgreSQL schema evidence contract: PASS');
  console.log('- Canonical artifacts: 1,960 / 290 / 2,814 lines; SHA-256 exact');
  console.log('- Inventory: 24 tables, 317 public columns, 167 constraints, 93 indexes');
  console.log('- Security: 20 FORCE+ENABLE RLS tables; 19 tenant policies + 1 PM exception');
  console.log('- Functions: 5 SECURITY DEFINER helpers pinned and safely ordered in RECREATE');
  console.log(
    '- Runtime roles/grants: ptr_clone_app remains NOBYPASSRLS with exact table/function grants'
  );
  console.log('- Restore boundary: raw SCHEMA-FULL ordering trap preserved and detected');
}
