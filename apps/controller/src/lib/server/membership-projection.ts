import { createHash } from 'node:crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import type { ManagedMember } from './tradingroom-api.generated.js';
import { getDb } from './db/index.js';
import { badges, roomUsers, rooms, users } from './db/schema.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MembershipProjectionError extends Error {
  constructor(readonly code: string) {
    super(`Canonical membership projection refused: ${code}`);
    this.name = 'MembershipProjectionError';
  }
}

function canonicalTimestamp(value: string | null, code: string): string | null {
  if (value === null) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new MembershipProjectionError(code);
  return parsed.toISOString();
}

export function membershipAuthorityContentHash(member: ManagedMember): string {
  // A fixed tuple makes equality independent of object-key insertion order while covering every
  // authoritative response field, including fields whose dedicated projection (badges) lands next.
  const exact = [
    member.id,
    member.roomId,
    member.userId,
    member.email.trim().toLowerCase(),
    member.displayName,
    member.role,
    member.revision,
    member.badges,
    member.canPublishMic,
    member.canPublishScreen,
    member.canPublishCam,
    member.canUseAdminChat,
    member.canEditNotes,
    member.canAccessFiles,
    member.canAccessArchives,
    member.isMuted,
    member.isBanned,
    member.isPmRestricted,
    member.isTrial,
    member.hidePersonalInfo,
    member.hideUserCount,
    member.isPaused,
    member.adminNote,
    member.approvalStatus,
    member.hasMobileApp,
    member.hasPassword,
    canonicalTimestamp(member.lastSeenAt, 'invalid-last-seen-time'),
    canonicalTimestamp(member.invitedAt, 'invalid-invited-time'),
    canonicalTimestamp(member.joinedAt, 'invalid-joined-time'),
    canonicalTimestamp(member.createdAt, 'invalid-created-time')
  ];
  return createHash('sha256').update(JSON.stringify(exact)).digest('hex');
}

function date(value: string | null, code: string): Date | null {
  if (value === null) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new MembershipProjectionError(code);
  return parsed;
}

function legacyRole(member: ManagedMember): { role: number; nonPresenter: boolean } {
  if (member.isBanned) return { role: 4, nonPresenter: member.role === 'moderator' };
  if (member.isMuted) return { role: 3, nonPresenter: member.role === 'moderator' };
  switch (member.role) {
    case 'owner':
      return { role: 0, nonPresenter: false };
    case 'presenter':
      return { role: 1, nonPresenter: false };
    case 'moderator':
      return { role: 1, nonPresenter: true };
    case 'limited_presenter':
    case 'member':
      // The legacy model has no limited-presenter role. Project it without widening privilege;
      // its exact publish capabilities still travel through permissionsJson.
      return { role: 2, nonPresenter: false };
  }
}

function projectedFields(member: ManagedMember, now: Date, badgesJson?: string) {
  const role = legacyRole(member);
  return {
    authorityMemberId: member.id,
    authorityRevision: member.revision,
    authorityContentHash: membershipAuthorityContentHash(member),
    authorityReconciledAt: now,
    role: role.role,
    nonPresenter: role.nonPresenter,
    banned: member.isBanned,
    muted: member.isMuted,
    paused: member.isPaused,
    note: member.adminNote,
    isFreeTrial: member.isTrial,
    hideUserCount: member.hideUserCount,
    hidePersInfo: member.hidePersonalInfo,
    denyArchivesAccess: !member.canAccessArchives,
    restrictPmUser: member.isPmRestricted,
    hasPassword: member.hasPassword,
    hasFileAccess: member.canAccessFiles,
    hasMobileApp: member.hasMobileApp,
    inviteStatus: member.approvalStatus,
    permissionsJson: JSON.stringify({
      hasMic: member.canPublishMic,
      hasScreen: member.canPublishScreen,
      hasCam: member.canPublishCam,
      hasAdminChat: member.canUseAdminChat,
      canEditNotes: member.canEditNotes
    }),
    lastLoginAt: date(member.lastSeenAt, 'invalid-last-seen-time'),
    ...(badgesJson === undefined ? {} : { badgesJson })
  };
}

/**
 * Converges the controller's temporary read model after a canonical membership read or mutation.
 * Canonical core fields win. Badge ids are projected only when `projectBadges` is explicit, so the
 * membership cutover cannot erase still-legacy assignments before the badge converter runs.
 * Revisions are monotonic and equal revisions must carry the same full canonical content hash.
 */
export async function projectAuthorityMemberships(input: {
  accountId: number;
  members: readonly ManagedMember[];
  removedMemberIds?: readonly string[];
  completeAuthorityRoomId?: string;
  now?: Date;
  projectBadges?: boolean;
}): Promise<Map<string, number>> {
  const now = input.now ?? new Date();
  const memberIds = new Set<string>();
  const roomUsersSeen = new Set<string>();
  for (const member of input.members) {
    if (!UUID.test(member.id) || !UUID.test(member.roomId) || !UUID.test(member.userId)) {
      throw new MembershipProjectionError('invalid-canonical-id');
    }
    if (!Number.isSafeInteger(member.revision) || member.revision < 0) {
      throw new MembershipProjectionError('invalid-canonical-revision');
    }
    if (!memberIds.add(member.id)) throw new MembershipProjectionError('duplicate-canonical-member-id');
    if (!roomUsersSeen.add(`${member.roomId}:${member.userId}`)) {
      throw new MembershipProjectionError('duplicate-canonical-room-user');
    }
  }
  const removed = new Set(input.removedMemberIds ?? []);
  for (const id of removed) {
    if (!UUID.test(id)) throw new MembershipProjectionError('invalid-removed-member-id');
    if (memberIds.has(id)) throw new MembershipProjectionError('member-both-present-and-removed');
  }
  if (input.completeAuthorityRoomId && !UUID.test(input.completeAuthorityRoomId)) {
    throw new MembershipProjectionError('invalid-complete-room-id');
  }
  if (
    input.completeAuthorityRoomId &&
    input.members.some((member) => member.roomId !== input.completeAuthorityRoomId)
  ) {
    throw new MembershipProjectionError('complete-list-crosses-room');
  }

  return getDb().transaction(async (tx) => {
    let localBadgeIds: Map<string, number> | undefined;
    if (input.projectBadges) {
      const localBadges = await tx.select().from(badges).where(eq(badges.accountId, input.accountId));
      localBadgeIds = new Map(
        localBadges
          .filter((badge) => badge.authorityBadgeId && badge.authorityReconciledAt)
          .map((badge) => [badge.authorityBadgeId!, badge.id])
      );
    }
    const localRooms = await tx.select().from(rooms).where(eq(rooms.accountId, input.accountId));
    const byAuthorityRoom = new Map(
      localRooms
        .filter((room) => room.authorityRoomId && room.authorityReconciledAt)
        .map((room) => [room.authorityRoomId!, room])
    );
    const completeRoom = input.completeAuthorityRoomId ? byAuthorityRoom.get(input.completeAuthorityRoomId) : undefined;
    if (input.completeAuthorityRoomId && !completeRoom) {
      throw new MembershipProjectionError('complete-room-mapping-mismatch');
    }

    const mapped = new Map<string, number>();
    for (const member of input.members) {
      const localRoom = byAuthorityRoom.get(member.roomId);
      if (!localRoom) throw new MembershipProjectionError('room-mapping-mismatch');
      let badgesJson: string | undefined;
      if (localBadgeIds) {
        const ids: number[] = [];
        const seen = new Set<string>();
        for (const authorityBadgeId of member.badges) {
          if (!UUID.test(authorityBadgeId) || seen.has(authorityBadgeId)) {
            throw new MembershipProjectionError('invalid-canonical-badge-list');
          }
          seen.add(authorityBadgeId);
          const localBadgeId = localBadgeIds.get(authorityBadgeId);
          if (localBadgeId === undefined) throw new MembershipProjectionError('badge-mapping-mismatch');
          ids.push(localBadgeId);
        }
        badgesJson = JSON.stringify(ids);
      }
      const normalizedEmail = member.email.trim().toLowerCase();
      const identityCandidates = await tx
        .select()
        .from(users)
        .where(or(eq(users.authorityUserId, member.userId), sql`lower(${users.email}) = ${normalizedEmail}`));
      if (identityCandidates.length > 1) throw new MembershipProjectionError('identity-collision');
      let identity = identityCandidates[0];
      if (identity) {
        if (identity.accountId !== input.accountId) throw new MembershipProjectionError('identity-account-mismatch');
        if (identity.authorityUserId && identity.authorityUserId !== member.userId) {
          throw new MembershipProjectionError('identity-mapping-mismatch');
        }
        [identity] = await tx
          .update(users)
          .set({
            email: normalizedEmail,
            displayName: member.displayName,
            authorityUserId: member.userId,
            authorityReconciledAt: now
          })
          .where(and(eq(users.id, identity.id), eq(users.accountId, input.accountId)))
          .returning();
      } else {
        const createdAt = date(member.createdAt, 'invalid-created-time')!;
        [identity] = await tx
          .insert(users)
          .values({
            accountId: input.accountId,
            email: normalizedEmail,
            displayName: member.displayName,
            passwordHash: null,
            authorityUserId: member.userId,
            authorityReconciledAt: now,
            createdAt
          })
          .returning();
      }
      if (!identity) throw new MembershipProjectionError('identity-projection-race');

      const existingByAuthority = await tx
        .select()
        .from(roomUsers)
        .where(eq(roomUsers.authorityMemberId, member.id))
        .limit(1);
      const existingByRelation = await tx
        .select()
        .from(roomUsers)
        .where(and(eq(roomUsers.roomId, localRoom.id), eq(roomUsers.userId, identity.id)))
        .limit(1);
      if (existingByAuthority[0] && existingByRelation[0] && existingByAuthority[0].id !== existingByRelation[0].id) {
        throw new MembershipProjectionError('membership-collision');
      }
      const existing = existingByAuthority[0] ?? existingByRelation[0];
      if (existing) {
        if (existing.roomId !== localRoom.id || existing.userId !== identity.id) {
          throw new MembershipProjectionError('membership-mapping-mismatch');
        }
        if (existing.authorityMemberId && existing.authorityMemberId !== member.id) {
          throw new MembershipProjectionError('membership-identity-mismatch');
        }
        if (existing.authorityRevision !== null) {
          if (existing.authorityRevision > member.revision) {
            throw new MembershipProjectionError('stale-canonical-revision');
          }
          if (
            existing.authorityRevision === member.revision &&
            existing.authorityContentHash !== membershipAuthorityContentHash(member)
          ) {
            throw new MembershipProjectionError('canonical-revision-content-mismatch');
          }
        }
        const [updated] = await tx
          .update(roomUsers)
          .set(projectedFields(member, now, badgesJson))
          .where(and(eq(roomUsers.id, existing.id), eq(roomUsers.roomId, localRoom.id)))
          .returning({ id: roomUsers.id });
        if (!updated) throw new MembershipProjectionError('membership-update-race');
        mapped.set(member.id, updated.id);
      } else {
        const createdAt = date(member.createdAt, 'invalid-created-time')!;
        const [inserted] = await tx
          .insert(roomUsers)
          .values({
            roomId: localRoom.id,
            userId: identity.id,
            ...projectedFields(member, now, badgesJson),
            createdAt
          })
          .returning({ id: roomUsers.id });
        if (!inserted) throw new MembershipProjectionError('membership-projection-race');
        mapped.set(member.id, inserted.id);
      }
    }

    for (const authorityMemberId of removed) {
      const [local] = await tx
        .select({ id: roomUsers.id })
        .from(roomUsers)
        .innerJoin(rooms, eq(rooms.id, roomUsers.roomId))
        .where(and(eq(roomUsers.authorityMemberId, authorityMemberId), eq(rooms.accountId, input.accountId)))
        .limit(1);
      if (local) await tx.delete(roomUsers).where(eq(roomUsers.id, local.id));
    }

    if (completeRoom) {
      const localMembers = await tx.select().from(roomUsers).where(eq(roomUsers.roomId, completeRoom.id));
      for (const local of localMembers) {
        if (!local.authorityMemberId || local.authorityRevision === null || !local.authorityContentHash) {
          throw new MembershipProjectionError('unreconciled-legacy-member');
        }
        if (!memberIds.has(local.authorityMemberId)) {
          await tx.delete(roomUsers).where(eq(roomUsers.id, local.id));
        }
      }
    }
    return mapped;
  });
}
