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
  /**
   * `membership.isP` — THE ROW'S OWN presenter flag, and the field this builder's `permissions`
   * turns on since 2026-09-01.
   *
   * Optional for the reason the five below are: it reaches a target through two paths and the
   * mapping must not care which. Both supply it — `+page.server.ts:240` on the load and
   * `sess/[room]/events/+server.ts:201` on the `/roster/` frame, each as `… ?.isP === true`.
   *
   * NOT `isPresenterRole(user.role)`, and that is a measured distinction rather than a preference:
   * the roster frame deliberately moved OFF that expression, and its own comment at
   * `events/+server.ts:192` records why — a roster row's `role` is another account's `users` row,
   * reconciled only on that account's next page load, so it goes stale where `isP` does not.
   */
  isP?: boolean;
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
  isNew?: boolean;
  /**
   * `locStr` — the member's city line, e.g. `Waterbury, CT, US`. THE MODAL'S `location` CELL.
   *
   * ## The refusal that kept it empty was wrong about the one fact that decides it
   *
   * Both `server/room-events.ts:711` and `server/user-detail.ts:70` recorded that `location`
   * *"needs a geo-IP service this repository does not have"*. It does not, and this repository
   * already runs the lookup: the reference's own geo call is CLIENT-side (bundle 1,145,213,
   * `processData(){ … globals.locStr = i }`) and ships to the server on the login frame at 993,662.
   * This room does the same at `events.svelte.ts:1051`, POSTing to `api/roster/location`, which
   * calls `setRosterLocation` — and `RoomSidebar.svelte:870` has been RENDERING the result.
   *
   * So the value was sitting on the very object this mapping reads, and this interface omitted the
   * field, which is why the modal showed `undefined`. Re-measured 2026-09-01.
   *
   * `| null` because `patchRosterUser` can clear it. No new disclosure: `locStr` is redacted to a
   * member at the hub with `email`, so a member's copy of any row is already empty here.
   */
  locStr?: string | null;
}

/**
 * The live-only reference identifiers are spread only for a connected roster row; putting them on
 * an offline row would claim a session that does not exist.
 */
export function modalTargetFromRosterRow(user: RosterRowForTarget): ModalTargetUser {
  return {
    id: user.id,
    nick: user.displayName,
    email: user.email,
    emailHash: user.emailHash,
    pic: user.avatarUrl,
    status: user.status,
    /*
      `isP`, NOT `role === 'user'` — the old test could never be true.

      `RoomRole` is `'admin' | 'staff' | 'member'` (`server/room-role.ts:22`). **There is no
      `'user'`**: it is the REFERENCE's role vocabulary, which is how this typechecked on both sides
      while comparing against a value no row can hold. Every roster-derived target was therefore
      stamped `'a'` — "Presenter / Admin" — and three branches downstream of it became constants.
      `modal-target-permissions-contract.test.ts` names all four consequences and enforces the
      property that catches the class: both answers must be reachable from a role we can mint.

      `private-chat.svelte.ts:444` asks the identical question and already had it right.
    */
    permissions: user.isP ? 'a' : 'r',
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
    isNew: user.isNew ?? false,
    /*
      UIM-09's `location`, and it needed no new producer — see `locStr` on the interface above for
      why the recorded "needs a geo-IP service" refusal did not survive re-measurement.

      `|| undefined` rather than `?? undefined`: `patchRosterUser` clears this to the EMPTY STRING
      and the modal's cell renders `n/a` for an absent value, so an empty string must reach it as
      absent. `??` would pass `''` through and draw a blank cell where "we do not know" belongs.
    */
    location: user.locStr || undefined,
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
