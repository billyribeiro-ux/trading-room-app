import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/**
 * `ptr_clone*` is the REFERENCE name. `tradingroom*` is this system. This test keeps them apart.
 *
 * ## Why a test and not a note
 *
 * The two schemes coexist deliberately and permanently — `ops/naming-provenance.md` is the mapping —
 * so "just rename everything" is not available, and neither is "the old name is always a bug". A
 * rule that subtle, written only in prose, is a rule that decays: somebody copies a connection
 * string out of a capture, or types the name they saw in `0001`, and nothing objects.
 *
 * So the boundary is mechanical. A `ptr_clone*` literal is permitted in exactly three kinds of
 * place, and nowhere else:
 *
 *   1. CAPTURES — `second-dump/**`, `docs/source/**`, the dumps. Evidence. Never edited; several are
 *      SHA-256 pinned, and `CLAUDE.md` forbids reformatting them.
 *   2. BYTE-PINNED MIGRATIONS `0001`–`0007`. Applied history. `0001` in particular is byte-identical
 *      to the captured schema (`c8baed85…27d9`) — that identity is the proof the reconstruction is
 *      faithful, so editing it would destroy evidence, not tidy debt.
 *   3. PROSE that explains the mapping, and code that names the baseline role on purpose — the
 *      provisioner, the preflight fence, the retirement plan.
 *
 * ## The direction that matters
 *
 * The allow-list below MAY SHRINK and MUST NEVER GROW. Shrinking means transcription is progressing.
 * Growing means a live use of the reference name was admitted, which is the exact thing this file
 * exists to prevent — and it will be argued for, persuasively, by someone in a hurry.
 *
 * Deliberately NOT asserted: that no file contains the string at all. That would be a lie about a
 * repository whose whole method is reconstructing a captured system, and a test that demands a false
 * thing gets deleted rather than obeyed.
 */

const ROOT = `${process.cwd()}/../..`;

/**
 * Paths permitted to contain a `ptr_clone*` literal.
 *
 * Each entry is a prefix match against the repository-relative path. Add nothing here without a
 * CHANGELOG entry saying why a live use of the reference name is correct — and expect that to be
 * hard to write, because it usually is not.
 */
const ALLOWED_PREFIXES = Object.freeze([
  // 1. Captures and evidence. Never edited.
  'second-dump/',
  'docs/source/',
  'docs/decoded/',
  'apps/room/docs/',
  'apps/controller/docs/',
  'docs/reference/',
  'docs/decisions/',

  // 2. Byte-pinned migrations: applied history, and `0001` is the capture itself.
  'services/api/migrations/0001_',
  'services/api/migrations/0002_',
  'services/api/migrations/0003_',
  'services/api/migrations/0004_',
  'services/api/migrations/0005_',
  'services/api/migrations/0006_',
  'services/api/migrations/0007_',
  'services/api/migrations/0008_',

  // 3a. The mapping itself, and the records that explain it.
  'ops/',
  'CLAUDE.md',
  'TODO.md',
  'CHANGELOG.md',
  'apps/room/TODO.md',
  'apps/room/AGENTS.md',
  'apps/room/PROJECT_VISION.md',

  // 3b. Code that names the BASELINE role deliberately. `ptr_clone_app` is not the runtime identity
  // any more, but it is still the role `0001` creates and the provisioner must fence, and
  // `ptr_clone` is still the owner/migrator. These are correct uses, not drift.
  'services/api/src/db/migrate.rs',
  'services/api/src/db/mod.rs',
  'services/api/src/bin/migrate.rs',
  'services/api/src/bin/postgres-release-attestation.rs',
  'services/api/src/config.rs',
  'services/api/Dockerfile',
  'services/compose.yml',
  'services/README.md',
  'services/docker/postgres/10-provision-roles.sh',
  // Names the owner and the BASELINE role because both must still be provisioned; the runtime
  // role it points DATABASE_URL at is `tradingroom_app`.
  'services/.env.example',
  'services/api/migrations/0009_provision_tradingroom_app.sql',
  /*
    `0010` is the one migration whose SUBJECT is the reference name: it revokes every privilege
    `ptr_clone_app` holds in the database it runs on. It cannot be written without naming it.

    Added 2026-08-31 with the migration, and this list is the reason to notice it: an entry here
    should read as a claim somebody has to defend. This one's defence is that it is the only entry
    working to shorten the list rather than to be tolerated — it takes the name out of every ACL in
    every live database. It does NOT delete itself: the ROLE outlives the chain by design, because a
    migration that drops a cluster-global role cannot be applied to the next database. That was
    measured, not reasoned — see the migration's closing note.
  */
  'services/api/migrations/0010_retire_ptr_clone_app.sql',
  /*
    `0012` creates owner-only conversion ledgers after the baseline role has been retired from live
    ACLs. Its two explicit revocations name that historic role so a partially upgraded cluster
    cannot expose reconciliation records. The migration is already applied, checksum-ledgered
    history, so deleting the literals would violate the stronger forward-only migration boundary.
  */
  'services/api/migrations/0012_legacy_cutover_ledger.sql',
  'services/api/tests/',
  '.github/workflows/backend-quality.yml',
  'apps/controller/scripts/verify-backend.mjs',
  'apps/controller/scripts/verify-backend-provenance.mjs',
  'apps/room/gate/verify-postgres-schema-artifacts.mjs',
  'apps/controller/src/lib/naming-boundary.test.ts',
  /*
    The contract that says what `0010` must continue to mean. It quotes the role name because the
    migration's whole subject is removing it — and like this file, it is a test ABOUT the boundary
    rather than code that crossed it. Exempted by exact name in the product-surface assertion below
    too, for the reason recorded there.
  */
  'apps/controller/src/lib/retire-baseline-role-contract.test.ts'
]);

/**
 * Every tracked file containing a `ptr_clone` literal, as repository-relative paths.
 *
 * ## `spawnSync` and an explicit status check, and the reason is a failure this test produced
 *
 * On 2026-09-02 this went red inside `pnpm run gate` and green on the very next run and in
 * isolation. The obvious reading is a flake; `CLAUDE.md` says *"never report a failure without
 * first ruling out your own tooling"*, and the tooling was the fault.
 *
 * **`git grep` exits 1 when it finds nothing and 2 or more when it fails, and `execFileSync` throws
 * on both.** Measured rather than recalled, in this container: a search for an absent string gives
 * `spawnSync` status `1`, and `execFileSync` on the same arguments throws with `status 1`.
 *
 * Two consequences, and the second is worse than a flake:
 *
 *   1. a git that could not run and a genuinely empty sweep were the SAME event to a reader;
 *   2. the control below — *"finds the reference at all, so an empty sweep cannot pass silently"* —
 *      **could never fire for the reason its own comment gave.** An empty sweep threw in the reader
 *      before the assertion was reached, so the `toBeGreaterThan(10)` guard was unreachable on the
 *      one input it exists for. It was a test that could not fail usefully, and it took going red
 *      once, on the real thing, to notice.
 *
 * Branching on the status separates them. Status 1 is the real subject of the control below: no
 * matches, so the assertions that follow would all be vacuously true. Status 2+ is a tooling
 * failure and says so in those words, with git's own stderr, so nobody spends a turn looking for a
 * rename that did not happen.
 */
function filesNamingTheReference(): string[] {
  const run = spawnSync('git', ['grep', '-lI', 'ptr_clone', '--', '.'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });

  if (run.error) {
    throw new Error(`\`git grep\` could not be started, so this sweep measured nothing: ${run.error.message}`);
  }
  /* 1 is "no matches" — a real answer, and the empty array the control below exists to catch. */
  if (run.status === 1) return [];
  if (run.status !== 0) {
    throw new Error(
      `\`git grep\` exited ${run.status}, which is a TOOLING failure and not an empty sweep. ` +
        `Nothing about the naming boundary has been measured here. git said: ${run.stderr?.trim() || '(nothing)'}`
    );
  }
  return run.stdout.split('\n').filter(Boolean);
}

describe('the reference name never leaks into live code', () => {
  it('finds the reference at all, so an empty sweep cannot pass silently', () => {
    /*
      Without this, a renamed directory turns every assertion below into a vacuous truth — the same
      guard `ci-package-manager-pin.test.ts` needs, for the same reason.

      A BROKEN `git grep` no longer reaches this line: it throws in the reader above, naming itself
      as a tooling failure. That separation is the 2026-09-02 fix and it is what makes this message
      trustworthy — if this assertion is the one that fires, the sweep really did run and really did
      find nothing.
    */
    expect(filesNamingTheReference().length).toBeGreaterThan(10);
  });

  it('permits it only where the mapping says it belongs', () => {
    const unexpected = filesNamingTheReference().filter(
      (path) => !ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))
    );

    expect(
      unexpected,
      'These files use the REFERENCE name `ptr_clone*` outside the places `ops/naming-provenance.md` ' +
        'permits. The live runtime role is `tradingroom_app`. If one of these is genuinely a correct ' +
        'use — the baseline role the provisioner fences, or the owner role — add it to ' +
        'ALLOWED_PREFIXES with a CHANGELOG entry. If it is a connection string or an assertion that ' +
        'drifted, fix the code instead: that is what this test is for.'
    ).toEqual([]);
  });

  it('keeps the allow-list from silently growing', () => {
    /*
      A count, pinned. The list is allowed to SHRINK as transcription completes — that is the whole
      direction of travel — but a growing list means live uses of the reference name are being
      admitted one plausible exception at a time, which is how this kind of boundary always erodes.

      If you are lowering this number, good. If you are raising it, say why in the CHANGELOG.

      39 was MEASURED, not chosen: the list's size on 2026-08-15, the day the boundary was drawn. The
      first value written here was a guess of 36 and this assertion caught it within seconds, which
      is a small but exact demonstration of why the ceiling is pinned at all.

      **39 -> 41 on 2026-08-31, and both entries are the one kind of growth this rule should
      admit.** The second is `retire-baseline-role-contract.test.ts`, the contract that says what
      that migration must continue to mean; it quotes the name because the migration's subject is
      removing it, and it leaves the list on the same day the migration does.

      **The first:** The entry
      is `services/api/migrations/0010_retire_ptr_clone_app.sql`, whose SUBJECT is the reference
      name: it revokes every privilege `ptr_clone_app` holds in the database it runs on. It cannot
      be written without naming what it strips.

      41 -> 42 on 2026-09-03 admits one already-applied migration, `0012`, whose explicit deny for
      the retired role protects owner-only conversion evidence. Editing that SQL after application
      would break sqlx checksum history, so the narrow migration exemption is the only forward-only
      correction; the CHANGELOG records the gate that found the missed declaration.

      Every other entry on this list is a use that must be TOLERATED. `0010` is the only one working
      to shorten the live ACL list — it takes the name out of every ACL in every live database. It does not
      take itself off the list: the ROLE survives the chain deliberately, because dropping a
      cluster-global role stops the next database from starting its own chain. That is the argument,
      and the CHANGELOG carries the evidence: four databases on a live PostgreSQL 16.13 cluster,
      the `0009` interlock refusing a database run to `0008` only — that one is in the earlier
      three-database entry — and the convergence test that failed against the version which did
      drop it.
    */
    expect(ALLOWED_PREFIXES.length).toBeLessThanOrEqual(42);
  });

  it('never permits an exception inside the running application code', () => {
    /*
      The room and controller applications have no business naming the reference at all: they do not
      talk to PostgreSQL as a role. An entry appearing under either `src/routes` or `src/lib`
      (outside the two exemptions below) would mean the name reached the product surface.

      TWO FILES ARE EXEMPT, AND BOTH ARE TESTS ABOUT THE NAME ITSELF. This one, which has to quote
      what it forbids; and `retire-baseline-role-contract.test.ts`, added 2026-08-31, which asserts
      what `0010_retire_ptr_clone_app.sql` must continue to MEAN — the interlock, the absence of
      CASCADE, the catalogue-exact residual count, and the drop it deliberately does not perform.

      The exemption is by exact FILENAME rather than by a `.test.ts` suffix, deliberately. A suffix
      rule would exempt every test in both applications at a stroke, and the rule this assertion
      protects is that the name does not reach application code — a test in `src/lib` is application
      code for that purpose. Two named files are two claims somebody can read and challenge; a
      pattern is a hole.
    */
    const EXEMPT = ['naming-boundary.test.ts', 'retire-baseline-role-contract.test.ts'];
    const productSurface = filesNamingTheReference().filter(
      (path) =>
        (path.startsWith('apps/room/src/') || path.startsWith('apps/controller/src/')) &&
        !EXEMPT.some((name) => path.endsWith(name))
    );

    expect(
      productSurface,
      'the reference name reached application source; it belongs to the database tier only'
    ).toEqual([]);
  });
});
