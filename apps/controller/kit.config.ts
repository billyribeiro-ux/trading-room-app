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
    Kit 3 removed `$lib` in favour of `#lib` and offers this alias to keep the old specifier
    working — the error names it directly. Taken deliberately rather than renaming several hundred
    import sites inside the same diff as a framework major. Kit warns that `config.alias` is itself
    deprecated, so migrating to `#lib` is a follow-up, not a permanent position.
  */
  alias: { $lib: 'src/lib' },
  paths: {
    // The captured application is hosted at the domain root and emits root-relative URLs. Keep
    // SvelteKit route resolution without rewriting SSR output to page-relative forms such as
    // `./contact`.
    relative: false
  }
} as const;
