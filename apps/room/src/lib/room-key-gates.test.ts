import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  BLOCKED_COPY_KEYS,
  PUSH_TO_TALK_CODE,
  PUSH_TO_TALK_KEY_CODE,
  pushToTalkShouldMute,
  pushToTalkShouldUnmute,
  shouldBlockContextMenu,
  shouldBlockCopyKey,
  shouldDisableSelection
} from './room-key-gates';

/*
  THE TWO CAPTURE READS THAT SAT HERE ARE IN `room-key-gates-capture.test.ts`.

  `app-room.full.js` and `app-room.compiled.js` live under `docs/source`, which is gitignored, and
  they were read at MODULE SCOPE — so `gate/evidence-bound-tests.mjs` excluded all eighteen cases in
  this file on every checkout without the dumps, CI included. Two of the eighteen needed them. The
  sixteen that stayed execute the gates or read `+page.svelte`, `window-handlers.ts` and
  `css/complete-app-styles.css`, and among them is the one that would catch the original defect —
  `is actually wired into the room, not just exported` — coming back.
*/
const APPLIED_CSS = readFileSync(
  new URL('../../css/complete-app-styles.css', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The handler BODIES moved to `RoomWindowHandlers` in Phase 5 slice 18; the bindings stayed on
  `<svelte:window>` in the page. So the page is still where you check that the listener exists, and
  the module is where you check what it does.
*/
const HANDLERS = readFileSync(new URL('./room/window-handlers.ts', import.meta.url), 'utf8');

const CTRL_RIGHT = { code: PUSH_TO_TALK_CODE, key: 'Control' };
const ON = { pushToTalk: true, micMuted: true };

describe('push-to-talk holds the microphone open', () => {
  it('unmutes on keydown when the mic is muted', () => {
    expect(pushToTalkShouldUnmute(CTRL_RIGHT, ON)).toBe(true);
  });

  it('re-mutes on keyup once the mic is live', () => {
    expect(pushToTalkShouldMute(CTRL_RIGHT, { pushToTalk: true, micMuted: false })).toBe(true);
  });

  it('does nothing at all when the preference is off', () => {
    expect(pushToTalkShouldUnmute(CTRL_RIGHT, { pushToTalk: false, micMuted: true })).toBe(false);
    expect(pushToTalkShouldMute(CTRL_RIGHT, { pushToTalk: false, micMuted: false })).toBe(false);
  });

  it('ignores key REPEATS, which would otherwise re-toggle the producer continuously', () => {
    /*
      `!e.repeat` — `app-room.full.js:3013`. Holding a key fires keydown over and over; without this
      term each repeat calls the mic toggle again, closing and reopening the producer many times a
      second for as long as the speaker holds the key.
    */
    expect(pushToTalkShouldUnmute({ ...CTRL_RIGHT, repeat: true }, ON)).toBe(false);
  });

  it('accepts the legacy keyCode as well as the code', () => {
    // `'ControlRight' === e.code || 17 == e.which` — both terms, on both handlers.
    expect(pushToTalkShouldUnmute({ which: PUSH_TO_TALK_KEY_CODE, key: 'Control' }, ON)).toBe(true);
    expect(
      pushToTalkShouldMute(
        { which: PUSH_TO_TALK_KEY_CODE, key: 'Control' },
        { pushToTalk: true, micMuted: false }
      )
    ).toBe(true);
  });

  it('is the RIGHT control key only', () => {
    expect(pushToTalkShouldUnmute({ code: 'ControlLeft', key: 'Control' }, ON)).toBe(false);
  });

  it('leaves a mic the user unmuted themselves alone, in both directions', () => {
    // Already live: holding the key must not toggle it off...
    expect(pushToTalkShouldUnmute(CTRL_RIGHT, { pushToTalk: true, micMuted: false })).toBe(false);
    // ...and releasing must not mute somebody who was never pushing to talk.
    expect(pushToTalkShouldMute(CTRL_RIGHT, { pushToTalk: true, micMuted: true })).toBe(false);
  });
});

describe('disableCopy restricts the audience and never the presenter', () => {
  const MEMBER = { disableCopy: true, isPresenter: false };

  it('blocks Ctrl+C, Ctrl+U and Ctrl+S', () => {
    for (const key of BLOCKED_COPY_KEYS) {
      expect(shouldBlockCopyKey({ key, ctrlKey: true }, MEMBER), `Ctrl+${key}`).toBe(true);
    }
  });

  it('blocks F12 on its own, NOT as a third Ctrl combination', () => {
    /*
      `((e.ctrlKey && [...].includes(...)) || 'F12' === e.key)` — `app-room.full.js:3019`. F12 is the
      second arm of the `||`. Reading it as another Ctrl combination is the obvious misreading and
      would leave devtools open on the one key most people reach for.
    */
    expect(shouldBlockCopyKey({ key: 'F12' }, MEMBER)).toBe(true);
    expect(shouldBlockCopyKey({ key: 'F12', ctrlKey: false }, MEMBER)).toBe(true);
  });

  it('is case-insensitive, so Ctrl+Shift+C is caught too', () => {
    // `e.key.toLowerCase()` — the reference lowercases, so the uppercase key a Shift produces hits.
    expect(shouldBlockCopyKey({ key: 'C', ctrlKey: true }, MEMBER)).toBe(true);
  });

  it('leaves every other keystroke alone', () => {
    expect(shouldBlockCopyKey({ key: 'v', ctrlKey: true }, MEMBER)).toBe(false);
    expect(shouldBlockCopyKey({ key: 'c', ctrlKey: false }, MEMBER)).toBe(false);
    expect(shouldBlockCopyKey({ key: 'F11' }, MEMBER)).toBe(false);
  });

  it('exempts the presenter from all three gates', () => {
    const presenter = { disableCopy: true, isPresenter: true };
    expect(shouldBlockCopyKey({ key: 'c', ctrlKey: true }, presenter)).toBe(false);
    expect(shouldBlockCopyKey({ key: 'F12' }, presenter)).toBe(false);
    expect(shouldBlockContextMenu(presenter)).toBe(false);
    expect(shouldDisableSelection(presenter)).toBe(false);
  });

  it('does nothing when the room setting is off', () => {
    const off = { disableCopy: false, isPresenter: false };
    expect(shouldBlockCopyKey({ key: 'c', ctrlKey: true }, off)).toBe(false);
    expect(shouldBlockContextMenu(off)).toBe(false);
    expect(shouldDisableSelection(off)).toBe(false);
  });

  it('blocks every right-click for a member, not only those over the presentation', () => {
    expect(shouldBlockContextMenu(MEMBER)).toBe(true);
  });

  it('adds noselect, and that class has a rule behind it', () => {
    expect(shouldDisableSelection(MEMBER)).toBe(true);
    // A class with no CSS would close the keyboard path and leave text selectable by drag.
    expect(APPLIED_CSS).toContain('.noselect { user-select: none; }');
  });
});

describe('the gates are wired into the room, not just exported', () => {
  /*
    The two cases that read the reference's own handlers and event bindings are
    `room-key-gates-capture.test.ts`. What is left in this block is the half that can REGRESS: an
    export nothing calls is the original defect wearing a test.
  */
  it('is actually wired into the room, not just exported', () => {
    /*
      The defect being closed: `disableCopy`, `contextmenu` and `noselect` each had ZERO occurrences
      here, so a content-protection checkbox an owner could tick protected nothing. An export
      nothing calls would be the same defect wearing a test.
    */
    expect(HANDLERS).toContain("from '#lib/room-key-gates.js'");
    expect(HANDLERS).toMatch(
      /pushToTalkShouldUnmute\(event, \{\s*pushToTalk: this\.#prefs\.pushToTalk,\s*micMuted: this\.#media\.micMuted\s*\}\)/
    );
    expect(HANDLERS).toMatch(
      /pushToTalkShouldMute\(event, \{\s*pushToTalk: this\.#prefs\.pushToTalk,\s*micMuted: this\.#media\.micMuted\s*\}\)/
    );
    expect(HANDLERS).toMatch(
      /shouldBlockCopyKey\(event, \{\s*disableCopy: this\.#disableCopy\(\),\s*isPresenter: this\.#isPresenter\(\)\s*\}\)/
    );
    expect(HANDLERS).toMatch(
      /shouldBlockContextMenu\(\{\s*disableCopy: this\.#disableCopy\(\),\s*isPresenter: this\.#isPresenter\(\)\s*\}\)/
    );
    // And the page still BINDS them, which is the half the module cannot show.
    expect(PAGE).toContain('onkeydown={(event) => windowHandlers.keyDown(event)}');
    expect(PAGE).toContain('onkeyup={(event) => windowHandlers.keyUp(event)}');
    expect(PAGE).toContain('oncontextmenu={(event) => windowHandlers.contextMenu(event)}');
    expect(PAGE).toContain("document.body.classList.add('noselect')");
    // The setting has to cross the boundary, or every gate above is permanently false.
    expect(PAGE).toContain('data.sessData?.disableCopy === true');
  });
});
