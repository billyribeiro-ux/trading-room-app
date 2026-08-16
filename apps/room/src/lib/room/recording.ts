import { startSpeechRecognition } from '#lib/media/speech-reco.js';
import { chooseRecordingOptions } from '#lib/recording-codec.js';

import { recordingState } from '../../routes/recording-state.remote';

import type { RoomDialogs } from './dialogs.svelte';
import type { RoomMedia } from './media.svelte';
import type { RoomMediaTransport } from './media-transport.svelte';
import type { RoomMenus } from './menus.svelte';
import type { RoomPrefs } from './prefs.svelte';

/** The four transitions the wire admits, read off `recordingState` rather than re-listed. */
type RecordingTransition = Parameters<typeof recordingState>[0]['cmd'];

/**
 * THE RECORDER, and the speech recognition that rides on the same microphone.
 *
 * **A plain `.ts`, not `.svelte.ts`, and that is deliberate.** This class holds no rune: the four
 * fields it owns are a `MediaRecorder`, its chunk list, a `Window` and a teardown function, and
 * nothing renders from any of them. What the UI shows comes from `RoomMedia.recording` and
 * `recordingPaused`, which this class writes and that class owns. Naming it `.svelte.ts` would tell
 * the compiler to look for runes and tell a reader the module is reactive; `arrivals.ts` and
 * `scroll-follow.ts` are in `lib/room/` on the same footing, and the size contract caps plain `.ts`
 * modules for exactly that reason.
 *
 * Phase 5 slice 20: `MediaRecorder`, the preview window it opens, the room-wide broadcast that
 * tells everyone else a recording started, and the two speech-recognition calls that share the
 * recorder's audio source.
 *
 * **Speech recognition travels WITH the recorder rather than with the transport**, and the reason
 * is the microphone. `RoomMediaTransport` owns the track — acquiring one and producing it into the
 * SFU is a single act, which is why that class is one module — but recognition is not a second
 * consumer of the wire, it is a second consumer of the DEVICE. It starts and stops on the same
 * events the recorder does, writes into the caption list rather than onto a producer, and reaches
 * the transport through the same injected reference every other feature uses. Putting it in the
 * transport would have meant a class that both publishes media and transcribes it.
 *
 * **The recorder's own state travels too**, all four fields: the `MediaRecorder`, the chunk list it
 * fills, the preview `Window` and the speech teardown. Every one of them was a page-level `let`
 * read by nothing outside these ten functions — measured, not assumed — so injecting them would
 * have been the shared-field pattern applied where nothing is shared.
 *
 * **The room learns a recording started from the SERVER, never from this flag.** `#recording` is
 * what this browser's own UI renders; `broadcastRecordingState` is what tells the room, and the
 * `startRec` / `stopRec` frames come back through `RoomEventStream` to everybody including the
 * sender. A local flag standing in for the broadcast is how one presenter's recorder ends up
 * invisible to the room it is recording.
 */
export class RoomRecording {
  #screenRecorder: MediaRecorder | null;
  #recordedScreenChunks: Blob[];
  #recPreviewWindow: Window | null;
  #stopSpeechReco: (() => void) | null;
  constructor(options: {
    dialogs: RoomDialogs;
    media: RoomMedia;
    menus: RoomMenus;
    prefs: RoomPrefs;
    mediaTransport: RoomMediaTransport;
    isPresenter: () => boolean;
  }) {
    this.#dialogs = options.dialogs;
    this.#media = options.media;
    this.#menus = options.menus;
    this.#prefs = options.prefs;
    this.#mediaTransport = options.mediaTransport;
    this.#isPresenter = options.isPresenter;

    this.#screenRecorder = null;

    this.#recordedScreenChunks = [];

    /** The separate window the preview lives in - the capture's `reopenRecPreviewWindow` target. */
    this.#recPreviewWindow = null;

    /** Stops recognition; null when this peer is not captioning. */
    this.#stopSpeechReco = null;
  }

  readonly #dialogs: RoomDialogs;
  readonly #media: RoomMedia;
  readonly #menus: RoomMenus;
  readonly #prefs: RoomPrefs;
  readonly #mediaTransport: RoomMediaTransport;
  readonly #isPresenter: () => boolean;

  /**
   * Records the shared screen to a file on this machine.
   *
   * NOT what the capture does, and the divergence is deliberate. The original records
   * SERVER-side - `mediaSoupService.startRec(muser)` and
   * `sendServerAdminCommand('startRecMtx', {streams})`, with the server pushing back a `recName`
   * - and the whole bundle contains exactly ONE `new MediaRecorder`, which is the microphone test
   * in the AV settings modal. The original never writes a session media.recording to your computer.
   * Server-side media.recording needs the media.recording/transcoding workers that the deployment plan defers,
   * so this records in the browser instead.
   *
   * Three things were wrong with it:
   *
   *   1. SILENT. `getDisplayMedia({ audio: false })` means `screenStream` carries video only, so
   *      every media.recording was a silent movie. The presenter's microphone is mixed in below.
   *   2. UNREACHABLE. `media.recordedUrl` is only set by the recorder's `stop` event, which also
   *      sets `media.recording = false` - and the menu item that exposed it sat inside `{#if media.recording}`.
   *      It existed only at the moment it became invisible.
   *   3. NEVER SAVED. A blob URL was created and nothing ever downloaded it.
   */
  startRecording() {
    if (
      !this.#mediaTransport.screenStream ||
      !this.#media.screenSharing ||
      typeof MediaRecorder === 'undefined'
    )
      return;

    // Video from the share, audio from the mic. `getAudioTracks()` on the display stream is empty
    // by construction, so without this the file has no sound at all.
    const tracks: MediaStreamTrack[] = [...this.#mediaTransport.screenStream.getVideoTracks()];
    const micTrack = this.#mediaTransport.microphoneStream?.getAudioTracks()[0];
    if (micTrack && micTrack.readyState === 'live') tracks.push(micTrack);
    this.#media.recordedHasAudio = Boolean(micTrack && micTrack.readyState === 'live');
    const recordedStream = new MediaStream(tracks);

    this.#recordedScreenChunks = [];
    /*
      Explicit codec and bitrate, where this was `new MediaRecorder(recordedStream)` with NO options.

      With none, the browser chose both the container and roughly 2.5 Mbps. `docs/streaming-choices.md`
      row 4 measured, on realistic chart content, that VP9 produces 3841 kbps at an 8 Mbps cap and
      keeps scaling, while H.264 saturates near 2033 and ignores anything higher — so the detail was
      available and simply never asked for. See `media.recording-codec.ts` for the full ordering and for
      why 8 Mbps rather than 12: a second 1080p encode competes with the live encoder, and the share
      members are watching matters more than the presenter's own file.
    */
    const recordingOptions = chooseRecordingOptions();
    this.#screenRecorder = new MediaRecorder(recordedStream, {
      // Omitted entirely when nothing is supported: passing an unsupported `mimeType` THROWS, and a
      // media.recording that fails to start is worse than one at the browser's default.
      ...(recordingOptions.mimeType ? { mimeType: recordingOptions.mimeType } : {}),
      videoBitsPerSecond: recordingOptions.videoBitsPerSecond,
      audioBitsPerSecond: recordingOptions.audioBitsPerSecond
    });
    this.#screenRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) this.#recordedScreenChunks.push(event.data);
    });
    this.#screenRecorder.addEventListener(
      'stop',
      () => {
        if (this.#media.recordedUrl) URL.revokeObjectURL(this.#media.recordedUrl);
        if (this.#recordedScreenChunks.length === 0) {
          this.#dialogs.alert = 'Nothing was recorded.';
          return;
        }
        const type = this.#screenRecorder?.mimeType || 'video/webm';
        this.#media.recordedUrl = URL.createObjectURL(
          new Blob(this.#recordedScreenChunks, { type })
        );
        this.downloadRecording();
      },
      { once: true }
    );
    // A timeslice, so `dataavailable` fires periodically instead of only at stop. Without it a
    // media.recording lost to a crash or a closed tab is a media.recording with zero chunks.
    this.#screenRecorder.start(1000);
    this.#media.recording = true;
    // The room learns from the server, never from this flag - see `broadcastRecordingState`.
    void this.#broadcastRecordingState(
      'startRec',
      `room-media.recording-${new Date().toISOString()}`
    );
    this.#media.recordingPaused = false;
    this.#media.recordingReminder = true;
    this.#menus.set('recording', false);
  }

  stopRecording() {
    const wasRecording = this.#media.recording;
    if (this.#screenRecorder && this.#screenRecorder.state !== 'inactive')
      this.#screenRecorder.stop();
    // Only announce a stop we actually made: `stopScreenSharing()` calls this unconditionally, and
    // a stop broadcast with no start would clear the badge for a room that is still media.recording.
    if (wasRecording) void this.#broadcastRecordingState('stopRec');
    this.#media.recording = false;
    this.#media.recordingPaused = false;
    this.#media.recordingReminder = false;
  }

  pauseRecording() {
    if (!this.#screenRecorder || this.#screenRecorder.state !== 'recording') return;
    this.#screenRecorder.pause();
    void this.#broadcastRecordingState('pauseRec');
    this.#media.recordingPaused = true;
    this.#media.recordingReminder = true;
    this.#menus.set('recording', false);
  }

  resumeRecording() {
    if (!this.#screenRecorder || this.#screenRecorder.state !== 'paused') return;
    this.#screenRecorder.resume();
    void this.#broadcastRecordingState('resumeRec');
    this.#media.recordingPaused = false;
    this.#media.recordingReminder = false;
    this.#menus.set('recording', false);
  }

  /**
   * Writes the finished media.recording to the user's Downloads folder.
   *
   * Called automatically when the recorder stops, and again from the menu if they want another
   * copy. The extension follows the container the browser actually chose - Chrome gives
   * `video/webm;codecs=...`, Safari `video/mp4` - because naming an mp4 `.webm` produces a file
   * the OS refuses to open.
   */
  downloadRecording() {
    if (!this.#media.recordedUrl) return;
    const type = this.#screenRecorder?.mimeType || 'video/webm';
    const extension = type.includes('mp4') ? 'mp4' : 'webm';
    // `sv-SE` gives `2026-08-05 20:33:41` - ISO-shaped and already local time, so the name sorts
    // chronologically in Finder without any timezone arithmetic.
    const stamp = new Date().toLocaleString('sv-SE').replace(/[: ]/g, '-');
    const link = document.createElement('a');
    link.href = this.#media.recordedUrl;
    link.download = `room-media.recording-${stamp}.${extension}`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async #broadcastRecordingState(cmd: RecordingTransition, recName = '') {
    /*
      THE SPINNER'S MISSING WRITER, added 2026-08-15.

      `recIndicatorStart` — the spinner-plus-REC navbar indicator, consts 92/93/94 — was rendered
      and `media.roomRecordingStarting` was never set by anything, so the branch was unreachable and the
      presenter got no feedback at all between pressing record and the room confirming. Found by
      reading every use of the field while extracting `RoomMedia`: one declaration, one template
      branch, no writer.

      The failure path clears it too, and that half matters as much: a spinner left running on a
      refused command reads as "still starting" for the rest of the session, which is worse than no
      feedback because it is wrong feedback.
    */
    if (cmd === 'startRec') this.#media.roomRecordingRequested();
    try {
      await recordingState({ cmd, recName });
    } catch (error) {
      if (cmd === 'startRec') this.#media.roomRecordingRequestFailed();
      console.error('recordingState', cmd, error);
    }
  }

  /**
   * `showRecPreview()` / `hideRecPreview()`, which in the capture are:
   *
   * ```js
   * showRecPreview(){ if(!roomState.isRecording) return !1;
   *   globals.recPreviewOpen = !0; guiEventBus.emit("reopenRecPreviewWindow") }
   * hideRecPreview(){ if(!roomState.isRecording) return !1;
   *   globals.recPreviewOpen = !1; guiEventBus.emit("closeRecPreviewWindow") }
   * ```
   *
   * There the preview is a separate WINDOW pointed at a server-supplied URL - the server sends
   * `setRecPreview` and the client stores `sessData.recPreviewLocation = i.url`. We have no
   * server-side media.recording and therefore no such URL, so the window shows the local media.recording
   * instead. The window model itself is the capture's.
   *
   * The toggle previously flipped `media.recPreviewOpen` and nothing read it anywhere else in the app:
   * a control that changed its own label and did nothing.
   */
  showRecPreview() {
    if (!this.#media.recordedUrl) return;
    this.#recPreviewWindow?.close();
    this.#recPreviewWindow = window.open(
      this.#media.recordedUrl,
      'RecPreview',
      'width=960,height=600'
    );
    this.#menus.set('recording', false);

    // `window.open` returns null when the popup is blocked. Flipping the label to "Hide" anyway
    // would claim a window that is not there, and staying silent looks like a dead button - which
    // is what the control already was. Say what happened; the file is still on disk either way.
    if (!this.#recPreviewWindow) {
      this.#media.recPreviewOpen = false;
      this.#dialogs.alert =
        'Your browser blocked the preview window. Allow pop-ups for this site, or open the downloaded media.recording from your Downloads folder.';
      return;
    }
    this.#media.recPreviewOpen = true;
  }

  hideRecPreview() {
    this.#recPreviewWindow?.close();
    this.#recPreviewWindow = null;
    this.#media.recPreviewOpen = false;
    this.#menus.set('recording', false);
  }

  /**
   * Starts captioning this peer's speech.
   *
   * Gated as the capture gates it:
   *
   *   "Speech recognition not started: disabled by preferences or session settings"
   *   "Speech recognition not started: mic is muted or not enabled"
   *
   * so it needs the session-level `prefs.doSpeechReco` on and a live microphone - and here, a presenter,
   * because the server refuses `sendSpeechReco` from a member. `prefs.subtitles` is deliberately NOT a
   * gate: that is the per-viewer overlay preference, and a presenter who hides captions on their own
   * screen should still caption for everybody else.
   */
  beginSpeechRecognition() {
    if (
      this.#stopSpeechReco ||
      !this.#isPresenter() ||
      !this.#prefs.doSpeechReco ||
      !this.#mediaTransport.session
    )
      return;

    this.#stopSpeechReco = startSpeechRecognition({
      isMicAlive: () =>
        this.#mediaTransport.microphoneStream?.getAudioTracks()[0]?.readyState === 'live',
      onresult: (result) => {
        void this.#mediaTransport.signalling
          ?.request('sendSpeechReco', result)
          .catch((error: unknown) => console.warn('[captions] a line was not relayed', error));
      },
      onfatal: (reason) => {
        console.warn('[captions] recognition stopped:', reason);
        this.endSpeechRecognition();
      }
    });
  }

  endSpeechRecognition() {
    this.#stopSpeechReco?.();
    this.#stopSpeechReco = null;
  }
}
