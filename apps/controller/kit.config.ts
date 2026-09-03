import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const adapterTarget = process.env.ADAPTER ?? 'vercel';
if (adapterTarget !== 'vercel' && adapterTarget !== 'node') {
  throw new Error(`Unsupported ADAPTER ${JSON.stringify(adapterTarget)}; expected "vercel" or "node".`);
}

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
  // Vercel is production. The Node artifact gives Playwright a stable production server instead
  // of a Vite dev process that can accept requests while generated Kit modules are being reloaded.
  adapter: adapterTarget === 'node' ? node() : vercel(),
  /*
    RUNES MODE, FOR EVERY COMPONENT, ENFORCED BY THE COMPILER.

    Svelte 5 decides mode per FILE: a component that uses a rune is in runes mode, and one that does
    not is in legacy mode and compiles happily. So `export let`, `$:`, `on:click`, `<slot>` and
    `$$props` are not errors in this project by default — they are a different dialect the compiler
    still accepts, and neither `svelte-check` nor eslint objects to a new component written entirely
    in it.

    Measured 2026-08-31 before setting this, because a flag that breaks the build is worse than the
    drift it prevents: across the 48 shipped components here and 129 in the room, with comments
    stripped, there are **zero** legacy constructs. Every raw match is inside a comment, where this
    repository quotes the reference and the migration guide constantly.

    The docs are explicit about what it buys: *"Once a component is in runes mode (which you can opt
    into by using runes, or by explicitly setting the `runes: true` compiler option), legacy mode
    features are no longer available"* (`svelte/legacy-overview`). The one dependency here that ships
    components — `@threlte/core`, four `.svelte` files — is runes-native already; all four use
    `$props()` and none uses `export let`, checked before this was set.

    Negative control, run in the room where the same flag landed first: an `export let` added to one
    component takes the build from exit 0 to exit 1 with *"Cannot use `export let` in runes mode —
    use `$props()` instead"*. A flag whose effect is not observed is a flag nothing reads.
  */
  compilerOptions: { runes: true },
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
