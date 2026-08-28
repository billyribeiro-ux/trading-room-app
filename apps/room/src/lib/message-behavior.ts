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
 *
 * ## THREE ENTRIES DIVERGE INSIDE THE Q&A THREAD, and the divergence is deliberate
 *
 * `isQaMessage` means one thing upstream: this row is being drawn inside the Q&A thread modal. Its
 * own constructor sets `this.isQAMsg = !0, this.logType = "alerts"` (bundle byte 2,334,347) and
 * passes both to every entry (2,332,907). So a Q&A entry is rendered with `kind === 'alert'`, and
 * three menu entries turn ON as a side effect of that: `showToAll` (`isP && !isLimitedPresenter`),
 * `openAlertReport` (`isP && "alerts" === logType`) and `edit` (`enableEditAlerts && "alerts" ===
 * logType && isP` — byte 1,348,838, with no `isQAMsg` term anywhere in it).
 *
 * **All three are dead upstream.** Every one of them addresses `this.msg._id`, and a Q&A entry has
 * no `_id`: that is exactly why the two things the reference CAN do to a thread entry address it
 * some other way — `manageChatReactions(this.isQAMsg ? this.qaMsgID : this.msg._id, …, msgIndex)`
 * (1,354,136) and `deleteQAAlert({qaMsgID, msgIndex})` (1,159,097) both send the PARENT ALERT's id
 * and the entry's ordinal. A control that cannot name the thing it acts on is a control whose only
 * effect is changing its own label, and this repository refuses those by name.
 *
 * So they are suppressed here rather than drawn. The remaining seven all act on a question:
 * `deleteMessage` and `react` through the two commands in `alert-questions.remote.ts`, `muteMessage`
 * / `openUserInfo` / `privateMessage` through the sender, `mention` into the thread's own composer
 * (the reference has a `doQAMention` subscription for exactly that), and `copy` on the text.
 */
export function sourceMessageBehavior(input: SourceMessageBehaviorInput): SourceMessageBehavior {
  return {
    deleteMessage: input.viewerIsPresenter || input.allowDeleteOwnMessage,
    muteMessage: input.viewerIsPresenter && !input.isAdminMessage,
    openUserInfo: true,
    mention: true,
    // `&& !isQaMessage` on this and the two below: see the DIVERGENCE section in the docblock.
    showToAll: input.viewerIsPresenter && !input.viewerIsLimitedPresenter && !input.isQaMessage,
    openAlertReport: input.viewerIsPresenter && input.kind === 'alert' && !input.isQaMessage,
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
      (input.enableEditAlerts &&
        input.kind === 'alert' &&
        input.viewerIsPresenter &&
        !input.isQaMessage),
    copy: input.kind === 'alert',
    privateMessage:
      (input.viewerIsPresenter ||
        input.userPrivateMessaging ||
        (input.userToPresenterPrivateMessaging && input.isAdminMessage)) &&
      !(input.currentUserIsTrial && input.disablePrivateMessagingForTrials)
  };
}

/**
 * The twelve menu entries, resolved — one object instead of twelve `$derived` lines.
 *
 * ## Why it exists
 *
 * `RoomMessage.svelte` computed these twelve as twelve near-identical three-line derivations, each
 * `capturedMenuAllows(capturedMenuItems, MESSAGE_MENU_LABEL.x, behavior.y)`. That was fine while one
 * component rendered a message. `altChatRender` adds a SECOND renderer whose menu is the same twelve
 * entries with the same twelve gates, and copying the block would be twelve entitlement rules
 * written out twice — which is the failure `room-message-chrome.ts` was written to end, in the one
 * place where a drift means a member getting a control they should not have.
 *
 * ## The keys are `MESSAGE_MENU_LABEL`'s, not `SourceMessageBehavior`'s
 *
 * `delete` rather than `deleteMessage`, `reaction` rather than `react`. The label table is what the
 * captured menu is matched against, so keying on it means the mapping between a gate and the label
 * it guards is stated ONCE, here, rather than at each of the twelve call sites.
 */
export interface MessageMenuAllows {
  delete: boolean;
  mute: boolean;
  user: boolean;
  mention: boolean;
  showAll: boolean;
  report: boolean;
  reply: boolean;
  answered: boolean;
  reaction: boolean;
  edit: boolean;
  copy: boolean;
  private: boolean;
}

export function messageMenuAllows(
  behavior: SourceMessageBehavior,
  capturedMenuItems: readonly string[] | undefined
): MessageMenuAllows {
  const allow = (label: MessageMenuLabel, fallback: boolean) =>
    capturedMenuAllows(capturedMenuItems, label, fallback);

  return {
    delete: allow(MESSAGE_MENU_LABEL.delete, behavior.deleteMessage),
    mute: allow(MESSAGE_MENU_LABEL.mute, behavior.muteMessage),
    user: allow(MESSAGE_MENU_LABEL.user, behavior.openUserInfo),
    mention: allow(MESSAGE_MENU_LABEL.mention, behavior.mention),
    showAll: allow(MESSAGE_MENU_LABEL.showAll, behavior.showToAll),
    report: allow(MESSAGE_MENU_LABEL.report, behavior.openAlertReport),
    reply: allow(MESSAGE_MENU_LABEL.reply, behavior.publicReply),
    answered: allow(MESSAGE_MENU_LABEL.answered, behavior.markAnswered),
    reaction: allow(MESSAGE_MENU_LABEL.reaction, behavior.react),
    edit: allow(MESSAGE_MENU_LABEL.edit, behavior.edit),
    copy: allow(MESSAGE_MENU_LABEL.copy, behavior.copy),
    private: allow(MESSAGE_MENU_LABEL.private, behavior.privateMessage)
  };
}

export function capturedMenuAllows(
  capturedMenuItems: readonly string[] | undefined,
  label: MessageMenuLabel,
  sourceFallback: boolean
) {
  return capturedMenuItems ? capturedMenuItems.includes(label) : sourceFallback;
}
