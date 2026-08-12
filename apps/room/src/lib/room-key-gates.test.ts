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

const ROOM_FULL = readFileSync(
  new URL('../../docs/source/components/app-room.full.js', import.meta.url),
  'utf8'
);
const ROOM_COMPILED = readFileSync(
  new URL('../../docs/source/components/app-room.compiled.js', import.meta.url),
  'utf8'
);
const APPLIED_CSS = readFileSync(
  new URL('../../css/complete-app-styles.css', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const compact = (source: string) => source.replace(/\s+/g, '');

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

describe('it is the reference’s handlers, bound to the reference’s events', () => {
  it('matches onKeyDown, onRightClick and onKeyUp', () => {
    const source = compact(ROOM_FULL);
    // Push-to-talk, keydown — `:3012-3016`.
    expect(source).toContain(
      "this.appService.globals.preferences.pushToTalk&&!e.repeat&&('ControlRight'===e.code||17==e.which)&&this.mediaService.micMuted&&this.toggleMic()"
    );
    // disableCopy, keydown — `:3017-3020`.
    expect(source).toContain(
      "!this.appService.globals.isPresenter&&this.appService.globals.sessData.disableCopy&&((e.ctrlKey&&['c','u','s'].includes(e.key.toLowerCase()))||'F12'===e.key)&&e.preventDefault()"
    );
    // Right-click — `:3022-3026`.
    expect(source).toContain(
      'onRightClick(e){!this.appService.globals.isPresenter&&this.appService.globals.sessData.disableCopy&&e.preventDefault();}'
    );
    // Push-to-talk, keyup — `:3028-3031`.
    expect(source).toContain(
      "onKeyUp(e){this.appService.globals.preferences.pushToTalk&&('ControlRight'===e.code||17==e.which)&&!this.mediaService.micMuted&&this.toggleMic();}"
    );
    // `noselect` in ngAfterViewInit — `:2227-2229`.
    expect(source).toContain(
      "!this.appService.globals.isPresenter&&this.appService.globals.sessData.disableCopy&&document.body.classList.add('noselect')"
    );
  });

  it('binds them to keydown, contextmenu and keyup', () => {
    // `app-room.compiled.js:1260-1281`.
    const source = compact(ROOM_COMPILED);
    expect(source).toContain("('keydown',function(r){returno.onKeyDown(r);}");
    expect(source).toContain("('contextmenu',function(r){returno.onRightClick(r);}");
    expect(source).toContain("('keyup',function(r){returno.onKeyUp(r);}");
  });

  it('is actually wired into the room, not just exported', () => {
    /*
      The defect being closed: `disableCopy`, `contextmenu` and `noselect` each had ZERO occurrences
      here, so a content-protection checkbox an owner could tick protected nothing. An export
      nothing calls would be the same defect wearing a test.
    */
    expect(PAGE).toContain("from '$lib/room-key-gates'");
    expect(PAGE).toContain('pushToTalkShouldUnmute(event, { pushToTalk, micMuted })');
    expect(PAGE).toContain('pushToTalkShouldMute(event, { pushToTalk, micMuted })');
    expect(PAGE).toContain('shouldBlockCopyKey(event, { disableCopy, isPresenter })');
    expect(PAGE).toContain('shouldBlockContextMenu({ disableCopy, isPresenter })');
    expect(PAGE).toContain("document.body.classList.add('noselect')");
    // The setting has to cross the boundary, or every gate above is permanently false.
    expect(PAGE).toContain('data.sessData?.disableCopy === true');
  });
});
