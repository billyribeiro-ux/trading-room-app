# The standard for this repository

Owner directive, 2026-08-11, stated twice and in these words:

> Level 8+ enterprise grade, built for the next 20 years, following Svelte and Rust's best
> practices, with clean, maintainable code and maximized for the highest performance ALWAYS.
>
> **THIS IS APPLE/GOOGLE/MICROSOFT LEVEL STUFF.**

This file is the root standard. It is loaded for every session in this repository and it binds
**me and every sub-agent or workflow agent I spawn**, on every task, with no exception for small
ones. `apps/room/AGENTS.md` and `apps/controller/AGENTS.md` add per-app specifics and point here;
where they and this file disagree, this file wins.

Two documents sit above it in narrow domains and are not weakened by anything here:

- **Evidence discipline** — `~/CLAUDE.md`. Evidence is READ, never searched; absence is REPORTED,
  never invented. Every rule below assumes it.
- **The DPE level 8++ Protocol** — `apps/room/AGENTS.md`. Five rules, each earned by a specific
  failure. It is the definition of done for verification.

---

## What "Apple/Google/Microsoft level" means here, concretely

It is not polish and it is not ceremony. Those three companies ship code that outlives the people
who wrote it, and the properties that make that possible are the ones being asked for:

**1. The next engineer can change it without being afraid.**
The reason this codebase carries long explanatory comments is that a rule with no recorded WHY gets
"simplified" back into the bug it was fixing. `media-elevation.ts` explains why the elevation is not
folded into `isPresenter`, and `media-elevation-contract.test.ts` fails if somebody does it anyway.
That pair — the reason and the test that enforces it — is the unit of work here, not the function.
**The comments are a deliberate practice. Never shorten them to look tidy.**

**2. It fails closed, and it fails loudly.**
This is a multi-tenant fintech application. The failure mode of a plausible-but-unverified claim is
one tenant reading another tenant's room. Invalid input fails loud; no silent fallbacks, no
`.catch(() => {})`. Every allow-list is deny-by-default. Every authority decision is made on the
server from data the server owns — never asserted by the client, ever, for any reason, because that
was the 2026-08-07 privilege escalation and it will not be reintroduced.

**3. Performance is a design property, not a later pass.**
Not micro-optimisation — *shape*. A query inside a loop, an unbounded SELECT that grows with usage,
a `$state` deep proxy on an object that is only ever replaced, an allocation on the per-peer path in
the SFU. These are decided when the code is written and are expensive to retrofit. Ask of every new
read path: what does this cost at 10,000 rows, and what bounds it?

**4. Nothing exists without a consumer, and nothing is claimed without evidence.**
No config nothing reads. No `.flipped` class with no CSS. No control whose only effect is changing
its own label. No colour picked because it looked right. Compiling is not evidence; tests passing is
not evidence of a match. A screenshot, an `EXPLAIN ANALYZE`, a `curl`, a refused statement — those
are evidence.

---

## Svelte — the floor, not the ceiling

**The Svelte MCP is mandatory on every task that touches a `.svelte` or `.svelte.ts` file**, down to
a one-line prop change:

1. `list-sections`, then `get-documentation` for every section the change touches. Read the docs
   first, write second. Do not answer a framework question from memory when official guidance can
   decide it.
2. Write the code.
3. `svelte-autofixer` on every modified file, repeated until it returns nothing. This is the last
   gate, every time.

Svelte 5 runes, typed props, standard web APIs, SvelteKit server boundaries, progressive form
actions, semantic accessible HTML. No `$:`, `export let`, `on:event`, slots, or shared server-side
module state.

The specific traps that have cost time here:

- `$state` on an object that only ever changes at the top level → `$state.raw`. A deep proxy over a
  list that is replaced wholesale is pure overhead on every read.
- `$effect` that assigns a value derived from other state → that is `$derived`. An effect reading a
  typed-into field re-runs per keystroke.
- After a child saves, reassign parent state from the **server response**, not from the local guess.
- Optimistic delete followed by `loadX()` flips the loading skeleton → optimistic update plus a
  silent refetch.
- phosphor-svelte: import the `*Icon`-suffixed name. Bare `Image` / `X` / `Square` shadow DOM
  globals. The library is `phosphor-svelte`, never `@phosphor-icons/*`.
- `<img>` always carries `width` + `height` or an `aspect-ratio`. No layout shift.
- No `window.confirm` / `alert` / `prompt`. Use the project's dialog primitive.

## Rust — the floor, not the ceiling

**The rust-analyzer MCP is mandatory on every task that touches a `.rs` file:**

1. `definition` / `references` / `hover` to navigate types and trait impls before writing.
2. `diagnostics` after every edit — not `cargo check`; it is faster, type-aware, and gives exact
   spans.
3. `code_action` / `rename` over hand-editing for renames and imports.
4. `cargo fmt` on every edited file. `cargo clippy --all-targets -- -D warnings` is the final gate
   before push.

From `services/`, the suite needs `--features testing` — without it eight integration targets fail
to compile by design, because `raw_for_tests` and `identity_pool_for_tests` are gated behind it as
fence #2 of the tenancy kernel. **The bare command failing is not broken code**, and reporting it as
such has already wasted a turn.

The specific traps:

- SELECT-then-UPDATE is a TOCTOU. Use one atomic conditional `UPDATE … WHERE … RETURNING`; zero rows
  means you lost the race.
- argon2/bcrypt goes in `tokio::task::spawn_blocking`.
- Every external client — Stripe, R2, Resend — sets **both** `.timeout()` and `.connect_timeout()`.
- Prometheus labels come from a static lookup, never from user input.
- No lock held across an `.await`.

## Money and migrations

- **Money is `i64` / `BIGINT` / `number` end to end.** Never `i32`. For `cents * bps`, compute in
  `i128` and clamp. Route arithmetic through `Money` / `common::money` where it exists.
- **Migrations are forward-only and idempotent.** Never edit a shipped migration — it changes the
  sqlx checksum and every existing database refuses to migrate, which has already happened
  permanently to the legacy local database here. Add a new numbered one. `CREATE INDEX IF NOT
  EXISTS`; `CREATE INDEX CONCURRENTLY` needs `-- no-transaction`.

---

## Testing — what to run, and what it costs

**Test what changed.** Every gate run costs real money. A suite that was green twenty minutes ago
does not need re-proving because one file moved.

| changed | run, and nothing else |
| --- | --- |
| a `.ts` / `.svelte` under `src/` | that file's test, plus `svelte-check` |
| a `$lib/server` module | its own test, plus any test that imports it |
| a documented count or a doc | the one verifier that reads it |
| a route, hook or middleware | the one HTTP/route contract |
| a gate script | that script, invoked directly |
| `services/**` | `cargo test -p <crate>` and clippy for that crate — never the workspace |
| deps, env contract, build config, CI | the full gate; this is what it is for |

**The full gate runs once, immediately before a push or a merge.** Not after each edit. Batch the
pushes — a slow CI job restarts from zero on every push, so seven pushes against a 33-minute job
means nothing is ever learned. Merging and pushing are separate acts; never combine them in one
command, because the push invalidates the green checks you were about to merge.

**When in doubt, run less and say what you skipped.** "I ran the three tests covering this change; I
did not run the full gate because nothing else was touched" is a complete and honest report.

A test that cannot fail is worse than no test. Every contract test in this repository should have
had its negative control run at least once — change the thing it guards and watch it go red.

---

## Before saying "done"

Re-read your own `git diff` like a senior reviewer, and specifically check that:

- cached state (`OnceLock`, `static`, a module-level `const`) survived the refactor intact;
- every comment claiming "X is bounded/constant/checked" still matches the next line;
- no optimistic-UI handler flips the loading flag mid-mutation;
- nothing was added that nothing calls;
- **no template syntax appears inside a comment.** A comment quoting a Svelte block is prose to a
  human and an unclosed block to any parser reading the file. `svelte-check` stayed green while a
  contract test went red on exactly this.

Then state plainly what was verified and how, and what was not. **Never claim verification you did
not perform**, and never report a failure without first ruling out your own tooling — every bug in
this session that was not in the original code was mine, and each one sent the owner looking at
working code.

## Boundaries

- **Work happens in `trading-room-app` only.** Files may be pulled **from** `Desktop/new-room-control`
  and `Desktop/new-room` into this repository. Never the other way, and never a search outside those
  two folders.
- **Commit and push only when asked.** On `main`, branch first — pushing straight to the default
  branch of a fintech application is not low-risk-reversible.
- **`CHANGELOG.md` gets a real dated and timed entry for every finished piece of work**, and the
  matching `TODO.md` row is removed rather than struck through. Two places recording the same thing
  is how one of them goes stale.
- **The capture directories are evidence.** `second-dump/**` and its siblings are SHA-256 pinned and
  enforced inside `pnpm test`. Never reformat, rename or "fix" anything in them — including the
  `ptr_clone` naming, which is what the original system was called.
- **`services/**` is a mirror**, not authored here. A change made here is lost on the next sync.
