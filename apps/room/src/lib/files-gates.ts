/**
 * The Files pane's gates, decoded from `docs/source/components/app-presentationarea.full.js`.
 *
 * Same reason as `roster-gates.ts`: a predicate that can only be reached by rendering a
 * 9,000-line component is a predicate nobody tests, and both of these decide what a person sees.
 */

/** The room settings these gates read. Absent means unset, and unset means off. */
export interface FilesSessionFlags {
  hideFiles?: boolean;
  /** The url of the mp3 that replaces `chash.mp3`. `''` and `null` both mean no override. */
  overwriteCashRegisterSound?: string | null;
}

/** One row of the Files table, as far as these gates are concerned. */
export interface FileRow {
  /** Served back verbatim by `/uploads/[name]`; the reference calls the same field `contentType`. */
  contentType: string;
  /** The reference's `vidPath` — the file's url. */
  url: string;
}

/**
 * `hideFiles` — the Files main-tab `li` and the `#files` pane.
 *
 * The reference computes it once in `ngOnInit` (full.js:2289-2290):
 *
 * ```js
 * this.hideFiles = this.appService.globals.sessData.hideFiles
 *   || this.appService.globals.videoOnlyMode;
 * ```
 *
 * and binds `z('hidden', o.hideFiles)` to BOTH elements — the tab at 5375 and the pane at
 * 5410-5413. Hiding one without the other leaves either a tab that opens nothing or a pane
 * reachable by a tab that is gone.
 *
 * ONLY the first term is implemented, and that is a decision rather than an oversight.
 * `videoOnlyMode` is not a setting: it is a client global set from the `r` query parameter in
 * `docs/source/main.d6d3c112b59b7d0d.js` (offset 2596635, `f = s.get("r")`, then `f && '1' === f`),
 * which is the recording-bot mode. This room has no recording bot, so there is nothing to OR in;
 * inventing a second term would be inventing a mode. The disjunction is where it should be if one
 * ever arrives.
 */
export function filesSectionHidden(session: FilesSessionFlags): boolean {
  return Boolean(session.hideFiles);
}

/**
 * Which of the two `set-alert-sound-btn` buttons a row shows, or neither.
 *
 * `'set'` is node 22 and `'remove'` is node 23, and their gates are complements over the same three
 * terms (full.js:1972-1991):
 *
 * ```js
 * O(22, i.isP && e.contentType.indexOf('audio/') >= 0 &&
 *       (!sessData.overwriteCashRegisterSound ||
 *        (sessData.overwriteCashRegisterSound &&
 *         !sessData.overwriteCashRegisterSound.includes(e.vidPath))) ? 22 : -1)
 *
 * O(23, i.isP && e.contentType.indexOf('audio/') >= 0 &&
 *       sessData.overwriteCashRegisterSound &&
 *       sessData.overwriteCashRegisterSound.includes(e.vidPath) ? 23 : -1)
 * ```
 *
 * Returning one value rather than two booleans is the point: written as two independent `{#if}`
 * blocks in the template, a room that never receives `overwriteCashRegisterSound` renders BOTH at
 * once, which is exactly what happens if the setting is not allow-listed across.
 *
 * `includes` is a SUBSTRING test in the reference, not an equality test, and it is transcribed as
 * one because it is the gate — the observable behaviour is that a file whose url is contained in
 * the stored value reads as the current override. Two urls where one contains the other would both
 * report `'remove'`; that is the reference's behaviour and not something to quietly correct here.
 */
export type AlertSoundButton = 'set' | 'remove' | null;

export function alertSoundButtonFor(
  viewer: { isPresenter: boolean },
  session: FilesSessionFlags,
  file: FileRow
): AlertSoundButton {
  if (!viewer.isPresenter) return null;
  if (file.contentType.indexOf('audio/') < 0) return null;
  const override = session.overwriteCashRegisterSound;
  if (override && override.includes(file.url)) return 'remove';
  return 'set';
}

/**
 * The payload of `overwriteCashRegisterSound(url, on)`:
 *
 * ```js
 * overwriteCashRegisterSound(e, i) {
 *   this.appService.sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' });
 *   this.appService.globals.sessData.overwriteCashRegisterSound = i ? e : '';
 * }
 * ```
 *
 * Removing sends the EMPTY STRING, not the url being removed and not an absent field. The
 * controller's `saveSetting` stores `''` as null, which is the same "unset" the room already reads
 * as no override.
 */
export function alertSoundCommandValue(url: string, on: boolean): string {
  return on ? url : '';
}
