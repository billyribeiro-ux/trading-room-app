import { describe, expect, it } from 'vitest';

import { arrivalSoundFor, type ArrivalSoundInput } from './chat-arrival-sound.js';

/**
 * The arrival-sound rule, and the two upstream defects it does not reproduce.
 *
 * Transcribed at bytes 1,431,949 and 2,378,381; the module carries the source and the argument.
 * `pling` is the FOLLOWED-user sound and `followed` is the ordinary ding — the reference's own
 * naming, and it is backwards, so every assertion below names the sound explicitly.
 */
const SILENT: ArrivalSoundInput = {
  doNotDisturb: false,
  chatSoundOn: true,
  followedSenderPlaysSound: false,
  dingOnNewMessage: false,
  senderEmailHash: 'hash-sender',
  chatSoundForEmailHashes: []
};

const sound = (over: Partial<ArrivalSoundInput> = {}) => arrivalSoundFor({ ...SILENT, ...over });

describe('the outer gate', () => {
  it('is silent for a member who configured neither ding', () => {
    expect(sound()).toBeNull();
  });

  it('do-not-disturb beats everything, including a followed user', () => {
    expect(sound({ doNotDisturb: true, followedSenderPlaysSound: true })).toBeNull();
    expect(sound({ doNotDisturb: true, dingOnNewMessage: true })).toBeNull();
  });

  it('chat sound off is silent too', () => {
    expect(sound({ chatSoundOn: false, followedSenderPlaysSound: true })).toBeNull();
    expect(sound({ chatSoundOn: false, dingOnNewMessage: true })).toBeNull();
  });
});

describe('which sound', () => {
  it('a followed user plays PLING, not the ordinary ding', () => {
    expect(sound({ followedSenderPlaysSound: true })).toBe('pling');
  });

  /*
    …and it wins even when the room-wide ding and the list would both fire. The follow style is a
    per-user preference and it is the only branch that outranks the room.
  */
  it('and a followed user wins over both other reasons', () => {
    expect(
      sound({
        followedSenderPlaysSound: true,
        dingOnNewMessage: true,
        chatSoundForEmailHashes: ['hash-sender']
      })
    ).toBe('pling');
  });

  it('the room-wide ding plays FOLLOWED, which is the confusing name', () => {
    expect(sound({ dingOnNewMessage: true })).toBe('followed');
  });

  it('a sender on the per-member list plays it too, with no room-wide ding at all', () => {
    expect(sound({ chatSoundForEmailHashes: ['hash-sender'] })).toBe('followed');
  });

  it('and a sender who is NOT on the list, with no room ding, stays silent', () => {
    expect(sound({ chatSoundForEmailHashes: ['hash-somebody-else'] })).toBeNull();
  });
});

/*
  ── THE TWO UPSTREAM DEFECTS ──────────────────────────────────────────────────────────────────

  Both are real, both are silent, and both are what this rule exists in a module to keep fixed.
*/
describe('the defects this does not reproduce', () => {
  /*
    Upstream reads `followedUsers[e.avt].followChatStyle.playSound` after checking only that the map
    is NON-EMPTY. For a member who follows anybody, every message from a non-followed sender throws
    `undefined.followChatStyle`, the `try/catch` swallows it, and the ding never plays.

    Here the lookup is resolved OPTIONALLY at the call site and this function takes the answer, so
    "the sender is not followed" is `false` rather than an exception.
  */
  it('a non-followed sender still dings for a member who follows somebody', () => {
    expect(sound({ followedSenderPlaysSound: false, dingOnNewMessage: true })).toBe('followed');
  });

  /** A missing hash is a frame that carried none — silence, not a throw and not a match. */
  it('survives a message with no sender hash', () => {
    expect(sound({ senderEmailHash: undefined, chatSoundForEmailHashes: ['x'] })).toBeNull();
    // …and the room-wide ding still works for it, because that branch does not need the hash.
    expect(sound({ senderEmailHash: undefined, dingOnNewMessage: true })).toBe('followed');
  });

  it('survives a room that sent no list at all', () => {
    expect(sound({ chatSoundForEmailHashes: undefined })).toBeNull();
    expect(sound({ chatSoundForEmailHashes: undefined, dingOnNewMessage: true })).toBe('followed');
  });
});
