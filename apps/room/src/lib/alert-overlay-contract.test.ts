import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import {
  OVERLAY_CARD_GAP,
  OVERLAY_FADE_MS,
  OVERLAY_FIRST_BASELINE,
  OVERLAY_HOLD_MS,
  OVERLAY_LINE_HEIGHT,
  OVERLAY_MARGIN,
  OVERLAY_MAX_ALERTS,
  OVERLAY_MAX_CARD_WIDTH,
  OVERLAY_PADDING,
  layoutAlertOverlay,
  pushOverlayAlert,
  visibleOverlayAlerts,
  wrapOverlayWords,
  type OverlayMetrics
} from '#lib/alert-overlay-layout.js';
import {
  OVERLAY_CAPTURE_FPS,
  OVERLAY_FALLBACK_HEIGHT,
  OVERLAY_FALLBACK_WIDTH,
  OVERLAY_FRAME_MS,
  OVERLAY_METADATA_TIMEOUT_MS
} from '#lib/alert-overlay-compositor.js';

/*
  ── `alertsOverlayOnScreenshare`, AND THE ONE FEATURE IN THIS ROOM NO TEST CAN LOOK AT ─────────────

  The setting puts a CANVAS between `getDisplayMedia` and the producer. The alerts are not drawn over
  a viewer's `<video>`; they are in the pixels every member receives and in any recording made of
  them, which is what the setting's own help text says it is for.

  `missing-settings-triage.md` sized this row at "a human at a screen picker", and that half is still
  true: `getDisplayMedia` cannot be automated, headless Chromium answers it with a synthetic
  gradient, and NOTHING in this repository can assert what the composited frame looks like. What was
  wrong about the row is that it treated that as a reason not to build, when the part that is easy to
  get subtly wrong is not the canvas at all — it is the WRAPPING, and the wrapping is arithmetic.

  So the feature is three modules and this file tests the one that carries the risk:

  * `alert-overlay-layout.ts` — pure. Every rule below is measured against a STUB measurer, at inputs
    a real screen share would take an afternoon to reproduce by hand.
  * `alert-overlay-compositor.ts` — `drawImage`, `fillText`, an interval and a `captureStream`. Its
    constants are pinned here; its behaviour needs a browser and that is stated, not implied.
  * `room/screen-overlay.svelte.ts` — the producer-id lifecycle, exercised with a fake compositor.

  WHAT IS NOT VERIFIED, said plainly rather than left to be discovered: no test in this repository
  has seen a composited frame. The geometry is proven against the reference's own constants; that the
  result LOOKS right on a real desktop is unverified and needs a presenter at a picker.

  Every constant below was transcribed from the reference compositor at byte 1,098,419 and its draw
  loop at 1,100,450-1,102,700. None is rounded.
*/

/**
 * A stub measurer: every character is worth 10, and a bold one 12.
 *
 * Deliberately NOT proportional. A real `measureText` would make each expectation below a number
 * nobody could check by reading, and the rules being tested are about WHICH words go on which line,
 * not about font metrics. Bold is wider than regular by a fixed factor so that the first line's
 * reduced width — `cardWidth - prefixWidth - 48`, where the prefix is measured in the bold font — is
 * distinguishable from the full width rather than accidentally equal to it.
 */
const CHAR = 10;
const BOLD_CHAR = 12;
const metrics: OverlayMetrics = {
  bold: (text) => text.length * BOLD_CHAR,
  regular: (text) => text.length * CHAR
};

/* ─────────────────────────────── the wrapper ─────────────────────────────── */

describe('wrapOverlayWords', () => {
  it('packs words until the next one would not fit', () => {
    // 100px holds ten characters. "alpha bravo" is 11 and does not fit; "alpha" alone does.
    expect(wrapOverlayWords(['alpha', 'bravo', 'charlie'], 100, metrics.regular)).toEqual([
      'alpha',
      'bravo',
      'charlie'
    ]);
    // 150px holds fifteen: "alpha bravo" is 11 and rides together, "alpha bravo charlie" is 19.
    expect(wrapOverlayWords(['alpha', 'bravo', 'charlie'], 150, metrics.regular)).toEqual([
      'alpha bravo',
      'charlie'
    ]);
    // And at 200 all three fit on one line, which is the same rule and not a special case.
    expect(wrapOverlayWords(['alpha', 'bravo', 'charlie'], 200, metrics.regular)).toEqual([
      'alpha bravo charlie'
    ]);
  });

  it('places a single over-long word anyway rather than emitting an empty line', () => {
    /*
      `measure(candidate) > maxWidth && current` — the SECOND term is what makes this terminate.
      Without it a word wider than the line would flush an empty `current`, put the word back, and
      loop forever; with it the word is placed on a line of its own and overflows, which is what the
      reference does and is the correct failure for a value the room cannot shorten.

      This is the wrapper's own path, reached only when the word is not ALSO wider than `maxWidth` —
      see the character-breaking test below for that case.
    */
    expect(wrapOverlayWords(['ok', 'exactlyten'], 100, metrics.regular)).toEqual([
      'ok',
      'exactlyten'
    ]);
  });

  it('breaks a word wider than the line CHARACTER BY CHARACTER', () => {
    // 30px holds three characters, so a twelve-character word becomes four pieces.
    expect(wrapOverlayWords(['abcdefghijkl'], 30, metrics.regular)).toEqual([
      'abc',
      'def',
      'ghi',
      'jkl'
    ]);
  });

  it('keeps the LAST piece of a broken word in the buffer for the words that follow it', () => {
    /*
      The detail that is easiest to lose, and it changes what a member reads.

      `pieces` is flushed up to `length - 1` and the remainder becomes `current`, so the tail joins
      the next word instead of being flushed as its own line. Flushing all of them — the obvious
      simplification — would put "i" and "no" on separate lines here.

      The nine-character word matters: it leaves a ONE-character tail, and "i no" is exactly four
      characters, which is what the 40px line holds. My first attempt used a ten-character word and
      asserted "ij no" — five characters, 50px — which the wrapper correctly split, and the test was
      measuring my arithmetic rather than the rule. The rule is real; the width has to leave room for
      the join or nothing is being observed.
    */
    expect(wrapOverlayWords(['abcdefghi', 'no'], 40, metrics.regular)).toEqual([
      'abcd',
      'efgh',
      'i no'
    ]);
  });

  it('flushes whatever preceded an over-long word before breaking it', () => {
    expect(wrapOverlayWords(['hi', 'abcdefghij'], 40, metrics.regular)).toEqual([
      'hi',
      'abcd',
      'efgh',
      'ij'
    ]);
  });

  it('returns nothing for no words', () => {
    expect(wrapOverlayWords([], 100, metrics.regular)).toEqual([]);
  });
});

/* ─────────────────────────────── the card geometry ─────────────────────────────── */

const alertAt = (text: string, sender = 'ana', shownAt = 0) => ({ text, sender, shownAt });

describe('layoutAlertOverlay', () => {
  it('caps the card at 900px and at 90% of the frame, whichever is smaller', () => {
    // 1920 * .9 = 1728, so the 900 cap wins on any ordinary desktop.
    const [wide] = layoutAlertOverlay([alertAt('hi')], 1920, 0, metrics);
    expect(wide.width).toBe(OVERLAY_MAX_CARD_WIDTH);
    expect(wide.x).toBe(1920 - OVERLAY_MAX_CARD_WIDTH - OVERLAY_MARGIN);

    // 800 * .9 = 720, below the cap, so a narrow share gets a proportional card.
    const [narrow] = layoutAlertOverlay([alertAt('hi')], 800, 0, metrics);
    expect(narrow.width).toBe(720);
    expect(narrow.x).toBe(800 - 720 - OVERLAY_MARGIN);
  });

  it('puts the first card 24px from the top and stacks the rest below it', () => {
    const cards = layoutAlertOverlay([alertAt('one'), alertAt('two')], 1920, 0, metrics);
    expect(cards[0].y).toBe(OVERLAY_MARGIN);
    // `y += height + 12`, and a one-line card is `48 + 44 * (1 + 0)`.
    const oneLine = OVERLAY_PADDING + OVERLAY_LINE_HEIGHT;
    expect(cards[0].height).toBe(oneLine);
    expect(cards[1].y).toBe(OVERLAY_MARGIN + oneLine + OVERLAY_CARD_GAP);
  });

  it('gives the prefix and the first body line the SAME baseline', () => {
    const [card] = layoutAlertOverlay([alertAt('hi', 'bo')], 1920, 0, metrics);
    expect(card.prefix).toBe('@bo: ');
    expect(card.prefixY).toBe(OVERLAY_MARGIN + OVERLAY_FIRST_BASELINE);
    expect(card.lines[0].y).toBe(card.prefixY);
    // And it starts where the prefix ends — measured in the BOLD font the prefix is drawn in.
    expect(card.lines[0].x).toBe(card.x + OVERLAY_MARGIN + metrics.bold('@bo: '));
  });

  it('steps every line after the first by 44px, back at the card margin', () => {
    // 900 - 48 = 852 for the body; the prefix "@ana: " is 6 bold chars = 72, so the first line has
    // 900 - 72 - 48 = 780, or 78 characters. Two 60-character words cannot share it.
    const long = `${'a'.repeat(60)} ${'b'.repeat(60)}`;
    const [card] = layoutAlertOverlay([alertAt(long)], 1920, 0, metrics);
    expect(card.lines).toHaveLength(2);
    expect(card.lines[1].x).toBe(card.x + OVERLAY_MARGIN);
    expect(card.lines[1].y).toBe(card.lines[0].y + OVERLAY_LINE_HEIGHT);
    // `48 + 44 * (1 + rest.length)` — one packed line plus one wrapped one.
    expect(card.height).toBe(OVERLAY_PADDING + OVERLAY_LINE_HEIGHT * 2);
  });

  it('PACKS the first line rather than wrapping it, and stops at the first word that does not fit', () => {
    /*
      THE `break`, AND IT IS THE REASON THIS IS NOT ONE `wrapOverlayWords` CALL.

      The first line stops at the first word that does not fit beside the prefix. It does NOT skip
      ahead looking for a shorter one, so a long word followed by a short one leaves the short one on
      the second line even though it would have fitted on the first.
    */
    const words = `${'a'.repeat(70)} ${'b'.repeat(20)} c`;
    const [card] = layoutAlertOverlay([alertAt(words)], 1920, 0, metrics);
    expect(card.lines[0].text).toBe('a'.repeat(70));
    // "c" would have fitted beside the 70-character word (70 + 1 + 1 = 72 <= 78) and does not,
    // because the 20-character word between them ended the line.
    expect(card.lines[1].text).toBe(`${'b'.repeat(20)} c`);
  });

  it('wraps the SPILL at the full width, not the reduced one', () => {
    /*
      The second pass drops the prefix's width: `cardWidth - 48` rather than
      `cardWidth - prefixWidth - 48`. Reproducing the whole card as one wrap call would put the
      prefix's width on every line, which is the wrong shape and the obvious mistake.
    */
    const [card] = layoutAlertOverlay(
      [alertAt(`${'a'.repeat(70)} ${'b'.repeat(85)}`)],
      1920,
      0,
      metrics
    );
    // 852px of body width is 85 characters. The spill fits on ONE line, which it could not have
    // done at the first line's 780.
    expect(card.lines[1].text).toBe('b'.repeat(85));
    expect(card.lines).toHaveLength(2);
  });

  it('preserves a deliberately blank paragraph as a blank line', () => {
    const [card] = layoutAlertOverlay([alertAt('top\n\nbottom')], 1920, 0, metrics);
    expect(card.lines.map((line) => line.text)).toEqual(['top', '', 'bottom']);
    // The blank line takes a full line's height, which is what makes it visible at all.
    expect(card.height).toBe(OVERLAY_PADDING + OVERLAY_LINE_HEIGHT * 3);
  });

  it('drops the first body line entirely when the first paragraph is empty', () => {
    const [card] = layoutAlertOverlay([alertAt('\nbody')], 1920, 0, metrics);
    // The prefix still draws; there is simply nothing beside it.
    expect(card.prefix).toBe('@ana: ');
    expect(card.lines.map((line) => line.text)).toEqual(['body']);
  });

  it('holds at full opacity for 14s and then fades linearly across the last second', () => {
    const at = (age: number) => layoutAlertOverlay([alertAt('hi')], 1920, age, metrics)[0].alpha;
    expect(at(0)).toBe(1);
    expect(at(OVERLAY_HOLD_MS - 1)).toBe(1);
    expect(at(OVERLAY_HOLD_MS)).toBe(1);
    expect(at(OVERLAY_HOLD_MS + OVERLAY_FADE_MS / 2)).toBeCloseTo(0.5, 10);
    expect(at(OVERLAY_HOLD_MS + OVERLAY_FADE_MS)).toBe(0);
  });

  it('does NOT clamp the alpha, because its caller filters first', () => {
    /*
      Upstream leaves it unclamped and so does this. It is not a latent bug: `visibleOverlayAlerts`
      evicts at hold + fade, so an alert with a negative alpha can never reach here through the
      compositor. Asserted rather than "fixed" so that anyone who deletes the filter finds out from
      a test rather than from a card that is drawn inverted.
    */
    expect(layoutAlertOverlay([alertAt('hi')], 1920, 20_000, metrics)[0].alpha).toBeLessThan(0);
  });

  it('lays out nothing for no alerts', () => {
    expect(layoutAlertOverlay([], 1920, 0, metrics)).toEqual([]);
  });
});

/* ─────────────────────────────── the queue ─────────────────────────────── */

describe('visibleOverlayAlerts', () => {
  it('keeps an alert until hold plus fade, and evicts it exactly then', () => {
    const alerts = [alertAt('hi', 'ana', 0)];
    expect(visibleOverlayAlerts(alerts, OVERLAY_HOLD_MS + OVERLAY_FADE_MS - 1)).toHaveLength(1);
    expect(visibleOverlayAlerts(alerts, OVERLAY_HOLD_MS + OVERLAY_FADE_MS)).toHaveLength(0);
  });

  it('evicts per alert rather than per list', () => {
    const alerts = [alertAt('old', 'ana', 0), alertAt('new', 'bo', 14_000)];
    expect(visibleOverlayAlerts(alerts, 15_000).map((alert) => alert.text)).toEqual(['new']);
  });
});

describe('pushOverlayAlert', () => {
  it('appends, newest last', () => {
    const one = pushOverlayAlert([], alertAt('a'));
    const two = pushOverlayAlert(one, alertAt('b'));
    expect(two.map((alert) => alert.text)).toEqual(['a', 'b']);
  });

  it('never holds more than four, and the OLDEST is the one that leaves', () => {
    let alerts = pushOverlayAlert([], alertAt('a'));
    for (const text of ['b', 'c', 'd', 'e']) alerts = pushOverlayAlert(alerts, alertAt(text));
    expect(alerts).toHaveLength(OVERLAY_MAX_ALERTS);
    expect(alerts.map((alert) => alert.text)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('does not mutate the list it was given', () => {
    // The compositor reassigns `alerts` from a closure the draw loop reads on every frame. A push
    // that mutated in place would be visible mid-frame, which is the one place a torn read shows.
    const before = [alertAt('a')];
    pushOverlayAlert(before, alertAt('b'));
    expect(before).toHaveLength(1);
  });
});

/* ─────────────────────────────── the compositor's constants ─────────────────────────────── */

describe('the compositor reproduces the reference numbers', () => {
  it('drives the canvas from a TIMER at 33ms and captures at 30fps', () => {
    /*
      `window.setInterval(…, 33)`, stored in a field the reference misleadingly calls `animFrameId`.
      The name is a leftover; the mechanism is a timer, and reproducing it is deliberate — a
      `requestAnimationFrame` loop is throttled to a stop in a background tab, so a presenter who
      tabbed away from their own share would silently stop sending frames to everybody watching.
    */
    expect(OVERLAY_FRAME_MS).toBe(33);
    expect(OVERLAY_CAPTURE_FPS).toBe(30);
  });

  it('falls back to 1920x1080 after waiting five seconds for metadata', () => {
    expect(OVERLAY_FALLBACK_WIDTH).toBe(1920);
    expect(OVERLAY_FALLBACK_HEIGHT).toBe(1080);
    expect(OVERLAY_METADATA_TIMEOUT_MS).toBe(5_000);
  });

  it('holds for 14s, fades for 1s, and shows at most four', () => {
    expect(OVERLAY_HOLD_MS).toBe(14_000);
    expect(OVERLAY_FADE_MS).toBe(1_000);
    expect(OVERLAY_MAX_ALERTS).toBe(4);
  });

  it('uses the reference colours and fonts and approximates none of them', () => {
    const source = readFileSync(new URL('./alert-overlay-compositor.ts', import.meta.url), 'utf8');
    expect(source).toContain("'rgba(0, 0, 0, 0.72)'");
    expect(source).toContain("'#f0c040'");
    expect(source).toContain("'bold 32px sans-serif'");
    expect(source).toContain("'32px sans-serif'");
  });

  it("sets contentHint 'detail' on the canvas track", () => {
    /*
      The one property that keeps the overlay legible. Without it the encoder treats a canvas as
      motion video and softens exactly the text this feature exists to show — and it is the ONE place
      `streaming-choices.md` records the reference setting the hint itself.
    */
    const source = readFileSync(new URL('./alert-overlay-compositor.ts', import.meta.url), 'utf8');
    expect(source).toContain("contentHint = 'detail'");
  });

  it('FAILS OPEN — every early return leaves the raw stream to the caller', () => {
    /*
      Three of them: no `document`, no 2d context or no `captureStream`, and the caller's own check
      on a null return. A share that silently does not start because an overlay could not initialise
      trades the room's primary function for a cosmetic one, so the overlay is the thing that gives
      way. `screen-overlay.svelte.ts` is the consumer, and it returns the raw stream on null.
    */
    const source = readFileSync(new URL('./alert-overlay-compositor.ts', import.meta.url), 'utf8');
    expect(source).toContain("if (typeof document === 'undefined') return null;");
    expect(source).toContain(
      "if (!context || typeof canvas.captureStream !== 'function') return null;"
    );
    const consumer = readFileSync(
      new URL('./room/screen-overlay.svelte.ts', import.meta.url),
      'utf8'
    );
    expect(consumer).toContain('if (!handle) return unwrapped;');
  });
});

/* ─────────────────────────────── the producer-id lifecycle ─────────────────────────────── */

/*
  A FAKE COMPOSITOR, because the real one needs a canvas and this is the half that needs none.

  `RoomScreenOverlay` never draws. What it decides is which shares get an overlay, which producer id
  each one is keyed by, and when the raw capture's `ended` handler has an id to pass on — and every
  one of those was a chance to leak a 33ms interval or to stop the wrong share. The mock replaces
  `startAlertOverlay` with a recorder, so those decisions are assertable with no browser at all.
*/
const started: {
  onRawEnded: () => void;
  shown: { text: string; sender: string }[];
  stopped: boolean;
  detached: boolean;
}[] = [];
let startReturnsNull = false;

vi.mock('#lib/alert-overlay-compositor.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('#lib/alert-overlay-compositor.js')>();
  return {
    ...original,
    startAlertOverlay: async (raw: MediaStream, onRawEnded: () => void) => {
      if (startReturnsNull) return null;
      const record = {
        onRawEnded,
        shown: [] as { text: string; sender: string }[],
        stopped: false,
        detached: false
      };
      started.push(record);
      return {
        // A distinguishable object, so a test can tell the wrapped stream from the raw one.
        stream: { raw } as unknown as MediaStream,
        show: (alert: { text: string; sender: string }) => record.shown.push(alert),
        detach: () => {
          record.detached = true;
        },
        stop: () => {
          record.stopped = true;
        }
      };
    }
  };
});

const { RoomScreenOverlay } = await import('#lib/room/screen-overlay.svelte.js');

const rawStream = () => ({ id: 'raw' }) as unknown as MediaStream;

const freshOverlay = (enabled: boolean) => {
  started.length = 0;
  startReturnsNull = false;
  return new RoomScreenOverlay({ enabled: () => enabled });
};

describe('RoomScreenOverlay', () => {
  it('returns the RAW stream untouched when the room did not ask for an overlay', async () => {
    const overlay = freshOverlay(false);
    const raw = rawStream();
    const wrapped = await overlay.wrap(raw, 'screen', () => {});
    expect(wrapped.stream).toBe(raw);
    expect(started).toHaveLength(0);
  });

  it('never wraps a CAMERA share, even in a room that ticked the setting', async () => {
    // The setting is "Alerts over SCREENSHARE", and the reference reaches its compositor only from
    // the display-capture branch of `enableShare`.
    const overlay = freshOverlay(true);
    const raw = rawStream();
    expect((await overlay.wrap(raw, 'camera', () => {})).stream).toBe(raw);
    expect(started).toHaveLength(0);
  });

  it('publishes the CANVAS stream when the room asked for one', async () => {
    const overlay = freshOverlay(true);
    const raw = rawStream();
    const wrapped = await overlay.wrap(raw, 'screen', () => {});
    expect(wrapped.stream).not.toBe(raw);
    expect(started).toHaveLength(1);
  });

  it('FAILS OPEN to the raw stream when the compositor could not start', async () => {
    const overlay = freshOverlay(true);
    startReturnsNull = true;
    const raw = rawStream();
    expect((await overlay.wrap(raw, 'screen', () => {})).stream).toBe(raw);
  });

  it('does not fire the raw-ended callback before the share was published', async () => {
    /*
      The presenter pressing the browser's own "Stop sharing" between the picker and the produce.
      There is no producer id yet and no share to stop, so the callback has nothing to call — and
      calling it with a guessed id would stop somebody else's screen.
    */
    const overlay = freshOverlay(true);
    const ended = vi.fn();
    await overlay.wrap(rawStream(), 'screen', ended);
    started[0].onRawEnded();
    expect(ended).not.toHaveBeenCalled();
  });

  it('routes the raw capture ending to the producer id the share was published under', async () => {
    const overlay = freshOverlay(true);
    const ended = vi.fn();
    const wrapped = await overlay.wrap(rawStream(), 'screen', ended);
    wrapped.keep('producer-7');
    started[0].onRawEnded();
    expect(ended).toHaveBeenCalledWith('producer-7');
  });

  it('releases the overlay when its share stops, and only that one', async () => {
    const overlay = freshOverlay(true);
    const first = await overlay.wrap(rawStream(), 'screen', () => {});
    first.keep('producer-1');
    const second = await overlay.wrap(rawStream(), 'screen', () => {});
    second.keep('producer-2');

    overlay.release('producer-1');
    expect(started[0].stopped).toBe(true);
    expect(started[1].stopped).toBe(false);
  });

  it('ignores a release for a share that never had an overlay', async () => {
    // Every share in every room with the setting off takes this path on the way out.
    const overlay = freshOverlay(true);
    expect(() => overlay.release('never-wrapped')).not.toThrow();
  });

  it('abandons an overlay whose publish failed, so the draw interval cannot outlive it', async () => {
    const overlay = freshOverlay(true);
    const wrapped = await overlay.wrap(rawStream(), 'screen', () => {});
    wrapped.abandon();
    expect(started[0].stopped).toBe(true);
  });

  it('follows a share to its NEW producer id when a reconnect re-publishes it', async () => {
    /*
      `restartLocalScreens` re-produces the same track onto a fresh producer, so the id the overlay
      was keyed by no longer exists. Without `rekey` the eventual `stopLocalScreen(newId)` releases
      NOTHING: the 33ms interval keeps drawing and the raw capture keeps running, which leaves the
      browser's "sharing your screen" indicator up after the presenter has stopped sharing.

      Found by re-reading the diff, not by a test — a reconnect cannot be provoked here. This is the
      test that would have found it.
    */
    const overlay = freshOverlay(true);
    const ended = vi.fn();
    const wrapped = await overlay.wrap(rawStream(), 'screen', ended);
    wrapped.keep('producer-old');

    overlay.rekey('producer-old', 'producer-new');

    overlay.release('producer-old');
    expect(started[0].stopped, 'the stale id must no longer reach it').toBe(false);
    overlay.release('producer-new');
    expect(started[0].stopped).toBe(true);
  });

  it('points the raw-ended callback at the new id after a rekey', async () => {
    // The other half, and the one a map-only rekey would leave broken: the browser's own Stop bar
    // would stop a producer the SFU has already closed, leaving this share running.
    const overlay = freshOverlay(true);
    const ended = vi.fn();
    (await overlay.wrap(rawStream(), 'screen', ended)).keep('producer-old');
    overlay.rekey('producer-old', 'producer-new');
    started[0].onRawEnded();
    expect(ended).toHaveBeenCalledWith('producer-new');
  });

  it('ignores a rekey for a share that never had an overlay', async () => {
    const overlay = freshOverlay(true);
    expect(() => overlay.rekey('nothing', 'still-nothing')).not.toThrow();
  });

  it('detaches without ending the raw capture, for a publish that failed', async () => {
    /*
      Nothing was published, so nothing will ever call `stopLocalScreen` for this share and nothing
      would ever release the canvas — the interval would draw for the rest of the page's life. What
      must NOT happen is the raw capture ending with it: the presenter keeps their local preview,
      which is what this room did before overlays existed, and an error path whose behaviour depends
      on a room setting is worse than either behaviour on its own.
    */
    const overlay = freshOverlay(true);
    const wrapped = await overlay.wrap(rawStream(), 'screen', () => {});
    wrapped.detach();
    expect(started[0].detached).toBe(true);
    expect(started[0].stopped, 'the raw capture is the presenter preview and survives').toBe(false);
  });

  it('shows an arriving alert on EVERY screen this presenter is sharing', async () => {
    /*
      Not the selected tab. The tab bar is what THIS presenter is looking at; every screen they share
      is being watched by somebody else, so drawing on one of them would make what a member sees
      depend on which tab the presenter happened to have open.
    */
    const overlay = freshOverlay(true);
    for (const id of ['a', 'b']) (await overlay.wrap(rawStream(), 'screen', () => {})).keep(id);
    overlay.show({ text: 'AAPL 200c', sender: 'ana' });
    expect(started[0].shown).toEqual([{ text: 'AAPL 200c', sender: 'ana' }]);
    expect(started[1].shown).toEqual([{ text: 'AAPL 200c', sender: 'ana' }]);
  });

  it('does not show an alert on an overlay that has not been published yet', async () => {
    // `keep` is the moment a share becomes real. Before it there is a canvas nobody is consuming.
    const overlay = freshOverlay(true);
    await overlay.wrap(rawStream(), 'screen', () => {});
    overlay.show({ text: 'ignored', sender: 'ana' });
    expect(started[0].shown).toEqual([]);
  });

  it('stops showing on a released overlay', async () => {
    const overlay = freshOverlay(true);
    (await overlay.wrap(rawStream(), 'screen', () => {})).keep('gone');
    overlay.release('gone');
    overlay.show({ text: 'too late', sender: 'ana' });
    expect(started[0].shown).toEqual([]);
  });
});
