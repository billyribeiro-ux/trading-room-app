import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The two assertions about the reference ROOM component, split out of `room-key-gates.test.ts` on
 * 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `room-key-gates.test.ts` holds eighteen cases and closes a real defect: `disableCopy`,
 * `contextmenu` and `noselect` each had ZERO occurrences in this application, so *"a
 * content-protection checkbox an owner could tick protected nothing"*. Sixteen of those cases
 * execute the gate functions or read `+page.svelte`, `window-handlers.ts` and
 * `css/complete-app-styles.css` — all committed. Two read `docs/source/components/app-room.full.js`
 * and `app-room.compiled.js`, at MODULE SCOPE, so `gate/evidence-bound-tests.mjs` excluded all
 * eighteen from every checkout without the dumps. That is this container, and it is CI.
 *
 * ## What is here, and what deliberately is not
 *
 * The two transcription cases. The third case in the same block — `is actually wired into the room,
 * not just exported` — stays in the free file, because it reads `window-handlers.ts` and is the one
 * that would catch the original defect coming back. Splitting on the FILE each case reads, rather
 * than on the `describe` it sits in, is what keeps that one in the run.
 */

const ROOM_FULL = readFileSync(
  new URL('../../docs/source/components/app-room.full.js', import.meta.url),
  'utf8'
);
const ROOM_COMPILED = readFileSync(
  new URL('../../docs/source/components/app-room.compiled.js', import.meta.url),
  'utf8'
);

/*
  Whitespace removed, so a hand-formatted expectation here can be compared against the reference's
  own minified text as one string — the same helper, spelled the same way, as the file this was
  split from.
*/
const compact = (source: string) => source.replace(/\s+/g, '');

describe('it is the reference\u2019s handlers, bound to the reference\u2019s events', () => {
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
});
