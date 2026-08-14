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
  'room-login',
  /*
    Added 2026-08-14, from one browser session against the live site. Five FILES rather than
    directories, listed here for the same reason the fetched set above is: this assertion exists to
    stop an undocumented artefact appearing in the evidence tree, and excluding the ones I had just
    produced would defeat it.

    `stripe-details-2026-08-14.json` — `openStripeDetails` and `doBatchInvite` read off the live
    AngularJS scope, closing T5-15 and T5-21. Contains function SOURCE and no customer data: the
    room had no marketplace member on screen, so `stripeBlock` and `modal` are both null, and a
    scan for emails, Stripe ids and long digit runs comes back empty.

    `rendered-states-2026-08-14.json` — the manage page's striped table and 15/15 bootbox handler
    sources (T2-7, T2-20). `rendered-states-welcome-2026-08-14.json` — the welcome page, whose
    "login form" turned out to be the Add Admin User form; kept because its computed styles are
    real evidence for that form. `rendered-states-login-2026-08-14.json` — the genuine logged-out
    login form and its geometry (T2-22).

    `static-asset-manifest-2026-08-14.json` — METADATA ONLY, 7.7 KB standing in for a 4.2 MB
    capture that `.gitignore` excludes as `ptr-*.json`. url + bytes + contentType + sha256 for all
    22 targets, which identifies each byte-for-byte on any re-fetch without committing 1.28 MB of
    base64 for marketing screenshots that are explicitly out of scope.
  */
];

/**
 * Capture FILES, as opposed to the capture sets above.
 *
 * Split out rather than folded in, because the loop below asserts every listed name is a
 * directory — and loosening that to "directory or file" would let a set that was supposed to be a
 * tree pass as a stray json. Two lists, two assertions, and both still fail closed: an artefact
 * that is in neither list breaks the equality check above.
 */
const expectedFiles = [
  'README.md',
  'rendered-states-2026-08-14.json',
  'rendered-states-login-2026-08-14.json',
  'rendered-states-welcome-2026-08-14.json',
  'static-asset-manifest-2026-08-14.json',
  'stripe-details-2026-08-14.json'
];

const entries = await readdir(evidenceRoot, { withFileTypes: true });
const repositoryEntries = entries.filter(({ name }) => name !== '.DS_Store');
assert.deepEqual(
  repositoryEntries.map(({ name }) => name).sort(),
  [...expectedDirectories, ...expectedFiles].sort(),
  'evidence-dumps must contain only the documented evidence sets, capture files and its index'
);

for (const file of expectedFiles) {
  const entry = repositoryEntries.find(({ name }) => name === file);
  assert.ok(entry?.isFile(), `evidence-dumps/${file} must be a file`);
}

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
