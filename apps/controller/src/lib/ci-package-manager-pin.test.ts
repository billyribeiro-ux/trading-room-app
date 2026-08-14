import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The pnpm version, which is pinned in four files and was allowed to disagree in two of them.
 *
 * ## What happened
 *
 * `package.json` moved to `pnpm@11.21.0` on 2026-08-09. On 2026-08-12 the backend workflow was
 * written with `corepack prepare pnpm@11.18.0 --activate`, three days out of date, and nothing
 * noticed until a push ran the job on 2026-08-14.
 *
 * The failure was not "wrong version installed", which would have been obvious. `--activate` sets
 * corepack's DEFAULT, but inside a project directory the pnpm shim always resolves the
 * `packageManager` field, so the runner activated 11.18.0 and then `pnpm --version` went looking
 * for 11.21.0. Corepack asks before downloading a package manager and a runner has no TTY, so the
 * question was an immediate `exit 1`:
 *
 * ```
 * Preparing pnpm@11.18.0 for immediate activation...
 * ! Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-11.21.0.tgz
 * Error: Process completed with exit code 1.
 * ```
 *
 * Suppressing the prompt alone would only have moved the failure one line down, to a `test` that
 * compared the shim's output against a number the shim was never going to print. **The version
 * being written twice was the defect; the prompt was what made it visible.**
 *
 * ## What this file asserts
 *
 * Two rules, both mechanical:
 *
 * 1. **No workflow hard-codes a pnpm version.** The fix was `corepack install`, which reads the pin
 *    out of `package.json`, so there is now exactly one place the number lives. A workflow that
 *    reintroduces `pnpm@x.y.z` is reintroducing the bug, whether or not the number happens to be
 *    right on the day it is written — the whole point is that it stops being right later.
 * 2. **Every `packageManager` field in the workspace agrees.** Three `package.json` files carry
 *    one, they are currently identical, and nothing made them stay that way. Corepack resolves the
 *    NEAREST one, so a drifted app would silently run a different pnpm from the repository root.
 *
 * Deliberately NOT asserted: which version it is. Pinning that here would make this file the fifth
 * place the number lives, and every routine bump would have to edit a test whose entire purpose is
 * that the number is written once.
 */

const ROOT = `${process.cwd()}/../..`;
const WORKFLOW_DIR = `${ROOT}/.github/workflows`;

const workflows = readdirSync(WORKFLOW_DIR)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, text: readFileSync(`${WORKFLOW_DIR}/${name}`, 'utf8') }));

const manifests = ['package.json', 'apps/controller/package.json', 'apps/room/package.json'].map((path) => ({
  path,
  packageManager: JSON.parse(readFileSync(`${ROOT}/${path}`, 'utf8')).packageManager as string | undefined
}));

describe('the pnpm pin lives in exactly one place', () => {
  it('finds the workflows at all, so an empty sweep cannot pass silently', () => {
    // Without this, a renamed directory would turn every assertion below into a vacuous truth.
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows.map((w) => w.name)).toContain('backend-quality.yml');
  });

  it.each(workflows)('$name hard-codes no pnpm version', ({ text }) => {
    /*
      Matches `pnpm@11.21.0` and `pnpm@11`, not `pnpm install` or `pnpm --version`. The point is the
      literal VERSION, which is the thing that goes stale.
    */
    const pinned = text.match(/pnpm@\d[\w.-]*/g) ?? [];
    expect(pinned).toEqual([]);
  });

  it('the backend workflow installs from the manifest and verifies what it got', () => {
    /*
      Comment lines are stripped first, and that is not fussiness — the first version of this
      assertion passed against a workflow with `corepack install` DELETED, because the comment
      explaining the command still contained the words. The negative control is what found it. An
      assertion satisfied by prose about the code is not an assertion about the code.
    */
    const raw = workflows.find((w) => w.name === 'backend-quality.yml')?.text ?? '';
    const backend = raw
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');
    expect(backend).toContain('corepack install');
    // The prompt suppression is load-bearing on a runner: without it corepack exits 1 rather than
    // asking, which is exactly how this surfaced.
    expect(backend).toContain('COREPACK_ENABLE_DOWNLOAD_PROMPT');
    // Installing without checking would let a silent corepack fallback through.
    expect(backend).toContain("require('./package.json').packageManager.split('@')[1]");
  });

  it('every packageManager field in the workspace agrees', () => {
    for (const manifest of manifests) {
      expect(manifest.packageManager, `${manifest.path} must pin a packageManager`).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    }
    const distinct = new Set(manifests.map((m) => m.packageManager));
    expect(
      [...distinct],
      `these manifests disagree: ${manifests.map((m) => `${m.path}=${m.packageManager}`).join(', ')}`
    ).toHaveLength(1);
  });
});
