import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUND_EFFECT_SOURCES } from './sound-effects';

const appAlertsSource = readFileSync(
  new URL('../../docs/source/components/app-alerts.full.js', import.meta.url),
  'utf8'
);
const mainBundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const toastHost = readFileSync(new URL('./components/ToastHost.svelte', import.meta.url), 'utf8');
const sourceCss = readFileSync(
  new URL('../../css/complete-app-styles.css', import.meta.url),
  'utf8'
);

describe('alert and sound source contract', () => {
  it('retains the exact alert event gates and warning-toast call', () => {
    expect(appAlertsSource).toContain("appEventBus.subscribe('alertMsg'");
    expect(appAlertsSource).toContain('!e.nonTradeAlert');
    expect(appAlertsSource).toContain('this.soundEffectsService.cash.play()');
    expect(appAlertsSource).toContain('this.soundEffectsService.nonTradeAlert.play()');
    expect(appAlertsSource).toContain('this.alertService.warning(e.txt, o');
    expect(appAlertsSource).toContain('enableHtml: !0');
  });

  it('uses the singleton global host and SSOT warning skin', () => {
    /*
      Both containers are ngx-toastr's, built imperatively rather than from a template — the outer
      one at bundle byte 878,628 (`classList.add("overlay-container")`,
      `setAttribute("aria-live","polite")`) and the inner at 879,514 (`o.id = "toast-container"`,
      then the position class and `"toast-container"`).
    */
    expect(toastHost).toContain('<div class="overlay-container" aria-live="polite">');
    expect(toastHost).toContain('id="toast-container" class="toast-top-right toast-container"');
    expect(sourceCss).toContain('.toast-warning {');
    expect(sourceCss).toContain('background-color: rgb(248, 148, 6)');
  });

  it('matches every decoded sound mapping', () => {
    for (const [name, sources] of Object.entries(SOUND_EFFECT_SOURCES)) {
      expect(sources.length, name).toBeGreaterThan(0);
      for (const source of sources) {
        expect(existsSync(new URL(`../../static${source}`, import.meta.url)), source).toBe(true);
        expect(mainBundle, `${name}:${source}`).toContain(source.slice(1));
      }
    }
  });
});

/*
  The chat ding — `app-chat.compiled.js:112-137`.

  Three things it is easy to get wrong, and each is pinned below. Read as source text: the dispatch
  needs an EventSource, a room config and a live SSE frame to execute.
*/
describe('the sound on an incoming chat message', () => {
  const events = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
  /*
    The ROUTER, not the page: the chat channel's ding moved with `subscribeToRoomEvents` in
    Phase 5 slice 5, and so did the `senderId` guard above it that makes it unreachable for your
    own post. Both assertions below depend on their relative ORDER, so they have to read one file.
  */
  const code = events.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /*
    The end marker is searched FROM the start position, not from the beginning of the file.

    The first version used a bare `indexOf('void invalidateAll()')`, which matches an EARLIER call
    elsewhere in the dispatch — so the slice came out empty and three assertions failed against
    code that was correct. A test that slices source has to anchor both ends.
  */
  const start = code.indexOf("payload.channel === 'chat' && !this.#prefs.doNotDisturbOn");
  expect(start, 'the chat-sound gate must exist in the module').toBeGreaterThan(-1);
  const block = code.slice(start, code.indexOf('void invalidateAll()', start));

  it('is gated on do-not-disturb AND the chat-sound preference', () => {
    // The reference's outer condition, both halves. Dropping either makes the room noisy for
    // somebody who explicitly asked it not to be.
    expect(block).toContain('!this.#prefs.doNotDisturbOn && this.#prefs.chatSoundOn');
  });

  it('delegates the three-way selection and plays the selected sound once', () => {
    /*
      The naming is the reference's and it is genuinely confusing: the sound file called `followed`
      is what the ROOM-WIDE ding uses, while an explicitly followed user gets `pling`. Swapping
      them is the obvious mistake and nothing else would catch it.
    */
    expect(block).toContain('const sound = arrivalSoundFor({');
    expect(block).toContain('if (sound) playSoundEffect(sound);');
  });

  it('passes every authority input to the pure selector', () => {
    expect(block).toContain('followedSenderPlaysSound:');
    expect(block).toContain('?.followChatStyle?.playSound === true');
    expect(block).toContain(
      'dingOnNewMessage: this.#session().sessData?.dingOnNewMessage === true'
    );
    expect(block).toContain('chatSoundForEmailHashes: this.#session().chatSoundForEmailHashes');
  });

  it('never fires for your own message', () => {
    // The reference compares `hashEmail(user.email) !== e.avt`. Here the senderId guard above the
    // block already returns, so the sound is unreachable for your own post.
    const dispatch = code.slice(code.indexOf('payload.data?.senderId === this.#session().user.id'));
    expect(dispatch.indexOf('return;')).toBeLessThan(
      dispatch.indexOf("payload.channel === 'chat'")
    );
  });
});
