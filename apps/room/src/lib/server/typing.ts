/**
 * Who is typing, per room and per chat channel.
 *
 * ## The transcription
 *
 * `updateLastTypedTime()` on every input, byte 1,435,993:
 *
 * ```js
 * this.lastTypedTime = new Date();
 * clearTimeout(this.typingTimer);
 * this.typingTimer = setTimeout(this.refreshTypingStatus.bind(this), this.typingDelayMillis);
 * if (!this.amITyping) {
 *   this.amITyping = true;
 *   sendServerCommand("typing", { c: channel || "main", n: nick, uid: userXrefID, pm: null, pu: null })
 * }
 * ```
 *
 * `refreshTypingStatus(force)` at 1,435,666 sends `notyping` when the box is empty, unfocused, or
 * `typingDelayMillis` (5,000) has passed since the last keystroke. So a typing burst is TWO frames,
 * not one per key — which is what makes broadcasting it affordable at all.
 *
 * The receiver (1,433,553) reads `e[channel]`, an array of `{n}`, joins the names with `,` and
 * counts them. Missing or empty clears both.
 *
 * ## Why this is memory and not a table
 *
 * Every other piece of room state here is a row, and this one deliberately is not. It is ephemeral,
 * it is worthless one keystroke later, and it changes far more often than anything the database
 * holds — a write per typing burst per member would be the highest-frequency write in the
 * application, for a value whose whole lifetime is five seconds. The room is a single Node process
 * (its database is a local SQLite file), so process memory is exactly as durable as the SSE
 * subscriber map that this feature exists to feed, and no more.
 *
 * **What that costs, stated rather than glossed:** a restart forgets who was typing. That is
 * correct — after a restart nobody is typing, because every client's own five-second timer has to
 * fire before it would say so again.
 *
 * ## The sweep is on READ, not on a timer
 *
 * A client that navigates away mid-word never sends its `notyping`. A background interval per room
 * would be a timer that outlives every listener; expiring on read costs nothing when nobody is
 * looking and cannot leak. `TYPING_TTL_MS` is deliberately longer than the client's own delay: the
 * client is the one that should normally clear itself, and this is the backstop for when it cannot.
 */

/** `typingDelayMillis = 5e3` — the client's own idle timeout. */
export const TYPING_DELAY_MS = 5_000;

/**
 * How long a `typing` survives without a `notyping`.
 *
 * Twice the client's delay, so an ordinary keystroke gap never trips it and a client that vanished
 * mid-word clears within a reasonable time. A value at or below `TYPING_DELAY_MS` would race the
 * client's own timer and make the indicator flicker for someone who is still typing.
 */
export const TYPING_TTL_MS = 2 * TYPING_DELAY_MS;

type Typist = { readonly name: string; readonly at: number };

/** `room -> channel -> userId -> {name, at}`. Rooms and channels are dropped when they empty. */
const typists = new Map<string, Map<string, Map<number, Typist>>>();

/** `c: channel || "main"` — the reference's own default, applied once, here. */
export function typingChannel(raw: string | undefined | null): string {
  const value = String(raw ?? '').trim();
  return value.length > 0 ? value : 'main';
}

function sweep(byUser: Map<number, Typist>, now: number): void {
  for (const [userId, typist] of byUser) {
    if (now - typist.at >= TYPING_TTL_MS) byUser.delete(userId);
  }
}

/** `typing` — the member started. Re-sending refreshes the stamp, which is what a re-send is for. */
export function noteTyping(
  room: string,
  channel: string,
  user: { id: number; name: string },
  now = Date.now()
): void {
  let byChannel = typists.get(room);
  if (!byChannel) typists.set(room, (byChannel = new Map()));
  let byUser = byChannel.get(channel);
  if (!byUser) byChannel.set(channel, (byUser = new Map()));
  byUser.set(user.id, { name: user.name, at: now });
}

/** `notyping` — the member stopped, or their box emptied or lost focus. */
export function noteNotTyping(room: string, channel: string, userId: number): void {
  const byUser = typists.get(room)?.get(channel);
  if (!byUser) return;
  byUser.delete(userId);
  if (byUser.size === 0) typists.get(room)?.delete(channel);
  if (typists.get(room)?.size === 0) typists.delete(room);
}

/**
 * The names currently typing in one channel, oldest first, EXCLUDING one viewer.
 *
 * The exclusion is the reference's own behaviour rather than an addition: it never shows you your
 * own name, because the frame that would say so is the one you just sent. Doing it here means the
 * server never puts a viewer's own name on their wire, rather than every client filtering itself
 * out and one of them forgetting.
 */
export function typistsIn(
  room: string,
  channel: string,
  exceptUserId: number,
  now = Date.now()
): string[] {
  const byUser = typists.get(room)?.get(channel);
  if (!byUser) return [];
  sweep(byUser, now);
  return [...byUser]
    .filter(([userId]) => userId !== exceptUserId)
    .sort(([, a], [, b]) => a.at - b.at)
    .map(([, typist]) => typist.name);
}

/** Every channel in a room that currently has anyone typing. Used to fan one update out. */
export function typingChannelsIn(room: string): string[] {
  return [...(typists.get(room)?.keys() ?? [])];
}

/** Test seam. Nothing in the application calls this; the registry is process-lifetime otherwise. */
export function resetTypingForTests(): void {
  typists.clear();
}
