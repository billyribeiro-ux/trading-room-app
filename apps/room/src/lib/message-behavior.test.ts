import { describe, expect, it } from 'vitest';
import fixture from '$lib/server/captured-message-fixture.json';
import {
  capturedMenuAllows,
  MESSAGE_MENU_LABEL,
  sourceMessageBehavior,
  type SourceMessageBehaviorInput
} from './message-behavior';

const presenterChat: SourceMessageBehaviorInput = {
  kind: 'chat',
  viewerIsPresenter: true,
  viewerIsLimitedPresenter: false,
  isOwnMessage: false,
  isAdminMessage: false,
  allowDeleteOwnMessage: false,
  usersPublicReply: false,
  userPrivateMessaging: false,
  userToPresenterPrivateMessaging: false,
  disablePrivateMessagingForTrials: false,
  currentUserIsTrial: false,
  enableReactions: false,
  enableQaReactions: false,
  isQaMessage: false,
  enableEditMessage: false,
  enableEditAlerts: false
};

describe('decoded app-st-message behavior', () => {
  it('preserves the presenter chat branches and suppresses mute on admin rows', () => {
    expect(sourceMessageBehavior(presenterChat)).toMatchObject({
      deleteMessage: true,
      muteMessage: true,
      openUserInfo: true,
      mention: true,
      showToAll: true,
      openAlertReport: false,
      publicReply: true,
      markAnswered: true,
      copy: false,
      privateMessage: true
    });

    expect(sourceMessageBehavior({ ...presenterChat, isAdminMessage: true }).muteMessage).toBe(
      false
    );
  });

  it('preserves the exact private-message trial gate', () => {
    expect(
      sourceMessageBehavior({
        ...presenterChat,
        currentUserIsTrial: true,
        disablePrivateMessagingForTrials: true
      }).privateMessage
    ).toBe(false);
  });

  it('does not infer missing session flags from the compiled branch definitions', () => {
    const behavior = sourceMessageBehavior(presenterChat);

    expect(behavior.react).toBe(false);
    expect(behavior.edit).toBe(false);
  });

  it('uses every captured menu as the concrete session-state authority', () => {
    for (const message of fixture.messages) {
      const behavior = sourceMessageBehavior({
        ...presenterChat,
        kind: message.panel as 'alert' | 'chat',
        isAdminMessage: message.isAdmin
      });

      for (const label of Object.values(MESSAGE_MENU_LABEL)) {
        const fallback =
          label === MESSAGE_MENU_LABEL.delete
            ? behavior.deleteMessage
            : label === MESSAGE_MENU_LABEL.mute
              ? behavior.muteMessage
              : label === MESSAGE_MENU_LABEL.user
                ? behavior.openUserInfo
                : label === MESSAGE_MENU_LABEL.mention
                  ? behavior.mention
                  : label === MESSAGE_MENU_LABEL.showAll
                    ? behavior.showToAll
                    : label === MESSAGE_MENU_LABEL.report
                      ? behavior.openAlertReport
                      : label === MESSAGE_MENU_LABEL.reply
                        ? behavior.publicReply
                        : label === MESSAGE_MENU_LABEL.answered
                          ? behavior.markAnswered
                          : label === MESSAGE_MENU_LABEL.reaction
                            ? behavior.react
                            : label === MESSAGE_MENU_LABEL.edit
                              ? behavior.edit
                              : label === MESSAGE_MENU_LABEL.copy
                                ? behavior.copy
                                : behavior.privateMessage;

        expect(capturedMenuAllows(message.menuItems, label, fallback)).toBe(
          message.menuItems.includes(label)
        );
      }
    }
  });
});
