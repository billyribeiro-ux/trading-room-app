/**
 * The room's chat mode, and what each of its three values actually does.
 *
 * ## What was wrong
 *
 * The settings modal has had a three-way radio — Group Chat, Webinar Mode, Disabled — since it was
 * built. It wrote `onPreferenceChange('chatMode', mode)`, and **nothing in this room ever read
 * `chatMode`**. So the control persisted a per-user preference, confirmed itself with a dialog, and
 * changed nothing for anybody.
 *
 * It was also modelled at the wrong LEVEL. Upstream reads `sessData.chatMode` — room state — and
 * the control is `sendServerAdminCommand('changeChatMode', {mode})`, a presenter act that changes
 * the room for everyone. A per-user preference could never have expressed that even if something
 * had read it.
 *
 * ## The three modes
 *
 * ```js
 * let e = this.appService.globals.sessData.chatMode;
 * this.chatEnabled = 'd' != e;
 * this.webinarMode = 'p' == e;
 * ```
 *
 * - `g` — group chat. Everybody sees everything; the default.
 * - `p` — webinar mode. The composer still works; what a member RECEIVES is filtered. See below.
 * - `d` — disabled. The composer is replaced by the captured `Chat Disabled` block.
 */

export const CHAT_MODES = ['g', 'p', 'd'] as const;
export type ChatMode = (typeof CHAT_MODES)[number];

export function isChatMode(value: string): value is ChatMode {
  return (CHAT_MODES as readonly string[]).includes(value);
}

/** `this.chatEnabled = 'd' != e` — whether the composer is offered at all. */
export function chatComposerEnabled(mode: ChatMode): boolean {
  return mode !== 'd';
}

/** `this.webinarMode = 'p' == e`. */
export function isWebinarMode(mode: ChatMode): boolean {
  return mode === 'p';
}

/** The fields the webinar filter reads. Named for what they are, not for the wire's abbreviations. */
export type WebinarFilterMessage = {
  /** `isA` — an admin/presenter message. */
  isAdmin: boolean;
  /** `uid` — the sender. Compared for EQUALITY only, never ordered. */
  senderId: unknown;
  /** `txt` — the body, tested for an `@`. */
  body: string;
  /** `isMention` — whether this message mentions the viewer. */
  isMention: boolean;
};

export type WebinarViewer = {
  id: unknown;
  isPresenter: boolean;
  /** `user.hasAdminChat` — the permission that sees everything even in webinar mode. */
  hasAdminChat: boolean;
};

/**
 * Webinar mode's message filter, transcribed from the reference's own arrival handler:
 *
 * ```js
 * if ("p" == e.globals.sessData.chatMode
 *     && !e.globals.isPresenter
 *     && !e.globals.user.hasAdminChat
 *     && ( (!te.isA && te.uid != e.userID)
 *          || (te.txt.indexOf("@") >= 0 && !te.isMention && te.uid != e.userID) ))
 *   continue;
 * ```
 *
 * The tooltip on the mode radio says only "In webinar mode users only see their own chat messages,
 * while Presenters see everyones messages...", which is looser than what the code does. The code is
 * what is reproduced here, term for term:
 *
 * - a presenter, or anyone with `hasAdminChat`, is not filtered at all;
 * - your own messages always survive — both clauses exclude `uid == me`;
 * - an ADMIN message survives the first clause, so members still see the presenter;
 * - **but any message containing an `@` that is not a mention of you is dropped even when it is an
 *   admin message** — the second clause has no `isA` guard. That asymmetry looks like an oversight
 *   upstream and it is reproduced deliberately, because guessing that it was meant to read
 *   otherwise would be inventing a rule rather than reproducing one.
 *
 * Returns true to KEEP. The reference expresses it as `continue`, i.e. drop; inverting it here
 * means the call site reads as a filter rather than as a double negative.
 */
export function webinarMessageVisible(
  message: WebinarFilterMessage,
  viewer: WebinarViewer
): boolean {
  if (viewer.isPresenter || viewer.hasAdminChat) return true;

  /* `te.uid != e.userID` — equality, and only equality. `id-opacity-contract` forbids ordering or
     arithmetic on an id, and this survives ids becoming uuids unchanged. */
  const isMine = message.senderId === viewer.id;
  const dropped =
    (!message.isAdmin && !isMine) ||
    (message.body.includes('@') && !message.isMention && !isMine);
  return !dropped;
}
