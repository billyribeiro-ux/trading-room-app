import type { ActivePoll } from '#lib/types.js';

/**
 * What the page should do with the poll modal, having been told what the server now holds.
 *
 * `poll-02`. A verdict rather than a boolean, because "no poll" is TWO different situations and the
 * boolean could only express one of them: a room that has never had a poll, and a poll that has just
 * ended under a panel somebody is looking at. The reference distinguishes them with an EVENT —
 * `case "pollDone": emit("pollDone")` at byte 1,024,082, and `subscribe("pollDone", () =>
 * this.hidePanel())` at 2,106,987 — and this room has state rather than events, so the transition is
 * what has to be detected.
 */
export type PollDelivery = 'open' | 'ended' | null;

/*
  The poll modal's own state — the first of the six room state classes, and the shape the rest
  follow.

  ## Why a class rather than an exported `$state`

  `svelte/svelte-js-files` is explicit that you *cannot export reassigned state* from a `.svelte.ts`
  module: the importing side binds the VALUE, not the reactive box. And `svelte/context` gives the
  same rule from the other end — reassign a context value *"and you will 'break the link'"*.

  A class field keeps the box behind `this`, so every consumer reads through a getter and stays
  reactive however the field is written. `MtxStreamTabs` in `#lib/room-mtx.svelte.ts` is the working
  precedent this copies.

  It matters more than it sounds. Getting it wrong produces a room that renders once and then
  quietly stops updating — and `svelte-check`, the suite and `svelte-autofixer` all pass on it.
  `polls.svelte.test.ts` reads these getters inside `$effect.root` for exactly that reason.

  ## What it owns, and what it deliberately does not

  It owns the four poll fields and every transition between them. It does NOT own `modal`, which
  belongs to the room's layout and is written by half a dozen unrelated controls — so the methods
  below RETURN what should happen to the modal rather than doing it. That is the same
  decision-versus-effect split that worked for `media-capture-error.ts` and `user-action-intent.ts`:
  the decision is pure and testable here, the state write stays with whoever owns that state.

  Plain `$state`, not `$state.raw`: these are four primitives, so there is no deep proxy to avoid.
  `$state.raw` earns its place on the logs and stream lists that are replaced wholesale.
*/
export class RoomPolls {
  /** `setup` when the presenter opened it to build one; `auto` when a poll arrived for answering. */
  #openMode = $state<'setup' | 'auto'>('setup');
  #minimized = $state(false);
  /*
    Bumped to re-open a minimised poll. A counter and not a boolean because the modal reacts to the
    CHANGE — restoring twice in a row has to be two distinct values, and a boolean flipped back to
    the same state is not an event.
  */
  #restoreToken = $state(0);
  /** The poll this browser has already auto-opened, so it is not re-opened on every re-render. */
  #deliveredId = $state<number | null>(null);
  /**
   * The poll the SERVER last said was running, whoever it belongs to and whether or not it was shown.
   *
   * PLAIN, not `$state`, and the asymmetry with `#deliveredId` above is deliberate. That one is a
   * latch the effect reads and writes and whose convergence the tests argue; this one is written in
   * `deliver` and read only by the next call to `deliver`. Nothing renders from it, so making it
   * reactive would add a dependency to an effect that already assigns it — the shape `arrivals.ts`
   * records refusing for `#seeded` and for the same reason.
   *
   * It is not `#deliveredId` because that is cleared for three reasons that are not "the poll
   * ended": you wrote it, you already answered it, or this browser has shown it once. A presenter
   * ending their own poll would otherwise never close anyone's panel, because their poll was never
   * delivered to them.
   */
  #activeId: number | null = null;

  get openMode(): 'setup' | 'auto' {
    return this.#openMode;
  }

  get minimized(): boolean {
    return this.#minimized;
  }

  get restoreToken(): number {
    return this.#restoreToken;
  }

  get deliveredId(): number | null {
    return this.#deliveredId;
  }

  /**
   * The presenter opening the poll UI. Returns true when the caller should show the modal.
   *
   * A MINIMISED poll is restored rather than rebuilt — the token bump is what the modal watches —
   * and the mode is left alone, because a poll that was minimised mid-answer is still that poll.
   * Only a fresh open resets the mode to `setup`.
   */
  requestOpen(): boolean {
    if (this.#minimized) {
      this.#restoreToken += 1;
      this.#minimized = false;
      return true;
    }
    this.#openMode = 'setup';
    return true;
  }

  minimize(): void {
    this.#minimized = true;
  }

  /** The modal closing. A closed poll is not a minimised one, or it could never be opened again. */
  closed(): void {
    this.#minimized = false;
  }

  /**
   * A poll arriving from the server. Returns true when it should be shown to THIS viewer.
   *
   * Three reasons not to, and each is a different person: you wrote it, you have already answered
   * it, or this browser has already opened it once. The third is what stops the modal reappearing
   * every time anything else on the page changes.
   *
   * A null poll is the poll ending: the delivery marker is cleared so the NEXT poll opens, and the
   * minimised flag with it, because a minimised modal for a poll that no longer exists is a
   * restore button that opens nothing. It ASSIGNS from inside an `$effect`; the tests argue why.
   */
  deliver(poll: ActivePoll | null, viewerId: number): PollDelivery {
    if (!poll) {
      /*
        `poll-02` — THE POLL ENDED, which is not the same as there never having been one.

        Reported only on the TRANSITION. Returning `'ended'` for the steady state of "no poll" would
        make the setup panel impossible to open: a presenter builds a poll while `activePoll` is
        null, so the page would close the modal on the same pass that opened it.
      */
      const ended = this.#activeId !== null;
      this.#activeId = null;
      this.#deliveredId = null;
      this.#minimized = false;
      return ended ? 'ended' : null;
    }

    this.#activeId = poll.id;

    if (
      poll.senderId === viewerId ||
      poll.userAnswerChoice !== null ||
      this.#deliveredId === poll.id
    ) {
      return null;
    }

    this.#deliveredId = poll.id;
    this.#openMode = 'auto';
    this.#minimized = false;
    return 'open';
  }
}
