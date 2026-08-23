/**
 * The sidebar roster's gates and list transforms, decoded from the shipped bundle.
 *
 * Every function here is a transcription of something in `docs/source/main.d6d3c112b59b7d0d.js`,
 * cited at its definition. They live outside `+page.svelte` for one reason: a gate that is only
 * reachable by rendering a 8000-line component is a gate nobody tests, and these are precisely the
 * predicates that decide whether one member can see another.
 */

/** The session flags these gates read. All optional: absent means the flag is off. */
export interface RosterSessionFlags {
  rosterVisibleToViewers?: boolean;
  onlyPresentersVisibleToViewers?: boolean;
  rosterCountVisibleToViewers?: boolean;
  showArchivesToUsers?: boolean;
  showArchivesToSpecificPresenters?: string[] | null;
}

/** The connected account, as `globals.user` plus `globals.isPresenter`. */
export interface RosterViewer {
  isPresenter: boolean;
  email: string;
  userXrefID: string;
  hasAdminChat: boolean;
  isLimitedPresenter: boolean;
  denyArchivesAccess: boolean;
}

/** One roster entry, as the capture shapes it. */
export interface RosterEntryFlags {
  isP?: boolean;
  isFT?: boolean;
  hasAdminChat?: boolean;
  userXrefID?: string;
}

/**
 * `archivesAvailableTo()`:
 *
 * ```js
 * return this.appService.globals.isPresenter && !this.appService.globals.isLimitedPresenter
 *   ? !(this.appService.globals.sessData.showArchivesToSpecificPresenters &&
 *       !this.appService.globals.sessData.showArchivesToSpecificPresenters.includes(this.appService.globals.user.email))
 *   : !(!this.appService.globals.sessData.showArchivesToUsers ||
 *       this.appService.globals.user.denyArchivesAccess);
 * ```
 *
 * In English: a full presenter gets archives unless an explicit allowlist exists and leaves them
 * out; everyone else needs the session to have opened archives to users AND not be individually
 * denied. Ours showed Archives to everybody unconditionally until this existed.
 *
 * Note which side a LIMITED presenter falls on: the viewer branch. An allowlist that names them is
 * therefore irrelevant to them - they need `showArchivesToUsers` like anyone else.
 *
 * Gates the Archives menu (`O(32, …)`) and, on the caption overlay, the "Full Transcript History"
 * button (`O(5, …)`).
 */
export function archivesAvailableTo(viewer: RosterViewer, session: RosterSessionFlags): boolean {
  if (viewer.isPresenter && !viewer.isLimitedPresenter) {
    const allowed = session.showArchivesToSpecificPresenters;
    return !(allowed && !allowed.includes(viewer.email));
  }
  return !(!session.showArchivesToUsers || viewer.denyArchivesAccess);
}

/**
 * `O(44, sessData.onlyPresentersVisibleToViewers || sessData.rosterVisibleToViewers
 *        || isPresenter || user.hasAdminChat ? 44 : -1)` - the whole Users block.
 */
export function rosterBlockVisible(viewer: RosterViewer, session: RosterSessionFlags): boolean {
  return (
    Boolean(session.onlyPresentersVisibleToViewers) ||
    Boolean(session.rosterVisibleToViewers) ||
    viewer.isPresenter ||
    viewer.hasAdminChat
  );
}

/** `O(6, sessData.rosterCountVisibleToViewers || isPresenter ? 6 : -1)` - the badge only. */
export function rosterCountVisibleTo(viewer: RosterViewer, session: RosterSessionFlags): boolean {
  return Boolean(session.rosterCountVisibleToViewers) || viewer.isPresenter;
}

/**
 * The per-row gate, from `app-room-roster`'s `C2e`:
 *
 * ```js
 * O(1, sessData.onlyPresentersVisibleToViewers && (e.isP || e.hasAdminChat)
 *   || sessData.rosterVisibleToViewers
 *   || isPresenter
 *   || user.hasAdminChat && (e.isP || e.hasAdminChat || user.userXrefID === e.userXrefID)
 *   ? 1 : -1)
 * ```
 *
 * This is NOT the same predicate as `rosterBlockVisible`, and the difference is the point:
 * `onlyPresentersVisibleToViewers` opens the block for everybody and then admits only presenters
 * and admin-chat accounts into it. Applying the outer gate alone renders every member to every
 * member - the exact opposite of what the flag is for.
 */
export function rosterRowVisible(
  viewer: RosterViewer,
  session: RosterSessionFlags,
  entry: RosterEntryFlags
): boolean {
  const privileged = Boolean(entry.isP) || Boolean(entry.hasAdminChat);
  return (
    (Boolean(session.onlyPresentersVisibleToViewers) && privileged) ||
    Boolean(session.rosterVisibleToViewers) ||
    viewer.isPresenter ||
    (viewer.hasAdminChat && (privileged || viewer.userXrefID === entry.userXrefID))
  );
}

/**
 * `Kn(2, u2e, !e.isP, e.isP || e.hasAdminChat)` with `u2e = (t, n) => ({regUser: t, presUser: n})`.
 *
 * Not mutually exclusive: an admin-chat account that is not a presenter carries BOTH classes.
 */
export function rosterRowClass(entry: RosterEntryFlags): string {
  const classes: string[] = [];
  if (!entry.isP) classes.push('regUser');
  if (entry.isP || entry.hasAdminChat) classes.push('presUser');
  return classes.join(' ');
}

/**
 * The `sortUsers` pipe:
 *
 * ```js
 * transform(e, i) { return i ? e.sort((o, s) => o.isP ? o : s.isP ? s : (o.nick.toLowerCase() > s.nick.toLowerCase() ? 1 : -1)) : e }
 * ```
 *
 * The comparator returns an OBJECT whenever either side is a presenter. `Array.prototype.sort`
 * coerces the result with `+`, gets NaN, and treats it as 0 - so presenters compare equal to
 * everyone and only non-presenters actually reorder. `0` reproduces that observable behaviour
 * rather than "fixing" it into a presenters-first sort the capture does not perform.
 *
 * The pipe sorts in place, mutating `globals.roster`; this copies, because doing that to reactive
 * state would make the toggle rewrite the roster itself.
 */
export function sortRosterByNick<T extends { isP?: boolean; displayName: string }>(
  entries: readonly T[],
  enabled: boolean
): T[] {
  if (!enabled) return [...entries];
  return [...entries].sort((left, right) => {
    if (left.isP || right.isP) return 0;
    return left.displayName.toLowerCase() > right.displayName.toLowerCase() ? 1 : -1;
  });
}

/**
 * The `sortFTUsers` pipe:
 *
 * ```js
 * transform(e, i) { return i ? e.filter(s => s.isFT).sort((s, r) => s.nick.toLowerCase() > r.nick.toLowerCase() ? 1 : -1) : e }
 * ```
 *
 * A filter as much as a sort - "Sort by Trials" hides everyone else.
 */
export function filterRosterToTrials<T extends { isFT?: boolean; displayName: string }>(
  entries: readonly T[],
  enabled: boolean
): T[] {
  if (!enabled) return [...entries];
  return entries
    .filter((entry) => entry.isFT)
    .sort((left, right) =>
      left.displayName.toLowerCase() > right.displayName.toLowerCase() ? 1 : -1
    );
}

/**
 * `uniqueRoster(e)` - dedupe by `emailHash`, keeping the first occurrence.
 *
 * One person with three tabs open is three entries and one candidate. Without this a random draw
 * is weighted by how many windows someone happens to have left open.
 */
export function uniqueRoster<T extends { emailHash?: string }>(entries: readonly T[]) {
  const seen: (string | undefined)[] = [];
  const uniqueUsers: T[] = [];
  for (const entry of entries) {
    if (seen.includes(entry.emailHash)) continue;
    seen.push(entry.emailHash);
    uniqueUsers.push(entry);
  }
  return { uniqueUsers, totalUsers: entries.length, unique: uniqueUsers.length };
}

/**
 * `searchUsers()`:
 *
 * ```js
 * let e = this.userSearchTermTxt.toLocaleLowerCase();
 * this.visibleRoster = globals.roster.filter(i => !!(i.nick.toLowerCase().indexOf(e) >= 0
 *   || i.emailHash && i.emailHash === this.appService.hashEmail(e)))
 * ```
 *
 * The capture hashes the term because its roster entries carry only `emailHash`, never the
 * address. Ours carry `email`, so the second clause is a direct comparison - same result, without
 * an md5 implementation in the browser to reach it.
 *
 * ## AND THAT IS TRUE FOR A PRESENTER ONLY, since 2026-08-18
 *
 * The sentence above described a shortcut whose real cost was privacy: carrying the address instead
 * of the hash meant `publishRosterToRoom` handed every member every other member's email. It now
 * redacts `email` alongside `locStr` for anyone who is not a presenter, so a member's entries
 * arrive with `email: ''` and this second clause simply never matches for them.
 *
 * That is the accepted cost of the fix, chosen by the owner over adding md5 to the client bundle:
 * a MEMBER can no longer find someone by typing their full address, which is a flow that requires
 * already knowing it. Name search is untouched for everyone, and `emailHash` still travels, so
 * avatars, badges and `uniqueRoster` are unaffected.
 *
 * If the browser ever gains an md5, the reference-faithful form is one line - compare
 * `entry.emailHash` against the hashed term - and the address can leave the payload entirely.
 */
export function searchRoster<T extends { displayName: string; email: string }>(
  entries: readonly T[],
  term: string
): T[] {
  const needle = term.toLocaleLowerCase();
  return entries.filter(
    (entry) =>
      entry.displayName.toLowerCase().indexOf(needle) >= 0 || entry.email.toLowerCase() === needle
  );
}

/**
 * `getRandomUser()`'s candidate set:
 *
 * ```js
 * let o = globals.roster.filter(r => !r.isP);
 * let {uniqueUsers: s} = uniqueRoster(o);
 * i && (s = s.filter(r => r.isFT));
 * ```
 *
 * Non-presenters, deduped, optionally narrowed to trials. Both answers to "Only select from
 * Trials?" run this - "Yes" only adds the last line.
 */
export function randomUserCandidates<T extends RosterEntryFlags & { emailHash?: string }>(
  roster: readonly T[],
  trialsOnly: boolean
): T[] {
  const { uniqueUsers } = uniqueRoster(roster.filter((entry) => !entry.isP));
  return trialsOnly ? uniqueUsers.filter((entry) => entry.isFT) : uniqueUsers;
}

/**
 * `randomUser(e)`'s guard: `var o = e.length; if (o >= 2) { … }` - with NO else.
 *
 * Fewer than two candidates and no dialog opens at all. Deliberate: drawing a "random" user from a
 * field of one is not a draw.
 */
export const RANDOM_USER_MINIMUM = 2;

/**
 * The five per-room permissions the controller's `#permissionsModal` edits.
 *
 * Absent means not granted: a guest has no membership row, and an unset key in
 * `permissions_json` is the reference's own "unchecked".
 */
export interface MediaPermissions {
  hasMic?: boolean;
  hasCam?: boolean;
  hasScreen?: boolean;
}

/**
 * `isP` as the reference computes it when it joins the media server.
 *
 * Transcribed byte-for-byte from `docs/source/main.d6d3c112b59b7d0d.js` at offset 1075893, the
 * single `connectToRoom` emit in the bundle:
 *
 * ```js
 * i.socket.emit("cmd", {
 *   cmd: "connectToRoom",
 *   roomID: i.globals.sessionID,
 *   name: i.globals.user.name,
 *   email: i.globals.user.email,
 *   perms: i.globals.user.perms,
 *   tok: i.globals.sesionToken,
 *   isP: i.globals.user.isPresenter || i.globals.user.hasCam
 *        || i.globals.user.hasMic   || i.globals.user.hasScreen,
 *   userID: i.globals.user.id,
 *   pw: i.globals.sessData.roomPublicSecret
 * }, ...)
 * ```
 *
 * This is the whole point of the five permissions: a Participant granted mic, cam or screen joins
 * media as a producer, without being made a Presenter. Deciding it from `role` alone — which is
 * what this application did until 2026-08-07 — means the permissions modal changes nothing on the
 * media path, in either direction. A member granted a mic could not speak, and the grant said so.
 *
 * Note the disjunction is over the THREE media permissions only. `hasAdminChat` and `canEditNotes`
 * are not in it; they gate chat and notes, and including them would let a chat moderator open a
 * microphone.
 */
export function joinsMediaAsProducer(viewer: { isPresenter: boolean } & MediaPermissions): boolean {
  return Boolean(viewer.isPresenter || viewer.hasCam || viewer.hasMic || viewer.hasScreen);
}

/**
 * Whether a member is INDIVIDUALLY blocked from the archives.
 *
 * `denyArchivesAccess` lives on the controller's `room_users` row and means exactly one thing:
 * this person, specifically, is blocked — the reference's `updateUser(13)` / `updateUser(14)` pair
 * and the red `fa-hdd-o` on their row. It is not the room-level switch; that is
 * `showArchivesToUsers`, which {@link archivesAvailableTo} checks first.
 *
 * Two cases the old `member?.denyArchivesAccess ?? false` collapsed into one:
 *
 *  - **No membership.** A guest. They cannot be individually blocked because there is no row to
 *    block, so this is `false` and their access is decided by the room-level setting alone.
 *  - **A membership that does not say.** A malformed or truncated response. Answering "not
 *    blocked" hands out the archives on a bad payload, so this fails CLOSED: only an explicit
 *    `false` grants.
 *
 * `readRoomConfig` throws rather than returning a partial config, so a null membership is
 * unambiguously "not a member" and never "we could not tell".
 */
export function memberDeniedArchives(
  member: { denyArchivesAccess?: boolean } | null | undefined
): boolean {
  if (!member) return false;
  return member.denyArchivesAccess !== false;
}

/** What the geolocation lookup returns, of which only three fields are used. */
export interface GeoLocation {
  city?: string | null;
  region_code?: string | null;
  country_code?: string | null;
}

/**
 * `locStr` — the one-line location under a member's name in the roster.
 *
 * The reference's string rule, exactly:
 *
 *  - start with `city`;
 *  - append `", " + region_code`;
 *  - `country_code` appends **with a comma only if the string so far is non-empty**, otherwise it
 *    becomes the whole string.
 *
 * So a full answer gives `Waterbury, CT, US`, and an answer with only a country gives `US` rather
 * than `, , US`. That last branch is the part worth having a test for: it is the difference between
 * a tidy label and a row that reads as broken.
 */
export function formatUserLocation(location: GeoLocation | null | undefined): string {
  if (!location) return '';
  let out = String(location.city ?? '').trim();
  const region = String(location.region_code ?? '').trim();
  const country = String(location.country_code ?? '').trim();
  if (region) out = out ? `${out}, ${region}` : region;
  if (country) out = out ? `${out}, ${country}` : country;
  return out;
}

/**
 * Who may see a member's location.
 *
 * `globals.isPresenter && entry.privData` — **presenter only**, and it lives under `privData`
 * beside the IP address. A member never sees anyone's city, including their own row.
 *
 * Shipping this ungated would disclose every member's city to every other member in the room,
 * which is why it is a predicate with a test rather than an `{#if}` in an 8000-line component.
 */
export function locationVisibleTo(
  viewer: { isPresenter: boolean },
  entry: { locStr?: string | null }
): boolean {
  return Boolean(viewer.isPresenter && String(entry.locStr ?? '').trim());
}
