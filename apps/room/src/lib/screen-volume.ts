/**
 * The zoom-overlay volume control's arithmetic, kept out of the component so it can be tested and
 * RENDERED without a component runtime.
 *
 * Everything here was decoded from this repository's own decoded copy of the reference component,
 * `docs/source/components/app-presentationarea.*`, not from the minified bundle:
 *
 * - `app-presentationarea.render-helpers.js:264-289` — `cSe`/`dSe`/`uSe` and `hSe`, the trigger.
 * - `app-presentationarea.render-helpers.js:349-388` — `bSe`/`vSe`, one row per talking presenter.
 * - `app-presentationarea.compiled.js:892-954` — `adjustVol`, `adjustVolPres`, `mute`, `unmute` and
 *   `toggleTalkingPresenter`, verbatim bodies.
 * - `app-presentationarea.compiled.js:2126-2128, 2131-2169` — consts 106/107/108 and 111-115.
 *
 * The one thing this module does NOT do is touch the DOM or the SFU. `adjustVolPres` in the
 * reference does three things at once — writes the preference, sets one audio element's volume, and
 * starts/stops listening to that presenter over mediasoup. Only the first is a pure function of its
 * inputs, so that is what lives here; the caller applies the other two and can be read on its own.
 */

/**
 * `preferences.audioMutedFor[userID]` — an OBJECT, never a boolean.
 *
 * `toggleTalkingPresenter` stores `{name: mediaValue.name}` and UNMUTES by `delete`, never by
 * assigning `false` (compiled.js:939-945). Every read of it in the template is a truthiness check,
 * so a boolean map renders identically and is wrong the moment it is persisted: `{name}` survives a
 * round trip through `setPreference` as an object, and `false` would come back as a key that is
 * present and falsy — which the reference's own `delete` semantics never produce.
 */
export type PresenterMute = { name: string };

/**
 * The two preference maps this control owns, keyed by `userID`.
 *
 * `audioVolumeFor` holds `e.target.value` — a STRING — when it comes from the slider
 * (compiled.js:903-905), and the NUMBERS 100 / 0 when it comes from the mute toggle
 * (compiled.js:942, 945). That union is the reference's, and it is reproduced rather than
 * normalised: the value is written straight back to `setPreference`, so normalising here would
 * change what is stored.
 */
export type PresenterAudioPreferences = {
  audioMutedFor: Record<number, PresenterMute>;
  audioVolumeFor: Record<number, string | number>;
};

/** The identity of one talking presenter, as the room already models it in `+page.svelte`. */
export type TalkingPresenter = {
  userID: number;
  mediaValue: { name: string };
};

/**
 * The three icon classes of consts 106, 107 and 108 — `fa-volume-up`, `fa-volume-down`,
 * `fa-volume-off`.
 *
 * NOT `fa-volume-mute`. That spelling belongs to nothing in `app-presentationarea`'s const table;
 * const 108 is `[1,"fas","fa-volume-off"]` (compiled.js:2128).
 */
export type VolumeIcon = 'fa-volume-up' | 'fa-volume-down' | 'fa-volume-off';

/**
 * Which icon the trigger shows at a given master volume, or `null` for NO ICON AT ALL.
 *
 * `hSe`'s update block, verbatim from `render-helpers.js:282-287`:
 *
 * ```text
 * m(), O(1, e.audioVolume > 50 ? 1 : -1),
 * m(), O(2, e.audioVolume < 50 && e.audioVolume > 4 ? 2 : -1),
 * m(), O(3, e.audioVolume < 4 ? 3 : -1)
 * ```
 *
 * Three INDEPENDENT conditionals, every one a STRICT inequality, and `-1` is Angular's "render
 * nothing". So at exactly 50 and at exactly 4 the button renders with no icon inside it — a 31px
 * empty square (`#dropdownVolume { width: 31px }`, compiled.js:3290).
 *
 * That is not a transcription slip to tidy into `>=`. It is what the reference paints, it is
 * reachable — 50 is the midpoint of a 0..100 slider and 4 is one keyboard step from 5 — and
 * `screen-volume-contract.test.ts` fails if anyone widens either bound.
 */
export function volumeIcon(audioVolume: number): VolumeIcon | null {
  if (audioVolume > 50) return 'fa-volume-up';
  if (audioVolume < 50 && audioVolume > 4) return 'fa-volume-down';
  if (audioVolume < 4) return 'fa-volume-off';
  return null;
}

/**
 * `name`, `id` and `for` for one presenter row, built the way `bSe` builds them:
 *
 * ```text
 * ei('name', 'talkingPresenter', i, '-donot-disturb')
 * ei('id',   'talkingPresenter', i, '-donot-disturb')
 * ei('for',  'talkingPresenter', i, '-donot-disturb')
 * ```
 *
 * `i` is `n.$index` — the row's POSITION in `mediaService.talkingUsers`, not the user id. So the
 * ids are stable per row rather than per person, which is what the reference emits and what a
 * capture of it would show.
 */
export function presenterRowId(index: number): string {
  return `talkingPresenter${index}-donot-disturb`;
}

/** `preferences.audioMutedFor[userID]` as the template reads it: a truthiness check. */
export function isMutedFor(
  preferences: PresenterAudioPreferences,
  userID: number
): boolean {
  return Boolean(preferences.audioMutedFor[userID]);
}

/**
 * `toggleTalkingPresenter(user)` — compiled.js:937-954, as a pure transition.
 *
 * ```text
 * this.appService.globals.preferences.audioMutedFor[i]
 *   ? (delete …audioMutedFor[i], startListeningToPresenter(e), …audioVolumeFor[i] = 100)
 *   : (…audioMutedFor[i] = {name: o.name}, stopListeningToPresenter(e), …audioVolumeFor[i] = 0)
 * ```
 *
 * Mute and volume are ONE state kept in step: unmuting restores 100, not whatever the slider was
 * before. `listen` is what the caller does with the SFU half.
 */
export function toggleTalkingPresenter(
  preferences: PresenterAudioPreferences,
  user: TalkingPresenter
): { preferences: PresenterAudioPreferences; listen: boolean } {
  const { userID, mediaValue } = user;
  const audioMutedFor = { ...preferences.audioMutedFor };
  const audioVolumeFor = { ...preferences.audioVolumeFor };

  if (audioMutedFor[userID]) {
    // `delete`, not `= false`. See {@link PresenterMute}.
    delete audioMutedFor[userID];
    audioVolumeFor[userID] = 100;
    return { preferences: { audioMutedFor, audioVolumeFor }, listen: true };
  }

  audioMutedFor[userID] = { name: mediaValue.name };
  audioVolumeFor[userID] = 0;
  return { preferences: { audioMutedFor, audioVolumeFor }, listen: false };
}

/**
 * `adjustVolPres(event, user)` — compiled.js:901-922, as a pure transition.
 *
 * ```text
 * const r = e.target.value, a = r / 100;
 * …audioVolumeFor[o] = r,                                  // the RAW string
 * ii('[id^=msRemAudio-' + o + ']').prop('volume', a),
 * 0 == r && (…audioMutedFor[o] = {name: s.name}, stopListeningToPresenter(i)),
 * r > 0 && …audioMutedFor[o] && (delete …audioMutedFor[o], startListeningToPresenter(i))
 * ```
 *
 * Three details that are easy to lose and all three are load-bearing:
 *
 * - the RAW value is stored, so `audioVolumeFor` holds `"73"` after a drag and `100` after a
 *   toggle — see {@link PresenterAudioPreferences};
 * - `0 == r` is a LOOSE comparison against a string, which is why `"0"` mutes;
 * - `elementVolume` is `r / 100`, the 0–1 range an `HTMLMediaElement.volume` takes, and the element
 *   it belongs to is `[id^=msRemAudio-<userID>]` — which this room already emits
 *   (`+page.svelte`, the `msRemAudio-{userID}` audio sinks).
 *
 * `listen` is `true` when the caller should (re)start listening to that presenter, `false` when it
 * should stop, and `null` when this drag changed neither — dragging 60 → 40 touches no mute state.
 */
export function adjustVolumeForPresenter(
  preferences: PresenterAudioPreferences,
  user: TalkingPresenter,
  rawValue: string
): {
  preferences: PresenterAudioPreferences;
  elementVolume: number;
  listen: boolean | null;
} {
  const { userID, mediaValue } = user;
  const audioMutedFor = { ...preferences.audioMutedFor };
  const audioVolumeFor = { ...preferences.audioVolumeFor };

  audioVolumeFor[userID] = rawValue;
  const numeric = Number(rawValue);
  let listen: boolean | null = null;

  // `0 == r` — the reference compares the STRING loosely, so "0" and "" both mute. `Number('')` is
  // 0 too, so this reproduces it without a loose comparison of our own.
  if (numeric === 0) {
    audioMutedFor[userID] = { name: mediaValue.name };
    listen = false;
  }
  if (numeric > 0 && audioMutedFor[userID]) {
    delete audioMutedFor[userID];
    listen = true;
  }

  return {
    preferences: { audioMutedFor, audioVolumeFor },
    // The element takes 0–1. Clamped, because a slider is 0..100 but a stored preference is
    // whatever was last written and an out-of-range assignment throws in the browser.
    elementVolume: Math.min(1, Math.max(0, numeric / 100)),
    listen
  };
}

/**
 * The value the per-presenter slider shows for one user.
 *
 * `je('ngModel', …audioVolumeFor[e.userID])` (render-helpers.js:346) with nothing behind it when
 * the key is absent — a room that has never touched this presenter's volume renders the slider at
 * its own default, which for `<input type=range min=0 max=100>` is the midpoint, 50. The reference
 * gets the same result by binding `undefined`. Written explicitly so the fallback is visible rather
 * than an accident of the DOM.
 */
export function presenterVolumeValue(
  preferences: PresenterAudioPreferences,
  userID: number
): number {
  const stored = preferences.audioVolumeFor[userID];
  if (stored === undefined) return 50;
  const numeric = Number(stored);
  return Number.isFinite(numeric) ? numeric : 50;
}
