/**
 * The Alert Filter — each viewer chooses whose alerts they see.
 *
 * Decoded from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, component
 * `app-alert-filter-modal` at bytes 1,218,900-1,224,100. Spec:
 * `docs/decoded/alert-scheduler-filter-labels.md` §2.
 *
 * ## The filtering is CLIENT-SIDE, and that is not a shortcut
 *
 * The reference filters in the browser, in three places, and `updateAlertFilter` exists only to
 * PERSIST the selection — which is why its response re-fetches the log so the client code below can
 * re-apply it. An earlier draft of the spec said the server owned the filtering and building to that
 * would have produced an architecture the reference does not have.
 *
 * **The consequence is worth stating once, here.** Every alert reaches every browser and some are
 * hidden after arrival. This is a DISPLAY PREFERENCE, not an access control. Nothing about it stops
 * a member reading a filtered-out alert from the network tab. Filtering server-side would be a real
 * improvement and a deliberate divergence; the standing directive is to match first.
 *
 * ## The three sites are NOT the same shape
 *
 * | site | byte | shape |
 * | --- | --- | --- |
 * | live SSE arrival | 1,004,533 | two `continue` guards |
 * | the paged log | 1,017,070 | `.filter` |
 * | alerts search results | 1,020,817 | `.filter` |
 *
 * The SSE guard sits BEFORE `alertsLog.push` and BEFORE `emit("alertMsg")`, so on the live path a
 * filtered-out alert also suppresses the toast and the sound. That is a genuinely separate third
 * call site, not a duplicate of the log one.
 */

/** One entry of the room-configured list. Read from `selectAll()`, byte 1,220,674. */
export interface AlertFilterTrader {
  username: string;
  avatar: string;
}

/**
 * The viewer's selection: avatar hash → username.
 *
 * Keyed by AVATAR because that is what the predicate matches on — `alertFilterFor[se.avt]`, where
 * `avt` is the alert's own avatar hash. Not a user id and not a name.
 */
export type AlertFilterFor = Record<string, string>;

/**
 * `sessData.modAlertFilterList` is a STRING CONTAINING JSON, not an array.
 *
 * `syncModAlertFilterList()`, byte 1,221,905, verbatim:
 *
 * ```js
 * const e = JSON.parse(this.appService.globals.sessData.modAlertFilterList) || [];
 * this.appService.globals.modAlertFilterList = e;
 * ```
 *
 * **The `JSON.parse` is NOT inside a try/catch** — unlike the filter guard below, which is. That
 * asymmetry is the reference's and it is reproduced: a malformed setting throws HERE, when the modal
 * is opened, and the room keeps running. Wrapping it would be an improvement, and improvements come
 * after.
 *
 * `chatTabsWithBadges` and `alertLabels` are the two other room settings shipped as JSON strings.
 */
export function parseModAlertFilterList(raw: string | null | undefined): AlertFilterTrader[] {
  if (!raw) return [];
  return (JSON.parse(raw) as AlertFilterTrader[]) || [];
}

/**
 * Whether the feature is available at all.
 *
 * The reference gates its entry points on `sessData.modAlertFilterList` being truthy — bytes
 * 2,042,979 and 2,286,654. A room that configures no list has no feature, and there is nothing to
 * default from.
 */
export function alertFilterAvailable(raw: string | null | undefined): boolean {
  return Boolean(raw && raw.trim().length > 0);
}

/**
 * The predicate, from byte 1,017,070:
 *
 * ```js
 * showAlertsFrom ? alertFilterFor[se.avt] : !alertFilterFor[se.avt]
 * ```
 *
 * **`showAlertsFrom` INVERTS the whole meaning.** True keeps only the selected people — an
 * allow-list. False removes them — a deny-list. The same selection means opposite things, and
 * getting it backwards is silent and total.
 */
function selected(alertFilterFor: AlertFilterFor, avatarHash: string | null | undefined): boolean {
  return Boolean(avatarHash && alertFilterFor[avatarHash]);
}

/**
 * Should this alert be shown?
 *
 * The full guard, byte 1,017,070, reproduced including its failure mode:
 *
 * ```js
 * try {
 *   sessData.modAlertFilterList?.trim()?.length > 0 &&
 *     Object.keys(user.alertFilterFor).length > 0 &&
 *     (i.data = i.data.filter(...))
 * } catch {}
 * ```
 *
 * **It FAILS OPEN and it fails SILENTLY.** Both conditions must hold before anything is filtered,
 * and the whole thing sits inside an empty catch. A malformed list, a missing avatar, anything that
 * throws — every alert shows. That is the reference's behaviour and the safe direction for a
 * display filter to fail in, so it is reproduced rather than hardened.
 */
export function alertPassesFilter(input: {
  avatarHash: string | null | undefined;
  alertFilterFor: AlertFilterFor;
  showAlertsFrom: boolean;
  modAlertFilterListRaw: string | null | undefined;
}): boolean {
  try {
    if (!alertFilterAvailable(input.modAlertFilterListRaw)) return true;
    if (Object.keys(input.alertFilterFor).length === 0) return true;
    const isSelected = selected(input.alertFilterFor, input.avatarHash);
    return input.showAlertsFrom ? isSelected : !isSelected;
  } catch {
    // Fails open, exactly as the reference does. See the note above.
    return true;
  }
}

/**
 * The modal title, which is DYNAMIC and was hardcoded in our shell.
 *
 * Template at byte 1,222,000: `H(5, Sue, 1, 0)(6, wue, 1, 0)` then `v(7, " alerts from the
 * following: ")`, bound by `O(5, showAlertsFrom ? 5 : 6)`. `Sue` renders `"Show"` and `wue` renders
 * `"Filter out"` — bytes 1,219,020 and 1,219,050.
 *
 * **Note the trailing space after the colon.** It is in the capture and our shell dropped it.
 */
export const ALERT_FILTER_TITLE_SUFFIX = ' alerts from the following: ';

export function alertFilterTitle(showAlertsFrom: boolean): string {
  return `${showAlertsFrom ? 'Show' : 'Filter out'}${ALERT_FILTER_TITLE_SUFFIX}`;
}

/**
 * The two confirm strings, byte 1,220,940, branching on whether the selection is empty.
 *
 * ```js
 * `Are you sure you want to disable "${showAlertsFrom ? "only show alert " : "alert"}" filtering?`
 * `Are you sure you want to ${showAlertsFrom ? "only show " : "filter out "} alerts from the selected people?`
 * ```
 *
 * **The inner spacing is uneven and that is deliberate here.** `"only show alert "` carries a
 * trailing space and `"alert"` does not, so the first string renders a double space in one branch
 * and not the other; the second always renders a double space before `alerts`. Both are the
 * reference's, and both are exactly the kind of thing that gets tidied by accident.
 */
export function alertFilterConfirm(
  alertFilterFor: AlertFilterFor,
  showAlertsFrom: boolean
): string {
  const empty = Object.keys(alertFilterFor).length === 0;
  if (empty) {
    return `Are you sure you want to disable "${showAlertsFrom ? 'only show alert ' : 'alert'}" filtering?`;
  }
  return `Are you sure you want to ${showAlertsFrom ? 'only show ' : 'filter out '} alerts from the selected people?`;
}

/**
 * `toggleTraders(avatar, username)` — byte 1,220,674. Delete when set, assign otherwise, so the map
 * IS the selection.
 *
 * Returns a new object rather than mutating, because the caller holds it in `$state` and a mutation
 * would not be seen. The reference mutates; the observable result is the same.
 */
export function toggleTrader(
  alertFilterFor: AlertFilterFor,
  avatar: string,
  username: string
): AlertFilterFor {
  const next = { ...alertFilterFor };
  if (next[avatar]) delete next[avatar];
  else next[avatar] = username;
  return next;
}

/** `unselectAll()`, byte 1,220,600 — deletes every own key. */
export function unselectAllTraders(): AlertFilterFor {
  return {};
}

/**
 * `selectAll()`, byte 1,220,674:
 *
 * ```js
 * for (const e of globals.modAlertFilterList)
 *   globals.user.alertFilterFor[e.avatar] || (globals.user.alertFilterFor[e.avatar] = e.username);
 * ```
 *
 * Note it only ASSIGNS where absent, so an entry already selected keeps whatever username it holds.
 */
export function selectAllTraders(
  alertFilterFor: AlertFilterFor,
  list: readonly AlertFilterTrader[]
): AlertFilterFor {
  const next = { ...alertFilterFor };
  for (const trader of list) {
    if (!next[trader.avatar]) next[trader.avatar] = trader.username;
  }
  return next;
}

/**
 * `doFilteredAlerts` — byte 1,221,430, recomputed on every save and used to gate the header badge.
 */
export function hasActiveAlertFilter(alertFilterFor: AlertFilterFor): boolean {
  return Object.keys(alertFilterFor).length > 0;
}

/**
 * The row's icon class, byte 1,219,300:
 *
 * ```js
 * Rh("fas me-1 ", alertFilterFor[e.avatar] ? "fa-check-square text-success" : "fa-square text-opacity", "")
 * ```
 *
 * `text-opacity` is the component's own style, `.text-opacity{opacity:.1}`, not a Bootstrap utility.
 */
export function traderRowIconClass(alertFilterFor: AlertFilterFor, avatar: string): string {
  return `fas me-1 ${alertFilterFor[avatar] ? 'fa-check-square text-success' : 'fa-square text-opacity'}`;
}
