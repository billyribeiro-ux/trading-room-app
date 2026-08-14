/**
 * `globals.trimLogSize` — the cap `preferences.trimChatLogs` keeps the chat log under.
 *
 * 300, read from the reference's own globals (`main.d6d3c112b59b7d0d.js` byte 977456, beside
 * `chatLogPageSize = 50`). It trims one message per arrival —
 * `trimChatLogs && chatLog[c].length > trimLogSize && chatLog[c].shift()` — so the log settles at
 * the cap rather than being cut in bulk, and it is always the OLDEST that goes.
 */
export const TRIM_LOG_SIZE = 300;

/**
 * The chat log, trimmed the way the reference trims it.
 *
 * Kept here beside the scroller because the two are the same concern: what the reader can reach.
 * Returns the SAME array when nothing is trimmed, so a derived value that depends on it does not
 * invalidate on every message in a quiet room.
 */
export function trimChatLog<T>(messages: readonly T[], enabled: boolean): readonly T[] {
  if (!enabled || messages.length <= TRIM_LOG_SIZE) return messages;
  /* `shift()` drops from the FRONT — the oldest. `slice(-n)` keeps the newest n, which is the same
     end state without mutating an array the caller owns. */
  return messages.slice(-TRIM_LOG_SIZE);
}

export const ROOM_SCROLLER_BOTTOM_TOLERANCE_PX = 20;
export const ROOM_SCROLLER_REPEAT_DELAY_MS = 200;

type RoomScrollerViewport = Pick<HTMLElement, 'offsetHeight' | 'scrollHeight' | 'scrollTop'>;

export function isRoomScrollerReadingHistory(scroller: RoomScrollerViewport) {
  return (
    scroller.scrollHeight - scroller.scrollTop >
    scroller.offsetHeight + ROOM_SCROLLER_BOTTOM_TOLERANCE_PX
  );
}

/**
 * Whether a new message should pull the viewport back to the bottom.
 *
 * The first two terms are the reference's own condition, verbatim:
 * `(!this.isScrollingUp || o.uid == this.appService.globals.user.uid) && (…scrollToBottom(!0))`
 * — you are not dragged away from history you are reading, unless the message is your own.
 *
 * `alwaysScrollToBottom` is the viewer's override of exactly that guard, and it is a SEPARATE
 * subscriber upstream rather than an extra clause:
 *
 * ```js
 * this.appEventBus.subscribe('alwaysScrollToBottom', () => {
 *   this.appService.globals.preferences.alwaysScrollToBottom && this.scrollToBottom(!0)
 * })
 * ```
 *
 * (`main.d6d3c112b59b7d0d.js` byte 1413501), fired from the `chatMsg` handler when the message
 * belongs to the channel on screen (byte 1430890). Two subscribers, one outcome — so folding it in
 * as a third term here is the same behaviour with one code path instead of two.
 *
 * **Chat only.** The subscriber lives on the component that also owns `this.channel`, `this.msgs`,
 * `this.searchTerm` and `chatLog[o.c]` — the chat scroller. The alerts scroller shares this
 * function but must NOT take the override, which is why the parameter defaults to false rather
 * than being required.
 *
 * Default off, matching the preferences blob at byte 979602 (`alwaysScrollToBottom:!1`).
 */
export function shouldAutoScrollForMessage(
  isReadingHistory: boolean,
  senderId: number | undefined,
  connectedUserId: number,
  alwaysScrollToBottom = false
) {
  return alwaysScrollToBottom || !isReadingHistory || senderId === connectedUserId;
}

export function scrollRoomScrollerToBottom(
  scroller: RoomScrollerViewport
): ReturnType<typeof globalThis.setTimeout>;
export function scrollRoomScrollerToBottom<Timer>(
  scroller: RoomScrollerViewport,
  schedule: (callback: () => void, delay: number) => Timer
): Timer;
export function scrollRoomScrollerToBottom(
  scroller: RoomScrollerViewport,
  schedule: (callback: () => void, delay: number) => unknown = globalThis.setTimeout
) {
  scroller.scrollTop = scroller.scrollHeight;

  return schedule(() => {
    scroller.scrollTop = scroller.scrollHeight;
  }, ROOM_SCROLLER_REPEAT_DELAY_MS);
}
