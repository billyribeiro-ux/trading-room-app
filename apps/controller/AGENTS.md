# Repository operating rules

**Read [`../../CLAUDE.md`](../../CLAUDE.md) first.** That is the root standard —
the owner's 2026-08-11 directive and what it means concretely for Svelte, Rust,
performance, testing scope and boundaries. It binds every agent on every task.
This file adds what is specific to the controller; where the two disagree, the
root file wins. Nothing here restates it, deliberately: a rule written down twice
is a rule that will disagree with itself.

Before changing this repository, read and follow
[`docs/ENGINEERING-SSOT.md`](docs/ENGINEERING-SSOT.md). It is the normative
engineering standard and definition of done. Other documents provide evidence or
context; they do not silently override it.

For framework placement, current API decisions, reviewed exceptions, and the
full 2026-08-02 official-doc corpus ledger, also read
[`docs/SVELTE-CONFORMANCE-AUDIT.md`](docs/SVELTE-CONFORMANCE-AUDIT.md).

[`CLAUDE.md`](CLAUDE.md) is the condensed working reference for that audit: the
current use-this-not-that table, how each rune and template tag is used in this
tree, and the repository rules that deliberately override a framework default
(marketing-image dimensions, `.svelte` whitespace, the Bootbox dialog).

## Svelte and SvelteKit work

Use the official Svelte MCP workflow for every Svelte/SvelteKit task:

1. Run `list-sections` first and select every relevant section from its use-case
   metadata.
2. Read those sections with `get-documentation`; do not rely on recalled framework
   behavior when official guidance can decide the question.
3. Run `svelte-autofixer` on every created or modified `.svelte` file and repeat
   until it reports no issues or suggestions.
4. Do not create a Playground link for code written into this repository.

New Svelte code uses Svelte 5 runes, typed props, standard web APIs, SvelteKit
server boundaries, progressive form actions, and semantic accessible HTML. Do not
introduce legacy `$:`, `export let`, `on:event`, slots, or shared server-side
module state.

## Non-negotiable repository rules

- Preserve evidence-backed behavior. Never replace a captured value, breakpoint,
  or interaction with a framework convention or personal preference.
- Keep secrets, database access, authentication, authorization, and privileged
  validation in server-only modules.
- Do not hand-edit generated artifacts. Follow the generator declared in the SSOT.
- Do not add type escapes, ignored diagnostics, or disabled tests to make a gate
  pass.
- Use pnpm exclusively. Do not create or use npm, Yarn, or Bun lockfiles or
  commands; `packageManager`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml` are the
  package-manager, repository-boundary/build-policy, and resolved-dependency
  authorities.
- Run `pnpm quality` before declaring implementation work complete.
- If a required gate cannot run, report that limitation explicitly; never claim
  unperformed verification.
