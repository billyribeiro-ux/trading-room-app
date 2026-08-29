import { sveltekit } from '@sveltejs/kit/vite';
import vercel from '@sveltejs/adapter-vercel';
import node from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import {
  EVIDENCE_ROOTS,
  discoverEvidenceBoundTests,
  missingEvidenceRoots
} from './gate/evidence-bound-tests.mjs';

/*
  Two adapters, selected by `ADAPTER`, defaulting to Vercel.

  `ADAPTER=node` is kept deliberately and is not spare scaffolding — it is the escape hatch for a
  constraint this application actually has. `src/routes/sess/[room]/events/+server.ts` serves a
  long-lived `text/event-stream` with a heartbeat; a serverless function has a bounded maximum
  duration, so a trading session lasting hours will be cut and the browser will reconnect for as
  long as the room stays open. That degrades rather than breaks — but "degrades on a timer" is worth
  naming here rather than discovering under load.

  Moved from `svelte.config.js`, which Kit 3 no longer reads.
*/
const target = process.env.ADAPTER ?? 'vercel';
import { defineConfig } from 'vitest/config';

/**
 * Makes the Rust API reachable on this origin during `vite dev`.
 *
 * Nothing in this app calls it yet. It is here so that when the room does, the session works:
 * the API issues `__Host-` prefixed cookies, which a browser only sends to the origin that set
 * them and which cannot carry a `Domain`. Calling `127.0.0.1:8080` cross-origin would mean
 * either a `Domain=`-scoped cookie - readable by every present and future subdomain - or CORS
 * plus `credentials: 'include'` and a second `Origin` allowlist to get wrong.
 *
 * `ws: true` is what makes the realtime socket work: `/api/v1/rooms/{id}/events` is an upgrade
 * request, and without it Vite answers the handshake itself and the socket closes immediately.
 *
 * In production this is a reverse proxy in front of both processes.
 */
const API = process.env.TRADINGROOM_API_URL ?? 'http://127.0.0.1:8080';

/*
  The room's dev/preview port, declared here so the pair of applications agrees by construction
  rather than by memory.

  There was no port here at all, so the room took Vite's default 5173 — the very port the
  controller wants — while the CONTROLLER's `.env` pointed `ROOM_BASE_URL` at 5174 and the room's
  own `.env` pointed `CONTROL_BASE_URL` at 5180, a port nothing served. Every one of the four values disagreed, and the symptom was a bare
  500 on Launch: the room fetched its configuration from the controller, got ECONNREFUSED, and
  failed closed exactly as designed. The design was right; the wiring was never true.

  `strictPort` so a busy port is a loud failure instead of a silent bind to the next one. Declaring
  5174 here is also what frees 5173 for the controller, which is where the owner wants it.

  Paired with the controller's own SSOT (`vite.config.ts`, port 5173). Change either and change the
  matching `*_BASE_URL` in both `.env.example` files.
*/
const localHost = '127.0.0.1';
const localPort = 5174;

/*
  Which tests this machine is able to run, decided by what it can actually see.

  49 of this suite's test files read the reference captures, which are gitignored on purpose and
  symlinked in from `~/Desktop/new-room/` — they are dumps of a live room and this repository is
  public. On the owner's machine every symlink resolves, `missing` is empty, and NOTHING is excluded:
  the full suite runs exactly as it always has. On CI none of them resolve, and those 49 files are
  excluded rather than left to die on `ENOENT`, which is why `quality.yml` had failed every run since
  PR #28.

  Computed only under Vitest. `vite build` has no use for it, and reading 108 files on every
  production build to answer a question nobody asked is the kind of cost that gets added once and
  never noticed again.

  The count is PRINTED, never silent. A suite that quietly tests half of itself and reports green is
  worse than one that fails, because the green is what gets believed. `gate/evidence-bound-tests.mjs`
  carries the reasoning, and `src/lib/evidence-partition.test.ts` pins the exact list so that
  over-matching — the failure mode that loses coverage quietly — shows up as a failed assertion in a
  diff rather than as a smaller number nobody read.
*/
const evidenceBoundExclusions = (() => {
  if (!process.env.VITEST) return [];
  const missing = missingEvidenceRoots();
  if (missing.length === 0) return [];
  const excluded = discoverEvidenceBoundTests();
  console.info(
    `[vitest] ${excluded.length} evidence-bound test file(s) excluded: this checkout is missing ` +
      `${missing.length} of ${EVIDENCE_ROOTS.length} reference-capture roots (${missing.join(', ')}). ` +
      'They are gitignored by design; see gate/evidence-bound-tests.mjs. This run does NOT cover them.'
  );
  return excluded;
})();

export default defineConfig({
  // Kit 3 takes configuration through the plugin; `svelte.config.js` is gone and the `kit` namespace
  // with it, so these sit at the top level.
  plugins: [
    sveltekit({
      /*
        NO `alias`, and its absence is the deliverable rather than a tidy-up.

        This carried `alias: { $lib: 'src/lib' }` from the Kit 3 upgrade until 2026-08-16 — a
        compatibility shim taken deliberately, so that several hundred import sites would not be
        renamed inside the same diff as a framework major. The note here said "Migrating to `#lib`
        is its own change," and this is that change.

        `#lib` resolves through the `imports` field in `package.json`, which is Node's own subpath
        imports and needs no bundler cooperation — which is precisely why Kit dropped the alias: the
        code that used to coordinate the Vite alias and the TypeScript path could be deleted, because
        Vite and TypeScript both read `imports` natively.

        The specifiers carry an explicit extension because subpath imports are resolved LITERALLY —
        `#lib/*` maps to `./src/lib/*` with no extension search and no index lookup.
        `lib-subpath-imports.test.ts` checks that every one of them lands on a real file.
      */
      /*
        Remote functions — `.remote.ts` files exporting `query` / `command` / `form`, called with a
        real signature on the client and executed on the server.

        Opted into with a consumer in the same commit, never on its own: a flag nothing reads is the
        dead configuration this repository forbids. The first consumer is
        `src/routes/chat-mute.remote.ts`.

        It is EXPERIMENTAL and the docs say so in as many words — "likely to contain bugs and
        subject to change without notice". It is taken anyway because the thing it replaces is
        worse: `fetch('?/unmuteChat')` names its endpoint in a string nothing type-checks, hands it
        `FormData` of stringified numbers, and reports failure as a boolean on a `Response`. The
        argument is validated once, on the server, by a schema — not parsed twice and trusted once.

        `compilerOptions.experimental.async` is deliberately NOT set alongside it. That option is
        what allows `await` in a component's template; every call here is `await` inside an ordinary
        event handler, which is plain JavaScript and needs no compiler support. Turning it on would
        change how a 13,000-line component compiles to buy nothing.
      */
      experimental: { remoteFunctions: true },
      preprocess: vitePreprocess(),
      adapter: target === 'node' ? node() : vercel()
    })
  ],
  server: {
    host: localHost,
    port: localPort,
    strictPort: true,
    proxy: {
      '/api/v1': { target: API, changeOrigin: false, ws: true },
      // Called server-side by `$lib/server/tradingroom-api`, so this is only here so a browser
      // that follows a redirect to one does not get a 404 from Vite.
      '/api/auth': { target: API, changeOrigin: false }
    }
  },
  preview: { host: localHost, port: localPort, strictPort: true },
  /*
    Vitest transforms with `ssr: true` by default, which compiles `.svelte.ts` runes to their SERVER
    form - where `$effect` is a documented no-op. The consequence is not obvious and cost a pass to
    find: an effect in a test records nothing, throws nothing, and reports nothing, so a reactivity
    test passes while asserting against an empty array. A jsdom environment does NOT fix it; that
    was measured. The environment is not the cause, the compile mode is.

    The official testing guidance prescribes exactly this: point Vitest at the browser entry points
    even though it runs in Node. Guarded on VITEST so the dev server and production build are
    untouched.
  */
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    // Points the suite at a throwaway database instead of the app's; see vitest.setup.ts.
    setupFiles: ['./vitest.setup.ts'],
    /*
      Both of these exist for one Kit change, and they stand or fall together.

      Kit 3.0.0-next.25 rewired its server runtime: `src/runtime/app/paths/server.js` now imports
      `'<sveltekit:generated>/server.js'`, a specifier only the Kit Vite plugin's alias can resolve
      (next.23 used a relative import that Node could follow on its own). Under Vitest, files in
      node_modules are externalized by default - Node resolves their imports natively, no Vite
      alias applies, and every test file that touches `$app`'s server flavour died at import with
      "Cannot find module '<sveltekit:generated>/server.js'": fifteen contract files, zero tests
      collected in each.

      `deps.inline` routes Kit's runtime through Vite's transform so the alias CAN apply; `alias`
      supplies the targets. TWO of them, because `svelte-kit sync` - the only generation step this
      suite runs - splits the flavours: `generated/build/` has `server.js` but no `env/`, while
      `generated/dev/` has the whole `env/` tree but no `server.js` (that one appears only once a
      real dev server has run). Verified by deleting `.svelte-kit/generated` and re-running sync,
      then listing both directories. The exact-file entry must sit above the prefix entry - vitest
      tries aliases in order.
    */
    alias: {
      '<sveltekit:generated>/server.js': new URL(
        './.svelte-kit/generated/build/server.js',
        import.meta.url
      ).pathname,
      '<sveltekit:generated>': new URL('./.svelte-kit/generated/dev', import.meta.url).pathname
    },
    server: {
      deps: {
        inline: [/@sveltejs[\\/]kit/]
      }
    },
    // `new-room-control` is a separate SvelteKit project that happens to sit in this directory. Its
    // files resolve `$lib` against ITS src, so collecting them from this root fails at import with
    // "Cannot find module '$lib/sanitize-html'" - five red files that are not this app's tests. It
    // has its own runner; this one stops at this project's boundary.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      'new-room-control/**',
      /*
        `e2e/` is Playwright's, not Vitest's. Its specs import `@playwright/test`, which throws
        outside a Playwright runner — so without this line `vitest run` reports a failed test FILE
        for a suite that is perfectly healthy, and the failure names the wrong tool.
      */
      'e2e/**',
      ...evidenceBoundExclusions
    ]
  }
});
