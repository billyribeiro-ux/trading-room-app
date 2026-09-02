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

/*
  ── ONE VERSION OF SVELTE AND ONE OF SVELTEKIT, AND IT IS THE LATEST ────────────────────────────

  The owner's instruction, 2026-09-02: *"We gotta have only one version of svelte 5 and sveltekit
  which should be the latest!"*

  ## What was measured that day, before writing anything

  Against `npm view <pkg> dist-tags`, run in this container rather than recalled — the assistant's
  training predates these releases and a remembered version number is not evidence:

  | package | pinned here | newest published | which tag |
  | --- | --- | --- | --- |
  | `svelte` | 5.57.0 | 5.57.0 | `latest` |
  | `@sveltejs/kit` | 3.0.0-next.25 | 3.0.0-next.25 | `next` |
  | `@sveltejs/vite-plugin-svelte` | 7.3.0 | 7.3.0 | `latest` |
  | `svelte-check` | 4.7.6 | 4.7.6 | `latest` |
  | `@sveltejs/adapter-node` | 6.0.0-next.10 | 6.0.0-next.10 | `next` |
  | `@sveltejs/adapter-vercel` | 7.0.0-next.8 | 7.0.0-next.8 | `next` |
  | `vite` | 8.2.2 | 8.2.2 | `latest` |

  **Two of those tags read backwards and both matter.** `svelte`'s `next` tag is `5.0.0-next.272`,
  which is OLDER than `latest` — a stale tag left over from the 5.0 pre-release, so `latest` is the
  newest Svelte 5 and `svelte@next` would be a downgrade of fifty-seven minors. And
  `@sveltejs/kit`'s `latest` is **2.70.3**, the stable 2.x line: this workspace is deliberately on
  the 3.x preview, migrated 2026-08-13, and "upgrading to latest" would DOWNGRADE it off SvelteKit 3
  and undo `#lib`, the flattened config and the remote-functions opt-in with it. So for Kit,
  "the latest" means the newest `next`, and that is what is pinned.

  ## The duplicate the instruction was about was never in the repository

  This container held two Svelte trees in its virtual store, `5.56.10` beside `5.57.0`, with Kit and
  `vite-plugin-svelte` peer-variants built against each. It looked like two versions and was not:

    - `pnpm-lock.yaml` names `svelte@5.57.0` **39 times and 5.56.10 zero times**;
    - **no symlink anywhere** resolved into the 5.56.10 tree — every live edge, in both apps and in
      the virtual store's own root, pointed at 5.57.0;
    - neither `pnpm install --frozen-lockfile` nor `pnpm prune` removed it, because pnpm leaves
      unreferenced virtual-store trees in place;
    - deleting `node_modules` and reinstalling **from the same committed lockfile** produced exactly
      one tree each. That is the proof, and it is why nothing in the repository changed: a fresh
      clone never had the duplicate.

  So the leftover was an artifact of upgrading in place, one bump behind, and the thing worth
  keeping is not a fix but this gate — which is what stops a SECOND version arriving in the
  lockfile, where it would be real.

  ## Why the lockfile and not `node_modules`

  A test that counts directories under `.pnpm` measures whatever the last install happened to leave
  on the machine it runs on, which is exactly the state that just proved misleading. The lockfile is
  the specification: a resolution that is not in it cannot be installed from it.

  ## The cost, stated because it was paid today

  This file is in the CONTROLLER suite and polices the whole workspace, so a room-only change that
  introduces a second version turns the CONTROLLER gate red. That trade is the same one
  `naming-boundary.test.ts` makes, and on 2026-09-02 it cost a red gate that the room's own gate
  could not see. It is still the right side of the trade for a workspace-wide rule — CI runs both —
  and it is written down so the next person meets the sentence before the failure.
*/

const LOCKFILE = readFileSync(`${APPS}/pnpm-lock.yaml`, 'utf8');

/**
 * Every version the lockfile resolves for one package name.
 *
 * The lookbehind is load-bearing. `svelte@5.57.0` appears inside `eslint-plugin-svelte@…`,
 * `prettier-plugin-svelte@…` and `svelte-eslint-parser@…` as a substring, and all three are real
 * packages in this lockfile with versions of their own — a bare `svelte@` match would count them and
 * report a duplicate that does not exist. Peer suffixes are excluded the same way from the other
 * end: the lockfile writes `svelte@5.57.0(@typescript-eslint/types@8.68.0)` and only the semver
 * before the parenthesis is the resolution.
 */
const resolutionsOf = (name: string): Set<string> => {
  const escaped = name.replace(/[/@.+*?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?<![\\w./-])${escaped}@(\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?)`, 'g');
  return new Set([...LOCKFILE.matchAll(pattern)].map((match) => match[1]));
};

/** The packages whose duplication is what the instruction forbids. */
const SINGLE_VERSION = ['svelte', '@sveltejs/kit', '@sveltejs/vite-plugin-svelte', 'svelte-check'] as const;

describe('the workspace resolves exactly one Svelte and one SvelteKit', () => {
  it('is reading a lockfile that names these packages at all', () => {
    /*
      The guard on the guard, and this one has a real failure mode rather than a theoretical one: a
      lockfile format change, or a typo in a package name, makes every set below EMPTY — and an
      empty set has a size of one... no, of zero, which would fail. It is the `<= 1` shape that
      would pass vacuously, so the floor is asserted separately and the check below is an equality.
    */
    for (const name of SINGLE_VERSION) {
      expect(resolutionsOf(name).size, `${name} is not in the lockfile at all`).toBeGreaterThan(0);
    }
    /* And the lookbehind really does separate the neighbours, rather than the corpus lacking them. */
    expect(resolutionsOf('eslint-plugin-svelte').size).toBeGreaterThan(0);
    expect(resolutionsOf('svelte-eslint-parser').size).toBeGreaterThan(0);
  });

  it.each(SINGLE_VERSION)('resolves %s to exactly one version', (name) => {
    const versions = [...resolutionsOf(name)].sort();
    expect(
      versions,
      `${name} resolves to ${versions.length} versions — ${versions.join(', ')}. Two versions of ` +
        `Svelte or Kit in one workspace means two component runtimes, and a component compiled by ` +
        `one is not an instance the other recognises. Deduplicate the lockfile rather than pinning ` +
        `around it.`
    ).toHaveLength(1);
  });

  it('pins every one of them exactly, in both apps, at the same version', () => {
    const manifests = ['room', 'controller'].map((app) => ({
      app,
      pins: (() => {
        const manifest = JSON.parse(readFileSync(`${APPS}/apps/${app}/package.json`, 'utf8')) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        return { ...manifest.dependencies, ...manifest.devDependencies };
      })()
    }));

    for (const name of SINGLE_VERSION) {
      const declared = manifests.map(({ app, pins }) => ({ app, version: pins[name] }));
      for (const { app, version } of declared) {
        expect(version, `apps/${app} does not depend on ${name}`).toBeDefined();
        /*
          A range is how the second version arrives without anybody choosing it: `^5.57.0` lets a
          transitive peer pull a different patch into the tree on the next install, and the check
          above would then be red for a reason nobody edited.
        */
        expect(
          version,
          `apps/${app} pins ${name} as a RANGE (${version}) — a range is how a second version ` +
            `arrives without anybody choosing it`
        ).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
      }
      expect(
        new Set(declared.map((entry) => entry.version)).size,
        `the two apps declare different versions of ${name}: ` +
          declared.map((entry) => `${entry.app} ${entry.version}`).join(', ')
      ).toBe(1);
      /* And what they agree on is what the lockfile resolved — not merely agreement with each other. */
      expect([...resolutionsOf(name)]).toContain(declared[0].version);
    }
  });
});
