import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The media session can be REPLACED, and everything that touches it has to survive that.
 *
 * `restartMediaSession` exists because `close()` latches `#closed` permanently, so a role change
 * cannot reuse the instance — it builds a new one and assigns it to `mediaSession`. Three things in
 * the same block were still reading the `const session` captured at the top, and none of them
 * failed loudly:
 *
 *  - `newProducer` consumed on the closed session, so every producer arriving after a mic
 *    hand-over rendered nothing, silently;
 *  - `peerClosed` iterated the closed session's streams, so a peer leaving tore down nothing;
 *  - the `onMount` teardown closed the original, leaking the rebuilt session's transports and
 *    RTCPeerConnections past the component's life — still holding the SFU peer slot.
 *
 * And the reset that runs either side of it cleared `screenStreams`, which is not what any of the
 * three dedupe guards read, so the rebuild from `getProducers` re-consumed nothing.
 *
 * All four were found by the adversarial review of 2026-08-11, in work shipped the same day.
 */

const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/*
  Comments stripped before every assertion. The block above and the ones in `+page.svelte` both
  DESCRIBE the defect using the very identifiers being asserted against, so a test that searched the
  raw source would match its own explanation and pass no matter what the code did.
*/
const CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The body of a `media.on('<event>', …)` registration. */
function handler(event: string): string {
  const at = CODE.indexOf(`media.on('${event}'`);
  expect(at, `the ${event} handler must exist`).toBeGreaterThan(-1);
  return CODE.slice(at, CODE.indexOf("media.on('", at + 10));
}

describe('handlers read the live session, not the one captured at build time', () => {
  it('newProducer consumes on the current session', () => {
    const body = handler('newProducer');
    expect(body).toContain('const active = mediaSession');
    // THE assertion: the captured const must not be passed to any of the three consumers.
    expect(body).not.toMatch(/addRemote(Screen|Webcam|Audio)\(\s*session\s*,/);
    for (const fn of ['addRemoteScreen', 'addRemoteWebcam', 'addRemoteAudio']) {
      expect(body, fn).toContain(`${fn}(active, info)`);
    }
    // `mediaSession` is null for the window inside restartMediaSession where the old one is closed
    // and the new one is not yet assigned, and a producer can arrive in it.
    expect(body).toContain('if (!active) return');
  });

  it('peerClosed walks the current session', () => {
    const body = handler('peerClosed');
    expect(body).toContain('mediaSession?.remoteStreams.values()');
    expect(body).not.toMatch(/\bsession\.remoteStreams\b/);
  });
});

describe('teardown closes whichever session is live', () => {
  it('does not close the captured one', () => {
    const teardown = CODE.slice(CODE.indexOf('stopRoomEvents();'));
    expect(teardown).toContain('const live = mediaSession');
    expect(teardown).toContain('live?.close()');
    // The leak: closing the original after a restart left the rebuilt one open.
    expect(teardown).not.toMatch(/(^|[^.\w])session\.close\(\)/m);
  });

  it('reads the live session BEFORE nulling the field', () => {
    const teardown = CODE.slice(CODE.indexOf('stopRoomEvents();'));
    // Order is the whole correctness of it - null it first and `live` is null and nothing closes.
    expect(teardown.indexOf('const live = mediaSession')).toBeLessThan(
      teardown.indexOf('mediaSession = null')
    );
  });
});

describe('the reset clears the dedupe guards, not just the visible streams', () => {
  const reset = CODE.slice(
    CODE.indexOf('function dropRemoteMedia()'),
    CODE.indexOf('media.on(', CODE.indexOf('function dropRemoteMedia()'))
  );

  it('exists once and is used by both callers', () => {
    expect(CODE.indexOf('function dropRemoteMedia()')).toBeGreaterThan(-1);
    // Two callers - the socket dropping and the role change - plus the declaration.
    expect(CODE.split('dropRemoteMedia').length - 1).toBe(3);
    // The partial reset it replaced must not survive as a lone call at either caller. Checked
    // OUTSIDE the helper, because the line legitimately lives inside it.
    const start = CODE.indexOf('function dropRemoteMedia()');
    const outside = CODE.slice(0, start) + CODE.slice(start + reset.length);
    expect(outside).not.toMatch(/^\s*screenStreams\.clear\(\);\s*$/m);
  });

  it('clears the state each of the three guards actually reads', () => {
    // addRemoteScreen guards on `sharedScreens`, NOT `screenStreams` - clearing the latter alone
    // reset no guard at all, which is why the rebuild consumed nothing.
    expect(reset).toContain('sharedScreens = []');
    expect(reset).toContain('webcamPresenters.splice(0, webcamPresenters.length)');
    expect(reset).toContain('remoteAudioStreams.clear()');
    // And the visible map, plus the owner lookup keyed by producer id.
    expect(reset).toContain('screenStreams.clear()');
    expect(reset).toContain('audioProducerOwners.clear()');
  });

  it('empties the webcam array in place rather than reassigning it', () => {
    // It is a `const` $state array; reassigning would swap the array every reader holds.
    expect(reset).not.toMatch(/webcamPresenters\s*=\s*\[/);
  });

  it('runs after the old session is closed on the restart path', () => {
    const restart = CODE.slice(CODE.indexOf('restartMediaSession = async ()'));
    expect(restart.indexOf('previous?.close()')).toBeLessThan(restart.indexOf('dropRemoteMedia()'));
  });
});
