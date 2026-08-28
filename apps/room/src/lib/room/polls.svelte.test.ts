// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomPolls } from './polls.svelte';
import type { ActivePoll } from '#lib/types.js';

/*
  `RoomPolls` is the first of the six room state classes, so this file is the first proof that the
  pattern holds — and the pattern is the risky part, not the poll logic.

  A class field behind a getter can be wired up so that every gate passes and the value never
  updates: `svelte-check` sees the types, `svelte-autofixer` sees the syntax, the suite sees the
  return values, and none of them sees reactivity. The last describe block is the one that would
  catch it. Everything above it would pass against a plain object.

  The SHAPE of that block is copied deliberately from `room-mtx.svelte.test.ts`, which records two
  drafts that were wrong: mutating outside `$effect.root` records nothing, and asserting inside it
  is swallowed, so the test passes with a deliberately false expectation in it. Mutations and
  flushes go INSIDE the root; assertions go OUTSIDE.
*/

const poll = (over: Partial<ActivePoll> = {}): ActivePoll => ({
  id: 1,
  senderId: 100,
  senderName: 'presenter',
  q: 'ready?',
  choices: ['yes', 'no'],
  createdAt: new Date(0),
  total: 0,
  totals: [0, 0],
  answers: [],
  userAnswerChoice: null,
  ...over
});

const VIEWER = 7;

describe('the initial state is the reference’s', () => {
  it('starts in setup, not minimised, nothing delivered', () => {
    const polls = new RoomPolls();
    expect(polls.openMode).toBe('setup');
    expect(polls.minimized).toBe(false);
    expect(polls.restoreToken).toBe(0);
    expect(polls.deliveredId).toBeNull();
  });
});

describe('a poll arriving decides who sees it', () => {
  it('opens for a member who has not answered', () => {
    const polls = new RoomPolls();
    expect(polls.deliver(poll(), VIEWER)).toBe(true);
    expect(polls.openMode, 'an arriving poll is answered, not built').toBe('auto');
    expect(polls.deliveredId).toBe(1);
  });

  it('does NOT open for the presenter who sent it', () => {
    const polls = new RoomPolls();
    expect(polls.deliver(poll({ senderId: VIEWER }), VIEWER)).toBe(false);
    expect(polls.deliveredId, 'nothing was delivered, so nothing is marked').toBeNull();
  });

  it('does NOT open for somebody who already answered', () => {
    const polls = new RoomPolls();
    expect(polls.deliver(poll({ userAnswerChoice: 0 }), VIEWER)).toBe(false);
  });

  it('opens ONCE — the marker is what stops it reappearing', () => {
    /*
      The reason `deliveredId` exists. Without it the same poll re-opens every time anything else on
      the page changes, which is what an effect watching `data.activePoll` does on every re-render.

      ## THIS IS ALSO THE ANSWER TO THE AUTOFIXER, and it lives here rather than at `deliver`

      `svelte-autofixer` flags the call site in `+page.svelte` — *"you are calling a function inside
      an $effect… could it use `$derived`?"* — and unlike the other three effects in that file, the
      honest answer is that yes, `deliver` assigns `$state`. That is the case the suggestion exists
      to catch, so it is argued rather than dismissed:

      **A latch is not a derivation.** The third of `deliver`'s three refusals is *this browser has
      already opened this poll once*. A `$derived` has no memory of having fired, so the shape
      cannot be written as one — and the two assertions below are what that memory looks like.

      **It reads what it writes, and it CONVERGES rather than looping.** `#deliveredId` is read
      inside `deliver` and assigned three lines later, so the effect tracks it: the write makes
      `#deliveredId === poll.id` true, the effect runs once more, `deliver` returns false, and
      nothing is written. One extra pass, no cycle.

      The argument sits in the TEST and not in the docblock because `polls.svelte.ts` is at its
      size ceiling (119 lines, `source-size-contract.test.ts`) and ceilings here only go down.
      Reasoning next to the assertion that enforces it is not a consolation prize — this is the
      file that would go red if somebody "simplified" the latch into a derivation.
    */
    const polls = new RoomPolls();
    expect(polls.deliver(poll(), VIEWER)).toBe(true);
    expect(polls.deliver(poll(), VIEWER), 'the same poll must not re-open').toBe(false);
  });

  it('and a NEW poll opens again after the first one ended', () => {
    const polls = new RoomPolls();
    polls.deliver(poll({ id: 1 }), VIEWER);
    polls.deliver(null, VIEWER);
    expect(polls.deliveredId, 'the marker must clear or poll 2 never opens').toBeNull();
    expect(polls.deliver(poll({ id: 2 }), VIEWER)).toBe(true);
  });

  it('ending a poll un-minimises it, so the restore button cannot outlive it', () => {
    // A minimised modal for a poll that no longer exists is a control that opens nothing.
    const polls = new RoomPolls();
    polls.deliver(poll(), VIEWER);
    polls.minimize();
    polls.deliver(null, VIEWER);
    expect(polls.minimized).toBe(false);
  });
});

describe('opening, minimising and closing', () => {
  it('a fresh open resets the mode to setup', () => {
    const polls = new RoomPolls();
    polls.deliver(poll(), VIEWER);
    expect(polls.openMode).toBe('auto');
    expect(polls.requestOpen()).toBe(true);
    expect(polls.openMode).toBe('setup');
  });

  it('but RESTORING a minimised poll bumps the token and leaves the mode alone', () => {
    /*
      A poll minimised mid-answer is still that poll. Resetting the mode to `setup` on restore would
      turn an answer into a builder, which is the same control claiming to be two things.
    */
    const polls = new RoomPolls();
    polls.deliver(poll(), VIEWER);
    polls.minimize();

    expect(polls.requestOpen()).toBe(true);
    expect(polls.restoreToken, 'the modal watches the CHANGE, so it must move').toBe(1);
    expect(polls.openMode).toBe('auto');
    expect(polls.minimized).toBe(false);
  });

  it('the token only ever moves forward, so two restores are two events', () => {
    // A boolean flipped back to the same value is not an event; the modal would restore once.
    const polls = new RoomPolls();
    polls.minimize();
    polls.requestOpen();
    polls.minimize();
    polls.requestOpen();
    expect(polls.restoreToken).toBe(2);
  });

  it('closing clears minimised, or the poll could never be opened again', () => {
    const polls = new RoomPolls();
    polls.minimize();
    polls.closed();
    expect(polls.minimized).toBe(false);
  });
});

describe('the getters are REACTIVE, which is the only thing the other gates cannot see', () => {
  /*
    Mutations and flushes inside `$effect.root`; assertions outside it. See the file header — both
    halves of that rule were learned from a draft that passed while proving nothing.

    The negative control is deleting `$state` from the field: both of these go red.
  */
  it('re-runs a reader when a poll is delivered', () => {
    const polls = new RoomPolls();
    const seen: (number | null)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(polls.deliveredId);
      });
      flushSync();
      polls.deliver(poll({ id: 42 }), VIEWER);
      flushSync();
      polls.deliver(null, VIEWER);
      flushSync();
    });
    stop();

    expect(seen, 'the effect did not re-run as the delivered poll changed').toEqual([
      null,
      42,
      null
    ]);
  });

  it('re-runs a reader when only the MINIMISED flag changes', () => {
    /*
      Separate from the case above because a wiring that made one field reactive and left another
      stale would pass the first test and still leave the restore button showing the wrong thing.
    */
    const polls = new RoomPolls();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(polls.minimized);
      });
      flushSync();
      polls.minimize();
      flushSync();
      polls.closed();
      flushSync();
    });
    stop();

    expect(seen, 'the minimised flag is not reactive').toEqual([false, true, false]);
  });

  it('and when only the restore TOKEN changes', () => {
    // The one the modal actually watches. Stale here means a minimised poll never comes back.
    const polls = new RoomPolls();
    const seen: number[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(polls.restoreToken);
      });
      flushSync();
      polls.minimize();
      polls.requestOpen();
      flushSync();
    });
    stop();

    expect(seen, 'the restore token is not reactive').toEqual([0, 1]);
  });
});
