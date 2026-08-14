# Rust service import provenance

Status: historical import/privacy checkpoints preserved; reviewed post-import
delta ledger and executable current-tree seal current as of 2026-08-02

## Immutable upstream import checkpoint

- Source repository: sibling `new-room` repository
- Detached source commit: `f84bae3e92ed266a762b6cab68afc97bf36b4dcc`
- Imported pathspec: tracked `services/**` files only
- Source `services` tree object: `b5367ce054f3f17b1283a26dea5074c5caaa8ce5`
- Imported tracked files: 86
- Sorted path-list SHA-256: `427e200cfdde5b516199e676936e3e27366315db7fce21d5bf460b17fd9f15d2`
- Sorted path-and-content manifest SHA-256: `8265dc320579433bae36c063b17b6f6a50de45ba8fb05c89837027dccb7cf873`

The source checkout was a clean detached Git worktree. Import used `git archive`
at the exact commit, so deleted, modified, ignored, and untracked files from the
ambient sibling worktree were not eligible. In particular, the untracked
`services/api/src/db/repo/provision.rs` prototype was not imported.

## Historical reviewed deployment checkpoint

After the byte-identical import, the repository-tracked patch
`ops/mediasoup/media-deployment.patch` was checked and applied cleanly.

- Patch Git blob: `5d65cad2a122ac04d76fad2f2bc6b62ce8749479`
- Patch SHA-256: `9253092aaa9a1ae266171b80f0014758303422012ddfd8318b1830dcfe3797f7`
- Expected delta: 2 files, 26 insertions, 13 deletions
- Added: `services/.dockerignore`
- Modified: `services/media/Dockerfile`
- Resulting service files: 87

`git apply --check` passed before application and `git apply --reverse --check`
passed afterward. A recursive comparison against the detached source contained
only the two expected patch paths.

## Historical import-time verification

- `cargo fmt --all -- --check`: passed
- `cargo check --locked --workspace --bins`: passed
- `cargo test --locked -p tradingroom-media`: 105 passed, 0 failed

The full all-target API gate is intentionally not represented as passing. Two
API unit tests compile-time-include repository-root forensic artifacts that were
not part of the authorized `services/**` import, and the API integration tests
require their explicit `testing` feature plus PostgreSQL fixtures. Those
dependencies must be restored or deliberately replaced in a reviewed follow-up;
this import does not fabricate them.

## Post-import privacy and fixture-integrity transformation

The byte-identical import was preserved as the baseline above, then a reviewed
privacy transformation removed the captured owner's identity from backend test
fixtures. The replacement identity is deliberately synthetic: `Test Presenter`,
legacy media uid `4242`, UUID `00000000-0000-4000-8000-000000004242`, and the
reserved-domain operator address `platform-admin@tradingroom.test`.

The original five privacy-gate findings were in the services README, seed SQL,
rate-limit example, login probe, and media-grant golden vectors. A complete exact
identity search found the same captured grant identity copied into API grant and
access-token tests, media-server tests, and two identifier-opacity tests; those
copies were transformed in the same bounded change. Production algorithms,
roles, permissions, and RLS were not changed.

The golden media vectors still pin the exact JSON field order, base64url
alphabet, Ed25519 public key, and deterministic signature. The readable
synthetic payload and signature are stored separately, then the complete token
is assembled and verified at runtime. This retains the cross-language wire
contract without checking a reversible encoded identity blob into source.

The seed correction also closed two independently proven fixture defects:

- both authored `email_hash` placeholders were replaced with the MD5 of the
  normalized reserved-domain fixture addresses, matching every extracted row;
- the committed operator Argon2id string did not verify its documented password.
  A new regression failed against that original string, the hash was regenerated
  through `cargo run --locked -p tradingroom-api --example hash_password`, and
  the same regression then passed.

`seed.sql` now refuses to commit if any fixture `email_hash` differs from
`md5(lower(email::text))`. A fresh temporary database named
`ptr_clone_privacy_fixture_20260802` was migrated, loaded exclusively from the
modified seed, and exercised through the real HTTP login handler. Correct-login,
wrong-password, and committed-hash tests all passed; the temporary database was
then dropped. The shared `ptr_clone` database was never migrated or mutated.

The root privacy gate now rejects recurrence of the exact captured display name
and v2 user UUID anywhere in tracked current-tree text. Its legacy numeric-id
guard is intentionally scoped to `services/**`, because the same integer is an
unrelated DOM node and source-line reference throughout the forensic corpus.
Approved bracketed evidence placeholders remain valid.

### Privacy checkpoint bytes

| Path | Imported SHA-256 | Post-privacy SHA-256 |
|---|---|---|
| `services/README.md` | `abd855a7e1c46466a67acf649fccf895e76d4aa545fdb686ef15e20530dde943` | `a74783e7e15c1bad97298e210c06b2c146f526f81ed616e19898732394bcbc6f` |
| `services/api/fixtures/seed.sql` | `64fdefdc71c47a942a382062a11be46227c98da31f3c94451d17ed176f9d8995` | `7241c3bd1b1f047b3d72d8f7c47ab17413eb53432b99e268a7517725d1101c8b` |
| `services/api/src/auth/grant.rs` | `b3116ae5d0546aeba0428f3813d937bbd500aa37a5f8169378395340b3434f50` | `4adb4b86d9d6b4ecdb22bf07fb4a0b05dc052c5246bdd0e7ed8fbe43ffc26b85` |
| `services/api/src/auth/token.rs` | `b90300f1e49f01887f87fff0cd499712dc98d388f839d0d6b0f602a2e0bf4d71` | `e862c728c17c7adc9a21e6e47ee33142f6da5ff73fb8c35afe1862481e663770` |
| `services/api/src/db/repo/room.rs` | `7f95e64c11cd697776fcd874264a82ff1001195464fbee49a4f9f132e27e31d5` | `624783b52b68f668e0602f4b90c8664d20d45c00b72000200d22208dcb5bb0c9` |
| `services/api/src/http/metrics.rs` | `c2c389f2262a0f44ed680ee63d6284f39f35b7d99d01675ba1a7d50630821cf7` | `6422aab9a6abfa5e98190742effaffae4b20d341d96f0d50f1193513a1570b7e` |
| `services/api/src/http/ratelimit.rs` | `5843d07fe0d673275ef9476c5cd4625acae998770858d7c59121a98275ae97c6` | `0c03a3cfd42b0e46a5586e78f42399e23dfce0c7f67bd5080651e7639f26fbc6` |
| `services/api/tests/login_probe.rs` | `b4391cffee6f70781ddc261f3d975e6cb87d4d654c40286b5cd40f1233b23adb` | `5ba678c7fd36d3eb4c2ace8f036bec14271c7f3e6681d0429351fc0f34a73a62` |
| `services/media/src/grant.rs` | `b690a58e8b0a133a9b9a151365a679c1b0d74eac201746e3fbc962b5411bc5a6` | `97aacc5e2db3001e370ee0980875707cbf662ea1c98f744e2d4dfef916639ad4` |
| `services/media/src/server.rs` | `270151d2314c65a848ee89c498438e975604e0c5e14ef78a4d998a51e5f9136f` | `23148b68d8e350ce003a56de6f9cbe438f96bc970c8c104e18aa7ca86f002e3e` |

These hashes are immutable evidence checkpoints, not a current-tree manifest.
Four listed paths—`services/README.md`, `services/api/src/http/ratelimit.rs`,
`services/media/src/grant.rs`, and `services/media/src/server.rs`—have reviewed
later changes described below. Their checkpoint hashes remain here deliberately
and must not be rewritten to resemble a current-tree seal.

The strengthened `scripts/verify-privacy-boundary.mjs` hashes to
`befd50ec74ea390b4838f618827fda98408cacd8963e9574ec19eed1110584ae`.

### Post-transformation verification

- `CI=true pnpm privacy:verify`: passed
- `cargo fmt --all -- --check`: passed
- `cargo test --locked -p tradingroom-api --lib`: 134 passed, 0 failed
- fresh-seed `cargo test --locked -p tradingroom-api --test login_probe
  --features testing`: 3 passed, 0 failed
- `cargo test --locked -p tradingroom-media`: 105 passed, 0 failed
- `git diff --check`: passed

## Reviewed post-import delta ledger

This categorized ledger owns the semantic deltas after the immutable checkpoints
above. It describes local source, not deployed state.

### Reproducible service bootstrap

- Added the safe `services/.env.example` contract and a digest-pinned PostgreSQL
  17 Compose service bound only to loopback.
- Added an idempotent role provisioner that creates or validates the exact
  database-owner/runtime-role split without placing passwords in SQL or source.
- Consolidated the Rust workspace onto the repository-pinned toolchain and sole
  `services/Cargo.lock`; locked commands and workspace-context container builds
  are now the documented paths.

### Migration integrity, tenancy, and database identity

- Added forward-only migrations `0005` and `0006`. They target the
  `room_events` RLS policy to the runtime role, enforce `FORCE ROW LEVEL
  SECURITY`, and replace broad runtime grants on `enterprises`, `users`, and
  `audit_log` with the reviewed object/column matrix.
- Removed unsafe migration adoption. The migrator authenticates as the exact
  owner; the API authenticates as the exact runtime role and refuses startup on
  privilege or membership drift.
- Byte-pinned imported migrations `0001`–`0004` and reviewed migrations
  `0005`–`0006`; applied migrations remain immutable.

### API browser boundary, authentication, and bounded availability

- Enforced one canonical HTTPS browser origin for cookie-authenticated unsafe
  methods and the room-events WebSocket, with an independent same-origin
  `Sec-Fetch-Site` check when supplied.
- Threaded the parsed database-acquire and HTTP-request timeouts into SQLx and
  Tower rather than silently substituting constants. Configuration now fails
  closed outside the repository-backed 1–5 second pool-acquire and 1–30 second
  request windows, including extreme values that could otherwise panic or
  remove the availability bound.
- Bounded in-memory rate-limit maps and Argon2 work admission; durable login
  failure-window decisions fail closed when their PostgreSQL boundary fails.
- Made logout fail closed when token-family revocation cannot be persisted,
  applied `no-store` to authentication/session material, and retained durable
  PostgreSQL token-family rotation/revocation.
- Added a dedicated PostgreSQL notification listener to readiness so an API
  instance does not report ready while realtime invalidation/replay plumbing is
  unavailable.

### Media admission and privacy

- Added exact configured browser-Origin enforcement to grant-enforcing `/ws`
  admission. The exact current-source implementation is now active on the
  Stage 1 test host; the dated deployment record distinguishes its proven
  rejection matrix and ephemeral valid-grant/expiry/replay proof from the
  control-plane signer, RTP, TURN, and real-device paths that remain unproven.
- Removed grant-bearing query strings from application request spans and bounded
  rejection logs to reason classes without raw grants.
- Added a four-socket cap per verified media user, in addition to the existing
  global peer/port bounds, with regression coverage.

### Repository gates and release evidence

- Added deterministic backend migration/source checks, a pinned RustSec policy
  wrapper, a PostgreSQL-backed backend workflow definition, and deployed
  production/media smoke definitions.
- Preserved the historical Stage 1 image digest and OCI SBOM/base-image scan as
  test-host evidence, then deployed exact revision `0a97fb1…` as the active media
  image
  `sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`
  with its predecessor/configuration retained for rollback. Historical scan
  artifacts do not attest the current image.
- Recorded the statically linked OpenSSL 3.0.8 dependency as an independent
  production blocker requiring native/binary SBOM and rebuilt-image evidence.
- Replaced the API's Debian-slim runtime after retained protected-run evidence
  rejected seven Critical inherited findings. Separate local Debian 13 and
  static-distroless scans were non-authoritative investigative controls and were
  not retained as promotion evidence. The current contract uses pinned Buildx,
  BuildKit, builder, and runtime identities; binds each static PIE to exactly
  seven hashed system-musl/Rust-toolchain link inputs; requires builder/runtime
  binary-hash equality; denies forbidden final-rootfs executable/library paths
  and enforces the exact five-package static-distroless SBOM allowlist; scans the
  builder, runtime, API, and migrator directly against one frozen Grype
  database; and runs fail-closed plus positive exact-image smoke.
  It explicitly preserves the independent-package/CVE identity limitation for
  the Rust-toolchain `libunwind.a` instead of claiming complete native coverage.
- Validated `MEDIA_BIND_ADDRESS` as a literal `IP:port` in `Config::validate`.
  It was previously never parsed, so a hostname form that `TcpListener::bind`
  resolves failed the separate `SocketAddr` parse that decides the
  loopback-development exemption, and startup then reported
  `MEDIA_ANNOUNCED_ADDRESS` — a variable whose value was correct. The direction
  was already fail-closed; the parse only ever withheld the exemption and could
  never grant it, so no admission or exposure boundary changed. The rejection now
  names `MEDIA_BIND_ADDRESS` before any worker is spawned, and a hostname bind is
  no longer accepted. Every checked-in value (`services/.env.example`,
  `ops/mediasoup/media.env.example`, `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`) is
  already a literal `127.0.0.1:4443`. Proved by mutation: reverting the
  validation reproduces the original `MEDIA_ANNOUNCED_ADDRESS` misattribution and
  fails the new regression.

## Current-tree executable integrity seal — 2026-08-02

`scripts/verify-backend-provenance.mjs` deterministically enumerates every
tracked or non-ignored untracked file under `services/**`, rejects ambiguous
newline-bearing paths, hashes the sorted newline-delimited path list, and hashes
the sorted manifest serialized as `<file SHA-256>  <path>`. It is part of
`backend:migrations:verify`, so the root quality gate and hosted backend workflow
cannot silently accept service-tree drift.

- Files: **93**
- Sorted path-list SHA-256:
  `410015107ea656083e93aff5967680dd1387e6327675e564de26917b4334400c`
- Sorted path-and-content manifest SHA-256:
  `a2c39df348bab1a17d93769703f3205053778cc3aeea80b73b73ba41f8f98713`

This seal covers current source only. It does not rewrite the immutable import,
privacy, historical deployment-image, SBOM, or rollback checkpoints above.

## Final local verification — 2026-08-02

The settled imported-service baseline verification result was:

- API library/unit suite: **155 passed**;
- API PostgreSQL integration suite: **116 passed**;
- media library suite: **110 passed**;
- then-current media binary suite: **2 passed**; and
- current frontend `pnpm quality`: **passed**, including 89 Vitest tests, 20
  Playwright tests across Chromium, Firefox, WebKit, and responsive Chromium,
  zero Svelte diagnostics, and the Vercel production build.

This hardening branch separately passes the **112** media library tests, **11**
media binary tests, **8** release-attestor tests, all API test-target compilation,
and full-workspace Clippy. The earlier counts and hashes remain valid historical
checkpoints rather than being silently rewritten as current-branch database
execution. Hosted
default-branch backend run
[`30767258722`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30767258722)
independently passed for exact revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6`; that hosted result is recorded
separately rather than inferred from local success.

## Reconciled sibling drift and re-seal — 2026-08-06

The `services/**` tree exists in two working folders, and it diverged a second
time. `new-room/services/SYNC-PROVENANCE.md` records the first divergence
(2026-08-02 to 2026-08-03, 87 files against 93) and names this repository as the
source with the instruction "Do not author `services/**` changes in this
repository". Work was authored there regardless. Measured on 2026-08-06 with the
two comparisons that file prescribes, the sibling was **ahead** by twelve files:

- `services/api/migrations/0007_saved_polls.sql` — the Pre-Canned list's table.
- `services/api/migrations/0008_room_events_tenant_keys.sql` — pairs the tenant
  keys on `room_events`. That table had three independent foreign keys, so a row
  could hold one tenant's `enterprise_id` beside another tenant's `room_id` and
  still satisfy `room_events_tenant_isolation`. It is the realtime fan-out, and
  `scope`/`audience_member_id` decide who receives an event, so the sibling copy
  was the safe one and this repository's was not.
- `services/api/src/provision.rs`, `src/bin/provision-room.rs`,
  `tests/provision.rs` — first-tenant provisioning, reachable through
  `pub mod provision;` in `src/lib.rs`.
- `src/http/v1/mod.rs`, `src/http/v1/polls.rs`, `src/db/repo/poll.rs`,
  `tests/actions.rs`, `tests/migrations.rs`, `tests/support/mod.rs` — the saved
  (Pre-Canned) poll routes, and a docs correction: `create` and `remove` were
  labelled `savePoll`/`deleteSavedPoll` but operate on `polls`, the sent kind.

All twelve were promoted here byte-for-byte. Three sibling files were
deliberately **not** promoted:

| Not promoted | Why |
|---|---|
| `services/api/src/db/repo/provision.rs` | Still the never-compiled prototype this ledger's import checkpoint already excludes. `db/repo/mod.rs` does not declare it and it calls `db.begin_untenanted()`, which exists nowhere in `services/api/src`. Importing it would add dead code, not coverage. |
| `services/media/Cargo.lock` | A second lock beneath a workspace member, which SSOT §1 forbids. Recorded as its own item in the sibling's `TODO.md` (3b); promoting it would launder the violation. |
| `services/SYNC-PROVENANCE.md` | Describes the mirror, and belongs to the mirror. |

Verification of the promoted tree, run here:

- `cargo fmt --all -- --check`: passed
- `cargo check --locked --workspace --bins`: passed
- `cargo clippy --locked --workspace --all-targets --features testing -- -D warnings`: passed

The `--features testing` flag is not optional and is the invocation
`.github/workflows/backend-quality.yml:165` uses. `TenantTx::raw_for_tests` is
gated behind that feature by design — fence #2 of the tenancy kernel — so a
clippy run without it cannot compile the integration tests at all.

### Re-sealed current tree — 2026-08-06

The 2026-08-02 seal above stands as a historical checkpoint and is not rewritten.
`scripts/verify-backend-provenance.mjs` now pins:

- Files: **98**
- Sorted path-list SHA-256:
  `66ab4696e3d3685daaa5ba27e28137a1cc038a71a32fcf92d30bdd144f35ecef`
- Sorted path-and-content manifest SHA-256:
  `d85ea8679e2f6f6f4903b3f22b4737ec6ce8d1245bf0aa65a965a7ed7910db70`

Two copies of one backend remains the underlying defect; this reconciliation does
not fix it. The fix is one repository, decided in
`docs/decisions/0003-vercel-rust-postgresql-control-plane.md` and still not
executed.

### Re-sealed current tree — 2026-08-07

The two seals above stand as historical checkpoints and are not rewritten.

One file changed: `services/api/src/bin/postgres-release-attestation.rs`. The
hosted backend gate rejected this branch with `embedded_migration_contract_changed`
because the attestor vouched only for migrations 0001-0006, while the reconcile
promoted `0007_saved_polls` and `0008_room_events_tenant_keys`. Extending that
pinned list is the reviewed act the control exists to force, so the seal moves
with it.

The file count and path list are unchanged — no file was added, removed or
renamed — which is why only the content manifest differs:

- Files: **98** (unchanged)
- Sorted path-list SHA-256 (unchanged):
  `66ab4696e3d3685daaa5ba27e28137a1cc038a71a32fcf92d30bdd144f35ecef`
- Sorted path-and-content manifest SHA-256:
  `e7b396a2962bc4629bf36b10bf83da4bede3c5df606692c61d1c96f87fa7c189`

Reproduced independently: the hosted gate computed this exact value before the
constant was changed, and a local run of `scripts/verify-backend-provenance.mjs`
computed it again byte-for-byte. The seal is therefore recording an observed hash,
not asserting an intended one.

### Re-sealed current tree — 2026-08-08 (operator console)

The three seals above stand as historical checkpoints and are not rewritten.

One file changed: `services/media/src/server.rs`, +26/-2, as part of the operator
console slice. The file count and sorted path list are unchanged — nothing was
added, removed or renamed — so only the content manifest moves:

- Files: **98** (unchanged)
- Sorted path-list SHA-256 (unchanged):
  `66ab4696e3d3685daaa5ba27e28137a1cc038a71a32fcf92d30bdd144f35ecef`
- Sorted path-and-content manifest SHA-256:
  `4c3036011fe272a4264769358c9243804fb78246c2d0525ddaf67285ddb1815a`

Recorded from an observed value, not an intended one: the hosted gate computed this
exact hash and rejected the branch for it, and a local run reproduced it
byte-for-byte before the constant was changed.

## The tree has diverged from the import, and the direction is measured — 2026-08-12

**No seal is changed by this section.** It records what was found; changing the seal is a separate
decision and is not taken here.

### How this surfaced

The manifest hash above had never once been verified. `verify-backend-provenance.mjs` read every
file through `new URL('../' + path, import.meta.url)`, which from `apps/controller/scripts/`
resolves to `apps/controller/services/` — a directory that does not exist. The script died before
reaching the manifest, so the gate had been failing at step 2 for an unrelated reason and the
manifest check was never reached. Repairing the path made it report a mismatch on the first run it
ever completed.

### Ten imported files have been edited here

`git diff --name-only e50a819..HEAD -- services`:

`Cargo.lock`, `api/src/db/migrate.rs`, `media/Dockerfile`, `media/src/config.rs`, `grant.rs`,
`main.rs`, `router_registry.rs`, `server.rs`, `session.rs`, `worker_pool.rs`.

An eleventh, `api/migrations/0009_rename_runtime_roles.sql`, was authored here and is sealed
separately as `LOCALLY_AUTHORED`. It is not part of this divergence.

### The direction, measured against the documented source

The source of record is the sibling **`new-room`** repository (see the import checkpoint above).
Diffing our copies against it, per file, added versus removed:

| file | added | removed |
| --- | --- | --- |
| `services/media/src/server.rs` | +195 | −29 |
| `services/media/src/config.rs` | +69 | −0 |
| `services/api/src/db/migrate.rs` | +27 | −1 |
| `services/Cargo.lock` | +69 | −109 |

`config.rs` is a strict superset of the source. `server.rs` is overwhelmingly additive. `Cargo.lock`
nets smaller, which is consistent with the 2026-08-09 dependency bump (`8dd0306`) dropping
transitive dependencies rather than with a regression.

The same comparison against `new-room-control/services` gives the same answer, so the finding does
not depend on which sibling is treated as the source.

**This repository is ahead.** `a11883c` alone is 252 insertions across seven of those files — the
SFU liveness fix — and `CHANGELOG.md:2863` records it deployed and proven against production with
live log output.

### There is no sync mechanism

`CLAUDE.md` states that `services/**` is a mirror and that "a change made here is lost on the next
sync". Searched for a sync: `scripts/`, `ops/`, `apps/*/scripts/`, `.github/`, and the root
`package.json` scripts block. The only script that references the sibling repositories at all is
`scripts/set-vercel-env.sh`, which READS `.env` files and states at its line 30 that
`new-room-control` is "read-only reference, not a config store for this project". Nothing anywhere
copies `services/**` in either direction.

So the sync that would destroy this work does not exist, and the mirror framing does not describe
this repository as it stands.

### The sibling repositories are REFERENCE ONLY

Owner directive, 2026-08-12, in these words:

> those are for reference only. You're strictly working on trading-room-app folder

That removes the premise of the mirror framing entirely. `new-room` and `new-room-control` are
material to read, not an upstream to synchronise with — nothing is ever written back to them, and
nothing is ever pulled from them into `services/**`. A tree cannot be a mirror of a repository that
is never read from and never written to.

Combined with the measurements above — this repository ahead on nine of ten files, one of them a
production-proven fix, and no sync script anywhere — **`trading-room-app` is the authority for
`services/**`.** That is not a judgement call made here; it is what the directive and the evidence
jointly state.

The import checkpoints above remain exactly what they were: a true historical record of what
arrived, and from where. They are not rewritten. What changes is only the claim about the FUTURE —
that these files are provisional and will be overwritten. They are not.

### What still needs an explicit decision

One act, and it is deliberately not taken here: **editing
`apps/controller/scripts/verify-backend-provenance.mjs`.**

That script is the audit control which caught this drift, and an agent editing the thing that
watches it — however good the reasoning — is precisely the move such a control exists to prevent.
It has been left untouched.

The change it needs, when authorised, is NOT a re-pin of the whole tree. Re-pinning to whatever is
present cannot distinguish reviewed work from an accident, and the next unrecorded edit would land
inside a green gate. Instead:

- pin the ten diverged files **individually**, by name and hash, so an unrecorded change to any one
  of them still fails and fails naming the file;
- narrow the manifest to the 88 imports that have never been edited, whose bytes are still the bytes
  that arrived — so the seal keeps meaning "unchanged since import" rather than "whatever is here
  today".

Measured values for that change, should it be taken: 88 untouched imports, manifest SHA-256
`9e5fe0a6c5ae0d8fad3eeed7baadf6aac48cccc94ab1ac2796c4983a949bc9e0`, path-list unchanged at
`66ab4696…`.

**A fourth instance of the original path bug is also waiting in that file**, exposed only once the
earlier repairs let execution reach it: `DOCUMENTED_COUNT_SITES` names `docs/ENGINEERING-SSOT.md`
and `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`, and both actually live under `apps/controller/docs/`.

Until that edit is authorised the seal stays red, and that remains the correct state: it is
reporting something true.

## Eleventh divergence: the release attestor learns about 0009 — 2026-08-14

The seal moved from **88 untouched + 10 diverged** to **87 + 11**. The file that crossed is
`services/api/src/bin/postgres-release-attestation.rs`, and it crossed because `main` was red.

### What was wrong

`0009_rename_runtime_roles.sql` shipped in `b9f775e` and renames the runtime login
`ptr_clone_app` -> `tradingroom_app`. The attestor was not told, in two separate ways:

1. **The migration pin.** `ATTESTED_MIGRATION_VERSIONS` listed `0001`-`0008`, so
   `the_embedded_migration_pin_matches_the_migrations_on_disk` failed and took the Backend quality
   workflow with it. That is the gate behaving correctly: extending the pin is meant to be a
   reviewed act, and nobody had reviewed it. Now `0001`-`0009`.

2. **The role name — found while fixing the first, and worse than it.** `validate_runtime_role`
   accepted only `EXPECTED_RUNTIME_ROLE`, and the `room_events` policy check required its target
   list to equal exactly `[EXPECTED_RUNTIME_ROLE]`. After 0009 the role answers to
   `tradingroom_app`, so the attestor would have **refused to attest any correctly migrated
   cluster** — reporting `runtime_role_mismatch`, which reads like a security finding rather than a
   stale pin. Both now accept either name.

The second is a repeat of a defect already fixed once. `db::migrate` gained `RENAMED_RUNTIME_ROLE`
on 2026-08-11 after the adversarial review recorded it exactly: *"Pinning a single name made 0009
rename the role its own preflight requires to exist."* That fix did not reach this binary, because
the name only appears in a live-database code path that no unit test covered.

### What did NOT change

The posture checks. `LOGIN`, and never `SUPERUSER` / `CREATEDB` / `CREATEROLE` / `INHERIT` /
`REPLICATION` / `BYPASSRLS`, with zero direct memberships — applied identically to whichever name is
present, so a cluster mid-transition is held to exactly the same standard. A rename buys a role
nothing. The RLS policy must still target exactly ONE role; only the name it may carry widened.

`pg_policy` stores targets by OID, so a renamed role keeps its policies and simply reports the new
name — which is why this is a name-tolerance change and not a policy change.

### Coverage added, because the gap was a missing test rather than missing care

`the_runtime_role_is_accepted_under_either_name_but_never_with_a_weaker_posture` asserts a migrated
cluster is attestable, that `BYPASSRLS` still fails under **both** names, and that no third name
(`tradingroom_app_v2`) is smuggled in by the tolerance. Its negative control was run: restoring the
single-name check turned it red, and it was restored.

### Verification

- `cargo test -p tradingroom-api --bin postgres-release-attestation` — 10 passed, 0 failed.
- `cargo clippy -p tradingroom-api --all-targets --features testing -- -D warnings` — clean.
  Without `--features testing` eight integration targets fail to compile **by design**; that is
  fence #2 of the tenancy kernel, not a regression.
- `rust-analyzer` diagnostics on the edited file — 0 errors, 0 warnings.
- `node apps/controller/scripts/verify-backend-provenance.mjs` — PASS, 98 imported
  (87 untouched + 11 diverged, each pinned) + 1 authored here; path-list unchanged at `66ab4696…`;
  manifest now `70e62cc904daa01466c7616b71106cde741e05867ea750a2ddf4371ed5169aad`.

The `88` and `9e5fe0a6…` quoted in the 2026-08-12 section above are left as written. That section
records a decision point as it stood; superseding it in place would destroy the record of what was
measured when. This section supersedes it.
