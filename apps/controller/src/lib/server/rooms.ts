import { and, eq, inArray, ne } from 'drizzle-orm';
import { getDb } from './db';
import { hashPassword } from './auth';
import { randomInt } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { FcmNotConfigured, FcmUnreachable, fcmConfigured, sendPush } from './fcm';
import { roomSettings, roomUsers, rooms, users } from './db/schema';
import { ROOM_SETTINGS_BY_NAME, type RoomSettings } from '#lib/room-settings-schema.js';
import { shouldRemoveAsFreeTrial, shouldRemoveAsNonPresenter } from '#lib/room-member-role.js';

export function listRooms(accountId: number) {
  return getDb().select().from(rooms).where(eq(rooms.accountId, accountId));
}

export async function getRoom(id: number) {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return room;
}

export async function readSettings(roomId: number): Promise<Partial<RoomSettings>> {
  const [row] = await getDb().select().from(roomSettings).where(eq(roomSettings.roomId, roomId)).limit(1);
  if (!row) return {};
  try {
    const parsed: unknown = JSON.parse(row.settingsJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Partial<RoomSettings>) : {};
  } catch {
    // A corrupt blob is a bug worth seeing, not something to paper over with {}.
    throw new Error(`room_settings.settings_json for room ${roomId} is not valid JSON`);
  }
}

export async function readSettingsProjection(roomId: number): Promise<{
  settings: Partial<RoomSettings>;
  authorityRevision: number | null;
}> {
  const [row] = await getDb().select().from(roomSettings).where(eq(roomSettings.roomId, roomId)).limit(1);
  if (!row) return { settings: {}, authorityRevision: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.settingsJson);
  } catch {
    throw new Error(`room_settings.settings_json for room ${roomId} is not valid JSON`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`room_settings.settings_json for room ${roomId} is not a JSON object`);
  }
  return { settings: parsed as Partial<RoomSettings>, authorityRevision: row.authorityRevision };
}

/**
 * Reconciles the controller's runtime read projection after a canonical Rust read or write.
 * A response older than the local proof is refused; equal revisions must be byte-equivalent.
 */
export async function projectAuthoritySettings(
  roomId: number,
  authorityRoomId: string,
  revision: number,
  settings: Partial<RoomSettings>
): Promise<void> {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('invalid authority settings revision');
  const serialized = JSON.stringify(settings);
  await getDb().transaction(async (tx) => {
    const [room] = await tx
      .select({ authorityRoomId: rooms.authorityRoomId })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    if (!room || room.authorityRoomId !== authorityRoomId) throw new Error('room authority mapping mismatch');
    const [existing] = await tx.select().from(roomSettings).where(eq(roomSettings.roomId, roomId)).limit(1);
    if (existing?.authorityRevision !== null && existing?.authorityRevision !== undefined) {
      if (existing.authorityRevision > revision) throw new Error('stale authority settings response');
      if (existing.authorityRevision === revision) {
        let current: unknown;
        try {
          current = JSON.parse(existing.settingsJson);
        } catch {
          throw new Error(`room_settings.settings_json for room ${roomId} is not valid JSON`);
        }
        if (!isDeepStrictEqual(current, settings)) throw new Error('authority settings revision content mismatch');
      }
    }
    const now = new Date();
    await tx
      .insert(roomSettings)
      .values({
        roomId,
        settingsJson: serialized,
        authorityRevision: revision,
        authorityReconciledAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: roomSettings.roomId,
        set: {
          settingsJson: serialized,
          authorityRevision: revision,
          authorityReconciledAt: now,
          updatedAt: now
        }
      });
    const title = typeof settings.name === 'string' ? settings.name.trim() : '';
    if (title) await tx.update(rooms).set({ name: title }).where(eq(rooms.id, roomId));
  });
}

/**
 * The reference's `saveSessField(name)` — one field at a time, read-modify-write.
 * Unknown keys are rejected rather than silently stored: the key set is generated
 * from the capture, so anything outside it is a typo or a stale client.
 */
export async function saveSetting(roomId: number, name: string, value: unknown) {
  const coerced = coerceSettingValue(name, value);

  const current = await readSettings(roomId);
  const next = { ...current, [name]: coerced };
  const now = new Date();
  await getDb()
    .insert(roomSettings)
    .values({ roomId, settingsJson: JSON.stringify(next), updatedAt: now })
    .onConflictDoUpdate({
      target: roomSettings.roomId,
      set: {
        settingsJson: JSON.stringify(next),
        authorityRevision: null,
        authorityReconciledAt: null,
        updatedAt: now
      }
    });

  /*
    `name` lives in TWO places, and this is the one write that keeps them in step.

    The settings blob holds it because the reference edits it with the same
    `saveSessField('name')` as every other field. The `rooms.name` COLUMN holds it because that is
    what everything else actually reads: the Sessions table on the account page, `otherRooms` for
    "Load Settings From Room", `internal/room-config` — which is where the room itself gets its
    title — and the manage form's own value.

    Renaming a room wrote only the blob, so the column kept the old name and every one of those
    surfaces showed it. The rename looked lost because for every consumer it was. `renameRoom`
    already did both, but nothing in the UI posts there: `Editable.svelte` sends every field,
    including this one, to `saveField`.

    Fixed here rather than in the action so no future caller can write one without the other.
  */
  if (name === 'name') {
    const title = typeof coerced === 'string' ? coerced.trim() : '';
    // A room with no name is not a state the Sessions table can render; the blob may hold '' but
    // the column keeps the last real title.
    if (title) await getDb().update(rooms).set({ name: title }).where(eq(rooms.id, roomId));
  }

  return coerced;
}

export function coerceSettingValue(name: string, value: unknown): string | number | boolean | null {
  const def = ROOM_SETTINGS_BY_NAME.get(name);
  if (!def) throw new Error(`unknown setting: ${name}`);

  let coerced: string | number | boolean | null;
  if (value === null || value === '') coerced = null;
  else if (def.type === 'checkbox') coerced = value === true || value === 'true' || value === 'on';
  else if (def.type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) throw new Error(`${name} expects a number, got ${String(value)}`);
    coerced = n;
  } else coerced = String(value);

  return coerced;
}

export async function saveTextList(roomId: number, value: string) {
  await getDb().update(rooms).set({ textList: value }).where(eq(rooms.id, roomId));
}

/** The five checkboxes on #permissionsModal, bound to userPermissions.* */
export const PERMISSION_KEYS = ['hasMic', 'hasScreen', 'hasCam', 'hasAdminChat', 'canEditNotes'] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function readPermissions(permissionsJson: string): Record<PermissionKey, boolean> {
  let parsed: Record<string, unknown> = {};
  try {
    const raw: unknown = JSON.parse(permissionsJson);
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) parsed = raw as Record<string, unknown>;
  } catch {
    // A corrupt blob means we do not know what was granted. Denying is the safe
    // reading of "unknown", and it is visible rather than silently permissive.
    parsed = {};
  }
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, parsed[k] === true])) as Record<PermissionKey, boolean>;
}

export async function savePermissions(roomId: number, roomUserId: number, granted: PermissionKey[]) {
  const next = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, granted.includes(k)]));
  await getDb()
    .update(roomUsers)
    .set({ permissionsJson: JSON.stringify(next) })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)));
  return next;
}

/**
 * `updateManyUsers` — the bulk menu ("Actions With Selected").
 *
 * This is a DIFFERENT enum from updateUser: here 10 means "Remove All", where in
 * updateUser 10 means "hide personal data". Wiring one component to both would
 * silently delete users, so the two never share a code path.
 */
export const MANY_OPCODES = {
  1: 'make-presenter',
  2: 'make-participant-or-unban',
  3: 'mute',
  4: 'ban',
  5: 'make-admin',
  6: 'make-trial',
  10: 'remove-all'
} as const;

export type ManyOpcode = keyof typeof MANY_OPCODES;

/**
 * "Apply to all rooms?" — the checkbox beside "Select All" in `.users-many-actions`.
 *
 * The reference binds it `ng-model="applyToAllRooms"` with
 * `ng-change="toggleApplyToAllRooms()"`, and it scopes the bulk menus rather than any
 * one action. So a selection made in one room can be widened to the same PEOPLE in
 * every other room the account owns — including `10 = Remove All` and `4 = BAN`.
 *
 * Expansion is by `user_id`, not by `room_user_id`: the selection names people, and
 * their membership row differs per room. The account is taken from the room being
 * managed, never from the caller, so this cannot reach another tenant's rooms.
 *
 * Returns the membership rows the operation should touch, owner rows already removed.
 */
async function resolveBulkTargets(roomId: number, roomUserIds: number[], allRooms: boolean) {
  const scoped = await getDb()
    .select({ id: roomUsers.id, userId: roomUsers.userId, roomId: roomUsers.roomId, role: roomUsers.role })
    .from(roomUsers)
    .where(and(eq(roomUsers.roomId, roomId), inArray(roomUsers.id, roomUserIds)));

  if (!allRooms) return scoped.filter((row) => row.role !== 0);

  const userIds = [...new Set(scoped.map((row) => row.userId))];
  if (userIds.length === 0) return [];

  const [room] = await getDb().select({ accountId: rooms.accountId }).from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) return [];

  const accountRooms = await getDb().select({ id: rooms.id }).from(rooms).where(eq(rooms.accountId, room.accountId));

  const widened = await getDb()
    .select({ id: roomUsers.id, userId: roomUsers.userId, roomId: roomUsers.roomId, role: roomUsers.role })
    .from(roomUsers)
    .where(
      and(
        inArray(roomUsers.userId, userIds),
        inArray(
          roomUsers.roomId,
          accountRooms.map((r) => r.id)
        )
      )
    );

  // The owner is skipped in EVERY room, not just the one being managed. A person who
  // is a participant here and the owner of another room must not be removed there.
  return widened.filter((row) => row.role !== 0);
}

export async function applyManyOpcode(
  roomId: number,
  roomUserIds: number[],
  op: ManyOpcode,
  { allRooms = false }: { allRooms?: boolean } = {}
) {
  if (roomUserIds.length === 0) return 0;
  const targets = await resolveBulkTargets(roomId, roomUserIds, allRooms);
  if (targets.length === 0) return 0;

  if (op === 10) {
    let removed = 0;
    for (const target of targets) {
      await getDb().delete(roomUsers).where(eq(roomUsers.id, target.id));
      removed++;
    }
    return removed;
  }
  let changed = 0;
  for (const target of targets) {
    try {
      await applyUserOpcode(target.roomId, target.id, op as UserOpcode);
      changed++;
    } catch {
      // an opcode that is not a row-level change is skipped, not fatal for the batch
    }
  }
  return changed;
}

/**
 * `approveUser(userName, _id, $index, 'approved' | 'pending')`.
 *
 * Two call sites in the reference and they are the only two transitions: the row's
 * APPROVE button sends `'approved'`, and the row menu's "Pause / Pending" sends
 * `'pending'`. Anything else is rejected rather than stored, so a stale client cannot
 * invent a third state the row template has no branch for.
 *
 * Role 0 is refused. The reference hides the whole Actions menu for the owner
 * (`ng-hide="user.role==0"`), so there is no path to this for an owner, and an owner
 * who could pause themselves would lose their own room.
 */
export async function setInviteStatus(roomId: number, roomUserId: number, status: 'approved' | 'pending') {
  if (status !== 'approved' && status !== 'pending') {
    throw new Error(`unknown invite status: ${status}`);
  }
  await getDb()
    .update(roomUsers)
    .set({ inviteStatus: status })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId), ne(roomUsers.role, 0)));
}

export function listRoomUsers(roomId: number) {
  return getDb()
    .select({
      id: roomUsers.id,
      userId: users.id,
      authorityMemberId: roomUsers.authorityMemberId,
      authorityRevision: roomUsers.authorityRevision,
      authorityContentHash: roomUsers.authorityContentHash,
      authorityReconciledAt: roomUsers.authorityReconciledAt,
      email: users.email,
      displayName: users.displayName,
      role: roomUsers.role,
      banned: roomUsers.banned,
      muted: roomUsers.muted,
      paused: roomUsers.paused,
      nonPresenter: roomUsers.nonPresenter,
      note: roomUsers.note,
      permissionsJson: roomUsers.permissionsJson,
      badgesJson: roomUsers.badgesJson,
      isFreeTrial: roomUsers.isFreeTrial,
      hideUserCount: roomUsers.hideUserCount,
      hidePersInfo: roomUsers.hidePersInfo,
      denyArchivesAccess: roomUsers.denyArchivesAccess,
      restrictPmUser: roomUsers.restrictPmUser,
      inactive: roomUsers.inactive,
      hasPassword: roomUsers.hasPassword,
      mobilePairCode: roomUsers.mobilePairCode,
      /*
        Selected for the Show Mobile / Show Non-Mobile filters, whose predicate was read out of the
        reference's own bundle on 2026-08-11: `loadMobileUsers()` keeps a user when
        `user.alerterAppTokens && user.alerterAppTokens.length`, and `alerterAppTokens` is this
        column. It is the ONLY one of the three "mobile-ish" columns the reference consults —
        `mobilePairCode` and `notificationsState` play no part in either filter.
      */
      pushTokensJson: roomUsers.pushTokensJson,
      notificationsState: roomUsers.notificationsState,
      inviteStatus: roomUsers.inviteStatus,
      discordUserId: roomUsers.discordUserId,
      /*
        The row renders `{{user.discordUsername}}` INSIDE `ng-show="user.discordUserId"`
        (page.manageSession.html:362-364) — the id is the gate, the handle is the text. Ours
        printed the id in both places, so a member with a Discord link showed a numeric snowflake
        where the reference shows their name. Both columns are needed; neither substitutes.
      */
      discordUsername: roomUsers.discordUsername,
      phone: roomUsers.phone,
      lastLoginAt: roomUsers.lastLoginAt,
      /*
        The per-member icon flags, each read straight off `user.*` in the reference's own ng-show
        (page.manageSession.html:351-354). Both mobile icons are driven by the ROOM's
        `ptrMobileAppCaseByCaseEnabled`, which is why the row cannot decide on its own which of the
        two to show — the page reads the setting and picks.
      */
      hasFileAccess: roomUsers.hasFileAccess,
      hasMobileApp: roomUsers.hasMobileApp,
      alerterAppFcmUserOff: roomUsers.alerterAppFcmUserOff,
      /*
        Stripe. Selected unconditionally because `isMarketplaceUser` is the reference's own gate
        (`ng-if="user.isMarketPlaceUser"`) and it is a column on this same row — one read, no
        second round trip, and the gate travels with the data it gates.

        `stripeLastPaidAmount` is minor units and MUST be rendered through `formatMoney` with its
        companion currency. Anything that divides it by 100 unconditionally is a 100x error on
        every zero-decimal currency; see `#lib/money.js`.
      */
      isMarketplaceUser: roomUsers.isMarketplaceUser,
      stripeSubscriptionStatus: roomUsers.stripeSubscriptionStatus,
      stripeLastPaidAt: roomUsers.stripeLastPaidAt,
      stripeCurrentPeriodEnd: roomUsers.stripeCurrentPeriodEnd,
      stripeLastPaymentFailureAt: roomUsers.stripeLastPaymentFailureAt,
      stripeLastPaidAmount: roomUsers.stripeLastPaidAmount,
      stripeLastPaidCurrency: roomUsers.stripeLastPaidCurrency
    })
    .from(roomUsers)
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(eq(roomUsers.roomId, roomId));
}

/**
 * The reference's `updateUser(op, id, name, index)` opcode map, verified against
 * all 42 baseline bindings plus 9 interaction captures.
 *
 * Opcode 12 is never bound anywhere in the reference and is deliberately absent.
 *
 * NB: `updateManyUsers` is a DIFFERENT enum in which 10 means "Remove All".
 * These two must never share a code path.
 */
export const USER_OPCODES = {
  1: 'make-presenter',
  2: 'make-participant',
  3: 'mute',
  4: 'ban',
  5: 'make-admin',
  6: 'make-trial',
  7: 'hide-user-count',
  8: 'show-user-count',
  9: 'freshen-login',
  10: 'hide-personal-data',
  11: 'show-personal-data',
  13: 'deny-archives',
  14: 'allow-archives'
} as const;

export type UserOpcode = keyof typeof USER_OPCODES;

/**
 * The role model, read off the reference's own row template rather than guessed:
 *
 *   role 0  Owner                          ng-show="user.role==0"
 *   role 1  Presenter, when !nonPresenter   "user.role==1 && !user.nonPresenter"
 *   role 1  Admin, when nonPresenter        "user.role==1 && user.nonPresenter"
 *   role 2  Participant                     "user.role==2"
 *   role 3  CHAT MUTED                      "user.role==3"
 *   role 4  BANNED                          "user.role==4"
 *
 * Two things that were wrong here before the manage-page capture was read:
 * Admin was being stored as role 5 — there is no role 5 — and mute/ban were
 * booleans alongside the role, when the reference makes them roles in their own
 * right. Trial is not a role at all; it is the `isFreeTrial` flag behind the
 * TRIAL badge.
 */
export function userOpcodePatch(op: UserOpcode): Partial<typeof roomUsers.$inferInsert> {
  const patch: Partial<typeof roomUsers.$inferInsert> = {};
  switch (op) {
    case 1:
      patch.role = 1;
      patch.nonPresenter = false;
      break;
    case 5:
      patch.role = 1;
      patch.nonPresenter = true;
      break;
    case 2:
      patch.role = 2;
      patch.banned = false;
      patch.muted = false;
      break; // also Unban
    case 3:
      patch.role = 3;
      patch.muted = true;
      break;
    case 4:
      patch.role = 4;
      patch.banned = true;
      break;
    case 6:
      patch.isFreeTrial = true;
      break;
    case 9:
      patch.lastLoginAt = new Date();
      break;
    case 7:
      patch.hideUserCount = true;
      break;
    case 8:
      patch.hideUserCount = false;
      break;
    case 10:
      patch.hidePersInfo = true;
      break;
    case 11:
      patch.hidePersInfo = false;
      break;
    case 13:
      patch.denyArchivesAccess = true;
      break;
    case 14:
      patch.denyArchivesAccess = false;
      break;
  }
  return patch;
}

/**
 * Apply one opcode to one membership.
 *
 * ## Why the mapping above is a separate exported function rather than inline here
 *
 * It has a second caller, and the day it did not it caused a real defect.
 * `internal/room-ban/[code]` — the room banning a member — was written with its own hand-copied
 * `.set({ banned })`, which set the boolean and left the role alone. Every consumer of a ban reads
 * `role === 4` (`internal/room-config:244`, `internal/stream-read:92`, the manage badge), so the ban
 * recorded nothing anyone asks about and the member came straight back on the next load.
 *
 * The fix is not a test asserting the two copies agree. It is having one copy: `userOpcodePatch` is
 * the single definition of what each opcode means, this function applies it to a row, and the ban
 * endpoint calls it for opcodes 4 and 2. A mapping that cannot be duplicated cannot drift.
 */
export async function applyUserOpcode(roomId: number, roomUserId: number, op: UserOpcode) {
  await getDb()
    .update(roomUsers)
    .set(userOpcodePatch(op))
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)));
}

/** Replace a room's whole settings blob — used when cloning. */
export async function writeSettings(roomId: number, settings: Partial<RoomSettings>) {
  await getDb()
    .insert(roomSettings)
    .values({
      roomId,
      settingsJson: JSON.stringify(settings),
      authorityRevision: null,
      authorityReconciledAt: null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: roomSettings.roomId,
      set: {
        settingsJson: JSON.stringify(settings),
        authorityRevision: null,
        authorityReconciledAt: null,
        updatedAt: new Date()
      }
    });
}

/**
 * Delete a room and everything that references it, children first — the foreign
 * keys are real and enforced, so the order is not optional.
 */
export async function deleteRoomCascade(roomId: number) {
  await getDb().delete(roomUsers).where(eq(roomUsers.roomId, roomId));
  await getDb().delete(roomSettings).where(eq(roomSettings.roomId, roomId));
  await getDb().delete(rooms).where(eq(rooms.id, roomId));
}

/**
 * `doInvite()` — put someone in the room before they have ever signed in.
 *
 * A user row is created if the email is new, so the invite survives independently
 * of whether they accept. Re-inviting an existing member is a no-op rather than a
 * duplicate row, which the unique index would reject anyway.
 */
export async function inviteRoomUser(roomId: number, displayName: string, email: string) {
  let [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    const [room] = await getDb().select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
    if (!room) throw new Error('room not found');
    [user] = await getDb()
      .insert(users)
      .values({
        accountId: room.accountId,
        email,
        displayName,
        /*
          No password, and no way to acquire one. `null` means "cannot authenticate" — `schema.ts`
          and `verifyPassword` both say so, and there is no sign-in-and-set-a-password route in this
          app; the only writer that ever sets a hash on an existing row is `setPasswordFromReset`,
          which refuses null-hash rows for the reason in its docblock.

          That refusal is load-bearing HERE in particular, because `room.accountId` files this row
          in the ROOM OWNER's tenant and `requireOwnedRoom` gates on `accountId` with no per-user
          role. A member record that could ever authenticate would be a peer of the owner. Corrected
          2026-08-20: this comment used to promise a first-sign-in flow that does not exist, and the
          reset route was the unintended implementation of it.
        */
        passwordHash: null,
        createdAt: new Date()
      })
      .returning();
  }

  const [existing] = await getDb()
    .select()
    .from(roomUsers)
    .where(and(eq(roomUsers.roomId, roomId), eq(roomUsers.userId, user.id)))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await getDb()
    .insert(roomUsers)
    .values({ roomId, userId: user.id, role: 2, createdAt: new Date() })
    .returning({ id: roomUsers.id });
  return created.id;
}

/** `clearUserList()` — "Remove non-presenters". Owners and presenters stay. */
export async function removeNonPresenters(roomId: number) {
  const doomed = (
    await getDb()
      .select({
        id: roomUsers.id,
        role: roomUsers.role,
        nonPresenter: roomUsers.nonPresenter,
        isFreeTrial: roomUsers.isFreeTrial
      })
      .from(roomUsers)
      .where(eq(roomUsers.roomId, roomId))
  ).filter(shouldRemoveAsNonPresenter);
  for (const u of doomed) await getDb().delete(roomUsers).where(eq(roomUsers.id, u.id));
  return doomed.length;
}

/**
 * Remove one member. Scoped by roomId in the same statement so a row id from
 * another room cannot be deleted by guessing.
 *
 * The row count comes back through RETURNING rather than a driver-specific
 * affected-rows field, so the caller's "how many changed" contract is the same
 * shape it was and does not depend on which PostgreSQL client is underneath.
 */
export async function removeRoomUser(roomId: number, roomUserId: number) {
  const removed = await getDb()
    .delete(roomUsers)
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .returning({ id: roomUsers.id });
  return removed.length;
}

/** `removeBadgesForUsers()` — strips every badge assignment in this room. */
export async function clearUserBadges(roomId: number) {
  const changed = await getDb()
    .update(roomUsers)
    .set({ badgesJson: '[]' })
    .where(eq(roomUsers.roomId, roomId))
    .returning({ id: roomUsers.id });
  return changed.length;
}

/** badge ids on a member row; a corrupt blob is treated as none, not as a crash */
export function parseBadgeIds(json: string): number[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

/** the row menu's Badges submenu — one badge on or off for one member */
export async function toggleUserBadge(roomId: number, roomUserId: number, badgeId: number) {
  const [row] = await getDb()
    .select({ badgesJson: roomUsers.badgesJson })
    .from(roomUsers)
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .limit(1);
  if (!row) throw new Error('no such member in this room');
  const current = parseBadgeIds(row.badgesJson);
  const next = current.includes(badgeId) ? current.filter((id) => id !== badgeId) : [...current, badgeId];
  await getDb()
    .update(roomUsers)
    .set({ badgesJson: JSON.stringify(next) })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)));
  return next;
}

/** `setUserRestrictPM(bool, …)` — member-to-member DMs, per member */
export async function setUserRestrictPm(roomId: number, roomUserId: number, restrict: boolean) {
  const changed = await getDb()
    .update(roomUsers)
    .set({ restrictPmUser: restrict })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .returning({ id: roomUsers.id });
  return changed.length;
}

/**
 * `manageMobileApp(id, name, index, 'enable'|'disable')` and
 * `manageFileAccess(id, name, index, 'enable'|'disable')` — the two per-member grants.
 *
 * ## Why these exist, and why they had to land with the icons
 *
 * `page.manageSession.html:545-551` and `:592-598` put four items at the bottom of the row menu,
 * each behind `ng-if` on the ROOM's own case-by-case setting. They are the only way the reference
 * writes `hasMobileApp` and `hasFileAccess` — the two columns whose icons this row now renders.
 *
 * Without them the icons are unreachable: a column nothing can set, driving an indicator that can
 * therefore never light up. That is the "control whose only effect is its own presence" this
 * project has a rule against, just inverted — an indicator with no cause.
 *
 * ## One function, not two
 *
 * The two grants differ only in which column they write. Splitting them would duplicate the
 * ownership scoping, and the scoping is the part that must not drift: both `UPDATE`s are keyed on
 * `roomId` AND `roomUserId`, so a member id belonging to another tenant's room matches zero rows and
 * changes nothing. The column is chosen from a static map, never from the caller's string — the same
 * discipline the Prometheus-label rule exists for.
 */
const MEMBER_GRANT_COLUMNS = {
  'mobile-app': 'hasMobileApp',
  'file-access': 'hasFileAccess'
} as const;

export type MemberGrant = keyof typeof MEMBER_GRANT_COLUMNS;

export function isMemberGrant(value: unknown): value is MemberGrant {
  return typeof value === 'string' && Object.hasOwn(MEMBER_GRANT_COLUMNS, value);
}

export async function setMemberGrant(roomId: number, roomUserId: number, grant: MemberGrant, granted: boolean) {
  /*
    The column NAME comes from the static map and from nowhere else, so the `SET` clause cannot be
    steered by a request body. `isMemberGrant` is the only way to obtain a `MemberGrant`, and this
    second check is not redundant with it — it is what makes the function safe to call from anywhere
    rather than safe only from the one action that happens to validate first today.
  */
  const column = MEMBER_GRANT_COLUMNS[grant];
  if (!column) throw new Error(`unknown member grant: ${String(grant)}`);

  const changed = await getDb()
    .update(roomUsers)
    .set({ [column]: granted })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .returning({ id: roomUsers.id });
  return changed.length;
}

/** `setNoteUser(…)` — the free-text note shown under Last Login */
export async function setUserNote(roomId: number, roomUserId: number, note: string) {
  const changed = await getDb()
    .update(roomUsers)
    .set({ note: note.trim() || null })
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .returning({ id: roomUsers.id });
  return changed.length;
}

/**
 * `editUsername(…)` — the display name, scoped to this room's membership.
 *
 * It writes the USER row, which is shared, so it is guarded: the member has to
 * belong to the room being managed. Without that check a room owner could
 * rename anyone in the account by guessing an id.
 */
export async function renameRoomUser(roomId: number, roomUserId: number, displayName: string) {
  const [row] = await getDb()
    .select({ userId: roomUsers.userId })
    .from(roomUsers)
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .limit(1);
  if (!row) throw new Error('no such member in this room');
  await getDb().update(users).set({ displayName }).where(eq(users.id, row.userId));
  return displayName;
}

/**
 * `setUserPW(…)` — set a member's password from the manage screen.
 *
 * Scoped to the room being managed, like renameRoomUser, so an owner cannot
 * reach an account they do not administer by guessing a row id. The plaintext
 * is hashed here and never persisted or echoed back.
 */
export async function setRoomUserPassword(roomId: number, roomUserId: number, password: string) {
  const [row] = await getDb()
    .select({ userId: roomUsers.userId })
    .from(roomUsers)
    .where(and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId)))
    .limit(1);
  if (!row) throw new Error('no such member in this room');
  await getDb()
    .update(users)
    .set({ passwordHash: hashPassword(password) })
    .where(eq(users.id, row.userId));
  await getDb().update(roomUsers).set({ hasPassword: true }).where(eq(roomUsers.id, roomUserId));
}

/* ── the mobile app ───────────────────────────────────────────────────────────
   Every one of these is a real, stored operation. The reference's demo tenant
   disables the whole menu; a paying owner has the app, so these do the work
   rather than reporting that a feature is unavailable. */

const scoped = (roomId: number, roomUserId: number) => and(eq(roomUsers.id, roomUserId), eq(roomUsers.roomId, roomId));

async function requireMember(roomId: number, roomUserId: number) {
  const [row] = await getDb().select().from(roomUsers).where(scoped(roomId, roomUserId)).limit(1);
  if (!row) throw new Error('no such member in this room');
  return row;
}

/**
 * `getAppPin(…)` — issue a pairing code for the mobile app.
 *
 * Six digits from a CSPRNG, not Math.random: this is a credential, briefly. It
 * expires on the room's own `ptrMobileAppExpirePairCodeDays` setting, defaulting
 * to one day, and issuing a new one invalidates the old.
 */
export async function issueMobilePairCode(roomId: number, roomUserId: number, expireDays: number) {
  await requireMember(roomId, roomUserId);
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const days = Number.isFinite(expireDays) && expireDays > 0 ? expireDays : 1;
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  await getDb()
    .update(roomUsers)
    /*
      `mobilePairAttempts: 0` is not tidiness — without it a new PIN is dead on arrival.

      `redeemPairCode` refuses on `attempts >= MAX_PAIR_ATTEMPTS` before it ever compares the PIN,
      and the same condition gates the only other write to the counter, so once it reaches five
      nothing can lower it. Reissuing left it at five, so every subsequent code was refused and the
      member could never pair a phone in that room again through any interface. Five wrong guesses
      by anyone who knows the room code and the member's email were enough to do it permanently.

      Found by the adversarial review of 2026-08-11 and reproduced against the real function. This
      is the one place both reissue paths meet — the manage page action and the room's own
      `/internal/mobile-pin/[code]` endpoint both call it — so resetting here covers both.
    */
    .set({ mobilePairCode: code, mobilePairCodeExpiresAt: expiresAt, mobilePairAttempts: 0 })
    .where(scoped(roomId, roomUserId));
  return { code, expiresAt };
}

export interface PushToken {
  token: string;
  platform: string;
  addedAt: number;
}

export function readPushTokens(json: string): PushToken[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as PushToken[]).filter((t) => t && typeof t.token === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * `showAlerterAppTokens(…)` / `getFCMTokens(…)`.
 *
 * A push token is a credential for sending to that device, so only the last six
 * characters are returned — enough to tell two registrations apart in the UI,
 * useless to anyone who reads it off the screen.
 */
export async function listPushTokens(roomId: number, roomUserId: number) {
  const row = await requireMember(roomId, roomUserId);
  return readPushTokens(row.pushTokensJson).map((t) => ({
    platform: t.platform,
    lastSix: maskToken(t.token),
    addedAt: t.addedAt
  }));
}

/**
 * The last six characters, and never more.
 *
 * One function rather than a `.slice(-6)` at each call site, so "Get FCM Tokens" cannot drift into
 * showing more than "Show App Tokens" does. A token shorter than six characters is not a real
 * registration, and printing all of it would be printing the credential.
 */
function maskToken(token: string): string {
  return token.length >= 6 ? token.slice(-6) : '';
}

/**
 * `getFCMTokens(user._id, user.userName, $index)` — and why it is NOT `showAlerterAppTokens`.
 *
 * These are two different questions asked of the same registrations, which is exactly what the
 * reference does:
 *
 *   - `showAlerterAppTokens(user.userName, user.alerterAppTokens)` takes the token array straight
 *     off the scope object. No id, no `$index`, no server call — it displays the copy the page
 *     already loaded. {@link listPushTokens} is that: a read of the stored row.
 *   - `getFCMTokens(user._id, user.userName, $index)` is keyed on the member's id and goes to the
 *     server. This is that: every stored registration is put to FCM with `validate_only`, so the
 *     answer is what FCM says about them RIGHT NOW rather than what we last wrote down.
 *
 * Same masking as {@link listPushTokens}, because they are the same credentials.
 *
 * ONLY `unregistered` is deleted — FCM saying, in as many words, that this registration no longer
 * exists. Every other unhappy answer is reported and kept:
 *
 *   - `unchecked` — Google could not be reached. Pruning on an outage would empty the room's
 *     registrations the first time the network hiccuped, and nothing but the devices themselves
 *     re-registering could bring them back.
 *   - `invalid` — FCM answered INVALID_ARGUMENT, which it uses for a malformed TOKEN *and* for a
 *     malformed message. The second is our bug, applies to every token at once, and would delete
 *     every device in the room on the first bad payload. A registration that is genuinely
 *     unusable costs one wasted call; that trade is not close.
 */
export interface FcmRegistrationView {
  platform: string;
  lastSix: string;
  addedAt: number;
  state: 'registered' | 'unregistered' | 'invalid' | 'unchecked';
}

export async function listFcmRegistrations(
  roomId: number,
  roomUserId: number
): Promise<{ tokens: FcmRegistrationView[]; pruned: number; checkedAt: string }> {
  const row = await requireMember(roomId, roomUserId);
  // Checked after the membership lookup so an unconfigured deployment still answers "no such
  // member" for a row id belonging to somebody else's room, rather than confirming it exists.
  if (!fcmConfigured()) throw new FcmNotConfigured();

  const stored = readPushTokens(row.pushTokensJson);
  const tokens: FcmRegistrationView[] = [];
  const survivors: PushToken[] = [];

  for (const registration of stored) {
    let state: FcmRegistrationView['state'];
    try {
      const outcome = await sendPush({
        registrationToken: registration.token,
        title: 'Registration check',
        body: 'Registration check',
        dryRun: true
      });
      state = outcome.ok
        ? 'registered'
        : outcome.reason === 'unregistered'
          ? 'unregistered'
          : outcome.reason === 'invalid-token'
            ? 'invalid'
            : /*
                 `rejected` is quota, permission or payload — FCM refused to tell us anything about
                 the device, which is "not checked", not "alive". Claiming `registered` here would
                 be inventing an answer out of a refusal.
              */
              'unchecked';
    } catch (cause) {
      if (!(cause instanceof FcmUnreachable)) throw cause;
      state = 'unchecked';
    }
    if (state !== 'unregistered') survivors.push(registration);
    tokens.push({
      platform: registration.platform,
      lastSix: maskToken(registration.token),
      addedAt: registration.addedAt,
      state
    });
  }

  const pruned = stored.length - survivors.length;
  if (pruned > 0) {
    await getDb()
      .update(roomUsers)
      .set({ pushTokensJson: JSON.stringify(survivors) })
      .where(scoped(roomId, roomUserId));
  }

  return { tokens, pruned, checkedAt: new Date().toISOString() };
}

/**
 * `sendTestFCM(user._id, user.userName, $index)` — a real push to that member's real devices.
 *
 * Per-registration outcomes, never a blanket verdict. A member can have a live phone and a dead
 * tablet registration at the same time, and "sent" for the pair would be a lie about half of it.
 *
 * The message copy is OURS. No capture reaches the reference's server, so nothing in evidence says
 * what its test notification reads; this is the minimum that identifies itself honestly.
 */
export interface PushSendResult {
  platform: string;
  lastSix: string;
  outcome: 'sent' | 'unregistered' | 'invalid-token' | 'rejected' | 'unreachable';
}

export async function sendTestPushToMember(
  roomId: number,
  roomUserId: number
): Promise<{ registrations: number; sent: number; failed: number; pruned: number; results: PushSendResult[] }> {
  const row = await requireMember(roomId, roomUserId);
  if (!fcmConfigured()) throw new FcmNotConfigured();

  const [room] = await getDb().select({ name: rooms.name }).from(rooms).where(eq(rooms.id, roomId)).limit(1);
  const stored = readPushTokens(row.pushTokensJson);
  const results: PushSendResult[] = [];
  const survivors: PushToken[] = [];

  for (const registration of stored) {
    let outcome: PushSendResult['outcome'];
    try {
      const sent = await sendPush({
        registrationToken: registration.token,
        title: room?.name ?? 'Test notification',
        body: 'Test notification sent from the room controller.'
      });
      outcome = sent.ok ? 'sent' : sent.reason === 'unregistered' ? 'unregistered' : sent.reason;
    } catch (cause) {
      if (!(cause instanceof FcmUnreachable)) throw cause;
      outcome = 'unreachable';
    }
    /*
      Only a registration FCM itself disowned is dropped — the same rule, and for the same reason,
      as `listFcmRegistrations`. `invalid-token`, `rejected` and `unreachable` are all answers about
      us or about the network; deleting on any of them would destroy working devices, and no retry
      could recover them.
    */
    if (outcome !== 'unregistered') survivors.push(registration);
    results.push({ platform: registration.platform, lastSix: maskToken(registration.token), outcome });
  }

  const pruned = stored.length - survivors.length;
  if (pruned > 0) {
    await getDb()
      .update(roomUsers)
      .set({ pushTokensJson: JSON.stringify(survivors) })
      .where(scoped(roomId, roomUserId));
  }

  const sent = results.filter((r) => r.outcome === 'sent').length;
  return { registrations: stored.length, sent, failed: results.length - sent, pruned, results };
}

/**
 * One member's name and address, reachable ONLY through their membership of this room.
 *
 * The `users` row is account-wide, so it is never queried by id from a form value. The membership
 * is looked up first, scoped by `roomId`, and the user id comes off THAT row — the same guard
 * {@link renameRoomUser} and {@link setRoomUserPassword} use, and the reason a row id from another
 * tenant's room cannot be turned into an email address by guessing.
 */
export interface MemberContact {
  roomUserId: number;
  userId: number;
  email: string;
  displayName: string;
}

export async function getMemberContact(roomId: number, roomUserId: number): Promise<MemberContact> {
  const membership = await requireMember(roomId, roomUserId);
  const [user] = await getDb()
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, membership.userId))
    .limit(1);
  if (!user) throw new Error('no such member in this room');
  return { roomUserId, userId: user.id, email: user.email, displayName: user.displayName };
}

/** Every member of one room, for the bulk reminder. Scoped by `roomId` in the first query. */
export async function listMemberContacts(roomId: number): Promise<MemberContact[]> {
  const memberships = await getDb()
    .select({ id: roomUsers.id, userId: roomUsers.userId })
    .from(roomUsers)
    .where(eq(roomUsers.roomId, roomId));
  if (memberships.length === 0) return [];

  const people = await getDb()
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(
      inArray(
        users.id,
        memberships.map((m) => m.userId)
      )
    );
  const byId = new Map(people.map((p) => [p.id, p]));

  const contacts: MemberContact[] = [];
  for (const membership of memberships) {
    const person = byId.get(membership.userId);
    // A membership whose user row is gone is skipped rather than mailed to an empty address.
    if (person) {
      contacts.push({
        roomUserId: membership.id,
        userId: person.id,
        email: person.email,
        displayName: person.displayName
      });
    }
  }
  return contacts;
}

export type NotificationsState = 'active' | 'paused' | 'unsubscribed';

/** PAUSE / RESUME / Remove Mobile Notifs */
export async function setNotificationsState(roomId: number, roomUserId: number, state: NotificationsState) {
  await requireMember(roomId, roomUserId);
  const patch: Partial<typeof roomUsers.$inferInsert> = { notificationsState: state };
  // "Remove" means the device registrations go too, not just a flag flip
  if (state === 'unsubscribed') patch.pushTokensJson = '[]';
  await getDb().update(roomUsers).set(patch).where(scoped(roomId, roomUserId));
  return state;
}

/** `resetFCMForuser(…)` — drop every registration and start clean */
export async function resetPushTokens(roomId: number, roomUserId: number) {
  await requireMember(roomId, roomUserId);
  await getDb()
    .update(roomUsers)
    .set({ pushTokensJson: '[]', notificationsState: 'active' })
    .where(scoped(roomId, roomUserId));
}

/* ── API key restrictions ─────────────────────────────────────────────────── */

export interface ApiKeyRestrictions {
  /** allowed source addresses; empty means any */
  ips: string[];
  /** allowed scopes; empty means all */
  scopes: string[];
  /**
   * Allowed room SHORT CODES; empty means every room on the account.
   *
   * The reference's `restrictToSessions` — `page.welcome.html:1339` gates its "Restricted" padlock
   * on `k.restrictToSessions && k.restrictToSessions.length`, so the field exists and is a list.
   * This is a genuinely different axis from `scopes`: scopes say WHICH COMMANDS a key may call,
   * sessions say WHICH ROOMS it may call them against. A key scoped to `sessions/list` with no room
   * restriction still enumerates every room on the account.
   *
   * Short codes rather than internal ids, because that is what the API itself takes and what an
   * operator can read off the account page. `restrictToEndpoints` is our existing `scopes`.
   *
   * HONEST GAP: `manageApiKeyRestrictions(k)` is what drives the reference's editor and its shape is
   * in no capture. The FIELD and its semantics are evidence; the widget below follows our own
   * established pattern for `ips` and `scopes`, which is stated rather than implied.
   */
  sessions: string[];
}

/**
 * The real API's commands, taken from its own documentation page
 * (`evidence-dumps/login-page/api-docs`): eleven endpoints under
 * `https://ptrv3.protradingroom.com/stats/v1/sessions/*`. An earlier version of
 * this list was invented — `rooms:read`, `users:write` and so on — which would
 * have produced a restrictions UI that could not restrict anything real.
 */
export const API_SCOPES = [
  'sessions/list',
  'sessions/users',
  'sessions/addUsers',
  'sessions/delUsers',
  'sessions/userstats',
  'sessions/chatlogs',
  'sessions/alertlogs',
  'sessions/deletedlogs',
  'sessions/archivedlogs',
  'sessions/recordings',
  'sessions/cloneSession'
] as const;

export function readRestrictions(json: string): ApiKeyRestrictions {
  try {
    const parsed = JSON.parse(json) as Partial<ApiKeyRestrictions>;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
    /*
      Every dimension defaults to EMPTY, and empty means unrestricted. That is the reference's own
      sense — its padlock shows when a list is non-empty — and it is what makes `sessions` safe to
      add to rows written before this field existed: they parse as [] and keep working unchanged.
    */
    return { ips: list(parsed?.ips), scopes: list(parsed?.scopes), sessions: list(parsed?.sessions) };
  } catch {
    return { ips: [], scopes: [], sessions: [] };
  }
}

/**
 * An IPv4 address or CIDR block. Deliberately strict: a restriction list that
 * silently accepts a malformed entry is worse than none, because it reads as
 * protection that is not there.
 */
const IP_RULE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d|[12]\d|3[0-2]))?$/;

export function parseIpList(raw: string): string[] {
  const out: string[] = [];
  for (const entry of raw.split(/[\s,]+/).filter(Boolean)) {
    const m = IP_RULE.exec(entry);
    if (!m) throw new Error(`"${entry}" is not an IPv4 address or CIDR block`);
    if ([m[1], m[2], m[3], m[4]].some((o) => Number(o) > 255)) {
      throw new Error(`"${entry}" is not a valid IPv4 address`);
    }
    out.push(entry);
  }
  return out;
}

/** `removeUsersFT()` — every free-trial member goes except the protected owner. */
export async function removeFreeTrialUsers(roomId: number) {
  const doomed = (
    await getDb()
      .select({
        id: roomUsers.id,
        role: roomUsers.role,
        nonPresenter: roomUsers.nonPresenter,
        isFreeTrial: roomUsers.isFreeTrial
      })
      .from(roomUsers)
      .where(eq(roomUsers.roomId, roomId))
  ).filter(shouldRemoveAsFreeTrial);
  for (const u of doomed) await getDb().delete(roomUsers).where(eq(roomUsers.id, u.id));
  return doomed.length;
}

/**
 * `updateManyUsersBadgePrompt('add'|'remove')` — one badge on or off across a selection.
 *
 * Honours "Apply to all rooms?" for the same reason the opcode menu does: the
 * checkbox sits in `.users-many-actions`, one level above BOTH dropdown menus, so it
 * scopes the selection rather than any single action.
 *
 * Badges are account-level (`badges.account_id`), so the same badge id is meaningful
 * in every room the expansion reaches.
 */
export async function setBadgeForUsers(
  roomId: number,
  roomUserIds: number[],
  badgeId: number,
  add: boolean,
  { allRooms = false }: { allRooms?: boolean } = {}
) {
  const targets = await resolveBulkTargets(roomId, roomUserIds, allRooms);
  let changed = 0;
  for (const target of targets) {
    const [row] = await getDb()
      .select({ badgesJson: roomUsers.badgesJson })
      .from(roomUsers)
      .where(eq(roomUsers.id, target.id))
      .limit(1);
    if (!row) continue; // a row deleted mid-batch is skipped, not an error for the batch
    const current = parseBadgeIds(row.badgesJson);
    const has = current.includes(badgeId);
    if (add === has) continue;
    const next = add ? [...current, badgeId] : current.filter((b) => b !== badgeId);
    await getDb()
      .update(roomUsers)
      .set({ badgesJson: JSON.stringify(next) })
      .where(eq(roomUsers.id, target.id));
    changed++;
  }
  return changed;
}
