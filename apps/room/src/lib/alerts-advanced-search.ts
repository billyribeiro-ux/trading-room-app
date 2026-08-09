/**
 * The Alerts Advanced Search model, transcribed from `app-alerts-advanced-search`.
 *
 * Sources, all read in full for this transcription:
 *   * `docs/source/components/app-alerts-advanced-search.compiled.js:1-200` - the component class:
 *     the hardcoded trader table, the `search` shape, and all ten methods.
 *   * `docs/source/components/app-alerts-advanced-search.render-helpers.js` - the eleven embedded
 *     templates, which is where the branches a DOM capture never rendered actually live.
 *   * `app-room/complete.clean.html:155555` - a rendered capture of the modal, which shows the
 *     empty state only. That is exactly why the bundle is the authority here: the shell in
 *     `ModalHost.svelte` matched this capture and was missing every gated branch.
 *
 * The captured component talks to a server (`appService.getAlertsAdvancedSearch`) that this room
 * does not have. Rather than fake a response, {@link filterAlerts} runs the same predicate set
 * against the alerts the room actually holds - real rows or an honest empty result, never
 * invented ones.
 */

/** One entry of the captured trader table (`compiled.js:5-26`), keyed by its gravatar hash. */
export type Trader = { username: string; avatar: string };

/**
 * The 20 traders the captured component hardcodes, verbatim including order.
 *
 * **These are PLACEHOLDERS.** Owner's direction, 2026-08-04: they exist so the logic of the
 * modal - toggling, the selected-label string, the search payload - can be built and verified
 * against the capture, and they will be replaced by this room's real senders. Nothing should be
 * built to depend on these particular names or hashes.
 *
 * They key by gravatar hash because that is what `toggleTraders(o.avatar, o.username)` writes,
 * and it is the same value this room already stores per sender as `senderEmailHash` - so the
 * replacement is a swap of this array, not a change to any of the logic below.
 */
export const CAPTURED_TRADERS: readonly Trader[] = [
  { username: 'Allison', avatar: 'c90b7e877c17de66ff99477ffa260e5f' },
  { username: 'Big Bad Voodoo Daddy', avatar: '178f883e5d5e2d65014184ea8c53eccd' },
  { username: 'Bruce Marshall', avatar: 'c4463f1d9bc057681ce6489842ab3560' },
  { username: 'Chris Brecher', avatar: '32bd682110860e9a3236b40f18aea1d3' },
  { username: 'Danielle Shay', avatar: '69ec1c2bf45a0805a4de3857281f6552' },
  { username: 'Heather', avatar: '7a21075eb3a4351785c979aab0f9e619' },
  { username: 'Henry', avatar: 'b2477abea370f548161935971e626de3' },
  { username: 'JC', avatar: 'fad3b84a1be6c0a1a64f896d6b6d4c7e' },
  { username: 'Kody Ashmore', avatar: 'c7a42275225d6ea4165dc2dadde70fe0' },
  { username: 'Lorna St. George', avatar: '672796ec44d7650f0b13d9302cfc0829' },
  { username: 'Melissa Beegle', avatar: 'aa44e468f60cc33cd82da51f3ad2c7c8' },
  { username: 'Mirza Catic', avatar: 'd1f9096a89e8e8f16974f7b98c4cc412' },
  { username: 'Omer Krdzic', avatar: 'a0cb40d4732d9a3585b4bc08e2e21159' },
  { username: 'RH', avatar: '8984cfde2f7735f6a1c0b2b5e24caf13' },
  { username: 'Sam', avatar: '37d5bf5b1f72c7f8fdcb2527d648ea4b' },
  { username: 'ST_Neil', avatar: '8e811d6b96df8e19b73bc821db6a09bf' },
  { username: 'Taylor', avatar: '09b36ef470e6b78cb5566170b001e576' },
  { username: 'TG Watkins', avatar: 'b4d52c4a7bfbbc45333515d2ab9de59c' },
  { username: 'Trendy Jon', avatar: '6a67150edb9b26ab4f5dd2928c6d256a' },
  { username: 'CML Alert Bot', avatar: '3216c53b52f2d36b6a539931685b442e' }
];

/** `this.search` from the captured constructor (`compiled.js:32-40`). */
export type AlertSearch = {
  /** avatar hash -> username, as `toggleTraders(o.avatar, o.username)` writes it. */
  traders: Record<string, string>;
  /** session key -> room name, as `toggleSess(o.key, o.value)` writes it. */
  rooms: Record<string, string>;
  txt: string;
  nonTradeAlert: boolean;
  startDate: string;
  endDate: string;
  isArchived: boolean;
};

export function emptySearch(): AlertSearch {
  return {
    traders: {},
    rooms: {},
    txt: '',
    nonTradeAlert: false,
    startDate: '',
    endDate: '',
    isArchived: false
  };
}

/**
 * `clearInput()` (`compiled.js:139-152`).
 *
 * One transcription note: the captured reset object omits `isArchived` entirely, so the field
 * becomes `undefined` rather than `false`. That is reproduced as `false` because the two are
 * observably identical - both render the checkbox unchecked, and every read of the field is a
 * truthiness test - while `undefined` would force the type to widen for no behavioural gain.
 */
export function clearInput(): AlertSearch {
  return emptySearch();
}

/**
 * `checkInputs()` (`compiled.js:153-161`). Gates two things in the template: the red Clear button
 * (const 31/48) and the footer's `justify-content-between` (`UMe`).
 *
 * Note it counts RESULTS as input - `msgs.length > 0` - so Clear stays available after a search
 * whose terms have since been emptied.
 */
export function checkInputs(search: AlertSearch, resultCount: number): boolean {
  return (
    search.txt !== '' ||
    search.startDate !== '' ||
    search.endDate !== '' ||
    search.nonTradeAlert ||
    resultCount > 0
  );
}

/**
 * The early return at the top of `searchAlerts()` (`compiled.js:105-113`).
 *
 * Deliberately NOT the same predicate as {@link checkInputs}: this one counts selected traders and
 * rooms and ignores the result count, so a trader-only search runs while the Clear button stays
 * hidden. Reproduced as two functions because the capture has two.
 */
export function canSearch(search: AlertSearch): boolean {
  return !(
    search.txt === '' &&
    search.startDate === '' &&
    search.endDate === '' &&
    Object.keys(search.rooms).length === 0 &&
    Object.keys(search.traders).length === 0 &&
    !search.nonTradeAlert
  );
}

/** `toggleTraders` / `toggleSess` (`compiled.js:162-166,177-181`) - a toggle, not a set. */
export function toggleKey(
  map: Record<string, string>,
  key: string,
  value: string
): Record<string, string> {
  const next = { ...map };
  if (next[key]) delete next[key];
  else next[key] = value;
  return next;
}

/** `this.selectedTradersStr = Object.values(...).join(', ')` - drives `span.selected-traders-str`. */
export function selectedLabel(map: Record<string, string>): string {
  return Object.values(map).join(', ');
}

/**
 * The subset of an alert this search reads. Structural, so the page's row type satisfies it
 * without a cast.
 *
 * `createdAt` is widened and `nonTrade` is optional deliberately: the page's alert list is a union
 * of database rows (where `createdAt` is a `Date`) and captured fixture rows (which carry neither
 * a numeric timestamp nor `nonTrade`). Narrowing it here would force a cast at the call site,
 * which would hide exactly the shape mismatch the type is meant to surface.
 */
export type SearchableAlert = {
  id: number;
  body: string;
  nonTrade?: boolean;
  createdAt: Date | string | number;
  senderEmailHash: string;
};

/** Alerts arrive with `createdAt` as a Date, an ISO string, or epoch ms depending on the source. */
function timestampOf(createdAt: Date | string | number): number {
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'number') return createdAt;
  return new Date(createdAt).getTime();
}

/**
 * The local stand-in for `appService.getAlertsAdvancedSearch(payload)`.
 *
 * The captured payload is
 * `{traders: Object.keys(traders), rooms, txt, startDate, endDate, nonTradeAlert, isArchived}`
 * (`compiled.js:125-133`), and `rooms` falls back to every session the user belongs to when none
 * is selected (`compiled.js:124`). Only the predicates this room can actually evaluate are applied:
 *
 *   * `traders` - matched against `senderEmailHash`, because the captured keys ARE gravatar
 *     hashes and that is the same value this room stores per sender.
 *   * `txt` - case-insensitive substring of the alert body.
 *   * `startDate` / `endDate` - `datetime-local` strings, compared as local time.
 *   * `nonTradeAlert` - when set, restricts to non-trade alerts.
 *
 * `rooms` and `isArchived` are NOT applied: this room is a single room with no archive table, so
 * there is nothing to filter on. They are carried in the state and rendered, because the capture
 * renders them, but they are honestly inert here rather than silently faked.
 */
export function filterAlerts<T extends SearchableAlert>(
  alerts: readonly T[],
  search: AlertSearch
): T[] {
  const traders = Object.keys(search.traders);
  const needle = search.txt.trim().toLowerCase();
  const start = search.startDate ? new Date(search.startDate).getTime() : null;
  const end = search.endDate ? new Date(search.endDate).getTime() : null;

  return alerts.filter((alert) => {
    if (traders.length > 0 && !traders.includes(alert.senderEmailHash)) return false;
    if (needle && !alert.body.toLowerCase().includes(needle)) return false;
    const at = timestampOf(alert.createdAt);
    if (start !== null && !Number.isNaN(start) && !Number.isNaN(at) && at < start) return false;
    if (end !== null && !Number.isNaN(end) && !Number.isNaN(at) && at > end) return false;
    if (search.nonTradeAlert && !alert.nonTrade) return false;
    return true;
  });
}

/** `onInputChange(e) { 13 === e.keyCode && (e.preventDefault(), this.searchAlerts()) }` */
export const SEARCH_ON_KEY = 'Enter';

/** `syncRooms()`'s bootbox text, verbatim (`compiled.js:168`). */
export const SYNC_ROOMS_CONFIRM = 'Are you sure you want to reload the room list?';
