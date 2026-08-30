import { checkAlertDeletePassword } from '../../routes/alert-delete-auth.remote';
import {
  askQuestion,
  deleteQuestion,
  editQuestion,
  reactToQuestion
} from '../../routes/alert-questions.remote';
import { replyMessage } from '../../routes/chat-messages.remote';
import { messageAction } from '../../routes/message-actions.remote';
import type { AlertDeleteCheck } from './message-delete';
import type { MessageOperation } from './message-actions.svelte';

/**
 * Everything the message context menu says to the server, in one object.
 *
 * ## Why the adapter is a module and not seven lines in `create-room.svelte.ts`
 *
 * The same two reasons `user-notes-port.ts` gives, and the second is the load-bearing one:
 *
 * 1. `RoomMessageActions` and `RoomMessageDeletion` then know nothing about the wire, which is what
 *    lets their own tests drive them with stubs and no server — the shape every other collaborator
 *    in `lib/room/` has.
 * 2. **`create-room.svelte.ts` is at its ceiling.** The composition root is capped precisely because
 *    it is the file everything is tempted to grow into, and one more `foo: (payload) => foo(payload)`
 *    line per feature is exactly that growth. `source-size-contract.test.ts`'s instruction is to
 *    extract rather than raise, and a named port is a better thing to extract than an arbitrary
 *    slice.
 *
 * The seventh wire is what prompted this. `checkAlertDeletePassword` is the `deleteAlertPW` door —
 * `TODO.md` row AL — and adding its import and its option to the composition root would have taken
 * that file two lines over a ceiling with one line of headroom. Extracting the six that were already
 * there paid for the seventh and left the root smaller than it started.
 *
 * ## What is NOT here
 *
 * Only the wires. `openModal`, `selectUser`, `patchEvidence`, `openPrivateChat` and the rest stay in
 * `create-room.svelte.ts` because they join two ROOM classes to each other — that is assembly, and
 * assembly is what the composition root is for. This module is the boundary to the server and
 * nothing else, which is also why it is the only place a `.remote` import for this feature appears.
 *
 * Frozen because it holds no state and there is exactly one of it; a caller reaching in to swap
 * `sendOperation` would be replacing the wire under a class that has no idea.
 */
export const messageActionsPort: Readonly<{
  sendOperation: (payload: MessageOperation) => Promise<unknown>;
  askQuestion: (payload: { body: string; alertId: number }) => Promise<void>;
  reactToQuestion: (payload: {
    questionId: number;
    reactionKey: string;
    reactionEmoji: string;
  }) => Promise<void>;
  deleteQuestion: (payload: { questionId: number }) => Promise<void>;
  editQuestion: (payload: { questionId: number; body: string }) => Promise<void>;
  replyMessage: (payload: { body: string; messageId: number }) => Promise<void>;
  checkAlertDeletePassword: AlertDeleteCheck;
}> = Object.freeze({
  sendOperation: (payload) => messageAction(payload),
  askQuestion: (payload) => askQuestion(payload),
  reactToQuestion: (payload) => reactToQuestion(payload),
  deleteQuestion: (payload) => deleteQuestion(payload),
  editQuestion: (payload) => editQuestion(payload),
  replyMessage: (payload) => replyMessage(payload),
  checkAlertDeletePassword: (payload) => checkAlertDeletePassword(payload)
});
