import type { MessageReactions } from '$lib/types';

/**
 * Reads the stored `reactions_json` blob back into a shape the room can render.
 *
 * Validating rather than casting: the column is text this server wrote, but "this server wrote it"
 * is a claim about the past, not a guarantee about the row in front of you — an older schema, a
 * hand-edited database or a partial write all produce text that parses and is not this shape. Every
 * entry that fails the check is DROPPED rather than the whole blob being discarded, so one bad
 * reaction cannot cost a message the rest of its reactions.
 *
 * Lifted out of `+page.server.ts` on 2026-08-14 when the chat read was paged: `chat-log.ts` needs
 * it for messages and the route still needs it for alerts and for captured-item overrides. Two
 * copies of a validator is how one of them stops matching the data.
 */
export function parseReactions(value: string): MessageReactions {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, reaction]) =>
          key.length > 0 &&
          reaction !== null &&
          typeof reaction === 'object' &&
          'emoji' in reaction &&
          typeof reaction.emoji === 'string' &&
          'clickedBy' in reaction &&
          Array.isArray(reaction.clickedBy) &&
          reaction.clickedBy.every((emailHash: unknown) => typeof emailHash === 'string')
      )
    ) as MessageReactions;
  } catch {
    return {};
  }
}
