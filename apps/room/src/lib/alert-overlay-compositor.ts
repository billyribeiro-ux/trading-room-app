import {
  layoutAlertOverlay,
  pushOverlayAlert,
  visibleOverlayAlerts,
  type OverlayAlert
} from './alert-overlay-layout';

/**
 * `alertsOverlayOnScreenshare` — the PLUMBING half: a canvas between the shared screen and the wire.
 *
 * ## What it does, from byte 1,098,419
 *
 * `enableShare` normally hands `getDisplayMedia`'s stream straight to the transport. With this
 * setting on, it hands it here instead: a hidden `<video>` plays the raw capture, an interval draws
 * that frame onto a canvas and paints the last four alerts over it, and `canvas.captureStream(30)`
 * becomes the track that actually leaves the machine. The member watching sees the alerts burned
 * into the share.
 *
 * ## `setInterval`, not `requestAnimationFrame`, and it is deliberate
 *
 * The reference stores the handle in a field called `animFrameId` and fills it with
 * `window.setInterval(…, 33)`. The name is a leftover; the mechanism is a timer. It is reproduced,
 * because a `requestAnimationFrame` loop stops in a background tab — and a presenter who tabs away
 * from their own screen share would silently stop sending frames to everybody watching.
 *
 * ## What is NOT here
 *
 * The wrapping and the card geometry, which are pure and live in `alert-overlay-layout.ts` with
 * their own tests. This module is `drawImage`, `fillText`, and the lifecycle — the parts that only a
 * browser can run, kept as thin as they can be so that what cannot be unit-tested is also what
 * cannot be subtly wrong.
 *
 * ## It fails OPEN, on purpose
 *
 * Every early return below leaves the RAW stream flowing. If the canvas cannot be created, if the
 * metadata never arrives, if `captureStream` is unavailable — the share still goes out, unadorned.
 * The alternative is a presenter whose screen share silently does not start because an overlay could
 * not initialise, which trades a cosmetic feature for the room's primary function.
 */

/** The colours the reference paints, and none is approximated. */
const CARD_BACKGROUND = 'rgba(0, 0, 0, 0.72)';
const RULE_COLOUR = '#f0c040';
const BODY_COLOUR = '#ffffff';
const BOLD_FONT = 'bold 32px sans-serif';
const BODY_FONT = '32px sans-serif';
/** The left rule down the side of a card. */
const RULE_WIDTH = 8;
const CARD_RADIUS = 8;
/** `window.setInterval(…, 33)` — about 30fps, matching `captureStream(30)`. */
export const OVERLAY_FRAME_MS = 33;
export const OVERLAY_CAPTURE_FPS = 30;
/** `canvas.width = videoWidth || 1920` — the fallback when metadata never arrives. */
export const OVERLAY_FALLBACK_WIDTH = 1920;
export const OVERLAY_FALLBACK_HEIGHT = 1080;
/** How long to wait for `loadedmetadata` before drawing anyway. */
export const OVERLAY_METADATA_TIMEOUT_MS = 5_000;

export interface AlertOverlayHandle {
  /** The composited stream — this is what goes to the transport. */
  readonly stream: MediaStream;
  /** Push an arriving alert onto the overlay. */
  readonly show: (alert: { text: string; sender: string }) => void;
  /**
   * Stop drawing and release the canvas, the video element and the interval — LEAVING the raw
   * capture running.
   *
   * The narrower of the two teardowns, and it exists for exactly one caller: a publish that failed
   * after the wrap succeeded. There the presenter keeps their local preview — which is what this
   * room did before overlays existed, and an error path that behaves differently depending on a
   * room setting is worse than either behaviour on its own — so the raw tracks must survive and be
   * handed back. Everything the OVERLAY allocated is released.
   */
  readonly detach: () => void;
  /**
   * {@link detach}, and then end the raw capture too.
   *
   * What a share ending needs. The raw tracks are not the caller's to stop any more: the transport
   * was handed the CANVAS stream and holds no reference to them, so leaving them running keeps the
   * browser's "sharing your screen" indicator up after the share is over.
   */
  readonly stop: () => void;
}

/**
 * Draw one frame: the shared surface, then the cards over it.
 *
 * Exported so a browser test can drive a single frame deterministically instead of waiting on a
 * timer — the interval below is the only other caller.
 */
export function drawOverlayFrame(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  size: { width: number; height: number },
  alerts: readonly OverlayAlert[],
  now: number
): void {
  context.drawImage(video, 0, 0, size.width, size.height);

  const visible = visibleOverlayAlerts(alerts, now);
  if (visible.length === 0) return;

  const cards = layoutAlertOverlay(visible, size.width, now, {
    bold: (text) => {
      context.font = BOLD_FONT;
      return context.measureText(text).width;
    },
    regular: (text) => {
      context.font = BODY_FONT;
      return context.measureText(text).width;
    }
  });

  for (const card of cards) {
    context.save();
    context.globalAlpha = card.alpha;

    context.fillStyle = CARD_BACKGROUND;
    context.beginPath();
    /*
      `roundRect` is Baseline-available and is what the reference calls. Guarded rather than assumed:
      an older engine without it would throw inside the draw loop, which runs thirty times a second,
      and the overlay must never be able to take the share down. A square card is the degradation.
    */
    if (typeof context.roundRect === 'function') {
      context.roundRect(card.x, card.y, card.width, card.height, CARD_RADIUS);
    } else {
      context.rect(card.x, card.y, card.width, card.height);
    }
    context.fill();

    context.fillStyle = RULE_COLOUR;
    context.fillRect(card.x, card.y, RULE_WIDTH, card.height);

    context.fillStyle = RULE_COLOUR;
    context.font = BOLD_FONT;
    context.fillText(card.prefix, card.prefixX, card.prefixY);

    context.fillStyle = BODY_COLOUR;
    context.font = BODY_FONT;
    for (const line of card.lines) context.fillText(line.text, line.x, line.y);

    context.restore();
  }
}

/**
 * Put the overlay between a captured stream and the transport.
 *
 * @param raw the stream `getDisplayMedia` returned.
 * @param onRawEnded called when the underlying capture ends — the presenter pressing the browser's
 *   own "Stop sharing". The caller stops the share; this module does not know how.
 * @returns the composited stream and its lifecycle, or `null` when the overlay could not start, in
 *   which case the caller keeps using `raw`.
 */
export async function startAlertOverlay(
  raw: MediaStream,
  onRawEnded: () => void
): Promise<AlertOverlayHandle | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context || typeof canvas.captureStream !== 'function') return null;

  const video = document.createElement('video');
  video.srcObject = raw;
  video.muted = true;
  video.playsInline = true;

  /*
    The metadata wait, with the reference's own five-second escape.

    Without the timeout a share whose `loadedmetadata` never fires would hang here forever and the
    presenter would press Share and get nothing. With it, the canvas falls back to 1920x1080 and the
    frames start; a wrong size is recoverable and a dead share is not.
  */
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(done, OVERLAY_METADATA_TIMEOUT_MS);
    video.onloadedmetadata = async () => {
      clearTimeout(timer);
      try {
        await video.play();
      } catch {
        /*
          Deliberately swallowed, and it is the one `catch` here that needs saying so: `play()`
          rejects on an autoplay policy, and the element is muted and off-screen so there is nothing
          to tell the presenter. The draw loop checks `readyState` before every frame, so a video
          that never played simply produces no frames rather than a broken one.
        */
      }
      done();
    };
  });

  const size = {
    width: video.videoWidth || OVERLAY_FALLBACK_WIDTH,
    height: video.videoHeight || OVERLAY_FALLBACK_HEIGHT
  };
  canvas.width = size.width;
  canvas.height = size.height;

  /* The shared surface can change size mid-share — a window resized, a different screen picked. */
  const onResize = () => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    if (size.width === width && size.height === height) return;
    size.width = width;
    size.height = height;
    canvas.width = width;
    canvas.height = height;
  };
  video.addEventListener('resize', onResize);

  const rawTrack = raw.getVideoTracks()[0] ?? null;
  rawTrack?.addEventListener('ended', onRawEnded);

  let alerts: OverlayAlert[] = [];
  let stopped = false;

  const timer = setInterval(() => {
    if (stopped) return;
    // `HAVE_CURRENT_DATA`. Drawing before it paints a blank frame over the share.
    if (video.readyState < 2) return;
    drawOverlayFrame(context, video, size, alerts, Date.now());
  }, OVERLAY_FRAME_MS);

  const stream = canvas.captureStream(OVERLAY_CAPTURE_FPS);
  const track = stream.getVideoTracks()[0];
  if (track) {
    try {
      /*
        `contentHint = 'detail'`, the same hint the raw screen track carries. Without it the encoder
        treats a canvas as motion video and softens exactly the text this overlay exists to show.
      */
      track.contentHint = 'detail';
    } catch {
      // A browser without the property. The share is unaffected; only the hint is lost.
    }
  }

  const detach = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    video.removeEventListener('resize', onResize);
    rawTrack?.removeEventListener('ended', onRawEnded);
    video.srcObject = null;
    for (const captured of stream.getTracks()) captured.stop();
  };

  return {
    stream,
    show: (alert) => {
      alerts = pushOverlayAlert(alerts, { ...alert, shownAt: Date.now() });
    },
    detach,
    stop: () => {
      detach();
      /*
        THE RAW TRACKS ARE STOPPED HERE, which the reference also does, and it is the ONLY difference
        between the two teardowns. See {@link AlertOverlayHandle.stop}.

        Idempotent on purpose: `detach` above has already run its own guard, and stopping a track
        that has ended is a no-op, so `stop()` after a `detach()` is safe and does the remaining half.
      */
      for (const rawTrackToStop of raw.getTracks()) rawTrackToStop.stop();
    }
  };
}
