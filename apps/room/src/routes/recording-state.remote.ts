import { command } from '$app/server';
import { z } from 'zod';
import { presenterRoom } from '$lib/server/auth';
import { ensureDatabase } from '$lib/server/db';
import { publishToRoom } from '$lib/server/room-events';

/*
  The room's recording state — announced, never inferred.

  `roomState.isRecording` is SERVER state in the capture, not a local flag. The client only ever
  READS it, and the four transitions arrive as events:

  ```js
  appEventBus.subscribe("startRec",  i => { roomState.isRecording = !0; ...recordingStart.play() })
  appEventBus.subscribe("stopRec",   i => { roomState.isRecording = !1; ...recordingStop.play() })
  appEventBus.subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0; ... })
  appEventBus.subscribe("resumeRec", () => { roomState.isRecordingPaused = !1; ... })
  ```

  That is why the `[ REC ]` badge shows to EVERYONE: a member learns the room is being recorded from
  the server, never from their own browser. Ours was once gated on the presenter's local
  `MediaRecorder` flag, so a member's copy was permanently false and the badge never appeared.

  ## Why this is a broadcast and not a row

  Nothing is persisted, and that is the difference from `chat-mode.remote.ts` next to it — the one
  place these two otherwise-identical presenter broadcasts diverge. Recording is MOMENTARY: a member
  who joins after the recorder stopped has missed nothing, and a row would only be a second opinion
  to keep in step with a `MediaRecorder` that can die with the tab that owns it. A disabled chat is a
  standing fact about the room and does get a row.

  ## Ours announces; the capture's server emits

  The capture records server-side — `mediaSoupService.startRec(muser)` and
  `sendServerAdminCommand('startRecMtx', {streams})`, with the server pushing back a `recName` — so
  upstream the SERVER is what emits `startRec`. This room records in the browser, because the
  recording/transcoding workers are deferred, so the presenter announces instead. The SHAPE is the
  capture's and that is the part that matters: every peer, INCLUDING THE ONE THAT SENT IT, learns
  the state from the `cmds` channel rather than from a local flag. There is no optimistic path that
  can leave the presenter believing something the room was never told.
*/

/**
 * `startRec` / `stopRec` / `pauseRec` / `resumeRec` — the presenter's recorder, told to the room.
 *
 * ## `recName` REFUSES where the action truncated
 *
 * The form action this replaced read `String(data.get('recName') ?? '').slice(0, 200)`. A silent
 * truncation is the fallback this repository forbids: it turns a wrong input into a plausible one
 * and tells nobody. `.max(200)` refuses instead, and the bound is unreachable from the UI anyway —
 * the only caller that supplies a name generates it as
 * `room-recording-${new Date().toISOString()}`, which is 39 characters.
 *
 * `recName || undefined` because an empty name must not ride along as `''`. The badge's tooltip
 * reads the field to decide whether it has a name to show at all, and `''` is a name it would then
 * try to render.
 *
 * The client narrows its own parameter to this schema's `cmd` union rather than restating the four
 * strings, so a typo at a call site is a compile error instead of a 400 nobody sees.
 */
export const recordingState = command(
  z.strictObject({
    /*
      Deny by default. An unknown string would be forwarded to every client in the room and
      dispatched by none — a silent no-op, which is worse than a refusal because nothing anywhere
      reports it. Same reasoning as `presenterCommand`'s three subCmds.
    */
    cmd: z.enum(['startRec', 'stopRec', 'pauseRec', 'resumeRec']),
    recName: z.string().max(200).optional()
  }),
  async ({ cmd, recName }) => {
    ensureDatabase();
    publishToRoom(presenterRoom(), {
      channel: 'cmds',
      data: { cmd, recName: recName || undefined }
    });
  }
);
