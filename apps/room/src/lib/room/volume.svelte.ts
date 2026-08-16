import {
  adjustVolumeForPresenter,
  toggleTalkingPresenter,
  type PresenterAudioPreferences,
  type TalkingPresenter as PresenterAudioUser
} from '$lib/screen-volume';
import { setSoundEffectsVolume } from '$lib/sound-effects';
import type { RoomPrefs } from './prefs.svelte';

/*
  Every volume the room has: the master level, the background music, and the per-presenter pair.

  Phase 5 slice 4b, taken ahead of the media transport because the Group B slices do not depend on
  each other and a small self-contained one banks verified progress. It is also the FIRST slice to
  depend on another, which is the seam `RoomPrefs` was built for.

  ## Why it takes RoomPrefs rather than a callback

  `mute()` and `unmute()` set `preferences.doNotDisturbOn` in the reference itself — that is
  captured behaviour, not a coupling invented here — and `app-room`'s pair additionally drags
  `subtitles` and the background music along with it. Those two are among the only preferences that
  KEEP a public setter after slice 3, and this class is one of the two reasons they do.

  The per-presenter mute and volume go the other way, through `prefs.save`, because the reference
  persists them on every toggle and every drag — and because after slice 3 there is no other way to
  write a preference at all.

  ## What stays outside

  `soundCloudPlaying` is read as a THUNK. It belongs to `RoomMedia`, it changes while this class
  is alive, and a value copied at construction would leave the SoundCloud widget at whatever level
  the room happened to load with.

  The DOM writes stay here deliberately. `adjustVol` reaches for `[id^=msRemAudio-]` by that exact
  prefix, which is the id this room emits per remote microphone; that is a captured contract rather
  than an implementation detail, and hiding it behind an abstraction would lose the citation.
*/
export class RoomVolume {
  readonly #prefs: RoomPrefs;
  readonly #soundCloudPlaying: () => boolean;
  #volume;
  #previousVolume;
  #backgroundVolume;
  #presenterAudio;

  constructor(options: { prefs: RoomPrefs; soundCloudPlaying: () => boolean }) {
    this.#prefs = options.prefs;
    this.#soundCloudPlaying = options.soundCloudPlaying;
    /* The seeds read the same decoded blob every other preference reads, through the class that
       owns it — there is no second copy of `settings_json` anywhere. */

    this.#volume = $state(100);

    this.#previousVolume = $state(100);

    /*
      There is no `muted` flag here, deliberately.

      `setMasterVolume` used to keep one in step with the slider, and nothing ever read it: every
      consumer derives the same answer instead, and the screen panes are passed `muted={volume === 0}`
      directly. Two places holding one fact is the shape that goes stale — the day someone sets
      `volume` without going through `setMasterVolume`, the flag is wrong and the panes are right.

      The first attempt at this deleted the declaration alone and broke the build, because the WRITE
      was real. The rule reports "assigned but never READ", which is not the same as unreferenced.
    */
    this.#backgroundVolume = $state(70);

    /**
     * `preferences.audioMutedFor` and `preferences.audioVolumeFor` — per-presenter audio, persisted.
     *
     * `$state.raw`, not `$state`: every transition in `$lib/screen-volume` REPLACES both maps, so a
     * deep proxy would cost a proxy per key and buy nothing.
     *
     * Seeded from the same stored settings every other preference here is seeded from. The reference
     * persists exactly these two keys, through `setPreference('audioMutedFor', …)` and
     * `setPreference('audioVolumeFor', …)`, on every toggle and every drag.
     */
    // The stored settings are the intentional one-time seed for editable client preference state.
    this.#presenterAudio = $state.raw<PresenterAudioPreferences>({
      audioMutedFor: this.#readPresenterMuteMap(this.#prefs.loaded.audioMutedFor),
      audioVolumeFor: this.#readPresenterVolumeMap(this.#prefs.loaded.audioVolumeFor)
    });
  }

  get volume() {
    return this.#volume;
  }

  get backgroundVolume() {
    return this.#backgroundVolume;
  }

  get presenterAudio() {
    return this.#presenterAudio;
  }

  /**
   * `audioMutedFor` as it comes back from storage.
   *
   * Deliberately strict about the SHAPE rather than coercing: the stored value is a map of
   * `{name}` objects, and an entry that is not one is dropped instead of being turned into a
   * truthy placeholder that would mute a presenter nobody muted.
   */
  #readPresenterMuteMap(stored: unknown): Record<number, { name: string }> {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const map: Record<number, { name: string }> = {};
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      const userID = Number(key);
      if (!Number.isFinite(userID)) continue;
      if (
        value &&
        typeof value === 'object' &&
        typeof (value as { name?: unknown }).name === 'string'
      ) {
        map[userID] = { name: (value as { name: string }).name };
      }
    }
    return map;
  }

  /** `audioVolumeFor` as it comes back from storage — strings and numbers both, see `screen-volume.ts`. */
  #readPresenterVolumeMap(stored: unknown): Record<number, string | number> {
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const map: Record<number, string | number> = {};
    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      const userID = Number(key);
      if (!Number.isFinite(userID)) continue;
      if (typeof value === 'string' || typeof value === 'number') map[userID] = value;
    }
    return map;
  }

  setMasterVolume(nextVolume: number) {
    this.#volume = nextVolume;
    setSoundEffectsVolume(nextVolume / 100);
    if (typeof document !== 'undefined') {
      document
        .querySelectorAll<HTMLMediaElement>('[id^="msRemAudio-"], [id^="video-"]')
        .forEach((media) => {
          media.volume = nextVolume / 100;
        });
    }
    if (nextVolume === 0) this.#prefs.subtitles = true;
  }

  setBackgroundVolume(nextVolume: number) {
    this.#backgroundVolume = nextVolume;
    if (typeof document === 'undefined') return;

    const mp3Player = document.getElementById('mp3player');
    if (mp3Player instanceof HTMLMediaElement) mp3Player.volume = nextVolume / 100;

    if (this.#soundCloudPlaying()) {
      const soundCloudFrame = document.getElementById('soundCloudIFrame');
      const soundCloud = (
        window as Window & {
          SC?: {
            Widget: (element: HTMLElement) => { setVolume: (value: number) => void };
          };
        }
      ).SC;
      if (soundCloudFrame && soundCloud) soundCloud.Widget(soundCloudFrame).setVolume(nextVolume);
    }

    window.dispatchEvent(new CustomEvent('setYTVolume', { detail: nextVolume }));
  }

  /**
   * `mute()` / `unmute()` as `app-presentationarea` defines them — the SCREEN OVERLAY's pair, which
   * is NOT the navbar's.
   *
   * ```text
   * mute()   { this.prevVolume = this.audioVolume; this.audioVolume = 0; this.adjustVol(null);
   *            this.appService.globals.preferences.doNotDisturbOn = !0 }
   * unmute() { this.audioVolume = this.prevVolume; this.adjustVol(null);
   *            this.appService.globals.preferences.doNotDisturbOn = !1 }
   * ```
   * (`app-presentationarea.compiled.js:923-933`)
   *
   * `app-room`'s copy of the same two methods (`app-room.compiled.js:807-823`) additionally sets
   * `preferences.subtitles` and drags the background music volume along with it. That is the
   * NAVBAR's behaviour and it is what {@link toggleMute} already does; the overlay's is deliberately
   * the shorter one, because the two components genuinely differ.
   *
   * One divergence, stated rather than hidden: `setMasterVolume` here also sets `prefs.subtitles = true`
   * at zero, because it was written from `app-room`'s `adjustVol` — the only `adjustVol` this room
   * had a caller for. `app-presentationarea`'s `adjustVol` has no such line. Splitting it would mean
   * two master-volume paths over one `volume` state, which is worse than the one line of drift.
   */
  muteScreenAudio() {
    this.#previousVolume = this.#volume;
    this.setMasterVolume(0);
    this.#prefs.doNotDisturbOn = true;
  }

  unmuteScreenAudio() {
    this.setMasterVolume(this.#previousVolume);
    this.#prefs.doNotDisturbOn = false;
  }

  /**
   * Applies one presenter's volume to their audio sink.
   *
   * `ii('[id^=msRemAudio-' + o + ']').prop('volume', a)` — the reference reaches for the element by
   * the id prefix this room already emits (`msRemAudio-{userID}`, the hidden `<audio>` per remote
   * microphone). Same selector, same 0–1 range.
   */
  applyPresenterVolume(userID: number, level: number) {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll<HTMLMediaElement>(`[id^="msRemAudio-${userID}"]`)
      .forEach((element) => {
        element.volume = level;
        /*
          `s.pause()` on the way down, and playing again on the way up — the other half of
          `stopListeningToPresenter`, which this room set volume for and never paused.

          Audibly the two are the same; the difference is that a paused element stops DECODING,
          which is the saving upstream actually makes. `play()` returns a promise that rejects if
          the element is removed mid-call, so the rejection is swallowed deliberately: a muted
          presenter leaving while you unmute them is not an error anybody can act on.
        */
        if (level === 0) element.pause();
        else if (element.paused) void element.play().catch(() => {});
      });
  }

  /**
   * `toggleTalkingPresenter(user)` — the per-presenter mute checkbox.
   *
   * The state transition is in `$lib/screen-volume` and tested there. What is left here is the two
   * effects the reference pairs with it:
   *
   * 1. **The persistence**, `setPreference('audioMutedFor'|'audioVolumeFor', …)`, which is this
   *    room's `savePreference`.
   * 2. **Pausing the listener's own audio element** — which is ALL the reference does, and this
   *    comment said the opposite for weeks.
   *
   *    It used to read that `stopListeningToPresenter` stops the server SENDING that presenter's
   *    audio, that our wire has no equivalent command, and that "the bandwidth saving is the part
   *    that is missing". Reading the function settles it — there is no such saving to miss:
   *
   *    ```js
   *    stopListeningToPresenter(e) {
   *      if (this.globals.chatOnlyMode) return;
   *      let s = document.getElementById("msRemAudio-" + e.userID);
   *      s && (s.pause(), s.currentTime = 0);
   *    }
   *    ```
   *
   *    No socket, no command, no consumer. It pauses the same hidden `<audio>` element this room
   *    already reaches for, so upstream's consumer keeps receiving exactly as ours does. The claim
   *    came from reading the two CALLERS — which do call `startListeningToPresenter` — and assuming
   *    the pair was symmetric. `startListeningToPresenter` does reach the SFU: it consumes. `stop`
   *    does not.
   *
   *    `currentTime = 0` is deliberately not reproduced: an element backed by a live `MediaStream`
   *    is not seekable, so the assignment does nothing upstream and can throw here.
   */
  toggleTalkingPresenterAudio(user: PresenterAudioUser) {
    const next = toggleTalkingPresenter(this.#presenterAudio, user);
    this.#presenterAudio = next.preferences;
    // Unmuting restores 100, muting drops to 0 — the reference writes both into `audioVolumeFor`,
    // so the element follows the stored value rather than a second opinion about it.
    this.applyPresenterVolume(user.userID, next.listen ? 1 : 0);
    this.#prefs.save('audioMutedFor', next.preferences.audioMutedFor);
    this.#prefs.save('audioVolumeFor', next.preferences.audioVolumeFor);
  }

  /** `adjustVolPres(event, user)` — the per-presenter slider. Same two effects as above. */
  adjustPresenterVolume(user: PresenterAudioUser, rawValue: string) {
    const next = adjustVolumeForPresenter(this.#presenterAudio, user, rawValue);
    this.#presenterAudio = next.preferences;
    this.applyPresenterVolume(user.userID, next.elementVolume);
    this.#prefs.save('audioMutedFor', next.preferences.audioMutedFor);
    this.#prefs.save('audioVolumeFor', next.preferences.audioVolumeFor);
  }

  toggleMute() {
    if (this.#volume > 0) {
      this.#previousVolume = this.#volume;
      this.setMasterVolume(0);
      this.#prefs.doNotDisturbOn = true;
      this.#prefs.subtitles = true;
      this.#backgroundVolume = this.#volume;
      this.setBackgroundVolume(this.#backgroundVolume);
      return;
    }
    this.setMasterVolume(this.#previousVolume);
    this.#prefs.doNotDisturbOn = false;
    this.#prefs.subtitles = false;
    this.#backgroundVolume = this.#volume;
    this.setBackgroundVolume(this.#backgroundVolume);
  }
}
