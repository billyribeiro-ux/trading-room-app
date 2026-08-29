import type { Theme } from '#lib/types.js';

/**
 * THE THREE ROOM SETTINGS THAT SEED A VIEWER'S PREFERENCES, ONCE.
 *
 * ## One module because upstream is one block
 *
 * They are not three features that happen to look alike. They are three consecutive clauses of a
 * single expression in `loadSessionData`, at bundle bytes 1,149,414 / 1,149,637 / 1,149,866 of the
 * pinned v4 bundle, transcribed here in the order they run:
 *
 * ```js
 * sessData.darkThemeAsDefault && !preferences.defaultDarkTheme && (
 *   preferences.theme = "darkTheme",
 *   setPreference("defaultDarkTheme", !0),
 *   guiEventBus.emit("switchTheme", preferences.theme)),
 * sessData.alertSoundOff && !preferences.defaultAlertSoundOff && (
 *   preferences.alertSoundOn = !1,
 *   setPreference("defaultAlertSoundOff", !0),
 *   setPreference("alertSoundOn", preferences.alertSoundOn)),
 * sessData.alertsChatOnBottom && !preferences.defaultAlertsChatOnBottom && (
 *   preferences.roomSplitDir = "btt",
 *   setPreference("defaultAlertsChatOnBottom", !0),
 *   setPreference("roomSplitDir", preferences.roomSplitDir),
 *   guiEventBus.emit("manageRoomLayout"))
 * ```
 *
 * Every one has the same three parts: a ROOM setting that asks, a per-viewer LATCH that records it
 * has already been asked, and a preference write. Splitting them into three modules would have
 * copied that shape three times and left nothing holding the rule they share.
 *
 * ## The latch is the whole design, and it is not a cache
 *
 * A room default is a DEFAULT: it decides what a member sees the first time they arrive and must
 * never override what they chose afterwards. Without the latch, a room with `alertSoundOff` would
 * silence a member's alerts again on every single page load, and the switch in their own settings
 * modal would appear broken rather than overridden. With it, the setting fires once per viewer per
 * room-setting and the member owns the value from then on.
 *
 * This is why the decision reads BOTH sides. `darkThemeAsDefault` alone is "the room prefers dark";
 * `darkThemeAsDefault && !defaultDarkTheme` is "the room prefers dark and this viewer has not yet
 * been told". Only the second is a thing to act on.
 *
 * ## Pure, because the interesting half is the rule
 *
 * {@link decideRoomDefaults} is a function of its arguments and nothing else — no preference store,
 * no theme, no persistence. {@link applyRoomDefaults} takes its two writers as arguments for the
 * same reason. Same split as `media-elevation.ts`, `alert-filter.ts` and `live-access.ts`: a rule
 * that can only be reached by mounting a room is a rule nobody tests.
 *
 * ## DIVERGENCE, recorded rather than taken quietly: where the theme is stored
 *
 * Upstream writes `preferences.theme = "darkTheme"` into the same preferences blob as the two
 * latches. This room keeps the theme in its own `user_settings.theme` column and writes it through
 * `saveTheme`, which predates this module by weeks. So `dark-theme` applies through a DIFFERENT
 * writer from the other two, and that asymmetry is deliberate — see {@link RoomDefaultWriters}.
 *
 * ## A SECOND divergence, and this one is an upstream DEFECT we decline to reproduce
 *
 * `darkThemeAsDefault` has two more readers, at bytes 2,283,697 and 2,283,872, and they are the
 * settings modal's two theme radios:
 *
 * ```js
 * checked("lightTheme" == preferences.theme && (sessData.darkThemeAsDefault || !preferences.defaultDarkTheme))
 * checked("darkTheme"  == preferences.theme && (!sessData.darkThemeAsDefault || preferences.defaultDarkTheme))
 * ```
 *
 * Work the four combinations and one of them is wrong. A viewer who has ever entered a room with
 * `darkThemeAsDefault` carries `defaultDarkTheme = true` forever; in any OTHER room —
 * `darkThemeAsDefault` false — the Light radio evaluates `light && (false || false)` and renders
 * UNCHECKED while the theme genuinely is light. A radio group with nothing selected, for a
 * preference that is set.
 *
 * This room does not reproduce it. `ModalHost.svelte:2825,2837` check `theme === 'light'` and
 * `theme === 'dark'`, which is the question a radio is asking. Reproducing a defect this specific
 * would mean writing an expression whose only purpose is to be wrong.
 */

/** The three, each named by what it DOES rather than by the setting that asks for it. */
export type RoomDefaultName = 'dark-theme' | 'alert-sound-off' | 'chat-on-bottom';

export interface RoomDefaultRule {
  readonly name: RoomDefaultName;
  /** The `sessData` key the owner ticks. */
  readonly setting: 'darkThemeAsDefault' | 'alertSoundOff' | 'alertsChatOnBottom';
  /**
   * The preference key that records this viewer has already had it applied.
   *
   * The reference's own names, kept exactly: a member who used the original and then this room
   * carries these keys in their settings blob already, and renaming them would apply every default
   * a second time to every existing member.
   */
  readonly latch: 'defaultDarkTheme' | 'defaultAlertSoundOff' | 'defaultAlertsChatOnBottom';
}

/** In the order the reference evaluates them. */
export const ROOM_DEFAULT_RULES: readonly RoomDefaultRule[] = [
  { name: 'dark-theme', setting: 'darkThemeAsDefault', latch: 'defaultDarkTheme' },
  { name: 'alert-sound-off', setting: 'alertSoundOff', latch: 'defaultAlertSoundOff' },
  { name: 'chat-on-bottom', setting: 'alertsChatOnBottom', latch: 'defaultAlertsChatOnBottom' }
];

export interface RoomDefaultsInput {
  /**
   * The room's settings, as `internal/room-config/[code]` delivered them.
   *
   * Narrowed to the THREE keys this module reads rather than taken as a `Record<string, unknown>`,
   * and the difference is not cosmetic: `RoomSessionSettings` is a declared interface with no index
   * signature, so the wide type would have forced a cast at the call site. A cast standing where a
   * type should be is exactly what this repository's gates class as a defect, and here the narrow
   * type is also the more honest one — it says on its face which three settings are read.
   */
  sessData: Readonly<Partial<Record<RoomDefaultRule['setting'], unknown>>> | null | undefined;
  /** This viewer's decoded preference blob — `RoomPrefs.loaded`. */
  loaded: Readonly<Record<string, unknown>>;
}

/**
 * Which of the three still have to be applied for this viewer, in the reference's order.
 *
 * `=== true` on the setting and TRUTHY on the latch, and the asymmetry is upstream's own: the
 * controller omits unset settings rather than sending null, so an absent setting means off — while
 * the latch is a value this room wrote itself and any truthy value it holds means "already done".
 * Reading the latch loosely also means a blob written by the ORIGINAL application, where these keys
 * came from, is honoured rather than re-applied.
 */
export function decideRoomDefaults(input: RoomDefaultsInput): readonly RoomDefaultName[] {
  const sessData = input.sessData ?? {};
  return ROOM_DEFAULT_RULES.filter(
    (rule) => sessData[rule.setting] === true && !input.loaded[rule.latch]
  ).map((rule) => rule.name);
}

/**
 * The two writers, injected.
 *
 * They are two rather than one because of the storage divergence recorded in this module's header:
 * the theme lives in its own column and everything else lives in the preferences blob. Passing one
 * `savePreference` and pretending the theme is a preference would have hidden that.
 */
export interface RoomDefaultWriters {
  /** `RoomModals.setTheme` — writes the page's theme and persists it through `saveTheme`. */
  setTheme: (theme: Theme) => void;
  /** `RoomPrefs.save` — mirrors into the decoded snapshot, runs side effects, persists. */
  savePreference: (key: string, value: unknown) => void;
}

/**
 * Apply the defaults this viewer has not had yet.
 *
 * **The latch is written LAST for each default, and that ordering is deliberate.** Every write here
 * is optimistic — `RoomPrefs.save` mirrors locally and fires the persist without awaiting it — so
 * ordering cannot make this transactional, and pretending otherwise would be the lie. What it can
 * do is fail in the safer direction: if something throws mid-default, the latch is unset and the
 * default is applied again next time. Applying a default twice is a member seeing the room's
 * preference again; latching without applying is a member never seeing it at all.
 *
 * `roomSplitDir` reaches `RoomPrefs`'s side-effect hook, which re-seeds the split geometry — the
 * `manageRoomLayout` the reference emits on the same line. That hook's own comment used to say it
 * was *"only reached on a deliberate user action, never on a page load"*; this is the page load
 * that made that false, and the comment now says so.
 *
 * Call it once, from the browser. It is idempotent through the latch, so a second call in the same
 * session is a no-op only after the first call's writes have landed in `loaded` — which they have,
 * because `RoomPrefs.save` mirrors synchronously before it persists.
 *
 * ## Called from `+page.svelte`'s `onMount`, and not from `createRoom`
 *
 * Two reasons, and either would be enough. It is BEHAVIOUR with a persistence side effect, and the
 * composition root's own ceiling note says the question to ask about growth there is *"whether
 * something with behaviour has been added to a file whose job is assembly"*. And `createRoom` runs
 * during SSR as well as in the browser, where writing a member's preferences would be wrong;
 * `onMount` is the room's only hook that is client-only and runs exactly once.
 */
export function applyRoomDefaults(input: RoomDefaultsInput, writers: RoomDefaultWriters): void {
  for (const name of decideRoomDefaults(input)) {
    const rule = ROOM_DEFAULT_RULES.find((candidate) => candidate.name === name);
    if (!rule) continue;

    if (name === 'dark-theme') {
      writers.setTheme('dark');
    } else if (name === 'alert-sound-off') {
      writers.savePreference('alertSoundOn', false);
    } else {
      writers.savePreference('roomSplitDir', 'btt');
    }

    writers.savePreference(rule.latch, true);
  }
}
