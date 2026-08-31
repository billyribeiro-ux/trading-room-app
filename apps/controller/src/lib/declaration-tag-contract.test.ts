import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/**
 * `{@const}` IS LEGACY HERE TOO, AND THIS APP HAD FIVE LEFT AFTER ITS OWN MIGRATION.
 *
 * ## Why this file exists rather than a reference to the room's copy
 *
 * `apps/room/src/lib/declaration-tag-contract.test.ts` has guarded the room since 2026-08-30 and
 * twelve sites there were migrated in that commit. This app was migrated too — the rooms page
 * carries three `{const x = $derived(y)}` at lines 2160, 2180 and 2190 — and **five sites were
 * missed**, found on 2026-08-31 by sweeping both apps for the syntax the root standard forbids
 * rather than by anything failing.
 *
 * That is the whole argument for a second copy. A rule enforced in one app and merely believed in
 * the other is a rule that holds in one app. The two files are deliberately not shared: a `vitest`
 * project cannot import across app boundaries here, and a shared helper would have to live in a
 * package neither app owns.
 *
 * ## The measurement, reproduced rather than quoted
 *
 * Svelte's own `{@const ...}` page opens with *"`{@const x = y}` is legacy syntax — use
 * `{const x = $derived(y)}` instead"*, and declaration tags are available since Svelte 5.56;
 * `package.json` pins **5.56.10**.
 *
 * The migration is `$derived(...)` and not a plain `{const x = y}`, and that was settled by
 * compiling the same block three ways rather than by reading the sentence twice:
 *
 * ```
 * {@const d = n * 2}            ->  derived: true
 * {const d = n * 2}             ->  derived: FALSE
 * {const d = $derived(n * 2)}   ->  derived: true
 * ```
 *
 * A bare `{const}` is evaluated when its block is created and never again, so a value read from
 * state stops updating — a class of bug no type check, lint rule or `svelte-check` run can see, and
 * one that shows up only as a number that stops moving. The three cases below re-run that
 * measurement on every gate, because the compiler is the authority and it can change.
 *
 * ## What the five were
 *
 * `TapeSection.svelte` read `sparks[i]` and `sparkDelta(series)` inside an `{#each}` over the tape
 * symbols; the rooms page read `dontTouch(name)` inside a snippet and `settingHelp(def)` inside two
 * `{#each}` loops over the manage settings. All five are values derived from state, which is
 * precisely the case a bare `{const}` would have broken silently had the migration used it.
 */

const SOURCE = fileURLToPath(new URL('../', import.meta.url));

function svelteFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory()) found.push(...svelteFiles(`${path}/`));
    else if (entry.name.endsWith('.svelte')) found.push(path);
  }
  return found;
}

/** Comments stripped, so prose describing the legacy form never votes on whether it is present. */
function codeOnly(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const FILES = svelteFiles(SOURCE).filter((path) => !path.includes('.test.'));

describe('the compiler decides which form is reactive', () => {
  const block = (tag: string) => `<script>let { n = 0 } = $props();</script>{#if true}${tag}<p>{d}</p>{/if}`;
  const isReactive = (tag: string) =>
    /\$\.derived/.test(compile(block(tag), { name: 'T', generate: 'client' }).js.code);

  it('compiles the legacy tag to a derived', () => {
    expect(isReactive('{@const d = n * 2}')).toBe(true);
  });

  it('compiles a BARE declaration tag to no derived at all', () => {
    /*
      The finding, and the reason the migration is a piece of work rather than a `sed`.
      `{const d = n * 2}` looks like the drop-in replacement and is not one.
    */
    expect(isReactive('{const d = n * 2}')).toBe(false);
  });

  it('compiles the $derived form to a derived, which is why the migration uses it', () => {
    expect(isReactive('{const d = $derived(n * 2)}')).toBe(true);
  });
});

describe('the controller uses the current syntax', () => {
  it('reads a non-empty set of components — the vacuity floor', () => {
    /*
      Every assertion below is a search over this list. An empty one would report that no file uses
      the legacy form because no file was read, which is how this kind of guard dies quietly.
    */
    expect(FILES.length).toBeGreaterThan(40);
  });

  it('has no `{@const}` left anywhere', () => {
    const offenders = FILES.filter((path) => codeOnly(readFileSync(path, 'utf8')).includes('{@const ')).map((path) =>
      path.slice(SOURCE.length)
    );

    expect(
      offenders,
      `\`{@const}\` is legacy syntax — use \`{const x = $derived(y)}\`. Five sites here were missed ` +
        `by this app's own migration and were found by a sweep rather than by a failure, which is ` +
        `why this file now exists. A BARE \`{const x = y}\` is not equivalent: it compiles to no ` +
        `derived and goes stale. The block above measures all three forms.`
    ).toEqual([]);
  });

  it('always pairs a declaration tag with $derived, so nothing goes stale silently', () => {
    const bare: string[] = [];
    for (const path of FILES) {
      const source = codeOnly(readFileSync(path, 'utf8'));
      for (const match of source.matchAll(/\{const\s+[A-Za-z_$][\w$]*\s*=\s*/g)) {
        const after = source.slice(match.index + match[0].length, match.index + match[0].length + 8);
        if (!after.startsWith('$derived')) bare.push(`${path.slice(SOURCE.length)} — ${after}`);
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
