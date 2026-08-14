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
    const gate = pageCode.indexOf('if (visibilityChangeEnabled && !appHasFocus) {');
    const mention = pageCode.indexOf('lastPopupChatId');
    expect(mention, 'the mention popup path must exist').toBeGreaterThan(-1);
    expect(gate, 'the refetch gate must come after the mention path').toBeGreaterThan(mention);
  });
});

describe('and catches up when the tab comes back', () => {
  it('listens for visibilitychange and tracks focus', () => {
    expect(pageCode).toContain(
      "document.addEventListener('visibilitychange', onVisibilityChange);"
    );
    expect(pageCode).toContain('appHasFocus = false;');
    expect(pageCode).toContain('appHasFocus = true;');
  });

  it('removes the listener, because a detached one holds the page alive', () => {
    expect(pageCode).toContain(
      "return () => document.removeEventListener('visibilitychange', onVisibilityChange);"
    );
  });

  it('refetches ONCE, and only when something was missed', () => {
    /*
      `appHasFocusGetChatLog`. One refetch rather than a replay, because the load already returns
      the newest page per channel — the room re-reads itself and is current. And only when something
      arrived: returning to a tab where nothing happened should cost nothing.
    */
    expect(pageCode).toContain('if (!missedChatWhileHidden) return;');
    expect(pageCode).toContain('missedChatWhileHidden = false;');
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
