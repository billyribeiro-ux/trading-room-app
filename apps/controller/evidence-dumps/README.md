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
| `account-page/` | Authenticated account and badge-prompt evidence |
| `home-page/` | Original public home-page source |
| `login-page/` | Public, authenticated, API, launch, and manage-page sources |
| `main-nav-login-clicked/` | Authenticated navigation-state source |
| `register-page/` | Registration-page source |
| `room-login/` | Room-login source |

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
