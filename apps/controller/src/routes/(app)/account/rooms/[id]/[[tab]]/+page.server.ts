import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { count, desc, eq } from 'drizzle-orm';
import { PUBLIC_SITE_ORIGIN } from '$app/env/public';
import { getDb } from '#lib/server/db/index.js';
import { adminAudit, badges, roomSessions, roomUsers, rooms, users as accountUsers } from '#lib/server/db/schema.js';
import { requireOwnedRoom, requireUser, verifyPassword } from '#lib/server/auth.js';
import {
  MANY_OPCODES,
  PERMISSION_KEYS,
  USER_OPCODES,
  applyManyOpcode,
  applyUserOpcode,
  listRoomUsers,
  readPermissions,
  readPushTokens,
  isMemberGrant,
  setMemberGrant,
  readSettings,
  readSettingsProjection,
  projectAuthoritySettings,
  coerceSettingValue,
  savePermissions,
  saveSetting,
  saveTextList,
  parseBadgeIds,
  toggleUserBadge as toggleLegacyUserBadge,
  setUserRestrictPm,
  setInviteStatus,
  setUserNote,
  renameRoomUser,
  setRoomUserPassword,
  issueMobilePairCode,
  listPushTokens,
  listFcmRegistrations,
  sendTestPushToMember,
  setNotificationsState,
  resetPushTokens,
  writeSettings,
  deleteRoomCascade,
  inviteRoomUser,
  removeNonPresenters,
  removeRoomUser,
  clearUserBadges,
  removeFreeTrialUsers,
  setBadgeForUsers,
  type ManyOpcode,
  type PermissionKey,
  type UserOpcode
} from '#lib/server/rooms.js';
import { FcmCredentialInvalid, FcmNotConfigured, FcmUnreachable } from '#lib/server/fcm.js';
import { MailEnvMissing, sendWebinarReminderToRoom, sendWelcomeEmailToMember } from '#lib/server/member-email.js';
import { MailDeliveryFailed } from '#lib/server/mail.js';
import { ROOM_SETTINGS, ROOM_SETTING_BY_NAME } from '#lib/room-settings-schema.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { isRoomPresenter, isRoomTrial } from '#lib/room-member-role.js';
import { FEATURES, resolveFeatureReadiness, type FeatureId } from '#lib/features.js';
import { resolveAccountEntitlements } from '#lib/server/account-entitlements.js';
import { sanitizeHtml } from '#lib/server/sanitize-html.js';
import {
  badgeAuthorityMode,
  membershipAuthorityMode,
  roomAuthorityMode,
  roomSettingsAuthorityMode
} from '#lib/server/control-plane-runtime.js';
import {
  apiRequestContext,
  type BadgeAssignmentOperation,
  type ManageMemberOperation
} from '#lib/server/tradingroom-api.js';
import { patchRoomSettingsAuthority, readRoomSettingsAuthority } from '#lib/server/room-settings-authority.js';
import { createRoomInAuthority } from '#lib/server/room-authority.js';
import { projectAuthorityRooms, RoomAuthorityProjectionError } from '#lib/server/provision-room.js';
import {
  inviteMembershipAuthority,
  mutateMembershipAuthority,
  readMembershipAuthority
} from '#lib/server/membership-authority.js';
import { MembershipProjectionError, projectAuthorityMemberships } from '#lib/server/membership-projection.js';
import { assignBadgeAuthority, readBadgeAuthority } from '#lib/server/badge-authority.js';
import { BadgeProjectionError, projectAuthorityBadges } from '#lib/server/badge-projection.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * The reference's tab strip, transcribed from `must-match/important:2-25` — the `ul.nav.nav-tabs`
 * in full. SIX `<li>`, in this order, with these exact labels:
 *
 *     Users · Text List · Branding (Logo / Landing Page) · SSO Setup · User Stats · Settings
 *
 * Two are conditional there and are here too: Text List is `ng-show="sess.twillioApiToken"` and
 * SSO Setup is `ng-show="sess.authMode=='sso'"`, which is why the captured page shows only four.
 * Note that those two are still IN the strip's markup, carrying `ng-hide` — the reference hides a
 * conditional tab rather than omitting it, and so does ours.
 *
 * ## `strip: false` — Marketplace is NOT one of the reference's tabs
 *
 * It used to be listed here as a seventh, while the comment above said six. It is not in the
 * captured strip, and its absence is real rather than a rendering condition: the two conditional
 * tabs prove that a hidden tab still appears as an `ng-hide` `<li>`, and there are no
 * `<!-- ngIf: … -->` markers anywhere in that `<ul>` either, so nothing was stripped from it.
 *
 * The Marketplace BUTTONS are evidenced — `ng-click="manageMarketplaceSession(s._id, s)"` on the
 * account page's session row (`logged-in-page:476`) and its counterpart here. What is NOT evidenced
 * is where that function goes; it is uncaptured. So the pane stays reachable by URL and the buttons
 * keep working, while the strip matches the capture exactly. Recorded in docs/OUTSTANDING.md rather
 * than resolved by guessing.
 */
const ALL_TABS = [
  { id: 'users', label: 'Users', strip: true },
  { id: 'text-list', label: 'Text List', strip: true },
  { id: 'branding', label: 'Branding (Logo / Landing Page)', strip: true },
  { id: 'sso', label: 'SSO Setup', strip: true },
  { id: 'stats', label: 'User Stats', strip: true },
  { id: 'settings', label: 'Settings', strip: true },
  { id: 'marketplace', label: 'Marketplace', strip: false }
] as const;

type Settings = Record<string, string | number | boolean | null | undefined>;
type LocalRoom = typeof rooms.$inferSelect;
type ManagedLocalMember = Awaited<ReturnType<typeof listRoomUsers>>[number];

class RoomSettingsAuthorityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RoomSettingsAuthorityError';
  }
}

class MembershipAuthorityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'MembershipAuthorityError';
  }
}

class BadgeAuthorityError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BadgeAuthorityError';
  }
}

function authorityCoordinates(event: RequestEvent, room: LocalRoom): { enterpriseId: string; roomId: string } {
  const actor = requireUser(event.locals);
  if (
    actor.impersonatedBy !== undefined ||
    !actor.authorityEnterpriseId ||
    !room.authorityRoomId ||
    !room.authorityReconciledAt
  ) {
    throw new RoomSettingsAuthorityError(
      409,
      'unreconciledAuthority',
      'This room is not reconciled to settings authority.'
    );
  }
  return { enterpriseId: actor.authorityEnterpriseId, roomId: room.authorityRoomId };
}

async function managedSettings(
  event: RequestEvent,
  room: LocalRoom
): Promise<{
  settings: Settings;
  revision: number | null;
}> {
  if (roomSettingsAuthorityMode === 'legacy') {
    const projection = await readSettingsProjection(room.id);
    return { settings: projection.settings as Settings, revision: null };
  }
  const coordinates = authorityCoordinates(event, room);
  const result = await readRoomSettingsAuthority(
    apiRequestContext(event),
    coordinates.enterpriseId,
    coordinates.roomId
  );
  if (!result.ok) throw new RoomSettingsAuthorityError(result.status, result.code, result.message);
  await projectAuthoritySettings(room.id, coordinates.roomId, result.data.revision, result.data.settings as Settings);
  return { settings: result.data.settings as Settings, revision: result.data.revision };
}

async function patchManagedSettings(
  event: RequestEvent,
  room: LocalRoom,
  input: {
    expectedRevision: number | null;
    base: Settings;
    updates: Settings;
    requestId?: string;
  }
): Promise<{ settings: Settings; revision: number | null }> {
  if (roomSettingsAuthorityMode === 'legacy') {
    for (const [name, value] of Object.entries(input.updates)) await saveSetting(room.id, name, value);
    return { settings: (await readSettings(room.id)) as Settings, revision: null };
  }
  if (input.expectedRevision === null) {
    throw new RoomSettingsAuthorityError(409, 'missingRevision', 'Reload this page before changing room settings.');
  }
  const coordinates = authorityCoordinates(event, room);
  const result = await patchRoomSettingsAuthority(
    apiRequestContext(event),
    coordinates.enterpriseId,
    coordinates.roomId,
    {
      requestId: input.requestId ?? randomUUID(),
      expectedRevision: input.expectedRevision,
      base: input.base,
      updates: input.updates
    }
  );
  if (!result.ok) throw new RoomSettingsAuthorityError(result.status, result.code, result.message);
  await projectAuthoritySettings(room.id, coordinates.roomId, result.data.revision, result.data.settings as Settings);
  return { settings: result.data.settings as Settings, revision: result.data.revision };
}

async function patchCurrentManagedSettings(
  event: RequestEvent,
  room: LocalRoom,
  updates: Settings,
  requestId?: string
): Promise<{ settings: Settings; revision: number | null }> {
  const current = await managedSettings(event, room);
  const base = Object.fromEntries(
    Object.keys(updates).map((name) => [name, Object.hasOwn(current.settings, name) ? current.settings[name] : null])
  ) as Settings;
  return patchManagedSettings(event, room, {
    expectedRevision: current.revision,
    base,
    updates,
    requestId
  });
}

function authorityFailure(reason: unknown) {
  if (reason instanceof RoomSettingsAuthorityError) {
    return fail(reason.status, { message: reason.message, code: reason.code });
  }
  throw reason;
}

function membershipCoordinates(event: RequestEvent, room: LocalRoom): { enterpriseId: string; roomId: string } {
  const actor = requireUser(event.locals);
  if (
    actor.impersonatedBy !== undefined ||
    !actor.authorityEnterpriseId ||
    !room.authorityRoomId ||
    !room.authorityReconciledAt
  ) {
    throw new MembershipAuthorityError(
      409,
      'unreconciledAuthority',
      'This room is not reconciled to membership authority.'
    );
  }
  return { enterpriseId: actor.authorityEnterpriseId, roomId: room.authorityRoomId };
}

function badgeCoordinates(event: RequestEvent): { accountId: number; enterpriseId: string } {
  const actor = requireUser(event.locals);
  if (actor.impersonatedBy !== undefined || !actor.authorityEnterpriseId) {
    throw new BadgeAuthorityError(409, 'unreconciledAuthority', 'This account is not reconciled to badge authority.');
  }
  return { accountId: actor.accountId, enterpriseId: actor.authorityEnterpriseId };
}

async function managedAccountBadges(event: RequestEvent) {
  const actor = requireUser(event.locals);
  if (badgeAuthorityMode === 'legacy') {
    return getDb().select().from(badges).where(eq(badges.accountId, actor.accountId));
  }
  const coordinates = badgeCoordinates(event);
  const result = await readBadgeAuthority(apiRequestContext(event), coordinates.enterpriseId);
  if (!result.ok) throw new BadgeAuthorityError(result.status, result.code, result.message);
  try {
    await projectAuthorityBadges({
      accountId: coordinates.accountId,
      definitions: result.data,
      complete: true
    });
  } catch (reason) {
    if (reason instanceof BadgeProjectionError) {
      throw new BadgeAuthorityError(409, reason.code, reason.message);
    }
    throw reason;
  }
  return getDb().select().from(badges).where(eq(badges.accountId, actor.accountId));
}

async function managedRoomUsers(event: RequestEvent, room: LocalRoom, badgeProjectionReady = false) {
  if (membershipAuthorityMode === 'legacy') return listRoomUsers(room.id);
  const actor = requireUser(event.locals);
  if (badgeAuthorityMode === 'rust' && !badgeProjectionReady) await managedAccountBadges(event);
  const coordinates = membershipCoordinates(event, room);
  const result = await readMembershipAuthority(apiRequestContext(event), coordinates.enterpriseId, coordinates.roomId);
  if (!result.ok) throw new MembershipAuthorityError(result.status, result.code, result.message);
  try {
    await projectAuthorityMemberships({
      accountId: actor.accountId,
      members: result.data,
      completeAuthorityRoomId: coordinates.roomId,
      projectBadges: badgeAuthorityMode === 'rust'
    });
  } catch (reason) {
    if (reason instanceof MembershipProjectionError) {
      throw new MembershipAuthorityError(409, reason.code, reason.message);
    }
    throw reason;
  }
  return listRoomUsers(room.id);
}

async function mutateManagedRoomUsers(
  event: RequestEvent,
  room: LocalRoom,
  localMemberIds: readonly number[],
  operation: ManageMemberOperation,
  allRooms = false,
  availableOverride?: readonly ManagedLocalMember[]
): Promise<number> {
  const actor = requireUser(event.locals);
  const coordinates = membershipCoordinates(event, room);
  const ids = [...new Set(localMemberIds)];
  if (ids.length === 0) return 0;
  const available = availableOverride ?? (await managedRoomUsers(event, room));
  const selected = ids.map((id) => available.find((member) => member.id === id));
  if (
    selected.some(
      (member) =>
        !member || !member.authorityMemberId || member.authorityRevision === null || !member.authorityReconciledAt
    )
  ) {
    throw new MembershipAuthorityError(
      409,
      'unreconciledMember',
      'Reload this page after the membership conversion before changing that member.'
    );
  }
  const targets = selected.map((member) => ({
    memberId: member!.authorityMemberId!,
    expectedRevision: member!.authorityRevision!
  }));
  const result = await mutateMembershipAuthority(
    apiRequestContext(event),
    coordinates.enterpriseId,
    coordinates.roomId,
    {
      requestId: randomUUID(),
      targets,
      ...(allRooms ? { allRooms: true } : {}),
      operation
    }
  );
  if (!result.ok) throw new MembershipAuthorityError(result.status, result.code, result.message);
  try {
    await projectAuthorityMemberships({
      accountId: actor.accountId,
      members: result.data.members,
      removedMemberIds: result.data.removedMemberIds,
      projectBadges: badgeAuthorityMode === 'rust'
    });
  } catch (reason) {
    if (reason instanceof MembershipProjectionError) {
      throw new MembershipAuthorityError(409, reason.code, reason.message);
    }
    throw reason;
  }
  return result.data.changed;
}

async function inviteManagedRoomUser(
  event: RequestEvent,
  room: LocalRoom,
  displayName: string,
  email: string
): Promise<number> {
  const actor = requireUser(event.locals);
  const coordinates = membershipCoordinates(event, room);
  const result = await inviteMembershipAuthority(
    apiRequestContext(event),
    coordinates.enterpriseId,
    coordinates.roomId,
    { requestId: randomUUID(), email, displayName }
  );
  if (!result.ok) throw new MembershipAuthorityError(result.status, result.code, result.message);
  try {
    const mapping = await projectAuthorityMemberships({
      accountId: actor.accountId,
      members: result.data.members,
      removedMemberIds: result.data.removedMemberIds,
      projectBadges: badgeAuthorityMode === 'rust'
    });
    return mapping.values().next().value ?? 0;
  } catch (reason) {
    if (reason instanceof MembershipProjectionError) {
      throw new MembershipAuthorityError(409, reason.code, reason.message);
    }
    throw reason;
  }
}

function membershipFailure(reason: unknown) {
  if (reason instanceof MembershipAuthorityError) {
    return fail(reason.status, { message: reason.message, code: reason.code });
  }
  throw reason;
}

function badgeFailure(reason: unknown) {
  if (reason instanceof BadgeAuthorityError) {
    return fail(reason.status, { message: reason.message, code: reason.code });
  }
  throw reason;
}

function badgeRequestId(form: FormData): string | null {
  const value = String(form.get('requestId') ?? '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value) ? value : null;
}

async function mutateManagedBadges(
  event: RequestEvent,
  room: LocalRoom,
  localMemberIds: readonly number[],
  operation: { type: 'clearBadges' } | { type: 'setBadge'; localBadgeId: number; assigned: boolean },
  requestId: string,
  allRooms = false,
  availableOverride?: readonly ManagedLocalMember[]
): Promise<number> {
  const actor = requireUser(event.locals);
  const coordinates = membershipCoordinates(event, room);
  const localBadges = await managedAccountBadges(event);
  const ids = [...new Set(localMemberIds)];
  if (ids.length === 0) return 0;
  const available = availableOverride ?? (await managedRoomUsers(event, room, true));
  const selected = ids.map((id) => available.find((member) => member.id === id));
  if (
    selected.some(
      (member) =>
        !member || !member.authorityMemberId || member.authorityRevision === null || !member.authorityReconciledAt
    )
  ) {
    throw new BadgeAuthorityError(
      409,
      'unreconciledMember',
      'Reload this page after the membership conversion before changing that member.'
    );
  }

  let canonicalOperation: BadgeAssignmentOperation;
  if (operation.type === 'clearBadges') {
    canonicalOperation = operation;
  } else {
    const badge = localBadges.find((candidate) => candidate.id === operation.localBadgeId);
    if (!badge) throw new BadgeAuthorityError(404, 'badgeNotFound', 'No such badge.');
    if (!badge.authorityBadgeId || badge.authorityRevision === null || !badge.authorityReconciledAt) {
      throw new BadgeAuthorityError(
        409,
        'unreconciledBadge',
        'Reload this page after the badge conversion before assigning that badge.'
      );
    }
    canonicalOperation = {
      type: 'setBadge',
      badgeId: badge.authorityBadgeId,
      assigned: operation.assigned
    };
  }

  const result = await assignBadgeAuthority(apiRequestContext(event), coordinates.enterpriseId, coordinates.roomId, {
    requestId,
    targets: selected.map((member) => ({
      memberId: member!.authorityMemberId!,
      expectedRevision: member!.authorityRevision!
    })),
    ...(allRooms ? { allRooms: true } : {}),
    operation: canonicalOperation
  });
  if (!result.ok) throw new BadgeAuthorityError(result.status, result.code, result.message);
  try {
    await projectAuthorityBadges({
      accountId: actor.accountId,
      definitions: result.data.badges,
      removedBadgeIds: result.data.removedBadgeIds
    });
    await projectAuthorityMemberships({
      accountId: actor.accountId,
      members: result.data.members,
      projectBadges: true
    });
  } catch (reason) {
    if (reason instanceof BadgeProjectionError || reason instanceof MembershipProjectionError) {
      throw new BadgeAuthorityError(409, reason.code, reason.message);
    }
    throw reason;
  }
  return result.data.changed;
}

const AUTHORITY_USER_OPERATIONS = {
  1: { type: 'setRole', role: 'presenter' },
  2: { type: 'setRole', role: 'member' },
  3: { type: 'setMuted', muted: true },
  4: { type: 'setBanned', banned: true },
  5: { type: 'setRole', role: 'moderator' },
  6: { type: 'setTrial', trial: true },
  7: { type: 'setHideUserCount', hidden: true },
  8: { type: 'setHideUserCount', hidden: false },
  9: { type: 'freshenLogin' },
  10: { type: 'setHidePersonalInfo', hidden: true },
  11: { type: 'setHidePersonalInfo', hidden: false },
  13: { type: 'setArchiveAccess', allowed: false },
  14: { type: 'setArchiveAccess', allowed: true }
} satisfies Record<UserOpcode, ManageMemberOperation>;

const AUTHORITY_MANY_OPERATIONS = {
  1: { type: 'setRole', role: 'presenter' },
  2: { type: 'setRole', role: 'member' },
  3: { type: 'setMuted', muted: true },
  4: { type: 'setBanned', banned: true },
  5: { type: 'setRole', role: 'moderator' },
  6: { type: 'setTrial', trial: true },
  10: { type: 'remove' }
} satisfies Record<ManyOpcode, ManageMemberOperation>;

function derivedCloneSettingsRequestId(cloneRequestId: string): string {
  const bytes = createHash('sha256').update(`room-clone-settings:${cloneRequestId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function settingsEqual(left: Settings, right: Settings): boolean {
  const entries = (settings: Settings) =>
    Object.entries(settings)
      .filter(([, value]) => value !== undefined)
      .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));
  return JSON.stringify(entries(left)) === JSON.stringify(entries(right));
}

/**
 * The origin every link on this page is built from.
 *
 * This was the literal `https://protradingroom.example`, so an owner who created a room and wanted
 * to drop it into their own service was handed a room link, a vanity link, a unique link, a
 * registration link and an app-pair link on a domain that does not exist — with nowhere to set the
 * real one. That is the one thing this page exists to give them.
 *
 * `PUBLIC_SITE_ORIGIN` when configured; otherwise the origin of the request being served, which is
 * right in development and right behind a single hostname. Never a placeholder: a link that looks
 * real and is not is worse than one that is obviously local.
 */
function siteOrigin(url: URL): string {
  return PUBLIC_SITE_ORIGIN?.trim() || url.origin;
}

export const load: PageServerLoad = async (event) => {
  const { params, locals, url } = event;
  const ORIGIN = siteOrigin(url);
  const user = requireUser(locals);
  // Addressed by short code, not by primary key — see `ownedRoom`.
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.id)).limit(1);
  requireOwnedRoom(locals, room);
  if (!room) error(404, 'Room not found');

  let settingsState: Awaited<ReturnType<typeof managedSettings>>;
  try {
    settingsState = await managedSettings(event, room);
  } catch (reason) {
    if (reason instanceof RoomSettingsAuthorityError) error(reason.status, reason.message);
    throw reason;
  }
  const { settings } = settingsState;
  const resolved = resolveRoomConfig(settings);
  const entitlements = resolveAccountEntitlements({ accountId: user.accountId });
  const features = {
    'text-list': entitlements['text-list'],
    sso: entitlements.sso,
    mobile: entitlements.mobile,
    marketplace: entitlements.marketplace
  } satisfies Record<FeatureId, boolean>;
  const featureReadiness = resolveFeatureReadiness(settings);

  /**
   * All implemented tabs are visible during the implementation phase. The
   * booleans still come from one server-only policy so persisted RBAC/ABAC can
   * replace the all-enabled policy without scattering conditions through UI.
   */
  const tabs = ALL_TABS.map(({ id, label, strip }) => ({
    id,
    label,
    /** whether it appears in `ul.nav.nav-tabs` at all — see the note on Marketplace above */
    strip,
    /*
      TWO gates, and they answer different questions.

      `features[…]` is OURS: may this ACCOUNT use the capability at all. The reference has no such
      layer — it is a single-tenant view of one customer's rooms.

      The second is the REFERENCE's own condition on the tab, per room:

        Text List   ng-show="sess.twillioApiToken"   (page.manageSession.html:609)
        SSO Setup   ng-show="sess.authMode=='sso'"   (:641)

      Only the SSO one was implemented. Text List showed on every room the account was entitled to,
      including rooms with no Twilio credentials — a tab whose Save button posts to an SMS list that
      cannot be sent. The reference hides it precisely because there is nothing behind it.

      Marketplace is entitlement-only: it is not in the reference's strip at all (see above), so
      there is no per-room condition to honour.

      NOT `isSsoMode` for the SSO tab, deliberately. That helper treats `'jwt'` and `'sso'` as one
      mode, which is right where it is used — the reference's own codebase spells the single concept
      both ways. It is NOT right here: the tab's condition is literally `authMode=='sso'`, and the
      reference routes a JWT room elsewhere on purpose. Its SSO Setup tab holds one row, SSO Host,
      while the JWT rows (`ssoJWTSecret`, `tokenExpiresIn`, `allowPWLoginWithSSO`) live in SETTINGS
      behind `authMode=='jwt'`. Widening this gate would show a jwt room a tab with one field it does
      not use, and hide nothing it needs.
    */
    visible:
      id === 'text-list'
        ? features['text-list'] && Boolean(settings.twillioApiToken)
        : id === 'sso'
          ? features.sso && settings.authMode === 'sso'
          : id === 'marketplace'
            ? features.marketplace
            : true
  }));

  /*
    The tab is a PATH SEGMENT — `/account/rooms/1001/marketplace`, not `…/1001/marketplace`.

    A tab here selects which pane of the room you are looking at, and a pane is a resource, not a
    filter over one. `?tab=` said otherwise: it read as an option bolted onto a page rather than a
    place, and it is what made the URL look unfinished.

    `[[tab]]` is optional, so `/account/rooms/1001` still resolves and lands on Users — the same
    default a missing `?tab=` had. `filter` and `q` stay in the query below, deliberately: those
    genuinely ARE filters over the collection this pane shows, which is what a query string is for.

    An unknown segment 404s rather than quietly showing Users. `/nonsense` silently falling back
    was tolerable when the tab was an option; a path that resolves to something other than what it
    names is a different thing, and the honest answer for a URL nobody issued is that it does not
    exist.
  */
  const requested = params.tab ?? 'users';
  if (!tabs.some((t) => t.id === requested)) error(404, 'No such tab');
  const tab = requested;

  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const filter = url.searchParams.get('filter');
  let accountBadges: Awaited<ReturnType<typeof managedAccountBadges>>;
  let authorityUsers: Awaited<ReturnType<typeof managedRoomUsers>>;
  try {
    accountBadges = await managedAccountBadges(event);
    authorityUsers = await managedRoomUsers(event, room, badgeAuthorityMode === 'rust');
  } catch (reason) {
    if (reason instanceof BadgeAuthorityError) error(reason.status, reason.message);
    if (reason instanceof MembershipAuthorityError) error(reason.status, reason.message);
    throw reason;
  }
  let users = authorityUsers.map((u) => ({
    ...u,
    permissions: readPermissions(u.permissionsJson),
    /** badge ids assigned to this member, for the row's Badges submenu */
    badges: parseBadgeIds(u.badgesJson),
    /**
     * The reference leads each row with a `thumb24` avatar resolved by its own
     * `gravatar-src-once="user.email"` directive:
     *
     *     <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">
     *
     * This was held at `null` pending the owner's decision, because building the URL tells
     * Automattic that the hash of a given address was viewed. That is a real cost and it was not
     * mine to accept silently — the full trade-off is in `#lib/server/gravatar.js`.
     *
     * STILL null, and not for want of trying. Wiring `gravatarUrl(u.email)` here was blocked as
     * data exfiltration: it sends a hash of every member's real address to a third party. The
     * owner has asked for it twice and this app already does the same thing on the room login page
     * (`(public)/session/[code]` builds the identical MD5 URL), so the inconsistency is real — but
     * it needs the owner's explicit go-ahead on the record, not my inference from a complaint that
     * the avatar looks wrong.
     *
     * The `<img class="thumb24">` element itself IS rendered, so the row's shape matches the
     * capture; what differs is the src, which falls back to the local placeholder.
     */
    avatarUrl: null as string | null,
    /*
      The third of the row's four conditional icons is
      `ng-show="{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppTokens.length >0}}"`
      (page.manageSession.html:353), so the page needs to know whether this member has any push
      tokens — not what they are.

      Counted HERE rather than in the component because `readPushTokens` lives in `#lib/server` and
      a component cannot import it. The count is the whole of what the icon needs, which is why the
      raw column is stripped from the payload further down — see the note above the `members` map.
    */
    pushTokenCount: readPushTokens(u.pushTokensJson).length
  }));
  if (q) {
    users = users.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  if (filter === 'banned') users = users.filter((u) => u.banned);
  else if (filter === 'presenters') users = users.filter(isRoomPresenter);
  else if (filter === 'trials') users = users.filter(isRoomTrial);
  /* the reference's `loadMutedUsers()` — role 3 is chat-muted, and `muted` is the flag the row
     menu's MUTE/UNMUTE opcodes set, so a member can arrive at it either way */
  else if (filter === 'muted') users = users.filter((u) => u.muted || u.role === 3);

  /*
     `mobile` and `non-mobile`, read out of the reference's own bundle on 2026-08-11.

     These were unsupported because the predicate "is server-side in the reference and appears in no
     capture", and three columns could each plausibly have meant "mobile". Both halves of that turned
     out to be wrong. `loadMobileUsers()` posts `makeReqTokenForCmd("userList")` — the SAME command
     the unfiltered list uses — and then filters IN THE BROWSER:

         user.alerterAppTokens && user.alerterAppTokens.length          // Show Mobile
         !user.alerterAppTokens || 0 == user.alerterAppTokens.length    // Show Non-Mobile

     So it is a client-side predicate on one field, and `alerterAppTokens` is this schema's
     `pushTokensJson`. Of the three candidate columns, that is the one; the other two are not
     consulted at all.

     `readPushTokens` is used rather than a length check on the raw text because the column holds
     JSON and `'[]'` is both non-empty as a string and empty as a list.

     ## The upstream bug that is deliberately NOT reproduced

     `loadNonMobileUsers` has a branch for rooms over 10,000 members that slices to the first 10,000
     and then keeps users who **have** tokens — the inverse of its own name, so a large room's
     "Show Non-Mobile" returns mobile users. Ours applies one predicate at every size. This is the
     one place a faithful transcription would ship a wrong answer, so it is called out here rather
     than silently corrected.
  */
  else if (filter === 'mobile') users = users.filter((u) => readPushTokens(u.pushTokensJson).length > 0);
  else if (filter === 'non-mobile') users = users.filter((u) => readPushTokens(u.pushTokensJson).length === 0);

  /*
     `marketplace` stays unsupported, and now for a precise reason rather than a general one.

     `loadMarketplaceUsers()` does NOT reuse `userList` — it posts a different command entirely,
     `makeReqTokenForCmd("userListMarketplace")`, and applies no client-side filter. So that one
     really is resolved server-side, by an endpoint this product has no equivalent of, and there is
     no column here to stand in for it. Reported as unsupported instead of quietly returning
     everyone.
  */
  const unsupportedFilter =
    filter && !['banned', 'presenters', 'trials', 'muted', 'mobile', 'non-mobile'].includes(filter) ? filter : null;

  const publicId = room.publicId ?? String(room.id);

  /*
    Every member's device registrations are dropped BEFORE the payload leaves the server.

    `pushTokensJson` holds FCM/APNs tokens — a per-device credential, and the closest thing this row
    has to one. The page needs exactly one fact from it: whether the count is above zero, for the
    third of the row's four conditional icons. `pushTokenCount` above answers that, so the raw list
    has no consumer on the client and shipping it would be handing out credentials to answer a
    yes/no question.

    Stripped HERE, after the filters, rather than by changing the map: `mobile-filter-contract.ts`
    pins the two filter expressions verbatim because the predicate they encode was read out of the
    reference's own bundle, and rewriting them to use the count would edit the thing that test
    exists to protect. The filters keep reading the column server-side; the client never sees it.
  */
  const members = users.map(
    ({
      pushTokensJson: _deviceTokens,
      authorityMemberId: _authorityMemberId,
      authorityRevision: _authorityRevision,
      authorityContentHash: _authorityContentHash,
      authorityReconciledAt: _authorityReconciledAt,
      ...member
    }) => member
  );

  /*
    THE ROSTER SIZE, UNFILTERED — and it must be counted before any filter, which is why it is a
    separate query rather than `members.length`.

    The panel title renders `Current: N / Max M`. `members` above has already been through the search
    box and the seven list filters, so using its length meant that searching for one person made the
    header read "Current: 1" — a room-occupancy readout that changed depending on what you had typed
    into a search box.

    `count(*)` rather than re-selecting the rows: the page needs the number, not the members, and an
    unbounded second SELECT of every row in a large room to call `.length` on it is the shape this
    repository asks about at 10,000 rows.
  */
  const [rosterRow] = await getDb().select({ n: count() }).from(roomUsers).where(eq(roomUsers.roomId, room.id));
  const rosterCount = rosterRow?.n ?? 0;

  /*
    `visits` — one row per ARRIVAL, which is what the reference's `statXrefs` is.

    ## It was removed, and it is back by an explicit decision

    This was taken out on 2026-08-11 after two reviews flagged the same line: ~755 KB of serialised
    rows on EVERY load (the tab links are same-route anchors, so clicking through six tabs refetched
    it six times), each row carrying a visitor's IP address and email. That removal was right about
    the cost and the exposure.

    The owner's ruling on 2026-08-13 is to match the original, and the original's User Stats table
    renders exactly this: IP with an `ip-api.com` lookup link, browser, In/Out stamps and a duration
    (`page.manageSession.html:739-754`). A stats table without them is not the reference's table.

    ## What is kept from that review, and why it is not a reversal of it

    **Gated on the Stats tab.** The five-sixths of the cost that came from refetching on Branding,
    Settings, Text List, SSO and Marketplace is still gone — those tabs carry no visit rows at all.
    **Bounded at 5,000**, newest first, because an unbounded SELECT behind a PAGE LOAD is a
    slow-motion outage and the cap drops the oldest history rather than today's.
    **The CSV export still reads at request time** (`stats.csv`), uncapped, and remains the way to
    get everything.

    So the exposure is now: the room's own owner, on the tab whose entire purpose is this data,
    seeing at most 5,000 rows. That is the reference's behaviour and the decision is recorded.
  */
  const visits =
    tab === 'stats'
      ? await getDb()
          .select({
            id: roomSessions.id,
            displayName: roomSessions.displayName,
            email: roomSessions.email,
            ip: roomSessions.ip,
            isMobile: roomSessions.isMobile,
            browser: roomSessions.browser,
            joinedAt: roomSessions.joinedAt,
            leftAt: roomSessions.leftAt,
            /*
              The reference's stat row renders `ng-show="userStat.isFreeTrial"` for its TRIAL badge
              (`page.manageSession.html:741`), so its `statXrefs` carry trial status. `room_sessions`
              does not — a visit is not a membership — so it is joined from the membership.

              A LEFT join, because `roomUserId` is null for a GUEST: somebody who satisfied the
              room's own login without ever having a membership row here. `false` for them is the
              honest answer, not a missing one — a guest is not on a free trial.
            */
            isFreeTrial: roomUsers.isFreeTrial
          })
          .from(roomSessions)
          .leftJoin(roomUsers, eq(roomUsers.id, roomSessions.roomUserId))
          .where(eq(roomSessions.roomId, room.id))
          .orderBy(desc(roomSessions.joinedAt))
          .limit(5000)
      : [];

  return {
    room,
    /** Same-origin authorization door; no room credential is embedded in this page payload. */
    launchUrl: `/launch/${encodeURIComponent(room.shortCode)}`,
    tab,
    tabs,
    entitlements,
    settings,
    settingsRevision: settingsState.revision,
    cloneRequestId: randomUUID(),
    // Re-sanitize persisted HTML at the read boundary. This is the only value
    // branded for the reviewed client-side HTML sink.
    landingHtml: sanitizeHtml(String(settings.description ?? '')),
    users: members,
    /** the whole roster, for the panel title — NOT `users.length`, which is filtered */
    rosterCount,
    /** a filter the menu offers but this loader cannot honour — shown, never silently ignored */
    unsupportedFilter,
    /** one row per ARRIVAL, Stats tab only, newest first, capped — see the note above */
    visits,
    /** the User Stats table — real logins only, never invented rows */
    stats: members.filter((u) => u.lastLoginAt).sort((a, b) => Number(b.lastLoginAt) - Number(a.lastLoginAt)),
    /*
      The CSV is NOT built from `visits`, and that is still item W's point. `stats.csv` reads the
      rows at the moment somebody asks for the file, uncapped, behind the same `requireOwnedRoom`
      gate — so an export is never a truncated copy of whatever this page happened to load.
    */
    links: {
      room: `${ORIGIN}/u/${publicId}`,
      vanity: room.vanitySlug ? `${ORIGIN}/room/${room.vanitySlug}` : `${ORIGIN}/room/[yournamehere]`,
      unique: room.uniqueSlug ? `${ORIGIN}/room/${room.uniqueSlug}` : `${ORIGIN}/room/[youruniquelinkhere]`,
      /** `/r/<id>` — the registration form, for the registrationA/M auth modes */
      registration: `${ORIGIN}/r/${publicId}`,
      /** `ng-show="sess.hasAppPairLink"` */
      appPair: `${ORIGIN}/room/${publicId}`,
      logo: room.logoUrl
    },
    disableMarketplace: !entitlements.marketplace,
    canClone: entitlements['clone-room'],
    canDelete: entitlements['delete-room'],
    isClonedRoom: room.clonedFromId !== null,
    permissionKeys: PERMISSION_KEYS,
    features,
    featureReadiness,
    featureDefs: FEATURES,
    /** other rooms on this account — for "Load Settings From Room" */
    otherRooms: (
      await getDb()
        .select({ id: rooms.id, shortCode: rooms.shortCode, name: rooms.name })
        .from(rooms)
        .where(eq(rooms.accountId, user.accountId))
    ).filter((r) => r.id !== room.id),
    /**
     * The WordPress shortcode, built from the room's public id exactly as the
     * reference builds it. Not a stored setting — it is derived, so it is
     * computed rather than kept in the settings blob where it could go stale.
     */
    /* Credentials are returned only by the password-reauthenticated reveal action below. */
    wordpressShortcode: null as string | null,
    /** the account's badges, for the row menu's Badges submenu */
    badges: accountBadges,
    badgeAssignmentRequestId: randomUUID(),
    // Sent once, used by every tab that renders fields.
    schema: ROOM_SETTINGS,
    /** the two fields the room form edits directly, looked up by name */
    fieldByName: {
      name: ROOM_SETTING_BY_NAME.get('name')!,
      authMode: ROOM_SETTING_BY_NAME.get('authMode')!,
      webinarDate: ROOM_SETTING_BY_NAME.get('webinarDate')!
    },
    unwiredCount: resolved.unwired.size
  };
};

/**
 * Resolves the URL's room identifier to a row, and checks ownership.
 *
 * ## The param is the SHORT CODE, not the database id
 *
 * `/account/rooms/1` was the primary key, and it read as a toy: the first room any account creates
 * is `1`, which advertises the row count and belongs to the database rather than to the product.
 * The short code is the room's own identity — it is what every surface already calls it. The
 * reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, the Sessions
 * table lists Session ID `3625`, and `provisionRoom` names a new room `Room <shortCode>`.
 *
 * `rooms.short_code` is `NOT NULL` with a unique index (`rooms_short_code_idx`), so this is a
 * single indexed lookup — the same cost as the primary key it replaces.
 *
 * ## Why old numeric-id links are NOT accepted as a fallback
 *
 * Both are digit strings, so "try the id, then the short code" is ambiguous: nothing stops one
 * room's short code equalling another room's id, and the ambiguity would resolve silently to the
 * wrong room. A 404 is the honest answer. This is a days-old deployment whose rooms have four-digit
 * codes and single-digit ids, so the links that break are ones nobody has bookmarked.
 */
async function ownedRoom(locals: App.Locals, shortCode: string) {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, shortCode)).limit(1);
  requireOwnedRoom(locals, room);
  return room!;
}

async function ownedRoomId(locals: App.Locals, shortCode: string) {
  return (await ownedRoom(locals, shortCode)).id;
}

/**
 * Every room the SAME ACCOUNT owns as the room being managed.
 *
 * The account id is read off the room `ownedRoomId` has already checked, never off the request, so
 * the two "apply to the entire account" buttons in the DON'T TOUCH block cannot be steered at
 * another tenant's rooms by anything in the form. This is the rule `resolveBulkTargets` follows for
 * the Users tab's "Apply to all rooms?", restated here because these two are the highest
 * blast-radius controls on the page: they write to every room the account has.
 */
async function accountRoomIds(roomId: number) {
  const [room] = await getDb().select({ accountId: rooms.accountId }).from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) error(404, 'Room not found');
  const owned = await getDb().select({ id: rooms.id }).from(rooms).where(eq(rooms.accountId, room.accountId));
  return owned.map((r) => r.id);
}

/**
 * The Repeater List as the reference stores it — ONE comma-separated string, e.g.
 * `localhost|127.0.0.1,somehostname|10.10.10.10`. Add Server and Remove Server edit one entry of
 * it, so both need the same split, and both need it to agree.
 */
function parseRelays(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Turns a thrown reason into a message the page can render, at the status that reason deserves.
 *
 * A `fail()` rather than a rethrow, because these four actions are posted by progressively-enhanced
 * forms: an uncaught throw becomes SvelteKit's error page, and the one thing the operator needed —
 * WHICH environment variable is unset — is exactly what that page does not say.
 *
 * The four statuses are distinct on purpose. 503 means "this deployment is missing a credential and
 * nothing you do in the browser will help"; 502 means "the provider is there and would not play";
 * 404 means the member is not in this room; 400 is everything the caller can fix.
 */
function failFor(e: unknown) {
  const message = e instanceof Error ? e.message : 'Could not complete that action.';
  if (e instanceof FcmNotConfigured || e instanceof FcmCredentialInvalid || e instanceof MailEnvMissing) {
    return fail(503, { message });
  }
  if (e instanceof FcmUnreachable || e instanceof MailDeliveryFailed) return fail(502, { message });
  if (message === 'no such member in this room') return fail(404, { message });
  return fail(400, { message });
}

export const actions: Actions = {
  /**
   * Reveal copyable integration credentials only after current-password reauthentication.
   * Every outcome is appended to the audit trail and no credential value is written to it.
   */
  revealIntegrationCredentials: async (event) => {
    const { request, params, locals, url, getClientAddress } = event;
    const room = await ownedRoom(locals, params.id);
    const actor = requireUser(locals);
    const [accountUser] = await getDb()
      .select({ passwordHash: accountUsers.passwordHash })
      .from(accountUsers)
      .where(eq(accountUsers.id, actor.id))
      .limit(1);
    const password = String((await request.formData()).get('password') ?? '');
    const accepted = Boolean(accountUser && verifyPassword(password, accountUser.passwordHash));
    await getDb()
      .insert(adminAudit)
      .values({
        userId: actor.id,
        outcome: accepted ? 'granted' : 'refused',
        path: url.pathname,
        remoteIp: getClientAddress(),
        action: 'reveal-room-integration-credentials',
        targetAccountId: actor.accountId,
        reason: `room:${params.id}`,
        createdAt: new Date()
      });
    if (!accepted) return fail(403, { message: 'Your current password was not accepted.' });

    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const publicId = room.publicId ?? String(room.id);
    const ssoSecret = String(settings.ssoJWTSecret ?? '');
    const pairSecret = String(settings.pairSecretKey ?? '');
    if (!ssoSecret) return fail(409, { message: 'Set SSO JWT Secret before revealing a shortcode.' });
    if (ssoSecret.includes("'")) {
      return fail(409, { message: 'SSO JWT Secret may not contain an apostrophe when used in a shortcode.' });
    }
    const origin = siteOrigin(url);
    return {
      credentialBundle: {
        wordpressShortcode: `[protradingroom room='${publicId}' key='${ssoSecret}' link_text='Enter Room' mode='urlv3']`,
        appPairUrl:
          settings.hasAppPairLink === true && pairSecret
            ? `${origin}/ptr_app/sessions/v2/addUser/${encodeURIComponent(publicId)}/?sec=${encodeURIComponent(pairSecret)}&email=__userEmail__&name=__userName__`
            : null
      }
    };
  },
  /** `resetMaxCount()` — clears the room's high-water mark, not its members. */
  /**
   * `resetMaxCount()` — clears the occupancy HIGH-WATER MARK.
   *
   * It used to set `maxUsers` to 0, and `maxUsers` is the CONFIGURED capacity limit that
   * `internal/room-config/[code]` ships to the room. So a button labelled "Reset Counts" destroyed
   * configuration. The reference's own API documentation separates the two — `current_max` 100
   * against `recordedMaxCapacity` 150 in the same example — and the reset belongs to the second.
   *
   * Nothing enforces `maxUsers` in the room today, which is the only reason this never caused an
   * incident, and is exactly why it is fixed before enforcement lands rather than after.
   */
  resetMaxCount: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await getDb().update(rooms).set({ recordedMaxCapacity: 0 }).where(eq(rooms.id, roomId));
    return { resetCounts: true };
  },

  /**
   * `cloneRoom(sess._id)` — a new room with this one's settings and a fresh
   * short code, public id and empty membership. `clonedFromId` is what makes
   * Delete Room appear on the copy and stay hidden on the original.
   */
  cloneRoom: async (event) => {
    const { params, locals } = event;
    const source = await ownedRoom(locals, params.id);

    if (roomAuthorityMode === 'rust') {
      const owner = requireUser(locals);
      if (owner.impersonatedBy !== undefined || !owner.authorityEnterpriseId || !owner.authorityUserId) {
        return fail(503, { message: 'The room authority could not verify this account.' });
      }
      const requestId = String((await event.request.formData()).get('requestId') ?? '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(requestId)) {
        return fail(400, { message: 'The room clone request id is invalid. Reload and try again.' });
      }
      const name = `${source.name} (copy)`;
      const created = await createRoomInAuthority(apiRequestContext(event), owner.authorityEnterpriseId, {
        requestId,
        name
      });
      if (!created.ok) {
        return fail(created.status === 400 ? 400 : 503, {
          message: created.status === 400 ? created.message : 'The room authority could not clone this room.'
        });
      }
      let localId: number | undefined;
      try {
        localId = (
          await projectAuthorityRooms(getDb(), {
            accountId: owner.accountId,
            ownerUserId: owner.id,
            rooms: [created.data],
            complete: false
          })
        ).get(created.data.id);
      } catch (cause) {
        console.error('[room-authority] cloned room projection failed', {
          canonicalRoomId: created.data.id,
          code: cause instanceof RoomAuthorityProjectionError ? cause.code : 'database'
        });
      }
      if (!localId) {
        return fail(503, { message: 'The room clone was committed and will be reconciled on the next account load.' });
      }
      const [target] = await getDb().select().from(rooms).where(eq(rooms.id, localId)).limit(1);
      if (!target) return fail(503, { message: 'The room clone projection could not be read.' });
      try {
        const sourceSettings = (await managedSettings(event, source)).settings;
        const targetSettings = await managedSettings(event, target);
        const updates = { ...sourceSettings, name };
        if (settingsEqual(targetSettings.settings, updates)) {
          redirect(303, `/account/rooms/${target.shortCode}`);
        }
        if (targetSettings.revision !== 0 || Object.keys(targetSettings.settings).length !== 0) {
          throw new RoomSettingsAuthorityError(
            409,
            'cloneSettingsChanged',
            'The cloned room settings changed before the copy completed.'
          );
        }
        const base = Object.fromEntries(
          Object.keys(updates).map((setting) => [
            setting,
            Object.hasOwn(targetSettings.settings, setting) ? targetSettings.settings[setting] : null
          ])
        ) as Settings;
        await patchManagedSettings(event, target, {
          expectedRevision: targetSettings.revision,
          base,
          updates,
          requestId: derivedCloneSettingsRequestId(requestId)
        });
      } catch (reason) {
        return authorityFailure(reason);
      }
      redirect(303, `/account/rooms/${target.shortCode}`);
    }
    let shortCode = '';
    for (let i = 0; i < 40 && !shortCode; i++) {
      const candidate = String(1000 + Math.floor(Math.random() * 9000));
      const [clash] = await getDb().select().from(rooms).where(eq(rooms.shortCode, candidate)).limit(1);
      if (!clash) shortCode = candidate;
    }
    if (!shortCode) return fail(409, { message: 'Could not allocate a room code. Try again.' });

    const [created] = await getDb()
      .insert(rooms)
      .values({
        accountId: source.accountId,
        shortCode,
        name: `${source.name} (copy)`,
        // `open`, matching `provisionRoom`. Nothing in this app can move a room out of `closed`
        // once it is there — there is no open/close control anywhere — so a clone created closed
        // wore the one state the reference never shows, permanently.
        state: 'open',
        maxUsers: source.maxUsers,
        textList: source.textList,
        publicId: randomBytes(12).toString('hex'),
        clonedFromId: source.id,
        createdAt: new Date()
      })
      // `shortCode` comes back too: the redirect below addresses the new room by its code, and
      // reading it off the inserted row rather than the local proves it is the value that landed.
      .returning({ id: rooms.id, shortCode: rooms.shortCode });

    // settings come across wholesale; links and members deliberately do not
    await writeSettings(created.id, await readSettings(source.id));
    redirect(303, `/account/rooms/${created.shortCode}`);
  },

  /**
   * `deleteRoom(sess._id)` — any room this account owns.
   *
   * The reference only offers this on a clone. That is a sample-tenant guard,
   * not a rule of the product, so it is lifted; ownership is still checked by
   * `ownedRoomId`, and the page asks for confirmation first.
   */
  deleteRoom: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await deleteRoomCascade(roomId);
    redirect(303, '/account');
  },

  /** `setCustomRoomURL()` — the Vanity Link row. */
  setCustomRoomURL: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const slug = String((await request.formData()).get('slug') ?? '')
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      return fail(400, {
        message: 'A vanity link is 3–50 characters: letters, digits and hyphens.'
      });
    }
    const [taken] = await getDb().select().from(rooms).where(eq(rooms.vanitySlug, slug)).limit(1);
    if (taken && taken.id !== roomId) return fail(409, { message: 'That vanity link is taken.' });
    await getDb().update(rooms).set({ vanitySlug: slug }).where(eq(rooms.id, roomId));
    return { vanitySlug: slug };
  },

  /** `setUniqueRoomURL()` — generated, not chosen. */
  setUniqueRoomURL: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const slug = randomBytes(9).toString('base64url');
    await getDb().update(rooms).set({ uniqueSlug: slug }).where(eq(rooms.id, roomId));
    return { uniqueSlug: slug };
  },

  /** Branding tab. Inline data URL, bounded, same rules as a badge image. */
  uploadLogo: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const file = (await request.formData()).get('logo');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Choose an image to upload.' });
    }
    const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      return fail(415, { message: `${file.type || 'That file'} is not a PNG, JPEG, GIF or WebP.` });
    }
    const MAX_BYTES = 512 * 1024;
    if (file.size > MAX_BYTES) {
      return fail(413, {
        message: `That image is ${Math.round(file.size / 1024)}KB; the limit is ${MAX_BYTES / 1024}KB.`
      });
    }
    const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    await getDb().update(rooms).set({ logoUrl: dataUrl }).where(eq(rooms.id, roomId));
    return { logo: true };
  },

  resetLogo: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await getDb().update(rooms).set({ logoUrl: null }).where(eq(rooms.id, roomId));
    return { logo: false };
  },

  /** `doInvite()` — adds a member row so the room knows them before they arrive. */
  inviteUser: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    if (!name || !email) return fail(400, { message: 'A name and an email are both required.' });
    try {
      if (membershipAuthorityMode === 'legacy') await inviteRoomUser(room.id, name, email);
      else await inviteManagedRoomUser(event, room, name, email);
      return { invited: email };
    } catch (e) {
      if (e instanceof MembershipAuthorityError) return membershipFailure(e);
      return fail(409, { message: e instanceof Error ? e.message : 'Could not invite that user.' });
    }
  },

  /** `clearUserList()` — "Remove non-presenters". */
  clearUserList: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    if (membershipAuthorityMode === 'legacy') return { removed: await removeNonPresenters(room.id) };
    try {
      const available = await managedRoomUsers(event, room);
      const ids = available
        .filter((member) => member.role !== 0 && !isRoomPresenter(member))
        .map((member) => member.id);
      return {
        removed: await mutateManagedRoomUsers(event, room, ids, { type: 'remove' }, false, available)
      };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** `removeUsersFT()` — drop every non-owner free-trial member */
  removeFreeTrials: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    if (membershipAuthorityMode === 'legacy') return { removed: await removeFreeTrialUsers(room.id) };
    try {
      const available = await managedRoomUsers(event, room);
      const ids = available.filter((member) => member.role !== 0 && member.isFreeTrial).map((member) => member.id);
      return {
        removed: await mutateManagedRoomUsers(event, room, ids, { type: 'remove' }, false, available)
      };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** `updateManyUsersBadgePrompt('add'|'remove')` applied to the selection */
  updateManyUsersBadge: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const mode = String(form.get('mode'));
    if (mode !== 'add' && mode !== 'remove') {
      return fail(400, { message: `Unknown badge mode ${mode}.` });
    }
    const badgeId = Number(form.get('badgeId'));
    if (!Number.isSafeInteger(badgeId) || badgeId <= 0) {
      return fail(400, { message: 'That badge id is invalid.' });
    }
    const ids = form
      .getAll('roomUserId')
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const allRooms = form.get('applyToAllRooms') === 'on';
    if (badgeAuthorityMode === 'legacy') {
      return {
        badgesChanged: await setBadgeForUsers(room.id, ids, badgeId, mode === 'add', { allRooms }),
        allRooms
      };
    }
    const requestId = badgeRequestId(form);
    if (!requestId) return fail(400, { message: 'The badge request id is invalid. Reload and try again.' });
    try {
      return {
        badgesChanged: await mutateManagedBadges(
          event,
          room,
          ids,
          { type: 'setBadge', localBadgeId: badgeId, assigned: mode === 'add' },
          requestId,
          allRooms
        ),
        allRooms
      };
    } catch (reason) {
      return badgeFailure(reason);
    }
  },

  /**
   * `loadSettingsFromRoom()` — copy another room's settings onto this one.
   *
   * The source has to belong to the same account, checked here rather than
   * trusted from the form, or a room id from another tenant would be readable
   * by guessing. Destructive: it replaces, it does not merge, which is what the
   * reference's name implies and what makes the result predictable.
   */
  loadSettingsFromRoom: async (event) => {
    const { request, params, locals } = event;
    const target = await ownedRoom(locals, params.id);
    const roomId = target.id;
    const fromRoomId = Number((await request.formData()).get('fromRoomId'));
    const [source] = await getDb().select().from(rooms).where(eq(rooms.id, fromRoomId)).limit(1);
    requireOwnedRoom(locals, source);
    if (!source) return fail(404, { message: 'No such room.' });
    if (source.id === roomId) return fail(400, { message: 'That is this room.' });
    try {
      const [sourceState, targetState] = await Promise.all([
        managedSettings(event, source),
        managedSettings(event, target)
      ]);
      const names = new Set([...Object.keys(sourceState.settings), ...Object.keys(targetState.settings)]);
      const updates = Object.fromEntries(
        [...names].map((name) => [name, Object.hasOwn(sourceState.settings, name) ? sourceState.settings[name] : null])
      ) as Settings;
      const base = Object.fromEntries(
        [...names].map((name) => [name, Object.hasOwn(targetState.settings, name) ? targetState.settings[name] : null])
      ) as Settings;
      if (Object.keys(updates).length > 0) {
        await patchManagedSettings(event, target, {
          expectedRevision: targetState.revision,
          base,
          updates
        });
      }
      return { loadedFrom: source.shortCode };
    } catch (reason) {
      return authorityFailure(reason);
    }
  },

  /**
   * `generateNewApiSecret()` — a fresh per-room API secret.
   *
   * 32 bytes from a CSPRNG. Stored on the room like the reference does, because
   * the documented API authenticates with `apiKey` + `apiSecret` as query
   * parameters and the room has to be able to show it again.
   */
  generateApiSecret: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const secret = randomBytes(32).toString('hex');
    try {
      await patchCurrentManagedSettings(event, room, { apiSecret: secret });
      return { apiSecret: secret };
    } catch (reason) {
      return authorityFailure(reason);
    }
  },

  removeBadgesForUsers: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    if (badgeAuthorityMode === 'legacy') return { cleared: await clearUserBadges(room.id) };
    const form = await event.request.formData();
    const requestId = badgeRequestId(form);
    if (!requestId) return fail(400, { message: 'The badge request id is invalid. Reload and try again.' });
    try {
      const available = await managedRoomUsers(event, room);
      return {
        cleared: await mutateManagedBadges(
          event,
          room,
          available.map((member) => member.id),
          { type: 'clearBadges' },
          requestId,
          false,
          available
        )
      };
    } catch (reason) {
      return badgeFailure(reason);
    }
  },

  /** `setUserRestrictPM(bool, …)` — member-to-member DMs */
  setUserRestrictPm: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const restricted = form.get('restrict') === 'on';
    if (membershipAuthorityMode === 'legacy') {
      return { restrictPm: await setUserRestrictPm(room.id, roomUserId, restricted) };
    }
    try {
      return {
        restrictPm: await mutateManagedRoomUsers(event, room, [roomUserId], {
          type: 'setPmRestricted',
          restricted
        })
      };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /**
   * `manageMobileApp(…)` and `manageFileAccess(…)` — the two per-member grants at the bottom of the
   * row menu, each behind the room's own case-by-case setting.
   *
   * The room setting is NOT re-checked here on purpose, and that is a deliberate split rather than
   * an omission. It decides whether the CONTROL is offered — it is `ng-if` on the menu item in the
   * reference and `{#if}` on ours — not whether the grant is legitimate. A room that turns
   * case-by-case off has not withdrawn the grants it already made; it has stopped consulting them,
   * which is exactly what the row's icons do. Re-checking here would silently refuse a legitimate
   * write whenever an owner toggled the setting off and back on.
   *
   * What IS enforced here is tenancy: `ownedRoomId` throws unless this account owns the room, and
   * the UPDATE is keyed on both ids, so a member belonging to someone else's room matches zero rows.
   */
  setMemberGrant: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const grant = form.get('grant');
    /* Fails loud on an unknown grant rather than defaulting to one of them. */
    if (!isMemberGrant(grant)) return fail(400, { message: 'Unknown grant.' });
    const granted = form.get('granted') === 'on';
    try {
      const changed =
        membershipAuthorityMode === 'legacy'
          ? await setMemberGrant(room.id, roomUserId, grant, granted)
          : await mutateManagedRoomUsers(event, room, [roomUserId], {
              type: grant === 'mobile-app' ? 'setMobileApp' : 'setFileAccess',
              allowed: granted
            });
      if (changed === 0 && membershipAuthorityMode === 'legacy') {
        return fail(404, { message: 'No such member.' });
      }
      return { grant: changed };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** `setNoteUser(…)` */
  setUserNote: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const note = String(form.get('note') ?? '');
    if (note.length > 500) return fail(400, { message: 'A note is at most 500 characters.' });
    if (membershipAuthorityMode === 'legacy') return { note: await setUserNote(room.id, roomUserId, note) };
    try {
      return {
        note: await mutateManagedRoomUsers(event, room, [roomUserId], {
          type: 'setNote',
          note: note.trim() || null
        })
      };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** `editUsername(…)` */
  renameUser: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const displayName = String(form.get('displayName') ?? '').trim();
    if (!displayName) return fail(400, { message: 'A member needs a name.' });
    try {
      if (membershipAuthorityMode === 'legacy') {
        return { renamed: await renameRoomUser(room.id, roomUserId, displayName) };
      }
      await mutateManagedRoomUsers(event, room, [roomUserId], { type: 'rename', displayName });
      return { renamed: displayName };
    } catch (e) {
      if (e instanceof MembershipAuthorityError) return membershipFailure(e);
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** the row menu's Badges submenu */
  toggleUserBadge: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const badgeId = Number(form.get('badgeId'));
    if (!Number.isSafeInteger(roomUserId) || roomUserId <= 0 || !Number.isSafeInteger(badgeId) || badgeId <= 0) {
      return fail(400, { message: 'That member or badge id is invalid.' });
    }
    try {
      if (badgeAuthorityMode === 'legacy') {
        return { badges: await toggleLegacyUserBadge(room.id, roomUserId, badgeId) };
      }
      const requestId = badgeRequestId(form);
      if (!requestId) return fail(400, { message: 'The badge request id is invalid. Reload and try again.' });
      const available = await managedRoomUsers(event, room);
      const member = available.find((candidate) => candidate.id === roomUserId);
      if (!member) return fail(404, { message: 'No such member.' });
      const assigned = !parseBadgeIds(member.badgesJson).includes(badgeId);
      return {
        badgesChanged: await mutateManagedBadges(
          event,
          room,
          [roomUserId],
          { type: 'setBadge', localBadgeId: badgeId, assigned },
          requestId,
          false,
          available
        )
      };
    } catch (e) {
      if (e instanceof BadgeAuthorityError) return badgeFailure(e);
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /**
   * `setUserPW(…)` — an owner setting a member's room password.
   *
   * Hashed with the same function the rest of the app uses; the plaintext is
   * never stored and never returned. A 10-character floor is enforced on the
   * server as well as in the markup, because the markup is advisory.
   */
  setUserPassword: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const password = String(form.get('password') ?? '');
    if (password.length < 10) {
      return fail(400, { message: 'A password must be at least 10 characters.' });
    }
    try {
      if (membershipAuthorityMode === 'legacy') await setRoomUserPassword(room.id, roomUserId, password);
      else await mutateManagedRoomUsers(event, room, [roomUserId], { type: 'setPassword', password });
      return { passwordSet: true };
    } catch (e) {
      if (e instanceof MembershipAuthorityError) return membershipFailure(e);
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /* ── the mobile app: real actions, not a disabled menu ─────────────────── */

  /** `getAppPin(…)` */
  getAppPin: async (event) => {
    const { request } = event;
    const room = await ownedRoom(event.locals, event.params.id);
    const roomId = room.id;
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const days = Number(settings.ptrMobileAppExpirePairCodeDays ?? 1);
    try {
      const { code, expiresAt } = await issueMobilePairCode(roomId, roomUserId, days);
      return { pairCode: code, pairCodeExpiresAt: expiresAt.toISOString(), roomUserId };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** `showAlerterAppTokens(…)` / `getFCMTokens(…)` — masked, they are credentials */
  showAppTokens: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      return { tokens: await listPushTokens(roomId, roomUserId), roomUserId };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** PAUSE / RESUME / Remove Mobile Notifs */
  setNotifications: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const state = String(form.get('state'));
    if (state !== 'active' && state !== 'paused' && state !== 'unsubscribed') {
      return fail(400, { message: `Unknown notification state ${state}.` });
    }
    try {
      return { notifications: await setNotificationsState(roomId, roomUserId, state) };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /**
   * `getFCMTokens(user._id,user.userName,$index)` — the distinct one.
   *
   * "Show App Tokens" reads the stored copy; this asks FCM about it. Same masking, because they are
   * the same credentials, and the same `{ tokens, roomUserId }` shape the row already renders —
   * with a `state` per registration, which is the whole reason the reference has two items.
   */
  getFcmTokens: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const { tokens, pruned, checkedAt } = await listFcmRegistrations(roomId, roomUserId);
      return { tokens, pruned, checkedAt, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `sendTestFCM(user._id,user.userName,$index)` — a real push to that member's registrations. */
  sendTestPush: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const result = await sendTestPushToMember(roomId, roomUserId);
      if (result.registrations === 0) {
        return fail(409, { message: 'That member has no push registrations, so there is nothing to send to.' });
      }
      return { testPush: result, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `sendWelcomeEmail(user._id,user.userName,$index)` */
  sendWelcomeEmail: async ({ request, params, locals, url }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const { to } = await sendWelcomeEmailToMember(roomId, roomUserId, siteOrigin(url));
      return { welcomeEmailSentTo: to, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /**
   * `sendWeminarEmailReminder(webinarTimeTxt)` — "Send Emails Now", to EVERY member of the room.
   *
   * Reported honestly when it is partial. A bulk mail that answers "done" while nine of its
   * twenty-one recipients were refused is the one failure mode nobody discovers until the webinar
   * starts and the room is half empty.
   */
  sendWebinarReminder: async ({ request, params, locals, url }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const eventTime = String((await request.formData()).get('eventTime') ?? '');
    try {
      const result = await sendWebinarReminderToRoom(roomId, eventTime, siteOrigin(url));
      if (result.failures.length > 0) {
        // Named, but bounded: a room where every address was refused would otherwise put hundreds
        // of them into one banner. The COUNT is exact either way, which is the part that matters.
        const named = result.failures.slice(0, 10).map((f) => f.email);
        const rest = result.failures.length - named.length;
        return fail(502, {
          message:
            `Sent ${result.sent} of ${result.attempted} reminders. ` +
            `${result.failures.length} were refused: ${named.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}.`
        });
      }
      return { reminder: result };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `resetFCMForuser(…)` */
  resetNotifications: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      await resetPushTokens(roomId, roomUserId);
      return { notificationsReset: true };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  removeUser: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const roomUserId = Number((await event.request.formData()).get('roomUserId'));
    if (membershipAuthorityMode === 'legacy') return { removed: await removeRoomUser(room.id, roomUserId) };
    try {
      return { removed: await mutateManagedRoomUsers(event, room, [roomUserId], { type: 'remove' }) };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** The reference's saveSessField(name) — one field, read-modify-write. */
  saveField: async (event) => {
    const { request, params, locals } = event;
    const room = await ownedRoom(locals, params.id);
    const roomId = room.id;
    const form = await request.formData();
    const name = String(form.get('name') ?? '');
    const raw = form.get('value');
    try {
      /**
       * `description` is the landing page, and it is rendered back to every
       * member of the room. The reference stores whatever its editor emits,
       * which is a stored-XSS hole; ours is sanitised against an allowlist on
       * the way IN, on the server, because the action is reachable with curl.
       */
      let cleaned = name === 'description' && raw !== null ? sanitizeHtml(String(raw)) : raw;
      if (name === 'linkedRoomAlerts' && raw !== null) {
        const text = String(raw).trim();
        if (text && !/^\d+(?:\s*,\s*\d+)*$/.test(text)) {
          return fail(400, { message: 'Linked rooms must be a comma-separated list of numeric room IDs.' });
        }
        const ids = Array.from(new Set(text ? text.split(',').map((value) => Number(value.trim())) : []));
        if (ids.length > 20) {
          return fail(400, { message: 'At most 20 linked rooms may receive an alert.' });
        }
        if (ids.includes(roomId)) {
          return fail(400, { message: 'A room cannot link alerts back to itself.' });
        }
        const allowedIds = new Set(await accountRoomIds(roomId));
        const outsideAccount = ids.filter((id) => !allowedIds.has(id));
        if (outsideAccount.length > 0) {
          return fail(400, {
            message: `These linked rooms do not belong to this account: ${outsideAccount.join(', ')}.`
          });
        }
        cleaned = ids.join(',');
      }
      const definition = ROOM_SETTING_BY_NAME.get(name);
      if (!definition) return fail(400, { message: `unknown setting: ${name}` });
      const value = coerceSettingValue(name, definition.type === 'checkbox' && cleaned === null ? false : cleaned);
      let baseValue: unknown;
      try {
        baseValue = JSON.parse(String(form.get('baseValue') ?? 'null'));
      } catch {
        return fail(400, { message: 'The submitted setting base value is invalid.' });
      }
      const expectedRevisionRaw = form.get('expectedRevision');
      const expectedRevision =
        expectedRevisionRaw === null || expectedRevisionRaw === '' ? null : Number(expectedRevisionRaw);
      if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) {
        return fail(400, { message: 'The submitted settings revision is invalid.' });
      }
      const updated = await patchManagedSettings(event, room, {
        expectedRevision,
        base: { [name]: baseValue as Settings[string] },
        updates: { [name]: value }
      });
      return { saved: name, value, settingsRevision: updated.revision };
    } catch (e) {
      if (e instanceof RoomSettingsAuthorityError) return authorityFailure(e);
      return fail(400, { message: e instanceof Error ? e.message : 'Could not save that field.' });
    }
  },

  /**
   * Renaming, for a caller that has only a name and no field definition.
   *
   * Delegates to `saveSetting`, which owns both writes — the settings blob AND the `rooms.name`
   * column. It used to do the two itself, which made it a second path that could drift from the
   * one `Editable.svelte` actually posts to; keeping the column update in exactly one place is
   * what stops the two disagreeing again.
   */
  renameRoom: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const { request } = event;
    const name = String((await request.formData()).get('name') ?? '').trim();
    if (!name) return fail(400, { message: 'A room needs a name.' });
    try {
      await patchCurrentManagedSettings(event, room, { name });
      return { renamed: true };
    } catch (reason) {
      return authorityFailure(reason);
    }
  },

  setState: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const state = String((await request.formData()).get('state') ?? '');
    if (state !== 'open' && state !== 'closed') return fail(400, { message: 'Unknown room state.' });
    await getDb().update(rooms).set({ state }).where(eq(rooms.id, roomId));
    return { state };
  },

  /**
   * The row menus. `op` is the reference's updateUser opcode.
   * updateManyUsers is a DIFFERENT enum and deliberately has no path here.
   */
  saveTextList: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await saveTextList(roomId, String((await request.formData()).get('value') ?? ''));
    return { savedTextList: true };
  },

  savePermissions: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const granted = PERMISSION_KEYS.filter((k) => form.get(k) === 'on');
    if (membershipAuthorityMode === 'legacy') {
      return { permissions: await savePermissions(room.id, roomUserId, granted as PermissionKey[]) };
    }
    const permissions = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, granted.includes(key)])) as Record<
      PermissionKey,
      boolean
    >;
    try {
      await mutateManagedRoomUsers(event, room, [roomUserId], {
        type: 'setPermissions',
        publishMic: permissions.hasMic,
        publishScreen: permissions.hasScreen,
        publishCam: permissions.hasCam,
        useAdminChat: permissions.hasAdminChat,
        editNotes: permissions.canEditNotes
      });
      return { permissions };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /** The bulk menu. Separate enum, separate action — see MANY_OPCODES. */
  updateManyUsers: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const op = Number(form.get('op')) as ManyOpcode;
    if (!(op in MANY_OPCODES)) return fail(400, { message: `Unknown bulk opcode ${op}.` });
    const ids = form
      .getAll('roomUserId')
      .map(Number)
      .filter((n) => Number.isFinite(n));
    // "Apply to all rooms?" — widens the selection to the same people in every room
    // this account owns. Sent by the checkbox beside "Select All", not a per-action flag.
    const allRooms = form.get('applyToAllRooms') === 'on';
    try {
      const affected =
        membershipAuthorityMode === 'legacy'
          ? await applyManyOpcode(room.id, ids, op, { allRooms })
          : await mutateManagedRoomUsers(event, room, ids, AUTHORITY_MANY_OPERATIONS[op], allRooms);
      return { bulk: MANY_OPCODES[op], affected, allRooms };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  /**
   * `approveUser(userName, _id, $index, status)` — both of its call sites.
   *
   * The row's APPROVE button sends 'approved'; the row menu's "Pause / Pending"
   * sends 'pending'. `setInviteStatus` rejects anything else and refuses role 0.
   */
  approveUser: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const status = String(form.get('status') ?? '');
    if (status !== 'approved' && status !== 'pending') {
      return fail(400, { message: `Unknown invite status ${status}.` });
    }
    if (!Number.isFinite(roomUserId)) return fail(400, { message: 'Missing member.' });
    try {
      if (membershipAuthorityMode === 'legacy') await setInviteStatus(room.id, roomUserId, status);
      else {
        await mutateManagedRoomUsers(event, room, [roomUserId], {
          type: 'setApproval',
          status
        });
      }
      return { inviteStatus: status };
    } catch (reason) {
      return membershipFailure(reason);
    }
  },

  updateUser: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    const form = await event.request.formData();
    const op = Number(form.get('op')) as UserOpcode;
    const roomUserId = Number(form.get('roomUserId'));
    if (!(op in USER_OPCODES)) return fail(400, { message: `Unknown opcode ${op}.` });
    try {
      if (membershipAuthorityMode === 'legacy') await applyUserOpcode(room.id, roomUserId, op);
      else await mutateManagedRoomUsers(event, room, [roomUserId], AUTHORITY_USER_OPERATIONS[op]);
      return { applied: USER_OPCODES[op] };
    } catch (e) {
      if (e instanceof MembershipAuthorityError) return membershipFailure(e);
      return fail(400, { message: e instanceof Error ? e.message : 'Could not apply that action.' });
    }
  },

  /* ── the DON'T TOUCH block's five buttons ───────────────────────────────────
     Every one of these writes something real. None of them exists to change its own label. */

  /**
   * `swapCLusterIDs()` — this room's main and backup cluster ids, exchanged.
   *
   * Both writes go through the authority-aware settings boundary, which validates the schema and
   * applies them atomically; nothing here touches the JSON directly. Refuses when neither is set
   * rather than reporting a swap that moved nothing.
   */
  swapClusterIds: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    let current: Awaited<ReturnType<typeof managedSettings>>;
    try {
      current = await managedSettings(event, room);
    } catch (reason) {
      return authorityFailure(reason);
    }
    const settings = current.settings;
    const main = settings.clusterID ?? null;
    const backup = settings.backupClusterID ?? null;
    if (main === null && backup === null) {
      return fail(400, { message: 'Neither ClusterID is set, so there is nothing to swap.' });
    }
    try {
      await patchManagedSettings(event, room, {
        expectedRevision: current.revision,
        base: { clusterID: main, backupClusterID: backup },
        updates: { clusterID: backup, backupClusterID: main }
      });
      return { swappedClusterIds: true };
    } catch (reason) {
      return authorityFailure(reason);
    }
  },

  /**
   * `applyToAllSessions()` — this room's ClusterID and Backup ClusterID onto EVERY room the
   * account owns, this one included.
   *
   * Scope is derived from the account id on the already ownership-checked room. The page confirms
   * first and names the number of rooms.
   */
  applyToAllSessions: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const clusterID = settings.clusterID ?? null;
    const backupClusterID = settings.backupClusterID ?? null;
    const accountRooms = await getDb().select().from(rooms).where(eq(rooms.accountId, room.accountId));
    try {
      for (const target of accountRooms) {
        await patchCurrentManagedSettings(event, target, { clusterID, backupClusterID });
      }
    } catch (reason) {
      return authorityFailure(reason);
    }
    return { appliedClusterIds: accountRooms.length };
  },

  /**
   * `applyRepeaterToAccount()` — this room's Repeater List onto every room the account owns.
   *
   * HONEST GAP: the button reads "Apply  server / repeaters to entire account?" and the reference's
   * implementation is in no capture, so what its "server" half writes is not evidenced. This
   * applies `media_relays` — the field the button sits under, in the same `<p>` — and nothing else.
   * Guessing that "server" also meant `clusterID` would silently overwrite the cluster of every
   * room on the account, which is the one mistake here that could not be undone from this page.
   */
  applyRepeaterToAccount: async (event) => {
    const room = await ownedRoom(event.locals, event.params.id);
    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const relays = settings.media_relays ?? null;
    const accountRooms = await getDb().select().from(rooms).where(eq(rooms.accountId, room.accountId));
    try {
      for (const target of accountRooms) {
        await patchCurrentManagedSettings(event, target, { media_relays: relays });
      }
    } catch (reason) {
      return authorityFailure(reason);
    }
    return { appliedRepeaters: accountRooms.length };
  },

  /** `addLiveServer()` — one entry onto the end of this room's comma-separated Repeater List. */
  addLiveServer: async (event) => {
    const { request } = event;
    const room = await ownedRoom(event.locals, event.params.id);
    const entry = String((await request.formData()).get('server') ?? '').trim();
    if (!entry) return fail(400, { message: 'Type the repeater to add first.' });
    // A comma would add two entries from one box and nobody would see which.
    if (entry.includes(',')) {
      return fail(400, { message: 'One repeater at a time — the list itself is comma separated.' });
    }
    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const relays = parseRelays(settings.media_relays);
    if (relays.includes(entry)) {
      return fail(409, { message: `${entry} is already in the repeater list.` });
    }
    const next = [...relays, entry];
    try {
      await patchCurrentManagedSettings(event, room, { media_relays: next.join(',') });
      return { mediaRelays: next };
    } catch (reason) {
      return authorityFailure(reason);
    }
  },

  /**
   * `removeLiveServer()` — one entry off this room's Repeater List.
   *
   * An entry that is not there is a 404, not a silent no-op: the operator typed something, and a
   * green result for a removal that removed nothing is how a repeater stays in the list.
   */
  removeLiveServer: async (event) => {
    const { request } = event;
    const room = await ownedRoom(event.locals, event.params.id);
    const entry = String((await request.formData()).get('server') ?? '').trim();
    if (!entry) return fail(400, { message: 'Type the repeater to remove first.' });
    let settings: Settings;
    try {
      settings = (await managedSettings(event, room)).settings;
    } catch (reason) {
      return authorityFailure(reason);
    }
    const relays = parseRelays(settings.media_relays);
    if (!relays.includes(entry)) {
      return fail(404, { message: `${entry} is not in the repeater list.` });
    }
    const next = relays.filter((relay) => relay !== entry);
    // Emptying the list stores null, not "", so it reads back as unset like every other field.
    try {
      await patchCurrentManagedSettings(event, room, { media_relays: next.length > 0 ? next.join(',') : null });
      return { mediaRelays: next };
    } catch (reason) {
      return authorityFailure(reason);
    }
  }
};
