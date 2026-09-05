import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The default branch must never have its own verification cancelled.
 *
 * ## What happened, with the numbers
 *
 * All three workflows carried an unconditional `cancel-in-progress: true`. On a branch that is
 * correct — a new push makes the previous run irrelevant, and a slow job restarting from zero on
 * every push means nothing is ever learned. On `main` it inverts: a run there is not a preview of a
 * merge, it is the only verification a production deploy ever gets, and cancelling it means the
 * commit that is now serving traffic was checked by nothing.
 *
 * That is not hypothetical. `060ba72` was pushed straight to `main`, broke the lint gate for every
 * run after it, and its own run was cancelled when a PR merge landed two minutes later. Eight
 * subsequent runs failed for a reason nobody could attribute to it. Measured across the last 40 runs
 * on `main`: 11 `cancelled`, 27% — including EVERY `Backend quality` run in the 2026-08-15 sequence
 * (4a79203, c1ff436, 5f03e5f, 731d232, b267143, a84f20f, 41d8de6, ffa410d, 030a209, ed3b26f). The
 * Rust and PostgreSQL security contracts on a multi-tenant fintech application had, in practice,
 * never verified a commit on the default branch.
 *
 * ## Why this is a test and not a line in a review checklist
 *
 * The repaired value is one expression in three YAML files, and its correctness is invisible by
 * inspection — `cancel-in-progress: true` reads as a sensible optimisation, which is why it was
 * written three times. Nothing about the failure it causes appears in the diff that introduces it;
 * it appears weeks later as a run that is simply absent. So the rule is asserted mechanically, and
 * the assertion sweeps the directory rather than naming three files, so a fourth workflow is covered
 * the day it is added.
 *
 * Deliberately NOT asserted: that the value is exactly the expression currently used. Any expression
 * that evaluates to false on the default branch is correct; pinning the string would make routine
 * rewording fail a test whose point is the behaviour.
 */

const ROOT = `${process.cwd()}/../..`;
const WORKFLOW_DIR = `${ROOT}/.github/workflows`;

const workflows = readdirSync(WORKFLOW_DIR)
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .map((name) => ({ name, text: readFileSync(`${WORKFLOW_DIR}/${name}`, 'utf8') }));

/** Comment lines stripped, because prose describing a setting is not the setting. */
function code(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

/** The `cancel-in-progress:` values a workflow actually declares, comments excluded. */
function cancelValues(text: string): string[] {
  return [...code(text).matchAll(/^\s*cancel-in-progress:\s*(.+?)\s*$/gm)].map((m) => m[1]);
}

describe('CI cannot cancel the default branch out of its own verification', () => {
  it('finds the workflows at all, so an empty sweep cannot pass silently', () => {
    // Without this a renamed directory turns every assertion below into a vacuous truth — the same
    // guard ci-package-manager-pin.test.ts needs, for the same reason.
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows.map((w) => w.name)).toEqual(
      expect.arrayContaining(['quality.yml', 'backend-quality.yml', 'smoke.yml'])
    );
  });

  it.each(workflows)('$name never cancels unconditionally', ({ name, text }) => {
    const values = cancelValues(text);

    for (const value of values) {
      expect(
        value,
        `${name} sets cancel-in-progress: ${value}. On a branch that is right, but this also ` +
          'applies to pushes on the default branch, where the run is the ONLY verification a ' +
          'production deploy gets. Cancelling it is how 060ba72 reached main unchecked. Use an ' +
          "expression that is false for refs/heads/main, e.g. ${{ github.ref != 'refs/heads/main' }}."
      ).not.toBe('true');
    }
  });

  it.each(workflows)('$name excludes the default branch by name where it cancels', ({ text }) => {
    // An expression is only doing the job if it actually mentions the branch it must protect.
    for (const value of cancelValues(text)) {
      expect(value).toContain('refs/heads/main');
    }
  });

  it.each(workflows)('$name gives each default-branch commit its own group', ({ name, text }) => {
    /*
      `cancel-in-progress: false` alone was measured and found insufficient, which is why this
      assertion exists separately from the one above.

      It protects the run that is already EXECUTING — verified: 34e6c09 started at 16:36:20Z and
      survived four subsequent pushes, where every earlier backend run had been killed within
      minutes. But GitHub keeps only ONE pending run per concurrency group, so a newer arrival still
      cancels the QUEUED one. On 2026-08-15 the run for 4c2dd74 was created at 16:41:33Z, never
      started a single job, and was cancelled at 16:50:38Z when bf6920b arrived — which was itself
      superseded at 16:51:46Z. Both reached `main` unverified, AFTER the cancel-in-progress fix had
      landed, and 4c2dd74 is the commit that CONTAINS that fix.

      A per-commit group removes the queue: nothing shares a group, so nothing is superseded.
      Asserted on `github.sha` rather than the exact expression, so rewording stays free.
    */
    const groups = [...code(text).matchAll(/^\s*group:\s*(.+?)\s*$/gm)].map((m) => m[1]);

    for (const group of groups) {
      expect(
        group,
        `${name} shares one concurrency group across all default-branch commits, so a queued run ` +
          'is cancelled whenever a newer push arrives and that commit is never verified. Include ' +
          'github.sha in the group for refs/heads/main.'
      ).toContain('github.sha');
    }
  });

  it('every workflow that runs on the default branch declares a concurrency policy at all', () => {
    /*
      A workflow with no `concurrency` block never cancels, which is safe for this rule — but it is
      worth knowing which ones have made the choice explicitly rather than by omission, because the
      next person adding a group will copy a neighbour. If a workflow triggers on a push to main and
      has a group, it must have been through the assertions above.
    */
    for (const { name, text } of workflows) {
      const body = code(text);
      if (!/^concurrency:/m.test(body)) continue;
      expect(cancelValues(text).length, `${name} declares a concurrency group`).toBeGreaterThan(0);
    }
  });
});

describe('backend workflow scoping cannot omit a canonical-authority converter', () => {
  it('runs the backend gate for every current converter and its end-to-end verifier', () => {
    const workflow = workflows.find(({ name }) => name === 'backend-quality.yml');
    expect(workflow, 'backend-quality.yml must remain in the workflow sweep').toBeDefined();

    const scopePattern = workflow?.text.match(/grep -qE '([^']+)'/)?.[1];
    expect(scopePattern, 'backend-quality.yml must expose its changed-path scope as an ERE').toBeDefined();

    const scoped = new RegExp(scopePattern ?? '(?!)');
    for (const authority of ['profile', 'room', 'room-settings', 'membership']) {
      expect(
        scoped.test(`apps/controller/scripts/cutover-${authority}-authority.mjs`),
        `${authority} converter changes must execute the backend security gate`
      ).toBe(true);
      expect(
        scoped.test(`apps/controller/scripts/verify-${authority}-cutover-e2e.mjs`),
        `${authority} converter rehearsals must execute the backend security gate`
      ).toBe(true);
    }
  });
});
