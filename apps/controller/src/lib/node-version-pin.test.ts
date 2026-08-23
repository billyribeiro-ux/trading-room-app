import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The Node version, which is pinned in TWO tracked files read by TWO different tools.
 *
 * ## What was found, 2026-08-23
 *
 * `.node-version` and `.nvmrc` both exist, are both tracked, and both say `24.19.0`. Nothing made
 * them agree — they agreed by luck, and by nobody having edited one of them yet.
 *
 * **24.19.0 is the intended version**, confirmed by the owner on 2026-08-23 as the current LTS. That
 * is recorded because this file enforces AGREEMENT, not a particular number: without the owner's
 * statement, a future reader would have no way to tell which of two disagreeing pins was the right
 * one to move toward.
 *
 * The consumers are genuinely different, which is why deleting one is not obviously correct:
 *
 *   `.node-version`  read by CI. `actions/setup-node` is given `node-version-file: .node-version`
 *                    in BOTH `quality.yml` and `backend-quality.yml`.
 *   `.nvmrc`         read by the developer's machine. `mise ls node` reports the active version's
 *                    source as `<repo>/.nvmrc` — not `.node-version` — so the local toolchain and
 *                    the runner are reading different files today.
 *
 * ## Why this is the failure mode this repository already knows
 *
 * Its own standard says it about `TODO.md` and `CHANGELOG.md`: *"Two places recording the same thing
 * is how one of them goes stale."* `ci-package-manager-pin.test.ts` next door exists because exactly
 * that happened to the pnpm version — `package.json` moved, a workflow did not, and three days
 * passed before a push noticed.
 *
 * The Node case is worse than the pnpm one was, because it fails SILENTLY rather than loudly. A
 * mismatched pnpm exits 1 on the runner. A mismatched Node does not: the suite runs on one runtime
 * locally and a different one in CI, both green, until something depends on the difference — and
 * this session has already met a defect that was specific to a Node version, an `undici` parser
 * crash that only Node 24.19.0's bundled copy produces. Chasing that with the two files disagreeing
 * would mean debugging a runtime nobody was actually running.
 *
 * ## Neither file is deleted, and that is a decision rather than an omission
 *
 * Deleting `.nvmrc` would break `mise` and `nvm` for anyone who has not switched; deleting
 * `.node-version` would break both workflows. Both have a real consumer, so both stay and this test
 * is what keeps them honest. If one is ever retired, this file fails and says so — which is the
 * conversation that should happen before a pin quietly stops being read.
 */

const ROOT = `${process.cwd()}/../..`;
const WORKFLOW_DIR = `${ROOT}/.github/workflows`;

/** A version file's contents, trimmed. `nvm` tolerates a `v` prefix and a trailing newline. */
const pin = (file: string): string => readFileSync(`${ROOT}/${file}`, 'utf8').trim().replace(/^v/, '');

const workflows = readdirSync(WORKFLOW_DIR)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, text: readFileSync(`${WORKFLOW_DIR}/${name}`, 'utf8') }));

describe('the Node pin cannot drift between the runner and the developer', () => {
  it('found the files it is meant to compare', () => {
    // At absent, every assertion below is vacuous — the same guard the sibling catalogs carry.
    expect(existsSync(`${ROOT}/.node-version`), '.node-version is what CI reads').toBe(true);
    expect(existsSync(`${ROOT}/.nvmrc`), '.nvmrc is what mise resolves locally').toBe(true);
  });

  it('.node-version and .nvmrc name the SAME version', () => {
    /*
      The whole point. They both said 24.19.0 when this was written, and that was luck rather than
      enforcement — no tool reads both, so nothing would have noticed one moving.
    */
    expect(pin('.nvmrc'), '.nvmrc must match .node-version, or CI and your machine differ').toBe(pin('.node-version'));
  });

  it('the version is a full three-part release, not a floating major', () => {
    /*
      `24` or `24.x` would resolve to whatever is newest on the day each side installs, which
      re-introduces the drift this file exists to stop — and does it invisibly, because both files
      would still read identical.
    */
    expect(pin('.node-version')).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('every workflow that sets up Node reads the file CI is supposed to read', () => {
    /*
      A workflow naming `.nvmrc`, or hard-coding a literal, would put the runner on a version this
      test is not comparing — which is the same shape as the pnpm defect next door, where the
      workflow carried its own number and went stale against `package.json`.
    */
    const setups = workflows.filter((w) => w.text.includes('actions/setup-node'));
    expect(setups.length, 'no workflow sets up Node — this assertion would be vacuous').toBeGreaterThan(0);

    for (const workflow of setups) {
      expect(
        workflow.text,
        `${workflow.name} sets up Node without naming .node-version, so its runtime is unpinned or pinned somewhere this test cannot see`
      ).toContain('node-version-file: .node-version');
      /*
        COMMENTS STRIPPED FIRST, and that is not tidiness — the first draft of this assertion went
        red against a workflow it had just fixed, because the comment recording the fix QUOTED the
        literal it was removing. Prose is not configuration, and a scan that cannot tell them apart
        reports on itself. This repository has the same lesson written down three times over, from
        props invented out of comment text in `RoomNavbar`.
      */
      const yamlOnly = workflow.text
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
      expect(
        /node-version:\s*['"]?\d/.test(yamlOnly),
        `${workflow.name} hard-codes a Node version literal; the pin belongs in .node-version`
      ).toBe(false);
    }
  });
});
