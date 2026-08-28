import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  autoRecordAction,
  type AutoRecordSignal,
  type AutoRecordTrigger
} from '#lib/auto-record.js';

/*
  ── `autoRecord` + `dontStopRecOnMicMute`, AND A BLOCKER THAT DESCRIBED THE WRONG SYSTEM ──────────

  The triage filed this pair as blocked on *"a server-side recorder, which does not exist."* That is
  a true statement about the REFERENCE and an irrelevant one about this room. Upstream's
  `startRecLocal` event is a misnomer — it reaches `mediaSoupService.startRec`, which is
  `socket.emit("cmd", {cmd: "startRecord", muser, mp4})`, an opcode to a recorder on the SFU. This
  room does not have that SFU and never will on the current plan, so `lib/room/recording.ts` records
  in the BROWSER with `MediaRecorder`, deliberately and with the reason written at the method.

  Which means the two settings had a recorder to drive all along. Re-measuring the blocker is what
  found it — the third time in one session, after `altChatRender` and `alertsOverlayOnScreenshare`.

  ## The two divergences, stated rather than discovered

  * **Only this peer's own share is auto-recorded.** Upstream's screenshare trigger fires for any
    member starting one, because its server can record any of them. A `MediaRecorder` here is fed
    from this browser's own `screenStream`.
  * **The start is guarded on not already recording.** Upstream's mic path is not, because the server
    dedupes a second `startRecord` — it even has an `override` confirmation for it. Here a second
    `MediaRecorder` over the same stream would orphan the first and lose its chunks.

  Everything else below is the reference's own, transcribed at bytes 1,116,794 / 1,121,427 /
  1,125,863 / 1,127,013 from the v4 bundle pinned in `docs/source-v4-2026-08-15/sha256sums.txt`.
*/

/** A room with both settings on, one screen shared, a live mic, and not recording. */
const base: AutoRecordSignal = {
  trigger: 'micOpened',
  autoRecord: true,
  dontStopRecOnMicMute: false,
  recording: false,
  micMuted: false,
  sharingScreen: true,
  talkingCount: 1
};

const on = (patch: Partial<AutoRecordSignal>) => autoRecordAction({ ...base, ...patch });

const TRIGGERS: readonly AutoRecordTrigger[] = ['micOpened', 'micClosed', 'screenShared'];

/* ───────────────────────────── the gate on everything ───────────────────────────── */

describe('autoRecord is the gate on all three moments', () => {
  it('does nothing at any of them when the room did not enable it', () => {
    /*
      Read on every one of the three sites, the STOP included. A room with `autoRecord` off never
      auto-stops on a mute either — which is what makes `dontStopRecOnMicMute` inert on its own, and
      is why the two settings cross the boundary together.
    */
    for (const trigger of TRIGGERS) {
      expect(on({ trigger, autoRecord: false, recording: true, micMuted: true })).toBeNull();
    }
  });
});

/* ───────────────────────────── starting ───────────────────────────── */

describe('starting', () => {
  it('starts when this presenter opens their microphone while sharing a screen', () => {
    // `startTalking` for our own user id -> `handleAutoRecordStart` with mediaType "mic".
    expect(on({ trigger: 'micOpened' })).toBe('start');
  });

  it('starts when this presenter begins sharing with their microphone already open', () => {
    expect(on({ trigger: 'screenShared' })).toBe('start');
  });

  it('does NOT start on a share put up in silence', () => {
    /*
      `!this.micMuted` on that path, twice over — at byte 1,121,427 and again in
      `handleAutoRecordStart`'s else branch. The microphone is what drives this feature: the
      recording follows the person talking, and a share put up in silence is not a session yet.
    */
    expect(on({ trigger: 'screenShared', micMuted: true })).toBeNull();
  });

  it('does not start on a microphone opened with nothing being shared', () => {
    // `let i = this.screenSharingUsers[0]; if (!i) return;` — there is nothing to record.
    expect(on({ trigger: 'micOpened', sharingScreen: false })).toBeNull();
    expect(on({ trigger: 'screenShared', sharingScreen: false })).toBeNull();
  });

  it('does not start a SECOND recording over the first', () => {
    /*
      OURS, not upstream's. Its mic path has no such guard because the server dedupes a repeated
      `startRecord`; a second `MediaRecorder` here would be built over the same stream, and the
      chunks already collected by the first would never reach a file.
    */
    expect(on({ trigger: 'micOpened', recording: true })).toBeNull();
    expect(on({ trigger: 'screenShared', recording: true })).toBeNull();
  });

  it('is not affected by dontStopRecOnMicMute, which is a STOP-path setting', () => {
    expect(on({ trigger: 'micOpened', dontStopRecOnMicMute: true })).toBe('start');
  });
});

/* ───────────────────────────── stopping ───────────────────────────── */

describe('stopping', () => {
  const muted = { trigger: 'micClosed' as const, recording: true, micMuted: true };

  it('stops when the last open microphone in the room mutes', () => {
    expect(on({ ...muted, talkingCount: 1 })).toBe('stop');
  });

  it('does NOT stop while somebody else still has an open microphone', () => {
    /*
      `talkingUsers.length <= 1`, and the 1 is the muting user themselves: upstream's subscriber runs
      on a gui event that precedes the server's `stopTalking` round trip, so they are still in the
      array. Its own else branch says so — "not stopping rec as others are speaking".

      `local-capture.svelte.ts` raises `micClosed` BEFORE calling `stopTalking` for exactly this
      reason; this room removes the user synchronously, so reading the count afterwards would be one
      short and would stop a recording on top of whoever is still speaking.
    */
    expect(on({ ...muted, talkingCount: 2 })).toBeNull();
    expect(on({ ...muted, talkingCount: 5 })).toBeNull();
  });

  it('does not stop when the room asked it not to', () => {
    expect(on({ ...muted, dontStopRecOnMicMute: true })).toBeNull();
  });

  it('does not stop a recording that is not running', () => {
    expect(on({ ...muted, recording: false })).toBeNull();
  });

  it('does not stop on a mic event that reports the microphone OPEN', () => {
    /*
      The same subscriber upstream handles both directions — `this.micMuted = !!r` — and only the
      muted case stops. Read as state rather than assumed from the trigger, because the two can
      disagree: a failed re-acquire leaves `micMuted` true on a path that was opening the mic.
    */
    expect(on({ ...muted, micMuted: false })).toBeNull();
  });

  it('never stops on a start trigger, whatever the state', () => {
    for (const trigger of ['micOpened', 'screenShared'] as const) {
      expect(on({ trigger, recording: true, micMuted: true, talkingCount: 1 })).not.toBe('stop');
    }
  });
});

/* ───────────────────────────── the wiring ───────────────────────────── */

describe('the three moments are reported from the capture path', () => {
  const capture = readFileSync(new URL('./room/local-capture.svelte.ts', import.meta.url), 'utf8');

  it('raises all three, and each exactly once', () => {
    for (const trigger of TRIGGERS) {
      expect(capture.split(`this.#autoRecord('${trigger}')`).length - 1, trigger).toBe(1);
    }
  });

  it('raises micClosed BEFORE removing this user from the talking list', () => {
    /*
      THE ORDERING IS THE RULE, and this is the assertion that holds it. Swapping these two lines
      leaves every type check and every other test green, and changes `talkingCount` by one at the
      exact moment the `<= 1` bound is evaluated — so a presenter muting while a co-presenter is
      still speaking would stop the recording on top of them.
    */
    const raised = capture.indexOf("this.#autoRecord('micClosed')");
    const removed = capture.indexOf('this.#media.stopTalking(this.#session().user.id)', raised);
    expect(raised, 'the micClosed trigger must be present').toBeGreaterThan(-1);
    expect(removed, 'stopTalking must follow it in the same branch').toBeGreaterThan(raised);
  });

  it('raises screenShared only after the share reached the room', () => {
    // A recording of a share nobody can see is the one outcome worse than no recording at all.
    const produced = capture.indexOf('await sessionForScreen.produceScreen(');
    const raised = capture.indexOf("this.#autoRecord('screenShared')");
    expect(produced).toBeGreaterThan(-1);
    expect(raised).toBeGreaterThan(produced);
  });

  it('reads both settings fail-closed at the composition root', () => {
    const root = readFileSync(new URL('./room/create-room.svelte.ts', import.meta.url), 'utf8');
    expect(root).toContain('autoRecord: data.sessData?.autoRecord === true');
    expect(root).toContain('dontStopRecOnMicMute: data.sessData?.dontStopRecOnMicMute === true');
  });
});
