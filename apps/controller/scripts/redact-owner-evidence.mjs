import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { redactEncodedIdentityPayloads, replaceUnsafeRawEmails } from './privacy-utils.mjs';

const root = new URL('../', import.meta.url);
const sourcePath = new URL('evidence-dumps/room-login/room-login-file', root);
const source = await readFile(sourcePath, 'utf8');
const ownerName = source.match(/class="user-nick">@([^<[]+)<\/div>/)?.[1];
const gravatarHash = source.match(/gravatar\.com\/avatar\/([a-f0-9]{32})/i)?.[1];
const jwtNameSourcePath = new URL('docs/reference/prt2-DECODE.md', root);
const jwtNameSource = await readFile(jwtNameSourcePath, 'utf8');
const userRowsSourcePath = new URL('docs/reference/pieces/ptr1-P08-user-rows.md', root);
const userRowsSource = await readFile(userRowsSourcePath, 'utf8');
const jwtIdentityName = jwtNameSource.match(/"name"\s*:\s*"([^"[]+)"\s*,\s*"email"\s*:\s*"\[OWNER_EMAIL\]"/)?.[1];
const ownerShortName = userRowsSource.match(/segment 0\s*:\s*0 spaces\s*\+\s*"([^"[]+)"[^\r\n]*PII \(userName\)/)?.[1];
const memberLastLogin = userRowsSource.match(/`([^`[]+)`\s*\|\s*\*\*⚠️ PII: real login timestamp\*\*/)?.[1];
const ownerUserId = jwtNameSource.match(
  /"name"\s*:\s*"\[OWNER_JWT_NAME\]"[\s\S]{0,160}?"id"\s*:\s*"([a-f0-9]{24})"/i
)?.[1];

const ownerIdentityTargets = [
  'evidence-dumps/login-page/launch',
  'evidence-dumps/room-login/room-login-file',
  'docs/reference/parts/02-baseline-720-1439.md',
  'docs/reference/pieces/ptr1-P08-user-rows.md',
  'docs/reference/pieces/ptr1-P29-angular-data-model.md',
  'docs/reference/ptr1-DECODE.md',
  'docs/reference/ptr1-MASTER.md',
  'docs/reference/room-login-visual.md'
];

if (!ownerName && !gravatarHash) {
  assert.match(source, /class="user-nick">@\[OWNER_NAME\]<\/div>/);
  assert.match(source, /gravatar\.com\/avatar\/\[GRAVATAR_MD5_A\]/);
} else {
  assert.ok(ownerName, 'owner display name was not found in the captured user-nick element');
  assert.ok(gravatarHash, 'Gravatar identifier was not found in the captured avatar URL');

  for (const target of ownerIdentityTargets) {
    const url = new URL(target, root);
    const before = await readFile(url, 'utf8');
    const after = before.replaceAll(ownerName, '[OWNER_NAME]').replaceAll(gravatarHash, '[GRAVATAR_MD5_A]');
    await writeFile(url, after);
  }
}

const jwtIdentityTargets = [
  'docs/reference/parts/01-baseline-000-719.md',
  'docs/reference/pieces/prt2-Q03-sessions-section.md',
  'docs/reference/pieces/prt2-Q12-gaps-and-pii.md',
  'docs/reference/pieces/ptr1-P03-panel-shell.md',
  'docs/reference/pieces/ptr1-P32-capture-metadata-quiescence.md',
  'docs/reference/prt2-DECODE.md',
  'docs/reference/ptr1-DECODE.md',
  'docs/reference/ptr1-MASTER.md'
];

if (jwtIdentityName) {
  for (const target of jwtIdentityTargets) {
    const url = new URL(target, root);
    const before = await readFile(url, 'utf8');
    await writeFile(url, before.replaceAll(jwtIdentityName, '[OWNER_JWT_NAME]'));
  }
} else {
  assert.match(jwtNameSource, /"name"\s*:\s*"\[OWNER_JWT_NAME\]"/);
}

const directIdentityTargets = [
  'docs/reference/REDACTIONS.md',
  'docs/reference/parts/01-baseline-000-719.md',
  'docs/reference/parts/02-baseline-720-1439.md',
  'docs/reference/pieces/prt2-Q03-sessions-section.md',
  'docs/reference/pieces/prt2-Q12-gaps-and-pii.md',
  'docs/reference/pieces/ptr1-P03-panel-shell.md',
  'docs/reference/pieces/ptr1-P08-user-rows.md',
  'docs/reference/pieces/ptr1-P29-angular-data-model.md',
  'docs/reference/pieces/ptr1-P32-capture-metadata-quiescence.md',
  'docs/reference/prt2-DECODE.md',
  'docs/reference/ptr1-DECODE.md',
  'docs/reference/ptr1-MASTER.md'
];
const directIdentityReplacements = [
  [ownerShortName, '[OWNER_SHORT_NAME]'],
  [memberLastLogin, '[MEMBER_A_LAST_LOGIN]'],
  [ownerUserId, '[OWNER_USER_ID]']
].filter(([value]) => value);

if (directIdentityReplacements.length > 0) {
  for (const target of directIdentityTargets) {
    const url = new URL(target, root);
    let content = await readFile(url, 'utf8');
    for (const [value, token] of directIdentityReplacements) {
      content = content.replaceAll(value, token);
    }
    await writeFile(url, content);
  }
} else {
  assert.match(userRowsSource, /\[OWNER_SHORT_NAME\]/);
  assert.match(userRowsSource, /\[MEMBER_A_LAST_LOGIN\]/);
  assert.match(jwtNameSource, /\[OWNER_USER_ID\]/);
}

const encodedIdentityTargets = [
  'docs/reference/ptr1-DECODE.md',
  'docs/reference/prt2-DECODE.md',
  'docs/reference/parts/01-baseline-000-719.md',
  'docs/reference/pieces/prt2-Q03-sessions-section.md',
  'docs/reference/pieces/prt2-Q12-gaps-and-pii.md',
  'docs/reference/pieces/ptr1-P03-panel-shell.md'
];

let encodedReplacements = 0;
for (const target of encodedIdentityTargets) {
  const url = new URL(target, root);
  const before = await readFile(url, 'utf8');
  const { redacted, replacements } = redactEncodedIdentityPayloads(before);
  if (replacements > 0) await writeFile(url, redacted);
  encodedReplacements += replacements;
}

const capturedEmailTargets = [
  'evidence-dumps/login-page/launch',
  'evidence-dumps/room-login/room-login-file',
  'src/lib/components/RoomLogin.svelte'
];
let rawEmailReplacements = 0;
for (const target of capturedEmailTargets) {
  const url = new URL(target, root);
  const before = await readFile(url, 'utf8');
  const { redacted, replacements } = replaceUnsafeRawEmails(before, () => 'user@example.com');
  if (replacements > 0) await writeFile(url, redacted);
  rawEmailReplacements += replacements;
}

const apiExampleAliases = new Map();
const apiExampleTargets = ['evidence-dumps/login-page/api-docs', 'src/lib/content/api-docs.ts'];
for (const target of apiExampleTargets) {
  const url = new URL(target, root);
  const before = await readFile(url, 'utf8');
  const { redacted, replacements } = replaceUnsafeRawEmails(before, (candidate) => {
    const key = candidate.toLowerCase();
    if (!apiExampleAliases.has(key)) {
      apiExampleAliases.set(key, `user${apiExampleAliases.size + 1}@example.com`);
    }
    return apiExampleAliases.get(key);
  });
  if (replacements > 0) await writeFile(url, redacted);
  rawEmailReplacements += replacements;
}

if (ownerName) {
  console.log('Tracked owner display name and Gravatar identifier replaced with stable evidence tokens');
} else {
  console.log('Tracked owner display name and Gravatar identifier are already redacted');
}
console.log(
  jwtIdentityName
    ? 'Decoded JWT identity name replaced with a stable evidence token'
    : 'Decoded JWT identity name is already redacted'
);
console.log(
  directIdentityReplacements.length > 0
    ? 'Short name, member login timestamp, and person-linked user id replaced with stable evidence tokens'
    : 'Short name, member login timestamp, and person-linked user id are already redacted'
);
console.log(`Encoded identity payloads redacted: ${encodedReplacements}`);
console.log(`Raw non-test email literals redacted: ${rawEmailReplacements}`);
