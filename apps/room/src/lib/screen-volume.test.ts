import { describe, expect, it } from 'vitest';
import {
  adjustVolumeForPresenter,
  isMutedFor,
  presenterRowId,
  presenterVolumeValue,
  toggleTalkingPresenter,
  volumeIcon,
  type PresenterAudioPreferences
} from './screen-volume';

/*
  The behaviour of the screen overlay's volume control, tested against what the DECODED reference
  component does — `docs/source/components/app-presentationarea.compiled.js:892-954` and
  `…render-helpers.js:264-289`.

  `screen-volume-contract.test.ts` is the other half: it reads those files at runtime and fails if
  the reference stops saying what these expectations assume. This file is the behaviour; that one is
  the pin.
*/

const user = { userID: 42, mediaValue: { name: 'Trendy Jon' } };
const other = { userID: 7, mediaValue: { name: 'Sam' } };

function preferences(
  overrides: Partial<PresenterAudioPreferences> = {}
): PresenterAudioPreferences {
  return { audioMutedFor: {}, audioVolumeFor: {}, ...overrides };
}

describe('volumeIcon', () => {
  it('picks up, down and off on the reference own thresholds', () => {
    expect(volumeIcon(100)).toBe('fa-volume-up');
    expect(volumeIcon(51)).toBe('fa-volume-up');
    expect(volumeIcon(49)).toBe('fa-volume-down');
    expect(volumeIcon(5)).toBe('fa-volume-down');
    expect(volumeIcon(3)).toBe('fa-volume-off');
    expect(volumeIcon(0)).toBe('fa-volume-off');
  });

  it('renders NO icon at exactly 50 and exactly 4', () => {
    /*
      The trap this whole module exists to protect. Every branch in `hSe` is a strict inequality,
      so both boundaries fall through all three and Angular renders `-1` — nothing. Relaxing either
      bound to `>=`/`<=` makes this go green and makes the room diverge from the reference at two
      values a slider passes through on the way to anywhere.
    */
    expect(volumeIcon(50)).toBeNull();
    expect(volumeIcon(4)).toBeNull();
  });
});

describe('presenterRowId', () => {
  it('is built from the ROW INDEX, not the user id', () => {
    // `ei('id', 'talkingPresenter', i, '-donot-disturb')` with `i = n.$index`.
    expect(presenterRowId(0)).toBe('talkingPresenter0-donot-disturb');
    expect(presenterRowId(3)).toBe('talkingPresenter3-donot-disturb');
  });
});

describe('toggleTalkingPresenter', () => {
  it('mutes by STORING AN OBJECT and drops the volume to 0', () => {
    const next = toggleTalkingPresenter(preferences(), user);
    expect(next.preferences.audioMutedFor[42]).toEqual({ name: 'Trendy Jon' });
    expect(next.preferences.audioVolumeFor[42]).toBe(0);
    expect(next.listen).toBe(false);
  });

  it('unmutes by DELETING the key, never by assigning false', () => {
    const muted = preferences({
      audioMutedFor: { 42: { name: 'Trendy Jon' } },
      audioVolumeFor: { 42: 0 }
    });
    const next = toggleTalkingPresenter(muted, user);
    /*
      `delete`, not `= false`. A boolean map renders identically — every read is a truthiness check —
      and is wrong the moment it is persisted, because the key comes back present-and-falsy where the
      reference has no key at all.
    */
    expect(Object.hasOwn(next.preferences.audioMutedFor, '42')).toBe(false);
    expect(next.preferences.audioVolumeFor[42]).toBe(100);
    expect(next.listen).toBe(true);
  });

  it('leaves every other presenter alone and does not mutate its input', () => {
    const before = preferences({ audioMutedFor: { 7: { name: 'Sam' } }, audioVolumeFor: { 7: 0 } });
    const next = toggleTalkingPresenter(before, user);
    expect(next.preferences.audioMutedFor[7]).toEqual({ name: 'Sam' });
    expect(before.audioMutedFor[42]).toBeUndefined();
    expect(isMutedFor(next.preferences, other.userID)).toBe(true);
  });
});

describe('adjustVolumeForPresenter', () => {
  it('stores the RAW slider value and converts only for the element', () => {
    const next = adjustVolumeForPresenter(preferences(), user, '73');
    // `…audioVolumeFor[o] = r` — the string off `event.target.value`, unconverted.
    expect(next.preferences.audioVolumeFor[42]).toBe('73');
    expect(next.elementVolume).toBeCloseTo(0.73, 10);
    expect(next.listen).toBeNull();
  });

  it('dragging to zero mutes, with the same {name} object', () => {
    const next = adjustVolumeForPresenter(preferences(), user, '0');
    expect(next.preferences.audioMutedFor[42]).toEqual({ name: 'Trendy Jon' });
    expect(next.elementVolume).toBe(0);
    expect(next.listen).toBe(false);
  });

  it('dragging above zero unmutes a muted presenter', () => {
    const muted = preferences({ audioMutedFor: { 42: { name: 'Trendy Jon' } } });
    const next = adjustVolumeForPresenter(muted, user, '1');
    expect(Object.hasOwn(next.preferences.audioMutedFor, '42')).toBe(false);
    expect(next.listen).toBe(true);
  });

  it('dragging above zero on an UNMUTED presenter changes no mute state', () => {
    // `r > 0 && …audioMutedFor[o] && (…)` — the second conjunct is why this is not `true`.
    const next = adjustVolumeForPresenter(preferences(), user, '40');
    expect(next.listen).toBeNull();
  });

  it('clamps the element volume, which the DOM would otherwise throw on', () => {
    expect(adjustVolumeForPresenter(preferences(), user, '400').elementVolume).toBe(1);
    expect(adjustVolumeForPresenter(preferences(), user, '-10').elementVolume).toBe(0);
  });
});

describe('presenterVolumeValue', () => {
  it('reads a stored string or number back', () => {
    const stored = preferences({ audioVolumeFor: { 42: '73', 7: 100 } });
    expect(presenterVolumeValue(stored, 42)).toBe(73);
    expect(presenterVolumeValue(stored, 7)).toBe(100);
  });

  it('falls back to the range input own midpoint when nothing is stored', () => {
    expect(presenterVolumeValue(preferences(), 42)).toBe(50);
  });
});
