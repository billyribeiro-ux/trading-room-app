import { sveltekit } from '@sveltejs/kit/vite';
import { kitConfig } from './kit.config';
import { defineConfig } from 'vitest/config';

/**
 * The database-backed tests, which the default run deliberately excludes.
 *
 * `vite.config.ts` filters out `*.db.test.ts` because they stand up a throwaway PostgreSQL cluster
 * with `initdb`/`pg_ctl`, and CI has no PostgreSQL binary. A separate config rather than a CLI flag
 * because vitest MERGES `--exclude` with the config's own, so the exclusion cannot be undone from
 * the command line.
 *
 * Run with `pnpm test:db`. No coverage thresholds here: these prove behaviour against a real
 * database, and folding them into the ratchet would make the numbers depend on whether somebody
 * had PostgreSQL installed.
 */
export default defineConfig({
  // The SAME options the application build uses. `sveltekit()` bare means "no configuration" in
  // Kit 3, which cost 28 database tests a missing `$lib` alias before this import existed.
  plugins: [sveltekit(kitConfig)],
  test: {
    include: ['src/**/*.db.test.ts'],
    // One cluster at a time; two would race on ports and on the temp directory.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
});
