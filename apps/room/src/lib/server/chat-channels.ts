import { chatTabsForMember } from '#lib/chat-tabs.js';
import { isPresenterRole } from './auth';
import { hashEmail } from './connection';
import { readRoomConfig } from './room-config-client';

/**
 * Which chat channels THIS member may read from and post to, decided on the server.
 *
 * ## Why this exists as one function
 *
 * Four call sites need the same answer and none of them may compute it a second way: the page load
 * (which channels to read and which tabs to draw), `sendMessage` (which channel a post may name),
 * `loadOlderChatMessages` (which channel a page may be asked for) and the SSE subscribe (which
 * channels a listener is entitled to receive). A second implementation of an authorisation rule is
 * how `isP` and `isPresenter` came to disagree, and here the disagreement would be a member reading
 * a channel their badge does not open.
 *
 * ## The badge ids are STRINGS here and NUMBERS on the wire
 *
 * `badges.byEmailHash` maps a member's md5(email) to their badge ids as numbers — that is the shape
 * the controller sends and the shape `RoomBadges` declares. The owner types the ids into
 * `chatTabsWithBadges` as text. So they are stringified ONCE, here, rather than at every comparison
 * inside the filter.
 *
 * ## A presenter sees every badge channel
 *
 * `o = s || globals.isPresenter` — bundle byte 1,007,526. The role is read from the connected
 * account through `isPresenterRole`, never from anything the request asserts.
 *
 * ## What a room that configured nothing gets
 *
 * The two built-in channels and nothing else, which is what every room got before this existed.
 * `parseChatTabsWithBadges` returns an empty list for an absent, empty or malformed setting, so the
 * absent case needs no branch here.
 */
export async function memberChatChannels(
  request: Request,
  roomShortCode: string,
  user: { email: string; role: string }
): Promise<string[]> {
  const config = await readRoomConfig(request, roomShortCode, user.email);
  const badges = config.badges?.byEmailHash?.[hashEmail(user.email)] ?? [];

  return chatTabsForMember(
    config.settings?.chatTabsWithBadges,
    badges.map((badge) => String(badge)),
    isPresenterRole(user.role)
  );
}

/**
 * Whether a channel the CALLER named is one this member holds.
 *
 * Deny by default and by exact match — the list is the allow-list, so a channel that is not on it is
 * refused whether or not it exists for somebody else in the room. That distinction is the whole
 * point: a badge channel a member cannot see must be indistinguishable from one that was never
 * configured, or the refusal itself enumerates the room's private channels.
 */
export function isMemberChatChannel(channels: readonly string[], value: unknown): value is string {
  return typeof value === 'string' && channels.includes(value);
}
