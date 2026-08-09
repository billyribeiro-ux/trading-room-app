# Svelte 5 / SvelteKit 2 conformance audit

Status: **agent-facing implementation reference**  
Audit date: **2026-08-02**  
Repository baseline: Svelte 5.56.8, SvelteKit 2.70.2, adapter-vercel 6.3.4,
TypeScript strict mode, pnpm 11.18.0

Read this after `docs/ENGINEERING-SSOT.md` and before changing framework,
route, component, environment, or server-boundary code. The SSOT remains the
normative engineering policy; this file records the evidence, findings, changes,
exceptions, and rerun procedure for the repository-wide framework audit.

## 1. Evidence and scope

The official Svelte MCP `list-sections` result was read first. Every returned
documentation path was then retrieved with `get-documentation`, in that exact
order, from the first path (`ai/overview`) through the last
(`svelte/legacy-component-api`).

| Corpus                                  |   Paths | Retrieval result               |
| --------------------------------------- | ------: | ------------------------------ |
| AI integration documentation            |      16 | 16 successful                  |
| Svelte CLI and add-ons                  |      22 | 22 successful                  |
| SvelteKit guides and reference          |      72 | 72 successful                  |
| Svelte guides, API and legacy reference |      86 | 86 successful                  |
| **Total**                               | **196** | **196 successful; 0 failures** |

The complete ordered path ledger is
[`docs/reference/OFFICIAL-SVELTE-DOCS-MANIFEST.md`](reference/OFFICIAL-SVELTE-DOCS-MANIFEST.md).
The retrieval processed 1,178,024 documentation characters. This is a dated
review record, not a vendored copy of the living documentation.

Primary current authorities used to decide changes:

- [Svelte best practices](https://svelte.dev/docs/svelte/best-practices)
- [SvelteKit project structure](https://svelte.dev/docs/kit/project-structure)
- [SvelteKit environment variables](https://svelte.dev/docs/kit/environment-variables)
- [SvelteKit state management](https://svelte.dev/docs/kit/state-management)
- [SvelteKit form actions](https://svelte.dev/docs/kit/form-actions)
- [SvelteKit server-only modules](https://svelte.dev/docs/kit/server-only-modules)
- [SvelteKit hooks](https://svelte.dev/docs/kit/hooks)
- [SvelteKit errors](https://svelte.dev/docs/kit/errors)
- [SvelteKit accessibility](https://svelte.dev/docs/kit/accessibility)
- [SvelteKit SEO](https://svelte.dev/docs/kit/seo)
- [SvelteKit images](https://svelte.dev/docs/kit/images)
- [SvelteKit generated types](https://svelte.dev/docs/kit/types)

Documentation for unimplemented or platform-inapplicable capabilities was still
reviewed and classified, but it does not create work merely by existing. Examples
include custom adapters, Cloudflare/Netlify/Vercel adapters, service workers,
packaging libraries, custom elements, remote functions, shallow routing,
snapshots, experimental async Svelte, and experimental tracing. Enabling an
unused experimental or platform-specific facility would not be conformance.

## 2. Repository placement decision

The authored tree conforms to the documented SvelteKit structure:

| Location                   | Ownership and placement decision                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`              | Route groups and route files only. `(public)`, `(app-auth)`, and `(app)` organize chrome/auth concerns without changing URLs.                       |
| `src/lib/components/`      | Reusable UI components; home-only reusable sections are grouped under `components/home/`.                                                           |
| `src/lib/content/`         | Checked-in, nonreactive content constants.                                                                                                          |
| `src/lib/server/`          | Database, authentication, authorization, secret handling, server-side persistence enforcement, and server-only domain policy.                       |
| `src/lib/sanitize-html.ts` | Shared browser/server rich-HTML allowlist; the server wrapper reapplies it before persistence.                                                      |
| `src/lib/server/db/`       | Drizzle schema, connection/bootstrap, and matching idempotent DDL.                                                                                  |
| `src/env.ts`               | Typed explicit SvelteKit environment contract.                                                                                                      |
| `src/hooks.server.ts`      | Server initialization, request identity, and unexpected-error boundary.                                                                             |
| `src/*.css`                | Active global evidence-derived styles imported by the root layout or the two room-entry pages. Their root placement makes global ownership visible. |
| `static/`                  | Exact, stable-name captured assets whose URL and bytes are part of fidelity contracts.                                                              |
| colocated `*.test.ts`      | Vitest tests beside the domain modules they prove, as documented by SvelteKit.                                                                      |
| `scripts/`                 | Capture, extraction, and executable evidence/contract tooling; never bundled into the app.                                                          |
| `docs/`                    | Normative policy, architecture, decisions, audits, and decoded reference material.                                                                  |
| `evidence-dumps/`          | Raw external evidence, isolated from application source and verified by `evidence:verify`.                                                          |

Generated or machine-local trees remain ignored: `node_modules/`, `.svelte-kit/`,
`build/`, `.data/`, `.env`, and `.DS_Store`. Two existing `.DS_Store` files were
removed. The unused prototype `src/controller.css` and generated, non-runtime
`src/room-tokens.css` were moved to `docs/reference/css/`; the unused duplicate
`EditableField.svelte` component was removed. No active import depended on any of
the three.

## 3. Corrections made

### Framework and environment boundary

- `svelte.config.js` enables the current documented
  `experimental.explicitEnvironmentVariables` API, which becomes the default in
  SvelteKit 3.
- `src/env.ts` is now the sole application environment declaration. Valibot
  schemas explicitly model optional local values and validate the optional room
  URL. Private and public application imports now use `$app/env/private`,
  `$app/env/public`, and `$app/env`.
- `src/lib/server/db/index.ts`, `src/routes/(app)/account/+page.server.ts`,
  `src/routes/(app)/launch/[id]/+server.ts`, `src/lib/components/Recaptcha.svelte`,
  and `src/lib/animate-once.ts` were migrated from the pre-Kit-3 modules.
- `valibot@1.4.2` was added as the documented Standard Schema implementation.
  The unused `drizzle-kit` development dependency was removed; no script or
  source imported it.

### SSR state, hooks, and errors

- The module-scoped login-attempt `Map` was removed from
  `src/routes/(public)/login/+page.server.ts`. It was user-specific mutable SSR
  state and violated the official state-management rule.
- Durable `login_attempts` storage was added consistently to
  `src/lib/server/db/schema.ts` and `src/lib/server/db/ddl.js`. Pure window policy
  lives in `src/lib/server/login-attempts.ts` with regression tests in
  `login-attempts.test.ts`.
- Database bootstrap now uses the documented `ServerInit` hook.
- `handleError` returns a safe correlation id and writes a privacy-minimized
  server record. `App.Error` is declared in `src/app.d.ts`.
- The contact action no longer logs names or email addresses. The room-launch
  configuration error no longer exposes a private environment-variable name.

### Svelte 5 component model

- Route layouts/pages now use generated `LayoutProps` and `PageProps`, including
  action data, instead of manually rebuilding generated prop contracts.
- Nonreactive DOM handles in the account page, manage page, and rich-text editor
  are plain variables. An unused `$state`/`bind:this` pair was removed.
- All `class:` directives were replaced with the current clsx-style `class`
  arrays/objects while preserving emitted class names and order.
- The Bootbox `.svelte.ts` state machine now uses a discriminated union instead
  of resolver casts and enforces its browser-only mutation boundary. It is safe
  as a singleton because no server request can mutate it; if server-originated
  modal state is ever introduced, replace it with scoped context.
- All 30 current `.svelte` files and the one `.svelte.ts` rune module passed the official
  Svelte autofixer with zero issues and zero suggestions.

### Assets, accessibility, and metadata

- Static component assets now pass through `$app/paths.asset`; internal links
  continue to use `resolve`. The emitted root URLs and underlying bytes remain
  unchanged.
- `src/app.html` now points at the real checked-in icon instead of a nonexistent
  `/favicon.png`.
- Every `+page.svelte` has a unique descriptive title and meta description,
  including the previously untitled joined-room page.
- Informative marketing images have descriptive alternative text. Feature icons
  adjacent to equivalent headings have empty alternative text. New-tab links
  carry `noopener noreferrer`.
- The hero, feature, and account accessibility edits are nonvisual and do not
  alter evidence-backed geometry, breakpoints, image bytes, or copy.

### Audited HTML boundary

- The API reference no longer exposes a general `{@html}` sink in a route page.
  `src/lib/sanitize-html.ts` is the one allowlist/branding implementation and
  `src/lib/components/SanitizedHtml.svelte` is the single raw-HTML boundary. It
  uses the official `createRawSnippet` API to render the actual `div` root, so the
  canonical branded value is present in SSR instead of appearing only after an
  attachment runs. Its setup contract installs the typed handlers and capture
  attachment. Because Svelte's snippet markers sit outside that root, editing the
  contenteditable DOM before hydration cannot delete the claimed range. A
  direct-DOM `$effect` deliberately leaves that first adopted value alone, then
  applies later branded server-seed changes because `createRawSnippet` itself is
  mount-only. The editor uses the shared allowlist before changing its raw-HTML
  preview; the server-only wrapper reapplies that same allowlist before
  persistence, so the browser remains defense in depth rather than the security
  boundary.
- Svelte's raw-snippet hydration adoption preserves a contenteditable DOM value
  entered before the client starts. The editor defensively removes unsupported
  comment nodes when serializing the DOM; the allowlist already discards
  user-authored comments and `data-*` attributes. Negative
  sanitizer tests cover event handlers, executable URL schemes, embedding tags,
  unsafe CSS, malformed nesting, data-URL restrictions, hostile `rel="opener"`,
  and the required empty alternative text for otherwise-unlabelled images.

## 4. Fidelity and breakpoint preservation

No responsive threshold was added, removed, or normalized. The breakpoint SSOT
remains `docs/reference/breakpoints.md`; `scripts/verify-breakpoints.mjs` proves
the active CSS against it.

The static-asset decision intentionally differs from the general recommendation
to hash imported assets. The captured filenames, image bytes, and public URLs are
product evidence and executable contracts. `$app/paths.asset` provides base-path
correctness without replacing those stable assets. The home contract proves:

- 9 evidence/content hashes, including the exact self-hosted Roboto v51/300 binary;
- exact hero PNG metadata: 1440×956, 712,178 bytes;
- 10 responsive viewport calculations from 320 through 2205 CSS pixels;
- original grid, copy, and breakpoint cascade assertions.

The general Svelte recommendation to replace actions with attachments does not
replace SvelteKit's specific `use:enhance` form API. Existing enhanced forms keep
native POST correctness and use the API prescribed by the form-actions guide.

## 5. Dependency evidence and residual risk

The registry and audit command names in this section and the two dated
verification tables below are historical evidence from before the repository
migrated to pnpm. They record what was actually run and MUST NOT be copied as
current instructions. pnpm is now the sole JavaScript package manager; use `pnpm audit` for
a current advisory check and the commands in section 7 for a rerun.

On 2026-08-02, npm registry checks returned the exact installed versions for
Svelte 5.56.8, SvelteKit 2.70.2, adapter-node 5.5.7, and
`@sveltejs/vite-plugin-svelte` 7.2.0. Vite 8.2.0 and TypeScript 7.0.2 were newer
than the pinned Vite 8.1.5 and TypeScript 6.0.3, but the official Svelte docs do
not require newest-version upgrades. They were not mixed into a conformance
change without a compatibility migration and evidence.

`npm audit` fell from 7 findings (3 low, 4 moderate) to 3 low findings after the
unused `drizzle-kit` chain was removed. That historical remainder was the
transitive `cookie <0.7.0` chain in SvelteKit. The current latest SvelteKit
2.70.2 still declares `cookie ^0.6.0`, so `pnpm-workspace.yaml` now owns a narrow
`cookie 0.7.2` override for `GHSA-pxg6-pf52-xh8x`. The patched version preserves
the 0.x API used by Kit while rejecting out-of-bounds cookie name/path/domain
bytes. Full `pnpm quality` is the compatibility proof; remove the override when
SvelteKit raises its range.

`pnpm audit --audit-level high` passed on 2026-08-02. The hosted security workflow
enforces that high-severity floor, introduced-dependency review on pull requests
and merge queues, and checksum-pinned full-history Gitleaks. The dependency-review
job still requires the repository Dependency Graph to be enabled, and no hosted
result is inferred before the exact revision runs. ESLint, scoped Prettier
verification, ratcheted Vitest coverage, and Playwright across Chromium, Firefox,
WebKit, and responsive Chromium are now installed and included in `pnpm quality`;
they are no longer capability gaps.

## 6. Verification record

Historical pre-pnpm result on 2026-08-02: **PASS**.

| Gate                                    | Result                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `npm run quality`                       | passed                                                             |
| `svelte-check --fail-on-warnings`       | 0 errors, 0 warnings                                               |
| Evidence archive contract               | passed                                                             |
| Breakpoint contract                     | passed                                                             |
| Authenticated account source contract   | passed                                                             |
| Home fidelity contract                  | passed: 8 hashes, exact 1440×956 PNG, 10 responsive calculations   |
| Room-login identity/typography contract | passed                                                             |
| Vitest                                  | 7 files, 44 tests passed                                           |
| adapter-node production build           | passed                                                             |
| Official Svelte autofixer               | 30/30 current `.svelte` and 1/1 `.svelte.ts` clean                 |
| Live root                               | HTTP 200 at `http://127.0.0.1:5300/`                               |
| Live unauthenticated `/account`         | HTTP 303 to `/login`                                               |
| `npm audit`                             | 0 critical, 0 high, 0 moderate, 3 low (upstream current-Kit chain) |

## 7. Agent rerun procedure

For a future framework audit:

1. Read `AGENTS.md`, the engineering SSOT, this audit, and the ordered manifest.
2. Use the official Svelte MCP. Call `list-sections` first; diff its ordered paths
   against the manifest. Retrieve every added or changed path plus every path
   applicable to the change.
3. Inventory with `rg --files -uu`, separately classifying authored, generated,
   machine-local, evidence, and dependency files. Never treat generated trees as
   authored source.
4. Search for legacy syntax, unkeyed lists, nonreactive `$state`, server module
   state, unsafe HTML, private imports in client code, raw internal paths, missing
   route titles, and browser globals evaluated during SSR.
5. Preserve `docs/reference/breakpoints.md` and the pixel contracts unless new
   hard evidence supersedes them.
6. Run the official autofixer on every changed Svelte file until both arrays are
   empty, then run `pnpm quality` and a live HTTP smoke check.
7. Append findings and changes here; update the manifest and audit date only when
   a full-corpus rerun actually occurred.

## 8. Incremental account contract record — 2026-08-02

This was a scoped account-page correction, not a second full-corpus audit. The
official Svelte MCP sections used for the work were attachments, `{@attach}`,
basic markup, best practices, compiler warnings, SvelteKit accessibility, load,
server-only modules, form actions, and TypeScript. The full documentation
manifest date and corpus-completion claim therefore remain unchanged.

Hard evidence and resulting implementation:

- The authenticated source at
  `evidence-dumps/login-page/logged-in-page:78,83` proves the exact labels
  `Account Settings` and `Logout` with bottom placement. The Bootstrap rules at
  `evidence-dumps/NEXT-STEP/gaps/sheet-2.css:1397-1410` prove every reproduced
  visual value. `src/lib/bootstrap-tooltip.ts` owns an SSR-safe Svelte 5
  attachment; `AppNavbar.svelte` attaches it to both native controls. Hover and
  keyboard focus open a Bootstrap-shaped `role="tooltip"`; blur, pointer exit,
  and Escape remove `.in` and retain the node for the original 500ms fade
  cleanup, while component teardown removes it and its listeners immediately.
- The original versioned template binds complete `k.apiSecret` values. Account
  load no longer serializes `lastFour`, and the page contains no bullet-mask
  fallback. Complete encrypted display copies render verbatim. A legacy row with
  no display copy renders an explicit unavailable state and retains its explicit
  regeneration action; it is never silently rotated.
- The account search and both mutually exclusive Bootbox prompt branches now
  have stable `id` and `name` values. The source contract audits every
  `input`, `select`, and `textarea` in the account page and Bootbox component and
  fails if a future control has neither attribute. This is a nonvisual
  accessibility correction to defects preserved in the original source.

Verification result at that point: **PASS**, with one explicitly bounded
environment gap. The open-state evidence and browser result were supplied and
closed later in this same review; section 10 supersedes this interim boundary.

| Gate                              | Result                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Official Svelte autofixer         | modified `AppNavbar.svelte`, account `+page.svelte`, and `Bootbox.svelte`: 0 issues, 0 suggestions                             |
| `svelte-check --fail-on-warnings` | 0 errors, 0 warnings                                                                                                           |
| Account evidence/source contract  | passed, including tooltip DOM/CSS, unmasked-secret, and form-control assertions                                                |
| Live HTTP credential contract     | passed: temporary key rendered 64 characters, matched its stored verification hash, survived reload unchanged, and was removed |
| Database cleanup                  | passed: verifier left only the pre-existing legacy row                                                                         |
| `pnpm quality`                    | passed; 7 Vitest files / 44 tests and adapter-node production build                                                            |
| Breakpoint contract               | passed; no breakpoint changed                                                                                                  |
| In-app browser hover screenshot   | not run because the Browser connector reported no available browser                                                            |

The unavailable Browser connector does not turn into a visual claim: the
original evidence itself contains no open-tooltip rectangle or activation-delay
capture. The implementation is therefore bounded to the facts that do exist —
exact label, bottom placement, generated Bootstrap shape, and captured CSS — and
the missing open-state rectangle was an honest evidence gap at that point.

## 9. August 2026 official update review — 2026-08-02

The complete official post
[What's new in Svelte: August 2026](https://svelte.dev/blog/whats-new-in-svelte-august-2026)
and the linked
[SvelteKit 3 preview changelog](https://github.com/sveltejs/kit/blob/version-3/packages/kit/CHANGELOG.md)
were read before this implementation decision. SvelteKit 3 is explicitly a
`@next` preview, so this repository remains on pinned stable Kit `2.70.2`; mixing
preview conventions into the stable application would not be a best practice.

Stable-release findings applicable now:

- `src/env.ts` already uses `defineEnvVars`, and `svelte.config.js` deliberately
  enables Kit 2's explicit-environment-variable opt-in. Application imports use
  `$app/env`, `$app/env/private`, or `$app/env/public` consistently.
- `svelte-check` `4.7.4` exceeds the post's `4.7.3` threshold for automatic
  `+error.svelte` props. This repository has no authored `+error.svelte`, so
  there is no component migration to perform.
- `@sveltejs/vite-plugin-svelte` `7.2.0` contains the Inspector component-stack
  improvement highlighted by the post.
- The repository has no `.remote.*` modules or `$app/server` remote functions,
  so the new remote-form `submitted`, `dirty()`, and `touched()` APIs do not
  govern any current implementation.

The following are recorded migration work for a future accepted Kit 3 upgrade,
not changes to perform opportunistically:

1. Move adapter, preprocessing, explicit environment, and path configuration
   from `svelte.config.js` into `sveltekit({...})` in `vite.config.ts`.
2. Mechanically migrate the current `$lib` imports to Kit 3's `#lib` alias.
3. Change `tsconfig.json` from `./.svelte-kit/tsconfig.json` to the Kit 3
   generated-config location.
4. Add Kit 3's explicit external-redirect allow-list to the configurable
   `ROOM_BASE_URL` launch redirect.
5. Re-run HTTP contract tests for every form-action `fail(status, ...)` branch,
   because Kit 3 changes response-status behavior.

No current application import uses the Kit 3-removed `$app/paths` exports, the
deprecated navigation refresh/state functions, service-worker APIs, tracing, or
instrumentation. Every existing `error(...)` call provides a message. Those are
audited non-findings, not reasons to enable unused facilities.

## 10. pnpm, font, and navbar-tooltip closure — 2026-08-02

Package and typography recommendations were implemented as one bounded change:

- `package.json#packageManager` pins pnpm `11.18.0`; `pnpm-workspace.yaml`
  establishes the repository boundary and the only allowed native install
  scripts; `pnpm-lock.yaml` is the only JavaScript lockfile. All current commands and nested
  quality scripts use pnpm.
- The hero now self-hosts the exact Google-served Roboto v51 Latin normal-300
  WOFF2. The checked-in and live-served 37,520-byte files both hash to
  `0a44e0bb6ba5c8537e8814c148ef7755f1bce12112361231f595ecc584a18d7a`.
  The home route preloads only that above-the-fold face. No remote Google Fonts
  stylesheet or unproved Fontsource substitute remains.
- Font Awesome stays an icon system, not a heading font. FA4 `4.3.0` and FA5
  `5.8.1` are exact-pinned and retain their evidence-backed import order. The
  Helvetica Neue and Arial fallback stacks remain surface-specific system-font
  contracts; Lato is not added because the captured room chrome does not compute
  to it.
- The user's open-state tooltip crops, original Angular attributes, compiled
  Bootstrap rules, and captured trigger rectangles now form a closed contract.
  The original Angular UI Bootstrap 0.12.1 bundle proves sibling insertion,
  intrinsic `offsetWidth` measurement, and bottom centering. At `768px` and
  above, Account is constrained by its `96.4297px` navbar item and wraps to
  `Account` / `Settings`; below `768px`, it becomes an intrinsic one-line box.
  Logout remains one line at every audited width.

Final verification: **PASS**.

| Gate                                   | Result                                                                                                                                                                                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Svelte autofixer              | modified `AppNavbar.svelte` and public `+page.svelte`: 0 issues, 0 suggestions                                                                                                                                                                                             |
| `pnpm quality`                         | passed: zero-warning Svelte check, every source/evidence/font/breakpoint contract, 7 Vitest files / 44 tests, adapter-node production build                                                                                                                                |
| Home fidelity                          | passed: 9 hashes, exact 1440×956 hero PNG, 10 responsive calculations                                                                                                                                                                                                      |
| Font contract                          | passed: exact Roboto bytes/license/preload, pnpm SSOT, exact FA versions/import order                                                                                                                                                                                      |
| Live font delivery                     | HTTP 200, `font/woff2`, 37,520 bytes, expected SHA-256; production `build/client` copy has the same digest                                                                                                                                                                 |
| Navbar source contract                 | passed: original attributes/classes, responsive trigger-width positioning, Bootstrap DOM/CSS                                                                                                                                                                               |
| Rendered navbar contract               | passed in headless Chrome at DPR 2 and 320/767/768/1440px: Account 108.023px/one line below 768 and 96.219px/two lines at and above 768; Logout 53.789px/one line; exact intrinsic positioning, typography, color, opacity, padding, radius, arrow, and 500ms fade cleanup |
| Account responsive source-render audit | passed: 500/500 comparisons within 0.22 CSS px on both sides of every recorded width from 320 through 1989 CSS px                                                                                                                                                          |
| Live server                            | pnpm-managed Vite server at `http://127.0.0.1:5300/`                                                                                                                                                                                                                       |

The in-app Browser connector still had no available browser, so it was not
misreported as used. The repository's read-only CDP/Chrome harness performed the
rendered verification and wrote diagnostic crops to `/tmp`; it does not click
Logout, submit a form, or mutate account data.

## 11. Vercel adapter target — 2026-08-02

The production adapter was changed from `@sveltejs/adapter-node` `5.5.7` to the
official `@sveltejs/adapter-vercel` `6.3.4` at the user's explicit request. The
decision was made after reading the current official `kit/adapter-vercel`,
`kit/adapters`, `kit/building-your-app`, `kit/project-types`,
`kit/environment-variables`, and `cli/sveltekit-adapter` sections through the
official Svelte MCP. `svelte.config.js` retains the existing framework options
and changes only the deployment adapter.

This section previously recorded that the adapter output carried the Linux x64
`better-sqlite3` native prebuild, and that shipping it did not make SQLite durable
on a serverless platform. That boundary is resolved rather than restated: the
control plane runs on PostgreSQL over the network, `better-sqlite3` is imported
nowhere, and `pnpm-workspace.yaml` sets `allowBuilds.better-sqlite3: false` so the
native module is not compiled at all — it lingers in the tree only as an optional
peer of drizzle-orm 0.45.2. `scripts/verify-font-contract.mjs` asserts that the
build stays declined, so the retired driver cannot be silently rebuilt.

The rule that outlived it: neither a Vercel preview nor production may use
writable `/tmp` as application storage. Serverless local files are still not a
data authority; the store is simply no longer a local file.

Verification: **PASS**.

| Gate                                                                | Result                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `svelte-check --fail-on-warnings`                                   | 0 errors, 0 warnings                                           |
| Evidence, breakpoint, account, home, font, and room-login contracts | passed                                                         |
| Vitest                                                              | 7 files, 44 tests passed                                       |
| `@sveltejs/adapter-vercel` production build                         | passed; Build Output API generated                             |
| Vercel function native dependency                                   | Linux x64 `better_sqlite3.node` present in the function bundle |
| Modified `.svelte` files                                            | none; official autofixer not applicable                        |

## 12. Fail-closed Vercel control-plane boundary — 2026-08-02

This slice was decided from the official Svelte MCP sections
`kit/project-types`, `kit/hooks`, `kit/environment-variables`,
`kit/$app-env-private`, `kit/$env-dynamic-private`,
`kit/server-only-modules`, `kit/auth`, `kit/adapter-vercel`,
`kit/state-management`, `kit/routing`, `kit/errors`, and
`kit/building-your-app`. Together they support the selected SvelteKit UI/BFF
boundary, startup-hook lifecycle, private-environment ownership, server-only
imports, request-local identity, and separate Rust backend. ADR 0003 records the
resulting architecture authority.

The runtime now has exactly two modes:

- `marketing-only` is the default when configuration is absent. It permits only
  GET/HEAD for `/`, `/contact`, `/privacy`, and `/terms`; unresolved routes keep
  the ordinary SvelteKit 404; every route ID outside that exact allowlist is
  denied with 503 after SvelteKit resolves it.
- `postgres` requires both an explicit mode and a nonblank `DATABASE_URL`, and
  refuses to start without one rather than booting and failing at the first query.
  It replaces the former `local-sqlite` mode. The `VERCEL=1` prohibition that
  applied to that mode is gone with it — it existed because the platform's
  filesystem is ephemeral and per-instance, which a network database is not, so
  Vercel is now the intended host. `VERCEL` is no longer declared in `src/env.ts`.

The first live HTTP probe disproved the initial dynamic-hook-only boundary:
SvelteKit evaluated the matched `/login` route module before `handle` rejected
the request, and the route's static dependency chain opened SQLite. The durable
fix therefore makes the database connection lazy at the DB module itself and
uses `getDb()` only at operation time. That finding still governs, and the driver
swap did not weaken it: `postgres()` is itself lazy and does not dial until the
first query, but the URL check stays inside `connect()` for exactly this reason.
The regression probe starts Vite in `marketing-only` with a blank `DATABASE_URL`
and proves every reviewed marketing route succeeds while login, registration,
account, API docs, room management, named mutations, SvelteKit data requests,
launch, logout, session entry, and contact POST return 503 without a connection
being opened—even when a stale session cookie is present. A separate process case
proves `postgres` mode with a blank `DATABASE_URL` never serves HTTP 200 and
fails at startup. The isolated case now creates a throwaway PostgreSQL database,
asserts the bootstrap created its schema on first request rather than at import,
requires native 303 form redirects, completes registration, login, and
authenticated account rendering, and drops the database afterwards. Because
route-module evaluation can precede `handle`, this proof covers the current
import-safe route graph—not arbitrary future module-evaluation side effects. The
engineering SSOT therefore prohibits I/O in server-module static import graphs,
and every new control route must extend the live HTTP matrix before merge.

Intentional reference deviations are security/product containment, not visual
guesses: the marketing navbar hides Login/Register, contact submission is
disabled, successful pages and guarded errors are `no-store`/`noindex`, and
framing, MIME-sniffing, referrer, permissions, and minimal CSP protections are
applied. Placeholder legal content keeps transactional launch blocked in
`docs/PRODUCTION-CUTOVER-PLAN.md`.

The current tree also replaces captured names, emails, a member login timestamp,
the person-linked user ObjectId, encoded identity claims, and reversible Gravatar
identifiers with stable evidence tokens, and renames the hash-derived avatar
asset. `pnpm privacy:verify` enforces that boundary and rejects raw email outside
reserved test domains. Prior public Git objects remain a separately documented
privacy risk; rewriting and force-pushing history requires explicit owner
authorization and coordinated invalidation.

Node ownership follows the platform contracts rather than pretending Vercel
pins patches: `.node-version` fixes CI/local verification to `24.18.1`, while
`package.json#engines.node` uses `24.x` because Vercel exposes major versions and
automatically advances security patches, as specified by Vercel's
[supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
Vercel's [runtime filesystem contract](https://vercel.com/docs/functions/runtimes)
also identifies the function filesystem as read-only with `/tmp` only as scratch
space; it is not durable product storage. The pnpm and dependency graph remain
exactly pinned.

Final verification: **PASS for the bounded Gate 0 implementation**. This does not
promote the legal, contact, deployed-observability, or Rust cutover items that
remain unchecked in the production plan.

| Gate                                                                      | Result                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Svelte autofixer                                                 | `RoomLogin.svelte`, `SiteHeader.svelte`, root `+layout.svelte`, contact `+page.svelte`, and room-manager `+page.svelte`: 0 issues, 0 suggestions                                                                                                                           |
| `svelte-check --fail-on-warnings`                                         | 0 errors, 0 warnings                                                                                                                                                                                                                                                       |
| Source/evidence/privacy/breakpoint/account/home/font/room-login contracts | passed                                                                                                                                                                                                                                                                     |
| Control-plane unit tests                                                  | absent/blank fail-closed mode, strict configuration, Vercel prohibition, route matrix, headers, and ordinary 404 behavior passed                                                                                                                                           |
| Live HTTP contract                                                        | stale-cookie marketing GET/HEAD, hidden account navigation, disabled contact, control/data/mutation 503 matrix, impossible DB path, ordinary 404, process-level Vercel SQLite rejection/no-file proof, and isolated native-redirect registration/login/account flow passed |
| Vitest                                                                    | 10 files, 82 tests passed                                                                                                                                                                                                                                                  |
| `@sveltejs/adapter-vercel` production build                               | passed; Build Output API generated for `nodejs24.x`                                                                                                                                                                                                                        |
| Native bundle proof                                                       | Linux x64 `better-sqlite3` release prebuild present as an ELF shared object; the tracer's non-fatal missing Debug-build candidate remains informational and local SQLite is prohibited on Vercel                                                                           |
| CI definition                                                             | frozen pnpm install and `pnpm quality` on pull requests and `main`, with exact CI Node/pnpm and commit-pinned official actions; hosted results are recorded per commit in GitHub Actions and are never inferred from this local run                                        |

## 13. Hydration and room-menu regression — 2026-08-02

This slice was decided from the official Svelte MCP sections for `$state`,
`$derived`, bindings, keyed each blocks, `{@html}`, `createRawSnippet`, `{@attach}`, form actions,
state management, testing, Playwright, basic markup, `<svelte:window>`, lifecycle
hooks, `$app/navigation`, building the app, and the Vercel adapter.
The official binding contract makes the model authoritative for an initialized
checkbox binding, while attachments run when an element mounts. The delayed-
script browser proof then established the missing case directly: a member
checkbox changed after SSR but before hydration remained checked in the DOM, but
an initially empty `bind:group` did not infer that edit. A mount attachment now
adopts an already-checked member exactly once, without making every member
attachment reactive to the full selection; native `bind:group` owns all later
changes.

The deterministic Playwright harness runs a production build plus local preview,
opens a cache-empty context with the source context's authenticated storage and
exact project device descriptor, and holds script responses while leaving the
server-rendered document interactive. It releases the scripts, drains the route
handlers, and waits for a namespaced root-layout `afterNavigate` marker before
asserting. It proves value preservation for registration, login, contact, guest
room login, member selection, a nonempty text list, and a nonempty rich-text
editor. The branding seed is submitted through the real enhanced action, then a
fresh pre-hydration document proves that the saved sanitized value is already in
SSR. The source-to-rich transition uses the shared allowlist and proves safe
markup survives while `<script>`, `onerror`, and `javascript:` are removed; the
submitted editor value also proves Svelte's empty hydration comments do not leak
into the submitted form value; the server allowlist separately protects the
persisted value. A hostile-client branch then bypasses the browser sanitizer,
submits executable attributes and `rel="opener"` through the real action, proves
that the already-mounted editor adopts the server-canonical HTML, and reloads to
prove that same value was persisted. The
manage-page outside-click closer now exempts `[data-menu-control]` and
`[data-menu-panel]`: Invite and Vanity triggers remain open through their own
click and interior form interactions, while an exterior click closes the panel.
The real enhanced Invite action is the regression witness.

The earlier Firefox failure was traced to repeated Vite development-client full
reloads after the form fields had been filled; no registration POST occurred.
No narrower dependency-optimizer cause is claimed. The production build/preview
harness removes that development-only variable, but local preview is still not
deployed Vercel-platform evidence and does not change any unchecked production
cutover gate.

Process-tree evidence also found that the earlier `pnpm preview` child was
detached from Playwright's own process group. Playwright force-killed its wrapper,
the Vite child was reparented to PID 1, and the still-open readiness port blocked
test teardown. `scripts/start-e2e-server.mjs` now invokes the repository-pinned
Vite CLI directly for both build and preview and keeps it in Playwright's process
group. Corrected focused runs exited 0, and a process audit found no preview from
the corrected runner. Older orphaned ephemeral preview groups were removed without
touching the developer server on port 5300.

| Gate                                      | Result                                                                                                                                                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Svelte autofixer                 | `RichTextEditor.svelte`, `SanitizedHtml.svelte`, root `+layout.svelte`, and room-manager `+page.svelte`: 0 issues, 0 suggestions                                                                                                        |
| Deterministic Chromium hydration contract | 5 tests passed, including the composite member/menu/editor/sanitizer regression                                                                                                                                                         |
| Full Playwright matrix                    | 20 tests passed across Chromium, Firefox, WebKit, and responsive Chromium against production build/preview; CI flaky-test rejection remained enabled                                                                                    |
| Vitest                                    | 20 files, 215 tests passed with all ratcheted coverage thresholds met                                                                                                                                                                   |
| Current-tree `pnpm quality`               | passed: lint, formatting, zero-warning Svelte check, every quality-gate source/evidence/privacy/font/breakpoint contract, the fail-closed runtime HTTP contract, 215 Vitest tests, 20 Playwright tests, and the Vercel production build |

## 14. Hosted release-evidence closure — 2026-08-02

The local hydration and fidelity results above were promoted only after exact-
revision hosted proof. PR-head revision
`24f01ff485251cf32178d12e4c9dd48a3101b419` passed the complete Quality,
Backend quality, and Security workflows, including dependency review, advisory
audit, and full-history secret scan. It was squash-merged through protected
`main` with an exact-head-SHA guard as
`9968bd6b035656d503711504564651559c17e868`.

The squash commit's source tree is byte-identical to the reviewed PR head and
independently passed the push-applicable workflows and deployed boundaries.
Dependency review correctly runs on pull requests and was therefore skipped on
the squash commit's `push`; its success is attributed only to the exact PR-head
revision, not rewritten as a main-commit result.

| Hosted/deployed gate               | Exact evidence                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR Quality                         | run `30775629743`, success on `24f01ff…`                                                                                                                       |
| PR Backend quality                 | run `30775629747`, success on `24f01ff…`                                                                                                                       |
| PR Security                        | run `30775629745`, all three jobs successful on `24f01ff…`                                                                                                     |
| Merged-main Quality                | run `30776711719`, success on `9968bd6…`                                                                                                                       |
| Merged-main Backend quality        | run `30776711733`, success on `9968bd6…`                                                                                                                       |
| Merged-main Security               | run `30776711714`, advisory and history jobs successful; dependency review skipped by event contract                                                           |
| Vercel                             | deployment completed successfully for `9968bd6…`                                                                                                               |
| Deployed production/media boundary | manually dispatched run `30776842719`, success on `9968bd6…`                                                                                                   |
| Protected `main`                   | strict freshness plus all five first-party contexts required; admin enforcement, linear history, conversation resolution, and force-push/deletion bans enabled |

This closes the bounded Svelte/CI/deployed-containment evidence gate. It does not
open transactional traffic or supersede the legal, contact, monitoring, managed-
database/API, identity/RBAC, payment, TURN/RTP/device, artifact-attestation, or
native OpenSSL blockers in `docs/PRODUCTION-CUTOVER-PLAN.md`.

## 15. Local SQLite filesystem boundary — 2026-08-02 (SUPERSEDED)

> **Superseded by the PostgreSQL migration.** Everything below describes
> `src/lib/server/db/private-sqlite.ts`, a module that no longer exists — it was
> deleted along with `private-sqlite.test.ts` and its 22 cases when the control
> plane moved to PostgreSQL. The hardening it records (canonical path, `0600`/`0700`
> modes, no-follow descriptors, WAL/SHM mode propagation) was a single-OS-user
> containment control for a local file, and it retired with the file it protected.
> There is now no application-managed path on disk to protect: the store is a
> PostgreSQL server addressed by `DATABASE_URL`, and its access control is the
> database's own. The section is kept unedited as the dated record of what was
> verified on 2026-08-02, not as a current claim. Sections 12 and 14 likewise
> contain `better-sqlite3` evidence rows that were accurate at their timestamps.
>
> Current state: README "Why this is no longer SQLite", and §16 below.

This server-only slice was reviewed against the official Svelte MCP sections for
project structure, server-only modules, hooks, environment variables, and
testing. It preserves lazy operation-time database I/O in `$lib/server`; no
`.svelte` file changed, so the Svelte autofixer is not applicable.

The accepted local path is now exactly canonical
`<root>/.data/control.sqlite`. Stable storage/database/sidecar symlinks, FIFOs,
hard-linked databases, owner mismatch, missing descriptor capabilities, and
symlinked ancestors that resolve outside the canonical path fail before a
connection is returned. Each of those rejections is now pinned to its exact
message by a focused test, and the two added guards were mutation-proved: with
the storage-root ownership comparison deleted, or with the trusted-parent
`realpathSync.native` comparison deleted, exactly the corresponding test fails.
`O_NOFOLLOW` rejects only a symlinked final component, so a symlinked ancestor is
caught solely by that canonical comparison. Two limits are explicit rather than
implied: `resolve()` normalizes `.`/`..` segments to the canonical target instead
of rejecting them, with the exact two trailing components pinned separately; and
the file-level ownership branch is unproven by test, because the opener reads
`process.getuid` once and threads it through, so forging a mismatch reaches the
directory guard first and a genuinely foreign-owned database file requires a
privileged `chown` that unprivileged CI cannot create. The direct root must be
process-owned and not group- or other-writable. File inspections use read-only,
no-follow, nonblocking descriptors; only atomic creation uses a read-write
descriptor. A newly created `.data` is repaired to `0700` before descriptor open
so restrictive umasks cannot make it inaccessible; an inaccessible existing
mode-`0000` directory instead requires manual repair. Only accessible regular,
single-link database and WAL/SHM files are repaired to `0600`; pre-existing
owner-inaccessible mode-`0000` database and sidecar files fail closed unchanged
for manual owner repair. SQLite opens only after atomic
`O_CREAT|O_EXCL` creation-or-existing-file validation, with `fileMustExist`, and
the bootstrap asserts a writable connection, WAL mode, and foreign-key
enforcement before returning it.

The mode-propagation claim comes from the exact `better-sqlite3` 13.0.2 source in
the pnpm lock graph, not a convention: bundled SQLite's Unix-VFS
`findCreateFileMode` obtains the database mode for WAL/journal creation,
`robust_open` applies a nonzero supplied mode exactly rather than through umask,
and SHM opening supplies the associated database mode. Focused tests set both
permissive and restrictive umasks and prove they are unchanged on success and
failure while the directory, DB, WAL, and SHM modes remain exact. The
application contains no umask read or mutation. A static regression also
requires `scripts/seed.mjs` to use this opener and close it in `finally`.
Focused negative regressions cover mode-`0000` `.data`, database, WAL, and SHM
paths and prove no connection or automatic repair occurs.

## 16. Latest-syntax conformance and layout stability — 2026-08-05

A repository-wide re-audit against the current documentation and the official
June, July, and August 2026 release posts. This was a targeted syntax/idiom pass,
not a full-corpus retrieval, so the manifest date in section 1 is unchanged.

### Baseline finding

The legacy scan came back empty. There is no `export let`, `on:`, `<slot>`,
`$$props`, `$$restProps`, `$$slots`, `$:`, `class:`, `<svelte:component>`,
`<svelte:self>`, `svelte/store`, or `$app/stores` anywhere in `src/`. Every
`{#each}` was already keyed. The prior sections' migrations hold.

### Corrections made

- **Declaration tags.** Svelte `5.56.0` (June 2026 post, "Template
  Declarations") introduced `{const ...}`/`{let ...}` and the official docs now
  class `{@const ...}` as legacy. All six occurrences migrated to
  `{const x = $derived(...)}`, which is the exact migration the docs prescribe —
  a bare `{const x = expr}` is not reactive and would have silently frozen these
  values.
- **`account/rooms/[id]`**: the app-token block used a TypeScript assertion and a
  loop binding sharing one `as` keyword
  (`{#each form.tokens as {...}[] as t (t.lastSix)}`), with the same cast
  duplicated in the guard above it. Replaced with an `AppToken` type alias and a
  single declaration tag. The `apiSecret` block called `.find()` twice and used a
  non-null assertion to reconcile them; one declaration tag now does both and the
  assertion is gone.
- **`RichTextEditor.svelte`** no longer calls `window.prompt`. It uses the
  repository's own captured Bootbox dialog, which already existed and already
  supported the `text` input variant. This required real work, not a substitution:
  `document.execCommand` acts on the live selection, and a DOM dialog collapses it
  where a native prompt did not, so the `Range` is captured before the dialog
  opens and reinstated before the command runs.
- The editor's rejection notice now clears its previous timer. Two rejections
  inside the four-second window previously left the first timer to wipe the
  second message early.
- Its toolbar `{#each}` was keyed on the loop index; it is now keyed on the
  group's first tool name, per the each-block documentation.
- **Accessibility.** A browser accessibility snapshot proved that 24 of the 30
  editor toolbar buttons exposed _no_ accessible name — the icon-only controls
  carried `title` alone, which did not compute a name. Each now carries
  `aria-label`. Separately, the account page's `role="button"` span answered to
  Enter but not Space; it now handles both, matching `Editable.svelte`.

### Layout stability

The hero image and the three feature icons reserved no space before decode. The
first attempt added intrinsic `width`/`height` attributes and correctly failed
`home:fidelity`: that contract pins the hero `<img>` as an exact string and
rejects `width=`/`height=` in `FeatureGrid.svelte`. The attribute route is also
wrong on its own terms, because a `width` presentational hint would override the
`40px` icon cap and render the icons `40x128`.

The fix belongs in CSS and is now there. `min(100%, 1440px)` and
`width: 40px` restate the ceilings the contract already computes, so the used
boxes are unchanged at every audited viewport, while `aspect-ratio` reserves the
height before bytes arrive. The hero declarations sit in a second block on the
same selector because the pinned assertion includes the original rule's closing
brace. `docs/reference/home-pixel-contract.md` records the detail.

Measured in Chromium with image responses held open:

| Metric                                                 | Before   | After   |
| ------------------------------------------------------ | -------- | ------- |
| Hero box width before bytes arrive (`1440px` viewport) | `0px`    | `930px` |
| Feature icon box before bytes arrive                   | `0x0`    | `40x40` |
| Home cumulative layout shift                           | `0.0039` | `0`     |

`930px` is exactly `1440 * (2/3) - 30`, the width both the fidelity script and
the responsive spec independently require.

### Recorded, deliberately not changed

- `statsOnlineOnly` and `statsMobileOnly` in `account/rooms/[id]/+page.svelte`
  are bound to checkboxes but never read by `visibleStats`, so ticking them does
  nothing. The stats rows carry no online or mobile signal, so wiring them would
  mean inventing a filter. Left as a reported honest gap for a product decision;
  disabling them is not obviously right either, because this page deliberately
  keeps controls live rather than reproducing a permanently `.65`-opacity box.
- `use:enhance` remains the SvelteKit form API and is not converted to
  `{@attach}`, per section 4.
- SvelteKit 3's `refreshAll`, the `error(status, message, {...})` signature,
  `$app/manifest`, `$app/service-worker`, and the consolidated `goto` options are
  `3.0.0-next` only. The section 9 migration list stands; nothing was adopted
  early.

### Verification

| Gate                                        | Result                                                                                                                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official Svelte autofixer                   | `RichTextEditor.svelte`, account `+page.svelte`, room-manager `+page.svelte`: 0 issues, 0 suggestions                                                                                                                 |
| `svelte-check --fail-on-warnings`           | 746 files, 0 errors, 0 warnings                                                                                                                                                                                       |
| ESLint / Prettier                           | clean                                                                                                                                                                                                                 |
| `pnpm test` chain                           | exit 0; schema, backend provenance/release, evidence, privacy, breakpoint, account, home fidelity, font, room-login, and fail-closed runtime HTTP contracts all passed                                                |
| Vitest                                      | 12 files, 110 tests passed                                                                                                                                                                                            |
| Playwright                                  | 20 tests passed across Chromium, Firefox, WebKit, and responsive Chromium                                                                                                                                             |
| `@sveltejs/adapter-vercel` production build | passed                                                                                                                                                                                                                |
| Editor dialog behavior                      | driven in Chromium: the Bootbox dialog opens, the preserved selection produces `<a href>` around the selected text, the submitted hidden input carries it, and a `javascript:` URL is rejected with no anchor created |
| Layout-shift measurement                    | hero/icon boxes reserved before decode; CLS `0`                                                                                                                                                                       |

This is accidental-exposure containment for a local single-OS-user harness, not
a hostile shared-path boundary. Any actor able to mutate path ancestry can race
the created-directory chmod, descriptor checks, or SQLite pathname open; this
includes same-UID processes and principals with write access to an ancestor.
The direct root must therefore be trusted and its validation does not prove all
ancestors immutable. The observable violation signal and non-destructive
quiesce/inspect/restore/restart recovery are recorded in ADR 0003. PostgreSQL
remains the only production data authority.

## 17. Cinematic home redesign — 2026-08-09

`/` is no longer the evidence-pinned reconstruction. By owner directive it is an
original cinematic surface (ADR
[`0005-cinematic-home.md`](decisions/0005-cinematic-home.md)): Threlte 8 /
three.js instanced hero scene behind a WebGL + hardware probe and dynamic
import, GSAP 3 ScrollTrigger choreography delivered through `{@attach}`
factories in `$lib/motion.ts`, a D3 simulated tape labeled as simulated, pure
CSS/SVG product mocks in place of the three stock screenshots (all deleted), a
dedicated nav/footer/consent chrome under `.home-cine`, and zero raster imagery.

Framework placement follows the existing decisions: runes-only components with
typed props, attachments over `bind:this` + `$effect` (the official autofixer
reports no issues or suggestions on all sixteen touched `.svelte` files),
component `<style>` for everything single-owner and `src/home.css` for shared
tokens per ADR 0004, and SSR that emits the complete composition — the seeded
market walks are deterministic, so server and client render identical charts.

Section 16's "Layout stability" hero/icon work is superseded with the page it
measured: there are no `<img>` elements left on `/` to reserve boxes for.
`home:fidelity` is retired; its successor `home:contract`
(`scripts/verify-home-contract.mjs`) is self-contained and runs on any clone.
Verified this change: `home:contract`, `breakpoints:verify`, zero-error/zero-
warning svelte-check and ESLint on every touched file (three pre-existing
warnings and eleven pre-existing lint errors in untouched files remain), the
adapter-vercel production build, and rendered Chromium screenshots at desktop,
mobile, forced-WebGL, and reduced-motion. `fonts:verify` and the evidence-bound
gates cannot run in this clone (owner-local captures); the font contract's
in-repo requirements — exact Roboto preload lines and no remote fonts — are
asserted by `home:contract` reading the same sources.
