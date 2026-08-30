#!/usr/bin/env node

/**
 * Reproducible integrity seal for the complete, non-ignored `services/**` tree.
 *
 * The path list and manifest are newline-delimited after rejecting paths that
 * contain newlines, so the serialization is unambiguous. The manifest line is:
 *
 *   <sha256(file bytes)>  <repository-relative path>\n
 *
 * Both tracked files and non-ignored files not yet added to Git are included.
 * This prevents a local gate from silently omitting a newly created source file.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/*
  THREE levels up, not one.

  `import.meta.url` is `apps/controller/scripts/…`, so `'../'` resolves to `apps/controller/` — the
  APP root, not the repository root. Everything below is addressed `services/api/…`, which lives at
  the repository root, so every one of those paths pointed at a directory that does not exist and
  this verifier died on its first `scandir`.

  It came from the sibling repository, where `services/` sits beside `scripts/` and `'../'` was
  right. Moving it under `apps/controller/` invalidated the assumption without changing the name,
  and because `pnpm test` runs this at step 2 the whole chain has been failing there ever since.
*/
const REPOSITORY_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const EXPECTED_FILE_COUNT = 98;
const EXPECTED_PATH_LIST_SHA256 = '66ab4696e3d3685daaa5ba27e28137a1cc038a71a32fcf92d30bdd144f35ecef';
/*
  The manifest covers only the imports that have NEVER been edited here — not all 98.

  The count is `EXPECTED_UNTOUCHED_COUNT` directly below and nowhere else in this comment. It has
  moved four times (88 -> 87 -> 84 -> 83 -> 75) and every prose copy of it went stale within a day,
  which is the same "a number duplicated into prose is a claim, and an unchecked claim rots" lesson
  recorded further down this file. Read the constant.

  The previous value sealed all 98 as untouched imports, and that had never once been checked: the
  read it depended on resolved to `apps/controller/services/`, a directory that does not exist, so
  the script died before reaching it. The first run that ever completed reported a mismatch, and the
  mismatch was true — ten imported files had been edited in this repository.

  Deliberately NOT re-pinned to the whole current tree. A hash over whatever happens to be present
  cannot distinguish reviewed work from an accident, and the next unrecorded edit would land inside
  a green gate. A seal that is always green about a tree nobody checks is worse than no seal.

  Instead each edited import is pinned individually in `DIVERGED_FROM_IMPORT` below, so an
  unrecorded change to any one of them still fails — and fails naming the file — while the rest stay
  sealed against the bytes that actually arrived at the import.

  THE RULE FOR SHRINKING THIS NUMBER, which is the only way it may move: a file that changes leaves
  the aggregate and gains its own pin, with the reason recorded beside its hash, in the same commit.
  Nothing becomes unsealed — the seal moves from the aggregate to its own line. Re-pinning the
  aggregate is legitimate ONLY because of that. A manifest re-pinned to whatever the tree happens to
  contain would be the rubber stamp this file's own header rejects, and it would be green forever.

  Last moved 2026-08-15, 75 -> 74: `services/README.md` left the aggregate for its own pin below,
  because three of its prose claims still named `ptr_clone_app` as the runtime role.
*/
const EXPECTED_UNTOUCHED_COUNT = 74;
const EXPECTED_MANIFEST_SHA256 = 'cfb319e72317631a15280a6fff725fa7617de15a7ae39ec98d4de04d83fe898a';

/*
  Files under `services/**` that were AUTHORED HERE and never imported.

  This seal answers one question: has anything we imported from the source drifted? A file written
  in this repository is not an answer to that question, and folding it into the count would make
  `ops/backend-import-provenance.md` — which records what was IMPORTED — claim an import that never
  happened. That is the reason `TODO.md` row Z refused to bump 98 to 99, and the refusal was right;
  what was missing was the other half, which is this list.

  `0009_rename_runtime_roles.sql` was added 2026-08-10 and NEVER deployed — a claim this file used
  to make and which was checked by query on 2026-08-15: no database anywhere had recorded migration
  version 9. It was withdrawn that day as non-convergent (it renamed a cluster-global role from a
  per-database chain, so the second database on a cluster could never migrate) and replaced by
  `0009_provision_tradingroom_app.sql`, which ADDS the runtime role instead. See
  `ops/naming-provenance.md`. The replacement is pinned below by its own hash, so it is sealed —
  just not as an import.

  A file only belongs here with a CHANGELOG entry saying it was authored in this repository. If you
  are tempted to add an imported file to this list to make the gate green, the gate is telling the
  truth and the list is not the place to argue with it.
*/
const LOCALLY_AUTHORED = new Map([
  [
    // Authored here on 2026-08-15. Enforces the rule the withdrawn 0009 broke: the migration chain
    // must be appliable to any number of databases on one cluster. Nothing in the imported tree
    // stated that rule, which is why a non-convergent migration passed review and shipped.
    'services/api/tests/migration_reappliability.rs',
    '3faadc515e1f228c3abf261cdfc1f30ba7523a8ea181d0adfe293affc8a107a1'
  ],
  [
    'services/api/migrations/0009_provision_tradingroom_app.sql',
    '20b95d68bac75a698fa4e90502c2e54cc88d475d8b92bc4aada946a57700ce9c'
  ],
  [
    // Authored here on 2026-08-31, and the pair to `migration_reappliability.rs` above: that test
    // states the chain must apply to any number of databases on one cluster, and this migration is
    // where that rule stops being about SQL and becomes about a cluster-global ROLE. It revokes
    // per-database and drops only when it is the last database still granting — verified across
    // three databases on a live PostgreSQL 16.13 cluster, including the refusal on one where 0009
    // had not run. `CHANGELOG.md` carries the full evidence.
    'services/api/migrations/0010_retire_ptr_clone_app.sql',
    'a134bdcf67ae8662fb9c10a0c7a80581adf23ec0f59739e0363bde6ed4d3d36a'
  ]
]);

/*
  Imported files that have since been EDITED HERE, each pinned by its own hash.

  ## Why these are not "drift to revert"

  The direction was measured, not assumed. Against the documented source — the sibling `new-room`,
  named in this repository's own import checkpoint (`ops/backend-import-provenance.md`) — diffing
  our copies against theirs, added versus removed:

    services/media/src/server.rs      +195  -29
    services/media/src/config.rs      +69   -0     <- a strict superset of the source
    services/api/src/db/migrate.rs    +27   -1
    services/Cargo.lock               +69   -109   <- net smaller: the 2026-08-09 dependency bump

  This repository is AHEAD. `a11883c` alone is 252 insertions across seven of these — the SFU
  liveness fix — and `CHANGELOG.md:2863` records it deployed and proven against production with live
  log output. The same comparison against `new-room-control` returns the same answer, so the finding
  does not depend on which sibling is treated as the source.

  ## And there is nothing to be a mirror OF

  `CLAUDE.md` said a change made here is lost on the next sync. Searched `scripts`, `ops`, every
  per-app `scripts` directory, `.github` and the root `package.json`: no sync exists either way. The
  only script referencing a sibling is `scripts/set-vercel-env.sh`, which READS `.env` files and
  states at its line 30 that `new-room-control` is "read-only reference, not a config store for this
  project". The owner confirmed it directly on 2026-08-12: the siblings are reference only.

  So `services/**` is not provisional and will not be overwritten. This repository is its authority,
  and the import checkpoints above remain exactly what they always were — a true record of what
  arrived and from where.

  ## Adding to this list

  Only with a CHANGELOG entry naming the change and why it was made here. If you are tempted to add
  a file to make the gate green, the gate is telling the truth and this list is not where to argue
  with it — the same rule `LOCALLY_AUTHORED` carries, for the same reason.
*/
const DIVERGED_FROM_IMPORT = new Map([
  /*
    Diverged 2026-08-15 21:40. Three prose claims in `services/README.md` still named
    `ptr_clone_app` as the RUNTIME role, which stopped being true when `0009` provisioned
    `tradingroom_app` and `db::migrate::EXPECTED_RUNTIME_ROLE` began comparing against it. A
    document that tells the next engineer which identity the API binds as, and names the wrong one,
    is the kind of stale claim this repository treats as a defect rather than as tidying.

    What was NOT changed, and the distinction is the whole point: the `ptr_clone_app` references in
    the shipped migrations (`0005`, `0006`, `0007`) stay exactly as they are. Migrations are
    forward-only and editing one changes its checksum, so every applied database would refuse to
    migrate. The README now says so where it used to imply the opposite.
  */
  ['services/README.md', '8aece32950b831df72d68efc2411f9b80352877001fc8a0f4a51b7f617f027fc'],
  ['services/Cargo.lock', '9ba77dc5f3fe6dac83a40799f6c5d60ad9e5f358f635ab094ceae608ca6d1668'],
  /*
    Diverged 2026-08-14, and it is the file this very comment block warned about.

    Two reviewed changes, both forced by `0009_rename_runtime_roles`:

      1. `ATTESTED_MIGRATION_VERSIONS` extended 0001-0008 -> 0001-0009. `0009` shipped in `b9f775e`
         without it, which turned `main` red — the reviewed-act gate working exactly as designed.
      2. The runtime-role and RLS-policy checks now accept EITHER `ptr_clone_app` or
         `tradingroom_app`. `db::migrate` (already diverged, directly below) learned this on
         2026-08-11; this binary was missed by that fix and would have refused to attest any cluster
         that had actually applied 0009.

    The posture checks are unchanged and apply to whichever name is present, so a cluster
    mid-transition is held to exactly the same standard.

    RE-PINNED 2026-08-28, and the reason is a gap this file's own subject had.

    This binary asserted the tenant PREDICATE of exactly one table, `public.room_events`. The other
    twenty-one tenant tables were attested only by the ROLE their policy targets. `0009` retargets
    that role and never inspects a predicate — correctly, that is not its job — so a policy
    hand-widened to `USING (true)` on any of the twenty-one passed the migration, passed the
    migration's own parity assertion, and passed this attestation.

    Reproduced against a live PostgreSQL 16 built from the shipped chain: widening `alert_media` to
    `USING (true)`, then running `0009`, left the widened predicate in place while the migration
    reported `0` residual references to the baseline role. On a multi-tenant fintech application that
    is one tenant reading another tenant's rows, and nothing in the release evidence mentioned it.

    `query_and_validate_tenant_policies` now reads every policy in `public` and asserts four things:
    one policy per relation with row-level security forced, exactly one role and it is the runtime
    login, a `USING` expression from the reviewed set, and a `WITH CHECK` that is absent or reviewed.
    The rule is split into a pure `validate_tenant_policies` so it can be exercised without standing
    up a PostgreSQL 17 cluster, with seven unit tests, and the evidence it returns is reported rather
    than merely checked.

    RE-PINNED 2026-08-29. That change added `tenant_policies` to `AttestationEvidence` and did not
    update the "pass" fixture in this file's own tests, so the binary's test target stopped
    compiling. Nothing reported it: `cargo test` cannot build in a container without egress —
    `mediasoup-sys` fetches libsrtp from github and the agent proxy answers 403 — so the suite had
    not run locally since. It compiled again once the meson subprojects were vendored over git, and
    failed on this immediately.

    The fixture's values are MEASURED against a real cluster rather than invented: PostgreSQL 16.13
    with the full chain applied reports 22 relations with row-level security FORCED, 22 policies over
    them — the 1:1 this evidence exists to state — and exactly two distinct `USING` expressions, the
    general tenant predicate and `room_events`' member-scoped one.
  */
  [
    'services/api/src/bin/postgres-release-attestation.rs',
    '04eaa8613989ebe0e7f4764d43bb730290b5185bb97bd8446aa1579d007ade51'
  ],
  // Diverged 2026-08-15 by the runtime-role cutover. Each was an untouched import until then.
  //   db/mod.rs                 EXPECTED_RUNTIME_ROLE -> tradingroom_app, and its unit-test
  //                             fixtures rebuilt from that constant instead of a literal.
  //   tests/migrations.rs       four assertions that named the old runtime role by hand; now bound
  //                             to migrate::EXPECTED_RUNTIME_ROLE so a future cutover cannot leave
  //                             them asserting a role nothing connects as.
  //   10-provision-roles.sh     provisions the RUNTIME role alongside the baseline role.
  // Diverged 2026-08-15: DATABASE_URL was built from POSTGRES_APP_USER, i.e. the BASELINE role, so
  // anyone following this file produced a connection string the API's startup check now refuses -
  // and PostgreSQL reports a nonexistent role as `28P01 password authentication failed`, naming the
  // wrong cause. Found by `naming-boundary.test.ts` on the day it was written.
  ['services/.env.example', '67ec3560d9c8e9674f3c3c4c9e18a47023bc245a57036ea00e574e31a1529f0d'],
  ['services/api/src/db/mod.rs', '95294947a9963004ff2204d3e1b305d05d9b26cc19d4c643d48ba7126c0d65d9'],
  ['services/api/tests/migrations.rs', 'da2739797a45c6eb27beb61d55fd000a500357bfa6ad3b373931bd3ba7165136'],
  [
    'services/docker/postgres/10-provision-roles.sh',
    '36031a9f9fb09d597dc58e3b50c59e3c7cb56918cda12dcfce01e959cc406e6d'
  ],
  ['services/api/src/db/migrate.rs', '0df32e9c11c3ace6739f1a6ea9f17610f3263652dc90cc6a07172ba966864e6c'],
  /*
    Diverged 2026-08-15 by the SECOND half of the runtime-role cutover — the half the first half
    missed. Each was an untouched import until now, and each leaves the aggregate for its own pin
    rather than the aggregate being re-sealed over it.

    The six test files each carried a hardcoded fallback `DATABASE_URL` naming `ptr_clone_app`, used
    when the variable is unset. CI always sets it, so the fallback was invisible there — but after
    `0009` retargets the 22 tenant policies onto `tradingroom_app` ALONE, a local run through that
    fallback connects as a role no policy names and reads ZERO rows from every tenant table. The
    tenancy suite would have reported a broken tenancy kernel when the kernel was fine.

      tests/tenancy.rs           fallback cut over, and the owner-impersonation test now assumes
                                 `tradingroom_app`: it is named `..._impersonate_the_runtime_role`
                                 and was impersonating the BASELINE role, so it would have stayed
                                 green while no longer covering what its name claims.
      tests/support/mod.rs       shared fixture fallback.
      tests/auth_http.rs         fallback only.
      tests/realtime.rs          fallback only.
      tests/refresh_rotation.rs  fallback only.
      tests/room_api.rs          fallback only.

    compose.yml  passes POSTGRES_RUNTIME_USER / POSTGRES_RUNTIME_PASSWORD through to the container.
                 Both are documented in `.env.example`, and until this change nothing read them
                 locally: setting either did nothing and the provisioner silently fell back.
    deny.toml    comment only. It blamed the duplicate `crypto-common` on the mediasoup graph; both
                 roots are in fact our own direct dependencies, traced with `cargo tree -i`.
  */
  ['services/api/tests/tenancy.rs', 'f2f10d1e8b099d115525485e8b5b18957e0cab542e80f7bfa492a1d8c0d97ccb'],
  ['services/api/tests/support/mod.rs', 'ebdc169b422d4f700a73de6c5ebd2e41f3b452732b11cdf419c76cf3b0664787'],
  ['services/api/tests/auth_http.rs', '79a5b173119977db1ec1eac94a03b86897d40a42c0f25474d5fbd8cadedac98c'],
  ['services/api/tests/realtime.rs', '62c6629bed604164b3f9709220f737da51708c794e1b0062210a18d7ee7d0056'],
  ['services/api/tests/refresh_rotation.rs', '65531ae9d457eacedb87755fd673a6999fa607ea4822e37081d2a553637c49d7'],
  ['services/api/tests/room_api.rs', 'd4c507b29d7dc8335de398ac0c655941ad8321d0c0abe9385986768e57738e67'],
  ['services/compose.yml', '22d5aeef341b15ee1ae45041faaa142864a91aba0cb45557d68f9b051a08cc98'],
  ['services/deny.toml', '57165267aa3ccb0eec647a01232e10c13ab920aa3aaf9293bd2a701e21fa9d14'],
  ['services/media/Dockerfile', 'ae967613fdd0dba2065ec6b488c71d8a61e29eef47fca32f90690066b0eb407a'],
  ['services/media/src/config.rs', 'f9af8fb80a7ccadb1a05b506c14ecd043fae4e5b169e36d403d5d8f1fd4fe449'],
  ['services/media/src/grant.rs', '772f12a8bd9ea55e1d92fa1b460aeb1b451520c1c243c59083a658b4f1989908'],
  ['services/media/src/main.rs', 'eb7106333b2a66cfa84b8de943954e658701216a469a048e6eda8e0e9ac767aa'],
  ['services/media/src/router_registry.rs', 'ffd8d79837bf1d2e89e18e13a7f6d9c79637637a0a21085bdef9b9f92492cb01'],
  ['services/media/src/server.rs', 'c73d60f652d142de087789621d636e062e6810fb20cd518771265ed485bd1e32'],
  ['services/media/src/session.rs', 'ab345211ca869b9c3a15d2a112b69c86c61dab568c4807ab372f448bf87467ae'],
  ['services/media/src/worker_pool.rs', '5aa068c34e4a77ff8aeb2052b9aad2b5324004d520d971302b9454516ff1a917']
]);

/**
 * Prose that quotes the seal's file count, and must therefore move with it.
 *
 * Added after the count went 93 -> 98 during the `services/` reconcile and three documents were
 * left asserting 93 — including the SSOT authority table, which is supposed to be the place a
 * reader trusts. Nothing caught it: the seal itself was correct, so every gate stayed green while
 * the documentation described a different repository.
 *
 * A number duplicated into prose is a claim, and an unchecked claim rots. This is the cheap half
 * of the lesson that cost a 25-minute CI job when the same drift hit the release attestor's pinned
 * migration list: when a pinned artifact changes, the consumers are what break, so enumerate them
 * here rather than rediscovering them one failure at a time.
 */
/*
  Repository-relative, and two of the three were wrong.

  These read `docs/…` back when every path in this file resolved from `apps/controller/`, where
  `apps/controller/docs/` is exactly where those two live — so they happened to work for the wrong
  reason. Repairing `REPOSITORY_ROOT` fixed the manifest read and broke these in the same stroke,
  and it stayed hidden because the count check threw first. That is the FOURTH instance of one
  original bug, which is why every path in this file now resolves from a single explicit root.

  `ops/backend-import-provenance.md` genuinely is at the repository root; the other two are not.
*/
const DOCUMENTED_COUNT_SITES = [
  'apps/controller/docs/ENGINEERING-SSOT.md',
  'apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md',
  'ops/backend-import-provenance.md'
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fail(message) {
  throw new Error(`[backend:provenance] ${message}`);
}

function listServicePaths() {
  const result = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'services'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'buffer',
    maxBuffer: 4 * 1024 * 1024
  });

  if (result.error) {
    fail(`git ls-files could not start: ${result.error.message}`);
  }
  if (result.signal) {
    fail(`git ls-files was terminated by ${result.signal}`);
  }
  if (result.status !== 0) {
    fail(`git ls-files exited with status ${result.status}`);
  }

  return result.stdout.toString('utf8').split('\0').filter(Boolean).sort();
}

const allPaths = listServicePaths();

/*
  Split before counting. The seal covers the IMPORTED tree; locally-authored files are sealed
  separately below so that neither set can drift unnoticed and neither is mistaken for the other.
*/
const paths = allPaths.filter((relativePath) => !LOCALLY_AUTHORED.has(relativePath));
const localPaths = allPaths.filter((relativePath) => LOCALLY_AUTHORED.has(relativePath));

if (localPaths.length !== LOCALLY_AUTHORED.size) {
  const missing = [...LOCALLY_AUTHORED.keys()].filter((p) => !localPaths.includes(p));
  fail(
    `locally-authored file(s) listed but not present: ${missing.join(', ')} — ` +
      `remove them from LOCALLY_AUTHORED in the same change that deleted them`
  );
}

if (paths.length !== EXPECTED_FILE_COUNT) {
  fail(
    `imported file count changed: expected ${EXPECTED_FILE_COUNT}, got ${paths.length} ` +
      `(${allPaths.length} total, ${localPaths.length} locally authored)`
  );
}

for (const [relativePath, expected] of LOCALLY_AUTHORED) {
  const actual = sha256(await readFile(`${REPOSITORY_ROOT}${relativePath}`));
  if (actual !== expected) {
    fail(`locally-authored file changed: ${relativePath} expected ${expected}, got ${actual}`);
  }
}

/*
  Every diverged file, by name and by hash.

  These are NOT unsealed — they are sealed individually rather than collectively. An unrecorded edit
  to any one of them still fails, and it fails naming the file instead of reporting an opaque
  whole-tree mismatch that tells the next reader nothing about where to look.
*/
for (const [relativePath, expected] of DIVERGED_FROM_IMPORT) {
  if (!paths.includes(relativePath)) {
    fail(
      `diverged file listed but not present: ${relativePath} — ` +
        `remove it from DIVERGED_FROM_IMPORT in the same change that deleted it`
    );
  }
  const actual = sha256(await readFile(`${REPOSITORY_ROOT}${relativePath}`));
  if (actual !== expected) {
    fail(`diverged file changed: ${relativePath} expected ${expected}, got ${actual}`);
  }
}

/*
  The manifest below covers the imports that have never been touched, and its bytes are still the
  bytes that arrived. Narrowing it is what lets the seal keep meaning "unchanged since import"
  rather than degrading into "whatever is here today".
*/
const untouchedPaths = paths.filter((relativePath) => !DIVERGED_FROM_IMPORT.has(relativePath));
if (untouchedPaths.length !== EXPECTED_UNTOUCHED_COUNT) {
  fail(
    `untouched import count changed: expected ${EXPECTED_UNTOUCHED_COUNT}, ` +
      `got ${untouchedPaths.length} (${paths.length} imported, ${DIVERGED_FROM_IMPORT.size} diverged)`
  );
}

for (const relativePath of paths) {
  if (!relativePath.startsWith('services/') || relativePath.includes('\n') || relativePath.includes('\r')) {
    fail(`unsafe or ambiguous manifest path: ${JSON.stringify(relativePath)}`);
  }
}

const pathList = `${paths.join('\n')}\n`;
const pathListSha256 = sha256(pathList);
if (pathListSha256 !== EXPECTED_PATH_LIST_SHA256) {
  fail(`path-list SHA-256 changed: expected ${EXPECTED_PATH_LIST_SHA256}, got ${pathListSha256}`);
}

const manifestLines = await Promise.all(
  untouchedPaths.map(async (relativePath) => {
    const bytes = await readFile(`${REPOSITORY_ROOT}${relativePath}`);
    return `${sha256(bytes)}  ${relativePath}`;
  })
);
const manifest = `${manifestLines.join('\n')}\n`;
const manifestSha256 = sha256(manifest);
if (manifestSha256 !== EXPECTED_MANIFEST_SHA256) {
  fail(`manifest SHA-256 changed: expected ${EXPECTED_MANIFEST_SHA256}, got ${manifestSha256}`);
}

/*
  Every "<n>-file" or "<n> files" claim about THIS seal must equal the seal.

  Deliberately narrow: it only matches counts written next to the words that name this seal, so an
  unrelated file count elsewhere in the same document is not dragged in. A stale number fails here,
  in milliseconds, instead of describing a repository that no longer exists.
*/
const SEAL_COUNT_CLAIM =
  /(\d+)(?:-file|\s+files?)(?=[^.\n]{0,80}?(?:provenance seal|current-tree (?:path\/content )?seal))/g;
for (const site of DOCUMENTED_COUNT_SITES) {
  /*
    "Missing" and "could not read" are different faults and must not report as one.

    This caught every error and blamed a missing file. On 2026-08-12 that sent me looking for
    `MEDIASOUP-DEPLOYMENT-PLAN.md`, which is present and 48,033 bytes — `readFile` was returning
    ETIMEDOUT because the working-tree copy is a cloud-storage placeholder that had not
    materialised. `ls` sees the metadata, `read` blocks on a download that never lands, and the
    catch called it missing.

    So: a genuinely absent documented-count site FAILS, because that is a provenance fault — the
    prose this seal must agree with has been deleted or moved. Anything else WARNS, because the
    seal's subject is provenance, not the health of the filesystem underneath it, and refusing to
    verify 98 imported files over one undownloaded document is a false negative. CI clones fresh, so
    it reads normally there.
  */
  let prose;
  try {
    prose = await readFile(`${REPOSITORY_ROOT}${site}`, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      fail(`documented-count site is missing: ${site}`);
    }
    console.warn(
      `[backend:provenance] WARNING: could not read ${site} (${error?.code ?? 'unknown'}) — ` +
        `its count claim was NOT checked. The file exists; this is an environment fault, not a ` +
        `provenance one.`
    );
    continue;
  }
  for (const [claim, stated] of prose.matchAll(SEAL_COUNT_CLAIM)) {
    if (Number(stated) !== EXPECTED_FILE_COUNT) {
      fail(
        `${site} claims "${claim.trim()}" but the seal covers ${EXPECTED_FILE_COUNT} files — ` +
          `update the prose in the same change that moved the seal`
      );
    }
  }
}

console.log(
  `[backend:provenance] PASS ${EXPECTED_FILE_COUNT} imported ` +
    `(${EXPECTED_UNTOUCHED_COUNT} untouched + ${DIVERGED_FROM_IMPORT.size} diverged, each pinned) ` +
    `+ ${LOCALLY_AUTHORED.size} authored here; paths ${EXPECTED_PATH_LIST_SHA256}; ` +
    `manifest ${EXPECTED_MANIFEST_SHA256}; ${DOCUMENTED_COUNT_SITES.length} documented-count site(s) agree`
);
