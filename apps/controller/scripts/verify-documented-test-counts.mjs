import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Documented Vitest totals rot silently: every gate stays green while the prose
// keeps certifying a stale run. This derives the count from the reporter that
// `test:unit` actually invokes and requires each documented site to match it.

const repositoryRoot = new URL('../', import.meta.url);

const documentedSites = [
  {
    path: 'docs/ENGINEERING-SSOT.md',
    pattern: /the fail-closed runtime HTTP contract, (\d+)\nVitest tests/,
    description: 'section 11 current-branch `pnpm quality` result'
  },
  {
    path: 'docs/PRODUCTION-CUTOVER-PLAN.md',
    pattern: /`pnpm quality` locally with (\d+)\n\s+Vitest tests/,
    description: 'Gate 1 source-tree evidence'
  },
  {
    path: 'docs/SVELTE-CONFORMANCE-AUDIT.md',
    // Anchored on the ratcheted-threshold suffix so the earlier dated
    // checkpoint rows, which correctly record their own historical totals,
    // are not rewritten to the current tree's numbers.
    //
    // The cell padding is `\s+`, not a single space, because Prettier aligns Markdown table
    // columns and runs in this same gate. A pattern demanding exactly `| Vitest | ` passed only
    // while no other row in the table was wider; adding one made `format:check` and this verifier
    // disagree about the same file, and this one failed with "must state a Vitest total" — which
    // reads as a missing number rather than a moved space.
    pattern: /\|\s*Vitest\s*\|\s*(\d+) files, (\d+) tests passed with all ratcheted coverage thresholds met\s*\|/,
    description: 'current-tree quality evidence table',
    filesGroup: 1,
    testsGroup: 2
  },
  {
    path: 'docs/SVELTE-CONFORMANCE-AUDIT.md',
    pattern: /the fail-closed runtime HTTP contract, (\d+) Vitest tests/,
    description: 'current-tree `pnpm quality` row'
  }
];

function totalsFrom(report) {
  assert.equal(report.success, true, 'vitest run must pass before its totals are documented');
  assert.equal(
    report.numFailedTests,
    0,
    `documented totals require a fully passing suite; ${report.numFailedTests} failed`
  );
  // numTotalTestSuites counts describe blocks; the documented figure is files.
  return { tests: report.numTotalTests, files: report.testResults.length };
}

/**
 * Reads a report `test:unit` has just written, instead of running the suite a second time.
 *
 * `pnpm test` ran Vitest TWICE — once here for the totals and once for coverage — which doubled the
 * unit suite on every local gate and every CI job. The second run measured a suite that had just
 * been proven, to count it.
 *
 * `--report <path>` is only passed by the `test` chain, immediately after `test:unit` produces it,
 * so the file cannot be stale by construction. Invoked on its own with no flag, this still runs
 * Vitest itself — the standalone path stays honest rather than trusting whatever happens to be on
 * disk from an hour ago.
 */
async function measureVitestTotals() {
  const flag = process.argv.indexOf('--report');
  if (flag !== -1 && process.argv[flag + 1]) {
    return totalsFrom(JSON.parse(await readFile(process.argv[flag + 1], 'utf8')));
  }

  // The JSON reporter interleaves its report with Vite logging on stdout, so
  // route it to a file outside the repository instead of parsing the stream.
  const reportDirectory = mkdtempSync(join(tmpdir(), 'proroom-vitest-totals-'));
  const reportPath = join(reportDirectory, 'vitest.json');

  try {
    const result = spawnSync(
      'node',
      ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${reportPath}`],
      { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );

    assert.equal(result.status, 0, `vitest run must succeed to measure documented totals\n${result.stderr}`);
    return totalsFrom(JSON.parse(await readFile(reportPath, 'utf8')));
  } finally {
    rmSync(reportDirectory, { recursive: true, force: true });
  }
}

const measured = await measureVitestTotals();

for (const site of documentedSites) {
  const contents = await readFile(new URL(site.path, repositoryRoot), 'utf8');
  const match = contents.match(site.pattern);
  assert.ok(match, `${site.path} must state a Vitest total for its ${site.description}`);

  const documentedTests = Number(match[site.testsGroup ?? 1]);
  assert.equal(
    documentedTests,
    measured.tests,
    `${site.path} (${site.description}) documents ${documentedTests} Vitest tests but the suite runs ${measured.tests}`
  );

  if (site.filesGroup !== undefined) {
    const documentedFiles = Number(match[site.filesGroup]);
    assert.equal(
      documentedFiles,
      measured.files,
      `${site.path} (${site.description}) documents ${documentedFiles} Vitest files but the suite runs ${measured.files}`
    );
  }
}

console.log(
  `Documented Vitest totals verified: ${measured.files} files, ${measured.tests} tests across ${documentedSites.length} documented sites`
);
