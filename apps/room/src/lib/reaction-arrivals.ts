import type { MessageReactions } from '#lib/types.js';

/**
 * Which reactions are NEW since the last load — USM-08, USM-09 and USM-10.
 *
 * ## Why a diff and not a payload on the wire
 *
 * The reference learns about a reaction from a field on an inbound frame: `reactionDetails` on
 * `updateChatMsg` (byte 1,011,021) and `qaReactionDetails` on `updateAlertMsg` (byte 1,408,450),
 * each carrying `{n, emoji, remove, txt}` — the reactor's NAME and the reacted-to TEXT.
 *
 * This room cannot copy that, and `#lib/message-mutation-frames.ts` already says why in its own
 * words: *"this hub's SSE stream is per ROOM while chat is per CHANNEL, so a frame carrying a
 * message body would put admin-channel text on every subscriber's wire."* `txt` IS a message body.
 * Upstream then filters to the right recipient in the BROWSER, which is the one place a filter
 * cannot be trusted.
 *
 * So the frame stays a trigger, `invalidateAll()` re-reads the rows the server decided this member
 * may see, and the difference between two of those reads is where a reaction is noticed. Everything
 * the toast renders comes from data the server had already chosen to send this viewer. It is the
 * same shape `RoomArrivals` uses for new messages, alerts and questions, one level down: rows
 * instead of a list, reactors instead of rows.
 *
 * ## The first pass announces nothing, for the reason `RoomArrivals` records
 *
 * Opening a room whose messages already carry fifty reactions must be silent. The first call seeds
 * and returns `[]`.
 *
 * **It needs no `#primed` flag to do that, and it HAD one until a control proved otherwise.** The
 * sibling class carries such a flag because its question is "is this row new?", which is
 * indistinguishable from "have I run before?" on the first pass. This one asks "did this row's
 * reactions change?", and a row with no previous entry has no answer either way — so the guard that
 * makes a NEW row silent makes the FIRST PASS silent for free. Deleting the flag left every test
 * green, which is what a redundant field looks like; it is recorded here so nobody adds it back
 * reasoning from the sibling.
 *
 * ## What is NOT unbounded here, and why the sibling class had to say otherwise
 *
 * `RoomArrivals` records that its marker set grows for the life of the page because
 * `alertQuestions` is read without a limit. This holds one entry per ROW and REPLACES the whole map
 * on every pass rather than accumulating, so it is bounded by the list it is fed — a row that has
 * left the list is dropped, because a row that is gone cannot change.
 */
export interface ReactionChange {
  /** The row the reaction landed on. */
  readonly rowId: number;
  /** `c.emoji` — read from the stored entry rather than from the wire. */
  readonly emoji: string;
  /** Who reacted, as the md5 of their address — the only identity a reaction stores. */
  readonly emailHash: string;
  /** `c.remove` — whether this pass LOST the reactor rather than gaining one. */
  readonly removed: boolean;
}

interface ReactedRow {
  readonly id: number;
  readonly reactions?: MessageReactions;
}

/**
 * The pairs that identify one person's one reaction to one row.
 *
 * The separator is a NUL rather than a space or a colon, for the reason `room-config-client.ts`
 * gives about its own cache key: a reaction KEY is chosen by whoever added the emoji and an email
 * hash is hex, so any printable separator is a character one of them could contain and two
 * different pairs could collide into one string.
 */
const pairsOf = (reactions: MessageReactions | undefined): Set<string> => {
  const pairs = new Set<string>();
  for (const reaction of Object.values(reactions ?? {})) {
    for (const emailHash of reaction.clickedBy) pairs.add(`${reaction.emoji}\u0000${emailHash}`);
  }
  return pairs;
};

export class ReactionArrivals {
  /** Row id -> the pairs it carried last time. Replaced per pass, never grown. */
  #seen = new Map<number, Set<string>>();

  /**
   * @returns every reaction added or removed since the previous call. `[]` on the first.
   */
  changes(rows: readonly ReactedRow[]): ReactionChange[] {
    const next = new Map<number, Set<string>>();
    const changes: ReactionChange[] = [];

    for (const row of rows) {
      const current = pairsOf(row.reactions);
      next.set(row.id, current);

      const previous = this.#seen.get(row.id);
      /*
        A row this pass has never seen is NEW, and a new row's reactions are not news either —
        whoever announces the row announces it. Only a row that was already here can CHANGE.
      */
      if (!previous) continue;

      for (const pair of current) {
        if (!previous.has(pair)) changes.push(change(row.id, pair, false));
      }
      for (const pair of previous) {
        if (!current.has(pair)) changes.push(change(row.id, pair, true));
      }
    }

    this.#seen = next;
    return changes;
  }
}

function change(rowId: number, pair: string, removed: boolean): ReactionChange {
  const at = pair.indexOf('\u0000');
  return { rowId, emoji: pair.slice(0, at), emailHash: pair.slice(at + 1), removed };
}
