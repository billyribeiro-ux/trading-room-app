/**
 * The four frames that say *"a message in this room is no longer what you have"*.
 *
 * ## The defect this closes
 *
 * Nine commands mutate a rendered row — five operations in `message-actions.remote.ts` and four in
 * `alert-questions.remote.ts` — and **not one of them told anybody**. A presenter deleted a
 * message and every other viewer kept it on screen. A member reacted and nobody saw the emoji. An
 * edit was invisible until somebody happened to reload. The only refresh was the clicker's own
 * `invalidateAll()`, which is the one browser that already knew.
 *
 * It was silent in the way this repository keeps finding: every command returned 200, wrote its
 * row, and passed its own tests, because every one of those tests asserts on the row.
 *
 * ## The reference's four names, read rather than recalled
 *
 * These are inbound frames — server to client — dispatched in the socket service's switch:
 *
 * ```js
 * case "updateChatMsg":                                              // byte 1,011,021
 *   let a = i.msg, l = i.reactionDetails || null;
 *   l && l.msgUID === globals.user.userXrefID && emit("updateChatMsgReaction", l);
 *   let c = globals.chatLog[a.c];
 *   for (let se of c) if (se._id == a._id) { se = a; emit("updateChatMsg", a); break }
 *   break;
 * case "updateAlertMsg":                                             // byte 1,011,303
 *   let h = i.msg, f = i.updatedQAMsg || null, _ = i.updateAlertFromLog || !1, F = globals.alertsLog, …
 * case "deleteChatMsg":  emit("deleteChatMsg", i);  break;           // byte 1,021,604
 * case "deleteAlertMsg": emit("deleteAlertMsg", i); break;           // byte 1,021,717
 * ```
 *
 * Two things follow from reading them, and both shaped this module.
 *
 * **Q&A rides on `updateAlertMsg`.** `updatedQAMsg`, `deletedQA` and `qaReactionDetails` are all
 * fields of that one frame, not names of their own — so asking, answering, reacting to and deleting
 * a question are all "this alert changed", which is exactly what they are: the thread hangs off the
 * alert and the alert row carries the count.
 *
 * **The two `update` frames carry the whole row and ours carry nothing.** That divergence is
 * deliberate and it is the same one `changeChatMode` and `presenterColorsChanged` record: the row
 * the server wrote is the authority and `invalidateAll()` re-reads it, so a payload would be a
 * second copy the client could disagree with. Here there is a second reason on top, and it is a
 * privacy one — `publishChatToRoom` exists precisely because this hub's SSE stream is per ROOM
 * while chat is per CHANNEL, so a frame carrying a message body would put admin-channel text on
 * every subscriber's wire. A trigger-only frame cannot.
 *
 * ## Why the names live HERE and not in the two files that use them
 *
 * `cmds-frame.ts` states the problem this module is the answer to: the client's frame type and the
 * server's `RoomEvent` union "are two declarations of one contract, in two files, joined by
 * nothing". These four strings are published by two server modules and matched by one client
 * dispatcher — four places — and a typo in any one of them is a message that silently stops
 * propagating. One `as const` list, imported by all four, makes that a compile error.
 *
 * Client-safe on purpose: no `$lib/server` import, so the browser half can read it.
 */

/**
 * The four, in the order the reference's switch declares them.
 *
 * ## THIS LIST IS NOT A MENU
 *
 * Every name here is a frame the reference actually sends. Adding a fifth means finding it in the
 * bundle first — an invented frame name is the `alertDisplayMode` defect wearing a wire format, and
 * `dead-preference-keys.ts` records what that costs.
 */
export const MESSAGE_MUTATION_FRAMES = [
  'updateChatMsg',
  'updateAlertMsg',
  'deleteChatMsg',
  'deleteAlertMsg'
] as const;

export type MessageMutationFrame = (typeof MESSAGE_MUTATION_FRAMES)[number];

const FRAMES = new Set<string>(MESSAGE_MUTATION_FRAMES);

/**
 * Whether an arriving `cmd` is one of the four — the client dispatcher's whole test.
 *
 * A `Set` built once at module scope rather than an `includes` over the array per frame: this runs
 * on every `cmds` frame the room receives, and the room receives one per presenter action.
 */
export function isMessageMutationFrame(cmd: string | undefined): cmd is MessageMutationFrame {
  return cmd !== undefined && FRAMES.has(cmd);
}

/**
 * Which frame a change to one row is announced as.
 *
 * Two axes and four answers, which is why it is a function rather than four literals scattered
 * across the nine call sites: the log a row lives in decides the first half of the name and whether
 * it survived decides the second, and getting either wrong sends a real frame to the wrong list.
 *
 * `'update'` covers a reaction, an edit, a mark-answered and every Q&A change, because upstream
 * covers all of them with the same two frames — see the module note above.
 */
export function messageMutationFrame(
  log: 'chat' | 'alert',
  change: 'update' | 'delete'
): MessageMutationFrame {
  if (log === 'chat') return change === 'delete' ? 'deleteChatMsg' : 'updateChatMsg';
  return change === 'delete' ? 'deleteAlertMsg' : 'updateAlertMsg';
}
