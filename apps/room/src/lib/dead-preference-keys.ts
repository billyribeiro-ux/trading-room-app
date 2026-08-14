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
 * component. Five of them have since been given real preference names and now write those instead
 * (`recordingStartSound`, `recordingStopSound`, `pushToTalk`, `doSpeechReco`,
 * `showSpeechRecoOverlay`), plus `disableVideo`; their element ids stay on this list precisely
 * BECAUSE they were written under the old name before that, so the stale copy is still out there.
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
  'visibility-change-enabled'
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
