// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomPrefs } from './prefs.svelte';
import { RoomVolume } from './volume.svelte';

/*
  The room's volumes, executed rather than read as text.

  `screen-volume-contract.test.ts` already covers the pure transitions in `$lib/screen-volume` and
  the overlay that renders them, and it kept passing through this extraction because it never
  asserted on the page's wiring. What it cannot see is the part that moved: that reading
  `roomVolume.volume` in a template re-runs when the slider moves, and that muting still reaches the
  two preferences the reference makes it reach.
*/

const make = (settings = '{}') => {
  const persisted: [string, unknown][] = [];
  let playing = false;
  const prefs = new RoomPrefs(settings, { persist: (key, value) => persisted.push([key, value]) });
  const roomVolume = new RoomVolume({ prefs, soundCloudPlaying: () => playing });
  return { roomVolume, prefs, persisted, setPlaying: (next: boolean) => (playing = next) };
};

describe('the seeded levels', () => {
  it('starts at 100 for the master and 70 for the background', () => {
    const { roomVolume } = make();
    expect(roomVolume.volume).toBe(100);
    expect(roomVolume.backgroundVolume).toBe(70);
  });

  it('reads the persisted per-presenter maps through the preferences class', () => {
    /*
      Strict about SHAPE rather than coercing: an entry that is not a `{name}` object is dropped
      instead of becoming a truthy placeholder that would mute a presenter nobody muted.
    */
    const { roomVolume } = make(
      '{"audioMutedFor":{"7":{"name":"Ada"},"8":"not an object"},"audioVolumeFor":{"7":"40"}}'
    );
    expect(roomVolume.presenterAudio.audioMutedFor).toEqual({ 7: { name: 'Ada' } });
    expect(roomVolume.presenterAudio.audioVolumeFor).toEqual({ 7: '40' });
  });
});

describe('muting reaches the preferences the reference makes it reach', () => {
  it('the NAVBAR toggle sets do-not-disturb and subtitles, and remembers the level', () => {
    /*
      `app-room`'s `mute()`/`unmute()` pair, which is the longer of the two: it drags
      `preferences.doNotDisturbOn`, `preferences.subtitles` and the background music along with the
      master level. The screen overlay's pair is deliberately shorter — see `muteScreenAudio`.
    */
    const { roomVolume, prefs } = make();
    roomVolume.toggleMute();

    expect(roomVolume.volume).toBe(0);
    expect(prefs.doNotDisturbOn, 'muting must raise do-not-disturb').toBe(true);
    expect(prefs.subtitles, 'muting must turn captions on').toBe(true);

    roomVolume.toggleMute();
    expect(roomVolume.volume, 'unmuting must restore the level it remembered').toBe(100);
    expect(prefs.doNotDisturbOn).toBe(false);
    expect(prefs.subtitles).toBe(false);
  });

  it('the SCREEN OVERLAY pair is the shorter one, but inherits the caption line', () => {
    /*
      MY FIRST VERSION OF THIS TEST ASSERTED THE OPPOSITE AND WAS WRONG, which is worth leaving in
      the record because the source had already answered it.

      `app-presentationarea`'s own `mute()` is genuinely the shorter of the two — it sets the level
      and `doNotDisturbOn` and stops, where `app-room`'s additionally drags `subtitles` and the
      background music. So "the overlay does not touch captions" reads like the right assertion.

      It is not, because the overlay reaches captions TRANSITIVELY: `muteScreenAudio` calls
      `setMasterVolume`, and that function carries `subtitles = true` at zero — a divergence the
      class records in as many words, taken because splitting it would mean two master-volume paths
      over one piece of state.

      So this asserts what the room actually does and names why. The part that IS still shorter is
      the background music, which `muteScreenAudio` leaves alone and `toggleMute` does not.
    */
    const { roomVolume, prefs } = make();
    prefs.subtitles = false;
    roomVolume.muteScreenAudio();

    expect(roomVolume.volume).toBe(0);
    expect(prefs.doNotDisturbOn).toBe(true);
    expect(prefs.subtitles, 'captions come from setMasterVolume, not from the overlay').toBe(true);
    expect(
      roomVolume.backgroundVolume,
      'the overlay must NOT drag the background music, which is what makes it the shorter pair'
    ).toBe(70);
  });

  it('setMasterVolume forces captions on at zero, which is the one divergence', () => {
    // Written from `app-room`'s `adjustVol`; `app-presentationarea`'s has no such line. Two master
    // volume paths over one piece of state would be worse than the one line of drift.
    const { roomVolume, prefs } = make();
    prefs.subtitles = false;
    roomVolume.setMasterVolume(0);
    expect(prefs.subtitles).toBe(true);
  });
});

describe('the per-presenter pair persists on every change', () => {
  it('a toggle writes BOTH maps through prefs.save', () => {
    /*
      The reference calls `setPreference('audioMutedFor', …)` and `setPreference('audioVolumeFor', …)`
      on every toggle and every drag. After slice 3 there is no other way to write a preference, so
      a regression here cannot silently skip persistence — it cannot compile.
    */
    const { roomVolume, persisted } = make();
    roomVolume.toggleTalkingPresenterAudio({ userID: 7, mediaValue: { name: 'Ada' } });
    expect(persisted.map(([key]) => key)).toEqual(['audioMutedFor', 'audioVolumeFor']);
  });

  it('a slider drag writes both as well', () => {
    const { roomVolume, persisted } = make();
    roomVolume.adjustPresenterVolume({ userID: 7, mediaValue: { name: 'Ada' } }, '40');
    expect(persisted.map(([key]) => key)).toEqual(['audioMutedFor', 'audioVolumeFor']);
  });
});

describe('it is actually reactive — one assertion per exposed getter', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it, for the reasons
    `room-mtx.svelte.test.ts` records. Three getters, three assertions: a wiring that made `volume`
    reactive and left `presenterAudio` stale would pass one test and still render a muted presenter
    as unmuted.
  */
  it('re-runs a reader when the master level moves', () => {
    const { roomVolume } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(roomVolume.volume);
      });
      flushSync();
      roomVolume.setMasterVolume(30);
      flushSync();
    });
    stop();
    expect(seen, 'the master volume getter is not reactive').toEqual([100, 30]);
  });

  it('re-runs a reader when the background level moves', () => {
    const { roomVolume } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(roomVolume.backgroundVolume);
      });
      flushSync();
      roomVolume.setBackgroundVolume(20);
      flushSync();
    });
    stop();
    expect(seen, 'the background volume getter is not reactive').toEqual([70, 20]);
  });

  it('re-runs a reader when a presenter is muted', () => {
    const { roomVolume } = make();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(Object.keys(roomVolume.presenterAudio.audioMutedFor).length);
      });
      flushSync();
      roomVolume.toggleTalkingPresenterAudio({ userID: 7, mediaValue: { name: 'Ada' } });
      flushSync();
    });
    stop();
    expect(seen.at(-1), 'the presenter map getter is not reactive').toBe(1);
    expect(seen.length, 'the effect did not re-run').toBeGreaterThan(1);
  });
});
