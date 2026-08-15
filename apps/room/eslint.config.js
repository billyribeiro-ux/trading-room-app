import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/*
  The room had NO linting at all until 2026-08-14 — no config, no dependency, no script. A
  12,000-line `+page.svelte` and every module beside it went unchecked, while the controller's config
  ignored `apps/**` on the stated grounds that the room "brings its own toolchain … and its own gate
  (the `room` job in `.github/workflows/quality.yml`)".

  Neither half of that was true. There was no toolchain here, and there is no `quality.yml` in this
  repository at all — only `backend-quality.yml`, which gates Rust, and `smoke.yml`, which runs after
  a deployment. So the sentence that justified not linting the room from the controller was pointing
  at a file that does not exist.

  This config is deliberately a mirror of `apps/controller/eslint.config.js` rather than a fresh set
  of opinions: two applications in one repository disagreeing about what an unused variable is would
  be worse than either standard alone.
*/

/*
  `svelte.config.js` is gone — Kit 3 refuses to read it and takes configuration through the
  `sveltekit(...)` plugin instead. `eslint-plugin-svelte`'s parser still wants a Svelte config
  object, and the only part it uses is `preprocess`: without it every `<script lang="ts">` fails to
  parse. Declared here rather than by resurrecting the file, because the file's presence is what
  Kit 3 errors on.
*/
const svelteConfig = { preprocess: vitePreprocess() };

export default defineConfig(
  globalIgnores([
    '.svelte-kit/**',
    '.vercel/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'test-results/**',
    /*
      THE CAPTURE DIRECTORIES ARE EVIDENCE, and linting them would be a category error.

      `docs/source/**` holds the decoded production bundle — 2.8 MB of minified Angular — and its
      siblings hold DOM dumps. `CLAUDE.md` forbids reformatting or "fixing" anything in them, and
      they are SHA-256 pinned by `dump-contract.test.ts`. A linter cannot improve a file whose whole
      value is being byte-identical to what the reference served.

      `docs/source-*` is the same thing under a dated name. TWO commits added dated capture
      directories as SIBLINGS of `docs/source/` rather than children — `37a72c6` added
      `docs/source-v4-2026-08-15/` and `19cdc25` added `docs/source-v3-2026-08-15/` — so the exact
      glob above stopped covering them and `pnpm run lint` began reporting 18,516 errors, every one
      of them inside those two minified bundles. Widened here so the gate is about this
      repository's own code again.

      The glob is `source-*` rather than the two names because the next capture will be dated too.

      This is NOT an ignored diagnostic in the sense the standard forbids. Nothing in these files is
      authored here, nothing is fixable, and the alternative is a lint gate nobody can read.
    */
    'docs/source/**',
    'docs/source-*/**',
    'second-dump/**',
    'new-evidence/**',
    'more-fucking-evidence/**',
    'evidence-dumps/**',
    /* Static assets and the captured stylesheets copied beside them. */
    'static/**',
    'css/**',
    'emojis/**'
  ]),
  /*
    THE PRESETS COME FIRST, AND THE ORDER IS THE WHOLE POINT.

    In flat config the LAST entry to match a file wins. These three were moved below the override
    block in `060ba72`, and that silently reversed the two decisions documented inside it:
    `svelte.configs.recommended` turns `svelte/no-useless-mustaches` and
    `svelte/prefer-svelte-reactivity` back on, so the fifteen lines of reasoning explaining why they
    are off sat there being ignored. The `room quality` job reported 43 errors for exactly the
    patterns those comments say are deliberate.

    The reason it was invisible locally: `pull_request` runs check out `refs/pull/N/merge`, so CI
    lints the merge of the branch into `main` while a developer lints their branch. A config change
    on `main` therefore reaches CI before any branch that has not rebased onto it, and the branch
    passes while CI fails on the same commit. `eslint-config-resolution.test.ts` now asserts the
    RESOLVED config rather than trusting this ordering, because a comment cannot enforce itself.
  */
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  {
    /*
      DELIBERATELY UNSCOPED, and restored to that after `060ba72` added a two-pattern `files` list to
      it — one pattern for source extensions under `src`, one for ESM scripts under `scripts`.

      Those patterns are described in words rather than quoted, and that is not fussiness: a glob of
      that shape contains the two characters that CLOSE a block comment, so pasting one in here ends
      the comment early and turns the rest of the prose into code. It cost a run to find. Same family
      as the rule against putting Svelte template syntax in a comment, for the same reason.

      Everything this repository authors runs under Node, the browser, or both, so every file it
      lints wants these globals. Narrowing the block did not restrict what gets linted — that is
      `globalIgnores` above, and it was already doing the job — it only removed the globals from
      whatever the two patterns happened to miss, leaving those files with `no-undef` on and nothing
      defined.

      What it missed was not hypothetical. `gate/**` did not exist when the patterns were written, so
      the privacy and schema verifiers produced 31 `no-undef` errors for `process`, `console`, `URL`
      and `Buffer` the moment they moved there. `scripts/*.js` — the browser-console collectors — are
      not `.mjs` and were missed too: 524 more errors, invisible on CI only because that directory is
      untracked and so is not present there to be linted.

      A pattern list that has to be revised every time a directory is added is a gate that breaks on
      unrelated work. The ignore list decides what is linted; this block decides what those files are
      allowed to reference, and the answer for first-party code is the same everywhere.
    */
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      /*
        OFF, and both of these are decisions rather than capitulations.

        `svelte/no-useless-mustaches` objects to `{' '}`. In this application those are not noise:
        they hold whitespace the reference emits, in markup whose whole job is to match it, and a
        literal space is subject to trimming around blocks where an explicit expression is not.
        Eighteen of them sit in the Files pane alone, next to the captured labels they separate.

        `svelte/prefer-svelte-reactivity` objects to every plain `Map` and `Set`. Each one in this
        codebase is a DELIBERATE non-reactive collection, and the declarations say so — timer
        handles, popped-out windows, seen-id sets, and `localScreenStreams`, whose comment reads
        "nothing renders from it ... making it reactive would buy a dependency and no redraw".
        Turning them into `SvelteMap` would add a reactive dependency to buy nothing.

        Neither signal is lost: the Svelte MCP autofixer reports both on every run, as suggestions,
        which is the right severity for a judgement call that has to be made per declaration.
      */
      'svelte/no-useless-mustaches': 'off',
      'svelte/prefer-svelte-reactivity': 'off'
    }
  },
  {
    /*
      The browser-console collectors run pasted into a live page, not under Node. They legitimately
      reference globals this repository does not own, and several are written to be self-contained
      rather than importable.
    */
    files: ['scripts/*-collect.js', 'scripts/collect-*.js', 'scripts/capture-*.js'],
    languageOptions: {
      globals: {
        angular: 'readonly',
        bootbox: 'readonly',
        jQuery: 'readonly',
        $: 'readonly'
      }
    }
  },
  {
    /*
      `no-undef` off for TYPE-CHECKED files only, which is typescript-eslint's own guidance.

      It does not know the TypeScript DOM lib, so every `RTCIceServer`, `RTCConfiguration`,
      `MediaStreamConstraints` and `PermissionDescriptor` annotation reads as an undefined global.
      TypeScript already answers this question, and answers it better — `svelte-check` runs over
      exactly these files and reports 0/0.

      Deliberately NOT switched off globally. The plain `.js` and `.mjs` scripts are not type
      checked, and `no-undef` is the rule that found a genuinely broken probe in
      `room-config-seam-e2e.mjs`, where backticks inside a comment had terminated a template literal
      and left `isPresenter` being evaluated as real code. Turning it off everywhere would have
      hidden that.
    */
    files: ['**/*.ts', '**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    rules: { 'no-undef': 'off' }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.js', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig
      }
    }
  },
  prettier
);
