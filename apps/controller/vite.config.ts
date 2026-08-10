import { sveltekit } from '@sveltejs/kit/vite';
import { kitConfig } from './kit.config';
import { configDefaults, defineConfig } from 'vitest/config';

/*
  SSOT for both development and local production-preview networking.

  5173 by the owner's decision. It is Vite's default and it is free here because the ROOM
  application now declares 5174 of its own (`new-room/vite.config.ts`) instead of silently taking
  the default, which is what used to collide.

  This value is not local-only trivia: the room reaches back to
  `<CONTROL_BASE_URL>/internal/room-config/<code>` on every page load and fails closed if it cannot,
  so `CONTROL_BASE_URL` in the room's `.env` must name this exact port. Change one, change both.
*/
const localHost = '127.0.0.1';
const localPort = 5173;

export default defineConfig({
  /*
    GSAP IS BUNDLED INTO THE SERVER OUTPUT, NOT RESOLVED AT RUNTIME.

    This one line is what actually fixed a total outage of `/`. gsap 3.15 ships ESM in `index.js`
    and `ScrollTrigger.js` while declaring no `"type": "module"`, so those files are loadable only
    through a bundler. Left external, the Vercel function tried three different ways to load them
    and failed three different ways — a named export missing, then `Cannot use import statement
    outside a module`, then, when pointed at the CommonJS `dist/` builds, `Cannot find package
    'gsap'` because the tracer no longer included it.

    Every one of those is the same mistake underneath: a package whose entry points only work
    inside a bundler must not be left for Node to resolve. `noExternal` inlines it into the server
    chunk, so there is nothing to resolve, nothing to trace, and no CJS/ESM ambiguity — and the
    imports in `lib/motion.ts` can stay the ordinary named ESM ones the library documents.

    Local signals cannot catch the external case: `vite dev`, `vite build` and `vite preview` all
    bundle it. The only place it appeared was production.
  */
  ssr: { noExternal: ['gsap'] },
  /*
    SvelteKit configuration lives HERE. Kit 3 removed `svelte.config.js` and errors on its presence:
    "svelte.config.js is no longer used. Please pass configuration via the `sveltekit(...)` plugin in
    your Vite config."

    Note the shape — the `kit` namespace is GONE. The docs put it exactly: "the `kit` namespace is at
    the same level as the other top level entries; this is the only difference to the
    `svelte.config.js` layout." So `adapter`, `paths` and `preprocess` are siblings here.

    There is no `experimental.explicitEnvironmentVariables` any more either. It graduated: `src/env.ts`
    and `$app/env/private` are simply how environment variables work in Kit 3, and passing the old
    Kit 2.63 opt-in is now a type error.
  */
  plugins: [
    sveltekit(kitConfig)
  ],
  server: {
    host: localHost,
    port: localPort,
    strictPort: true,
    /*
      Do not watch generated output.

      `coverage/` is written by the test run, and Vite treated each of its hundreds of HTML files as
      a source change: one `pnpm test:unit` while `pnpm dev` was up produced 532 forced page
      reloads, which in a browser is indistinguishable from the app being dead. Measured after this
      change: 4.

      `playwright-report/` and `test-results/` are the same kind of generated churn.

      `.svelte-kit/` is deliberately NOT here. Those 4 remaining reloads are its generated route
      manifest, rewritten by `svelte-kit sync`, and reloading on them is correct — ignoring it would
      mean adding a route and seeing nothing happen.
    */
    watch: { ignored: ['**/coverage/**', '**/playwright-report/**', '**/test-results/**'] }
  },
  preview: { host: localHost, port: localPort, strictPort: true },
  test: {
    /*
      `*.db.test.ts` needs a real PostgreSQL binary (`initdb`/`pg_ctl`) to stand up a throwaway
      cluster, which CI does not have. Excluded from the default run and invoked on purpose with
      `pnpm test:db` — a gate that silently skips itself is worse than one you have to run.
    */
    /*
      `apps/**` is the room application. It has its own vitest, its own 493 tests and its own CI
      job; running it from here picked up 55 more files against this project's config and setup,
      which is a different suite pretending to be this one.
    */
    exclude: [...configDefaults.exclude, 'apps/**', 'e2e/**', '**/*.db.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,js}'],
      exclude: ['src/lib/room-settings-schema.ts'],
      thresholds: {
        // Measured 2026-08-02 source baseline, rounded down by at most 0.02pp.
        // Raise these values with coverage; never lower them to land a change.
        statements: 18.5,
        branches: 21.65,
        functions: 17.05,
        lines: 17.97,
        'src/lib/room-config.ts': {
          statements: 100,
          branches: 95,
          functions: 100,
          lines: 100
        },
        'src/lib/server/{api-key-secret,control-plane-policy}.ts': {
          statements: 90,
          branches: 80,
          functions: 100,
          lines: 90
        },
        'src/lib/sanitize-html.ts': {
          statements: 90,
          branches: 80,
          functions: 100,
          lines: 90
        }
      }
    }
  }
});
