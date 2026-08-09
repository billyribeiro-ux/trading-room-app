import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

const evidenceRoot = new URL('../evidence-dumps/', import.meta.url);
const expectedDirectories = [
  'COPY',
  'NEXT-STEP',
  'account-page',
  'home-page',
  'login-page',
  'main-nav-login-clicked',
  'register-page',
  'room-login'
];

const entries = await readdir(evidenceRoot, { withFileTypes: true });
const repositoryEntries = entries.filter(({ name }) => name !== '.DS_Store');
assert.deepEqual(
  repositoryEntries.map(({ name }) => name).sort(),
  [...expectedDirectories, 'README.md'].sort(),
  'evidence-dumps must contain only the documented evidence sets and its index'
);

for (const directory of expectedDirectories) {
  const entry = repositoryEntries.find(({ name }) => name === directory);
  assert.ok(entry?.isDirectory(), `evidence-dumps/${directory} must be a directory`);

  await assert.rejects(
    stat(new URL(`../${directory}`, import.meta.url)),
    { code: 'ENOENT' },
    `${directory} must not reappear at the repository root`
  );
}

const requiredArtifacts = [
  'COPY/login-page-source',
  'account-page/upload-image-badge-prompt.html',
  'home-page/file',
  'login-page/logged-in-page',
  'login-page/manage',
  'register-page/register-page-file',
  'room-login/room-login-file'
];

for (const artifact of requiredArtifacts) {
  assert.ok((await stat(new URL(artifact, evidenceRoot))).isFile(), `${artifact} must remain a file`);
}

const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
assert.match(
  gitignore,
  /^evidence-dumps\/NEXT-STEP\/\*\.json$/m,
  'sensitive original NEXT-STEP JSON captures must stay gitignored'
);

console.log('Evidence archive layout verified');
