import { describe, expect, it } from 'vitest';

import {
  resolveArrivalAnnouncement,
  type ArrivalPreferences,
  type ArrivalRoomSettings
} from './arrival-announcement.js';

/*
  THE FOUR GATES ON A JOIN, EXECUTED.

  Until 2026-08-23 these lived inside `RoomEventStream.subscribe()`, reachable only by constructing
  the whole router around a live `EventSource`. Nothing executed them, and the module they now live
  in says why that mattered: an owner turning arrival popups off for the room, and a presenter
  turning the beep off for themselves, are two different switches that had never been told apart by
  anything but a reading of the code.

  Every case below names the claim from the file's transcription that it holds.
*/

/** Both room flags ON, so a case that turns one off is testing that flag and nothing else. */
const ROOM: ArrivalRoomSettings = { userJoinAndLeavePopup: true, beepOnUserJoin: true };

/** Every viewer preference ON and DND off — the same "nothing suppressed" baseline. */
const PREFS: ArrivalPreferences = {
  popupOnUserJoin: true,
  popupOnUserLeave: true,
  beepOnUserJoin: true,
  beepOnUserLeave: true,
  doNotDisturbOn: false
};

const arriving = (over: Partial<Parameters<typeof resolveArrivalAnnouncement>[0]> = {}) => ({
  direction: 'join' as const,
  nick: 'Dana',
  isSelf: false,
  viewerIsPresenter: true,
  ...over
});

describe('the outer guard — who is told at all', () => {
  it('a MEMBER is told nothing, in either direction', () => {
    /* `globals.isPresenter &&` — the first term of the reference's conjunction. */
    expect(
      resolveArrivalAnnouncement(arriving({ viewerIsPresenter: false }), ROOM, PREFS)
    ).toBeNull();
    expect(
      resolveArrivalAnnouncement(
        arriving({ viewerIsPresenter: false, direction: 'leave' }),
        ROOM,
        PREFS
      )
    ).toBeNull();
  });

  it('your OWN arrival is never announced to you', () => {
    /*
      `user.userXrefID !== i.userXrefID`. Without this, opening the room greets you by name — and a
      presenter reloading a busy room would beep at themselves every time.
    */
    expect(resolveArrivalAnnouncement(arriving({ isSelf: true }), ROOM, PREFS)).toBeNull();
  });

  it('and a presenter watching somebody else IS told', () => {
    // The positive control for the two cases above: without it both could pass on broken code.
    const announcement = resolveArrivalAnnouncement(arriving(), ROOM, PREFS);
    expect(announcement).not.toBeNull();
    expect(announcement?.toast?.message).toBe('Dana logged in.');
    expect(announcement?.sound).toBe('userJoin');
  });
});

describe('the two skins and the two strings', () => {
  it('a join is `info` and reads "logged in."', () => {
    expect(resolveArrivalAnnouncement(arriving(), ROOM, PREFS)?.toast).toEqual({
      kind: 'info',
      message: 'Dana logged in.',
      enableHtml: false
    });
  });

  it('a leave is `warning` and reads "logged out." — a different skin, not one for both', () => {
    expect(
      resolveArrivalAnnouncement(arriving({ direction: 'leave' }), ROOM, PREFS)?.toast
    ).toEqual({
      kind: 'warning',
      message: 'Dana logged out.',
      enableHtml: false
    });
  });

  it('the sound differs by direction too', () => {
    expect(resolveArrivalAnnouncement(arriving(), ROOM, PREFS)?.sound).toBe('userJoin');
    expect(resolveArrivalAnnouncement(arriving({ direction: 'leave' }), ROOM, PREFS)?.sound).toBe(
      'userLeave'
    );
  });
});

describe('two gates per effect, and they are different gates', () => {
  it('the ROOM can turn the popup off and leave the beep alone', () => {
    const announcement = resolveArrivalAnnouncement(
      arriving(),
      { userJoinAndLeavePopup: false, beepOnUserJoin: true },
      PREFS
    );
    expect(announcement?.toast, 'the owner turned popups off for the room').toBeNull();
    expect(announcement?.sound, 'which says nothing about the sound').toBe('userJoin');
  });

  it('the VIEWER can turn the popup off while the room still allows it', () => {
    const announcement = resolveArrivalAnnouncement(arriving(), ROOM, {
      ...PREFS,
      popupOnUserJoin: false
    });
    expect(announcement?.toast).toBeNull();
    expect(announcement?.sound).toBe('userJoin');
  });

  it('the ROOM can turn the beep off and leave the popup alone', () => {
    const announcement = resolveArrivalAnnouncement(
      arriving(),
      { userJoinAndLeavePopup: true, beepOnUserJoin: false },
      PREFS
    );
    expect(announcement?.sound).toBeNull();
    expect(announcement?.toast?.kind).toBe('info');
  });

  it('the VIEWER preference is PER-DIRECTION where the room flag is not', () => {
    /*
      `popupOnUserLeave` off must not silence a JOIN, which is the whole reason four preferences
      exist rather than two. A single `popupOnUserJoin` read on both branches would pass every other
      case in this file.
    */
    const prefs = { ...PREFS, popupOnUserLeave: false, beepOnUserLeave: false };
    const join = resolveArrivalAnnouncement(arriving(), ROOM, prefs);
    expect(join?.toast?.kind, 'the join is untouched').toBe('info');
    expect(join?.sound).toBe('userJoin');

    const leave = resolveArrivalAnnouncement(arriving({ direction: 'leave' }), ROOM, prefs);
    expect(leave?.toast, 'and only the leave is silenced').toBeNull();
    expect(leave?.sound).toBeNull();
  });

  it('an absent room flag is off — the settings blob omits what was never enabled', () => {
    const announcement = resolveArrivalAnnouncement(arriving(), {}, PREFS);
    expect(announcement, 'the outer guard still passed').not.toBeNull();
    expect(announcement?.toast).toBeNull();
    expect(announcement?.sound).toBeNull();
  });
});

describe('the transcribed quirks, which are the reason this is a transcription', () => {
  it('THE LEAVE BEEP READS THE ROOM’S `beepOnUserJoin`, because no leave flag exists', () => {
    /*
      Confirmed twice in the bundle: the handler at byte 2507680 reads `sessData.beepOnUserJoin` on
      both branches, and the settings pane at byte 2230981 renders that same flag for the join row
      AND the leave row. A `beepOnUserLeave` room setting would be an invention.

      So turning the room's join beep off silences the LEAVE beep as well.
    */
    const announcement = resolveArrivalAnnouncement(
      arriving({ direction: 'leave' }),
      { userJoinAndLeavePopup: true, beepOnUserJoin: false },
      PREFS
    );
    expect(announcement?.sound, 'no room flag of its own to keep it alive').toBeNull();
    expect(announcement?.toast?.kind, 'while the popup is unaffected').toBe('warning');
  });

  it('DO NOT DISTURB silences the beep and NOT the popup', () => {
    /*
      `!doNotDisturbOn` sits in the sound conjunction and in neither popup conjunction. It reads like
      an oversight upstream and is reproduced, because the alternative is inventing a behaviour the
      room does not have. `alert-delivery.ts` shows DND suppressing an entire branch, so the
      difference between the two is real and worth pinning.
    */
    const announcement = resolveArrivalAnnouncement(arriving(), ROOM, {
      ...PREFS,
      doNotDisturbOn: true
    });
    expect(announcement?.sound, 'silence').toBeNull();
    expect(announcement?.toast?.message, 'but the toast still appears').toBe('Dana logged in.');
  });
});
