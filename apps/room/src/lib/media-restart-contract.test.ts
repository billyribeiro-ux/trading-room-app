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
const TRANSPORT = readFileSync(
  new URL('./room/media-transport.svelte.ts', import.meta.url),
  'utf8'
);

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
  const at = TRANSPORT_CODE.indexOf(`signalling.on('${event}'`);
  expect(at, `the ${event} handler must exist`).toBeGreaterThan(-1);
  return TRANSPORT_CODE.slice(at, TRANSPORT_CODE.indexOf("signalling.on('", at + 10));
}

describe('handlers read the live session, not the one captured at build time', () => {
  it('newProducer consumes on the current session', () => {
    const body = handler('newProducer');
    expect(body).toContain('const active = this.session');
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
    expect(body).toContain('this.session?.remoteStreams.values()');
    expect(body).not.toMatch(/\bsession\.remoteStreams\b/);
  });
});

describe('teardown closes whichever session is live', () => {
  it('does not close the captured one', () => {
    /*
      The teardown is INSIDE `connect` now, returned by the method that opened the session — which
      is the whole point of moving it. The two halves used to sit 240 lines apart in `onMount`.
    */
    const teardown = TRANSPORT_CODE.slice(TRANSPORT_CODE.indexOf('return () => {'));
    expect(teardown).toContain('const live = this.session');
    expect(teardown).toContain('live?.close()');
    // The leak: closing the original after a restart left the rebuilt one open.
    expect(teardown).not.toMatch(/(^|[^.\w])session\.close\(\)/m);
    // And the PAGE calls it, which the class cannot show: a teardown nobody invokes looks correct
    // from inside the file that returns it.
    expect(CODE).toContain('const stopMedia = mediaTransport.connect();');
    expect(CODE).toContain('stopMedia();');
  });

  it('reads the live session BEFORE nulling the field', () => {
    const teardown = TRANSPORT_CODE.slice(TRANSPORT_CODE.indexOf('return () => {'));
    // Order is the whole correctness of it - null it first and `live` is null and nothing closes.
    expect(teardown.indexOf('const live = this.session')).toBeLessThan(
      teardown.indexOf('this.attachSession(null)')
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
    // One declaration and two callers, all three inside the transport since slice 26 — the socket
    // dropping and the role change both live in `connect` and `restart` now.
    expect(TRANSPORT_CODE.split('dropRemoteMedia').length - 1).toBe(3);
    // ...and called by the two page-level handlers, the socket dropping and the role change.
    // Both callers are inside the transport now: the socket dropping, and the role change.
    expect(TRANSPORT_CODE.split('this.dropRemoteMedia()').length - 1).toBe(2);
    // The partial reset it replaced must not survive as a lone call at either caller. Checked
    // on the PAGE, where a stray copy would now have to live, since the helper is not there.
    /*
      The partial reset must not survive as a LONE call anywhere outside the receiver. Checked with
      the receiver's own body cut out, because the line legitimately lives inside it — the first
      version of this assertion after slice 26 matched that very line and went red against correct
      code.
    */
    const at = TRANSPORT_CODE.indexOf('dropRemoteMedia(): void {');
    const outside =
      TRANSPORT_CODE.slice(0, at) + TRANSPORT_CODE.slice(TRANSPORT_CODE.indexOf('\n  }', at));
    expect(outside).not.toMatch(/^\s*this\.#screenStreams\.clear\(\);\s*$/m);
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
    const restart = TRANSPORT_CODE.slice(TRANSPORT_CODE.indexOf('async restart()'));
    expect(restart.indexOf('previous?.close()')).toBeLessThan(
      restart.indexOf('this.dropRemoteMedia()')
    );
  });
});
