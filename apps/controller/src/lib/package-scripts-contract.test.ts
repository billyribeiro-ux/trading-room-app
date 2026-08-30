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
const ROOM = fileURLToPath(new URL('../../../room/package.json', import.meta.url));
const WORKFLOW = fileURLToPath(new URL('../../../../.github/workflows/quality.yml', import.meta.url));

const scripts: Record<string, string> = JSON.parse(readFileSync(CONTROLLER, 'utf8')).scripts;
const roomScripts: Record<string, string> = JSON.parse(readFileSync(ROOM, 'utf8')).scripts;
const steps = (script: string) => script.split('&&').map((step) => step.trim());
const workflow = readFileSync(WORKFLOW, 'utf8');

describe('the controller manifest declares both scripts', () => {
  it('has a test script', () => {
    expect(scripts.test, 'the controller lost its `test` script').toBeTruthy();
  });

  it('has a test:gates script', () => {
    expect(scripts['test:gates'], '`test:gates` is what CI runs for this app — see quality.yml').toBeTruthy();
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

/**
 * `gate` IS CI'S DEFINITION OF GREEN, DERIVED FROM CI — added 2026-08-29.
 *
 * ## The failure, and it is the mirror of the one above
 *
 * `CLAUDE.md` says *"the full gate runs once, immediately before a push"*, and there was no such
 * thing to run. Each app declared `format:check`, `lint`, `check`, `test` and `build` separately, CI
 * ran all five in order, and locally "the full gate" meant remembering five commands in the right
 * order.
 *
 * On 2026-08-29 a push failed CI on `prettier --check .` over two markdown files under
 * `apps/room/docs/`. Commits had gone out that day with the room's suite, `svelte-check`, eslint and
 * a `prettier --check "src/**"` all green — a NARROWER glob than the one CI runs, chosen by hand
 * each time. One of the two files had been unformatted since an earlier session and nothing local
 * had ever looked at it.
 *
 * The comment beside CI's own formatting step names this exactly: *"That is what an ungated script
 * becomes — a convention a person has to remember."* It was written about scripts CI did not run.
 * This is the same sentence from the other side: a script CI DOES run, that nothing local did.
 *
 * ## Why the expectation is PARSED and not written down
 *
 * The first version of this block listed each gate's steps as a literal and compared. That is a
 * COPY of CI, and a copy drifts in the one direction that matters: adding a step to `quality.yml`
 * and to the literal, and forgetting the `package.json`, would have passed. Deriving the list from
 * the workflow means the workflow is the only place CI's definition of green is written, which is
 * what "one command runs exactly what CI runs" has to mean to be worth anything.
 *
 * Only the `frontend` job is read, and that is a boundary rather than an omission: it is the job
 * whose steps a person can reproduce locally. The two end-to-end jobs stand up services and drive
 * chromium, and a gate that launched a browser on every push would stop being run — those are
 * invoked deliberately, and each CHANGELOG entry that touched a component records the result.
 *
 * Deliberately NOT asserted: that anybody actually ran `gate`. Nothing here can know that. What it
 * can guarantee is that running it means what CI means.
 */
describe('one command per app runs exactly what CI runs', () => {
  /*
    The `frontend` job, sliced at the two-space indentation that separates jobs. Sliced rather than
    YAML-parsed because a parser would resolve nothing useful here — the step this all turns on is a
    shell `if` on `matrix.app` INSIDE a `run:` block, which is a string to any YAML reader.
  */
  const frontend = (() => {
    /*
      A MISSING JOB RESOLVES TO THE EMPTY STRING, and that is the whole point of not asserting here.
      The first draft called `expect` in this initialiser, and its own negative control caught it:
      renaming the job threw during COLLECTION, so vitest reported "no tests" for the file rather
      than a named failure — the one shape that reads as absence rather than breakage in a CI log.
      Every guard now lives in the floor test below, where a failure has a sentence attached.
    */
    const from = workflow.indexOf('\n  frontend:');
    if (from === -1) return '';
    const rest = workflow.slice(from + 1);
    const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:\n/);
    return next === -1 ? rest : rest.slice(0, next + 1);
  })();

  /**
   * Every `pnpm run <name>` the frontend job invokes for one app, in the order CI invokes it.
   *
   * The job is a matrix over both apps, so a step belongs to both unless it sits inside the
   * `if [ "$matrix.app" = "controller" ]` block that splits the unit-test step — the controller runs
   * `test:gates && test:unit` there because its `test` chains one verifier that needs a live
   * deployment, and the room runs `test` whole. That branch is the only per-app difference in CI,
   * and reading it here is what lets both gates be checked against one source.
   */
  const ciSteps = (app: 'room' | 'controller') => {
    let branch: 'none' | 'controller' | 'room' = 'none';
    const invoked: string[] = [];
    for (const line of frontend.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) continue;
      if (/^if \[ "\$\{\{ matrix\.app \}\}" = "controller" \]; then$/.test(trimmed)) branch = 'controller';
      else if (branch === 'controller' && trimmed === 'else') branch = 'room';
      else if (branch !== 'none' && trimmed === 'fi') branch = 'none';
      else if (branch === 'none' || branch === app) {
        for (const match of line.matchAll(/pnpm run ([\w:]+)/g)) invoked.push(match[1]);
      }
    }
    return invoked;
  };

  it('read a frontend job with enough in it for the comparison to mean something', () => {
    /* The vacuity floor: a moved or renamed job would otherwise pass by matching nothing at all. */
    expect(frontend, 'quality.yml no longer has a `frontend` job under that name').not.toBe('');
    expect(frontend.length).toBeGreaterThan(1000);
    expect(frontend).not.toContain('\n  controller-e2e:');
    expect(ciSteps('room'), 'the formatting step is the one that caused this').toContain('format:check');
    expect(ciSteps('room').length).toBeGreaterThan(4);
    expect(ciSteps('controller')).not.toEqual(ciSteps('room'));
  });

  it.each([
    ['room', () => roomScripts],
    ['controller', () => scripts]
  ])('%s declares a gate script', (_app, get) => {
    expect(
      get().gate,
      'without it, `CLAUDE.md`’s "the full gate runs once before a push" is five commands somebody has to remember in order'
    ).toBeTruthy();
  });

  it.each([
    ['room', () => roomScripts],
    ['controller', () => scripts]
  ])('%s gate runs CI’s steps, in CI’s order', (app, get) => {
    /*
      Equality, not containment, and in CI's order. A gate that runs MORE than CI is a local failure
      nobody can reproduce from a pull request; one that runs less is the drift that started this.
      Order matters for one honest reason CI states itself: formatting first because it is the
      cheapest answer in the log, build last because it is the slowest.
    */
    expect(steps(get().gate)).toEqual(ciSteps(app as 'room' | 'controller').map((name) => `pnpm run ${name}`));
  });
});

describe('CI runs what this file is about', () => {
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
