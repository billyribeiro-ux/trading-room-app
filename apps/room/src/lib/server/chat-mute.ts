import { error } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';

import { db } from './db/index.js';
import { chatMutes } from './db/schema.js';
import { publishToUsers } from './room-events.js';
import { readRoomConfig } from './room-config-client.js';

/** 24 hours, the only duration either mute control offers. Named so the two callers cannot differ. */
const MUTE_HOURS = 24;

/**
 * MUTE ONE MEMBER, AND TELL THEM. The only place either half happens.
 *
 * ## Why this is a function and not two `db.insert` calls
 *
 * There are two doors onto the same act — the message context menu's `mute24` and the user modal's
 * *" Mute Chat for 24hrs "* — and until 2026-08-23 only the first existed, so there was nothing to
 * share and the insert sat inline in `message-actions.remote.ts`. Adding the second door meant either
 * a second copy of the insert or one function, and a second copy of a rule is exactly what shipped a
 * ban that enforced nothing earlier the same day: `internal/room-ban` hand-copied a mapping instead
 * of calling it and wrote the wrong half. One definition, two callers.
 *
 * ## THE MEMBER IS TOLD, which is the defect this closes
 *
 * The mute was ENFORCED and never ANNOUNCED. `refuseIfChatMuted` below has refused sends the whole
 * time, and the loader exposes `chatMutedTill` so the composer can show the captured `Chat Disabled`
 * block — but only on the NEXT page load. Between the mute and that load a member sat in front of an
 * enabled composer, typed, pressed send, and watched nothing happen.
 *
 * That is the same silence `unmuteChat` had until it was given this channel, and its docblock says
 * so in as many words: *"the state changed and nobody was told"*. The frame below is the other half
 * of that fix, and the reference agrees — `case "muteChat"` on `/privCmdsIn/` at bundle byte 996265
 * emits to a handler that both disables the composer and raises a dialog:
 *
 *     this.appEventBus.subscribe("muteChat", e => { this.chatEnabled = !1, bootbox.alert(e) })
 *     this.appEventBus.subscribe("unmuteChat", () => { this.chatEnabled = !0,
 *                                                      this.alertService.success("Chat enabled") })
 *
 * The asymmetry is upstream's and is reproduced: being silenced raises a DIALOG that must be
 * dismissed, being released raises a passing toast. Acknowledgement belongs on the bad news.
 *
 * ## What crosses, and what is NOT invented
 *
 * `bootbox.alert(e)` renders `xe.msg`, a sentence composed by a server that is not in the capture.
 * **It is not guessed here.** What crosses is `mutedTill`, and the receiver assembles the message
 * from the two fragments this repository DOES have captured — the `Chat Disabled` block in
 * `AlertChatArea.svelte` and `formatChatMutedTill`, which is the reference's own `EEE @ h:mm a`.
 *
 * ADDRESSED, never broadcast: `publishToUsers`, for the reason `chat-mute.remote.ts` gives about the
 * unmute. Being silenced is a disciplinary state and it is between the presenter and that member.
 *
 * @returns when the mute expires, so a caller can report it without recomputing the arithmetic
 */
export function applyChatMute(room: string, targetUserId: number, mutedByUserId: number): Date {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + MUTE_HOURS * 60 * 60 * 1000);

  db.insert(chatMutes)
    .values({
      /*
        A mute is granted in the room it was issued in. The controller models the same thing as role 3
        CHAT MUTED on a `room_users` membership, which is per room — muting somebody here must not
        silence them in a room this presenter has no authority over.
      */
      roomShortCode: room,
      targetUserId,
      mutedByUserId,
      expiresAt,
      createdAt
    })
    .run();

  /*
    AFTER the write, which is the opposite order to `kickUser` and deliberately so. The kick writes
    its ban first because publishing first would disconnect the member while the write is in flight.
    Here the frame does not disconnect anybody — it tells them about a row — so announcing a mute that
    then failed to insert would be the lie, and the row goes down first.
  */
  publishToUsers(room, [targetUserId], {
    channel: 'privCmds',
    data: { cmd: 'muteChat', targetUserId, mutedTill: expiresAt.toISOString() }
  });

  return expiresAt;
}

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
