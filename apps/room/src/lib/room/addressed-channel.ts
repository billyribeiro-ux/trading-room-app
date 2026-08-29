import { RoomPrivateCommands } from './private-commands.js';
import type { RoomChatMute } from './chat-mute.js';
/**
 * The addressed channel, assembled with the callbacks its four commands actually need.
 *
 * ## Why the construction lives HERE and not at the call site
 *
 * It sat inline in `create-room.svelte.ts`, where every one of the four callbacks was a one-line
 * closure over a dialog. That put the description of what each command DOES to the member — the
 * verbatim capture byte for `forceReload`, why a kick shows text rather than swapping the page, why
 * the audio reconnect is narrower than a session restart — in the room's assembly factory rather
 * than beside the class that calls them.
 *
 * The line count is what forced the move (`source-size-contract.test.ts` refuses a raise, and asks
 * for exactly this), but the move is right on its own terms: a reader who wants to know what
 * `forceReload` does now finds the answer in the file that handles it.
 *
 * ## What the caller still supplies, and why it is these four
 *
 * The dialogs and the mute are the PAGE'S — one `RoomDialogs` renders every alert in the room, and
 * `chatMute` is the same instance the presenter's own two buttons hold, which is what stops the
 * presenter's half and the member's half from drifting apart as they once did. `reconnectAudio` is
 * the media transport's. None of the four can be constructed here without this module reaching for
 * the whole room, which is the coupling the split exists to avoid.
 */
export function addressedChannelFor(deps: {
  viewerId: () => number;
  /** ONE instance, shared with the presenter's two buttons — see `RoomChatMute`. */
  chatMute: RoomChatMute;
  /** The room's single dialog host: `alertThen` for the reloads, `alert` for the kick's message. */
  dialogs: { alertThen: (message: string, ondismiss: () => void) => void; alert: string | null };
  /** Audio only — narrower than a session restart on purpose. See `reconnectAudio`. */
  reconnectAudio: () => Promise<void>;
  /**
   * The room's console buffer and the command that answers with it.
   *
   * A FIFTH callback pair, and it arrives with the same justification as the four above: the buffer
   * belongs to `RoomDebugLog` and the send is a remote command the page holds, so neither can be
   * constructed here without this module reaching for the whole room.
   */
  debugLog: {
    collect: () => string;
    send: (log: string) => void;
    received: (from: { fromUserId: number; fromName: string; log: string }) => void;
  };
}): RoomPrivateCommands {
  return new RoomPrivateCommands({
    viewerId: deps.viewerId,
    chatMute: deps.chatMute,
    // Byte 2597102, verbatim. Why `alertThen` and not `confirm` is on `RoomDialogs.alertThen`.
    forceReloadRequested: () =>
      deps.dialogs.alertThen('You need to reload this page to continue', () => location.reload()),
    // The presenter's own message, as text. No page swap — see `kickUser` above.
    kicked: (message: string) => {
      deps.dialogs.alert = message;
    },
    reconnectAudio: deps.reconnectAudio,
    collectDebugLog: deps.debugLog.collect,
    sendDebugLog: deps.debugLog.send,
    debugLogReceived: deps.debugLog.received
  });
}
