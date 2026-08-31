#!/usr/bin/env node

/**
 * Validate the API image vulnerability policy and its release-evidence contract.
 *
 * Grype's complete reports remain the evidence. This evaluator only decides
 * whether a finding crosses the repository's release threshold, with exact,
 * expiring exceptions rather than a scanner-wide ignore flag.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
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
const POLICY_PATH = path.join(REPOSITORY_ROOT, 'ops', 'api-release-vulnerability-policy.json');
const WORKFLOW_PATH = path.join(REPOSITORY_ROOT, '.github', 'workflows', 'backend-quality.yml');
const DOCKERFILE_PATH = path.join(REPOSITORY_ROOT, 'services', 'api', 'Dockerfile');
const BUILD_SCRIPT_PATH = path.join(REPOSITORY_ROOT, 'scripts', 'build-api-release-evidence.sh');
const EVIDENCE_DOC_PATH = path.join(REPOSITORY_ROOT, 'ops', 'api-release-artifact-evidence.md');
const SYFT_CONFIG_PATH = path.join(REPOSITORY_ROOT, 'ops', 'syft-release.yaml');
const GRYPE_CONFIG_PATH = path.join(REPOSITORY_ROOT, 'ops', 'grype-release.yaml');

const SEVERITY_RANK = Object.freeze({
  unknown: 0,
  negligible: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5
});

const EXPECTED_POLICY = Object.freeze({
  schemaVersion: 2,
  policyId: 'api-release-v2',
  failCriticalRegardlessOfFix: true,
  failHighWhenFixAvailable: true
});

function fail(message) {
  throw new Error(`[backend:release-artifact] ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function normalizeSeverity(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return Object.hasOwn(SEVERITY_RANK, normalized) ? normalized : null;
}

function requiredSeverity(value, label) {
  const severity = normalizeSeverity(value);
  if (severity === null) {
    fail(`${label} must be one of ${Object.keys(SEVERITY_RANK).join(', ')}`);
  }
  return severity;
}

function normalizeFixState(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return ['fixed', 'not-fixed', 'unknown', 'wont-fix'].includes(normalized) ? normalized : null;
}

function requiredFixState(value, label) {
  const fixState = normalizeFixState(value);
  if (fixState === null) {
    fail(`${label} must be one of fixed, not-fixed, unknown, wont-fix`);
  }
  return fixState;
}

function requiredExceptionSources(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  const sources = value.map((source, index) => {
    const normalized = requiredString(source, `${label}[${index}]`);
    if (path.basename(normalized) !== normalized || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(normalized)) {
      fail(`${label}[${index}] must be a simple report basename`);
    }
    return normalized;
  });
  if (new Set(sources).size !== sources.length) {
    fail(`${label} must not contain duplicate report basenames`);
  }
  return sources.sort();
}

function validatePolicy(value, today = new Date()) {
  if (!isRecord(value)) fail('policy must be a JSON object');
  for (const [key, expected] of Object.entries(EXPECTED_POLICY)) {
    if (value[key] !== expected) {
      fail(`policy ${key} must remain ${JSON.stringify(expected)}`);
    }
  }
  if (!Array.isArray(value.reviewedExceptions)) {
    fail('policy reviewedExceptions must be an array');
  }

  const todayText = today.toISOString().slice(0, 10);
  const seen = new Set();
  const exceptions = value.reviewedExceptions.map((exception, index) => {
    if (!isRecord(exception)) fail(`reviewedExceptions[${index}] must be an object`);
    const normalized = {
      vulnerabilityId: requiredString(exception.vulnerabilityId, `reviewedExceptions[${index}].vulnerabilityId`),
      packageName: requiredString(exception.packageName, `reviewedExceptions[${index}].packageName`),
      installedVersion: requiredString(exception.installedVersion, `reviewedExceptions[${index}].installedVersion`),
      packageType: requiredString(exception.packageType, `reviewedExceptions[${index}].packageType`),
      severity: requiredSeverity(exception.severity, `reviewedExceptions[${index}].severity`),
      fixState: requiredFixState(exception.fixState, `reviewedExceptions[${index}].fixState`),
      allowedSources: requiredExceptionSources(exception.allowedSources, `reviewedExceptions[${index}].allowedSources`),
      expiresOn: requiredString(exception.expiresOn, `reviewedExceptions[${index}].expiresOn`),
      approvedBy: requiredString(exception.approvedBy, `reviewedExceptions[${index}].approvedBy`),
      reason: requiredString(exception.reason, `reviewedExceptions[${index}].reason`)
    };
    const expiresAt = new Date(`${normalized.expiresOn}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(normalized.expiresOn) ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.toISOString().slice(0, 10) !== normalized.expiresOn
    ) {
      fail(`reviewedExceptions[${index}].expiresOn must use YYYY-MM-DD`);
    }
    if (!shouldBlock(normalized, EXPECTED_POLICY)) {
      fail(`reviewedExceptions[${index}] must identify a finding that this policy blocks`);
    }
    if (normalized.expiresOn < todayText) {
      fail(`reviewedExceptions[${index}] expired on ${normalized.expiresOn}`);
    }
    const key = exceptionKey(normalized);
    if (seen.has(key)) fail(`duplicate reviewed exception ${key}`);
    seen.add(key);
    return normalized;
  });

  return { ...EXPECTED_POLICY, reviewedExceptions: exceptions };
}

function findingKey(finding) {
  return [
    finding.vulnerabilityId,
    finding.packageName,
    finding.installedVersion,
    finding.packageType,
    finding.fixState
  ].join('|');
}

function exceptionKey(exception) {
  return [
    exception.vulnerabilityId,
    exception.packageName,
    exception.installedVersion,
    exception.packageType,
    exception.severity,
    exception.fixState,
    exception.allowedSources.join(',')
  ].join('|');
}

function findingExceptionKey(finding) {
  return exceptionKey({ ...finding, allowedSources: finding.sources });
}

function parseFindings(report, source) {
  if (!isRecord(report) || !Array.isArray(report.matches)) {
    fail(`${source} is not a Grype JSON report with a matches array`);
  }
  const configuration = report.descriptor?.configuration;
  if (!isRecord(configuration)) {
    fail(`${source}.descriptor.configuration must be an object`);
  }
  if (!Array.isArray(configuration.ignore) || configuration.ignore.length !== 0) {
    fail(`${source} contains active scanner ignore rules`);
  }
  if (configuration['match-upstream-kernel-headers'] !== true) {
    fail(`${source} must include upstream-kernel-header matches`);
  }
  if (configuration['check-for-app-update'] !== false) {
    fail(`${source} must disable application update checks during evaluation`);
  }
  for (const field of ['exclude', 'vex-documents', 'vex-add']) {
    if (!Array.isArray(configuration[field]) || configuration[field].length !== 0) {
      fail(`${source}.descriptor.configuration.${field} must be an empty array`);
    }
  }
  if (configuration['only-fixed'] !== false || configuration['only-notfixed'] !== false) {
    fail(`${source} must not filter findings by fix availability`);
  }
  if (configuration['ignore-wontfix'] !== '') {
    fail(`${source} must not filter wont-fix findings`);
  }
  if (configuration.distro !== '' || configuration.platform !== '') {
    fail(`${source} must not override the detected distro or platform`);
  }
  if (report.ignoredMatches !== undefined) {
    if (!Array.isArray(report.ignoredMatches)) {
      fail(`${source}.ignoredMatches must be absent or an array`);
    }
    if (report.ignoredMatches.length !== 0) {
      fail(`${source} contains scanner-suppressed findings; repository policy must decide every match`);
    }
  }

  return report.matches.map((match, index) => {
    if (!isRecord(match) || !isRecord(match.vulnerability) || !isRecord(match.artifact)) {
      fail(`${source}.matches[${index}] has an invalid vulnerability or artifact`);
    }
    const fix = isRecord(match.vulnerability.fix) ? match.vulnerability.fix : {};
    if (!Array.isArray(fix.versions)) {
      fail(`${source}.matches[${index}].vulnerability.fix.versions must be an array`);
    }
    const fixedVersions = fix.versions.map((version, versionIndex) =>
      requiredString(version, `${source}.matches[${index}].vulnerability.fix.versions[${versionIndex}]`)
    );
    const fixState =
      fix.state === '' ? 'unknown' : requiredFixState(fix.state, `${source}.matches[${index}].vulnerability.fix.state`);
    if ((fixState === 'fixed') !== fixedVersions.length > 0) {
      fail(`${source}.matches[${index}] has contradictory fix state and fixed versions`);
    }
    return {
      vulnerabilityId: requiredString(match.vulnerability.id, `${source}.matches[${index}].vulnerability.id`),
      severity: requiredSeverity(match.vulnerability.severity, `${source}.matches[${index}].vulnerability.severity`),
      fixState,
      fixedVersions: [...new Set(fixedVersions)].sort(),
      packageName: requiredString(match.artifact.name, `${source}.matches[${index}].artifact.name`),
      installedVersion: requiredString(match.artifact.version, `${source}.matches[${index}].artifact.version`),
      packageType: requiredString(match.artifact.type, `${source}.matches[${index}].artifact.type`),
      sources: [source]
    };
  });
}

function shouldBlock(finding, policy) {
  const rank = SEVERITY_RANK[finding.severity];
  if (policy.failCriticalRegardlessOfFix && rank >= SEVERITY_RANK.critical) return true;
  return policy.failHighWhenFixAvailable && rank >= SEVERITY_RANK.high && finding.fixState === 'fixed';
}

function evaluateReports(reports, policy, now = new Date()) {
  const findingsByKey = new Map();
  for (const { report, source } of reports) {
    for (const finding of parseFindings(report, source)) {
      const key = findingKey(finding);
      const existing = findingsByKey.get(key);
      if (existing) {
        existing.sources = [...new Set([...existing.sources, ...finding.sources])].sort();
        existing.fixedVersions = [...new Set([...existing.fixedVersions, ...finding.fixedVersions])].sort();
        if (SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
          existing.severity = finding.severity;
        }
      } else {
        findingsByKey.set(key, finding);
      }
    }
  }

  const findings = [...findingsByKey.values()].sort((left, right) => findingKey(left).localeCompare(findingKey(right)));
  const exceptionByKey = new Map(policy.reviewedExceptions.map((exception) => [exceptionKey(exception), exception]));
  const usedExceptions = new Set();
  const blocked = [];
  const excepted = [];
  const observed = [];

  for (const finding of findings) {
    if (!shouldBlock(finding, policy)) {
      observed.push(finding);
      continue;
    }
    const key = findingExceptionKey(finding);
    const exception = exceptionByKey.get(key);
    if (exception) {
      usedExceptions.add(key);
      excepted.push({ ...finding, exception });
    } else {
      blocked.push(finding);
    }
  }

  const unusedExceptions = policy.reviewedExceptions.filter(
    (exception) => !usedExceptions.has(exceptionKey(exception))
  );
  const policyViolations = unusedExceptions.map((exception) => ({
    code: 'UNUSED_REVIEWED_EXCEPTION',
    message: `reviewed exception no longer matches a blocking finding: ${exceptionKey(exception)}`,
    exception
  }));

  const countsBySeverity = Object.fromEntries(
    Object.keys(SEVERITY_RANK).map((severity) => [
      severity,
      findings.filter((finding) => finding.severity === severity).length
    ])
  );

  return {
    schemaVersion: 1,
    policyId: policy.policyId,
    evaluatedAt: now.toISOString(),
    passed: blocked.length === 0 && policyViolations.length === 0,
    summary: {
      uniqueFindings: findings.length,
      blocked: blocked.length,
      excepted: excepted.length,
      observed: observed.length,
      policyViolations: policyViolations.length,
      countsBySeverity
    },
    policyViolations,
    blocked,
    excepted,
    observed
  };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readJson(filePath, label) {
  const bytes = await readFile(filePath);
  try {
    return { bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function expect(condition, message) {
  if (!condition) fail(`self-test failed: ${message}`);
}

function expectThrows(callback, message) {
  let rejected = false;
  try {
    callback();
  } catch {
    rejected = true;
  }
  expect(rejected, message);
}

function testReport(findings) {
  return {
    descriptor: {
      configuration: {
        ignore: [],
        exclude: [],
        'vex-documents': [],
        'vex-add': [],
        'only-fixed': false,
        'only-notfixed': false,
        'ignore-wontfix': '',
        distro: '',
        platform: '',
        'check-for-app-update': false,
        'match-upstream-kernel-headers': true
      }
    },
    matches: findings.map(({ id, severity, fixState, name = 'demo', version = '1.0.0', type = 'rust' }) => ({
      vulnerability: { id, severity, fix: { state: fixState, versions: fixState === 'fixed' ? ['2.0.0'] : [] } },
      artifact: { name, version, type }
    }))
  };
}

function runSelfTest() {
  const now = new Date('2026-08-02T12:00:00.000Z');
  const basePolicy = validatePolicy({ ...EXPECTED_POLICY, reviewedExceptions: [] }, now);
  const result = evaluateReports(
    [
      {
        source: 'fixture',
        report: testReport([
          { id: 'CVE-CRITICAL', severity: 'Critical', fixState: 'not-fixed' },
          { id: 'CVE-HIGH-FIXED', severity: 'High', fixState: 'fixed' },
          { id: 'CVE-HIGH-OPEN', severity: 'High', fixState: 'not-fixed' },
          { id: 'CVE-MEDIUM', severity: 'Medium', fixState: 'fixed' }
        ])
      }
    ],
    basePolicy,
    now
  );
  expect(result.blocked.length === 2, 'critical and fixed high findings must block');
  expect(result.observed.length === 2, 'unfixed high and fixed medium findings must remain visible');

  const ignoredFinding = testReport([]);
  ignoredFinding.ignoredMatches = testReport([
    { id: 'CVE-IGNORED', severity: 'Critical', fixState: 'not-fixed' }
  ]).matches;
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: ignoredFinding }], basePolicy, now),
    'scanner-suppressed findings must fail closed'
  );
  const malformedIgnoredFindings = testReport([]);
  malformedIgnoredFindings.ignoredMatches = {};
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: malformedIgnoredFindings }], basePolicy, now),
    'ignoredMatches schema drift must fail closed'
  );
  const configuredIgnore = testReport([]);
  configuredIgnore.descriptor.configuration.ignore = [{ vulnerability: 'CVE-IGNORED' }];
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: configuredIgnore }], basePolicy, now),
    'active scanner ignore rules must fail closed'
  );

  const emptyFixState = evaluateReports(
    [{ source: 'fixture', report: testReport([{ id: 'CVE-EMPTY-FIX', severity: 'Low', fixState: '' }]) }],
    basePolicy,
    now
  );
  expect(emptyFixState.observed[0].fixState === 'unknown', 'Grype empty fix states must normalize to unknown');
  const contradictoryEmptyFixState = testReport([{ id: 'CVE-EMPTY-FIX', severity: 'High', fixState: '' }]);
  contradictoryEmptyFixState.matches[0].vulnerability.fix.versions = ['2.0.0'];
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: contradictoryEmptyFixState }], basePolicy, now),
    'empty fix states with fixed versions must fail closed'
  );

  const exception = {
    vulnerabilityId: 'CVE-HIGH-FIXED',
    packageName: 'demo',
    installedVersion: '1.0.0',
    packageType: 'rust',
    severity: 'high',
    fixState: 'fixed',
    allowedSources: ['fixture'],
    expiresOn: '2026-08-03',
    approvedBy: 'fixture-owner',
    reason: 'self-test only'
  };
  const exceptionPolicy = validatePolicy({ ...EXPECTED_POLICY, reviewedExceptions: [exception] }, now);
  const excepted = evaluateReports(
    [{ source: 'fixture', report: testReport([{ id: 'CVE-HIGH-FIXED', severity: 'High', fixState: 'fixed' }]) }],
    exceptionPolicy,
    now
  );
  expect(excepted.passed && excepted.excepted.length === 1, 'an exact unexpired exception must be honored');

  expectThrows(
    () => validatePolicy({ ...EXPECTED_POLICY, reviewedExceptions: [{ ...exception, expiresOn: '2026-08-01' }] }, now),
    'expired exceptions must fail closed'
  );
  expectThrows(
    () => validatePolicy({ ...EXPECTED_POLICY, reviewedExceptions: [{ ...exception, fixState: 'available' }] }, now),
    'unrecognized exception fix states must fail closed'
  );

  expectThrows(
    () =>
      evaluateReports(
        [{ source: 'fixture', report: testReport([{ id: 'CVE-SCHEMA', severity: 'Important', fixState: 'fixed' }]) }],
        basePolicy,
        now
      ),
    'unrecognized scanner severities must fail closed'
  );
  expectThrows(
    () =>
      evaluateReports(
        [{ source: 'fixture', report: testReport([{ id: 'CVE-SCHEMA', severity: 'High', fixState: 'available' }]) }],
        basePolicy,
        now
      ),
    'unrecognized scanner fix states must fail closed'
  );

  const missingSeverity = testReport([{ id: 'CVE-SCHEMA', severity: 'High', fixState: 'fixed' }]);
  delete missingSeverity.matches[0].vulnerability.severity;
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: missingSeverity }], basePolicy, now),
    'missing scanner severity fields must fail closed'
  );

  const renamedFixState = testReport([{ id: 'CVE-SCHEMA', severity: 'High', fixState: 'fixed' }]);
  renamedFixState.matches[0].vulnerability.fix = { status: 'fixed', versions: ['2.0.0'] };
  expectThrows(
    () => evaluateReports([{ source: 'fixture', report: renamedFixState }], basePolicy, now),
    'scanner fix-state schema drift must fail closed'
  );

  const severityMismatch = evaluateReports(
    [{ source: 'fixture', report: testReport([{ id: 'CVE-HIGH-FIXED', severity: 'Critical', fixState: 'fixed' }]) }],
    exceptionPolicy,
    now
  );
  expect(
    !severityMismatch.passed && severityMismatch.blocked.length === 1 && severityMismatch.excepted.length === 0,
    'an exception must not survive a finding severity change'
  );
  expect(severityMismatch.policyViolations.length === 1, 'a severity-mismatched exception must also be stale');

  const sourceMismatch = evaluateReports(
    [
      {
        source: 'other-report.json',
        report: testReport([{ id: 'CVE-HIGH-FIXED', severity: 'High', fixState: 'fixed' }])
      }
    ],
    exceptionPolicy,
    now
  );
  expect(
    !sourceMismatch.passed && sourceMismatch.blocked.length === 1 && sourceMismatch.excepted.length === 0,
    'an exception must not apply to a different report source'
  );
  expect(sourceMismatch.policyViolations.length === 1, 'a source-mismatched exception must also be stale');

  const staleException = evaluateReports([], exceptionPolicy, now);
  expect(!staleException.passed, 'an unused reviewed exception must fail closed');
  expect(staleException.policyViolations.length === 1, 'unused exceptions must remain in decision evidence');

  const deduplicated = evaluateReports(
    [
      { source: 'oci', report: testReport([{ id: 'CVE-DUPLICATE', severity: 'Low', fixState: 'unknown' }]) },
      { source: 'native', report: testReport([{ id: 'CVE-DUPLICATE', severity: 'Low', fixState: 'unknown' }]) }
    ],
    basePolicy,
    now
  );
  expect(deduplicated.summary.uniqueFindings === 1, 'OCI/native duplicate findings must collapse');
  expect(deduplicated.observed[0].sources.length === 2, 'deduplicated evidence must retain both sources');

  const severityMerged = evaluateReports(
    [
      { source: 'oci', report: testReport([{ id: 'CVE-SEVERITY-MERGE', severity: 'Low', fixState: 'fixed' }]) },
      { source: 'native', report: testReport([{ id: 'CVE-SEVERITY-MERGE', severity: 'High', fixState: 'fixed' }]) }
    ],
    basePolicy,
    now
  );
  expect(severityMerged.blocked.length === 1, 'duplicate sources must retain the highest reported severity');
}

async function verifyContract() {
  const [policyFile, workflow, dockerfile, buildScript, evidenceDoc, syftConfig, grypeConfig] = await Promise.all([
    readJson(POLICY_PATH, 'release policy'),
    readFile(WORKFLOW_PATH, 'utf8'),
    readFile(DOCKERFILE_PATH, 'utf8'),
    readFile(BUILD_SCRIPT_PATH, 'utf8'),
    readFile(EVIDENCE_DOC_PATH, 'utf8'),
    readFile(SYFT_CONFIG_PATH, 'utf8'),
    readFile(GRYPE_CONFIG_PATH, 'utf8')
  ]);
  validatePolicy(policyFile.value);
  if (syftConfig !== '{}\n') fail('Syft release config must remain an explicit empty YAML document');
  if (grypeConfig !== 'ignore: []\nmatch-upstream-kernel-headers: true\n') {
    fail('Grype release config must disable user ignores and include upstream kernel-header matches');
  }

  const requiredDockerfileFragments = [
    'FROM rust:1.98.0-alpine3.24@sha256:a10e64dd139b7387337c7fbe8aca31b959b57b2fd4c8ae20a02cf1d6ea424dce AS builder',
    'ENV RUSTUP_TOOLCHAIN=1.98.0',
    'ARG TARGETARCH',
    "cargo install --locked cargo-auditable --version '=0.7.5'",
    "base_rustflags='-C target-feature=+crt-static -C relocation-model=pic -C link-self-contained=no -L native=/rust-native'",
    '-C link-arg=-Wl,-Map=/out/release.link.map',
    'cargo auditable build --locked --release --target "${rust_target}" -p tradingroom-api',
    '-p tradingroom-api --bin tradingroom-api',
    '-p tradingroom-api --bin migrate',
    'FROM scratch AS release-link-evidence',
    'COPY --from=builder /release-link-evidence/ /',
    'native-link-input-sha256.txt',
    'native-link-input-ownership.txt',
    'builder-native-binary-sha256.txt',
    'api-native-link-inputs.txt',
    'migrator-native-link-inputs.txt',
    '/rust-native/libunwind.a',
    "! grep -F '/self-contained/' /out/release.link.map",
    'grep -F -x "${exact_input}" "$1" > /dev/null || return 1',
    'test "$(find /rust-native -mindepth 1 -maxdepth 1 | wc -l)" -eq 1',
    'COPY --from=builder /out/tradingroom-api /usr/local/bin/tradingroom-api',
    'COPY --from=builder /out/migrate /usr/local/bin/migrate',
    'FROM gcr.io/distroless/static-debian13:nonroot@sha256:1c2c046bc09ed40fad370b599a0b1ae7987f55b01e247cf27a7c27cd97e5bbc7 AS runtime',
    'USER 65532:65532'
  ];
  for (const fragment of requiredDockerfileFragments) {
    if (!dockerfile.includes(fragment)) fail(`Dockerfile contract missing ${JSON.stringify(fragment)}`);
  }
  const releaseMapFlag = '-C link-arg=-Wl,-Map=/out/release.link.map';
  if (dockerfile.split(releaseMapFlag).length - 1 !== 3) {
    fail('Dockerfile must keep one stable linker-map flag across dependency, API, and migrator builds');
  }
  const selfContainedDeny = "! grep -F '/self-contained/' /out/release.link.map";
  if (dockerfile.split(selfContainedDeny).length - 1 !== 2) {
    fail('Dockerfile must reject self-contained native inputs in both final linker maps');
  }
  for (const forbiddenFragment of [
    'FROM debian:',
    'RUN useradd',
    'COPY --from=builder /etc/ssl/certs/ca-certificates.crt',
    '-C link-arg=-static-pie',
    "arm64) rust_target='aarch64-unknown-linux-musl'"
  ]) {
    if (dockerfile.includes(forbiddenFragment)) {
      fail(`Dockerfile contract contains forbidden runtime residue ${JSON.stringify(forbiddenFragment)}`);
    }
  }

  const requiredWorkflowFragments = [
    'cargo run --locked --manifest-path services/Cargo.toml',
    '-p tradingroom-api --bin postgres-release-attestation -- --format json',
    '.attestation_version == 1 and .status == "pass"',
    'postgres-cross-cluster-control:',
    '5433:5432',
    'test ! -s "${negative_stdout}"',
    "'[target_cluster_mismatch]'",
    'uses: docker/setup-buildx-action@37fe631027851001ddb9b187196cc803df7f5f0e',
    'name: api-release-builder',
    'version: v0.36.1',
    'driver: docker-container',
    'image=moby/buildkit:v0.32.2@sha256:28a898719c18a33f4e8000685287fa36fd0dd9560c6440227d3a732d79bb41d8',
    /*
      Invoked by PATH, not through `pnpm backend:release:verify`.

      That package script lives in `apps/controller` and the repository root defines no such
      script, so the workflow step running it at the root failed outright the first time this gate
      actually executed. This contract pinned the broken spelling, which is why it has to move with
      the fix rather than be relaxed: the point of the pin is that the workflow really runs this
      verifier, not that it runs it under one particular name.
    */
    'run: node apps/controller/scripts/verify-api-release-artifact.mjs --verify-contract',
    'run: bash scripts/build-api-release-evidence.sh',
    'uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
    'retention-days: 30'
  ];
  for (const fragment of requiredWorkflowFragments) {
    if (!workflow.includes(fragment)) fail(`backend workflow contract missing ${JSON.stringify(fragment)}`);
  }
  const attestorInvocation = '-p tradingroom-api --bin postgres-release-attestation -- --format json';
  if (workflow.split(attestorInvocation).length - 1 !== 2) {
    fail('backend workflow must invoke the direct Cargo attestor exactly twice');
  }
  if (workflow.includes('pnpm backend:postgres:attest')) {
    fail('backend workflow must not put pnpm lifecycle output into attestation stdout');
  }
  if (
    /\bdocker\s+(?:image\s+)?push\b/.test(workflow) ||
    /\bdocker\s+(?:image\s+)?push\b/.test(buildScript) ||
    /\bdocker\s+login\b/.test(workflow) ||
    /\bdocker\s+login\b/.test(buildScript)
  ) {
    fail('registry-credential-free release evidence must never authenticate to a registry or push an image');
  }

  const requiredBuildFragments = [
    'SYFT_VERSION="1.51.1"',
    'SYFT_CHECKSUM_MANIFEST_SHA256="105346699e7cb694afa37a21e2386432df6278c99f71331c24b1e0bb0f38cc75"',
    'SYFT_ARCHIVE_SHA256="8fcb33017a0dc1058298c923c436d19dfa68ae93968e0b423248542e3afb9fc3"',
    'GRYPE_VERSION="0.118.0"',
    'GRYPE_CHECKSUM_MANIFEST_SHA256="7a0cfafb6082951a68f89199c3a45f84b0ed8670491e509529ab5f8ee4977a2b"',
    'GRYPE_ARCHIVE_SHA256="1d444c5e7360471815f7158f71935fcecc68a3c417d85c7344f770854300bba2"',
    'BUILDX_VERSION="0.36.1"',
    'BUILDKIT_VERSION="v0.32.2"',
    'BUILDX_BUILDER="api-release-builder"',
    'BUILDER_IMAGE="rust:1.98.0-alpine3.24@sha256:a10e64dd139b7387337c7fbe8aca31b959b57b2fd4c8ae20a02cf1d6ea424dce"',
    'RUNTIME_BASE_IMAGE="gcr.io/distroless/static-debian13:nonroot@sha256:1c2c046bc09ed40fad370b599a0b1ae7987f55b01e247cf27a7c27cd97e5bbc7"',
    'RCRT1_SHA256="5e93abc3f181bdb1b177e8725dbad7c08ddf2dc5d94d47d593a34a7a4cba1df5"',
    'CRTI_SHA256="a0af2446e5bce05119163883c5d522c3c44e3a9d1aa5014f468c1feb8dc2cb54"',
    'CRTBEGIN_SHA256="21cc007ae9682cad220f2bd0c0475e483f6ef12204f65e99c464f6caf7eb0766"',
    'LIBUNWIND_SHA256="eb16569e611a5d6cdda2e7604fd6402a3ad810817dd8d63ed50baa2ce8070aaa"',
    'LIBC_SHA256="ff0d5e7ac47afd296bb8bad4a67d4b0efbc763298a9fe6a4b1ee3e9d0fc6ec68"',
    'CRTEND_SHA256="55b3c5c22ed779fb9a3ffb3cf9e878eceb9c97cfc6e7f58c0273bacae7ccd54e"',
    'CRTN_SHA256="596ea32e1d1782df9f25f8326013832ca5fe391e26f84382c6731c2a37263260"',
    'verify_manifest_archive_entry',
    'verify_manifest_archive_entry \\\n\t"${syft_manifest}"',
    'verify_manifest_archive_entry \\\n\t"${grype_manifest}"',
    '"syft_${SYFT_VERSION}_checksums.txt" \\',
    '"grype_${GRYPE_VERSION}_checksums.txt" \\',
    'GRYPE_DB_MAX_ALLOWED_BUILT_AGE=120h',
    'scanner-sha256.txt',
    'scanner-config-sha256.txt',
    'scanner-config/syft-release.yaml',
    'scanner-config/grype-release.yaml',
    'run_syft() {',
    'run_grype_update() {',
    'run_grype() {',
    'env -i',
    'GRYPE_DB_AUTO_UPDATE=true',
    'GRYPE_DB_AUTO_UPDATE=false',
    '"${tool_root}/syft/syft" --config "${syft_config}" "$@"',
    '"${tool_root}/grype/grype" --config "${grype_config}" "$@"',
    'postgres-release-attestation.json',
    'postgresAttestationSha256',
    'unexpected_evidence_entry',
    'refusing to mix stale and current evidence',
    'cd "${native_root}"',
    'run_syft scan "file:${native_root}/tradingroom-api"',
    'run_syft scan "file:${native_root}/migrate"',
    'run_grype_update db update',
    'run_grype db status --output json',
    '.["buildx.build.ref"] | type == "string" and startswith($prefix)',
    'docker buildx inspect --bootstrap "${BUILDX_BUILDER}"',
    '$1 == "Driver:" && $2 == "docker-container"',
    '$1 == "Status:" && $2 == "running"',
    '$1 == "BuildKit" && $2 == "version:" && $3 == expected_buildkit',
    'linux\\/amd64',
    'docker buildx build --builder "${BUILDX_BUILDER}" --pull --platform linux/amd64',
    '--metadata-file "${evidence_root}/native-link-build-metadata.json"',
    '--metadata-file "${evidence_root}/runtime-build-metadata.json"',
    '--load',
    'containerimage.config.digest',
    'api-binary.syft.json',
    'migrator-binary.syft.json',
    'api-binary-vulnerabilities.grype.json',
    'migrator-binary-vulnerabilities.grype.json',
    'builder-image.syft.json',
    'builder-image-vulnerabilities.grype.json',
    'builder-vulnerability-observation.json',
    'releasePolicyInput: true',
    'builder-toolchain.txt',
    'builder-packages.json',
    "'host: x86_64-unknown-linux-musl'",
    '"name": "binutils", "version": "2.45.1-r1"',
    '"name": "ca-certificates", "version": "20260611-r0"',
    '"name": "gcc", "version": "15.2.0-r5"',
    '"name": "libgcc-static", "version": "15.2.0-r5"',
    '"name": "musl", "version": "1.2.6-r2"',
    'configured_user}" == "65532:65532',
    'probe_runtime_binary',
    'controlled probe must reach application code and exit 1',
    'runtime-operational-smoke.json',
    'MIGRATE_DATABASE_URL is required for the exact-image migrator smoke',
    '"http://127.0.0.1:${smoke_port}/readyz"',
    "--noproxy '*'",
    'exact-image migrator/API operational smoke failed',
    'runtime-rootfs-files.txt',
    'runtime filesystem contains a forbidden shell, package manager, loader, glibc, libgcc, or Perl path',
    'runtime OCI SBOM differs from the exact reviewed static-distroless package inventory',
    '{ "name": "base-files", "version": "13.8+deb13u6" }',
    // Added 2026-08-30 with the runtime digest. Asserted here so the inventory cannot quietly lose
    // an entry the base image actually ships; both digests were unpacked from the registry and
    // their dpkg status entries compared, and this line is the whole diff between them.
    '{ "name": "ca-certificates", "version": "20250419" }',
    '{ "name": "tzdata-legacy", "version": "2026b-0+deb13u1" }',
    "docker image inspect --format '{{.Os}}/{{.Architecture}}'",
    'assert_static_elf',
    'ET_DYN position-independent executable',
    "grep --fixed-strings 'INTERP'",
    "grep --fixed-strings '(NEEDED)'",
    "grep --fixed-strings 'TEXTREL'",
    'GNU_STACK',
    'GNU_RELRO',
    'writable and executable PT_LOAD segment',
    "grep --fixed-strings 'BIND_NOW'",
    'native-inventory-coverage.json',
    'native-link-input-sha256.txt',
    'native-link-input-ownership.txt',
    'builder-native-binary-sha256.txt',
    'completeNativeCompositionClaimed: false',
    '--network none',
    '--read-only',
    'org.opencontainers.image.revision="${source_revision}"',
    '.foundBy == "cargo-auditable-binary-cataloger"',
    '.descriptor.db.status == $expected_db[0]',
    '"${evidence_root}/builder-image-vulnerabilities.grype.json" \\'
  ];
  for (const fragment of requiredBuildFragments) {
    if (!buildScript.includes(fragment)) fail(`build script contract missing ${JSON.stringify(fragment)}`);
  }
  if (buildScript.includes('--config /dev/null')) {
    fail('scanner config must be an explicit, versioned YAML file');
  }
  for (const line of buildScript.split('\n').map((value) => value.trim())) {
    if (/^(syft|grype)\s/.test(line)) {
      fail(`scanner must run through a clean-environment wrapper: ${JSON.stringify(line)}`);
    }
  }
  for (const [functionName, requiredFragments] of [
    [
      'run_syft',
      ['env -i', 'SYFT_CHECK_FOR_APP_UPDATE=false', '"${tool_root}/syft/syft" --config "${syft_config}" "$@"']
    ],
    [
      'run_grype_update',
      [
        'env -i',
        'GRYPE_DB_AUTO_UPDATE=true',
        'GRYPE_DB_REQUIRE_UPDATE_CHECK=true',
        '"${tool_root}/grype/grype" --config "${grype_config}" "$@"'
      ]
    ],
    [
      'run_grype',
      [
        'env -i',
        'GRYPE_DB_AUTO_UPDATE=false',
        'GRYPE_DB_REQUIRE_UPDATE_CHECK=false',
        '"${tool_root}/grype/grype" --config "${grype_config}" "$@"'
      ]
    ]
  ]) {
    const match = buildScript.match(new RegExp(`${functionName}\\(\\) \\{([\\s\\S]*?)\\n\\}`));
    if (!match) fail(`build script is missing ${functionName}`);
    for (const fragment of requiredFragments) {
      if (!match[1].includes(fragment)) fail(`${functionName} is missing ${JSON.stringify(fragment)}`);
    }
  }
  if (/\bdocker build\s/.test(buildScript)) {
    fail('release artifacts must use the explicitly selected Buildx builder');
  }
  /*
    The invocation moved behind a `verifier` variable on 2026-08-15, so this anchor moved with it.

    The old anchor pinned a path — `${repository_root}/scripts/…` — that has never existed in this
    repository. The script came from the sibling, where `scripts/` sits at the root, and moving it
    under `apps/controller/` invalidated the path without changing the name. Nothing caught it
    because the build script's evaluator line was never reached: the backend gate died at an earlier
    step every time, and this contract check was asserting the presence of a string that named a
    file Node could not load.

    Anchoring on the variable alone would pin less than before, so the assignment is asserted
    separately below. Together they pin the same two facts the original did — WHICH script is
    invoked, and that all four reports are passed to it in one bounded invocation.
  */
  if (!buildScript.includes('verifier="${repository_root}/apps/controller/scripts/verify-api-release-artifact.mjs"')) {
    fail('build script must resolve the release-policy evaluator from apps/controller/scripts');
  }
  const evaluatorStart = buildScript.indexOf('node "${verifier}" --evaluate');
  const evaluatorEnd = buildScript.indexOf('policy_status=$?', evaluatorStart);
  if (evaluatorStart === -1 || evaluatorEnd === -1) {
    fail('build script does not contain the bounded release-policy evaluator invocation');
  }
  const evaluatorInvocation = buildScript.slice(evaluatorStart, evaluatorEnd);
  for (const report of [
    'builder-image-vulnerabilities.grype.json',
    'api-image-vulnerabilities.grype.json',
    'api-binary-vulnerabilities.grype.json',
    'migrator-binary-vulnerabilities.grype.json'
  ]) {
    if (!evaluatorInvocation.includes(report)) fail(`release-policy evaluator omits ${report}`);
  }
  if (buildScript.includes('syft scan "dir:${native_root}"')) {
    fail('each native binary must be cataloged and asserted independently');
  }
  for (const forbiddenRuntimeProbe of [
    '--entrypoint /usr/bin/id "${image_reference}"',
    '--entrypoint /bin/sh "${image_reference}"'
  ]) {
    if (buildScript.includes(forbiddenRuntimeProbe)) {
      fail(`distroless runtime probe must not require ${JSON.stringify(forbiddenRuntimeProbe)}`);
    }
  }

  for (const checksum of [
    '105346699e7cb694afa37a21e2386432df6278c99f71331c24b1e0bb0f38cc75',
    '8fcb33017a0dc1058298c923c436d19dfa68ae93968e0b423248542e3afb9fc3',
    '7a0cfafb6082951a68f89199c3a45f84b0ed8670491e509529ab5f8ee4977a2b',
    '1d444c5e7360471815f7158f71935fcecc68a3c417d85c7344f770854300bba2',
    'cd121127b91d68074770a620544182345d7db56d03dcbd85316ab11e54a5b1bc',
    'a10e64dd139b7387337c7fbe8aca31b959b57b2fd4c8ae20a02cf1d6ea424dce',
    '1c2c046bc09ed40fad370b599a0b1ae7987f55b01e247cf27a7c27cd97e5bbc7',
    '1.2.6-r2'
  ]) {
    if (!evidenceDoc.includes(checksum)) fail(`release evidence document missing checksum ${checksum}`);
  }
}

async function evaluateFromCli(args) {
  const policyIndex = args.indexOf('--policy');
  const outputIndex = args.indexOf('--output');
  if (policyIndex === -1 || outputIndex === -1 || policyIndex + 1 >= args.length || outputIndex + 1 >= args.length) {
    fail('usage: --evaluate --policy POLICY --output RESULT REPORT [REPORT ...]');
  }
  const policyPath = path.resolve(args[policyIndex + 1]);
  const outputPath = path.resolve(args[outputIndex + 1]);
  const consumed = new Set([policyIndex, policyIndex + 1, outputIndex, outputIndex + 1]);
  const reportPaths = args.filter((_, index) => !consumed.has(index));
  if (reportPaths.length === 0) fail('at least one Grype JSON report is required');

  const policyFile = await readJson(policyPath, 'release policy');
  const policy = validatePolicy(policyFile.value);
  const reports = [];
  const inputs = [];
  const reportSources = new Set();
  for (const reportPath of reportPaths) {
    const absolutePath = path.resolve(reportPath);
    const report = await readJson(absolutePath, reportPath);
    const source = path.basename(reportPath);
    if (reportSources.has(source)) fail(`duplicate report source basename: ${source}`);
    reportSources.add(source);
    reports.push({ source, report: report.value });
    inputs.push({ path: path.relative(REPOSITORY_ROOT, absolutePath), sha256: sha256(report.bytes) });
  }
  const result = evaluateReports(reports, policy);
  const evidence = {
    ...result,
    policy: { path: path.relative(REPOSITORY_ROOT, policyPath), sha256: sha256(policyFile.bytes) },
    inputs
  };
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);

  const summary = `${result.summary.uniqueFindings} unique; ${result.summary.blocked} blocked; ${result.summary.excepted} excepted; ${result.summary.policyViolations} policy violations`;
  if (!result.passed) {
    console.error(`[backend:release-artifact] FAIL ${summary}; evidence: ${outputPath}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[backend:release-artifact] PASS ${summary}`);
}

const [command, ...args] = process.argv.slice(2);
if (command === '--self-test') {
  runSelfTest();
  console.log('[backend:release-artifact] policy self-test passed');
} else if (command === '--verify-contract') {
  runSelfTest();
  await verifyContract();
  console.log('[backend:release-artifact] source, tool-pin, and policy contract passed');
} else if (command === '--evaluate') {
  await evaluateFromCli(args);
} else {
  fail('expected --self-test, --verify-contract, or --evaluate');
}
