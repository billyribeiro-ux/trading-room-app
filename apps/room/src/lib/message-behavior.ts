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

/**
 * RPT-08 — the refusal a presenter reads when Alert Send Report is pressed on a message with no id.
 *
 * `openAlertSendReport(e){e?…emit("doAlertSendReportModal",e):bootbox.alert("No reports found.")}`
 * at bundle byte 1,349,819 — the audit row cites 1,349,868, which is mid-method; its own verifier
 * had it right. The reference refuses at the ENTRY POINT: the modal is never constructed.
 *
 * It lived in `AlertSendReportModal.svelte` until 2026-08-30, rendered on the `{:else}` of an
 * `{#if targetMessage?.id}` — the refusal one step late, inside a dialog that had already opened.
 * That was recorded as HALF of the row at the time, because the component could not reach the
 * opener. It can now: `RoomMessageActions` holds the dialogs primitive, so the guard sits where
 * upstream's does and the `{:else}` it replaced was DELETED rather than left as a second answer to
 * the same question. A branch nothing can reach is the thing this repository forbids by name.
 *
 * Here rather than beside the guard because this file is where the reference's message-menu strings
 * are transcribed and pinned, and a captured string with one consumer still belongs with its
 * siblings — that is what makes the next one easy to find.
 */
export const NO_REPORTS_FOUND = 'No reports found.';

/**
 * ── RM-08 — THE COMPACT RENDERER'S MENU IS NOT THE CARD'S MENU, in exactly three entries ───────
 *
 * `MESSAGE_MENU_LABEL` above is a LOOKUP: it matches captured DOM entries to gates, and every
 * captured kebab in this repository came from `app-st-message`. This table is the other thing —
 * the text each entry RENDERS — and the two renderers disagree.
 *
 * Every `\xa0\xa0`-prefixed label literal in the bundle was enumerated to establish that (four
 * complete menus: the card at bytes 1,329,046-1,330,950 and 1,336,386-1,338,290, the compact admin
 * at 1,367,382-1,369,287 and the compact member at 1,374,766-1,376,671). Nine of the twelve are
 * identical across all four, trailing spaces included — `Mark Answered ` and `Private Chat ` carry
 * one everywhere, `Edit` and `Copy` carry none anywhere. Three differ, and they differ the same way
 * in both compact menus:
 *
 * | entry | card | compact |
 * | --- | --- | --- |
 * | showAll | `Show message to all` | `Show message to all ` |
 * | report | `Alert Send Report ` | `Show Send Report ` |
 * | reply | `Reply` | `Reply ` |
 *
 * `Alert Send Report` against `Show Send Report` is the one a member can see, and it had been the
 * card's word in both renderers since `app-st-compactmessage` was built.
 *
 * The trailing spaces are transcribed rather than trimmed for the same reason the `\u2807 ` kebab
 * glyph keeps its own: these strings sit next to an `<i>` inside an anchor, the anchor's padding is
 * what positions them, and a "tidied" label is a silent one-space layout change with no way back to
 * the evidence. `message-behavior.test.ts` pins each against the byte offset above.
 */
export const MESSAGE_MENU_TEXT = {
  regular: {
    showAll: 'Show message to all',
    report: 'Alert Send Report ',
    reply: 'Reply'
  },
  compact: {
    showAll: 'Show message to all ',
    report: 'Show Send Report ',
    reply: 'Reply '
  }
} as const;

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
 * ## TWO ENTRIES DIVERGE INSIDE THE Q&A THREAD — and it was THREE, wrongly, until 2026-08-29
 *
 * `isQaMessage` means one thing upstream: this row is being drawn inside the Q&A thread modal. Its
 * own constructor sets `this.isQAMsg = !0, this.logType = "alerts"` (bundle byte 2,334,347) and
 * passes both to every entry (2,332,907). So a Q&A entry is rendered with `kind === 'alert'`, and
 * three menu entries turn ON as a side effect of that: `showToAll` (`isP && !isLimitedPresenter`),
 * `openAlertReport` (`isP && "alerts" === logType`) and `edit` (`enableEditAlerts && "alerts" ===
 * logType && isP` — byte 1,348,838, with no `isQAMsg` term anywhere in it).
 *
 * **TWO of the three are dead upstream.** Both address `this.msg._id`, and a Q&A entry has no
 * `_id`: that is exactly why everything the reference CAN do to a thread entry addresses it some
 * other way, sending the PARENT ALERT's id plus the entry's ORDINAL. A control that cannot name the
 * thing it acts on is a control whose only effect is changing its own label, and this repository
 * refuses those by name. So those two are suppressed here rather than drawn.
 *
 * **`edit` IS NOT ONE OF THEM, and this docblock said it was.** The claim was that all three address
 * `msg._id`. `edit` does not. Byte 1,351,806, read whole:
 *
 * ```js
 * this.isQAMsg ? sendServerCommand("editQAMessage",    {qaMsgID: this.qaMsgID, msgIndex: this.msgIndex, newAlertMsg: o})
 *              : sendServerCommand("editAlertMessage", {alertID: this.msg._id, newAlertMsg: o})
 * ```
 *
 * The Q&A arm is parent-plus-ordinal — the very "some other way" this paragraph names for the
 * controls that DO work. The list of those was written as two (reactions and delete) when it is
 * three, and `edit` was filed with the dead ones on the strength of a sentence rather than a read.
 *
 * The cost was invisible by construction: a suppressed menu item raises nothing, breaks nothing, and
 * leaves no `INERT_ACTIONS` row — the absence looked exactly like a decision. Built 2026-08-29 as
 * `editQuestion` in `routes/alert-questions.remote.ts`, addressed by the question's own id for the
 * reason its two neighbours record.
 *
 * The remaining eight all act on a question: `deleteMessage`, `react` and `edit` through the three
 * commands in `alert-questions.remote.ts`, `muteMessage` / `openUserInfo` / `privateMessage` through
 * the sender, `mention` into the thread's own composer (the reference has a `doQAMention`
 * subscription for exactly that), and `copy` on the text.
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
      // NO `!isQaMessage` here, though there was until 2026-08-29: see the DIVERGENCE section above,
      // which filed `edit` with two controls that genuinely cannot name a thread entry.
      (input.enableEditAlerts && input.kind === 'alert' && input.viewerIsPresenter),
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
