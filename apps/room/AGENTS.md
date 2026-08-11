# Repository operating rules

**Read [`../../CLAUDE.md`](../../CLAUDE.md) first.** That is the root standard —
the owner's 2026-08-11 directive and what it means concretely for Svelte, Rust,
performance, testing scope and boundaries. It binds every agent on every task.
This file adds what is specific to the room; where the two disagree, the root
file wins. Nothing here restates it, deliberately: a rule written down twice is a
rule that will disagree with itself.

This repository is one half of one product. The other half is the sibling
`new-room-control` repository (`billyribeiro-ux/trading-app-main`).

**The normative engineering standard for the product is
`new-room-control/docs/ENGINEERING-SSOT.md`.** Read it before changing anything
here. It is the definition of done. Other documents provide evidence or context;
they do not silently override it. `new-room-control/AGENTS.md` states the same
operating rules and applies here too.

Start with `TODO.md` for open work and `docs/PRODUCT-OVERVIEW.md` for what the
product is and what exists.

## Package manager

**pnpm exclusively.** Do not run `npm` or `yarn` commands, and do not create
their lockfiles. `package.json#packageManager`, `pnpm-workspace.yaml` and
`pnpm-lock.yaml` are the authorities.

Gates in this repository:

```sh
pnpm test          # schema:verify + vitest   — PASSING (2026-08-03)
pnpm check         # svelte-check             — PASSING (2026-08-03)
pnpm format:check  # prettier                 — FAILING (2026-08-03), see below
```

There is no `pnpm quality` script here — that is the sibling's gate. Anything
this repository cannot verify must be reported as unverified. **Never claim
verification you did not perform.**

`pnpm format:check` exits 2 on four pre-existing files:
`src/lib/server/notes-repository.test.ts`,
`src/lib/styles/captured-runtime-components.css`, `src/routes/+page.svelte`,
and `subtitles.clean.html`. None was introduced by the 2026-08-03
documentation work. At least one — `captured-runtime-components.css` — is a
GENERATED artifact whose own header names its generator, so the SSOT rule "do
not hand-edit generated artifacts" means prettier should not be checking it at
all; it belongs in `.prettierignore`. Do not "fix" these by reformatting until
that is decided. Recorded as entry 3d in `docs/RESOLVED-ARCHIVE.md`, where it moved on
2026-08-10 when the entry closed — the `.prettierignore` decision it explains is still in force.

Rust work, from `services/`:

```sh
cargo check --locked --workspace --bins
cargo test --locked --workspace --features testing
```

`--features testing` is required. Without it eight integration targets fail to
compile, because `raw_for_tests` and `identity_pool_for_tests` are
`#[cfg(feature = "testing")]` by design — the private connection is fence #2 of
the tenancy kernel. The bare command failing is not broken code.

The Rust suite needs PostgreSQL. It defaults to
`postgres://…@127.0.0.1:5432/ptr_clone`; override with `DATABASE_URL` and
`MIGRATE_DATABASE_URL`.

## Do not touch

**`second-dump/**` and the other capture directories are evidence.** They record
the original captured system, byte for byte, and are SHA-256 pinned —
`scripts/verify-postgres-schema-artifacts.mjs` runs inside `pnpm test` and
enforces exact bytes. Never reformat, rename, or "fix" anything in them,
including the `ptr_clone` naming: that is what the original system was called.

**`services/**` is a mirror, not authored here.** Its authority is
`new-room-control/ops/backend-import-provenance.md`, enforced by
`new-room-control/scripts/verify-backend-provenance.mjs`. See
`services/SYNC-PROVENANCE.md`. Change it at the source and re-sync; a change
authored here is lost on the next sync.

**Never edit an applied migration.** `services/api/migrations/**` is
forward-only. Editing one changes its sqlx checksum and every existing database
refuses to migrate — which has already happened to the legacy local database
here, permanently. Add a new numbered migration instead.

## Svelte and SvelteKit work

Use the official Svelte MCP workflow for every Svelte/SvelteKit task:

1. `list-sections` first; select every relevant section from its use-case
   metadata.
2. Read them with `get-documentation`. Do not rely on recalled framework
   behavior when official guidance can decide the question.
3. Run `svelte-autofixer` on every created or modified `.svelte` file, and repeat
   until it reports no issues or suggestions.
4. Do not create a Playground link for code written into this repository.

Svelte 5 runes, typed props, standard web APIs, SvelteKit server boundaries,
progressive form actions, semantic accessible HTML. No legacy `$:`,
`export let`, `on:event`, slots, or shared server-side module state.

## The DPE level 8++ Protocol

Standing owner directive, 2026-08-04: **every** task follows this, not just
reference-match work. Each rule exists because it was broken and cost something.

1. **No factual claim unless you opened the file in this session.** Not from
   memory, not from a summary, not from another agent's report. If you have not
   opened it, mark the claim unverified in the text. _Cost when broken:_ a
   cutover plan asserted the room used argon2id; `src/lib/server/password.ts:11`
   says scrypt. That mismatch would have dead-stopped the migration at the step
   where passwords were supposed to move.

2. **The gate comes before the hand-written artifact, not after the bug.** If
   you are about to write something a convention governs, write the check first
   or read the contract first. _Cost when broken:_
   `0007_saved_polls.sql` shipped with two independent foreign keys into a schema
   where all 14 room-scoped siblings pair them as
   `(enterprise_id, room_id) REFERENCES rooms(enterprise_id, id)`. Two
   independent keys are each satisfiable alone, so a row could hold tenant A's
   `enterprise_id` beside tenant B's `room_id` — and RLS compares only
   `enterprise_id`, so it reads back as tenant A's. Auditing afterwards found the
   same hole in `room_events`. Finding your own tenancy bug by re-reading is
   diligence covering for a missing gate.

3. **Nothing is added without a consumer in the same change.** No config nothing
   reads, no module nothing imports, no helper nothing calls. Scaffolding ahead
   of its consumer reads as progress and is not — `tradingroom-api.ts` sat
   unimported for weeks.

4. **Load-bearing claims become executable assertions, not prose.** A number or
   an invariant written into a `.md` rots silently;
   `docs/REPOSITORY-STATE-2026-07-30.md` was materially wrong for three days and
   nothing caught it. Prefer a catalog-driven test that discovers its own
   subjects over a hardcoded list, so the next table is covered without anyone
   remembering.

5. **Prove it at runtime.** A constraint is proven by a statement the database
   refuses, not by asserting `pg_constraint` contains a row. An index is proven
   by `EXPLAIN ANALYZE`. A metric is proven by `curl`. Compiling is not evidence.

Why the bar is here and not lower: this is a multi-tenant fintech application.
The failure mode of a plausible-but-unverified claim is a tenant reading another
tenant's room.

## Non-negotiable rules

- Preserve evidence-backed behavior. Never replace a captured value, breakpoint,
  or interaction with a framework convention or a preference.
- Keep secrets, database access, authentication, authorization, and privileged
  validation in server-only modules.
- Do not hand-edit generated artifacts. Follow the generator declared in the
  SSOT.
- Do not add type escapes, ignored diagnostics, or disabled tests to make a gate
  pass.
- State evidence for claims: a file and line, a command and its output, or a
  named document. "It probably works" is not evidence.
- If a gate cannot run, say so explicitly.

## Known repository-level gaps

Recorded so they are not mistaken for working:

- This repository has **no `quality` script and no CI parity** with the sibling.
- `services/SYNC-PROVENANCE.md` describes a **manual** drift check. It is not
  gated, so it can rot. `TODO.md` entry 2 removes the need for it.
- Numbers quoted in `docs/*.md` are **not verified by any gate**. The sibling
  solved this with `scripts/verify-documented-test-counts.mjs`; this repository
  has no equivalent. Treat a documented count as true only for its stated date.
