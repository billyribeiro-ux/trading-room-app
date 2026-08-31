/**
 * The zoom-overlay volume control's arithmetic, kept out of the component so it can be tested and
 * RENDERED without a component runtime.
 *
 * ## `SVC-02`/`SVC-03` — every citation in this file was RE-DECODED on 2026-08-31, and the reason is
 * that none of them could be followed
 *
 * The header used to open *"Everything here was decoded from this repository's own decoded copy of
 * the reference component, `docs/source/components/app-presentationarea.*`"* and then cite that copy
 * thirteen times. **Those files are in this repository under no path** — `git ls-files` finds nothing
 * under `apps/room/docs/source/` — so every one of the thirteen pointed a reader at nothing, and the
 * const NUMBERS in them were each one too high against the bundle this repository does pin.
 *
 * The register raised two of the thirteen (`SVC-02`'s volume icons, `SVC-03`'s row ids), each with
 * an exact one-line change. Measuring found eleven more of the same shape, so all thirteen are
 * replaced here by byte offsets into `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` — 2,891,205
 * bytes, SHA-256 `40796ca8…`, and the file this repository actually holds.
 *
 * **The VALUES this module ships were correct throughout.** Only the pointers at them were not, which
 * is the worse of the two failures: a wrong value is caught by the next person who renders the thing,
 * and a wrong citation is believed. Two of the thirteen also named the wrong SYMBOL while quoting the
 * right code, which is the shape that survives review — each is corrected at its own site below.
 *
 * Decoded by value from the pinned bundle:
 *
 * - byte **1,920,627** — `cSe`, the overlay's control cluster; **1,921,034** / **1,921,070** /
 *   **1,921,106** — `dSe` / `uSe` / `hSe`, one icon each; **1,921,142** — `pSe`, the trigger button
 *   that chooses between them.
 * - byte **1,921,739** — `bSe`, the per-presenter slider row; **1,922,302** — `vSe`, the
 *   per-presenter checkbox row that builds the ids.
 * - byte **1,977,664** — `adjustVol`; **1,977,928** — `adjustVolPres`; **1,978,901** —
 *   `toggleTalkingPresenter`. Verbatim bodies.
 * - `app-presentationarea`'s `consts:` array begins at byte **1,994,257** and holds 292 top-level
 *   entries, counted by walking it. The icons are **105/106/107** (bytes 2,001,443 / 2,001,468 /
 *   2,001,495) and the presenter row is **110-114** (2,001,651 through 2,001,855).
 *
 * The one thing this module does NOT do is touch the DOM or the SFU. `adjustVolPres` in the
 * reference does three things at once — writes the preference, sets one audio element's volume, and
 * starts/stops listening to that presenter over mediasoup (byte 1,977,928 has all three). Only the
 * first is a pure function of its inputs, so that is what lives here; the caller applies the other
 * two and can be read on its own.
 */

/**
 * `preferences.audioMutedFor[userID]` — an OBJECT, never a boolean.
 *
 * `toggleTalkingPresenter` stores `{name: mediaValue.name}` and UNMUTES by `delete`, never by
 * assigning `false` — byte **1,978,901**:
 *
 * ```js
 * toggleTalkingPresenter(e){ const{userID:i,mediaValue:o}=e;
 *   …preferences.audioMutedFor[i]
 *     ? (delete …audioMutedFor[i], startListeningToPresenter(e), …audioVolumeFor[i]=100)
 *     : (…audioMutedFor[i]={name:o.name}, … ) }
 * ```
 . Every read of it in the template is a truthiness check,
 * so a boolean map renders identically and is wrong the moment it is persisted: `{name}` survives a
 * round trip through `setPreference` as an object, and `false` would come back as a key that is
 * present and falsy — which the reference's own `delete` semantics never produce.
 */
export type PresenterMute = { name: string };

/**
 * The two preference maps this control owns, keyed by `userID`.
 *
 * `audioVolumeFor` holds `e.target.value` — a STRING — when it comes from the slider
 * (`const r=e.target.value … audioVolumeFor[o]=r`, byte **1,977,928**), and the NUMBERS 100 / 0 when
 * it comes from the mute toggle (byte **1,978,901**). That union is the reference's, and it is reproduced rather than
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
 * The three icon classes of consts 105, 106 and 107 — `fa-volume-up`, `fa-volume-down`,
 * `fa-volume-off`.
 *
 * NOT `fa-volume-mute`. That spelling belongs to nothing in `app-presentationarea`'s const table;
 * const 107 is `[1,"fas","fa-volume-off"]` (byte **2,001,495**). The one occurrence of
 * `fa-volume-mute` in the whole 2,891,205-byte bundle is at byte 2,071,572, in a different
 * component — which is exactly how a plausible wrong spelling gets adopted.
 *
 * `SVC-02` — these read `106, 107 and 108`. Every number was one too high; see the file header.
 */
export type VolumeIcon = 'fa-volume-up' | 'fa-volume-down' | 'fa-volume-off';

/**
 * Which icon the trigger shows at a given master volume, or `null` for NO ICON AT ALL.
 *
 * `pSe`'s update block, verbatim from byte **1,921,142**:
 *
 * The symbol was `hSe` here and that is wrong while the code quoted below is right — the shape that
 * survives a review, because a reader checking the claim finds it correct and moves on. `hSe` (byte
 * 1,921,106) is `1&t&&T(0,"i",107)`: ONE icon, the muted one. The three-way choice is `pSe`, which
 * renders `dSe`/`uSe`/`hSe` into slots 1, 2 and 3 and then runs this:
 *
 * ```text
 * m(), O(1, e.audioVolume > 50 ? 1 : -1),
 * m(), O(2, e.audioVolume < 50 && e.audioVolume > 4 ? 2 : -1),
 * m(), O(3, e.audioVolume < 4 ? 3 : -1)
 * ```
 *
 * Three INDEPENDENT conditionals, every one a STRICT inequality, and `-1` is Angular's "render
 * nothing". So at exactly 50 and at exactly 4 the button renders with no icon inside it — a 31px
 * empty square (`#dropdownVolume[_ngcontent-%COMP%]{width:31px}`, byte **2,021,587**; the navbar's
 * own copy of the same rule is 40px at byte 2,555,380, which is a different component).
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
 * `name`, `id` and `for` for one presenter row, built the way `vSe` builds them (byte **1,922,603**).
 *
 * The symbol here was `bSe`, which is the SLIDER row (byte 1,921,739) and builds no ids at all; the
 * `ei(…)` calls quoted below are in `vSe` (byte 1,922,302), the checkbox row. Same class of error as
 * the `hSe` above and corrected the same way — by naming the function the quoted bytes are in.
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
 *
 * ## `prefix`, and the collision it exists to avoid
 *
 * The reference builds these ids IDENTICALLY in both dropdowns — bytes **1,922,603** (the overlay,
 * inside `vSe`) and **2,483,544** (the navbar, inside `T4e`) are the same three
 * `ei(…, 'talkingPresenter', i, '-donot-disturb')` calls, and the literal `"talkingPresenter"`
 * occurs exactly SIX times in the 2,891,205-byte bundle — three per component, counted by splitting
 * the whole file rather than by a match window.
 *
 * `SVC-03` — this cited `app-presentationarea.render-helpers.js:370-371` and
 * `app-room.render-helpers.js:1087-1088`, files of an older build that this repository does not
 * hold. The DIVERGENCE below was correct and recorded; only its evidence pointed at nothing a reader
 * could open.
 *
 * In viewer-only mode both
 * dropdowns are in the document at once (the navbar's is ungated; the overlay's trigger renders
 * only in viewer-only mode), so upstream every row id appears TWICE and every `<label for>` in the
 * overlay resolves to the navbar's checkbox instead of its own.
 *
 * That is reproduced for the navbar copy, which keeps the captured ids exactly, and DIVERGED for
 * the overlay copy, which takes a distinct prefix. The rule this repository already applies: a
 * captured value is reproduced unless reproducing it locks a real person out — duplicate
 * `id="dropdownMenuScreen"` costs a reader nothing and is kept, a duplicated form-control id makes
 * the overlay's own checkboxes unclickable by their labels and is not. Recorded in `TODO.md` under
 * decisions taken deliberately, beside the `aria-selected` and `tabindex` divergences in
 * `ScreenTabs.svelte`.
 */
export function presenterRowId(index: number, prefix = 'talkingPresenter'): string {
  return `${prefix}${index}-donot-disturb`;
}

/** `preferences.audioMutedFor[userID]` as the template reads it: a truthiness check. */
export function isMutedFor(preferences: PresenterAudioPreferences, userID: number): boolean {
  return Boolean(preferences.audioMutedFor[userID]);
}

/**
 * `toggleTalkingPresenter(user)` — byte **1,978,901**, as a pure transition.
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
 * `adjustVolPres(event, user)` — byte **1,977,928**, as a pure transition.
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
 * `je('ngModel', …audioVolumeFor[e.userID])` — the last statement of `bSe`, byte **1,921,739** — with nothing behind it when
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
