#!/usr/bin/env node

/**
 * Reproducible integrity seal for the complete, non-ignored `services/**` tree.
 *
 * The path list and manifest are newline-delimited after rejecting paths that
 * contain newlines, so the serialization is unambiguous. The manifest line is:
 *
 *   <sha256(file bytes)>  <repository-relative path>\n
 *
 * Both tracked files and non-ignored files not yet added to Git are included.
 * This prevents a local gate from silently omitting a newly created source file.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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
const EXPECTED_FILE_COUNT = 98;
const EXPECTED_PATH_LIST_SHA256 = '66ab4696e3d3685daaa5ba27e28137a1cc038a71a32fcf92d30bdd144f35ecef';
const EXPECTED_MANIFEST_SHA256 = '4c3036011fe272a4264769358c9243804fb78246c2d0525ddaf67285ddb1815a';

/*
  Files under `services/**` that were AUTHORED HERE and never imported.

  This seal answers one question: has anything we imported from the source drifted? A file written
  in this repository is not an answer to that question, and folding it into the count would make
  `ops/backend-import-provenance.md` — which records what was IMPORTED — claim an import that never
  happened. That is the reason `TODO.md` row Z refused to bump 98 to 99, and the refusal was right;
  what was missing was the other half, which is this list.

  `0009_rename_runtime_roles.sql` was added 2026-08-10, deployed, and had a preflight defect found
  and fixed in it, all while this verifier could not run. It is pinned below by its own hash, so it
  is sealed — just not as an import.

  A file only belongs here with a CHANGELOG entry saying it was authored in this repository. If you
  are tempted to add an imported file to this list to make the gate green, the gate is telling the
  truth and the list is not the place to argue with it.
*/
const LOCALLY_AUTHORED = new Map([
  [
    'services/api/migrations/0009_rename_runtime_roles.sql',
    '6acfec233a6bfc81d0d82954e2147b3e32ccbc6a52095fb167734251ab0f1da4'
  ]
]);

/**
 * Prose that quotes the seal's file count, and must therefore move with it.
 *
 * Added after the count went 93 -> 98 during the `services/` reconcile and three documents were
 * left asserting 93 — including the SSOT authority table, which is supposed to be the place a
 * reader trusts. Nothing caught it: the seal itself was correct, so every gate stayed green while
 * the documentation described a different repository.
 *
 * A number duplicated into prose is a claim, and an unchecked claim rots. This is the cheap half
 * of the lesson that cost a 25-minute CI job when the same drift hit the release attestor's pinned
 * migration list: when a pinned artifact changes, the consumers are what break, so enumerate them
 * here rather than rediscovering them one failure at a time.
 */
const DOCUMENTED_COUNT_SITES = [
  'docs/ENGINEERING-SSOT.md',
  'docs/MEDIASOUP-DEPLOYMENT-PLAN.md',
  'ops/backend-import-provenance.md'
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fail(message) {
  throw new Error(`[backend:provenance] ${message}`);
}

function listServicePaths() {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'services'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'buffer',
    maxBuffer: 4 * 1024 * 1024
  });

  if (result.error) {
    fail(`git ls-files could not start: ${result.error.message}`);
  }
  if (result.signal) {
    fail(`git ls-files was terminated by ${result.signal}`);
  }
  if (result.status !== 0) {
    fail(`git ls-files exited with status ${result.status}`);
  }

  return result.stdout.toString('utf8').split('\0').filter(Boolean).sort();
}

const allPaths = listServicePaths();

/*
  Split before counting. The seal covers the IMPORTED tree; locally-authored files are sealed
  separately below so that neither set can drift unnoticed and neither is mistaken for the other.
*/
const paths = allPaths.filter((relativePath) => !LOCALLY_AUTHORED.has(relativePath));
const localPaths = allPaths.filter((relativePath) => LOCALLY_AUTHORED.has(relativePath));

if (localPaths.length !== LOCALLY_AUTHORED.size) {
  const missing = [...LOCALLY_AUTHORED.keys()].filter((p) => !localPaths.includes(p));
  fail(
    `locally-authored file(s) listed but not present: ${missing.join(', ')} — ` +
      `remove them from LOCALLY_AUTHORED in the same change that deleted them`
  );
}

if (paths.length !== EXPECTED_FILE_COUNT) {
  fail(
    `imported file count changed: expected ${EXPECTED_FILE_COUNT}, got ${paths.length} ` +
      `(${allPaths.length} total, ${localPaths.length} locally authored)`
  );
}

for (const [relativePath, expected] of LOCALLY_AUTHORED) {
  const actual = sha256(await readFile(`${REPOSITORY_ROOT}${relativePath}`));
  if (actual !== expected) {
    fail(`locally-authored file changed: ${relativePath} expected ${expected}, got ${actual}`);
  }
}

for (const relativePath of paths) {
  if (!relativePath.startsWith('services/') || relativePath.includes('\n') || relativePath.includes('\r')) {
    fail(`unsafe or ambiguous manifest path: ${JSON.stringify(relativePath)}`);
  }
}

const pathList = `${paths.join('\n')}\n`;
const pathListSha256 = sha256(pathList);
if (pathListSha256 !== EXPECTED_PATH_LIST_SHA256) {
  fail(`path-list SHA-256 changed: expected ${EXPECTED_PATH_LIST_SHA256}, got ${pathListSha256}`);
}

const manifestLines = await Promise.all(
  paths.map(async (relativePath) => {
    const bytes = await readFile(`${REPOSITORY_ROOT}${relativePath}`);
    return `${sha256(bytes)}  ${relativePath}`;
  })
);
const manifest = `${manifestLines.join('\n')}\n`;
const manifestSha256 = sha256(manifest);
if (manifestSha256 !== EXPECTED_MANIFEST_SHA256) {
  fail(`manifest SHA-256 changed: expected ${EXPECTED_MANIFEST_SHA256}, got ${manifestSha256}`);
}

/*
  Every "<n>-file" or "<n> files" claim about THIS seal must equal the seal.

  Deliberately narrow: it only matches counts written next to the words that name this seal, so an
  unrelated file count elsewhere in the same document is not dragged in. A stale number fails here,
  in milliseconds, instead of describing a repository that no longer exists.
*/
const SEAL_COUNT_CLAIM =
  /(\d+)(?:-file|\s+files?)(?=[^.\n]{0,80}?(?:provenance seal|current-tree (?:path\/content )?seal))/g;
for (const site of DOCUMENTED_COUNT_SITES) {
  let prose;
  try {
    prose = await readFile(`${REPOSITORY_ROOT}${site}`, "utf8");
  } catch {
    fail(`documented-count site is missing: ${site}`);
  }
  for (const [claim, stated] of prose.matchAll(SEAL_COUNT_CLAIM)) {
    if (Number(stated) !== EXPECTED_FILE_COUNT) {
      fail(
        `${site} claims "${claim.trim()}" but the seal covers ${EXPECTED_FILE_COUNT} files — ` +
          `update the prose in the same change that moved the seal`
      );
    }
  }
}

console.log(
  `[backend:provenance] PASS ${EXPECTED_FILE_COUNT} files; paths ${EXPECTED_PATH_LIST_SHA256}; manifest ${EXPECTED_MANIFEST_SHA256}; ${DOCUMENTED_COUNT_SITES.length} documented-count site(s) agree`
);
