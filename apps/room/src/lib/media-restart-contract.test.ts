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
  TWO sources, because slice 4 split this contract's subject across a file boundary.

  The four defects above were all found in one `onMount` block. `dropRemoteMedia` and the three
  consumers now live in `RoomMediaTransport`; the socket handlers that call them stayed on the page,
  because they are the wiring rather than the transport. Naming both files is what stops this test
  going quietly vacuous — an assertion pointed at the page for a subject that has moved keeps
  passing on whatever else happens to match, which is exactly how the broadcast contract survived
  slice 12 by matching the Files pane instead.
*/
const TRANSPORT = readFileSync(new URL('./room/media-transport.svelte.ts', import.meta.url), 'utf8');

/*
  Comments stripped before every assertion. The block above and the ones in `+page.svelte` both
  DESCRIBE the defect using the very identifiers being asserted against, so a test that searched the
  raw source would match its own explanation and pass no matter what the code did.
*/
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CODE = strip(PAGE);
const TRANSPORT_CODE = strip(TRANSPORT);

/** The body of a `signalling.on('<event>', …)` registration — `media` until the 2026-08-15 rename. */
function handler(event: string): string {
  const at = CODE.indexOf(`signalling.on('${event}'`);
  expect(at, `the ${event} handler must exist`).toBeGreaterThan(-1);
  return CODE.slice(at, CODE.indexOf("signalling.on('", at + 10));
}

describe('handlers read the live session, not the one captured at build time', () => {
  it('newProducer consumes on the current session', () => {
    const body = handler('newProducer');
    expect(body).toContain('const active = mediaTransport.session');
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
    expect(body).toContain('mediaTransport.session?.remoteStreams.values()');
    expect(body).not.toMatch(/\bsession\.remoteStreams\b/);
  });
});

describe('teardown closes whichever session is live', () => {
  it('does not close the captured one', () => {
    const teardown = CODE.slice(CODE.indexOf('stopRoomEvents();'));
    expect(teardown).toContain('const live = mediaTransport.session');
    expect(teardown).toContain('live?.close()');
    // The leak: closing the original after a restart left the rebuilt one open.
    expect(teardown).not.toMatch(/(^|[^.\w])session\.close\(\)/m);
  });

  it('reads the live session BEFORE nulling the field', () => {
    const teardown = CODE.slice(CODE.indexOf('stopRoomEvents();'));
    // Order is the whole correctness of it - null it first and `live` is null and nothing closes.
    expect(teardown.indexOf('const live = mediaTransport.session')).toBeLessThan(
      teardown.indexOf('mediaTransport.attachSession(null)')
    );
  });
});

describe('the reset clears the dedupe guards, not just the visible streams', () => {
  /*
    Read from the TRANSPORT, because that is where the reset lives after slice 4.

    It became a method rather than five public setters for the reason this whole block exists: the
    five collections carry one truth between them, and a caller able to clear four of them is the
    defect being guarded against, not a convenience being withheld.
  */
  const reset = TRANSPORT_CODE.slice(
    TRANSPORT_CODE.indexOf('dropRemoteMedia(): void {'),
    TRANSPORT_CODE.indexOf('\n  }', TRANSPORT_CODE.indexOf('dropRemoteMedia(): void {'))
  );

  it('exists once and is used by both callers', () => {
    expect(TRANSPORT_CODE.indexOf('dropRemoteMedia(): void {')).toBeGreaterThan(-1);
    // Declared once in the transport...
    expect(TRANSPORT_CODE.split('dropRemoteMedia').length - 1).toBe(1);
    // ...and called by the two page-level handlers, the socket dropping and the role change.
    expect(CODE.split('mediaTransport.dropRemoteMedia()').length - 1).toBe(2);
    // The partial reset it replaced must not survive as a lone call at either caller. Checked
    // on the PAGE, where a stray copy would now have to live, since the helper is not there.
    expect(CODE).not.toMatch(/^\s*(mediaTransport\.)?screenStreams\.clear\(\);\s*$/m);
  });

  it('clears the state each of the three guards actually reads', () => {
    // addRemoteScreen guards on `sharedScreens`, NOT `screenStreams` - clearing the latter alone
    // reset no guard at all, which is why the rebuild consumed nothing.
    expect(reset).toContain('this.#sharedScreens = []');
    expect(reset).toContain('this.#webcamPresenters.splice(0, this.#webcamPresenters.length)');
    expect(reset).toContain('this.#remoteAudioStreams.clear()');
    // And the visible map, plus the owner lookup keyed by producer id.
    expect(reset).toContain('this.#screenStreams.clear()');
    expect(reset).toContain('this.#audioProducerOwners.clear()');
  });

  it('empties the webcam array in place rather than reassigning it', () => {
    // A `$state` field; reassigning would swap the array every reader holds.
    expect(reset).not.toMatch(/#webcamPresenters\s*=\s*\[/);
  });

  it('runs after the old session is closed on the restart path', () => {
    const restart = CODE.slice(CODE.indexOf('restartMediaSession = async ()'));
    expect(restart.indexOf('previous?.close()')).toBeLessThan(
      restart.indexOf('mediaTransport.dropRemoteMedia()')
    );
  });
});
