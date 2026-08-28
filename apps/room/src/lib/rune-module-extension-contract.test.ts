import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  ── `.svelte.ts` MEANS "THIS MODULE USES RUNES", AND IT HAS TO KEEP MEANING THAT ───────────────────

  The official documentation defines the extension in one sentence:

    > These behave like any other `.js` or `.ts` module, except that you can use runes.
    >
    > — https://svelte.dev/docs/svelte/svelte-js-files

  and gives it two purposes: creating reusable reactive logic, and sharing reactive state across the
  app. That is the whole contract. A `.svelte.ts` file containing no rune is not wrong to the
  compiler — it compiles identically — which is exactly why it needs a test.

  ## What it costs when it drifts, which is not hypothetical

  This repository already argued the point, from the other direction. `lib/room/recording.ts` opens
  with:

    > **A plain `.ts`, not `.svelte.ts`, and that is deliberate.** This class holds no rune: the four
    > fields it owns are a `MediaRecorder`, its chunk list, a `Window` and a teardown function, and
    > nothing renders from any of them. […] Naming it `.svelte.ts` would tell the compiler to look
    > for runes and tell a reader the module is reactive.

  That reasoning was correct and it was applied to exactly one file. **Measured 2026-08-28: SEVEN of
  the modules in `lib/room/` carried `.svelte.ts` and contained no rune at all** — `chat-mute`,
  `gates`, `kicks`, `private-commands`, `screen-overlay`, `session-control` and `typing-signal`. Six
  predated that day; the seventh was written the same afternoon by an author who had read
  `recording.ts`'s paragraph and still got it wrong, which is the clearest possible evidence that
  prose in one file does not govern the next one.

  **`gates` is the one worth naming twice**, because it was missed by the hand search that found the
  other six and caught by this test on its first run. The hand search matched raw text; `gates`
  mentions `$derived` four times in its own header, once to say *"GETTERS, not `$derived` class
  fields, and this is the precedent rather than a preference"*. So the file argues against the rune
  in prose, uses none in code, and wore the extension that advertises them. Nothing but the
  comment-stripping below could have found that.

  The cost is a reader's model of the codebase. `.svelte.ts` is the marker for "state lives here and
  something re-renders when it changes". When a third of the modules wear it without meaning it, the
  marker stops carrying information, and the next person has to open every file to learn what the
  extension was supposed to tell them at a glance. That is the same class of decay as a comment that
  no longer matches the line under it.

  ## What this does NOT claim

  * It does not say a rune-free module is badly written. `recording.ts`, `arrivals.ts` and
    `scroll-follow.ts` are rune-free by design and correctly named.
  * It does not require the reverse spelling anywhere: a `.ts` module is free to stay `.ts`.
  * `SvelteMap` / `SvelteSet` / `SvelteDate` from `svelte/reactivity` are reactive and are ordinary
    classes — a module using them needs no rune and therefore no `.svelte` in its name. That is why
    the detector looks for RUNES and not for the word "reactive".

  ## The direction it is enforced in

  One way only: a `.svelte.ts` file must contain a rune. The converse — a `.ts` file must not — is
  unenforceable, because a `.ts` file using a rune does not compile, so the toolchain already says
  so, loudly and immediately. This test exists for the failure that is SILENT.
*/

const SOURCE = new URL('../', import.meta.url);

/**
 * The rune names, as the compiler recognises them.
 *
 * `$state`, `$derived` and `$inspect` also have suffixed forms (`$state.raw`, `$derived.by`,
 * `$inspect.trace`) which this matches by prefix. `$$props` / `$$restProps` are deliberately absent:
 * they are the Svelte 4 spellings this repository forbids, and matching them would let a file keep
 * the extension on the strength of an idiom that must not be reintroduced.
 */
const RUNES = [
  '$state',
  '$derived',
  '$effect',
  '$props',
  '$bindable',
  '$inspect',
  '$host'
] as const;

/**
 * Whether a rune is USED, as opposed to mentioned.
 *
 * Comments are stripped first, and that is not a nicety — it is the whole difference between a test
 * that works and one that does not. Every module in `lib/room/` explains itself at length, and the
 * six offenders found on 2026-08-28 mention `$state` in prose between them more often than the
 * compliant files use it in code. Matching raw text would have passed all six.
 *
 * A `.svelte.ts` file has no `<!-- -->` comments, so only the two JavaScript forms are stripped. The
 * line-comment rule skips `//` preceded by `:` or a quote, so a URL in a string survives.
 */
const usesARune = (source: string): boolean => {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutComments = withoutBlocks.replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  return RUNES.some((rune) => withoutComments.includes(rune));
};

/**
 * Every `.svelte.ts` module under `src/`, found rather than listed.
 *
 * Recursive and discovery-driven for the reason the size contract records for its own catalogs: a
 * hand-kept list means the next module is written, nobody adds the row, and the gate that was the
 * whole point quietly does not cover it.
 */
const runeModules = (dir: string): string[] => {
  const found: string[] = [];
  for (const item of readdirSync(new URL(dir, SOURCE), { withFileTypes: true })) {
    if (item.isDirectory()) {
      found.push(...runeModules(`${dir}${item.name}/`));
      continue;
    }
    if (item.name.endsWith('.svelte.ts') && !item.name.endsWith('.test.svelte.ts')) {
      found.push(`${dir}${item.name}`);
    }
  }
  return found;
};

const modules = runeModules('lib/');

describe('every .svelte.ts module actually uses runes', () => {
  it('found the modules it is meant to police', () => {
    /*
      A floor, so the discovery cannot silently return nothing — a glob that stops matching would
      otherwise make this whole file pass by covering zero subjects, which is the way a source-reading
      test dies quietly. 20 is comfortably below the count on the day this was written and above any
      plausible collapse.
    */
    expect(modules.length).toBeGreaterThan(20);
  });

  it('reaches into subdirectories, not just the top level', () => {
    // `lib/room/` is where nearly all of them live; a non-recursive read would find none of these
    // and would still pass the floor above on the strength of `lib/*.svelte.ts` alone.
    expect(modules.some((file) => file.split('/').length > 2)).toBe(true);
  });

  it('has no module wearing the extension without a rune in it', () => {
    const bare = modules.filter((file) => !usesARune(readFileSync(new URL(file, SOURCE), 'utf8')));
    expect(
      bare,
      `${bare.join(', ')} — the extension means "you can use runes" (svelte.dev/docs/svelte/svelte-js-files) and these use none. Rename each to a plain .ts and update its import specifiers, or add the state that earns the name. See lib/room/recording.ts for the same argument written out.`
    ).toEqual([]);
  });
});

describe('the detector cannot pass vacuously', () => {
  it('sees a rune in code', () => {
    expect(usesARune('let count = $state(0);')).toBe(true);
    expect(usesARune('#items = $state.raw([]);')).toBe(true);
    expect(usesARune('const total = $derived(a + b);')).toBe(true);
  });

  it('does NOT see a rune that is only mentioned in prose', () => {
    /*
      THE ASSERTION THAT MAKES THIS FILE WORTH HAVING, and it is not a hypothetical: `gates.ts` was
      missed by a hand search over raw text and caught here on the first run, because it mentions
      `$derived` four times in prose — including once to explain why it deliberately uses none.
    */
    expect(
      usesARune('/* This module holds no $state and needs none. */\nexport const x = 1;')
    ).toBe(false);
    expect(usesARune('// $derived would be wrong here.\nexport const x = 1;')).toBe(false);
    expect(
      usesARune('/**\n * @see $props\n */\nexport function f() {\n  return 1;\n}'),
      'a jsdoc tag is prose too'
    ).toBe(false);
  });

  it('does not mistake a URL inside a string for a line comment', () => {
    // The `//` in `https://` must not swallow the rest of the line and hide a rune after it.
    expect(usesARune("const doc = 'https://svelte.dev/docs';\nlet n = $state(0);")).toBe(true);
  });

  it('treats svelte/reactivity as what it is — not a rune', () => {
    /*
      `SvelteMap` is reactive and is an ordinary class, so a module using it needs no rune and must
      not be forced to wear the extension. Written down because "reactive" and "uses runes" are the
      same thing in casual speech and are not the same thing here.
    */
    expect(
      usesARune("import { SvelteMap } from 'svelte/reactivity';\nconst m = new SvelteMap();")
    ).toBe(false);
  });
});
