import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * The SvelteKit options, in ONE place.
 *
 * Kit 3 removed `svelte.config.js` and takes its configuration through the `sveltekit(...)` plugin
 * instead. That change has a trap: `sveltekit()` with no arguments no longer falls back to a shared
 * file — it means *no configuration at all*. Any second Vite config that called it bare silently
 * lost the adapter and the aliases.
 *
 * That is not hypothetical. `vitest.db.config.ts` did exactly this, and 28 database tests failed on
 * `Cannot find module '$lib/room-settings-profile'` while the unit suite and the build stayed green,
 * because only the database config was missing the alias.
 *
 * So the options live here and every entry point imports them. `svelte.config.js` used to provide
 * this sharing for free; it has to be deliberate now.
 */
export const kitConfig = {
  preprocess: vitePreprocess(),
  adapter: adapter(),
  /*
    NO `alias`, removed 2026-08-17 with the last `$lib` specifier it existed for.

    It held `{ $lib: 'src/lib' }` as a deliberate shim through the Kit 3 upgrade, under a note saying
    migrating to `#lib` was "a follow-up, not a permanent position". That follow-up landed in
    `e270fad`; this is the shim coming out behind it, and with it the `config.alias is deprecated`
    warning that `svelte-kit sync` printed on every run.

    It lived HERE rather than in `vite.config.ts`, which is worth recording because it is where I did
    not look: the migration commit's note said the controller had "no alias in its Vite config at
    all", which was true of that file and false about the app. `#lib` now resolves through the
    `imports` field in `package.json`, which Vite and TypeScript both read natively.
  */
  paths: {
    // The captured application is hosted at the domain root and emits root-relative URLs. Keep
    // SvelteKit route resolution without rewriting SSR output to page-relative forms such as
    // `./contact`.
    relative: false
  }
} as const;
