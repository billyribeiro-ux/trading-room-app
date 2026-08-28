# Evidence dumps

This directory is the single repository location for raw or minimally processed
reference artifacts. It deliberately sits outside `src/`, `static/`, and `docs/`
so captured applications cannot be mistaken for runtime code, public assets, or
curated engineering conclusions.

The complete relocation audit, file inventory, byte counts, SHA-256 fingerprints,
updated consumers, and verification results are recorded in
[`docs/EVIDENCE-DUMPS-REORGANIZATION-REPORT.md`](../docs/EVIDENCE-DUMPS-REORGANIZATION-REPORT.md).

## Archive map

| Directory | Evidence set |
|---|---|
| `COPY/` | Saved controller and room-login page sources |
| `NEXT-STEP/` | Capture-gap outputs and decoded reference assets |
| `TIER1-fetched/` | Static artifacts fetched read-only 2026-08-13 — bundles, raw stylesheets, webfont, API markdown, and the AngularJS `templateUrl` partials under `views/`. Closes Tier 1 of `docs/reference/evidence-gap-register.md`. |
| `account-page/` | **NOT IN THIS REPOSITORY.** Authenticated account and badge-prompt evidence. See the note below. |
| `home-page/` | Original public home-page source |
| `login-page/` | Public, authenticated, API, launch, and manage-page sources |
| `main-nav-login-clicked/` | Authenticated navigation-state source |
| `register-page/` | Registration-page source |
| `room-login/` | Room-login source |

## One documented set is not here

`account-page/` is listed in the map above because documents in `docs/reference/` cite it, and it
has **never been committed** — `git log --all -- 'apps/controller/evidence-dumps/account-page*'`
returns nothing, so it was not deleted either. It is a capture that stayed on the machine that took
it, the same way `apps/room/scripts/` did until it was republished.

It is named rather than removed because conclusions drawn from it are still in the tree. A reader of
a clone cannot re-check those conclusions against the capture, and that is the honest state to be
in until somebody commits the set.

`scripts/verify-evidence-layout.mjs` pins the absence: restore the directory and the verifier goes
RED, naming the two lists the entry has to move to. That is deliberate — a set that reappears should
be verified, not merely present.

## Handling contract

- Preserve captured files byte-for-byte. Add a new artifact instead of rewriting
  historical evidence.
- Put analysis, redactions, precedence decisions, and pixel contracts in
  `docs/reference/`; those documents are the reviewable interpretation layer.
- Treat every unredacted capture as sensitive. The original `ptr1.json` and
  `prt2.json` files are intentionally excluded by `.gitignore` because they may
  contain personal data and token material.
- Use repository-relative paths beginning with `evidence-dumps/` in code, tests,
  and documentation.
- Run `npm run evidence:verify` after changing this archive's layout.
