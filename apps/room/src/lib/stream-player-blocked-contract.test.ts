import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEAD_PREFERENCE_KEYS } from './dead-preference-keys.js';

/**
 * The Stream Player pane is HONESTLY inert, and this is what keeps it honest.
 *
 * ## What it was
 *
 * `SC-04` in `docs/decoded/room-surface-audit-2026-08-30.md`: Enable / Disable Stream Player flipped
 * a local `streamPlayerEnabled` and wrote `onPreferenceChange('streamingPlayerEnabled', …)` — a key
 * in that presenter's own settings blob, read by nothing in the repository. The status line went
 * green and nothing else in the world changed. Same level error as the chat-mode radio and the
 * presenter colour pickers: a room-level presenter act modelled as a per-user preference.
 *
 * ## Why it is not wired, which is a MEASUREMENT and not a decision to defer
 *
 * The reference does not compose the player's state or its link. It asks its server:
 *
 * ```js
 * getPlayerLink() {
 *   let i = yield this.appService.invokeAdminCmd("streamStatus");   // byte 2,170,505
 *   this.streamingPlayerEnabled = i.rc.enablePlayer;
 *   this.streamingLinkPlayer    = i.rc.playerURL
 * }
 * ```
 *
 * `playerURL` arrives from a server that is not in the capture. What the feature IS, from the pane's
 * own blurb, is a public page that renders one room's screenshares to whoever holds a link — so
 * building it means minting a media grant for an anonymous viewer of a multi-tenant fintech room.
 * That is an authority decision, and `CLAUDE.md`'s rule is that those are made on the server from
 * data the server owns. There is no such data here, so there is nothing to reproduce and inventing
 * one is out of the question. `SC-05` (the Player Link readout and its Copy button) is blocked by
 * the same absent value.
 *
 * ## What this file therefore asserts
 *
 * Not that a feature works — it does not exist. That the pane cannot quietly go back to LOOKING like
 * it works: no preference write, no local flag that only changes its own label, the buttons
 * genuinely disabled, and the reason on the screen where the presenter is.
 */

const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
/*
  Comments stripped first. The docblock in the component quotes the very call it is recording the
  removal of, so a `not.toContain` over the raw file would be red for a defect that is fixed — the
  same trap `presenter-colors-contract.test.ts` records.
*/
const modalCode = MODAL.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

describe('the Stream Player pane', () => {
  it('is still drawn, because the reference draws it', () => {
    /*
      Removed rather than disabled would be its own defect: a presenter told the tool is unavailable
      is better served than one who cannot find where it went, and the tab is the reference's.
    */
    expect(modalCode).toContain("'stream-player', 'Stream Player'");
    expect(modalCode).toContain('Enable Stream Player');
    expect(modalCode).toContain('Disable Stream Player');
  });

  it('writes no preference and holds no flag that only changes its own label', () => {
    expect(modalCode).not.toContain('streamingPlayerEnabled');
    expect(modalCode).not.toContain('streamPlayerEnabled');
  });

  it('has both buttons genuinely disabled, not merely styled as if', () => {
    const enable = modalCode.indexOf('Enable Stream Player');
    const disable = modalCode.indexOf('Disable Stream Player');
    expect(enable, 'the Enable button must exist').toBeGreaterThan(-1);
    expect(disable, 'the Disable button must exist').toBeGreaterThan(-1);
    /*
      Read BACKWARDS from each label to the `<button` that opens it, so the assertion is about that
      button's own attributes rather than about any `disabled` that happens to appear nearby. A
      forward slice would have passed on the neighbouring pane's markup.
    */
    for (const [label, at] of [
      ['Enable', enable],
      ['Disable', disable]
    ] as const) {
      const opensAt = modalCode.lastIndexOf('<button', at);
      expect(opensAt, `${label}: its <button> must open before its label`).toBeGreaterThan(-1);
      expect(modalCode.slice(opensAt, at), `${label} is not disabled`).toContain('disabled');
    }
  });

  it('says why, on the screen, rather than only in a comment', () => {
    /*
      The whole point. A disabled button with no explanation is a bug report from the presenter.
    */
    expect(modalCode).toContain('The stream player is not available in this deployment');
  });

  it('retires the key it used to write, so the copies already out there are pruned', () => {
    /*
      The LIST and not `isDeadPreferenceKey`, deliberately. That predicate is on
      `dead-export-contract.test.ts`'s UNREAD register with a recorded reason — nothing in production
      calls it — and reaching for it here to make an assertion read prettily would have deleted that
      entry and quietly told the next reader it had gained a real caller. The list is what
      `pruneDeadPreferenceKeys` iterates, which is the thing that actually removes the stale copies.
    */
    expect(DEAD_PREFERENCE_KEYS).toContain('streamingPlayerEnabled');
  });
});
