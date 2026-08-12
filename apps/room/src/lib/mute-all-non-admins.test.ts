import { describe, expect, it } from 'vitest';
import {
  MUTE_ALL_CONFIRM,
  MUTE_STAGGER_MS,
  nonAdminTalkingUsers,
  type RosterAuthority,
  type TalkingEntry
} from './mute-all-non-admins';

/**
 * The truth table for `muteAllNonAdmins`, from
 * `docs/source/components/app-room.full.js:2963-2986`.
 *
 * Every case here corresponds to a line of that method rather than to a shape this room happens to
 * produce, so the test fails if the transcription drifts rather than only if our callers change.
 */

function talker(userID: number, name = `user-${userID}`): TalkingEntry {
  return { userID, mediaValue: { name } };
}

describe('nonAdminTalkingUsers', () => {
  it('selects the ordinary members who are speaking', () => {
    const talking = [talker(1), talker(2)];
    const roster: RosterAuthority[] = [
      { id: 1, isP: false },
      { id: 2, isP: false }
    ];

    expect(nonAdminTalkingUsers(talking, roster).map((entry) => entry.userID)).toEqual([1, 2]);
  });

  it("leaves a presenter talking - 'a' !== l.perms", () => {
    const talking = [talker(1), talker(2)];
    const roster: RosterAuthority[] = [
      { id: 1, isP: true },
      { id: 2, isP: false }
    ];

    expect(nonAdminTalkingUsers(talking, roster).map((entry) => entry.userID)).toEqual([2]);
  });

  /*
    The asymmetry that matters. `l && 'a' !== l.perms` skips a talking user with no roster row
    ENTIRELY - it does not fall through to "not an admin, therefore mute". Muting somebody because
    we could not identify them is the wrong failure, and a roster that has not loaded yet is the
    ordinary way to arrive here.
  */
  it('skips a talking user who has no roster row, rather than assuming they are ordinary', () => {
    const talking = [talker(1), talker(99)];
    const roster: RosterAuthority[] = [{ id: 1, isP: false }];

    expect(nonAdminTalkingUsers(talking, roster).map((entry) => entry.userID)).toEqual([1]);
  });

  it('treats a missing isP as ordinary, because the roster row exists', () => {
    // `perms` absent upstream is not `'a'`, so the row is selected. Present-but-unset is a
    // different case from absent-row above, and they must not collapse into one.
    const talking = [talker(1)];
    const roster: RosterAuthority[] = [{ id: 1 }];

    expect(nonAdminTalkingUsers(talking, roster).map((entry) => entry.userID)).toEqual([1]);
  });

  it('returns nothing when nobody is speaking', () => {
    expect(nonAdminTalkingUsers([], [{ id: 1, isP: false }])).toEqual([]);
  });

  it('returns nothing when the roster is empty - `if (!o || 0 === o.length) return`', () => {
    expect(nonAdminTalkingUsers([talker(1)], [])).toEqual([]);
  });

  it('returns nothing when every speaker is a presenter', () => {
    const talking = [talker(1), talker(2)];
    const roster: RosterAuthority[] = [
      { id: 1, isP: true },
      { id: 2, isP: true }
    ];

    expect(nonAdminTalkingUsers(talking, roster)).toEqual([]);
  });

  /*
    Order is load-bearing: the caller staggers by INDEX, so the returned order decides who is muted
    first. The reference iterates `talkingUsers` and pushes, which preserves that order rather than
    the roster's.
  */
  it('preserves talkingUsers order, not roster order', () => {
    const talking = [talker(3), talker(1), talker(2)];
    const roster: RosterAuthority[] = [
      { id: 1, isP: false },
      { id: 2, isP: false },
      { id: 3, isP: false }
    ];

    expect(nonAdminTalkingUsers(talking, roster).map((entry) => entry.userID)).toEqual([3, 1, 2]);
  });

  it('carries the entry through unchanged, because the command is sent the whole muser', () => {
    const entry = talker(7, 'Dana');
    expect(nonAdminTalkingUsers([entry], [{ id: 7, isP: false }])[0]).toBe(entry);
  });
});

describe('the constants the reference fixes', () => {
  it('staggers 100ms apart', () => {
    expect(MUTE_STAGGER_MS).toBe(100);
  });

  it('asks the capture own question, verbatim', () => {
    expect(MUTE_ALL_CONFIRM).toBe('Mute all non-admin users currently speaking?');
  });
});
