# Engineering source of truth

Status: **normative**  
Applies to: all production code, tests, scripts, documentation, and generated
artifacts in this repository  
Framework baseline: Svelte 5 + SvelteKit 2 + TypeScript strict mode + adapter-vercel

This is the sole authority for how engineering work is performed in this
repository. It converts “best practices” and “enterprise grade” into reviewable
rules and executable gates. `MUST`, `MUST NOT`, `SHOULD`, and `MAY` have their
ordinary RFC 2119 meanings.

## 1. Authority model

SSOT does not mean one oversized file owns every fact. It means every concern has
exactly one named authority and all other locations point to it.

| Concern                                                                                                                                      | Authority                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering policy and definition of done                                                                                                    | This document                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Everything outstanding, incomplete, or deliberately deferred, with the evidence for each                                                     | `docs/OUTSTANDING.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Svelte/SvelteKit conformance evidence and change ledger                                                                                      | `docs/SVELTE-CONFORMANCE-AUDIT.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| System boundaries, trust model, and tier ownership                                                                                           | `docs/ARCHITECTURE.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Production cutover sequence and current promotion state                                                                                      | `docs/PRODUCTION-CUTOVER-PLAN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| mediasoup hosting stages, network contract, and promotion gates                                                                              | `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Imported Rust service source boundary, immutable import/privacy checkpoints, reviewed delta ledger, and executable 98-file current-tree seal | `ops/backend-import-provenance.md`; enforced by `scripts/verify-backend-provenance.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PostgreSQL runtime-role, object-privilege, and `room_events` RLS hardening                                                                   | `services/api/migrations/0005_harden_runtime_role_and_room_events_policy.sql`, `services/api/migrations/0006_restrict_runtime_object_privileges.sql`, and `ops/postgres-runtime-role-hardening.md`                                                                                                                                                                                                                                                                                                                                          |
| Rust/native backend dependency risk and temporary advisory exceptions                                                                        | `ops/backend-supply-chain-review.md` enforced by `pnpm backend:advisories`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Reference-capture precedence and known gaps                                                                                                  | `docs/reference/pieces/INDEX.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Raw reference evidence and served-source dumps                                                                                               | `evidence-dumps/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Responsive thresholds                                                                                                                        | `docs/reference/breakpoints.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Typography, text-font assets, and icon-font ownership                                                                                        | `docs/reference/font-contract.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Room-setting schema                                                                                                                          | `scripts/extract-manage-schema.mjs`, using `evidence-dumps/login-page/manage` through `scripts/outline.mjs`, generates `src/lib/room-settings-schema.ts`; `pnpm schema:verify` enforces exact bytes                                                                                                                                                                                                                                                                                                                                         |
| JavaScript package manager, repository workspace/build allow-list, and resolved JavaScript dependencies                                      | `package.json#packageManager`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Frontend quality, browser, coverage, and JavaScript security gates                                                                           | `package.json#scripts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `vite.config.ts`, `playwright.config.ts`, `.github/workflows/quality.yml`, and `.github/workflows/security.yml`                                                                                                                                                                                                                                                                                                                                               |
| Rust toolchain, workspace manifest, and resolved Rust dependencies                                                                           | `services/rust-toolchain.toml`, `services/Cargo.toml`, and the sole workspace lock `services/Cargo.lock`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Developer server and preview port                                                                                                            | `vite.config.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Control-plane database schema and bootstrap DDL                                                                                              | `src/lib/server/db/schema.ts` and `src/lib/server/db/ddl.js`; changes must keep them consistent. The DDL is forward-only and idempotent in both halves — every CREATE is `IF NOT EXISTS`, every ALTER is `ADD COLUMN IF NOT EXISTS` — and neither path may reset or delete data                                                                                                                                                                                                                                                             |
| Control-plane database connection and bootstrap                                                                                              | `src/lib/server/db/index.ts`. Application code MUST reach the database through `getDb()` at operation time and MUST NOT connect in a server module's static import graph, because SvelteKit can evaluate a matched route module before `handle` rejects the request. Concurrent bootstrap is serialised by the transaction-scoped `pg_advisory_xact_lock`; the session-scoped form MUST NOT be used, because a transaction-mode pooler may move the backend between statements. Architecture scope and recovery remain governed by ADR 0003 |

Conflict resolution:

1. Security, privacy, and data-integrity requirements win over visual fidelity.
2. Within captured evidence, use the precedence rules in the reference index.
3. A more recent accepted architecture decision may supersede this document only
   when it names the exact section being superseded and this document is updated
   in the same change.
4. Ambiguity is a gap to document and test, not permission to guess.

## 2. Definition of done

A change is complete only when all applicable items are true:

1. The behavior and acceptance criteria are explicit.
2. Trust boundaries, failure modes, accessibility, responsive states, and data
   migration impact were considered before implementation.
3. The smallest coherent vertical slice was implemented; unrelated refactors are
   excluded.
4. New behavior has tests at the lowest useful layer and at every material
   boundary or regression point.
5. `pnpm quality` passes without ignored diagnostics, skipped tests, or reduced
   assertions.
6. Every modified `.svelte` file passes the official Svelte autofixer with no
   issues or suggestions.
7. Evidence-backed UI changes cite their original source; intentional deviations
   state the reason and user impact.
8. Documentation and the authority table are updated when a contract changes.
9. Operationally significant changes define observable failure signals and a
   rollback or recovery path.

Passing automated checks is necessary, not sufficient. Reviewers still assess
correctness, security, maintainability, and evidence quality.

## 3. Svelte 5 component standard

Official framework guidance is authoritative. Start with the Svelte documentation
for [runes](https://svelte.dev/docs/svelte/what-are-runes),
[state](https://svelte.dev/docs/svelte/$state),
[derived state](https://svelte.dev/docs/svelte/$derived),
[effects](https://svelte.dev/docs/svelte/$effect),
[props](https://svelte.dev/docs/svelte/$props), and
[TypeScript](https://svelte.dev/docs/svelte/typescript).

- New components MUST use Svelte 5 runes. Legacy `$:`, `export let`,
  `createEventDispatcher`, `on:event`, and slots MUST NOT be introduced.
- Props MUST have an explicit TypeScript contract. Snippet props use `Snippet`;
  native element wrappers use types from `svelte/elements`.
- Props MUST NOT be mutated. Child-to-parent communication uses typed callbacks;
  `$bindable` is reserved for genuinely shared ownership.
- `$derived` is for pure computation. It MUST NOT perform I/O, mutate other state,
  or depend on hidden globals.
- `$effect` is an escape hatch for synchronizing with external systems. It MUST
  NOT be used to derive state, repair render ordering, or create state-update
  cycles.
- Browser-only work belongs in event handlers, actions/attachments, or a clearly
  justified client lifecycle boundary. SSR evaluation MUST remain safe.
- Component state stays local unless multiple owners demonstrably need it. Shared
  reactive logic belongs in a typed `.svelte.ts` module or context with explicit
  ownership and lifecycle.
- Keyed lists use stable domain identifiers, not array indexes, when identity
  matters.
- Components SHOULD remain focused. Extract a component or domain helper when a
  file mixes unrelated responsibilities, not merely to reduce line count.

## 4. SvelteKit application standard

Use the official guidance for
[web standards](https://svelte.dev/docs/kit/web-standards),
[loading data](https://svelte.dev/docs/kit/load),
[form actions](https://svelte.dev/docs/kit/form-actions),
[state management](https://svelte.dev/docs/kit/state-management), and
[server-only modules](https://svelte.dev/docs/kit/server-only-modules).

- Route data comes from typed `load` functions. Privileged data loads from
  `+page.server.ts` or `+layout.server.ts`.
- Mutations use typed SvelteKit form actions and standard `FormData` semantics by
  default. Progressive enhancement MAY improve UX but the server submission MUST
  remain the correctness path.
- Server-rendered editable inputs MUST preserve values entered before hydration.
  Use Svelte's native `bind:value`/`bind:group` hydration paths (with an
  `undefined` action-data seed when appropriate); do not drive editable controls
  with dynamic `value`/`checked` attributes or write over a contenteditable from
  an attachment. An audited contenteditable sink may explicitly adopt a
  pre-hydration DOM value. Never reflect passwords, and cover each pattern with
  a client-script-delayed browser regression.
- `+server.ts` is for an actual HTTP/API contract, not a substitute for form
  actions or direct server-side function calls.
- Request- or user-specific state MUST NOT live in mutable server module scope.
  Pass state through `event.locals`, load data, form results, cookies, or the
  database.
- URL-derived state remains in the URL or `$app/state`; do not duplicate it into a
  stale client store.
- Use `$app/paths` for internal links and asset base-path correctness.
- Redirects and expected HTTP failures use SvelteKit primitives. Unexpected errors
  are logged server-side without leaking internal details to the client.
- Server route modules and everything in their static import graph MUST be free
  of database, filesystem, network, and other externally observable I/O during
  module evaluation. SvelteKit may evaluate a matched route before `handle` can
  reject the request. Perform I/O only inside explicit lifecycle functions,
  loads, actions, request handlers, or operation-time helpers. A newly added
  control-plane route also extends the fail-closed HTTP regression matrix.

## 5. Dependency and trust boundaries

The allowed dependency direction is:

```text
routes/components -> $lib domain modules -> $lib/server -> database/external systems
```

- Client-reachable modules MUST NOT import `$lib/server`, private environment
  variables, database code, password/JWT logic, or Node-only APIs.
- Database, authentication, authorization, secret handling, and privileged input
  validation MUST live in `$lib/server` or server route files.
- Authentication establishes identity. Authorization is checked separately at
  every protected read and mutation, using account/room ownership at the query or
  repository boundary.
- Domain behavior belongs in a domain or repository module, not duplicated across
  route actions and components.
- Circular dependencies and barrel exports that conceal server/client boundaries
  are prohibited.
- pnpm is the sole JavaScript/Node package manager. `package.json#packageManager`
  MUST pin it and `pnpm-lock.yaml` MUST be the only JavaScript dependency
  lockfile. Repository instructions, automation, and nested JavaScript scripts
  MUST use pnpm; npm, Yarn, and Bun commands or lockfiles MUST NOT be introduced.
- Cargo is the Rust workspace authority under `services/`. The repository-pinned
  toolchain and `--locked` commands MUST be used, and `services/Cargo.lock` MUST
  be the only Rust dependency lockfile. Nested crate lockfiles are prohibited
  because Cargo ignores them when those crates are workspace members.

## 6. TypeScript standard

- Strict mode remains enabled. New code MUST NOT use `any`, non-null assertions as
  a substitute for validation, `@ts-ignore`, broad type casts, or untyped public
  APIs.
- `unknown` is narrowed at trust boundaries with explicit validation.
- Route handlers, loads, and actions use generated `./$types` contracts.
- Prefer discriminated unions and exhaustive handling for state machines and
  result types.
- Type-only imports use `import type`.
- Do not use TypeScript runtime constructs unsupported by Svelte's type-only
  transpilation inside components.
- Suppressing a diagnostic requires an accepted exception as defined in section
  13; convenience is not justification.

## 7. Security and privacy

- Treat every request, form field, URL parameter, cookie, header, and database
  value as untrusted until validated for its use.
- Every mutation performs server-side authentication, authorization, validation,
  and output encoding/sanitization where applicable.
- Infrastructure secrets, passwords, session material, and raw tokens use private
  environment access and MUST NOT enter load data, serialized errors, logs, HTML,
  client bundles, or repository files. The sole exception is a customer-owned API
  credential whose product function requires delivery to its authenticated owner;
  it follows the encryption, account scoping, and no-store controls in ADR 0002.
- Session cookies MUST use the strongest compatible `HttpOnly`, `Secure`,
  `SameSite`, path, and lifetime settings. Passwords remain slow-hashed; tokens
  are short-lived, audience-scoped, and minimally privileged.
- Rich HTML passes through the shared repository allowlist before browser
  preview and is sanitized again on the server before persistence. Only the
  branded `SanitizedHtml` component may write HTML into the DOM; route and
  feature components do not use direct `{@html}` sinks.
- Logs MUST NOT contain passwords, secrets, raw tokens, unnecessary personal
  data, or captured reference PII.
- Security-sensitive behavior requires negative tests: wrong owner, missing
  session, malformed input, replay/expiry where relevant, and information leakage.

## 8. Data integrity

- Schema changes are additive and migration-aware. Destructive or lossy changes
  require a backup, explicit rollout plan, and tested recovery path.
- Multi-write invariants use a transaction.
- Database constraints enforce durable invariants; application validation improves
  errors but does not replace constraints.
- Queries are scoped by tenant/account ownership at the database or repository
  boundary, not filtered after loading unrestricted rows.
- Generated schemas are changed through their generator. Generator output must be
  deterministic and its verification run in the same change.
- The room-setting schema has one generator authority:
  `scripts/extract-manage-schema.mjs`. It deterministically produces 267
  evidence-extracted settings plus the reviewed `roomType` product deviation,
  for 269 total. Its exact 33-setting `wired` set is explicit generator input,
  never recovered from prior output. Run `pnpm schema:extract` to regenerate and
  `pnpm schema:verify` to prove clean-path, working-directory-independent,
  byte-for-byte reproducibility. Hand edits to the generated TypeScript are
  prohibited.

## 9. Evidence-backed UI fidelity

- Captured source, computed styles, rects, and interaction traces outrank memory,
  defaults, and contemporary design preference.
- Every exact claim must be traceable to a local reference or a content-hashed
  original. Unverified behavior is labeled as such.
- Breakpoints come only from `docs/reference/breakpoints.md` and are enforced by
  `pnpm breakpoints:verify`.
- Typography and icon-face selection come only from
  `docs/reference/font-contract.md`. A package-manager convention or generic
  font recommendation MUST NOT override a captured family, weight, binary, or
  visual-system boundary.
- Do not “normalize” anomalous source values. Preserve them or record an explicit
  product/security/accessibility deviation.
- Tenant-specific feature flags in a capture prove only what that captured
  account could see. They do not remove the capability from the product. Build
  implemented capabilities and derive visibility from the server-side account
  entitlement policy; future route authorization must enforce that same policy.
- Before persisted roles, attributes, and subscription plans exist, every
  implemented entitlement resolves to enabled. Room integration settings report
  configuration readiness only; they are not access-control inputs. RBAC/ABAC
  must later replace the centralized resolver and enforce decisions server-side.
- Accessibility fixes may intentionally differ from the reference. Document the
  observed defect, semantic correction, and visual impact.

## 10. Accessibility and web platform

Follow SvelteKit's
[accessibility guidance](https://svelte.dev/docs/kit/accessibility) and prefer
native HTML behavior over custom emulation.

- Interactive controls use the correct native element and support keyboard,
  focus, name, role, and state without pointer-only behavior.
- Forms have programmatic labels, useful autocomplete attributes, field-level
  errors, and a discoverable submission/result state.
- Modals trap focus, restore focus, provide an accessible name, close on supported
  escape behavior, and isolate background interaction.
- Images have meaningful alternative text or an empty alt when decorative, plus
  intrinsic dimensions when known.
- Motion respects reduced-motion preferences when motion is nonessential.
- `svelte-check` accessibility warnings are errors in practice and the quality
  gate runs with `--fail-on-warnings`.

## 11. Testing strategy

Tests prove contracts, not implementation trivia.

- Pure domain rules: colocated Vitest unit tests.
- Repositories and authorization: integration-style tests against an isolated
  database, including cross-tenant denial.
- Components with meaningful state: behavior tests at their public interface.
- Critical user journeys: browser tests at representative responsive boundaries.
- Evidence-derived regressions: focused verification scripts or fixtures with the
  evidence source named.
- Every bug fix begins with or includes a regression test that fails for the
  original defect.

Current executable gate:

```bash
pnpm quality
```

It runs ESLint; scoped Prettier verification; zero-warning Svelte/TypeScript
diagnostics; deterministic room-schema, source-evidence, privacy, breakpoint,
account, home, font, room-login, and fail-closed HTTP contracts; the imported
migration-byte and 98-file provenance seal and the credential-free API
release-artifact contract, through `backend:migrations:verify` and
`backend:release:verify` in the `test` chain; the documented-Vitest-total
contract, which measures the live suite and rejects a stale count in the SSOT,
cutover plan, or conformance audit; Vitest with ratcheted V8 coverage
thresholds; Playwright across Chromium, Firefox, WebKit, and the evidence-backed
responsive matrix; and an adapter-vercel production build. The same command runs
on pull requests, merge queues, and `main` through
`.github/workflows/quality.yml` with a frozen pnpm graph, exact CI Node and pnpm
releases, commit-pinned official actions, an exact three-engine browser install,
retry-classified flakes treated as failures, and retained coverage/browser
artifacts.

Prettier does not rewrite `src/**/*.svelte`: captured whitespace participates in
measured inline geometry. Those components remain enforced by ESLint,
`svelte-check`, the mandatory official Svelte autofixer, source/breakpoint
contracts, and browser evidence. Generated schemas, raw evidence, static assets,
service workspaces, dependency graphs, and build/test outputs are also excluded
from formatting by their owning authorities rather than silently rewritten.

`.github/workflows/security.yml` separately enforces pull-request dependency
review, a high-severity pnpm advisory audit, and Gitleaks 8.30.1 across every
reachable Git revision. The Gitleaks archive and the exact 25-fingerprint legacy
baseline are checksum-pinned. The baseline is not remediation: it permits no
path, rule, regex, or commit-wide allowlist, and the owner-authorized public
history rewrite remains an open cutover gate.

The independently deployable Rust workspace has a separate bounded local gate and
a real-database CI gate:

```bash
pnpm backend:check
pnpm backend:advisories
pnpm backend:licenses
pnpm backend:release:verify
pnpm backend:postgres:attest --format json
```

`backend:check` pins the imported migration bytes, formats the Rust workspace,
checks locked binary targets, runs the 112-test media library suite, and compiles
all API test targets with the test-only tenancy feature. It explicitly does not
claim PostgreSQL execution. `backend:advisories` and `backend:licenses` are
separate RustSec and resolved-license/source policy gates; they are not silently
included in `backend:check` or `quality`.
`backend:release:verify` is the credential-free static contract for the API
Dockerfile, immutable Syft/Grype pins, vulnerability decision policy, and hosted
artifact retention. Because it needs no credentials, container runtime, or Rust
toolchain, it and `backend:migrations:verify` are the two commands in this list
that `pnpm quality` does run, through the `test` chain in `package.json#scripts`;
`backend:check`, `backend:advisories`, `backend:licenses`, and
`backend:postgres:attest` are not run by `quality` and must be invoked
separately. `backend:postgres:attest` is a read-only promotion command,
not a local default: it requires separately injected owner/runtime URLs and emits
redacted proof of PostgreSQL 17 identity, role, migration, RLS, ACL, and LISTEN
invariants. When run, the configured backend workflow binds its passing JSON hash
into the API image SBOM/vulnerability evidence bundle. Protected run
[`30833857437`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30833857437)
produced that proof for exact default-branch revision `dac88f1…`, retaining
bundle `api-release-evidence-dac88f1…-30833857437-1` until 2026-09-02. Signature
and provenance attestation, registry publication, and rehearsed rollback remain
out of scope for this slice. The exact contract and limits live in
`ops/api-release-artifact-evidence.md` and
`ops/postgres-runtime-role-hardening.md`.

The final imported-service baseline verification ran against PostgreSQL 17 with
the exact owner/runtime-role split, all migrations, and the committed two-tenant
fixture: 155 API library tests, 116 API PostgreSQL integration tests, 110 media
library tests, and the then-current 2 media binary tests passed. This hardening
branch separately passes the 112-test media library gate, 11 media binary tests,
9 release-attestor tests, and strict full-workspace Clippy with warnings denied.

On 2026-08-08 that branch stopped relying on "API test-target compilation" and
ran the API suite itself, against the same boundary CI builds: PostgreSQL 17.10
in the digest-pinned image, both roles provisioned by
`services/docker/postgres/10-provision-roles.sh`, the migration chain applied as
owner to the primary and to the independent cross-cluster negative control, and
`api/fixtures/seed.sql` loaded. 413 tests passed and none failed — 155 API
library, 126 API PostgreSQL integration across ten binaries, 9 release-attestor,
112 media library, and 11 media binary. Compilation was never the claim worth
making; this is. Its `pnpm quality` also passed: lint and formatting,
zero-error/zero-warning Svelte diagnostics,
all quality-gate source contracts and the fail-closed runtime HTTP contract, 1204
Vitest tests, 20 Playwright tests across Chromium, Firefox, WebKit, and responsive
Chromium with flaky-test rejection enabled, and the Vercel production build.
The count rose from 116 to 129 when reCAPTCHA gained the server-side verification it
had never had: 13 cases covering the three configuration states and every fail-closed
path, including the half-configured pair that is now a startup error.

The Vitest count fell from 138 to 116 when the control plane moved from SQLite to
PostgreSQL: `private-sqlite.test.ts` and its 22 cases covered the ownership and
permission hardening of a local database file, and retired with the module they
tested. No assertion was weakened or removed; the surface they guarded no longer
exists, and the runtime HTTP contract now proves the schema bootstrap instead.
These are precisely scoped local source-tree results; the protected hosted
PostgreSQL workflow remains the current-branch full-suite authority and is not
inferred from the earlier baseline or deployed-Vercel evidence.
`.github/workflows/backend-quality.yml` recreates that database boundary and runs
Clippy with warnings denied plus the full Rust suite. Hosted run
[`30767258722`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30767258722)
passed for exact default-branch revision
`0a97fb1bb375e84e08591e85e6d932d8b503e9b6`, including PostgreSQL, migration,
fixture, format, Clippy, full-test, advisory, license, and provenance gates.

`.github/workflows/deployed-smoke.yml` adds best-effort scheduled and manually
triggered checks for the official-domain containment contract and the Stage 1
media boundary. Its deployment-owned inputs include both `MEDIA_SMOKE_ORIGIN` and
`MEDIA_SMOKE_BROWSER_ORIGIN`. Stage 1 runs exact deployed revision
`0a97fb1…` as immutable image
`sha256:688418950d09350b78457382ad7ce4189243a0c1073bd47ae0286723d21438a9`.
The public verifier proves its bounded health/TLS/redirect contract and a six-case
Origin/Fetch Metadata rejection matrix. A separate fail-safe probe using an
in-memory ephemeral signer proved current-image valid-grant `101`, expiry
rejection, the four-socket bearer-replay ceiling, exact environment restoration,
and zero residual probe state. It does not prove the future control-plane
signer/key delivery, RTP, TURN, or a real-device session. A scheduled GitHub
workflow is synthetic evidence, not an uptime SLA. Hosted deployed-smoke run
[`30768966585`](https://github.com/billyribeiro-ux/trading-app-main/actions/runs/30768966585)
passed both production containment and the Stage 1 media contract on exact
default-branch revision `cc99267a3dea445e35e052b8b1db171ccef4fe73`.

Production promotion remains independently blocked by the statically linked
OpenSSL 3.0.8 native dependency recorded in
`ops/backend-supply-chain-review.md`, regardless of RustSec, deployment identity,
or historical container-base scan results.

Application error monitoring with an owner-verified alert destination remains an
explicit release gap. Hosted closure is now proven separately from local results:
PR-head revision `24f01ff…` passed Quality `30775629743`, Backend quality
`30775629747`, and Security `30775629745`, including the pull-request-only
dependency review. Exact merged-main revision `9968bd6…` passed Quality
`30776711719`, Backend quality `30776711733`, push-applicable Security
`30776711714`, Vercel deployment, and deployed production/media smoke
`30776842719`. Strict protected-branch freshness, admin enforcement, linear
history, conversation resolution, and force-push/deletion bans remain enabled;
all five first-party quality/backend/security contexts are required.

The 2026-08-03 hardening release closed the same boundary again. PR-head
revision `e964448…` passed all five required contexts, including backend run
`30831059537` and the pull-request-only dependency review. Exact merged-main
revision `dac88f1…` then passed Quality `30833857419`, Backend quality
`30833857437`, push-applicable Security `30833857672`, Vercel production
deployment, and deployed production/media smoke `30834512670`, with the
scheduled smoke re-passing on the same revision through 21:15 UTC. That backend
run is the current authority for the full PostgreSQL 17 row-level-security
suite, the emitted redacted attestation, and the retained credential-free API
release-evidence bundle; a scheduled synthetic check remains evidence, not an
uptime SLA. The point-in-time record is `docs/STATUS-2026-08-03.md`.

## 12. Performance and operations

- Measure before optimizing. Record the metric, workload, and before/after result
  for performance claims.
- Avoid accidental waterfalls in load functions; parallelize independent I/O and
  keep serialized page data minimal.
- Static assets SHOULD use Vite imports when hashing is beneficial; truly stable
  public filenames belong in `static`.
- Production-significant server operations need structured, privacy-safe logs and
  enough context to correlate a failure without exposing secrets.
- External calls define timeouts, bounded retries only when safe, and explicit
  failure behavior.
- A rollout that can corrupt data or block authentication requires a rehearsed
  rollback/recovery path.

## 13. Exceptions and architectural decisions

An exception must be explicit, narrow, and temporary. Record:

- the rule being excepted;
- concrete evidence and rationale;
- risk and affected scope;
- compensating control;
- owner or decision-maker;
- removal condition or review date.

Material, durable decisions belong in `docs/decisions/NNNN-short-title.md` and must
update the authority table when they change an SSOT. “Existing code does it” and
“the framework usually does this” are not evidence.

## 14. Review standard

Review in this order:

1. correctness and invariant preservation;
2. authentication, authorization, privacy, and data integrity;
3. failure modes, observability, and recovery;
4. Svelte/SvelteKit lifecycle and server/client boundary correctness;
5. accessibility and responsive behavior;
6. tests and evidence traceability;
7. maintainability and performance;
8. style and naming.

Review comments identify the violated contract, failure scenario, and required
outcome. Preference-only feedback is labeled non-blocking.
