import { defineConfig, devices } from '@playwright/test';

/**
 * The ROOM's browser harness.
 *
 * ## Why this exists, measured rather than assumed
 *
 * `apps/controller` has had an end-to-end job since 2026-08-23, and the note in `quality.yml`
 * records what its first real run cost: six specs had rotted against deliberate changes the
 * application had made correctly. **The room had nothing.** Every render assertion about the room —
 * the compact message layout, the alert overlay's cards, the scheduler pane, forty-six components —
 * is made by reading source text or by mounting a component in jsdom. Neither has ever painted a
 * pixel, and the repository says so in its own verification notes, every time, as "nothing was
 * opened in a browser".
 *
 * That is the gap this closes. It is not a replacement for the 3,085 unit assertions; it is the one
 * kind of failure they structurally cannot see — markup that type-checks, mounts, and renders wrong.
 *
 * ## RUNNING IT IN A CLAUDE-CODE CONTAINER, recorded 2026-09-02 because it looked impossible
 *
 * `pnpm run test:e2e` failed here on every spec with
 * `browserType.launch: Executable doesn't exist at
 * /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`.
 * That is not a harness problem and not an application problem: Playwright 1.62.1 asks for Chromium
 * build **1234** and the image ships **1194**, under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`
 * with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`, so nothing fetches the missing one.
 *
 * The fix is one symlink and it belongs in the ENVIRONMENT rather than in this file — pinning an
 * `executablePath` here would make CI launch a binary the runner does not have:
 *
 * ```sh
 * mkdir -p /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64
 * ln -sfn /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
 *   /opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
 * ```
 *
 * With that in place the suite runs green in this container. It is written down because the failure
 * names a path and not a cause, and reads exactly like "the browser cannot run here" — which is how
 * a session concludes that browser verification is unavailable and writes "nothing was opened in a
 * browser" for the rest of the day.
 *
 * ## Two servers, and the stub is the interesting one
 *
 * The room fails CLOSED without its configuration, so nothing renders until something answers
 * `/internal/room-config/<shortCode>`. `e2e/stub-controller.mjs` is that something, and it VERIFIES
 * the capability bearer rather than accepting it — see its own header for why that turns scaffolding
 * into a test.
 *
 * Bringing the real controller here would add PostgreSQL, migrations, an account and a launch flow
 * to a job whose subject is whether the ROOM renders, and would give every failure two possible
 * causes. The controller's own behaviour is tested by the controller's own job.
 *
 * ## `reuseExistingServer: false`, for the reason the controller's config gives
 *
 * Other projects on this machine use this range. Reusing a foreign server would run these assertions
 * against a different application and report the result as this one's. Failing loudly on a busy port
 * is the safer answer.
 */
const PORT = 5174;
const STUB_PORT = 5199;

/**
 * The secret both halves sign with.
 *
 * A literal, and deliberately in plain sight: it authorises nothing outside this process pair, which
 * lives for the length of one run. A repository secret here would imply it guards something. The
 * value must be identical in both `webServer` entries or the stub refuses every page load — which is
 * the failure mode the stub exists to be able to have.
 */
const E2E_SECRET = 'room-e2e-ephemeral-signing-secret';

const env = {
  ROOM_JWT_SECRET: E2E_SECRET,
  CONTROL_BASE_URL: `http://127.0.0.1:${STUB_PORT}`,
  /*
    A throwaway database per run. `.data/` is gitignored; a fixed path rather than a temp directory
    because `better-sqlite3` wants a real file and the room's own bootstrap creates the schema on
    first open, so there is nothing to seed.
  */
  DATABASE_URL: '.data/e2e.sqlite',
  /*
    Settings for named rooms, which is how `room-config-seam.spec.ts` observes one setting BOTH ways
    in a single run. The stub keys on the short code — `any short code is a room` was already true of
    it — so `hidden` answers with the column hidden and every other code gets the default.

    Here rather than in the spec because `webServer.env` is read once at boot: a spec cannot change
    it, which is exactly the property that makes the two answers race-free rather than ordered.
  */
  ROOM_SETTINGS_BY_CODE_JSON: JSON.stringify({ hidden: { hideChatAlerts: true } })
};

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  /*
    60s, which is generous for a served page and deliberately not more. The cold-compile cost that
    forced this to 120s belonged to `vite dev`; the harness builds now, so a spec taking a minute
    means something is wrong rather than something is warming up.
  */
  timeout: 60_000,
  expect: { timeout: 10_000 },
  /*
    Serial, and it is not a performance oversight. Every spec shares one SQLite file and one stub
    whose settings come from its environment, so parallel workers would race on both — and the room's
    realtime hub is process-local, which means two workers would see each other's alerts.
  */
  workers: 1,
  fullyParallel: false,
  /*
    No retries anywhere, including CI — deliberately narrower than the controller's config, which
    allows two.

    That setting is a measurement of ONE spec's load-correlated hydration flake, written up in its
    own file. This suite has no such measurement, and starting with retries would mean the first
    genuine flake here arrives already hidden. It is easier to add a retry with evidence later than
    to notice a test that has been quietly passing on its second attempt.
  */
  retries: 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    /*
      `prefers-reduced-motion: reduce`, and it is a CORRECTNESS setting here rather than a courtesy.

      Playwright refuses to click an element until it is visible, enabled and STABLE — two animation
      frames in the same place. The login button never became stable, so every click hung until the
      hook's budget was gone, and the call log said so in as many words: "waiting for element to be
      visible, enabled and stable".

      This stack's own stylesheet answers the query — `@media (prefers-reduced-motion: reduce)` sets
      `transition: none` on `.btn` and `.form-control` — so asking for it is asking the application
      for the behaviour it already implements, not suppressing a check. It also means the suite
      exercises the reduced-motion path, which nothing else here does.
    */
    reducedMotion: 'reduce',
    /*
      What a reverse proxy in front of the built server would set. See `PROTOCOL_HEADER` below for
      why the server needs telling: without these it assumes `https`, and every form POST from this
      `http` origin is refused as cross-site.
    */
    extraHTTPHeaders: {
      'x-forwarded-proto': 'http',
      'x-forwarded-host': `127.0.0.1:${PORT}`
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    /*
      AN ESCAPE HATCH FOR A PRE-INSTALLED BROWSER, and it is unset everywhere that matters.

      CI runs `playwright install --with-deps chromium`, so Playwright finds its own pinned build and
      this is `undefined` — the default, and the only configuration the workflow relies on. Some
      development containers ship a Chromium at a fixed path whose build number does not match the
      pinned `@playwright/test`, and there the launcher fails with "Executable doesn't exist" against
      a directory that plainly has a Chromium in it.

      `PLAYWRIGHT_CHROMIUM_PATH` lets that machine point at what it has without editing this file.
      Deliberately NOT defaulted to any path: a hard-coded container path in a committed config is a
      test that passes on one machine and fails everywhere else, which is worse than one that asks.
    */
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      /*
        CHROMIUM'S OWN BACKGROUND TRAFFIC, switched off — and it is not cosmetic.

        A default Chromium reaches for the component updater, the optimisation-hints service, safe
        browsing and a captive-portal probe on every launch. On a machine with restricted egress each
        of those hangs until it times out, and the run's logs fill with `handshake failed` lines that
        belong to none of the assertions. Measured here: the difference between a suite that finishes
        and one that spends nine minutes waiting on hosts it does not need.

        Every flag below removes traffic the ROOM does not generate. Nothing here changes how the page
        under test renders, which is the line between speeding a suite up and weakening it.
      */
      args: [
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-client-side-phishing-detection',
        '--disable-default-apps',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=Translate,OptimizationHints,MediaRouter,InterestFeedContentSuggestions',
        // A container's /dev/shm is small; without this Chromium can crash mid-run on a large page.
        '--disable-dev-shm-usage'
      ]
    }
  },
  /**
   * The browser, and the one affordance that lets this suite run outside CI.
   *
   * CI installs its own Chromium (`playwright install --with-deps chromium`, `quality.yml`) and
   * `PLAYWRIGHT_CHROMIUM_PATH` is unset there, so this resolves to `undefined` and Playwright uses
   * the build it downloaded — CI behaviour is untouched.
   *
   * **It exists because a pinned Playwright wants a pinned browser build, and a sandbox that ships
   * one cannot supply the other.** Measured here on 2026-08-30: this repository pins
   * `@playwright/test` 1.62.1, which looks for `chromium_headless_shell-1234`, while the container
   * had build 1194 pre-installed at `/opt/pw-browsers`. Every spec failed with *"Executable doesn't
   * exist"* before the first assertion ran — so the ONE kind of failure this suite exists to catch
   * was unreachable in the one environment where the code was being written.
   *
   * Downloading a second browser is the alternative and it is worse: it is a ~150MB fetch per
   * environment for a binary that is already on disk, and pinning the path in the config would break
   * CI. An env var is the seam that lets both be right.
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined }
      }
    }
  ],
  webServer: [
    {
      // The stub first: the room's very first page load asks it for the configuration.
      command: 'node e2e/stub-controller.mjs',
      url: `http://127.0.0.1:${STUB_PORT}/internal/room-config/0000`,
      /*
        The stub answers that probe with 401 — no bearer is presented — and 401 is exactly what a
        healthy stub should say to an unsigned request. Playwright treats any HTTP response as
        "listening" unless told otherwise, so this is the readiness check AND a proof that the
        refusal path is live before a single spec runs.
      */
      reuseExistingServer: false,
      timeout: 30_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env
    },
    {
      /*
        THE BUILT SERVER, NOT `vite dev`, and it is a measurement rather than a preference.

        Under `vite dev` the room's page is compiled for SSR on its FIRST REQUEST, and it is the
        largest component in the repository. Measured here: the first spec to enter the room blew
        through a ninety-second wait and then a two-minute hook budget, while every spec after it ran
        in seconds. Raising bounds was chasing the symptom.

        `vite build` takes ~25s once and the server then answers immediately. It is also the honest
        thing to test: `adapter-node` output is what actually ships, and a dev server differs from it
        in exactly the ways that produce "works locally" bugs.

        `ADAPTER=node` because `vite.config.ts` picks the Vercel adapter otherwise, and the room
        cannot deploy there — `docs/NEXT-SESSION.md` gives the two reasons.
      */
      command: 'ADAPTER=node npx vite build && node build',
      /*
        `/session` and not `/`, because the room's root redirects into a room and a redirect chain is
        a poor readiness probe. This route renders without a session, which is the point of it.
      */
      url: `http://127.0.0.1:${PORT}/session`,
      reuseExistingServer: false,
      // The build plus the boot. Generous, because a cold CI runner has no Vite cache at all.
      timeout: 300_000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...env,
        // `adapter-node` reads both. Without ORIGIN it refuses form POSTs as cross-site.
        PORT: String(PORT),
        HOST: '127.0.0.1',
        /*
          THE HARNESS PLAYS THE REVERSE PROXY THAT PRODUCTION HAS, and without it every form POST is
          refused as cross-site.

          `adapter-node` builds the request URL with `protocol_header ? headers[protocol_header] :
          'https'` — it assumes HTTPS when nothing tells it otherwise, which is right, because the
          only sane way to serve it is behind TLS. SvelteKit's CSRF check then compares the browser's
          `Origin` (`http://127.0.0.1:5174`) against that self-origin (`https://127.0.0.1:5174`),
          they differ, and the login POST comes back
          `403 {"message":"Cross-site POST form submissions are forbidden"}`.

          `ORIGIN` used to override this and is GONE in this version — the built server reads no such
          variable; `kit.paths.origin` replaced it, and setting that would be a production config
          change made for a test. So the harness does what a proxy does: names the header and sends
          it (see `extraHTTPHeaders` above). Nothing is weakened — the check still runs, against the
          truth.
        */
        PROTOCOL_HEADER: 'x-forwarded-proto',
        HOST_HEADER: 'x-forwarded-host'
      }
    }
  ]
});

/** Exported so a spec can mint the handoff the room's own login route verifies. */
export { E2E_SECRET, PORT, STUB_PORT };
