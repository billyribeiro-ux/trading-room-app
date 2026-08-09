export const SELF_PRIVATE_CHAT_MESSAGE = 'Chatting with yourself again???';

export interface RosterPrivateChatContext {
  isPresenter: boolean;
  userPmEnabled?: boolean;
  userToPresenterPmEnabled?: boolean;
  currentUserIsTrial?: boolean;
  disablePmForTrials?: boolean;
}

export interface RosterPrivateChatTarget {
  id: number;
  permissions?: string;
  hasAdminChat?: boolean;
}

/**
 * Decoded from app-room-roster:
 *
 * canPM =
 *   (isPresenter || userPM) &&
 *   !(currentUser.isFT && disablePMForTrials)
 *
 * The roster also exposes PM for a presenter/admin target when
 * userToPresenterPM is enabled.
 */
export function canShowRosterPrivateChat(
  context: RosterPrivateChatContext,
  target: RosterPrivateChatTarget
) {
  const canPm =
    (context.isPresenter || context.userPmEnabled === true) &&
    !(context.currentUserIsTrial === true && context.disablePmForTrials === true);

  const canMessagePresenter =
    (target.permissions === 'a' || target.hasAdminChat === true) &&
    context.userToPresenterPmEnabled === true;

  return canPm || canMessagePresenter;
}

export function resolveRosterPrivateChatStart(currentUserId: number, targetUserId: number) {
  return currentUserId === targetUserId
    ? ({ kind: 'self', message: SELF_PRIVATE_CHAT_MESSAGE } as const)
    : ({ kind: 'open', uid: String(targetUserId), isInit: true } as const);
}
