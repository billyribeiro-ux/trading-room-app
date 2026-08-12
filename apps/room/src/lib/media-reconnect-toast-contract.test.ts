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
const PAGE = readFileSync(resolve(cwd, 'src/routes/+page.svelte'), 'utf8');

/* Comments stripped: the page quotes the bundle in its own docblock, and a test reading the raw
   source would match that quotation with the implementation deleted. */
const code = PAGE.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

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
    expect(code).toContain('if (reconnectToastId === null)');
    // `0` is this room's spelling of `disableTimeOut` — see `showToast`.
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
    expect(code).toContain('localMicProducerId || webcamStream || localScreenStreams.size > 0');
    expect(code).toContain('if (holdsLiveTrack && presenterReconnectToastId === null)');
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

    const connected = code.slice(code.indexOf('function mediaServerConnected'));
    expect(connected.slice(0, 700)).toContain('dismissToast(reconnectToastId)');
    expect(connected.slice(0, 700)).toContain('dismissToast(presenterReconnectToastId)');
    expect(connected.slice(0, 700)).toContain('reconnectToastId = null');
    expect(connected.slice(0, 700)).toContain('presenterReconnectToastId = null');
  });

  it('a sticky toast is never handed to the removal timer', () => {
    // `showToast` schedules removal only for a positive timeout; 0 means it stays until cleared.
    expect(code).toContain('if (timeOut > 0) scheduleToastRemoval(id, timeOut)');
  });

  it('showToast returns the id, or the sticky ones could never be cleared', () => {
    expect(code).toMatch(/function showToast\([^)]*\): number \| null/);
    expect(code).toContain('return id;');
  });
});
