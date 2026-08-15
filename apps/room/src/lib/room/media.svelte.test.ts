// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomMedia, type TalkingUser } from './media.svelte';

/*
  The eighth and last of the Phase 1 state classes. The reactivity block at the bottom is the only
  gate that can see the thing most likely to go wrong — mutations and flushes INSIDE `$effect.root`,
  assertions OUTSIDE.
*/

const speaker = (userID: number, name = `user${userID}`): TalkingUser => ({
  userID,
  mediaValue: { name }
});

describe('the defaults, which are the safe direction rather than a preference', () => {
  it('opens muted on both devices', () => {
    // A room that opened with a live microphone would be broadcasting before the viewer had looked
    // at the screen.
    const media = new RoomMedia();
    expect([media.micMuted, media.camMuted]).toEqual([true, true]);
  });

  it('and with the recording preview CLOSED', () => {
    /*
      `this.recPreviewOpen = !1` in the capture's globals. Ours defaulted to TRUE, so the menu
      opened saying "Hide Rec Preview" with nothing shown.
    */
    expect(new RoomMedia().recPreviewOpen).toBe(false);
  });

  it('and with no ICE servers, which means "not connected yet" rather than "none"', () => {
    const media = new RoomMedia();
    expect(media.iceServers).toEqual([]);
    expect(media.connected).toBe(false);
  });
});

describe('who has a microphone open', () => {
  it('nobody, until a producer is announced', () => {
    const media = new RoomMedia();
    expect(media.anyoneTalking).toBe(false);
  });

  it('one open microphone makes the indicator true and keeps it true', () => {
    /*
      "Talking" here means UNMUTED, not making sound — that is what the capture sends, on
      `presUnmuted` / `presMuted`. Pausing between sentences must not flip the indicator back to
      " ( No one is speaking )".
    */
    const media = new RoomMedia();
    media.startTalking(speaker(1));
    expect(media.anyoneTalking).toBe(true);
    expect(media.talking.map((user) => user.mediaValue.name)).toEqual(['user1']);
  });

  it('the same person twice is ONE entry', () => {
    /*
      A re-negotiation or a second tab announces a second producer for the same person, and the
      indicator lists PEOPLE. Without the de-duplication the same name appears twice in
      " ( X is speaking )".
    */
    const media = new RoomMedia();
    media.startTalking(speaker(1));
    media.startTalking(speaker(1, 'user1 again'));
    expect(media.talking).toHaveLength(1);
    expect(media.talking[0]?.mediaValue.name, 'the first wins').toBe('user1');
  });

  it('and closing one microphone leaves the others', () => {
    const media = new RoomMedia();
    media.startTalking(speaker(1));
    media.startTalking(speaker(2));
    media.stopTalking(1);

    expect(media.talking.map((user) => user.userID)).toEqual([2]);
    expect(media.anyoneTalking, 'somebody is still unmuted').toBe(true);

    media.stopTalking(2);
    expect(media.anyoneTalking).toBe(false);
  });

  it('stopping somebody who was never talking is a no-op, not a throw', () => {
    // `producerClosed` can arrive for a producer that was already reaped on a reconnect.
    const media = new RoomMedia();
    media.startTalking(speaker(1));
    media.stopTalking(99);
    expect(media.talking).toHaveLength(1);
  });
});

describe('the ROOM’s recording, which is not this browser’s', () => {
  it('starting records the name and clears the spinner', () => {
    const media = new RoomMedia();
    media.roomRecordingRequested();
    expect(media.roomRecordingStarting).toBe(true);

    media.roomRecordingStarted('room-recording-2026');
    expect(media.roomRecording).toBe(true);
    expect(media.roomRecordingName).toBe('room-recording-2026');
    expect(media.roomRecordingStarting, 'a spinner that outlives the answer spins forever').toBe(
      false
    );
  });

  it('a FAILED request clears the spinner too', () => {
    /*
      The half that is easy to leave out. A spinner left running on a refused or dropped command
      reads as "still starting" for the rest of the session, which is worse than no feedback because
      it is wrong feedback.
    */
    const media = new RoomMedia();
    media.roomRecordingRequested();
    media.roomRecordingRequestFailed();
    expect(media.roomRecordingStarting).toBe(false);
    expect(media.roomRecording, 'and nothing started').toBe(false);
  });

  it('stopping clears the NAME, so a stale tooltip cannot outlive the recording', () => {
    const media = new RoomMedia();
    media.roomRecordingStarted('room-recording-2026');
    media.roomRecordingStopped();

    expect(media.roomRecording).toBe(false);
    expect(media.roomRecordingName).toBe('');
    expect(media.roomRecordingPaused).toBe(false);
  });

  it('pause and resume touch ONE field and leave the name alone', () => {
    /*
      Why these are their own method rather than one bundled setter: a pause frame that restated a
      stale `recName` would blank the tooltip mid-recording, and the caller has no reason to know
      the name in order to pause.
    */
    const media = new RoomMedia();
    media.roomRecordingStarted('room-recording-2026');

    media.roomRecordingPauseChanged(true);
    expect([media.roomRecordingPaused, media.roomRecording]).toEqual([true, true]);
    expect(media.roomRecordingName).toBe('room-recording-2026');

    media.roomRecordingPauseChanged(false);
    expect(media.roomRecordingPaused).toBe(false);
  });

  it('and a restart clears a paused flag left over from the previous one', () => {
    const media = new RoomMedia();
    media.roomRecordingStarted('first');
    media.roomRecordingPauseChanged(true);
    media.roomRecordingStopped();
    media.roomRecordingStarted('second');
    expect(media.roomRecordingPaused, 'a fresh recording is not paused').toBe(false);
  });
});

describe('limited-presenter status, granted and taken away', () => {
  it('is false on arrival, every time', () => {
    // Runtime state, not a stored flag. It was a column on `users`, which invented durable state
    // for something the capture treats as transient.
    expect(new RoomMedia().limitedPresenter).toBe(false);
  });

  it('follows the grant in both directions', () => {
    // `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give` — one
    // statement, so there is no third state to get stuck in.
    const media = new RoomMedia();
    media.micScreenGranted(true);
    expect(media.limitedPresenter).toBe(true);
    media.micScreenGranted(false);
    expect(media.limitedPresenter).toBe(false);
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  it('re-runs a reader as a microphone opens and closes', () => {
    const media = new RoomMedia();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(media.anyoneTalking);
      });
      flushSync();
      media.startTalking(speaker(1));
      flushSync();
      media.stopTalking(1);
      flushSync();
    });
    stop();

    expect(seen, 'the speaking indicator is not reactive').toEqual([false, true, false]);
  });

  it('and a SECOND speaker does not re-run a reader of the derived flag', () => {
    /*
      `anyoneTalking` is `$derived` over the list's length, so a second person unmuting leaves it
      `true` and — per push-pull reactivity — downstream is skipped. Counted rather than asserted on
      the value, because the value is what stays the same.
    */
    const media = new RoomMedia();
    let runs = 0;

    const stop = $effect.root(() => {
      $effect(() => {
        void media.anyoneTalking;
        runs += 1;
      });
      flushSync();
      media.startTalking(speaker(1));
      flushSync();
      media.startTalking(speaker(2));
      flushSync();
    });
    stop();

    expect(runs, 'false -> true is one change; the second speaker is none').toBe(2);
  });

  it('and as the room reports a recording, which every member’s navbar reads', () => {
    const media = new RoomMedia();
    const seen: string[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(media.roomRecordingName);
      });
      flushSync();
      media.roomRecordingStarted('room-recording-2026');
      flushSync();
      media.roomRecordingStopped();
      flushSync();
    });
    stop();

    expect(seen, 'the recording name is not reactive').toEqual(['', 'room-recording-2026', '']);
  });

  it('and as the microphone is muted, which every control on the bar follows', () => {
    const media = new RoomMedia();
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(media.micMuted);
      });
      flushSync();
      media.micMuted = false;
      flushSync();
    });
    stop();

    expect(seen, 'the mic flag is not reactive').toEqual([true, false]);
  });
});
