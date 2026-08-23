import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end harness.
 *
 * ## This file did not exist, and `test:e2e` is in the quality gate
 *
 * `package.json` runs `pnpm run test:e2e` as part of `quality`, and `e2e/` holds three specs — but
 * there was no Playwright configuration anywhere in the repository. The specs navigate with
 * `page.goto('/register')`, which needs a `baseURL` to resolve, so the suite could not run at all.
 * A gate listed in the quality chain that cannot execute is worse than no gate: it reads as
 * coverage.
 *
 * ## Why the server is started HERE rather than by hand
 *
 * The owner's standing instruction is that nothing runs on local ports for this project — it is
 * deployed, more than one agent works in the repository, and a stray dev server means the next
 * person measures somebody else's code. `webServer` below makes the server the harness's property:
 * Playwright starts it, waits for it, and **tears it down when the run ends**, so there is nothing
 * left to forget about.
 *
 * ## `reuseExistingServer: false`, deliberately
 *
 * The usual value is `!process.env.CI`, which reuses whatever already answers on the port. That is
 * exactly wrong here. Other projects on this machine use this range, and reusing a foreign server
 * would run these assertions against a different application and report the result as this one's —
 * the precise failure the standing instruction exists to prevent. Failing loudly on a busy port is
 * the safer answer.
 */
const PORT = 5173;

export default defineConfig({
  testDir: 'e2e',
  // A journey that registers an account and clicks through it is not a unit test.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Serial. These share one database and one dev server; parallel workers would race on both.
  workers: 1,
  fullyParallel: false,
  /**
   * Retries in CI only, and the number is a measurement rather than a habit.
   *
   * ## What was measured, 2026-08-23
   *
   * Nine full runs against a throwaway cluster while this suite was being repaired. Eight were
   * clean. One had `guest room login preserves an email entered before hydration` fail, and the
   * shape of that failure is what this setting answers:
   *
   *   - the passing runs of that spec take **3.2s**; the failing one took **15.2s**;
   *   - `#login-nickname-new` kept its typed value and `#login-email`, in the same form, did not;
   *   - Playwright's call log resolved the field TWICE — first as `<input value="" …>`, the server's
   *     node, and then as `<input …>` with no `value` attribute at all. **The node was replaced, not
   *     hydrated**, which is how the typed value went missing.
   *
   * Re-running that one spec eight times immediately afterwards: **8 passed, every one at 3.2s.**
   * So it is load-correlated and rare, and nothing here can honestly name the mechanism from a
   * single sample. It is written down in `TODO.md` rather than explained away.
   *
   * ## Why a retry is not green-washing
   *
   * Playwright does not hide a retried test. A spec that fails then passes is reported as **flaky**
   * and the run says so; a spec that fails every attempt is still red. So this converts an
   * occasional timing artefact from "the gate is broken" into "the gate says this one is flaky",
   * which is the honest signal — and the repository's own note about the backend gate applies here
   * too: a gate that goes red for reasons nobody can attribute is a gate people learn to cancel.
   *
   * Zero retries locally, deliberately. A developer chasing this should see it fail the first time.
   */
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Kept only for a failure, so a green run leaves no artefacts behind.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite dev',
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: false,
    // A cold Vite start plus the first SSR compile; the default 60s is tight on a first run.
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
