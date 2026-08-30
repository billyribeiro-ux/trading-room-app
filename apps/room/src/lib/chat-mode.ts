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

/**
 * Why the whole path from the radio to the server is typed `ChatMode` rather than `string`.
 *
 * `chat-mode.remote.ts` validates with `z.enum(CHAT_MODES)` — this constant, not a restatement of
 * it. Typing the modal prop, the two request handlers and the page's wrapper the same way means a
 * fourth mode added here cannot be offered by a radio and refused by the server: the compiler
 * reaches every one of them from this one line.
 */
export type ChatMode = (typeof CHAT_MODES)[number];

export function isChatMode(value: string): value is ChatMode {
  return (CHAT_MODES as readonly string[]).includes(value);
}

/**
 * The confirm a presenter is shown before the room's chat mode changes under everybody.
 *
 * ```js
 * let o = '"Group Chat"?';
 * 'p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?');
 * bootbox.confirm('Are you sure you want to change the chat mode to ' + o, s => { … })
 * ```
 *
 * Transcribed whole, quotes and trailing question mark included — the sentence reads
 * `…change the chat mode to "Webinar Mode"?`, so the `?` belongs to the label and not to the
 * sentence, and the prefix carries none of its own.
 *
 * ## Why it is here and not in the modal
 *
 * There were TWO of these and only one was right. The settings-modal radio built the label with the
 * ternary above; the session-modal radio interpolated the raw letter, so it asked "are you sure you
 * want to change the chat mode to p". Same control, same three values, two spellings — which is the
 * duplication that lets one copy be fixed and the other left wrong. Both call this now.
 *
 * It lives beside `CHAT_MODES` because this is copy ABOUT the three modes, and the module that owns
 * what a mode means is the one that should own what it is called.
 */
export function chatModeConfirmPrompt(mode: ChatMode): string {
  return `Are you sure you want to change the chat mode to "${CHAT_MODE_LABELS[mode]}"?`;
}

/**
 * The three modes by their NAMES, which is the only form a person ever reads.
 *
 * Lifted out of {@link chatModeConfirmPrompt} when the Session History pane arrived: `g` in a
 * presenter's history says nothing, and a second ternary spelling the same three names would be a
 * second place for them to drift. The confirm prompt's own quotes and trailing `?` stay with the
 * SENTENCE — they belong to that sentence and not to the label, which is what the history entry
 * proves by needing the label without them.
 *
 * The words are the capture's, from the same three lines the prompt is transcribed from.
 */
export const CHAT_MODE_LABELS: Readonly<Record<ChatMode, string>> = {
  g: 'Group Chat',
  p: 'Webinar Mode',
  d: 'Disabled'
};

/** `this.chatEnabled = 'd' != e` — the ROOM's rule, and the first of three. */
export function chatComposerEnabled(mode: ChatMode): boolean {
  return mode !== 'd';
}

/**
 * Whether this viewer may type at all — the THREE reasons the reference turns the composer off.
 *
 * Upstream they are three assignments to one flag, in this order (bytes 1,437,5xx–1,437,830):
 *
 * ```js
 * this.chatEnabled = "d" != chatMode
 * … isMuted && (this.chatEnabled = !1, …chatMutedTill…)
 * globals.user.isFT && sessData.chatDisabledForTrials && (this.chatEnabled = !1)
 * ```
 *
 * Written as a conjunction here rather than as three assignments, because the ORDER carries no
 * meaning — every one of them can only turn the composer OFF, and none can turn it back on. What
 * would carry meaning is an early return, and there is none.
 *
 * ## The three are three different people, which is why they are one function
 *
 * The MODE is the room's rule and applies to everyone. The MUTE is this viewer's own, enforced on
 * the server long before it was ever shown — which is why a muted member used to press send and
 * watch nothing happen. And the TRIAL rule is the owner's policy about a class of member: a room
 * that has turned trial chat off got a working composer for every trial until 2026-08-28, because
 * `chatDisabledForTrials` was not on `ROOM_VISIBLE_SETTINGS` and nothing here asked.
 *
 * Splitting them across three places is how one of them ends up missing, and it is what happened.
 */
export function chatComposerAvailable(input: {
  mode: ChatMode;
  /** `chatMutedTill` as a date, or null. Not a boolean, because the caller already has the date. */
  mutedUntil: Date | null;
  /** `globals.user.isFT` — is this viewer on a free trial? */
  isFreeTrial: boolean;
  /** `sessData.chatDisabledForTrials` — has the owner turned chat off for trials? */
  chatDisabledForTrials: boolean;
}): boolean {
  if (!chatComposerEnabled(input.mode)) return false;
  if (input.mutedUntil !== null) return false;
  return !(input.isFreeTrial && input.chatDisabledForTrials);
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
    (!message.isAdmin && !isMine) || (message.body.includes('@') && !message.isMention && !isMine);
  return !dropped;
}
