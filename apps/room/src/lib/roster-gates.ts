/**
 * The sidebar roster's gates and list transforms, decoded from the shipped bundle.
 *
 * Every function here is a transcription of something in the pinned v4 bundle,
 * `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` — 2,891,205 bytes, SHA-256 `40796ca8…`,
 * cited at its definition. They live outside `+page.svelte` for one reason: a gate that is only
 * reachable by rendering a 8000-line component is a gate nobody tests, and these are precisely the
 * predicates that decide whether one member can see another.
 */

/** The session flags these gates read. All optional: absent means the flag is off. */
export interface RosterSessionFlags {
  rosterVisibleToViewers?: boolean;
  onlyPresentersVisibleToViewers?: boolean;
  rosterCountVisibleToViewers?: boolean;
  /** "Show only usernames?" — see {@link rosterRowIsFull}. */
  showOnlyUsernames?: boolean;
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
 * The per-row gate, from `app-room-roster`'s `E2e` — byte **2,035,701**.
 *
 * `RSG-01`, 2026-08-31: this said `C2e`, and the code quoted below is right while the symbol is not.
 * `C2e` (byte 2,033,494) is the Private Chat dropdown ITEM — `d(0,"a",14), x("click", … startPC(o))`
 * — a different template in the same component. That is the shape that survives a review: a reader
 * checking the claim finds the expression correct and moves on. `SHL-06` and two in
 * `screen-volume.ts` were the same error, which is why this one is asserted rather than just fixed.
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
 * `Kn(2, g2e, !e.isP, e.isP || e.hasAdminChat)` with `g2e = (t, n) => ({regUser: t, presUser: n})`
 * — the pure function at byte **2,032,757**, applied by `D2e` at byte **2,035,468**.
 *
 * `RSG-02`, 2026-08-31: this named `u2e`, and there is no `u2e =` assignment anywhere in the
 * 2,891,205-byte bundle. `function u2e(` DOES exist, at byte 1,952,934, and it is an unrelated
 * template in another component — so the citation pointed at real code that has nothing to do with
 * this, which is worse than pointing at nothing.
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
 * "Show only usernames?" — whether a roster row draws in FULL or reduced to an icon and a name.
 *
 * ## The transcription
 *
 * Bundle byte 2,035,670, and it is the only occurrence of the setting in the whole file:
 *
 * ```js
 * O(1, !this.appService.globals.sessData.showOnlyUsernames || e.isP ? 1 : 2)
 * ```
 *
 * Slot 1 is `w2e`, twenty-one nodes and eight bindings — the avatar, the badges, the kebab menu,
 * the mention control, the years and the location. Slot 2 is `T2e`, four nodes and one binding:
 *
 * ```html
 * <div class="media">
 *   <i class="fas fa-user m-1"></i>
 *   <span (click)="doMention(nick)" (dblclick)="doUserInfo(...)">{{ nick }}</span>
 * </div>
 * ```
 *
 * ## `e` IS THE ROW, NOT THE VIEWER, and that is the whole setting
 *
 * The obvious reading — "members see only usernames" — is wrong, and it is wrong in the direction
 * that matters. `e` is the `$implicit` of the roster's `{#each}`, so `e.isP` asks whether the row
 * BEING DRAWN belongs to a presenter. A room with this on renders **presenters in full and members
 * as bare names**, to everybody including other members.
 *
 * So it is a setting about who is worth showing, not about who is allowed to look — which is why it
 * takes no viewer argument at all. Reading it the other way would have produced a room where
 * presenters could not see their own members' avatars and members could see everything, i.e. the
 * exact inverse. The triage row for this setting said "read the two slots before building — the
 * difference is the point", and this is the difference.
 *
 * ## What the reduced row keeps
 *
 * Both handlers. `doMention` on click and `doUserInfo` on double click survive into slot 2, so a
 * presenter can still open a reduced row's info card. Only the CHROME goes.
 */
export function rosterRowIsFull(entry: RosterEntryFlags, session: RosterSessionFlags): boolean {
  // `=== true`, fail-closed: absent means the room never set it, so every row draws in full.
  return session.showOnlyUsernames !== true || entry.isP === true;
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
 * Transcribed byte-for-byte at offset **1,075,893** of the pinned v4 bundle
 * (`docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`), the single `connectToRoom` emit in it:
 *
 * `RSG-03`: this named `docs/source/main.d6d3c112b59b7d0d.js`, an OLDER build that is in this
 * repository under no path — so a reader following it opened nothing. The OFFSET was right all
 * along and resolves correctly against the bundle this repository does hold, which is the whole
 * trap: the numbers were re-derived at some point and the filename beside them was not.
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
