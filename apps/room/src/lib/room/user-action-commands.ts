import type { ChatMuteCommands } from './chat-mute.js';
import type { RoomPermissionKey } from '#lib/permission-keys.js';

/**
 * EVERY COMMAND `RoomUserActions` CAN SEND, as one list.
 *
 * ## Why it is a module of its own
 *
 * It was declared inside `user-actions.svelte.ts`, above the class, and it grew an entry per control
 * as the modal's dead buttons were wired one by one. Sixty lines of wire-command declarations inside
 * a class file is the growth `source-size-contract.test.ts` exists to stop, and this is the
 * extraction it asks for rather than the raise it refuses.
 *
 * It also reads better here on its own terms. This list is the answer to "what can a presenter
 * actually do to one member", and every entry carries the account of why its payload is the shape it
 * is — reference material, consulted while wiring the next control, not something anybody reads while
 * following the dispatcher.
 */
/**
 * EXTENDS `ChatMuteCommands` rather than restating its three, since 2026-08-27.
 *
 * They were declared twice, in two files, and stayed in step only because a type error at the
 * construction site caught each drift after the fact — which is how `muteChatIndefinitely` was
 * added: by failing to compile in three places. One definition, and the class that owns the mute
 * owns its command list.
 */
export interface UserActionCommands extends ChatMuteCommands {
  /**
   * The three mute sub-commands, as the union the server accepts.
   *
   * Typed as `string` first, which pushed the mismatch to the construction site and made it read
   * as the page's problem. The server re-checks the caller either way; this is about the class
   * declaring what it can actually send.
   */
  presenter: (payload: {
    subCmd: 'mutemic' | 'mutecam' | 'mutescreens' | 'restartScreen';
    targetUserId: number;
  }) => Promise<unknown>;
  editUsername: (payload: { userId: number; username: string }) => Promise<unknown>;
  /** A presenter's url to every OTHER browser — the receiver excludes the sender. */
  sessionSendUrl: (payload: {
    cmd: 'sendSalesImageToChat' | 'sendUsersToURL';
    url: string;
  }) => Promise<unknown>;
  /** `forceReload` — reloads ONE member's browser. Presenter-gated on the server. */
  forceReload: (targetUserId: number) => Promise<unknown>;
  /**
   * `getDebugLog` — asks ONE member's browser for its console log. Presenter-gated on the server.
   *
   * No alert accompanies it, unlike `forceReload` above: the capture's sender raises none, and the
   * presenter learns the answer by the modal filling. See `routes/debug-log.remote.ts`.
   */
  requestDebugLog: (targetUserId: number) => Promise<unknown>;
  /** `remoteRestartAudio` — ONE member's browser re-consumes every microphone. Same gating. */
  restartAudio: (targetUserId: number) => Promise<unknown>;
  /**
   * `kickUser` — removes ONE member. Presenter-gated on the server, like `forceReload`.
   *
   * **This said "NO `ban` FIELD, deliberately", and that stopped being true on 2026-08-23** when
   * `internal/room-ban` gave the ban somewhere durable to live. The reason it gave — that taking the
   * flag and dropping it would be the same defect the command was added to fix — is still the right
   * reason, and it is why the field arrived WITH the endpoint rather than before it.
   *
   * `kickAllInstances` is still refused: nothing read shows what it does, and `kick-duplicates` does
   * that job explicitly. See `presenter-commands.remote.ts`.
   */
  kickUser: (payload: { targetUserId: number; message: string; ban?: boolean }) => Promise<unknown>;
  /**
   * `saveCustomPerms` — the five checkboxes, written through to the CONTROLLER.
   *
   * The only command here that changes something durable rather than broadcasting; see
   * `permissions.remote.ts` for why it is a module of one.
   */
  savePermissions: (payload: {
    targetUserId: number;
    granted: RoomPermissionKey[];
  }) => Promise<unknown>;
}
