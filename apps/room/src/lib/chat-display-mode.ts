/**
 * `displayMode` — whether a log renders each message as a CARD or as a single line.
 *
 * ## The two values, and what picks between them
 *
 * `'r'` is the regular renderer (`app-st-message`) and `'c'` is the compact one
 * (`app-st-compactmessage`). The choice is one expression in the reference's own template:
 *
 * ```js
 * O(2, "r" == e.displayMode ? 2 : 3)     // byte 1,406,223 — regular, else compact
 * ```
 *
 * so `'r'` is the branch that is TESTED FOR and every other value falls through to compact.
 *
 * **That asymmetry is deliberately NOT reproduced here**, and the next section is why: this room has
 * written values under that preference key which upstream never could, so "anything that is not
 * `'r'` means compact" would hand the compact log to accounts that never asked for it.
 *
 * ## THE PREFERENCE KEY COLLIDES WITH A ROOM SETTING, and the two mean different things
 *
 * Upstream stores the chat log's display mode under `preferences.chatMode`, and separately reads
 * `sessData.chatMode` — the ROOM's chat policy, `'g'` group / `'p'` webinar / `'d'` disabled
 * (`#lib/chat-mode.ts`). Two stores, one key, two unrelated meanings.
 *
 * **This room has written the wrong one under that key.** The settings modal's three-way radio
 * called `onPreferenceChange('chatMode', mode)` with `'g'`, `'p'` or `'d'` for as long as it
 * existed, and nothing ever read it back — `chat-mode.remote.ts` records the whole defect. So an
 * account that ever touched that control is carrying `chatMode: 'g'` in its preference blob right
 * now, under the key this feature is about to start reading.
 *
 * Which is why the read VALIDATES instead of reproducing the reference's `else` branch: only `'r'`
 * and `'c'` are accepted and anything else reads as absent. A member carrying the stale `'g'` gets
 * the regular renderer, which is what they see today. Reproducing `"r" == e.displayMode ? … : …`
 * literally would have handed every one of those accounts the compact log without asking.
 *
 * The stale key is deliberately NOT added to `dead-preference-keys.ts`: that list DELETES what it
 * names, and this key is about to be live again under the same name.
 *
 * ## `altChatRender` forces compact, and WRITES it
 *
 * ```js
 * loadChatMode() {
 *   if (globals.sessData.altChatRender) {
 *     this.displayMode = "c";
 *     this.appService.setPreference("chatMode", this.displayMode)
 *   } else {
 *     const e = this.appService.getPreference("chatMode");
 *     e && (this.displayMode = e);
 *     this.appService.setPreference("chatMode", this.displayMode)
 *   }
 * }                                                          // byte 1,434,685, and 2,380,942
 * ```
 *
 * `loadAlertsMode` is the identical function against `alertsMode` (bytes 2,047,129 and 2,335,599),
 * which is why {@link CHAT_DISPLAY_MODE_KEYS} names both and neither is hard-coded at a call site.
 *
 * BOTH BRANCHES WRITE, and that is upstream's own behaviour rather than an accident worth
 * correcting: the else branch persists whatever it read, seeding the key on first load. It is
 * reproduced because the write is what makes the owner's forced mode STICK for a member after the
 * owner turns the setting back off — the member keeps compact until they change it, which is a
 * decision the setting makes and not one this room may quietly undo.
 */

/** `'r'` regular, `'c'` compact. */
export const CHAT_DISPLAY_MODES = ['r', 'c'] as const;

export type ChatDisplayMode = (typeof CHAT_DISPLAY_MODES)[number];

/** The default, and the reference's own: `this.displayMode = "r"` in every constructor that has one. */
export const DEFAULT_CHAT_DISPLAY_MODE: ChatDisplayMode = 'r';

/**
 * The two preference keys, named once.
 *
 * `chat` covers the main and extra chat columns; `alerts` covers the alerts log AND the Q&A thread,
 * because the Q&A modal calls `loadAlertsMode()` — byte 2,335,599 — rather than having a third key.
 * Reproduced exactly: a separate key for the thread would let it drift from the log it belongs to.
 */
export const CHAT_DISPLAY_MODE_KEYS = {
  chat: 'chatMode',
  alerts: 'alertsMode'
} as const;

export type ChatDisplaySurface = keyof typeof CHAT_DISPLAY_MODE_KEYS;

/** Whether a stored value is one this room recognises. See the docblock: `'g'` is not. */
export function isChatDisplayMode(value: unknown): value is ChatDisplayMode {
  return typeof value === 'string' && (CHAT_DISPLAY_MODES as readonly string[]).includes(value);
}

/**
 * The mode a surface renders in, and the value to persist for it.
 *
 * Returns both because the reference writes on both branches and the caller needs to know what to
 * write. Handing back only the mode would leave each call site re-deriving the write, which is three
 * copies of a two-line rule across four surfaces.
 *
 * @param forced `sessData.altChatRender` — the owner's override.
 * @param stored what the preference blob holds under this surface's key, or anything at all.
 */
export function resolveChatDisplayMode(
  forced: boolean,
  stored: unknown
): { mode: ChatDisplayMode; persist: ChatDisplayMode } {
  if (forced) return { mode: 'c', persist: 'c' };
  const mode = isChatDisplayMode(stored) ? stored : DEFAULT_CHAT_DISPLAY_MODE;
  return { mode, persist: mode };
}

/**
 * `hideAvatar` — and `altChatRender` is one of its two terms.
 *
 * ```js
 * (globals.sessData.altChatRender && ("chat" === this.logType || this.isQAMsg)
 *   || globals.sessData.hideAvatars) && (this.hideAvatar = !0)      // byte 1,349,065
 * ```
 *
 * NOTE WHICH SURFACES THE FIRST TERM COVERS: chat, and the Q&A thread — **not the alerts log**. An
 * owner who ticks `altChatRender` gets avatars hidden on chat and inside the Q&A modal while the
 * alerts log keeps them, and that asymmetry is upstream's. It reads like an oversight and is
 * reproduced anyway, because `hideAvatars` is the setting that means "hide them everywhere" and
 * inventing a second one here would be deciding something the owner already has a control for.
 */
export function hideMessageAvatar(input: {
  altChatRender: boolean;
  hideAvatars: boolean;
  kind: 'alert' | 'chat';
  isQaMessage: boolean;
}): boolean {
  return (input.altChatRender && (input.kind === 'chat' || input.isQaMessage)) || input.hideAvatars;
}
