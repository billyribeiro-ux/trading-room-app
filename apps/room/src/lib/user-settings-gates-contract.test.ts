import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * USM-14 and USM-15 — the two gates the user-settings modal was missing, and the two it already had.
 *
 * ```js
 * O(18,  isPresenter && !isLimitedPresenter ? 18  : -1)   // Presenter Settings TAB    byte 2,283,408
 * O(292, isPresenter && !isLimitedPresenter ? 292 : -1)   // …and its PANE             byte 2,288,469
 * O(132, globals.hasSpeechRecognition ? 132 : -1)         // both captions blocks      byte 2,285,653
 * O(290, isPresenter && !isLimitedPresenter ? 290 : -1)   // Group Chat Control (USM-04)
 * O(135, isPresenter ? 135 : -1)                          // three buttons     (USM-05)
 * ```
 *
 * ## They are two different kinds of defect and the file says which is which
 *
 * **USM-14 is authority.** A limited presenter — somebody handed mic and screen at runtime — was
 * getting the whole Presenter Settings tab. `giveMicScreen` hands over the ability to SPEAK, and the
 * same narrowing was already applied two tabs away on the user card and on Group Chat Control, so
 * this was the one place the pair had been dropped.
 *
 * **USM-15 is a control that could not work.** The room already refuses at runtime —
 * `RoomRecording.beginSpeechRecognition`, pinned by `speech-reco-entitlement.test.ts` — so what the
 * ungated blocks drew was a checkbox a member could tick, that then said `Enabled`, and that
 * captioned nothing. A control whose only effect is changing its own label, which `CLAUDE.md` names
 * outright.
 *
 * USM-04 and USM-05 were found ALREADY BUILT when this file was written, and both are asserted here
 * anyway: they are the same five-gate block, and a test that covers three of five leaves the other
 * two to be discovered by a user.
 */

const MODAL_PATH = 'src/lib/components/ModalHost.svelte';

/** Comments stripped: this file's own prose quotes every gate it asserts. */
const modal = () => codeOf(MODAL_PATH, readFileSync(MODAL_PATH, 'utf8'));

/**
 * The Svelte block opened at `opening`, up to its MATCHING `{/…}` — never a fixed window and never
 * a bare `indexOf`. `session-control-audience-contract.test.ts` records why, at length: three
 * assertions in this repository have claimed nesting and measured order.
 */
const blockAt = (source: string, opening: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  let depth = 0;
  let cursor = from;
  while (cursor < source.length) {
    const open = source.indexOf('{#', cursor);
    const close = source.indexOf('{/', cursor);
    expect(close, `\`${opening}\` is never closed`).toBeGreaterThan(-1);
    if (open > -1 && open < close) {
      depth += 1;
      cursor = open + 2;
      continue;
    }
    depth -= 1;
    if (depth === 0) return source.slice(from, source.indexOf('}', close) + 1);
    cursor = close + 2;
  }
  throw new Error(`\`${opening}\` is never closed`);
};

/** Every `{#if …}` in the file that encloses `marker`, innermost last. */
const gatesAround = (source: string, marker: string) => {
  const at = source.indexOf(marker);
  expect(at, `${marker} must be rendered`).toBeGreaterThan(-1);
  const enclosing: string[] = [];
  for (const found of source.matchAll(/\{#if ([^}]+)\}/g)) {
    const block = blockAt(source, found[0]);
    if (found.index < at && found.index + block.length > at) enclosing.push(found[1]);
  }
  return enclosing;
};

describe('USM-14 — the Presenter Settings tab and pane exclude a LIMITED presenter', () => {
  it('narrows the tab header', () => {
    expect(gatesAround(modal(), 'id="presenter-settings-tab"')).toContain(
      'isPresenter && !isLimitedPresenter'
    );
  });

  it('narrows the pane, which the reference gates separately', () => {
    expect(gatesAround(modal(), 'id="presenter-settings"\n')).toContain(
      'isPresenter && !isLimitedPresenter'
    );
  });

  it('and neither is left on plain isPresenter', () => {
    /*
      The assertion that would have caught the original: `{#if isPresenter}` around either of these
      satisfies "is it gated" and is exactly what was wrong. Both terms, or neither.
    */
    for (const marker of ['id="presenter-settings-tab"', 'id="presenter-settings"\n']) {
      expect(gatesAround(modal(), marker), marker).not.toContain('isPresenter');
    }
  });
});

describe('USM-15 — the closed-captions controls exist only where captions can run', () => {
  it('gates the viewer overlay block', () => {
    expect(gatesAround(modal(), 'id="appSpeechRecoOverlay"')).toContain('captionsAvailable');
  });

  it('gates the presenter block', () => {
    expect(gatesAround(modal(), 'id="presenterSpeechRecognition"')).toContain('captionsAvailable');
  });

  it('reads the ROOM entitlement rather than re-deriving it', () => {
    /*
      `!== true` — absent means NOT disabled — is `RoomGates.speechRecognitionAvailable`'s rule, and
      it is the same getter `RoomRecording.beginSpeechRecognition` refuses on. Re-deriving it in a
      component is how the drawn control and the running feature come to disagree.
    */
    expect(readFileSync('src/routes/+page.svelte', 'utf8')).toContain(
      'captionsAvailable={gates.speechRecognitionAvailable}'
    );
    expect(readFileSync('src/lib/room/gates.ts', 'utf8')).toContain(
      'hasSpeechRecognitionDisabled !== true'
    );
  });
});

describe('USM-04 and USM-05 — the two gates that were already here', () => {
  it('keeps Group Chat Control away from a limited presenter', () => {
    expect(gatesAround(modal(), 'id="groupChatControl"')).toContain(
      'isPresenter && !isLimitedPresenter'
    );
  });

  it('keeps the three presenter buttons presenter-only', () => {
    for (const marker of ['remove-preview-windows', 'mute-all-non-admins', 'get-my-token']) {
      expect(gatesAround(modal(), marker), marker).toContain('isPresenter');
    }
  });

  it('and leaves Edit my Info and Avatar for everybody, which is const 135 s whole point', () => {
    /*
      The negative control on the row above: `O(135, …)` holds exactly three buttons and the const
      immediately after it is the unconditional one. Wrapping all four — which is what this room did
      before — passes any "are they gated" check and takes a control away from every member.
    */
    expect(gatesAround(modal(), "onUserAction('edit-my-info'")).not.toContain('isPresenter');
  });
});
