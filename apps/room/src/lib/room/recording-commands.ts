/**
 * The four room-recording commands, and the SOUND each one plays.
 *
 * ## Why a table, and why it is better than the four handlers it replaces
 *
 * `events.svelte.ts` dispatched `startRec` / `stopRec` / `pauseRec` / `resumeRec` as four
 * near-identical blocks — a media call, then the same `!doNotDisturbOn && <preference>` test, then a
 * sound. Twenty-four lines saying one thing four times.
 *
 * The reason to collapse them is not the line count. It is that the capture has TWO QUIRKS in
 * exactly this mapping, and prose was the only thing recording them:
 *
 *   subscribe("pauseRec",  () => { isRecordingPaused = !0;
 *     !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStop.play() })
 *   subscribe("resumeRec", () => { isRecordingPaused = !1;
 *     !prefs.doNotDisturbOn && prefs.recordingStopSound && recordingStart.play() })
 *
 * **`resumeRec` plays the START sound behind the STOP preference.** A member who turned the stop
 * sound off hears nothing on resume; a member who turned it on hears the start chime. That is
 * upstream's, it is almost certainly a typo in a codebase nobody here can change, and it is kept —
 * so it needs to be somewhere a reader cannot skim past. In a table the `resumeRec` row visibly
 * disagrees with its neighbours; in four separate blocks it is one word in the middle of the fourth.
 *
 * The second quirk stays in `events.svelte.ts` where the media calls are: pause and resume do not
 * check `videoOnlyMode`, where start and stop do.
 */
export interface RoomRecordingCommand {
  /** Which sound effect fires. */
  readonly sound: 'recordingStart' | 'recordingStop';
  /**
   * Which PREFERENCE gates it — deliberately not derivable from `sound`, which is the whole point:
   * `resumeRec` pairs the start sound with the stop preference.
   */
  readonly preference: 'recordingStartSound' | 'recordingStopSound';
}

export const ROOM_RECORDING_COMMANDS: Readonly<Record<string, RoomRecordingCommand>> = {
  startRec: { sound: 'recordingStart', preference: 'recordingStartSound' },
  stopRec: { sound: 'recordingStop', preference: 'recordingStopSound' },
  pauseRec: { sound: 'recordingStop', preference: 'recordingStopSound' },
  /* The quirk. Start sound, stop preference — upstream's, and kept. */
  resumeRec: { sound: 'recordingStart', preference: 'recordingStopSound' }
};
