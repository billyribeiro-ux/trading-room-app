import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Asserts the RESOLVED ESLint config, not the source of `eslint.config.js`.
 *
 * ## The failure this exists for, in full, because the shape of it matters more than the fix
 *
 * `eslint.config.js` carries a long block explaining why `svelte/no-useless-mustaches` and
 * `svelte/prefer-svelte-reactivity` are deliberately `off` — the mustaches hold whitespace the
 * reference emits, and every plain `Map` and `Set` in this codebase is a documented non-reactive
 * collection. On 2026-08-15 commit `060ba72` moved `js/ts/svelte.configs.recommended` from ABOVE
 * that block to BELOW it. In flat config the last entry to match a file wins, so
 * `svelte.configs.recommended` turned both rules back on. The comment stayed exactly where it was,
 * still true about the intent, now false about the behaviour. `room quality` reported 43 errors for
 * precisely the patterns it says are deliberate.
 *
 * The same commit narrowed that block to two `files` patterns, which silently removed the Node and
 * browser globals from every path they did not match. `gate/` did not exist when they were written,
 * so the privacy and schema verifiers produced 31 `no-undef` errors the moment they moved there.
 *
 * ## Why nobody saw it before CI did
 *
 * A `pull_request` run checks out `refs/pull/N/merge` — the merge of the branch into `main` — while
 * a developer runs the config on their own branch. A config change that lands on `main` therefore
 * reaches CI before it reaches any branch that has not merged it. `pnpm run lint` passed locally and
 * failed on CI **at the same commit**, which reads as a broken runner rather than a stale branch,
 * and cost most of an afternoon to attribute correctly.
 *
 * ## So this asserts behaviour, not text
 *
 * A grep for `'off'` in the config source would have passed throughout — the string was always
 * there. Only `calculateConfigForFile`, which applies the same cascade ESLint applies, can tell the
 * difference between a rule that is off and a rule that says it is off three entries before
 * something turns it back on. That distinction is the whole point of DPE rule 4: a load-bearing
 * claim becomes an executable assertion, because a comment cannot enforce itself.
 */
const appRoot = fileURLToPath(new URL('../../', import.meta.url));

/** ESLint reports severity as 0/1/2 or "off"/"warn"/"error" depending on how a rule was written. */
function severityOf(entry: unknown): number {
  const value = Array.isArray(entry) ? entry[0] : entry;
  if (value === 'off') return 0;
  if (value === 'warn') return 1;
  if (value === 'error') return 2;
  return typeof value === 'number' ? value : -1;
}

let svelteFile: Awaited<ReturnType<ESLint['calculateConfigForFile']>>;
let gateFile: Awaited<ReturnType<ESLint['calculateConfigForFile']>>;

beforeAll(async () => {
  const eslint = new ESLint({ cwd: appRoot });
  svelteFile = await eslint.calculateConfigForFile(resolve(appRoot, 'src/routes/+page.svelte'));
  gateFile = await eslint.calculateConfigForFile(
    resolve(appRoot, 'gate/verify-privacy-boundary.mjs')
  );
});

describe('the resolved ESLint config, which is what actually runs', () => {
  it('leaves the two deliberately-disabled Svelte rules disabled after the full cascade', () => {
    expect(
      severityOf(svelteFile.rules?.['svelte/no-useless-mustaches']),
      'svelte/no-useless-mustaches resolved to ON. The config says it is off and explains why in ' +
        'detail. Something after that block — almost certainly svelte.configs.recommended having ' +
        'been moved below it — is turning it back on. Presets go FIRST, overrides LAST.'
    ).toBe(0);

    expect(
      severityOf(svelteFile.rules?.['svelte/prefer-svelte-reactivity']),
      'svelte/prefer-svelte-reactivity resolved to ON. Same cause and same fix as the rule above.'
    ).toBe(0);
  });

  it('gives first-party Node scripts outside src/ the globals they legitimately use', () => {
    // `gate/` is this repository's own privacy and schema verifiers. They are not browser
    // collectors and not application source, and they are exactly the kind of directory a
    // hand-maintained `files` pattern list forgets.
    const globals = gateFile.languageOptions?.globals ?? {};

    for (const name of ['process', 'console', 'URL', 'Buffer']) {
      expect(
        Object.keys(globals),
        `${name} is undefined for gate/*.mjs, so no-undef will fail there. The globals block must ` +
          'cover this path — it is unscoped for exactly this reason.'
      ).toContain(name);
    }
  });

  it('keeps no-undef ON for untyped scripts, because that is what makes the globals matter', () => {
    /*
      Not incidental. `no-undef` is off for type-checked files (TypeScript answers that question
      better), but the plain `.js` and `.mjs` scripts are not type checked, and this rule is what
      caught a genuinely corrupt probe in `room-config-seam-e2e.mjs` where backticks inside a comment
      terminated a template literal. If a future change "fixes" the globals problem by switching
      no-undef off everywhere instead, that detection is lost and this assertion goes red.
    */
    expect(severityOf(gateFile.rules?.['no-undef'])).toBe(2);
  });

  it('keeps no-undef OFF for type-checked files, per typescript-eslint guidance', () => {
    expect(severityOf(svelteFile.rules?.['no-undef'])).toBe(0);
  });
});
