export type MessageKind = 'alert' | 'chat';

export const MESSAGE_MENU_LABEL = {
  delete: 'Delete Message',
  mute: 'Mute Chat for 24hrs',
  user: 'User Info',
  mention: 'Mention',
  showAll: 'Show message to all',
  report: 'Alert Send Report',
  reply: 'Reply',
  answered: 'Mark Answered',
  reaction: 'Add Reaction',
  edit: 'Edit',
  copy: 'Copy',
  private: 'Private Chat'
} as const;

export type MessageMenuLabel = (typeof MESSAGE_MENU_LABEL)[keyof typeof MESSAGE_MENU_LABEL];

export interface SourceMessageBehaviorInput {
  kind: MessageKind;
  viewerIsPresenter: boolean;
  viewerIsLimitedPresenter: boolean;
  isOwnMessage: boolean;
  isAdminMessage: boolean;
  allowDeleteOwnMessage: boolean;
  usersPublicReply: boolean;
  userPrivateMessaging: boolean;
  userToPresenterPrivateMessaging: boolean;
  disablePrivateMessagingForTrials: boolean;
  currentUserIsTrial: boolean;
  enableReactions: boolean;
  enableQaReactions: boolean;
  isQaMessage: boolean;
  enableEditMessage: boolean;
  enableEditAlerts: boolean;
}

export interface SourceMessageBehavior {
  deleteMessage: boolean;
  muteMessage: boolean;
  openUserInfo: boolean;
  mention: boolean;
  showToAll: boolean;
  openAlertReport: boolean;
  publicReply: boolean;
  markAnswered: boolean;
  react: boolean;
  edit: boolean;
  copy: boolean;
  privateMessage: boolean;
}

/**
 * Direct transcription of the app-st-message conditions in the decoded bundle.
 * Concrete captured DOM menus are applied separately because the supplied
 * capture does not expose the session values behind every feature flag.
 */
export function sourceMessageBehavior(input: SourceMessageBehaviorInput): SourceMessageBehavior {
  return {
    deleteMessage: input.viewerIsPresenter || input.allowDeleteOwnMessage,
    muteMessage: input.viewerIsPresenter && !input.isAdminMessage,
    openUserInfo: true,
    mention: true,
    showToAll: input.viewerIsPresenter && !input.viewerIsLimitedPresenter,
    openAlertReport: input.viewerIsPresenter && input.kind === 'alert',
    publicReply:
      input.kind === 'chat' &&
      !input.isOwnMessage &&
      (input.viewerIsPresenter || input.usersPublicReply),
    markAnswered: input.viewerIsPresenter && input.kind === 'chat',
    react:
      (input.enableReactions && input.kind === 'chat') ||
      (input.enableQaReactions && input.kind === 'alert' && input.isQaMessage),
    edit:
      (input.enableEditMessage &&
        input.kind === 'chat' &&
        (input.isOwnMessage || (input.viewerIsPresenter && !input.isAdminMessage))) ||
      (input.enableEditAlerts && input.kind === 'alert' && input.viewerIsPresenter),
    copy: input.kind === 'alert',
    privateMessage:
      (input.viewerIsPresenter ||
        input.userPrivateMessaging ||
        (input.userToPresenterPrivateMessaging && input.isAdminMessage)) &&
      !(input.currentUserIsTrial && input.disablePrivateMessagingForTrials)
  };
}

export function capturedMenuAllows(
  capturedMenuItems: readonly string[] | undefined,
  label: MessageMenuLabel,
  sourceFallback: boolean
) {
  return capturedMenuItems ? capturedMenuItems.includes(label) : sourceFallback;
}
