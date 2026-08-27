import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/*
  MIRROR `.svelte-kit/generated/build` INTO `.svelte-kit/generated/dev` BEFORE THE SUITE RUNS.

  ## The defect, read out of Kit's own source rather than inferred

  `@sveltejs/kit/src/exports/vite/index.js:396-399` registers this alias:

      { find: '<sveltekit:generated>',
        replacement: `${out_dir}/generated/${is_build ? 'build' : 'dev'}` }

  Under `vitest run` the Vite command is `serve`, so `is_build` is false and every
  `<sveltekit:generated>/…` specifier resolves into `generated/dev`. But `svelte-kit sync` — the
  only generator that runs before tests, via `prepare` — writes `generated/build` and leaves
  `generated/dev` holding just `app-manifest.js` and `env/`. The one file the alias is asked for,
  `server.js`, is in the directory it is not looking at.

  So fifteen suites — every `render` from `svelte/server` against a `+page.svelte`, because a route
  imports `$app/*` which reaches `runtime/app/paths/server.js` — failed to COLLECT with

      Cannot find module '<sveltekit:generated>/server.js'

  the moment Kit went 3.0.0-next.23 -> next.25. Nothing in this repository changed to cause it, and
  the failure was hidden behind an unrelated lockfile error until 2026-08-27.

  ## Why a mirror, and not one of the six things tried first

  Each of these was measured and rejected, and they are listed so nobody spends the afternoon again:

    * `svelte-kit sync` — writes `build/` only. Running it more does not help.
    * `vite build` — also writes `build/` only, so reordering CI to build BEFORE testing, which is
      the obvious fix, would not have worked either.
    * deleting `.svelte-kit` — fails identically, so this is not a stale artifact.
    * `resolve.conditions` / `ssr.resolve.conditions: ['browser']` — sends `$app/*` to the CLIENT
      entry, which reads `window.fetch` at module scope and needs a DOM. With jsdom added globally
      the run went from 15 failures to 37, because most of this suite is server and pure logic.
    * `resolve.alias` for `'<sveltekit:generated>/server.js'` — never matched. Kit aliases the
      PREFIX `'<sveltekit:generated>'`, not the full specifier.
    * a `resolveId` plugin, before and after `sveltekit()`, and `optimizeDeps.exclude` — the
      importer is an externalised `node_modules` file that Node loads without consulting Vite, so
      no Vite hook is reached at all.

  Copying the directory needs none of that. It gives the alias exactly what it already asks for, in
  the place it already looks, using bytes the official generator produced.

  ## Why the whole directory and not just `server.js`

  Measured: copying `server.js` alone moves the failure to
  `Cannot find module './shared/error-template.js'`. That import is relative, so it resolves beside
  wherever `server.js` sits — `shared/` has to come with it.

  ## Scope

  Test-time only; this file is referenced solely from `test.globalSetup`. It writes into
  `.svelte-kit`, which is generated and gitignored, and it touches nothing under `src`. The
  production build is unaffected — there `is_build` is true and the alias already points at the
  directory `sync` fills.

  It is a WORKAROUND for an upstream inconsistency, not a design. When a Kit release makes `sync`
  emit `generated/dev`, or makes the alias fall back to `build`, delete this file and its
  `globalSetup` entry — `pnpm test:unit` failing by 15 suites is how you will know it is still
  needed.
*/

const generated = (name: string) => fileURLToPath(new URL(`./.svelte-kit/generated/${name}`, import.meta.url));

export default function setup(): void {
  const build = generated('build');
  const dev = generated('dev');

  /*
    Absent means `svelte-kit sync` has not run. Failing loudly beats mirroring nothing and letting
    fifteen suites report a missing module, which is the confusing symptom this exists to remove.
  */
  if (!existsSync(build)) {
    throw new Error(
      `.svelte-kit/generated/build is missing — run \`svelte-kit sync\` first. ` +
        `See the note in vitest.global-setup.ts for why the test run depends on it.`
    );
  }

  // `force` so a stale `dev/` from an earlier run cannot shadow a freshly synced `build/`.
  cpSync(build, dev, { recursive: true, force: true });
}
