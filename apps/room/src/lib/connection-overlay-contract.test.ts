import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * G03 and G09 — the two things a member is told when the room stops working, and was not.
 *
 * Both are the same failure shape and it is the one this repository names first: something breaks,
 * the code notices, and the person it happened to is not told. G03 built the "it came back" flash
 * and not the "it is down" overlay. G09 caught a rejected `play()` and wrote a `console.warn`.
 *
 * Source assertions rather than renders, and the reason differs per row. G03's element is inside
 * `RoomOverlays`, whose render needs a whole room's props; what can regress is the GATE, and a gate
 * is a piece of source. G09's is a `.catch` on an `HTMLAudioElement.play()` — reproducible only by
 * making a real element's play() reject, which jsdom does not implement at all.
 */

const OVERLAYS = readFileSync(new URL('./components/RoomOverlays.svelte', import.meta.url), 'utf8');
const TRANSPORT = readFileSync(
  new URL('./room/media-transport.svelte.ts', import.meta.url),
  'utf8'
);

/** Comments stripped: this file's own citations quote every string it asserts on. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const overlays = code(OVERLAYS);
const transport = code(TRANSPORT);

describe('G03 — the room says when the chat connection is DOWN', () => {
  it('renders const 9 gated on the connection, which had no counterpart at all', () => {
    /*
      ```js
      function iRe(t,n){ 1&t && (d(0,"div",9), T(1,"i",37), v(2," Reconnecting Chat... "), u()) }
      O(7, o.appService.globals.socketConnected ? -1 : 7)        // byte 2,548,292
      ```
    */
    expect(overlays).toContain('{#if !roomEvents.connected}');
    expect(overlays).toContain('<div class="notConnectedOverlay animated fadeIn">');
    expect(overlays).toContain('<i class="fas fa-cog fa-spin"></i>');
  });

  it('keeps the literal spaces around the sentence, as an expression', () => {
    /* Svelte normalises whitespace at element boundaries; ` Reconnecting Chat... ` has both. */
    expect(overlays).toContain("{' Reconnecting Chat... '}");
  });

  it('leaves the SUCCESS flash exactly as it was — two elements, not one repurposed', () => {
    /*
      Const 10 is a different element with its own id, and it stays. The failure this guards is the
      tempting one: making a single element say both things and toggling its text, which loses the
      three-second timing the flash has and the flash has alone.
    */
    expect(overlays).toContain('id="connectedMsg"');
    expect(overlays).toContain('roomEvents.reconnectedFlash');
    expect(overlays.match(/notConnectedOverlay/g)).toHaveLength(2);
  });
});

describe('G09 — a blocked autoplay reaches the member', () => {
  it('raises the reference s own sentence', () => {
    /* `bootbox.alert("Your browser needs your OK to play the room's audio", …)`, byte 2,515,092. */
    expect(transport).toContain(
      'export const AUTOPLAY_BLOCKED_ALERT = "Your browser needs your OK to play the room\'s audio"'
    );
    expect(transport).toContain('this.#dialogs.alertThen(AUTOPLAY_BLOCKED_ALERT');
  });

  it('retries on the DISMISSAL, because the OK is the gesture', () => {
    /*
      This is the whole mechanism. Chrome refuses audible autoplay without a user gesture, so
      `play()` called again on a timer is refused again; the dialog's OK is the gesture that makes
      the retry legal. `alertThen` is the only API here that carries a dismissal callback, and its
      own docblock records why `confirm()` was not reused for this shape.
    */
    const at = transport.indexOf('alertThen(AUTOPLAY_BLOCKED_ALERT');
    expect(at, 'the dialog is not raised').toBeGreaterThan(-1);
    const callback = transport.slice(at, at + 600);
    expect(callback).toContain('for (const blocked of this.#autoplayBlocked)');
    expect(callback).toContain('blocked.play()');
  });

  it('raises ONE dialog for a room full of blocked microphones', () => {
    /*
      Ours, and recorded at the code: upstream opens `bootbox.hideAll()` and re-raises per failing
      producer, so four open microphones show the same sentence four times and clear whatever else
      the member was reading. One gesture satisfies all of them, so one dialog asks for it.
    */
    expect(transport).toContain('if (this.#autoplayPromptOpen) return;');
    expect(transport).toContain('this.#autoplayPromptOpen = true;');
    /* And it is released on dismissal, or the next genuine failure could never ask again. */
    expect(transport).toContain('this.#autoplayPromptOpen = false;');
  });

  it('still logs, because the console line is what a developer reads', () => {
    expect(transport).toContain('could not play');
  });
});
