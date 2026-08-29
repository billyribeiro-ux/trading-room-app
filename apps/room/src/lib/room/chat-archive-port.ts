import {
  archiveChatLog,
  listChatArchives,
  unarchiveChatLogCommand
} from '../../routes/chat-archive.remote';
import type { ChatArchivePort } from './chat-archive.svelte';

/**
 * The three remote calls the chat archive makes, adapted to positional arguments.
 *
 * Same shape and same reasons as `user-notes-port.ts`: `RoomChatArchive` then knows nothing about
 * the wire, which is what lets its own test drive it with three stubs and no server.
 */
export const chatArchivePort: ChatArchivePort = Object.freeze({
  list: () => listChatArchives(),
  archive: (channel: string, olderThan: number) => archiveChatLog({ channel, olderThan }),
  restore: (archiveId: number) => unarchiveChatLogCommand({ archiveId })
});
