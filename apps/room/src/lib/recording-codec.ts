/**
 * Choosing what the room recorder actually encodes with.
 *
 * `TODO.md` item R. The recorder was `new MediaRecorder(stream)` — **no options at all** — so the
 * browser picked both the container and the bitrate, and Chrome's default is roughly 2.5 Mbps of
 * whatever it feels like. `docs/streaming-choices.md` row 4 measured what that costs, on realistic
 * screen content (34 lines of 13px monospace, 120 animated candlesticks, thin gridlines, 1080p30):
 *
 * | codec          | cap 2 Mbps | cap 8 Mbps | cap 16 Mbps |
 * | -------------- | ---------: | ---------: | ----------: |
 * | **VP9 (webm)** |       1429 |   **3841** |    **6414** |
 * | AV1 (webm)     |       1928 |       3778 |        3802 |
 * | H.264 (mp4)    |       1582 |       2033 |        1990 |
 * | HEVC (mp4)     |       1238 |       1723 |        1626 |
 *
 * *(kbps actually produced)*
 *
 * **Only VP9 keeps scaling.** Everything else saturates and ignores a higher cap, so for 1080p text
 * a hard ~2 Mbps ceiling is a quality ceiling you cannot buy your way out of.
 *
 * ## The trade this file makes, and why
 *
 * The owner asked for MP4 downloads *and* the best possible quality. Those pull against each other
 * and the measurement is why: `.webm` does not open in QuickTime on macOS, while mp4/H.264 opens
 * everywhere and saturates near 2 Mbps. `streaming-choices.md` states it plainly —
 * "compatibility and sharpness are directly opposed here".
 *
 * **Quality wins, because that was the instruction.** The order below prefers VP9, then AV1, then
 * VP8, and reaches MP4 only when nothing better is supported — which on Safari is immediately,
 * since Safari's `MediaRecorder` produces `video/mp4` natively. So a Safari presenter gets an MP4
 * without anything special, and a Chrome presenter gets the sharpest file the machine can make.
 *
 * If MP4 is ever needed *everywhere*, the honest answer is not to demote VP9 here — it is
 * server-side remux, which is `streaming-choices.md` row 10 and needs the transcoding workers
 * `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. Demoting VP9 would cost every presenter ~4 Mbps of detail
 * to save a conversion nobody has asked for yet.
 *
 * ## The bitrate, and the performance limit on it
 *
 * 8 Mbps, which is the bottom of row 4's "VP9 @ 8–12 Mbps" recommendation, chosen deliberately at
 * the bottom rather than the top. Row 4's own warning is the reason:
 *
 * > **not bandwidth-free for the presenter's CPU.** A second 1080p encode competes with the live
 * > encoder, and on a loaded machine that can drop frames on the share members are watching.
 *
 * The recording is for the presenter; the live share is for everyone. Spending the presenter's CPU
 * to make their own file sharper, at the risk of the room's stream stuttering, is the wrong trade —
 * so this takes the measured 3841 kbps of real detail at 8 Mbps and declines to chase the extra
 * 2573 kbps that a 16 Mbps cap would allow.
 *
 * Audio is 128 kbps, which is transparent for speech and costs nothing next to the video.
 */

/** The recorder's bitrate ceiling. See the note above on why this is the bottom of the range. */
export const RECORDING_VIDEO_BITS_PER_SECOND = 8_000_000;

/** Opus at 128 kbps — transparent for voice, and rounding error beside the video. */
export const RECORDING_AUDIO_BITS_PER_SECOND = 128_000;

/**
 * Candidate containers, best measured quality first.
 *
 * Each entry is tried against `MediaRecorder.isTypeSupported`. The codec strings are explicit
 * rather than bare `video/webm`, because a bare container lets the browser choose the codec inside
 * it — which is the situation this module exists to end.
 */
export const RECORDING_PREFERENCES: readonly string[] = [
  // Measured best: the only codec that keeps scaling with the cap.
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  // Saturates ~3.8 Mbps but beats VP8, and encodes in real time on this hardware.
  'video/webm;codecs=av01,opus',
  'video/webm;codecs=vp8,opus',
  // Reached only when no webm profile is supported — Safari, in practice, which produces MP4
  // natively. Saturates near 2 Mbps; that is a property of the encoder, not of this choice.
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4'
];

export interface RecordingChoice {
  /** Pass to `new MediaRecorder(stream, …)`. `undefined` means "let the browser decide". */
  mimeType: string | undefined;
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  /** File extension for the download, derived from the container actually chosen. */
  extension: 'webm' | 'mp4';
  /** True when nothing in the preference list was supported and the browser default is in use. */
  usedFallback: boolean;
}

/**
 * Picks the best supported recording configuration.
 *
 * `isSupported` is injected so this is testable without a browser — every branch here is a decision
 * about someone's recording quality, and none of them should rest on a manual check in Chrome.
 *
 * Returns `mimeType: undefined` when nothing matches rather than forcing an unsupported string,
 * because `new MediaRecorder(stream, { mimeType })` **throws** on an unsupported type. A recording
 * that fails to start is worse than one encoded at the browser's default, so the fallback is the
 * behaviour we had before this file existed.
 */
export function chooseRecordingOptions(
  isSupported: (mimeType: string) => boolean = defaultIsSupported
): RecordingChoice {
  for (const mimeType of RECORDING_PREFERENCES) {
    if (!isSupported(mimeType)) continue;
    return {
      mimeType,
      videoBitsPerSecond: RECORDING_VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND,
      extension: extensionFor(mimeType),
      usedFallback: false
    };
  }

  return {
    mimeType: undefined,
    videoBitsPerSecond: RECORDING_VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: RECORDING_AUDIO_BITS_PER_SECOND,
    // The browser will choose the container; `downloadRecording` reads the recorder's own
    // `mimeType` afterwards rather than trusting this, so the extension is corrected there.
    extension: 'webm',
    usedFallback: true
  };
}

/**
 * The extension a container needs.
 *
 * Naming an mp4 `.webm` produces a file the OS refuses to open, which is the failure this exists to
 * prevent — and it is not hypothetical, it is why the download path already reads the recorder's
 * own `mimeType` back.
 */
export function extensionFor(mimeType: string): 'webm' | 'mp4' {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

function defaultIsSupported(mimeType: string): boolean {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType);
}
