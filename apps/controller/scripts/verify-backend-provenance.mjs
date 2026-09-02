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

  Moved again 2026-08-30, 74 -> 67: the dependency-currency update took SEVEN files that had been
  untouched imports until then — the workspace manifest and both crate manifests, the toolchain
  file, the api Dockerfile, and the two source files the new crate majors forced to change
  (`auth/password.rs` for password-hash 0.6, `auth/refresh.rs` for rand 0.10). Each is pinned
  individually in `DIVERGED_FROM_IMPORT` with its reason beside its hash, exactly as the rule above
  requires. Nothing became unsealed; seven seals moved from the aggregate onto their own lines.

  Moved again 2026-08-31, 67 -> 66: `api/src/config.rs`, whose doc comment on `database_url` still
  named `ptr_clone_app` as the role the runtime MUST authenticate as — the one role the startup check
  beside it exists to REFUSE. Its own seal below, with the measurement.
*/
const EXPECTED_UNTOUCHED_COUNT = 66;
const EXPECTED_MANIFEST_SHA256 = 'b0b2aef59bff70a51051edcf668287141e540c3c487f42f738f8e9f33b68e0c2';

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
    '600967960d80695a40ea5c83d2ac608627056e06aa51e24d53d5fead2fe72ef3'
  ],
  [
    'services/api/migrations/0009_provision_tradingroom_app.sql',
    '20b95d68bac75a698fa4e90502c2e54cc88d475d8b92bc4aada946a57700ce9c'
  ],
  [
    // Authored here on 2026-08-31, and the pair to `migration_reappliability.rs` above: that test
    // states the chain must apply to any number of databases on one cluster, and this migration is
    // where that rule stops being about SQL and becomes about a cluster-global ROLE.
    //
    // It revokes PER-DATABASE and does not drop the role. The first version did drop it, and that
    // test is what refused it — `the_chain_applies_to_a_second_database_on_the_same_cluster`, on a
    // live PostgreSQL 16.13 cluster: the first database dropped the role and the second could no
    // longer start its chain, because the migrate preflight requires it before `0001` runs. The pair
    // held. `CHANGELOG.md` carries the full evidence, including the refusal on a database where
    // `0009` had not run.
    'services/api/migrations/0010_retire_ptr_clone_app.sql',
    'f38b8ee829abb7e0525d4f31ccb389ddafad9e92c309c53a18ddc9969e1e5251'
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
  /*
    Re-pinned 2026-08-30 by the dependency-currency update: `cargo update` after raising the
    workspace requirements to the crates.io latest of that day. The registry evidence for every
    line is in the CHANGELOG entry of the same date.
  */
  ['services/Cargo.lock', '08bcc15f03d68664e643b30830bcec7f2589c2d9c72f0938381969a1a2d33aa0'],
  /*
    Diverged 2026-08-30, all seven by that same update, each leaving the aggregate for its own pin:

      Cargo.toml                workspace requirements raised to the crates.io latest resolved that
                                day; rust-version 1.97 -> 1.98. sha2 0.10 -> 0.11 because
                                ed25519-dalek 3.0.0 declares `sha2 ^0.11` and one digest generation
                                per tree is the point.
      api/Cargo.toml            argon2 0.5.3 -> 0.6.0 WITH password-hash 0.5 -> 0.6, which cannot be
                                split: argon2 0.6.0 declares `password-hash ^0.6`. The `std` feature
                                both carried at 0.5 no longer exists at 0.6, so the feature list is
                                now alloc/getrandom/phc. rand 0.9 -> 0.10.
      media/Cargo.toml          mediasoup 0.24 -> 0.27, tower-http 0.6 -> 0.7, ed25519-dalek 2 -> 3
                                (unified with the workspace), base64 0.22 -> 0.23. Zero source
                                changes; the 125-test service surface passes against it.
      api/src/auth/password.rs  password-hash 0.6 moved the PHC types into the `phc` crate and made
                                `hash_password` one-argument, generating its own 16-byte salt. The
                                `SaltString`/`OsRng` pair is gone. All seven password tests pass,
                                including the `$argon2id$` prefix and OWASP-parameter assertions.
      api/src/auth/refresh.rs   one import: rand 0.10 no longer re-exports `RngCore` at the root, so
                                `fill_bytes` now arrives via the `Rng` trait.

                                RE-PINNED 2026-09-02, and this edit is authored here rather than
                                imported. `revoke_family_for_token` read `family_id` and then called
                                `revoke_family` with it, outside a transaction; it is now the one
                                atomic conditional UPDATE `CLAUDE.md` asks for. A carried-forward
                                note called the pair a TOCTOU and RE-MEASURING refuted that - a
                                concurrent rotation inserts into the SAME family so the revoke still
                                catches the successor, an already-revoked family matches nothing
                                under `revoked_at IS NULL`, and a deleted row does not make the
                                `family_id` in hand wrong. What was real is the second round trip on
                                a logout request. Semantics proved on a throwaway PostgreSQL 16
                                rather than reasoned, because `sqlx::query` is not compile-checked:
                                2 rows for a known token, 0 for an unknown one (the `Ok(0)` path),
                                0 on replay, and the neighbouring family untouched.
      api/Dockerfile            builder image rust:1.97.1-alpine3.24 -> rust:1.98.0-alpine3.24 by
                                resolved digest, and the runtime distroless digest re-resolved.
      rust-toolchain.toml       channel 1.97.1 -> 1.98.0 (stable of 2026-08-18).
  */
  ['services/Cargo.toml', '0d155ff4b1d976fa5b0eb675c71a26f4e2a23c77abacf5b28d45d02aa06a2b1a'],
  ['services/api/Cargo.toml', '1756786fe07a5e2efddbba28b6c75514dcd14c52862daf057ef978f2b69d37d5'],
  ['services/api/Dockerfile', '23bb473a3f8f0b4478e3b9232405f19b7debb1be734b5ca2159c320f29fd841c'],
  ['services/api/src/auth/password.rs', 'c6b6ce785e1dd22477e1927819c451554baf90291bacb34366cf83502ccd4bb1'],
  ['services/api/src/auth/refresh.rs', '1dfee4a4f31c85ffe68189482bbf072703e83a9292b487c1e0c751cf94e30eb2'],
  ['services/media/Cargo.toml', 'e386a431215a4ebedb958f35ca2bc52ac760b1910fdb4f83663a3e9110179b7d'],
  ['services/rust-toolchain.toml', 'c006532ab2e9ff938d021819684751cd16c130aad10fffe5c788c00d09b23231'],
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
  /*
    Re-pinned 2026-08-31 (owner cutover): `resolve_attested_owner` reads the owner from the
    CONNECTION and every downstream check is pinned to that one name, instead of each comparing
    against `EXPECTED_MIGRATOR_ROLE`. The reviewed act: the owner rename `ptr_clone` ->
    `tradingroom` is staged (`ops/OWNER-ROLE-CUTOVER.md`), so a cluster mid-cutover holds databases
    owned by either — and an attestation comparing each site against a two-name list independently
    would pass a database whose connection says one owner while its tables still say the other,
    which is precisely a half-finished `REASSIGN OWNED`. Resolving once and pinning is strictly
    stronger than the single constant was: the relaxation is WHICH owner a database may have, never
    that it may have two.

    Re-pinned 2026-08-31: `ATTESTED_MIGRATION_VERSIONS` extended 0001-0009 -> 0001-0010 when
    `0010_retire_ptr_clone_app.sql` landed, with the reviewed-act paragraph that list requires. The
    attestor's own test caught the omission — the same way it caught `0009` shipping in `b9f775e`
    without the list being extended.

    Re-pinned 2026-08-31 (PR #177 merge follow-up): `migration_ledger_mismatch` still said
    `0001 through 0008` — TWO chain extensions stale, because an error string has no reader until
    the attestation fails. Both range-naming messages are now named constants held against
    `ATTESTED_MIGRATION_VERSIONS` by `the_prose_ranges_track_the_attested_chain`, whose negative
    control was run red-then-green, so the next extension moves the prose or goes red.
  */
  [
    'services/api/src/bin/postgres-release-attestation.rs',
    '607e1df8bfb387b531d6ef7b8efb81088bd4130ed1f40eeda1cd7186a123d13f'
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
  /*
    Re-pinned 2026-08-31: `RUNTIME_OBJECT_PRIVILEGES_SQL` names `MAINTAIN` only where the server has
    it. `has_table_privilege` RAISES `22023 unrecognized privilege type` on a name the server does
    not know, and this query gates the API BINDING to the database — so on PostgreSQL 16 the API
    refused to start with "unrecognized privilege type: MAINTAIN" rather than anything about its
    runtime role. Measured through that function on 16.13.

    Not a relaxation, which is why it is safe: below 17 the privilege does not exist, cannot be
    granted, and cannot be held. `services/compose.yml` pins `postgres:17`, where the check is
    unchanged. Negative control: the version gate removed, the same 22023 back.
  */
  ['services/api/src/db/mod.rs', '149a07ad65c3bb7668f0b7c99f50ea5d399d6e48775b7002c6a562f6e9318537'],
  /*
    Diverged 2026-08-31 — ONE doc comment, and it named the role the code turns away.

    `Config::database_url` carried *"MUST be the restricted, membership-free `ptr_clone_app` role"*.
    By then `0009_rename_runtime_roles.sql` had renamed it, `db::EXPECTED_RUNTIME_ROLE` was
    `tradingroom_app`, and `the_immutable_authentication_identity_is_required_and_parsed_exactly` in
    `db/mod.rs` asserted that a connection authenticating as `ptr_clone_app` is REJECTED — the old
    name is one of that test's negative fixtures. So the field's documentation instructed exactly the
    configuration the process refuses to boot with.

    Found by `TODO.md`'s runtime-role row, which deferred ~150 remaining `ptr_clone` occurrences in
    `services/**` on the grounds that *"`services/**` is a mirror"* — a claim the root standard
    records as false and costly. Measured instead: 138 occurrences, and all but this one are correct.
    `docker/postgres/10-provision-roles.sh` must keep creating `ptr_clone_app` or migrations
    `0001`–`0006` cannot grant to it; `compose.yml` sets the baseline role for provisioning and
    `POSTGRES_RUNTIME_USER: tradingroom_app` beside it; `db/mod.rs` uses the old names as negative
    fixtures; and the test and attestation files assert the pre-`0009` state on purpose.
    `ops/naming-provenance.md` is the mapping and both names exist by design.

    A comment only, so it cannot change behaviour. `cargo fmt --check` clean and
    `cargo clippy -p tradingroom-api --lib -- -D warnings` clean on the pinned 1.98.0 toolchain;
    `--all-targets` cannot run in that container because api's dev-dependency on `tradingroom-media`
    builds `mediasoup-sys`'s C++ worker, which fails there.
  */
  ['services/api/src/config.rs', 'ac51a3adf24a66371fdd6c380d77289ae7865fa660b78b0f193ac210448dda61'],
  /*
    Re-pinned 2026-08-31 (PR #177, first live run of the merged tree):
    `run_rejects_a_non_owner_before_creating_the_migration_ledger` asserted the rejection's
    `expected` field equalled the literal `ptr_clone`, while the owner cutover had made it the
    allow-list joined — `tradingroom or ptr_clone`. It now binds to
    `migrate::ACCEPTED_MIGRATOR_ROLES.join(" or ")`, the same bound-not-literal treatment the two
    assertions beside it already had; the two `preflight_for_tests` cases keep their literal
    correctly, because that entry point takes ONE name and echoes it back.
  */
  ['services/api/tests/migrations.rs', '9afb6ebfcd27953bacbdb75ecf68366c35631352b7b5218895ef36f01ad9ee1e'],
  [
    'services/docker/postgres/10-provision-roles.sh',
    '36031a9f9fb09d597dc58e3b50c59e3c7cb56918cda12dcfce01e959cc406e6d'
  ],
  /*
    Re-pinned 2026-08-31 (owner cutover): `EXPECTED_MIGRATOR_ROLE` was a single `&str`, which makes
    the `ptr_clone` -> `tradingroom` owner rename a FLAG DAY — the database's ownership and the
    deployed binary must change in the same instant, and in the window between them one of the two
    refuses a healthy database. `ACCEPTED_MIGRATOR_ROLES` is that window, an ordered allow-list of
    exactly two names, and `EXPECTED_MIGRATOR_ROLE` remains what a cluster is PROVISIONED with.

    The reviewed act, because this is the one place a reviewer will ask "is this the fail-open that
    was taken out?": it is not. That one was a catalogue lookup — `WHERE rolname IN ($1, $2) …
    LIMIT 1` — returning role Y's posture when asked about role X. This is an equality test against
    three facts about the current connection, checked together for ONE entry at a time, so a
    connection authenticated as one accepted owner and executing as the other is refused. Measured
    on a live PG 16.13 cluster through the `migrate` binary: `session_user=tradingroom,
    current_user=ptr_clone` -> exit 1. The negative control rewrote it as "each fact is in the list"
    and turned the unanimity test red on all four impersonation rows.

    Re-pinned 2026-08-31 (PR #177, first CI run of the merged tree): the owner-cutover paragraph in
    this module QUOTED the two-name lookup shape verbatim while explaining why the allow-list is not
    it — and `the_runtime_role_preflight_resolves_exactly_one_name` scans this file's TEXT, comments
    included, so the quote itself turned the contract red. The comment now describes the shape in
    words. Same failure family as template syntax quoted in a Svelte comment; the code was never the
    two-name lookup.
  */
  ['services/api/src/db/migrate.rs', 'd264ec6e7cf0e9790a0dd271876775896f127c897d89cb48db07cb7ed98bdad0'],
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
  [
    'services/api/tests/support/mod.rs',
    '1f878cd85b80d4450b08d3ec4d24e8edc8cc1a090880e138d2de88fe928f9950'
    /*
      Re-pinned 2026-08-31: `Scratch::sweep` now excludes the names THIS process created.
      Its safety argument — a live database keeps a backend attached, so its DROP fails — held only
      after a backend attached; between `CREATE DATABASE` and the first connect there is none, and a
      sibling thread's sweep collected the database out from under it. Adding a third concurrent
      `Scratch::create` to `migration_reappliability.rs` reproduced it on two consecutive runs
      ("It seems to have just been dropped or renamed"), and three runs are green after.
    */
  ],
  ['services/api/tests/auth_http.rs', '79a5b173119977db1ec1eac94a03b86897d40a42c0f25474d5fbd8cadedac98c'],
  ['services/api/tests/realtime.rs', '62c6629bed604164b3f9709220f737da51708c794e1b0062210a18d7ee7d0056'],
  ['services/api/tests/refresh_rotation.rs', '65531ae9d457eacedb87755fd673a6999fa607ea4822e37081d2a553637c49d7'],
  ['services/api/tests/room_api.rs', 'd4c507b29d7dc8335de398ac0c655941ad8321d0c0abe9385986768e57738e67'],
  ['services/compose.yml', '22d5aeef341b15ee1ae45041faaa142864a91aba0cb45557d68f9b051a08cc98'],
  ['services/deny.toml', '57165267aa3ccb0eec647a01232e10c13ab920aa3aaf9293bd2a701e21fa9d14'],
  // Re-pinned 2026-08-30: builder and runtime base images moved to the digests current that day
  // (rust:1-bookworm, distroless/cc-debian13:nonroot), part of the dependency-currency update.
  ['services/media/Dockerfile', '334ee72a651e01f205547e2fd71c8b46e6d98618776b52f7a678760c22b219d0'],
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
