/**
 * Types for `@sveltejs/kit/internal/server`, which ships none that TypeScript can resolve.
 *
 * The subpath is real — `@sveltejs/kit@3.0.0-next.16`'s own `package.json` maps
 * `"./internal/server"` to `./src/exports/internal/server/index.js` — but it points `types` at
 * `./types/index.d.ts`, which `svelte-check` reports as "not a module" for this entry. So the import
 * RESOLVES and RUNS (`remote-command-harness.test.ts` executes it) while the type-checker has
 * nothing to go on.
 *
 * This declares only the one function used, and its signature is TRANSCRIBED from the JSDoc on the
 * implementation rather than guessed —
 * `node_modules/@sveltejs/kit/src/exports/internal/server/event.js`:
 *
 * ```js
 * /**
 *  * @template T
 *  * @param {RequestStore | null} store
 *  * @param {() => T} fn
 *  *\/
 * export function with_request_store(store, fn) {
 *   try {
 *     sync_store = store;
 *     return als ? als.run(store, fn) : fn();
 *   } finally { ... }
 * }
 * ```
 *
 * `store` is `unknown` here and not `RequestStore`, because `RequestStore` lives in Kit's private
 * `types` package and is not exported. Narrowing it to a shape invented in this repository would be
 * a guess that compiles — the worst kind — so the single caller casts at the call site and
 * `remote-command-harness.ts` documents, field by field, which parts Kit actually reads and where
 * each was read from.
 *
 * Delete this file the moment Kit ships types for the subpath.
 */
declare module '@sveltejs/kit/internal/server' {
  export function with_request_store<T>(store: unknown, fn: () => T): T;
}
