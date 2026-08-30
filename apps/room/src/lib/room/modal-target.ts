import type { ManagedChatUser, MessageActionItem, ModalTargetUser } from '#lib/types.js';

/**
 * ── HOW A `ModalTargetUser` IS BUILT, from either of the two things that can select one ─────────
 *
 * The user modal is opened from THREE places and they hand it different objects: a ROSTER ROW, which
 * the server sends on the `/roster/` frame; a MESSAGE, which carries its sender's fields inline; and
 * a MANAGED-CHAT USER, from this browser's own muted and followed lists. All three have to become
 * the same `ModalTargetUser`, and every one of them used to do it itself.
 *
 * The third was found by this module's own contract on the day it was created. Gathering the first
 * two let `entitlement-shape-contract.test.ts` ask a question it could not ask before — "does either
 * class still assemble one of these?" — and the answer was yes: `openManagedInfo` had been building
 * its own since before either of the other two were consolidated. Nothing was searching for it,
 * because the old assertion counted `nick: user.displayName` and this one writes `nick: user.nick`.
 *
 * That is what this module exists to stop. `entitlement-shape-contract.test.ts` records the cost of
 * the last time these two mappings drifted: the second construction was missing all five permission
 * fields, so `ModalHost`'s `Boolean(targetUser.hasMic)` read `undefined` and drew every box
 * unchecked whatever the membership said — cosmetic while Save sent nothing, and a REVOCATION the
 * moment it started, because the endpoint writes `false` for every key it is not given. Nothing
 * failed at the time; the write path was green and wrong.
 *
 * ## Why here rather than on the classes
 *
 * Both mappings are PURE — a row in, an object out, no room state, no session, no wire. Holding
 * them on `RoomUserActions` and `RoomMessageActions` meant neither could be read or tested without
 * constructing a class and its collaborators, and it put the same subject on both sides of a seam
 * that exists for a different reason (what a click can DO, not what a click SELECTS).
 *
 * Extracted 2026-08-30, when both files were at their ceilings with one line of headroom apiece and
 * the ratchet in `source-size-contract.test.ts` asked for a slice rather than a larger number.
 */

/**
 * The roster-row fields a modal target is built from.
 *
 * Declared here, beside the mapping that reads them, and `RoomUserActions` constrains its `User`
 * generic to it — so the shape is stated once rather than transcribed on the class and again here.
 */
export interface RosterRowForTarget {
  id: number;
  displayName: string;
  email: string;
  emailHash: string;
  avatarUrl: string;
  status: string;
  role: string;
  /*
    The five permission checkboxes, optional because they reach a target through two paths and the
    mapping must not care which. Both DO carry them — `+page.server.ts` on the load and
    `sess/[room]/events` on the `/roster/` frame — but a member's copy is redacted to all-false at
    the hub, so this type must not promise the truth, only the shape.
  */
  hasAdminChat?: boolean;
  hasMic?: boolean;
  hasScreen?: boolean;
  hasCam?: boolean;
  canEditNotes?: boolean;
  /*
    The free-trial flag, under the WIRE's name rather than the modal's.

    It arrives as `isFT` on the `/roster/` frame (`sess/[room]/events/+server.ts:202`, from
    `room_members.is_trial`); the mapping below renames it to `isTrial`, which is what
    `ModalTargetUser` and the badge at `ModalHost.svelte:2771` call it. The rename happens at this
    boundary, once, rather than either name leaking across it.
  */
  isFT?: boolean;
}

/**
 * A roster row as the modal sees it.
 *
 * `userXrefID` and `_id` are the reference's own identifiers and are spread in only for a member
 * who is actually connected — upstream sets them from the live socket entry, so an offline row
 * carrying them would claim a session that does not exist.
 */
export function modalTargetFromRosterRow(user: RosterRowForTarget): ModalTargetUser {
  return {
    id: user.id,
    nick: user.displayName,
    email: user.email,
    emailHash: user.emailHash,
    pic: user.avatarUrl,
    status: user.status,
    permissions: user.role === 'user' ? 'r' : 'a',
    /*
      UIM-09. The Trial badge had markup and a gate at `ModalHost.svelte:2771` and no supply, so
      `targetUser.isTrial` was `undefined` for every member and the badge could not render for
      anyone — a control whose only reachable state was off.

      `?? false` rather than the bare value, because that gate is a truthiness test and an absent
      field and a false one must mean the same thing to it. The other ten fields UIM-09 names stay
      unsupplied and are recorded refusals in the audit: they have no producer anywhere, which is a
      different problem and must not be made to look like this one by a default.
    */
    isTrial: user.isFT ?? false,
    /*
      THE FIVE CHECKBOXES, carried through — and note they land on FLAT fields while arriving in a
      nested one. `ModalTargetUser.permissions` is already taken, by an unrelated `'r' | 'a'` string
      six lines above, so reusing the name here would have silently overwritten it.

      Without these the modal read `undefined` for all five and `Boolean(undefined)` drew every box
      unchecked, whatever the membership said. See this module's header for what that cost.
    */
    hasMic: user.hasMic ?? false,
    hasScreen: user.hasScreen ?? false,
    hasCam: user.hasCam ?? false,
    canEditNotes: user.canEditNotes ?? false,
    hasAdminChat: user.hasAdminChat ?? false,
    ...(user.status !== 'offline' ? { userXrefID: String(user.id), _id: String(user.id) } : {})
  };
}

/**
 * The sender of a message, as the modal sees them.
 *
 * A message carries fewer fields than a roster row — no role, no permission flags — and that is not
 * an omission to fill in with defaults. A target built from a message is used to open the card; the
 * permission checkboxes are seeded from the roster path, which is the one that has the truth.
 */
export function modalTargetFromMessage(item: MessageActionItem): ModalTargetUser {
  return {
    id: item.senderId,
    nick: item.senderName,
    emailHash: item.senderEmailHash,
    pic: item.senderAvatarUrl,
    status: item.senderStatus ?? 'offline',
    ...(item.senderStatus && item.senderStatus !== 'offline'
      ? { userXrefID: String(item.senderId), _id: String(item.senderId) }
      : {})
  };
}

/**
 * A managed-chat user as the modal sees them — the muted and followed lists' rows.
 *
 * `ManagedChatUser` is the reference's own shape and already uses the modal's vocabulary (`nick`,
 * `pic`, `_id`), so this mapping is mostly a widening rather than a rename. Two things are decided
 * here rather than carried:
 *
 * `status` is `'online'` unconditionally, and that is not an assumption — `openManagedInfo` refuses
 * before it reaches this function when `userXrefID` or `_id` is missing, and those two are exactly
 * what a logged-out entry lacks. A row that gets this far has a live session.
 *
 * No permission fields, for `modalTargetFromMessage`'s reason: this opens the card, and the
 * checkboxes seed from the roster path, which is the one holding the truth.
 */
export function modalTargetFromManagedUser(
  user: ManagedChatUser & { userXrefID: string; _id: string }
): ModalTargetUser {
  return {
    id: Number(user._id),
    nick: user.nick,
    emailHash: user.emailHash,
    pic: user.pic,
    status: 'online',
    userXrefID: user.userXrefID,
    _id: user._id
  };
}

/**
 * What `target` answers when nothing is selected — a modal that should not be open.
 *
 * The gravatar URL is the reference's own: it hashes `undefined` and asks for the `mm` mystery-man
 * fallback, which is what upstream renders in the same state. Kept literally rather than tidied,
 * because a reader who finds `avatar/undefined` in a network log should be able to find it here.
 */
export const MODAL_TARGET_PLACEHOLDER: ModalTargetUser = {
  id: 0,
  nick: '',
  emailHash: 'undefined',
  pic: 'https://secure.gravatar.com/avatar/undefined?d=mm&s=80',
  status: 'offline',
  ip: 'n/a'
};
