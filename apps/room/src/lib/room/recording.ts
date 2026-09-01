import { autoRecordAction, type AutoRecordTrigger } from '#lib/auto-record.js';
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
    /**
     * `!sessData.hasSpeechRecognitionDisabled` — the ROOM half of the captions gate.
     *
     * A thunk, because it is read off the loaded page data and the load is replaced on every
     * refetch; a boolean captured at construction would be the value the room opened with.
     */
    speechRecognitionAvailable: () => boolean;
    /**
     * `sessData.autoRecord` and `sessData.dontStopRecOnMicMute` — the two settings that start and
     * stop a recording without being asked. `#lib/auto-record.ts` holds the rules and the citations.
     *
     * A thunk for the reason `speechRecognitionAvailable` is one: both are read off the loaded page
     * data and the load is replaced on every refetch, so a value captured at construction would be
     * whatever the room opened with. An owner un-ticking `autoRecord` mid-session must take effect
     * on the next mute, not on the next reload.
     */
    autoRecordSettings: () => { autoRecord: boolean; dontStopRecOnMicMute: boolean };
  }) {
    this.#dialogs = options.dialogs;
    this.#media = options.media;
    this.#menus = options.menus;
    this.#prefs = options.prefs;
    this.#mediaTransport = options.mediaTransport;
    this.#isPresenter = options.isPresenter;
    this.#speechRecognitionAvailable = options.speechRecognitionAvailable;
    this.#autoRecordSettings = options.autoRecordSettings;

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
  readonly #speechRecognitionAvailable: () => boolean;
  readonly #autoRecordSettings: () => { autoRecord: boolean; dontStopRecOnMicMute: boolean };

  /**
   * Records the shared screen to a file on this machine.
   *
   * NOT what the capture does, and the divergence is deliberate. The original records
   * SERVER-side - `mediaSoupService.startRec(muser)` and
   * `sendServerAdminCommand('startRecMtx', {streams})`, with the server pushing back a `recName`
   * - and the whole bundle contains exactly ONE `new MediaRecorder`, which is the microphone test
   * in the AV settings modal. The original never writes a session recording to your computer.
   * Server-side recording needs the recording/transcoding workers that the deployment plan defers,
   * so this records in the browser instead.
   *
   * Three things were wrong with it:
   *
   *   1. SILENT. `getDisplayMedia({ audio: false })` means `screenStream` carries video only, so
   *      every recording was a silent movie. The presenter's microphone is mixed in below.
   *   2. UNREACHABLE. `media.recordedUrl` is only set by the recorder's `stop` event, which also
   *      sets `media.recording` false - and the menu item that exposed it sat inside that branch.
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
      available and simply never asked for. See `recording-codec.ts` for the full ordering and for
      why 8 Mbps rather than 12: a second 1080p encode competes with the live encoder, and the share
      members are watching matters more than the presenter's own file.
    */
    const recordingOptions = chooseRecordingOptions();
    this.#screenRecorder = new MediaRecorder(recordedStream, {
      // Omitted entirely when nothing is supported: passing an unsupported `mimeType` THROWS, and a
      // A recording that fails to start is worse than one at the browser's default.
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
    // recording lost to a crash or a closed tab is a recording with zero chunks.
    this.#screenRecorder.start(1000);
    this.#media.recording = true;
    // The room learns from the server, never from this flag - see `broadcastRecordingState`.
    void this.#broadcastRecordingState('startRec', `room-recording-${new Date().toISOString()}`);
    this.#media.recordingPaused = false;
    this.#media.recordingReminder = true;
    this.#menus.set('recording', false);
  }

  /**
   * `autoRecord` / `dontStopRecOnMicMute` — a recording that starts and stops on its own.
   *
   * The DECISION is `#lib/auto-record.ts`, which holds all four bundle citations and the two
   * divergences this room's browser-side recorder forces. What is here is the reading of live state
   * and the two calls, because the state lives on `RoomMedia` and the recorder is this class.
   *
   * It is called from the capture rather than observed, and that is the one shape decision worth
   * recording: upstream reacts to `micMuted`, `startTalking` and `startScreenSharing` on two event
   * buses, and this room has no bus. Three explicit calls from `RoomLocalCapture` are the same three
   * events named at the three places they actually happen, which is easier to follow and impossible
   * to subscribe to twice.
   *
   * @param trigger which of the three moments this is.
   */
  autoRecord(trigger: AutoRecordTrigger): void {
    const settings = this.#autoRecordSettings();
    const action = autoRecordAction({
      trigger,
      autoRecord: settings.autoRecord,
      dontStopRecOnMicMute: settings.dontStopRecOnMicMute,
      recording: this.#media.recording,
      micMuted: this.#media.micMuted,
      sharingScreen: this.#media.screenSharing,
      /*
        READ BEFORE THE CALLER REMOVES ITSELF, which is why `micClosed` is raised ahead of
        `stopTalking` at its call site rather than after it. Upstream's `<= 1` counts the muting user,
        because its own subscriber runs before the server's `stopTalking` round trip comes back.
      */
      talkingCount: this.#media.talking.length
    });
    if (action === 'start') this.startRecording();
    else if (action === 'stop') this.stopRecording();
  }

  stopRecording() {
    const wasRecording = this.#media.recording;
    if (this.#screenRecorder && this.#screenRecorder.state !== 'inactive')
      this.#screenRecorder.stop();
    // Only announce a stop we actually made: `stopScreenSharing()` calls this unconditionally, and
    // a stop broadcast with no start would clear the badge for a room that is still recording.
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
   * Writes the finished recording to the user's Downloads folder.
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
    link.download = `room-recording-${stamp}.${extension}`;
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
   * `showRecPreview()` / `hideRecPreview()` — the recording menu's pair, transcribed.
   *
   * ```js
   * showRecPreview(){ if(!this.appService.globals.roomState.isRecording) return !1;
   *   this.appService.globals.recPreviewOpen = !0;
   *   this.appService.guiEventBus.emit("reopenRecPreviewWindow") }
   * hideRecPreview(){ if(!this.appService.globals.roomState.isRecording) return !1;
   *   this.appService.globals.recPreviewOpen = !1;
   *   this.appService.guiEventBus.emit("closeRecPreviewWindow") }
   * ```
   *
   * The emit is not transcribed as a second act because it never is one: `RecordingPreviewCard`
   * reacts to `media.recPreviewOpen`, and upstream the flag and the emit are written in adjacent
   * statements with nothing between them and no other emitter. Its docblock carries the argument.
   *
   * **`roomRecording`, not `recording`.** The guard is `roomState.isRecording` — what the SERVER
   * says the ROOM is doing, which is what the preview frame is a picture of — and not this
   * browser's own `MediaRecorder`. The two are different facts and this class writes only the
   * second one.
   *
   * The `return !1` arms are refusals, not results: nothing upstream reads the value back.
   */
  showRecPreview() {
    if (!this.#media.roomRecording) return;
    this.#media.recPreviewOpen = true;
    this.#menus.set('recording', false);
  }

  hideRecPreview() {
    if (!this.#media.roomRecording) return;
    this.#media.recPreviewOpen = false;
    this.#menus.set('recording', false);
  }

  /**
   * `guiEventBus.emit("closeRecPreviewWindow")` as `recPreviewWindowOnChange` emits it — UNGUARDED.
   *
   * The distinction from `hideRecPreview()` is the whole reason this is a second method. That one
   * is the MENU ENTRY and carries the capture's `if(!isRecording) return !1` refusal; this is the
   * PREFERENCE going off (byte 2,250,601), which reaches `closePreview()` through the bus without
   * passing any such guard. Routing the preference through the guarded method would leave a card on
   * screen whenever the room's recording had already stopped — which is exactly when a presenter is
   * most likely to be turning the setting off.
   *
   * It closes this room's local preview window too, because that window is ours and the preference
   * is the same one: see `showLocalRecPreview`, which refuses to open while it is off.
   */
  closeRecPreviewWindow() {
    this.#media.recPreviewOpen = false;
    this.hideLocalRecPreview();
  }

  /**
   * OURS, and it has no counterpart upstream: a window onto the recording THIS BROWSER just made.
   *
   * The reference has one preview and it is the server's — `recPreviewLocation`, a still frame the
   * recording host writes, shown in the card above. This room also records locally, in the member's
   * own browser, and `media.recordedUrl` is the resulting blob; that recording is invisible to the
   * server and so has no `recPreviewLocation` and no card.
   *
   * It sits beside the transcription rather than replacing it, and the two cannot collide: the
   * card's menu entries are gated on `roomRecording && recPreviewLocation` — a recording in
   * progress on the server — and this one on `recordedUrl`, which the recorder's `stop` handler
   * sets after a local recording has finished. `localPreviewOpen` is its own flag for the same
   * reason: `recPreviewOpen` is the capture's `globals.recPreviewOpen` and means the CARD.
   */
  showLocalRecPreview() {
    if (!this.#media.recordedUrl) return;
    /*
      USM-12's second read. `recPreviewWindow` is the viewer's own "may this open a window at all",
      and it had no reader anywhere in this room until 2026-08-30 — the checkbox that writes it was
      missing from `updateSettingCheck`'s table, which has no fallback, so it persisted nothing.

      Upstream reads the preference to arm the card (`RecordingPreviewCard`, the `ngOnInit` gate)
      and to close it on the way off (`recPreviewWindowOnChange`, byte 2,250,601). Refusing to OPEN
      is this path's own rule and a deliberate one: this window has no arming step to be refused at,
      so a preference whose only effect were closing something already open would do nothing at all
      on the next session.
    */
    if (!this.#prefs.recPreviewWindow) {
      this.#dialogs.alert =
        'The recording preview window is switched off in your settings. Turn "Recording Preview" back on to use it.';
      this.#menus.set('recording', false);
      return;
    }
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
      this.#media.localPreviewOpen = false;
      this.#dialogs.alert =
        'Your browser blocked the preview window. Allow pop-ups for this site, or open the downloaded recording from your Downloads folder.';
      return;
    }
    this.#media.localPreviewOpen = true;
  }

  hideLocalRecPreview() {
    this.#recPreviewWindow?.close();
    this.#recPreviewWindow = null;
    this.#media.localPreviewOpen = false;
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
   *
   * ## "OR SESSION SETTINGS" was quoted here and not implemented, until 2026-08-28
   *
   * The refusal message above names TWO sources and this method gated on one. Upstream:
   *
   *     if (!this.globals.preferences.doSpeechReco || !this.globals.hasSpeechRecognition) return …
   *
   * (byte 1,110,427), where `hasSpeechRecognition` is `!sessData.hasSpeechRecognitionDisabled`
   * (1,147,900). The setting was not on `ROOM_VISIBLE_SETTINGS`, so the room could not ask — and an
   * owner who turned captions off got them anyway, from every presenter, for everybody.
   */
  beginSpeechRecognition() {
    if (
      this.#stopSpeechReco ||
      !this.#isPresenter() ||
      !this.#prefs.doSpeechReco ||
      !this.#speechRecognitionAvailable() ||
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
