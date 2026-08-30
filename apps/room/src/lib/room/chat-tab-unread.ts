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
 */
export function unreadFor(counts: ChatTabUnreadCounts, channel: string): ChatTabUnread {
  return counts[channel] ?? NOTHING_UNREAD;
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
 */
export function withoutChannel(counts: ChatTabUnreadCounts, channel: string): ChatTabUnreadCounts {
  if (!(channel in counts)) return counts;
  const { [channel]: _cleared, ...remaining } = counts;
  return remaining;
}
