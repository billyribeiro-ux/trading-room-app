#!/usr/bin/env node
/*
  Which room settings the REFERENCE reads in its browser, and which of those this room does not.

  ## Why this exists beside the wire-command audit

  `audit-feature-coverage.mjs` next door asks the bundle what COMMANDS the reference has. Nothing
  asked it what SETTINGS it reads. The two are different surfaces and the second is larger: the
  controller's `room-settings-schema.ts` carries 269 settings, and **202 of them are marked
  `wired: false`** — meaning nothing in this room reads them.

  That number on its own says nothing. Most of those 202 are manage-page concerns that were never
  meant to reach a room. The question worth asking is narrower and answerable: **which of them does
  the reference's own room client read?** Each one of those is a room-facing behaviour the reference
  has and this room does not.

  Measured 2026-08-28 against the pinned v4 bundle: **58 of the 202**.

  ## ⚠️ FIFTY-EIGHT QUESTIONS, NOT FIFTY-EIGHT GAPS ⚠️

  The same warning the command audit carries, and it bites harder here, because there are three
  distinct reasons a name on this list is not work:

  1. **It is a CREDENTIAL, and the reference reading it in the browser is the defect this room
     deliberately does not reproduce.** `deleteAlertPW`, `banIPList`, `obsStreamKey`, `twillioApiSID`
     and `modAdminLoginList` are all on the list because upstream ships them to every member's
     browser. `room-config-boundary.test.ts` refuses exactly that, and `internal/room-entry` is the
     shape this room uses instead: the credential stays on the controller and the QUESTION travels.
     Wiring one of these would be a regression wearing an enumeration's clothes.
  2. **It is built under another mechanism.** A setting can be honoured without this room ever
     naming it — the same false-gap rate that killed 7 of 34 claims in the command triage.
  3. **It is genuinely unbuilt.** Only these are work.

  So the output is a list to ANSWER by reading, and the answers belong beside the settings they are
  about, not in this file's head.

  Usage:
    node gate/audit-setting-coverage.mjs            human-readable report
    node gate/audit-setting-coverage.mjs --json     the same data, machine-readable
*/

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOM = dirname(fileURLToPath(new URL('.', import.meta.url)));
const EVIDENCE = join(ROOM, 'docs/source-v4-2026-08-15');
const BUNDLE = 'main.d1d09071be31f1ba.js';
const SCHEMA = join(ROOM, '../controller/src/lib/room-settings-schema.ts');

/**
 * The bundle, verified against the `sha256sums.txt` committed beside it.
 *
 * Shared reasoning with `audit-feature-coverage.mjs`: every offset and count this repository quotes
 * is against these exact bytes, so a silently different file makes every one of them a lie.
 *
 * @returns {{ text: string, sha256: string, bytes: number }}
 */
function readVerifiedBundle() {
  const sums = readFileSync(join(EVIDENCE, 'sha256sums.txt'), 'utf8');
  const pinned = sums
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .find(([, name]) => name === BUNDLE)?.[0];
  if (!pinned) throw new Error(`sha256sums.txt does not pin ${BUNDLE}`);

  const bytes = readFileSync(join(EVIDENCE, BUNDLE));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== pinned) {
    throw new Error(
      `${BUNDLE} does not match its pin.\n  pinned ${pinned}\n  actual ${actual}\n` +
        'Every byte offset recorded in this repository is against the pinned bytes. Do not re-pin.'
    );
  }
  return { text: bytes.toString('utf8'), sha256: actual, bytes: bytes.length };
}

/**
 * Every setting the controller's schema declares, and whether this room reads it.
 *
 * `wired` is the schema's own field. It is read rather than re-derived because the schema is where
 * that fact is maintained, and a second opinion computed here would drift from it silently.
 *
 * @param {string} schema
 * @returns {{ name: string, wired: boolean }[]}
 */
export function declaredSettings(schema) {
  return [...schema.matchAll(/\{ name: "([A-Za-z0-9_]+)".*?wired: (true|false) \}/g)].map(
    (match) => ({
      name: match[1],
      wired: match[2] === 'true'
    })
  );
}

/**
 * How many times the reference's room client reads one setting off its session data.
 *
 * `sessData.<name>` and nothing looser. The bare name matches far too much — `name`, `description`
 * and `isLocked` are all settings AND ordinary identifiers in a 2.9 MB bundle — and a count that
 * over-matches turns this list into noise nobody reads, which is the failure mode the command audit
 * records about its own patterns.
 *
 * @param {string} bundle
 * @param {string} name
 * @returns {number}
 */
export function referenceReads(bundle, name) {
  return bundle.split(`sessData.${name}`).length - 1;
}

export function auditSettingCoverage() {
  const bundle = readVerifiedBundle();
  const schema = readFileSync(SCHEMA, 'utf8');
  const settings = declaredSettings(schema);

  const unwired = settings
    .filter((setting) => !setting.wired)
    .map((setting) => ({ name: setting.name, hits: referenceReads(bundle.text, setting.name) }))
    .filter((setting) => setting.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.name.localeCompare(b.name));

  return {
    evidence: { file: BUNDLE, sha256: bundle.sha256, bytes: bundle.bytes },
    declared: settings.length,
    wired: settings.filter((setting) => setting.wired).length,
    unwired: settings.length - settings.filter((setting) => setting.wired).length,
    unwiredButReferenceReads: unwired
  };
}

/* Executed directly rather than imported by the contract test. */
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const report = auditSettingCoverage();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`evidence  ${report.evidence.file}  sha256 ${report.evidence.sha256}`);
    console.log(
      `settings  ${report.declared} declared · ${report.wired} this room reads · ${report.unwired} it does not`
    );
    console.log(
      `\nOf the ${report.unwired} it does not read, the REFERENCE reads ${report.unwiredButReferenceReads.length} in its own browser:`
    );
    for (const setting of report.unwiredButReferenceReads) {
      console.log(`  ${setting.name.padEnd(32)} ${setting.hits} sessData reads`);
    }
    console.log(
      '\nThese are QUESTIONS, not work. Some are CREDENTIALS the reference ships to every browser and\n' +
        'this room deliberately does not — wiring one would be a regression. Some are built under\n' +
        'another mechanism. Only the rest are unbuilt. Answer them beside the setting, not here.'
    );
  }
}
