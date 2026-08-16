import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const DEAD = readFileSync(new URL('./dead-preference-keys.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const modalCode = stripComments(MODAL);

describe('the preference', () => {
  it('is wired, where it was one of the dead element ids', () => {
    expect(modalCode).toContain("'visibility-change-enabled': 'visibilityChangeEnabled'");
    expect(pageCode).toContain(
      "if (key === 'visibilityChangeEnabled') visibilityChangeEnabled = value;"
    );
  });

  it('defaults OFF, so nothing changes for anyone who has not asked for it', () => {
    /*
      The reference's defaults DO carry `visibilityChangeEnabled:!0`, and this room deliberately
      differs: upstream's hidden-tab branch skips an array append, ours skips a network refetch, and
      a viewer who has not opted in should not silently stop receiving until they look at the tab.
      Off by default, and the divergence is stated rather than inherited by accident.
    */
    expect(pageCode).toContain(
      'let visibilityChangeEnabled = $state(loadedSettings.visibilityChangeEnabled === true);'
    );
  });

  it('and its element id stays on the dead list, because the junk it wrote is still out there', () => {
    // Removing the WRITE does not remove what was already written under the element id.
    expect(DEAD).toContain("'visibility-change-enabled'");
  });
});

describe('the hidden tab stops refetching', () => {
  it('the SSE handler returns instead of invalidating', () => {
    expect(pageCode).toContain('if (visibilityChangeEnabled && !appHasFocus) {');
    expect(pageCode).toContain('missedChatWhileHidden = true;');
  });

  it('but the gate is AFTER the mention path, so a mention still reaches you', () => {
    /*
      `visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)` —
      upstream keeps mentions alive on the hidden branch. A feature that silences the one message
      addressed to you by name is not a saving.
    */
    /*
      RE-POINTED 2026-08-15: the popup's marker moved into `RoomOrderedArrivals`, so `lastPopupChatId`
      is no longer a name in this page. The concern is unchanged and is about ORDER — the hidden-tab
      early return must come after the mention path, or a member would stop being told about the one
      message addressed to them by name. `mentionArrivals` is that path's identifier now.
    */
    const gate = pageCode.indexOf('if (visibilityChangeEnabled && !appHasFocus) {');
    const mention = pageCode.indexOf('mentionArrivals.fresh(');
    expect(mention, 'the mention popup path must exist').toBeGreaterThan(-1);
    expect(gate, 'the refetch gate must come after the mention path').toBeGreaterThan(mention);
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
    expect(pageCode).toContain('<svelte:document onvisibilitychange={onVisibilityChange} />');
    expect(pageCode).toContain('function onVisibilityChange() {');
    expect(pageCode).toContain('appHasFocus = false;');
    expect(pageCode).toContain('appHasFocus = true;');
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
    const handler = pageCode.slice(pageCode.indexOf('function onVisibilityChange() {'));
    const body = handler.slice(0, handler.indexOf('\n  }'));

    expect(body, 'hidden must stop the timer').toContain('stopRefresh();');
    expect(body, 'visible must start it again').toContain('startRefresh();');
    // And a tab that is already hidden at mount must not start one.
    expect(pageCode).toContain('if (!document.hidden) startRefresh();');
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
    expect(pageCode).toContain('if (!missedChatWhileHidden) {');
    expect(pageCode).toContain('missedChatWhileHidden = false;');
    expect(pageCode).toContain('void invalidateAll();');

    // The branch that fires the cheap refresh must not also fall through to the wide one.
    const handler = pageCode.slice(pageCode.indexOf('function onVisibilityChange() {'));
    const body = handler.slice(0, handler.indexOf('\n  }'));
    expect(body.split('refreshRoom()')).toHaveLength(2);
    expect(body.split('invalidateAll()')).toHaveLength(2);
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
