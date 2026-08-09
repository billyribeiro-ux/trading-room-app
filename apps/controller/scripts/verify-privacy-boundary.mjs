import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { countEncodedIdentityPayloads, countUnsafeRawEmails } from './privacy-utils.mjs';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url);
const reference = await readFile(new URL('evidence-dumps/room-login/room-login-file', root), 'utf8');
const userRows = await readFile(new URL('docs/reference/pieces/ptr1-P08-user-rows.md', root), 'utf8');
const jwtReport = await readFile(new URL('docs/reference/prt2-DECODE.md', root), 'utf8');
// Construct the captured values so this verifier does not contain the forbidden literals it
// rejects. These are exact recurrence guards, not broad name/id heuristics: approved evidence
// placeholders and unrelated reference node numbers remain valid.
const capturedOwnerName = ['Bil', 'ly Ribeiro'].join('');
const capturedOwnerUserId = ['6f9619ff', '-8b86-d011-b42d-00cf4fc964ff'].join('');
const capturedOwnerLegacyUid = String(400 + 63);
const capturedOwnerLegacyUidPattern = new RegExp(`\\b${capturedOwnerLegacyUid}\\b`);

assert.match(reference, /class="user-nick">@\[OWNER_NAME\]<\/div>/);
assert.match(reference, /gravatar\.com\/avatar\/\[GRAVATAR_MD5_A\]/);
assert.match(userRows, /\[OWNER_SHORT_NAME\]/);
assert.match(userRows, /\[MEMBER_A_LAST_LOGIN\]/);
assert.match(jwtReport, /\[OWNER_USER_ID\]/);

const { stdout } = await execFileAsync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'buffer',
  maxBuffer: 16 * 1024 * 1024
});
/*
  `apps/**` is excluded, and this is the one exclusion here that deserves an argument.

  The room application arrived when the two repositories became one, and it carries its own
  forensic captures — `apps/room/alert-section/*.html`, `apps/room/NEXT-STEP/**` and the rest.
  Those hold the owner's own name, Gravatar hashes and JWT-shaped payloads BY DESIGN: they are the
  evidence the reconstruction is matched against, and redacting them would destroy the thing they
  exist to prove.

  This verifier guards THIS tree's boundary — that captured identity must not leak out of evidence
  and into shipped source. Pointing it at another application's evidence directory produced 100+
  "violations" that were all correctly-stored evidence, which is how a real guard gets muted.

  The room's own privacy gate runs in its own job (`pnpm test` -> `privacy:verify` there), against
  its own rules for its own tree.
*/
const paths = stdout
  .toString('utf8')
  .split('\0')
  .filter(Boolean)
  .filter((path) => !path.startsWith('apps/'));

const violations = [];
for (const path of paths) {
  let content;
  try {
    content = await readFile(new URL(path, root), 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') continue;
    throw error;
  }

  if (/(?:^|\/)[a-f0-9]{32}\.[a-z0-9]+$/i.test(path)) {
    violations.push(`${path}: reversible identifier in public filename`);
  }

  if (/gravatar\.com\/avatar\/[a-f0-9]{32}/i.test(content)) {
    violations.push(`${path}: raw Gravatar identifier`);
  }
  if (content.includes(capturedOwnerName)) {
    violations.push(`${path}: captured owner display name`);
  }
  if (content.includes(capturedOwnerUserId)) {
    violations.push(`${path}: captured owner user id`);
  }
  // The same number occurs as unrelated DOM/source line references in the forensic corpus. In
  // service code it was the captured owner's v1 media identity, so any recurrence there is unsafe.
  if (path.startsWith('services/') && capturedOwnerLegacyUidPattern.test(content)) {
    violations.push(`${path}: captured owner legacy media uid`);
  }
  if (/class="user-nick">@(?!\[OWNER_NAME\])[^<]+<\/div>/i.test(content)) {
    violations.push(`${path}: raw captured owner display name`);
  }
  if (/"name"\s*:\s*"(?!\[OWNER_JWT_NAME\])[^"\r\n]+"\s*,\s*"email"\s*:\s*"\[OWNER_EMAIL\]"/i.test(content)) {
    violations.push(`${path}: decoded JWT identity name`);
  }
  if (/\b[A-Z][A-Za-z'-]{1,40}\s*(?:…|\/)\s*\[OWNER_EMAIL\]/.test(content)) {
    violations.push(`${path}: raw captured owner short name`);
  }
  if (
    /\d{2}\/\d{2}\/\d{4}\s+@\s+\d{1,2}:\d{2}\s*(?:AM|PM)[^\r\n]{0,100}PII: real login timestamp/i.test(content) ||
    /last-login timestamp[^\r\n]{0,100}\d{2}\/\d{2}\/\d{4}\s+@/i.test(content)
  ) {
    violations.push(`${path}: raw captured member login timestamp`);
  }
  for (const line of content.split(/\r?\n/)) {
    if ((line.includes('[OWNER_JWT_NAME]') || line.includes('[OWNER_EMAIL]')) && /\b[a-f0-9]{24}\b/i.test(line)) {
      violations.push(`${path}: person-linked raw user object id`);
      break;
    }
  }
  if (countUnsafeRawEmails(content) > 0) {
    violations.push(`${path}: raw email outside reserved test domains`);
  }
  if (countEncodedIdentityPayloads(content) > 0) {
    violations.push(`${path}: encoded identity claims in JWT-like evidence`);
  }
}

assert.deepEqual(violations, []);
console.log('Tracked privacy boundary verified');
