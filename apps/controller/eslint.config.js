import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

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
    /*
      `apps/**` is the room application, which arrived when the two repositories became one. It
      brings its own toolchain, its own lockfile and its own gate (the `room` job in
      `.github/workflows/quality.yml`). Linting it from here ran this config over a tree it was
      never written for: 51,311 errors, none of them findings.

      Ignored for the same reason `services/**` is — a separate boundary with its own checker, not
      code this configuration is the authority for.
    */
    'apps/**',
    'build/**',
    'coverage/**',
    'evidence-dumps/**',
    'node_modules/**',
    'playwright-report/**',
    'services/**',
    'static/**',
    'test-results/**'
  ]),
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  {
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
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    files: ['scripts/capture-*.js'],
    languageOptions: {
      globals: {
        angular: 'readonly',
        bootbox: 'readonly'
      }
    }
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
