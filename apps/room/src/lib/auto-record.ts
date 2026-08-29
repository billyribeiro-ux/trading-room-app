/**
 * `autoRecord` and `dontStopRecOnMicMute` — when a recording starts and stops without being asked.
 *
 * ## The pair, read whole from the bundle rather than summarised
 *
 * Three read sites for `autoRecord`, one for `dontStopRecOnMicMute`, all four in the browser:
 *
 * ```js
 * // byte 1,116,794 — the guiEventBus "micMuted" subscriber, which fires on BOTH mute and unmute
 * this.micMuted = !!r;
 * globals.roomState.isRecording && this.micMuted && sessData.autoRecord &&
 *   !sessData.dontStopRecOnMicMute &&
 *   (this.talkingUsers.length <= 1
 *     ? this.stopRecForMuser(this.micMuser)
 *     : P("MediaHandlerService micState not stopping rec as others are speaking"))
 *
 * // byte 1,121,427 — inside the "startScreenSharing" subscriber
 * !globals.roomState.isRecording && !this.micMuted && sessData.autoRecord &&
 *   (… || (r.isRec = !0, this.isRecording = !0, this.handleAutoRecordStart(r)))
 *
 * // byte 1,125,863 — inside the "startTalking" subscriber, for OUR OWN user
 * globals.user.id == r.userID
 *   ? (this.micMuser = r, sessData.autoRecord && this.handleAutoRecordStart(r))
 *   : this.mediaSoupService.startListeningToPresenter(r)
 *
 * // byte 1,127,013
 * handleAutoRecordStart(e) {
 *   if ("mic" == e.mediaType) {
 *     let i = this.screenSharingUsers[0];
 *     if (!i) return;
 *     1 == this.screenSharingUsers.length || P("TODO!!! select which screen to record...");
 *     this.appEventBus.emit("startRecLocal", i);
 *   } else this.micMuted || this.appEventBus.emit("startRecLocal", e);
 * }
 * ```
 *
 * Two things fall out of reading it rather than the setting names:
 *
 * 1. **`autoRecord` is the gate on the STOP as well as on the start.** A room with `autoRecord` off
 *    never auto-stops on a mute either, no matter what `dontStopRecOnMicMute` says — so the second
 *    setting is inert on its own, and a UI that presents them as independent is misleading. That is
 *    upstream's shape and it is reproduced.
 * 2. **`talkingUsers.length <= 1` means "nobody ELSE has an open mic".** The subscriber runs before
 *    the server's `stopTalking` round trip removes this user, so the muting user is still counted.
 *    See {@link AutoRecordSignal.talkingCount} — getting this off by one stops a recording while
 *    somebody is still speaking, which is the failure the message in that branch is about.
 *
 * ## What this room records, and the divergence that forces
 *
 * The reference's `startRecLocal` is a misnomer: it reaches `mediaSoupService.startRec`, which is
 * `socket.emit("cmd", {cmd: "startRecord", muser, mp4})` — a SERVER-side recorder. This room has no
 * such server and records in the browser with `MediaRecorder` instead, a divergence
 * `#lib/room/recording.ts` already made and documented for the manual button. Two consequences, both
 * stated rather than discovered:
 *
 * * **Only THIS peer's own share can be auto-recorded.** Upstream's screenshare trigger fires for any
 *   member starting a share, because its server can record any of them. A `MediaRecorder` here is fed
 *   from `screenStream`, which is this browser's own capture.
 * * **The start is guarded on not already recording, which upstream's mic path is not.** Upstream can
 *   send `startRecord` twice because the server dedupes it — it even has an `override` confirmation
 *   for the second one. Calling `startRecording()` twice here would build a second `MediaRecorder`
 *   over the same stream and orphan the first, so its chunks would be lost.
 */

/** Which of the three events upstream reacts to has just happened. */
export type AutoRecordTrigger =
  /** This peer opened their own microphone — upstream's `startTalking` for our own user id. */
  | 'micOpened'
  /** This peer closed their own microphone — upstream's `micMuted` gui event with a true payload. */
  | 'micClosed'
  /** This peer began sharing a screen — upstream's `startScreenSharing`, narrowed to us. */
  | 'screenShared';

/** Everything the two rules read, at the moment the trigger fired. */
export interface AutoRecordSignal {
  readonly trigger: AutoRecordTrigger;
  /** `sessData.autoRecord`. */
  readonly autoRecord: boolean;
  /** `sessData.dontStopRecOnMicMute`. Read only on the stop path, and only when `autoRecord` is on. */
  readonly dontStopRecOnMicMute: boolean;
  /** `globals.roomState.isRecording` — this browser's own recorder, here. */
  readonly recording: boolean;
  /** `this.micMuted`, AFTER the trigger has been applied. */
  readonly micMuted: boolean;
  /** Whether this peer currently has a screen to record. Upstream reads `screenSharingUsers[0]`. */
  readonly sharingScreen: boolean;
  /**
   * `talkingUsers.length` — how many microphones are open, INCLUDING this one on a `micClosed`.
   *
   * The caller must read this BEFORE removing itself from the list. Upstream's subscriber runs on a
   * gui event that precedes the server's `stopTalking` round trip, so the muting user is still in
   * the array when `<= 1` is evaluated; reading it after a local removal turns "nobody else is
   * talking" into "somebody else is", and the recording stops on top of them.
   */
  readonly talkingCount: number;
}

/** What to do about it. `null` is the common answer and is not a failure. */
export type AutoRecordAction = 'start' | 'stop' | null;

/**
 * The whole of both settings, as one decision.
 *
 * A function rather than three branches spread across the capture path, because the two settings
 * interact — `dontStopRecOnMicMute` does nothing unless `autoRecord` is on — and an interaction
 * split across three call sites is one that gets half-changed.
 */
export function autoRecordAction(signal: AutoRecordSignal): AutoRecordAction {
  // The gate on ALL THREE sites, the stop included. Upstream reads it on every one of them.
  if (!signal.autoRecord) return null;

  if (signal.trigger === 'micClosed') {
    if (!signal.recording) return null;
    /*
      `!!r` in the subscriber — the same handler runs for an unmute, and only the muted case stops.
      Kept as a read of the state rather than assumed from the trigger, because the two can disagree:
      a failed re-acquire leaves `micMuted` true on a path that was trying to open the microphone.
    */
    if (!signal.micMuted) return null;
    if (signal.dontStopRecOnMicMute) return null;
    // "…not stopping rec as others are speaking" — see `talkingCount` for what the 1 counts.
    if (signal.talkingCount > 1) return null;
    return 'stop';
  }

  /*
    Both start paths need a screen: upstream's mic path returns early on `screenSharingUsers[0]`
    being absent, and its screen path is only reachable from a share beginning. `startRecording()`
    refuses without one anyway, so this is the rule agreeing with the recorder rather than the
    recorder silently absorbing a wrong decision.
  */
  if (!signal.sharingScreen) return null;
  // Ours, not upstream's — see the module header on why a second `MediaRecorder` loses chunks.
  if (signal.recording) return null;

  /*
    `!this.micMuted` on the screenshare path, twice over: once at byte 1,121,427 and again in
    `handleAutoRecordStart`'s else branch. A muted presenter starting a share does NOT start a
    recording, which is what makes the mic the thing that drives this feature — the recording follows
    the person talking, and a share put up in silence is not a session yet.

    Not applied to `micOpened`, where the microphone has just been opened and the flag is false by
    construction; asserting it there would be a tautology, and reading it would be a race.
  */
  if (signal.trigger === 'screenShared' && signal.micMuted) return null;

  return 'start';
}
