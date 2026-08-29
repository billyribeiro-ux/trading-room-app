import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { makeProbe } from './derived-return-probe.svelte';

/*
  ── WHAT `state_referenced_locally` COSTS, MEASURED ON THE COMPILER ───────────────────────────────

  `create-room.svelte.ts` ended with `return { … rosterViewer } as const`, where `rosterViewer` is a
  `$derived` over `isPresenter` and `media.limitedPresenter` — both of which change mid-session,
  because `giveMicScreen` elevates a member to presenter. The Svelte compiler flags that line, and
  `svelte-check` does not: 0 warnings there, 3 from `svelte.compileModule` on the same file.

  That disagreement is why this probe exists. It answers what the flag MEANS at runtime rather than
  arguing it from the documentation, on the same compiler the room ships.

  NO `$effect.root` here, and that is deliberate rather than a shortcut. `prefs.svelte.test.ts` needs
  one because it asserts that an `$effect` RE-RUNS; this asserts what a plain READ returns, and a
  read needs no reactive context. A first draft wrapped these in a root anyway and every array came
  back EMPTY — the root's body recorded nothing and threw nothing, which is the same silent shape
  `vite.config.ts` warns about for SSR-compiled effects. Measured directly instead.
*/
describe('a $derived returned out of a function', () => {
  it('is FROZEN when returned by value — which is the defect', () => {
    const seen: number[] = [];
    const probe = makeProbe();
    seen.push(probe.snapshot);
    probe.bump();
    flushSync();
    seen.push(probe.snapshot);

    expect(seen, 'a by-value return captures the initial value and never moves again').toEqual([
      0, 0
    ]);
  });

  it('stays live through a getter', () => {
    const seen: number[] = [];
    const probe = makeProbe();
    seen.push(probe.live);
    probe.bump();
    flushSync();
    seen.push(probe.live);

    expect(seen).toEqual([0, 2]);
  });

  it('stays live through a thunk — the shape createRoom already uses for gates', () => {
    const seen: number[] = [];
    const probe = makeProbe();
    seen.push(probe.thunk());
    probe.bump();
    flushSync();
    seen.push(probe.thunk());

    expect(seen).toEqual([0, 2]);
  });

  it('is STILL frozen when a getter is DESTRUCTURED, which is the half that is easy to miss', () => {
    /*
      The consumer's side. `+page.svelte` writes `const { …, rosterViewer } = createRoom(…)`, and a
      destructure READS the property once — so changing the return to a getter alone would have
      looked like a fix and changed nothing. Both ends had to move.
    */
    const seen: number[] = [];
    const probe = makeProbe();
    const { live } = probe;
    seen.push(live);
    probe.bump();
    flushSync();
    seen.push(live);

    expect(seen, 'destructuring a getter freezes it as surely as a plain value').toEqual([0, 0]);
  });
});
