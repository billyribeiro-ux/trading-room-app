import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

import { createRoomRefresh } from './room/refresh.svelte';

/**
 * A room whose ten-second arming window has already passed.
 *
 * `G16` — the reference adds its `visibilitychange` listener inside a `setTimeout(…, 1e4)`, so a
 * flip in the first ten seconds is not observed at all. `refresh.svelte.ts` reproduces that with a
 * clock comparison, which means every case below that exercises a flip has to move the clock first
 * or it is asserting the arming window rather than the behaviour it names.
 *
 * Fake timers rather than a real wait, and `Date` is in Vitest's default `toFake` set, so
 * `advanceTimersByTime` moves the same clock the module reads. The window is asserted in its own
 * case below; here it is only got out of the way.
 */
const armedRoom = (deps: Parameters<typeof createRoomRefresh>[0]) => {
  vi.useFakeTimers();
  const refresh = createRoomRefresh(deps);
  vi.advanceTimersByTime(10_000);
  return refresh;
};

/*
  `visibilityChangeEnabled` — pause chat work while the tab is hidden, catch up when it returns.

  Item AA deferred this in 2026-08-12 with a correct objection about the WRONG HALF. Upstream's
  handler does two things:

    document.hidden
      ? (globals.appHasFocus = !1, unloadRoster())
      : (globals.appHasFocus = !0, …, showSidebar && loadRoster(),
         guiEventBus.emit('appHasFocusGetChatLog'),
         preferences.extraChatColumn && guiEventBus.emit('appHasFocusGetChatLogExtraChatColumn'))

  The ROSTER half gates a five-second poll. This roster is SSE-PUSHED, so reproducing it would make
  a hidden tab hold a stale roster for anyone who has not opted in — strictly worse than doing
  nothing, which is what AA said and it is still true.

  The CHAT half is the opposite. Upstream a hidden tab merely stops appending to an array; this room
  re-reads its whole chat log from the server on every SSE event, so a hidden tab was doing a full
  page load for every message anybody posted. That is what this closes.
*/

const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The preference declaration and its write-path case moved to `RoomPrefs` in Phase 5 slice 3. The
  SSE gate that READS it is still the page's, so the two are asserted against their own files.
*/
const PREFS_SOURCE = readFileSync(new URL('./room/prefs.svelte.ts', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const DEAD = readFileSync(new URL('./dead-preference-keys.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const prefsCode = stripComments(PREFS_SOURCE);
const modalCode = stripComments(MODAL);

describe('the preference', () => {
  it('is wired, where it was one of the dead element ids', () => {
    expect(modalCode).toContain("'visibility-change-enabled': 'visibilityChangeEnabled'");
    expect(prefsCode).toContain(
      "if (key === 'visibilityChangeEnabled') this.#visibilityChangeEnabled = value;"
    );
  });

  it('defaults OFF, so nothing changes for anyone who has not asked for it', () => {
    /*
      The reference's defaults DO carry `visibilityChangeEnabled:!0`, and this room deliberately
      differs: upstream's hidden-tab branch skips an array append, ours skips a network refetch, and
      a viewer who has not opted in should not silently stop receiving until they look at the tab.
      Off by default, and the divergence is stated rather than inherited by accident.
    */
    expect(prefsCode).toContain(
      'this.#visibilityChangeEnabled = $state(loadedSettings.visibilityChangeEnabled === true);'
    );
  });

  it('and its element id stays on the dead list, because the junk it wrote is still out there', () => {
    // Removing the WRITE does not remove what was already written under the element id.
    expect(DEAD).toContain("'visibility-change-enabled'");
  });
});

describe('the hidden tab stops refetching', () => {
  /*
    The handler moved to `RoomEventStream` in Phase 5 slice 5; `missedChatWhileHidden` did not.

    The flag is written on BOTH sides of that boundary — set by the stream, cleared by the
    visibility handler still on the page — so it stays the page's and crosses as a receiver. Both
    ends are asserted below, because a stream calling a receiver nobody wired would satisfy either
    one alone.
  */
  const streamCode = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');

  it('the SSE handler returns instead of invalidating', () => {
    expect(streamCode).toContain(
      'if (this.#prefs.visibilityChangeEnabled && !this.#appHasFocus()) {'
    );
    expect(streamCode).toContain('this.#chatMissedWhileHidden();');
    // The page end of the receiver, so the pair cannot drift apart silently.
    // The page end of the receiver, so the pair cannot drift apart silently. It is a NAMED method
    // as of 2026-08-18 — the flag moved into `createRoomRefresh` and no longer exists as a page
    // `let` for anything to assign.
    expect(pageCode).toContain('chatMissedWhileHidden: () => roomRefresh.chatMissedWhileHidden()');
  });

  it('the ding plays BEFORE the gate, so a hidden tab is still audible', () => {
    /*
      THIS ASSERTION REPLACES ONE THAT COULD NEVER HAVE FAILED, and the replacement is the finding
      rather than a tidy-up.

      What stood here compared the SOURCE POSITION of the gate against the source position of
      `mentionArrivals.fresh(`, on the claim that "the gate is AFTER the mention path, so a mention
      still reaches you". Two things are wrong with it. The mention path is an `$effect`, and where
      an effect is DECLARED says nothing about when it RUNS. And the effect reads `data.messages`,
      which only changes when the loader runs — which is precisely what the gate's early return
      skips. So on a hidden tab the mention popup is deferred to the catch-up, not delivered; the
      old assertion passed because the two indices happened to be in that order, never because the
      behaviour it described was real.

      Moving the handler into another file is what exposed it: a cross-file index comparison is
      obviously meaningless, where the same comparison inside one file had looked like a check.

      What IS ordered, in one file and in execution: the chat ding runs before the early return, so
      a followed user is still heard while the tab is hidden. That is the real saving-versus-silence
      trade this feature makes, and it is what is asserted now. The mention behaviour is recorded in
      `TODO.md` as a gap; changing it is a product decision, not a refactor's.
    */
    /*
      RE-POINTED 2026-08-28, when the sound RULE moved to `#lib/chat-arrival-sound.ts` and this
      dispatcher kept only the call. The anchor was `playSoundEffect('pling')` — a literal that no
      longer exists here — and re-pointing it rather than deleting it is the rule this repository
      earned four times over: migrate the test with the code, and re-anchor on what now owns it.

      What is asserted is unchanged and is still about THIS file: the sound call runs before the
      hidden-tab early return, so a followed user is heard while the tab is hidden.
    */
    const code = streamCode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const ding = code.indexOf('if (sound) playSoundEffect(sound);');
    const gate = code.indexOf('if (this.#prefs.visibilityChangeEnabled && !this.#appHasFocus()) {');
    expect(ding, 'the chat ding must exist').toBeGreaterThan(-1);
    expect(gate, 'the hidden-tab gate must exist').toBeGreaterThan(-1);
    expect(ding, 'the ding must come before the hidden-tab return').toBeLessThan(gate);
  });
});

describe('and catches up when the tab comes back', () => {
  it('listens for visibilitychange and tracks focus', () => {
    /*
      BOUND ON `<svelte:document>` since 2026-08-15, not added by hand in an effect.
      `svelte/best-practices` names this case: *"If you need to attach listeners to `window` or
      `document` you can use `<svelte:window>` and `<svelte:document>` … Avoid using `onMount` or
      `$effect` for this."*
    */
    // The BINDING is still page markup and is still asserted as text — that is what `<svelte:document>`
    // is, and there is nothing to execute about it.
    expect(pageCode).toContain('<svelte:document onvisibilitychange={');
    expect(pageCode).toContain('roomRefresh.visibilityChanged(document.hidden)');

    /*
      The focus TRACKING is now executed rather than read. Until 2026-08-18 this asserted the strings
      `appHasFocus = false;` and `appHasFocus = true;` appeared in the page — which is satisfied by
      those characters existing in either order, in either branch, or in dead code.
    */
    const refresh = armedRoom({ refresh: async () => {}, refreshAll: async () => {} });
    expect(refresh.appHasFocus, 'a room starts focused').toBe(true);
    refresh.visibilityChanged(true);
    expect(refresh.appHasFocus).toBe(false);
    refresh.visibilityChanged(false);
    expect(refresh.appHasFocus).toBe(true);
    refresh.stop();
  });

  it('cannot leak the listener, because it is no longer hand-managed', () => {
    /*
      What the old pair of assertions guarded was a manual `addEventListener` matched by a manual
      `removeEventListener` in a teardown — a detached listener holding a closure over `data` is how
      a single-page app leaks a page. That risk is now STRUCTURAL rather than asserted: Svelte adds
      the handler when the component mounts and removes it when it unmounts, and there is no hand
      call on either side to forget.

      Asserted as the absence of the hand-rolled pair FOR THIS HANDLER, which is the thing that
      could come back.

      SCOPED TO `onVisibilityChange` DELIBERATELY, and the reason is a finding this assertion made
      when it was written unscoped: there is a SECOND `visibilitychange` listener in the page, at
      `handleVisibility`, which pauses and resumes the five-second refresh poll. It is a different
      concern with a real teardown that also clears an interval, so it is not a leftover — but two
      listeners for one event on one document, in one component, is a duplication worth naming
      rather than discovering later. Merging them is Phase 3 work and is recorded in TODO row AE.
    */
    expect(pageCode).not.toContain("addEventListener('visibilitychange', onVisibilityChange)");
    expect(pageCode).not.toContain("removeEventListener('visibilitychange', onVisibilityChange)");
  });

  it('pauses the poll while hidden and restarts it on return', () => {
    /*
      ADDED because its absence was found by a negative control, not by reading: deleting
      `startRefresh()` from the handler left the whole suite green. A room whose five-second poll
      never restarts looks fine for exactly as long as nobody else says anything, and then goes
      quietly stale — the failure this poll exists to prevent, reintroduced with no test to notice.

      Both directions asserted, because pausing without resuming is the same bug wearing a
      different hat.
    */
    /*
      EXECUTED as of 2026-08-18. The old version sliced the handler's source for the two call names,
      which cannot tell a running interval from a deleted one.
    */
    vi.useFakeTimers();
    let refreshes = 0;
    const refresh = createRoomRefresh({
      refresh: async () => void (refreshes += 1),
      refreshAll: async () => {}
    });

    refresh.start();
    vi.advanceTimersByTime(11_000);
    const whileVisible = refreshes;
    expect(whileVisible, 'the poll must fire while visible').toBeGreaterThan(0);

    refresh.visibilityChanged(true);
    vi.advanceTimersByTime(30_000);
    expect(refreshes, 'a hidden tab must not poll').toBe(whileVisible);

    refresh.visibilityChanged(false);
    vi.advanceTimersByTime(11_000);
    expect(refreshes, 'returning must restart the poll').toBeGreaterThan(whileVisible + 1);

    refresh.stop();
    vi.useRealTimers();

    // A tab already hidden at mount must not start one — still the page's decision, so still text.
    expect(pageCode).toContain('if (!document.hidden) roomRefresh.start();');
  });

  it('refetches ONCE on return, and the wider re-read only when something was missed', () => {
    /*
      REWRITTEN 2026-08-15, and the old wording was a half-truth this file could not see.

      It said "returning to a tab where nothing happened should cost nothing", which was true of the
      handler it read and false of the page: a SECOND `visibilitychange` listener, `handleVisibility`,
      called `refreshRoom()` on every return regardless. Two listeners for one event, each correct
      about its own concern and neither aware of the other.

      Merging them showed what the pair actually did — and that on a return WITH missed chat it
      fired BOTH `invalidate('room:data')` and `invalidateAll()`, two loads for one event. The
      merged handler issues exactly one either way:

        nothing missed  -> refreshRoom()      the poll's own `invalidate('room:data')`
        chat missed     -> invalidateAll()    the wider re-read, and no second request

      `appHasFocusGetChatLog` is still one refetch rather than a replay, because the load already
      returns the newest page per channel — the room re-reads itself and is current.
    */
    /*
      EXECUTED as of 2026-08-18, and this is the assertion that gains most from it. The old version
      counted occurrences of `refreshRoom()` and `invalidateAll()` in the handler's SOURCE to prove
      exactly one request goes out — a count that is satisfied by two calls on the same branch, or
      by one inside an `if` that never runs. Now both counters are real.
    */
    const calls = { narrow: 0, wide: 0 };
    const refresh = armedRoom({
      refresh: async () => void (calls.narrow += 1),
      refreshAll: async () => void (calls.wide += 1)
    });

    // Nothing missed: exactly one NARROW re-read, and no wide one.
    refresh.visibilityChanged(true);
    refresh.visibilityChanged(false);
    expect(calls, 'a quiet return costs one narrow refresh').toEqual({ narrow: 1, wide: 0 });

    // Chat missed while hidden: exactly one WIDE re-read, and no second narrow one.
    refresh.visibilityChanged(true);
    refresh.chatMissedWhileHidden();
    refresh.visibilityChanged(false);
    expect(calls, 'a catch-up is ONE wide re-read, not both').toEqual({ narrow: 1, wide: 1 });

    // And the latch is consumed — a second return does not catch up again.
    refresh.visibilityChanged(true);
    refresh.visibilityChanged(false);
    expect(calls, 'the missed-chat latch must be one-shot').toEqual({ narrow: 2, wide: 1 });

    refresh.stop();
  });
});

describe('the roster half is deliberately absent', () => {
  it('nothing gates the roster on visibility', () => {
    /*
      `unloadRoster()` / `loadRoster()` gate a POLL upstream. Ours is SSE-pushed, so the same gate
      would leave a hidden tab holding a stale roster — item AA's objection, which was right about
      this half and is why only the chat half was built.
    */
    expect(pageCode).not.toContain('unloadRoster');
    expect(pageCode).not.toContain('loadRoster(');
  });
});

describe('G16 — the first ten seconds are not observed, exactly as upstream', () => {
  /*
    `appVisibilityChange(e)` at bundle byte 2,511,416, read whole:

    ```js
    e ? this.visibilityChangeTimer = setTimeout(() => {
          document.addEventListener("visibilitychange", () => {
            document.hidden ? (globals.appHasFocus = !1, unloadRoster())
                            : (globals.appHasFocus = !0, …, showSidebar && loadRoster(), …)
          })
        }, 1e4)
      : document.removeEventListener("visibilitychange", () => { … })
    ```

    The LISTENER is inside the `setTimeout`, so for ten seconds after the room loads there is no
    listener at all: a flip in that window is not observed, not queued, and not replayed on arrival.

    ## Why this was refused until 2026-09-02, and why the refusal did not survive

    The recorded reason was that the delay protects a socket handshake still in flight, that this
    room's poll is idempotent so nothing needs protecting, and that arming immediately *"means a
    member who tabs away during the first ten seconds is actually noticed"*. Every clause is true.
    None of them is one of the four things that excuse not matching — **being better than the
    reference is still a divergence**, and this document's `DELIBERATE DIVERGENCE` category was
    defined by exactly that kind of argument until it was retired.

    ## Two things in that body are NOT reproduced, and neither is a divergence

    `clearInterval(this.visibilityChangeTimer)` on the show branch clears a `setTimeout` handle with
    the wrong clearer, on a timeout that has already fired — a no-op whichever way it is read. And
    the disarm branch passes `removeEventListener` a FRESH arrow function, which matches no
    registered listener, so it removes nothing. Reproducing a call that does nothing is reproducing
    nothing; both are recorded here so the next reader does not file them as gaps.
  */

  it('ignores a flip inside the window, and observes one after it', () => {
    vi.useFakeTimers();
    const calls = { narrow: 0, wide: 0 };
    const refresh = createRoomRefresh({
      refresh: async () => void (calls.narrow += 1),
      refreshAll: async () => void (calls.wide += 1)
    });

    /*
      Inside the window nothing happens AT ALL — this is the assertion that distinguishes matching
      the reference from deferring the work. `appHasFocus` does not move, the poll is not stopped,
      and returning costs no refetch, because as far as the room is concerned the tab never left.
    */
    vi.advanceTimersByTime(9_999);
    refresh.visibilityChanged(true);
    expect(refresh.appHasFocus, 'a hide inside the arming window is not observed').toBe(true);
    refresh.visibilityChanged(false);
    expect(calls, 'and returning from one costs no refetch').toEqual({ narrow: 0, wide: 0 });

    /* One millisecond later the listener exists upstream, and the handler acts here. */
    vi.advanceTimersByTime(1);
    refresh.visibilityChanged(true);
    expect(refresh.appHasFocus, 'a hide after the window IS observed').toBe(false);
    refresh.visibilityChanged(false);
    expect(calls, 'and the return catches up').toEqual({ narrow: 1, wide: 0 });

    refresh.stop();
    vi.useRealTimers();
  });

  it('states the window as the reference does, and reads it from the module', () => {
    /*
      The number is read out of the source rather than restated, so the two cannot drift. A test
      that hard-codes 10_000 beside a module that says 5_000 passes while the behaviour is wrong.
    */
    const source = readFileSync('src/lib/room/refresh.svelte.ts', 'utf8');
    expect(source).toContain('const VISIBILITY_ARMING_MS = 10_000;');
    expect(source, 'the gate must read the constant, not a literal').toContain(
      'Date.now() - armedAt < VISIBILITY_ARMING_MS'
    );
  });

  it('does NOT unload the roster, and that one is a real divergence with a real reason', () => {
    /*
      The second half of `G16`, kept apart from the first because they went opposite ways.

      Upstream the hide branch calls `unloadRoster()` and the show branch `showSidebar &&
      loadRoster()`. There the roster is a SEPARATE fetch, so it is simply absent while hidden and
      its reload is invisible. Here it arrives with the page load, so unloading it would empty the
      sidebar and repaint it on every return to the tab — a flash the reference does not have.

      Matching the CODE would therefore produce a DIFFERENT rendered result, which is the escape.
      Asserted as an absence so the day somebody "completes" G16 by adding the unload, this says why
      it was left out.
    */
    const path = 'src/lib/room/refresh.svelte.ts';
    const source = readFileSync(path, 'utf8');
    /*
      `codeOf`, and its first draft here did not use it and went red on its own subject: the
      paragraph explaining why `unloadRoster` is absent contains the word `unloadRoster`. That is
      the ninth recorded instance of a slice of raw source matching the very comment explaining the
      change, and the reason this repository has the helper at all.
    */
    expect(codeOf(path, source)).not.toContain('unloadRoster');
    expect(source, 'the reason has to survive with the absence').toContain(
      'DIFFERENT rendered result'
    );
  });
});
