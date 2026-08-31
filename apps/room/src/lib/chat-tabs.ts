/**
 * `chatTabsWithBadges` — extra chat channels a member sees only while they hold every named badge.
 *
 * ## What the reference does, read whole
 *
 * The setting is a STRING CONTAINING JSON — the fourth shipped that way, beside `alertLabels` and
 * `modAlertFilterList` — parsed once at session load:
 *
 * ```js
 * if (sessData.chatTabsWithBadges && sessData.chatTabsWithBadges.length > 0) {
 *   const s = sessData.chatTabsWithBadges.trim();
 *   globals.chatTabsWithBadges = JSON.parse(s)
 * }                                                                        // byte 1,147,664
 * ```
 *
 * and consumed in `registerForExtraChannels()`:
 *
 * ```js
 * globals.chatTabsWithBadges && globals.chatTabsWithBadges.forEach(i => {
 *   let o = !1;
 *   const s = i.badges.every(r =>
 *     globals.user.badges && globals.user.badges.length > 0 && globals.user.badges.includes(r));
 *   o = s || globals.isPresenter;
 *   o && globals.chatTabs.push({displayName: i.name, name: i.name, type: "r"})
 * })                                                                       // byte 1,007,526
 * ```
 *
 * The shape the owner types is in the setting's own help text:
 * `[ { "name": "easy channel", "badges": ["61eafd…", "6489f1…"] }, … ]`.
 *
 * ## THE DECISION IS MADE ON THE SERVER HERE, and that is not a detail
 *
 * Upstream evaluates that gate in the BROWSER against `globals.user.badges`, then subscribes the
 * socket to `/sess/{id}/chat/{name}/`. A member who edits that list in a console gets the channel.
 *
 * This repository decides every authority question on the server from data the server owns — the
 * 2026-08-07 privilege escalation is what that rule is for — so this module is a pure function and
 * the ROOM SERVER is what calls it, from `badges.byEmailHash` on the room's configuration. The
 * member is then TOLD which tabs they have; the tab list is never a request they make.
 *
 * ## An EMPTY badge list means EVERYONE, and that is upstream's behaviour rather than an oversight
 *
 * `[].every(…)` is `true`, and the `user.badges && user.badges.length > 0` guard lives INSIDE the
 * callback, so it never runs for an entry with no badges. An owner who writes `"badges": []` has
 * written a public extra channel. Reproduced deliberately, with `chat-tabs-contract.test.ts`
 * asserting it, because the alternative — reading it as "nobody" — would silently hide a channel an
 * owner had asked for, and there is no evidence upstream means that.
 */

/**
 * The two channels this room has always had, and the reason they are named here rather than in
 * `$lib/server/chat-log.ts` where they used to live.
 *
 * A badge channel's name comes from owner JSON, so the parser below has to REFUSE a name that
 * collides with one of these — otherwise an owner could write a `main` tab whose messages land in
 * every member's main log, because the channel name IS `messages.room`. That check needs the list,
 * and this module is shared client code while `chat-log.ts` is not, so the constant moved rather
 * than being copied.
 */
export const BUILT_IN_CHAT_TABS = ['main', 'off-topic'] as const;

export type BuiltInChatTab = (typeof BUILT_IN_CHAT_TABS)[number];

/**
 * What a tab is LABELLED, which is not always what the channel is CALLED.
 *
 * The captured strip renders `Main Chat` and `Off Topic` over channels named `main` and `off-topic`
 * (`dump-contract.ts` pins both labels), so the two built-ins carry a display name of their own. A
 * badge channel does not: upstream pushes `{displayName: i.name, name: i.name, type: "r"}`, so the
 * owner-typed name is both.
 *
 * A lookup rather than a field on the tab, because only two names in the room have ever had one and
 * inventing a `displayName` for every badge channel would be a second value to keep in step with the
 * first for no gain.
 */
const BUILT_IN_LABELS: Record<string, string> = {
  main: 'Main Chat',
  'off-topic': 'Off Topic'
};

export function chatTabLabel(name: string): string {
  return BUILT_IN_LABELS[name] ?? name;
}

/** One entry of the parsed setting: a channel name and the badges it demands. */
export interface BadgeChatTab {
  readonly name: string;
  readonly badges: readonly string[];
}

/**
 * The longest channel name accepted.
 *
 * A BOUND, not a product limit. The name is rendered in a tab strip, stored in `messages.room` on
 * every message posted to it, and used as a realtime channel key — so an unbounded one is an
 * unbounded string on three paths at once. Forty characters is well past anything the captured
 * strip renders (`Main Chat`, `Off Topic`) and short enough that the strip stays a strip.
 */
export const MAX_CHAT_TAB_NAME = 40;

const BUILT_IN = new Set<string>(BUILT_IN_CHAT_TABS);

/**
 * Control characters, refused in a channel name.
 *
 * The name reaches three places that are not HTML: a database column, a realtime channel key and a
 * log line. A newline or a NUL in any of them is one value that reads as two, and none of the three
 * has a reason to carry one.
 *
 * A CODEPOINT TEST rather than a regular expression, deliberately. The character class would have to
 * contain the characters themselves or their escapes, and the first is invisible in a diff while the
 * second is a range nobody checks. This says what it means.
 */
function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Read the owner's JSON, dropping anything that is not a usable entry.
 *
 * ## Deny by default, per ENTRY rather than per document
 *
 * A malformed document yields no tabs. A malformed ENTRY inside a good document is dropped and the
 * others survive, which is the rule `parseReactions` already applies to its own column and for the
 * same reason: one bad row must not cost an owner the rest of their configuration.
 *
 * Dropping is the fail-closed direction here — a dropped entry is a channel that does not appear,
 * never a channel that appears without its gate.
 *
 * ## What is refused, and why each one is a real case
 *
 * * **A name colliding with a built-in.** `main` would put a badge channel's messages into every
 *   member's main log, because the channel name IS `messages.room`.
 * * **A duplicate name.** Two entries with one name are two gates on one channel, and the second
 *   would silently widen or narrow the first depending on which was read last.
 * * **A `badges` value that is not an array of strings.** The gate is `every(…)` over it: a bare
 *   string would iterate its CHARACTERS, and a missing one would make the entry public by accident
 *   rather than by an owner saying so.
 */
export function parseChatTabsWithBadges(raw: string | null | undefined): BadgeChatTab[] {
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const seen = new Set<string>();
  const tabs: BadgeChatTab[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const candidate = entry as { name?: unknown; badges?: unknown };

    if (typeof candidate.name !== 'string') continue;
    const name = candidate.name.trim();
    if (!name || name.length > MAX_CHAT_TAB_NAME) continue;
    if (hasControlCharacter(name)) continue;
    if (BUILT_IN.has(name) || seen.has(name)) continue;

    if (!Array.isArray(candidate.badges)) continue;
    const badges: unknown[] = candidate.badges;
    if (!badges.every((badge) => typeof badge === 'string' && badge.length > 0)) continue;

    seen.add(name);
    tabs.push({ name, badges: badges as string[] });
  }

  return tabs;
}

/**
 * Which of those tabs THIS member may see.
 *
 * The reference's expression, term for term: every badge the entry names must be one the member
 * holds, and a presenter sees all of them regardless. `memberBadges` is a list of badge ids as
 * STRINGS — the room holds them as numbers on `badges.byEmailHash` and the owner types them as text,
 * so the caller stringifies once rather than every comparison doing it.
 *
 * The `memberBadges.length > 0` term is upstream's own and sits inside the callback, which is what
 * makes an entry with no badges public. See the module docblock.
 */
export function visibleBadgeTabs(
  tabs: readonly BadgeChatTab[],
  memberBadges: readonly string[],
  isPresenter: boolean
): BadgeChatTab[] {
  return tabs.filter(
    (tab) =>
      isPresenter ||
      tab.badges.every((badge) => memberBadges.length > 0 && memberBadges.includes(badge))
  );
}

/**
 * The whole ordered tab strip for one member: the built-ins first, then the badge channels.
 *
 * ORDER IS UPSTREAM'S OWN. `globals.chatTabs` already holds the built-in tabs when
 * `registerForExtraChannels` runs and each visible entry is `push`ed, so a badge channel always
 * comes after the two built-ins, and they appear in the order the owner wrote them.
 */
export function chatTabsForMember(
  raw: string | null | undefined,
  memberBadges: readonly string[],
  isPresenter: boolean,
  /**
   * `hasChannelTabs` — whether this room has an Off Topic channel at all.
   *
   * ## The divergence this closes, and why it was invisible
   *
   * The reference builds its whole tab list in ONE function, decoded whole from the pinned bundle at
   * bytes 1,146,625-1,147,200:
   *
   * ```js
   * chatTabs = []
   * chatTabs.push(altGenChannelName ? {displayName: altGenChannelName, name:"main", type:"r"}
   *                                 : {displayName:"Main Chat", name:"main", type:"r"})
   * hasChannelTabs && chatTabs.push(altOffTopicChannelName
   *                                 ? {displayName: altOffTopicChannelName, name:"offTopic", type:"r"}
   *                                 : {displayName:"Off Topic", name:"offTopic", type:"r"})
   * hasAdminOnlyChannel && chatTabs.push({displayName:"Admins", name:"adminChat", type:"po"})
   * extraAdminChannels && extraAdminChannels.split(",").forEach(r =>
   *   chatTabs.push({displayName:r, name:r, type:"p"}))
   * extraRegChannels && extraRegChannels.split(",").forEach(r =>
   *   chatTabs.push({displayName:r, name:r, type:"r"}))
   * ```
   *
   * **Only `main` is unconditional there.** This room shipped both built-ins unconditionally, so a
   * room whose owner had turned Off Topic OFF still showed it — a control nobody asked for, which is
   * the mirror of the dead-control rule the root standard forbids.
   *
   * It was never an argued divergence. It was never noticed: `hasChannelTabs` had **zero occurrences
   * anywhere in `apps/room/src`** before 2026-08-31, and it was found by measuring which of the
   * schema's unwired settings the reference actually reads rather than by anything failing.
   *
   * ## ABSENT MEANS TRUE, and that is load-bearing
   *
   * `undefined` is not "off". `room-settings-profile.ts:55` captures the default as `true`, and this
   * room has behaved as `true` for every room since the tab existed. Reading absence as `false` would
   * remove a tab from every room that has never stored the setting — a silent regression dressed as a
   * fix. Only an owner who explicitly turned it off loses the tab, which is exactly upstream.
   *
   * The default lives HERE, once, rather than at each call site: `chat-channels.ts` passes the raw
   * optional straight through, so there is one place that decides what absence means.
   *
   * ## What is still NOT built, named so it is not rediscovered
   *
   * Five more settings feed that same function and none of them is wired: `altGenChannelName` and
   * `altOffTopicChannelName` rename the two built-ins, `hasAdminOnlyChannel` adds an `adminChat` tab
   * of type `po`, and `extraAdminChannels` / `extraRegChannels` are comma-separated lists pushed as
   * types `p` and `r`. All five are recorded in `setting-coverage-contract.test.ts`'s
   * `REFERENCE_READS_AND_WE_DO_NOT`. Note their types: the reference has THREE (`r`, `p`, `po`) where
   * this room has one, so building them is a channel-model change and not five more pushes.
   */
  hasChannelTabs: boolean | undefined = undefined
): string[] {
  const offTopicVisible = hasChannelTabs ?? true;
  return [
    ...BUILT_IN_CHAT_TABS.filter((tab) => tab !== 'off-topic' || offTopicVisible),
    ...visibleBadgeTabs(parseChatTabsWithBadges(raw), memberBadges, isPresenter).map(
      (tab) => tab.name
    )
  ];
}
