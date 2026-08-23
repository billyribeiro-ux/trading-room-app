import { error } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';

import { db } from './db/index.js';
import { chatMutes } from './db/schema.js';
import { readRoomConfig } from './room-config-client.js';

/**
 * THE ONE PLACE THAT ANSWERS "may this person post here".
 *
 * ## Why it lives in `$lib/server` and not beside a command
 *
 * It started as a private function inside `chat-messages.remote.ts`, which was fine while chat was
 * its only caller. It is not: private chat needs the identical answer, and a `.remote.ts` module
 * cannot export a non-remote helper — the same constraint that produced `#lib/message-bounds.ts`,
 * recorded at `+page.server.ts:122-123`. So the invariant moves here rather than being written out
 * twice, which is exactly the argument `chat-messages.remote.ts` already makes for declaring it once
 * and having both commands call it.
 *
 * ## THERE ARE TWO MUTES AND THEY LIVE IN DIFFERENT DATABASES
 *
 * `chat_mutes` is the ROOM's own, 24 hours, written only by `mute24` from the message context menu.
 * The other is the CONTROLLER's: the manage page's `applyUserOpcode` sets membership `role = 3`,
 * which `/internal/room-config` returns as `member.muted` and `room-config-client.ts:360` documents
 * as *"3 muted"*. It has no expiry — it is the permanent one, and it is the more severe.
 *
 * Until 2026-08-23 only the first was enforced. The second was loaded into the page payload at
 * `+page.server.ts:381` and read by NOTHING, so an owner who muted somebody indefinitely watched them
 * keep posting: the control reported success, the row was written, and the room never asked.
 *
 * ## The order of the two checks is deliberate
 *
 * The local table first. It is an indexed SQLite read (`chat_mutes_target_expires_idx`) and the
 * control-plane call is a 2s-bounded HTTP round trip, so the cheap answer that refuses outright is
 * taken before the expensive one is paid for.
 *
 * ## Why the controller is ASKED rather than the payload trusted
 *
 * `data.muted` is a client-side fact by the time it exists — it was serialised into the page.
 * Authority is decided on the server from data the server owns, which on this boundary means asking
 * the control plane. That is the 2026-08-07 escalation rule applied to a mute rather than a role.
 *
 * `RoomConfigUnavailable` is deliberately NOT caught: `+page.server.ts:257` calls the same function
 * with no try/catch, so a room whose control plane is unreachable does not render at all. A send that
 * fails in that state is the existing policy, and the alternative is letting a muted member talk
 * whenever the controller hiccups.
 *
 * @param requestKey the request object, which keys `readRoomConfig`'s per-request cache
 */
export async function refuseIfChatMuted(
  requestKey: object,
  room: string,
  user: { id: number; email: string }
): Promise<void> {
  const activeMute = db
    .select({ id: chatMutes.id })
    .from(chatMutes)
    .where(
      and(
        eq(chatMutes.roomShortCode, room),
        eq(chatMutes.targetUserId, user.id),
        gt(chatMutes.expiresAt, new Date())
      )
    )
    .get();
  if (activeMute) error(403, 'Chat muted.');

  const membership = await readRoomConfig(requestKey, room, user.email);
  if (membership.member?.muted === true) error(403, 'Chat muted.');
}
