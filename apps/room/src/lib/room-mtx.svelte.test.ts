// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { MtxStreamTabs } from './room-mtx.svelte';
import type { MtxStream } from './mtx-streams';

/*
  The test that should have shipped WITH the extraction, and did not.

  `MtxStreamTabs` was pulled out of `+page.svelte` as a class holding `$state.raw` behind getters,
  and it went in with `svelte-check` clean, `svelte-autofixer` clean, eslint clean and the whole
  suite green — none of which can see the thing that actually matters. Those gates prove the types
  and the syntax. **Not one of them proves that reading `mtx.streams` in the template still re-runs
  when a stream arrives.** Wire the rune up wrongly and every gate stays green while the stream tab
  bar silently stops updating, which is the exact failure mode this repository calls out: compiling
  is not evidence.

  So the last describe block below is the point of the file. The value assertions are worth having,
  but a plain object would pass all of them.
*/

const stream = (id: string, name = `stream-${id}`): MtxStream => ({
  _id: id,
  sessionID: 'sess-1',
  producerID: `prod-${id}`,
  mediaValue: { name }
});

describe('the list starts empty', () => {
  it('has no streams and no selection', () => {
    const mtx = new MtxStreamTabs();
    expect(mtx.streams).toEqual([]);
    expect(mtx.selectedTabID).toBeNull();
  });
});

describe('transitions', () => {
  it('adds a stream on start and the getter reflects it', () => {
    const mtx = new MtxStreamTabs();
    mtx.started(stream('a'));
    expect(mtx.streams.map((s) => s._id)).toEqual(['a']);
  });

  it('removes it again on stop', () => {
    const mtx = new MtxStreamTabs();
    mtx.started(stream('a'));
    mtx.started(stream('b'));
    mtx.stopped(stream('a'));
    expect(mtx.streams.map((s) => s._id)).toEqual(['b']);
  });

  it('moves the selection when the user picks a tab', () => {
    const mtx = new MtxStreamTabs();
    mtx.started(stream('a'));
    mtx.started(stream('b'));
    mtx.selectByUser('b');
    expect(mtx.selectedTabID).toBe('b');
  });
});

describe('a session refresh REPLACES the list', () => {
  it('does not merge with what was already there', () => {
    const mtx = new MtxStreamTabs();
    mtx.started(stream('a'));
    mtx.replaceFromSession([stream('c'), stream('d')]);
    expect(mtx.streams.map((s) => s._id)).toEqual(['c', 'd']);
  });

  it('CLEARS the selection when the incoming list is empty', () => {
    /*
      Asserting what the code does, which is not what its own docstring says.

      `applySessionMediaState` is documented as "an empty refresh leaves the previous selection
      alone rather than clearing it", quoting an upstream `&&` guard that only ASSIGNS when the list
      is non-empty. The function cannot do that: its signature is `(list) => MtxStreamState` — it
      never receives the previous state — and it returns `selectedTabID: list.length > 0 ?
      list[0]._id : null`. So an empty refresh clears the selection.

      The behaviour is deliberate enough to be pinned already: `mtx-streams.test.ts` asserts
      "selects nothing when the list is empty". This test agrees with that and with the code. The
      DOCSTRING is what disagrees, and it is recorded in TODO rather than silently rewritten,
      because deciding which of the two is right needs the reference bundle read at the offsets it
      cites — not a guess by whoever is here next.

      My first draft of this test believed the docstring and asserted 'b'. It failed, and it was the
      test that was wrong.
    */
    const mtx = new MtxStreamTabs();
    mtx.replaceFromSession([stream('a'), stream('b')]);
    mtx.selectByUser('b');
    mtx.replaceFromSession([]);
    expect(mtx.selectedTabID).toBeNull();
  });
});

describe('it is actually reactive — the part no other gate could prove', () => {
  /*
    This block is why `resolve.conditions: ['browser']` is in `vite.config.ts`.

    Extracting `MtxStreamTabs` as a CLASS was forced by Svelte's rule that reassigned state cannot
    be exported from a `.svelte.ts` module, so the reactive box lives behind `this`. The assertion
    that matters is therefore whether reading `mtx.streams` re-runs when a stream arrives -
    everything above would pass against a plain object.

    THE SHAPE HERE IS LOAD-BEARING, and two earlier drafts got it wrong:

    - Draft 1 registered the effect inside `$effect.root` and then mutated and flushed OUTSIDE it.
      It recorded nothing.
    - Draft 2 moved the assertions INSIDE the root, and `$effect.root` swallows a thrown assertion.
      That draft passed with a deliberately false `toEqual([99999])` in it - green no matter what
      the class did, which is the exact vacuous-test failure the size ratchet exists to catch.

    So: every mutation and flush happens INSIDE the root, because that is the only place effects
    run; every assertion happens OUTSIDE it, because that is the only place vitest can see one fail.
    The negative control is deleting `$state.raw` from the class, which turns both of these red.
  */
  it('re-runs a reader as the stream list changes', () => {
    const mtx = new MtxStreamTabs();
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(mtx.streams.length);
      });
      flushSync();
      mtx.started(stream('a'));
      flushSync();
      mtx.stopped(stream('a'));
      flushSync();
    });
    stop();

    expect(seen, 'the effect did not re-run as the stream list changed').toEqual([0, 1, 0]);
  });

  it('re-runs a reader when only the SELECTION changes', () => {
    /*
      Separate from the case above because both getters read the same underlying object. A wiring
      that made `streams` reactive but left `selectedTabID` stale would pass the first test and
      still highlight the wrong tab.
    */
    const mtx = new MtxStreamTabs();
    mtx.replaceFromSession([stream('a'), stream('b')]);

    const seen: (string | null)[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(mtx.selectedTabID);
      });
      flushSync();
      mtx.selectByUser('b');
      flushSync();
    });
    stop();

    expect(seen.at(-1), 'the selection getter is not reactive').toBe('b');
    expect(seen.length, 'the effect did not re-run on selection change').toBeGreaterThan(1);
  });
});
