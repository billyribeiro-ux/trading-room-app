import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every SvelteKit application in this workspace runs `svelte-kit sync` from `prepare`.
 *
 * ## What was found, 2026-08-27, by running the suite on a fresh checkout
 *
 * `apps/controller` has carried `"prepare": "svelte-kit sync"` since it was created. `apps/room`
 * never has. Nothing made them agree, and the difference is invisible on a machine where
 * `.svelte-kit` already exists — which is every machine that has ever run `pnpm dev` or
 * `pnpm check`.
 *
 * On a clone that has not, the room's suite does not merely fail, it fails in a way that reads as a
 * broken test rather than a missing generation step. Measured on this container, `pnpm install`
 * followed immediately by `vitest run` in `apps/room`:
 *
 *     Test Files  17 failed | 124 passed (141)
 *          Tests   1 failed | 1902 passed (1903)
 *     Cannot find module '<sveltekit:generated>/server.js'
 *
 * Sixteen of those seventeen collected ZERO tests — the count did not go red, it went missing, and
 * a suite that quietly covers less is the failure this repository names as worse than one that
 * fails. Running `svelte-kit sync` once and nothing else: **141 passed (141), 2,140 tests**.
 *
 * ## Why CI did not catch it
 *
 * `quality.yml` runs `pnpm run check` before `pnpm run test`, and the room's `check` opens with
 * `svelte-kit sync`. So the runner generates the tree as a side effect of type-checking, one step
 * before the step that needs it. The gate was green on a repository a contributor could not run —
 * which is the same shape as the thirty `package.json` entries that point into an untracked
 * directory, and it is why this is pinned rather than simply fixed.
 *
 * ## What is asserted, and what is deliberately not
 *
 * The `prepare` LIFECYCLE is what makes generation unconditional: pnpm runs it on install, for every
 * workspace project, before anything else in the repository executes. Asserting the exact string
 * `svelte-kit sync` rather than merely "prepare exists" is on purpose — a `prepare` that runs
 * something else would satisfy a weaker check while leaving the tree ungenerated.
 *
 * A SvelteKit app is identified by its `@sveltejs/kit` dependency rather than by a hard-coded list
 * of two names, so a third application added later is covered on the day it is added rather than on
 * the day somebody remembers this file.
 */

const APPS = `${process.cwd()}/../..`;

/** Every workspace app that depends on SvelteKit, with its parsed manifest. */
function sveltekitApps(): { name: string; scripts: Record<string, string> }[] {
  const dirs = readdirSync(`${APPS}/apps`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const apps: { name: string; scripts: Record<string, string> }[] = [];
  for (const dir of dirs) {
    const manifest = JSON.parse(readFileSync(`${APPS}/apps/${dir}/package.json`, 'utf8'));
    const deps = { ...manifest.dependencies, ...manifest.devDependencies };
    if (!deps['@sveltejs/kit']) continue;
    apps.push({ name: dir, scripts: manifest.scripts ?? {} });
  }
  return apps;
}

describe('svelte-kit sync runs from prepare in every Kit app', () => {
  const apps = sveltekitApps();

  /*
    The guard on the guard. If the discovery above ever returns nothing — a moved directory, a
    renamed dependency — every assertion below would pass by iterating an empty list, which is the
    vacuous-test failure this repository has already met four times.
  */
  it('finds the Kit applications at all', () => {
    expect(apps.length).toBeGreaterThanOrEqual(2);
    expect(apps.map((app) => app.name).sort()).toEqual(['controller', 'room']);
  });

  it.each(apps)('$name prepares with svelte-kit sync', ({ scripts }) => {
    expect(scripts.prepare).toBe('svelte-kit sync');
  });
});
