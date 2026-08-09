/**
 * The controller's per-room role, mapped onto the one distinction this room makes.
 *
 * There is exactly one authority for what somebody may do here, and it is the membership row in
 * `new-room-control`. This module is the only place that reads it, so `/session` and the page load
 * cannot drift into two answers — which is the shape of the defect this replaced: role came from
 * the handoff token type in one place and from the membership in another, and every gate read the
 * wrong one.
 *
 * The room's own vocabulary only ever distinguishes presenter from not (`isPresenterRole` is
 * `'staff' || 'admin'`), so the mapping collapses the controller's numeric model onto that:
 *
 *   0 Owner                            -> admin    a presenter, and the account that owns the room
 *   1 Presenter (!nonPresenter)        -> staff
 *   1 Admin      (nonPresenter)        -> member   `isNonPresenterAdmin` is explicitly NOT one
 *   2 Participant / 3 muted / 4 banned -> member
 *   no membership at all (a guest)     -> member
 */
import type { RoomMembership } from './room-config-client';

/** The room's local role strings. */
export type RoomRole = 'admin' | 'staff' | 'member';

/**
 * Fails closed by construction: everything that is not demonstrably a presenter is a member.
 *
 * `null` covers both a guest, who has no membership, and an unreadable controller — the room
 * cannot establish what somebody may do, and the safe answer to that is not "whatever they were
 * last time".
 */
export function roomRoleFor(membership: RoomMembership | null): RoomRole {
  if (!membership?.isP) return 'member';
  return membership.role === 0 ? 'admin' : 'staff';
}

/**
 * Whether the controller has shut this member out of this room.
 *
 * Role 4 is the reference's BANNED, written by `applyUserOpcode` case 4 alongside the `banned`
 * column. Both are checked: the roles are what the reference renders and the column predates that
 * correction, so a row could carry either.
 *
 * Without this the room let a banned member straight in as an ordinary one — the mapping sent
 * role 4 to `member` and nothing looked at it again.
 */
export function isBannedFromRoom(membership: RoomMembership | null): boolean {
  return membership?.role === 4 || membership?.banned === true;
}

/**
 * Whether a closed room should turn this person away.
 *
 * The evidence is the controller's own guest login: `session/[code]` refuses with "This room is
 * closed." before it will mint anything. Nothing in the room's shipped bundle knows about room
 * state at all, so that login is the whole of what the capture establishes.
 *
 * It says nothing about a presenter, and this is a decision rather than a captured fact, recorded
 * as one: a presenter is let in. They are the person who opens the room, a room on `autoOpenTime`
 * has to be prepared before it opens, and the account page offers Launch whatever the state — so
 * refusing them would invent a restriction that nothing asks for and no evidence supports.
 *
 * Enforced in the ROOM rather than at `/launch/[id]`, because the door belongs to the room. Two
 * gates for one rule is how the room ended up with two answers about who is a presenter.
 */
export function isShutOutByRoomState(
  roomState: string,
  membership: RoomMembership | null
): boolean {
  if (roomState === 'open') return false;
  return roomRoleFor(membership) === 'member';
}
