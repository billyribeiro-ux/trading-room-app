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
 * ── THE REFERENCE'S THREE CHANNEL TYPES, and what each one was measured to mean ─────────────────
 *
 * `processSessData` gives every tab a `type` (bundle bytes 1,146,625-1,147,200). This room had ONE
 * type until 2026-09-02, which is why the five settings that feed that expression were a model
 * change rather than five more pushes.
 *
 * | type | pushed by | what it does in the reference |
 * | ---- | --------- | ----------------------------- |
 * | `r`  | `main`, `offTopic`, `extraRegChannels`, and every badge channel | nothing. Ungated. |
 * | `p`  | `extraAdminChannels`, and NOTHING else | **nothing, in the client.** See below. |
 * | `po` | `hasAdminOnlyChannel`'s `adminChat` tab | presenter-or-admin-chat only. Two gates. |
 *
 * ## `po` IS decoded, and it is two independent gates rather than one
 *
 * The triage recorded this as *"`po` versus `p` is undecoded"*. `po` is not: it is read at three
 * sites in the pinned bundle and they agree.
 *
 *   byte 1,008,074   `registerForExtraChannels`, the SUBSCRIPTION:
 *                    `if ("main" != i.name) if ("po" != i.type || user.isPresenter || user.hasAdminChat)`
 *   bytes 1,437,340 and 2,383,602   both chat columns, the RENDER:
 *                    `("po" == i.type && (isPresenter || user.hasAdminChat) || "po" != i.type) && chatTabs.push(i)`
 *
 * Subscribe and draw, gated separately on the same predicate. Reproduced here as ONE decision made
 * on the server, because the reference's is made twice in a browser — and a render gate a member
 * can step past with a console is not a gate at all.
 *
 * ## `p` IS decoded too, and the answer is that NOTHING READS IT
 *
 * `type:"p"` occurs **exactly once** in the whole 2,891,205-byte bundle — the `extraAdminChannels`
 * push at byte 1,147,139 — and there is **no comparison against it anywhere**. Every `type` test in
 * the bundle is against `"po"`. So in the reference's room client a `p` channel behaves exactly
 * like an `r` one, and the name "extraAdminChannels" describes an intent its own client does not
 * enforce.
 *
 * The distinction must matter to the reference's SERVER, which is not in the capture. So `p` is
 * carried as a value and treated as `r` for visibility — transcribing what the bundle does rather
 * than the behaviour its setting name implies, which is the same call
 * `advancedSearchAlerts` and `h264Enabled` are recorded under. If the server contract is ever
 * captured, the type is already on the tab and only this rule changes.
 */
export type ChatChannelType = 'r' | 'p' | 'po';

/** One tab of the strip: what the channel is CALLED, what it is LABELLED, and who may reach it. */
export interface ChatTab {
  readonly name: string;
  readonly displayName: string;
  readonly type: ChatChannelType;
}

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

/**
 * The admin-only channel `hasAdminOnlyChannel` adds.
 *
 * NOT a member of `BUILT_IN_CHAT_TABS`, and the difference is load-bearing: that constant is the
 * set an owner-typed name may not collide with, and this one must be in it for the same reason
 * `main` is — an `extraRegChannels` entry named `adminChat` would be a type-`r` channel sharing a
 * name with the type-`po` one, which is a member reading the admin channel. `RESERVED_CHANNEL_NAMES`
 * below is that set; `BUILT_IN_CHAT_TABS` stays the two tabs a room always has.
 *
 * The name is upstream's own (`{displayName:"Admins", name:"adminChat", type:"po"}`), in its
 * camelCase spelling, unlike `off-topic` — which this room hyphenated before the reference's own
 * `offTopic` was read, and which is now a divergence it cannot cheaply undo because it is stored in
 * `messages.room` on every message ever posted to it.
 */
export const ADMIN_CHAT_TAB = 'adminChat';

/** Every name an owner may NOT type, because typing it would alias a channel with a different gate. */
export const RESERVED_CHANNEL_NAMES: readonly string[] = [...BUILT_IN_CHAT_TABS, ADMIN_CHAT_TAB];

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

/**
 * The names `parseChatTabsWithBadges` and the two comma lists refuse.
 *
 * `RESERVED_CHANNEL_NAMES` rather than `BUILT_IN_CHAT_TABS` since 2026-09-02: `adminChat` joined it
 * when `hasAdminOnlyChannel` was built. A badge channel or an `extraRegChannels` entry with that
 * name would be an UNGATED channel aliasing the presenter-only one — the same defect the `main`
 * collision already refused, one gate further up.
 */
const BUILT_IN = new Set<string>(RESERVED_CHANNEL_NAMES);

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
 * The whole ordered tab strip for one member — the reference's `processSessData` expression,
 * reproduced, with every gate moved to the server.
 *
 * ## The expression this is, read whole at bundle bytes 1,146,625-1,147,200
 *
 * ```js
 * chatTabs = []
 * chatTabs.push(altGenChannelName ? {displayName: altGenChannelName, name:"main", type:"r"}
 *                                 : {displayName:"Main Chat",        name:"main", type:"r"})
 * hasChannelTabs      && chatTabs.push(altOffTopicChannelName
 *                                 ? {displayName: altOffTopicChannelName, name:"offTopic", type:"r"}
 *                                 : {displayName:"Off Topic",             name:"offTopic", type:"r"})
 * hasAdminOnlyChannel && chatTabs.push({displayName:"Admins", name:"adminChat", type:"po"})
 * extraAdminChannels  && extraAdminChannels.split(",").forEach(r => chatTabs.push({displayName:r, name:r, type:"p"}))
 * extraRegChannels    && extraRegChannels.split(",").forEach(r => chatTabs.push({displayName:r, name:r, type:"r"}))
 * ```
 *
 * Then `registerForExtraChannels` (byte 1,007,911) appends the badge channels, which is why they
 * come last here: `globals.chatTabs` already holds all of the above when it runs.
 *
 * ORDER IS UPSTREAM'S OWN and is reproduced exactly. It is not cosmetic — the strip is rendered in
 * this order and the first entry is the tab a member lands on.
 *
 * ## AN OPTIONS OBJECT, since 2026-09-02, and it is not a style preference
 *
 * This took four positional arguments and needed eight. Three of the eight are `string | undefined`
 * and two are `boolean | undefined`, so a transposed pair would type-check silently and swap a
 * channel's NAME with its LABEL, or one owner-typed list with another — turning `extraAdminChannels`
 * into `extraRegChannels`, which is the difference between a type-`p` channel and an ungated one.
 * Named fields make that a compiler error.
 *
 * ## ABSENT MEANS TRUE for `hasChannelTabs`, and that is load-bearing
 *
 * `undefined` is not "off". `room-settings-profile.ts:55` captures the default as `true`, and this
 * room has behaved as `true` since the tab existed. Reading absence as `false` would remove a tab
 * from every room that has never stored the setting — a silent regression dressed as a fix. Only an
 * owner who explicitly turned it off loses it, which is exactly upstream.
 *
 * `hasAdminOnlyChannel` reads the OTHER way, and for the same kind of reason rather than the
 * opposite one: absent means the room never asked for an admin channel, and defaulting a private
 * channel INTO existence is the direction that cannot be undone by a member. The captured profile
 * records its default as ON (`room-settings-profile.ts:56`), so a room that has stored the setting
 * gets what upstream gives it; a room that has stored nothing gets no extra private channel rather
 * than one nobody configured. Stated because the two defaults differ and the difference is
 * deliberate.
 */
export interface ChatTabOptions {
  /** `chatTabsWithBadges` — the owner's JSON, unparsed. */
  badgeTabsRaw?: string | null;
  /** This member's badge ids, as STRINGS. See `visibleBadgeTabs`. */
  memberBadges?: readonly string[];
  /** Decided on the SERVER from the connected account, never asserted by a request. */
  isPresenter: boolean;
  /**
   * `user.hasAdminChat` — the controller's per-room membership flag, the other half of the `po` gate.
   *
   * Upstream reads `globals.user.hasAdminChat` in the browser at all three `po` sites. Here it comes
   * off the membership the SERVER read, for the reason every authority decision in this repository
   * does: the 2026-08-07 privilege escalation was exactly a role the client asserted.
   */
  hasAdminChat?: boolean;
  /** `hasChannelTabs`. Absent means TRUE — see the docblock. */
  hasChannelTabs?: boolean;
  /** `hasAdminOnlyChannel`. Absent means FALSE — see the docblock. */
  hasAdminOnlyChannel?: boolean;
  /** `altGenChannelName` — renames the Main Chat TAB. The channel stays `main`. */
  altGenChannelName?: string | null;
  /** `altOffTopicChannelName` — the same for Off Topic. The channel stays `off-topic`. */
  altOffTopicChannelName?: string | null;
  /** `extraAdminChannels` — comma-separated; each entry becomes a type-`p` channel. */
  extraAdminChannels?: string | null;
  /** `extraRegChannels` — the same, as type `r`. */
  extraRegChannels?: string | null;
}

/**
 * One owner-typed comma list, split into channels.
 *
 * ## What upstream does, and the two places this deliberately does not follow it
 *
 * `extraAdminChannels.split(",").forEach(r => chatTabs.push({displayName: r, name: r, type: "p"}))`
 * — the typed text is BOTH the display name and the channel name, with no trimming, no length
 * bound, no character rule and no collision check.
 *
 * **Trimmed**, because `"a, b"` upstream yields a channel literally named `" b"`, and that string is
 * then a `messages.room` value, a realtime channel key and a tab label. A leading space in a
 * database column is the kind of value that reads as identical to another one and is not.
 *
 * **Refused when it collides or repeats.** `RESERVED_CHANNEL_NAMES` and the running `seen` set are
 * checked here for the reason `parseChatTabsWithBadges` checks them: an `extraRegChannels` entry
 * named `adminChat` is a type-`r` channel aliasing the type-`po` one, which is every member reading
 * the admin channel. Upstream has no such check, and this is the one place in this function where
 * matching would reproduce a privilege escalation rather than a cosmetic defect.
 *
 * The same bound and the same control-character rule as a badge channel, because the name lands in
 * the same three places.
 */
function typedChannels(
  raw: string | null | undefined,
  type: ChatChannelType,
  seen: Set<string>
): ChatTab[] {
  if (typeof raw !== 'string') return [];
  const tabs: ChatTab[] = [];

  for (const piece of raw.split(',')) {
    const name = piece.trim();
    if (!name || name.length > MAX_CHAT_TAB_NAME) continue;
    if (hasControlCharacter(name)) continue;
    if (seen.has(name)) continue;

    seen.add(name);
    // `{displayName: r, name: r}` — upstream's own, and the one thing about these it does not split.
    tabs.push({ name, displayName: name, type });
  }

  return tabs;
}

/**
 * Which of the parsed badge tabs THIS member may see, as full tabs.
 *
 * Upstream pushes them `{displayName: i.name, name: i.name, type: "r"}` at byte 1,007,911 — so a
 * badge channel's label IS its name, and it is ungated by type. Its gate is the badge list, which
 * `visibleBadgeTabs` already applies.
 */
function badgeChannels(
  raw: string | null | undefined,
  memberBadges: readonly string[],
  isPresenter: boolean,
  seen: Set<string>
): ChatTab[] {
  const tabs: ChatTab[] = [];
  for (const tab of visibleBadgeTabs(parseChatTabsWithBadges(raw), memberBadges, isPresenter)) {
    if (seen.has(tab.name)) continue;
    seen.add(tab.name);
    tabs.push({ name: tab.name, displayName: tab.name, type: 'r' });
  }
  return tabs;
}

export function chatTabsForMember(options: ChatTabOptions): ChatTab[] {
  const {
    badgeTabsRaw = null,
    memberBadges = [],
    isPresenter,
    hasAdminChat = false,
    hasChannelTabs,
    hasAdminOnlyChannel = false,
    altGenChannelName = null,
    altOffTopicChannelName = null,
    extraAdminChannels = null,
    extraRegChannels = null
  } = options;

  /*
    Tracks every name already claimed, across all four sources, so the LATER source loses.

    Upstream keeps no such set and pushes duplicates happily. The order it loses in is upstream's
    own order, so an owner who types `main` into `extraRegChannels` keeps their real Main Chat tab
    and loses the alias — which is the direction that cannot cost anybody a channel they had.
  */
  const seen = new Set<string>(RESERVED_CHANNEL_NAMES);
  const tabs: ChatTab[] = [];

  /*
    `main` is UNCONDITIONAL, and it is the only one that is. A room with everything switched off
    still has a Main Chat.

    `altGenChannelName` renames the TAB and not the CHANNEL — upstream keeps `name:"main"` on both
    branches. Getting that backwards would move every message in the room into a channel named
    after a label.
  */
  tabs.push({
    name: 'main',
    displayName: displayNameFor(altGenChannelName, 'Main Chat'),
    type: 'r'
  });

  if (hasChannelTabs ?? true) {
    tabs.push({
      name: 'off-topic',
      displayName: displayNameFor(altOffTopicChannelName, 'Off Topic'),
      type: 'r'
    });
  }

  /*
    `hasAdminOnlyChannel && push({displayName:"Admins", name:"adminChat", type:"po"})`, then the
    `po` gate applied HERE rather than at the two places upstream applies it.

    Upstream pushes the tab for everybody and filters at subscribe and at render, in the browser.
    Both of those are gates a member steps past with a console, and the subscribe one is what
    decides whether the SERVER sends them the channel's messages. So the tab does not exist for a
    member who may not have it, which makes the render gate unnecessary and the subscribe gate the
    same decision rather than a second one.
  */
  if (hasAdminOnlyChannel && (isPresenter || hasAdminChat)) {
    tabs.push({ name: ADMIN_CHAT_TAB, displayName: 'Admins', type: 'po' });
  }

  tabs.push(...typedChannels(extraAdminChannels, 'p', seen));
  tabs.push(...typedChannels(extraRegChannels, 'r', seen));
  tabs.push(...badgeChannels(badgeTabsRaw, memberBadges, isPresenter, seen));

  return tabs;
}

/**
 * An owner-typed tab label, or the captured default when there is none.
 *
 * Trimmed and bounded for the reason a channel NAME is, minus the collision rules: a label is
 * rendered and never stored as a key, so it cannot alias a channel. An owner who types only spaces
 * gets the default rather than a nameless tab.
 */
function displayNameFor(raw: string | null | undefined, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_CHAT_TAB_NAME) return fallback;
  if (hasControlCharacter(trimmed)) return fallback;
  return trimmed;
}

/** Just the channel names, which is what an allow-list and a keyed map need. */
export function chatChannelNames(tabs: readonly ChatTab[]): string[] {
  return tabs.map((tab) => tab.name);
}
