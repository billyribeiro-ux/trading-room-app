import { execFileSync } from 'node:child_process';
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
    `0010` is the one migration whose SUBJECT is the reference name: it revokes everything
    `ptr_clone_app` holds and drops the role when the last database in the cluster has stopped
    granting to it. It cannot be written without naming it, and the day it can be deleted is the day
    the name is gone from every live database — which is the outcome it exists to reach.

    Added 2026-08-31 with the migration, and this list is the reason to notice it: an entry here
    should read as a claim somebody has to defend, and this one's defence is that the entry deletes
    itself once the rollout completes.
  */
  'services/api/migrations/0010_retire_ptr_clone_app.sql',
  /*
    The SOURCE contract over that same migration, and it arrived in the same commit — `d5e3391`
    added `0010`, this allow-list entry's neighbour above, AND this file, but listed only the
    migration. The result was a `main` that failed its own boundary two assertions at a time.

    Its defence is the migration's defence, because it has no other subject: it reads
    `0010_retire_ptr_clone_app.sql` and asserts the four properties that make dropping a LOGIN role
    safe — the `0009` interlock, no CASCADE, the residue count, the DROP itself. Every one of those
    assertions is a search for a literal that must appear in the SQL, so the name cannot be
    paraphrased out of them. Assembling it from fragments was rejected for the reason
    `verify-privacy-boundary.mjs` records: it hides the string from the very scanner that should see
    it, which trades a visible tolerated use for an invisible one.

    It deletes itself with the migration it guards, on the day the rollout completes.
  */
  'apps/controller/src/lib/retire-baseline-role-contract.test.ts',
  'services/api/tests/',
  '.github/workflows/backend-quality.yml',
  'apps/controller/scripts/verify-backend.mjs',
  'apps/controller/scripts/verify-backend-provenance.mjs',
  'apps/room/gate/verify-postgres-schema-artifacts.mjs',
  'apps/controller/src/lib/naming-boundary.test.ts'
]);

/** Every tracked file containing a `ptr_clone` literal, as repository-relative paths. */
function filesNamingTheReference(): string[] {
  const out = execFileSync('git', ['grep', '-lI', 'ptr_clone', '--', '.'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  return out.split('\n').filter(Boolean);
}

describe('the reference name never leaks into live code', () => {
  it('finds the reference at all, so an empty sweep cannot pass silently', () => {
    // Without this, a renamed directory or a broken `git grep` turns every assertion below into a
    // vacuous truth — the same guard `ci-package-manager-pin.test.ts` needs, for the same reason.
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

      **39 -> 40 on 2026-08-31, and it is the one kind of growth this rule should admit.** The entry
      is `services/api/migrations/0010_retire_ptr_clone_app.sql`, whose SUBJECT is the reference
      name: it revokes everything `ptr_clone_app` holds and drops the role once the last database in
      the cluster has stopped granting to it. It cannot be written without naming what it removes.

      Every other entry on this list is a use that must be TOLERATED. This is the only one that is
      working to shorten the list — it deletes itself, and takes the name out of every live database
      with it, on the day the rollout completes. That is the argument, and the CHANGELOG carries the
      evidence: three databases on a live PostgreSQL 16.13 cluster, including the refusal on one
      where `0009` had not run.

      **40 -> 41 on 2026-08-31, and it is the same admission counted twice rather than a new one.**
      The entry is `retire-baseline-role-contract.test.ts`, the source contract over that same
      `0010`. `d5e3391` added the migration, the contract and this ceiling in one commit but listed
      only the migration, so `main` went red on its own boundary — this completes that change rather
      than widening it. The two entries share one subject and one expiry: when `0010` is deleted,
      both go with it, and this ceiling returns to 39.
    */
    expect(ALLOWED_PREFIXES.length).toBeLessThanOrEqual(41);
  });

  it('never permits an exception inside the running application code', () => {
    // The room and controller applications have no business naming the reference at all: they do not
    // talk to PostgreSQL as a role. An entry appearing under either `src/routes` or `src/lib`
    // (outside this test) would mean the name reached the product surface.
    /*
      The exemption is EXACT PATHS, not a `.test.ts` suffix, and that is the whole care in this rule.

      `ALLOWED_PREFIXES` above does not reach here on purpose: this assertion is deliberately
      stricter than the allow-list, so a prefix admitted for the database tier cannot buy its way
      onto the product surface as a side effect. That means the two files under `src/` that may name
      the reference have to be named here as well, and be argued for twice.

      Both are guards over the database tier rather than product code — this file, and the source
      contract over `0010`, whose every assertion is a search for a literal that must appear in that
      migration. Neither ships: no route imports them, no bundle contains them. A blanket
      "any test file may" would have covered both in one line and also covered the next test that
      pastes a live connection string, which is precisely the erosion the header warns about.

      It was `endsWith('naming-boundary.test.ts')` until 2026-08-31 — a suffix that would have
      matched that filename in ANY directory. Exact paths are narrower, so this is a tightening in
      the same edit that admits the second file.
    */
    const DATABASE_TIER_GUARDS = Object.freeze([
      'apps/controller/src/lib/naming-boundary.test.ts',
      'apps/controller/src/lib/retire-baseline-role-contract.test.ts'
    ]);

    const productSurface = filesNamingTheReference().filter(
      (path) =>
        (path.startsWith('apps/room/src/') || path.startsWith('apps/controller/src/')) &&
        !DATABASE_TIER_GUARDS.includes(path)
    );

    expect(
      productSurface,
      'the reference name reached application source; it belongs to the database tier only'
    ).toEqual([]);
  });
});
