#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const GENERATOR = resolve(SCRIPT_DIR, 'extract-manage-schema.mjs');
const CANONICAL_SCHEMA = resolve(REPO_ROOT, 'src/lib/room-settings-schema.ts');

/*
  Eleven consumed by this repository's room-login page, twenty-five by the room application through
  `internal/room-config/[code]`. `allowUsersToChangeUsername` is on both lists, so the union is 35.
  Kept as one flat list so a drift shows up as a diff here rather than as a category argument.

  (Two copies of this note used to sit here, one of them stale at "twelve". A count that appears
  twice is a count that goes wrong once.)
*/
const EXPECTED_WIRED_SETTINGS = [
  'allowUsersToChangeUsername',
  'altBenzingaLinkURL',
  'altBenzingaLogoURL',
  'claimNickName',
  'customMobileAppAndroidUrl',
  'customMobileAppEnabled',
  'customMobileAppIOSUrl',
  'disablePMForTrials',
  'freeTrialsGetApp',
  'hasBenzingaNews',
  'hasRequiredPhoneInLogin',
  'hideAppInfo',
  'hideAvatars',
  'hideChatLog',
  'hideFiles',
  'hideMobileCredentials',
  'hidePoweredBy',
  'hideRecs',
  'hideWelcomeTo',
  'loginErrorMsg',
  'nickFilter',
  'onlyPresentersVisibleToViewers',
  'overwriteCashRegisterSound',
  'ptrMobileAppEnabled',
  'rosterCountVisibleToViewers',
  'rosterVisibleToViewers',
  'showArchivesToSpecificPresenters',
  'showArchivesToUsers',
  'showPasswordField',
  'simUserCount',
  'userPM',
  'userToPresenterPM',
  'userUploads',
  'usernameInstructions',
  'webinarPW'
].sort();

const fail = (message) => {
  throw new Error(message);
};

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const tempDirectory = mkdtempSync(join(tmpdir(), 'proroom-schema-verify-'));

try {
  const firstPath = join(tempDirectory, 'first.ts');
  const secondPath = join(tempDirectory, 'second.ts');

  execFileSync(process.execPath, [GENERATOR, '--out', firstPath], {
    cwd: REPO_ROOT,
    stdio: 'pipe'
  });
  // Prove extraction is independent of the caller's working directory and of a
  // pre-existing generated output file.
  execFileSync(process.execPath, [GENERATOR, '--out', secondPath], {
    cwd: tempDirectory,
    stdio: 'pipe'
  });

  const first = readFileSync(firstPath);
  const second = readFileSync(secondPath);
  if (!first.equals(second)) {
    fail(`schema generation is nondeterministic (${digest(first)} != ${digest(second)})`);
  }

  const generated = first.toString('utf8');
  if (
    !generated.includes('// 268 room settings extracted from the reference controller.\n') ||
    !generated.includes('// 1 reviewed product deviation (roomType) is added; 269 settings total.\n')
  ) {
    fail('generated schema does not declare the 268 extracted + 1 reviewed = 269 contract');
  }

  const definitions = [...generated.matchAll(/^\s*\{ name: "([^"]+)".* wired: (true|false) \},?$/gm)].map((match) => ({
    name: match[1],
    wired: match[2] === 'true'
  }));
  if (definitions.length !== 269) {
    fail(`expected 269 generated definitions; found ${definitions.length}`);
  }

  const uniqueNames = new Set(definitions.map((definition) => definition.name));
  if (uniqueNames.size !== 269) {
    fail(`expected 269 unique setting names; found ${uniqueNames.size}`);
  }

  const wired = definitions
    .filter((definition) => definition.wired)
    .map((definition) => definition.name)
    .sort();
  if (JSON.stringify(wired) !== JSON.stringify(EXPECTED_WIRED_SETTINGS)) {
    fail(`wired settings drifted: ${wired.join(', ') || '(none)'}`);
  }

  const roomType = definitions.filter((definition) => definition.name === 'roomType');
  if (roomType.length !== 1) {
    fail(`reviewed roomType deviation must occur exactly once; found ${roomType.length}`);
  }

  const canonical = readFileSync(CANONICAL_SCHEMA);
  if (!canonical.equals(first)) {
    fail(`generated schema is stale (${digest(canonical)} != ${digest(first)}); run pnpm schema:extract`);
  }

  console.log(`room-settings schema verified: 268 extracted + 1 reviewed deviation = 269 total; ${wired.length} wired`);
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
