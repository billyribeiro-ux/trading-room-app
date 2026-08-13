import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [reference, component, server, css, emptyAvatar, visualEvidence] = await Promise.all([
  readFile(new URL('../evidence-dumps/room-login/room-login-file', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/components/RoomLogin.svelte', import.meta.url), 'utf8'),
  readFile(new URL('../src/routes/(public)/session/[code]/+page.server.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/auth.css', import.meta.url), 'utf8'),
  readFile(new URL('../static/default-avatar.jpg', import.meta.url)),
  readFile(new URL('../docs/reference/room-login-visual.md', import.meta.url), 'utf8')
]);

function inspectJpeg(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1];
    const segmentLength = bytes.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        precision: bytes[offset + 4],
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + segmentLength;
  }

  return undefined;
}

assert.equal(
  createHash('sha256').update(reference).digest('hex'),
  '84834efc09a243e1dc98fe0c038d970c2423375c5c822d79d17f66ad32b311da',
  'the saved room-login reference changed; recapture and re-audit before accepting it'
);

assert.match(reference, /input\[_ngcontent[^}]+\]\{color:#28a1b5\}/);
assert.match(reference, /body\{box-sizing:border-box;font-weight:300;font-family:var\(--app-font-family\)/);
assert.match(reference, /class="user-nick">@\[OWNER_NAME\]<\/div>/);
assert.match(reference, /id="login-email"[^>]+disabled=""/);
assert.match(reference, /id="gmail-avatar"[^>]+placeholder="user@example\.com"/);
assert.match(reference, /https:\/\/www\.gravatar\.com\/avatar\/\[GRAVATAR_MD5_A\]\?d=mm/);

assert.equal(emptyAvatar.byteLength, 1262);
assert.equal(
  createHash('sha256').update(emptyAvatar).digest('hex'),
  '10fc73b31e251de09ba5c87355909ffe3d7dff5e398992074494f8e74386c7c3'
);
assert.deepEqual(inspectJpeg(emptyAvatar), { precision: 8, width: 80, height: 80 });
assert.match(visualEvidence, /avatar\/\[EMPTY_AVATAR_SOURCE_MD5\]\?d=mm/);
assert.match(visualEvidence, /distinct from[\s\S]{0,100}\[GRAVATAR_MD5_A\]/);

assert.match(server, /const accountIdentity = locals\.user[\s\S]*?displayName[\s\S]*?email/);
assert.match(server, /const identity = accountIdentity \?\? cookieIdentity/);
assert.match(server, /form\.get\('email'\) \?\? locals\.user\?\.email \?\? storedIdentity\?\.email/);
assert.match(server, /gravatar: gravatar\(identity\.email\)/);

const nameInput = component.match(/<input\s+id="login-nickname-new"[\s\S]*?\/>/)?.[0];
assert.ok(nameInput, 'the name field must exist');
assert.match(nameInput, /bind:value=\{name\}/);
assert.match(nameInput, /readonly=\{nameLocked\}/);
assert.doesNotMatch(nameInput, /\brequired\b/);

const emailInput = component.match(/<input\s+id="login-email"[\s\S]*?\/>/)?.[0];
assert.ok(emailInput, 'the email field must exist');
assert.match(component, /let email = \$derived\(known\?\.email \?\? ''\)/);
assert.match(emailInput, /bind:value=\{email\}/);
assert.doesNotMatch(emailInput, /\svalue=/);
assert.match(emailInput, /disabled=\{!!known\}/);
assert.match(component, /src=\{uploadedAvatar \?\? known\?\.gravatar/);
assert.match(component, /class="auth-nick">@\{known\.name\}<\/div>/);
/*
  NO LEADING SLASH — the same SvelteKit 3 `asset()` migration that had stale expectations in
  verify-home-contract.mjs. All 6 `asset()` call sites in `src` are written without one.
*/
assert.match(component, /const EMPTY_AVATAR = asset\('default-avatar\.jpg'\)/);
assert.match(component, /src=\{uploadedAvatar \?\? known\?\.gravatar \?\? EMPTY_AVATAR\}/);
assert.match(component, /onerror=\{useEmptyAvatar\}/);
assert.match(component, /placeholder: 'user@example\.com'/);

assert.match(css, /--auth-font:\s*Arial, Helvetica, sans-serif/);
assert.match(css, /--auth-ink:\s*rgb\(34, 34, 34\)/);
assert.match(css, /--auth-value:\s*rgb\(40, 161, 181\)/);
assert.match(
  css,
  /\.auth-wrapper,\s*\.auth-wrapper \*,\s*\.auth-wrapper \*::before,\s*\.auth-wrapper \*::after\s*\{\s*box-sizing:\s*border-box;/
);
assert.match(css, /\.auth-card\s*\{[\s\S]*?padding:\s*15px 25px;/);
assert.match(css, /\.auth-title,\s*\.auth-sub,\s*\.auth-card\s*\{[\s\S]*?max-width:\s*360px;/);
assert.match(
  css,
  /\.auth-nick\s*\{[\s\S]*?font-size:\s*15px;[\s\S]*?font-weight:\s*300;[\s\S]*?line-height:\s*1\.5;[\s\S]*?font-style:\s*italic;[\s\S]*?color:\s*var\(--auth-ink\);[\s\S]*?-webkit-text-fill-color:\s*var\(--auth-ink\);[\s\S]*?opacity:\s*1;/
);
assert.match(
  css,
  /\.auth-input-group input\s*\{[\s\S]*?font-size:\s*16px;[\s\S]*?font-weight:\s*400;[\s\S]*?font-style:\s*normal;[\s\S]*?line-height:\s*24px;[\s\S]*?color:\s*var\(--auth-value\);[\s\S]*?-webkit-text-fill-color:\s*var\(--auth-value\);[\s\S]*?opacity:\s*1;/
);
assert.match(
  css,
  /\.auth-input-group input:disabled\s*\{[\s\S]*?background:\s*rgb\(233, 236, 239\);[\s\S]*?color:\s*var\(--auth-value\);[\s\S]*?-webkit-text-fill-color:\s*var\(--auth-value\);[\s\S]*?opacity:\s*1;/
);

console.log('Authenticated room-login identity and typography contract verified');
