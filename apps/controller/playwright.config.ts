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
