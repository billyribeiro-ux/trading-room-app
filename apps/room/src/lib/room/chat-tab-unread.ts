/**
 * `unreadMsgs` / `unreadMentions` — what one chat column has not read, per channel.
 *
 * ## Why this is a plain `.ts` module and not part of `RoomChat`
 *
 * `RoomChat` holds the state and decides WHOSE it is; these three functions decide what a map of
 * counts becomes when a message arrives or a channel is opened, and neither answer needs a rune.
 * Keeping them here means the arithmetic can be tested without constructing a column, and — the
 * reason that matters — it means the ONE writer of a `$state.raw` field is a pure function whose
 * every path returns a NEW object. That property is what makes the `raw` correct rather than merely
 * cheap, and it is much easier to see in eighty lines than inside a class of four hundred.
 *
 * `chat.svelte.ts` was at 283 lines against its ceiling when this arrived, and the size contract's
 * instruction for that is "extract a slice rather than raising this number".
 */

/**
 * What one channel's tab strip has to show: how many messages arrived while you were not reading it,
 * and how many of those said your name.
 *
 * `acA-06`. Two numbers rather than one, because the reference renders them as two elements with
 * different rules — the pill always, the `(n)` inside it only for a presenter:
 *
 * ```js
 * function H_e(t,n){ … d(0,"span",29),v(1) … Ne(" ",i.unreadMentions[e.name],")") }   // 1,420,857
 * function $_e(t,n){ … d(0,"span",28),v(1),H(2,H_e,2,1,"span",29) …
 *   Ne("",i.unreadMsgs[e.name]," "),
 *   O(2, i.appService.globals.isPresenter && i.unreadMentions[e.name] ? 2 : -1) }      // 1,420,987
 *
 * 28 = [1,"badge","badge-pill","badge-warning","ml-1","counterBadge"]   29 = [1,"text-danger"]
 * ```
 */
export interface ChatTabUnread {
  readonly messages: number;
  readonly mentions: number;
}

/** Every channel's counts, for ONE column. Absent means zero — see `unreadFor`. */
export type ChatTabUnreadCounts = Readonly<Record<string, ChatTabUnread>>;

const NOTHING_UNREAD: ChatTabUnread = { messages: 0, mentions: 0 };

/**
 * The counts for one channel, with the absent case answered once.
 *
 * A missing key IS zero here, and this function is why no caller has to remember that. Upstream
 * reads `unreadMsgs[e.name]` straight out of a bare object and relies on `undefined` being falsy in
 * both the gate and the interpolation — which works in a template that renders `undefined` as the
 * empty string, and would put the literal text `undefined` in a Svelte badge.
 *
 * ## `Object.hasOwn`, and it is a correctness fix rather than a style preference
 *
 * This was `counts[channel] ?? NOTHING_UNREAD`, and that reads the PROTOTYPE CHAIN. A channel named
 * `constructor` returns a function; `toString` and `valueOf` return functions; `__proto__` returns
 * `Object.prototype`. None of them is nullish, so the `??` never fires and the caller gets an object
 * that is not a `ChatTabUnread` — `.messages` is `undefined`, and the badge this feeds renders the
 * literal text this docblock's own paragraph above exists to prevent.
 *
 * NOT A HYPOTHETICAL NAME. Channel names are the room owner's, from `chatTabsWithBadges`, and
 * `parseChatTabsWithBadges` refuses exactly three things: a collision with a built-in, a duplicate,
 * and a bad `badges` value — plus `MAX_CHAT_TAB_NAME` and control characters. `constructor` is a
 * legal channel name in every one of those checks, and the failure it produces is silent.
 *
 * The map is a plain object rather than a `Map` because it is `$state.raw` and is replaced whole,
 * which is argued at {@link withArrival}; `Object.hasOwn` is what makes that shape safe rather than
 * merely cheap.
 */
export function unreadFor(counts: ChatTabUnreadCounts, channel: string): ChatTabUnread {
  return Object.hasOwn(counts, channel) ? counts[channel] : NOTHING_UNREAD;
}

/**
 * One arrival, added to one column's map.
 *
 * REPLACES the map rather than editing it, because the field holding it is `$state.raw`: a deep
 * proxy over a record that is only ever read whole would cost on every render of every tab and buy
 * nothing. The cost of that choice is this function, and it is the only writer.
 */
export function withArrival(
  counts: ChatTabUnreadCounts,
  channel: string,
  countMention: boolean
): ChatTabUnreadCounts {
  const current = unreadFor(counts, channel);
  return {
    ...counts,
    [channel]: {
      messages: current.messages + 1,
      mentions: current.mentions + (countMention ? 1 : 0)
    }
  };
}

/**
 * A channel that has just been opened has nothing unread in it.
 *
 * `this.unreadMsgs[this.channel] = 0, this.unreadMentions[this.channel] = 0` — byte 1,439,687, at
 * the end of `switchChatChannel`. DELETES the key rather than writing two zeroes: `unreadFor`
 * already answers absent as zero, so a zero row would be a second spelling of the same fact and one
 * more entry to carry for the life of the page.
 *
 * `Object.hasOwn` rather than `in`, for the reason {@link unreadFor} gives at length and for one
 * more that belongs here: `in` walks the prototype chain too, so switching to a channel named
 * `toString` took the copy branch, allocated a new object identical to the old one, and reassigned a
 * `$state.raw` field — re-rendering every tab in the strip to remove a key that was never there.
 */
export function withoutChannel(counts: ChatTabUnreadCounts, channel: string): ChatTabUnreadCounts {
  if (!Object.hasOwn(counts, channel)) return counts;
  const { [channel]: _cleared, ...remaining } = counts;
  return remaining;
}
