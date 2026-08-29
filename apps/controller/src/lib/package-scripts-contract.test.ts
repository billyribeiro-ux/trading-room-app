import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `test:gates` is the part of `test` that CI can actually run, and it stays that way.
 *
 * ## What was measured
 *
 * `quality.yml` ran the controller's `test:unit` alone, and its comment said the verifiers left out
 * "run in the pre-merge full gate". On 2026-08-29 that was checked against the workflows themselves:
 * **no workflow in this repository runs the controller's `test`.** The "pre-merge full gate" was a
 * person remembering to run it.
 *
 * Eleven verifiers were therefore enforced by nobody on a pull request — among them the room-settings
 * schema pin, the migration and release-artifact checks, the evidence layout, the privacy boundary,
 * and the font and room-login contracts. `quality.yml:34` states that the PR gate is the only
 * verification a production deploy ever gets, so "enforced by nobody on a pull request" means
 * "enforced by nobody".
 *
 * ## Why a prefix, and why that is asserted rather than trusted
 *
 * Exactly one entry of `test` cannot run on CI: `runtime:http` makes live HTTP requests to a deployed
 * preview and opens a PostgreSQL connection. A gate that depends on a running deployment reports
 * somebody else's outage as this revision's failure.
 *
 * So `test:gates` is the eleven entries BEFORE that one — a literal prefix. Written as a prefix
 * rather than as "test minus runtime:http" because a prefix is checkable by string comparison, and
 * because the ordering carries meaning: `schema:verify` runs first so a stale generated schema fails
 * before anything spends time on it.
 *
 * The failure this guards is specific and quiet. Add a twelfth local verifier to `test` and forget
 * `test:gates`, and CI silently stops covering it — the same shape as the defect above, and equally
 * invisible, because both scripts still pass. The assertion below makes that omission a red build on
 * the commit that causes it.
 *
 * ## What it deliberately does not assert
 *
 * That every entry of `test:gates` is hermetic. Nothing here can prove a script will not open a
 * socket; that was established by RUNNING all eleven in a container with no PostgreSQL and no
 * preview, and is recorded in `CHANGELOG.md` rather than asserted by a test that could not honestly
 * make the claim.
 */

const CONTROLLER = fileURLToPath(new URL('../../package.json', import.meta.url));
const WORKFLOW = fileURLToPath(new URL('../../../../.github/workflows/quality.yml', import.meta.url));

const scripts: Record<string, string> = JSON.parse(readFileSync(CONTROLLER, 'utf8')).scripts;
const steps = (script: string) => script.split('&&').map((step) => step.trim());

describe('the controller manifest declares both scripts', () => {
  it('has a test script', () => {
    expect(scripts.test, 'the controller lost its `test` script').toBeTruthy();
  });

  it('has a test:gates script', () => {
    expect(
      scripts['test:gates'],
      '`test:gates` is what CI runs for this app — see quality.yml'
    ).toBeTruthy();
  });

  it('found a plausible number of steps, so the comparison below is not vacuous', () => {
    // Eleven on 2026-08-29. A floor well under it fails a broken split without failing a removal.
    expect(steps(scripts['test:gates']).length).toBeGreaterThan(5);
  });
});

describe('test:gates is a prefix of test', () => {
  it('runs the same steps, in the same order, from the start', () => {
    const gates = steps(scripts['test:gates']);
    const full = steps(scripts.test).slice(0, gates.length);
    expect(
      full,
      'CI runs `test:gates`. A step added to `test` and not to `test:gates` is a verifier no pull request runs — which is exactly how eleven of them went unenforced until 2026-08-29.'
    ).toEqual(gates);
  });

  it('leaves out only the step that needs a deployment', () => {
    const remaining = steps(scripts.test).slice(steps(scripts['test:gates']).length);
    expect(
      remaining[0],
      'the first step `test:gates` omits should be `runtime:http`, the only entry that reaches a live preview. If something else is being skipped, say why here.'
    ).toBe('pnpm run runtime:http');
  });
});

describe('CI runs what this file is about', () => {
  const workflow = readFileSync(WORKFLOW, 'utf8');

  it('invokes test:gates for the controller', () => {
    /*
      Matched on the RUN line rather than anywhere in the file, so the paragraph above it explaining
      why `test:gates` exists — which necessarily names it — cannot satisfy this on its own. The
      comment-versus-code trap, which this repository has met five times.
    */
    const invoked = workflow
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .some((line) => /pnpm run test:gates\b/.test(line));
    expect(
      invoked,
      'quality.yml no longer runs `test:gates`, so these eleven verifiers are back to being enforced by somebody remembering'
    ).toBe(true);
  });

  it('still runs the unit tests too', () => {
    const invoked = workflow
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .some((line) => /pnpm run test:unit\b/.test(line));
    expect(invoked).toBe(true);
  });
});
