import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `{@const}` IS LEGACY, AND ITS REPLACEMENT IS NOT THE OBVIOUS ONE.
 *
 * ## The rule, from the official documentation
 *
 * Svelte's own `{@const ...}` page now opens with:
 *
 * > `{@const x = y}` is legacy syntax — use `{const x = $derived(y)}` instead
 *
 * and the declaration-tags page dates the replacement: *"Declaration tags are available since Svelte
 * 5.56."* This app pins a version at or above that, so the new form is available and the old one is
 * legacy here today rather than at some future upgrade.
 *
 * **The pin is READ rather than quoted, and the case below is why.** This sentence named the patch
 * version `5.56.10` as the pin until 2026-08-31, by when the pin was `5.57.0` — a number in
 * prose beside the thing it counts, which is the copy nobody updates. The controller's twin carried
 * the identical stale literal. Neither was load-bearing, and that is exactly what makes the shape
 * worth removing: a claim nothing checks drifts silently until somebody reasons from it.
 *
 * ## Why the migration is `$derived(...)` and not a plain `{const x = y}`
 *
 * This is the whole reason the migration is a piece of work rather than a `sed`, and it was settled
 * by MEASUREMENT rather than by reading the sentence twice. Compiling the same block three ways and
 * looking for a `$.derived` call in the output:
 *
 * ```
 * {@const d = n * 2}            ->  derived: true
 * {const d = n * 2}             ->  derived: FALSE
 * {const d = $derived(n * 2)}   ->  derived: true
 * ```
 *
 * A plain `{const}` is evaluated when its block is created and never again. Twelve sites migrated to
 * that form would each have gone stale the moment the state they read changed — a class of bug no
 * type check, lint rule or `svelte-check` run can see, and one that only shows up as a number that
 * stops moving. The measurement is reproduced below as a test rather than quoted, because the
 * compiler is the authority and it can change.
 *
 * ## What this file guards
 *
 * That the twelve are gone and stay gone, and that anybody reaching for a declaration tag reaches for
 * the reactive form. It does NOT forbid a deliberate non-reactive `{const}` — there is no such site
 * today, and if one is ever right it belongs here as a named exception with its reason, which is the
 * conversation this test exists to force.
 */

const COMPONENTS = fileURLToPath(new URL('./components/', import.meta.url));

function svelteFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) found.push(...svelteFiles(`${path}/`));
    else if (entry.name.endsWith('.svelte')) found.push(path);
  }
  return found;
}

const FILES = svelteFiles(COMPONENTS);

const SVELTE_PIN: string = (
  JSON.parse(readFileSync('package.json', 'utf8')) as { devDependencies: Record<string, string> }
).devDependencies.svelte;

describe('the syntax this file migrates to is actually available here', () => {
  it('pins Svelte at or above 5.56, where declaration tags arrived', () => {
    /*
      Read from `package.json`, never written down. The docs date the feature — *"Declaration tags are
      available since Svelte 5.56"* — so what matters is the FLOOR, not today's patch number, and a
      floor survives every upgrade that a quoted version does not.
    */
    const [major, minor] = SVELTE_PIN.replace(/^[^\d]*/, '')
      .split('.')
      .map(Number);
    expect(major, `svelte is pinned at ${SVELTE_PIN}`).toBeGreaterThanOrEqual(5);
    if (major === 5) expect(minor).toBeGreaterThanOrEqual(56);
  });
});

describe('the compiler decides which form is reactive', () => {
  const block = (tag: string) =>
    `<script>let { n = 0 } = $props();</script>{#if true}${tag}<p>{d}</p>{/if}`;
  const isReactive = (tag: string) =>
    /\$\.derived/.test(compile(block(tag), { name: 'T', generate: 'client' }).js.code);

  it('compiles the legacy tag to a derived', () => {
    expect(isReactive('{@const d = n * 2}')).toBe(true);
  });

  it('compiles a BARE declaration tag to no derived at all', () => {
    /*
      The finding. `{const d = n * 2}` looks like the drop-in replacement and is not one: it is
      evaluated once per block instance, so a value read from state stops updating.
    */
    expect(isReactive('{const d = n * 2}')).toBe(false);
  });

  it('compiles the $derived form to a derived, which is why the migration uses it', () => {
    expect(isReactive('{const d = $derived(n * 2)}')).toBe(true);
  });
});

describe('the room uses the current syntax', () => {
  it('reads a non-empty set of components — the vacuity floor', () => {
    expect(FILES.length).toBeGreaterThan(40);
  });

  it('has no `{@const}` left anywhere', () => {
    /*
      Comments stripped: four `.svelte` files in this room quote compiled reference code containing
      `{const e=Y();`, and `MobileRestorePane.svelte:9` is one of them. Prose must never vote.
    */
    const offenders = FILES.filter((path) =>
      codeOf(path, readFileSync(path, 'utf8')).includes('{@const ')
    ).map((path) => path.slice(COMPONENTS.length));

    expect(
      offenders,
      `\`{@const}\` is legacy syntax — use \`{const x = $derived(y)}\`, which is what these files ` +
        `were migrated to on 2026-08-30. A BARE \`{const x = y}\` is not equivalent: it compiles to ` +
        `no derived and goes stale. See the block above, which measures all three.`
    ).toEqual([]);
  });

  it('always pairs a declaration tag with $derived, so nothing goes stale silently', () => {
    const bare: string[] = [];
    for (const path of FILES) {
      const source = codeOf(path, readFileSync(path, 'utf8'));
      for (const match of source.matchAll(/\{const\s+[A-Za-z_$][\w$]*\s*=\s*/g)) {
        const after = source.slice(
          match.index + match[0].length,
          match.index + match[0].length + 8
        );
        if (!after.startsWith('$derived')) bare.push(`${path.slice(COMPONENTS.length)} — ${after}`);
      }
    }
    expect(
      bare,
      `a bare \`{const}\` is evaluated once when its block is created and never again. If one of ` +
        `these is deliberately non-reactive, name it here with the reason rather than deleting this ` +
        `assertion.`
    ).toEqual([]);
  });
});
