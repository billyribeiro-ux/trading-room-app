import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every file a `package.json` script names is a file this repository actually tracks.
 *
 * ## What this is for
 *
 * `.gitignore:176` excludes `/apps/room/scripts/` whole — deliberately, because the collectors in it
 * reach the reference application and this repository is public. Thirty script entries went on
 * naming files in that directory anyway. A clone got a manifest advertising thirty commands, every
 * one of which failed with `Cannot find module`, and nothing said so: the entries look exactly like
 * the two that work.
 *
 * That is the same defect class this repository keeps meeting under different names — a call site
 * and its target connected by a string that nothing checks. `presenterCommand` shipped dead for
 * three commits the same way; `remote-call-sites-contract.test.ts` exists because an interpolated
 * action name is not greppable. This is that check for the manifest.
 *
 * `docs/UNPUBLISHED-SCRIPTS.md` records the thirty as they read before removal, so the manifest
 * could shrink without losing the account of what was in it.
 *
 * ## Both apps, not just this one
 *
 * The room is where it happened; nothing makes the controller immune, and its manifest names
 * fourteen verifiers of its own. Checking both from one file is cheaper than the same file twice,
 * and it means a third app added later is covered on the day it is added.
 *
 * ## Why `git ls-files` and not `existsSync`
 *
 * The file existing on THIS machine is exactly the property that hid the defect for weeks. The
 * question is whether a fresh clone has it, and only git can answer that.
 */

const ROOT = `${process.cwd()}/../..`;

/** Every tracked path, or `null` when git cannot answer — see the guard below. */
function trackedFiles(): Set<string> | null {
  try {
    const out = execFileSync('git', ['ls-files'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024
    });
    return new Set(out.split('\n').filter(Boolean));
  } catch {
    return null;
  }
}

/*
  A script names a file when a path with a script extension appears in it. Bare words are not paths
  and `pnpm run x` is not a file, so the pattern requires a directory segment and an extension —
  which is how every entry in both manifests actually writes one.

  The trailing `(?![A-Za-z0-9])` is not decoration: without it `./tsconfig.json` matches as
  `tsconfig.js` with the `on` left behind, and both `check` scripts failed against a file that does
  not exist and was never named. An extension has to END where the pattern says it does.
*/
const SCRIPT_PATH =
  /(?:^|[\s'"=])((?:\.\/)?[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+\.(?:mjs|cjs|js|ts|sh))(?![A-Za-z0-9])/g;

function namedFiles(app: string): { script: string; path: string }[] {
  const manifest = JSON.parse(readFileSync(`${ROOT}/apps/${app}/package.json`, 'utf8'));
  const named: { script: string; path: string }[] = [];
  for (const [script, command] of Object.entries(manifest.scripts ?? {})) {
    for (const [, path] of String(command).matchAll(SCRIPT_PATH)) {
      named.push({ script, path: path.replace(/^\.\//, '') });
    }
  }
  return named;
}

const TRACKED = trackedFiles();

describe('every file a package.json script names is tracked', () => {
  /*
    The guard on the guard. Without git the sets below are empty and every assertion passes over
    nothing, which is the vacuous-test failure this repository has met four times. A checkout with no
    `.git` — a release tarball, a vendored copy — is a legitimate reason to skip, and it says so
    rather than reporting a green.
  */
  it('can read the tracked file list at all', () => {
    expect(
      TRACKED,
      'git ls-files returned nothing; this suite cannot check the manifests'
    ).not.toBeNull();
    expect(TRACKED!.size).toBeGreaterThan(100);
  });

  for (const app of ['room', 'controller']) {
    describe(app, () => {
      const named = namedFiles(app);

      it('names at least one file, so the pattern is not silently matching nothing', () => {
        expect(named.length).toBeGreaterThan(0);
      });

      it.each(named)('$script → $path is tracked', ({ path }) => {
        expect(TRACKED!.has(`apps/${app}/${path}`) || TRACKED!.has(path)).toBe(true);
      });
    });
  }
});
