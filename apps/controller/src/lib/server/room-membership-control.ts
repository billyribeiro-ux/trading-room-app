import { randomUUID } from 'node:crypto';
import type { RoomMembershipControlOperation } from './room-membership-control-authority.js';
import { mutateRoomMembershipFromController } from './room-membership-control-authority.js';
import { MembershipProjectionError, projectAuthorityMemberships } from './membership-projection.js';

interface ProjectedMembershipCoordinates {
  authorityMemberId: string | null;
  authorityRevision: number | null;
  authorityReconciledAt: Date | null;
}

export class RoomMembershipControlError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'RoomMembershipControlError';
  }
}

/** Commits a live-room control in Rust first, then repairs the controller projection. */
export async function applyRoomMembershipControl(input: {
  accountId: number;
  authorityEnterpriseId: string | null;
  authorityRoomId: string | null;
  actor: ProjectedMembershipCoordinates;
  target: ProjectedMembershipCoordinates;
  operation: RoomMembershipControlOperation;
}) {
  if (
    !input.authorityEnterpriseId ||
    !input.authorityRoomId ||
    !input.actor.authorityMemberId ||
    input.actor.authorityRevision === null ||
    !input.actor.authorityReconciledAt ||
    !input.target.authorityMemberId ||
    input.target.authorityRevision === null ||
    !input.target.authorityReconciledAt
  ) {
    throw new RoomMembershipControlError(
      409,
      'unreconciledAuthority',
      'Reload after membership conversion before changing this member.'
    );
  }
  const result = await mutateRoomMembershipFromController({
    enterpriseId: input.authorityEnterpriseId,
    roomId: input.authorityRoomId,
    requestId: randomUUID(),
    actorMemberId: input.actor.authorityMemberId,
    target: {
      memberId: input.target.authorityMemberId,
      expectedRevision: input.target.authorityRevision
    },
    operation: input.operation
  });
  if (!result.ok) throw new RoomMembershipControlError(result.status, result.code, result.message);
  try {
    await projectAuthorityMemberships({
      accountId: input.accountId,
      members: result.data.members,
      removedMemberIds: result.data.removedMemberIds
    });
  } catch (reason) {
    if (reason instanceof MembershipProjectionError) {
      throw new RoomMembershipControlError(409, reason.code, reason.message);
    }
    throw reason;
  }
  return result.data;
}
