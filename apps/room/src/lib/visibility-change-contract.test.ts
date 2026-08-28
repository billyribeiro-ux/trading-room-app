import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { createRoomRefresh } from './room/refresh.svelte';

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
    const refresh = createRoomRefresh({ refresh: async () => {}, refreshAll: async () => {} });
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
    const refresh = createRoomRefresh({
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
