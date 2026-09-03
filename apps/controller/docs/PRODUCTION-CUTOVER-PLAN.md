# Production cutover execution plan

Status: **executing**

Authority: ADR 0003 and `docs/ARCHITECTURE.md`. This plan tracks execution; it
does not override the engineering SSOT, evidence contracts, or media promotion
gates.

## Gate 0 — official-domain containment

- [x] Install and verify the official Vercel adapter.
- [x] Default production to explicit `marketing-only` behavior.
- [x] ~~Reject `local-sqlite` when Vercel's runtime marker is present.~~
      **Superseded.** This held while the store was a file on an ephemeral,
      per-instance filesystem. The control plane now runs on PostgreSQL, which is
      reachable over the network, so Vercel is the intended host rather than a
      rejected one and the platform check is gone. What replaced it is a
      configuration check: `postgres` mode without a `DATABASE_URL` refuses to
      start instead of booting and failing at the first query. Proved by
      `scripts/verify-public-preview-http.mjs`.
- [x] Prove marketing mode boots without opening a database connection.
- [x] Hide account access and disable contact submission in marketing mode.
- [x] Fail closed for the reviewed login, registration, account, launch, logout,
      room-entry, API-docs, session, and contact-POST route matrix.
- [x] Make the current server import graph module-evaluation I/O-free. Future
      routes are governed by the SSOT import-safety rule and must extend the HTTP
      route matrix before merge; `handle` alone cannot prevent route-module
      evaluation.
- [x] Add no-store, noindex, framing, MIME, referrer, permissions, and minimal CSP
      response protections.
- [x] Publish a disallow-all `robots.txt` until legal and launch review complete.
- [x] Remove current-tree captured names, raw emails, member login timestamp,
      person-linked user id, encoded identity values, and reversible Gravatar
      values; rename the hash-derived public asset.
- [ ] Obtain explicit authorization, back up refs, rewrite the public Git history,
      force-push, and invalidate old clones if the owner chooses full historical
      PII removal.
- [ ] Replace placeholder terms/privacy with counsel/owner-approved documents.
- [ ] Configure a real contact transport and retention policy before enabling the form.
- [x] Configure canonical apex/www ownership and an exact permanent apex-to-www
      redirect in Vercel.
- [x] Activate the scheduled deployed TLS/header/route and media-boundary checks
      from the default branch. The media job requires both deployment-owned
      values, `MEDIA_SMOKE_ORIGIN` and `MEDIA_SMOKE_BROWSER_ORIGIN`. Hosted run
      [`30768966585`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30768966585)
      passed both the official-domain containment and Stage 1 media contracts on
      exact revision `cc99267a3dea445e35e052b8b1db171ccef4fe73`.
      Manually dispatched run
      [`30776842719`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776842719)
      re-proved both steps on exact merged-main revision `9968bd6…` after its
      Vercel deployment completed.
- [ ] Add application error monitoring with an owner-verified alert destination.
- [x] Prove and enforce the complete hosted workflow set. PR-head revision
      `24f01ff485251cf32178d12e4c9dd48a3101b419` passed Quality
      [`30775629743`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30775629743),
      Backend quality
      [`30775629747`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30775629747),
      and Security
      [`30775629745`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30775629745),
      including the pull-request-only dependency review. Exact squash revision
      `9968bd6b035656d503711504564651559c17e868` then passed Quality
      [`30776711719`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776711719),
      Backend quality
      [`30776711733`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776711733),
      and the push-applicable Security jobs
      [`30776711714`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776711714).
      Strict branch protection, including admin enforcement, now requires all five
      first-party contexts: SvelteKit/evidence, Rust/PostgreSQL, dependency review,
      JavaScript advisory audit, and full-history secret scan.

Gate 0 permits a non-indexed, non-transactional marketing preview. It does not
permit real signup, login, account, room, API-key, or payment traffic.

## Gate 1 — backend SSOT and security drift

- [x] Accept the Vercel/Rust/PostgreSQL/mediasoup architecture decision.
- [x] Mark the SQLite file-move amendment superseded.
- [x] Import only tracked Rust services from commit `f84bae3…` into this repository;
      `ops/backend-import-provenance.md` preserves the immutable import checkpoints
      and categorized reviewed delta ledger. Its executable current-tree seal
      covers all 93 non-ignored `services/**` files by path and content.
- [x] Add forward-only migrations `0005` and `0006` for the RLS policy target,
      runtime-role posture, and object-privilege restriction; pin their bytes.
- [x] Enforce exact owner/runtime identity, `NOBYPASSRLS`, `NOINHERIT`, and zero
      direct role memberships in bootstrap, migration, startup, and local tests.
- [ ] Apply those migrations and prove that role posture on the selected managed
      PostgreSQL target. Local PostgreSQL proof is not target-environment proof.
- [x] Run the complete imported-service baseline verification: 155 API library
      tests, 116 API PostgreSQL integration tests, 110 media library tests, and
      the then-current 2 media binary tests passed on 2026-08-02. On 2026-08-08
      this branch re-ran the whole workspace against that same boundary rather
      than only compiling it: PostgreSQL 17.10 from the digest-pinned image, both
      roles provisioned by the committed script, the migration chain applied as
      owner to the primary and to the independent cross-cluster negative control,
      and `api/fixtures/seed.sql` loaded. 413 passed, 0 failed — 155 API library,
      126 API PostgreSQL integration, 9 release-attestor, 112 media library, 11
      media binary — plus full-workspace Clippy with warnings denied and
      `pnpm quality` locally with 1197
      Vitest tests, 20 Playwright tests across Chromium, Firefox, WebKit, and
      responsive Chromium, and the Vercel production build. This is source-tree
      evidence; the protected hosted PostgreSQL workflow remains the authority
      for the complete current-revision database suite.
- [x] Obtain the first successful default-branch backend workflow result. Run
      [`30767258722`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30767258722)
      passed for exact revision
      `0a97fb1bb375e84e08591e85e6d932d8b503e9b6`, including the PostgreSQL,
      migration, fixture, formatting, Clippy, full-test, advisory, license, and
      provenance gates. Exact merged release revision `9968bd6…` independently
      passed the same boundary in run
      [`30776711733`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30776711733).
- [ ] Establish current-source release evidence: immutable API and media images,
      migration artifact, native/binary SBOM, vulnerability scan, signature and
      provenance attestation, target deployment by digest, and rehearsed rollback.
      The safe credential-free API slice is now implemented in backend CI: the
      exact checkout builds a non-root auditable image, recovers native and OCI
      dependency inventories, applies the machine vulnerability policy, and
      binds a redacted passing PostgreSQL 17 attestation into the hashed 30-day
      evidence bundle. It neither logs in to a registry nor pushes an image.
      That slice is now proved for exact default-branch revision
      `dac88f1078f9d2015beb35e8cb4beaf7ecf909a1` by protected run
      [`30833857437`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30833857437),
      whose retained bundle
      `api-release-evidence-dac88f1078f9d2015beb35e8cb4beaf7ecf909a1-30833857437-1`
      expires 2026-09-02T17:21:47Z. Signature and provenance attestation,
      registry publication, deployment by digest, and rehearsed rollback remain
      open, so this item stays open.
      The current media test image was deployed by digest from exact revision
      `0a97fb1…` with its predecessor retained for rollback. It still lacks the
      native/binary SBOM, current vulnerability evidence, signature, and
      provenance attestation required by this production gate; the retained OCI
      SBOM/base scan applies only to the historical `f84bae3…` image.

## Gate 2 — account bootstrap

- [ ] Decide and migrate the account/enterprise membership and owner/admin role model.
- [ ] Add a read-only authenticated `/api/v1/account` bootstrap endpoint.
- [ ] Generate OpenAPI and a typed SvelteKit server client.
- [ ] Preserve same-origin `__Host-` cookie transport through the BFF/proxy.
- [ ] Add cross-tenant, missing-session, malformed-input, and leakage tests.
- [ ] Deploy staging Rust API and managed PostgreSQL with backups and restore proof.

## Gate 3 — vertical feature migration

Move one fully authorized slice at a time: profile, rooms, room settings,
membership, badges, account administrators, customer API keys, then room launch.
No Svelte route may directly reproduce authorization policy.

## Gate 4 — signup, payment, and entitlements

Signup remains closed until tenant provisioning, legal documents, verified email,
recovery, payment-webhook idempotency, subscription state, and centralized
entitlements are authoritative and tested. Purchased entitlements and user
RBAC/ABAC are independent server-side decisions.

## Gate 5 — media promotion

Complete the media-session response, node/audience-bound grants, TURN credentials,
draining/readiness, key rotation, vulnerability review, observability, and the real
two-device/cross-network/browser/forced-TURN/load/soak/recovery matrix in
`docs/MEDIASOUP-DEPLOYMENT-PLAN.md`.

The Stage 1 host runs deployed revision `0a97fb1…` as immutable media image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
Its public six-case rejection matrix proves the current exact-Origin and Fetch
Metadata boundary. A fail-safe in-memory ephemeral-key probe additionally proved
valid-grant `101`, expiry rejection, the four-socket bearer-replay ceiling, and
byte-for-byte restoration of the retained environment. That does not prove the
future control-plane signer/key delivery, RTP flow, TURN, real-device behavior,
or production artifact integrity. Production is independently blocked by
mediasoup's statically linked OpenSSL 3.0.8 native dependency. The current browser
application is not wired to the Rust media-session contract.

## Production-opening rule

The official domain opens transactional customer traffic only when Gates 0–4 are
complete and the required portion of Gate 5 is proven for the offered product.
Green local tests alone are not production evidence; deployed checks and rollback
proof are required.
