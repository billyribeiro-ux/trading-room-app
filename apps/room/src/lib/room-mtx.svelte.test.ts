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

/*
  THE REACTIVITY TEST IS NOT HERE, AND THAT IS A FINDING RATHER THAN AN OMISSION.

  The point of extracting `MtxStreamTabs` as a CLASS was that reassigned state cannot be exported
  from a `.svelte.ts` module, so the reactive box has to live behind `this`. The assertion that
  matters is therefore: does reading `mtx.streams` re-run when a stream arrives? Everything above
  would pass against a plain object.

  It cannot be written under this project's current test configuration, diagnosed rather than
  assumed:

  - `vite.config.ts` has no `resolve.conditions: ['browser']` under VITEST, which the official
    testing guidance requires for tests that exercise runes.
  - Every existing "render" test in this suite imports `render` from `svelte/server`. The suite runs
    in SSR mode, where `$effect` is a documented no-op.

  So an `$effect` inside `$effect.root` never runs here: it records nothing, throws nothing, and
  reports nothing. Two drafts of that test were written and BOTH were vacuous - the second passed
  with a deliberately false `toEqual([99999])` inside it, because `$effect.root` also swallows a
  thrown assertion. A test that cannot fail is worse than no test, so neither was kept.

  Closing this needs `resolve.conditions` plus a jsdom environment, which changes how all 114 test
  files resolve Svelte. That is a build-config change and gets its own commit and its own full gate
  run - not a rider on an extraction. Recorded as TODO row AE.
*/
