import type { MessageReactions } from '#lib/types.js';

/**
 * One person clicking one reaction, on or off.
 *
 * ## Why it is shared, and what it replaced
 *
 * There were THREE copies of these nine lines: the server's real-row branch, the server's
 * captured-override branch, and the client's optimistic `toggleEvidenceReaction`. All three implement
 * the same four rules, and the copies are the sort that drift — the whole reason the message actions
 * were converted as one feature rather than six.
 *
 * The rules, in the order they matter:
 *
 *  1. **Toggle by identity, not by count.** Presence of the clicker's email hash decides. An
 *     increment/decrement would drift the moment a request was retried or a double-click landed
 *     twice, and there would be no way to recompute the truth from what is stored.
 *  2. **Remove the KEY when the last person leaves**, rather than leaving `clickedBy: []`. An empty
 *     array still renders a chip with a zero on it.
 *  3. **Keep the first emoji.** `reaction.emoji || emoji` — the stored one wins, so a client sending
 *     a different glyph for the same key cannot change what everybody else already sees.
 *  4. **Never mutate the input.** The server passes a freshly parsed object and the client passes a
 *     structured clone; taking a copy here means neither caller has to remember which it was.
 *
 * `clickedBy` holds email HASHES, not ids, because that is what the capture's own payload carries and
 * what the renderer compares against `data.user.emailHash`.
 */
export function toggleReaction(
  current: MessageReactions,
  key: string,
  emoji: string,
  clickerHash: string
): MessageReactions {
  const reactions = structuredClone(current);
  const reaction = reactions[key] ?? { emoji, clickedBy: [] };
  const clickedIndex = reaction.clickedBy.indexOf(clickerHash);

  if (clickedIndex >= 0) reaction.clickedBy.splice(clickedIndex, 1);
  else reaction.clickedBy.push(clickerHash);

  if (reaction.clickedBy.length === 0) delete reactions[key];
  else reactions[key] = { emoji: reaction.emoji || emoji, clickedBy: reaction.clickedBy };

  return reactions;
}
