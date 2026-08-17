import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The two sticky media-reconnect toasts, pinned against the reference's own room bundle.
 *
 * Reported by the owner 2026-08-12 with the rendered markup:
 *
 * ```html
 * <div class="toast-title" aria-label="Media"> Media </div>
 * <div role="alert" class="toast-message">Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i></div>
 * ```
 *
 * `docs/source/main.d6d3c112b59b7d0d.js` carries the call that produces it, inside the mediasoup
 * socket's `disconnect` handler, and a second one beside it. Both are read out of that file below
 * rather than transcribed here, so this test and the implementation are checked against the same
 * bytes.
 *
 * These are DISTINCT from the `mediaServerConnected`/`mediaServerDisconnected` bus toasts the room
 * already had. The reference raises both — its bundle still contains "Connected to Media Server" and
 * "Disconnected from Media Server" — so adding these replaced nothing.
 */

const cwd = process.cwd();
const BUNDLE = readFileSync(resolve(cwd, 'docs/source/main.d6d3c112b59b7d0d.js'), 'utf8');
/*
  TWO SOURCE CONSTANTS since 2026-08-16, because this control is split across two files and saying
  so is the point.

  The QUEUE — how a toast is raised, whether it expires, what `show` hands back — moved to
  `RoomToasts` in Phase 5 slice 1. What RAISES these two particular toasts moved in slice 4: they
  are raised by `mediaServerDisconnected` and cleared by `mediaServerConnected`, and both are media
  transport, so both are now `RoomMediaTransport.serverDisconnected` / `.serverConnected`.

  The block that stood here until then said they "stay in the page until slice 4", and the
  re-pointing below is that sentence coming due rather than a new decision. It was found by the
  test failing with its own message — "`mediaServerConnected` has left the page, re-point this at
  the file that owns it" — which is the whole reason that message was written into the assertion.

  So each assertion below points at the file that owns its subject, and the hand-off between them is
  asserted as well rather than assumed. A caller invoking a method the class does not define, or a
  class whose method nothing calls, would otherwise pass every individual expectation here.
*/
const TRANSPORT = readFileSync(resolve(cwd, 'src/lib/room/media-transport.svelte.ts'), 'utf8');
const TOASTS = readFileSync(resolve(cwd, 'src/lib/room/toasts.svelte.ts'), 'utf8');

/* Comments stripped: the page quotes the bundle in its own docblock, and a test reading the raw
   source would match that quotation with the implementation deleted. */
const stripComments = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const code = stripComments(TRANSPORT);
const queue = stripComments(TOASTS);

describe('the bundle still says what this was built from', () => {
  it('raises both toasts in the disconnect handler', () => {
    // If either disappears upstream, every expectation below is describing something gone.
    expect(BUNDLE).toContain('Reconnecting to media...');
    expect(BUNDLE).toContain('Reconnecting media (presenter)... re-sharing mic/cam/screen');
  });

  it('still carries the older bus toasts too, so these are additions', () => {
    expect(BUNDLE).toContain('Connected to Media Server');
    expect(BUNDLE).toContain('Disconnected from Media Server');
    expect(code).toContain("message: 'Disconnected from Media Server... reconnecting...'");
  });
});

describe('the member toast matches the captured call', () => {
  it('uses the message, title and icon the bundle passes', () => {
    // Read from the bundle: toastr.info('<message>', "Media", {...}).
    const at = BUNDLE.indexOf('Reconnecting to media...');
    const call = BUNDLE.slice(at - 40, at + 260);
    expect(call).toContain('toastr.info');
    expect(call).toContain('"Media"');
    expect(call).toContain('<i class="fas fa-cog fa-spin ms-2"></i>');

    expect(code).toContain("title: 'Media'");
    expect(code).toContain(
      'message: \'Reconnecting to media... <i class="fas fa-cog fa-spin ms-2"></i>\''
    );
  });

  it('renders as HTML, because the icon is markup', () => {
    // `enableHtml: !0` in the call. Without it the visitor reads the tag as text.
    const at = BUNDLE.indexOf('Reconnecting to media...');
    expect(BUNDLE.slice(at, at + 220)).toContain('enableHtml');
    const ours = code.slice(code.indexOf("title: 'Media'"), code.indexOf("title: 'Media'") + 300);
    expect(ours).toContain('enableHtml: true');
  });

  it('never expires, and is raised at most once', () => {
    /*
      `disableTimeOut: !0` and the `i.reconnectToast || (…)` guard. A banner that says "reconnecting"
      must not clear itself while the thing is still disconnected, and the backoff climbs to one
      redial every 30s — without the guard each attempt would stack another.
    */
    const at = BUNDLE.indexOf('Reconnecting to media...');
    expect(BUNDLE.slice(at, at + 220)).toContain('disableTimeOut');
    expect(code).toContain('if (this.#reconnectToastId === null)');
    // `0` is this room's spelling of `disableTimeOut` — see `RoomToasts.show`.
    const raise = code.slice(code.indexOf("title: 'Media'"));
    expect(raise.slice(0, 400)).toMatch(/\n\s*0\n\s*\)/);
  });
});

describe('the presenter toast matches, including being undismissable', () => {
  it('is raised only when this peer holds a live track', () => {
    // `(i.liveMicTrack || i.liveCamTrack || i.liveScreenTrack) && !i.presenterReconnectToast`.
    const at = BUNDLE.indexOf('Reconnecting media (presenter)');
    expect(BUNDLE.slice(at - 220, at)).toContain('liveMicTrack');
    expect(code).toContain('const holdsLiveTrack = Boolean(');
    expect(code).toContain(
      'this.#localMicProducerId || this.#webcamStream || this.#localScreenStreams.size > 0'
    );
    expect(code).toContain('if (holdsLiveTrack && this.#presenterReconnectToastId === null)');
  });

  it('carries the Presenter title and plain text', () => {
    const at = BUNDLE.indexOf('Reconnecting media (presenter)');
    expect(BUNDLE.slice(at, at + 200)).toContain('"Presenter"');
    expect(code).toContain("title: 'Presenter'");
    expect(code).toContain(
      "message: 'Reconnecting media (presenter)... re-sharing mic/cam/screen'"
    );
    // No markup in this one, so no HTML rendering.
    const ours = code.slice(code.indexOf("title: 'Presenter'"));
    expect(ours.slice(0, 250)).toContain('enableHtml: false');
  });

  it('the reference makes it undismissable where the member one is not', () => {
    /*
      `tapToDismiss: !1, closeButton: !1` on this one against `!0, !0` on the member's. Recorded as
      an asymmetry that is deliberate upstream: a presenter whose mic is being re-shared needs to
      know it, and it goes when the re-share finishes rather than when they click.
    */
    const at = BUNDLE.indexOf('Reconnecting media (presenter)');
    const call = BUNDLE.slice(at, at + 200);
    expect(call).toContain('tapToDismiss:!1');
    expect(call).toContain('closeButton:!1');
  });
});

describe('both are cleared by the event that makes them false', () => {
  it('clears on connect, not on a timer', () => {
    /*
      The reference clears them inline in the socket's `connect` handler, beside
      `emit("mediaServerConnected")`. Its own `clearReconnectToasts()` duplicates that body and is
      never called from anywhere in the bundle — dead code upstream, so there is no second path.
    */
    expect(BUNDLE).toContain('clearReconnectToasts()');
    // Defined once, and that once is the definition itself.
    expect((BUNDLE.match(/clearReconnectToasts/g) ?? []).length).toBe(1);

    /*
      Anchored on the DECLARATION, not on the first mention. `connect` wires
      `signalling.on('socketopen', … => this.serverConnected(reconnected))` two hundred lines above
      the method itself since slice 26, so `indexOf` found the CALL and sliced a region that never
      contained the dismissals.
    */
    const at = code.indexOf('\n  serverConnected(');
    // Positive first: a slice that moves this handler must fail here rather than slicing from -1
    // and asserting against the whole rest of the file, which is how `chat-mode-contract` went
    // green against an end marker that had ceased to exist.
    expect(
      at,
      'serverConnected has left the transport - re-point this at the file that owns it'
    ).toBeGreaterThan(-1);

    /*
      Sliced to the HANDLER, not to the rest of the file. `serverConnected` sits beside `connect`
      since slice 26, and an open-ended slice from it now runs through 200 lines of wiring — which
      would pass on any `dismiss` call anywhere below it.
    */
    const connected = code.slice(at, code.indexOf('\n  }', at));
    expect(connected.slice(0, 700)).toContain('this.#toasts.dismiss(this.#reconnectToastId)');
    expect(connected.slice(0, 700)).toContain(
      'this.#toasts.dismiss(this.#presenterReconnectToastId)'
    );
    expect(connected.slice(0, 700)).toContain('this.#reconnectToastId = null');
    expect(connected.slice(0, 700)).toContain('this.#presenterReconnectToastId = null');
  });

  it('a sticky toast is never handed to the removal timer', () => {
    // `show` schedules removal only for a positive timeout; 0 means it stays until cleared.
    // The rule lives with the queue now, so it is read from the queue.
    expect(queue).toContain('if (timeOut > 0) this.#scheduleRemoval(id, timeOut)');
  });

  it('show returns the id, or the sticky ones could never be cleared', () => {
    expect(queue).toMatch(/show\([^)]*\): number \| null/);
    expect(queue).toContain('return id;');
  });

  it('the two halves are actually joined', () => {
    /*
      THE HAND-OFF, asserted rather than assumed, and it is the assertion the split made possible.

      Every expectation above is satisfied by a page that calls a method nobody defines, or by a
      class whose method nobody calls. Neither would raise a toast in a real room. Checking that the
      name the page uses is the name the class exports is cheap and is exactly the defect a
      re-pointed constant would otherwise hide - `presenterCommand` was posted to a removed action
      for three commits on precisely this shape.
    */
    // THREE files now, so the chain is asserted link by link: the page builds the queue, hands it
    // to the transport, and the transport calls methods the queue actually defines.
    // `new RoomToasts()` moved to the composition root in S7 (it was on the page).
    const root = stripComments(
      readFileSync(resolve(cwd, 'src/lib/room/create-room.svelte.ts'), 'utf8')
    );
    expect(root, 'the root no longer constructs the queue it dismisses toasts on').toContain(
      'new RoomToasts()'
    );
    expect(root, 'the root no longer hands the queue to the transport').toMatch(
      /new RoomMediaTransport\(\{[^}]*\btoasts\b/
    );
    expect(code, 'the transport no longer receives a queue').toContain('toasts: RoomToasts;');
    for (const method of ['dismiss(', 'show(', 'dismissMatching(']) {
      expect(queue, `RoomToasts does not define ${method}`).toContain(`  ${method}`);
    }
  });
});
