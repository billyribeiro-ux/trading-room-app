# 0001 — Establish the engineering SSOT

- Status: accepted
- Date: 2026-08-01
- Affects: repository-wide engineering policy and definition of done

## Context

Engineering expectations were spread across the README, process notes, reference
captures, comments, and package scripts. Some facts conflicted; for example, the
local port appeared as both 5180 and 5300. Phrases such as “best practices” and
“enterprise grade” were not testable contracts.

## Decision

`docs/ENGINEERING-SSOT.md` is the normative engineering standard. It owns the
authority registry, Svelte/SvelteKit rules, trust boundaries, definition of done,
quality gate, exception process, and review order. Root contributor and agent
instructions point to it rather than restating competing standards.

Concern-specific evidence remains authoritative only for the concern named in the
SSOT registry. Vite config owns the local port. pnpm is the sole package manager,
`package.json#packageManager` and `pnpm-lock.yaml` own package-manager and resolved
dependency state, and `pnpm quality` is the minimum executable gate.

## Consequences

- Standards are reviewable and conflicts have an explicit resolution path.
- Automated checks are necessary but do not replace engineering review.
- Missing ESLint, format, coverage, and browser-E2E gates remain disclosed gaps;
  they cannot be reported as passing until installed and green.
- Future durable exceptions or policy changes require a superseding decision and
  a same-change SSOT update.

## Verification

- Root `AGENTS.md`, `CONTRIBUTING.md`, and the pull-request template point to the
  same normative document.
- `pnpm quality` runs zero-warning Svelte/TypeScript diagnostics, regression
  tests, evidence checks, and a production build.
