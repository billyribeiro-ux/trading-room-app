import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';

const evidenceRoot = new URL('../evidence-dumps/', import.meta.url);
const expectedDirectories = [
  'COPY',
  'NEXT-STEP',
  /*
    Added 2026-08-13. Static artifacts fetched read-only over HTTPS from protradingroom.com —
    `app.min.js`, `vendor.min.js`, the raw `styles.css`, the public-site stylesheets, the Font
    Awesome webfont, the API markdown, and the eight AngularJS `templateUrl` partials under
    `views/`.

    It is a capture set like the others and belongs under the same seal, which is why it is listed
    here rather than excluded: this assertion is what stops an undocumented directory appearing in
    the evidence tree, and silencing it for a directory I had just added would defeat the point.

    Its own `README.md` carries byte counts and SHA-256 prefixes per file, and names the three
    targets that came back as SOFT 404s — this server answers missing files with HTTP **200** and a
    52-byte "this is not the page you are looking for" body, so absence there is recorded rather
    than inferred.
  */
  'TIER1-fetched',
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
