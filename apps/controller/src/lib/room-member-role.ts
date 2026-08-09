export interface RoomMemberRoleState {
  role: number;
  nonPresenter: boolean;
  isFreeTrial: boolean;
}

/** Captured role 1 is a presenter only when the admin discriminator is false. */
export function isRoomPresenter(member: RoomMemberRoleState): boolean {
  return member.role === 1 && !member.nonPresenter;
}

/** Trial is an independent captured flag, never a synthetic numeric role. */
export function isRoomTrial(member: RoomMemberRoleState): boolean {
  return member.isFreeTrial;
}

/** "Remove non-presenters" preserves only the owner and a true presenter. */
export function shouldRemoveAsNonPresenter(member: RoomMemberRoleState): boolean {
  return member.role !== 0 && !isRoomPresenter(member);
}

/** Trial removal follows the independent flag; only the room owner is protected. */
export function shouldRemoveAsFreeTrial(member: RoomMemberRoleState): boolean {
  return member.role !== 0 && isRoomTrial(member);
}
