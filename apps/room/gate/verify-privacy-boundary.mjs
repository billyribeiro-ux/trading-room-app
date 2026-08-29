#!/usr/bin/env node

/**
 * Stops NEW personal data entering this repository.
 *
 * ## Why this exists, and why it is a baseline rather than a wall
 *
 * `new-room-control` has had a privacy gate since 2026-08-02 that rejects the captured owner's
 * name, personal email addresses, Gravatar hashes and identity-bearing JWTs. This repository had
 * none, and that asymmetry is exactly why personal data accumulated here: 53 files carry it, the
 * repository was PUBLIC until 2026-08-07, and nothing ever said so.
 *
 * A gate that failed on all 53 would be switched off within a day, so it does not pretend the
 * existing findings are absent. It records them as an exact, reviewable baseline and fails on
 * anything NOT in it. The baseline can only shrink.
 *
 * This is emphatically **not** a claim that the baselined values are harmless, expired, or
 * unreachable. They are personal data in a Git history that was public for three days. Removing
 * them needs a coordinated history rewrite and the owner's decision; this file only guarantees the
 * problem stops growing while that decision is pending.
 *
 * ## What counts as a finding
 *
 *   ownerName    the captured owner's display name, constructed here so this file does not
 *                itself contain the literal it rejects
 *   rawEmail     an address outside the reserved test domains (example.com, .test, .invalid …)
 *   gravatar     a Gravatar avatar hash, which is an unsalted MD5 of an email address and
 *                therefore reverses to the address by dictionary lookup
 *   jwtIdentity  a base64 payload whose decoded body carries an email or an identity claim
 *
 * ## Usage
 *
 *   node gate/verify-privacy-boundary.mjs            verify
 *   node gate/verify-privacy-boundary.mjs --update   re-record the baseline after REMOVING data
 *
 * `--update` is deliberately not wired into any gate. Regenerating must be a deliberate act with a
 * diff a reviewer reads, or the baseline becomes a rubber stamp that silently absorbs new leaks.
 *
 * ## Why this lives in `gate/` and not in `scripts/`, which is where it was written
 *
 * On 2026-08-15 every file under `apps/room/scripts` was untracked and gitignored: that directory
 * is the reference-match tooling — collectors and probes that drive a live third-party application
 * — and this repository is public. This file was caught by that sweep, and it should never have
 * been in there to begin with. It collects nothing and it touches no third-party host; it is this
 * repository's own privacy gate, and `package.json` makes it the first of the three commands in
 * `test`.
 *
 * The consequence of leaving it there was concrete: on any checkout without the untracked
 * directory — which is every CI checkout — `pnpm test` died on `Cannot find module` before running
 * a single test, and the repository's only automated check against personal data entering a PUBLIC
 * repository was simply gone. So the eviction stands and the misfiling is corrected: collectors in
 * `scripts/`, which is not published; the gate in `gate/`, which is.
 *
 * `privacy-utils.mjs` moved with it, because this file imports it, and
 * `verify-postgres-schema-artifacts.mjs` moved with it as the other half of `test`. Anything added
 * here must stay in that category — if it reaches out to the reference application, it belongs in
 * `scripts/` instead.
 */

import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { missingEvidenceRoots } from './evidence-bound-tests.mjs';
import { countEncodedIdentityPayloads, findUnsafeRawEmails } from './privacy-utils.mjs';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url);
const BASELINE = 'ops/privacy-baseline.txt';
const updating = process.argv.includes('--update');

/*
  Built from parts so this verifier does not contain the exact string it rejects — otherwise it
  reports itself, and the obvious fix is to exclude it, which is how a gate stops watching its own
  blind spot.
*/
const capturedOwnerName = ['Bil', 'ly Ribeiro'].join('');
const gravatarHash = /gravatar\.com\/avatar\/[a-f0-9]{32}/i;

function findingsFor(content) {
  const found = [];
  if (content.includes(capturedOwnerName)) found.push('ownerName');
  if (gravatarHash.test(content)) found.push('gravatar');
  if (findUnsafeRawEmails(content).length > 0) found.push('rawEmail');
  if (countEncodedIdentityPayloads(content) > 0) found.push('jwtIdentity');
  return found;
}

const { stdout } = await execFileAsync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: root, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 }
);
const paths = stdout.toString('utf8').split('\0').filter(Boolean);

const current = new Set();
for (const path of paths) {
  let content;
  try {
    content = await readFile(new URL(path, root), 'utf8');
  } catch (error) {
    // ENOENT: a path git listed and something removed underneath us.
    // EISDIR: a symlink to a directory; git lists it as one entry and it has no content of its
    // own. Its target's files are enumerated separately, so no coverage is lost.
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    if (code === 'ENOENT' || code === 'EISDIR' || code === 'ERR_INVALID_ARG_VALUE') continue;
    throw error;
  }
  for (const finding of findingsFor(content)) current.add(`${finding} ${path}`);
}

const sorted = [...current].sort();

if (updating) {
  const header = [
    '# Exact per-file baseline of personal data already present in this repository.',
    '#',
    '# Generated by `node gate/verify-privacy-boundary.mjs --update`. Every line is one',
    '# "<finding> <path>" pair. A line here is NOT a statement that the value is harmless — it is a',
    '# record that it was already present when the gate was installed, so the gate can fail on',
    '# anything new instead of being switched off for failing on everything.',
    '#',
    '# This list may shrink and must never grow without a reviewer agreeing in the same change.',
    ''
  ].join('\n');
  await writeFile(new URL(BASELINE, root), `${header}${sorted.join('\n')}\n`, 'utf8');
  console.log(
    `[privacy] baseline rewritten: ${sorted.length} finding(s) across ${paths.length} files`
  );
  process.exit(0);
}

let baselineText;
try {
  baselineText = await readFile(new URL(BASELINE, root), 'utf8');
} catch {
  console.error(`[privacy] ${BASELINE} is missing. Run with --update to create it.`);
  process.exit(1);
}
const baseline = new Set(
  baselineText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
);

const added = sorted.filter((entry) => !baseline.has(entry));
const removed = [...baseline].filter((entry) => !current.has(entry)).sort();

if (added.length > 0) {
  console.error(
    `[privacy] ${added.length} NEW finding(s) — personal data must not enter this repository:\n`
  );
  for (const entry of added) {
    const [finding, ...rest] = entry.split(' ');
    console.error(`  ${finding.padEnd(12)} ${rest.join(' ')}`);
  }
  console.error(
    '\nRedact it. Use [OWNER_NAME], [OWNER_EMAIL], [GRAVATAR_MD5_A] or a reserved test domain\n' +
      '(example.com, .test, .invalid). Only run --update after REMOVING data, never to accept it.'
  );
  process.exit(1);
}

/*
  A "gone" finding means one of two completely different things, and telling a reader to run
  `--update` without distinguishing them is how a baseline gets corrupted.

  It is GONE-BECAUSE-REDACTED when somebody removed the data. Shrinking the baseline is then correct
  and is the whole reason `--update` exists.

  It is GONE-BECAUSE-ABSENT when the file simply is not in this checkout. Every capture root here is
  a gitignored symlink that resolves only on the machine that took the captures, so a clone reports
  every finding inside them as missing — 81 of them on 2026-08-28, all in `alert-section/`,
  `app-message-modal/` and `app-room/`. **Running `--update` there would rewrite the baseline down to
  what a clone can see**, and the next run on the owner's machine would report those 81 as NEW
  personal data entering the repository. A gate that fails on the author's own untouched captures is
  a gate that gets switched off.

  So the advice is withheld when any capture root is missing, and the reason is printed instead.
  `missingEvidenceRoots()` is imported rather than re-derived: `gate/evidence-bound-tests.mjs`
  already owns which roots exist and why, and a second copy of that list is a second thing to keep
  in step.
*/
if (removed.length > 0) {
  const missingRoots = missingEvidenceRoots();
  if (missingRoots.length > 0) {
    console.log(
      `[privacy] ${removed.length} baselined finding(s) are not visible from this checkout, which is` +
        ` missing ${missingRoots.length} capture root(s): ${missingRoots.join(', ')}.`
    );
    console.log('[privacy] Do NOT run --update here. They are absent, not redacted.');
    console.log(
      '[privacy] Shrinking the baseline would make them read as NEW personal data on a checkout' +
        ' that has the captures.'
    );
  } else {
    console.log(
      `[privacy] ${removed.length} baselined finding(s) are gone — run --update to shrink the baseline:`
    );
    for (const entry of removed.slice(0, 10)) console.log(`  ${entry}`);
  }
}

console.log(
  `[privacy] PASS no new personal data; ${baseline.size} baselined finding(s) across ${paths.length} tracked and untracked files`
);
