#!/usr/bin/env node

/**
 * Fail on every RustSec vulnerability and every informational advisory that has
 * not been reviewed as an exact package/version/kind tuple.
 *
 * cargo-audit deliberately exits zero for informational warnings by default.
 * Treating that exit code as a clean bill of health would therefore be false.
 * This wrapper parses the machine report and keeps the temporary exceptions
 * narrow, visible, and regression-tested.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/*
  THREE levels up, not one — the same correction `verify-api-release-artifact.mjs` already carries,
  and for the same reason.

  `import.meta.url` is `apps/controller/scripts/…`, so `'../'` resolves to `apps/controller/`, and
  every path below is addressed `services/…`, which lives at the REPOSITORY root. This looked for
  `apps/controller/services/Cargo.lock` — a directory that does not exist.

  It came from the sibling repository, where `services/` sits beside `scripts/` and `'../'` was
  right. Moving it under `apps/controller/` invalidated the assumption without changing the name.
  Its sibling was corrected when `pnpm test` started running it; this one was not, because nothing
  ran it at all: the workflow step invoking it was itself pointing at a path that does not exist,
  and the gate that would have caught either only runs on a push to `main`.
*/
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LOCKFILE = path.join(REPOSITORY_ROOT, 'services', 'Cargo.lock');
const SERVICES_DIRECTORY = path.join(REPOSITORY_ROOT, 'services');

/**
 * Reviewed informational advisories, as exact kind/advisory/package/version tuples.
 *
 * RUSTSEC-2026-0253 (lru 0.8.1, "Potential use-after-free due to lack of panic safety in
 * `LruCache::pop()`", 2026-05-12, patched `>=0.18.2`) — reviewed 2026-08-14, the first time this
 * verifier ever ran. The unsoundness needs one specific thing to happen: the `Drop` implementation
 * of a stored KEY must PANIC during `pop()`, which skips `detach()` and leaves a dangling node in
 * the internal list for a later eviction to dereference.
 *
 * Not reachable from here, and not remediable here either:
 *
 *   * `cargo tree --invert lru@0.8.1` is `lru -> mediasoup 0.24.3 -> tradingroom-media`. Nothing in
 *     this workspace constructs an `LruCache`; the caches are mediasoup's own internals, keyed on
 *     its identifiers. `EXPECTED_MEDIA_TRANSITIVES` below re-proves that confinement on every run,
 *     so this exception dies the moment anything else starts depending on `lru`.
 *   * The patch is `>=0.18.2` against a pin of `0.8.x` held by `mediasoup 0.24.3`. Only a mediasoup
 *     release can move it.
 *   * `services/**` is a MIRROR in this repository — a `Cargo.lock` edited here is lost on the next
 *     sync — so even the version bump has to be made at the source rather than in this tree.
 */
const EXPECTED_WARNINGS = Object.freeze(
  [
    'unmaintained:RUSTSEC-2024-0375:atty@0.2.14',
    'unmaintained:RUSTSEC-2024-0384:instant@0.1.13',
    'unmaintained:RUSTSEC-2024-0436:paste@0.1.18',
    'unsound:RUSTSEC-2021-0145:atty@0.2.14',
    'unsound:RUSTSEC-2026-0097:rand@0.7.3',
    'unsound:RUSTSEC-2026-0253:lru@0.8.1'
  ].sort()
);

const EXPECTED_MEDIA_TRANSITIVES = Object.freeze([
  'atty@0.2.14',
  'instant@0.1.13',
  'lru@0.8.1',
  'paste@0.1.18',
  'rand@0.7.3'
]);

/**
 * Reviewed RustSec vulnerabilities, as exact advisory/package/version tuples.
 *
 * cargo-audit reads `Cargo.lock`, which records the resolution of optional
 * dependencies even when no enabled feature pulls them into the build. A locked
 * entry is therefore not proof that any code is compiled, and an entry that no
 * feature can reach is not remediable by upgrading: nothing depends on it.
 *
 * Every tuple here MUST also appear in EXPECTED_UNBUILT below, so the exception
 * survives only while the crate is provably absent from the resolved graph.
 *
 * RUSTSEC-2026-0235 (rkyv 0.7.46, out-of-bounds read via Rc/Arc archives):
 * `rust_decimal` declares `rkyv ^0.7.46` as an OPTIONAL dependency. No manifest
 * in this workspace requests that feature, and `rust_decimal 1.42.1` is already
 * the latest release, so its `>=0.7.46, <0.8.0` range cannot reach the `>=0.8.17`
 * patch. The fix is upstream in `rust_decimal`, not here.
 */
const EXPECTED_VULNERABILITIES = Object.freeze(['RUSTSEC-2026-0235:rkyv@0.7.46'].sort());

/** Locked but unbuildable: must not be reachable by any edge kind on any target. */
const EXPECTED_UNBUILT = Object.freeze(['rkyv@0.7.46']);

function fail(message) {
  throw new Error(`[backend:advisories] ${message}`);
}

function run(command, args, { allowStatus = [0], ...options } = {}) {
  const result = spawnSync(command, args, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  if (result.error) fail(`${command} could not start: ${result.error.message}`);
  if (result.signal) fail(`${command} was terminated by ${result.signal}`);
  if (!allowStatus.includes(result.status)) {
    fail(`${command} exited ${result.status}: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  return result.stdout;
}

/**
 * cargo-audit exits 1 when it finds any vulnerability, so a nonzero status is
 * the normal path while a reviewed exception exists and must not be read as a
 * tool failure. The report itself is still written to stdout, and the JSON parse
 * below is what separates "audited and found something" from "did not run":
 * a crash, a missing database or an unreadable lockfile does not produce JSON.
 */
const reportText = run('cargo', ['audit', '--file', LOCKFILE, '--format', 'json'], {
  allowStatus: [0, 1]
});
let report;
try {
  report = JSON.parse(reportText);
} catch (error) {
  fail(`cargo-audit did not return JSON: ${error.message}`);
}

const actualVulnerabilities = (report.vulnerabilities?.list ?? [])
  .map((entry) => `${entry.advisory?.id}:${entry.package?.name}@${entry.package?.version}`)
  .sort();

// Exact-set comparison in BOTH directions. A new vulnerability fails, and so
// does a stale exception once its advisory or version stops matching, which is
// what forces the entry to be removed rather than quietly outliving its reason.
if (JSON.stringify(actualVulnerabilities) !== JSON.stringify(EXPECTED_VULNERABILITIES)) {
  fail(
    `RustSec vulnerability set drifted; expected ${EXPECTED_VULNERABILITIES.join(', ') || '(none)'}, ` +
      `got ${actualVulnerabilities.join(', ') || '(none)'}`
  );
}

const actualWarnings = Object.entries(report.warnings ?? {})
  .flatMap(([kind, entries]) =>
    entries.map((entry) => `${kind}:${entry.advisory.id}:${entry.package.name}@${entry.package.version}`)
  )
  .sort();

if (JSON.stringify(actualWarnings) !== JSON.stringify(EXPECTED_WARNINGS)) {
  fail(
    `informational advisory set drifted; expected ${EXPECTED_WARNINGS.join(', ')}, got ${actualWarnings.join(', ') || '(none)'}`
  );
}

/*
  `--target all`, for the same reason the EXPECTED_UNBUILT loop below already passes it.

  Without it `cargo tree --invert` only walks edges enabled for the HOST target, and a crate reached
  through a target-gated dependency prints nothing at all. `instant@0.1.13` is exactly that: its
  chain is `instant -> fastrand -> futures-lite -> mediasoup`, and `fastrand 1.9.0` depends on it
  only on wasm. On a Linux runner the inverted tree came back EMPTY, and an empty tree does not
  contain the string `mediasoup`, so this check reported that a confined crate had escaped its
  graph — the opposite of the truth, and a failure that no upgrade could have fixed.

  It was never noticed because this verifier had never run: the workflow step invoking it pointed at
  a path that does not exist, and that step only runs on a push to `main`.
*/
for (const packageId of EXPECTED_MEDIA_TRANSITIVES) {
  const tree = run(
    'cargo',
    [
      'tree',
      '--locked',
      '--manifest-path',
      path.join(SERVICES_DIRECTORY, 'Cargo.toml'),
      '--invert',
      packageId,
      '--edges',
      'normal,build',
      '--target',
      'all'
    ],
    { cwd: SERVICES_DIRECTORY }
  );
  if (!tree.includes('mediasoup')) {
    fail(`${packageId} is no longer confined to the reviewed mediasoup dependency graph`);
  }
}

// A vulnerability may only be excepted while it is also proved unbuildable.
for (const tuple of EXPECTED_VULNERABILITIES) {
  const packageId = tuple.slice(tuple.indexOf(':') + 1);
  if (!EXPECTED_UNBUILT.includes(packageId)) {
    fail(`${tuple} is excepted without a matching EXPECTED_UNBUILT proof for ${packageId}`);
  }
}

/**
 * `cargo tree --invert` prints the dependents of a package on stdout and exits
 * zero either way, emitting only a stderr warning when there are none. Empty
 * stdout across every edge kind and every target is therefore the proof that no
 * feature resolution reaches this crate: it is locked, never compiled.
 */
for (const packageId of EXPECTED_UNBUILT) {
  const tree = run(
    'cargo',
    [
      'tree',
      '--locked',
      '--manifest-path',
      path.join(SERVICES_DIRECTORY, 'Cargo.toml'),
      '--invert',
      packageId,
      '--edges',
      'all',
      '--target',
      'all'
    ],
    { cwd: SERVICES_DIRECTORY }
  );
  if (tree.trim() !== '') {
    fail(
      `${packageId} is now reachable from the build graph, so its advisory exception no longer holds:\n${tree.trim()}`
    );
  }
}

console.log(
  `[backend:advisories] PASS: ${actualVulnerabilities.length} exact reviewed vulnerabilities, ` +
    `each proved absent from the build graph; ${actualWarnings.length} exact reviewed mediasoup warnings`
);
