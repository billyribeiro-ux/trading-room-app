import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const fontPath = new URL('static/fonts/roboto/roboto-v51-latin-300.woff2', root);

const [
  font,
  publicCss,
  authCss,
  homePage,
  layout,
  roomLoginEvidence,
  license,
  contract,
  packageJson,
  pnpmWorkspace,
  pnpmLock
] = await Promise.all([
  readFile(fontPath),
  readFile(new URL('src/public.css', root), 'utf8'),
  readFile(new URL('src/auth.css', root), 'utf8'),
  readFile(new URL('src/routes/(public)/+page.svelte', root), 'utf8'),
  readFile(new URL('src/routes/+layout.svelte', root), 'utf8'),
  readFile(new URL('evidence-dumps/room-login/room-login-file', root), 'utf8'),
  readFile(new URL('static/fonts/roboto/OFL.txt', root), 'utf8'),
  readFile(new URL('docs/reference/font-contract.md', root), 'utf8'),
  readFile(new URL('package.json', root), 'utf8').then(JSON.parse),
  readFile(new URL('pnpm-workspace.yaml', root), 'utf8'),
  readFile(new URL('pnpm-lock.yaml', root), 'utf8')
]);

assert.equal(
  createHash('sha256').update(font).digest('hex'),
  '0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a',
  'the exact Google-served Roboto v51 Latin normal-300 binary changed'
);
assert.match(
  publicCss,
  /@font-face\s*\{[\s\S]*?font-family:\s*'Roboto';[\s\S]*?font-style:\s*normal;[\s\S]*?font-weight:\s*300;[\s\S]*?font-display:\s*auto;[\s\S]*?url\('\/fonts\/roboto\/roboto-v51-latin-300\.woff2'\) format\('woff2'\);[\s\S]*?\}/
);
assert.match(publicCss, /#hero h1\.hero-text\s*\{[\s\S]*?font-family:\s*'Roboto';[\s\S]*?font-weight:\s*300;/);
assert.match(homePage, /import \{ asset \} from '\$app\/paths'/);
assert.match(homePage, /asset\('\/fonts\/roboto\/roboto-v51-latin-300\.woff2'\)/);
assert.match(
  homePage,
  /rel="preload"[\s\S]*?href=\{heroFontUrl\}[\s\S]*?as="font"[\s\S]*?type="font\/woff2"[\s\S]*?crossorigin="anonymous"/
);
assert.doesNotMatch(homePage, /fonts\.(?:googleapis|gstatic)\.com/);

assert.match(
  roomLoginEvidence,
  /\.btn-login\[[^}]*?\{[^}]*?font-weight:700(?:;|})/,
  'the captured room-login .btn-login weight-700 declaration changed'
);
assert.match(
  authCss,
  /\.auth-submit\s*\{[^}]*?font-weight:\s*700;/,
  'the rebuilt room-login submit button must preserve the captured weight 700'
);

assert.equal(packageJson.packageManager, 'pnpm@11.18.0');
assert.equal(packageJson.dependencies['font-awesome'], '4.3.0');
assert.equal(packageJson.dependencies['@fortawesome/fontawesome-free'], '5.8.1');
assert.equal(packageJson.dependencies['@fontsource/roboto'], undefined);
assert.equal(packageJson.dependencies['@fontsource-variable/roboto'], undefined);
assert.match(pnpmWorkspace, /packages:\s*\n\s*- \./);
// better-sqlite3 is pinned to `false` on purpose — see the comment in pnpm-workspace.yaml.
// Asserting it stays declined stops the retired SQLite driver being silently rebuilt.
assert.match(pnpmWorkspace, /allowBuilds:[\s\S]*?better-sqlite3:\s*false[\s\S]*?esbuild:\s*true/);
assert.match(pnpmLock, /lockfileVersion:/);
await assert.rejects(access(new URL('package-lock.json', root)), /ENOENT/);

const fa5Import = layout.indexOf("import '@fortawesome/fontawesome-free/css/all.min.css';");
const fa4Import = layout.indexOf("import 'font-awesome/css/font-awesome.min.css';");
assert.ok(fa5Import >= 0 && fa4Import > fa5Import, 'FA5 must load before the intentional FA4 override');
assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
assert.match(contract, /0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a/);
assert.match(contract, /Room entry\/login[^\n]*captured `300\/400\/500\/700` usage/);

console.log(
  'Font contract verified: exact Roboto v51/300 binary, room-login weight 700, licensed local delivery, pnpm SSOT, and pinned FA4/FA5 assets'
);
