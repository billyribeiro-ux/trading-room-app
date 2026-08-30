import type { ReactionChange } from '#lib/reaction-arrivals.js';
import type { RoomToasts } from './toasts.svelte';

/**
 * Being told that somebody reacted to something of yours — USM-08, USM-09 and USM-10.
 *
 * ```js
 * subscribe("updateChatMsgReaction", i => preferences.reactionsPopup &&
 *   alertsService.info(`${i.n}: ${i.remove?"removed":""} ${i.emoji} on "${i.txt}"`,
 *                      "Message Reaction", {enableHtml:!0}))            // byte 2,509,044
 *
 * preferences.doNotDisturbOn || (c && preferences.qaReactionSoundOn && qaAlert.play()),
 *   preferences.reactionsPopupQA && l && c &&
 *     alertsService.info(`${c.n}: ${c.remove?"removed":""} ${c.emoji} on "${c.txt}"`,
 *                        "QA Reaction", {enableHtml:!0})                // byte 1,410,150
 * ```
 *
 * ## The audience, and where it is decided
 *
 * **Chat:** the message's OWNER and nobody else. Upstream's socket layer emits
 * `updateChatMsgReaction` only when `reactionDetails.msgUID === globals.user.userXrefID` (byte
 * 1,011,021) — a filter in the browser, over a payload carrying a message body. Here the same
 * filter runs over rows the server already decided this viewer may see.
 *
 * **Q&A:** everyone who has asked on that alert, plus every presenter, never the actor — which is
 * `for (let _ of o.qa) _.uid === myId` and the `globals.user.isPresenter && (…the same…)` copy
 * beside it at byte 1,408,850. It is the audience `deliverQaNotice` already uses for a new
 * question, because it is the same audience.
 *
 * ## Do Not Disturb is on the SOUND and not on the popup
 *
 * Upstream's own asymmetry, in the same expression: `doNotDisturbOn || (c && qaReactionSoundOn &&
 * qaAlert.play())`, with the popup on the following line outside that guard. Reproduced intact —
 * reproducing half of an asymmetry is worse than reproducing neither half.
 *
 * ## The name comes from the roster because a reaction stores a hash
 *
 * `clickedBy` holds md5 email hashes and nothing else. `Someone` is the fallback for a reactor who
 * has since left, which is honest: the alternative is rendering a hash at somebody.
 */
export interface ReactionNoticeDeps {
  /** md5 email hash -> display name, from the roster. */
  nameOf: (emailHash: string) => string;
  toasts: RoomToasts;
}

/** `${n}: ${remove ? "removed" : ""} ${emoji} on "${txt}"`, spaces and all. */
export function reactionLine(
  change: ReactionChange,
  text: string,
  nameOf: (emailHash: string) => string
): string {
  return `${nameOf(change.emailHash)}: ${change.removed ? 'removed' : ''} ${change.emoji} on "${text}"`;
}

/** USM-08 — a reaction on one of MY chat messages. */
export function chatReactionNotice(
  changes: readonly ReactionChange[],
  context: {
    messages: readonly { id: number; senderId: number; body: string }[];
    viewerId: number;
    viewerEmailHash: string;
    popupEnabled: boolean;
  },
  deps: ReactionNoticeDeps
): void {
  for (const change of changes) {
    const message = context.messages.find((row) => row.id === change.rowId);
    if (!message || message.senderId !== context.viewerId) continue;
    if (change.emailHash === context.viewerEmailHash) continue;
    if (!context.popupEnabled) continue;
    deps.toasts.show({
      kind: 'info',
      title: 'Message Reaction',
      message: reactionLine(change, message.body, deps.nameOf),
      enableHtml: false
    });
  }
}

/** USM-09 and USM-10 — a reaction on a question, with the sound the popup does not share. */
export function questionReactionNotice(
  changes: readonly ReactionChange[],
  context: {
    questions: readonly { id: number; alertId: number; senderId: number; body: string }[];
    viewerId: number;
    viewerEmailHash: string;
    isPresenter: boolean;
    doNotDisturbOn: boolean;
    soundEnabled: boolean;
    popupEnabled: boolean;
  },
  deps: ReactionNoticeDeps & { playSound: () => void }
): void {
  for (const change of changes) {
    const question = context.questions.find((row) => row.id === change.rowId);
    if (!question) continue;
    if (change.emailHash === context.viewerEmailHash) continue;

    const askedOnThisAlert = context.questions.some(
      (other) => other.alertId === question.alertId && other.senderId === context.viewerId
    );
    if (!context.isPresenter && !askedOnThisAlert) continue;

    /* The SOUND is suppressed by Do Not Disturb and the popup is not — upstream's own split. */
    if (!context.doNotDisturbOn && context.soundEnabled) deps.playSound();
    if (!context.popupEnabled) continue;
    deps.toasts.show({
      kind: 'info',
      title: 'QA Reaction',
      message: reactionLine(change, question.body, deps.nameOf),
      enableHtml: false
    });
  }
}
