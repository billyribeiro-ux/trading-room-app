/**
 * The preference keys that were never preferences — element ids, written into the settings blob by
 * a fallback, read by nothing.
 *
 * ## What produced them
 *
 * `updateSettingCheck` in `ModalHost.svelte` used to report every checkbox as
 * `onPreferenceChange(preferenceKeyByInputId[input.id] ?? input.id, checked)`. The table had six
 * entries and twenty-five checkboxes reached it, so nineteen of them persisted under their HTML
 * `id`. The room reads preferences by the reference's names (`recordingStartSound`,
 * `visibilityChangeEnabled`, …), so those writes went into the blob and nothing ever read them
 * back.
 *
 * That fallback is gone. This list exists because removing the WRITE does not remove what was
 * already written: every account that ever opened the settings modal is carrying some of these.
 *
 * ## Why a deny-list and not an allow-list
 *
 * An allow-list of valid preference names would be the tidier shape and it is the wrong one here.
 * The blob legitimately holds keys this module has no business knowing about — `audioMutedFor`,
 * `audioVolumeFor`, `chatStyle`, `roomSplitDir`, `alertsArchivedAt`, `savedNick`, split sizes, and
 * whatever the next feature adds. Deny-by-default would silently delete a preference the day
 * somebody adds one without updating this file, and the failure would be invisible: a setting that
 * quietly stops sticking. **Deleting user data on an omission is not a trade this codebase makes.**
 *
 * So the rule is inverted: nothing is removed unless it is named here, and everything named here
 * was proven dead by reading every one of its occurrences.
 *
 * ## How each name was established
 *
 * Every id below appears on exactly one `<input onchange={updateSettingCheck}>` in
 * `ModalHost.svelte` and NOWHERE else in `src/` — not in `+page.svelte`, not in any other
 * component. Six of them have since been given real preference names and now write those instead
 * (`recordingStartSound`, `recordingStopSound`, `pushToTalk`, `doSpeechReco`,
 * `showSpeechRecoOverlay` and, on 2026-09-02 with USM-18, `smallImagePreview`), plus `disableVideo`;
 * their element ids stay on this list precisely BECAUSE they were written under the old name before
 * that, so the stale copy is still out there.
 *
 * Two entries at the end of the list are NOT element ids and say so where they sit: they are the two
 * invented preference names the Text Mode radios wrote before those radios were wired to the
 * reference's own keys.
 *
 * Deliberately absent: `pm-window-layout`, which looks like one of these and is not. It has its own
 * handler (`requestPmWindowLayout`) and has always persisted under `pmLogsOnRight`, a real name.
 * `settings-app-donot-disturb` is also absent — it returns early and never reaches persistence.
 */
export const DEAD_PREFERENCE_KEYS: readonly string[] = [
  'app-recording-start-sound',
  'app-recording-stop-sound',
  'app-recording-preview-window',
  'app-disable-video',
  'app-speech-reco-overlay',
  'presenter-push-to-talk',
  'presenter-speech-recognition',
  'presenter-alert-donot-disturb',
  'presenter-chat-donot-disturb',
  'presenter-enable-rte',
  'presenter-follow-my-screens',
  'chat-gif-donot-disturb',
  'chat-badges-donot-disturb',
  'chat-popup-donot-disturb',
  'chat-always-scroll',
  'chat-mem-clear',
  'small-image-preview',
  'extra-chat-column',
  'visibility-change-enabled',
  /*
    TWO OF A DIFFERENT KIND, added 2026-08-28, and they are not element ids.

    The settings modal's two Text Mode radio pairs wrote `alertDisplayMode` and `chatDisplayMode`
    with the values `'regular'` and `'compact'` — three invented names against the reference's own
    `alertsMode` / `chatMode` keys and its `'r'` / `'c'` values — and nothing in this room read
    either. The radios were seeded from a constant too, so reopening the modal showed Regular
    whatever had been picked. Same shape as the room's chat-mode radio, which this file's header
    describes; different cause, since these were never produced by the id fallback.

    They are dead in the strongest sense the header asks for: every occurrence was read, both are
    gone from the source, and the keys they wrote can never be revived — the live feature uses the
    reference's names, which are different strings. `chat-display-mode.ts` holds the wiring.
  */
  'alertDisplayMode',
  'chatDisplayMode',
  /*
    A THIRD OF THAT KIND, added 2026-08-30, and the most expensive of the three.

    The settings modal's two presenter colour pickers wrote `onPreferenceChange('presenterStyle',
    { color, bkgColor })` — this presenter's own settings blob, read by nothing, in a store no other
    viewer can see — under a heading reading *"These colors will affect how ALL USERS see your
    messages and alerts"*. The reference does not persist a preference at all here: it sends
    `savePresenterColors` to the server, which stores the pair against the presenter and pushes
    `presenterColorsChanged` to the room. So the key is invented in the same way the two above are,
    and for the same reason — a control modelled at the wrong LEVEL, as a per-user preference, when
    the thing it changes is how everyone else's screen paints this person's messages.

    The live feature stores rows in `presenter_colors` and nothing writes a preference, so this key
    can never be revived. `presenter-colors.ts` holds it.

    Not an element id, like the two above it: `presenter-text-color` and `presenter-bg-color` are
    `<input type="color">` with `bind:value`, so they never reached `updateSettingCheck` and never
    persisted under their ids.
  */
  'presenterStyle',
  /*
    A FOURTH, added 2026-08-30 with the Stream Player pane.

    Enable / Disable Stream Player wrote `streamingPlayerEnabled` into this presenter's own settings
    blob and nothing anywhere read it. Same level error as the three above — a room-level presenter
    act modelled as a per-user preference — with one difference that is worth the paragraph: the
    other three were fixed by wiring the control, and this one could not be.

    The reference gets the player's state and its URL from ITS server (`invokeAdminCmd("streamStatus")`
    -> `rc.enablePlayer`, `rc.playerURL`, byte 2,170,505). The client composes neither, and that
    server is not in the capture. The feature is a public page that renders one room's screenshares
    to whoever holds a link, which needs an anonymous media grant nobody has designed. So the buttons
    are disabled with the reason on screen and the key is retired here.
  */
  'streamingPlayerEnabled'
];

const DEAD = new Set(DEAD_PREFERENCE_KEYS);

/**
 * Strips the dead keys from a settings object, returning how many went.
 *
 * Mutates rather than copying, because the server's only caller has just parsed the blob and is
 * about to re-serialise it — a copy there would allocate a second object per preference write for
 * no benefit. The count is returned so the caller can skip the write when there is nothing to do.
 */
export function pruneDeadPreferenceKeys(settings: Record<string, unknown>): number {
  let removed = 0;
  for (const key of DEAD_PREFERENCE_KEYS) {
    if (key in settings) {
      delete settings[key];
      removed += 1;
    }
  }
  return removed;
}

/** Whether a key is one of the dead ones — for callers holding a single key rather than a blob. */
export function isDeadPreferenceKey(key: string): boolean {
  return DEAD.has(key);
}

/**
 * The BROWSER half of a preference write: mirror the value, and evict the dead keys on the way past.
 *
 * The same nineteen keys are in `localStorage` too, and the server's prune cannot reach them —
 * `savePreference` writes both stores, so the old element-id fallback left a copy in each. Removed
 * here on the next preference change of any kind, which is the same converge-on-use rule the server
 * side uses: no startup pass, nothing to run, and idempotent once clean.
 *
 * `JSON.stringify` here and NOT on the wire. The remote command takes the value itself now
 * (`z.json()` in `user-settings.remote.ts`); this store only holds strings, so it is the one place
 * the stringify still belongs.
 *
 * It lives beside the list rather than in `+page.svelte` because the module that owns which keys are
 * dead should own the eviction. The page had the loop inline, four lines from the server write it
 * pairs with, and the two halves could drift apart without anything noticing.
 *
 * A no-op where there is no `localStorage` — server-side rendering, and any environment that has
 * turned it off — because a preference failing to mirror is not a reason to fail the write.
 */
export function mirrorPreferenceToLocalStorage(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  for (const dead of DEAD_PREFERENCE_KEYS) localStorage.removeItem(dead);
}
