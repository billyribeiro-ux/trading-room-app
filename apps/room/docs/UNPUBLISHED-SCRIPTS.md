# The unpublished scripts, and the thirty manifest entries that named them

Written 2026-08-27, when the entries were removed from `apps/room/package.json`.

## What was wrong

`.gitignore:176` excludes `/apps/room/scripts/` whole, deliberately: the collectors in it reach the
REFERENCE application and carry its selectors and wire protocol, and this repository is public. That
decision stands and is not what this file changes.

What was wrong is that **thirty `package.json` script entries named files in that directory.** Every
one was verified missing from a clone with `git ls-files --error-unmatch`, and again on 2026-08-27
against a fresh container checkout, where `apps/room/scripts/` holds **zero** files. So anybody who
cloned this repository got a manifest advertising thirty commands, all of which fail with
`Cannot find module`. A manifest that lists what a checkout cannot run is a manifest that has to be
tested by hand before it can be trusted, which is the opposite of what a manifest is for.

The entries are removed. The scripts themselves are untouched on the machines that hold them, and
this file is the record of what they were, so nothing is lost by the removal.

## The thirty, as they read before removal

| script                        | file it named                                                           |
| ----------------------------- | ----------------------------------------------------------------------- |
| `verify:tooltips`             | `scripts/verify-tooltip-placements.mjs`                                 |
| `verify:screen-volume`        | `scripts/verify-screen-volume.mjs`                                      |
| `verify:viewer-only`          | `scripts/verify-viewer-only-layout.mjs`                                 |
| `verify:mobile-layout`        | `scripts/verify-mobile-layout.mjs`                                      |
| `capture:analyze`             | `scripts/analyze-capture.mjs`                                           |
| `capture:forensic`            | `scripts/forensic-audit.mjs`                                            |
| `capture:emoji`               | `scripts/render-emoji-state.mjs`                                        |
| `capture:emoji-computed`      | `scripts/audit-emoji-computed.mjs`                                      |
| `capture:emoji-behaviour`     | `scripts/audit-emoji-behaviour.mjs`                                     |
| `capture:behaviors`           | `scripts/audit-behavior-coverage.mjs`                                   |
| `capture:file-upload`         | `scripts/verify-file-upload-state.mjs`                                  |
| `capture:direct`              | `scripts/audit-direct-evidence.mjs`                                     |
| `capture:components`          | `scripts/audit-production-components.mjs`                               |
| `capture:decode-components`   | `scripts/extract-all-production-components.mjs`                         |
| `capture:states`              | `scripts/render-emoji-state.mjs` + `scripts/compare-capture-states.mjs` |
| `capture:media`               | `scripts/audit-media-contract.mjs`                                      |
| `capture:styles`              | `scripts/audit-style-coverage.mjs`                                      |
| `capture:styles-complete`     | `scripts/audit-complete-stylesheet.mjs`                                 |
| `css:sync-captured`           | `scripts/build-captured-runtime-styles.mjs`                             |
| `capture:messages-sync`       | `scripts/build-captured-message-fixture.mjs`                            |
| `capture:navbar`              | `scripts/audit-clean-navbar.mjs`                                        |
| `capture:navbar-source`       | `scripts/audit-navbar-source-contract.mjs`                              |
| `capture:navbar-computed`     | `scripts/audit-navbar-computed.mjs`                                     |
| `capture:navbar-interactions` | `scripts/audit-navbar-interactions.mjs`                                 |
| `capture:alert-chat-styles`   | `scripts/audit-alert-chat-style-contract.mjs`                           |
| `capture:dnd-source`          | `scripts/audit-dnd-source-contract.mjs`                                 |
| `capture:room-clean`          | `scripts/audit-clean-app-room.mjs`                                      |
| `audit:forms`                 | `scripts/audit-svelte-form-fields.mjs`                                  |
| `audit:forms:rendered`        | `scripts/audit-rendered-form-fields.mjs`                                |
| `audit:messages:rendered`     | `scripts/audit-rendered-messages.mjs`                                   |

Two entries were NOT removed, because their files are tracked and a clone can run them:
`privacy:verify` → `gate/verify-privacy-boundary.mjs`, and `schema:verify` →
`gate/verify-postgres-schema-artifacts.mjs`.

## What is genuinely lost, and what is not

**Not lost — the enumeration.** `scripts/audit-feature-coverage.mjs` was a THIRTY-FIRST untracked
script that no manifest entry ever named, and it mattered more than any of the thirty: `TODO.md`'s
own feature counts derive from it, and it had found work nobody knew existed three separate times.
It has been re-derived from the tracked evidence and now lives at
**`apps/room/gate/audit-feature-coverage.mjs`**, pinned by
`src/lib/feature-coverage-contract.test.ts`. Anybody with a checkout can reproduce every number it
prints.

**Still lost — the four Chromium gates.** `verify:tooltips`, `verify:screen-volume`,
`verify:viewer-only` and `verify:mobile-layout` made 22 assertions between them against rendered
pages. They cannot be re-derived from tracked bytes the way the enumeration could, because they
drive a real browser against reference captures that are themselves unpublished. Re-implementing
them under `gate/` is open work with a named blocker, and it is the same owner decision `TODO.md`
records: publish the collectors, or re-implement the measurements against evidence that is already
published.

**Still lost — the capture and audit collectors.** All of them reach `chat.protradingroom.com`.
Publishing them is the republication question the eviction row in `TODO.md` exists for, and it is
the owner's to answer. Nothing here pre-empts it.

## What stops this recurring

`src/lib/manifest-scripts-contract.test.ts` fails if any `package.json` script names a file that git
does not track. An entry may only be added for a file a clone actually has.
